/**
 * El plan de vuelo: por dónde toca ir ahora y cómo se ve.
 *
 * Junta tres cosas que por separado no sirven de nada: el grafo del aeropuerto
 * —que sabe por dónde se va—, la máquina de fases —que sabe qué toca ahora— y
 * la pintura de la ruta —que es lo único de todo esto que ve quien juega.
 *
 * **La ruta se pinta en el suelo, no se cuenta.** Una flecha en el HUD o una
 * frase con la letra de la calle no le sirven a alguien de cuatro años. Una
 * raya de color en el asfalto que va desde las ruedas hasta donde hay que
 * llegar, sí: es la misma idea que el «follow me» de los aeropuertos de verdad,
 * el coche que sale delante del avión con un cartel.
 *
 * La existencia de este fichero es a propósito: `game.ts` ya tiene ochocientas
 * líneas y todo esto es una cosa sola con vida propia. Lo que `game.ts` ve son
 * cinco métodos.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  RingGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Aerodrome, Punto } from './aerodrome';
import { aLaPolilinea } from './aerodrome';
import { construirGrafo, rodajeEntre, type Grafo, type Ruta } from './rodaje';
import { delante, enEjesDePista } from './rumbo';
import { GUION, Vuelo, type Fase, type Paso, type Situacion } from '../flight/vuelo';
import type { FlightState } from '../flight/model';

/**
 * Ancho de la raya que marca la ruta, m.
 *
 * Uno y medio. Con cuatro parecía un río verde de orilla a orilla de la calle;
 * con dos **tapaba las letras pintadas en el asfalto**, que son justo lo que
 * hay que aprender a leer ahí: «la línea a seguir es gruesa y tapa las marcas
 * de la pista (las letras) y creo que eso es un elemento que el jugador debe
 * ver». Tiene razón: la ayuda no puede esconder la lección.
 */
const ANCHO = 1.5;

/**
 * Cuánto se levanta la raya sobre el **terreno**, m.
 *
 * Cuarenta y cinco centímetros: justo por encima del pavimento, que sobresale
 * treinta y cinco del terreno aplanado.
 *
 * **Lo que la mantiene visible no es la altura, es el desplazamiento de
 * polígono.** Separar cosas coplanares subiéndolas funciona de cerca y falla
 * de lejos: con el fondo de profundidad repartido entre sesenta centímetros y
 * veintidós kilómetros, a doscientos metros ya no distingue medio metro y las
 * superficies se pelean fotograma a fotograma. Es lo que se veía como «el
 * suelo tiembla y salen parches», y subir más la raya no lo arregla — solo la
 * despega del asfalto y la deja flotando.
 */
const ALTURA = 0.45;

/**
 * Los tres colores de la raya: **la línea de conducción**.
 *
 * Es el patrón de los juegos de coches —la *braking line* de Forza, la de Gran
 * Turismo— y contesta dos preguntas con una sola cosa: por dónde se va y a qué
 * velocidad. Verde donde se puede rodar, ámbar donde hay que aflojar, rojo
 * donde hay que parar.
 *
 * Sin esto, la raya era verde de punta a punta y quien la seguía no tenía
 * **ninguna** forma de saber si iba rápido o lento, ni que se acercaba a la
 * doble raya. Se lo preguntó la primera persona que jugó: «¿quién me indica si
 * voy muy rápido o lento en rodadura?». Nadie.
 *
 * No es el amarillo de rodadura: aquello es el aeropuerto y esto es tu ruta de
 * hoy. Confundirlos sería enseñar mal.
 */
const VERDE: readonly [number, number, number] = [0.325, 0.776, 0.42];
const AMBAR: readonly [number, number, number] = [0.91, 0.694, 0.23];
const ROJO: readonly [number, number, number] = [0.79, 0.29, 0.24];

