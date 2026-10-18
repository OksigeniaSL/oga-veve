/**
 * **Mientras Ara duerme**: la pantalla se funde a la noche del sueño, con Ara
 * durmiendo y después soñando, y el vuelo pasa deprisa.
 *
 * Es el punto 304 de la lista de Enrique, que voló la escena de pasaje entera:
 * «que haga como que se duerme o algo así. Un fundido, una imagen sobando o
 * soñando, que sea rapidillo, y luego despierta y ha pasado un rato». Cuándo
 * se duerme Ara y cuándo se despierta lo decide la escena —ver
 * `puedeDormirse` en `flight/inicio-pasaje.ts`—; esto es lo que se ve.
 *
 * ## En orden
 *
 * Ara bosteza, la pantalla se funde, sale **Ara durmiendo** en la ventanilla
 * —con la manta y el cinturón por encima— y, mientras pasa el tiempo, **Ara
 * soñando** con un avión sobre las islas; y al despertar, la pantalla vuelve.
 * Las dos ilustraciones son de la colección de cuento del juego: ver
 * `ilustraciones.ts` y `CREDITOS.md`.
 *
 * ## Que se note que pasa el tiempo, y que pasa de verdad
 *
 * Mientras tanto, en la ventanita del juego, **el mapa de la ruta** con las
 * islas de verdad y el avión avanzando —ver `mapa-de-la-ruta.ts`—: la escena
 * la pide mientras Ara duerme. Es un dibujo del juego, en su marco, y no una
 * pantalla de la cabina, que el JAZ 90 no lleva. El vuelo sigue de verdad,
 * más deprisa: el avión no salta, vuela su ruta. Ver `frame` en `game.ts`.
 *
 * ## Rápido
 *
 * Fundirse, unos segundos de sueño y volver: no un minuto de negro. Ver
 * `FUNDIDO_DE_LA_SIESTA`.
 *
 * Va debajo del HUD, como el velo de los cambios de plano: la ventanita con
 * el mapa, la pausa y el volumen se siguen viendo encima, y la tarjeta de
 * quien habla también.
 */

import { hayTexto, t } from "../i18n";
import { ilustracion } from "./ilustraciones";

/** Lo que tarda el fundido, s de pared: en tapar y en destapar. */
export const FUNDIDO_DE_LA_SIESTA = { entra: 0.9, sale: 0.8 } as const;

/**
 * **Las ilustraciones del sueño, en su orden**: primero durmiendo y, pasado
 * `HASTA_EL_SUENO` con todo tapado, soñando, que es el rato largo.
 */
export const ILUSTRACIONES_DE_LA_SIESTA = ["ara-durmiendo", "ara-sonando"] as const;
const HASTA_EL_SUENO = 1.8;

/** Lo que mira el banco. */
export interface SiestaParaBanco {
  readonly opacidad: number;
  readonly tapa: boolean;
  /** La ilustración que se ve ahora, y las que se vieron, en orden. */
  readonly ilustracion: string | null;
  readonly vistas: readonly string[];
}

export class PantallaDeLaSiesta {
  private opacidad = 0;
  private puesta = false;
  /** Lo que lleva tapando del todo, s de pared. */
  private tapada = 0;
  private dibujos: HTMLImageElement[] = [];
  private ahora: number | null = null;
  private readonly vistas: string[] = [];

  constructor(private readonly raiz: HTMLElement | null) {}

  /**
   * **Un fotograma**: el fundido hacia donde toca, y la ilustración que toca.
   * Devuelve si la pantalla tapa del todo, que es cuando el juego deja pasar
   * el vuelo deprisa y no pinta el mundo, que no se ve.
   */
  paso(real: number, duerme: boolean): boolean {
    const raiz = this.raiz;
    if (!raiz) return false;
    if (!duerme && this.opacidad <= 0) {
      if (this.puesta) this.quitar();
      return false;
    }
    if (!this.puesta) this.poner(raiz);
    this.opacidad = Math.min(
      1,
      Math.max(0, this.opacidad + (duerme ? real / FUNDIDO_DE_LA_SIESTA.entra : -real / FUNDIDO_DE_LA_SIESTA.sale)),
    );
    raiz.style.opacity = this.opacidad.toFixed(3);
    const tapa = this.opacidad >= 1;
    this.tapada = tapa ? this.tapada + real : this.tapada;
    this.mirar(this.tapada >= HASTA_EL_SUENO ? 1 : 0);
    return tapa;
  }

  /** Se acabó: fuera, sin fundido. */
  quitar(): void {
    this.opacidad = 0;
    this.tapada = 0;
    this.puesta = false;
    this.ahora = null;
    this.dibujos = [];
    if (!this.raiz) return;
    this.raiz.hidden = true;
    this.raiz.style.opacity = "0";
    this.raiz.replaceChildren();
  }

  get paraBanco(): SiestaParaBanco {
    const i = this.ahora;
    return {
      opacidad: this.opacidad,
      tapa: this.opacidad >= 1,
      ilustracion: i === null ? null : (this.dibujos[i]?.dataset.clave ?? null),
      vistas: [...this.vistas],
    };
  }

  private poner(raiz: HTMLElement): void {
    const alt = "inicio.siesta";
    raiz.setAttribute("role", "img");
    raiz.setAttribute("aria-label", hayTexto(alt) ? t(alt) : "");
    // Las que tengan fichero; sin ellas, la noche y las zetas, y el mapa en la ventanita.
    const hay = ILUSTRACIONES_DE_LA_SIESTA.map((c) => ilustracion(c)).filter((x) => x !== null);
    raiz.innerHTML = `<div class="siesta__sueno">
${hay.map((d) => `<img class="siesta__dibujo" data-clave="${d.clave}" src="${d.url}" alt="" decoding="async" />`).join("\n")}
<div class="siesta__zzz" aria-hidden="true"><span>z</span><span>z</span><span>z</span></div>
</div>`;
    this.dibujos = [...raiz.querySelectorAll<HTMLImageElement>(".siesta__dibujo")];
    raiz.hidden = false;
    this.puesta = true;
  }

  /** La ilustración que se ve: una sola, con su fundido de la hoja de estilos. */
  private mirar(cual: number): void {
    const i = Math.min(cual, this.dibujos.length - 1);
    if (i < 0 || i === this.ahora) return;
    this.ahora = i;
    this.dibujos.forEach((d, k) => d.classList.toggle("siesta__dibujo--vista", k === i));
    const clave = this.dibujos[i]!.dataset.clave;
    if (clave && this.vistas[this.vistas.length - 1] !== clave) this.vistas.push(clave);
  }
}
