'use client';

import { Map, NavigationControl } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import { APP_NAME } from '@/common/config';
import 'maplibre-gl/dist/maplibre-gl.css';

const osmStyle: StyleSpecification = {
    version: 8,
    sources: {
        osm: {
            type: 'raster',
            tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        },
    },
    layers: [
        {
            id: 'osm',
            type: 'raster',
            source: 'osm',
        },
    ],
};

export default function MapView() {
    return (
        <div className="relative h-[calc(100vh-3.5rem)] w-full border-t-2 border-ink">
            <Map
                initialViewState={{
                    longitude: 19.0,
                    latitude: 52.0,
                    zoom: 5,
                }}
                mapStyle={osmStyle}
                style={{ width: '100%', height: '100%' }}
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
