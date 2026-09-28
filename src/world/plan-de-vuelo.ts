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
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  RingGeometry,
  SRGBColorSpace,
} from "three";
import { laRedonda } from "./luces-de-posicion";
import { jalonar } from "./luces-de-rodadura";
import type { Aerodrome, Punto } from "./aerodrome";
import { aLaPolilinea } from "./aerodrome";
import { sinTemblor } from "./sin-temblor";
import { velocidadDePerdida, type AircraftConfig } from "../flight/aircraft";
import {
  AIRE_ESTANDAR,
  type Aire,
  trueFromIndicated,
} from "../flight/atmosphere";
import {
  paraEntrarYDespegar,
  pistaQueHaceFalta,
  pistaQueNecesita,
} from "../flight/carrera";
import { radioDeGiro } from "../flight/cabe";
import { ESPERA_MAXIMA } from "../flight/radio";
import { PuertaAsignada } from "./puerta-asignada";
import {
  construirGrafo,
  rectaPorPavimento,
  rodajeEntre,
  rodajesDesde,
  type Grafo,
  type Ocupados,
  type Ruta,
  type Tramo,
} from "./rodaje";
import { delante, enEjesDePista, puntoDePista, traves } from "./rumbo";
import { hastaElUmbralDeToma } from "./umbral-desplazado";
import {
  GUION,
  PARADO,
  Vuelo,
  type Fase,
  type Paso,
  type Situacion,
} from "../flight/vuelo";
import type { FlightState } from "../flight/model";

/**
 * Ancho de la raya que marca la ruta, m.
 *
 * **Medio metro.** Con cuatro parecía un río verde de orilla a orilla de la
 * calle; con dos **tapaba las letras pintadas en el asfalto**, que son justo
 * lo que hay que aprender a leer ahí: «la línea a seguir es gruesa y tapa las
 * marcas de la pista (las letras) y creo que eso es un elemento que el
 * jugador debe ver». Con uno y medio seguía siendo lo que más se veía del
 * suelo: «siempre me ha parecido muy invasiva, podría ser algo más estrecha y
 * bonita».
 *
 * Lo que la hace legible de lejos ya no es el ancho: son **las luces** que
 * lleva encima. Ver `SEPARACION_DE_LUCES`.
 */
const ANCHO = 0.5;

/**
 * Cada cuántos metros va una luz sobre la raya, m.
 *
 * **Es el «follow the greens» de los aeropuertos grandes**: luces verdes
 * empotradas en el eje de la calle de rodaje que la torre enciende solo por
 * delante del avión al que guía, tramo a tramo, y apaga por detrás. Quien
 * aprenda aquí a seguir la raya se encontrará lo mismo el día que ruede por
 * Heathrow o por Dubái, que es la regla de la casa: lo que se enseña es real.
 *
 * Siete y medio es la separación de las luces de eje en curva y en las zonas
 * de baja visibilidad; en recta de verdad van a quince, pero a quince, desde la
 * cabina de un teléfono, la fila se lee como puntos sueltos y no como camino.
 */
const SEPARACION_DE_LUCES = 7.5;

/** El radio de cada luz en el suelo, m: una bombilla de medio metro por lado. */
const RADIO_DE_LUZ = 0.5;

/**
 * Cuánta raya se enciende por delante del avión, m.
 *
 * Trescientos: lo que se rueda en medio minuto, y lo que cabe en pantalla desde
 * la cámara de persecución. Más allá quedan tenues —la ruta entera se sigue
 * viendo, para saber a dónde se va— y por detrás se apagan, que es lo que
 * hacen las de verdad: las que ya se pisaron no guían a nadie.
 */
const ENCENDIDO_POR_DELANTE = 300;

/** Lo que brillan las del fondo, de uno. Se ven, pero no llaman. */
const TENUES = 0.3;

/** Lo que mide cada luz en pantalla, en píxeles: su brillo, visto de lejos. */
const LUZ_EN_PANTALLA = 7;

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

/** Las luces de la raya, para encenderlas según avanza el avión. */
interface LucesDeLaRaya {
  /** Dónde cae cada una, en metros de ruta desde el principio. */
  readonly s: Float32Array;
  /** La bombilla en el suelo: nueve vértices por luz, con su transparencia. */
  readonly bombillas: Float32BufferAttribute;
  /** Y su brillo en pantalla, uno por luz. */
  readonly brillos: Float32BufferAttribute;
  /** Cada cuántos índices empieza un tramo de la raya. Ver `apagarDetras`. */
  readonly acumulado: Float32Array;
  readonly raya: BufferGeometry;
}

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
/*
 * **Y en lineal, que es como los lee la tarjeta.** Los tres están escritos en
 * sRGB, que es como se eligen a ojo; un color de vértice se toma tal cual como
 * lineal, y sin sombreado encima salían lavados —el verde, casi menta, y las
 * luces casi blancas—. Con luz de escena no se notaba porque el sombreado los
 * oscurecía. El verde es el de las luces de eje de rodadura del propio
 * aeropuerto (`luces-de-rodadura.ts`): son lo mismo, y se ven igual.
 */
const enLineal = (hex: number): readonly [number, number, number] => {
  const c = new Color().setHex(hex, SRGBColorSpace);
  return [c.r, c.g, c.b];
};
const VERDE = enLineal(0x2fd36b);
const AMBAR = enLineal(0xe8b13a);
const ROJO = enLineal(0xc94a3d);

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

/*
 * **Cuánta pista hace falta lo dice el avión, no una constante.**
 *
 * Aquí había mil doscientos metros escritos a mano —casi el triple de lo que
 * corre el Pykasu— y en `aerodrome.ts` seiscientos para entrar y despegar.
 * Los dos son el primer avión de la flota con propina, y con dos avionetas eso
 * valía. Con seis aviones no: en La Palma la calle de rodaje muere en el medio
 * de una pista de dos mil doscientos, así que entrar por ahí deja mil cien por
 * delante — pista de sobra para el Pykasu y la mitad de lo que necesita el
 * JAZ 120. «Me hace despegar desde la mitad de la pista, vaya locos.»
 *
 * Ahora las dos cuentas salen de `flight/carrera.ts`, que integra la rodadura
 * de este avión con su empuje, su peso y su rozamiento. Para el Pykasu dan los
 * mismos seiscientos y mil doscientos de antes, así que **nada de lo que ya
 * estaba medido en los diez aeródromos cambia**; para el grande dicen que a
 * ese avión no se le entra por una intersección nunca, y se hace el back-taxi
 * hasta la cabecera como en la vida real.
 */

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
 * ruta sea un camino y no un salto se encarga el enganche.
 *
 * **Y ya no descarta: prefiere.** Ver `parDeSalida`. Sesenta sigue siendo lo
 * que se quiere rodar, pero El Hierro no lo da —de sus nueve puestos al punto
 * de espera hay entre 37 y 59 metros, y es así de verdad— y un campo que no lo
 * da no puede quedarse sin ruta por ello.
 */
const LO_MINIMO_QUE_SE_RUEDA = 60;

/**
 * Dónde se da por hecho que el avión ha dejado de correr al aterrizar, m.
 *
 * Mil metros pasado el umbral —el de aterrizar, que con el umbral desplazado
 * no es la punta—. El Pykasu para en bastante menos, pero lo que
 * se busca con este número no es una toma concreta: es el sitio desde el que
 * se mide **cuánto se rueda hasta casa** al elegir el puesto.
 */
const TRAS_TOMAR_TIERRA = 1000;

/** Metros que tiene que quedar por delante para poder tomar una salida. */
const HUECO_PARA_GIRAR = 25;

/**
 * Con qué se frena para tomar una salida de pista, m/s², y a qué velocidad
 * se toma, m/s. Ver `salidaPorDelanteQue`.
 *
 * Un metro y medio por segundo cada segundo es una frenada de aterrizaje
 * tranquila —la de un freno automático en su punto más suave anda por ahí— y
 * ocho metros por segundo, treinta por hora, es a lo que se entra en una
 * salida sin que el avión se abra. Con esas dos, una avioneta que toca a
 * treinta metros por segundo tiene su primera salida útil a unos trescientos
 * metros, y un reactor que toca a setenta, a kilómetro y medio: que es donde
 * los aeropuertos ponen sus salidas rápidas.
 */
const FRENADA_PARA_SALIR = 1.5;
const A_LA_SALIDA = 8;

/**
 * Volviendo por la pista después de aterrizar: con qué se frena hasta el paso
 * de la media vuelta, m/s²; lo que se deja entre la vuelta y el final de la
 * pista, y lo que se deja entre las ruedas y el borde del asfalto. Ver
 * `vueltaPorLaPista`.
 */
const FRENADA_DE_RODAJE = 1;
const FIN_PARA_LA_VUELTA = 10;
const BORDE_DE_LA_VUELTA = 2;

/**
 * Lo más que puede volverse una salida contra el sentido del aterrizaje, en
 * grados.
 *
 * Cien: una salida en ángulo recto vale —hay calles que salen a noventa y dos
 * o noventa y tres grados según cómo esté dibujado el eje—, y una que obliga a
 * dar media vuelta no. En Los Rodeos, aterrizando por la 12, la E2 sale a
 * ciento setenta grados: se cogía porque ahorraba metros de calle, y el avión
 * rodaba doscientos cuarenta metros pista adelante, daba media vuelta sobre el
 * asfalto y deshacía doscientos hacia atrás, alejándose del coche que lo
 * esperaba. Una salida rápida se toma hacia donde se va.
 */
const GIRO_MAXIMO_DE_UNA_SALIDA = 100;

/** Cuánto de la calle se mira para saber hacia dónde sale, m. */
const PRIMER_TRAMO_DE_CALLE = 40;

/**
 * Lo lejos del final de la pista que puede llegar una calle y ser todavía la
 * de la cabecera, m: la que entra ahí da la pista entera, o casi, y no es una
 * salida por intersección. Ver `esperasPorInterseccion`.
 */
const EN_LA_CABECERA = 150;

/**
 * Cuánto de una salida de pista se mira para ver si se toma al revés, m: lo
 * que mide una salida rápida de la pista a su paralela. Ver
 * `salidaPorDelanteQue`.
 */
const BOCA_DE_LA_SALIDA = 250;

/** Una raya cortada a tantos metros de su principio. */
function hastaLosMetros(puntos: readonly Punto[], metros: number): Punto[] {
  const salida: Punto[] = [];
  let recorrido = 0;
  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i]!;
    if (i > 0) {
      const a = puntos[i - 1]!;
      const l = Math.hypot(p[0] - a[0], p[1] - a[1]);
      if (recorrido + l >= metros) {
        const t = l > 0 ? (metros - recorrido) / l : 0;
        salida.push([a[0] + (p[0] - a[0]) * t, a[1] + (p[1] - a[1]) * t]);
        return salida;
      }
      recorrido += l;
    }
    salida.push(p);
  }
  return salida;
}

/**
 * Hacia dónde sale una calle de un nudo: el vector unitario desde el nudo
 * hasta el punto de la calle a `PRIMER_TRAMO_DE_CALLE` metros, en coordenadas
 * del fichero (la Y al norte).
 */
export function haciaDondeSale(
  tramo: { readonly puntos: readonly Punto[] },
  nudo: Punto,
): readonly [number, number] | null {
  const pts = tramo.puntos;
  if (pts.length < 2) return null;
  const alPrincipio =
    Math.hypot(pts[0]![0] - nudo[0], pts[0]![1] - nudo[1]) <=
    Math.hypot(
      pts[pts.length - 1]![0] - nudo[0],
      pts[pts.length - 1]![1] - nudo[1],
    );
  const orden = alPrincipio ? pts : [...pts].reverse();
  let lejos = orden[orden.length - 1]!;
  for (const q of orden) {
    if (Math.hypot(q[0] - nudo[0], q[1] - nudo[1]) >= PRIMER_TRAMO_DE_CALLE) {
      lejos = q;
      break;
    }
  }
  const dx = lejos[0] - nudo[0];
  const dy = lejos[1] - nudo[1];
  const l = Math.hypot(dx, dy);
  return l < 1 ? null : [dx / l, dy / l];
}

/**
 * Si una calle sale de la pista hacia donde se va rodando, o casi: no más de
 * `GIRO_MAXIMO_DE_UNA_SALIDA` grados contra el rumbo de la carrera. El rumbo
 * es verdadero, en grados; la dirección, en coordenadas del fichero.
 */
export function saleHaciaDelante(
  direccion: readonly [number, number],
  rumbo: number,
): boolean {
  const h = (rumbo * Math.PI) / 180;
  // Hacia delante en el fichero es (sen h, cos h): la Y apunta al norte.
  const coseno = direccion[0] * Math.sin(h) + direccion[1] * Math.cos(h);
  return coseno >= Math.cos((GIRO_MAXIMO_DE_UNA_SALIDA * Math.PI) / 180);
}

/**
 * Lo estrecha que puede ser una pista y aun así admitir un back-taxi, m.
 *
 * Treinta y seis. La maniobra se rueda por una raya apartada del eje y se
 * vuelve **por el eje**, así que lo que separa la ida de la vuelta es esa
 * apartada: medio ancho menos cuatro metros de borde. Con treinta y seis
 * salen catorce, más que la envergadura de el Pykasu, y por debajo de eso
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
 * A cuántos grados del rumbo de despegue se da por acabada la media vuelta
 * del back-taxi.
 *
 * Treinta: pasado eso ya no se está girando sino corrigiendo, y lo que queda
 * es ponerse en el eje, que es la fase «alineando». Ver `situacion`.
 */
const YA_DIO_LA_VUELTA = 30;

/**
 * Pista que se procura dejar por delante al entrar, m.
 *
 * Cuatrocientos: el Pykasu despega en doscientos sesenta medidos en el banco,
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
 * La semiala del más grande del tráfico dibujado, m: el reactor, de treinta y
 * cuatro de envergadura. Ver `TIPOS` en `trafico.ts`. Con la del grande vale
 * para todos: sobra sitio con uno pequeño, y nunca falta.
 */
const SEMIALA_DEL_TRAFICO = 17;

/**
 * Lo que se dejan entre puntas de ala dos aviones que se cruzan en una calle,
 * m. El de la clave C de la OACI, como `MARGEN_DE_ALA` en `rodaje.ts`.
 */
const MARGEN_ENTRE_ALAS = 7.5;

/**
 * **El hueco que se deja al de delante en la cola de salida**, m, de borde a
 * borde: entre la cola del uno y el morro del otro, contados con la semiala
 * de cada uno como largo. Treinta: sitio para que el de delante gire al
 * entrar en la pista sin que el de detrás tenga que moverse, y fuera de lo
 * peor del chorro de su motor. Ver `hastaElDeDelante`.
 */
const HUECO_EN_LA_COLA = 30;

/**
 * **Lo que se espera detrás de uno que no se mueve**, s, antes de dejar de
 * esperarle y buscar otro camino. Es `ESPERA_MAXIMA` de la radio: lo más que
 * pasa entre dos llamadas de un mismo vuelo, o sea lo más que puede tardar la
 * torre en darle la orden al de delante. Pasado eso ya no se la va a dar —su
 * vuelo se acabó en la frecuencia, o se quedó colgado—, y una cola que no
 * avanza nunca es un juego colgado para quien espera en ella. Ver
 * `hastaElDeDelante`.
 */
const PACIENCIA_EN_LA_COLA = ESPERA_MAXIMA;

/**
 * Lo cerca de donde se le dejó de esperar que tiene que seguir uno de la cola
 * para ser el mismo, m: el que se ha movido más que esto ya avanza, y vuelve
 * a contar.
 */
const YA_NO_SE_LE_ESPERA = 10;

/**
 * Lo que cuesta de más, en metros, salir de la pista por una calle en la que
 * hay un avión parado. Un kilómetro: se rueda hasta la siguiente salida antes
 * que meterse por esa, y solo se coge si no hay otra.
 */
const SALIDA_OCUPADA = 1000;

/**
 * A partir de cuántos metros de la raya se considera que ya no vas por ella, m.
 *
 * Veinticinco: más de media calle de rodaje. Menos que eso es ir por la raya
 * torcido, que no es motivo para recalcular nada.
 */
const LEJOS_DE_LA_RAYA = 25;

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
 * A partir de qué giro un codo de la ruta es una media vuelta, en radianes.
 *
 * Ciento cincuenta grados. Por debajo es una esquina cerrada —la salida de
 * una calle que sale cruzada— y se redondea como todas; por encima, el
 * filete de un codo deja de tener sentido y se dibuja la vuelta entera. Ver
 * `redondear`.
 */
const MEDIA_VUELTA = (150 * Math.PI) / 180;

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
 * El colchón de la cuenta de frenada, **en segundos**.
 *
 * Sin él, el aviso salta exactamente cuando ya no queda margen, que es tarde:
 * hay que enterarse, decidir y mover la mano, y eso es un segundo y medio.
 *
 * Eran quince metros fijos —ese segundo y medio a velocidad de rodaje—, y un
 * colchón en metros no se encoge con la velocidad: a menos de quince metros
 * de la doble raya no cabía nada, y cualquiera que se moviera iba «rápido»,
 * también quien se arrimaba a paso de persona, que es justo como se llega a
 * una doble raya. Lo que se tarda en reaccionar es tiempo; en metros es lo
 * que se recorre mientras tanto, y a paso de persona es poco.
 */
const REACCION = 1.5;

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
 * Cuánto acercamiento a la raya cuenta el amortiguador, como mucho, m/s.
 *
 * Dos. No es un ajuste fino: es lo que separa amortiguar de estrellarse. Cerca
 * de una plataforma la ruta hace codos cerrados, el error de rumbo contra el
 * tramo más próximo es enorme, y sin tope el término se dispara y manda girar
 * al lado que no. Ver `asistencia`.
 */
const TOPE_DE_ACERCAMIENTO = 2;

/**
 * A partir de qué error de rumbo la ayuda deja de ayudar, en radianes.
 *
 * Ciento veinte grados. Por debajo es una curva de calle de rodaje —cerrada,
 * pero una curva—; por encima ya no se está corrigiendo un rumbo, se está
 * pidiendo media vuelta, y eso no lo hace una ayuda: lo hace quien pilota. Ver
 * `asistencia`.
 *
 * **Estaba en setenta, y setenta prohíbe la curva que hay que dar.** La salida
 * de un puesto a su calle es una esquina de noventa grados largos —medida en
 * Pettirossi, noventa y seis— así que el guardia se disparaba justo ahí y la
 * ayuda callaba en la primera curva del rodaje. Una esquina de noventa grados
 * es lo más corriente que hay en un aeropuerto; media vuelta es lo que se
 * acerca a ciento ochenta.
 *
 * Y lo que este número protegía —la pirueta al pasar la boca de la salida, con
 * el avión girando sobre sí mismo y retrocediendo por la pista— hace tiempo
 * que lo protege algo mejor y en el sitio que le toca: la autoridad de la rueda
 * de morro cae con la velocidad, que es física y no una regla de ayuda. Ver
 * `arcade-rodaje.test.ts`. Aquí solo queda el caso de verdad: el punto de la
 * ruta que toca ha quedado a la espalda.
 */
export const VUELTA_EN_U = (120 * Math.PI) / 180;

/**
 * **A qué distancia se mira dentro de una media vuelta de la raya**, m, de la
 * más larga a la más corta. Ver `asistencia`.
 *
 * Diez, seis y tres: una media vuelta de radio de giro de avioneta —de cuatro
 * a nueve metros— tiene medio perímetro de trece a veintiocho, así que la
 * primera que cae por delante está dentro de la curva y no pasada.
 */
const MIRADAS_EN_LA_VUELTA = [10, 6, 3] as const;

/**
 * Cuánto se puede estar de la raya para que su media vuelta se tome, m.
 *
 * Veinte, media pista y algo. Una media vuelta se da a lo ancho de la pista,
 * y quien llega a ella algo rápido se abre: medido en Estigarribia, con el
 * gas a fondo y la verde, el JAZ 20 entraba en la vuelta del back-taxi y a
 * los nueve metros de la raya —con ocho de límite— la ayuda soltaba y el
 * avión se iba recto por la hierba. Más lejos que esto ya no se va por la
 * raya, y lo que haya detrás no es una vuelta suya.
 */
const EN_LA_RAYA_PARA_VOLVER = 20;

/**
 * El error de rumbo para ir de un sitio a otro, en radianes y entre ±π.
 *
 * Suelto y exportado porque es la cuenta con la que la ayuda de rodaje decide
 * si lo que tiene delante es una curva o una media vuelta, y esa decisión se
 * comprueba sin navegador. Ver `VUELTA_EN_U` y `asistencia`.
 */
