/**
 * **La vuelta a la raya**, sin volar: cuándo se ha quedado el avión parado en la hierba,
 * cuándo vuelve el aviso, a qué punto de la raya lo lleva el tractor y por dónde, en
 * varios campos de verdad. Ver `vuelta-a-la-raya.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  destinoEnLaRaya,
  elSitioDe,
  enElCampo,
  hayTractor,
  llegadaDelTractor,
  PARADO,
  rayaQueQuedaPorDelante,
  remolqueALaRaya,
  SE_MOVIO,
  UN_RATO,
  VigiaDeLaHierba,
  type ElSitio,
  type FotogramaDeLaHierba,
} from "./vuelta-a-la-raya";
import { diferencia, Remolque, rumboEntre, vector, type Pose, type PuntoXZ } from "./remolque";
import { conSuAerodromo, scenarioById } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";

const GRADO = Math.PI / 180;
const DT = 0.05;

/** Parado en el campo, con raya, en `x`. */
const enLaHierba = (x = 0, velocidad = 0): FotogramaDeLaHierba => ({
  enElSuelo: true,
  velocidad,
  enElCampo: true,
  conRaya: true,
  x,
  z: 0,
});

/** Pasa `segundos` con el mismo fotograma y cuenta cuántas veces avisa. */
function durante(v: VigiaDeLaHierba, segundos: number, f: FotogramaDeLaHierba): { avisos: number; ofrecido: boolean } {
  let avisos = 0;
  let ofrecido = false;
  for (let t = 0; t < segundos; t += DT) {
    const r = v.paso(DT, f);
    if (r.avisa) avisos++;
    ofrecido = r.ofrecido;
  }
  return { avisos, ofrecido };
}

describe("parado fuera de la raya", () => {
  it("tras un rato parado en la hierba, avisa una vez y el tractor se queda ofrecido", () => {
    const v = new VigiaDeLaHierba();
    expect(durante(v, UN_RATO - 1, enLaHierba())).toEqual({ avisos: 0, ofrecido: false });
    expect(durante(v, 2, enLaHierba())).toEqual({ avisos: 1, ofrecido: true });
    // Cinco minutos más en el mismo sitio: la tarjeta sigue, y la voz no vuelve por reloj.
    expect(durante(v, 300, enLaHierba())).toEqual({ avisos: 0, ofrecido: true });
  });

  it("en cuanto se mueve se retira: está volviendo solo", () => {
    const v = new VigiaDeLaHierba();
    durante(v, UN_RATO + 1, enLaHierba());
    expect(v.paso(DT, enLaHierba(0.1, PARADO + 0.5)).ofrecido).toBe(false);
  });

  it("moverse un poco y volver a pararse lo vuelve a ofrecer, pero sin decirlo otra vez", () => {
    const v = new VigiaDeLaHierba();
    durante(v, UN_RATO + 1, enLaHierba());
    durante(v, 1, enLaHierba(SE_MOVIO - 2, 1));
    expect(durante(v, UN_RATO + 1, enLaHierba(SE_MOVIO - 2))).toEqual({ avisos: 0, ofrecido: true });
  });

  it("lo rearma haberse movido, o haber vuelto a la raya, y volver a quedarse parado fuera", () => {
    const v = new VigiaDeLaHierba();
    durante(v, UN_RATO + 1, enLaHierba());
    // Se fue diez metros por la hierba y se volvió a parar.
    durante(v, 2, enLaHierba(10, 3));
    expect(durante(v, UN_RATO + 1, enLaHierba(SE_MOVIO + 5)).avisos).toBe(1);
    // Volvió al asfalto un momento y se volvió a salir, en el mismo sitio.
    durante(v, 1, { ...enLaHierba(SE_MOVIO + 5), enElCampo: false });
    expect(durante(v, UN_RATO + 1, enLaHierba(SE_MOVIO + 5)).avisos).toBe(1);
  });

  it("y nunca sin raya, en el aire ni sobre el pavimento", () => {
    for (const f of [
      { ...enLaHierba(), conRaya: false },
      { ...enLaHierba(), enElSuelo: false },
      { ...enLaHierba(), enElCampo: false },
    ]) {
      const v = new VigiaDeLaHierba();
      expect(durante(v, 60, f)).toEqual({ avisos: 0, ofrecido: false });
    }
  });
});

describe("dónde hay tractor", () => {
  it("con torre o AFIS sí; en la granja y en Ayolas, sin nadie, no", async () => {
    for (const [id, hay] of [
      ["tenerife-norte", true],
      ["la-gomera", true],
      ["pettirossi", true],
      ["yvytu-rape", false],
      ["ayolas", false],
    ] as const) {
      const s = await conSuAerodromo(scenarioById(id));
      expect(hayTractor(s.aerodrome), id).toBe(hay);
    }
  });
});

/** Una raya recta por el eje x, de −200 a 200, y un sitio todo pisable a menos de cinco metros de ella. */
const RECTA: PuntoXZ[] = [
  { x: -200, z: 0 },
  { x: 200, z: 0 },
];
const sitioSencillo = (ocupado: (x: number, z: number) => boolean = () => false): ElSitio => ({
  pisable: (_x, z) => Math.abs(z) < 5,
  libre: (x, z) => !ocupado(x, z),
});

