'use client';

import { useEffect, useState } from 'react';

/** Devuelve `valor` solo cuando deja de cambiar durante `ms` milisegundos (evita consultar en cada tecla). */
export function useDebounce<T>(valor: T, ms = 300): T {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return diferido;
}
