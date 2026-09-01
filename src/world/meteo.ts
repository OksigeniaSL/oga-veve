/**
 * El tiempo que hace: METAR de verdad, o el que se ponga a mano.
 *
 * ## Por qué METAR y no una API de tiempo cualquiera
 *
 * Porque es el formato que usan los pilotos, lo publican los propios
 * aeropuertos y dice exactamente lo que hace falta para volar: viento,
 * visibilidad, nubes y presión. Un servicio de tiempo general da la temperatura
 * de una ciudad; un METAR da el viento en la pista.
 *
 * Y porque **es de dominio público**. Los METAR mundiales los sirve la NOAA,
 * que es una agencia del gobierno de los Estados Unidos, así que sus datos no
 * tienen licencia que negociar. Eso importa aquí: Óga Veve es gratis para la
 * educación paraguaya y tiene que poder serlo sin pedirle permiso a nadie.
 *
 * ```
 * METAR GCXO 011930Z 29014KT 250V320 9999 FEW002 BKN010 21/18 Q1021 NOSIG
 * METAR SGAS 011900Z 18012KT 9999 OVC015 21/16 Q1016
 * ```
 *
 * El de arriba es Tenerife Norte con viento del 290 a 14 nudos, que es
 * justamente la pista 30 de frente; el de abajo, Asunción del 180 a 12, que es
 * la 20. Los dos aeropuertos del juego estaban ya operando esas cabeceras, pero
 * por estar escritas a mano. Ahora las elige el viento.
 *
 * ## Lo que falta para que esto sea en vivo
 *
 * El servidor de la NOAA **no manda cabecera CORS**, así que un navegador no
 * puede pedirle nada directamente: hay que pasar por un proxy propio. En
 * `workers/meteo.js` está el que hace falta, diez líneas para Cloudflare, y
 * mientras no esté puesto el juego usa el tiempo de por defecto sin enterarse
 * de nada. Volar no puede depender de que haya red.
 */

/** El tiempo, reducido a lo que cambia el vuelo. */
export interface Meteo {
  /** De dónde viene el viento, grados verdaderos. `null` si es variable o calma. */
  readonly vientoDe: number | null;
  /** Con qué fuerza, en nudos. */
  readonly vientoKt: number;
  /** Presión al nivel del mar, hPa. */
  readonly qnh: number;
  /** Temperatura en el aeropuerto, °C. */
  readonly temp: number;
  /** Base de las nubes, m sobre el aeropuerto. `null` si está despejado. */
  readonly techoM: number | null;
  /** Visibilidad, m. Diez mil quiere decir «diez o más». */
  readonly visibilidadM: number;
  /** De dónde salió: `'metar'` si es de verdad, `'defecto'` si es el de casa. */
  readonly fuente: 'metar' | 'defecto' | 'mano';
}

/**
 * El tiempo de por defecto: día bueno y viento flojo.
 *
 * No es calma total a propósito. Con viento cero la cabecera en uso sería un
 * empate y habría que desempatarlo con una moneda, y un aeropuerto que cambia
 * de cabecera cada partida no se aprende. Tres nudos del norte deciden sin
 * molestar a nadie.
 */
export const TIEMPO_DE_CASA: Meteo = {
  vientoDe: 0,
  vientoKt: 3,
  qnh: 1013,
  temp: 20,
  techoM: null,
  visibilidadM: 10000,
  fuente: 'defecto',
};

/**
 * Lee un METAR crudo.
 *
 * No pretende entenderlo entero —un METAR completo lleva tendencias, pistas
 * mojadas, cizalladura y una docena de cosas más— sino sacarle las cinco que
 * cambian un vuelo. Lo que no reconoce, lo ignora: un METAR con un grupo raro
 * tiene que seguir dando su viento.
 */
