/**
 * Las cuentas del salto bajo tapa: que el estado que toca a una hora es el de
 * la ruta, en cualquier mundo, y que la espera siempre tiene salida. La prueba
 * de que el juego lo pone de verdad, con el avión volando después, es
 * `scripts/verificar-salto.mjs`.
 */

import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "./aircraft";
import { altitudDeCabina } from "./cabina-presurizada";
import { Cinturon } from "./cinturon";
import { loQueCabe } from "./combustible";
import { VueloDeLinea, type LecturaDeLinea } from "./vuelo-de-linea";
import {
  ANTES_DE_BAJAR,
  caminoEnElMundo,
  cargaDelVueloLargo,
  destinoDelSalto,
  DURA_EL_SUENO,
  enElMundo,
  EsperaDelSalto,
  estadoDelSalto,
  mundoDelTramo,
  quemadoEnElVuelo,
  RED_DE_LA_TAPA,
  RED_DEL_MUNDO,
  RelojDelVuelo,
  sitioDelMundo,
} from "./salto-bajo-tapa";
import {
  dondeVa,
  ESCALONES,
  horarioDelDia,
  NIVELES_DE_CRUCERO,
  ortodromica,
  PETTIROSSI,
  perfilDelVuelo,
  puntoEn,
} from "./ruta-larga";

const JAZ_120 = AIRCRAFT.find((a) => a.id === "jaz-120")!;
const HORA = 3600;
/** Un depósito que llega: el JAZ 120 no lleva tanques para esta ruta. Ver `cargaDelVueloLargo`. */
const ENTERO = { en: 0, kilos: 150_000 };
const DE_INVIERNO = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
const DE_VERANO = perfilDelVuelo(horarioDelDia(new Date("2026-06-15T12:00:00Z")));
const TENERIFE = { lat: 28.4827, lon: -16.3415 };
const LOS_DOS = [
  { id: "tenerife-norte", origen: TENERIFE },
  { id: "pettirossi", origen: PETTIROSSI },
];
/** Lo que hay entre dos sitios por la superficie, m. */
const entre = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number =>
  ortodromica(a, b).distancia;

describe("el reloj del vuelo", () => {
  it("corre con el reloj del juego y salta sin tocarlo", () => {
    const r = new RelojDelVuelo(1000, 50);
    expect(r.ahora(50)).toBe(1000);
    expect(r.ahora(110)).toBe(1060);
    r.saltarA(1000 + 7 * HORA, 110);
    expect(r.ahora(110)).toBe(1000 + 7 * HORA);
    expect(r.ahora(170)).toBe(1060 + 7 * HORA);
  });
});

describe("adónde se salta", () => {
  it("salta a lo pedido si cae en crucero y no hay nada por medio", () => {
    expect(destinoDelSalto(DE_INVIERNO, 2 * HORA, 9 * HORA)).toBe(9 * HORA);
  });

  it("nunca cae bajando: lo pedido más allá se queda antes del punto de descenso", () => {
    const t = destinoDelSalto(DE_INVIERNO, 2 * HORA, 11 * HORA)!;
    const crucero = DE_INVIERNO.tramos.filter((x) => x.fase === "crucero").at(-1)!;
    expect(t).toBeCloseTo(crucero.desde + crucero.dura - ANTES_DE_BAJAR);
    expect(dondeVa(DE_INVIERNO, t).fase).toBe("crucero");
  });

  it("no cae subiendo, ni salta hacia atrás", () => {
    expect(destinoDelSalto(DE_INVIERNO, 0, 600)).toBeNull();
    expect(destinoDelSalto(DE_INVIERNO, 5 * HORA, 4 * HORA)).toBeNull();
  });

  it("no pasa por encima de un momento que se vive: se para en el primero que cruza", () => {
    const ecuador = 6.95 * HORA;
    const desayuno = 9.67 * HORA;
    expect(destinoDelSalto(DE_INVIERNO, 2.5 * HORA, 10 * HORA, [desayuno, ecuador])).toBe(ecuador);
    // Y desde el ecuador, hasta el desayuno.
    expect(destinoDelSalto(DE_INVIERNO, ecuador, 10 * HORA, [desayuno, ecuador])).toBe(desayuno);
    // Una parada que ya pasó no para nada.
    expect(destinoDelSalto(DE_INVIERNO, 8 * HORA, 9 * HORA, [ecuador])).toBe(9 * HORA);
  });

  it("ya pasado el crucero no hay salto", () => {
    const fin = DE_INVIERNO.tramos.filter((x) => x.fase === "crucero").at(-1)!;
    expect(destinoDelSalto(DE_INVIERNO, fin.desde + fin.dura, 12 * HORA)).toBeNull();
  });
});

