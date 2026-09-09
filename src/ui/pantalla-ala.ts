/**
 * El esquema de cómo vuela un ala.
 *
 * Es lo único de este juego que **no se entiende oyéndolo**. Todo lo demás se
 * puede contar: el rodaje, el circuito, por qué se frustra. La sustentación
 * no, y por eso aquí no hay un narrador explicando nada — hay un ala en corte,
 * la corriente pasando por encima, el color de las presiones y un tirador.
 *
 * ## Un tirador, y pasa todo
 *
 * El ángulo de ataque. Se sube y salen las tres cosas seguidas:
 *
 * 1. Sube la sustentación, casi en línea recta.
 * 2. Sube también la resistencia, **pero más deprisa**. Ahí está la
 *    explicación entera de por qué no se vuela con el morro arriba del todo.
 * 3. Se sigue subiendo y, en un punto, el flujo se despega del extradós: las
 *    líneas se sueltan, el azul de la succión desaparece y la sustentación se
 *    cae. Eso es **la pérdida**, sin una ecuación y sin una palabra difícil.
 *
 * Y un segundo tirador para quien ya quiera más: la velocidad, que enseña que
 * la sustentación crece con el cuadrado y de ahí por qué despacio hay que ir
 * con el morro más alto.
 *
 * ## Lo que no se dice
 *
 * Nada de «el aire de arriba tiene más camino y tiene que llegar a la vez».
 * Es falso —llega antes— y además no hace ninguna falta.
 *
 * Y presión y deflexión no se presentan como dos teorías que compiten. **Son
 * la misma cosa vista por los dos lados**, y por eso el esquema enseña las dos
 * a la vez: el color de las presiones y la estela bajando, en el mismo dibujo
 * y desde el primer momento.
 */

import { t } from "../i18n";
import { Encierro } from "./panel";
import {
  ALFA_MAXIMA,
  ALFA_MINIMA,
  mirarElAla,
  presiones,
  VELOCIDAD_MAXIMA,
  VELOCIDAD_MINIMA,
  type Ala,
} from "../flight/ala";
import type { AircraftConfig } from "../flight/aircraft";
import {
  ALTO,
  ANCHO,
  aPantalla,
  contorno,
  corriente,
  envolvente,
} from "./ala-svg";

/** Dónde entran las líneas de corriente, respecto al eje. Arriba es negativo. */
const CORRIENTES = [-52, -38, -26, -16, -8, 8, 18, 30, 44];

/** Con qué ángulo y a qué velocidad se abre. Un ala volando, no una parada. */
const ALFA_AL_ABRIR = 6;
const VELOCIDAD_AL_ABRIR = 40;

/** Cuánto lienzo mide la flecha de sustentación cuando iguala al peso. */
const FLECHA_DEL_PESO = 58;

/** El cuadro de las dos curvas, abajo a la derecha del esquema. */
const CURVAS = { x: 214, y: 12, ancho: 92, alto: 58 };

export class PantallaDelAla {
  private readonly root: HTMLElement;
  private readonly encierro: Encierro;
  private readonly avion: AircraftConfig;
  /**
   * Si hay que dibujar la corriente quieta.
   *
   * Llega como pregunta y no como valor porque el ajuste se puede cambiar sin
   * salir del vuelo, y este panel se construye una sola vez: guardarlo aquí
   * significaría que quien pide movimiento reducido a media partida sigue
   * viendo las rayas moverse.
   */
  private readonly reducido: () => boolean;
  private alfa = ALFA_AL_ABRIR;
  private velocidad = VELOCIDAD_AL_ABRIR;

