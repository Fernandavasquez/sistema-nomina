'use client';

import { useSyncExternalStore } from 'react';

const sinSuscripcion = () => () => {};

/**
 * `false` mientras se dibuja en el servidor (y durante la hidratación), `true` ya en el navegador.
 *
 * Los datos de la app viven en la caché de React Query del navegador. Si el servidor dibuja una
 * pantalla "sin datos" y el navegador la hidrata "con datos", React detecta la diferencia
 * (error de hidratación). Con este hook, lo que depende de esos datos solo se dibuja en el navegador.
 */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}
