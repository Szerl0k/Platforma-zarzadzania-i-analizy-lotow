"use client";

import { Source, Layer } from "react-map-gl/maplibre";
import { EMPTY_GEOJSON } from "@/app/telemetry/_utils/telemetryMapHelpers";

interface MapLayersProps {
  routesGeoJson: GeoJSON.FeatureCollection;
  airportsGeoJson: GeoJSON.FeatureCollection;
  flightsGeoJson: GeoJSON.FeatureCollection;
  traveledPathGeoJson?: GeoJSON.FeatureCollection;
  remainingPathGeoJson?: GeoJSON.FeatureCollection;
}

/**
 * Encapsulates all Mapbox/Maplibre sources and layers for the Telemetry view.
 * Decouples map visualization configuration from main view logic.
 */
export function MapLayers({
  routesGeoJson,
  airportsGeoJson,
  flightsGeoJson,
  traveledPathGeoJson = EMPTY_GEOJSON,
  remainingPathGeoJson = EMPTY_GEOJSON,
}: MapLayersProps) {
  return (
    <>
      {/* Flight Path - Traveled Segment */}
      <Source id="flight-path-traveled" type="geojson" data={traveledPathGeoJson}>
        <Layer
          id="flight-path-traveled-line"
          type="line"
          paint={{
            "line-color": "#1E3A8A", // --navy
            "line-width": 4,
            "line-opacity": 0.8,
          }}
        />
      </Source>

      {/* Flight Path - Remaining Segment */}
      <Source id="flight-path-remaining" type="geojson" data={remainingPathGeoJson}>
        <Layer
          id="flight-path-remaining-line"
          type="line"
          paint={{
            "line-color": "#1E3A8A", // --navy
            "line-width": 4,
            "line-dasharray": [2, 1],
            "line-opacity": 0.6,
          }}
        />
      </Source>

      {/* Route lines */}
      <Source id="routes-source" type="geojson" data={routesGeoJson}>
        <Layer
          id="routes-lines"
          type="line"
          paint={{
            "line-color": "#BEF264", // --lime
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
      <Source id="flights-source" type="geojson" data={flightsGeoJson}>
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

      {/* Animated airplanes along routes */}
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
    </>
  );
}
