/**
 * **Salir de la pista girando como gira una persona: tarde y abierto.**
 *
 * `salir-a-la-primera.test.ts` aterriza con un piloto perfecto: va encima de
 * la raya, con el rumbo exacto de cada tramo y a la velocidad que ella pide.
 * Así no se pasa nunca de la boca ni la toma por fuera, y por eso no pilló lo
 * que vio Enrique en Pettirossi y en Gran Canaria con el JAZ 120 —«te pasaste»
 * y la raya rehecha **antes de llegar a la salida**, o al filo de su boca,
 * mientras giraba hacia ella— ni lo de Fuerteventura con el JAZ 90, pegado a
 * la raya verde sin poder salir.
 *
 * Aquí el avión lo lleva alguien que mira la raya y reacciona con su retraso:
 * llega un poco más deprisa de lo que ella pide, empieza a girar tarde y la
 * curva le sale abierta, con el radio que dejan su rueda de morro y su
 * velocidad. Lo que se pide es lo de verdad:
 *
 * - sale de la pista por la salida que tenía;
 * - y sin ningún «te pasaste»: eso solo cuando la pasada es evidente, nunca
 *   mientras se gira hacia ella. Ver `seHaPasadoLaSalida` en
 *   `plan-de-vuelo.ts`.
 */
import { describe, expect, it } from "vitest";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { radioDeGiro } from "../flight/cabe";
import { DE_LADO_RODANDO } from "../flight/fdm";
import { enEjesDePista } from "./rumbo";
import { SCENARIOS, conViento, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

const CAMPOS = ["pettirossi", "gran-canaria", "fuerteventura"];
const AVIONES = ["jaz-90", "jaz-120"];

/** Lo que frena una persona en la carrera, m/s². */
const FRENADA = 2;
/** Lo que mira por delante para apuntar, s de camino. */
const MIRA = 1;

/**
 * **Dos maneras de girar tarde**: la de quien va atento, y la de quien llega
 * con más prisa y reacciona más tarde, con el volante más brusco. La segunda
 * a veces se la pasa de verdad, y entonces «te pasaste» es lo que toca; lo que
 * no puede pasar es que se lo digan saliendo por ella.
 */
const ESTILOS = [
  { nombre: "atento", reaccion: 0.6, prisa: 1.2, volante: 1 },
  { nombre: "con prisa", reaccion: 0.9, prisa: 1.3, volante: 1.3 },
] as const;
type Estilo = (typeof ESTILOS)[number];

const PASO = 0.05;

/**
 * A cuánto de la boca elegida, a lo largo de la pista, se cuenta que salió por
 * ella, m: lo que se abre una curva de un reactor tomada tarde.
 */
const SALIO_POR_ELLA = 120;

/** Cuánto se aparta del eje la raya donde empieza a girar hacia su salida, m. */
const SE_APARTA = 3;

/** Para mirar un caso de cerca: `OGA_TRAZA_CASO="campo rumbo avion"`. */
const ENTORNO =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process
    ?.env ?? {};

/** Las cabeceras en uso posibles, por el viento. */
function cabeceras(esc0: Scenario): Scenario[] {
  const por = new Map<number, Scenario>();
  for (let v = 0; v < 360; v += 30) {
    const e = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe: v, vientoKt: 15 });
    por.set(Math.round(e.runway.heading), e);
  }
  return [...por.values()];
}

interface Salida {
  pasadas: number;
  fuera: boolean;
  dejoEn: number | null;
  elegida: number | null;
  /**
   * Cada «te pasaste», dicho dónde: cuántos metros llevaba pasado del sitio
   * en que su raya se apartaba del eje para irse por la salida —negativo, que
   * todavía no había llegado—, y si el morro ya miraba hacia ese lado.
   */
  dichos: { pasado: number; girando: boolean }[];
}

