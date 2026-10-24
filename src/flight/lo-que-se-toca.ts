/**
 * **La ventanilla viva: lo que se toca por el cristal de Ara y quién lo
 * cuenta.**
 *
 * Decisión de Enrique del 19-10-2026, para que en casa el vuelo no aburra:
 * que Ara **haga cosas** en vez de esperar. Con el dedo o el ratón, sobre la
 * vista de Ara, se toca lo que se ve —el Teide, La Gomera, el mar de nubes,
 * el ala, el motor, La Palma, la ladera de Mazo al llegar, el mar— y te lo
 * cuentan.
 *
 * Aquí está la mitad que no sabe de geometría: **qué se dice de cada cosa y
 * quién lo dice**. Si de verdad se ve por el cristal lo decide el juego antes
 * de llamar a la escena, con la misma cuenta que usa la escena para nombrar
 * —ver `world/se-ve-desde-el-pasaje.ts` y `tocarLaVentanillaViva` en
 * `game.ts`—: lo que no se ve no llega aquí, y un toque sobre algo tapado no
 * dice nada falso. Cuándo se dice lo decide la escena, con sus turnos: ver
 * `VueloDePasaje.tocar`.
 *
 * ## Quién contesta
 *
 * - **Ara reacciona**, con su voz: lo que se dice viendo algo así.
 * - **La lámina**, con su ilustración si la hay: el motor por dentro, el ala,
 *   la nube, los volcanes que salieron del mar, el silbo de La Gomera, los
 *   telescopios de La Palma. Es la explicación que no necesita a nadie.
 * - **La tripulante en persona, si está a mano**: del servicio a la cabina
 *   preparada anda por el pasillo, y lo que ya tiene preparado para contar
 *   —el motor, las islas, las estrellas de La Palma— lo cuenta ahora, porque
 *   Ara lo está señalando. Lo que cuenta aquí ya no lo vuelve a contar
 *   después: ver `charlas`.
 * - **La comandante, nunca.** No le contesta a un pasajero por la megafonía,
 *   y por debajo de los diez mil pies o rodando, ni a nadie de nada que no
 *   sea el vuelo: la cabina estéril.
 *
 * Todo lo que se dice está grabado ya salvo cuatro frases de Ara —la
 * invitación, el motor, La Gomera y el mar—: lo de Ara viendo el Teide, la
 * isla, Mazo o el mar de nubes son sus frases de la escena, y lo de la
 * tripulante, sus charlas de siempre.
 *
 * ## Sin repetir
 *
 * Una frase dicha en el vuelo no se dice otra vez, la diga quien la diga:
 * si la escena ya contó el mar de nubes, tocarlo después enseña su lámina y
 * su aro, sin voz. Y lo que se toca dos veces se cuenta una.
 */

import type { Linea } from "./conversacion";

/**
 * **Lo que se puede tocar por la ventanilla.** Las dos piezas del avión que
 * se ven desde el asiento de Ara —ver `world/asiento-de-ara.ts`—, el mar y
 * el mar de nubes de debajo, y los sitios del paisaje con su nombre de la
 * escena: los hitos, la isla de llegada y la ladera de Mazo. Ver
 * `SitioDelPaisaje` en `flight/inicio-pasaje.ts`.
 */
export type Tocable =
  | "motor"
  | "ala"
  | "mar"
  | "nubes"
  | "isla-de-llegada"
  | "ladera-de-mazo"
  | `hito:${string}`;

/**
 * **Los sellos del cuaderno de viaje**: uno por cada cosa que el vuelo de
 * verdad enseña y se ve, tocada en la ventanilla o nombrada por la escena
 * cuando se veía. Los de Enrique, tal cual: el Teide, el mar de nubes, La
 * Gomera, el motor, el ala con sus flaps, las ruedas, La Palma y Mazo. Ver
 * `flight/sellos-del-viaje.ts`, que es quien los guarda.
 *
 * El orden es el del vuelo, que es el de la página: lo que se ve sentado en
 * el puesto, lo de la subida, lo de la bajada y lo de la llegada.
 */
export const SELLOS_DEL_VIAJE = ["motor", "ala", "nubes", "teide", "gomera", "palma", "ruedas", "mazo"] as const;

export type SelloDelViaje = (typeof SELLOS_DEL_VIAJE)[number];

export const esSelloDelViaje = (x: unknown): x is SelloDelViaje =>
  typeof x === "string" && (SELLOS_DEL_VIAJE as readonly string[]).includes(x);

/**
 * **El sello que da cada hito**, por su clave. El Tajogaite está en La Palma:
 * verlo es ver La Palma. El Hierro, Anaga o La Orotava se cuentan, pero no
 * están en el cuaderno de este vuelo: desde la ventanilla de Ara, con el mar
 * de nubes de siempre, casi nunca se ven.
 */
