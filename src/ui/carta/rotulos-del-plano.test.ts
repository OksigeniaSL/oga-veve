/**
 * Los rótulos del plano en vuelo: que ninguno pise a otro, en los cuatro
 * calcos, de lejos y de cerca, y en los tamaños de plano que salen del
 * teléfono tumbado a la tablet.
 *
 * Aquí con la letra medida a ojo y los campos de verdad de cada región; la
 * medida de verdad la hace `verificar-carteles.mjs`, con el plano abierto en
 * el vuelo.
 */

import { describe, expect, it } from "vitest";
import { PELDANOS, type Peldano } from "../../flight/escalera";
import { t, type TranslationKey } from "../../i18n";
import { dondeCae } from "../../world/entre-aerodromos";
import { frecuenciasDeLaCarta } from "../../world/frecuencias-publicadas";
import { TODAS_LAS_ESTACIONES } from "../../world/radioayudas-publicadas";
import { cajaDeRadioayuda } from "./radioayudas";
import { oaciDe, scenarioById, SCENARIOS } from "../../world/scenarios";
import { anchoDe } from "../mapa-del-pais";
import { envolvente, sePisan, type Caja, type Raya } from "./rotulos";
import {
  CUERPOS,
  formasDeCampo,
  medidaDe,
  rotularElPlano,
  unoMas,
  type CampoDelPlano,
  type Medir,
  type PlanoPorRotular,
  type RadioayudaDelPlano,
} from "./rotulos-del-plano";

/** La letra a ojo, con su cuerpo sacado de la letra que pide el lienzo. */
const medir: Medir = (texto, letra) => anchoDe(texto, Number(letra.match(/(\d+)px/)?.[1] ?? 12)) - 4;

/** Los lados del plano en la pantalla: el teléfono pequeño tumbado, el de la caja, el portátil y la tablet. */
const LADOS = [190, 236, 288, 444];

/** Un plano de verdad: los campos de la región del sitio, de lejos o de cerca, con una ruta al primero de los demás. */
function planoDe(id: string, lado: number, peldano: Peldano, cerca: boolean, deCerca = 12_000): PlanoPorRotular {
  const sitio = scenarioById(id);
  const origen = sitio.aerodrome!.origin;
  const region = SCENARIOS.filter(
    (s) =>
      s.pais === sitio.pais &&
      s.aerodrome &&
      Math.hypot(dondeCae(origen, s.aerodrome.origin).x, dondeCae(origen, s.aerodrome.origin).z) < 500_000,
  );
  // Un campo por indicativo: los escenarios de un mismo aeropuerto son uno.
  const unicos = [...new Map(region.map((s) => [oaciDe(s) ?? s.id, s])).values()];
  const mundo = unicos.map((s) => ({ s, ...dondeCae(origen, s.aerodrome!.origin) }));
  const xs = mundo.map((m) => m.x);
  const zs = mundo.map((m) => m.z);
  const ancho = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 1.2 + 20_000;
  const metros = cerca ? deCerca : ancho;
  const cx = cerca ? 0 : (Math.max(...xs) + Math.min(...xs)) / 2;
  const cz = cerca ? 0 : (Math.max(...zs) + Math.min(...zs)) / 2;
  const k = lado / metros;
  const en = (x: number, z: number): [number, number] => [lado / 2 + (x - cx) * k, lado / 2 + (z - cz) * k];
  const destino = mundo.find((m) => oaciDe(m.s) !== oaciDe(sitio))!;
  const campos: CampoDelPlano[] = mundo.map((m) => {
    const [x, y] = en(m.x, m.z);
    const oaci = oaciDe(m.s);
    const torre = frecuenciasDeLaCarta(oaci)?.torre;
    return {
      x,
      y,
      nombre: t(m.s.nameKey as TranslationKey),
      oaci,
      radio: torre ? `${torre.servicio} ${torre.f.cifra}` : null,
      simbolo: 10,
      papel: oaci === oaciDe(sitio) ? "casa" : m === destino ? "destino" : "otro",
    };
  });
  const [dx, dy] = en(destino.x, destino.z);
  const [hx, hy] = en(0, 0);
  // Los puntos de una aproximación, que de lejos caen en un palmo junto al destino.
  const puntos = ["ALFAS", "BRAVO", "COLIS", "DELTA"].map((nombre, i) => {
    const f = 0.55 + i * 0.12;
    return { x: hx + (dx - hx) * f + (i % 2 ? 6 : -6), y: hy + (dy - hy) * f, nombre, activo: i === 1, simbolo: i === 1 ? 7 : 5.5 };
  });
  const camino: (readonly [number, number])[] = [[hx, hy], ...puntos.map((p) => [p.x, p.y] as const), [dx, dy]];
  const rayas: Raya[] = camino.slice(1).map((b, i) => ({ a: camino[i]!, b }));
  const fijos: Caja[] = [
    ...campos.map((c) => ({ cx: c.x, cy: c.y, w: 20, h: 20 })),
    ...puntos.map((p) => ({ cx: p.x, cy: p.y, w: 2 * p.simbolo + 2, h: 2 * p.simbolo + 2 })),
    // La rosa y el avión, en casa.
    { cx: 23, cy: lado - 39, w: 34, h: 40 },
    { cx: hx, cy: hy, w: 28, h: 28 },
  ];
  // Las radioayudas de verdad de la región, con su símbolo de quince píxeles.
  const radioayudas: RadioayudaDelPlano[] = TODAS_LAS_ESTACIONES.filter((e) => e.clase !== "ILS").flatMap((e) => {
    const w = dondeCae(origen, e);
    const [x, y] = en(w.x, w.z);
    if (x < 0 || y < 0 || x > lado || y > lado) return [];
    fijos.push({ cx: x, cy: y, w: 17, h: 17 });
    return [{ x, y, simbolo: 7.5, id: e.id, ...cajaDeRadioayuda(e) }];
  });
  return {
    lado,
    peldano,
    campos,
    puntos,
    umbral: { x: dx, y: dy, nombre: "RW03", cota: "ELEV 78 FT" },
    hitos: [
      { x: hx + 30, y: hy + 25, nombre: "Pico del Teide" },
      { x: hx - 40, y: hy + 10, nombre: "San Cristóbal de La Laguna" },
    ],
    rosa: { x: 23, y: lado - 37, radio: 15, texto: "VAR 4°W" },
    grados: [
      { texto: "28°N", eje: "lat", en: lado * 0.3 },
      { texto: "27°30′N", eje: "lat", en: lado * 0.7 },
      { texto: "16°W", eje: "lon", en: lado * 0.4 },
      { texto: "15°30′W", eje: "lon", en: lado * 0.8 },
    ],
    fijos,
    rayas,
    radioayudas,
    descargo: t("carta.descargo"),
  };
}

