// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Query Processing Service
// ============================================

import {
  ExtraccionConsulta,
  ExtraccionPendientes,
  ExtraccionReporte,
  Proveedor,
  AcuerdoProduccion,
  MovimientoMovilidad,
} from '../models/types';
import {
  getProveedores,
  getProveedorByNombre,
  getAcuerdos,
  getPedidos,
  getPendientesHoy,
  getMovilidadHoy,
  getMovilidad,
  getGastos,
} from './storage';
import { generateResponse } from './extraction';

/**
 * Process a query and return a response
 */
export async function processQuery(consulta: ExtraccionConsulta): Promise<string> {
  try {
    switch (consulta.subtipo) {
      case 'historial_precios':
        return await handleHistorialPrecios(consulta);
      case 'historial_tiempos':
        return await handleHistorialTiempos(consulta);
      case 'proveedor':
        return await handleConsultaProveedor(consulta);
      case 'pedido':
        return await handleConsultaPedido(consulta);
      default:
        return await handleConsultaGeneral(consulta);
    }
  } catch (error) {
    console.error('[Query] Error processing query:', error);
    return 'Error al procesar la consulta. Intenta de nuevo.';
  }
}

/**
 * Handle price history queries
 */
async function handleHistorialPrecios(consulta: ExtraccionConsulta): Promise<string> {
  if (!consulta.proveedor) {
    return 'No especificaste el proveedor. ¿De quién quieres ver precios?';
  }

  const proveedor = await getProveedorByNombre(consulta.proveedor);
  if (!proveedor) {
    return `No encontré al proveedor "${consulta.proveedor}". ¿Está bien escrito el nombre?`;
  }

  let historial = proveedor.historialPrecios;

  // Filter by product if specified
  if (consulta.producto) {
    historial = historial.filter(h =>
      h.producto.toLowerCase().includes(consulta.producto!.toLowerCase())
    );
  }

  if (historial.length === 0) {
    return `No tengo registro de precios de ${proveedor.nombre}${consulta.producto ? ` para "${consulta.producto}"` : ''}.`;
  }

  // Sort by date descending
  historial.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Take last 5
  const ultimos = historial.slice(0, 5);

  let respuesta = `Historial de precios de ${proveedor.nombre}:\n`;
  for (const h of ultimos) {
    const fecha = new Date(h.fecha).toLocaleDateString('es-PE');
    respuesta += `• ${fecha}: ${h.cantidad} ${h.producto} - S/. ${h.precioTotal} (S/. ${h.precioUnitario.toFixed(2)} c/u)\n`;
  }

  return respuesta;
}

/**
 * Handle delivery time history queries
 */
async function handleHistorialTiempos(consulta: ExtraccionConsulta): Promise<string> {
  if (!consulta.proveedor) {
    return 'No especificaste el proveedor. ¿De quién quieres ver tiempos?';
  }

  const proveedor = await getProveedorByNombre(consulta.proveedor);
  if (!proveedor) {
    return `No encontré al proveedor "${consulta.proveedor}".`;
  }

  const historial = proveedor.historialTiempos;

  if (historial.length === 0) {
    return `No tengo registro de tiempos de entrega de ${proveedor.nombre}.`;
  }

  // Calculate average delay
  const totalDemora = historial.reduce((sum, h) => sum + (h.diasReales - h.diasPrometidos), 0);
  const promedioDemora = totalDemora / historial.length;

  let respuesta = `Tiempos de ${proveedor.nombre}:\n`;
  respuesta += `• Factor de demora actual: ${proveedor.factorDemora} días\n`;
  respuesta += `• Promedio real de demora: ${promedioDemora.toFixed(1)} días\n`;
  respuesta += `• Registros: ${historial.length} entregas\n`;

  if (promedioDemora > proveedor.factorDemora) {
    respuesta += `\n⚠️ Recomendación: Aumentar factor de demora a ${Math.ceil(promedioDemora)} días`;
  }

  return respuesta;
}

/**
 * Handle supplier info queries
 */
