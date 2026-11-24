/**
 * **El empuje, sobre pavimento** (H81, ADR 0025): ninguna rueda del avión que saca el tractor
 * pisa fuera, ni empujando ni al acabar, y lo que se deduce de la carta de puestos del AIP es
 * plataforma y no se come la hierba que la carta dibuja. El barrido entero lo cuenta
 * `empuje-hasta-la-calle.test.ts`.
 *
 * Por la 36 de Barajas el plan sacaba al JAZ 90 del 532 y el empuje acababa en la hierba:
 * OpenStreetMap dibuja la plataforma de la T4 a tiras, y la envolvente que la cose a su calle
 * (`plataformas-cosidas.ts`) dejaba un triángulo sin coser. La carta (AD 2-LEMD PDC 2.1) la
 * dibuja seguida.
 */
import { describe, expect, it } from "vitest";
import { Box3, type Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { enElPavimentoDe, type Aerodrome, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conPlataformasCosidas } from "./plataformas-cosidas";
import { aproarDe, cumpleElAproar, delAipEn } from "./puestos-del-aip";
import { edificiosDePasarela, empujeDesdeElPuesto, entradaDelPuesto, saleConRemolque } from "./remolque";
import { pavimentoDibujado } from "./rodaje";
import { conLaRuedaEn, mediaViaDe, morroDe } from "./rueda-de-morro";
import { empujaSobrePavimento, fueraDelPavimento, ruedasEn, ruedasFuera } from "./ruedas-en-el-empuje";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";

/* El `fs` de Node pedido en marcha, como en `apoyo.test.ts`. */
const fs = (
  globalThis as unknown as { process: { getBuiltinModule(nombre: string): unknown } }
).process.getBuiltinModule("node:fs") as { readFileSync(ruta: string): Uint8Array };

const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
const deLinea = AIRCRAFT.filter((a) => vaALaPasarela(a));
const barajas = await conSuAerodromo(SCENARIOS.find((e) => e.id === "barajas")!);
const cabeceras = (c: Scenario): number[] => [c.runway.heading, (c.runway.heading + 180) % 360];

/** Lo que dista un punto de un segmento, m. */
function alSegmento(p: Punto, a: Punto, b: Punto): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]);
}

/** El empuje de un puesto —o del que elige el plan— como lo hace el juego; `null` si no sale empujado. */
function empujeDe(campo: Scenario, rumbo: number, avion: (typeof AIRCRAFT)[number], puesto: Punto | null) {
  const aero = campo.aerodrome!;
  const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, avion);
  plan.deContacto = true;
  if (!(puesto ? plan.reiniciarDesde(puesto) : plan.reiniciar())) return null;
  const [x, z] = plan.arranque()!;
  const edificios = edificiosDePasarela(aero);
  const morro = morroDe(avion);
  if (!saleConRemolque(vaALaPasarela(avion), x, z, edificios, morro, delAipEn(aero, x, z), entradaDelPuesto(aero, x, z))) return null;
  const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
  const enElSuyo = empujeDesdeElPuesto({ x, z }, edificios, raya, entradaDelPuesto(aero, x, z), avion.batalla, (r) =>
    conLaRuedaEn({ x, z }, r, morro),
  );
  return enElSuyo?.empuje ? { empuje: enElSuyo.empuje, plan, en: [x, -z] as Punto } : null;
}

