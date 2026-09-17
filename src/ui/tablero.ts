/**
 * El cuadro de mandos entero, de una pieza.
 *
 * Esto es lo que arregla el «esto no está centrado ni aunque venga Cristo y me
 * lo diga», y lo arregla de raíz: **el cuadro es un solo dibujo con su caja de
 * mil doscientos ochenta por quinientos cuarenta, y esa caja se escala
 * entera**. Antes eran cajas de HTML que cada avión colocaba como podía, y con
 * seis aviones de anchos distintos el resultado era inevitable. Ahora no hay
 * forma de descentrarlo: el centro de la caja es el centro de la pantalla, y
 * dentro de la caja el reparto lo decide `familia.ts` con margen duro de
 * veinte píxeles a cada lado.
 *
 * Y con el anclaje resuelto, lo otro que se pidió: «que cada aeronave parezca
 * lo que es, que un 747 no parezca un juguete, que contenga información, que
 * sea una información viva». De ahí las tres familias —esferas, cristal de dos
 * pantallas y cabina de línea— y de ahí que lo que se mueve se mueva **como**
 * se mueve el instrumento de verdad: las cintas se desplazan, los dígitos
 * ruedan, los bugs viajan, y la aguja de un reactor tarda tres segundos en
 * despertar mientras la de un pistón obedece al momento.
 *
 * Lo que **no** cambia entre familias es dónde está cada cosa: velocidad a la
 * izquierda, actitud en el medio, altitud a la derecha, rumbo abajo. En una
 * avioneta son seis esferas y en un Boeing son seis regiones de una pantalla,
 * y ese parecido es el hallazgo que se lleva quien aprende aquí.
 */

import type { AircraftConfig } from "../flight/aircraft";
import type { FlightState } from "../flight/model";
import { SixPack } from "./six-pack";
import { cuadroDe, type Cuadro } from "./cuadro";
import {
  ALTO_DEL_CUADRO,
  ANCHO_DEL_CUADRO,
  BANDA,
  VISERA,
  cajaDe,
  familiaDe,
  patasDe,
  type Familia,
} from "./familia";
import {
  POR_GRADO,
  POR_NUDO,
  columnaDeMotor,
  franjaDeMotor,
  lucesDeTren,
  pantallaDeActitud,
  pantallaDeMotores,
  pantallaDeNavegacion,
  tamborDeAltitud,
} from "./cristal";
import { luzDeTren } from "../flight/tren";
import {
  QUIETA_LA_ALTITUD,
  QUIETA_LA_VELOCIDAD,
  TARDA_EL_MOTOR,
  conRetardo,
  deslizaBug,
  parpadeo,
  precesion,
  tendencia,
} from "./cinta";

/** Lo que el cuadro necesita saber del vuelo para contarlo. */
export interface DatosDelTablero {
  readonly estado: FlightState;
  /** Velocidad indicada, en nudos. La esfera no negocia las unidades. */
  readonly nudos: number;
  /** Altitud, en pies. */
  readonly pies: number;
  /** Velocidad vertical, en pies por minuto. */
  readonly fpm: number;
  /** Altura **sobre el suelo**, en pies. La del radioaltímetro. */
  readonly sobreElTerreno: number;
  readonly alabeo: number;
  readonly cabeceo: number;
  /** Velocidad respecto al suelo, en nudos. Dato auxiliar: va en cian. */
  readonly sobreElSuelo: number;
  /** Número de Mach, o `null` si este avión no lo enseña. */
  readonly mach: number | null;
  /** A cuánto va cada motor, de 0 a 1, en su orden. */
  readonly motores: readonly number[];
  readonly flaps: number;
  /** Dónde está el tren: 0 dentro, 1 fuera y trabado. Ver `flight/tren.ts`. */
  readonly tren: number;
  readonly reversa: boolean;
  /** Las velocidades que se cantan, en nudos. `Infinity` si no aplican. */
  readonly v1: number;
  readonly vr: number;
  readonly vref: number;
  /** Adónde se va, si se va a algún sitio. Rumbo en radianes. */
  readonly objetivo: {
    readonly rumbo: number;
    readonly distancia: number;
  } | null;
  /** De dónde sopla y cuánto. */
  readonly viento: { readonly desde: number; readonly nudos: number } | null;
  readonly perdida: boolean;
}

const GRADOS = 180 / Math.PI;

export class Tablero {
  private raiz: SVGElement | null = null;
  private familia: Familia = "esferas";
  private cuadro: Cuadro | null = null;
  private readonly seisPack = new SixPack();

