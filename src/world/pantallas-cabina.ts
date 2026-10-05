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

import { CIFRAS_DE_AVISO_DESDE } from "../flight/escalera";
import {
  Box3,
  CanvasTexture,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
  type Mesh,
} from "three";
import { PALETA } from "../ui/paleta";
import { AVISO_DE_CABINA } from "../flight/despresurizacion";
import { anillosDe, type Eco } from "../flight/tormentas";
import { bienPuesta } from "../flight/altimetro";
import { temperaturaExterior, type Aire } from "../flight/atmosphere";

/**
 * De cada escalón del radar a su color.
 *
 * Son los de siempre en cualquier radar meteorológico y no se cambian por
 * «bajo, medio, alto»: quien pilote de verdad va a ver exactamente estos.
 */
const COLOR_DEL_ECO: Record<Exclude<Eco, "nada">, string> = {
  verde: PALETA.normal,
  ambar: PALETA.precaucion,
  rojo: PALETA.limite,
  magenta: PALETA.objetivo,
};
import { luzDeTren } from "../flight/tren";
import { parteDeLaBarra } from "../flight/velocidades-en-tierra";
import { RODAR } from "../ui/cristal";
import {
  COLUMNAS_DEL_FMA,
  DURA_EL_RESALTE,
  PARPADEA_AL_CAMBIAR,
  luceLaVentanilla,
  type Resalte,
  type Resaltes,
} from "../flight/lo-que-cambia";
import { PUNTOS_A_FONDO, type PerfilEnElCuadro } from "../flight/perfil-vertical";
import { enLaMuesca } from "../flight/flaps";
import {
  QUIETA_LA_ALTITUD,
  QUIETA_LA_VELOCIDAD,
  TARDA_EL_MOTOR,
  conRetardo,
  marcasDeCinta,
  rodillo,
  tendencia,
} from "../ui/cinta";
import {
  NUDOS,
  PIES,
  PIES_POR_MINUTO,
  bandasDeVelocidad,
  COLOR_DE_ARCO,
  type Cuadro,
} from "../ui/cuadro";
import {
  ASPECTO_DEL_RELIEVE,
  dibujarLaCarta,
  millasHasta,
  pixelesPorMetro,
  type Mapa,
} from "../ui/carta";
import {
  CIFRAS_DESDE,
  LETRAS_DESDE,
  apunta,
  desdePara,
  empiezaElRepintado,
  loEscrito,
  type Peldano,
} from "../ui/familia";
import { SURTIDOR } from "../ui/surtidor";

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
/** Dato auxiliar: viento, velocidad respecto al suelo, reglaje del altímetro. */
const AUXILIAR = PALETA.auxiliar;
/** Lo que hay que mirar sin que nada se haya roto. */
const PRECAUCION = PALETA.precaucion;

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
  /**
   * A qué altura está **la cabina**, m.
   *
   * No es la del avión: un presurizado va a diez mil metros con la cabina a
   * dos mil cuatrocientos, y eso es lo único que separa a quien va dentro de
   * un aire que no se respira. Ver `flight/cabina-presurizada.ts`.
   */
  readonly cabina: number;
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
  /**
   * **En tierra, rodando**: la GS en nudos, el fondo de su barra y si se va
   * rápido para lo que viene. La misma que el cuadro plano. Ver
   * `rodajeEnTierra` en `ui/cristal.ts`.
   */
  readonly rodaje?: {
    readonly nudos: number;
    readonly escala: number;
    /** La velocidad que toca aquí, nudos: la marca. Ver `barraDeRodaje`. */
    readonly toca: number;
    readonly rapido: boolean;
  } | null;
  /**
   * El número de Mach, o `null` si este avión no lo enseña.
   *
   * Lo enseñaba el cuadro plano de los reactores, debajo de la cinta de
   * velocidad, y la pantalla de la cabina no: el mismo avión con una lectura
   * de menos dentro.
   */
  readonly mach?: number | null;
  /**
   * El aire del día, para la temperatura de fuera: la del parte abajo, y
   * bajando hasta la estándar en la tropopausa. Sin él, la estándar. Ver
   * `atmosphere.ts`.
   */
  readonly aire?: Aire;
  /**
   * Lo más rápido que se puede ir con lo que se lleva sacado, en nudos, o
   * `Infinity` si no se lleva nada: lo que baja la banda roja de la cinta. De
   * la misma cuenta que el cuadro plano; ver `topeDeLoSacado`.
   */
  readonly topeKt?: number;
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
   * El depósito: lo que queda, lo que cabe y dónde empieza la reserva.
   *
   * Lo mismo que recibe el cuadro plano y de la misma cuenta. Ver
   * `flight/combustible.ts` — y ver también por qué llega a las dos: un
   * instrumento que existe fuera y no dentro es el fallo que esta casa lleva
   * cometido media docena de veces.
   */
  readonly combustible: {
    readonly kilos: number;
    readonly cabe: number;
    readonly reserva: number;
    readonly estado: "bien" | "reserva" | "poco";
  } | null;
  /**
   * La ventanilla de presión del altímetro, hPa.
   *
   * Y va en las dos superficies por lo mismo que el depósito: un instrumento
   * que existe en el cuadro plano y no dentro de la cabina es el fallo que
   * esta casa lleva cometido media docena de veces. Ver `flight/altimetro.ts`.
   */
  readonly presion: {
    readonly puesta: number;
    readonly delSitio: number;
  } | null;
  /**
   * **El mundo, para poder dibujarlo.**
   *
   * Sin esto la pantalla de navegación era una brújula sobre un fondo vacío:
   * giraba, y ya. Con dónde estoy, dónde está la pista y quién más anda por
   * aquí, pasa a ser lo que dice su nombre — una carta. Ver `ui/carta.ts`.
   *
   * Y es **el mismo tipo** que recibe el cuadro plano. Aquí había una copia
   * recortada, y el día que los tráficos pasaron a llevar lo que dice el TCAS
   * la copia se habría quedado con los rombos de antes.
   */
  readonly mapa: Mapa | null;
  /**
   * **La ventanilla ALT del automático**, la misma que el cuadro plano: la
   * altura pedida, en pies, y lo que dice el avisador. `null` si el avión no
   * la lleva o no hay ninguna. Ver `flight/altitud-seleccionada.ts`.
   */
  readonly ventanilla?: {
    readonly pies: number;
    readonly alerta: "nada" | "cerca" | "fuera";
    /** Si la cinta la marca. Ver `DatosDelTablero.ventanilla`. */
    readonly enLaCinta?: boolean;
  } | null;
  /**
   * **La velocidad que toca y lo que hace el automático**, los mismos que el
   * cuadro plano: la muesca de la cinta y el FMA de los de línea. Ver
   * `DatosDelTablero.spd` y `.fma` en `ui/tablero.ts`.
   */
  readonly spd?: { readonly kt: number; readonly mach: number | null } | null;
  readonly fma?: {
    readonly gases: string;
    readonly lateral: string;
    readonly vertical: string;
    readonly piloto: boolean;
  } | null;
  /**
   * **Lo que acaba de cambiar**, lo mismo que el cuadro plano: la ventanilla
   * ALT y las marcas parpadean y los modos del FMA se recuadran. Ver
   * `flight/lo-que-cambia.ts`.
   */
  readonly resaltes?: Resaltes | null;
  /**
   * **Los mínimos puestos**, los mismos que el cuadro plano: la altitud de
   * decisión en pies y si ya se ha llegado a ella. Ver `DatosDelTablero.minimos`
   * en `ui/tablero.ts`.
   */
  readonly minimos?: { readonly pies: number; readonly enEllos: boolean } | null;
  /**
   * **La cota de la pista a la que se va**, pies, o `null`: la cinta de
   * altitud pinta ahí la pista, con el suelo debajo, y bajo la cinta va la
   * cifra con su dibujo. Ver `Game.cotaParaLaCinta`.
   */
  readonly cotaDeLaPista?: number | null;
  /**
   * **La senda a la vista**, la misma que el cuadro plano: el rombo del
   * desvío, la marca del ritmo y el arco verde, en el avión que los lleva.
   * Ver `DatosDelTablero.perfil` y `flight/perfil-vertical.ts`.
   */
  readonly perfil?: PerfilEnElCuadro | null;
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
  // Y en sRGB, que es en lo que pinta un lienzo: ver `relojes-cabina.ts`.
  textura.colorSpace = SRGBColorSpace;
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

