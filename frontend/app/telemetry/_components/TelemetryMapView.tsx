"use client";

import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import {
  Map as MapGL,
  NavigationControl,
  Source,
  Layer,
  MapEvent,
  Popup,
} from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { useTelemetry } from "@/common/hooks/useTelemetry";
import { useAirports } from "@/common/hooks/useAirports";
import { useRouteAnimation } from "@/common/hooks/useRouteAnimation";
import "maplibre-gl/dist/maplibre-gl.css";
import { AirportPanel } from "@/common/components/Map/AirportPanel";
import { CityAirportsPanel } from "@/common/components/Map/CityAirportsPanel";
import { FlightPanel } from "@/common/components/Map/FlightPanel";
import { MapOverlay } from "@/common/components/Map/TelemetryOverlay";
import {
  MAP_STYLE_URL,
  mapAirportsToGeoJson,
  mapFlightsToGeoJson,
  mapRoutesToGeoJson,
  tintMapImage,
  POLISH_TEXT_FIELD,
} from "@/app/telemetry/_utils/telemetryMapHelpers";
import type { Airport, AirlineWithDestinations } from "@/common/api/airports";

const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

interface AirportFeatureProperties {
  icaoCode: string;
  iataCode: string | null;
  name: string;
  cityName: string | null;
  countryName: string | null;
  timezone: string;
}

