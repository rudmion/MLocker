import { useState, useEffect, useCallback, useRef } from 'react';

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 60_000;
const STORAGE_KEY_ATTEMPTS = 'mlocker-attempts';
const STORAGE_KEY_BLOCKED_AT = 'mlocker-blocked-at';

function readAttempts(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY_ATTEMPTS) ?? '0', 10);
  } catch {
    return 0;
  }
}

function readBlockedAt(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY_BLOCKED_AT);
    if (!val) return null;
    return parseInt(val, 10);
  } catch {
    return null;
  }
}

function writeState(attempts: number, blockedAt: number | null) {
  localStorage.setItem(STORAGE_KEY_ATTEMPTS, String(attempts));
  if (blockedAt !== null) {
    localStorage.setItem(STORAGE_KEY_BLOCKED_AT, String(blockedAt));
  } else {
    localStorage.removeItem(STORAGE_KEY_BLOCKED_AT);
  }
}

export function useMasterPasswordAttempts() {
  const blockedAtRef = useRef<number | null>(readBlockedAt());
  const [attempts, setAttempts] = useState<number>(() => readAttempts());
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const ba = blockedAtRef.current;
    if (ba === null) return 0;
    const elapsed = Date.now() - ba;
    const left = Math.ceil((BLOCK_DURATION_MS - elapsed) / 1000);
    return left > 0 ? left : 0;
  });

  const isBlocked = remainingSeconds > 0;

  useEffect(() => {
    const interval = setInterval(() => {
      const ba = blockedAtRef.current;
      if (ba === null) {
        setRemainingSeconds(0);
        return;
      }

      const elapsed = Date.now() - ba;
      const left = Math.ceil((BLOCK_DURATION_MS - elapsed) / 1000);

      if (left <= 0) {
        setRemainingSeconds(0);
        blockedAtRef.current = null;
        writeState(attempts, null);
      } else {
        setRemainingSeconds(left);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [attempts]);

  const recordFailedAttempt = useCallback(() => {
    setAttempts((prev) => {
      const next = prev + 1;

      if (next >= MAX_ATTEMPTS) {
        const now = Date.now();
        blockedAtRef.current = now;
        writeState(next, now);
      } else {
        writeState(next, blockedAtRef.current);
      }

      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setAttempts(0);
    setRemainingSeconds(0);
    blockedAtRef.current = null;
    writeState(0, null);
  }, []);

  return {
    attempts,
    isBlocked,
    remainingSeconds,
    maxAttempts: MAX_ATTEMPTS,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts),
    recordFailedAttempt,
    reset,
  };
}
