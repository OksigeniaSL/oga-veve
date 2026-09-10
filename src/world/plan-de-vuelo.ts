/**
 * El plan de vuelo: por dónde toca ir ahora y cómo se ve.
 *
 * Junta tres cosas que por separado no sirven de nada: el grafo del aeropuerto
 * —que sabe por dónde se va—, la máquina de fases —que sabe qué toca ahora— y
 * la pintura de la ruta —que es lo único de todo esto que ve quien juega.
 *
 * **La ruta se pinta en el suelo, no se cuenta.** Una flecha en el HUD o una
 * frase con la letra de la calle no le sirven a alguien de cuatro años. Una
 * raya de color en el asfalto que va desde las ruedas hasta donde hay que
 * llegar, sí: es la misma idea que el «follow me» de los aeropuertos de verdad,
 * el coche que sale delante del avión con un cartel.
 *
 * La existencia de este fichero es a propósito: `game.ts` ya tiene ochocientas
 * líneas y todo esto es una cosa sola con vida propia. Lo que `game.ts` ve son
 * cinco métodos.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  RingGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Aerodrome, Punto } from "./aerodrome";
import { aLaPolilinea, PARA_ENTRAR_Y_DESPEGAR } from "./aerodrome";
import {
  construirGrafo,
  nudoCercano,
  rodajeEntre,
  type Grafo,
  type Ruta,
  type Tramo,
} from "./rodaje";
import { delante, enEjesDePista, puntoDePista, traves } from "./rumbo";
import {
  GUION,
  Vuelo,
  type Fase,
  type Paso,
  type Situacion,
} from "../flight/vuelo";
import type { FlightState } from "../flight/model";

/**
 * Ancho de la raya que marca la ruta, m.
 *
 * Uno y medio. Con cuatro parecía un río verde de orilla a orilla de la calle;
 * con dos **tapaba las letras pintadas en el asfalto**, que son justo lo que
 * hay que aprender a leer ahí: «la línea a seguir es gruesa y tapa las marcas
 * de la pista (las letras) y creo que eso es un elemento que el jugador debe
 * ver». Tiene razón: la ayuda no puede esconder la lección.
 */
const ANCHO = 1.5;

/**
 * Cuánto se levanta la raya sobre el **terreno**, m.
 *
 * Cuarenta y cinco centímetros: justo por encima del pavimento, que sobresale
 * treinta y cinco del terreno aplanado.
 *
 * **Lo que la mantiene visible no es la altura, es el desplazamiento de
 * polígono.** Separar cosas coplanares subiéndolas funciona de cerca y falla
 * de lejos: con el fondo de profundidad repartido entre sesenta centímetros y
 * veintidós kilómetros, a doscientos metros ya no distingue medio metro y las
 * superficies se pelean fotograma a fotograma. Es lo que se veía como «el
 * suelo tiembla y salen parches», y subir más la raya no lo arregla — solo la
 * despega del asfalto y la deja flotando.
 */
const ALTURA = 0.45;

/**
 * Los tres colores de la raya: **la línea de conducción**.
 *
 * Es el patrón de los juegos de coches —la *braking line* de Forza, la de Gran
 * Turismo— y contesta dos preguntas con una sola cosa: por dónde se va y a qué
 * velocidad. Verde donde se puede rodar, ámbar donde hay que aflojar, rojo
 * donde hay que parar.
 *
 * Sin esto, la raya era verde de punta a punta y quien la seguía no tenía
 * **ninguna** forma de saber si iba rápido o lento, ni que se acercaba a la
 * doble raya. Se lo preguntó la primera persona que jugó: «¿quién me indica si
 * voy muy rápido o lento en rodadura?». Nadie.
 *
 * No es el amarillo de rodadura: aquello es el aeropuerto y esto es tu ruta de
 * hoy. Confundirlos sería enseñar mal.
 */
const VERDE: readonly [number, number, number] = [0.325, 0.776, 0.42];
const AMBAR: readonly [number, number, number] = [0.91, 0.694, 0.23];
const ROJO: readonly [number, number, number] = [0.79, 0.29, 0.24];

/**
 * Velocidad de rodaje cómoda en recta, m/s. Unos cuarenta y siete por hora.
 *
 * Un avión rueda en recta hasta a treinta nudos —cincuenta y cinco por hora—,
 * así que cuarenta es realista y no es un atajo. Con treinta, los dos
 * kilómetros de plataforma a cabecera de Silvio Pettirossi eran cuatro minutos
 * de reloj por cada sentido, y eso a un niño de cuatro años se le hace
 * eterno: «es mucho rato en rodadura salir y entrar, la verdad».
 *
 * La otra mitad del problema no se arregla con velocidad sino con viento: la
 * cabecera en uso la elige el viento, y en Silvio Pettirossi la contraria está
 * al lado de la plataforma. Eso está apuntado aparte.
 *
 * **Y trece, no once**, después de cronometrarlo entero: «voy a una velocidad
 * absurdamente lenta, es aburrido pasarse cuatro minutos en una pista, eso un
 * niño no lo aguanta». Trece son cuarenta y siete por hora, todavía por debajo
 * de los treinta nudos a los que rueda un avión de verdad en recta, y es
 * también la velocidad del coche que te lleva: seguirle es ir bien.
 */
export const CRUCERO = 13;

/**
 * Pista que tiene que quedar por delante para salir por una intersección, m.
 *
 * Mil doscientos. La Óga 172 despega en cuatrocientos cincuenta medidos en el
 * banco, así que esto es casi el triple: sitio para el despegue, para un
 * despegue mal hecho y para arrepentirse a mitad. Un piloto de verdad hace
 * esta misma cuenta antes de aceptar una salida por intersección.
 */
const PISTA_QUE_HACE_FALTA = 1200;

/**
 * Cuánto hay que apartarse del borde de la pista para esperar, m.
 *
 * Cuarenta: el punto de espera de un aeródromo pequeño está entre treinta y
 * cinco y cincuenta metros del eje, y lo que importa aquí es que el avión
 * quepa entero fuera con sitio de sobra para que la torre lo vea parado.
 */
const FUERA_DE_LA_PISTA = 40;

/**
 * Lo lejos que puede quedar un punto de espera publicado del asfalto que
 * conocemos, m.
 *
 * Cuarenta: el ancho de la boca de una calle donde se une a la pista. Más que
 * eso ya no es «nos falta el dibujo del trocito», es campo.
 */
const SALTO_A_LA_ESPERA = 40;

/**
 * Lo menos que se rueda de un puesto a la pista, m.
 *
 * Sesenta. Lo que esto descarta son los pares degenerados: un puesto y un
 * punto de espera que caen sobre el mismo nudo del grafo dan una «ruta» de dos
 * puntos y cero metros, que es la mejor de todas y va por encima de la hierba.
 *
 * **Estaba en doscientos y era demasiado**, con un argumento que sonaba bien
 * —«rodar es la lección, y una lección de veinte segundos no se aprende»— y
 * que en un aeródromo de verdad para avionetas es falso: en Yvytu Rape el
 * puesto está a ciento cincuenta metros del punto de espera porque **así son
 * esos campos**, y con el listón en doscientos el juego descartaba el
 * aeródromo entero y arrancaba el avión ya autorizado en la pista. De que la
 * ruta sea un camino y no un salto se encarga el número de puntos.
 */
const LO_MINIMO_QUE_SE_RUEDA = 60;

/**
 * Lo más que puede haber entre una punta de la ruta y el asfalto, m.
 *
 * **Ciento diez, y el número lo puso Yvytu Rape.** Con ochenta —que parecía
 * de sobra mirando los aeropuertos grandes, donde el puesto está a uno o dos
 * metros de su calle— el campo de la granja se quedaba fuera por tres metros:
 * su enganche mide 83, porque en un campo de hierba el puesto está donde cabe
 * y la calle donde se pueda. El juego volvía a arrancar el vuelo ya
 * autorizado y con el motor en marcha, que es exactamente el fallo que este
 * filtro venía a arreglar en otro sitio.
 *
 * Ciento diez deja pasar los enganches de verdad —1 m en Guaraní, 39 en el
 * Chaco, 83 en la granja— y sigue descartando el atajo por el campo, que
 * cuando aparece son cientos de metros en línea recta.
 */
const MAXIMO_ENGANCHE = 110;

/**
 * Dónde se da por hecho que el avión ha dejado de correr al aterrizar, m.
 *
 * Mil metros pasado el umbral. La Óga 172 para en bastante menos, pero lo que
 * se busca con este número no es una toma concreta: es el sitio desde el que
 * se mide **cuánto se rueda hasta casa** al elegir el puesto.
 */
const TRAS_TOMAR_TIERRA = 1000;

/** Metros que tiene que quedar por delante para poder tomar una salida. */
const HUECO_PARA_GIRAR = 25;

/**
 * Lo estrecha que puede ser una pista y aun así admitir un back-taxi, m.
 *
 * Treinta y seis. La maniobra se rueda por una raya apartada del eje y se
 * vuelve **por el eje**, así que lo que separa la ida de la vuelta es esa
 * apartada: medio ancho menos cuatro metros de borde. Con treinta y seis
 * salen catorce, más que la envergadura de la Óga 172, y por debajo de eso
 * las dos rayas dejan de ser dos.
 *
 * Lo puso Yvytu Rape, que son dieciocho metros de hierba: ahí quedaban a
 * cinco, y medido con el banco el avión entraba, se enganchaba a la raya de
 * vuelta antes de haberse ido, daba media vuelta sobre sí mismo y se
 * plantaba. En campos así se hace lo de siempre —se entra donde muere la
 * calle y se despega con lo que queda—, que es menos elegante y es lo que se
 * puede enseñar sin mentir. Ver #151.
 */
export const ANCHO_PARA_LA_VUELTA = 36;

/**
 * Pista que se procura dejar por delante al entrar, m.
 *
 * Cuatrocientos: la Óga 172 despega en doscientos sesenta medidos en el banco,
 * así que esto es esa carrera con la mitad de propina. En una pista corta se
 * usa el cuarenta por ciento de lo que haya, que es lo que se puede prometer
 * sin empujar la entrada fuera del asfalto.
 */
const PARA_DESPEGAR = 400;

/**
 * Lo más que se rueda para ir a despegar, m.
 *
 * Setecientos: a velocidad de rodaje, minuto y medio largo. Es lo que aguanta
 * la paciencia de quien tiene cuatro años y todavía no ha volado.
 */
const LO_MAXIMO_DE_IDA = 700;

/** Cada cuánto se mira si la raya sigue sirviendo, s. */
const CADA_CUANTO_SE_REHACE = 2;

/**
 * A partir de cuántos metros de la raya se considera que ya no vas por ella, m.
 *
 * Veinticinco: más de media calle de rodaje. Menos que eso es ir por la raya
 * torcido, que no es motivo para recalcular nada.
 */
const LEJOS_DE_LA_RAYA = 25;

/**
 * Cuánto puede estar el avión de una calle para que valga la ruta de entrada, m.
 *
 * Cuarenta: medio ancho de calle y un margen. Si está más lejos, el primer
 * tramo de la ruta sería un salto por el campo, y para eso ya está la recta
 * de emergencia — que al menos apunta al sitio correcto. Ver `entradaEnPista`.
 */
const LEJOS_DE_LA_CALLE = 40;

/**
 * Y cuánto se le perdona al **destino** de la ruta de entrada, m.
 *
 * Cuatrocientos, que es mucho a propósito: el destino es un punto del eje de
 * la pista y los nudos de la pista solo están donde se le cose una calle, así
 * que puede quedar a doscientos metros del más cercano. El trozo que los une
 * va por el eje, o sea por asfalto, y por eso aquí sí se puede ser generoso.
 */
const HASTA_EL_EJE = 400;

/**
 * Aceleración y frenada cómodas rodando, m/s².
 *
 * Estaba en 0,9, que es una cifra de autobús con gente de pie, y con las dos
 * pasadas del perfil de velocidad eso se nota mucho: para volver de un codo a
 * velocidad de crucero hacían falta setenta y cuatro metros, así que en una
 * plataforma con codos cada treinta el avión no levantaba de los seis metros
 * por segundo en todo el rodaje. Con 1,6 —lo que frena un coche sin que se
 * caiga nada del asiento— son cuarenta metros, y entre codo y codo se
 * recupera.
 */
const FRENADA = 1.6;

/**
 * El radio con el que se redondean los codos de la ruta, m.
 *
 * El grafo de rodaje da esquinas de verdad: dos rectas que se encuentran en un
 * punto y giran noventa grados de golpe. Un avión no hace eso, y la raya
 * tampoco debería pedirlo. Dieciocho metros es un giro que un ligero toma
 * cómodo, y es lo que hace que la curva **se pueda seguir** en vez de tener que
 * adivinarla.
 */
const RADIO_CURVA = 18;

/**
 * Aceleración lateral cómoda en tierra, m/s².
 *
 * De aquí sale la velocidad de cada curva: `v = √(a·r)`. Es la misma cuenta que
 * usa un coche para saber a qué velocidad entra en un peralte, y tiene la
 * ventaja de que **no depende de cómo esté troceada la ruta**. Antes la
 * velocidad salía del ángulo de cada vértice, y eso significaba que redondear
 * un codo —repartir el mismo giro entre veinte puntos— lo convertía en recta a
 * ojos del cálculo. El radio no se deja engañar.
 *
 * **Estaba en 1,2 y era una cifra de coche de línea.** El propio modelo de
 * vuelo tolera seis metros por segundo al cuadrado rodando —ver
 * `DE_LADO_RODANDO`—, así que el plan pedía ir cinco veces más despacio de lo
 * que el avión aguanta, y cada codo de la ruta se tomaba a paso de peatón. Con
 * 2,5 una curva de dieciocho metros se toma a siete y medio y una de cuarenta,
 * a la velocidad de crucero, que es como se rueda de verdad.
 */
