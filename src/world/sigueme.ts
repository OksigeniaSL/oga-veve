/**
 * El coche del «sígame».
 *
 * En los aeropuertos grandes, y siempre que la visibilidad es mala o el piloto
 * no conoce el campo, sale un coche amarillo con un cartel y te lleva hasta
 * donde tengas que ir. Como mecánica para los pequeños es perfecta: **no hay
 * que leer un plano, hay que seguir a un coche.** Es la versión de cuatro años
 * del rodaje complicado, y la de catorce es que el coche ya no viene.
 *
 * Por eso está en la escalera de tramos y no en las opciones: `Tier.sigueme`.
 * En Guyrami y Tukã sale; en Taguató y arriba, no — y ahí el plano de rodaje
 * pasa a ser la lección, que con un coche delante no habría manera de aprender.
 *
 * ## Va por la ruta, no persiguiendo al avión
 *
 * El coche no tiene volante ni piensa: se coloca **cuarenta y cinco metros por
 * delante de donde va el avión, medidos sobre la misma raya verde** que ya
 * calcula el plan de vuelo. Eso lo hace bien por construcción — nunca se sale
 * de la calle, nunca corta por la hierba, nunca se pierde— y deja el problema
 * interesante en un solo sitio: el plan.
 *
 * Y no retrocede nunca. Un sígame que da marcha atrás porque el avión se ha
 * parado deja de ser un guía y pasa a ser un coche raro; si el avión se para,
 * el coche espera donde está, que es lo que hace el de verdad.
 *
 * ## Y se aparta cuando llega el de los bastones
 *
 * En la plataforma manda el señalero. El coche no desaparece —una cosa que se
 * esfuma delante de un niño de cuatro años es una cosa que se ha roto—: se va
 * a un lado, como el de verdad, y deja el sitio.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
} from "three";

/** El amarillo de los vehículos de plataforma. */
const CARROCERIA = 0xf0c53a;

/** Cristales y letrero: oscuros, para que el amarillo y el ámbar canten. */
const OSCURO = 0x23262c;

/** El ámbar de la baliza y el ocre del galón, que son el mismo idioma. */
const AMBAR = 0xff9c2a;

/** Cuánto va por delante del avión, medido sobre la ruta, m. */
const ADELANTO = 45;

/** Lo más rápido que se mueve, m/s. Cuarenta y cinco por hora en plataforma. */
const VELOCIDAD = 12.5;

/** Cuánto se queda corto del final de la ruta, m. Ver la cabecera. */
const NO_LLEGA = 30;

/** Cuánto se aparta al ceder el sitio, m. */
const A_UN_LADO = 11;

/** Y cuánto tarda en apartarse, s. */
const TARDA_EN_APARTARSE = 2.5;

/**
 * A cuánto del final de la ruta se aparta solo, m.
 *
 * Porque el final de la ruta es donde para el avión —la doble raya, el
 * puesto—, y el coche está treinta metros antes: sin esto, quien lo sigue
 * llega hasta él y se le mete dentro. Un sígame de verdad tampoco se queda en
 * medio: te deja en el sitio y se va.
 */
const CEDE_AL_FINAL = 60;

/** Destellos por segundo de la baliza. */
const DESTELLOS = 1.6;

type Punto = readonly [number, number];

