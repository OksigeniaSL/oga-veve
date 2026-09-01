/**
 * De dónde sale la ciudad de cada escenario.
 *
 * Igual que el relieve: fichero aparte, cargado antes de construir el mundo.
 * Son ciento y pico kilobytes por escenario y solo los usan los escenarios con
 * aeródromo real.
 */

import type { Ciudad } from './ciudad';

const CIUDADES = import.meta.glob('../../data/cities/*.city.json', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Descodifica base 64 a bytes, que es como viaja la rejilla. */
function bytes(b64: string): Uint8Array {
  const bruto = atob(b64);
  const salida = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) salida[i] = bruto.charCodeAt(i);
  return salida;
}

/**
 * Carga la ciudad de un escenario, o `undefined` si no hay o si falla.
 *
 * Que falle no puede dejar a nadie sin volar: sin ciudad se vuela sobre campo,
 * que es lo que había antes.
 */
export async function cargarCiudad(id: string): Promise<Ciudad | undefined> {
  const ruta = Object.entries(CIUDADES).find(([k]) => k.endsWith(`/${id}.city.json`))?.[1];
  if (!ruta) return undefined;
  try {
    const res = await fetch(ruta);
    if (!res.ok) return undefined;
    const j = await res.json();
    return {
      id: j.id,
      tamanoM: j.tamanoM,
      rejilla: {
        lado: j.rejilla.lado,
        clase: bytes(j.rejilla.clase),
        densidad: bytes(j.rejilla.densidad),
      },
      vias: j.vias,
    };
  } catch {
    return undefined;
  }
}
