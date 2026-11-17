/**
 * **El remolque**, sin volar: qué puesto es de remolque, hacia dónde mira el
 * avión en él, por dónde va el empuje y que nadie atraviesa a nadie. Primero en
 * un puesto de mentira, donde se sabe qué tiene que salir; luego en los de
 * verdad de los vuelos de pasaje. Ver `remolque.ts`.
 */
import { describe, expect, it } from "vitest";
import type { Punto } from "./aerodrome";
import {
  ACELERA_EMPUJANDO,
  CUNA_DEL_TRACTOR,
  DIRECCION_MAXIMA,
  LEVANTA_LA_RUEDA,
  morroEnVilo,
  edificiosDePasarela,
  esPuestoDeContacto,
  largoPorLaBatalla,
  paredMasCercana,
  Remolque,
  rumboAlEdificio,
  rumboEnElPuesto,
  rumboEntre,
  saleConRemolque,
  trayectoriaDelEmpuje,
  VA_EMPUJANDO,
  vector,
  diferencia,
  type Edificios,
  type Pose,
  type PuntoXZ,
} from "./remolque";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { conSuAerodromo, MADRID_BARAJAS, SALIDA_DE_BARAJAS, TENERIFE_NORTE } from "./scenarios";
import { AIRCRAFT } from "../flight/aircraft";
import { esDeLinea } from "../flight/velocidades-en-tierra";
import { conLaRuedaEn, morroDe } from "./rueda-de-morro";

const GRADO = Math.PI / 180;
/** Un 787-9 y un E-170: batalla y envergadura de su ficha. */
const ANCHO = { batalla: 25.83, envergadura: 60.12 };
const REGIONAL = { batalla: 11.5, envergadura: 26 };

/**
 * **La terminal de mentira**: un rectángulo al norte, con la fachada en `z = −40`
 * del mundo, que en el aeródromo es `y = 40`. El puesto, en el origen, mirando al
 * norte; la raya baja al sur cincuenta metros hasta la calle, que va hacia el este.
 */
const TERMINAL: Edificios = [{ polygon: [[-200, 40], [200, 40], [200, 120], [-200, 120]] as Punto[] }];
const EN_EL_PUESTO: Pose = { x: 0, z: 0, rumbo: 0 };
const RAYA: PuntoXZ[] = [
  { x: 0, z: 0 },
  { x: 0, z: 50 },
  { x: 100, z: 50 },
  { x: 300, z: 50 },
];

describe("qué puesto es de remolque", () => {
  it("la pared más cercana, con su rumbo: la fachada al norte", () => {
    const p = paredMasCercana(0, 0, TERMINAL)!;
    expect(p.distancia).toBeCloseTo(40, 5);
    expect(Math.abs(diferencia(0, p.rumbo))).toBeLessThan(1e-6);
    expect(rumboAlEdificio(0, 0, TERMINAL)).toBeCloseTo(0, 6);
  });

  /*
   * El punto del puesto es donde para la rueda de morro (#191): la pasarela se cuenta
   * desde la puerta y el morro, desde su punta. Del 787, la puerta va a 0,8 m por detrás
   * de la rueda y la punta a 5,5 por delante. Ver `rueda-de-morro.ts`.
   */
  it("de contacto, si la puerta queda al alcance de la pasarela y el morro no se mete en el edificio", () => {
    const morro = morroDe(AIRCRAFT.find((a) => a.id === "jaz-110")!);
    // A cuarenta metros de la fachada, la puerta de un 787 queda a 40,8: contacto.
    expect(esPuestoDeContacto(0, 0, TERMINAL, morro)).toBe(true);
    // Y a veinte, también: con la rueda en el punto, el morro queda a catorce y medio.
    expect(esPuestoDeContacto(0, -20, TERMINAL, morro)).toBe(true);
    // A cuatro, el morro se metería: no es para este avión.
    expect(esPuestoDeContacto(0, -36, TERMINAL, morro)).toBe(false);
    // A setenta y ocho, la puerta queda a 78,8: todavía la alcanza. A ochenta y dos, ya no.
    expect(esPuestoDeContacto(0, 38, TERMINAL, morro)).toBe(true);
    expect(esPuestoDeContacto(0, 42, TERMINAL, morro)).toBe(false);
    // A ciento cincuenta, es un puesto de plataforma.
    expect(esPuestoDeContacto(0, 110, TERMINAL, morro)).toBe(false);
  });

  it("y una avioneta sale de frente aunque aparque al lado de un hangar", () => {
    expect(saleConRemolque(false, 0, 0, TERMINAL, morroDe(AIRCRAFT.find((a) => a.id === "jaz-20")!))).toBe(false);
    expect(saleConRemolque(true, 0, 0, TERMINAL, morroDe(AIRCRAFT.find((a) => a.id === "jaz-90")!))).toBe(true);
  });
});

