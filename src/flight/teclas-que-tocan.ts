/**
 * **Las teclas que tocan**: cuando un paso del vuelo pide algo —subir, bajar,
 * flaps, tren, gas—, en un lado de la pantalla sale **la tecla que hay que
 * pulsar**, con sus vecinas, y la buena encendida.
 *
 * Lo pidió Enrique después de volar de El Hierro a La Gomera con el JAZ 60:
 * «para los iniciados, cuando hay que subir o bajar o poner los flaps, que en
 * un lado aparezca la tecla que hay que pulsar, no el teclado entero: la que
 * toca y las de los lados (arriba y abajo en las flechas), con luz en la que
 * el niño tiene que tocar. Con una opción pequeña "ya me lo aprendí, no volver
 * a mostrar", y poder recuperarlo».
 *
 * ## Qué hay ya y qué es esto
 *
 * El tutor del despegue —`ui/tutor.ts`— ya dibuja la tecla en la carrera y en
 * la frenada, y el modo inicio —`ui/inicio.ts`— la dibuja latiendo mientras
 * enseña a despegar. Lo que faltaba es el vuelo de en medio: la cadena del
 * «¿y ahora qué?» —`flight/siguiente-paso.ts`— dice «los primeros flaps» y su
 * tarjeta lleva la letra de la tecla en una esquina, pero no dónde está esa
 * letra. Esto es esa otra mitad: **la tecla en su sitio del teclado**, entre
 * las que la rodean, que es como se encuentra sin mirar el teclado entero.
 *
 * ## Las reglas
 *
 * 1. **Sale cuando un paso pide un mando**, y solo entonces. El mando lo
 *    decide la cadena —`FraseDelPaso.mando`—, que es la misma que pone la
 *    tarjeta y la voz: un suceso, un mando, un dibujo.
 * 2. **Se va cuando se hace**, no por reloj: la palanca de flaps que se movió,
 *    el tren que bajó, el gas que subió. O cuando llega otro paso, o se toca
 *    tierra. Ver la memoria del proyecto sobre los avisos y el reloj.
 * 3. **«Ya me lo aprendí»** la retira para siempre **en ese perfil**, cada una
 *    por separado: quien ya sabe dónde está la F puede no saber todavía dónde
 *    está la G. Se guarda en el progreso del perfil, en este navegador, y en
 *    ningún otro sitio. Y se recuperan todas juntas desde los ajustes.
 *
 * Este módulo no dibuja ni sabe con qué se juega: decide qué tecla toca y
 * cuándo deja de tocar. Lo dibuja `ui/teclas-que-tocan.ts`.
 */

import type { Accion } from "./keymap";
import type { MandoDelPaso, QueHacer } from "./siguiente-paso";
import { NIVELADO_FPM } from "./siguiente-paso";

/** Lo que se pide pulsar. Uno por mando del paso, más subir con el morro. */
export type TeclaQueToca =
  | "subir"
  | "bajar"
  | "masGas"
  | "menosGas"
  | "flaps"
  | "tren"
  | "aerofrenos";

/** Todas, en el orden en que se aprenden en un vuelo. */
export const TECLAS_QUE_TOCAN: readonly TeclaQueToca[] = [
  "subir",
  "bajar",
  "masGas",
  "menosGas",
  "flaps",
  "tren",
  "aerofrenos",
];

/** La acción del mapa de teclas de cada una: de ahí sale qué tecla se dibuja. */
export const ACCION_DE: Readonly<Record<TeclaQueToca, Accion>> = {
  subir: "pitchUp",
  bajar: "pitchDown",
  masGas: "throttleUp",
  menosGas: "throttleDown",
  flaps: "flaps",
  tren: "tren",
  aerofrenos: "aerofrenos",
};

/** El mando de un paso, como tecla que toca. */
const DEL_MANDO: Readonly<Record<MandoDelPaso, TeclaQueToca>> = {
  masGas: "masGas",
  menosGas: "menosGas",
  narizArriba: "subir",
  narizAbajo: "bajar",
  flaps: "flaps",
  tren: "tren",
  aerofrenos: "aerofrenos",
};

/**
 * **Qué tecla toca con este paso**, o `null` si ninguna.
 *
 * La de su mando, si pide uno. Y el paso de subir, que no pide mando —tras el
 * despegue ya se sube—, pide la flecha de subir **solo si no se está
 * subiendo**: encender «subí» a quien ya sube a mil pies por minuto es
 * pedirle que tire más, y eso no es lo que pide el paso.
 */
export function teclaDelPaso(
  que: QueHacer,
  mando: MandoDelPaso | null,
  verticalFpm: number,
): TeclaQueToca | null {
  if (mando) return DEL_MANDO[mando];
  if (que === "subir" && verticalFpm < NIVELADO_FPM) return "subir";
  return null;
}

/**
 * **Lo que se mira para saber si ya se hizo**: la posición de los mandos, que
 * es lo mismo con teclado, con el dedo o con un mando de consola. Se apunta
 * al pedirla y se compara después.
 */
