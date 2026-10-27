/**
 * **La turbulencia se dice por su nombre, de muchas maneras y solo con su
 * grabación.** Ver `anuncio-de-turbulencia.ts`.
 */
import { describe, expect, it } from "vitest";
import { hayTexto, t } from "../i18n";
import { EN } from "../i18n/en";
import type { SucesoDelCamino } from "../flight/turbulencia-del-vuelo";
import {
  CINTURON_PORQUE,
  LA_DE_SIEMPRE,
  anuncioDeTurbulencia,
  claveDelAnuncio,
  pasoDeTurbulencia,
} from "./anuncio-de-turbulencia";
import { VARIANTES } from "./variantes";

type Anunciar = Extract<SucesoDelCamino, { que: "anunciar" }>;
const suceso = (s: Partial<Anunciar>): Anunciar => ({
  que: "anunciar",
  como: "prevista",
  intensidad: "ligera",
  vez: 1,
  fuente: "parte",
  ...s,
});
const todo = () => true;
const nada = () => false;

describe("qué anuncio sale de cada turbulencia", () => {
  it("por grados, la primera vez", () => {
    for (const intensidad of ["ligera", "moderada", "fuerte"] as const)
      expect(claveDelAnuncio(suceso({ intensidad }))).toBe(`comandante.turbulencia.${intensidad}`);
  });

  it("la de aire claro, que ya se mueve, con la de «ahora»", () => {
    expect(
      claveDelAnuncio(suceso({ como: "sin-avisar", intensidad: "moderada", fuente: null })),
    ).toBe("comandante.turbulencia.ahora.moderada");
  });

  it("la segunda vez del vuelo, dicha de otro modo", () => {
    expect(claveDelAnuncio(suceso({ vez: 2, intensidad: "fuerte" }))).toBe(
      "comandante.turbulencia.otraVez.fuerte",
    );
    // La de aire claro sigue siendo la de aire claro aunque sea la segunda.
    expect(claveDelAnuncio(suceso({ vez: 2, como: "sin-avisar", fuente: null }))).toBe(
      "comandante.turbulencia.ahora.ligera",
    );
  });

  it("la de la tormenta y la que avisó otro avión, las suyas", () => {
    expect(claveDelAnuncio(suceso({ como: "tormenta", fuente: "radar", vez: 2 }))).toBe(
      "comandante.turbulencia.tormenta",
    );
    expect(claveDelAnuncio(suceso({ fuente: "pirep", vez: 2 }))).toBe(
      "comandante.turbulencia.pirep",
    );
  });

  it("y todas dicen «turbulencia», nunca «movimiento», en castellano y en inglés", () => {
    const sucesos = [
      ...(["ligera", "moderada", "fuerte"] as const).flatMap((intensidad) => [
        suceso({ intensidad }),
        suceso({ intensidad, vez: 2 }),
        suceso({ intensidad, como: "sin-avisar", fuente: null }),
      ]),
      suceso({ como: "tormenta", fuente: "radar" }),
      suceso({ fuente: "pirep" }),
    ];
    for (const s of sucesos) {
      const clave = claveDelAnuncio(s);
      expect(hayTexto(clave), clave).toBe(true);
      expect(EN[clave as keyof typeof EN], clave).toBeTruthy();
      // La tormenta cuenta el aire movido; las demás dicen la palabra.
      if (s.como !== "tormenta") expect(t(clave), clave).toMatch(/turbulencia/);
      expect(t(clave), clave).not.toMatch(/movimiento|peligro/i);
    }
  });
});

describe("y mientras no está grabada, suena la que hay", () => {
  it("con su grabación, la suya", () => {
    const f = anuncioDeTurbulencia(suceso({ intensidad: "moderada" }), todo);
    expect(f.id).toBe("comandante.turbulencia.moderada");
  });

  it("sin ella, la de siempre: una frase sin grabar sería muda en Brave", () => {
    const f = anuncioDeTurbulencia(suceso({ intensidad: "moderada" }), nada);
    expect(f.id).toBe(LA_DE_SIEMPRE);
    expect(f.texto).toBe(t(LA_DE_SIEMPRE));
  });
});

