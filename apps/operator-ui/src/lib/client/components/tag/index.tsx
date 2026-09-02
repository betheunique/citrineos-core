// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Badge } from '@lib/client/components/ui/badge';
import { cn } from '@lib/utils/cn';
import { DefaultColors } from '@lib/utils/enums';
import React from 'react';

const getColorForIndex = (index: number, customColors?: string[]) => {
  const colors = customColors && customColors.length ? customColors : Object.values(DefaultColors);
  return colors[index % colors.length];
};

const hashStringToColorIndex = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

// Voltu-leaning, theme-aware chip palette for arbitrary enum values (GenericTag hashes to these). Tinted
// pills that read on both cream and petrol; loud off-brand hues (purple/cyan/pink/magenta) are pulled toward
// the Voltu family (verdigris/teal, saffron/amber, gold, olive/lime, ghost/rose, petrol/indigo).
const colorClassMap: Record<string, string> = {
  cyan: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30',
  purple:
    'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
  blue: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  green:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  red: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  orange:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
  yellow:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  pink: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  magenta:
    'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  volcano:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
  gold: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30',
  lime: 'bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/30',
  geekblue:
    'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30',
  default:
    'bg-muted text-muted-foreground border-border',
};

interface GenericTagProps<T extends Record<string, string | number>> {
  enumValue?: T[keyof T];
  stringValue?: string;
  enumType?: T;
  colorMap?: { [key in keyof T]?: string };
  customColors?: string[];
  icon?: React.ReactNode;
}

const GenericTag = <T extends Record<string, string | number>>({
  enumValue,
  stringValue,
  enumType,
  colorMap = {},
  customColors,
  icon,
}: GenericTagProps<T>) => {
  let displayValue: string;
  let color: string;

  if (enumType && enumValue !== undefined) {
    const valueKey = Object.keys(enumType).find((key) => enumType[key] === enumValue) as keyof T;

    const enumKeys = Object.keys(enumType);
    const enumIndex = enumKeys.indexOf(valueKey as string);
    color = colorMap[valueKey] || getColorForIndex(enumIndex, customColors);
    displayValue = String(valueKey);
  } else if (stringValue) {
    const colorIndex = hashStringToColorIndex(stringValue);
    color = getColorForIndex(colorIndex, customColors);
    displayValue = stringValue;
  } else {
    return null;
  }

  const colorClass = colorClassMap[color] || colorClassMap.default;

  return (
    <Badge variant="outline" className={cn(colorClass)}>
      {displayValue}
      {icon && <span className="ml-1.5">{icon}</span>}
    </Badge>
  );
};

export default GenericTag;
