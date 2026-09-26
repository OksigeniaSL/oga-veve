/**
 * Los turbohélices de las islas, cruzándose con quien vuela.
 *
 * Pedido volando de Gran Canaria a Tenerife: «no sé si se podría hacer ver
 * algún avión de los de aquí cruzando delante». Los de aquí son los
 * turbohélices regionales de ala alta y cola en T que unen las islas a todas
 * horas, pintados de blanco con la cola de colores —y así se reconocen, por
 * la forma y los colores, sin nombre ni logotipo de nadie—.
 *
 * Ya había tráfico de ruta —ver `trafico-en-ruta.ts`— y hace otra cosa:
 * puebla el corredor propio a su nivel de crucero, para enseñar la regla
 * semicircular. Esto es lo que aquel no puede dar: **verlos pasar**. Un avión
 * a mil metros por encima y a un kilómetro de lado no se ve desde una cabina
 * que mira al frente; uno que cruza delante a unos cientos de metros de altura
 * de diferencia, sí.
 *
 * ## Por dónde vuelan: por las rutas que hay
 *
 * Solo por las rutas regulares entre islas —`RUTAS_ENTRE_ISLAS`—, y dentro de
 * la anchura de una aerovía: unos cinco millas a cada lado del eje. Así que
 * este tráfico **no se inventa el sitio**: aparece donde de verdad pasan, y
 * donde no pasa ninguna ruta no aparece nadie. Como la red de las islas es una
 * estrella con dos centros —Los Rodeos y Gando—, eso quiere decir sobre todo
 * dos cosas, y las dos son como es:
 *
 * - **de frente**, por la misma ruta en sentido contrario, que es cómo se ve
 *   de verdad a otro avión desde uno de línea entre dos islas; y
 * - **cruzando**, donde otra ruta corta la tuya: alrededor de los dos centros,
 *   fuera ya del circuito, o donde dos rutas se cortan en medio del mar.
 *
 * ## A qué altura: la de su tramo, y separado de verdad
 *
 * Cada punto de una ruta tiene su altura: subiendo desde el campo de salida,
 * a nivel de crucero en medio, bajando hacia el de llegada. Se toma la banda
 * que un avión así puede llevar en ese punto —el perfil nominal y lo que el
 * control le puede dejar más abajo mientras cruza a otro— y se le pone **a
 * unos cientos de metros de quien vuela**, por encima o por debajo según le
 * quepa. Si no cabe —quien vuela va muy bajo en medio del canal, donde ellos
 * van altos—, no pasa nadie: es lo que pasaría.
 *
 * Nunca a menos de doscientos cincuenta metros de altura de diferencia, el
 * que viene de frente apartado además de lado entre cuatrocientos metros y
 * kilómetro y pico, y el que cruza lo hace **kilómetros por delante**. No se le puede chocar, como a los demás: esto es ambiente, y lo
 * que enseña es que el cielo tiene más gente y que se la mira.
 *
 * ## Y lejos de los campos
 *
 * Todo su camino queda a más de diez kilómetros de cualquier aeropuerto, así
 * que no entra en ningún circuito ni pasa por ninguna pista, y **no habla por
 * la radio**: la frecuencia de torre es de los que están en el circuito.
 *
 * ## De vez en cuando
 *
 * Uno a la vez, y el siguiente como pronto cuatro minutos después. Todo sale
 * de una semilla: el mismo vuelo pone los mismos aviones.
 */

import { nivelPara } from "./nivel-de-crucero";

/** Un aeropuerto de las islas, en coordenadas del mundo del escenario. */
export interface Aeropuerto {
  /** El identificador de su escenario: `tenerife-norte`, `gran-canaria`… */
  readonly id: string;
  readonly x: number;
  readonly z: number;
  /** Cota del campo, m. */
  readonly cota: number;
}

