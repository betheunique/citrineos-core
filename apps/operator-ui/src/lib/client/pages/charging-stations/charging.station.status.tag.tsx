// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { StatusBadge, type VoltuStatus } from '@lib/client/components/ui/status-badge';
import {
  ChargingStationStatus,
  getChargingStationStatus,
  type ChargingStationStatusCountsDto,
} from '@lib/cls/charging.station.dto';

// Map the OCPP-derived charger status onto the Voltu status vocabulary (live / available / ghost etc.).
const STATUS_MAP: Record<ChargingStationStatus, { status: VoltuStatus; label: string }> = {
  [ChargingStationStatus.AVAILABLE]: { status: 'available', label: 'Available' },
  [ChargingStationStatus.CHARGING]: { status: 'charging', label: 'Charging' },
  [ChargingStationStatus.CHARGING_SUSPENDED]: { status: 'suspended', label: 'Suspended' },
  [ChargingStationStatus.UNAVAILABLE]: { status: 'unavailable', label: 'Unavailable' },
  [ChargingStationStatus.FAULTED]: { status: 'faulted', label: 'Faulted' },
};

export interface ChargingStationStatusTagProps {
  station: ChargingStationStatusCountsDto;
}
export const ChargingStationStatusTag = ({ station }: ChargingStationStatusTagProps) => {
  const status = getChargingStationStatus(station);
  const mapped = (status && STATUS_MAP[status]) ?? {
    status: 'unknown' as VoltuStatus,
    label: 'Unknown',
  };
  return <StatusBadge status={mapped.status} label={mapped.label} />;
};
