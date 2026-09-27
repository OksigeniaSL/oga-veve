/**
 * Que todo lo que el guion de la cabina puede pedir **esté horneado**.
 *
 * El guion monta frases con trozos —el plan, el descenso, el servicio— y una
 * receta con un solo trozo que falta se cae entera a la voz del navegador:
 * suena a otra persona, o en una tablet sin voz no suena. Eso no lo ve
 * ninguna prueba de lógica, porque la lógica está bien y lo que falta es un
 * fichero. Así que aquí se abre el manifiesto de verdad y se le pregunta por
 * cada trozo que el juego puede pedir.
 */
import { describe, expect, it } from "vitest";
import { hayTexto } from "../i18n";
import { recetaDe, type Manifiesto } from "./banco-de-voz";
import {
  MAS_CALOR,
  MAS_FRIO,
  MINUTOS_QUE_SE_DICEN,
  PRIMER_NIVEL,
  ULTIMO_NIVEL,
  piezaDeCielo,
  piezaDeDuracion,
  piezaDeGrados,
  piezaDeMinutos,
  piezaDeNivel,
  type Cielo,
} from "./partes-de-la-comandante";
import { productosDe, servicioPara } from "./servicio-a-bordo";

/*
 * El módulo de Node se pide al propio proceso, como en `cuadro-dos-vistas`:
 * el proyecto no carga los tipos de Node y no hacen falta para leer un JSON.
 */
const fs = (
  globalThis as unknown as {
    process: { getBuiltinModule(nombre: string): unknown };
  }
).process.getBuiltinModule("node:fs") as {
  readFileSync(ruta: string, cod: string): string;
};

const manifiesto = (voz: string): Manifiesto =>
  JSON.parse(
    fs.readFileSync(`data/voces/${voz}/manifiesto.json`, "utf8"),
  ) as Manifiesto;

const CIELOS: readonly Cielo[] = [
  "despejado",
  "nubes",
  "nublado",
  "lluvia",
  "tormenta",
  "niebla",
];

describe("el guion de la cabina, horneado", () => {
  const comandante = manifiesto("comandante");

  it("la comandante tiene todos los trozos con número", () => {
    const faltan: string[] = [];
    const piezas = [
      ...MINUTOS_QUE_SE_DICEN.map(piezaDeMinutos),
      ...MINUTOS_QUE_SE_DICEN.map(piezaDeDuracion),
      ...Array.from({ length: ULTIMO_NIVEL - PRIMER_NIVEL + 1 }, (_, i) =>
        piezaDeNivel(PRIMER_NIVEL + i),
      ),
      ...Array.from({ length: MAS_CALOR - MAS_FRIO + 1 }, (_, i) =>
        piezaDeGrados(MAS_FRIO + i),
      ),
      ...CIELOS.map(piezaDeCielo),
      "comandante.aproximacion",
    ];
    for (const p of piezas) if (!comandante.piezas[p]) faltan.push(p);
    expect(faltan).toEqual([]);
  });

  it("y cada bajada escrita tiene su toma", () => {
    const faltan: string[] = [];
    // Las claves se sacan del diccionario por su forma: así una bajada nueva
    // escrita y sin grabar sale aquí el mismo día.
    const fuente = fs.readFileSync("src/i18n/es-PY.ts", "utf8");
    for (const m of fuente.matchAll(/"(comandante\.descenso\.[\w.-]+)":/g))
      if (!comandante.piezas[m[1]!]) faltan.push(m[1]!);
    expect(faltan).toEqual([]);
  });

  it("y las dos recetas montan con un relleno de verdad", () => {
    expect(
      recetaDe(comandante, "comandante.descenso", {
        hacia: "comandante.descenso.hacia.tenerife-norte",
        minutos: piezaDeMinutos(10),
        cielo: piezaDeCielo("nubes"),
        temperatura: piezaDeGrados(-2),
      }),
    ).toHaveLength(4);
    expect(
      recetaDe(comandante, "comandante.bienvenidaConPlan", {
        bienvenida: "comandante.bienvenida.gran-canaria",
        vuelo: piezaDeDuracion(15),
        nivel: piezaDeNivel(12),
      }),
    ).toHaveLength(3);
  });

  it("y la tripulación de cada sitio tiene su servicio entero y sus cinturones", () => {
    const faltan: string[] = [];
    for (const [habla, voz] of [
      ["paraguayo", "tripulacion"],
      ["canario", "tripulacion-canarias"],
    ] as const) {
      const m = manifiesto(voz);
      for (const p of productosDe(habla))
        for (const azar of [() => 0, () => 0.99]) {
          const s = servicioPara(habla, p, 60, azar);
          if (!recetaDe(m, s.clave, s.relleno)) faltan.push(`${voz}: ${s.clave}`);
          for (const pieza of s.piezas) {
            if (!m.piezas[pieza]) faltan.push(`${voz}: ${pieza}`);
            expect(hayTexto(pieza)).toBe(true);
          }
        }
      const cinturones =
        habla === "canario"
          ? "tripulacion.canario.cinturones"
          : "tripulacion.cinturones";
      if (!m.piezas[cinturones]) faltan.push(`${voz}: ${cinturones}`);
    }
    expect(faltan).toEqual([]);
  });
});
