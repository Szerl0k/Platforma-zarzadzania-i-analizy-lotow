"use client";

import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import {
  Map as MapGL,
  NavigationControl,
  MapEvent,
} from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useTelemetry, useLocateFlight } from "@/common/hooks/useTelemetry";
import { useAirports } from "@/common/hooks/useAirports";
import { useAirportRoutes } from "@/common/hooks/useAirportRoutes";
import { useRouteAnimation } from "@/common/hooks/useRouteAnimation";
import { useFlightPath } from "@/common/hooks/useFlights";
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
import { useTelemetryMapState } from "./useTelemetryMapState";
import { useTelemetryDeeplink } from "./useTelemetryDeeplink";
import {
  MAP_STYLE_URL,
  mapAirportsToGeoJson,
  mapFlightsToGeoJson,
  applyPolishLabels,
  loadTelemetryMapImages,
  calculateQuantizedBBox,
  bboxToGeoJson,
  singleGeometryFC,
  EMPTY_GEOJSON,
} from "@/app/telemetry/_utils/telemetryMapHelpers";

export default function TelemetryMapView() {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const {
    flights,
    error,
    loading,
    setBounds: setFlightBounds,
  } = useTelemetry(10000);
  const { airports, setBounds: setAirportBounds } = useAirports();

  // Selection state + interaction handlers.
  const map = useTelemetryMapState(mapRef);
  const { selectedFlight, selectedAirportData, selectedIcao24 } = map;

  // Consume the `?flightId=` deeplink (after the map has loaded).
  useTelemetryDeeplink(mapRef, mapLoaded, {
    setSelectedFlight: map.setSelectedFlight,
    setSelectedAirportData: map.setSelectedAirportData,
    setHighlightedIcao: map.setHighlightedIcao,
  });

  // Telemetry + path for the currently selected flight.
  const locateParams = useMemo(
    () => (selectedIcao24 ? { icao24: selectedIcao24 } : null),
    [selectedIcao24],
  );
  const { data: detailedTelemetry } = useLocateFlight(locateParams);
  const { pathData } = useFlightPath(
    detailedTelemetry?.internalFlightId || null,
  );

  const traveledPathGeoJson = useMemo(
    () => singleGeometryFC(pathData?.traveled),
    [pathData],
  );
  const remainingPathGeoJson = useMemo(
    () => singleGeometryFC(pathData?.remaining),
    [pathData],
  );

  const {
    selectedAirlineIcaos,
    routesGeoJson,
    toggleAirline: handleAirlineToggle,
    toggleAll: handleToggleAll,
  } = useAirportRoutes(selectedAirportData);

  const [activeBBoxGeoJson, setActiveBBoxGeoJson] =
    useState<GeoJSON.FeatureCollection>(EMPTY_GEOJSON);

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
    if (!map.highlightedIcao) return base;
    return {
      ...base,
      features: base.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          highlighted: f.properties?.icaoCode === map.highlightedIcao,
        },
      })),
    };
  }, [airports, map.highlightedIcao]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useRouteAnimation(mapRef, routesGeoJson);

  const updateBoundingBox = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      const m = mapRef.current?.getMap();
      if (!m) return;
      const bbox = calculateQuantizedBBox(m.getBounds());
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

  const handleMapLoad = useCallback(
    (e: MapEvent) => {
      const loadedMap = e.target;
      setMapLoaded(true);
      applyPolishLabels(loadedMap);
      updateBoundingBox();
      loadTelemetryMapImages(loadedMap).catch((err) => {
        console.error("Error loading map images:", err);
      });
    },
    [updateBoundingBox],
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full border-t-2 border-ink">
      <PanelContainer
        cityAirports={map.cityAirports}
        selectedAirportData={selectedAirportData}
        selectedFlight={selectedFlight}
        selectedAirlineIcaos={selectedAirlineIcaos}
        openAirportPanel={map.openAirportPanel}
        handlePanelClose={map.handlePanelClose}
        handleFlightPanelClose={map.handleFlightPanelClose}
        handleCityPanelClose={map.handleCityPanelClose}
        handleAirlineToggle={handleAirlineToggle}
        handleToggleAll={handleToggleAll}
        onLocate={map.handleLocate}
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
          onClick={map.handleMapClick}
          onMouseEnter={map.onMouseEnter}
          onMouseLeave={map.onMouseLeave}
          cursor={map.cursor}
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
          onAirportSelect={map.handleSearchSelect}
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
            onSelect={map.handleFlightSearchSelect}
            onError={map.setSearchError}
          />
          {map.searchError && (
            <div className="border-2 border-ink bg-surface p-2 shadow-brut animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="font-mono text-[10px] text-red-600 font-bold uppercase leading-tight">
                Błąd: {map.searchError}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