/** Cada paso del empuje va hacia atrás: contra el morro. */
function vaDeCulo(poses: readonly Pose[]): number {
  let peor = -Infinity;
  for (let i = 1; i < poses.length; i++) {
    const a = poses[i - 1]!;
    const b = poses[i]!;
    const d = Math.hypot(b.x - a.x, b.z - a.z);
    if (d < 1e-6) continue;
    const n = vector(a.rumbo);
    peor = Math.max(peor, ((b.x - a.x) * n.x + (b.z - a.z) * n.z) / d);
  }
  return peor;
}

describe("el empuje", () => {
  const e = trayectoriaDelEmpuje(EN_EL_PUESTO, RAYA, ANCHO.batalla)!;

  it("va hacia atrás todo el rato, y la terminal se aleja hacia delante", () => {
    expect(e).not.toBeNull();
    // El coseno entre lo que se mueve y el morro: −1 es de culo del todo.
    expect(vaDeCulo(e.poses)).toBeLessThan(-0.99);
    const fin = e.poses.at(-1)!;
    expect(paredMasCercana(fin.x, fin.z, TERMINAL)!.distancia).toBeGreaterThan(70);
  });

  it("acaba en la calle, con el morro hacia donde sigue la raya", () => {
    const fin = e.poses.at(-1)!;
    // Mirando al este, que es hacia donde va la raya desde el cruce.
    expect(Math.abs(diferencia(fin.rumbo, 90 * GRADO))).toBeLessThan(1 * GRADO);
    // Sobre el eje de la calle, por detrás del cruce: el avión rueda luego hacia él.
    expect(Math.abs(fin.z - 50)).toBeLessThan(0.5);
    expect(fin.x).toBeLessThan(0);
    expect(Math.abs(e.giro)).toBeCloseTo(90 * GRADO, 3);
  });

  it("con un giro que el avión y el tractor pueden hacer", () => {
    // Con la rueda de morro a cuarenta y cinco grados, el radio es la batalla.
    expect(e.radio).toBeCloseTo(ANCHO.batalla, 3);
    // Y lo que gira por metro nunca pasa del tope con el pasador quitado.
    const minimo = ANCHO.batalla / Math.tan(DIRECCION_MAXIMA);
    for (let i = 1; i < e.poses.length; i++) {
      const a = e.poses[i - 1]!;
      const b = e.poses[i]!;
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      if (d > 0.1) expect(Math.abs(diferencia(a.rumbo, b.rumbo)) / d).toBeLessThan(1 / minimo + 1e-3);
    }
  });

  it("con la calle muy cerca, cierra el giro hasta su tope y no más", () => {
    const corta = trayectoriaDelEmpuje(EN_EL_PUESTO, [{ x: 0, z: 0 }, { x: 0, z: 12 }, { x: 200, z: 12 }], ANCHO.batalla)!;
    expect(corta.radio).toBeGreaterThanOrEqual(ANCHO.batalla / Math.tan(DIRECCION_MAXIMA) - 1e-6);
    expect(vaDeCulo(corta.poses)).toBeLessThan(-0.99);
    expect(Math.abs(diferencia(corta.poses.at(-1)!.rumbo, 90 * GRADO))).toBeLessThan(1 * GRADO);
  });

  it("y si la calle tuerce al otro lado, gira al otro lado", () => {
    const oeste = trayectoriaDelEmpuje(EN_EL_PUESTO, [{ x: 0, z: 0 }, { x: 0, z: 50 }, { x: -200, z: 50 }], REGIONAL.batalla)!;
    expect(Math.abs(diferencia(oeste.poses.at(-1)!.rumbo, -90 * GRADO))).toBeLessThan(1 * GRADO);
    expect(oeste.poses.at(-1)!.x).toBeGreaterThan(0);
  });

  /*
   * **Como el 23 de Los Rodeos** (#191): la raya sale de espaldas y va recta por la
   * plataforma noventa y seis metros hasta la calle, que tuerce hacia el sureste. Ver
   * `RECTA_DE_LA_PLATAFORMA` en `remolque.ts`.
   */
  const POR_LA_PLATAFORMA: PuntoXZ[] = [
    { x: 0, z: 0 },
    { x: 0, z: 24 },
    { x: 0, z: 48 },
    { x: 0, z: 72 },
    { x: 0, z: 96 },
    { x: 60, z: 150 },
    { x: 120, z: 204 },
  ];

  it("si la raya va recta de espaldas por la plataforma, el tractor lleva el avión hasta la calle y lo deja mirando por ella", () => {
    const e = trayectoriaDelEmpuje(EN_EL_PUESTO, POR_LA_PLATAFORMA, REGIONAL.batalla)!;
    const fin = e.poses.at(-1)!;
    // La calle es donde acaba la recta, y no un giro de noventa grados a los treinta metros.
    expect(e.cruce).toEqual({ x: 0, z: 96 });
    expect(e.largo).toBeGreaterThan(80);
    // Hacia donde va la calle, con más de un cuarto de vuelta y sin llegar a media.
    const calle = rumboEntre({ x: 0, z: 96 }, { x: 60, z: 150 });
    expect(Math.abs(diferencia(fin.rumbo, calle))).toBeLessThan(1 * GRADO);
    expect(Math.abs(e.giro)).toBeGreaterThan(120 * GRADO);
    expect(Math.abs(e.giro)).toBeLessThanOrEqual(150 * GRADO);
    // Con el cruce por delante del morro: al soltarlo, rueda recto hasta él.
    expect(Math.abs(diferencia(fin.rumbo, rumboEntre(fin, e.cruce)))).toBeLessThan(1 * GRADO);
    expect(vaDeCulo(e.poses)).toBeLessThan(-0.99);
  });

  it("y sin la plataforma, como el tráfico, la de siempre: noventa grados a dejar el puesto libre", () => {
    const e = trayectoriaDelEmpuje(EN_EL_PUESTO, POR_LA_PLATAFORMA, REGIONAL.batalla, { porLaPlataforma: false })!;
    expect(Math.abs(e.giro)).toBeCloseTo(90 * GRADO, 3);
    expect(e.largo).toBeLessThan(50);
  });

  it("y media vuelta no se empuja nunca: noventa grados, y lo demás lo rueda el avión", () => {
    // Sale de espaldas y en diagonal, y la calle sigue recta hacia atrás: pediría ciento ochenta.
    const raya = [
      { x: 0, z: 0 },
      { x: -14.14, z: 14.14 },
      { x: -28.28, z: 28.28 },
      { x: -28.28, z: 228.28 },
    ];
    const e = trayectoriaDelEmpuje(EN_EL_PUESTO, raya, REGIONAL.batalla)!;
    expect(Math.abs(e.giro)).toBeCloseTo(90 * GRADO, 3);
  });
});

