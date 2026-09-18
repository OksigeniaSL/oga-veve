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
import { luzDeTren } from "../flight/tren";
import {
  QUIETA_LA_ALTITUD,
  QUIETA_LA_VELOCIDAD,
  TARDA_EL_MOTOR,
  conRetardo,
  marcasDeCinta,
  rodillo,
  tendencia,
} from "../ui/cinta";
import { NUDOS, PIES, PIES_POR_MINUTO, type Cuadro } from "../ui/cuadro";
import { dibujarLaCarta, millasHasta } from "../ui/carta";
import {
  CIFRAS_DESDE,
  apunta,
  desdePara,
  empiezaElRepintado,
  loEscrito,
  type Peldano,
} from "../ui/familia";

/**
 * La tipografía de la cabina: condensada, y la misma que el cuadro del HUD.
 *
 * Condensada porque el píxel escasea —una pantalla de estas mide 512 de ancho
 * y se ve a escala— y una condensada da un veinte por ciento más de cifra por
 * milímetro. Y sin descargar nada: todas están ya en el sistema.
 */
const FUENTE =
  '"Roboto Condensed", "Liberation Sans Narrow", "Arial Narrow", "DejaVu Sans Condensed", ui-sans-serif, sans-serif';

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
/** El fondo de una pantalla de cristal. */
const FONDO = PALETA.pantalla;
/** Rótulo apagado: está, pero no es lo que se mira. */
const TENUE = PALETA.apagado;
/** El avioncito símbolo, que tiene que leerse sobre el cielo y sobre la tierra. */
const SIMBOLO = PALETA.simbolo;

