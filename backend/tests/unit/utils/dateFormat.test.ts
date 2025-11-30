/**
 * Date Format Utility Unit Tests
 *
 * Tests for timestamp formatting functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { formatRelativeTime } from '../../../src/utils/dateFormat'

describe('dateFormat', () => {
  describe('formatRelativeTime()', () => {
    beforeEach(() => {
      // Mock current time to 2025-11-30 14:30:00 UTC
      vi.setSystemTime(new Date('2025-11-30T14:30:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should format timestamp from today as "today at [time]"', () => {
      // Same day, earlier time
      const timestamp = '2025-11-30T10:15:00.000Z'
      const result = formatRelativeTime(timestamp)

      expect(result).toMatch(/^today at \d{1,2}:\d{2} [AP]M$/)
      expect(result).toContain('today at')
    })

    it('should format timestamp from yesterday as "yesterday at [time]"', () => {
      // Previous day
      const timestamp = '2025-11-29T18:45:00.000Z'
      const result = formatRelativeTime(timestamp)

      expect(result).toMatch(/^yesterday at \d{1,2}:\d{2} [AP]M$/)
      expect(result).toContain('yesterday at')
    })

    it('should format older dates as "[date] at [time]"', () => {
      // 7 days ago
      const timestamp = '2025-11-23T09:00:00.000Z'
      const result = formatRelativeTime(timestamp)

      // Should contain the date in some format (Nov 23, 2025 or similar)
      expect(result).toMatch(/at \d{1,2}:\d{2} [AP]M$/)
      expect(result).not.toContain('today')
      expect(result).not.toContain('yesterday')
    })

    it('should format time correctly in 12-hour format', () => {
      // Morning time (before noon)
      const morningTime = '2025-11-30T08:30:00.000Z'
      const morningResult = formatRelativeTime(morningTime)
      expect(morningResult).toMatch(/\d{1,2}:\d{2} AM$/)

      // Afternoon time (after noon)
      const afternoonTime = '2025-11-30T16:45:00.000Z'
      const afternoonResult = formatRelativeTime(afternoonTime)
      expect(afternoonResult).toMatch(/\d{1,2}:\d{2} PM$/)
    })

    it('should handle midnight correctly', () => {
      const midnight = '2025-11-30T00:00:00.000Z'
      const result = formatRelativeTime(midnight)

      expect(result).toContain('today at')
      expect(result).toMatch(/12:00 AM/)
    })

    it('should handle noon correctly', () => {
      const noon = '2025-11-30T12:00:00.000Z'
      const result = formatRelativeTime(noon)

      expect(result).toContain('today at')
      expect(result).toMatch(/12:00 PM/)
    })

    it('should handle dates far in the past', () => {
      // 2 years ago
      const oldDate = '2023-06-15T14:00:00.000Z'
      const result = formatRelativeTime(oldDate)

      expect(result).not.toContain('today')
      expect(result).not.toContain('yesterday')
      expect(result).toContain('at')
      expect(result).toMatch(/2023/)
    })

    it('should handle edge case: exactly at current time', () => {
      const now = '2025-11-30T14:30:00.000Z'
      const result = formatRelativeTime(now)

      expect(result).toContain('today at')
    })

    it('should handle edge case: one second before midnight (still today)', () => {
      const justBeforeMidnight = '2025-11-30T23:59:59.000Z'
      const result = formatRelativeTime(justBeforeMidnight)

      expect(result).toContain('today at')
      expect(result).toMatch(/11:59 PM/)
    })

    it('should handle ISO 8601 format with milliseconds', () => {
      const timestampWithMs = '2025-11-30T10:15:30.500Z'
      const result = formatRelativeTime(timestampWithMs)

      expect(result).toContain('today at')
      // Should ignore milliseconds in display
      expect(result).toMatch(/10:15 AM/)
    })

    it('should throw error for invalid timestamp', () => {
      expect(() => formatRelativeTime('invalid-date')).toThrow()
    })

    it('should throw error for empty string', () => {
      expect(() => formatRelativeTime('')).toThrow()
    })

    it('should handle yesterday correctly across month boundaries', () => {
      // Set current time to first day of month
      vi.setSystemTime(new Date('2025-12-01T10:00:00.000Z'))

      // Yesterday was last day of previous month
      const timestamp = '2025-11-30T15:00:00.000Z'
      const result = formatRelativeTime(timestamp)

      expect(result).toContain('yesterday at')
    })

    it('should handle yesterday correctly across year boundaries', () => {
      // Set current time to first day of year
      vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'))

      // Yesterday was last day of previous year
      const timestamp = '2025-12-31T15:00:00.000Z'
      const result = formatRelativeTime(timestamp)

      expect(result).toContain('yesterday at')
    })
  })
})