export function errorDeRumbo(
  desde: Punto,
  rumbo: number,
  hacia: Punto,
): number {
  const quiero = Math.atan2(hacia[0] - desde[0], -(hacia[1] - desde[1]));
  let e = quiero - rumbo;
  while (e > Math.PI) e -= Math.PI * 2;
  while (e < -Math.PI) e += Math.PI * 2;
  return e;
}

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
  /** La lección de rodar, terminada: parado en la doble raya. */
  readonly leccionHecha: boolean;
  /**
   * En la pista y con el morro hacia donde se despega, a menos de
   * `MIRANDO_LA_PISTA`: la vuelta de entrar ya está dada. Lo mira el tope de
   * rodaje de Guyrami. Ver `entraConElJuego` en `flight/tope-de-rodaje.ts`.
   */
  readonly mirandoLaPista: boolean;
}

/**
 * **Cuánto puede apartarse el morro del rumbo de la pista para darla por
 * encarada**, en grados.
 *
 * Ocho, los mismos que pide la fase de despegar, pero sin sus doce metros de
 * eje: es haber acabado de girar hacia la pista, esté el avión donde esté de
 * lo ancho. Se probó con treinta y era pronto: con el gas a fondo, el avión
 * que acababa de encarar la pista salía disparado con el giro a medias, a la
 * ayuda de rodaje no le daba tiempo y se iba de la pista en nueve campos de
 * dieciocho. Medido con `verificar-verde-sin-volante`.
 */
export const MIRANDO_LA_PISTA = 8;

/**
 * Las fases en las que se rueda por una calle y tiene sentido pedir despacio.
 *
 * No están las de la pista —autorizado, alineando, despegando, comprometido,
 * aterrizado— porque ahí la velocidad es la lección, ni las del aire.
 */
const RODANDO_DE_VERDAD: ReadonlySet<Fase> = new Set<Fase>([
  "arrancando",
  "rodando",
  "esperando",
  "abandonando",
  "a-plataforma",
  /*
   * Y el back-taxi, que se rueda por la pista pero es rodaje: llegar deprisa
   * a la media vuelta del final es salirse de la pista. Donde el juego lleva
   * el gas no se riñe —ver `laVelocidadEsDelJuego`—; donde lo llevás vos, se
   * avisa como en cualquier curva.
   */
  "back-taxi",
]);

/**
 * Si se rueda **más deprisa de lo que toca**: más que la velocidad de aquí con
 * su margen, o más de lo que se puede parar en lo que queda de ruta: lo que se
 * recorre reaccionando y lo que se recorre frenando. Ver el porqué de cada
 * cosa donde se usa, en `paso`, y el colchón en `REACCION`.
 *
 * **Y parado no se va rápido.** Con el colchón en metros fijos, a menos de
 * quince de la doble raya la cuenta de frenada daba «rápido» también a cero
 * por hora: con el avión quieto en el punto de espera, «más despacio» cada
 * seis segundos. Se tapó con lo de parado, y seguía igual para quien se
 * arrimaba despacio, que es lo que se pide ahí. Con el colchón en tiempo,
 * parado no hay nada que recorrer, y despacio casi nada.
 */
export function vaRapido(
  fase: Fase,
  porElSuelo: number,
  sugerida: number,
  restante: number,
): boolean {
  if (!RODANDO_DE_VERDAD.has(fase) || porElSuelo < PARADO) return false;
  const paraParar =
    porElSuelo * REACCION + (porElSuelo * porElSuelo) / (2 * FRENADA);
  return porElSuelo > sugerida * MARGEN + 2 || paraParar > restante;
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

/**
 * Cuánto puede adelantarse el avance, además de lo movido, sin salir de su
 * tramo, m.
 *
 * Treinta: más que lo que una curva redondeada alarga la ruta frente a su
 * cuerda en un fotograma, que es lo que obligó a no frenar el avance hacia
 * delante, y mucho menos que el salto al tramo de vuelta de un back-taxi, que
 * son cientos. Ver `avanzarEnRuta`.
 */
const ADELANTO_EN_SU_TRAMO = 30;

/**
 * Hasta qué distancia de su tramo se da por hecho que el avión sigue por él,
 * m.
 *
 * Veinte: más que lo que separa la ida de la vuelta en un back-taxi —ocho
 * metros con el JAZ 90, quince con el Pykasu— y menos que lo que hace falta
 * para rehacer la ruta por haberse ido de ella. Ver `LEJOS_DE_LA_RAYA`.
 */
const SIGUE_EN_SU_TRAMO = 20;

/**
 * Cuánta raya se mira a cada lado del avance para corregir la deriva, m. Ver
 * `asistencia`.
 */
const CERCA_DEL_AVANCE = 40;

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
  /*
   * **Pero tampoco se salta a un tramo que va por delante y se pisa con el
   * de ahora.**
   *
   * El back-taxi es exactamente eso: se va por una raya apartada del eje y se
   * vuelve **por el eje**, a ocho metros con el JAZ 90. Rodando por el eje a
   * la ida —que es lo natural en una pista—, el tramo más cercano era el de
   * vuelta: la cuenta saltaba cientos de metros hacia delante, la velocidad
   * sugerida era la del final de la ruta —cero— y el avión se quedaba
   * clavado a mitad de pista. Medido en el banco en Lanzarote, parado para
   * siempre justo en el último punto de la ruta.
   *
   * Así que, cuando el más cercano queda **más allá** de su tramo —lo que va
   * desde donde se iba hasta lo movido más una propina larga, que es lo que
   * deja correr al avance en las curvas—, se mira si el avión sigue cerca de
   * su tramo: si sigue, es por ahí por donde va. Solo si se ha ido lejos de
   * todo lo de su tramo —un atajo, un salto— manda el más cercano de los que
   * no van hacia atrás, como antes.
   */
  const hasta = avanceAnterior + movido + ADELANTO_EN_SU_TRAMO;
  let deTodos = { d: Infinity, recorrido: 0 };
  let sinRetroceder = { d: Infinity, recorrido: 0 };
  let enSuTramo = { d: Infinity, recorrido: 0 };
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
    const largo = largos[i]!;
    const recorrido = acumulado + t * largo;
    if (d < deTodos.d) deTodos = { d, recorrido };
    if (d < sinRetroceder.d && recorrido >= noAntesDe) {
      sinRetroceder = { d, recorrido };
    }
    // El punto de este tramo más cercano **sin salirse de la ventana**.
    if (acumulado + largo >= noAntesDe && acumulado <= hasta) {
      const desde = largo > 0 ? Math.max(0, (noAntesDe - acumulado) / largo) : 0;
      const tope = largo > 0 ? Math.min(1, (hasta - acumulado) / largo) : 1;
      const tv = Math.max(desde, Math.min(tope, t));
      const dv = Math.hypot(p[0] - (a[0] + tv * dx), p[1] - (a[1] + tv * dy));
      if (dv < enSuTramo.d) enSuTramo = { d: dv, recorrido: acumulado + tv * largo };
    }
    acumulado += largo;
  }

  // Y si no queda ninguno, es que el avión no está donde creíamos: se vuelve a
  // empezar por el más cercano en vez de defender una cuenta que ya no
  // describe nada. Pasa siempre en una ruta de un solo tramo, donde tampoco
  // hay ambigüedad de la que protegerse.
  const salta = sinRetroceder.d < Infinity && sinRetroceder.recorrido > hasta;
  const elegido =
    salta && enSuTramo.d <= SIGUE_EN_SU_TRAMO
      ? enSuTramo
      : sinRetroceder.d < Infinity
        ? sinRetroceder
        : deTodos;
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
  /** Con qué radio se dibuja una media vuelta. Ver `MEDIA_VUELTA`. */
  radioDeVuelta = radio,
): { puntos: Punto[]; radios: number[]; vueltas: boolean[] } {
  /*
   * **Y una recta sola también se trocea.** Sin codo que redondear se
   * devolvía tal cual, sin pasar por `trocear`, y una recta de ciento
   * cincuenta metros —la ida por la pista hasta la media vuelta, ver
   * `vueltaPorLaPista`— se quedaba en dos puntos: ni luces por el camino ni
   * nada que el banco de llegadas pudiera ver delante del morro.
   */
  if (pts.length < 3)
    return trocear(
      pts.map((p) => [...p] as Punto),
      pts.map(() => Infinity),
      pts.map(() => false),
    );

  const puntos: Punto[] = [[...pts[0]!] as Punto];
  const radios: number[] = [Infinity];
  /*
   * Y qué puntos son de una media vuelta, que el perfil de velocidad trata
   * aparte: ver `alisarRuta` y `calcularVelocidades`.
   */
  const vueltas: boolean[] = [false];

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
      vueltas.push(false);
      continue;
    }

    /*
     * **Y una media vuelta se dibuja como media vuelta.**
     *
     * El filete de abajo retrocede `radio·tan(giro/2)` por cada tramo, y a
     * ciento ochenta grados la tangente es infinita: el retroceso se iba al
     * tope del cuarenta y cinco por ciento del tramo y la curva, que es una
     * Bézier con el vértice de control, **daba la vuelta a mitad de camino**.
     * En La Gomera, rodando hacia la raqueta del final para volver por la
     * pista, la raya se daba la vuelta ciento setenta metros antes de llegar,
     * en mitad de la pista, y la ayuda de rodaje giraba el avión allí.
     *
     * Así que la vuelta se dibuja con su forma: se llega al vértice apartado
     * a un lado del eje y se vuelve por el otro con una semicircunferencia
     * del radio de giro de este avión, que es como se da en una pista o en
     * una raqueta.
     */
    if (giro > MEDIA_VUELTA) {
      const r = Math.max(2, Math.min(radioDeVuelta, l1 * 0.45, l2 * 0.45));
      // Hacia el lado al que se va la vuelta; si es exacta, a la izquierda.
      const cruz = u1[0] * u2[1] - u1[1] * u2[0];
      const lado = cruz >= 0 ? 1 : -1;
      const n: Punto = [-u1[1] * lado, u1[0] * lado];
      const c: Punto = [b[0] - u1[0] * r, b[1] - u1[1] * r];
      const PASOS = 12;
      for (let k = 0; k <= PASOS; k++) {
        const th = -Math.PI / 2 + (Math.PI * k) / PASOS;
        puntos.push([
          c[0] + u1[0] * r * Math.cos(th) + n[0] * r * Math.sin(th),
          c[1] + u1[1] * r * Math.cos(th) + n[1] * r * Math.sin(th),
        ] as Punto);
        radios.push(r);
        vueltas.push(true);
      }
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
      vueltas.push(false);
    }
  }

  puntos.push([...pts[pts.length - 1]!] as Punto);
  radios.push(Infinity);
  vueltas.push(false);
  return trocear(puntos, radios, vueltas);
}

/**
 * El radio de la circunferencia que pasa por tres puntos, m, o `Infinity` si
 * están alineados.
 *
 * Es lo que se le pregunta a la geometría exacta —la media vuelta del
 * back-taxi—, que no pasa por `redondear` y por tanto no trae el radio
 * apuntado: se mide.
 */
export function radioPorTres(a: Punto, b: Punto, c: Punto): number {
  const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
  const ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
  const doble =
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(doble) < 1e-6) return Infinity;
  return (ab * bc * ca) / (2 * Math.abs(doble));
}

/**
 * La ruta tal como se pinta y se rueda: sin temblor, con los codos
 * redondeados y el radio de cada punto — **menos lo que ya viene exacto**.
 *
 * `exactaDesde` es el índice desde el que la geometría no se toca: la media
 * vuelta del back-taxi, que ya es un arco con el radio de giro de ese avión y
 * que el quitatemblores y el redondeo convertían en un codo más cerrado de lo
 * que el avión puede girar. De ahí en adelante los puntos se dejan como están
 * y el radio se mide con `radioPorTres`.
 *
 * `exactos` dice qué puntos son de esa parte, que es lo que necesita el perfil
 * de velocidad: una media vuelta no se toma como una curva. Ver
 * `calcularVelocidades`.
 */
export function alisarRuta(
  crudos: readonly Punto[],
  exactaDesde?: number,
  /** El radio de giro del avión, para las medias vueltas. Ver `redondear`. */
  radioDeVuelta = RADIO_CURVA,
  /** Hasta dónde llega lo exacto, si no llega al final. Ver `Ruta.exactaHasta`. */
  exactaHasta?: number,
): { puntos: Punto[]; radios: number[]; exactos: boolean[] } {
  /*
   * **Y una media vuelta que dibuja el redondeo es tan media vuelta como la
   * del back-taxi**: la raya que entra en la pista por una calle que llega al
   * revés —en Silvio Pettirossi, la del punto de espera— da la vuelta en
   * cuatro metros y medio de radio, y con el suelo de seis metros por segundo
   * de las curvas el perfil pedía tomarla a una velocidad a la que ningún
   * avión la da. Se marca como exacta, que es lo que el perfil de velocidad
   * sabe tomar a paso de persona. Ver `calcularVelocidades`.
   */
  if (
    exactaDesde === undefined ||
    exactaDesde <= 0 ||
    exactaDesde >= crudos.length - 1
  ) {
    const r = redondear(sinTemblor(crudos), RADIO_CURVA, radioDeVuelta);
    return { puntos: r.puntos, radios: r.radios, exactos: r.vueltas };
  }
  // Lo de antes, alisado como siempre, y acabando justo donde empieza el arco:
  // los extremos no los mueve ni el quitatemblores ni el redondeo.
  const antes = redondear(
    sinTemblor(crudos.slice(0, exactaDesde + 1)),
    RADIO_CURVA,
    radioDeVuelta,
  );
  const hasta =
    exactaHasta !== undefined &&
    exactaHasta > exactaDesde &&
    exactaHasta < crudos.length - 1
      ? exactaHasta
      : crudos.length - 1;
  const cola = crudos.slice(exactaDesde, hasta + 1);
  const radiosCola = cola.map((p, i) => {
    const a = cola[i - 1];
    const c = cola[i + 1];
    return a && c ? radioPorTres(a, p, c) : Infinity;
  });
  const exacta = trocear(cola, radiosCola);
  const sigue = exacta.puntos.slice(1);
  const puntos = [...antes.puntos, ...sigue];
  const radios = [...antes.radios, ...exacta.radios.slice(1)];
  const exactos = [...antes.vueltas, ...sigue.map(() => true)];
  // Y lo de después, alisado como lo de antes, empezando donde acaba el arco.
  if (hasta < crudos.length - 1) {
    const despues = redondear(
      sinTemblor(crudos.slice(hasta)),
      RADIO_CURVA,
      radioDeVuelta,
    );
    const mas = despues.puntos.slice(1);
    puntos.push(...mas);
    radios.push(...despues.radios.slice(1));
    exactos.push(...despues.vueltas.slice(1));
  }
  return { puntos, radios, exactos };
}

/**
 * Trocea las rectas largas de una polilínea con sus radios.
 *
 * Los puntos que se meten van con radio infinito porque están sobre una
 * recta: solo sirven para que el color cambie donde toca en vez de degradarse
 * durante un kilómetro.
 */
function trocear(
  puntos: readonly Punto[],
  radios: readonly number[],
  /** Qué puntos son de una media vuelta; los que se meten, no. */
  vueltas: readonly boolean[] = [],
): { puntos: Punto[]; radios: number[]; vueltas: boolean[] } {
  if (!puntos.length) return { puntos: [], radios: [], vueltas: [] };
  const densos: Punto[] = [puntos[0]!];
  const densosRadios: number[] = [radios[0]!];
  const densasVueltas: boolean[] = [vueltas[0] ?? false];
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
      densasVueltas.push(false);
    }
    densos.push(b);
    densosRadios.push(radios[i]!);
    densasVueltas.push(vueltas[i] ?? false);
  }
  return { puntos: densos, radios: densosRadios, vueltas: densasVueltas };
}

/** Un puesto y un punto de espera, con lo que hace falta para elegirlos. */
interface ParDeSalida {
  readonly puesto: { ref: string | null; xy: Punto };
  readonly espera: Punto;
  /** Metros rodados del puesto a la doble raya. */
  readonly ida: number;
  /** Y la ida más la vuelta estimada desde la toma. */
  readonly viaje: number;
  /** Si la ida atraviesa la pista. Ver `cruzaElAsfalto`. */
  readonly cruza: boolean;
  /** Metros de pista que quedan por delante entrando por ahí. */
  readonly porDelante: number;
  /** Metros de pista que hay que remontar para despegar. Ver `pistaParaRemontar`. */
  readonly remonta: number;
  /** Medias vueltas por el camino, del puesto al eje. Ver `mediasVueltas`. */
  readonly vueltas: number;
}

/**
 * Lo que se deja fuera de la cuenta de medias vueltas al salir de un puesto,
 * m: salir de él puede ser dar la vuelta entera, que para eso se aparca de
 * morro a la terminal.
 */
const SALIR_DEL_PUESTO = 40;

/**
 * **Cuántas medias vueltas da una raya**: sitios donde el rumbo de los diez
 * metros de antes y el de los diez de después se separan más de ciento
 * cincuenta grados. A trozos de cinco metros, que el dibujo de OpenStreetMap
 * tiene codos de palmo que no son vueltas.
 * Sin contar los primeros `desde` metros.
 */
export function mediasVueltas(puntos: readonly Punto[], desde = 0): number {
  const muestras: Punto[] = [];
  let recorrido = 0;
  let siguiente = desde;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i]!;
    const b = puntos[i + 1]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (siguiente <= recorrido + l && l > 0) {
      const t = (siguiente - recorrido) / l;
      muestras.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      siguiente += 5;
    }
    recorrido += l;
  }
  let vueltas = 0;
  let dentro = false;
  for (let i = 2; i < muestras.length - 2; i++) {
    const [a, b, c] = [muestras[i - 2]!, muestras[i]!, muestras[i + 2]!];
    const h1 = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const h2 = Math.atan2(c[0] - b[0], c[1] - b[1]);
    let d = Math.abs(h2 - h1);
    if (d > Math.PI) d = 2 * Math.PI - d;
    const vuelta = d > (150 * Math.PI) / 180;
    if (vuelta && !dentro) vueltas++;
    dentro = vuelta;
  }
  return vueltas;
}

export class PlanDeVuelo {
  readonly grupo = new Group();
  /*
   * El grafo, el aeródromo y la pista dejaron de ser `readonly` el día que se
   * pudo aterrizar en otro aeropuerto. Ver `mudarseA`.
   */
  private grafo: Grafo;
  private readonly vuelo = new Vuelo();

  /** Si la torre ya dio la luz verde para entrar en pista. Para el banco. */
  get autorizado(): boolean {
    return this.vuelo.autorizado;
  }
  private ruta: Ruta | null = null;
  /** La ruta en coordenadas de mundo, que es donde vive el avión. */
  private rutaMundo: Punto[] = [];

  /**
   * La raya, en coordenadas del mundo, para quien tenga que señalarla.
   *
   * La usa la aguja del HUD cuando el avión se sale: decir «volvé a la raya
   * verde» sin decir hacia dónde es medio consejo, y si te has ido lejos la
   * raya te queda fuera de la pantalla. Ver `updateHomeIndicator` en
   * `game.ts` y `puntoMasCercanoDe`.
   */
  get laRaya(): readonly Punto[] {
    return this.rutaMundo;
  }
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
  /**
   * Qué puntos de la ruta son geometría exacta —la media vuelta del
   * back-taxi— y no curvas de calle. Ver `alisarRuta`.
   */
  private exactos: boolean[] = [];

  constructor(
    private aero: Aerodrome,
    private pista: {
      x: number;
      z: number;
      heading: number;
      width: number;
      length: number;
      desplazado?: number;
    },
    private readonly cota: (x: number, z: number) => number,
    /*
     * **Y con qué avión se vuela**, que es lo que decide cuánta pista hace
     * falta por delante. Ver la nota de `pistaQueHaceFalta`.
     */
    private readonly avion: AircraftConfig,
  ) {
    this.grupo.name = "plan-de-vuelo";
    this.grafo = construirGrafo(aero, this.avion.wingSpan / 2);
  }

  /**
   * **Dónde hay aviones parados en las calles**, en los ejes del fichero —la
   * y al norte—. Lo pone quien sabe del tráfico; el plan solo los rodea al
   * trazar la raya, si hay por dónde. Ver `Ocupados` en `rodaje.ts`.
   *
   * Son los que **no** van a despegar: los que acaban de aterrizar y ruedan a
   * su puesto. Los que van a despegar están en `enCola`.
   */
  ocupados: () => readonly Punto[] = () => [];

  /**
   * **Los que van a despegar**: ruedan hacia la pista o esperan en su doble
   * raya. Lo pone quien sabe del tráfico, como `ocupados`.
   *
   * Van aparte porque no son lo mismo según a dónde vayas vos. Saliendo, son
   * **tu cola**: van a la misma pista, y al de delante no se le rodea, se le
   * sigue y se espera detrás de él. Rodearle era lo que mandaba la raya por la
   * pista en Los Rodeos: con la cola parada en la paralela, la pista era el
   * único camino «libre». Volviendo de aterrizar, en cambio, vienen de frente
   * por tu calle, y a esos sí se les rodea si hay por dónde.
   */
  enCola: () => readonly Punto[] = () => [];

