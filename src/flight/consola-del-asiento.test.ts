/**
 * La consola de la pantalla del asiento, con el motor y sin navegador: lo que se ofrece
 * a quién, que la megafonía manda, que Ara no nombra lo que no ve, que el guion no se
 * pierde nada y que nadie se queda atrapado. Con el dedo y en las cuatro pantallas, en
 * `scripts/verificar-consola.mjs`.
 */

import { describe, expect, it } from "vitest";
import COMANDANTE from "../../data/voces/comandante/manifiesto.json";
import { EN } from "../i18n/en";
import { ES_PY } from "../i18n/es-PY";
import {
  ConsolaDelAsiento,
  CUENTOS_DEL_CAMINO,
  MODOS_PARA_TODOS,
  TOPE_DE_RECOGER,
  claveDelCuento,
  modosDe,
} from "./consola-del-asiento";
import type { Linea } from "./conversacion";
import { GUION_LLEGADA_A_ASUNCION } from "./guion-llegada-a-asuncion";
import { GUION_TENERIFE_LA_PALMA } from "./guion-tenerife-la-palma";
import { EXPLICA_EL_ADELANTO, MotorDelPasaje, type DelVueloLargo, type LecturaDelPasaje } from "./motor-del-pasaje";

const EN_CRUCERO: LecturaDelPasaje = {
  tramo: "crucero",
  enTramo: 10,
  motor: true,
  enTierra: false,
  porElSuelo: 230,
  altura: 12000,
  altitud: 12192,
  vertical: 0,
  autorizado: false,
  flaps: 0,
  nubes: null,
  enNube: 0,
  cabina: 0,
  faltaParaTocar: 400_000,
  hastaLaBajada: 480,
};

const HOY: DelVueloLargo = {
  temporada: "invierno",
  conSolAlDesayunar: true,
  sol: 17,
  solPorMiVentanilla: true,
  recorrido: 8_789_000,
  entraLaLlegada: 38_400,
  anuncioDeLaBajada: () => ({ clave: "comandante.largo.anuncio", texto: "…", relleno: {} }),
};

const CRUCERO: LecturaDelPasaje = { ...EN_CRUCERO, largo: HOY };
const BAJANDO: LecturaDelPasaje = { ...CRUCERO, tramo: "bajada", enTramo: 1, altitud: 9000, altura: 8800, hastaLaBajada: 0, faltaParaTocar: 200_000 };
const ABAJO: LecturaDelPasaje = { ...BAJANDO, altitud: 3000, altura: 2800, faltaParaTocar: 60_000 };

/** Un vuelo de mentira: cada frase dura lo suyo, y el reloj lo lleva la prueba. */
function unVuelo(opciones: { conPantalla?: boolean; duraUnCuento?: number } = {}) {
  let reloj = 0;
  const dichas: { clave: string; desde: number; hasta: number | null; cortada: boolean }[] = [];
  let sonando: { fin: number; acabar: (n: number) => void; d: (typeof dichas)[number] } | null = null;
  const voz = {
    decir: (l: Linea, alAcabar: (n: number) => void) => {
      const d = { clave: l.clave, desde: reloj, hasta: null, cortada: false };
      dichas.push(d);
      sonando = { fin: reloj + (l.clave.startsWith("ventanilla.historia.") ? (opciones.duraUnCuento ?? 8) : 1), acabar: alAcabar, d };
    },
    callar: () => {
      if (sonando) {
        sonando.d.hasta = reloj;
        sonando.d.cortada = true;
      }
      sonando = null;
    },
  };
  const m = new MotorDelPasaje(voz, GUION_LLEGADA_A_ASUNCION, { conPantalla: opciones.conPantalla ?? true, pared: () => reloj });
  const correr = (segundos: number, l: LecturaDelPasaje, cadaPaso?: () => void): void => {
    const pasos = Math.round(segundos / 0.05);
    for (let i = 0; i < pasos; i++) {
      reloj += 0.05;
      if (sonando && reloj >= sonando.fin) {
        const s = sonando;
        sonando = null;
        s.d.hasta = reloj;
        s.acabar(0);
      }
      m.paso(0.05, l);
      cadaPaso?.();
    }
  };
  /** Pasa la apertura de golpe y deja la ventanilla abierta y el anuncio de la bajada dicho. */
  const conLaVentanillaAbierta = (): void => {
    m.saltarLaAperturaParaBanco();
    correr(12, CRUCERO);
  };
  const c = m.consola!;
  /** Y lo que haría el dibujo en cada fotograma: contestar. */
  const dibujoQueContesta = (): void => {
    if (m.consola?.estado.recogiendo) m.consola.yaRecogida();
  };
  return { m, c, correr, conLaVentanillaAbierta, dibujoQueContesta, dichas };
}

