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
import type { Airport, AirlineWithDestinations } from "@/common/api/airports";

interface ConnectionsMapProps {
  origin: Airport;
  routes: AirlineWithDestinations[];
  activeAirline: string | null;
}

interface RouteLineProperties {
  airlineIcao: string;
  airlineName: string;
  destinationIcao: string;
  destinationName: string;
  destinationIata: string | null;
  cityName: string | null;
  countryName: string | null;
}

interface PopupState {
  longitude: number;
  latitude: number;
  destinationIcao: string;
  destinationIata: string | null;
  destinationName: string;
  cityName: string | null;
  countryName: string | null;
  airlineName: string;
}

function buildRoutesGeoJson(
  origin: Airport,
  routes: AirlineWithDestinations[],
): GeoJSON.FeatureCollection<GeoJSON.LineString, RouteLineProperties> {
  const features: GeoJSON.Feature<GeoJSON.LineString, RouteLineProperties>[] =
    [];

  for (const { airline, destinations } of routes) {
    for (const dest of destinations) {
      if (dest.latitude === 0 && dest.longitude === 0) continue;
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: greatCircleCoords(
            origin.longitude,
            origin.latitude,
            dest.longitude,
            dest.latitude,
          ),
        },
        properties: {
          airlineIcao: airline.icaoCode,
          airlineName: airline.name,
          destinationIcao: dest.icaoCode,
          destinationName: dest.name,
          destinationIata: dest.iataCode,
          cityName: dest.city?.name ?? null,
          countryName: dest.city?.countryName ?? null,
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

function buildDestinationsGeoJson(
  routes: AirlineWithDestinations[],
): GeoJSON.FeatureCollection {
  const seen = new Map<string, GeoJSON.Feature>();
  for (const { destinations } of routes) {
    for (const dest of destinations) {
      if (dest.latitude === 0 && dest.longitude === 0) continue;
      if (!seen.has(dest.icaoCode)) {
        seen.set(dest.icaoCode, {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [dest.longitude, dest.latitude],
          },
          properties: {
            icaoCode: dest.icaoCode,
            iataCode: dest.iataCode,
            name: dest.name,
            cityName: dest.city?.name ?? null,
            countryName: dest.city?.countryName ?? null,
          },
        });
      }
    }
  }
  return { type: "FeatureCollection", features: [...seen.values()] };
}

export function ConnectionsMap({
  origin,
  routes,
  activeAirline,
}: ConnectionsMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { lime, navy, ink } = useThemeColors();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [cursor, setCursor] = useState("");
  const [imagesLoaded, setImagesLoaded] = useState(false);

  const visibleRoutes = useMemo(
    () =>
      activeAirline
        ? routes.filter((r) => r.airline.icaoCode === activeAirline)
        : routes,
    [routes, activeAirline],
  );

  const routesGeoJson = useMemo(
    () => buildRoutesGeoJson(origin, visibleRoutes),
    [origin, visibleRoutes],
  );

  const destinationsGeoJson = useMemo(
    () => buildDestinationsGeoJson(visibleRoutes),
    [visibleRoutes],
  );

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
          properties: {
            icaoCode: origin.icaoCode,
            name: origin.name,
          },
        },
      ],
    }),
    [origin],
  );

  useRouteAnimation(mapRef, imagesLoaded ? routesGeoJson : EMPTY_GEOJSON);

  const handleLoad = useCallback((e: MapEvent) => {
    applyPolishLabels(e.target);
    loadTelemetryMapImages(e.target)
      .then(() => setImagesLoaded(true))
      .catch(() => {});
  }, []);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature || feature.layer?.id !== "routes-lines") {
      setPopup(null);
      return;
    }
    const p = feature.properties as RouteLineProperties;
    setPopup({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      destinationIcao: p.destinationIcao,
      destinationIata: p.destinationIata,
      destinationName: p.destinationName,
      cityName: p.cityName,
      countryName: p.countryName,
      airlineName: p.airlineName,
    });
  }, []);

  return (
    <div className="relative h-[600px] w-full border-2 border-ink overflow-hidden">
      <MapGL
        ref={mapRef}
        initialViewState={{
          longitude: origin.longitude,
          latitude: origin.latitude,
          zoom: 3,
        }}
        mapStyle={MAP_STYLE_URL}
        onLoad={handleLoad}
        interactiveLayerIds={["routes-lines"]}
        onClick={handleClick}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("")}
        cursor={cursor}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        <Source id="routes-source" type="geojson" data={routesGeoJson}>
          <Layer
            id="routes-lines"
            type="line"
            paint={{
              "line-color": lime,
              "line-width": 2,
              "line-opacity": 0.75,
            }}
          />
        </Source>

        <Source id="dest-source" type="geojson" data={destinationsGeoJson}>
          <Layer
            id="dest-points"
            type="circle"
            paint={{
              "circle-radius": 4,
              "circle-color": navy,
              "circle-stroke-color": ink,
              "circle-stroke-width": 1.5,
            }}
          />
        </Source>

        <Source id="origin-source" type="geojson" data={originGeoJson}>
          <Layer
            id="origin-point"
            type="circle"
            paint={{
              "circle-radius": 8,
              "circle-color": lime,
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
              <p className="font-bold uppercase tracking-widest">
                {popup.destinationIcao}
                {popup.destinationIata ? ` / ${popup.destinationIata}` : ""}
              </p>
              <p className="text-ink">{popup.destinationName}</p>
              {(popup.cityName || popup.countryName) && (
                <p className="text-ink-subtle">
                  {[popup.cityName, popup.countryName]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              <p className="text-ink-subtle">{popup.airlineName}</p>
            </div>
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
