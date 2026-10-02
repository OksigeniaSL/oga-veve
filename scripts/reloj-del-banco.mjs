/**
 * **A qué reloj vuela el banco del vuelo entero en cada fase**: lo que se
 * acelera y lo que va a tiempo real, en un sitio que se puede probar sin
 * navegador. Lo usa `relojPara` en `verificar-vuelo-entero.mjs`.
 *
 * El banco corre el vuelo a ×3 para que quepa en diez minutos, y eso comprime
 * las fases —que van con el reloj del juego— pero **no el habla**, que va con
 * el de pared: una frase dura lo que dura. Donde las voces tienen una ventana
 * que es una fase, acelerarla es quitarles la ventana, y el banco da por
 * mudo lo que con el reloj de verdad suena. Es la trampa de siempre de este
 * banco; ver la memoria sobre la regla de medir.
 *
 * Dos ventanas, por eso, van a tiempo real:
 *
 * - **La carrera**, de la verde al aire. La torre dice ahí su autorización
 *   con la fraseología y el viento —dieciocho segundos largos de Taguató para
 *   arriba— y detrás va «tripulación, sentados para el despegue».
 *
 * - **Y en los aviones con megafonía, la tierra antes de salir**: del puesto
 *   al punto de espera. Ahí dice Jazlyn el crosscheck y la bienvenida, cada
 *   uno detrás de lo de la torre y la instructora, y la bienvenida se pierde
 *   si el rodaje se acaba antes de que le toque. Medido de Gran Canaria a Los
 *   Rodeos con el JAZ 90: sesenta y cuatro segundos de rodaje, que a ×3 eran
 *   veintiuno de pared; el crosscheck acabó justo al llegar a la doble raya,
 *   la torre dijo de seguido la roja, la verde y el despegue con el viento
 *   —veinticinco segundos sin hueco— y la bienvenida, que esperaba detrás, se
 *   retiró al empezar la carrera: «no sonaron: comandante.bienvenida». A
 *   tiempo real, detrás del crosscheck quedan cuarenta segundos de rodaje y
 *   la bienvenida suena entera antes de la doble raya. Ver
 *   `src/audio/bienvenida-en-gando.test.ts`.
 *
 * En un avión sin megafonía el rodaje sigue acelerado: no hay nadie con una
 * ventana que perder, y es tiempo de banco.
 */

/** Las fases de la carrera de despegue, de la verde al aire. */
export const DE_LA_CARRERA = Object.freeze([
  "autorizado",
  "back-taxi",
  "alineando",
  "despegando",
  "comprometido",
]);

/** Las de tierra antes de la verde, donde habla la megafonía. */
export const EN_TIERRA_ANTES_DE_SALIR = Object.freeze([
  "estacionado",
  "arrancando",
  "rodando",
  "esperando",
]);

/**
 * Si esa fase se vuela a tiempo real. `conMegafonia` es si el avión lleva
 * pasaje y comandante que le hable: ver `conPasaje` en `audio/megafonia.ts`.
 */
export function aTiempoReal(fase, conMegafonia) {
  return (
    DE_LA_CARRERA.includes(fase) ||
    (conMegafonia && EN_TIERRA_ANTES_DE_SALIR.includes(fase))
  );
}

/**
 * Lo mismo, como tabla por fase: es lo que se le pasa a la página, que no
 * puede importar módulos del banco.
 */
export function fasesATiempoReal(conMegafonia) {
  return [...DE_LA_CARRERA, ...EN_TIERRA_ANTES_DE_SALIR].filter((f) =>
    aTiempoReal(f, conMegafonia),
  );
}
