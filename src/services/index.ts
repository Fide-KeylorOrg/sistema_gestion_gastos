import type { Services } from "./contracts";
import { demoServices } from "./demo";

/**
 * PUNTO ÚNICO DE INTEGRACIÓN CON EL BACKEND.
 * Hoy: implementación de demostración en memoria. Mañana: `httpServices` (fetch a los endpoints del backend).
 */
export const services: Services = demoServices;
export type { Services } from "./contracts";