describe("las formas del rótulo de un campo, por calcos", () => {
  const campo: CampoDelPlano = { x: 0, y: 0, nombre: "Gran Canaria", oaci: "GCLP", radio: "TWR 118.300", simbolo: 9, papel: "otro" };
  const textos = (p: Peldano) => formasDeCampo(campo, p).map((f) => f.map((r) => r.texto).join(" / "));

  it("en Guyrami, solo el indicativo: cuatro letras que se reconocen sin leer", () => {
    expect(textos("dibujo")).toEqual(["GCLP"]);
  });

  it("desde Tukã el nombre, y en Ruvicha la radio; cada vez más corto si no cabe", () => {
    expect(textos("palabra")).toEqual(["Gran Canaria / GCLP", "Gran Canaria", "GCLP"]);
    expect(textos("cabina")).toEqual(["Gran Canaria / GCLP / TWR 118.300", "Gran Canaria / GCLP", "Gran Canaria", "GCLP"]);
  });

  it("y la letra mide lo mismo en la pantalla, sea el plano grande o chico", () => {
    const [w, h] = medidaDe(formasDeCampo(campo, "cabina")[0]!, medir);
    expect(h).toBeGreaterThan(3 * 12);
    expect(w).toBeGreaterThan(40);
  });
});

describe("el plano, en sus regiones, calcos, lupas y tamaños", () => {
  for (const id of ["tenerife-norte", "pettirossi"])
    for (const peldano of PELDANOS)
      for (const cerca of [false, true])
        it(`${id} en el calco «${peldano}», ${cerca ? "de cerca" : "de lejos"}: ningún rótulo pisa a otro`, () => {
          for (const lado of LADOS) {
            const plano = planoDe(id, lado, peldano, cerca);
            const { puestos } = rotularElPlano(plano, medir);
            const donde = `${lado} px`;
            for (const [i, a] of puestos.entries()) {
              const e = envolvente(a.caja);
              expect(e.x0 >= 0 && e.y0 >= 0 && e.x1 <= lado && e.y1 <= lado, `${donde}: «${a.que}» se sale`).toBe(true);
              for (const b of puestos.slice(i + 1))
                expect(sePisan(a.caja, b.caja), `${donde}: «${a.que}» pisa «${b.que}»`).toBe(false);
              for (const f of plano.fijos) expect(sePisan(a.caja, f), `${donde}: «${a.que}» pisa un símbolo`).toBe(false);
              // Por debajo de once no se lee en un teléfono.
              for (const r of a.renglones) expect(r.cuerpo, `${donde}: «${r.texto}»`).toBeGreaterThanOrEqual(11);
            }
            // Casa lleva su rótulo siempre: es a donde se vuelve.
            const casa = plano.campos.find((c) => c.papel === "casa")!;
            expect(puestos.map((p) => p.que), `${donde}: casa sin rótulo`).toContain(casa.oaci);
            /*
             * El descargo, al pie desde Tukã: es el pie de la hoja. Solo en el
             * plano más chico con el país entero, que tiene un aeródromo en
             * cada borde porque el encuadre se ajusta a ellos, puede no caber.
             */
            if (peldano !== "dibujo" && (cerca || lado > LADOS[0]!))
              expect(puestos.map((p) => p.que), `${donde}: sin descargo`).toContain(t("carta.descargo"));
            // Las cajas de las radioayudas, solo en el calco de la radio.
            if (peldano !== "cabina")
              for (const p of puestos) expect(plano.radioayudas!.some((r) => r.id === p.que), `${donde}: «${p.que}»`).toBe(false);
            // En Guyrami no se escribe nada que haya que leer: solo indicativos.
            if (peldano === "dibujo")
              for (const p of puestos) expect(p.renglones.map((r) => r.texto).join(" "), donde).toMatch(/^[A-Z]{4}$/);
          }
        });
});

