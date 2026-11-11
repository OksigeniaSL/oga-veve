/**
 * Los puntos de la tarjeta, medidos en cada modelo que carga el juego.
 *
 * Es un contrato entre tres sitios: la ficha del avión dice qué lleva —flaps,
 * aerofrenos, tren que se guarda—, el guion de Blender pone las piezas con su
 * nombre y `puntos-del-avion.ts` las encuentra. Si un día se separan, la
 * tarjeta enseñaría un punto de flaps en un avión sin flaps, o ninguno donde
 * los hay. Esto lo caza sin abrir el juego.
 */
import { describe, expect, it } from "vitest";
import { Box3, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { montarModeloDeLaTarjeta } from "./modelo-de-la-tarjeta";
import { explicacionDe } from "../ui/explicaciones-del-avion";
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";
import { SUPER_PUMA_EN_EL_JUEGO } from "../flight/helicoptero-en-el-juego";
import { SUPER_PUMA } from "../flight/super-puma";

const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

async function escenaDe(id: string): Promise<Object3D> {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  return modelo.scene;
}

describe("los puntos de la tarjeta en cada modelo", () => {
  for (const a of AIRCRAFT) {
    it(`${a.id}: cada pieza que lleva tiene su punto, y ninguna que no lleva`, async () => {
      const raiz = await escenaDe(a.id);
      let antes = 0;
      raiz.traverse((o) => {
        if ((o as { isMesh?: boolean }).isMesh) antes += 1;
      });
      const m = montarModeloDeLaTarjeta(raiz, a);
      const piezas = m.puntos.map((p) => p.pieza);

      // Los mandos de todos y lo que todos llevan.
      for (const pieza of ["alerones", "profundidad", "timon", "motor", "tren", "luces"] as const)
        expect(piezas, pieza).toContain(pieza);
      // Y lo que no todos llevan, según su ficha.
      expect(piezas.includes("flaps")).toBe(a.llevaFlaps);
      expect(piezas.includes("aerofrenos")).toBe(a.aerofrenos !== null);
      // El pitot, menos en el biplano: ver `sitioDelPitot`.
      expect(piezas.includes("pitot")).toBe(a.id !== "jaz-25");
      // Ninguna dos veces.
      expect(new Set(piezas).size).toBe(piezas.length);

      // Encima del avión, no flotando lejos de él.
      m.grupo.updateWorldMatrix(true, true);
      const caja = new Box3().setFromObject(m.grupo).expandByScalar(0.6);
      for (const p of m.puntos) {
        expect(caja.containsPoint(p.donde), p.pieza).toBe(true);
        // Y del lado izquierdo, que es el que se refleja. Ver `PuntoDelAvion`.
        expect(p.donde.x, p.pieza).toBeLessThanOrEqual(0.01);
      }

      // Lo de dentro, escondido: menos mallas que dibujar.
      expect(m.mallas).toBeLessThan(antes);
    });
  }

  /*
   * Y cada punto tiene qué contar, en los dos idiomas: el globo y la voz.
   */
  it("cada punto de cada avión tiene su explicación escrita", () => {
    for (const a of AIRCRAFT)
      for (const pieza of [
        "alerones",
        "profundidad",
        "timon",
        "flaps",
        "aerofrenos",
        "pitot",
        "motor",
        "tren",
        "luces",
      ] as const) {
        const e = explicacionDe(pieza, a);
        expect(ES_PY[e.texto], e.id).toBeTruthy();
        expect(ES_PY[e.voz], e.id).toBeTruthy();
        expect(EN[e.texto], e.id).toBeTruthy();
        expect(EN[e.voz], e.id).toBeTruthy();
      }
  });

  it("cada avión explica su motor, no el de otro", () => {
    const motor = (id: string) => explicacionDe("motor", AIRCRAFT.find((a) => a.id === id)!).id;
    expect(motor("jaz-20")).toBe("avion.motor-piston");
    // El bimotor, con los suyos: seis cilindros con turbo y hélices al revés.
    expect(motor("jaz-40")).toBe("avion.motor-turbo");
    expect(motor("jaz-25")).toBe("avion.motor-radial");
    expect(motor("jaz-60")).toBe("avion.turbohelice");
    expect(motor("jaz-120")).toBe("avion.reactor");
    const tren = (id: string) => explicacionDe("tren", AIRCRAFT.find((a) => a.id === id)!).id;
    expect(tren("jaz-20")).toBe("avion.tren-fijo");
    expect(tren("jaz-90")).toBe("avion.tren");
  });

  /*
   * **La blanca, donde la lleva cada uno.** La tarjeta decía «blanca en la
   * cola» también en el JAZ 90, que la lleva en el borde de salida de cada
   * punta (MMEL de la FAA del ERJ-170/190); y en el JAZ 60, donde no se ha
   * podido confirmar, no dice en qué pieza.
   */
  it("cada avión cuenta su luz blanca donde la lleva, y ninguno donde no se sabe", () => {
    const luces = (id: string) => explicacionDe("luces", AIRCRAFT.find((a) => a.id === id)!);
    for (const id of ["jaz-20", "jaz-25", "jaz-40", "jaz-120"]) expect(luces(id).id, id).toBe("avion.luces");
    expect(luces("jaz-90").id).toBe("avion.luces-puntas");
    expect(ES_PY[luces("jaz-90").texto]).toMatch(/en cada punta/);
    expect(ES_PY[luces("jaz-90").texto]).not.toMatch(/cola/);
    expect(ES_PY[luces("jaz-90").voz]).toMatch(/en cada punta/);
    // El JAZ 60: «atrás», sin pieza, con la voz de siempre, que ya lo decía así.
    const sinConfirmar = luces("jaz-60");
    expect(sinConfirmar.id).toBe("avion.luces-atras");
    for (const k of [sinConfirmar.texto, sinConfirmar.voz]) {
      expect(ES_PY[k]).toMatch(/blanca atrás/);
      expect(ES_PY[k]).not.toMatch(/cola|cada punta/);
      expect(EN[k]).not.toMatch(/tail/);
    }
    expect(sinConfirmar.voz).toBe("tarjeta.voz.luces");
  });
});

/*
 * **El Super Puma, con sus piezas.** Hasta ahora su tarjeta solo llevaba el
 * pitot y las luces, porque lo que se buscaba eran piezas de avión. Ahora
 * lleva las suyas —el rotor, el plato y el rotor de cola—, y ninguna de avión:
 * ni timones, que en él son fijos. Y su tren, que se recoge, con lo que cuenta
 * un helicóptero de él.
 */
describe("los puntos de la tarjeta del helicóptero", () => {
  it("el rotor, el plato y el rotor de cola, cada uno sobre su pieza", async () => {
    const raiz = await escenaDe("super-puma");
    const m = montarModeloDeLaTarjeta(raiz, SUPER_PUMA_EN_EL_JUEGO);
    const de = (p: string) => m.puntos.find((x) => x.pieza === p);
    const piezas = m.puntos.map((p) => p.pieza).sort();
    // Las luces de navegación se ponen en la punta del ala, y él no tiene: sin punto.
    // El tren sí, que el suyo se recoge: ver `explicacionDe`.
    expect(piezas).toEqual(["pitot", "plato", "rotor", "rotor-de-cola", "tren"]);
    m.grupo.updateWorldMatrix(true, true);
    const caja = new Box3().setFromObject(m.grupo).expandByScalar(0.6);
    for (const p of m.puntos) expect(caja.containsPoint(p.donde), p.pieza).toBe(true);

    const rotor = de("rotor")!;
    const plato = de("plato")!;
    const cola = de("rotor-de-cola")!;
    // El rotor, arriba, en una pala y lejos del buje: a media pala son casi cuatro metros.
    expect(Math.hypot(rotor.donde.x, rotor.donde.z)).toBeGreaterThan(SUPER_PUMA.rotor.radio * 0.35);
    expect(rotor.donde.y).toBeGreaterThan(plato.donde.y);
    // El plato, debajo del buje y pegado al mástil: a menos de un metro del eje.
    expect(Math.hypot(plato.donde.x, plato.donde.z)).toBeLessThan(1);
    // El de cola, atrás —el morro va hacia la −Z— y a la derecha, sin espejo.
    expect(cola.donde.z).toBeGreaterThan(SUPER_PUMA.cola.brazo * 0.8);
    expect(cola.donde.x).toBeGreaterThan(0.2);
    expect(cola.espejo).toBe(false);
  });

  it("y cada una con su explicación, en los dos idiomas, con las cifras de su ficha", () => {
    const a = SUPER_PUMA_EN_EL_JUEGO;
    for (const pieza of ["rotor", "plato", "rotor-de-cola"] as const) {
      const e = explicacionDe(pieza, a);
      expect(e.id).toBe(`avion.${pieza}`);
      for (const k of [e.texto, e.voz, e.corta]) {
        expect(ES_PY[k], k).toBeTruthy();
        expect(EN[k], k).toBeTruthy();
      }
    }
    // Las cifras que se leen son las de `flight/super-puma.ts`, no otras.
    const rotor = ES_PY["tarjeta.rotor"];
    const diametro = (SUPER_PUMA.rotor.radio * 2).toLocaleString("es-PY", { maximumFractionDigits: 1 });
    const vueltas = String(Math.round((SUPER_PUMA.rotor.vueltas * 60) / (2 * Math.PI)));
    expect(rotor).toContain(`${diametro} metros`);
    expect(rotor).toContain(`${vueltas} vueltas por minuto`);
    expect(SUPER_PUMA.rotor.palas).toBe(4);
    expect(rotor).toMatch(/cuatro palas/);
    expect(SUPER_PUMA.cola.palas).toBe(5);
    expect(ES_PY["tarjeta.rotorDeCola"]).toMatch(/cinco palas/);
    expect(EN["tarjeta.rotor"]).toContain(`${(SUPER_PUMA.rotor.radio * 2).toFixed(1)} metres`);
  });
});