/**
 * Las rutas regulares entre islas, de campo a campo. Se vuelan en los dos
 * sentidos.
 *
 * La red de verdad, en estrella desde Los Rodeos y desde Gando, con las que
 * anuncian las dos compañías regionales que la vuelan. No están todas las
 * que existen, sino las que se ha podido comprobar: faltar una ruta deja un
 * trozo de cielo vacío, y sobrar una pondría aviones donde no pasan.
 */
export const RUTAS_ENTRE_ISLAS: readonly (readonly [string, string])[] = [
  ["tenerife-norte", "gran-canaria"],
  ["tenerife-norte", "la-palma"],
  ["tenerife-norte", "el-hierro"],
  ["tenerife-norte", "la-gomera"],
  ["tenerife-norte", "fuerteventura"],
  ["tenerife-norte", "lanzarote"],
  ["gran-canaria", "la-palma"],
  ["gran-canaria", "fuerteventura"],
  ["gran-canaria", "lanzarote"],
];

/** Uno de los que cruzan. */
export interface Isleno {
  readonly id: string;
  /** Cuál de las libreas lleva. Ver `aviones-de-las-islas.ts`. */
  readonly librea: number;
  readonly x: number;
  /** Altitud, m. */
  readonly y: number;
  readonly z: number;
  /** Rumbo verdadero, grados. */
  readonly rumbo: number;
  /** Nudos de verdad, para quien quiera decirlos. */
  readonly nudos: number;
  /** Qué ruta vuela: `tenerife-norte>la-palma`. */
  readonly ruta: string;
  /** Cómo se cruza: por delante o de frente. */
  readonly como: "cruza" | "de-frente";
}

/** Lo que hace falta saber de quien vuela. */
export interface Yo {
  readonly x: number;
  /** Altitud, m. */
  readonly y: number;
  readonly z: number;
  /** Velocidad respecto al suelo, m/s, en el plano. */
  readonly vx: number;
  readonly vz: number;
  /** Si va en crucero: en el aire, lejos del circuito, sin estar aterrizando. */
  readonly enCrucero: boolean;
}

/** Cuántas libreas hay. Ver `aviones-de-las-islas.ts`. */
export const LIBREAS = 3;

/** Lejos de todo campo, m: fuera del circuito y de la pista de nadie. */
export const LEJOS_DE_LOS_CAMPOS = 10_000;

/**
 * Media anchura de la aerovía, m.
 *
 * Cinco millas a cada lado del eje, que es lo que mide una aerovía
 * convencional. Dentro de eso un avión está en su ruta aunque no vaya
 * exactamente por la raya que une los dos campos.
 */
export const AEROVIA = 9_000;

/** Lo mínimo que se separa en altura de quien vuela, m. */
export const SEPARACION_MINIMA = 250;

/** Y lo máximo: más arriba o más abajo ya no se ve pasar, se adivina. */
const SEPARACION_MAXIMA = 700;

/**
 * Lo mínimo que se aparta de lado el que viene de frente, m.
 *
 * Cuatrocientos, y hasta mil trescientos. En una aerovía los que van y los
 * que vienen pasan uno encima del otro, separados solo en altura; aquí se
 * apartan además un poco de lado para que se les vea venir y pasar. Era un
 * kilómetro como poco, y medido en la foto el que venía salía del cuadro a
 * dos kilómetros y medio, cuando todavía era un punto de ocho píxeles.
 */
export const DE_LADO_MINIMO = 400;

/** Y cuánto más se puede apartar, por sorteo, m. */
const DE_LADO_DE_MAS = 900;

/** Cuánto por delante de quien vuela cruza el que cruza, m. */
export const POR_DELANTE_MINIMO = 2_500;

/**
 * Por encima del relieve que tenga debajo, m. Cuatrocientos cincuenta: el
 * margen de franqueamiento de un vuelo instrumental con algo de holgura. Un
 * avión así no cruza la ladera del Teide a mil quinientos metros.
 */
const SOBRE_EL_SUELO = 450;

/** Hasta dónde se le sigue, m. Más lejos no se ve y se retira. */
export const SE_VA = 30_000;