export interface DatosDeCabina {
  /** Velocidad indicada, m/s. */
  readonly velocidad: number;
  /**
   * La velocidad de aproximación de esta aeronave, m/s.
   *
   * Es el número al que hay que volar para aterrizar, y en esta cabina **no
   * estaba en ninguna parte**: la cinta decía a qué velocidad vas y ninguna
   * marca decía a cuál hay que ir. Preguntado jugando, con el de fuselaje
   * ancho sobre la cabecera: «¿se puede saber sobre qué tortuga tengo que
   * volar para que el aterrizaje me valga?».
   *
   * En el peldaño de los dibujos esa respuesta ya existe —un tope en la vía de
   * la tortuga y el pájaro— y aquí faltaba. Es el mismo arreglo en la otra
   * superficie, que es el fallo que más veces se ha repetido en este cuadro:
   * se arregla donde se mira y no donde también se mira.
   */
  readonly vref: number;
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
  /**
   * Las escalas de **este** avión: fondo de anemómetro, de variómetro y los
   * arcos de color.
   *
   * Sin esto las cintas se dibujaban con una escala inventada igual para los
   * seis, que es el mismo fallo que ya se arregló una vez en las esferas del
   * HUD: el de fuselaje ancho volaba con la aguja clavada en el tope. Sale de
   * la ficha, por `cuadroDe`. Ver `ui/cuadro.ts`.
   */
  /**
   * En qué peldaño de la escalera se está volando, de uno a cuatro.
   *
   * **Lo que decide si en esta pantalla hay letras.** Sin esto, el mismo avión
   * en el peldaño de los pequeños enseñaba fuera un cuadro sin una palabra y
   * dentro, a diez centímetros de la cara, «IAS», «ALT», «V/S», «GS», «HDG»,
   * «RPM», «FLAPS» y once cifras. Y la de dentro es la que mira quien vuela
   * desde la cabina. Ver `peldanoDe` en `ui/familia.ts`.
   */
  readonly peldano: Peldano;
  readonly cuadro: Cuadro;
  /** Cuántas patas tiene el tren. Tres, y cinco en el grande. */
  readonly patas: number;
  /** Y dónde está: 0 dentro, 1 fuera y trabado. Ver `flight/tren.ts`. */
  readonly tren: number;
  /**
   * Altura **sobre el suelo**, m. La del radioaltímetro.
   *
   * No es la del altímetro de al lado, y esa diferencia es la lección: uno mide
   * sobre el mar y el otro sobre lo que tenés debajo. En La Palma o El Hierro
   * eso son seiscientos metros de montaña.
   */
  readonly sobreElTerreno: number;
  /** Velocidad respecto al suelo, m/s. Dato auxiliar: va en cian. */
  readonly sobreElSuelo: number;
  /** Si está en pérdida: marco rojo alrededor del horizonte. */
  readonly perdida: boolean;
  /**
   * Adónde se va y a qué distancia, si se va a algún sitio.
   *
   * Es lo que le faltaba a la pantalla de navegación para ser una pantalla de
   * navegación y no un dibujo bonito: «¿por qué no tengo datos como distancia
   * al aeropuerto?». Rumbo en radianes, distancia en metros.
   */
  readonly objetivo: {
    readonly rumbo: number;
    readonly distancia: number;
  } | null;
  /** De dónde sopla y cuánto. Dato auxiliar: va en cian. */
  readonly viento: { readonly desde: number; readonly nudos: number } | null;
  /**
   * **El mundo, para poder dibujarlo.**
   *
   * Sin esto la pantalla de navegación era una brújula sobre un fondo vacío:
   * giraba, y ya. Con dónde estoy, dónde está la pista y quién más anda por
   * aquí, pasa a ser lo que dice su nombre — una carta. Ver `ui/carta.ts`.
   */
  readonly mapa: {
    /** Dónde estoy, en metros del mundo. */
    readonly x: number;
    readonly z: number;
    /** La pista de casa, con su sitio, su rumbo y su largo. */
    readonly pista: {
      readonly x: number;
      readonly z: number;
      readonly heading: number;
      readonly length: number;
    } | null;
    /**
     * Y los otros aviones, los que se oyen por la radio.
     *
     * Aparecen en la carta por el mismo motivo por el que se dibujan en el
     * cielo: se les oye decir dónde están, y una pantalla que no los enseña
     * enseña que la radio es un adorno. Ver `world/trafico.ts`.
     */
    readonly otros: readonly { readonly x: number; readonly z: number }[];
  } | null;
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
  nombre = "",
): "horizonte" | "rumbo" | "motores" {
  /*
   * **Y si la pantalla dice cómo se llama, se le hace caso.**
   *
   * Lo de abajo es aritmética sobre la posición, y funciona mientras el
   * reparto sea el que esa aritmética supone. En cuanto el avión de línea pasó
   * a llevar tres pantallas seguidas —actitud, navegación y motores, todas
   * delante del comandante— dejó de valer: la regla decía que la de en medio
   * es la de motores, y ahí la de en medio es la de navegación.
   *
   * Las que hace este repositorio llevan su nombre puesto en Blender, así que
   * no hace falta adivinar. La aritmética se queda para el modelo traído de
   * fuera, que no lo lleva.
   */
  if (/horizonte/.test(nombre)) return "horizonte";
  if (/rumbo/.test(nombre)) return "rumbo";
  if (/motores/.test(nombre)) return "motores";
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
  /** Cómo se llama cada una, en el orden en que quedaron. */
  const nombres: string[] = [];
  mallas.forEach((malla, i) => {
    nombres.push(malla.name ?? "");
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
      dibujo: queLeToca(i, mallas.length, m.name ?? ""),
    })),
    actualizar(datos, dt) {
      /*
       * Lo que tarda cada cosa se mide **con el paso de tiempo de verdad**, no
       * con el del repintado: si se midiera solo al pintar, el retardo de un
       * reactor dependería de a cuántas imágenes por segundo se dibuje la
       * pantalla, que es justo lo que no puede pasar.
       */
      medirLoQueTarda(datos, dt);
      desde += dt;
      if (desde < 1 / POR_SEGUNDO) return;
      desde = 0;
      // El peldaño de este repintado, para las veintisiete letras. Y la cuenta
      // a cero: lo que se mide es lo que sale **en esta pasada**.
      peldanoDeAhora = datos.peldano;
      // Las dos superficies de lienzo apuntan en el mismo sitio, y el
      // repintado de las pantallas es el que abre la pasada. Ver `apunta`.
      empiezaElRepintado();
      pantallas.forEach((p, i) => {
        // El espejo, deshecho: se dibuja al revés para que se vea del derecho
        // desde el otro lado del cuadrado. Ver `estirarUV`.
        p.g.setTransform(-1, 0, 0, 1, ANCHO, 0);
        const toca = queLeToca(i, pantallas.length, nombres[i] ?? "");
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
/**
 * En qué peldaño se está pintando ahora mismo, y cuántas letras han salido.
 *
 * Va en el módulo y no de parámetro en parámetro porque `escribir` se llama
 * veintisiete veces desde ocho sitios distintos y encadenarlo por todos ellos
 * era la forma segura de olvidarse de uno — y un rótulo olvidado en el primer
 * peldaño rompe la promesa entera. Se pone al empezar cada repintado.
 */
let peldanoDeAhora: Peldano = 4;

/**
 * Cuántas **palabras** salieron en el último repintado. Para el banco.
 *
 * Palabras y no textos: lo que se le promete a un prelector no es un panel sin
 * números, es un panel sin palabras — y además en inglés aeronáutico. Contando
 * las dos cosas juntas, la comprobación exigía un cuatrimotor con cuatro
 * agujas y ni una cifra, que es lo que se vio jugando: «no veo números ni
 * datos en ninguno».
 */
export function rotulosDeLaCabina(): number {
  return loEscrito().rotulos;
}

/** Y cuántas cifras, que es lo otro que hay que poder medir. */
export function cifrasDeLaCabina(): number {
  return loEscrito().cifras;
}

function escribir(
  g: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  fuente: string,
  color: string,
  alineado: CanvasTextAlign = "center",
): void {
  /*
   * **Una cifra entra un peldaño antes que un rótulo.**
   *
   * Aquí y no en cada sitio que llama: es el cuello por donde pasan las
   * veintisiete. Y se decide por el texto, no por quién lo escribe, que es lo
   * único que se puede aplicar igual en el lienzo y en el SVG del cuadro
   * plano. Ver `desdePara` en `ui/familia.ts`.
   */
  if (peldanoDeAhora < desdePara(texto)) return;
  apunta(texto);
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.font = fuente;
  g.textAlign = alineado;
  g.textBaseline = "middle";
  g.fillText(texto, 0, 0);
  g.restore();
}

/**
 * ── Las medidas de una pantalla de cabina ──
 *
 * Son las mismas que el cuadro del HUD porque **son los mismos instrumentos**:
 * velocidad a la izquierda, actitud en medio, altitud a la derecha, rumbo
 * abajo. Lo que cambia es el tamaño del lienzo y que aquí se dibuja con pincel
 * en vez de con SVG; las cuentas de las cintas son las mismas y salen del
 * mismo sitio. Ver `ui/cinta.ts`.
 */
const CINTA = 66;
const VSI = 22;
const RUMBO_ABAJO = 38;
/** Píxeles por nudo, por pie y por grado en este lienzo. */
const POR_NUDO = 3;
const POR_PIE = 0.34;
const POR_GRADO = 2.2;
/** De cuánto en cuánto está grabado el tambor de la altitud, en pies. */
const PASO_TAMBOR = 20;
// Las tres, de donde viven: `ui/cuadro.ts`. Ver el porqué allí.

/** El alto de la parte de arriba: todo menos la cinta de rumbo. */
const ALTO_CINTAS = ALTO - RUMBO_ABAJO;

/**
 * La pantalla de actitud: **el mismo cuadro que el del HUD, con pincel.**
 *
 * Lo que había aquí era un horizonte con dos carteles, uno con los kilómetros
 * por hora y otro con los metros. Dos cosas mal a la vez: un anemómetro no
 * marca kilómetros por hora en ninguna cabina del mundo, y un número suelto no
 * es un instrumento — no dice si sube, ni cuánto falta, ni si te estás
 * pasando. Lo que dice todo eso es la **cinta**: una ventana sobre una
 * magnitud que fluye, con el puntero quieto y el mundo pasando por delante.
 */
function pintarHorizonte(g: CanvasRenderingContext2D, d: DatosDeCabina): void {
  g.save();
  g.fillStyle = FONDO;
  g.fillRect(0, 0, ANCHO, ALTO);

  const x0 = CINTA + 6;
  const anchoAct = ANCHO - CINTA * 2 - VSI - 18;
  horizonteDe(g, x0, 0, anchoAct, ALTO_CINTAS, d);
  cintaDeVelocidad(g, 0, 0, CINTA, ALTO_CINTAS, d);
  cintaDeAltitud(g, ANCHO - VSI - CINTA, 0, CINTA, ALTO_CINTAS, d);
  variometro(g, ANCHO - VSI, 0, VSI, ALTO_CINTAS, d);
  cintaDeRumbo(g, x0, ALTO_CINTAS, anchoAct, RUMBO_ABAJO, d);
  radioaltimetro(g, x0 + anchoAct / 2, ALTO_CINTAS - 34, d);
  g.restore();
}

/**
 * El radioaltímetro: **cuánto hay hasta el suelo**, no hasta el mar.
 *
 * Aparece por debajo de dos mil quinientos pies y desaparece por encima, que es
 * como funciona el de verdad: mientras sobra altura no dice nada, y en cuanto
 * empieza a faltar es el único número que se mira. Ámbar en los últimos
 * doscientos, donde deja de ser un dato y es un aviso.
 */
function radioaltimetro(
  g: CanvasRenderingContext2D,
  cx: number,
  y: number,
  d: DatosDeCabina,
): void {
  const pies = d.sobreElTerreno * PIES;
  if (pies >= DESDE_EL_RADIO) return;
  const color = pies < YA_ES_BAJO ? PALETA.precaucion : TINTA;
  escribir(
    g,
    String(Math.max(0, Math.round(pies))),
    cx,
    y,
    "600 20px " + FUENTE,
    color,
  );
  escribir(g, "RA", cx, y + 15, "500 10px " + FUENTE, TENUE);
}

/** Desde qué altura sobre el suelo aparece, y dónde se pone ámbar. Pies. */
const DESDE_EL_RADIO = 2500;
const YA_ES_BAJO = 200;

/** El horizonte de dentro de la pantalla de actitud. */
function horizonteDe(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  d: DatosDeCabina,
): void {
  const cx = x + w / 2;
  const cy = y + h * 0.46;
  const porGrado = h / 46;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();

  g.save();
  g.translate(cx, cy);
  g.rotate(-d.alabeo);
  g.translate(0, ((d.cabeceo * 180) / Math.PI) * porGrado);
  g.fillStyle = CIELO;
  g.fillRect(-w, -h * 2, w * 2, h * 2);
  g.fillStyle = TIERRA;
  g.fillRect(-w, 0, w * 2, h * 2);
  g.strokeStyle = "#fff";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-w, 0);
  g.lineTo(w, 0);
  g.stroke();
  // La escalerilla de cabeceo: de cinco en cinco, con cifra cada diez.
  g.lineWidth = 2;
  for (let grados = -30; grados <= 30; grados += 5) {
    if (grados === 0) continue;
    const yy = -grados * porGrado;
    const largo = grados % 10 === 0 ? 34 : 17;
    g.beginPath();
    g.moveTo(-largo, yy);
    g.lineTo(largo, yy);
    g.stroke();
    if (grados % 10 === 0) {
      escribir(
        g,
        String(Math.abs(grados)),
        -largo - 12,
        yy,
        "500 13px " + FUENTE,
        "#fff",
      );
    }
  }
  g.restore();

  // El arco de alabeo, con sus marcas, y el triángulo que dice dónde estás.
  g.strokeStyle = "#fff";
  g.lineWidth = 2;
  const r = w * 0.38;
  for (const grados of [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60]) {
    const a = (grados * Math.PI) / 180;
    const largo =
      Math.abs(grados) % 30 === 0 || Math.abs(grados) === 45 ? 11 : 6;
    g.beginPath();
    g.moveTo(cx + Math.sin(a) * r, cy - Math.cos(a) * r);
    g.lineTo(cx + Math.sin(a) * (r + largo), cy - Math.cos(a) * (r + largo));
    g.stroke();
  }
  g.save();
  g.translate(cx, cy);
  g.rotate(-d.alabeo);
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(0, -r);
  g.lineTo(-7, -r - 12);
  g.lineTo(7, -r - 12);
  g.closePath();
  g.fill();
  g.restore();

  /*
   * El avioncito símbolo, clavado en el centro. **Amarillo**, y no es gusto:
   * es el único dibujo que cae encima del cielo y encima de la tierra a la
   * vez, así que tiene que leerse sobre los dos. Por eso los de verdad son
   * amarillos.
   */
  g.strokeStyle = SIMBOLO;
  g.lineWidth = 5;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx - 52, cy);
  g.lineTo(cx - 22, cy);
  g.lineTo(cx - 22, cy + 11);
  g.moveTo(cx + 52, cy);
  g.lineTo(cx + 22, cy);
  g.lineTo(cx + 22, cy + 11);
  g.moveTo(cx - 5, cy);
  g.lineTo(cx + 5, cy);
  g.stroke();
  g.lineCap = "butt";

  // Y la pérdida: marco rojo alrededor del horizonte, que es donde mira quien
  // ya está en apuros.
  if (d.perdida) {
    g.strokeStyle = PALETA.limite;
    g.lineWidth = 6;
    g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }
  g.restore();
}

/** La ventana oscura de una cinta, con su filete. */
function ventana(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle = "#05070a";
  g.fillRect(x, y, w, h);
  g.strokeStyle = "#2c3136";
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/** La caja del valor de ahora: fija en el centro, con filete blanco. */
/**
 * El recuadro de una lectura. **Y sin lectura no hay recuadro.**
 *
 * Los cuatro de estas pantallas existen para enmarcar una cifra, así que en
 * los dos peldaños que no llevan cifras quedaban cuatro cajas negras vacías
 * con su filete: en la cinta de velocidad, en la de altitud, al pie de la de
 * rumbo y encima de la rosa. Es el mismo error que la placa del cuadro plano,
 * y la regla es la misma: **un sitio vacío se deja vacío, no se enmarca**.
 */
function caja(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = TINTA,
): void {
  // Un recuadro existe para enmarcar una cifra, así que aparece con ella.
  if (peldanoDeAhora < CIFRAS_DESDE) return;
  g.fillStyle = "#05070a";
  g.fillRect(x, y - h / 2, w, h);
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.strokeRect(x + 1, y - h / 2 + 1, w - 2, h - 2);
}

/** La cinta de velocidad, en **nudos**, con los arcos de este avión. */
function cintaDeVelocidad(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  d: DatosDeCabina,
): void {
  const kt = d.velocidad * NUDOS;
  const c = d.cuadro;
  ventana(g, x, y, w, h);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  const medio = y + h / 2;

  // Las bandas de color de la ficha, en el borde de dentro.
  const banda = (desde: number, hasta: number, color: string) => {
    const y1 = medio + (kt - hasta * c.asiMax) * POR_NUDO;
    const y2 = medio + (kt - desde * c.asiMax) * POR_NUDO;
    g.fillStyle = color;
    g.fillRect(x + w - 5, y1, 5, y2 - y1);
  };
  banda(c.arcos.verde[0], c.arcos.verde[1], PALETA.normal);
  banda(c.arcos.ambar[0], c.arcos.ambar[1], PALETA.precaucion);
  banda(c.arcos.rojo[0], c.arcos.rojo[1], PALETA.limite);

  for (const m of marcasDeCinta({
    valor: kt,
    paso: 10,
    rotulaCada: 2,
    porUnidad: POR_NUDO,
    alto: h,
    minimo: 0,
  })) {
    const yy = medio + m.y;
    g.strokeStyle = TINTA;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x + w - (m.rotula ? 10 : 6), yy);
    g.lineTo(x + w, yy);
    g.stroke();
    if (m.rotula) {
      escribir(
        g,
        String(m.valor),
        x + w - 14,
        yy,
        "500 15px " + FUENTE,
        TINTA,
        "right",
      );
    }
  }

  /*
   * **El bug de Vref: a qué velocidad se aterriza este avión.**
   *
   * Magenta y en el borde de fuera, que es donde lo lleva cualquier cinta de
   * verdad y por qué: el borde de dentro es de las bandas del avión —lo que la
   * estructura aguanta— y el de fuera es de lo que ha pedido quien vuela. Son
   * dos cosas distintas y no se mezclan.
   *
   * Sale de la ficha, así que cambia solo con el aparato. Y va dentro del
   * recorte de la cinta: cuando la velocidad de aproximación se sale de la
   * ventana, el bug se sale con ella — que es lo que tiene que pasar, porque
   * entonces lo que dice es «estás lejísimos».
   */
  {
    const yv = medio + (kt - d.vref * NUDOS) * POR_NUDO;
    g.fillStyle = PALETA.objetivo;
    g.beginPath();
    g.moveTo(x + w, yv);
    g.lineTo(x + w + 9, yv - 6);
    g.lineTo(x + w + 9, yv + 6);
    g.closePath();
    g.fill();
  }

  /*
   * El vector de tendencia: dónde estarás dentro de seis segundos si no tocás
   * nada. Es la animación que más enseña de todo el cuadro, porque lo que
   * enseña es anticipación.
   */
  const salto = tendencia(aceleracion(), QUIETA_LA_VELOCIDAD);
  if (salto !== null) {
    const largo = Math.max(-h / 2 + 6, Math.min(h / 2 - 6, salto * POR_NUDO));
    g.fillStyle = PALETA.objetivo;
    g.fillRect(x + w - 3, medio - Math.max(0, largo), 3, Math.abs(largo));
  }
  g.restore();

  caja(g, x, medio, w, 30);
  escribir(
    g,
    String(Math.round(kt)),
    x + w - 6,
    medio,
    "600 24px " + FUENTE,
    TINTA,
    "right",
  );
  escribir(g, "IAS", x + w / 2, y + 12, "500 11px " + FUENTE, TENUE);
}

/**
 * La cinta de altitud, en **pies**, con el tambor de los últimos dígitos.
 *
 * Los dos últimos ruedan en vez de saltar, como el de un altímetro de tambor
 * de verdad. Una cifra que salta es invisible para la atención de un niño; una
 * que rueda la captura.
 */
function cintaDeAltitud(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  d: DatosDeCabina,
): void {
  const pies = d.altura * PIES;
  ventana(g, x, y, w, h);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  const medio = y + h / 2;
  for (const m of marcasDeCinta({
    valor: pies,
    paso: 100,
    rotulaCada: 2,
    porUnidad: POR_PIE,
    alto: h,
    minimo: -1000,
  })) {
    const yy = medio + m.y;
    g.strokeStyle = TINTA;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, yy);
    g.lineTo(x + (m.rotula ? 10 : 6), yy);
    g.stroke();
    if (m.rotula) {
      escribir(
        g,
        String(m.valor),
        x + 14,
        yy,
        "500 14px " + FUENTE,
        TINTA,
        "left",
      );
    }
  }
  /*
   * Y **la pista vive en el cero**: quien juegue sin saber leer descubrirá que
   * el suelo está en el cero antes de saber leer la altitud.
   */
  const suelo = medio + pies * POR_PIE;
  g.fillStyle = SIMBOLO;
  g.fillRect(x + 2, suelo - 1, w - 16, 2);

  const salto = tendencia(
    (d.vertical * PIES_POR_MINUTO) / 60,
    QUIETA_LA_ALTITUD / 60,
  );
  if (salto !== null) {
    const largo = Math.max(-h / 2 + 6, Math.min(h / 2 - 6, salto * POR_PIE));
    g.fillStyle = PALETA.objetivo;
    g.fillRect(x, medio - Math.max(0, largo), 3, Math.abs(largo));
  }
  g.restore();

  caja(g, x, medio, w, 30);
  const { centro, fraccion } = rodillo(
    pies,
    PASO_TAMBOR,
    Math.abs(d.vertical * PIES_POR_MINUTO) >= QUIETA_LA_ALTITUD,
  );
  escribir(
    g,
    String(Math.floor(pies / 100)),
    x + w - 29,
    medio,
    "600 21px " + FUENTE,
    TINTA,
    "right",
  );
  /*
   * **El tambor se recorta a la altura de un dígito, ni uno más.**
   *
   * Con la ventana más alta que el paso del rollo, los dos números vecinos
   * asomaban por arriba y por abajo y lo que se leía era un amasijo: «2», y
   * debajo otro número a medias. Un tambor de verdad enseña **una** cifra, y
   * la de al lado solo mientras está rodando.
   */
  const PASO_ROLLO = 26;
  g.save();
  g.beginPath();
  g.rect(x + w - 28, medio - 13, 28, 26);
  g.clip();
  for (const k of [-1, 0, 1]) {
    const valor = centro - k * PASO_TAMBOR;
    escribir(
      g,
      String(((valor % 100) + 100) % 100).padStart(2, "0"),
      x + w - 4,
      medio + k * PASO_ROLLO + fraccion * PASO_ROLLO,
      "600 21px " + FUENTE,
      TINTA,
      "right",
    );
  }
  g.restore();
  escribir(g, "ALT", x + w / 2, y + 12, "500 11px " + FUENTE, TENUE);
}

