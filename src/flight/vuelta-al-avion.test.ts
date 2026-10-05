import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import { modeloPorId } from "./flota";
import {
  claseDeVuelta,
  cosasDeLaVuelta,
  LO_QUE_SE_MIRA,
  VueltaAlAvion,
} from "./vuelta-al-avion";
import { AnemometroTapado, velocidadDeComprobar } from "./anemometro-tapado";
import { DURA_LA_PRUEBA_DE_MANDOS, pruebaDeMandos } from "./vuelta-al-avion";

const claseDe = (id: string) => claseDeVuelta(modeloPorId(id)?.silueta);

describe("la vuelta al avión: lo que se mira en cada clase", () => {
  it("las tres de hélice ligeras hacen la del 172; el turbohélice y los reactores, la de línea", () => {
    expect(claseDe("jaz-20")).toBe("avioneta");
    expect(claseDe("jaz-25")).toBe("avioneta");
    expect(claseDe("jaz-40")).toBe("avioneta");
    expect(claseDe("jaz-60")).toBe("linea");
    expect(claseDe("jaz-90")).toBe("linea");
    expect(claseDe("jaz-120")).toBe("linea");
  });

  it("la avioneta: la funda del pitot primero, y el combustible, el aceite, la hélice, los calzos, la cola y las luces", () => {
    const a = LO_QUE_SE_MIRA.avioneta;
    expect(a[0]).toBe("pitot");
    for (const c of ["combustible", "aceite", "helice", "calzos", "superficies", "luces"] as const)
      expect(a).toContain(c);
    // Lo que es de línea no se mira en una avioneta.
    expect(a).not.toContain("sondas");
    expect(a).not.toContain("puertas");
  });

  it("el de línea: sondas, ruedas y frenos, motores, luces y puertas; el combustible no se mira por una boca", () => {
    const l = LO_QUE_SE_MIRA.linea;
    expect([...l].sort()).toEqual(["frenos", "luces", "motores", "puertas", "sondas"]);
    expect(l).not.toContain("combustible");
  });

  it("lo que el avión no tiene no se mira: el biplano sin punto de pitot no lleva funda", () => {
    const sinPitot = cosasDeLaVuelta("avioneta", (c) => c !== "pitot");
    const v = new VueltaAlAvion("avioneta", sinPitot);
    expect(v.cosas).not.toContain("pitot");
    expect(v.fundaPuesta).toBe(false);
    expect(v.alArrancar("cifra").fundaOlvidada).toBe(false);
  });
});

describe("la vuelta: lo que se toca y lo que queda puesto", () => {
  const nueva = () => new VueltaAlAvion("avioneta", LO_QUE_SE_MIRA.avioneta);

  it("en el puesto, la funda y los calzos están puestos", () => {
    const v = nueva();
    expect(v.fundaPuesta).toBe(true);
    expect(v.calzosPuestos).toBe(true);
    expect(v.siguiente).toBe("pitot");
  });

  it("tocar la funda la quita, una vez; y se sigue por el orden del manual", () => {
    const v = nueva();
    expect(v.tocar("pitot")).toBe(true);
    expect(v.fundaPuesta).toBe(false);
    expect(v.tocar("pitot")).toBe(false);
    expect(v.siguiente).toBe("superficies");
  });

  it("quien no la hace, no pierde nada: la instructora quita la funda al arrancar", () => {
    const v = nueva();
    const r = v.alArrancar("cifra");
    expect(r.fundaOlvidada).toBe(false);
    expect(r.quitoLaInstructora).toBe(true);
    expect(v.fundaPuesta).toBe(false);
    expect(v.calzosPuestos).toBe(false);
  });

  it("quien la empieza y se deja la funda, se la lleva puesta", () => {
    const v = nueva();
    v.tocar("calzos");
    v.tocar("combustible");
    const r = v.alArrancar("cifra");
    expect(r.fundaOlvidada).toBe(true);
    expect(v.fundaPuesta).toBe(true);
    // Los calzos los saca siempre quien está abajo.
    expect(v.calzosPuestos).toBe(false);
  });

  it("en el peldaño de los pequeños es un juego de tocar: la funda la quita siempre la instructora", () => {
    const v = nueva();
    v.empezar();
    expect(v.alArrancar("dibujo").fundaOlvidada).toBe(false);
  });

  it("entera cuando se ha mirado todo", () => {
    const v = nueva();
    for (const c of v.cosas) v.tocar(c);
    expect(v.entera).toBe(true);
    expect(v.siguiente).toBeNull();
  });
});