describe("el remolque, paso a paso", () => {
  const e = trayectoriaDelEmpuje(EN_EL_PUESTO, RAYA, ANCHO.batalla)!;

  function hastaLibre(r: Remolque): { tope: number; tiron: number; fases: string[] } {
    let tope = 0;
    let tiron = 0;
    let antes = 0;
    const fases: string[] = [r.fase];
    for (let t = 0; t < 600 && !r.libre; t += 0.05) {
      r.paso(0.05);
      tope = Math.max(tope, r.velocidad);
      // El último palmo, a menos de diez centímetros por segundo, no se nota: se mira lo de antes.
      if (r.velocidad > 0.1 && antes > 0.1) tiron = Math.max(tiron, Math.abs(r.velocidad - antes) / 0.05);
      antes = r.velocidad;
      if (fases.at(-1) !== r.fase) fases.push(r.fase);
    }
    return { tope, tiron, fases };
  }

  it("no se mueve hasta que la cabina lo pide", () => {
    const r = new Remolque(e, ANCHO);
    for (let i = 0; i < 100; i++) r.paso(0.1);
    expect(r.fase).toBe("enganchado");
    expect(r.empujado).toBe(0);
    expect(r.conCable).toBe(true);
  });

  it("a paso de persona, sin tirones, y en su orden hasta el saludo", () => {
    const r = new Remolque(e, ANCHO);
    r.empezar();
    const { tope, tiron, fases } = hastaLibre(r);
    expect(r.libre).toBe(true);
    expect(tope).toBeLessThanOrEqual(VA_EMPUJANDO + 1e-9);
    expect(tope).toBeGreaterThan(0.9 * VA_EMPUJANDO);
    expect(tiron).toBeLessThan(ACELERA_EMPUJANDO * 1.5);
    expect(fases).toEqual(["empujando", "frenado", "soltando", "apartandose", "andando", "saludando", "libre"]);
    // El avión, donde acaba el empuje.
    const fin = e.poses.at(-1)!;
    expect(Math.hypot(r.avion.x - fin.x, r.avion.z - fin.z)).toBeLessThan(0.05);
  });

  it("y al acabar nadie se queda donde va a pasar el avión", () => {
    const r = new Remolque(e, ANCHO);
    r.empezar();
    hastaLibre(r);
    const a = r.avion;
    const n = vector(a.rumbo);
    /** Lo que se aparta algo del eje por donde va a rodar el avión, m, si está por delante de la cola. */
    const aparte = (p: PuntoXZ): number => {
      const dx = p.x - a.x;
      const dz = p.z - a.z;
      const delante = dx * n.x + dz * n.z;
      const lado = Math.abs(dx * -n.z + dz * n.x);
      return delante < -40 ? Infinity : lado;
    };
    const tractor = r.medidasDelTractor;
    expect(aparte(r.tractor) - tractor.ancho).toBeGreaterThan(ANCHO.envergadura / 2 + 5);
    expect(aparte(r.persona)).toBeGreaterThan(ANCHO.envergadura / 2 + 5);
    // La persona, a la izquierda del avión, que es el lado de la comandante, y mirando a la cabina.
    const p = r.persona;
    const lado = (p.x - a.x) * -n.z + (p.z - a.z) * n.x;
    expect(lado).toBeLessThan(0);
    const aLaRueda = Math.atan2(r.ruedaDeMorro.x - p.x, -(r.ruedaDeMorro.z - p.z));
    expect(Math.abs(diferencia(p.rumbo, aLaRueda))).toBeLessThan(5 * GRADO);
    // Y el tractor, lejos de la persona.
    expect(Math.hypot(r.tractor.x - p.x, r.tractor.z - p.z)).toBeGreaterThan(tractor.largo / 2 + 3);
  });

  it("el tractor va pegado a la rueda de morro mientras empuja, y la persona al lado", () => {
    const r = new Remolque(e, ANCHO);
    r.empezar();
    for (let i = 0; i < 400; i++) {
      r.paso(0.1);
      if (r.fase !== "empujando") break;
      const rueda = r.ruedaDeMorro;
      // La rueda, en medio de la cuna: el centro del tractor, por delante lo que le queda de largo.
      const largo = r.medidasDelTractor.largo;
      expect(Math.hypot(r.tractor.x - rueda.x, r.tractor.z - rueda.z)).toBeCloseTo((largo * (1 - CUNA_DEL_TRACTOR)) / 2, 3);
      // Y en vilo, todo el empuje.
      expect(r.ruedaEnVilo).toBe(LEVANTA_LA_RUEDA);
      const d = Math.hypot(r.persona.x - rueda.x, r.persona.z - rueda.z);
      expect(d).toBeGreaterThan(r.medidasDelTractor.ancho / 2 + 1);
      expect(d).toBeLessThan(8);
    }
  });

  /*
   * **La rueda de morro, en vilo mientras el tractor la tiene.** Un tractor sin barra la
   * sube sobre su pala; la pala la atravesaba con la rueda en el suelo. Y el avión gira
   * sobre las principales: medido contra el suelo, ni flota ni se hunde.
   */
  it("la rueda de morro va en vilo mientras el tractor la tiene, y baja al soltarse", () => {
    const r = new Remolque(e, ANCHO);
    expect(r.fase).toBe("enganchado");
    expect(r.ruedaEnVilo).toBe(LEVANTA_LA_RUEDA);
    r.empezar();
    let antes = r.ruedaEnVilo;
    let bajando = 0;
    for (let i = 0; i < 4000 && !r.libre; i++) {
      r.paso(0.1);
      const ahora = r.ruedaEnVilo;
      // Mientras la tiene, en vilo o bajando; suelta, en el suelo.
      if (r.enganchado) expect(ahora).toBeGreaterThanOrEqual(0);
      else expect(ahora).toBe(0);
      expect(ahora).toBeLessThanOrEqual(antes + 1e-9);
      if (ahora < antes) bajando++;
      antes = ahora;
    }
    expect(r.libre).toBe(true);
    // Baja poco a poco, no de golpe.
    expect(bajando).toBeGreaterThan(10);
  });

  it("con la rueda de morro en vilo, el avión gira sobre las principales", () => {
    // El JAZ 90: 11,5 m de batalla, y las principales 1,4 m por detrás de su referencia.
    const batalla = 11.5;
    const principales = 1.4;
    const { cabeceo, sube } = morroEnVilo(LEVANTA_LA_RUEDA, batalla, principales);
    expect(cabeceo).toBeGreaterThan(0);
    expect(sube + Math.sin(cabeceo) * (batalla - principales)).toBeCloseTo(LEVANTA_LA_RUEDA, 4);
    expect(sube - Math.sin(cabeceo) * principales).toBeCloseTo(0, 6);
    expect(morroEnVilo(0, batalla, principales)).toEqual({ cabeceo: 0, sube: 0 });
  });
});

