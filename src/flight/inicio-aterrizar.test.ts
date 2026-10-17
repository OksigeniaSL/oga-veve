/**
 * La segunda escena del modo inicio, aterrizar con Jazlyn: que cada paso
 * espere su gesto **sin parar el mundo en el aire**, que la mano de ella
 * sostenga el avión mientras tanto y solo ceda lo que se hace bien, que
 * equivocarse lo vuelva a pedir con otras palabras, que se toque dentro de la
 * pista y despacio, y que el final dé el sello. Ver `flight/inicio-aterrizar.ts`.
 *
 * Las primeras pruebas usan un avión de mentira que obedece al momento; las de
 * la toma vuelan la final entera con el modelo de vuelo de Guyrami y el JAZ 20
 * de verdad, con tres clases de piloto: quien hace lo que se le pide, quien no
 * hace nada, y quien aprieta de todo. El vuelo en el navegador lo mira
 * `scripts/verificar-inicio-2.mjs`.
 */

import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";
import { ArcadeFlightModel } from "./arcade";
import { PYKASU } from "./aircraft";
import { neutralControls } from "./model";
import { laRecogidaDe } from "./recogida";
import { LINEAS_DEL_INICIO, SIN_INTENTO, ENFRIA_EL_ERROR, ESPERA_SIN_HACER, type Intento } from "./inicio";
import type { Linea } from "./conversacion";
import {
  alturaDelAhora,
  DA_LA_NARIZ,
  DESDE_LA_SENDA,
  DESDE_LOS_AROS,
  enLosMandos,
  FRENO_DE_LA_MANO,
  GUION_DE_ATERRIZAR,
  HASTA_EL_GAS,
  HASTA_LA_NARIZ,
  InicioDeAterrizar,
  LINEAS_DE_ATERRIZAR,
  pasillo,
  PISTA_PARA_FRENAR,
  type LecturaDeAterrizar,
  type PasoDeAterrizar,
  type SalidaDeAterrizar,
} from "./inicio-aterrizar";

const GRADO = Math.PI / 180;
const DT = 1 / 30;
const TAN = Math.tan(3 * GRADO);

/** La voz: apunta lo que se dice y lo da por dicho al momento. */
function vozQueApunta(): { dichas: Linea[]; voz: ConstructorParameters<typeof InicioDeAterrizar>[0] } {
  const dichas: Linea[] = [];
  return {
    dichas,
    voz: {
      decir: (l, alAcabar) => {
        dichas.push(l);
        alAcabar(0);
      },
      callar: () => {},
    },
  };
}

type Lectura = { -readonly [K in keyof LecturaDeAterrizar]: LecturaDeAterrizar[K] };

/** Un avión de mentira en la final, a 3,6 km, sobre la senda. */
function enLaFinal(): Lectura {
  return {
    motor: true,
    gas: 0.59,
    intento: SIN_INTENTO,
    velocidad: 35,
    altura: 190,
    enTierra: false,
    alabeo: 0,
    mando: "teclado",
    alUmbral: 3600,
    lado: 0,
    rumbo: 0,
    sobreLaSenda: 0,
    ritmoDeLaSenda: -35 * TAN,
    pistaQueQueda: Infinity,
    gasDeLaFinal: 0.37,
    alturaDeLaRecogida: 4.6,
  };
}

const con = (i: Partial<Intento>): Intento => ({ ...SIN_INTENTO, ...i });

function pasar(inicio: InicioDeAterrizar, l: Lectura, segundos: number): SalidaDeAterrizar {
  let s: SalidaDeAterrizar = inicio.paso(DT, l);
  for (let t = DT; t < segundos; t += DT) s = inicio.paso(DT, l);
  return s;
}

function hasta(inicio: InicioDeAterrizar, l: Lectura, paso: PasoDeAterrizar, tope = 60): void {
  for (let t = 0; t < tope && inicio.estado.paso !== paso; t += DT) inicio.paso(DT, l);
  expect(inicio.estado.paso).toBe(paso);
}

