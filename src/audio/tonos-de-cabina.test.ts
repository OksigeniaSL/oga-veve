/**
 * Los tonos de la cabina de pasaje: cada uno el suyo, en su momento y desde
 * la vista que lo oye. Ver `tonos-de-cabina.ts`.
 */

import { describe, expect, it } from "vitest";
import { MOTIVOS } from "./audio";
import {
  AGUDA,
  GRAVE,
  HASTA_QUE_LLEGAN,
  LLAMA_DESDE,
  LLAMA_HASTA,
  LlamadasDelPasaje,
  SIN_CORTE,
  TONOS_DE_CABINA,
  comoSeOyeLaTripulacion,
  esTonoDeCabina,
  esperaTrasLaLlamada,
  fuerzaDelTono,
  llamadaAntesDe,
  type MomentoDelPasaje,
} from "./tonos-de-cabina";

describe("los tonos de la cabina, los de Boeing y Airbus", () => {
  it("el cinturón es una nota grave, y ya no dos", () => {
    expect(MOTIVOS.cinturon.notas).toEqual([GRAVE]);
  });

  it("el pasajero que llama, una aguda", () => {
    expect(MOTIVOS.llamadaPasajero.notas).toEqual([AGUDA]);
  });

  it("la llamada de la tripulación, aguda y grave", () => {
    expect(MOTIVOS.llamadaTripulacion.notas).toEqual([AGUDA, GRAVE]);
  });

  it("y la de emergencia, aguda y grave tres veces", () => {
    expect(MOTIVOS.llamadaEmergencia.notas).toEqual([AGUDA, GRAVE, AGUDA, GRAVE, AGUDA, GRAVE]);
  });

  it("ninguno manda callar a nadie: son timbres, no alarmas", () => {
    for (const t of TONOS_DE_CABINA) expect(MOTIVOS[t].manda, t).toBeFalsy();
  });

  it("y el tono de lo que cambia en el cuadro no se parece a ninguno", () => {
    expect(esTonoDeCabina("cambio")).toBe(false);
    for (const t of TONOS_DE_CABINA) {
      expect(MOTIVOS.cambio.notas, t).not.toEqual(MOTIVOS[t].notas);
      for (const f of MOTIVOS.cambio.notas) expect([AGUDA, GRAVE], t).not.toContain(f);
    }
  });
});

describe("desde qué vista se oye cada uno", () => {
  it("en el pasaje, todos a tope", () => {
    for (const t of TONOS_DE_CABINA) expect(fuerzaDelTono(t, "pasaje"), t).toBe(1);
  });

  it("en la cabina de mando, el del cinturón y las llamadas, por la puerta; el del pasajero, no", () => {
    expect(fuerzaDelTono("cinturon", "cabina")).toBeGreaterThan(0);
    expect(fuerzaDelTono("cinturon", "cabina")).toBeLessThan(1);
    expect(fuerzaDelTono("llamadaTripulacion", "cabina")).toBeGreaterThan(0);
    expect(fuerzaDelTono("llamadaEmergencia", "cabina")).toBeGreaterThan(0);
    expect(fuerzaDelTono("llamadaPasajero", "cabina")).toBe(0);
  });

  it("y desde fuera, el pasajero tampoco", () => {
    expect(fuerzaDelTono("llamadaPasajero", "fuera")).toBe(0);
    expect(fuerzaDelTono("cinturon", "fuera")).toBeGreaterThan(0);
  });
});

