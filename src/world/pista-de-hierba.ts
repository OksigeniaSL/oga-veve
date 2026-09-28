/**
 * Una pista de hierba, vista desde el aire: la franja segada y sus balizas.
 *
 * Una pista de estancia se encuentra desde lejos por dos cosas, y las dos son
 * de verdad: **la hierba segada**, más corta y más clara que el pasto de
 * alrededor, con las pasadas de la segadora marcadas a lo largo; y **las
 * balizas**, las tablillas blancas de los bordes y la puerta naranja de cada
 * cabecera, que desde la final dibujan dos hileras de puntos que convergen.
 *
 * Con los potreros de la granja pintados en el suelo, la pista —un verde más
 * oscuro que el de ellos— se quedaba en una raya dentro de un potrero del
 * mismo tono, y solo se seguía por los puntitos del borde. Es lo único que
 * quien vuela tiene que encontrar sí o sí.
 *
 * Aquí van las dos piezas de sombreador que lo arreglan, aparte y con su texto
 * exportado para poder mirarlo en una prueba, que es lo único que se puede
 * mirar de un sombreador sin tarjeta gráfica.
 */

import { Vector2, type InstancedMesh, type Material } from "three";
import type { Punto } from "./aerodrome";

/**
 * El ancho de una pasada de segadora, m.
 *
 * Tres: lo que corta un tractor con su segadora de arrastre, que es lo que
 * hay en una estancia. Las pasadas alternan de sentido, y la hierba tumbada
 * hacia un lado y hacia el otro refleja distinto: por eso se ven rayas.
 */
export const PASADA = 3;

/** Cuánto se nota cada pasada: un siete por ciento arriba o abajo. */
export const RAYA = 0.07;

/**
 * El sombreador de las pasadas, en las coordenadas del campo.
 *
 * Las rayas van **a lo largo de la pista**, que es como se siega una franja
 * larga. Y se apagan solas cuando ya no caben en un píxel —`fwidth`—: rayas de
 * tres metros vistas a dos kilómetros son muaré, no hierba.
 */
export const GLSL_DEL_SEGADO = {
  cabeceraDelVertice: /* glsl */ `
varying vec2 vSitioDeLaPista;
`,
  vertice: /* glsl */ `
  vSitioDeLaPista = position.xz;
`,
  cabecera: /* glsl */ `
uniform vec4 ejeDeLaPista;
uniform float pasada;
uniform float raya;
varying vec2 vSitioDeLaPista;
`,
  cuerpo: /* glsl */ `
  {
    float deTraves = dot(vSitioDeLaPista - ejeDeLaPista.xy, ejeDeLaPista.zw);
    float fase = deTraves / (2.0 * pasada);
    float porPixel = fwidth(fase);
    float nitidez = clamp(0.25 / max(porPixel, 1e-4), 1.0, 8.0);
    float onda = clamp(sin(6.2831853 * fase) * nitidez, -1.0, 1.0);
    onda *= 1.0 - smoothstep(0.2, 0.45, porPixel);
    diffuseColor.rgb *= 1.0 + onda * raya;
  }
`,
} as const;

/**
 * Siega la pista: le pone las pasadas de la segadora al material de su
 * hierba. `pista` es el eje, en las coordenadas del fichero (la Y al norte).
 */
export function segarLaPista(
  material: Material,
  eje: readonly Punto[],
): void {
  const a = eje[0];
  const b = eje[eje.length - 1];
  if (!a || !b) return;
  // Del fichero a la malla: la Y del norte es la Z negativa.
  const dx = b[0] - a[0];
  const dz = -(b[1] - a[1]);
  const largo = Math.hypot(dx, dz) || 1;
  const normal = [-dz / largo, dx / largo] as const;
  material.onBeforeCompile = (shader) => {
    material.userData.segada = true;
    shader.uniforms.ejeDeLaPista = {
      value: [a[0], -a[1], normal[0], normal[1]],
    };
    shader.uniforms.pasada = { value: PASADA };
    shader.uniforms.raya = { value: RAYA };
    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        GLSL_DEL_SEGADO.cabeceraDelVertice + "\nvoid main() {",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>" + GLSL_DEL_SEGADO.vertice,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", GLSL_DEL_SEGADO.cabecera + "\nvoid main() {")
      .replace(
        "#include <map_fragment>",
        "#include <map_fragment>" + GLSL_DEL_SEGADO.cuerpo,
      );
  };
  // Y su propio programa: ver la nota de la caché en `ponerGrano`.
  material.customProgramCacheKey = () => "pista-segada";
  material.needsUpdate = true;
}

