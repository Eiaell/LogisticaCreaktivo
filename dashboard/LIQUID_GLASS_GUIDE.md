# Liquid Glass Modal Styling Guide

## Completed
- ✅ `src/index.css` - Added complete Liquid Glass CSS system
- ✅ `src/components/ProduccionModal.tsx` - Applied liquid-glass-blue

## Pending Modal Updates

Apply these changes to the following files. The pattern is simple:

### 1. NuevoMovimientoModal.tsx
**Color:** `liquid-glass-emerald` (Logistics green)

```tsx
// Line ~122: Replace overlay
<div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4">

// Line ~123: Replace modal container
<div className="liquid-glass liquid-glass-emerald rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
```

### 2. EditarEventoModal.tsx
**Color:** `liquid-glass-purple` (Generic purple)

```tsx
// Line ~229: Replace overlay
<div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4">

// Line ~230: Replace modal container
<div className="liquid-glass liquid-glass-purple rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
```

### 3. SincronizarEventoModal.tsx
**Color:** `liquid-glass-cyan` (PKL/System)

```tsx
// Line ~268: Replace overlay
<div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4">

// Line ~274: Replace modal container - NOTE: Keep dark: prefix classes for light mode
<div className="liquid-glass liquid-glass-cyan rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
```

### 4. ImportarJSONModal.tsx
**Color:** `liquid-glass-amber` (Import/Warning)

Search for `createPortal` and update the overlay and container divs.

### 5. CotizacionesModal.tsx
**Color:** `liquid-glass-purple` (Quotations)

Search for `createPortal` and update the overlay and container divs.

### 6. NuevoPedidoModal.tsx
**Color:** `liquid-glass-blue` (Orders/Production)

Search for `createPortal` and update the overlay and container divs.

### 7. NuevoRequerimientoModal.tsx
**Color:** `liquid-glass-purple` (Requirements)

Search for `createPortal` and update the overlay and container divs.

### 8. PaymentsModal.tsx
**Color:** `liquid-glass-pink` (Payments)

Search for `createPortal` and update the overlay and container divs.

### 9. App.tsx - PagoRendicionModal
**Color:** `liquid-glass-pink` (Payments)

```tsx
// Line ~169: Replace overlay
<div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4">

// Line ~170: Replace modal container
<div className="liquid-glass liquid-glass-pink rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
```

### 10. Toast.tsx
Apply liquid glass with color-specific gradients:

```tsx
// Replace line 66 (in return statement)
<div className={`liquid-glass rounded-lg shadow-lg p-4 mb-3 flex items-center gap-3 min-w-[300px] max-w-md animate-slide-in-right ${getGlassClass()}`}>

// Update getStyles function to return glass class:
const getGlassClass = () => {
  switch (toast.type) {
    case 'success': return 'liquid-glass-emerald';
    case 'error': return 'liquid-glass-pink';
    case 'warning': return 'liquid-glass-amber';
    case 'info': return 'liquid-glass-cyan';
    default: return 'liquid-glass-purple';
  }
};
```

## What Changes

### Before (Old Style):
```tsx
<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]">
  <div className="bg-gray-900 border border-blue-500/50 rounded-2xl shadow-2xl">
```

### After (Liquid Glass):
```tsx
<div className="fixed inset-0 liquid-glass-overlay z-[9999]">
  <div className="liquid-glass liquid-glass-blue rounded-2xl">
```

## Key Features of Liquid Glass

1. **Advanced Blur**: 24px blur with 180% saturation
2. **Gradient Background**: Subtle color-to-dark gradient
3. **Reflection Effect**: Top pseudo-element with gradient
4. **Premium Shadows**: Multiple layered shadows with inset highlights
5. **Light Mode Support**: Automatically adapts with cleaner, whiter appearance
6. **Color Variants**: 6 purpose-specific color themes
7. **Smooth Transitions**: Hover states with transform and shadow changes

## Testing

After applying changes, test in both dark and light modes:
1. Toggle theme in app header
2. Open each modal type
3. Verify glass effect, borders, and shadows
4. Check readability and contrast
5. Ensure smooth animations

## Notes

- Remove `shadow-2xl` class as liquid-glass includes enhanced shadows
- Keep `rounded-2xl` for consistent border radius
- Keep all functional classes (flex, z-index, positioning)
- The overlay will now have proper blur backdrop effect
- Each modal gets its contextual color accent
