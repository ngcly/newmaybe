import { useState, useCallback } from 'react';
import { DAILY_FREE_LIMIT } from '../constants';

interface TurnStatus {
  ok: boolean;
  remaining: number;
}

const STORAGE_KEY = 'newmaybe_free_turns_limit';

export function useFreeTurns() {
  const [freeTurnsLeft, setFreeTurnsLeft] = useState<number>(() => {
    const limitJson = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const today = new Date().toDateString();
    if (limitJson) {
      try {
        const { date, count } = JSON.parse(limitJson);
        if (date === today) {
          return DAILY_FREE_LIMIT - count;
        }
      } catch (e) {
        console.warn('Failed to parse free turns limit from localStorage', e);
      }
    }
    return DAILY_FREE_LIMIT;
  });

  const checkFreeTurns = useCallback((): TurnStatus => {
    const limitJson = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toDateString();

    if (limitJson) {
      try {
        const { date, count } = JSON.parse(limitJson);
        if (date === today) {
          if (count >= DAILY_FREE_LIMIT) {
            return { ok: false, remaining: 0 };
          }
          return { ok: true, remaining: DAILY_FREE_LIMIT - count };
        }
      } catch (e) {
        console.warn('Failed to parse free turns limit from localStorage', e);
      }
    }
    return { ok: true, remaining: DAILY_FREE_LIMIT };
  }, []);

  const decrementFreeTurns = useCallback((): number => {
    const limitJson = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toDateString();
    let count = 0;
    if (limitJson) {
      try {
        const parsed = JSON.parse(limitJson);
        if (parsed.date === today) {
          count = parsed.count;
        }
      } catch (e) {
        console.warn('Failed to parse free turns limit from localStorage', e);
      }
    }
    count += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count }));
    const remaining = DAILY_FREE_LIMIT - count;
    setFreeTurnsLeft(remaining);
    return remaining;
  }, []);

  return { freeTurnsLeft, checkFreeTurns, decrementFreeTurns };
}
