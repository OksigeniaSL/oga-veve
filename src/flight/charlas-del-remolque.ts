/**
 * **Lo que se cuenta del remolque**, en cualquier vuelo de pasaje que salga
 * empujado de un puesto de contacto: el capítulo de Madrid y «Viajá con
 * Jazlyn». Ver `world/remolque.ts` y el ADR 0025.
 *
 * Son dos charlas y no momentos del guion: se dicen si el avión sale empujado,
 * y si sale de frente no pasa nada, que no hay nada que contar. Cada una es un
 * suceso, y cada suceso con su pregunta y su respuesta, una detrás de otra:
 *
 * - **Hacia atrás.** Lo primero que se nota desde la ventanilla es que la
 *   terminal se aleja hacia delante: se va de culo. Ara se da cuenta y
 *   pregunta quién empuja; la tripulante de cabina, a su lado, se lo cuenta:
 *   un tractor, porque desde la cabina no se ve lo que hay detrás, y para ir
 *   marcha atrás con los motores —las reversas, el «powerback»— habría que
 *   soplar contra el edificio. No se dice que un avión no pueda ir hacia
 *   atrás, porque puede, y quien lo aprenda tendría que desaprenderlo.
 * - **El saludo.** Al acabar, la persona de tierra se pone a la vista de la
 *   cabina, del lado de Ara, enseña el pasador con su cinta roja y saluda. Ara
 *   le pregunta por la cinta, y la tripulante le cuenta qué es: el pasador que
 *   deja la rueda de morro en manos del tractor, y que se enseña para que los
 *   pilotos vean que está fuera.
 *
 * Con calma, como todo lo de este juego: no es un aviso, es lo que pasa en
 * cualquier aeropuerto cada pocos minutos.
 */

import type { Linea } from "./conversacion";
import type { DefCharla } from "./motor-del-pasaje";
import { BALIZA_ANTES_DE_EMPUJAR } from "./vuelo-de-linea";

/** Lo empujado antes de que Ara se dé cuenta, s desde que el tractor arranca: ya se nota. */
const SE_NOTA_EL_EMPUJE = 5;

const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.${clave}` });
/** La tripulante, en persona, al lado del asiento: la de Canarias, de tú. */
const tripulante = (clave: string): Linea => ({ quien: "tripulacion", clave: `inicio.tripulacion.pasaje.cerca.${clave}` });

/** **Las dos charlas del remolque**, con los nombres que les dé cada guion. */
export function charlasDelRemolque<M extends string, C extends string>(ids: {
  readonly marchaAtras: C;
  readonly saludo: C;
}): DefCharla<M, C>[] {
  return [
    {
      id: ids.marchaAtras,
      tras: 0.5,
      cuando: (l) => l.remolque === "empujando" && l.tramo === "empujando" && l.enTramo >= BALIZA_ANTES_DE_EMPUJAR + SE_NOTA_EL_EMPUJE,
      // Si se acaba de empujar sin haberlo dicho, ya no: lo que se ve es otra cosa.
      caduca: (l) => l.remolque !== "empujando",
      lineas: [ara("marchaAtras"), tripulante("tractor")],
      mira: "ventanilla",
    },
    {
      id: ids.saludo,
      tras: 0.3,
      cuando: (l) => l.remolque === "saludando",
      // Rodando ya, la persona de tierra queda atrás.
      caduca: (l) => l.tramo !== "empujando" && l.tramo !== "arrancando",
      lineas: [ara("saluda"), tripulante("pasador")],
      mira: "ventanilla",
    },
  ];
}