  /**
   * **Y de ésos, los que están ahí ahora**: sin la doble raya a la que va
   * cada uno cuando todavía no ha llegado. `enCola` sirve para trazar, y ahí
   * vale saber dónde va a haber alguien; para pararse detrás hace falta que
   * haya alguien, o se espera para siempre detrás de un sitio vacío. Ver
   * `hastaElDeDelante`.
   */
  colaQueHay: () => readonly Punto[] = () => this.enCola();

  /**
   * El de la cola detrás del que se está parado ahora, en los ejes del
   * fichero, y cuánto hace que no se avanza detrás de él. Ver
   * `PACIENCIA_EN_LA_COLA`.
   */
  private detrasDe: Punto | null = null;
  private esperandoDetras = 0;

  /**
   * Los de la cola a los que ya no se espera: se rodean como a cualquier
   * parado. Se olvidan al cambiar de fase.
   */
  private hartos: Punto[] = [];

  /**
   * Los parados que hay que rodear ahora, con lo que tienen que separarse los
   * ejes: la semiala de este avión, la del más grande del tráfico y el margen
   * de ala. `saliendo` es si se va hacia la pista: entonces los de tu cola no
   * cuentan. Ver `enCola`.
   */
  private ocupadosAhora(saliendo: boolean): Ocupados {
    return {
      puntos: saliendo
        ? [...this.ocupados(), ...this.hartos]
        : [...this.ocupados(), ...this.enCola()],
      radio: this.avion.wingSpan / 2 + SEMIALA_DEL_TRAFICO + MARGEN_ENTRE_ALAS,
    };
  }

  /** En qué aeródromo está trabajando el plan ahora mismo. */
  get aerodromoActual(): Aerodrome {
    return this.aero;
  }

  /**
   * Cambia de aeropuerto sin cambiar de vuelo.
   *
   * **Lo que se muda es el suelo, no el vuelo.** La máquina de fases sigue
   * siendo la misma —se despegó una vez y se aterriza una vez—, pero el grafo
   * de rodaje, los puestos y los puntos de espera pasan a ser los del campo en
   * el que se va a tomar tierra. Sin esto, quien aterrizaba fuera se
   * encontraba lo que contó jugando: «no hay coche, no sé la ruta a mi
   * hangar». La raya verde la dibuja el grafo, y el grafo era el de casa.
   *
   * Se tira todo lo que estaba cacheado del campo anterior: el par de salida
   * —que se eligió para salir de allí—, el puesto elegido y la puerta de
   * llegada. La puerta sobre todo: una llegada, una puerta, y ésta es otra
   * llegada.
   */
  mudarseA(
    aero: Aerodrome,
    pista: {
      x: number;
      z: number;
      heading: number;
      width: number;
      length: number;
      desplazado?: number;
    },
  ): void {
    if (aero === this.aero) return;
    this.aero = aero;
    this.pista = pista;
    this.grafo = construirGrafo(aero, this.avion.wingSpan / 2);
    this.par = undefined;
    this.paresVistos = [];
    this.esperasPorPuesto.clear();
    this.remontasPorEspera.clear();
    this.vueltasPorEspera.clear();
    this.alEjePorEspera.clear();
    this.candidatosGuardados = null;
    this.puestoElegido = null;
    this.puerta.olvidar();
    this.destino = null;
    /*
     * Y la raya se apaga: la que había iba por las calles del otro campo, y
     * dejarla puesta es peor que no tener ninguna.
     */
    this.ponerRuta(null);
    /*
     * **Y se pide una raya nueva para la fase en la que se va, sin esperar a
     * que cambie.**
     *
     * Esto es un seguro, y conviene decirlo: hoy la mudanza siempre ocurre
     * volando —el campo de ahora es el de la pista más cerca, así que cambia a
     * mitad de camino— y después hay un cambio de fase seguro, el de tomar
     * tierra, que traza la ruta. Con lo cual esto no se ha visto hacer falta
     * nunca.
     *
     * Está porque el agujero que tapa es de los que no avisan: `mudarseA` deja
     * el destino a nulo, y mientras el destino sea nulo `rehacerSiHaceFalta`
     * no hace nada. Una mudanza que cayera en una fase que ya no va a cambiar
     * dejaría el plan **sin ruta y sin manera de recuperarla**, y eso en
     * pantalla es quedarse sin raya verde en un aeropuerto desconocido.
     */
    this.acabaDeMudarse = true;
  }

  /** Ver `mudarseA`: lo consume el primer `paso` que venga detrás. */
  private acabaDeMudarse = false;

  /** Que la torre no autorice nunca: es la lección de rodar. */
  set soloRodaje(si: boolean) {
    this.vuelo.acabaEnLaEspera = si;
  }

  /**
   * Si alguien de la frecuencia ocupa la pista: la torre no te pone la
   * lámpara en verde hasta que la deja. Ver `Vuelo.pistaDeOtros`.
   */
  set pistaDeOtros(si: boolean) {
    this.vuelo.pistaDeOtros = si;
  }

  /**
   * **El aire del día**, para pasar la pérdida a velocidad verdadera. Lo pone
   * el juego antes de cada paso, como `pistaDeOtros`. Ver `perdida` abajo.
   */
  aire: Aire = AIRE_ESTANDAR;

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
  paresVistos: readonly {
    ref: string | null;
    ida: number;
    viaje: number;
    /** Si la ida pisa el asfalto de la pista. Ver `parDeSalida`. */
    cruza: boolean;
  }[] = [];
  /** El par puesto + espera con el que menos se rueda. Ver `parDeSalida`. */
  private par:
    | { puesto: { ref: string | null; xy: Punto }; espera: Punto }
    | null
    | undefined;

  /** Dónde empieza el vuelo: el puesto de estacionamiento, si lo hay. */
  arranque(): readonly [number, number] | null {
    // Si esta lección sale de la cabecera, no hay puesto del que salir aunque
    // el aeropuerto tenga plataforma. Ver `reiniciar`.
    if (this.desdeLaPista) return null;
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
    const puestos = this.puestosEnElAsfalto();
    if (!puestos.length) return [];
    const cabecera = this.cabeceraDeSalida();
    return [...puestos].sort(
      (a, b) =>
        Math.hypot(a.xy[0] - cabecera[0], a.xy[1] - cabecera[1]) -
        Math.hypot(b.xy[0] - cabecera[0], b.xy[1] - cabecera[1]),
    );
  }

  /**
   * Empieza el vuelo desde un puesto concreto, no del que toca por cercanía.
   *
   * Es también como empieza el tramo de vuelta: desde donde se apagó el
   * motor en el campo de llegada, sin mover el avión. Ver `empezarOtroTramo`
   * en `game.ts`.
   */
  reiniciarDesde(
    puesto: Punto,
    /**
     * Si es donde se paró el avión y no un puesto: puede haberse quedado con
     * una rueda en la hierba, y volver al asfalto no es un atajo. Ver
     * `otroTramoDesde` y `enganches` en `rodaje.ts`.
     */
    desdeFuera = false,
  ): boolean {
    /*
     * **Y el punto de espera, el de este puesto.** Se pedía antes de apuntar
     * el puesto nuevo, así que salía el del puesto de siempre: desde el otro
     * lado del campo, la raya iba a una doble raya elegida para otro sitio.
     */
    const espera = this.esperaDeSalida(puesto, desdeFuera);
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
    const ruta = rodajeEntre(
      this.grafo,
      puesto,
      espera,
      220,
      this.ocupadosAhora(true),
      { desdeFuera },
    );
    if (!ruta) return false;
    this.puestoElegido = puesto;
    this.vuelo.reiniciar(false);
    this.trazadaAlTocar = false;
    this.destino = "espera";
    this.ultimaPos = puesto;
    this.ponerRuta(ruta);
    return true;
  }

  /**
   * **Un tramo nuevo desde donde está el avión, pase lo que pase.**
   *
   * Es `reiniciarDesde` con una salida para cuando no puede: el avión se
   * apagó lejos de toda calle —más de lo que el buscador engancha— o el campo
   * no tiene dónde esperar. `empezarOtroTramo` no miraba lo que devolvía, y
   * con `false` **la máquina de fases no se reiniciaba**: seguía siendo el
   * vuelo de antes, ya volado, y la carrera de despegue siguiente se deducía
   * como un aterrizaje. Sin raya desde aquí se puede vivir —la recoge
   * `rehacerSiHaceFalta` en cuanto el avión se mueve—; con el vuelo viejo
   * abierto, no.
   *
   * Devuelve si la raya sale de donde está el avión.
   */
  otroTramoDesde(donde: Punto, desdeLaPista = false): boolean {
    if (this.reiniciarDesde(donde, true)) return true;
    this.reiniciar(desdeLaPista);
    return false;
  }

  private puestoDeSalida(): { ref: string | null; xy: Punto } | null {
    const puestos = this.puestosEnElAsfalto();
    if (!puestos.length) return null;

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
    const donde = this.puestosCandidatos();
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

  /**
   * El puesto al que se vuelve: **el más cercano rodando desde donde estás**.
   *
   * Se volvía siempre al puesto de salida, y eso es lo que hacía que en los
   * campos grandes el rodaje fuera más de la mitad del vuelo: medido en el
   * barrido, doscientos setenta y un segundos de vuelta en Silvio Pettirossi
   * sobre seiscientos doce de vuelo entero — el cincuenta y siete por ciento
   * del vuelo rodando. Y quien juega tiene cuatro años y ha venido a volar.
   *
   * **Y es lo que pasa de verdad.** A un avión que llega se le asigna una
   * puerta libre; nadie cruza un aeropuerto para dejarlo donde lo cogió. Así
   * que esto no es un atajo para ahorrar tiempo: es la regla de la casa
   * —cuando la realidad y la comodidad coinciden, mejor— y encima quita el
   * número que peor sentaba.
   *
   * Se mide **rodando** y no en línea recta, que es la diferencia que ya costó
   * una medida: en Tenerife Norte el puesto que gana en línea recta está a la
   * vista de la cabecera y hay que dar la vuelta al aeropuerto para llegar.
   * Ver `parDeSalida`.
   *
   * Y del mismo grupo de siempre —el tercio más alejado de los edificios— para
   * no aparcar pegado a la terminal entre dos aviones de línea: «que me suba a
   * la chepa del Iberia». Ver `puestosCandidatos`.
   */
  private puestoDeLlegada(
    desde: Punto,
    /**
     * Si esta elección es la definitiva. Ver `puestoEnFirme`.
     *
     * **Y aquí estaba el paseo por el aeropuerto.** Esto se llamaba en cada
     * fotograma del tramo de abandonar la pista, y como mide «el más cercano
     * rodando **desde donde estás**», al avanzar el avión cambiaba el ganador:
     * la ruta saltaba de un puesto a otro, la raya verde con ella, y el avión
     * iba detrás. Medido en el barrido: en Tenerife Sur, 1682 metros rodados
     * para una ruta de 1098 —×1,53—, y en La Palma ×1,40. Contado jugando:
     * «estoy paseando por el aeropuerto y ni coche, ni señor de las balizas,
     * ni rayas verdes».
     */
    enFirme: boolean,
  ): { ref: string | null; xy: Punto } | null {
    return this.puerta.pedir(enFirme, () => {
      const puestos = this.puestosCandidatos();
      if (!puestos.length) return null;
      let mejor: { ref: string | null; xy: Punto } | null = null;
      let corto = Infinity;
      const rutas = rodajesDesde(
        this.grafo,
        desde,
        puestos.map((p) => p.xy),
        600,
        undefined,
        { desdeFuera: true },
      );
      for (const [k, p] of puestos.entries()) {
        const ruta = rutas[k] ?? null;
        const d = ruta ? ruta.largo : Infinity;
        if (d < corto) {
          corto = d;
          mejor = p;
        }
      }
      // Si ninguno se deja alcanzar por asfalto, el de salida: mejor una vuelta
      // larga que no tener adónde ir.
      return mejor ?? this.puestoDeSalida();
    });
  }

  /**
   * **Los puestos que están en el pavimento**, que son los únicos que hay.
   *
   * OpenStreetMap trae algunos puestos dibujados fuera de toda plataforma: en
   * Tenerife Sur, los de aviación general de la punta oeste caen a noventa
   * metros del asfalto más cercano. Ahí el juego no puede poner un avión —ni
   * sacarlo, que la raya no cruza hierba— y como esos puestos quedan lejos
   * de los edificios, eran justo los que se elegían: la vuelta de Tenerife
   * Sur se quedaba sin puesto al que ir. Si un campo no tuviera ninguno en el
   * asfalto, se quedan todos, que sin puesto no hay juego.
   */
  private puestosEnElAsfalto(): readonly { ref: string | null; xy: Punto }[] {
    const puestos = this.aero.parkingPositions ?? [];
    const rodable = this.grafo.rodable;
    const buenos = rodable ? puestos.filter((p) => rodable(p.xy)) : puestos;
    return buenos.length ? buenos : puestos;
  }

  /** Los puestos de los que puede salir una avioneta, sin ordenar. */
  private puestosCandidatos(): { ref: string | null; xy: Punto }[] {
    // Se pregunta por cada boca de pista al aterrizar, y ordenar los puestos
    // contra todas las esquinas de todos los edificios no es gratis.
    if (this.candidatosGuardados) return this.candidatosGuardados;
    const puestos = this.puestosEnElAsfalto();
    if (!puestos.length) return [];
    const cerca = (p: Punto): number => {
      let d = Infinity;
      for (const e of this.aero.buildings ?? []) {
        for (const q of e.polygon)
          d = Math.min(d, Math.hypot(q[0] - p[0], q[1] - p[1]));
      }
      return d;
    };
    const lejos = new Map(puestos.map((p) => [p, cerca(p.xy)]));
    const porLejania = [...puestos].sort((a, b) => lejos.get(b)! - lejos.get(a)!);
    this.candidatosGuardados = porLejania.slice(
      0,
      Math.max(1, Math.ceil(porLejania.length / 3)),
    );
    return this.candidatosGuardados;
  }

  /** Ver `puestosCandidatos`. Se tira al mudarse de campo. */
  private candidatosGuardados: { ref: string | null; xy: Punto }[] | null = null;

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
    const pares = this.paresDeSalida(this.puestosCandidatos(), false);
    this.paresVistos = pares.map((p) => ({
      ref: p.puesto.ref,
      ida: Math.round(p.ida),
      viaje: Math.round(p.viaje),
      cruza: p.cruza,
    }));
    const donde = this.elegirSalida(pares);
    if (donde) this.par = { puesto: donde.puesto, espera: donde.espera };
    return this.par;
  }

  /**
   * Cada par puesto + punto de espera que se deja rodar, con lo que hace falta
   * para elegir. Ver `parDeSalida` y `elegirSalida`.
   */
  private paresDeSalida(
    puestos: readonly { ref: string | null; xy: Punto }[],
    desdeFuera: boolean,
  ): ParDeSalida[] {
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
    // Contado desde el umbral de aterrizar, que con el umbral desplazado está
    // pista adentro: se deja de correr mil metros después de donde se toca.
    const dondeSePara = puntoDePista(
      this.pista,
      hastaElUmbralDeToma(this.pista) - TRAS_TOMAR_TIERRA,
    );
    const traeDeVuelta: Punto = [dondeSePara[0], -dondeSePara[1]];

    const pares: ParDeSalida[] = [];
    for (const puesto of puestos) {
      const vuelta = rodajeEntre(this.grafo, traeDeVuelta, puesto.xy, 600);
      const casa = vuelta ? vuelta.largo : 0;
      const rutas = rodajesDesde(this.grafo, puesto.xy, esperas, 220, undefined, {
        desdeFuera,
      });
      esperas.forEach((espera, k) => {
        const ruta = rutas[k] ?? null;
        /*
         * **Y tiene que ser un camino, no un salto.**
         *
         * El buscador engancha cada punta a la calle más cercana por donde
         * cae y une el resto por las calles, así que lo único que no va por
         * una calle son esas dos rectas: del puesto a la calle y de la calle
         * a la doble raya. Lo dice el buscador, que es quien sabe cuáles son;
         * ver `Ruta.enganche`. Y ya no pueden cruzar hierba: si la recta no va
         * por pavimento, el buscador no la tira.
         *
         * Antes esto se medía contando puntos —menos de cinco, fuera—, y era
         * un apaño que valía mientras todos los aeródromos tuvieran calles de
         * rodaje enredadas. En Mariscal Estigarribia hay **una sola calle**:
         * la ruta del puesto a la doble raya son 361 metros de asfalto en
         * cuatro puntos, y el filtro la tiraba. El juego arrancaba el vuelo ya
         * autorizado, con el motor en marcha y sin rodaje ninguno.
         *
         * **Y ya no hay tope de largo para esas rectas.** Había uno, de
         * ciento diez metros, puesto para tirar el atajo por el campo cuando
         * nadie miraba por dónde iba la recta. Ahora se mira, y lo que se
         * llevaba por delante era lo contrario: en Los Rodeos la plataforma
         * solo sale a la red por una calle, y desde diez de sus puestos se
         * llega a ella cruzando ciento noventa metros de plataforma, que es
         * como se sale de una plataforma. Sin esos diez, el juego arrancaba
         * en otro puesto.
         */
        if (!ruta) return;
        pares.push({
          puesto,
          espera,
          ida: ruta.largo,
          viaje: ruta.largo + casa,
          cruza: this.cruzaElAsfalto(ruta.puntos),
          porDelante: this.pistaQueQueda(espera),
          remonta: this.pistaParaRemontar(espera),
          vueltas:
            mediasVueltas(ruta.puntos, SALIR_DEL_PUESTO) +
            this.vueltasDeLaEntrada(espera),
        });
      });
    }
    return pares;
  }