  /**
   * El estado en coma flotante de lo que se mueve con retardo.
   *
   * Vive aquí y no en el DOM porque redondear antes de dibujar es lo que hace
   * temblar una cinta en reposo — y un instrumento que tiembla cuando todo va
   * bien está mintiendo sobre la calma.
   */
  private agujas: number[] = [];
  private carta = { desviacion: 0, velocidad: 0 };
  /**
   * Si la carta de rumbo ya sabe adónde mira.
   *
   * La primera imagen de un vuelo se planta: sin esto la carta arrancaba en el
   * norte y se venía al rumbo de la pista girando, que es un giro que el avión
   * no ha hecho. Un instrumento se **enciende** marcando lo que hay, y a
   * partir de ahí ya se mueve como se mueve.
   */
  private cartaPuesta = false;
  private bugDeRumbo = 0;
  /**
   * Cuánto llevan encendidos los avisos.
   *
   * Hace falta guardarlo porque la regla no es «está o no está»: una alerta
   * **recién nacida** parpadea un segundo sí y otro no durante cinco segundos,
   * y después se queda fija mientras la condición dure. Lo primero llama la
   * atención; lo segundo deja leer. Un aviso que parpadea sin parar acaba
   * siendo parte del decorado, que es la peor forma de fallar de un aviso.
   */
  private readonly edades = new Map<string, number>();
  /** La línea que lee un lector de pantalla, y cuándo se dijo la última vez. */
  private lectura: HTMLElement | null = null;
  private desdeLaLectura = 0;

  /**
   * El dibujo entero. Se llama al montar el HUD y al cambiar de aeronave.
   *
   * ## **El cuadro no cambia entre peldaños: crece**
   *
   * Es la apuesta central del diseño de cabinas y la última que quedaba por
   * aplicar. Mismas posiciones, mismos colores, mismos movimientos en los
   * cuatro; lo que aparece es **lenguaje**. Un niño que sube de peldaño
   * reconoce su cabina al instante y descubre que siempre estuvo diciéndole
   * más de lo que él podía oír.
   *
   * Antes el cuadro aparecía de golpe en el peldaño de arriba y abajo no había
   * nada, así que quien empezaba a los cuatro años volaba sin instrumentos y a
   * los catorce se encontraba seis de golpe. Ahora en el primero hay cintas con
   * sus bandas de color, una rosa con su flecha y una aguja de motor en el
   * verde — sin una sola cifra, porque no se lee— y de ahí para arriba se van
   * encendiendo los números, las escalas, los rótulos y los objetivos.
   *
   * Y el mecanismo es el que tiene que ser: **un solo dibujo**, con cada pieza
   * marcada con el peldaño desde el que se ve. Nadie dibuja cuatro cuadros.
   * Ver `data-desde` y las reglas de `.tablero[data-peldano]` en la hoja.
   */
  markup(a: AircraftConfig, peldano = 4): string {
    const c = cuadroDe(a);
    const familia = familiaDe(a);
    this.seisPack.ponerCuadro(c);
    const dentro =
      familia === "esferas"
        ? this.deEsferas(a, c)
        : familia === "cristal"
          ? this.deCristal(a, c)
          : this.deLinea(a, c);
    return `
      <!--
        **El dibujo, para un lector de pantalla, es ruido.**

        Un cuadro de mandos completo son cuatrocientos rótulos, y casi todos
        son cifras de escala que no dicen nada sueltas: leerlos en voz alta no
        es accesibilidad, es un muro. Lo que hace falta es lo que un piloto
        cantaría —velocidad, altitud y rumbo—, y eso va debajo, en una línea
        que se relee sola de tanto en tanto. La versión anterior tampoco lo
        daba: rotulaba las seis esferas y no decía ni un número.
      -->
      <p class="tablero__lectura" data-hud="lectura" aria-live="polite"></p>
      <svg class="tablero" data-hud="tablero" data-familia="${familia}"
           data-peldano="${Math.max(1, Math.min(4, peldano))}"
           viewBox="0 0 ${ANCHO_DEL_CUADRO} ${ALTO_DEL_CUADRO}"
           preserveAspectRatio="xMidYMid meet"
           aria-hidden="true" focusable="false">
        ${this.mueble(a, familia)}
        ${dentro}
      </svg>
    `;
  }

