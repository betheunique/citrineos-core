// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// Voltu self-hosted MapLibre style: Protomaps basemap layers over our own vector tiles, glyphs and sprite,
// all served by the authenticated tile Worker (infra/pmtiles/worker). No Google, no per-load billing. The tile
// token is injected per-request via transformRequest (below) so it can refresh without rebuilding the style.
import { layers, namedFlavor } from '@protomaps/basemaps';
import type { RequestParameters, StyleSpecification } from 'maplibre-gl';
import config from '@lib/utils/config';

const BASE = config.tilesBaseUrl;

// Our R2 glyph bucket only hosts the brand fonts (HankenGrotesk / SpaceGrotesk), NOT the Noto stacks the
// Protomaps style asks for by default — so we rewrite every label's text-font to the brand body font, else
// glyphs 404 and no labels render.
const BRAND_FONT = ['HankenGrotesk'];

export function buildVoltuStyle(mode: 'light' | 'dark'): StyleSpecification {
  const styleLayers = layers('protomaps', namedFlavor(mode), { lang: 'en' }) as Array<{
    type: string;
    layout?: Record<string, unknown>;
  }>;
  for (const layer of styleLayers) {
    if (layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout) {
      layer.layout['text-font'] = BRAND_FONT;
    }
  }
  return {
    version: 8,
    glyphs: `${BASE}/glyphs/{fontstack}/{range}.pbf`,
    sprite: `${BASE}/sprite/sprite`,
    sources: {
      protomaps: {
        type: 'vector',
        tiles: [`${BASE}/india/{z}/{x}/{y}.mvt`],
        minzoom: 0,
        maxzoom: 15,
        attribution: '© OpenStreetMap · Protomaps',
      },
    },
    layers: styleLayers,
  } as unknown as StyleSpecification;
}

// Appends the current tile token to every request that hits our tile Worker. getToken reads a ref so a
// mid-session token refresh takes effect without re-creating the map.
export function tileTransformRequest(getToken: () => string) {
  return (url: string): RequestParameters => {
    if (url.startsWith(BASE)) {
      const t = getToken();
      if (t) {
        const u = new URL(url);
        u.searchParams.set('k', t);
        return { url: u.toString() };
      }
    }
    return { url };
  };
}

// Resolve a CSS custom property to a concrete colour (MapLibre paint can't read CSS vars). SSR-safe.
export function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
