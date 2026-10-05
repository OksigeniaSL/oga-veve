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

import { AIRE_ESTANDAR, aireDelParte, type Aire } from "../flight/atmosphere";

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
  /**
   * Cuánto cielo tapa la capa que hace techo, de 0 a 1, **como lo dice el
   * parte**: BKN es casi todo y OVC todo. Sin él, lo decidía la altura de la
   * capa —por debajo de trescientos metros 0,9, por encima 0,45—, y un cielo
   * cubierto a mil pies salía como una capa rala. `undefined` si no lo sabe.
   */
  readonly tapadura?: number;
  /**
   * Si llueve, y de qué manera.
   *
   * Pedido con el resto del tiempo: «falta paisaje… climatología, atravesar
   * mar de nubes o nubes, **lluvia, tormenta**, sol, amanecer, atardecer».
   *
   * Cuatro escalones y no un número, porque **no son lo mismo**: la llovizna
   * moja el parabrisas y no se oye; la lluvia se oye y quita visibilidad; la
   * tormenta además tiene rayos y baches. Un solo número de «cuánto llueve» no
   * puede decir eso, y un niño que oiga un trueno tiene que estar en tormenta
   * y no en «lluvia 0,9».
   */
  readonly lluvia: Lluvia;
  /**
   * Con cuánta fuerza cae, de cero a uno.
   *
   * Es el `-` y el `+` del METAR: `-RA` es lluvia floja y `+RA` es un
   * aguacero. Van aparte de la clase porque son cosas distintas — puede
   * caer una tormenta floja y una lluvia muy fuerte.
   */
  readonly fuerzaDeLluvia: number;
  /**
   * **Si graniza, y cuánto**, de cero a uno: el `GR` y el `GS` del METAR.
   *
   * `GR` es granizo de verdad, de más de cinco milímetros; `GS`, el pequeño
   * y la nieve granulada, que pegan menos. Va aparte de la lluvia porque no
   * cambia lo que se ve por el parabrisas igual que el agua y sí cambia lo
   * que se oye: piedra contra chapa. Sin poner, no graniza. Ver
   * `audio/ruidos.ts`.
   */
  readonly granizo?: number;
  /**
   * **Las rachas**, nudos: el `G` del grupo del viento —`18012G22KT` son doce
   * con rachas de veintidós—. Sin poner, no hay rachas.
   *
   * Hacen falta para decidir si hoy se sale: el viento cruzado de un avión se
   * compara **con las rachas dentro**, como lo hace la tabla de cualquier
   * manual de vuelo. Ver `flight/parte-de-salida.ts`.
   */
  readonly rachaKt?: number;
  /**
   * **Si la tormenta está encima del campo**, y no en las cercanías: `TS` y
   * no `VCTS`. Las dos son «tormenta» para lo que se ve y se oye —ver
   * `lluvia`—, pero para decidir si se sale no son lo mismo: con una en las
   * cercanías se mira hacia dónde va; con una encima, no se sale. Sin poner,
   * no la hay.
   */
  readonly tormentaEncima?: boolean;
  /**
   * **El parte tal cual llegó**, si llegó uno. La tarjeta del tiempo lo
   * enseña entero en el peldaño de cabina, que es como lo lee un piloto: los
   * grupos del METAR no se traducen, igual que los rótulos de los relojes.
   */
  readonly crudo?: string;
  /** De dónde salió: `'metar'` si es de verdad, `'defecto'` si es el de casa. */
  readonly fuente: "metar" | "defecto" | "mano";
}

/**
 * Las cuatro maneras de que caiga agua que este juego distingue.
 *
 * Sin nieve: en Asunción y en Canarias no cae nieve en ninguno de los
 * aeropuertos del juego, y meter un caso que no se puede ver ni probar es
 * meter código muerto. El día que haya un campo donde nieve, entra aquí.
 *
 * **El granizo sí cae**, en las tormentas de los dos sitios, y va aparte:
 * ver `Meteo.granizo`.
 */
export type Lluvia = "nada" | "llovizna" | "lluvia" | "tormenta";

