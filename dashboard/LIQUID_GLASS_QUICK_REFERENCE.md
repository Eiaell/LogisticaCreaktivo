# Liquid Glass - Quick Reference Card 🎨

## At a Glance
✅ **27 liquid-glass instances** across the codebase
✅ **6 color variants** + base overlay
✅ **9 files modified** with premium glass effects
✅ **Dark/Light mode** automatic adaptation

## Usage Pattern

### Modal Template
```tsx
<div className="fixed inset-0 liquid-glass-overlay z-[9999] ...">
  <div className="liquid-glass liquid-glass-{COLOR} rounded-2xl ...">
    {/* Your content */}
  </div>
</div>
```

## Color Quick Reference

| Class | When to Use | Example |
|-------|-------------|---------|
| `liquid-glass-blue` | Production, Manufacturing, Operations | ProduccionModal |
| `liquid-glass-emerald` | Logistics, Movement, Delivery | NuevoMovimientoModal |
| `liquid-glass-purple` | Generic, Events, Requirements | EditarEventoModal |
| `liquid-glass-pink` | Payments, Finance, Money | PagoRendicionModal |
| `liquid-glass-cyan` | PKL, System, Sync Operations | SincronizarEventoModal |
| `liquid-glass-amber` | Imports, Warnings, Alerts | ImportarJSONModal |
| `liquid-glass-overlay` | Modal backdrop/overlay | All modals |

## Key Features

### Visual Effects
- 🌊 **Blur**: 24px backdrop blur
- 🌈 **Gradient**: Subtle color-to-dark transition
- ✨ **Reflection**: Top pseudo-element highlight
- 🎭 **Shadow**: Multi-layer depth effect
- 🔲 **Border**: Color-matched subtle outline

### Technical Specs
- **Opacity**: 0.92-0.98 (maintains readability)
- **Saturation**: 180% for vivid blur
- **Transition**: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
- **Z-index**: 9999 for modals
- **Rounded**: 2xl (1rem) corners

## Modified Components

### Modals
1. ProduccionModal → Blue
2. NuevoMovimientoModal → Emerald
3. EditarEventoModal → Purple (3 instances)
4. SincronizarEventoModal → Cyan
5. ImportarJSONModal → Amber (2 instances)
6. PagoRendicionModal (App.tsx) → Pink
7. DiaADiaPage → Purple + Cyan (2 modals)

### Notifications
8. Toast → Dynamic (success/error/warning/info)

## Testing Quick Check

```bash
# Verify all implementations
grep -r "liquid-glass-" src --include="*.tsx" | wc -l
# Should return: 27

# Check CSS classes exist
grep "^\.liquid-glass" src/index.css | wc -l
# Should return: 16+ (8 classes × 2 with ::before)
```

## Common Patterns

### Remove These (Old)
```tsx
❌ bg-black/80 backdrop-blur-sm
❌ bg-gray-900 border border-{color}-500/50
❌ shadow-2xl
```

### Use These (New)
```tsx
✅ liquid-glass-overlay
✅ liquid-glass liquid-glass-{color}
✅ (shadows included in class)
```

## Light Mode Auto-Adaptation

Light mode automatically gets:
- Lighter background gradients (white-based)
- Reduced shadow intensity
- Adjusted border colors
- Maintained glass effect

No code changes needed!

## Pro Tips

1. **Always pair**: Use `liquid-glass` + `liquid-glass-{variant}`
2. **Keep borders subtle**: Built-in borders match color theme
3. **Don't stack shadows**: Remove `shadow-2xl` class
4. **Preserve layout**: Keep flex, grid, padding classes
5. **Test both themes**: Toggle light/dark to verify

## Browser Support

✅ Chrome/Edge 76+
✅ Firefox 103+
✅ Safari 15.4+
✅ iOS Safari 15.4+

Uses `-webkit-backdrop-filter` fallback for older Safari.

## Troubleshooting

**Glass effect not visible?**
- Check browser supports `backdrop-filter`
- Verify overlay is behind modal content
- Ensure z-index stacking is correct

**Text hard to read?**
- Glass class includes optimal opacity
- Check content color contrast
- Verify light mode adaptations

**Borders too strong/weak?**
- Borders are color-matched automatically
- Use original border utilities for exceptions

## Performance

- ✅ **CSS-only**: No JavaScript overhead
- ✅ **GPU accelerated**: blur and transform
- ✅ **60fps animations**: Smooth transitions
- ✅ **No layout shifts**: Predictable rendering

## Next Steps

Ready to create a new modal?
1. Copy template from top of this doc
2. Choose appropriate color variant
3. Add your content
4. Test in both light and dark mode
5. Done! 🎉

---

**Quick Links:**
- Full Implementation: `LIQUID_GLASS_IMPLEMENTATION_COMPLETE.md`
- Detailed Guide: `LIQUID_GLASS_GUIDE.md`
- CSS Source: `src/index.css` (lines 192-460)
