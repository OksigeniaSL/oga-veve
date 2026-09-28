/**
 * Lo que cuenta la comandante con números, redondeado como lo redondea una
 * persona y montado con trozos que existen.
 */
import { describe, expect, it } from "vitest";
import { hayTexto } from "../i18n";
import { TIEMPO_DE_CASA, type Meteo } from "../world/meteo";
import { MILLA, PIE, cruceroDelPlan, rutaDe, type Fijo } from "../flight/ruta";
import {
  MAS_CALOR,
  MAS_FRIO,
  MINUTOS_QUE_SE_DICEN,
  bienvenidaConPlan,
  cieloDe,
  descensoPara,
  gradosDichos,
  minutosDichos,
  nivelDicho,
  piezaDeGrados,
  segundosHastaTocar,
} from "./partes-de-la-comandante";

const tiempo = (m: Partial<Meteo>): Meteo => ({ ...TIEMPO_DE_CASA, ...m });

describe("los minutos, como se dicen", () => {
  it("de cinco en cinco, y los pocos de una bajada corta tal cual", () => {
    expect(minutosDichos(3 * 60)).toBe(3);
    expect(minutosDichos(7 * 60)).toBe(5);
    expect(minutosDichos(8 * 60)).toBe(10);
    expect(minutosDichos(17 * 60)).toBe(15);
    expect(minutosDichos(23 * 60)).toBe(25);
  });

  it("y nunca uno que no esté grabado", () => {
    for (let s = 0; s < 3 * 3600; s += 17)
      expect(MINUTOS_QUE_SE_DICEN).toContain(minutosDichos(s));
  });

  it("y cuánto falta sale de la distancia y la velocidad", () => {
    // Treinta kilómetros a ciento cincuenta por segundo: tres minutos y un
    // poco, más el de la aproximación.
    expect(minutosDichos(segundosHastaTocar(30000, 150))).toBe(4);
  });
});

describe("el nivel de crucero que se anuncia", () => {
  /** El que se anuncia de una ruta recta de tantos km hacia ese rumbo verdadero. */
  const anunciado = (rumbo: number, km: number, techo: number): number | null => {
    const r = (rumbo * Math.PI) / 180;
    const punto = (m: number, papel: Fijo["papel"]): Fijo => ({
      nombre: papel,
      x: Math.sin(r) * m,
      z: -Math.cos(r) * m,
      papel,
      minima: null,
    });
    const ruta = rutaDe([punto(0, "despegue"), punto(km * 1000, "umbral")], 0);
    return nivelDicho(cruceroDelPlan(ruta, { techo, cotaDeSalida: 0, declinacion: 0 }, null));
  };

  it("impar hacia el este y par hacia el oeste, como manda la regla", () => {
    // Ciento cincuenta kilómetros, un salto largo entre islas.
    expect(anunciado(120, 150, 11000)! % 2).toBe(1);
    expect(anunciado(300, 150, 11000)! % 2).toBe(0);
  });

  it("más alto en las rutas largas que en los saltos cortos", () => {
    expect(anunciado(90, 400, 11000)!).toBeGreaterThan(anunciado(90, 120, 11000)!);
  });

  it("y nunca por encima de lo que da el avión", () => {
    // Un avión con techo en cinco mil metros: dieciséis mil pies y pico.
    expect(anunciado(90, 900, 5000)!).toBeLessThanOrEqual(16);
  });

  it("es el crucero del plan tal cual, en miles de pies", () => {
    expect(nivelDicho(11000 * PIE)).toBe(11);
    expect(nivelDicho(24000 * PIE)).toBe(24);
  });

  it("y un nivel que no está grabado no se redondea a otro: no se dice", () => {
    // Un salto de veinte millas en avioneta se planea a tres mil pies, y
    // anunciar los cinco mil de la primera grabación sería mentir.
    expect(nivelDicho(3000 * PIE)).toBeNull();
    expect(anunciado(90, 20 * (MILLA / 1000), 3000)).toBeNull();
  });
});

