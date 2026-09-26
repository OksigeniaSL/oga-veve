/**
 * Que los flaps bajen como bajan los de verdad, y que vuelvan a su sitio.
 *
 * Lo que se comprueba no es que la palanca cambie —eso ya lo mide
 * `flight/flaps.test.ts`— sino que **lo que se ve se mueve como se mueve un
 * flap**: por su bisagra, hacia abajo y hacia atrás, en su muesca los grados
 * de su muesca, sin saltos, igual a los dos lados, y recogido exactamente
 * donde estaba — que es lo que se pidió antes que nada: «no sé si quiero que
 * empecemos a romper el diseño del avión ahora que está tan bonito».
 */
import { describe, expect, it } from "vitest";
import { BoxGeometry, Group, Mesh, Object3D, Vector3 } from "three";
import { FLAP, prepararFlaps } from "./flaps";
import { DETENTES } from "../flight/flaps";

const MUESCAS = [0, 5, 15, 30];
const RECORRIDO = [0, 0.2, 0.3, 0.34];

interface Lado {
  vacio: Object3D;
  borde: Mesh;
  tapas: Object3D;
  hueco: Object3D;
}

/**
 * Un avión de mentira montado como los de `modelos/`: la raíz del glTF —con
 * la escala a la envergadura de la ficha, que el juego le pone—, el nodo
 * `avion` con su cuarto de vuelta en x, y colgando de él un flap a cada lado,
 * con el vacío en el origen y lo que lo mueve escrito en sus propiedades, en
 * los ejes del avión. El flap es solo su borde de salida: es lo que hay que
 * ver bajar.
 */
function avion(): { raiz: Group; derecha: Lado; izquierda: Lado } {
  const raiz = new Group();
  raiz.scale.setScalar(1.3);
  const nodo = new Group();
  nodo.name = "avion";
  nodo.rotation.x = Math.PI / 2;
  raiz.add(nodo);
  raiz.updateWorldMatrix(true, true);
  // Una bisagra en flecha, como la de un reactor: hacia fuera va hacia atrás
  // y un poco hacia arriba. Y un carril que mira un pelo hacia abajo.
  const eje = new Vector3(1, 0.05, 0.4).normalize();
  const carril = new Vector3(0, -0.12, 1).normalize();
  const hacer = (s: 1 | -1, lado: string): Lado => {
    const vacio = new Object3D();
    vacio.name = `flap-dentro-${lado}`;
    vacio.userData = {
      bisagra: [2 * s, -1, 1],
      // Un eje es un vector axial: al reflejarlo en x cambian la y y la z.
      eje: [eje.x, eje.y * s, eje.z * s],
      // Y el carril, uno normal: cambia la x.
      carril: [carril.x * s, carril.y, carril.z],
      muescas: MUESCAS,
      recorrido: RECORRIDO,
    };
    nodo.add(vacio);
    const borde = new Mesh(new BoxGeometry(0.1, 0.02, 0.02));
    borde.name = `flap-dentro-${lado}-piel`;
    raiz.updateWorldMatrix(true, true);
    // Un metro por detrás de la bisagra, en los ejes del avión.
    borde.position.copy(vacio.worldToLocal(raiz.localToWorld(new Vector3(2 * s, -1, 2))));
    vacio.add(borde);
    const tapas = new Object3D();
    tapas.name = `flap-dentro-${lado}-tapas`;
    vacio.add(tapas);
    const hueco = new Object3D();
    hueco.name = `hueco-flap-dentro-${lado}`;
    nodo.add(hueco);
    return { vacio, borde, tapas, hueco };
  };
  const derecha = hacer(1, "derecha");
  const izquierda = hacer(-1, "izquierda");
  raiz.updateWorldMatrix(true, true);
  return { raiz, derecha, izquierda };
}

/** Dónde está algo, en los ejes del avión. */
function dondeEsta(o: Object3D, raiz: Object3D): Vector3 {
  raiz.updateWorldMatrix(true, true);
  return raiz.worldToLocal(o.getWorldPosition(new Vector3()));
}

