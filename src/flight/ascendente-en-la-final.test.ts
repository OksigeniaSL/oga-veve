/**
 * **Una ascendente en la final no deja al automático bajando de más al salir.**
 *
 * Nace del #192 (H29a): en la final del JAZ 90 en Los Rodeos, saliendo del
 * viraje, una ascendente sostuvo el avión unos cinco segundos y la puerta de
 * los 500 ft llegó bajando a 6,9 m/s con 4,57 pedidos. El lazo del medio del
 * automático persigue la trayectoria por el variómetro, que llega tarde:
 * mientras duraba la ascendente iba bajando el morro, y cuando se acabó lo
 * seguía bajando. Ver `porElAire` en `piloto-automatico.ts`.
 *
 * Se vuela lo mismo que en la final del banco del vuelo entero: el JAZ 90 con
 * el modelo completo y el peldaño Taguató, con todo fuera sobre un campo a la
 * cota de Los Rodeos, el automático del juego bajando por una senda de tres
 * grados con el tope del banco —0,9 veces mil pies por minuto, 4,57 m/s, lo
 * que pide estando alto—, el gas a la Vref más cinco nudos, y una ascendente
 * de tres metros por segundo durante cuatro segundos. Lo que se mira es lo que
 * mira la puerta: la media de cinco segundos de lo que baja.
 *
 * **El tope, de la aproximación estabilizada**: no más de mil pies por minuto
 * por debajo de los mil pies (FSF ALAR, *Briefing Note 7.1*; y en el E190, C.
 * Regli, *Embraer EMB190 – Summary*, p. 2-25). Con 900 pedidos, lo que se puede
 * pasar es lo que queda hasta mil: medio metro por segundo.
 */
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { aircraftById } from "./aircraft";
import { airDensity, SEA_LEVEL_DENSITY } from "./atmosphere";
import { CoefficientFlightModel } from "./fdm";
import { neutralControls } from "./model";
import { mandosPara, memoriaNueva } from "./piloto-automatico";
import { TAGUATO } from "./tiers";
import { pitchAngleOf } from "../ui/actitud";

const DT = 1 / 60;
const NUDO = 0.514444;
const SENDA = Math.tan((3 * Math.PI) / 180);
/** La cota de Los Rodeos, m. */
const COTA = 632;
/** Mil pies por minuto, m/s: el tope de la aproximación estabilizada. */
const MIL_PIES_POR_MINUTO = (1000 * 0.3048) / 60;
/** Lo que pide el banco estando alto en la final recta, m/s. */
const TOPE_DEL_BANCO = 0.9 * MIL_PIES_POR_MINUTO;
/** Cuándo entra la ascendente, s: con el avión ya bajando a lo que se le pide. */
const ENTRA = 60;
/**
 * **Lo alto que empieza sobre la senda**, m: como en el #192, que llegó alto
 * y bajando al tope del banco. Lo ponía el globo de sacar los flaps —el avión
 * nace compensado limpio y los flaps lo suben unos sesenta metros—, y con los
 * flaps de la actitud de su manual, que suman menos a igual ángulo, el globo
 * es menor y a los sesenta segundos ya estaba en la senda, bajando a 3,4 m/s
 * y no a lo que mira la prueba (enmienda H55 del ADR 0027). Así lo alto lo
 * pone la prueba y no el globo.
 */
const ALTO_SOBRE_LA_SENDA = 60;

interface Vuelo {
  /** La peor media de cinco segundos de lo que baja, desde que entra la ascendente, m/s. */
  readonly peorMedia: number;
  /** Lo más que baja en un instante, m/s. */
  readonly pico: number;
  /** Lo que más se aparta el morro que persigue en aire quieto del de antes, °. */
  readonly morroSeVa: number;
}

/**
 * La final con una ascendente de `sube` m/s durante `dura` s. Con `loSabe`, el
 * automático recibe el aire que sube, como en el juego; sin él, vuela como
 * volaba antes de saberlo.
 */
