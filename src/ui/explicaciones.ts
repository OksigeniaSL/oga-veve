/**
 * **Tocar una cosa del cuadro y que se explique**: el registro.
 *
 * Lo pidió Enrique así: «tocar un elemento del cuadro (ALT, HDG, la
 * presurización, el tren, los flaps…) abre una ventana con texto, foto y voz,
 * obligatoria porque puede no saber leer. Qué es, para qué sirve y cómo
 * funciona. Dejarlo listo para cablear vídeos en el futuro: Luna y sus
 * animalitos lo explicarán». Y después, con una captura delante: «¿qué
 * significa ese arco?». El arco verde de altitud, el rombo del TCAS y el
 * círculo del T/D no se reconocen sin preguntar, y preguntar a un juego no
 * se puede. Tocar sí.
 *
 * ## Un registro, y no una tabla escrita aquí
 *
 * Cada explicación es una entrada con su `id` —el mismo que lleva la pieza del
 * cuadro en `data-explica`—, su dibujo, su texto y su voz, y un hueco para el
 * vídeo. Las del cuadro y las curiosidades del vuelo se apuntan desde
 * `explicaciones-de-serie.ts`; la tarjeta del avión en 3D apuntará las suyas
 * —los alerones, los flaps, el timón— con la misma función. Quien registra no
 * tiene que saber cómo se pinta la ventana, y la ventana no tiene que saber
 * quién registró.
 *
 * ## Lo que sale en cada peldaño
 *
 * Lo decide la escalera de comunicación, como todo lo demás: el dibujo y la
 * voz en los cuatro peldaños; la palabra corta desde el segundo; el texto
 * entero desde el tercero. Ver `flight/escalera.ts`. Que la ventana la abra
 * quien juega no la saca de la escalera: en Guyrami no se lee, y una ventana
 * que obliga a leer está mal aunque se haya pedido.
 *
 * ## La voz que todavía no está grabada, calla
 *
 * Las frases se graban por clave —ver `audio/banco-de-voz.ts`— y lo que no
 * está grabado el juego lo suele pasar a la voz del navegador, que en Brave
 * para Linux no existe y en el resto suena a robot leyendo un párrafo. Aquí
 * no: **o suena la grabación, o no suena nada**, y lo que se ve —el dibujo y
 * el texto— se queda igual. Las claves pendientes están en
 * `PENDIENTE-VOCES-explicaciones.md`.
 *
 * ## Y la primera vez, la instructora lo presenta
 *
 * En los peldaños de abajo, el primer arco, el primer T/D o el primer rombo de
 * la senda que salen en la pantalla los presenta la instructora una vez por
 * partida, con calma. Este módulo solo lleva la cuenta: qué ha salido y qué
 * falta por presentar. Cuándo hay calma lo sabe `Game`.
 *
 * Este módulo no toca el DOM. Lo que pinta es `ui/ventana-de-explicacion.ts`,
 * que se le enchufa con `ponerPantallaDeExplicaciones`; así se puede probar
 * sin navegador.
 */

import { canalesDe, type Peldano } from "../flight/escalera";
import { t, type TranslationKey } from "../i18n";
import type { DibujoDeSenal } from "./senal";

/**
 * **El dibujo de una explicación**: uno de los de la tarjeta de señal, o un
 * SVG propio.
 *
 * Los de la tarjeta son los que ya se reconocen —el tren, la máscara, la
 * senda—, y reusarlos es media lección: quien aprendió el dibujo en la
 * tarjeta lo reconoce en la ventana. Los símbolos de la pantalla de
 * navegación van dibujados aparte y **con sus colores**: el círculo del T/D es
 * verde y el rombo del tráfico, cian, y explicarlos en blanco sería explicar
 * otra cosa.
 */
export type DibujoDeExplicacion =
  | { readonly senal: DibujoDeSenal }
  | { readonly svg: string };

