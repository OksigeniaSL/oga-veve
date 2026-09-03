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
 * Cada aeronave lleva su silueta y su paleta en `appearance`, dentro de su
 * propia ficha: un biplano se dibuja con dos alas y montantes entre ellas, y
 * un ala alta con una sola. Antes todas salían iguales —el biplano parecía
 * un monoplano— porque la geometría solo miraba las medidas y no la forma.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from "three";
import type { AircraftConfig } from "../flight/aircraft";

export interface AircraftMesh {
  group: Group;
  /** Se hace girar con el motor. */
  propeller: Object3D;
  /**
   * Dónde están los ojos del piloto, en coordenadas de la aeronave.
   *
   * Sin modelo no hay cabina que valga y la vista se coloca con una fórmula
   * sobre la cuerda del ala, que es lo que había. Con modelo, la cabina existe
   * de verdad y hay que ponerse **donde se sienta uno**: un palmo por detrás
   * del panel y a la altura de la cabeza, no flotando entre los asientos
   * traseros mirando el salón.
   */
  /** Las pantallas de la cabina, si el modelo las trae. */
  pantallas?: import("./pantallas-cabina").Pantallas | null;
  ojo?: { x: number; y: number; z: number };
}

export function createAircraftMesh(aircraft: AircraftConfig): AircraftMesh {
  const group = new Group();
  group.name = `aeronave:${aircraft.id}`;

  const span = aircraft.wingSpan;
  const length = span * 0.78;
  const chord = aircraft.chord;

  const look = aircraft.appearance;
  const body = new MeshLambertMaterial({ color: look.body });
  const accent = new MeshLambertMaterial({ color: look.accent });
  const trim = new MeshLambertMaterial({ color: look.trim });
  const glass = new MeshLambertMaterial({
    color: 0x2a3b45,
    transparent: true,
    opacity: 0.72,
  });

  // Fuselaje
  const fuselage = new Mesh(
    new BoxGeometry(chord * 0.72, chord * 0.8, length),
    body,
  );
  fuselage.position.z = length * 0.08;
  group.add(fuselage);

  // Morro y capó del motor
  const nose = new Mesh(
    new BoxGeometry(chord * 0.6, chord * 0.62, length * 0.2),
    accent,
  );
  nose.position.z = -length * 0.45;
  group.add(nose);

  // Cabina
  const canopy = new Mesh(
    new BoxGeometry(chord * 0.6, chord * 0.42, length * 0.26),
    glass,
  );
  canopy.position.set(0, chord * 0.46, -length * 0.16);
  group.add(canopy);

  const biplane = look.layout === "biplane";

  // Ala superior. En el ala alta es la única; en el biplano, la de arriba.
  const upper = new Mesh(new BoxGeometry(span, chord * 0.14, chord), body);
  upper.position.set(0, chord * (biplane ? 0.95 : 0.5), -length * 0.05);
  group.add(upper);

  const stripe = new Mesh(
    new BoxGeometry(span, chord * 0.16, chord * 0.22),
    accent,
  );
  stripe.position.set(0, upper.position.y, -length * 0.05 + chord * 0.32);
  group.add(stripe);

  if (biplane) {
    // Ala inferior, más corta, y los montantes que las unen. Es lo que hace
    // que un biplano se lea como biplano desde la cámara de persecución.
    const lower = new Mesh(
      new BoxGeometry(span * 0.88, chord * 0.13, chord * 0.92),
      body,
    );
    lower.position.set(0, -chord * 0.12, -length * 0.02);
    group.add(lower);

    for (const side of [-1, 1]) {
      for (const offset of [-chord * 0.3, chord * 0.3]) {
        const strut = new Mesh(
          new BoxGeometry(chord * 0.07, chord * 1.07, chord * 0.09),
          trim,
        );
        strut.position.set(
          side * span * 0.3,
          chord * 0.42,
          -length * 0.04 + offset,
        );
        group.add(strut);
      }
    }
  } else {
    for (const side of [-1, 1]) {
      const strut = new Mesh(
        new BoxGeometry(chord * 0.08, chord * 0.5, chord * 0.1),
        trim,
      );
      strut.position.set(side * span * 0.22, chord * 0.24, -length * 0.02);
      group.add(strut);
    }
  }

  // Estabilizador horizontal y deriva
  const tailplane = new Mesh(
    new BoxGeometry(span * 0.36, chord * 0.1, chord * 0.6),
    body,
  );
  tailplane.position.set(0, chord * 0.24, length * 0.42);
  group.add(tailplane);

  const fin = new Mesh(
    new BoxGeometry(chord * 0.1, chord * 1.1, chord * 0.7),
    accent,
  );
  fin.position.set(0, chord * 0.78, length * 0.44);
  group.add(fin);

  // Tren de aterrizaje fijo, tres patas
  const gearY = -aircraft.gearHeight + chord * 0.1;
  for (const [x, z] of [
    [-span * 0.13, -length * 0.08],
    [span * 0.13, -length * 0.08],
    [0, -length * 0.4],
  ] as const) {
    const leg = new Mesh(
      new BoxGeometry(chord * 0.07, aircraft.gearHeight * 0.7, chord * 0.07),
      trim,
    );
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
  const hub = new Mesh(
    new CylinderGeometry(chord * 0.1, chord * 0.1, chord * 0.12, 8),
    new MeshLambertMaterial({ color: look.accent }),
  );
  hub.rotation.x = Math.PI / 2;
  propeller.add(hub);
  for (let i = 0; i < look.blades; i++) {
    const blade = new Mesh(
      new BoxGeometry(chord * 1.5, chord * 0.11, chord * 0.05),
      trim,
    );
    blade.rotation.z = (i * Math.PI) / look.blades;
    propeller.add(blade);
  }
  group.add(propeller);

  return { group, propeller };
}