/**
 * Velocidad de rodaje cómoda en recta, m/s. Unos cuarenta por hora.
 *
 * Un avión rueda en recta hasta a treinta nudos —cincuenta y cinco por hora—,
 * así que cuarenta es realista y no es un atajo. Con treinta, los dos
 * kilómetros de plataforma a cabecera de Silvio Pettirossi eran cuatro minutos
 * de reloj por cada sentido, y eso a un niño de cuatro años se le hace
 * eterno: «es mucho rato en rodadura salir y entrar, la verdad».
 *
 * La otra mitad del problema no se arregla con velocidad sino con viento: la
 * cabecera en uso la elige el viento, y en Silvio Pettirossi la contraria está
 * al lado de la plataforma. Eso está apuntado aparte.
 */
const CRUCERO = 11;

/** Deceleración cómoda, m/s². Con esto se calcula dónde hay que ir aflojando. */
const FRENADA = 0.9;

/** Por encima de esto respecto a lo que toca, se avisa de que se va rápido. */
const MARGEN = 1.6;

export interface Vista {
  readonly fase: Fase;
  readonly clave: string;
  readonly icono: string;
  readonly luzVerde: boolean;
  /** La letra de la calle por la que toca ir, si la hay. */
  readonly letra: string | null;
  /** A qué velocidad habría que ir aquí, m/s. */
  readonly velocidadSugerida: number;
  /** Va bastante más rápido de lo que toca. */
  readonly rapido: boolean;
  /** Metros que faltan para el final del tramo actual. */
  readonly restante: number;
  /**
   * Metros del avión a la raya verde.
   *
   * Se saca aquí porque **salirse de la ruta no cambia de fase pero sí cambia
   * lo que hay que decirte**: la máquina de estados no retrocede —eso hacía que
   * el tutor se contradijera cada dos segundos— y en cambio esto sí sirve para
   * avisar de que hay que volver a la línea.
   */
  readonly fuera: boolean;
  readonly cambio: boolean;
  /** Se acaba de entrar en la pista sin permiso. */
  readonly saltoLaLuz: boolean;
}

/** A cuántos metros de la raya verde se considera que uno se ha salido. */
const FUERA_DE_RUTA = 30;

export class PlanDeVuelo {
  readonly grupo = new Group();
  private readonly grafo: Grafo;
  private readonly vuelo = new Vuelo();
  private ruta: Ruta | null = null;
  /** La ruta en coordenadas de mundo, que es donde vive el avión. */
  private rutaMundo: Punto[] = [];

  constructor(
    private readonly aero: Aerodrome,
    private readonly pista: { x: number; z: number; heading: number; width: number },
    private readonly cota: (x: number, z: number) => number,
  ) {
    this.grupo.name = 'plan-de-vuelo';
    this.grafo = construirGrafo(aero);
  }

  /** Dónde empieza el vuelo: el puesto de estacionamiento, si lo hay. */
  arranque(): readonly [number, number] | null {
    const puesto = this.puestoDeSalida();
    return puesto ? [puesto.xy[0], -puesto.xy[1]] : null;
  }

  /**
   * El puesto del que se sale.
   *
   * El más cercano a la terminal si la hay, y si no el primero. No se elige al
   * azar: **el sitio del que se sale tiene que ser el mismo siempre**, porque
   * quien juega se lo aprende, y un aeropuerto que te cambia el puesto cada
   * partida no se aprende nunca.
   */
  private puestoDeSalida(): { ref: string | null; xy: Punto } | null {
    const puestos = this.aero.parkingPositions;
    if (!puestos?.length) return null;

    // **El más cercano a la cabecera de salida**, no el más cercano a la
    // terminal. Silvio Pettirossi tiene sesenta y dos puestos repartidos por
    // un kilómetro y medio de plataforma, y saliendo del que toca a la
    // terminal el rodaje eran quince minutos entre ir y volver: «es mucho rato
    // en rodadura salir y entrar, la verdad». Un aeropuerto de verdad asigna
    // el puesto por muchas cosas; un juego para prelectores lo asigna por que
    // se pueda jugar.
    //
    // Sigue siendo el mismo siempre, que es lo que importa: quien juega se
    // aprende su sitio, y un aeropuerto que te cambia el puesto cada partida
    // no se aprende nunca.
    const cabecera = this.cabeceraDeSalida();
    return [...puestos].sort(
      (a, b) =>
        Math.hypot(a.xy[0] - cabecera[0], a.xy[1] - cabecera[1]) -
        Math.hypot(b.xy[0] - cabecera[0], b.xy[1] - cabecera[1]),
    )[0]!;
  }