describe("en los puestos de verdad", () => {
  it("el T5 de la T1 de Barajas es de remolque para el JAZ 110, y el empuje sale a la calle de la raya", async () => {
    const s = await conSuAerodromo(MADRID_BARAJAS);
    const aero = s.aerodrome!;
    const avion = AIRCRAFT.find((a) => a.id === "jaz-110")!;
    const plan = new PlanDeVuelo(aero, s.runway, () => 600, avion);
    plan.puestoPedido = SALIDA_DE_BARAJAS.puesto;
    expect(plan.reiniciar()).toBe(true);
    const [x, z] = plan.arranque()!;
    const largo = largoPorLaBatalla(avion.batalla);
    expect(saleConRemolque(esDeLinea(avion), x, z, aero.buildings ?? [], morroDe(avion))).toBe(true);
    const rumbo = rumboAlEdificio(x, z, aero.buildings ?? [])!;
    const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
    // Con la rueda de morro en el punto del puesto, como lo pone el juego.
    const c = conLaRuedaEn({ x, z }, rumbo, morroDe(avion));
    const e = trayectoriaDelEmpuje({ x: c.x, z: c.z, rumbo }, raya, avion.batalla)!;
    expect(e).not.toBeNull();
    expect(vaDeCulo(e.poses)).toBeLessThan(-0.95);
    // Acaba mirando hacia donde va la raya desde el cruce, y cerca de ella.
    const fin = e.poses.at(-1)!;
    const i = raya.findIndex((p) => p === e.cruce || (p.x === e.cruce.x && p.z === e.cruce.z));
    expect(i).toBeGreaterThan(0);
    let lejos = Infinity;
    for (let k = 1; k < raya.length; k++) lejos = Math.min(lejos, aLaRecta(fin, raya[k - 1]!, raya[k]!));
    expect(lejos).toBeLessThan(45);
    // Y ni un paso del empuje con el avión dentro de un edificio: el centro, a media envergadura de toda pared.
    for (const p of e.poses) expect(paredMasCercana(p.x, p.z, aero.buildings ?? [])!.distancia).toBeGreaterThan(largo / 2);
  });

  it("de Los Rodeos, con pasaje, el JAZ 90 sale de un puesto de contacto, se aleja de su pared y nadie se le cruza", async () => {
    const s = await conSuAerodromo(TENERIFE_NORTE);
    const aero = s.aerodrome!;
    const avion = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    const plan = new PlanDeVuelo(aero, s.runway, () => 600, avion);
    plan.deContacto = true;
    expect(plan.reiniciar()).toBe(true);
    const [x, z] = plan.arranque()!;
    const edificios = aero.buildings ?? [];
    expect(saleConRemolque(esDeLinea(avion), x, z, edificios, morroDe(avion))).toBe(true);
    const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
    const rumbo = rumboEnElPuesto(x, z, edificios, raya)!;
    const c = conLaRuedaEn({ x, z }, rumbo, morroDe(avion));
    const e = trayectoriaDelEmpuje({ x: c.x, z: c.z, rumbo }, raya, avion.batalla)!;
    expect(vaDeCulo(e.poses)).toBeLessThan(-0.95);
    // La pared a la que miraba, cada vez más lejos: la terminal se aleja hacia delante.
    const pared = paredMasCercana(x, z, edificios)!;
    const h = vector(pared.rumbo);
    const enLaPared = { x: x + h.x * pared.distancia, z: z + h.z * pared.distancia };
    const fin = e.poses.at(-1)!;
    // En Los Rodeos la calle está a noventa y seis metros del puesto, por la plataforma: se aleja.
    expect(Math.hypot(fin.x - enLaPared.x, fin.z - enLaPared.z)).toBeGreaterThan(pared.distancia + 5);
    // Y del remolque entero, nadie se mete en el fuselaje: el tractor, suelto, ni la persona.
    const r = new Remolque(e, { batalla: avion.batalla, envergadura: avion.wingSpan, rueda: morroDe(avion).rueda });
    r.empezar();
    let tractor = Infinity;
    let persona = Infinity;
    for (let i = 0; i < 6000 && !r.libre; i++) {
      r.paso(0.05);
      const a = r.avion;
      const n = vector(a.rumbo);
      const rueda = r.ruedaDeMorro;
      const cola = { x: a.x - n.x * largoPorLaBatalla(avion.batalla) * 0.55, z: a.z - n.z * largoPorLaBatalla(avion.batalla) * 0.55 };
      const trasLaRueda = { x: rueda.x - n.x * 2, z: rueda.z - n.z * 2 };
      if (!r.enganchado) tractor = Math.min(tractor, alSegmento(r.tractor, trasLaRueda, cola) - r.medidasDelTractor.ancho / 2);
      persona = Math.min(persona, alSegmento(r.persona, rueda, cola));
    }
    expect(r.libre).toBe(true);
    expect(tractor).toBeGreaterThan(1);
    expect(persona).toBeGreaterThan(2);
  });

  /*
   * **Y lo deja con el morro hacia la Z**, que es la calle por la que rueda: al soltarlo
   * va recto hasta ella. Con los puestos de #191 sale del 23, en la esquina oeste de la
   * terminal, con noventa y seis metros rectos de plataforma hasta la Z; el empuje giraba
   * noventa grados a los veintinueve metros y al soltarlo el avión giraba 78° en sus
   * primeros treinta metros. Lo mide también el banco de `verificar-inicio-3.mjs`.
   */
  it("y de Los Rodeos, con pasaje, el JAZ 90 acaba con el morro hacia la calle: al soltarlo rueda casi recto", async () => {
    const s = await conSuAerodromo(TENERIFE_NORTE);
    const aero = s.aerodrome!;
    const avion = AIRCRAFT.find((a) => a.id === "jaz-90")!;
    const plan = new PlanDeVuelo(aero, s.runway, () => 600, avion);
    plan.deContacto = true;
    expect(plan.reiniciar()).toBe(true);
    const [x, z] = plan.arranque()!;
    const edificios = edificiosDePasarela(aero);
    const raya = plan.rutaVisible().map(([px, pz]) => ({ x: px, z: pz }));
    const rumbo = rumboEnElPuesto(x, z, edificios, raya)!;
    const c = conLaRuedaEn({ x, z }, rumbo, morroDe(avion));
    const e = trayectoriaDelEmpuje({ x: c.x, z: c.z, rumbo }, raya, avion.batalla)!;
    const fin = e.poses.at(-1)!;
    // El cruce con la calle, por delante del morro y en su eje.
    const hastaElCruce = Math.hypot(e.cruce.x - fin.x, e.cruce.z - fin.z);
    expect(hastaElCruce).toBeGreaterThan(5);
    expect(Math.abs(diferencia(fin.rumbo, rumboEntre(fin, e.cruce)))).toBeLessThan(5 * GRADO);
    // Y lo que sigue la raya desde el cruce, poco torcido respecto al morro.
    const k = raya.findIndex((p) => p.x === e.cruce.x && p.z === e.cruce.z);
    expect(k).toBeGreaterThan(0);
    let j = k;
    while (j < raya.length - 1 && Math.hypot(raya[j]!.x - e.cruce.x, raya[j]!.z - e.cruce.z) < 30) j++;
    expect(Math.abs(diferencia(fin.rumbo, rumboEntre(e.cruce, raya[j]!)))).toBeLessThan(20 * GRADO);
  });
});

/** Lo que se aparta `p` de la recta `a`–`b`, m. */
function aLaRecta(p: PuntoXZ, a: PuntoXZ, b: PuntoXZ): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz || 1;
  const t = ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2;
  return Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
}

/** Lo que se aparta `p` del segmento `a`–`b`, m. */
function alSegmento(p: PuntoXZ, a: PuntoXZ, b: PuntoXZ): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
  return Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
}
