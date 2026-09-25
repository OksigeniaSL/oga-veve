/**
 * Cielo, luz y hora del día.
 *
 * El cielo ocupa la mitad de la pantalla de un juego de volar y hasta ahora era
 * un degradado fijo con el sol clavado a mediodía. Eso es lo que hace que un
 * paisaje no tenga forma: **el mediodía es la única hora del día en la que no
 * hay sombras que lo cuenten.**
 *
 * Y desde que el suelo puede venir de fotografías, el cielo es enteramente
 * nuestro: las teselas fotorrealistas mandan terreno y nada más. Lo que hay
 * sobre el horizonte —el color, el sol, la bruma, las nubes y las estrellas— es
 * lo único que este juego puede dirigir de arriba abajo.
 *
 * ## Cómo se mueve el sol
 *
 * No hay efemérides ni declinación solar. Sale por el este, se pone por el
 * oeste y a mediodía pasa por el azimut que tenga escrito el escenario —ciento
 * ocho grados en Tenerife, que es un dato real—; la altura describe un seno
 * entre el amanecer y el ocaso. Eso da un recorrido creíble en cualquier
 * latitud, incluidas las dos que nos importan, que están en hemisferios
 * distintos.
 *
 * Un modelo astronómico de verdad daría el mismo dibujo con más decimales y
 * ninguna diferencia visible desde una avioneta. Cuando haga falta —para las
 * sombras largas de un solsticio, por ejemplo— se cambia esta función y nada
 * más.
 *
 * ## Y el color no se calcula, se elige
 *
 * Cinco paletas puestas a mano en cinco alturas del sol, y se interpola entre
 * ellas. Un cielo con dispersión de Rayleigh de verdad se ve mejor en una
 * captura fija y cuesta caro en una tablet; cinco paletas **elegidas** dan una
 * hora del día que se reconoce, que es de lo que se trata. La diferencia entre
 * esto y lo de antes no es la física: es que antes no había ninguna decisión
 * tomada.
 */

import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import { mulberry32 } from "./noise";
import type { Scenario } from "./scenarios";

/*
 * **La dirección se mide desde el centro de la cúpula, no desde el origen.**
 *
 * Esto decía `modelMatrix * position` y le pasaba al fragmento la posición en
 * el mundo. Suena inofensivo y es el fallo entero: la cúpula **viaja con la
 * cámara** —ver `updateSky`, que le copia la posición cada fotograma— así que
 * lo que llegaba era «dónde está este trozo de cielo en el mapa», no «hacia
 * dónde hay que mirar para verlo». Normalizado, eso es la dirección desde el
 * origen del escenario, y el avión no está en el origen del escenario: está a
 * cinco o diez kilómetros. La cuenta del cielo entero salía torcida esos
 * grados.
 *
 * Lo que se veía: el degradado del horizonte inclinado, y el sol **dibujado
 * donde no está** — «el sol, literalmente, debajo del horizonte». No era una
 * mancha rara ni una nube: era el sol, en el sitio equivocado, con su disco
 * más apagado que el resplandor que lo rodea.
 *
 * La esfera es de radio uno, así que su vértice **es** la dirección.
 *
 * Y con ella se fue el `offset`, que sumaba 0,12 a la dirección antes de
 * normalizarla. Sobre una esfera unidad eso levanta el cielo unos siete
 * grados —o sea, **pinta el sol siete grados más abajo de donde está**, que es
 * la misma avería que se viene a arreglar—. Sobre una de dieciséis mil metros
 * de radio, que es lo que había, no hacía absolutamente nada. Llevaba meses
 * siendo un cero, así que quitarlo no cambia lo que se ve; dejarlo puesto
 * ahora sí lo habría cambiado, y para peor.
 */