function construir(): {
  grupo: Group;
  baliza: Group;
} {
  const grupo = new Group();
  grupo.name = "sigueme";
  grupo.visible = false;

  const chasis = new Mesh(
    new BoxGeometry(1.8, 0.55, 4.3),
    new MeshLambertMaterial({ color: CARROCERIA }),
  );
  chasis.position.y = 0.62;

  const cabina = new Mesh(
    new BoxGeometry(1.62, 0.6, 2.1),
    new MeshLambertMaterial({ color: OSCURO }),
  );
  cabina.position.set(0, 1.18, -0.15);

  const ruedas = new Group();
  const gomas = new CylinderGeometry(0.33, 0.33, 0.24, 10);
  for (const x of [-0.88, 0.88]) {
    for (const z of [-1.4, 1.4]) {
      const rueda = new Mesh(gomas, new MeshLambertMaterial({ color: 0x1a1c20 }));
      rueda.position.set(x, 0.33, z);
      rueda.rotation.z = Math.PI / 2;
      ruedas.add(rueda);
    }
  }

  /*
   * **El cartel mira hacia atrás, y no pone nada.**
   *
   * El de verdad dice FOLLOW ME en letras luminosas, y aquí eso no vale para
   * nada: quien va detrás tiene cuatro años y no lee. Lo que lleva es un galón
   * naranja apuntando hacia delante, que es el mismo dibujo que ya se gana en
   * la manga y que dice «por aquí» sin una palabra.
   */
  const letrero = new Mesh(
    new BoxGeometry(1.5, 0.6, 0.1),
    new MeshLambertMaterial({ color: OSCURO }),
  );
  letrero.position.set(0, 1.78, -0.85);

  const flecha = new Group();
  flecha.position.set(0, 1.78, -0.93);
  for (const lado of [-1, 1]) {
    const rama = new Mesh(
      new BoxGeometry(0.62, 0.15, 0.06),
      new MeshBasicMaterial({ color: AMBAR }),
    );
    rama.position.set(lado * 0.21, -0.06, 0);
    rama.rotation.z = lado * -0.62;
    flecha.add(rama);
  }

  /*
   * **Las balizas van a los lados del cartel, y no encima del capó.**
   *
   * Estaban delante, que es donde las lleva un coche de verdad, y desde la
   * cabina no se veía ninguna: quien va detrás ve el coche **por detrás**, y
   * ahí el capó lo tapa todo. Van sin luz, como los bastones del señalero: una
   * luz que se apaga con el atardecer no es una luz.
   */
  const balizas = new Group();
  for (const x of [-0.85, 0.85]) {
    const baliza = new Mesh(
      new CylinderGeometry(0.12, 0.12, 0.2, 8),
      new MeshBasicMaterial({ color: AMBAR }),
    );
    baliza.position.set(x, 1.78, -0.85);
    balizas.add(baliza);
  }

  grupo.add(chasis, cabina, ruedas, letrero, flecha, balizas);
  return { grupo, baliza: balizas };
}

export class Sigueme {
  readonly grupo: Group;
  private readonly baliza: Group;
  private ruta: readonly Punto[] = [];
  /** Distancia acumulada hasta cada punto de la ruta. */
  private acumulado: number[] = [];
  /** Dónde va el coche, en metros de ruta. */
  private s = 0;
  /** Cuánto lleva apartado, de 0 a 1. */
  private aparte = 0;
  private t = 0;

  constructor() {
    const { grupo, baliza } = construir();
    this.grupo = grupo;
    this.baliza = baliza;
  }

