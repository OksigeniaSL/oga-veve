/**
 * **Tenerife Sur: la plataforma entera y el APROAR que publica** (ADR 0025, enmienda H88).
 *
 * OpenStreetMap dibuja la plataforma en quince islas, y la losa del juego se quedaba a treinta metros de
 * la fachada y sin pavimento en las dos puntas: del S41 al G48 y del R19 y el G20 el tractor no sacaba
 * bien a nadie. La ficha lleva la pieza entera, trazada sobre la ortofoto del PNOA, y la casilla 20.3 del
 * AIP dice hacia dónde queda el morro: «nosing to the threshold in use and leaving apron gates "D" free».
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { vaALaPasarela } from "../flight/velocidades-en-tierra";
import { aLaPolilinea, enElPavimentoDe, type Punto } from "./aerodrome";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { admite, aproarDe, cumpleElAproar, tienePasarela } from "./puestos-del-aip";
import {
  edificiosDePasarela,
  empujeDesdeElPuesto,
  entradaDelPuesto,
  rayaDeLado,
  rumboDeLaPintada,
  sacaBienPorSuRaya,
  saleConRemolque,
} from "./remolque";
import { pavimentoDibujado, porLaRectaDeSuCalle, type Grafo, type Tramo } from "./rodaje";
import { conLaRuedaEn, morroDe, MORRO_DEL_TRAFICO, ruedaDeMorroEn } from "./rueda-de-morro";
import { fueraDelPavimento, ruedasEn } from "./ruedas-en-el-empuje";
import { conSuAerodromo, SCENARIOS } from "./scenarios";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { pasarelaDelTrafico, pistaQuePideConSuMargen, TIPOS } from "./trafico";

const GRADO = Math.PI / 180;
const campo = await conSuAerodromo(SCENARIOS.find((e) => e.id === "tenerife-sur")!);
const aero = campo.aerodrome!;
const edificios = edificiosDePasarela(aero);
const pavimento = enElPavimentoDe(aero);
const reactores = AIRCRAFT.filter((a) => vaALaPasarela(a));
type Avion = (typeof AIRCRAFT)[number];
const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;
const la07 = campo.runway.heading;
const la25 = (la07 + 180) % 360;
const el = (ref: string) => aero.parkingPositions!.find((p) => p.ref === ref)!;
const deRetroceso = aero.parkingPositions!.filter((p) => p.aip?.salida === "R");

/** Si un punto cae dentro de un polígono. */
function dentro([x, y]: Punto, g: readonly Punto[]): boolean {
  let d = false;
  for (let i = 0, j = g.length - 1; i < g.length; j = i++)
    if (g[i]![1] > y !== g[j]![1] > y && x < ((g[j]![0] - g[i]![0]) * (y - g[i]![1])) / (g[j]![1] - g[i]![1]) + g[i]![0]) d = !d;
  return d;
}

/** El empuje de un puesto con ese avión y por esa pista, como lo hace el juego. */
function empujeDe(ref: string, avion: Avion, rumbo: number) {
  const p = el(ref);
  const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, avion);
  plan.deContacto = true;
  expect(plan.reiniciarDesde(p.xy), ref).toBe(true);
  const [x, z] = plan.arranque()!;
  const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
  const suyo = empujeDesdeElPuesto({ x, z }, edificios, raya, entradaDelPuesto(aero, x, z), avion.batalla, (r) =>
    conLaRuedaEn({ x, z }, r, morroDe(avion)),
  )!;
  const { ruta } = plan as unknown as { ruta: { letras: readonly string[]; largo: number; vuelveEn?: number } };
  return { plan, raya, suyo, ruta, fin: suyo.empuje!.poses.at(-1)! };
}

