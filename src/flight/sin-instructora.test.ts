/**
 * Volar sin instructora: qué calla, qué no, y quién puede elegirlo.
 *
 * Lo que se comprueba es la lista, porque la lista **es** la decisión: lo que
 * está en ella sigue sonando y lo que no, se calla. Si una frase de seguridad
 * se queda fuera, aquí se ve antes de que nadie la eche en falta en una final.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ES_PY } from "../i18n/es-PY";
import { CLAVE_DE_CABINA } from "../audio/cabina";
import { CUADERNO_VACIO, grado, type Cuaderno } from "./cuaderno";
import {
  CANTOS_QUE_SIGUEN,
  GRADO_PARA_VOLAR_SIN_INSTRUCTORA,
  SEGURIDAD,
  claveBase,
  guardarSinInstructora,
  leerSinInstructora,
  loQueFaltaParaVolarSinInstructora,
  puedeVolarSinInstructora,
  suenaSinInstructora,
} from "./sin-instructora";
import { olvidar } from "../datos/guardado";

describe("lo que sigue sonando sin instructora", () => {
  /*
   * Las cinco familias del encargo, una frase de cada una por lo menos: el
   * terreno, la pérdida, el tráfico, una orden de la torre que no se está
   * cumpliendo y la frustrada que hace falta. Y las emergencias, que son lo
   * mismo en grande.
   */
  const DE_SEGURIDAD = [
    // El terreno.
    "vuelo.terrenoSube",
    "vuelo.terrenoBajo",
    "vuelo.bulto",
    // La pérdida, y el camino a ella.
    "vuelo.perdida",
    "vuelo.lentoYBajo",
    "vuelo.bajasRapido",
    "vuelo.muyInclinado",
    // El tráfico, en el aire y en la pista.
    "vuelo.trafico.delante",
    "vuelo.trafico.izquierda",
    "vuelo.otroAvion.derecha.nivel",
    "vuelo.esperaQueAterrice",
    "vuelo.abandonando",
    // La torre que manda y no se cumple.
    "vuelo.mandanFrustrar",
    "vuelo.sinPermisoEnLosMinimos",
    "vuelo.aterrizasteContraLaOrden",
    "vuelo.sinPermiso",
    // La frustrada que hace falta, y su aplauso.
    "vuelo.minimos",
    "vuelo.noEstabilizada",
    "vuelo.proponeIrse",
    "vuelo.tomaLarga",
    "vuelo.alAireVientoDeCola",
    "vuelo.sacaElTren",
    "vuelo.frustrada",
    // Las emergencias.
    "vuelo.sinMotor",
    "vuelo.cabinaSinPresion",
    "vuelo.primeroLaTuya.segundos",
    "vuelo.tormenta",
  ];

  it.each(DE_SEGURIDAD)("%s suena", (clave) => {
    expect(suenaSinInstructora(clave)).toBe(true);
  });

  it("y sus variantes también: la misma frase, grabada de otra manera", () => {
    expect(suenaSinInstructora("vuelo.noEstabilizada~2+cayendo")).toBe(true);
    expect(suenaSinInstructora("vuelo.mandanFrustrar~3")).toBe(true);
    expect(claveBase("vuelo.noEstabilizada~3+torcido")).toBe("vuelo.noEstabilizada");
  });

  it("y los cantos de cabina que pasan por su boca: V1, rotate, el tren", () => {
    for (const c of ["cabina.v1", "cabina.vr", "cabina.gearUp", "cabina.goAroundOrder"])
      expect(suenaSinInstructora(c), c).toBe(true);
  });
});

describe("lo que se calla", () => {
  /*
   * El «bajá el motor» que empezó todo, en sus dos peldaños, y una muestra de
   * cada clase de consejo: la senda, el paso siguiente, el rodaje, los
   * elogios, las curiosidades, las celebraciones y las presentaciones.
   */
  const CONSEJOS = [
    "tutor.slow",
    "vuelo.sobrevelocidad",
    "cabina.tooFast",
    "cabina.slowDown",
    "cabina.tooHighComeDown",
    "vuelo.consejo.menosGas",
    "vuelo.consejo.narizAbajoSenda",
    "vuelo.paso.flaps1",
    "vuelo.paso.crucero",
    "vuelo.aroAlto~2",
    "vuelo.corregido",
    "vuelo.papiBien",
    "vuelo.rodando",
    "vuelo.estacionado",
    "vuelo.despacio",
    "vuelo.aire.crucero",
    "vuelo.baches",
    "ventanilla.vos.teide",
    "galon.toma",
    "grado.comandante",
    "fin.redondo",
    "mission.step",
    "circuito.base",
    "vuelo.rotar",
    "explica.arco.presenta",
  ];

  it.each(CONSEJOS)("%s se calla", (clave) => {
    expect(suenaSinInstructora(clave)).toBe(false);
  });

  it("y lo que va sin clave, también: no está en ninguna lista", () => {
    expect(suenaSinInstructora(undefined)).toBe(false);
    expect(suenaSinInstructora("")).toBe(false);
  });
});