  /** La cabecera por la que se despega, en coordenadas de fichero. */
  private cabeceraDeSalida(): Punto {
    const [fx, fz] = delante(this.pista.heading);
    return [this.pista.x - fx * 1600, -(this.pista.z - fz * 1600)];
  }

  /**
   * El punto de espera por el que se sale a la pista.
   *
   * El más cercano a la cabecera de salida, que es a donde hay que ir: entrar
   * por el punto de espera del otro extremo significaría recorrer la pista
   * entera en sentido contrario, que es de las cosas que más asustan a una
   * torre.
   */
  private esperaDeSalida(): Punto | null {
    if (!this.aero.holdingPositions.length) return null;
    const cabecera = this.cabeceraDeSalida();
    return [...this.aero.holdingPositions].sort(
      (a, b) =>
        Math.hypot(a.xy[0] - cabecera[0], a.xy[1] - cabecera[1]) -
        Math.hypot(b.xy[0] - cabecera[0], b.xy[1] - cabecera[1]),
    )[0]!.xy;
  }

  /** Empieza un vuelo. Devuelve `false` si este aeródromo no da para rodar. */
  reiniciar(): boolean {
    const puesto = this.puestoDeSalida();
    const espera = this.esperaDeSalida();
    if (!puesto || !espera) {
      this.vuelo.reiniciar(true);
      this.destino = null;
      this.ponerRuta(null);
      return false;
    }
    this.vuelo.reiniciar(false);
    this.destino = 'espera';
    this.ultimaPos = puesto.xy;
    this.ponerRuta(rodajeEntre(this.grafo, puesto.xy, espera));
    return this.ruta !== null;
  }

  /**
   * El primer punto de la ruta que no es el propio puesto.
   *
   * Sirve para orientar el avión al aparecer: mirando a por donde tiene que
   * irse. Se salta los puntos pegados al morro porque el primero de la ruta
   * suele ser el nudo de al lado del puesto, y apuntar a un metro de distancia
   * da un rumbo cualquiera.
   */
  primerPaso(): readonly [number, number] | null {
    const inicio = this.rutaMundo[0];
    if (!inicio) return null;
    for (const p of this.rutaMundo) {
      if (Math.hypot(p[0] - inicio[0], p[1] - inicio[1]) > 25) return p;
    }
    return this.rutaMundo[this.rutaMundo.length - 1] ?? null;
  }

  /**
   * ¿Toca repetir el aviso de que se ha salido de la raya?
   *
   * Con cuentagotas: cada seis segundos. Un aviso que se repite sin parar deja
   * de leerse y encima tapa los demás, que fue exactamente lo que pasó con la
   * alarma de pérdida.
   */
  private desdeElAviso = 99;

  avisarDeSalida(dt: number): boolean {
    this.desdeElAviso += dt;
    if (this.desdeElAviso < 6) return false;
    this.desdeElAviso = 0;
    return true;
  }

