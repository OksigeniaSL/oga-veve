/**
 * La lista de paneles que se abren encima del vuelo.
 *
 * **Un solo sitio**, que es lo que pide #70 con esas palabras: «añadir uno
 * debe ser una entrada en una tabla, no tocar seis ficheros». Antes había que
 * tocar cinco —el botón, la caja, el módulo, el cableado y el banco de
 * accesibilidad— y la prueba de que eso no se sostiene es que **dos se
 * quedaron sin banco**: el plano y el tiempo llevaban meses sin encierro del
 * foco y sin Escape, y el banco no lo decía porque su lista era otra lista,
 * escrita a mano, con cuatro de los seis.
 *
 * Ahora el HUD dibuja su fila de botones de aquí y el banco la recorre de
 * aquí, así que las dos listas no pueden volver a separarse. Ver
 * `__oga.paneles`.
 *
 * El hangar y la pantalla de pilotos no están, y no es un olvido: son
 * pantallas **de entrada**, no paneles encima del vuelo — ahí Escape no tiene
 * a dónde volver. Y el botón del sonido tampoco: es un interruptor, no abre
 * nada.
 */

import { t, type TranslationKey } from "../i18n";

export interface PanelDelVuelo {
  /** El `data-hud` de su botón, y con él se le nombra en todas partes. */
  readonly id: string;
  /** Dónde vive la caja que se abre. Selector, porque no todas tienen `id`. */
  readonly caja: string;
  /** Cómo se llama, para el `aria-label` del botón. */
  readonly titulo: TranslationKey;
  /**
   * Si su dibujo va de trazo y no de relleno.
   *
   * Es propiedad del dibujo y no del panel, pero vive aquí porque es lo que
   * decide la clase del botón. La clase se llama `teclas-boton`, por el primero
   * que la necesitó, y lo que hace no tiene nada que ver con las teclas: pone
   * el icono a trazo de 1,6 en vez de a relleno.
   */
  readonly trazo?: boolean;
  /** El dibujo, en el lienzo de 24 de siempre. */
  readonly icono: string;
}