const LATERAL = 2.5;

/** Lo más despacio que se pide rodar. Por debajo, una curva parece una parada. */
const MINIMO_EN_CURVA = 6;

/**
 * Lo más largo que se deja un tramo de la raya, m.
 *
 * El color va en los vértices y la tarjeta gráfica lo interpola por el medio,
 * así que **un tramo largo es una degradación larga**. En Tenerife el último
 * iba de un vértice al siguiente en novecientos treinta y cinco metros: el rojo
 * de la doble raya se repartía por casi un kilómetro de rodadura y lo que se
 * veía no era ni verde ni rojo, era un salmón uniforme que no dice nada. El
 * aviso de parar tiene que aparecer donde hay que parar.
 *
 * Veinticinco metros es también lo que hace que el color se lea como un semáforo
 * y no como un degradado. Cuesta unos ochenta vértices por ruta, que a estas
 * alturas no es nada.
 */
const PASO_MAXIMO = 25;

/** Por encima de esto respecto a lo que toca, se avisa de que se va rápido. */
const MARGEN = 1.6;

/**
 * El colchón de la cuenta de frenada, m.
 *
 * Sin él, el aviso salta exactamente cuando ya no queda margen, que es tarde:
 * hay que enterarse, decidir y mover la mano. Quince metros a velocidad de
 * rodaje son un segundo y medio.
 */
const HOLGURA = 15;

/**
 * A cuántos metros del final la ayuda de dirección suelta el mando, m.
 *
 * De aquí adentro ya se ve la doble raya pintada en el suelo y parar encima es
 * lo que hay que aprender. Y sobre todo: apuntando a un punto que ya se ha
 * pasado, la ayuda manda girar a buscarlo eternamente.
 */
const LLEGADA_SIN_AYUDA = 25;

/**
 * A qué distancia de la raya la ayuda de dirección deja de ayudar, m.
 *
 * Una calle de rodaje y su margen. Más lejos que eso, uno no se ha desviado:
 * está en otro sitio, y llevarlo de vuelta a la fuerza no es ayudar.
 */
const SIN_AYUDA_FUERA = 60;

/**
 * Lo más que puede mandar la ayuda de dirección, de 0 a 1.
 *
 * Sin tope, este proporcional pedía **alerón a fondo a veinte metros de la
 * raya**, y en una curva con el mando suelto el desvío crece solo: corregir el
 * desvío y girar por ti pasaban a ser la misma cosa.
 *
 * El número salió de medir con `scripts/verificar-asistencia.mjs`, que rueda
 * sin tocar nada y anota cuánto se aparta cada peldaño. Con y sin tope,
 * Guyrami da el mismo desvío —catorce metros de máximo, once al final—, así
 * que el tope no le quita nada a quien lo necesita: lo que quita es el alerón
 * a fondo del que se ha ido lejos, que es de donde salía la sensación del imán.
 *
 * Y de paso quedó medido que **Guyrami no cumple su promesa**: catorce metros
 * es fuera de la calle, y ese peldaño existe para llevarte. Eso es otro
 * arreglo y tiene su issue.
 */
const TOPE_DE_AYUDA = 0.7;

/**
 * A partir de qué error de rumbo la ayuda deja de ayudar, en radianes.
 *
 * Setenta grados. Por debajo es una curva de calle de rodaje —cerrada, pero
 * una curva—; por encima ya no se está corrigiendo un rumbo, se está pidiendo
 * media vuelta, y eso no lo hace una ayuda: lo hace quien pilota. Ver
 * `asistencia`.
 */
const VUELTA_EN_U = (70 * Math.PI) / 180;

export interface Vista {
  readonly fase: Fase;
  readonly clave: string;
  readonly icono: string;
  readonly luzVerde: boolean;
  /** La letra de la calle por la que toca ir, si la hay. */
  readonly letra: string | null;
  /** A qué velocidad habría que ir aquí, m/s. */
  readonly velocidadSugerida: number;
  /** Va bastante más rápido de lo que toca. */
  readonly rapido: boolean;
  /** Metros que faltan para el final del tramo actual. */
  readonly restante: number;
  /**
   * Metros del avión a la raya verde.
   *
   * Se saca aquí porque **salirse de la ruta no cambia de fase pero sí cambia
   * lo que hay que decirte**: la máquina de estados no retrocede —eso hacía que
   * el tutor se contradijera cada dos segundos— y en cambio esto sí sirve para
   * avisar de que hay que volver a la línea.
   */
  readonly fuera: boolean;
  readonly cambio: boolean;
  /** Se acaba de entrar en la pista sin permiso. */
  readonly saltoLaLuz: boolean;
}

/** A cuántos metros de la raya verde se considera que uno se ha salido. */
const FUERA_DE_RUTA = 30;

/**
 * Cuánto se le perdona retroceder, además de lo que el avión se ha movido.
 *
 * Dos metros: lo que puede bailar la proyección entre fotogramas por las
 * curvas redondeadas de la ruta y por el propio muestreo. No es una tolerancia
 * a equivocarse, es el ruido de la cuenta.
 */
const HOLGURA_DEL_AVANCE = 2;

/** Por dónde va el avión en su ruta. */
export interface EnLaRuta {
  /** Metros de ruta recorridos hasta el punto más cercano. */
  readonly recorrido: number;
  /** Y los que quedan. */
  readonly restante: number;
  /** A qué distancia queda la raya, en perpendicular. */
  readonly aLaRaya: number;
}

/**
 * Por dónde va el avión en la ruta, sin poder saltar a otro trozo del camino.
 *
 * ## El fallo que arregla
 *
 * Buscar el tramo **más cercano en perpendicular** parece la respuesta obvia y
 * es correcta solo mientras la ruta no se pise a sí misma. En cuanto se dobla
 * —y se dobla siempre que un aeródromo tiene una sola calle de rodaje, porque
 * se va y se vuelve por ella— hay dos tramos igual de cerca del avión, y uno
 * de los dos dice que quedan trescientos metros cuando quedan cinco.
 *
 * Se midió en Mariscal Estigarribia, que tiene exactamente esa forma: el avión
 * rodando hacia la doble raya a 6,7 m/s y la cuenta de lo que faltaba
 * **subiendo** —281 metros, 300, 307, 315—. La fase no llegaba nunca a
 * «esperando», la torre no autorizaba nunca, y el aeródromo entero se quedó
 * fuera de la lista de escenarios por esto. Ver #151.
 *
 * ## Y por qué la tolerancia es lo que se ha movido y no un número
 *
 * El primer arreglo permitía retroceder hasta veinticinco metros —«rodando se
 * puede retroceder un poco»— y **no arregló nada**: medido, el resbalón era de
 * veinte metros y pasaba por debajo del umbral, y luego otros veinte, y otros.
 * Una tolerancia fija se la come cualquier deslizamiento gradual.
 *
 * Lo que no admite discusión es la física: entre dos fotogramas, el avance por
 * la ruta no puede cambiar más de lo que el avión se ha movido. Con eso,
 * parado no se mueve nada —que es justo el caso de la doble raya— y rodando a
 * siete metros por segundo se mueve un palmo por fotograma. Y un avión
 * teletransportado —un banco que lo coloca, un reinicio en el aire— trae un
 * `movido` enorme, así que la ventana se abre sola y vuelve a engancharse
 * donde toca sin ningún caso especial.
 */
export function avanzarEnRuta(
  ruta: readonly Punto[],
  p: Punto,
  avanceAnterior = 0,
  movido = Infinity,
): EnLaRuta {
  if (ruta.length < 2) return { recorrido: 0, restante: 0, aLaRaya: 0 };

  let total = 0;
  const largos: number[] = [];
  for (let i = 0; i < ruta.length - 1; i++) {
    const largo = Math.hypot(
      ruta[i + 1]![0] - ruta[i]![0],
      ruta[i + 1]![1] - ruta[i]![1],
    );
    largos.push(largo);
    total += largo;
  }

  /*
   * Se miran todos los tramos y se apuntan dos candidatos: el más cercano de
   * todos, y el más cercano **de los que no van hacia atrás**.
   *
   * Hacia adelante no se restringe nada, y eso costó una regresión: la primera
   * versión puso una ventana simétrica —no más de lo que el avión se ha
   * movido, ni adelante ni atrás— y frenó también el avance legítimo. En una
   * curva redondeada la ruta es más larga que la cuerda, así que el avance por
   * la polilínea corre más que el avión y la ventana lo dejaba atrás. Medido
   * en Tenerife Norte: el avión a dos metros del final y el plan creyendo que
   * quedaban cuarenta y seis, justo un metro por encima del umbral que cambia
   * la fase. Un aeródromo que funcionaba, roto por el arreglo de otro.
   *
   * Y no hace falta: **el fallo es un salto hacia atrás**. En un empate gana
   * el primero que se encuentra, que es el tramo de ida —el de menos recorrido—
   * y por eso la cuenta se iba hacia atrás y nunca hacia adelante.
   */
  const noAntesDe = avanceAnterior - movido - HOLGURA_DEL_AVANCE;
  let deTodos = { d: Infinity, recorrido: 0 };
  let sinRetroceder = { d: Infinity, recorrido: 0 };
  let acumulado = 0;
  for (let i = 0; i < ruta.length - 1; i++) {
    const a = ruta[i]!;
    const b = ruta[i + 1]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(
      0,
      Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2),
    );
    const d = Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
    const recorrido = acumulado + t * largos[i]!;
    if (d < deTodos.d) deTodos = { d, recorrido };
    if (d < sinRetroceder.d && recorrido >= noAntesDe) {
      sinRetroceder = { d, recorrido };
    }
    acumulado += largos[i]!;
  }

  // Y si no queda ninguno, es que el avión no está donde creíamos: se vuelve a
  // empezar por el más cercano en vez de defender una cuenta que ya no
  // describe nada. Pasa siempre en una ruta de un solo tramo, donde tampoco
  // hay ambigüedad de la que protegerse.
  const elegido = sinRetroceder.d < Infinity ? sinRetroceder : deTodos;
  return {
    recorrido: elegido.recorrido,
    restante: Math.max(0, total - elegido.recorrido),
    aLaRaya: elegido.d,
  };
}

/**
 * Redondea los codos de una polilínea y dice el radio de cada punto.
 *
 * Cada esquina interior se sustituye por un filete: se retrocede un poco por
 * cada tramo y se une con una Bézier cuadrática, que a estos radios es un arco
 * a todos los efectos y no obliga a resolver el centro del círculo.
 *
 * El filete nunca se come más del cuarenta y cinco por ciento de ninguno de los
 * dos tramos que une. Sin ese tope, dos codos seguidos y cercanos —que en una
 * plataforma los hay— se solapaban y la raya se cruzaba consigo misma.
 *
 * Devuelve también el radio en cada punto porque **quien pinta y quien calcula
 * la velocidad necesitan lo mismo**, y calcularlo dos veces era justo lo que
 * hacía que no coincidieran.
 */
function redondear(
  pts: readonly Punto[],
  radio: number,
): { puntos: Punto[]; radios: number[] } {
  if (pts.length < 3)
    return {
      puntos: pts.map((p) => [...p] as Punto),
      radios: pts.map(() => Infinity),
    };

  const puntos: Punto[] = [[...pts[0]!] as Punto];
  const radios: number[] = [Infinity];

  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const c = pts[i + 1]!;
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    if (l1 < 0.01 || l2 < 0.01) continue;

    const u1: Punto = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1];
    const u2: Punto = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
    const giro = Math.acos(
      Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])),
    );

    // Casi recto: no hay codo que redondear y meter puntos solo gasta.
    if (giro < 0.05) {
      puntos.push([...b] as Punto);
      radios.push(Infinity);
      continue;
    }

    const media = Math.tan(giro / 2);
    const retroceso = Math.min(radio * media, l1 * 0.45, l2 * 0.45);
    const r = retroceso / media;
    const p1: Punto = [b[0] - u1[0] * retroceso, b[1] - u1[1] * retroceso];
    const p2: Punto = [b[0] + u2[0] * retroceso, b[1] + u2[1] * retroceso];

    // Un punto cada quince grados de giro, y nunca menos de dos.
    const pasos = Math.max(2, Math.round(giro / 0.26));
    for (let k = 0; k <= pasos; k++) {
      const t = k / pasos;
      const m = (1 - t) * (1 - t);
      puntos.push([
        m * p1[0] + 2 * (1 - t) * t * b[0] + t * t * p2[0],
        m * p1[1] + 2 * (1 - t) * t * b[1] + t * t * p2[1],
      ] as Punto);
      radios.push(r);
    }
  }

  puntos.push([...pts[pts.length - 1]!] as Punto);
  radios.push(Infinity);

  // Y se trocean las rectas largas. Los puntos que se meten van con radio
  // infinito porque están sobre una recta: solo sirven para que el color
  // cambie donde toca en vez de degradarse durante un kilómetro.
  const densos: Punto[] = [puntos[0]!];
  const densosRadios: number[] = [radios[0]!];
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]!;
    const b = puntos[i]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const trozos = Math.ceil(l / PASO_MAXIMO);
    for (let k = 1; k < trozos; k++) {
      const t = k / trozos;
      densos.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
      ] as Punto);
      densosRadios.push(Infinity);
    }
    densos.push(b);
    densosRadios.push(radios[i]!);
  }
  return { puntos: densos, radios: densosRadios };
}

export class PlanDeVuelo {
  readonly grupo = new Group();
  private readonly grafo: Grafo;
  private readonly vuelo = new Vuelo();
  private ruta: Ruta | null = null;
  /** La ruta en coordenadas de mundo, que es donde vive el avión. */
  private rutaMundo: Punto[] = [];
  /**
   * Cuánta ruta se lleva recorrida, en metros. Se acuerda entre fotogramas.
   *
   * Es lo que impide que la proyección salte a un tramo anterior cuando la
   * ruta se dobla sobre sí misma. Ver `avanzarEnRuta`.
   */
  private avance = 0;
  /** Y dónde estaba el fotograma anterior, para saber cuánto se ha movido. */
  private dondeEstaba: Punto | null = null;
  /** El radio de giro en cada punto de la ruta. `Infinity` donde va recta. */
  private radios: number[] = [];