describe("el estado que le toca", () => {
  it("es el de la ruta: el sitio, la altitud, el rumbo y la velocidad de `dondeVa`", () => {
    const t = 9.5 * HORA;
    const e = estadoDelSalto(DE_INVIERNO, t, JAZ_120, ENTERO);
    const d = dondeVa(DE_INVIERNO, t);
    expect(e.sitio).toEqual(d.sitio);
    expect(e.altitud).toBe(d.altitud);
    expect(e.rumbo).toBe(d.rumbo);
    expect(e.velocidad).toBe(d.velocidad);
    expect(e.fase).toBe("crucero");
    expect(e.instante.getTime()).toBe(DE_INVIERNO.horario.despegue.getTime() + t * 1000);
  });

  it("lleva la cabina a la del programa de esa altitud, y por debajo de ocho mil pies", () => {
    const e = estadoDelSalto(DE_INVIERNO, 9.5 * HORA, JAZ_120, ENTERO);
    expect(e.cabina).toBe(altitudDeCabina(e.altitud, JAZ_120));
    expect(e.cabina).toBeLessThanOrEqual(8000 * 0.3048 + 1e-6);
    expect(e.cabina).toBeGreaterThan(5000 * 0.3048);
  });

  it("en crucero, el cartel apagado", () => {
    expect(estadoDelSalto(DE_INVIERNO, 5 * HORA, JAZ_120, ENTERO).cinturon).toBe(false);
    expect(estadoDelSalto(DE_INVIERNO, 100, JAZ_120, ENTERO).cinturon).toBe(true);
  });

  it("la hora del sol es la del sitio y el instante: de noche en el ecuador y al alba sobre Brasil", () => {
    const ecuador = estadoDelSalto(DE_INVIERNO, 7 * HORA, JAZ_120, ENTERO);
    // Unas 3 de la mañana de sol a 39° oeste, con la salida de las 23:45 de Madrid.
    expect(ecuador.horaSolar).toBeGreaterThan(2);
    expect(ecuador.horaSolar).toBeLessThan(4.5);
    const brasil = estadoDelSalto(DE_INVIERNO, 10 * HORA, JAZ_120, ENTERO);
    expect(brasil.horaSolar).toBeGreaterThan(4.5);
    expect(brasil.horaSolar).toBeLessThan(8);
  });

  it("el combustible baja con las horas, lo mismo de un salto que de dos", () => {
    const dos = estadoDelSalto(DE_INVIERNO, 2 * HORA, JAZ_120, ENTERO);
    const nueve = estadoDelSalto(DE_INVIERNO, 9 * HORA, JAZ_120, ENTERO);
    expect(nueve.combustible).toBeLessThan(dos.combustible);
    const porPartes = estadoDelSalto(DE_INVIERNO, 9 * HORA, JAZ_120, { en: 2 * HORA, kilos: dos.combustible });
    expect(Math.abs(porPartes.combustible - nueve.combustible)).toBeLessThan(200);
  });

  it("sin combustible para todo el rato, cero y no negativo", () => {
    expect(estadoDelSalto(DE_INVIERNO, 9 * HORA, JAZ_120, { en: 0, kilos: 1000 }).combustible).toBe(0);
  });

  it("lo quemado sale de la polar: unas toneladas por hora, y menos cuanto más ligero", () => {
    const carga = 60_000;
    const lleno = quemadoEnElVuelo(JAZ_120, DE_INVIERNO, 4 * HORA, 5 * HORA, carga);
    const casiVacio = quemadoEnElVuelo(JAZ_120, DE_INVIERNO, 4 * HORA, 5 * HORA, 10_000);
    // Un cuatrimotor de los grandes en crucero: entre cinco y catorce toneladas por hora.
    expect(lleno).toBeGreaterThan(5_000);
    expect(lleno).toBeLessThan(14_000);
    expect(casiVacio).toBeLessThan(lleno);
  });

  it("nunca se carga más de lo que cabe, y el JAZ 120 no llega: el avión de prueba se carga aparte", () => {
    // Lo real del juego: con los tanques de la ficha, la ruta no le cabe. La T2 trae el avión que sí.
    const carga = cargaDelVueloLargo(JAZ_120, DE_INVIERNO);
    expect(carga).toBe(loQueCabe(JAZ_120));
    expect(quemadoEnElVuelo(JAZ_120, DE_INVIERNO, 0, DE_INVIERNO.enElAire, 150_000)).toBeGreaterThan(carga);
  });
});

