/**
 * Las cifras del plan del largo radio, fijadas.
 *
 * El plan (24-10-2026) se calculó con un guion que se perdió con su sesión;
 * estas pruebas son ahora la cuenta. Donde la cuenta no da lo que el plan
 * decía, se dice aquí con números y la prueba fija lo que sale, no lo que se
 * esperaba.
 */
import { describe, expect, it } from "vitest";
import DESTACADOS from "../../data/hitos/destacados.json";
import { anoDecimal, declinacion } from "../ui/carta/declinacion";
import { ALTITUD_DEL_TOPE } from "./escalera-de-velocidades";
import { PIE } from "./ruta";
import {
  cruceDelEcuador,
  cuandoAsomaElSol,
  cuandoPasa,
  DE_MADRID_A_ASUNCION,
  dondeVa,
  horaLocal,
  horarioDelDia,
  horasEn,
  HUSO_DE_ASUNCION,
  husoDeCanarias,
  husoDeMadrid,
  NIVELES_DE_CRUCERO,
  perfilDelVuelo,
  PETTIROSSI,
  puntoEn,
  puntosDelCamino,
  respectoALaRuta,
  rumboEn,
  SITIOS_DEL_CAMINO,
  solEn,
  solEnElVuelo,
} from "./ruta-larga";

const GRADO = Math.PI / 180;
const HORA = 3600;
const RUTA = DE_MADRID_A_ASUNCION;