const SELLO_DEL_HITO: Readonly<Record<string, SelloDelViaje>> = {
  teide: "teide",
  garajonay: "gomera",
  taburiente: "palma",
  tajogaite: "palma",
};

/** El sello que da tocar o ver algo, si da alguno. */
export function selloDe(que: Tocable): SelloDelViaje | null {
  switch (que) {
    case "motor":
      return "motor";
    case "ala":
      return "ala";
    case "nubes":
      return "nubes";
    case "isla-de-llegada":
      return "palma";
    case "ladera-de-mazo":
      return "mazo";
    case "mar":
      return null;
    default:
      return SELLO_DEL_HITO[que.slice(5)] ?? null;
  }
}

/**
 * **La lámina de cada cosa**: el dibujo de la ventanita —ver
 * `ui/dibujos-del-pasaje.ts`—, que sale con su ilustración si la tiene. El
 * motor por dentro, el ala que empuja el aire, la nube, las islas que fueron
 * volcanes en el fondo del mar —la ilustración del Teide en corte—, el silbo
 * de La Gomera y los telescopios de La Palma. El mar y Mazo no tienen: se
 * cuentan sin lámina.
 */
export function laminaDe(que: Tocable): string | null {
  switch (que) {
    case "motor":
      return "motor";
    case "ala":
      return "ala";
    case "nubes":
      return "nube";
    case "isla-de-llegada":
    case "hito:taburiente":
      return "estrellas";
    case "hito:teide":
      return "islas";
    case "hito:garajonay":
      return "gomera";
    default:
      return null;
  }
}

/** Lo que hace falta saber del vuelo para elegir qué se dice. */
export interface AlTocar {
  /** Si la tripulante anda por el pasillo y la cabina no está preparada: si puede venir. */
  readonly conLaTripulante: boolean;
  /** Si una frase ya se pidió en este vuelo, la dijera quien la dijera. */
  readonly yaDicha: (clave: string) => boolean;
  /** Si una charla de la escena ya se contó. */
  readonly charlaContada: (id: string) => boolean;
  /** Altitud, m, y la capa de nubes de hoy: lo que hace verdad cada frase. */
  readonly altitud: number;
  readonly nubes: { readonly base: number; readonly techo: number } | null;
  /** Si va en la final: entonces, una frase y corta, que la llegada no espera. */
  readonly enLaFinal: boolean;
  /** Lo que falta para tocar, m, y la altura, m: la isla «ya cerquita» es verdad cerca. */
  readonly faltaParaTocar: number;
  readonly altura: number;
}

/** Lo que se dice al tocar algo, y las charlas de la escena que con eso ya se contaron. */
export interface LoQueSeDiceAlTocar {
  readonly lineas: readonly Linea[];
  readonly charlas: readonly string[];
}

const ara = (clave: string, dibujo?: string | null): Linea => ({
  quien: "ara",
  clave: `inicio.ara.pasaje.${clave}`,
  ...(dibujo ? { dibujo } : {}),
});
const tripulante = (clave: string, dibujo: string): Linea => ({
  quien: "tripulacion",
  clave: `inicio.tripulacion.pasaje.cerca.${clave}`,
  dibujo,
});

/**
 * **Lo que cuenta la tripulante de cada cosa**, si está a mano y no lo contó
 * ya: sus charlas de la escena, tal cual y con su dibujo. El motor, con Ara
 * mirándolo; las islas, que salieron del fondo del mar, con el Teide o La
 * Gomera delante; y los telescopios de lo alto de La Palma, con La Palma.
 */
const DE_LA_TRIPULANTE: Readonly<Record<string, { readonly charla: string; readonly lineas: readonly Linea[] }>> = {
  motor: {
    charla: "tcpMotor",
    lineas: [tripulante("motor1", "motor"), tripulante("motor2", "motor"), ara("secador", "motor")],
  },
  islas: {
    charla: "tcpIslas",
    lineas: [tripulante("islas1", "islas"), tripulante("islas2", "islas"), ara("islas", "islas")],
  },
  estrellas: {
    charla: "tcpEstrellas",
    lineas: [tripulante("estrellas", "estrellas"), ara("estrellas", "estrellas")],
  },
};

/** La primera frase de Ara de esas que todavía no se ha dicho, con su lámina. */
function laPrimeraSinDecir(claves: readonly string[], c: AlTocar, dibujo: string | null): Linea | null {
  for (const k of claves) if (!c.yaDicha(`inicio.ara.pasaje.${k}`)) return ara(k, dibujo);
  return null;
}

