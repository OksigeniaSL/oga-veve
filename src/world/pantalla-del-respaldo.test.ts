/**
 * Lo que pinta la pantalla del asiento tiene que ser verdad comprobable sin
 * navegador: dónde está el sol, qué hora marca cada reloj, que el camino de la pelota
 * salga recto y lo que dicen las cifras. Las horas y los puntos bajo el sol son los
 * del almanaque, no los que salen de la cuenta.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  caminoEnLaPelota,
  CENTRO_DE_LA_PELOTA,
  datosDelVuelo,
  enLaPelota,
  nocheEnLaPelota,
  rayaDelDia,
  relojesEn,
} from "../flight/mapa-del-vuelo";
import { PIE } from "../flight/ruta";
import {
  BARAJAS,
  DE_MADRID_A_ASUNCION,
  horarioDelDia,
  perfilDelVuelo,
  PETTIROSSI,
  puntoBajoElSol,
  solEn,
} from "../flight/ruta-larga";
import { COSTAS_DE_LA_PELOTA } from "../ui/costas-de-la-pelota";
import { aPxDeLaPelota, fichasDeDatos, LA_PELOTA, PantallaDelRespaldo } from "./pantalla-del-respaldo";

const invierno = perfilDelVuelo(horarioDelDia(new Date("2026-12-15T12:00:00Z")));
const verano = perfilDelVuelo(horarioDelDia(new Date("2026-06-15T12:00:00Z")));

/** La diferencia entre dos longitudes, por el camino corto. */
const entreLongitudes = (a: number, b: number): number => Math.abs(((a - b + 540) % 360) - 180);

describe("El punto bajo el sol", () => {
  /*
   * Los instantes, del almanaque de 2026. La longitud sale de cuándo cae el mediodía
   * solar en Greenwich ese día, con la ecuación del tiempo: a las 11:58 en diciembre,
   * a las 12:01:40 en junio y a las 12:07:30 en marzo; y de ahí, quince grados por hora.
   */
  it("en el solsticio de diciembre va por el trópico de Capricornio", () => {
    const p = puntoBajoElSol(new Date("2026-12-21T20:50:00Z"));
    expect(p.lat).toBeCloseTo(-23.44, 1);
    expect(entreLongitudes(p.lon, -133)).toBeLessThan(0.25);
  });

  it("en el solsticio de junio va por el de Cáncer", () => {
    const p = puntoBajoElSol(new Date("2026-06-21T08:25:00Z"));
    expect(p.lat).toBeCloseTo(23.44, 1);
    expect(entreLongitudes(p.lon, 54.2)).toBeLessThan(0.25);
  });

  it("en el equinoccio de marzo va por el ecuador", () => {
    const p = puntoBajoElSol(new Date("2026-03-20T14:46:00Z"));
    expect(Math.abs(p.lat)).toBeLessThan(0.02);
    expect(entreLongitudes(p.lon, -39.65)).toBeLessThan(0.25);
  });

  it("es el mismo sol que alumbra el juego: cien grados de lejos, cien grados de sol menos", () => {
    const t = new Date("2026-11-15T22:45:00Z");
    const sol = puntoBajoElSol(t);
    for (const s of [BARAJAS, PETTIROSSI, { lat: -60, lon: 120 }, { lat: 70, lon: -150 }]) {
      const coseno =
        Math.sin((s.lat * Math.PI) / 180) * Math.sin((sol.lat * Math.PI) / 180) +
        Math.cos((s.lat * Math.PI) / 180) * Math.cos((sol.lat * Math.PI) / 180) * Math.cos(((s.lon - sol.lon) * Math.PI) / 180);
      expect(solEn(t, s).altura).toBeCloseTo(Math.asin(coseno), 6);
    }
  });
});