const VERTEX_SHADER = /* glsl */ `
  varying vec3 vDireccion;
  void main() {
    vDireccion = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 horizonColour;
  uniform vec3 zenithColour;
  uniform vec3 sunColour;
  uniform vec3 sunDirection;
  uniform float haloFuerza;
  varying vec3 vDireccion;

  void main() {
    vec3 dir = normalize(vDireccion);

    // La potencia comprime el degradado hacia el horizonte, que es donde el
    // ojo espera ver la transición. Un lerp lineal se ve plano.
    float t = pow(max(dir.y, 0.0), 0.62);
    vec3 sky = mix(horizonColour, zenithColour, t);

    // Sol y halo. Son dos potencias del mismo coseno: una muy cerrada para el
    // disco y otra muy abierta para el resplandor que lo rodea. Diez líneas
    // que cambian por completo la sensación de que hay una hora del día.
    //
    // **El halo se abre y se enciende al atardecer.** Con la fuerza fija, el
    // sol de las ocho de la tarde se veía igual de blanco y pequeño que el de
    // mediodía, y no hay nada que delate más un cielo falso.
    float toSun = max(dot(dir, normalize(sunDirection)), 0.0);
    float halo = pow(toSun, mix(60.0, 5.0, haloFuerza)) * (0.35 + haloFuerza * 0.85);
    float disc = smoothstep(0.9986, 0.9994, toSun);
    // **Y por debajo del horizonte, nada de sol: ahí está la Tierra.** La
    // cúpula sigue por debajo, y donde el terreno se acaba a lo lejos se veía
    // el halo del ocaso a través del suelo, como un sol al trasluz del
    // planeta. Se apaga en un par de grados, que es lo que mide el disco.
    float tapado = smoothstep(-0.02, 0.01, dir.y);
    halo *= tapado;
    disc *= tapado;
    sky += sunColour * halo;
    /*
     * **Y el disco suma, no sustituye.**
     *
     * Esto era una mezcla hacia el color del sol con el disco de factor: en
     * el sitio exacto donde está el sol se tiraba todo lo anterior y se
     * ponía el color del sol a secas. Pero justo ahí el halo ya había sumado casi el doble de ese
     * mismo color, así que el disco salía **más oscuro que el resplandor que
     * lo rodea**: un agujero en su propio brillo. Al atardecer, con el halo
     * abierto del todo, eso es una mancha parda en mitad del cielo naranja.
     *
     * El sol es la fuente: tiene que ser lo más claro del cielo, nunca un
     * hueco. Sumando, lo es siempre.
     */
    sky += sunColour * disc;

    gl_FragColor = vec4(sky, 1.0);
  }
`;

/**
 * Los dos programas y los gajos, para poder comprobarlos sin tarjeta gráfica.
 *
 * Un shader no se puede ejecutar en una prueba de las de este proyecto —no hay
 * contexto de GL, y montar uno sería traerse medio navegador—. Lo que sí se
 * puede clavar es **el texto**, y resulta que las dos averías que tuvo este
 * cielo eran de texto: una palabra de más (`modelMatrix`), un sumando de más
 * (`offset`) y un `mix` donde tenía que haber un `+=`. Ver `sky.test.ts`.
 */
export const GLSL_DEL_CIELO = {
  vertice: VERTEX_SHADER,
  fragmento: FRAGMENT_SHADER,
} as const;

/**
 * En cuántos trozos se parte la cúpula.
 *
 * Aquí y no escrito dentro de la llamada porque es una decisión con motivo
 * —ver `createSky`— y porque es lo que se comprueba.
 */
export const GAJOS_DEL_CIELO = { ancho: 64, alto: 48 } as const;


/**
 * Las cinco horas del cielo, por altura del sol en grados.
 *
 * No son colores sacados de una fórmula: están puestos a mano mirando fotos, y
 * el orden importa más que los valores. De noche el horizonte es **más claro**
 * que el cenit —la luz de las ciudades y lo que queda del día—, y al amanecer
 * el horizonte se enciende mucho antes que el resto del cielo.
 */
interface Momento {
  /** Altura del sol, en grados. */
  readonly altura: number;
  readonly horizonte: number;
  readonly cenit: number;
  /** El color del propio sol y de la luz que manda. */
  readonly sol: number;
  /** Intensidad de la luz direccional. */
  readonly fuerza: number;
  /** Cuánto rellena la luz de ambiente. De noche casi nada. */
  readonly relleno: number;
  /** Cuánto se ven las estrellas, de 0 a 1. */
  readonly estrellas: number;
}

