# Auto-Linking de Eventos a PKLs - Implementación Completa

## Resumen

Se implementó la funcionalidad de **auto-linking inteligente** de eventos (producciones, movimientos, pagos/rendiciones) a PKLs existentes basándose en coincidencias de cliente, proveedor, fecha y productos.

## Archivos Creados

### 1. `src/utils/pklMatcher.ts`
Utilidad de matching con algoritmo de scoring:

**Criterios de puntuación:**
- Cliente exacto: +40 puntos
- Proveedor en PKL: +30 puntos  
- Fecha cercana (≤7 días): +10 a +20 puntos (proporcional)
- Producto similar: +10 puntos
- PKL activo (no cerrado): +5 puntos

**Interfaz principal:**
```typescript
findMatchingPKLs(
  evento: { cliente?, proveedor?, fecha, productos? },
  pkls: PKL[],
  limit?: number
): PKLMatch[]
```

Retorna matches ordenados por score descendente.

### 2. `src/components/PKLSuggestions.tsx`
Componente reutilizable que muestra las sugerencias de PKL:

**Características:**
- Muestra top 3 matches con score ≥50%
- Visualización del score con colores:
  - Verde: ≥80%
  - Azul: ≥60%
  - Amarillo: ≥50%
- Chips con razones de coincidencia
- Clickeable para auto-seleccionar
- Indicador visual de PKL seleccionado (✓)

## Archivos Modificados

### 3. `src/components/ProduccionModal.tsx`
- Importa `findMatchingPKLs` y `PKLSuggestions`
- Calcula matches en tiempo real usando `useMemo`
- Muestra sugerencias antes del selector de PKL
- Las sugerencias se actualizan al cambiar cliente, proveedor o descripción

### 4. `src/components/NuevoMovimientoModal.tsx`
- Implementa matching basado en cliente, proveedor, fecha e items
- Extrae productos de los items del movimiento
- Muestra sugerencias contextuales

### 5. `src/App.tsx` (PagoRendicionModal)
- Agrega imports de utilidades de matching
- Calcula sugerencias basadas en formData
- Integra componente PKLSuggestions antes del selector

## UX/UI Implementada

### Flujo de Usuario
1. Usuario abre modal para crear evento (producción/movimiento/pago)
2. Completa campos básicos (cliente, proveedor, fecha, descripción)
3. **Sistema calcula automáticamente PKLs relacionados**
4. Si hay matches buenos (score ≥50%), aparece sección "💡 PKLs Sugeridos"
5. Usuario puede:
   - Click en sugerencia → auto-selecciona el PKL
   - Ignorar sugerencias → seleccionar manualmente del dropdown
   - Ver todas las opciones en el selector tradicional

### Diseño Visual
- **Caja azul translúcida** con borde para sugerencias
- **Score badges** con colores semafóricos
- **Chips de razones** mostrando por qué matchea
- **Checkmark azul** en PKL seleccionado
- **Tooltip implicit** en chips de razones

## Ventajas de la Implementación

✅ **No intrusivo**: Las sugerencias no bloquean el flujo normal
✅ **Inteligente**: Score ponderado considera múltiples factores
✅ **Rápido**: `useMemo` evita recalcular innecesariamente
✅ **Escalable**: Fácil agregar nuevos criterios de matching
✅ **Reutilizable**: Componente compartido en 3 modales
✅ **Transparente**: Usuario ve por qué se sugiere cada PKL

## Testing Recomendado

1. **Caso ideal**: Cliente + Proveedor + Fecha cercana → Score ~90%
2. **Caso parcial**: Solo cliente → Score ~45% (no se muestra)
3. **Caso fuerte**: Cliente + Producto similar → Score ~50% (se muestra)
4. **Sin datos**: Sin cliente ni proveedor → No se calculan matches

## Extensiones Futuras

- Agregar peso por tipo de operación PKL
- Machine learning para mejorar scoring con histórico
- Auto-vincular al crear (opción configurable)
- Sugerencias en edición de eventos existentes
