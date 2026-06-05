import { BadRequestError } from "../common/errors/http-errors";

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates a password against the documented policy: at least 8 characters and
 * containing a lowercase letter, an uppercase letter, a digit and a special
 * character. Throws BadRequestError with a descriptive message on failure.
 *
 * Shared by registration and password reset so the rule lives in one place.
 */
export function assertStrongPassword(password: unknown): string {
  if (typeof password !== "string" || password.length === 0) {
    throw new BadRequestError("Hasło jest wymagane.");
  }
  const problems: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`co najmniej ${MIN_PASSWORD_LENGTH} znaków`);
  }
  if (!/[a-z]/.test(password)) problems.push("małą literę");
  if (!/[A-Z]/.test(password)) problems.push("wielką literę");
  if (!/[0-9]/.test(password)) problems.push("cyfrę");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("znak specjalny");

  if (problems.length > 0) {
    throw new BadRequestError(`Hasło musi zawierać ${problems.join(", ")}.`);
  }
  return password;
}
