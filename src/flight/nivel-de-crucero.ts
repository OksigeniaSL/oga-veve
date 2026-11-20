/**
 * A qué altura se cruza: la regla semicircular.
 *
 * El cielo no es un sitio donde cada uno vuela a la altura que le apetece.
 * **La altura a la que se cruza la decide la derrota**, y por eso dos aviones
 * que van en sentidos contrarios por la misma ruta no se encuentran nunca a la
 * misma altura: uno va a ocho mil pies y el otro a nueve mil, y se ven pasar.
 *
 * Es de las reglas más bonitas que tiene la aviación para un juego como éste,
 * porque **se ve**. No hay que explicarla: quien vuele por una ruta y mire por
 * la ventana verá los que vienen de frente siempre por encima o siempre por
 * debajo, y el día que alguien se lo cuente ya lo sabía.
 *
 * ## La regla, tal cual, y que no es la misma en todas partes
 *
 * Se mira la derrota **magnética**. Un nivel es la altitud en centenares de
 * pies con la presión estándar puesta, así que el nivel 90 son nueve mil pies.
 * Aquí se trabaja en pies y se deja la conversión a quien pinte.
 *
 * - **La de la OACI** —Anexo 2, apéndice 3, «Tabla de niveles de crucero», y
 *   la misma en el apéndice 3 de SERA, Reglamento de Ejecución (UE)
 *   923/2012—: de **000° a 179°**, niveles **impares** —10, 30, 50… 290—; de
 *   **180° a 359°**, **pares** —20, 40, 60… 280—. Es la de Paraguay.
 * - **La de España** —AIP España, ENR 1.7, «Tabla de niveles de crucero»,
 *   enmienda 403/26 del 19-feb-2026—, que rige también en el FIR de Canarias:
 *   de **090° a 269°**, **impares**; de **270° a 089°**, **pares**. Es el
 *   semicírculo norte-sur y no el este-oeste, y no es una errata: hacia el sur,
 *   impares; hacia el norte, pares.
 *
 * Por encima del 290, con la separación reducida (RVSM), sigue la misma
 * alternancia de dos mil en dos mil hasta el 410. El juego no planea por
 * encima de `HASTA`.
 *
 * **Y una sola copia.** El plan —`cruceroDelPlan` en `ruta.ts`— contaba sus
 * niveles legales por su cuenta, empezando un millar más arriba de lo que
 * tocaba, y daba pares hacia el este e impares hacia el oeste (H49): de Los
 * Rodeos a La Palma subía a FL170 con derrota oeste. Las pruebas de aquí
 * estaban en verde porque miraban `nivelPara`, y el plan no lo usaba. Ahora
 * todo el que necesita un nivel lo saca de `nivelesDelSentido` o de
 * `nivelPara`, que leen el mismo `primerNivel`.
 *
 * ## Y el medio nivel de los que vuelan mirando fuera
 *
 * Quien vuela con reglas visuales suma quinientos pies: 35, 55, 75 en el
 * semicírculo de los impares; 45, 65, 85 en el de los pares. Es lo que separa
 * a los que van con un plan de los que van mirando, y es la razón de que las
 * avionetas pasen «entre» los niveles de los grandes. Ver `MEDIO_NIVEL`.
 */

/** Lo que sube o baja un nivel, en pies. */
export const UN_NIVEL = 1000;

/** Y lo que le suma quien vuela mirando por la ventana. */
export const MEDIO_NIVEL = 500;

/**
 * Hasta dónde planea este juego, en pies: el nivel 290. Por encima la regla
 * sigue —ver la cabecera—, pero lo que se dice por megafonía acaba aquí: ver
 * `ULTIMO_NIVEL` en `audio/partes-de-la-comandante.ts`.
 */
export const HASTA = 29000;

/** Qué tabla de niveles de crucero rige donde se vuela. Ver la cabecera. */
export type TablaDeNiveles = "oaci" | "espana";

/**
 * La tabla del país de un escenario: España tiene la suya, y Paraguay —y los
 * campos inventados, que están en Paraguay— la de la OACI.
 */