  /**
   * De todos los pares que se dejan rodar, el que se usa.
   *
   * Es una lista de preferencias **por orden**, y el orden es la lección: lo
   * de arriba no se cambia por nada de lo de abajo.
   */
  private elegirSalida(pares: readonly ParDeSalida[]): ParDeSalida | null {
    if (!pares.length) return null;
    /*
     * **Y antes que nada: que la ida no cruce la pista.**
     *
     * En El Hierro la plataforma cae a un lado y el punto de espera más
     * cercano al otro, así que la ruta más corta atravesaba el asfalto en
     * diagonal —veintiséis de sus cuarenta y siete puntos sobre la pista— y el
     * juego hacía lo correcto en cuanto el avión pisaba: percance «entraste en
     * la pista sin la luz verde», a los veinte segundos de arrancar y sin que
     * nadie hubiera hecho nada más que seguir la raya verde que el propio
     * juego pintaba. Lo mismo en Fuerteventura.
     *
     * Cruzar una pista es una autorización aparte, y el juego todavía no la
     * sabe pedir ni dar. Hasta que la sepa, se rodea. Es **preferencia y no
     * prohibición**: hay campos donde la única calle cruza la pista —Pedro
     * Juan Caballero es uno— y allí se cruza, porque la alternativa es no
     * salir del puesto.
     */
    const porTierra = pares.filter((p) => !p.cruza);
    const posibles = porTierra.length ? porTierra : pares;
    /*
     * **Y después, que no haya que remontar la pista para despegar.**
     *
     * Estaba por debajo de lo que se rueda, y así salió lo de Los Rodeos con
     * la 30: el punto de espera de la cabecera queda a dos kilómetros de la
     * plataforma, el tope de setecientos metros de ida lo tiraba, y ganaba
     * una doble raya a mitad de campo desde la que el reactor no tiene pista
     * para despegar. Así que se entraba en la pista por la mitad y se
     * remontaban mil quinientos metros por ella hasta la cabecera, con la
     * paralela al lado vacía: «usas la pista de despegue y aterrizaje como
     * pista de rodadura por lo menos la mitad del trayecto, cuando hay una
     * paralela para eso».
     *
     * Remontar la pista —el back-taxi— es una maniobra de verdad, pero de los
     * campos **sin paralela hasta la cabecera**, donde no hay otra forma de
     * llegar. Donde la hay, se va por ella aunque sea más larga: una pista no
     * es una calle, y en Los Rodeos precisamente la paralela existe para que
     * no lo sea. Así que se quedan los que menos pista piden remontar —cero,
     * donde hay paralela; lo mínimo, donde no—, con treinta metros de
     * holgura para no desempatar por un palmo de dibujo.
     */
    const menos = Math.min(...posibles.map((p) => p.remonta));
    const sinRemontar0 = posibles.filter((p) => p.remonta <= menos + 30);
    /*
     * **Y sin medias vueltas por el camino, si hay otro.**
     *
     * Con la pista ya descartada como calle, en Los Rodeos por la 30 la
     * avioneta seguía saliendo por la doble raya de media paralela, y desde
     * ella a la pista solo se llega por una salida rápida, que está hecha
     * para salir de la pista y no para entrar: se rodaba la paralela, se
     * pasaba la boca, se volvía y se bajaba por la salida al revés. Una media
     * vuelta en una calle es una calle usada al revés, y en una pista, entrar
     * por donde se sale. Se hacen cuando no hay más remedio —hay calles que
     * llegan a la pista así—, no para ahorrar un minuto.
     */
    /*
     * **Pero antes, que desde ahí se pueda despegar.** Un avión grande que no
     * cabe dando la vuelta en la pista no hace back-taxi, así que un punto de
     * espera del otro extremo no le pide remontar nada... y tampoco le deja
     * pista: con las medias vueltas por delante de la pista que queda, el
     * JAZ 120 salía en Tenerife Sur por el punto de espera de la cabecera
     * contraria, con cero metros por delante. Así que primero se quedan los
     * que dejan casi tanta pista como el mejor —trescientos metros de
     * holgura, que la saturación de abajo sigue repartiendo— y de esos, los
     * de menos vueltas.
     */
    const quiere0 = pistaQueHaceFalta(this.avion);
    const conPista = (p: ParDeSalida) => Math.min(quiere0, p.porDelante + p.remonta);
    const mejorPista = Math.max(...sinRemontar0.map(conPista));
    const despegan = sinRemontar0.filter((p) => conPista(p) >= mejorPista - 300);
    const menosVueltas = Math.min(...despegan.map((p) => p.vueltas));
    const sinRemontar = despegan.filter((p) => p.vueltas <= menosVueltas);
    /*
     * **Y los metros mínimos de rodaje son un deseo, no un requisito.**
     *
     * Estaba puesto como filtro, y un filtro se come el aeródromo entero
     * cuando el aeródromo no da esos metros. En El Hierro la plataforma está
     * pegada a la pista: de los nueve puestos a sus puntos de espera hay 37,
     * 45, 46, 48, 50, 53 y 59 metros — **todos por debajo del listón de
     * sesenta**. Lo que quedaba después del filtro eran las rutas largas, que
     * allí son las que bajan al eje y se van por la pista: el juego mandaba al
     * avión a atravesar el asfalto para cumplir una regla sobre cuánto se
     * tiene que rodar.
     *
     * Un aeropuerto donde se rueda cuarenta metros existe y es éste. Se
     * prefiere el que dé rodaje de verdad; si ninguno lo da, se rueda lo que
     * haya.
     */
    const conRodaje = sinRemontar.filter((p) => p.ida >= LO_MINIMO_QUE_SE_RUEDA);
    const bastantes = conRodaje.length ? conRodaje : sinRemontar;
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
     *
     * **Y va por debajo de no remontar la pista**, que es lo que se rompió:
     * es una comodidad, y no se paga rodando por donde no se rueda.
     */
    const cortos = bastantes.filter((p) => p.ida <= LO_MAXIMO_DE_IDA);
    const entre = cortos.length ? cortos : bastantes;
    /*
     * **Y entre los que quedan, el que más pista deja por delante.**
     *
     * Entrando por el punto de espera más cómodo se salía a media pista:
     * «¿qué sentido tiene darme poca pista para salir? Motor a fondo a mitad
     * de pista, a ver si no nos caemos al mar».
     *
     * Va aquí y no como filtro, y las dos cosas importan:
     *
     * - **Aquí abajo**, o sea por debajo de no cruzar la pista. Filtrándolo
     *   de raíz se rompía El Hierro: en mil doscientos metros de pista casi
     *   ningún punto de espera deja los mil doscientos que se piden, quedaba
     *   uno, estaba al otro lado del asfalto y la única ruta cruzaba la
     *   pista. Percance «entraste en la pista sin la luz verde» a los veinte
     *   segundos de arrancar. Entrar sin permiso es lo más grave que se
     *   puede hacer rodando; salir por una intersección es como mucho
     *   incómodo.
     *
     * - **Y saturado en lo que hace falta**, con `min`. Sin saturar, el que
     *   más pista deja gana siempre y todo el mundo se va a la cabecera, que
     *   es el rodaje eterno de antes. Con la saturación, en cuanto dos dejan
     *   pista de sobra empatan y decide el viaje: la avioneta sigue saliendo
     *   por la intersección de al lado de su puesto y el reactor se va a la
     *   cabecera, que es lo que hace cada uno de verdad.
     */
    const quiere = pistaQueHaceFalta(this.avion);
    const bastante = (p: ParDeSalida): number => Math.min(quiere, p.porDelante);
    return [...entre].sort((a, b) => {
      const d = bastante(b) - bastante(a);
      // Un metro de holgura: por debajo de eso los dos dejan lo mismo.
      return Math.abs(d) > 1 ? d : a.viaje - b.viaje;
    })[0]!;
  }

  /**
   * **Cuánta pista hay que remontar** para despegar entrando por un punto de
   * espera, m: lo que se rueda por la pista contra el sentido del despegue.
   *
   * Son dos cosas y las dos se ven desde la cabina igual, rodando por una pista
   * hacia atrás:
   *
   * - **El back-taxi**, si desde donde se entra no queda pista para despegar:
   *   lo que va de la entrada al sitio donde se da la vuelta. Es la misma
   *   cuenta que hace `backTaxiDesde` al trazar la maniobra, sin trazarla.
   * - **Y la propia entrada**, si la calle llega a la pista lejos de la doble
   *   raya. En Los Rodeos hay puntos de espera pintados **en la paralela**
   *   —son de espera intermedia, no de pista— y el más cercano a la
   *   plataforma se daba por entrada: desde él, la raya iba a la calle de
   *   salida siguiente y volvía por la pista quinientos cincuenta metros. Un
   *   punto de espera es de pista si desde él se entra en la pista, y eso se
   *   mide.
   *
   * `Infinity` si desde ahí no se llega al eje por pavimento.
   */
  private pistaParaRemontar(espera: Punto): number {
    const clave = `${espera[0].toFixed(1)},${espera[1].toFixed(1)}`;
    const guardada = this.remontasPorEspera.get(clave);
    if (guardada !== undefined) return guardada;
    const alEje = this.alEjeDesdeLaEspera(espera);
    let remonta = Infinity;
    if (alEje) {
      const alinear = this.contraElDespegue(alEje.hastaElEje);
      const giro = this.dondeSeDaLaVuelta(alEje.along);
      const mitad = this.largoDePista / 2;
      const paraDespegar = Math.min(PARA_DESPEGAR, this.largoDePista * 0.4);
      const entra = Math.max(-mitad + 40, Math.min(alEje.along, mitad - paraDespegar));
      remonta = alinear + (giro === null ? 0 : Math.max(0, entra - giro));
    }
    this.remontasPorEspera.set(clave, remonta);
    return remonta;
  }

  /** Ver `pistaParaRemontar`. Se tira al mudarse de campo. */
  private remontasPorEspera = new Map<string, number>();

  /**
   * Las medias vueltas de la entrada en pista desde un punto de espera: la
   * de la calle que llega a la pista al revés, sobre todo. Ver
   * `mediasVueltas` y `bocaDeEntrada`.
   */
  private vueltasDeLaEntrada(espera: Punto): number {
    const clave = `${espera[0].toFixed(1)},${espera[1].toFixed(1)}`;
    const guardadas = this.vueltasPorEspera.get(clave);
    if (guardadas !== undefined) return guardadas;
    const alEje = this.alEjeDesdeLaEspera(espera);
    const vueltas = alEje
      ? mediasVueltas([...alEje.hastaElEje, alEje.ejeAbajo])
      : Infinity;
    this.vueltasPorEspera.set(clave, vueltas);
    return vueltas;
  }

  /** Ver `vueltasDeLaEntrada`. Se tira al mudarse de campo. */
  private vueltasPorEspera = new Map<string, number>();

  /**
   * `alEjeDesde` para elegir la salida, guardado por punto de espera: lo
   * preguntan dos cuentas por cada par y los pares se repiten.
   */
  private alEjeDesdeLaEspera(espera: Punto): ReturnType<PlanDeVuelo["alEjeDesde"]> {
    const clave = `${espera[0].toFixed(1)},${espera[1].toFixed(1)}`;
    if (!this.alEjePorEspera.has(clave))
      this.alEjePorEspera.set(clave, this.alEjeDesde(espera));
    return this.alEjePorEspera.get(clave) ?? null;
  }

  /** Ver `alEjeDesdeLaEspera`. Se tira al mudarse de campo. */
  private alEjePorEspera = new Map<string, ReturnType<PlanDeVuelo["alEjeDesde"]>>();