/**
 * **La última carta que se pintó en la cabina**, ya en píxeles: para el banco
 * del radar, que comprueba que el tráfico sale en su sitio también en el
 * lienzo y no solo en el cuadro plano. `null` si no se ha pintado ninguna.
 */
let ultimaCarta: ReturnType<typeof dibujarLaCarta> | null = null;
export function ultimaCartaDeLaCabina(): ReturnType<typeof dibujarLaCarta> | null {
  return ultimaCarta;
}

function escribir(
  g: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  fuente: string,
  color: string,
  alineado: CanvasTextAlign = "center",
  filo: string | null = null,
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
  // Y con un filo del color del fondo, si se pide: lo que se pinta encima de
  // una línea —el T/D sobre la ruta magenta— se lee despegado de ella.
  if (filo) {
    g.strokeStyle = filo;
    g.lineWidth = 4;
    g.lineJoin = "round";
    g.strokeText(texto, 0, 0);
  }
  g.fillText(texto, 0, 0);
  g.restore();
}

/**
 * **El surtidor, donde irá FUEL mientras no se lee.** Los kilos salen desde el
 * primer peldaño y su rótulo desde el tercero: en medio, la cifra quedaba
 * sola. El mismo dibujo que el cuadro plano. Ver `ui/surtidor.ts`.
 */
function surtidorEnLugarDeFuel(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  lado: number,
): void {
  if (peldanoDeAhora >= LETRAS_DESDE) return;
  const k = lado / 24;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.fillStyle = TENUE;
  g.fill(new Path2D(SURTIDOR.cuerpo));
  g.fill(new Path2D(SURTIDOR.base));
  g.fillStyle = FONDO;
  const h = SURTIDOR.hueco;
  g.fillRect(h.x, h.y, h.ancho, h.alto);
  g.strokeStyle = TENUE;
  g.lineWidth = 1.7;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.stroke(new Path2D(SURTIDOR.manguera));
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
  /*
   * **El de cristal lleva la rosa dentro del horizonte, y no la cinta.**
   *
   * Es la pantalla de vuelo de un cristal de aviación general: el horizonte
   * con su rosa de rumbos en el tercio de abajo, y el mapa en la otra
   * pantalla. Así es el cuadro plano de este avión —`pantallaDeActitud` con
   * `rosa`— y aquí dentro llevaba la cinta de rumbo de los de línea: el mismo
   * avión con dos pantallas de vuelo distintas.
   */
  const conRosa = d.cuadro.familia === "cristal";
  const alto = conRosa ? ALTO - 24 : ALTO_CINTAS;
  horizonteDe(g, x0, 0, anchoAct, alto, d);
  cintaDeVelocidad(g, 0, 0, CINTA, alto, d);
  cintaDeAltitud(g, ANCHO - VSI - CINTA, 0, CINTA, alto, d);
  variometro(g, ANCHO - VSI, 0, VSI, alto, d);
  if (conRosa) {
    const rr = Math.min(anchoAct / 2 - 10, 76);
    pintarRosa(g, x0 + anchoAct / 2, alto - rr - 10, rr, magnetico(d), true);
  } else {
    cintaDeRumbo(g, x0, ALTO_CINTAS, anchoAct, RUMBO_ABAJO, d);
  }
  radioaltimetro(g, x0 + anchoAct / 2, alto - 34, d);
  /*
   * **Los mínimos puestos**, arriba a la derecha del horizonte y debajo del
   * FMA: «BARO» y la altitud de decisión, verdes, y ámbar al llegar a ella.
   * Con las letras, desde el tercer peldaño, como en el cuadro plano. Ver
   * `minimos` en `ui/cristal.ts`.
   */
  if (d.minimos && d.peldano >= 3) {
    const color = d.minimos.enEllos ? PALETA.precaucion : PALETA.normal;
    const y = d.cuadro.familia === "linea" ? 46 : 16;
    // Con su filo oscuro: van encima del cielo del horizonte.
    escribir(g, "BARO", x0 + anchoAct - 8, y, "600 11px " + FUENTE, color, "right", FONDO);
    escribir(g, String(d.minimos.pies), x0 + anchoAct - 8, y + 17, "600 16px " + FUENTE, color, "right", FONDO);
  }
  /*
   * **El FMA de los de línea**, como en el cuadro plano: arriba del
   * horizonte, lo que hace cada mano del automático, con las letras desde el
   * tercer peldaño. Ver `fma` en `ui/cristal.ts`.
   */
  if (d.cuadro.familia === "linea" && d.fma && d.peldano >= 3) {
    g.fillStyle = "rgba(5, 7, 10, 0.82)";
    g.fillRect(x0, 0, anchoAct, 30);
    const tercio = anchoAct / 3;
    const columnas = [d.fma.gases, d.fma.lateral, d.fma.vertical];
    columnas.forEach((texto, i) => {
      if (texto)
        escribir(g, texto, x0 + tercio * i + tercio / 2, 11, "600 12px " + FUENTE, PALETA.normal);
    });
    // Y el modo nuevo, recuadrado sus diez segundos. Ver `flight/lo-que-cambia.ts`.
    COLUMNAS_DEL_FMA.forEach((col, i) => {
      const r = d.resaltes?.[`fma-${col}`];
      if (!r || r.edad >= DURA_EL_RESALTE || !columnas[i]) return;
      g.strokeStyle = TINTA;
      g.lineWidth = 1.5;
      g.strokeRect(x0 + tercio * i + 2, 2, tercio - 4, 18);
    });
    if (d.fma.piloto)
      escribir(g, "A/P", x0 + anchoAct / 2, 24, "600 11px " + FUENTE, PALETA.normal);
  }
  // El Mach, en el peldaño de arriba y a partir de 0,40, como en el cuadro
  // plano: por debajo no dice nada que no diga ya la velocidad.
  if (d.mach != null && d.mach >= 0.4 && d.peldano >= 4)
    escribir(
      g,
      `M ${d.mach.toFixed(2).slice(1)}`,
      CINTA / 2,
      ALTO - 10,
      "500 14px " + FUENTE,
      PALETA.auxiliar,
    );
  g.restore();
}

/**
 * La rosa de rumbos: gira la carta, no el avión, porque lo que se mueve es el
 * mundo. **La misma en la pantalla de navegación y dentro del horizonte** del
 * de cristal, como en el cuadro plano: ver `rosaDeRumbo` en `ui/cristal.ts`.
 */
