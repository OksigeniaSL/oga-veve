/**
 * **Un avión de línea que el campo admite aparca en un puesto de línea**, en
 * todos los campos (#195).
 *
 * Un avión de línea sale y llega a un puesto con sitio para sus alas —ver
 * `puestosDeLinea` en `plan-de-vuelo.ts`—, y si no encontraba ninguno se iba a
 * la regla de la avioneta: el tercio de puestos más lejos de los edificios,
 * que es la de quien busca la plataforma de aviación general. Medido antes de
 * arreglarlo, con la cuenta del propio juego, caían ahí ocho pares de campo y
 * avión que `cabeEn` daba por buenos:
 *
 *   El Hierro (GCHI)            JAZ 50, 60 y 90
 *   Encarnación (SGEN)          JAZ 50, 60 y 90
 *   Pedro Juan Caballero (SGPJ) JAZ 50 y 90
 *
 * Y por dos motivos, ninguno de los cuales es que el campo no admita el avión:
 *
 * - **En El Hierro, los puestos alternativos contaban como vecinos.** Su AIP
 *   publica seis puestos, 1, 1A, 2, 2A, 3 y 3A, todos con «MAX SPAN 28.6 m», y
 *   de cada pareja dice que es incompatible con la otra: «1 … INCOMP. 1A». Son
 *   tres huecos en dos versiones cada uno. OpenStreetMap los trae, más un
 *   «1A - 1» en medio de cada pareja, y la regla los contaba como aviones a
 *   la vez a doce metros. Ver `huecoDeLaRef`.
 * - **En Encarnación y en Pedro Juan Caballero, la plataforma es pequeña.** Su
 *   AIP no publica puestos —«Uso de signos ID en los puestos de las aeronaves:
 *   NIL», AD 2.5-9 y AD 2.4-9—: los cuatro y los tres que hay los pintó el
 *   juego a mano, a veinte y veinticuatro metros. Ahí el avión grande ocupa uno
 *   y deja libre el de al lado, y el tráfico no aparca luego a su lado. Ver
 *   `ComoAparcaDeLinea`.
 *
 * Si algún día un campo no admite un avión ni así, lo tiene que decir
 * `cabeEn`, y el hangar no ofrecerlo; esto lo vigila.
 */
import { describe, expect, it } from "vitest";
import { sinTorre, type Aerodrome } from "./aerodrome";
import { huecoDeLaRef, PlanDeVuelo, type ComoAparcaDeLinea } from "./plan-de-vuelo";
import { conSuAerodromo, SCENARIOS, type Scenario } from "./scenarios";
import { sueloDelTrafico, MARGEN_EN_EL_PUESTO } from "./suelo-del-trafico";
import { crearTrafico, tiposDelCampo, TIPOS } from "./trafico";
import { AIRCRAFT } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import { esDeLinea } from "../flight/velocidades-en-tierra";
import { RETENIDO } from "../flight/radio";

const DE_LINEA = AIRCRAFT.filter(esDeLinea);
const de = (id: string) => AIRCRAFT.find((a) => a.id === id)!;

/** Un escenario por aeródromo, con su aeródromo cargado. */
async function unoPorCampo(): Promise<Scenario[]> {
  const vistos = new Set<string>();
  const lista: Scenario[] = [];
  for (const e of await Promise.all(SCENARIOS.map(conSuAerodromo))) {
    if (!e.aerodrome || vistos.has(e.aerodrome.id)) continue;
    vistos.add(e.aerodrome.id);
    lista.push(e);
  }
  return lista;
}