/**
 * **Lo que se dice al tocar algo que se ve**, o `null` si ya no queda nada
 * por decir de eso —se enseña su lámina y su aro, sin voz—.
 *
 * Cada frase de Ara tiene que ser verdad con lo que se ve: «la punta sale
 * por encima de las nubes» solo con nubes por debajo de la cumbre; «el mar
 * parece quietito» desde alto; «la isla ya está cerquita», cerca.
 */
export function loQueSeDiceAlTocar(que: Tocable, c: AlTocar): LoQueSeDiceAlTocar | null {
  const lamina = laminaDe(que);
  const conCharla = (de: keyof typeof DE_LA_TRIPULANTE, antes: Linea | null): LoQueSeDiceAlTocar | null => {
    const t = DE_LA_TRIPULANTE[de]!;
    const puede = c.conLaTripulante && !c.enLaFinal && !c.charlaContada(t.charla) && !t.lineas.some((l) => c.yaDicha(l.clave));
    if (puede) return { lineas: [...(antes ? [antes] : []), ...t.lineas], charlas: [t.charla] };
    return antes ? { lineas: [antes], charlas: [] } : null;
  };
  switch (que) {
    case "motor": {
      // Con la tripulante, lo cuenta ella mirándolo con Ara; sin ella, Ara lo que sabe.
      const t = conCharla("motor", null);
      if (t) return t;
      const suya = laPrimeraSinDecir(["toque.motor"], c, lamina);
      return suya ? { lineas: [suya], charlas: [] } : null;
    }
    case "ala": {
      // La del kit: «empuja el aire para abajo, y el aire la empuja para arriba».
      const suya = laPrimeraSinDecir(["kit.piezas.ala"], c, lamina);
      return suya ? { lineas: [suya], charlas: [] } : null;
    }
    case "nubes": {
      const suya = laPrimeraSinDecir(["marDeNubes"], c, lamina);
      return suya ? { lineas: [suya], charlas: ["marDeNubes"] } : null;
    }
    case "mar": {
      const posibles = [
        ...(c.enLaFinal ? ["cerquita"] : []),
        ...(c.altitud > 2000 ? ["marQuieto"] : []),
        "toque.mar",
      ];
      const suya = laPrimeraSinDecir(posibles, c, null);
      if (!suya) return null;
      const charlas = suya.clave.endsWith(".marQuieto") ? ["marQuieto"] : suya.clave.endsWith(".cerquita") ? ["cerquita"] : [];
      return { lineas: [suya], charlas };
    }
    case "ladera-de-mazo": {
      // Lo de la charla de la final, entero si cabe: el nombre lo dice la comandante en tierra.
      if (c.charlaContada("mazo") || c.yaDicha("inicio.ara.pasaje.mazo")) return null;
      return { lineas: [ara("mazo"), ara("mazoBici")], charlas: ["mazo"] };
    }
    case "isla-de-llegada":
    case "hito:taburiente": {
      const cerca = c.faltaParaTocar < 38_000 && c.altura < 1400;
      const suya = laPrimeraSinDecir(cerca ? ["islaCerca", "isla"] : ["isla"], c, lamina);
      return conCharla("estrellas", suya);
    }
    case "hito:teide": {
      const sobreLasNubes = !!c.nubes && c.nubes.techo < 3500;
      const suya = laPrimeraSinDecir(sobreLasNubes ? ["teide", "loVeo"] : ["loVeo"], c, lamina);
      return conCharla("islas", suya);
    }
    case "hito:garajonay": {
      const suya = laPrimeraSinDecir(["toque.gomera"], c, lamina);
      return conCharla("islas", suya);
    }
    case "hito:orotava": {
      const suya = laPrimeraSinDecir(["orotava", "loVeo"], c, null);
      return suya ? { lineas: [suya], charlas: [] } : null;
    }
    default: {
      // Lo demás del paisaje que el juego tiene como hito: Ara lo ve, y la lámina no tiene qué enseñar.
      const suya = laPrimeraSinDecir(["loVeo"], c, null);
      return suya ? { lineas: [suya], charlas: [] } : null;
    }
  }
}

/**
 * **La invitación**, una vez por vuelo y sin leer: Ara le dice a quien va a
 * su lado que puede tocar lo que se ve. La acompaña el aro suave sobre algo
 * que se puede tocar: ver `AroEnElMundo`.
 */
export const LA_INVITACION: Linea = ara("toque.invita");

/** Las frases nuevas de la ventanilla viva: para la lista de grabar y las pruebas. */
export const LINEAS_DE_LA_VENTANILLA_VIVA: readonly Linea[] = [
  LA_INVITACION,
  ara("toque.motor", laminaDe("motor")),
  ara("toque.gomera", laminaDe("hito:garajonay")),
  ara("toque.mar"),
];