function pintarRosa(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  grados: number,
  conAvion: boolean,
): void {
  g.save();
  g.translate(cx, cy);
  g.rotate((-grados * Math.PI) / 180);
  g.fillStyle = "rgba(0, 0, 0, 0.35)";
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  const letra = Math.max(11, Math.round(r * 0.12));
  for (let a = 0; a < 360; a += 5) {
    const rad = (a * Math.PI) / 180;
    const larga = a % 10 === 0;
    const r1 = r - (larga ? r * 0.08 : r * 0.047);
    g.strokeStyle = TINTA;
    g.lineWidth = larga ? 2 : 1.2;
    g.beginPath();
    g.moveTo(Math.sin(rad) * r1, -Math.cos(rad) * r1);
    g.lineTo(Math.sin(rad) * r, -Math.cos(rad) * r);
    g.stroke();
    if (a % 30 === 0) {
      const texto =
        a === 0
          ? "N"
          : a === 90
            ? "E"
            : a === 180
              ? "S"
              : a === 270
                ? "W"
                : String(a / 10);
      /*
       * De canto, mirando hacia fuera, como la rosa del cuadro plano y la de
       * cualquier pantalla de navegación: la de arriba, derecha. Ver
       * `rosaDeRumbo` en `ui/cristal.ts`.
       */
      g.save();
      g.translate(Math.sin(rad) * r * 0.81, -Math.cos(rad) * r * 0.81);
      g.rotate(rad);
      escribir(g, texto, 0, 0, `500 ${letra}px ` + FUENTE, TINTA);
      g.restore();
    }
  }
  g.restore();

  // La línea de fe, arriba, que es contra la que se lee la carta.
  g.strokeStyle = SIMBOLO;
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(cx, cy - r - 6);
  g.lineTo(cx, cy - r + 8);
  g.stroke();

  if (!conAvion) return;
  // El avioncito, quieto en el centro y mirando siempre arriba.
  g.lineWidth = 3;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx, cy - 12);
  g.lineTo(cx, cy + 12);
  g.moveTo(cx - 10, cy + 4);
  g.lineTo(cx + 10, cy + 4);
  g.moveTo(cx - 5, cy + 12);
  g.lineTo(cx + 5, cy + 12);
  g.stroke();
  g.lineCap = "butt";
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

  escalaDeLaSenda(g, x + w - 14, cy, h * 0.085, d);

  // Y la pérdida: marco rojo alrededor del horizonte, que es donde mira quien
  // ya está en apuros.
  if (d.perdida) {
    g.strokeStyle = PALETA.limite;
    g.lineWidth = 6;
    g.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }
  g.restore();
}

/**
 * **La escala de la senda**, la del cuadro plano: cuatro puntos, la raya del
 * medio y el rombo magenta de la senda, que yendo alto queda por debajo. Con
 * su rótulo —`VDEV` bajando por el plan, `G/S` en la final— desde el peldaño
 * de las letras. Ver `escalaDeLaSenda` en `ui/cristal.ts`.
 */
