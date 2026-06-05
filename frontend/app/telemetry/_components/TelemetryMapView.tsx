"use client";

import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Map as MapGL,
  NavigationControl,
  MapEvent,
} from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { useTelemetry, useLocateFlight } from "@/common/hooks/useTelemetry";
import { useAirports } from "@/common/hooks/useAirports";
import { useAirportRoutes } from "@/common/hooks/useAirportRoutes";
import { useRouteAnimation } from "@/common/hooks/useRouteAnimation";
import { useFlightPath, useFlightDetailsById } from "@/common/hooks/useFlights";
import { useMyFlights } from "@/common/hooks/useTracking";
import { useAuth } from "@/common/hooks/useAuth";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapOverlay } from "@/common/components/Map/TelemetryOverlay";
import { FlightSearch } from "@/common/components/Map/FlightSearch";
import { useFlightFilters } from "@/common/hooks/useFlightFilters";
import { FlightFilterPanel } from "./FlightFilterPanel";
import { MapLayers } from "./MapLayers";
import { PanelContainer } from "./PanelContainer";
import { AltitudeLegend } from "./AltitudeLegend";
import {
  MAP_STYLE_URL,
  mapAirportsToGeoJson,
  mapFlightsToGeoJson,
  mapRoutesToGeoJson,
  applyPolishLabels,
  loadTelemetryMapImages,
  calculateQuantizedBBox,
  bboxToGeoJson,
  EMPTY_GEOJSON,
} from "@/app/telemetry/_utils/telemetryMapHelpers";
import type { Airport, AirlineWithDestinations } from "@/common/api/airports";
import type {
  AirportFeatureProperties,
  FlightFeatureProperties,
} from "@/app/telemetry/_utils/telemetryMapHelpers";

