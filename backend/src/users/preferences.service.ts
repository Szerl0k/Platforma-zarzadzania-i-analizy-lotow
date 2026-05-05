import { AppDataSource } from "../common/database/data-source";
import { UserPreferences } from "./entities/UserPreferences";
import { NotFoundError } from "../common/errors/http-errors";

const ALLOWED_FIELDS = [
  "emailNotifications",
  "pushNotifications",
  "notifyOnDelay",
  "notifyOnGateChange",
  "notifyOnStatusChange",
  "delayThresholdMinutes",
  "timezone",
  "distanceUnit",
] as const;

export type AllowedPreferenceField = (typeof ALLOWED_FIELDS)[number];
export type PreferencesPatch = Partial<
  Pick<UserPreferences, AllowedPreferenceField>
>;

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const repo = AppDataSource.getRepository(UserPreferences);
  const prefs = await repo.findOne({ where: { userId } });
  if (!prefs) {
    throw new NotFoundError("Preferences not found");
  }
  return prefs;
}

export async function updatePreferences(
  userId: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
): Promise<UserPreferences> {
  const repo = AppDataSource.getRepository(UserPreferences);
  const prefs = await repo.findOne({ where: { userId } });
  if (!prefs) {
    throw new NotFoundError("Preferences not found");
  }

  const updates: PreferencesPatch = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      assignPreferenceField(updates, field, body[field]);
    }
  }

  repo.merge(prefs, updates);
  prefs.updatedAt = now;
  await repo.save(prefs);
  return prefs;
}

function assignPreferenceField(
  target: PreferencesPatch,
  field: AllowedPreferenceField,
  value: unknown,
): void {
  switch (field) {
    case "emailNotifications":
    case "pushNotifications":
    case "notifyOnDelay":
    case "notifyOnGateChange":
    case "notifyOnStatusChange":
      if (typeof value === "boolean") target[field] = value;
      return;
    case "delayThresholdMinutes":
      if (typeof value === "number" && Number.isFinite(value)) {
        target[field] = value;
      }
      return;
    case "timezone":
    case "distanceUnit":
      if (typeof value === "string") target[field] = value;
      return;
  }
}