export interface MandosParaLaTecla {
  /** El gas, 0 a 1. */
  readonly gas: number;
  /** Lo que pide quien vuela con la profundidad, −1 a 1: positivo, morro arriba. */
  readonly profundidad: number;
  /** La palanca de flaps, 0 a 1. */
  readonly flaps: number;
  /** Si el tren se ha pedido abajo. */
  readonly tren: boolean;
  /** Si los aerofrenos están abiertos. */
  readonly aerofrenos: boolean;
}

/** Lo que tiene que moverse el gas para que cuente como movido. */
export const GAS_QUE_CUENTA = 0.03;
/** Y la profundidad: un toque de la flecha, no el temblor del dedo. */
export const PROFUNDIDAD_QUE_CUENTA = 0.15;

/** Si lo que pedía la tecla ya se hizo, mirando los mandos de antes y de ahora. */
export function yaSeHizo(
  tecla: TeclaQueToca,
  antes: MandosParaLaTecla,
  ahora: MandosParaLaTecla,
): boolean {
  switch (tecla) {
    case "subir":
      return ahora.profundidad > PROFUNDIDAD_QUE_CUENTA;
    case "bajar":
      return ahora.profundidad < -PROFUNDIDAD_QUE_CUENTA;
    case "masGas":
      return ahora.gas > antes.gas + GAS_QUE_CUENTA || ahora.gas >= 0.999;
    case "menosGas":
      return ahora.gas < antes.gas - GAS_QUE_CUENTA || ahora.gas <= 0.001;
    case "flaps":
      return ahora.flaps !== antes.flaps;
    case "tren":
      return ahora.tren !== antes.tren;
    case "aerofrenos":
      return ahora.aerofrenos !== antes.aerofrenos;
  }
}

/** Dónde se guarda lo aprendido, dentro del progreso del perfil. */
export const LLAVE_DE_LO_APRENDIDO = "teclasAprendidas";

/** Cómo se lee y se escribe lo aprendido. Inyectado, para probarlo sin navegador. */
export interface AlmacenDeTeclas {
  leer(): unknown;
  escribir(valor: readonly TeclaQueToca[]): void;
}

/** Lo que se ve ahora: la tecla que toca, o `null`. */
export interface TeclaPedida {
  readonly tecla: TeclaQueToca;
  /** Lo que marcaban los mandos al pedirla. Ver `yaSeHizo`. */
  readonly antes: MandosParaLaTecla;
}

/**
 * **La pista de la tecla**: la que toca ahora y las que ya se aprendieron.
 * Ver la cabecera.
 */
export class TeclasQueTocan {
  private aprendidas: Set<TeclaQueToca>;
  private pedida: TeclaPedida | null = null;

  constructor(private readonly almacen: AlmacenDeTeclas) {
    this.aprendidas = new Set(leerAprendidas(almacen.leer()));
  }

  /** La que toca ahora, o `null`. */
  get ahora(): TeclaQueToca | null {
    return this.pedida?.tecla ?? null;
  }

  /** Si esta ya se aprendió y no vuelve a salir. */
  aprendida(tecla: TeclaQueToca): boolean {
    return this.aprendidas.has(tecla);
  }

  /** Cuántas hay retiradas: los ajustes solo ofrecen recuperarlas si hay alguna. */
  get cuantasAprendidas(): number {
    return this.aprendidas.size;
  }

  /**
   * **Un paso pide esta tecla**, o ninguna. Lo que se pedía antes se olvida:
   * un paso nuevo es lo que toca ahora, se hiciera o no el de antes.
   */
  pedir(tecla: TeclaQueToca | null, mandos: MandosParaLaTecla): void {
    this.pedida =
      tecla === null || this.aprendidas.has(tecla) ? null : { tecla, antes: { ...mandos } };
  }

  /** Cada fotograma: si ya se hizo, se va. Devuelve la que toca, o `null`. */
  mirar(mandos: MandosParaLaTecla): TeclaQueToca | null {
    if (this.pedida && yaSeHizo(this.pedida.tecla, this.pedida.antes, mandos)) this.pedida = null;
    return this.ahora;
  }

  /** Se acabó lo que se pedía: en tierra, al reiniciar, con otro avión. */
  quitar(): void {
    this.pedida = null;
  }

  /** «Ya me lo aprendí»: esta no vuelve a salir en este perfil. */
  aprender(tecla: TeclaQueToca): void {
    this.aprendidas.add(tecla);
    if (this.pedida?.tecla === tecla) this.pedida = null;
    this.almacen.escribir([...this.aprendidas]);
  }

  /** Desde los ajustes: vuelven a salir todas. */
  recuperarTodas(): void {
    this.aprendidas.clear();
    this.almacen.escribir([]);
  }

  /**
   * Se vuelve a leer lo guardado: al cambiar de perfil, lo aprendido es el
   * del perfil nuevo.
   */
  releer(): void {
    this.aprendidas = new Set(leerAprendidas(this.almacen.leer()));
    if (this.pedida && this.aprendidas.has(this.pedida.tecla)) this.pedida = null;
  }
}

/**
 * Lo guardado, leído con desconfianza: una lista de teclas conocidas. Lo que
 * no lo sea —un formato viejo, una tecla que ya no existe— se ignora.
 */
export function leerAprendidas(valor: unknown): TeclaQueToca[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((v): v is TeclaQueToca =>
    (TECLAS_QUE_TOCAN as readonly unknown[]).includes(v),
  );
}
