/**
 * **El marco de la ventanilla**, desde el asiento.
 *
 * Lo que dice «estás dentro de un avión» no es el paisaje: es la ventanilla
 * redondeada con su bisel de plástico, el hueco hondo hasta el cristal, la
 * junta oscura del cristal y el filo de la persiana asomando arriba. Los
 * modelos no traen cabina de pasaje por dentro, así que esto lo pinta encima
 * del mundo, y lo pinta **con la geometría de la ventanilla de verdad**: la que
 * mide el modelo, en su sitio y a su tamaño. Ver `asiento-de-pasaje.ts`.
 *
 * ## Cómo, y por qué así
 *
 * Es **un solo triángulo grande que cubre la pantalla** y, en cada píxel, sigue
 * el rayo de la vista hasta la pared: si pasa por el hueco y llega al cristal,
 * no pinta nada y se ve el mundo; si da en el hueco, pinta el canto; si da en
 * la pared, la pared. Tres cosas que salen de ahí sin pedirlas:
 *
 * - **La perspectiva es la de verdad.** Al girar la cabeza el canto de un lado
 *   se esconde y el del otro se ensancha, y el ala se ve por donde se vería.
 *   Un dibujo plano pegado a la pantalla se quedaría quieto mientras el mundo
 *   gira detrás, que es lo que hace un marco de foto, no una ventanilla.
 * - **La pared no se acaba nunca**: gire la cabeza lo que gire, no hay borde
 *   de malla por el que asome el mundo.
 * - **Y cuesta menos que no tenerlo.** Se pinta lo primero y a la profundidad
 *   más cercana, así que la tarjeta descarta antes de calcularlo todo lo que
 *   queda detrás de la pared —el terreno, el mar, el cielo—, que es más de la
 *   mitad de la pantalla. Es el truco del cielo de `sky.ts`, al revés. Medido
 *   en `scripts/verificar-mirada.mjs`.
 *
 * El borde del cristal se suaviza con **cobertura alfa** —`alphaToCoverage`—:
 * el multimuestreo que ya lleva el juego decide qué muestras del borde son
 * pared y cuáles mundo, sin mezclar transparencias ni ordenar nada.
 *
 * ## Y lo que hay alrededor
 *
 * «Lo de las ventanillas está bien, pero yo pondría algo más en la pared, hay
 * mucho blanco, y normalmente en los aviones la ventanilla de delante y la de
 * detrás se ven un poquito, a no ser que tengas una columna.» Así que la pared
 * es la de una cabina de verdad, en el mismo triángulo y con la misma cuenta:
 *
 * - **Las ventanillas de al lado**, a un paso de cuaderna, con su bisel, su
 *   canto y su persiana —cada una como la tenga su pasajero—. Por su cristal
 *   se ve el mundo de verdad: es el mismo ojo mirando por otro agujero, así
 *   que no hay nada que fingir. Y en algunos vuelos, una de las dos no está y
 *   hay pared: una columna. Ver `cabina-de-pasaje.ts`.
 * - **Los paneles del forro**, de dos ventanillas cada uno, con su junta, y
 *   una textura de plástico granulado que se apaga de lejos para no rielar.
 * - **El respaldo de la fila de delante**, de pie entre los ojos y la pared:
 *   sentado no se ve, y asomándose hacia delante, sí. Es un plano más, y lo
 *   que tapa lo tapa de verdad.
 * - **Y el de uno, desde encima del ala.** «Tiene pinta de avión de carga:
 *   detrás no hay asiento ni nada, está vacío», dijo Enrique de la primera
 *   versión de esa vista. Ahí uno se despega del respaldo y se acerca al
 *   cristal para ver el ala —ver `ASOMADO` en `asiento-de-pasaje.ts`—, y
 *   mirando hacia la cola lo primero que hay es **su propio asiento**, vacío,
 *   donde está: su cara de delante con el cabezal y la funda, con los colores
 *   de la casa. El de la fila de detrás va a su distancia entre filas, detrás
 *   de ése, y no se ve: puesto delante sería un asiento donde no lo hay. Y
 *   detrás de él, como desde la fila de delante de una salida de verdad, la
 *   trampilla queda tapada y asoman por encima el asa y el letrero.
 *
 * Y la luz: de día la cabina la alumbra lo que entra por las ventanillas; de
 * noche, las luces del pasaje, que se bajan para despegar y aterrizar. Ver
 * `diaEnLaCabina` en `luz-de-cabina.ts` y `CabinaDePasaje`.
 *
 * ## Y la salida sobre el ala, desde la fila de al lado
 *
 * En el asiento de encima del ala de un avión de pasillo único —el JAZ 90, de
 * la clase del A320 y el 737— la ventanilla de al lado es la de la trampilla
 * de la salida de emergencia: asoma el trozo de su marco, el asa roja de
 * arriba y, encima, el letrero «EXIT», que es como se ve desde la fila de al
 * lado. Va del lado y a la altura que la mide el modelo —ver
 * `SalidaDeAlLado` y `salidaEnLaPared`—, y el letrero, con su tamaño y sus
 * colores de verdad: letras rojas sobre blanco iluminado, que es lo que pide
 * la norma de certificación, con las letras de al menos treinta y ocho
 * milímetros —aquí, cuarenta y cuatro—. Alumbra solo: de noche, con la cabina
 * apagada para aterrizar, es lo que se sigue viendo. «EXIT» va en inglés, como
 * los rótulos de los instrumentos: es lo que pone en cualquier avión.
 *
 * Las letras no son una textura: son nueve trazos rectos —E, X, I y T no
 * tienen curvas— medidos como distancias, igual que el resto del marco. Se
 * ven nítidas a cualquier distancia, y solo las paga el puñado de píxeles del
 * letrero.
 *
 * **Lo que cuesta**, medido con la tarjeta del portátil a 1280 × 720, el
 * marco solo sobre una escena vacía: 0,32 ms el de antes y 0,45 este. Lo
 * pagan solo los píxeles que lo usan —la pared no paga el hueco, ni el hueco
 * la pared, ni casi nadie el respaldo y el botón—, y el grano sale de una
 * tesela de ruido y no de calcularlo. Calculado, con todo pagando todo, eran
 * 0,69.
 *
 * ## El cristal que se oscurece
 *
 * En el avión que lo lleva, el cristal no tiene persiana: se tiñe. Eso se
 * pinta **después del mundo**, con otro triángulo que multiplica lo que ya hay
 * pintado por el color del tinte, y solo donde el marco no escribió —el
 * cristal—: la prueba de profundidad hace el recorte, muestra a muestra. Y
 * solo existe mientras hay algún cristal oscurecido.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  LessDepth,
  LinearFilter,
  LinearMipmapLinearFilter,
  RedFormat,
  RepeatWrapping,
  UnsignedByteType,
  Matrix3,
  Mesh,
  MultiplyBlending,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  type IUniform,
  type PerspectiveCamera,
} from "three";
import type { AsientoDePasaje, SalidaDeAlLado, VentanillaDePasaje } from "./asiento-de-pasaje";
import type { TipoDeVentanilla, Vecinas } from "./cabina-de-pasaje";
import { CASA } from "../flight/aircraft";

/**
 * **Las medidas del marco**, m, sacadas de una ventanilla de avión de línea.
 *
 * - El hueco del forro es más grande que el cristal: tres centímetros y medio
 *   por cada lado, que es lo que se ve de canto.
 * - El canto tiene nueve de fondo: forro, aislante y la piel. Es lo que hace
 *   que una ventanilla sea un túnel corto y no una pegatina.
 * - El bisel, la moldura de plástico que rodea el hueco, mide cuatro y medio.
 * - La junta del cristal, uno.
 * - La persiana sube del todo y deja asomar su filo: cinco centímetros.
 *   Subida del todo se pierde la pista de que es una ventanilla de avión. El
 *   cristal que se oscurece no tiene persiana, ni filo.
 */
