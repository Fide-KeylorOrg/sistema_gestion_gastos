import { Badge } from "@/components/ui/badge";
import { ACTION_LABEL, MODULE_ACTIONS, MODULE_LABEL, MODULES, type PermissionKey } from "@/features/access/types";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export const UserStatusBadge = ({ active }: { active: boolean }) => <Badge tone={active ? "success" : "neutral"}>{active ? "Activo" : "Inactivo"}</Badge>;

/** Matriz de permisos módulo × acción (HU-9, 10, 11). Solo lectura si no se pasa onChange. */
export function PermissionMatrix({ value, onChange, error }: { value: PermissionKey[]; onChange?: (v: PermissionKey[]) => void; error?: string }) {
  const actions = ["consultar", "crear", "editar", "infoSalarial", "administrar"] as const;
  const toggle = (k: PermissionKey) => onChange?.(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">Permisos por módulo y acción</caption>
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Módulo</th>
              {actions.map((a) => (
                <th key={a} scope="col" className="px-3 py-2 text-center text-xs font-semibold uppercase text-slate-500">
                  {a === "administrar" ? "Administrar" : ACTION_LABEL[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m} className="border-t border-slate-100">
                <th scope="row" className="px-3 py-2 text-left font-medium text-slate-800">{MODULE_LABEL[m]}</th>
                {actions.map((a) => {
                  const applies = MODULE_ACTIONS[m].includes(a);
                  const key = `${m}.${a}` as PermissionKey;
                  return (
                    <td key={a} className={cn("px-3 py-2 text-center", a === "infoSalarial" && applies && "bg-red-50/40")}>
                      {!applies ? (
                        <span className="text-xs text-slate-400" aria-label="No aplica">—</span>
                      ) : onChange ? (
                        <input type="checkbox" className="size-4 accent-blue-700" checked={value.includes(key)} onChange={() => toggle(key)} aria-label={`${MODULE_LABEL[m]}: ${ACTION_LABEL[a]}`} />
                      ) : value.includes(key) ? (
                        <Icon name="check" className="text-green-600" />
                      ) : (
                        <Icon name="close" className="text-slate-300" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
