/**
 * Las dos pantallas de la cabina, encendidas.
 *
 * El modelo trae un G1000 con sus dos pantallas, y venían **en blanco**: dos
 * rectángulos de luz sin nada dentro en mitad del salpicadero. Quedaba peor
 * que si no estuvieran, porque un aparato apagado en un avión que vuela dice
 * que algo no funciona. «Estaría bien que en las pantallas se viera algo y
 * fuera activo y tuviera sentido con el modo de vuelo.»
 *
 * ## Qué se dibuja, y por qué eso
 *
 * Lo mismo que en un G1000 de verdad, en el mismo sitio: a la izquierda el
 * **horizonte** con la velocidad a un lado y la altura al otro; a la derecha,
 * la **rosa de rumbos** con la velocidad vertical. No es una elección
 * estética: es que quien se siente en esta cabina un día se va a sentar en
 * una de verdad y va a encontrar las cosas donde las dejó.
 *
 * Y se dibuja **grande**. Esto no se lee a un palmo como un panel de verdad:
 * se ve desde el asiento del piloto, a escala, en una pantalla de ordenador.
 * Números gordos, pocas rayas, y el horizonte ocupando lo que haga falta.
 *
 * ## Cómo se enchufa
 *
 * El modelo pinta las dos pantallas con el material `g1000_display` y las dos
 * comparten sus coordenadas de textura, que además no llegan a los bordes.
 * Así que al cargarlo se les **rehacen las coordenadas** —estirando las que
 * traía a todo el rectángulo, que conserva la orientación que quiso quien lo
 * dibujó— y se le da a cada una su propio lienzo. Sin eso, las dos enseñarían
 * lo mismo y recortado.
 */

import {
  Box3,
  CanvasTexture,
  LinearFilter,
  MeshBasicMaterial,
  Vector3,
  type Mesh,
} from "three";
import { PALETA } from "../ui/paleta";

/** Tamaño del lienzo de cada pantalla, en píxeles. */
const ANCHO = 512;
const ALTO = 384;

/** Cuántas veces por segundo se repinta. Ver `Pantallas.actualizar`. */
const POR_SEGUNDO = 12;

/*
 * Los colores salen de la paleta de la cabina, **la misma que el cuadro del
 * HUD**, y no de una lista propia.
 *
 * Tenían su propia lista —un cielo más apagado, un verde más claro, un ámbar
 * distinto— y eso rompe lo único que hace que esto se pueda aprender: que un
 * color signifique siempre lo mismo. Un niño que aprende «verde es que va
 * bien» mirando la pantalla de dentro de la cabina tiene que encontrarse el
 * mismo verde en el cuadro de abajo. Ver `ui/paleta.ts`.
 */
const CIELO = PALETA.cielo;
const TIERRA = PALETA.tierra;
const TINTA = PALETA.valor;
const VERDE = PALETA.normal;
/** El fondo de una pantalla de cristal, y el canal vacío de una cinta. */
const FONDO = PALETA.pantalla;
const CANAL = PALETA.esfera;
/** Me acerco al límite. */
const AMBAR = PALETA.precaucion;
/** Rótulo apagado: está, pero no es lo que se mira. */
const TENUE = PALETA.apagado;
/** El avioncito símbolo, que tiene que leerse sobre el cielo y sobre la tierra. */
const SIMBOLO = PALETA.simbolo;

export interface DatosDeCabina {
  /** Velocidad indicada, m/s. */
  readonly velocidad: number;
  /** Altura sobre el nivel del mar, m. */
  readonly altura: number;
  /** Velocidad vertical, m/s. */
  readonly vertical: number;
  /** Rumbo verdadero, radianes. */
  readonly rumbo: number;
  /**
   * Declinación magnética del sitio, grados.
   *
   * El número que se escribe es el **magnético**, igual que el del HUD. Sin
   * esto la cabina marcaba 290 mientras el HUD marcaba 300, y dos
   * instrumentos del mismo avión discrepando diez grados no son dos
   * instrumentos: son uno roto y otro sospechoso.
   */
  readonly declinacion: number;
  /** Cabeceo, radianes. Positivo, morro arriba. */
  readonly cabeceo: number;
  /** Alabeo, radianes. Positivo, ala derecha abajo. */
  readonly alabeo: number;
  /**
   * Cuánto da cada motor, de 0 a 1, y cómo se llama eso en esta cabina.
   *
   * Uno por motor y en su orden: el 1 es el de más a la izquierda. Es lo que
   * pinta el EICAS —ver `pintarMotores`—, y el rótulo sale de la ficha del
   * avión porque no es lo mismo: un pistón enseña vueltas, un turbohélice su
   * par y un turbofán el régimen del fan, que es con lo que se vuela de verdad.
   */
  readonly motores: readonly number[];
  readonly rotuloDeMotor: string;
  /** Flaps, 0 a 1. Van en el EICAS, debajo de los motores. */
  readonly flaps: number;
}