describe("en las coordenadas de un mundo", () => {
  it("la inversa de la proyección devuelve el sitio al metro, también a miles de kilómetros", () => {
    for (const t of [2.4, 7, 9.4, 10.6]) {
      const d = dondeVa(DE_INVIERNO, t * HORA);
      for (const m of LOS_DOS) {
        const p = enElMundo(DE_INVIERNO, m.origen, d.recorrido);
        expect(entre(sitioDelMundo(m.origen, p.x, p.z), d.sitio)).toBeLessThan(1);
      }
    }
  });

  it("volando el rumbo del plano, el avión sigue el camino: se aparta menos de cien metros en un minuto", () => {
    const t = 10.6 * HORA;
    const d = dondeVa(DE_INVIERNO, t);
    const a = enElMundo(DE_INVIERNO, PETTIROSSI, d.recorrido);
    const metros = d.velocidad * 60;
    const volado = { x: a.x + Math.sin(a.rumbo) * metros, z: a.z - Math.cos(a.rumbo) * metros };
    const b = enElMundo(DE_INVIERNO, PETTIROSSI, dondeVa(DE_INVIERNO, t + 60).recorrido);
    expect(Math.hypot(volado.x - b.x, volado.z - b.z)).toBeLessThan(100);
  });

  it("el rumbo es el del plano y no el verdadero: casi el mismo cerca del origen y varios grados lejos", () => {
    const grado = Math.PI / 180;
    const cerca = dondeVa(DE_INVIERNO, 10.5 * HORA);
    const deCerca = enElMundo(DE_INVIERNO, PETTIROSSI, cerca.recorrido);
    expect(Math.abs(deCerca.rumbo - cerca.rumbo)).toBeLessThan(1 * grado);
    const deLejos = enElMundo(DE_INVIERNO, TENERIFE, cerca.recorrido);
    expect(Math.abs(deLejos.rumbo - cerca.rumbo)).toBeGreaterThan(2 * grado);
    expect(Math.abs(deLejos.rumbo - cerca.rumbo)).toBeLessThan(30 * grado);
  });

  it("el camino que queda va de aquí a Pettirossi, por puntos, y el último cae en su origen", () => {
    const d = dondeVa(DE_INVIERNO, 10 * HORA);
    const puntos = caminoEnElMundo(DE_INVIERNO, PETTIROSSI, d.recorrido);
    expect(puntos.length).toBeGreaterThan(3);
    const ultimo = puntos.at(-1)!;
    expect(Math.hypot(ultimo.x, ultimo.z)).toBeLessThan(1);
    for (let i = 1; i < puntos.length; i++)
      expect(puntos[i]!.recorrido).toBeGreaterThan(puntos[i - 1]!.recorrido);
    const primero = enElMundo(DE_INVIERNO, PETTIROSSI, d.recorrido);
    expect(Math.hypot(puntos[0]!.x - primero.x, puntos[0]!.z - primero.z)).toBeLessThan(1);
  });

  it("en un mundo del camino, los puntos son los de la ortodrómica", () => {
    const m = puntoEn(DE_VERANO.ruta, 5_000_000);
    const p = enElMundo(DE_VERANO, TENERIFE, 5_000_000);
    expect(entre(sitioDelMundo(TENERIFE, p.x, p.z), m)).toBeLessThan(1);
  });
});

