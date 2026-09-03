/**
 * El mapa: dónde estoy.
 *
 * Nació de una pregunta muy concreta de quien lo probó: «estoy buscando el río
 * Paraguay, el que pasa por debajo del puente del Chaco, pero estoy
 * desorientado». Y es que en el aire, a quinientos metros y sin instrumentos —
 * en Guyrami no hay ni brújula—, no hay absolutamente nada que diga por dónde
 * se va.
 *
 * **Un mapa es lo más legible que existe para quien no lee.** No hace falta una
 * sola palabra: el asfalto es gris, la ciudad es beis, el monte es verde, la
 * pista es una barra blanca y tú eres una flecha naranja. Un niño de cuatro
 * años sabe leer un mapa mucho antes que una frase.
 *
 * ## Cómo está hecho
 *
 * Dos lienzos. El de abajo se pinta **una sola vez** —relieve, agua, ciudad,
 * carreteras y pista— porque nada de eso se mueve; el de arriba lleva solo la
 * flecha y se repinta cada fotograma. Repintar el mundo entero sesenta veces
 * por segundo para mover un triángulo costaba más que el juego.
 *
 * El norte va arriba y no gira con el avión. Un mapa que gira es más cómodo de
 * seguir y **mucho peor para aprenderse un sitio**, que es de lo que se trata:
 * el río está al oeste siempre, no «a la izquierda ahora mismo».
 */

import { t } from '../i18n';
import type { Scenario } from '../world/scenarios';
import { puntoDePista } from '../world/rumbo';

/** Lado del lienzo, en píxeles. */
const LADO = 460;

/** Cuántas muestras de relieve se pintan por lado. */
const MUESTRAS = 230;

/**
 * Los cuatro alcances del mapa, en metros de mundo que caben de lado a lado.
 *
 * No es un zoom continuo a propósito. Un zoom continuo se maneja con dos dedos
 * o con una rueda, y aquí hay que poder cambiarlo **con un dedo y sin puntería**;
 * cuatro escalones se recorren con dos botones grandes y no hay forma de
 * quedarse en un encuadre raro.
 *
 * El más ancho es el escenario entero, que es lo que había hasta ahora y sirve
 * para saber dónde está uno. Los otros tres son para lo que se pedía y no se
 * podía: mirar el aeropuerto de cerca —«¿este mapa no tiene zoom ni nada?»— y
 * ver por dónde va la rodadura.
 */
const ALCANCES = [1, 0.45, 0.18, 0.07] as const;

export class Mapa {
  private caja: HTMLElement | null = null;
  private fondo: HTMLCanvasElement | null = null;
  private encima: HTMLCanvasElement | null = null;
  private abierto = false;
  private pintado = false;
  /** Qué alcance está puesto, como índice de `ALCANCES`. */
  private alcance = 0;
  private escenario: Scenario | null = null;
  private cota: ((x: number, z: number) => number) | null = null;