  /**
   * La fascia, la visera y su sombra: el cuadro como **objeto físico**.
   *
   * «Nada flota sobre una losa negra». Un cuadro de mandos de verdad vive
   * debajo de un alero que le da sombra, y sin ese alero los instrumentos
   * parecen pegatinas. Cuesta cuatro rectángulos y cambia la cabina entera.
   */
  private mueble(a: AircraftConfig, familia: Familia): string {
    return `
      <defs>
        <linearGradient id="cabina-sombra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.75" />
          <stop offset="1" stop-color="#000" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="${ANCHO_DEL_CUADRO}" height="${ALTO_DEL_CUADRO}" class="tablero__fascia" />
      <rect y="${VISERA}" width="${ANCHO_DEL_CUADRO}" height="24" class="tablero__sombra" />
      <rect width="${ANCHO_DEL_CUADRO}" height="${VISERA}" class="tablero__visera" />
      ${familia === "linea" ? this.mcp() : ""}
      <text x="${ANCHO_DEL_CUADRO / 2}" y="${ALTO_DEL_CUADRO - 10}"
            data-desde="3" class="tablero__placa" text-anchor="middle">${a.name.toUpperCase()}</text>
    `;
  }

  /**
   * El MCP de la visera: las tres ventanillas donde un Boeing guarda lo que le
   * has pedido —velocidad, rumbo y altitud—. Es la firma visual de una cabina
   * de línea, y aquí además es coherente: lo que se quiere va siempre en
   * magenta, en los seis aviones.
   */
  private mcp(): string {
    const rotulos = ["SPD", "HDG", "ALT"];
    return rotulos
      .map((r, i) => {
        const x = 490 + i * 100;
        return `
          <g class="tablero__mcp" data-desde="2">
            <rect x="${x}" y="12" width="84" height="40" rx="3" />
            <!--
              Y el rótulo con la ventanilla, desde el mismo peldaño: tres
              cifras magenta sin decir de qué son no son tres objetivos, son
              tres números. La ventanilla y su nombre son la misma cosa.
            -->
            <text x="${x + 42}" y="24" data-desde="2" class="cr__rotulo"
                  text-anchor="middle">${r}</text>
            <text data-mcp="${r.toLowerCase()}" x="${x + 42}" y="45"
                  class="cr__objetivo" text-anchor="middle">---</text>
          </g>`;
      })
      .join("");
  }

  /** Familia de esferas: seis relojes, columna de motor y placa a la izquierda. */
  private deEsferas(a: AircraftConfig, c: Cuadro): string {
    const motor = cajaDe("esferas", "motor");
    const placa = cajaDe("esferas", "placa");
    return `
      ${SixPack.grupo(c)}
      <g transform="translate(${motor.x} ${BANDA.y})">
        ${columnaDeMotor(motor.ancho, BANDA.alto, c)}
      </g>
      <g transform="translate(${placa.x} ${BANDA.y})">
        <rect data-fondo="placa" width="${placa.ancho}" height="${BANDA.alto}" rx="4" class="tablero__hueco" />
        ${this.chapa(a, placa.ancho)}
        <text data-cristal="gs" x="${placa.ancho / 2}" y="${BANDA.alto - 74}"
              data-desde="3" class="cr__aux" text-anchor="middle"></text>
        ${lucesDeTren(
          (placa.ancho - patasDe(a) * 22 + 6) / 2,
          BANDA.alto - 48,
          patasDe(a),
        )}
      </g>
    `;
  }

  /**
   * La chapa del fabricante, con el nombre y la silueta del avión.
   *
   * Ocupa el hueco de la izquierda, que en una avioneta de verdad es donde van
   * los papeles y la placa de matrícula, y hace dos cosas: le da al cuadro una
   * simetría que no tenía y **enseña a reconocer tipos**, que es lo anterior a
   * saber leer un instrumento. A los cuatro años eso es la mitad de la gracia
   * de un juego de aviones.
   */
  private chapa(a: AircraftConfig, ancho: number): string {
    const partes = a.name.toUpperCase().split(" ");
    const arriba = partes.slice(0, 2).join(" ");
    const abajo = partes.slice(2).join(" ");
    return `
      <text x="${ancho / 2}" y="46" data-desde="3" class="tablero__chapa" text-anchor="middle">${arriba}</text>
      <text x="${ancho / 2}" y="76" data-desde="3" class="tablero__chapa tablero__chapa--nombre"
            text-anchor="middle">${abajo}</text>
      <line x1="${ancho * 0.2}" y1="94" x2="${ancho * 0.8}" y2="94" class="tablero__filete" />
    `;
  }

