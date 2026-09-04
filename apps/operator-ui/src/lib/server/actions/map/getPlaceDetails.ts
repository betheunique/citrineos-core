// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use server';

import { authedAction, type ActionResult } from '@lib/utils/action-guard';
import type { GeoDetail } from './autocompleteAddress';

export interface PlaceDetailsResponse {
  id: string;
  displayName: {
    text: string;
    languageCode: string;
  };
  formattedAddress: string;
  addressComponents: Array<{
    longText: string;
    shortText: string;
    types: string[];
    languageCode?: string;
  }>;
  location: {
    latitude: number;
    longitude: number;
  };
  plusCode?: {
    globalCode: string;
    compoundCode?: string;
  };
  types?: string[];
}

// place_id is a base64url-encoded GeoDetail minted by autocompleteAddress (ORS/Photon return the full place, so
// there is no upstream "details" endpoint to call). We decode it and re-shape it into the Google-style response
// the client parser (address-autocomplete.tsx) already reads by component `types`, so nothing downstream changes.
const ENCODED_REGEX = /^[A-Za-z0-9_-]{1,8000}$/;

function component(longText: string, types: string[], shortText?: string) {
  return { longText, shortText: shortText ?? longText, types };
}

export async function getPlaceDetails(
  placeId: string,
  _sessionToken?: string,
): Promise<ActionResult<PlaceDetailsResponse>> {
  return authedAction(async (_session) => {
    if (!placeId || !ENCODED_REGEX.test(placeId)) {
      throw new Error('Invalid place ID');
    }

    let d: GeoDetail;
    try {
      d = JSON.parse(Buffer.from(placeId, 'base64url').toString());
    } catch {
      throw new Error('Invalid place ID');
    }

    return {
      id: placeId,
      displayName: { text: d.description, languageCode: 'en' },
      formattedAddress: d.description,
      // Synthesize Google component `types` so the client's getComponent(...) lookups resolve unchanged.
      addressComponents: [
        component(d.street, ['route']),
        component(d.city, ['locality']),
        component(d.state, ['administrative_area_level_1']),
        component(d.postalCode, ['postal_code']),
        component(d.countryName, ['country'], d.countryCode),
      ].filter((c) => c.longText),
      location: { latitude: d.lat, longitude: d.lng },
    } satisfies PlaceDetailsResponse;
  });
}