function escalaDeLaSenda(
  g: CanvasRenderingContext2D,
  x: number,
  cy: number,
  paso: number,
  d: DatosDeCabina,
): void {
  const puntos = d.perfil?.puntos ?? null;
  if (puntos === null) return;
  g.save();
  g.fillStyle = "rgba(5, 7, 10, 0.55)";
  g.fillRect(x - 8, cy - 2.7 * paso, 16, 5.4 * paso);
  g.strokeStyle = TINTA;
  g.lineWidth = 1.5;
  for (const k of [-2, -1, 1, 2]) {
    g.beginPath();
    g.arc(x, cy + k * paso, 3.2, 0, Math.PI * 2);
    g.stroke();
  }
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 7, cy);
  g.lineTo(x + 7, cy);
  g.stroke();
  const yy = cy + Math.max(-PUNTOS_A_FONDO, Math.min(PUNTOS_A_FONDO, puntos)) * paso;
  g.fillStyle = PALETA.objetivo;
  g.beginPath();
  g.moveTo(x, yy - 7);
  g.lineTo(x + 5.5, yy);
  g.lineTo(x, yy + 7);
  g.lineTo(x - 5.5, yy);
  g.closePath();
  g.fill();
  g.restore();
  escribir(
    g,
    d.perfil?.modo === "bajada" ? "VDEV" : "G/S",
    x,
    cy - 2.7 * paso - 8,
    "500 10px " + FUENTE,
    TENUE,
  );
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

  /*
   * Las bandas de color de la ficha, en el borde de dentro: **las mismas** que
   * la cinta del cuadro plano y que los arcos de la esfera, de la misma
   * cuenta. El blanco de los flaps por dentro del verde, que se solapan.
   */
  for (const b of bandasDeVelocidad(c)) {
    const y1 = medio + (kt - b.hasta * c.asiMax) * POR_NUDO;
    const y2 = medio + (kt - b.desde * c.asiMax) * POR_NUDO;
    g.fillStyle = COLOR_DE_ARCO[b.color];
    if (b.color === "blanco") g.fillRect(x + w - 10, y1, 4, y2 - y1);
    else g.fillRect(x + w - 5, y1, 5, y2 - y1);
  }
  /*
   * **Y la banda roja y negra, que baja con lo que se saca**: desde la placa
   * de los flaps o del tren hacia arriba, como la del cuadro plano —ver
   * `data-tope` en `ui/cristal.ts`—. Allí bajaba y aquí no, y el mismo avión
   * con los flaps de aterrizaje fuera enseñaba el límite en un sitio y la Vmo
   * en el otro. Con nada fuera se queda en la de siempre.
   */
  const tope = Math.min(c.velocidades.vne, d.topeKt ?? Infinity);
  if (tope < c.velocidades.vne) {
    const yTope = medio + (kt - tope) * POR_NUDO;
    g.fillStyle = PALETA.limite;
    g.fillRect(x + w - 5, y, 5, yTope - y);
    g.fillStyle = "#000";
    for (let yy = yTope - 5; yy > y - 5; yy -= 10) g.fillRect(x + w - 5, yy, 5, 5);
  }

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
   * **Y la velocidad que toca**, la muesca del borde de dentro: la misma del
   * cuadro plano, de la escalera de velocidades. Ver
   * `flight/escalera-de-velocidades.ts`.
   */
  if (d.spd) {
    const ys = medio + (kt - d.spd.kt) * POR_NUDO;
    g.fillStyle = PALETA.objetivo;
    g.beginPath();
    g.moveTo(x + w, ys - 7);
    g.lineTo(x + w - 9, ys - 7);
    g.lineTo(x + w - 9, ys - 3);
    g.lineTo(x + w - 5, ys);
    g.lineTo(x + w - 9, ys + 3);
    g.lineTo(x + w - 9, ys + 7);
    g.lineTo(x + w, ys + 7);
    g.closePath();
    g.fill();
    flechaDeLaMarca(g, d.resaltes?.spd, x + w - 19, ys);
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
   * Y **la pista vive a su cota**, con el suelo rayado debajo: la marca de la
   * altitud de aterrizaje de un Boeing. Vivía en el cero, que es el mar. Lo
   * mismo que el cuadro plano; ver `Tablero.cotaDeLaPista`.
   */
  const cota = d.cotaDeLaPista ?? null;
  const suelo = medio + (pies - (cota ?? 0)) * POR_PIE;
  if (suelo < y + h) {
    g.save();
    g.beginPath();
    g.rect(x + 2, suelo, w - 16, y + h - suelo);
    g.clip();
    g.strokeStyle = "rgba(138, 106, 62, 0.55)";
    g.lineWidth = 1.6;
    g.beginPath();
    for (let k = -h; k < w + h; k += 5) {
      g.moveTo(x + k, suelo);
      g.lineTo(x + k + h, suelo + h);
    }
    g.stroke();
    g.restore();
  }
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
  /*
   * **La altura de la ventanilla ALT, en la cinta**: el bug magenta en el
   * borde de dentro, aparcado en el borde si queda fuera; y en el primer
   * peldaño, una raya de lado a lado, «hasta aquí». Lo mismo que el cuadro
   * plano: ver `Tablero.ventanillaAlt`.
   */
  // Si la cinta la marca: en la final de los pequeños, no. Ver `enLaCinta`.
  const sel = d.ventanilla && d.ventanilla.enLaCinta !== false ? d.ventanilla : null;
  if (sel) {
    const yy = Math.max(y + 40, Math.min(y + h - 12, medio - (sel.pies - pies) * POR_PIE));
    g.fillStyle = PALETA.objetivo;
    g.strokeStyle = PALETA.objetivo;
    if (d.peldano <= 1) {
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, yy);
      g.lineTo(x + w, yy);
      g.stroke();
    } else {
      g.beginPath();
      g.moveTo(x, yy - 7);
      g.lineTo(x + 9, yy - 7);
      g.lineTo(x + 9, yy - 3);
      g.lineTo(x + 5, yy);
      g.lineTo(x + 9, yy + 3);
      g.lineTo(x + 9, yy + 7);
      g.lineTo(x, yy + 7);
      g.closePath();
      g.fill();
    }
    flechaDeLaMarca(g, d.resaltes?.alt, x + 19, yy);
  }
  g.restore();
  if (sel) {
    /*
     * Y arriba, la cifra en su caja: blanca al acercarse, ámbar al irse. La
     * caja avisa; los dígitos no parpadean nunca.
     */
    g.fillStyle = "#05070a";
    g.fillRect(x + 3, y + 16, w - 6, 19);
    // Y recién cambiada, el marco blanco que late. Ver `flight/lo-que-cambia.ts`.
    const cambia = luceLaVentanilla(d.resaltes?.alt, sinMovimiento());
    g.strokeStyle = cambia
      ? TINTA
      : sel.alerta === "fuera"
        ? PRECAUCION
        : sel.alerta === "cerca"
          ? TINTA
          : "#2c3136";
    g.lineWidth = cambia ? 3 : sel.alerta === "nada" ? 1 : 2.4;
    g.strokeRect(x + 3, y + 16, w - 6, 19);
    escribir(g, String(sel.pies), x + w - 7, y + 26, "600 15px " + FUENTE, PALETA.objetivo, "right");
  }
  /*
   * **Y la cota de la pista a la que se va, en grande**, abajo: el dibujo de
   * una pista y su cifra, en pies como la cinta. Ver `Game.cotaParaLaCinta`.
   */
  if (cota !== null) {
    const yb = y + h - 44;
    g.fillStyle = "rgba(5, 7, 10, 0.92)";
    g.fillRect(x + 2, yb, w - 4, 22);
    g.strokeStyle = "#2c3136";
    g.lineWidth = 1;
    g.strokeRect(x + 2, yb, w - 4, 22);
    g.fillStyle = "#6f757b";
    g.beginPath();
    g.moveTo(x + 5, yb + 19);
    g.lineTo(x + 11, yb + 3);
    g.lineTo(x + 16, yb + 3);
    g.lineTo(x + 22, yb + 19);
    g.closePath();
    g.fill();
    escribir(g, String(cota), x + w - 6, yb + 11, "600 15px " + FUENTE, TINTA, "right");
  }

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
  /*
   * **Y debajo, la ventanilla de presión.**
   *
   * Es donde va en toda pantalla de vuelo del mundo, y es la información que
   * a esta cabina le faltaba. En ámbar cuando no es la del sitio, y sin
   * ningún otro aviso: un altímetro mal puesto no se queja, sigue
   * funcionando y mintiendo. Ver `flight/altimetro.ts`.
   */
  if (d.presion) {
    escribir(
      g,
      `QNH ${Math.round(d.presion.puesta)}`,
      x + w / 2,
      y + h - 6,
      "600 12px " + FUENTE,
      bienPuesta(d.presion.puesta, d.presion.delSitio) ? AUXILIAR : PRECAUCION,
    );
  }
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
  /*
   * **La marca del ritmo**, la del cuadro plano: magenta, con la misma escala
   * que la aguja. Ver `variometro` en `ui/cristal.ts`.
   */
  const ritmo = d.perfil?.ritmoFpm ?? null;
  if (ritmo !== null) {
    const yr = medio - Math.max(-1, Math.min(1, ritmo / d.cuadro.vsiMax)) * ampl;
    g.fillStyle = PALETA.objetivo;
    g.beginPath();
    g.moveTo(x, yr - 5);
    g.lineTo(x + 8, yr);
    g.lineTo(x, yr + 5);
    g.closePath();
    g.fill();
  }
  g.strokeStyle = TINTA;
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(x, medio - f * ampl);
  g.lineTo(x + w, medio - f * ampl);
  g.stroke();
  escribir(g, "VS", x + w / 2, y + 10, "500 10px " + FUENTE, TENUE);
  // Y el fondo de la franja, en miles, al pie: la misma cifra que lleva la del
  // cuadro plano. Sin ella la franja dice «subo» pero no cuánto es el tope.
  escribir(
    g,
    String(Math.round(d.cuadro.vsiMax / 1000)),
    x + w / 2,
    y + h - 8,
    "500 10px " + FUENTE,
    TENUE,
  );
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

/** Si está puesto «Movimiento: reducido»: entonces nada parpadea. */
function sinMovimiento(): boolean {
  return typeof document !== "undefined" &&
    document.documentElement.classList.contains("sin-movimiento");
}

/**
 * **La flecha de una marca que cambia**, al lado de la marca y magenta como
 * ella: hacia dónde se fue. Late con la ventanilla y se queda hasta el final
 * del resalte, como en el cuadro plano. Ver `Tablero.resaltar`.
 */
function flechaDeLaMarca(
  g: CanvasRenderingContext2D,
  r: Resalte | undefined,
  cx: number,
  cy: number,
): void {
  if (!r?.hacia) return;
  if (!luceLaVentanilla(r, sinMovimiento()) && r.edad < PARPADEA_AL_CAMBIAR) return;
  const s = r.hacia === "sube" ? -1 : 1;
  g.fillStyle = PALETA.objetivo;
  g.beginPath();
  g.moveTo(cx, cy + 9 * s);
  g.lineTo(cx + 5.5, cy + 3 * s);
  g.lineTo(cx + 2.2, cy + 3 * s);
  g.lineTo(cx + 2.2, cy - 3 * s);
  g.lineTo(cx - 2.2, cy - 3 * s);
  g.lineTo(cx - 2.2, cy + 3 * s);
  g.lineTo(cx - 5.5, cy + 3 * s);
  g.closePath();
  g.fill();
}

/**
 * **La GS de rodar, en el lienzo**: el mismo dibujo de rodar, la barra fina
 * con su marca magenta de hasta dónde llenarla y, desde el tercer peldaño, la
 * cifra verde o ámbar con su «GS». En la esquina y fuera de la rosa, del alto
 * de los rótulos de esa esquina. Ver `rodajeEnTierra` en `ui/cristal.ts`, que
 * es lo mismo en el cuadro plano.
 */
let piezasDeRodar: { cuerpo: Path2D; trazos: Path2D } | null = null;

