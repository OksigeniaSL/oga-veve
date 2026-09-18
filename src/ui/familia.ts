/**
 * De qué **familia** es la cabina de este avión, y dónde va cada cosa dentro.
 *
 * Jugando: «que cada aeronave parezca lo que es, que un 747 no parezca un
 * juguete, que esté centrado, que contenga información, que sea una
 * información viva». Los seis aviones llevaban el mismo cuadro con las escalas
 * cambiadas, y eso es exactamente lo contrario: un turbohélice de línea y una
 * avioneta de escuela no se parecen en nada por dentro.
 *
 * Tres familias, y la flota se reparte sola por el motor que lleva:
 *
 * - **Esferas** — los de pistón. Llevan relojes redondos porque los llevan de
 *   verdad, y además la esfera es el mejor primer instrumento que existe: una
 *   aguja sobre un arco de color se lee sin saber leer.
 * - **Cristal de dos pantallas** — el turbohélice. El salto al cristal sin
 *   llegar todavía a la arquitectura de línea. Un turbohélice de verdad lleva
 *   cinco pantallas; aquí van dos, para que los seis instrumentos clásicos
 *   sigan siendo legibles. Es una desviación consciente y se firma.
 * - **Línea** — los dos reactores. Horizonte, navegación y motores: la
 *   arquitectura de un avión de línea. Y el motor es la firma: el grande lleva
 *   **cuatro columnas**, que es al 747 lo que la joroba al fuselaje.
 *
 * ## La regla de anclaje
 *
 * Que es la que arregla el «esto no está centrado ni aunque venga Cristo y me
 * lo diga». El cuadro de cada avión es **un grupo rígido cuya caja envolvente
 * se calcula y se centra**; ningún avión mueve el grupo. Lo que cambia entre
 * aviones es el contenido, nunca el anclaje. Si una familia no cupiera, se
 * encoge lo que lleva dentro — **jamás se empuja el grupo hacia un lado**, que
 * es justo lo que estaba pasando.
 *
 * Y va con margen duro: ni un píxel de instrumento fuera de los veinte de cada
 * borde. Los tres repartos de aquí abajo suman los mil doscientos ochenta
 * clavados y son simétricos, y eso lo comprueba `familia.test.ts` en vez de
 * fiarse de que los números escritos en un comentario cuadren.
 */

import type { AircraftConfig } from "../flight/aircraft";

export type Familia = "esferas" | "cristal" | "linea";

/** El ancho de referencia del cuadro. Todo lo demás son fracciones de esto. */
export const ANCHO_DEL_CUADRO = 1280;

/** Y el margen que no pisa nadie, a cada lado. */
export const MARGEN = 20;

/**
 * El alto de referencia. El cuadro se dibuja siempre en esta caja y se escala
 * entera: así el centrado no depende del tamaño de la pantalla, que es como se
 * descentraba antes.
 */
export const ALTO_DEL_CUADRO = 540;

/**
 * La visera de encima del cuadro, y la sombra que echa sobre él.
 *
 * No es decoración: es lo que convierte una losa negra con dibujos en un
 * objeto físico con bulto. Un cuadro de mandos de verdad vive debajo de un
 * alero, y sin él las esferas parecen pegatinas.
 */
export const VISERA = 64;

/**
 * La banda donde viven los instrumentos: la misma altura para las tres
 * familias, porque el ancla es común aunque el contenido no lo sea.
 */
export const BANDA = { y: 88, alto: 416 } as const;

/**
 * Dónde cae el centro del horizonte, en fracción de la altura.
 *
 * Al cuarenta y cinco por ciento y no en la mitad: es la línea de mirada
 * natural de quien va sentado en el asiento, un poco por encima del centro
 * geométrico. De ahí cuelga todo lo demás.
 */
export const ANCLA_DE_ACTITUD = 0.46;