describe("el hueco de un puesto, por su ref", () => {
  it("las dos versiones de un puesto son el mismo hueco", () => {
    expect(huecoDeLaRef("1")).toBe("1");
    expect(huecoDeLaRef("1A")).toBe("1");
    expect(huecoDeLaRef("1A - 1")).toBe("1");
    expect(huecoDeLaRef("12b")).toBe("12");
  });
  it("y lo demás, el suyo o ninguno", () => {
    expect(huecoDeLaRef("H43")).toBe("H43");
    expect(huecoDeLaRef("R40")).toBe("R40");
    // Dos números distintos no son un hueco.
    expect(huecoDeLaRef("2A - 3")).toBeNull();
    expect(huecoDeLaRef(null)).toBeNull();
    expect(huecoDeLaRef("")).toBeNull();
  });
});

describe("ningún avión de línea que el campo admite cae en la regla de la avioneta", async () => {
  const campos = await unoPorCampo();

  it("hay campos que mirar", () => {
    expect(campos.length).toBeGreaterThan(15);
  });

  for (const esc of campos) {
    it(esc.aerodrome!.id, () => {
      const aero = esc.aerodrome as Aerodrome;
      for (const avion of DE_LINEA) {
        if (!cabeEn(avion, campoDe(esc)).cabe) continue;
        const plan = new PlanDeVuelo(aero, esc.runway, () => 0, avion);
        expect(plan.comoAparcaDeLinea(), `${aero.id} · ${avion.id}`).not.toBe("de-avioneta");
      }
    });
  }

  it("y los de #195, cada uno como le toca", async () => {
    const porId = new Map(campos.map((e) => [e.aerodrome!.id, e]));
    const como = (campo: string, avion: string): ComoAparcaDeLinea | null => {
      const esc = porId.get(campo)!;
      return new PlanDeVuelo(esc.aerodrome!, esc.runway, () => 0, de(avion)).comoAparcaDeLinea();
    };
    // El Hierro: con los alternativos como un solo hueco, hay sitio de verdad.
    for (const a of ["jaz-50", "jaz-60", "jaz-90"]) expect(como("GCHI", a), a).toBe("con-sitio");
    // Encarnación y Pedro Juan Caballero: uno sí y el de al lado no.
    for (const a of ["jaz-50", "jaz-60", "jaz-90"]) expect(como("SGEN", a), a).toBe("deja-libre-el-de-al-lado");
    expect(como("SGPJ", "jaz-50")).toBe("deja-libre-el-de-al-lado");
    expect(como("SGPJ", "jaz-90")).toBe("deja-libre-el-de-al-lado");
    // El JAZ 60, de diecisiete metros y medio, sí cabe entre el 2 y el 3.
    expect(como("SGPJ", "jaz-60")).toBe("con-sitio");
  });

  /*
   * **Y lo que publica el AIP de El Hierro**, AD 2-GCHI PDC 1-2, AIRAC AMDT
   * 05/26: los seis puestos con «MAX SPAN 28.6 m». Los de línea que se
   * ofrecen ahí tienen que caber en esa envergadura; si un día se ofrece uno
   * más ancho, es `cabeEn` quien tiene que decir que no.
   */
  it("en El Hierro, los que se ofrecen caben en la envergadura de sus puestos", () => {
    const esc = campos.find((e) => e.aerodrome!.id === "GCHI")!;
    const ofrecidos = DE_LINEA.filter((a) => cabeEn(a, campoDe(esc)).cabe);
    expect(ofrecidos.map((a) => a.id).sort()).toEqual(["jaz-50", "jaz-60", "jaz-90"]);
    for (const a of ofrecidos) expect(a.wingSpan, a.id).toBeLessThanOrEqual(28.6);
  });
});

