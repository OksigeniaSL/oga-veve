/**
 * **De vuelta al puesto, nadie se te mete de frente en la calle.**
 *
 * Enrique, de noche en Los Rodeos con el JAZ 120, acabando de dejar la pista
 * y con el coche del sígame delante: por su misma raya verde, junto a la
 * letra de la R pintada en el suelo, venía de frente un turbohélice —«Ops»—,
 * y unos segundos después lo tenía metido dentro del avión —«Accidente»—.
 *
 * Reproducido aquí antes de arreglarlo, con lo que monta el juego —tu plan de
 * tierra con su raya, el tráfico con sus calles y sus tipos—: aterrizando por
 * la 12 y saliendo por la E4, la raya vuelve hacia el oeste por la R, la
 * paralela; el que sale rueda de la plataforma hacia el este por la misma R,
 * camino de la E3. El tráfico solo tenía una regla de cerca —no avanzar si
 * eso le acerca a menos de la separación de ala de ti o de tu raya de los
 * próximos segundos—, así que los dos se metían en la R, se paraban mirándose
 * a cincuenta y seis metros, el coche —que va setenta por delante del JAZ
 * 120— se quedaba a diecinueve del otro, dentro de él, y a los treinta
 * segundos el otro se esfumaba: la red de los atascos, no un aeropuerto.
 * Medido: veinticuatro segundos de frente y un avión retirado, con el
 * anuncio sesenta segundos después de tocar.
 *
 * Lo de verdad es que el control de tierra no deja a dos de frente en el
 * mismo tramo, y las luces de eje solo se encienden por delante de quien tiene
 * el camino libre. Ver `tramo-de-frente.ts`. Lo que se pide:
 *
 * - **la regla, sola**: dónde se mete un camino en la calle de otro que va de
 *   frente, y si ya estaba dentro;
 * - **el caso de Enrique, sin la regla, sale**: si esta prueba no lo viera,
 *   su «no pasa» no valdría nada;
 * - **y con la regla, en cada campo con calles y por las dos cabeceras**,
 *   aterrizando con el más grande que cabe y rodando al puesto por la raya con
 *   uno que sale a varias horas: ninguno de frente parado, ninguno retirado
 *   por atasco, nadie dentro de nadie —ni el coche—, y siempre se llega.
 */
import { describe, expect, it } from "vitest";
import { sinTorre, type Aerodrome } from "./aerodrome";
import { PlanDeVuelo, separacionEnTierra } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import { SCENARIOS, conViento, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";
import { sueloDelTrafico } from "./suelo-del-trafico";
import { crearTrafico, tiposDelCampo, TIPOS, type EnTierra } from "./trafico";
import { enEjesDePista } from "./rumbo";
import { porDelanteDe, tramoDeFrente } from "./tramo-de-frente";
import { USAN_LA_CALLE } from "../flight/turno-de-pista";

const PASO = 0.1;

/** Para mirar un caso de cerca: `OGA_TRAZA=1 OGA_CASO="campo rumbo matrícula anuncio"`. */
const ENTORNO =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process
    ?.env ?? {};

/** Lo que va por delante del JAZ 120 el coche del sígame, m. Ver `adelantoDelSigueme`. */
const ADELANTO_DEL_COCHE = 70;

/** Por encima de esto, m/s, no se rueda: se corre por la pista. */
const CORRIENDO = 15;

/**
 * Lo que tiene que durar un frente a frente para contarlo, s: los dos parados
 * y mirándose. Menos que esto es pasar uno junto al otro.
 */
const PARADOS_DE_FRENTE = 3;

/** Lo que llevaba cediendo o quieto uno al que retiró la red de los atascos, s. */
const RETIRADO_POR_ATASCO = 14;

const CAMPOS = SCENARIOS.filter((e) => {
  const a = e.aerodrome;
  if (!a || a.privado || !a.taxiways.length) return false;
  return tiposDelCampo(a.id, e.runway.length, sinTorre(a)).length > 0;
});

/** Las dos cabeceras, por el viento. */
function cabeceras(esc0: Scenario): Scenario[] {
  const por = new Map<number, Scenario>();
  for (const v of [0, 90, 180, 270]) {
    const e = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe: v, vientoKt: 15 });
    por.set(Math.round(e.runway.heading), e);
  }
  return [...por.values()];
}