const claves = (d: readonly { clave: string }[]): readonly string[] => d.map((x) => x.clave);

describe("lo que se ofrece", () => {
  it("los dos peldaños de abajo no ven los datos, y los dos de arriba, sí", () => {
    expect(modosDe("dibujo")).toEqual(MODOS_PARA_TODOS);
    expect(modosDe("palabra")).toEqual(MODOS_PARA_TODOS);
    expect(modosDe("cifra")).toContain("datos");
    expect(modosDe("cabina")).toContain("datos");
    for (const p of ["dibujo", "palabra", "cifra", "cabina"] as const) expect(modosDe(p)).toEqual(expect.arrayContaining(["mapa", "cerca", "pelota", "relojes"]));
  });

  it("un modo que no se le ofrece a un peldaño no se le pone aunque se pida", () => {
    const c = new ConsolaDelAsiento();
    c.ponerModo("datos", "dibujo");
    expect(c.modoDeAhora).toBe("mapa");
    c.ponerModo("datos", "cifra");
    expect(c.modoDeAhora).toBe("datos");
  });

  it("los siete cuentos del camino están grabados y escritos en los dos idiomas", () => {
    const piezas = (COMANDANTE as { piezas: Record<string, unknown> }).piezas;
    for (const s of CUENTOS_DEL_CAMINO) {
      const k = claveDelCuento(s);
      expect(piezas[k], k).toBeTruthy();
      expect((ES_PY as Record<string, string>)[k], k).toBeTruthy();
      expect((EN as Record<string, string>)[k], k).toBeTruthy();
    }
  });

  it("las tres frases de la consola están escritas en los dos idiomas, y las de Ara, sin género", () => {
    const d = GUION_LLEGADA_A_ASUNCION.consola!;
    for (const l of [d.elBoton, d.loQueHay, d.seRecoge]) {
      expect((ES_PY as Record<string, string>)[l.clave], l.clave).toBeTruthy();
      expect((EN as Record<string, string>)[l.clave], l.clave).toBeTruthy();
    }
    expect((ES_PY as Record<string, string>)[d.loQueHay.clave]).not.toMatch(/\b(dormid|cansad|content|sentad|solit)[oa]\b/);
  });
});

describe("solo donde hay pantalla", () => {
  it("un avión sin pantalla no tiene consola, aunque el guion la ofrezca", () => {
    const m = new MotorDelPasaje({ decir: () => {}, callar: () => {} }, GUION_LLEGADA_A_ASUNCION, { conPantalla: false });
    expect(m.consola).toBeNull();
    expect(m.estado.consola).toBeNull();
  });

  it("y el vuelo de Ara a La Palma no la ofrece, aunque el avión la llevara", () => {
    const m = new MotorDelPasaje({ decir: () => {}, callar: () => {} }, GUION_TENERIFE_LA_PALMA, { conPantalla: true });
    expect(m.consola).toBeNull();
  });
});

