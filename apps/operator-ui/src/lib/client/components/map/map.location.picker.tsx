// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import config from '@lib/utils/config';
import { GeoPoint } from '@lib/utils/GeoPoint';
import type { LocationPickerMapProps } from '@lib/client/components/map/types';
import { getTileTokenAction } from '@lib/server/actions/map/getTileTokenAction';
import { buildVoltuStyle, cssVar, tileTransformRequest } from '@lib/utils/mapStyle';

// New-location coordinates / map center come from config (Mumbai by default), not a hardcoded US point.
export const defaultLatitude = config.defaultMapCenterLatitude;
export const defaultLongitude = config.defaultMapCenterLongitude;
const defaultZoom = 15;

const TOKEN_REFRESH_MS = 45 * 60 * 1000; // token TTL is 1h; refresh comfortably before it expires

/**
 * Pick a location on the Voltu self-hosted map. Click sets the point; the marker follows the `point` prop.
 */
export const MapLocationPicker: React.FC<LocationPickerMapProps> = ({
  point,
  zoom = defaultZoom,
  onLocationSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const tokenRef = useRef<string>('');
  const { resolvedTheme } = useTheme();
  const mode = resolvedTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    let refresh: ReturnType<typeof setInterval> | undefined;

    (async () => {
      const res = await getTileTokenAction();
      if (cancelled || !containerRef.current) return;
      tokenRef.current = res.success ? res.data : '';

      const center: [number, number] = point
        ? [point.longitude, point.latitude]
        : [config.defaultMapCenterLongitude, config.defaultMapCenterLatitude];

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: buildVoltuStyle(mode),
        center,
        zoom,
        transformRequest: tileTransformRequest(() => tokenRef.current),
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('click', (e) => onLocationSelect(new GeoPoint(e.lngLat.lat, e.lngLat.lng)));
      mapRef.current = map;

      if (point) {
        markerRef.current = new maplibregl.Marker({ color: cssVar('--primary', '#0E7C68') })
          .setLngLat(center)
          .addTo(map);
      }

      refresh = setInterval(async () => {
        const r = await getTileTokenAction();
        if (r.success) tokenRef.current = r.data;
      }, TOKEN_REFRESH_MS);
    })();

    return () => {
      cancelled = true;
      if (refresh) clearInterval(refresh);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker + camera in sync when the point changes (autocomplete fill / lat-lng edit).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (point) {
      const lngLat: [number, number] = [point.longitude, point.latitude];
      if (markerRef.current) markerRef.current.setLngLat(lngLat);
      else
        markerRef.current = new maplibregl.Marker({ color: cssVar('--primary', '#0E7C68') })
          .setLngLat(lngLat)
          .addTo(map);
      map.easeTo({ center: lngLat });
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [point]);

  // Re-skin when the operator toggles light/dark (transformRequest + markers survive setStyle).
  useEffect(() => {
    mapRef.current?.setStyle(buildVoltuStyle(mode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return <div ref={containerRef} className="size-full" />;
};
