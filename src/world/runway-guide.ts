/**
 * Ayudas visuales para volver a la pista y posarse.
 *
 * Existen porque despegar ya se conseguía y aterrizar no: "meterlo de nuevo
 * en la pista es difícil, no lo aterrizo". Y con razón — una pista de mil
 * cien metros en un valle de catorce kilómetros es invisible desde el aire,
 * y aunque se encuentre, no hay nada que diga por dónde bajar.
 *
 * Tres piezas, todas sin una sola palabra escrita:
 *
 * 1. Un haz de luz vertical sobre la cabecera, visible desde lejos. Es el
 *    "vuelve hacia la torre naranja" que entiende cualquiera.
 * 2. Dos postes altos flanqueando el umbral, que dan referencia de anchura
 *    y de altura en los últimos metros, cuando el suelo plano engaña.
 * 3. Una hilera de aros descendiendo hacia el umbral, que dibujan en el aire
 *    la senda de planeo. No hay mejor forma de enseñar a bajar que dibujar
 *    por dónde.
 *
 * Ver AGENTS.md, regla 2: lo esencial no puede depender de leer.
 */

import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  TorusGeometry,
} from 'three';
import type { Scenario } from './scenarios';

const OCRE = 0xdd923f;
const TERRACOTA = 0xbe5d38;
const BEIGE = 0xe4e2da;

/** Cuántos aros dibujan la senda y desde qué distancia arrancan. */
const RING_COUNT = 7;
const FIRST_RING_DISTANCE = 3200;
/** Pendiente de la senda. Cuatro grados: cómoda y perdona el error. */
const GLIDE_SLOPE = (4 * Math.PI) / 180;

export function createRunwayGuide(scenario: Scenario, runwayElevation: number): Group {
  const group = new Group();
  group.name = 'guia-pista';

  const { runway } = scenario;
  const heading = (runway.heading * Math.PI) / 180;
  // Vector unitario que apunta desde la cabecera hacia la pista.
  const ax = Math.sin(heading);
  const az = Math.cos(heading);

  // Umbral: media pista por detrás del centro, que es por donde se entra.
  const thresholdX = runway.x - ax * runway.length * 0.5;
  const thresholdZ = runway.z - az * runway.length * 0.5;

  group.add(beacon(thresholdX, runwayElevation, thresholdZ));
  group.add(gatePosts(thresholdX, runwayElevation, thresholdZ, runway.width, ax, az));
  group.add(approachRings(thresholdX, runwayElevation, thresholdZ, ax, az));

  return group;
}

/**
 * Haz de luz vertical sobre la cabecera.
 *
 * Es un cilindro alto pintado por dentro y por fuera, sin iluminar, para que
 * se vea igual a contraluz y en sombra. Sin escribir en el buffer de
 * profundidad: así no recorta el paisaje ni tapa el avión al cruzarlo.
 */
function beacon(x: number, y: number, z: number): Mesh {
  const height = 420;
  const geometry = new CylinderGeometry(9, 22, height, 10, 1, true);
  const mesh = new Mesh(
    geometry,
    new MeshBasicMaterial({
      color: OCRE,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      // Por las dos caras: el haz es un cilindro hueco y con una sola cara
      // se ve como una chapa plana según desde dónde se mire.
      side: DoubleSide,
    }),
  );
  mesh.position.set(x, y + height / 2, z);
  mesh.renderOrder = 2;
  mesh.name = 'faro';
  return mesh;
}

/** Dos postes a los lados del umbral, como una puerta por la que entrar. */
function gatePosts(
  x: number,
  y: number,
  z: number,
  width: number,
  ax: number,
  az: number,
): Group {
  const posts = new Group();
  const height = 16;
  // Perpendicular al eje de la pista.
  const px = az;
  const pz = -ax;
  const reach = width * 0.9;

  for (const side of [-1, 1]) {
    const post = new Mesh(
      new CylinderGeometry(0.55, 0.8, height, 6),
      new MeshLambertMaterial({ color: side < 0 ? TERRACOTA : BEIGE }),
    );
    post.position.set(x + px * reach * side, y + height / 2, z + pz * reach * side);
    posts.add(post);

    const cap = new Mesh(
      new CylinderGeometry(1.7, 1.7, 2.2, 8),
      new MeshBasicMaterial({ color: OCRE }),
    );
    cap.position.set(x + px * reach * side, y + height + 1, z + pz * reach * side);
    posts.add(cap);
  }
  return posts;
}

/**
 * Aros que bajan hacia el umbral dibujando la senda de planeo.
 *
 * El primero está lejos y alto, el último justo antes del umbral y bajo. Se
 * agrandan con la distancia para que el de tres kilómetros se vea desde tres
 * kilómetros: si todos midieran lo mismo, los lejanos serían un punto.
 */
function approachRings(x: number, y: number, z: number, ax: number, az: number): Group {
  const rings = new Group();
  rings.name = 'aros';

  for (let i = 0; i < RING_COUNT; i++) {
    // Reparto cuadrático: más juntos cerca del umbral, que es donde hace
    // falta precisión, y más separados lejos.
    const fraction = ((i + 1) / RING_COUNT) ** 1.6;
    const distance = FIRST_RING_DISTANCE * fraction;
    const height = distance * Math.tan(GLIDE_SLOPE);
    const radius = 26 + distance * 0.016;

    const ring = new Mesh(
      // Gordos y bastante opacos: a dos kilómetros un aro fino no se ve, y
      // un aro que no se ve no guía a nadie.
      new TorusGeometry(radius, radius * 0.075, 6, 24),
      new MeshBasicMaterial({ color: OCRE, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    ring.position.set(x - ax * distance, y + height, z - az * distance);
    // El aro mira a lo largo del eje de la pista.
    ring.rotation.y = Math.atan2(ax, az);
    ring.renderOrder = 1;
    rings.add(ring);
  }
  return rings;
}