/** El variómetro: una franja al borde de la cinta de altitud. */
function variometro(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  d: DatosDeCabina,
): void {
  ventana(g, x, y, w, h);
  const medio = y + h / 2;
  const ampl = h / 2 - 12;
  g.strokeStyle = TINTA;
  for (let i = -2; i <= 2; i++) {
    const yy = medio - (i / 2) * ampl;
    g.lineWidth = i % 2 === 0 ? 1.5 : 1;
    g.beginPath();
    g.moveTo(x, yy);
    g.lineTo(x + (i % 2 === 0 ? 8 : 5), yy);
    g.stroke();
  }
  const f = Math.max(
    -1,
    Math.min(1, (d.vertical * PIES_POR_MINUTO) / d.cuadro.vsiMax),
  );
  g.strokeStyle = TINTA;
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(x, medio - f * ampl);
  g.lineTo(x + w, medio - f * ampl);
  g.stroke();
  escribir(g, "VS", x + w / 2, y + 10, "500 10px " + FUENTE, TENUE);
}

/** La cinta de rumbo al pie del horizonte: treinta grados a cada lado. */
function cintaDeRumbo(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  d: DatosDeCabina,
): void {
  const grados = magnetico(d);
  ventana(g, x, y, w, h);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  const centro = x + w / 2;
  const desde = Math.ceil((grados - w / 2 / POR_GRADO) / 5) * 5;
  for (let gg = desde; gg <= grados + w / 2 / POR_GRADO; gg += 5) {
    const xx = centro + (gg - grados) * POR_GRADO;
    const larga = gg % 10 === 0;
    g.strokeStyle = TINTA;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(xx, y);
    g.lineTo(xx, y + (larga ? 8 : 5));
    g.stroke();
    if ((((gg % 360) + 360) % 360) % 30 === 0) {
      escribir(
        g,
        String((((gg % 360) + 360) % 360) / 10).padStart(2, "0"),
        xx,
        y + 22,
        "500 14px " + FUENTE,
        TINTA,
      );
    }
  }
  g.restore();
  caja(g, centro - 26, y + 15, 52, 24);
  escribir(
    g,
    String(Math.round(((grados % 360) + 360) % 360)).padStart(3, "0"),
    centro,
    y + 15,
    "600 18px " + FUENTE,
    TINTA,
  );
  g.strokeStyle = SIMBOLO;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(centro, y);
  g.lineTo(centro, y + h);
  g.stroke();
}

