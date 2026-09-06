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
  SphereGeometry,
} from "three";
import { CRUCERO } from "./plan-de-vuelo";

/** El amarillo de los vehículos de plataforma. */
const CARROCERIA = 0xf0c53a;

/** Cristales y letrero: oscuros, para que el amarillo y el ámbar canten. */
const OSCURO = 0x23262c;

/** El ámbar de la baliza y el ocre del galón, que son el mismo idioma. */
const AMBAR = 0xff9c2a;

/**
 * Cuánto va por delante del avión, medido sobre la ruta, m.
 *
 * Eran cuarenta y cinco, y con la cámara de persecución dieciséis metros por
 * detrás eso deja el coche a sesenta: un vehículo de metro y medio de alto a
 * esa distancia son veinticinco píxeles de amarillo sobre gris. Se le puede
 * seguir, pero hay que buscarlo. A treinta se ve sin buscarlo, y sigue estando
 * lo bastante lejos como para que uno vaya **detrás** y no encima.
 */
const ADELANTO = 30;

/**
 * Lo más rápido que se mueve, m/s.
 *
 * **Y no puede pasarse de lo que el propio juego considera rodar deprisa.**
 * Iban doce y medio, y la banda de rodaje avisa a partir de doce y cuarto: el
 * coche que te lleva iba justo por encima del límite que el juego te riñe por
 * pasar, así que seguirle disparaba «más despacio» y estropeaba el galón de la
 * velocidad. Once, que es la velocidad de crucero de rodaje que ya usa el plan.
 *
 * **Y ahora no es un número de aquí: es la velocidad de crucero del plan.**
 *
 * Iba a once cuando el tope dejaba rodar a 10,35: medio metro por segundo son
 * cuarenta metros por minuto, así que en una calle larga el coche se marchaba
 * y no había manera de alcanzarlo — «el coche casi que se escapa». Escribirlo
 * otra vez aquí, con otro número, era pedir que volviera a pasar. El coche va
 * a lo que el juego te pide ir, y el tope te deja un quince por ciento más:
 * con eso siempre se le alcanza, y seguirle es exactamente ir bien.
 */
const VELOCIDAD = CRUCERO;

/**
 * Y en bici, lo que pedalea alguien con ganas: siete metros por segundo.
 *
 * Veinticinco por hora. Menos que el avión, así que en la plataforma se le
 * alcanza — y por eso la bici se aparta en cuanto la tienes cerca, en vez de
 * dejarse atropellar como el coche.
 */
const EN_BICI = 7;

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
  // Un pelo más grande de lo real, por lo mismo que el señalero: lo que hay
  // que conservar es que se vea, no la escala.
  grupo.scale.setScalar(1.4);

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
      const rueda = new Mesh(
        gomas,
        new MeshLambertMaterial({ color: 0x1a1c20 }),
      );
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

/**
 * Y la otra manera de que alguien salga a buscarte: **en bicicleta**.
 *
 * En un campo particular no hay coche de sígame — «está bien que salga, pero
 * en un aeródromo particular es raro; como mucho que salta Jazlyn en bicicleta
 * a buscarme»—. Y hace exactamente el mismo trabajo: va delante, enseña por
 * dónde y espera. Lo que cambia es que **a esta no se la puede atropellar**:
 * un coche que se lleva un golpe es un chiste; una persona en bici, no. Se
 * aparta siempre, y de eso se encarga el juego.
 *
 * Va con banderín naranja, que es lo que lleva una bici que quiere que la
 * vean, y es además el mismo galón que ya se gana en la manga.
 */
function construirBici(): { grupo: Group; baliza: Group } {
  const grupo = new Group();
  grupo.name = "sigueme";
  grupo.visible = false;
  // Más grande que la de verdad, como todo lo que aquí tiene que verse desde
  // una cabina a treinta metros.
  grupo.scale.setScalar(1.6);

  const negro = new MeshLambertMaterial({ color: 0x1a1c20 });
  const ruedas = new Group();
  const goma = new CylinderGeometry(0.34, 0.34, 0.06, 12);
  for (const z of [-0.52, 0.52]) {
    const rueda = new Mesh(goma, negro);
    rueda.position.set(0, 0.34, z);
    rueda.rotation.z = Math.PI / 2;
    ruedas.add(rueda);
  }

  const cuadro = new Mesh(
    new BoxGeometry(0.08, 0.1, 1.05),
    new MeshLambertMaterial({ color: CARROCERIA }),
  );
  cuadro.position.set(0, 0.62, 0);

  const manillar = new Mesh(new BoxGeometry(0.52, 0.07, 0.07), negro);
  manillar.position.set(0, 0.92, -0.45);

  // Quien pedalea: sin cara y sin detalles, como el señalero. Lo que tiene que
  // leerse desde el aire es que **hay alguien**, no quién es.
  const cuerpo = new Mesh(
    new BoxGeometry(0.34, 0.62, 0.24),
    new MeshLambertMaterial({ color: 0x3f7d63 }),
  );
  cuerpo.position.set(0, 1.16, 0.06);
  const cabeza = new Mesh(
    new SphereGeometry(0.17, 10, 8),
    new MeshLambertMaterial({ color: 0xd9a06b }),
  );
  cabeza.position.set(0, 1.56, 0.02);
  const casco = new Mesh(
    new SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new MeshLambertMaterial({ color: AMBAR }),
  );
  casco.position.set(0, 1.6, 0.02);

  // El banderín, que es la baliza de esta versión: lo que destella.
  const banderin = new Group();
  const asta = new Mesh(new BoxGeometry(0.04, 0.9, 0.04), negro);
  asta.position.set(0.16, 1.1, 0.4);
  const tela = new Mesh(
    new BoxGeometry(0.36, 0.24, 0.03),
    new MeshBasicMaterial({ color: AMBAR }),
  );
  tela.position.set(0.35, 1.44, 0.4);
  banderin.add(asta, tela);

  grupo.add(ruedas, cuadro, manillar, cuerpo, cabeza, casco, banderin);
  return { grupo, baliza: banderin };
}

