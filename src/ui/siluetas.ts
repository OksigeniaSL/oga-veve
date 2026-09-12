/**
 * El retrato de cada avión de la flota, para el hangar.
 *
 * Elegir avión sin ver el avión es elegir una palabra, y este juego lo eligen
 * niños que no leen: lo que distingue un *Pykasu* de un *Mainumby* es que uno
 * tiene un ala y el otro dos, y eso hay que **verlo**.
 *
 * ## Y sale de la misma fábrica que los vuela
 *
 * No de un dibujo aparte. Un retrato dibujado a mano al lado de una geometría
 * generada son dos siluetas que empiezan iguales y acaban distintas: se toca
 * la flecha del ala en la fábrica, el retrato no se entera, y el hangar
 * promete un avión que luego no es. Aquí se monta el avión de verdad, se le
 * hace una foto de tres cuartos y se guarda como imagen. Ver
 * `world/fabrica-de-aeronaves.ts`.
 *
 * ## Una sola vez, y con un solo lienzo
 *
 * Cinco contextos de WebGL abiertos a la vez en una tablet es quedarse sin
 * ninguno: los navegadores tienen un tope y no avisan, sencillamente dejan de
 * dar. Así que se abre uno, se hacen las fotos, se cierra y lo que queda son
 * cinco cadenas de texto. Se guardan, porque el hangar se repinta entero cada
 * vez que se toca algo y volver a montar cinco aviones por cada clic sería
 * pagar el arranque una y otra vez.
 */

import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { FLOTA } from "../flight/flota";
import { fabricarAeronave } from "../world/fabrica-de-aeronaves";

/** El tamaño del retrato. Se dibuja al doble para que no se vea pixelado. */
const ANCHO = 240;
const ALTO = 168;

/**
 * De tres cuartos, desde arriba y por delante.
 *
 * Es la vista de la que se reconoce un avión: de perfil no se ve la flecha del
 * ala y en planta no se ve la cola en T. Las dos cosas juntas son cuatro de
 * las cinco siluetas de la flota.
 */
const CAMARA: readonly [number, number, number] = [11, 7, 13];

/** Los colores del retrato, que son los del hangar y no los del avión. */
const PALETA = { body: 0xe7e3d8, accent: 0xc4522f, trim: 0x3a4038 };
const FONDO = 0x1d2721;

let retratos: ReadonlyMap<string, string> | null = null;

/**
 * El retrato de cada modelo de la flota, por su identificador.
 *
 * Devuelve un mapa vacío si no hay WebGL —una tablet vieja, un navegador con
 * la aceleración apagada—: el hangar enseña entonces el nombre y ya está, que
 * es peor pero no deja a nadie sin elegir. Que falte un recurso no puede dejar
 * a nadie sin volar, aquí tampoco.
 */
export function retratosDeLaFlota(): ReadonlyMap<string, string> {
  if (retratos) return retratos;
  const salida = new Map<string, string>();
  let pintor: WebGLRenderer | null = null;
  try {
    pintor = new WebGLRenderer({ antialias: true, alpha: false });
    pintor.setSize(ANCHO, ALTO);
    pintor.setClearColor(FONDO);
    const camara = new PerspectiveCamera(32, ANCHO / ALTO, 0.1, 200);
    camara.position.set(...CAMARA);
    camara.lookAt(0, 0, 0);
    for (const modelo of FLOTA) {
      const escena = new Scene();
      escena.add(new AmbientLight(0xffffff, 0.74));
      const sol = new DirectionalLight(0xffffff, 0.92);
      sol.position.set(4, 9, 6);
      escena.add(sol);
      const { geometria } = fabricarAeronave(
        modelo.silueta,
        // Todos del mismo tamaño en el retrato: lo que se compara aquí es la
        // **forma**. El tamaño de verdad lo dice el número del modelo, que
        // crece con él, y eso se aprende leyendo la fila.
        { envergadura: 11, cuerda: 1.5, tren: 0.9 },
        PALETA,
      );
      geometria.center();
      const malla = new Mesh(
        geometria,
        new MeshLambertMaterial({ vertexColors: true }),
      );
      escena.add(malla);
      pintor.render(escena, camara);
      salida.set(modelo.id, pintor.domElement.toDataURL("image/png"));
      geometria.dispose();
      malla.material.dispose();
    }
  } catch {
    // Sin WebGL no hay retratos, y el hangar sigue funcionando sin ellos.
  } finally {
    pintor?.dispose();
    pintor?.forceContextLoss?.();
  }
  retratos = salida;
  return retratos;
}
