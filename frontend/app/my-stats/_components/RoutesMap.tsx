"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Map as MapGL,
  NavigationControl,
  Popup,
  Source,
  Layer,
  MapEvent,
} from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MAP_STYLE_URL,
  applyPolishLabels,
  loadTelemetryMapImages,
  EMPTY_GEOJSON,
} from "@/app/telemetry/_utils/telemetryMapHelpers";
import { useThemeColors } from "@/common/hooks/UseThemeColors";
import { airlineColor } from "@/common/utils/airlineColor";
import { greatCircleCoords } from "@/common/utils/geoUtils";
import type { UserRouteDTO } from "@/common/api/stats";

interface RoutesMapProps {
  routes: UserRouteDTO[];
}

interface RouteFeatureProperties {
  id: string;
  ident: string | null;
  airlineName: string | null;
  travelDate: string;
  durationMinutes: number | null;
  color: string;
}

function buildRoutesGeoJson(
  routes: UserRouteDTO[],
): GeoJSON.FeatureCollection<GeoJSON.LineString, RouteFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: routes
      .filter(
        (r) =>
          r.originLat != null &&
          r.originLon != null &&
          r.destinationLat != null &&
          r.destinationLon != null,
      )
      .map((r) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: greatCircleCoords(
            r.originLon!,
            r.originLat!,
            r.destinationLon!,
            r.destinationLat!,
          ),
        },
        properties: {
          id: r.id,
          ident: r.ident,
          airlineName: r.airlineName,
          travelDate: r.travelDate,
          durationMinutes: r.durationMinutes,
          color: airlineColor(r.airlineIcao),
        },
      })),
  };
}

function buildAirportsGeoJson(
  routes: UserRouteDTO[],
): GeoJSON.FeatureCollection {
  const seen = new Map<string, GeoJSON.Feature>();
  for (const r of routes) {
    if (r.originIcao && r.originLat != null && r.originLon != null) {
      seen.set(r.originIcao, {
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.originLon, r.originLat] },
        properties: {
          icaoCode: r.originIcao,
          name: r.originName,
          highlighted: true,
        },
      });
    }
    if (
      r.destinationIcao &&
      r.destinationLat != null &&
      r.destinationLon != null
    ) {
      seen.set(r.destinationIcao, {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [r.destinationLon, r.destinationLat],
        },
        properties: {
          icaoCode: r.destinationIcao,
          name: r.destinationName,
          highlighted: true,
        },
      });
    }
  }
  return { type: "FeatureCollection", features: [...seen.values()] };
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

interface PopupState {
  longitude: number;
  latitude: number;
  data: RouteFeatureProperties;
}

export function RoutesMap({ routes }: RoutesMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { lime, navy, ink } = useThemeColors();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [cursor, setCursor] = useState<string>("");

  const routesGeoJson = useMemo(() => buildRoutesGeoJson(routes), [routes]);
  const airportsGeoJson = useMemo(() => buildAirportsGeoJson(routes), [routes]);

  const handleLoad = useCallback((e: MapEvent) => {
    const map = e.target;
    applyPolishLabels(map);
    loadTelemetryMapImages(map).catch((err) => {
      console.error("Error loading map images:", err);
    });
  }, []);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature || feature.layer?.id !== "user-routes-lines") {
      setPopup(null);
      return;
    }
    setPopup({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      data: feature.properties as RouteFeatureProperties,
    });
  }, []);

  if (routesGeoJson.features.length === 0) {
    return (
      <div className="border-2 border-ink bg-surface p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
          Brak tras w wybranym roku
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[500px] w-full border-2 border-ink overflow-hidden">
      <MapGL
        ref={mapRef}
        initialViewState={{ longitude: 19.0, latitude: 52.0, zoom: 3 }}
        mapStyle={MAP_STYLE_URL}
        onLoad={handleLoad}
        interactiveLayerIds={["user-routes-lines"]}
        onClick={handleClick}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("")}
        cursor={cursor}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        <Source id="user-routes-source" type="geojson" data={routesGeoJson}>
          <Layer
            id="user-routes-lines"
            type="line"
            paint={{
              "line-color": ["coalesce", ["get", "color"], lime],
              "line-width": 3,
              "line-opacity": 0.85,
            }}
          />
        </Source>

        <Source id="user-airports-source" type="geojson" data={airportsGeoJson}>
          <Layer
            id="user-airports-points"
            type="circle"
            paint={{
              "circle-radius": 5,
              "circle-color": navy,
              "circle-stroke-color": ink,
              "circle-stroke-width": 2,
            }}
          />
        </Source>

        <Source id="empty-helper" type="geojson" data={EMPTY_GEOJSON}>
          <Layer
            id="empty-helper-layer"
            type="circle"
            paint={{ "circle-radius": 0 }}
          />
        </Source>

        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            anchor="top"
            closeButton
            closeOnClick={false}
            onClose={() => setPopup(null)}
            className="brutalist-popup"
          >
            <div className="font-mono text-[11px] text-ink leading-tight space-y-1">
              <p className="font-bold uppercase tracking-widest">
                {popup.data.ident ?? "—"}
              </p>
              {popup.data.airlineName && <p>{popup.data.airlineName}</p>}
              <p className="text-ink-subtle">
                {new Date(popup.data.travelDate).toLocaleDateString("pl-PL")}
              </p>
              <p>Czas lotu: {formatDuration(popup.data.durationMinutes)}</p>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
