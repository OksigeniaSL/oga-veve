/**
 * **El otro avión, de lejos, no más pequeño de dos píxeles.**
 *
 * La pantalla del TCAS pintaba un rombo «−22» a pocas millas y por la
 * ventanilla no había nada: un turbohélice de veintisiete metros a cinco
 * kilómetros mide un tercio de grado, y en el cuadro de un teléfono eso es
 * menos de dos píxeles —medio, en el lienzo de la tablet—. El ojo de un piloto
 * sí lo vería: separa un minuto de arco, siete veces menos. La pantalla se
 * comía lo que el TCAS manda buscar, y la lección de la información de tráfico
 * —primero te dicen dónde, después lo encuentras— se quedaba sin la segunda
 * mitad.
 *
 * Es lo mismo que ya se hizo con las aves —ver `world/bandadas-dibujo.ts`—, y
 * con la misma regla: de lejos, el avión se dibuja **a la escala que le haga
 * medir dos píxeles**, y de cerca, a su tamaño. No se inventa un punto aparte:
 * es su propio cuerpo, con sus luces, en su sitio. Hasta dónde se dibuja lo
 * sigue diciendo cada tráfico —treinta kilómetros los de la ruta, ver
 * `SE_VEN_HASTA`—: más allá un avión no se ve ni con buen tiempo, y la carta
 * lo sigue pintando porque el TCAS sí lo oye.
 *
 * Sin DOM: la cuenta se prueba sola y el juego le pasa la cámara.
 */

import { Box3, Vector3, type Camera, type Object3D } from "three";

/** Lo menos que mide un avión en pantalla, en píxeles. Ver la cabecera. */
export const PIXELES_COMO_POCO = 2;

/**
 * La escala que hace que algo de `envergadura` metros, a `distancia` metros,
 * mida al menos `PIXELES_COMO_POCO` en una pantalla de `pixelesPorRadian`.
 * Uno de cerca: a su tamaño.
 */
export function escalaParaVerse(
  distancia: number,
  envergadura: number,
  pixelesPorRadian: number,
): number {
  if (envergadura <= 0 || pixelesPorRadian <= 0) return 1;
  return Math.max(
    1,
    (PIXELES_COMO_POCO * distancia) / (pixelesPorRadian * envergadura),
  );
}

/** Cuántos píxeles mide un radián en un lienzo de `alto` píxeles y `campo` grados. */
export function pixelesPorRadian(alto: number, campo: number): number {
  return alto / (2 * Math.tan((campo * Math.PI) / 180 / 2));
}

/**
 * La envergadura de cada avión dibujado, medida una vez a su tamaño.
 *
 * Se mide de su propia caja —cuerpo, luces y todo— la primera vez que se ve, y
 * se guarda: medirla cada fotograma costaría, y medirla ya escalado daría el
 * tamaño agrandado.
 */
const envergaduras = new WeakMap<Object3D, number>();
const _caja = new Box3();
const _tam = new Vector3();
const _ojo = new Vector3();
const _donde = new Vector3();

function envergaduraDe(avion: Object3D): number {
  let e = envergaduras.get(avion);
  if (e === undefined) {
    const escalaAntes = avion.scale.x;
    avion.scale.setScalar(1);
    avion.updateMatrixWorld(true);
    _caja.setFromObject(avion);
    _caja.getSize(_tam);
    avion.scale.setScalar(escalaAntes);
    e = Math.max(_tam.x, _tam.z);
    // Una caja vacía —sin geometría todavía— no se apunta: se mide luego.
    if (!Number.isFinite(e) || e <= 0) return 0;
    envergaduras.set(avion, e);
  }
  return e;
}

/**
 * Pone a cada avión de `aviones` la escala que le toca vista desde `camara`.
 * Cada elemento es un avión entero —su grupo o su malla—, que es como los
 * guardan los tres tráficos del juego.
 */
export function ponerTamanoMinimo(
  aviones: Iterable<Object3D>,
  camara: Camera & { fov?: number },
  altoDelLienzo: number,
): void {
  const ppr = pixelesPorRadian(altoDelLienzo, camara.fov ?? 60);
  camara.getWorldPosition(_ojo);
  for (const avion of aviones) {
    if (!avion.visible) continue;
    const envergadura = envergaduraDe(avion);
    if (envergadura <= 0) continue;
    avion.getWorldPosition(_donde);
    const escala = escalaParaVerse(_donde.distanceTo(_ojo), envergadura, ppr);
    if (Math.abs(avion.scale.x - escala) > 1e-3) avion.scale.setScalar(escala);
  }
}
