# Arquitectura del Sistema de Auto-Linking PKL

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                   USUARIO ABRE MODAL                        │
│           (Producción / Movimiento / Pago)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│          USUARIO COMPLETA CAMPOS BASE                       │
│  • Cliente                                                  │
│  • Proveedor (opcional)                                     │
│  • Fecha                                                    │
│  • Descripción/Productos                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼ useMemo recalcula cuando cambian deps
┌─────────────────────────────────────────────────────────────┐
│           findMatchingPKLs() - SCORING ENGINE               │
│                                                             │
│  Para cada PKL:                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✓ Cliente coincide?           +40 puntos            │  │
│  │ ✓ Proveedor en PKL?            +30 puntos            │  │
│  │ ✓ Fecha cercana (≤7 días)?     +10-20 puntos        │  │
│  │ ✓ Producto similar?            +10 puntos            │  │
│  │ ✓ PKL activo (no cerrado)?     +5 puntos             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Return: Array<PKLMatch> ordenado por score                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              RENDERIZADO CONDICIONAL                        │
│                                                             │
│  score ≥ 50?                                                │
│    SÍ → Mostrar <PKLSuggestions />                          │
│    NO → No mostrar sugerencias                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            COMPONENTE PKLSuggestions                        │
│                                                             │
│  Top 3 matches mostrados como chips clickeables:           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📋 PKL-2026-0001            [90%]                   │  │
│  │  TYC - Proyecto Cantúa                               │  │
│  │  [Cliente coincide] [Proveedor coincide] [Activo]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  onClick → setPklId(pkl.pkl_id)                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│         SELECTOR TRADICIONAL (siempre visible)              │
│  Dropdown con TODOS los PKLs disponibles                    │
│  Permite selección manual si sugerencias no son adecuadas   │
└─────────────────────────────────────────────────────────────┘
```

## Matriz de Scoring

| Criterio                | Puntos | Peso   | Ejemplo                          |
|-------------------------|--------|--------|----------------------------------|
| Cliente exacto          | +40    | 40%    | "TYC" === "TYC"                 |
| Proveedor en PKL        | +30    | 30%    | "PATRICIA" in pkl.proveedores   |
| Fecha cercana (0 días)  | +20    | 20%    | Mismo día                        |
| Fecha cercana (7 días)  | +10    | 10%    | Una semana de diferencia         |
| Producto similar        | +10    | 10%    | "lanyard" ≈ "Lanyards 2.5cm"    |
| PKL activo              | +5     | 5%     | estado !== 'cerrado_ok'         |
| **MÁXIMO POSIBLE**      | **105**| 105%   | Match perfecto                   |

### Umbrales de Visualización

- **Score < 50**: No se muestra (match débil)
- **Score 50-59**: Badge amarillo (match aceptable)
- **Score 60-79**: Badge azul (match bueno)
- **Score ≥ 80**: Badge verde (match excelente)

## Ejemplos de Casos de Uso

### Caso 1: Match Perfecto (95 puntos)
```typescript
Evento: {
  cliente: "TYC",
  proveedor: "PATRICIA",
  fecha: "2026-01-22",
  productos: ["Lanyards"]
}

PKL Existente: {
  cliente.nombre: "TYC",
  proveedores: [{ nombre: "PATRICIA" }],
  origen.fecha_solicitud: "2026-01-22",
  productos: [{ tipo: "lanyard" }],
  estado.actual: "en_produccion"
}

SCORE: 40 + 30 + 20 + 10 + 5 = 105 → ✅ SE MUESTRA (verde)
```

### Caso 2: Match Débil (45 puntos)
```typescript
Evento: {
  cliente: "LAR",
  fecha: "2026-01-22"
}

PKL Existente: {
  cliente.nombre: "LAR",
  origen.fecha_solicitud: "2026-01-10", // 12 días
  estado.actual: "cerrado_ok"
}

SCORE: 40 + 0 + 0 + 0 + 0 = 40 → ❌ NO SE MUESTRA
```

### Caso 3: Match Bueno sin Cliente Exacto (65 puntos)
```typescript
Evento: {
  proveedor: "HUGO LOGOS",
  fecha: "2026-01-20",
  productos: ["Pins", "Lanyards"]
}

PKL Existente: {
  proveedores: [{ nombre: "HUGO LOGOS" }],
  origen.fecha_solicitud: "2026-01-18", // 2 días
  productos: [{ tipo: "pin" }],
  estado.actual: "para_recoger"
}

SCORE: 0 + 30 + 18 + 10 + 5 = 63 → ✅ SE MUESTRA (azul)
```

## Optimizaciones Implementadas

### 1. Memoización con `useMemo`
```typescript
const pklMatches = useMemo(() => {
  if (!cliente && !proveedor) return [];
  return findMatchingPKLs({ cliente, proveedor, fecha, productos }, pkls, 5);
}, [cliente, proveedor, fecha, productos, pkls]);
```
- Evita recalcular en cada render
- Solo recalcula cuando cambian las dependencias
- Mejora performance en formularios grandes

### 2. Límite de Resultados
```typescript
findMatchingPKLs(evento, pkls, 5) // Top 5 matches
```
- Reduce carga de procesamiento
- UI muestra solo top 3
- Resto disponible en selector manual

### 3. Renderizado Condicional
```typescript
{pklMatches.length > 0 && (
  <PKLSuggestions matches={pklMatches} ... />
)}
```
- No renderiza DOM si no hay matches
- Mantiene UI limpia

## Componentes del Sistema

```
src/utils/pklMatcher.ts
├── findMatchingPKLs()      → Algoritmo principal
└── PKLMatch interface      → Tipo de retorno

src/components/PKLSuggestions.tsx
├── Props: matches, selectedPklId, onSelectPkl, minScore
├── Filtrado por minScore (default: 50)
├── Renderizado de top 3
└── Evento onClick → onSelectPkl(pklId)

src/components/ProduccionModal.tsx
src/components/NuevoMovimientoModal.tsx
src/App.tsx (PagoRendicionModal)
├── useMemo para calcular matches
├── <PKLSuggestions /> (condicional)
└── <select> tradicional (siempre visible)
```

## Testing Manual Sugerido

1. **Sin datos** → No debería mostrar sugerencias
2. **Solo cliente** → Si score ≥50, mostrar
3. **Cliente + Proveedor + Fecha cercana** → Score alto, badge verde
4. **Cliente similar pero no exacto** → Verificar que no matchea (case-sensitive)
5. **PKL cerrado vs activo** → El activo debería tener +5 puntos

## Extensiones Futuras

- [ ] Normalización de nombres (acentos, mayúsculas)
- [ ] Fuzzy matching para productos
- [ ] Considerar tipo de operación PKL
- [ ] Pesos configurables por usuario
- [ ] Machine learning: aprender de vinculaciones manuales
- [ ] Auto-vincular al crear (opción toggle)
