/**
 * **Aterrizar, frenar y salir por la salida elegida, a la primera.**
 *
 * Aterrizando en Tenerife Sur: «cada vez que voy a tomar una salida me dice
 * que me la había pasado, no siendo cierto, y me da otra salida más
 * adelante; no me deja salir por la que tenía y me obliga a ir a la
 * siguiente, donde me vuelve a hacer lo mismo. Es decir, que no pude salir.»
 *
 * Esto es el vuelo de vuelta con el lazo cerrado, sin navegador: se toca
 * tierra, se frena como se frena —hasta la velocidad que pide la raya, sin
 * pasar de lo que frena un avión—, se sigue la raya y se gira donde ella
 * gira. Lo que se pide es lo de verdad: se sale por la salida elegida al
 * tocar, sin ningún «te pasaste», en los dieciocho campos y por las dos
 * cabeceras. Ver `seHaPasadoLaSalida` en `plan-de-vuelo.ts`.
 */
import { describe, expect, it } from "vitest";
import { PlanDeVuelo } from "./plan-de-vuelo";
import { AIRCRAFT, type AircraftConfig } from "../flight/aircraft";
import { cabeEn, campoDe } from "../flight/cabe";
import { enEjesDePista } from "./rumbo";
import { SCENARIOS, conViento, type Scenario } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";

const CAMPOS = SCENARIOS.filter((e) => e.aerodrome);

/** Lo que frena un avión en la carrera de aterrizaje sin apurar, m/s². */
const FRENADA_NORMAL = 2;

/** Las cabeceras en uso posibles, por el viento, como en el juego. */
function cabeceras(esc0: Scenario): Scenario[] {
  const por = new Map<number, Scenario>();
  for (let v = 0; v < 360; v += 10) {
    const e = conViento(esc0, { ...TIEMPO_DE_CASA, vientoDe: v, vientoKt: 15 });
    por.set(Math.round(e.runway.heading), e);
  }
  return [...por.values()];
}

/** El avión más chico y el más grande que caben. */
function avionesDe(esc: Scenario): AircraftConfig[] {
  const caben = AIRCRAFT.filter((a) => cabeEn(a, campoDe(esc)).cabe);
  return [...new Set([caben[0] ?? AIRCRAFT[0]!, caben[caben.length - 1] ?? AIRCRAFT[0]!])];
}

interface Salida {
  /** Cuántas veces dijo el plan «te pasaste». */
  pasadas: number;
  /** Si acabó fuera de la pista. */
  fuera: boolean;
  /** A lo largo del eje, m desde el umbral, por donde dejó la pista. */
  dejoEn: number | null;
  /** Y por dónde tenía que dejarla, según la raya al frenar. */
  elegida: number | null;
}

/**
 * Una vuelta con el lazo cerrado: posado a trescientos metros del umbral a
 * velocidad de toma, y de ahí siguiendo la raya.
 */
function aterrizarYSalir(esc: Scenario, avion: AircraftConfig): Salida {
  const pista = esc.runway;
  const plan = new PlanDeVuelo(esc.aerodrome!, pista, () => 0, avion);
  plan.reiniciar();
  const h = (pista.heading * Math.PI) / 180;
  const ejes = (x: number, z: number) => enEjesDePista(x, z, pista.x, pista.z, pista.heading);
  const estado = (x: number, z: number, rumbo: number, v: number, alto: number) =>
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
  // En final, volando, y posado.
  const lejos = enElEje(umbral - 9000);
  for (let t = 0; t < 25; t += 0.05) plan.paso(estado(lejos.x, lejos.z, h, 60, 400), 400, true, 0.05);
  const dt = 0.05;
  let v = avion.approachSpeed * 0.95;
  let p = enElEje(umbral + 300);
  let rumbo = h;
  for (let t = 0; t < 0.5; t += dt) plan.paso(estado(p.x, p.z, rumbo, v, 0), 0, true, dt);
  let elegida: number | null = null;
  let dejoEn: number | null = null;
  let fuera = false;
  for (let t = 0; t < 300; t += dt) {
    const vista = plan.paso(estado(p.x, p.z, rumbo, v, 0), 0, true, dt);
    const ruta = plan.rutaVisible();
    if (ruta.length < 2) break;
    if (elegida === null) {
      // La salida de la raya: donde deja la pista por primera vez.
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
    // Frenar como se frena, hasta lo que pide la raya; y nunca por debajo de
    // paso de persona, que parado no se sale.
    const quiere = Math.max(3, vista.velocidadSugerida);
    v = v > quiere ? Math.max(quiere, v - FRENADA_NORMAL * dt) : Math.min(quiere, v + 1 * dt);
    // Por la raya, desde lo recorrido.
    const meta = plan.avanceEnLaRuta + v * dt;
    let anda = 0;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i]!;
      const b = ruta[i + 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + l >= meta) {
        const u = l > 0 ? (meta - anda) / l : 0;
        p = { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u };
        rumbo = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
        break;
      }
      anda += l;
    }
  }
  return { pasadas: plan.salidasPasadas, fuera, dejoEn, elegida };
}

describe("aterrizar y salir por la salida elegida, a la primera", () => {
  for (const esc0 of CAMPOS) {
    it(`${esc0.id}: por las dos cabeceras, sin ningún «te pasaste»`, () => {
      const mal: string[] = [];
      for (const esc of cabeceras(esc0))
        for (const avion of avionesDe(esc)) {
          const s = aterrizarYSalir(esc, avion);
          const donde = `${esc0.id} ${Math.round(esc.runway.heading)}° ${avion.id}`;
          if (!s.fuera) mal.push(`${donde}: no salió de la pista`);
          else if (s.pasadas > 0)
            mal.push(`${donde}: ${s.pasadas} «te pasaste»; elegida a ${s.elegida?.toFixed(0)} m, salió a ${s.dejoEn?.toFixed(0)}`);
        }
      expect(mal).toEqual([]);
    });
  }
});

