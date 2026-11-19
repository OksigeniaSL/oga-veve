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

const TODO = {
  laFase: true,
  laFrecuencia: true,
  laTorre: true,
  laVentanilla: true,
  laMegafonia: true,
  lasExplicaciones: true,
  comoSeAterriza: true,
  laCorta: true,
};
/**
 * Los que se cierran en el aire: los de radio menos el ILS, la deriva, que acaba encima de su puente, el rumbo de noche, encima del río, y la estima, que acaba con el reloj a cero.
 * Y el altímetro que miente, pasada la cima (H26p), y la brújula, con la tarjeta quieta (H26q); y el giróscopo, puesto con ella (H26r).
 */
const DE_RADIO: readonly EjercicioId[] = ["aguja", "radial", "interceptar", "cruce", "deriva", "rumbo", "estima", "altimetro", "brujula", "giroscopo", "pitot", "gps"];
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

  it("el juego le dice cuándo el ILS está pidiendo la frustrada, y cuándo el cangrejo pide el pie", () => {
    expect(juego).toMatch(
      /loQueCallaElEjercicio\(\s*this\.ejercicioDeHoy,[^;]*this\.ils\?\.fase === "frustrando",\s*this\.finalConViento\?\.pideElPie/,
    );
  });

  /*
   * H32c: el cangrejo del JAZ 90 en Los Rodeos. A los quince metros salió «pie
   * derecho» y en el mismo fotograma «ya podés tocar» encima; a los trece, el
   * PAPI. Y cómo se aterriza, que espera a que la tarjeta quede libre, salía en
   * el primer hueco de la final del ejercicio.
   */
  for (const id of ["cangrejo", "ala-baja"] as const)
    it(`«${id}» cuenta su propia final: cómo se aterriza, callado; la corta, solo mientras pide el pie`, () => {
      const e = ejercicioPorId(id);
      expect(e?.escena).toBe("cruzado");
      expect(loQueCallaElEjercicio(e, false)).toEqual({ ...NO_CALLA_NADA, comoSeAterriza: true });
      expect(loQueCallaElEjercicio(e, false, false, true)).toEqual({ ...NO_CALLA_NADA, comoSeAterriza: true, laCorta: true });
      // Cerrado, lo que se vuele después ya es un vuelo.
      expect(loQueCallaElEjercicio(e, true, false, true)).toEqual(NO_CALLA_NADA);
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

  /*
   * H26u: «Rumbo de noche» con el JAZ 90 oyó a la comandante anunciar el
   * crucero a mil quinientos pies, y a la instructora contar los gases al
   * poner el automático. Ninguna de las dos es de la pista: salían solo en los
   * aviones con pasaje o con gases.
   */
  it("la megafonía de la cabina no anuncia, ni la comandante cuenta su crucero", () => {
    const radio = cuerpoDe(/\n {2}private oirLaRadio\(dt: number\): void \{/);
    expect(radio, "no se encontró oirLaRadio en game.ts").not.toBe("");
    expect(radio).toMatch(/const anuncio =[^;]*this\.loQueCalla\.laMegafonia/);
    const cabina = cuerpoDe(/\n {2}private contarLaVidaDeCabina\(dt: number, enEmergencia: boolean\): void \{/);
    expect(cabina, "no se encontró contarLaVidaDeCabina en game.ts").not.toBe("");
    expect(cabina).toMatch(/this\.loQueCalla\.laMegafonia/);
  });

  it("y la instructora no explica los gases automáticos, ni al ponerlos ni al soltarse, ni el rombo del TCAS", () => {
    const poner = cuerpoDe(/\n {2}ponerPilotoAutomatico\(/);
    expect(poner, "no se encontró ponerPilotoAutomatico en game.ts").not.toBe("");
    expect(poner).toMatch(/!this\.loQueCalla\.lasExplicaciones[^;]*\s*this\.explicarUnaVez\("vuelo\.gasesAutomaticos"\)/);
    const soltar = cuerpoDe(/\n {2}private soltarLosGases\(\): void \{/);
    expect(soltar, "no se encontró soltarLosGases en game.ts").not.toBe("");
    expect(soltar).toMatch(/!this\.loQueCalla\.lasExplicaciones[^;]*\s*this\.explicarUnaVez\("vuelo\.gasesSueltos"\)/);
    // H26u, el JAZ 60: «ese rombo es otro avión» no es del ejercicio; el aviso de tráfico sí sigue.
    const rombo = cuerpoDe(/\n {2}private explicarElTrafico\(\): void \{/);
    expect(rombo, "no se encontró explicarElTrafico en game.ts").not.toBe("");
    expect(rombo).toMatch(/this\.loQueCalla\.lasExplicaciones/);
  });

  it("cómo se aterriza no se cuenta encima del ejercicio, y en la corta del pie no salen ni «ya podés tocar» ni el PAPI", () => {
    const toma = cuerpoDe(/\n {2}private contarComoSeAterriza\(\): void \{/);
    expect(toma, "no se encontró contarComoSeAterriza en game.ts").not.toBe("");
    expect(toma).toMatch(/if \(this\.loQueCalla\.comoSeAterriza\) \{\s*this\.tomaPorContar = false;/);
    expect(juego).toMatch(/const puedeTocar =[^;]*!this\.loQueCalla\.laCorta/);
    expect(juego).toMatch(/this\.hechos\.on\("papi",[^]*?if \(this\.loQueCalla\.laCorta\) return;[^]*?this\.hud\.senal\.mostrar\(/);
  });
});