  /** Familia de cristal: horizonte a la izquierda, mapa con motor a la derecha. */
  private deCristal(a: AircraftConfig, c: Cuadro): string {
    const pfd = cajaDe("cristal", "pfd");
    const mfd = cajaDe("cristal", "mfd");
    const franja = 128;
    return `
      <g transform="translate(${pfd.x} ${BANDA.y})">
        ${pantallaDeActitud(pfd.ancho, BANDA.alto, c, { rosa: true, mach: false })}
      </g>
      <g transform="translate(${mfd.x} ${BANDA.y})">
        <rect width="${mfd.ancho}" height="${BANDA.alto}" rx="6" class="tablero__pantalla" />
        <g transform="translate(${franja + 8} 0)">
          ${pantallaDeNavegacion(mfd.ancho - franja - 8, BANDA.alto)}
        </g>
        ${franjaDeMotor(franja, BANDA.alto, c, a)}
      </g>
    `;
  }

  /** Familia de línea: actitud, navegación y motores, en ese orden de barrido. */
  private deLinea(a: AircraftConfig, c: Cuadro): string {
    const pfd = cajaDe("linea", "pfd");
    const nd = cajaDe("linea", "nd");
    const eicas = cajaDe("linea", "eicas");
    return `
      <g transform="translate(${pfd.x} ${BANDA.y})">
        ${pantallaDeActitud(pfd.ancho, BANDA.alto, c, { rosa: false, mach: true })}
      </g>
      <g transform="translate(${nd.x} ${BANDA.y})">
        ${pantallaDeNavegacion(nd.ancho, BANDA.alto)}
      </g>
      <g transform="translate(${eicas.x} ${BANDA.y})">
        ${pantallaDeMotores(eicas.ancho, BANDA.alto, c, a)}
      </g>
    `;
  }

  bind(raiz: HTMLElement, a: AircraftConfig): void {
    this.raiz = raiz.querySelector<SVGElement>('[data-hud="tablero"]');
    this.lectura = raiz.querySelector<HTMLElement>('[data-hud="lectura"]');
    this.familia = familiaDe(a);
    this.cuadro = cuadroDe(a);
    this.agujas = Array.from({ length: a.motores }, () => 0);
    this.carta = { desviacion: 0, velocidad: 0 };
    this.cartaPuesta = false;
    if (this.familia === "esferas") this.seisPack.bind(raiz);
  }

  get presente(): boolean {
    return this.raiz !== null;
  }

  update(d: DatosDelTablero, dt: number): void {
    const raiz = this.raiz;
    const c = this.cuadro;
    if (!raiz || !c) return;

    if (this.familia === "esferas" && this.seisPack.present) {
      this.seisPack.update(
        d.estado,
        d.nudos,
        d.pies,
        d.fpm,
        d.alabeo,
        d.cabeceo,
      );
    } else {
      this.cintas(raiz, d, dt);
    }
    this.motores(raiz, c, d, dt);
    this.mandos(raiz, d);
    // Los avisos, en las tres familias: la avioneta también se cae.
    this.avisos(raiz, d, dt);
    this.texto(raiz, "gs", `GS ${Math.round(d.sobreElSuelo)}`);
    this.cantar(d, dt);
  }

  // ── Lo que se mueve ─────────────────────────────────────────────────

