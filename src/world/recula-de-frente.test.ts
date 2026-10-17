/**
 * **Si los dos ya estabais dentro de la misma calle, de frente, el otro se
 * aparta.**
 *
 * El reparto de calles —ver `repartirLosTramos` en `trafico.ts`— deja pasar
 * al que ya estaba dentro y hace esperar fuera al que no. Quedaba un caso:
 * los dos dentro, cada uno en el camino del otro. Ninguno podía pasar, y se
 * resolvía como los atascos, retirando el dibujo del otro a los treinta
 * segundos: un avión que se esfuma no es un aeropuerto.
 *
 * Lo de verdad es apartar a uno. Al del tráfico se le empuja hacia atrás por
 * donde vino —como lo haría un tractor— hasta dejarte la calle, y ahí espera
 * a que pases; tu raya, mientras tanto, se para antes de él. Aquí se monta
 * a mano ese encuentro, que en los barridos de campos no sale solo: el que
 * sale rueda por su calle, y tu raya viene por esa misma calle de frente,
 * empezando delante de él y torciendo por otra un poco más atrás.
 */
import { describe, expect, it } from "vitest";
import { sinTorre, type Aerodrome } from "./aerodrome";
import { SCENARIOS, conViento } from "./scenarios";
import { TIEMPO_DE_CASA } from "./meteo";
import { sueloDelTrafico, type EnElPlano } from "./suelo-del-trafico";
import { crearTrafico, tiposDelCampo, type QuienJuega } from "./trafico";
import { porDelanteDe } from "./tramo-de-frente";

const PASO = 0.1;
const SEPARACION = 30;
const QUIEN = "EC-AAX";

function montar() {
  const esc = conViento(SCENARIOS.find((e) => e.id === "guarani")!, {
    ...TIEMPO_DE_CASA,
    vientoDe: 0,
    vientoKt: 15,
  });
  const aero = esc.aerodrome as Aerodrome;
  const cota = aero.elevationM ?? 0;
  const suelo = sueloDelTrafico(aero, esc.runway, aero.runways[0]?.widthM ?? 45);
  let tu: QuienJuega | null = null;
  const trafico = crearTrafico(esc.runway, cota, "ala-alta", "izquierda", 1, undefined, {
    tipos: tiposDelCampo(aero.id, esc.runway.length, sinTorre(aero)),
    quienJuega: () => tu,
    tierra: () => (suelo ? { suelo, alto: () => cota } : null),
  });
  const suyo = () => trafico.porDentro().find((p) => p.matricula === QUIEN);
  const donde = () => trafico.quienes().find((q) => q.matricula === QUIEN);
  return { trafico, suyo, donde, ponerte: (q: QuienJuega | null) => (tu = q) };
}

describe("de frente y los dos dentro: el otro recula y espera", () => {
  it("se aparta hacia atrás hasta dejarte la calle, te espera y sigue después, sin retirarse", () => {
    // Primero, su camino entero: por dónde va a rodar hasta su doble raya.
    const antes = montar();
    antes.trafico.anuncia(QUIEN, "otro.rodando");
    const rastro: { r: number; p: EnElPlano }[] = [];
    for (let t = 0; t < 400; t += PASO) {
      antes.trafico.paso(PASO);
      const s = antes.suyo();
      const q = antes.donde();
      if (s && q) rastro.push({ r: s.recorrido, p: { x: q.x, z: q.z } });
      if (s && s.espera !== null && s.recorrido >= s.espera - 0.5) break;
    }
    antes.trafico.dispose();
    const espera = rastro[rastro.length - 1]!.r;
    expect(espera).toBeGreaterThan(250);

    // Otra vez, y a medio camino te encuentra de frente.
    const k = Math.min(espera - 90, Math.max(140, espera * 0.6));
    const m = montar();
    m.trafico.anuncia(QUIEN, "otro.rodando");
    for (let t = 0; t < 400 && (m.suyo()?.recorrido ?? 0) < k; t += PASO) m.trafico.paso(PASO);
    const dentro = m.suyo()!.recorrido;
    /*
     * Tu raya: de sesenta metros por delante de él, por su calle de frente
     * hasta cuarenta por detrás, y de ahí tuerce cien metros de lado.
     */
    const ida = rastro.filter((x) => x.r <= dentro + 60 && x.r >= dentro - 40).map((x) => x.p).reverse();
    const giro = ida[ida.length - 1]!;
    const previo = ida[ida.length - 2]!;
    const d = Math.hypot(giro.x - previo.x, giro.z - previo.z) || 1;
    const lado = { x: -(giro.z - previo.z) / d, z: (giro.x - previo.x) / d };
    const raya = porDelanteDe(
      [...ida, { x: giro.x + lado.x * 100, z: giro.z + lado.z * 100 }],
      0,
      Infinity,
      4,
    );
    let avance = 0;
    const ponerte = () => {
      const resto = porDelanteDe(raya, avance, Infinity, 4);
      const yo = resto[0]!;
      m.ponerte({
        alUmbral: null,
        enLaPista: false,
        velocidad: 0,
        enTierra: {
          x: yo.x,
          z: yo.z,
          separacion: SEPARACION,
          porDondeVa: [],
          esperandoLaPista: false,
          ruta: resto,
        },
      });
      return yo;
    };
    ponerte();

    // Se ve el encuentro, y recula: tu raya se para antes de él.
    let reculo = false;
    let minimo = dentro;
    let tuRayaEspera = false;
    for (let t = 0; t < 120; t += PASO) {
      m.trafico.paso(PASO);
      const s = m.suyo();
      expect(s, `retirado a los ${t.toFixed(1)} s`).toBeDefined();
      if (s!.frenteATi === "frente" && s!.recorrido < dentro - 1) reculo = true;
      minimo = Math.min(minimo, s!.recorrido);
      if (m.trafico.tramosQueTienen().some((x) => x.matricula === QUIEN && x.recula)) tuRayaEspera = true;
    }
    expect(reculo).toBe(true);
    expect(tuRayaEspera).toBe(true);
    // Y quedó fuera de tu raya, a su separación.
    const q = m.donde()!;
    const masCerca = Math.min(...raya.map((p) => Math.hypot(p.x - q.x, p.z - q.z)));
    expect(masCerca).toBeGreaterThan(SEPARACION);
    expect(dentro - minimo).toBeLessThan(250);

    // Ahora pasas tú, y él espera quieto mientras vas por su calle.
    const quieto = m.suyo()!.recorrido;
    const porSuCalle = 100 - 8;
    const largo = (raya.length - 1) * 4;
    for (let t = 0; avance < largo && t < 200; t += PASO) {
      avance += 6 * PASO;
      ponerte();
      m.trafico.paso(PASO);
      expect(m.suyo(), "retirado mientras pasabas").toBeDefined();
      if (avance < porSuCalle) expect(m.suyo()!.recorrido).toBeLessThanOrEqual(quieto + 0.5);
    }

    // Y con la calle libre, sigue hasta su doble raya.
    m.ponerte(null);
    let llego = false;
    for (let t = 0; t < 300 && !llego; t += PASO) {
      m.trafico.paso(PASO);
      const s = m.suyo();
      expect(s, "retirado después").toBeDefined();
      llego = s!.recorrido >= espera - 1;
    }
    expect(llego).toBe(true);
    m.trafico.dispose();
  });
});