describe("la plataforma de Tenerife Sur, de una pieza", () => {
  it("es una sola, de la carta y de la ortofoto, y dice de dónde sale cada lado", () => {
    expect(aero.plataformasDeducidas).toHaveLength(1);
    const { fuente, polygon, surface } = aero.plataformasDeducidas![0]!;
    expect(surface).toBe("concrete");
    expect(fuente).toMatch(/^Deducida: .*AIP España AD 2-GCTS PDC 1\.1 \(WEF 11-JUN-26\).*ortofoto PNOA .*Instituto Geográfico Nacional \(CC BY 4\.0/);
    // Las quince islas de OpenStreetMap siguen en la ficha, y caen dentro: la del R19, con dos metros por fuera del borde que se ve en la foto.
    expect(aero.aprons.filter((a) => a.polygon !== polygon)).toHaveLength(15);
    for (const a of aero.aprons)
      for (const v of a.polygon)
        expect(dentro(v, polygon) || aLaPolilinea(v, [...polygon, polygon[0]!]) < 2.5, `${v}`).toBe(true);
    // Y con ella no hace falta coser ninguna isla a su calle.
    expect(aero.aprons).toHaveLength(16);
  });

  it.each([
    ["entre el morro del G10 y la terminal", [-752, 190]],
    ["a la izquierda del G10, donde la losa acababa en diagonal", [-775, 165]],
    ["la vía de servicio, delante del J7", [-590, 262]],
    ["la vía de servicio, al pie de la torre", [-250, 404]],
    ["y delante de la terminal de carga", [-40, 490]],
    ["entre el H38 y el H39", [-882, 118]],
    ["entre el S41 y la calle de plataforma", [-1030, 10]],
    ["detrás del G48", [-1090, -30]],
    ["la esquina de la D1", [-1290, -240]],
    ["detrás del R19", [45, 415]],
    ["detrás del G20", [75, 400]],
    ["la esquina de la D6", [120, 300]],
    ["entre la calle de plataforma y la D2", [-910, -60]],
    ["el asfalto por el que se entra al E53", [-135, 185]],
  ] as [string, Punto][])("es pavimento %s", (_donde, p) => expect(pavimento(p)).toBe(true));

  it.each([
    ["la tierra al oeste de la D1", [-1330, -230]],
    ["la ladera al norte de los hangares", [-1200, 70]],
    ["el aparcamiento, detrás de la vía de servicio", [-1050, 125]],
    ["el seto del pie de la torre", [-243, 421]],
    ["la isleta de tierra junto a la D6", [165, 314]],
    ["la tierra entre la T y la pista", [-500, -60]],
    ["la tierra al sur de la T, junto a la D6", [60, 190]],
  ] as [string, Punto][])("y no lo es %s", (_donde, p) => expect(pavimento(p)).toBe(false));

  it("no tapa ningún edificio: el que pisa la losa es de lo que hay sobre ella", () => {
    const { polygon } = aero.plataformasDeducidas![0]!;
    const area = (g: readonly Punto[]) =>
      Math.abs(g.reduce((s, a, i) => s + a[0] * g[(i + 1) % g.length]![1] - g[(i + 1) % g.length]![0] * a[1], 0)) / 2;
    const centro = (g: readonly Punto[]): Punto => [g.reduce((s, q) => s + q[0], 0) / g.length, g.reduce((s, q) => s + q[1], 0) / g.length];
    const encima = aero.buildings.filter((b) => b.kind !== "roof" && dentro(centro(b.polygon), polygon));
    // Los postes de los focos y los núcleos de las pasarelas y de las escaleras, que están en la plataforma.
    for (const b of encima) expect(area(b.polygon), `${b.kind} ${b.polygon[0]}`).toBeLessThan(260);
    for (const b of aero.buildings.filter((x) => x.kind === "terminal")) expect(encima).not.toContain(b);
  });

  it("y llega a la fachada: del morro de cada puesto de delante de la terminal a ella, todo pavimento", () => {
    const terminales = aero.buildings.filter((b) => b.kind === "terminal");
    let mirados = 0;
    for (const ref of ["G2", "G4", "G6", "G9", "G10", "J3", "J5", "J7", "J8", "H37", "H38", "H39"]) {
      const { xy } = el(ref);
      const r = rumboDeLaPintada(xy[0], -xy[1], edificios, entradaDelPuesto(aero, xy[0], -xy[1]))!;
      let llega = false;
      for (let d = 0; d < 90 && !llega; d += 0.5) {
        const q: Punto = [xy[0] + Math.sin(r) * d, xy[1] + Math.cos(r) * d];
        llega = terminales.some((b) => dentro(q, b.polygon));
        // Bajo el alero del tejado sigue siendo losa hasta la pared.
        if (!llega) expect(pavimento(q), `${ref}, a ${d} m del morro`).toBe(true);
      }
      expect(llega, `${ref}: no llega a la terminal`).toBe(true);
      mirados++;
    }
    expect(mirados).toBe(12);
  });
});

describe("el APROAR de la casilla 20.3", () => {
  it("lo llevan todos los de salida en retroceso: el umbral en uso, y al de la 25 los cuatro que lo dicen", () => {
    expect(aero.aipPuestos?.aproar).toMatch(/casilla 20\.3\.2\.1 \(AIRAC AMDT 10\/26, WEF 29-OCT-26\).*nosing to the threshold in use.*R19, G20, AG21, and J22/);
    expect(aero.aipPuestos?.puertasLibres).toEqual(["D1", "D2", "D3", "D4", "D5", "D6"]);
    expect(deRetroceso).toHaveLength(29);
    const AL_25 = ["AG21", "G20", "J22", "R19"];
    const umbral = (rumbo: number) => ((rumbo + 180) % 360) * GRADO;
    for (const p of deRetroceso) {
      const al25 = AL_25.includes(p.ref!);
      expect(p.aip!.aproar, p.ref!).toBe(al25 ? "E" : "E/W");
      // Con cualquier pista, hacia el umbral del que se despega; los cuatro, siempre hacia el de la 25.
      for (const rumbo of [la07, la25]) {
        const aproar = aproarDe(p.aip, rumbo)!;
        expect(aproar, p.ref!).toHaveLength(1);
        expect(cumpleElAproar(umbral(al25 ? la25 : rumbo), aproar), `${p.ref} por la ${rumbo}`).toBe(true);
        expect(cumpleElAproar(umbral(al25 ? la07 : (rumbo + 180) % 360), aproar), `${p.ref} por la ${rumbo}, al otro`).toBe(false);
      }
    }
    // A los de salida autónoma y a los que no están en la carta, nada.
    for (const p of aero.parkingPositions!) if (p.aip?.salida !== "R") expect(p.aip?.aproar, p.ref ?? "—").toBeUndefined();
  });

  it("de cada puesto de retroceso, con cada reactor que cabe y por las dos cabeceras: hacia él, por su raya, sobre pavimento y sin meterse por una puerta D", () => {
    const puertas = aero.taxiways.filter((t) => aero.aipPuestos!.puertasLibres!.includes(t.ref ?? ""));
    expect(puertas).toHaveLength(6);
    let contacto = 0;
    let remotos = 0;
    for (const avion of reactores)
      for (const rumbo of [la07, la25])
        for (const p of deRetroceso) {
          if (!admite(p.aip, avion.wingSpan)) continue;
          const nombre = `${p.ref} · ${avion.id} · ${rumbo.toFixed(0)}°`;
          expect(saleConRemolque(true, p.xy[0], -p.xy[1], edificios, morroDe(avion), p.aip, entradaDelPuesto(aero, p.xy[0], -p.xy[1])), nombre).toBe(true);
          const { suyo, raya, fin } = empujeDe(p.ref!, avion, rumbo);
          expect(sacaBienPorSuRaya(suyo, raya), nombre).toBe(true);
          expect(rayaDeLado(suyo.rumbo, raya), nombre).toBe(false);
          expect(fueraDelPavimento(avion, suyo.empuje!.poses, pavimentoDibujado(aero)), nombre).toEqual({ metros: 0, alAcabar: 0 });
          // Menos los dos grandes del R45 y del R47 por la 07: con el morro a ella solo les queda la D1, que no les cabe (H97).
          const alOtro = avion.wingSpan > 52 && rumbo === la07 && ["R45", "R47"].includes(p.ref!);
          expect(cumpleElAproar(fin.rumbo, aproarDe(p.aip, alOtro ? la25 : rumbo)!), nombre).toBe(true);
          expect(cumpleElAproar(fin.rumbo, aproarDe(p.aip, rumbo)!), nombre).toBe(!alOtro);
          for (const q of suyo.empuje!.poses)
            for (const r of ruedasEn(avion, q))
              for (const t of puertas) expect(aLaPolilinea([r.x, -r.z], t.path), `${nombre}: por la ${t.ref}`).toBeGreaterThan(11.4);
          if (tienePasarela(p.aip)) contacto++;
          else remotos++;
        }
    expect(contacto).toBe(46);
    expect(remotos).toBe(64);
  }, 120_000);

  /*
   * Su línea baja a la curva por la que la calle de plataforma se va a la D6, y siguiéndola de espaldas el
   * tractor los metía por ella hasta la paralela: 243 m del R19 y 202 del G20.
   */
  it.each([
    ["R19", 167],
    ["G20", 138],
  ])("el %s, a la recta de la calle de plataforma, con el morro a la 25 y por delante de la D6", (ref, metros) => {
    for (const rumbo of [la07, la25]) {
      const { suyo, ruta, fin } = empujeDe(ref, jaz90, rumbo);
      expect(ruta.vuelveEn, ref).toBe(2);
      expect(suyo.empuje!.largo, ref).toBeLessThan(metros + 4);
      expect(suyo.empuje!.largo, ref).toBeGreaterThan(metros - 4);
      expect(Math.abs(fin.rumbo / GRADO - 69), ref).toBeLessThan(3);
      // En la calle de plataforma, al oeste de su curva.
      const inner = aero.taxiways.find((t) => t.ref === "INNER")!;
      expect(aLaPolilinea([fin.x, -fin.z], inner.path), ref).toBeLessThan(2);
      expect(fin.x, ref).toBeLessThan(24);
      // Y de ahí, por la D6 a la cabecera en uso, sin pisar la pista.
      expect(ruta.letras.slice(0, 2), ref).toEqual(["INNER", "D6"]);
      expect(ruta.letras.at(-1), ref).toBe(rumbo === la07 ? "B2" : "B6");
      expect(ruta.letras, ref).not.toContain("07/25");
    }
  });

  /*
   * La casilla 20.3.3: la D1, la B1 y la B6, hasta la letra D, que son 52 m. Los dos grandes, de casi sesenta,
   * salían por la 07 por la D1.
   */
  it("y los dos grandes no ruedan por la D1, la B1 ni la B6, que son de letra D", () => {
    const r = aero.restriccionesDeRodaje!;
    expect(r.map((x) => [x.calle, x.masDeM])).toEqual([["D1", 52], ["B1", 52], ["B6", 52], ["U1", 22], ["U2", 22], ["U3", 22]]);
    for (const x of r) expect(x.fuente).toMatch(/AD 2-GCTS, casilla 20\.3\.3|^Ídem/);
    for (const avion of reactores)
      for (const rumbo of [la07, la25]) {
        const plan = new PlanDeVuelo(aero, { ...campo.runway, heading: rumbo }, () => 600, avion);
        plan.deContacto = true;
        // De los de retroceso, todos: hasta la H97, del R45 y del R47 bajaban por la D1.
        for (const p of [null, ...deRetroceso.filter((q) => admite(q.aip, avion.wingSpan))]) {
          expect(p ? plan.reiniciarDesde(p.xy) : plan.reiniciar(), p?.ref ?? "el suyo").toBe(true);
          const { letras } = (plan as unknown as { ruta: { letras: readonly string[] } }).ruta;
          const nombre = `${avion.id} · ${rumbo.toFixed(0)}° · ${p?.ref ?? "el suyo"}: ${letras.join("-")}`;
          if (avion.wingSpan > 52) for (const l of ["D1", "B1", "B6"]) expect(letras, nombre).not.toContain(l);
          // Y el que cabe, por la primera que se encuentra (`primera-puerta.test.ts`, H95); a la 25, por la B6.
          else if (rumbo === la25) expect(letras, nombre).toContain("B6");
        }
      }
  });

  it("el reactor del tráfico sale también con el morro hacia el umbral en uso", () => {
    const t = TIPOS.reactor;
    for (const heading of [la07, la25]) {
      const suelo = sueloDelTrafico(aero, { ...campo.runway, heading }, aero.runways[0]?.widthM ?? 45)!;
      const sale = suelo.salida(undefined, undefined, pistaQuePideConSuMargen(t), pasarelaDelTrafico(t)!, undefined, MORRO_DEL_TRAFICO.reactor)!;
      const p0 = sale.empuje!.trayectoria.poses[0]!;
      const rueda = ruedaDeMorroEn(p0, p0.rumbo, MORRO_DEL_TRAFICO.reactor);
      const p = aero.parkingPositions!.find((q) => Math.hypot(q.xy[0] - rueda.x, -q.xy[1] - rueda.z) < 2)!;
      expect(cumpleElAproar(sale.empuje!.trayectoria.poses.at(-1)!.rumbo, aproarDe(p.aip, heading)!), `${heading.toFixed(0)}° · ${p.ref}`).toBe(true);
    }
  });
});

describe("la línea que llega a la curva de su calle", () => {
  // Una calle de oeste a este que al final tuerce al sur; el puesto al norte, en la vertical de la curva, con el morro al norte.
  const nudos: Punto[] = [
    [-200, 0],
    [60, -60],
    [60, -260],
  ];
  const tramo = (a: number, b: number, puntos: Punto[]): Tramo => {
    let largo = 0;
    for (let i = 1; i < puntos.length; i++) largo += Math.hypot(puntos[i]![0] - puntos[i - 1]![0], puntos[i]![1] - puntos[i - 1]![1]);
    return { a, b, puntos, largo, coste: largo, ref: a === 0 ? "I" : "D", pista: false, estrecho: false };
  };
  const tramos = [tramo(0, 1, [[-200, 0], [0, 0], [20, -3], [38, -12], [50, -26], [57, -42], [60, -60]]), tramo(1, 2, [[60, -60], [60, -260]])];
  const grafo: Grafo = { nudos, tramos, desde: nudos.map((_, n) => tramos.flatMap((t, k) => (t.a === n || t.b === n ? [k] : []))) };
  const alFinal: Punto = [60, -250];
  const al = (x: number) => porLaRectaDeSuCalle(grafo, [x, 100], [alFinal], [0, -1], [[1, 0]], { maxSalto: 300 })[0] ?? null;

  it("se empuja hasta la prolongación de la recta y, por ella, hasta dentro de la calle", () => {
    const r = al(58)!;
    expect(r.vuelveEn).toBe(2);
    expect(r.puntos.slice(0, 4)).toEqual([[58, 100], [58, 0], [-32, 0], [0, 0]]);
    expect(r.letras).toEqual(["I", "D"]);
    // Cien metros de espaldas por la línea, noventa por la calle y vuelta hasta el final.
    const vuelta = 32 + (tramos[0]!.largo - 200) + 190;
    expect(r.largo).toBeCloseTo(100 + 58 + 32 + vuelta, 0);
  });

  it("no si llega atravesada a la recta, si el sentido es el otro o si no hay recta a la que torcer", () => {
    expect(al(-60)).toBeNull();
    expect(porLaRectaDeSuCalle(grafo, [58, 100], [alFinal], [0, -1], [[-1, 0]], { maxSalto: 300 })).toEqual([null]);
    const corta = [tramo(0, 1, [[20, -3], [38, -12], [50, -26], [57, -42], [60, -60]]), tramos[1]!];
    expect(porLaRectaDeSuCalle({ ...grafo, tramos: corta }, [58, 100], [alFinal], [0, -1], [[1, 0]], { maxSalto: 300 })).toEqual([null]);
    // Ni si la línea no encuentra calle.
    expect(al(400)).toBeNull();
  });

  it("ni cruzando lo que no es pavimento", () => {
    const conHueco: Grafo = { ...grafo, rodable: (p) => !(p[0] > 5 && p[0] < 50 && Math.abs(p[1]) < 4) };
    expect(porLaRectaDeSuCalle(conHueco, [58, 100], [alFinal], [0, -1], [[1, 0]], { maxSalto: 300 })).toEqual([null]);
  });

  it("y en los campos cuyo AIP no manda dejar libres las puertas, no se mira", async () => {
    for (const e of SCENARIOS) {
      const otro = (await conSuAerodromo(e)).aerodrome;
      if (otro && otro.id !== "GCTS") expect(otro.aipPuestos?.puertasLibres, otro.id).toBeUndefined();
    }
  });
});