/** El más grande que cabe: el que más ocupa en una calle. */
function elMasGrande(esc: Scenario): AircraftConfig {
  const caben = AIRCRAFT.filter((a) => cabeEn(a, campoDe(esc)).cabe);
  return [...caben].sort((a, b) => b.wingSpan - a.wingSpan)[0] ?? AIRCRAFT[0]!;
}

/** Puntos de una polilínea del mundo cada `paso` metros, como en el juego. */
function cadaTanto(linea: readonly (readonly [number, number])[], paso: number) {
  return porDelanteDe(
    linea.map(([x, z]) => ({ x, z })),
    0,
    Infinity,
    paso,
  );
}

interface Medida {
  /** Lo más cerca que se vio a uno del tráfico en las calles, m. */
  masCerca: number;
  separacion: number;
  /** Uno del tráfico metido en tu avión: sus centros a menos de las dos semialas. */
  contacto: string;
  /** Veces que uno del tráfico, moviéndose él, se te metió en la separación. */
  seMetio: number;
  /** El coche del sígame dentro de uno del tráfico. */
  coche: string;
  /** Segundos parados de frente, tú y uno del tráfico. */
  deFrente: number;
  /** Los retirados por la red de los atascos. */
  retirados: string[];
  /** Si se llegó al puesto. */
  llego: boolean;
  /** Cómo se repartió el tramo: «espera», «pasa» o «frente». */
  repartos: Set<string>;
  /** Si se llegó a rodar, para saber que hubo con quién cruzarse. */
  rodo: boolean;
}

/**
 * Un aterrizaje y la vuelta al puesto por la raya, con uno que sale a rodar
 * `anuncio` segundos después de tocar, o de dejar la pista si `desde` lo dice.
 * `conLaRegla` es si tu raya se le da al tráfico, como hace el juego: sin
 * ella es lo de antes.
 */