/**
 * Cuánto se le sigue después de cruzarse, s.
 *
 * Dos minutos y medio. Para entonces está a quince o veinte kilómetros y mide
 * un píxel: se retira ahí, y **todo el camino hasta ese punto** se comprueba
 * antes de lanzarlo —lejos de los campos y por encima del relieve—. Dejarlo
 * volar recto hasta perderlo de vista lo acabaría metiendo, tarde o temprano,
 * en el circuito del aeropuerto al que va.
 */
const DESPUES_DE_CRUZAR = 150;

/** El primero, entre un minuto y dos de entrar en crucero, s. */
const PRIMERO = [60, 120] as const;

/** Y entre uno y el siguiente, entre cuatro y siete minutos, s. */
const ENTRE_UNO_Y_OTRO = [240, 420] as const;

/** Si no cabe ninguno ahora, se vuelve a mirar al rato, s. */
const REINTENTO = 20;

const PIE = 0.3048;
const NUDO = 0.514444;

/**
 * La pendiente con que sube uno de éstos después de despegar: un siete por
 * ciento, unos mil doscientos pies por minuto a ciento setenta nudos.
 */
const PENDIENTE_DE_SUBIDA = 0.07;

/** Y la de bajada: los tres grados de una senda, un cinco y pico por ciento. */
const PENDIENTE_DE_BAJADA = 0.052;

/** Nunca por debajo de esto en ruta, m. */
const LO_MAS_BAJO = 900;

/**
 * A cuánto vuela a esta altitud, en nudos.
 *
 * Por debajo de diez mil pies manda el límite de doscientos cincuenta nudos
 * indicados, y van a unos doscientos cuarenta; por encima, al crucero de un
 * turbohélice de este porte, unos doscientos sesenta y cinco verdaderos.
 */
export function nudosA(altitud: number): number {
  return altitud < 10_000 * PIE ? 240 : 265;
}

/**
 * La altura que se le puede ver llevar a `t` metros de la salida en una ruta
 * de `largo`, m: de la más baja a la del perfil.
 *
 * El perfil es el de siempre —subir, crucero, bajar— y el crucero crece con
 * la ruta: los saltos cortos, entre Tenerife y Gran Canaria, se hacen
 * alrededor del nivel ciento veinte; los largos, a Lanzarote o La Palma,
 * cerca del ciento setenta. Por debajo del perfil cabe lo que el control deja
 * a un avión que cruza por debajo de otro, que es mucho pero no todo.
 */
export function bandaEnLaRuta(
  t: number,
  largo: number,
  rumbo: number,
  cotaSalida: number,
  cotaLlegada: number,
): { readonly baja: number; readonly alta: number } {
  const crucero = nivelPara(rumbo, 9000 + (largo / 1000) * 30) * PIE;
  const alta = Math.min(
    crucero,
    cotaSalida + PENDIENTE_DE_SUBIDA * t,
    cotaLlegada + PENDIENTE_DE_BAJADA * (largo - t),
  );
  return { baja: Math.max(LO_MAS_BAJO, 0.55 * alta), alta };
}

