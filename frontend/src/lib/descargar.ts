/**
 * Descarga un archivo de la API (Excel, PDF) a través del proxy autenticado
 * y lo guarda con el nombre que indica el servidor.
 */
export async function descargarArchivo(ruta: string, nombrePorDefecto: string): Promise<void> {
  const res = await fetch(`/api/backend${ruta}`);
  if (res.status === 401) {
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    return;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? 'No se pudo generar el archivo');
  }

  // Content-Disposition: attachment; filename="planilla-semana-1-2026.xlsx"
  const nombre = res.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1] ?? nombrePorDefecto;
  const url = URL.createObjectURL(await res.blob());
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Se libera la memoria cuando el navegador ya inició la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