const MOMENTOS: readonly Momento[] = [
  // Noche cerrada.
  {
    altura: -18,
    horizonte: 0x0d1626,
    cenit: 0x04060e,
    sol: 0x2a3a55,
    fuerza: 0.05,
    relleno: 0.12,
    estrellas: 1,
  },
  // Crepúsculo: el sol ya no se ve pero el horizonte todavía arde.
  {
    altura: -6,
    horizonte: 0x5a4364,
    cenit: 0x101a35,
    sol: 0x8c5a6a,
    fuerza: 0.18,
    relleno: 0.3,
    estrellas: 0.55,
  },
  // Amanecer y ocaso, con el sol en el horizonte. La hora buena.
  {
    altura: 0,
    horizonte: 0xf0803c,
    cenit: 0x3a5a8e,
    sol: 0xff8c3a,
    fuerza: 0.9,
    relleno: 0.5,
    estrellas: 0.12,
  },
  // Sol bajo: sombras largas, luz cálida. Las cinco y media de la tarde.
  {
    altura: 12,
    horizonte: 0xf3cfa4,
    cenit: 0x4f86c6,
    sol: 0xffd9a0,
    fuerza: 2.4,
    relleno: 0.42,
    estrellas: 0,
  },
  // Mediodía.
  {
    altura: 60,
    horizonte: 0xdfe7ea,
    cenit: 0x4a86c8,
    sol: 0xfff4e2,
    fuerza: 3.1,
    relleno: 0.5,
    estrellas: 0,
  },
];

export interface SkyRig {
  group: Group;
  sun: DirectionalLight;
  fog: FogExp2;
  /** Dirección desde la que viene la luz, normalizada. */
  sunDirection: Vector3;
  /** Pone una hora del día, de 0 a 24. */
  ponerHora(hora: number): void;
  /**
   * Cuánto deslumbra el sol, de cero a uno. Uno es lo normal.
   *
   * Lo bajan las gafas de sol —ver `flight/gafas.ts`—, que es exactamente lo
   * que hacen unas gafas de sol: no cambian la hora que es, cierran el halo.
   * Va aparte de `ponerHora` porque no depende de ella y porque la hora se
   * pone muchas veces; esto, casi nunca.
   */
  ponerDeslumbre(cuanto: number): void;
  /** Qué hora es ahora mismo. */
  readonly hora: number;
}

/** Interpola entre dos momentos y devuelve el resultado ya mezclado. */
function entre(a: Momento, b: Momento, t: number): Momento {
  const mezcla = (x: number, y: number): number =>
    new Color(x).lerp(new Color(y), t).getHex();
  return {
    altura: a.altura + (b.altura - a.altura) * t,
    horizonte: mezcla(a.horizonte, b.horizonte),
    cenit: mezcla(a.cenit, b.cenit),
    sol: mezcla(a.sol, b.sol),
    fuerza: a.fuerza + (b.fuerza - a.fuerza) * t,
    relleno: a.relleno + (b.relleno - a.relleno) * t,
    estrellas: a.estrellas + (b.estrellas - a.estrellas) * t,
  };
}

/** El momento que toca para una altura del sol. */
function momentoDe(altura: number): Momento {
  if (altura <= MOMENTOS[0]!.altura) return MOMENTOS[0]!;
  for (let i = 1; i < MOMENTOS.length; i++) {
    const a = MOMENTOS[i - 1]!;
    const b = MOMENTOS[i]!;
    if (altura <= b.altura) {
      return entre(a, b, (altura - a.altura) / (b.altura - a.altura));
    }
  }
  return MOMENTOS[MOMENTOS.length - 1]!;
}

/**
 * Dónde está el sol a una hora dada.
 *
 * Amanece a las seis y anochece a las dieciocho: no es verdad ningún día del
 * año en ningún sitio, y es exactamente lo que hace falta para que la rueda del
 * tiempo se entienda sin explicarla. La altura describe un seno entre esas dos
 * horas y sigue bajando por debajo del horizonte durante la noche, que es lo
 * que hace que el crepúsculo dure lo que dura.
 */