/**
 * Qué dibujo le toca a la pantalla número `i` de `cuantas`, de izquierda a
 * derecha.
 *
 * Con dos —una avioneta— es el G1000 de siempre: horizonte a la izquierda,
 * rumbos a la derecha.
 *
 * **Con cuatro es una cabina de dos pilotos**, y ahí no se repite el patrón: en
 * un avión de línea cada piloto tiene su horizonte **por fuera** y la
 * navegación por dentro, o sea que la mitad derecha va en espejo. Puestas en
 * fila alterna, el copiloto se encontraba el horizonte en el sitio donde el
 * comandante tiene la rosa, que es de las pocas cosas de una cabina que no
 * pueden estar al revés.
 */
function queLeToca(
  i: number,
  cuantas: number,
): "horizonte" | "rumbo" | "motores" {
  /*
   * **Y con un número impar, la de en medio es la de los motores.**
   *
   * En una cabina de línea el puesto de cada piloto lleva su horizonte y su
   * rosa, y **en el centro va el EICAS** —lo que hacen los motores—, que es la
   * pantalla que miran los dos. Es la disposición del 747-400 y la de casi
   * todo lo que vuela desde 1980: seis pantallas, dos por piloto y dos en el
   * centro.
   *
   * Antes ahí había una rejilla de relojes redondos de N1, uno por motor, y
   * eso no lo lleva ningún avión de línea: es lo que hacía que un
   * cuatrimotor de fuselaje ancho pareciera un juguete. Se dijo jugando: «que
   * un 747 no parezca un juguete».
   */
  if (cuantas % 2 === 1 && i === (cuantas - 1) / 2) return "motores";
  const sinLaDelMedio = cuantas % 2 === 1 ? cuantas - 1 : cuantas;
  const suSitio = cuantas % 2 === 1 && i > (cuantas - 1) / 2 ? i - 1 : i;
  if (sinLaDelMedio < 4) return suSitio % 2 === 0 ? "horizonte" : "rumbo";
  const mitad = sinLaDelMedio / 2;
  const enSuLado = suSitio < mitad ? suSitio : sinLaDelMedio - 1 - suSitio;
  return enSuLado % 2 === 0 ? "horizonte" : "rumbo";
}

/** Una pantalla: su lienzo, su textura y el material que la lleva. */
interface Pantalla {
  readonly g: CanvasRenderingContext2D;
  readonly textura: CanvasTexture;
  readonly material: MeshBasicMaterial;
}

function nuevaPantalla(): Pantalla | null {
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const g = lienzo.getContext("2d");
  if (!g) return null;
  const textura = new CanvasTexture(lienzo);
  // Sin mipmaps y con filtro suave: la pantalla se ve casi de frente y de
  // cerca, así que generar la pirámide es trabajo tirado y encima emborrona.
  textura.generateMipmaps = false;
  textura.minFilter = LinearFilter;
  textura.magFilter = LinearFilter;
  textura.flipY = false;
  // Básico y no físico: una pantalla **emite** luz, no la recibe. Con un
  // material de superficie se apagaba con el sol, que es justo al revés de lo
  // que hace un panel encendido al anochecer.
  const material = new MeshBasicMaterial({ map: textura, toneMapped: false });
  return { g, textura, material };
}

/**
 * Estira a todo el rectángulo las coordenadas de textura de una malla.
 *
 * Las que trae el modelo cubren de 0,12 a 0,87 en horizontal y de 0,15 a 0,68
 * en vertical, porque apuntaban a un trozo de una lámina compartida. Se
 * normalizan en vez de escribirlas a mano para no tener que adivinar en qué
 * orden vienen los cuatro vértices ni hacia dónde mira la pantalla: lo que
 * traía se conserva, solo que ocupando el lienzo entero.
 */