/**
 * **El hueco del vídeo**: Luna y sus animalitos.
 *
 * Cuando una explicación lo lleva, la ventana enseña el vídeo en el sitio del
 * dibujo y **no suena la instructora**: el vídeo trae su propia voz, y dos
 * voces contando lo mismo a la vez es justo lo que no se hace. Un suceso, una
 * voz.
 *
 * Cada vídeo entra en `CREDITOS.md` con su licencia antes de enchufarlo aquí,
 * como cualquier otro recurso.
 */
export interface VideoDeExplicacion {
  /** La ruta del fichero, relativa a la raíz que se publica. */
  readonly src: string;
  /** La imagen de antes de darle a reproducir, si la hay. */
  readonly poster?: string;
}

/** Lo que se dice y se lee en una de sus variantes. */
export interface Dicho {
  /** El texto entero, desde el peldaño de las cifras. */
  readonly texto: TranslationKey;
  /**
   * La clave de la grabación. Por defecto la del texto, que es lo normal: la
   * voz dice lo que se lee. Va aparte por si algún día una explicación se
   * graba distinta de como se escribe.
   */
  readonly voz?: string;
}

export interface Explicacion extends Dicho {
  /** El mismo nombre que lleva la pieza en `data-explica`. */
  readonly id: string;
  /**
   * El rótulo de cabina, **sin traducir**: «ALT», «HDG», «TCAS». Va encima de
   * la palabra corta desde que se leen letras. Ver la regla 3 de AGENTS.md.
   */
  readonly rotulo?: string;
  readonly dibujo: DibujoDeExplicacion;
  /** La palabra, o las dos, del peldaño de la palabra. Es también el título. */
  readonly corta: TranslationKey;
  /**
   * La variante de tierra, si la explicación cambia con el avión posado.
   *
   * La pantalla de navegación es el caso: en el aire el TCAS enseña a los que
   * vuelan cerca de tu altura, y en el suelo descansa —«TCAS STBY»— y lo que
   * hay en la pista lo cuenta la torre.
   */
  readonly enTierra?: Dicho;
  /**
   * La frase con que la instructora lo presenta la primera vez que sale en la
   * pantalla, en los peldaños de abajo. Sin ella, no se presenta.
   */
  readonly presenta?: TranslationKey;
  /**
   * El dibujo de la tarjeta con que se presenta, de los de la tarjeta de
   * señal: el T/D se presenta con el de empezar a bajar, que es el mismo
   * círculo. Sin él, la tarjeta no sale y queda la pieza iluminada.
   */
  readonly tarjeta?: DibujoDeSenal;
  /** El vídeo, cuando lo haya. Ver `VideoDeExplicacion`. */
  readonly video?: VideoDeExplicacion;
  /**
   * De qué rincón es: del cuadro —se abre tocando la pieza— o de las
   * curiosidades del vuelo —se abre desde su rincón—. Las de otros sitios,
   * como la tarjeta del avión, no dicen nada y no salen en ningún rincón.
   */
  readonly rincon?: "cuadro" | "curiosidades";
}

/** Lo que hace falta saber del momento para elegir qué se enseña. */
export interface Contexto {
  /** El peldaño de la escalera de comunicación. Ver `flight/escalera.ts`. */
  readonly peldano: Peldano;
  /** Si el avión está posado. Ver `Explicacion.enTierra`. */
  readonly enTierra: boolean;
}

/**
 * **Cómo se enseña una explicación ahora**, ya decidido: lo que la ventana
 * pinta y lo que la voz dice. Aparte y puro, que es la parte que se puede
 * equivocar y se puede probar.
 */
export interface ComoSeEnsena {
  readonly explicacion: Explicacion;
  /** El rótulo de cabina, o `null` si en este peldaño no hay letras. */
  readonly rotulo: string | null;
  /** La palabra corta, traducida, o `null`. */
  readonly palabra: string | null;
  /** El texto entero, traducido, o `null`. */
  readonly texto: string | null;
  /**
   * El nombre para quien no ve la pantalla —el del diálogo—, que va siempre:
   * un lector de pantalla no pasa por la escalera.
   */
  readonly nombre: string;
  /** Lo que diría la voz: la clave de la grabación y el texto. */
  readonly voz: { readonly clave: string; readonly texto: string };
  /** Si la voz va a sonar: grabada y sin vídeo que hable por ella. */
  readonly suena: boolean;
  readonly video: VideoDeExplicacion | null;
}