function vueltaConUnoQueSale(
  esc: Scenario,
  avion: AircraftConfig,
  matricula: string,
  anuncio: number,
  conLaRegla = true,
  desde: "la toma" | "la salida" = "la toma",
): Medida {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const ancho = aero.runways[0]?.widthM ?? 45;
  const plan = new PlanDeVuelo(aero, pista, () => cota, avion);
  plan.reiniciar();
  const suelo = sueloDelTrafico(aero, pista, ancho);
  const unaSola = suelo?.unaSolaCalle() ?? false;
  const separacion = separacionEnTierra(avion.wingSpan);
  let x = 0;
  let z = 0;
  let rumbo = 0;
  let v = 0;
  let alto = 400;
  let fase = "";
  const enTierra = (): EnTierra => {
    const metros = v < 0.5 ? 0 : Math.max(15, v * 4);
    const porDondeVa = plan.porDondeVas(metros);
    for (let d = 6; d <= metros; d += 6)
      porDondeVa.push({ x: x + Math.sin(rumbo) * d, z: z - Math.cos(rumbo) * d });
    return {
      x,
      z,
      separacion,
      porDondeVa,
      esperandoLaPista: fase === "esperando",
      ...(conLaRegla ? { ruta: plan.rutaReservada() } : {}),
    };
  };
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
    quienJuega: () => ({
      alUmbral: null,
      enLaPista: alto < 1 && ["aterrizado", "abandonando"].includes(fase),
      velocidad: v,
      enTierra: alto < 1 ? enTierra() : null,
    }),
    tierra: () => {
      if (!suelo) return null;
      const ruta = plan.rutaVisible();
      const raya = ruta.at(-1);
      return {
        suelo,
        alto: () => cota,
        evitar: [{ x, z }, ...(raya ? [{ x: raya[0], z: raya[1] }] : [])],
        porDondeVas: cadaTanto(ruta, 10),
        ocupados:
          alto < 1
            ? {
                puntos: [
                  { x, z },
                  ...(raya ? [{ x: raya[0], z: raya[1] }] : []),
                  ...cadaTanto(ruta, 30),
                ],
                radio: separacion,
              }
            : undefined,
      };
    },
  });
  const parados = (sale: boolean, soloLosQueHay = false) =>
    trafico
      .dondeParan()
      .filter((p) => p.sale === sale && (p.hay || !soloLosQueHay))
      .map((p) => [p.x, -p.z] as [number, number]);
  plan.ocupados = () => parados(false);
  plan.enCola = () => parados(true);
  plan.colaQueHay = () => parados(true, true);
  if (conLaRegla) plan.tramosDeOtros = () => trafico.tramosQueTienen();

  const estado = () =>
    ({
      position: { x, y: cota + alto, z },
      velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
      heading: rumbo,
      airspeed: v,
      groundSpeed: v,
      verticalSpeed: 0,
      yawRate: 0,
      onGround: alto < 1,
      onRunway: (() => {
        const e = enEjesDePista(x, z, pista.x, pista.z, pista.heading);
        return (
          alto < 1 &&
          Math.abs(e.across) < pista.width / 2 &&
          Math.abs(e.along) < pista.length / 2
        );
      })(),
    }) as never;

  const h = (pista.heading * Math.PI) / 180;
  const eje = (al: number) => ({
    x: pista.x + Math.sin(h) * al,
    z: pista.z - Math.cos(h) * al,
  });
  const umbral = -pista.length / 2 + (pista.desplazado ?? 0);
  const medida: Medida = {
    masCerca: Infinity,
    separacion,
    contacto: "",
    seMetio: 0,
    coche: "",
    deFrente: 0,
    retirados: [],
    llego: false,
    repartos: new Set(),
    rodo: false,
  };
  const detalle =
    ENTORNO.OGA_CASO ===
    `${esc.id} ${Math.round(pista.heading)} ${matricula} ${anuncio}`;
  const antes = new Map<string, { x: number; z: number }>();
  const comoIba = new Map<string, { cedido: number; quieto: number; alto: number }>();
  let anunciado = false;
  let despega = false;
  let coche = -Infinity;
  let al = Math.min(600, pista.length * 0.25);
  let frenando = true;
  /** Cuándo dejó la pista, s: la primera vez que la fase es «a plataforma». */
  let fuera: number | null = null;
  for (let t = -30; t < 700; t += PASO) {
    if (fuera === null && fase === "a-plataforma") fuera = t;
    const cero = desde === "la toma" ? 0 : fuera;
    /*
     * Sale a rodar cuando lo diría la frecuencia: si cabe donde aparece, y en
     * un campo de una sola calle, no mientras la usas tú para volver. Ver
     * `Momento.calleOcupada` en `flight/radio.ts`.
     */
    if (
      !anunciado &&
      cero !== null &&
      t >= cero + anuncio &&
      !trafico.todaviaNo(matricula, "otro.rodando") &&
      !(unaSola && USAN_LA_CALLE[fase] === "volviendo")
    ) {
      anunciado = true;
      trafico.anuncia(matricula, "otro.rodando");
    }
    // Con la pista libre la torre le da la salida en su doble raya.
    if (
      anunciado &&
      !despega &&
      trafico.dibujado(matricula) &&
      !trafico.todaviaNo(matricula, "torre.clearedTakeoff")
    ) {
      despega = true;
      trafico.anuncia(matricula, "torre.clearedTakeoff");
    }
    if (t < 0) {
      // Volando la final, lejos.
      const p = eje(umbral - 3000);
      x = p.x;
      z = p.z;
      rumbo = h;
      v = 70;
    } else if (frenando) {
      // La carrera, por el eje, hasta que el plan dice que se deja la pista.
      if (alto > 0) {
        alto = 0;
        v = avion.approachSpeed;
      }
      const q = eje(umbral + al);
      x = q.x;
      z = q.z;
      rumbo = h;
      al += v * PASO;
      v = Math.max(6, v - 3 * PASO);
      if (fase === "abandonando" || v <= 6) frenando = false;
    }
    const vista = plan.paso(estado(), alto, true, PASO);
    fase = vista.fase;
    trafico.paso(PASO);
    if (fase === "en-puesto" || fase === "apagado") {
      medida.llego = true;
      break;
    }
    const ruta = plan.rutaVisible();
    const sitioDelCoche =
      Number.isFinite(coche) && ruta.length > 1
        ? (porDelanteDe(
            ruta.map(([a, b]) => ({ x: a, z: b })),
            coche,
            coche,
          )[0] ?? null)
        : null;
    for (const q of trafico.porDentro()) {
      if (q.frenteATi) medida.repartos.add(q.frenteATi);
      comoIba.set(q.matricula, q);
    }
    for (const q of trafico.quienes()) {
      const previo = antes.get(q.matricula);
      antes.set(q.matricula, { x: q.x, z: q.z });
      if (q.y - cota > 5 || alto > 1) continue;
      const mueve = previo ? Math.hypot(q.x - previo.x, q.z - previo.z) : 0;
      if (mueve / PASO > CORRIENDO) continue;
      const d = Math.hypot(q.x - x, q.z - z);
      const semiala = TIPOS[q.tipo].envergadura / 2;
      if (!q.enLaPista) medida.masCerca = Math.min(medida.masCerca, d);
      if (!q.enLaPista && d < avion.wingSpan / 2 + semiala && !medida.contacto)
        medida.contacto = `${q.matricula} (${q.tipo}) a ${d.toFixed(1)} m en «${fase}», t=${t.toFixed(1)} s`;
      if (
        previo &&
        mueve > 0.01 &&
        d < separacion - 0.5 &&
        d < Math.hypot(previo.x - x, previo.z - z) - 0.01
      )
        medida.seMetio++;
      const giro = Math.abs(
        ((((q.rumbo * Math.PI) / 180 - rumbo) % (2 * Math.PI)) + 3 * Math.PI) %
          (2 * Math.PI) -
          Math.PI,
      );
      if (d < 200 && giro > (3 * Math.PI) / 4 && v < 0.3 && mueve < 0.01 && rodando(fase))
        medida.deFrente += PASO;
      if (sitioDelCoche) {
        const dc = Math.hypot(q.x - sitioDelCoche.x, q.z - sitioDelCoche.z);
        if (dc < semiala + 2 && !medida.coche)
          medida.coche = `dentro de ${q.matricula} (${q.tipo}) a ${dc.toFixed(1)} m, t=${t.toFixed(1)} s`;
      }
      if (detalle && d < 250)
        console.log(
          `t=${t.toFixed(1)} ${fase} v=${v.toFixed(1)} d=${d.toFixed(1)} ${JSON.stringify(trafico.porDentro().find((p) => p.matricula === q.matricula))}`,
        );
    }
    // Los que ya no están: si los quitó la red de los atascos, se apunta.
    for (const [m, como] of comoIba)
      if (!trafico.dibujado(m)) {
        if (
          como.alto < 5 &&
          (como.cedido >= RETIRADO_POR_ATASCO || como.quieto >= RETIRADO_POR_ATASCO)
        )
          medida.retirados.push(`${m} a los ${t.toFixed(0)} s`);
        comoIba.delete(m);
        antes.delete(m);
      }
    if (frenando || t < 0) continue;
    medida.rodo = true;
    // El piloto: hace lo que pide la raya, y parado si pide parar.
    const quiere = vista.velocidadSugerida < 0.05 ? 0 : vista.velocidadSugerida;
    v = v > quiere ? Math.max(quiere, v - 2 * PASO) : Math.min(quiere, v + 1 * PASO);
    if (ruta.length < 2) continue;
    // El coche: por delante, sin pasar de donde se espera, y nunca hacia atrás.
    coche = Math.max(
      coche,
      Math.min(plan.avanceEnLaRuta + ADELANTO_DEL_COCHE, plan.paradaDelSigueme),
    );
    const meta = plan.avanceEnLaRuta + v * PASO;
    let anda = 0;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i]!;
      const b = ruta[i + 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + l >= meta || i === ruta.length - 2) {
        const u = l > 0 ? Math.max(0, Math.min(1, (meta - anda) / l)) : 0;
        x = a[0] + (b[0] - a[0]) * u;
        z = a[1] + (b[1] - a[1]) * u;
        if (l > 0.01) rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
        break;
      }
      anda += l;
    }
  }
  trafico.dispose();
  return medida;
}

