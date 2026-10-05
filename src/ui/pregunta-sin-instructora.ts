/**
 * **La pregunta del principio**: hoy se vuela sin instructora, ¿así?
 *
 * Enrique: «que pregunte si está desactivado al principio». Es una tarjeta
 * que se entiende sin leer —la instructora con el dedo en los labios, y el
 * escudo que dice que de lo peligroso avisa igual— y dos botones que tampoco
 * hay que leer: el visto verde y la cruz. La palabra va debajo, para quien ya
 * lee; la voz, cuando esté grabada. Ver `PENDIENTE-VOCES-autonomo.md`.
 *
 * Congela el vuelo mientras está, como cualquier pantalla que se lee: la
 * pregunta se hace en el puesto, con el motor parado, y no puede quedarse
 * nadie rodando mientras decide.
 */

import { t } from "../i18n";
import { Panel } from "./panel";
import { INSTRUCTORA_CALLADA } from "./instructora-callada";

/** El visto, y la cruz: el sí y el no de las tarjetas de este juego. */
const VISTO = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5 L10 18 L19.5 6.5" /></svg>`;
const CRUZ = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>`;

export interface Respuesta {
  /**
   * Si debajo del dibujo va la frase escrita. En el peldaño que no lee, no:
   * ahí el dibujo y los dos botones son la pregunta entera. Ver
   * `flight/escalera.ts`.
   */
  readonly conTexto: boolean;
  /** Que ella diga la pregunta, y lo que conteste, si está grabado. */
  decir(clave: string): void;
  /** Y que se calle si se contesta mientras pregunta. */
  callar(): void;
  /** `true` si se vuela sin instructora; `false` si vuelve. */
  alContestar(sin: boolean): void;
}

/** La caja de la pregunta. Una sola por página, que la pregunta es una. */
let caja: HTMLElement | null = null;
let panel: Panel | null = null;
/** Cómo se cierra la de ahora, para Escape. */
let cerrarLaDeAhora: ((sin: boolean | null) => void) | null = null;

/**
 * El HTML de la tarjeta. Aparte, para poder probarlo sin navegador.
 *
 * La frase va siempre en el documento —es el nombre del diálogo para quien no
 * ve la pantalla— y se esconde a la vista donde no se lee.
 */
export function tarjetaDeLaPregunta(conTexto: boolean): string {
  return `
    <div class="pregunta-sola__tarjeta">
      <div class="pregunta-sola__dibujo">${INSTRUCTORA_CALLADA}</div>
      <p class="pregunta-sola__texto${conTexto ? "" : " pregunta-sola__texto--oculto"}"
         id="pregunta-sola-titulo">${t("vuelo.sinInstructora.pregunta")}</p>
      <div class="pregunta-sola__botones">
        <button type="button" class="pregunta-sola__boton pregunta-sola__boton--no" data-respuesta="no"
                aria-label="${t("sinInstructora.no")}">${CRUZ}</button>
        <button type="button" class="pregunta-sola__boton pregunta-sola__boton--si" data-respuesta="si"
                aria-label="${t("sinInstructora.si")}">${VISTO}</button>
      </div>
    </div>`;
}

/**
 * **Pregunta**, y se cierra al contestar. Sin respuesta —Escape, tocar fuera—
 * se queda como estaba, que es sin instructora: no contestar no es cambiar
 * nada.
 */
export function preguntarSiVuelaSinInstructora(r: Respuesta): void {
  if (typeof document === "undefined") return;
  if (!caja) {
    caja = document.createElement("div");
    caja.className = "pregunta-sola";
    caja.hidden = true;
    /*
     * El papel de diálogo lo pone `Panel` al abrir, en la caja: aquí no se
     * escribe, que es de la concha. Lo que sí se dice es cómo se llama: la
     * frase de la pregunta, que va dentro aunque no se vea.
     */
    caja.setAttribute("aria-labelledby", "pregunta-sola-titulo");
    document.body.appendChild(caja);
    panel = new Panel(caja, () => cerrarLaDeAhora?.(null));
  }
  const aqui = caja;
  let contestada = false;
  const cerrar = (sin: boolean | null): void => {
    if (contestada) return;
    contestada = true;
    cerrarLaDeAhora = null;
    panel?.cerrar();
    r.callar();
    if (sin === null) return;
    r.alContestar(sin);
    r.decir(sin ? "vuelo.sinInstructora.si" : "vuelo.sinInstructora.no");
  };
  cerrarLaDeAhora = cerrar;
  aqui.innerHTML = tarjetaDeLaPregunta(r.conTexto);
  aqui.onclick = (e) => {
    const b = (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-respuesta]");
    if (b) cerrar(b.dataset.respuesta === "si");
    else if (e.target === aqui) cerrar(null);
  };
  panel?.abrir();
  // El visto, enfocado: es lo que se quiere casi siempre, y con el teclado se
  // contesta con Intro.
  aqui.querySelector<HTMLElement>(".pregunta-sola__boton--si")?.focus();
  r.decir("vuelo.sinInstructora.pregunta");
}
