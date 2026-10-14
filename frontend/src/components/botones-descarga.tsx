'use client';

import { FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { descargarArchivo } from '@/lib/descargar';

/**
 * Botones "Excel" y "PDF" para un reporte. `ruta` es la ruta del reporte en la API
 * (con sus filtros), sin el parámetro `formato`.
 */
export function BotonesDescarga({ ruta, size = 'md' }: { ruta: string; size?: 'sm' | 'md' }) {
  const [descargando, setDescargando] = useState<'xlsx' | 'pdf' | null>(null);

  async function descargar(formato: 'xlsx' | 'pdf') {
    setDescargando(formato);
    try {
      const separador = ruta.includes('?') ? '&' : '?';
      await descargarArchivo(`${ruta}${separador}formato=${formato}`, `reporte.${formato}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDescargando(null);
    }
  }

  return (
    <>
      <Button variant="secondary" size={size} onClick={() => descargar('xlsx')} loading={descargando === 'xlsx'}>
        {descargando !== 'xlsx' && <FileSpreadsheet className="size-4 text-emerald-600" />} Excel
      </Button>
      <Button variant="secondary" size={size} onClick={() => descargar('pdf')} loading={descargando === 'pdf'}>
        {descargando !== 'pdf' && <FileText className="size-4 text-red-600" />} PDF
      </Button>
    </>
  );
}