/**
 * El tiempo de por defecto: día bueno y viento flojo.
 *
 * No es calma total a propósito. Con viento cero la cabecera en uso sería un
 * empate y habría que desempatarlo con una moneda, y un aeropuerto que cambia
 * de cabecera cada partida no se aprende. Tres nudos del norte deciden sin
 * molestar a nadie.
 *
 * **Y por encima de esto manda el viento del sitio**, cuando el sitio tiene
 * uno: ver `vientoDeCasa` y `Scenario.vientoDominante`. Este queda para los
 * escenarios inventados, que no tienen clima que copiar.
 */
export const TIEMPO_DE_CASA: Meteo = {
  vientoDe: 0,
  vientoKt: 3,
  qnh: 1013,
  temp: 20,
  techoM: null,
  visibilidadM: 10000,
  lluvia: "nada",
  fuerzaDeLluvia: 0,
  fuente: "defecto",
};

/**
 * El tiempo de por defecto **de un sitio concreto**.
 *
 * Sin METAR, el juego daba tres nudos del norte en los once campos, y de ahí
 * salía la cabecera en uso — que en Tenerife Norte daba siempre la 30. Jugando:
 *
 * > «No entiendo por qué en TFN siempre se despega igual, hacia la 30 cuando lo
 * > normal es 12. Una cosa que no sé si te has olvidado es el realismo: el 80 %
 * > del tiempo, el viento en ese aeropuerto viene del norte.»
 *
 * Y tiene razón, con un matiz que es justo el que decide: en Canarias el viento
 * dominante es el **alisio**, que viene del nordeste y no del norte franco. Con
 * norte franco gana la 30 —el juego estaba haciendo bien la cuenta con un dato
 * equivocado— y con nordeste gana la 12, que es la que opera de verdad y la que
 * lleva el ILS.
 *
 * Así que cada campo trae el suyo, de su climatología, y con él sale sola la
 * cabecera preferente sin escribirla a mano en ningún sitio. Un METAR de verdad
 * lo sustituye: ese día se opera como se opere ese día, que es la lección.
 *
 * **Y no solo el viento.** Lo que trae cada campo es su tiempo típico entero:
 * el alisio **y su capa de estratocúmulos**, que en Canarias es el mar de nubes
 * y es lo que se ve desde el aire antes que nada; el bochorno del Paraguay con
 * sus cúmulos de tarde. Sin esto el cielo estaba vacío en todos los vuelos
 * —solo había nubes si llegaba un METAR que las anunciara— y eso es la mitad de
 * «falta paisaje».
 */
