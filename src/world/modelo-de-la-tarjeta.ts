/**
 * **El avión de la tarjeta**: el mismo `.glb` que se vuela, montado por las
 * mismas piezas, sin la cabina.
 *
 * Enrique lo pidió con una condición: «un solo componente para el hangar y el
 * cuadro, no dos», y el encargo con otra, «reutiliza el mismo modelo, no
 * hagas otro». Así que aquí no se dibuja nada: se lee el fichero que lee el
 * juego —`leerElModelo`—, se coloca con `colocarModelo`, que le pone la
 * escala, los colores de la flota y la librea, y se le preparan con las
 * funciones de siempre las piezas que se mueven: las patas, los flaps, los
 * aerofrenos, el ala que se dobla, las hélices y las luces. Lo que se vea
 * moverse en la tarjeta es lo mismo que se mueve en el avión.
 *
 * Lo que **no** se le monta es la cabina —pantallas, relojes, botones, placa,
 * luz de dentro—: desde fuera no se ve, el parabrisas del modelo es opaco, y
 * es lo que más cuesta de montar. Se esconde con `esconderLoDeDentro`.
 */

import { Box3, Vector3, type Group, type Object3D } from "three";
import type { AircraftConfig } from "../flight/aircraft";
import {
  colocarModelo,
  discoDeHelice,
  ejesDeHelice,
  leerElModelo,
} from "./aeronave-modelo";
import { crearLucesDePosicion, type LucesDePosicion } from "./luces-de-posicion";
import { prepararPatas, type Patas } from "./patas";
import { prepararFlaps, type Flaps } from "./flaps";
import { prepararAerofrenos, type Aerofrenos } from "./aerofrenos";
import { prepararElAla, type AlaQueSeDobla } from "./ala-que-se-dobla";
import {
  esconderLoDeDentro,
  puntosDelAvion,
  type PuntoDelAvion,
} from "./puntos-del-avion";

export interface ModeloDeLaTarjeta {
  readonly grupo: Group;
  readonly helices: readonly Object3D[];
  readonly borrarHelices?: (cuanto: number) => void;
  readonly luces: LucesDePosicion;
  readonly patas: Patas | null;
  readonly flaps: Flaps | null;
  readonly aerofrenos: Aerofrenos | null;
  readonly ala: AlaQueSeDobla | null;
  readonly puntos: readonly PuntoDelAvion[];
  /** Lo que mide el avión dibujado, m: de punta a punta, de morro a cola y de alto. */
  readonly medidas: { readonly ancho: number; readonly largo: number; readonly alto: number };
  /** Cuántas mallas quedan a la vista. Para el banco. */
  readonly mallas: number;
}

/**
 * Monta el avión de la tarjeta sobre una escena ya leída. Aparte de la carga
 * para que las pruebas lo monten con el fichero leído del disco.
 */
export function montarModeloDeLaTarjeta(
  raiz: Object3D,
  a: AircraftConfig,
): ModeloDeLaTarjeta {
  // El mismo orden que `cargarModelo`: cada paso mide lo que dejó el anterior.
  const grupo = colocarModelo(raiz, a);
  const helices = ejesDeHelice(raiz);
  const luces = crearLucesDePosicion(a, raiz);
  grupo.add(luces.grupo);
  const puntos = puntosDelAvion(raiz, grupo, a);
  const mallas = esconderLoDeDentro(raiz);
  grupo.updateWorldMatrix(true, true);
  const caja = new Box3().setFromObject(raiz);
  const tam = caja.getSize(new Vector3());
  return {
    grupo,
    helices,
    borrarHelices: discoDeHelice(helices),
    luces,
    patas: prepararPatas(raiz),
    flaps: prepararFlaps(raiz),
    aerofrenos: prepararAerofrenos(raiz),
    ala: prepararElAla(raiz, grupo, a.alaQueSeDobla, luces.luces.puntos),
    puntos,
    medidas: { ancho: tam.x, largo: tam.z, alto: tam.y },
    mallas,
  };
}

/** Lee el `.glb` del avión y lo monta para la tarjeta, o `null` si no está. */
export async function cargarModeloDeLaTarjeta(
  a: AircraftConfig,
): Promise<ModeloDeLaTarjeta | null> {
  const raiz = await leerElModelo(a);
  return raiz ? montarModeloDeLaTarjeta(raiz, a) : null;
}
