// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

export const cardGridStyle =
  'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6';

export const cardHeaderFlex = 'flex items-center gap-4';

export const cardTabsStyle = 'mt-4';

// "View all" links on the overview cards: Voltu mono label voice, muted by default, verdigris on hover.
// (Was hover:text-secondary, a background token, which made the link nearly vanish on hover.)
export const overviewClickableStyle =
  'flex items-center gap-1 cursor-pointer font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary';
