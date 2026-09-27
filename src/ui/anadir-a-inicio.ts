/**
 * **En el iPhone, la pantalla entera se consigue desde la pantalla de inicio.**
 *
 * Safari no deja que una página se ponga a pantalla completa: esa API, en el
 * iPhone, es solo para los vídeos. Lo que sí la da es **añadir el juego a la
 * pantalla de inicio** y abrirlo desde su ícono —el manifiesto y las etiquetas
 * de `index.html` ya lo preparan—, y entonces se abre sin barra ninguna. Pero
 * eso hay que saberlo, y quien juega no lo sabe: se quedaba con la barra de
 * Safari comiéndose un tercio del alto del teléfono tumbado.
 *
 * Así que se enseña, **una vez y sin leer**: en la primera pantalla, una
 * tarjeta con los dos botones que hay que tocar dibujados como los dibuja el
 * iPhone —el de compartir, la caja con la flecha hacia arriba, y el de
 * «Agregar a inicio», el cuadrado con la cruz— y el ícono del juego que va a
 * aparecer. Debajo, una línea para quien lee. Se cierra tocándola, y no
 * vuelve. Para los mayores queda además una línea fija en los ajustes, que es
 * donde se busca después. Ver `pantalla-ajustes.ts`.
 *
 * Solo en Safari de iPhone, y solo si no está ya instalado: en el ícono ya no
 * hay barra que quitar, y en Android la pantalla completa se pide al primer
 * toque. Ver `pantalla-completa.ts`.
 */

import { t } from "../i18n";
import { leerTexto, ponerTexto } from "../datos/guardado";
import { hayPantallaCompleta } from "./pantalla-completa";

/**
 * Si hay que enseñarlo: Safari de iOS, sin instalar y sin pantalla completa.
 *
 * - `navigator.standalone` solo existe en el WebKit de iOS, y vale `false`
 *   mientras el juego se abre en el navegador y `true` desde el ícono. Así que
 *   `false`, y nada más que `false`, es «iPhone, sin instalar».
 * - Los otros navegadores del iPhone llevan el mismo motor pero no el mismo
 *   menú: sus botones están en otro sitio, y enseñar los de Safari sería
 *   enseñar unos que no están. Se reconocen por su marca en el agente.
 * - Y donde **sí** hay pantalla completa —el iPad— no hace falta: se pide al
 *   primer toque, como en Android.
 */
export function hayQueAnadirAInicio(
  standalone: boolean | undefined,
  agente: string,
  pantallaCompleta: boolean,
): boolean {
  if (standalone !== false) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|FBAN|FBAV|Instagram/.test(agente))
    return false;
  return !pantallaCompleta;
}

/** La misma pregunta, con lo que dice este navegador. */
export function seEnsenaAnadirAInicio(): boolean {
  if (typeof navigator === "undefined") return false;
  return hayQueAnadirAInicio(
    (navigator as { standalone?: boolean }).standalone,
    navigator.userAgent,
    hayPantallaCompleta(),
  );
}

/** Lo que se guarda al enseñarla, para no volver a enseñarla. */
const YA_ENSENADO = "inicio-ensenado";

/*
 * Los dibujos, **como los dibuja el iPhone**: quien los busque en su pantalla
 * tiene que reconocerlos, así que no se inventa ninguno. En una caja de 24.
 */
const COMPARTIR = `
  <path d="M8.5 9.5H7A1.5 1.5 0 0 0 5.5 11v8A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17 9.5h-1.5" />
  <path d="M12 3v11M8.8 6.2 12 3l3.2 3.2" />`;
const AGREGAR = `
  <rect x="4" y="4" width="16" height="16" rx="4" />
  <path d="M12 8.2v7.6M8.2 12h7.6" />`;
const LUEGO = `<path d="M5 12h13M14 8l4 4-4 4" />`;

const dibujo = (trazo: string, clase = ""): string =>
  `<svg class="a-inicio__dibujo${clase}" viewBox="0 0 24 24" aria-hidden="true"
        fill="none" stroke="currentColor" stroke-width="1.7"
        stroke-linecap="round" stroke-linejoin="round">${trazo}</svg>`;

/**
 * Pone la tarjeta, si toca, y devuelve con qué quitarla.
 *
 * Se apunta como enseñada **al ponerla**, no al cerrarla: «una vez» es una
 * vez, y si quien juega la aparta eligiendo piloto sin mirarla, tampoco
 * vuelve. Lo que queda es la línea de los ajustes. Se guarda por piloto, como
 * el resto de lo que se enseña una sola vez —ver las teclas en `game.ts`—, y
 * en cuanto el juego se abre desde el ícono deja de hacer falta para todos.
 */
export function ensenarAnadirAInicio(): () => void {
  if (!seEnsenaAnadirAInicio() || leerTexto(YA_ENSENADO) === "1") return () => {};
  ponerTexto(YA_ENSENADO, "1");
  const tarjeta = document.createElement("div");
  tarjeta.className = "a-inicio";
  tarjeta.setAttribute("role", "note");
  const base = import.meta.env.BASE_URL ?? "/";
  tarjeta.innerHTML = `
    <div class="a-inicio__pasos">
      ${dibujo(COMPARTIR)}
      ${dibujo(LUEGO, " a-inicio__luego")}
      ${dibujo(AGREGAR)}
      ${dibujo(LUEGO, " a-inicio__luego")}
      <img class="a-inicio__icono" src="${base}${base.endsWith("/") ? "" : "/"}icono-192.png"
           alt="" width="44" height="44" />
    </div>
    <p class="a-inicio__texto">${t("inicio.pasos")}</p>
    <button type="button" class="a-inicio__cerrar"
            aria-label="${t("inicio.cerrar")}">×</button>`;
  const quitar = (): void => tarjeta.remove();
  // Toda la tarjeta cierra, no solo la cruz: con cuatro años se toca el
  // dibujo, no la esquina.
  tarjeta.addEventListener("click", quitar);
  document.body.append(tarjeta);
  return quitar;
}

/**
 * Y la línea de los ajustes, para quien lee: con el botón de compartir
 * dibujado delante, que es lo que hay que encontrar. Vacía donde no hace
 * falta.
 */
export function lineaDeAnadirAInicio(): string {
  if (!seEnsenaAnadirAInicio()) return "";
  return `<p class="ajustes__inicio">${dibujo(COMPARTIR)}<span>${t("ajustes.inicio")}</span></p>`;
}
