const STORAGE_KEY = "login_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface AttemptData {
  count: number;
  lockedUntil: number | null;
}

function getData(): AttemptData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, lockedUntil: null };
}

function setData(data: AttemptData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function isLockedOut(): { locked: boolean; remainingSeconds: number } {
  const data = getData();
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    return { locked: true, remainingSeconds: Math.ceil((data.lockedUntil - Date.now()) / 1000) };
  }
  if (data.lockedUntil && Date.now() >= data.lockedUntil) {
    setData({ count: 0, lockedUntil: null });
  }
  return { locked: false, remainingSeconds: 0 };
}

export function recordFailedAttempt(): { locked: boolean; remainingAttempts: number } {
  const data = getData();
  data.count += 1;
  if (data.count >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    setData(data);
    return { locked: true, remainingAttempts: 0 };
  }
  setData(data);
  return { locked: false, remainingAttempts: MAX_ATTEMPTS - data.count };
}

export function resetAttempts() {
  localStorage.removeItem(STORAGE_KEY);
}
