/**
 * El kit de viaje de Ara: que cada juego se gana siempre, haga lo que haga
 * quien juega; que se le ayuda en vez de castigarle; que se puede dejar; que
 * se pausa con la megafonía y se recoge para aterrizar. Ver
 * `flight/kit-de-viaje.ts`. Lo mismo dentro del vuelo, con la escena, en
 * `inicio-pasaje.test.ts`; y con el dedo en el navegador, en
 * `scripts/verificar-inicio-3.mjs`.
 */

import { describe, expect, it } from "vitest";
import { ES_PY } from "../i18n/es-PY";
import { Conversacion, type Linea } from "./conversacion";
import { EN } from "../i18n/en";
import {
  DESPEGUE,
  DICHO_DEL_AVION,
  JuegoDelAvion,
  KitDeViaje,
  LINEAS_DEL_KIT,
  LINEAS_NUEVAS_DEL_AVION,
  LO_QUE_ENSENA,
  LO_QUE_HAY,
  LUCES,
  NIVELES,
  NO_SE_REPITE,
  NOCHE,
  PARA_QUE_SIRVE,
  type Sitio,
} from "./kit-de-viaje";
import { NO_REPETIR } from "../audio/boca";
import { JuegoDeLaLuz } from "./luz-verde";
import { FLOTA } from "./flota";