describe("a qué punto de la raya", () => {
  it("al más cercano, si se llega en recta", () => {
    const d = destinoEnLaRaya({ x: 10, z: 40 }, RECTA, sitioSencillo())!;
    expect(Math.abs(d.punto.x - 10)).toBeLessThanOrEqual(2);
    expect(d.punto.z).toBeCloseTo(0);
    // Y mirando hacia donde sigue la raya.
    expect(Math.abs(diferencia(d.rumbo, 90 * GRADO))).toBeLessThan(1 * GRADO);
  });

  it("sin atravesar un edificio: lo rodea por donde la recta va libre", () => {
    // Un hangar entre el avión y el punto más cercano, de x −15 a 35 y z 10 a 25.
    const hangar = (x: number, z: number) => x > -15 && x < 35 && z > 10 && z < 25;
    const d = destinoEnLaRaya({ x: 10, z: 40 }, RECTA, sitioSencillo(hangar))!;
    expect(d).not.toBeNull();
    const n = 40;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      expect(hangar(10 + (d.punto.x - 10) * t, 40 + (d.punto.z - 40) * t)).toBe(false);
    }
    expect(Math.abs(d.punto.x - 10)).toBeGreaterThan(20);
  });

  it("y no encima de la doble raya del final: esos metros los rueda quien juega", () => {
    // Parado en la hierba junto al final de la raya, que es el punto de espera.
    const alFinal = rayaQueQuedaPorDelante(11.5);
    const d = destinoEnLaRaya({ x: 195, z: 40 }, RECTA, sitioSencillo(), 6, alFinal)!;
    expect(200 - d.punto.x).toBeGreaterThanOrEqual(alFinal - 2);
    const e = remolqueALaRaya({ x: 195, z: 40, rumbo: Math.PI }, RECTA, d, 11.5)!;
    expect(200 - e.poses.at(-1)!.x).toBeGreaterThan(10);
  });

  it("y si no hay por dónde, no hay tractor", () => {
    expect(destinoEnLaRaya({ x: 10, z: 40 }, RECTA, sitioSencillo(() => true))).toBeNull();
    expect(destinoEnLaRaya({ x: 10, z: 400 }, RECTA, sitioSencillo())).toBeNull();
  });
});

/** Lo que se mueve el avión hacia su morro, de media: uno es ir de frente del todo. */
function deFrente(poses: readonly Pose[]): number {
  let suma = 0;
  let n = 0;
  for (let i = 1; i < poses.length; i++) {
    const a = poses[i - 1]!;
    const b = poses[i]!;
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    if (d < 1e-6) continue;
    const m = vector(a.rumbo);
    suma += ((b.x - a.x) * m.x + (b.z - a.z) * m.z) / d;
    n++;
  }
  return n ? suma / n : 0;
}

/** Lo que queda `p` de la raya, m. */
function aLaRaya(p: PuntoXZ, raya: readonly PuntoXZ[]): number {
  let lejos = Infinity;
  for (let k = 1; k < raya.length; k++) {
    const a = raya[k - 1]!;
    const b = raya[k]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
    lejos = Math.min(lejos, Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z));
  }
  return lejos;
}

describe("el remolque hasta la raya", () => {
  it("hacia delante, y si mira al otro lado da la vuelta con la rueda de morro, sin derrapar", () => {
    for (const rumbo of [0, 90 * GRADO, 180 * GRADO, -120 * GRADO]) {
      const desde = { x: 10, z: 40, rumbo };
      const d = destinoEnLaRaya(desde, RECTA, sitioSencillo())!;
      const e = remolqueALaRaya(desde, RECTA, d, 11.5)!;
      expect(e, `rumbo ${rumbo / GRADO}`).not.toBeNull();
      expect(deFrente(e.poses)).toBeGreaterThan(0.99);
      const fin = e.poses.at(-1)!;
      expect(aLaRaya(fin, RECTA)).toBeLessThan(1.5);
      expect(Math.abs(diferencia(fin.rumbo, 90 * GRADO)) / GRADO).toBeLessThan(30);
      // Y ningún giro más cerrado que el que deja la rueda de morro a setenta grados.
      for (let i = 2; i < e.poses.length; i++) {
        const a = e.poses[i - 1]!;
        const b = e.poses[i]!;
        const ds = Math.hypot(b.x - a.x, b.z - a.z);
        if (ds > 0.1) expect(Math.abs(diferencia(a.rumbo, b.rumbo)) / ds).toBeLessThanOrEqual(1.01 / e.radio);
      }
    }
  });

  it("el tractor llega, engancha, remolca, suelta y se aparta: nunca una espera sin salida", () => {
    const desde = { x: 10, z: 40, rumbo: 200 * GRADO };
    const d = destinoEnLaRaya(desde, RECTA, sitioSencillo())!;
    const e = remolqueALaRaya(desde, RECTA, d, 11.5)!;
    const r = new Remolque(e, { batalla: 11.5, envergadura: 26 }, { desde: llegadaDelTractor(RECTA, d) });
    expect(r.fase).toBe("llegando");
    expect(r.personaALaVista).toBe(false);
    // Mientras viene, el avión no se mueve.
    const fases: string[] = [r.fase];
    let t = 0;
    for (; t < 600 && !r.libre; t += DT) {
      const antes = r.fase;
      if (antes === "llegando") expect(Math.hypot(r.avion.x - desde.x, r.avion.z - desde.z)).toBeLessThan(1e-6);
      r.paso(DT);
      if (r.fase !== antes) fases.push(r.fase);
      if (r.fase === "enganchando") {
        // Pegado a la rueda de morro, como en el puesto.
        const rueda = r.ruedaDeMorro;
        expect(Math.hypot(r.tractor.x - rueda.x, r.tractor.z - rueda.z)).toBeLessThan(r.medidasDelTractor.largo);
      }
    }
    expect(r.libre).toBe(true);
    expect(t).toBeLessThan(240);
    expect(fases).toEqual([
      "llegando",
      "enganchando",
      "empujando",
      "frenado",
      "soltando",
      "apartandose",
      "andando",
      "saludando",
      "libre",
    ]);
    expect(aLaRaya(r.avion, RECTA)).toBeLessThan(1.5);
    // Y el tractor, ya suelto, fuera de la hierba de la que sacó al avión.
    expect(r.tractor.z).toBeLessThan(0);
  });
});