/** Si en esa fase se rueda por las calles, que es donde se mide el frente a frente. */
function rodando(fase: string): boolean {
  return fase === "abandonando" || fase === "a-plataforma" || fase === "rodando";
}

describe("la regla: dónde se mete un camino en la calle de otro que va de frente", () => {
  /** Una recta del plano, de `a` a `b`, en puntos cada cuatro metros. */
  const recta = (ax: number, az: number, bx: number, bz: number) =>
    porDelanteDe(
      [
        { x: ax, z: az },
        { x: bx, z: bz },
      ],
      0,
      Infinity,
    );

  it("de frente por la misma calle: se mete a la separación del otro", () => {
    // Yo voy de 0 a 1000 por el eje; el otro viene de 1000 a 400.
    const t = tramoDeFrente(recta(0, 0, 1000, 0), recta(1000, 0, 400, 0), 50);
    expect(t).not.toBeNull();
    expect(t!.dentro).toBe(false);
    // Entra donde queda a menos de cincuenta metros del final del otro.
    expect(t!.entra).toBeGreaterThan(345);
    expect(t!.entra).toBeLessThanOrEqual(352);
  });

  it("y si ya está en esa calle, está dentro", () => {
    const t = tramoDeFrente(recta(500, 0, 1000, 0), recta(1000, 0, 0, 0), 50);
    expect(t).toEqual({ entra: 0, dentro: true });
  });

  it("detrás de otro que va hacia el mismo sitio no es de frente", () => {
    expect(tramoDeFrente(recta(0, 0, 1000, 0), recta(300, 0, 1300, 0), 50)).toBeNull();
  });

  it("un cruce en ángulo recto tampoco: se pasa de uno en uno", () => {
    expect(tramoDeFrente(recta(0, 0, 1000, 0), recta(500, -400, 500, 400), 50)).toBeNull();
  });

  it("ni una calle paralela más lejos que la separación", () => {
    expect(tramoDeFrente(recta(0, 0, 1000, 0), recta(1000, 80, 0, 80), 50)).toBeNull();
  });

  it("y la calle que llega en ángulo cuenta desde que se le acerca, no desde el frente", () => {
    // El otro baja por una calle que se junta con la mía y sigue de frente.
    const otro = porDelanteDe(
      [
        { x: 900, z: 300 },
        { x: 600, z: 0 },
        { x: 0, z: 0 },
      ],
      0,
      Infinity,
    );
    const t = tramoDeFrente(recta(0, 0, 1000, 0), otro, 50);
    expect(t).not.toBeNull();
    // Desde el principio: el otro acaba en mi salida y viene por mi calle.
    expect(t!.dentro).toBe(true);
    // Y visto desde él, se mete en mi calle al acercarse, antes del cruce.
    const suyo = tramoDeFrente(otro, recta(0, 0, 1000, 0), 50);
    expect(suyo!.dentro).toBe(false);
    expect(suyo!.entra).toBeLessThan(Math.hypot(300, 300));
  });
});

