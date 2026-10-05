/**
 * **La tarjeta del avión**: el avión en 3D que se gira, sus piezas que se
 * tocan y se explican, su ficha técnica, su tamaño al lado de cosas que se
 * conocen y su matrícula contada.
 *
 * Nació de la placa del cuadro de las avionetas, que llevaba el retrato del
 * avión y nada más. Enrique: «no quedó mal, pero podría llevar datos técnicos
 * y detalles que lo hagan interesante». Y después: el hangar, con lo mismo,
 * y **un solo componente para el hangar y el cuadro, no dos**. Este es ese
 * componente. El hangar lo abre desde la ficha del avión elegido y el vuelo
 * desde la placa del cuadro; los dos le pasan el avión y nada más, y en el
 * vuelo además lo que hace el de verdad, para la tarjeta en vivo.
 *
 * ## Se usa sin saber leer
 *
 * Todo lo que hace la tarjeta se hace con el dedo y se entiende mirando: el
 * avión gira, los puntos tienen el dibujo de su pieza, el globo trae el
 * dibujo en grande y la instructora lo cuenta. El texto acompaña. La ficha sí
 * es lectura, pero sus números van con su unidad y su rótulo de cabina, que
 * es justo lo que se aprende a reconocer.
 *
 * ## Y es un instrumento, no una pantalla
 *
 * En el vuelo no congela nada: se mira volando, como el plano, y el avión
 * sigue recto mientras nadie toque los mandos —ver `PanelDelVuelo.congela`—.
 * Si se tocan, el tren y los flaps de la tarjeta se mueven con ellos.
 */

import type { AircraftConfig } from "../flight/aircraft";
import { fichaTecnicaDe, type FichaTecnica } from "../flight/ficha-tecnica";
import { modeloPorId, nombreEntero } from "../flight/flota";
import { matriculaDe, prefijoDe } from "../flight/matricula";
import { getLocale, t, type TranslationKey } from "../i18n";
import {
  cargarModeloDeLaTarjeta,
  type ModeloDeLaTarjeta,
} from "../world/modelo-de-la-tarjeta";
import { equipoDe } from "../world/luces-del-trafico";
import type { PiezaDelAvion } from "../world/puntos-del-avion";
import { armarPanel } from "./concha";
import {
  dibujoDe,
  explicacion,
  explicacionDe,
  LUCES_DE_LA_TARJETA,
  type ExplicacionDelAvion,
  type LuzDeLaTarjeta,
} from "./explicaciones-del-avion";
import { Panel } from "./panel";
import { retratoDe } from "./retratos";
import {
  COMPARACION,
  VisorDelAvion,
  type EnVivo,
  type PuntoEnPantalla,
} from "./visor-del-avion";

const KT = 1 / 0.514444;
const FT = 1 / 0.3048;

