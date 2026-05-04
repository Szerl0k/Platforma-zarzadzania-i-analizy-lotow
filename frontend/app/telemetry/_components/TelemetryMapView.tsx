"use client";

import { useCallback, useRef, useMemo, useState, useEffect } from "react";
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
import { useFlightPath } from "@/common/hooks/useFlights";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapOverlay } from "@/common/components/Map/TelemetryOverlay";
import { FlightSearch } from "@/common/components/Map/FlightSearch";
import { MapLayers } from "./MapLayers";
import { PanelContainer } from "./PanelContainer";
import {
  MAP_STYLE_URL,
  mapAirportsToGeoJson,
  mapFlightsToGeoJson,
  mapRoutesToGeoJson,
  applyPolishLabels,
  loadTelemetryMapImages,
  calculateQuantizedBBox,
  EMPTY_GEOJSON,
} from "@/app/telemetry/_utils/telemetryMapHelpers";
import type { Airport, AirlineWithDestinations } from "@/common/api/airports";
import type {
  AirportFeatureProperties,
  FlightFeatureProperties,
} from "@/app/telemetry/_utils/telemetryMapHelpers";

export default function TelemetryMapView() {
  const mapRef = useRef<MapRef>(null);
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
  const [cursor, setCursor] = useState<string>("");

  const geoJsonData = useMemo(() => mapFlightsToGeoJson(flights), [flights]);

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
    }, 500);
  }, [setFlightBounds, setAirportBounds]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleMapLoad = useCallback(
    (e: MapEvent) => {
      const map = e.target;
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
      />

      {/* Map */}
      <div className="relative flex-1 bg-(--color-bg)">
        <MapGL
          ref={mapRef}
          initialViewState={{ longitude: 19.0, latitude: 52.0, zoom: 5 }}
          mapStyle={MAP_STYLE_URL}
          className="w-full h-full"
          onLoad={handleMapLoad}
          onMoveEnd={updateBoundingBox}
          interactiveLayerIds={["flights-points", "airports-points"]}
          onClick={handleMapClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          cursor={cursor}
        >
          <NavigationControl position="bottom-right" showCompass={false} />

          <MapLayers
            routesGeoJson={routesGeoJson}
            airportsGeoJson={airportsGeoJson}
            flightsGeoJson={geoJsonData}
            traveledPathGeoJson={traveledPathGeoJson}
            remainingPathGeoJson={remainingPathGeoJson}
          />
        </MapGL>

        <MapOverlay
          flightsCount={flights.length}
          loading={loading}
          error={error}
          onAirportSelect={handleSearchSelect}
        />

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