  constructor(
    private readonly aero: Aerodrome,
    private readonly pista: {
      x: number;
      z: number;
      heading: number;
      width: number;
      length: number;
    },
    private readonly cota: (x: number, z: number) => number,
  ) {
    this.grupo.name = "plan-de-vuelo";
    this.grafo = construirGrafo(aero);
  }

  /** Que la torre no autorice nunca: es la lección de rodar. */
  set soloRodaje(si: boolean) {
    this.vuelo.acabaEnLaEspera = si;
  }

  /**
   * El puesto que se está usando de verdad, si no es el que tocaba por cercanía.
   *
   * Lo pone `reiniciarDesde` cuando el juego encuentra que el mejor puesto tiene
   * un avión aparcado encima en la fotografía. Sin esto, la ruta salía del
   * puesto nuevo y el avión aparecía en el viejo — dentro del Boeing.
   */
  private puestoElegido: Punto | null = null;
  /**
   * Todos los pares que se consideraron, con sus metros. **Para medir**: sin
   * esto, discutir si el rodaje se puede acortar es discutir de memoria.
   */
  paresVistos: readonly { ref: string | null; ida: number; viaje: number }[] =
    [];
  /** El par puesto + espera con el que menos se rueda. Ver `parDeSalida`. */
  private par:
    | { puesto: { ref: string | null; xy: Punto }; espera: Punto }
    | null
    | undefined;

  /** Dónde empieza el vuelo: el puesto de estacionamiento, si lo hay. */
  arranque(): readonly [number, number] | null {
    if (this.puestoElegido)
      return [this.puestoElegido[0], -this.puestoElegido[1]];
    const puesto = this.puestoDeSalida();
    return puesto ? [puesto.xy[0], -puesto.xy[1]] : null;
  }

  /**
   * El puesto del que se sale.
   *
   * El más cercano a la terminal si la hay, y si no el primero. No se elige al
   * azar: **el sitio del que se sale tiene que ser el mismo siempre**, porque
   * quien juega se lo aprende, y un aeropuerto que te cambia el puesto cada
   * partida no se aprende nunca.
   */
  /**
   * Todos los puestos, del mejor al peor.
   *
   * Existe porque el mejor puede estar ocupado. En la fotogrametría están
   * congelados los aviones que había el día que Google voló, y el puesto que
   * sale de esta cuenta en Tenerife tiene encima un avión de línea: el nuestro
   * aparecía dentro de él. Con la lista se puede ir bajando hasta encontrar uno
   * libre.
   */
  puestosPorOrden(): readonly { ref: string | null; xy: Punto }[] {
    const puestos = this.aero.parkingPositions;
    if (!puestos?.length) return [];
    const cabecera = this.cabeceraDeSalida();
    return [...puestos].sort(
      (a, b) =>
        Math.hypot(a.xy[0] - cabecera[0], a.xy[1] - cabecera[1]) -
        Math.hypot(b.xy[0] - cabecera[0], b.xy[1] - cabecera[1]),
    );
  }

  /** Empieza el vuelo desde un puesto concreto, no del que toca por cercanía. */
  reiniciarDesde(puesto: Punto): boolean {
    const espera = this.esperaDeSalida();
    if (!espera) return false;
    /*
     * **Primero se busca la ruta y solo después se cambia nada.**
     *
     * Antes se apuntaba el puesto nuevo y se pedía la ruta a continuación; si
     * no había —hay puestos de OpenStreetMap que no llegan a conectar con
     * ninguna calle de rodaje—, el juego se quedaba arrancando de un sitio del
     * que no sabía salir: el avión aparecía allí y **la raya verde no se
     * pintaba**. Se vio en Tenerife Norte, en un puesto por lo demás perfecto.
     */
    const ruta = rodajeEntre(this.grafo, puesto, espera);
    if (!ruta) return false;
    this.puestoElegido = puesto;
    this.vuelo.reiniciar(false);
    this.destino = "espera";
    this.ultimaPos = puesto;
    this.ponerRuta(ruta);
    return true;
  }

  private puestoDeSalida(): { ref: string | null; xy: Punto } | null {
    const puestos = this.aero.parkingPositions;
    if (!puestos?.length) return null;

    // **El más cercano a la cabecera de salida**, no el más cercano a la
    // terminal. Silvio Pettirossi tiene sesenta y dos puestos repartidos por
    // un kilómetro y medio de plataforma, y saliendo del que toca a la
    // terminal el rodaje eran quince minutos entre ir y volver: «es mucho rato
    // en rodadura salir y entrar, la verdad». Un aeropuerto de verdad asigna
    // el puesto por muchas cosas; un juego para prelectores lo asigna por que
    // se pueda jugar.
    //
    // Sigue siendo el mismo siempre, que es lo que importa: quien juega se
    // aprende su sitio, y un aeropuerto que te cambia el puesto cada partida
    // no se aprende nunca.
    const cerca = (p: Punto): number => {
      let d = Infinity;
      for (const e of this.aero.buildings ?? []) {
        for (const q of e.polygon)
          d = Math.min(d, Math.hypot(q[0] - p[0], q[1] - p[1]));
      }
      return d;
    };

    /*
     * **Los puestos pegados a un edificio son pasarelas, y ahí no aparca una
     * avioneta.**
     *
     * Esto costó dos intentos de medir la fotografía —cuánto sobresale en cada
     * puesto, si hay algo alto al lado— para acabar en el sitio de siempre:
     * bajo el ala de un 737 de Iberia Express, partida tras partida. Se dijo
     * con toda la razón: «¿es tan difícil empezar el juego en otro punto del
     * aeropuerto? Que mira que es grande».
     *
     * Y no hacía falta medir nada. OpenStreetMap trae los edificios, y en
     * cualquier aeropuerto del mundo los puestos de las aeronaves grandes están
     * pegados a la terminal y los de aviación general, lejos. Sesenta metros es
     * más que la envergadura de un 737 y menos que la distancia a la que queda
     * una plataforma de aviación general.
     *
     * De los que quedan se sigue cogiendo el más cercano a la cabecera de
     * salida, que es lo que evita quince minutos de rodaje.
     */
    /*
     * **Y el corte no puede ser un número fijo, porque cada aeropuerto tiene
     * los suyos.** Medido:
     *
     *   Silvio Pettirossi · 62 puestos · 43 a más de 300 m de un edificio
     *   Tenerife Norte    · 32 puestos · **ninguno** más allá de 130 m
     *
     * En Asunción hay plataforma de aviación general y se ve en los datos. En
     * Tenerife Norte no la hay —o no está en OpenStreetMap, que para nosotros
     * es lo mismo—, así que con un corte de sesenta metros se elegía un puesto
     * de la fila de los grandes: «que me suba a la chepa del Iberia».
     *
     * Así que el corte es **relativo**: se ordenan por lo lejos que están de
     * cualquier edificio y se coge el tercio de arriba. Donde hay aviación
     * general, se va a ella; donde no la hay, se va a la punta de la
     * plataforma, que es lo más parecido que ese aeropuerto puede ofrecer. Y
     * de ese grupo se sigue eligiendo el más cercano a la cabecera, que es lo
     * que evita quince minutos de rodaje.
     */
    const porLejania = [...puestos].sort((a, b) => cerca(b.xy) - cerca(a.xy));
    const cuantos = Math.max(1, Math.ceil(porLejania.length / 3));
    const donde = porLejania.slice(0, cuantos);
    /*
     * **Y de ese grupo, el que menos rodaje tiene por delante — rodando.**
     *
     * Se cogía el más cercano a la cabecera en línea recta, y eso no es lo
     * mismo: en Tenerife Norte el puesto que gana está a la vista de la
     * cabecera y hay que dar la vuelta al aeropuerto para llegar, dos
     * kilómetros y tres minutos. Lo que decide es lo que se rueda, y el juego
     * ya sabe calcularlo. Ver `parDeSalida`.
     */
    return this.parDeSalida()?.puesto ?? donde[0]!;
  }

  /** Los puestos de los que puede salir una avioneta, sin ordenar. */
  private puestosCandidatos(): { ref: string | null; xy: Punto }[] {
    const puestos = this.aero.parkingPositions;
    if (!puestos?.length) return [];
    const cerca = (p: Punto): number => {
      let d = Infinity;
      for (const e of this.aero.buildings ?? []) {
        for (const q of e.polygon)
          d = Math.min(d, Math.hypot(q[0] - p[0], q[1] - p[1]));
      }
      return d;
    };
    const porLejania = [...puestos].sort((a, b) => cerca(b.xy) - cerca(a.xy));
    return porLejania.slice(0, Math.max(1, Math.ceil(porLejania.length / 3)));
  }

  /**
   * El par puesto + punto de espera con el que menos se rueda.
   *
   * **Se eligen juntos, y por metros rodados.** Por separado no sale: el
   * puesto más cercano a la cabecera puede estar al otro lado de un aeropuerto
   * sin conexión directa, y la intersección que se ve al lado del puesto puede
   * pedir un rodeo. Los dos se probaban por línea recta y los dos acertaban
   * por separado y fallaban juntos: 244 segundos de rodaje en Tenerife Norte,
   * «cuatro minutos en una pista, eso un niño no lo aguanta».
   *
   * Se calcula una vez y se guarda: son unas decenas de búsquedas de camino en
   * un grafo de unos cientos de nudos, y el sitio del que se sale **tiene que
   * ser el mismo siempre** — quien juega se aprende su puesto.
   */
  private parDeSalida(): {
    puesto: { ref: string | null; xy: Punto };
    espera: Punto;
  } | null {
    if (this.par !== undefined) return this.par;
    this.par = null;
    const esperas = this.esperasPosibles();
    /*
     * **Y se cuenta el viaje entero: la ida y la vuelta.**
     *
     * Contando solo la ida sale un puesto pegado a su entrada y a dos
     * kilómetros de donde se toma tierra: 34 segundos de ida y **227 de
     * vuelta**, que es la misma queja de siempre con el reloj al revés. Lo que
     * cansa no es salir: es el viaje.
     *
     * La vuelta se estima desde donde un avión ligero ha dejado de correr —mil
     * metros pasado el umbral— hasta el puesto. No hace falta más precisión:
     * lo que se está comparando son puestos entre sí.
     */
    const dondeSePara = puntoDePista(
      this.pista,
      this.pista.length / 2 - TRAS_TOMAR_TIERRA,
    );
    const traeDeVuelta: Punto = [dondeSePara[0], -dondeSePara[1]];

    const pares: {
      puesto: { ref: string | null; xy: Punto };
      espera: Punto;
      ida: number;
      viaje: number;
    }[] = [];
    for (const puesto of this.puestosCandidatos()) {
      const vuelta = rodajeEntre(this.grafo, traeDeVuelta, puesto.xy, 600);
      const casa = vuelta ? vuelta.largo : 0;
      for (const espera of esperas) {
        const ruta = rodajeEntre(this.grafo, puesto.xy, espera);
        /*
         * **Y tiene que ser un camino, no un salto.**
         *
         * El buscador engancha cada punta al nudo más cercano y une el resto
         * en línea recta, así que un puesto y un punto de espera que caigan
         * cerca del mismo nudo dan una «ruta» de dos puntos que cruza el campo
         * en diagonal: la más corta de todas, y por la hierba. Sin esto, el
         * optimizador la elegía.
         *
         * Lo que se mira es **el enganche**: lo que va del puesto a su nudo y
         * de donde acaba la ruta al punto de espera, que son los dos únicos
         * tramos que no van por asfalto. Todo lo de en medio es el grafo, y el
         * grafo es asfalto por construcción. Lo dice el buscador, que es quien
         * sabe cuáles son esas dos patas; ver `Ruta.enganche`.
         *
         * Antes esto se medía contando puntos —menos de cinco, fuera—, y era
         * un apaño que valía mientras todos los aeródromos tuvieran calles de
         * rodaje enredadas. En Mariscal Estigarribia hay **una sola calle**:
         * la ruta del puesto a la doble raya son 361 metros de asfalto en
         * cuatro puntos, y el filtro la tiraba. El juego arrancaba el vuelo ya
         * autorizado, con el motor en marcha y sin rodaje ninguno.
         */
        if (!ruta) continue;
        if (ruta.enganche > MAXIMO_ENGANCHE) continue;
        if (ruta.largo < LO_MINIMO_QUE_SE_RUEDA) continue;
        pares.push({
          puesto,
          espera,
          ida: ruta.largo,
          viaje: ruta.largo + casa,
        });
      }
    }
    if (!pares.length) return this.par;

    /*
     * **La ida manda, y por eso tiene tope propio.**
     *
     * Sumando ida y vuelta a secas sale un puesto que está al lado de donde se
     * toma tierra y lejísimos de cualquier entrada: la suma baja y **lo
     * primero que hace quien juega son mil quinientos metros de calle**.
     * Medido: 350 segundos y ni siquiera llegó. El viaje de ida es el que se
     * hace con la ilusión de despegar, así que se acota; de los que caben,
     * gana el que además vuelve pronto. Y si ninguno cabe, gana el viaje más
     * corto, que es mejor que rendirse.
     */
    this.paresVistos = pares.map((p) => ({
      ref: p.puesto.ref,
      ida: Math.round(p.ida),
      viaje: Math.round(p.viaje),
    }));
    const cortos = pares.filter((p) => p.ida <= LO_MAXIMO_DE_IDA);
    const donde = (cortos.length ? cortos : pares).sort(
      (a, b) => a.viaje - b.viaje,
    )[0]!;
    this.par = { puesto: donde.puesto, espera: donde.espera };
    return this.par;
  }

