/**
 * La flota, mirada como lo que es: una lista de nombres propios.
 *
 * Lo que se comprueba aquí no es aerodinámica, es **disciplina de bautizo**, y
 * hace falta porque ya falló dos veces: el primer tramo se llamó Mainumby
 * durante unas horas, que es también el fumigador, y el reactor de #69 se
 * llama Kuarahy, que es la raíz de la ardilla de Granja Óga. Las dos veces el
 * fallo fue el mismo —nadie miró la otra lista— y las dos veces se encontró de
 * casualidad. Esto lo mira siempre.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT, RESERVADOS, aircraftById } from "./aircraft";
import { AERONAVES } from "./aeronaves";
import { SUPER_PUMA_EN_EL_JUEGO } from "./helicoptero-en-el-juego";
import { MEDIDAS_DEL_TIPO } from "./bomberos";
import { DE_SU_CLASE } from "./ficha-tecnica";
import {
  EN_EL_TALLER,
  ESTA_HECHO,
  FABRICANTE,
  FLOTA,
  modeloPorId,
  nombreEntero,
  nombreEnteroDe,
} from "./flota";
import { TIERS } from "./tiers";

describe("la flota", () => {
  it("los números crecen con el tamaño y no se repiten", () => {
    const numeros = FLOTA.map((m) => m.numero);
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    expect(new Set(numeros).size).toBe(numeros.length);
  });

  /*
   * **Los tres reactores se distinguen a simple vista**, y es lo que enseña el
   * álbum: dos motores en un tubo estrecho, dos en uno gordo, y cuatro. Si un día
   * dos de los tres se quedan con la misma combinación, el álbum deja de tener
   * respuesta.
   */
  it("dos motores en un tubo estrecho, dos en uno gordo y cuatro son tres siluetas", () => {
    const de = (id: string) => ({
      silueta: modeloPorId(id)!.silueta,
      motores: aircraftById(id).motores,
      tubo: MEDIDAS_DEL_TIPO[id]!.ancho,
    });
    const reactor = de("jaz-90");
    const ancho = de("jaz-110");
    const cuatro = de("jaz-120");
    expect(reactor.silueta).toBe("reactor");
    expect(ancho.silueta).toBe("bimotor-ancho");
    expect(cuatro.silueta).toBe("cuatrimotor");
    expect(ancho.motores).toBe(reactor.motores);
    expect(ancho.tubo).toBeGreaterThan(reactor.tubo * 1.5);
    expect(cuatro.motores).toBe(2 * ancho.motores);
    expect(cuatro.tubo).toBeGreaterThan(5);
    // Y el motor es grande: más de cinco veces el empuje del de pasillo único.
    expect(aircraftById("jaz-110").maxThrust / 2).toBeGreaterThan(
      (aircraftById("jaz-90").maxThrust / 2) * 5,
    );
  });

  it("ningún pájaro se repite", () => {
    const nombres = FLOTA.map((m) => m.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("y ninguna silueta tampoco, que es lo que hay que aprender a distinguir", () => {
    const siluetas = FLOTA.map((m) => m.silueta);
    expect(new Set(siluetas).size).toBe(siluetas.length);
  });

  /*
   * La colisión de verdad, la que ya pasó: los tramos de dificultad también
   * son aves guaraníes. Guyrami, Tukã, Taguato y Taguato Ruvicha.
   */
  it("ningún avión se llama como un tramo", () => {
    const tramos = TIERS.map((t) => t.name.toLowerCase());
    for (const m of FLOTA) {
      expect(tramos, `${m.nombre} choca con un tramo`).not.toContain(
        m.nombre.toLowerCase(),
      );
    }
  });

  it("el nombre entero lleva fabricante, número y pájaro", () => {
    expect(nombreEntero(FLOTA[0]!)).toBe(`${FABRICANTE} 20 Pykasu`);
  });

  /*
   * **El helicóptero es de la flota**, con su número entre el 60 y el 90, su
   * pájaro sin usar y su silueta, y con el identificador de siempre: con él se
   * lanza y se guarda. Ver `flota.ts`.
   */
  it("el helicóptero es el JAZ 70 Kirikiri'i, con su silueta y el identificador de siempre", () => {
    const m = modeloPorId("super-puma")!;
    expect(nombreEntero(m)).toBe("JAZ 70 Kirikiri'i");
    expect(m.silueta).toBe("helicoptero");
    expect(SUPER_PUMA_EN_EL_JUEGO.name).toBe("JAZ 70 Kirikiri'i");
    expect(SUPER_PUMA_EN_EL_JUEGO.id).toBe("super-puma");
    const numeros = FLOTA.map((x) => x.numero);
    expect(numeros.indexOf(70)).toBe(numeros.indexOf(60) + 1);
    expect(numeros.indexOf(90)).toBe(numeros.indexOf(70) + 1);
    // Y no es un avión: no está en lo que recorren las lecciones y las cuentas de pista.
    expect(AIRCRAFT.map((a) => a.id)).not.toContain("super-puma");
  });

  it("se encuentra por identificador, y lo que no es de la flota no aparece", () => {
    expect(modeloPorId("jaz-25")?.nombre).toBe("Mainumby");
    expect(modeloPorId("oga-172")).toBeNull();
  });
});

describe("lo construido y lo reservado", () => {
  it("todo lo que vuela es de la flota", () => {
    for (const a of AERONAVES) {
      expect(modeloPorId(a.id), `${a.id} no está en la flota`).not.toBeNull();
    }
  });

  it("y lo que vuela es exactamente lo que se dice construido", () => {
    expect(AERONAVES.map((a) => a.id).sort()).toEqual([...ESTA_HECHO].sort());
  });

  it("cada avión se llama como dice la flota", () => {
    for (const a of AERONAVES) {
      expect(a.name).toBe(nombreEntero(modeloPorId(a.id)!));
    }
  });

  /*
   * Y esta es la que impide que la colisión se cuele por tercera vez: un
   * nombre en disputa se queda reservado y **no vuela**. Hoy es el reactor,
   * con la raíz de la ardilla de Granja Óga.
   */
  it("ningún nombre en disputa llega a volar", () => {
    for (const m of FLOTA) {
      if (!m.enDisputa) continue;
      expect(ESTA_HECHO, `${m.nombre}: ${m.enDisputa}`).not.toContain(m.id);
    }
  });

  it("y ninguno de los que ya vuelan está en disputa", () => {
    for (const a of AERONAVES) {
      expect(modeloPorId(a.id)?.enDisputa, a.id).toBeUndefined();
    }
  });
});

/*
 * **Lo que está en el taller** tiene su número reservado y su ficha medida,
 * y no vuela: no está en la tabla ni en el hangar hasta que tenga su silueta
 * (#185). Que su número no lo repita nadie y que vaya donde lo pone su
 * tamaño, que es la regla de la tabla.
 */
describe("lo que está en el taller", () => {
  it("su número no lo tiene nadie de la flota, ni su pájaro", () => {
    const numeros = FLOTA.map((m) => m.numero);
    const nombres = FLOTA.map((m) => m.nombre.toLowerCase());
    for (const t of EN_EL_TALLER) {
      expect(numeros, t.id).not.toContain(t.numero);
      if (t.nombre) expect(nombres, t.id).not.toContain(t.nombre.toLowerCase());
    }
  });

  it("y va donde lo pone su peso máximo, entre el más pequeño y el más grande que él", () => {
    const mtow = (id: string) => DE_SU_CLASE[id]!.mtow!;
    for (const t of EN_EL_TALLER) {
      const antes = FLOTA.filter((m) => m.numero < t.numero && m.silueta !== "helicoptero");
      const despues = FLOTA.filter((m) => m.numero > t.numero && m.silueta !== "helicoptero");
      for (const m of antes) expect(mtow(m.id), `${m.id} y ${t.id}`).toBeLessThan(mtow(t.id));
      for (const m of despues) expect(mtow(m.id), `${t.id} y ${m.id}`).toBeGreaterThan(mtow(t.id));
    }
  });

  it("no vuela: ni es de la flota que se ve, ni se dice construido, ni está en el hangar", () => {
    for (const t of EN_EL_TALLER) {
      expect(modeloPorId(t.id), t.id).toBeNull();
      expect(ESTA_HECHO, t.id).not.toContain(t.id);
      expect(AERONAVES.map((a) => a.id), t.id).not.toContain(t.id);
    }
  });

  it("pero su ficha existe y la mide el banco", () => {
    for (const t of EN_EL_TALLER) {
      expect(RESERVADOS.map((a) => a.id), t.id).toContain(t.id);
    }
  });

  it("y sin pájaro se llama por su número", () => {
    expect(nombreEnteroDe("jaz-50")).toBe("JAZ 50");
    expect(RESERVADOS.find((a) => a.id === "jaz-50")!.name).toBe("JAZ 50");
  });
});
