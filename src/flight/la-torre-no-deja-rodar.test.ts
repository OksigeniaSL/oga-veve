/**
 * **En un campo de una sola salida, la torre no deja rodar a quien sale
 * mientras aterrizas.**
 *
 * En Concepción, Pilar y Mariscal Estigarribia la doble raya del que sale
 * está en la calle por la que dejas la pista. El que sale podía llegar a ella
 * mientras aterrizabas: ni entraba en la pista, que era tuya, ni tú la dejabas,
 * que estaba él; y a los setenta y cinco segundos tu raya dejaba de esperarle
 * y pasabas a su lado. Lo de verdad es que la torre no le deja rodar hasta
 * que has pasado —«hold position»—, o le da la pista antes si le da tiempo a
 * irse. Ver `quienDejaLaPistaPorSuRaya` en `world/trafico.ts` y `retenidos`
 * en `flight/turno-de-pista.ts`.
 *
 * Aquí se monta lo que monta el juego —la frecuencia, el turno, el dibujo con
 * sus calles y tus aterrizajes con tu plan de tierra— y a uno de la
 * frecuencia se le saca a rodar a varias distancias de tu toma. Lo que se
 * pide:
 *
 * - **sin la regla sale el fallo**, o esta prueba no vería nada;
 * - con ella, al dejar la pista y rodar a tu puesto no pasas al lado de nadie
 *   parado en tu calle, y llegas;
 * - el que sale sale, sin que la frecuencia se quede colgada esperándoos a los
 *   dos, y nadie queda retenido más de `RETENCION_MAXIMA`.
 */
import { describe, expect, it } from "vitest";
import { Frecuencia } from "./radio";
import { PISTA_TUYA } from "./radio";
import { TurnoDePista, RETENCION_MAXIMA, type DibujoDelTurno } from "./turno-de-pista";
import { AIRCRAFT, type AircraftConfig } from "./aircraft";
import { cabeEn, campoDe } from "./cabe";
import { distanciaDeAterrizaje } from "./carrera";
import { sinTorre, type Aerodrome } from "../world/aerodrome";
import { PlanDeVuelo, separacionEnTierra } from "../world/plan-de-vuelo";
import { SCENARIOS, conViento, type Scenario } from "../world/scenarios";
import { TIEMPO_DE_CASA } from "../world/meteo";
import { sueloDelTrafico, PASA_A_TU_LADO } from "../world/suelo-del-trafico";
import { crearTrafico, tiposDelCampo, TIPOS, TU, type EnTierra } from "../world/trafico";
import { enEjesDePista } from "../world/rumbo";
import { porDelanteDe } from "../world/tramo-de-frente";

const PASO = 0.2;

/** Velocidad de aproximación del banco, m/s, y la pendiente de la senda. */
const SENDA = Math.tan((3 * Math.PI) / 180);

/** Lo que tarda la torre en ser «final» para la frecuencia, s al umbral. */
const FINAL_DE_LA_TORRE = 90;

/** Desde cuántos segundos antes del umbral te ve la torre en la secuencia. */
const FINAL_DEL_PLAN = 180;

/** Lo que tiene que estar parado uno del tráfico para contarlo como parado, s. */
const PARADO = 3;