export const PANELES_DEL_VUELO: readonly PanelDelVuelo[] = [
  {
    /*
     * La pantalla de mandos. Existe porque esa pantalla se abría solo con una
     * tecla, y una pantalla que explica los mandos no puede esconderse detrás
     * de un mando. Menos todavía para quien no lee.
     */
    id: "keys",
    caja: "#teclas",
    titulo: "teclas.title",
    trazo: true,
    icono: `
      <rect x="2" y="6" width="20" height="13" rx="2.4" />
      <path d="M6 10h1.6M10.2 10h1.6M14.4 10h1.6M18.6 10h.8
               M6 13.4h1.6M10.2 13.4h1.6M14.4 13.4h1.6M18.6 13.4h.8
               M7.6 16.6h8.8" />`,
  },
  {
    /* El plano del campo, doblado en tres como el de papel. */
    id: "mapa-boton",
    caja: '[data-hud="mapa"]',
    titulo: "mapa.title",
    trazo: true,
    icono: `
      <path d="M2.6 6.2 L9 3.6 v14.2 l-6.4 2.6 Z" />
      <path d="M9 3.6 L15 6.2 v14.2 L9 17.8 Z" />
      <path d="M15 6.2 L21.4 3.6 v14.2 L15 20.4 Z" />`,
  },
  {
    /* El tiempo: la nube y el viento por debajo, que es lo que cambia un vuelo. */
    id: "tiempo-boton",
    caja: '[data-hud="tiempo"]',
    titulo: "tiempo.title",
    trazo: true,
    icono: `
      <path d="M6.4 17.4 a4.4 4.4 0 0 1 0.5-8.8 a5.8 5.8 0 0 1 11.1 1.5
               a3.7 3.7 0 0 1-0.6 7.3 Z" />
      <path d="M4 21.2 h6.4 M13 21.2 h7" />`,
  },
  {
    /*
     * El esquema de cómo vuela un ala.
     *
     * Tiene botón propio y no vive escondido en un menú porque es la única
     * explicación del juego que no se puede dar hablando, y porque la pregunta
     * —«¿y por qué se cae si tiro mucho?»— llega justo después de una pérdida,
     * o sea volando y no en el hangar. El icono es el perfil en corte con la
     * corriente pasándole por encima, que es literalmente lo que hay dentro.
     */
    id: "ala",
    caja: "#ala",
    titulo: "ala.titulo",
    icono: `
      <path d="M3 15 C8 15 13 13.4 21 9 C15 15.6 9 18 3 18 Z" />
      <path d="M2.4 6.6 C7 6.6 12 5.4 20 2.6 M2.4 10.2 C6 10.2 9.4 9.6 13 8.4"
            fill="none" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" />`,
  },
  {
    /*
     * Los créditos, y **esto no es cortesía: es una obligación**. El relieve es
     * de Copernicus y las ortofotos son CC BY del PNOA y de Sentinel-2; las
     * tres licencias exigen atribución visible. Estaban solo detrás de F1, o
     * sea inalcanzables en una tablet, que es el aparato del aula. Y ahí dentro
     * va también la promesa que da sentido al proyecto: gratis para siempre
     * para la educación paraguaya.
     *
     * **Y cabe dentro del botón, con aire alrededor.** El círculo medía 9,4 de
     * radio en un lienzo de 24, o sea que tocaba el borde: al lado de los demás
     * iconos —formas pequeñas con margen— no se leía como un icono sino como un
     * **aro alrededor del botón**, más gordo y más brillante que todo lo que
     * tenía al lado. «Este icono habría que mejorarlo, no encaja con el resto.»
     *
     * Y el motivo, mirando la fila entera: **el icono repetía el botón**. Todos
     * los botones de la barra son un círculo oscuro con un dibujo abierto
     * dentro —un teclado, un mapa plegado, una nube—; este metía otro círculo
     * dentro del círculo, y lo que se veía era una diana. Se probó encogerlo y
     * afinarle el trazo y seguía siendo una diana. Sin el aro es la «i» y nada
     * más, que es lo que son los demás: un dibujo dentro de un botón redondo.
     */
    id: "credits",
    caja: "#creditos",
    titulo: "credits.title",
    icono: `
      <circle cx="12" cy="5.4" r="1.35" />
      <path d="M12 9.4 v9" stroke="currentColor" stroke-width="2.2"
            stroke-linecap="round" fill="none" />`,
  },
  {
    /*
     * El cuaderno de vuelo: las horas, lo hecho y el grado.
     *
     * La hombrera con sus galones es el icono, y no hace falta más: es lo que
     * hay dentro, y quien ha visto una vez sus galones al terminar un vuelo
     * sabe qué es esto sin que nadie se lo diga.
     */
    id: "cuaderno",
    caja: "#cuaderno",
    titulo: "cuaderno.title",
    icono: `
      <rect x="4" y="4" width="16" height="13" rx="3" fill="none"
            stroke="currentColor" stroke-width="1.8" />
      <rect x="4" y="15.5" width="16" height="3.5" rx="1.75" />
      <path d="M7.5 8.4 h9 M7.5 11.6 h9" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" fill="none" />`,
  },
];

/** El botón de un panel, para la fila de arriba del HUD. */
export function botonDePanel(p: PanelDelVuelo): string {
  const clase = p.trazo ? "sonido teclas-boton" : "sonido";
  return `
    <button class="${clase}" type="button" data-hud="${p.id}"
            aria-label="${t(p.titulo)}">
      <svg viewBox="0 0 24 24" aria-hidden="true">${p.icono}
      </svg>
    </button>`;
}

/** Toda la fila, en orden. Lo que dibuja el HUD. */
export function botonesDeLosPaneles(): string {
  return PANELES_DEL_VUELO.map(botonDePanel).join("");
}