describe("el guion", () => {
  it("cada frase tiene su texto en castellano paraguayo y en inglés", () => {
    for (const l of LINEAS_DE_ATERRIZAR) {
      expect(ES_PY[l.clave as keyof typeof ES_PY], l.clave).toBeTruthy();
      expect(EN[l.clave as keyof typeof EN], l.clave).toBeTruthy();
    }
  });

  it("ninguna es tan corta que la voz se invente lo que falta", () => {
    // Con chispa, una frase muy corta se inventa lo que falta: docs/voces/LEEME.md.
    for (const l of LINEAS_DE_ATERRIZAR) {
      const texto = ES_PY[l.clave as keyof typeof ES_PY] as string;
      expect(texto.length, l.clave).toBeGreaterThanOrEqual(30);
    }
  });

  /*
   * **Y Ara sigue sin ser niño ni niña.** La prueba de la primera escena ya
   * mira todas las claves `inicio.*`; aquí, además, lo que más fácil se cuela
   * al hablarle a alguien que acaba de aterrizar —«tranquilo», «lista»,
   * «valiente campeona»— y en inglés, los pronombres. Solo en esta escena:
   * en la primera, «así se vuela tranquilo» habla del vuelo, y se queda.
   */
  it("y nada de lo que se dice dice si Ara es niño o niña", () => {
    const conGenero =
      /\b(hij[oa]s?|niñ[oa]s?|nen[ea]s?|solit[oa]s?|campe[oó]na?|list[oa]s?|tranquil[oa]s?|atent[oa]s?|asustad[oa]s?|cansad[oa]s?|nervios[oa]s?|content[oa]s?|orgullos[oa]s?|chiquit[oa]s?|aviador[a]?|pilot[oa]s?)\b/i;
    const withGender = /\b(son|daughter|boy|girl|his|him|he|she|her|hers|himself|herself|lad|lass|buddy|champ|princess)\b/i;
    const claves = Object.keys(ES_PY).filter((k) => k.startsWith("inicio.") && k.includes(".aterrizar."));
    expect(claves.length).toBeGreaterThanOrEqual(LINEAS_DE_ATERRIZAR.length);
    for (const k of claves) {
      expect(ES_PY[k as keyof typeof ES_PY], k).not.toMatch(conGenero);
      expect(EN[k as keyof typeof EN] ?? "", k).not.toMatch(withGender);
    }
  });

  it("Ara pregunta antes de que ella enseñe, y cada uno con su voz", () => {
    for (const p of GUION_DE_ATERRIZAR) {
      const i = p.entra.findIndex((l) => l.quien === "ara");
      const j = p.entra.findIndex((l) => l.quien === "mama");
      if (i >= 0 && j >= 0) expect(i, p.id).toBeLessThan(j);
    }
    for (const l of LINEAS_DE_ATERRIZAR)
      expect(l.clave.startsWith(l.quien === "mama" ? "inicio.mama." : "inicio.ara.")).toBe(true);
  });

  it("y no cuenta para decidir la primera experiencia, que sigue siendo el despegue", () => {
    const delDespegue = new Set(LINEAS_DEL_INICIO.map((l) => l.clave));
    for (const l of LINEAS_DE_ATERRIZAR) expect(delDespegue.has(l.clave), l.clave).toBe(false);
  });
});