function dados(semilla: number): () => number {
  let x = semilla >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

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

interface Medida {
  /** El peor paso al lado de uno parado en tu calle, rodando a tu puesto. */
  alLado: string;
  /** Si llegaste a tu puesto. */
  llego: boolean;
  /** Si el que se sacó a rodar llegó a despegar. */
  despego: boolean;
  /** Si llegó a rodar. */
  rodo: boolean;
  /** La retención más larga, s. */
  retenido: number;
}

/**
 * Un aterrizaje con su vuelta al puesto, y uno de la frecuencia que sale a
 * rodar `antes` segundos antes de tu toma —negativo, después—.
 */
function aterrizarConUnoQueSale(
  esc: Scenario,
  avion: AircraftConfig,
  antes: number,
  semilla: number,
  conLaRegla = true,
): Medida {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const ancho = aero.runways[0]?.widthM ?? 45;
  const plan = new PlanDeVuelo(aero, pista, () => cota, avion);
  plan.reiniciar();
  const suelo = sueloDelTrafico(aero, pista, ancho);
  const separacion = separacionEnTierra(avion.wingSpan);
  const h = (pista.heading * Math.PI) / 180;
  const eje = (al: number) => ({
    x: pista.x + Math.sin(h) * al,
    z: pista.z - Math.cos(h) * al,
  });
  const umbral = -pista.length / 2 + (pista.desplazado ?? 0);
  const vAprox = avion.approachSpeed;

  let x = 0;
  let z = 0;
  let rumbo = h;
  let v = vAprox;
  let alto = 300;
  let fase = "en-vuelo";
  let alUmbral: number | null = null;

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
      esperandoLaPista: false,
      ruta: plan.rutaReservada(),
    };
  };
  const volviendo = () => ["aterrizado", "abandonando", "a-plataforma"].includes(fase);
  /** Aparcado y apagado: el vuelo se acabó y quien juega ya no está. */
  let fuera = false;
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
    quienJuega: () =>
      fuera
        ? null
        : {
      alUmbral: alto > 1 ? alUmbral : null,
      enLaPista: alto < 1 && ["aterrizado", "abandonando"].includes(fase),
      velocidad: Math.max(15, v),
      enTierra: alto < 1 ? enTierra() : null,
      saleDeLaPista:
        (alto > 1 && alUmbral !== null) || (alto < 1 && volviendo())
          ? {
              porDonde: alto < 1 ? plan.rutaReservada() : [],
              frenaEn: distanciaDeAterrizaje(avion),
            }
          : null,
          },
    tierra: () => {
      if (!suelo) return null;
      if (fuera) return { suelo, alto: () => cota };
      const ruta = plan.rutaVisible();
      const raya = ruta.at(-1);
      return {
        suelo,
        alto: () => cota,
        evitar: [{ x, z }, ...(raya ? [{ x: raya[0], z: raya[1] }] : [])],
        porDondeVas: porDelanteDe(
          ruta.map(([a, b]) => ({ x: a, z: b })),
          0,
          Infinity,
          10,
        ),
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
  plan.tramosDeOtros = () => trafico.tramosQueTienen();
  /*
   * Sin la regla, el dibujo de antes: sin las tres preguntas que la torre
   * le hace para no dejar rodar a nadie hacia tu salida.
   */
  const dibujo: DibujoDelTurno = conLaRegla
    ? trafico
    : {
        anuncia: (m, c, p) => trafico.anuncia(m, c, p),
        paso: (dt, al) => trafico.paso(dt, al),
        todaviaNo: (m, c) => trafico.todaviaNo(m, c),
        enFinal: (m) => trafico.enFinal(m),
        ocupanLaPista: () => trafico.ocupanLaPista(),
        dibujado: (m) => trafico.dibujado(m),
        esperanPorTi: () => trafico.esperanPorTi(),
        delanteEnLaSalida: () => trafico.delanteEnLaSalida(),
        ultimaSalida: () => trafico.ultimaSalida(),
      };
  const radio = new Frecuencia(dados(semilla), aero.id);
  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => dibujo,
    torre: () => true,
    privado: () => false,
    calleUnica: () => suelo?.unaSolaCalle() ?? false,
    alUmbral: () => (alto > 1 ? (alUmbral ?? Infinity) * vAprox : 0),
    alto: () => alto,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });

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

  const medida: Medida = { alLado: "", llego: false, despego: false, rodo: false, retenido: 0 };
  let sale: string | null = null;
  let faseAntes = "";
  const quietoDesde = new Map<string, { x: number; z: number; t: number }>();
  let al = 0;
  let frenando = true;
  let enPuestoDesde: number | null = null;
  const inicio = -Math.max(antes + 60, FINAL_DEL_PLAN + 30);
  for (let t = inicio; t < 1200; t += PASO) {
    if (sale === null && t >= -antes) sale = radio.sacarARodar();
    if (t < 0) {
      // Volando la final por la senda, a la velocidad de aproximación.
      const d = vAprox * -t;
      const p = eje(umbral - d);
      x = p.x;
      z = p.z;
      alto = Math.max(2, d * SENDA);
      alUmbral = -t <= FINAL_DEL_PLAN ? -t : null;
    } else if (frenando) {
      // La carrera, por el eje, hasta que el plan dice que se deja la pista.
      alUmbral = null;
      if (alto > 0) {
        alto = 0;
        v = vAprox;
      }
      const q = eje(umbral + Math.min(300, pista.length * 0.15) + al);
      x = q.x;
      z = q.z;
      rumbo = h;
      al += v * PASO;
      v = Math.max(6, v - 2.5 * PASO);
      if (fase === "abandonando" || v <= 6) frenando = false;
    }
    if (fuera) {
      /*
       * Y con el vuelo acabado, la frecuencia sigue: el que sale tiene que
       * salir, no quedarse esperándote.
       */
      turno.oir(PASO, { fase: "apagado", deDia: true, instructorHablando: false });
      if (sale && trafico.dibujado(sale)) medida.rodo = true;
      if (sale && trafico.quienes().some((q) => q.matricula === sale && q.y - cota > 20))
        medida.despego = true;
      // Y remontando en un campo sin calle a la cabecera hay para rato.
      if (medida.despego || t - (enPuestoDesde ?? t) > 600) break;
      continue;
    }
    const vista = plan.paso(estado(), alto, true, PASO);
    // La fase de la torre: la final empieza a millas, no a trescientos metros.
    fase =
      alto > 1
        ? alUmbral !== null && alUmbral <= FINAL_DE_LA_TORRE
          ? "final"
          : "en-vuelo"
        : vista.fase;
    if (PISTA_TUYA.has(fase) && !PISTA_TUYA.has(faseAntes)) turno.alSerTuya(fase);
    faseAntes = fase;
    turno.paso(fase);
    turno.oir(PASO, { fase, deDia: true, instructorHablando: false });
    if (sale && trafico.dibujado(sale)) medida.rodo = true;
    if (sale && trafico.quienes().some((q) => q.matricula === sale && q.y - cota > 20))
      medida.despego = true;
    if (vista.fase === "en-puesto" || vista.fase === "apagado") {
      medida.llego = true;
      enPuestoDesde ??= t;
      fuera = true;
      continue;
    }
    // Lo parado de los del tráfico en el suelo, y si pasas a su lado.
    for (const q of trafico.quienes()) {
      if (q.y - cota > 5 || q.enLaPista) {
        quietoDesde.delete(q.matricula);
        continue;
      }
      const antesQ = quietoDesde.get(q.matricula);
      if (!antesQ || Math.hypot(q.x - antesQ.x, q.z - antesQ.z) > 0.3)
        quietoDesde.set(q.matricula, { x: q.x, z: q.z, t });
      const quieto = t - (quietoDesde.get(q.matricula)?.t ?? t);
      const d = Math.hypot(q.x - x, q.z - z);
      const junto = separacionEnTierra(avion.wingSpan) / 2 + TIPOS[q.tipo].envergadura / 2;
      if (
        alto < 1 &&
        volviendo() &&
        v > 0.5 &&
        quieto > PARADO &&
        d < Math.max(junto + 7.5, PASA_A_TU_LADO * 0.6) &&
        !medida.alLado
      )
        medida.alLado = `${q.matricula} (${q.tipo}) parado ${quieto.toFixed(0)} s a ${d.toFixed(1)} m de ti en «${fase}», t=${t.toFixed(0)} s`;
    }
    if (frenando || t < 0) continue;
    // El piloto: hace lo que pide la raya, y parado si pide parar.
    const quiere = vista.velocidadSugerida < 0.05 ? 0 : vista.velocidadSugerida;
    v = v > quiere ? Math.max(quiere, v - 2 * PASO) : Math.min(quiere, v + 1 * PASO);
    const ruta = plan.rutaVisible();
    if (ruta.length < 2) continue;
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
  medida.retenido = turno.retencionMasLarga;
  trafico.dispose();
  return medida;
}