describe("los flaps que se mueven", () => {
  it("se reconocen por su nombre, que es un contrato con Blender", () => {
    expect(FLAP.test("flap-dentro-derecha")).toBe(true);
    expect(FLAP.test("bisagra-principal-derecha")).toBe(false);
    expect(FLAP.test("ala")).toBe(false);
  });

  it("un avión sin flaps sueltos no rompe nada: vuela igual", () => {
    const raiz = new Group();
    const ala = new Mesh(new BoxGeometry(1, 1, 1));
    ala.name = "ala";
    raiz.add(ala);
    // Y un nodo que se llama como un flap pero no trae con qué moverse.
    const suelto = new Object3D();
    suelto.name = "flap-sin-datos";
    raiz.add(suelto);
    expect(prepararFlaps(raiz)).toBe(null);
  });

  it("recogidos, cada pieza está exactamente donde la dejó el modelo", () => {
    const { raiz, derecha } = avion();
    const antes = derecha.vacio.matrix.clone();
    const posicion = derecha.vacio.position.clone();
    const flaps = prepararFlaps(raiz)!;
    expect(flaps.cuantos).toBe(2);
    flaps.poner(1);
    flaps.poner(0.4);
    flaps.poner(0);
    // No «parecido»: lo mismo, bit a bit, que es lo que hace que la junta no
    // deje ver ni un píxel.
    derecha.vacio.updateMatrix();
    expect(derecha.vacio.matrix.elements).toEqual(antes.elements);
    expect(derecha.vacio.position.equals(posicion)).toBe(true);
  });

  it("abajo del todo, el borde de salida baja sus grados y sale por su carril", () => {
    const { raiz, derecha } = avion();
    const flaps = prepararFlaps(raiz)!;
    flaps.poner(1);
    const ud = derecha.vacio.userData as {
      bisagra: number[];
      eje: number[];
      carril: number[];
    };
    const bisagra = new Vector3(...(ud.bisagra as [number, number, number]));
    const eje = new Vector3(...(ud.eje as [number, number, number]));
    const carril = new Vector3(...(ud.carril as [number, number, number]));
    const esperado = new Vector3(2, -1, 2)
      .sub(bisagra)
      .applyAxisAngle(eje, (30 * Math.PI) / 180)
      .add(bisagra)
      .addScaledVector(carril, 0.34);
    expect(dondeEsta(derecha.borde, raiz).distanceTo(esperado)).toBeLessThan(1e-9);
  });

  it("baja y va hacia atrás, no hacia un lado ni hacia arriba", () => {
    /*
     * El error que hizo ir el tren de espaldas era de marco: el nodo `avion`
     * va girado y la «y» de la pieza era la z del avión. Aquí se mira en los
     * ejes del avión, con ese giro puesto y con la escala de la ficha.
     */
    const { raiz, derecha } = avion();
    const flaps = prepararFlaps(raiz)!;
    const recogido = dondeEsta(derecha.borde, raiz);
    flaps.poner(1);
    const fuera = dondeEsta(derecha.borde, raiz);
    expect(fuera.y).toBeLessThan(recogido.y - 0.4);
    expect(fuera.z).toBeGreaterThan(recogido.z);
    expect(Math.abs(fuera.x - recogido.x)).toBeLessThan(0.4);
  });

  it("en cada muesca, los grados de su muesca", () => {
    const { raiz, derecha } = avion();
    const flaps = prepararFlaps(raiz)!;
    const ud = derecha.vacio.userData as { bisagra: number[]; eje: number[]; carril: number[] };
    const bisagra = new Vector3(...(ud.bisagra as [number, number, number]));
    const eje = new Vector3(...(ud.eje as [number, number, number]));
    const carril = new Vector3(...(ud.carril as [number, number, number]));
    const brazo = new Vector3(2, -1, 2).sub(bisagra);
    // Lo que se mide es el ángulo en el plano perpendicular a la bisagra.
    const plano = (v: Vector3) => v.clone().projectOnPlane(eje).normalize();
    DETENTES.forEach((d, i) => {
      flaps.poner(d);
      const movida = bisagra.clone().addScaledVector(carril, RECORRIDO[i]!);
      const ahora = dondeEsta(derecha.borde, raiz).sub(movida);
      const grados = (plano(brazo).angleTo(plano(ahora)) * 180) / Math.PI;
      expect(grados).toBeCloseTo(MUESCAS[i]!, 6);
      expect(ahora.length()).toBeCloseTo(brazo.length(), 9);
    });
  });

  it("sin saltos: un paso pequeño de la palanca es un paso pequeño en el ala", () => {
    const { raiz, derecha } = avion();
    const flaps = prepararFlaps(raiz)!;
    flaps.poner(0);
    let antes = dondeEsta(derecha.borde, raiz);
    for (let i = 1; i <= 300; i++) {
      flaps.poner(i / 300);
      const ahora = dondeEsta(derecha.borde, raiz);
      expect(ahora.distanceTo(antes)).toBeLessThan(0.02);
      antes = ahora;
    }
  });

  it("los dos lados bajan igual: uno es el reflejo del otro", () => {
    const { raiz, derecha, izquierda } = avion();
    const flaps = prepararFlaps(raiz)!;
    for (const d of [0, 0.1, 1 / 3, 0.5, 2 / 3, 0.9, 1]) {
      flaps.poner(d);
      const a = dondeEsta(derecha.borde, raiz);
      const b = dondeEsta(izquierda.borde, raiz);
      expect(b.x).toBeCloseTo(-a.x, 9);
      expect(b.y).toBeCloseTo(a.y, 9);
      expect(b.z).toBeCloseTo(a.z, 9);
    }
  });

  it("las tapas y el hueco solo se dibujan con el flap fuera", () => {
    const { raiz, derecha } = avion();
    const flaps = prepararFlaps(raiz)!;
    // Al prepararlos ya se apagan: el modelo llega recogido.
    expect(derecha.tapas.visible).toBe(false);
    expect(derecha.hueco.visible).toBe(false);
    flaps.poner(0.01);
    expect(derecha.tapas.visible).toBe(true);
    expect(derecha.hueco.visible).toBe(true);
    flaps.poner(0);
    expect(derecha.tapas.visible).toBe(false);
    expect(derecha.hueco.visible).toBe(false);
    // La piel, en cambio, siempre: es el ala.
    expect(derecha.borde.visible).toBe(true);
  });
});
