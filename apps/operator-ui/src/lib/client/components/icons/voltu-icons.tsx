// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// Voltu "Clock" icon set, ported to web SVG from the mobile app (packages/ui/clock-icons.tsx). Built from the
// same two shapes as the logo: a vertical spine and a solid block, on a 24x24 grid with a 2px stroke, butt
// caps, miter joins and zero corner radius. Inactive is stroke, active (`_on`) is fill. Everything is drawn
// in `currentColor`, so an icon inherits the surrounding text colour (Tailwind text-* classes work directly).
// This is the crisp, geometric family that makes the UI read as Voltu instead of generic rounded icons.
import * as React from 'react';

type Prim =
  | { k: 'sp'; d: string; dash?: [number, number] } // stroke path
  | { k: 'fp'; d: string } // fill path
  | { k: 'sr'; x: number; y: number; w: number; h: number } // stroke rect
  | { k: 'fr'; x: number; y: number; w: number; h: number } // fill rect
  | { k: 'sc'; cx: number; cy: number; r: number; dash?: [number, number] } // stroke circle
  | { k: 'fc'; cx: number; cy: number; r: number } // fill circle
  | { k: 'ln'; x1: number; y1: number; x2: number; y2: number };

const sp = (d: string, dash?: [number, number]): Prim => ({ k: 'sp', d, dash });
const fp = (d: string): Prim => ({ k: 'fp', d });
const sr = (x: number, y: number, w: number, h: number): Prim => ({ k: 'sr', x, y, w, h });
const fr = (x: number, y: number, w: number, h: number): Prim => ({ k: 'fr', x, y, w, h });
const sc = (cx: number, cy: number, r: number, dash?: [number, number]): Prim => ({
  k: 'sc',
  cx,
  cy,
  r,
  dash,
});
const fc = (cx: number, cy: number, r: number): Prim => ({ k: 'fc', cx, cy, r });