/** La hora de un reloj como la escribiría una persona: «06:18». */
function reloj(t: Date, huso: number): string {
  const m = Math.round(horaLocal(t, huso) / 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** El vuelo del día `dia`, a las doce en UTC como `fechaDelVuelo`. */
function vueloDel(dia: string) {
  return perfilDelVuelo(horarioDelDia(new Date(`${dia}T12:00:00Z`)));
}

describe("la ortodrómica de Barajas a Pettirossi", () => {
  it("mide 9.189 km, sale a 227,5° y llega a 218,3°", () => {
    expect(RUTA.distancia / 1000).toBeCloseTo(9189, 0);
    expect(rumboEn(RUTA, 0) / GRADO).toBeCloseTo(227.5, 1);
    expect(rumboEn(RUTA, RUTA.distancia) / GRADO).toBeCloseTo(218.3, 1);
  });

  it("empieza y acaba en los dos aeropuertos, y sus puntos están sobre ella", () => {
    const a = puntoEn(RUTA, 0);
    const b = puntoEn(RUTA, RUTA.distancia);
    expect(a.lat).toBeCloseTo(RUTA.desde.lat, 9);
    expect(a.lon).toBeCloseTo(RUTA.desde.lon, 9);
    expect(b.lat).toBeCloseTo(PETTIROSSI.lat, 9);
    expect(b.lon).toBeCloseTo(PETTIROSSI.lon, 9);
    const puntos = puntosDelCamino(RUTA);
    expect(puntos.length).toBeGreaterThan(90);
    for (const p of puntos) {
      const r = respectoALaRuta(RUTA, p.sitio);
      expect(Math.abs(r.lado)).toBeLessThan(0.01);
      expect(r.recorrido).toBeCloseTo(p.recorrido, 1);
    }
  });

  /*
   * **El plan decía 2,4 km, y son 2,2.** Valverde, por su nodo de
   * OpenStreetMap, queda a 2.169 m a la izquierda. Que el plan usaba el
   * mismo Barajas lo dicen sus otras cifras: con el punto del AIP salen sus
   * 9.189 km y su ecuador en el km 5.742, y con el de OurAirports, dos
   * kilómetros y medio más al norte, saldrían 9.190 y el km 5.743, y
   * Valverde a 4,4 km. Para 2,4 haría falta poner Valverde unos 230 m más al
   * sureste de su nodo. El repaso de las fuentes del 26-10 ya lo había
   * contado: «Valverde queda a 2,2 km a la izquierda».
   */
  it("pasa por encima de El Hierro: Valverde a 2,2 km a la izquierda", () => {
    const valverde = respectoALaRuta(RUTA, SITIOS_DEL_CAMINO.valverde);
    expect(valverde.lado).toBeLessThan(0);
    expect(-valverde.lado / 1000).toBeCloseTo(2.17, 1);
    expect(valverde.recorrido / 1000).toBeCloseTo(1926, 0);
  });

  it("cruza el ecuador en el km 5.742, a 38,9° oeste", () => {
    const e = cruceDelEcuador(RUTA)!;
    expect(e).not.toBeNull();
    expect(e.recorrido / 1000).toBeCloseTo(5742, 0);
    expect(e.sitio.lat).toBeCloseTo(0, 9);
    expect(e.sitio.lon).toBeCloseTo(-38.9, 1);
  });

  it("entra en el Paraguay con Pedro Juan Caballero a 41 km a la derecha, y Cerro Corá a 57", () => {
    const pjc = respectoALaRuta(RUTA, SITIOS_DEL_CAMINO.pedroJuanCaballero);
    expect(pjc.lado / 1000).toBeCloseTo(41, 0);
    const cc = DESTACADOS.destacados.find((d) => d.clave === "cerro-cora")!.puntos[0]!;
    const cerroCora = respectoALaRuta(RUTA, { lat: cc[0]!, lon: cc[1]! });
    expect(cerroCora.lado / 1000).toBeCloseTo(57, 0);
  });
});

describe("el horario", () => {
  it("toca a las 06:18 con el horario de verano europeo y a las 07:23 con el de invierno", () => {
    const verano = horarioDelDia(new Date("2026-10-24T12:00:00Z"));
    expect(verano.temporada).toBe("verano");
    expect(reloj(verano.salida, husoDeMadrid(verano.salida))).toBe("23:45");
    expect(reloj(verano.toma, HUSO_DE_ASUNCION)).toBe("06:18");
    expect(reloj(verano.llegada, HUSO_DE_ASUNCION)).toBe("06:25");

    const invierno = horarioDelDia(new Date("2026-10-25T12:00:00Z"));
    expect(invierno.temporada).toBe("invierno");
    expect(reloj(invierno.salida, husoDeMadrid(invierno.salida))).toBe("23:45");
    expect(reloj(invierno.toma, HUSO_DE_ASUNCION)).toBe("07:23");
    expect(reloj(invierno.llegada, HUSO_DE_ASUNCION)).toBe("07:30");
  });

  it("cambia la noche en que cambian los relojes de España, y no los del Paraguay", () => {
    const toma = (dia: string): string =>
      reloj(horarioDelDia(new Date(`${dia}T12:00:00Z`)).toma, HUSO_DE_ASUNCION);
    // Marzo de 2027: el último domingo es el 28.
    expect(toma("2027-03-27")).toBe("07:23");
    expect(toma("2027-03-28")).toBe("06:18");
    // Octubre de 2027: el último domingo es el 31.
    expect(toma("2027-10-30")).toBe("06:18");
    expect(toma("2027-10-31")).toBe("07:23");
    // En el Paraguay no cambia nada en octubre ni en marzo: siempre UTC−3.
    expect(toma("2027-10-02")).toBe("06:18");
    expect(toma("2027-03-21")).toBe("07:23");
  });

  it("de Madrid a Asunción van cinco horas en verano y cuatro en invierno", () => {
    for (const [dia, horas] of [["2027-07-01", 5], ["2027-01-15", 4]] as const) {
      const p = vueloDel(dia);
      for (const t of [0, 3 * HORA, p.enElAire]) {
        const h = horasEn(p, t);
        const diferencia = (h.madrid - h.asuncion + 86_400) % 86_400;
        expect(diferencia).toBe(horas * HORA);
      }
    }
  });

  /*
   * Los husos se cuentan a mano —ver `HUSO_DE_ASUNCION`—, y aquí se cotejan
   * con la base de husos de la IANA que trae Node: todos los días de 2025 a
   * 2030, a la hora de salir y a la de llegar.
   */
  it("coinciden con la base de husos de la IANA de 2025 a 2030", () => {
    const formatos = new Map<string, Intl.DateTimeFormat>();
    const desfase = (zona: string, t: Date): number => {
      let f = formatos.get(zona);
      if (!f) formatos.set(zona, (f = new Intl.DateTimeFormat("en-GB", { timeZone: zona, timeZoneName: "longOffset" })));
      const nombre = f
        .formatToParts(t)
        .find((p) => p.type === "timeZoneName")!.value;
      const m = /GMT([+-])(\d{2}):(\d{2})/.exec(nombre);
      return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * HORA + Number(m[3]) * 60) : 0;
    };
    for (let d = Date.UTC(2025, 0, 1); d < Date.UTC(2031, 0, 1); d += 86_400_000) {
      for (const hora of [1, 9, 21, 23]) {
        const t = new Date(d + hora * HORA * 1000);
        expect(husoDeMadrid(t)).toBe(desfase("Europe/Madrid", t));
        expect(husoDeCanarias(t)).toBe(desfase("Atlantic/Canary", t));
        expect(HUSO_DE_ASUNCION).toBe(desfase("America/Asuncion", t));
      }
    }
  });
});

describe("el perfil", () => {
  const verano = vueloDel("2027-07-01");
  const invierno = vueloDel("2027-01-15");

  it("recorre la ortodrómica entera en el tiempo del horario, sin saltos", () => {
    for (const p of [verano, invierno]) {
      expect(dondeVa(p, 0).recorrido).toBe(0);
      expect(dondeVa(p, p.enElAire - 1e-6).recorrido).toBeCloseTo(RUTA.distancia, -1);
      let antes = dondeVa(p, 0);
      for (let t = 10; t < p.enElAire; t += 10) {
        const ahora = dondeVa(p, t);
        expect(ahora.recorrido).toBeGreaterThan(antes.recorrido);
        // Ni acelera a más de un tercio de metro por segundo cada segundo, ni
        // sube o baja a más de dos mil pies por minuto: sin saltos.
        expect(Math.abs(ahora.velocidad - antes.velocidad)).toBeLessThan(3);
        expect(Math.abs(ahora.altitud - antes.altitud) / 10 / PIE * 60).toBeLessThan(2000);
        antes = ahora;
      }
    }
  });

  /*
   * El plan daba «unos 843 km/h». Con la subida y la bajada por tramos salen
   * 839 en verano y 832 en invierno, cinco minutos más de vuelo en lo mismo.
   */
  it("cruza a la velocidad que sale del horario: unos 839 km/h en verano y 832 en invierno", () => {
    expect(verano.crucero * 3.6).toBeCloseTo(839, 0);
    expect(invierno.crucero * 3.6).toBeCloseTo(832, 0);
  });

  it("sube en 25 minutos, cruza por escalones y baja en 30, pasando los diez mil pies a 12 de la toma", () => {
    const p = verano;
    expect(dondeVa(p, 25 * 60).altitud / PIE).toBeCloseTo(36_000, 0);
    expect(dondeVa(p, 3 * HORA).altitud / PIE).toBeCloseTo(36_000, 0);
    expect(dondeVa(p, 5 * HORA).altitud / PIE).toBeCloseTo(38_000, 0);
    expect(dondeVa(p, 9 * HORA).altitud / PIE).toBeCloseTo(40_000, 0);
    expect(dondeVa(p, p.enElAire - 30 * 60 - 1).fase).toBe("crucero");
    expect(dondeVa(p, p.enElAire - 30 * 60 + 1).fase).toBe("bajada");
    expect(dondeVa(p, p.enElAire - 12 * 60).altitud).toBeCloseTo(ALTITUD_DEL_TOPE, 3);
    expect(dondeVa(p, p.enElAire - 1e-6).altitud).toBeCloseTo(PETTIROSSI.elevacion, 0);
    expect(dondeVa(p, -60).fase).toBe("rodaje de salida");
    expect(dondeVa(p, p.enElAire + 60).fase).toBe("rodaje de llegada");
    expect(dondeVa(p, p.enElAire + 8 * 60).fase).toBe("en el puesto");
  });

  /*
   * La regla semicircular: hacia el oeste, niveles pares. La derrota
   * magnética, con el Modelo Magnético Mundial del juego, va de 223° a 238°
   * por todo el camino: siempre hacia el oeste.
   */
  it("vuela en niveles pares porque va hacia el oeste todo el camino", () => {
    for (const n of NIVELES_DE_CRUCERO) expect(Math.round(n / PIE / 1000) % 2).toBe(0);
    const ano = anoDecimal(new Date("2027-01-15T12:00:00Z"));
    for (const p of puntosDelCamino(RUTA, 50_000)) {
      const magnetica = (p.rumbo / GRADO - declinacion(p.sitio.lat, p.sitio.lon, ano, 12) + 360) % 360;
      expect(magnetica).toBeGreaterThanOrEqual(180);
      expect(magnetica).toBeLessThan(360);
    }
  });

  /*
   * Lo que pregunta el salto bajo tapa: con el reloj siete horas más
   * adelante, el avión tiene que estar sobre la ortodrómica, en el punto que
   * da la cuenta, con su altitud y su rumbo.
   */
  it("tras un salto de siete horas, el avión está sobre la ruta donde da la cuenta", () => {
    const p = verano;
    const d = dondeVa(p, 7 * HORA + 30 * 60);
    expect(d.fase).toBe("crucero");
    expect(Math.abs(respectoALaRuta(RUTA, d.sitio).lado)).toBeLessThan(0.01);
    const crucero = p.tramos[2]!;
    expect(d.recorrido).toBeCloseTo(crucero.recorrido + (7.5 * HORA - crucero.desde) * p.crucero, 3);
    expect(d.rumbo).toBeCloseTo(rumboEn(RUTA, d.recorrido), 9);
    expect(d.altitud / PIE).toBeCloseTo(40_000, 0);
    expect(d.instante.getTime()).toBe(p.horario.despegue.getTime() + 7.5 * HORA * 1000);
  });

  it("dice cuándo pasa por cada sitio, y es la inversa de dónde va", () => {
    for (const t of [600, 2 * HORA, 6 * HORA, 11 * HORA]) {
      expect(cuandoPasa(verano, dondeVa(verano, t).recorrido)).toBeCloseTo(t, 0);
    }
  });

  /*
   * **Las horas de paso salen de dos a cuatro minutos más tarde que en la
   * tabla del plan** —El Hierro a las 2:24 del despegue y no a las 2:20, el
   * ecuador a las 6:57 y no a las 6:55, Pedro Juan Caballero a las 10:39 y
   * no a las 10:35—, porque aquí la subida y la bajada van por tramos con su
   * velocidad y recorren menos que en el guion del plan. La toma, que es la
   * del horario, cae igual.
   */
  it("pasa por El Hierro, el ecuador y Pedro Juan Caballero a la hora del plan, con pocos minutos de diferencia", () => {
    const p = verano;
    const minutos = (sitio: { lat: number; lon: number }): number =>
      cuandoPasa(p, respectoALaRuta(RUTA, sitio).recorrido) / 60;
    const ecuador = cuandoPasa(p, cruceDelEcuador(RUTA)!.recorrido) / 60;
    expect(Math.abs(minutos(SITIOS_DEL_CAMINO.valverde) - (2 * 60 + 24))).toBeLessThan(1);
    expect(Math.abs(ecuador - (6 * 60 + 57))).toBeLessThan(1);
    expect(Math.abs(minutos(SITIOS_DEL_CAMINO.pedroJuanCaballero) - (10 * 60 + 39))).toBeLessThan(1);
    // Y El Hierro, en hora de Canarias, pasada la una de la madrugada.
    const sobreElHierro = dondeVa(p, cuandoPasa(p, respectoALaRuta(RUTA, SITIOS_DEL_CAMINO.valverde).recorrido));
    expect(reloj(sobreElHierro.instante, husoDeCanarias(sobreElHierro.instante))).toMatch(/^01:2\d$/);
  });
});

describe("de día o de noche", () => {
  /*
   * La tabla 1.4 del plan, el día 15 de cada mes de 2027: el sol en la toma
   * y si asoma por la ventanilla antes de tocar.
   */
  const tabla: readonly [mes: number, sol: readonly [number, number], asoma: boolean][] = [
    [1, [13, 15], true],
    [2, [8.5, 10], true],
    [3, [5.5, 7], true],
    [4, [-12, -11], false],
    [5, [-15, -13.5], false],
    [6, [-17.5, -16], false],
    [7, [-18, -16.5], false],
    [8, [-14.5, -13], false],
    [9, [-8, -6.5], false],
    [10, [-1, 0.5], true],
    [11, [17.5, 19], true],
    [12, [17, 18.5], true],
  ];

  it.each(tabla)("el 15 del mes %i, el sol de la toma y el amanecer", (mes, [desde, hasta], asoma) => {
    const p = perfilDelVuelo(horarioDelDia(new Date(Date.UTC(2027, mes - 1, 15, 12))));
    const sol = solEn(p.horario.toma, PETTIROSSI, PETTIROSSI.elevacion).altura / GRADO;
    expect(sol).toBeGreaterThanOrEqual(desde);
    expect(sol).toBeLessThanOrEqual(hasta);
    expect(cuandoAsomaElSol(p) !== null).toBe(asoma);
  });

  it("en diciembre el sol asoma en crucero hacia las 9 h 25 de vuelo, sobre las 05:30 de Asunción", () => {
    const p = vueloDel("2027-12-15");
    const t = cuandoAsomaElSol(p)!;
    expect(t / HORA).toBeCloseTo(9.4, 1);
    expect(dondeVa(p, t).fase).toBe("crucero");
    expect(reloj(dondeVa(p, t).instante, HUSO_DE_ASUNCION)).toMatch(/^05:[23]\d$/);
  });

  it("de noche cerrada sobre el mar, y desde arriba el sol se ve antes que desde el suelo", () => {
    const p = vueloDel("2027-12-15");
    expect(solEnElVuelo(p, 3 * HORA).deNoche).toBe(true);
    const t = cuandoAsomaElSol(p)!;
    const d = dondeVa(p, t);
    expect(solEn(d.instante, d.sitio, d.altitud).asoma).toBe(true);
    expect(solEn(d.instante, d.sitio, 0).asoma).toBe(false);
  });
});
