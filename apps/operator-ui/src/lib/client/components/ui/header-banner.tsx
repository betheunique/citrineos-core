// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import config from '@lib/utils/config';

const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function renderMessage(text: string): React.ReactNode {
  return text.split('\n').map((line, lineIdx, lines) => {
    const parts = line.split(EMAIL_RE);
    return (
      <React.Fragment key={lineIdx}>
        {parts.map((part, i) =>
          EMAIL_RE.test(part) ? (
            <a
              key={i}
              href={`mailto:${part}`}
              className="underline hover:text-primary"
            >
              {part}
            </a>
          ) : (
            part
          ),
        )}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export const HeaderBanner: React.FC = () => (
  <>
    {config.bannerMessage && (
      <div className="relative isolate flex items-center gap-x-6 overflow-hidden border-b border-border bg-secondary px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-[max(-7rem,calc(50%-52rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        >
          <div className="aspect-577/310 w-144.25 bg-linear-to-r from-[#0E7C68] to-[#2BAA8E] opacity-25 dark:opacity-30"></div>
        </div>
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-[max(45rem,calc(50%+8rem))] -z-10 -translate-y-1/2 transform-gpu blur-2xl"
        >
          <div className="aspect-577/310 w-144.25 bg-linear-to-r from-[#0E7C68] to-[#2BAA8E] opacity-25 dark:opacity-30"></div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm/6 text-foreground">
            <strong className="font-semibold">{renderMessage(config.bannerMessage)}</strong>
          </p>
        </div>
        <div className="flex flex-1 justify-end" />
      </div>
    )}
  </>
);
