// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Button } from '@lib/client/components/ui/button';
import { cn } from '@lib/utils/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@lib/client/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@lib/client/components/ui/tooltip';
import { sidebarIconSize } from '@lib/client/styles/icon';
import { setUserLocale } from '@lib/server/hooks/getUserLocale';
import { LOCALES } from '@lib/utils/consts';
import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export const LocaleSwitcher = ({ expanded }: { expanded: boolean }) => {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('menu');
  const [, startTransition] = useTransition();

  const currentLabel = LOCALES.find((l) => l.value === locale)?.label ?? locale;

  const onSelectLocale = (nextLocale: string) => {
    if (nextLocale === locale) return;
    if (LOCALES.find((l) => l.value === nextLocale)?.comingSoon) return; // not translated yet
    startTransition(async () => {
      await setUserLocale(nextLocale);
      router.refresh();
    });
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                size={expanded ? 'default' : 'icon'}
                variant="ghost"
                aria-label={t('language')}
                className={cn(expanded && 'w-full justify-start')}
              >
                <Languages className={sidebarIconSize} />
                {expanded && <span>{currentLabel}</span>}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent align="start" side="right">
            <DropdownMenuRadioGroup value={locale} onValueChange={onSelectLocale}>
              {LOCALES.map((l) => (
                <DropdownMenuRadioItem
                  key={l.value}
                  value={l.value}
                  disabled={l.comingSoon}
                  className={cn(l.comingSoon && 'flex justify-between gap-4')}
                >
                  <span>{l.label}</span>
                  {l.comingSoon && (
                    <span className="text-xs text-muted-foreground">{t('comingSoon')}</span>
                  )}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent side="right">{t('language')}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
