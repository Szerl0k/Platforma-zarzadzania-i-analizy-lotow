"use client";

import { useCallback, useMemo, useState, type RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import type { Airport } from "@/common/api/airports";
import type {
  AirportFeatureProperties,
  FlightFeatureProperties,
} from "@/app/telemetry/_utils/telemetryMapHelpers";

/**
 * Owns the telemetry map's selection/UI state and the interaction handlers
 * (flight/airport selection, map clicks, camera fly-to, panel open/close,
 * cursor). Extracted from TelemetryMapView so the component is a thin
 * composition and this logic is unit-testable in isolation.
 */
export function useTelemetryMapState(mapRef: RefObject<MapRef | null>) {
  const [selectedFlight, setSelectedFlight] =
    useState<GeoJSON.Feature<GeoJSON.Point> | null>(null);
  const [selectedAirportData, setSelectedAirportData] =
    useState<Airport | null>(null);
  const [cityAirports, setCityAirports] = useState<Airport[]>([]);
  const [highlightedIcao, setHighlightedIcao] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>("");

  const selectedIcao24 = useMemo(
    () =>
      (selectedFlight?.properties as FlightFeatureProperties)?.icao24 || null,
    [selectedFlight],
  );

  const openAirportPanel = useCallback(
    (airport: Airport) => {
      setSelectedAirportData(airport);
      setSelectedFlight(null);
      setHighlightedIcao(airport.icaoCode);
      mapRef.current?.flyTo({
        center: [airport.longitude, airport.latitude],
        zoom: Math.max(mapRef.current.getMap().getZoom(), 9),
        duration: 800,
      });
    },
    [mapRef],
  );

  const handleSearchSelect = useCallback(
    (airport: Airport, results: Airport[]) => {
      if (results.length > 1) setCityAirports(results);
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
    [mapRef],
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
    [mapRef, openAirportPanel],
  );

  const handlePanelClose = useCallback(() => {
    setSelectedAirportData(null);
    setHighlightedIcao(null);
  }, []);

  const handleFlightPanelClose = useCallback(() => setSelectedFlight(null), []);
  const handleCityPanelClose = useCallback(() => setCityAirports([]), []);
  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor(""), []);

  const handleLocate = useCallback(
    (coords: [number, number]) => {
      mapRef.current?.flyTo({ center: coords, zoom: 10, duration: 1200 });
    },
    [mapRef],
  );

  return {
    // state
    selectedFlight,
    selectedAirportData,
    cityAirports,
    highlightedIcao,
    searchError,
    cursor,
    selectedIcao24,
    // setters used by the deeplink effect
    setSelectedFlight,
    setSelectedAirportData,
    setHighlightedIcao,
    setSearchError,
    // handlers
    openAirportPanel,
    handleSearchSelect,
    handleFlightSearchSelect,
    handleMapClick,
    handlePanelClose,
    handleFlightPanelClose,
    handleCityPanelClose,
    onMouseEnter,
    onMouseLeave,
    handleLocate,
  };
}