  constructor(
    root: HTMLElement,
    avion: AircraftConfig,
    reducido: () => boolean = () => false,
  ) {
    this.root = root;
    this.avion = avion;
    this.reducido = reducido;
    this.encierro = new Encierro(root, () => this.cerrar());
    root.innerHTML = this.armazon();
    root
      .querySelector('[data-ala="cerrar"]')
      ?.addEventListener("click", () => this.cerrar());
    root.addEventListener("click", (e) => {
      if (e.target === root) this.cerrar();
    });
    for (const cual of ["alfa", "velocidad"] as const) {
      const mando = root.querySelector<HTMLInputElement>(
        `[data-ala="${cual}"]`,
      );
      mando?.addEventListener("input", () => {
        if (cual === "alfa") this.alfa = Number(mando.value);
        else this.velocidad = Number(mando.value);
        this.pintar();
      });
    }
    this.pintar();
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  abrir(): void {
    this.root.hidden = false;
    this.encierro.abrir();
    this.pintar();
  }

  cerrar(): void {
    this.root.hidden = true;
    this.encierro.soltar();
  }

  alternar(): void {
    if (this.root.hidden) this.abrir();
    else this.cerrar();
  }

  private armazon(): string {
    /*
     * **La corriente se mueve, salvo que se haya pedido que no.**
     *
     * Es la única animación del panel y es la que lo hace entender: unas
     * rayas quietas encima de un ala son un peine. Pero moverla es
     * exactamente lo que el criterio 2.3.3 deja elegir, así que quien tenga
     * puesto el movimiento reducido ve el mismo dibujo, quieto.
     */
    return `
      <div class="ala__panel" role="dialog" aria-modal="true"
           aria-label="${t("ala.titulo")}">
        <h2>${t("ala.titulo")}</h2>
        <svg class="ala__esquema" viewBox="0 0 ${ANCHO} ${ALTO}" role="img"
             data-ala="dibujo" aria-label="${t("ala.titulo")}">
          <g class="ala__corriente" data-ala="corriente"></g>
          <path class="ala__presion ala__presion--chupa" data-ala="chupa" />
          <path class="ala__presion ala__presion--empuja" data-ala="empuja" />
          <path class="ala__perfil" data-ala="perfil" />
          <g class="ala__remolinos" data-ala="remolinos"></g>
          <g class="ala__fuerzas" data-ala="fuerzas"></g>
          <g class="ala__curvas" data-ala="curvas"></g>
        </svg>
        <p class="ala__dice" data-ala="dice" aria-live="polite"></p>
        <div class="ala__mandos">
          <label class="ala__mando">
            <span>${t("ala.angulo")}</span>
            <input type="range" data-ala="alfa" min="${ALFA_MINIMA}"
                   max="${ALFA_MAXIMA}" step="0.5" value="${ALFA_AL_ABRIR}" />
            <output data-ala="alfaValor"></output>
          </label>
          <label class="ala__mando">
            <span>${t("ala.velocidad")}</span>
            <input type="range" data-ala="velocidad" min="${VELOCIDAD_MINIMA}"
                   max="${VELOCIDAD_MAXIMA}" step="1"
                   value="${VELOCIDAD_AL_ABRIR}" />
            <output data-ala="velocidadValor"></output>
          </label>
        </div>
        <dl class="ala__cifras" data-ala="cifras"></dl>
        <button class="creditos__cerrar" type="button" data-ala="cerrar">
          ${t("credits.close")}
        </button>
      </div>
    `;
  }

  private pintar(): void {
    const ala = mirarElAla(this.avion, this.alfa, this.velocidad);
    const p = presiones(this.avion, this.alfa);
    const poner = (nombre: string, d: string) =>
      this.root.querySelector(`[data-ala="${nombre}"]`)?.setAttribute("d", d);
    const meter = (nombre: string, html: string) => {
      const donde = this.root.querySelector(`[data-ala="${nombre}"]`);
      if (donde) donde.innerHTML = html;
    };

    /*
     * **La corriente se mueve, salvo que se haya pedido que no.**
     *
     * Es la única animación del panel y es la que lo hace entender: unas rayas
     * quietas encima de un ala son un peine. Pero moverla es exactamente lo
     * que el criterio 2.3.3 deja elegir, así que quien tenga puesto el
     * movimiento reducido ve el mismo dibujo, quieto.
     */
    this.root
      .querySelector('[data-ala="corriente"]')
      ?.classList.toggle("ala__corriente--quieta", this.reducido());

    poner("perfil", contorno(this.alfa));
    poner("chupa", envolvente(p.arriba, this.alfa, true));
    poner("empuja", envolvente(p.abajo, this.alfa, false));
    meter(
      "corriente",
      CORRIENTES.map(
        (y) =>
          `<path d="${corriente(y, this.alfa, ala.cl, ala.separacion)}" />`,
      ).join(""),
    );
    meter("remolinos", this.remolinos(ala));
    meter("fuerzas", this.fuerzas(ala));
    meter("curvas", this.curvas(ala));
    meter("cifras", this.cifras(ala));

    const dice = this.root.querySelector('[data-ala="dice"]');
    if (dice) dice.textContent = this.queDice(ala);
    const alfaValor = this.root.querySelector('[data-ala="alfaValor"]');
    if (alfaValor) alfaValor.textContent = `${this.alfa.toFixed(1)}°`;
    const vValor = this.root.querySelector('[data-ala="velocidadValor"]');
    if (vValor) vValor.textContent = `${Math.round(this.velocidad * 3.6)} km/h`;
    const mando = this.root.querySelector('[data-ala="alfa"]');
    // Quien navega con teclado o lector oye el ángulo **y qué pasa a ese
    // ángulo**, que es lo que enseña el dibujo y no se ve leyendo un número.
    mando?.setAttribute(
      "aria-valuetext",
      `${this.alfa.toFixed(1)}°. ${this.queDice(ala)}`,
    );
  }

  /**
   * Los remolinos del extradós, que solo salen si el flujo se ha soltado.
   *
   * Son la parte del dibujo que dice «acá se rompió»: van creciendo y
   * poblando el trozo suelto según se insiste con el ángulo, y desaparecen
   * solos al bajar el morro, que es exactamente la maniobra que hay que
   * aprender.
   */
  private remolinos(ala: Ala): string {
    if (ala.desprendido <= 0) return "";
    const cuantos = Math.round(1 + ala.desprendido * 4);
    const trozos: string[] = [];
    for (let i = 0; i < cuantos; i++) {
      const t = ala.separacion + ((i + 0.6) / cuantos) * (1 - ala.separacion);
      const piel = aPantalla({ x: Math.min(t, 1), y: 0.05 }, this.alfa);
      const r = 3 + 2.2 * ala.desprendido + (i % 2) * 1.6;
      const alto = piel.y - 5 - (i % 2) * 4;
      trozos.push(
        `<path d="M${(piel.x - r).toFixed(1)} ${alto.toFixed(1)}
          a${r} ${r} 0 1 1 ${(r * 1.4).toFixed(1)} ${(r * 0.9).toFixed(1)}"
          opacity="${(0.35 + 0.55 * ala.desprendido).toFixed(2)}" />`,
      );
    }
    return trozos.join("");
  }

  /**
   * Las dos flechas, **a la misma escala**.
   *
   * Es una tentación dibujar la resistencia más grande para que se vea, y
   * sería mentir con un dibujo: a seis grados la resistencia es la décima
   * parte de la sustentación y eso es justamente por qué vuela un avión. Lo
   * que enseña que sube más deprisa es el cuadro de las curvas de al lado, no
   * una flecha inflada.
   */
  private fuerzas(ala: Ala): string {
    const peso = this.avion.mass * 9.80665;
    const escala = FLECHA_DEL_PESO / peso;
    const base = aPantalla({ x: 0.25, y: 0 }, this.alfa);
    /*
     * Y **la flecha no se sale del lienzo**. Se salía: a veintidós grados y a
     * ciento cuarenta por hora el ala levanta el doble de lo que pesa el
     * avión, la flecha medía más que el dibujo entero y se cortaba por arriba
     * sin punta, que es la única parte que dice hacia dónde va.
     */
    const arriba = Math.min(
      Math.max(ala.sustentacion * escala, 0),
      base.y - 14,
    );
    const atras = ala.resistencia * escala;
    return `
      <path class="ala__flecha ala__flecha--sustenta"
            d="M${base.x.toFixed(1)} ${base.y.toFixed(1)}
               v${(-arriba).toFixed(1)}" />
      <path class="ala__flecha ala__flecha--sustenta"
            d="M${(base.x - 4).toFixed(1)} ${(base.y - arriba + 7).toFixed(1)}
               L${base.x.toFixed(1)} ${(base.y - arriba).toFixed(1)}
               L${(base.x + 4).toFixed(1)} ${(base.y - arriba + 7).toFixed(1)}" />
      <path class="ala__flecha ala__flecha--arrastra"
            d="M${base.x.toFixed(1)} ${base.y.toFixed(1)}
               h${(-atras).toFixed(1)}" />
      <path class="ala__flecha ala__flecha--arrastra"
            d="M${(base.x - atras + 6).toFixed(1)} ${(base.y - 3.4).toFixed(1)}
               L${(base.x - atras).toFixed(1)} ${base.y.toFixed(1)}
               L${(base.x - atras + 6).toFixed(1)} ${(base.y + 3.4).toFixed(1)}" />
      <text class="ala__rotulo" x="${(base.x + 6).toFixed(1)}"
            y="${(base.y - arriba + 12).toFixed(1)}">${t("ala.sustentacion")}</text>
    `;
  }

  /**
   * Las dos curvas, con el punto donde se está.
   *
   * Es la mitad que las flechas no pueden enseñar: **cada una normalizada a su
   * propio máximo**, para que se vea la forma y no el tamaño. Y así, de un
   * vistazo, las tres lecciones — la de sustentación sube recta, la de
   * resistencia se dispara al final, y la primera hace cumbre y se cae justo
   * donde la segunda se pone vertical.
   */
  private curvas(ala: Ala): string {
    const puntos: Ala[] = [];
    for (let g = ALFA_MINIMA; g <= ALFA_MAXIMA; g += 0.5) {
      puntos.push(mirarElAla(this.avion, g, this.velocidad));
    }
    const maxCl = Math.max(...puntos.map((q) => q.cl));
    const maxCd = Math.max(...puntos.map((q) => q.cd));
    const enX = (g: number) =>
      CURVAS.x +
      ((g - ALFA_MINIMA) / (ALFA_MAXIMA - ALFA_MINIMA)) * CURVAS.ancho;
    const enY = (v: number, max: number) =>
      CURVAS.y + CURVAS.alto - (v / max) * CURVAS.alto;
    const linea = (saca: (q: Ala) => number, max: number) =>
      puntos
        .map(
          (q, i) =>
            `${i === 0 ? "M" : "L"}${enX(q.alfaGrados).toFixed(1)} ${enY(saca(q), max).toFixed(1)}`,
        )
        .join(" ");
    return `
      <rect class="ala__cuadro" x="${CURVAS.x}" y="${CURVAS.y}"
            width="${CURVAS.ancho}" height="${CURVAS.alto}" rx="4" />
      <path class="ala__curva ala__curva--arrastra"
            d="${linea((q) => q.cd, maxCd)}" />
      <path class="ala__curva ala__curva--sustenta"
            d="${linea((q) => q.cl, maxCl)}" />
      <circle class="ala__aqui ala__aqui--arrastra" r="2.6"
              cx="${enX(ala.alfaGrados).toFixed(1)}"
              cy="${enY(ala.cd, maxCd).toFixed(1)}" />
      <circle class="ala__aqui ala__aqui--sustenta" r="2.6"
              cx="${enX(ala.alfaGrados).toFixed(1)}"
              cy="${enY(ala.cl, maxCl).toFixed(1)}" />
      <text class="ala__rotulo ala__rotulo--sustenta"
            x="${CURVAS.x + 4}" y="${CURVAS.y + 9}">${t("ala.sustentacion")}</text>
      <text class="ala__rotulo ala__rotulo--arrastra"
            x="${CURVAS.x + 4}" y="${CURVAS.y + CURVAS.alto - 4}">${t("ala.resistencia")}</text>
    `;
  }

  /** Las cifras del ala que se está volando, a la derecha del esquema. */
  private cifras(ala: Ala): string {
    const fila = (clave: string, valor: string) =>
      `<div class="ala__cifra"><dt>${clave}</dt><dd>${valor}</dd></div>`;
    return [
      fila(t("ala.sustentacion"), `${Math.round(ala.sustentacion)} N`),
      fila(t("ala.resistencia"), `${Math.round(ala.resistencia)} N`),
      fila(t("ala.finura"), (ala.cl / ala.cd).toFixed(1)),
      fila(t("ala.peso"), `${ala.veces.toFixed(2)} ×`),
    ].join("");
  }

  /**
   * La frase que acompaña, y que cambia con lo que está pasando.
   *
   * Va en orden de urgencia: si el ala está desprendida, eso es lo único que
   * hay que decir. Es también lo que oye quien navega con lector de pantalla,
   * porque el dibujo no le llega.
   */
  private queDice(ala: Ala): string {
    if (ala.desprendido > 0) return t("ala.dice.perdida");
    const perdida = (this.avion.aero.alphaStall * 180) / Math.PI;
    if (ala.alfaGrados > perdida - 4) return t("ala.dice.cerca");
    if (ala.cl / ala.cd < 11) return t("ala.dice.arrastra");
    return t("ala.dice.arriba");
  }
}
