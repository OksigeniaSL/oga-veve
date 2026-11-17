/**
 * La carta de aproximación de la ficha (#72): que dibuja lo que trae la carta
 * transcrita y nada más, que cada cosa va con su rótulo de carta, y que la
 * columna resaltada de los mínimos es la del avión.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT, categoriaDeAproximacion } from "../../flight/aircraft";
import { APROXIMACIONES, type CartaDeAproximacion } from "../../world/aproximaciones-publicadas";
import { scenarioById } from "../../world/scenarios";
import { cabeceraEnUso } from "../../world/cabecera-en-uso";
import {
  cabecerasConCarta,
  cartaDeAproximacionDeLaFicha,
  msaEnSvg,
  perfilEnSvg,
  plantaEnSvg,
  supDeLaLpv,
  tablaDeMinimos,
} from "./carta-de-aproximacion";

const carta = (oaci: string, cab: string): CartaDeAproximacion => APROXIMACIONES[oaci]![cab]!;
const todas = Object.entries(APROXIMACIONES).flatMap(([oaci, por]) => Object.entries(por).map(([cab, c]) => ({ oaci, cab, c })));

/** Las cifras que se leen en un trozo de HTML o SVG: lo de dentro de las etiquetas. */
function cifrasEscritas(html: string): number[] {
  const texto = html.replace(/<[^>]*>/g, " ");
  return (texto.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}
const cifrasDe = (algo: unknown): Set<number> => new Set((JSON.stringify(algo).match(/\d+(?:\.\d+)?/g) ?? []).map(Number));

describe("la carta de aproximación de la ficha", () => {
  it("es la de la pista en servicio primero, y la de la otra cabecera detrás", () => {
    const rodeos = scenarioById("tenerife-norte");
    const [primera, ...resto] = cabecerasConCarta(rodeos);
    expect(primera).toBe(cabeceraEnUso(rodeos));
    expect([primera, ...resto].sort()).toEqual(["12", "30"]);
    // Gran Canaria tiene carta en la 03L y en la 21R; las otras dos cabeceras, no.
    expect(cabecerasConCarta(scenarioById("gran-canaria")).sort()).toEqual(["03L", "21R"]);
    // Sin carta transcrita no hay botón ni hoja.
    expect(cartaDeAproximacionDeLaFicha(scenarioById("el-hierro"), "A")).toBeNull();
  });

  it("no escribe ni una cifra que no traiga su carta", () => {
    for (const { oaci, cab, c } of todas) {
      const delPerfil = cifrasDe({ ...c.perfil, f: c.frustrada.pies });
      for (const n of cifrasEscritas(perfilEnSvg(c))) expect(delPerfil.has(n), `${oaci} ${cab} perfil: ${n}`).toBe(true);
      const deLosMinimos = cifrasDe({ m: c.minimos, n: c.notas });
      for (const n of cifrasEscritas(tablaDeMinimos(c, "C"))) expect(deLosMinimos.has(n), `${oaci} ${cab} mínimos: ${n}`).toBe(true);
      const deLaMsa = cifrasDe(c.msa);
      for (const n of cifrasEscritas(msaEnSvg(c.msa))) expect(deLaMsa.has(n), `${oaci} ${cab} MSA: ${n}`).toBe(true);
    }
  });

  it("el perfil de una directa: rótulos, altitudes, millas, la senda con su RDH y la cota del umbral", () => {
    const svg = perfilEnSvg(carta("GCXO", "12"));
    for (const algo of [">IF<", ">FAP<", ">ACL<", ">THR<", ">XO11W<", ">XO06W<", "4000", "(1940)", ">5.8<", ">11<", "3.0° (5.2%)", "RDH 49", "THR ELEV 2062", ">5500<"])
      expect(svg, algo).toContain(algo);
    // El intermedio de la 12 no imprime altitud: lleva su raya y su nombre, pero ninguna cifra de altitud.
    expect(svg.match(/class="iac-perfil__alt/g)?.length).toBe(2 + 1);
    // Y la de Fuerteventura, que acaba en el umbral como punto de frustrada.
    const fv = perfilEnSvg(carta("GCFV", "19"));
    expect(fv).toContain(">MAPt<");
    expect(fv).toContain("3.03° (5.29%)");
    expect(fv).toContain(">SDF<");
  });

  it("el de una en circuito, sin senda: acaba en el punto de frustrada y mide a la cota del aeródromo", () => {
    for (const [oaci, cab, mapt] of [["GCRR", "21", "RR551"], ["GCLA", "18", "LA510"]] as const) {
      const svg = perfilEnSvg(carta(oaci, cab));
      expect(svg, oaci).toContain(">MAPt<");
      expect(svg, oaci).toContain(`>${mapt}<`);
      expect(svg, oaci).toContain("AD ELEV");
      expect(svg, oaci).not.toContain("RDH");
      expect(svg, oaci).not.toContain("°");
      expect(svg, oaci).not.toContain("THR");
    }
  });

  it("los mínimos, «OCA (OCH)» por categoría, con la del avión resaltada", () => {
    const html = tablaDeMinimos(carta("GCXO", "12"), "C");
    expect(html).toContain("<th>OCA (OCH)</th>");
    expect(html).toContain('<th class="iac__suya">C</th>');
    expect(html).toContain('<td class="iac__suya">2719<small>(657)</small></td>');
    expect(html.match(/iac__suya/g)?.length).toBe(1 + carta("GCXO", "12").minimos.length);
    // Las LPV de Canarias, fuera de servicio por su suplemento.
    expect(html).toContain("U/S SUP 159/26");
    expect(supDeLaLpv(carta("GCFV", "01"))).toBeNull();
    // Un helicóptero no tiene columna en estas cartas: nada resaltado.
    expect(tablaDeMinimos(carta("GCXO", "12"), "H")).not.toContain('class="iac__suya"');
  });

  it("donde la carta pone «N.A» se escribe «N.A»; donde ni tiene columna, no hay columna", () => {
    const pj = tablaDeMinimos(carta("SGPJ", "03"), "D");
    expect(pj).toContain('<th class="iac__suya">D</th>');
    expect(pj).toContain('<td class="iac__suya">N.A</td>');
    const en = tablaDeMinimos(carta("SGEN", "20"), "D");
    expect(en).not.toContain(">D</th>");
    expect(en).not.toContain("N.A");
    expect(en).not.toContain("iac__suya\"");
  });

  it("la MSA con su radio, su centro y su altitud; la TAA, como un círculo y con su nota", () => {
    const msa = msaEnSvg(carta("GCXO", "12").msa);
    for (const algo of [">MSA<", ">25 NM ARP<", ">14500<"]) expect(msa).toContain(algo);
    const taa = cartaDeAproximacionDeLaFicha(scenarioById("pettirossi"), "A")!.paginas;
    expect(taa).toContain(">TAA<");
    expect(taa).toContain(">25 NM VURDO<");
    expect(taa).toContain("las tres a 3000 ft y a 25 NM de VURDO");
    // Ni una raya de sector: la carta no da los límites de sus zonas en grados.
    expect(taa).not.toContain("iac-msa__raya");
  });

  it("la frustrada en inglés y tal cual, con su altitud y su techo", () => {
    const html = cartaDeAproximacionDeLaFicha(scenarioById("tenerife-norte"), "A")!.paginas;
    expect(html).toContain(carta("GCXO", "30").frustrada.texto);
    expect(html).toContain("3500 · MAX 6000");
    expect(html).toContain(carta("GCXO", "12").fuente);
  });

  it("la planta pone cada punto con nombre, con su rótulo", () => {
    const rodeos = scenarioById("tenerife-norte");
    const svg = plantaEnSvg(rodeos, "30", carta("GCXO", "30"));
    expect(svg).toContain("BUNIX <tspan");
    expect(svg).toContain("(IF)");
    expect(svg).toContain("XO69E <tspan");
    expect(svg).toContain("(FAP)");
    expect(svg).toContain("iac-planta__pista");
  });
});

describe("la categoría de aproximación de la flota", () => {
  /*
   * PANS-OPS: por la velocidad en el umbral a la masa máxima al aterrizar. Las
   * avionetas, el Twin Otter y el ATR, de la A y la B; el E170, de la C con
   * 124 nudos a su máximo (FAA); y los de largo radio, de la D.
   */
  it("cada avión va a su columna", () => {
    const de = Object.fromEntries(AIRCRAFT.map((a) => [a.id, categoriaDeAproximacion(a)]));
    expect(de).toEqual({
      "jaz-20": "A",
      "jaz-25": "A",
      "jaz-40": "A",
      "jaz-50": "A",
      "jaz-60": "B",
      "jaz-90": "C",
      "jaz-110": "D",
      "jaz-120": "D",
    });
  });
});