function aterrizarComoUnaPersona(
  esc: Scenario,
  avion: AircraftConfig,
  estilo: Estilo,
): Salida {
  const pista = esc.runway;
  const plan = new PlanDeVuelo(esc.aerodrome!, pista, () => 0, avion);
  plan.reiniciar();
  const h = (pista.heading * Math.PI) / 180;
  const ejes = (x: number, z: number) => enEjesDePista(x, z, pista.x, pista.z, pista.heading);
  let rumbo = h;
  let v = avion.approachSpeed * 0.95;
  const estado = (x: number, z: number, alto: number) =>
    ({
      position: { x, y: alto, z },
      velocity: { x: Math.sin(rumbo) * v, y: 0, z: -Math.cos(rumbo) * v },
      heading: rumbo,
      airspeed: v,
      groundSpeed: v,
      verticalSpeed: 0,
      yawRate: 0,
      onGround: alto < 1,
      onRunway: alto < 1 && Math.abs(ejes(x, z).across) < pista.width / 2,
    }) as never;
  const umbral = -pista.length / 2;
  const enElEje = (along: number) => ({
    x: pista.x + Math.sin(h) * along,
    z: pista.z - Math.cos(h) * along,
  });
  const lejos = enElEje(umbral - 9000);
  for (let t = 0; t < 25; t += 0.05) plan.paso(estado(lejos.x, lejos.z, 400), 400, true, 0.05);
  let p = enElEje(umbral + 300);
  for (let t = 0; t < 0.5; t += PASO) plan.paso(estado(p.x, p.z, 0), 0, true, PASO);

  /** Lo que vio hace `REACCION` segundos: a eso reacciona ahora. */
  const vistos: { quiere: number; apunta: number }[] = [];
  let elegida: number | null = null;
  let fuera = false;
  let dejoEn: number | null = null;
  const minimo = radioDeGiro(avion);
  const detalle =
    ENTORNO.OGA_TRAZA_CASO ===
    `${esc.id} ${Math.round(pista.heading)} ${avion.id} ${estilo.nombre}`;
  let pasadasAntes = 0;
  /** Por dónde se iba de la pista la raya en el paso anterior, y hacia qué lado. */
  let laDeAntes: { along: number; lado: number } | null = null;
  let dichas = 0;
  const dichos: Salida["dichos"] = [];
  for (let t = 0; t < 400; t += PASO) {
    const vista = plan.paso(estado(p.x, p.z, 0), 0, true, PASO);
    if (plan.salidasPasadas > dichas) {
      dichas = plan.salidasPasadas;
      if (laDeAntes) {
        const e = ejes(p.x, p.z);
        dichos.push({
          pasado: e.along - laDeAntes.along,
          girando: Math.sin(rumbo - h) * laDeAntes.lado > Math.sin((5 * Math.PI) / 180),
        });
      }
    }
    if (detalle && (plan.salidasPasadas !== pasadasAntes || Math.round(t / PASO) % 20 === 0)) {
      const e = ejes(p.x, p.z);
      console.log(
        `t=${t.toFixed(1)} along=${(e.along - umbral).toFixed(0)} across=${e.across.toFixed(1)} v=${v.toFixed(1)} rumbo-pista=${(((rumbo - h) * 180) / Math.PI).toFixed(0)}° pasadas=${plan.salidasPasadas} fase=${vista.fase} sug=${vista.velocidadSugerida.toFixed(1)}`,
      );
      pasadasAntes = plan.salidasPasadas;
    }
    const ruta = plan.rutaVisible();
    if (ruta.length < 2) break;
    /*
     * Por dónde se aparta la raya del eje para irse por su salida: ahí empieza
     * a girar quien la sigue, y antes de ahí nadie se la ha pasado.
     */
    laDeAntes = null;
    for (const q of ruta) {
      const e = ejes(q[0], q[1]);
      if (e.along - umbral > 300 && Math.abs(e.across) > SE_APARTA) {
        laDeAntes = { along: e.along, lado: Math.sign(e.across) };
        break;
      }
    }
    if (elegida === null) {
      for (const q of ruta) {
        const e = ejes(q[0], q[1]);
        if (Math.abs(e.across) > pista.width / 2 + 10) break;
        elegida = e.along - umbral;
      }
    }
    const e = ejes(p.x, p.z);
    if (Math.abs(e.across) > pista.width / 2 + 10) {
      fuera = true;
      dejoEn = e.along - umbral;
      break;
    }
    /*
     * Apunta a un punto de la raya un poco por delante de lo recorrido —la
     * mirada de una persona, no la de un piloto automático— y gira hacia él
     * con lo que dé la rueda de morro a esa velocidad.
     */
    const meta = plan.avanceEnLaRuta + Math.max(8, v * MIRA);
    let objetivo = ruta[ruta.length - 1]!;
    let anda = 0;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i]!;
      const b = ruta[i + 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + l >= meta) {
        const u = l > 0 ? (meta - anda) / l : 0;
        objetivo = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        break;
      }
      anda += l;
    }
    let apunta = Math.atan2(objetivo[0] - p.x, -(objetivo[1] - p.z)) - rumbo;
    while (apunta > Math.PI) apunta -= 2 * Math.PI;
    while (apunta < -Math.PI) apunta += 2 * Math.PI;
    vistos.push({ quiere: Math.max(3, vista.velocidadSugerida) * estilo.prisa, apunta });
    const visto = vistos.length > estilo.reaccion / PASO ? vistos.shift()! : vistos[0]!;
    // La velocidad: frena hasta lo que vio que pedía, con su prisa.
    v = v > visto.quiere ? Math.max(visto.quiere, v - FRENADA * PASO) : Math.min(visto.quiere, v + PASO);
    // El giro: lo que vio, con el radio que deja la física.
    const radio = Math.max(minimo, (v * v) / DE_LADO_RODANDO);
    const maxGiro = (v / radio) * PASO;
    rumbo += Math.max(-maxGiro, Math.min(maxGiro, visto.apunta * estilo.volante * PASO));
    p = { x: p.x + Math.sin(rumbo) * v * PASO, z: p.z - Math.cos(rumbo) * v * PASO };
  }
  return { pasadas: plan.salidasPasadas, fuera, dejoEn, elegida, dichos };
}