describe("el cielo y los grados", () => {
  it("lo que cae manda sobre las nubes, y la niebla sobre cualquier capa", () => {
    expect(cieloDe(tiempo({ lluvia: "tormenta", techoM: 600 }))).toBe(
      "tormenta",
    );
    expect(cieloDe(tiempo({ lluvia: "llovizna" }))).toBe("lluvia");
    expect(cieloDe(tiempo({ visibilidadM: 400, techoM: 60 }))).toBe("niebla");
    expect(cieloDe(tiempo({ techoM: null }))).toBe("despejado");
    expect(cieloDe(tiempo({ techoM: 900, tapadura: 1 }))).toBe("nublado");
    expect(cieloDe(tiempo({ techoM: 900, tapadura: 0.3 }))).toBe("nubes");
  });

  it("los grados, al entero y dentro de lo grabado", () => {
    expect(gradosDichos(21.4)).toBe(21);
    expect(gradosDichos(-12)).toBe(MAS_FRIO);
    expect(gradosDichos(51)).toBe(MAS_CALOR);
    expect(piezaDeGrados(-3)).toBe("comandante.temperatura.menos3");
    expect(piezaDeGrados(0)).toBe("comandante.temperatura.0");
  });
});

describe("el anuncio del descenso", () => {
  it("hacia el destino, con cuánto falta y el tiempo de allí", () => {
    const d = descensoPara(
      "tenerife-norte",
      10 * 60,
      tiempo({ temp: 18, techoM: null }),
    );
    expect(d.clave).toBe("comandante.descenso");
    expect(d.relleno).toEqual({
      hacia: "comandante.descenso.hacia.tenerife-norte",
      minutos: "comandante.minutos.10",
      cielo: "comandante.cielo.despejado",
      temperatura: "comandante.temperatura.18",
    });
    expect(d.texto).toContain("Tenerife Norte");
    expect(d.texto).toContain("10 minutos");
    expect(d.texto).toContain("18 grados");
  });

  it("de vuelta al campo, sin nombre; y un campo nuevo, con la de reserva", () => {
    expect(descensoPara(null, 300, TIEMPO_DE_CASA).relleno.hacia).toBe(
      "comandante.descenso.vuelta",
    );
    expect(descensoPara("uno-nuevo", 300, TIEMPO_DE_CASA).relleno.hacia).toBe(
      "comandante.descenso.hacia",
    );
  });

  it("y el singular, que es lo único que la plantilla no sabe decir", () => {
    expect(descensoPara(null, 300, tiempo({ temp: 1 })).texto).toContain(
      "1 grado.",
    );
  });

  it("y cada campo de la bienvenida tiene también su bajada", () => {
    const campos = [
      "pettirossi",
      "guarani",
      "encarnacion",
      "concepcion",
      "pedro-juan",
      "estigarribia",
      "ayolas",
      "pilar",
      "yvytu-rape",
      "tenerife-norte",
      "tenerife-sur",
      "gran-canaria",
      "lanzarote",
      "fuerteventura",
      "la-palma",
      "el-hierro",
      "la-gomera",
    ];
    for (const c of campos) {
      expect(hayTexto(`comandante.bienvenida.${c}`)).toBe(true);
      expect(hayTexto(`comandante.descenso.hacia.${c}`)).toBe(true);
    }
  });
});

describe("la bienvenida con el plan", () => {
  const forma = { id: "comandante.bienvenida.la-palma", texto: "Bienvenidos." };

  it("cuelga cuánto dura y a qué altura se va", () => {
    const b = bienvenidaConPlan(forma, 20 * 60, 13);
    expect(b.clave).toBe("comandante.bienvenidaConPlan");
    expect(b.relleno).toEqual({
      bienvenida: "comandante.bienvenida.la-palma",
      vuelo: "comandante.previsto.vuelo.20",
      nivel: "comandante.previsto.nivel.13",
    });
    expect(b.texto).toContain("20 minutos");
    expect(b.texto).toContain("13 mil pies");
  });

  it("y en una vuelta al campo no se inventa un plan", () => {
    expect(bienvenidaConPlan(forma, null, null)).toEqual({
      clave: forma.id,
      relleno: {},
      texto: forma.texto,
    });
  });
});
