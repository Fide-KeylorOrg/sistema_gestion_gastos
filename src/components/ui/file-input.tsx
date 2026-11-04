"use client";

import { useId, useRef } from "react";
import { FILE_RULES, fileProblem } from "@/lib/validation";
import { formatBytes } from "@/lib/format";
import { Button } from "./button";
import { Icon } from "./icon";

/** Selector de archivo con validación de formato y tamaño. La carga real al servidor queda para el backend. */
export function FileInput({ id, file, onChange, error, onError, label = "Seleccionar archivo" }: {
  id?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  error?: string;
  onError?: (msg: string | undefined) => void;
  label?: string;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={ref}
          id={inputId}
          type="file"
          className="sr-only"
          accept={FILE_RULES.allowedExtensions.map((e) => `.${e}`).join(",")}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            const problem = fileProblem(f);
            onError?.(problem ?? undefined);
            onChange(problem ? null : f);
            if (problem) e.target.value = "";
          }}
        />
        <Button variant="secondary" icon="upload_file" onClick={() => ref.current?.click()}>
          {label}
        </Button>
        {file && (
          <span className="inline-flex items-center gap-2 text-[13px] text-slate-700">
            <Icon name="description" className="!text-base text-slate-400" />
            {file.name} ({formatBytes(file.size)})
            <button
              type="button"
              aria-label="Quitar archivo"
              className="text-slate-500 hover:text-red-600"
              onClick={() => {
                onChange(null);
                if (ref.current) ref.current.value = "";
              }}
            >
              <Icon name="close" className="!text-base" />
            </button>
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">{FILE_RULES.label}.</p>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
