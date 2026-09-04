// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use server';

import { authedAction, type ActionResult } from '@lib/utils/action-guard';
import config from '@lib/utils/config';

// Mints a short-lived HMAC tile token for the logged-in operator. The tile Worker verifies it with the SAME
// TILE_TOKEN_SECRET (see infra/pmtiles/worker), so map tiles/glyphs/sprite can't be fetched without going
// through Voltu auth. Token = `${expBase36}.${sigHex}`, sig = HMAC-SHA256(secret, `v1:${expBase36}`).
const TTL_SECONDS = 60 * 60; // 1h; the client refreshes before expiry

export async function getTileTokenAction(): Promise<ActionResult<string>> {
  return authedAction<string>(async (_session) => {
    const secret = config.tileTokenSecret;
    if (!secret) return ''; // enforcement off / unconfigured: Worker still serves while REQUIRE_TILE_TOKEN=0
    const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    const expB36 = exp.toString(36);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`v1:${expB36}`));
    const sigHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `${expB36}.${sigHex}`;
  });
}
