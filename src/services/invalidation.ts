/**
 * Notificación de cambios de datos. Los hooks de consulta (useQuery) se vuelven a ejecutar cuando algún
 * servicio llama a notifyDataChanged(). La implementación real contra el backend debe llamarla después de
 * cada mutación exitosa (o reemplazarla por la invalidación de caché que se adopte).
 */
const listeners = new Set<() => void>();
let version = 0;

export const subscribeToChanges = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getDataVersion = () => version;
export function notifyDataChanged() {
  version += 1;
  listeners.forEach((l) => l());
}