describe("cada paso espera su gesto, sin parar el mundo en el aire", () => {
  it("saluda volando, y pasa al gas", () => {
    const v = vozQueApunta();
    const inicio = new InicioDeAterrizar(v.voz, { primerSello: true });
    const l = enLaFinal();
    const s = pasar(inicio, l, 2);
    expect(s.congelado).toBe(false);
    expect(inicio.estado.paso).toBe("gas");
    expect(inicio.estado.gesto).toBe("menosGas");
    expect(v.dichas.map((d) => d.clave)).toEqual([
      "inicio.ara.aterrizar.hola",
      "inicio.mama.aterrizar.hola",
      "inicio.ara.aterrizar.gas",
      "inicio.mama.aterrizar.gas",
    ]);
  });

  it("sin el gesto, el paso no se mueve y el mundo tampoco se para", () => {
    const inicio = new InicioDeAterrizar(vozQueApunta().voz, { primerSello: true });
    const l = enLaFinal();
    hasta(inicio, l, "gas");
    for (let t = 0; t < 30; t += DT) {
      const s = inicio.paso(DT, l);
      expect(s.congelado).toBe(false);
    }
    expect(inicio.estado.paso).toBe("gas");
    // Y la mano sostiene el gas que había: ni lo baja sola mientras espera.
    expect(inicio.paso(DT, l).mano.gas).toBeCloseTo(0.59, 5);
  });

  it("menos gas: un toque basta, y la mano lo lleva a la velocidad de la final", () => {
    const inicio = new InicioDeAterrizar(vozQueApunta().voz, { primerSello: true });
    const l = enLaFinal();
    hasta(inicio, l, "gas");
    l.intento = con({ gas: -1 });
    inicio.paso(DT, l);
    l.intento = SIN_INTENTO;
    let gas = 0;
    for (let t = 0; t < 6 && inicio.estado.paso === "gas"; t += DT) gas = inicio.paso(DT, l).mano.gas ?? gas;
    expect(gas).toBeCloseTo(l.gasDeLaFinal, 2);
    expect(inicio.estado.paso).toBe("nariz");
    expect(inicio.estado.gesto).toBe("bajar");
    expect(inicio.estado.porLaMano).toEqual([]);
  });

  it("la nariz abajo, y desde ahí la nariz es de quien juega", () => {
    const inicio = new InicioDeAterrizar(vozQueApunta().voz, { primerSello: true });
    const l = enLaFinal();
    hasta(inicio, l, "gas");
    l.intento = con({ gas: -1 });
    hasta(inicio, l, "nariz");
    l.intento = SIN_INTENTO;
    const antes = pasar(inicio, l, 3).mano.subida!;
    expect(inicio.estado.paso).toBe("nariz");
    l.intento = con({ cabeceo: -1 });
    const ahora = inicio.paso(DT, l).mano.subida!;
    expect(ahora).toBeCloseTo(antes - DA_LA_NARIZ, 5);
    l.intento = SIN_INTENTO;
    hasta(inicio, l, "senda");
  });

  it("y en el suelo sí espera: el freno, con el mundo quieto, y luego la mano frena", () => {
    const inicio = new InicioDeAterrizar(vozQueApunta().voz, { primerSello: true, desde: "frenar" });
    const l = { ...enLaFinal(), enTierra: true, altura: 0, velocidad: 25, pistaQueQueda: 800 };
    const s = pasar(inicio, l, 20);
    expect(s.congelado).toBe(true);
    expect(inicio.estado.paso).toBe("frenar");
    expect(inicio.estado.gesto).toBe("frenar");
    expect(s.mano.freno).toBeNull();
    l.intento = con({ frenar: true });
    const tras = inicio.paso(DT, l);
    expect(tras.congelado).toBe(false);
    expect(tras.mano.freno).toBe(FRENO_DE_LA_MANO);
    expect(tras.mano.gas).toBe(0);
  });
});

describe("la mano de Jazlyn sostiene el avión", () => {
  it("sobre la senda: baja lo que baja la senda, y vuelve a ella con calma", () => {
    const inicio = new InicioDeAterrizar(vozQueApunta().voz, { primerSello: true });
    const l = enLaFinal();
    const sobre = inicio.paso(DT, l).mano.subida!;
    expect(sobre).toBeCloseTo(l.ritmoDeLaSenda, 5);
    l.sobreLaSenda = 6;
    const alto = inicio.paso(DT, l).mano.subida!;
    expect(alto).toBeLessThan(sobre);
    l.sobreLaSenda = -40;
    const bajo = inicio.paso(DT, l).mano.subida!;
    // Con calma: nunca más de metro y medio de lo que baja la senda.
    expect(bajo - l.ritmoDeLaSenda).toBeCloseTo(1.5, 5);
  });

  it("lo que no se pidió no lo cede: ni la nariz antes de tiempo, ni el alabeo nunca", () => {
    const inicio = new InicioDeAterrizar(vozQueApunta().voz, { primerSello: true });
    const l = enLaFinal();
    hasta(inicio, l, "gas");
    const quieto = inicio.paso(DT, l).mano;
    l.intento = con({ cabeceo: 1, alabeo: -1 });
    const tocando = inicio.paso(DT, l).mano;
    expect(tocando.subida).toBeCloseTo(quieto.subida!, 5);
    expect(tocando.alabeo).toBeCloseTo(quieto.alabeo!, 5);
  });

  it("y por el eje: si se va a un lado, inclina hacia el otro", () => {
    const inicio = new InicioDeAterrizar(vozQueApunta().voz, { primerSello: true });
    const l = enLaFinal();
    l.lado = 60;
    expect(inicio.paso(DT, l).mano.alabeo!).toBeLessThan(0);
    l.lado = -60;
    expect(inicio.paso(DT, l).mano.alabeo!).toBeGreaterThan(0);
    l.lado = 0;
    l.rumbo = 5 * GRADO;
    expect(inicio.paso(DT, l).mano.alabeo!).toBeLessThan(0);
  });

  it("cedida la nariz, dentro del pasillo: lo que se sale no se cede", () => {
    const inicio = new InicioDeAterrizar(vozQueApunta().voz, { primerSello: true, desde: "nariz" });
    const l = enLaFinal();
    l.intento = con({ cabeceo: -1 });
    inicio.paso(DT, l);
    expect(inicio.estado.fase).toBe("bien");
    l.altura = 40;
    l.sobreLaSenda = -pasillo(40) - 0.1;
    const fuera = inicio.paso(DT, l).mano.subida!;
    l.intento = SIN_INTENTO;
    const suelta = inicio.paso(DT, l).mano.subida!;
    expect(fuera).toBeCloseTo(suelta, 5);
    // Y para el lado bueno, sí.
    l.intento = con({ cabeceo: 1 });
    expect(inicio.paso(DT, l).mano.subida!).toBeCloseTo(suelta + DA_LA_NARIZ, 5);
  });
});