const MARGEN_DEL_HUECO = 0.035;
const FONDO = 0.09;
const BISEL = 0.045;
const JUNTA = 0.01;
const PERSIANA = 0.05;

/**
 * **El paso entre ventanillas**, m: el de las cuadernas, que es lo que manda
 * dónde puede ir un agujero en un fuselaje. Unos cincuenta y tres centímetros
 * —veintiuna pulgadas— en los de pasillo único; y con el cristal grande, el
 * del 787, sesenta y uno. Aquí, lo que mide el cristal más un palmo de
 * chapa, y nunca menos de lo primero.
 *
 * El modelo de fuera lleva menos ventanillas y más separadas, que de lejos se
 * leen mejor; desde dentro se ve la cabina como es.
 */
export function pasoDeVentanillas(ancho: number): number {
  return Math.max(0.53, ancho + 0.25);
}

/**
 * **El respaldo de la fila de delante**, m: medio metro por delante de los
 * ojos —ochenta centímetros entre filas, menos lo que se sienta uno por
 * delante de su respaldo y lo que abulta el de delante—, con lo alto un dedo
 * por debajo de los ojos, cuatro centímetros de hueco con la pared y cuarenta
 * y ocho de ancho.
 */
const RESPALDO = { delante: 0.5, bajoLosOjos: 0.05, hueco: 0.04, ancho: 0.48 };

/**
 * **El respaldo de uno**, m: su cara de delante, dieciocho centímetros por
 * detrás de los ojos sentado —lo que va de los ojos a la nuca apoyada en el
 * cabezal—, que con los cincuenta del de delante y el grosor de un respaldo
 * da los ochenta entre filas. El mismo asiento que el de delante: igual de
 * alto, igual de ancho y con el mismo hueco con la pared.
 *
 * Y la funda del cabezal, por delante: un paño crema de treinta y cuatro
 * centímetros de ancho por veinticuatro de alto, con una franja del color de
 * la casa. Ver `franjaDeLaFunda`.
 */
const PROPIO = { detras: 0.18, cabezal: 0.27, funda: { ancho: 0.34, alto: 0.24 } };

/**
 * **El botón del cristal que se oscurece**, m: en el bisel, justo debajo del
 * hueco, como el del 787. Su centro, por debajo del borde del hueco, y lo que
 * mide.
 */
const BOTON = { bajo: BISEL * 0.5, ancho: 0.064, alto: 0.022 };

/**
 * **La trampilla de la salida y su letrero**, m.
 *
 * - El forro de la trampilla es algo más grande que el hueco de fuera: dos
 *   centímetros por lado. Su esquina, la del contorno de fuera.
 * - El asa, arriba, a ocho centímetros del borde: un hueco oscuro de catorce
 *   por cuatro y medio con su tapa roja.
 * - El letrero, a tres centímetros por encima: veintiuno por ocho y medio,
 *   con su canto oscuro de seis milímetros. Las letras, de cuatro centímetros
 *   largos, con trazo de ocho milímetros.
 */
const SALIDA = { forro: 0.02, esquina: 0.1 };
const ASA = { bajo: 0.08, ancho: 0.14, alto: 0.045 };
const LETRERO = { encima: 0.03, ancho: 0.21, alto: 0.085, canto: 0.006 };

/**
 * **El grano del forro**: una tesela de ruido de sesenta y cuatro de lado, que
 * el sombreador lee a dos escalas —el granulado del plástico y sus manchas
 * grandes—. Leído de una textura, con sus mipmaps, sale más barato que
 * calcularlo y de lejos se suaviza solo, sin rielar. Es un dato, no un color:
 * va sin espacio de color.
 */
const LADO_DEL_GRANO = 64;

function teselaDeGrano(): DataTexture {
  const datos = new Uint8Array(LADO_DEL_GRANO * LADO_DEL_GRANO);
  // Un azar fijo, para que el forro sea el mismo en cada vuelo.
  let semilla = 12345;
  for (let i = 0; i < datos.length; i++) {
    semilla = (semilla * 1103515245 + 12345) >>> 0;
    datos[i] = semilla >>> 24;
  }
  const t = new DataTexture(datos, LADO_DEL_GRANO, LADO_DEL_GRANO, RedFormat, UnsignedByteType);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** Los colores, en sRGB, del forro claro de cualquier cabina. */
const COLORES = {
  pared: "#cfc9bc",
  bisel: "#e6e2d8",
  sombra: "#8c877d",
  junta: "#323538",
  persiana: "#ece8df",
  abajo: "#b9b3a6",
  // El tapizado de los asientos, en el verde de la casa, y la funda clara del
  // reposacabezas, que es lo primero que se ve de un asiento por detrás.
  asiento: "#30443a",
  funda: "#ddd6c6",
  // El botón del cristal que se oscurece, y sus luces.
  boton: "#2d3034",
  luz: "#7fc4ff",
  // La salida: la tapa roja del asa, y el letrero, rojo sobre blanco.
  rojo: "#c8102e",
  letrero: "#f4f4ee",
};

/** El color de la luz del pasaje de noche, cálido. */
const CALIDA = new Color(1, 0.86, 0.68);

/**
 * El tinte del cristal en su tono más oscuro: un azul muy oscuro, que es como
 * se ve el del 787 —el sol se sigue viendo, como un disco—. Multiplica lo que
 * ya está pintado en la pantalla, así que va tal cual, sin pasar a lineal.
 */
const TINTE = new Color(0.1, 0.13, 0.24);

const VERTICES = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  // Lo más cerca que se puede: lo de detrás de la pared ya no se calcula.
  gl_Position = vec4(position.xy, -0.99999, 1.0);
}
`;

/** Lo que comparten el marco y el cristal oscuro: la geometría de la fila. */
const COMUN = /* glsl */ `
uniform mat4 uInvProj;
uniform mat3 uCamAVentana;
uniform vec3 uOrigen;
uniform vec3 uCristal;
uniform vec3 uHueco;
uniform float uFondo;
uniform float uPaso;
uniform float uAtras;
uniform vec2 uVecinas;
uniform vec3 uTapan;
// La trampilla de la salida: su centro a lo largo y de alto en la pared, y sus
// medias medidas. Sin salida, medida cero.
uniform vec4 uSalida;
varying vec2 vNdc;

