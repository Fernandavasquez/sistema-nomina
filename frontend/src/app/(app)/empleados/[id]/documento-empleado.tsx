'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { encabezadoEmpresa } from '@/lib/empresa-actual';
import type { Empleado } from '@/lib/types';

/** Documentos que se pueden adjuntar al empleado (ruta en el API → columna y textos). */
const DOCUMENTOS = {
  'foto-dpi': { campo: 'fotoDpi', titulo: 'Foto del DPI', guardado: 'Foto del DPI guardada' },
  'recibo-luz': { campo: 'reciboLuz', titulo: 'Recibo de luz', guardado: 'Recibo de luz guardado' },
  licencia: { campo: 'licenciaConducir', titulo: 'Licencia de conducir', guardado: 'Licencia de conducir guardada' },
} as const;

export type TipoDocumento = keyof typeof DOCUMENTOS;

/**
 * Muestra y sube un documento del empleado (foto o PDF). El archivo se descarga a través del
 * proxy autenticado (nunca es un archivo público) y se muestra con una URL temporal del navegador.
 */
export function DocumentoEmpleado({ empleado, tipo }: { empleado: Empleado; tipo: TipoDocumento }) {
  const { campo, titulo, guardado } = DOCUMENTOS[tipo];
  const archivoGuardado = empleado[campo];
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const documento = useQuery({
    queryKey: ['empleado', empleado.id, tipo, archivoGuardado],
    enabled: !!archivoGuardado,
    queryFn: async () => {
      const res = await fetch(`/api/backend/empleados/${empleado.id}/${tipo}`, { headers: encabezadoEmpresa() });
      if (!res.ok) throw new Error('No se pudo cargar el archivo');
      const blob = await res.blob();
      return { url: URL.createObjectURL(blob), esPdf: blob.type === 'application/pdf' };
    },
  });

  // Libera la memoria de la URL temporal al cambiar de archivo o salir de la página.
  useEffect(() => {
    const url = documento.data?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [documento.data?.url]);

  const subir = useMutation({
    mutationFn: (archivo: File) => {
      const form = new FormData();
      form.append('archivo', archivo);
      return api.post<Empleado>(`/empleados/${empleado.id}/${tipo}`, form);
    },
    onSuccess: () => {
      toast.success(guardado);
      queryClient.invalidateQueries({ queryKey: ['empleado', empleado.id] });
    },
  });

  function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (archivo.size > 5 * 1024 * 1024) {
      toast.error('El archivo no debe superar 5 MB');
      return;
    }
    subir.mutate(archivo);
  }

  return (
    <Card>
      <CardHeader
        title={titulo}
        actions={
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} loading={subir.isPending}>
            <Upload className="size-4" /> {archivoGuardado ? 'Cambiar' : 'Subir'}
          </Button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        aria-label={`Archivo: ${titulo}`}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={onArchivo}
      />
      <div className="p-5">
        {!archivoGuardado ? (
          <p className="text-sm text-slate-500">No se ha subido. Formatos: foto (JPG, PNG, WEBP) o PDF, máx. 5 MB.</p>
        ) : documento.isLoading ? (
          <Spinner />
        ) : documento.data?.esPdf ? (
          <a
            href={documento.data.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline"
          >
            <FileText className="size-5" /> Ver documento PDF
          </a>
        ) : documento.data ? (
          <a href={documento.data.url} target="_blank" rel="noreferrer">
            <img
              src={documento.data.url}
              alt={`${titulo} de ${empleado.nombres}`}
              className="w-full rounded-lg border border-slate-200"
            />
          </a>
        ) : (
          <p className="text-sm text-red-600">No se pudo cargar el archivo.</p>
        )}
      </div>
    </Card>
  );
}
