"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Layer,
  Map as MapGL,
  NavigationControl,
  Popup,
  Source,
  type MapEvent,
} from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  EMPTY_GEOJSON,
  MAP_STYLE_URL,
  applyPolishLabels,
  loadTelemetryMapImages,
} from "@/app/telemetry/_utils/telemetryMapHelpers";
import { useThemeColors } from "@/common/hooks/UseThemeColors";
import { useRouteAnimation } from "@/common/hooks/useRouteAnimation";
import { greatCircleCoords } from "@/common/utils/geoUtils";
import type { Airport, RouteCheckResult } from "@/common/api/airports";

interface RouteCheckMapProps {
  origin: Airport;
  destination: Airport;
  result: RouteCheckResult;
  activeFilter: string | null;
}

interface LineProperties {
  routeType: "direct" | "connecting";
  label: string;
  stopIcao: string | null;
  stopIata: string | null;
}

function buildLinesGeoJson(
  origin: Airport,
  destination: Airport,
  result: RouteCheckResult,
): GeoJSON.FeatureCollection<GeoJSON.LineString, LineProperties> {
  const features: GeoJSON.Feature<GeoJSON.LineString, LineProperties>[] = [];

  if (result.direct.length > 0) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: greatCircleCoords(
          origin.longitude,
          origin.latitude,
          destination.longitude,
          destination.latitude,
        ),
      },
      properties: {
        routeType: "direct",
        label: result.direct
          .map((d) => d.airlineName ?? d.airlineIcao ?? d.airlineIata ?? "—")
          .join(", "),
        stopIcao: null,
        stopIata: null,
      },
    });
  }

  for (const r of result.connecting) {
    if (!r.stopLatitude && !r.stopLongitude) continue;
    const stopLabel = r.stopCityName ?? r.stopAirportName ?? r.stopAirportIcao;
    const props: LineProperties = {
      routeType: "connecting",
      label: stopLabel,
      stopIcao: r.stopAirportIcao,
      stopIata: r.stopAirportIata,
    };
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: greatCircleCoords(
          origin.longitude,
          origin.latitude,
          r.stopLongitude,
          r.stopLatitude,
        ),
      },
      properties: props,
    });
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: greatCircleCoords(
          r.stopLongitude,
          r.stopLatitude,
          destination.longitude,
          destination.latitude,
        ),
      },
      properties: props,
    });
  }

  return { type: "FeatureCollection", features };
}