export class Sigueme {
  readonly grupo: Group;

  /**
   * Dónde está el coche ahora, o `null` si hoy no ha salido.
   *
   * Lo pregunta el juego para saber si se le ha pasado por encima. Va aquí y
   * no se deduce de la escena porque el coche sabe dónde está mucho mejor que
   * quien mira su grupo: cuando no está activo, su malla se queda donde la
   * dejaron.
   */
  get donde(): { readonly x: number; readonly z: number } | null {
    return this.grupo.visible
      ? { x: this.grupo.position.x, z: this.grupo.position.z }
      : null;
  }
  private readonly baliza: Group;
  private ruta: readonly Punto[] = [];
  /** Distancia acumulada hasta cada punto de la ruta. */
  private acumulado: number[] = [];
  /** Dónde va el coche, en metros de ruta. */
  private s = 0;
  /** Cuánto lleva apartado, de 0 a 1. */
  private aparte = 0;
  private t = 0;

  /** Si quien sale a buscarte va en bici. Ver `construirBici`. */
  readonly enBici: boolean;

  constructor(enBici = false) {
    this.enBici = enBici;
    const { grupo, baliza } = enBici ? construirBici() : construir();
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
    // Ruta nueva: el coche se coloca por delante **de donde esté el avión**,
    // no al principio de la ruta. Naciendo en el metro cero, en la ruta de
    // vuelta —que empieza donde tocaste tierra— aparecía trescientos metros a
    // la espalda y ya no lo alcanzabas nunca.
    this.s = -1;
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
   *
   * `esperaEn` es hasta dónde puede llegar, si hay un tope. Se usa en la
   * carrera de aterrizaje: **un sígame no se mete en una pista activa**, te
   * espera en la salida. Ver `paso` en `game.ts`.
   */
  paso(
    dt: number,
    avion: { x: number; z: number },
    activo: boolean,
    cediendo: boolean,
    cota: (x: number, z: number) => number,
    esperaEn?: { x: number; z: number } | null,
  ): void {
    if (!activo || this.ruta.length < 2 || this.largo < ADELANTO) {
      this.grupo.visible = false;
      return;
    }
    this.grupo.visible = true;
    this.t += dt;

    const alLlegar = this.enLaRuta(avion);
    /*
     * **El tope, cuando lo hay: la boca de la calle de salida.**
     *
     * «El vehículo Followme se ve bien, pero desaparece en la pista de
     * aterrizaje.» Desaparecía porque en la carrera de aterrizaje no estaba
     * activo, y ponerlo a correr delante del avión por la pista habría sido
     * peor: por una pista en uso no circula nadie. Lo que hace uno de verdad
     * es **esperarte en la salida**, con la baliza encendida, que además es la
     * forma de enseñar por dónde hay que abandonar.
     */
    const hastaDondeLlega = Math.max(0, this.largo - NO_LLEGA);
    const objetivo = esperaEn
      ? // Esperando: se planta **en la salida**, no treinta metros por delante
        // del morro. Puesto por delante sin más, el coche baja la pista
        // corriendo delante de un avión que aterriza, que es peor que no
        // estar: por una pista en uso no circula nadie.
        Math.min(this.enLaRuta(esperaEn), hastaDondeLlega)
      : Math.min(alLlegar + ADELANTO, hastaDondeLlega);
    // Primer fotograma con esta ruta: se planta donde toca en vez de correr
    // hasta allí desde el kilómetro cero.
    if (this.s < 0) this.s = objetivo;
    // Hacia delante y nada más: un sígame no da marcha atrás. Ver la cabecera.
    const paso = (this.enBici ? EN_BICI : VELOCIDAD) * dt;
    this.s = Math.max(this.s, Math.min(objetivo, this.s + paso));

    const deja =
      !esperaEn && (cediendo || this.largo - alLlegar < CEDE_AL_FINAL);
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
