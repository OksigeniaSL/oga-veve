/**
 * **El tráfico que rueda no se te echa encima**, en ningún campo.
 *
 * En Guaraní, con el JAZ 120 y desde un teléfono: «aparece un avión que sale
 * del hangar, gira hacia mí y me atraviesa. Esto está mal por dos razones: no
 * puede atravesarme otro avión, es un accidente claramente; y si los aviones
 * deben ir hacia la cabecera X, ¿por qué este rueda a la cabecera
 * contraria?». Y luego, en la doble raya: «viene un avión por detrás y me
 * topa». El tráfico rodaba por su camino sin ver a nadie.
 *
 * Aquí se monta lo mismo que en el juego —la frecuencia, el turno, el dibujo
 * con sus calles y sus tipos, y tu plan de tierra con su raya— y se rueda del
 * puesto a la doble raya siguiendo la raya, como lo haría un piloto que hace
 * caso, y se espera la verde. Lo que se pide es lo de verdad:
 *
 * - ningún avión del tráfico **se te acerca** a menos de la separación de ala
 *   —la de `separacionEnTierra`, la misma con la que tu raya rodea a un
 *   parado—, ni rodando ni esperando en la doble raya;
 * - y todos los que salen lo hacen por la pista en uso, desde una boca que
 *   les deja su pista por delante.
 */
import { describe, expect, it } from "vitest";
import { sinTorre, type Aerodrome } from "./aerodrome";
import { PlanDeVuelo, separacionEnTierra } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import { SCENARIOS, conViento, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";
import { PISTA_POR_DELANTE, sueloDelTrafico } from "./suelo-del-trafico";
import { crearTrafico, tiposDelCampo, type EnTierra } from "./trafico";
import { Frecuencia } from "../flight/radio";
import { TurnoDePista } from "../flight/turno-de-pista";
import { enEjesDePista } from "./rumbo";

const PASO = 0.1;

/** Para mirar un caso de cerca: `OGA_TRAZA=1` y `OGA_TRAZA_CASO="campo rumbo semilla"`. */
const ENTORNO =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process
    ?.env ?? {};

/**
 * Por encima de esto, m/s, el tráfico no rueda: vuela o corre su carrera de
 * despegue o de frenada por la pista. Rodando, lo más que lleva es el doble
 * del paso de calle, que es como sale el que acaba de dejar la carrera.
 */
const CORRIENDO = 15;

const CAMPOS = SCENARIOS.filter((e) => {
  const a = e.aerodrome;
  if (!a || a.privado || !a.taxiways.length) return false;
  return tiposDelCampo(a.id, e.runway.length, sinTorre(a)).length > 0;
});

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
  /** Cuántas veces un avión del tráfico, moviéndose él, se te metió dentro. */
  seMetio: number;
  /** El peor caso, para el mensaje. */
  peor: string;
  /** Lo más cerca que se vio a cualquiera, m, y la separación. */
  masCerca: number;
  separacion: number;
  /** Si se llegó a la doble raya. */
  llego: boolean;
  /** Cuántos del tráfico rodaron por tierra en el rato. */
  rodaron: number;
  /** Los que salieron por una boca sin su pista por delante. */
  sinPista: string[];
}

/**
 * Un vuelo hasta la verde: del puesto a la doble raya por la raya, la espera
 * y la entrada en pista, con la frecuencia y el tráfico vivos.
 */