const ICONS = {
  // ── Nav / board ──
  today: [fr(4, 3, 2, 18), sr(9, 9, 11, 6), sp('M9 5.5h6M9 18.5h6')],
  today_on: [fr(4, 3, 2, 18), fr(9, 9, 11, 6), fr(9, 4.6, 6, 1.8), fr(9, 17.6, 6, 1.8)],
  nearby: [sc(12, 9, 5.5), sp('M12 14.5V21')],
  car: [sr(4, 6, 14, 12), sr(19, 9.5, 2, 5), fr(6.5, 8.5, 9, 7)],
  layers: [sp('M12 3 3 8l9 5 9-5-9-5z'), sp('M3 14l9 5 9-5')],
  queue: [fr(3, 5, 18, 3), fr(3, 10.5, 13, 3), fr(3, 16, 8, 3)],
  ledger: [fr(4, 3, 2, 18), fr(9, 5, 11, 3), fr(9, 10.5, 7, 3), fr(9, 16, 12, 3)],
  // ── System ──
  back: [sp('M15 4 7 12l8 8')],
  forward: [sp('M9 4l8 8-8 8')],
  chev: [sp('M9.5 5.5 16 12l-6.5 6.5')],
  chev_left: [sp('M14.5 5.5 8 12l6.5 6.5')],
  chev_down: [sp('M5.5 9.5 12 16l6.5-6.5')],
  close: [sp('M5 5l14 14M19 5L5 19')],
  plus: [sp('M12 4v16M4 12h16')],
  check: [sp('M4 12.5 9.5 18 20 6')],
  search: [sc(10.5, 10.5, 6), sp('M15 15l5.5 5.5')],
  more: [fr(3, 10.5, 3, 3), fr(10.5, 10.5, 3, 3), fr(18, 10.5, 3, 3)],
  filter: [sp('M3 6h18M6 12h12M10 18h4')],
  edit: [sp('M4 20h4L20 8l-4-4L4 16z')],
  share: [sp('M12 3v12M7.5 7.5 12 3l4.5 4.5'), sp('M4 13v8h16v-8')],
  download: [sp('M12 3v12M7.5 10.5 12 15l4.5-4.5'), sp('M4 18v3h16v-3')],
  trash: [sp('M4 6h16'), sp('M6.5 6V3h11v3'), sp('M6 6l1 15h10l1-15'), sp('M10.5 10v7M13.5 10v7')],
  signout: [sp('M14 3H4v18h10'), sp('M11 12h10M17 8l4 4-4 4')],
  help: [sc(12, 12, 8.5), sp('M9.6 9.3a2.4 2.4 0 1 1 3.1 2.3c-.7.3-1.1.8-1.1 1.6v.5'), fc(12, 16.5, 1.1)],
  // ── Confidence / status (shape first; colour reinforces, never the only carrier) ──
  verified: [fc(12, 12, 8)],
  likely: [sc(12, 12, 8), fp('M12 4a8 8 0 0 1 0 16z')],
  doubtful: [sc(12, 12, 8, [3, 2.6])],
  ghost: [sr(4, 4, 16, 16), sp('M7 7l10 10M17 7 7 17')],
  unknown: [sc(12, 12, 8, [1, 3.2])],
  live: [fc(12, 12, 3.5), sc(12, 12, 8)],
  // ── Charging + road ──
  bolt: [fp('M14 3 7 13h4.2L10 21l7-10h-4.5L14 3z')],
  plug: [sr(6, 8, 12, 9), sp('M9 8V4M15 8V4'), sp('M12 17v4')],
  swap: [sr(3.5, 3.5, 17, 17), sp('M7.5 10h9l-3-3M16.5 14h-9l3 3')],
  pack: [sr(4, 6, 14, 12), sr(19, 9.5, 2, 5), fr(6.5, 8.5, 9, 7)],
  clock: [sc(12, 12, 8.5), sp('M12 6.5V12l4 2.5')],
  route: [sp('M6 21V9a3 3 0 0 1 3-3h6a3 3 0 0 0 3-3'), fr(4.5, 19.5, 3, 3), fr(16.5, 1.5, 3, 3)],
  navigate: [sp('M21 3 3 11l8 2 2 8 8-18z')],
  locate: [
    sc(12, 12, 5.5),
    fr(10.8, 10.8, 2.4, 2.4),
    sp('M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4'),
  ],
  destination: [fr(4, 2, 2.4, 20), fp('M6.4 4h13l-3 4 3 4h-13z')],
  // ── Settings / entities ──
  bell: [sp('M6 18V11a6 6 0 0 1 12 0v7'), sp('M3 18h18'), sp('M10 21h4')],
  external: [sr(3, 3, 13, 13), sp('M8 21h13V8')],
  lock: [sr(4, 10, 16, 11), sp('M8 10V7a4 4 0 0 1 8 0v3')],
  shield: [
    sp('M12 2.5 4 6v6.5c0 5 3.4 8 8 9.5 4.6-1.5 8-4.5 8-9.5V6l-8-3.5z'),
    sp('M8.5 12.5 11 15l4.5-5'),
  ],
  card: [sr(2.5, 5, 19, 14), fr(2.5, 8.5, 19, 3), fr(6, 14, 6, 2)],
  globe: [sc(12, 12, 8.5), sp('M3.5 12h17'), sp('M12 3.5c4 4.5 4 12.5 0 17-4-4.5-4-12.5 0-17z')],
  doc: [sp('M5 2.5h9l5 5V21.5H5z'), sp('M14 2.5v5.5h5'), sp('M8.5 12.5h7M8.5 16h7')],
  user: [sc(12, 7.5, 3.8), sp('M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7')],
  users: [sc(9, 8, 3.2), sp('M2.5 21c0-3.8 2.9-6 6.5-6s6.5 2.2 6.5 6'), sp('M16 5.2a3.2 3.2 0 0 1 0 6.1M17 15c2.8.4 4.5 2.4 4.5 6')],
} as const;

export type VoltuIconName = keyof typeof ICONS;

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'butt' as const,
  strokeLinejoin: 'miter' as const,
};

function renderPrim(p: Prim, i: number) {
  const key = String(i);
  switch (p.k) {
    case 'sp':
      return (
        <path key={key} d={p.d} {...STROKE} strokeDasharray={p.dash ? p.dash.join(' ') : undefined} />
      );
    case 'fp':
      return <path key={key} d={p.d} fill="currentColor" />;
    case 'sr':
      return (
        <rect
          key={key}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="miter"
        />
      );
    case 'fr':
      return <rect key={key} x={p.x} y={p.y} width={p.w} height={p.h} fill="currentColor" />;
    case 'sc':
      return (
        <circle
          key={key}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray={p.dash ? p.dash.join(' ') : undefined}
        />
      );
    case 'fc':
      return <circle key={key} cx={p.cx} cy={p.cy} r={p.r} fill="currentColor" />;
    case 'ln':
      return (
        <line
          key={key}
          x1={p.x1}
          y1={p.y1}
          x2={p.x2}
          y2={p.y2}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="butt"
        />
      );
  }
}

export interface VoltuIconProps extends React.SVGProps<SVGSVGElement> {
  name: VoltuIconName;
  size?: number;
}

// `className` (e.g. Tailwind `size-6`, `text-primary`) wins over the numeric size/color via CSS.
export function VoltuIcon({ name, size = 22, className, ...props }: VoltuIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      {(ICONS[name] as readonly Prim[]).map(renderPrim)}
    </svg>
  );
}