/** El rumbo magnético, que es el que se dice y el que marca el HUD. */
function magnetico(d: DatosDeCabina): number {
  return (d.rumbo * 180) / Math.PI + d.declinacion;
}

/**
 * Cuánto acelera, para el vector de tendencia.
 *
 * Se guarda entre imágenes porque la tendencia es una **derivada** y la
 * pantalla solo recibe el valor: derivarla aquí, con la del cuadro anterior,
 * es la única fuente que hay. Suavizada medio segundo, o el vector baila y un
 * vector que baila no enseña a anticipar nada.
 */
let nudosAntes: number | null = null;
let aceleraActual = 0;
function aceleracion(): number {
  return aceleraActual;
}

/**
 * Y dónde va la aguja de cada motor, que **no es donde va el mando**.
 *
 * Un pistón obedece en tres décimas y un turbofán tarda tres segundos en
 * despertar. Ese retardo es real y es lo que hace que un avión de línea se
 * vuele con paciencia, adelantándose. Que la aguja tarde no es un defecto del
 * dibujo: **es la lección**. Ver `TARDA_EL_MOTOR` en `ui/cinta.ts`.
 */
let agujas: number[] = [];

/** Lo llama el refresco, una vez por imagen y antes de pintar. */
function medirLoQueTarda(d: DatosDeCabina, dt: number): void {
  const kt = d.velocidad * NUDOS;
  if (dt > 0 && nudosAntes !== null) {
    aceleraActual = conRetardo(aceleraActual, (kt - nudosAntes) / dt, dt, 0.5);
  }
  nudosAntes = kt;
  const tau =
    TARDA_EL_MOTOR[d.cuadro.queMarca as keyof typeof TARDA_EL_MOTOR] ?? 1;
  if (agujas.length !== d.motores.length) {
    agujas = d.motores.map(() => 0);
  }
  for (let i = 0; i < agujas.length; i++) {
    agujas[i] = conRetardo(agujas[i]!, d.motores[i] ?? 0, dt, tau);
  }
}

