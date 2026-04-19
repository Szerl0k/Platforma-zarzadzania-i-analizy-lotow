'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import type { GeoJSONSource } from 'maplibre-gl';
import { getPositionAlongPath, getBearingAlongPath } from '@/app/telemetry/_utils/telemetryMapHelpers';

const ANIMATION_DURATION_MS = 14000;

export function useRouteAnimation(
    mapRef: RefObject<MapRef | null>,
    routesGeoJson: GeoJSON.FeatureCollection,
) {
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const routeCoords = routesGeoJson.features
            .filter((f): f is GeoJSON.Feature<GeoJSON.LineString> => f.geometry.type === 'LineString')
            .map((f) => f.geometry.coordinates);

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        if (routeCoords.length === 0) {
            const src = mapRef.current?.getMap()?.getSource('animated-planes') as GeoJSONSource | undefined;
            src?.setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        const animate = () => {
            const src = mapRef.current?.getMap()?.getSource('animated-planes') as GeoJSONSource | undefined;
            if (!src) {
                animationRef.current = requestAnimationFrame(animate);
                return;
            }

            const now = Date.now();
            const features: GeoJSON.Feature<GeoJSON.Point>[] = routeCoords.map((coords, i) => {
                const t = ((now % ANIMATION_DURATION_MS) / ANIMATION_DURATION_MS + i / routeCoords.length) % 1;
                const pos = getPositionAlongPath(coords, t);
                const heading = getBearingAlongPath(coords, t);
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: pos },
                    properties: { heading },
                };
            });

            src.setData({ type: 'FeatureCollection', features });
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
