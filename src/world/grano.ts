/**
 * El grano del suelo: lo que hace que la foto no sea una mancha.
 *
 * ## El problema, medido
 *
 * La ortofoto de cerca da el **color** del terreno, y eso es lo que hace que
 * un sitio se reconozca desde el aire. Lo que no da es **grano**, porque no lo
 * tiene: el mejor metro por píxel que hay para cada sitio es el que hay.
 *
 *     Canarias, Cuatro Vientos    2,1 m/px   (PNOA)
 *     Paraguay                    8,5 m/px   (Sentinel-2, y es su tope)
 *
 * A trescientos metros de altura, ocho metros por píxel es una mancha marrón.
 * Y contado por quien vuela: «yo no sé ya cómo decirte que quiero paisajes
 * realistas». Tiene razón, y por Paraguay no hay foto mejor: Sentinel-2 llega
 * a diez metros y ahí se acaba lo que se puede publicar.
 *
 * ## Lo que sí se puede hacer
 *
 * Lo mismo que hace todo simulador desde hace veinte años, y que este no
 * hacía: **separar el color del detalle**. La foto pone de qué color es este
 * trozo de mundo; una trama fina, repetida cada pocos metros, pone la textura
 * que el ojo espera encontrar en hierba, tierra o monte. Multiplicadas, el
 * suelo deja de ser una acuarela y pasa a tener superficie.
 *
 * No es hacer trampa con el realismo, que es la regla que gobierna esta casa:
 * el **color** sigue siendo el medido, y el color es lo que se reconoce. Lo
 * que se añade es grano sin forma, que es exactamente lo que la foto perdió al
 * promediar ocho metros en un píxel. Inventar una carretera donde no la hay
 * sería falsear; devolverle aspereza a un campo que la tiene, no.
 *
 * ## Y por qué se apaga con la distancia
 *
 * Una trama que se repite cada seis metros, vista a diez kilómetros, cae muy
 * por debajo del píxel: eso no es detalle, es ruido que hierve al mover la
 * cabeza. Así que se desvanece con la distancia y a partir de cierto punto no
 * está. Cerca es donde hacía falta y cerca es donde se pone.
 *
 * ## Dónde no se dibuja: no hay ningún fichero nuevo
 *
 * La trama se genera al arrancar en un lienzo, con ruido de valor sembrado, y
 * pesa cero bytes en el repositorio. Ni hay que licenciarla ni hay que
 * descargarla ni hay que anotarla en `CREDITOS.md`, porque no viene de ningún
 * sitio: sale de esta función.
 */

import {
  CanvasTexture,
  RepeatWrapping,
  type Material,
  type Texture,
} from "three";

/** Lado de la trama, en píxeles. */
const LADO = 256;

/**
 * Cada cuántos metros se repite la trama.
 *
 * Seis. Con menos, el dibujo se repite tan seguido que se lee como una rejilla
 * —que es peor que no tener nada—; con mucho más, el grano se hace grande y ya
 * no es textura de suelo sino manchas.
 */
export const METROS_POR_REPETICION = 6;

/**
 * Hasta dónde se ve el grano, m.
 *
 * Mil quinientos: a esa distancia una repetición de seis metros ocupa unos
 * pocos píxeles y todavía aporta; más allá, hierve. Coincide además con la
 * franja de altura en la que se vuela de verdad cuando el paisaje importa —el
 * circuito, la aproximación, el rodaje—.
 */
export const HASTA_DONDE = 1500;

/** Cuánto aclara y oscurece, como fracción. */
const FUERZA = 0.18;

/**
 * Ruido de valor sembrado, para que la trama sea **la misma siempre**.
 *
 * Sin semilla, dos tarjetas distintas darían dos suelos distintos y una
 * captura de pantalla no valdría para comparar nada. Es el mismo criterio que
 * el resto del mundo generado.
 */
