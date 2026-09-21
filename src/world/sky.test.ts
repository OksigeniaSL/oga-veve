/**
 * El cielo, y la única cuenta suya que se puede comprobar sin tarjeta
 * gráfica: **desde dónde se mide la dirección**.
 *
 * El degradado, el halo y el disco del sol salen todos de un vector: hacia
 * dónde mira este trozo de cielo. Si ese vector está mal, todo lo demás está
 * mal y **se ve** — pero no se ve en una prueba, se ve volando, que es como
 * se vio:
 *
 * > «El sol, literalmente, debajo del horizonte, tiene gracia.»
 *
 * Y tenía gracia. La cúpula **viaja con la cámara** —`updateSky` le copia la
 * posición cada fotograma, que es lo que impide salirse de ella por mucho que
 * se suba— y el vértice le pasaba al fragmento su posición **en el mundo**.
 * Normalizada, eso es la dirección desde el origen del escenario, no desde el
 * ojo. Medido con el juego abierto, nada más empezar una aproximación:
 *
 *     tenerife-sur    cúpula r=16.000 m · a 4.919 m del origen → 17,1° de error
 *     la-palma        cúpula r=16.000 m · a 4.448 m del origen → 15,5°
 *     gran-canaria    cúpula r=20.000 m · a 4.899 m del origen → 13,8°
 *     pettirossi      cúpula r=22.000 m · a 5.062 m del origen → 13,0°
 *
 * Trece grados largos, y creciendo según uno se aleja del centro. Con eso, un
 * sol a tres grados sobre el horizonte se pinta muy por debajo de él.
 *
 * Un shader no se ejecuta aquí: no hay contexto de GL y montar uno sería
 * traerse medio navegador. Pero las tres averías de este cielo eran **de
 * texto** —una palabra de más, un sumando de más y un `mix` donde iba un
 * `+=`— así que el texto es exactamente lo que hay que clavar. Ver
 * `GLSL_DEL_CIELO`.
 */

import { describe, expect, it } from "vitest";
import { Group, Object3D, Vector3 } from "three";
import {
  GAJOS_DEL_CIELO,
  GLSL_DEL_CIELO,
  updateSky,
  type SkyRig,
} from "./sky";

/**
 * Un aparejo de mentira con lo justo que mira `updateSky`.
 *
 * `createSky` no se puede llamar desde aquí: pinta la textura de las nubes en
 * un lienzo y en una prueba no hay documento. Lo que se comprueba —que la
 * cúpula se pega a la cámara— solo necesita el grupo y el nombre.
 */
function aparejoDeMentira(): { rig: SkyRig; cupula: Object3D } {
  const group = new Group();
  const cupula = new Object3D();
  cupula.name = "cielo";
  group.add(cupula);
  return { rig: { group } as unknown as SkyRig, cupula };
}

describe("la cúpula del cielo", () => {
  it("va donde va la cámara, que es lo que obliga a todo lo demás", () => {
    const { rig, cupula } = aparejoDeMentira();
    const ojo = new Vector3(5000, 420, -3000);
    updateSky(rig, ojo);
    expect(cupula.position.toArray()).toEqual(ojo.toArray());
  });

  it("y por eso la dirección sale del vértice, no de su sitio en el mundo", () => {
    /*
     * La esfera es de radio uno: su vértice **es** la dirección. En cuanto
     * aparece `modelMatrix` aquí, lo que le llega al fragmento es «dónde está
     * este trozo de cielo en el mapa», que con la cúpula pegada a la cámara
     * son los trece grados de error de la cabecera.
     */
    expect(GLSL_DEL_CIELO.vertice).toContain("vDireccion = position;");
    expect(GLSL_DEL_CIELO.vertice).not.toContain("modelMatrix");
  });

  it("y no se le suma ningún desplazamiento a esa dirección", () => {
    /*
     * Había un `offset` de 0,12 sumado antes de normalizar. Sobre una esfera
     * de dieciséis mil metros no hacía nada —llevaba meses siendo un cero— y
     * sobre una de radio uno levanta el cielo unos siete grados, o sea
     * **pinta el sol siete grados más abajo de donde está**: la misma avería
     * otra vez, por la puerta de atrás.
     */
    expect(GLSL_DEL_CIELO.fragmento).toContain("normalize(vDireccion)");
    expect(GLSL_DEL_CIELO.fragmento).not.toContain("offset");
  });

  it("y tiene gajos de sobra para que no se vea el aspa", () => {
    /*
     * La dirección se interpola linealmente por la cara del triángulo. Con
     * 24×16 gajos —quince grados de ancho por once de alto— eso no es una
     * dirección: es una aproximación que se separa varios grados por el medio
     * de cada cara, y con el degradado ya centrado eso se lee como un aspa.
     */
    expect(360 / GAJOS_DEL_CIELO.ancho).toBeLessThanOrEqual(6);
    expect(180 / GAJOS_DEL_CIELO.alto).toBeLessThanOrEqual(4);
  });
});

describe("el sol", () => {
  it("suma sobre su halo en vez de borrarlo", () => {
    /*
     * Era `mix(sky, sunColour, disc)`: en el punto exacto del sol se tiraba
     * el resplandor que la línea anterior acababa de sumar y se ponía el
     * color del sol a secas. Como el halo aporta casi el doble de ese mismo
     * color, el disco salía **más oscuro que lo que lo rodea** — un agujero
     * pardo en mitad del cielo naranja. El sol es la fuente: es lo más claro
     * del cielo, o no es el sol.
     */
    expect(GLSL_DEL_CIELO.fragmento).toContain("sky += sunColour * disc;");
    expect(GLSL_DEL_CIELO.fragmento).not.toContain(
      "mix(sky, sunColour, disc)",
    );
  });

  it("y el halo se abre cuanto más bajo está, que es lo que da la hora", () => {
    // La pareja de potencias del mismo coseno: cerrada para el disco, abierta
    // para el resplandor. Si alguna vez se quedan iguales, no hay atardecer.
    expect(GLSL_DEL_CIELO.fragmento).toContain("mix(60.0, 5.0, haloFuerza)");
  });
});
