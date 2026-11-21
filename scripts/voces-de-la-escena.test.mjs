/**
 * **Lo que los bancos de pasaje dan por dicho por la escena**, contra la clave que pone el juego
 * (H52). Ver `voces-de-la-escena.mjs`.
 *
 * El banco del vuelo largo daba un rojo en el tercer capítulo: «ni otra voz que no sea de la
 * escena», con `llamada:comandante.aproximacion` y `llamada:tripulacion.llegada`. Eran el tono de
 * cabina de los dos anuncios de su guion que lo llevan, que desde H29k pide turno en la boca con
 * esa clave; el juego no decía nada de más, y el banco de la tercera escena ya lo sabía. Esto mira
 * los anuncios de los cuatro guiones de pasaje con la clave de su llamada tal como la monta el juego:
 * si la llamada cambia de forma, falla aquí y no en media hora de banco.
 */
import { describe, expect, it } from "vitest";
import { laLlamadaDe, llamadaAntesDe } from "../src/audio/tonos-de-cabina";
import { GUION_LLEGADA_A_ASUNCION } from "../src/flight/guion-llegada-a-asuncion";
import { GUION_NOCHE_DE_MADRID } from "../src/flight/guion-noche-de-madrid";
import { GUION_NOCHE_SOBRE_EL_MAR } from "../src/flight/guion-noche-sobre-el-mar";
import { GUION_TENERIFE_LA_PALMA } from "../src/flight/guion-tenerife-la-palma";
import { esDeLaEscena, llamadasConLoDeDetras, sinLaHora, vocesAjenas } from "./voces-de-la-escena.mjs";

const GUIONES = {
  "Tenerife Norte – La Palma": GUION_TENERIFE_LA_PALMA,
  "la noche de Madrid": GUION_NOCHE_DE_MADRID,
  "la noche sobre el mar": GUION_NOCHE_SOBRE_EL_MAR,
  "la llegada a Asunción": GUION_LLEGADA_A_ASUNCION,
};

/** Los anuncios de un guion que llevan la llamada de cabina delante, por la clave que pone el juego. */
const conLlamada = (guion) =>
  [...guion.momentos, ...guion.charlas]
    .flatMap((m) => m.lineas ?? [])
    .filter((l) => l.megafonia && llamadaAntesDe(l.clave) !== null)
    .map((l) => l.clave);

describe("lo que los bancos de pasaje dan por dicho por la escena (H52)", () => {
  it("el tercer capítulo lleva los dos anuncios con llamada que dieron el rojo", () => {
    expect(conLlamada(GUION_LLEGADA_A_ASUNCION)).toEqual(
      expect.arrayContaining(["comandante.aproximacion", "tripulacion.llegada"]),
    );
  });

  for (const [nombre, guion] of Object.entries(GUIONES)) {
    it(`en ${nombre}, la llamada de cada anuncio es de la escena si su anuncio suena detrás`, () => {
      for (const anuncio of conLlamada(guion)) {
        // Con sus formas detrás, como las pone `loQueDiceLaMegafonia`: la llamada es la del anuncio entero.
        for (const clave of [anuncio, `${anuncio}~2`, `${anuncio}@pettirossi`]) {
          const llamada = laLlamadaDe(clave);
          expect(esDeLaEscena(llamada), llamada).toBe(true);
          expect(vocesAjenas([`10.0s ${llamada}`, `11.6s ${clave}`]), llamada).toEqual([]);
          // Y la voz con la receta del día detrás, que la llamada no lleva.
          expect(vocesAjenas([`10.0s ${laLlamadaDe(anuncio)}`, `11.6s ${clave}`]), clave).toEqual([]);
        }
      }
    });
  }

  it("lo hablado del rojo, con su anuncio detrás de cada llamada, no tiene nada ajeno", () => {
    // Las dos llamadas del banco, cada una con la voz que sonó a continuación, tal como salieron.
    const habladas = [
      "750.0s inicio.ara.pasaje.bostezo",
      "752.4s llamada:comandante.aproximacion",
      "754.8s comandante.aproximacion",
      "835.0s comandante.llegada",
      "840.3s llamada:tripulacion.llegada",
      "842.7s tripulacion.llegada@tripulacion.bienvenidos.pettirossi-tripulacion.trasLaToma~3",
      "850.0s comandante.largo.llegada.invierno",
      "855.0s ventanilla",
    ];
    expect(vocesAjenas(habladas)).toEqual([]);
    expect(llamadasConLoDeDetras(habladas)).toEqual([
      "752.4s llamada:comandante.aproximacion → comandante.aproximacion",
      "840.3s llamada:tripulacion.llegada → tripulacion.llegada@tripulacion.bienvenidos.pettirossi-tripulacion.trasLaToma~3",
    ]);
  });

  it("y sigue viendo lo ajeno: la radio, la instructora, la cabina y un tono que no es el de lo que suena", () => {
    const habladas = [
      "1.0s torre.autorizadoAterrizar",
      "2.0s vuelo.flapsDeAterrizaje",
      "3.0s cabina.minimums",
      "4.0s llamada:comandante.aproximacion",
      "5.6s inicio.ara.pasaje.bostezo",
      "7.0s llamada:tripulacion.llegada",
      "9.0s llamada:vuelo.algo",
      "10.6s vuelo.algo",
    ];
    expect(vocesAjenas(habladas).map(sinLaHora)).toEqual([
      "torre.autorizadoAterrizar",
      "vuelo.flapsDeAterrizaje",
      "cabina.minimums",
      // Otra voz detrás de su tono, y un tono sin nada detrás: ninguno es el anuncio de nadie.
      "llamada:comandante.aproximacion",
      "llamada:tripulacion.llegada",
      "llamada:vuelo.algo",
      "vuelo.algo",
    ]);
  });

  it("lo descartado se mira por la clave que lleva delante del porqué", () => {
    expect(esDeLaEscena(sinLaHora("12.0s llamada:comandante.aproximacion: ya no es verdad"))).toBe(true);
    expect(esDeLaEscena(sinLaHora("12.0s torre.autorizadoAterrizar: la boca es de la escena"))).toBe(false);
  });
});
