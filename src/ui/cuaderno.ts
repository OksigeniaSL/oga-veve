/**
 * La página del cuaderno de vuelo: lo que llevas hecho y el grado que sale.
 *
 * Es lo que un niño le enseña a su padre, y por eso está pensada para eso: la
 * manga con las barras del grado ocupando media pantalla, el grado con su nombre, y
 * debajo las cuentas — horas, despegues, aterrizajes, frustradas, aeródromos—.
 * Nada de porcentajes ni de barras de progreso: **cosas hechas**.
 *
 * Y una línea al final con lo que falta para el siguiente grado, dicha en
 * cosas que se pueden hacer esta tarde: «te faltan dos aterrizajes» se cumple
 * hoy; «llevas un 68 %» no le dice a nadie qué hacer ahora.
 *
 * ## Y debajo, los vuelos
 *
 * Un total no es un recuerdo: dice que hubo veinte aterrizajes y no dice
 * **cuál fue el tuyo**. Eso lo guardaba `flight/bitacora.ts` desde que se
 * escribió —fecha, campo, duración, lo que se ganó y la traza del vuelo entero— y
 * **no se enseñaba en ninguna parte**: una funcionalidad terminada, con sus
 * topes medidos y sus 82,2 KB de presupuesto, esperando a que alguien la
 * enchufara.
 *
 * Se enchufa aquí, y como tarjetas con el dibujo delante: a los cuatro años
 * «lo que hice el sábado» no es una fila de una tabla, es **el dibujo de por
 * dónde fui**. `plano()` ya sabe pintar un aeródromo con una traza encima y
 * ya encuadra para que el vuelo entero quepa; no había que inventar nada.
 *
 * ## Y sin una palabra en el peldaño que no lee
 *
 * El punto 131: «un sello por aeropuerto visitado, horas de vuelo en dibujo, y
 * los galones que se ganan con lo que significan». La página se leía: cifras
 * con su palabra debajo, una frase de lo que falta y dos títulos. Ahora va por
 * la escalera de comunicación como el resto del juego —ver
 * `flight/escalera.ts`—:
 *
 * - **Las horas, en avioncitos**, los mismos del final del vuelo. La cifra,
 *   desde el peldaño de los números.
 * - **Las cuentas, en puntos** que se cuentan con el dedo —una estrella por
 *   cada diez—, con el dibujo de lo que cuentan: la toma, la frustrada, la
 *   manga de viento de cada aeródromo. La cifra, también desde los números.
 * - **Un sello por campo**, con su isla o su país, su pista y su paisaje. Ver
 *   `sellos.ts`.
 * - **La escalera de grados**, cada uno con su explicación al tocarlo: qué
 *   quiere decir, en voz y dibujo. Ver `explicaciones-de-serie.ts`.
 * - **Y en cada vuelo, la hoja de la instructora**: un visto por parte bien
 *   hecha, y delante lo de antes de volar —la vuelta al avión, el día que se
 *   decidió no salir, el despegue abortado—. Las barras son del grado y nada
 *   más; ver `ui/hoja.ts`.
 * - **Y el interruptor de volar sin instructora**, con su candado y lo que
 *   falta mientras no se tiene el grado. Ver `flight/sin-instructora.ts`.
 *
 * Las palabras —el nombre del grado, las glosas, los títulos— salen desde el
 * peldaño de la palabra, como en el cuadro.
 */

import { t } from "../i18n";
import {
  barrasDe,
  grado,
  GRADOS,
  loQueFalta,
  type Cuaderno,
  type Grado,
  type Requisito,
} from "../flight/cuaderno";
import { canalesDe, type Peldano } from "../flight/escalera";
import {
  GRADO_PARA_VOLAR_SIN_INSTRUCTORA,
  loQueFaltaParaVolarSinInstructora,
} from "../flight/sin-instructora";

