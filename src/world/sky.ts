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
} from 'three';
import { mulberry32 } from './noise';
import type { Scenario } from './scenarios';

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 horizonColour;
  uniform vec3 zenithColour;
  uniform vec3 sunColour;
  uniform vec3 sunDirection;
  uniform float offset;
  uniform float haloFuerza;
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition + vec3(0.0, offset, 0.0));

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
    sky += sunColour * halo;
    sky = mix(sky, sunColour, disc);

    gl_FragColor = vec4(sky, 1.0);
  }
`;

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
  { altura: -18, horizonte: 0x0d1626, cenit: 0x04060e, sol: 0x2a3a55, fuerza: 0.05, relleno: 0.12, estrellas: 1 },
  // Crepúsculo: el sol ya no se ve pero el horizonte todavía arde.
  { altura: -6, horizonte: 0x5a4364, cenit: 0x101a35, sol: 0x8c5a6a, fuerza: 0.18, relleno: 0.3, estrellas: 0.55 },
  // Amanecer y ocaso, con el sol en el horizonte. La hora buena.
  { altura: 0, horizonte: 0xf0803c, cenit: 0x3a5a8e, sol: 0xff8c3a, fuerza: 0.9, relleno: 0.5, estrellas: 0.12 },
  // Sol bajo: sombras largas, luz cálida. Las cinco y media de la tarde.
  { altura: 12, horizonte: 0xf3cfa4, cenit: 0x4f86c6, sol: 0xffd9a0, fuerza: 2.4, relleno: 0.42, estrellas: 0 },
  // Mediodía.
  { altura: 60, horizonte: 0xdfe7ea, cenit: 0x4a86c8, sol: 0xfff4e2, fuerza: 3.1, relleno: 0.5, estrellas: 0 },
];

export interface SkyRig {
  group: Group;
  sun: DirectionalLight;
  fog: FogExp2;
  /** Dirección desde la que viene la luz, normalizada. */
  sunDirection: Vector3;
  /** Pone una hora del día, de 0 a 24. */
  ponerHora(hora: number): void;
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
function solALaHora(hora: number, azimutMediodia: number, alturaMaxima: number): {
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
  geo.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
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
  puntos.name = 'estrellas';
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
  const lienzo = document.createElement('canvas');
  lienzo.width = lado;
  lienzo.height = lado;
  const g = lienzo.getContext('2d')!;
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
  const valor = (o: { n: number; v: Float32Array }, x: number, y: number): number => {
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
  grupo.name = 'nubes';
  const lado = escenario.size * 4;
  const capas = 5;
  for (let i = 0; i < capas; i++) {
    const geo = new PlaneGeometry(lado, lado);
    geo.rotateX(-Math.PI / 2);
    const textura = texturaDeNube(0xc10d + i * 977);
    textura.repeat.set(3, 3);
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
  grupo.visible = false;
  return grupo;
}

export function createSky(scenario: Scenario): SkyRig {
  const group = new Group();

  const geometry = new SphereGeometry(1, 24, 16);
  const material = new ShaderMaterial({
    uniforms: {
      horizonColour: { value: new Color(scenario.sky.horizon) },
      zenithColour: { value: new Color(scenario.sky.zenith) },
      sunColour: { value: new Color(0xfff4e2) },
      sunDirection: { value: new Vector3(0, 1, 0) },
      offset: { value: 0.12 },
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
  dome.name = 'cielo';
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

  const rig: SkyRig = {
    group,
    sun,
    fog,
    sunDirection,
    hora: 12,
    ponerHora(hora: number) {
      const h = ((hora % 24) + 24) % 24;
      (rig as { hora: number }).hora = h;

      const { altura, azimut } = solALaHora(h, scenario.sun.azimuth, scenario.sun.elevation);
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
      material.uniforms.haloFuerza!.value = Math.max(0, 1 - Math.abs(altura) / 22);

      sun.position.copy(sunDirection).multiplyScalar(scenario.size * 0.4);
      sun.color.setHex(m.sol);
      sun.intensity = m.fuerza;
      ambient.intensity = m.relleno;

      const cielo = group.getObjectByName('estrellas') as Points | undefined;
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
  };

  rig.ponerHora(12);
  return rig;
}

/** Enciende o apaga el banco de nubes, y a qué altura se pone. */
export function ponerNubes(rig: SkyRig, alturaM: number | null): void {
  const banco = rig.group.getObjectByName('nubes');
  if (!banco) return;
  banco.visible = alturaM !== null;
  if (alturaM !== null) banco.position.y = alturaM;
}

/** El domo sigue a la cámara para que el horizonte no se acerque nunca. */
export function updateSky(rig: SkyRig, cameraPosition: Vector3): void {
  const dome = rig.group.getObjectByName('cielo');
  if (dome) dome.position.copy(cameraPosition);
  const estrellado = rig.group.getObjectByName('estrellas');
  if (estrellado) estrellado.position.copy(cameraPosition);
  // Las nubes siguen a la cámara **solo en horizontal**: en vertical están
  // donde están, que es lo que permite atravesarlas.
  const banco = rig.group.getObjectByName('nubes');
  if (banco) {
    banco.position.x = cameraPosition.x;
    banco.position.z = cameraPosition.z;
  }
}

export type { Fog };