describe("de vuelta al puesto en Los Rodeos, con el JAZ 120 y uno que sale", () => {
  const tfn = SCENARIOS.find((e) => e.id === "tenerife-norte")!;
  const por12 = conViento(tfn, { ...TIEMPO_DE_CASA, vientoDe: 110, vientoKt: 15 });
  const jaz120 = AIRCRAFT.find((a) => a.id === "jaz-120")!;

  it("sin la regla sale lo que vio Enrique: de frente, el coche dentro y el otro retirado", () => {
    const m = vueltaConUnoQueSale(por12, jaz120, "EC-AAX", 60, false);
    expect(m.deFrente).toBeGreaterThan(PARADOS_DE_FRENTE);
    expect(m.coche).not.toBe("");
    expect(m.retirados.length).toBeGreaterThan(0);
  });

  it("con la regla, el que sale espera fuera de la R y pasa después", () => {
    const m = vueltaConUnoQueSale(por12, jaz120, "EC-AAX", 60);
    expect(m.deFrente).toBe(0);
    expect(m.coche).toBe("");
    expect(m.retirados).toEqual([]);
    expect(m.contacto).toBe("");
    expect(m.masCerca).toBeGreaterThanOrEqual(m.separacion);
    expect(m.repartos.has("espera")).toBe(true);
    expect(m.llego).toBe(true);
  });

  it("y si ya rodaba por la R cuando se traza tu raya, pasa él y tu raya espera", () => {
    const repartos = new Set<string>();
    const mal: string[] = [];
    for (const anuncio of [10, 15, 20, 25]) {
      const m = vueltaConUnoQueSale(por12, jaz120, "EC-AAX", anuncio);
      for (const r of m.repartos) repartos.add(r);
      if (m.deFrente > PARADOS_DE_FRENTE || m.coche || m.contacto || m.retirados.length || !m.llego)
        mal.push(`anuncio ${anuncio}: ${JSON.stringify({ ...m, repartos: [...m.repartos] })}`);
    }
    expect(mal).toEqual([]);
    expect(repartos.has("pasa")).toBe(true);
  });
});