  private cintas(raiz: SVGElement, d: DatosDelTablero, dt: number): void {
    const rumbo = (((d.estado.heading * GRADOS) % 360) + 360) % 360;

    this.tira(raiz, "ias", d.nudos);
    this.tira(raiz, "alt", d.pies);

    /*
     * La carta de rumbo se pasa un par de grados al salir de un viraje, como
     * se pasa un giróscopo de verdad: tiene masa. Es de las cosas que hacen
     * que un instrumento parezca de verdad sin que nadie sepa decir por qué.
     *
     * Se persigue el rumbo por el camino corto para que no dé la vuelta entera
     * al cruzar el norte, que es donde esta clase de suavizado se delata.
     */
    if (!this.cartaPuesta) {
      this.carta = { desviacion: rumbo, velocidad: 0 };
      this.cartaPuesta = true;
    }
    const corto = ((rumbo - this.carta.desviacion + 540) % 360) - 180;
    this.carta = precesion(
      this.carta.desviacion,
      this.carta.velocidad,
      this.carta.desviacion + corto,
      dt,
    );
    const cartaDeg = ((this.carta.desviacion % 360) + 360) % 360;
    this.tira(raiz, "hdg", cartaDeg);
    const rosa = raiz.querySelector<SVGElement>('[data-cristal="rosa"]');
    rosa?.setAttribute("transform", `rotate(${-cartaDeg})`);

    // El horizonte, en cambio, va sin retardo: es el instrumento más directo
    // de la cabina y meterle inercia sería enseñar mal.
    const disco = raiz.querySelector<SVGElement>('[data-cristal="disco"]');
    if (disco) {
      const cx = Number(disco.dataset.cx);
      const cy = Number(disco.dataset.cy);
      const porGrado = Number(disco.dataset.porgrado);
      disco.setAttribute(
        "transform",
        `rotate(${-d.alabeo * GRADOS} ${cx} ${cy}) translate(0 ${cy + d.cabeceo * GRADOS * porGrado})`,
      );
    }
    const resbala = raiz.querySelector<SVGElement>(
      '[data-cristal="deslizamiento"]',
    );
    if (resbala) {
      const ampl = Number(resbala.dataset.ampl) || 20;
      const cuanto = Math.max(-1, Math.min(1, d.estado.beta * 6)) * ampl * 0.4;
      resbala.setAttribute("transform", `translate(${cuanto} 0)`);
    }

    this.texto(raiz, "ias", String(Math.round(d.nudos)));
    this.altitud(raiz, d.pies);
    this.texto(raiz, "hdg", pad3(Math.round(rumbo) % 360));
    this.texto(raiz, "nd-rumbo", pad3(Math.round(rumbo) % 360));
    if (d.mach !== null && d.mach >= 0.4) {
      this.texto(raiz, "mach", `M ${d.mach.toFixed(2).slice(1)}`);
    } else {
      this.texto(raiz, "mach", "");
    }
    this.texto(
      raiz,
      "viento",
      d.viento
        ? `${pad3(Math.round(d.viento.desde))}/${Math.round(d.viento.nudos)}`
        : "",
    );
    this.texto(
      raiz,
      "distancia",
      d.objetivo ? `${(d.objetivo.distancia / 1852).toFixed(1)} NM` : "",
    );

    /*
     * El radioaltímetro, que aparece por debajo de dos mil quinientos pies y
     * desaparece por encima: mientras sobra altura no dice nada, y en cuanto
     * empieza a faltar es el único número que se mira.
     */
    const radio = raiz.querySelector<SVGElement>('[data-cristal="radio"]');
    if (radio) {
      const cerca = d.sobreElTerreno < DESDE_EL_RADIO;
      radio.setAttribute("visibility", cerca ? "visible" : "hidden");
      radio.classList.toggle("cr--bajito", d.sobreElTerreno < YA_ES_BAJO);
      const cifra = radio.querySelector("text");
      if (cifra && cerca) {
        cifra.textContent = String(Math.max(0, Math.round(d.sobreElTerreno)));
      }
    }

    this.vsi(raiz, d.fpm);
    this.tendencias(raiz, d);
    this.bugs(raiz, d, dt, rumbo);

    // La ruta, en magenta, desde el avión hacia donde se va.
    const ruta = raiz.querySelector<SVGPathElement>(
      '[data-cristal="ruta"] path',
    );
    if (ruta) {
      if (!d.objetivo) ruta.setAttribute("d", "M0 0");
      else {
        const rel = ((d.objetivo.rumbo * GRADOS - rumbo) * Math.PI) / 180;
        ruta.setAttribute(
          "d",
          `M0 0 L${Math.sin(rel) * 160} ${-Math.cos(rel) * 160}`,
        );
      }
    }
  }

  /**
   * Los avisos, con la política de una cabina de verdad.
   *
   * Dos y nada más, que es el máximo que puede parpadear a la vez: la pérdida
   * —marco rojo alrededor del horizonte, que es donde mira quien ya está en
   * apuros— y la sobrevelocidad, en la caja de la velocidad. Ámbar quiere
   * decir «mirame»; rojo, «actuá ya». No significan ninguna otra cosa en todo
   * el juego, y ninguna otra cosa se pinta de esos colores.
   */
  private avisos(raiz: SVGElement, d: DatosDelTablero, dt: number): void {
    /*
     * Y con «Movimiento: reducido» puesto, el aviso **no parpadea: se enciende
     * y se queda**. Un parpadeo es exactamente la clase de movimiento que ese
     * ajuste existe para quitar, y lo que el aviso tiene que hacer —estar y
     * verse— no depende de que se mueva. Apagarlo del todo sí sería un fallo:
     * el ajuste reduce el movimiento, no la información.
     */
    const quieto = raiz.closest(".sin-movimiento") !== null;
    const enciende = (que: string, activo: boolean) =>
      activo && (quieto || parpadeo(this.edad(que, activo, dt)));

    const marco = raiz.querySelector<SVGElement>('[data-cristal="perdida"]');
    marco?.setAttribute(
      "visibility",
      enciende("perdida", d.perdida) ? "visible" : "hidden",
    );

    /*
     * Y la de nunca pasar, que sale de la ficha de **este** avión: ámbar cinco
     * nudos antes, rojo al llegar. Es el mismo número que pinta el arco rojo de
     * la esfera, y sale del mismo sitio para que no puedan discrepar.
     */
    const c = this.cuadro;
    const caja = raiz.querySelector<SVGElement>('[data-alerta="ias"]');
    if (!c || !caja) return;
    const vne = c.arcos.rojo[0] * c.asiMax;
    const pasado = d.nudos >= vne;
    const cerca = d.nudos >= vne - AVISA_CINCO_ANTES;
    caja.classList.toggle("cr__caja--limite", enciende("exceso", pasado));
    caja.classList.toggle("cr__caja--precaucion", cerca && !pasado);
  }