export default function TelemetryMapView() {
  const mapRef = useRef<MapRef>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Capture once on mount; subsequent router.replace must not re-trigger the deeplink.
  const [initialFlightId] = useState<string | null>(() =>
    searchParams.get("flightId"),
  );
  const [deeplinkConsumed, setDeeplinkConsumed] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const {
    flights,
    error,
    loading,
    setBounds: setFlightBounds,
  } = useTelemetry(10000);
  const { airports, setBounds: setAirportBounds } = useAirports();

  const [selectedFlight, setSelectedFlight] =
    useState<GeoJSON.Feature<GeoJSON.Point> | null>(null);
  const [selectedAirportData, setSelectedAirportData] =
    useState<Airport | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Flight path and location logic
  const selectedIcao24 = useMemo(
    () =>
      (selectedFlight?.properties as FlightFeatureProperties)?.icao24 || null,
    [selectedFlight],
  );

  const locateParams = useMemo(
    () => (selectedIcao24 ? { icao24: selectedIcao24 } : null),
    [selectedIcao24],
  );

  const { data: detailedTelemetry } = useLocateFlight(locateParams);
  const { pathData } = useFlightPath(
    detailedTelemetry?.internalFlightId || null,
  );

  // --- Deeplink: open `/telemetry?flightId=UUID` selects the flight on mount ---
  const { data: deeplinkFlight } = useFlightDetailsById(
    deeplinkConsumed ? null : initialFlightId,
  );
  const deeplinkLocateParams = useMemo(
    () =>
      !deeplinkConsumed && deeplinkFlight?.faFlightId
        ? { faFlightId: deeplinkFlight.faFlightId }
        : null,
    [deeplinkConsumed, deeplinkFlight],
  );
  const { data: deeplinkLocate } = useLocateFlight(deeplinkLocateParams);

  const traveledPathGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () =>
      pathData?.traveled
        ? {
            type: "FeatureCollection",
            features: [
              { type: "Feature", geometry: pathData.traveled, properties: {} },
            ],
          }
        : EMPTY_GEOJSON,
    [pathData],
  );

  const remainingPathGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () =>
      pathData?.remaining
        ? {
            type: "FeatureCollection",
            features: [
              { type: "Feature", geometry: pathData.remaining, properties: {} },
            ],
          }
        : EMPTY_GEOJSON,
    [pathData],
  );

  const {
    selectedAirlineIcaos,
    routesGeoJson,
    toggleAirline: handleAirlineToggle,
    toggleAll: handleToggleAll,
  } = useAirportRoutes(selectedAirportData);

  const [cityAirports, setCityAirports] = useState<Airport[]>([]);
  const [highlightedIcao, setHighlightedIcao] = useState<string | null>(null);
  const [activeBBoxGeoJson, setActiveBBoxGeoJson] =
    useState<GeoJSON.FeatureCollection>(EMPTY_GEOJSON);
  const [cursor, setCursor] = useState<string>("");

  const { user } = useAuth();
  const { flights: myTrackedFlights } = useMyFlights(user ? 30_000 : 600_000);
  const trackedCallsigns = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(
      myTrackedFlights
        .map((f) => f.callsign?.trim())
        .filter((c): c is string => !!c && c.length > 0),
    );
  }, [user, myTrackedFlights]);

  const {
    filters,
    setFlightNumber,
    toggleAirline,
    toggleCountry,
    toggleCategory,
    clear: clearFilters,
    options: filterOptions,
    filtered: filteredFlights,
    activeCount: activeFilterCount,
  } = useFlightFilters(flights);

  const geoJsonData = useMemo(
    () => mapFlightsToGeoJson(filteredFlights, trackedCallsigns),
    [filteredFlights, trackedCallsigns],
  );

  const airportsGeoJson = useMemo<GeoJSON.FeatureCollection>(() => {
    const base = mapAirportsToGeoJson(airports);
    if (!highlightedIcao) return base;
    return {
      ...base,
      features: base.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          highlighted: f.properties?.icaoCode === highlightedIcao,
        },
      })),
    };
  }, [airports, highlightedIcao]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useRouteAnimation(mapRef, routesGeoJson);

  const updateBoundingBox = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const b = map.getBounds();

      const bbox = calculateQuantizedBBox(b);
      setFlightBounds(bbox);
      setAirportBounds(bbox);
      setActiveBBoxGeoJson(bboxToGeoJson(bbox));
    }, 500);
  }, [setFlightBounds, setAirportBounds]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (deeplinkConsumed || !deeplinkLocate || !deeplinkFlight || !mapLoaded)
      return;
    const [lon, lat] = deeplinkLocate.location.coordinates as [number, number];
    const feature: GeoJSON.Feature<GeoJSON.Point> = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        icao24: deeplinkLocate.icao24,
        callsign: deeplinkFlight.callsign,
        altitude: null,
        velocity: null,
        heading: null,
        onGround: false,
      },
    };
    setSelectedFlight(feature);
    setSelectedAirportData(null);
    setHighlightedIcao(null);
    mapRef.current?.flyTo({
      center: [lon, lat],
      zoom: 7,
      duration: 1200,
    });
    setDeeplinkConsumed(true);
    router.replace("/telemetry");
  }, [deeplinkConsumed, deeplinkLocate, deeplinkFlight, router, mapLoaded]);

  const handleMapLoad = useCallback(
    (e: MapEvent) => {
      const map = e.target;
      setMapLoaded(true);
      applyPolishLabels(map);
      updateBoundingBox();
      loadTelemetryMapImages(map).catch((err) => {
        console.error("Error loading map images:", err);
      });
    },
    [updateBoundingBox],
  );

  const openAirportPanel = useCallback((airport: Airport) => {
    setSelectedAirportData(airport);
    setSelectedFlight(null);
    setHighlightedIcao(airport.icaoCode);
    mapRef.current?.flyTo({
      center: [airport.longitude, airport.latitude],
      zoom: Math.max(mapRef.current.getMap().getZoom(), 9),
      duration: 800,
    });
  }, []);

  const handleSearchSelect = useCallback(
    (airport: Airport, results: Airport[]) => {
      if (results.length > 1) {
        setCityAirports(results);
      }
      openAirportPanel(airport);
    },
    [openAirportPanel],
  );

  const handleFlightSearchSelect = useCallback(
    (feature: GeoJSON.Feature<GeoJSON.Point>) => {
      setSelectedAirportData(null);
      setHighlightedIcao(null);
      setSelectedFlight(feature);
      setSearchError(null);

      mapRef.current?.flyTo({
        center: feature.geometry.coordinates as [number, number],
        zoom: 8,
        duration: 1000,
      });
    },
    [],
  );

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];

      if (!feature) {
        setSelectedFlight(null);
        return;
      }

      if (feature.layer?.id === "airports-points") {
        const props = feature.properties as AirportFeatureProperties;
        const coords = (feature as GeoJSON.Feature<GeoJSON.Point>).geometry
          .coordinates;
        openAirportPanel({
          icaoCode: props.icaoCode,
          iataCode: props.iataCode ?? null,
          name: props.name,
          latitude: coords[1],
          longitude: coords[0],
          timezone: props.timezone,
          city: props.cityName
            ? {
                id: 0,
                name: props.cityName,
                countryCode: "",
                countryName: props.countryName ?? null,
              }
            : null,
        });
      } else if (feature.layer?.id === "flights-points") {
        // Zamknij panel lotniska przy kliknieciu na lot
        setSelectedAirportData(null);
        setHighlightedIcao(null);
        setSelectedFlight(feature as GeoJSON.Feature<GeoJSON.Point>);

        const coords = (feature as GeoJSON.Feature<GeoJSON.Point>).geometry
          .coordinates;
        mapRef.current?.flyTo({
          center: [coords[0], coords[1]],
          duration: 800,
        });
      }
    },
    [openAirportPanel],
  );

  const handlePanelClose = useCallback(() => {
    setSelectedAirportData(null);
    setHighlightedIcao(null);
  }, []);

  const handleFlightPanelClose = useCallback(() => {
    setSelectedFlight(null);
  }, []);

  const handleCityPanelClose = useCallback(() => {
    setCityAirports([]);
  }, []);

  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor(""), []);

  const handleLocate = useCallback((coords: [number, number]) => {
    mapRef.current?.flyTo({
      center: coords,
      zoom: 10,
      duration: 1200,
    });
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full border-t-2 border-ink">
      <PanelContainer
        cityAirports={cityAirports}
        selectedAirportData={selectedAirportData}
        selectedFlight={selectedFlight}
        selectedAirlineIcaos={selectedAirlineIcaos}
        openAirportPanel={openAirportPanel}
        handlePanelClose={handlePanelClose}
        handleFlightPanelClose={handleFlightPanelClose}
        handleCityPanelClose={handleCityPanelClose}
        handleAirlineToggle={handleAirlineToggle}
        handleToggleAll={handleToggleAll}
        onLocate={handleLocate}
      />

      {/* Map */}
      <div className="relative flex-1 bg-(--color-bg)">
        <MapGL
          ref={mapRef}
          initialViewState={{ longitude: 19.0, latitude: 52.0, zoom: 5 }}
          mapStyle={MAP_STYLE_URL}
          onLoad={handleMapLoad}
          onMoveEnd={updateBoundingBox}
          interactiveLayerIds={["flights-points", "airports-points"]}
          onClick={handleMapClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          cursor={cursor}
        >
          <NavigationControl position="bottom-right" showCompass={true} />

          <MapLayers
            routesGeoJson={routesGeoJson}
            airportsGeoJson={airportsGeoJson}
            flightsGeoJson={geoJsonData}
            traveledPathGeoJson={traveledPathGeoJson}
            remainingPathGeoJson={remainingPathGeoJson}
            activeBBoxGeoJson={activeBBoxGeoJson}
          />
        </MapGL>

        <AltitudeLegend />

        <MapOverlay
          flightsCount={filteredFlights.length}
          totalCount={flights.length}
          loading={loading}
          error={error}
          onAirportSelect={handleSearchSelect}
        >
          <FlightFilterPanel
            filters={filters}
            options={filterOptions}
            activeCount={activeFilterCount}
            visibleCount={filteredFlights.length}
            totalCount={flights.length}
            onFlightNumberChange={setFlightNumber}
            onToggleAirline={toggleAirline}
            onToggleCountry={toggleCountry}
            onToggleCategory={toggleCategory}
            onClear={clearFilters}
          />
        </MapOverlay>

        {/* Flight Search (Top Right) */}
        <div className="absolute top-4 right-14 z-10 flex flex-col items-end gap-2">
          <FlightSearch
            onSelect={handleFlightSearchSelect}
            onError={setSearchError}
          />
          {searchError && (
            <div className="border-2 border-ink bg-surface p-2 shadow-brut animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="font-mono text-[10px] text-red-600 font-bold uppercase leading-tight">
                Błąd: {searchError}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