describe("y dicha a quien la oye", () => {
  const sinTripulacion = { conTripulacion: false, sentados: false };
  const sentados = { conTripulacion: true, sentados: true };

  it("sin tripulación de cabina, nunca la nombra: ni con la suya grabada ni sin ella", () => {
    for (const s of [
      suceso({ intensidad: "moderada" }),
      suceso({ intensidad: "moderada", vez: 2 }),
      suceso({ intensidad: "moderada", como: "sin-avisar", fuente: null }),
    ]) {
      for (const grabada of [todo, nada, (id: string) => !id.endsWith(".sinTripulacion")]) {
        const f = anuncioDeTurbulencia(s, grabada, () => 0, sinTripulacion);
        expect(f.texto, f.id).not.toMatch(/tripulación/i);
      }
      // Con la suya grabada, la suya.
      expect(anuncioDeTurbulencia(s, todo, () => 0, sinTripulacion).id).toMatch(/\.sinTripulacion$/);
    }
  });

  it("con el pasaje sentado, «sigan sentados» y no «vuelvan a su asiento»", () => {
    const f = anuncioDeTurbulencia(suceso({ intensidad: "moderada" }), todo, () => 0, sentados);
    expect(f.id).toBe("comandante.turbulencia.sentados.moderada");
    expect(f.texto).toMatch(/Sigan sentados/);
    expect(f.texto).not.toMatch(/vuelvan/i);
    // Sin grabar, la de siempre del suceso, que es la que ya suena hoy.
    const sinGrabar = anuncioDeTurbulencia(
      suceso({ intensidad: "moderada" }),
      (id) => !id.includes(".sentados."),
      () => 0,
      sentados,
    );
    expect(sinGrabar.id).toBe("comandante.turbulencia.moderada");
  });

  it("las nuevas dicen «turbulencia», en castellano y en inglés", () => {
    for (const clave of [
      "comandante.turbulencia.sentados.moderada",
      "comandante.turbulencia.moderada.sinTripulacion",
      "comandante.turbulencia.ahora.moderada.sinTripulacion",
      "comandante.turbulencia.otraVez.moderada.sinTripulacion",
    ] as const) {
      expect(hayTexto(clave), clave).toBe(true);
      expect(EN[clave], clave).toMatch(/turbulence/);
      expect(t(clave), clave).toMatch(/turbulencia/);
      expect(t(clave), clave).not.toMatch(/tripulación|peligro/i);
    }
  });
});

describe("lo que se dice al pasar", () => {
  it("bajando, que la señal sigue encendida, y solo con su grabación", () => {
    expect(pasoDeTurbulencia({ bajando: true, seApaga: false, conConsejo: false }, todo)?.id).toBe(
      "comandante.turbulencia.pasoBajando",
    );
    expect(pasoDeTurbulencia({ bajando: true, seApaga: false, conConsejo: false }, nada)).toBeNull();
  });

  it("con la señal que se apaga, una de sus dos formas", () => {
    const ids = new Set<string>();
    for (const azar of [() => 0, () => 0.99])
      ids.add(pasoDeTurbulencia({ bajando: false, seApaga: true, conConsejo: false }, todo, azar)!.id);
    expect([...ids].sort()).toEqual(["comandante.turbulencia.paso", "comandante.turbulencia.paso~2"]);
  });

  it("y con la señal puesta de antes no dice que la apaga: sería mentira", () => {
    expect(pasoDeTurbulencia({ bajando: false, seApaga: false, conConsejo: false }, todo)).toBeNull();
  });

  it("con el consejo del cinturón detrás, la forma que no lo da ya", () => {
    const f = pasoDeTurbulencia({ bajando: false, seApaga: true, conConsejo: true }, todo, () => 0);
    expect(f?.id).toBe("comandante.turbulencia.paso~2");
    expect(f?.texto).not.toMatch(/puest/);
    expect(t(CINTURON_PORQUE)).toMatch(/sin avisar/);
  });

  it("y sin nada grabado, nada: lo cuenta el cartel que se apaga", () => {
    expect(pasoDeTurbulencia({ bajando: false, seApaga: true, conConsejo: true }, nada)).toBeNull();
  });

  it("la segunda forma del «ya pasó» está escrita donde se escriben las variantes", () => {
    expect(VARIANTES["comandante.turbulencia.paso"]).toHaveLength(1);
  });
});
