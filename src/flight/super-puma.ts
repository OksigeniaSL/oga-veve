/**
 * **El Super Puma**: el AS 332 C1/L1, que desde 2016 se vende como H215. El
 * helicóptero grande de rescate de Canarias: el 802 Escuadrón del Ejército del
 * Aire lo vuela desde Gando, en Gran Canaria. Ver el ADR 0026.
 *
 * Cada número dice de dónde sale. Hay tres clases:
 *
 * - **De la ficha**: la hoja del certificado de tipo de la EASA (TCDS R.002,
 *   número 18, 7 de octubre de 2025) o la página técnica del H215 de Airbus.
 * - **Supuesto**: lo que ninguna ficha pública trae —la cuerda de la pala, las
 *   inercias, dónde van las ruedas—, puesto con un valor normal para un
 *   helicóptero de su tamaño. Se dice cuál es la referencia.
 * - **Ajustado**: lo que se elige para que el modelo dé lo que publica la ficha.
 *   Es el procedimiento del informe de la NASA: lo que no se sabe por dentro
 *   se ajusta con lo que se mide por fuera.
 */

import type { FichaDeHelicoptero } from "./helicoptero";

const GRADO = Math.PI / 180;
/** 265 vueltas por minuto, las nominales con motor (TCDS, III.9). */
const VUELTAS = (265 * 2 * Math.PI) / 60;