describe("si se equivoca, no pasa nada", () => {
  it("se le vuelve a pedir con otras palabras, nunca con las mismas dos veces seguidas", () => {
    const v = vozQueApunta();
    const inicio = new InicioDeAterrizar(v.voz, { primerSello: true });
    const l = enLaFinal();
    hasta(inicio, l, "gas");
    pasar(inicio, l, 1);
    const antes = v.dichas.length;
    // Más gas, que es lo contrario.
    l.intento = con({ gas: 1 });
    pasar(inicio, l, 0.2);
    expect(v.dichas.slice(antes).map((d) => d.clave)).toEqual(["inicio.mama.aterrizar.gas.otra1"]);
    pasar(inicio, l, ENFRIA_EL_ERROR + 0.5);
    const dichas = v.dichas.slice(antes).map((d) => d.clave);
    expect(dichas[1]).toBe("inicio.mama.aterrizar.gas.otra2");
    for (let i = 1; i < dichas.length; i++) expect(dichas[i]).not.toBe(dichas[i - 1]);
    expect(inicio.estado.paso).toBe("gas");
    expect(inicio.estado.otraVez).toBeGreaterThanOrEqual(2);
  });

  it("y sin hacer nada, también, pasado un rato", () => {
    const v = vozQueApunta();
    const inicio = new InicioDeAterrizar(v.voz, { primerSello: true });
    const l = enLaFinal();
    hasta(inicio, l, "gas");
    pasar(inicio, l, 1);
    const antes = v.dichas.length;
    pasar(inicio, l, ESPERA_SIN_HACER + 0.5);
    expect(v.dichas.slice(antes).map((d) => d.clave)).toEqual(["inicio.mama.aterrizar.gas.otra1"]);
  });

  it("y el freno, con el mundo quieto, también", () => {
    const v = vozQueApunta();
    const inicio = new InicioDeAterrizar(v.voz, { primerSello: true, desde: "frenar" });
    const l = { ...enLaFinal(), enTierra: true, altura: 0, velocidad: 25, pistaQueQueda: 800 };
    pasar(inicio, l, 3);
    const antes = v.dichas.length;
    l.intento = con({ gas: 1 });
    const s = pasar(inicio, l, 0.3);
    expect(s.congelado).toBe(true);
    expect(v.dichas.slice(antes).map((d) => d.clave)).toEqual(["inicio.mama.aterrizar.frenar.otra1"]);
  });

  it("la final no espera: pasado su sitio, lo hace ella y lo cuenta", () => {
    const v = vozQueApunta();
    const inicio = new InicioDeAterrizar(v.voz, { primerSello: true });
    const l = enLaFinal();
    hasta(inicio, l, "gas");
    l.alUmbral = HASTA_EL_GAS;
    pasar(inicio, l, 0.5);
    expect(inicio.estado.porLaMano).toEqual(["gas"]);
    expect(v.dichas.at(-1)!.clave).toBe("inicio.mama.aterrizar.gas.yo");
    hasta(inicio, l, "nariz");
    pasar(inicio, l, 2);
    l.alUmbral = HASTA_LA_NARIZ;
    pasar(inicio, l, 0.5);
    expect(inicio.estado.porLaMano).toEqual(["gas", "nariz"]);
    expect(v.dichas.at(-1)!.clave).toBe("inicio.mama.aterrizar.nariz.yo");
    hasta(inicio, l, "senda");
    // Lo que son los aros, que ya se pasó su sitio; y lo que viene, cerca de la pista.
    const antes = v.dichas.length;
    pasar(inicio, l, 3);
    expect(v.dichas.slice(antes).map((d) => d.clave)).toEqual([
      "inicio.ara.aterrizar.aros",
      "inicio.mama.aterrizar.aros",
    ]);
    l.alUmbral = DESDE_LA_SENDA;
    pasar(inicio, l, 1);
    expect(v.dichas.slice(antes + 2).map((d) => d.clave)).toEqual([
      "inicio.ara.aterrizar.senda",
      "inicio.mama.aterrizar.senda",
    ]);
  });

  it("a mitad de la senda, lo que son los aros, y no antes", () => {
    const v = vozQueApunta();
    const inicio = new InicioDeAterrizar(v.voz, { primerSello: true, desde: "senda" });
    const l = enLaFinal();
    l.alUmbral = DESDE_LOS_AROS + 300;
    pasar(inicio, l, 5);
    expect(v.dichas).toEqual([]);
    l.alUmbral = DESDE_LOS_AROS;
    pasar(inicio, l, 1);
    expect(v.dichas.map((d) => d.clave)).toEqual(["inicio.ara.aterrizar.aros", "inicio.mama.aterrizar.aros"]);
  });

  it("la recogida no espera a nadie: a su altura se pide, aunque se esté hablando", () => {
    const dichas: Linea[] = [];
    let calladas = 0;
    const inicio = new InicioDeAterrizar(
      { decir: (l) => dichas.push(l), callar: () => void calladas++ },
      { primerSello: true, desde: "senda" },
    );
    const l = enLaFinal();
    l.alUmbral = 800;
    pasar(inicio, l, 1);
    // Una frase que no acaba nunca, sonando: lo de los aros, que va primero.
    expect(dichas.map((d) => d.clave)).toEqual(["inicio.ara.aterrizar.aros"]);
    l.altura = alturaDelAhora(l) - 0.1;
    pasar(inicio, l, 0.5);
    expect(inicio.estado.paso).toBe("recogida");
    expect(inicio.estado.gesto).toBe("subir");
    expect(calladas).toBeGreaterThan(0);
    expect(dichas.at(-1)!.clave).toBe("inicio.mama.aterrizar.recogida");
  });

  it("y rodando con poca pista, el freno se pide ya, con el mundo quieto", () => {
    const v = vozQueApunta();
    const inicio = new InicioDeAterrizar(v.voz, { primerSello: true, desde: "recogida" });
    const l = enLaFinal();
    l.altura = 3;
    inicio.paso(DT, l);
    Object.assign(l, { enTierra: true, altura: 0, velocidad: 30, pistaQueQueda: 900 });
    inicio.paso(DT, l);
    expect(inicio.estado.paso).toBe("recogida");
    l.pistaQueQueda = PISTA_PARA_FRENAR;
    const s = inicio.paso(DT, l);
    expect(inicio.estado.paso).toBe("frenar");
    expect(s.congelado).toBe(true);
  });
});

