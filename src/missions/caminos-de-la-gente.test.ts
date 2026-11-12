/**
 * Los caminos de la gente alrededor del helicóptero, sin navegador: que nadie
 * pase por detrás de la cola, que entren todos a tiempo y que al bajar se
 * queden fuera del disco. Los casos que importan son los incómodos: posado con
 * la cola hacia la gente, en el borde del llano, y volviendo a medias.
 */
import { describe, expect, it } from "vitest";
import {
  aLaColaYAlMastil,
  aLocal,
  enElCamino,
  largo,
  metrosA,
  planDeBajada,
  planDeSubida,
  radioSeguro,
  RITMO,
  sitioParaApartarse,
  sitiosDeLaGente,
  type Posado,
  type Punto,
} from "./caminos-de-la-gente";
import { GENTE_EN_TENO, LLANO_DEL_FARO_DE_TENO } from "../content/missions";
import { SUPER_PUMA } from "../flight/super-puma";
import { SIN_ESPERAR_MAS_DE } from "./runner";

/** La puerta del modelo: 0,155 m por delante del mástil y en la piel derecha. */
const PUERTA = { adelante: 0.155, derecha: 1.13 };

const posado = (x: number, z: number, rumboGrados: number): Posado => ({
  x,
  z,
  rumbo: (rumboGrados * Math.PI) / 180,
  rotor: SUPER_PUMA.rotor.radio,
  cola: SUPER_PUMA.cola.brazo,
  puerta: PUERTA,
});

/** Cada cuarto de metro de un camino. */
function muestras(camino: readonly Punto[]): Punto[] {
  const l = largo(camino);
  const fuera: Punto[] = [];
  for (let s = 0; s <= l; s += 0.25) fuera.push(enElCamino(camino, s));
  fuera.push(enElCamino(camino, l));
  return fuera;
}

/**
 * **Por la cola, no**: ningún punto dentro del estadio salvo en el pasillo de
 * la puerta —por delante de ella y a su derecha—, y nunca cruzando de un lado
 * al otro por detrás del rotor de cola.
 */
function porLaCola(p: Posado, camino: readonly Punto[]): string | null {
  const R = radioSeguro(p);
  let antes: { f: number; r: number } | null = null;
  // Quien empieza dentro del estadio —se posaron a su lado— primero sale, y
  // saliendo solo se aparta del eje.
  let saliendo = true;
  let lado = 0;
  for (const q of muestras(camino)) {
    const l = aLocal(p, q);
    const d = aLaColaYAlMastil(p, l.f, l.r);
    const dentro = d < R - 0.1;
    if (saliendo && dentro) {
      if (antes && d < aLaColaYAlMastil(p, antes.f, antes.r) - 0.01) return `se acerca al eje saliendo, en f=${l.f.toFixed(1)}`;
      antes = l;
      continue;
    }
    saliendo = false;
    const enElPasillo = l.f >= p.puerta.adelante - 0.01 && l.r > 0;
    if (dentro && !enElPasillo) return `dentro del estadio en f=${l.f.toFixed(1)} r=${l.r.toFixed(1)}`;
    // Cruzar es pasar de un lado claro al otro; quien empieza justo en el eje aún no está en ninguno.
    if (Math.abs(l.r) > 0.05) {
      const ahora = Math.sign(l.r);
      if (lado !== 0 && ahora !== lado && l.f < -p.cola) return `cruza por detrás de la cola en f=${l.f.toFixed(1)}`;
      lado = ahora;
    }
    antes = l;
  }
  return null;
}

/** Dónde se posa en el llano: el centro y ocho puntos del borde, a dieciocho metros. */
const enElLlano: Punto[] = [
  { x: 0, z: 0 },
  ...Array.from({ length: 8 }, (_, i) => ({ x: 18 * Math.cos((i * Math.PI) / 4), z: 18 * Math.sin((i * Math.PI) / 4) })),
].map((d) => ({ x: LLANO_DEL_FARO_DE_TENO.x + d.x, z: LLANO_DEL_FARO_DE_TENO.z + d.z }));

const sitios = sitiosDeLaGente(GENTE_EN_TENO, LLANO_DEL_FARO_DE_TENO);

describe("la gente sube por delante y nunca por la cola", () => {
  it("desde donde espera en Teno, con el helicóptero en cualquier sitio del llano y mirando a cualquier lado", () => {
    for (const c of enElLlano)
      for (let rumbo = 0; rumbo < 360; rumbo += 15) {
        const p = posado(c.x, c.z, rumbo);
        const plan = planDeSubida(p, sitios, 25);
        plan.caminos.forEach((camino) => expect(porLaCola(p, camino), `rumbo ${rumbo}`).toBeNull());
      }
  });

  it("y desde cualquier sitio alrededor, también de detrás y de debajo de la cola", () => {
    const p = posado(0, 0, 70);
    for (let d = 6; d <= 60; d += 3)
      for (let g = 0; g < 360; g += 10) {
        const a = (g * Math.PI) / 180;
        const desde = { x: d * Math.cos(a), z: d * Math.sin(a) };
        const l = aLocal(p, desde);
        // Debajo del fuselaje no espera nadie.
        if (aLaColaYAlMastil(p, l.f, l.r) < 3) continue;
        const [camino] = planDeSubida(p, [desde], 25).caminos;
        expect(porLaCola(p, camino as Punto[]), `desde ${d} m a ${g}°`).toBeNull();
      }
  });

  it("y acaba dentro, entrando por la derecha de cara a la puerta", () => {
    const p = posado(0, 0, 200);
    const [camino] = planDeSubida(p, [{ x: 30, z: -10 }], 25).caminos;
    const c = camino as Punto[];
    const ultimo = aLocal(p, c[c.length - 1] as Punto);
    const puerta = aLocal(p, c[c.length - 2] as Punto);
    expect(ultimo.r).toBeLessThan(PUERTA.derecha);
    expect(puerta.r).toBeGreaterThan(PUERTA.derecha);
    expect(Math.abs(puerta.f - PUERTA.adelante)).toBeLessThan(0.01);
  });
});

