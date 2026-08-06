import { useCallback, useEffect, useState } from "react";
import { apiGet } from "./api";

export function useApiData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiGet<T>(path)
      .then((result) => active && setData(result))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : "Erro ao carregar dados."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [path, version]);

  return { data, loading, error, reload };
}