/** Un número con el formato del idioma: «1.111» en castellano, «1,111» en inglés. */
function cifra(n: number, decimales = 0): string {
  const idioma = getLocale() === "en" ? "en" : "es-PY";
  return n.toLocaleString(idioma, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Redondea a la cifra que se dice: los pies a centenas, los kilos grandes a centenas. */
const aLas = (n: number, paso: number): number => Math.round(n / paso) * paso;

/** Una fila de la ficha, ya escrita. */
export interface DatoDeLaFicha {
  /** El rótulo de cabina, en inglés aeronáutico. No se traduce. */
  readonly rotulo: string;
  readonly valor: string;
  readonly unidad: string;
  /** La misma cifra en la unidad de casa, en pequeño. */
  readonly tambien?: string;
  /** Lo que quiere decir, traducido. */
  readonly glosa: TranslationKey;
}

/**
 * **Las filas de la ficha**, en el orden en que se lee una ficha de tipo: lo
 * que mide, lo que pesa, lo que hace y quién va dentro. Lo que es `null` no
 * sale: ver `flight/ficha-tecnica.ts`.
 *
 * Los rótulos van en inglés aeronáutico y no se traducen, que es la regla
 * tercera de AGENTS.md: así están en toda ficha de avión del mundo. Lo que se
 * traduce es la glosa de debajo. Y las unidades, las de la aviación —nudos,
 * pies, millas náuticas—, con la de casa al lado en pequeño.
 */
export function datosDeLaFicha(f: FichaTecnica): DatoDeLaFicha[] {
  const filas: DatoDeLaFicha[] = [
    {
      rotulo: "WINGSPAN",
      valor: cifra(f.envergadura, 1),
      unidad: "m",
      glosa: "tarjeta.ficha.envergadura",
    },
  ];
  if (f.largo !== null)
    filas.push({
      rotulo: "LENGTH",
      valor: cifra(f.largo, 1),
      unidad: "m",
      glosa: "tarjeta.ficha.largo",
    });
  if (f.mtow !== null)
    filas.push({
      rotulo: "MTOW",
      valor: cifra(f.mtow >= 10000 ? aLas(f.mtow, 100) : f.mtow),
      unidad: "kg",
      glosa: "tarjeta.ficha.mtow",
    });
  filas.push({
    rotulo: "CRUISE",
    valor: cifra(f.crucero * KT),
    unidad: "kt",
    tambien: `${cifra(aLas(f.crucero * 3.6, 10))} km/h`,
    glosa: "tarjeta.ficha.crucero",
  });
  if (f.alcance !== null)
    filas.push({
      rotulo: "RANGE",
      valor: cifra(f.alcance / 1852),
      unidad: "NM",
      tambien: `${cifra(aLas(f.alcance / 1000, 10))} km`,
      glosa: "tarjeta.ficha.alcance",
    });
  if (f.techo !== null)
    filas.push({
      rotulo: "CEILING",
      valor: cifra(aLas(f.techo * FT, 100)),
      unidad: "ft",
      tambien: `${cifra(aLas(f.techo, 10))} m`,
      glosa: "tarjeta.ficha.techo",
    });
  filas.push({
    rotulo: "ENGINES",
    valor: cifra(f.motores.cuantos),
    unidad: t(`tarjeta.motor.${f.motores.clase}` as TranslationKey),
    glosa: "tarjeta.ficha.motores",
  });
  if (f.plazas !== null)
    filas.push({
      rotulo: "SEATS",
      valor: cifra(f.plazas),
      unidad: "",
      glosa: "tarjeta.ficha.plazas",
    });
  filas.push({
    rotulo: "VREF",
    valor: cifra(f.vref * KT),
    unidad: "kt",
    tambien: `${cifra(aLas(f.vref * 3.6, 1))} km/h`,
    glosa: "tarjeta.ficha.vref",
  });
  return filas;
}

/**
 * **Cuántos colectivos de largo**, la cuenta que acompaña al dibujo.
 *
 * Con el largo del avión que se ve, no el de la ficha: la frase va debajo del
 * colectivo dibujado al lado del avión, y tiene que decir lo mismo que el
 * dibujo. Medio colectivo es lo más fino que se dice; por debajo de uno,
 * «más corto que un colectivo».
 */
export function colectivosDeLargo(largo: number): number {
  return Math.round((largo / COMPARACION.colectivo.largo) * 2) / 2;
}

/** Lo que mide un punto de lado, px. Ver `.tav__punto` en la hoja. */
const LADO_DEL_PUNTO = 40;

/**
 * **Los puntos, sin pisarse.** En un avión pequeño visto de lejos, el flap, el
 * alerón y la luz de la punta caen a veinte píxeles unos de otros, y un
 * círculo de cuarenta encima de otro es un botón que no se puede tocar: el
 * dedo se lleva el de arriba. Se apartan lo justo, empujándose de dos en dos,
 * y cada uno sigue al lado de su pieza.
 */
export function separarPuntos(puntos: readonly PuntoEnPantalla[]): PuntoEnPantalla[] {
  const p = puntos.map((x) => ({ ...x }));
  const minimo = LADO_DEL_PUNTO + 4;
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    let movido = false;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++) {
        const a = p[i]!;
        const b = p[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d >= minimo) continue;
        // Dos en el mismo sitio: se separan en horizontal.
        if (d < 0.01) [dx, dy, d] = [1, 0, 1];
        const falta = (minimo - d) / 2;
        a.x -= (dx / d) * falta;
        a.y -= (dy / d) * falta;
        b.x += (dx / d) * falta;
        b.y += (dy / d) * falta;
        movido = true;
      }
    if (!movido) break;
  }
  return p;
}

/** La bandera de un prefijo de matrícula: tres franjas, como se ven de lejos. */
function bandera(prefijo: string): string {
  // Paraguay: roja, blanca y azul; España: roja, amarilla al doble y roja.
  const franjas =
    prefijo === "EC"
      ? `<rect width="30" height="5" fill="#c60b1e" /><rect y="5" width="30" height="10" fill="#ffc400" />
         <rect y="15" width="30" height="5" fill="#c60b1e" />`
      : `<rect width="30" height="6.67" fill="#d52b1e" /><rect y="6.67" width="30" height="6.67" fill="#ffffff" />
         <rect y="13.33" width="30" height="6.67" fill="#0038a8" />`;
  return `<svg class="tav__bandera" viewBox="0 0 30 20" aria-hidden="true">${franjas}</svg>`;
}