const DE_UNA_SALIDA = ["concepcion", "pilar", "estigarribia"];

describe("el dibujo sabe por dónde dejas la pista", () => {
  for (const id of DE_UNA_SALIDA)
    it(`${id}: la doble raya del que sale está en tu salida, y la torre lo ve`, () => {
      const esc = conViento(SCENARIOS.find((e) => e.id === id)!, {
        ...TIEMPO_DE_CASA,
        vientoDe: 0,
        vientoKt: 15,
      });
      const aero = esc.aerodrome as Aerodrome;
      const suelo = sueloDelTrafico(aero, esc.runway, aero.runways[0]?.widthM ?? 45);
      const avion = elMasGrande(esc);
      let alUmbral: number | null = 60;
      const trafico = crearTrafico(esc.runway, aero.elevationM ?? 0, "ala-alta", "izquierda", 1, undefined, {
        tipos: tiposDelCampo(aero.id, esc.runway.length, sinTorre(aero)),
        quienJuega: () => ({
          alUmbral,
          enLaPista: false,
          saleDeLaPista:
            alUmbral === null ? null : { porDonde: [], frenaEn: distanciaDeAterrizaje(avion) },
        }),
        tierra: () => (suelo ? { suelo, alto: () => aero.elevationM ?? 0 } : null),
      });
      const radio = new Frecuencia(dados(3), aero.id);
      const quien = radio.sacarARodar()!;
      // A un minuto del umbral no le da tiempo a irse: no rueda.
      expect(trafico.quienDejaLaPistaPorSuRaya(quien)).toBe(TU);
      // A media hora, sí: se habrá ido mucho antes de que llegues.
      alUmbral = 1800;
      expect(trafico.quienDejaLaPistaPorSuRaya(quien)).toBeNull();
      // Y sin nadie que aterrice, rueda.
      alUmbral = null;
      expect(trafico.quienDejaLaPistaPorSuRaya(quien)).toBeNull();
      trafico.dispose();
    });
});

