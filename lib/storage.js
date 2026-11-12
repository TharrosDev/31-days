// Browser-side state for the countdown and completed runs.
// Every visitor's countdown lives under these exact names and formats (carried over from the
// original static site). Renaming a key or changing a value format resets everyone's countdown.
// shortcut: per-browser only, no account or server; add a backend if runs must sync across devices.

export const DURATION_MS = 31 * 24 * 60 * 60 * 1000;

const DEADLINE_NAME = "daysToTomorrowDeadlineV1"; // cookie and localStorage: deadline as epoch ms
const HISTORY_NAME = "daysToTomorrowHistoryV1"; // localStorage: JSON [{ start, end, rating: 1-10 | null }]
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const isValidDeadline = value => Number.isSafeInteger(value) && value > 0;
const isRating = value => Number.isInteger(value) && value >= 1 && value <= 10;

export function readSavedDeadline() {
  try {
    const prefix = encodeURIComponent(DEADLINE_NAME) + "=";
    const savedCookie = document.cookie
      .split(";")
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(prefix));

    if (savedCookie) {
      const savedValue = Number(decodeURIComponent(savedCookie.slice(prefix.length)));
      if (isValidDeadline(savedValue)) return savedValue;
    }
  } catch (error) {
    console.warn("Could not read the countdown cookie.", error);
  }

  try {
    const savedValue = Number(window.localStorage.getItem(DEADLINE_NAME));
    return isValidDeadline(savedValue) ? savedValue : null;
  } catch (error) {
    console.warn("Countdown storage is unavailable.", error);
    return null;
  }
}

export function saveDeadline(deadline) {
  const value = encodeURIComponent(String(deadline));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  try {
    // Keep the original deadline across browser sessions and restarts.
    document.cookie = encodeURIComponent(DEADLINE_NAME) + "=" + value + "; Max-Age=" + COOKIE_MAX_AGE + "; Path=/; SameSite=Lax" + secure;
  } catch (error) {
    console.warn("Could not save the countdown cookie.", error);
  }

  try {
    // Local storage is a fallback when browser cookie access is restricted.
    window.localStorage.setItem(DEADLINE_NAME, String(deadline));
  } catch (error) {
    console.warn("Could not save the countdown locally.", error);
  }
}

export function getOrCreateDeadline() {
  const savedDeadline = readSavedDeadline();
  if (savedDeadline !== null) {
    saveDeadline(savedDeadline); // refresh the cookie's one-year lifetime
    return savedDeadline;
  }

  // Round up to the next second so the first displayed value is 744 hours.
  const deadline = Math.ceil(Date.now() / 1000) * 1000 + DURATION_MS;
  saveDeadline(deadline);
  return deadline;
}

export function readHistory() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(HISTORY_NAME));
    if (!Array.isArray(saved)) return [];
    return saved
      .filter(run => run && Number.isSafeInteger(run.start) && isValidDeadline(run.end))
      .map(run => ({ start: run.start, end: run.end, rating: isRating(run.rating) ? run.rating : null }));
  } catch (error) {
    return [];
  }
}

export function saveHistory(history) {
  try {
    window.localStorage.setItem(HISTORY_NAME, JSON.stringify(history));
    return true;
  } catch (error) {
    console.warn("Could not save completed runs.", error);
    return false;
  }
}

// Log the finished run and start a fresh 31 days.
export function completeRun(deadline) {
  const history = readHistory();
  if (!history.some(run => run.end === deadline)) {
    history.push({ start: deadline - DURATION_MS, end: deadline, rating: null });
    saveHistory(history);
  }

  // Another tab may have already restarted; never overwrite a live deadline.
  const saved = readSavedDeadline();
  if (!(saved > Date.now())) saveDeadline(Math.ceil(Date.now() / 1000) * 1000 + DURATION_MS);
}