export function vientoDeCasa(dominante: Partial<Meteo> | undefined): Meteo {
  if (!dominante) return TIEMPO_DE_CASA;
  return { ...TIEMPO_DE_CASA, ...dominante, fuente: "defecto" };
}

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
  let tapadura: number | undefined;
  let visibilidadM = TIEMPO_DE_CASA.visibilidadM;
  let lluvia: Lluvia = "nada";
  let fuerzaDeLluvia = 0;
  let granizo = 0;
  let vistoViento = false;
  let rachaKt = 0;
  let tormentaEncima = false;
  /*
   * Lo que viene detrás de `TEMPO`, `BECMG` o `NOSIG` es la tendencia, lo que
   * se espera, y no lo que hay. Para el cielo de hoy se lee igual —ver la
   * lluvia, abajo—, pero «tormenta encima» habla de ahora y solo puede salir
   * de lo de antes.
   */
  let enLaTendencia = false;

  for (const p of partes) {
    if (p === "TEMPO" || p === "BECMG" || p === "NOSIG" || p === "RMK")
      enLaTendencia = true;
    // Viento: 29014KT, 18012G22KT, VRB03KT, 00000KT.
    const v = /^(\d{3}|VRB)(\d{2,3})(G\d{2,3})?(KT|MPS)$/.exec(p);
    if (v) {
      const fuerza = Number(v[2]);
      // En metros por segundo en algunos países; a nudos, que es lo que canta
      // la manga y lo que dice la carta.
      const aNudos = (n: number): number =>
        v[4] === "MPS" ? Math.round(n * 1.94384) : n;
      vientoKt = aNudos(fuerza);
      if (v[3]) rachaKt = aNudos(Number(v[3].slice(1)));
      // Variable o en calma no es una dirección: es la ausencia de una.
      vientoDe = v[1] === "VRB" || vientoKt === 0 ? null : Number(v[1]);
      vistoViento = true;
      continue;
    }

    // Visibilidad: 9999 son diez kilómetros o más.
    if (/^\d{4}$/.test(p) && vistoViento) {
      visibilidadM = Number(p) === 9999 ? 10000 : Number(p);
      continue;
    }

    /*
     * El tiempo presente: `RA`, `-RA`, `+TSRA`, `SHRA`, `DZ`, `VCTS`…
     *
     * El grupo lleva tres cosas pegadas y en este orden: la intensidad —`-`
     * flojo, nada moderado, `+` fuerte—, el descriptor —`SH` chubascos, `TS`
     * tormenta, `FZ` engelante— y lo que cae. Se mira lo que cae y si hay
     * tormenta; lo demás no cambia lo que se ve por el parabrisas.
     *
     * `VCTS` es «tormenta en las cercanías» y cuenta como tormenta: los rayos
     * se ven desde lejos, que es justo cuando impresionan.
     */
    /*
     * Y lo que cae puede ser más de una cosa pegada —`+TSRAGR`, `SHRAGS`—, que
     * es como se escribe la lluvia con granizo. Se mira la primera para la
     * clase, como siempre, y todas para el granizo.
     */
    const w =
      /^(VC)?([-+])?(MI|BC|PR|DR|BL|SH|TS|FZ)?((?:DZ|RA|SN|GR|GS|UP)*)$/.exec(p);
    if (w && (w[3] === "TS" || w[4])) {
      const todo = w[4] ?? "";
      const cae = todo.slice(0, 2) || undefined;
      const tormenta = w[3] === "TS";
      if (tormenta && !w[1] && !enLaTendencia) tormentaEncima = true;
      /*
       * **El granizo, solo si cae aquí**: un grupo de las cercanías no lo
       * lleva nunca —`VC` va con tormenta o chubasco, no con lo que cae—, y
       * si llegara, no es granizo encima. El grande pega más que el pequeño,
       * y la intensidad del grupo manda en los dos.
       */
      if (!w[1]) {
        const i = w[2] === "-" ? 0 : w[2] === "+" ? 2 : 1;
        if (/GR/.test(todo)) granizo = Math.max(granizo, [0.5, 0.75, 1][i]!);
        if (/GS/.test(todo)) granizo = Math.max(granizo, [0.25, 0.4, 0.55][i]!);
      }
      const clase: Lluvia = tormenta
        ? "tormenta"
        : cae === "DZ"
          ? "llovizna"
          : "lluvia";
      // Manda la más gorda: un METAR puede traer dos grupos —«-RA TS»— y lo
      // que hay fuera es lo peor de los dos.
      const orden: Lluvia[] = ["nada", "llovizna", "lluvia", "tormenta"];
      if (orden.indexOf(clase) > orden.indexOf(lluvia)) lluvia = clase;
      // Flojo, moderado, fuerte. Y en las cercanías, a medio gas: está ahí,
      // pero no encima.
      const fuerza = w[2] === "-" ? 0.35 : w[2] === "+" ? 1 : 0.7;
      fuerzaDeLluvia = Math.max(fuerzaDeLluvia, w[1] ? fuerza * 0.5 : fuerza);
      continue;
    }

    // Nubes: BKN010 son ocho octavos a mil pies. Solo cuentan las capas que
    // tapan —cielo roto o cubierto—, que son las que ponen techo.
    /*
     * Con su `CB` o su `TCU` detrás si la capa es de nube de tormenta
     * —`BKN008CB`—, que sigue siendo una capa a esa altura; y `VV001`, la
     * visibilidad vertical de la niebla, que es un cielo tapado a cien pies.
     * Sin ellos, el parte de una tormenta de verdad salía sin techo.
     */
    const n =
      /^(FEW|SCT|BKN|OVC)(\d{3})(?:CB|TCU)?$/.exec(p) ??
      (/^VV(\d{3})$/.test(p) ? ["", "OVC", p.slice(2)] : null);
    if (n) {
      if (n[1] === "BKN" || n[1] === "OVC") {
        const pies = Number(n[2]) * 100;
        const m = Math.round(pies * 0.3048);
        // Y la tapadura, de la capa que hace techo: la más baja de las que
        // tapan. BKN son de cinco a siete octavos; OVC, ocho.
        if (techoM === null || m < techoM) tapadura = n[1] === "OVC" ? 1 : 0.75;
        techoM = techoM === null ? m : Math.min(techoM, m);
      }
      continue;
    }

    // Temperatura y rocío: 21/18, M03/M07 con la eme de menos.
    const t = /^(M?\d{2})\/(M?\d{2})$/.exec(p);
    if (t) {
      temp = Number(t[1]!.replace("M", "-"));
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
    ? {
        vientoDe,
        vientoKt,
        qnh,
        temp,
        techoM,
        visibilidadM,
        ...(tapadura !== undefined ? { tapadura } : {}),
        lluvia,
        fuerzaDeLluvia,
        ...(granizo > 0 ? { granizo } : {}),
        ...(rachaKt > 0 ? { rachaKt } : {}),
        ...(tormentaEncima ? { tormentaEncima } : {}),
        crudo: partes.join(" "),
        fuente: "metar",
      }
    : null;
}

/**
 * **Por qué proxy se pide el parte**, o `null` si no se pide.
 *
 * - `?meteo=` vacío: sin parte, el tiempo de casa.
 * - `?meteo=<dirección>`: ese proxy.
 * - `?meteo=verdad`: el del `.env`, aunque lo maneje un banco.
 * - Sin nada: el del `.env` (`VITE_METEO`)… **salvo en desarrollo con el
 *   navegador manejado por un banco** (`navigator.webdriver`), que va con el
 *   tiempo de casa.
 *
 * Lo último es el arreglo en la raíz de lo que pasó cuatro veces el
 * 5-oct-2026: con el proxy del `.env`, los bancos pedían el parte de verdad,
 * la tarjeta del tiempo salía sola a proponer no salir —Los Rodeos en OVC003,
 * Pettirossi en BKN010—, que es lo que tiene que hacer, y el banco se quedaba
 * en el puesto o medía una escena congelada detrás de ella. Se iban poniendo
 * `&meteo=` banco a banco, y quedaban más de cuarenta. Un banco mide lo mismo
 * cada vez; el día que haga falta el parte real, `?meteo=verdad`. En
 * producción no cambia nada.
 */
export function proxyDelParte(
  q: URLSearchParams = new URLSearchParams(globalThis.location?.search ?? ""),
): string | null {
  const delEnv = import.meta.env.VITE_METEO ?? null;
  const pedido = q.get("meteo");
  if (pedido === "verdad") return delEnv;
  if (pedido !== null) return pedido || null;
  if (import.meta.env.DEV && globalThis.navigator?.webdriver) return null;
  return delEnv;
}

/**
 * Pide el METAR de un aeropuerto a través del proxy propio.
 *
 * Devuelve el tiempo de casa si no hay proxy configurado, si la red falla o si
 * tarda demasiado. **Volar no puede depender de que haya red**: quien juega en
 * un colegio con la conexión caída tiene que poder despegar igual.
 */
export async function pedirMetar(
  icao: string,
  proxy: string | null,
  /** Y si no hay METAR, el viento del sitio. Ver `vientoDeCasa`. */
  siNoHay: Meteo = TIEMPO_DE_CASA,
): Promise<Meteo> {
  if (!proxy) return siNoHay;
  try {
    const corte = AbortSignal.timeout(4000);
    const res = await fetch(`${proxy}?icao=${encodeURIComponent(icao)}`, {
      signal: corte,
    });
    if (!res.ok) return siNoHay;
    return leerMetar(await res.text()) ?? siNoHay;
  } catch {
    return siNoHay;
  }
}

/**
 * Cuánto viento de frente da una cabecera, en nudos.
 *
 * Negativo quiere decir viento de cola, que es lo que **no** se quiere: alarga
 * la carrera de despegue y acorta la pista que queda al aterrizar.
 */
/**
 * El viento como vector del mundo: **a dónde va el aire**, en m/s.
 *
 * El METAR dice de dónde viene y en nudos, que es como se habla por radio; el
 * motor de vuelo necesita lo contrario y en unidades del sistema. La conversión
 * va aquí y en un solo sitio, porque es de las que se hacen mal: un viento
 * «del 360» sopla **hacia el sur**, y el sur en este mundo es la Z positiva.
 *
 * Y con la Z del juego, que mira al sur: el norte es la Z negativa.
 */
export function vientoComoVector(meteo: Meteo): { x: number; z: number } {
  if (meteo.vientoDe === null || meteo.vientoKt <= 0) return { x: 0, z: 0 };
  const ms = meteo.vientoKt * 0.514444;
  const de = (meteo.vientoDe * Math.PI) / 180;
  // De dónde viene, en vector: norte (0°) es −Z, este (90°) es +X.
  const vieneX = Math.sin(de);
  const vieneZ = -Math.cos(de);
  // Y a dónde va, que es lo contrario.
  return { x: -vieneX * ms, z: -vieneZ * ms };
}

export function deFrente(rumboPista: number, meteo: Meteo): number {
  if (meteo.vientoDe === null) return 0;
  const angulo =
    (((meteo.vientoDe - rumboPista + 540) % 360) - 180) * (Math.PI / 180);
  return meteo.vientoKt * Math.cos(angulo);
}

/** Un campo del vuelo con su tiempo, puesto donde está en el mundo. */
export interface CampoConTiempo {
  readonly x: number;
  readonly z: number;
  readonly meteo: Meteo;
  /**
   * A qué altura está su pista, m. Hace falta para la temperatura: 21 °C en
   * Los Rodeos, a seiscientos treinta metros, no es el mismo día que 21 °C en
   * Gando, al nivel del mar. Ver `aireDelParte`. Sin ella, al nivel del mar.
   */
  readonly cota?: number;
}

/**
 * Hasta dónde se nota un campo solo, m. Dentro de este radio de su pista, su
 * parte manda casi entero; más lejos se reparte con los demás.
 */
const RADIO_DEL_CAMPO = 3000;

/**
 * **El tiempo que hace en un punto del vuelo**, cuando cada campo tiene su
 * parte.
 *
 * Había un solo viento para todo el mundo: el METAR del campo de salida, que
 * mandaba también a doscientos kilómetros, en el de llegada. Llegando a El
 * Hierro desde La Palma se aterrizaba con el 150/3 del parte de salida. Ahora
 * cada campo trae el suyo, y entre medias el aire pasa de uno a otro **sin
 * saltos**: el peso de cada parte cae con el cuadrado de la distancia a su
 * pista, así que encima de un campo sopla su viento —a un par de kilómetros,
 * más del noventa y nueve por ciento— y en mitad del canal, una mezcla de los
 * dos.
 *
 * Se mezclan los vectores y no los rumbos, que es lo que hace el aire: dos
 * vientos encontrados se frenan entre sí, y promediar «350» con «010» daría
 * un viento del sur. La presión se promedia con los mismos pesos, que es la
 * que el altímetro de verdad encuentra al cruzar de un campo a otro.
 */
export function tiempoEntreCampos(
  campos: readonly CampoConTiempo[],
  x: number,
  z: number,
): {
  /** A dónde va el aire, m/s: lo que necesita el motor de vuelo. */
  readonly aire: { readonly x: number; readonly z: number };
  /** De dónde viene, en grados verdaderos, o `null` en calma. */
  readonly vientoDe: number | null;
  /** Con qué fuerza, nudos. */
  readonly vientoKt: number;
  /** La presión al nivel del mar aquí, hPa. */
  readonly qnh: number;
  /**
   * **Y el aire del día**: cuánto más caliente que el estándar está, con la
   * presión de aquí. Es lo que mueve la densidad y con ella todo el vuelo.
   * Ver `Aire` en `flight/atmosphere.ts`.
   */
  readonly delDia: Aire;
} {
  let pesos = 0;
  let ax = 0;
  let az = 0;
  let qnh = 0;
  let desviacion = 0;
  for (const c of campos) {
    const d2 = (c.x - x) ** 2 + (c.z - z) ** 2;
    const w = 1 / (d2 + RADIO_DEL_CAMPO ** 2);
    const v = vientoComoVector(c.meteo);
    ax += v.x * w;
    az += v.z * w;
    qnh += c.meteo.qnh * w;
    /*
     * La temperatura se mezcla como **desviación al nivel del mar**, no en
     * grados tal cual: entre un campo en la costa y otro en la montaña, la
     * mitad de sus dos temperaturas no es la de ningún sitio. Ver
     * `aireDelParte`.
     */
    desviacion +=
      aireDelParte(c.meteo.temp, c.cota ?? 0, c.meteo.qnh).desviacion * w;
    pesos += w;
  }
  if (pesos <= 0)
    return {
      aire: { x: 0, z: 0 },
      vientoDe: null,
      vientoKt: 0,
      qnh: TIEMPO_DE_CASA.qnh,
      delDia: AIRE_ESTANDAR,
    };
  ax /= pesos;
  az /= pesos;
  const kt = Math.hypot(ax, az) / 0.514444;
  // De dónde viene es lo contrario de a dónde va: norte es −Z, este +X.
  const de = ((Math.atan2(-ax, az) * 180) / Math.PI + 360) % 360;
  return {
    aire: { x: ax, z: az },
    vientoDe: kt < 0.5 ? null : de,
    vientoKt: kt,
    qnh: qnh / pesos,
    delDia: { desviacion: desviacion / pesos, qnh: qnh / pesos },
  };
}

/**
 * **El ATIS de un campo, escrito como se imprime en cabina.**
 *
 * Es lo que un piloto lleva leído antes de empezar a bajar: pista en uso,
 * viento, visibilidad, nubes, temperatura y QNH. Con las abreviaturas de
 * verdad —WIND, VIS, NSC, QNH— y sin traducir, que es como se lo va a
 * encontrar el día que vuele: la regla 3 de la casa.
 *
 * El viento va en **magnéticos**, como lo da una torre y como van las pistas:
 * el METAR lo trae en verdaderos, y un ATIS que dijera 020 con la pista 34
 * delante enseñaría a restar mal. Ver `vientoEnPiezas`.
 *
 * Las nubes: la capa que hace techo, con su base en pies sobre el campo, o
 * NSC —«no significant cloud»— si el parte no trae ninguna que tape.
 */
export function atisEnTexto(
  oaci: string,
  pista: string | null,
  meteo: Meteo,
  declinacion = 0,
  /*
   * Y quién lo da. Un campo con AFIS no tiene ATIS: lo mismo te lo da el AFIS
   * al primer contacto —pista en uso, viento, QNH—, y se escribe con su
   * nombre. Ver `Aerodrome.afis`.
   */
  quien: "ATIS" | "AFIS" = "ATIS",
): string {
  const magnetico = (d: number): string =>
    String(Math.round((((d - declinacion) % 360) + 360) % 360) || 360).padStart(
      3,
      "0",
    );
  const viento =
    meteo.vientoKt <= 0
      ? "WIND CALM"
      : meteo.vientoDe === null
        ? `WIND VRB/${Math.round(meteo.vientoKt)}KT`
        : `WIND ${magnetico(meteo.vientoDe)}/${Math.round(meteo.vientoKt)}KT`;
  const vis =
    meteo.visibilidadM >= 10000
      ? "VIS 10KM"
      : meteo.visibilidadM >= 5000
        ? `VIS ${Math.floor(meteo.visibilidadM / 1000)}KM`
        : `VIS ${Math.round(meteo.visibilidadM / 100) * 100}M`;
  const nubes =
    meteo.techoM === null
      ? "NSC"
      : `${(meteo.tapadura ?? 0.75) >= 1 ? "OVC" : "BKN"} ${
          Math.round(meteo.techoM / 0.3048 / 100) * 100
        }FT`;
  const intensidad =
    meteo.fuerzaDeLluvia < 0.5 ? "-" : meteo.fuerzaDeLluvia >= 1 ? "+" : "";
  const agua =
    meteo.lluvia === "nada"
      ? null
      : meteo.lluvia === "tormenta"
        ? "TS"
        : `${intensidad}${meteo.lluvia === "llovizna" ? "DZ" : "RA"}`;
  /*
   * Y el granizo, con su abreviatura de siempre: `GR` el grande y `GS` el
   * pequeño. Es lo único que lo dice por escrito antes de oírlo.
   */
  const piedra =
    (meteo.granizo ?? 0) <= 0 ? null : (meteo.granizo ?? 0) >= 0.6 ? "GR" : "GS";
  return [
    `${oaci} ${quien}`,
    ...(pista ? [`RWY ${pista}`] : []),
    viento,
    vis,
    ...(agua ? [agua] : []),
    ...(piedra ? [piedra] : []),
    nubes,
    `T${Math.round(meteo.temp)}`,
    `QNH ${Math.round(meteo.qnh)}`,
  ].join(" · ");
}