/**
 * **La voz de las explicaciones**, que la pone `Game`.
 *
 * Es la instructora, pero con una condición que el resto del juego no tiene:
 * aquí solo se habla con la frase grabada. Ver la cabecera.
 */
export interface VozDeLasExplicaciones {
  /** Si esta clave tiene ya su grabación. */
  grabada(clave: string): boolean;
  /** Dice la frase grabada. Solo se llama si `grabada` dijo que sí. */
  decir(clave: string, texto: string): void;
  /**
   * **Y la presentación de la primera vez**, que no la pidió nadie.
   *
   * Va aparte de `decir` porque no es lo mismo: abrir una explicación con el
   * dedo es pedirle a la instructora que hable, y presentar el arco verde es
   * ella enseñando por su cuenta. Sin instructora, lo primero se contesta y
   * lo segundo se calla. Ver `flight/sin-instructora.ts`. Sin esto, se
   * presenta con `decir`, como siempre.
   */
  presentar?(clave: string, texto: string): void;
  /** Se calla ahora mismo, si estaba diciendo una explicación. */
  callar(): void;
}

/**
 * **Dónde se enseña**: la ventana de verdad en el juego, y una de mentira en
 * las pruebas.
 */
export interface PantallaDeExplicaciones {
  mostrar(como: ComoSeEnsena): void;
  /** Y el rincón de las curiosidades, con todas las suyas. */
  mostrarRincon(cuales: readonly ComoSeEnsena[]): void;
  ocultar(): void;
}

const registro = new Map<string, Explicacion>();

/**
 * **Apunta una explicación.** Si ya había una con ese `id`, la sustituye: así
 * quien junte la tarjeta del avión puede afinar una de serie sin tocar este
 * fichero.
 */
export function registrarExplicacion(e: Explicacion): void {
  registro.set(e.id, e);
}

/** La explicación con ese `id`, si la hay. */
export function explicacionDe(id: string): Explicacion | undefined {
  return registro.get(id);
}

/** Todas las de un rincón, en el orden en que se apuntaron. */
export function explicacionesDe(rincon: Explicacion["rincon"]): readonly Explicacion[] {
  return [...registro.values()].filter((e) => e.rincon === rincon);
}

/**
 * **Lo que se enseña de una explicación en este momento.** Ver
 * `ComoSeEnsena`.
 */
export function comoSeEnsena(
  e: Explicacion,
  ctx: Contexto,
  grabada: (clave: string) => boolean,
): ComoSeEnsena {
  const canales = canalesDe(ctx.peldano);
  const dicho: Dicho = (ctx.enTierra && e.enTierra) || e;
  const claveDeVoz = dicho.voz ?? dicho.texto;
  const textoEntero = t(dicho.texto);
  const video = e.video ?? null;
  return {
    explicacion: e,
    /*
     * El rótulo de cabina es letra, así que espera al peldaño de la palabra
     * como todo rótulo del cuadro. Ver `LETRAS_DESDE` en `familia.ts`.
     */
    rotulo: canales.texto ? (e.rotulo ?? null) : null,
    palabra: canales.texto ? t(e.corta) : null,
    texto: canales.texto && !canales.corto ? textoEntero : null,
    nombre: e.rotulo ? `${e.rotulo} · ${t(e.corta)}` : t(e.corta),
    voz: { clave: claveDeVoz, texto: textoEntero },
    suena: video === null && grabada(claveDeVoz),
    video,
  };
}

/* ── El estado: qué está abierto, y con qué se habla y se pinta ────────── */