describe("la llamada va delante de la megafonía que la lleva", () => {
  it("lo que se le dice a la tripulación lleva la aguda y grave", () => {
    for (const clave of [
      "comandante.crosscheck",
      "comandante.despegue",
      "comandante.despegue~3",
      "comandante.aproximacion",
      "comandante.alturaSegura",
    ])
      expect(llamadaAntesDe(clave), clave).toBe("llamadaTripulacion");
  });

  it("el descenso de emergencia, la de emergencia", () => {
    expect(llamadaAntesDe("comandante.descensoDeEmergencia")).toBe("llamadaEmergencia");
  });

  it("y lo que se le dice al pasaje, ninguna", () => {
    for (const clave of [
      "comandante.bienvenida",
      "comandante.crucero",
      "tripulacion.servicio",
      "tripulacion.cinturones",
      "comandante.llegada.pettirossi~2",
    ])
      expect(llamadaAntesDe(clave), clave).toBeNull();
  });

  it("menos lo de después de aterrizar, que pide atención rodando: aguda y grave", () => {
    for (const clave of ["tripulacion.llegada", "tripulacion.canario.llegada"])
      expect(llamadaAntesDe(clave), clave).toBe("llamadaTripulacion");
    // Y no sus piezas sueltas, que no son el anuncio.
    expect(llamadaAntesDe("tripulacion.bienvenidos.pettirossi")).toBeNull();
  });

  it("y la voz espera a que acabe su tono", () => {
    const dura = (t: "llamadaTripulacion" | "llamadaEmergencia") => {
      const m = MOTIVOS[t];
      return (m.notas.length - 1) * m.paso + m.dura;
    };
    expect(esperaTrasLaLlamada("llamadaTripulacion")).toBeGreaterThan(dura("llamadaTripulacion"));
    expect(esperaTrasLaLlamada("llamadaEmergencia")).toBeGreaterThan(dura("llamadaEmergencia"));
  });
});

describe("el pasajero que llama, alguna vez en el servicio", () => {
  const momento = (m: Partial<MomentoDelPasaje> = {}): MomentoDelPasaje => ({
    fase: "en-vuelo",
    pasajeSuelto: true,
    servicioDicho: true,
    bajando: false,
    dt: 1,
    ...m,
  });

  /** Cuándo llama, en segundos desde el servicio, o `null` si no llama. */
  function cuandoLlama(azar: () => number, m: Partial<MomentoDelPasaje> = {}): number | null {
    const l = new LlamadasDelPasaje(azar);
    for (let t = 1; t <= LLAMA_HASTA + 20; t++) if (l.paso(momento(m))) return t;
    return null;
  }

  it("llama dentro del servicio, una vez, y la luz se queda hasta que llegan", () => {
    const l = new LlamadasDelPasaje(() => 0.2);
    let llamadas = 0;
    let cuando = 0;
    for (let t = 1; t <= LLAMA_HASTA + 5; t++)
      if (l.paso(momento())) {
        llamadas++;
        cuando = t;
      }
    expect(llamadas).toBe(1);
    expect(cuando).toBeGreaterThanOrEqual(LLAMA_DESDE);
    expect(cuando).toBeLessThanOrEqual(LLAMA_HASTA);
    const l2 = new LlamadasDelPasaje(() => 0.2);
    let t = 0;
    while (!l2.paso(momento())) t++;
    expect(l2.luzEncendida).toBe(true);
    for (let i = 0; i < HASTA_QUE_LLEGAN; i++) l2.paso(momento());
    expect(l2.luzEncendida).toBe(false);
  });

  it("y no todos los vuelos", () => {
    expect(cuandoLlama(() => 0.9)).toBeNull();
  });

  it("sin servicio, con el cartel puesto o bajando, nadie llama", () => {
    expect(cuandoLlama(() => 0.2, { servicioDicho: false })).toBeNull();
    expect(cuandoLlama(() => 0.2, { pasajeSuelto: false })).toBeNull();
    expect(cuandoLlama(() => 0.2, { bajando: true })).toBeNull();
  });
});

describe("la voz de la tripulación desde cada vista", () => {
  it("en el pasaje, a tope y sin cortar nada", () => {
    expect(comoSeOyeLaTripulacion("pasaje")).toEqual({ fuerza: 1, corte: SIN_CORTE });
  });

  it("en la cabina de mando, por la puerta: más floja y sin agudos", () => {
    const c = comoSeOyeLaTripulacion("cabina");
    expect(c.fuerza).toBeLessThan(1);
    expect(c.fuerza).toBeGreaterThan(0);
    // Sin agudos, pero se entiende: la voz cabe en lo que deja pasar.
    expect(c.corte).toBeLessThan(4000);
    expect(c.corte).toBeGreaterThanOrEqual(1500);
  });

  it("y desde fuera, como hasta ahora: acompaña a la tira", () => {
    expect(comoSeOyeLaTripulacion("fuera")).toEqual({ fuerza: 1, corte: SIN_CORTE });
  });
});
