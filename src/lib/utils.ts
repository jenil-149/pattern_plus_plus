import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Date object into YYYY-MM-DD string representation.
 * Uses Intl.DateTimeFormat("en-CA") which natively produces YYYY-MM-DD.
 */
export function getLocalDateStr(d: Date, timeZone?: string, useUTC = false): string {
  const tz = timeZone || (useUTC ? "UTC" : undefined);
  try {
    return new Intl.DateTimeFormat("en-CA", {
      ...(tz && { timeZone: tz }),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch (e) {
    console.error("Invalid timezone:", tz, e);
    // Fallback to local date methods
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