describe("el T/D, que se corre con la altura", () => {
  it("busca su hueco sin pisar lo puesto, y si no lo hay, no se escribe", () => {
    const td = [{ texto: "T/D", color: "#000", cifras: true, cuerpo: CUERPOS.td }];
    const ocupado: Caja[] = [{ cx: 120, cy: 100, w: 30, h: 16 }];
    const uno = unoMas(300, ocupado, td, 100, 100, 8, medir);
    expect(uno).not.toBeNull();
    expect(sePisan(uno!.caja, ocupado[0]!)).toBe(false);
    // Todo el plano ocupado: no cabe.
    expect(unoMas(300, [{ cx: 150, cy: 150, w: 300, h: 300 }], td, 100, 100, 8, medir)).toBeNull();
  });
});

describe("los números de los radiales leídos (H26h)", () => {
  /*
   * «Dos radiales que se cortan» en Fuerteventura, como salió en las capturas
   * de H26g: la primera raya, el R-102 de FTV, con el plano encuadrando la
   * raya y el avión a diez millas al este. Su número pisaba el «TWR 118.475»
   * de GCFV. Ahora va con los demás rótulos y en su hueco: ninguno pisa a
   * otro, ni a un símbolo, y queda a un lado de su raya, girado con ella.
   */
  const MILLA = 1852;
  for (const metros of [12_000, 36_000, 60_000])
    it(`con el plano de ${metros / 1000} km, en todos los tamaños`, () => {
      for (const lado of LADOS) {
        const plano = planoDe("fuerteventura", lado, "cabina", true, metros);
        const ftv = plano.radioayudas!.find((r) => r.id === "FTV")!;
        const k = lado / metros;
        // El R-102 magnético, con los tres grados al oeste: al 099 verdadero, trece millas y media.
        const rumbo = (99 * Math.PI) / 180;
        const largo = 13.5 * MILLA * k;
        const a: [number, number] = [ftv.x, ftv.y];
        const b: [number, number] = [ftv.x + Math.sin(rumbo) * largo, ftv.y - Math.cos(rumbo) * largo];
        // Y la otra, la de LTE, bajando del norte hasta pasar por el avión.
        const avion: [number, number] = [ftv.x + Math.sin(rumbo) * 10 * MILLA * k, ftv.y - Math.cos(rumbo) * 10 * MILLA * k];
        const c: [number, number] = [avion[0] + 8 * MILLA * k * 0.2, avion[1] - 8 * MILLA * k];
        const d: [number, number] = [avion[0] - 2 * MILLA * k * 0.2, avion[1] + 2 * MILLA * k];
        const conRayas: PlanoPorRotular = {
          ...plano,
          fijos: [...plano.fijos, { cx: avion[0], cy: avion[1], w: 28, h: 28 }],
          radiales: [
            { a, b, texto: "R-102 FTV", corto: "R-102" },
            { a: c, b: d, texto: "R-192 LTE", corto: "R-192" },
          ],
        };
        const { puestos } = rotularElPlano(conRayas, medir);
        const donde = `${lado} px, ${metros / 1000} km`;
        for (const [i, p] of puestos.entries()) {
          for (const q of puestos.slice(i + 1)) expect(sePisan(p.caja, q.caja), `${donde}: «${p.que}» pisa «${q.que}»`).toBe(false);
          for (const f of conRayas.fijos) expect(sePisan(p.caja, f), `${donde}: «${p.que}» pisa un símbolo`).toBe(false);
          const e = envolvente(p.caja);
          expect(e.x0 >= 0 && e.y0 >= 0 && e.x1 <= lado && e.y1 <= lado, `${donde}: «${p.que}» se sale`).toBe(true);
        }
        const numero = puestos.find((p) => p.que === "R-102 FTV");
        expect(numero, `${donde}: el R-102 sin escribir`).toBeDefined();
        // A un lado de su raya, pegado a ella, y girado con ella: nunca boca abajo.
        const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
        const aparte = Math.abs((numero!.caja.cx - a[0]) * dy - (numero!.caja.cy - a[1]) * dx) / Math.hypot(dx, dy);
        expect(aparte, donde).toBeGreaterThan(numero!.caja.h / 2);
        // Pegado, o algo más lejos para saltar por encima del avión en el plano chico.
        expect(aparte, donde).toBeLessThan(numero!.caja.h / 2 + 24);
        expect(Math.abs(numero!.caja.giro ?? 0), donde).toBeLessThanOrEqual(Math.PI / 2);
        expect(Math.abs((numero!.caja.giro ?? 0) - Math.atan2(dy, dx)), donde).toBeLessThan(1e-9);
      }
    });
});
