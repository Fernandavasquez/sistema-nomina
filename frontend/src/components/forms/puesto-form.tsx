'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Field, Input, Modal, ModalFooter, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import type { Puesto } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Si se pasa, el modal edita ese puesto; si no, crea uno nuevo. */
  puesto?: Puesto;
  /** Se llama con el puesto guardado (útil para seleccionarlo en un formulario). */
  onGuardado?: (puesto: Puesto) => void;
}

export function PuestoFormModal(props: Props) {
  return props.open ? <PuestoForm {...props} /> : null;
}

function PuestoForm({ onClose, puesto, onGuardado }: Props) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(puesto?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(puesto?.descripcion ?? '');
  const [activo, setActivo] = useState(puesto?.activo ?? true);

  const guardar = useMutation({
    mutationFn: () => {
      const body = { nombre, descripcion, activo };
      return puesto ? api.patch<Puesto>(`/puestos/${puesto.id}`, body) : api.post<Puesto>('/puestos', body);
    },
    onSuccess: async (guardado) => {
      toast.success(puesto ? 'Puesto actualizado' : `Puesto "${guardado.nombre}" creado`);
      await queryClient.invalidateQueries({ queryKey: ['puestos'] });
      onGuardado?.(guardado);
      onClose();
    },
  });

  return (
    <Modal open onClose={onClose} title={puesto ? 'Editar puesto' : 'Nuevo puesto'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          // Evita que el envío llegue al formulario de empleado cuando se abre desde allí.
          e.stopPropagation();
          guardar.mutate();
        }}
      >
        <Field label="Nombre del puesto" hint="Ej.: Piloto, Ayudante, Bodeguero">
          {(id) => (
            <Input
              id={id}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
              maxLength={100}
              autoFocus
            />
          )}
        </Field>
        <Field label="Descripción (opcional)">
          {(id) => (
            <Textarea id={id} rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={255} />
          )}
        </Field>
        {puesto && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="mt-0.5 size-4 accent-emerald-600"
            />
            <span>
              Activo
              <span className="block text-xs text-slate-500">
                Los puestos inactivos no aparecen al registrar empleados nuevos.
              </span>
            </span>
          </label>
        )}
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending} disabled={nombre.trim().length < 2}>
            {puesto ? 'Guardar cambios' : 'Crear puesto'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