describe("el final", () => {
  it("felicita con el primer sello, espera a que se quiera seguir, y suelta el mundo", () => {
    const v = vozQueApunta();
    const inicio = new InicioDeAterrizar(v.voz, { primerSello: true, desde: "parado" });
    const l = { ...enLaFinal(), enTierra: true, altura: 0, velocidad: 0, pistaQueQueda: 700 };
    pasar(inicio, l, 3);
    expect(inicio.estado.paso).toBe("fin");
    expect(v.dichas.map((d) => d.clave).slice(-2)).toEqual([
      "inicio.ara.aterrizar.fin",
      "inicio.mama.aterrizar.fin",
    ]);
    expect(inicio.estado.puedeSeguir).toBe(true);
    expect(inicio.estado.congelado).toBe(true);
    pasar(inicio, l, 20);
    expect(inicio.estado.terminado).toBe(false);
    inicio.seguir();
    const s = inicio.paso(DT, l);
    expect(inicio.estado.terminado).toBe(true);
    expect(s.congelado).toBe(false);
    expect(s.mano.gas).toBeNull();
    expect(s.mano.freno).toBeNull();
  });

  it("y si no es el primer sello del cuaderno, no dice que lo sea", () => {
    const v = vozQueApunta();
    const inicio = new InicioDeAterrizar(v.voz, { primerSello: false, desde: "fin" });
    pasar(inicio, { ...enLaFinal(), enTierra: true, altura: 0, velocidad: 0 }, 2);
    const claves = v.dichas.map((d) => d.clave);
    expect(claves).toContain("inicio.mama.aterrizar.finOtra");
    expect(claves).not.toContain("inicio.mama.aterrizar.fin");
  });
});

