/**
 * Forma común de respuesta de todos los servicios. El backend real debe devolver lo mismo
 * (o un adaptador que lo convierta): errores de campo para formularios y un mensaje general.
 */
export type FieldErrors = Record<string, string>;

export type ServiceError = {
  code: "VALIDATION" | "DUPLICATE" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "PENDING_BACKEND" | "UNKNOWN";
  message: string;
  fieldErrors?: FieldErrors;
};

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: ServiceError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (code: ServiceError["code"], message: string, fieldErrors?: FieldErrors): Result<never> => ({
  ok: false,
  error: { code, message, fieldErrors },
});
