/**
 * **El viento cruzado que ha demostrado cada avión**, el número que se mira
 * antes de salir.
 *
 * Todo manual de vuelo trae una línea así: el viento de costado más fuerte con
 * el que el fabricante despegó y aterrizó en las pruebas de certificación.
 * No es una prohibición —el propio manual dice que no se considera
 * limitativo—, pero es **lo que se sabe que ese avión aguanta**, y la regla
 * de quien vuela es no salir a comprobar lo que no se sabe. Enrique lo pidió
 * como el punto 129 de la lista: «decidir si se sale: mirar el tiempo antes y
 * a veces decidir que hoy no».
 *
 * Cada cifra es la del avión de referencia de su ficha —ver
 * `flight/ficha-tecnica.ts`—, con su fuente al lado. Lo que no se ha podido
 * leer en una fuente no se inventa: sale de la regla de certificación, que
 * también es una cifra de verdad.
 *
 * En nudos, porque así lo trae el METAR y así lo dice el manual; la cuenta
 * con el viento la hace `flight/parte-de-salida.ts` en las mismas unidades.
 */

import { velocidadDePerdida, type AircraftConfig } from "./aircraft";

/** Un viento cruzado demostrado, con de dónde se leyó. */
export interface CruzadoDemostrado {
  /** Nudos, medidos como el viento del METAR: a diez metros del suelo. */
  readonly kt: number;
  /** El documento del que sale. Para el comentario y la prueba. */
  readonly fuente: string;
}

/**
 * Por avión. Ver la cabecera.
 *
 * Del biplano no se ha encontrado la cifra del manual del Ag Cat, y no está:
 * para él manda la regla de certificación de `cruzadoDemostrado`. Tampoco la
 * del Beech 1900D, desde que el JAZ 60 es ese avión (ADR 0027): llevaba los
 * veinticinco nudos del manual del Twin Otter, y el 1900D se certificó con la
 * misma regla de los aviones pequeños que manda aquí.
 */
export const CRUZADO_DEMOSTRADO: Readonly<Record<string, CruzadoDemostrado>> = {
  "jaz-20": {
    kt: 15,
    // «Maximum demonstrated crosswind velocity is 15 knots (not a limitation).»
    fuente: "Cessna 172R, manual de vuelo, sección 4",
  },
  "jaz-40": {
    kt: 17,
    fuente: "Piper PA-34-200T Seneca II, manual de vuelo (1976, rev. 1979), sección 4",
  },
  "jaz-50": {
    /*
     * Los veinticinco nudos que llevaba el JAZ 60 cuando volaba con el ala del
     * Twin Otter, y ahora con su cita: «Adequate controllability during landing
     * has been demonstrated using full flap extension (37.5° flap) in crosswind
     * components up to 25 KIAS measured at a tower height of 33 feet … and is
     * not considered limiting», el manual de un DHC-6 Series 310 que reproduce
     * la AAIB (*Bulletin* 8/2017, G-BVVK, p. 18). A treinta y tres pies, que es
     * donde lo mide el METAR. El de 1973 decía lo mismo medido a seis pies,
     * veinte nudos (TSB, A13A0033, nota 2).
     */
    kt: 25,
    fuente: "DHC-6 Twin Otter Series 310, manual de vuelo, citado por la AAIB (Bulletin 8/2017, G-BVVK)",
  },
  "jaz-90": {
    kt: 28,
    fuente: "Embraer 170, manual de vuelo (AFM), «maximum demonstrated crosswind»",
  },
  "jaz-120": {
    kt: 30,
    fuente: "Boeing 747, manual de vuelo: viento cruzado demostrado al aterrizar",
  },
};

/**
 * **La regla de certificación**, para el avión cuyo manual no se ha leído.
 *
 * Todo avión certificado tiene que haber demostrado, como poco, un viento de
 * costado de dos décimas de su velocidad de pérdida en aterrizaje: es la regla
 * de las normas de aeronavegabilidad de los aviones ligeros (14 CFR 23.233 en
 * su redacción de siempre, y la CAR 3 antes). Es el suelo de lo que se sabe
 * que aguanta, no una cifra a ojo.
 */
export const FRACCION_DE_CERTIFICACION = 0.2;

/** El viento cruzado demostrado de este avión, en nudos. */
export function cruzadoDemostrado(a: AircraftConfig): CruzadoDemostrado {
  const suyo = CRUZADO_DEMOSTRADO[a.id];
  if (suyo) return suyo;
  const vso = velocidadDePerdida(a) / 0.514444;
  return {
    kt: Math.round(FRACCION_DE_CERTIFICACION * vso),
    fuente: "14 CFR 23.233: 0,2 de la velocidad de pérdida en aterrizaje",
  };
}
