'use client';

import {useCallback, useRef, useMemo, useState, useEffect} from 'react';
import { Map, NavigationControl, Source, Layer, MapEvent, Popup } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import type {
    MapLayerMouseEvent
} from 'maplibre-gl';
import { useTelemetry } from '@/common/hooks/useTelemetry';
import { useAirports } from '@/common/hooks/useAirports';
import 'maplibre-gl/dist/maplibre-gl.css';
import {FlightDetails} from "@/common/components/Map/FlightDetails";
import {AirportDetails} from "@/common/components/Map/AirportDetails";
import {MapOverlay} from "@/common/components/Map/TelemetryOverlay";
import {MAP_STYLE_URL, mapAirportsToGeoJson, mapFlightsToGeoJson, POLISH_TEXT_FIELD} from "@/app/telemetry/_utils/telemetryMapHelpers";

export default function TelemetryMapView() {
    const mapRef = useRef<MapRef>(null);
    const { flights, error, loading, setBounds: setFlightBounds } = useTelemetry(10000);
    const { airports, setBounds: setAirportBounds } = useAirports();

    const [selectedFlight, setSelectedFlight] = useState<GeoJSON.Feature<GeoJSON.Point> | null>(null);
    const [selectedAirport, setSelectedAirport] = useState<GeoJSON.Feature<GeoJSON.Point> | null>(null);
    const [cursor, setCursor] = useState<string>('');

    const geoJsonData = useMemo(() => mapFlightsToGeoJson(flights), [flights]);
    const airportsGeoJson = useMemo(() => mapAirportsToGeoJson(airports), [airports]);

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

            const bbox = {
                lomin: quantizeMin(b.getWest()),
                lamin: quantizeMin(b.getSouth()),
                lomax: quantizeMax(b.getEast()),
                lamax: quantizeMax(b.getNorth()),
            };
            setFlightBounds(bbox);
            setAirportBounds(bbox);

        }, 500) // 500ms debounce przed wykonaniem faktycznej aktualizacji stanu
    }, [setFlightBounds, setAirportBounds]);


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

        if (!map.hasImage('airport-icon')) {
            map.loadImage('/airport.png').then(r => {
                const src = r.data as HTMLImageElement;
                const canvas = document.createElement('canvas');
                canvas.width = src.width;
                canvas.height = src.height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(src, 0, 0);
                ctx.globalCompositeOperation = 'source-in';
                ctx.fillStyle = '#1E3A8A';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                map.addImage('airport-icon', ctx.getImageData(0, 0, canvas.width, canvas.height));
            });
        }
    }, [updateBoundingBox]);

    const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
        const feature = e.features?.[0];

        if (!feature) {
            setSelectedFlight(null);
            setSelectedAirport(null);
            return;
        }

        if (feature.layer?.id === 'airports-points') {
            setSelectedAirport(feature as GeoJSON.Feature<GeoJSON.Point>);
            setSelectedFlight(null);
        } else {
            setSelectedFlight(feature as GeoJSON.Feature<GeoJSON.Point>);
            setSelectedAirport(null);
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
                interactiveLayerIds={['flights-points', 'airports-points']}
                onClick={handleMapClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                cursor={cursor}
            >
                <NavigationControl position="bottom-right" showCompass={false} />

                <Source id="airports-source" type="geojson" data={airportsGeoJson}>
                    <Layer
                        id="airports-points"
                        type="symbol"
                        minzoom={5}
                        layout={{
                            'icon-image': 'airport-icon',
                            'icon-allow-overlap': true,
                            'icon-size': 0.015,
                        }}
                    />
                </Source>

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

                {selectedAirport && (
                    <Popup
                        longitude={selectedAirport.geometry.coordinates[0]}
                        latitude={selectedAirport.geometry.coordinates[1]}
                        anchor="bottom"
                        offset={15}
                        onClose={() => setSelectedAirport(null)}
                        closeOnClick={false}
                        className="custom-popup"
                    >
                        <AirportDetails properties={selectedAirport.properties as any} />
                    </Popup>
                )}

                {selectedFlight && (
                    <Popup
                        longitude={selectedFlight.geometry.coordinates[0]}
                        latitude={selectedFlight.geometry.coordinates[1]}
                        anchor="bottom"
                        offset={15}
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