/** Un número entre 0 y 1 a partir de dos enteros. Sin estado y repetible. */
function sorteo(semilla: number, i: number): number {
  const x = Math.sin(semilla * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Rumbo de compás de un desplazamiento: la Z apunta al sur. */
function rumboDe(dx: number, dz: number): number {
  return ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
}

/** Uno volando, con lo que hace falta para moverlo. */
interface EnElAire {
  readonly id: string;
  readonly librea: number;
  x: number;
  readonly y: number;
  z: number;
  readonly ux: number;
  readonly uz: number;
  readonly v: number;
  readonly rumbo: number;
  readonly ruta: string;
  readonly como: "cruza" | "de-frente";
  edad: number;
  /** Cuánto vive: hasta cruzarse y un rato después, s. */
  readonly vida: number;
}

/** Un plan de cruce antes de lanzarlo. */
interface Plan {
  readonly sx: number;
  readonly sz: number;
  readonly ux: number;
  readonly uz: number;
  readonly v: number;
  readonly y: number;
  readonly vida: number;
  readonly ruta: string;
  readonly como: "cruza" | "de-frente";
}

export class TraficoDeLasIslas {
  private readonly rutas: readonly {
    readonly de: Aeropuerto;
    readonly a: Aeropuerto;
    readonly largo: number;
  }[];
  private espera: number;
  private tirada = 0;
  private cuantos = 0;
  private uno: EnElAire | null = null;
  private lista: Isleno[] = [];

  constructor(
    private readonly aeropuertos: readonly Aeropuerto[],
    /** La cota del suelo en un punto del mundo, m. */
    private readonly suelo: (x: number, z: number) => number,
    private readonly semilla = 1,
  ) {
    const porId = new Map(aeropuertos.map((a) => [a.id, a]));
    const rutas: {
      de: Aeropuerto;
      a: Aeropuerto;
      largo: number;
    }[] = [];
    for (const [uno, otro] of RUTAS_ENTRE_ISLAS) {
      const de = porId.get(uno);
      const a = porId.get(otro);
      if (!de || !a) continue;
      const largo = Math.hypot(a.x - de.x, a.z - de.z);
      // Los dos sentidos, que se vuelan los dos.
      rutas.push({ de, a, largo }, { de: a, a: de, largo });
    }
    this.rutas = rutas;
    this.espera = this.entre(PRIMERO);
  }

  /** Los que hay ahora: uno o ninguno. */
  quienes(): readonly Isleno[] {
    return this.lista;
  }

  /** Cuántos han cruzado en este vuelo. Para los bancos. */
  get cruzados(): number {
    return this.cuantos;
  }

  /**
   * Un paso del reloj.
   *
   * El reloj de la espera **solo corre en crucero**: si corriera en tierra,
   * un vuelo que pasa media hora rodando llegaría arriba con el primero ya
   * encima. Y lanzado uno, vuela aunque quien lo mira deje el crucero: un
   * avión no desaparece porque otro empiece a bajar.
   */
  paso(dt: number, yo: Yo): void {
    const uno = this.uno;
    if (uno) {
      uno.x += uno.ux * uno.v * dt;
      uno.z += uno.uz * uno.v * dt;
      uno.edad += dt;
      const d = Math.hypot(uno.x - yo.x, uno.z - yo.z);
      if (uno.edad > uno.vida || d > SE_VA) {
        this.uno = null;
        this.lista = [];
      } else {
        this.lista = [this.comoIsleno(uno)];
      }
      return;
    }
    if (!yo.enCrucero || !this.lejosDeLosCampos(yo.x, yo.z)) return;
    this.espera -= dt;
    if (this.espera > 0) return;
    if (this.lanzar(yo)) this.espera = this.entre(ENTRE_UNO_Y_OTRO);
    else this.espera = REINTENTO;
  }

  /**
   * Busca uno que pueda cruzarse ahora y lo lanza. Devuelve si lo hubo.
   *
   * Público para los bancos, que no pueden esperar siete minutos a que toque.
   */
  lanzar(yo: Yo): boolean {
    const plan = this.planear(yo);
    if (!plan) return false;
    const librea =
      Math.floor(sorteo(this.semilla, this.tirada * 31 + 7) * LIBREAS) %
      LIBREAS;
    this.cuantos++;
    this.uno = {
      id: `isleno-${this.cuantos}`,
      librea,
      x: plan.sx,
      y: plan.y,
      z: plan.sz,
      ux: plan.ux,
      uz: plan.uz,
      v: plan.v,
      rumbo: rumboDe(plan.ux, plan.uz),
      ruta: plan.ruta,
      como: plan.como,
      edad: 0,
      vida: plan.vida,
    };
    this.lista = [this.comoIsleno(this.uno)];
    return true;
  }

  /** Olvida al que hubiera y vuelve a esperar como al principio. */
  reiniciar(): void {
    this.uno = null;
    this.lista = [];
    this.espera = this.entre(PRIMERO);
  }

  private comoIsleno(u: EnElAire): Isleno {
    return {
      id: u.id,
      librea: u.librea,
      x: u.x,
      y: u.y,
      z: u.z,
      rumbo: u.rumbo,
      nudos: u.v / NUDO,
      ruta: u.ruta,
      como: u.como,
    };
  }

  private entre(rango: readonly [number, number]): number {
    this.tirada++;
    return rango[0] + sorteo(this.semilla, this.tirada) * (rango[1] - rango[0]);
  }

  private lejosDeLosCampos(x: number, z: number): boolean {
    for (const a of this.aeropuertos)
      if (Math.hypot(a.x - x, a.z - z) < LEJOS_DE_LOS_CAMPOS) return false;
    return true;
  }

  /**
   * El camino entero, lejos de los campos y por encima del relieve: desde
   * donde aparece hasta donde sigue minuto y medio después de pasar.
   */
  private caminoLimpio(
    sx: number,
    sz: number,
    ex: number,
    ez: number,
    y: number,
  ): boolean {
    const largo = Math.hypot(ex - sx, ez - sz);
    const pasos = Math.max(2, Math.ceil(largo / 1500));
    for (let i = 0; i <= pasos; i++) {
      const f = i / pasos;
      const x = sx + (ex - sx) * f;
      const z = sz + (ez - sz) * f;
      if (!this.lejosDeLosCampos(x, z)) return false;
      if (this.suelo(x, z) + SOBRE_EL_SUELO > y) return false;
    }
    return true;
  }

  /**
   * La altura a la que se le pone, o `null` si no cabe separado.
   *
   * Dentro de la banda de su tramo y a una separación que se vea: ni rozando
   * ni tan lejos que pase por encima de la cabeza sin que nadie lo note.
   *
   * **Y por debajo si cabe, antes que por encima.** No es preferencia del
   * tráfico, que va donde le toca: es dónde se mira. La cámara de persecución
   * mira hacia abajo, al mar, y lo que pasa unos grados por encima del
   * horizonte queda detrás de los botones de arriba. Medido en la primera
   * foto: un turbohélice que pasaba cuatrocientos metros por encima no salía
   * en ninguna. Cuando la banda de su tramo no le deja ir por debajo —en
   * medio del canal van altos—, va por encima, que es lo que haría.
   */
  private alturaSeparada(
    yo: Yo,
    banda: { readonly baja: number; readonly alta: number },
  ): number | null {
    if (banda.alta < banda.baja) return null;
    const deseada = 300 + 150 * sorteo(this.semilla, this.tirada * 13 + 3);
    for (const lado of [-1, 1]) {
      const y = Math.min(
        banda.alta,
        Math.max(banda.baja, yo.y + lado * deseada),
      );
      const aparte = (y - yo.y) * lado;
      if (aparte >= SEPARACION_MINIMA && aparte <= SEPARACION_MAXIMA) return y;
    }
    return null;
  }

  private planear(yo: Yo): Plan | null {
    const v = Math.hypot(yo.vx, yo.vz);
    if (v < 20) return null;
    this.tirada++;
    const hx = yo.vx / v;
    const hz = yo.vz / v;
    const cruces: Plan[] = [];
    const deFrente: Plan[] = [];
    const cosCruce = Math.cos((35 * Math.PI) / 180);
    const cosDeFrente = -Math.cos((25 * Math.PI) / 180);

    for (let k = 0; k < this.rutas.length; k++) {
      const { de, a, largo } = this.rutas[k]!;
      if (largo < 2 * LEJOS_DE_LOS_CAMPOS + 1000) continue;
      const ux = (a.x - de.x) / largo;
      const uz = (a.z - de.z) / largo;
      const nombre = `${de.id}>${a.id}`;
      const rumbo = rumboDe(ux, uz);
      const coseno = ux * hx + uz * hz;
      const banda = (t: number) =>
        bandaEnLaRuta(t, largo, rumbo, de.cota, a.cota);

      if (Math.abs(coseno) < cosCruce) {
        /*
         * **Cruzando.** Dónde corta esta ruta la derrota de quien vuela, y si
         * ese sitio le queda por delante, a su alcance y lejos de los campos.
         */
        const ax = de.x - yo.x;
        const az = de.z - yo.z;
        const det = -hx * uz + ux * hz;
        const s = (ax * -uz + ux * az) / det;
        const t = (hx * az - hz * ax) / det;
        if (t < LEJOS_DE_LOS_CAMPOS || t > largo - LEJOS_DE_LOS_CAMPOS)
          continue;
        const antes =
          POR_DELANTE_MINIMO + 1000 * sorteo(this.semilla, this.tirada * 7 + k);
        if (s < v * 50 + antes || s > Math.min(25_000, v * 180 + antes))
          continue;
        const xx = yo.x + hx * s;
        const xz = yo.z + hz * s;
        const y = this.alturaSeparada(yo, banda(t));
        if (y === null) continue;
        const va = nudosA(y) * NUDO;
        const hasta = (s - antes) / v;
        const sx = xx - ux * va * hasta;
        const sz = xz - uz * va * hasta;
        const ex = xx + ux * va * DESPUES_DE_CRUZAR;
        const ez = xz + uz * va * DESPUES_DE_CRUZAR;
        if (!this.caminoLimpio(sx, sz, ex, ez, y)) continue;
        cruces.push({
          sx,
          sz,
          ux,
          uz,
          v: va,
          y,
          vida: hasta + DESPUES_DE_CRUZAR,
          ruta: nombre,
          como: "cruza",
        });
      } else if (coseno <= cosDeFrente) {
        /*
         * **De frente**, por su aerovía y en sentido contrario, apartado de
         * lado lo bastante para que se le vea pasar y no por encima.
         */
        const tp = 55 + 20 * sorteo(this.semilla, this.tirada * 5 + k);
        const lado =
          (DE_LADO_MINIMO +
            DE_LADO_DE_MAS * sorteo(this.semilla, this.tirada * 3 + k)) *
          (sorteo(this.semilla, this.tirada * 11 + k) < 0.5 ? 1 : -1);
        // El punto donde pasa: por delante de quien vuela y a su lado.
        const mx = yo.x + hx * v * tp + -hz * lado;
        const mz = yo.z + hz * v * tp + hx * lado;
        const t = (mx - de.x) * ux + (mz - de.z) * uz;
        const fuera = Math.abs((mx - de.x) * -uz + (mz - de.z) * ux);
        if (fuera > AEROVIA) continue;
        if (t < LEJOS_DE_LOS_CAMPOS || t > largo - LEJOS_DE_LOS_CAMPOS)
          continue;
        const y = this.alturaSeparada(yo, banda(t));
        if (y === null) continue;
        const va = nudosA(y) * NUDO;
        const sx = mx - ux * va * tp;
        const sz = mz - uz * va * tp;
        const ex = mx + ux * va * DESPUES_DE_CRUZAR;
        const ez = mz + uz * va * DESPUES_DE_CRUZAR;
        if (!this.caminoLimpio(sx, sz, ex, ez, y)) continue;
        deFrente.push({
          sx,
          sz,
          ux,
          uz,
          v: va,
          y,
          vida: tp + DESPUES_DE_CRUZAR,
          ruta: nombre,
          como: "de-frente",
        });
      }
    }
    /*
     * Si alguno cruza por delante, gana: es el que mejor se ve, porque pasa
     * de un lado al otro del parabrisas. Si no, el que viene de frente.
     */
    const donde = cruces.length ? cruces : deFrente;
    if (!donde.length) return null;
    const i = Math.floor(sorteo(this.semilla, this.tirada * 23 + 1) * donde.length);
    return donde[Math.min(i, donde.length - 1)]!;
  }
}
