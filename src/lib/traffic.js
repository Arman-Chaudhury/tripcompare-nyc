// Time-of-day traffic model for road modes. Multipliers apply to FREE-FLOW
// drive minutes and are deliberately wide ranges — we never show a single
// number for a car trip.

import { localeFor } from './i18n.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// All peak / rush / overnight windows are defined in New York local time,
// regardless of where the device (or a CI runner) thinks it is.
const NY_TZ = 'America/New_York';
const nyFmt = new Intl.DateTimeFormat('en-US', { timeZone: NY_TZ, hour: 'numeric', hour12: false, weekday: 'short' });
const DAY_IDX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export function nyClock(date) {
  const parts = nyFmt.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour').value) % 24;
  const day = DAY_IDX[parts.find((p) => p.type === 'weekday').value];
  return { hour, day };
}

export function trafficProfile(date, weather = 'clear') {
  const { hour, day } = nyClock(date);
  const weekday = day >= 1 && day <= 5;

  let lo, hi, key;
  if (weekday && hour >= 7 && hour < 10) [lo, hi, key] = [1.5, 1.8, 'amRush'];
  else if (weekday && hour >= 16 && hour < 20) [lo, hi, key] = [1.6, 2.0, 'pmRush'];
  else if (hour >= 22 || hour < 6) [lo, hi, key] = [0.8, 1.0, 'lateNight'];
  else if (!weekday && hour >= 11 && hour < 18) [lo, hi, key] = [1.2, 1.4, 'weekendMidday'];
  else if (weekday && hour >= 10 && hour < 16) [lo, hi, key] = [1.2, 1.5, 'midday'];
  else if (weekday && hour >= 20 && hour < 22) [lo, hi, key] = [1.1, 1.3, 'evening'];
  else [lo, hi, key] = [1.0, 1.25, 'offPeak'];

  if (weather === 'rain') [lo, hi] = [lo * 1.15, hi * 1.3];
  if (weather === 'snow') [lo, hi] = [lo * 1.4, hi * 1.8];

  return {
    lo,
    hi,
    key,
    weekday,
    hour,
    dayName: DAY_NAMES[day],
    isPmRush: weekday && hour >= 16 && hour < 20,
    isNight: hour >= 20 || hour < 6,
    isOvernight: hour >= 0 && hour < 5,
  };
}

/** Applies the profile to free-flow minutes; returns [lo, hi] integers. */
export function driveRange(freeFlowMin, profile, extraLo = 0, extraHi = 0) {
  return [Math.round(freeFlowMin * profile.lo + extraLo), Math.round(freeFlowMin * profile.hi + extraHi)];
}

/** LIRR peak: weekday trains arriving Manhattan 6–10am or departing 4–8pm.
 *  From the airport the relevant window is arrival in Manhattan, so we use
 *  the departure hour + ~45 min. */
export function isLirrPeak(date, shiftMin = 45) {
  const { day } = nyClock(date);
  if (day === 0 || day === 6) return false;
  const { hour: h } = nyClock(new Date(date.getTime() + shiftMin * 60 * 1000));
  return (h >= 6 && h < 10) || (h >= 16 && h < 20);
}

/** Rideshare demand multiplier range by time of day / weather. */
export function surgeProfile(profile, weather = 'clear') {
  let lo = 1.0, hi = 1.05, label = 'normalDemand';
  if (profile.key === 'pmRush' || profile.key === 'amRush') [lo, hi, label] = [1.1, 1.5, 'highDemand'];
  else if (profile.key === 'lateNight') [lo, hi, label] = [1.0, 1.35, 'lateNightDemand'];
  else if (profile.key === 'weekendMidday') [lo, hi, label] = [1.0, 1.25, 'normalDemand'];
  if (weather === 'rain') [lo, hi, label] = [lo * 1.1, hi * 1.4, 'surgeLikely'];
  if (weather === 'snow') [lo, hi, label] = [lo * 1.3, hi * 1.9, 'surgeLikely'];
  return { lo, hi, label };
}

export function formatTimeLabel(date, lang = 'en') {
  return date.toLocaleString(localeFor(lang), {
    timeZone: NY_TZ,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Weekday and clock time as separate localized strings (for "assumes … traffic (Wed 5:12 PM)"). */
export function formatDayTime(date, lang = 'en') {
  const loc = localeFor(lang);
  return {
    day: date.toLocaleString(loc, { timeZone: NY_TZ, weekday: 'long' }),
    time: date.toLocaleString(loc, { timeZone: NY_TZ, hour: 'numeric', minute: '2-digit' }),
  };
}
