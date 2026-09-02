// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

// Voltu status badge, matching the mobile app's reliability/presence pills (packages/ui ReliabilityBadge):
// a tinted pill carrying a geometric status glyph plus a mono uppercase label, coloured by the state. Shape
// carries the meaning first (live = dot-in-ring, ghost = crossed square, verified = solid disc), colour
// reinforces it. Tones come from the theme tokens, so it reads correctly in light and dark.
import { cn } from '@lib/utils/cn';
import { VoltuIcon, type VoltuIconName } from '@lib/client/components/icons/voltu-icons';
import * as React from 'react';

export type VoltuStatus =
  | 'available'
  | 'active'
  | 'charging'
  | 'live'
  | 'suspended'
  | 'pending'
  | 'unavailable'
  | 'offline'
  | 'unknown'
  | 'faulted'
  | 'ghost';

// tone is a theme CSS variable; icon is a glyph from the Voltu set.
const STATUS: Record<VoltuStatus, { tone: string; icon: VoltuIconName; label: string }> = {
  available: { tone: 'var(--success)', icon: 'verified', label: 'Available' },
  active: { tone: 'var(--primary)', icon: 'live', label: 'Active' },
  charging: { tone: 'var(--primary)', icon: 'live', label: 'Charging' },
  live: { tone: 'var(--primary)', icon: 'live', label: 'Live' },
  suspended: { tone: 'var(--warning)', icon: 'likely', label: 'Suspended' },
  pending: { tone: 'var(--warning)', icon: 'doubtful', label: 'Pending' },
  unavailable: { tone: 'var(--muted-foreground)', icon: 'unknown', label: 'Unavailable' },
  offline: { tone: 'var(--muted-foreground)', icon: 'unknown', label: 'Offline' },
  unknown: { tone: 'var(--muted-foreground)', icon: 'unknown', label: 'Unknown' },
  faulted: { tone: 'var(--destructive)', icon: 'ghost', label: 'Faulted' },
  ghost: { tone: 'var(--destructive)', icon: 'ghost', label: 'Ghost' },
};

export interface StatusBadgeProps extends React.ComponentProps<'span'> {
  status: VoltuStatus;
  label?: string;
}

export function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  const s = STATUS[status];
  return (
    <span
      data-slot="status-badge"
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-sm border px-2 py-0.5 whitespace-nowrap',
        className,
      )}
      style={{
        color: s.tone,
        backgroundColor: `color-mix(in srgb, ${s.tone} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${s.tone} 32%, transparent)`,
      }}
      {...props}
    >
      <VoltuIcon name={s.icon} size={13} />
      <span className="font-mono text-[11px] font-semibold tracking-wider uppercase">
        {label ?? s.label}
      </span>
    </span>
  );
}