/** Una caja del reparto: qué es y qué trozo de los 1280 ocupa. */
export interface Caja {
  readonly que: string;
  readonly x: number;
  readonly ancho: number;
}

/**
 * El reparto de cada familia.
 *
 * Los huecos entre cajas son a propósito y no sobras: separan objetos que en
 * una cabina de verdad son objetos distintos.
 */
export const RETICULA: Record<Familia, readonly Caja[]> = {
  /*
   * Seis esferas de doscientos de diámetro en tres columnas con dieciséis de
   * separación dan seiscientos treinta y dos, y **el horizonte cae clavado en
   * el seiscientos cuarenta**, que es el centro de la pantalla. Eso no es una
   * casualidad bonita: es el ancla, y de ella cuelga el resto.
   *
   * A la izquierda, la placa con el nombre del avión y las luces del tren; a
   * la derecha, la columna de motor. Las dos hacen de contrapeso para que el
   * grupo entero quede simétrico.
   */
  esferas: [
    { que: "placa", x: 20, ancho: 284 },
    { que: "seispack", x: 324, ancho: 632 },
    { que: "motor", x: 980, ancho: 280 },
  ],
  /*
   * Dos pantallas grandes y nada más: horizonte a la izquierda, mapa con la
   * franja de motor a la derecha. Es la disposición de un cristal de aviación
   * general, y el hueco de veinticuatro del medio es el marco que las separa
   * de verdad.
   */
  cristal: [
    { que: "pfd", x: 68, ancho: 560 },
    { que: "mfd", x: 652, ancho: 560 },
  ],
  /*
   * Tres pantallas en fila: actitud, navegación y motores. Ese es el orden de
   * barrido real de un comandante, de dentro hacia fuera.
   *
   * *Desviación consciente:* en un 747 de verdad los motores van más abajo, en
   * el pedestal. Aquí van en fila porque quien juega es a la vez comandante y
   * su propio mecánico de a bordo, y porque un barrido horizontal es mucho más
   * fácil de aprender a los seis años que uno en cruz.
   */
  linea: [
    { que: "pfd", x: 20, ancho: 400 },
    { que: "nd", x: 440, ancho: 400 },
    { que: "eicas", x: 860, ancho: 400 },
  ],
};

/** De qué familia es este avión. Lo dice el motor, que es lo que manda. */
export function familiaDe(a: AircraftConfig): Familia {
  switch (a.sound.engine) {
    case "turbofan":
      return "linea";
    case "turboprop":
      return "cristal";
    default:
      return "esferas";
  }
}

/** La caja de un trozo del reparto. */
export function cajaDe(familia: Familia, que: string): Caja {
  const caja = RETICULA[familia].find((c) => c.que === que);
  if (!caja) throw new Error(`${familia} no lleva ${que}`);
  return caja;
}

/** El centro de una caja, en píxeles del cuadro. */
export function centroDe(caja: Caja): number {
  return caja.x + caja.ancho / 2;
}

/**
 * Cuántas luces de tren lleva. Tres en toda la flota y **cinco en el grande**,
 * porque un 747 tiene cinco patas y quien las cuente va a sonreír.
 */
export function patasDe(a: AircraftConfig): number {
  return a.motores >= 4 && a.sound.engine === "turbofan" ? 5 : 3;
}

/** Los cuatro peldaños de la escalera, por número. */
export type Peldano = 1 | 2 | 3 | 4;

/**
 * Qué peldaño es éste, de uno a cuatro.
 *
 * **Estaba escrito a mano dentro del HUD**, y por eso el cuadro plano crecía
 * con la escalera y las pantallas de la cabina no se enteraban: el mismo avión
 * en el mismo peldaño enseñaba fuera un cuadro sin una letra y dentro una
 * cabina de cristal llena de cifras en inglés. Dicho mirándolo: «pero has
 * dejado el cuadro anterior».
 *
 * De aquí lo sacan los dos, que es lo único que los mantiene diciendo lo
 * mismo. Ver `markup` en `tablero.ts` y `escribir` en `pantallas-cabina.ts`.
 */