async function handleConsultaProveedor(consulta: ExtraccionConsulta): Promise<string> {
  if (!consulta.proveedor) {
    // List all suppliers
    const proveedores = await getProveedores();
    if (proveedores.length === 0) {
      return 'No hay proveedores registrados.';
    }

    let respuesta = 'Proveedores registrados:\n';
    for (const p of proveedores) {
      respuesta += `• ${p.nombre} - ${p.especialidad.join(', ')}\n`;
    }
    return respuesta;
  }

  const proveedor = await getProveedorByNombre(consulta.proveedor);
  if (!proveedor) {
    return `No encontré al proveedor "${consulta.proveedor}".`;
  }

  let respuesta = `${proveedor.nombre}:\n`;
  respuesta += `• Especialidad: ${proveedor.especialidad.join(', ')}\n`;
  if (proveedor.contacto) {
    respuesta += `• Contacto: ${proveedor.contacto}\n`;
  }
  if (proveedor.condicionesPago) {
    respuesta += `• Condiciones: ${proveedor.condicionesPago}\n`;
  }
  respuesta += `• Factor demora: ${proveedor.factorDemora} días\n`;
  respuesta += `• Historial: ${proveedor.historialPrecios.length} precios, ${proveedor.historialTiempos.length} tiempos`;

  return respuesta;
}

/**
 * Handle order queries
 */
async function handleConsultaPedido(consulta: ExtraccionConsulta): Promise<string> {
  const pedidos = await getPedidos();

  if (consulta.cliente) {
    const pedidosCliente = pedidos.filter(p =>
      p.cliente.toLowerCase().includes(consulta.cliente!.toLowerCase())
    );

    if (pedidosCliente.length === 0) {
      return `No encontré pedidos para "${consulta.cliente}".`;
    }

    let respuesta = `Pedidos de ${consulta.cliente}:\n`;
    for (const p of pedidosCliente.slice(0, 5)) {
      respuesta += `• ${p.descripcion} - ${p.estado}\n`;
    }
    return respuesta;
  }

  // General order status
  const activos = pedidos.filter(p => !['entregado', 'cerrado'].includes(p.estado));

  if (activos.length === 0) {
    return 'No hay pedidos activos.';
  }

  let respuesta = `${activos.length} pedidos activos:\n`;
  for (const p of activos.slice(0, 5)) {
    respuesta += `• ${p.cliente}: ${p.descripcion} (${p.estado})\n`;
  }

  return respuesta;
}

/**
 * Handle general queries using Claude
 */
async function handleConsultaGeneral(consulta: ExtraccionConsulta): Promise<string> {
  // Gather context
  const [proveedores, acuerdos, pedidos] = await Promise.all([
    getProveedores(),
    getAcuerdos(),
    getPedidos(),
  ]);

  const context = JSON.stringify({
    proveedores: proveedores.map(p => ({
      nombre: p.nombre,
      especialidad: p.especialidad,
      factorDemora: p.factorDemora,
    })),
    acuerdosRecientes: acuerdos.slice(-5),
    pedidosActivos: pedidos.filter(p => !['entregado', 'cerrado'].includes(p.estado)),
  }, null, 2);

  return await generateResponse(consulta.pregunta, context);
}

/**
 * Get pending items for today
 */
export async function processPendientes(pendientes: ExtraccionPendientes): Promise<string> {
  const { recoger, entregar, vigilar } = await getPendientesHoy();

  const hoy = new Date();
  const fechaStr = hoy.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let respuesta = `📋 Pendientes ${fechaStr}\n\n`;

  if (recoger.length > 0) {
    respuesta += 'RECOGER:\n';
    for (const a of recoger) {
      respuesta += `• ${a.proveedorNombre} - ${a.cantidad} ${a.producto}`;
      if (a.cliente) respuesta += ` (${a.cliente})`;
      respuesta += '\n';
    }
    respuesta += '\n';
  }

  if (entregar.length > 0) {
    respuesta += 'ENTREGAR:\n';
    for (const p of entregar) {
      respuesta += `• ${p.cliente} - ${p.descripcion}\n`;
    }
    respuesta += '\n';
  }

  if (vigilar.length > 0) {
    respuesta += 'PRODUCCIÓN (vigilar):\n';
    for (const a of vigilar) {
      const fecha = new Date(a.fechaPrometida).toLocaleDateString('es-PE');
      respuesta += `• ${a.proveedorNombre} - debe avisar ${fecha}\n`;
    }
  }

  if (recoger.length === 0 && entregar.length === 0 && vigilar.length === 0) {
    respuesta += 'No tienes pendientes registrados para hoy.';
  }

  return respuesta;
}