function pintarRodaje(
  g: CanvasRenderingContext2D,
  r: NonNullable<DatosDeCabina["rodaje"]>,
  x: number,
  y: number,
  ancho: number,
): void {
  const alto = 20;
  const color = r.rapido ? PALETA.precaucion : PALETA.normal;
  piezasDeRodar ??= { cuerpo: new Path2D(RODAR.cuerpo), trazos: new Path2D(RODAR.trazos) };
  g.save();
  g.translate(x, y);
  g.fillStyle = AUXILIAR;
  g.strokeStyle = AUXILIAR;
  g.lineWidth = 1.6;
  g.lineCap = "round";
  g.fill(piezasDeRodar.cuerpo);
  g.stroke(piezasDeRodar.trazos);
  for (const [cx, cy] of RODAR.ruedas) {
    g.beginPath();
    g.arc(cx, cy, RODAR.radio, 0, Math.PI * 2);
    g.fill();
  }
  g.lineCap = "butt";
  g.restore();
  // La cifra, desde el peldaño de los números: abajo manda el dibujo.
  const conCifra = peldanoDeAhora >= CIFRAS_DE_AVISO_DESDE;
  if (conCifra) {
    escribir(g, "GS", x + 30, y + alto / 2, "500 13px " + FUENTE, TENUE, "left");
    escribir(
      g,
      String(Math.max(0, Math.round(r.nudos))),
      x + 80,
      y + alto / 2,
      "600 17px " + FUENTE,
      color,
      "right",
    );
  }
  const bx = x + (conCifra ? 88 : 32);
  const bw = ancho - (bx - x);
  const bh = 6;
  const by = y + (alto - bh) / 2;
  g.fillStyle = PALETA.filo;
  g.fillRect(bx, by, bw, bh);
  g.fillStyle = color;
  g.fillRect(bx, by, bw * parteDeLaBarra(r.nudos, r.escala), bh);
  // Y la marca de hasta dónde llenarla. Ver `barraDeRodaje`.
  const mx = bx + bw * parteDeLaBarra(r.toca, r.escala);
  g.fillStyle = PALETA.objetivo;
  g.fillRect(mx - 1.25, by - 4, 2.5, bh + 8);
  g.beginPath();
  g.moveTo(mx - 4, by - 7);
  g.lineTo(mx + 4, by - 7);
  g.lineTo(mx, by - 3);
  g.closePath();
  g.fill();
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
  /*
   * **Y el de cristal lleva a la izquierda la franja de motor**, que es donde
   * la lleva el cuadro plano —`franjaDeMotor` en `ui/cristal.ts`— y donde va
   * en un cristal de aviación general de verdad: el par de cada motor, los
   * flaps, el depósito y el tren, al lado del mapa. Aquí no había nada de eso:
   * el par iba en dos relojes redondos fuera de las pantallas, y el depósito y
   * las luces del tren no estaban en ninguna parte.
   */
  const izquierda = d.cuadro.familia === "cristal" ? FRANJA + 8 : 0;
  if (izquierda) pintarFranja(g, d, FRANJA, ALTO);
  const anchoNav = ANCHO - izquierda;
  const cx = izquierda + anchoNav / 2;
  const cy = ALTO * 0.54;
  const r = Math.min(anchoNav / 2 - 30, cy - 34, ALTO - cy - 26);

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

  pintarRosa(g, cx, cy, r, grados, false);

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
  /*
   * **Y en tierra, la GS de rodar**, en el sitio de la pequeña de apoyo y con
   * las mismas reglas que en el cuadro plano: el dibujo, la barra y su marca en
   * los cuatro peldaños, y la cifra con su «GS» desde el tercero. Ver
   * `rodajeEnTierra` en `ui/cristal.ts`.
   */
  // Ciento cuarenta de ancho: en el de cristal, más cerraba contra la caja
  // del rumbo.
  if (d.rodaje) pintarRodaje(g, d.rodaje, izquierda + 10, 20, 140);
  else
    escribir(
      g,
      `GS ${Math.round(d.sobreElSuelo * NUDOS)}`,
      izquierda + 12,
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
  /*
   * **Y con plan de vuelo, el punto al que se va**: su nombre, sus millas y,
   * en el peldaño de cabina, la hora a la que se llega a él. Es la esquina de
   * arriba a la derecha de cualquier pantalla de navegación de línea, y lo
   * primero que se lee en ella. Las mismas cuentas que el cuadro plano; ver
   * `Dibujo.ruta` en `ui/carta.ts`.
   */
  const siguiente = d.mapa?.ruta?.fijos[d.mapa.ruta.activo];
  if (!d.objetivo && d.mapa && siguiente) {
    escribir(
      g,
      `${siguiente.nombre} ${millasHasta(siguiente, d.mapa).toFixed(1)} NM`,
      ANCHO - 12,
      22,
      "500 15px " + FUENTE,
      PALETA.objetivo,
      "right",
    );
    if (d.peldano >= 4 && d.mapa.ruta?.hora)
      escribir(g, d.mapa.ruta.hora, ANCHO - 12, 40, "500 13px " + FUENTE, TINTA, "right");
    // Y el nivel del plan, en magenta y con su «CRZ». Ver `Tablero.elPlan`.
    if (d.mapa.ruta?.crucero)
      escribir(g, `CRZ ${d.mapa.ruta.crucero}`, ANCHO - 12, 57, "600 13px " + FUENTE, PALETA.objetivo, "right");
  } else if (!d.objetivo && d.mapa?.pista) {
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
      izquierda + 12,
      ALTO - 14,
      "500 14px " + FUENTE,
      PALETA.auxiliar,
      "left",
    );
  }
  g.restore();
}

/** Lo que mide la franja de motor del de cristal, en el lienzo de 384 de alto. */
const FRANJA = Math.round((128 * ALTO) / 416);

/**
 * La franja de motor del de cristal: **la del cuadro plano, con pincel**.
 *
 * Las mismas piezas en el mismo sitio y en proporción —el cuadro plano la
 * dibuja en 128 por 416 y aquí se escala al alto del lienzo—: una barra de par
 * por motor con su cifra, la regla de flaps de pie, el depósito de pie y las
 * luces del tren abajo. Ver `franjaDeMotor` en `ui/cristal.ts`.
 */
function pintarFranja(
  g: CanvasRenderingContext2D,
  d: DatosDeCabina,
  ancho: number,
  alto: number,
): void {
  const k = alto / 416;
  g.fillStyle = "#111418";
  g.fillRect(0, 0, ancho, alto);
  escribir(g, d.rotuloDeMotor, ancho / 2, 16 * k, "500 13px " + FUENTE, TENUE);
  const n = Math.max(1, d.motores.length);
  const anchoBarra = 22 * k;
  const paso = ancho / (n + 1);
  const altoBarra = alto * 0.5;
  const arriba = 24 * k;
  for (let i = 0; i < n; i++) {
    const bx = paso * (i + 0.5) + (paso - anchoBarra) / 4;
    const f = clamp01(agujas[i] ?? 0);
    ventana(g, bx, arriba, anchoBarra, altoBarra);
    g.fillStyle = f > 0.95 ? PALETA.precaucion : PALETA.normal;
    g.fillRect(bx, arriba + altoBarra * (1 - f), anchoBarra, altoBarra * f);
    // El último cinco por ciento, en ámbar: la escala de `cuadro.ts`.
    g.fillStyle = PALETA.precaucion;
    g.fillRect(bx, arriba, anchoBarra, altoBarra * 0.05);
    escribir(
      g,
      String(Math.round(f * 100)),
      bx + anchoBarra / 2,
      arriba + altoBarra + 16 * k,
      "600 17px " + FUENTE,
      TINTA,
    );
  }
  const y = arriba + altoBarra + 46 * k;
  if (d.cuadro.flaps.length > 1)
    reglaDeFlapsDePie(g, 16 * k, y, 22 * k, alto - y - 34 * k, d.flaps, d.cuadro.flaps);
  reglaDeCombustibleDePie(g, 78 * k, y, 22 * k, alto - y - 56 * k, d.combustible);
  lucesDeTren(g, 12 * k, alto - 22, d.patas, d.tren);
}

