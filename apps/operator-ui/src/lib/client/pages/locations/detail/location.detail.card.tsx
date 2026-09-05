// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import type { LocationDto } from '@citrineos/types';
import { MenuSection } from '@lib/client/components/main-menu/main.menu';
import { Button } from '@lib/client/components/ui/button';
import { ActionType, ResourceType } from '@lib/utils/access.types';
import { NOT_APPLICABLE } from '@lib/utils/consts';
import { getFullAddress } from '@lib/utils/geocoding';
import { CanAccess, useDelete, useTranslate } from '@refinedev/core';
import { CHARGING_STATIONS_DELETE_MUTATION } from '@lib/queries/charging.stations';
import { ChevronLeft, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@lib/client/components/ui/card';
import { badgeListStyle, heading2Style } from '@lib/client/styles/page';
import { buttonIconSize } from '@lib/client/styles/icon';
import { KeyValueDisplay } from '@lib/client/components/key-value-display';
import { cardGridStyle, cardHeaderFlex } from '@lib/client/styles/card';
import { Badge } from '@lib/client/components/ui/badge';
import Image from 'next/image';

export interface LocationDetailCardProps {
  location: LocationDto;
  imageUrl?: string | null;
}

export const LocationDetailCard = ({ location, imageUrl }: LocationDetailCardProps) => {
  const { back, push } = useRouter();
  const translate = useTranslate();
  const { mutateAsync: deleteRecord } = useDelete();

  // A Location can't be deleted while ChargingStations reference it (FK constraint), so cascade: delete the
  // child stations first (reusing their own delete mutation, which handles a station's own children), then the
  // location. Confirm first, since this removes the stations too.
  const handleDelete = async () => {
    const stations = location.chargingPool ?? [];
    if (
      stations.length > 0 &&
      !window.confirm(
        translate('Locations.detail.confirmDeleteWithStations', { count: stations.length }),
      )
    ) {
      return;
    }
    // Turn the raw DB "Foreign key violation" into a clear reason: a location/station with charging activity
    // (sessions/transactions) is retained for records and can't be deleted.
    const errorNotification = (error: unknown) => ({
      message: /constraint|foreign key/i.test(String((error as { message?: string })?.message ?? ''))
        ? translate('Locations.detail.deleteBlockedByActivity')
        : translate('Locations.detail.deleteFailed'),
      type: 'error' as const,
    });
    try {
      for (const station of stations) {
        await deleteRecord({
          resource: ResourceType.CHARGING_STATIONS,
          id: station.id!,
          meta: { gqlMutation: CHARGING_STATIONS_DELETE_MUTATION },
          errorNotification,
        });
      }
      await deleteRecord({
        resource: ResourceType.LOCATIONS,
        id: location.id!,
        errorNotification,
      });
      push(`/${MenuSection.LOCATIONS}`);
    } catch {
      /* errorNotification already showed the reason; keep the user on the page */
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className={cardHeaderFlex}>
          <ChevronLeft
            onClick={() => {
              if (window.history.state?.idx === 0) {
                push(`/${MenuSection.LOCATIONS}`);
              } else {
                back();
              }
            }}
            className="cursor-pointer"
          />
          <h2 className={heading2Style}>{location.name}</h2>
          <CanAccess
            resource={ResourceType.LOCATIONS}
            action={ActionType.EDIT}
            params={{ id: location.id }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => push(`/${MenuSection.LOCATIONS}/${location.id}/edit`)}
            >
              <Edit className={buttonIconSize} />
              {translate('buttons.edit')}
            </Button>
          </CanAccess>
          <CanAccess
            resource={ResourceType.LOCATIONS}
            action={ActionType.DELETE}
            params={{ id: location.id }}
          >
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className={buttonIconSize} />
              {translate('buttons.delete')}
            </Button>
          </CanAccess>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Details */}
          <div className="flex-1">
            <div className={cardGridStyle}>
              <KeyValueDisplay
                keyLabel={translate('Locations.columns.address')}
                value={
                  location.address ? getFullAddress(location) : translate('Locations.noAddress')
                }
              />
              <KeyValueDisplay
                keyLabel={translate('Locations.columns.latitude')}
                value={
                  location?.coordinates
                    ? location.coordinates.coordinates[1].toFixed(4)
                    : NOT_APPLICABLE
                }
              />
              <KeyValueDisplay
                keyLabel={translate('Locations.columns.longitude')}
                value={
                  location?.coordinates
                    ? location.coordinates.coordinates[0].toFixed(4)
                    : NOT_APPLICABLE
                }
              />
              <KeyValueDisplay
                keyLabel={translate('Locations.columns.timeZone')}
                value={location.timeZone}
              />
              <KeyValueDisplay
                keyLabel={translate('Locations.columns.parkingType')}
                value={location.parkingType}
              />
              <KeyValueDisplay
                keyLabel={translate('Locations.columns.facilities')}
                value={
                  location.facilities ? (
                    <div className={badgeListStyle}>
                      {location.facilities.map((facility, idx) => (
                        <Badge variant="muted" key={idx}>
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    NOT_APPLICABLE
                  )
                }
              />
              <KeyValueDisplay
                keyLabel={translate('Locations.detail.totalChargers')}
                value={location.chargingPool?.length ?? 0}
              />
            </div>
          </div>
          {/* Right: Image */}
          {imageUrl && (
            <div className="flex-shrink-0 w-64 md:w-48 sm:w-32 h-64 md:h-48 sm:h-32 flex items-center justify-center bg-muted rounded-sm">
              <Image
                src={imageUrl}
                alt={translate('Locations.detail.imageAlt', { name: location.name })}
                className="w-full h-full object-contain rounded-sm bg-muted"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