/**
 * Generate mobility report
 */
export async function processReporteMovilidad(reporte: ExtraccionReporte): Promise<string> {
  let movimientos: MovimientoMovilidad[];

  if (reporte.fechaInicio || reporte.fechaFin) {
    // Date range filter
    const todos = await getMovilidad();
    movimientos = todos.filter(m => {
      const fecha = new Date(m.fecha);
      if (reporte.fechaInicio) {
        const inicio = new Date(reporte.fechaInicio);
        if (fecha < inicio) return false;
      }
      if (reporte.fechaFin) {
        const fin = new Date(reporte.fechaFin);
        if (fecha > fin) return false;
      }
      return true;
    });
  } else {
    // Today's movements
    movimientos = await getMovilidadHoy();
  }

  if (movimientos.length === 0) {
    return 'No hay movimientos de movilidad registrados para el período solicitado.';
  }

  const fecha = new Date().toLocaleDateString('es-PE');
  let respuesta = `REPORTE DE MOVILIDAD - ${fecha}\n`;
  respuesta += 'Coordinador: Flaco\n\n';

  let total = 0;

  for (let i = 0; i < movimientos.length; i++) {
    const m = movimientos[i];
    respuesta += `${i + 1}. ${m.origen} → ${m.destino}\n`;
    respuesta += `   S/. ${m.costo.toFixed(2)} (${m.tipoTransporte})\n`;
    respuesta += `   ${m.proposito}\n\n`;
    total += m.costo;
  }

  respuesta += `──────────────────\n`;
  respuesta += `TOTAL: S/. ${total.toFixed(2)}`;

  return respuesta;
}

/**
 * Generate expense report
 */
export async function processReporteGastos(): Promise<string> {
  const gastos = await getGastos();

  if (gastos.length === 0) {
    return 'No hay gastos extraordinarios registrados.';
  }

  const noReembolsados = gastos.filter(g => !g.reembolsado);
  const totalPendiente = noReembolsados.reduce((sum, g) => sum + g.monto, 0);

  let respuesta = `GASTOS EXTRAORDINARIOS\n\n`;

  if (noReembolsados.length > 0) {
    respuesta += 'PENDIENTES DE REEMBOLSO:\n';
    for (const g of noReembolsados) {
      const fecha = new Date(g.fecha).toLocaleDateString('es-PE');
      respuesta += `• ${fecha}: S/. ${g.monto.toFixed(2)} - ${g.descripcion}\n`;
      if (g.aprobadoPor) {
        respuesta += `  (Aprobado por ${g.aprobadoPor})\n`;
      }
    }
    respuesta += `\nTOTAL PENDIENTE: S/. ${totalPendiente.toFixed(2)}`;
  } else {
    respuesta += 'No hay gastos pendientes de reembolso.';
  }

  return respuesta;
}

/**
 * Generate production status report
 */
export async function processReporteProduccion(): Promise<string> {
  const acuerdos = await getAcuerdos();

  const pendientes = acuerdos.filter(a => a.estado === 'pendiente');
  const listos = acuerdos.filter(a => a.estado === 'listo');
  const problemas = acuerdos.filter(a => a.estado === 'problema');

  let respuesta = `ESTADO DE PRODUCCIÓN\n\n`;

  if (problemas.length > 0) {
    respuesta += '⚠️ CON PROBLEMAS:\n';
    for (const a of problemas) {
      respuesta += `• ${a.proveedorNombre}: ${a.cantidad} ${a.producto}\n`;
    }
    respuesta += '\n';
  }

  if (listos.length > 0) {
    respuesta += '✅ LISTOS PARA RECOGER:\n';
    for (const a of listos) {
      respuesta += `• ${a.proveedorNombre}: ${a.cantidad} ${a.producto}\n`;
    }
    respuesta += '\n';
  }

  if (pendientes.length > 0) {
    respuesta += '⏳ EN PRODUCCIÓN:\n';
    for (const a of pendientes) {
      const fecha = new Date(a.fechaPrometida).toLocaleDateString('es-PE');
      respuesta += `• ${a.proveedorNombre}: ${a.cantidad} ${a.producto} (${fecha})\n`;
    }
  }

  if (pendientes.length === 0 && listos.length === 0 && problemas.length === 0) {
    respuesta += 'No hay producción activa registrada.';
  }

  return respuesta;
}