export const SUPER_PUMA: FichaDeHelicoptero = {
  id: "super-puma",
  // Peso máximo al despegue y al aterrizar: 8.600 kg (TCDS, III.12). Vacío: el
  // máximo menos la carga útil de 3.889 kg de la página de Airbus.
  masaMaxima: 8600,
  masaVacia: 8600 - 3889,
  /*
   * Medida en el modelo: la que sostiene quieto, sin viento, la estabilización
   * de estacionario, entre la de dentro del efecto suelo y la de fuera
   * (2,33° y 2,47° a dos metros; 2,35° y 2,85° a veinticinco). Morro arriba por
   * el mástil, que cae cinco grados hacia delante, y el lado derecho bajo por el
   * rotor de cola, que empuja a la izquierda.
   */
  actitudDeEstacionario: { cabeceo: 2.35 * GRADO, alabeo: 2.7 * GRADO },
  ciclicoDeEstacionario: { cabeceo: 0.27, alabeo: 0.2 },
  rotor: {
    // 15,60 m de diámetro y cuatro palas (TCDS, III.4.2).
    radio: 7.8,
    palas: 4,
    // Supuesto: 0,60 m, la de la familia del Puma; da una solidez de 0,098,
    // normal para un rotor de su clase.
    cuerda: 0.6,
    vueltas: VUELTAS,
    // Supuestos de manual para una pala de helicóptero: perfil de 5,7 por radián,
    // ocho grados de torsión y un 0,011 de resistencia.
    pendiente: 5.7,
    torsion: -8 * GRADO,
    cd0: 0.011,
    // En el sentido de las agujas del reloj visto desde arriba, como los rotores
    // de Aérospatiale y la mayoría de los europeos: al dar potencia el morro se va
    // a la izquierda y se pisa el pedal derecho.
    sentido: 1,
    // Supuestos: un número de Lock de 8, el de un rotor articulado de palas
    // metálicas y compuestas; la rigidez de un buje de articulaciones con un 4 %
    // de excentricidad y palas de unos cien kilos.
    lock: 8,
    rigidez: 180_000,
    // De la muestra de Gaudí (plano de tres vistas a la escala de la ficha, 11-11):
    // el plano de las palas a 4,30 m del suelo posado —la tapa del buje sobresale
    // hasta 4,72—, y el centro de gravedad, supuesto, a 1,8.
    alturaDelBuje: 2.5,
    bujeAdelante: 0,
    // Supuesto: el mástil cae cinco grados hacia delante, como en el Puma.
    inclinacionDelMastil: 5 * GRADO,
    // Supuesto: cuatro palas de unos 120 kg, más el buje.
    inercia: 10_000,
    // Ajustado: con el colectivo abajo del todo y a 70 kt sin motor, las vueltas
    // se quedan en 268 rpm al peso máximo y en 232 con 6.500 kg, dentro de lo que
    // permite la ficha sin motor (220 a 290, TCDS III.9). El máximo da para
    // sostenerse al peso máximo por encima del techo, donde lo que falta es
    // potencia y no paso.
    paso: { minimo: 9.5 * GRADO, maximo: 26 * GRADO },
    ciclico: { cabeceo: 10 * GRADO, alabeo: 7 * GRADO },
  },
  cola: {
    // 3,05 m de diámetro y cinco palas (TCDS, III.4.3).
    radio: 1.525,
    palas: 5,
    // Supuestos: la cuerda y una velocidad de punta de unos 205 m/s, la normal.
    cuerda: 0.19,
    vueltas: 205 / 1.525,
    pendiente: 5.7,
    torsion: 0,
    cd0: 0.012,
    // De la ficha: la «D-value» de Airbus, 18,70 m de la punta delantera del rotor
    // a la trasera del de cola, menos un radio de cada uno.
    brazo: 18.7 - 7.8 - 1.525,
    // De la muestra y el modelo: el buje del rotor de cola a 3,43 m del suelo, a la
    // derecha, para que la pala de arriba dé los 4,95 m de alto de la ficha.
    altura: 1.63,
    // Supuestos: el paso con los pies al centro y lo que mueve cada pedal a tope.
    // Con el derecho a fondo, el rotor de cola para vez y media el par de los dos
    // motores a plena potencia, que es el margen que se le pide para maniobrar.
    paso: { centro: 8 * GRADO, recorrido: 16 * GRADO },
  },
  fuselaje: {
    // Supuesto: 2,8 m² de placa plana de frente, del orden de un UH-60. Con eso, a
    // 136 kt —el crucero recomendado de Airbus— gasta un tercio más que en el
    // mínimo, que es lo que sale de su autonomía y su alcance. Ver el ADR.
    frente: 2.8,
    tren: 0.35,
    lado: 12,
    planta: 14,
    // Supuestos: del orden de los del UH-60 del informe de la NASA, que pesa casi
    // lo mismo y tiene el mismo largo.
    inercia: { xx: 9_000, yy: 45_000, zz: 40_000 },
  },
  // 3,79 m de envergadura del estabilizador (TCDS, III.4.1); la cuerda, supuesta.
  estabilizador: { area: 1.6, brazo: 8.5, pendiente: 3.5 },
  deriva: { area: 2.0, brazo: 9.0, altura: 1.5, pendiente: 3.0 },
  motores: {
    // Dos Makila 1A1 (TCDS, III.5.1), 1.357 kW de despegue cada uno (Airbus).
    cuantos: 2,
    potencia: 1_357_000,
    // Ajustado: la potencia cae casi como la densidad, y con esto el techo en
    // estacionario fuera del efecto suelo al peso máximo cae en los 2.300 m de
    // Airbus. El de dentro del efecto suelo no se ajusta: sale solo, y se mira en
    // las pruebas contra los 3.250 m de la misma página.
    caida: 1.07,
    // Supuesto: lo que se pierde en la caja de transmisión y los accesorios.
    rendimiento: 0.94,
    respuesta: 0.6,
    // Supuesto: medio minuto de arrancador, encendido y subida hasta la potencia de
    // vuelo. Con él, el rotor llega a sus vueltas a los 27 s de empezar.
    arranque: 30,
  },
  // De la muestra de Gaudí: las de morro 3,6 m por delante del mástil y las
  // principales 1,7 m por detrás, con unos 3,1 m de vía. El centro de gravedad,
  // supuesto bajo el mástil y a 1,8 m del suelo.
  // Supuestos: el freno del rotor para el rotor desde el 40 % de sus vueltas en
  // unos quince segundos, y no se pone por encima.
  frenoDelRotor: { par: 8_000, hasta: 0.4 },
  ruedas: [
    // La de morro se orienta sola: se rueda girando con los pedales.
    { x: 3.6, y: 0, z: 1.8, loca: true },
    { x: -1.7, y: -1.55, z: 1.8 },
    { x: -1.7, y: 1.55, z: 1.8 },
  ],
};
