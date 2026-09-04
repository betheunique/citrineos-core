// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use server';

import { type ActionResult, authedAction } from '@lib/utils/action-guard';
import config from '@lib/utils/config';

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

// Voltu self-hosted geocoding (no Google, no per-request billing surprise): OpenRouteService (Pelias/OSM)
// autocomplete primary, Komoot Photon fuzzy fallback (free, no key), then a trimmed-query retry — so a
// misspelled or extra word never yields a misleading "nothing found". India-boxed for relevance + locality.
//
// Pelias/Photon return the FULL structured place (street/city/state/postal/coords) with each result, so there
// is no second "details" round-trip: we encode the resolved detail into place_id and getPlaceDetails decodes
// it. That keeps the client (address-autocomplete.tsx) and the PlacePrediction/PlaceDetails contract unchanged.
const ORS_AUTOCOMPLETE = 'https://api.openrouteservice.org/geocode/autocomplete';
const PHOTON = 'https://photon.komoot.io/api';
// India bounding box (minLon, minLat, maxLon, maxLat) — keeps Photon results in-country.
const IN_BBOX = { minLon: 68.0, minLat: 6.5, maxLon: 97.5, maxLat: 37.5 };
const ISO3_TO_ISO2: Record<string, string> = { IND: 'IN' };

export interface GeoDetail {
  description: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
}

type Feature = { properties: Record<string, string>; geometry: { coordinates: [number, number] } };

function encodeDetail(d: GeoDetail): string {
  return Buffer.from(JSON.stringify(d)).toString('base64url');
}

function fromOrs(f: Feature): GeoDetail {
  const p = f.properties;
  return {
    description: p.label || p.name || '',
    street: [p.housenumber, p.street].filter(Boolean).join(' ') || p.name || '',
    city: p.locality || p.localadmin || p.county || '',
    state: p.region || '',
    postalCode: p.postalcode || '',
    countryCode: ISO3_TO_ISO2[p.country_a] || '',
    countryName: p.country || '',
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  };
}

function photonLabel(p: Record<string, string>): string {
  const parts = [p.name, p.city, p.county, p.state].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(', ') : p.name || '';
}

function fromPhoton(f: Feature): GeoDetail {
  const p = f.properties;
  return {
    description: photonLabel(p),
    street: [p.housenumber, p.street].filter(Boolean).join(' ') || p.name || '',
    city: p.city || p.district || p.county || '',
    state: p.state || '',
    postalCode: p.postcode || '',
    countryCode: (p.countrycode || '').toUpperCase(),
    countryName: p.country || '',
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  };
}

async function orsAutocomplete(text: string, country: string, key: string): Promise<GeoDetail[] | null> {
  try {
    const url = `${ORS_AUTOCOMPLETE}?text=${encodeURIComponent(text)}&boundary.country=${country}&size=6`;
    const r = await fetch(url, { headers: { Authorization: key } });
    if (!r.ok) {
      console.error(`geocode: ORS ${r.status} — ${await r.text()}`);
      return null;
    }
    const j = await r.json();
    return (j.features ?? []).map(fromOrs);
  } catch (e) {
    console.error('geocode: ORS request failed', e);
    return null;
  }
}

async function photonSearch(text: string, country: string): Promise<GeoDetail[] | null> {
  try {
    const { minLon, minLat, maxLon, maxLat } = IN_BBOX;
    const bbox = country === 'IN' ? `&bbox=${minLon},${minLat},${maxLon},${maxLat}` : '';
    const url = `${PHOTON}?q=${encodeURIComponent(text)}&limit=6&lang=en${bbox}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Voltu/1.0 (+geocode)' } });
    if (!r.ok) {
      console.error(`geocode: Photon ${r.status}`);
      return null;
    }
    const j = await r.json();
    return (j.features ?? [])
      .filter((f: Feature) => (f.properties?.countrycode || '').toUpperCase() === country)
      .map(fromPhoton);
  } catch (e) {
    console.error('geocode: Photon request failed', e);
    return null;
  }
}

export async function autocompleteAddress(
  input: string,
  country?: string,
  _sessionToken?: string,
): Promise<ActionResult<PlacePrediction[]>> {
  return authedAction<PlacePrediction[]>(async (_session) => {
    const q = (input ?? '').trim();
    if (q.length < 3) return [];
    const cc = (country || 'IN').toUpperCase();
    const key = config.orsApiKey;

    // 1) ORS (cleanest labels) when configured → 2) Photon fuzzy fallback → 3) trimmed-query retry.
    let results: GeoDetail[] = key ? (await orsAutocomplete(q, cc, key)) ?? [] : [];
    if (results.length === 0) results = (await photonSearch(q, cc)) ?? [];
    let words = q.split(/\s+/);
    while (results.length === 0 && words.length > 1) {
      words = words.slice(0, -1);
      const trimmed = words.join(' ');
      results = key ? (await orsAutocomplete(trimmed, cc, key)) ?? [] : [];
      if (results.length === 0) results = (await photonSearch(trimmed, cc)) ?? [];
    }

    return results.map((d) => ({
      place_id: encodeDetail(d),
      description: d.description,
      structured_formatting: {
        main_text: d.street || d.description,
        secondary_text: [d.city, d.state].filter(Boolean).join(', '),
      },
    }));
  });
}
