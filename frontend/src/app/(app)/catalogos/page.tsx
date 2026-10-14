'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  EstadoBadge,
  Field,
  Input,
  Modal,
  ModalFooter,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { useConceptos, useFrecuencias, useSesion } from '@/hooks/queries';
import { api } from '@/lib/api';
import type { ConceptoNomina, TipoConcepto } from '@/lib/types';

export default function CatalogosPage() {
  const { esAdmin } = useSesion();
  const conceptos = useConceptos();
  const frecuencias = useFrecuencias();
  const [concepto, setConcepto] = useState<ConceptoNomina | 'nuevo' | null>(null);

  return (
    <>
      <PageHeader
        title="Conceptos de pago"
        description="Bonos y descuentos que se pueden agregar a una boleta, y las formas de pago."
      />
      {!esAdmin && (
        <div className="mb-6">
          <Alert color="blue">Solo un administrador puede modificar los conceptos.</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Conceptos de pago"
            description="Bonos (suman) y descuentos (restan) que se pueden agregar a una boleta."
            actions={
              esAdmin && (
                <Button size="sm" onClick={() => setConcepto('nuevo')}>
                  <Plus className="size-4" /> Nuevo
                </Button>
              )
            }
          />
          {conceptos.isLoading ? (
            <Spinner />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Concepto</Th>
                  <Th>Tipo</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {conceptos.data?.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <p className="font-medium text-slate-900">{c.nombre}</p>
                      <p className="font-mono text-xs text-slate-500">{c.codigo}</p>
                    </Td>
                    <Td>
                      <span className="flex flex-wrap gap-1">
                        <EstadoBadge estado={c.tipo} />
                        {!c.activo && <Badge>Inactivo</Badge>}
                      </span>
                    </Td>
                    <Td className="text-right">
                      {c.esSistema ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-slate-400"
                          title="Lo calcula el sistema automáticamente"
                        >
                          <Lock className="size-3.5" /> Automático
                        </span>
                      ) : (
                        esAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => setConcepto(c)} aria-label={`Editar ${c.nombre}`}>
                            <Pencil className="size-4" />
                          </Button>
                        )
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Formas de pago" description="Fijas: el cálculo de fechas depende de ellas." />
          <Table>
            <tbody>
              {frecuencias.data?.map((f) => (
                <tr key={f.id}>
                  <Td className="font-medium text-slate-900">{f.nombre}</Td>
                  <Td className="text-slate-500">
                    {f.codigo === 'QUINCENAL' ? 'Del 1 al 15 y del 16 a fin de mes' : `Cada ${f.diasPeriodo} días`}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      {concepto && <ConceptoModal concepto={concepto === 'nuevo' ? undefined : concepto} onClose={() => setConcepto(null)} />}
    </>
  );
}

function ConceptoModal({ concepto, onClose }: { concepto?: ConceptoNomina; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [codigo, setCodigo] = useState(concepto?.codigo ?? '');
  const [nombre, setNombre] = useState(concepto?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoConcepto>(concepto?.tipo ?? 'PERCEPCION');
  const [activo, setActivo] = useState(concepto?.activo ?? true);

  const guardar = useMutation({
    mutationFn: () =>
      concepto
        ? api.patch(`/conceptos-nomina/${concepto.id}`, { nombre, tipo, activo })
        : api.post('/conceptos-nomina', { codigo, nombre, tipo }),
    onSuccess: () => {
      toast.success('Concepto guardado');
      queryClient.invalidateQueries({ queryKey: ['conceptos'] });
      onClose();
    },
  });

  return (
    <Modal open onClose={onClose} title={concepto ? 'Editar concepto' : 'Nuevo concepto'}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          guardar.mutate();
        }}
      >
        <Field label="Nombre">
          {(id) => (
            <Input
              id={id}
              value={nombre}
              required
              minLength={2}
              onChange={(e) => {
                setNombre(e.target.value);
                // Sugiere el código a partir del nombre: "Horas extra" → "HORAS_EXTRA"
                if (!concepto)
                  setCodigo(
                    e.target.value
                      .normalize('NFD')
                      .replace(/[̀-ͯ]/g, '')
                      .toUpperCase()
                      .replace(/[^A-Z0-9]+/g, '_')
                      .replace(/^_|_$/g, '')
                      .slice(0, 30),
                  );
              }}
            />
          )}
        </Field>
        <Field label="Código" hint="Identificador interno, no se puede cambiar después">
          {(id) => (
            <Input
              id={id}
              value={codigo}
              disabled={!!concepto}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              required
              className="font-mono"
            />
          )}
        </Field>
        <Field label="Tipo">
          {(id) => (
            <Select id={id} value={tipo} onChange={(e) => setTipo(e.target.value as TipoConcepto)}>
              <option value="PERCEPCION">Percepción (suma al pago)</option>
              <option value="DEDUCCION">Deducción (resta del pago)</option>
            </Select>
          )}
        </Field>
        {concepto && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="size-4 accent-emerald-600"
            />
            Activo
          </label>
        )}
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={guardar.isPending}>
            Guardar
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