describe("la funda olvidada: el anemómetro no marca en la carrera", () => {
  const jaz20 = AIRCRAFT.find((a) => a.id === "jaz-20")!;
  const jaz90 = AIRCRAFT.find((a) => a.id === "jaz-90")!;

  it("se mira pronto: en la avioneta a media carrera, en el de línea a los ochenta nudos como mucho", () => {
    const a = velocidadDeComprobar("avioneta", jaz20);
    expect(a).toBeLessThan(jaz20.rotationSpeed);
    const l = velocidadDeComprobar("linea", jaz90);
    expect(l).toBeLessThanOrEqual(80 * 0.514444 + 1e-9);
    expect(l).toBeLessThan(jaz90.decisionSpeed);
  });

  it("corriendo con la funda puesta, se ve que no marca; abortando hasta parar, se felicita", () => {
    const t = new AnemometroTapado(velocidadDeComprobar("avioneta", jaz20));
    const sucesos: string[] = [];
    // Acelera por la pista con gas de despegue.
    for (let v = 0; v < 20; v += 0.5) {
      const s = t.paso({ tapado: true, enTierra: true, velocidad: v, gas: 1 });
      if (s) sucesos.push(s);
    }
    expect(sucesos).toEqual(["noMarca"]);
    expect(t.abortando).toBe(true);
    // Gas atrás y frenar hasta parar.
    for (let v = 20; v >= 0; v -= 0.5) {
      const s = t.paso({ tapado: true, enTierra: true, velocidad: v, gas: 0 });
      if (s) sucesos.push(s);
    }
    expect(sucesos).toEqual(["noMarca", "abortado"]);
    expect(t.yaAbortado).toBe(true);
  });

  it("rodando despacio al punto de espera no salta: hace falta gas de despegue y velocidad", () => {
    const t = new AnemometroTapado(velocidadDeComprobar("avioneta", jaz20));
    for (let i = 0; i < 100; i++)
      expect(t.paso({ tapado: true, enTierra: true, velocidad: 7, gas: 0.3 })).toBeNull();
  });

  it("si se sigue y se despega, se dice una vez que se vuela sin anemómetro", () => {
    const t = new AnemometroTapado(velocidadDeComprobar("linea", jaz90));
    t.paso({ tapado: true, enTierra: true, velocidad: 50, gas: 1 });
    expect(t.paso({ tapado: true, enTierra: false, velocidad: 80, gas: 1 })).toBe("enElAire");
    expect(t.paso({ tapado: true, enTierra: false, velocidad: 90, gas: 1 })).toBeNull();
  });

  it("sin funda no pasa nada", () => {
    const t = new AnemometroTapado(10);
    for (let v = 0; v < 60; v += 1)
      expect(t.paso({ tapado: false, enTierra: v < 50, velocidad: v, gas: 1 })).toBeNull();
  });
});

describe("los calzos del avión de línea: los pone y los quita el personal de tierra", () => {
  const linea = () => new VueltaAlAvion("linea", LO_QUE_SE_MIRA.linea);

  it("en el puesto está calzado, aunque los calzos no estén en su vuelta", () => {
    const v = linea();
    expect(v.cosas).not.toContain("calzos");
    expect(v.calzosPuestos).toBe(true);
    expect(v.calzosDeTierra).toBe(true);
  });

  it("al arrancar, el personal de tierra se los lleva, haya vuelta o no", () => {
    const v = linea();
    v.alArrancar("cifra");
    expect(v.calzosPuestos).toBe(false);
    const w = linea();
    for (const c of w.cosas) w.tocar(c);
    w.alArrancar("cabina");
    expect(w.calzosPuestos).toBe(false);
  });

  it("en la avioneta los quita quien hace la vuelta, no el personal de tierra", () => {
    const v = new VueltaAlAvion("avioneta", LO_QUE_SE_MIRA.avioneta);
    expect(v.calzosDeTierra).toBe(false);
  });
});

describe("la prueba de mandos de la vuelta", () => {
  it("de uno en uno, hasta sus topes y de vuelta al centro: alerones, profundidad y dirección", () => {
    const tramo = DURA_LA_PRUEBA_DE_MANDOS / 3;
    const max = (k: "alabeo" | "cabeceo" | "guinada", desde: number) => {
      let m = 0;
      for (let t = desde; t < desde + tramo; t += 0.01) m = Math.max(m, Math.abs(pruebaDeMandos(t)[k]));
      return m;
    };
    expect(max("alabeo", 0)).toBeGreaterThan(0.99);
    expect(max("cabeceo", 0)).toBe(0);
    expect(max("cabeceo", tramo)).toBeGreaterThan(0.99);
    expect(max("guinada", 2 * tramo)).toBeGreaterThan(0.99);
    expect(max("alabeo", 2 * tramo)).toBe(0);
  });

  it("fuera de la prueba, todo al centro", () => {
    expect(pruebaDeMandos(-1)).toEqual({ alabeo: 0, cabeceo: 0, guinada: 0 });
    expect(pruebaDeMandos(DURA_LA_PRUEBA_DE_MANDOS + 0.1)).toEqual({ alabeo: 0, cabeceo: 0, guinada: 0 });
  });
});