/** El dibujo de comparar tamaños: una persona al lado de un colectivo. */
const TAMANO = `<svg viewBox="0 0 48 48" aria-hidden="true">
  <circle cx="8" cy="12" r="4" fill="currentColor" />
  <path d="M8 18 V34 M8 22 l-4 6 M8 22 l4 6 M8 34 l-3 8 M8 34 l3 8" fill="none"
        stroke="currentColor" stroke-width="3" stroke-linecap="round" />
  <rect x="18" y="16" width="28" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="3" />
  <path d="M22 22 h20" stroke="currentColor" stroke-width="3" />
  <circle cx="25" cy="38" r="3" fill="currentColor" /><circle cx="39" cy="38" r="3" fill="currentColor" />
</svg>`;

/** La mano que gira: el aviso de que esto se mueve con el dedo. */
const GIRA = `<svg viewBox="0 0 48 24" aria-hidden="true">
  <path d="M6 12 h36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
  <path d="M10 6 L4 12 L10 18 M38 6 L44 12 L38 18" fill="none" stroke="currentColor"
        stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

/** Lo que el vuelo le da a la tarjeta. Ver `TarjetaDelAvion`. */
export interface OpcionesDeLaTarjeta {
  /** Si se abre dentro del vuelo: no gira sola y se conecta en vivo. */
  readonly enVuelo: boolean;
  /**
   * Quien dice las explicaciones: la instructora del juego. Sin ella, la
   * tarjeta se calla y el globo se lee. Lo que no está grabado no suena.
   */
  readonly decir?: (texto: string, clave: string) => void;
}

export class TarjetaDelAvion {
  private readonly root: HTMLElement;
  private readonly panel: Panel;
  private readonly opciones: OpcionesDeLaTarjeta;
  private visor: VisorDelAvion | null = null;
  private avion: AircraftConfig | null = null;
  private modelo: ModeloDeLaTarjeta | null = null;
  /** El modelo de cada avión, leído una vez por sesión. */
  private readonly modelos = new Map<string, Promise<ModeloDeLaTarjeta | null>>();
  private globo: PiezaDelAvion | LuzDeLaTarjeta | "matricula" | null = null;
  private ultimos: readonly PuntoEnPantalla[] = [];
  private arrastre: { dedo: number; x: number; y: number; movido: boolean } | null = null;
  private observador: ResizeObserver | null = null;

  constructor(root: HTMLElement, opciones: OpcionesDeLaTarjeta) {
    this.root = root;
    this.opciones = opciones;
    // Un instrumento: no congela el vuelo. Ver la cabecera.
    this.panel = new Panel(root, () => this.cerrar(), true, false);
    // En el vuelo, a un lado; en el hangar, en medio. Ver `.tarjeta-avion--vuelo`.
    root.classList.toggle("tarjeta-avion--vuelo", opciones.enVuelo);
    root.addEventListener("click", (e) => this.alTocar(e));
    root.addEventListener("pointerdown", (e) => this.alApretar(e));
    window.addEventListener("pointermove", (e) => this.alMover(e));
    window.addEventListener("pointerup", (e) => this.alSoltar(e));
    window.addEventListener("pointercancel", (e) => this.alSoltar(e));
    document.addEventListener("visibilitychange", () =>
      this.visor?.ver(this.abierta && document.visibilityState !== "hidden"),
    );
  }

  get abierta(): boolean {
    return !this.root.hidden;
  }

  /** El avión que enseña ahora, si está abierta. */
  get deQuien(): string | null {
    return this.abierta ? (this.avion?.id ?? null) : null;
  }

  /** Abre la tarjeta de este avión. */
  abrir(a: AircraftConfig): void {
    const otro = this.avion?.id !== a.id;
    this.avion = a;
    if (otro || !this.root.firstElementChild) this.montar(a);
    this.panel.abrir();
    this.visor?.medir();
    this.visor?.ver(document.visibilityState !== "hidden");
    void this.ponerModelo(a);
  }

  cerrar(): void {
    this.cerrarGlobo();
    this.visor?.ver(false);
    this.panel.cerrar();
  }

  alternar(a: AircraftConfig): void {
    if (this.abierta) this.cerrar();
    else this.abrir(a);
  }

  /**
   * **Suelta la tarjeta gráfica**: el hangar lo hace al irse, que el vuelo
   * monta la suya y dos contextos vivos para una sola tarjeta sobran.
   */
  soltar(): void {
    this.cerrar();
    this.observador?.disconnect();
    this.observador = null;
    this.visor?.soltar();
    this.visor = null;
    this.modelo = null;
    this.modelos.clear();
    this.root.innerHTML = "";
    this.avion = null;
  }

  /**
   * **La tarjeta en vivo**: lo que hace el avión que se vuela. Se llama en
   * cada fotograma del vuelo y no cuesta nada con la tarjeta cerrada.
   */
  enVivo(e: EnVivo, dt: number): void {
    if (!this.abierta || !this.visor) return;
    this.visor.enVivo(e, dt);
  }

  /** Cuántas veces ha pintado el visor. Para el banco de rendimiento. */
  get pintadas(): number {
    return this.visor?.pintadas ?? 0;
  }

  private async ponerModelo(a: AircraftConfig): Promise<void> {
    let pedido = this.modelos.get(a.id);
    if (!pedido) {
      pedido = cargarModeloDeLaTarjeta(a);
      this.modelos.set(a.id, pedido);
    }
    const m = await pedido;
    if (this.avion?.id !== a.id) return;
    if (m === this.modelo && m) return;
    this.modelo = m;
    this.visor?.ponerModelo(m);
    // Hasta que llega el modelo se ve el retrato; si no llega, se queda.
    this.root.querySelector(".tav")?.classList.toggle("tav--3d", !!m);
    this.pintarPuntos();
  }

  /** El armazón de la tarjeta de este avión. */
  private montar(a: AircraftConfig): void {
    this.visor?.soltar();
    this.visor = null;
    this.modelo = null;
    this.globo = null;
    const modelo = modeloPorId(a.id);
    const nombre = modelo ? nombreEntero(modelo) : a.name;
    const ficha = datosDeLaFicha(fichaTecnicaDe(a));
    const matricula = matriculaDe(a.id);
    const prefijo = matricula.matricula.split("-")[0] ?? prefijoDe(null);
    const otro = prefijo === "EC" ? "ZP" : "EC";
    const conEstrobos = equipoDe(modelo?.silueta ?? "reactor").estroboscopicas !== "ninguna";
    const luces = LUCES_DE_LA_TARJETA.filter(
      (l) => l.luz !== "estroboscopicas" || conEstrobos,
    );
    const cuerpo = `
      <div class="tav">
        <div class="tav__visor" data-tarjeta="visor">
          <img class="tav__retrato" src="${retratoDe(a.id)}" alt="" decoding="async" />
          <canvas class="tav__lienzo" data-tarjeta="lienzo"></canvas>
          <div class="tav__puntos" data-tarjeta="puntos"></div>
          <div class="tav__globo" data-tarjeta="globo" role="status" hidden></div>
          <span class="tav__gira" aria-hidden="true">${GIRA}</span>
          <div class="tav__mandos">
            ${luces
              .map((l) => {
                const e = explicacion(l.explicacion);
                return `<button type="button" class="tav__luz" data-luz="${l.luz}"
                        aria-pressed="${l.luz === "navegacion"}"
                        aria-label="${t(`tarjeta.luz.${l.luz}` as TranslationKey)}">${dibujoDe(e)}</button>`;
              })
              .join("")}
            <button type="button" class="tav__tamano" data-tarjeta="tamano" aria-pressed="false"
                    aria-label="${t("tarjeta.tamano")}">${TAMANO}</button>
          </div>
          <p class="tav__cuenta" data-tarjeta="cuenta" hidden></p>
        </div>
        <div class="tav__datos">
          <p class="tav__clase">${t(a.descriptionKey as TranslationKey)}</p>
          <dl class="tav__ficha">
            ${ficha
              .map(
                (d) => `
              <div class="tav__dato">
                <dt class="tav__rotulo">${d.rotulo}</dt>
                <dd class="tav__valor">${d.valor}<span class="tav__unidad">${d.unidad}</span>${
                  d.tambien ? `<span class="tav__tambien">${d.tambien}</span>` : ""
                }</dd>
                <dd class="tav__glosa">${t(d.glosa)}</dd>
              </div>`,
              )
              .join("")}
          </dl>
          <button type="button" class="tav__matricula" data-tarjeta="matricula"
                  aria-label="${t("tarjeta.matricula.nombre", { matricula: matricula.matricula })}">
            <span class="tav__placa">${matricula.matricula}</span>
            <span class="tav__paises">
              <span class="tav__pais">${bandera(prefijo)}<b>${prefijo}</b> ${t(
                `tarjeta.pais.${prefijo}` as TranslationKey,
              )}</span>
              <span class="tav__pais tav__pais--otro">${bandera(otro)}<b>${otro}</b> ${t(
                `tarjeta.pais.${otro}` as TranslationKey,
              )}</span>
            </span>
            <span class="tav__dicho">${matricula.dicho}</span>
          </button>
        </div>
      </div>`;
    this.root.innerHTML = armarPanel({
      titulo: nombre,
      cuerpo,
      clase: "concha--tarjeta",
      instrumento: this.opciones.enVuelo,
      acciones: [{ dice: t("inicio.cerrar"), como: "cerrar", principal: true }],
    });
    this.root
      .querySelector('[data-accion="cerrar"]')
      ?.addEventListener("click", () => this.cerrar());
    this.root
      .querySelector<HTMLImageElement>(".tav__retrato")
      ?.addEventListener("error", (e) => (e.target as HTMLElement).remove(), { once: true });
    const lienzo = this.root.querySelector<HTMLCanvasElement>('[data-tarjeta="lienzo"]');
    if (lienzo) {
      this.visor = new VisorDelAvion({
        lienzo,
        giraSolo: !this.opciones.enVuelo,
        alPintar: (p) => {
          this.ultimos = p;
          this.pintarPuntos();
        },
      });
      this.observador?.disconnect();
      if (typeof ResizeObserver === "function") {
        this.observador = new ResizeObserver(() => this.visor?.medir());
        this.observador.observe(lienzo);
      }
    }
  }

  /** Los botones de los puntos, donde ha caído cada pieza en el último dibujo. */
  private pintarPuntos(): void {
    const caja = this.root.querySelector<HTMLElement>('[data-tarjeta="puntos"]');
    const a = this.avion;
    if (!caja || !a) return;
    if (!this.modelo) {
      caja.innerHTML = "";
      return;
    }
    if (caja.childElementCount !== this.modelo.puntos.length) {
      caja.innerHTML = this.modelo.puntos
        .map((p) => {
          const e = explicacionDe(p.pieza, a);
          return `<button type="button" class="tav__punto" data-pieza="${p.pieza}"
                  aria-label="${t(`tarjeta.pieza.${p.pieza}` as TranslationKey)}">${dibujoDe(e)}</button>`;
        })
        .join("");
    }
    for (const p of separarPuntos(this.ultimos)) {
      const b = caja.querySelector<HTMLElement>(`[data-pieza="${p.pieza}"]`);
      if (!b) continue;
      b.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      b.classList.toggle("tav__punto--detras", p.detras);
      b.setAttribute("aria-pressed", String(this.globo === p.pieza));
    }
    if (this.globo) this.colocarGlobo();
  }

  /** Abre el globo de una pieza, una luz o la matrícula, y lo dice. */
  private abrirGlobo(que: PiezaDelAvion | LuzDeLaTarjeta | "matricula", e: ExplicacionDelAvion): void {
    const globo = this.root.querySelector<HTMLElement>('[data-tarjeta="globo"]');
    if (!globo) return;
    this.globo = que;
    if (this.visor) this.visor.quieto = true;
    globo.innerHTML = `
      ${dibujoDe(e, "tav__globo-dibujo")}
      <p class="tav__globo-texto">${t(e.texto)}</p>`;
    globo.dataset.explicacion = e.id;
    globo.hidden = false;
    this.colocarGlobo();
    this.pintarPuntos();
    this.opciones.decir?.(t(e.voz), e.voz);
  }

  private cerrarGlobo(): void {
    const globo = this.root.querySelector<HTMLElement>('[data-tarjeta="globo"]');
    if (globo) globo.hidden = true;
    this.globo = null;
    if (this.visor) {
      this.visor.quieto = false;
      this.visor.marcar();
    }
  }

  /**
   * El globo, junto a su punto y dentro del visor: a la derecha del punto si
   * cabe y si no a la izquierda, y nunca fuera del borde.
   */
  private colocarGlobo(): void {
    const globo = this.root.querySelector<HTMLElement>('[data-tarjeta="globo"]');
    const visor = this.root.querySelector<HTMLElement>('[data-tarjeta="visor"]');
    if (!globo || !visor || globo.hidden) return;
    const p = this.ultimos.find((x) => x.pieza === this.globo);
    const ancho = visor.clientWidth;
    const alto = visor.clientHeight;
    const g = { w: globo.offsetWidth, h: globo.offsetHeight };
    // Sin punto —una luz sin su pieza a la vista, la matrícula—, arriba en medio.
    const x0 = p ? (p.x + 28 + g.w < ancho ? p.x + 28 : p.x - 28 - g.w) : (ancho - g.w) / 2;
    const y0 = p ? p.y - g.h / 2 : 12;
    const x = Math.max(8, Math.min(ancho - g.w - 8, x0));
    const y = Math.max(8, Math.min(alto - g.h - 8, y0));
    globo.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
  }

  private alTocar(e: MouseEvent): void {
    const donde = e.target as Element | null;
    const a = this.avion;
    if (!donde || !a) return;
    const punto = donde.closest<HTMLElement>("[data-pieza]");
    if (punto) {
      const pieza = punto.dataset.pieza as PiezaDelAvion;
      if (this.globo === pieza) this.cerrarGlobo();
      else this.abrirGlobo(pieza, explicacionDe(pieza, a));
      return;
    }
    const luz = donde.closest<HTMLElement>("[data-luz]");
    if (luz && this.visor) {
      const cual = luz.dataset.luz as LuzDeLaTarjeta;
      const ahora = luz.getAttribute("aria-pressed") !== "true";
      luz.setAttribute("aria-pressed", String(ahora));
      this.visor.ponerLuces({ [cual]: ahora });
      const suya = LUCES_DE_LA_TARJETA.find((l) => l.luz === cual);
      // Al encenderla se cuenta por qué; al apagarla, no hace falta.
      if (ahora && suya) this.abrirGlobo(cual === "navegacion" ? "luces" : cual, explicacion(suya.explicacion));
      else this.cerrarGlobo();
      return;
    }
    if (donde.closest('[data-tarjeta="tamano"]') && this.visor) {
      // El globo taparía justo lo que se quiere comparar.
      this.cerrarGlobo();
      const si = !this.visor.comparando;
      this.visor.compararTamano(si);
      // De lado y un poco desde arriba: así se comparan largos y altos.
      if (si) this.visor.mirarDesde(-1.62, 0.12);
      donde.closest('[data-tarjeta="tamano"]')?.setAttribute("aria-pressed", String(si));
      // Comparando, los puntos se apartan: lo que se mira es el tamaño.
      this.root.querySelector(".tav")?.classList.toggle("tav--comparando", si);
      const cuenta = this.root.querySelector<HTMLElement>('[data-tarjeta="cuenta"]');
      if (cuenta) {
        const n = colectivosDeLargo(this.modelo?.medidas.largo ?? 0);
        cuenta.textContent =
          n < 1
            ? t("tarjeta.tamano.menos")
            : t(n === 1 ? "tarjeta.tamano.uno" : "tarjeta.tamano.colectivos", {
                n: cifra(n, n % 1 ? 1 : 0),
              });
        cuenta.hidden = !si;
      }
      return;
    }
    if (donde.closest('[data-tarjeta="matricula"]')) {
      this.abrirGlobo("matricula", explicacion("avion.matricula"));
      return;
    }
  }

  /** Girar con el dedo o el ratón: el dedo que aprieta en el visor es el que gira. */
  private alApretar(e: PointerEvent): void {
    const lienzo = (e.target as Element | null)?.closest?.('[data-tarjeta="lienzo"]');
    if (!lienzo || !this.visor || this.arrastre) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.arrastre = { dedo: e.pointerId, x: e.clientX, y: e.clientY, movido: false };
    this.visor.agarrar(true);
    this.root.querySelector(".tav")?.classList.add("tav--girado");
    e.preventDefault();
  }

  private alMover(e: PointerEvent): void {
    const a = this.arrastre;
    if (!a || a.dedo !== e.pointerId || !this.visor) return;
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    if (!a.movido && Math.hypot(dx, dy) < 6) return;
    a.movido = true;
    a.x = e.clientX;
    a.y = e.clientY;
    this.visor.girar(dx, dy);
  }

  private alSoltar(e: PointerEvent): void {
    const a = this.arrastre;
    if (!a || a.dedo !== e.pointerId) return;
    this.arrastre = null;
    this.visor?.agarrar(false);
    // Un toque sin mover en el avión cierra el globo, como tocar fuera.
    if (!a.movido && this.globo) this.cerrarGlobo();
  }
}