// ── La final entera, con el JAZ 20 de verdad ─────────────────────────────

/** Cómo juega cada uno. */
type Piloto = "obediente" | "quieto" | "torpe";

interface Vuelo {
  readonly vistos: PasoDeAterrizar[];
  readonly porLaMano: readonly PasoDeAterrizar[];
  readonly tiro: boolean;
  /** Dónde y cómo se tocó: m del umbral (negativo, pasado), m de lado, m/s de caída. */
  readonly toque: { alUmbral: number; lado: number; caida: number; velocidad: number } | null;
  /** Lo más que se fue de la senda con la mano llevándolo, por encima de 30 m. */
  readonly masLejosDeLaSenda: number;
  readonly masDeLado: number;
  /** Lo que quedaba de pista al pararse. */
  readonly quedaba: number;
  /** Si el mundo se paró alguna vez en el aire. */
  readonly congeladoEnElAire: boolean;
  readonly terminado: boolean;
  readonly dichas: readonly string[];
  readonly registro: InicioDeAterrizar["registro"];
}

/**
 * **La final de la lección, con el modelo de Guyrami**: a 3,6 km del umbral
 * de una pista de 1.400 m como la del Chaco, a la altura de la lección y a su
 * velocidad de entrada, sin viento. La senda, la de los aros: tres grados
 * desde las luces del PAPI, a 300 m del umbral. Lo que la mano escribe en los
 * mandos pasa por `enLosMandos`, como en `game.ts`.
 */
