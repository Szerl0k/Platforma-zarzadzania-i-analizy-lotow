"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import {
  getPositionAlongPath,
  getBearingAlongPath,
} from "@/common/utils/geoUtils";

const ANIMATION_DURATION_MS = 14000;

export function useRouteAnimation(
  mapRef: RefObject<MapRef | null>,
  routesGeoJson: GeoJSON.FeatureCollection,
) {
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const allCoords = routesGeoJson.features
      .filter(
        (f): f is GeoJSON.Feature<GeoJSON.LineString> =>
          f.geometry.type === "LineString",
      )
      .map((f) => f.geometry.coordinates);

    const seen = new Set<string>();
    const routeCoords = allCoords.filter((coords) => {
      if (coords.length < 2) return false;
      const first = coords[0];
      const last = coords[coords.length - 1];
      const key = `${first[0].toFixed(3)},${first[1].toFixed(3)}->${last[0].toFixed(3)},${last[1].toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (routeCoords.length === 0) {
      const src = mapRef.current?.getMap()?.getSource("animated-planes") as
        | GeoJSONSource
        | undefined;
      src?.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const animate = () => {
      const src = mapRef.current?.getMap()?.getSource("animated-planes") as
        | GeoJSONSource
        | undefined;
      if (!src) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = Date.now();
      const features: GeoJSON.Feature<GeoJSON.Point>[] = routeCoords.map(
        (coords, i) => {
          const t =
            ((now % ANIMATION_DURATION_MS) / ANIMATION_DURATION_MS +
              i / routeCoords.length) %
            1;
          const pos = getPositionAlongPath(coords, t);
          const heading = getBearingAlongPath(coords, t);
          return {
            type: "Feature",
            geometry: { type: "Point", coordinates: pos },
            properties: { heading },
          };
        },
      );

      src.setData({ type: "FeatureCollection", features });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [mapRef, routesGeoJson]);
}