function estirarUV(malla: Mesh): void {
  const uv = malla.geometry.getAttribute("uv");
  if (!uv) return;
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    uMin = Math.min(uMin, uv.getX(i));
    uMax = Math.max(uMax, uv.getX(i));
    vMin = Math.min(vMin, uv.getY(i));
    vMax = Math.max(vMax, uv.getY(i));
  }
  const du = uMax - uMin;
  const dv = vMax - vMin;
  if (du <= 0 || dv <= 0) return;
  /*
   * **Y los dos ejes al revés**, que es como las trae el modelo.
   *
   * Se llegó a mano, probando, porque leyendo el fichero no salía: el cuadrado
   * de la pantalla se ve por su cara de atrás y eso mete un espejo que las
   * coordenadas por sí solas no deshacen. Las tres combinaciones que no valen,
   * por si alguien vuelve aquí:
   *
   *   sin invertir  · el sitio bien, las letras en espejo
   *   invirtiendo   · el sitio cambiado, las letras en espejo
   *   con `escribir` y sin invertir · las letras bien, el sitio cambiado
   *
   * Lo que vale es invertir **y** deshacer el espejo al escribir. Ver
   * `escribir` y el `setTransform` de `actualizar`.
   */
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, 1 - (uv.getX(i) - uMin) / du, 1 - (uv.getY(i) - vMin) / dv);
  }
  uv.needsUpdate = true;
}

export interface Pantallas {
  /**
   * Dónde quedó cada pantalla en el avión y qué le tocó pintar.
   *
   * Para poder comprobarlo desde fuera: la izquierda del piloto lleva el
   * horizonte y la derecha la rosa de rumbos, como un G1000 de verdad, y eso
   * no lo ve ninguna prueba unitaria — hay que preguntárselo al avión ya
   * cargado. Ver `verificar-cabina`.
   */
  readonly orden: readonly {
    readonly uuid: string;
    readonly dibujo: string;
  }[];
  /** Repinta las dos, si toca. Se llama cada fotograma. */
  actualizar(datos: DatosDeCabina, dt: number): void;
  dispose(): void;
}

/**
 * Enciende las pantallas de un modelo, si las tiene.
 *
 * Devuelve `null` cuando el modelo no trae ninguna, que es lo normal: esto
 * depende de cómo se llame un material dentro de un fichero de un tercero, y
 * el día que se cambie de avión lo más probable es que se llame de otro modo.
 * Un avión sin pantallas se vuela igual.
 */