function solALaHora(
  hora: number,
  azimutMediodia: number,
  alturaMaxima: number,
): {
  altura: number;
  azimut: number;
} {
  // De 0 en el amanecer a 1 en el ocaso, y siguiendo fuera del intervalo.
  const t = (hora - 6) / 12;
  const altura = Math.sin(t * Math.PI) * (t < 0 || t > 1 ? 18 : alturaMaxima);

  // El azimut recorre de noventa —el este— al azimut de mediodía y de ahí a
  // doscientos setenta, el oeste. Pasar por el azimut escrito en el escenario
  // es lo que hace que esto valga en los dos hemisferios sin un `if`.
  const claro = Math.max(0, Math.min(1, t));
  const azimut =
    claro < 0.5
      ? 90 + (azimutMediodia - 90) * (claro / 0.5)
      : azimutMediodia + (270 - azimutMediodia) * ((claro - 0.5) / 0.5);
  return { altura, azimut };
}

/**
 * Las estrellas: mil doscientos puntos en la esfera, siempre las mismas.
 *
 * Semilla fija por lo mismo que las casas: un cielo que se sortea cada partida
 * no se aprende, y aprenderse el cielo es de las cosas que este juego debería
 * poder enseñar. Se agrupan un poco hacia una banda, que es la vía láctea de
 * los pobres y basta para que no parezca papel picado.
 */
