'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Upload } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Empleado } from '@/lib/types';

/**
 * Muestra y sube la foto del DPI. La imagen se descarga a través del proxy autenticado
 * (nunca es un archivo público) y se muestra con una URL temporal del navegador.
 */
export function FotoDpi({ empleado }: { empleado: Empleado }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const foto = useQuery({
    queryKey: ['empleado', empleado.id, 'foto', empleado.fotoDpi],
    enabled: !!empleado.fotoDpi,
    queryFn: async () => {
      const res = await fetch(`/api/backend/empleados/${empleado.id}/foto-dpi`);
      if (!res.ok) throw new Error('No se pudo cargar la foto');
      const blob = await res.blob();
      return { url: URL.createObjectURL(blob), esPdf: blob.type === 'application/pdf' };
    },
  });

  // Libera la memoria de la URL temporal al cambiar de foto o salir de la página.
  useEffect(() => {
    const url = foto.data?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [foto.data?.url]);

  const subir = useMutation({
    mutationFn: (archivo: File) => {
      const form = new FormData();
      form.append('archivo', archivo);
      return api.post<Empleado>(`/empleados/${empleado.id}/foto-dpi`, form);
    },
    onSuccess: () => {
      toast.success('Foto del DPI guardada');
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
        title="Foto del DPI"
        actions={
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} loading={subir.isPending}>
            <Upload className="size-4" /> {empleado.fotoDpi ? 'Cambiar' : 'Subir'}
          </Button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={onArchivo}
      />
      <div className="p-5">
        {!empleado.fotoDpi ? (
          <p className="text-sm text-slate-500">No se ha subido la foto. Formatos: JPG, PNG, WEBP o PDF (máx. 5 MB).</p>
        ) : foto.isLoading ? (
          <Spinner />
        ) : foto.data?.esPdf ? (
          <a
            href={foto.data.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline"
          >
            <FileText className="size-5" /> Ver documento PDF
          </a>
        ) : foto.data ? (
          <a href={foto.data.url} target="_blank" rel="noreferrer">
            <img src={foto.data.url} alt={`DPI de ${empleado.nombres}`} className="w-full rounded-lg border border-slate-200" />
          </a>
        ) : (
          <p className="text-sm text-red-600">No se pudo cargar la foto.</p>
        )}
      </div>
    </Card>
  );
}
