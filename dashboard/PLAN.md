# Plan de Mejoras - Pedidos y Cotizaciones

## Solicitud del Usuario
1. **Cliente editable inline** - Poder cambiar cliente después de crear pedido
2. **Cliente opcional en nueva cotización** - Permitir crear sin cliente inicial, agregarlo después
3. **Ocultar columnas financieras en cotización** - Precio/Pagado/Saldo solo visibles cuando Estado >= "Producción"
4. **Acceso directo a cotizaciones desde tabla** - Modal/drawer para agregar cotizaciones sin navegar a otra página

## Análisis Técnico Actual

### Estado Actual:
- `NuevoPedidoModal.tsx:173`: Valida `if (!clienteFinal) return;` - cliente es OBLIGATORIO
- `PedidosTable.tsx:343-372`: Cliente mostrado solo como display, sin edición inline
- `PedidosTable.tsx:291-304`: Headers definidos en array estático, no hay lógica condicional
- `PedidosTable.tsx`: Precio/Pagado/Saldo se muestran para TODOS los estados
- `CotizacionesPage.tsx`: Accesible solo como página separada via tab/navigation

### Cómo funciona updatePedido:
- `DatabaseContext.tsx:270-289`: `updatePedido(id, changes: Partial<Pedido>)`
- Línea 275-277: Mapea `cliente` → `cliente_nombre` para Supabase
- Acepta cambios parciales, incluyendo `cliente`
- Actualiza estado local y Supabase

## Plan de Implementación

### 1. Cliente Opcional en NuevoPedidoModal ✨
**Objetivo**: Permitir crear pedido sin cliente, agregarlo después

**Cambios**:
- Línea 550: Cambiar validación de `!clienteFinal` a `!itemForms.some(...)`
  - Remover requisito de cliente en el submit
  - Cliente es ahora OPCIONAL, no requerido
- Línea 147: Ajustar `clienteFinal` para manejar strings vacías: `cliente === '__nuevo__' ? nuevoCliente : cliente || ''`
- Línea 199: Pasar `cliente: clienteFinal || ''` - permitir strings vacías
- UI: Marcar cliente como "(Opcional)" en label

**Impacto**: Permitirá crear pedidos sin cliente especificado

---

### 2. Cliente Editable Inline en PedidosTable 🖊️
**Objetivo**: Poder cambiar cliente directamente en tabla con click-to-edit

**Cambios en PedidosTable.tsx**:

**2.1 Agregar estado para cliente en edición**:
- Línea 40: Expandir `editingCell` para soportar dropdown
- Agregar: `const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);`

**2.2 Reemplazar cliente display (línea 343-372)**:
- Si `editingCell?.field === 'cliente'`: Mostrar dropdown selector con todos los clientes
- Si no: Mostrar display actual con logo
- Dropdown tendrá búsqueda + grupos como en NuevoPedidoModal
- Botón de guardar/cancelar al editar

**2.3 Integrar con handleEditSave (línea 77-86)**:
- Agregar cliente a los campos editables
- Ya mapea automáticamente mediante `updatePedido(id, { cliente: val })`

**Estructura de UI**:
```
Click en cliente → Activa modo edición
  ↓
Mostrar dropdown selector (como en NuevoPedidoModal)
  ↓
Seleccionar cliente → updatePedido() → actualizar UI
```

---

### 3. Columnas Financieras Condicionales 💰
**Objetivo**: Ocultar Precio/Pagado/Saldo cuando Estado = 'cotizacion'

**Cambios en PedidosTable.tsx**:

**3.1 Hacer headers dinámicos (línea 291-304)**:
- Cambiar de array estático a función que retorna headers basado en estado
- Lógica: Si todos los pedidos mostrados son 'cotizacion', ocultar Precio/Pagado/Saldo
- O: Evaluar por pedido individual (más flexible)

**Opción elegida**: Por pedido (más flexible para mixed states)
- Mostrar columna siempre, pero cada celda decide si mostrar valor o "-"
- Cuando estado = 'cotizacion': mostrar "-"
- Cuando estado >= 'en_produccion': mostrar valores numéricos

**3.2 Actualizar celdas (línea ~470-490)**:
```typescript
{pedido.estado === 'cotizacion' ? (
  <span className="text-gray-600">-</span>
) : (
  <span onClick={() => handleEditStart(pedido.id, 'precio', pedido.precio)}>
    S/ {pedido.precio?.toFixed(2)}
  </span>
)}
```

---

### 4. Acceso Directo a Cotizaciones 📋
**Objetivo**: Modal para ver/agregar cotizaciones sin salir de la tabla

**Opciones evaluadas**:
- A) Drawer lateral que abre desde el botón expand
- B) Modal full que abre desde click en botón
- **Elegida: A** (drawer lateral) - menos disruptivo, visible junto a la fila

**Cambios en PedidosTable.tsx**:

**4.1 Agregar estado**:
- `const [cotizacionesModalPedidoId, setCotizacionesModalPedidoId] = useState<string | null>(null);`

**4.2 Agregar botón a fila expanded**:
```typescript
{expandedRowId === pedido.id && (
  <button onClick={() => setCotizacionesModalPedidoId(pedido.id)}>
    📋 Ver/Agregar Cotizaciones
  </button>
)}
```

**4.3 Crear CotizacionesModal reutilizable**:
- Extraer lógica de CotizacionesPage.tsx
- Crear `<CotizacionesModalDrawer pedidoId={id} onClose={() => ...} />`
- Mostrar solo cotizaciones para ese pedido
- Formulario para agregar nueva cotización

**Integración**:
```typescript
{cotizacionesModalPedidoId && (
  <CotizacionesModalDrawer
    pedidoId={cotizacionesModalPedidoId}
    onClose={() => setCotizacionesModalPedidoId(null)}
  />
)}
```

---

## Detalles Técnicos Clave

### Estados en Pedido:
- 'cotizacion' → No mostrar precios
- 'aprobado' → Mostrar precios
- 'aprobado_pendiente_cambios' → Mostrar precios
- 'en_produccion' → Mostrar precios
- 'listo' → Mostrar precios
- 'entregado' → Mostrar precios
- 'cerrado' → Mostrar precios

**Lógica**: `mostrarPrecios = pedido.estado !== 'cotizacion'`

### Cliente vacío:
- Supabase almacenará como string vacío `''` o `null`
- UI: Mostrar "Sin cliente" o "⚠️ Asignar cliente" cuando esté vacío
- Permitir click para editar incluso si está vacío

### Reuse de componentes:
- Aprovechar estructura de NuevoPedidoModal para selector de cliente
- Considerar extraer `ClienteSelector` como componente reutilizable
- CotizacionesPage.tsx ya tiene lógica de cotizaciones, reutilizar

## Secuencia de Implementación

1. **NuevoPedidoModal**: Hacer cliente opcional
2. **PedidosTable - Cliente editable**: Implementar dropdown inline
3. **PedidosTable - Columnas condicionales**: Ocultar finanzas en cotización
4. **CotizacionesModal**: Crear modal reutilizable + integrar en tabla

## Archivos a Modificar

- `src/components/NuevoPedidoModal.tsx` - cliente opcional
- `src/components/PedidosTable.tsx` - cliente editable + columnas condicionales + botón cotizaciones
- `src/components/CotizacionesModalDrawer.tsx` - **NUEVO** - modal reutilizable
- `src/context/DatabaseContext.tsx` - quizás agregar helper para cotizaciones por pedido (ya existe: `getCotizacionesPorPedido`)
