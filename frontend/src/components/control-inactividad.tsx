'use client';

import { Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Modal, ModalFooter } from '@/components/ui';
import { MINUTOS_AVISO, MINUTOS_INACTIVIDAD } from '@/lib/sesion';

const LIMITE_MS = MINUTOS_INACTIVIDAD * 60_000;
const AVISO_MS = (MINUTOS_INACTIVIDAD - MINUTOS_AVISO) * 60_000;
/** Cada cuánto se renueva la cookie del servidor mientras el usuario está activo. */
const RENOVAR_CADA_MS = 5 * 60_000;
/** Se guarda en localStorage para que todas las pestañas abiertas compartan la misma actividad. */
const CLAVE = 'nomina:ultimaActividad';
const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

function leerUltimaActividad(): number {
  try {
    return Number(localStorage.getItem(CLAVE)) || Date.now();
  } catch {
    return Date.now();
  }
}

function guardarActividad(momento: number) {
  try {
    localStorage.setItem(CLAVE, String(momento));
  } catch {
    // Navegación privada sin almacenamiento: el control sigue funcionando en esta pestaña.
  }
}

let cerrando = false;

async function cerrarSesion() {
  // El intervalo revisa cada segundo: se evita cerrar la sesión varias veces seguidas.
  if (cerrando) return;
  cerrando = true;
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  window.location.assign('/login?motivo=inactividad');
}

/**
 * Cierra la sesión después de 1 hora sin usar el sistema.
 * Dos minutos antes muestra un aviso con cuenta regresiva para seguir conectado.
 */
export function ControlInactividad() {
  const [restanteMs, setRestanteMs] = useState<number | null>(null); // null = sin aviso
  const avisoVisible = useRef(false);
  const ultimaRenovacion = useRef(0);

  useEffect(() => {
    ultimaRenovacion.current = Date.now();
    guardarActividad(Date.now());
    let ultimaEscritura = 0;

    const registrarActividad = () => {
      // Con el aviso abierto, solo el botón "Seguir conectado" cuenta como actividad.
      if (avisoVisible.current) return;
      const ahora = Date.now();
      // Escribir en localStorage en cada movimiento del mouse sería excesivo: como máximo cada 10 s.
      if (ahora - ultimaEscritura > 10_000) {
        ultimaEscritura = ahora;
        guardarActividad(ahora);
      }
      if (ahora - ultimaRenovacion.current > RENOVAR_CADA_MS) {
        ultimaRenovacion.current = ahora;
        void fetch('/api/auth/renovar', { method: 'POST' });
      }
    };

    const revisar = () => {
      const inactivo = Date.now() - leerUltimaActividad();
      if (inactivo >= LIMITE_MS) {
        void cerrarSesion();
      } else if (inactivo >= AVISO_MS) {
        avisoVisible.current = true;
        setRestanteMs(LIMITE_MS - inactivo);
      } else if (avisoVisible.current) {
        // Otra pestaña registró actividad: se cierra el aviso aquí también.
        avisoVisible.current = false;
        setRestanteMs(null);
      }
    };

    EVENTOS.forEach((e) => window.addEventListener(e, registrarActividad, { passive: true }));
    const intervalo = setInterval(revisar, 1000);
    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, registrarActividad));
      clearInterval(intervalo);
    };
  }, []);

  function seguirConectado() {
    const ahora = Date.now();
    guardarActividad(ahora);
    ultimaRenovacion.current = ahora;
    void fetch('/api/auth/renovar', { method: 'POST' }).then((r) => {
      if (!r.ok) void cerrarSesion(); // la sesión ya había vencido en el servidor
    });
    avisoVisible.current = false;
    setRestanteMs(null);
  }

  if (restanteMs === null) return null;

  const segundos = Math.max(0, Math.ceil(restanteMs / 1000));
  const reloj = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

  return (
    <Modal open onClose={seguirConectado} title="¿Sigue ahí?">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Clock className="size-6" />
        </span>
        <div className="text-sm text-slate-600">
          <p>Por seguridad, la sesión se cerrará después de {MINUTOS_INACTIVIDAD} minutos sin actividad.</p>
          <p className="mt-2">
            Se cerrará en <strong className="tabular text-lg text-slate-900">{reloj}</strong>
          </p>
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Button>
        <Button onClick={seguirConectado}>Seguir conectado</Button>
      </ModalFooter>
    </Modal>
  );
}
