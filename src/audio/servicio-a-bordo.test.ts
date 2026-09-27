/**
 * Que el servicio a bordo rote, y que ofrezca lo de cada sitio.
 *
 * Lo que se comprueba es lo que lo hace entretenido: que lo que se ofrece
 * cambie de un vuelo a otro **sin repetir seguido**, y que cada anuncio que
 * el juego puede pedir exista escrito —y por tanto en la lista de grabar—.
 */
import { describe, expect, it } from "vitest";
import { hayTexto, t, type TranslationKey } from "../i18n";
import {
  DE_LA_GRANJA,
  DE_PARAGUAY,
  VUELO_LARGO_MINUTOS,
  elegirProducto,
  esVueloLargo,
  productosDe,
  servicioPara,
} from "./servicio-a-bordo";

/** Un azar con semilla, para que la prueba dé siempre lo mismo. */
function azarDe(semilla: number): () => number {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("lo que pasa por el pasillo", () => {
  it("en Paraguay, la fruta y el maní de la granja, y además chipa y mbejú", () => {
    expect(productosDe("paraguayo")).toEqual(DE_PARAGUAY);
    expect(productosDe("paraguayo")).toContain("chipa");
    expect(productosDe("paraguayo")).toContain("mbeju");
  });

  it("en Canarias, lo de la granja, sin lo que allí nadie reconocería por el nombre", () => {
    expect(productosDe("canario")).toEqual(DE_LA_GRANJA);
    expect(productosDe("canario")).not.toContain("chipa");
  });
});

describe("y rota de un vuelo a otro", () => {
  it("nunca repite lo del vuelo anterior", () => {
    const azar = azarDe(7);
    for (const habla of ["paraguayo", "canario"] as const) {
      let ultimo: string | null = null;
      for (let vuelo = 0; vuelo < 500; vuelo++) {
        const hoy = elegirProducto(habla, ultimo, azar);
        expect(hoy).not.toBe(ultimo);
        ultimo = hoy;
      }
    }
  });

  it("y con los vuelos salen todos, no siempre los mismos dos", () => {
    const azar = azarDe(11);
    const vistos = new Set<string>();
    let ultimo: string | null = null;
    for (let vuelo = 0; vuelo < 60; vuelo++) {
      ultimo = elegirProducto("paraguayo", ultimo, azar);
      vistos.add(ultimo);
    }
    expect([...vistos].sort()).toEqual([...DE_PARAGUAY].sort());
  });

  it("y lo último de la otra orilla no quita nada aquí", () => {
    // La chipa de ayer en Asunción no deja a Canarias con un producto menos.
    const vistos = new Set<string>();
    const azar = azarDe(3);
    for (let i = 0; i < 100; i++)
      vistos.add(elegirProducto("canario", "chipa", azar));
    expect(vistos.size).toBe(DE_LA_GRANJA.length);
  });
});

describe("y el anuncio, montado", () => {
  it("siempre con agua; café y té solo en los vuelos largos", () => {
    expect(esVueloLargo(VUELO_LARGO_MINUTOS - 1)).toBe(false);
    expect(esVueloLargo(VUELO_LARGO_MINUTOS)).toBe(true);
    const corto = servicioPara("paraguayo", "mango", 20);
    expect(corto.piezas).toEqual(["tripulacion.servicio.mango"]);
    const largo = servicioPara("paraguayo", "chipa", 40);
    expect(largo.piezas).toEqual([
      "tripulacion.servicio.chipa",
      "tripulacion.servicio.largo",
    ]);
    expect(largo.clave).toBe("tripulacion.servicio");
    expect(largo.relleno).toEqual({
      producto: "tripulacion.servicio.chipa",
      largo: "tripulacion.servicio.largo",
    });
  });

  it("en Canarias, con la voz de allí, y a veces como un sabor de Paraguay", () => {
    const siempre = () => 0;
    const nunca = () => 0.99;
    expect(servicioPara("canario", "banana", 20, nunca).piezas).toEqual([
      "tripulacion.canario.servicio.banana",
    ]);
    expect(servicioPara("canario", "banana", 20, siempre).piezas).toEqual([
      "tripulacion.canario.servicio.banana.paraguay",
    ]);
    expect(servicioPara("canario", "mani", 40, nunca).clave).toBe(
      "tripulacion.canario.servicio",
    );
  });

  it("y todo lo que puede pedir el juego está escrito, que es lo que se graba", () => {
    const faltan: string[] = [];
    for (const habla of ["paraguayo", "canario"] as const)
      for (const p of productosDe(habla))
        for (const azar of [() => 0, () => 0.99])
          for (const pieza of servicioPara(habla, p, 60, azar).piezas)
            if (!hayTexto(pieza)) faltan.push(pieza);
    expect(faltan).toEqual([]);
  });

  it("y cada anuncio lleva el agua y es de la granja, sin marcas ajenas", () => {
    for (const habla of ["paraguayo", "canario"] as const)
      for (const p of productosDe(habla))
        for (const azar of [() => 0, () => 0.99]) {
          const [producto] = servicioPara(habla, p, 20, azar).piezas;
          const texto = t(producto as TranslationKey);
          expect(texto).toMatch(/\bagua\b/);
          expect(texto).toContain("Granja Óga");
        }
  });
});