describe("cuándo sale", () => {
  it("con las láminas delante, no; desde que se abre la ventanilla, sí", () => {
    const { m, c, correr } = unVuelo();
    correr(5, CRUCERO);
    expect(m.enLaApertura).toBe(true);
    expect(c.estado.sale).toBe(false);
    c.abrir();
    expect(c.estaAbierta).toBe(false);
    m.saltarLaAperturaParaBanco();
    correr(3, CRUCERO);
    expect(m.enLaApertura).toBe(false);
    expect(c.estado.sale).toBe(true);
  });

  it("pasados los diez mil pies bajando se va y no vuelve, aunque se vuelva a subir", () => {
    const { c, correr, conLaVentanillaAbierta } = unVuelo();
    conLaVentanillaAbierta();
    correr(1, BAJANDO);
    expect(c.estado.sale).toBe(true);
    correr(1, ABAJO);
    expect(c.estado.sale).toBe(false);
    correr(1, CRUCERO);
    expect(c.estado.sale).toBe(false);
    c.abrir();
    expect(c.estaAbierta).toBe(false);
  });
});

describe("mirando la pantalla", () => {
  it("Ara mira su pantalla, y lo que se dice no le gira la cabeza", () => {
    const { m, c, correr, conLaVentanillaAbierta } = unVuelo();
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    expect(m.estado.plano).toBe("respaldo");
    // Los cinturones y el ralentí se dicen desde la ventanilla: aquí se oyen igual.
    correr(10, BAJANDO);
    expect(m.estado.dichos).toContain("bajada");
    expect(m.estado.plano).toBe("respaldo");
    c.cerrar();
    correr(1, BAJANDO);
    expect(m.estado.plano).toBe("ventanilla");
  });

  it("lo que Ara iba a decir por la ventanilla espera a que vuelva, y entonces se dice", () => {
    const { m, c, correr, conLaVentanillaAbierta } = unVuelo();
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    const amanece: LecturaDelPasaje = { ...BAJANDO, largo: { ...HOY, sol: 2 } };
    correr(30, amanece);
    expect(m.estado.charlas).not.toContain("amanece");
    c.cerrar();
    correr(6, amanece);
    expect(m.estado.charlas).toContain("amanece");
  });

  it("salir a mitad de un cuento lo calla, y su texto no se queda escrito; el siguiente, sí", () => {
    const { m, c, correr, conLaVentanillaAbierta, dichas } = unVuelo({ duraUnCuento: 30 });
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    c.mirarElCuento("asuncion");
    correr(8, CRUCERO);
    expect(dichas.at(-1)?.clave).toBe("ventanilla.historia.asuncion");
    expect(m.loDichoSeBorra).toBe(false);
    c.cerrar();
    correr(1, CRUCERO);
    expect(dichas.at(-1)?.cortada).toBe(true);
    expect(m.loDichoSeBorra).toBe(true);
    c.abrir();
    correr(1, CRUCERO);
    c.mirarElCuento("asuncion");
    correr(8, CRUCERO);
    expect(dichas.filter((d) => d.clave === "ventanilla.historia.asuncion")).toHaveLength(2);
    expect(m.loDichoSeBorra).toBe(false);
  });

  it("un cuento contado entero tampoco se queda escrito: se borra pasado un rato de silencio", () => {
    const { m, c, correr, conLaVentanillaAbierta, dichas } = unVuelo({ duraUnCuento: 10 });
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    c.mirarElCuento("asuncion");
    correr(16, CRUCERO);
    const cuento = dichas.find((d) => d.clave === "ventanilla.historia.asuncion");
    expect(cuento?.hasta).not.toBeNull();
    expect(cuento?.cortada).toBe(false);
    // Recién acabado se deja leer; un rato después, fuera.
    expect(m.loDichoSeBorra).toBe(false);
    correr(10, CRUCERO);
    expect(dichas.at(-1)?.clave).toBe("ventanilla.historia.asuncion");
    expect(m.loDichoSeBorra).toBe(true);
  });

  it("y el guion sigue su curso: nada de lo imprescindible se queda sin decir", () => {
    const { m, c, correr, conLaVentanillaAbierta } = unVuelo();
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    correr(5, BAJANDO);
    expect(m.estado.dichos).toEqual(expect.arrayContaining(["anuncio", "bajada"]));
    expect(m.estado.saltados).not.toContain("bajada");
  });
});

