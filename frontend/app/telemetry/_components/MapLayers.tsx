"use client";

import { Source, Layer } from "react-map-gl/maplibre";
import { EMPTY_GEOJSON } from "@/app/telemetry/_utils/telemetryMapHelpers";
import { useThemeColors } from "@/common/hooks/UseThemeColors";

interface MapLayersProps {
  routesGeoJson: GeoJSON.FeatureCollection;
  airportsGeoJson: GeoJSON.FeatureCollection;
  flightsGeoJson: GeoJSON.FeatureCollection;
  traveledPathGeoJson?: GeoJSON.FeatureCollection;
  remainingPathGeoJson?: GeoJSON.FeatureCollection;
  activeBBoxGeoJson?: GeoJSON.FeatureCollection;
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
  activeBBoxGeoJson = EMPTY_GEOJSON,
}: MapLayersProps) {
  const { navy, lime, ink, navyHover } = useThemeColors();

  return (
    <>
      {/* Active Bounding Box Outline */}
      <Source id="bbox-source" type="geojson" data={activeBBoxGeoJson}>
        <Layer
          id="bbox-outline"
          type="line"
          paint={{
            "line-color": navy, // --navy
            "line-width": 1,
            "line-dasharray": [4, 4],
            "line-opacity": 0.3,
          }}
        />
        <Layer
          id="bbox-fill"
          type="fill"
          paint={{
            "fill-color": navy,
            "fill-opacity": 0.02,
          }}
        />
      </Source>

      {/* Flight Path - Traveled Segment */}
      <Source
        id="flight-path-traveled"
        type="geojson"
        data={traveledPathGeoJson}
      >
        <Layer
          id="flight-path-traveled-line"
          type="line"
          paint={{
            "line-color": navy, // --navy
            "line-width": 4,
            "line-opacity": 0.8,
          }}
        />
      </Source>

      {/* Flight Path - Remaining Segment */}
      <Source
        id="flight-path-remaining"
        type="geojson"
        data={remainingPathGeoJson}
      >
        <Layer
          id="flight-path-remaining-line"
          type="line"
          paint={{
            "line-color": navy, // --navy
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
            "line-color": ["coalesce", ["get", "color"], lime],
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
            "icon-image": "airplane-icon-sdf",
            "icon-rotate": ["get", "heading"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-size": [
              "interpolate",
              ["linear"],
              [
                "ln",
                ["+", ["max", ["coalesce", ["get", "altitude"], 0], 0], 1],
              ],
              0,
              0.5,
              9.3927, // ln(12000 + 1)
              0.62,
            ],
          }}
          paint={{
            "icon-color": [
              "case",
              ["==", ["get", "tracked"], true],
              navyHover,
              [
                "interpolate",
                ["linear"],
                ["max", ["coalesce", ["get", "altitude"], 0], 0],
                0,
                lime,
                12000,
                navy,
              ],
            ],
            "icon-halo-color": [
              "case",
              ["==", ["get", "tracked"], true],
              lime,
              ink,
            ],
            "icon-halo-width": [
              "case",
              ["==", ["get", "tracked"], true],
              4,
              2,
            ],
            "icon-halo-blur": 0,
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