/*
 * **Y entre ellos, lo mismo.** Cada uno del tráfico miraba solo a quien juega,
 * así que dos de ellos rodaban uno a través de otro: el que llega a su puesto
 * por la R y el que sale por ella hacia la E3, de frente. Aquí, sin nadie
 * jugando, uno aterriza con permiso y rueda a su puesto, y el otro sale a
 * rodar a cada rato: ninguno se mete en el otro, ninguno se retira por
 * atasco, y los dos acaban lo suyo.
 */
describe("y entre los del tráfico, en Los Rodeos", () => {
  const tfn = SCENARIOS.find((e) => e.id === "tenerife-norte")!;

  for (const viento of [110, 290]) {
    it(`por la ${viento === 110 ? 12 : 30}: el que llega y el que sale no se meten uno en otro`, () => {
      const esc = conViento(tfn, { ...TIEMPO_DE_CASA, vientoDe: viento, vientoKt: 15 });
      const aero = esc.aerodrome as Aerodrome;
      const pista = esc.runway;
      const cota = aero.elevationM ?? 0;
      const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
      const mal: string[] = [];
      let cruces = 0;
      for (let sale = 0; sale <= 180; sale += 15) {
        const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
          tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
          tierra: () => (suelo ? { suelo, alto: () => cota } : null),
        });
        // El que llega es un reactor y el que sale un turbohélice: ver `tipoDe`.
        trafico.anuncia("EC-ADX", "otro.final", true);
        let anunciado = false;
        let despega = false;
        let masCerca = Infinity;
        const antes = new Map<string, { x: number; z: number }>();
        const comoIba = new Map<string, { cedido: number; quieto: number; alto: number }>();
        for (let t = 0; t < 600; t += PASO) {
          if (!anunciado && t >= sale && !trafico.todaviaNo("EC-AAX", "otro.rodando")) {
            anunciado = true;
            trafico.anuncia("EC-AAX", "otro.rodando");
          }
          if (
            anunciado &&
            !despega &&
            trafico.dibujado("EC-AAX") &&
            !trafico.todaviaNo("EC-AAX", "torre.clearedTakeoff")
          ) {
            despega = true;
            trafico.anuncia("EC-AAX", "torre.clearedTakeoff");
          }
          trafico.paso(PASO);
          for (const q of trafico.porDentro()) comoIba.set(q.matricula, q);
          const enLasCalles = trafico.quienes().filter((q) => {
            const previo = antes.get(q.matricula);
            antes.set(q.matricula, { x: q.x, z: q.z });
            const mueve = previo ? Math.hypot(q.x - previo.x, q.z - previo.z) : 0;
            return q.y - cota < 5 && !q.enLaPista && mueve / PASO < CORRIENDO;
          });
          const [a, b] = enLasCalles;
          if (a && b) {
            const d = Math.hypot(a.x - b.x, a.z - b.z);
            masCerca = Math.min(masCerca, d);
            const juntos = (TIPOS[a.tipo].envergadura + TIPOS[b.tipo].envergadura) / 2;
            if (d < juntos)
              mal.push(
                `saliendo a los ${sale} s: ${a.matricula} y ${b.matricula} a ${d.toFixed(1)} m, t=${t.toFixed(1)}`,
              );
          }
          for (const [m, como] of comoIba)
            if (!trafico.dibujado(m)) {
              if (
                como.alto < 5 &&
                (como.cedido >= RETIRADO_POR_ATASCO || como.quieto >= RETIRADO_POR_ATASCO)
              )
                mal.push(`saliendo a los ${sale} s: ${m} retirado por atasco a los ${t.toFixed(0)} s`);
              comoIba.delete(m);
            }
        }
        if (masCerca < 300) cruces++;
        trafico.dispose();
      }
      expect(mal.slice(0, 5)).toEqual([]);
      // Y hubo cruces de verdad que mirar, no dos aviones en dos sitios.
      expect(cruces).toBeGreaterThan(0);
    }, 120_000);
  }
});

