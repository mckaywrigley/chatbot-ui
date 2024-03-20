import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { startOfDay, isBefore } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  })
}

export function isDateBeforeToday(date: Date): boolean {
  const today = startOfDay(new Date())
  return isBefore(date, today)
}
