/**
 * **Lo que sale de golpe se explica en voz**, y deja de explicarse cuando se
 * pide.
 *
 * Nació con la tarjeta del tiempo: Enrique empezó un vuelo con niebla y le
 * salió «de pronto ahí en toda la pantalla, no se entiende: debería escucharse
 * algo que lo explique, y un botón de "no volver a explicar" que aparezca a
 * partir de la segunda o tercera vez». Es la regla de la casa para toda
 * pantalla que se abre sin que nadie la pida (DESIGN.md, «Sí y no»), y aquí
 * está una vez para todas: la tarjeta del tiempo, la pantalla de las teclas
 * que se abre sola la primera vez que hay teclado y el panel del final del
 * vuelo.
 *
 * Cada pantalla cuenta las veces que le sale a este perfil. Desde la
 * `OFRECER_DESDE_LA_VEZ`, ofrece «no volver a explicar», y si se toca, no se
 * explica más en ese perfil. Se recupera desde los ajustes, como las teclas
 * que tocan. Se guarda en el progreso del perfil, en este navegador, y en
 * ningún otro sitio: es de quien juega, no del aparato, porque lo que ya se
 * aprendió uno no lo ha aprendido el hermano que hereda la tablet.
 *
 * Lo que se dice va corto y por peldaño (`flight/escalera.ts`): abajo, en
 * sencillo; desde Taguato, con lo que hace falta para usar la pantalla. La
 * voz es la de la instructora en los cuatro: «la voz del instructor no es
 * parte de la escalera», y quien no lee es quien más la necesita.
 *
 * Este módulo no habla ni dibuja: decide si toca explicar, con qué piezas, y
 * lo recuerda.
 */

import type { Peldano } from "./escalera";

/**
 * **Desde qué vez se ofrece «no volver a explicar»: la segunda.**
 *
 * Nunca desde la primera: quien ve una pantalla por primera vez no sabe
 * todavía qué es, y un botón de «no me lo expliques» al lado de algo que no se
 * entiende es una trampa —se toca por quitárselo de encima y la pantalla se
 * queda muda para siempre—. Y no más tarde de la segunda: la segunda vez ya es
 * «lo mismo otra vez», que es justo lo que Enrique dijo que cansa. Él dijo «a
 * partir de la segunda o tercera vez»; se elige la segunda porque la tarjeta
 * del tiempo sale poco —solo los días que algo pasa del límite— y entre una
 * vez y la siguiente pueden pasar semanas. El final del vuelo sale en cada
 * vuelo, y ahí la segunda es, con más razón, ya la de sobra.
 */
export const OFRECER_DESDE_LA_VEZ = 2;

/**
 * Las pantallas que se explican al abrirse, con dónde guarda cada una lo suyo
 * dentro del progreso del perfil. La de la tarjeta conserva el nombre que ya
 * tenía: cambiarlo le devolvería la explicación a quien la quitó.
 */
export const PANTALLAS_QUE_SE_EXPLICAN = {
  parte: "explicacionDelParte",
  teclas: "explicacionDeLasTeclas",
  fin: "explicacionDelFinal",
} as const;

export type PantallaQueSeExplica = keyof typeof PANTALLAS_QUE_SE_EXPLICAN;

/** Lo que se guarda: cuántas veces salió y si se quitó la explicación. */
export interface GuardadoDeLaExplicacion {
  readonly veces: number;
  readonly quitada: boolean;
}

/** Cómo se lee y se escribe. Inyectado, para probarlo sin navegador. */
export interface AlmacenDeLaExplicacion {
  leer(): unknown;
  escribir(valor: GuardadoDeLaExplicacion): void;
}

/** Lo guardado, leído con desconfianza: un formato viejo o roto es cero. */
export function leerLaExplicacion(valor: unknown): GuardadoDeLaExplicacion {
  const v = (valor ?? {}) as Partial<Record<keyof GuardadoDeLaExplicacion, unknown>>;
  const veces = typeof v.veces === "number" && Number.isFinite(v.veces) ? Math.max(0, Math.floor(v.veces)) : 0;
  return { veces, quitada: v.quitada === true };
}

/** Lo que toca al abrirse la pantalla. */
export interface AlAbrir {
  /** Si se explica en voz. */
  readonly explicar: boolean;
  /** Si la pantalla lleva el botón de «no volver a explicar». */
  readonly ofrecerQuitarla: boolean;
}

export class ExplicacionAlAbrir {
  private guardado: GuardadoDeLaExplicacion;

  constructor(private readonly almacen: AlmacenDeLaExplicacion) {
    this.guardado = leerLaExplicacion(almacen.leer());
  }

  /** Si se quitó: los ajustes solo ofrecen recuperarla si lo está. */
  get quitada(): boolean {
    return this.guardado.quitada;
  }

  /** Cuántas veces le salió la pantalla a este perfil. */
  get veces(): number {
    return this.guardado.veces;
  }

  /**
   * **Le sale la pantalla**: se cuenta, y se dice si toca explicarla y si se
   * ofrece dejar de hacerlo. Lo que vuelve con la respuesta a algo que se
   * pidió —la tarjeta del tiempo después de esperar— no se cuenta: es la misma
   * pantalla, no otra vez.
   */
  alAbrir(): AlAbrir {
    const veces = this.guardado.veces + 1;
    this.poner({ veces, quitada: this.guardado.quitada });
    return {
      explicar: !this.guardado.quitada,
      ofrecerQuitarla: !this.guardado.quitada && veces >= OFRECER_DESDE_LA_VEZ,
    };
  }