  /**
   * Le da la ruta que hay ahora, si es otra.
   *
   * Se compara por referencia y no punto a punto a propósito: el plan de vuelo
   * cambia el array entero cuando traza una ruta nueva, así que la referencia
   * **es** la respuesta, y esto se llama sesenta veces por segundo.
   */
  ponerRuta(ruta: readonly Punto[]): void {
    if (ruta === this.ruta) return;
    this.ruta = ruta;
    this.acumulado = [0];
    for (let i = 1; i < ruta.length; i++) {
      const a = ruta[i - 1]!;
      const b = ruta[i]!;
      this.acumulado.push(
        this.acumulado[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]),
      );
    }
    // Ruta nueva, coche al principio y ya por delante: si apareciera al lado
    // del avión, lo primero que haría sería salir corriendo.
    this.s = Math.min(ADELANTO, this.largo);
    this.aparte = 0;
  }

  private get largo(): number {
    return this.acumulado[this.acumulado.length - 1] ?? 0;
  }

  /**
   * Un fotograma.
   *
   * `activo` lo dice el juego: si esto es un rodaje y si el tramo lo trae. Y
   * `cediendo` es que el señalero ya está señalando, que es cuando el coche se
   * aparta.
   */
  paso(
    dt: number,
    avion: { x: number; z: number },
    activo: boolean,
    cediendo: boolean,
    cota: (x: number, z: number) => number,
  ): void {
    if (!activo || this.ruta.length < 2 || this.largo < ADELANTO) {
      this.grupo.visible = false;
      return;
    }
    this.grupo.visible = true;
    this.t += dt;

    const alLlegar = this.enLaRuta(avion);
    const objetivo = Math.min(
      alLlegar + ADELANTO,
      Math.max(0, this.largo - NO_LLEGA),
    );
    // Hacia delante y nada más: un sígame no da marcha atrás. Ver la cabecera.
    this.s = Math.max(this.s, Math.min(objetivo, this.s + VELOCIDAD * dt));

    const deja = cediendo || this.largo - alLlegar < CEDE_AL_FINAL;
    this.aparte = deja
      ? Math.min(1, this.aparte + dt / TARDA_EN_APARTARSE)
      : this.aparte;

    const donde = this.puntoEn(this.s);
    const rumbo = this.rumboEn(this.s);
    // Apartarse es irse a la derecha de su propia marcha, que es de donde no
    // viene el avión.
    const lado = this.aparte * A_UN_LADO;
    this.grupo.position.x = donde[0] - rumbo[1] * lado;
    this.grupo.position.z = donde[1] + rumbo[0] * lado;
    this.grupo.position.y = cota(this.grupo.position.x, this.grupo.position.z);
    this.grupo.rotation.y = Math.atan2(rumbo[0], rumbo[1]);

    this.baliza.visible = (this.t * DESTELLOS) % 1 < 0.55;
  }

  /** Vuelta a empezar. */
  reiniciar(): void {
    this.ruta = [];
    this.acumulado = [];
    this.s = 0;
    this.aparte = 0;
    this.grupo.visible = false;
  }

  /** En qué metro de la ruta está el avión. Por el punto más cercano. */
  private enLaRuta(avion: { x: number; z: number }): number {
    let mejor = 0;
    let menor = Infinity;
    for (let i = 1; i < this.ruta.length; i++) {
      const a = this.ruta[i - 1]!;
      const b = this.ruta[i]!;
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const largo2 = dx * dx + dz * dz;
      if (largo2 < 1e-6) continue;
      const t = Math.max(
        0,
        Math.min(1, ((avion.x - a[0]) * dx + (avion.z - a[1]) * dz) / largo2),
      );
      const px = a[0] + dx * t;
      const pz = a[1] + dz * t;
      const d = (avion.x - px) ** 2 + (avion.z - pz) ** 2;
      if (d < menor) {
        menor = d;
        mejor = this.acumulado[i - 1]! + Math.sqrt(largo2) * t;
      }
    }
    return mejor;
  }

  private tramoEn(s: number): { i: number; t: number } {
    const meta = Math.max(0, Math.min(s, this.largo));
    let i = 1;
    while (i < this.acumulado.length - 1 && this.acumulado[i]! < meta) i++;
    const desde = this.acumulado[i - 1]!;
    const hasta = this.acumulado[i]!;
    const largo = hasta - desde || 1;
    return { i, t: (meta - desde) / largo };
  }

  private puntoEn(s: number): Punto {
    const { i, t } = this.tramoEn(s);
    const a = this.ruta[i - 1]!;
    const b = this.ruta[i]!;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  private rumboEn(s: number): Punto {
    const { i } = this.tramoEn(s);
    const a = this.ruta[i - 1]!;
    const b = this.ruta[i]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const largo = Math.hypot(dx, dz) || 1;
    return [dx / largo, dz / largo];
  }
}