function volarLaFinal(piloto: Piloto, voz = vozQueApunta()): Vuelo {
  const PISTA = 1400;
  const m = new ArcadeFlightModel({ aircraft: PYKASU, ground: () => 0 });
  const entrada = m.velocidadDeEntradaEnFinal();
  m.reset({ position: new Vector3(0, 3600 * TAN, 3600), heading: 0, airspeed: entrada });
  const c = { ...neutralControls(), engineOn: true, tren: 1, flaps: 0, throttle: 0 };
  c.throttle = m.gasPara(entrada, { flaps: 0, tren: 1 });
  const inicio = new InicioDeAterrizar(voz.voz, { primerSello: true });
  const recogida = laRecogidaDe(PYKASU).nariz;
  const vistos: PasoDeAterrizar[] = [];
  let toque: Vuelo["toque"] = null;
  let masLejos = 0;
  let masDeLado = 0;
  let congeladoEnElAire = false;
  let quedaba = NaN;
  let tironesHechos = 0;
  for (let t = 0; t < 400 && !inicio.estado.terminado; t += DT) {
    const s = m.state;
    const z = s.position.z;
    const enPista = z <= 0 && z >= -PISTA && Math.abs(s.position.x) < 15;
    m.setOnRunway(enPista);
    const altura = Math.max(0, s.heightAboveGround - PYKASU.gearHeight);
    const senda = Math.max(0, z + 300) * TAN;
    const e = inicio.estado;
    if (!vistos.includes(e.paso)) vistos.push(e.paso);
    // Lo que pide quien juega en este fotograma.
    let intento = SIN_INTENTO;
    const pidiendo = e.fase === "espera" || e.fase === "entra";
    if (piloto === "obediente" && pidiendo && !e.hablando) {
      if (e.paso === "gas") intento = con({ gas: -1 });
      if (e.paso === "nariz") intento = con({ cabeceo: -1 });
      if (e.paso === "frenar") intento = con({ frenar: true });
    }
    if (piloto === "obediente" && e.paso === "recogida" && !e.tocado && !e.hablando) intento = con({ cabeceo: 0.8 });
    if (piloto === "quieto" && e.paso === "frenar") intento = con({ frenar: true });
    if (piloto === "torpe") {
      // De todo: lo contrario primero, el alabeo, la nariz a fondo un rato…
      const r = Math.floor(t * 2) % 7;
      if (e.paso === "gas") intento = r < 3 ? con({ gas: 1, alabeo: 1 }) : r < 5 ? SIN_INTENTO : con({ gas: -1 });
      if (e.paso === "nariz") intento = r < 3 ? con({ cabeceo: 1 }) : con({ cabeceo: -1 });
      if (e.paso === "senda") intento = r < 3 ? con({ cabeceo: -1, alabeo: -1 }) : r < 5 ? con({ cabeceo: 1 }) : SIN_INTENTO;
      // Tira muy pronto, y en la recogida empuja.
      if (e.paso === "recogida" && !e.tocado) intento = altura > recogida ? con({ cabeceo: 1 }) : con({ cabeceo: -1 });
      if (e.paso === "frenar") intento = tironesHechos++ < 60 ? con({ gas: 1 }) : con({ frenar: true });
    }
    const salida = inicio.paso(DT, {
      motor: c.engineOn,
      gas: c.throttle,
      intento,
      velocidad: s.airspeed,
      altura,
      enTierra: s.onGround,
      alabeo: 0,
      mando: "teclado",
      alUmbral: z,
      lado: s.position.x,
      rumbo: ((s.heading + Math.PI) % (2 * Math.PI)) - Math.PI,
      sobreLaSenda: s.position.y - senda,
      ritmoDeLaSenda: -s.groundSpeed * TAN,
      pistaQueQueda: enPista ? PISTA + z : Infinity,
      gasDeLaFinal: m.gasPara(PYKASU.approachSpeed, { flaps: 0, tren: 1 }),
      alturaDeLaRecogida: recogida,
    });
    if (salida.congelado && !s.onGround) congeladoEnElAire = true;
    const mandos = enLosMandos(salida.mano, m);
    if (mandos.throttle !== null) c.throttle = mandos.throttle;
    if (mandos.elevator !== null) c.elevator = mandos.elevator;
    if (mandos.aileron !== null) c.aileron = mandos.aileron;
    c.brakes = Math.max(0, mandos.brakes ?? 0);
    if (!s.onGround && altura > 30) masLejos = Math.max(masLejos, Math.abs(s.position.y - senda));
    if (!s.onGround) masDeLado = Math.max(masDeLado, Math.abs(s.position.x));
    const enElAire = !s.onGround;
    if (!salida.congelado) m.step(DT, c);
    if (enElAire && m.state.onGround && !toque)
      toque = {
        alUmbral: m.state.position.z,
        lado: m.state.position.x,
        caida: m.state.touchdownSinkRate,
        velocidad: m.state.airspeed,
      };
    if (e.paso === "fin" && Number.isNaN(quedaba)) quedaba = PISTA + m.state.position.z;
    if (e.paso === "fin" && e.puedeSeguir) inicio.seguir();
  }
  return {
    vistos,
    porLaMano: inicio.estado.porLaMano,
    tiro: inicio.estado.tiro,
    toque,
    masLejosDeLaSenda: masLejos,
    masDeLado,
    quedaba,
    congeladoEnElAire,
    terminado: inicio.estado.terminado,
    dichas: voz.dichas.map((d) => d.clave),
    registro: inicio.registro,
  };
}

/**
 * **Sin voz, al ritmo de leer**: lo que espera `vozDelInicio` en `game.ts`
 * cuando una frase no suena —un segundo por cada dieciocho letras, de dos a
 * seis—, que es como va la escena mientras no esté grabada.
 */
