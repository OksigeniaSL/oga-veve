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
  /** De dónde salió: `'metar'` si es de verdad, `'defecto'` si es el de casa. */
  readonly fuente: "metar" | "defecto" | "mano";
}

/**
 * Las cuatro maneras de que caiga agua que este juego distingue.
 *
 * Ni nieve ni granizo: en Asunción y en Canarias no cae nieve en ninguno de los
 * aeropuertos del juego, y meter un caso que no se puede ver ni probar es
 * meter código muerto. El día que haya un campo donde nieve, entra aquí.
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
  let visibilidadM = TIEMPO_DE_CASA.visibilidadM;
  let lluvia: Lluvia = "nada";
  let fuerzaDeLluvia = 0;
  let vistoViento = false;

  for (const p of partes) {
    // Viento: 29014KT, 18012G22KT, VRB03KT, 00000KT.
    const v = /^(\d{3}|VRB)(\d{2,3})(G\d{2,3})?(KT|MPS)$/.exec(p);
    if (v) {
      const fuerza = Number(v[2]);
      // En metros por segundo en algunos países; a nudos, que es lo que canta
      // la manga y lo que dice la carta.
      vientoKt = v[4] === "MPS" ? Math.round(fuerza * 1.94384) : fuerza;
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
    const w =
      /^(VC)?([-+])?(MI|BC|PR|DR|BL|SH|TS|FZ)?(DZ|RA|SN|GR|GS|UP)?$/.exec(p);
    if (w && (w[3] === "TS" || w[4])) {
      const cae = w[4];
      const tormenta = w[3] === "TS";
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
    const n = /^(FEW|SCT|BKN|OVC)(\d{3})$/.exec(p);
    if (n) {
      if (n[1] === "BKN" || n[1] === "OVC") {
        const pies = Number(n[2]) * 100;
        const m = Math.round(pies * 0.3048);
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
        lluvia,
        fuerzaDeLluvia,
        fuente: "metar",
      }
    : null;
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
