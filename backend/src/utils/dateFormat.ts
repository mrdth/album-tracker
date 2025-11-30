/**
 * Date Format Utilities
 *
 * Provides human-readable timestamp formatting for artist refresh timestamps
 */

/**
 * Format a timestamp as relative time with specific date/time display
 *
 * @param timestamp - ISO 8601 datetime string
 * @returns Formatted string: "today at [time]", "yesterday at [time]", or "[date] at [time]"
 * @throws Error if timestamp is invalid
 *
 * @example
 * formatRelativeTime("2025-11-30T14:30:00.000Z") // "today at 2:30 PM"
 * formatRelativeTime("2025-11-29T10:15:00.000Z") // "yesterday at 10:15 AM"
 * formatRelativeTime("2025-11-15T16:45:00.000Z") // "Nov 15, 2025 at 4:45 PM"
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)

  // Validate timestamp
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`)
  }

  const now = new Date()

  // Check if same day (today)
  if (isSameDay(date, now)) {
    return `today at ${formatTime(date)}`
  }

  // Check if yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, yesterday)) {
    return `yesterday at ${formatTime(date)}`
  }

  // Older dates: format as full date
  return `${formatDate(date)} at ${formatTime(date)}`
}

/**
 * Check if two dates are on the same calendar day (ignoring time)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Format time in 12-hour format with AM/PM
 *
 * @param date - Date object
 * @returns Formatted time string (e.g., "2:30 PM", "10:15 AM")
 */
function formatTime(date: Date): string {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'

  // Convert to 12-hour format
  hours = hours % 12
  hours = hours || 12 // 0 should become 12

  // Pad minutes with leading zero
  const minutesStr = minutes.toString().padStart(2, '0')

  return `${hours}:${minutesStr} ${ampm}`
}

/**
 * Format date in readable format (e.g., "Nov 15, 2025")
 *
 * @param date - Date object
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]

  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()

  return `${month} ${day}, ${year}`
}
