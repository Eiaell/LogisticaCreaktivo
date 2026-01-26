/**
 * Utilidades centralizadas para cálculo de costos de PKL (#12)
 * Evita duplicación de lógica entre PKLPage.tsx y SincronizarEventoModal.tsx
 */

import type { PKL, TaskPKL, DetalleCostoPKL } from '../types';

/**
 * Extrae el monto de un costo (puede ser número directo o objeto CostoTaskPKL)
 */
export const getCostoMonto = (costo: any): number => {
    if (!costo) return 0;
    if (typeof costo === 'number') return costo;
    if (typeof costo === 'object' && costo.monto) return Number(costo.monto);
    return 0;
};

/**
 * Calcula el costo total de los tasks de un PKL
 * NOTA: Excluye tasks de tipo 'cotizacion' porque una cotización es solo
 * un precio de referencia, NO un gasto real. Solo se suman gastos reales
 * como producción, movilidad, rendiciones, etc.
 */
export const calcularCostosTasks = (tasks: TaskPKL[] | undefined): number => {
    if (!tasks || tasks.length === 0) return 0;
    return tasks
        .filter(task => task.tipo !== 'cotizacion') // Excluir cotizaciones
        .reduce((sum, task) => sum + getCostoMonto(task.costo), 0);
};

/**
 * Calcula el costo de los detalles manuales (excluyendo los que ya tienen task_id)
 * Esto evita contar dos veces un costo que ya está en un task
 */
export const calcularCostosDetalle = (detalle: DetalleCostoPKL[] | undefined): number => {
    if (!detalle || detalle.length === 0) return 0;
    // Solo sumar costos manuales que NO tienen task_id (evitar duplicados)
    return detalle
        .filter(d => !d.task_id)
        .reduce((sum, d) => sum + (d.monto || 0), 0);
};

/**
 * Calcula el costo total de un PKL (tasks + costos manuales sin duplicados)
 * Esta es la función principal que debe usarse en toda la aplicación
 */
export const calcularCostoTotalPKL = (pkl: PKL): number => {
    const costosTasks = calcularCostosTasks(pkl.tasks);
    const costosDetalle = calcularCostosDetalle(pkl.costos?.detalle);
    return costosTasks + costosDetalle;
};

/**
 * Valida que un monto sea válido (no negativo, no NaN)
 */
export const validarMonto = (monto: number): { valid: boolean; error?: string } => {
    if (isNaN(monto)) {
        return { valid: false, error: 'El monto no es un número válido' };
    }
    if (monto < 0) {
        return { valid: false, error: 'El monto no puede ser negativo' };
    }
    return { valid: true };
};

/**
 * Formatea un monto para mostrar (con 2 decimales)
 */
export const formatearMonto = (monto: number, moneda: string = 'PEN'): string => {
    const simbolo = moneda === 'PEN' ? 'S/.' : '$';
    return `${simbolo} ${monto.toFixed(2)}`;
};
