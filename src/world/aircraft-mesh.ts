/**
 * Malla de la aeronave, generada por código.
 *
 * Deliberadamente geométrica y sin texturas: es arte provisional que sirve
 * para volar y para las capturas, y evita meter en el repositorio modelos de
 * terceros con licencias que habría que auditar (ver CREDITOS.md). Cuando
 * haya modelos propios en glTF, esta función se sustituye por un cargador y
 * el resto del juego no se entera.
 *
 * Orientación: el morro apunta a -Z, la panza a -Y. Es la convención que
 * espera el FDM y la de cualquier glTF exportado con "forward -Z", así que
 * el reemplazo futuro encaja sin rotaciones sorpresa.
 *
 * Colores de la paleta de Granja Óga: terracota, ocre, verde bosque y beige.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from 'three';
import type { AircraftConfig } from '../flight/aircraft';

const TERRACOTA = 0xbe5d38;
const OCRE = 0xdd923f;
const VERDE_BOSQUE = 0x2f5243;
const BEIGE = 0xe4e2da;

export interface AircraftMesh {
  group: Group;
  /** Se hace girar con el motor. */
  propeller: Object3D;
}

export function createAircraftMesh(aircraft: AircraftConfig): AircraftMesh {
  const group = new Group();
  group.name = `aeronave:${aircraft.id}`;

  const span = aircraft.wingSpan;
  const length = span * 0.78;
  const chord = aircraft.chord;

  const body = new MeshLambertMaterial({ color: BEIGE });
  const accent = new MeshLambertMaterial({ color: TERRACOTA });
  const trim = new MeshLambertMaterial({ color: VERDE_BOSQUE });
  const glass = new MeshLambertMaterial({ color: 0x2a3b45, transparent: true, opacity: 0.72 });

  // Fuselaje
  const fuselage = new Mesh(new BoxGeometry(chord * 0.72, chord * 0.8, length), body);
  fuselage.position.z = length * 0.08;
  group.add(fuselage);

  // Morro y capó del motor
  const nose = new Mesh(new BoxGeometry(chord * 0.6, chord * 0.62, length * 0.2), accent);
  nose.position.z = -length * 0.45;
  group.add(nose);

  // Cabina
  const canopy = new Mesh(new BoxGeometry(chord * 0.6, chord * 0.42, length * 0.26), glass);
  canopy.position.set(0, chord * 0.46, -length * 0.16);
  group.add(canopy);

  // Ala principal. Ala alta: es lo que hace que se vea el suelo desde dentro,
  // que para este juego importa más que cualquier consideración aerodinámica.
  const wing = new Mesh(new BoxGeometry(span, chord * 0.14, chord), body);
  wing.position.set(0, chord * 0.5, -length * 0.05);
  group.add(wing);

  const wingStripe = new Mesh(new BoxGeometry(span, chord * 0.16, chord * 0.22), accent);
  wingStripe.position.set(0, chord * 0.5, -length * 0.05 + chord * 0.32);
  group.add(wingStripe);

  // Montantes del ala
  for (const side of [-1, 1]) {
    const strut = new Mesh(new BoxGeometry(chord * 0.08, chord * 0.5, chord * 0.1), trim);
    strut.position.set(side * span * 0.22, chord * 0.24, -length * 0.02);
    group.add(strut);
  }

  // Estabilizador horizontal y deriva
  const tailplane = new Mesh(new BoxGeometry(span * 0.36, chord * 0.1, chord * 0.6), body);
  tailplane.position.set(0, chord * 0.24, length * 0.42);
  group.add(tailplane);

  const fin = new Mesh(new BoxGeometry(chord * 0.1, chord * 1.1, chord * 0.7), accent);
  fin.position.set(0, chord * 0.78, length * 0.44);
  group.add(fin);

  // Tren de aterrizaje fijo, tres patas
  const gearY = -aircraft.gearHeight + chord * 0.1;
  for (const [x, z] of [
    [-span * 0.13, -length * 0.08],
    [span * 0.13, -length * 0.08],
    [0, -length * 0.4],
  ] as const) {
    const leg = new Mesh(new BoxGeometry(chord * 0.07, aircraft.gearHeight * 0.7, chord * 0.07), trim);
    leg.position.set(x, gearY + aircraft.gearHeight * 0.35, z);
    group.add(leg);

    const wheel = new Mesh(
      new CylinderGeometry(chord * 0.16, chord * 0.16, chord * 0.09, 10),
      new MeshLambertMaterial({ color: 0x2b2b2b }),
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, gearY, z);
    group.add(wheel);
  }

  // Hélice: dos palas y un buje. Gira en el bucle de juego.
  const propeller = new Group();
  propeller.position.z = -length * 0.56;
  const hub = new Mesh(new CylinderGeometry(chord * 0.1, chord * 0.1, chord * 0.12, 8), new MeshLambertMaterial({ color: OCRE }));
  hub.rotation.x = Math.PI / 2;
  propeller.add(hub);
  for (const angle of [0, Math.PI / 2]) {
    const blade = new Mesh(new BoxGeometry(chord * 1.5, chord * 0.11, chord * 0.05), trim);
    blade.rotation.z = angle;
    propeller.add(blade);
  }
  group.add(propeller);

  return { group, propeller };
}