describe("la lista no se queda vieja", () => {
  it("cada clave de seguridad existe en el diccionario", () => {
    const sueltas = [...SEGURIDAD].filter((k) => !(k in ES_PY));
    expect(sueltas).toEqual([]);
  });

  it("y cada canto que sigue es un canto de la tabla de cabina", () => {
    const deCabina = new Set(Object.values(CLAVE_DE_CABINA));
    const sueltos = [...CANTOS_QUE_SIGUEN].filter((k) => !deCabina.has(k));
    expect(sueltos).toEqual([]);
  });

  it("y la cuenta del radioaltímetro no está: no pasa nunca por la instructora", () => {
    for (const k of ["cabina.oneHundred", "cabina.fifty", "cabina.ten"])
      expect(CANTOS_QUE_SIGUEN.has(k), k).toBe(false);
  });
});

/** Un cuaderno con esas cuentas y esos sitios. */
const conCuentas = (
  aterrizajes: number,
  aerodromos: number,
  frustradas: number,
): Cuaderno => ({
  ...CUADERNO_VACIO,
  aterrizajes,
  frustradas,
  aerodromos: Array.from({ length: aerodromos }, (_, i) => `X${i}`),
});

describe("el candado", () => {
  it("lo abre el grado de comandante, que responde por todos a bordo", () => {
    expect(GRADO_PARA_VOLAR_SIN_INSTRUCTORA).toBe("comandante");
  });

  it("aprendiz y piloto no lo abren", () => {
    expect(grado(conCuentas(0, 0, 0))).toBe("aprendiz");
    expect(puedeVolarSinInstructora(conCuentas(0, 0, 0))).toBe(false);
    expect(grado(conCuentas(5, 1, 0))).toBe("piloto");
    expect(puedeVolarSinInstructora(conCuentas(5, 1, 0))).toBe(false);
  });

  it("comandante e instructora, sí", () => {
    expect(puedeVolarSinInstructora(conCuentas(10, 2, 1))).toBe(true);
    expect(puedeVolarSinInstructora(conCuentas(25, 3, 3))).toBe(true);
  });

  it("sin la frustrada no se llega, por muchos aterrizajes que haya", () => {
    expect(puedeVolarSinInstructora(conCuentas(40, 5, 0))).toBe(false);
    expect(loQueFaltaParaVolarSinInstructora(conCuentas(40, 5, 0))).toEqual({
      aterrizajes: 0,
      aerodromos: 0,
      frustradas: 1,
    });
  });

  it("lo que falta se cuenta en cosas, desde aprendiz y no desde el grado siguiente", () => {
    expect(loQueFaltaParaVolarSinInstructora(conCuentas(3, 1, 0))).toEqual({
      aterrizajes: 7,
      aerodromos: 1,
      frustradas: 1,
    });
    expect(loQueFaltaParaVolarSinInstructora(conCuentas(10, 2, 1))).toBeNull();
  });
});

describe("el ajuste, en el aparato", () => {
  /** Un almacén de mentira, como en `gafas.test.ts`: nada sale del aparato. */
  const memoria = new Map<string, string>();
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => void memoria.set(k, String(v)),
      removeItem: (k: string) => void memoria.delete(k),
      clear: () => memoria.clear(),
      key: (i: number) => [...memoria.keys()][i] ?? null,
      get length() {
        return memoria.size;
      },
    });
    memoria.clear();
    olvidar();
  });

  it("se guarda y se lee en el perfil", () => {
    const comandante = conCuentas(10, 2, 1);
    expect(leerSinInstructora(comandante)).toBe(false);
    guardarSinInstructora(true);
    expect(leerSinInstructora(comandante)).toBe(true);
    guardarSinInstructora(false);
    expect(leerSinInstructora(comandante)).toBe(false);
  });

  it("y guardado sin el grado no vale: no se queda nadie sin instructora antes de tiempo", () => {
    guardarSinInstructora(true);
    expect(leerSinInstructora(conCuentas(3, 1, 0))).toBe(false);
  });
});
