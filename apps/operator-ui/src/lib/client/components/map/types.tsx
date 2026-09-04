// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import type { GeoPoint } from '@lib/utils/GeoPoint';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationPickerMapProps {
  point?: GeoPoint;
  defaultCenter?: LatLng;
  zoom?: number;
  onLocationSelect: (point: GeoPoint) => void;
}
