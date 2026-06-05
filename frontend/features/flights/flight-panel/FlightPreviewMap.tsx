"use client";

import { useEffect, useMemo, useRef } from "react";
import { Map, Source, Layer, MapRef } from "react-map-gl/maplibre";
import { Spinner } from "@/common/components";
import { useFlightPath } from "@/common/hooks/useFlights";
import { useThemeColors } from "@/common/hooks/UseThemeColors";
import { LocateFlightResponseDTO } from "@/common/api/telemetry";
import "maplibre-gl/dist/maplibre-gl.css";
import { geometryToFeatureCollection } from "./flightMetrics";

interface FlightPreviewMapProps {
  flightId: string;
  isLive: boolean;
  telemetry: LocateFlightResponseDTO | null;
}

/**
 * Small read-only map preview of a single flight's path (traveled + remaining)
 * with an optional live position dot. Fetches its own path and auto-fits bounds.
 */
export function FlightPreviewMap({
  flightId,
  isLive,
  telemetry,
}: FlightPreviewMapProps) {
  const { pathData, isLoading } = useFlightPath(flightId);
  const { navy, lime, ink } = useThemeColors();
  const mapRef = useRef<MapRef>(null);

  const traveledPathGeoJson = useMemo(
    () => geometryToFeatureCollection(pathData?.traveled as GeoJSON.Geometry),
    [pathData],
  );
  const remainingPathGeoJson = useMemo(
    () => geometryToFeatureCollection(pathData?.remaining as GeoJSON.Geometry),
    [pathData],
  );
  const positionGeoJson = useMemo(
    () =>
      geometryToFeatureCollection(
        telemetry?.location as GeoJSON.Geometry | undefined,
      ),
    [telemetry],
  );

  useEffect(() => {
    if (!mapRef.current || !pathData) return;

    const coords: number[][] = [];
    const traveled = pathData.traveled as { coordinates?: number[][] } | null;
    const remaining = pathData.remaining as { coordinates?: number[][] } | null;
    if (Array.isArray(traveled?.coordinates))
      coords.push(...traveled.coordinates);
    if (Array.isArray(remaining?.coordinates))
      coords.push(...remaining.coordinates);

    if (coords.length > 0) {
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      mapRef.current.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 20, duration: 1000 },
      );
    }
  }, [pathData]);

  if (isLoading) {
    return (
      <div className="h-32 w-full bg-ink/5 flex items-center justify-center border-y-2 border-ink">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="h-80 w-full border-y-2 border-ink relative overflow-hidden bg-ink/5">
      <Map
        ref={mapRef}
        mapStyle="https://tiles.openfreemap.org/styles/positron"
        initialViewState={{ longitude: 19.0, latitude: 52.0, zoom: 3 }}
        attributionControl={false}
      >
        {traveledPathGeoJson && (
          <Source id="traveled" type="geojson" data={traveledPathGeoJson}>
            <Layer
              id="traveled-line"
              type="line"
              paint={{ "line-color": navy, "line-width": 3 }}
            />
          </Source>
        )}
        {remainingPathGeoJson && (
          <Source id="remaining" type="geojson" data={remainingPathGeoJson}>
            <Layer
              id="remaining-line"
              type="line"
              paint={{
                "line-color": navy,
                "line-width": 3,
                "line-dasharray": [2, 1],
              }}
            />
          </Source>
        )}
        {isLive && positionGeoJson && (
          <Source id="position" type="geojson" data={positionGeoJson}>
            <Layer
              id="position-point"
              type="circle"
              paint={{
                "circle-radius": 5,
                "circle-color": lime,
                "circle-stroke-color": ink,
                "circle-stroke-width": 2,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
