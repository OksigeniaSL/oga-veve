/**
 * **En los ejercicios de radio no se oye ni se ve nada que no sea del
 * ejercicio**, salvo la seguridad (H26f). Volando «Interceptar un radial»
 * salía «Andá a la pista» todo el rato y la torre contaba el tráfico de otros.
 *
 * Dos mitades: la regla, que es pura —qué se calla y en qué ejercicios—, y que
 * `game.ts` la use donde nace cada cosa. El juego no se puede montar sin el
 * navegador, así que esa mitad mira su texto, como `torre-de-cada-vuelo.test.ts`:
 * que la tarjeta de la fase, la torre, la frecuencia y la ventanilla pasen por
 * `loQueCalla`. Lo de verdad, volado, lo miran los tres bancos de radio.
 */
import { describe, expect, it } from "vitest";
import juego from "../game.ts?raw";
import { EJERCICIOS, ejercicioPorId, type EjercicioId } from "./ejercicios";
import { NO_CALLA_NADA, loQueCallaElEjercicio } from "./lo-que-calla-el-ejercicio";

const TODO = { laFase: true, laFrecuencia: true, laTorre: true, laVentanilla: true };
/**
 * Los que se cierran en el aire: los de radio menos el ILS, la deriva, que acaba encima de su puente, el rumbo de noche, encima del río, y la estima, que acaba con el reloj a cero.
 * Y el altímetro que miente, pasada la cima (H26p), y la brújula, con la tarjeta quieta (H26q); y el giróscopo, puesto con ella (H26r).
 */
const DE_RADIO: readonly EjercicioId[] = ["aguja", "radial", "interceptar", "cruce", "deriva", "rumbo", "estima", "altimetro", "brujula", "giroscopo", "pitot"];
/**
 * Los otros que empiezan en el aire: acaban aterrizando, y la pista es suya.
 * También el ILS, que es de radio y acaba en la pista o en la frustrada encima
 * de ella (H26i): la torre y la final son parte de la aproximación.
 */
const ACABAN_EN_LA_PISTA: readonly EjercicioId[] = ["planeo", "un-motor", "despresurizacion", "tormenta", "autorrotacion", "ils"];

describe("lo que calla un ejercicio que no acaba en la pista", () => {
  for (const id of DE_RADIO)
    it(`«${id}»: mientras dura, la fase del plan, la torre, su frecuencia y la ventanilla; cerrado, nada`, () => {
      const e = ejercicioPorId(id);
      expect(e?.acabaEnElAire).toBe(true);
      expect(loQueCallaElEjercicio(e, false)).toEqual(TODO);
      expect(loQueCallaElEjercicio(e, true)).toEqual(NO_CALLA_NADA);
    });

  for (const id of ACABAN_EN_LA_PISTA)
    it(`«${id}» acaba en la pista: «andá a la pista» y la torre son suyos, y no se calla nada`, () => {
      const e = ejercicioPorId(id);
      expect(e).not.toBeNull();
      expect(e?.colocacion, "empieza en el aire").toBeDefined();
      expect(loQueCallaElEjercicio(e, false)).toEqual(NO_CALLA_NADA);
    });

  it("los de radio que se cierran lejos de la pista acaban en el aire, y ninguno más", () => {
    for (const e of EJERCICIOS) expect(e.acabaEnElAire ?? false, e.id).toBe(DE_RADIO.includes(e.id));
    // Todos los de radio menos el ILS, que baja hasta la pista.
    expect(EJERCICIOS.filter((e) => e.escena === "radio" && !DE_RADIO.includes(e.id)).map((e) => e.id)).toEqual(["ils"]);
  });

  it("sin ejercicio, nada", () => {
    expect(loQueCallaElEjercicio(null, false)).toEqual(NO_CALLA_NADA);
    expect(loQueCallaElEjercicio(null, false, true)).toEqual(NO_CALLA_NADA);
  });

  /*
   * H26m: el bimotor en calma, apartado, se fue al aire en los mínimos y la
   * fase dijo «andá a la pista» detrás de la frustrada del ejercicio.
   */
  it("el ILS, desde que pide la frustrada: la fase, y la torre sigue; cerrado, nada", () => {
    const e = ejercicioPorId("ils");
    expect(loQueCallaElEjercicio(e, false, true)).toEqual({ ...NO_CALLA_NADA, laFase: true });
    expect(loQueCallaElEjercicio(e, true, true)).toEqual(NO_CALLA_NADA);
    // Y uno de los que acaban en el aire no calla menos por irse al aire.
    expect(loQueCallaElEjercicio(ejercicioPorId("radial"), false, true)).toEqual(TODO);
  });

  it("el juego le dice cuándo el ILS está pidiendo la frustrada", () => {
    expect(juego).toMatch(/loQueCallaElEjercicio\(this\.ejercicioDeHoy, [^;]*this\.ils\?\.fase === "frustrando"\)/);
  });
});

/** El cuerpo de un método de `game.ts`, de su firma a la llave que lo cierra. */
function cuerpoDe(firma: RegExp): string {
  const m = firma.exec(juego);
  if (!m) return "";
  let hondo = 0;
  const desde = juego.indexOf("{", m.index + m[0].length - 1);
  for (let i = desde; i < juego.length; i++) {
    if (juego[i] === "{") hondo++;
    else if (juego[i] === "}" && --hondo === 0) return juego.slice(desde, i + 1);
  }
  return "";
}

describe("y el juego lo calla donde nace cada cosa", () => {
  it("la tarjeta, la voz y el rótulo de la fase: callada mientras manda el ejercicio", () => {
    const cuerpo = cuerpoDe(/\n {2}private avanzarPlan\(dt: number\): void \{/);
    expect(cuerpo, "no se encontró avanzarPlan en game.ts").not.toBe("");
    expect(cuerpo).toMatch(/const callada =[^;]*this\.loQueCalla\.laFase/);
  });

  it("la torre no te habla", () => {
    const cuerpo = cuerpoDe(/\n {2}private hayTorreQueHable\(\): boolean \{/);
    expect(cuerpo, "no se encontró hayTorreQueHable en game.ts").not.toBe("");
    expect(cuerpo).toMatch(/!this\.loQueCalla\.laTorre/);
  });

  it("la frecuencia del campo no se oye, pero su tráfico sigue volando", () => {
    const cuerpo = cuerpoDe(/\n {2}private oirElCampo\(dt: number\): void \{/);
    expect(cuerpo, "no se encontró oirElCampo en game.ts").not.toBe("");
    expect(cuerpo).toMatch(/const seOye =[^;]*!this\.loQueCalla\.laFrecuencia/);
    // El turno se sigue oyendo: es lo que mueve el tráfico del circuito.
    expect(cuerpo).toMatch(/this\.turno\.oir\(/);
  });

  it("y por la ventanilla no se señala nada", () => {
    const cuerpo = cuerpoDe(/\n {2}private momentoDeMirar\(\): MomentoDeMirar \{/);
    expect(cuerpo, "no se encontró momentoDeMirar en game.ts").not.toBe("");
    expect(cuerpo).toMatch(/this\.loQueCalla\.laVentanilla/);
  });
});
