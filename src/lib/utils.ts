import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Date object into YYYY-MM-DD string representation.
 * Supports client timezone, specific target timezone, or UTC date methods.
 */
export function getLocalDateStr(d: Date, timeZone?: string, useUTC = false): string {
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    } catch (e) {
      console.error("Invalid timezone:", timeZone, e);
    }
  }
  const year = useUTC ? d.getUTCFullYear() : d.getFullYear();
  const month = String((useUTC ? d.getUTCMonth() : d.getMonth()) + 1).padStart(2, "0");
  const day = String(useUTC ? d.getUTCDate() : d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