function finalConAscendente(sube: number, dura: number, loSabe: boolean): Vuelo {
  const a = aircraftById("jaz-90");
  if (!a) throw new Error("no está el JAZ 90");
  const raiz = (y: number): number => Math.sqrt(airDensity(y) / SEA_LEVEL_DENSITY);
  const m = new CoefficientFlightModel({ aircraft: a, ground: () => COTA, assist: TAGUATO.assists });
  const inicio = COTA + 500;
  m.reset({
    position: new Vector3(0, inicio, 0),
    heading: 0,
    airspeed: (a.approachSpeed + 7 * NUDO) / raiz(inicio),
    equilibrado: true,
  });
  const c = neutralControls();
  c.flaps = 1;
  c.tren = 1;
  c.trim = 0;
  c.throttle = 0.3;
  c.automatico = true;
  const memoria = memoriaNueva();
  let errorAntes: number | null = null;
  const bajadas: { t: number; baja: number }[] = [];
  let peorMedia = 0;
  let pico = 0;
  let morroAntes = 0;
  let morroSeVa = 0;
  for (let i = 0, t = 0; i < 60 * 100; i++, t += DT) {
    const s = m.state;
    const gs = Math.hypot(s.velocity.x, s.velocity.z);
    const ritmo = -gs * SENDA;
    const aire = t >= ENTRA && t < ENTRA + dura ? sube : 0;
    m.ponerRacha(0, aire, 0, 0);
    // La senda, y estando alto, el tope del banco: ver la final recta de
    // `verificar-vuelo-entero.mjs`.
    const pedida = Math.max(
      inicio - ALTO_SOBRE_LA_SENDA + ritmo * t,
      s.position.y + (-TOPE_DEL_BANCO - ritmo) * 10,
    );
    const r = mandosPara(
      {
        heading: s.heading,
        alabeo: 0,
        cabeceo: pitchAngleOf(s.orientation),
        altitud: s.position.y,
        vertical: s.velocity.y,
        velocidad: s.airspeed * raiz(s.position.y),
        gas: c.throttle,
        verdadera: s.airspeed,
        ritmoDeCabeceo: s.pitchRate,
        ...(i === 0 ? { timon: 0 } : {}),
        ...(loSabe ? { subeElAire: aire } : {}),
      },
      { rumbo: null, altitud: pedida, ritmo, velocidad: null },
      DT,
      memoria,
    );
    c.elevator = r.elevator;
    // El gas del banco: a la Vref más cinco nudos.
    const quiere = (a.approachSpeed + 5 * NUDO) / raiz(s.position.y);
    const error = quiere - s.airspeed;
    c.throttle = Math.max(
      0,
      Math.min(1, c.throttle + (error - (errorAntes ?? error)) * 0.04 + error * 0.01 * DT),
    );
    errorAntes = error;
    bajadas.push({ t, baja: -s.velocity.y });
    while (bajadas.length > 0 && t - (bajadas[0]?.t ?? t) > 5) bajadas.shift();
    if (t < ENTRA) morroAntes = memoria.morro;
    else {
      peorMedia = Math.max(peorMedia, bajadas.reduce((x, b) => x + b.baja, 0) / bajadas.length);
      pico = Math.max(pico, -s.velocity.y);
      morroSeVa = Math.max(morroSeVa, ((morroAntes - memoria.morro) * 180) / Math.PI);
    }
    m.step(DT, c);
  }
  return { peorMedia, pico, morroSeVa };
}

describe("una ascendente en la final del JAZ 90", () => {
  it("antes de entrar, baja a lo que se le pide", () => {
    // Sin esto, lo de abajo no mide la ascendente sino lo que aún no ha llegado.
    const calma = finalConAscendente(0, 0, true);
    expect(calma.peorMedia, `${calma.peorMedia.toFixed(2)} m/s`).toBeGreaterThan(
      TOPE_DEL_BANCO - 0.2,
    );
    expect(calma.peorMedia, `${calma.peorMedia.toFixed(2)} m/s`).toBeLessThan(TOPE_DEL_BANCO + 0.1);
  });

  it("de 3 m/s durante 4 s: al salir no pasa de mil pies por minuto", () => {
    const r = finalConAscendente(3, 4, true);
    /*
     * Medido antes de que el automático supiera el aire (H29a): 6,13 de media
     * y 6,35 de pico, con el morro de aire quieto 1,9° más abajo que antes.
     */
    expect(r.peorMedia, `${r.peorMedia.toFixed(2)} m/s`).toBeLessThan(MIL_PIES_POR_MINUTO);
  });

  it("y sin saber el aire se pasaba: la prueba ve el fallo", () => {
    const r = finalConAscendente(3, 4, false);
    expect(r.peorMedia, `${r.peorMedia.toFixed(2)} m/s`).toBeGreaterThan(MIL_PIES_POR_MINUTO + 0.5);
    expect(r.morroSeVa, `${r.morroSeVa.toFixed(2)}°`).toBeGreaterThan(1.5);
  });

  it("y el morro de aire quieto casi no se mueve: lo del aire va aparte", () => {
    const r = finalConAscendente(3, 4, true);
    expect(r.morroSeVa, `${r.morroSeVa.toFixed(2)}°`).toBeLessThan(1);
  });
});