describe("salir de la pista girando como una persona, tarde y abierto", () => {
  for (const id of CAMPOS) {
    it(`${id}: sale por la suya y sin «te pasaste» mientras gira hacia ella`, () => {
      const esc0 = SCENARIOS.find((e) => e.id === id)!;
      const mal: string[] = [];
      for (const esc of cabeceras(esc0))
        for (const cual of AVIONES)
          for (const estilo of ESTILOS) {
            const avion = AIRCRAFT.find((a) => a.id === cual)!;
            const s = aterrizarComoUnaPersona(esc, avion, estilo);
            const donde = `${id} ${Math.round(esc.runway.heading)}° ${cual} ${estilo.nombre}`;
            if (!s.fuera) {
              mal.push(`${donde}: no salió de la pista`);
              continue;
            }
            /*
             * Salió por la suya —a menos de una calle de la boca elegida— y
             * aun así le dijeron que se la había pasado: eso es lo que no.
             * Si se la pasó de verdad y salió por otra, el aviso era justo.
             */
            const porLaSuya =
              s.elegida !== null &&
              s.dejoEn !== null &&
              Math.abs(s.dejoEn - s.elegida) < SALIO_POR_ELLA;
            if (porLaSuya && s.pasadas > 0)
              mal.push(
                `${donde}: ${s.pasadas} «te pasaste» saliendo por la suya; elegida a ${s.elegida?.toFixed(0)} m, salió a ${s.dejoEn?.toFixed(0)}`,
              );
            /*
             * Y aunque saliera por otra: el aviso no puede llegar **antes** de
             * la salida —eso rehace la raya y le manda a la siguiente, que es
             * lo que vio Enrique— ni con el morro girando hacia ella.
             */
            for (const d of s.dichos) {
              if (d.pasado < 0)
                mal.push(`${donde}: «te pasaste» ${(-d.pasado).toFixed(0)} m antes de la salida`);
              else if (d.girando)
                mal.push(`${donde}: «te pasaste» girando hacia la salida, ${d.pasado.toFixed(0)} m pasada`);
            }
          }
      expect(mal).toEqual([]);
    }, 120_000);
  }
});