describe("el mundo del tramo", () => {
  it("sobre El Hierro, Canarias; en la entrada del Paraguay, el Paraguay", () => {
    const hierro = dondeVa(DE_INVIERNO, 2.4 * HORA).sitio;
    expect(mundoDelTramo(LOS_DOS, hierro)?.id).toBe("tenerife-norte");
    const paraguay = dondeVa(DE_INVIERNO, 10.6 * HORA).sitio;
    expect(mundoDelTramo(LOS_DOS, paraguay)?.id).toBe("pettirossi");
  });

  it("sin mundos no hay mundo", () => {
    expect(mundoDelTramo([], { lat: 0, lon: 0 })).toBeNull();
  });
});

describe("los niveles y el salto", () => {
  it("un salto de 7 h cae en crucero en cualquier temporada, en su nivel", () => {
    // Las 10 h 30, antes de la bajada del horario de verano, que empieza a las 10 h 43.
    for (const p of [DE_INVIERNO, DE_VERANO]) {
      const t = destinoDelSalto(p, 3.5 * HORA, 3.5 * HORA + 7 * HORA)!;
      expect(t).toBeCloseTo(10.5 * HORA);
      const e = dondeVa(p, t);
      expect(e.fase).toBe("crucero");
      expect(e.altitud).toBeCloseTo(NIVELES_DE_CRUCERO[2]);
      expect(t).toBeGreaterThan(ESCALONES[1]);
    }
  });
});

describe("quien lleva el avión, al caer", () => {
  const FICHA = { vr: 80, vref: 70, alturaDeLaRecogida: 9, alturaDelGas: 9, reversa: true, trenQueSeMete: true };
  const ARRIBA: LecturaDeLinea = {
    enTierra: false,
    enPista: false,
    x: 0,
    z: 0,
    rumbo: 0,
    velocidad: 230,
    porElSuelo: 230,
    altitud: 12192,
    altura: 12000,
    vertical: 0,
    motor: true,
    flaps: 0,
    tren: 0,
    fase: "en-vuelo",
    autorizado: false,
    raya: [],
    pista: { rumbo: 0, lado: 0, queda: 0 },
    tramo: { desde: { x: 0, z: 100000 }, hasta: { x: 0, z: 0 }, recta: false },
    alturaPedida: 12192,
    ritmoPedido: 0,
    faltaParaTocar: 1_000_000,
    enLaFinal: false,
    localizador: null,
    senda: null,
    cotaDelCampo: 100,
  };
  const PERMISOS = { arrancar: true, rodar: true, entrar: true, despegar: true };

  it("la tripulación queda en crucero, a la velocidad del perfil y sin subir ni bajar", () => {
    const t = new VueloDeLinea(FICHA);
    t.ponerEnCrucero(230, 12000);
    const m = t.paso(1 / 60, ARRIBA, PERMISOS);
    expect(t.estado.tramo).toBe("crucero");
    expect(m.velocidad).toBe(230);
    expect(m.subida).toBeCloseTo(0, 5);
    expect(m.alabeo).toBeCloseTo(0, 5);
    expect(m.tren).toBe(false);
    expect(m.flaps).toBe(0);
  });

  it("y sin nada que se lea como un cambio que acaba de pasar", () => {
    const t = new VueloDeLinea(FICHA);
    t.ponerEnCrucero(230, 12000);
    t.paso(1 / 60, ARRIBA, PERMISOS);
    expect(t.estado.potencia).toBe("subida");
    expect(t.estado.conEstaPotencia).toBeGreaterThan(600);
    expect(t.estado.enTramo).toBeGreaterThan(600);
  });

  it("al empezar a bajar no frena de golpe: sale de la velocidad del crucero y la va perdiendo con la altura", () => {
    const t = new VueloDeLinea(FICHA);
    t.ponerEnCrucero(230, 12000);
    t.paso(1 / 60, ARRIBA, PERMISOS);
    const bajando = { ...ARRIBA, ritmoPedido: -10, alturaPedida: 11900 };
    const arriba = t.paso(1 / 60, { ...bajando, altitud: 12000 }, PERMISOS);
    expect(t.estado.tramo).toBe("bajada");
    expect(arriba.velocidad).toBeCloseTo(230, 0);
    const aMedias = t.paso(1 / 60, { ...bajando, altitud: 7500 }, PERMISOS);
    expect(aMedias.velocidad).toBeLessThan(230);
    expect(aMedias.velocidad).toBeGreaterThan(280 * 0.5144);
    const alLlegar = t.paso(1 / 60, { ...bajando, altitud: 3050 }, PERMISOS);
    expect(alLlegar.velocidad).toBeCloseTo(280 * 0.5144, 0);
    expect(t.paso(1 / 60, { ...bajando, altitud: 3000 }, PERMISOS).velocidad).toBeCloseTo(250 * 0.5144, 0);
  });

  it("el cartel, apagado aunque el vuelo empezara con él puesto", () => {
    const c = new Cinturon();
    const momento = { fase: "en-vuelo" as const, conPasaje: true, movimiento: 0, loDijoLaComandante: false, loEncendioLaComandante: false, dt: 1 / 60 };
    expect(c.paso(momento)).toBe(true);
    c.enCruceroTrasElSalto();
    expect(c.paso(momento)).toBe(false);
    // Y lo que manda después, manda: la turbulencia lo enciende.
    expect(c.paso({ ...momento, movimiento: 1 })).toBe(true);
  });
});

