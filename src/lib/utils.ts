import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