  /**
   * Metros de una raya que van por la pista **hacia atrás**: dentro del
   * rectángulo de la pista y rodando a más de sesenta grados del rumbo de
   * despegue. Lo de cruzarla o girar para ponerse en el eje no cuenta.
   */
  private contraElDespegue(puntos: readonly Punto[]): number {
    const [fx, fz] = delante(this.pista.heading);
    // Hacia delante en el fichero, donde la y es la z cambiada de signo.
    const ux = fx;
    const uy = -fz;
    let metros = 0;
    for (let i = 0; i < puntos.length - 1; i++) {
      const a = puntos[i]!;
      const b = puntos[i + 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l < 1e-6) continue;
      const cos = ((b[0] - a[0]) * ux + (b[1] - a[1]) * uy) / l;
      if (cos > -0.5) continue;
      const n = Math.max(1, Math.ceil(l / 2));
      for (let k = 0; k < n; k++) {
        const s = (k + 0.5) / n;
        if (this.enElAsfalto([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]))
          metros += l / n;
      }
    }
    return metros;
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
  /**
   * Los puntos de espera que se consideraron, para los bancos y las pruebas.
   *
   * Se apunta en cada elección. Sin esto, «el avión entra a media pista» es
   * imposible de perseguir desde fuera: no se sabe si es que el bueno no
   * estaba en la lista o si es que perdió el sorteo.
   */
  esperasVistas: readonly Punto[] = [];

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
    /*
     * **Y con la misma vara de medir que las intersecciones.**
     *
     * Éstos entraban sin que nadie mirara cuánta pista dejan por delante, y
     * como después se elige **el más corto de rodar**, ganaba siempre el que
     * está más cerca del puesto — que en La Palma y en Fuerteventura es uno
     * de media pista. Resultado: el reactor regional con 2.119 metros de
     * pista entrando por la mitad, y el de fuselaje ancho igual.
     *
     * Contado jugando: «¿qué sentido tiene darme poca pista para salir?
     * Motor a fondo a mitad de pista, a ver si no nos caemos al mar. Esto en
     * aviación debería estar penalizado, ir con la pista justa cuando hay
     * media de sobra para poder realizar un despegue seguro».
     *
     * Tiene razón entera, y la regla ya estaba escrita para las
     * intersecciones calculadas: `pistaQueHaceFalta` pide casi cinco veces la
     * rodadura hasta rotar, que es sitio para el despegue, para uno mal hecho
     * y para arrepentirse a mitad. Lo que faltaba era aplicarla también a los
     * puntos publicados. Con ella, al JAZ 90 no se le ofrece intersección en
     * ninguna pista de menos de 4.172 m y al JAZ 120 en ninguna de menos de
     * 6.833: hacen el recorrido hasta la cabecera, como en la vida real.
     */
    /*
     * **Y se quedan todos, que tirarlos rompió El Hierro.**
     *
     * El primer intento filtraba aquí los que no dejan pista bastante por
     * delante, y en una pista de mil doscientos metros eso los tira casi
     * todos: en El Hierro quedaba **uno**, al otro lado del asfalto que la
     * plataforma, así que la única ruta posible cruzaba la pista en diagonal
     * y el juego hacía lo correcto —percance «entraste en la pista sin la luz
     * verde», a los veinte segundos de arrancar—. Medido en el barrido: 11 de
     * 22 en El Hierro y 12 de 22 en Cuatro Vientos.
     *
     * No cruzar la pista manda sobre cuánta pista queda, y con razón: entrar
     * sin permiso es lo más grave que se puede hacer rodando, y salir por una
     * intersección es como mucho incómodo. Así que la pista que queda deja de
     * ser un filtro y pasa a ser **un criterio de la elección**, por debajo
     * de no cruzar. Ver `elegirPuestoYEspera`.
     */
    for (const e of this.aero.holdingPositions) {
      if (this.alGrafo(e.xy) > SALTO_A_LA_ESPERA) continue;
      sitios.push(e.xy);
    }
    /*
     * Y la publicada de la cabecera va siempre, sin filtro: es la que da la
     * pista entera y es la que tiene que quedar cuando no queda ninguna otra.
     */
    if (publicada) sitios.push(publicada);
    this.esperasVistas = sitios;
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

  /**
   * Si un punto cae **dentro del rectángulo de la pista**.
   *
   * A lo ancho y a lo largo, con el mismo margen con el que el juego decide
   * que el avión está en pista. Ver `enPista` en `paso`.
   */
  private enElAsfalto(p: Punto): boolean {
    const [fx, fz] = delante(this.pista.heading);
    // El eje, en las coordenadas del plan, donde la y es la z cambiada de signo.
    const ux = fx;
    const uy = -fz;
    const dx = p[0] - this.pista.x;
    const dy = p[1] - -this.pista.z;
    const along = dx * ux + dy * uy;
    const across = dx * -uy + dy * ux;
    return (
      Math.abs(across) < this.pista.width / 2 + 3 &&
      Math.abs(along) < this.pista.length / 2 + 3
    );
  }

  /**
   * Si una ruta **cruza** la pista: entra en el asfalto y vuelve a salir.
   *
   * La diferencia con «pisa el asfalto» no es una sutileza, es el caso normal:
   * **una salida por intersección termina en la pista a propósito**. Los
   * puntos de espera que calcula `esperasPorInterseccion` son nudos del grafo
   * que están sobre el asfalto —es donde se entra—, así que mirando punto por
   * punto salían marcadas como travesía las nueve rutas de El Hierro, que es
   * todas, y la preferencia de no cruzar se quedaba sin nada que preferir.
   *
   * Lo que de verdad hay que evitar es **atravesar**: meterse en la pista para
   * salir por el otro lado y seguir rodando. Eso se ve solo mirando si después
   * de estar dentro se vuelve a estar fuera.
   */
  private cruzaElAsfalto(puntos: readonly Punto[]): boolean {
    let dentro = false;
    for (const q of puntos) {
      if (this.enElAsfalto(q)) dentro = true;
      else if (dentro) return true;
    }
    return false;
  }

  /**
   * El punto de espera por el que se sale desde un puesto: **uno que no
   * obligue a cruzar la pista** y, de los que quedan, el que diga
   * `elegirSalida`.
   *
   * Esto elegía por distancia y nada más, y en El Hierro eso salía carísimo:
   * la plataforma está a un lado y el punto de espera más cercano al otro, así
   * que la ruta más corta **atravesaba la pista en diagonal** —veintiséis de
   * sus cuarenta y siete puntos caen sobre el asfalto— y el juego hacía lo
   * correcto: percance «entraste en la pista sin la luz verde», a los veinte
   * segundos de arrancar y sin que nadie hubiera hecho nada mal salvo seguir
   * la raya verde que el propio juego pintaba.
   *
   * Cruzar una pista es una autorización aparte y el juego todavía no la sabe
   * dar, así que de momento se rodea. Y es **preferencia, no prohibición**:
   * hay campos donde la única calle cruza la pista —Pedro Juan Caballero es
   * uno— y ahí se cruza, porque la alternativa es no salir.
   */
  private esperaDeSalida(
    puesto: Punto | null = this.puestoElegido,
    desdeFuera = false,
  ): Punto | null {
    // Sin puesto a mano manda el par calculado; con uno —el mejor estaba
    // ocupado y el juego eligió otro, o es donde se paró el avión— se vuelve
    // a mirar desde ahí.
    if (!puesto) return this.parDeSalida()?.espera ?? null;
    /*
     * **Y con las mismas preferencias que el par**, no con las suyas.
     *
     * Esto elegía «la más corta que no cruce», sin mirar si desde ahí se
     * puede despegar: la doble raya más cercana al puesto, aunque sea una de
     * media pista desde la que el avión tiene que remontar la pista entera. Es
     * la misma elección que hace `parDeSalida` para el puesto de siempre, y
     * tiene que salir igual para cualquier otro. Ver `elegirSalida`.
     *
     * Se guarda por puesto: la raya se rehace cada dos segundos si el avión se
     * aparta, y esto son una docena de búsquedas de camino.
     */
    const clave = `${puesto[0].toFixed(1)},${puesto[1].toFixed(1)}`;
    const guardada = this.esperasPorPuesto.get(clave);
    if (guardada !== undefined) return guardada;
    const elegido = this.elegirSalida(
      this.paresDeSalida([{ ref: null, xy: puesto }], desdeFuera),
    );
    const espera = elegido?.espera ?? null;
    this.esperasPorPuesto.set(clave, espera);
    return espera;
  }

  /** Ver `esperaDeSalida`. Se tira al mudarse de campo. */
  private esperasPorPuesto = new Map<string, Punto | null>();

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
      /*
       * **Y la calle que llega a la cabecera vale siempre**, aunque no deje
       * la pista que este avión querría: es la de la pista entera, no una
       * intersección. En Lanzarote la de la 03 llega a ochenta y tres metros
       * del final, y con el filtro a secas no pasaba —al JAZ 90 no le basta
       * ninguna pista del campo—, así que el reactor salía por la mitad del
       * campo y remontaba mil cien metros de pista hasta la cabecera por la
       * que se podía haber entrado rodando. El AIP lo dice así: la espera de
       * la 03 está en la E4, que es esa, y no se despega desde
       * intersecciones.
       */
      const queda = this.pistaQueQueda(nudo);
      if (queda < pistaQueHaceFalta(this.avion) && queda < this.pista.length - EN_LA_CABECERA)
        return;
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
  /** Si esta lección empieza alineado en la cabecera. Ver `reiniciar`. */
  private desdeLaPista = false;

  reiniciar(desdeLaPista = false): boolean {
    /*
     * **Y a veces no se sale del puesto, aunque el puesto exista.**
     *
     * La lección «dar una vuelta» empieza alineado en la cabecera y con el
     * motor en marcha, y hasta hoy eso se conseguía **no montando el plan**.
     * El precio era caro y estaba escondido: sin plan no hay fases, y de las
     * fases cuelgan el aviso de V1, la megafonía de la comandante, la lámpara
     * de la torre y los silencios de la radio. Todo mudo en esa lección sin
     * que nada fallara. Ahora el plan se monta siempre y es **la lección**
     * quien dice de dónde se sale, que es de quien tenía que depender.
     */
    this.desdeLaPista = desdeLaPista;
    /*
     * Y el puesto elegido a mano se olvida: un vuelo nuevo sale del que toca.
     * Si se quedara, `arranque` pondría el avión en el sitio de la vez
     * anterior y la raya saldría del puesto de siempre. Ver `reiniciarDesde`.
     */
    this.puestoElegido = null;
    const puesto = desdeLaPista ? null : this.puestoDeSalida();
    const espera = this.esperaDeSalida();
    if (!puesto || !espera) {
      this.vuelo.reiniciar(true);
      this.trazadaAlTocar = false;
      this.destino = null;
      this.ponerRuta(null);
      return false;
    }
    this.vuelo.reiniciar(false);
    this.trazadaAlTocar = false;
    this.destino = "espera";
    this.ultimaPos = puesto.xy;
    this.ponerRuta(
      rodajeEntre(this.grafo, puesto.xy, espera, 220, this.ocupadosAhora(true)),
    );
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
   * Y el último punto de la ruta que no es el propio destino.
   *
   * El espejo de `primerPaso`, y hace falta por el señalero: se planta
   * **mirando por donde viene el avión**, y al salir lo único que se sabe es
   * por dónde se va. A la vuelta suele ser lo mismo... salvo cuando no lo es,
   * que es en cuanto el rodaje de vuelta entra al puesto por el otro lado.
   * Ver `senaleroAlPuestoDeLlegada` en `game.ts` y `senalero.test.ts`.
   */
  ultimoPaso(): readonly [number, number] | null {
    const fin = this.rutaMundo[this.rutaMundo.length - 1];
    if (!fin) return null;
    for (let i = this.rutaMundo.length - 1; i >= 0; i--) {
      const p = this.rutaMundo[i]!;
      if (Math.hypot(p[0] - fin[0], p[1] - fin[1]) > 25) return p;
    }
    return this.rutaMundo[0] ?? null;
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
    /*
     * Dónde estoy sobre la ruta, en metros recorridos: **lo que lleva la
     * cuenta del avance**, no el tramo más cercano de todos.
     *
     * Era el más cercano, y en el back-taxi el más cercano puede ser el de
     * vuelta —la ida va a ocho metros del eje y la vuelta por él—: rodando por
     * el eje, el punto de delante caía en la vuelta, detrás del avión, y la
     * ayuda de rodaje se callaba por creer que se le pedía media vuelta. El
     * avance ya sabe por qué tramo se va. Ver `avanzarEnRuta`.
     */
    this.restanteHasta(p);
    const recorrido = this.avance;

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
     * amortiguador de guiñada para que no oscile — que **en Guyrami valía
     * cero**, porque el modelo sencillo publicaba `yawRate = 0` siempre, aunque
     * el avión estuviera girando. Ver `arcade.ts`.
     *
     * Y encima, **solo en los peldaños de abajo**, la anticipación: apuntar a
     * un punto de la ruta por delante. Ver el parámetro `anticipa`.
     */
    let mejor = Infinity;
    let desvio = 0;
    let rumboDeLaRaya = 0;
    /*
     * **Y el tramo de la raya es el que se está rodando, no el más cercano.**
     *
     * En el back-taxi la vuelta va por el eje y la ida a ocho metros: rodando
     * por el eje a la ida, el tramo más cercano era el de vuelta, que va en
     * sentido contrario, y la corrección empujaba hacia él. Se mira solo lo
     * que queda cerca del avance —ver `avanzarEnRuta`—, y si ahí no hay nada,
     * todo, como antes.
     */
    const cerca = (i: number): boolean =>
      this.recorridos.length !== this.rutaMundo.length ||
      ((this.recorridos[i + 1] ?? Infinity) >= this.avance - CERCA_DEL_AVANCE &&
        (this.recorridos[i] ?? 0) <= this.avance + CERCA_DEL_AVANCE);
    const hayCerca = this.rutaMundo.some(
      (_, i) => i < this.rutaMundo.length - 1 && cerca(i),
    );
    for (let i = 0; i < this.rutaMundo.length - 1; i++) {
      if (hayCerca && !cerca(i)) continue;
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

    /*
     * **Y la pregunta se le hace al punto de delante, no al trozo de al lado.**
     *
     * Esto miraba el rumbo del trozo de ruta más cercano, y un trozo cercano no
     * dice hacia dónde hay que ir: dice por dónde va la calle **ahí**. En una
     * esquina de noventa grados —la de cualquier puesto con su calle— el trozo
     * más cercano cambia de golpe al doblarla, así que el número saltaba de
     * doce grados a ochenta y ocho **sin que el avión girase**, y la ayuda se
     * apagaba justo en la curva que estaba para ayudar a tomar.
     *
     * Medido con `verificar-asistencia`: en Guyrami, con gas y sin tocar el
     * volante, el avión salía del puesto de Pettirossi, doblaba, la ayuda
     * callaba a los tres segundos y medio, y de quinientos cuarenta metros de
     * ruta hacía cuarenta y tres. Al peldaño de cuatro años no le llegaba la
     * calle de rodaje a ninguna parte.
     *
     * Lo que sí separa «tomar la curva» de «dar media vuelta» es si el sitio al
     * que iría queda **delante o detrás**, y eso es justo lo que contesta
     * `puntoDeLaRutaTrasMi`: pasada la boca de la salida, el punto que toca es
     * el final de la ruta, que queda a la espalda, y ahí la ayuda sigue
     * callándose como tiene que hacer.
     */
    let adelante = this.puntoDeLaRutaTrasMi(
      p,
      Math.max(15, estado.airspeed * 2),
    );
    let haciaDondeToca = adelante
      ? errorDeRumbo(p, estado.heading, adelante)
      : contra;
    /*
     * **Y donde el juego conduce del todo, la media vuelta de la propia raya
     * se toma.**
     *
     * El guardia de arriba está para cuando el sitio que toca ha quedado a la
     * espalda porque **el avión** se pasó —la boca de una salida—, y ahí dar
     * la vuelta es cosa de quien pilota. Pero hay otra forma de tener el punto
     * detrás: que **la raya** dé la vuelta, porque la calle llega a la pista
     * al revés del despegue. Es el punto de espera de Silvio Pettirossi: la
     * calle entra en diagonal hacia el sur, el despegue es hacia el norte y
     * la raya dibuja una media vuelta de cuatro metros y medio. Mirando quince
     * metros por delante, el punto caía pasada la vuelta, a la espalda, y la
     * ayuda se callaba justo en ella: con la verde y sin tocar el volante, el
     * JAZ 20 seguía recto por la pista y fuera. Medido con
     * `verificar-verde-sin-volante`.
     *
     * En Guyrami eso no puede quedar en manos de quien tiene cuatro años. Si
     * el avión va sobre la raya, se mira más cerca —dentro de la vuelta—
     * hasta encontrar un punto por delante, y se toma. Con el avión fuera de
     * la raya, o en los peldaños donde la curva es de quien juega, el guardia
     * sigue mandando.
     */
    let tomaLaVuelta = false;
    if (
      Math.abs(haciaDondeToca) > VUELTA_EN_U &&
      anticipa >= 1 &&
      mejor < EN_LA_RAYA_PARA_VOLVER
    ) {
      for (const cerca of MIRADAS_EN_LA_VUELTA) {
        const q = this.puntoDeLaRutaTrasMi(p, cerca);
        if (!q) break;
        adelante = q;
        haciaDondeToca = errorDeRumbo(p, estado.heading, q);
        if (Math.abs(haciaDondeToca) <= VUELTA_EN_U) break;
      }
      /*
       * Y si ni a tres metros queda por delante —el avión llegó a la vuelta
       * con el morro todavía como venía la calle—, se gira hacia ese punto
       * igual: la raya da la vuelta aquí mismo y el avión va encima de ella.
       */
      tomaLaVuelta = true;
    }
    if (!tomaLaVuelta && Math.abs(haciaDondeToca) > VUELTA_EN_U) return 0;

    /*
     * Seis metros de holgura: medio ancho de calle. Dentro de eso no se toca
     * nada, porque ahí no hay deriva que corregir — hay un avión rodando.
     */
    const fuera = Math.abs(desvio) < 6 ? 0 : desvio - Math.sign(desvio) * 6;
    /*
     * **Y a qué velocidad te acercas a la raya, no solo cuánto te falta.**
     *
     * El amortiguador de aquí miraba solo `yawRate`, que frena el **giro** del
     * avión y no dice nada de si te estás acercando a la raya despacio o a
     * toda prisa. Con eso la ayuda mete el avión hacia la raya, llega, y como
     * lo único que la frenaba era el giro, **se pasa**. Medido con
     * `verificar-asistencia`, soltando el avión ocho metros al costado de un
     * tramo recto: se quedaba dando bandazos de tres metros de media en los
     * peldaños de en medio, y clavado a 6,6 en Guyrami — que es el modelo
     * sencillo, donde el empujón no llega ni a cruzar la raya, así que se
     * aparcaba justo en el borde de la holgura y ahí se quedaba.
     *
     * Esto es la derivada del desvío: cuántos metros por segundo te estás
     * comiendo. Con ella la corrección afloja **antes** de llegar, que es lo
     * que hace cualquiera al aparcar.
     *
     * **Con tope y flojita, y las dos cosas costaron un vuelo entero.** Sin
     * tope y con ganancia un sexto, cerca de la plataforma de Pettirossi
     * —donde la ruta hace codos cerrados y el error de rumbo es enorme— el
     * término se dispara y manda girar al lado que no es: el avión se lleva un
     * edificio por delante a los veintiséis segundos de rodaje, reproducible.
     * Dos metros por segundo de tope y un veinteavo de ganancia dejan el vuelo
     * de Pettirossi en 14 de 14 y arreglan igual lo que había que arreglar.
     *
     * Y el signo **suma**. Con el signo cambiado el avión se va a cincuenta y
     * siete metros del eje, que es como se descubrió cuál era.
     */
    const cerrando = Math.max(
      -TOPE_DE_ACERCAMIENTO,
      Math.min(TOPE_DE_ACERCAMIENTO, estado.airspeed * Math.sin(contra)),
    );
    let giro = Math.max(
      -TOPE_DE_AYUDA,
      Math.min(
        TOPE_DE_AYUDA,
        -fuera / 14 + cerrando / 20 - (estado.yawRate * 180) / Math.PI / 40,
      ),
    );

    /*
     * **La anticipación: mirar a dónde va la calle, no dónde estoy.**
     *
     * Se apunta al punto de la ruta que toca —el mismo que ya se buscó arriba
     * para saber si esto era una curva o una media vuelta— y se corrige el
     * rumbo hacia él. Es lo que hace cualquiera que conduce: se mira a la
     * salida de la curva.
     *
     * **Y esto sí puede llegar al volante entero.** El tope de arriba está
     * para el término del desvío, que es de donde salía la sensación del imán:
     * un proporcional que a veinte metros de la raya pedía volante a fondo para
     * arrastrarte hasta ella. Tomar la curva **en la que ya estás** no es eso, y
     * con el tope puesto no salía la cuenta: una esquina de dieciocho metros a
     * siete por segundo pide 0,45 de volante, y la ayuda de Guyrami llegaba a
     * 0,35 —0,7 de tope por 0,5 que pesa el peldaño—. O sea que **el juego
     * dibujaba una raya que su propio peldaño conductor no podía seguir**, y el
     * avión se salía a la hierba en la primera esquina.
     *
     * Se probaron antes otras dos formas de la cuenta y las dos salieron peor,
     * porque las dos atacaban el síntoma: la persecución pura —pedir curvatura,
     * `ω = 2·v·sen(ε)/L`— da 29,7 m, porque el seno se queda en casi uno entre
     * sesenta y ciento veinte grados y pide lo mismo durante toda la parte
     * cerrada de la curva; y descontar el giro que el avión ya lleva, para
     * soltar el volante antes de estar alineado, da 28,0. Contra 24,6 del
     * ángulo pelado. El sobrepaso no era de soltar tarde: era de no caber.
     */
    if (anticipa > 0 && adelante) giro += anticipa * (haciaDondeToca / 0.7);
    return Math.max(-1, Math.min(1, giro));
  }

  /** La ruta en coordenadas de mundo. Para las herramientas de comprobación. */
  rutaVisible(): readonly Punto[] {
    return this.rutaMundo;
  }

  /** La ruta **sin redondear**, tal y como la da el buscador. Para medirla. */
  rutaCruda(): readonly Punto[] {
    return this.ruta?.puntos ?? [];
  }

  /**
   * **Recalcula la raya como si el avión estuviera ahí**, en los ejes del
   * fichero y con ese rumbo —en radianes, como `FlightState.heading`—, y la
   * devuelve sin redondear. Es exactamente lo que hace el juego cuando el
   * avión se aparta de la raya o se pasa una salida; lo usa la prueba de los
   * dieciocho campos para mirar la raya recalculada desde cualquier punto de
   * la ruta. Ver `rodar-por-el-asfalto.test.ts`.
   */
  recalcularDesde(donde: Punto, rumbo: number, fase: Fase): readonly Punto[] {
    this.ultimaPos = donde;
    this.ultimoRumbo = rumbo;
    this.trazarDesdeAqui(fase);
    return this.rutaCruda();
  }

  /**
   * **La raya de entrar en la pista desde un punto de espera**, sin redondear,
   * o `null` si desde ahí no hay por dónde. Es la que el juego pone con la luz
   * verde; se pregunta sin tocar la raya de ahora ni el back-taxi que haya en
   * marcha. Para la prueba de los dieciocho campos.
   */
  entradaDesde(espera: Punto): readonly Punto[] | null {
    const giro = this.giroDelBackTaxi;
    const entrada = this.entradaEnPista(espera);
    this.giroDelBackTaxi = giro;
    return entrada?.puntos ?? null;
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
    this.paciencia(p.fase, estado.groundSpeed, sugerida, dt);

    const puestas = this.vecesQueSePusoLaRuta;
    if (p.cambio || this.acabaDeMudarse) {
      // Mudarse de aeropuerto es, para la ruta, lo mismo que cambiar de fase:
      // lo que había ya no vale y hay que trazar desde donde se está.
      this.acabaDeMudarse = false;
      this.alCambiarDeFase(p.fase);
    } else this.rehacerSiHaceFalta(p.fase, dt);
    /*
     * **Y con ruta nueva, el avance se mide sobre ella ya, no en el fotograma
     * siguiente.**
     *
     * Poner una ruta deja el avance en cero hasta que la situación del paso
     * siguiente lo vuelva a medir, y en ese fotograma quien pregunta por él
     * —el coche del sígame— oía «el avión está al principio de la ruta». Y la
     * ruta de vuelta empieza donde se tocó tierra, que en El Hierro quedaba
     * ciento cincuenta metros detrás del avión: un coche que se planta con
     * ese número se planta **detrás**, y en el fotograma siguiente tiene que
     * pasar por el avión para ponerse delante. Un fotograma con el número de
     * otra ruta es un número falso.
     */
    if (this.vecesQueSePusoLaRuta !== puestas && this.rutaMundo.length > 1)
      this.restanteHasta([estado.position.x, estado.position.z]);
    this.encender();

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
      /*
       * **Y solo mientras se rueda de verdad.**
       *
       * Esto no miraba la fase, así que seguía juzgando la velocidad **en la
       * carrera de despegue**: con el gas a fondo, acelerando por la pista y lo
       * que queda de ruta en cero, la cuenta de frenada da que no se para ni
       * loco y el juego pide «más despacio». Se vio jugando, y no hay manera
       * más rápida de perder la confianza de quien juega: «estoy saliendo
       * metiendo motores, todavía en aceleración, y "más despacio"».
       *
       * En una pista la velocidad **es** el asunto. Se avisa en las calles, que
       * es donde una curva se pasa por ir rápido.
       *
       * Y se mide por el suelo, no por el aire: con viento de cara, un avión
       * parado ya marca la velocidad del viento. Es la misma corrección que
       * hubo que hacer en el tope de rodaje.
       */
      rapido:
        /*
         * **Y nunca sobre la pista, mire la fase lo que mire.**
         *
         * Gatear esto por la fase no bastó: la máquina de fases tarda en pasar
         * de «rodando» a «alineando», y en ese hueco el avión ya está en la
         * pista con el gas a fondo. «¿Pero por qué más despacio si acabo de
         * empezar a arrancar para hacer volar un 747 y no llevo ni dos segundos
         * acelerando?»
         *
         * Lo que no se equivoca es dónde están las ruedas: en una pista la
         * velocidad **es** el asunto y no hay nada que avisar. Es la misma
         * pregunta que ya contestaba el tope de rodaje con `onRunway`.
         */
        !estado.onRunway &&
        sobreElSuelo < 3 &&
        this.rutaMundo.length > 1 &&
        vaRapido(p.fase, estado.groundSpeed, sugerida, s.restante),
      restante: s.restante,
      // Solo se avisa **mientras se rueda**. Antes de arrancar nadie se ha
      // salido de nada, y decírselo a quien todavía no se ha movido es ruido.
      saltoLaLuz: p.saltoLaLuz,
      leccionHecha: p.leccionHecha,
      mirandoLaPista: s.enPista && Math.abs(s.desalineado) < MIRANDO_LA_PISTA,
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
    // La de antes, y se apunta ya la de ahora: el cuerpo de esto sale por seis
    // sitios distintos y apuntarla al final se olvidaría en cinco.
    const antes = this.faseAnterior;
    this.faseAnterior = fase;
    // Y la cola de antes ya no es la de ahora. Ver `hartos`.
    this.hartos = [];
    this.esperandoDetras = 0;
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
      // Volando no hay puerta asignada: la siguiente llegada se asigna sola.
      this.puerta.olvidar();
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
    /*
     * **Y una vez por aterrizaje, no una vez por frenada.**
     *
     * Esto rehacía la ruta cada vez que la fase **entraba** en «abandonando»,
     * y se entra más de una vez: quien frena, rueda por la pista hacia su
     * salida y se pasa de rápido vuelve a la carrera, y al frenar para girar
     * vuelve a «abandonando». Ahí, a veinte metros de la boca, la salida que
     * tenía delante ya no cuenta como «por delante con sitio para girar», así
     * que ganaba la siguiente. En Fuerteventura, aterrizando por la 01, la
     * raya saltó así de salida en salida hasta el final de la pista: 4,9 km
     * rodados sobre 2,8 trazados. Frenar para tomar una salida la cambiaba por
     * otra.
     *
     * Lo que había que rehacer era la ruta trazada en el aire, y esa se rehace
     * una vez. Si después el avión se sale de ella, la recoge
     * `rehacerSiHaceFalta`, que traza desde donde esté.
     */
    if (fase === "aterrizado" && (antes === "final" || antes === "en-vuelo"))
      this.trazadaAlTocar = true;
    if (fase === "abandonando" && this.trazadaAlTocar) {
      this.trazadaAlTocar = false;
      this.destino = null;
    }

    if (quiere === this.destino) return;
    this.destino = quiere;
    if (quiere === null) {
      this.ponerRuta(null);
      return;
    }

    /*
     * **Y al volver, al puesto más cercano; al salir, al de siempre.**
     *
     * La ruta de vuelta iba al puesto de salida, o sea a cruzar el aeropuerto
     * entero para dejar el avión donde se cogió. Ver `puestoDeLlegada`.
     */
    const meta =
      quiere === "puesto"
        ? (fase === "aterrizado" ||
          fase === "abandonando" ||
          fase === "a-plataforma"
            ? this.puestoDeLlegada(this.ultimaPos, fase !== "aterrizado")
            : this.puestoDeSalida()
          )?.xy
        : this.esperaDeSalida();
    if (!meta) {
      this.ponerRuta(null);
      return;
    }
    // Desde donde esté el avión, y con margen ancho: quien vuelve de volar
    // puede haber tomado tierra lejos de cualquier calle.
    if (quiere === "puesto") {
      this.ponerLaVuelta(this.rutaDeVuelta(meta));
      return;
    }
    this.ponerRuta(
      rodajeEntre(this.grafo, this.ultimaPos, meta, 600, this.ocupadosAhora(true), {
        desdeFuera: true,
      }),
    );
  }

  /**
   * La ruta de vuelta al puesto desde donde está el avión, y la salida de
   * pista por la que va, si va por una.
   *
   * **Si está en la pista, saliendo por delante.** El camino más corto al
   * puesto puede empezar dando media vuelta, y eso en una pista no se hace ni
   * se enseña: se abandona por una salida que quede por delante. Con la ruta
   * más corta, la raya salía hacia atrás —fuera de la pantalla, que mira
   * adelante— y quien acababa de aterrizar no tenía nada que seguir: «al
   * aterrizar no tuve línea de regreso al hangar».
   *
   * **Y hasta esa salida se va rodando, no en línea recta.** Aquí se trazaba
   * la ruta *desde la salida* y después se le pegaba delante la posición del
   * avión: una recta desde donde estabas hasta la boca, por encima de lo que
   * hubiera en medio —«salgo por E4 atravesando los jardines»—. Son dos rutas
   * encadenadas: de las ruedas a la salida por la pista, y de la salida al
   * puesto por el grafo. Y si la segunda no sale —una toma muy lejos de
   * todo—, la ruta directa, que es mejor que quedarse sin raya.
   *
   * La salida es siempre **la primera útil**: al tocar tierra, la primera a
   * la que se llega frenando; y si esa ya se ha pasado, lo que dice una torre
   * es «vacate next available» —abandone por la próxima disponible—, que es
   * la misma cuenta desde donde se esté. Ver `salidaPorDelanteQue` y
   * `seHaPasadoLaSalida`.
   */
  private rutaDeVuelta(meta: Punto): { ruta: Ruta | null; salida: Punto | null } {
    const salida = this.salidaPorDelante(meta);
    if (salida) {
      const hastaLaSalida = this.porLaPistaHasta(salida);
      const desdeLaSalida = rodajeEntre(
        this.grafo,
        salida,
        meta,
        600,
        this.ocupadosAhora(false),
        { desdeLaCalle: true },
      );
      if (desdeLaSalida)
        return {
          ruta: {
            ...desdeLaSalida,
            puntos: [...hastaLaSalida.puntos, ...desdeLaSalida.puntos],
            largo: hastaLaSalida.largo + desdeLaSalida.largo,
            letras: [...hastaLaSalida.letras, ...desdeLaSalida.letras],
          },
          salida,
        };
    }
    /*
     * **Y si no queda ninguna por delante, se vuelve por la pista.** Ver
     * `vueltaPorLaPista`. Sin salida de pista que recordar: la boca queda
     * detrás del avión hasta que se da la vuelta, y `seHaPasadoLaSalida` la
     * daría por pasada en cada fotograma.
     */
    const porLaPista = this.vueltaPorLaPista(meta);
    if (porLaPista) return { ruta: porLaPista, salida: null };
    return {
      ruta: rodajeEntre(
        this.grafo,
        this.ultimaPos,
        meta,
        600,
        this.ocupadosAhora(false),
        // Y si ya está girando hacia una calle, por la calle.
        { desdeFuera: true, desdeLaCalle: !this.rodandoPorLaPista() },
      ),
      salida: null,
    };
  }

  /** Pone una ruta de vuelta y se acuerda de su salida de pista. */
  private ponerLaVuelta(vuelta: {
    ruta: Ruta | null;
    salida: Punto | null;
  }): void {
    this.ponerRuta(vuelta.ruta);
    this.salidaDeLaRuta = vuelta.ruta ? vuelta.salida : null;
  }

  /**
   * La boca de la salida de pista por la que va la ruta de ahora, en
   * coordenadas del fichero, o `null` si la ruta no deja la pista por una.
   */
  private salidaDeLaRuta: Punto | null = null;

  /**
   * Cuánto hay que haber dejado atrás la boca de la salida para darla por
   * pasada, m.
   *
   * Treinta: más que lo que se come un avión grande al girar hacia la calle
   * —la raya dobla con dieciocho metros de radio y el reactor abre algo
   * más—, así que tomarla no cuenta como pasársela. Y a paso de rodaje son
   * dos segundos y medio: la raya nueva sale antes de que haga falta.
   */
  private static readonly PASADA = 30;

  /**
   * **Si el avión se ha pasado la salida por la que iba su ruta**: sigue en
   * la pista, rodando a lo largo de ella, y la boca ha quedado atrás.
   *
   * Pasarse la salida es lo más corriente del mundo —se frena tarde y ya no
   * da para girar— y hasta aquí lo recogía la regla general de «te has ido
   * de la raya», que traza el camino más corto desde donde estés. Desde la
   * pista, el camino más corto engancha por el nudo más cercano, que suele
   * ser el de la salida que se acaba de pasar: la raya nueva volvía **hacia
   * atrás por la pista** a buscarla, cada dos segundos una vez más, mientras
   * el avión se alejaba. Medido en Los Rodeos rodando a doce metros por
   * segundo: la salida seguía siendo la de atrás durante trescientos metros,
   * y la siguiente, también, hasta pasar la otra.
   */
  private seHaPasadoLaSalida(): boolean {
    const salida = this.salidaDeLaRuta;
    if (!salida) return false;
    const { x, z, heading, width } = this.pista;
    const aqui = enEjesDePista(this.ultimaPos[0], -this.ultimaPos[1], x, z, heading);
    // Fuera del asfalto ya no se la está pasando: la está tomando, o es otra.
    if (Math.abs(aqui.across) > width / 2) return false;
    // Y rodando a lo largo de la pista, no girando hacia la calle.
    const alEje = Math.cos(this.ultimoRumbo - (heading * Math.PI) / 180);
    if (Math.abs(alEje) < Math.cos(Math.PI / 6)) return false;
    const sentido = alEje >= 0 ? 1 : -1;
    const boca = enEjesDePista(salida[0], -salida[1], x, z, heading);
    return (aqui.along - boca.along) * sentido > PlanDeVuelo.PASADA;
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
    /*
     * **Y pasarse la salida no espera al reloj ni a alejarse de la raya.** Ver
     * `seHaPasadoLaSalida`: la raya nueva sale de donde se está, por la
     * próxima salida, en el mismo fotograma en que la de antes queda atrás.
     */
    const pasada = this.destino === "puesto" && this.seHaPasadoLaSalida();
    this.desdeElUltimoTrazado += dt;
    if (!pasada) {
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
    } else this.desdeElUltimoTrazado = 0;
    this.trazarDesdeAqui(fase, pasada);
  }

  /**
   * **La raya de ahora, trazada desde donde está el avión**: lo que hace el
   * GPS cuando decide recalcular. Suelto de `rehacerSiHaceFalta`, que es quien
   * decide cuándo, para que las pruebas puedan preguntar lo mismo desde
   * cualquier sitio. Ver `recalcularDesde`.
   */
  private trazarDesdeAqui(fase: Fase, pasada = false): void {
    /*
     * **Y volviendo, a la puerta que se asignó, no al puesto de salida.**
     *
     * Esto rehacía la ruta hacia `puestoDeSalida` también de vuelta, así que
     * bastaba con salirse de la raya un momento para que la llegada cambiara
     * de puerta: la raya saltaba a otro puesto, el señalero detrás, y quedaba
     * dicho y sin cumplir lo de «una llegada, una puerta». Medido aterrizando
     * en Tenerife Norte: el final de la raya pasó de (-93878, -61624) a
     * (-94252, -61751) a los tres segundos de haber dejado la pista.
     */
    const volviendo =
      fase === "aterrizado" || fase === "abandonando" || fase === "a-plataforma";
    const meta =
      this.destino === "puesto"
        ? (volviendo
            ? this.puestoDeLlegada(this.ultimaPos, fase !== "aterrizado")
            : this.puestoDeSalida()
          )?.xy
        : this.esperaDeSalida();
    if (!meta) return;
    /*
     * **Y volviendo desde la pista, por una salida que quede delante**, la
     * primera: es la misma cuenta que al tocar tierra, con lo que dice la
     * torre a quien se pasó la suya. Desde fuera de la pista no hay «por
     * delante» —`salidaPorDelante` no da ninguna— y queda lo de siempre, el
     * camino más corto desde donde se esté.
     */
    const vuelta =
      this.destino === "puesto" && volviendo
        ? this.rutaDeVuelta(meta)
        : null;
    const desdeAqui = (desdeLaCalle: boolean) =>
      rodajeEntre(
        this.grafo,
        this.ultimaPos,
        meta,
        600,
        this.ocupadosAhora(this.destino === "espera"),
        { desdeFuera: true, desdeLaCalle },
      );
    /*
     * **Y si desde la calle no se llega, desde la pista.** Quien ya no rueda
     * pista abajo sale por la calle que pisa, y no se le devuelve a la pista
     * —ver `rodandoPorLaPista`—. Pero quien está parado en mitad de la pista
     * y cruzado, sin calle a la vista, no pisa ninguna: en Mariscal
     * Estigarribia, con el JAZ 120 girado hacia el borde a mil cien metros de
     * la única salida, no salía ninguna raya y se quedaba la vieja. La pista
     * es por donde se vuelve, y es mejor volver por ella que quedarse sin
     * raya.
     */
    const desdeLaCalle = this.destino === "puesto" && !this.rodandoPorLaPista();
    const ruta =
      vuelta?.ruta ?? desdeAqui(desdeLaCalle) ?? (desdeLaCalle ? desdeAqui(false) : null);
    // Y si no sale, **se deja la que había**: una raya vieja guía peor que una
    // nueva, pero infinitamente mejor que ninguna.
    if (!ruta) return;
    if (vuelta?.ruta) this.ponerLaVuelta(vuelta);
    else this.ponerRuta(ruta);
    /*
     * **Y se apunta que la raya ya va por la siguiente**, para que la torre
     * lo diga como se dice: «vacate next available». La raya nueva salía sola
     * y en silencio, y quien se había pasado la salida no sabía si seguir,
     * frenar o volver. Ver `salidasPasadas`.
     */
    if (pasada && vuelta?.salida) this.pasadas++;
  }

  /**
   * **Cuántas veces se ha pasado la salida en este vuelo** y la raya se ha
   * rehecho por la siguiente. Lo mira el juego para que la torre diga
   * «vacate next available» una vez por salida pasada; un contador y no un
   * aviso porque el plan no habla, solo cuenta.
   */
  get salidasPasadas(): number {
    return this.pasadas;
  }

  private pasadas = 0;

  /**
   * **Dónde se da la media vuelta del back-taxi** entrando en la pista por
   * `along`, y con qué apartado y radio; `null` si desde ahí no hay
   * back-taxi. Sin trazar nada, porque lo pregunta también quien elige por
   * dónde salir: ver `pistaParaRemontar`. Las dos preguntas tienen que tener
   * la misma respuesta, y por eso es una cuenta y no dos.
   */
  private vueltaDelBackTaxi(
    along: number,
  ): { giro: number; lado: number; radio: number } | null {
    const mitad = this.largoDePista / 2;
    // Si desde aquí ya queda pista de sobra, esto no es un back-taxi: es
    // entrar y despegar, que es lo que pasa en casi todos los aeródromos.
    if (mitad - along >= paraEntrarYDespegar(this.avion)) return null;
    // Y en una pista estrecha tampoco, porque las dos rayas se confunden.
    // Ver `ANCHO_PARA_LA_VUELTA`.
    if (this.pista.width < ANCHO_PARA_LA_VUELTA) return null;
    /*
     * **Ni si este avión no cabe dando la vuelta.**
     *
     * Una media vuelta en pista necesita dos radios de giro **más la
     * envergadura**: el ala de fuera barre por fuera del camino que hacen las
     * ruedas. Un 747 pide setenta y ocho metros y una pista de línea tiene
     * cuarenta y cinco — por eso en la vida real esos aviones no dan la vuelta
     * en la pista, se les hace una raqueta al final o entran por la cabecera.
     *
     * Dibujarle la maniobra igualmente es dibujar algo que no puede hacer: la
     * raya se le iría por la hierba y él detrás. Si no cabe, no hay back-taxi y
     * se entra por donde se pueda.
     */
    if (2 * radioDeGiro(this.avion) + this.avion.wingSpan > this.pista.width)
      return null;

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
     * dieciséis, más que la envergadura de el Pykasu.
     */
    /*
     * **Y lo que cabe lo dicen las alas de este avión, no el ancho a secas.**
     *
     * Esto se apartaba `ancho/2 − 4` del eje, o sea cuatro metros del borde,
     * sin mirar qué avión iba a rodar por ahí. En una pista de cuarenta y cinco
     * metros eso son dieciocho y medio del eje: con el reactor —veintiséis de
     * envergadura— el ala quedaba **nueve metros fuera del asfalto**. Se vio
     * jugando: «esta pista, ¿es normal este dibujo que me hace ir por el
     * borde?». No lo era.
     *
     * Ahora el ala se queda dentro con dos metros de margen. Y el apartado no
     * puede bajar de dos radios de giro de **este** avión, porque de él sale la
     * media vuelta del final: una raya más estrecha que eso dibuja un giro que
     * el avión no puede dar. Cuando las dos condiciones se pelean es que ese
     * avión no puede dar la vuelta en esta pista, y eso lo dice `cabeEn` antes
     * de dejarlo entrar. Ver `radioDeGiro`.
     */
    const alaDentro = this.pista.width / 2 - this.avion.wingSpan / 2 - 2;
    const lado = Math.max(
      2 * radioDeGiro(this.avion),
      Math.min(2 * RADIO_CURVA, alaDentro),
    );
    const radio = lado / 2;
    const umbral = -mitad + HUECO_PARA_GIRAR + radio;
    const giro = Math.max(umbral, mitad - pistaQueHaceFalta(this.avion));
    /*
     * **Y si ya se entra en la cabecera, no hay nada que remontar.** En Ayolas
     * la calle llega a la pista a veinte metros del umbral de la 02; el JAZ 90
     * querría más pista de la que tiene el campo, así que la cuenta pedía
     * back-taxi, y el sitio de dar la vuelta caía **por delante** de la
     * entrada: la raya se iba sesenta metros hacia atrás, por detrás del
     * umbral y fuera del asfalto, para volver. Desde la cabecera se despega
     * con la pista que hay.
     */
    if (along - giro < HUECO_PARA_GIRAR + lado) return null;
    return { giro, lado, radio };
  }

  /** Ver `vueltaDelBackTaxi`. */
  private dondeSeDaLaVuelta(along: number): number | null {
    return this.vueltaDelBackTaxi(along)?.giro ?? null;
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
   * —`pistaQueHaceFalta`, que sale de lo que corre **este** avión—, y si
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
  private backTaxiDesde(
    along: number,
    /**
     * Si se llega al eje mirando hacia donde se despega, que es lo contrario
     * de hacia donde se va a rodar. Ver «Y si se llega de frente» abajo.
     */
    llegaDeFrente = false,
  ): { puntos: Punto[]; arco: number } | null {
    this.giroDelBackTaxi = null;
    const vuelta = this.vueltaDelBackTaxi(along);
    if (!vuelta) return null;
    const { giro, lado, radio } = vuelta;
    const mitad = this.largoDePista / 2;
    this.giroDelBackTaxi = giro;

    const [fx, fz] = delante(this.pista.heading);
    const [tx, tz] = traves(this.pista.heading);
    /** Un punto del asfalto, en coordenadas de fichero. */
    const enLaPista = (a: number, lado: number): Punto => [
      this.pista.x + fx * a + tx * lado,
      -(this.pista.z + fz * a + tz * lado),
    ];


    /*
     * **Y si se llega de frente, primero se da la vuelta.**
     *
     * Entrando por una calle que llega a la pista en diagonal, mirando hacia
     * donde se despega —una salida rápida tomada al revés—, el back-taxi empieza
     * rodando hacia el otro lado: media vuelta sobre la pista antes de nada.
     * Se dibuja como la del final, media circunferencia de radio la mitad del
     * apartado, que deja el avión justo en la raya de ida y mirando hacia la
     * cabecera. Sin ella la raya pasaba del eje a la raya de ida por un codo
     * de ciento setenta grados, y un codo así no se sigue: quien iba por la
     * raya se quedaba clavado en él.
     */
    const antes: Punto[] = [];
    if (llegaDeFrente)
      for (let g = -75; g <= 90; g += 15) {
        const rad = (g * Math.PI) / 180;
        antes.push(enLaPista(along + radio * Math.cos(rad), radio + radio * Math.sin(rad)));
      }
    const puntos: Punto[] = [
      ...antes,
      // Del eje al lado por el que se va: entrar y apartarse, sin cruzarse.
      ...(llegaDeFrente ? [] : [enLaPista(Math.min(along, mitad - 40) - 60, lado)]),
      enLaPista(giro + radio, lado),
    ];
    /*
     * Media circunferencia con el centro a medio camino del eje, un punto cada
     * quince grados: se entra por la raya de ida y se sale sobre el eje.
     *
     * **Y llega entera al suelo, que no llegaba.** La ruta pasa por el
     * quitatemblores y por el redondeo de codos, que están para las calles
     * dibujadas a mano en OpenStreetMap; a este arco le hacían lo contrario
     * de lo que prometen. Con el JAZ 90 en Lanzarote —radio de giro de 4,19
     * m— el quitatemblores lo dejaba en tres codos y el redondeo, con los
     * tramos tan cortos, les ponía 6,4 · 2,66 · 6,4 m de radio: **un giro más
     * cerrado de lo que ese avión puede dar**, pedido además a seis metros por
     * segundo, cuando con la rueda de morro a tope solo cierra ese radio a
     * menos de cinco. Así que el arco va marcado como geometría exacta —ver
     * `Ruta.exactaDesde`— y su radio sale de él. Ver `alisarRuta`.
     *
     * Es la maniobra de verdad en los campos sin paralela hasta la cabecera
     * —Encarnación, Concepción, La Palma—: rodar por la pista hasta el final
     * y dar la vuelta allí. El apartadero de viraje no siempre viene en los
     * datos de OpenStreetMap, así que la vuelta se da dentro del ancho de la
     * pista, que para el avión que cabe da de sobra: ver `cabeEn`.
     *
     * Aquí se ponía de ejemplo la 03 de Lanzarote, «desde la espera de la E4
     * y remontando», y era una lectura torcida del AIP: la espera de la 03
     * está en la E4 porque la E4 **es la cabecera**, a la que se llega por la
     * paralela R4-R5. Allí no se remonta nada. Ver `esperasPorInterseccion`.
     */
    const arco = puntos.length;
    for (let g = 90; g <= 270; g += 15) {
      const rad = (g * Math.PI) / 180;
      puntos.push(
        enLaPista(giro + radio * Math.cos(rad), radio + radio * Math.sin(rad)),
      );
    }
    // Y eje abajo, que es lo que dice hacia dónde se despega.
    puntos.push(enLaPista(Math.min(mitad - 60, giro + 620), 0));
    return { puntos, arco };
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
  private entradaEnPista(desde: Punto = this.ultimaPos): Ruta | null {
    const alEje = this.alEjeDesde(desde);
    if (!alEje) {
      this.giroDelBackTaxi = null;
      return null;
    }
    const { hastaElEje, ejeAbajo } = alEje;
    // Y la vuelta entera, si desde aquí no hay pista para despegar.
    const vuelta = this.backTaxiDesde(alEje.along, alEje.llegaDeFrente);
    const puntos: Punto[] = vuelta
      ? [...hastaElEje, ...vuelta.puntos]
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
      // Trazada a mano: lo que mide es lo que cuesta.
      coste: largo,
      letras: [],
      // Trazada a mano sobre la pista: no hay puntas que enganchar al grafo.
      enganche: 0,
      // Y la media vuelta, tal cual: ver `backTaxiDesde`.
      ...(vuelta ? { exactaDesde: hastaElEje.length + vuelta.arco } : {}),
    };
  }

  /**
   * **Del avión al eje de la pista**, por donde entra, y la raya que dice
   * hacia dónde se despega; sin el back-taxi, que lo pone `entradaEnPista`.
   * Suelto porque lo pregunta también quien elige por dónde salir: ver
   * `pistaParaRemontar`.
   */
  private alEjeDesde(desde: Punto): {
    hastaElEje: Punto[];
    along: number;
    ejeAbajo: Punto;
    /** Si se llega al eje mirando hacia donde se despega. */
    llegaDeFrente: boolean;
  } | null {
    const x = desde[0];
    const z = -desde[1];

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
     * pista por el césped.» El Pykasu despega en doscientos sesenta metros
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
     * desde que se cosieron las calles—, así que se le pregunta.
     *
     * **Y si no contesta, no se inventa.** Aquí caía a la recta de antes, «que
     * guía peor pero guía», y guiaba por la hierba: en Los Rodeos, desde la
     * doble raya de media pista, cincuenta metros de césped en diagonal hasta
     * el eje, con la verde ya dada: «en el círculo de espera para el permiso
     * me haces salir otra vez por ese jardín». La recta solo vale si va por
     * pavimento de punta a punta —el avión que ya está en la pista, o al
     * borde—; si no, no hay raya, y quien juega entra por donde ve el asfalto,
     * que es lo que haría cualquiera.
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
    /*
     * **Y el avión se engancha a la calle por donde está**, no a su nudo más
     * cercano, que era lo que se medía con un tope de cuarenta metros: en la doble
     * raya de media pista de Los Rodeos el nudo más cercano quedaba a noventa
     * metros, la cuenta decía «lejos de la calle» y caía a la recta. Ahora
     * el enganche es a la calle que pisa y su recta se mira: ver `enganches`
     * en `rodaje.ts`.
     */
    /*
     * **Y desde fuera de la pista, se entra por donde la calle llega a ella.**
     *
     * El sitio de entrar era la proyección del avión sobre el eje, y eso vale
     * cuando la calle llega de frente. Cuando llega en diagonal, la
     * proyección cae **entre** dos bocas: en la doble raya de la 02 de Silvio
     * Pettirossi salen dos ramales, uno hacia cada lado, y la raya entraba por
     * el que miraba a la pista, rodaba cuarenta metros por ella hacia atrás
     * hasta la proyección y ahí volvía a girar para despegar: dos medias
     * vueltas sobre la pista donde no hacía falta ninguna. Un piloto entra por
     * la boca y se alinea en ella. Ver `bocaDeEntrada`.
     */
    const boca = this.enLaPista(desde) ? null : this.bocaDeEntrada(desde);
    if (boca) {
      const { along: alongDeLaBoca } = enEjesDePista(
        boca.nudo[0],
        -boca.nudo[1],
        this.pista.x,
        this.pista.z,
        this.pista.heading,
      );
      const enLaBoca = Math.max(
        -mitad + 40,
        Math.min(alongDeLaBoca, mitad - paraDespegar),
      );
      const masAlla = puntoDePista(this.pista, -Math.min(mitad - 60, enLaBoca + 500));
      return {
        hastaElEje: [...boca.ruta.puntos],
        along: alongDeLaBoca,
        ejeAbajo: [masAlla[0], -masAlla[1]],
        llegaDeFrente: boca.deFrente,
      };
    }
    const porLaCalle = rodajeEntre(
      this.grafo,
      desde,
      enElEje,
      HASTA_EL_EJE,
      undefined,
      { desdeFuera: true, alEje: true },
    );
    const hastaElEje: Punto[] | null = porLaCalle
      ? [...porLaCalle.puntos]
      : rectaPorPavimento(this.grafo, desde, enElEje)
        ? [desde, enElEje]
        : null;
    if (!hastaElEje) return null;
    return { hastaElEje, along, ejeAbajo, llegaDeFrente: false };
  }

  /** Si un punto cae en la pista en uso, con el margen de `enElAsfalto`. */
  private enLaPista(p: Punto): boolean {
    return this.enElAsfalto(p);
  }

  /**
   * **Por qué boca se entra en la pista** desde un punto de fuera: el nudo del
   * eje al que se llega por las calles sin pisar la pista, con la ruta hasta
   * él. De los que hay, uno al que la calle llegue **mirando hacia donde se
   * va a rodar**: hacia donde se despega, que es entrar y alinearse, o hacia
   * la cabecera si desde ahí toca back-taxi. Si ninguno, el más cercano, y
   * ahí la raya da la media vuelta sobre la pista, como toca. `null` si no se
   * llega a ninguno sin pisar pista.
   */
  private bocaDeEntrada(
    desde: Punto,
  ): { nudo: Punto; ruta: Ruta; deFrente: boolean } | null {
    const [fx, fz] = delante(this.pista.heading);
    let mejor: {
      nudo: Punto;
      ruta: Ruta;
      deFrente: boolean;
      bien: boolean;
    } | null = null;
    /*
     * Los nudos **del eje**: las calles se cosen hasta él —ver «Coser las
     * calles a la pista» en `rodaje.ts`— y ahí es donde se entra. Un codo de
     * la calle junto al borde también cae «en la pista», y entrando por él la
     * raya de despegar salía del borde en diagonal hacia el eje: en La Gomera,
     * trescientos metros por el margen de la pista.
     *
     * **Y del eje es de un tramo de pista, no de cerca del eje del juego.** Se
     * medía la distancia a la raya que va de umbral a umbral, con ocho metros
     * de tolerancia, y el eje de OpenStreetMap no siempre cae ahí: en Ayolas
     * va a once metros. Allí no quedaba ninguna boca, la entrada caía a la
     * cuenta de emergencia —ir por la pista a un punto que deja cuatrocientos
     * metros delante— y la raya remontaba la pista, volvía a bajar trescientos
     * metros y la remontaba otra vez para el back-taxi. Lo que dice que un
     * nudo es del eje es que está en la pista dibujada.
     */
    const delEje = (i: number) =>
      (this.grafo.desde[i] ?? []).some((k) => this.grafo.tramos[k]!.pista);
    const bocas = this.grafo.nudos.filter(
      (nudo, i) =>
        this.enLaPista(nudo) &&
        delEje(i) &&
        Math.hypot(nudo[0] - desde[0], nudo[1] - desde[1]) <= HASTA_EL_EJE &&
        (this.grafo.desde[i] ?? []).some((k) => !this.grafo.tramos[k]!.pista),
    );
    const rutas = rodajesDesde(this.grafo, desde, bocas, HASTA_EL_EJE, undefined, {
      desdeFuera: true,
    });
    for (const [k, nudo] of bocas.entries()) {
      const ruta = rutas[k] ?? null;
      if (!ruta || ruta.puntos.length < 2) continue;
      // Por las calles y nada más: una boca a la que se llega rodando por la
      // pista no es una boca, es otra entrada más allá.
      if (ruta.coste > ruta.largo + 1) continue;
      const n = ruta.puntos.length;
      const a = ruta.puntos[Math.max(0, n - 4)]!;
      const b = ruta.puntos[n - 1]!;
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // Hacia delante en el fichero es (fx, −fz): la y es la z cambiada.
      const coseno = l < 1 ? 0 : ((b[0] - a[0]) * fx - (b[1] - a[1]) * fz) / l;
      const { along } = enEjesDePista(
        nudo[0],
        -nudo[1],
        this.pista.x,
        this.pista.z,
        this.pista.heading,
      );
      const haciaAtras = this.dondeSeDaLaVuelta(along) !== null;
      const bien = haciaAtras ? coseno < 0.2 : coseno > -0.2;
      if (
        !mejor ||
        (bien && !mejor.bien) ||
        (bien === mejor.bien && ruta.largo < mejor.ruta.largo)
      )
        mejor = { nudo, ruta, deFrente: coseno > 0.5, bien };
    }
    return mejor
      ? { nudo: mejor.nudo, ruta: mejor.ruta, deFrente: mejor.deFrente }
      : null;
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
  private salidaPorDelante(meta?: Punto): Punto | null {
    /*
     * Primero, solo entre las que salen hacia delante. Si no queda ninguna
     * —un campo pequeño con una única salida hacia atrás—, entre todas: es
     * mejor dar la vuelta que quedarse sin raya.
     */
    return (
      this.salidaPorDelanteQue(true, meta) ?? this.salidaPorDelanteQue(false, meta)
    );
  }

  private salidaPorDelanteQue(
    soloHaciaDelante: boolean,
    /** A dónde se va de verdad; sin ella, al puesto de salida. */
    meta?: Punto,
  ): Punto | null {
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
    // Ni girando ya hacia una calle: quien está saliendo, sale. Ver
    // `rodandoPorLaPista`.
    if (!this.rodandoPorLaPista()) return null;

    /*
     * **Y «por delante» es hacia donde mira el morro, no hacia donde mira la
     * pista en uso.**
     *
     * `this.pista` es la del viento, la que dice la torre, y para salir y
     * para entrar en final es la buena. Pero después de tocar tierra la
     * pregunta es otra —¿qué salida me queda delante?— y la contesta el
     * avión, no el parte. Se medía todo con el rumbo de la pista en uso, así
     * que quien aterrizaba por la otra punta —se puede: con el viento en
     * calma, o con permiso de la torre— tenía la salida elegida **a la
     * espalda**. En Fuerteventura, con la 01 en uso y la toma por la 19, la
     * raya nacía detrás del avión y se iba hacia la punta norte; el coche del
     * sígame esperaba en una boca que ya se había dejado atrás, y el
     * señalero en el puesto al que llevaba esa raya. Contado jugando: «no veo
     * ni coche ni línea ni señor esperando». Ver `aterrizar-por-la-otra.test.ts`.
     *
     * El sentido de la carrera sale del rumbo del avión respecto al eje, que
     * al tocar es la trayectoria y parado es el morro: las dos cosas que
     * decide quien pilota.
     */
    const sentido =
      Math.cos(this.ultimoRumbo - (this.pista.heading * Math.PI) / 180) >= 0
        ? 1
        : -1;
    const rumboDeLaCarrera =
      sentido > 0 ? this.pista.heading : (this.pista.heading + 180) % 360;

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
      const calles = (this.grafo.desde[i] ?? [])
        .map((t) => this.grafo.tramos[t]!)
        .filter((t) => !t.pista);
      if (!calles.length) continue;
      /*
       * **Y que salga hacia donde se va**, no hacia atrás. Ver
       * `GIRO_MAXIMO_DE_UNA_SALIDA`.
       */
      if (
        soloHaciaDelante &&
        !calles.some((t) => {
          const d = haciaDondeSale(t, nudo);
          return d !== null && saleHaciaDelante(d, rumboDeLaCarrera);
        })
      )
        continue;
      const adelante = (along - aqui.along) * sentido;
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
       * **Y a la que se llega frenando como se frena**, no a la que se tiene
       * delante: a cuarenta metros por segundo una boca a cien metros no es
       * una salida, es una que se va a pasar. Ver `FRENADA_PARA_SALIR`.
       */
      const v = this.ultimaVelocidad;
      const paraFrenar =
        Math.max(0, v * v - A_LA_SALIDA * A_LA_SALIDA) / (2 * FRENADA_PARA_SALIR);
      if (adelante < HUECO_PARA_GIRAR + paraFrenar) continue;
      /*
       * **Y la primera de esas, no la que deja más cerca de casa.**
       *
       * Aquí se cogía la que dejaba más corto el viaje entero —la pista que
       * queda hasta la boca más la calle hasta el puesto—, con un argumento
       * que sonaba a oficio: «rodar doscientos metros más de pista para
       * ahorrar un kilómetro de calle es lo que hace cualquiera que conozca el
       * campo». Y se pagaba en la moneda equivocada: un metro de pista valía
       * uno de calle, así que en Los Rodeos se rodaba un kilómetro por la pista
       * a paso de calle hasta la salida que caía frente a la plataforma, con la
       * paralela al lado. Eso es usar la pista de calle, que es justo lo que
       * no se hace: la pista se deja libre en cuanto se puede, por la primera
       * salida útil, y lo que quede se rueda por la paralela. «Es un
       * despropósito meter un avión en la pista principal cuando tiene una
       * paralela para eso.»
       */
      const casa = meta ?? this.puestoDeSalida()?.xy;
      const hasta = casa
        ? rodajeEntre(this.grafo, nudo, casa, 600, this.ocupadosAhora(false), {
            desdeLaCalle: true,
          })
        : null;
      /*
       * **Y una salida que no lleva a ningún puesto no es una salida.** Un
       * trozo de calle suelto —los hay en los datos, cosidos a la pista y a
       * nada más— costaba solo lo que queda de pista hasta él, o sea menos
       * que cualquier salida de verdad, y ganaba. La ruta de vuelta se caía
       * entonces a la directa desde el avión, que es justo lo que esto evita.
       */
      if (casa && !hasta) continue;
      /*
       * **Y una raqueta no es una salida hacia delante.** Hay nudos en la pista
       * con un trozo de calle que sale hacia donde se va —la raqueta del final,
       * un apartadero— y desde los que el camino a casa **vuelve por la
       * pista**. Pasaban por salidas hacia delante y ganaban a la de verdad,
       * que salía algo cruzada: la raya iba hasta el fondo, daba media vuelta
       * y deshacía cuatrocientos metros de pista hasta la calle que se había
       * pasado. Medido en La Palma, en Guaraní y en La Gomera. Volver por la
       * pista se hace —es el «backtrack» de los campos de una sola calle—,
       * pero solo cuando no hay otra: queda para la pasada de «todas».
       */
      if (soloHaciaDelante && hasta && this.vuelvePorLaPista(hasta, along, sentido))
        continue;
      /*
       * **Ni una salida rápida tomada al revés.** Las de Los Rodeos salen de
       * la pista en diagonal hacia la 30; aterrizando por la 12, la boca mira
       * hacia delante los primeros metros y enseguida vuelve hacia atrás en
       * un codo de ciento cincuenta grados. Eso es entrar en una salida por su
       * punta de salida, y solo se hace si no hay otra: queda para la pasada
       * de «todas», como la raqueta. Se mira hacia dónde va la calle pasada su
       * boca, entre los cuarenta metros y el final de la salida.
       *
       * **Y el final de la salida es donde deja la pista**, no doscientos
       * cincuenta metros de camino. Contando por metros se metía en la cuenta
       * la paralela, y la paralela va hacia casa, que muchas veces queda
       * detrás: en Lanzarote, aterrizando por la 21, la salida recta de media
       * pista contaba como tomada al revés porque a la paralela se gira
       * hacia atrás, y el avión rodaba mil doscientos metros de pista hasta
       * la R5 para volver después por la paralela.
       */
      if (soloHaciaDelante && hasta) {
        const boca = hastaLosMetros(hasta.puntos, PRIMER_TRAMO_DE_CALLE);
        const tramo = this.hastaDejarLaPista(hastaLosMetros(hasta.puntos, BOCA_DE_LA_SALIDA));
        const a = boca[boca.length - 1]!;
        const b = tramo[tramo.length - 1]!;
        const d: [number, number] = [b[0] - a[0], b[1] - a[1]];
        const l = Math.hypot(d[0], d[1]);
        if (l > PRIMER_TRAMO_DE_CALLE && !saleHaciaDelante([d[0] / l, d[1] / l], rumboDeLaCarrera))
          continue;
      }
      /*
       * Y una salida por la que se va a pasar junto a un avión parado —el
       * que espera en su doble raya para entrar en la pista, casi siempre en
       * esa misma calle— cuesta como si fuera larga: se coge otra si la hay.
       */
      const coste = adelante + (hasta?.ocupada ? SALIDA_OCUPADA : 0);
      if (coste < cerca) {
        cerca = coste;
        mejor = nudo;
      }
    }
    return mejor;
  }

  /**
   * Una ruta hasta su primer punto bien fuera de la pista en uso —a
   * `FUERA_DE_LA_PISTA` del borde, donde se pinta la doble raya—, ese
   * incluido; entera si no sale.
   */
  private hastaDejarLaPista(puntos: readonly Punto[]): Punto[] {
    const fuera = this.pista.width / 2 + FUERA_DE_LA_PISTA;
    const o: Punto[] = [];
    for (const p of puntos) {
      o.push(p);
      const { across } = enEjesDePista(p[0], -p[1], this.pista.x, this.pista.z, this.pista.heading);
      if (Math.abs(across) >= fuera) break;
    }
    return o;
  }

  /**
   * Si una ruta que sale de la pista en `along` vuelve a rodar por la pista
   * hacia atrás: algún punto suyo sobre el asfalto, más de un ancho de pista
   * por detrás de la boca en el sentido de la carrera.
   */
  private vuelvePorLaPista(ruta: Ruta, along: number, sentido: number): boolean {
    const { x, z, heading, width } = this.pista;
    return ruta.puntos.some((q) => {
      const e = enEjesDePista(q[0], -q[1], x, z, heading);
      return (
        Math.abs(e.across) < width / 2 && (e.along - along) * sentido < -width
      );
    });
  }

  /**
   * **Volver por la pista**: la ruta de vuelta cuando ya no queda ninguna
   * salida por delante, que en un campo de una sola calle es casi siempre.
   *
   * Es el «backtrack» de la radio, y en Ayolas y en Pilar es la manera de
   * operar: Ayolas tiene su única calle en la punta sur, al lado del umbral
   * 02, así que quien aterriza por la 02 la deja atrás antes de tocar; Pilar
   * la tiene a 390 m del umbral 02 y el turbohélice se para más lejos. Se
   * sigue por el eje, se da media vuelta **en la pista**, se vuelve por ella
   * hasta la calle y de ahí al puesto.
   *
   * Antes de esto la ruta se trazaba desde el avión por el camino más corto,
   * que empieza **detrás** del morro: la raya nacía a la espalda y fuera de la
   * pantalla —el banco de llegadas lo midió, cero de cinco fotogramas con la
   * raya a la vista en Ayolas—, y quien daba la vuelta a su aire la daba
   * ancha: en la pista de dieciocho metros de Pilar, el banco del vuelo entero
   * se salió al pasto, volvió a la pista y se llevó por delante el coche del
   * sígame.
   *
   * **La media vuelta, con las ruedas en el asfalto.** Un semicírculo hacia el
   * lado contrario de la plataforma —así la vuelta llega a la calle cruzando
   * la pista, no dándose otra media vuelta—, con el radio de giro de este
   * avión o el de la raya de un avión chico, lo que sea más, y nunca más
   * ancho que media pista menos dos metros de borde. Si ni así cabe, no se
   * dibuja y queda lo de antes. Va marcada como geometría exacta, igual que
   * la del back-taxi: ver `alisarRuta`.
   *
   * **Dónde se da.** Donde se pueda frenar hasta el paso de una media vuelta
   * con una frenada de rodaje tranquila, más el hueco para girar: parado,
   * veinticinco metros y el radio; a quince metros por segundo, unos ciento
   * cuarenta; recién tocado, al final de la pista. Y nunca más allá. La ruta
   * se traza al tocar y se rehace una vez al abandonar —ver `trazadaAlTocar`—,
   * así que es la segunda la que manda; la primera solo tiene que no quedarse
   * por detrás del avión mientras frena, que es lo que pasaba con un tope de
   * ciento cincuenta metros: el avión se pasaba la media vuelta y la raya lo
   * mandaba a volver antes de tiempo.
   */
  private vueltaPorLaPista(meta: Punto): Ruta | null {
    const { x: cx, z: cz, heading, width } = this.pista;
    const aqui = enEjesDePista(
      this.ultimaPos[0],
      -this.ultimaPos[1],
      cx,
      cz,
      heading,
    );
    if (Math.abs(aqui.across) > width / 2) return null;
    if (!this.rodandoPorLaPista()) return null;
    const radioDelAvion = radioDeGiro(this.avion);
    const radio = Math.min(
      Math.max(radioDelAvion, RADIO_CURVA / 2),
      (width / 2 - BORDE_DE_LA_VUELTA) / 2,
    );
    if (radio < radioDelAvion) return null;

    // Hacia dónde rueda el avión, a lo largo del eje. Ver `salidaPorDelanteQue`.
    const sentido =
      Math.cos(this.ultimoRumbo - (heading * Math.PI) / 180) >= 0 ? 1 : -1;
    const va = aqui.along * sentido;
    const tope = this.largoDePista / 2 - radio - FIN_PARA_LA_VUELTA;
    const frenar =
      (this.ultimaVelocidad * this.ultimaVelocidad) / (2 * FRENADA_DE_RODAJE);
    const adelante = HUECO_PARA_GIRAR + radio + frenar;
    const giro = Math.min(va + adelante, tope);
    if (giro < va) return null;

    /*
     * La salida: **la primera por detrás del giro**, que es la que deja antes
     * la pista libre. Se cogía la que dejaba más corto el camino a casa, y eso
     * podía ser remontar la pista pasando de largo otras bocas para ahorrarse
     * calle. Ver «la primera de esas» en `salidaPorDelanteQue`.
     */
    let salida: Punto | null = null;
    let hasta: Ruta | null = null;
    let mejor = Infinity;
    this.grafo.nudos.forEach((nudo, i) => {
      const e = enEjesDePista(nudo[0], -nudo[1], cx, cz, heading);
      if (Math.abs(e.across) > width / 2) return;
      const calles = (this.grafo.desde[i] ?? []).filter(
        (t) => !this.grafo.tramos[t]!.pista,
      );
      if (!calles.length) return;
      const atras = giro - e.along * sentido;
      if (atras < HUECO_PARA_GIRAR) return;
      const ruta = rodajeEntre(this.grafo, nudo, meta, 600, this.ocupadosAhora(false), {
        desdeLaCalle: true,
      });
      if (!ruta) return;
      const coste = atras + (ruta.ocupada ? SALIDA_OCUPADA : 0);
      if (coste < mejor) {
        mejor = coste;
        salida = nudo;
        hasta = ruta;
      }
    });
    if (!salida || !hasta) return null;
    const boca: Punto = salida;
    const desdeLaBoca: Ruta = hasta;

    /*
     * Hacia el lado contrario de la plataforma: lo dice el puesto, que está en
     * ella. Y en coordenadas de la pista —a lo largo y de través, como las da
     * `enEjesDePista`— pasadas a las del fichero.
     */
    const casa = enEjesDePista(meta[0], -meta[1], cx, cz, heading);
    const lado = casa.across >= 0 ? -1 : 1;
    const [fx, fz] = delante(heading);
    const [tx, tz] = traves(heading);
    const enLaPista = (along: number, across: number): Punto => [
      cx + fx * along + tx * across,
      -(cz + fz * along + tz * across),
    ];
    const bocaEnEjes = enEjesDePista(boca[0], -boca[1], cx, cz, heading);

    const puntos: Punto[] = [this.ultimaPos, enLaPista(aqui.along, 0)];
    const exactaDesde = puntos.length;
    for (let g = -90; g <= 90; g += 15) {
      const f = (g * Math.PI) / 180;
      puntos.push(
        enLaPista(
          sentido * (giro + radio * Math.cos(f)),
          lado * radio * (1 + Math.sin(f)),
        ),
      );
    }
    const exactaHasta = puntos.length - 1;
    puntos.push(enLaPista(bocaEnEjes.along, 2 * lado * radio), boca);
    puntos.push(...desdeLaBoca.puntos);

    let largo = 0;
    for (let i = 1; i < puntos.length; i++) {
      largo += Math.hypot(
        puntos[i]![0] - puntos[i - 1]![0],
        puntos[i]![1] - puntos[i - 1]![1],
      );
    }
    return {
      ...desdeLaBoca,
      tramos: [{ ref: null, puntos: puntos.slice(0, exactaHasta + 3) }, ...desdeLaBoca.tramos],
      puntos,
      largo,
      coste: largo,
      exactaDesde,
      exactaHasta,
    };
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
      // Trazada a mano: lo que mide es lo que cuesta.
      coste: largo,
      letras: [],
      // Trazada a mano sobre la pista: no hay puntas que enganchar al grafo.
      enganche: 0,
    };
  }

  /**
   * **Si el avión rueda a lo largo de la pista**, y no cruzado: con el morro a
   * menos de cuarenta y cinco grados del eje, en un sentido o en el otro.
   *
   * Quien ya está girando hacia una calle no tiene «salida por delante» ni
   * vuelta que dar: está saliendo. Preguntándoselo igual, con el morro de
   * lado, el sentido de la carrera salía a cara o cruz y la raya nueva podía
   * mandarle a remontar la pista hasta una boca que ya había dejado atrás.
   */
  private rodandoPorLaPista(): boolean {
    const alEje = Math.cos(this.ultimoRumbo - (this.pista.heading * Math.PI) / 180);
    if (Math.abs(alEje) < Math.SQRT1_2) return false;
    /*
     * **Y rodando por la pista, no por la boca de una salida.** Las salidas
     * rápidas se separan del eje en un ángulo de quince grados y tardan cien
     * metros en dejar el asfalto de la pista: con el morro casi alineado, el
     * avión ya va por su calle. En Gran Canaria, recalculando ahí, la raya lo
     * devolvía al eje para mandarlo a la salida siguiente. Lo que manda es
     * por qué camino va: el más cercano de todos.
     */
    let pista = Infinity;
    let calle = Infinity;
    for (const t of this.grafo.tramos) {
      const d = aLaPolilinea(this.ultimaPos, t.puntos as Punto[]);
      if (t.pista) pista = Math.min(pista, d);
      else calle = Math.min(calle, d);
    }
    return pista <= calle;
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

  /** Dónde toca girar en el back-taxi, para los bancos. Ver `sondas.ts`. */
  get dondeSeGira(): number | null {
    return this.giroDelBackTaxi;
  }

  /**
   * La puerta asignada **en firme** a esta llegada, si ya la hay.
   *
   * Existe para poder comprobar desde fuera **que no cambia**, que es la regla
   * que se rompía. Y es la firme y no la provisional a propósito: la
   * provisional se elige con el avión todavía en el aire y se sustituye una
   * vez, a posta, al dejar la pista. Lo que no puede cambiar es la de después.
   * Ver `puestoDeLlegada` y `puestoEnFirme`.
   */
  get puertaAsignada(): Punto | null {
    return this.puerta.enFirme?.xy ?? null;
  }

  /** A dónde va ahora mismo. Sirve para no recalcular la misma ruta cada fase. */
  private destino: "espera" | "puesto" | "pista" | null = null;

  /**
   * La puerta de esta llegada. Una llegada, una puerta.
   *
   * La regla vive en su propio módulo porque **así se puede probar sin
   * volar**: ver `puerta-asignada.ts`, que cuenta lo que pasaba y por qué el
   * banco no bastaba para comprobarlo.
   */
  private readonly puerta = new PuertaAsignada<{
    ref: string | null;
    xy: Punto;
  }>();

  /**
   * La fase del fotograma anterior, para distinguir **entrar** en una fase de
   * **estar** en ella.
   *
   * Sin esto, el «al dejar la pista se vuelve a trazar» de abajo se ejecutaba
   * los cientos de fotogramas que dura abandonar la pista, no una vez.
   */
  private faseAnterior: Fase | null = null;
  /**
   * Si la ruta de vuelta todavía es la que se trazó al tocar, con el avión
   * en el aire. Es la única que se rehace al dejar la pista; ver
   * `alCambiarDeFase`.
   */
  private trazadaAlTocar = false;
  /** Segundos desde el último trazado. Ver `rehacerSiHaceFalta`. */
  private desdeElUltimoTrazado = 0;

  private ultimaPos: Punto = [0, 0];
  /**
   * Hacia dónde miraba el avión en el último paso, en radianes. Es lo que
   * dice qué queda «por delante» al salir de la pista. Ver `salidaPorDelanteQue`.
   */
  private ultimoRumbo = 0;
  /** Y su velocidad sobre el suelo, m/s. Ver `vueltaPorLaPista`. */
  private ultimaVelocidad = 0;

  private situacion(
    estado: FlightState,
    sobreElSuelo: number,
    motor: boolean,
  ): Situacion {
    const x = estado.position.x;
    const z = estado.position.z;
    this.ultimaPos = [x, -z];
    this.ultimoRumbo = estado.heading;
    this.ultimaVelocidad = estado.groundSpeed ?? 0;

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
     * ruta y se baja al acabar la media vuelta. Ver `backTaxiDesde`.
     *
     * **Al acabarla, no al empezarla.** Se bajaba veinticinco metros antes del
     * sitio de girar, así que la media vuelta entera se daba en «alineando»:
     * una fase de pista en la que el tope de rodaje no actúa —ver
     * `tope-de-rodaje.ts`— y en la que el banco dejaba la raya y apuntaba al
     * rumbo de despegue sin frenar. Con el JAZ 90 en Lanzarote eso era dar la
     * vuelta a diez metros por segundo, con un radio de más de dieciséis, en
     * una pista de cuarenta y cinco: no cabía. La vuelta es parte del
     * back-taxi —«andá hasta el fondo y dá la vuelta»— y se acaba cuando el
     * morro ya mira hacia donde se despega. Y si el avión se sale por la
     * punta, también se acaba: ahí ya no hay back-taxi que seguir.
     */
    const rumbo = ((estado.heading * 180) / Math.PI + 360) % 360;
    let desalineado = rumbo - this.pista.heading;
    while (desalineado > 180) desalineado -= 360;
    while (desalineado < -180) desalineado += 360;

    if (
      this.giroDelBackTaxi !== null &&
      ((along <= this.giroDelBackTaxi + HUECO_PARA_GIRAR &&
        Math.abs(desalineado) < YA_DIO_LA_VUELTA) ||
        along < -this.largoDePista / 2 - 3)
    )
      this.giroDelBackTaxi = null;

    return {
      estado,
      alaRuta,
      restante,
      alEjeDePista,
      alLargoDePista: along,
      /*
       * **Y estar en la pista es estar dentro del rectángulo, no del pasillo.**
       *
       * Esto miraba solo la distancia al eje, y un eje es una recta infinita:
       * cualquier punto alineado con la pista contaba como estar en ella,
       * estuviera a un kilómetro por delante del umbral o rodando por la
       * plataforma. En casi todos los campos no se notaba porque la
       * plataforma cae a un lado; en El Hierro y en Fuerteventura la calle de
       * salida sale por la prolongación del eje, y allí el juego decía que el
       * avión se había metido en la pista **sin haber salido de la
       * plataforma**: percance «entraste en la pista sin la luz verde» a los
       * veinte segundos de arrancar, sin haber pisado asfalto.
       *
       * Una pista es un rectángulo. Se mira a lo ancho y también a lo largo.
       */
      enPista:
        alEjeDePista < this.pista.width / 2 + 3 &&
        Math.abs(along) < this.pista.length / 2 + 3,
      backTaxi: this.giroDelBackTaxi !== null,
      pistaRestante: Math.max(0, this.pista.length / 2 - along),
      pistaQueNecesita: pistaQueNecesita(this.avion),
      /*
       * Por encima de esto el avión vuela, esté a la altura que esté. Ver
       * «Rozar el monte no es llegar» en `vuelo.ts`.
       *
       * **En verdadera**, que es la que se le compara: la pérdida es de
       * indicada, y en un campo alto o en una tarde de calor la misma
       * indicada es más velocidad real. Comparando la verdadera con la
       * indicada, el avión seguía «volando» un rato después de tocar.
       */
      perdida: trueFromIndicated(
        velocidadDePerdida(this.avion),
        estado.position.y,
        this.aire,
      ),
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
      /*
       * **Y una media vuelta no es una curva.** El suelo de seis metros por
       * segundo está para que un codo de calle no parezca una parada, y en la
       * media vuelta del back-taxi pedía justo lo que el avión no puede: con
       * la rueda de morro a tope, el JAZ 90 cierra su radio de 4,19 m a
       * menos de cinco metros por segundo —ver `DE_LADO_RODANDO` en `fdm.ts`—
       * y a seis se abre y se sale de la raya. Una media vuelta en pista se da
       * a paso de persona, que es lo que sale de la cuenta sin el suelo: tres
       * metros por segundo largos con ese radio.
       */
      const enCurva = Math.min(CRUCERO, Math.sqrt(LATERAL * r));
      this.velocidades[i] = this.exactos[i]
        ? enCurva
        : Math.max(MINIMO_EN_CURVA, enCurva);
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
    return Math.min(
      this.velocidades[i - 1]! + (this.velocidades[i]! - this.velocidades[i - 1]!) * t,
      this.hastaElDeDelante(),
    );
  }

  /**
   * **Y en la cola, detrás del de delante.**
   *
   * La raya de salida ya no rodea a los que van a despegar —ver `enCola`—, así
   * que pasa por donde están ellos: por la misma calle, hasta la misma doble
   * raya. Lo que se hace ahí es lo de cualquier cola: acercarse y pararse
   * detrás, a `HUECO_EN_LA_COLA`, y seguir cuando el de delante se mueve. Esto
   * da la velocidad a la que se puede ir para pararse a tiempo, frenando como
   * se frena rodando; sin nadie en la raya, sin límite.
   *
   * Solo yendo hacia la pista: volviendo, los que van a salir vienen de
   * frente y la raya los rodea.
   */
  private hastaElDeDelante(): number {
    this.detrasDe = null;
    if (this.destino !== "espera") return Infinity;
    const ruta = this.rutaMundo;
    const cola = this.colaQueHay().filter(
      (q) => !this.hartos.some((h) => Math.hypot(q[0] - h[0], q[1] - h[1]) < YA_NO_SE_LE_ESPERA),
    );
    if (ruta.length < 2 || !cola.length) return Infinity;
    // Se tocan si sus ejes pasan a menos de las dos semialas.
    const seTocan = this.avion.wingSpan / 2 + SEMIALA_DEL_TRAFICO;
    let primero = Infinity;
    let quien: Punto | null = null;
    for (const [fx, fy] of cola) {
      // De fichero a mundo: la y del fichero es la z cambiada de signo.
      const x = fx;
      const z = -fy;
      /*
       * Dónde lo pasa la raya: lo más cerca de él en la primera pasada a
       * menos de `seTocan`, no el primer trozo que entra en ese radio, que
       * en un codo es el final del tramo de antes y dejaba la cola veinte
       * metros más atrás de lo que toca.
       */
      let recorrido = 0;
      let cerca = Infinity;
      let aqui = Infinity;
      for (let i = 0; i < ruta.length - 1; i++) {
        const [ax, az] = ruta[i]!;
        const [bx, bz] = ruta[i + 1]!;
        const dx = bx - ax;
        const dz = bz - az;
        const l = Math.hypot(dx, dz);
        if (l < 1e-6) continue;
        const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (l * l)));
        const donde = recorrido + u * l;
        recorrido += l;
        const d = Math.hypot(x - (ax + dx * u), z - (az + dz * u));
        if (donde > this.avance && d < seTocan) {
          if (d < cerca) {
            cerca = d;
            aqui = donde;
          }
        } else if (Number.isFinite(aqui)) break;
      }
      if (aqui < primero) {
        primero = aqui;
        quien = [fx, fy];
      }
    }
    if (!Number.isFinite(primero)) return Infinity;
    this.detrasDe = quien;
    const hueco = primero - this.avance - seTocan - HUECO_EN_LA_COLA;
    return Math.sqrt(2 * FRENADA_DE_RODAJE * Math.max(0, hueco));
  }

  /**
   * **La red de la cola que no avanza**: parado detrás del mismo más de
   * `PACIENCIA_EN_LA_COLA`, se deja de esperarle y se traza por otro sitio,
   * rodeándole como a cualquier parado. Si no hay por dónde, la raya pasa
   * junto a él y ya no se para: esperar para siempre es peor.
   */
  private paciencia(fase: Fase, porElSuelo: number, sugerida: number, dt: number): void {
    const parado = this.detrasDe && sugerida < 0.5 && Math.abs(porElSuelo) < 0.5;
    this.esperandoDetras = parado ? this.esperandoDetras + dt : 0;
    if (!this.detrasDe || this.esperandoDetras < PACIENCIA_EN_LA_COLA) return;
    this.hartos.push(this.detrasDe);
    this.esperandoDetras = 0;
    this.trazarDesdeAqui(fase);
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
    this.alRamalDeAhora = donde.aLaRaya;
    return donde.restante;
  }

  /**
   * Cuánto se está del **tramo que toca**, y no del más cercano de todos.
   *
   * Son dos cosas distintas y una de ellas no vale para medir la ayuda de
   * dirección. `alaRuta` mide la distancia al punto más próximo de **toda** la
   * polilínea, que para saber si estás sobre asfalto está bien: en un
   * aeropuerto la ruta se cruza consigo misma, y estar encima de otro ramal es
   * estar en una calle igual.
   *
   * Para juzgar si la ayuda te lleva por la raya, no. El avión rodando recto
   * sin tocar nada daba «0 m · 20 m · 0 m · 21 m» a lo largo de trescientos
   * metros, y eso no es un avión que se aparta y vuelve —no tiene con qué
   * volver, nadie está girando—: es la cuenta enganchándose a un ramal
   * distinto cada vez que pasa cerca de uno. Cuatro peldaños con ayudas muy
   * distintas daban el mismo número por eso.
   *
   * Esto es lo que dice `avanzarEnRuta` una vez enganchado el tramo por el que
   * se va, con su ventana de no retroceder. Ver `scripts/verificar-asistencia`.
   */
  alRamalDeAhora = 0;

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
    // La pone `ponerLaVuelta` después, si esta ruta deja la pista por una.
    this.salidaDeLaRuta = null;
    // Ruta nueva, cuenta nueva: el avance que se llevaba era de otro camino.
    this.avance = 0;
    this.dondeEstaba = null;
    const crudos = ruta ? ruta.puntos.map((p) => [p[0], -p[1]] as Punto) : [];
    const { puntos, radios, exactos } = alisarRuta(
      crudos,
      ruta?.exactaDesde,
      // Nunca más cerrada que la curva de calle: la raya de un avión chico
      // también tiene que leerse como una vuelta y no como un punto.
      Math.max(RADIO_CURVA / 2, radioDeGiro(this.avion)),
      ruta?.exactaHasta,
    );
    this.rutaMundo = puntos;
    this.radios = radios;
    this.exactos = exactos;
    this.calcularVelocidades();
    this.pintar();
  }

  /** Las luces de la raya de ahora, o `null` si no hay raya. */
  private luces: LucesDeLaRaya | null = null;

  /** Con qué avance se encendieron por última vez. Ver `encender`. */
  private encendidasHasta = NaN;

  /**
   * Las luces de la raya: una bombilla en el suelo cada siete metros y medio,
   * y su brillo en pantalla encima.
   *
   * **Van dos cosas por luz, y hacen falta las dos.** La bombilla es un disco
   * de un metro pegado al asfalto: de cerca es lo que se ve, con su centro
   * más blanco que el borde como cualquier luz encendida. Pero un disco en el
   * suelo visto de lejos y rasante es una raya de un píxel, y desde la cabina
   * de un teléfono la ruta se perdía a los cien metros. El brillo es un punto
   * de tamaño fijo en pantalla —como las luces de rodadura del aeropuerto—
   * y es lo que hace que la fila se lea entera hasta la curva.
   *
   * Todo va en dos llamadas de dibujo, con el color en los vértices: encender
   * y apagar es cambiar un número por vértice, no rehacer nada.
   */
  private ponerLuces(
    colorDe: (v: number) => readonly [number, number, number],
    raya: BufferGeometry,
  ): LucesDeLaRaya | null {
    const ruta = this.rutaMundo;
    const acumulado = new Float32Array(ruta.length);
    for (let i = 1; i < ruta.length; i++) {
      acumulado[i] =
        acumulado[i - 1]! +
        Math.hypot(
          ruta[i]![0] - ruta[i - 1]![0],
          ruta[i]![1] - ruta[i - 1]![1],
        );
    }
    // `jalonar` reparte por longitud recorrida, así que la luz k cae a k·paso
    // metros del principio: no hace falta medirlo otra vez.
    const sitios = jalonar(ruta, SEPARACION_DE_LUCES);
    if (!sitios.length) return null;
    const n = sitios.length;
    const s = new Float32Array(n);
    const LADOS = 8;
    const porLuz = LADOS + 1;
    const pos = new Float32Array(n * porLuz * 3);
    const col = new Float32Array(n * porLuz * 4);
    const brillo = new Float32Array(n * 3);
    const brilloCol = new Float32Array(n * 4);
    const indices: number[] = [];
    let tramo = 0;
    sitios.forEach((p, k) => {
      s[k] = k * SEPARACION_DE_LUCES;
      while (tramo < ruta.length - 2 && acumulado[tramo + 1]! < s[k]!) tramo++;
      const c = colorDe(this.velocidades[tramo] ?? CRUCERO);
      const y = this.cota(p.x, p.y) + ALTURA + 0.02;
      const base = k * porLuz;
      // El centro, casi blanco: es lo que dice «esto está encendido».
      pos.set([p.x, y, p.y], base * 3);
      col.set(
        [
          c[0] + (1 - c[0]) * 0.35,
          c[1] + (1 - c[1]) * 0.35,
          c[2] + (1 - c[2]) * 0.35,
          1,
        ],
        base * 4,
      );
      for (let j = 0; j < LADOS; j++) {
        const a = (j / LADOS) * Math.PI * 2;
        const v = base + 1 + j;
        pos.set(
          [p.x + Math.cos(a) * RADIO_DE_LUZ, y, p.y + Math.sin(a) * RADIO_DE_LUZ],
          v * 3,
        );
        col.set([c[0], c[1], c[2], 1], v * 4);
        indices.push(base, base + 1 + ((j + 1) % LADOS), v);
      }
      brillo.set([p.x, y + 0.2, p.y], k * 3);
      brilloCol.set([c[0], c[1], c[2], 1], k * 4);
    });

    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    const bombillas = new Float32BufferAttribute(col, 4);
    geo.setAttribute("color", bombillas);
    geo.setIndex(indices);
    const discos = new Mesh(
      geo,
      new MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5,
      }),
    );
    discos.name = "ruta-luces";
    this.grupo.add(discos);

    const geoBrillo = new BufferGeometry();
    geoBrillo.setAttribute("position", new Float32BufferAttribute(brillo, 3));
    const brillos = new Float32BufferAttribute(brilloCol, 4);
    geoBrillo.setAttribute("color", brillos);
    const puntos = new Points(
      geoBrillo,
      new PointsMaterial({
        size: LUZ_EN_PANTALLA,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        // Redondos y con halo, como las de rodadura: un punto sin dibujo es
        // un cuadrado.
        map: laRedonda(),
      }),
    );
    puntos.name = "ruta-brillos";
    this.grupo.add(puntos);

    return { s, bombillas, brillos, acumulado, raya };
  }