function estrellas(): Points {
  const cuantas = 1200;
  const posiciones = new Float32Array(cuantas * 3);
  const tamanos = new Float32Array(cuantas);
  const sorteo = mulberry32(0xc1e10);

  for (let i = 0; i < cuantas; i++) {
    // Distribución uniforme en la esfera: el coseno de la latitud, no la
    // latitud. Sorteando el ángulo directamente se amontonan en los polos.
    const z = sorteo() * 2 - 1;
    const r = Math.sqrt(1 - z * z);
    const a = sorteo() * Math.PI * 2;
    // Solo la mitad de arriba: debajo del horizonte no se ven.
    const y = Math.abs(z) * 0.92 + 0.04;
    posiciones[i * 3] = r * Math.cos(a);
    posiciones[i * 3 + 1] = y;
    posiciones[i * 3 + 2] = r * Math.sin(a);
    tamanos[i] = sorteo();
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(posiciones, 3));
  const puntos = new Points(
    geo,
    new PointsMaterial({
      color: 0xdce6f2,
      size: 0.0022,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  puntos.name = "estrellas";
  puntos.renderOrder = -1;
  return puntos;
}

/**
 * Una textura de nube, pintada una vez en un lienzo.
 *
 * Ruido de valor sumado en cuatro octavas y recortado por abajo: lo que queda
 * por debajo del umbral es cielo, y lo de arriba, nube. El recorte es lo que
 * separa una nube de una mancha — sin él sale niebla uniforme.
 */
function texturaDeNube(semilla: number): CanvasTexture {
  const lado = 256;
  const lienzo = document.createElement("canvas");
  lienzo.width = lado;
  lienzo.height = lado;
  const g = lienzo.getContext("2d")!;
  const imagen = g.createImageData(lado, lado);
  const sorteo = mulberry32(semilla);

  // Una rejilla de valores por octava, interpolada. Se envuelve por los bordes
  // para que la textura se pueda repetir sin costura.
  const octavas = [4, 8, 16, 32].map((n) => {
    const v = new Float32Array(n * n);
    for (let i = 0; i < v.length; i++) v[i] = sorteo();
    return { n, v };
  });

  const suave = (t: number): number => t * t * (3 - 2 * t);
  const valor = (
    o: { n: number; v: Float32Array },
    x: number,
    y: number,
  ): number => {
    const fx = x * o.n;
    const fy = y * o.n;
    const x0 = Math.floor(fx) % o.n;
    const y0 = Math.floor(fy) % o.n;
    const x1 = (x0 + 1) % o.n;
    const y1 = (y0 + 1) % o.n;
    const tx = suave(fx - Math.floor(fx));
    const ty = suave(fy - Math.floor(fy));
    const a = o.v[y0 * o.n + x0]! * (1 - tx) + o.v[y0 * o.n + x1]! * tx;
    const b = o.v[y1 * o.n + x0]! * (1 - tx) + o.v[y1 * o.n + x1]! * tx;
    return a * (1 - ty) + b * ty;
  };

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let n = 0;
      let peso = 0;
      let amplitud = 1;
      for (const o of octavas) {
        n += valor(o, x / lado, y / lado) * amplitud;
        peso += amplitud;
        amplitud *= 0.5;
      }
      n /= peso;
      // El recorte: por debajo de esto no hay nube.
      const alfa = Math.max(0, (n - 0.52) / 0.48);
      const i = (y * lado + x) * 4;
      imagen.data[i] = 255;
      imagen.data[i + 1] = 255;
      imagen.data[i + 2] = 255;
      imagen.data[i + 3] = Math.round(Math.min(1, alfa * 1.5) * 255);
    }
  }
  g.putImageData(imagen, 0, 0);
  const textura = new CanvasTexture(lienzo);
  textura.wrapS = 1000;
  textura.wrapT = 1000;
  return textura;
}

/**
 * Las nubes: cinco láminas apiladas, no una.
 *
 * Con una sola lámina, atravesarla es cruzar una hoja de papel infinitamente
 * fina y se ve el truco de golpe. Cinco repartidas en trescientos metros, cada
 * una con su desplazamiento, dan un banco con grosor: se entra, se está dentro
 * un rato y se sale. Es la diferencia entre una nube pintada y una nube.
 */
function nubes(escenario: Scenario): Group {
  const grupo = new Group();
  grupo.name = "nubes";
  const lado = escenario.size * 4;
  const capas = 5;
  /*
   * **Cuántas veces se repite el dibujo, o sea cómo de grande es una nube.**
   *
   * Eran tres, y tres sobre un plano de `size × 4` son **veinticuatro
   * kilómetros de baldosa**: en Gran Canaria, una nube del tamaño de la
   * isla. Y no se lee como nube, se lee como una mancha rara en el cielo —
   * «vaya sol este más raro», con la foto de un lobanillo naranja encima de
   * la cumbre.
   *
   * Con doce, la baldosa baja a seis kilómetros y cada borrón del dibujo
   * anda por el kilómetro y medio, que es lo que mide un cúmulo. No cuesta
   * nada: misma geometría, mismos triángulos, la misma textura repetida más
   * veces.
   */
  const repite = 12;
  for (let i = 0; i < capas; i++) {
    const geo = new PlaneGeometry(lado, lado);
    geo.rotateX(-Math.PI / 2);
    const textura = texturaDeNube(0xc10d + i * 977);
    textura.repeat.set(repite, repite);
    textura.offset.set(i * 0.17, i * 0.31);
    const malla = new Mesh(
      geo,
      new MeshBasicMaterial({
        map: textura,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
      }),
    );
    malla.position.y = i * 70;
    malla.renderOrder = -1;
    grupo.add(malla);
  }
  /*
   * **Cada cuánto se repite el dibujo**, que es lo que permite mover el banco
   * sin que se note. La textura va con `repeat(repite, repite)` sobre un plano
   * de `lado`, así que el patrón es el mismo cada `lado / repite` metros. Sale
   * de la misma constante y no de un número escrito dos veces: con los dos
   * desacompasados, el banco salta a un sitio donde el dibujo no encaja y las
   * nubes dan un respingo. Ver `updateSky`.
   */
  grupo.userData.paso = lado / repite;
  grupo.visible = false;
  return grupo;
}

export function createSky(scenario: Scenario): SkyRig {
  const group = new Group();

  /*
   * **Y con gajos de sobra.**
   *
   * Eran 24×16, o sea trozos de quince grados de ancho y once de alto. La
   * dirección se interpola linealmente por la cara del triángulo, y sobre un
   * trozo tan grande eso no es una dirección: es una aproximación que se
   * separa varios grados por el medio. Con el degradado centrado como toca
   * —ver `VERTEX_SHADER`— eso deja el cielo cruzado por unas cuñas en aspa que
   * antes escondía el error de la cámara.
   *
   * A 64×48 los trozos bajan a cinco grados por cuatro y el aspa desaparece.
   * Son tres mil caras sin textura ni luz: no se nota en ninguna máquina, y
   * menos en una que ya dibuja un terreno entero.
   */
  const geometry = new SphereGeometry(
    1,
    GAJOS_DEL_CIELO.ancho,
    GAJOS_DEL_CIELO.alto,
  );
  const material = new ShaderMaterial({
    uniforms: {
      horizonColour: { value: new Color(scenario.sky.horizon) },
      zenithColour: { value: new Color(scenario.sky.zenith) },
      sunColour: { value: new Color(0xfff4e2) },
      sunDirection: { value: new Vector3(0, 1, 0) },
      haloFuerza: { value: 0 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    side: BackSide,
    depthWrite: false,
    fog: false,
  });

  const dome = new Mesh(geometry, material);
  // El cielo se escala en el bucle para seguir a la cámara: así nunca se
  // sale de él por mucho que se suba.
  dome.scale.setScalar(scenario.size);
  dome.renderOrder = -2;
  dome.name = "cielo";
  group.add(dome);

  const cielosEstrellados = estrellas();
  cielosEstrellados.scale.setScalar(scenario.size * 0.98);
  group.add(cielosEstrellados);

  const bancoDeNubes = nubes(scenario);
  group.add(bancoDeNubes);

  const sun = new DirectionalLight(0xfff1da, 2.9);
  group.add(sun);
  group.add(sun.target);

  // Relleno hemisférico: cielo arriba, rebote del suelo abajo. Sin esto las
  // caras en sombra quedan negras y el paisaje parece de noche.
  //
  // Va flojo y con un azul pálido, no con el azul del cenit. La primera
  // versión usaba `sky.zenith` a intensidad 1.15 y el resultado era que
  // media escena se teñía de azul —el avión, que es beige, salía celeste— y
  // el relieve se aplanaba porque el relleno competía con el sol. La luz
  // direccional es la que tiene que modelar el terreno; esta solo abre las
  // sombras.
  const ambient = new HemisphereLight(0xc2dcf0, scenario.fill, 0.5);
  group.add(ambient);

  const fog = new FogExp2(scenario.fog.colour, scenario.fog.density);
  const sunDirection = new Vector3(0, 1, 0);
  /** Lo que multiplica al halo. Ver `ponerDeslumbre`. */
  let deslumbre = 1;

  const rig: SkyRig = {
    group,
    sun,
    fog,
    sunDirection,
    hora: 12,
    ponerHora(hora: number) {
      const h = ((hora % 24) + 24) % 24;
      (rig as { hora: number }).hora = h;

      const { altura, azimut } = solALaHora(
        h,
        scenario.sun.azimuth,
        scenario.sun.elevation,
      );
      const m = momentoDe(altura);

      const e = (altura * Math.PI) / 180;
      const a = (azimut * Math.PI) / 180;
      sunDirection
        .set(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a))
        .normalize();

      material.uniforms.sunDirection!.value = sunDirection;
      (material.uniforms.horizonColour!.value as Color).setHex(m.horizonte);
      (material.uniforms.zenithColour!.value as Color).setHex(m.cenit);
      (material.uniforms.sunColour!.value as Color).setHex(m.sol);
      // El halo se abre cuanto más bajo está el sol. A cero de altura, del todo.
      // Y por el deslumbre, que es lo que quitan las gafas.
      material.uniforms.haloFuerza!.value =
        Math.max(0, 1 - Math.abs(altura) / 22) * deslumbre;

      sun.position.copy(sunDirection).multiplyScalar(scenario.size * 0.4);
      sun.color.setHex(m.sol);
      sun.intensity = m.fuerza;
      ambient.intensity = m.relleno;

      const cielo = group.getObjectByName("estrellas") as Points | undefined;
      if (cielo) (cielo.material as PointsMaterial).opacity = m.estrellas;

      /*
       * **La niebla toma el color del horizonte.**
       *
       * Estaba fija y gris, y una niebla gris con un cielo naranja es lo que
       * delata que el atardecer está pintado encima en vez de ser la luz que
       * hay. Es una línea y es de las cosas que más se notan.
       */
      fog.color.setHex(m.horizonte);
    },
    ponerDeslumbre(cuanto: number) {
      deslumbre = Math.max(0, Math.min(1, cuanto));
      // Se vuelve a poner la hora que ya había: es lo que recalcula el halo, y
      // así el deslumbre no tiene su propia copia de esa cuenta.
      rig.ponerHora(rig.hora);
    },
  };

  rig.ponerHora(12);
  return rig;
}

/**
 * Enciende o apaga el banco de nubes: a qué altura, y cuánto tapa.
 *
 * `tapadura` va de cero a uno y es lo que separa «hay cuatro nubes sueltas» de
 * «no se ve el suelo». No basta con subirlas o bajarlas: unas nubes muy altas y
 * muy opacas siguen siendo un techo, y unas bajas y transparentes siguen siendo
 * un día claro. Lo que cuenta es cuánto tapan.
 */
export function ponerNubes(
  rig: SkyRig,
  alturaM: number | null,
  tapadura = 0.5,
): void {
  const banco = rig.group.getObjectByName("nubes");
  if (!banco) return;
  banco.visible = alturaM !== null;
  if (alturaM === null) return;
  banco.position.y = alturaM;
  for (const capa of banco.children) {
    const mat = (capa as Mesh).material as MeshBasicMaterial;
    mat.opacity = 0.18 + tapadura * 0.62;
  }
}

/**
 * Dónde se pone el banco de nubes con la cámara ahí.
 *
 * **A saltos, no pegado.** `updateSky` copiaba la posición de la cámara tal
 * cual, así que el banco entero viajaba con el avión y **las nubes no pasaban
 * nunca**: volando a doscientos metros por segundo bajo una capa de cúmulos, el
 * cielo estaba tan quieto como el salpicadero. Y la sensación de velocidad en
 * vuelo alto es justamente eso, lo que pasa por encima.
 *
 * El truco es el de cualquier plano infinito: el dibujo de la nube se repite
 * cada `paso` metros, así que si el banco se mueve **en múltiplos de ese paso**
 * el patrón encaja consigo mismo y el salto no se ve. Entre salto y salto las
 * nubes se quedan quietas en el mundo, que es lo que hace que pasen.
 *
 * Está aparte y no dentro de `updateSky` para poder probarla: montar el cielo
 * entero necesita un lienzo, y este proyecto no trae DOM en las pruebas. Lo que
 * se puede probar es la cuenta, que es donde estaba el fallo.
 */
export function dondeVaElBanco(donde: number, paso: number): number {
  if (!(paso > 0)) return donde;
  return Math.round(donde / paso) * paso;
}

/** El domo sigue a la cámara para que el horizonte no se acerque nunca. */
export function updateSky(rig: SkyRig, cameraPosition: Vector3): void {
  const dome = rig.group.getObjectByName("cielo");
  if (dome) dome.position.copy(cameraPosition);
  const estrellado = rig.group.getObjectByName("estrellas");
  if (estrellado) estrellado.position.copy(cameraPosition);
  // Las nubes siguen a la cámara **solo en horizontal y a saltos**: en vertical
  // están donde están, que es lo que permite atravesarlas. Ver `dondeVaElBanco`.
  const banco = rig.group.getObjectByName("nubes");
  if (banco) {
    const paso = (banco.userData.paso as number | undefined) ?? 0;
    banco.position.x = dondeVaElBanco(cameraPosition.x, paso);
    banco.position.z = dondeVaElBanco(cameraPosition.z, paso);
  }
}

export type { Fog };