  /** Cuánto lleva encendido un aviso. Se pone a cero en cuanto se apaga. */
  private edad(que: string, encendido: boolean, dt: number): number {
    if (!encendido) {
      this.edades.set(que, 0);
      return 0;
    }
    const edad = (this.edades.get(que) ?? 0) + dt;
    this.edades.set(que, edad);
    return edad;
  }

  /** Desplaza una tira para que el valor de ahora caiga en la línea de fe. */
  private tira(raiz: SVGElement, que: string, valor: number): void {
    const g = raiz.querySelector<SVGElement>(`[data-tira="${que}"]`);
    if (!g) return;
    const medio = Number(g.dataset.medio);
    const porUnidad = Number(g.dataset.porunidad);
    if (que === "hdg") {
      g.setAttribute("transform", `translate(${medio - valor * porUnidad} 0)`);
    } else {
      g.setAttribute("transform", `translate(0 ${medio + valor * porUnidad})`);
    }
  }

  /**
   * La altitud: la caja con lo de delante y el tambor con los dos últimos
   * dígitos rodando. Que es como se lee un altímetro de verdad de un vistazo.
   */
  private altitud(raiz: SVGElement, pies: number): void {
    this.texto(raiz, "alt", String(Math.floor(pies / 100)));
    const tambor = raiz.querySelector<SVGElement>('[data-tambor="alt"]');
    if (!tambor) return;
    const paso = Number(tambor.dataset.paso) || 26;
    const { centro, fraccion } = tamborDeAltitud(pies);
    tambor.setAttribute("transform", `translate(0 ${fraccion * paso})`);
    for (const t of tambor.querySelectorAll<SVGTextElement>(
      "[data-tambor-cifra]",
    )) {
      const k = Number(t.dataset.tamborCifra) - 1; // -1 arriba, +1 abajo
      const valor = centro - k * 20;
      t.textContent = String(((valor % 100) + 100) % 100).padStart(2, "0");
    }
  }

  private vsi(raiz: SVGElement, fpm: number): void {
    const g = raiz.querySelector<SVGElement>('[data-cristal="vsi"]');
    if (!g) return;
    const ampl = Number(g.dataset.ampl);
    const max = Number(g.dataset.max);
    const f = Math.max(-1, Math.min(1, fpm / max));
    g.setAttribute("transform", `translate(0 ${-f * ampl})`);
  }

  /**
   * Los vectores de tendencia: dónde estarás dentro de seis segundos si no
   * tocas nada. Es la animación más valiosa del cuadro, porque lo que enseña
   * es anticipación — que es casi todo lo que es pilotar.
   */
  private tendencias(raiz: SVGElement, d: DatosDelTablero): void {
    const v = tendencia(this.aceleracion, QUIETA_LA_VELOCIDAD);
    const a = tendencia(d.fpm / 60, QUIETA_LA_ALTITUD / 60);
    this.barra(raiz, "ias", v);
    this.barra(raiz, "alt", a);
  }

  private barra(raiz: SVGElement, que: string, salto: number | null): void {
    const r = raiz.querySelector<SVGRectElement>(`[data-tendencia="${que}"]`);
    if (!r) return;
    if (salto === null) {
      r.setAttribute("height", "0");
      return;
    }
    const medio = Number(r.dataset.medio);
    const porUnidad = Number(r.dataset.porunidad);
    const largo = Math.min(Math.abs(salto) * porUnidad, medio - 6);
    r.setAttribute("y", String(salto > 0 ? medio - largo : medio));
    r.setAttribute("height", String(largo));
  }