function sembrado(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * La trama, dibujada en un lienzo.
 *
 * Tres octavas de ruido de valor **con envoltura**: la muestra en `x` se toma
 * con módulo, así que el borde derecho encaja con el izquierdo y el de abajo
 * con el de arriba. Sin eso se ve una cuadrícula en el suelo, que es
 * justamente lo contrario de lo que se busca.
 */
export function lienzoDeGrano(
  hacerLienzo: () => HTMLCanvasElement,
  semilla = 7,
): HTMLCanvasElement {
  const lienzo = hacerLienzo();
  lienzo.width = LADO;
  lienzo.height = LADO;
  const g = lienzo.getContext("2d");
  if (!g) return lienzo;

  const imagen = g.createImageData(LADO, LADO);
  const azar = sembrado(semilla);

  /** Una rejilla de valores de `n`×`n`, envolvente. */
  const rejilla = (n: number): number[] =>
    Array.from({ length: n * n }, () => azar());

  const octavas = [
    { n: 4, peso: 0.5 },
    { n: 16, peso: 0.32 },
    { n: 64, peso: 0.18 },
  ].map((o) => ({ ...o, datos: rejilla(o.n) }));

  const suave = (t: number): number => t * t * (3 - 2 * t);

  /*
   * **Y se estira el contraste al final, que es donde estaba la avería.**
   *
   * Sumar tres octavas de valores aleatorios da una campana muy estrecha
   * alrededor de 0,5: la trama salía casi plana, y multiplicar el suelo por
   * algo casi plano no hace nada. Se vio pintando el suelo con el grano puro
   * —quedaba de un color liso— después de subir la fuerza a 0,9 sin que
   * cambiara un píxel. Un efecto que no cambia nada al multiplicarlo por seis
   * no está flojo: está roto en otro sitio.
   *
   * Así que se mide el recorrido que de verdad tiene y se lleva a 0..1. Es la
   * misma idea que casar la exposición de las ortofotos: no se supone el
   * rango, se mide.
   */
  const valores = new Float32Array(LADO * LADO);
  let bajo = Infinity;
  let alto = -Infinity;

  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      let v = 0;
      for (const { n, peso, datos } of octavas) {
        const fx = (x / LADO) * n;
        const fy = (y / LADO) * n;
        const x0 = Math.floor(fx) % n;
        const y0 = Math.floor(fy) % n;
        const x1 = (x0 + 1) % n;
        const y1 = (y0 + 1) % n;
        const tx = suave(fx - Math.floor(fx));
        const ty = suave(fy - Math.floor(fy));
        const a = datos[y0 * n + x0]!;
        const b = datos[y0 * n + x1]!;
        const c = datos[y1 * n + x0]!;
        const d = datos[y1 * n + x1]!;
        v += peso * (a + (b - a) * tx + (c - a + (d - c - b + a) * tx) * ty);
      }
      valores[y * LADO + x] = v;
      if (v < bajo) bajo = v;
      if (v > alto) alto = v;
    }
  }

  const recorrido = Math.max(1e-6, alto - bajo);
  for (let i = 0; i < valores.length; i++) {
    const nivel = Math.round(((valores[i]! - bajo) / recorrido) * 255);
    const j = i * 4;
    imagen.data[j] = nivel;
    imagen.data[j + 1] = nivel;
    imagen.data[j + 2] = nivel;
    imagen.data[j + 3] = 255;
  }
  g.putImageData(imagen, 0, 0);
  return lienzo;
}

