const IST_TIME_ZONE = 'Asia/Kolkata';

const istTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const istDateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function parseValidDate(input: Date | string | number): Date {
  const parsed = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid date value provided: ${String(input)}`);
  }
  return parsed;
}

function normalizeMeridiem(formatted: string): string {
  return formatted.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

/**
 * Normalizes a Date, timestamp number, or date string into a canonical UTC ISO 8601 string.
 */
export function toUTCISOString(date: Date | string | number): string {
  return parseValidDate(date).toISOString();
}

/**
 * Formats a UTC ISO timestamp string into local IST time (e.g. "03:45 PM").
 */
export function formatISTTime(utcString: string): string {
  const date = parseValidDate(utcString);
  return normalizeMeridiem(istTimeFormatter.format(date));
}

/**
 * Formats a UTC ISO timestamp string into local IST date and time with an explicit " IST" suffix.
 */
export function formatISTDateTime(utcString: string): string {
  const date = parseValidDate(utcString);
  return `${normalizeMeridiem(istDateTimeFormatter.format(date))} IST`;
}

/**
 * Returns non-negative elapsed whole seconds from a UTC ISO timestamp until now.
 */
export function getElapsedSeconds(utcString: string): number {
  const targetMs = parseValidDate(utcString).getTime();
  return Math.max(0, Math.floor((Date.now() - targetMs) / 1000));
}

/**
 * Formats elapsed time since a UTC ISO timestamp into a compact live counter label (e.g. "45s ago", "2m 10s").
 */
export function formatElapsedLabel(utcString: string): string {
  const totalSeconds = getElapsedSeconds(utcString);
  if (totalSeconds < 60) {
    return `${totalSeconds}s ago`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours === 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${hours}h ${minutes}m`;
}