export function peldanoDe(cuantos: Peldanos): Peldano {
  return cuantos === "none"
    ? 1
    : cuantos === "pictorial"
      ? 2
      : cuantos === "numeric"
        ? 3
        : 4;
}

/** Cuántos instrumentos enseña un peldaño. Ver `Tier` en `flight/tiers.ts`. */
export type Peldanos = "none" | "pictorial" | "numeric" | "full";

/**
 * Desde qué peldaño se enseña una letra. **Todas, sin excepción.**
 *
 * En el primero no va ni una palabra —se empieza a los cuatro años y no se
 * lee— y en el segundo tampoco: ahí lo que hay son formas, bandas de color y
 * agujas. Los números y los rótulos empiezan en el tercero, que es el que ya
 * lee. Es la misma regla que la hoja de estilo le aplica al cuadro plano con
 * `data-desde="3"`; aquí está escrita una sola vez para que las dos
 * superficies no puedan discrepar.
 */
export const LETRAS_DESDE: Peldano = 3;

/**
 * Y desde cuál se enseña una **cifra**, que no es lo mismo.
 *
 * La regla era una sola —«todo lo que se escribe es letra, y las letras
 * empiezan en el tercer peldaño»— y para el six-pack de una avioneta estaba
 * bien: una aguja en el arco verde se lee sin saber leer. Para una cabina de
 * cuatro motores, no. Dicho mirándolo: **«¿y los relojes no llevan números?
 * ¿cómo sabe el jugador los valores?»**. Cuatro agujas idénticas sin una cifra
 * dicen que todo va bien y nada más; no dicen cuánto, ni cuál.
 *
 * Así que se parte en dos, y la raya cae donde tiene sentido:
 *
 * - Una **cifra** es parte de la medida. El «80» de una escala o el «45» de un
 *   régimen son el instrumento; sin ellos la aguja señala a un sitio que no
 *   tiene nombre. Y un número se reconoce por su forma antes de saber leer:
 *   cualquier niño de cinco años sabe que 8 es más que 2 aunque no sepa
 *   deletrear «ocho».
 * - Un **rótulo** es un nombre. «IAS», «ALT», «N1», «FLAP» son inglés
 *   aeronáutico y están ahí para quien ya lee.
 *
 * ## Y las cifras salen **desde el primero**
 *
 * Primero se dejaron en el segundo, con el argumento de que a los cuatro años
 * no se lee. Puesto delante de un cuatrimotor, el argumento no se sostiene:
 * «no veo números ni datos en ninguno». Un panel con cuatro agujas y ni una
 * cifra no enseña a leer un instrumento, enseña que los instrumentos son
 * adorno — que es lo contrario de lo que este juego hace.
 *
 * Y la premisa era falsa: **un dígito no es lectura**. Un niño de cuatro años
 * reconoce el 8 y el 2 por su forma y sabe cuál es más mucho antes de saber
 * deletrear «ocho»; los números están en los ascensores, en los portales y en
 * las velas de la tarta. Lo que sí es lectura es «IAS», «FLAP» o «GEAR», que
 * además están en inglés — y eso sigue esperando al tercer peldaño.
 *
 * Lo que distingue al primer peldaño no es que no haya cifras: es que **no
 * hacen falta para volarlo**. El color, la posición y la forma bastan. La
 * cifra está para quien quiera mirarla, que es como se aprende a leerla.
 */
export const CIFRAS_DESDE: Peldano = 1;

/**
 * Si esto es una cifra y no un nombre.
 *
 * Se decide **por el texto y no por quién lo escribe**, que es lo único que
 * puede aplicarse igual en las dos superficies: el cuadro plano lo dibuja en
 * SVG y las pantallas de la cabina en lienzo, y cualquier regla que hubiera
 * que recordar en cada sitio se olvidaría en uno de los treinta.
 *
 * Cuentan como cifra los signos que acompañan a un número en un instrumento:
 * el punto decimal, el menos de un descenso, la barra del viento, el grado y
 * el tanto por ciento.
 */