export function encenderPantallas(
  raiz: import("three").Object3D,
  /**
   * El grupo de la aeronave, que es **el único sitio donde izquierda es
   * izquierda**.
   *
   * El cargador puede darle media vuelta al modelo para poner el morro donde
   * toca —lo hace con el que viene de fuera— y esa media vuelta vive en el
   * nodo de dentro. Así que medir «a qué lado cae esta pantalla» dentro del
   * modelo da la respuesta cambiada justo en los modelos a los que se dio la
   * vuelta, y lo que salía era el horizonte a la derecha en un avión y a la
   * izquierda en el otro. Desde el grupo, la +X es la derecha del piloto en
   * los dos.
   */
  grupo: import("three").Object3D = raiz,
): Pantallas | null {
  const mallas: Mesh[] = [];
  raiz.traverse((o) => {
    const m = o as Mesh;
    const mat = m.material as { name?: string } | undefined;
    if (!m.isMesh || mat?.name !== "g1000_display") return;
    mallas.push(m);
  });
  if (!mallas.length) return null;

  /*
   * La de la izquierda del piloto es la del horizonte, como en el de verdad.
   * Se ordenan por su X **en el avión**, que es lo que distingue una de otra.
   *
   * Y se mide **la caja de la malla ya colocada**, que es lo único que vale
   * para los dos modelos. Esto miraba el centro de la esfera de la geometría,
   * y eso solo funciona si cada pantalla lleva su sitio metido en los
   * vértices: es como viene el modelo traído de fuera y no como sale de
   * Blender, donde las dos pantallas son la misma geometría movida por el
   * nodo. Con las dos centradas en cero el orden salía el que fuera, y en el
   * Mainumby quedaba el horizonte a la derecha, al revés que en un G1000.
   *
   * Mirar solo la posición del nodo tampoco vale, y se comprobó: entonces el
   * que se descoloca es el de fuera, que tiene los dos nodos en el mismo
   * sitio. La caja ya colocada recoge las dos cosas. Y se mide **desde el
   * grupo**, no desde el modelo, por lo que dice `grupo` ahí arriba.
   */
  raiz.updateWorldMatrix(true, true);
  const enElAvion = new Map<Mesh, number>();
  const centro = new Vector3();
  for (const m of mallas) {
    new Box3().setFromObject(m).getCenter(centro);
    enElAvion.set(m, grupo.worldToLocal(centro.clone()).x);
  }
  mallas.sort((a, b) => (enElAvion.get(a) ?? 0) - (enElAvion.get(b) ?? 0));

  const pantallas: Pantalla[] = [];
  mallas.forEach((malla, i) => {
    const p = nuevaPantalla();
    if (!p) return;
    estirarUV(malla);
    malla.material = p.material;
    pantallas.push(p);
    void i;
  });
  if (!pantallas.length) return null;

  let desde = 0;
  return {
    /*
     * Dónde quedó cada pantalla y qué le tocó pintar.
     *
     * Está aquí para que se pueda comprobar desde fuera, porque el orden es
     * lo que se rompió: la izquierda del piloto tiene que llevar el horizonte
     * y la derecha la rosa de rumbos, como un G1000 de verdad, y eso no se ve
     * en ninguna prueba unitaria — hay que preguntárselo al avión cargado.
     */
    orden: mallas.map((m, i) => ({
      // El identificador de la malla, no su sitio: quien comprueba esto desde
      // fuera tiene que poder **medir él** a qué lado cayó. Devolver aquí la
      // X sería contarle lo mismo que ya se usó para ordenar, y entonces la
      // comprobación sale bien aunque el orden esté al revés.
      uuid: m.uuid,
      dibujo: queLeToca(i, mallas.length),
    })),
    actualizar(datos, dt) {
      desde += dt;
      if (desde < 1 / POR_SEGUNDO) return;
      desde = 0;
      pantallas.forEach((p, i) => {
        // El espejo, deshecho: se dibuja al revés para que se vea del derecho
        // desde el otro lado del cuadrado. Ver `estirarUV`.
        p.g.setTransform(-1, 0, 0, 1, ANCHO, 0);
        const toca = queLeToca(i, pantallas.length);
        if (toca === "horizonte") pintarHorizonte(p.g, datos);
        else if (toca === "motores") pintarMotores(p.g, datos);
        else pintarRumbo(p.g, datos);
        p.textura.needsUpdate = true;
      });
    },
    dispose() {
      for (const p of pantallas) {
        p.textura.dispose();
        p.material.dispose();
      }
    },
  };
}

/**
 * Escribe una palabra **sin el espejo** del lienzo.
 *
 * Todo el dibujo va en espejo para verse del derecho desde la cara de atrás
 * del cuadrado (ver `estirarUV`), y un espejo le sienta bien a una raya pero
 * no a una letra. Así que cada texto deshace el espejo en su sitio: se pone
 * donde toca y se dibuja al derecho.
 */
function escribir(
  g: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  fuente: string,
  color: string,
  alineado: CanvasTextAlign = "center",
): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.font = fuente;
  g.textAlign = alineado;
  g.textBaseline = "middle";
  g.fillText(texto, 0, 0);
  g.restore();
}

/** Un rótulo con su caja, como los del HUD. */
function cartel(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  texto: string,
  alto = 46,
): void {
  g.fillStyle = "rgba(12, 18, 16, 0.82)";
  g.fillRect(x, y - alto / 2, ancho, alto);
  g.strokeStyle = "rgba(233, 242, 238, 0.5)";
  g.lineWidth = 2;
  g.strokeRect(x, y - alto / 2, ancho, alto);
  escribir(
    g,
    texto,
    x + ancho / 2,
    y + 1,
    "bold 30px system-ui, sans-serif",
    TINTA,
  );
}