  /**
   * Cuánto alerón haría falta para volver a la raya, de −1 a 1.
   *
   * Es el *Smart Steering* de los juegos de conducción para niños. Devuelve el
   * mando que hace falta, no lo aplica: quién y cuánto lo aplica lo decide el
   * peldaño, que es donde vive esa escalera.
   *
   * Dos términos, como cualquier seguidor de línea que funcione:
   *
   * - **Cuánto te has desviado**, que dice hacia dónde hay que apuntar.
   * - **Cuánto te falta para apuntar ahí**, que es lo que evita que el avión
   *   serpentee cruzando la raya una y otra vez. Sin este segundo término el
   *   remedio es peor que la enfermedad, y ya lo aprendimos con el piloto de
   *   pruebas.
   *
   * Devuelve cero si no hay ruta, si se va en el aire o si se va demasiado
   * deprisa para estar rodando: en la carrera de despegue nadie debe empujar
   * el volante salvo quien pilota.
   */
  asistencia(estado: FlightState, sobreElSuelo: number): number {
    if (this.rutaMundo.length < 2) return 0;
    if (sobreElSuelo > 4 || estado.airspeed > 18) return 0;

    const p: Punto = [estado.position.x, estado.position.z];
    // El punto de la ruta más cercano, y hacia dónde va la raya allí.
    let mejor = Infinity;
    let cual = 0;
    for (let i = 0; i < this.rutaMundo.length; i++) {
      const d = Math.hypot(this.rutaMundo[i]![0] - p[0], this.rutaMundo[i]![1] - p[1]);
      if (d < mejor) {
        mejor = d;
        cual = i;
      }
    }
    // Se mira treinta metros por delante: apuntar al punto más cercano hace
    // que el avión persiga su propia sombra y no se estabilice nunca.
    let mira = this.rutaMundo[this.rutaMundo.length - 1]!;
    let acumulado = 0;
    for (let i = cual; i < this.rutaMundo.length - 1; i++) {
      acumulado += Math.hypot(
        this.rutaMundo[i + 1]![0] - this.rutaMundo[i]![0],
        this.rutaMundo[i + 1]![1] - this.rutaMundo[i]![1],
      );
      if (acumulado > 30) {
        mira = this.rutaMundo[i + 1]!;
        break;
      }
    }

    const rumbo = ((estado.heading * 180) / Math.PI + 360) % 360;
    const quiero =
      ((Math.atan2(mira[0] - p[0], -(mira[1] - p[1])) * 180) / Math.PI + 360) % 360;
    const error = ((quiero - rumbo + 540) % 360) - 180;
    const giro = error / 22 - ((estado.yawRate * 180) / Math.PI) / 40;
    return Math.max(-1, Math.min(1, giro));
  }

  /** La ruta en coordenadas de mundo. Para las herramientas de comprobación. */
  rutaVisible(): readonly Punto[] {
    return this.rutaMundo;
  }

  /** Avanza un fotograma y dice qué hay que enseñar. */
  paso(estado: FlightState, sobreElSuelo: number, motor: boolean, dt: number): Vista {
    const s = this.situacion(estado, sobreElSuelo, motor);
    const p: Paso = this.vuelo.paso(s, dt);
    const sugerida = this.velocidadAqui([estado.position.x, estado.position.z]);

    if (p.cambio) this.alCambiarDeFase(p.fase);

    return {
      fase: p.fase,
      clave: GUION[p.fase].clave,
      icono: GUION[p.fase].icono,
      luzVerde: p.luzVerde,
      letra: this.letraActual(estado),
      velocidadSugerida: sugerida,
      // **Y no se avisa junto a la doble raya.** Ahí la velocidad que toca baja
      // hasta cero, así que cualquier movimiento pasaba de sobra el margen y el
      // juego pedía ir más despacio a quien ya estaba parando: «hay señales
      // para ayudarte a bajar velocidad (se pasa de lento)». Frenar para parar
      // no es ir rápido.
      rapido:
        sobreElSuelo < 3 &&
        this.rutaMundo.length > 1 &&
        sugerida > 3 &&
        estado.airspeed > sugerida * MARGEN + 2,
      restante: s.restante,
      // Solo se avisa **mientras se rueda**. Antes de arrancar nadie se ha
      // salido de nada, y decírselo a quien todavía no se ha movido es ruido.
      saltoLaLuz: p.saltoLaLuz,
      fuera:
        (p.fase === 'rodando' || p.fase === 'a-plataforma') &&
        this.rutaMundo.length > 1 &&
        s.alaRuta > FUERA_DE_RUTA &&
        sobreElSuelo < 3,
      cambio: p.cambio,
    };
  }