/**
 * Lo menos que mide una baliza en pantalla, en píxeles de la página.
 *
 * Dos. Una tablilla de verdad mide un metro, y a dos kilómetros eso es medio
 * miliradián: al límite de lo que ve un ojo, pero **un cuarto de píxel** en
 * una tablet, donde un píxel son uno y medio. Lo que en la cabina de verdad es
 * una hilera de puntos que se adivina, aquí no se dibujaba. Con esto la
 * baliza crece con la distancia lo justo para no bajar de un punto que se
 * vea, y de cerca sigue midiendo lo que mide.
 *
 * Y dos y no dos y medio, que fue lo primero: a medio kilómetro, con la
 * pendiente de una final, las tablillas crecidas se tocaban unas con otras y
 * la hilera se leía como una raya pintada en el borde, que es justo lo que
 * una pista de hierba no lleva.
 */
export const MINIMO_EN_PANTALLA = 2;

/** El sombreador que hace crecer la baliza con la distancia. */
export const GLSL_DEL_MINIMO = {
  cabecera: /* glsl */ `
uniform float altoDelCuadro;
uniform float medidaDeLaBaliza;
uniform float pieDeLaBaliza;
uniform float minimoEnPantalla;
`,
  vertice: /* glsl */ `
  {
    #ifdef USE_INSTANCING
      vec4 centroEnVista = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    #else
      vec4 centroEnVista = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    #endif
    float lejos = max(-centroEnVista.z, 1.0);
    float enPantalla = medidaDeLaBaliza * projectionMatrix[1][1] / lejos * altoDelCuadro * 0.5;
    float crece = max(1.0, minimoEnPantalla / max(enPantalla, 1e-4));
    transformed.xz *= crece;
    // De alto, menos: la raíz. Vista desde la final, la altura es lo que
    // junta una tablilla con la siguiente de la hilera.
    transformed.y = pieDeLaBaliza + (transformed.y - pieDeLaBaliza) * sqrt(crece);
  }
`,
} as const;

/**
 * Hace que las balizas de una malla no bajen de `MINIMO_EN_PANTALLA` píxeles.
 *
 * **Crecen desde el pie**, que está en el suelo: una tablilla que creciera
 * desde su centro se hundiría en la hierba. Y crecen más de ancho que de alto:
 * ver el sombreador. Y siguen siendo tablillas con su
 * material, iluminadas por el sol como todo lo demás: de noche no se ven, que
 * es lo que pasa con una tablilla sin luz. Un punto de tamaño fijo en pantalla
 * —como el del balizamiento— habría brillado de noche en un campo sin luces.
 *
 * `medida` es lo que mide la baliza en metros, y `pie` la Y de su base en la
 * geometría.
 */
export function queSeVeaDeLejos(
  malla: InstancedMesh,
  medida: number,
  pie: number,
): void {
  const alto = { value: 720 };
  const tamano = new Vector2();
  malla.onBeforeRender = (pintor) => {
    alto.value = pintor.getSize(tamano).y || 720;
  };
  const material = malla.material as Material;
  material.onBeforeCompile = (shader) => {
    material.userData.creceDeLejos = true;
    shader.uniforms.altoDelCuadro = alto;
    shader.uniforms.medidaDeLaBaliza = { value: medida };
    shader.uniforms.pieDeLaBaliza = { value: pie };
    shader.uniforms.minimoEnPantalla = { value: MINIMO_EN_PANTALLA };
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", GLSL_DEL_MINIMO.cabecera + "\nvoid main() {")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>" + GLSL_DEL_MINIMO.vertice,
      );
  };
  material.customProgramCacheKey = () => "baliza-que-se-ve-de-lejos";
  material.needsUpdate = true;
}
