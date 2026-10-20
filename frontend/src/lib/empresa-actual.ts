/**
 * Empresa elegida en el selector del menú. Se recuerda en este navegador y viaja en cada
 * petición a la API en el encabezado X-Empresa-Id ("todas" = todas las empresas permitidas).
 */

export type SeleccionEmpresa = number | 'todas';

const CLAVE = 'nomina_empresa';
const oyentes = new Set<() => void>();

export function leerEmpresaActual(): SeleccionEmpresa {
  try {
    const valor = localStorage.getItem(CLAVE);
    if (valor && valor !== 'todas' && Number.isInteger(Number(valor))) return Number(valor);
  } catch {
    // Navegador sin almacenamiento (modo privado): se usa "todas".
  }
  return 'todas';
}

export function guardarEmpresaActual(valor: SeleccionEmpresa) {
  try {
    localStorage.setItem(CLAVE, String(valor));
  } catch {
    // Sin almacenamiento: la elección dura solo mientras la página está abierta.
  }
  oyentes.forEach((avisar) => avisar());
}

export function suscribirEmpresaActual(avisar: () => void) {
  oyentes.add(avisar);
  // También se entera si se cambia en otra pestaña.
  const enOtraPestana = (e: StorageEvent) => e.key === CLAVE && avisar();
  window.addEventListener('storage', enOtraPestana);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener('storage', enOtraPestana);
  };
}

/** Encabezado que se agrega a cada petición a la API. */
export function encabezadoEmpresa(): Record<string, string> {
  return { 'X-Empresa-Id': String(leerEmpresaActual()) };
}
