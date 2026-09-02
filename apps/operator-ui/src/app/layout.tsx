// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { Providers } from '@lib/providers';
import config from '@lib/utils/config';
import { type Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Instrument_Sans, Bricolage_Grotesque, Martian_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import React from 'react';
import './globals.css';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

// Voltu brand fonts: Instrument Sans (body), Bricolage Grotesque (display headings), Martian Mono (codes and
// numbers). The CSS variables here are what globals.css reads for --font-sans / --font-mono / headings.
const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument',
  display: 'swap',
});
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
});
const martian = Martian_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-martian',
  display: 'swap',
});

export const metadata: Metadata = {
  title: config.appName,
  icons: {
    icon: '/voltu-favicon.png',
  },
};

const fallbackLocale = 'en';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme');
  const mode = theme?.value === 'dark' ? 'dark' : 'light';

  const locale = await getLocale();
  const messages = await getMessages();
  const fallbackMessages = await getMessages({ locale: fallbackLocale });

  return (
    <html
      lang={locale}
      className={`${instrument.variable} ${bricolage.variable} ${martian.variable}`}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={{ ...fallbackMessages, ...messages }}>
          <NuqsAdapter>
            <Providers defaultMode={mode}>{children}</Providers>
          </NuqsAdapter>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
