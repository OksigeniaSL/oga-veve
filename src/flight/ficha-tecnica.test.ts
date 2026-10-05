/**
 * La ficha técnica de la tarjeta: que salga de los datos del tipo, que no se
 * invente nada y que diga lo mismo que el avión que se dibuja.
 */
import { describe, expect, it } from "vitest";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "./aircraft";
import { DE_SU_CLASE, fichaTecnicaDe } from "./ficha-tecnica";
import { datosDeLaFicha } from "../ui/tarjeta-del-avion";
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";

/* El fichero, leído con el `fs` de Node pedido en marcha, como en `aerofrenos.test.ts`. */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string): Uint8Array;
};

async function largoDelModelo(id: string, envergadura: number): Promise<number> {
  const b = fs.readFileSync(`public/assets/aeronaves/${id}.glb`);
  const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const modelo = await new GLTFLoader().parseAsync(datos as ArrayBuffer, "");
  modelo.scene.updateWorldMatrix(true, true);
  const t = new Box3().setFromObject(modelo.scene).getSize(new Vector3());
  // A la escala del juego, que sale de la envergadura. Ver `colocarModelo`.
  return (t.z * envergadura) / t.x;
}

describe("la ficha técnica de cada avión", () => {
  for (const a of AIRCRAFT) {
    describe(a.id, () => {
      const f = fichaTecnicaDe(a);

      /*
       * **Lo que vuela sale de su ficha de vuelo, no de una copia.** Si un día
       * cambia la envergadura o la Vref en `aircraft.ts`, la tarjeta dice la
       * nueva sin que nadie se acuerde de tocarla.
       */
      it("sale de los datos del tipo", () => {
        expect(f.envergadura).toBe(a.wingSpan);
        expect(f.crucero).toBe(a.cruiseSpeed);
        expect(f.vref).toBe(a.approachSpeed);
        expect(f.motores.cuantos).toBe(a.motores);
      });

      it("tiene su avión de referencia anotado", () => {
        expect(DE_SU_CLASE[a.id]?.referencia).toBeTruthy();
      });

      /*
       * **Nadie vuela por encima de su peso máximo.** La masa del modelo de
       * vuelo y el peso máximo de su clase son de la misma ficha de tipo: si
       * la primera pasara del segundo, uno de los dos estaría mal.
       */
      it("no vuela más pesado que su peso máximo", () => {
        if (f.mtow !== null) expect(a.mass).toBeLessThanOrEqual(f.mtow);
      });

      /*
       * **Y el largo de la ficha es el del avión que se ve**, con un doce por
       * ciento de margen: el modelo es de su clase, no un calco. El JAZ 120 es
       * el que más se aparta —el 747 sin joroba sale un nueve por ciento más
       * corto— y el biplano, que se dibuja un cuarto más largo que su Ag Cat,
       * no lleva largo hasta que se arregle. Ver `DE_SU_CLASE`.
       */
      it("dice el mismo largo que su modelo", async () => {
        if (f.largo === null) return;
        const dibujado = await largoDelModelo(a.id, a.wingSpan);
        expect(Math.abs(dibujado - f.largo) / f.largo).toBeLessThan(0.12);
      });

      /*
       * Los rótulos, en inglés aeronáutico y en mayúsculas: no se traducen.
       * Las glosas, sí, y en los dos idiomas.
       */
      it("rotula en inglés de cabina y glosa en los dos idiomas", () => {
        const filas = datosDeLaFicha(f);
        expect(filas.length).toBeGreaterThanOrEqual(5);
        for (const d of filas) {
          expect(d.rotulo).toMatch(/^[A-Z]+$/);
          expect(ES_PY[d.glosa]).toBeTruthy();
          expect(EN[d.glosa]).toBeTruthy();
        }
      });
    });
  }

  /*
   * Lo que no se ha leído en una fuente no sale: el biplano no tiene techo
   * anotado y su ficha no lo enseña, en vez de enseñar uno inventado.
   */
  it("lo que no se sabe no sale en la tarjeta", () => {
    const biplano = AIRCRAFT.find((a) => a.id === "jaz-25")!;
    const filas = datosDeLaFicha(fichaTecnicaDe(biplano)).map((d) => d.rotulo);
    expect(filas).not.toContain("CEILING");
    expect(filas).not.toContain("LENGTH");
  });
});
