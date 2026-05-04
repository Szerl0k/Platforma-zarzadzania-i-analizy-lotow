/**
 * Calculates the flight duration in minutes based on prioritized timestamps.
 * Priority: Actual > Estimated > Scheduled
 * 
 * @param departure - Object containing departure timestamps
 * @param arrival - Object containing arrival timestamps
 * @returns Duration in minutes or null if calculation is impossible
 */
export function calculateFlightDuration(
  departure: { actual: string | null; estimated: string | null; scheduled: string | null },
  arrival: { actual: string | null; estimated: string | null; scheduled: string | null }
): number | null {
  const depTime = departure.actual || departure.estimated || departure.scheduled;
  const arrTime = arrival.actual || arrival.estimated || arrival.scheduled;

  return calculateMinutesBetween(depTime, arrTime);
}

/**
 * Calculates minutes between two ISO timestamps.
 * 
 * @param start - Start ISO timestamp
 * @param end - End ISO timestamp
 * @returns Minutes between or null
 */
export function calculateMinutesBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  
  // Return null if negative duration (e.g. data error)
  if (diffMs < 0) return null;
  
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Calculates time remaining until a target timestamp from now.
 * 
 * @param target - Target ISO timestamp
 * @returns Minutes remaining (positive = in future, negative = overdue) or null
 */
export function calculateTimeRemaining(target: string | null): number | null {
  if (!target) return null;
  const targetDate = new Date(target);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Formats duration in minutes to a human-readable string (e.g., "3h 5m").
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted string
 */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "N/A";

  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  const sign = minutes < 0 ? "-" : "";

  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${m}m`;
}