describe("la megafonía manda", () => {
  it("con un juego abierto, el juego se pausa y sigue: el mecanismo del kit", () => {
    const { m, c, correr } = unVuelo();
    m.saltarLaAperturaParaBanco();
    correr(1.5, CRUCERO);
    c.abrir();
    correr(0.5, CRUCERO);
    c.elegir("juegos");
    correr(0.5, CRUCERO);
    m.kit.elegir("luz");
    const juego = m.kit.juegoDeAhora;
    expect(juego).not.toBeNull();
    let enPausa = false;
    correr(12, CRUCERO, () => {
      enPausa ||= m.estado.megafonia && m.kit.estado.pausado;
    });
    expect(enPausa).toBe(true);
    correr(5, CRUCERO);
    expect(m.kit.estado.pausado).toBe(false);
    expect(m.kit.juegoDeAhora).toBe(juego);
  });

  it("un cuento se corta para el anuncio, sin pisarse, y al acabar vuelve a empezar", () => {
    const { c, correr, conLaVentanillaAbierta, dichas } = unVuelo();
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    c.mirarElCuento("chaco");
    correr(3, CRUCERO);
    const clave = claveDelCuento("chaco");
    expect(claves(dichas)).toContain(clave);
    correr(1, BAJANDO);
    const i = dichas.findIndex((d) => d.clave === "tripulacion.cinturones");
    expect(i).toBeGreaterThan(-1);
    const cortado = dichas[i - 1]!;
    expect(cortado.clave).toBe(clave);
    expect(cortado.cortada).toBe(true);
    expect(cortado.hasta!).toBeLessThanOrEqual(dichas[i]!.desde);
    // El dibujo sigue delante, con el altavoz, y el cuento vuelve.
    expect(c.cuentoDeAhora).toBe("chaco");
    correr(5, BAJANDO);
    expect(dichas.slice(i).map((d) => d.clave)).toContain(clave);
    // Y al acabar, otra vez la lista.
    correr(10, BAJANDO);
    expect(c.cuentoDeAhora).toBeNull();
  });

  it("nunca dos voces a la vez, ni tocando cuentos sin parar", () => {
    const { c, correr, conLaVentanillaAbierta, dichas } = unVuelo();
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    c.mirarElCuento("chaco");
    correr(2, CRUCERO);
    c.mirarElCuento("hierro");
    correr(2, CRUCERO);
    c.mirarElCuento("asuncion");
    correr(12, CRUCERO);
    for (let k = 1; k < dichas.length; k++) expect(dichas[k]!.desde).toBeGreaterThanOrEqual(dichas[k - 1]!.hasta!);
  });

  it("los cuentos seguidos no le quitan el turno al anuncio de la bajada, que se salta si no le llega", () => {
    const { m, c, correr, dichas } = unVuelo({ duraUnCuento: 3 });
    m.saltarLaAperturaParaBanco();
    correr(1.5, CRUCERO);
    c.abrir();
    correr(0.1, CRUCERO);
    expect(c.estaAbierta).toBe(true);
    // Un cuento detrás de otro, en cuanto acaba cada uno: lo peor que puede hacer un dedo.
    const cuentos = ["chaco", "hierro", "asuncion"];
    let v = 0;
    correr(40, CRUCERO, () => {
      if (c.cuentoDeAhora === null) c.mirarElCuento(cuentos[v++ % 3]!);
    });
    expect(dichas.filter((d) => d.clave.startsWith("ventanilla.historia.")).length).toBeGreaterThan(5);
    expect(m.estado.dichos).toContain("anuncio");
    expect(m.estado.saltados).not.toContain("anuncio");
  });
});

