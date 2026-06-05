export const MIN_PASSWORD_LENGTH = 8;

/**
 * Client-side mirror of the backend password policy: at least 8 characters with
 * a lowercase letter, an uppercase letter, a digit and a special character.
 * Returns a human-readable error message, or null when the password is valid.
 */
export function validatePassword(password: string): string | null {
  const problems: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`co najmniej ${MIN_PASSWORD_LENGTH} znaków`);
  }
  if (!/[a-z]/.test(password)) problems.push("małą literę");
  if (!/[A-Z]/.test(password)) problems.push("wielką literę");
  if (!/[0-9]/.test(password)) problems.push("cyfrę");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("znak specjalny");

  if (problems.length > 0) {
    return `Hasło musi zawierać ${problems.join(", ")}.`;
  }
  return null;
}