function rodarHastaLaVerde(
  esc: Scenario,
  avion: AircraftConfig,
  semilla: number,
  /**
   * Cuánto se queda en la doble raya aunque le den la verde, s: es el rato
   * en que le llegan por detrás los que salen después. «Estoy ahora en
   * espera, viene un avión por detrás y me topa.»
   */
  quedarseEnLaRaya: number,
): Medida {
  const aero = esc.aerodrome as Aerodrome;
  const pista = esc.runway;
  const cota = aero.elevationM ?? 0;
  const ancho = aero.runways[0]?.widthM ?? 45;
  const plan = new PlanDeVuelo(aero, pista, () => cota, avion);
  plan.reiniciar();
  const suelo = sueloDelTrafico(aero, pista, ancho);
  const separacion = separacionEnTierra(avion.wingSpan);

  /** Tu avión, en el mundo. */
  let x = 0;
  let z = 0;
  let rumbo = 0;
  let v = 0;
  let fase = "estacionado";

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
    };
  };
  const radio = new Frecuencia(dados(semilla), aero.id);
  const trafico = crearTrafico(pista, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, pista.length, sinTorre(aero)),
    quienJuega: () => ({
      alUmbral: null,
      enLaPista: ["back-taxi", "alineando", "despegando"].includes(fase),
      velocidad: v,
      enTierra: enTierra(),
    }),
    tierra: () => {
      if (!suelo) return null;
      const ruta = plan.rutaVisible();
      const raya = ruta.at(-1);
      return {
        suelo,
        alto: () => cota,
        evitar: [{ x, z }, ...(raya ? [{ x: raya[0], z: raya[1] }] : [])],
        porDondeVas: ruta.map(([a, b]) => ({ x: a, z: b })),
        ocupados: {
          puntos: [
            { x, z },
            ...(raya ? [{ x: raya[0], z: raya[1] }] : []),
            ...ruta.filter((_, i) => i % 4 === 0).map(([a, b]) => ({ x: a, z: b })),
          ],
          radio: separacion,
        },
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
  const turno = new TurnoDePista({
    radio,
    boca: { retirar: () => {}, espera: () => false, esperaAlguna: () => false },
    trafico: () => trafico,
    torre: () => true,
    privado: () => false,
    calleUnica: () => suelo?.unaSolaCalle() ?? false,
    alUmbral: () => Infinity,
    alto: () => 0,
    decirAOtro: () => null,
    autorizarte: () => {},
    mandarteAlAire: () => {},
  });

  const ejes = (px: number, pz: number) =>
    enEjesDePista(px, pz, pista.x, pista.z, pista.heading);
  const estado = () =>
    ({
      position: { x, y: cota, z },
      velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
      heading: rumbo,
      airspeed: v,
      groundSpeed: v,
      verticalSpeed: 0,
      yawRate: 0,
      onGround: true,
      onRunway: (() => {
        const e = ejes(x, z);
        return Math.abs(e.across) < pista.width / 2 && Math.abs(e.along) < pista.length / 2;
      })(),
    }) as never;

  const inicio = plan.rutaVisible();
  if (inicio.length < 2) {
    trafico.dispose();
    return { seMetio: 0, peor: "", masCerca: Infinity, separacion, llego: false, rodaron: 0, sinPista: [] };
  }
  [x, z] = inicio[0]!;
  rumbo = Math.atan2(inicio[1]![0] - x, -(inicio[1]![1] - z));

  const antes = new Map<string, { x: number; z: number }>();
  const enTierraVistos = new Set<string>();
  const sinPista = new Set<string>();
  const alEntrar = new Map<string, { queda: number; tipo: string }>();
  let seMetio = 0;
  let peor = "";
  let masCerca = Infinity;
  let llego = false;
  let enLaRayaDesde: number | null = null;
  const detalle =
    ENTORNO.OGA_TRAZA_CASO === `${esc.id} ${Math.round(esc.runway.heading)} ${semilla}`;
  /*
   * **Y uno que sale y otro que llega, a la vez que tú**, además de los de
   * la frecuencia: con dos aviones en ella, en diez minutos de rodaje puede
   * no cruzarse nadie, y lo que se mira es justo cruzarse. Les da sus órdenes
   * esto, como la torre: el que sale despega en cuanto está en su doble raya
   * con la pista libre; el que llega aterriza con permiso y rueda a su puesto.
   */
  const azar = dados(semilla * 7919);
  const sale = { m: "EC-SAL", cuando: 5 + azar() * 60, rodando: false, despega: false };
  const llega = { m: "EC-LLE", cuando: 20 + azar() * 120, puesto: false };
  let t = 0;
  for (; t < 900; t += PASO) {
    if (!sale.rodando && t >= sale.cuando) {
      sale.rodando = true;
      trafico.anuncia(sale.m, "otro.rodando");
    }
    if (
      sale.rodando &&
      !sale.despega &&
      !["autorizado", "alineando", "back-taxi"].includes(fase) &&
      !trafico.todaviaNo(sale.m, "torre.clearedTakeoff")
    ) {
      sale.despega = true;
      trafico.anuncia(sale.m, "torre.clearedTakeoff");
    }
    /*
     * Con permiso como lo daría la torre: no con la pista ya tuya, ni con la
     * única calle ocupada por ti camino de la pista —ver `USAN_LA_CALLE` en
     * `flight/turno-de-pista.ts`—. Sin permiso vuela su circuito y se va al
     * aire en la decisión, que es lo que hace el de la frecuencia.
     */
    if (!llega.puesto && t >= llega.cuando && !trafico.todaviaNo(llega.m, "otro.final")) {
      llega.puesto = true;
      const tuya = ["autorizado", "alineando", "back-taxi"].includes(fase);
      const tuCalle =
        (suelo?.unaSolaCalle() ?? false) &&
        ["arrancando", "rodando", "esperando"].includes(fase);
      trafico.anuncia(llega.m, "otro.final", !tuya && !tuCalle);
    }
    // Y mientras aterriza con permiso, la pista es suya: tu luz, en rojo.
    const aterrizaElOtro =
      llega.puesto &&
      trafico.quienes().some((q) => q.matricula === llega.m && q.conPermiso) &&
      trafico.todaviaNo(llega.m, "otro.pistaLibre");
    plan.pistaDeOtros = turno.pistaDeOtros || aterrizaElOtro;
    const vista = plan.paso(estado(), 0, true, PASO);
    fase = vista.fase;
    if (fase === "esperando") llego = true;
    // La radio y el dibujo con tu avión donde está ahora, como en el juego.
    const yoX = x;
    const yoZ = z;
    turno.oir(PASO, { fase, deDia: true, instructorHablando: false });
    for (const q of trafico.quienes()) {
      if (q.y - cota > 5) {
        antes.delete(q.matricula);
        continue;
      }
      const d = Math.hypot(q.x - yoX, q.z - yoZ);
      const previo = antes.get(q.matricula);
      if (previo && Math.hypot(q.x - previo.x, q.z - previo.z) > 0.2) enTierraVistos.add(q.matricula);
      /*
       * Se te metió **él** si moviéndose acabó dentro de tu separación y más
       * cerca de ti de lo que estaba. Si el que se acercó fuiste tú, esto no
       * lo cuenta: es otra pregunta, y la de abajo la mira aparte.
       *
       * **Y rodando, no corriendo por la pista**: el que aterriza o despega
       * pasa por delante de tu doble raya a lo que esté pintada, y eso no es
       * echarse encima de nadie. Ver `porLasCalles` en `trafico.ts`.
       */
      const corriendo =
        !!previo && Math.hypot(q.x - previo.x, q.z - previo.z) / PASO > CORRIENDO;
      if (
        previo &&
        !corriendo &&
        d < separacion - 0.5 &&
        d < Math.hypot(previo.x - yoX, previo.z - yoZ) - 0.05
      ) {
        seMetio++;
        if (!peor)
          peor = `${q.matricula} (${q.tipo}) a ${d.toFixed(1)} m de ti en «${fase}», t=${t.toFixed(1)} s`;
      }
      if (fase !== "estacionado" && !q.enLaPista) masCerca = Math.min(masCerca, d);
      if (detalle && d < separacion + 25)
        console.log(
          `t=${t.toFixed(1)} ${fase} yo=(${yoX.toFixed(1)},${yoZ.toFixed(1)}) v=${v.toFixed(1)} · ${q.matricula} ${q.tipo} (${q.x.toFixed(1)},${q.z.toFixed(1)}) d=${d.toFixed(1)} pista=${q.enLaPista} llega=${q.llegando} antes=${previo ? Math.hypot(previo.x - yoX, previo.z - yoZ).toFixed(1) : "-"}`,
        );
      antes.set(q.matricula, { x: q.x, z: q.z });
      /*
       * Y el que sale, por una boca con su pista por delante: lo que le queda
       * desde donde se alinea. Se mira al verle alineado en la pista.
       */
      if (q.enLaPista && !q.llegando) {
        const e = ejes(q.x, q.z);
        const queda = pista.length / 2 - e.along;
        const antes = alEntrar.get(q.matricula);
        // Lo que le quedaba al entrar es lo más que le queda en toda la carrera.
        if (!antes || queda > antes.queda) alEntrar.set(q.matricula, { queda, tipo: q.tipo });
      }
    }
    // Hasta haber entrado en la pista: de ahí en adelante es otra pregunta.
    if (fase === "alineando" || fase === "back-taxi" || fase === "despegando") break;
    if ((fase === "esperando" || fase === "autorizado") && enLaRayaDesde === null)
      enLaRayaDesde = t;
    const enLaRaya = enLaRayaDesde !== null && t - enLaRayaDesde < quedarseEnLaRaya;
    // El piloto: hace lo que pide la raya, y parado si pide parar.
    const quiere =
      vista.velocidadSugerida < 0.05 || enLaRaya ? 0 : vista.velocidadSugerida;
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
  trafico.dispose();
  const tipos = tiposDelCampo(aero.id, pista.length, sinTorre(aero));
  for (const [m, { queda, tipo: id }] of alEntrar) {
    const tipo = tipos.find((k) => k.id === id);
    // La boca de la cabecera vale siempre: no hay otra con más pista.
    if (tipo && queda < Math.min(tipo.carrera * PISTA_POR_DELANTE, pista.length - 200))
      sinPista.add(`${m} (${id}) con ${Math.round(queda)} m`);
  }
  return {
    seMetio,
    peor,
    masCerca,
    separacion,
    llego,
    rodaron: enTierraVistos.size,
    sinPista: [...sinPista],
  };
}

describe("el tráfico que rueda no se te echa encima", () => {
  it("hay campos que mirar", () => {
    expect(CAMPOS.length).toBeGreaterThanOrEqual(15);
  });

  for (const esc0 of CAMPOS) {
    it(`${esc0.id}: ni detrás de ti, ni en un cruce, ni en la doble raya`, () => {
      const mal: string[] = [];
      let rodaron = 0;
      for (const esc of cabeceras(esc0)) {
        const avion = elMasGrande(esc);
        for (let semilla = 1; semilla <= 3; semilla++) {
          const m = rodarHastaLaVerde(
            esc,
            avion,
            semilla * 31 + Math.round(esc.runway.heading),
            semilla === 1 ? 0 : 150,
          );
          rodaron += m.rodaron;
          const donde = `${esc0.id} ${Math.round(esc.runway.heading)}° ${avion.id} semilla ${semilla}`;
          if (ENTORNO.OGA_TRAZA)
            console.log(
              `${donde}: llegó ${m.llego}, rodaron ${m.rodaron}, más cerca ${m.masCerca.toFixed(1)} / ${m.separacion.toFixed(1)}, se metió ${m.seMetio} ${m.peor}`,
            );
          if (m.seMetio > 0) mal.push(`${donde}: ${m.peor}`);
          for (const s of m.sinPista) mal.push(`${donde}: salió ${s} por delante`);
        }
      }
      expect(mal).toEqual([]);
      void rodaron;
    }, 120_000);
  }
});