export function tablaDe(pais: "py" | "es" | "inventado"): TablaDeNiveles {
  return pais === "es" ? "espana" : "oaci";
}

/** El rumbo entre 0 y 360. */
function enLaVuelta(rumboGrados: number): number {
  return ((rumboGrados % 360) + 360) % 360;
}

/**
 * Si un rumbo va «hacia el este»: de 000 a 179. Solo dice eso; qué nivel le
 * toca lo dice `vaPorLosImpares`, que en España no parte por aquí.
 */
export function haciaElEste(rumboGrados: number): boolean {
  return enLaVuelta(rumboGrados) < 180;
}

/**
 * **Si a esta derrota magnética le tocan los niveles impares**, según la
 * tabla. Es la única pregunta de la regla; lo demás es contar de dos en dos.
 */
export function vaPorLosImpares(
  rumboGrados: number,
  tabla: TablaDeNiveles = "oaci",
): boolean {
  const r = enLaVuelta(rumboGrados);
  return tabla === "espana" ? r >= 90 && r < 270 : r < 180;
}

/**
 * El primer nivel de la tabla en ese sentido, en pies: el 10 o el 20, y con
 * el medio nivel de quien vuela mirando fuera, el 15 o el 25.
 */
function primerNivel(
  rumboGrados: number,
  visual: boolean,
  tabla: TablaDeNiveles,
): number {
  return (
    (vaPorLosImpares(rumboGrados, tabla) ? UN_NIVEL : 2 * UN_NIVEL) +
    (visual ? MEDIO_NIVEL : 0)
  );
}

/**
 * **Los niveles de la tabla para esta derrota**, en pies y de abajo arriba,
 * hasta `HASTA`: uno de cada dos millares.
 */
export function nivelesDelSentido(
  rumboGrados: number,
  visual = false,
  tabla: TablaDeNiveles = "oaci",
): number[] {
  const niveles: number[] = [];
  for (let n = primerNivel(rumboGrados, visual, tabla); n <= HASTA; n += 2 * UN_NIVEL)
    niveles.push(n);
  return niveles;
}

/**
 * El nivel de crucero que le toca a este rumbo, en pies.
 *
 * `pedido` es a qué altura se querría ir; devuelve **el nivel legal más
 * cercano** en el sentido en el que se vuela. Redondear al más cercano y no
 * hacia arriba es lo que hace que un avión que pide ocho mil doscientos con
 * rumbo este acabe en nueve mil y no en once mil.
 *
 * Nunca por debajo del primero de su sentido ni por encima del último, y los
 * dos topes son niveles de la tabla. Los de antes no lo eran: el de abajo era
 * un millar por encima del primero —un par hacia el este— y el de arriba
 * `HASTA` a secas, así que hacia el oeste se acababa en el 290, que es impar.
 *
 * `visual` suma el medio nivel de quien vuela mirando por la ventana.
 */
export function nivelPara(
  rumboGrados: number,
  pedido: number,
  visual = false,
  tabla: TablaDeNiveles = "oaci",
): number {
  const desde = primerNivel(rumboGrados, visual, tabla);
  const ultimo = Math.floor((HASTA - desde) / (2 * UN_NIVEL));
  const n = Math.round((pedido - desde) / (2 * UN_NIVEL));
  return desde + Math.max(0, Math.min(n, ultimo)) * 2 * UN_NIVEL;
}

/**
 * Si un avión va en el nivel que le toca, con la holgura de un altímetro.
 *
 * Doscientos pies: es lo que se admite como «mantiene nivel» en cualquier
 * cabina, y por debajo de eso nadie diría que alguien está fuera de su nivel.
 *
 * Sirve para enseñárselo a quien vuela, no para castigarle: en este juego las
 * normas se muestran, no se imponen.
 */
export function vaEnSuNivel(
  rumboGrados: number,
  pies: number,
  visual = false,
  tabla: TablaDeNiveles = "oaci",
): boolean {
  return Math.abs(pies - nivelPara(rumboGrados, pies, visual, tabla)) <= 200;
}