describe("en una plataforma pequeña, el ala se mide contra los puestos ocupados", async () => {
  const campos = await unoPorCampo();
  const encarnacion = campos.find((e) => e.aerodrome!.id === "SGEN")!;
  const aero = encarnacion.aerodrome!;
  const jaz90 = de("jaz-90");
  /** La semiala del turbohélice del tráfico, el que aterriza en Encarnación. */
  const SEMIALA = TIPOS.turbohelice.envergadura / 2;

  it("tu plan no sale del puesto de al lado de uno del tráfico", () => {
    const solo = new PlanDeVuelo(aero, encarnacion.runway, () => 0, jaz90);
    const [x, z] = solo.arranque()!;
    const plan = new PlanDeVuelo(aero, encarnacion.runway, () => 0, jaz90);
    plan.puestosDelTrafico = () => [{ xy: [x, -z], semiala: SEMIALA }];
    const otro = plan.arranque()!;
    expect(Math.hypot(otro[0] - x, otro[1] - z)).toBeGreaterThanOrEqual(
      jaz90.wingSpan / 2 + SEMIALA + MARGEN_EN_EL_PUESTO,
    );
  });

  /** El tráfico en un campo con tu JAZ 90 en su puesto: dónde aparca cada uno. */
  const conTuAvion = (id: string, cuantos: 1 | 2) => {
    const esc = campos.find((e) => e.aerodrome!.id === id)!;
    const campo = esc.aerodrome!;
    const tipos = tiposDelCampo(campo.id, esc.runway.length, sinTorre(campo));
    expect(tipos.length, `${id} sin tráfico`).toBeGreaterThan(0);
    const plan = new PlanDeVuelo(campo, esc.runway, () => 0, jaz90);
    const [x, z] = plan.arranque()!;
    const tuPuesto = { x, z, semiala: jaz90.wingSpan / 2 };
    const cota = campo.elevationM ?? 0;
    const suelo = sueloDelTrafico(campo, esc.runway, campo.runways[0]?.widthM ?? 45);
    const trafico = crearTrafico(esc.runway, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos,
      tierra: () => (suelo ? { suelo, alto: () => cota, evitar: [{ x, z }], tuPuesto } : null),
    });
    // Uno recién aterrizado camino del suyo y, si son dos, otro retenido en el suyo.
    if (cuantos === 2) trafico.anuncia("EC-AAA", RETENIDO);
    trafico.anuncia("EC-BBB", "otro.pistaLibre", true);
    const con = trafico
      .porDentro()
      .map((q) => ({ m: q.matricula, p: q.puesto, ala: TIPOS[q.tipo].envergadura / 2 }))
      .filter((q) => q.p)
      .map((q) => ({ ...q, lejos: Math.hypot(q.p!.x - x, q.p!.z - z) }));
    trafico.dispose();
    expect(con.length, `${id}: nadie del tráfico con puesto`).toBe(cuantos);
    return { con, tuPuesto };
  };

  /*
   * **Y el tráfico no aparca al lado del tuyo.** Se apartaba ochenta metros de
   * tu puesto y, si no quedaba ninguno tan lejos —en Encarnación los cuatro
   * caen dentro—, cogía cualquiera, el tuyo incluido.
   */
  for (const [id, cuantos] of [["SGEN", 1], ["SGPJ", 1], ["GCHI", 1]] as const) {
    it(`el tráfico deja sitio a tus alas en ${id}`, () => {
      const { con, tuPuesto } = conTuAvion(id, cuantos);
      for (const q of con)
        expect(q.lejos, `${id} · ${q.m}: sus alas y las tuyas`).toBeGreaterThanOrEqual(
          q.ala + tuPuesto.semiala + MARGEN_EN_EL_PUESTO,
        );
    });
  }

  /*
   * **Y con la plataforma llena, al menos no dentro de tu avión.** En
   * Encarnación, contigo en el 2, solo el 4 deja sitio a unas alas más; con uno
   * del tráfico en él, el segundo no tiene un puesto bueno, y cogía el tuyo.
   * Un campo así no recibe tres aviones de línea a la vez, y la frecuencia
   * tampoco se los manda; esto es la red por si pasa. Ver `lejosDe` en
   * `suelo-del-trafico.ts`.
   */
  it("con la plataforma llena, el tráfico no aparca en tu puesto", () => {
    const { con } = conTuAvion("SGEN", 2);
    for (const q of con) expect(q.lejos, q.m).toBeGreaterThan(5);
  });
});
