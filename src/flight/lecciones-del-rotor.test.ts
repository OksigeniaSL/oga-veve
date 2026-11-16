/**
 * **Las lecciones del ala rotatoria** (#113): que cada una empieza, sabe
 * cuándo se ha cumplido y lo celebra; y que se cumplen **volando el modelo de
 * verdad** del Super Puma, en la ayuda de los peldaños de abajo y con la
 * palanca de los de arriba. Ver `lecciones-del-rotor.ts` y el ADR 0026,
 * enmienda H17a.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ejercicioPorId, ejerciciosPara, seOfrece, type Ejercicio } from "./ejercicios";
import {
  LeccionDelRotor,
  QUIETO_LO_QUE_DURA,
  SUELO_ARRIBA,
  type LecturaDelRotor,
  type SucesoDelRotor,
} from "./lecciones-del-rotor";
import { ModeloDeHelicoptero, mandosNeutros, type Estabilizacion, type MandosDeHelicoptero } from "./helicoptero";
import { SUPER_PUMA as F } from "./super-puma";
import { PYKASU } from "./aircraft";
import type { TierId } from "./tiers";
import { SUPER_PUMA_EN_EL_JUEGO as HELICOPTERO } from "./helicoptero-en-el-juego";

const DT = 1 / 60;
const GRADO = Math.PI / 180;
const APOYO = Math.max(...F.ruedas.map((r) => r.z));

function ejercicio(id: string): Ejercicio {
  const e = ejercicioPorId(id);
  if (!e) throw new Error(id);
  return e;
}

/** Una lectura quieta en el aire, para las pruebas sin modelo. */
function quieto(ruedas: number, extra: Partial<LecturaDelRotor> = {}): LecturaDelRotor {
  return {
    enElSuelo: false,
    ruedas,
    x: 0,
    z: 0,
    vertical: 0,
    sobreElSuelo: 0,
    rumbo: 0,
    giro: 0,
    pedales: 0,
    potencia: 0.6,
    percance: false,
    ...extra,
  };
}

function correr(l: LeccionDelRotor, lectura: LecturaDelRotor, segundos: number): SucesoDelRotor[] {
  const todos: SucesoDelRotor[] = [];
  for (let t = 0; t < segundos; t += DT) todos.push(...l.paso(lectura, DT));
  return todos;
}

describe("dónde se ofrecen", () => {
  it("las cuatro, en su orden, al helicóptero desde Tukã; en Guyrami, quieto y el suelo", () => {
    const ids = (p: TierId) => ejerciciosPara(p, HELICOPTERO).map((e) => e.id);
    expect(ids("guyrami")).toEqual(["estacionario", "efecto-suelo"]);
    for (const p of ["tuka", "taguato", "taguato-ruvicha"] as const)
      expect(ids(p)).toEqual(["estacionario", "par", "efecto-suelo", "autorrotacion"]);
  });

  it("a un avión, ninguna", () => {
    for (const id of ["estacionario", "par", "efecto-suelo"])
      expect(seOfrece(ejercicio(id), "taguato", PYKASU)).toBe(false);
  });

  it("empiezan posadas en el helipuerto, sin avería", () => {
    for (const id of ["estacionario", "par", "efecto-suelo"]) {
      const e = ejercicio(id);
      expect(e.escena).toBe("rotor");
      expect(e.leccion).toBe("vuelta");
      expect(e.colocacion).toBeUndefined();
      expect(e.averias).toEqual([]);
    }
  });
});