function buildStopPointsGeoJson(
  result: RouteCheckResult,
): GeoJSON.FeatureCollection {
  const seen = new Set<string>();
  const features: GeoJSON.Feature[] = [];
  for (const r of result.connecting) {
    if (seen.has(r.stopAirportIcao)) continue;
    if (!r.stopLatitude && !r.stopLongitude) continue;
    seen.add(r.stopAirportIcao);
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [r.stopLongitude, r.stopLatitude],
      },
      properties: {
        icao: r.stopAirportIcao,
        iata: r.stopAirportIata,
        label: r.stopCityName ?? r.stopAirportName ?? r.stopAirportIcao,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

interface PopupState {
  longitude: number;
  latitude: number;
  routeType: "direct" | "connecting";
  label: string;
  stopIcao: string | null;
  stopIata: string | null;
}

export function RouteCheckMap({
  origin,
  destination,
  result,
  activeFilter,
}: RouteCheckMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { lime, navy, ink } = useThemeColors();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [cursor, setCursor] = useState("");
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const linesGeoJson = useMemo(
    () => buildLinesGeoJson(origin, destination, result),
    [origin, destination, result],
  );

  const stopPointsGeoJson = useMemo(
    () => buildStopPointsGeoJson(result),
    [result],
  );

  const filteredLinesGeoJson = useMemo(() => {
    if (!activeFilter) return linesGeoJson;
    const keep =
      activeFilter === "direct"
        ? (f: GeoJSON.Feature) =>
            (f.properties as LineProperties).routeType === "direct"
        : (f: GeoJSON.Feature) =>
            (f.properties as LineProperties).stopIcao === activeFilter;
    return { ...linesGeoJson, features: linesGeoJson.features.filter(keep) };
  }, [linesGeoJson, activeFilter]);

  const filteredStopPointsGeoJson = useMemo(() => {
    if (!activeFilter) return stopPointsGeoJson;
    if (activeFilter === "direct") return EMPTY_GEOJSON;
    return {
      ...stopPointsGeoJson,
      features: stopPointsGeoJson.features.filter(
        (f) => (f.properties as { icao: string }).icao === activeFilter,
      ),
    };
  }, [stopPointsGeoJson, activeFilter]);

  const originGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [origin.longitude, origin.latitude],
          },
          properties: { icao: origin.icaoCode },
        },
      ],
    }),
    [origin],
  );

  const destinationGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [destination.longitude, destination.latitude],
          },
          properties: { icao: destination.icaoCode },
        },
      ],
    }),
    [destination],
  );

  useRouteAnimation(
    mapRef,
    imagesLoaded ? filteredLinesGeoJson : EMPTY_GEOJSON,
  );

  const handleLoad = useCallback(
    (e: MapEvent) => {
      const map = e.target;
      applyPolishLabels(map);
      loadTelemetryMapImages(map)
        .then(() => setImagesLoaded(true))
        .catch(() => {});

      // Fit map to show origin + destination + all stops
      const lons = [
        origin.longitude,
        destination.longitude,
        ...result.connecting.map((r) => r.stopLongitude).filter(Boolean),
      ];
      const lats = [
        origin.latitude,
        destination.latitude,
        ...result.connecting.map((r) => r.stopLatitude).filter(Boolean),
      ];
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      map.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
        {
          padding: 60,
          duration: 0,
          maxZoom: 7,
        },
      );
    },
    [origin, destination, result],
  );

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (
      !feature ||
      (feature.layer?.id !== "rc-direct-lines" &&
        feature.layer?.id !== "rc-connecting-lines")
    ) {
      setPopup(null);
      return;
    }
    const p = feature.properties as LineProperties;
    setPopup({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      routeType: p.routeType,
      label: p.label,
      stopIcao: p.stopIcao,
      stopIata: p.stopIata,
    });
  }, []);

  return (
    <div className="relative h-[600px] w-full border-2 border-ink overflow-hidden">
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: (origin.longitude + destination.longitude) / 2,
          latitude: (origin.latitude + destination.latitude) / 2,
          zoom: 3,
        }}
        mapStyle={MAP_STYLE_URL}
        onLoad={handleLoad}
        interactiveLayerIds={["rc-direct-lines", "rc-connecting-lines"]}
        onClick={handleClick}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("")}
        cursor={cursor}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        <Source id="rc-lines-source" type="geojson" data={filteredLinesGeoJson}>
          <Layer
            id="rc-direct-lines"
            type="line"
            filter={["==", ["get", "routeType"], "direct"]}
            paint={{
              "line-color": lime,
              "line-width": 2.5,
              "line-opacity": 0.9,
            }}
          />
          <Layer
            id="rc-connecting-lines"
            type="line"
            filter={["==", ["get", "routeType"], "connecting"]}
            paint={{
              "line-color": lime,
              "line-width": 1.5,
              "line-opacity": 0.65,
              "line-dasharray": [4, 3],
            }}
          />
        </Source>

        <Source
          id="rc-stops-source"
          type="geojson"
          data={filteredStopPointsGeoJson}
        >
          <Layer
            id="rc-stops"
            type="circle"
            paint={{
              "circle-radius": 5,
              "circle-color": navy,
              "circle-stroke-color": ink,
              "circle-stroke-width": 1.5,
            }}
          />
        </Source>

        <Source id="rc-origin-source" type="geojson" data={originGeoJson}>
          <Layer
            id="rc-origin"
            type="circle"
            paint={{
              "circle-radius": 8,
              "circle-color": lime,
              "circle-stroke-color": ink,
              "circle-stroke-width": 2,
            }}
          />
        </Source>

        <Source id="rc-dest-source" type="geojson" data={destinationGeoJson}>
          <Layer
            id="rc-dest"
            type="circle"
            paint={{
              "circle-radius": 8,
              "circle-color": navy,
              "circle-stroke-color": ink,
              "circle-stroke-width": 2,
            }}
          />
        </Source>

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
            <div className="font-mono text-[11px] text-ink leading-tight space-y-1 p-1">
              {popup.routeType === "direct" ? (
                <>
                  <p className="font-bold uppercase tracking-widest">
                    Bezpośrednie
                  </p>
                  <p className="text-ink-subtle">{popup.label}</p>
                </>
              ) : (
                <>
                  <p className="font-bold uppercase tracking-widest">
                    {popup.stopIcao}
                    {popup.stopIata ? ` / ${popup.stopIata}` : ""}
                  </p>
                  <p className="text-ink">Przez: {popup.label}</p>
                </>
              )}
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