describe("a los diez mil pies se recoge todo", () => {
  it("se le pide al dibujo, contesta, y se vuelve a la ventanilla con una frase", () => {
    const { m, c, correr, conLaVentanillaAbierta, dibujoQueContesta, dichas } = unVuelo();
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    c.elegir("juegos");
    correr(1, BAJANDO, dibujoQueContesta);
    expect(m.kit.estaAbierto).toBe(true);
    correr(2, ABAJO, dibujoQueContesta);
    expect(c.estaAbierta).toBe(false);
    expect(c.estado.porElTope).toBe(false);
    expect(m.kit.estaAbierto).toBe(false);
    expect(m.kit.estaRecogido).toBe(true);
    expect(m.estado.plano).toBe("ventanilla");
    expect(claves(dichas)).toContain(GUION_LLEGADA_A_ASUNCION.consola!.seRecoge.clave);
  });

  it("si el dibujo no contesta, el tope la cierra: nadie se queda atrapado", () => {
    const { m, c, correr, conLaVentanillaAbierta } = unVuelo();
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    correr(TOPE_DE_RECOGER - 0.5, ABAJO);
    expect(c.estado.recogiendo).toBe(true);
    expect(c.estaAbierta).toBe(true);
    correr(1, ABAJO);
    expect(c.estaAbierta).toBe(false);
    expect(c.estado.porElTope).toBe(true);
    expect(m.estado.plano).toBe("ventanilla");
  });

  it("con un cuento sonando, se calla", () => {
    const { c, correr, conLaVentanillaAbierta, dibujoQueContesta, dichas } = unVuelo();
    conLaVentanillaAbierta();
    c.abrir();
    correr(1, CRUCERO);
    c.mirarElCuento("hierro");
    correr(3, CRUCERO);
    correr(1, ABAJO, dibujoQueContesta);
    const d = dichas.find((x) => x.clave === claveDelCuento("hierro"))!;
    expect(d.cortada).toBe(true);
    expect(c.cuentoDeAhora).toBeNull();
  });

  it("sin abrirla, no se dice nada de recoger", () => {
    const { correr, conLaVentanillaAbierta, dichas } = unVuelo();
    conLaVentanillaAbierta();
    correr(5, ABAJO);
    expect(claves(dichas)).not.toContain(GUION_LLEGADA_A_ASUNCION.consola!.seRecoge.clave);
  });
});