function vozQueSeLee(): ReturnType<typeof vozQueApunta> {
  const dichas: Linea[] = [];
  const leer = (l: Linea): number =>
    Math.min(6, Math.max(2, (ES_PY[l.clave as keyof typeof ES_PY] as string).length / 18));
  return {
    dichas,
    voz: {
      decir: (l, alAcabar) => {
        dichas.push(l);
        alAcabar(leer(l));
      },
      callar: () => {},
    },
  };
}

describe("la final entera, con el JAZ 20 de Guyrami", () => {
  const TODOS: readonly PasoDeAterrizar[] = ["hola", "gas", "nariz", "senda", "recogida", "frenar", "parado", "fin"];

  it.each(["obediente", "quieto", "torpe"] as const)(
    "%s: se toca dentro de la pista, despacio y por el eje, y se para en ella",
    (piloto) => {
      const v = volarLaFinal(piloto);
      expect(v.vistos).toEqual(TODOS);
      expect(v.terminado).toBe(true);
      expect(v.congeladoEnElAire).toBe(false);
      expect(v.toque).not.toBeNull();
      const toque = v.toque!;
      // Pasado el umbral, y con más de media pista por delante.
      expect(toque.alUmbral).toBeLessThan(0);
      expect(toque.alUmbral).toBeGreaterThan(-700);
      // Despacio: muy por debajo de un golpe, que en este modelo son ocho.
      expect(toque.caida).toBeLessThan(1);
      expect(Math.abs(toque.lado)).toBeLessThan(3);
      // Y se para en la pista.
      expect(v.quedaba).toBeGreaterThan(100);
      // La mano no lo dejó irse: ni de la senda ni del eje.
      expect(v.masLejosDeLaSenda).toBeLessThan(17);
      expect(v.masDeLado).toBeLessThan(3);
    },
  );

  it("quien hace lo que se le pide aterriza solo con su mano, y más suave que sin ella", () => {
    const obediente = volarLaFinal("obediente");
    const quieto = volarLaFinal("quieto");
    expect(obediente.porLaMano).toEqual([]);
    expect(obediente.tiro).toBe(true);
    expect(obediente.dichas).toContain("inicio.mama.aterrizar.recogida.bien");
    expect(quieto.porLaMano).toEqual(["gas", "nariz", "recogida"]);
    expect(quieto.dichas).toContain("inicio.mama.aterrizar.recogida.yo");
    expect(obediente.toque!.caida).toBeLessThan(quieto.toque!.caida);
  });

  it("y quien aprieta de todo oye otra vez lo que se pide, con otras palabras", () => {
    const v = volarLaFinal("torpe");
    expect(v.dichas.filter((d) => /\.otra[12]$/.test(d)).length).toBeGreaterThanOrEqual(2);
  });

  it("dice cada frase de los pasos una vez, y la escena entera cabe en la final", () => {
    const v = volarLaFinal("obediente");
    for (const p of GUION_DE_ATERRIZAR)
      for (const l of p.entra) expect(v.dichas.filter((c) => c === l.clave).length, l.clave).toBe(1);
  });

  /*
   * Sin grabar, cada frase espera el rato de leerla: es lo más lento que va
   * la escena. Aun así, quien hace lo que se le pide lo hace todo a tiempo, y
   * la recogida no corta nada: lo que se cuenta de la senda acaba antes.
   */
  it("y sin voz, al ritmo de leer los subtítulos, también: nada lo hace ella y no se corta nada", () => {
    const v = volarLaFinal("obediente", vozQueSeLee());
    expect(v.porLaMano).toEqual([]);
    expect(v.toque!.caida).toBeLessThan(1);
    const senda = v.registro.find((d) => d.clave === "inicio.mama.aterrizar.senda");
    const ahora = v.registro.find((d) => d.clave === "inicio.mama.aterrizar.recogida");
    expect(senda?.cortada).toBe(false);
    expect(ahora!.desde).toBeGreaterThanOrEqual(senda!.hasta!);
    const cortadas = v.registro.filter((d) => d.cortada).map((d) => d.clave);
    // Solo se calla lo que se hizo antes de acabar de pedirlo.
    for (const c of cortadas) expect(c, c).toMatch(/aterrizar\.(gas|recogida)$/);
  });
});
