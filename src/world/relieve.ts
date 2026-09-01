/**
 * El relieve medido: de dónde sale y cómo se carga.
 *
 * Sale de **Copernicus DEM GLO-30**, que se puede usar comercialmente y gratis
 * con atribución obligatoria. Ver `docs/adr/0005-que-se-puede-comprar.md` y el
 * extractor en `scripts/copernicus-a-relieve.mjs`.
 *
 * Se carga aparte del paquete principal por dos razones. Son trescientos
 * kilobytes por escenario y solo los usan los que tienen aeródromo real; y el
 * terreno se construye de forma síncrona, así que pedirle al constructor del
 * juego que espere una descarga habría teñido de asíncrono medio motor. Se
 * pide antes, se pasa hecho.
 *
 * Vive aquí y no en `main.ts` porque lo necesitan dos: el juego y las
 * herramientas de comprobación. Cuando estaba solo en el arranque, el
 * comprobador de escenarios seguía mirando el relieve generado y decía que
 * Asunción tenía el once por ciento bajo el agua **después** de haberlo
 * arreglado.
 */

import type { Scenario } from './scenarios';

/**
 * Con `import.meta.glob` y no con una URL construida a mano.
 *
 * Así Vite emite el fichero al empaquetar y le pone su huella. Una ruta
 * relativa a `import.meta.url` funciona en desarrollo y desaparece en
 * producción, que es la clase de fallo que solo se ve una vez desplegado.
 */
const RELIEVES = import.meta.glob('../../data/terrain/*.bin', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** ¿Hay relieve medido para este escenario? */
export function hayRelieve(id: string): boolean {
  return Object.keys(RELIEVES).some((k) => k.endsWith(`/${id}.bin`));
}

/**
 * Carga el relieve de un escenario, o `undefined` si no hay o si falla.
 *
 * Que falle no puede dejar a nadie sin volar: sin mapa se juega con el relieve
 * generado, que es lo que había antes y sigue funcionando.
 */
export async function cargarRelieve(id: string): Promise<Scenario['relieve']> {
  const ruta = Object.entries(RELIEVES).find(([k]) => k.endsWith(`/${id}.bin`))?.[1];
  if (!ruta) return undefined;
  try {
    const res = await fetch(ruta);
    if (!res.ok) return undefined;
    const datos = new Int16Array(await res.arrayBuffer());
    const resolucion = Math.round(Math.sqrt(datos.length));
    return resolucion * resolucion === datos.length ? { datos, resolucion } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * El escenario con sus dos relieves puestos, si los tiene.
 *
 * Los dos se piden a la vez y no uno detrás de otro: son dos ficheros de
 * trescientos y pico kilobytes que no dependen entre sí, y encadenarlos era
 * duplicar la espera del arranque sin ningún motivo.
 */
export async function conRelieve(escenario: Scenario): Promise<Scenario> {
  const [relieve, relieveLejano] = await Promise.all([
    cargarRelieve(escenario.id),
    cargarRelieve(`${escenario.id}-lejos`),
  ]);
  if (!relieve && !relieveLejano) return escenario;
  return {
    ...escenario,
    ...(relieve ? { relieve } : {}),
    ...(relieveLejano ? { relieveLejano } : {}),
  };
}
