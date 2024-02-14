import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function unixToDateString(unix: number | null): string | null {
  if (unix === null) {
    return null
  }
  return new Date(unix * 1000).toISOString()
}

// example of results:
// - 20 minutes 4 seconds
// - 1 hour 20 minutes 4 seconds
// - 4 hours 20 minutes 4 seconds
export function epochTimeToNaturalLanguage(input: number): string {
  const seconds = Math.floor(input / 1000)

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  const timeParts = []
  if (hours > 0) {
    timeParts.push(`${hours} hour${hours > 1 ? "s" : ""}`)
  }
  if (minutes > 0) {
    timeParts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`)
  }
  if (remainingSeconds > 0) {
    timeParts.push(
      `${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`
    )
  }

  return timeParts.join(" ")
}
