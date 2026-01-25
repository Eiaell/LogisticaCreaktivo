import type { PKL } from '../types';

export interface PKLMatch {
  pkl: PKL;
  score: number; // 0-100
  reasons: string[]; // Por qué matchea
}

interface EventoData {
  cliente?: string;
  proveedor?: string;
  fecha: string;
  productos?: string[];
}

/**
 * Encuentra PKLs que potencialmente corresponden a un evento
 * basándose en cliente, proveedor, fecha y productos
 */
export function findMatchingPKLs(
  evento: EventoData,
  pkls: PKL[],
  limit?: number
): PKLMatch[] {
  const matches: PKLMatch[] = [];

  // Fecha del evento
  const fechaEvento = new Date(evento.fecha);

  pkls.forEach(pkl => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Cliente exacto: +40 puntos
    if (evento.cliente && pkl.cliente.nombre.toLowerCase().includes(evento.cliente.toLowerCase())) {
      score += 40;
      reasons.push('Cliente coincide');
    }

    // 2. Proveedor en pkl.proveedores: +30 puntos
    if (evento.proveedor) {
      const proveedorEnPKL = pkl.proveedores.some(p =>
        p.nombre.toLowerCase().includes(evento.proveedor!.toLowerCase()) ||
        (p.alias && p.alias.toLowerCase().includes(evento.proveedor!.toLowerCase()))
      );
      if (proveedorEnPKL) {
        score += 30;
        reasons.push('Proveedor coincide');
      }
    }

    // 3. Fecha dentro de 7 días: +20 puntos (escala proporcional)
    const fechaPKL = new Date(pkl.origen.fecha_solicitud);
    const diasDiferencia = Math.abs(
      Math.floor((fechaEvento.getTime() - fechaPKL.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (diasDiferencia <= 7) {
      // Escala: 0 días = 20 puntos, 7 días = 10 puntos
      const puntosFecha = Math.max(10, 20 - (diasDiferencia * 1.5));
      score += Math.round(puntosFecha);
      reasons.push(`Fecha cercana (${diasDiferencia} días)`);
    }

    // 4. Producto similar en pkl.productos: +10 puntos
    if (evento.productos && evento.productos.length > 0) {
      const productosCoinciden = evento.productos.some(prodEvento =>
        pkl.productos.some(prodPKL =>
          prodPKL.tipo.toLowerCase().includes(prodEvento.toLowerCase()) ||
          prodPKL.descripcion.toLowerCase().includes(prodEvento.toLowerCase()) ||
          prodEvento.toLowerCase().includes(prodPKL.tipo.toLowerCase())
        )
      );
      if (productosCoinciden) {
        score += 10;
        reasons.push('Producto similar');
      }
    }

    // 5. PKL en estado activo (no cerrado): +5 puntos
    const estadosActivos = ['recibido', 'cotizado', 'en_produccion', 'para_recoger', 'en_pausa'];
    if (estadosActivos.includes(pkl.estado.actual)) {
      score += 5;
      reasons.push('PKL activo');
    }

    // Solo agregar matches con score > 0
    if (score > 0) {
      matches.push({ pkl, score, reasons });
    }
  });

  // Ordenar por score descendente
  matches.sort((a, b) => b.score - a.score);

  // Limitar resultados si se especifica
  return limit ? matches.slice(0, limit) : matches;
}