describe("quedarse quieto", () => {
  it("se presenta, dice «así» al pararse, y diez segundos quieto es el logro", () => {
    const l = new LeccionDelRotor(ejercicio("estacionario"));
    expect(l.paso(quieto(0, { enElSuelo: true }), DT)).toEqual([{ que: "presentar" }]);
    const antes = correr(l, quieto(3), QUIETO_LO_QUE_DURA - 0.5);
    expect(antes).toEqual([{ que: "quieto" }]);
    expect(l.lograda).toBe(false);
    expect(correr(l, quieto(3), 1)).toEqual([{ que: "logrado" }]);
    // Y el panel del final, al posarse.
    expect(correr(l, quieto(0, { enElSuelo: true }), 0.1)).toEqual([{ que: "cerrar", como: "bien" }]);
    expect(l.cierre).toBe("bien");
  });

  it("apartarse del sitio vuelve a contar desde donde se pare, sin repetir el «así»", () => {
    const l = new LeccionDelRotor(ejercicio("estacionario"));
    correr(l, quieto(3), 8);
    // Tres metros de lado: ya no es quieto.
    const despues = correr(l, quieto(3, { x: 3 }), 8);
    expect(despues.some((s) => s.que === "logrado" || s.que === "quieto")).toBe(false);
    expect(correr(l, quieto(3, { x: 3 }), 2.5).map((s) => s.que)).toEqual(["logrado"]);
  });

  it("posado no cuenta, ni colgado a más de un diámetro del rotor", () => {
    const l = new LeccionDelRotor(ejercicio("estacionario"));
    expect(correr(l, quieto(0, { enElSuelo: true }), 20).map((s) => s.que)).toEqual(["presentar"]);
    expect(correr(l, quieto(18), 20)).toEqual([]);
  });

  it("si se rompe, se cierra para repetir, sin logro", () => {
    const l = new LeccionDelRotor(ejercicio("estacionario"));
    correr(l, quieto(3), 4);
    expect(l.paso(quieto(0, { percance: true }), DT)).toEqual([{ que: "cerrar", como: "otraVez" }]);
    l.reiniciar();
    expect(l.paso(quieto(0, { enElSuelo: true }), DT)).toEqual([{ que: "presentar" }]);
  });
});

describe("el par", () => {
  it("quieto, da los pedales; el morro a la izquierda se cuenta; subiendo con el pie derecho, se queda", () => {
    const l = new LeccionDelRotor(ejercicio("par"), 1);
    expect(l.piesDeQuienVuela).toBe(false);
    expect(correr(l, quieto(3), 3).map((s) => s.que)).toEqual(["presentar", "pedales"]);
    expect(l.piesDeQuienVuela).toBe(true);
    const seVa = correr(l, quieto(5, { vertical: 2, rumbo: -20 * GRADO, giro: -6 * GRADO }), 0.2);
    expect(seVa).toEqual([{ que: "seVa", lado: "izquierda" }]);
    // Al revés no es la lección: el pie izquierdo no la cumple.
    expect(correr(l, quieto(8, { vertical: 2, rumbo: -20 * GRADO, pedales: -0.3 }), 3)).toEqual([]);
    expect(correr(l, quieto(8, { vertical: 2, rumbo: -20 * GRADO, pedales: 0.2, giro: 1 * GRADO }), 2.5)).toEqual([
      { que: "logrado" },
    ]);
    // Y los pedales vuelven a la ayuda.
    expect(l.piesDeQuienVuela).toBe(false);
  });

  it("posado, los pedales vuelven a la ayuda, y se dan otra vez en el próximo estacionario", () => {
    const l = new LeccionDelRotor(ejercicio("par"), 1);
    correr(l, quieto(3), 3);
    expect(l.piesDeQuienVuela).toBe(true);
    correr(l, quieto(0, { enElSuelo: true }), 1);
    expect(l.piesDeQuienVuela).toBe(false);
    expect(correr(l, quieto(3), 2.5).map((s) => s.que)).toEqual(["pedales"]);
  });
});

describe("el efecto suelo", () => {
  it("abajo, arriba y abajo otra vez: se acaba abajo", () => {
    const l = new LeccionDelRotor(ejercicio("efecto-suelo"));
    expect(correr(l, quieto(2, { potencia: 0.57 }), 3.5).map((s) => s.que)).toEqual(["presentar", "abajo"]);
    expect(correr(l, quieto(SUELO_ARRIBA + 5, { potencia: 0.62 }), 3.5)).toEqual([{ que: "arriba", potencia: 0.62 }]);
    expect(correr(l, quieto(2, { potencia: 0.57 }), 3.5)).toEqual([{ que: "logrado" }]);
    expect(l.potencias).toEqual({ abajo: 0.57, arriba: 0.62 });
  });

  it("arriba primero vale: se pide bajar y se acaba abajo", () => {
    const l = new LeccionDelRotor(ejercicio("efecto-suelo"));
    expect(correr(l, quieto(SUELO_ARRIBA + 5), 3.5).map((s) => s.que)).toEqual(["presentar", "arriba"]);
    expect(correr(l, quieto(2), 3.5).map((s) => s.que)).toEqual(["logrado"]);
  });

  it("subiendo o bajando no cuenta: la aguja marca la subida", () => {
    const l = new LeccionDelRotor(ejercicio("efecto-suelo"));
    expect(correr(l, quieto(2, { vertical: 2 }), 10).map((s) => s.que)).toEqual(["presentar"]);
  });
});

// ── Volando el modelo de verdad ─────────────────────────────────────────

