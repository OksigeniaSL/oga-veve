/**
 * El material de las luces que se miran de lejos: las de un pueblo, y las de
 * la isla de enfrente.
 *
 * Una luz de noche no es un objeto: es un punto de brillo. Lo que cambia con
 * la distancia no es tanto su tamaño —siempre es un punto— como **cuánta luz
 * llega**, y cuánta se queda por el camino en la bruma. Un `PointsMaterial`
 * de serie no sabe ninguna de las dos cosas:
 *
 * - Con tamaño fijo en pantalla y mezcla sumando, un pueblo a quince
 *   kilómetros metía cien farolas en el mismo puñado de píxeles, la suma se
 *   salía de la escala y salía **una mancha blanca**. Aquí cada luz se hace
 *   más pequeña y más tenue con la distancia —la raíz para el tamaño, casi el
 *   cuadrado para el brillo, que es como se apaga una luz de verdad— hasta un
 *   mínimo que la deja ver.
 * - La niebla de three.js **pinta hacia el color de la niebla**, que en una
 *   luz que se suma es encender el cielo: una luz perdida en la bruma dejaba
 *   una mancha del color del horizonte. Aquí la bruma **apaga**, que es lo
 *   que hace el aire con una luz. Y con la mitad de espesor que la del
 *   suelo, porque una luz sobre negro se ve mucho más lejos que el monte en
 *   el que está: por eso se ven las luces de la isla de enfrente de noche y
 *   no la isla.
 *
 * Y cada punto, redondo y con el borde suave: de cerca se veían cuadraditos.
 */

import { AdditiveBlending, PointsMaterial } from "three";

export interface OpcionesDeLuces {
  /**
   * A partir de qué distancia, en metros, la luz empieza a encogerse y
   * apagarse. Por debajo, se ve entera.
   */
  readonly cerca?: number;
  /** El brillo más bajo al que se deja llegar, de cero a uno. */
  readonly suelo?: number;
  /** El tamaño más pequeño, como fracción del de cerca. */
  readonly menor?: number;
}

/**
 * Lo que se inyecta en el programa de los puntos. Aparte para poder mirar el
 * texto en una prueba, que es lo único que se puede mirar de un shader sin
 * tarjeta gráfica.
 */
export const GLSL_DE_LUCES = {
  cabeceraDelVertice: /* glsl */ `
    uniform float lucesCerca;
    uniform float lucesSuelo;
    uniform float lucesMenor;
    varying float vBrillo;
  `,
  tamano: /* glsl */ `
    float lejosDelOjo = max(-mvPosition.z, 1.0);
    float cercania = clamp(lucesCerca / lejosDelOjo, 0.0, 1.0);
    gl_PointSize = size * max(sqrt(cercania), lucesMenor);
    // El mínimo también baja, más despacio, desde cinco veces \`cerca\`: de
    // muy lejos caen muchas luces en cada píxel y se suman, y con el mínimo
    // fijo una ciudad a noventa kilómetros brillaba más que a sesenta.
    float lejania = clamp(lucesCerca * 5.0 / lejosDelOjo, 0.3, 1.0);
    vBrillo = max(pow(cercania, 1.5), lucesSuelo * lejania);
  `,
  cabecera: /* glsl */ `
    varying float vBrillo;
  `,
  /*
   * En lineal, antes del paso a pantalla: el brillo se multiplica como luz.
   * Y la niebla, aquí y no en el trozo de serie —que se quita—, apagando.
   */
  cuerpo: /* glsl */ `
    {
      vec2 p = gl_PointCoord * 2.0 - 1.0;
      float redondo = 1.0 - smoothstep(0.3, 1.0, dot(p, p));
      float apagado = 1.0;
      #ifdef USE_FOG
        #ifdef FOG_EXP2
          float espesor = fogDensity * 0.5 * vFogDepth;
          apagado = exp(-espesor * espesor);
        #else
          apagado = 1.0 - smoothstep(fogNear * 2.0, fogFar * 2.0, vFogDepth);
        #endif
      #endif
      diffuseColor.rgb *= vBrillo * redondo * apagado;
    }
  `,
} as const;

/**
 * Un material de luces lejanas, de `tamano` píxeles de cerca.
 *
 * Suman —`AdditiveBlending`—: dos farolas juntas dan más luz que una, que es
 * lo que hace que el centro de un pueblo se vea más encendido que las
 * afueras. Pero con la luz de cada una bajada con la distancia la suma ya no
 * se sale de la escala.
 */
export function materialDeLuces(
  tamano: number,
  opciones: OpcionesDeLuces = {},
): PointsMaterial {
  const material = new PointsMaterial({
    size: tamano,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const cerca = opciones.cerca ?? 4000;
  const suelo = opciones.suelo ?? 0.14;
  const menor = opciones.menor ?? 0.5;
  material.onBeforeCompile = (shader) => {
    material.userData.lucesPuestas = true;
    shader.uniforms.lucesCerca = { value: cerca };
    shader.uniforms.lucesSuelo = { value: suelo };
    shader.uniforms.lucesMenor = { value: menor };
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", GLSL_DE_LUCES.cabeceraDelVertice + "\nvoid main() {")
      .replace("gl_PointSize = size;", GLSL_DE_LUCES.tamano);
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", GLSL_DE_LUCES.cabecera + "\nvoid main() {")
      .replace("#include <color_fragment>", "#include <color_fragment>" + GLSL_DE_LUCES.cuerpo)
      .replace("#include <fog_fragment>", "");
  };
  /*
   * La llave de la caché, por lo de siempre: `onBeforeCompile` no entra en
   * ella, y sin esto un `PointsMaterial` cualquiera que compilara antes —las
   * estrellas— se quedaba con el programa y la inyección no llegaba. Los
   * números van en uniformes, así que todas las luces comparten programa.
   */
  material.customProgramCacheKey = () => "luces-lejanas";
  return material;
}

/**
 * Lo mismo para un `PointsMaterial` que ya existe, sin tocarle nada más: el
 * punto conserva su tamaño hasta `cerca` metros y a partir de ahí encoge
 * hasta `menor` de lo que era.
 *
 * Es para el balizamiento de la pista, que va a ocho píxeles fijos para que
 * la fila de luces dibuje el rectángulo desde unos kilómetros. Desde
 * veinticinco, ocho píxeles por luz son una pista entera metida en una
 * barra: verde, blanca y roja, una sola mancha de colores. De cerca queda
 * exactamente como estaba.
 */
export function encogerConLaDistancia(
  material: PointsMaterial,
  cerca: number,
  menor: number,
): void {
  material.onBeforeCompile = (shader) => {
    material.userData.encoge = true;
    shader.uniforms.lucesCerca = { value: cerca };
    shader.uniforms.lucesMenor = { value: menor };
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        "uniform float lucesCerca;\nuniform float lucesMenor;\nvoid main() {",
      )
      .replace(
        "gl_PointSize = size;",
        "gl_PointSize = size * clamp(lucesCerca / max(-mvPosition.z, 1.0), lucesMenor, 1.0);",
      );
  };
  material.customProgramCacheKey = () => "luces-que-encogen";
}