describe("y la torre no le deja rodar hasta que pasas", () => {
  const esc0 = SCENARIOS.find((e) => e.id === "pilar")!;

  it("sin la regla sale el fallo: alguien parado en tu calle y pasas a su lado", () => {
    const mal: string[] = [];
    for (const esc of cabeceras(esc0))
      for (const antes of [150, 120, 100, 60, -20])
        for (const semilla of [1, 2]) {
          const m = aterrizarConUnoQueSale(esc, elMasGrande(esc), antes, semilla, false);
          if (m.alLado) mal.push(m.alLado);
        }
    expect(mal.length).toBeGreaterThan(0);
  }, 240_000);

  for (const id of DE_UNA_SALIDA)
    it(`${id}: nadie parado en tu calle, llegas a tu puesto, y el que sale sale`, () => {
      const mal: string[] = [];
      let retenido = 0;
      let rodaron = 0;
      for (const esc of cabeceras(SCENARIOS.find((e) => e.id === id)!))
        for (const antes of [150, 120, 100, 60, -20])
          for (const semilla of [1, 2]) {
            const avion = elMasGrande(esc);
            const m = aterrizarConUnoQueSale(esc, avion, antes, semilla);
            const donde = `${id} ${Math.round(esc.runway.heading)}° ${avion.id}, sale ${antes} s antes de tu toma, semilla ${semilla}`;
            retenido = Math.max(retenido, m.retenido);
            if (m.alLado) mal.push(`${donde}: ${m.alLado}`);
            if (!m.llego) mal.push(`${donde}: no llegaste al puesto`);
            if (m.rodo) rodaron++;
            if (!m.despego) mal.push(`${donde}: el que salía no llegó a despegar`);
          }
      expect(mal).toEqual([]);
      // Y salió alguien de verdad, retenido lo más lo que aguanta la red.
      expect(rodaron).toBeGreaterThan(0);
      expect(retenido).toBeLessThanOrEqual(RETENCION_MAXIMA + PASO);
    }, 240_000);
});

/*
 * **Y entre dos del tráfico, lo mismo**: uno aterriza con permiso y otro va a
 * salir. La torre no le deja rodar mientras el que aterriza tenga que pasar
 * por donde él va a rodar —ver `quienDejaLaPistaPorSuRaya`—, y aquí se le
 * dan las órdenes como se las daría ella: rueda cuando no le retienen, y
 * despega cuando la pista es suya.
 */