/** El Super Puma posado en su helipuerto, con el rotor en marcha. */
function posado(modo: Estabilizacion): ModeloDeHelicoptero {
  const h = new ModeloDeHelicoptero(F);
  h.ponerMasa(7500);
  h.ponerEstabilizacion(modo);
  h.reset({ position: new Vector3(0, APOYO, 0), heading: 0, rotorEnMarcha: true });
  return h;
}

function lecturaDe(h: ModeloDeHelicoptero, m: MandosDeHelicoptero): LecturaDelRotor {
  const s = h.state;
  return {
    enElSuelo: s.onGround,
    ruedas: s.heightAboveGround - APOYO,
    x: s.position.x,
    z: s.position.z,
    vertical: s.verticalSpeed,
    sobreElSuelo: s.groundSpeed,
    rumbo: s.heading,
    giro: s.yawRate,
    pedales: m.pedales,
    potencia: h.rotor().par,
    percance: s.crashed,
  };
}

/**
 * Vuela la lección con `piloto`, que mira el vuelo y los sucesos y mueve los
 * mandos, hasta que se logra o pasan `segundos`. Los pedales, a quien toque:
 * como `practicarElRotor` en `game.ts`.
 */
function volar(
  l: LeccionDelRotor,
  h: ModeloDeHelicoptero,
  piloto: (t: number, m: MandosDeHelicoptero, vistos: readonly SucesoDelRotor[]) => void,
  segundos: number,
): { readonly vistos: SucesoDelRotor[]; readonly t: number } {
  const m = mandosNeutros();
  m.colectivo = 0.5;
  const vistos: SucesoDelRotor[] = [];
  let t = 0;
  for (; t < segundos && !l.lograda; t += DT) {
    piloto(t, m, vistos);
    h.piesDeQuienVuela = l.piesDeQuienVuela;
    h.step(DT, m);
    vistos.push(...l.paso(lecturaDe(h, m), DT));
  }
  return { vistos, t };
}

describe("los pedales, de mano en mano", () => {
  /*
   * Dar los pedales y devolverlos no puede pegar un tirón al rotor de cola: lo
   * que llega es el pie que ponía la ayuda, entero, y solo cambia la
   * amortiguación. Con solo lo aprendido, en
   * Taguató el morro se seguía yendo con el pie puesto.
   */
  it("al darlos y al devolverlos, el pedal del rotor de cola no salta", () => {
    for (const modo of ["estacionario", "actitud"] as const) {
      const h = posado("estacionario");
      const m = mandosNeutros();
      m.colectivo = 0.5;
      for (let t = 0; t < 1; t += DT) h.step(DT, m);
      m.colectivo = 1;
      for (let t = 0; t < 2; t += DT) h.step(DT, m);
      m.colectivo = 0.5;
      // Un empujón de morro, para que la ayuda tenga algo que sostener al darlos.
      h.state.yawRate = 6 * GRADO;
      for (let t = 0; t < 1.5; t += DT) h.step(DT, m);
      h.ponerEstabilizacion(modo);
      if (modo === "actitud") m.colectivo = h.mandosAhora().colectivo;
      for (let t = 0; t < 0.5; t += DT) h.step(DT, m);
      const antes = h.mandosAhora().pedales;
      h.piesDeQuienVuela = true;
      h.step(DT, m);
      // Lo que cambia es la amortiguación, que pasa a ser la de `amortiguada`: menos de tres centésimas.
      expect(Math.abs(h.mandosAhora().pedales - antes), `${modo}, al darlos`).toBeLessThan(0.03);
      for (let t = 0; t < 2; t += DT) h.step(DT, m);
      const dados = h.mandosAhora().pedales;
      h.piesDeQuienVuela = false;
      h.step(DT, m);
      expect(Math.abs(h.mandosAhora().pedales - dados), `${modo}, al devolverlos`).toBeLessThan(0.03);
    }
  });
});