  /** Lo que se persigue: los bugs viajan a su sitio, no aparecen en él. */
  private bugs(
    raiz: SVGElement,
    d: DatosDelTablero,
    dt: number,
    rumbo: number,
  ): void {
    const ponV = (que: string, kt: number) => {
      const g = raiz.querySelector<SVGElement>(`[data-bug="${que}"]`);
      if (!g) return;
      if (!Number.isFinite(kt) || kt <= 0) {
        g.setAttribute("visibility", "hidden");
        return;
      }
      g.setAttribute("visibility", "visible");
      g.setAttribute("transform", `translate(0 ${-kt * POR_NUDO})`);
    };
    ponV("v1", d.v1);
    ponV("vr", d.vr);
    ponV("vref", d.vref);

    const quiero = d.objetivo
      ? (((d.objetivo.rumbo * GRADOS) % 360) + 360) % 360
      : rumbo;
    const corto = ((quiero - this.bugDeRumbo + 540) % 360) - 180;
    this.bugDeRumbo = deslizaBug(this.bugDeRumbo, this.bugDeRumbo + corto, dt);
    const bugDeg = ((this.bugDeRumbo % 360) + 360) % 360;
    const enCinta = raiz.querySelector<SVGElement>('[data-bug="hdg"]');
    enCinta?.setAttribute("transform", `translate(${bugDeg * POR_GRADO} 0)`);
    const enRosa = raiz.querySelector<SVGElement>('[data-bug="rosa"]');
    enRosa?.setAttribute("transform", `rotate(${bugDeg})`);
    const mcp = raiz.querySelector<SVGTextElement>('[data-mcp="hdg"]');
    if (mcp) mcp.textContent = pad3(Math.round(bugDeg) % 360);
    const mcpSpd = raiz.querySelector<SVGTextElement>('[data-mcp="spd"]');
    if (mcpSpd)
      mcpSpd.textContent = Number.isFinite(d.vref)
        ? String(Math.round(d.vref))
        : "---";
    const mcpAlt = raiz.querySelector<SVGTextElement>('[data-mcp="alt"]');
    if (mcpAlt) mcpAlt.textContent = String(Math.round(d.pies / 100) * 100);
  }

  // ── Los motores y los mandos ────────────────────────────────────────

  /**
   * Cada motor tiene su carácter temporal, y la aguja lo enseña.
   *
   * Un pistón obedece en tres décimas; un turbofán tarda tres segundos en
   * despertar. Ese retardo es real y es lo que hace que un avión de línea se
   * vuele con paciencia, adelantándose. Que la aguja tarde no es un defecto
   * del dibujo: **es la lección**.
   */
  private motores(
    raiz: SVGElement,
    c: Cuadro,
    d: DatosDelTablero,
    dt: number,
  ): void {
    const tau = TARDA_EL_MOTOR[c.queMarca];
    for (let i = 0; i < this.agujas.length; i++) {
      const objetivo = d.motores[i] ?? 0;
      this.agujas[i] = conRetardo(this.agujas[i]!, objetivo, dt, tau);
      const f = Math.max(0, Math.min(1, this.agujas[i]!));
      const aguja = raiz.querySelector<SVGElement>(`[data-motor-aguja="${i}"]`);
      aguja?.setAttribute("transform", `rotate(${-120 + f * 240})`);
      const barra = raiz.querySelector<SVGRectElement>(
        `[data-motor-barra="${i}"]`,
      );
      if (barra) {
        const alto = Number(barra.dataset.alto);
        const suelo = Number(barra.dataset.suelo);
        barra.setAttribute("y", String(suelo - f * alto));
        barra.setAttribute("height", String(f * alto));
        barra.classList.toggle("cr__barra--tope", f > 0.95);
      }
      const cifra = raiz.querySelector<SVGTextElement>(
        `[data-motor-cifra="${i}"]`,
      );
      if (cifra) cifra.textContent = String(Math.round(f * 100));
      /*
       * Y lo que se le ha **pedido**, que no es lo mismo: el bug y la barra van
       * al mando, la aguja y la cifra van a lo que está dando. Verlos separarse
       * en cada empujón de gas es toda la lección de un reactor.
       */
      const pedido = Math.max(0, Math.min(1, objetivo));
      const bug = raiz.querySelector<SVGElement>(`[data-motor-bug="${i}"]`);
      bug?.setAttribute("transform", `rotate(${-120 + pedido * 240})`);
      const mando = raiz.querySelector<SVGRectElement>(
        `[data-mando-motor="${i}"]`,
      );
      if (mando) {
        mando.setAttribute(
          "width",
          String(pedido * Number(mando.dataset.ancho)),
        );
      }
      const g = raiz.querySelector<SVGElement>(`[data-motor="${i}"]`);
      g?.classList.toggle("cr--tope", f > 0.95);
    }
  }

