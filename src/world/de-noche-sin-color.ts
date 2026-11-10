/**
 * **De noche, la pintura del avión no tiene color.**
 *
 * Por la ventanilla de Ara, en Barajas de noche, media ventanilla era un
 * manchón rojo oscuro, uniforme y con un borde recto: parecía el ala teñida por
 * la luz roja de navegación. Medido con la Intel (T122): era **la góndola del
 * motor izquierdo**, el capó y el manguito de la reversa —material `capo`, el
 * terracota de la casa—, a seis metros y medio del ojo y alumbrada solo por el
 * relleno de la noche. Ni una luz ni un emisivo, y fija: sin luces en la
 * escena, negra del todo; diez capturas en dos segundos, las diez a
 * (25, 8, 5). Igual sobre el mar en el segundo capítulo y en el vuelo libre de
 * noche.
 *
 * La cuenta estaba bien —terracota por el azul flojo de la noche— y la imagen
 * mentía igual, porque **de noche el ojo no ve colores**: con tan poca luz
 * miran los bastones, que no los distinguen, y una góndola terracota se ve
 * como el ala, casi negra. Lo que se aprendía era lo contrario de lo que pasa:
 * que la luz roja de la punta tiñe de rojo el ala entera, cuando es un punto
 * que alumbra poco a su alrededor.
 *
 * Así que la pintura pierde el color con la noche: antes de alumbrarla, el
 * color de cada pieza se cambia por un gris de su misma claridad. La luz sigue
 * siendo la de la hora —el azul del relleno de noche—, el aluminio se queda
 * como estaba y lo terracota sale más oscuro que él, como de verdad. Con el
 * crepúsculo civil los colores todavía se ven; con el náutico se van yendo, y
 * con la noche cerrada no queda ninguno.
 *
 * Solo la pintura —los colores de la librea y lo que lleva dibujado encima—, y
 * solo en los aviones del vuelo: el que se vuela y los del tráfico, que salen
 * de los mismos modelos. La tarjeta del avión se mira con su luz de día, y lo
 * de dentro de la cabina lo alumbra la cabina. Cuesta una cuenta por píxel en
 * unas pocas piezas.
 */

import type { Material, Object3D } from "three";

/**
 * **Cuánto color se ha llevado la noche**, de 0 (todo a la vista) a 1 (nada):
 * el mismo objeto en todos los materiales, que se pone una vez por hora nueva.
 * Ver `ponerLaNoche`.
 */
export const SIN_COLOR: { value: number } = { value: 0 };

/**
 * Hasta dónde se ven los colores, en la escala de las estrellas del cielo:
 * 0,55 es el final del crepúsculo civil —el sol seis grados por debajo—, que es
 * justo la luz con la que todavía se distinguen las cosas sin alumbrarlas. Ver
 * `MOMENTOS` en `sky.ts`.
 */
export const CON_COLOR_HASTA = 0.55;

/**
 * Lo que se lleva la noche con estas estrellas: nada hasta el crepúsculo
 * civil, dos tercios con el náutico y todo con la noche cerrada.
 */
export function colorQueSeLlevaLaNoche(estrellas: number): number {
  return Math.min(1, Math.max(0, (estrellas - CON_COLOR_HASTA) / (1 - CON_COLOR_HASTA)));
}

/** La pone el cielo con cada hora. Ver `alPaso` en `sky.ts`. */
export function ponerLaNoche(estrellas: number): void {
  SIN_COLOR.value = colorQueSeLlevaLaNoche(estrellas);
}

/**
 * Los materiales que son pintura: los de la librea —ver `RANURAS` en
 * `aeronave-modelo.ts`— y el remate. El metal del ala y de las góndolas ya es
 * gris, y el cristal y la goma, oscuros.
 */
export const PINTURA: ReadonlySet<string> = new Set(["casco", "capo", "detalle", "cola", "remate"]);

/**
 * La cuenta, en lineal: la claridad de siempre, Rec. 709, y el color mezclado
 * hacia ella lo que diga la noche. Después de `color_fragment`, que es donde el
 * color de la pieza ya lleva su textura —el motivo de la cola— y sus colores de
 * vértice, y antes de que nada lo alumbre.
 */
const TROZO = /* glsl */ `
  diffuseColor.rgb = mix(
    diffuseColor.rgb,
    vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))),
    uSinColor
  );`;

/**
 * Los que ya lo llevan. Aparte y no en `userData`, que un `clone()` copia sin
 * copiar el `onBeforeCompile`: el clon diría que lo lleva y no lo llevaría.
 */
const yaSinColor = new WeakSet<Material>();

/**
 * Le enseña a un material a perder el color de noche. Se envuelve lo que ya
 * tuviera en `onBeforeCompile`, no se sustituye; y quien lo envuelva después
 * —el ala que se dobla clona el material y llama al de antes— se lo lleva.
 */
export function sinColorDeNoche(material: Material): void {
  if (yaSinColor.has(material)) return;
  yaSinColor.add(material);
  const previo = material.onBeforeCompile;
  /*
   * **La llave de la caché de programas, la de antes y leída ya.** La de
   * three.js es el texto del `onBeforeCompile`: leída después sería el de
   * aquí, el mismo para todos, y dos materiales con envoltorios distintos
   * debajo compartirían programa. Y con su sello detrás, para que uno igual
   * sin la cuenta —el metal del ala— no se quede con este programa, ni al
   * revés.
   */
  const llave = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, pintor) => {
    previo.call(material, shader, pintor);
    shader.uniforms.uSinColor = SIN_COLOR;
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform float uSinColor;\nvoid main() {")
      .replace("#include <color_fragment>", `#include <color_fragment>${TROZO}`);
  };
  material.customProgramCacheKey = () => `${llave}|sin-color-de-noche`;
}

/**
 * La pintura de un modelo, entera: cuántos materiales ha tocado. Antes de que
 * nada clone los materiales —ver `prepararElAla`—, para que el clon la herede.
 */
export function pinturaSinColorDeNoche(raiz: Object3D): number {
  const tocados = new Set<Material>();
  raiz.traverse((o) => {
    const m = (o as { material?: Material | Material[] }).material;
    for (const material of Array.isArray(m) ? m : m ? [m] : [])
      if (PINTURA.has(material.name) && !tocados.has(material)) {
        sinColorDeNoche(material);
        tocados.add(material);
      }
  });
  return tocados.size;
}