describe("y entre dos del tráfico", () => {
  /** Un aterrizaje del tráfico con otro que va a salir a los `sale` segundos. */
  function dosDelTrafico(esc: Scenario, sale: number, conLaRegla: boolean) {
    const aero = esc.aerodrome as Aerodrome;
    const pista = esc.runway;
    const cota = aero.elevationM ?? 0;
    const suelo = sueloDelTrafico(aero, pista, aero.runways[0]?.widthM ?? 45);
    const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
      tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
      tierra: () => (suelo ? { suelo, alto: () => cota } : null),
    });
    const llega = "ZP-LLE";
    const vaASalir = "ZP-SAL";
    trafico.anuncia(llega, "otro.final", true);
    let rodando = false;
    let despega = false;
    let alLado = "";
    let fuera = false;
    const quietoDesde = new Map<string, { x: number; z: number; t: number }>();
    for (let t = 0; t < 900; t += PASO) {
      const retenido = conLaRegla && trafico.quienDejaLaPistaPorSuRaya(vaASalir) !== null;
      if (!rodando && t >= sale && !retenido && !trafico.todaviaNo(vaASalir, "otro.rodando")) {
        rodando = true;
        trafico.anuncia(vaASalir, "otro.rodando");
      }
      if (
        rodando &&
        !despega &&
        trafico.dibujado(vaASalir) &&
        !trafico.todaviaNo(vaASalir, "torre.clearedTakeoff")
      ) {
        despega = true;
        trafico.anuncia(vaASalir, "torre.clearedTakeoff");
      }
      trafico.paso(PASO);
      const elQueLlega = trafico.quienes().find((q) => q.matricula === llega);
      const suyo = trafico.porDentro().find((p) => p.matricula === llega);
      for (const q of trafico.quienes()) {
        if (q.matricula === llega || q.y - cota > 5) continue;
        const antes = quietoDesde.get(q.matricula);
        if (!antes || Math.hypot(q.x - antes.x, q.z - antes.z) > 0.3)
          quietoDesde.set(q.matricula, { x: q.x, z: q.z, t });
        const quieto = t - (quietoDesde.get(q.matricula)?.t ?? t);
        // El que llega, ya fuera de la pista, al lado del que espera parado.
        if (
          elQueLlega &&
          suyo?.camino === "llegada" &&
          suyo.fuera !== null &&
          suyo.recorrido > suyo.fuera &&
          quieto > PARADO &&
          !alLado
        ) {
          const d = Math.hypot(q.x - elQueLlega.x, q.z - elQueLlega.z);
          if (d < PASA_A_TU_LADO * 0.6)
            alLado = `${llega} pasa a ${d.toFixed(1)} m de ${q.matricula}, parado ${quieto.toFixed(0)} s, t=${t.toFixed(0)}`;
        }
      }
      if (despega && trafico.quienes().some((q) => q.matricula === vaASalir && q.y - cota > 20)) {
        fuera = true;
        break;
      }
    }
    trafico.dispose();
    return { alLado, fuera };
  }

  it("sin la regla, el que llega pasa al lado del que espera en su doble raya", () => {
    const mal: string[] = [];
    for (const id of DE_UNA_SALIDA)
      for (const esc of cabeceras(SCENARIOS.find((e) => e.id === id)!))
        for (let sale = 0; sale <= 120; sale += 20) {
          const m = dosDelTrafico(esc, sale, false);
          if (m.alLado) mal.push(m.alLado);
        }
    expect(mal.length).toBeGreaterThan(0);
  }, 240_000);

  for (const id of DE_UNA_SALIDA)
    it(`${id}: el que sale espera en su puesto, el que llega pasa, y el que sale sale`, () => {
      const mal: string[] = [];
      for (const esc of cabeceras(SCENARIOS.find((e) => e.id === id)!))
        for (let sale = 0; sale <= 120; sale += 20) {
          const m = dosDelTrafico(esc, sale, true);
          const donde = `${id} ${Math.round(esc.runway.heading)}°, sale a los ${sale} s`;
          if (m.alLado) mal.push(`${donde}: ${m.alLado}`);
          if (!m.fuera) mal.push(`${donde}: el que salía no llegó a despegar`);
        }
      expect(mal).toEqual([]);
    }, 240_000);
});