/** Cuándo acaba de subir el último, s. */
const ultimo = (plan: ReturnType<typeof planDeSubida>) =>
  Math.max(...plan.horarios.map((h) => (h[h.length - 1] as readonly [number, number])[0]));

describe("entran todos a tiempo", () => {
  it("en los veinticinco segundos de Teno posándose de cara al alisio, en el centro o del lado de la gente", () => {
    // El alisio sopla del nordeste: de cara a él, entre el norte y el este.
    const lejos = (c: Punto) => Math.hypot(c.x - GENTE_EN_TENO.x, c.z - GENTE_EN_TENO.z);
    for (const c of enElLlano.filter((c) => lejos(c) <= lejos(LLANO_DEL_FARO_DE_TENO) + 0.1))
      for (let rumbo = 0; rumbo <= 90; rumbo += 15) {
        const plan = planDeSubida(posado(c.x, c.z, rumbo), sitios, 25);
        expect(plan.entraElTripulante, `rumbo ${rumbo}`).toBeGreaterThan(ultimo(plan));
        expect(plan.entraElTripulante + RITMO.cerrar, `rumbo ${rumbo}`).toBeLessThanOrEqual(25);
      }
  });

  it("y mirando a cualquier lado, aunque tarden más, nunca tanto que salte la red de la espera", () => {
    for (const c of enElLlano)
      for (let rumbo = 0; rumbo < 360; rumbo += 15) {
        const plan = planDeSubida(posado(c.x, c.z, rumbo), sitios, 25);
        expect(plan.entraElTripulante).toBeGreaterThan(ultimo(plan));
        expect(plan.entraElTripulante + RITMO.cerrar).toBeLessThan(25 + SIN_ESPERAR_MAS_DE);
      }
  });

  it("en fila: de uno en uno por la puerta y sin correr más que trotando", () => {
    for (let rumbo = 0; rumbo < 360; rumbo += 45) {
      const p = posado(LLANO_DEL_FARO_DE_TENO.x, LLANO_DEL_FARO_DE_TENO.z, rumbo);
      const plan = planDeSubida(p, sitios, 25);
      const entradas = plan.horarios.map((h) => (h[h.length - 1] as readonly [number, number])[0]).sort((a, b) => a - b);
      for (let i = 1; i < entradas.length; i++)
        expect((entradas[i] as number) - (entradas[i - 1] as number)).toBeGreaterThan(0.35);
      for (const h of plan.horarios)
        for (let i = 1; i < h.length; i++) {
          const a = h[i - 1] as readonly [number, number];
          const b = h[i] as readonly [number, number];
          if (b[0] > a[0]) expect((b[1] - a[1]) / (b[0] - a[0])).toBeLessThanOrEqual(RITMO.corriendo + 0.01);
        }
      // Y con el horario se llega al final del camino.
      plan.horarios.forEach((h, i) => expect(metrosA(h, 999)).toBeCloseTo(largo(plan.caminos[i] as Punto[]), 5));
    }
  });
});

describe("en Garachico bajan y se quedan fuera del disco", () => {
  const pisable = () => true;

  it("su sitio queda por delante y fuera del estadio, mire a donde mire", () => {
    for (let rumbo = 0; rumbo < 360; rumbo += 30) {
      const p = posado(0, 0, rumbo);
      const q = aLocal(p, sitioParaApartarse(p, pisable));
      expect(q.f).toBeGreaterThan(PUERTA.adelante);
      expect(aLaColaYAlMastil(p, q.f, q.r)).toBeGreaterThan(radioSeguro(p) + 3);
    }
  });

  it("y si de frente a la derecha no se puede pisar, busca otro sitio por delante", () => {
    const p = posado(0, 0, 0);
    // Al norte y al este, el mar.
    const q = aLocal(p, sitioParaApartarse(p, (s) => s.x < 0));
    expect(q.f).toBeGreaterThan(PUERTA.adelante);
    expect(q.r).toBeLessThan(0);
  });

  it("salen por el pasillo, rodean por delante y acaban fuera del disco antes de que entre el tripulante", () => {
    for (let rumbo = 0; rumbo < 360; rumbo += 15) {
      const p = posado(0, 0, rumbo);
      const centro = sitioParaApartarse(p, pisable);
      const hasta = sitiosDeLaGente(centro, p);
      const plan = planDeBajada(p, hasta, 20);
      expect(plan.entraElTripulante + RITMO.cerrar - 0.3).toBeLessThanOrEqual(20);
      plan.caminos.forEach((camino, i) => {
        expect(porLaCola(p, camino), `rumbo ${rumbo}`).toBeNull();
        const final = aLocal(p, camino[camino.length - 1] as Punto);
        expect(Math.hypot(final.f, final.r)).toBeGreaterThan(p.rotor + 2);
        // Fuera del disco cuando entra el tripulante.
        const h = plan.horarios[i] as readonly (readonly [number, number])[];
        const ahi = aLocal(p, enElCamino(camino, metrosA(h, plan.entraElTripulante)));
        expect(Math.hypot(ahi.f, ahi.r)).toBeGreaterThan(p.rotor);
      });
    }
  });
});