describe("La raya del día y la noche", () => {
  const instantes = ["2026-11-15T22:45:00Z", "2026-06-21T08:25:00Z", "2026-03-20T14:46:00Z", "2026-09-23T00:05:00Z"];

  it.each(instantes)("por ella, el sol está en el horizonte: %s", (cuando) => {
    const t = new Date(cuando);
    const { puntos } = rayaDelDia(t);
    expect(puntos.length).toBe(145);
    for (const p of puntos) expect(Math.abs(solEn(t, p).altura)).toBeLessThan(0.002);
  });

  it.each(instantes)("la noche queda del lado que dice: %s", (cuando) => {
    const t = new Date(cuando);
    const { puntos, nocheAlSur } = rayaDelDia(t);
    for (const p of puntos) {
      // Tres grados a cada lado, salvo donde la raya ya va por los polos.
      if (Math.abs(p.lat) > 85) continue;
      const alSur = solEn(t, { lat: p.lat - 3, lon: p.lon }).altura;
      const alNorte = solEn(t, { lat: p.lat + 3, lon: p.lon }).altura;
      if (nocheAlSur) expect(alSur).toBeLessThan(alNorte);
      else expect(alNorte).toBeLessThan(alSur);
    }
  });

  it("en diciembre, la noche queda al norte de la raya, con el polo norte a oscuras", () => {
    expect(rayaDelDia(new Date("2026-12-21T12:00:00Z")).nocheAlSur).toBe(false);
    expect(rayaDelDia(new Date("2026-06-21T12:00:00Z")).nocheAlSur).toBe(true);
  });
});

describe("Los relojes", () => {
  const unaVuelta = 2 * Math.PI;

  it("a las 10:00 de Madrid en invierno son las 6:00 en Asunción", () => {
    const { madrid, asuncion } = relojesEn(new Date("2026-12-15T09:00:00Z"));
    expect(madrid.segundos).toBe(10 * 3600);
    expect(asuncion.segundos).toBe(6 * 3600);
    expect(madrid.aguja.hora).toBeCloseTo((10 / 12) * unaVuelta, 6);
    expect(asuncion.aguja.hora).toBeCloseTo(unaVuelta / 2, 6);
    expect(madrid.aguja.minuto).toBeCloseTo(0, 6);
  });

  it("y en verano, las 5:00: lo que cambia es la hora de España", () => {
    const { madrid, asuncion } = relojesEn(new Date("2026-06-15T08:00:00Z"));
    expect(madrid.segundos).toBe(10 * 3600);
    expect(asuncion.segundos).toBe(5 * 3600);
    expect(asuncion.aguja.hora).toBeCloseTo((5 / 12) * unaVuelta, 6);
  });

  it("la aguja de las horas avanza con los minutos, como en un reloj de verdad", () => {
    // 22:30 UTC, en invierno: 23:30 en Madrid y 19:30 en Asunción.
    const { madrid, asuncion } = relojesEn(new Date("2026-11-15T22:30:00Z"));
    expect(madrid.aguja.hora).toBeCloseTo((11.5 / 12) * unaVuelta, 6);
    expect(madrid.aguja.minuto).toBeCloseTo(unaVuelta / 2, 6);
    expect(asuncion.aguja.hora).toBeCloseTo((7.5 / 12) * unaVuelta, 6);
  });

  it("a las 23:45 de Madrid de noviembre, de noche en las dos ciudades", () => {
    const { madrid, asuncion } = relojesEn(new Date("2026-11-15T22:45:00Z"));
    expect(madrid.deDia).toBe(false);
    expect(asuncion.deDia).toBe(false);
  });

  it("el 15 de junio a las 10:00 de Madrid hay sol allí y aún es de noche en Asunción, que es la lámina del desayuno", () => {
    const { madrid, asuncion } = relojesEn(new Date("2026-06-15T08:00:00Z"));
    expect(madrid.deDia).toBe(true);
    expect(asuncion.deDia).toBe(false);
  });

  it("a media mañana de noviembre, de día en las dos", () => {
    const { madrid, asuncion } = relojesEn(new Date("2026-11-15T12:00:00Z"));
    expect(madrid.deDia).toBe(true);
    expect(asuncion.deDia).toBe(true);
  });

  it("las 6:00 de Asunción ya tienen sol en noviembre y aún no en enero, que allí amanece a las 6:15", () => {
    expect(relojesEn(new Date("2026-11-15T09:00:00Z")).asuncion.deDia).toBe(true);
    expect(relojesEn(new Date("2027-01-15T09:00:00Z")).asuncion.deDia).toBe(false);
  });
});