/** La izquierda: horizonte, velocidad y altura. */
function pintarHorizonte(g: CanvasRenderingContext2D, d: DatosDeCabina): void {
  g.save();
  g.clearRect(0, 0, ANCHO, ALTO);

  // El horizonte gira con el alabeo y sube y baja con el cabeceo. Se dibuja
  // sobre un cuadrado más grande que la pantalla para que al girar no asome
  // el fondo por las esquinas.
  g.save();
  g.beginPath();
  g.rect(0, 0, ANCHO, ALTO);
  g.clip();
  g.translate(ANCHO / 2, ALTO / 2);
  g.rotate(-d.alabeo);
  const subida = ((d.cabeceo * 180) / Math.PI) * 4.2;
  g.translate(0, subida);
  g.fillStyle = CIELO;
  g.fillRect(-ANCHO, -ALTO * 1.6, ANCHO * 2, ALTO * 1.6);
  g.fillStyle = TIERRA;
  g.fillRect(-ANCHO, 0, ANCHO * 2, ALTO * 1.6);
  g.strokeStyle = TINTA;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-ANCHO, 0);
  g.lineTo(ANCHO, 0);
  g.stroke();
  // Las escalerillas de diez en diez grados, que es lo que da la sensación de
  // estar subiendo o bajando cuando el horizonte se sale de la pantalla.
  g.lineWidth = 2.5;
  for (const grados of [-20, -10, 10, 20]) {
    const y = grados * 4.2;
    const ancho = Math.abs(grados) === 10 ? 46 : 70;
    g.beginPath();
    g.moveTo(-ancho, y);
    g.lineTo(ancho, y);
    g.stroke();
  }
  g.restore();

  // El avión, clavado en el centro: es lo único que no se mueve.
  g.strokeStyle = SIMBOLO;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(ANCHO / 2 - 68, ALTO / 2);
  g.lineTo(ANCHO / 2 - 22, ALTO / 2);
  g.moveTo(ANCHO / 2 + 22, ALTO / 2);
  g.lineTo(ANCHO / 2 + 68, ALTO / 2);
  g.stroke();
  g.fillStyle = SIMBOLO;
  g.beginPath();
  g.arc(ANCHO / 2, ALTO / 2, 5, 0, Math.PI * 2);
  g.fill();

  // Velocidad a la izquierda y altura a la derecha, como en el de verdad.
  cartel(g, 10, ALTO / 2, 128, `${Math.round(d.velocidad * 3.6)}`);
  cartel(g, ANCHO - 138, ALTO / 2, 128, `${Math.round(d.altura)}`);
  escribir(g, "IAS", 74, 30, "bold 20px system-ui, sans-serif", VERDE);
  escribir(g, "ALT", ANCHO - 74, 30, "bold 20px system-ui, sans-serif", VERDE);
  g.restore();
}

/** La derecha: la rosa de rumbos y la velocidad vertical. */
/**
 * El EICAS: qué están haciendo los motores.
 *
 * Es la pantalla del centro de una cabina de línea —la que miran los dos
 * pilotos— y sustituye a la rejilla de relojes redondos que había antes, que no
 * la lleva ningún avión de línea desde 1980. Se dijo jugando, y era verdad:
 * «que un 747 no parezca un juguete».
 *
 * ## Por qué cintas y no esferas
 *
 * Porque lo que se mira de cuatro motores no es cuánto da cada uno: es **si dan
 * lo mismo**. Cuatro cintas verticales una al lado de otra se leen de un
 * vistazo —parejas o no parejas— y cuatro agujas redondas hay que leerlas una
 * por una. Es exactamente por eso que un EICAS de verdad las pone así.
 *
 * Cada cinta lleva su número grande debajo, porque la cifra es la que se canta
 * por radio y la que se apunta, y su arco verde: la banda donde el motor
 * trabaja a gusto. El ámbar del final no es decoración — es el empuje de
 * despegue, que se usa unos minutos y no una hora.
 */