  /** La cabecera por la que se despega, en coordenadas de fichero. */
  private cabeceraDeSalida(): Punto {
    const [fx, fz] = delante(this.pista.heading);
    /*
     * **Media pista, no mil seiscientos metros.**
     *
     * Estaba escrito a mano, y mil seiscientos es media pista de Tenerife
     * Norte: en un aeródromo de novecientos metros esa «cabecera» cae a
     * kilómetro y pico por delante del umbral, en mitad del campo. Todo lo que
     * se decide contra ella —qué punto de espera es el de la cabecera, qué
     * puesto queda cerca— se decidía entonces mirando a un sitio que no existe.
     */
    const media = this.pista.length / 2;
    return [this.pista.x - fx * media, -(this.pista.z - fz * media)];
  }

  /**
   * El punto de espera por el que se sale a la pista.
   *
   * El más cercano a la cabecera de salida, que es a donde hay que ir: entrar
   * por el punto de espera del otro extremo significaría recorrer la pista
   * entera en sentido contrario, que es de las cosas que más asustan a una
   * torre.
   */
  /**
   * Metros de pista que quedan por delante desde un punto de espera.
   *
   * Se proyecta el punto sobre el eje y se mide hasta el final. Es la cuenta
   * que hace cualquier piloto antes de aceptar una salida por intersección.
   */
  private pistaQueQueda(p: Punto): number {
    const [fx, fz] = delante(this.pista.heading);
    // El eje, en las coordenadas del plan, donde la y es la z cambiada de signo.
    const ux = fx;
    const uy = -fz;
    const media = this.pista.length / 2;
    const fin: Punto = [
      this.pista.x + fx * media,
      -(this.pista.z + fz * media),
    ];
    return (fin[0] - p[0]) * ux + (fin[1] - p[1]) * uy;
  }

  /**
   * De qué punto de espera se sale.
   *
   * **Del más cercano al puesto, no del de la cabecera**, mientras quede pista
   * de sobra por delante. Eso tiene nombre en aviación —salida por
   * intersección— y es lo que hace todos los días una avioneta que aparca a
   * mitad de campo: no se recorre el aeropuerto entero para usar los tres
   * kilómetros de pista cuando con doscientos cincuenta metros vuela.
   *
   * Es la mitad del problema del rodaje eterno: «es aburrido pasarse cuatro
   * minutos en una pista, eso un niño no lo aguanta, se aburre». La otra mitad
   * era la velocidad, y está arriba, en `CRUCERO`. Medido en Tenerife Norte:
   * 244 segundos del puesto a la cabecera, 74 hasta la intersección.
   *
   * Si no hay ninguna intersección utilizable —una pista corta, un aeródromo
   * con una sola entrada— se vuelve a lo de siempre: el punto de espera
   * publicado más cercano a la cabecera, que ahí sí hace falta la pista
   * entera.
   */
  /**
   * Todos los sitios donde se puede esperar para entrar en pista: las
   * intersecciones con pista de sobra por delante y el punto de espera
   * publicado de la cabecera, que es el que siempre vale.
   */
  private esperasPosibles(): Punto[] {
    const cabecera = this.cabeceraDeSalida();
    const publicada = [...this.aero.holdingPositions].sort(
      (a, b) =>
        Math.hypot(a.xy[0] - cabecera[0], a.xy[1] - cabecera[1]) -
        Math.hypot(b.xy[0] - cabecera[0], b.xy[1] - cabecera[1]),
    )[0]?.xy;
    const sitios = this.esperasPorInterseccion();
    /*
     * **Y los puntos de espera publicados que estén al alcance de una calle.**
     *
     * OpenStreetMap los trae, y son los buenos: es donde se espera de verdad.
     * Lo que a veces no trae es el trocito de calle que va de la calle
     * paralela hasta ellos, y sin ese trozo el buscador llega hasta donde
     * puede y salta en línea recta. Un salto corto se puede permitir —ahí hay
     * asfalto de verdad, aunque en nuestros datos no esté dibujado—; uno largo
     * es cruzar el campo, y eso ya se vio: «salgo por E4 atravesando los
     * jardines».
     */
    for (const e of this.aero.holdingPositions) {
      if (this.alGrafo(e.xy) <= SALTO_A_LA_ESPERA) sitios.push(e.xy);
    }
    if (publicada) sitios.push(publicada);
    return sitios;
  }