  /**
   * A dónde hay que ir ahora, y por dónde.
   *
   * **Se recalcula por lo que hace falta, no por la fase que se acaba de
   * cruzar.** La primera versión ponía la ruta de vuelta en el instante en que
   * la fase pasaba a «a plataforma», y si esa fase no llegaba nunca —porque
   * alguien despegó en travesía y volvió por donde le pareció— no había ruta y
   * el juego se quedaba mudo.
   *
   * Ahora es como un GPS: cada vez que cambia el destino, se traza el camino
   * desde donde esté el avión. Da igual cómo haya llegado ahí.
   */
  private alCambiarDeFase(fase: Fase): void {
    // Volando no hay nada que rodar.
    if (fase === 'alineando' || fase === 'despegando' || fase === 'en-vuelo' || fase === 'final') {
      this.ponerRuta(null);
      this.destino = null;
      return;
    }

    const quiere: 'espera' | 'puesto' | null =
      fase === 'aterrizado' || fase === 'abandonando' || fase === 'a-plataforma'
        ? 'puesto'
        : fase === 'apagado' || fase === 'en-puesto'
          ? null
          : 'espera';

    if (quiere === this.destino) return;
    this.destino = quiere;
    if (quiere === null) {
      this.ponerRuta(null);
      return;
    }

    const meta = quiere === 'puesto' ? this.puestoDeSalida()?.xy : this.esperaDeSalida();
    if (!meta) {
      this.ponerRuta(null);
      return;
    }
    // Desde donde esté el avión, y con margen ancho: quien vuelve de volar
    // puede haber tomado tierra lejos de cualquier calle.
    this.ponerRuta(rodajeEntre(this.grafo, this.ultimaPos, meta, 600));
  }

  /** A dónde va ahora mismo. Sirve para no recalcular la misma ruta cada fase. */
  private destino: 'espera' | 'puesto' | null = null;

  private ultimaPos: Punto = [0, 0];

  private situacion(estado: FlightState, sobreElSuelo: number, motor: boolean): Situacion {
    const x = estado.position.x;
    const z = estado.position.z;
    this.ultimaPos = [x, -z];

    const { along, across } = enEjesDePista(x, z, this.pista.x, this.pista.z, this.pista.heading);
    const alEjeDePista = Math.abs(across);

    let alaRuta = 0;
    let restante = 0;
    if (this.rutaMundo.length > 1) {
      alaRuta = aLaPolilinea([x, z], this.rutaMundo);
      restante = this.restanteHasta([x, z]);
    }

    const rumbo = ((estado.heading * 180) / Math.PI + 360) % 360;
    let desalineado = rumbo - this.pista.heading;
    while (desalineado > 180) desalineado -= 360;
    while (desalineado < -180) desalineado += 360;

    return {
      estado,
      alaRuta,
      restante,
      alEjeDePista,
      alLargoDePista: along,
      enPista: alEjeDePista < this.pista.width / 2 + 3,
      sobreElSuelo,
      motor,
      desalineado,
    };
  }

  /**
   * A qué velocidad habría que ir en cada punto de la ruta, m/s.
   *
   * Dos cosas la bajan, y son las dos que hay de verdad rodando:
   *
   * - **Lo que falta hasta el final.** Se calcula hacia atrás desde la doble
   *   raya con una deceleración cómoda, que es la cuenta de toda la vida:
   *   `v = √(2·a·d)`. A cuarenta y cinco metros salen nueve por segundo, a
   *   diez salen cuatro, y en la raya, cero.
   * - **Lo cerrada que viene la curva.** El ángulo entre un tramo y el
   *   siguiente: una curva de noventa grados se toma a paso de peatón.
   *
   * Se calcula una vez, al trazar la ruta, y luego solo se consulta.
   */
  private velocidades: number[] = [];

