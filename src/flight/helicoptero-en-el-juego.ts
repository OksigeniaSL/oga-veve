/**
 * **El Super Puma como aeronave del juego**, escondido: solo se vuela con
 * `?avion=super-puma` en la dirección, en Tenerife Norte y desde el helipuerto del Ejército.
 * No está en `AIRCRAFT` a propósito, y así no sale en el hangar, ni en el
 * cambio de avión, ni en ninguna lección, y a quien juega no le cambia nada.
 * Es para probarlo en la web y afinar los mandos antes de que llegue su modelo
 * en 3D. Ver el ADR 0026, paso 3.
 *
 * La ficha de verdad es la del rotor, `SUPER_PUMA`. Lo de aquí es lo que el
 * juego pregunta a cualquier aeronave —cuánto pesa, cuánto cabe en el
 * depósito, cómo suena, a qué velocidades se juzga—, contestado como lo haría
 * un helicóptero; lo que es de ala va puesto para que no estorbe y lo dice.
 */

import { ARASUNU, type AircraftConfig, LIBREA } from "./aircraft";
import { SUPER_PUMA } from "./super-puma";

const NUDO = 0.514444;

/** El identificador, el de la ficha del rotor: es el que se escribe en la dirección. */
export const ID_DEL_HELICOPTERO = SUPER_PUMA.id;

/**
 * **Dónde vuela**: Tenerife Norte. Junto a Los Rodeos está el batallón de
 * helicópteros del Ejército de Tierra, que vuela tres Super Puma AS332B1, con
 * la UME en el mismo acuartelamiento (Enrique, 11-11: «Hay una división de
 * helicópteros justo al lado de GCXO»). Su helipuerto, GCXM, está en el AIP y
 * se pone a mano en los datos del campo: ver `helipuertosAMano` en
 * `world/aerodrome.ts`.
 */
export const ESCENARIO_DEL_HELICOPTERO = "tenerife-norte";

/** Lo que gasta cada vatio contado como empuje: ver `NEWTON_POR_VATIO` en `fdm-helicoptero.ts`. */
const NEWTON_POR_VATIO = (0.36 / 1000) / 0.05;

export const SUPER_PUMA_EN_EL_JUEGO: AircraftConfig = {
  // Lo de ala que el juego pregunta y el helicóptero no tiene sale de un avión
  // de su peso; lo que importa se pone encima, uno a uno.
  ...ARASUNU,
  id: ID_DEL_HELICOPTERO,
  name: "Super Puma",
  descriptionKey: "aircraft.superPuma.description",
  // 8.600 kg al despegue (TCDS R.002, III.12). El depósito de serie, unos
  // 2.000 litros: 1.600 kg, que es lo que separa los dos pesos.
  mass: SUPER_PUMA.masaMaxima,
  masaSinCombustible: SUPER_PUMA.masaMaxima - 1600,
  /*
   * **El «ala» es el rotor**, para lo que el juego mide con ella: a qué
   * distancia va la cámara de fuera, el tamaño de la sombra y dónde van las
   * luces. 15,60 m de diámetro (TCDS, III.4.2).
   */
  wingSpan: 2 * SUPER_PUMA.rotor.radio,
  wingArea: 20,
  chord: 3,
  // El combustible sale del empuje: lo que gastan los dos Makila a plena
  // potencia, contado como empuje. Ver `NEWTON_POR_VATIO`.
  maxThrust: SUPER_PUMA.motores.cuantos * SUPER_PUMA.motores.potencia * NEWTON_POR_VATIO,
  motores: SUPER_PUMA.motores.cuantos,
  // Los dos turboejes van juntos encima de la cabina: no hay par asimétrico de
  // hélices que sujetar si se para uno.
  motoresA: [0, 0],
  alturaCritica: null,
  helicesContrarrotativas: false,
  // El crucero recomendado de Airbus, 136 kt, y bajo: es un helicóptero de
  // rescate y vuela a vista.
  cruiseSpeed: 136 * NUDO,
  alturaDeCrucero: 600,
  reglasDeVuelo: "visual",
  presurizacion: null,
  aerofrenos: null,
  frenosDeTierra: null,
  autofreno: false,
  cantosDeLaCarrera: null,
  tcas: null,
  avisosHablados: false,
  cuentaDeLaToma: null,
  cuentaSoloSinIls: false,
  cantaLosMinimos: false,
  ventanillas: null,
  // La VNE de la ficha, 167 kt (TCDS, III.8). No hay tren que sacar ni flaps.
  vmoKt: 167,
  vleKt: 167,
  vfePorMuesca: [],
  alivioDeFlaps: false,
  /*
   * **Las velocidades de un avión, puestas donde no molestan.** Un helicóptero
   * no tiene pérdida, ni rotación, ni decisión en la carrera: el juego las usa
   * para las bandas del anemómetro y los cantos de la carrera, y aquí no hay
   * carrera. La de aproximación es la de un helicóptero que se acerca a un
   * helipuerto, cuarenta nudos; las otras, por encima de la VNE, para que no
   * se canten nunca.
   */
  approachSpeed: 40 * NUDO,
  velocidadDeCircuito: 80 * NUDO,
  decisionSpeed: 170 * NUDO,
  rotationSpeed: 170 * NUDO,
  // Del morro al tren principal, de la ficha del rotor: 3,8 m y 1,5 m.
  batalla: 5.3,
  // El centro de gravedad sobre el suelo, que es donde el juego pone el origen.
  gearHeight: SUPER_PUMA.ruedas[0]!.z,
  trenRetractil: false,
  meteElTrenA: null,
  tardaElTren: null,
  maxGroundPitch: 0.15,
  minGroundPitch: -0.1,
  llevaFlaps: false,
  flapsLift: 0,
  flapsDrag: 0,
  muescasDeFlaps: [0],
  appearance: {
    ...LIBREA,
    // Cuatro palas en el principal (TCDS, III.4.2).
    blades: 4,
  },
  sound: {
    ...ARASUNU.sound,
    // Un turboeje suena a turbina, y de prestado el del turbohélice: el sonido
    // propio del helicóptero llega aparte (ADR 0026, paso 3).
    ruidos: { ...ARASUNU.sound.ruidos, tren: 0, flaps: null },
  },
  helicoptero: SUPER_PUMA,
};

/** Si esta aeronave es un helicóptero. */
export function esHelicoptero(a: AircraftConfig): boolean {
  return a.helicoptero !== undefined;
}
