/**
 * Los calzos, en el suelo con el avión parado como descansa.
 *
 * Existe por el JAZ 25, que descansa en tres puntos con el morro doce grados
 * arriba: los calzos iban en el plano de las ruedas del dibujo a nivel y,
 * girados con el avión, el de detrás de cada rueda se metía 0,13 m en el
 * asfalto. Lo vieron los bancos que miran lo más bajo del avión contra lo que
 * se ve; esto lo mira sin navegador, para toda la flota.
 */
import { describe, expect, it } from "vitest";
import { Box3, Group, Mesh, Vector3 } from "three";
import { AIRCRAFT } from "../flight/aircraft";
import { actitudEnTierra } from "../flight/apoyo";
import { FundasYCalzos } from "./fundas-y-calzos";

/** La rueda principal izquierda de un avión, en los ejes de su grupo: el morro hacia −Z. */
function rueda(radio: number, ancho: number, x: number, y: number, z: number): Box3 {
  return new Box3(
    new Vector3(x - ancho / 2, y - radio, z - radio),
    new Vector3(x + ancho / 2, y + radio, z + radio),
  );
}

/** Lo más bajo y lo más alto de cada calzo, en el mundo. */
function calzosEnElMundo(avion: Group): { bajo: number; alto: number; z: number }[] {
  avion.updateWorldMatrix(true, true);
  const fuera: { bajo: number; alto: number; z: number }[] = [];
  const v = new Vector3();
  avion.traverse((m) => {
    if (!(m instanceof Mesh) || m.parent?.parent?.name !== "fundas-y-calzos") return;
    const pos = m.geometry.attributes.position!;
    let bajo = Infinity;
    let alto = -Infinity;
    let z = 0;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      bajo = Math.min(bajo, v.y);
      alto = Math.max(alto, v.y);
      z += v.z / pos.count;
    }
    fuera.push({ bajo, alto, z });
  });
  return fuera;
}

/** El avión con sus calzos, girado a `actitud` como lo gira el juego; y dónde toca su rueda. */
function aparcado(caja: Box3, actitud: number) {
  const avion = new Group();
  avion.rotation.x = actitud;
  const calzos = new FundasYCalzos([], caja, 10, true, actitud);
  avion.add(calzos.grupo);
  avion.updateWorldMatrix(true, true);
  // El eje de la rueda en el mundo, y el suelo un radio por debajo.
  const eje = caja.getCenter(new Vector3()).applyMatrix4(avion.matrixWorld);
  const radio = (caja.max.y - caja.min.y) / 2;
  return { avion, suelo: eje.y - radio, ejeZ: eje.z };
}

describe("los calzos del avión parado", () => {
  // La rueda del JAZ 25: 0,36 de radio, 0,20 por delante del centro y 1,80 por debajo.
  const delFumigador = rueda(0.36, 0.2, -1.4, -1.8 + 0.36, -0.2);

  it("con el morro arriba, apoyan en el suelo de la rueda: ni dentro ni flotando", () => {
    const { avion, suelo } = aparcado(delFumigador, (12 * Math.PI) / 180);
    const calzos = calzosEnElMundo(avion);
    expect(calzos).toHaveLength(4);
    for (const c of calzos) expect(Math.abs(c.bajo - suelo)).toBeLessThan(0.002);
  });

  it("y tumbados y apartados de la rueda igual que con el avión a nivel", () => {
    const anivel = aparcado(delFumigador, 0);
    const enTresPuntos = aparcado(delFumigador, (12 * Math.PI) / 180);
    const alto = (c: { bajo: number; alto: number }) => c.alto - c.bajo;
    // Lo apartado, a lo largo del suelo desde la vertical del eje.
    const lejos = (a: ReturnType<typeof aparcado>) =>
      calzosEnElMundo(a.avion)
        .map((c) => c.z - a.ejeZ)
        .sort((x, y) => x - y);
    const calzos = calzosEnElMundo(enTresPuntos.avion);
    for (const c of calzos) expect(alto(c)).toBeCloseTo(alto(calzosEnElMundo(anivel.avion)[0]!), 3);
    const antes = lejos(anivel);
    lejos(enTresPuntos).forEach((d, i) => expect(d).toBeCloseTo(antes[i]!, 3));
  });

  it("y a nivel, donde estaban siempre", () => {
    const { avion, suelo } = aparcado(delFumigador, 0);
    for (const c of calzosEnElMundo(avion)) expect(c.bajo).toBeCloseTo(suelo, 3);
  });

  it.each(AIRCRAFT.map((a) => [a.id, a] as const))(
    "el %s, con la actitud con la que descansa parado",
    (_id, a) => {
      const caja = rueda(0.3, 0.18, -a.wingSpan * 0.1, -a.gearHeight + 0.3, a.mainWheelsAft);
      const { avion, suelo } = aparcado(caja, actitudEnTierra(a, 0));
      for (const c of calzosEnElMundo(avion)) expect(Math.abs(c.bajo - suelo)).toBeLessThan(0.002);
    },
  );
});