// Distancia a un rectángulo de esquinas redondas: negativa dentro.
float caja(vec2 p, vec2 medio, float r) {
  vec2 q = abs(p) - medio + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Qué ventanilla de la fila cae en esa x: la de uno (0) o una de al lado.
float cual(float x) { return clamp(floor(x / uPaso + 0.5), -1.0, 1.0); }
// Si está —o es una columna—, y cuánto la tapa su pasajero.
float hay(float k) { return k == 0.0 ? 1.0 : (k == uAtras ? uVecinas.y : uVecinas.x); }
float tapa(float k) { return k == 0.0 ? uTapan.x : (k == uAtras ? uTapan.z : uTapan.y); }
// Dónde va su centro a lo largo de la pared: a su paso, salvo la de la
// trampilla de la salida, que va en medio de ella.
float centroDe(float k) {
  return (uSalida.z > 0.0 && k == sign(uSalida.x)) ? uSalida.x : k * uPaso;
}

// El rayo de este píxel, en los ejes de la ventanilla.
vec3 rayo() {
  vec4 lejos = uInvProj * vec4(vNdc, 1.0, 1.0);
  return uCamAVentana * normalize(lejos.xyz / lejos.w);
}
`;

const FRAGMENTOS = /* glsl */ `
${COMUN}
uniform float uConPersiana;
// Los respaldos: el plano a lo largo, lo alto y el canto de la pared, en ejes
// de pie —ver uVertical—; y el de uno, si se pinta.
uniform vec4 uRespaldo;
uniform vec2 uVertical;
uniform float uParpadeo;
uniform vec3 uPared;
uniform vec3 uBisel;
uniform vec3 uSombra;
uniform vec3 uJunta;
uniform vec3 uPersiana;
uniform vec3 uAbajo;
uniform vec3 uAsiento;
uniform vec3 uFunda;
uniform vec3 uBoton;
uniform vec3 uLuzBoton;
uniform vec3 uLuz;
uniform sampler2D uGrano;
uniform vec3 uRojo;
uniform vec3 uLetrero;
uniform vec4 uPropio;
uniform vec3 uFranja;

// Distancia a un trazo recto, de a a b.
float trazo(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}

// «EXIT», centrado en p, m: cuánto cubre cada punto. Nueve trazos rectos.
float letrasExit(vec2 p, float a) {
  float h = 0.018;
  float d = trazo(p, vec2(-0.063, -h), vec2(-0.063, h));
  d = min(d, trazo(p, vec2(-0.063, h), vec2(-0.038, h)));
  d = min(d, trazo(p, vec2(-0.063, 0.0), vec2(-0.041, 0.0)));
  d = min(d, trazo(p, vec2(-0.063, -h), vec2(-0.038, -h)));
  d = min(d, trazo(p, vec2(-0.025, -h), vec2(0.007, h)));
  d = min(d, trazo(p, vec2(-0.025, h), vec2(0.007, -h)));
  d = min(d, trazo(p, vec2(0.019, -h), vec2(0.019, h)));
  d = min(d, trazo(p, vec2(0.031, h), vec2(0.063, h)));
  d = min(d, trazo(p, vec2(0.047, h), vec2(0.047, -h)));
  return 1.0 - smoothstep(0.004 - a, 0.004 + a, d);
}

void main() {
  vec3 d = rayo();
  // Hasta la pared y hasta el cristal. Calculado siempre, fuera de las ramas:
  // las derivadas de pantalla solo valen si las pide todo el grupo de píxeles.
  float dz = max(d.z, 1e-4);
  vec2 q1 = uOrigen.xy + d.xy * ((-uFondo - uOrigen.z) / dz);
  vec2 q0 = uOrigen.xy + d.xy * ((0.0 - uOrigen.z) / dz);
  // Lo que mide un píxel en cada plano, m: suaviza los bordes y apaga el grano.
  float a1 = max(max(fwidth(q1.x), fwidth(q1.y)), 1e-5);
  float a0 = max(max(fwidth(q0.x), fwidth(q0.y)), 1e-5);
  // Y lo que mide un píxel en ángulo, para lo que no está en esos planos.
  float px = length(fwidth(d));

  // La ventanilla de la fila que toca aquí, y la de uno para la luz.
  float k = cual(q1.x);
  float esta = hay(k);
  vec2 c1 = q1 - vec2(centroDe(k), 0.0);
  vec2 c0 = q0 - vec2(centroDe(k), 0.0);
  float s1 = esta > 0.5 ? caja(c1, uHueco.xy, uHueco.z) : 1.0;
  float s0 = caja(c0, uCristal.xy, uCristal.z);
  // El grano del plástico y sus manchas grandes, de una tesela de ruido: de
  // lejos la tarjeta coge su mipmap y el grano se apaga solo, sin rielar.
  // Aquí arriba, que leer una textura con mipmaps también pide derivadas.
  float grano = (texture2D(uGrano, q1 * ${(140 / LADO_DEL_GRANO).toFixed(4)}).r - 0.5) * 0.08
    + (texture2D(uGrano, q1 * ${(9 / LADO_DEL_GRANO).toFixed(4)}).r - 0.5) * 0.07;

  // ── La pared ──
  // Solo donde se ve pared: dentro del hueco no se paga. Las ramas no llevan
  // derivadas: los anchos de píxel ya están calculados arriba.
  vec3 fuera = vec3(0.0);
  // Lo que alumbra por sí mismo, encima de la luz de la cabina: el letrero.
  vec3 propia = vec3(0.0);
  float enPropia = 0.0;
  if (s1 > -a1) {
  float sLuz = min(s1, caja(q1, uHueco.xy, uHueco.z));
  // Más clara cerca de las ventanillas, que es por donde entra la luz, y el
  // panel de abajo un punto más gris, con su junta.
  float bajo = uHueco.y + 0.17;
  vec3 pared = mix(uPared, uAbajo, 1.0 - smoothstep(-bajo - a1, -bajo + a1, q1.y));
  pared *= mix(1.06, 0.7, smoothstep(0.0, 0.7, sLuz));
  // Y algo más oscura hacia el techo y hacia el suelo: la luz entra a la
  // altura de las ventanillas.
  pared *= 1.0 - 0.1 * smoothstep(0.15, 0.6, abs(q1.y));
  pared *= 1.0 - 0.35 * (1.0 - smoothstep(0.004, 0.004 + a1, abs(q1.y + bajo)));
  // Las juntas de los paneles, uno cada dos ventanillas, con su sombra.
  float xj = q1.x * uAtras - 0.5 * uPaso;
  float m = 2.0 * uPaso;
  float dj = abs(xj - m * floor(xj / m + 0.5));
  pared *= 1.0 - 0.32 * (1.0 - smoothstep(0.0015, 0.0015 + a1, dj));
  pared *= 1.0 + 0.05 * (1.0 - smoothstep(0.0015, 0.0015 + a1, abs(dj - 0.004)));
  pared *= 1.0 + grano;

  // ── La salida sobre el ala ──
  // Solo cerca de la trampilla y su letrero: el resto de la pared no la paga.
  vec2 h = q1 - uSalida.xy;
  if (uSalida.z > 0.0 && abs(h.x) < uSalida.z + 0.06 && h.y > -uSalida.w - 0.06
      && h.y < uSalida.w + ${(LETRERO.encima + LETRERO.alto + 0.02).toFixed(3)}) {
    // La trampilla es otra pieza de forro, un pelo más clara, con su junta
    // oscura alrededor.
    float sh = caja(h, uSalida.zw, ${SALIDA.esquina.toFixed(3)});
    pared *= 1.0 + 0.04 * (1.0 - smoothstep(-a1, a1, sh));
    pared = mix(pared, uSombra * 0.7, 0.8 * (1.0 - smoothstep(0.003, 0.003 + a1 * 1.5, abs(sh))));
    // El asa, arriba: un hueco oscuro con su tapa roja. Solo cerca de ella.
    vec2 pa = h - vec2(0.0, uSalida.w - ${ASA.bajo.toFixed(3)});
    if (abs(pa.x) < ${(ASA.ancho / 2 + 0.02).toFixed(3)} && abs(pa.y) < ${(ASA.alto / 2 + 0.02).toFixed(4)}) {
      float sa = caja(pa, vec2(${(ASA.ancho / 2).toFixed(3)}, ${(ASA.alto / 2).toFixed(4)}), 0.012);
      vec3 asa = mix(uJunta, uRojo, 1.0 - smoothstep(-0.008 - a1, -0.008 + a1, sa));
      pared = mix(pared, asa, 1.0 - smoothstep(-a1, a1, sa));
    }
    // Y el letrero encima: su canto oscuro y su cara blanca, que alumbra sola.
    // Solo en él: las letras son nueve trazos, y el resto de la trampilla no
    // tiene por qué pagarlos.
    vec2 pl = h - vec2(0.0, uSalida.w + ${(LETRERO.encima + LETRERO.alto / 2).toFixed(4)});
    if (abs(pl.x) < ${(LETRERO.ancho / 2 + 0.02).toFixed(4)} && abs(pl.y) < ${(LETRERO.alto / 2 + 0.02).toFixed(4)}) {
      float sl = caja(pl, vec2(${(LETRERO.ancho / 2).toFixed(4)}, ${(LETRERO.alto / 2).toFixed(4)}), 0.008);
      pared = mix(pared, uJunta, 1.0 - smoothstep(-a1, a1, sl));
      // A lo largo de la pared es hacia la izquierda de quien la mira desde
      // dentro —ver baseDeLaVentanilla—: sin darle la vuelta se leía «TIXƎ».
      propia = mix(uLetrero, uRojo, letrasExit(vec2(-pl.x, pl.y), a1));
      enPropia = 1.0 - smoothstep(-${LETRERO.canto.toFixed(3)} - a1, -${LETRERO.canto.toFixed(3)} + a1, sl);
    }
  }
  // El botón del cristal que se oscurece, en el bisel de debajo de la
  // ventanilla de uno: un canto oscuro con cuatro luces, tantas encendidas
  // como tonos.
  vec3 boton = vec3(0.0);
  float enBoton = 0.0;
  vec2 b = q1 - vec2(0.0, -(uHueco.y + ${BOTON.bajo.toFixed(3)}));
  // Solo cerca del botón: el resto de la pantalla no paga sus cuatro luces.
  if (uConPersiana < 0.5 && abs(b.x) < 0.06 && abs(b.y) < 0.03) {
    float sb = caja(b, vec2(${(BOTON.ancho / 2).toFixed(3)}, ${(BOTON.alto / 2).toFixed(3)}), 0.008);
    boton = uBoton;
    for (int i = 0; i < 4; i++) {
      float x = -0.018 + 0.012 * float(i);
      float encendida = step(float(i) + 0.5, uTapan.x * 4.0 + 0.001);
      encendida = max(encendida, uParpadeo);
      float led = 1.0 - smoothstep(0.003 - a1, 0.003 + a1, length(b - vec2(x, 0.0)));
      boton = mix(boton, mix(uBoton * 1.6, uLuzBoton, encendida), led);
    }
    enBoton = 1.0 - smoothstep(-a1, a1, sb);
  }

  // El bisel, la ranura que lo separa de la pared y la pared.
  vec3 bisel = uBisel * mix(1.0, 0.93, smoothstep(0.0, ${BISEL.toFixed(3)}, s1));
  float enBisel = 1.0 - smoothstep(${BISEL.toFixed(3)} - a1, ${BISEL.toFixed(3)} + a1, s1);
  fuera = mix(pared, bisel, enBisel);
  float ranura = 1.0 - smoothstep(0.0025, 0.0025 + a1 * 1.5, abs(s1 - ${BISEL.toFixed(3)}));
  fuera = mix(fuera, uSombra, ranura * 0.55);
  fuera = mix(fuera, boton, enBoton);
  }

  // ── Dentro del hueco ──
  // Solo dentro: la pared no lo paga.
  vec3 dentro = vec3(0.0);
  float alfaDentro = 1.0;
  if (s1 < a1) {
  // El canto, más oscuro arriba —le da la sombra del forro— y más claro
  // abajo, donde da la luz que entra.
  vec2 haciaFuera = normalize(c0 + vec2(1e-5));
  vec3 canto = uBisel * (0.7 - 0.22 * haciaFuera.y);
  canto *= mix(0.82, 1.0, smoothstep(0.0, 0.03, s0));
  // La junta del cristal y el cristal, que no se pinta: ahí está el mundo.
  float enCristal = 1.0 - smoothstep(-a0, a0, s0);
  dentro = mix(canto, uJunta, enCristal);
  float seVe = 1.0 - smoothstep(-${JUNTA.toFixed(3)} - a0, -${JUNTA.toFixed(3)} + a0, s0);
  alfaDentro = 1.0 - seVe;
  // La persiana, bajada lo que la tenga su pasajero, con su labio más oscuro
  // y su tirador. El cristal que se oscurece no tiene.
  if (uConPersiana > 0.5) {
    float corte = uCristal.y - ${PERSIANA.toFixed(3)} - tapa(k) * (2.0 * uCristal.y - ${PERSIANA.toFixed(3)});
    float persiana = smoothstep(corte - a0, corte + a0, c0.y) * enCristal;
    float labio = 1.0 - smoothstep(corte + 0.012, corte + 0.012 + a0, c0.y);
    float tirador = (1.0 - smoothstep(0.025 - a0, 0.025 + a0, abs(c0.x)))
      * (1.0 - smoothstep(0.01 - a0, 0.01 + a0, abs(c0.y - corte - 0.008)));
    // Y unas rayas muy suaves: es una lámina con pliegues, no un cartón.
    float pliegue = 0.97 + 0.03 * smoothstep(0.3, 0.7, fract(c0.y * 40.0));
    vec3 colPersiana = mix(uPersiana * pliegue, uSombra, max(labio * 0.5, tirador * 0.75));
    dentro = mix(dentro, colPersiana, persiana);
    alfaDentro = max(alfaDentro, persiana);
  }
  }

  float enHueco = 1.0 - smoothstep(-a1, a1, s1);
  vec3 color = mix(fuera, dentro, enHueco);
  float alfa = mix(1.0, alfaDentro, enHueco);
  // Mirando hacia dentro del avión: forro en sombra.
  if (d.z < 1e-4) {
    color = uPared * 0.6;
    alfa = 1.0;
    enPropia = 0.0;
  }
  // El letrero está en la pared: dentro del hueco de una ventanilla, no.
  enPropia *= 1.0 - enHueco;

  // ── El respaldo de delante ──
  // Un plano de pie a lo ancho del avión, por delante de los ojos: si el
  // rayo lo cruza antes que la pared, tapa lo que haya detrás.
  // Solo donde el rayo lo cruza: casi toda la pantalla mira hacia el otro
  // lado y no lo paga.
  float tPared = d.z > 1e-4 ? (-uFondo - uOrigen.z) / d.z : 1e9;
  float t = abs(d.x) > 1e-5 ? (uRespaldo.x - uOrigen.x) / d.x : -1.0;
  if (t > 0.0 && t < tPared) {
    vec3 p = uOrigen + d * t;
    // De pie y a lo ancho del avión, no por la pared inclinada: un respaldo
    // no se tumba con el fuselaje.
    vec2 e = vec2(p.z * uVertical.x - p.y * uVertical.y, p.y * uVertical.x + p.z * uVertical.y);
    vec2 r = vec2(e.x - (uRespaldo.z - ${(RESPALDO.ancho / 2).toFixed(3)}), e.y - (uRespaldo.y - 0.6));
    float sr = caja(r, vec2(${(RESPALDO.ancho / 2).toFixed(3)}, 0.6), 0.07);
    // Lo que mide un píxel en el respaldo, sin derivadas, que dentro de una
    // rama no valen: la distancia por el ángulo, contando lo tumbado.
    float ar = clamp(t * px / max(abs(d.x), 0.05), 1e-4, 0.05);
    float respaldo = 1.0 - smoothstep(-ar, ar, sr);
    // La funda del reposacabezas arriba, y el tapizado más oscuro hacia abajo.
    vec3 asiento = mix(uAsiento, uFunda, smoothstep(-0.155 - ar, -0.155 + ar, e.y - uRespaldo.y));
    asiento *= mix(0.75, 1.0, smoothstep(-0.6, 0.0, e.y - uRespaldo.y));
    asiento *= 1.0 - 0.25 * (1.0 - smoothstep(0.0, 0.02, -sr));
    color = mix(color, asiento, respaldo);
    alfa = max(alfa, respaldo);
    enPropia *= 1.0 - respaldo;
  }

  // ── El respaldo de uno ──
  // Desde encima del ala, asomado al cristal: su cara de delante, por detrás
  // del hombro. Lo mismo que el de delante, mirado del otro lado. Solo donde el
  // rayo va hacia la cola y lo cruza antes que la pared.
  float tp = (uPropio.w > 0.5 && abs(d.x) > 1e-5) ? (uPropio.x - uOrigen.x) / d.x : -1.0;
  if (tp > 0.0 && tp < tPared) {
    vec3 p = uOrigen + d * tp;
    vec2 e = vec2(p.z * uVertical.x - p.y * uVertical.y, p.y * uVertical.x + p.z * uVertical.y);
    vec2 r = vec2(e.x - (uPropio.z - ${(RESPALDO.ancho / 2).toFixed(3)}), e.y - (uPropio.y - 0.6));
    float sr = caja(r, vec2(${(RESPALDO.ancho / 2).toFixed(3)}, 0.6), 0.07);
    float ar = clamp(tp * px / max(abs(d.x), 0.05), 1e-4, 0.05);
    float cubre = 1.0 - smoothstep(-ar, ar, sr);
    // De arriba abajo: el cabezal y, debajo de su costura, el respaldo.
    float h = uPropio.y - e.y;
    vec3 asiento = uAsiento * mix(1.12, 0.72, smoothstep(0.0, 0.7, h));
    asiento *= 1.0 - 0.45 * (1.0 - smoothstep(0.004, 0.004 + ar, abs(h - ${PROPIO.cabezal.toFixed(3)})));
    // La funda, centrada en el cabezal, con su franja del color de la casa.
    vec2 f = vec2(r.x, h - ${(PROPIO.funda.alto / 2 + 0.015).toFixed(4)});
    float sf = caja(f, vec2(${(PROPIO.funda.ancho / 2).toFixed(3)}, ${(PROPIO.funda.alto / 2).toFixed(3)}), 0.02);
    float banda = 1.0 - smoothstep(0.016 - ar, 0.016 + ar, abs(h - ${(PROPIO.funda.alto * 0.68).toFixed(4)}));
    vec3 funda = mix(uFunda, uFranja, banda);
    asiento = mix(asiento, funda, 1.0 - smoothstep(-ar, ar, sf));
    // Más claro del lado de la ventanilla, que es por donde le entra la luz, y
    // el canto más oscuro, que se dobla hacia atrás.
    asiento *= mix(0.85, 1.1, smoothstep(-${(RESPALDO.ancho / 2).toFixed(3)}, ${(RESPALDO.ancho / 2).toFixed(3)}, r.x));
    asiento *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.025, -sr));
    color = mix(color, asiento, cubre);
    alfa = max(alfa, cubre);
    enPropia *= 1.0 - cubre;
  }

  gl_FragColor = vec4(mix(color * uLuz, propia, enPropia), alfa);
  #include <colorspace_fragment>
}
`;

/**
 * **El cristal oscuro**: el tinte del cristal que se oscurece, que multiplica
 * lo que se pintó detrás de él. Ver la cabecera.
 */
const OSCURO = /* glsl */ `
${COMUN}
uniform vec3 uTinte;
void main() {
  vec3 d = rayo();
  float dz = max(d.z, 1e-4);
  vec2 q0 = uOrigen.xy + d.xy * ((0.0 - uOrigen.z) / dz);
  float t = tapa(cual(q0.x));
  if (t < 0.003 || d.z < 1e-4) discard;
  gl_FragColor = vec4(mix(vec3(1.0), uTinte, t), 1.0);
}
`;

const lineal = (srgb: string): Color => new Color(srgb);

/**
 * El triángulo que cubre la pantalla: uno solo, más grande que ella, que dos
 * triángulos partidos por la diagonal le cuestan a la tarjeta una costura de
 * píxeles calculados dos veces.
 */
function trianguloDePantalla(): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  return g;
}

const _u = new Vector3();
const _v = new Vector3();
const _w = new Vector3();
const SIN_GIRO = new Quaternion();

/**
 * La base de la ventanilla en el mundo, como filas: a lo largo, arriba por la
 * pared y hacia fuera. Multiplicar por ella lleva del mundo a la ventanilla.
 */
function baseDeLaVentanilla(
  ventanilla: VentanillaDePasaje,
  orientacion: Quaternion,
  base: Matrix3,
): Matrix3 {
  const n = ventanilla.normal;
  _w.set(n.x, n.y, n.z).normalize();
  _v.set(0, 1, 0).addScaledVector(_w, -_w.y).normalize();
  _u.crossVectors(_v, _w);
  for (const e of [_u, _v, _w]) e.applyQuaternion(orientacion);
  return base.set(_u.x, _u.y, _u.z, _v.x, _v.y, _v.z, _w.x, _w.y, _w.z);
}

/** Las medidas del cristal y del hueco del forro, en medios y con su esquina. */
function medidasDelHueco(v: VentanillaDePasaje): {
  a: number;
  b: number;
  r: number;
  a1: number;
  b1: number;
  r1: number;
} {
  const a = v.ancho / 2;
  const b = v.alto / 2;
  // La misma esquina que el modelo: ver `ventanas` en `modelos/exterior.py`.
  const r = Math.min(a, b) * 0.9;
  return {
    a,
    b,
    r,
    a1: a + MARGEN_DEL_HUECO,
    b1: b + MARGEN_DEL_HUECO,
    r1: r + MARGEN_DEL_HUECO,
  };
}

/** La distancia de la sombra: negativa dentro. La misma que el sombreador. */
function caja(x: number, y: number, a: number, b: number, r: number): number {
  const qx = Math.abs(x) - a + r;
  const qy = Math.abs(y) - b + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * **Cuánto tapa la persiana de uno desde arriba**, m: el filo cuando está
 * subida y el cristal entero bajada. El cristal que se oscurece no tapa nada:
 * se tiñe.
 */
export function cortinaDe(
  ventanilla: VentanillaDePasaje,
  tipo: TipoDeVentanilla,
  tapa: number,
): number {
  if (tipo === "electrocromica") return 0;
  const b = ventanilla.alto / 2;
  return PERSIANA + tapa * (2 * b - PERSIANA);
}

const _base = new Matrix3();
const _o = new Vector3();
const _d = new Vector3();
const _c = new Vector3();

/**
 * **Si desde `desde` se ve `hacia` por el cristal**: la misma cuenta que hace
 * el sombreador con cada píxel —pasar el hueco del forro y llegar al cristal
 * sin tocar el canto, la junta ni la persiana—, para poder preguntarlo sin
 * pintar. La usan las pruebas y el banco de la mirada: que lo señalado caiga
 * en el centro de la pantalla no vale si en el centro está la pared.
 *
 * `cortina` es lo que tapa la persiana desde arriba, m: el filo si no se dice.
 * Ver `cortinaDe`.
 */
export function seVePorLaVentanilla(
  desde: Vector3,
  hacia: { readonly x: number; readonly y: number; readonly z: number },
  avion: { readonly position: Vector3; readonly orientation: Quaternion },
  ventanilla: VentanillaDePasaje,
  cortina = PERSIANA,
): boolean {
  baseDeLaVentanilla(ventanilla, avion.orientation, _base);
  const c = ventanilla.centro;
  _c.set(c.x, c.y, c.z).applyQuaternion(avion.orientation).add(avion.position);
  _o.copy(desde).sub(_c).applyMatrix3(_base);
  _d.set(hacia.x, hacia.y, hacia.z).sub(desde).normalize().applyMatrix3(_base);
  if (_d.z < 1e-4) return false;
  const m = medidasDelHueco(ventanilla);
  const t1 = (-FONDO - _o.z) / _d.z;
  const t0 = -_o.z / _d.z;
  const x1 = _o.x + _d.x * t1;
  const y1 = _o.y + _d.y * t1;
  const x0 = _o.x + _d.x * t0;
  const y0 = _o.y + _d.y * t0;
  return (
    caja(x1, y1, m.a1, m.b1, m.r1) < 0 &&
    caja(x0, y0, m.a, m.b, m.r) < -JUNTA &&
    y0 < m.b - cortina
  );
}

/**
 * **Qué se toca en la pared**, desde la cámara, en un punto de la pantalla de
 * −1 a 1: la ventanilla de uno —con su bisel, que es donde se pone el dedo
 * para bajar la persiana—, el botón del cristal que se oscurece, o nada.
 */
export function queSeTocaEnLaPared(
  camara: PerspectiveCamera,
  x: number,
  y: number,
  avion: { readonly position: Vector3; readonly orientation: Quaternion },
  ventanilla: VentanillaDePasaje,
  tipo: TipoDeVentanilla,
): "ventanilla" | "boton" | null {
  camara.updateMatrixWorld();
  baseDeLaVentanilla(ventanilla, avion.orientation, _base);
  const c = ventanilla.centro;
  _c.set(c.x, c.y, c.z).applyQuaternion(avion.orientation).add(avion.position);
  _o.copy(camara.position).sub(_c).applyMatrix3(_base);
  _d.set(x, y, 0.5).unproject(camara).sub(camara.position).normalize().applyMatrix3(_base);
  if (_d.z < 1e-4) return null;
  const m = medidasDelHueco(ventanilla);
  const t1 = (-FONDO - _o.z) / _d.z;
  const x1 = _o.x + _d.x * t1;
  const y1 = _o.y + _d.y * t1;
  if (caja(x1, y1, m.a1, m.b1, m.r1) < BISEL) return "ventanilla";
  // El botón, con un dedo de margen: es pequeño y se toca con la yema.
  if (
    tipo === "electrocromica" &&
    caja(x1, y1 + (m.b1 + BOTON.bajo), BOTON.ancho / 2, BOTON.alto / 2, 0.008) < 0.02
  )
    return "boton";
  return null;
}

/**
 * **Dónde va la trampilla de la salida en la pared**, en los ejes de la
 * ventanilla de uno, m: su centro a lo largo —hacia la cola, positivo— y de
 * alto, y sus medias medidas, con el forro.
 *
 * **A un paso de cuaderna, como las vecinas**, y no donde la pone el modelo:
 * el de fuera separa más sus ventanillas para que se lean de lejos —ver
 * `pasoDeVentanillas`—, y desde dentro la trampilla ocupa el sitio de la
 * ventanilla de al lado, que es lo que es. Nunca encima del hueco de uno.
 */
export function salidaEnLaPared(
  ventanilla: VentanillaDePasaje,
  salida: SalidaDeAlLado,
): { haciaLaCola: number; arriba: number; medioAncho: number; medioAlto: number } {
  const m = medidasDelHueco(ventanilla);
  const medioAncho = salida.ancho / 2 + SALIDA.forro;
  const lejos = Math.max(pasoDeVentanillas(ventanilla.ancho), m.a1 + BISEL + medioAncho + 0.01);
  return {
    haciaLaCola: salida.haciaLaCola >= 0 ? lejos : -lejos,
    arriba: salida.arriba,
    medioAncho,
    medioAlto: salida.alto / 2 + SALIDA.forro,
  };
}

/**
 * **Lo que tiene que asomar de la salida**, en coordenadas del avión: la
 * esquina de abajo del letrero que da a la ventanilla de uno, y el canto de la
 * trampilla de ese lado, a media altura. Lo usa quien elige hacia dónde se
 * mira sentado: que asome no es que se vea entero.
 */
export function loQueAsomaDeLaSalida(
  ventanilla: VentanillaDePasaje,
  salida: SalidaDeAlLado,
): Vector3[] {
  const s = salidaEnLaPared(ventanilla, salida);
  const n = new Vector3(ventanilla.normal.x, ventanilla.normal.y, ventanilla.normal.z).normalize();
  const arriba = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const c = ventanilla.centro;
  const enLaPared = (largo: number, alto: number): Vector3 =>
    new Vector3(c.x, c.y, c.z)
      .add(new Vector3(0, 0, largo))
      .addScaledVector(arriba, alto)
      .addScaledVector(n, -FONDO);
  const hacia = Math.sign(s.haciaLaCola);
  return [
    enLaPared(s.haciaLaCola - (hacia * LETRERO.ancho) / 4, s.arriba + s.medioAlto + LETRERO.encima),
    enLaPared(s.haciaLaCola - hacia * s.medioAncho, s.arriba),
  ];
}

/**
 * **Lo que tiene que verse del marco** para que se lea como una ventanilla, en
 * coordenadas del avión: el borde de fuera del bisel, arriba y abajo, en la
 * pared. Si se sale por arriba o por abajo, la ventanilla se come la pantalla
 * y se pierde lo que dice «estás dentro». Lo usa quien elige a cuánto del
 * cristal se asoma uno.
 */
export function elMarcoEntero(ventanilla: VentanillaDePasaje): Vector3[] {
  const m = medidasDelHueco(ventanilla);
  const n = new Vector3(ventanilla.normal.x, ventanilla.normal.y, ventanilla.normal.z).normalize();
  const arriba = new Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
  const c = ventanilla.centro;
  return [1, -1].map((s) =>
    new Vector3(c.x, c.y, c.z)
      .addScaledVector(arriba, s * (m.b1 + BISEL))
      .addScaledVector(n, -FONDO),
  );
}

/**
 * **La franja de la funda del cabezal**: el color de la librea que va en el
 * avión, como lo lleva una compañía en sus fundas. El de la franja del avión,
 * salvo que sea el verde del tapizado, que encima de él no se vería: entonces
 * el del remate o el de la raya. En el JAZ 90 y en el JAZ 120 sale el
 * terracota del tejado del logotipo.
 */
export function franjaDeLaFunda(librea: {
  readonly accent: number;
  readonly trim: number;
  readonly remate?: number;
}): number {
  return librea.accent !== CASA.verde ? librea.accent : (librea.remate ?? librea.trim);
}

/** Lo que se le pide a la cabina para pintarla. Ver `CabinaDePasaje`. */
export interface CabinaQueSePinta {
  readonly tipoDeVentanilla: TipoDeVentanilla;
  readonly vecinas: Vecinas;
  /** Cuánto tapa cada una: la de uno, la de delante y la de detrás. */
  readonly tapan: readonly [number, number, number];
  /** Las luces de la cabina de noche, de 0 a 1. */
  readonly luz: number;
  /** El parpadeo del botón que no hace caso, de 0 a 1. */
  readonly parpadeo: number;
}

export class MarcoDeVentanilla {
  readonly malla: Mesh;
  /** El tinte del cristal que se oscurece. Ver la cabecera. */
  readonly cristal: Mesh;
  private readonly material: ShaderMaterial;
  private readonly oscuro: ShaderMaterial;
  private readonly base = new Matrix3();
  private readonly enElAvion = new Matrix3();
  private readonly camara = new Matrix3();
  private readonly centro = new Vector3();
  private readonly ojo = new Vector3();
  private readonly sentado = new Vector3();

  constructor() {
    /*
     * La geometría de la fila, compartida: los dos sombreadores tienen que
     * hacer la misma cuenta con los mismos números, o el tinte se saldría
     * del cristal.
     */
    const fila: Record<string, IUniform> = {
      uInvProj: { value: null },
      uCamAVentana: { value: new Matrix3() },
      uOrigen: { value: new Vector3() },
      uCristal: { value: new Vector3(0.14, 0.2, 0.06) },
      uHueco: { value: new Vector3(0.17, 0.23, 0.09) },
      uFondo: { value: FONDO },
      uPaso: { value: 0.53 },
      uAtras: { value: 1 },
      uVecinas: { value: new Vector2(1, 1) },
      uTapan: { value: new Vector3() },
      uSalida: { value: new Vector4() },
    };
    this.material = new ShaderMaterial({
      vertexShader: VERTICES,
      fragmentShader: FRAGMENTOS,
      uniforms: {
        ...fila,
        uConPersiana: { value: 1 },
        uRespaldo: { value: new Vector4(0, 0, 0, 1) },
        uVertical: { value: new Vector2(1, 0) },
        uParpadeo: { value: 0 },
        uPared: { value: lineal(COLORES.pared) },
        uBisel: { value: lineal(COLORES.bisel) },
        uSombra: { value: lineal(COLORES.sombra) },
        uJunta: { value: lineal(COLORES.junta) },
        uPersiana: { value: lineal(COLORES.persiana) },
        uAbajo: { value: lineal(COLORES.abajo) },
        uAsiento: { value: lineal(COLORES.asiento) },
        uFunda: { value: lineal(COLORES.funda) },
        uBoton: { value: lineal(COLORES.boton) },
        uLuzBoton: { value: lineal(COLORES.luz) },
        uLuz: { value: new Color(1, 1, 1) },
        uGrano: { value: teselaDeGrano() },
        uRojo: { value: lineal(COLORES.rojo) },
        uLetrero: { value: lineal(COLORES.letrero) },
        uPropio: { value: new Vector4() },
        uFranja: { value: new Color(CASA.terracota) },
      },
      depthTest: true,
      depthWrite: true,
      fog: false,
    });
    // El borde del cristal, suave con el multimuestreo. Ver la cabecera.
    this.material.alphaToCoverage = true;
    this.malla = new Mesh(trianguloDePantalla(), this.material);
    this.malla.name = "marco-de-ventanilla";
    this.malla.frustumCulled = false;
    // Lo primero de todo: así lo de detrás de la pared ni se calcula.
    this.malla.renderOrder = Number.MIN_SAFE_INTEGER;
    this.malla.visible = false;

    /*
     * **Y el tinte, lo último de todo**: multiplica lo pintado, a la misma
     * profundidad que el marco y con la prueba estricta, así que donde escribió
     * el marco —la pared— no pasa, y donde no —el cristal— sí.
     */
    this.oscuro = new ShaderMaterial({
      vertexShader: VERTICES,
      fragmentShader: OSCURO,
      uniforms: { ...fila, uTinte: { value: TINTE.clone() } },
      depthTest: true,
      depthWrite: false,
      depthFunc: LessDepth,
      transparent: true,
      blending: MultiplyBlending,
      premultipliedAlpha: true,
      fog: false,
    });
    this.cristal = new Mesh(trianguloDePantalla(), this.oscuro);
    this.cristal.name = "cristal-oscuro";
    this.cristal.frustumCulled = false;
    this.cristal.renderOrder = Number.MAX_SAFE_INTEGER;
    this.cristal.visible = false;
  }

  get visible(): boolean {
    return this.malla.visible;
  }

  set visible(si: boolean) {
    this.malla.visible = si;
    if (!si) this.cristal.visible = false;
  }

  /**
   * Lo coloca para este fotograma, **con la cámara ya puesta**: la vista, el
   * giro de la cabeza y el ángulo.
   *
   * `dia` es cuánto es de día dentro de la cabina, de 0 a 1; `cabina`, las
   * persianas, las vecinas y las luces. Sin ella, la de siempre: persiana
   * subida, las dos vecinas y las luces de crucero.
   */
  poner(
    camara: PerspectiveCamera,
    avion: { readonly position: Vector3; readonly orientation: Quaternion },
    asiento: AsientoDePasaje,
    dia: number,
    cabina: CabinaQueSePinta | null = null,
  ): void {
    const ventanilla = asiento.ventanilla;
    const u = this.material.uniforms;
    camara.updateMatrixWorld();
    u.uInvProj!.value = camara.projectionMatrixInverse;

    baseDeLaVentanilla(ventanilla, avion.orientation, this.base);
    this.camara.setFromMatrix4(camara.matrixWorld);
    (u.uCamAVentana!.value as Matrix3).multiplyMatrices(this.base, this.camara);

    const c = ventanilla.centro;
    this.centro.set(c.x, c.y, c.z).applyQuaternion(avion.orientation).add(avion.position);
    this.ojo.copy(camara.position).sub(this.centro).applyMatrix3(this.base);
    (u.uOrigen!.value as Vector3).copy(this.ojo);

    const m = medidasDelHueco(ventanilla);
    (u.uCristal!.value as Vector3).set(m.a, m.b, m.r);
    (u.uHueco!.value as Vector3).set(m.a1, m.b1, m.r1);
    u.uPaso!.value = pasoDeVentanillas(ventanilla.ancho);

    /*
     * Hacia dónde queda la cola a lo largo de la pared, y dónde están los ojos
     * de sentado, en los ejes de la ventanilla y sin el avión: el respaldo de
     * delante no se mueve cuando uno se asoma.
     */
    baseDeLaVentanilla(ventanilla, SIN_GIRO, this.enElAvion);
    const e = this.enElAvion.elements;
    // La fila «a lo largo» de la base, en el avión: su z dice hacia la cola.
    u.uAtras!.value = (e[6] ?? 0) >= 0 ? 1 : -1;
    // Sentado del todo, que es donde está el asiento: asomado, los ojos se
    // van, pero los respaldos se quedan donde están.
    const sentado = asiento.sentado ?? asiento.ojo;
    this.sentado
      .set(sentado.x - c.x, sentado.y - c.y, sentado.z - c.z)
      .applyMatrix3(this.enElAvion);
    /*
     * **Los respaldos van de pie**, y la pared no: se inclina con el fuselaje
     * —ver `INCLINACION_MAXIMA`—. Así que se miden en ejes de pie, con lo
     * vertical de verdad: lo alto, desde los ojos sentado; y el canto de la
     * ventanilla, a su hueco de la pared a esa altura. Medidos por la pared se
     * veían tumbados, como caídos hacia el pasillo.
     */
    const cv = e[4] ?? 1;
    const sv = e[5] ?? 0;
    (u.uVertical!.value as Vector2).set(cv, sv);
    const alto = this.sentado.y * cv + this.sentado.z * sv - RESPALDO.bajoLosOjos;
    const yPared = (alto + FONDO * sv) / cv;
    const canto = -yPared * sv - FONDO * cv - RESPALDO.hueco;
    const atrasDe = u.uAtras!.value as number;
    (u.uRespaldo!.value as Vector4).set(this.sentado.x - atrasDe * RESPALDO.delante, alto, canto, 1);
    // Y el de uno, solo si se ha despegado de él: sentado, uno lo tiene en la
    // espalda y no lo ve.
    (u.uPropio!.value as Vector4).set(
      this.sentado.x + atrasDe * PROPIO.detras,
      alto,
      canto,
      asiento.sentado ? 1 : 0,
    );

    const tipo = cabina?.tipoDeVentanilla ?? "persiana";
    const tapan = cabina?.tapan ?? [0, 0, 0];
    const vecinas = cabina?.vecinas ?? { delante: true, detras: true };
    u.uConPersiana!.value = tipo === "persiana" ? 1 : 0;
    (u.uTapan!.value as Vector3).set(tapan[0], tapan[1], tapan[2]);
    /*
     * **La salida de al lado**, en los ejes de la pared: a lo largo, hacia la
     * cola si la pared mira hacia allí. Y con salida, esa vecina está siempre:
     * la trampilla lleva su ventanilla, no hay columna. Ver `salidaEnLaPared`.
     */
    const salida = asiento.salida;
    const atras = u.uAtras!.value as number;
    let conSalida = { delante: false, detras: false };
    if (salida) {
      const s = salidaEnLaPared(ventanilla, salida);
      (u.uSalida!.value as Vector4).set(s.haciaLaCola * atras, s.arriba, s.medioAncho, s.medioAlto);
      conSalida =
        salida.haciaLaCola > 0
          ? { delante: false, detras: true }
          : { delante: true, detras: false };
    } else (u.uSalida!.value as Vector4).set(0, 0, 0, 0);
    (u.uVecinas!.value as Vector2).set(
      vecinas.delante || conSalida.delante ? 1 : 0,
      vecinas.detras || conSalida.detras ? 1 : 0,
    );
    u.uParpadeo!.value = cabina?.parpadeo ?? 0;

    /*
     * La luz: la del día que entra, y de noche la de las luces del pasaje,
     * que la tripulación baja para despegar y aterrizar. Y con la persiana de
     * uno bajada entra menos día.
     */
    const noche = cabina?.luz ?? 0.3;
    const deDia = dia * (1 - 0.3 * (tipo === "persiana" ? tapan[0] : tapan[0] * 0.8));
    const luz = noche + (1 - noche) * deDia;
    (u.uLuz!.value as Color)
      .setRGB(1, 1, 1)
      .lerp(CALIDA, 1 - dia)
      .multiplyScalar(luz);

    // El tinte, solo si hay algún cristal oscurecido.
    this.cristal.visible =
      this.malla.visible && tipo === "electrocromica" && Math.max(...tapan) > 0.003;
  }

  /** El color de la franja de la funda, de la librea del avión. Ver `franjaDeLaFunda`. */
  librea(franja: number): void {
    (this.material.uniforms.uFranja!.value as Color).setHex(franja);
  }

  /** Lo que mide la ventanilla que se está pintando. Para las pruebas. */
  get medidas(): { cristal: Vector3; hueco: Vector3 } {
    return {
      cristal: this.material.uniforms.uCristal!.value as Vector3,
      hueco: this.material.uniforms.uHueco!.value as Vector3,
    };
  }

  dispose(): void {
    this.malla.geometry.dispose();
    (this.material.uniforms.uGrano!.value as DataTexture).dispose();
    this.material.dispose();
    this.cristal.geometry.dispose();
    this.oscuro.dispose();
  }
}