/** Un azar con semilla, para que lo que falla se pueda repetir. */
function azar(semilla: number): () => number {
  // Mulberry32: el congruencial de antes, con números de coma flotante, caía en ciclos cortos.
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const claves = (lineas: readonly { clave: string }[]): string[] => lineas.map((l) => l.clave);

describe("las frases del kit", () => {
  it("cada una con su texto en castellano paraguayo y en inglés, de Ara, de vos, y ninguna corta", () => {
    for (const l of LINEAS_DEL_KIT) {
      const es = ES_PY[l.clave as keyof typeof ES_PY] as string;
      expect(es, l.clave).toBeTruthy();
      expect(EN[l.clave as keyof typeof EN], l.clave).toBeTruthy();
      expect(l.quien, l.clave).toBe("ara");
      expect(es.length, l.clave).toBeGreaterThanOrEqual(30);
      // Ara le habla a quien juega a su lado de vos, como en toda la escena: sin «tú».
      expect(es, l.clave).not.toMatch(/\b(tú|tienes|puedes|quieres|mira|toca|coge)\b/i);
    }
  });

  it("lo que enseña cada avión al despegar es distinto en cada nivel", () => {
    const dichas = NIVELES.map((n) => LO_QUE_ENSENA[n.tipo].clave);
    expect(new Set(dichas).size).toBe(NIVELES.length);
    for (const l of LINEAS_NUEVAS_DEL_AVION) expect(LINEAS_DEL_KIT).toContain(l);
  });
});

/** Pone todo lo de la fase de ahora, a su sitio, y devuelve lo puesto. */
function ponerLaFase(j: JuegoDelAvion): Sitio[] {
  const e = j.estado;
  const faltan: Sitio[] = e.fase === "piezas" ? NIVELES[e.nivel]!.piezas.filter((p) => !e.puestas.includes(p)) : LUCES.filter((l) => !e.puestas.includes(l));
  for (const s of faltan) expect(j.soltar(s, s), s).toBe(true);
  return faltan;
}

/** El final de un nivel: la noche y el despegue, a pasitos. */
function despegar(j: JuegoDelAvion): void {
  for (let t = 0; t < NOCHE + DESPEGUE + 0.5; t += 0.1) j.paso(0.1, true);
}

describe("armá tu avión", () => {
  it("un nivel por avión de la flota, de chico a grande, y cada uno con sus piezas", () => {
    expect(NIVELES.map((n) => n.tipo)).toEqual(FLOTA.map((m) => m.id));
    for (const n of NIVELES) {
      expect(n.piezas.length, n.tipo).toBeGreaterThanOrEqual(5);
      expect(n.piezas.length, n.tipo).toBeLessThanOrEqual(7);
      expect(new Set(n.piezas).size, n.tipo).toBe(n.piezas.length);
    }
    // El biplano lleva la ruedita en la cola; los demás, la rueda en la nariz.
    expect(NIVELES[1]!.piezas).toContain("trenCola");
    for (const n of NIVELES.filter((x) => x.tipo !== "jaz-25")) expect(n.piezas, n.tipo).toContain("trenMorro");
    // Sube de un nivel al siguiente: más piezas, y después las luces sin color.
    expect(NIVELES[0]!.piezas.length).toBeLessThan(NIVELES[1]!.piezas.length);
    expect(NIVELES.findIndex((n) => !n.lucesConColor)).toBe(2);
  });

  it("se arma pieza a pieza, después las luces, se hace de noche y despega; y viene el siguiente", () => {
    const j = new JuegoDelAvion();
    expect(claves(j.tomarLoQueDecir())).toEqual([DICHO_DEL_AVION.empezar.clave]);
    ponerLaFase(j);
    expect(j.estado.fase).toBe("luces");
    // Ara cuenta para qué sirve cada clase de pieza, y después lo de las luces.
    expect(claves(j.tomarLoQueDecir())).toEqual([
      PARA_QUE_SIRVE.ala.clave,
      PARA_QUE_SIRVE.motor.clave,
      PARA_QUE_SIRVE.cola.clave,
      PARA_QUE_SIRVE.ruedas.clave,
      DICHO_DEL_AVION.luces.clave,
    ]);
    // Una pieza no se lleva en la fase de las luces, ni una luz en la de las piezas.
    expect(j.soltar("ala", "ala")).toBe(false);
    ponerLaFase(j);
    expect(j.estado.fase).toBe("noche");
    expect(claves(j.tomarLoQueDecir())).toEqual([DICHO_DEL_AVION.noche.clave]);
    for (let t = 0; t < NOCHE + 0.2; t += 0.1) j.paso(0.1, true);
    expect(j.estado.fase).toBe("despegue");
    expect(claves(j.tomarLoQueDecir())).toEqual([LO_QUE_ENSENA["jaz-20"].clave]);
    for (let t = 0; t < DESPEGUE + 0.2; t += 0.1) j.paso(0.1, true);
    expect(j.estado).toMatchObject({ nivel: 1, tipo: "jaz-25", fase: "piezas", puestas: [], despegados: 1, terminado: false });
  });

  it("lo de una vez no se repite en cada avión, y lo de cada avión sí se dice", () => {
    const j = new JuegoDelAvion();
    j.tomarLoQueDecir();
    ponerLaFase(j);
    ponerLaFase(j);
    despegar(j);
    j.tomarLoQueDecir();
    ponerLaFase(j);
    // El biplano: solo lo nuevo, el estabilizador; el ala, el motor, la cola y las ruedas ya se contaron.
    expect(claves(j.tomarLoQueDecir())).toEqual([PARA_QUE_SIRVE.estabilizador.clave]);
    ponerLaFase(j);
    expect(j.tomarLoQueDecir()).toEqual([]);
    despegar(j);
    expect(claves(j.tomarLoQueDecir())).toEqual([LO_QUE_ENSENA["jaz-25"].clave]);
  });

  it("los seis aviones, y después del último, ganado", () => {
    const j = new JuegoDelAvion();
    for (let i = 0; i < NIVELES.length; i++) {
      expect(j.estado.tipo).toBe(NIVELES[i]!.tipo);
      ponerLaFase(j);
      ponerLaFase(j);
      despegar(j);
    }
    expect(j.terminado).toBe(true);
    expect(j.estado.despegados).toBe(NIVELES.length);
  });

  it("con alguien hablando, lo de la pieza no se pone en cola: espera al silencio", () => {
    const j = new JuegoDelAvion();
    j.tomarLoQueDecir();
    expect(j.soltar("trenPrincipal", "trenPrincipal", false)).toBe(true);
    expect(j.tomarLoQueDecir()).toEqual([]);
    j.soltar("trenMorro", "trenMorro", true);
    expect(claves(j.tomarLoQueDecir())).toEqual([PARA_QUE_SIRVE.ruedas.clave]);
    // Y lo de las luces, siempre: es lo que hay que hacer ahora.
    for (const p of ["ala", "motor", "cola"] as const) j.soltar(p, p, false);
    expect(claves(j.tomarLoQueDecir())).toEqual([DICHO_DEL_AVION.luces.clave]);
  });

  it("una pieza en otro hueco vuelve, el suyo se ilumina, y Ara ayuda sin regañar", () => {
    const j = new JuegoDelAvion();
    j.tomarLoQueDecir();
    expect(j.soltar("motor", "cola")).toBe(false);
    expect(j.estado.puestas).toEqual([]);
    expect(j.estado.ilumina).toBe("motor");
    expect(claves(j.tomarLoQueDecir())).toEqual([DICHO_DEL_AVION.ayuda.clave]);
    // Soltada en ninguna parte, vuelve sin más: ni ayuda ni cuenta.
    expect(j.soltar("ala", null)).toBe(false);
    expect(j.tomarLoQueDecir()).toEqual([]);
    expect(j.estado.ayudas).toBe(1);
  });

  it("a la segunda que no encuentra su hueco, tocarla la lleva sola", () => {
    const j = new JuegoDelAvion(2);
    j.soltar("motor", "trenMorro");
    j.soltar("motor", "deriva");
    j.tocarPieza("motor");
    expect(j.puesta("motor")).toBe(true);
  });

  it("sin arrastrar: un toque en la pieza y otro en su hueco", () => {
    const j = new JuegoDelAvion();
    j.tocarPieza("ala");
    expect(j.estado.cogida).toBe("ala");
    j.tocarSitio("ala");
    expect(j.puesta("ala")).toBe(true);
    // Y un toque en un hueco sin nada en la mano: su pieza se mueve en la bandeja.
    j.tocarSitio("motor");
    expect(j.estado.senala).toBe("motor");
  });

  it("y si pasa un rato sin acertar, se ilumina lo que toca, primero sin palabras", () => {
    const j = new JuegoDelAvion();
    j.tomarLoQueDecir();
    for (let t = 0; t < 13; t += 0.1) j.paso(0.1, true);
    expect(j.estado.ilumina).toBe("ala");
    expect(j.tomarLoQueDecir()).toEqual([]);
  });

  it("se gana siempre: quien arrastra a lo loco acaba con los seis aviones despegados", () => {
    for (let semilla = 1; semilla <= 20; semilla++) {
      const r = azar(semilla);
      const j = new JuegoDelAvion();
      const todos: Sitio[] = [...new Set(NIVELES.flatMap((n) => n.piezas)), ...LUCES];
      const elegir = (): Sitio => todos[Math.floor(r() * todos.length)]!;
      for (let paso = 0; paso < 40000 && !j.terminado; paso++) {
        const s = elegir();
        const q = r();
        if (q < 0.4) j.soltar(s, r() < 0.5 ? elegir() : null);
        else if (q < 0.7) j.tocarPieza(s);
        else if (q < 0.85) j.tocarSitio(s);
        j.paso(0.25, true);
      }
      expect(j.terminado, `semilla ${semilla}`).toBe(true);
    }
  });
});

describe("el kit", () => {
  it("no se abre hasta que la tripulante lo da, y la primera vez Ara dice qué hay", () => {
    const k = new KitDeViaje();
    k.abrir();
    expect(k.estado.abierto).toBe(false);
    k.dar();
    k.abrir();
    expect(k.estado.abierto).toBe(true);
    expect(claves(k.tomarLoQueDecir())).toEqual([LO_QUE_HAY.clave]);
    k.cerrar();
    k.abrir();
    expect(k.tomarLoQueDecir()).toEqual([]);
  });

  it("se puede dejar cuando se quiera, y el juego se queda donde estaba", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("avion");
    (k.juego as JuegoDelAvion).soltar("ala", "ala");
    k.cerrar();
    expect(k.estado.abierto).toBe(false);
    // Lo que quería decir y no llegó, ya no se dice.
    expect(k.tomarLoQueDecir()).toEqual([]);
    k.abrir();
    k.elegir("avion");
    expect((k.estado.juego as unknown as { puestas: Sitio[] }).puestas).toEqual(["ala"]);
  });

  it("el avión sigue por el nivel en que iba, aunque se juegue a la torre en medio", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("avion");
    const j = k.juego as JuegoDelAvion;
    ponerLaFase(j);
    ponerLaFase(j);
    for (let t = 0; t < NOCHE + DESPEGUE + 0.5; t += 0.1) k.paso(0.1, { megafonia: false, callada: true });
    expect(k.estado.juego).toMatchObject({ juego: "avion", nivel: 1 });
    expect(k.estado.hechos).toContain("avion");
    k.volverAElegir();
    k.elegir("luz");
    k.volverAElegir();
    k.elegir("avion");
    expect(k.estado.juego).toMatchObject({ juego: "avion", nivel: 1, puestas: [] });
  });

  it("se pausa con la megafonía: no se juega, y vuelve donde estaba", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("avion");
    k.paso(0.1, { megafonia: true, callada: false });
    expect(k.estado.pausado).toBe(true);
    expect(k.juego).toBeNull();
    k.elegir("luz");
    expect(k.estado.juego?.juego).toBe("avion");
    // Ni corre el reloj de la ayuda mientras habla.
    for (let t = 0; t < 30; t += 0.1) k.paso(0.1, { megafonia: true, callada: false });
    expect((k.estado.juego as { ilumina: unknown }).ilumina).toBeNull();
    k.paso(0.1, { megafonia: false, callada: true });
    expect(k.estado.pausado).toBe(false);
    expect(k.juego?.juego).toBe("avion");
  });

  it("se recoge para aterrizar: se cierra y ya no se abre", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("avion");
    k.recoger();
    expect(k.estado.abierto).toBe(false);
    expect(k.estado.recogido).toBe(true);
    k.abrir();
    expect(k.estado.abierto).toBe(false);
    expect(k.aMano).toBe(false);
  });

  it("un juego terminado se queda a la vista su rato y vuelve a elegir, con su estrella", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("avion");
    const j = k.juego as JuegoDelAvion;
    for (let i = 0; i < NIVELES.length; i++) {
      ponerLaFase(j);
      ponerLaFase(j);
      for (let t = 0; t < NOCHE + DESPEGUE + 0.5; t += 0.1) k.paso(0.1, { megafonia: false, callada: true });
    }
    expect(k.estado.juego?.terminado).toBe(true);
    for (let t = 0; t < 9; t += 0.1) k.paso(0.1, { megafonia: false, callada: true });
    expect(k.estado.juego).toBeNull();
    expect(k.estado.hechos).toEqual(["avion"]);
    // Y se vuelve a empezar por el primero.
    k.elegir("avion");
    expect(k.estado.juego).toMatchObject({ nivel: 0 });
  });

  it("abierto y sin tocarlo, al rato deja de ocupar a Ara: la escena vuelve a contar", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    expect(k.ocupaAAra).toBe(true);
    for (let t = 0; t < 50; t += 0.5) k.paso(0.5, { megafonia: false, callada: true });
    expect(k.ocupaAAra).toBe(false);
    k.tocado();
    expect(k.ocupaAAra).toBe(true);
  });
});

