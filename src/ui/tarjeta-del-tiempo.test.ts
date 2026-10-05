/**
 * **La negativa argumentada**: la tarjeta del tiempo dice por qué no, con
 * datos y con la fuente del límite.
 *
 * Enrique, al ver que el JAZ 25 se quedaba en tierra en Tenerife Norte por el
 * viento de costado: «me parece correcto, que se vea que hay avionetas que
 * tienen su limitación. Eso sí, que se explique con datos al piloto, que sepa
 * que es una negativa argumentada». Se mira el HTML de cada porqué en los
 * cuatro peldaños: el reloj siempre, la palabra desde el segundo, las cifras
 * desde el tercero y de dónde sale el límite.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import {
  alReleer,
  comparar,
  decidir,
  limitesDe,
  parteDe,
  type CampoDelParte,
} from "../flight/parte-de-salida";
import { leerMetar, type Meteo } from "../world/meteo";
import { cifraDelParte, porqueDibujado, relojDelLimite } from "./tarjeta-del-tiempo";

const avion = (id: string) => AIRCRAFT.find((a) => a.id === id)!;

const campo = (metar: string, rumbo: number, extra: Partial<CampoDelParte> = {}): CampoDelParte => ({
  oaci: "GCXO",
  pista: "30",
  rumbo,
  meteo: leerMetar(metar) as Meteo,
  ...extra,
});

describe("la negativa argumentada de la tarjeta del tiempo", () => {
  const jaz25 = avion("jaz-25");
  const limites25 = limitesDe(jaz25);
  // Los Rodeos, la 30 a 299°: el alisio del 020 a 12 nudos le entra casi de costado.
  const tfn = parteDe(campo("GCXO 051200Z 02012KT 9999 FEW025 21/14 Q1018", 299), "salida", limites25);

  it("el JAZ 25 en Tenerife Norte: el viento de costado pasa su límite, que sale de la norma", () => {
    expect(tfn.pasa).toContain("cruzado");
    const c = comparar(tfn, "cruzado", limites25)!;
    expect(c.hoy).toBeGreaterThan(c.limite);
    expect(c.unidad).toBe("kt");
    // Su manual no se ha leído: el límite es el mínimo de la 14 CFR 23.233.
    expect(c.origen).toBe("norma");
    expect(limites25.cruzadoDe).toBe("norma");
    // Y el de la avioneta de escuela, de su manual.
    expect(limitesDe(avion("jaz-20")).cruzadoDe).toBe("demostrado");
  });

  it("en el primer peldaño, el dibujo y el reloj, sin una letra", () => {
    const html = porqueDibujado(tfn, "cruzado", limites25, "dibujo");
    expect(html).toContain("parte__reloj");
    expect(html).toContain("parte__aguja--pasa");
    expect(html).toContain("parte__marca");
    expect(html).not.toContain("parte__porque-texto");
    expect(html).not.toContain("kt");
  });

  it("en el segundo, la palabra y de dónde sale el límite; sin cifras", () => {
    const html = porqueDibujado(tfn, "cruzado", limites25, "palabra");
    expect(html).toContain("Viento de costado");
    expect(html).toContain("el mínimo que exige la norma");
    expect(html).not.toContain("parte__porque-cifras");
  });

  it("en el tercero, las cifras: lo de hoy contra lo probado", () => {
    const c = comparar(tfn, "cruzado", limites25)!;
    const html = porqueDibujado(tfn, "cruzado", limites25, "cifra");
    expect(html).toContain(
      `viento de costado hoy: ${Math.round(c.hoy)} kt · este avión, probado hasta ${Math.round(c.limite)} kt`,
    );
    expect(html).toContain("el mínimo que exige la norma");
  });

  it("con el manual leído, el límite es «demostrado en su certificación»", () => {
    const jaz20 = avion("jaz-20");
    const l = limitesDe(jaz20);
    const p = parteDe(campo("GCXO 051200Z 02022KT 9999 21/14 Q1018", 299), "salida", l);
    expect(p.pasa).toContain("cruzado");
    expect(porqueDibujado(p, "cruzado", l, "palabra")).toContain("demostrado en su certificación");
  });

  it("la visibilidad y el techo, contra los mínimos de su clase, quedándose cortos", () => {
    const l = limitesDe(avion("jaz-20"));
    const p = parteDe(campo("GCXO 051200Z 02005KT 3000 BR BKN006 18/17 Q1018", 299), "salida", l);
    expect(p.pasa).toEqual(expect.arrayContaining(["visibilidad", "techo"]));
    const vis = comparar(p, "visibilidad", l)!;
    expect(vis.malSiMas).toBe(false);
    expect(vis.hoy).toBeLessThan(vis.limite);
    expect(cifraDelParte(vis.hoy, vis.unidad, "visibilidad")).toBe("3 km");
    const techo = comparar(p, "techo", l)!;
    expect(cifraDelParte(techo.hoy, techo.unidad, "techo")).toBe("600 ft");
    expect(cifraDelParte(techo.limite, techo.unidad, "techo")).toBe("1500 ft");
    const html = porqueDibujado(p, "techo", l, "cifra");
    expect(html).toContain("nubes hoy a 600 ft · este avión necesita 1500 ft");
    expect(html).toContain("para volar mirando afuera");
  });

  it("la tormenta: el avión despegando, tachado, y la regla de siempre", () => {
    const l = limitesDe(avion("jaz-90"));
    const p = parteDe(campo("GCXO 051200Z 27015G28KT 4000 TSRA BKN015CB 22/19 Q1010", 299), "salida", l);
    expect(p.pasa).toContain("tormenta");
    const c = comparar(p, "tormenta", l)!;
    expect(relojDelLimite(c)).toContain("parte__tachado");
    expect(porqueDibujado(p, "tormenta", l, "palabra")).toContain("a una tormenta no se entra");
  });

  it("si hoy no le da ni la pista entera, es otro porqué, con su cuenta y su margen", () => {
    const l = limitesDe(avion("jaz-120"));
    const p = parteDe(
      campo("GCLP 051200Z 03010KT 9999 35/10 Q1012", 30, {
        oaci: "GCLP",
        pista: "03L",
        pistaDeHoy: { hay: 3100, necesita: 3420 },
      }),
      "salida",
      l,
    );
    expect(p.pasa).toContain("pista");
    expect(decidir([p]).salir).toBe(false);
    const html = porqueDibujado(p, "pista", l, "cifra");
    expect(html).toContain("pista que necesita hoy: 3.420 m · esta pista tiene 3.100 m");
    expect(html).toContain("su manual, con el margen de su certificación");
  });

  it("en la llegada no se mira la pista de despegar", () => {
    const l = limitesDe(avion("jaz-120"));
    const p = parteDe(
      campo("GCLP 051200Z 03010KT 9999 35/10 Q1012", 30, { pistaDeHoy: { hay: 1000, necesita: 3000 } }),
      "llegada",
      l,
    );
    expect(p.pasa).not.toContain("pista");
  });

  it("esperar relee el parte: «mejor» si ahora se sale, «igual» si sigue lo mismo, y nuevo si aparece otro motivo", () => {
    const l = limitesDe(avion("jaz-25"));
    const fuerte = decidir([parteDe(campo("GCXO 051200Z 02014KT 9999 21/14 Q1018", 299), "salida", l)]);
    const flojo = decidir([parteDe(campo("GCXO 051230Z 02004KT 9999 21/14 Q1018", 299), "salida", l)]);
    const conNiebla = decidir([
      parteDe(campo("GCXO 051230Z 02014KT 0800 FG 21/20 Q1018", 299), "salida", l),
    ]);
    expect(fuerte.salir).toBe(false);
    expect(alReleer(fuerte, fuerte)).toBe("igual");
    expect(alReleer(fuerte, flojo)).toBe("mejor");
    expect(alReleer(fuerte, conNiebla)).toBeNull();
  });
});