/** La regla de flaps de pie: la de `reglaDeFlaps` en `ui/cristal.ts` vertical. */
function reglaDeFlapsDePie(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  flaps: number,
  grados: readonly number[],
): void {
  escribir(g, "FLAP", x + w / 2, y - 8, "500 11px " + FUENTE, TENUE);
  ventana(g, x, y, w, h);
  const ultima = Math.max(1, grados.length - 1);
  const tope = grados[ultima] || 1;
  for (let k = 0; k <= ultima; k++) {
    const yy = y + ((grados[k] ?? 0) / tope) * h;
    g.strokeStyle = TINTA;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, yy);
    g.lineTo(x + w, yy);
    g.stroke();
    escribir(g, String(grados[k] ?? 0), x + w + 4, yy, "500 11px " + FUENTE, TENUE, "left");
  }
  const py = y + clamp01(enLaMuesca(grados, flaps) / tope) * h;
  g.fillStyle = TINTA;
  g.beginPath();
  g.moveTo(x - 4, py);
  g.lineTo(x - 13, py - 6);
  g.lineTo(x - 13, py + 6);
  g.closePath();
  g.fill();
}

/** El depósito de pie: se vacía por arriba, como uno de verdad. */
function reglaDeCombustibleDePie(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  deposito: DatosDeCabina["combustible"],
): void {
  escribir(g, "FUEL", x + w / 2, y - 8, "500 11px " + FUENTE, TENUE);
  surtidorEnLugarDeFuel(g, x + w / 2 - 8, y - 22, 16);
  ventana(g, x, y, w, h);
  if (!deposito) return;
  const parte = (kg: number) => clamp01(kg / Math.max(1, deposito.cabe));
  g.save();
  g.globalAlpha = 0.28;
  g.fillStyle = PALETA.precaucion;
  g.fillRect(x, y + h * (1 - parte(deposito.reserva)), w, h * parte(deposito.reserva));
  g.restore();
  g.fillStyle =
    deposito.estado === "poco"
      ? PALETA.limite
      : deposito.estado === "reserva"
        ? PALETA.precaucion
        : PALETA.normal;
  g.fillRect(x, y + h * (1 - parte(deposito.kilos)), w, h * parte(deposito.kilos));
  const raya = y + h * (1 - parte(deposito.reserva));
  g.strokeStyle = PALETA.precaucion;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 3, raya);
  g.lineTo(x + w + 3, raya);
  g.stroke();
  // La cifra y la unidad por separado, como en el EICAS: la cifra se ve
  // desde el primer peldaño y la unidad con las letras.
  escribir(g, String(Math.round(deposito.kilos)), x + w / 2, y + h + 12, "600 13px " + FUENTE, PALETA.auxiliar);
  escribir(g, "KG", x + w / 2, y + h + 26, "500 11px " + FUENTE, TENUE);
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

  /*
   * **La temperatura de fuera y la altura de la cabina.**
   *
   * Pedidas las dos: «no veo temperatura exterior, ni presurización de
   * cabina». Y las dos son de las que enseñan sin proponérselo — que a diez
   * mil metros hace cincuenta bajo cero, y que la cabina **también sube**,
   * aunque mucho menos, que es por lo que duelen los oídos al bajar.
   *
   * Los rótulos en inglés de cabina y sin traducir, como IAS o ALT: OAT es
   * *outside air temperature* y CAB ALT es la altitud de cabina, y así es
   * como están escritos en el avión que van a ver algún día.
   */
  const yAire = yMando + 34;
  const oat = Math.round(temperaturaExterior(d.altura, d.aire));
  escribir(g, "OAT", ANCHO * 0.28, yAire, "500 11px " + FUENTE, TENUE, "right");
  escribir(
    g,
    `${oat > 0 ? "+" : ""}${oat}°C`,
    ANCHO * 0.31,
    yAire,
    "600 15px " + FUENTE,
    TINTA,
    "left",
  );
  escribir(g, "CAB ALT", ANCHO * 0.72, yAire, "500 11px " + FUENTE, TENUE, "right");
  /*
   * La altura de la cabina, con su rótulo y no antes: por ser cifra salía
   * desde el primer peldaño, y en Guyrami era un número suelto que no decía
   * de qué era. Igual que en el cuadro plano. Nunca un número solo.
   */
  if (peldanoDeAhora >= LETRAS_DESDE)
  escribir(
    g,
    `${Math.round(d.cabina / 0.3048 / 50) * 50}`,
    ANCHO * 0.75,
    yAire,
    "600 15px " + FUENTE,
    // En rojo por encima de diez mil pies, como el EICAS de verdad.
    d.cabina > AVISO_DE_CABINA ? PALETA.limite : TINTA,
    "left",
  );

  reglaDeCombustible(g, 48, ALTO - 100, ANCHO - 160, 14, d.combustible);
  if (d.cuadro.flaps.length > 1)
    reglaDeFlaps(g, 48, ALTO - 74, ANCHO - 96, 18, d.flaps, d.cuadro.flaps);
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
/**
 * El depósito: la barra que se acorta y la franja de la reserva.
 *
 * El mismo instrumento que el del cuadro plano —`reglaDeCombustible` en
 * `ui/cristal.ts`— con pincel en vez de con SVG. Se dibuja dos veces porque
 * son dos superficies, pero las dos cuentas salen del mismo sitio: lo que no
 * puede pasar es que la cabina y el cuadro digan cosas distintas del mismo
 * depósito.
 *
 * La franja ámbar del fondo son los cuarenta y cinco minutos de ley y **no se
 * mueve**: es la meta. Lo que se mueve es la barra.
 */
function reglaDeCombustible(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  deposito: DatosDeCabina["combustible"],
): void {
  escribir(g, "FUEL", x - 8, y + h / 2, "500 12px " + FUENTE, TENUE, "right");
  surtidorEnLugarDeFuel(g, x - 26, y + h / 2 - 9, 18);
  ventana(g, x, y, w, h);
  if (!deposito) return;
  const cabe = Math.max(1, deposito.cabe);
  const parte = (k: number) => clamp01(k / cabe);

  // Primero la franja de la reserva, apagada: es una zona del instrumento y
  // no un valor, y tiene que quedar **debajo** de la barra.
  g.save();
  g.globalAlpha = 0.28;
  g.fillStyle = PALETA.precaucion;
  g.fillRect(x, y, parte(deposito.reserva) * w, h);
  g.restore();

  g.fillStyle =
    deposito.estado === "poco"
      ? PALETA.limite
      : deposito.estado === "reserva"
        ? PALETA.precaucion
        : PALETA.normal;
  g.fillRect(x, y, parte(deposito.kilos) * w, h);

  /*
   * Y la raya de la reserva, encima de todo: la franja sola se queda debajo
   * de la barra mientras sobre combustible, y una meta que solo se ve cuando
   * ya llegaste no es una meta.
   */
  const raya = x + parte(deposito.reserva) * w;
  g.strokeStyle = PALETA.precaucion;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(raya, y - 3);
  g.lineTo(raya, y + h + 3);
  g.stroke();

  /*
   * **La cifra y la unidad, por separado.** Escritas juntas —«19364 KG»— el
   * texto llevaba letras y `escribir` lo trataba como rótulo: en Guyrami no
   * salían ni los kilos, mientras el cuadro plano del mismo peldaño sí los
   * enseñaba. Una cifra se ve desde el primer peldaño; la unidad, con las
   * letras. Ver `desdePara` en `ui/familia.ts`.
   */
  const kilos = `${Math.round(deposito.kilos)}`;
  const fuente = "600 13px " + FUENTE;
  escribir(g, kilos, x + w + 12, y + h / 2, fuente, TINTA, "left");
  g.save();
  g.font = fuente;
  const ancho = g.measureText(kilos).width;
  g.restore();
  escribir(g, "KG", x + w + 16 + ancho, y + h / 2, fuente, TENUE, "left");
}

