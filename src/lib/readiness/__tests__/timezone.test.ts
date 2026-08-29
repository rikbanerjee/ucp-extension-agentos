import { describe, it, expect } from 'vitest';
import { zonedWallClockToEpochMs, zonedWallClockToIsoWithOffset, splitDateTimeLocal } from '../timezone';

describe('zonedWallClockToEpochMs', () => {
  it('converts New York winter (EST, UTC-5) wall-clock time to the correct UTC instant', () => {
    const ms = zonedWallClockToEpochMs('2026-01-15', '09:00', 'America/New_York');
    expect(ms).not.toBeNull();
    expect(new Date(ms!).toISOString()).toBe('2026-01-15T14:00:00.000Z');
  });

  it('converts New York summer (EDT, UTC-4) wall-clock time to the correct UTC instant', () => {
    const ms = zonedWallClockToEpochMs('2026-07-15', '09:00', 'America/New_York');
    expect(ms).not.toBeNull();
    expect(new Date(ms!).toISOString()).toBe('2026-07-15T13:00:00.000Z');
  });

  it('round-trips through UTC with no offset', () => {
    const ms = zonedWallClockToEpochMs('2026-03-01', '12:00', 'UTC');
    expect(new Date(ms!).toISOString()).toBe('2026-03-01T12:00:00.000Z');
  });

  it('returns null for a malformed date', () => {
    expect(zonedWallClockToEpochMs('not-a-date', '09:00', 'America/New_York')).toBeNull();
  });

  it('returns null for a malformed time', () => {
    expect(zonedWallClockToEpochMs('2026-01-15', 'noon', 'America/New_York')).toBeNull();
  });

  it('returns null for an unresolvable timezone identifier', () => {
    expect(zonedWallClockToEpochMs('2026-01-15', '09:00', 'Not/A_Zone')).toBeNull();
  });

  it('is deterministic — same inputs always produce the same output', () => {
    const a = zonedWallClockToEpochMs('2026-05-01', '08:30', 'America/Los_Angeles');
    const b = zonedWallClockToEpochMs('2026-05-01', '08:30', 'America/Los_Angeles');
    expect(a).toBe(b);
  });
});

describe('zonedWallClockToIsoWithOffset', () => {
  it('produces a valid ISO 8601 timestamp with an explicit UTC (Z) offset', () => {
    const iso = zonedWallClockToIsoWithOffset('2026-01-15', '09:00', 'America/New_York');
    expect(iso).toBe('2026-01-15T14:00:00.000Z');
  });
});

describe('splitDateTimeLocal', () => {
  it('splits a datetime-local value into date and time', () => {
    expect(splitDateTimeLocal('2026-08-17T14:30')).toEqual({ date: '2026-08-17', time: '14:30' });
  });

  it('returns null for a malformed value', () => {
    expect(splitDateTimeLocal('garbage')).toBeNull();
  });
});