  /** Lo lejos que queda un punto del asfalto que el juego conoce, m. */
  private alGrafo(p: Punto): number {
    let mejor = Infinity;
    for (const t of this.grafo.tramos) {
      for (let i = 0; i < t.puntos.length - 1; i++) {
        const a = t.puntos[i]!;
        const b = t.puntos[i + 1]!;
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const l2 = dx * dx + dy * dy;
        if (l2 < 1) continue;
        const u = Math.max(
          0,
          Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2),
        );
        mejor = Math.min(
          mejor,
          Math.hypot(p[0] - (a[0] + dx * u), p[1] - (a[1] + dy * u)),
        );
      }
    }
    return mejor;
  }

  private esperaDeSalida(): Punto | null {
    const puesto = this.puestoElegido;
    // Sin puesto a mano manda el par calculado; con uno —el mejor estaba
    // ocupado y el juego eligió otro— se vuelve a mirar desde ahí.
    if (!puesto) return this.parDeSalida()?.espera ?? null;
    let mejor: Punto | null = null;
    let corto = Infinity;
    for (const espera of this.esperasPosibles()) {
      const ruta = rodajeEntre(this.grafo, puesto, espera);
      if (!ruta || ruta.largo >= corto) continue;
      corto = ruta.largo;
      mejor = espera;
    }
    return mejor;
  }

  /**
   * Todos los sitios donde se puede esperar para entrar por una intersección
   * con pista de sobra por delante. Quien llama elige por distancia rodada.
   *
   * **No se usan los puntos de espera publicados**, y costó una tarde
   * entenderlo: OpenStreetMap los trae sueltos, a treinta metros de la calle
   * más cercana, y el buscador de rutas solo sabe enganchar en los **nudos**
   * del grafo —los cruces—, así que el camino hasta ellos se trazaba en línea
   * recta por encima de la hierba. Cuatro puntos de la ruta a treinta y cuatro
   * metros del asfalto, medidos.
   *
   * Lo que sí es asfalto seguro es el grafo. Así que la intersección se busca
   * donde el juego ya sabe buscar salidas de pista —un nudo sobre el eje con
   * una calle colgando— y desde ahí se retrocede por esa calle hasta quedar
   * fuera de la pista. El sitio de esperar sale de la geometría del aeropuerto,
   * no de que alguien haya dibujado un nodo.
   */
  private esperasPorInterseccion(): Punto[] {
    const sitios: Punto[] = [];
    this.grafo.nudos.forEach((nudo, i) => {
      const { across } = enEjesDePista(
        nudo[0],
        -nudo[1],
        this.pista.x,
        this.pista.z,
        this.pista.heading,
      );
      // Sobre el asfalto de la pista, no «cerca»: ver `primeraSalida`.
      if (Math.abs(across) > this.pista.width / 2) return;
      const calles = (this.grafo.desde[i] ?? [])
        .map((t) => this.grafo.tramos[t]!)
        .filter((t) => !t.pista);
      if (!calles.length) return;
      if (this.pistaQueQueda(nudo) < PISTA_QUE_HACE_FALTA) return;
      const punto = this.atrasPorLaCalle(calles[0]!, nudo);
      if (punto) sitios.push(punto);
    });
    return sitios;
  }

  /**
   * Retrocede por una calle desde su encuentro con la pista hasta quedar bien
   * fuera de ella. Es donde se pinta la doble raya y donde se espera el verde.
   */
  private atrasPorLaCalle(tramo: Tramo, nudo: Punto): Punto | null {
    const puntos = tramo.puntos;
    const desdeElFinal =
      Math.hypot(puntos[0]![0] - nudo[0], puntos[0]![1] - nudo[1]) >
      Math.hypot(
        puntos[puntos.length - 1]![0] - nudo[0],
        puntos[puntos.length - 1]![1] - nudo[1],
      );
    const orden = desdeElFinal ? [...puntos].reverse() : [...puntos];
    for (const p of orden) {
      const { across } = enEjesDePista(
        p[0],
        -p[1],
        this.pista.x,
        this.pista.z,
        this.pista.heading,
      );
      if (Math.abs(across) >= this.pista.width / 2 + FUERA_DE_LA_PISTA)
        return p;
    }
    return null;
  }

  /** Empieza un vuelo. Devuelve `false` si este aeródromo no da para rodar. */
  reiniciar(): boolean {
    const puesto = this.puestoDeSalida();
    const espera = this.esperaDeSalida();
    if (!puesto || !espera) {
      this.vuelo.reiniciar(true);
      this.destino = null;
      this.ponerRuta(null);
      return false;
    }
    this.vuelo.reiniciar(false);
    this.destino = "espera";
    this.ultimaPos = puesto.xy;
    this.ponerRuta(rodajeEntre(this.grafo, puesto.xy, espera));
    return this.ruta !== null;
  }

  /**
   * El primer punto de la ruta que no es el propio puesto.
   *
   * Sirve para orientar el avión al aparecer: mirando a por donde tiene que
   * irse. Se salta los puntos pegados al morro porque el primero de la ruta
   * suele ser el nudo de al lado del puesto, y apuntar a un metro de distancia
   * da un rumbo cualquiera.
   */
  primerPaso(): readonly [number, number] | null {
    const inicio = this.rutaMundo[0];
    if (!inicio) return null;
    for (const p of this.rutaMundo) {
      if (Math.hypot(p[0] - inicio[0], p[1] - inicio[1]) > 25) return p;
    }
    return this.rutaMundo[this.rutaMundo.length - 1] ?? null;
  }

  /**
   * Un punto de la ruta a `adelanto` metros por delante de donde estoy.
   *
   * «Por delante» se mide **sobre la propia ruta**, no en línea recta: en una
   * curva cerrada el punto en línea recta cae por dentro del codo, y la ayuda
   * cortaría la curva en vez de tomarla.
   */
  private puntoDeLaRutaTrasMi(p: Punto, adelanto: number): Punto | null {
    if (this.rutaMundo.length < 2) return null;
    // Dónde estoy sobre la ruta, en metros recorridos.
    let mejor = Infinity;
    let recorrido = 0;
    let acumulado = 0;
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      const a = this.rutaMundo[i]!;
      const b = this.rutaMundo[i + 1]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      const largo = Math.sqrt(l2);
      if (l2 > 1) {
        const t = Math.max(
          0,
          Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2),
        );
        const d = Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]);
        if (d < mejor) {
          mejor = d;
          recorrido = acumulado + largo * t;
        }
      }
      acumulado += largo;
    }

    // Y el punto que queda a `adelanto` metros más allá.
    const meta = recorrido + adelanto;
    let anda = 0;
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      const a = this.rutaMundo[i]!;
      const b = this.rutaMundo[i + 1]!;
      const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (anda + largo >= meta) {
        const t = largo > 0 ? (meta - anda) / largo : 0;
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
      anda += largo;
    }
    return this.rutaMundo[this.rutaMundo.length - 1] ?? null;
  }

  /**
   * ¿Toca repetir el aviso de que se ha salido de la raya?
   *
   * Con cuentagotas: cada seis segundos. Un aviso que se repite sin parar deja
   * de leerse y encima tapa los demás, que fue exactamente lo que pasó con la
   * alarma de pérdida.
   */
  private desdeElAviso = 99;

  avisarDeSalida(dt: number): boolean {
    this.desdeElAviso += dt;
    if (this.desdeElAviso < 6) return false;
    this.desdeElAviso = 0;
    return true;
  }

  /**
   * Cuánto alerón haría falta para volver a la raya, de −1 a 1.
   *
   * Es el *Smart Steering* de los juegos de conducción para niños. Devuelve el
   * mando que hace falta, no lo aplica: quién y cuánto lo aplica lo decide el
   * peldaño, que es donde vive esa escalera.
   *
   * Dos términos, como cualquier seguidor de línea que funcione:
   *
   * - **Cuánto te has desviado**, que dice hacia dónde hay que apuntar.
   * - **Cuánto te falta para apuntar ahí**, que es lo que evita que el avión
   *   serpentee cruzando la raya una y otra vez. Sin este segundo término el
   *   remedio es peor que la enfermedad, y ya lo aprendimos con el piloto de
   *   pruebas.
   *
   * Devuelve cero si no hay ruta, si se va en el aire o si se va demasiado
   * deprisa para estar rodando: en la carrera de despegue nadie debe empujar
   * el volante salvo quien pilota.
   */
  asistencia(
    estado: FlightState,
    sobreElSuelo: number,
    /**
     * Cuánto **anticipa** la ayuda, de 0 a 1. Lo dice el peldaño.
     *
     * Es la diferencia entre sujetar y conducir, y las dos cosas son correctas
     * en sitios distintos. Con cero, la ayuda solo corrige la deriva: sobre la
     * raya calla y en una curva giras tú. Con uno, además apunta a un punto de
     * la ruta por delante, o sea **toma la curva**.
     *
     * Hizo falta separarlo porque las dos versiones estuvieron mal por
     * separado. Apuntando siempre por delante, el juego giraba por ti en todos
     * los peldaños: «ese giro del final no lo di yo, parece que hay una línea
     * oculta que me imanta la aeronave». Y solo con la deriva, el banco de
     * pruebas demostró lo contrario: **en Guyrami, rodando sin tocar nada, el
     * avión no llega nunca al punto de espera** — se sale en la primera curva.
     * Y ese peldaño es de cuatro a seis años y su promesa entera es llevarte:
     * nadie de cuatro años va a hilar dos kilómetros de calle de rodaje.
     *
     * Así que no es una cosa ni la otra: es la escalera. Abajo se conduce,
     * arriba solo se sujeta.
     */
    anticipa = 0,
  ): number {
    if (this.rutaMundo.length < 2) return 0;
    if (sobreElSuelo > 4 || estado.airspeed > 18) return 0;

    const p: Punto = [estado.position.x, estado.position.z];

    /*
     * **Al llegar, la ayuda se calla.**
     *
     * Apuntaba siempre a un punto de la ruta por delante, y sobre el final de
     * la ruta ese punto es el propio final: en cuanto se pasa un metro, queda
     * detrás, la ayuda manda girar a buscarlo, se pasa otra vez y vuelta a
     * empezar. El avión se quedaba dando vueltas sobre sí mismo encima de la
     * diana sin poder terminar los últimos metros, y en Guyrami —donde la ayuda
     * manda del todo— no había forma de salir de ahí.
     *
     * Veinticinco metros es donde ya se ve la doble raya pintada en el suelo.
     * De ahí adentro se para solo, que es justamente lo que hay que aprender.
     */
    if (this.restanteHasta(p) < LLEGADA_SIN_AYUDA) return 0;

    /*
     * **Y la ayuda mantiene en la raya; no arrastra hasta ella.**
     *
     * Solo miraba la altura y la velocidad, así que a quinientos metros de la
     * ruta —aterrizado en la hierba, fuera del aeropuerto— seguía tirando del
     * avión hacia una raya que no se veía. Quien lo probó lo describió exacto:
     * «pulso las flechas derecha/izquierda y parece como que quiere ir a alguna
     * parte prefijada y está fuera de control».
     *
     * Sesenta metros es más o menos una calle de rodaje y su margen. De ahí
     * para fuera uno está donde no debería y **eso también hay que poder
     * hacerlo**: el juego avisa con la señal de volver a la raya, que es lo que
     * enseña, y no con el mando, que es lo que quita las ganas.
     */
    if (aLaPolilinea(p, this.rutaMundo) > SIN_AYUDA_FUERA) return 0;

    /*
     * **La ayuda corrige la deriva. No toma las curvas.**
     *
     * Aquí se apuntaba a un punto treinta metros por delante de la ruta y se
     * giraba hacia él, que es lo que hace un piloto automático: **conducir**.
     * Y en una curva eso significa que el juego gira por ti. «Ese giro del
     * final no lo di yo, el juego me obliga moviendo el avión; parece que hay
     * una línea oculta que me imanta la aeronave.»
     *
     * Es exactamente lo contrario de lo que dice el comentario de arriba —«la
     * ayuda mantiene en la raya; no arrastra hasta ella»— y de lo que hace el
     * *Smart Steering* del que salió la idea, que no toma curvas: evita que te
     * salgas.
     *
     * La cuenta base sale de **lo desviado que vas del eje**, con su signo, y
     * de nada más. Sobre la raya vale cero, así que en una curva la ayuda calla
     * y giras tú; si te vas yendo, tira suavemente hacia dentro. Con el
     * amortiguador de guiñada para que no oscile.
     *
     * Y encima, **solo en los peldaños de abajo**, la anticipación: apuntar a
     * un punto de la ruta por delante. Ver el parámetro `anticipa`.
     */
    let mejor = Infinity;
    let desvio = 0;
    let rumboDeLaRaya = 0;
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      const a = this.rutaMundo[i]!;
      const b = this.rutaMundo[i + 1]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      if (l2 < 1) continue;
      const t = Math.max(
        0,
        Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2),
      );
      const cx = a[0] + dx * t;
      const cy = a[1] + dy * t;
      const d = Math.hypot(cx - p[0], cy - p[1]);
      if (d >= mejor) continue;
      mejor = d;
      // El signo: a qué lado de la raya se está, mirando en su sentido.
      const l = Math.sqrt(l2);
      desvio = ((p[0] - cx) * -dy + (p[1] - cy) * dx) / l;
      // Y hacia dónde va la calle ahí, que es lo que decide si esto sigue
      // siendo una corrección o ya es una media vuelta. Ver `VUELTA_EN_U`.
      rumboDeLaRaya = Math.atan2(dx, -dy);
    }
    if (!Number.isFinite(desvio)) return 0;

    /*
     * **Si la calle ya no va por donde apunta el morro, la ayuda se calla.**
     *
     * Pasada la boca de la salida, el trozo de ruta más cercano es el que se
     * va por la calle, y tirar hacia él significa dar la vuelta al avión. La
     * ayuda lo hacía sin parar —y girando sobre sí mismo nunca llegaba—:
     * medido en el banco con el mando suelto, **alerón 0,63 sostenido y 63
     * grados por segundo**, con el avión haciendo una pirueta y retrocediendo
     * por la pista.
     *
     * Una ayuda de rodaje corrige un rumbo; no da la vuelta a un avión. Cuando
     * hace falta más que esto, es que hay que rehacer el camino o seguir hasta
     * la siguiente salida, y eso lo decide quien pilota — con la raya y la
     * tarjeta delante, que para eso están.
     */
    let contra = rumboDeLaRaya - estado.heading;
    while (contra > Math.PI) contra -= Math.PI * 2;
    while (contra < -Math.PI) contra += Math.PI * 2;
    if (Math.abs(contra) > VUELTA_EN_U) return 0;

    /*
     * Seis metros de holgura: medio ancho de calle. Dentro de eso no se toca
     * nada, porque ahí no hay deriva que corregir — hay un avión rodando.
     */
    const fuera = Math.abs(desvio) < 6 ? 0 : desvio - Math.sign(desvio) * 6;
    let giro = -fuera / 14 - (estado.yawRate * 180) / Math.PI / 40;

    /*
     * **La anticipación: mirar a dónde va la calle, no dónde estoy.**
     *
     * Se apunta a un punto de la ruta **dos segundos por delante** —y nunca a
     * menos de quince metros, que a paso de tortuga si no el punto se pega al
     * morro y la ayuda tiembla— y se corrige el rumbo hacia él. Es lo que hace
     * cualquiera que conduce: se mira a la salida de la curva.
     */
    if (anticipa > 0) {
      const mira = this.puntoDeLaRutaTrasMi(
        p,
        Math.max(15, estado.airspeed * 2),
      );
      if (mira) {
        const quiero = Math.atan2(mira[0] - p[0], -(mira[1] - p[1]));
        let error = quiero - estado.heading;
        while (error > Math.PI) error -= Math.PI * 2;
        while (error < -Math.PI) error += Math.PI * 2;
        giro += anticipa * (error / 0.7);
      }
    }
    /*
     * **Y con tope, que es lo que separa «te sujeta» de «te lleva».**
     *
     * Esto es un proporcional sobre el desvío sin techo: a veinte metros de la
     * raya mandaba alerón a fondo. Y en una curva, con el mando suelto, el
     * desvío crece solo — así que corregir el desvío y girar por ti pasaban a
     * ser la misma cosa. «Ese giro del final no lo di yo, el juego me obliga
     * moviendo el avión, parece que hay una línea oculta que me imanta la
     * aeronave»: era exactamente esto.
     *
     * Con el tope, la ayuda empuja hacia la raya y nunca da la vuelta al
     * avión: el giro sigue siendo de quien pilota. Cuánto se aplica de esto lo
     * decide el peldaño, que es donde vive esa escalera.
     */
    return Math.max(-TOPE_DE_AYUDA, Math.min(TOPE_DE_AYUDA, giro));
  }

  /** La ruta en coordenadas de mundo. Para las herramientas de comprobación. */
  rutaVisible(): readonly Punto[] {
    return this.rutaMundo;
  }

  /** Avanza un fotograma y dice qué hay que enseñar. */
  paso(
    estado: FlightState,
    sobreElSuelo: number,
    motor: boolean,
    dt: number,
  ): Vista {
    const s = this.situacion(estado, sobreElSuelo, motor);
    const p: Paso = this.vuelo.paso(s, dt);
    const sugerida = this.velocidadAqui();

    if (p.cambio) this.alCambiarDeFase(p.fase);
    else this.rehacerSiHaceFalta(p.fase, dt);

    return {
      fase: p.fase,
      clave: GUION[p.fase].clave,
      icono: GUION[p.fase].icono,
      luzVerde: p.luzVerde,
      letra: this.letraActual(estado),
      velocidadSugerida: sugerida,
      /*
       * **Vas rápido para lo que te queda**, que no es lo mismo que ir rápido.
       *
       * Primero se comparaba con la velocidad que tocaba en ese punto, y junto
       * a la doble raya esa velocidad baja a cero: cualquier movimiento pasaba
       * el margen y el juego le pedía ir más despacio a quien ya estaba
       * parando. Se tapó exigiendo que la velocidad sugerida fuera mayor que
       * tres, y con eso el aviso **desapareció justo donde más falta hacía**:
       * «al llegar al círculo rojo de espera no me viene avisando de bajar
       * velocidad, si he parado es porque yo ya sabía la dinámica».
       *
       * Lo que hay que mirar no es la velocidad: es si se puede parar. La
       * distancia de frenada es `v²/2a`, y si no cabe en lo que queda de ruta,
       * hay que aflojar ya. Eso avisa **ochenta metros antes** de la doble raya
       * a velocidad de rodaje, que es cuando sirve de algo, y no avisa nunca a
       * quien va frenando bien.
       */
      rapido:
        sobreElSuelo < 3 &&
        this.rutaMundo.length > 1 &&
        (estado.airspeed > sugerida * MARGEN + 2 ||
          (estado.airspeed * estado.airspeed) / (2 * FRENADA) >
            s.restante - HOLGURA),
      restante: s.restante,
      // Solo se avisa **mientras se rueda**. Antes de arrancar nadie se ha
      // salido de nada, y decírselo a quien todavía no se ha movido es ruido.
      saltoLaLuz: p.saltoLaLuz,
      fuera:
        (p.fase === "rodando" || p.fase === "a-plataforma") &&
        this.rutaMundo.length > 1 &&
        s.alaRuta > FUERA_DE_RUTA &&
        sobreElSuelo < 3,
      cambio: p.cambio,
    };
  }

  /**
   * A dónde hay que ir ahora, y por dónde.
   *
   * **Se recalcula por lo que hace falta, no por la fase que se acaba de
   * cruzar.** La primera versión ponía la ruta de vuelta en el instante en que
   * la fase pasaba a «a plataforma», y si esa fase no llegaba nunca —porque
   * alguien despegó en travesía y volvió por donde le pareció— no había ruta y
   * el juego se quedaba mudo.
   *
   * Ahora es como un GPS: cada vez que cambia el destino, se traza el camino
   * desde donde esté el avión. Da igual cómo haya llegado ahí.
   */
  private alCambiarDeFase(fase: Fase): void {
    /*
     * **Alinearse también se guía.**
     *
     * Antes esta fase borraba la raya, y ahí se quedaba quien la seguía: con la
     * luz verde dada, la doble raya detrás y ciento cuarenta y cinco metros
     * hasta la pista sin nada que seguir. «No me deja terminar lo poquito que
     * me queda hasta la cabecera», y después, a fuerza de motor, despegando por
     * la calle de rodaje.
     *
     * Es la maniobra más delicada del rodaje —hay que entrar en la pista y
     * ponerse en su eje— y era justo la única sin ayuda.
     */
    /*
     * **Y la raya entra en la pista en cuanto la torre autoriza, no cuando ya
     * estás dentro.**
     *
     * Esto solo miraba «alineando», y esa fase exige estar **ya sobre el
     * asfalto**. O sea: con la luz verde dada, la raya seguía acabándose en la
     * doble raya y los ciento cuarenta y cinco metros que van de ahí a la
     * pista eran el único trozo del rodaje sin nada que seguir — justo la
     * maniobra más delicada, y justo después de que el juego te diga que
     * pases. Lo encontró el banco de pruebas: con el verde dado, el avión se
     * quedaba en el punto de espera sin ruta a la que agarrarse.
     */
    if (fase === "alineando" || fase === "autorizado" || fase === "back-taxi") {
      if (this.destino === "pista") return;
      this.destino = "pista";
      this.ponerRuta(this.entradaEnPista());
      return;
    }

    // Volando no hay nada que rodar.
    if (
      fase === "despegando" ||
      fase === "comprometido" ||
      fase === "en-vuelo" ||
      fase === "final"
    ) {
      this.ponerRuta(null);
      this.destino = null;
      this.giroDelBackTaxi = null;
      return;
    }

    const quiere: "espera" | "puesto" | null =
      fase === "aterrizado" || fase === "abandonando" || fase === "a-plataforma"
        ? "puesto"
        : fase === "apagado" || fase === "en-puesto"
          ? null
          : "espera";

    /*
     * **Y al dejar la pista se vuelve a trazar, aunque el destino no cambie.**
     *
     * La ruta de vuelta se trazaba una sola vez, al saltar «aterrizado», que
     * ocurre **con el avión todavía en el aire**: a doce metros del suelo, a
     * treinta metros por segundo y treinta y seis metros antes del umbral. Con
     * esos datos se elegía por dónde salir y ahí se quedaba, porque las fases
     * siguientes querían el mismo destino y la comparación de abajo cortaba.
     *
     * Al dejar la pista ya se sabe de verdad dónde se está y a qué velocidad,
     * que es cuando la pregunta «¿por dónde vuelvo?» tiene una respuesta
     * buena.
     */
    if (fase === "abandonando") this.destino = null;

    if (quiere === this.destino) return;
    this.destino = quiere;
    if (quiere === null) {
      this.ponerRuta(null);
      return;
    }

    const meta =
      quiere === "puesto" ? this.puestoDeSalida()?.xy : this.esperaDeSalida();
    if (!meta) {
      this.ponerRuta(null);
      return;
    }
    // Desde donde esté el avión, y con margen ancho: quien vuelve de volar
    // puede haber tomado tierra lejos de cualquier calle.
    //
    // **Y si acaba de aterrizar, saliendo por delante.** El camino más corto al
    // puesto puede empezar dando media vuelta, y eso en una pista no se hace ni
    // se enseña: se abandona por la primera salida que quede por delante. Con
    // la ruta más corta, la raya salía hacia atrás —fuera de la pantalla, que
    // mira adelante— y quien acababa de aterrizar no tenía nada que seguir:
    // «al aterrizar no tuve línea de regreso al hangar».
    const salida = quiere === "puesto" ? this.salidaPorDelante() : null;

    /*
     * **Y hasta esa salida se va rodando, no en línea recta.**
     *
     * Aquí se trazaba la ruta *desde la salida* y después se le pegaba delante
     * la posición del avión. O sea: **una recta desde donde estabas hasta la
     * boca de la salida**, por encima de lo que hubiera en medio. Eso es lo
     * que se veía jugando — «salgo por E4 atravesando los jardines», «todavía
     * voy por los jardines»— y no era la salida la que estaba mal, era el
     * primer tramo, que no era un camino sino un atajo dibujado.
     *
     * Ahora son dos rutas encadenadas y las dos salen del grafo: de las ruedas
     * a la salida —por la pista, que desde hace poco está en el grafo— y de la
     * salida al puesto. Sin rectas por el campo en ningún trozo.
     *
     * Y si el primer tramo no sale —una toma muy lejos de todo—, se cae a la
     * ruta directa, que es mejor que quedarse sin raya.
     */
    if (salida) {
      const hastaLaSalida = this.porLaPistaHasta(salida);
      const desdeLaSalida = rodajeEntre(this.grafo, salida, meta, 600);
      if (hastaLaSalida && desdeLaSalida) {
        this.ponerRuta({
          ...desdeLaSalida,
          puntos: [...hastaLaSalida.puntos, ...desdeLaSalida.puntos],
          largo: hastaLaSalida.largo + desdeLaSalida.largo,
          letras: [...hastaLaSalida.letras, ...desdeLaSalida.letras],
        });
        return;
      }
    }

    this.ponerRuta(rodajeEntre(this.grafo, this.ultimaPos, meta, 600));
  }

  /**
   * Rehace la ruta si el avión ya no va por ella. Un GPS, vamos.
   *
   * **La raya se trazaba solo al cambiar de fase**, y eso deja dos agujeros que
   * se vieron los dos en el mismo vuelo. Uno: si el trazado falla —una toma
   * lejos de todo, una salida que el grafo no sabía coser— la raya se borra y
   * no vuelve hasta el siguiente cambio de fase, que puede tardar un minuto.
   * «Cuando doy el giro dejo de ver la línea verde… la línea verde había
   * desaparecido hasta A3.» Y dos: si la raya se queda dibujada por donde ya
   * no vas, la ayuda de rodaje sigue tirando hacia ella — «hay un efecto imán
   * que intenta meterme en la A3 cuando ya estoy por la R».
   *
   * Las dos son el mismo fallo: una ruta que se calcula una vez y se cree
   * eterna. Un GPS recalcula cuando te sales, y aquí se hace igual, con su
   * intervalo para no ponerse a buscar caminos sesenta veces por segundo.
   */
  private rehacerSiHaceFalta(fase: Fase, dt: number): void {
    if (this.destino === null) return;
    // En el aire no hay nada que rodar, y entrando en pista la raya es
    // geometría de la pista y no del grafo: ahí no se recalcula.
    if (fase === "alineando" || fase === "autorizado" || fase === "back-taxi")
      return;
    this.desdeElUltimoTrazado += dt;
    if (this.desdeElUltimoTrazado < CADA_CUANTO_SE_REHACE) return;
    this.desdeElUltimoTrazado = 0;

    const hayRaya = this.rutaMundo.length > 1;
    const fuera = hayRaya
      ? aLaPolilinea(
          [this.ultimaPos[0], this.ultimaPos[1]],
          this.rutaMundo.map((q) => [q[0], -q[1]] as Punto),
        ) > LEJOS_DE_LA_RAYA
      : true;
    if (!fuera) return;

    const meta =
      this.destino === "puesto"
        ? this.puestoDeSalida()?.xy
        : this.esperaDeSalida();
    if (!meta) return;
    const ruta = rodajeEntre(this.grafo, this.ultimaPos, meta, 600);
    // Y si no sale, **se deja la que había**: una raya vieja guía peor que una
    // nueva, pero infinitamente mejor que ninguna.
    if (ruta) this.ponerRuta(ruta);
  }

  /**
   * El back-taxi: rodar por la propia pista hasta la cabecera y dar la vuelta.
   *
   * Hay aeródromos donde la plataforma está en un extremo y la única calle de
   * rodaje muere ahí. Con el viento en contra de esa cabecera hay que despegar
   * por la otra, y a la otra **no se llega rodando por calles**: se llega
   * entrando en la pista y recorriéndola en sentido contrario. Es una maniobra
   * de verdad, se pide por radio con esas palabras —«back-track runway 01»— y
   * es la única forma de operar la mitad de los campos pequeños del mundo.
   *
   * Devuelve `null` cuando no hace falta, que es lo normal: si desde donde se
   * entra ya queda pista de sobra por delante, se entra y se despega.
   *
   * **Hasta dónde se vuelve.** Hasta el primer sitio desde el que ya se puede
   * despegar con la pista de una salida por intersección delante
   * —`PISTA_QUE_HACE_FALTA`, casi el triple de lo que corre la Óga 172—, y si
   * el campo es más corto que eso, hasta el umbral. Ni un metro más: volver
   * hasta la cabecera por costumbre es rodar de balde, y aquí lo que sobra de
   * rodaje se paga en niños aburridos.
   *
   * Medido: en Mariscal Estigarribia se entra en el metro 1208 del eje, se
   * vuelven 650 —por debajo de `LO_MAXIMO_DE_IDA`, que es lo que aguanta la
   * paciencia de quien tiene cuatro años— y quedan 1200 por delante, cuando el
   * avión necesita 450.
   *
   * **Y la media vuelta se dibuja, no se pide.** Un vértice de ciento ochenta
   * grados no lo redondea nadie —`redondear` se queda con radio cero y la
   * ayuda de rodaje se planta, que para eso está `VUELTA_EN_U`—, así que la
   * vuelta va como lo que es: media circunferencia de puntos, con el avión
   * rodando por un lado del eje a la ida y por el otro a la vuelta, que es
   * exactamente como se hace.
   */
  private backTaxiDesde(along: number): Punto[] | null {
    this.giroDelBackTaxi = null;
    const mitad = this.largoDePista / 2;
    // Si desde aquí ya queda pista de sobra, esto no es un back-taxi: es
    // entrar y despegar, que es lo que pasa en casi todos los aeródromos.
    if (mitad - along >= PARA_ENTRAR_Y_DESPEGAR) return null;
    // Y en una pista estrecha tampoco, porque las dos rayas se confunden.
    // Ver `ANCHO_PARA_LA_VUELTA`.
    if (this.pista.width < ANCHO_PARA_LA_VUELTA) return null;

    const [fx, fz] = delante(this.pista.heading);
    const [tx, tz] = traves(this.pista.heading);
    /** Un punto del asfalto, en coordenadas de fichero. */
    const enLaPista = (a: number, lado: number): Punto => [
      this.pista.x + fx * a + tx * lado,
      -(this.pista.z + fz * a + tz * lado),
    ];

    /*
     * **La media vuelta acaba en el eje, no al lado.**
     *
     * Una circunferencia de 180 grados te deja a dos radios de donde
     * entraste, así que si se rueda por una raya a `L` del eje y se gira con
     * radio `L/2`, se sale **exactamente sobre el eje** y mirando a donde se
     * despega. Ni una recta más: el avión termina la maniobra alineado y ya
     * puede dar gas.
     *
     * La primera versión giraba con el centro en el eje y terminaba a
     * dieciséis metros de él, con un tramo de ciento veinte metros para ir
     * acercándose. Y ese tramo se hacía **acelerando**: el avión cruzaba el
     * listón de los doce metros ya lanzado, la fase saltaba de «despegando» a
     * «alineando» a media carrera y el destello de Vr se perdía por el camino.
     * Medido en el banco tres veces, con tres resultados distintos, que es lo
     * que pasa cuando algo depende de por dónde te pille una convergencia.
     *
     * `L` es también lo que separa la raya de ida de la de vuelta, y por eso
     * se le deja cuatro metros de borde: en una pista de cuarenta metros son
     * dieciséis, más que la envergadura de la Óga 172.
     */
    const lado = Math.max(
      6,
      Math.min(2 * RADIO_CURVA, this.pista.width / 2 - 4),
    );
    const radio = lado / 2;
    const umbral = -mitad + HUECO_PARA_GIRAR + radio;
    const giro = Math.max(umbral, mitad - PISTA_QUE_HACE_FALTA);
    this.giroDelBackTaxi = giro;

    const puntos: Punto[] = [
      // Del eje al lado por el que se va: entrar y apartarse, sin cruzarse.
      enLaPista(Math.min(along, mitad - 40) - 60, lado),
      enLaPista(giro + radio, lado),
    ];
    /*
     * Media circunferencia con el centro a medio camino del eje, un punto cada
     * treinta grados: se entra por la raya de ida y se sale sobre el eje.
     */
    for (let g = 90; g <= 270; g += 30) {
      const rad = (g * Math.PI) / 180;
      puntos.push(
        enLaPista(giro + radio * Math.cos(rad), radio + radio * Math.sin(rad)),
      );
    }
    // Y eje abajo, que es lo que dice hacia dónde se despega.
    puntos.push(enLaPista(Math.min(mitad - 60, giro + 620), 0));
    return puntos;
  }

  /**
   * La entrada en pista: de donde esté el avión al eje, y eje abajo.
   *
   * No sale del grafo de rodaje —la pista no es una calle de rodaje— sino de la
   * geometría de la propia pista: se entra por la cabecera de salida, se pone
   * el morro en el eje y se apunta pista abajo. Los cuatrocientos metros
   * finales no son para rodarlos: son para que la raya diga **hacia dónde**,
   * que es lo que se pierde en cuanto uno se mete en una pista de cuarenta y
   * cinco metros de ancha y tres kilómetros de larga.
   */
  private entradaEnPista(): Ruta {
    const x = this.ultimaPos[0];
    const z = -this.ultimaPos[1];

    /*
     * **Se entra por donde se está, no por la cabecera.**
     *
     * El primer intento tiraba una recta desde el avión hasta un punto sesenta
     * metros pasada la cabecera de salida. Y una recta entre dos sitios del
     * aeropuerto no pasa por el asfalto: la doble raya está al costado de la
     * pista, así que esa recta cortaba por la hierba —«la entrada en pista no
     * va bien por encima del asfalto y el avión toca hierba»— y, si uno paraba
     * un poco pasado el punto de espera, apuntaba hacia atrás y la ayuda le
     * daba la vuelta entera: «da un giro de 360º como si tuvieras que empezar
     * por narices desde donde habías marcado el punto».
     *
     * Lo que hace un piloto es entrar **de costado, por donde está**, y girar
     * ya sobre el eje. Así que el punto de entrada es la proyección del avión
     * sobre el eje de la pista: se cruza el borde por lo más corto y se gira
     * una vez dentro.
     */
    const { along } = enEjesDePista(
      x,
      z,
      this.pista.x,
      this.pista.z,
      this.pista.heading,
    );
    const mitad = this.largoDePista / 2;
    // Nunca antes del umbral —eso es entrar por fuera de la pista— ni tan
    // adelante que no quede pista para despegar.
    /*
     * **Y lo que hay que dejar por delante no son setecientos metros.**
     *
     * Ese número es de aeropuerto grande, y en una pista de novecientos es más
     * que la mitad: el tope empujaba el punto de entrada **doscientos cincuenta
     * metros por detrás del avión**, así que la raya de entrada salía hacia
     * atrás y cruzaba el campo en diagonal. «Sigue marcándome fuera de la
     * pista por el césped.» La Óga 172 despega en doscientos sesenta metros
     * medidos, así que lo que hay que dejar es eso con margen — y en una pista
     * corta, lo que se pueda sin salirse de ella.
     */
    const paraDespegar = Math.min(PARA_DESPEGAR, this.largoDePista * 0.4);
    const dentroDelEje = Math.max(
      -mitad + 40,
      Math.min(along, mitad - paraDespegar),
    );
    const entrada = puntoDePista(this.pista, -dentroDelEje);
    const rodada = puntoDePista(
      this.pista,
      -Math.min(mitad - 60, dentroDelEje + 500),
    );

    // De mundo a fichero: el norte del fichero es la Z negativa del mundo.
    const enElEje: Punto = [entrada[0], -entrada[1]];
    const ejeAbajo: Punto = [rodada[0], -rodada[1]];

    // Y la vuelta entera, si desde aquí no hay pista para despegar.
    const vuelta = this.backTaxiDesde(along);

    /*
     * **Y hasta el eje se va por la calle, si hay calle.**
     *
     * Esto tiraba una recta desde el avión hasta su proyección en el eje, y en
     * Tenerife Norte cuela porque el punto de espera está pegado al asfalto de
     * la pista. En un campo donde la calle entra en diagonal, esa recta cruza
     * la hierba: «sigue enviándome sobre la hierba cuando ya estaba casi
     * llegando a la pista». Y detrás iba el coche del sígame, guiando por el
     * césped.
     *
     * El grafo ya sabe ir del punto de espera a la pista —la pista está en él
     * desde que se cosieron las calles—, así que se le pregunta. Si no
     * contesta, se cae a la recta de antes, que guía peor pero guía.
     */
    /*
     * **Y se le pregunta con el salto largo, no con el corto.**
     *
     * Iba con ciento veinte metros de salto máximo, y ese número mata la
     * respuesta buena: el punto al que se va —la proyección del avión sobre el
     * eje— cae **entre** dos nudos de la pista, porque la pista solo tiene
     * nudos donde se le cose una calle. Medido en Tenerife Norte: el nudo más
     * cercano estaba a ciento veintiún metros, uno más que el tope, así que el
     * buscador devolvía «no hay camino» y entraba la recta de emergencia — que
     * es justo la que cruza la hierba. «Me sale atravesando el jardín.»
     *
     * Con el salto largo la respuesta es buena **y sigue siendo asfalto**: el
     * último nudo está en el eje de la pista y el punto al que se va también,
     * así que el trozo que los une va por el eje. Lo que no puede ser largo es
     * el salto **de salida**, que sí cruzaría campo: por eso se mira aparte y
     * se exige que el avión esté pegado a una calle.
     */
    const desdeElAvion = nudoCercano(this.grafo, this.ultimaPos);
    const porLaCalle =
      desdeElAvion.distancia <= LEJOS_DE_LA_CALLE
        ? rodajeEntre(this.grafo, this.ultimaPos, enElEje, HASTA_EL_EJE)
        : null;
    const hastaElEje: Punto[] =
      porLaCalle && porLaCalle.puntos.length > 2
        ? [...porLaCalle.puntos]
        : [this.ultimaPos, enElEje];
    const puntos: Punto[] = vuelta
      ? [...hastaElEje, ...vuelta]
      : [...hastaElEje, ejeAbajo];
    let largo = 0;
    for (let i = 1; i < puntos.length; i++) {
      largo += Math.hypot(
        puntos[i]![0] - puntos[i - 1]![0],
        puntos[i]![1] - puntos[i - 1]![1],
      );
    }
    // Sin letras: en la pista no se anuncia una calle, se anuncia la pista, y
    // de eso ya se encarga el designador pintado en la cabecera.
    return {
      tramos: [{ ref: null, puntos }],
      puntos,
      largo,
      letras: [],
      // Trazada a mano sobre la pista: no hay puntas que enganchar al grafo.
      enganche: 0,
    };
  }

  /**
   * El primer nudo de rodaje que queda **por delante** en la pista.
   *
   * Se mira solo entre los que están cerca del eje —treinta y cinco metros de
   * media anchura de pista más un margen— y por delante en el sentido de la
   * carrera. De esos, el más cercano: la primera salida, que es exactamente lo
   * que se hace en un aeropuerto de verdad y lo que deja la raya delante de
   * los ojos.
   *
   * Si no hay ninguna por delante —se ha aterrizado muy largo, o fuera de la
   * pista— devuelve `null` y la ruta sale del sitio donde esté el avión, que es
   * lo que hacía antes.
   */
  private salidaPorDelante(): Punto | null {
    const x = this.ultimaPos[0];
    const z = -this.ultimaPos[1];
    const aqui = enEjesDePista(
      x,
      z,
      this.pista.x,
      this.pista.z,
      this.pista.heading,
    );
    // Fuera de la pista no hay «por delante» que valga.
    if (Math.abs(aqui.across) > this.pista.width) return null;

    let mejor: Punto | null = null;
    let cerca = Infinity;
    for (const nudo of this.grafo.nudos) {
      const { along, across } = enEjesDePista(
        nudo[0],
        -nudo[1],
        this.pista.x,
        this.pista.z,
        this.pista.heading,
      );
      /*
       * **Dentro del asfalto, no «cerca» del asfalto.**
       *
       * El margen era ancho de pista × 1,6, o sea setenta y dos metros del
       * eje. En Tenerife Norte, E4 tiene un codo **a sesenta y dos metros del
       * eje** y otro nudo en la boca de verdad, sobre el eje, doscientos
       * metros más adelante. Ganaba el codo, porque estaba antes — y ese codo
       * no está en la pista: está en la hierba. Toda la ruta salía de ahí.
       */
      if (Math.abs(across) > this.pista.width / 2) continue;
      /*
       * **Y tiene que haber una calle colgando.**
       *
       * Un nudo en mitad de la pista del que solo sale más pista no es una
       * salida: es un punto del eje. Sin esta condición, «la primera salida
       * por delante» podía ser un trozo de la propia pista.
       */
      const i = this.grafo.nudos.indexOf(nudo);
      const tieneCalle = (this.grafo.desde[i] ?? []).some(
        (t) => !this.grafo.tramos[t]!.pista,
      );
      if (!tieneCalle) continue;
      const adelante = along - aqui.along;
      /*
       * **Y por delante de verdad, con sitio para girar.**
       *
       * Eran sesenta metros, que es lo que ocupa la boca de una salida en un
       * aeropuerto grande. En un campo de novecientos metros con una sola
       * salida, eso la descartaba justo cuando el avión estaba parado a
       * cincuenta metros de ella, y entonces la ruta a casa se trazaba desde
       * donde fuera: naciendo por detrás del avión, o sea fuera de la pantalla.
       * Veinticinco metros son de sobra para girar a paso de rodaje.
       */
      if (adelante < HUECO_PARA_GIRAR) continue;
      /*
       * **Y no la primera: la que deja el camino más corto a casa.**
       *
       * Se cogía la primera por delante, que suena a lo que hace un avión de
       * verdad y en un aeropuerto grande es exactamente lo contrario: se sale
       * por la que va a donde vas. Medido en el banco del vuelo entero: 2753
       * metros y 255 segundos de rodaje de vuelta —cuatro minutos y cuarto,
       * la misma queja que motivó acortar el de ida— porque el avión salía por
       * la primera boca y luego deshacía media pista por la calle paralela.
       *
       * Lo que se compara es la suma: lo que queda de pista hasta esa salida
       * más lo que se rueda desde ella hasta el puesto. Rodar doscientos
       * metros más de pista para ahorrar un kilómetro de calle es lo que hace
       * cualquiera que conozca el campo.
       */
      const casa = this.puestoDeSalida()?.xy;
      const hasta = casa ? rodajeEntre(this.grafo, nudo, casa, 600) : null;
      const coste = adelante + (hasta ? hasta.largo : 0);
      if (coste < cerca) {
        cerca = coste;
        mejor = nudo;
      }
    }
    return mejor;
  }

  /**
   * El tramo que va del avión a la salida, **por la pista y a mano**.
   *
   * Es la misma decisión que ya se tomó para entrar en pista, y por el mismo
   * motivo. Este trozo se pedía al buscador de caminos, y el buscador engancha
   * por el nudo más cercano: recién aterrizado, en la zona de toma, el nudo
   * más cercano es **el extremo de atrás de la pista**, sesenta metros a la
   * espalda. Desde ahí, ir por la pista hasta la salida cuesta seis veces su
   * longitud —la penalización que mantiene a los aviones fuera del asfalto— y
   * el buscador prefería dar la vuelta por la calle paralela.
   *
   * Resultado medido: con el avión parado a doscientos cincuenta metros del
   * umbral, la raya empezaba **doscientos ochenta y seis metros por detrás** y
   * se iba por E5 y por R. Ni un punto de la ruta por delante del morro, en
   * ningún fotograma. Eso es «no me señala el camino, entré por E4 porque
   * sabía dónde estaba».
   *
   * En la pista no hay que buscar camino: la pista **es** el camino. Se va
   * recto por el eje hasta la salida, que es lo que hace cualquiera.
   */
  private porLaPistaHasta(salida: Punto): Ruta {
    const x = this.ultimaPos[0];
    const z = -this.ultimaPos[1];
    const { along } = enEjesDePista(
      x,
      z,
      this.pista.x,
      this.pista.z,
      this.pista.heading,
    );
    const enElEje = puntoDePista(this.pista, -along);
    /*
     * **Y por el eje hasta estar a la altura de la salida, no en diagonal.**
     *
     * Faltaba este punto. Se iba de la proyección del avión sobre el eje
     * directamente a la boca de la salida, y eso son quinientos metros de
     * diagonal: la raya salía del eje poco a poco y acababa pegada al borde
     * del asfalto. «Línea de guía verde hacia E4 que se va hacia fuera de
     * pista» — era exactamente eso, y era mío de anoche.
     *
     * Un avión que acaba de aterrizar rueda **por el eje** hasta la salida y
     * gira allí. Así que el camino son tres tramos: hasta el eje, por el eje,
     * y el giro a la calle.
     */
    const salidaEnEjes = enEjesDePista(
      salida[0],
      -salida[1],
      this.pista.x,
      this.pista.z,
      this.pista.heading,
    );
    const frenteALaSalida = puntoDePista(this.pista, -salidaEnEjes.along);
    // De mundo a fichero: el norte del fichero es la Z negativa del mundo.
    const puntos: Punto[] = [
      this.ultimaPos,
      [enElEje[0], -enElEje[1]],
      [frenteALaSalida[0], -frenteALaSalida[1]],
      salida,
    ];
    let largo = 0;
    for (let i = 1; i < puntos.length; i++) {
      largo += Math.hypot(
        puntos[i]![0] - puntos[i - 1]![0],
        puntos[i]![1] - puntos[i - 1]![1],
      );
    }
    return {
      tramos: [{ ref: null, puntos }],
      puntos,
      largo,
      letras: [],
      // Trazada a mano sobre la pista: no hay puntas que enganchar al grafo.
      enganche: 0,
    };
  }

  /** El largo de la pista, medido entre umbrales. */
  private get largoDePista(): number {
    const p = this.aero.runways[0];
    const u = p
      ? Object.values(p.thresholds).flatMap((t) =>
          t?.xy ? [t.xy as Punto] : [],
        )
      : [];
    const [a, b] = u;
    if (!a || !b) return 2000;
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }

  /**
   * En qué metro de la pista toca dar la media vuelta, o `null` si no hay
   * back-taxi. Se mide a lo largo del eje desde el centro, como `alLargoDePista`.
   *
   * Lo pone `entradaEnPista` al trazar la ruta y lo lee `situacion` para
   * decirle a la máquina de fases que lo que está haciendo el avión no es
   * alinearse. Ver `Situacion.backTaxi`.
   */
  private giroDelBackTaxi: number | null = null;

  /** A dónde va ahora mismo. Sirve para no recalcular la misma ruta cada fase. */
  private destino: "espera" | "puesto" | "pista" | null = null;
  /** Segundos desde el último trazado. Ver `rehacerSiHaceFalta`. */
  private desdeElUltimoTrazado = 0;

  private ultimaPos: Punto = [0, 0];

  private situacion(
    estado: FlightState,
    sobreElSuelo: number,
    motor: boolean,
  ): Situacion {
    const x = estado.position.x;
    const z = estado.position.z;
    this.ultimaPos = [x, -z];

    const { along, across } = enEjesDePista(
      x,
      z,
      this.pista.x,
      this.pista.z,
      this.pista.heading,
    );
    const alEjeDePista = Math.abs(across);

    let alaRuta = 0;
    let restante = 0;
    if (this.rutaMundo.length > 1) {
      alaRuta = aLaPolilinea([x, z], this.rutaMundo);
      restante = this.restanteHasta([x, z]);
    }

    /*
     * **Y el back-taxi se acaba al llegar al sitio de girar, y no vuelve.**
     *
     * Esto se preguntaba cada fotograma —«¿queda pista por detrás?»— y la
     * respuesta volvía a ser que sí en cuanto el avión daba la vuelta y
     * empezaba a correr, porque desde ahí la cuenta a lo largo del eje sube
     * otra vez. O sea que la carrera de despegue entera se hacía en fase de
     * back-taxi: sin V1, sin Vr y sin la flecha de tirar, que son las tres
     * cosas que marcan ese medio minuto. Se ve en el banco tal cual.
     *
     * Así que la bandera es de ida y no de vuelta: se levanta al trazar la
     * ruta y se baja al llegar al giro. Ver `backTaxiDesde`.
     */
    if (
      this.giroDelBackTaxi !== null &&
      along <= this.giroDelBackTaxi + HUECO_PARA_GIRAR
    )
      this.giroDelBackTaxi = null;

    const rumbo = ((estado.heading * 180) / Math.PI + 360) % 360;
    let desalineado = rumbo - this.pista.heading;
    while (desalineado > 180) desalineado -= 360;
    while (desalineado < -180) desalineado += 360;

    return {
      estado,
      alaRuta,
      restante,
      alEjeDePista,
      alLargoDePista: along,
      enPista: alEjeDePista < this.pista.width / 2 + 3,
      backTaxi: this.giroDelBackTaxi !== null,
      pistaRestante: Math.max(0, this.pista.length / 2 - along),
      sobreElSuelo,
      motor,
      desalineado,
    };
  }

  /**
   * A qué velocidad habría que ir en cada punto de la ruta, m/s.
   *
   * Dos cosas la bajan, y son las dos que hay de verdad rodando:
   *
   * - **Lo que falta hasta el final.** Se calcula hacia atrás desde la doble
   *   raya con una deceleración cómoda, que es la cuenta de toda la vida:
   *   `v = √(2·a·d)`. A cuarenta y cinco metros salen nueve por segundo, a
   *   diez salen cuatro, y en la raya, cero.
   * - **Lo cerrada que viene la curva.** El ángulo entre un tramo y el
   *   siguiente: una curva de noventa grados se toma a paso de peatón.
   *
   * Se calcula una vez, al trazar la ruta, y luego solo se consulta.
   */
  private velocidades: number[] = [];

  private calcularVelocidades(): void {
    const n = this.rutaMundo.length;
    this.velocidades = new Array<number>(n).fill(CRUCERO);
    this.recorridos = new Array<number>(n).fill(0);
    for (let i = 1; i < n; i++) {
      this.recorridos[i] =
        this.recorridos[i - 1]! +
        Math.hypot(
          this.rutaMundo[i]![0] - this.rutaMundo[i - 1]![0],
          this.rutaMundo[i]![1] - this.rutaMundo[i - 1]![1],
        );
    }
    if (n < 2) return;

    // **Por el radio de la curva, no por el ángulo del vértice.**
    //
    // `v = √(a·r)` es la cuenta de toda la vida: la velocidad a la que una
    // curva de radio `r` se toma con una aceleración lateral de `a`. Y como
    // mira el radio y no el troceado, redondear los codos no la engaña. Con el
    // ángulo de cada vértice sí lo hacía: repartir un giro de noventa grados
    // entre veinte puntos lo dejaba en cuatro grados por punto, o sea recta.
    for (let i = 0; i < n; i++) {
      const r = this.radios[i] ?? Infinity;
      if (!Number.isFinite(r)) continue;
      this.velocidades[i] = Math.max(
        MINIMO_EN_CURVA,
        Math.min(CRUCERO, Math.sqrt(LATERAL * r)),
      );
    }

    /*
     * ── Y dos pasadas para que el perfil se pueda **conducir** ─────────────
     *
     * Con la velocidad de cada punto sacada solo de su curva, el resultado es
     * una sierra: trece, seis, trece, seis, cada veinte metros, porque una
     * calle de rodaje es una sucesión de codos cortos. Y una sierra no se
     * conduce: el avión pasa el rodaje entero acelerando y frenando. En la
     * traza del vuelo entero se lee tal cual —«6/6, 13/13, 6/6, 13/13»— y en
     * la cabina eso es un tirón detrás de otro.
     *
     * Es el perfil de velocidad de toda la vida, el de cualquier robot que
     * sigue un camino:
     *
     * - **hacia atrás**, para llegar a cada curva ya frenado —incluida la
     *   última, que es la parada—;
     * - **hacia delante**, porque tampoco se acelera de golpe al salir.
     *
     * Con las dos, entre dos codos cercanos la velocidad ya no sube: se queda
     * en la del codo, que es exactamente lo que hace quien conduce.
     */
    const tramo = (i: number): number =>
      Math.hypot(
        this.rutaMundo[i + 1]![0] - this.rutaMundo[i]![0],
        this.rutaMundo[i + 1]![1] - this.rutaMundo[i]![1],
      );

    // El final de la ruta es una parada: ahí está el puesto o la doble raya.
    this.velocidades[n - 1] = 0;
    for (let i = n - 2; i >= 0; i--) {
      const cabe = Math.sqrt(
        this.velocidades[i + 1]! * this.velocidades[i + 1]! +
          2 * FRENADA * tramo(i),
      );
      this.velocidades[i] = Math.min(this.velocidades[i]!, cabe);
    }
    for (let i = 1; i < n; i++) {
      const cabe = Math.sqrt(
        this.velocidades[i - 1]! * this.velocidades[i - 1]! +
          2 * FRENADA * tramo(i - 1),
      );
      this.velocidades[i] = Math.min(this.velocidades[i]!, cabe);
    }
  }

  /** Los metros de ruta recorridos hasta cada punto. Ver `velocidadAqui`. */
  private recorridos: number[] = [];

  /**
   * La velocidad que toca donde va el avión ahora, m/s.
   *
   * **Por lo recorrido y no por lo cercano.** Esto buscaba el punto de la ruta
   * más próximo al avión, y eso solo vale mientras la ruta no se pise a sí
   * misma. El back-taxi la pisa por definición —se va y se vuelve por la misma
   * pista, con diez metros entre la ida y la vuelta—, así que a veinte metros
   * de entrar el punto más cercano era ya **el último de la ruta**, que va a
   * cero porque ahí se para. El avión frenaba en seco y se quedaba clavado
   * seiscientos metros antes de la cabecera: medido, parado a los cincuenta
   * segundos y sin moverse en los ciento cincuenta siguientes.
   *
   * El avance por la ruta ya lo lleva `avanzarEnRuta`, con su memoria de un
   * fotograma para el siguiente, que es justo lo que distingue la ida de la
   * vuelta. Ver #151.
   */
  private velocidadAqui(): number {
    const n = this.velocidades.length;
    if (n < 2 || this.recorridos.length !== n) return CRUCERO;
    const donde = this.avance;
    let i = 1;
    while (i < n - 1 && this.recorridos[i]! < donde) i++;
    const antes = this.recorridos[i - 1]!;
    const largo = this.recorridos[i]! - antes;
    const t = largo > 0 ? Math.max(0, Math.min(1, (donde - antes) / largo)) : 0;
    return (
      this.velocidades[i - 1]! +
      (this.velocidades[i]! - this.velocidades[i - 1]!) * t
    );
  }

  /**
   * Metros de ruta recorridos, con la memoria de un fotograma para el
   * siguiente. Lo mira el coche del sígame. Ver `avanzarEnRuta`.
   */
  get avanceEnLaRuta(): number {
    return this.avance;
  }

  /** El largo total de la ruta de hoy y lo recorrido. Lo mira el banco. #151. */
  get comoVaLaRuta(): { total: number; recorrido: number; puntos: number } {
    let total = 0;
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      total += Math.hypot(
        this.rutaMundo[i + 1]![0] - this.rutaMundo[i]![0],
        this.rutaMundo[i + 1]![1] - this.rutaMundo[i]![1],
      );
    }
    return {
      total: Math.round(total),
      recorrido: Math.round(this.avance),
      puntos: this.rutaMundo.length,
    };
  }

  /**
   * Metros de ruta que quedan, contando desde donde va el avión.
   *
   * Delega en `avanzarEnRuta`, que es la parte que se puede comprobar sin
   * navegador, y **guarda el avance de un fotograma para el siguiente**: sin
   * esa memoria no hay forma de saber por cuál de dos tramos que se pisan va
   * el avión. Ver el porqué en `avanzarEnRuta`.
   */
  private restanteHasta(p: Punto): number {
    const movido = this.dondeEstaba
      ? Math.hypot(p[0] - this.dondeEstaba[0], p[1] - this.dondeEstaba[1])
      : Infinity;
    const donde = avanzarEnRuta(this.rutaMundo, p, this.avance, movido);
    this.avance = donde.recorrido;
    this.dondeEstaba = p;
    return donde.restante;
  }

  /** La letra de la calle por la que toca ir ahora mismo. */
  private letraActual(estado: FlightState): string | null {
    if (!this.ruta || !this.ruta.tramos.length) return null;
    const p: Punto = [estado.position.x, estado.position.z];
    let mejor = Infinity;
    let letra: string | null = null;
    for (const tramo of this.ruta.tramos) {
      const mundo = tramo.puntos.map((q) => [q[0], -q[1]] as Punto);
      const d = aLaPolilinea(p, mundo);
      if (d < mejor) {
        mejor = d;
        letra = tramo.ref;
      }
    }
    return letra;
  }

  /** Cuántas veces se ha puesto una ruta. Lo mira el banco. Ver #151. */
  vecesQueSePusoLaRuta = 0;

  private ponerRuta(ruta: Ruta | null): void {
    this.vecesQueSePusoLaRuta++;
    this.ruta = ruta;
    // Ruta nueva, cuenta nueva: el avance que se llevaba era de otro camino.
    this.avance = 0;
    this.dondeEstaba = null;
    const crudos = ruta ? ruta.puntos.map((p) => [p[0], -p[1]] as Punto) : [];
    const { puntos, radios } = redondear(crudos, RADIO_CURVA);
    this.rutaMundo = puntos;
    this.radios = radios;
    this.calcularVelocidades();
    this.pintar();
  }

  /** Dibuja la ruta en el suelo, y una diana donde termina. */
  private pintar(): void {
    for (const hijo of [...this.grupo.children]) {
      this.grupo.remove(hijo);
      const m = hijo as Mesh;
      m.geometry?.dispose();
      (m.material as { dispose?: () => void })?.dispose?.();
    }
    if (this.rutaMundo.length < 2) return;

    /** De la velocidad que toca al color que se pinta. */
    const colorDe = (v: number): readonly [number, number, number] =>
      v < 3.5 ? ROJO : v < 7.5 ? AMBAR : VERDE;

    /*
     * **Una sola tira, cosida por los vértices.**
     *
     * Antes era un rectángulo suelto por tramo, cada uno con sus extremos
     * cortados en perpendicular a su propia dirección. En recta no se nota; en
     * un codo, los dos rectángulos se encuentran en ángulo y dejan una cuña de
     * asfalto por fuera y un solape por dentro. Eso es lo que se veía: «fíjate
     * en cómo se quiebra a veces». No era un fallo de los datos ni del terreno,
     * era la costura.
     *
     * El arreglo es el inglete de toda la vida: en cada vértice el borde se
     * desplaza por la **bisectriz** de los dos tramos, y se alarga lo justo
     * —`1/cos(θ/2)`— para que la esquina exterior cierre. El tope de dos y
     * medio es para que un giro casi en horquilla no dispare una púa de
     * cincuenta metros.
     */
    const n = this.rutaMundo.length;
    const bordes: { ix: number; iz: number; dx: number; dz: number }[] = [];
    for (let i = 0; i < n; i++) {
      const previo = this.rutaMundo[Math.max(0, i - 1)]!;
      const actual = this.rutaMundo[i]!;
      const siguiente = this.rutaMundo[Math.min(n - 1, i + 1)]!;

      /** La normal a la izquierda de un tramo, o `null` si el tramo es nulo. */
      const izquierdaDe = (a: Punto, b: Punto): Punto | null => {
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        return l < 1e-6 ? null : [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
      };
      const n1 = izquierdaDe(previo, actual);
      const n2 = izquierdaDe(actual, siguiente);
      const base = n1 ?? n2;
      if (!base) {
        bordes.push({ ix: actual[0], iz: actual[1], dx: 0, dz: 0 });
        continue;
      }

      const sx = (n1?.[0] ?? base[0]) + (n2?.[0] ?? base[0]);
      const sz = (n1?.[1] ?? base[1]) + (n2?.[1] ?? base[1]);
      const l = Math.hypot(sx, sz);
      const bx = l < 1e-6 ? base[0] : sx / l;
      const bz = l < 1e-6 ? base[1] : sz / l;
      // Cuánto hay que alargar por la bisectriz para que la esquina cierre.
      const coseno = Math.max(0.4, bx * base[0] + bz * base[1]);
      const escala = Math.min(2.5, 1 / coseno) * (ANCHO / 2);
      bordes.push({
        ix: actual[0],
        iz: actual[1],
        dx: bx * escala,
        dz: bz * escala,
      });
    }

    const pos = new Float32Array(n * 2 * 3);
    const col = new Float32Array(n * 2 * 3);
    const indices: number[] = [];
    for (let i = 0; i < n; i++) {
      const b = bordes[i]!;
      const c = colorDe(this.velocidades[i] ?? CRUCERO);
      // Izquierda y derecha del mismo vértice, en ese orden.
      const lados: readonly [number, number][] = [
        [b.ix + b.dx, b.iz + b.dz],
        [b.ix - b.dx, b.iz - b.dz],
      ];
      lados.forEach(([qx, qz], lado) => {
        const k = (i * 2 + lado) * 3;
        pos[k] = qx;
        // La cota se muestrea en cada esquina y no una vez por tramo: sobre una
        // pista con pendiente, una raya plana se entierra por un extremo.
        pos[k + 1] = this.cota(qx, qz) + ALTURA;
        pos[k + 2] = qz;
        // El color va **en los vértices**, no en el material: así la raya
        // entera sigue siendo una sola llamada de dibujo y a la vez cambia de
        // color a lo largo, que es de lo que se trata.
        col[k] = c[0];
        col[k + 1] = c[1];
        col[k + 2] = c[2];
      });
      if (i < n - 1) {
        const a = i * 2;
        indices.push(a, a + 2, a + 3, a, a + 3, a + 1);
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new Float32BufferAttribute(col, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const piezas: BufferGeometry[] = [geo];

    const fusionada = piezas.length ? mergeGeometries(piezas, false) : null;
    if (fusionada) {
      const malla = new Mesh(
        fusionada,
        new MeshLambertMaterial({
          vertexColors: true,
          // Gana siempre contra el asfalto, esté a la distancia que esté. Y con
          // menos prioridad que las letras del suelo: la ayuda va debajo de la
          // lección, no encima.
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        }),
      );
      malla.name = "ruta";
      this.grupo.add(malla);
    }

    /*
     * La diana del final: un aro, que se ve de lejos y no tapa nada.
     *
     * **Ni tan grande ni rojo, que las dos cosas estaban mal.** Eran
     * veinticuatro metros de diámetro —más del doble de la envergadura— y a
     * ras de suelo con la cámara detrás llenaban media pantalla al llegar; y
     * encima tapaban una banda de tres metros de las marcas de puesto de la
     * fotografía, o la doble raya de espera cuando la ruta acaba ahí, que es
     * justo lo que hay que aprender a respetar.
     *
     * Y el rojo ya está cogido. En este juego significa «pará» o «esto salió
     * mal»: la lámpara de la torre, el aro de la senda que se escapó, el
     * extremo donde se acaba la pista. Premiar la llegada con un rojo gigante
     * es enseñar dos cosas contrarias con el mismo color, en un juego que se
     * apoya en el color justamente para no tener que escribir.
     *
     * Ahora es del tamaño de la envergadura y del mismo ocre que los aros de
     * la senda cuando todavía te faltan: «esto es lo que te queda». Quien dice
     * «pará aquí» es el señor de los bastones, que para eso está.
     */
    const fin = this.rutaMundo[this.rutaMundo.length - 1]!;
    const aro = new Mesh(
      new RingGeometry(5, 6.4, 32),
      new MeshBasicMaterial({
        color: 0xdd923f,
        transparent: true,
        opacity: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5,
      }),
    );
    aro.rotation.x = -Math.PI / 2;
    aro.position.set(fin[0], this.cota(fin[0], fin[1]) + ALTURA + 0.02, fin[1]);
    aro.name = "diana";
    this.grupo.add(aro);
  }
}
