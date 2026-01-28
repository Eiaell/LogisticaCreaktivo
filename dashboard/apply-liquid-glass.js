const fs = require('fs');
const path = require('path');

// Modal file configurations
const modalConfigs = [
  {
    file: 'src/components/NuevoMovimientoModal.tsx',
    variant: 'emerald',
    overlayPattern: /className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-\[9999\]/g,
    containerPattern: /className="bg-gray-900 border border-emerald-500\/50 rounded-2xl([^"]*?)shadow-2xl"/g
  },
  {
    file: 'src/components/EditarEventoModal.tsx',
    variant: 'purple',
    overlayPattern: /className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-\[9999\]/g,
    containerPattern: /className="bg-gray-900 border border-purple-500\/50 rounded-2xl([^"]*?)shadow-2xl"/g
  },
  {
    file: 'src/components/SincronizarEventoModal.tsx',
    variant: 'cyan',
    overlayPattern: /className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-\[9999\]/g,
    containerPattern: /className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl([^"]*?)shadow-2xl"/g
  },
  {
    file: 'src/components/ImportarJSONModal.tsx',
    variant: 'amber',
    overlayPattern: /className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-\[9999\]/g,
    containerPattern: /className="bg-gray-900 border border-[a-z]+-500\/50 rounded-2xl([^"]*?)shadow-2xl"/g
  },
  {
    file: 'src/components/CotizacionesModal.tsx',
    variant: 'purple',
    overlayPattern: /className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-\[9999\]/g,
    containerPattern: /className="bg-gray-900 border border-[a-z]+-500\/50 rounded-2xl([^"]*?)shadow-2xl"/g
  },
  {
    file: 'src/components/NuevoPedidoModal.tsx',
    variant: 'blue',
    overlayPattern: /className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-\[9999\]/g,
    containerPattern: /className="bg-gray-900 border border-[a-z]+-500\/50 rounded-2xl([^"]*?)shadow-2xl"/g
  },
  {
    file: 'src/components/NuevoRequerimientoModal.tsx',
    variant: 'purple',
    overlayPattern: /className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-\[9999\]/g,
    containerPattern: /className="bg-gray-900 border border-[a-z]+-500\/50 rounded-2xl([^"]*?)shadow-2xl"/g
  },
  {
    file: 'src/components/PaymentsModal.tsx',
    variant: 'pink',
    overlayPattern: /className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-\[9999\]/g,
    containerPattern: /className="bg-gray-900 border border-[a-z]+-500\/50 rounded-2xl([^"]*?)shadow-2xl"/g
  },
  {
    file: 'src/App.tsx',
    variant: 'pink',
    overlayPattern: /className="fixed inset-0 bg-black\/80 backdrop-blur-sm z-\[9999\]/g,
    containerPattern: /className="bg-gray-900 border border-purple-500\/50 rounded-2xl([^"]*?)shadow-2xl"/g
  }
];

function applyLiquidGlass() {
  let updatedCount = 0;
  let errorCount = 0;

  modalConfigs.forEach(config => {
    const filePath = path.join(__dirname, config.file);

    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${config.file}`);
        return;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Replace overlay
      if (config.overlayPattern.test(content)) {
        content = content.replace(
          config.overlayPattern,
          'className="fixed inset-0 liquid-glass-overlay z-[9999]'
        );
        modified = true;
        console.log(`✅ Updated overlay in ${config.file}`);
      }

      // Replace container - more flexible pattern
      const containerRegex = /className="([^"]*?)bg-gray-900([^"]*?)border border-[a-z]+-\d+\/\d+([^"]*?)rounded-2xl([^"]*?)"/g;
      if (containerRegex.test(content)) {
        content = content.replace(
          containerRegex,
          (match) => {
            // Extract all other classes except bg, border-color, and shadow-2xl
            const classes = match
              .replace(/className="/, '')
              .replace(/"$/, '')
              .split(' ')
              .filter(c =>
                !c.startsWith('bg-gray') &&
                !c.match(/^border-[a-z]+-/) &&
                c !== 'shadow-2xl' &&
                c !== 'border'
              )
              .join(' ');

            return `className="liquid-glass liquid-glass-${config.variant} ${classes}"`;
          }
        );
        modified = true;
        console.log(`✅ Updated container in ${config.file}`);
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        updatedCount++;
      } else {
        console.log(`ℹ️  No changes needed in ${config.file}`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${config.file}:`, error.message);
      errorCount++;
    }
  });

  console.log(`\n✨ Liquid Glass applied to ${updatedCount} files`);
  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} files had errors`);
  }
}

// Run the script
applyLiquidGlass();
