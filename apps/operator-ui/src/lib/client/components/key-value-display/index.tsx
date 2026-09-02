// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

'use client';

import React from 'react';
import { NOT_APPLICABLE } from '@lib/utils/consts';

interface KeyValueDisplayProps {
  keyLabel: string | React.ReactNode;
  value: any;
  valueRender?: (value?: any) => React.ReactNode;
}

export const KeyValueDisplay = ({ keyLabel, value, valueRender }: KeyValueDisplayProps) => {
  return (
    <div className="flex flex-col gap-1">
      {/* Voltu field label: small mono uppercase caption above the value (marketing-site detail voice). */}
      <span className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {keyLabel}
      </span>
      {valueRender ? valueRender(value) : <span className="text-sm">{value ?? NOT_APPLICABLE}</span>}
    </div>
  );
};