/** Las horas, como se dicen en un cuaderno de vuelo: horas y minutos. */
function horasDe(segundos: number): string {
  const m = Math.floor(segundos / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}
import { Panel } from "./panel";
import { armarPanel, CERRAR } from "./concha";
import { abrirCuriosidades, abrirExplicacion } from "./explicaciones";
import { LAMPARITA } from "./ventana-de-explicacion";
import { manga as dibujarManga } from "./manga";
import { hojaDelVuelo } from "./hoja";
import { leerBitacora, type Vuelo } from "../flight/bitacora";
import { nombreCorto, plano } from "./hangar";
import { SCENARIOS } from "../world/scenarios";
import type { Aerodrome } from "../world/aerodrome";
import { desplazarAerodromo } from "../world/aerodromo-desplazado";
import { dondeCae } from "../world/entre-aerodromos";
import { dibujarRelojEnFilas, dibujarReloj, relojDe } from "./reloj";
import { DIBUJOS, type DibujoDeSenal } from "./senal";
import { camposDeLosSellos, selloDe } from "./sellos";
import { CANDADO, INSTRUCTORA_CALLADA } from "./instructora-callada";

/**
 * Alto del lienzo de la manga en el cuaderno.
 *
 * Dos más que en el HUD, que es aire por debajo del puño: aquí la manga se
 * mira de cerca y pegada al borde queda apretada.
 */
const CUADERNO_ALTO = 34;

/**
 * Cuántos vuelos se enseñan.
 *
 * Seis. La bitácora guarda sesenta —ver `CUANTOS_VUELOS`— y pintarlos todos
 * haría de esta página una lista para leer, que es justo lo contrario de lo
 * que es: una cosa que se le enseña a alguien. Seis caben en dos filas sin
 * desplazar la página en una tablet, y son los que uno recuerda.
 */
const CUANTOS_SE_VEN = 6;

/** La duración de un vuelo, en minutos, que es como se cuenta uno corto. */
function duracionDe(segundos: number): string {
  const m = Math.round(segundos / 60);
  return m < 60 ? `${m}′` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * La tarjeta de un vuelo.
 *
 * **Sin una sola palabra obligatoria.** El dibujo dice dónde y por dónde; la
 * cifra, cuánto duró; y la hoja de la instructora, qué salió bien. Quien no
 * lee reconoce su vuelo por la forma de la raya —un circuito es un óvalo, una
 * ida y vuelta es un palo— y eso es lo que hace que quiera enseñarlo.
 *
 * **La hoja ya no son rayitas.** Eran una barra por galón, con el tope en
 * cuatro, y se leían como las barras de la manga: un vuelo «de comandante» y
 * otro «de cadete». Las barras son del grado; lo de un vuelo son vistos, uno
 * por parte, con su dibujo. Y delante, lo de antes de volar que guarda la
 * bitácora en `Vuelo.antes`: la vuelta al avión, entera o a medias, y la
 * decisión de quedarse o el despegue abortado, que llevan su visto como una
 * toma. **Quedarse en tierra cuenta como un día bien decidido.** Ver
 * `hojaDelVuelo`.
 *
 * La fecha va en el `title` y no pintada: es el único dato de los cuatro que
 * no le dice nada a quien no lee, y ocuparía el sitio del que sí.
 */
export function tarjetaDeVuelo(v: Vuelo): string {
  const esc = SCENARIOS.find((e) => e.id === v.escenario);
  if (!esc) return "";
  const cuando = new Date(v.fecha);
  return `
    <li class="bitacora__vuelo" title="${cuando.toLocaleDateString()}">
      <div class="bitacora__plano">${plano(esc, 0, v.traza, losOtrosCampos(v))}</div>
      <div class="bitacora__pie">
        <span class="bitacora__duracion">${duracionDe(v.segundos)}</span>
        ${hojaDelVuelo(v)}
      </div>
    </li>`;
}

/**
 * Los aeródromos de los otros campos del vuelo, corridos hasta donde caen
 * vistos desde el de casa: la misma cuenta que usa el juego para ponerlos en
 * el mundo. Ver `MundoVecino`.
 */
export function losOtrosCampos(v: Vuelo): Aerodrome[] {
  const casa = SCENARIOS.find((e) => e.id === v.escenario)?.aerodrome;
  if (!casa) return [];
  const ids = new Set(
    [v.salida, v.llegada].filter(
      (id): id is string => !!id && id !== v.escenario,
    ),
  );
  const otros: Aerodrome[] = [];
  for (const id of ids) {
    const suyo = SCENARIOS.find((e) => e.id === id)?.aerodrome;
    if (!suyo) continue;
    const d = dondeCae(casa.origin, suyo.origin);
    otros.push(desplazarAerodromo(suyo, d.x, d.z));
  }
  return otros;
}

/**
 * **Una cuenta en puntos**, para contar con el dedo: un punto por cada una y
 * una estrella por cada diez, como se cuentan los billetes. Hasta noventa y
 * nueve se dibuja entero; con más, nueve estrellas y nueve puntos, que es ya
 * más de lo que se cuenta con el dedo y no un número que mentir.
 *
 * `hueco` dibuja los puntos vacíos: es lo que **falta**, no lo hecho, y por
 * eso se distingue de un vistazo.
 */
export function enPuntos(n: number, hueco = false): string {
  const cuanto = Math.max(0, Math.floor(n));
  if (cuanto === 0) return "";
  const diez = Math.min(9, Math.floor(cuanto / 10));
  const uno = diez === 9 && cuanto >= 100 ? 9 : cuanto % 10;
  const piezas: string[] = [];
  for (let i = 0; i < diez; i++) piezas.push("estrella");
  for (let i = 0; i < uno; i++) piezas.push("punto");
  const porFila = 5;
  const filas = Math.ceil(piezas.length / porFila);
  const ancho = Math.min(piezas.length, porFila) * 10;
  const dibujo = piezas
    .map((p, i) => {
      const cx = 5 + (i % porFila) * 10;
      const cy = 5 + Math.floor(i / porFila) * 10;
      return p === "estrella"
        ? `<path class="puntos__estrella${hueco ? " puntos__estrella--hueca" : ""}" transform="translate(${cx} ${cy})"
             d="M0 -4.6 L1.3 -1.4 L4.4 -1.4 L1.9 0.6 L2.8 3.8 L0 1.9 L-2.8 3.8 L-1.9 0.6 L-4.4 -1.4 L-1.3 -1.4 Z" />`
        : `<circle class="puntos__punto${hueco ? " puntos__punto--hueco" : ""}" cx="${cx}" cy="${cy}" r="3.3" />`;
    })
    .join("");
  /*
   * Con su tamaño puesto: un SVG sin él mide trescientos por ciento cincuenta
   * en todos los navegadores. Diez unidades son once píxeles, un punto que se
   * cuenta con la vista sin acercarse.
   */
  return `<svg class="puntos" viewBox="0 0 ${ancho} ${filas * 10}"
    width="${(ancho * 1.1).toFixed(1)}" height="${(filas * 11).toFixed(1)}" aria-hidden="true">${dibujo}</svg>`;
}

/** El dibujo de cada cuenta, de los de la tarjeta de señal: ya se reconocen. */
const DIBUJO_DE: Readonly<Record<string, DibujoDeSenal>> = {
  despegues: "subida",
  aterrizajes: "toma",
  frustradas: "frustrada",
  // La manga de viento: la tiene cada aeródromo y ninguna otra cosa.
  aerodromos: "manga",
};

/** Lo que el cuaderno necesita del juego, para lo que depende del vuelo. */
export interface OpcionesDelCuaderno {
  /** El peldaño de la escalera: decide si hay cifras y palabras. */
  readonly peldano?: () => Peldano;
  /** Si se vuela sin instructora ahora mismo. */
  readonly sinInstructora?: () => boolean;
  /** Y quien la pone o la quita. Ver `Game.ponerSinInstructora`. */
  readonly alCambiarSinInstructora?: (sin: boolean) => void;
}

export class CuadernoScreen {
  private readonly root: HTMLElement;
  /** Foco atrapado y Escape que cierra desde donde sea. Ver `ui/panel.ts`. */
  private readonly panel: Panel;
  private cuaderno: Cuaderno;
  private readonly opciones: OpcionesDelCuaderno;

  constructor(
    root: HTMLElement,
    cuaderno: Cuaderno,
    opciones: OpcionesDelCuaderno = {},
  ) {
    this.root = root;
    this.cuaderno = cuaderno;
    this.opciones = opciones;
    this.panel = new Panel(root, () => this.hide());
    this.pintar();
    root.addEventListener("click", (e) => {
      const tocado = e.target as HTMLElement | null;
      if (e.target === root) this.hide();
      /*
       * **Y el de cerrar se llama `data-accion="cerrar"`, como en todos.**
       *
       * Esto miraba `data-cerrar`, que es una de las cuatro maneras que había
       * antes de que los paneles tuvieran una anatomía común. El botón se
       * dibuja desde entonces con la nueva —hay hasta una prueba que lo
       * exige— así que aquí quedó escuchando un atributo que ya no existe: el
       * clic sonaba, porque suena al pulsar cualquier cosa, y el panel no se
       * cerraba. Contado jugando: «el botón naranja cerrar no cierra, pero sí
       * se oye una notificación; hay que hacer clic por fuera para salir».
       *
       * Y con `closest`, no con `e.target`: lo que se pulsa puede ser el texto
       * de dentro del botón, y entonces el `target` es el texto y no el botón.
       * Es la misma forma que ya usan los otros paneles. Ver `concha.ts`.
       */
      if (tocado?.closest?.('[data-accion="cerrar"]')) this.hide();
      /*
       * **Y las curiosidades del vuelo**, con su lamparita: el cuaderno es
       * donde se mira lo que uno ya sabe, y el rincón de los porqués va al
       * lado. Se abre encima, y al cerrarlo se vuelve aquí. Ver
       * `ui/ventana-de-explicacion.ts`.
       */
      if (tocado?.closest?.('[data-accion="curiosidades"]')) abrirCuriosidades();
      /*
       * **Y la manga, tocada, dice qué son sus barras.** AGENTS.md lo pide
       * sin rodeos: si el juego enseña a contar los galones, tiene que
       * enseñar también qué significan. Cuatro no quieren decir que mandes;
       * quieren decir que respondes.
       */
      if (tocado?.closest?.(".cuaderno__manga")) abrirExplicacion("galones");
      /*
       * **Y la hoja de un vuelo, tocada, dice qué es**: lo que rellena la
       * instructora, y que lo que falta no se tacha. Ver `ui/hoja.ts`.
       */
      if (tocado?.closest?.(".bitacora .hoja")) abrirExplicacion("hoja");
      /*
       * **Y cada escalón de la escalera, lo suyo**: de qué se responde con
       * ese grado. Ver `GRADO_APRENDIZ` en `explicaciones-de-serie.ts`.
       */
      const escalon = tocado?.closest?.<HTMLElement>("[data-grado]");
      if (escalon?.dataset.grado) abrirExplicacion(`grado-${escalon.dataset.grado}`);
      /*
       * **El interruptor de volar sin instructora.** Con el grado, pone y
       * quita; sin él, explica qué hace falta —que es lo único que se puede
       * hacer con un candado: saber cómo se abre—.
       */
      if (tocado?.closest?.("[data-sola]")) {
        if (this.puedeSola) this.opciones.alCambiarSinInstructora?.(!this.vaSola);
        else abrirExplicacion("sin-instructora");
      }
      if (tocado?.closest?.("[data-sola-que]")) abrirExplicacion("sin-instructora");
    });
  }

  /** Se le pasa el cuaderno cada vez que cambia algo digno de apuntarse. */
  ponerCuaderno(c: Cuaderno): void {
    this.cuaderno = c;
    if (!this.root.hidden) this.pintar();
  }

  /** Si el cuaderno ya abre el interruptor. */
  private get puedeSola(): boolean {
    return loQueFaltaParaVolarSinInstructora(this.cuaderno) === null;
  }

  /** Si se vuela sin instructora ahora. */
  private get vaSola(): boolean {
    return this.opciones.sinInstructora?.() ?? false;
  }

  private pintar(): void {
    const c = this.cuaderno;
    const g: Grado = grado(c);
    const canales = canalesDe(this.opciones.peldano?.() ?? "cifra");
    const falta = loQueFalta(c);
    const cuenta = (que: keyof typeof DIBUJO_DE, n: number): string => `
      <div class="cuaderno__dato" role="img" aria-label="${n} ${t(`cuaderno.${que}` as never)}">
        <span class="cuaderno__dibujo" aria-hidden="true">${DIBUJOS[DIBUJO_DE[que]!]}</span>
        ${
          canales.cifra
            ? `<span class="cuaderno__cifra">${n}</span>`
            : `<span class="cuaderno__puntos">${enPuntos(n)}</span>`
        }
        ${canales.texto ? `<span class="cuaderno__glosa">${t(`cuaderno.${que}` as never)}</span>` : ""}
      </div>`;
    /*
     * Lo que falta para el grado siguiente, **salvo que sea el de volar sin
     * instructora**: entonces lo cuenta su interruptor, con su candado, y
     * decirlo dos veces seguidas sería ruido.
     */
    const faltaAqui =
      falta &&
      !(falta.grado === GRADO_PARA_VOLAR_SIN_INSTRUCTORA && !this.puedeSola);
    this.root.innerHTML = armarPanel({
      titulo: t("cuaderno.title"),
      panel: "cuaderno",
      clase: `cuaderno__panel${canales.texto ? "" : " cuaderno__panel--sin-letras"}`,
      acciones: [
        {
          dice: t("explica.curiosidades"),
          como: "curiosidades",
          dibujo: LAMPARITA,
        },
        CERRAR(),
      ],
      cuerpo: `
        <button type="button" class="cuaderno__manga" aria-label="${t("explica.galones.corta")}">
          ${dibujarManga(barrasDe(g), CUADERNO_ALTO, t("galon.manga"))}
        </button>
        ${canales.texto ? `<h3 class="cuaderno__grado">${t(`grado.${g}` as never)}</h3>` : ""}
        ${this.laEscalera(g, canales.texto)}
        ${this.elInterruptor(canales.texto, canales.cifra)}
        <div class="cuaderno__horas" role="img" aria-label="${horasDe(c.segundos)} ${t("cuaderno.horas")}">
          ${
            canales.cifra
              ? dibujarReloj(relojDe(c.segundos), t("fin.horas"))
              : dibujarRelojEnFilas(c.segundos, t("fin.horas"))
          }
          ${canales.cifra ? `<span class="cuaderno__cifra">${horasDe(c.segundos)}</span>` : ""}
          ${canales.texto ? `<span class="cuaderno__glosa">${t("cuaderno.horas")}</span>` : ""}
        </div>
        <div class="cuaderno__datos">
          ${cuenta("despegues", c.despegues)}
          ${cuenta("aterrizajes", c.aterrizajes)}
          ${cuenta("frustradas", c.frustradas)}
          ${cuenta("aerodromos", c.aerodromos.length)}
        </div>
        ${
          faltaAqui && falta
            ? `<div class="cuaderno__falta">
                ${
                  canales.texto
                    ? `<p>${t("cuaderno.falta", { grado: t(`grado.${falta.grado}` as never) })} ${this.faltaEnPalabras(falta.falta)}</p>`
                    : ""
                }
                ${this.faltaEnDibujo(falta.falta, canales.cifra)}
              </div>`
            : !falta && canales.texto
              ? `<p class="cuaderno__falta">${t("cuaderno.completo")}</p>`
              : ""
        }
        ${this.losSellos(canales.texto)}
        ${this.losVuelos(canales.texto)}
      `,
    });
  }

  /**
   * **La escalera de grados**: los ganados, enteros, y el siguiente con su
   * borde a trazos, que es la meta y no un reproche. Los de más arriba todavía
   * no están, como los galones que no se han ganado.
   */
  private laEscalera(g: Grado, conTexto: boolean): string {
    const hasta = GRADOS.indexOf(g);
    const escalones = GRADOS.slice(0, Math.min(GRADOS.length, hasta + 2)).map(
      (cual, i) => `
        <button type="button" class="cuaderno__escalon${i > hasta ? " cuaderno__escalon--meta" : ""}"
                data-grado="${cual}" aria-label="${t(`grado.${cual}` as never)}">
          ${dibujarManga(barrasDe(cual), CUADERNO_ALTO, t(`grado.${cual}` as never))}
          ${conTexto ? `<span class="cuaderno__escalon-nombre">${t(`grado.${cual}` as never)}</span>` : ""}
        </button>`,
    );
    return `<div class="cuaderno__escalera" role="group" aria-label="${t("cuaderno.grados")}">${escalones.join("")}</div>`;
  }

  /**
   * **El interruptor de volar sin instructora**, con su dibujo: ella con el
   * dedo en los labios. Encendido, se ve entera; apagado, apagada. Sin el
   * grado, el candado en la bola del interruptor y debajo lo que falta, en
   * cosas que se pueden hacer esta tarde.
   */
  private elInterruptor(conTexto: boolean, conCifras: boolean): string {
    const puede = this.puedeSola;
    const sola = puede && this.vaSola;
    const falta = loQueFaltaParaVolarSinInstructora(this.cuaderno);
    const frase = !puede
      ? t("cuaderno.sinInstructoraFalta")
      : sola
        ? t("cuaderno.sinInstructoraPuesta")
        : t("cuaderno.sinInstructoraQuitada");
    return `
      <div class="cuaderno__sola${puede ? "" : " cuaderno__sola--cerrada"}${sola ? " cuaderno__sola--puesta" : ""}">
        <button type="button" class="cuaderno__sola-boton" data-sola role="switch"
                aria-checked="${sola}"${puede ? "" : ' aria-disabled="true"'}
                aria-label="${t("cuaderno.sinInstructora")}">
          <span class="cuaderno__sola-dibujo">${INSTRUCTORA_CALLADA}</span>
          <span class="cuaderno__sola-llave" aria-hidden="true">
            <span class="cuaderno__sola-bola">${puede ? "" : CANDADO}</span>
          </span>
        </button>
        <button type="button" class="cuaderno__sola-que" data-sola-que
                aria-label="${t("cuaderno.queEs")}">
          <svg viewBox="0 0 24 24" aria-hidden="true">${LAMPARITA}</svg>
        </button>
        ${
          conTexto
            ? `<p class="cuaderno__sola-texto">${frase}${
                falta ? ` ${this.faltaEnPalabras(falta)}` : ""
              }</p>`
            : ""
        }
        ${falta ? this.faltaEnDibujo(falta, conCifras) : ""}
      </div>`;
  }

  /** Lo que falta, en palabras: «3 × aterrizajes · 1 × frustradas». */
  private faltaEnPalabras(f: Omit<Requisito, "grado">): string {
    return [
      f.aterrizajes ? `${f.aterrizajes} × ${t("cuaderno.aterrizajes")}` : "",
      f.aerodromos ? `${f.aerodromos} × ${t("cuaderno.aerodromos")}` : "",
      f.frustradas ? `${f.frustradas} × ${t("cuaderno.frustradas")}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  /**
   * Lo que falta, en dibujo: la toma, la manga o la frustrada, y al lado
   * **puntos vacíos**, uno por cada uno que falta — o la cifra, desde el
   * peldaño de los números.
   */
  private faltaEnDibujo(f: Omit<Requisito, "grado">, conCifras: boolean): string {
    const una = (que: keyof typeof DIBUJO_DE, n: number): string =>
      n
        ? `<span class="cuaderno__falta-una">
             <span class="cuaderno__dibujo" aria-hidden="true">${DIBUJOS[DIBUJO_DE[que]!]}</span>
             ${conCifras ? `<span class="cuaderno__falta-cifra">× ${n}</span>` : enPuntos(n, true)}
           </span>`
        : "";
    return `<div class="cuaderno__falta-dibujo" aria-hidden="true">
      ${una("aterrizajes", f.aterrizajes)}${una("aerodromos", f.aerodromos)}${una("frustradas", f.frustradas)}
    </div>`;
  }

  /**
   * **Los sellos**, uno por campo, en el orden en que se ganaron. Sin ninguno
   * no se pinta nada: una sección vacía dice que falta algo. Ver `sellos.ts`.
   */
  private losSellos(conTexto: boolean): string {
    const campos = camposDeLosSellos(this.cuaderno.aerodromos);
    if (!campos.length) return "";
    return `
      ${conTexto ? `<h3 class="cuaderno__grado cuaderno__grado--vuelos">${t("cuaderno.sellos")}</h3>` : ""}
      <ul class="estampas" aria-label="${t("cuaderno.sellos")}">${campos
        .map(
          (e) =>
            `<li class="estampas__una">${selloDe(e, nombreCorto(t(e.nameKey as never)))}</li>`,
        )
        .join("")}</ul>`;
  }

  /**
   * Los últimos vuelos, si hay alguno.
   *
   * Con la bitácora vacía no se pinta un hueco ni un «todavía no has volado»:
   * simplemente no está. Una sección vacía en la página que uno enseña es
   * peor que ninguna — dice que falta algo.
   */
  private losVuelos(conTexto: boolean): string {
    const vuelos = leerBitacora().slice(0, CUANTOS_SE_VEN);
    if (!vuelos.length) return "";
    return `
      ${conTexto ? `<h3 class="cuaderno__grado cuaderno__grado--vuelos">${t("cuaderno.vuelos")}</h3>` : ""}
      <ul class="bitacora" aria-label="${t("cuaderno.vuelos")}">${vuelos.map(tarjetaDeVuelo).join("")}</ul>`;
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    if (this.root.hidden) this.show();
    else this.hide();
  }

  show(): void {
    this.pintar();
    this.panel.abrir();
  }

  hide(): void {
    this.panel.cerrar();
  }
}
