/**
 * **El avión de la tarjeta, en 3D y en su propio lienzo.**
 *
 * Es un segundo dibujo encima del juego, y por eso tiene tres reglas que no
 * se discuten (regla sexta de AGENTS.md: 60 fps en una tablet de gama media):
 *
 * 1. **Solo mientras se ve.** Con la tarjeta cerrada, o la pestaña en otra
 *    parte, no se pide ni un fotograma: `ver(false)` corta el bucle y no se
 *    vuelve a pintar hasta `ver(true)`. Lo comprueba `visor-del-avion.test.ts`.
 * 2. **Solo cuando cambia algo.** Un avión quieto no se repinta: se pinta al
 *    girarlo, al mover un mando en vivo, mientras da la vuelta solo —a treinta
 *    por segundo, que para un giro lento sobra— y mientras parpadea una luz.
 * 3. **A poca resolución.** Un píxel de lienzo por píxel de pantalla como
 *    mucho, y nunca más de 640 de lado: en un teléfono de densidad tres es la
 *    novena parte de los píxeles que pintaría a resolución entera, y a ese
 *    tamaño no se nota.
 *
 * Va en su propio lienzo y con su propio contexto, no en el del juego: el
 * hangar se abre antes de que exista el juego, y «un solo componente para el
 * hangar y el cuadro» quiere decir el mismo en los dos. Dentro del vuelo
 * cuesta subir el modelo una vez más a la tarjeta gráfica, y eso es lo que
 * mide `verificar-rendimiento.mjs` con la tarjeta abierta y cerrada.
 */

