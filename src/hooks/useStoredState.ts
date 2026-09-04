import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * useState persisted to localStorage. Plain objects are shallow-merged over
 * the initial value so older saved payloads survive schema additions.
 */
export function useStoredState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        const parsed = JSON.parse(raw) as unknown;
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          initial !== null &&
          typeof initial === 'object' &&
          !Array.isArray(initial)
        ) {
          return { ...(initial as object), ...(parsed as object) } as T;
        }
        return parsed as T;
      }
    } catch {
      /* corrupted or unavailable storage — fall through */
    }
    return initial;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked — keep running in-memory */
    }
  }, [key, value]);

  return [value, setValue];
}