  private calcularVelocidades(): void {
    const n = this.rutaMundo.length;
    this.velocidades = new Array<number>(n).fill(CRUCERO);
    if (n < 2) return;

    // Por curvatura: el ángulo que se gira en cada vértice.
    for (let i = 1; i < n - 1; i++) {
      const a = this.rutaMundo[i - 1]!;
      const b = this.rutaMundo[i]!;
      const c = this.rutaMundo[i + 1]!;
      const a1 = Math.atan2(b[0] - a[0], b[1] - a[1]);
      const a2 = Math.atan2(c[0] - b[0], c[1] - b[1]);
      const giro = Math.abs(((a2 - a1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      const grados = (giro * 180) / Math.PI;
      // Noventa grados → cuatro y medio por segundo. Recto → crucero.
      //
      // Cuatro y medio y no tres, porque tres cae en rojo y **una curva no es
      // una parada**: se veía la raya ponerse roja en cada codo de la
      // rodadura, que dice «pará» donde en realidad dice «aflojá». El rojo se
      // reserva para la doble raya.
      this.velocidades[i] = Math.max(4.5, CRUCERO * (1 - Math.min(1, grados / 90) * 0.62));
    }

    // Y hacia atrás desde el final, que es lo que hace que se vaya aflojando
    // antes de llegar en vez de frenar de golpe encima de la raya.
    this.velocidades[n - 1] = 0;
    let acumulado = 0;
    for (let i = n - 2; i >= 0; i--) {
      acumulado += Math.hypot(
        this.rutaMundo[i + 1]![0] - this.rutaMundo[i]![0],
        this.rutaMundo[i + 1]![1] - this.rutaMundo[i]![1],
      );
      const porLaParada = Math.sqrt(2 * FRENADA * acumulado);
      this.velocidades[i] = Math.min(this.velocidades[i]!, porLaParada);
    }
  }

  /** La velocidad que toca donde está el avión ahora. */
  private velocidadAqui(p: Punto): number {
    if (this.velocidades.length < 2) return CRUCERO;
    let mejor = Infinity;
    let cual = 0;
    for (let i = 0; i < this.rutaMundo.length; i++) {
      const d = Math.hypot(this.rutaMundo[i]![0] - p[0], this.rutaMundo[i]![1] - p[1]);
      if (d < mejor) {
        mejor = d;
        cual = i;
      }
    }
    return this.velocidades[cual] ?? CRUCERO;
  }

  /** Metros de ruta que quedan desde el punto más cercano al avión. */
  private restanteHasta(p: Punto): number {
    // Primero el total, y luego cuánto se lleva recorrido hasta el punto de la
    // ruta más cercano al avión. Restar. El primer intento hizo las dos cosas
    // en la misma pasada y salió una expresión que se cancelaba sola.
    let total = 0;
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      total += Math.hypot(
        this.rutaMundo[i + 1]![0] - this.rutaMundo[i]![0],
        this.rutaMundo[i + 1]![1] - this.rutaMundo[i]![1],
      );
    }

    let mejor = Infinity;
    let recorrido = 0;
    let acumulado = 0;
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      const a = this.rutaMundo[i]!;
      const b = this.rutaMundo[i + 1]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy || 1;
      const largo = Math.sqrt(l2);
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
      const d = Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
      if (d < mejor) {
        mejor = d;
        recorrido = acumulado + t * largo;
      }
      acumulado += largo;
    }
    return Math.max(0, total - recorrido);
  }

  /** La letra de la calle por la que toca ir ahora mismo. */
  private letraActual(estado: FlightState): string | null {
    if (!this.ruta || !this.ruta.tramos.length) return null;
    const p: Punto = [estado.position.x, estado.position.z];
    let mejor = Infinity;
    let letra: string | null = null;
    for (const tramo of this.ruta.tramos) {
      const mundo = tramo.puntos.map((q) => [q[0], -q[1]] as Punto);
      const d = aLaPolilinea(p, mundo);
      if (d < mejor) {
        mejor = d;
        letra = tramo.ref;
      }
    }
    return letra;
  }

  private ponerRuta(ruta: Ruta | null): void {
    this.ruta = ruta;
    this.rutaMundo = ruta ? ruta.puntos.map((p) => [p[0], -p[1]] as Punto) : [];
    this.calcularVelocidades();
    this.pintar();
  }

  /** Dibuja la ruta en el suelo, y una diana donde termina. */
  private pintar(): void {
    for (const hijo of [...this.grupo.children]) {
      this.grupo.remove(hijo);
      const m = hijo as Mesh;
      m.geometry?.dispose();
      (m.material as { dispose?: () => void })?.dispose?.();
    }
    if (this.rutaMundo.length < 2) return;

    /** De la velocidad que toca al color que se pinta. */
    const colorDe = (v: number): readonly [number, number, number] =>
      v < 3.5 ? ROJO : v < 7.5 ? AMBAR : VERDE;

    const piezas: BufferGeometry[] = [];
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      const [ax, az] = this.rutaMundo[i]!;
      const [bx, bz] = this.rutaMundo[i + 1]!;
      const largo = Math.hypot(bx - ax, bz - az);
      if (largo < 0.5) continue;
      const ux = (bx - ax) / largo;
      const uz = (bz - az) / largo;
      const px = (-uz * ANCHO) / 2;
      const pz = (ux * ANCHO) / 2;
      const esquinas: readonly [number, number][] = [
        [ax + px, az + pz],
        [bx + px, bz + pz],
        [bx - px, bz - pz],
        [ax - px, az - pz],
      ];
      const pos = new Float32Array(12);
      esquinas.forEach(([qx, qz], k) => {
        pos[k * 3] = qx;
        // La cota se muestrea en cada esquina y no una vez por tramo: sobre una
        // pista con pendiente, una raya plana se entierra por un extremo.
        pos[k * 3 + 1] = this.cota(qx, qz) + ALTURA;
        pos[k * 3 + 2] = qz;
      });

      // El color va **en los vértices**, no en el material: así la raya entera
      // sigue siendo una sola llamada de dibujo y a la vez cambia de color a lo
      // largo, que es de lo que se trata. Un tramo por color habría multiplicado
      // por tres las mallas.
      const cA = colorDe(this.velocidades[i] ?? CRUCERO);
      const cB = colorDe(this.velocidades[i + 1] ?? CRUCERO);
      const col = new Float32Array(12);
      [cA, cB, cB, cA].forEach(([r, g, b], k) => {
        col[k * 3] = r;
        col[k * 3 + 1] = g;
        col[k * 3 + 2] = b;
      });

      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new Float32BufferAttribute(col, 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      piezas.push(geo);
    }

    const fusionada = piezas.length ? mergeGeometries(piezas, false) : null;
    if (fusionada) {
      const malla = new Mesh(
        fusionada,
        new MeshLambertMaterial({
          vertexColors: true,
          // Gana siempre contra el asfalto, esté a la distancia que esté. Y con
          // menos prioridad que las letras del suelo: la ayuda va debajo de la
          // lección, no encima.
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        }),
      );
      malla.name = 'ruta';
      this.grupo.add(malla);
    }

    // La diana del final: un aro, que se ve de lejos y no tapa nada.
    const fin = this.rutaMundo[this.rutaMundo.length - 1]!;
    const aro = new Mesh(
      new RingGeometry(9, 12, 32),
      // La diana del final es roja: ahí se para.
      new MeshBasicMaterial({
        color: 0xc94a3d,
        transparent: true,
        opacity: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5,
      }),
    );
    aro.rotation.x = -Math.PI / 2;
    aro.position.set(fin[0], this.cota(fin[0], fin[1]) + ALTURA + 0.02, fin[1]);
    aro.name = 'diana';
    this.grupo.add(aro);
  }
}