  /**
   * **Se encienden por delante y se apagan por detrás**, como las de verdad.
   *
   * Y la raya se recorta igual: el trozo que ya se pisó no guía a nadie y es
   * lo único que queda entre la cámara de persecución y el avión, tapando el
   * asfalto justo donde se mira.
   *
   * Solo trabaja cuando el avión se ha movido medio metro: parado no cambia
   * nada, y son unos cientos de números por vez.
   */
  private encender(): void {
    const luces = this.luces;
    if (!luces) return;
    const avance = this.avance;
    if (Math.abs(avance - this.encendidasHasta) < 0.5) return;
    this.encendidasHasta = avance;
    const { s, bombillas, brillos } = luces;
    const porLuz = bombillas.count / s.length;
    for (let k = 0; k < s.length; k++) {
      const d = s[k]! - avance;
      const alfa =
        d < -3
          ? 0
          : d <= ENCENDIDO_POR_DELANTE
            ? 1
            : Math.max(TENUES, 1 - ((d - ENCENDIDO_POR_DELANTE) / 150) * (1 - TENUES));
      for (let j = 0; j < porLuz; j++) bombillas.setW(k * porLuz + j, alfa);
      brillos.setW(k, alfa);
    }
    bombillas.needsUpdate = true;
    brillos.needsUpdate = true;

    // La raya, desde el tramo en el que se está: seis índices por tramo.
    let i = 0;
    const { acumulado, raya } = luces;
    while (i < acumulado.length - 2 && acumulado[i + 1]! < avance - 3) i++;
    raya.setDrawRange(i * 6, Infinity);
  }

  /** Dibuja la ruta en el suelo, y una diana donde termina. */
  private pintar(): void {
    for (const hijo of [...this.grupo.children]) {
      this.grupo.remove(hijo);
      const m = hijo as Mesh;
      m.geometry?.dispose();
      (m.material as { dispose?: () => void })?.dispose?.();
    }
    this.luces = null;
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
    /*
     * **Sin sombrear**, como una luz: la raya se ve igual con el sol de cara
     * que de noche, y un material que se oscurece al atardecer justo cuando
     * se encienden las luces del aeropuerto es una guía que se apaga cuando
     * más falta hace.
     */
    const malla = new Mesh(
      geo,
      new MeshBasicMaterial({
        vertexColors: true,
        // Y un poco translúcida: la raya va encima del eje amarillo pintado
        // de la calle, y ése también se tiene que ver debajo.
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
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

    this.luces = this.ponerLuces(colorDe, geo);
    this.encendidasHasta = NaN;
    this.encender();

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
