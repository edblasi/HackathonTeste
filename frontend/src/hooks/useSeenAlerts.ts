import { useCallback, useState } from "react";

const MAX_STORED_ALERTS = 200;

function readStoredIds(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

export function useSeenAlerts(storageKey: string) {
  const [seenIds, setSeenIds] = useState<Set<string>>(() => readStoredIds(storageKey));

  const markSeen = useCallback((id: string) => {
    setSeenIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      if (typeof window !== "undefined") {
        try {
          const values = Array.from(next).slice(-MAX_STORED_ALERTS);
          window.localStorage.setItem(storageKey, JSON.stringify(values));
        } catch {
          // A indicação visual ainda funciona durante a sessão mesmo sem localStorage.
        }
      }
      return next;
    });
  }, [storageKey]);

  const isSeen = useCallback((id: string) => seenIds.has(id), [seenIds]);

  return { isSeen, markSeen };
}
