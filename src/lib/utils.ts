import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeForDisplay(timeString: string): string {
  // Extract HH:MM from time string (handles HH:MM:SS format)
  if (!timeString) return '';
  const parts = timeString.split(':');
  return `${parts[0]}:${parts[1]}`;
}