interface FlightFeatureProperties {
  icao24: string;
  callsign?: string;
  altitude?: number | null;
  velocity?: number | null;
  heading?: number | null;
  onGround?: boolean;
}

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
  const [selectedRoutes, setSelectedRoutes] = useState<Map<string, Airport[]>>(
    new Map(),
  );
  const [cityAirports, setCityAirports] = useState<Airport[]>([]);
  const [highlightedIcao, setHighlightedIcao] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>("");

  const geoJsonData = useMemo(() => mapFlightsToGeoJson(flights), [flights]);

  const selectedAirlineIcaos = useMemo(
    () => new Set(selectedRoutes.keys()),
    [selectedRoutes],
  );

  const routesGeoJson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!selectedAirportData || selectedRoutes.size === 0) return EMPTY_GEOJSON;
    const allDestinations = [
      ...new Map(
        [...selectedRoutes.values()].flat().map((a) => [a.icaoCode, a]),
      ).values(),
    ];
    return mapRoutesToGeoJson(selectedAirportData, allDestinations);
  }, [selectedAirportData, selectedRoutes]);

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

      // Kwantyzacja siatki do 2 stopni geograficznych.
      // Zapobiega fragmentacji cache'u na backendzie podczas operacji zoom i mikro-przesunięć.
      const GRID_SIZE = 2.0;
      const quantizeMin = (val: number) =>
        Math.floor(val / GRID_SIZE) * GRID_SIZE;
      const quantizeMax = (val: number) =>
        Math.ceil(val / GRID_SIZE) * GRID_SIZE;

      const bbox = {
        lomin: quantizeMin(b.getWest()),
        lamin: quantizeMin(b.getSouth()),
        lomax: quantizeMax(b.getEast()),
        lamax: quantizeMax(b.getNorth()),
      };
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

      const layers = map.getStyle().layers ?? [];
      for (const layer of layers) {
        if (layer.type !== "symbol") continue;
        const current = map.getLayoutProperty(layer.id, "text-field");
        if (current == null) continue;
        map.setLayoutProperty(layer.id, "text-field", POLISH_TEXT_FIELD);
      }
      updateBoundingBox();

      if (!map.hasImage("airplane-icon")) {
        map
          .loadImage("/airplane.png")
          .then((response) => {
            map.addImage("airplane-icon", response.data);
          })
          .catch((err) => {
            console.error("Error loading airplane icon:", err);
          });
      }
      if (!map.hasImage("airplane-icon-navy")) {
        tintMapImage(
          map,
          "airplane-icon-navy",
          "/airplane.png",
          "#1E3A8A",
        ).catch((err) => {
          console.error("Error loading airplane-icon-navy:", err);
        });
      }
      if (!map.hasImage("airport-icon")) {
        tintMapImage(map, "airport-icon", "/airport.png", "#1E3A8A").catch(
          (err) => {
            console.error("Error loading airport-icon:", err);
          },
        );
      }
      if (!map.hasImage("airport-icon-lime")) {
        tintMapImage(map, "airport-icon-lime", "/airport.png", "#BEF264").catch(
          (err) => {
            console.error("Error loading airport-icon-lime:", err);
          },
        );
      }
    },
    [updateBoundingBox],
  );

  const openAirportPanel = useCallback((airport: Airport) => {
    setSelectedAirportData(airport);
    setSelectedRoutes(new Map());
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
      }
    },
    [openAirportPanel],
  );

  const handlePanelClose = useCallback(() => {
    setSelectedAirportData(null);
    setSelectedRoutes(new Map());
    setHighlightedIcao(null);
  }, []);

  const handleFlightPanelClose = useCallback(() => {
    setSelectedFlight(null);
  }, []);

  const handleCityPanelClose = useCallback(() => {
    setCityAirports([]);
  }, []);

  const handleAirlineToggle = useCallback(
    (airlineIcao: string, destinations: Airport[]) => {
      setSelectedRoutes((prev) => {
        const next = new Map(prev);
        if (next.has(airlineIcao)) {
          next.delete(airlineIcao);
        } else {
          next.set(airlineIcao, destinations);
        }
        return next;
      });
    },
    [],
  );

  const handleToggleAll = useCallback(
    (allRoutes: AirlineWithDestinations[]) => {
      setSelectedRoutes((prev) => {
        const allSelected = allRoutes.every((r) =>
          prev.has(r.airline.icaoCode),
        );
        if (allSelected) return new Map();
        return new Map(
          allRoutes.map((r) => [r.airline.icaoCode, r.destinations]),
        );
      });
    },
    [],
  );

  const onMouseEnter = useCallback(() => setCursor("pointer"), []);
  const onMouseLeave = useCallback(() => setCursor(""), []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full border-t-2 border-ink">
      {/* City airports panel */}
      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-300 ${cityAirports.length > 0 ? "w-80" : "w-0"}`}
      >
        <div className="w-80 h-full">
          {cityAirports.length > 0 && (
            <CityAirportsPanel
              airports={cityAirports}
              selectedIcao={selectedAirportData?.icaoCode ?? null}
              onSelect={openAirportPanel}
              onClose={handleCityPanelClose}
            />
          )}
        </div>
      </div>

      {/* Routes panel (Lotnisko) */}
      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-300 ${selectedAirportData ? "w-80" : "w-0"}`}
      >
        <div className="w-80 h-full">
          {selectedAirportData && (
            <AirportPanel
              key={selectedAirportData.icaoCode}
              airport={selectedAirportData}
              selectedAirlineIcaos={selectedAirlineIcaos}
              onClose={handlePanelClose}
              onAirlineToggle={handleAirlineToggle}
              onToggleAll={handleToggleAll}
            />
          )}
        </div>
      </div>

      {/* Flight Panel */}
      <div
        className={`shrink-0 overflow-hidden transition-[width] duration-300 ${selectedFlight ? "w-80" : "w-0"}`}
      >
        <div className="w-80 h-full">
          {selectedFlight && (
            <FlightPanel
              properties={selectedFlight.properties as FlightFeatureProperties}
              onClose={handleFlightPanelClose}
            />
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 bg-[var(--color-bg)]">
        <MapGL
          ref={mapRef}
          initialViewState={{ longitude: 19.0, latitude: 52.0, zoom: 5 }}
          mapStyle={MAP_STYLE_URL}
          style={{ width: "100%", height: "100%" }}
          onLoad={handleMapLoad}
          onMoveEnd={updateBoundingBox}
          interactiveLayerIds={["flights-points", "airports-points"]}
          onClick={handleMapClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          cursor={cursor}
        >
          <NavigationControl position="bottom-right" showCompass={false} />

          {/* Route lines */}
          <Source id="routes-source" type="geojson" data={routesGeoJson}>
            <Layer
              id="routes-lines"
              type="line"
              paint={{
                "line-color": "#BEF264",
                "line-width": 2,
                "line-dasharray": [3, 2],
              }}
            />
          </Source>

          {/* Airport markers */}
          <Source id="airports-source" type="geojson" data={airportsGeoJson}>
            <Layer
              id="airports-points"
              type="symbol"
              minzoom={5}
              layout={{
                "icon-image": [
                  "case",
                  ["==", ["get", "highlighted"], true],
                  "airport-icon-lime",
                  "airport-icon",
                ],
                "icon-allow-overlap": true,
                "icon-size": [
                  "case",
                  ["==", ["get", "highlighted"], true],
                  0.02,
                  0.015,
                ],
              }}
            />
          </Source>

          {/* Flight markers */}
          <Source id="flights-source" type="geojson" data={geoJsonData}>
            <Layer
              id="flights-points"
              type="symbol"
              layout={{
                "icon-image": "airplane-icon",
                "icon-rotate": ["get", "heading"],
                "icon-rotation-alignment": "map",
                "icon-allow-overlap": true,
                "icon-size": 0.5,
              }}
            />
          </Source>

          {/* Animated airplanes */}
          <Source id="animated-planes" type="geojson" data={EMPTY_GEOJSON}>
            <Layer
              id="animated-planes-layer"
              type="symbol"
              layout={{
                "icon-image": "airplane-icon-navy",
                "icon-rotate": ["get", "heading"],
                "icon-rotation-alignment": "map",
                "icon-allow-overlap": true,
                "icon-size": 0.4,
              }}
            />
          </Source>
        </MapGL>

        <MapOverlay
          flightsCount={flights.length}
          loading={loading}
          error={error}
          onAirportSelect={handleSearchSelect}
        />
      </div>
    </div>
  );
}
