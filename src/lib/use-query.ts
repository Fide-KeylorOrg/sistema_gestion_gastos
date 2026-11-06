"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getDataVersion, subscribeToChanges } from "@/services/invalidation";

/**
 * Consulta asíncrona a un servicio. `key` debe ser serializable e incluir todo lo que cambie el resultado
 * (filtros, ids). Se re-ejecuta sola cuando cambian los datos (notifyDataChanged).
 */
export function useQuery<T>(key: unknown[], fetcher: () => Promise<T>) {
  const version = useSyncExternalStore(subscribeToChanges, getDataVersion, () => 0);
  const fullKey = `${JSON.stringify(key)}#${version}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: "" });

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => !cancelled && setState({ key: fullKey, data }))
      .catch((e: unknown) => !cancelled && setState({ key: fullKey, error: e instanceof Error ? e.message : "Error al consultar los datos." }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  return {
    data: state.data,
    error: state.error ?? null,
    loading: state.key === "" && !state.error,
  };
}