function reglaDeFlaps(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  flaps: number,
  grados: readonly number[],
): void {
  escribir(g, "FLAP", x - 8, y + h / 2, "500 12px " + FUENTE, TENUE, "right");
  ventana(g, x, y, w, h);
  // Con los grados de este avión: los de un reactor no son los de una
  // avioneta. Ver `Cuadro.flaps`.
  /*
   * Y cada muesca **donde cae de verdad**, en proporción a sus grados, igual
   * que la regla del cuadro plano y el reloj de las avionetas. Ver
   * `escalaDeFlaps` en `ui/cuadro.ts`.
   */
  const ultima = Math.max(1, grados.length - 1);
  const tope = grados[ultima] || 1;
  for (let k = 0; k <= ultima; k++) {
    const xx = x + ((grados[k] ?? 0) / tope) * w;
    g.strokeStyle = TINTA;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(xx, y);
    g.lineTo(xx, y + h);
    g.stroke();
    escribir(g, String(grados[k] ?? k * 10), xx, y + h + 12, "500 11px " + FUENTE, TENUE);
  }
  const px = x + clamp01(enLaMuesca(grados, flaps) / tope) * w;
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
  // El avión de tren fijo no lleva luces de tren. Ver `patasDe`.
  if (patas <= 0) return;
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
  ultimaCarta = dibujo;

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
  // Y la cifra del anillo de en medio, la mitad del rango. Ver `rangoConMemoria`.
  escribir(g, String(dibujo.rango / 2), cx - r * 0.5 + 4, cy - 4, "500 11px " + FUENTE, TENUE, "left");
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

  /*
   * **El arco verde**, el del cuadro plano: delante del avión y a la escala
   * de la carta, donde se llega a la altitud de la ventanilla. Ver
   * `Tablero.laCarta`.
   */
  const arco = d.perfil?.arco ?? null;
  const ra = arco === null ? null : arco * pixelesPorMetro(dibujo.rango, r);
  if (ra !== null && ra >= 8 && ra <= r - 2) {
    g.strokeStyle = PALETA.normal;
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(cx, cy, ra, -Math.PI / 2 - Math.PI / 6, -Math.PI / 2 + Math.PI / 6);
    g.stroke();
  }

  if (!m) return;

  // Todo lo del mundo se recorta al círculo de la rosa: una pista que asome
  // por fuera del cristal deja de ser una carta y pasa a ser una mancha.
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();

  /*
   * **El relieve del avisador de terreno, más abajo todavía**: es el suelo
   * sobre el que va todo lo demás. Con los mismos colores y la misma opacidad
   * que el cuadro plano. Ver `relieveEnLaCarta` en `ui/carta.ts`.
   */
  for (const c of dibujo.relieve) {
    const aspecto = ASPECTO_DEL_RELIEVE[c.color];
    g.globalAlpha = aspecto.opacidad;
    g.fillStyle = PALETA[aspecto.color];
    g.fillRect(cx + c.dx - c.lado / 2, cy + c.dy - c.lado / 2, c.lado, c.lado);
  }
  g.globalAlpha = 1;

  /*
   * **El radar, debajo de todo lo demás.**
   *
   * Va primero a propósito: la tormenta es el fondo sobre el que se decide, y
   * la pista, la senda y los tráficos tienen que verse **encima** de ella. Un
   * radar que tapa la pista deja de ser un instrumento de decidir.
   *
   * Los colores son los de siempre en cualquier radar meteorológico —verde,
   * ámbar, rojo, magenta— y no se traducen ni se cambian por «bajo, medio,
   * alto»: quien pilote de verdad va a ver exactamente estos. Ver
   * `flight/tormentas.ts`.
   */
  for (const c of dibujo.celdas) {
    for (const { parte, color } of anillosDe(c.fuerza)) {
      g.globalAlpha = 0.5;
      g.fillStyle = COLOR_DEL_ECO[color];
      g.beginPath();
      g.arc(cx + c.dx, cy + c.dy, c.radio * parte, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

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
   * **El plan de vuelo**, debajo de los tráficos: la línea magenta de punto
   * en punto, la estrella de cada punto con su nombre —en magenta el que se
   * persigue, en blanco los demás— y el círculo verde del punto de descenso.
   * Lo mismo que el cuadro plano; ver `Tablero.elPlan`.
   */
  if (dibujo.ruta) {
    const plan = dibujo.ruta;
    g.strokeStyle = PALETA.objetivo;
    g.lineWidth = 2.2;
    g.lineJoin = "round";
    g.beginPath();
    plan.linea.forEach((p, i) => {
      if (i) g.lineTo(cx + p.dx, cy + p.dy);
      else g.moveTo(cx + p.dx, cy + p.dy);
    });
    g.stroke();
    for (const f of plan.fijos) {
      const x = cx + f.dx;
      const y = cy + f.dy;
      if (Math.hypot(f.dx, f.dy) > r + 10) continue;
      const color = f.activo ? PALETA.objetivo : TINTA;
      g.strokeStyle = color;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, y - 6);
      g.lineTo(x + 1.9, y - 1.9);
      g.lineTo(x + 6, y);
      g.lineTo(x + 1.9, y + 1.9);
      g.lineTo(x, y + 6);
      g.lineTo(x - 1.9, y + 1.9);
      g.lineTo(x - 6, y);
      g.lineTo(x - 1.9, y - 1.9);
      g.closePath();
      g.stroke();
      escribir(g, f.nombre, x + 8, y + 12, "600 11px " + FUENTE, color, "left");
      // Y en el umbral, su cota, junto a la pista en uso. Ver `cotaEscrita`.
      if (f.cota) escribir(g, f.cota, x + 8, y + 25, "600 11px " + FUENTE, color, "left");
    }
    if (plan.descenso) {
      const x = cx + plan.descenso.dx;
      const y = cy + plan.descenso.dy;
      g.strokeStyle = PALETA.normal;
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(x, y, 6, 0, Math.PI * 2);
      g.moveTo(x - 3.5, y - 2);
      g.lineTo(x - 0.5, y - 2);
      g.lineTo(x + 3.5, y + 2);
      g.stroke();
      escribir(g, "T/D", x + 10, y - 10, "700 15px " + FUENTE, PALETA.normal, "left", FONDO);
    }
    // Y el T/C, en la de los reactores: donde se acaba de subir.
    if (plan.subida && d.cuadro.familia === "linea") {
      const x = cx + plan.subida.dx;
      const y = cy + plan.subida.dy;
      g.strokeStyle = PALETA.normal;
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(x, y, 6, 0, Math.PI * 2);
      g.moveTo(x - 3.5, y + 2);
      g.lineTo(x - 0.5, y + 2);
      g.lineTo(x + 3.5, y - 2);
      g.stroke();
      escribir(g, "T/C", x + 10, y - 10, "700 15px " + FUENTE, PALETA.normal, "left", FONDO);
    }
  }

  /*
   * **Y los otros, con los símbolos del TCAS.**
   *
   * Rombo hueco en cian para el que anda por ahí; lleno, para el que está a
   * menos de seis millas y mil doscientos pies; círculo ámbar para el que da
   * aviso. Encima o debajo, su altura en centenas de pies —«+05», «-12»— y a
   * la derecha una flecha si sube o baja a más de quinientos pies por minuto.
   *
   * Eran rombos huecos y nada más, con el argumento de que «lo que hay que
   * aprender de ellos es que están». Pero un avión de línea no los pinta así:
   * los pinta como el TCAS dice que son, y lo que se aprende mirándolos es
   * cuál importa. Lo mismo que el cuadro plano; ver `Tablero.laCarta`.
   */
  // Del que menos importa al que más, para que el que avisa quede encima.
  // Ver `Tablero.laCarta`.
  for (let k = dibujo.otros.length - 1; k >= 0; k--) {
    const p = dibujo.otros[k]!;
    const x = cx + p.dx;
    const y = cy + p.dy;
    const aviso = p.clase === "aviso";
    const color = aviso ? PRECAUCION : AUXILIAR;
    if (aviso) {
      g.fillStyle = PRECAUCION;
      g.beginPath();
      g.arc(x, y, 5.5, 0, Math.PI * 2);
      g.fill();
    } else {
      const lado = 6;
      g.beginPath();
      g.moveTo(x, y - lado);
      g.lineTo(x + lado, y);
      g.lineTo(x, y + lado);
      g.lineTo(x - lado, y);
      g.closePath();
      if (p.clase === "cerca") {
        g.fillStyle = AUXILIAR;
        g.fill();
      }
      g.strokeStyle = AUXILIAR;
      g.lineWidth = 2;
      g.stroke();
    }
    if (p.etiqueta)
      escribir(
        g,
        p.etiqueta,
        x,
        p.encima ? y - 14 : y + 14,
        "600 11px " + FUENTE,
        color,
      );
    if (p.tendencia !== 0 && !p.alBorde) {
      // La flecha, de pie a la derecha del símbolo: arriba si sube.
      const s = p.tendencia;
      g.strokeStyle = color;
      g.lineWidth = 1.8;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(x + 10, y + 5 * s);
      g.lineTo(x + 10, y - 4 * s);
      g.moveTo(x + 7, y - 1 * s);
      g.lineTo(x + 10, y - 5 * s);
      g.lineTo(x + 13, y - 1 * s);
      g.stroke();
      g.lineCap = "butt";
    }
  }

  /*
   * **Y el aeropuerto de destino.**
   *
   * Un círculo con una barra dentro: el símbolo de aeródromo de cualquier
   * carta del mundo, el círculo es el campo y la barra la pista. Quien lo
   * aprenda aquí lo reconoce en una carta de verdad, que es la prueba de la
   * regla 4.
   *
   * Y cuando todavía cae fuera del alcance, se pega al borde con una punta:
   * el sitio no se ve, pero se sabe por dónde cae. La cuenta de dónde pegarlo
   * está en `ui/carta.ts`, la misma que usa el cuadro plano — porque esto es
   * exactamente la clase de cosa que acaba dibujándose distinta en cada
   * superficie si cada una se la resuelve.
   */
  /*
   * El alternativo, primero y en cian: el mismo símbolo, más pequeño y sin
   * punta, con su indicativo. Debajo del destino, para que si caen juntos se
   * vea entero el que se sigue. Lo mismo que el cuadro plano; ver `cristal.ts`.
   */
  if (dibujo.alterno) {
    const { dx, dy, oaci } = dibujo.alterno;
    g.strokeStyle = AUXILIAR;
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(cx + dx, cy + dy, 6, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + dx - 3.8, cy + dy);
    g.lineTo(cx + dx + 3.8, cy + dy);
    g.stroke();
    if (oaci)
      // A la izquierda: el del destino va a la derecha. Ver `cristal.ts`.
      escribir(g, oaci, cx + dx - 9, cy + dy, "600 11px " + FUENTE, AUXILIAR, "right");
  }
  if (dibujo.destino) {
    const { dx, dy, dentro } = dibujo.destino;
    if (dibujo.destino.oaci)
      escribir(
        g,
        dibujo.destino.oaci,
        cx + dx + 10,
        cy + dy,
        "600 11px " + FUENTE,
        PALETA.objetivo,
        "left",
      );
    g.strokeStyle = PALETA.objetivo;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx + dx, cy + dy, 7, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + dx - 4.5, cy + dy);
    g.lineTo(cx + dx + 4.5, cy + dy);
    g.stroke();
    if (!dentro) {
      const a = Math.atan2(dy, dx);
      g.save();
      g.translate(cx + dx, cy + dy);
      g.rotate(a);
      g.fillStyle = PALETA.objetivo;
      g.beginPath();
      g.moveTo(13, 0);
      g.lineTo(7, 5);
      g.lineTo(7, -5);
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  g.restore();

  /*
   * **El modo del TCAS**, encima de las millas y en cian: «TA ONLY» cuando
   * avisa y no da maniobras, que es lo que hace el de este juego, y «TCAS
   * STBY» con el equipo en espera, en tierra. Lo mismo que el cuadro plano;
   * ver `modoEnPantalla` en `flight/tcas.ts`.
   */
  if (dibujo.modoTcas)
    escribir(g, dibujo.modoTcas, 14, ALTO - 32, "500 12px " + FUENTE, AUXILIAR, "left");

  /*
   * **Lo que falta del tramo**, la barra magenta que se vacía al llegar al
   * punto y se llena al pasarlo, con su estrella: lo mismo que el cuadro
   * plano. Ver `Dibujo.ruta.falta` en `ui/carta.ts`.
   */
  const falta = dibujo.ruta?.falta ?? null;
  if (falta !== null) {
    const largo = 64;
    const x = ANCHO - 12 - largo - 16;
    const y = 66;
    g.fillStyle = "#23282d";
    g.fillRect(x, y, largo, 7);
    g.fillStyle = PALETA.objetivo;
    g.fillRect(x, y, largo * falta, 7);
    const ex = x + largo + 10;
    const ey = y + 3.5;
    g.strokeStyle = PALETA.objetivo;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(ex, ey - 6);
    g.lineTo(ex + 1.9, ey - 1.9);
    g.lineTo(ex + 6, ey);
    g.lineTo(ex + 1.9, ey + 1.9);
    g.lineTo(ex, ey + 6);
    g.lineTo(ex - 1.9, ey + 1.9);
    g.lineTo(ex - 6, ey);
    g.lineTo(ex - 1.9, ey - 1.9);
    g.closePath();
    g.stroke();
  }

  /*
   * Las millas que faltan, en la esquina de enfrente del rango. Fuera del
   * recorte a propósito: es un rótulo de la pantalla, no algo del mundo.
   */
  if (dibujo.destino) {
    escribir(
      g,
      // Con el indicativo delante, que es como lo dice una pantalla de
      // navegación: a qué sitio son esas millas.
      `${dibujo.destino.oaci ? `${dibujo.destino.oaci} ` : ""}${dibujo.destino.millas.toFixed(1)} NM`,
      14,
      ALTO - 14,
      "500 12px " + FUENTE,
      PALETA.objetivo,
      "left",
    );
  }
}
