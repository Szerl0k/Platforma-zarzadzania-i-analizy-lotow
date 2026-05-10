import { apiClient } from "./client";

export interface UserPreferencesDTO {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notifyOnDelay: boolean;
  notifyOnGateChange: boolean;
  notifyOnStatusChange: boolean;
  delayThresholdMinutes: number;
  timezone: string;
  distanceUnit: string;
}

export type UserPreferencesPatch = Partial<
  Pick<
    UserPreferencesDTO,
    | "emailNotifications"
    | "pushNotifications"
    | "notifyOnDelay"
    | "notifyOnGateChange"
    | "notifyOnStatusChange"
    | "delayThresholdMinutes"
    | "timezone"
    | "distanceUnit"
  >
>;

export async function getMyPreferences(): Promise<UserPreferencesDTO> {
  const { data } = await apiClient.get<UserPreferencesDTO>(
    "/users/me/preferences",
  );
  return data;
}

export async function updateMyPreferences(
  patch: UserPreferencesPatch,
): Promise<UserPreferencesDTO> {
  const { data } = await apiClient.patch<UserPreferencesDTO>(
    "/users/me/preferences",
    patch,
  );
  return data;
}
