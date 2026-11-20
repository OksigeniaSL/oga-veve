/**
 * **La radio de tierra se escribe aunque la frecuencia corra** (H48).
 *
 * Por la 30 de Los Rodeos, con el JAZ 90 en el peldaño de cabina, la tira de
 * la radio no enseñó nunca la autorización de la ruta, el «pushback and
 * start-up approved» ni el «Cabina, tierra: empezamos a empujar». El banco del
 * remolque, con la tira entera y su hora: la bienvenida de la comandante
 * esperando sitio del segundo 44 al 111, las tres tuyas pedidas detrás de ella
 * mientras tanto, y después tres del tráfico de la 30, que las echaron de la
 * cola. Se escribieron «viento en cola», «rodando» y «hold short», de otros.
 *
 * Aquí se monta esa cola con las mismas frases, en el mismo orden.
 */
import { describe, expect, it } from "vitest";
import {
  cedeElTurno,
  EN_COLA_COMO_MUCHO,
  encolarEnLaTira,
  ESPERANDO_SITIO_COMO_MUCHO_MS,
  type FraseDeLaTira,
} from "./cola-de-la-radio";

const tuya = (texto: string): FraseDeLaTira => ({ texto, segundos: 6, paraTi: true });
const deOtro = (texto: string): FraseDeLaTira => ({ texto, segundos: 6, paraTi: false });
const deNadie = (texto: string): FraseDeLaTira => ({ texto, segundos: 6, paraTi: null });

describe("la cola de la tira de la radio", () => {
  it("con la frecuencia corriendo detrás, la radio de tierra sigue en la cola", () => {
    const cola: FraseDeLaTira[] = [];
    // Pedido el tractor, con la bienvenida de la comandante a la vista.
    encolarEnLaTira(cola, tuya("cleared to Tenerife Sur"));
    encolarEnLaTira(cola, tuya("pushback and start-up approved"));
    // Al echar a andar el tractor, la persona de tierra, por el interfono.
    encolarEnLaTira(cola, deNadie("Cabina, tierra: empezamos a empujar."));
    // Y el tráfico de la 30.
    encolarEnLaTira(cola, deOtro("Echo Charlie Yankee Delta India, viento en cola"));
    encolarEnLaTira(cola, deOtro("Echo Charlie Juliett Delta November, rodando a la cabecera"));
    encolarEnLaTira(cola, deOtro("Echo Charlie Juliett Delta November, hold short of the runway"));
    expect(cola.map((f) => f.texto)).toEqual([
      "cleared to Tenerife Sur",
      "pushback and start-up approved",
      "Cabina, tierra: empezamos a empujar.",
    ]);
  });

  it("lo de los demás se va de lo más viejo a lo más nuevo, y lo tuyo no se reordena", () => {
    const cola: FraseDeLaTira[] = [];
    encolarEnLaTira(cola, deOtro("a"));
    encolarEnLaTira(cola, tuya("b"));
    encolarEnLaTira(cola, deOtro("c"));
    encolarEnLaTira(cola, tuya("d"));
    expect(cola.map((f) => f.texto)).toEqual(["b", "c", "d"]);
  });

  it("sin nada de los demás, se va lo más viejo, y nunca caben más de las que caben", () => {
    const cola: FraseDeLaTira[] = [];
    for (const x of ["a", "b", "c", "d", "e"]) encolarEnLaTira(cola, tuya(x));
    expect(cola.map((f) => f.texto)).toEqual(["c", "d", "e"]);
    expect(cola.length).toBe(EN_COLA_COMO_MUCHO);
  });

  it("la que espera sitio guarda su turno un rato, y con otras detrás lo suelta", () => {
    // Sola, lo guarda lo que haga falta: no tiene a quién quitárselo.
    expect(cedeElTurno(10 * ESPERANDO_SITIO_COMO_MUCHO_MS, 0)).toBe(false);
    // Con otras detrás, un rato sí.
    expect(cedeElTurno(ESPERANDO_SITIO_COMO_MUCHO_MS - 250, 3)).toBe(false);
    // Y no los sesenta y siete segundos de la bienvenida.
    expect(cedeElTurno(ESPERANDO_SITIO_COMO_MUCHO_MS, 3)).toBe(true);
    expect(cedeElTurno(67_000, 1)).toBe(true);
  });
});
