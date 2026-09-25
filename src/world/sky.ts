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
  UniformsLib,
  UniformsUtils,
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
  varying vec3 vVista;
  void main() {
    vDireccion = position;
    // Lo mismo, visto desde la cámara: hace falta para medir la niebla del
    // mar que se pinta por debajo del horizonte igual que la mide three.js
    // en el agua de verdad, que es por la profundidad y no por la distancia.
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vVista = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/*
 * **El cielo, el mar y la bruma, en una sola cuenta que comparten.**
 *
 * La cúpula por debajo del horizonte era cielo: el mismo color del horizonte
 * y, hasta hace nada, el halo del sol. Desde el suelo no se ve, porque el mar
 * la tapa. Desde ocho mil pies sí: el agua se acaba a doscientos kilómetros,
 * y entre ese borde y el horizonte queda una franja de cúpula que no es mar
 * —«el sol apareciendo por debajo del horizonte»—. Apagar el halo ahí abajo
 * lo dejó en una franja lisa de otro color, que sigue siendo una costura.
 *
 * Así que por debajo del horizonte **la cúpula pinta mar**: el mismo que el
 * plano de agua, con la misma cuenta de color y la misma niebla, prolongado
 * hasta el infinito. Y la niebla no es un gris plano: es el horizonte con el
 * resplandor del sol, que es lo que tiene la bruma de verdad cuando se mira
 * hacia donde se pone. Como la niebla del mar se evalúa en la horizontal y
 * el cielo justo encima del horizonte es exactamente eso, mar y cielo se
 * tocan sin costura: la línea del horizonte la dibuja el agua que se acerca,
 * no un cambio de color.
 *
 * El plano de agua usa estas mismas funciones —ver `materialDelAgua`—, y eso
 * es lo que hace que su borde no se vea: a partir de él la cúpula sigue
 * pintando lo mismo.
 */
const GLSL_COMUN = /* glsl */ `
  uniform vec3 horizonColour;
  uniform vec3 zenithColour;
  uniform vec3 sunColour;
  uniform vec3 sunDirection;
  uniform float haloFuerza;
  uniform vec3 colorDelAgua;
  uniform float luzDelSol;
  uniform vec3 luzDeRelleno;

  // El cielo en una dirección, sin el disco: el degradado y el halo.
  vec3 cieloEn(vec3 dir) {
    // La potencia comprime el degradado hacia el horizonte, que es donde el
    // ojo espera ver la transición. Un lerp lineal se ve plano.
    float t = pow(max(dir.y, 0.0), 0.62);
    vec3 c = mix(horizonColour, zenithColour, t);
    // Sol y halo son dos potencias del mismo coseno: una muy cerrada para el
    // disco —ver el cielo— y otra muy abierta para el resplandor. **El halo
    // se abre y se enciende al atardecer**: con la fuerza fija, el sol de
    // las ocho de la tarde se veía igual de blanco y pequeño que el de
    // mediodía, y no hay nada que delate más un cielo falso.
    float toSun = max(dot(dir, normalize(sunDirection)), 0.0);
    c += sunColour * pow(toSun, mix(60.0, 5.0, haloFuerza)) * (0.35 + haloFuerza * 0.85);
    return c;
  }

  // El color de la bruma mirando hacia ahí: el del horizonte en esa
  // dirección, con su resplandor. Es el cielo justo encima del agua, y por
  // eso el mar lejano se funde con él sin costura.
  vec3 nieblaEn(vec3 dir) {
    vec2 h = dir.xz;
    float l = length(h);
    return cieloEn(l > 1e-5 ? vec3(h / l, 0.0).xzy : vec3(1.0, 0.0, 0.0));
  }

  /*
   * El mar visto en la dirección v (hacia abajo), en color lineal.
   *
   * Tres cosas y ninguna más: el agua alumbrada por el sol y por el cielo,
   * como la alumbraba la luz de Lambert que tenía; el cielo reflejado, que
   * pesa más cuanto más rasante se mira —Fresnel, con el 2 % del agua de
   * frente—; y el camino del sol sobre el agua. Sin el reflejo el mar de un
   * atardecer salía negro: la luz del sol le llega rasante, o sea casi nada,
   * y lo que de verdad lo pinta a esa hora es el cielo naranja que refleja.
   */
  vec3 marEn(vec3 v) {
    float mira = clamp(-v.y, 0.0, 1.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - mira, 5.0);
    vec3 r = vec3(v.x, abs(v.y), v.z);
    // El cielo sale a pantalla sin pasar a sRGB —es el color tal cual—, y
    // aquí se trabaja en lineal: se deshace para que el reflejo se vea del
    // mismo color que el cielo que refleja.
    vec3 reflejo = sRGBTransferEOTF(vec4(cieloEn(r), 1.0)).rgb;
    vec3 s = normalize(sunDirection);
    vec3 difusa = colorDelAgua * (sunColour * luzDelSol * max(s.y, 0.0) + luzDeRelleno) * RECIPROCAL_PI;
    // El camino del sol: el vector medio contra la normal del agua, que al
    // mirar rasante se estira hacia el horizonte como la estela de verdad.
    float camino = pow(max(normalize(s - v).y, 0.0), 700.0) * smoothstep(-0.01, 0.03, s.y);
    return mix(difusa, reflejo, fresnel * 0.85) + sunColour * luzDelSol * camino * 0.6;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  #include <common>
  uniform float fogDensity;
  uniform float nivelDelMar;
  varying vec3 vDireccion;
  varying vec3 vVista;
  ${GLSL_COMUN}

  void main() {
    vec3 dir = normalize(vDireccion);
    vec3 sky;

    if (dir.y < 0.0) {
      /*
       * **Por debajo del horizonte, mar.** A la distancia a la que el rayo
       * toca el agua y con la niebla que le toca, contada como la cuenta
       * three.js en el plano de agua: por la profundidad en la vista.
       */
      float alto = max(cameraPosition.y - nivelDelMar, 1.0);
      float lejos = alto / max(-dir.y, 1e-5);
      float prof = lejos * (-vVista.z / length(vVista));
      float velo = 1.0 - exp(-fogDensity * fogDensity * prof * prof);
      vec3 mar = sRGBTransferOETF(vec4(marEn(dir), 1.0)).rgb;
      sky = mix(mar, nieblaEn(dir), velo);
    } else {
      sky = cieloEn(dir);
      float toSun = max(dot(dir, normalize(sunDirection)), 0.0);
      float disc = smoothstep(0.9986, 0.9994, toSun);
      /*
       * **Y el disco suma, no sustituye.**
       *
       * Esto era una mezcla hacia el color del sol con el disco de factor: en
       * el sitio exacto donde está el sol se tiraba todo lo anterior y se
       * ponía el color del sol a secas. Pero justo ahí el halo ya había sumado
       * casi el doble de ese mismo color, así que el disco salía **más oscuro
       * que el resplandor que lo rodea**: un agujero en su propio brillo. Al
       * atardecer, con el halo abierto del todo, eso es una mancha parda en
       * mitad del cielo naranja.
       *
       * El sol es la fuente: tiene que ser lo más claro del cielo, nunca un
       * hueco. Sumando, lo es siempre. Y por debajo del horizonte no se
       * dibuja, porque ahí ya no hay cielo sino mar.
       */
      sky += sunColour * disc;
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;

/*
 * **El agua, con la misma cuenta que el mar de la cúpula.**
 *
 * Era una lámina de Lambert: el color del agua por la luz que le llegara. De
 * día valía; al atardecer, con el sol rasante, al agua no le llega casi nada
 * y salía negra — «el mar negro, no sé yo». Lo que pinta el mar a esa hora
 * es el cielo que refleja, y eso Lambert no lo sabe hacer.
 *
 * Y la niebla va escrita aquí y no con el trozo de three.js porque es la
 * misma bruma con resplandor que la cúpula: con la gris de serie, el agua
 * lejana y el mar pintado debajo del horizonte no casaban.
 */
const VERTICE_DEL_AGUA = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec3 vMundo;
  void main() {
    vec4 mundo = modelMatrix * vec4(position, 1.0);
    vMundo = mundo.xyz;
    vec4 mvPosition = viewMatrix * mundo;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENTO_DEL_AGUA = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float opacidad;
  varying vec3 vMundo;
  ${GLSL_COMUN}

  void main() {
    vec3 v = normalize(vMundo - cameraPosition);
    gl_FragColor = vec4(marEn(v), opacidad);
    #include <colorspace_fragment>
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        float velo = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
      #else
        float velo = smoothstep(fogNear, fogFar, vFogDepth);
      #endif
      gl_FragColor.rgb = mix(gl_FragColor.rgb, nieblaEn(v), velo);
    #endif
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
  agua: FRAGMENTO_DEL_AGUA,
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
  /**
   * El color del relleno, la luz que viene del cielo entero.
   *
   * Era siempre el mismo azul pálido, y al atardecer eso es lo único que
   * alumbra el suelo: con el sol por debajo del horizonte la luz directa no
   * llega a nada, y el relleno azul y flojo dejaba Gran Canaria negra bajo un
   * cielo naranja. El cielo de esa hora es malva y rosa, y es lo que le da
   * al suelo.
   */
  readonly ambiente: number;
}

const MOMENTOS: readonly Momento[] = [
  // Noche cerrada.
  {
    altura: -18,
    horizonte: 0x0d1626,
    cenit: 0x04060e,
    sol: 0x2a3a55,
    fuerza: 0.05,
    relleno: 0.3,
    estrellas: 1,
    ambiente: 0x7d8cb8,
  },
  // Crepúsculo: el sol ya no se ve pero el horizonte todavía arde.
  {
    altura: -6,
    horizonte: 0x5a4364,
    cenit: 0x101a35,
    sol: 0x8c5a6a,
    fuerza: 0.18,
    relleno: 0.85,
    estrellas: 0.55,
    ambiente: 0xb49ab8,
  },
  // Amanecer y ocaso, con el sol en el horizonte. La hora buena.
  {
    altura: 0,
    horizonte: 0xf0803c,
    cenit: 0x3a5a8e,
    sol: 0xff8c3a,
    fuerza: 0.9,
    relleno: 1.0,
    estrellas: 0.12,
    ambiente: 0xf0c0a8,
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
    ambiente: 0xc2dcf0,
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
    ambiente: 0xc2dcf0,
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
  /**
   * La niebla, en dos partes: la bruma del aire, que se queda abajo, y un
   * mínimo que no depende de la altura —lo que diga el parte o la lluvia—.
   * Ver `brumaALaAltura` y `updateSky`, que es quien las junta.
   */
  ponerNiebla(bruma: number, minimo: number): void;
  /**
   * El material del plano de agua: el mismo mar que la cúpula pinta por
   * debajo del horizonte, para que el borde del plano no se vea. Ver
   * `GLSL_COMUN`.
   */
  readonly materialDelAgua: ShaderMaterial;
  /** Qué hora es ahora mismo. */
  readonly hora: number;
}

/**
 * Cuánta de la bruma del suelo queda a una altura dada, de cero a uno.
 *
 * **La bruma vive abajo.** Es la capa de mezcla, el aire que se calienta
 * contra el suelo y el mar y carga con la sal y el polvo; en Canarias la
 * cierra además la inversión del alisio, entre mil y mil quinientos metros,
 * y por encima el aire es de una limpieza que es la razón de que haya
 * telescopios en el Teide. Se ve desde cualquier avión: al despegar el
 * horizonte está lechoso, y al salir de la capa aparecen las islas de
 * enfrente con su silueta entera.
 *
 * Con la niebla igual a cualquier altura, desde ocho mil pies rumbo a
 * Tenerife no se veía nada enfrente: el Teide está a ciento veintiocho
 * kilómetros de Gando y la bruma del suelo se lo comía al 98 %. Con esto,
 * a esa altura queda una tercera parte y el Teide se recorta en el
 * horizonte —medio velado, que es como se ve—, y en el suelo nada cambia.
 */
export function brumaALaAltura(alturaM: number): number {
  const t = Math.max(0, Math.min(1, (alturaM - 300) / 2700));
  return 1 - 0.7 * t * t * (3 - 2 * t);
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
    ambiente: mezcla(a.ambiente, b.ambiente),
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
    const material = new MeshBasicMaterial({
      map: textura,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: DoubleSide,
      /*
       * **Con niebla, y desvaneciéndose antes del borde.**
       *
       * Iban sin niebla y hasta el borde del plano, y desde arriba eso se
       * ve: el banco acaba a veintitantos kilómetros en una raya recta, y
       * lo que queda más allá sale blanco puro contra un horizonte ya
       * velado —una franja lechosa sobre la costa de Tenerife, vista desde
       * Gran Canaria—. Una nube lejana se funde con la bruma como todo lo
       * demás, y el borde del banco no puede existir: la opacidad baja con
       * la distancia al ojo desde la mitad del radio y llega a cero antes
       * del final.
       */
      fog: true,
    });
    const radio = (lado / 2) * 0.92;
    material.onBeforeCompile = (programa) => {
      programa.fragmentShader = programa.fragmentShader.replace(
        "#include <fog_fragment>",
        `#include <fog_fragment>
        #ifdef USE_FOG
          gl_FragColor.a *= 1.0 - smoothstep(${(radio * 0.45).toFixed(1)}, ${radio.toFixed(1)}, vFogDepth);
        #endif`,
      );
    };
    const malla = new Mesh(geo, material);
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
  /*
   * Los uniformes que comparten la cúpula y el agua: **los mismos objetos**,
   * no copias. Así una hora nueva se pone una vez y el mar del plano y el
   * de debajo del horizonte no pueden quedarse con horas distintas.
   */
  const compartidos = {
    horizonColour: { value: new Color(scenario.sky.horizon) },
    zenithColour: { value: new Color(scenario.sky.zenith) },
    sunColour: { value: new Color(0xfff4e2) },
    sunDirection: { value: new Vector3(0, 1, 0) },
    haloFuerza: { value: 0 },
    colorDelAgua: { value: new Color(scenario.water) },
    luzDelSol: { value: 0 },
    luzDeRelleno: { value: new Color() },
  };
  const material = new ShaderMaterial({
    uniforms: {
      ...compartidos,
      // Los de la niebla los pone three.js cada fotograma con `fog: true`;
      // la cúpula no se empaña, pero el mar que pinta debajo sí.
      ...UniformsUtils.clone(UniformsLib.fog),
      nivelDelMar: { value: scenario.waterLevel },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    side: BackSide,
    depthWrite: false,
    fog: true,
  });

  const materialDelAgua = new ShaderMaterial({
    uniforms: {
      ...compartidos,
      ...UniformsUtils.clone(UniformsLib.fog),
      // La transparencia de siempre: deja ver el fondo junto a la costa.
      opacidad: { value: 0.86 },
    },
    vertexShader: VERTICE_DEL_AGUA,
    fragmentShader: FRAGMENTO_DEL_AGUA,
    transparent: true,
    fog: true,
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
  const niebla = { bruma: scenario.fog.density, minimo: 0 };
  const relleno = new Color();

  const rig: SkyRig = {
    group,
    sun,
    fog,
    sunDirection,
    materialDelAgua,
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
      ambient.color.setHex(m.ambiente);

      /*
       * **Y las nubes con la luz de la hora.** Eran blancas siempre, y una
       * nube blanca de mediodía bajo un cielo de ocaso —o de noche— es una
       * pegatina. Se alumbran como se alumbra el suelo: el cielo entero más
       * un poco de sol.
       */
      const luz = new Color(m.ambiente).multiplyScalar(m.relleno * 0.6);
      luz.add(new Color(m.sol).multiplyScalar(m.fuerza * 0.25));
      luz.r = Math.min(1, luz.r);
      luz.g = Math.min(1, luz.g);
      luz.b = Math.min(1, luz.b);
      for (const capa of bancoDeNubes.children)
        ((capa as Mesh).material as MeshBasicMaterial).color.copy(luz);

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
    ponerNiebla(bruma: number, minimo: number) {
      niebla.bruma = bruma;
      niebla.minimo = minimo;
    },
    ponerDeslumbre(cuanto: number) {
      deslumbre = Math.max(0, Math.min(1, cuanto));
      // Se vuelve a poner la hora que ya había: es lo que recalcula el halo, y
      // así el deslumbre no tiene su propia copia de esa cuenta.
      rig.ponerHora(rig.hora);
    },
  };

  rig.ponerHora(12);
  /*
   * Lo que el agua necesita saber cada fotograma: la luz que hay ahora —el
   * rayo de una tormenta la cambia sin pasar por `ponerHora`— y la niebla a
   * la altura del ojo. Ver `updateSky`.
   */
  group.userData.alPaso = (ojo: Vector3): void => {
    compartidos.luzDelSol.value = sun.intensity;
    compartidos.luzDeRelleno.value
      .copy(relleno.copy(ambient.color))
      .multiplyScalar(ambient.intensity);
    fog.density = Math.max(
      niebla.bruma * brumaALaAltura(ojo.y),
      niebla.minimo,
    );
  };
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
  (rig.group.userData.alPaso as ((ojo: Vector3) => void) | undefined)?.(
    cameraPosition,
  );
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
