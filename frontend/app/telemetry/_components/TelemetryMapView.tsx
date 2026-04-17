'use client';

import {useCallback, useRef, useMemo, useState, useEffect} from 'react';
import { Map, NavigationControl, Source, Layer, MapEvent, Popup } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type {
    MapLayerMouseEvent
} from 'maplibre-gl';
import { useTelemetry } from '@/common/hooks/useTelemetry';
import 'maplibre-gl/dist/maplibre-gl.css';
import {FlightDetails} from "@/common/components/Map/FlightDetails";
import {MapOverlay} from "@/common/components/Map/TelemetryOverlay";
import {MAP_STYLE_URL, mapFlightsToGeoJson, POLISH_TEXT_FIELD} from "@/app/telemetry/_utils/telemetryMapHelpers";

export default function TelemetryMapView() {
    const mapRef = useRef<MapRef>(null);
    const { flights, error, loading, setBounds } = useTelemetry(10000);

    const [selectedFlight, setSelectedFlight] = useState<GeoJSON.Feature<GeoJSON.Point> | null>(null);
    const [cursor, setCursor] = useState<string>('');

    const geoJsonData = useMemo(() => mapFlightsToGeoJson(flights), [flights]);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updateBoundingBox = useCallback(() => {

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {

            const map = mapRef.current?.getMap();
            if (!map) return;
            const b = map.getBounds();

            // Kwantyzacja siatki do 2 stopni geograficznych.
            // Zapobiega fragmentacji cache'u na backendzie podczas operacji zoom i mikro-przesunięć.
            const GRID_SIZE = 2.0;
            const quantizeMin = (val: number) => Math.floor(val / GRID_SIZE) * GRID_SIZE;
            const quantizeMax = (val: number) => Math.ceil(val / GRID_SIZE) * GRID_SIZE;

            setBounds({
                lomin: quantizeMin(b.getWest()),
                lamin: quantizeMin(b.getSouth()),
                lomax: quantizeMax(b.getEast()),
                lamax: quantizeMax(b.getNorth()),
            });

        }, 500) // 500ms debounce przed wykonaniem faktycznej aktualizacji stanu
    }, [setBounds]);


    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);


    const handleMapLoad = useCallback((e: MapEvent) => {

        const map = e.target;

        // Force polish labels
        const layers = map.getStyle().layers ?? [];
        for (const layer of layers) {
            if (layer.type !== 'symbol') continue;
            const current = map.getLayoutProperty(layer.id, 'text-field');
            if (current == null) continue;
            map.setLayoutProperty(layer.id, 'text-field', POLISH_TEXT_FIELD);
        }
        updateBoundingBox();

        // Load airplane icon
        if (!map.hasImage('airplane-icon')) {
            map.loadImage('/airplane.png')
                .then((response) => {
                    map.addImage('airplane-icon', response.data);
                })
                .catch((error) => {
                    console.error('Error loading icon: ', error);
                })
        }
    }, [updateBoundingBox]);

    const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
        // All objects that we've clicked
        const feature = e.features?.[0];

        if (feature) {
            setSelectedFlight(feature as GeoJSON.Feature<GeoJSON.Point>);
        } else {
            setSelectedFlight(null);
        }

    }, []);

    const onMouseEnter = useCallback(() => setCursor('pointer'), []);
    const onMouseLeave = useCallback(() => setCursor(''), []);

    return (
        <div className="relative h-[calc(100vh-3.5rem)] w-full border-t-2 border-ink bg-[var(--color-bg)]">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: 19.0,
                    latitude: 52.0,
                    zoom: 5,
                }}
                mapStyle={MAP_STYLE_URL}
                style={{ width: '100%', height: '100%' }}
                onLoad={handleMapLoad}
                onMoveEnd={updateBoundingBox}

                // Mouse clicking interaction
                interactiveLayerIds={['flights-points']}
                onClick={handleMapClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                cursor={cursor}
            >
                <NavigationControl position="bottom-right" showCompass={false} />

                <Source id="flights-source" type="geojson" data={geoJsonData}>
                    <Layer
                        id="flights-points"
                        type="symbol"
                        layout={{
                            'icon-image': 'airplane-icon',

                            'icon-rotate': ['get', 'heading'],

                            'icon-rotation-alignment': 'map',

                            'icon-allow-overlap': true,

                            'icon-size': 0.5
                        }}
                    />
                </Source>

                {selectedFlight && (
                    <Popup
                        longitude={selectedFlight.geometry.coordinates[0]}
                        latitude={selectedFlight.geometry.coordinates[1]}
                        anchor="bottom"
                        offset={15} // Odsunięcie od środka ikony, by jej nie zasłaniać
                        onClose={() => setSelectedFlight(null)}
                        closeOnClick={false}
                        className="custom-popup"
                    >
                        <FlightDetails properties={selectedFlight.properties as any} />
                    </Popup>
                )}

            </Map>
            <MapOverlay
                flightsCount={flights.length}
                loading={loading} 
                error={error}/>
        </div>
    );
}