describe("lo que la boca tiraría por repetido, el kit no lo pide", () => {
  /** Cuándo pidió el kit cada vez la frase de empezar, quieto y con la escena acelerada `x` veces. */
  function vecesDeEmpezar(x: number, segundos: number): number[] {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.elegir("avion");
    const veces: number[] = [];
    for (let t = 0; t < segundos; t += 0.5) {
      const pared = t / x;
      k.paso(0.5, { megafonia: false, callada: true, pared });
      for (const l of k.tomarLoQueDecir())
        if (l.clave === DICHO_DEL_AVION.empezar.clave) veces.push(pared);
    }
    return veces;
  }

  it("deja más que la boca entre dos veces la misma frase", () => {
    expect(NO_SE_REPITE * 1000).toBeGreaterThan(NO_REPETIR);
  });

  it("quieto, el recordatorio vuelve, pero nunca antes de que la boca lo deje sonar", () => {
    for (const x of [1, 4, 12]) {
      const veces = vecesDeEmpezar(x, 240 * x);
      expect(veces.length, `×${x}`).toBeGreaterThan(1);
      for (let i = 1; i < veces.length; i++)
        expect(veces[i]! - veces[i - 1]!, `×${x}`).toBeGreaterThanOrEqual(NO_SE_REPITE);
    }
  });

  it("y al volver a abrir el juego enseguida, no se repite lo de empezar", () => {
    const k = new KitDeViaje();
    k.dar();
    k.abrir();
    k.tomarLoQueDecir();
    k.elegir("avion");
    k.paso(0.5, { megafonia: false, callada: true, pared: 1 });
    expect(claves(k.tomarLoQueDecir())).toContain(DICHO_DEL_AVION.empezar.clave);
    k.cerrar();
    k.abrir();
    k.elegir("avion");
    k.paso(0.5, { megafonia: false, callada: true, pared: 6 });
    expect(claves(k.tomarLoQueDecir())).not.toContain(DICHO_DEL_AVION.empezar.clave);
  });
});

