import { useDatabase } from '../context/DatabaseContext';

export function useAutoBackup() {
  const { clientes, proveedores, pedidos, cotizaciones } = useDatabase();

  const createBackup = () => {
    const backup = {
      meta: {
        type: 'backup_completo',
        timestamp: new Date().toISOString(),
        version: 1
      },
      clientes: Object.values(clientes),
      proveedores: Object.values(proveedores),
      pedidos,
      cotizaciones
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    link.href = url;
    link.download = `backup_${fecha}_${hora}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ Backup descargado:', link.download);
    return backup;
  };

  return { createBackup };
}
