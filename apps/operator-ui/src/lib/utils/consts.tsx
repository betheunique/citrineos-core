// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { CrudFilter } from '@refinedev/core';
import { ResourceType } from '@lib/utils/access.types';

export const I18N_COOKIE_NAME = 'NEXT_LOCALE';
export const DEFAULT_LOCALE = 'en';

// English is live. The Indian languages are listed as "coming soon" (not yet translated) — the switcher shows
// them disabled so a user can see they're on the roadmap without falling back to English mid-use.
export const LOCALES: { value: string; label: string; comingSoon?: boolean }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)', comingSoon: true },
  { value: 'bn', label: 'বাংলা (Bengali)', comingSoon: true },
  { value: 'te', label: 'తెలుగు (Telugu)', comingSoon: true },
  { value: 'mr', label: 'मराठी (Marathi)', comingSoon: true },
  { value: 'ta', label: 'தமிழ் (Tamil)', comingSoon: true },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)', comingSoon: true },
  { value: 'ml', label: 'മലയാളം (Malayalam)', comingSoon: true },
];

export const NEW_IDENTIFIER = 'new';

export const EMPTY_FILTER: CrudFilter[] = [
  {
    operator: 'or',
    value: [],
  },
];

export const DEFAULT_SORTERS: any = {
  initial: [
    {
      field: 'updatedAt',
      order: 'desc',
    },
  ],
};

export const DEFAULT_EXPANDED_DATA_FILTER = (field: string, operator: string, value: any) => {
  return {
    permanent: [
      {
        field,
        operator,
        value,
      },
    ],
  };
};

export const NOT_APPLICABLE = 'N/A';
export const EMPTY_VALUE = '-';
export const DEFAULT_TABLE_STATE = 'table';
export const DETAIL_TAB_STATE = 'tab';

// S3 bucket folder name
export const S3_BUCKET_FOLDER_IMAGES_LOCATIONS = `images/${ResourceType.LOCATIONS}`;
export const S3_BUCKET_FOLDER_IMAGES_CHARGING_STATIONS = `images/${ResourceType.CHARGING_STATIONS}`;
export const S3_BUCKET_FILE_CORE_CONFIG = 'config.json';
export const S3_BUCKET_FILE_CONFIG = 'operator.config.json';