let voz: VozDeLasExplicaciones | null = null;
let pantalla: PantallaDeExplicaciones | null = null;
/**
 * Quién pone la ventana cuando nadie la ha puesto: la de verdad, que se crea
 * la primera vez que hace falta. Lo enchufa `ventana-de-explicacion.ts` al
 * cargarse, para que este módulo no tenga que importar el DOM.
 */
let pantallaPorDefecto: (() => PantallaDeExplicaciones | null) | null = null;
let contexto: () => Contexto = () => ({ peldano: "cifra", enTierra: true });
let abierta: string | null = null;
/** Si lo abierto es el rincón entero, y no una sola. */
let rinconAbierto = false;
/** Lo que dijo la voz la última vez que abrió algo, para callarlo al cerrar. */
let hablando = false;

/** Enchufa la voz. `null` la desenchufa: todo se calla. */
export function ponerVozDeLasExplicaciones(v: VozDeLasExplicaciones | null): void {
  voz = v;
}

/** Enchufa la pantalla. Para las pruebas, sobre todo. */
export function ponerPantallaDeExplicaciones(p: PantallaDeExplicaciones | null): void {
  pantalla = p;
}

/** Quién crea la ventana de verdad cuando haga falta. Ver `pantallaPorDefecto`. */
export function crearPantallaConEsto(crear: () => PantallaDeExplicaciones | null): void {
  pantallaPorDefecto = crear;
}

/**
 * De dónde sale el contexto: el peldaño y si se está en tierra. Lo pone
 * `Game`; sin él —en el hangar, antes de que haya vuelo—, el peldaño de las
 * cifras y en tierra, que enseña el dibujo, la palabra y el texto.
 */
export function ponerContextoDeLasExplicaciones(c: () => Contexto): void {
  contexto = c;
}

function laPantalla(): PantallaDeExplicaciones | null {
  if (!pantalla && pantallaPorDefecto) pantalla = pantallaPorDefecto();
  return pantalla;
}

const sinGrabar = (): boolean => false;

function grabadaSegunLaVoz(clave: string): boolean {
  return voz ? voz.grabada(clave) : sinGrabar();
}

/**
 * **Abre la explicación con ese `id`.** Devuelve si la había.
 *
 * `cambios` deja forzar parte del contexto: la tarjeta del avión en el hangar
 * puede decir que se está en tierra aunque el último vuelo acabara en el aire.
 */
export function abrirExplicacion(id: string, cambios?: Partial<Contexto>): boolean {
  const e = registro.get(id);
  if (!e) return false;
  const p = laPantalla();
  callarLaVoz();
  const como = comoSeEnsena(e, { ...contexto(), ...cambios }, grabadaSegunLaVoz);
  abierta = id;
  rinconAbierto = false;
  p?.mostrar(como);
  if (como.suena && voz) {
    voz.decir(como.voz.clave, como.voz.texto);
    hablando = true;
  }
  return true;
}

/**
 * **Abre el rincón de las curiosidades**: los porqués de lo que pasa en un
 * vuelo de pasaje y que en el vuelo no se cuentan cada vez. Lo pidió Enrique
 * con esas palabras: «a los pasajeros no se les da explicaciones, tampoco
 * vamos a ser tan pesados de decirlo en todos los vuelos». Aquí están, para
 * quien las busque.
 */
export function abrirCuriosidades(cambios?: Partial<Contexto>): void {
  const p = laPantalla();
  callarLaVoz();
  const ctx = { ...contexto(), ...cambios };
  abierta = null;
  rinconAbierto = true;
  p?.mostrarRincon(
    explicacionesDe("curiosidades").map((e) => comoSeEnsena(e, ctx, grabadaSegunLaVoz)),
  );
}

/** Vuelve a decir la de ahora, si suena. Es el botón del altavoz. */
export function repetirLaVoz(): void {
  if (!abierta) return;
  const e = registro.get(abierta);
  if (!e) return;
  const como = comoSeEnsena(e, contexto(), grabadaSegunLaVoz);
  callarLaVoz();
  if (como.suena && voz) {
    voz.decir(como.voz.clave, como.voz.texto);
    hablando = true;
  }
}