  /** «No volver a explicar»: en este perfil, para siempre o hasta los ajustes. */
  quitar(): void {
    this.poner({ veces: this.guardado.veces, quitada: true });
  }

  /** Desde los ajustes: se vuelve a explicar. La cuenta sigue donde estaba. */
  recuperar(): void {
    this.poner({ veces: this.guardado.veces, quitada: false });
  }

  /** Al cambiar de perfil: lo guardado es el del perfil nuevo. */
  releer(): void {
    this.guardado = leerLaExplicacion(this.almacen.leer());
  }

  private poner(g: GuardadoDeLaExplicacion): void {
    this.guardado = g;
    this.almacen.escribir(g);
  }
}

/**
 * **Abajo o arriba**: en Guyrami y Tukã, en sencillo y sin nombres de botón;
 * desde Taguato, con lo que hace falta para usar la pantalla.
 */
export const tramoDeLaExplicacion = (p: Peldano): "abajo" | "arriba" =>
  p === "dibujo" || p === "palabra" ? "abajo" : "arriba";

/**
 * **La pantalla de las teclas**: abajo es el teclado dibujado, donde las
 * teclas que vuelan llevan su dibujo y se encienden al apretarlas; desde
 * Taguato, qué hace cada una y que se cambian en «Cambiar las teclas», que
 * sale plegado. Una frase por tramo, y lo que dice es lo que se ve: ver
 * `KeyScreen.setSimple`.
 */
export const EXPLICACION_DE_LAS_TECLAS = {
  abajo: "teclas.explica.abajo",
  arriba: "teclas.explica.arriba",
} as const;

export const claveDeLasTeclas = (p: Peldano): string =>
  EXPLICACION_DE_LAS_TECLAS[tramoDeLaExplicacion(p)];

/**
 * **El final del vuelo**: el reconocimiento que ya está escrito en el panel
 * —«¡Buen vuelo!»—, que en Guyrami no se escribe y hasta hoy nadie decía; qué
 * es la hoja, si hay hoja; y qué se mira y cómo se vuelve a volar. Una frase
 * montada con la receta `fin.explica`, un suceso y una voz.
 *
 * La hoja solo se nombra si sale: sin ningún visto el panel no la enseña —un
 * hueco vacío es un reproche— y la voz tampoco. Y se nombra lo que siempre
 * está: la raya del plano y el botón de volver a volar, que abajo es la flecha
 * redonda y desde Taguato lleva su nombre escrito. Los avioncitos de las horas
 * no: en los primeros vuelos todavía no hay ninguno, solo el arco de la media
 * hora en curso, y la voz no puede nombrar lo que no se ve.
 *
 * La receta va a `crudo/instructor/recetas.json` **cuando se graben sus
 * piezas**: una receta que nombra una pieza sin grabar rompe el horneado.
 * Hasta entonces se dice el reconocimiento solo, que sí está grabado. Ver
 * `Game.explicarElFinal`.
 */
export const RECETA_DEL_FINAL = "fin.explica";
export const PIEZAS_DE_LA_RECETA_DEL_FINAL = ["{nivel}", "{hoja?}", "{como}"] as const;

export const EXPLICACION_DEL_FINAL = {
  hoja: "fin.explica.hoja",
  abajo: "fin.explica.abajo",
  arriba: "fin.explica.arriba",
} as const;

/** Lo que se reconoce al acabar: ver `flight/reconocimiento.ts`. */
export type NivelDelFinal = "llegaste" | "bien" | "muyBien" | "redondo";

/** La explicación montada: con qué se rellena la receta y qué texto lee el navegador. */
export interface ExplicacionMontada {
  readonly relleno: Readonly<Record<string, string>>;
  /** Las claves de cada trozo, en orden: el texto es su traducción, junta. */
  readonly trozos: readonly string[];
}

export function montarElFinal(nivel: NivelDelFinal, p: Peldano): ExplicacionMontada {
  const reconocimiento = `fin.${nivel}`;
  const como = EXPLICACION_DEL_FINAL[tramoDeLaExplicacion(p)];
  // «Llegaste» es el final sin ningún visto: ahí no hay hoja que nombrar.
  if (nivel === "llegaste") return { relleno: { nivel: reconocimiento, como }, trozos: [reconocimiento, como] };
  const hoja = EXPLICACION_DEL_FINAL.hoja;
  return { relleno: { nivel: reconocimiento, hoja, como }, trozos: [reconocimiento, hoja, como] };
}

/** Todas las piezas nuevas que se graban para las dos pantallas. */
export const PIEZAS_PARA_GRABAR: readonly string[] = [
  ...Object.values(EXPLICACION_DE_LAS_TECLAS),
  ...Object.values(EXPLICACION_DEL_FINAL),
];

/** Si una clave es de lo que explica una pantalla: para callarla al cerrarla. */
export function esDeLaExplicacion(que: PantallaQueSeExplica, clave: string | undefined): boolean {
  if (!clave) return false;
  if (que === "teclas") return clave.startsWith("teclas.explica.");
  if (que === "fin") return clave === RECETA_DEL_FINAL || clave.startsWith("fin.");
  return clave === "parte.explica" || clave.startsWith("parte.propone.") || clave.startsWith("parte.senala.");
}
