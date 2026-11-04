"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; message: string };
type ToastApi = { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };

const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId++;
    setItems((s) => [...s, { id, tone, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 5000);
  }, []);
  const api = useMemo<ToastApi>(() => ({ success: (m) => push("success", m), error: (m) => push("error", m), info: (m) => push("info", m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="no-print fixed bottom-4 right-4 z-[60] flex w-[min(92vw,24rem)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "flex items-start gap-2 rounded-md border bg-white p-3 text-sm shadow-lg",
              t.tone === "success" && "border-green-300",
              t.tone === "error" && "border-red-300",
              t.tone === "info" && "border-blue-300",
            )}
          >
            <Icon
              name={t.tone === "success" ? "check_circle" : t.tone === "error" ? "error" : "info"}
              className={cn("shrink-0", t.tone === "success" && "text-green-600", t.tone === "error" && "text-red-600", t.tone === "info" && "text-blue-700")}
            />
            <span className="text-slate-800">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
