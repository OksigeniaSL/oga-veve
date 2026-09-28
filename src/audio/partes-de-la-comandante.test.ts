/**
 * Lo que cuenta la comandante con números, redondeado como lo redondea una
 * persona y montado con trozos que existen.
 */
import { describe, expect, it } from "vitest";
import { hayTexto } from "../i18n";
import { TIEMPO_DE_CASA, type Meteo } from "../world/meteo";
import {
  MAS_CALOR,
  MAS_FRIO,
  MINUTOS_QUE_SE_DICEN,
  bienvenidaConPlan,
  cieloDe,
  descensoPara,
  gradosDichos,
  minutosDichos,
  nivelPrevisto,
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
  it("impar hacia el este y par hacia el oeste, como manda la regla", () => {
    // Noventa kilómetros, un salto entre islas.
    expect(nivelPrevisto(120, 90000, 11000) % 2).toBe(1);
    expect(nivelPrevisto(300, 90000, 11000) % 2).toBe(0);
  });

  it("más alto en las rutas largas que en los saltos cortos", () => {
    expect(nivelPrevisto(90, 400000, 11000)).toBeGreaterThan(
      nivelPrevisto(90, 60000, 11000),
    );
  });

  it("y nunca por encima de lo que da el avión", () => {
    // Un avión con techo en cinco mil metros: dieciséis mil pies y pico.
    expect(nivelPrevisto(90, 900000, 5000)).toBeLessThanOrEqual(16);
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