/**
 * La pantalla de navegación: la rosa entera, y el avión en el centro.
 *
 * Gira la carta, no el avión: lo que se mueve es el mundo. Es la forma de leer
 * un rumbo sin saber leer — «lo que tengas delante es hacia donde vas»— y es
 * la misma rosa que la del cuadro del HUD, con las mismas cifras aeronáuticas:
 * «3» por treinta grados, «21» por doscientos diez.
 *
 * Y el variómetro **ya no está aquí**: estaba en esta pantalla y también en la
 * de al lado, y dos veces el mismo instrumento en la misma cabina es la clase
 * de cosa que hace dudar de los dos. Vive con la cinta de altitud, que es de
 * donde no se despega.
 */
function pintarRumbo(g: CanvasRenderingContext2D, d: DatosDeCabina): void {
  g.save();
  g.fillStyle = FONDO;
  g.fillRect(0, 0, ANCHO, ALTO);

  const grados = magnetico(d);
  const cx = ANCHO / 2;
  const cy = ALTO * 0.54;
  const r = Math.min(ANCHO / 2 - 30, cy - 34, ALTO - cy - 26);

  /*
   * **La carta gira con el rumbo verdadero, no con el magnético.**
   *
   * El mundo está en grados verdaderos —la pista, el terreno, todo— y la rosa
   * de rumbos en magnéticos, que es lo que lee un piloto. Girando el mapa con
   * el magnético, la pista sale desviada por la declinación del sitio: poco,
   * unos grados, pero es exactamente el fallo de mezclar dos referencias para
   * un mismo ángulo, y en un aeródromo con mucha declinación se convierte en
   * un eje de entrada que no lleva a la pista. Cada uno con el suyo, y la
   * diferencia entre los dos es la declinación — que es lo correcto: una pista
   * rotulada 07 cae bajo el 07 de la rosa.
   */
  pintarLaCarta(g, d, cx, cy, r);

  g.save();
  g.translate(cx, cy);
  g.rotate((-grados * Math.PI) / 180);
  g.fillStyle = "rgba(0, 0, 0, 0.35)";
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  for (let a = 0; a < 360; a += 5) {
    const rad = (a * Math.PI) / 180;
    const larga = a % 10 === 0;
    const r1 = r - (larga ? 12 : 7);
    g.strokeStyle = TINTA;
    g.lineWidth = larga ? 2 : 1.2;
    g.beginPath();
    g.moveTo(Math.sin(rad) * r1, -Math.cos(rad) * r1);
    g.lineTo(Math.sin(rad) * r, -Math.cos(rad) * r);
    g.stroke();
    if (a % 30 === 0) {
      const letra =
        a === 0
          ? "N"
          : a === 90
            ? "E"
            : a === 180
              ? "S"
              : a === 270
                ? "W"
                : String(a / 10);
      g.save();
      g.translate(Math.sin(rad) * (r - 28), -Math.cos(rad) * (r - 28));
      g.rotate((grados * Math.PI) / 180);
      escribir(g, letra, 0, 0, "500 17px " + FUENTE, TINTA);
      g.restore();
    }
  }
  g.restore();

  // La línea de fe, arriba, que es contra la que se lee la carta.
  g.strokeStyle = SIMBOLO;
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(cx, cy - r - 8);
  g.lineTo(cx, cy - r + 10);
  g.stroke();

  // El avión, quieto en el centro y mirando siempre arriba.
  g.strokeStyle = SIMBOLO;
  g.lineWidth = 4;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx, cy - 20);
  g.lineTo(cx, cy + 22);
  g.moveTo(cx - 20, cy + 4);
  g.lineTo(cx + 20, cy + 4);
  g.moveTo(cx - 9, cy + 20);
  g.lineTo(cx + 9, cy + 20);
  g.stroke();
  g.lineCap = "butt";

  // Y el rumbo en cifras, arriba, con su rótulo debajo.
  caja(g, cx - 36, 24, 72, 30);
  escribir(
    g,
    String(Math.round(((grados % 360) + 360) % 360)).padStart(3, "0"),
    cx,
    24,
    "600 24px " + FUENTE,
    TINTA,
  );
  escribir(g, "HDG", cx, 48, "500 11px " + FUENTE, TENUE);
  escribir(
    g,
    `GS ${Math.round(d.sobreElSuelo * NUDOS)}`,
    12,
    22,
    "500 15px " + FUENTE,
    PALETA.auxiliar,
    "left",
  );
  /*
   * **Y adónde vas, que es de lo que va esta pantalla.**
   *
   * La ruta en magenta —lo que quiero— y la distancia en millas, que es como
   * se mide una distancia en el aire en todo el mundo. Y el viento en cian, de
   * dónde sopla y cuánto: es el dato que decide por qué cabecera se aterriza,
   * y hasta hoy solo estaba en el panel del tiempo.
   */
  if (d.objetivo) {
    const rel = ((d.objetivo.rumbo * 180) / Math.PI - grados) * (Math.PI / 180);
    g.strokeStyle = PALETA.objetivo;
    g.lineWidth = 3;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.sin(rel) * r * 0.92, cy - Math.cos(rel) * r * 0.92);
    g.stroke();
    g.lineCap = "butt";
    escribir(
      g,
      `${d.objetivo.distancia < 0 ? "" : ""}${(d.objetivo.distancia / 1852).toFixed(1)} NM`,
      ANCHO - 12,
      22,
      "500 15px " + FUENTE,
      PALETA.auxiliar,
      "right",
    );
  }
  /*
   * **Y a cuánto está la pista, que es lo que se preguntó jugando.**
   *
   * «¿Por qué no tengo datos como distancia al aeropuerto?» Estaba solo cuando
   * había una misión en curso con su objetivo; sin misión, la pantalla no
   * decía a qué distancia estaba tu propia casa. Sale del mismo sitio que el
   * rango de la carta —`millasHasta`— para que la cifra y el dibujo no puedan
   * discrepar: una carta que dice «4,0 NM» con la pista fuera del cristal es
   * peor que una carta sin cifra.
   */
  if (!d.objetivo && d.mapa?.pista) {
    escribir(
      g,
      `${millasHasta(d.mapa.pista, d.mapa).toFixed(1)} NM`,
      ANCHO - 12,
      22,
      "500 15px " + FUENTE,
      TINTA,
      "right",
    );
  }
  if (d.viento) {
    /*
     * **El viento, como una flecha y no como una cifra.**
     *
     * «090/18» no se lee a los cuatro años, y es el dato que decide por qué
     * cabecera se aterriza. La flecha apunta **hacia donde sopla** —que es
     * hacia donde te empuja— y gira con la carta, así que se ve de un vistazo
     * si viene de frente o de cola. La cifra sigue ahí desde el tercer
     * peldaño, para quien ya lee.
     */
    const haciaDonde = ((d.viento.desde + 180 - grados) * Math.PI) / 180;
    const fx = cx - r - 4;
    const fy = ALTO - 40;
    const largo = 20;
    const px = Math.sin(haciaDonde) * largo;
    const py = -Math.cos(haciaDonde) * largo;
    g.strokeStyle = PALETA.auxiliar;
    g.lineWidth = 2.5;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(fx - px, fy - py);
    g.lineTo(fx + px, fy + py);
    g.stroke();
    // La punta, que es lo que dice hacia dónde.
    const ala = 7;
    for (const lado of [-1, 1]) {
      const a = haciaDonde + lado * 2.5;
      g.beginPath();
      g.moveTo(fx + px, fy + py);
      g.lineTo(fx + px + Math.sin(a) * ala, fy + py - Math.cos(a) * ala);
      g.stroke();
    }
    g.lineCap = "butt";
    escribir(
      g,
      `${String(Math.round(d.viento.desde)).padStart(3, "0")}/${Math.round(d.viento.nudos)}`,
      12,
      ALTO - 14,
      "500 14px " + FUENTE,
      PALETA.auxiliar,
      "left",
    );
  }
  g.restore();
}