describe("volando el Super Puma", () => {
  it("con la ayuda (Guyrami y Tukã): subir un poco y soltar es quedarse quieto, y se logra", () => {
    const l = new LeccionDelRotor(ejercicio("estacionario"));
    const h = posado("estacionario");
    // La X tres segundos, y soltarla: la palanca vuelve a su muelle.
    const { vistos, t } = volar(l, h, (t, m) => (m.colectivo = t > 1 && t < 4 ? 1 : 0.5), 60);
    expect(vistos.map((s) => s.que)).toEqual(["presentar", "quieto", "logrado"]);
    /*
     * Hacia los treinta segundos: al despegar, la ayuda se desliza unos diez
     * metros de lado y tarda en pararse del todo —es del despegue, no de esta
     * lección—, y hasta que no se para no se empieza a contar.
     */
    expect(t).toBeLessThan(40);
  });

  it("con la palanca de verdad (Taguató), un piloto que sostiene el sitio también lo logra", () => {
    const l = new LeccionDelRotor(ejercicio("estacionario"));
    const h = posado("actitud");
    let colectivo = 0;
    /*
     * El piloto de prueba: sube hasta unos tres metros con el colectivo y
     * sostiene el sitio con el cíclico, a toques, como se aprende.
     */
    const { vistos } = volar(
      l,
      h,
      (_t, m) => {
        const s = h.state;
        const ruedas = s.heightAboveGround - APOYO;
        colectivo += (0.02 * (3 - ruedas) - 0.06 * s.velocity.y) * DT * 4;
        colectivo = Math.max(0, Math.min(1, colectivo + (s.onGround ? 0.25 * DT : 0)));
        m.colectivo = colectivo;
        const sen = Math.sin(s.heading);
        const cos = Math.cos(s.heading);
        const adelante = s.velocity.x * sen - s.velocity.z * cos;
        const derecha = s.velocity.x * cos + s.velocity.z * sen;
        const a = h.actitud();
        // Morro y ala hacia donde frenen lo que se va, sin pasarse de la actitud del estacionario.
        m.cabeceo = Math.max(-1, Math.min(1, 3 * (0.05 * adelante - a.cabeceo + F.actitudDeEstacionario.cabeceo)));
        m.alabeo = Math.max(-1, Math.min(1, 3 * (-0.05 * derecha - a.alabeo + F.actitudDeEstacionario.alabeo)));
      },
      90,
    );
    expect(vistos.map((s) => s.que)).toContain("logrado");
  });

  it("el par: con los pedales suyos el morro se va a la izquierda al subir, y con el derecho se queda", () => {
    const l = new LeccionDelRotor(ejercicio("par"), F.rotor.sentido);
    const h = posado("estacionario");
    let pedalesDados = -1;
    const { vistos } = volar(
      l,
      h,
      (t, m, vistos) => {
        // Subir un poco y quedarse; dados los pedales, subir; y cuando el morro se va, el derecho.
        if (pedalesDados < 0 && vistos.some((s) => s.que === "pedales")) pedalesDados = t;
        const subiendo = pedalesDados >= 0 && t > pedalesDados + 1;
        m.colectivo = (t > 1 && t < 3) || subiendo ? 1 : 0.5;
        m.pedales = vistos.some((s) => s.que === "seVa") ? Math.max(0, Math.min(0.3, -2 * h.state.yawRate + 0.1)) : 0;
      },
      60,
    );
    expect(vistos.map((s) => s.que)).toEqual(["presentar", "pedales", "seVa", "logrado"]);
    expect(vistos.find((s) => s.que === "seVa")).toEqual({ que: "seVa", lado: "izquierda" });
  });

  it("el efecto suelo: quieto abajo pide menos que quieto arriba, y se logra al volver abajo", () => {
    const l = new LeccionDelRotor(ejercicio("efecto-suelo"));
    const h = posado("estacionario");
    let fase: "subir-poco" | "quieto" | "arriba" | "abajo" = "subir-poco";
    let desde = 0;
    const { vistos } = volar(
      l,
      h,
      (t, m, vistos) => {
        const ultimo = vistos.at(-1)?.que;
        if (fase === "subir-poco" && t > 2.5) fase = "quieto";
        if (fase === "quieto" && ultimo === "abajo") {
          fase = "arriba";
          desde = t;
        }
        if (fase === "arriba" && ultimo === "arriba") fase = "abajo";
        m.colectivo =
          fase === "subir-poco"
            ? t > 1
              ? 1
              : 0.5
            : fase === "arriba"
              ? t < desde + 7
                ? 1
                : 0.5
              : fase === "abajo" && h.state.heightAboveGround - APOYO > 2.2
                ? 0
                : 0.5;
      },
      120,
    );
    expect(vistos.map((s) => s.que)).toEqual(["presentar", "abajo", "arriba", "logrado"]);
    const { abajo, arriba } = l.potencias;
    expect(abajo).not.toBeNull();
    expect(arriba).not.toBeNull();
    // Cuesta menos abajo, y se ve: más de un cinco por ciento menos.
    expect(abajo! / arriba!).toBeLessThan(0.95);
  });
});