/**
 * **En campos de verdad**: una calle de rodaje del campo como raya, y el avión treinta y
 * cinco metros a un lado, en el campo. El tractor tiene que llevarlo a un punto de la raya
 * sobre el pavimento, sin pasar por pista ni edificio, y dejarlo encima de ella mirando
 * hacia donde sigue. Se prueban las calles de la más larga a la más corta hasta dar con
 * hierba al lado.
 */
describe("en cada campo con tractor", async () => {
  const CAMPOS = ["tenerife-norte", "pettirossi", "el-hierro", "la-gomera", "gran-canaria"];
  const escenarios = await Promise.all(CAMPOS.map((id) => conSuAerodromo(scenarioById(id))));
  for (const s of escenarios) {
    for (const id of ["jaz-20", "jaz-90"]) {
      it(`${s.id} · ${id}`, () => {
        const aero = s.aerodrome!;
        expect(hayTractor(aero)).toBe(true);
        const avion = AIRCRAFT.find((a) => a.id === id)!;
        const sitio = elSitioDe(aero, avion.wingSpan);
        const largoDe = (r: readonly PuntoXZ[]) =>
          r.reduce((l, p, i) => (i ? l + Math.hypot(p.x - r[i - 1]!.x, p.z - r[i - 1]!.z) : 0), 0);
        const calles = aero.taxiways
          .map((t) => t.path.map(([x, y]) => ({ x, z: -y })))
          .filter((r) => largoDe(r) > 120)
          .sort((a, b) => largoDe(b) - largoDe(a));
        let raya: PuntoXZ[] = [];
        let desde: Pose | null = null;
        for (const calle of calles) {
          for (let i = 0; i < calle.length - 1 && !desde; i++) {
            const a = calle[i]!;
            const b = calle[i + 1]!;
            if (Math.hypot(b.x - a.x, b.z - a.z) < 10) continue;
            const va = rumboEntre(a, b);
            for (const lado of [1, -1]) {
              const n = vector(va + (lado * Math.PI) / 2);
              const p = { x: (a.x + b.x) / 2 + n.x * 35, z: (a.z + b.z) / 2 + n.z * 35 };
              if (enElCampo(aero, p.x, p.z) && sitio.libre(p.x, p.z)) {
                // Parado mirando hacia fuera, que es como se queda quien se sale.
                desde = { ...p, rumbo: va + (lado * Math.PI) / 2 };
                break;
              }
            }
          }
          if (desde) {
            raya = calle;
            break;
          }
        }
        expect(desde, "hay hierba junto a una calle").not.toBeNull();
        const d = destinoEnLaRaya(desde!, raya, sitio);
        expect(d, "hay a dónde llevarlo").not.toBeNull();
        expect(sitio.pisable(d!.punto.x, d!.punto.z)).toBe(true);
        expect(enElCampo(aero, d!.punto.x, d!.punto.z)).toBe(false);
        const e = remolqueALaRaya(desde!, raya, d!, avion.batalla);
        expect(e, "llega a la raya").not.toBeNull();
        expect(deFrente(e!.poses)).toBeGreaterThan(0.99);
        const fin = e!.poses.at(-1)!;
        expect(aLaRaya(fin, raya)).toBeLessThan(2);
        expect(enElCampo(aero, fin.x, fin.z)).toBe(false);
        // Y en todo el camino, ni pista ni edificio bajo el avión, salvo donde ya era raya.
        for (const p of e!.poses) {
          if (aLaRaya(p, raya) < 3) continue;
          expect(sitio.libre(p.x, p.z), `${p.x.toFixed(0)},${p.z.toFixed(0)}`).toBe(true);
        }
      });
    }
  }
});