export function leerMetar(crudo: string): Meteo | null {
  const partes = crudo.trim().split(/\s+/);
  if (partes.length < 3) return null;

  let vientoDe: number | null = TIEMPO_DE_CASA.vientoDe;
  let vientoKt = TIEMPO_DE_CASA.vientoKt;
  let qnh = TIEMPO_DE_CASA.qnh;
  let temp = TIEMPO_DE_CASA.temp;
  let techoM: number | null = null;
  let visibilidadM = TIEMPO_DE_CASA.visibilidadM;
  let vistoViento = false;

  for (const p of partes) {
    // Viento: 29014KT, 18012G22KT, VRB03KT, 00000KT.
    const v = /^(\d{3}|VRB)(\d{2,3})(G\d{2,3})?(KT|MPS)$/.exec(p);
    if (v) {
      const fuerza = Number(v[2]);
      // En metros por segundo en algunos países; a nudos, que es lo que canta
      // la manga y lo que dice la carta.
      vientoKt = v[4] === 'MPS' ? Math.round(fuerza * 1.94384) : fuerza;
      // Variable o en calma no es una dirección: es la ausencia de una.
      vientoDe = v[1] === 'VRB' || vientoKt === 0 ? null : Number(v[1]);
      vistoViento = true;
      continue;
    }

    // Visibilidad: 9999 son diez kilómetros o más.
    if (/^\d{4}$/.test(p) && vistoViento) {
      visibilidadM = Number(p) === 9999 ? 10000 : Number(p);
      continue;
    }

    // Nubes: BKN010 son ocho octavos a mil pies. Solo cuentan las capas que
    // tapan —cielo roto o cubierto—, que son las que ponen techo.
    const n = /^(FEW|SCT|BKN|OVC)(\d{3})$/.exec(p);
    if (n) {
      if (n[1] === 'BKN' || n[1] === 'OVC') {
        const pies = Number(n[2]) * 100;
        const m = Math.round(pies * 0.3048);
        techoM = techoM === null ? m : Math.min(techoM, m);
      }
      continue;
    }

    // Temperatura y rocío: 21/18, M03/M07 con la eme de menos.
    const t = /^(M?\d{2})\/(M?\d{2})$/.exec(p);
    if (t) {
      temp = Number(t[1]!.replace('M', '-'));
      continue;
    }

    // Presión: Q1021 en hectopascales, A2992 en pulgadas de mercurio.
    const q = /^Q(\d{4})$/.exec(p);
    if (q) {
      qnh = Number(q[1]);
      continue;
    }
    const a = /^A(\d{4})$/.exec(p);
    if (a) qnh = Math.round(Number(a[1]) * 0.338639);
  }

  return vistoViento
    ? { vientoDe, vientoKt, qnh, temp, techoM, visibilidadM, fuente: 'metar' }
    : null;
}

/**
 * Pide el METAR de un aeropuerto a través del proxy propio.
 *
 * Devuelve el tiempo de casa si no hay proxy configurado, si la red falla o si
 * tarda demasiado. **Volar no puede depender de que haya red**: quien juega en
 * un colegio con la conexión caída tiene que poder despegar igual.
 */
export async function pedirMetar(icao: string, proxy: string | null): Promise<Meteo> {
  if (!proxy) return TIEMPO_DE_CASA;
  try {
    const corte = AbortSignal.timeout(4000);
    const res = await fetch(`${proxy}?icao=${encodeURIComponent(icao)}`, { signal: corte });
    if (!res.ok) return TIEMPO_DE_CASA;
    return leerMetar(await res.text()) ?? TIEMPO_DE_CASA;
  } catch {
    return TIEMPO_DE_CASA;
  }
}

/**
 * Cuánto viento de frente da una cabecera, en nudos.
 *
 * Negativo quiere decir viento de cola, que es lo que **no** se quiere: alarga
 * la carrera de despegue y acorta la pista que queda al aterrizar.
 */
export function deFrente(rumboPista: number, meteo: Meteo): number {
  if (meteo.vientoDe === null) return 0;
  const angulo = (((meteo.vientoDe - rumboPista + 540) % 360) - 180) * (Math.PI / 180);
  return meteo.vientoKt * Math.cos(angulo);
}
