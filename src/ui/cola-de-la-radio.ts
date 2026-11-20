/**
 * **La cola de la tira de la radio**: lo que espera turno para escribirse
 * mientras otra frase está a la vista. Ver `Hud.radio`.
 *
 * Vive aparte del HUD para poder probarse sin pantalla: es donde se perdía,
 * por la 30 de Los Rodeos con el JAZ 90 en el peldaño de cabina, la radio de
 * tierra entera —la autorización de la ruta, el «pushback and start-up
 * approved» y el «Cabina, tierra: empezamos a empujar»— (H48).
 */

/** Una frase que espera turno en la tira. `paraTi` como en `Hud.radio`. */
export interface FraseDeLaTira {
  readonly texto: string;
  readonly segundos: number;
  readonly paraTi: boolean | null;
}

/**
 * **Cuántas esperan como mucho.** Si la frecuencia corre más que eso, lo
 * viejo ya no importa: la tira no es un registro, es lo que se está diciendo.
 */
export const EN_COLA_COMO_MUCHO = 3;

/**
 * **Una más a la cola, y si no caben, se va primero lo de los demás.**
 *
 * Se iba la más vieja, fuera de quien fuera. Con la bienvenida de la comandante
 * esperando sitio, tu autorización de la ruta, el permiso de empujar y el
 * «empezamos a empujar» de la persona de tierra esperaban detrás; llegaron
 * tres frases del tráfico de la 30 —«viento en cola», «rodando», «hold
 * short»— y echaron a las tuyas. Lo que se oye para otro en la frecuencia es
 * ambiente; lo tuyo es lo que tienes que hacer, y para quien no oye, lo que no
 * se escribe no se dijo. Así que sobra antes lo de los demás (`paraTi:
 * false`), de lo más viejo a lo más nuevo; y solo sin nada de eso, lo más
 * viejo de lo que quede.
 */
export function encolarEnLaTira(cola: FraseDeLaTira[], nueva: FraseDeLaTira): void {
  cola.push(nueva);
  while (cola.length > EN_COLA_COMO_MUCHO) {
    const deOtro = cola.findIndex((f) => f.paraTi === false);
    cola.splice(deOtro >= 0 ? deOtro : 0, 1);
  }
}

/**
 * **Lo más que la frase a la vista guarda su turno esperando sitio**, ms, con
 * otras detrás.
 *
 * Si el reparto la deja esperando porque no cabe sin pisar un mando, su reloj
 * no corre —ver `ponerLaRadio` en `ui/hud.ts` y la enmienda H28g del ADR
 * 0030—: así no se va sin que nadie la vea. Pero una frase que no cabe nunca
 * no suelta el turno nunca, y todo lo que llega detrás espera para siempre y
 * se cae de la cola. Es un candado entre la tira y el reparto, y todo candado
 * lleva su red. La bienvenida de la comandante, de casi cuatrocientas letras,
 * esperó sitio desde el segundo 44 hasta el 111 en el peldaño de cabina,
 * mientras se empujaba el avión.
 *
 * Diez segundos: lo que tarda en leerse con calma una frase larga de la radio,
 * y lo que espera de verdad una frase que cabe, que es el rato de un aviso.
 * Pasados, deja pasar a la siguiente, que suele caber donde ella no.
 */
export const ESPERANDO_SITIO_COMO_MUCHO_MS = 10_000;

/** Si la frase que espera sitio deja pasar a la siguiente. Ver `ESPERANDO_SITIO_COMO_MUCHO_MS`. */
export function cedeElTurno(esperandoSitioMs: number, enCola: number): boolean {
  return enCola > 0 && esperandoSitioMs >= ESPERANDO_SITIO_COMO_MUCHO_MS;
}
