'use client';

import { useState, type ReactNode } from 'react';
import { Alert, Button, Field, Modal, ModalFooter, Textarea } from '@/components/ui';
import { dateTime } from '@/lib/format';
import type { Anulacion } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmar: (motivo: string) => void;
  titulo: string;
  children: ReactNode;
  loading?: boolean;
}

/**
 * Ventana para anular un período o una boleta: explica los efectos y exige un motivo,
 * que queda guardado en el historial junto con el usuario y la fecha.
 */
export function AnularModal(props: Props) {
  // Se monta solo al abrir: así el motivo empieza vacío cada vez.
  return props.open ? <AnularForm {...props} /> : null;
}

function AnularForm({ open, onClose, onConfirmar, titulo, children, loading }: Props) {
  const [motivo, setMotivo] = useState('');
  const valido = motivo.trim().length >= 10;

  return (
    <Modal open={open} onClose={onClose} title={titulo}>
      <div className="space-y-3 text-sm text-slate-600">{children}</div>
      <Field
        label="Motivo de la anulación"
        className="mt-4"
        hint="Obligatorio (mínimo 10 caracteres). Queda registrado con su usuario y la fecha."
      >
        {(id) => (
          <Textarea
            id={id}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            placeholder="Ej.: se pagó con un salario equivocado"
          />
        )}
      </Field>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={!valido} loading={loading} onClick={() => onConfirmar(motivo.trim())}>
          Anular
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/** Aviso rojo con el motivo, el usuario y la fecha de una anulación. texto: "Este período fue anulado". */
export function AvisoAnulacion({ texto, anulacion }: { texto: string; anulacion: Partial<Anulacion> }) {
  const quien = anulacion.anuladoPor ? `${anulacion.anuladoPor.nombre} ${anulacion.anuladoPor.apellido}` : 'un usuario';
  return (
    <Alert color="red">
      <p className="font-medium">
        {texto} por {quien} el {dateTime(anulacion.fechaAnulacion)}
      </p>
      {anulacion.motivoAnulacion && <p className="mt-1">Motivo: {anulacion.motivoAnulacion}</p>}
    </Alert>
  );
}
