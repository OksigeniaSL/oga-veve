/**
 * **Cada avión, en su sitio: el que va a las dos sale a las dos.**
 *
 * Dicho jugando, con tres capturas: el avión que se ve delante a la derecha
 * salía en la pantalla de navegación delante a la izquierda, y uno que
 * adelantaba por debajo salía detrás. La primera sospecha era la de siempre
 * con esta cuenta —un eje con el signo cambiado, o el rumbo magnético donde
 * va el verdadero— y esto es la prueba que la habría cazado: un tráfico a dos
 * millas en cada una de las ocho direcciones, con cuatro rumbos propios, por
 * el camino entero que recorre en el juego —el TCAS que lo sigue, lo que el
 * juego le pasa a la carta y la carta que lo pone en píxeles— y para los tres
 * aviones que llevan TCAS.
 *
 * Pasa con el código en el que se sospechó, y eso es lo que dice: la cuenta
 * del mundo a la carta no estaba en espejo ni girada. Lo que no casaba era
 * otra cosa —ver `world/se-ve-de-lejos.ts`, la banda de altura del TCAS y la
 * frecuencia de la radio—, y esta prueba se queda para que el espejo, si un
 * día llega, no pase.
 */
import { describe, expect, it } from "vitest";
import { AIRCRAFT } from "../flight/aircraft";
import { Tcas, type Intruso, type Propio } from "../flight/tcas";
import { dibujarLaCarta, MILLA, type Mapa } from "./carta";
import { enElPapelDelMapa, LADO } from "./mapa";

const PIE = 0.3048;

/** Las ocho direcciones del reloj, en grados desde el morro. */
const OCHO = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/**
 * Rumbos propios: al norte, al este, casi al sur —el de la final de La Palma
 * en la captura 125— y el de la 115, subiendo hacia La Palma.
 */
const RUMBOS = [0, 90, 179, 302] as const;

/** La marcación de algo en la carta, en grados desde arriba y a derechas. */
function marcacion(dx: number, dy: number): number {
  return ((((Math.atan2(dx, -dy) * 180) / Math.PI) % 360) + 360) % 360;
}