/** La trama como textura repetible. */
export function texturaDeGrano(
  hacerLienzo: () => HTMLCanvasElement,
): Texture {
  const t = new CanvasTexture(lienzoDeGrano(hacerLienzo));
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/**
 * El trozo de sombreador que multiplica el grano sobre el color de la foto.
 *
 * Va aparte y exportado porque es lo único de este módulo que se puede
 * comprobar sin tarjeta gráfica, y porque las averías de un sombreador en esta
 * casa han sido siempre **de texto**: una palabra de más, un sumando de más,
 * un `mix` donde iba un `+=`. Ver `sky.test.ts`, que aprendió lo mismo.
 */
export const GLSL_DEL_GRANO = {
  /** Lo que se declara arriba del fragmento. */
  cabecera: /* glsl */ `
uniform sampler2D mapaDeGrano;
uniform float metrosPorRepeticion;
uniform float hastaDonde;
uniform float fuerzaDelGrano;
varying vec3 vSitioDelMundo;
varying float vLejosDelOjo;
`,
  /** Y lo que se hace justo después de leer la foto. */
  cuerpo: /* glsl */ `
  {
    // Las coordenadas salen del **mundo**, no de la malla: así la trama no se
    // estira donde el terreno tiene triángulos grandes, que es justo lejos.
    vec2 uvGrano = vSitioDelMundo.xz / metrosPorRepeticion;
    float grano = texture2D(mapaDeGrano, uvGrano).r;
    // Se desvanece con la distancia: una repetición de seis metros vista a
    // diez kilómetros no es detalle, es ruido que hierve.
    float cerca = 1.0 - smoothstep(0.0, hastaDonde, vLejosDelOjo);
    diffuseColor.rgb *= 1.0 + (grano - 0.5) * 2.0 * fuerzaDelGrano * cerca;
  }
`,
  /** Y el sitio del mundo, que el vértice tiene que pasar. */
  vertice: /* glsl */ `
  vSitioDelMundo = (modelMatrix * vec4(position, 1.0)).xyz;
  vLejosDelOjo = length((modelViewMatrix * vec4(position, 1.0)).xyz);
`,
  /** Lo que se declara arriba del vértice. */
  cabeceraDelVertice: /* glsl */ `
varying vec3 vSitioDelMundo;
varying float vLejosDelOjo;
`,
} as const;

/**
 * Le pone el grano a un material de terreno.
 *
 * Se hace con `onBeforeCompile` y no con un `ShaderMaterial` propio a
 * propósito: así el suelo sigue recibiendo la luz, la niebla y la exposición
 * que ya tiene montadas el resto del mundo, y esto es **un añadido** y no otro
 * material que mantener en paralelo. Lo que esta casa hace mal cuando
 * duplica —dos superficies, dos cuentas— está escrito en medio repositorio.
 */
export function ponerGrano(material: Material, grano: Texture): void {
  material.onBeforeCompile = (shader) => {
    // Deja rastro de que esto llegó a correr: sin él, «no se ve» no distingue
    // «el efecto es flojo» de «el gancho no se ejecutó». Ver `grano.test.ts`.
    material.userData.granoPuesto = true;
    shader.uniforms.mapaDeGrano = { value: grano };
    shader.uniforms.metrosPorRepeticion = { value: METROS_POR_REPETICION };
    shader.uniforms.hastaDonde = { value: HASTA_DONDE };
    shader.uniforms.fuerzaDelGrano = { value: FUERZA };

    shader.vertexShader = shader.vertexShader
      .replace(
        "void main() {",
        GLSL_DEL_GRANO.cabeceraDelVertice + "\nvoid main() {",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>" + GLSL_DEL_GRANO.vertice,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", GLSL_DEL_GRANO.cabecera + "\nvoid main() {")
      .replace(
        "#include <map_fragment>",
        "#include <map_fragment>" + GLSL_DEL_GRANO.cuerpo,
      );
  };
  /*
   * **Y la llave de la caché, que es lo que costó encontrarlo.**
   *
   * three guarda los programas compilados en una caché con llave hecha de los
   * parámetros del material. `onBeforeCompile` **no entra en esa llave**: si
   * otro material con los mismos parámetros compiló antes —y en este mundo hay
   * media docena de Lambert con textura: los letreros, el designador de pista,
   * el horizonte— este material reutiliza aquel programa y la inyección no
   * llega nunca a la tarjeta.
   *
   * Se vio subiendo la fuerza a 0,9: el suelo seguía **exactamente igual**.
   * Un efecto que no cambia nada cuando se multiplica por seis no está flojo,
   * no está. Ver el apunte de la casa sobre el número que no llega a cero.
   */
  material.customProgramCacheKey = () => "grano-del-suelo";
  material.needsUpdate = true;
}
