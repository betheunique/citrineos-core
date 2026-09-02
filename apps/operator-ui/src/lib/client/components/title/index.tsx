// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import config from '@lib/utils/config';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import React from 'react';

export interface LogoProps {
  collapsed?: boolean;
}

const LOGO_URL = config.logoUrl;

export const Logo: React.FC<LogoProps> = (props: LogoProps) => {
  const { collapsed = false } = props;
  const { theme } = useTheme();

  return (
    <div className="flex h-full w-full items-center justify-center">
      {collapsed ? (
        <motion.img
          key="mark"
          src={LOGO_URL}
          alt={`${config.appName} logo`}
          className="h-12 w-auto"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      ) : (
        <div className="relative h-16 w-4/5">
          <Image
            src={theme === 'light' ? '/logo-black.svg' : '/logo-white.svg'}
            alt={`${config.appName} logo`}
            fill
            style={{ objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
};