/** Diferencia de dos ángulos, en grados, entre −180 y 180. */
function diferencia(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

/** Yo, a 14 000 ft sobre el mar, en el origen y con este rumbo verdadero. */
function yo(rumbo: number): Propio {
  return {
    x: 0,
    y: 14000 * PIE,
    z: 0,
    sobreElSuelo: 14000 * PIE,
    rumbo,
    pantalla: true,
    terrenoAvisando: false,
  };
}

/**
 * Un tráfico a unas dos millas en la marcación `relativa` vista desde el
 * morro, a quinientos pies por encima. Norte es −Z y este es +X: el mundo del
 * juego.
 *
 * **Y cada uno a una distancia distinta**: dos millas y una décima más por
 * cada paso de reloj. Las ocho direcciones son simétricas, y una carta en
 * espejo pone las ocho en las mismas ocho marcaciones —la de las tres en las
 * nueve—: comparadas como conjunto, el espejo pasaría. Con la distancia se
 * sabe cuál es cada uno, y se mira cada uno en su sitio.
 */
function millasDe(relativa: number): number {
  return 2 + OCHO.indexOf(relativa as (typeof OCHO)[number]) * 0.1;
}

function aDosMillas(rumbo: number, relativa: number): Intruso {
  const h = ((rumbo + relativa) * Math.PI) / 180;
  const d = millasDe(relativa) * MILLA;
  return {
    id: `a-las-${relativa}`,
    x: Math.sin(h) * d,
    y: 14500 * PIE,
    z: -Math.cos(h) * d,
  };
}

/** Cuál de los ocho es, por su distancia. Ver `millasDe`. */
function cualEs(millas: number): number {
  return OCHO[Math.round((millas - 2) / 0.1)]!;
}

describe("el tráfico en la carta, en las ocho direcciones", () => {
  const conTcas = AIRCRAFT.filter((a) => a.tcas);

  it("los tres aviones que lo llevan: el turbohélice y los dos reactores", () => {
    expect(conTcas.map((a) => a.tcas)).toEqual(["TCAS I", "TCAS II", "TCAS II"]);
  });

  for (const avion of conTcas)
    for (const rumbo of RUMBOS)
      it(`${avion.id} con rumbo ${rumbo}: cada uno sale a su hora y a su distancia`, () => {
        const tcas = new Tcas();
        const intrusos = OCHO.map((r) => aDosMillas(rumbo, r));
        // Dos ciclos: el primero lo descubre, el segundo ya le sabe el ritmo.
        tcas.paso(1, avion.tcas, yo(rumbo), intrusos);
        tcas.paso(1, avion.tcas, yo(rumbo), intrusos);
        expect(tcas.enPantalla).toHaveLength(8);
        /*
         * Lo que el juego le pasa a la carta, con los mismos campos que
         * `Game.traficoParaLaCarta`: sitio, clase, altura y tendencia.
         */
        const mapa: Mapa = {
          x: 0,
          z: 0,
          pista: null,
          otros: tcas.enPantalla.map((b) => ({
            x: b.x,
            z: b.z,
            clase: b.clase,
            relativa: b.relativa,
            tendencia: b.tendencia,
          })),
        };
        const RADIO = 100;
        // Con el rumbo **verdadero**, que es con el que la llaman las dos
        // superficies —ver `Tablero.laCarta` y `pintarLaCarta`—.
        const dibujo = dibujarLaCarta(mapa, rumbo, RADIO);
        // Sin pista debajo, la carta se queda en su rango de diez millas.
        expect(dibujo.rango).toBe(10);
        expect(dibujo.otros).toHaveLength(8);
        const porMilla = RADIO / dibujo.rango;
        const vistos = new Set<number>();
        for (const o of dibujo.otros) {
          // Cada uno, por su distancia, en su marcación: el de las dos, a las dos.
          const r = cualEs(Math.hypot(o.dx, o.dy) / porMilla);
          vistos.add(r);
          expect(Math.abs(diferencia(marcacion(o.dx, o.dy), r)), `el de las ${r}`).toBeLessThan(0.5);
          // Y quinientos pies por encima: «+05», con la etiqueta arriba.
          expect(o.etiqueta).toBe("+05");
          expect(o.encima).toBe(true);
        }
        expect(vistos.size).toBe(8);
      });

  it("y el que va delante a la derecha sale delante a la derecha (la 115)", () => {
    const tcas = new Tcas();
    const rumbo = 302;
    const delanteDerecha = aDosMillas(rumbo, 30);
    tcas.paso(1, "TCAS II", yo(rumbo), [delanteDerecha]);
    tcas.paso(1, "TCAS II", yo(rumbo), [delanteDerecha]);
    const [b] = tcas.enPantalla;
    const d = dibujarLaCarta(
      {
        x: 0,
        z: 0,
        pista: null,
        otros: [{ x: b!.x, z: b!.z, clase: b!.clase, relativa: b!.relativa, tendencia: 0 }],
      },
      rumbo,
      100,
    );
    const [o] = d.otros;
    expect(o!.dx).toBeGreaterThan(0);
    expect(o!.dy).toBeLessThan(0);
  });

  it("y el que adelanta por debajo, todavía detrás, sale detrás (la 119)", () => {
    const tcas = new Tcas();
    const rumbo = 302;
    // A media milla por detrás y dos mil cien pies por debajo.
    const h = ((rumbo + 180) * Math.PI) / 180;
    const debajo: Intruso = {
      id: "debajo",
      x: Math.sin(h) * 0.5 * MILLA,
      y: (14000 - 2100) * PIE,
      z: -Math.cos(h) * 0.5 * MILLA,
    };
    tcas.paso(1, "TCAS II", yo(rumbo), [debajo]);
    tcas.paso(1, "TCAS II", yo(rumbo), [debajo]);
    const [b] = tcas.enPantalla;
    const d = dibujarLaCarta(
      {
        x: 0,
        z: 0,
        pista: null,
        otros: [{ x: b!.x, z: b!.z, clase: b!.clase, relativa: b!.relativa, tendencia: 0 }],
      },
      rumbo,
      100,
    );
    expect(d.otros[0]!.dy).toBeGreaterThan(0);
    expect(d.otros[0]!.etiqueta).toBe("-21");
  });
});

describe("y en el plano, con el norte arriba", () => {
  /*
   * El plano no gira con el avión: el que va a las dos de un avión que vuela
   * al 302 está al 332, y ahí tiene que salir. Los mismos que la carta —los
   * del TCAS— y en el mismo sitio del mundo.
   */
  for (const rumbo of RUMBOS)
    it(`con rumbo ${rumbo}, cada uno sale en su marcación verdadera`, () => {
      const tcas = new Tcas();
      const intrusos = OCHO.map((r) => aDosMillas(rumbo, r));
      tcas.paso(1, "TCAS II", yo(rumbo), intrusos);
      tcas.paso(1, "TCAS II", yo(rumbo), intrusos);
      const encuadre = { cx: 0, cz: 0, escala: 0.01 };
      const centro = LADO / 2;
      expect(tcas.enPantalla).toHaveLength(8);
      for (const b of tcas.enPantalla) {
        const [x, y] = enElPapelDelMapa(b, encuadre);
        const millas = Math.hypot(x - centro, y - centro) / encuadre.escala / MILLA;
        const r = cualEs(millas);
        expect(
          Math.abs(diferencia(marcacion(x - centro, y - centro), (rumbo + r) % 360)),
          `el de las ${r}`,
        ).toBeLessThan(0.5);
      }
    });
});