function callarLaVoz(): void {
  if (hablando) voz?.callar();
  hablando = false;
}

/** Cierra lo que esté abierto y calla lo que se estuviera diciendo. */
export function cerrarExplicacion(): void {
  callarLaVoz();
  abierta = null;
  rinconAbierto = false;
  pantalla?.ocultar();
}

/**
 * **Lo cierra la ventana**, cuando quien juega toca fuera o pulsa Escape: el
 * estado se pone al día sin volver a ocultar lo que ya se ocultó.
 */
export function alCerrarseLaVentana(): void {
  callarLaVoz();
  abierta = null;
  rinconAbierto = false;
}

/** El `id` de la explicación abierta, o `null`. */
export function explicacionAbierta(): string | null {
  return abierta;
}

/** Si está abierto el rincón de las curiosidades. */
export function curiosidadesAbiertas(): boolean {
  return rinconAbierto;
}

/* ── La primera vez: lo que ha salido y lo que falta presentar ───────── */

/**
 * Lo que ya salió en la pantalla, en orden, y lo ya presentado. **Una vez por
 * partida**, como el rombo del TCAS en `Game.explicarElTrafico`: la segunda
 * vez no enseña nada nuevo, y una instructora que repite la misma lección en
 * cada vuelo deja de oírse.
 */
const salidos: string[] = [];
const presentadas = new Set<string>();

/**
 * **Esto acaba de salir en la pantalla.** Lo llama el cuadro cuando una pieza
 * con explicación pasa de escondida a vista. Barato a propósito: se llama
 * desde el bucle del dibujo.
 */
export function apareceEnPantalla(id: string): void {
  if (presentadas.has(id) || salidos.includes(id)) return;
  salidos.push(id);
}

/**
 * **La siguiente que falta presentar**, de las que ya salieron y llevan su
 * frase de presentación, o `null`. No la da por presentada: eso lo dice quien
 * de verdad la presenta, con `yaPresentada`, que puede no encontrar la calma
 * que hace falta.
 */
export function siguienteQuePresentar(
  sirve: (e: Explicacion) => boolean = () => true,
): Explicacion | null {
  for (const id of salidos) {
    if (presentadas.has(id)) continue;
    const e = registro.get(id);
    if (e?.presenta && sirve(e)) return e;
  }
  return null;
}

/** **Ya está presentada**: no se vuelve a presentar en esta partida. */
export function yaPresentada(id: string): void {
  presentadas.add(id);
  const i = salidos.indexOf(id);
  if (i >= 0) salidos.splice(i, 1);
}

/** Si ya se presentó. */
export function estaPresentada(id: string): boolean {
  return presentadas.has(id);
}

/**
 * **La instructora la presenta**: dice su frase si está grabada y la da por
 * presentada. Devuelve si sonó.
 *
 * Que no suene no la deja sin presentar: lo que se ve —la pieza que se
 * ilumina en el cuadro y la tarjeta— es el canal que está siempre, y la voz
 * se suma cuando llegue su grabación. Esperar a la voz para presentarla sería
 * no presentarla nunca en Brave para Linux.
 */
export function presentar(e: Explicacion): boolean {
  yaPresentada(e.id);
  if (!e.presenta || !voz || !voz.grabada(e.presenta)) return false;
  if (voz.presentar) voz.presentar(e.presenta, t(e.presenta));
  else voz.decir(e.presenta, t(e.presenta));
  return true;
}

/**
 * Todo a cero: registro, estado y cuentas. **Solo para las pruebas**, que
 * comparten el módulo entre casos.
 */
export function olvidarTodo(): void {
  registro.clear();
  salidos.length = 0;
  presentadas.clear();
  voz = null;
  pantalla = null;
  pantallaPorDefecto = null;
  contexto = () => ({ peldano: "cifra", enTierra: true });
  abierta = null;
  rinconAbierto = false;
  hablando = false;
}