describe("las ruedas del que sale empujado", () => {
  it("la de morro va delante y las principales a una batalla por detrás, cada una a su lado", () => {
    const [morro, derecha, izquierda] = ruedasEn(jaz90, { x: 100, z: 50, rumbo: 0 });
    // Mirando al norte, delante es −z y la derecha es +x.
    expect(morro!.x).toBeCloseTo(100, 6);
    expect(morro!.z).toBeCloseTo(50 - morroDe(jaz90).rueda, 6);
    for (const r of [derecha!, izquierda!]) expect(r.z - morro!.z).toBeCloseTo(jaz90.batalla, 6);
    expect(derecha!.x).toBeCloseTo(102.55, 6);
    expect(izquierda!.x).toBeCloseTo(97.45, 6);
  });

  it("la media vía es la del dibujo: la pata de fuera de cada uno", async () => {
    for (const a of deLinea) {
      const b = fs.readFileSync(`public/assets/aeronaves/${a.id}.glb`);
      const datos = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
      const raiz = (await new GLTFLoader().parseAsync(datos as ArrayBuffer, "")).scene;
      raiz.updateWorldMatrix(true, true);
      let deFuera = 0;
      raiz.traverse((o: Object3D) => {
        if (!/^rueda-/.test(o.name) || /morro/.test(o.name)) return;
        const caja = new Box3().setFromObject(o);
        if (caja.isEmpty()) return;
        deFuera = Math.max(deFuera, Math.abs(caja.max.x), Math.abs(caja.min.x));
      });
      // La cara de fuera del neumático de fuera: del centro de la pata, media pareja y medio neumático.
      expect(deFuera - mediaViaDe(a), `${a.id}: ${deFuera.toFixed(2)} por fuera`).toBeGreaterThan(0);
      expect(deFuera - mediaViaDe(a), `${a.id}: ${deFuera.toFixed(2)} por fuera`).toBeLessThan(1.2);
    }
  });

  it("cuenta los metros con alguna rueda fuera, las que quedan al acabar, y perdona medio metro de borde", () => {
    // Pavimento al sur de la raya y = 0 de la ficha: z > 0 en el mundo.
    const pavimento = (p: Punto) => p[1] < 0;
    const poses = [...Array(41).keys()].map((k) => ({ x: k, z: 10, rumbo: Math.PI / 2 }));
    expect(fueraDelPavimento(jaz90, poses, pavimento)).toEqual({ metros: 0, alAcabar: 0 });
    expect(empujaSobrePavimento(jaz90, poses, pavimento)).toBe(true);
    // Con la rueda izquierda, la del norte, un metro al otro lado del borde.
    const porElBorde = poses.map((q) => ({ ...q, z: 1.55 }));
    expect(ruedasFuera(jaz90, porElBorde[0]!, pavimento)).toBe(1);
    expect(fueraDelPavimento(jaz90, porElBorde, pavimento).metros).toBeCloseTo(40, 6);
    expect(fueraDelPavimento(jaz90, porElBorde, pavimento).alAcabar).toBe(1);
    expect(empujaSobrePavimento(jaz90, porElBorde, pavimento)).toBe(false);
    // Y a treinta centímetros, en el borde.
    expect(empujaSobrePavimento(jaz90, poses.map((q) => ({ ...q, z: 2.25 })), pavimento)).toBe(true);
  });
});

describe("el empuje que elige el plan va entero sobre pavimento", async () => {
  const vistos = new Set<string>();
  const campos: Scenario[] = [];
  for (const e of SCENARIOS) {
    const s = await conSuAerodromo(e);
    if (!s.aerodrome?.pasarelas?.hay || vistos.has(s.aerodrome.id)) continue;
    vistos.add(s.aerodrome.id);
    campos.push(s);
  }
  it.each(campos.map((c) => [c.aerodrome!.id, c] as const))("%s, con los tres y por las dos cabeceras", (_id, campo) => {
    const pavimento = pavimentoDibujado(campo.aerodrome!);
    for (const rumbo of cabeceras(campo))
      for (const avion of deLinea) {
        const e = empujeDe(campo, rumbo, avion, null);
        if (!e) continue;
        expect(
          fueraDelPavimento(avion, e.empuje.poses, pavimento),
          `${campo.aerodrome!.id} · ${avion.id} · ${rumbo.toFixed(0)}° · del ${e.en.join(",")}`,
        ).toEqual({ metros: 0, alAcabar: 0 });
      }
  });
});