describe("la megafonía sin voz también cuenta", () => {
  it("lo que suena es también lo que se está leyendo, si no pudo sonar", () => {
    let t = 0;
    const anuncio: Linea = { quien: "tripulacion", clave: "inicio.tripulacion.pasaje.oidos", megafonia: true };
    // Una voz que no puede: avisa enseguida, con el rato de leerla.
    const charla = new Conversacion({ decir: (_l, alAcabar) => alAcabar(4), callar: () => {} }, () => t);
    charla.decir([anuncio]);
    charla.atender();
    t = 1;
    expect(charla.suena).toBe(anuncio);
    t = 4.2;
    expect(charla.suena).toBeNull();
  });
});

/**
 * **La canción de la luz verde**: suena al ganar la torre, después del
 * «¡aterrizaron todos!», con el juego ganado a la vista; se va al cerrar el
 * kit, al dejar la torre o al recogerlo, y no vuelve a sonar por sí sola.
 */
describe("la canción de la luz verde", () => {
  /** Un kit con la torre ganada, a un ritmo que la acaba enseguida. */
  function conLaTorreGanada(): { kit: KitDeViaje; pared: () => number; paso: (s: number) => void } {
    const kit = new KitDeViaje();
    kit.ritmo = 40;
    let t = 0;
    const paso = (s: number) => {
      for (let i = 0; i < s / 0.1; i++) {
        t += 0.1;
        kit.paso(0.1, { megafonia: false, callada: true, pared: t });
        const j = kit.juego;
        // Quien hace caso a lo que brilla.
        if (j instanceof JuegoDeLaLuz) {
          const ayuda = j.estado.ayuda;
          if (ayuda) j.encender(ayuda);
        }
        kit.tomarLoQueDecir();
      }
    };
    kit.dar();
    kit.abrir();
    kit.elegir("luz");
    for (let i = 0; i < 400 && !kit.estado.juego?.terminado; i++) paso(1);
    return { kit, pared: () => t, paso };
  }

  it("con la torre abierta se pide sin sonar, para tenerla bajada; ganada, suena después de Ara", () => {
    const { kit, paso } = conLaTorreGanada();
    expect(kit.estado.juego?.terminado).toBe(true);
    expect(kit.cancion).toEqual({ cual: "luz-verde", vez: 0, suena: false });
    kit.empezarLaCancion();
    expect(kit.cancion?.suena).toBe(true);
    // Mientras suena, el juego ganado se queda a la vista, y ocupa a Ara.
    paso(20);
    expect(kit.estado.juego?.terminado).toBe(true);
    expect(kit.ocupaAAra).toBe(true);
    // Y al acabar su trozo, se calla y se vuelve a elegir.
    paso(15);
    expect(kit.cancion?.suena ?? false).toBe(false);
    expect(kit.estado.juego).toBeNull();
    // Una vez por juego: no vuelve a sonar.
    kit.empezarLaCancion();
    expect(kit.cancion?.suena ?? false).toBe(false);
  });

  it("se va al cerrar el kit, al dejar la torre y al recogerlo", () => {
    for (const deja of ["cerrar", "volverAElegir", "recoger"] as const) {
      const { kit } = conLaTorreGanada();
      kit.empezarLaCancion();
      expect(kit.cancion?.suena, deja).toBe(true);
      kit[deja]();
      expect(kit.cancion?.suena ?? false, deja).toBe(false);
    }
  });

  it("la megafonía no la para: la agacha la mezcla", () => {
    const { kit, pared } = conLaTorreGanada();
    kit.empezarLaCancion();
    kit.paso(0.1, { megafonia: true, callada: false, pared: pared() + 5 });
    expect(kit.estado.pausado).toBe(true);
    expect(kit.cancion?.suena).toBe(true);
  });

  it("sin la torre ganada no suena", () => {
    const kit = new KitDeViaje();
    kit.dar();
    kit.abrir();
    kit.elegir("luz");
    kit.empezarLaCancion();
    expect(kit.cancion?.suena).toBe(false);
    kit.volverAElegir();
    kit.elegir("avion");
    expect(kit.cancion).toBeNull();
  });
});