describe("la espera del salto", () => {
  const PASO = 1 / 60;
  /** Le da fotogramas hasta que el estado deja de ser ese, y devuelve lo que tardó. */
  function hasta(e: EsperaDelSalto, de: string, tapa: boolean, llego: boolean, tope = 120): number {
    let t = 0;
    while (e.estado === de && t < tope) {
      e.paso(PASO, tapa, llego);
      t += PASO;
    }
    return t;
  }

  it("espera a que tape, y luego al mundo, y sale en cuanto llega y se ha dormido su rato", () => {
    const e = new EsperaDelSalto();
    expect(e.estado).toBe("tapando");
    e.paso(PASO, false, true);
    // Aunque el mundo ya esté, sin tapa no se pone nada.
    expect(e.estado).toBe("tapando");
    e.paso(PASO, true, false);
    expect(e.estado).toBe("cargando");
    // Sin el mundo no sale, por mucho que se haya dormido.
    for (let i = 0; i < 300; i++) e.paso(PASO, true, false);
    expect(e.estado).toBe("cargando");
    e.paso(PASO, true, true);
    expect(e.estado).toBe("listo");
    expect(e.saltoLaRed).toBe(false);
  });

  it("con el mundo ya puesto, no salta en un parpadeo: dura lo que dura el sueño", () => {
    const e = new EsperaDelSalto();
    e.paso(PASO, true, true);
    const t = hasta(e, "cargando", true, true);
    expect(t).toBeGreaterThanOrEqual(DURA_EL_SUENO - 2 * PASO);
    expect(t).toBeLessThan(DURA_EL_SUENO + 1);
    expect(e.saltoLaRed).toBe(false);
  });

  it("si el mundo no llega, la red suelta: a los veinte segundos de pared, y lo dice", () => {
    const e = new EsperaDelSalto();
    e.paso(PASO, true, false);
    const t = hasta(e, "cargando", true, false);
    expect(e.estado).toBe("listo");
    expect(e.saltoLaRed).toBe(true);
    expect(t).toBeGreaterThanOrEqual(RED_DEL_MUNDO - 2 * PASO);
    expect(t).toBeLessThan(RED_DEL_MUNDO + 1);
  });

  it("la red sale también con fotogramas enormes, de una máquina que no da abasto", () => {
    const e = new EsperaDelSalto();
    e.paso(0.1, true, false);
    for (let i = 0; i < 25 && e.estado === "cargando"; i++) e.paso(1, true, false);
    expect(e.estado).toBe("listo");
    expect(e.saltoLaRed).toBe(true);
  });

  it("sin tapa no se salta: a los cinco segundos, se deja", () => {
    const e = new EsperaDelSalto();
    const t = hasta(e, "tapando", false, true);
    expect(e.estado).toBe("dejado");
    expect(t).toBeLessThan(RED_DE_LA_TAPA + 1);
  });

  it("si deja de tapar a media espera, se deja: nunca se salta a la vista", () => {
    const e = new EsperaDelSalto();
    e.paso(PASO, true, false);
    e.paso(PASO, false, true);
    expect(e.estado).toBe("dejado");
  });
});
