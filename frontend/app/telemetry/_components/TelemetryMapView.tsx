"use client";

import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import {
  Map as MapGL,
  NavigationControl,
  Source,
  Layer,
  MapEvent,
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
  applyPolishLabels,
  loadTelemetryMapImages,
  calculateQuantizedBBox,
  EMPTY_GEOJSON,
} from "@/app/telemetry/_utils/telemetryMapHelpers";
import type { Airport, AirlineWithDestinations } from "@/common/api/airports";
import type { 
  AirportFeatureProperties, 
  FlightFeatureProperties 
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
  const [selectedRoutes, setSelectedRoutes] = useState<Map<string, Airport[]>>(
    new Map(),
  );
  const [cityAirports, setCityAirports] = useState<Airport[]>([]);
  const [highlightedIcao, setHighlightedIcao] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>("");
  
  // Stan szerokości panelu (współdzielony dla wszystkich paneli dla spójności)
  const [panelWidth, setPanelWidth] = useState(320); // Domyślnie w-80 = 320px
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    
    e.preventDefault();
    const newWidth = e.clientX;
    
    // Nakładamy limity szerokości: min 320px, max 800px lub 50vw
    if (newWidth >= 320 && newWidth <= Math.min(800, window.innerWidth * 0.5)) {
      setPanelWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isResizingRef.current) {
        setIsResizing(false);
        isResizingRef.current = false;
        document.body.style.cursor = "default";
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
    };
  }, [handleMouseMove, handleMouseUp]);


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

  // Wyliczamy czy jakikolwiek panel jest otwarty
  const isAnyPanelOpen = Boolean(cityAirports.length > 0 || selectedAirportData || selectedFlight);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full border-t-2 border-ink">
      
      {/* Dynamicznie dopasowujący się kontener paneli */}
      <div 
        className={`h-full flex shrink-0 relative ${isResizing ? "" : "transition-[width] duration-300"} ${isAnyPanelOpen ? "" : "!w-0 overflow-hidden"}`}
        style={isAnyPanelOpen ? { width: `${panelWidth}px` } : undefined}
      >
          <div className="flex-1 w-full h-full flex flex-col relative border-r-2 border-ink bg-surface">
              {/* City airports panel */}
              {cityAirports.length > 0 && (
                <div className="absolute inset-0 z-10 bg-surface">
                    <CityAirportsPanel
                      airports={cityAirports}
                      selectedIcao={selectedAirportData?.icaoCode ?? null}
                      onSelect={openAirportPanel}
                      onClose={handleCityPanelClose}
                    />
                </div>
              )}
        
              {/* Routes panel (Lotnisko) */}
              {selectedAirportData && !selectedFlight && (
                 <div className="absolute inset-0 z-20 bg-surface">
                    <AirportPanel
                      key={selectedAirportData.icaoCode}
                      airport={selectedAirportData}
                      selectedAirlineIcaos={selectedAirlineIcaos}
                      onClose={handlePanelClose}
                      onAirlineToggle={handleAirlineToggle}
                      onToggleAll={handleToggleAll}
                    />
                </div>
              )}
        
              {/* Flight Panel */}
              {selectedFlight && (
                 <div className="absolute inset-0 z-30 bg-surface">
                    <FlightPanel
                      properties={selectedFlight.properties as FlightFeatureProperties}
                      onClose={handleFlightPanelClose}
                    />
                </div>
              )}
          </div>

          {/* Wspólny Resizer Handle na końcu kontenera paneli */}
          {isAnyPanelOpen && (
            <div 
                className="w-2 hover:bg-ink/10 cursor-col-resize absolute right-0 top-0 bottom-0 flex items-center justify-center group z-50 transform translate-x-1/2"
                onMouseDown={handleMouseDown}
            >
                <div className="w-0.5 h-8 bg-ink/30 group-hover:bg-ink/60 rounded-full" />
            </div>
          )}
      </div>

      {/* Map */}
      <div className="relative flex-1 bg-(--color-bg)">
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
