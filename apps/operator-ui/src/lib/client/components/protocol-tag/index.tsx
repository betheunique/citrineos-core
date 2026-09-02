// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { OCPPVersion } from '@citrineos/types';
import { Badge } from '@lib/client/components/ui/badge';
import { cn } from '@lib/utils/cn';
import { useTranslate } from '@refinedev/core';

const ProtocolTag = ({ protocol }: { protocol: string | null | undefined }) => {
  const translate = useTranslate();
  let colorClass: string;
  let protocolName: string;

  switch (protocol) {
    case OCPPVersion.OCPP1_6:
      colorClass =
        'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30';
      protocolName = 'OCPP 1.6';
      break;
    case OCPPVersion.OCPP2_0_1:
      colorClass =
        'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30';
      protocolName = 'OCPP 2.0.1';
      break;
    case OCPPVersion.OCPP2_1:
      colorClass =
        'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30';
      protocolName = 'OCPP 2.1';
      break;
    default:
      colorClass = 'bg-muted text-muted-foreground border-border';
      protocolName = translate('Common.unknown');
      break;
  }

  return (
    <Badge variant="outline" className={cn('font-mono', colorClass)}>
      {protocolName}
    </Badge>
  );
};

export default ProtocolTag;