  private mandos(raiz: SVGElement, d: DatosDelTablero): void {
    const flaps = raiz.querySelector<SVGElement>('[data-cristal="flaps"]');
    if (flaps) {
      const largo = Number(flaps.dataset.largo);
      const cuanto = Math.max(0, Math.min(1, d.flaps)) * largo;
      flaps.setAttribute(
        "transform",
        flaps.dataset.tumbada === "1"
          ? `translate(${cuanto} 0)`
          : `translate(0 ${cuanto})`,
      );
    }
    const rev = raiz.querySelector<SVGElement>('[data-cristal="reversa"]');
    rev?.setAttribute("visibility", d.reversa ? "visible" : "hidden");

    /*
     * Y las luces del tren, con sus tres estados. Verde solo cuando está fuera
     * **y trabado**: con el tren a medio camino la luz es ámbar, que quiere
     * decir «esperá», y esa espera de diez segundos es media lección del
     * mando. Ver `flight/tren.ts`.
     */
    const tren = raiz.querySelector<SVGElement>('[data-cristal="tren"]');
    if (tren) {
      const luz = luzDeTren(d.tren);
      tren.classList.toggle("cr--moviendose", luz === "moviendose");
      tren.classList.toggle("cr--dentro", luz === "dentro");
    }
  }

  /**
   * Cuánto acelera, en nudos por segundo, para el vector de tendencia.
   *
   * Se guarda porque la tendencia es una **derivada** y el cuadro solo recibe
   * el valor: derivarla aquí, con la velocidad del cuadro anterior, es la
   * única fuente que hay. Ver `cinta.ts`.
   */
  private aceleracion = 0;
  private nudosAntes: number | null = null;

  /** Lo llama el HUD antes de `update`, con el mismo paso de tiempo. */
  medirAceleracion(nudos: number, dt: number): void {
    if (dt > 0 && this.nudosAntes !== null) {
      /*
       * Suavizado de medio segundo: la derivada cruda de una velocidad que ya
       * viene muestreada da un vector de tendencia que baila, y un vector que
       * baila no enseña a anticipar nada.
       */
      const cruda = (nudos - this.nudosAntes) / dt;
      this.aceleracion = conRetardo(this.aceleracion, cruda, dt, 0.5);
    }
    this.nudosAntes = nudos;
  }

  /**
   * Lo que se lee en voz alta, cada tantos segundos.
   *
   * **Cada tanto y no en cada imagen**: una región viva que cambia sesenta
   * veces por segundo no se lee, se atasca — el lector empieza la frase, la
   * abandona y empieza otra, y quien escucha no se entera de nada. Cinco
   * segundos es más o menos lo que tarda en decirse, que es el único ritmo
   * que tiene sentido.
   */
  private cantar(d: DatosDelTablero, dt: number): void {
    if (!this.lectura) return;
    this.desdeLaLectura += dt;
    if (this.desdeLaLectura < ENTRE_LECTURAS) return;
    this.desdeLaLectura = 0;
    const rumbo = pad3(Math.round((d.estado.heading * GRADOS) % 360));
    this.lectura.textContent =
      `${Math.round(d.nudos)} nudos, ` +
      `${Math.round(d.pies / 10) * 10} pies, ` +
      `rumbo ${rumbo}`;
  }

  private texto(raiz: SVGElement, que: string, valor: string): void {
    if (!que) return;
    const t = raiz.querySelector<SVGTextElement>(`[data-cristal="${que}"]`);
    if (t) t.textContent = valor;
  }
}

/** Cada cuánto se relee el cuadro en voz alta, en segundos. */
const ENTRE_LECTURAS = 5;

/** Cuántos nudos antes de la de nunca pasar se enciende el ámbar. */
const AVISA_CINCO_ANTES = 5;

/**
 * Desde qué altura sobre el suelo aparece el radioaltímetro, en pies.
 *
 * Dos mil quinientos, que es donde lo encienden los de verdad. Y por debajo de
 * doscientos se pone ámbar: ahí ya no es un dato, es un aviso.
 */
const DESDE_EL_RADIO = 2500;
const YA_ES_BAJO = 200;

function pad3(g: number): string {
  return String(((g % 360) + 360) % 360).padStart(3, "0");
}