describe("la plataforma de la T4 de Barajas", () => {
  const aero = barajas.aerodrome!;
  const pavimento = enElPavimentoDe(aero);

  it("del 532, el de la captura, el empuje va sobre pavimento con los tres y por las dos cabeceras", () => {
    const p = aero.parkingPositions!.find((q) => q.ref === "532")!;
    for (const rumbo of cabeceras(barajas))
      for (const avion of deLinea) {
        const e = empujeDe(barajas, rumbo, avion, p.xy);
        expect(e, `${avion.id} por la ${rumbo.toFixed(0)}`).not.toBeNull();
        expect(fueraDelPavimento(avion, e!.empuje.poses, pavimentoDibujado(aero))).toEqual({ metros: 0, alAcabar: 0 });
      }
  });

  /*
   * Del 500, el 501 y el 502, con la plataforma abierta, el enganche más cercano era la curva de la
   * EA-5 a la GATE-12, casi por la tangente, y el tractor seguía de espaldas por ella hasta la
   * isleta. Se llega atravesado a la EA-5 (`enganchesAtravesados`) y se tuerce en ella.
   */
  it("y del 500, el 501 y el 502, en la EA-5 con el morro al S y sin meterse en la isleta de la GATE-12", () => {
    for (const ref of ["500", "501", "502"])
      for (const rumbo of cabeceras(barajas))
        for (const avion of deLinea) {
          // El 501 por la 18, por la GATE-12 como antes: la raya alisada de esa ruta no tuerce en la EA-5.
          if (ref === "501" && rumbo > 90 && rumbo < 270) continue;
          const p = aero.parkingPositions!.find((q) => q.ref === ref)!;
          const e = empujeDe(barajas, rumbo, avion, p.xy)!;
          const nombre = `el ${ref}, ${avion.id}, ${rumbo.toFixed(0)}°`;
          expect(fueraDelPavimento(avion, e.empuje.poses, pavimentoDibujado(aero)), nombre).toEqual({ metros: 0, alAcabar: 0 });
          expect(cumpleElAproar(e.empuje.poses.at(-1)!.rumbo, aproarDe(p.aip, rumbo)!), nombre).toBe(true);
          expect(e.empuje.largo, nombre).toBeLessThan(160);
        }
  });

  it.each([
    ["entre el 532 y la EA-6, donde era hierba", [215, 502]],
    ["entre la plataforma de la T4S y la N-10", [400, 725]],
    ["entre la T4S y la M-23", [400, -510]],
    ["entre la EB-6 y la EC-6", [610, 400]],
    ["entre la DI-4 y la D-4", [-1385, 100]],
    ["entre los puestos de la T4 y la DI-3", [-1437, -400]],
    ["entre la J-6 y la JI-6", [-1720, -780]],
    ["entre el T25 y la I-9", [225, -2400]],
    ["entre el T10 y la I-8", [430, -3150]],
  ] as [string, Punto][])("es plataforma %s", (_donde, p) => expect(pavimento(p)).toBe(true));

  it.each([
    ["entre la J-4 y la H-4", [-1275, -873]],
    ["entre la U-4 y la W-4", [-1275, 390]],
    ["al sur de los PE, junto a la W-4", [-1235, 478]],
    ["entre la EA-6 y la N-6", [130, 560]],
    ["entre la NY-11 y la N-11", [610, 715]],
    ["entre la NY-12 y la N-12", [730, 715]],
    ["entre la M-27 y la A-27", [865, -300]],
    ["en el recinto de la torre norte", [200, -240]],
    ["entre la I-8 y la M-8", [500, -3150]],
  ] as [string, Punto][])("y sigue siendo hierba la que la carta dibuja %s", (_donde, p) => expect(pavimento(p)).toBe(false));

  it("y la de Los Rodeos llega a la R, y la de Tenerife Sur va seguida del H37 al H43", async () => {
    const de = async (id: string) =>
      enElPavimentoDe((await conSuAerodromo(SCENARIOS.find((e) => e.aerodrome?.id === id)!)).aerodrome!);
    const gcxo = await de("GCXO");
    // Entre el borde de la plataforma y la R, por detrás del 12, del 22 y del 24.
    for (const p of [[-318, 276], [-575, 372], [-728, 426]] as Punto[]) expect(gcxo(p), p.join()).toBe(true);
    // Y al otro lado de la R, hacia la pista, sigue la hierba.
    expect(gcxo([-400, 250])).toBe(false);
    const gcts = await de("GCTS");
    expect(gcts([-875, 110])).toBe(true);
    expect(gcts([-910, -60])).toBe(false);
  });

  it("cada plataforma deducida dice de qué carta, toca una calle y está entre las del campo", async () => {
    const campos = await Promise.all(SCENARIOS.map(conSuAerodromo));
    const conDeducidas = new Map(
      campos.filter((c) => c.aerodrome?.plataformasDeducidas?.length).map((c) => [c.aerodrome!.id, c.aerodrome!]),
    );
    expect([...conDeducidas.keys()].sort()).toEqual(["GCTS", "GCXO", "LEMD", "SGAS"]);
    for (const [id, campo] of conDeducidas)
      for (const d of campo.plataformasDeducidas!) {
        // De la carta, o, el abocinado de la L de Pettirossi, sin ella, y lo dice.
        const deDonde = id === "SGAS" ? "Anexo 14 .*sin carta que lo dibuje" : `AIP España AD 2-${id} PDC [12]\\.1 \\(WEF `;
        expect(d.fuente, d.nombre).toMatch(new RegExp(`^Deducida: .*${deDonde}`));
        const alEje = Math.min(
          ...campo.taxiways.flatMap((t) =>
            t.path.slice(1).flatMap((b, i) => d.polygon.map((v) => alSegmento(v, t.path[i]!, b))),
          ),
        );
        expect(alEje, `${id} ${d.nombre}: a su calle`).toBeLessThan(11.5);
        expect(campo.aprons.some((a) => a.polygon === d.polygon), d.nombre).toBe(true);
      }
  });

  it("y las seis plataformas de la T1, la T2 y la T3 que OpenStreetMap dibuja como relación están", () => {
    // Un puesto de cada una: R-1, R-2, R-4, R-5, R-6 y R-7.
    for (const ref of ["T24", "T16", "40", "67", "145", "213"]) {
      const p = aero.parkingPositions!.find((q) => q.ref === ref)!;
      expect(pavimento(p.xy), ref).toBe(true);
    }
  });

  it("y sin la plataforma, el plan no saca al avión por la hierba: con el 532 y el 545, elige el 545", () => {
    /*
     * La ficha de antes: sin las deducidas, con el triángulo sin coser entre el 532 y la EA-6. Del 532
     * se rueda menos, y era del que salía; del 545, al otro lado del dique, se sale sobre hormigón.
     */
    const { plataformasDeducidas: _fuera, ...resto } = aero;
    const puestos = aero.parkingPositions!.filter((q) => q.ref === "532" || q.ref === "545");
    const deOsm: Aerodrome = { ...resto, aprons: aero.aprons.slice(0, 42), parkingPositions: puestos };
    const antes: Scenario = { ...barajas, aerodrome: conPlataformasCosidas(deOsm) };
    const pav = pavimentoDibujado(antes.aerodrome!);
    const xyDe = (ref: string) => puestos.find((q) => q.ref === ref)!.xy;
    const rumbo = cabeceras(antes).find((r) => r > 270 || r < 90)!;
    // Del 532 no hay ya empuje que valga: el de antes iba treinta metros por la hierba.
    expect(empujeDe(antes, rumbo, jaz90, xyDe("532"))).toBeNull();
    const elegido = empujeDe(antes, rumbo, jaz90, null)!;
    expect(elegido.en).toEqual(xyDe("545"));
    expect(fueraDelPavimento(jaz90, elegido.empuje.poses, pav)).toEqual({ metros: 0, alAcabar: 0 });
    // Y con la plataforma entera, del 532, sobre pavimento.
    const ahora: Scenario = { ...barajas, aerodrome: { ...aero, parkingPositions: puestos } };
    const deAhora = empujeDe(ahora, rumbo, jaz90, null)!;
    expect(deAhora.en).toEqual(xyDe("532"));
    expect(fueraDelPavimento(jaz90, deAhora.empuje.poses, pavimentoDibujado(ahora.aerodrome!))).toEqual({ metros: 0, alAcabar: 0 });
  });
});
