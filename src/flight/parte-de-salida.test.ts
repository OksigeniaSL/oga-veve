import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import { decidir, limitesDe, MINIMOS, parteDe, type CampoDelParte } from "./parte-de-salida";
import { CRUZADO_DEMOSTRADO, cruzadoDemostrado } from "./viento-cruzado";
import { leerMetar, type Meteo } from "../world/meteo";

const avion = (id: string) => AIRCRAFT.find((a) => a.id === id)!;

const campo = (metar: string, rumbo: number, oaci = "SGAS", pista = "02"): CampoDelParte => ({
  oaci,
  pista,
  rumbo,
  meteo: leerMetar(metar) as Meteo,
});

describe("el viento cruzado demostrado de cada ficha (#92)", () => {
  it("cada avión tiene el suyo, y los de manual llevan su fuente", () => {
    for (const a of AIRCRAFT) {
      const c = cruzadoDemostrado(a);
      expect(c.kt).toBeGreaterThan(5);
      expect(c.kt).toBeLessThan(40);
      expect(c.fuente.length).toBeGreaterThan(10);
    }
    expect(CRUZADO_DEMOSTRADO["jaz-20"]!.kt).toBe(15);
  });

  it("el biplano sin cifra de manual cae a la regla de certificación: dos décimas de su pérdida", () => {
    const c = cruzadoDemostrado(avion("jaz-25"));
    expect(c.fuente).toMatch(/23\.233/);
  });

  it("los grandes aguantan más que la avioneta", () => {
    expect(cruzadoDemostrado(avion("jaz-120")).kt).toBeGreaterThan(
      cruzadoDemostrado(avion("jaz-20")).kt,
    );
  });
});

describe("el METAR que hace falta para decidir", () => {
  it("lee las rachas, la tormenta encima y guarda el parte entero", () => {
    const m = leerMetar("METAR SGAS 051900Z 11018G30KT 3000 +TSRA BKN008CB 24/22 Q1008")!;
    expect(m.vientoKt).toBe(18);
    expect(m.rachaKt).toBe(30);
    expect(m.tormentaEncima).toBe(true);
    expect(m.crudo).toContain("+TSRA");
  });

  it("una tormenta en las cercanías no está encima, y una de la tendencia tampoco", () => {
    expect(leerMetar("SGAS 051900Z 18008KT 9999 VCTS SCT030 24/20 Q1012")!.tormentaEncima).toBeUndefined();
    expect(
      leerMetar("SGAS 051900Z 18008KT 9999 SCT030 24/20 Q1012 TEMPO TSRA")!.tormentaEncima,
    ).toBeUndefined();
  });
});

describe("la tarjeta del tiempo: un día bueno y uno malo", () => {
  const jaz20 = limitesDe(avion("jaz-20"));

  it("un día bueno: viento flojo de frente, sin nubes que tapen; se sale", () => {
    const salida = parteDe(campo("SGAS 051900Z 02008KT 9999 FEW030 24/18 Q1013", 20), "salida", jaz20);
    const llegada = parteDe(
      campo("SGEN 051900Z 03006KT 9999 SCT040 22/15 Q1014", 30, "SGEN", "03"),
      "llegada",
      jaz20,
    );
    expect(salida.relativo).toBe(0);
    expect(salida.cruzadoKt).toBeCloseTo(0, 5);
    expect(salida.deFrenteKt).toBeCloseTo(8, 5);
    expect(decidir([salida, llegada]).salir).toBe(true);
  });

  it("un día malo: tormenta encima, poca visibilidad y techo bajo; se propone no salir", () => {
    const p = parteDe(
      campo("SGAS 051900Z 11018G30KT 3000 +TSRA BKN008CB 24/22 Q1008", 20),
      "salida",
      jaz20,
    );
    expect(p.pasa).toEqual(["tormenta", "visibilidad", "techo", "cruzado"]);
    const d = decidir([p]);
    expect(d.salir).toBe(false);
    expect(d.motivos[0]).toEqual({ papel: "salida", motivo: "tormenta" });
  });

  it("el viento de costado se compara con las rachas dentro y contra el demostrado de ese avión", () => {
    // Del 110 a la pista 02: noventa grados, todo de costado.
    const flojo = parteDe(campo("SGAS 051900Z 11012KT 9999 24/18 Q1013", 20), "salida", jaz20);
    expect(flojo.cruzadoKt).toBeCloseTo(12, 5);
    expect(flojo.pasa).toEqual([]);
    const conRachas = parteDe(campo("SGAS 051900Z 11012G20KT 9999 24/18 Q1013", 20), "salida", jaz20);
    expect(conRachas.cruzadoKt).toBeCloseTo(20, 5);
    expect(conRachas.pasa).toEqual(["cruzado"]);
    // El mismo día, para el grande, se sale.
    const grande = parteDe(
      campo("SGAS 051900Z 11012G20KT 9999 24/18 Q1013", 20),
      "salida",
      limitesDe(avion("jaz-120")),
    );
    expect(grande.pasa).toEqual([]);
  });

  it("la flecha va sobre la pista: positivo por la derecha, negativo por la izquierda", () => {
    expect(parteDe(campo("X 051900Z 11010KT 9999 Q1013", 20), "salida", jaz20).relativo).toBe(90);
    expect(parteDe(campo("X 051900Z 29010KT 9999 Q1013", 20), "salida", jaz20).relativo).toBe(-90);
    expect(parteDe(campo("X 051900Z 20010KT 9999 Q1013", 20), "salida", jaz20).relativo).toBe(-180);
  });

  it("los mínimos son los de su clase: lo que para a una avioneta no para a uno de instrumentos", () => {
    const gris = "SGAS 051900Z 02008KT 4000 BR OVC010 20/19 Q1015";
    const avioneta = parteDe(campo(gris, 20), "salida", jaz20);
    expect(avioneta.pasa).toEqual(["visibilidad", "techo"]);
    const reactor = parteDe(campo(gris, 20), "salida", limitesDe(avion("jaz-90")));
    expect(reactor.pasa).toEqual([]);
    expect(MINIMOS.visual.visibilidad).toBe(5000);
    expect(MINIMOS.instrumentos.visibilidad).toBe(550);
  });

  it("la llegada cuenta igual que la salida: con la niebla en el destino, mejor no salir", () => {
    const salida = parteDe(campo("SGAS 051900Z 02008KT 9999 24/18 Q1013", 20), "salida", jaz20);
    const llegada = parteDe(
      campo("SGEN 051900Z 03004KT 0300 FG VV001 18/18 Q1014", 30, "SGEN", "03"),
      "llegada",
      jaz20,
    );
    const d = decidir([salida, llegada]);
    expect(d.salir).toBe(false);
    expect(d.motivos.every((m) => m.papel === "llegada")).toBe(true);
  });

  it("un día gris pero dentro de los límites no propone quedarse: la tarjeta no dice «mejor no» por una nube", () => {
    const p = parteDe(campo("SGAS 051900Z 05010KT 8000 -RA BKN020 20/17 Q1012", 20), "salida", jaz20);
    expect(p.pasa).toEqual([]);
    expect(decidir([p]).salir).toBe(true);
  });
});
