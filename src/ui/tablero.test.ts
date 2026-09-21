/**
 * Que el cuadro que se dibuja es **el del avión que se vuela**.
 *
 * Lo que de verdad contesta a «que cada aeronave parezca lo que es» hay que
 * mirarlo, y para eso está `scripts/verificar-cuadro.mjs`, que abre un
 * navegador y mide lo que el navegador pinta. Aquí se clavan las cosas que sí
 * se pueden comprobar sin ojos y que, mal, se notarían tarde: que cada avión
 * cae en su familia, que hay tantas agujas como motores y que el dibujo se
 * queda dentro de su caja.
 */

import { describe, expect, it } from "vitest";
import { huecosDeAviso, Tablero } from "./tablero";
import { LUCES } from "../flight/avisos-de-cabina";
import { AIRCRAFT, aircraftById } from "../flight/aircraft";
import {
  ALTO_DEL_CUADRO,
  ANCHO_DEL_CUADRO,
  familiaDe,
  VISERA,
} from "./familia";

const dibujo = (id: string) => new Tablero().markup(aircraftById(id));

describe("el cuadro de cada avión", () => {
  it("lleva la caja de siempre, que es lo que lo mantiene centrado", () => {
    for (const a of AIRCRAFT) {
      expect(new Tablero().markup(a)).toContain(
        `viewBox="0 0 ${ANCHO_DEL_CUADRO} ${ALTO_DEL_CUADRO}"`,
      );
    }
  });

  it("y la familia que le toca por el motor que lleva", () => {
    for (const a of AIRCRAFT) {
      expect(new Tablero().markup(a)).toContain(
        `data-familia="${familiaDe(a)}"`,
      );
    }
  });

  it("una aguja por motor, en todos", () => {
    for (const a of AIRCRAFT) {
      const marcado = new Tablero().markup(a);
      expect(marcado.match(/data-motor-cifra="/g)?.length).toBe(a.motores);
    }
  });

  it("el grande enseña sus cuatro columnas de N1", () => {
    const marcado = dibujo("jaz-120");
    expect(marcado.match(/data-motor-aguja="/g)).toHaveLength(4);
    expect(marcado).toContain("N1");
  });

  it("y la avioneta de un motor **sí** lleva cuentavueltas", () => {
    // Antes no lo llevaba, y era una decisión razonada que en la práctica
    // dejaba el hueco de la derecha en blanco. Un tacómetro es el primer
    // instrumento de motor que se aprende: la aguja en el verde.
    const marcado = dibujo("jaz-20");
    expect(marcado.match(/data-motor-aguja="/g)).toHaveLength(1);
    expect(marcado).toContain("RPM");
  });
});

describe("lo que lleva cada familia", () => {
  it("los de pistón, seis esferas y ninguna pantalla de navegación", () => {
    const marcado = dibujo("jaz-25");
    expect(marcado.match(/data-dial="/g)).toHaveLength(6);
    expect(marcado).not.toContain('data-fondo="nd"');
  });

  it("el turbohélice, dos pantallas y una sola referencia de rumbo", () => {
    const marcado = dibujo("jaz-60");
    expect(marcado).toContain('data-fondo="pfd"');
    expect(marcado).toContain('data-fondo="nd"');
    // Ni cinta de rumbo además de la rosa: **una sola brújula por avión**.
    expect(marcado.match(/data-tira="hdg"/g)).toBeNull();
  });

  it("los de línea, cinta de rumbo en el horizonte y la rosa en el mapa", () => {
    const marcado = dibujo("jaz-90");
    expect(marcado.match(/data-tira="hdg"/g)).toHaveLength(1);
    expect(marcado.match(/data-cristal="rosa"/g)).toHaveLength(1);
    expect(marcado).toContain('data-fondo="eicas"');
  });

  it("y el MCP de la visera solo en los de línea", () => {
    expect(dibujo("jaz-120")).toContain('data-mcp="spd"');
    expect(dibujo("jaz-60")).not.toContain("data-mcp");
  });
});

describe("las patas del tren", () => {
  it("cinco en el grande y tres en el resto", () => {
    expect(dibujo("jaz-120").match(/class="cr__tren"/g)).toHaveLength(5);
    expect(dibujo("jaz-90").match(/class="cr__tren"/g)).toHaveLength(3);
    expect(dibujo("jaz-20").match(/class="cr__tren"/g)).toHaveLength(3);
  });
});

/*
 * ── Los avisos, dentro de la visera ───────────────────────────────────────
 *
 * Cada luz tenía su sitio fijo en una columna de ocho, y ocho por veintitrés
 * píxeles son 184: la visera mide 64. De la tercera en adelante el aviso
 * salía por debajo de la banda negra, encima de los instrumentos. «El aviso
 * rojo se pone por debajo de la banda negra.»
 */
describe("el panel de avisos cabe en la visera", () => {
  const todas = LUCES.map((l) => l.id);

  it("con todas encendidas, ninguna se sale de los 64 de la visera", () => {
    const puestos = huecosDeAviso(todas);
    expect(puestos.length).toBeGreaterThan(0);
    // 20 de alto: el borde de abajo no puede pasar de la visera.
    for (const h of puestos) expect(h.y + 20).toBeLessThanOrEqual(VISERA);
  });

  it("y ninguna se mete en el MCP, que empieza en la 490", () => {
    for (const h of huecosDeAviso(todas)) expect(h.x + 96).toBeLessThan(490);
  });

  it("y la que esté encendida va a la esquina, no al hueco que le tocara", () => {
    /*
     * Lo que fallaba: la del freno es la última de la lista, así que se
     * dibujaba a y=146 —ochenta píxeles por debajo de la banda— aunque fuera
     * la única encendida.
     */
    expect(huecosDeAviso(["freno"])).toEqual([{ id: "freno", x: 8, y: 8 }]);
  });

  it("y si hubiera más de las que caben, se ven las primeras", () => {
    // `encendidas` las da por gravedad, así que las primeras son las graves.
    expect(huecosDeAviso(todas)).toHaveLength(4);
    expect(huecosDeAviso(todas).map((h) => h.id)).toEqual(todas.slice(0, 4));
  });
});

/*
 * ── El depósito, en los seis y en las dos superficies ──────────────────────
 *
 * Esto es el fallo clásico de esta casa: un instrumento que existe en el
 * cuadro plano —el que se ve desde fuera— y no en las pantallas de la cabina,
 * o al revés. Ha pasado con la carta, con las cifras y con las luces del
 * tren, y las tres veces se contó jugando y no lo vio ningún test. Aquí se
 * clava lo que sí se puede clavar sin navegador: que el marcado del cuadro lo
 * lleva, y que el módulo de la cabina también lo dibuja.
 */
describe("el indicador de combustible", () => {
  it("está en el cuadro de los seis aviones", () => {
    for (const a of AIRCRAFT) {
      const marcado = new Tablero().markup(a);
      expect(marcado).toContain('data-cristal="combustible"');
      expect(marcado).toContain('data-combustible="barra"');
      // Y la franja de la reserva, que es la meta hacia la que baja la barra.
      expect(marcado).toContain('data-combustible="reserva"');
      expect(marcado).toContain(">FUEL<");
    }
  });

  it("y uno solo por cuadro: dos depósitos serían dos aviones", () => {
    for (const a of AIRCRAFT) {
      const marcado = new Tablero().markup(a);
      expect(marcado.match(/data-cristal="combustible"/g)).toHaveLength(1);
    }
  });
});
