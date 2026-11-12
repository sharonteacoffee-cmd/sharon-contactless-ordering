import {
  toUTCISOString,
  type PushNotificationStatus,
  type PushTargetRole,
  type RegisterPushTokenResult,
} from '@sharon/shared';

export interface PushTokenRegistrationRow {
  business_id: string;
  target_role: PushTargetRole;
  updated_at: Date;
}

export function toRegisterPushTokenResult(
  row: PushTokenRegistrationRow,
  fcmConfigured: boolean,
): RegisterPushTokenResult {
  return {
    tokenBusinessId: row.business_id,
    targetRole: row.target_role,
    fcmConfigured,
    registeredAt: toUTCISOString(row.updated_at),
  };
}

export function toPushNotificationStatus(
  fcmConfigured: boolean,
  activeDeviceCount: number,
): PushNotificationStatus {
  return {
    fcmConfigured,
    activeDeviceCount,
  };
}
