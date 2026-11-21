/**
 * **La lámpara de la torre para quien sale**, con el avión en tierra: qué luz
 * le toca en cada fase del plan.
 *
 * Las luces son las de SERA (Reglamento (UE) 923/2012, apéndice 1, 3.1.1,
 * tabla AP 1-1), que son las del Anexo 2 de la OACI. A una aeronave en
 * tierra:
 *
 * - **roja fija**, «alto»: el punto de espera;
 * - **verde fija**, «autorizado para despegar»;
 * - **serie de destellos verdes**, «autorizado para rodaje».
 *
 * La verde fija y la autorización de despegue son la misma cosa dicha por
 * dos canales, así que se encienden juntas y una sola vez (H41h). A quien
 * tiene que remontar la pista antes de despegar, la torre no le da la de
 * despegar en la doble raya: le autoriza a remontar —«backtrack runway three
 * four», Doc 4444, 12.3.4.7 p; «regreso por pista tres cuatro», RD 1180/2018,
 * anexo V, 1.4.8 p— y le autoriza a despegar después, en otra transmisión,
 * cuando ha dado la vuelta: la autorización de despegue se da cuando el avión
 * está listo «and at or approaching the departure runway» (Doc 4444, 7.9.3.4),
 * y quien todavía tiene que rodar la pista entera hacia atrás no lo está. En
 * ningún ejemplo de la fraseología —OACI, española o el CAP 413 británico—
 * van las dos en la misma transmisión. Mientras remonta, rueda por la pista
 * con permiso de la torre: eso son los destellos verdes.
 *
 * Solo la decisión, sin DOM ni audio: la pinta y la dice `luzDeTorre` en
 * `game.ts`.
 */

/** La lámpara de la torre: fija, de destellos verdes o apagada. */
export type LuzDeLaTorre = "verde" | "roja" | "rodar" | null;

/**
 * La luz que toca en tierra antes de despegar.
 *
 * - `fase`: la del plan de vuelo.
 * - `verde`: si la torre ya dio la pista (`Vista.luzVerde`).
 * - `remontePorDelante`: si el plan tiene todavía una media vuelta del remonte
 *   por dar (`PlanDeVuelo.dondeSeGira`). Se baja al acabar la vuelta, que es
 *   cuando el avión ya mira hacia donde se despega.
 *
 * Fuera de las fases de salir en tierra, apagada: en el aire la verde quiere
 * decir otra cosa, y en la carrera ya no hay nada que mirar.
 */
export function luzDeLaSalida(
  fase: string,
  verde: boolean,
  remontePorDelante: boolean,
): LuzDeLaTorre {
  if (fase === "esperando") return "roja";
  if (!verde) return null;
  if (remontePorDelante && (fase === "autorizado" || fase === "back-taxi")) return "rodar";
  /*
   * Y en el back-taxi con la vuelta ya dada, también (H41j): es el medio
   * segundo que tarda en asentarse «alineando», y la lámpara se apagaba entre
   * los destellos y la verde fija. La verde fija sigue llegando en
   * «alineando», que es donde la mira la máquina de fases (`despegueDado`).
   */
  if (fase === "back-taxi") return "rodar";
  if (fase === "autorizado" || fase === "alineando") return "verde";
  return null;
}
