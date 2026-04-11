'use client';

import { useCallback, useRef } from 'react';
import { Map, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type { ExpressionSpecification } from 'maplibre-gl';
import { APP_NAME } from '@/common/config';
import 'maplibre-gl/dist/maplibre-gl.css';

// OpenFreeMap Liberty: free, keyless vector tiles built on the OpenMapTiles
// schema. Unlike OSM raster tiles (where labels are baked into pixels), a
// vector style lets us override label text per layer at runtime.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// Force Polish labels everywhere; fall back to romanised name, then the
// regional default if no Polish name exists.
const POLISH_TEXT_FIELD: ExpressionSpecification = [
    'coalesce',
    ['get', 'name:pl'],
    ['get', 'name:latin'],
    ['get', 'name'],
];

export default function MapView() {
    const mapRef = useRef<MapRef>(null);

    const forcePolishLabels = useCallback(() => {
        const map = mapRef.current?.getMap();
        if (!map) return;

        const layers = map.getStyle().layers ?? [];
        for (const layer of layers) {
            if (layer.type !== 'symbol') continue;
            // Only touch layers that actually render text.
            const current = map.getLayoutProperty(layer.id, 'text-field');
            if (current == null) continue;
            map.setLayoutProperty(layer.id, 'text-field', POLISH_TEXT_FIELD);
        }
    }, []);

    return (
        <div className="relative h-[calc(100vh-3.5rem)] w-full border-t-2 border-ink">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: 19.0,
                    latitude: 52.0,
                    zoom: 5,
                }}
                mapStyle={MAP_STYLE_URL}
                style={{ width: '100%', height: '100%' }}
                onLoad={forcePolishLabels}
            >
                <NavigationControl position="bottom-right" showCompass={false} />
            </Map>

            <div className="absolute top-4 left-4 z-10 border-2 border-ink bg-surface px-3 py-2 shadow-brut pointer-events-none">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                    {APP_NAME}
                </p>
                <p className="font-mono text-xs uppercase tracking-widest text-ink font-bold">
                    Mapa na zywo
                </p>
            </div>
        </div>
    );
}