export function esCifra(texto: string): boolean {
  const t = texto.trim();
  return t.length > 0 && /^[\d.,:+\-/°%]+$/.test(t);
}

/** Desde qué peldaño se enseña este texto. Ver `esCifra`. */
export function desdePara(texto: string): Peldano {
  return esCifra(texto) ? CIFRAS_DESDE : LETRAS_DESDE;
}

/** Lo mismo, como atributo para el SVG del cuadro plano. */
export function marca(texto: string): string {
  return `data-desde="${desdePara(texto)}"`;
}

/**
 * Y las dos marcas ya escritas, para lo que se sabe de antemano qué es.
 *
 * Buena parte de los textos del cuadro plano son cifras por construcción —el
 * «0, 10, 20, 30» de una regla de flaps no va a dejar de ser un número— y
 * escribir ahí `data-desde="2"` a mano es **poner el número del peldaño en
 * treinta sitios**. Se hizo, y al bajar las cifras al primer peldaño se
 * quedaron diecinueve de ellos en el segundo: el cuadro plano enseñaba doce
 * cifras donde la cabina enseñaba cincuenta, para el mismo avión y el mismo
 * peldaño. El número vive en `CIFRAS_DESDE` y en ningún otro sitio.
 */
export const MARCA_CIFRA = `data-desde="${CIFRAS_DESDE}"`;
export const MARCA_ROTULO = `data-desde="${LETRAS_DESDE}"`;

/**
 * Y el tercero: **lo que aparece con el aparato al que pertenece.**
 *
 * Hay palabras que no se pueden separar de su instrumento. El «SPD» de una
 * ventanilla del piloto automático no es un nombre que se pueda dejar para
 * después: tres cifras magenta sin decir de qué son no son tres objetivos,
 * son tres números sueltos. Lo mismo el «REV» de la reversa, que no marca un
 * valor sino un estado — sin la palabra no hay nada que enseñar.
 *
 * Aparecen en el segundo peldaño, con el aparato. Es la excepción a la regla
 * de que las palabras esperan al tercero, y está escrita aquí para que se vea
 * que es una excepción y no un descuido: son cuatro en todo el cuadro.
 */
export const MARCA_CON_SU_APARATO = 'data-desde="2"';

/*
 * ── **Y la cuenta de lo que de verdad ha salido** ──
 *
 * El cuadro plano se puede medir desde fuera contando sus `<text>`; un lienzo,
 * no: lo que se pinta deja de ser un objeto en cuanto se pinta. Así que las
 * dos superficies de lienzo —las pantallas de cristal y los relojes redondos—
 * apuntan aquí lo que escriben, y el banco lo lee.
 *
 * Vive en este módulo y no en una de las dos porque **las dos escriben**: con
 * el contador en las pantallas de cristal, un avión de pistón —que no las
 * lleva— daba cero cifras y el banco lo cantaba como un panel mudo. Era el
 * contador el que estaba ciego.
 */
let rotulosEscritos = 0;
let cifrasEscritas = 0;

/** A cero, al empezar a repintar. Lo que se mide es esta pasada. */
export function empiezaElRepintado(): void {
  rotulosEscritos = 0;
  cifrasEscritas = 0;
}

/** Apunta un texto que **sí** ha salido. */
export function apunta(texto: string): void {
  if (esCifra(texto)) cifrasEscritas += 1;
  else rotulosEscritos += 1;
}

/** Cuántas palabras y cuántas cifras salieron en el último repintado. */
export function loEscrito(): { rotulos: number; cifras: number } {
  return { rotulos: rotulosEscritos, cifras: cifrasEscritas };
}