describe("una voz que lo cuenta", () => {
  const def = GUION_LLEGADA_A_ASUNCION.consola!;

  it("sin pedirlo, ni una palabra", () => {
    const { c, correr, conLaVentanillaAbierta, dichas } = unVuelo();
    conLaVentanillaAbierta();
    correr(10, CRUCERO);
    c.abrir();
    correr(3, CRUCERO);
    expect(claves(dichas)).not.toContain(def.elBoton.clave);
    expect(claves(dichas)).not.toContain(def.loQueHay.clave);
  });

  it("el botón, en un silencio y detrás del anuncio; lo de dentro, al abrirla y una vez", () => {
    const { m, c, correr, dichas } = unVuelo();
    m.saltarLaAperturaParaBanco();
    m.explicarLaConsola();
    correr(14, CRUCERO);
    const nombres = claves(dichas);
    expect(nombres).toContain(def.elBoton.clave);
    expect(nombres.indexOf(def.elBoton.clave)).toBeGreaterThan(nombres.indexOf("comandante.largo.anuncio"));
    c.abrir();
    correr(3, CRUCERO);
    c.cerrar();
    correr(3, CRUCERO);
    c.abrir();
    correr(3, CRUCERO);
    expect(claves(dichas).filter((k) => k === def.loQueHay.clave)).toHaveLength(1);
  });

  it("abierta antes de que toque, lo del botón ya no se dice", () => {
    const { m, c, correr, dichas } = unVuelo();
    m.saltarLaAperturaParaBanco();
    m.explicarLaConsola();
    correr(1.5, CRUCERO);
    c.abrir();
    correr(15, CRUCERO);
    expect(claves(dichas)).not.toContain(def.elBoton.clave);
    expect(claves(dichas)).toContain(def.loQueHay.clave);
  });

  it("cerrada antes de que le toque a Ara, lo de dentro no se dice con la ventanilla delante: espera a la próxima", () => {
    const { m, c, correr, dichas } = unVuelo();
    m.saltarLaAperturaParaBanco();
    m.explicarLaConsola();
    correr(1.5, CRUCERO);
    c.abrir();
    correr(0.1, CRUCERO);
    c.cerrar();
    correr(6, CRUCERO);
    expect(claves(dichas)).not.toContain(def.loQueHay.clave);
    c.abrir();
    correr(3, CRUCERO);
    expect(claves(dichas).filter((k) => k === def.loQueHay.clave)).toHaveLength(1);
  });

  it("«no volver a explicar» deja de decirlo", () => {
    const { m, c, correr, dichas } = unVuelo();
    m.saltarLaAperturaParaBanco();
    m.explicarLaConsola();
    m.olvidarLaExplicacionDeLaConsola();
    correr(14, CRUCERO);
    c.abrir();
    correr(3, CRUCERO);
    expect(claves(dichas)).not.toContain(def.elBoton.clave);
    expect(claves(dichas)).not.toContain(def.loQueHay.clave);
  });
});

describe("el ⏩, explicado por Ara", () => {
  const clave = EXPLICA_EL_ADELANTO.clave;

  it("sin pedirlo, ni una palabra", () => {
    const { correr, conLaVentanillaAbierta, dichas } = unVuelo();
    conLaVentanillaAbierta();
    correr(40, CRUCERO);
    expect(claves(dichas)).not.toContain(clave);
  });

  it("pedido, lo dice una vez en un rato largo sin nada, con la ventanilla delante, y el botón late mientras", () => {
    const { m, correr, conLaVentanillaAbierta, dichas } = unVuelo();
    conLaVentanillaAbierta();
    m.explicarElAdelanto();
    let latio = false;
    correr(40, CRUCERO, () => {
      if (m.boton.explica === "suena") latio = true;
    });
    expect(claves(dichas).filter((k) => k === clave)).toHaveLength(1);
    expect(latio).toBe(true);
    expect(m.estado.plano).toBe("ventanilla");
    // Y lo dice con el botón a la vista, no antes de que salga.
    expect(m.boton.sale).toBe(true);
  });

  it("con la pantalla del asiento abierta espera a que se vuelva a la ventanilla", () => {
    const { m, c, correr, conLaVentanillaAbierta, dichas } = unVuelo();
    conLaVentanillaAbierta();
    m.explicarElAdelanto();
    c.abrir();
    correr(40, CRUCERO);
    expect(claves(dichas)).not.toContain(clave);
    c.cerrar();
    correr(20, CRUCERO);
    expect(claves(dichas)).toContain(clave);
  });

  it("si ya se puso el ⏩, no hace falta; y «ya lo sé» lo quita", () => {
    const puesto = unVuelo();
    puesto.conLaVentanillaAbierta();
    puesto.m.explicarElAdelanto();
    puesto.m.adelantar(true);
    puesto.correr(40, CRUCERO);
    expect(claves(puesto.dichas)).not.toContain(clave);

    const quitado = unVuelo();
    quitado.conLaVentanillaAbierta();
    quitado.m.explicarElAdelanto();
    quitado.m.olvidarLaExplicacionDelAdelanto();
    quitado.correr(40, CRUCERO);
    expect(claves(quitado.dichas)).not.toContain(clave);
  });
});