/**
 * El EICAS: qué están haciendo los motores, los flaps y el tren.
 *
 * **Los instrumentos de motor tienen que ser aburridos.** Verdes y quietos el
 * noventa y nueve por ciento del tiempo; solo hablan cuando algo se sale de
 * rango. Esa quietud es lo que separa una cabina de línea de una máquina
 * recreativa, y es la razón de que aquí no parpadee nada porque sí.
 *
 * Y una aguja por motor, en fila, porque lo que se mira de cuatro motores no
 * es cuánto da cada uno: es **si dan lo mismo**. Cuatro columnas de N1 es al
 * grande lo que la joroba al fuselaje.
 */
function pintarMotores(g: CanvasRenderingContext2D, d: DatosDeCabina): void {
  g.save();
  g.fillStyle = FONDO;
  g.fillRect(0, 0, ANCHO, ALTO);

  const n = Math.max(1, d.motores.length);
  const hueco = ANCHO - 28;
  const paso = hueco / n;
  const r = Math.min(paso / 2 - 8, 74);
  const cy = 40 + r;
  escribir(g, d.rotuloDeMotor, ANCHO / 2, 20, "500 15px " + FUENTE, TENUE);

  for (let i = 0; i < n; i++) {
    const cx = 14 + paso * (i + 0.5);
    dialDeMotor(g, cx, cy, r, i + 1, agujas[i] ?? 0, d.motores[i] ?? 0);
  }

  /*
   * Y lo que se le ha **pedido** a cada motor, debajo de lo que está dando.
   * Es la lección entera de un reactor en una fila de barras: el mando se
   * mueve al momento y la aguja tarda tres segundos en alcanzarlo.
   */
  const yMando = cy + r + 44;
  escribir(g, "MANDO", ANCHO / 2, yMando - 12, "500 11px " + FUENTE, TENUE);
  for (let i = 0; i < n; i++) {
    const ancho = Math.min(paso - 22, 86);
    const bx = 14 + paso * (i + 0.5) - ancho / 2;
    ventana(g, bx, yMando, ancho, 10);
    g.fillStyle = PALETA.objetivo;
    g.fillRect(bx, yMando, ancho * clamp01(d.motores[i] ?? 0), 10);
  }

  reglaDeFlaps(g, 48, ALTO - 74, ANCHO - 96, 18, d.flaps);
  lucesDeTren(g, 16, ALTO - 30, d.patas, d.tren);
  g.restore();
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Un dial de motor: arco de doscientos cuarenta grados, aguja blanca, la marca
 * roja del límite, la banda ámbar del último tramo y el bug magenta de lo que
 * se le ha pedido. Debajo, la cifra.
 */
function dialDeMotor(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  numero: number,
  da: number,
  pide: number,
): void {
  const INICIO = -120;
  const RECORRIDO = 240;
  const rad = (f: number) => ((INICIO + f * RECORRIDO) * Math.PI) / 180;
  const punto = (f: number, rr: number): [number, number] => [
    cx + Math.sin(rad(f)) * rr,
    cy - Math.cos(rad(f)) * rr,
  ];

  g.fillStyle = "#05070a";
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#2c3136";
  g.lineWidth = 1;
  g.stroke();

  const arco = (desde: number, hasta: number, color: string) => {
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(cx, cy, r - 4, rad(desde) - Math.PI / 2, rad(hasta) - Math.PI / 2);
    g.stroke();
  };
  arco(0, 0.95, PALETA.normal);
  arco(0.95, 1, PALETA.precaucion);

  g.strokeStyle = TINTA;
  for (let k = 0; k <= 10; k++) {
    const rr = k % 5 === 0 ? r - 12 : r - 8;
    const [x1, y1] = punto(k / 10, rr);
    const [x2, y2] = punto(k / 10, r);
    g.lineWidth = k % 5 === 0 ? 2 : 1.2;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }

  // El límite, en rojo, al final del recorrido.
  g.strokeStyle = PALETA.limite;
  g.lineWidth = 3;
  const [lx1, ly1] = punto(1, r - 14);
  const [lx2, ly2] = punto(1, r + 2);
  g.beginPath();
  g.moveTo(lx1, ly1);
  g.lineTo(lx2, ly2);
  g.stroke();

  // Lo que se le ha pedido, en magenta: magenta es siempre «lo que quiero».
  g.save();
  g.translate(cx, cy);
  g.rotate(rad(clamp01(pide)));
  g.fillStyle = PALETA.objetivo;
  g.beginPath();
  g.moveTo(0, -r - 2);
  g.lineTo(-5, -r - 11);
  g.lineTo(5, -r - 11);
  g.closePath();
  g.fill();
  g.restore();

  // Y la aguja, con lo que está dando.
  g.save();
  g.translate(cx, cy);
  g.rotate(rad(clamp01(da)));
  g.fillStyle = da > 0.95 ? PALETA.precaucion : TINTA;
  g.beginPath();
  g.moveTo(-3, 0);
  g.lineTo(-2, -r * 0.74);
  g.lineTo(0, -r * 0.84);
  g.lineTo(2, -r * 0.74);
  g.lineTo(3, 0);
  g.closePath();
  g.fill();
  g.restore();
  g.fillStyle = "#2a2f35";
  g.beginPath();
  g.arc(cx, cy, 4, 0, Math.PI * 2);
  g.fill();

  escribir(g, String(numero), cx, cy + 4, "500 12px " + FUENTE, TENUE);
  escribir(
    g,
    String(Math.round(da * 100)),
    cx,
    cy + r + 18,
    "600 22px " + FUENTE,
    TINTA,
  );
}

/**
 * La regla de flaps, con sus cuatro detentes y su puntero.
 *
 * Cuatro muescas y un puntero que se para en ellas, igual que la palanca de
 * verdad — que no es un mando continuo, es una palanca con topes, y eso se
 * aprende viéndolo.
 */
function reglaDeFlaps(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  flaps: number,
): void {
  escribir(g, "FLAP", x - 8, y + h / 2, "500 12px " + FUENTE, TENUE, "right");
  ventana(g, x, y, w, h);
  for (let k = 0; k <= 3; k++) {
    const xx = x + (k / 3) * w;
    g.strokeStyle = TINTA;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(xx, y);
    g.lineTo(xx, y + h);
    g.stroke();
    escribir(g, String(k * 10), xx, y + h + 12, "500 11px " + FUENTE, TENUE);
  }
  const px = x + clamp01(flaps) * w;
  g.fillStyle = TINTA;
  g.beginPath();
  g.moveTo(px, y - 3);
  g.lineTo(px - 6, y - 12);
  g.lineTo(px + 6, y - 12);
  g.closePath();
  g.fill();
}

/**
 * Las luces del tren. **Verde solo cuando está abajo y trabado.**
 *
 * Tres estados y no dos, y el de en medio es el que enseña: dentro, moviéndose
 * y fuera. Un tren tarda diez segundos en salir, y una luz verde con el tren a
 * medio camino es la clase de mentira que en un avión de verdad se paga cara.
 * Ver `flight/tren.ts`.
 *
 * Tres luces en toda la flota y **cinco en el grande**: un 747 tiene cinco
 * patas, y quien las cuente va a sonreír.
 *
 * ## Y son ruedas, no cuadraditos
 *
 * Eran tres rectángulos de catorce por catorce en una esquina, con la palabra
 * «GEAR» al lado y esa palabra solo desde el tercer peldaño: en los dos
 * peldaños de abajo, el indicador del tren era **tres cuadrados grises sin
 * nombre**. Pasó lo que tenía que pasar — «¿en qué parte del panel veo que se
 * está poniendo o quitando?». Una rueda con su llanta se reconoce sin saber
 * leer, que es la regla de la casa para el primer peldaño; y más grandes,
 * porque esto es una de las tres cosas que hay que mirar antes de tocar el
 * suelo. Igual que en el cuadro plano: ver `lucesDeTren` en `ui/cristal.ts`.
 */
function lucesDeTren(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  patas: number,
  donde: number,
): void {
  const luz = luzDeTren(donde);
  const R = 9;
  const PASO = R * 2 + 6;
  for (let k = 0; k < patas; k++) {
    const cx = x + k * PASO + R;
    g.fillStyle =
      luz === "fuera"
        ? PALETA.normal
        : luz === "moviendose"
          ? PALETA.precaucion
          : PALETA.apagado;
    g.globalAlpha = luz === "dentro" ? 0.45 : 0.85;
    g.beginPath();
    g.arc(cx, y + R, R, 0, Math.PI * 2);
    g.fill();
    // El hueco de la llanta, del color del fondo: es lo que la vuelve una
    // rueda y no un punto, y se lee igual en verde, en ámbar y apagada.
    g.globalAlpha = 1;
    g.fillStyle = FONDO;
    g.beginPath();
    g.arc(cx, y + R, R * 0.42, 0, Math.PI * 2);
    g.fill();
  }
  escribir(
    g,
    "GEAR",
    x + patas * PASO + 4,
    y + R,
    "500 12px " + FUENTE,
    TENUE,
    "left",
  );
}

/**
 * La carta: el mundo debajo de la rosa de rumbos.
 *
 * Lo que convierte una brújula grande en una pantalla de navegación. Se dibuja
 * **antes** que la rosa y que el avión, para que esos dos queden encima: lo
 * que hay que leer primero es dónde estoy yo, y lo de debajo es el sitio.
 *
 * Por orden de lo que enseña:
 *
 * 1. **Los anillos de distancia**, con su cifra desde el tercer peldaño. Antes
 *    eran dos arcos de puntos sin número: daban «sensación de distancia», que
 *    es otra manera de decir que no medían nada.
 * 2. **La pista, con su forma y en su sitio.** No un punto: sus dos cabeceras,
 *    su largo de verdad y su rumbo de verdad. Es lo que enseña a mirar por la
 *    ventana en la dirección correcta.
 * 3. **El eje de entrada**, ocho millas de final prolongado desde la cabecera
 *    en uso. Es la línea por la que hay que venir, y verla dibujada es la
 *    mitad de aprender a aproximarse.
 * 4. **Los otros aviones**, los que se oyen por la radio. Ver `trafico.ts`.
 *
 * Y el rango se elige solo, para que la pista quepa siempre. Ver `rangoPara`.
 */
function pintarLaCarta(
  g: CanvasRenderingContext2D,
  d: DatosDeCabina,
  cx: number,
  cy: number,
  r: number,
): void {
  const m = d.mapa;
  /*
   * **Y la cuenta es la de `ui/carta.ts`, no una copia.**
   *
   * Estaba resuelta aquí dentro, y cuando el cuadro plano tuvo que dibujar lo
   * mismo la copia era inevitable: dos superficies, dos versiones de dónde
   * está la pista. El dibujo sí es distinto —aquí lienzo, allí SVG— pero
   * **dónde va cada cosa, no**.
   */
  const dibujo = dibujarLaCarta(m ?? null, (d.rumbo * 180) / Math.PI, r);

  // ── Los anillos, con su cifra ──
  g.strokeStyle = "#2c3136";
  g.setLineDash([3, 6]);
  g.lineWidth = 1;
  for (const f of [0.5, 1]) {
    g.beginPath();
    g.arc(cx, cy, r * f, 0, Math.PI * 2);
    g.stroke();
  }
  g.setLineDash([]);
  /*
   * La cifra del rango, **fuera de la rosa**. Puesta dentro caía encima de las
   * marcas de grados y lo que se leía era «5 NM» tachado por cuatro rayas.
   */
  escribir(
    g,
    `${dibujo.rango} NM`,
    ANCHO - 14,
    ALTO - 14,
    "500 12px " + FUENTE,
    TENUE,
    "right",
  );

  if (!m) return;

  // Todo lo del mundo se recorta al círculo de la rosa: una pista que asome
  // por fuera del cristal deja de ser una carta y pasa a ser una mancha.
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();

  if (dibujo.eje) {
    g.strokeStyle = PALETA.objetivo;
    g.lineWidth = 1.5;
    g.setLineDash([6, 5]);
    g.beginPath();
    g.moveTo(cx + dibujo.eje.desde.dx, cy + dibujo.eje.desde.dy);
    g.lineTo(cx + dibujo.eje.hasta.dx, cy + dibujo.eje.hasta.dy);
    g.stroke();
    g.setLineDash([]);
  }
  if (dibujo.pista) {
    // La pista, gorda y blanca: es lo único sólido de la carta.
    const [pa, pb] = dibujo.pista;
    g.strokeStyle = TINTA;
    g.lineWidth = 7;
    g.lineCap = "butt";
    g.beginPath();
    g.moveTo(cx + pa.dx, cy + pa.dy);
    g.lineTo(cx + pb.dx, cy + pb.dy);
    g.stroke();
  }

  /*
   * **Y los otros, con la forma con la que se dibuja un tráfico.**
   *
   * Un rombo hueco, que es el símbolo de toda la vida. No llevan cifra ni al
   * peldaño de arriba: lo que hay que aprender de ellos es que están, y que
   * son los mismos que se acaban de oír por la radio.
   */
  for (const p of dibujo.otros) {
    const lado = 6;
    g.strokeStyle = PALETA.auxiliar;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(cx + p.dx, cy + p.dy - lado);
    g.lineTo(cx + p.dx + lado, cy + p.dy);
    g.lineTo(cx + p.dx, cy + p.dy + lado);
    g.lineTo(cx + p.dx - lado, cy + p.dy);
    g.closePath();
    g.stroke();
  }

  g.restore();
}