  static markup(): string {
    return `
      <div class="mapa" data-hud="mapa" hidden>
        <div class="mapa__lienzos">
          <canvas class="mapa__fondo" data-hud="mapa-fondo" width="${LADO}" height="${LADO}"></canvas>
          <canvas class="mapa__encima" data-hud="mapa-encima" width="${LADO}" height="${LADO}"></canvas>
          <!--
            Los dos botones van **dentro** del mapa y grandes. Fuera se leen
            como mandos del juego y aquí no lo son; y pequeños no se aciertan
            con un dedo de cuatro años.
          -->
          <div class="mapa__lupas">
            <button class="mapa__lupa" type="button" data-hud="mapa-lejos"
                    aria-label="${t('mapa.lejos')}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.6" />
                <path d="M15.4 15.4 L21 21 M7 10.5 h7" />
              </svg>
            </button>
            <button class="mapa__lupa" type="button" data-hud="mapa-cerca"
                    aria-label="${t('mapa.cerca')}">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.6" />
                <path d="M15.4 15.4 L21 21 M7 10.5 h7 M10.5 7 v7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /** El botón que lo abre, para la barra de arriba. */
  static boton(etiqueta: string): string {
    return `
      <button class="sonido teclas-boton" type="button" data-hud="mapa-boton" aria-label="${etiqueta}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.6 6.2 L9 3.6 v14.2 l-6.4 2.6 Z" />
          <path d="M9 3.6 L15 6.2 v14.2 L9 17.8 Z" />
          <path d="M15 6.2 L21.4 3.6 v14.2 L15 20.4 Z" />
        </svg>
      </button>
    `;
  }

  bind(raiz: HTMLElement, escenario: Scenario, cota: (x: number, z: number) => number): void {
    this.escenario = escenario;
    this.cota = cota;
    this.raiz = raiz;
    this.caja = raiz.querySelector('[data-hud="mapa"]');
    this.fondo = raiz.querySelector('[data-hud="mapa-fondo"]');
    this.encima = raiz.querySelector('[data-hud="mapa-encima"]');
    raiz.querySelector('[data-hud="mapa-boton"]')?.addEventListener('click', () => this.alternar());
    raiz.querySelector('[data-hud="mapa-cerca"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.acercar(1);
    });
    raiz.querySelector('[data-hud="mapa-lejos"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.acercar(-1);
    });
    // Y la rueda del ratón, para quien la tenga. No sustituye a los botones:
    // los acompaña.
    this.caja?.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.acercar(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    // Tocando el fondo se cierra. Es lo que espera cualquiera que haya abierto
    // una lámina encima de algo, y para quien no lee es la única salida obvia:
    // no hay ninguna equis que buscar.
    this.caja?.addEventListener('pointerdown', (e) => {
      if (e.target === this.caja) this.cerrar();
    });
  }

  /**
   * Otro escenario, otro mapa.
   *
   * Lo llama el panel del tiempo: cambiar el viento cambia la cabecera en uso, y
   * la pista del mapa es la que se está usando. Con la barra blanca de la
   * cabecera vieja, el mapa mentiría justo en lo que se mira cuando uno se ha
   * perdido.
   */
  rehacer(escenario: Scenario): void {
    this.escenario = escenario;
    this.pintado = false;
    if (this.abierto) {
      this.pintarFondo();
      this.pintado = true;
    }
  }

  /** La raíz del HUD, para marcarla mientras el mapa está abierto. */
  private raiz: HTMLElement | null = null;

  private alAbrir: (() => void) | null = null;

  /** A quién avisar al abrirse, para que se aparte. */
  onAbrir(handler: () => void): void {
    this.alAbrir = handler;
  }

  /**
   * Cambia de alcance y **repinta el fondo**, que es lo caro.
   *
   * Se repinta entero porque el relieve se muestrea a la resolución del
   * encuadre: acercarse no es ampliar la imagen, es volver a preguntarle al
   * terreno con más detalle. Ampliar la de antes daría un mapa borroso, que es
   * justo lo que no sirve para mirar una calle de rodaje.
   */
  private acercar(paso: number): void {
    const antes = this.alcance;
    this.alcance = Math.max(0, Math.min(ALCANCES.length - 1, this.alcance + paso));
    if (this.alcance === antes) return;
    this.pintarFondo();
  }

  cerrar(): void {
    if (!this.caja || !this.abierto) return;
    this.abierto = false;
    this.caja.hidden = true;
    this.avisarAlHud();
  }

  alternar(): void {
    if (!this.caja) return;
    this.abierto = !this.abierto;
    this.caja.hidden = !this.abierto;
    this.avisarAlHud();
    if (this.abierto) this.alAbrir?.();
    if (this.abierto && !this.pintado) {
      this.pintarFondo();
      this.pintado = true;
    }
  }

  /**
   * Le dice al HUD que el mapa está abierto, para que aparte lo que estorbe.
   *
   * Va por una clase en la raíz y no tocando estilos desde aquí porque quién
   * se aparta y cuánto es cosa del CSS: en pantalla estrecha el mapa se pone
   * en medio y no hay que apartar nada.
   */
  private avisarAlHud(): void {
    this.raiz?.classList.toggle('hud--con-mapa', this.abierto);
  }

  get visible(): boolean {
    return this.abierto;
  }

  /** Dónde está el avión, para poder centrar el mapa en él al acercarse. */
  private avionX = 0;
  private avionZ = 0;

  /** Mueve la flecha. Se llama cada fotograma, así que no pinta el mundo. */
  update(x: number, z: number, rumboRad: number): void {
    /*
     * **Al acercarse, el mapa sigue al avión; de lejos, no.**
     *
     * En el alcance ancho el encuadre es el escenario entero y moverlo no
     * tendría sentido — se mira para saber dónde estás dentro de todo. En los
     * acercados el escenario no cabe, así que el centro pasa a ser el avión, y
     * entonces el fondo hay que repintarlo cuando uno se aleja lo suficiente.
     */
    const movido = Math.hypot(x - this.avionX, z - this.avionZ);
    const anchoAntes = this.metrosPorLado();
    this.avionX = x;
    this.avionZ = z;
    const anchoAhora = this.metrosPorLado();
    /*
     * Se repinta el fondo cuando hace falta, y hacen falta dos cosas distintas.
     * De cerca, porque el mapa sigue al avión y el encuadre se queda atrás. De
     * lejos, porque **el mapa se estira si el avión se ha ido fuera** y el
     * dibujo tiene que estirarse con él: sin esto, quien sale a mar abierto veía
     * el mismo cuadrado de siempre con la flecha clavada en un borde.
     */
    const estirado = Math.abs(anchoAhora - anchoAntes) > anchoAntes * 0.08;
    if (this.abierto && (estirado || (this.alcance > 0 && movido > anchoAhora * 0.08))) {
      this.pintarFondo();
    }
    if (!this.abierto || !this.encima || !this.escenario) return;
    const g = this.encima.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, LADO, LADO);

    const escala = LADO / this.metrosPorLado();
    const c = this.centro();
    const px = LADO / 2 + (x - c[0]) * escala;
    const py = LADO / 2 + (z - c[1]) * escala;

    /*
     * **Y si estás fuera del recuadro, la flecha se queda en el borde.**
     *
     * Volando sobre el mar camino de Gran Canaria, la flecha se salía del
     * lienzo y el mapa se quedaba en blanco azul sin nada: «estoy fuera de este
     * mapa y el mapa me da esto». Un mapa que no sabe que puedes estar fuera de
     * él no es un mapa, es un cuadro.
     *
     * Se pega al borde, apuntando a donde vas, y se le pone un aro para que se
     * distinga de estar dentro. Es lo que hace cualquier navegador con un punto
     * que se sale, y para quien no lee es lo único que se entiende: **por ahí
     * está lo que buscas**.
     */
    const margen = 14;
    const fuera = px < margen || py < margen || px > LADO - margen || py > LADO - margen;
    const cx = Math.max(margen, Math.min(LADO - margen, px));
    const cy = Math.max(margen, Math.min(LADO - margen, py));

    if (fuera) {
      /*
       * Una línea de puntos desde el centro hasta la flecha.
       *
       * La flecha pegada al borde se queda a veces detrás de las lupas, y
       * moverlas solo cambia de sitio el problema: el avión puede salir del
       * mundo por cualquier lado. La línea se lee igual aunque un botón le
       * tape la punta, y además dice lo único que hace falta saber ahí —**por
       * dónde has salido**— sin una palabra.
       */
      g.save();
      g.setLineDash([4, 5]);
      g.strokeStyle = 'rgba(232, 118, 44, 0.75)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(LADO / 2, LADO / 2);
      g.lineTo(cx, cy);
      g.stroke();
      g.restore();
    }

    g.save();
    g.translate(cx, cy);
    // El rumbo del avión y el norte del mapa son el mismo cero: arriba.
    g.rotate(rumboRad);
    g.fillStyle = '#e8762c';
    g.strokeStyle = '#2a2622';
    g.lineWidth = 1.6;
    if (fuera) {
      // El aro dice «estás fuera, esto es por dónde».
      g.beginPath();
      g.arc(0, 0, 13, 0, Math.PI * 2);
      g.strokeStyle = '#e8762c';
      g.lineWidth = 2.4;
      g.stroke();
      g.strokeStyle = '#2a2622';
      g.lineWidth = 1.6;
    }
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(6.5, 8);
    g.lineTo(0, 4.5);
    g.lineTo(-6.5, 8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  /**
   * Cuántos metros de mundo caben de lado a lado con el alcance de ahora.
   *
   * En el alcance más ancho, **si el avión se ha ido fuera del escenario, el
   * mapa se estira hasta alcanzarlo**. El mundo del juego mide dieciocho o
   * veintidós kilómetros y con las teselas se puede volar mucho más lejos: sin
   * esto, quien sale a mar abierto ve un cuadrado con la flecha pegada a un
   * borde y no sabe si le queda cerca o lejos.
   */
  private metrosPorLado(): number {
    const base = (this.escenario?.size ?? 1) * ALCANCES[this.alcance]!;
    if (this.alcance > 0) return base;
    const lejos = Math.max(Math.abs(this.avionX), Math.abs(this.avionZ)) * 2.3;
    return Math.max(base, lejos);
  }

  /** El centro del encuadre: el escenario de lejos, el avión de cerca. */
  private centro(): readonly [number, number] {
    return this.alcance === 0 ? [0, 0] : [this.avionX, this.avionZ];
  }

  private pintarFondo(): void {
    const esc = this.escenario;
    const cota = this.cota;
    if (!this.fondo || !esc || !cota) return;
    const g = this.fondo.getContext('2d');
    if (!g) return;

    const lado = this.metrosPorLado();
    const [cx, cz] = this.centro();
    const escala = LADO / lado;
    const paso = lado / MUESTRAS;
    const px = LADO / MUESTRAS;

    // ── El relieve ──────────────────────────────────────────────────────
    //
    // Con la misma paleta que el terreno del juego, que es lo que hace que el
    // mapa y lo que se ve por la ventanilla sean el mismo sitio. Una paleta
    // de mapa distinta obliga a traducir, y traducir es justo lo que no puede
    // hacer quien no lee.
    for (let fila = 0; fila < MUESTRAS; fila++) {
      for (let col = 0; col < MUESTRAS; col++) {
        const x = cx - lado / 2 + (col + 0.5) * paso;
        const z = cz - lado / 2 + (fila + 0.5) * paso;
        /*
         * **Fuera del escenario, mar.**
         *
         * El mapa de alturas solo cubre el mundo del juego, y consultarlo fuera
         * devuelve el borde repetido: al estirar el mapa para alcanzar a quien
         * se ha ido volando, alrededor aparecía una franja con el color de la
         * última fila de terreno, como si la isla se prolongara. Los dos
         * aeródromos están junto al agua y lo que hay más allá es agua; el día
         * que haya uno de interior, esto se cambia por lo que corresponda.
         */
        const dentro = Math.abs(x) <= esc.size / 2 && Math.abs(z) <= esc.size / 2;
        const h = dentro ? cota(x, z) : esc.waterLevel;
        g.fillStyle = h <= esc.waterLevel ? colorHex(esc.water) : colorDeCota(esc, h);
        g.fillRect(col * px, fila * px, px + 1, px + 1);
      }
    }

    // ── La ciudad ───────────────────────────────────────────────────────
    const ciudad = esc.ciudad;
    if (ciudad) {
      const celdas = ciudad.rejilla.lado;
      // La celda mide lo mismo en metros pase lo que pase; lo que cambia es
      // cuántos píxeles ocupa.
      const metrosPorCelda = ciudad.tamanoM / celdas;
      const cp = metrosPorCelda * escala;
      for (let fila = 0; fila < celdas; fila++) {
        for (let col = 0; col < celdas; col++) {
          const c = ciudad.rejilla.clase[fila * celdas + col]!;
          if (!c) continue;
          const d = ciudad.rejilla.densidad[fila * celdas + col]! / 255;
          // Del fichero al mundo: la fila crece al norte y la Z al sur.
          const mx = -ciudad.tamanoM / 2 + col * metrosPorCelda;
          const mz = ciudad.tamanoM / 2 - (fila + 1) * metrosPorCelda;
          const qx = LADO / 2 + (mx - cx) * escala;
          const qy = LADO / 2 + (mz - cz) * escala;
          if (qx < -cp || qy < -cp || qx > LADO || qy > LADO) continue;
          g.globalAlpha = 0.3 + d * 0.55;
          g.fillStyle = c === 3 ? '#8e8577' : c === 2 ? '#9aa09a' : '#c3b394';
          g.fillRect(qx, qy, cp + 1, cp + 1);
        }
      }
      g.globalAlpha = 1;

      // ── Las carreteras ────────────────────────────────────────────────
      g.strokeStyle = '#5a5a5e';
      g.lineCap = 'round';
      for (const via of ciudad.vias) {
        g.lineWidth = via.nivel <= 1 ? 1.8 : via.nivel === 2 ? 1.3 : 0.8;
        g.beginPath();
        via.puntos.forEach((p, i) => {
          const qx = LADO / 2 + (p[0]! - cx) * escala;
          const qy = LADO / 2 + (-p[1]! - cz) * escala;
          if (i) g.lineTo(qx, qy);
          else g.moveTo(qx, qy);
        });
        g.stroke();
      }
    }

    /*
     * ── El aeropuerto, solo de cerca ────────────────────────────────────
     *
     * Plataformas y calles de rodaje. En el alcance ancho no se dibujan porque
     * a esa escala el aeropuerto entero mide cuatro píxeles y lo único que
     * aportarían es suciedad; de cerca son justo lo que se mira, porque son por
     * donde se va.
     */
    const aero = esc.aerodrome;
    if (aero && this.alcance >= 2) {
      const aMapa = (px: number, py: number): readonly [number, number] => [
        LADO / 2 + (px - cx) * escala,
        // El fichero tiene la Y al norte; el mundo, el norte en la Z negativa.
        LADO / 2 + (-py - cz) * escala,
      ];

      g.fillStyle = '#3f4442';
      for (const plat of aero.aprons ?? []) {
        if (plat.polygon.length < 3) continue;
        g.beginPath();
        plat.polygon.forEach((p, i) => {
          const [qx, qy] = aMapa(p[0]!, p[1]!);
          if (i) g.lineTo(qx, qy);
          else g.moveTo(qx, qy);
        });
        g.closePath();
        g.fill();
      }

      g.strokeStyle = '#3f4442';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (const calle of aero.taxiways ?? []) {
        if (calle.path.length < 2) continue;
        g.lineWidth = Math.max(2, (calle.widthM ?? 23) * escala);
        g.beginPath();
        calle.path.forEach((p, i) => {
          const [qx, qy] = aMapa(p[0]!, p[1]!);
          if (i) g.lineTo(qx, qy);
          else g.moveTo(qx, qy);
        });
        g.stroke();
      }

      // El eje amarillo por encima, que es la marca que se sigue rodando.
      g.strokeStyle = '#c99b3a';
      for (const calle of aero.taxiways ?? []) {
        if (calle.path.length < 2) continue;
        g.lineWidth = Math.max(0.8, 1.6 * escala * 10);
        g.beginPath();
        calle.path.forEach((p, i) => {
          const [qx, qy] = aMapa(p[0]!, p[1]!);
          if (i) g.lineTo(qx, qy);
          else g.moveTo(qx, qy);
        });
        g.stroke();
      }
    }

    // ── La pista, que es lo que hay que encontrar ───────────────────────
    //
    // Se dibuja la última y en blanco: cuando uno mira este mapa es porque no
    // sabe dónde está, y lo que busca casi siempre es por dónde se vuelve.
    const media = esc.runway.length / 2;
    const a = puntoDePista(esc.runway, media);
    const b = puntoDePista(esc.runway, -media);
    g.strokeStyle = '#1d1b19';
    g.lineWidth = Math.max(5, 5 * (LADO / this.metrosPorLado()) * 4);
    g.lineCap = 'butt';
    g.beginPath();
    g.moveTo(LADO / 2 + (a[0] - cx) * escala, LADO / 2 + (a[1] - cz) * escala);
    g.lineTo(LADO / 2 + (b[0] - cx) * escala, LADO / 2 + (b[1] - cz) * escala);
    g.stroke();
    g.strokeStyle = '#f4efe6';
    g.lineWidth = Math.max(2.6, 2.6 * (LADO / this.metrosPorLado()) * 4);
    g.stroke();
  }
}

const colorHex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** El color que le toca a una cota, con las mismas bandas que el terreno. */
function colorDeCota(esc: Scenario, h: number): string {
  let color = esc.fill;
  for (const banda of esc.bands) if (h >= banda.from) color = banda.colour;
  return colorHex(color);
}
