/**
 * El guion de las fases, fase por fase.
 *
 * La tabla es un `Record<Fase, …>` a propósito: una fase nueva en `Vuelo` no
 * compila aquí hasta que alguien diga qué tarjeta lleva, cuánto se queda y qué
 * tecla pide. Así se perdió `back-taxi` en tres de las listas a mano que había
 * en `game.ts`.
 */

import { describe, expect, it } from "vitest";
import { tarjetaDeLaFase, type DondeSeAnuncia, type TarjetaDeLaFase } from "./guion-de-fases";
import { GUION, guionAfis, guionSinTorre, type Fase } from "./vuelo";

const CON_TORRE: DondeSeAnuncia = {
  contesta: "torre",
  conBici: false,
  enCasa: false,
  aterrizando: false,
  haciaOtroCampo: false,
  remontaUnTrecho: false,
};

type SinPintar = Omit<TarjetaDeLaFase, "clave" | "icono">;

const I = Infinity;
const QUEDA: SinPintar = { segundos: I, tecla: null, teclaDelRotulo: null, tocarEsLaLlave: false, conLetra: false };
const LLAVE: SinPintar = { segundos: I, tecla: "engine", teclaDelRotulo: "engine", tocarEsLaLlave: true, conLetra: false };
const DE_PASO: SinPintar = { ...QUEDA, segundos: 6 };
const POR_LA_CALLE: SinPintar = { ...QUEDA, conLetra: true };

const TABLA: Record<Fase, SinPintar> = {
  estacionado: LLAVE,
  arrancando: DE_PASO,
  rodando: POR_LA_CALLE,
  esperando: { ...QUEDA, tecla: "brakes", teclaDelRotulo: "brakes" },
  autorizado: QUEDA,
  "back-taxi": QUEDA,
  alineando: QUEDA,
  despegando: QUEDA,
  comprometido: QUEDA,
  "en-vuelo": DE_PASO,
  final: DE_PASO,
  // El freno va en el rótulo y no en la tarjeta: «frená · B».
  aterrizado: { ...QUEDA, teclaDelRotulo: "brakes" },
  abandonando: POR_LA_CALLE,
  "a-plataforma": POR_LA_CALLE,
  "en-puesto": LLAVE,
  apagado: { ...DE_PASO, segundos: 9 },
};

const FASES = Object.keys(TABLA) as Fase[];

describe("tarjetaDeLaFase", () => {
  it("cubre las dieciséis fases del guion, ni una más ni una menos", () => {
    expect(new Set(FASES)).toEqual(new Set(Object.keys(GUION)));
    expect(FASES).toHaveLength(16);
  });

  it.each(FASES)("%s: cuánto se queda, qué tecla pide y si lleva la letra", (fase) => {
    const { clave, icono, ...resto } = tarjetaDeLaFase(fase, CON_TORRE);
    expect(resto).toEqual(TABLA[fase]);
    expect({ clave, icono }).toEqual(GUION[fase]);
  });

  it("donde contesta un AFIS, su guion; donde no contesta nadie, el de sin torre", () => {
    for (const fase of FASES) {
      const afis = tarjetaDeLaFase(fase, { ...CON_TORRE, contesta: "afis" });
      expect({ clave: afis.clave, icono: afis.icono }).toEqual(guionAfis(fase));
      for (const conBici of [false, true])
        for (const enCasa of [false, true]) {
          const nadie = tarjetaDeLaFase(fase, { ...CON_TORRE, contesta: "nadie", conBici, enCasa });
          expect({ clave: nadie.clave, icono: nadie.icono }).toEqual(guionSinTorre(fase, conBici, enCasa));
        }
    }
  });

  it("el guion del campo cambia lo que se dice, no cuánto dura ni qué tecla pide", () => {
    for (const fase of FASES)
      for (const contesta of ["afis", "nadie"] as const) {
        const { clave: _c, icono: _i, ...resto } = tarjetaDeLaFase(fase, { ...CON_TORRE, contesta });
        expect(resto).toEqual(TABLA[fase]);
      }
  });

  it("en la lección de aterrizar, volando no se manda a dar una vuelta", () => {
    expect(tarjetaDeLaFase("en-vuelo", { ...CON_TORRE, aterrizando: true }).clave).toBe(
      "vuelo.enVueloAterrizando",
    );
    // Y manda sobre ir a otro campo: se aterriza en el de la lección.
    expect(
      tarjetaDeLaFase("en-vuelo", { ...CON_TORRE, aterrizando: true, haciaOtroCampo: true }).clave,
    ).toBe("vuelo.enVueloAterrizando");
    // Solo en vuelo: la final de la lección es la de siempre.
    expect(tarjetaDeLaFase("final", { ...CON_TORRE, aterrizando: true }).clave).toBe(GUION.final.clave);
  });

  it("yendo a otro aeropuerto, volando se sigue la flecha", () => {
    expect(tarjetaDeLaFase("en-vuelo", { ...CON_TORRE, haciaOtroCampo: true }).clave).toBe(
      "vuelo.enVueloDestino",
    );
  });

  it("remontando un trecho, el back-taxi no dice «hasta el fondo»", () => {
    const trecho = tarjetaDeLaFase("back-taxi", { ...CON_TORRE, remontaUnTrecho: true });
    expect(trecho.clave).toBe("vuelo.backTaxiUnTrecho");
    expect(trecho.icono).toBe(GUION["back-taxi"].icono);
    expect(tarjetaDeLaFase("rodando", { ...CON_TORRE, remontaUnTrecho: true }).clave).toBe(
      GUION.rodando.clave,
    );
  });
});
