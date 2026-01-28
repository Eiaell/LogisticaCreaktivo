# Ejemplo Visual de Auto-Linking PKL

## Vista del Usuario en el Modal

### Antes (Sin Auto-Linking)
```
┌────────────────────────────────────────────────┐
│  Nuevo Acuerdo de Producción            [X]   │
├────────────────────────────────────────────────┤
│                                                │
│  Cliente: [TYC                        ▼]      │
│  Proveedor: [PATRICIA                 ▼]      │
│  Descripción: Lanyards 2.5cm sublimados       │
│  Cantidad: 100                                 │
│  Precio: 350.00                                │
│                                                │
│  Vincular a PKL:                               │
│  [Sin vincular                        ▼]      │
│    Sin vincular                                │
│    PKL-2026-0001 - TYC - Ciclo completo       │
│    PKL-2026-0002 - LAR - Solo entrega         │
│    PKL-2026-0003 - TYC - Cotización           │
│    ... (50+ opciones)                          │
│                                                │
│  [Cancelar]              [Guardar Producción] │
└────────────────────────────────────────────────┘
```

### Después (Con Auto-Linking) ✨
```
┌────────────────────────────────────────────────┐
│  Nuevo Acuerdo de Producción            [X]   │
├────────────────────────────────────────────────┤
│                                                │
│  Cliente: [TYC                        ▼]      │
│  Proveedor: [PATRICIA                 ▼]      │
│  Descripción: Lanyards 2.5cm sublimados       │
│  Cantidad: 100                                 │
│  Precio: 350.00                                │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ 💡 PKLs Sugeridos (3)                    │ │
│  │                                          │ │
│  │ ┌──────────────────────────────────────┐ │ │
│  │ │ PKL-2026-0001          [95%] ✓       │ │ │  ← SELECCIONADO
│  │ │ TYC - Proyecto Cantúa                │ │ │
│  │ │ [Cliente] [Proveedor] [Fecha] [Act.] │ │ │
│  │ └──────────────────────────────────────┘ │ │
│  │                                          │ │
│  │ ┌──────────────────────────────────────┐ │ │
│  │ │ PKL-2026-0003          [65%]         │ │ │
│  │ │ TYC - Marketing 2026                 │ │ │
│  │ │ [Cliente] [Producto similar] [Act.]  │ │ │
│  │ └──────────────────────────────────────┘ │ │
│  │                                          │ │
│  │ ┌──────────────────────────────────────┐ │ │
│  │ │ PKL-2026-0008          [55%]         │ │ │
│  │ │ TYC - Evento Aniversario             │ │ │
│  │ │ [Cliente] [Fecha cercana]            │ │ │
│  │ └──────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Vincular a PKL:                               │
│  [PKL-2026-0001                   ▼] ← AUTO   │
│                                                │
│  [Cancelar]              [Guardar Producción] │
└────────────────────────────────────────────────┘
```

## Desglose de Elementos UI

### Badge de Score
```
[95%]  → Verde  (match excelente ≥80%)
[65%]  → Azul   (match bueno 60-79%)
[55%]  → Amarillo (match aceptable 50-59%)
```

### Chips de Razones
```
[Cliente coincide]      → Cliente exacto (+40 pts)
[Proveedor coincide]    → Proveedor en PKL (+30 pts)
[Fecha cercana (2d)]    → Fecha ≤7 días (+18 pts)
[Producto similar]      → Producto match (+10 pts)
[Activo]                → PKL no cerrado (+5 pts)
```

### Estados de Selección
```
┌──────────────────────────────────────┐
│ PKL-2026-0001          [95%] ✓      │  ← Seleccionado (borde azul brillante)
│ TYC - Proyecto Cantúa                │
│ [Cliente] [Proveedor] [Fecha] [Act.] │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ PKL-2026-0003          [65%]         │  ← No seleccionado (borde gris)
│ TYC - Marketing 2026                 │
│ [Cliente] [Producto similar] [Act.]  │
└──────────────────────────────────────┘
```

## Escenarios de Uso Real

### Escenario 1: Match Perfecto
**Input del Usuario:**
- Cliente: TYC
- Proveedor: PATRICIA
- Fecha: 2026-01-22
- Descripción: Lanyards 2.5cm

**PKL Sugerido:**
```
┌──────────────────────────────────────┐
│ PKL-2026-0001          [100%] ✓      │
│ TYC - Lanyards para evento Cantúa    │
│ [Cliente] [Proveedor] [Fecha exacta] │
│ [Producto] [Activo]                  │
└──────────────────────────────────────┘
```
**Resultado:** Usuario hace 1 click y el PKL está vinculado

### Escenario 2: Cliente Sin Proveedor
**Input del Usuario:**
- Cliente: LAR
- Proveedor: (vacío)
- Fecha: 2026-01-22
- Descripción: Pins metálicos

**PKL Sugerido:**
```
┌──────────────────────────────────────┐
│ PKL-2026-0012          [50%]         │
│ LAR - Material promocional           │
│ [Cliente] [Activo]                   │
└──────────────────────────────────────┘
```
**Resultado:** Score justo en el umbral, se muestra pero con advertencia visual (amarillo)

### Escenario 3: Sin Matches Buenos
**Input del Usuario:**
- Cliente: (vacío)
- Proveedor: NUEVO_PROVEEDOR
- Fecha: 2026-01-22

**PKL Sugerido:**
```
(No se muestra sección de sugerencias)
```
**Resultado:** Usuario usa selector manual normalmente

## Flujo de Interacción

```
Usuario completa campos
         │
         ▼
Sistema calcula matches en tiempo real (useMemo)
         │
         ▼
    ¿Score ≥ 50%?
    ┌────┴────┐
   SÍ         NO
    │          │
    ▼          ▼
Muestra      Oculta
sugerencias  sección
    │          │
    ▼          │
Usuario ve    │
top 3         │
    │          │
    ▼          │
Click en       │
sugerencia     │
    │          │
    ▼          ▼
Auto-selecciona en dropdown
         │
         ▼
   Listo para guardar
```

## Beneficios UX

1. **Reduce Tiempo**: De buscar en 50+ PKLs a 1 click
2. **Reduce Errores**: Matching inteligente evita selecciones incorrectas
3. **No Intrusivo**: Si no hay buenos matches, no molesta
4. **Transparente**: Usuario ve POR QUÉ se sugiere cada PKL
5. **Flexible**: Siempre puede ignorar y seleccionar manualmente

## Métricas Esperadas

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tiempo promedio vincular PKL | 20s | 3s | -85% |
| Errores de vinculación | 15% | <5% | -67% |
| PKLs sin vincular | 30% | <10% | -67% |
| Clicks para vincular | 3-5 | 1 | -80% |