/*
 * **Y en cada campo, con la pista ya dejada**, que es donde estaba Enrique: el
 * que sale empieza a rodar cuando ya vas por las calles, a varias horas.
 *
 * Contando desde la toma salía además otro caso, que no es este y ya estaba
 * antes: en los campos pequeños con una sola salida —Concepción, Pilar,
 * Mariscal Estigarribia— el que sale llega a su doble raya, que está en la
 * calle por la que tienes que dejar la pista, mientras aterrizas. Ni él entra
 * en la pista, que es tuya, ni tú la dejas, que está él; y a los setenta y
 * cinco segundos tu raya deja de esperarle y pasas a su lado. Eso no se
 * arregla en la calle sino en la torre —no se deja rodar a la doble raya de
 * tu salida a quien no va a despegar antes de que llegues, como ya hace en
 * los de una sola calle con `Momento.calleOcupada`—, y queda por hacer.
 */
describe("y en cada campo con calles, por las dos cabeceras", () => {
  it("hay campos que mirar", () => {
    expect(CAMPOS.length).toBeGreaterThanOrEqual(15);
  });

  for (const esc0 of CAMPOS) {
    it(`${esc0.id}: nadie de frente, nadie dentro, nadie retirado y se llega al puesto`, () => {
      const mal: string[] = [];
      for (const esc of cabeceras(esc0)) {
        const avion = elMasGrande(esc);
        for (const [matricula, anuncio] of [
          ["EC-AAX", 0],
          ["EC-ABX", 10],
          ["EC-ACX", 25],
          ["EC-ADX", 40],
          ["EC-AAX", 60],
          ["EC-ABX", 90],
        ] as const) {
          const m = vueltaConUnoQueSale(
            esc,
            avion,
            matricula,
            anuncio,
            !ENTORNO.OGA_SIN_REGLA,
            "la salida",
          );
          const donde = `${esc0.id} ${Math.round(esc.runway.heading)}° ${avion.id} ${matricula} a ${anuncio} s de dejar la pista`;
          if (ENTORNO.OGA_TRAZA)
            console.log(
              `${donde}: llegó ${m.llego}, más cerca ${m.masCerca.toFixed(1)} / ${m.separacion.toFixed(1)}, de frente ${m.deFrente.toFixed(1)} s, repartos ${[...m.repartos].join(",")}`,
            );
          if (!m.rodo) continue;
          if (m.deFrente > PARADOS_DE_FRENTE)
            mal.push(`${donde}: ${m.deFrente.toFixed(1)} s parados de frente`);
          if (m.contacto) mal.push(`${donde}: ${m.contacto}`);
          if (m.seMetio) mal.push(`${donde}: se te metió ${m.seMetio} veces`);
          if (m.coche) mal.push(`${donde}: el coche ${m.coche}`);
          for (const r of m.retirados) mal.push(`${donde}: retirado por atasco ${r}`);
          if (!m.llego) mal.push(`${donde}: no llegó al puesto`);
        }
      }
      expect(mal).toEqual([]);
    }, 240_000);
  }
});