import {
  Box3,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import type { ModeloDeLaTarjeta } from "../world/modelo-de-la-tarjeta";
import type { PiezaDelAvion } from "../world/puntos-del-avion";
import { deNoche, type Encendidas } from "../world/luces-del-trafico";

/** Lo que el visor necesita de un pintor. El de verdad es `WebGLRenderer`. */
export interface Pintor {
  setPixelRatio(r: number): void;
  setSize(ancho: number, alto: number, estilo?: boolean): void;
  render(escena: Scene, camara: PerspectiveCamera): void;
  dispose(): void;
}

/** De dónde salen los fotogramas. El de verdad es `requestAnimationFrame`. */
export interface Fotogramas {
  pedir(f: (t: number) => void): number;
  soltar(id: number): void;
}

const DEL_NAVEGADOR: Fotogramas = {
  pedir: (f) => requestAnimationFrame(f),
  soltar: (id) => cancelAnimationFrame(id),
};

/** Lo más que mide el lienzo por su lado largo, en píxeles. */
export const LADO_MAXIMO = 640;

/** A cuántos fotogramas por segundo se pinta mientras da la vuelta solo. */
const SOLO_A = 30;

/** Cuánto gira solo, rad/s. Una vuelta en cuarenta segundos: se mira, no marea. */
const GIRO_SOLO = (2 * Math.PI) / 40;

/** Cuánto espera quieto después de tocarlo antes de volver a girar solo, ms. */
const ESPERA_A_GIRAR = 4000;

/** El estado del avión de verdad, para la tarjeta en vivo. Ver `enVivo`. */
export interface EnVivo {
  /** El tren, de 0 dentro a 1 fuera. */
  readonly tren: number;
  /** Los flaps, de 0 recogidos a 1 abajo del todo. */
  readonly flaps: number;
  readonly aerofrenos: number;
  readonly frenosDeTierra: number;
  /** El giro de las hélices, rad, y cuánto se ven como disco, de 0 a 1. */
  readonly helice: number;
  readonly disco: number;
  /** La carga, en g, y si está en el suelo: para el ala que se dobla. */
  readonly carga: number;
  readonly enTierra: boolean;
}

/** Un punto ya proyectado, en píxeles CSS desde la esquina del lienzo. */
export interface PuntoEnPantalla {
  readonly pieza: PiezaDelAvion;
  readonly x: number;
  readonly y: number;
  /** Si queda detrás del avión visto desde aquí. */
  readonly detras: boolean;
}

/**
 * **Lo que se pone al lado para comparar**: una persona, un colectivo y una
 * casa, con sus medidas de verdad.
 *
 * Enrique lo aceptó así: «el tamaño comparado, junto a un colectivo, una casa
 * o una persona». Un número en metros no le dice nada a quien tiene cinco
 * años; un colectivo al lado de un ala, sí. Las medidas: una persona de 1,7 m;
 * un colectivo urbano de 12 m de largo, 2,5 de ancho y 3,2 de alto, que es el
 * de cualquier ciudad; y una casa de una planta de 8 por 6 con su tejado, unos
 * cinco metros hasta el caballete.
 */
export const COMPARACION = {
  persona: { alto: 1.7 },
  colectivo: { largo: 12, ancho: 2.5, alto: 3.2 },
  casa: { ancho: 8, fondo: 6, pared: 3, tejado: 2 },
} as const;

function comparacion(): Group {
  const g = new Group();
  g.name = "comparacion";
  const piel = new MeshLambertMaterial({ color: 0xd9a066 });
  const ropa = new MeshLambertMaterial({ color: 0x2f5243 });
  const amarillo = new MeshLambertMaterial({ color: 0xe8b13a });
  const cristal = new MeshLambertMaterial({ color: 0x1b262d });
  const pared = new MeshLambertMaterial({ color: 0xe4e2da });
  const teja = new MeshLambertMaterial({ color: 0xbe5d38 });

  const persona = new Group();
  persona.name = "persona";
  const p = COMPARACION.persona.alto;
  const cuerpo = new Mesh(new CylinderGeometry(0.2, 0.18, p * 0.82, 10), ropa);
  cuerpo.position.y = p * 0.41;
  const cabeza = new Mesh(new SphereGeometry(0.13, 12, 8), piel);
  cabeza.position.y = p - 0.13;
  persona.add(cuerpo, cabeza);

  const c = COMPARACION.colectivo;
  const colectivo = new Group();
  colectivo.name = "colectivo";
  const caja = new Mesh(new BoxGeometry(c.ancho, c.alto - 0.4, c.largo), amarillo);
  caja.position.y = 0.4 + (c.alto - 0.4) / 2;
  const ventanas = new Mesh(new BoxGeometry(c.ancho + 0.04, 0.9, c.largo - 1.4), cristal);
  ventanas.position.set(0, c.alto - 1.1, 0.2);
  const ruedas = new Mesh(new BoxGeometry(c.ancho + 0.1, 0.8, c.largo * 0.6), cristal);
  ruedas.position.y = 0.4;
  colectivo.add(caja, ventanas, ruedas);

  const k = COMPARACION.casa;
  const casa = new Group();
  casa.name = "casa";
  const muros = new Mesh(new BoxGeometry(k.ancho, k.pared, k.fondo), pared);
  muros.position.y = k.pared / 2;
  // El tejado a dos aguas: un prisma de tres caras, tumbado a lo largo.
  const tejado = new Mesh(new ConeGeometry(k.fondo * 0.62, k.tejado, 4, 1), teja);
  tejado.scale.set(k.ancho / k.fondo, 1, 1);
  tejado.rotation.y = Math.PI / 4;
  tejado.position.y = k.pared + k.tejado / 2;
  casa.add(muros, tejado);

  g.add(persona, colectivo, casa);
  return g;
}

/**
 * Coloca lo de comparar **delante del morro**, en el suelo y en fila de menor
 * a mayor: la persona, el colectivo a lo largo y la casa. Delante y no al
 * lado, porque se mira de lado: así quedan en el mismo plano que el avión y
 * no se tapan, y el largo del colectivo se compara con el del fuselaje.
 */
function colocarComparacion(g: Group, caja: Box3): void {
  const suelo = caja.min.y;
  const [persona, colectivo, casa] = g.children;
  const c = COMPARACION.colectivo;
  const k = COMPARACION.casa;
  const morro = caja.min.z;
  persona?.position.set(0, suelo, morro - 2.5);
  colectivo?.position.set(0, suelo, morro - 4.5 - c.largo / 2);
  casa?.position.set(0, suelo, morro - 7 - c.largo - k.ancho / 2);
  // La casa con el frente hacia la cámara, que mira de lado.
  if (casa) casa.rotation.y = Math.PI / 2;
}

/** Lo que hace falta para crear el visor: el lienzo, y para las pruebas, el resto. */
export interface OpcionesDelVisor {
  readonly lienzo: HTMLCanvasElement;
  readonly pintor?: Pintor;
  readonly fotogramas?: Fotogramas;
  /** Cada vez que pinta: dónde han caído los puntos. */
  readonly alPintar?: (puntos: readonly PuntoEnPantalla[]) => void;
  /**
   * Si da la vuelta solo cuando nadie lo toca.
   *
   * En el hangar sí: es un escaparate y no hay nada más que pintar. En el
   * vuelo no: allí ya se pinta el mundo entero, y un avión quieto en la
   * tarjeta no cuesta nada mientras no se toque ni cambie un mando.
   */
  readonly giraSolo?: boolean;
}

export class VisorDelAvion {
  readonly escena = new Scene();
  readonly camara = new PerspectiveCamera(30, 1.6, 0.5, 4000);
  private readonly lienzo: HTMLCanvasElement;
  private pintorPuesto: Pintor | null;
  private readonly fotogramas: Fotogramas;
  private readonly alPintar?: (puntos: readonly PuntoEnPantalla[]) => void;
  private modelo: ModeloDeLaTarjeta | null = null;
  private readonly comparar = comparacion();
  private caja = new Box3(new Vector3(-5, -1, -5), new Vector3(5, 2, 5));

  /** Dónde mira: rumbo alrededor del avión y altura, en radianes. */
  private rumbo = -2.35;
  private altura = 0.32;
  private giroLibre = 0;
  private alto = 0;
  private ancho = 0;

  private viendo = false;
  private id = 0;
  private sucio = true;
  private ultimo = -Infinity;
  private antes = -Infinity;
  private tocado = -Infinity;
  private arrastrando = false;
  /** Si no gira solo: con un globo abierto, o en el vuelo. Ver `giraSolo`. */
  quieto = false;
  private readonly giraSolo: boolean;
  /** Cuántas veces ha pintado. Lo miran la prueba y el banco. */
  pintadas = 0;
  private encendidas: Encendidas = {
    navegacion: true,
    baliza: false,
    estroboscopicas: false,
    rodaje: false,
    aterrizaje: false,
  };
  private relojDeLuces = 0;

  constructor(o: OpcionesDelVisor) {
    this.lienzo = o.lienzo;
    this.pintorPuesto = o.pintor ?? null;
    this.fotogramas = o.fotogramas ?? DEL_NAVEGADOR;
    this.alPintar = o.alPintar;
    this.giraSolo = o.giraSolo ?? true;
    this.escena.background = new Color(0x15201b);
    /*
     * La luz de un estudio, no la del día: el avión se ve igual de noche que
     * a mediodía. El cielo azulado arriba y el suelo cálido abajo, y un sol
     * de lado que marca las formas.
     */
    this.escena.add(new HemisphereLight(0xd4e6f4, 0x6b5a44, 1.25));
    const sol = new DirectionalLight(0xfff1da, 2.4);
    sol.position.set(-40, 60, -30);
    this.escena.add(sol);
    this.comparar.visible = false;
    this.escena.add(this.comparar);
  }

  /** El pintor, creado la primera vez que hace falta y no antes. */
  private pintor(): Pintor | null {
    if (this.pintorPuesto) return this.pintorPuesto;
    try {
      const r = new WebGLRenderer({
        canvas: this.lienzo,
        antialias: true,
        powerPreference: "low-power",
      });
      this.pintorPuesto = r;
      // Y medir de nuevo, que la medida de antes no llegó a ningún pintor.
      this.ancho = 0;
      this.medir();
    } catch {
      // Sin WebGL se queda el retrato, que es lo que había.
      return null;
    }
    return this.pintorPuesto;
  }

  /** El avión que se enseña, o ninguno. */
  ponerModelo(m: ModeloDeLaTarjeta | null): void {
    if (this.modelo) this.escena.remove(this.modelo.grupo);
    this.modelo = m;
    if (m) {
      this.escena.add(m.grupo);
      m.grupo.updateWorldMatrix(true, true);
      this.caja = new Box3().setFromObject(m.grupo);
      colocarComparacion(this.comparar, this.caja);
      m.luces.paso(0, this.encendidas);
    }
    this.marcar();
  }

  /** Si se ve. Sin verse no hay bucle: ni un fotograma. */
  ver(si: boolean): void {
    if (si === this.viendo) return;
    this.viendo = si;
    if (!si) {
      if (this.id) this.fotogramas.soltar(this.id);
      this.id = 0;
      return;
    }
    this.antes = -Infinity;
    this.marcar();
  }

  get seVe(): boolean {
    return this.viendo;
  }

  /** Algo cambió: hay que pintar otra vez. Pide fotograma si no hay ninguno pedido. */
  marcar(): void {
    this.sucio = true;
    if (this.viendo && !this.id) this.id = this.fotogramas.pedir(this.bucle);
  }

  /** El lienzo cambió de tamaño. */
  medir(): void {
    const ancho = Math.max(1, this.lienzo.clientWidth);
    const alto = Math.max(1, this.lienzo.clientHeight);
    if (ancho === this.ancho && alto === this.alto) return;
    this.ancho = ancho;
    this.alto = alto;
    const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
    const razon = Math.min(1, dpr, LADO_MAXIMO / Math.max(ancho, alto));
    this.pintorPuesto?.setPixelRatio(razon);
    this.pintorPuesto?.setSize(ancho, alto, false);
    this.camara.aspect = ancho / alto;
    this.camara.updateProjectionMatrix();
    this.marcar();
  }

  /** Girarlo con el dedo o el ratón: píxeles de arrastre. */
  girar(dx: number, dy: number): void {
    this.rumbo -= dx * 0.008;
    this.altura = Math.max(-0.35, Math.min(1.25, this.altura + dy * 0.006));
    this.giroLibre = -dx * 0.008 * 60;
    this.tocado = performance.now();
    this.marcar();
  }

  /** Si hay un dedo encima: mientras lo hay, no gira solo ni se frena. */
  agarrar(si: boolean): void {
    this.arrastrando = si;
    this.tocado = performance.now();
    if (!si) this.marcar();
  }

  /** Mirarlo desde un sitio: lo usa el tamaño comparado, que se ve mejor de lado. */
  mirarDesde(rumbo: number, altura: number): void {
    this.rumbo = rumbo;
    this.altura = altura;
    this.giroLibre = 0;
    this.tocado = performance.now();
    this.marcar();
  }

  /** Enseña o esconde lo de comparar. */
  compararTamano(si: boolean): void {
    this.comparar.visible = si;
    this.marcar();
  }

  get comparando(): boolean {
    return this.comparar.visible;
  }

  /** Las luces que se encienden desde la tarjeta. */
  ponerLuces(e: Partial<Encendidas>): void {
    this.encendidas = { ...this.encendidas, ...e };
    this.modelo?.luces.paso(this.relojDeLuces, this.encendidas);
    this.marcar();
  }

  get luces(): Encendidas {
    return this.encendidas;
  }

  /**
   * **La tarjeta en vivo**: el avión de verdad, copiado en el de la tarjeta.
   *
   * Lo que se mueve en el avión que se vuela se mueve aquí: el tren baja, los
   * flaps salen, los aerofrenos suben y las hélices giran. Solo se repinta si
   * algo cambió de verdad; un avión en crucero con todo quieto no cuesta nada.
   */
  private vivo: EnVivo | null = null;
  enVivo(e: EnVivo, dt: number): void {
    const m = this.modelo;
    if (!m || !this.viendo) return;
    const a = this.vivo;
    /*
     * **La hélice solo cuenta si se ve girar.** Un reactor no tiene, y una
     * hélice deprisa es un disco: dibujarla otra vez porque su ángulo cambió
     * es pintar treinta veces por segundo lo mismo. Con el motor al ralentí
     * sí se ven las palas, y entonces sí.
     */
    const palas = m.helices.length > 0 && e.disco < 0.9;
    const cambia =
      !a ||
      Math.abs(a.tren - e.tren) > 1e-3 ||
      Math.abs(a.flaps - e.flaps) > 1e-3 ||
      Math.abs(a.aerofrenos - e.aerofrenos) > 1e-3 ||
      Math.abs(a.frenosDeTierra - e.frenosDeTierra) > 1e-3 ||
      (palas && Math.abs(a.helice - e.helice) > 1e-3) ||
      (m.helices.length > 0 && (a.disco > 0.01) !== (e.disco > 0.01)) ||
      (!!m.ala && Math.abs(a.carga - e.carga) > 0.02);
    this.vivo = e;
    m.ala?.paso(dt, e.carga, e.enTierra);
    if (!cambia) return;
    m.patas?.poner(e.tren);
    m.flaps?.poner(e.flaps);
    m.aerofrenos?.poner(e.aerofrenos, e.frenosDeTierra);
    m.borrarHelices?.(e.disco);
    for (const h of m.helices) h.rotation.z = e.helice;
    this.marcar();
  }

  /** Lo que tiene que encuadrar: el avión, y lo de comparar si está puesto. */
  private encuadre(): Box3 {
    const caja = this.caja.clone();
    if (this.comparar.visible) caja.expandByObject(this.comparar);
    return caja;
  }

  /**
   * **A qué distancia se pone la cámara**: la justa para que quepa el avión
   * dé la vuelta que dé.
   *
   * La esfera que envuelve la caja dejaba el avión en un tercio del visor: un
   * avión es plano, y la esfera lo trata como si fuera tan alto como ancho. Lo
   * que de verdad ocupa al girar es, a lo ancho, la diagonal de la caja vista
   * desde arriba —es lo más ancho que se ve desde cualquier lado— y a lo alto,
   * su alto más lo que asoma esa diagonal al mirarlo un poco desde arriba. Con
   * eso no «respira» al girar, y llena el visor.
   */
  private distanciaPara(caja: Box3): number {
    const tam = caja.getSize(this.v);
    const radio = Math.hypot(tam.x, tam.z) / 2;
    const tanV = Math.tan((this.camara.fov * Math.PI) / 360);
    const tanH = tanV * this.camara.aspect;
    const alto = tam.y * Math.cos(this.altura) + 2 * radio * Math.abs(Math.sin(this.altura));
    return Math.max(radio / tanH, alto / 2 / tanV) * 1.12 + radio * 0.35;
  }

  private colocarCamara(): void {
    const caja = this.encuadre();
    const distancia = this.distanciaPara(caja);
    const esfera = caja.getBoundingSphere(new Sphere());
    const c = esfera.center;
    this.camara.position.set(
      c.x + Math.sin(this.rumbo) * Math.cos(this.altura) * distancia,
      c.y + Math.sin(this.altura) * distancia,
      c.z + Math.cos(this.rumbo) * Math.cos(this.altura) * distancia,
    );
    this.camara.near = Math.max(0.1, distancia - esfera.radius * 1.5);
    this.camara.far = distancia + esfera.radius * 2;
    this.camara.updateProjectionMatrix();
    this.camara.lookAt(c);
    this.camara.updateMatrixWorld();
  }

  private readonly bucle = (t: number): void => {
    this.id = 0;
    if (!this.viendo) return;
    const dt = Number.isFinite(this.antes) ? Math.min(0.1, (t - this.antes) / 1000) : 0;
    this.antes = t;
    // Lo que se mueve solo: la inercia del dedo, el giro lento y las luces.
    let moviendose = false;
    if (!this.arrastrando && Math.abs(this.giroLibre) > 0.01) {
      this.rumbo += this.giroLibre * dt;
      this.giroLibre *= Math.exp(-dt * 3);
      moviendose = true;
    } else if (!this.arrastrando && this.giraSolo && !this.quieto && performance.now() - this.tocado > ESPERA_A_GIRAR) {
      this.rumbo += GIRO_SOLO * dt;
      moviendose = true;
    }
    const parpadea = this.encendidas.baliza || this.encendidas.estroboscopicas;
    if (parpadea && this.modelo) {
      this.relojDeLuces += dt;
      this.modelo.luces.paso(this.relojDeLuces, this.encendidas);
      moviendose = true;
    }
    const aSuRitmo = this.arrastrando || t - this.ultimo >= 1000 / SOLO_A - 2;
    if ((this.sucio || moviendose) && aSuRitmo) this.pintar(t);
    if (this.sucio || moviendose || this.arrastrando)
      this.id = this.fotogramas.pedir(this.bucle);
  };

  private readonly v = new Vector3();
  private readonly centro = new Vector3();

  private pintar(t: number): void {
    const pintor = this.pintor();
    this.sucio = false;
    this.ultimo = t;
    if (!pintor) return;
    this.colocarCamara();
    this.modelo?.ala?.antesDePintar(this.camara);
    deNoche(() => pintor.render(this.escena, this.camara));
    this.pintadas += 1;
    if (this.alPintar && this.modelo) this.alPintar(this.proyectar());
  }

  /**
   * Dónde cae cada punto en el lienzo, en el lado que se ve.
   *
   * «Detrás» se mide en profundidad de la vista, no en la del dibujo, que no
   * es lineal: un punto más lejos que el centro del avión una séptima parte
   * de su tamaño está al otro lado del fuselaje.
   */
  proyectar(): PuntoEnPantalla[] {
    const m = this.modelo;
    if (!m) return [];
    const esfera = this.caja.getBoundingSphere(new Sphere());
    const derecha = this.camara.position.x > esfera.center.x;
    const vista = this.camara.matrixWorldInverse;
    const fondo = -this.centro.copy(esfera.center).applyMatrix4(vista).z;
    const margen = esfera.radius * 0.15;
    const ancho = this.ancho;
    const alto = this.alto;
    return m.puntos.map((p) => {
      this.v.copy(p.donde);
      if (p.espejo && derecha) this.v.x = -this.v.x;
      this.v.applyMatrix4(vista);
      const lejos = -this.v.z;
      this.v.applyMatrix4(this.camara.projectionMatrix);
      return {
        pieza: p.pieza,
        x: ((this.v.x + 1) / 2) * ancho,
        y: ((1 - this.v.y) / 2) * alto,
        detras: lejos > fondo + margen,
      };
    });
  }

  /** Suelta el contexto. La tarjeta lo hace al cambiar de avión o al irse. */
  soltar(): void {
    this.ver(false);
    if (this.modelo) this.escena.remove(this.modelo.grupo);
    this.modelo = null;
    this.pintorPuesto?.dispose();
    (this.pintorPuesto as WebGLRenderer | null)?.forceContextLoss?.();
    this.pintorPuesto = null;
  }
}