function pintarMotores(g: CanvasRenderingContext2D, d: DatosDeCabina): void {
  g.fillStyle = FONDO;
  g.fillRect(0, 0, ANCHO, ALTO);

  const cuantos = Math.max(1, d.motores.length);
  const margen = 46;
  const hueco = (ANCHO - margen * 2) / cuantos;
  const anchoCinta = Math.min(58, hueco * 0.52);
  const arriba = 56;
  const alto = 190;

  g.font = "600 26px system-ui, sans-serif";
  g.fillStyle = VERDE;
  g.textAlign = "center";
  g.fillText(d.rotuloDeMotor, ANCHO / 2, 34);

  d.motores.forEach((valor, i) => {
    const x = margen + hueco * (i + 0.5);
    const v = Math.max(0, Math.min(1, valor));

    // El canal, y dentro la banda verde: de ralentí a empuje de crucero.
    g.fillStyle = CANAL;
    g.fillRect(x - anchoCinta / 2, arriba, anchoCinta, alto);
    g.fillStyle = "rgba(53, 199, 89, 0.28)";
    g.fillRect(
      x - anchoCinta / 2,
      arriba + alto * 0.1,
      anchoCinta,
      alto * 0.75,
    );

    // Lo que da ahora, creciendo desde abajo, que es como se lee un empuje.
    const h = alto * v;
    g.fillStyle = v > 0.92 ? AMBAR : VERDE;
    g.fillRect(x - anchoCinta / 2, arriba + alto - h, anchoCinta, h);

    // Y la línea del valor, gruesa, que es lo que se compara entre motores.
    g.fillStyle = TINTA;
    g.fillRect(
      x - anchoCinta / 2 - 6,
      arriba + alto - h - 2,
      anchoCinta + 12,
      4,
    );

    g.font = "700 34px system-ui, sans-serif";
    g.fillStyle = TINTA;
    g.fillText(`${Math.round(v * 100)}`, x, arriba + alto + 40);
    g.font = "500 20px system-ui, sans-serif";
    g.fillStyle = TENUE;
    g.fillText(`${i + 1}`, x, arriba - 14);
  });

  /*
   * Y los flaps abajo, en cinta horizontal y no en un reloj.
   *
   * Van aquí porque es donde se miran: con el tren y el empuje, en la misma
   * ojeada de la aproximación. Un reloj de flaps aparte es un instrumento que
   * nadie mira hasta que ya es tarde.
   */
  const yF = ALTO - 46;
  g.textAlign = "left";
  g.font = "500 22px system-ui, sans-serif";
  g.fillStyle = TENUE;
  g.fillText("FLAPS", margen, yF - 12);
  g.fillStyle = CANAL;
  g.fillRect(margen, yF, ANCHO - margen * 2, 18);
  g.fillStyle = d.flaps > 0.02 ? AMBAR : TENUE;
  g.fillRect(
    margen,
    yF,
    (ANCHO - margen * 2) * Math.max(0, Math.min(1, d.flaps)),
    18,
  );
  g.textAlign = "center";
}

function pintarRumbo(g: CanvasRenderingContext2D, d: DatosDeCabina): void {
  g.save();
  g.fillStyle = FONDO;
  g.fillRect(0, 0, ANCHO, ALTO);

  const cx = ANCHO / 2 - 40;
  const cy = ALTO / 2;
  const r = 138;

  g.save();
  g.translate(cx, cy);
  g.rotate(-d.rumbo);
  g.strokeStyle = "rgba(233, 242, 238, 0.75)";
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.stroke();
  // Las cuatro cardinales y las rayas de treinta en treinta.
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    const larga = a % 90 === 0;
    g.beginPath();
    g.moveTo(Math.sin(rad) * r, -Math.cos(rad) * r);
    g.lineTo(
      Math.sin(rad) * (r - (larga ? 22 : 12)),
      -Math.cos(rad) * (r - (larga ? 22 : 12)),
    );
    g.lineWidth = larga ? 4 : 2.5;
    g.stroke();
  }
  ["N", "E", "S", "O"].forEach((letra, i) => {
    const rad = (i * 90 * Math.PI) / 180;
    g.save();
    g.translate(Math.sin(rad) * (r - 44), -Math.cos(rad) * (r - 44));
    g.rotate(d.rumbo);
    escribir(g, letra, 0, 0, "bold 26px system-ui, sans-serif", TINTA);
    g.restore();
  });
  g.restore();

  // El avión, quieto en el centro y mirando siempre arriba: la rosa gira
  // debajo, que es como se lee un rumbo sin saber leer.
  g.fillStyle = SIMBOLO;
  g.beginPath();
  g.moveTo(cx, cy - 26);
  g.lineTo(cx + 17, cy + 20);
  g.lineTo(cx, cy + 11);
  g.lineTo(cx - 17, cy + 20);
  g.closePath();
  g.fill();

  // Y la velocidad vertical, en una barra: arriba es subir.
  const bx = ANCHO - 62;
  g.strokeStyle = "rgba(233, 242, 238, 0.5)";
  g.lineWidth = 2;
  g.strokeRect(bx, 60, 44, ALTO - 120);
  g.beginPath();
  g.moveTo(bx, ALTO / 2);
  g.lineTo(bx + 44, ALTO / 2);
  g.stroke();
  const trozo = Math.max(-1, Math.min(1, d.vertical / 6)) * ((ALTO - 120) / 2);
  g.fillStyle = trozo < 0 ? AMBAR : VERDE;
  g.fillRect(bx + 6, ALTO / 2, 32, -trozo);
  escribir(g, "V/S", bx + 22, 36, "bold 20px system-ui, sans-serif", VERDE);
  escribir(
    g,
    `${Math.round((d.rumbo * 180) / Math.PI + d.declinacion + 720) % 360}`,
    cx,
    cy + r + 34,
    "bold 26px system-ui, sans-serif",
    TINTA,
  );
  g.restore();
}
