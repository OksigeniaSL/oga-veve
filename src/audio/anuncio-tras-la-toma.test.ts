/**
 * Lo que dice la tripulación al dejar la pista: con el sitio, con el habla de
 * la tripulación, con lo que dice cualquier compañía y, en el sorteo, solo lo
 * grabado. Cuándo suena está en `megafonia.test.ts`.
 */

import { describe, expect, it } from "vitest";
import { t, type TranslationKey } from "../i18n";
import { hablaDe } from "../i18n/habla";
import { AIRCRAFT } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import { SCENARIOS } from "../world/scenarios";
import { anuncioTrasLaToma } from "./anuncio-tras-la-toma";
import { conTripulacion } from "./megafonia";
import { VARIANTES } from "./variantes";

const ASUNCION = { id: "pettirossi", nombre: "Asunción" };
const TENERIFE_SUR = { id: "tenerife-sur", nombre: "Tenerife Sur" };

/** Todas las formas del resto, la de `i18n` y las de `VARIANTES`. */
const formas = (clave: TranslationKey): string[] => [t(clave), ...(VARIANTES[clave] ?? [])];

describe("lo que dice la tripulación al dejar la pista", () => {
  it("en Paraguay, con su bienvenida y su receta", () => {
    const a = anuncioTrasLaToma("paraguayo", ASUNCION, undefined, () => 0);
    expect(a.clave).toBe("tripulacion.llegada");
    expect(a.relleno).toEqual({
      bienvenidos: "tripulacion.bienvenidos.pettirossi",
      resto: "tripulacion.trasLaToma",
    });
    expect(a.texto.startsWith("Señoras y señores, bienvenidos a Asunción. ")).toBe(true);
    expect(a.texto).toContain(t("tripulacion.trasLaToma"));
  });

  it("y en Canarias, con la tripulación de allí", () => {
    const a = anuncioTrasLaToma("canario", TENERIFE_SUR, undefined, () => 0);
    expect(a.clave).toBe("tripulacion.canario.llegada");
    expect(a.relleno.bienvenidos).toBe("tripulacion.canario.bienvenidos.tenerife-sur");
    expect(a.relleno.resto).toBe("tripulacion.canario.trasLaToma");
    expect(a.texto.startsWith("Señoras y señores, bienvenidos a Tenerife Sur. ")).toBe(true);
  });

  it("un campo sin su frase no se queda sin anuncio: la de reserva, con su nombre", () => {
    const a = anuncioTrasLaToma("paraguayo", { id: "nuevo", nombre: "Campo Nuevo" }, undefined, () => 0);
    expect(a.relleno.bienvenidos).toBe("tripulacion.bienvenidos");
    expect(a.texto.startsWith("Señoras y señores, bienvenidos a Campo Nuevo. ")).toBe(true);
    expect(a.texto).not.toContain("{");
  });

  /*
   * La voz del navegador es muda en Brave para Linux: una forma sin grabar en
   * el sorteo es un anuncio que puede no sonar. Ver `conPieza` en `unaForma`.
   */
  it("en el sorteo, solo las formas grabadas", () => {
    const soloLaTercera = (id: string) => id === "tripulacion.trasLaToma~3";
    for (const azar of [0, 0.4, 0.99])
      expect(anuncioTrasLaToma("paraguayo", ASUNCION, soloLaTercera, () => azar).relleno.resto).toBe(
        "tripulacion.trasLaToma~3",
      );
  });

  it("y sin ninguna grabada, la de siempre, nunca una a medias", () => {
    for (const azar of [0, 0.5, 0.99])
      expect(
        anuncioTrasLaToma("canario", TENERIFE_SUR, () => false, () => azar).relleno.resto,
      ).toBe("tripulacion.canario.trasLaToma");
  });

  it("y con todas grabadas, se reparten: no suena siempre igual", () => {
    const vistas = new Set(
      [0, 0.4, 0.8].map((azar) => anuncioTrasLaToma("paraguayo", ASUNCION, () => true, () => azar).relleno.resto),
    );
    expect(vistas.size).toBe(3);
  });
});

/*
 * **Lo que se enseña es real**: cada forma dice lo que dice cualquier
 * compañía, y en el orden de un anuncio de verdad. Ver las fuentes en
 * `anuncio-tras-la-toma.ts`.
 */
describe("y cada forma dice lo de verdad", () => {
  const todas = [
    ...formas("tripulacion.trasLaToma"),
    ...formas("tripulacion.canario.trasLaToma"),
  ];

  it("hay varias por habla, para el sorteo", () => {
    expect(formas("tripulacion.trasLaToma").length).toBeGreaterThanOrEqual(3);
    expect(formas("tripulacion.canario.trasLaToma").length).toBeGreaterThanOrEqual(3);
  });

  it("sentados con el cinturón hasta que pare y se apague la señal", () => {
    for (const f of todas) {
      expect(f, f).toMatch(/sentados/);
      expect(f, f).toMatch(/cinturón/);
      expect(f, f).toMatch(/se (detenga|pare)/);
      expect(f, f).toMatch(/se apague la señal/);
    }
  });

  it("el teléfono, que ya se puede usar; y cuidado con los compartimentos", () => {
    for (const f of todas) {
      expect(f, f).toMatch(/(celular|móvil|teléfono)/);
      expect(f, f).toMatch(/compartim(i)?entos/);
    }
  });

  it("cada tripulación con su habla: celulares en Paraguay, móviles en Canarias", () => {
    for (const f of formas("tripulacion.trasLaToma")) {
      expect(f, f).not.toMatch(/móvil|compartimentos/);
      expect(f, f).toMatch(/celular/);
    }
    for (const f of formas("tripulacion.canario.trasLaToma")) {
      expect(f, f).not.toMatch(/celular|compartimientos|valija/);
      expect(f, f).not.toMatch(/\b(podés|tenés|fijate)\b/);
    }
  });
});

describe("y cada campo donde cabe un avión con auxiliares, su bienvenida", () => {
  /*
   * La bienvenida es una grabación por campo, y la de reserva no se puede
   * grabar: un campo con tripulación sin la suya se oye solo en la tira. El
   * habla es la de allí, que es la de la tripulación que vuela allí.
   */
  it("con el habla del sitio", () => {
    const conAuxiliares = AIRCRAFT.filter((a) => conTripulacion(a.mass));
    for (const e of SCENARIOS) {
      if (!e.aerodrome) continue;
      if (!conAuxiliares.some((a) => cabeEn(a, campoDe(e)).cabe)) continue;
      const habla = hablaDe(e.aerodrome.id);
      const a = anuncioTrasLaToma(habla, { id: e.id, nombre: "x" }, undefined, () => 0);
      expect(a.relleno.bienvenidos, e.id).toBe(
        habla === "canario"
          ? `tripulacion.canario.bienvenidos.${e.id}`
          : `tripulacion.bienvenidos.${e.id}`,
      );
    }
  });
});