describe("La pelota", () => {
  const dentro = (p: readonly [number, number], poligono: readonly (readonly [number, number])[]): boolean => {
    let si = false;
    poligono.forEach((a, i) => {
      const b = poligono[(i + 1) % poligono.length]!;
      if (a[1] > p[1] !== b[1] > p[1] && p[0] < a[0] + ((p[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1])) si = !si;
    });
    return si;
  };

  it("tiene en el centro el punto medio de la ruta", () => {
    const c = enLaPelota(CENTRO_DE_LA_PELOTA);
    expect(c.x).toBeCloseTo(0, 9);
    expect(c.y).toBeCloseTo(0, 9);
    expect(c.z).toBeCloseTo(1, 9);
    expect(aPxDeLaPelota(c)).toEqual([LA_PELOTA.x, LA_PELOTA.y]);
  });

  it("pone el norte arriba y el este a la derecha, como el mapa", () => {
    const madrid = enLaPelota(BARAJAS);
    const asuncion = enLaPelota(PETTIROSSI);
    expect(madrid.x).toBeGreaterThan(asuncion.x);
    expect(madrid.y).toBeLessThan(asuncion.y);
    expect(madrid.z).toBeGreaterThan(0);
    expect(asuncion.z).toBeGreaterThan(0);
  });

  it("saca recto el camino: Madrid, el punto medio, Asunción y todo lo demás, a menos de un píxel de la recta", () => {
    const [ax, ay] = aPxDeLaPelota(enLaPelota(BARAJAS));
    const [bx, by] = aPxDeLaPelota(enLaPelota(PETTIROSSI));
    const largo = Math.hypot(bx - ax, by - ay);
    const aLaRecta = (p: readonly [number, number]): number => Math.abs((bx - ax) * (ay - p[1]) - (ax - p[0]) * (by - ay)) / largo;
    expect(aLaRecta(aPxDeLaPelota(enLaPelota(CENTRO_DE_LA_PELOTA)))).toBeLessThan(1);
    const camino = caminoEnLaPelota();
    expect(camino.length).toBeGreaterThan(50);
    for (const p of camino) expect(aLaRecta(aPxDeLaPelota(p))).toBeLessThan(1);
    // Y el punto medio cae a mitad, y no en cualquier sitio de la recta.
    const [mx, my] = aPxDeLaPelota(enLaPelota(CENTRO_DE_LA_PELOTA));
    expect(Math.hypot(mx - ax, my - ay)).toBeCloseTo(largo / 2, 3);
  });

  it("no tiene costas cortadas a regla: llegan a Escandinavia, a la Patagonia y a la Antártida", () => {
    const puntos = COSTAS_DE_LA_PELOTA.flat();
    expect(Math.max(...puntos.map((p) => p[1]))).toBeGreaterThan(70);
    expect(Math.min(...puntos.map((p) => p[1]))).toBeLessThan(-60);
    expect(puntos.some(([lon, lat]) => lat > 58 && lat < 71 && lon > 5 && lon < 30)).toBe(true);
    expect(puntos.some(([lon, lat]) => lat < -50 && lat > -56 && lon > -75 && lon < -60)).toBe(true);
  });

  it("guarda solo lo que se ve: lo de detrás ya viene plegado al borde", () => {
    for (const costa of COSTAS_DE_LA_PELOTA) {
      for (const [lon, lat] of costa) expect(enLaPelota({ lon, lat }).z).toBeGreaterThan(-0.005);
    }
  });

  it("la raya de la noche va por el borde de la pelota en sus dos puntas y por el sol a 0° en medio", () => {
    const t = new Date("2026-11-15T22:45:00Z");
    const { raya, borde } = nocheEnLaPelota(t);
    expect(Math.hypot(...raya[0]!)).toBeCloseTo(1, 6);
    expect(Math.hypot(...raya[raya.length - 1]!)).toBeCloseTo(1, 6);
    // Volviendo del plano a la esfera, cada punto de la raya está a noventa grados del sol.
    const sol = enLaPelota(puntoBajoElSol(t));
    for (const [x, y] of raya) {
      const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      expect(Math.abs(x * sol.x + y * sol.y + z * sol.z)).toBeLessThan(1e-6);
    }
    for (const p of borde) expect(Math.hypot(...p)).toBeCloseTo(1, 6);
  });

  it.each([
    ["2026-11-15T22:45:00Z"],
    ["2026-06-15T08:00:00Z"],
    ["2027-01-15T09:00:00Z"],
    ["2026-11-15T12:00:00Z"],
    ["2026-03-20T14:46:00Z"],
    ["2026-09-23T00:05:00Z"],
  ])("la mancha de noche de la pelota tapa la ciudad cuando su reloj lleva luna: %s", (cuando) => {
    const t = new Date(cuando);
    const { raya, borde } = nocheEnLaPelota(t);
    const mancha = [...raya, ...borde];
    const relojes = relojesEn(t);
    const de = (s: { lat: number; lon: number }): readonly [number, number] => {
      const p = enLaPelota(s);
      return [p.x, p.y];
    };
    expect(dentro(de(BARAJAS), mancha)).toBe(!relojes.madrid.deDia);
    expect(dentro(de(PETTIROSSI), mancha)).toBe(!relojes.asuncion.deDia);
  });
});

describe("Los datos", () => {
  it("a FL400 fuera hay 56,5 bajo cero, los de la atmósfera tipo", () => {
    const d = datosDelVuelo(invierno, 5 * 3600, { altitud: 40_000 * PIE, velocidad: 240 });
    expect(d.temperatura).toBeCloseTo(-56.5, 1);
  });

  it("sin avión, con lo del perfil; con él, con lo que marca", () => {
    const delPerfil = datosDelVuelo(invierno, 5 * 3600);
    expect(delPerfil.altitud).toBeCloseTo(38_000 * PIE, 3);
    const delAvion = datosDelVuelo(invierno, 5 * 3600, { altitud: 9000, velocidad: 200, temperatura: -41 });
    expect(delAvion.altitud).toBe(9000);
    expect(delAvion.velocidad).toBe(200);
    expect(delAvion.temperatura).toBe(-41);
  });

  it("escribe las fichas en las unidades de la cabina, con sus rótulos sin traducir", () => {
    const f = fichasDeDatos(datosDelVuelo(invierno, 5 * 3600, { altitud: 40_000 * PIE, velocidad: 240 }));
    expect(f.map((x) => x.rotulo)).toEqual(["ALT", "GS", "OAT", "ETA", "DTG", "ETE"]);
    expect(f[0]).toMatchObject({ valor: "40 000", unidad: "FT" });
    expect(f[1]).toMatchObject({ valor: "467", unidad: "KT" });
    expect(f[2]).toMatchObject({ unidad: "°C" });
    expect(f[2]!.valor).toBe("−56");
    for (const x of f) expect(x.glosa.length).toBeGreaterThan(0);
  });

  it("da la llegada en hora de Asunción: 07:30 en invierno y 06:25 en verano", () => {
    expect(fichasDeDatos(datosDelVuelo(invierno, 3600))[3]!.valor).toBe("07:30");
    expect(fichasDeDatos(datosDelVuelo(verano, 3600))[3]!.valor).toBe("06:25");
  });

  it("lo que falta va de todo a nada", () => {
    const distancia = invierno.ruta.distancia;
    const alEmpezar = datosDelVuelo(invierno, 0);
    expect(alEmpezar.faltaDeCamino).toBeCloseTo(distancia, 0);
    expect(alEmpezar.hecho).toBeCloseTo(0, 6);
    // De calzos a calzos, 11 h 45, menos los 20 min del rodaje: 11 h 25 desde el despegue.
    expect(fichasDeDatos(alEmpezar)[5]!.valor).toBe("11:25");
    expect(fichasDeDatos(alEmpezar)[4]!.valor).toBe("4 962");
    const alFinal = datosDelVuelo(invierno, invierno.enElAire + 7 * 60);
    expect(alFinal.faltaDeCamino).toBe(0);
    expect(alFinal.faltaDeTiempo).toBe(0);
    expect(alFinal.hecho).toBe(1);
  });
});

describe("Repinta solo cuando cambia algo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["mapa", "cerca", "pelota", "relojes"] as const)("%s: quieto no repinta, y se repinta al moverse o al cambiar de modo", (modo) => {
    const p = new PantallaDelRespaldo();
    p.mostrar(modo);
    expect(p.poner(invierno, 3 * 3600)).toBe(true);
    expect(p.poner(invierno, 3 * 3600)).toBe(false);
    // Una hora después es otro sitio y otro sol.
    expect(p.poner(invierno, 4 * 3600)).toBe(true);
    expect(p.mostrar(modo)).toBe(false);
    expect(p.poner(invierno, 4 * 3600)).toBe(false);
    p.mostrar(modo === "mapa" ? "cerca" : "mapa");
    expect(p.poner(invierno, 4 * 3600)).toBe(true);
  });

  it("con el avión quieto en el puesto, el sol solo repinta cuando mueve la raya", () => {
    const p = new PantallaDelRespaldo();
    // Rodando en Barajas el avión no se mueve del mapa.
    expect(p.poner(invierno, -900)).toBe(true);
    let veces = 0;
    for (let s = 1; s <= 120; s++) if (p.poner(invierno, -900 + s)) veces++;
    expect(veces).toBeGreaterThanOrEqual(3);
    expect(veces).toBeLessThanOrEqual(5);
  });

  it("en cerca, con el avión en crucero, a ×1 repinta más o menos cada medio minuto", () => {
    const p = new PantallaDelRespaldo();
    p.mostrar("cerca");
    p.poner(invierno, 3 * 3600);
    let veces = 0;
    for (let s = 1; s <= 600; s++) if (p.poner(invierno, 3 * 3600 + s)) veces++;
    expect(veces).toBeGreaterThan(10);
    expect(veces).toBeLessThan(40);
  });

  it("las cifras: con el mismo número no repintan, y con otro, no más de dos veces por segundo", () => {
    let ahora = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => ahora);
    const p = new PantallaDelRespaldo();
    p.mostrar("datos");
    const avion = { altitud: 11_000, velocidad: 240 };
    expect(p.poner(invierno, 3 * 3600, avion)).toBe(true);
    ahora += 1000;
    expect(p.poner(invierno, 3 * 3600, avion)).toBe(false);
    // Una racha: otro número, pero enseguida.
    expect(p.poner(invierno, 3 * 3600, { ...avion, velocidad: 244 })).toBe(true);
    ahora += 100;
    expect(p.poner(invierno, 3 * 3600, { ...avion, velocidad: 248 })).toBe(false);
    ahora += 500;
    expect(p.poner(invierno, 3 * 3600, { ...avion, velocidad: 248 })).toBe(true);
  });

  it("recorre la ruta entera en los cinco modos sin tropezar", () => {
    const p = new PantallaDelRespaldo();
    for (const modo of ["mapa", "cerca", "pelota", "relojes", "datos"] as const) {
      p.mostrar(modo);
      for (let t = -1200; t < invierno.enElAire + 1000; t += 1800) p.poner(invierno, t);
    }
    expect(DE_MADRID_A_ASUNCION.distancia).toBeGreaterThan(9_000_000);
  });
});
