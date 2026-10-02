/**
 * El cuadro de mandos entero, de una pieza.
 *
 * Esto es lo que arregla el «esto no está centrado ni aunque venga Cristo y me
 * lo diga», y lo arregla de raíz: **el cuadro es un solo dibujo con su caja de
 * mil doscientos ochenta por quinientos cuarenta, y esa caja se escala
 * entera**. Antes eran cajas de HTML que cada avión colocaba como podía, y con
 * seis aviones de anchos distintos el resultado era inevitable. Ahora no hay
 * forma de descentrarlo: el centro de la caja es el centro de la pantalla, y
 * dentro de la caja el reparto lo decide `familia.ts` con margen duro de
 * veinte píxeles a cada lado.
 *
 * Y con el anclaje resuelto, lo otro que se pidió: «que cada aeronave parezca
 * lo que es, que un 747 no parezca un juguete, que contenga información, que
 * sea una información viva». De ahí las tres familias —esferas, cristal de dos
 * pantallas y cabina de línea— y de ahí que lo que se mueve se mueva **como**
 * se mueve el instrumento de verdad: las cintas se desplazan, los dígitos
 * ruedan, los bugs viajan, y la aguja de un reactor tarda tres segundos en
 * despertar mientras la de un pistón obedece al momento.
 *
 * Lo que **no** cambia entre familias es dónde está cada cosa: velocidad a la
 * izquierda, actitud en el medio, altitud a la derecha, rumbo abajo. En una
 * avioneta son seis esferas y en un Boeing son seis regiones de una pantalla,
 * y ese parecido es el hallazgo que se lleva quien aprende aquí.
 */

import type { AircraftConfig } from "../flight/aircraft";
import type { FlightState } from "../flight/model";
import { SixPack } from "./six-pack";
import {
  anguloEn,
  cifraDeMotor,
  cuadroDe,
  enLaEscala,
  flapsEnLaEscala,
  PIES,
  valorDeMotor,
  type Cuadro,
} from "./cuadro";
import { enLaMuesca } from "../flight/flaps";
import { temperaturaExterior, type Aire } from "../flight/atmosphere";
import { altitudDeCabina } from "../flight/cabina-presurizada";
import { AVISO_DE_CABINA } from "../flight/despresurizacion";
import {
  ALTO_DEL_CUADRO,
  ANCHO_DEL_CUADRO,
  BANDA,
  VISERA,
  cajaDe,
  familiaDe,
  patasDe,
  type Familia,
  MARCA_CON_SU_APARATO,
  MARCA_ROTULO,
} from "./familia";
import { CUANTOS_FIJOS, CUANTOS_OTROS } from "./cristal";
import { dibujarLaCarta, type Mapa } from "./carta";
import { retratoDe, TAMANO_DE_RETRATO } from "./retratos";
import { decima as n1, escribir, poner } from "./si-cambia";

/** Un punto de la carta, en píxeles desde el centro de la rosa. */
type Punto2 = { dx: number; dy: number };
import {
  POR_GRADO,
  POR_NUDO,
  columnaDeMotor,
  franjaDeMotor,
  hayQueMoverElTrozo,
  marcasDeAltitud,
  lucesDeTren,
  pantallaDeActitud,
  pantallaDeMotores,
  pantallaDeNavegacion,
  tamborDeAltitud,
} from "./cristal";
import { luzDeTren } from "../flight/tren";
import { bienPuesta } from "../flight/altimetro";
import { matriculaDe } from "../flight/matricula";
import { anillosDe } from "../flight/tormentas";
import { t, type TranslationKey } from "../i18n";
import {
  encendidas,
  LUCES,
  type Estado as EstadoDeAvisos,
} from "../flight/avisos-de-cabina";
import { dibujoEn, type DibujoDeSenal } from "./senal";
import type { Alerta } from "../flight/altitud-seleccionada";
import {
  QUIETA_LA_ALTITUD,
  QUIETA_LA_VELOCIDAD,
  TARDA_EL_MOTOR,
  conRetardo,
  deslizaBug,
  parpadeo,
  precesion,
  tendencia,
} from "./cinta";

/** Lo que el cuadro necesita saber del vuelo para contarlo. */
export interface DatosDelTablero {
  readonly estado: FlightState;
  /** Velocidad indicada, en nudos. La esfera no negocia las unidades. */
  readonly nudos: number;
  /** Altitud, en pies. */
  readonly pies: number;
  /** Velocidad vertical, en pies por minuto. */
  readonly fpm: number;
  /** Altura **sobre el suelo**, en pies. La del radioaltímetro. */
  readonly sobreElTerreno: number;
  readonly alabeo: number;
  readonly cabeceo: number;
  /** Velocidad respecto al suelo, en nudos. Dato auxiliar: va en cian. */
  readonly sobreElSuelo: number;
  /** Número de Mach, o `null` si este avión no lo enseña. */
  readonly mach: number | null;
  /** El aire del día, para la temperatura de fuera. Sin él, la estándar. */
  readonly aire?: Aire;
  /**
   * **La altitud de cabina, m**, la de verdad: la del control de presión con
   * su ritmo, o la del avión si se fue el aire. Sin ella, la del programa.
   * Ver `flight/cabina-presurizada.ts`.
   */
  readonly cabina?: number;
  /** A cuánto va cada motor, de 0 a 1, en su orden. */
  readonly motores: readonly number[];
  readonly flaps: number;
  /**
   * **Lo más rápido que se puede ir con lo que se lleva sacado**, en nudos, o
   * `Infinity` si no se lleva nada. Es lo que baja la banda roja de la cinta
   * y enciende la caja de la velocidad. Ver `topeDeLoSacado`.
   */
  readonly topeKt?: number;
  /** Dónde está el tren: 0 dentro, 1 fuera y trabado. Ver `flight/tren.ts`. */
  readonly tren: number;
  readonly reversa: boolean;
  /** Las velocidades que se cantan, en nudos. `Infinity` si no aplican. */
  readonly v1: number;
  readonly vr: number;
  readonly vref: number;
  /** Adónde se va, si se va a algún sitio. Rumbo en radianes. */
  readonly objetivo: {
    readonly rumbo: number;
    readonly distancia: number;
  } | null;
  /**
   * La declinación del campo en el que se está, en grados: lo que hay que
   * sumar al rumbo verdadero para leerlo en la brújula.
   *
   * La caja del rumbo enseñaba el verdadero —111 en la 12 de Los Rodeos—, y
   * con él se pierde la lección de alinearse y reconocer en el rumbo el número
   * pintado en el suelo. El HUD plano ya lo sumaba; este tablero no.
   */
  readonly declinacion?: number;
  /** De dónde sopla y cuánto. */
  readonly viento: { readonly desde: number; readonly nudos: number } | null;
  /**
   * El reglaje del altímetro y el del sitio, hPa.
   *
   * Dos números y no uno, porque lo que hay que poder ver es **si coinciden**.
   * Con uno solo la ventanilla sería un adorno: enseñaría lo que se ha puesto
   * sin decir nunca que está mal puesto, que es justo la mitad que enseña
   * algo. Ver `flight/altimetro.ts`.
   */
  readonly presion: { readonly puesta: number; readonly delSitio: number } | null;
  readonly perdida: boolean;
  /**
   * El depósito: lo que queda, lo que cabe y dónde empieza la reserva.
   *
   * `null` mientras no haya vuelo del que decirlo — el instrumento se queda
   * vacío, que es lo que hace un instrumento sin señal, y no marcando cero,
   * que sería mentir.
   */
  readonly combustible: {
    /** Lo que queda, en kilos. */
    readonly kilos: number;
    /** Lo que cabe en los depósitos, en kilos. Ver `loQueCabe`. */
    readonly cabe: number;
    /** Los kilos de la reserva de ley, al consumo de ahora. */
    readonly reserva: number;
    readonly estado: "bien" | "reserva" | "poco";
  } | null;
  /**
   * El mundo, para la carta de la pantalla de navegación.
   *
   * Llegaba solo a las pantallas de la cabina, así que el cuadro plano —el que
   * se ve desde fuera— seguía con la brújula sobre el fondo vacío: «en
   * Lanzarote no veo la pista». Ver `ui/carta.ts`.
   */
  readonly mapa: Mapa | null;
  /**
   * **La ventanilla ALT del automático**: la altura que se le ha pedido, en
   * pies, y lo que dice el avisador. `null` si el avión no la lleva o no hay
   * ninguna puesta. Ver `flight/altitud-seleccionada.ts`.
   */
  readonly ventanilla?: { readonly pies: number; readonly alerta: Alerta } | null;
  /**
   * **La velocidad que toca**, de la escalera de velocidades: los nudos y,
   * arriba, el Mach. La enseñan la ventanilla SPD y la muesca magenta de la
   * cinta. Ver `flight/escalera-de-velocidades.ts`.
   */
  readonly spd?: { readonly kt: number; readonly mach: number | null } | null;
  /** Lo que hace cada mano del automático, para el FMA. `null` sin automático. */
  readonly fma?: Fma | null;
}

/**
 * **Las tres columnas del FMA** y si el automático está puesto. Cadena vacía
 * es columna en blanco: esa mano es de quien vuela. Ver `fma` en
 * `ui/cristal.ts`.
 */
export interface Fma {
  readonly gases: string;
  readonly lateral: string;
  readonly vertical: string;
  readonly piloto: boolean;
}

const GRADOS = 180 / Math.PI;

/** Lo que mide una luz del panel de avisos, en unidades del cuadro. */
const ANCHO_DE_LUZ = 96;
const ALTO_DE_LUZ = 20;

/**
 * Cuántas caben encendidas a la vez en la visera.
 *
 * Cuatro: dos columnas por dos filas. La visera mide 64 de alto y una luz 20,
 * así que dos filas es lo que entra —`8 + 2 × 23 = 54`— y dos columnas de 96
 * acaban en la 208, lejos del MCP, que empieza en la 490.
 */
const HUECOS_DE_AVISO = 4;

/**
 * Dónde va cada aviso encendido, en unidades del cuadro.
 *
 * Aparte y pura porque es la cuenta que se equivocaba, y una cuenta que se
 * equivoca dentro de un método que toca el DOM no se puede comprobar sin un
 * navegador. Recibe las luces **ya ordenadas por gravedad** —`encendidas` las
 * devuelve así— y devuelve el hueco de las que caben.
 */
export function huecosDeAviso(
  ids: readonly string[],
): readonly { id: string; x: number; y: number }[] {
  return ids.slice(0, HUECOS_DE_AVISO).map((id, i) => ({
    id,
    x: 8 + (i % 2) * (ANCHO_DE_LUZ + 8),
    y: 8 + Math.floor(i / 2) * (ALTO_DE_LUZ + 3),
  }));
}

/** El dibujo de cada luz. Ver `panelDeAvisos`. */
const DIBUJO_DE_LUZ: Readonly<Record<string, DibujoDeSenal>> = {
  terreno: "terreno",
  perdida: "ala",
  rapido: "sobrevelocidad",
  tren: "tren",
  frustrada: "frustrada",
  piloto: "piloto-fuera",
  freno: "freno",
  combustible: "combustible",
  cabina: "mascara",
};

/**
 * **El tren de la luz roja, en el peldaño del dibujo: tres patas abajo.**
 *
 * Con el cuadro recogido, de esta luz solo asoma la visera, y lo que se veía
 * era una ficha roja con una rueda de catorce unidades en medio: «una ficha
 * roja abajo a la izquierda que no se entiende». Sin palabra que la acompañe,
 * la luz tiene que decir «tren» de un vistazo, y lo que dice tren es lo que
 * se ve desde fuera: las tres patas con su rueda. Ocupan la luz entera.
 */
function tresPatas(ancho: number, alto: number): string {
  const r = alto * 0.26;
  const paso = ancho / 4;
  let patas = "";
  for (let k = 1; k <= 3; k++) {
    const cx = paso * k;
    patas +=
      `<path d="M${cx} 2 V${alto - 2 * r - 1}" class="aviso-luz__pata" />` +
      `<circle cx="${cx}" cy="${alto - r - 1.5}" r="${r}" class="aviso-luz__rueda" />`;
  }
  return patas;
}

/**
 * **La placa de la matrícula**, atornillada al cuadro como en los aviones de
 * verdad.
 *
 * Todo avión lleva su matrícula en una placa del panel, delante de quien
 * vuela: es lo que se lee para decirla por radio sin tener que acordarse. Y
 * aquí faltaba justo eso. La matrícula solo iba pintada fuera, en el fuselaje,
 * y la torre llamaba «Zulu Echo Juliett Juliett» sin que hubiera en la cabina
 * nada con qué compararlo: «¿cómo sé que soy yo?».
 *
 * Abajo a la izquierda, en la franja que queda libre debajo de los
 * instrumentos en las tres familias, y **en los cuatro peldaños**: no es un
 * rótulo que se lea, es una forma que se reconoce —la misma que va pintada
 * en el avión, en la lámpara de la torre y en la tira de la radio—. Chapa
 * clara y letra negra grabada, distinta de la placa oscura del OACI del
 * destino. Ver `.placa-matricula` en la hoja.
 */
export function placaDeMatricula(matricula: string): string {
  const ancho = 30 + matricula.length * 14;
  return `
      <g class="tablero__matricula" data-hud="placa-matricula"
         transform="translate(14 ${ALTO_DEL_CUADRO - 32})">
        <rect width="${ancho}" height="27" rx="3" class="tablero__matricula-chapa" />
        <circle cx="6" cy="13.5" r="2" class="tablero__matricula-tornillo" />
        <circle cx="${ancho - 6}" cy="13.5" r="2" class="tablero__matricula-tornillo" />
        <text x="${ancho / 2}" y="20.5" text-anchor="middle"
              class="tablero__matricula-letras">${matricula}</text>
      </g>`;
}

export class Tablero {
  private raiz: SVGElement | null = null;
  private familia: Familia = "esferas";
  /** El avión que se vuela: la altura de su cabina depende de él. */
  private avion: AircraftConfig | null = null;
  private cuadro: Cuadro | null = null;
  private readonly seisPack = new SixPack();

  /**
   * El estado en coma flotante de lo que se mueve con retardo.
   *
   * Vive aquí y no en el DOM porque redondear antes de dibujar es lo que hace
   * temblar una cinta en reposo — y un instrumento que tiembla cuando todo va
   * bien está mintiendo sobre la calma.
   */
  private agujas: number[] = [];
  private carta = { desviacion: 0, velocidad: 0 };
  /**
   * Si la carta de rumbo ya sabe adónde mira.
   *
   * La primera imagen de un vuelo se planta: sin esto la carta arrancaba en el
   * norte y se venía al rumbo de la pista girando, que es un giro que el avión
   * no ha hecho. Un instrumento se **enciende** marcando lo que hay, y a
   * partir de ahí ya se mueve como se mueve.
   */
  private cartaPuesta = false;
  private bugDeRumbo = 0;
  /**
   * Cuánto llevan encendidos los avisos.
   *
   * Hace falta guardarlo porque la regla no es «está o no está»: una alerta
   * **recién nacida** parpadea un segundo sí y otro no durante cinco segundos,
   * y después se queda fija mientras la condición dure. Lo primero llama la
   * atención; lo segundo deja leer. Un aviso que parpadea sin parar acaba
   * siendo parte del decorado, que es la peor forma de fallar de un aviso.
   */
  private readonly edades = new Map<string, number>();
  /** La línea que lee un lector de pantalla, y cuándo se dijo la última vez. */
  private lectura: HTMLElement | null = null;
  private desdeLaLectura = 0;

  /**
   * **Las piezas que se mueven, buscadas una vez por dibujo y no en cada
   * imagen.**
   *
   * Cada fotograma se buscaban cuarenta piezas por selector en un árbol de
   * setecientos elementos, y las que este avión no lleva —la carta en una
   * avioneta, el depósito de barra en un reloj— recorrían el árbol entero para
   * no encontrar nada. Con la CPU de un teléfono barato era un milisegundo por
   * imagen en buscar lo que no cambia de sitio. Se vacía en `bind`, que es
   * cuando el dibujo es otro.
   */
  private readonly piezas = new Map<string, Element | null>();
  private readonly listas = new Map<string, readonly Element[]>();
  /**
   * Cuánto hace que se escribieron las cifras de apoyo. Ver `CIFRAS_POR_SEGUNDO`.
   */
  private desdeLasCifras = Infinity;
  /** Lo que lleva dibujado el radar, para no rehacerlo si no cambia. */
  private ecos = "";
  /** Y el relieve, por lo mismo. Ver `relieveEnLaCarta`. */
  private relieve: readonly unknown[] | null = null;

  /**
   * El dibujo entero. Se llama al montar el HUD y al cambiar de aeronave.
   *
   * ## **El cuadro no cambia entre peldaños: crece**
   *
   * Es la apuesta central del diseño de cabinas y la última que quedaba por
   * aplicar. Mismas posiciones, mismos colores, mismos movimientos en los
   * cuatro; lo que aparece es **lenguaje**. Un niño que sube de peldaño
   * reconoce su cabina al instante y descubre que siempre estuvo diciéndole
   * más de lo que él podía oír.
   *
   * Antes el cuadro aparecía de golpe en el peldaño de arriba y abajo no había
   * nada, así que quien empezaba a los cuatro años volaba sin instrumentos y a
   * los catorce se encontraba seis de golpe. Ahora en el primero hay cintas con
   * sus bandas de color, una rosa con su flecha y una aguja de motor en el
   * verde — sin una sola cifra, porque no se lee— y de ahí para arriba se van
   * encendiendo los números, las escalas, los rótulos y los objetivos.
   *
   * Y el mecanismo es el que tiene que ser: **un solo dibujo**, con cada pieza
   * marcada con el peldaño desde el que se ve. Nadie dibuja cuatro cuadros.
   * Ver `data-desde` y las reglas de `.tablero[data-peldano]` en la hoja.
   */
  markup(a: AircraftConfig, peldano = 4): string {
    const c = cuadroDe(a);
    const familia = familiaDe(a);
    this.seisPack.ponerCuadro(c);
    const dentro =
      familia === "esferas"
        ? this.deEsferas(a, c)
        : familia === "cristal"
          ? this.deCristal(a, c)
          : this.deLinea(a, c);
    return `
      <!--
        **El dibujo, para un lector de pantalla, es ruido.**

        Un cuadro de mandos completo son cuatrocientos rótulos, y casi todos
        son cifras de escala que no dicen nada sueltas: leerlos en voz alta no
        es accesibilidad, es un muro. Lo que hace falta es lo que un piloto
        cantaría —velocidad, altitud y rumbo—, y eso va debajo, en una línea
        que se relee sola de tanto en tanto. La versión anterior tampoco lo
        daba: rotulaba las seis esferas y no decía ni un número.
      -->
      <p class="tablero__lectura" data-hud="lectura" aria-live="polite"></p>
      <svg class="tablero" data-hud="tablero" data-familia="${familia}"
           data-peldano="${Math.max(1, Math.min(4, peldano))}"
           viewBox="0 0 ${ANCHO_DEL_CUADRO} ${ALTO_DEL_CUADRO}"
           preserveAspectRatio="xMidYMid meet"
           aria-hidden="true" focusable="false">
        ${this.mueble(a, familia)}
        ${dentro}
      </svg>
    `;
  }

  /**
   * La fascia, la visera y su sombra: el cuadro como **objeto físico**.
   *
   * «Nada flota sobre una losa negra». Un cuadro de mandos de verdad vive
   * debajo de un alero que le da sombra, y sin ese alero los instrumentos
   * parecen pegatinas. Cuesta cuatro rectángulos y cambia la cabina entera.
   */
  private mueble(a: AircraftConfig, familia: Familia): string {
    return `
      <defs>
        <linearGradient id="cabina-sombra" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.75" />
          <stop offset="1" stop-color="#000" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="${ANCHO_DEL_CUADRO}" height="${ALTO_DEL_CUADRO}" class="tablero__fascia" />
      <rect y="${VISERA}" width="${ANCHO_DEL_CUADRO}" height="24" class="tablero__sombra" />
      <rect width="${ANCHO_DEL_CUADRO}" height="${VISERA}" class="tablero__visera" />
      ${familia === "linea" ? this.mcp(["SPD", "HDG", "ALT"]) : familia === "cristal" ? this.mcp(["ALT"]) : ""}
      ${this.panelDeAvisos()}
      <text x="${ANCHO_DEL_CUADRO / 2}" y="${ALTO_DEL_CUADRO - 10}"
            ${MARCA_ROTULO} class="tablero__placa" text-anchor="middle">${a.name.toUpperCase()}</text>
      ${placaDeMatricula(matriculaDe(a.id).matricula)}
    `;
  }

  /**
   * El panel de avisos, en la visera y a la izquierda.
   *
   * **En la visera y no entre los instrumentos**, que es donde va en una
   * cabina de verdad: un aviso tiene que estar donde se ve sin buscarlo, y
   * entre los instrumentos se busca. Y a la izquierda porque la derecha ya es
   * del MCP en los reactores; que los dos no se estorben es lo que permite que
   * el mismo sitio valga para las tres familias.
   *
   * Las piezas se dejan puestas y apagadas —`Tablero.avisos` solo cambia
   * clases—, por lo mismo que el resto del cuadro: rehacer el marcado sesenta
   * veces por segundo cuesta fotogramas y esto tiene que costar cero cuando no
   * pasa nada, que es casi siempre.
   *
   * La palabra que lleva encima la decide el peldaño, con las reglas de
   * `data-desde` que ya usa todo lo demás: en el primero solo el color, desde
   * el segundo la palabra de casa, y desde el cuarto la de cabina en inglés
   * aeronáutico. Ver `escalera.ts`.
   */
  /**
   * Qué dibujo lleva cada luz.
   *
   * Vive aquí y no en `avisos-de-cabina.ts` porque aquello es la regla —qué
   * luces hay, en qué orden y de qué grado— y esto es cómo se pinta. Y se
   * reusan los dibujos que ya existen: el del terreno, el del ala, el del
   * tren, el de la frustrada y el del freno son **los mismos** que salen en
   * la tarjeta grande, y que sean los mismos es media lección — quien
   * aprendió el dibujo en la tarjeta lo reconoce en la luz.
   */
  private panelDeAvisos(): string {
    const ancho = ANCHO_DE_LUZ;
    const alto = ALTO_DE_LUZ;
    return LUCES.map((l) => {
      return `
        <g class="aviso-luz" data-luz="${l.id}" data-grado="${l.grado}"
           transform="translate(8 8)" visibility="hidden">
          <rect width="${ancho}" height="${alto}" rx="3" class="aviso-luz__caja" />
          <!--
            Y aquí NO va MARCA_ROTULO, que es la marca de rótulo que usa el
            resto del cuadro: esa constante ya escribe data-desde="2", así que
            poner otro detrás dejaba el atributo repetido y ganaba el primero
            — las dos palabras salían a la vez en el peldaño de las cifras.
            Estas dos son la excepción de la escalera: una sustituye a la
            otra en vez de sumarse.
          -->
          <!--
            **Y el dibujo, que va en los cuatro peldaños.**

            Sin él, en el primero la luz era un rectángulo de color y nada
            más. Se preguntó con una foto delante: «¿qué significa la banda
            roja?». Y no significaba nada, porque no había con qué saberlo —
            un color solo no es un canal, es un color. La escalera lo tiene
            escrito desde el principio: el dibujo en los cuatro, la palabra
            desde el segundo. Ver flight/escalera.ts.

            Dos copias, como las dos palabras: en el peldaño del dibujo va en
            medio, porque es lo único que hay; desde el segundo se corre a la
            izquierda y le deja el sitio a la palabra.
          -->
          <g data-hasta="1" class="aviso-luz__dibujo">${
            l.id === "tren"
              ? tresPatas(ancho, alto)
              : dibujoEn(DIBUJO_DE_LUZ[l.id] ?? "fuera", ancho / 2 - 9, 1, 18)
          }</g>
          <g data-desde="2">${dibujoEn(DIBUJO_DE_LUZ[l.id] ?? "fuera", 3, 3, 14)}</g>
          <text x="${(ancho + 17) / 2}" y="${alto - 6}" data-desde="4"
                class="aviso-luz__palabra" text-anchor="middle">${l.cabina}</text>
          <text x="${(ancho + 17) / 2}" y="${alto - 6}" data-desde="2" data-hasta="3"
                class="aviso-luz__palabra aviso-luz__palabra--casa"
                text-anchor="middle">${t(l.clave as TranslationKey)}</text>
        </g>`;
    }).join("");
  }

  /**
   * Enciende y apaga las luces del panel.
   *
   * Se le da el estado entero y él decide: quien llama no tiene que saber qué
   * luces hay ni en qué orden van. Ver `flight/avisos-de-cabina.ts`.
   */
  ponerLucesDeAviso(raiz: Element, estado: EstadoDeAvisos): void {
    /*
     * **Y se colocan al encenderlas, no al dibujarlas.**
     *
     * Cada luz tenía su sitio fijo en una columna de ocho, y ocho por
     * veintitrés píxeles son ciento ochenta y cuatro: la visera mide sesenta
     * y cuatro. O sea que **de la tercera en adelante el aviso salía por
     * debajo de la banda negra**, encima de los instrumentos. Contado
     * jugando: «el aviso rojo se pone por debajo de la banda negra».
     *
     * Lo que se dibuja ahora es solo lo que está encendido, apretado contra
     * la esquina de arriba a la izquierda en cuatro huecos —dos columnas por
     * dos filas— que sí caben en la visera y que quedan lejos del MCP, que
     * empieza en la 490. `encendidas` las devuelve por gravedad, así que si
     * alguna vez hubiera más de cuatro a la vez, las que se ven son las que
     * hay que ver.
     */
    const donde = new Map(
      huecosDeAviso(encendidas(estado).map((l) => l.id)).map((h) => [h.id, h]),
    );
    for (const l of LUCES) {
      const sel = `[data-luz="${l.id}"]`;
      const g = raiz === this.raiz ? this.pieza(sel) : raiz.querySelector(sel);
      if (!g) continue;
      const hueco = donde.get(l.id);
      poner(g, "visibility", hueco ? "visible" : "hidden");
      if (!hueco) continue;
      poner(g, "transform", `translate(${hueco.x} ${hueco.y})`);
    }
  }

  /**
   * El MCP de la visera: las tres ventanillas donde un Boeing guarda lo que le
   * has pedido —velocidad, rumbo y altitud—. Es la firma visual de una cabina
   * de línea, y aquí además es coherente: lo que se quiere va siempre en
   * magenta, en los seis aviones.
   *
   * **Y el turbohélice, su ventanilla de altitud**, en el mismo sitio: un
   * avión de pasaje de turbina lleva preselector de altitud en la visera
   * aunque no lleve un MCP entero. Lo que no lleva, no se le pinta.
   *
   * La de altitud es **la de verdad**: lo que se le ha pedido al automático,
   * no la altura de ahora redondeada, que es lo que enseñaba antes y no es lo
   * que dice ninguna ventanilla de ningún avión. Y se gira: con la rueda de
   * al lado —los dos botones, bajar y subir—, con la rueda del ratón encima
   * y con la T y la Y. Ver `flight/altitud-seleccionada.ts`.
   */
  private mcp(rotulos: readonly string[]): string {
    const primera = 690 - (rotulos.length - 1) * 100;
    return rotulos
      .map((r, i) => {
        const x = primera + i * 100;
        const alt = r === "ALT";
        return `
          <g class="tablero__mcp" ${MARCA_CON_SU_APARATO} ${alt ? 'data-mcp-alt=""' : ""}>
            <rect x="${x}" y="12" width="84" height="40" rx="3" />
            <!--
              Y el rótulo con la ventanilla, desde el mismo peldaño: tres
              cifras magenta sin decir de qué son no son tres objetivos, son
              tres números. La ventanilla y su nombre son la misma cosa.
            -->
            <text x="${x + 42}" y="24" ${MARCA_CON_SU_APARATO} class="cr__rotulo"
                  text-anchor="middle">${r}</text>
            <text data-mcp="${r.toLowerCase()}" x="${x + 42}" y="45"
                  class="cr__objetivo" text-anchor="middle">---</text>
          </g>${alt ? this.ruedaDeAltitud(x + 92) : ""}`;
      })
      .join("");
  }

  /**
   * **La rueda de la ventanilla de altitud**: dos teclas, bajar y subir, al
   * lado de la ventanilla. Cada toque, un millar; y arrastrando el dedo hacia
   * arriba o hacia abajo, uno por cada trecho, que es como se gira una rueda.
   *
   * El sitio del dedo es **más grande que la tecla**: todo el alto de la
   * visera y la sombra de debajo, que no tapan nada. En un teléfono el cuadro
   * va a un tercio de su tamaño, y una tecla de veinte píxeles pintada es una
   * de siete en la pantalla; el dedo necesita la zona entera.
   */
  private ruedaDeAltitud(x: number): string {
    const tecla = (sube: boolean) => {
      // Una al lado de la otra, bajar y subir: en la visera cabe más ancho
      // que alto, y el dedo necesita sitio más que el ojo.
      const x0 = sube ? x + 122 : x;
      const cx = x0 + 60;
      const punta = sube ? `M${cx} 22 l9 14 l-18 0 Z` : `M${cx} 42 l9 -14 l-18 0 Z`;
      return `
        <g class="tablero__rueda" data-mcp-rueda="${sube ? 1 : -1}">
          <rect class="tablero__rueda-dedo" x="${x0}" y="0" width="120" height="${BANDA.y}" />
          <rect x="${x0 + 8}" y="12" width="104" height="40" rx="4" />
          <path d="${punta}" />
        </g>`;
    };
    return `<g ${MARCA_CON_SU_APARATO}>${tecla(false)}${tecla(true)}</g>`;
  }

  /** Familia de esferas: seis relojes, columna de motor y placa a la izquierda. */
  private deEsferas(a: AircraftConfig, c: Cuadro): string {
    const motor = cajaDe("esferas", "motor");
    const placa = cajaDe("esferas", "placa");
    return `
      ${SixPack.grupo(c)}
      <g transform="translate(${motor.x} ${BANDA.y})">
        ${columnaDeMotor(motor.ancho, BANDA.alto, c)}
      </g>
      <g transform="translate(${placa.x} ${BANDA.y})">
        <!--
          **La placa lleva el avión en los cuatro peldaños.**

          La chapa con el nombre es letra, así que empieza en el tercer
          peldaño, y en los dos de los pequeños el tercio izquierdo del cuadro
          se quedaba vacío: primero enmarcado y sin nada escrito, que parecía
          un instrumento roto, y después sin marco, que dejaba las esferas y el
          motor corridos a la derecha de un cuadro medio negro. Dicho con una
          captura de Guyrami: «textos descentrados». No eran los textos: era
          el hueco.

          Así que la placa lleva el retrato del avión que se vuela, que es un
          dibujo y no una letra, en el mismo sitio en los cuatro peldaños y en
          medio del alto, a la altura de la raya entre las dos filas de
          esferas. Desde el tercero se le suma encima el nombre —el cuadro no
          se recoloca entre peldaños: crece— y el marco va siempre, porque ya
          nunca enmarca un sitio vacío.
        -->
        <rect data-fondo="placa" width="${placa.ancho}" height="${BANDA.alto}" rx="4" class="tablero__hueco" />
        ${this.retrato(a, placa.ancho)}
        ${this.chapa(a, placa.ancho)}
        <text data-cristal="gs" x="${placa.ancho / 2}" y="${BANDA.alto - 74}"
              ${MARCA_ROTULO} class="cr__aux" text-anchor="middle"></text>
        ${lucesDeTren(
          (placa.ancho - patasDe(a) * 22 + 6) / 2,
          BANDA.alto - 48,
          patasDe(a),
        )}
      </g>
    `;
  }

  /**
   * La chapa del fabricante, con el nombre y la silueta del avión.
   *
   * Ocupa el hueco de la izquierda, que en una avioneta de verdad es donde van
   * los papeles y la placa de matrícula, y hace dos cosas: le da al cuadro una
   * simetría que no tenía y **enseña a reconocer tipos**, que es lo anterior a
   * saber leer un instrumento. A los cuatro años eso es la mitad de la gracia
   * de un juego de aviones.
   */
  private chapa(a: AircraftConfig, ancho: number): string {
    const partes = a.name.toUpperCase().split(" ");
    const arriba = partes.slice(0, 2).join(" ");
    const abajo = partes.slice(2).join(" ");
    return `
      <text x="${ancho / 2}" y="46" ${MARCA_ROTULO} class="tablero__chapa" text-anchor="middle">${arriba}</text>
      <text x="${ancho / 2}" y="76" ${MARCA_ROTULO} class="tablero__chapa tablero__chapa--nombre"
            text-anchor="middle">${abajo}</text>
      <line x1="${ancho * 0.2}" y1="94" x2="${ancho * 0.8}" y2="94" ${MARCA_ROTULO} class="tablero__filete" />
    `;
  }

  /**
   * El retrato del avión, en la placa: el mismo del hangar.
   *
   * Es el avión que se vuela, fotografiado por el propio juego con su pintura
   * —ver `retratos.ts`—, así que quien lo eligió en el hangar lo reconoce en
   * el cuadro sin leer su nombre. Va entre el filete de la chapa y la
   * velocidad sobre el suelo, centrado en el alto de la banda, y no se mueve
   * nunca: se pinta una vez y no le cuesta nada a ningún fotograma.
   *
   * Si la imagen no llega, la placa se queda con su marco, que es lo que
   * había.
   */
  private retrato(a: AircraftConfig, ancho: number): string {
    const lado = 4;
    const w = ancho - lado * 2;
    const h = (w * TAMANO_DE_RETRATO.alto) / TAMANO_DE_RETRATO.ancho;
    return `<image href="${retratoDe(a.id)}" x="${lado}" y="${BANDA.alto / 2 - h / 2}"
      width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"
      class="tablero__retrato" />`;
  }

  /** Familia de cristal: horizonte a la izquierda, mapa con motor a la derecha. */
  private deCristal(a: AircraftConfig, c: Cuadro): string {
    const pfd = cajaDe("cristal", "pfd");
    const mfd = cajaDe("cristal", "mfd");
    const franja = 128;
    return `
      <g transform="translate(${pfd.x} ${BANDA.y})">
        ${pantallaDeActitud(pfd.ancho, BANDA.alto, c, { rosa: true, mach: false })}
      </g>
      <g transform="translate(${mfd.x} ${BANDA.y})">
        <rect width="${mfd.ancho}" height="${BANDA.alto}" rx="6" class="tablero__pantalla" />
        <g transform="translate(${franja + 8} 0)">
          ${pantallaDeNavegacion(mfd.ancho - franja - 8, BANDA.alto)}
        </g>
        ${franjaDeMotor(franja, BANDA.alto, c, a)}
      </g>
    `;
  }

  /** Familia de línea: actitud, navegación y motores, en ese orden de barrido. */
  private deLinea(a: AircraftConfig, c: Cuadro): string {
    const pfd = cajaDe("linea", "pfd");
    const nd = cajaDe("linea", "nd");
    const eicas = cajaDe("linea", "eicas");
    return `
      <g transform="translate(${pfd.x} ${BANDA.y})">
        ${pantallaDeActitud(pfd.ancho, BANDA.alto, c, { rosa: false, mach: true, fma: true })}
      </g>
      <g transform="translate(${nd.x} ${BANDA.y})">
        ${pantallaDeNavegacion(nd.ancho, BANDA.alto)}
      </g>
      <g transform="translate(${eicas.x} ${BANDA.y})">
        ${pantallaDeMotores(eicas.ancho, BANDA.alto, c, a)}
      </g>
    `;
  }

  bind(raiz: HTMLElement, a: AircraftConfig): void {
    this.raiz = raiz.querySelector<SVGElement>('[data-hud="tablero"]');
    this.lectura = raiz.querySelector<HTMLElement>('[data-hud="lectura"]');
    this.familia = familiaDe(a);
    this.avion = a;
    this.cuadro = cuadroDe(a);
    this.agujas = Array.from({ length: a.motores }, () => 0);
    this.carta = { desviacion: 0, velocidad: 0 };
    this.cartaPuesta = false;
    this.piezas.clear();
    this.listas.clear();
    this.desdeLasCifras = Infinity;
    this.ecos = "";
    this.relieve = null;
    if (this.familia === "esferas") this.seisPack.bind(raiz);
  }

  /**
   * La primera pieza del dibujo con ese selector, o `null` si no la lleva.
   *
   * El «no la lleva» también se guarda, que es lo que más ahorra: buscar lo
   * que no está es recorrer el árbol entero. Y si la guardada ya no está en la
   * página —un repintado que no pasó por `bind`—, se vuelve a buscar.
   */
  private pieza<T extends Element = SVGElement>(sel: string): T | null {
    let el = this.piezas.get(sel);
    if (el === undefined || (el !== null && !el.isConnected)) {
      el = this.raiz?.querySelector(sel) ?? null;
      this.piezas.set(sel, el);
    }
    return el as T | null;
  }

  /** Todas las piezas con ese selector, con la misma regla que `pieza`. */
  private todas<T extends Element = SVGElement>(sel: string): readonly T[] {
    let lista = this.listas.get(sel);
    if (!lista || lista.some((el) => !el.isConnected)) {
      lista = this.raiz ? [...this.raiz.querySelectorAll(sel)] : [];
      this.listas.set(sel, lista);
    }
    return lista as readonly T[];
  }

  get presente(): boolean {
    return this.raiz !== null;
  }

  update(d: DatosDelTablero, dt: number, dibujar = true): void {
    const raiz = this.raiz;
    const c = this.cuadro;
    if (!raiz || !c) return;
    /*
     * **Recogido y fuera de la vista, no se dibuja: solo se canta.** Son
     * seiscientos elementos de SVG moviéndose cada fotograma detrás de un
     * recorte, y en el teléfono —donde el cuadro nace recogido— era trabajo
     * tirado en el aparato que menos tiene. La línea del lector de pantalla
     * sigue: quien no ve la pantalla no ha recogido nada. Ver `Hud.update`.
     */
    if (!dibujar) {
      this.cantar(d, dt);
      return;
    }
    this.desdeLasCifras += dt;
    const cifras = this.desdeLasCifras >= 1 / CIFRAS_POR_SEGUNDO;
    if (cifras) this.desdeLasCifras = 0;

    if (this.familia === "esferas" && this.seisPack.present) {
      this.seisPack.update(
        d.estado,
        d.nudos,
        d.pies,
        d.fpm,
        d.alabeo,
        d.cabeceo,
        d.presion,
        d.declinacion ?? 0,
      );
    } else {
      this.cintas(d, dt, cifras);
    }
    this.motores(c, d, dt, cifras);
    this.mandos(d, cifras);
    // Los avisos, en las tres familias: la avioneta también se cae.
    this.avisos(raiz, d, dt);
    if (cifras) this.texto("gs", `GS ${Math.round(d.sobreElSuelo)}`);
    if (cifras && this.familia === "linea" && this.avion) {
      /*
       * Las mismas dos cuentas que el EICAS de la cabina, de los mismos sitios:
       * la temperatura de la atmósfera tipo y la altura de la cabina de
       * `cabina-presurizada.ts`. Ver `aireYCabina` en `cristal.ts`.
       */
      const metros = d.pies / PIES;
      const oat = Math.round(temperaturaExterior(metros, d.aire));
      this.texto("oat", `${oat > 0 ? "+" : ""}${oat}°C`);
      const cabina = d.cabina ?? altitudDeCabina(metros, this.avion);
      this.texto("cabina", String(Math.round(cabina / 0.3048 / 50) * 50));
      // En rojo por encima de diez mil pies, como el EICAS de verdad.
      this.pieza('[data-cristal="cabina"]')?.classList.toggle(
        "cr__aire--limite",
        cabina > AVISO_DE_CABINA,
      );
    }
    // La presión, en cada imagen: la cambia una rueda que se gira a mano, y
    // la ventanilla tiene que contestar al dedo. Casi nunca cambia, así que
    // casi nunca se escribe.
    this.presion(d.presion);
    this.cantar(d, dt);
  }

  // ── Lo que se mueve ─────────────────────────────────────────────────

  private cintas(d: DatosDelTablero,
    dt: number,
    cifras: boolean,
  ): void {
    // En magnéticos, que es lo que marca una brújula y lo que va pintado en
    // la cabecera. Ver `declinacion`.
    const decl = d.declinacion ?? 0;
    const rumbo = (((d.estado.heading * GRADOS + decl) % 360) + 360) % 360;

    this.tira("ias", d.nudos);
    this.tira("alt", d.pies);

    /*
     * La carta de rumbo se pasa un par de grados al salir de un viraje, como
     * se pasa un giróscopo de verdad: tiene masa. Es de las cosas que hacen
     * que un instrumento parezca de verdad sin que nadie sepa decir por qué.
     *
     * Se persigue el rumbo por el camino corto para que no dé la vuelta entera
     * al cruzar el norte, que es donde esta clase de suavizado se delata.
     */
    if (!this.cartaPuesta) {
      this.carta = { desviacion: rumbo, velocidad: 0 };
      this.cartaPuesta = true;
    }
    const corto = ((rumbo - this.carta.desviacion + 540) % 360) - 180;
    this.carta = precesion(
      this.carta.desviacion,
      this.carta.velocidad,
      this.carta.desviacion + corto,
      dt,
    );
    const cartaDeg = ((this.carta.desviacion % 360) + 360) % 360;
    this.tira("hdg", cartaDeg);
    /*
     * **Todas las rosas, no la primera.** El de cristal lleva dos —la de
     * dentro del horizonte y la del mapa— y girando solo la primera, la del
     * mapa se quedaba con el norte arriba mientras la de la cabina giraba con
     * el avión: el mismo instrumento, quieto en una vista y vivo en la otra.
     */
    for (const rosa of this.todas('[data-cristal="rosa"]'))
      poner(rosa, "transform", `rotate(${n1(-cartaDeg)})`);

    // El horizonte, en cambio, va sin retardo: es el instrumento más directo
    // de la cabina y meterle inercia sería enseñar mal.
    const disco = this.pieza('[data-cristal="disco"]');
    if (disco) {
      const cx = Number(disco.dataset.cx);
      const cy = Number(disco.dataset.cy);
      const porGrado = Number(disco.dataset.porgrado);
      poner(
        disco,
        "transform",
        `rotate(${n1(-d.alabeo * GRADOS)} ${cx} ${cy}) translate(0 ${n1(cy + d.cabeceo * GRADOS * porGrado)})`,
      );
    }
    const resbala = this.pieza('[data-cristal="deslizamiento"]');
    if (resbala) {
      const ampl = Number(resbala.dataset.ampl) || 20;
      const cuanto = Math.max(-1, Math.min(1, d.estado.beta * 6)) * ampl * 0.4;
      poner(resbala, "transform", `translate(${n1(cuanto)} 0)`);
    }

    this.texto("ias", String(Math.round(d.nudos)));
    this.altitud(d.pies, d.fpm);
    this.texto("hdg", pad3(Math.round(rumbo) % 360));
    this.texto("nd-rumbo", pad3(Math.round(rumbo) % 360));
    // Las de apoyo, a su ritmo: ver `CIFRAS_POR_SEGUNDO`.
    if (cifras) {
      if (d.mach !== null && d.mach >= 0.4) {
        this.texto("mach", `M ${d.mach.toFixed(2).slice(1)}`);
      } else {
        this.texto("mach", "");
      }
      this.texto("viento",
        d.viento
          ? `${pad3(Math.round(d.viento.desde))}/${Math.round(d.viento.nudos)}`
          : "",
      );
      this.texto("distancia",
        d.objetivo ? `${(d.objetivo.distancia / 1852).toFixed(1)} NM` : "",
      );
    }

    /*
     * El radioaltímetro, que aparece por debajo de dos mil quinientos pies y
     * desaparece por encima: mientras sobra altura no dice nada, y en cuanto
     * empieza a faltar es el único número que se mira.
     */
    const radio = this.pieza('[data-cristal="radio"]');
    if (radio) {
      const cerca = d.sobreElTerreno < DESDE_EL_RADIO;
      poner(radio, "visibility", cerca ? "visible" : "hidden");
      radio.classList.toggle("cr--bajito", d.sobreElTerreno < YA_ES_BAJO);
      const cifra = this.pieza('[data-cristal="radio"] text');
      if (cifra && cerca)
        escribir(cifra, String(Math.max(0, Math.round(d.sobreElTerreno))));
    }

    this.vsi(d.fpm);
    this.tendencias(d);
    this.bugs(d, dt, rumbo);

    // La ruta, en magenta, desde el avión hacia donde se va.
    const ruta = this.pieza('[data-cristal="ruta"] path');
    if (ruta) {
      if (!d.objetivo) poner(ruta, "d", "M0 0");
      else {
        // El objetivo viene en verdaderos: se pasa a magnéticos para
        // restarlo del rumbo, que ya lo está.
        const rel =
          ((d.objetivo.rumbo * GRADOS + decl - rumbo) * Math.PI) / 180;
        poner(
          ruta,
          "d",
          `M0 0 L${n1(Math.sin(rel) * 160)} ${n1(-Math.cos(rel) * 160)}`,
        );
      }
    }
  }

  /**
   * Los avisos, con la política de una cabina de verdad.
   *
   * Dos y nada más, que es el máximo que puede parpadear a la vez: la pérdida
   * —marco rojo alrededor del horizonte, que es donde mira quien ya está en
   * apuros— y la sobrevelocidad, en la caja de la velocidad. Ámbar quiere
   * decir «mirame»; rojo, «actuá ya». No significan ninguna otra cosa en todo
   * el juego, y ninguna otra cosa se pinta de esos colores.
   */
  private avisos(raiz: SVGElement, d: DatosDelTablero, dt: number): void {
    /*
     * Y con «Movimiento: reducido» puesto, el aviso **no parpadea: se enciende
     * y se queda**. Un parpadeo es exactamente la clase de movimiento que ese
     * ajuste existe para quitar, y lo que el aviso tiene que hacer —estar y
     * verse— no depende de que se mueva. Apagarlo del todo sí sería un fallo:
     * el ajuste reduce el movimiento, no la información.
     */
    const quieto = raiz.closest(".sin-movimiento") !== null;
    const enciende = (que: string, activo: boolean) =>
      activo && (quieto || parpadeo(this.edad(que, activo, dt)));

    poner(
      this.pieza('[data-cristal="perdida"]'),
      "visibility",
      enciende("perdida", d.perdida) ? "visible" : "hidden",
    );

    /*
     * Y la de nunca pasar, que sale de la ficha de **este** avión: ámbar cinco
     * nudos antes, rojo al llegar. Es el mismo número que pinta el arco rojo de
     * la esfera, y sale del mismo sitio para que no puedan discrepar.
     */
    const c = this.cuadro;
    const caja = this.pieza('[data-alerta="ias"]');
    if (!c || !caja) return;
    // Y el tope de lo que se lleve sacado, si es más bajo: con los flaps de
    // aterrizaje fuera, la cifra se enciende en su placa y no en la Vne.
    const vne = Math.min(c.velocidades.vne, d.topeKt ?? Infinity);
    const pasado = d.nudos >= vne;
    const cerca = d.nudos >= vne - AVISA_CINCO_ANTES;
    caja.classList.toggle("cr__caja--limite", enciende("exceso", pasado));
    caja.classList.toggle("cr__caja--precaucion", cerca && !pasado);
  }

  /** Cuánto lleva encendido un aviso. Se pone a cero en cuanto se apaga. */
  private edad(que: string, encendido: boolean, dt: number): number {
    if (!encendido) {
      this.edades.set(que, 0);
      return 0;
    }
    const edad = (this.edades.get(que) ?? 0) + dt;
    this.edades.set(que, edad);
    return edad;
  }

  /** Desplaza una tira para que el valor de ahora caiga en la línea de fe. */
  private tira(que: string, valor: number): void {
    const g = this.pieza(`[data-tira="${que}"]`);
    if (!g) return;
    const medio = Number(g.dataset.medio);
    const porUnidad = Number(g.dataset.porunidad);
    if (que === "hdg") {
      poner(g, "transform", `translate(${n1(medio - valor * porUnidad)} 0)`);
    } else {
      poner(g, "transform", `translate(0 ${n1(medio + valor * porUnidad)})`);
    }
    /*
     * Y la de altitud va grabada a trozos: si el avión se acerca al borde del
     * que hay, se graba otro centrado en él. Pasa cada muchos cientos de pies,
     * no en cada imagen. Ver `TROZO_DE_CINTA`.
     */
    const trozo = que === "alt" ? this.pieza('[data-trozo="alt"]') : null;
    if (trozo && hayQueMoverElTrozo(valor, Number(trozo.dataset.base), medio * 2)) {
      const base = Math.round(valor / 100) * 100;
      trozo.dataset.base = String(base);
      trozo.innerHTML = marcasDeAltitud(base, medio * 2);
    }
  }

  /**
   * La altitud: la caja con lo de delante y el tambor con los dos últimos
   * dígitos rodando. Que es como se lee un altímetro de verdad de un vistazo.
   */
  private altitud(pies: number, fpm: number): void {
    this.texto("alt", String(Math.floor(pies / 100)));
    const tambor = this.pieza('[data-tambor="alt"]');
    if (!tambor) return;
    const paso = Number(tambor.dataset.paso) || 26;
    const { centro, fraccion } = tamborDeAltitud(pies, fpm);
    poner(tambor, "transform", `translate(0 ${n1(fraccion * paso)})`);
    for (const t of this.todas('[data-tambor="alt"] [data-tambor-cifra]')) {
      const k = Number(t.dataset.tamborCifra) - 1; // -1 arriba, +1 abajo
      const valor = centro - k * 20;
      escribir(t, String(((valor % 100) + 100) % 100).padStart(2, "0"));
    }
  }

  /**
   * La ventanilla de presión del altímetro.
   *
   * Ámbar cuando no es la del sitio, y nada más: no hay aviso, ni sonido, ni
   * pantalla roja. Un altímetro mal puesto no se queja — sigue funcionando y
   * mintiendo, y eso es exactamente lo que hay que aprender. En este juego
   * las normas se muestran, no se imponen. Ver `flight/altimetro.ts`.
   */
  private presion(p: DatosDelTablero["presion"],
  ): void {
    const t = this.pieza('[data-cristal="qnh"]');
    if (!t) return;
    if (!p) {
      escribir(t, "");
      return;
    }
    escribir(t, `QNH ${Math.round(p.puesta)}`);
    t.classList.toggle("cr__qnh--mal", !bienPuesta(p.puesta, p.delSitio));
  }

  private vsi(fpm: number): void {
    const g = this.pieza('[data-cristal="vsi"]');
    if (!g) return;
    const ampl = Number(g.dataset.ampl);
    const max = Number(g.dataset.max);
    const f = Math.max(-1, Math.min(1, fpm / max));
    poner(g, "transform", `translate(0 ${n1(-f * ampl)})`);
  }

  /**
   * Los vectores de tendencia: dónde estarás dentro de seis segundos si no
   * tocas nada. Es la animación más valiosa del cuadro, porque lo que enseña
   * es anticipación — que es casi todo lo que es pilotar.
   */
  private tendencias(d: DatosDelTablero): void {
    const v = tendencia(this.aceleracion, QUIETA_LA_VELOCIDAD);
    const a = tendencia(d.fpm / 60, QUIETA_LA_ALTITUD / 60);
    this.barra("ias", v);
    this.barra("alt", a);
  }

  private barra(que: string, salto: number | null): void {
    const r = this.pieza(`[data-tendencia="${que}"]`);
    if (!r) return;
    if (salto === null) {
      poner(r, "height", "0");
      return;
    }
    const medio = Number(r.dataset.medio);
    const porUnidad = Number(r.dataset.porunidad);
    const largo = Math.min(Math.abs(salto) * porUnidad, medio - 6);
    poner(r, "y", n1(salto > 0 ? medio - largo : medio));
    poner(r, "height", n1(largo));
  }

  /** Lo que se persigue: los bugs viajan a su sitio, no aparecen en él. */
  private bugs(d: DatosDelTablero,
    dt: number,
    rumbo: number,
  ): void {
    const ponV = (que: string, kt: number) => {
      const g = this.pieza(`[data-bug="${que}"]`);
      if (!g) return;
      if (!Number.isFinite(kt) || kt <= 0) {
        poner(g, "visibility", "hidden");
        return;
      }
      poner(g, "visibility", "visible");
      poner(g, "transform", `translate(0 ${n1(-kt * POR_NUDO)})`);
    };
    ponV("v1", d.v1);
    ponV("vr", d.vr);
    ponV("vref", d.vref);

    /*
     * **Y la banda roja, que baja con lo que se saca.** En la cinta de un
     * avión de línea la franja de «más rápido no» no está quieta: con los
     * flaps o el tren fuera baja hasta su placa, y sube otra vez al
     * recogerlos. Mirándola se sabe cuánto se puede acelerar ahora mismo sin
     * haber leído la placa. Con nada fuera, se queda en la de siempre.
     */
    const tope = this.pieza('[data-tope="ias"]');
    const c = this.cuadro;
    if (tope && c) {
      const vne = c.velocidades.vne;
      const kt = Math.min(vne, d.topeKt ?? Infinity);
      poner(tope, "transform", `translate(0 ${n1(-kt * POR_NUDO)})`);
      poner(tope, "visibility", kt < vne ? "visible" : "hidden");
    }

    const quiero = d.objetivo
      ? (((d.objetivo.rumbo * GRADOS + (d.declinacion ?? 0)) % 360) + 360) %
        360
      : rumbo;
    const corto = ((quiero - this.bugDeRumbo + 540) % 360) - 180;
    this.bugDeRumbo = deslizaBug(this.bugDeRumbo, this.bugDeRumbo + corto, dt);
    const bugDeg = ((this.bugDeRumbo % 360) + 360) % 360;
    poner(
      this.pieza('[data-bug="hdg"]'),
      "transform",
      `translate(${n1(bugDeg * POR_GRADO)} 0)`,
    );
    for (const enRosa of this.todas('[data-bug="rosa"]'))
      poner(enRosa, "transform", `rotate(${n1(bugDeg)})`);
    escribir(this.pieza('[data-mcp="hdg"]'), pad3(Math.round(bugDeg) % 360));
    /*
     * **La ventanilla SPD y su muesca, con la velocidad que toca.** Enseñaba
     * la Vref siempre: 146 en plena subida del JAZ 120, que es una velocidad
     * de aterrizar puesta donde va la de subir. Ahora es la de la escalera de
     * velocidades —250 abajo, la de subida, el Mach arriba, la de la llegada
     * y la de final—, que es la que sostienen los gases si los hay. Arriba,
     * con el Mach, como la escribe un panel: «.78».
     */
    const spd = d.spd ?? null;
    const enMcp = spd
      ? spd.mach !== null
        ? `.${Math.round(spd.mach * 100)}`
        : String(Math.round(spd.kt))
      : "---";
    escribir(this.pieza('[data-mcp="spd"]'), enMcp);
    ponV("spd", spd ? spd.kt : NaN);
    poner(this.pieza('[data-cristal="spd-sel-caja"]'), "visibility", spd ? "visible" : "hidden");
    escribir(this.pieza('[data-cristal="spd-sel"]'), spd ? enMcp : "");
    this.fma(d.fma ?? null);
    this.ventanillaAlt(d, dt);
  }

  /** **El FMA**: lo que hace cada mano. Ver `fma` en `ui/cristal.ts`. */
  private fma(f: Fma | null): void {
    escribir(this.pieza('[data-fma="gases"]'), f?.gases ?? "");
    escribir(this.pieza('[data-fma="lateral"]'), f?.lateral ?? "");
    escribir(this.pieza('[data-fma="vertical"]'), f?.vertical ?? "");
    escribir(this.pieza('[data-fma="piloto"]'), f?.piloto ? "A/P" : "");
  }

  /** Dónde va el bug de la ventanilla ALT en la cinta, viajando. */
  private bugDeAltitud: number | null = null;

  /**
   * **La ventanilla ALT**: la cifra del MCP, la de encima de la cinta, el bug
   * en el borde —o la raya de «hasta aquí» en el primer peldaño— y el
   * avisador. Acercándose, la caja se resalta en blanco; ida, en ámbar, que
   * parpadea al nacer y se queda fija, como toda alerta de este cuadro. Nunca
   * parpadean los dígitos. Ver `flight/altitud-seleccionada.ts`.
   */
  private ventanillaAlt(d: DatosDelTablero, dt: number): void {
    const v = d.ventanilla ?? null;
    const bug = this.pieza('[data-bug="alt-sel"]');
    const caja = this.pieza('[data-cristal="alt-sel-caja"]');
    const mcp = this.pieza("[data-mcp-alt]");
    escribir(this.pieza('[data-mcp="alt"]'), v ? String(v.pies) : "-----");
    if (!v) {
      this.bugDeAltitud = null;
      poner(bug, "visibility", "hidden");
      poner(caja, "visibility", "hidden");
      mcp?.classList.remove("cr__sel--cerca", "cr__sel--fuera");
      return;
    }
    this.bugDeAltitud =
      this.bugDeAltitud === null ? v.pies : deslizaBug(this.bugDeAltitud, v.pies, dt);
    if (bug) {
      const medio = Number(bug.dataset.medio);
      const alto = Number(bug.dataset.alto);
      const porUnidad = Number(bug.dataset.porunidad);
      // Aparcado en el borde si cae fuera, por debajo de la caja de la cifra.
      const y = Math.max(40, Math.min(alto - 12, medio - (this.bugDeAltitud - d.pies) * porUnidad));
      poner(bug, "visibility", "visible");
      poner(bug, "transform", `translate(0 ${n1(y)})`);
    }
    poner(caja, "visibility", "visible");
    escribir(this.pieza('[data-cristal="alt-sel"]'), String(v.pies));
    const quieto = this.raiz?.closest(".sin-movimiento") !== null;
    const fuera = v.alerta === "fuera";
    const edad = this.edad("alt-sel", fuera, dt);
    const ambar = fuera && (quieto || parpadeo(edad));
    for (const g of [caja, mcp]) {
      g?.classList.toggle("cr__sel--cerca", v.alerta === "cerca");
      g?.classList.toggle("cr__sel--fuera", ambar);
    }
  }

  // ── Los motores y los mandos ────────────────────────────────────────

  /**
   * Cada motor tiene su carácter temporal, y la aguja lo enseña.
   *
   * Un pistón obedece en tres décimas; un turbofán tarda tres segundos en
   * despertar. Ese retardo es real y es lo que hace que un avión de línea se
   * vuele con paciencia, adelantándose. Que la aguja tarde no es un defecto
   * del dibujo: **es la lección**.
   */
  private motores(c: Cuadro,
    d: DatosDelTablero,
    dt: number,
    cifras: boolean,
  ): void {
    const tau = TARDA_EL_MOTOR[c.queMarca];
    for (let i = 0; i < this.agujas.length; i++) {
      const objetivo = d.motores[i] ?? 0;
      this.agujas[i] = conRetardo(this.agujas[i]!, objetivo, dt, tau);
      const f = Math.max(0, Math.min(1, this.agujas[i]!));
      /*
       * El ángulo y la cifra, de la escala del avión: vueltas en un pistón,
       * tanto por ciento en una turbina. Aquí se escribía siempre el tanto por
       * ciento, y el mismo motor marcaba «100» en el cuadro y «2700» dentro.
       */
      const giro = (r: number) =>
        anguloEn(c.motor.barrido, enLaEscala(c.motor, valorDeMotor(c, r)));
      poner(
        this.pieza(`[data-motor-aguja="${i}"]`),
        "transform",
        `rotate(${n1(giro(f))})`,
      );
      const barra = this.pieza(`[data-motor-barra="${i}"]`);
      if (barra) {
        const alto = Number(barra.dataset.alto);
        const suelo = Number(barra.dataset.suelo);
        poner(barra, "y", n1(suelo - f * alto));
        poner(barra, "height", n1(f * alto));
        barra.classList.toggle("cr__barra--tope", f > 0.95);
      }
      if (cifras)
        escribir(this.pieza(`[data-motor-cifra="${i}"]`), cifraDeMotor(c, f));
      /*
       * Y lo que se le ha **pedido**, que no es lo mismo: el bug y la barra van
       * al mando, la aguja y la cifra van a lo que está dando. Verlos separarse
       * en cada empujón de gas es toda la lección de un reactor.
       */
      const pedido = Math.max(0, Math.min(1, objetivo));
      poner(
        this.pieza(`[data-motor-bug="${i}"]`),
        "transform",
        `rotate(${n1(giro(pedido))})`,
      );
      const mando = this.pieza(`[data-mando-motor="${i}"]`);
      if (mando)
        poner(mando, "width", n1(pedido * Number(mando.dataset.ancho)));
      this.pieza(`[data-motor="${i}"]`)?.classList.toggle("cr--tope", f > 0.95);
    }
  }

  private mandos(d: DatosDelTablero, cifras: boolean): void {
    /*
     * Los flaps, **en grados y donde caen en la escala**: la regla y el reloj
     * llevan las muescas en proporción a sus grados, y el puntero va a los
     * grados que tienen los flaps ahora. Ver `escalaDeFlaps`.
     */
    const c = this.cuadro;
    const grados = c ? enLaMuesca(c.flaps, d.flaps) : 0;
    const enLaRegla = c ? flapsEnLaEscala(c, grados) : 0;
    const flaps = this.pieza('[data-cristal="flaps"]');
    if (flaps) {
      const largo = Number(flaps.dataset.largo);
      const cuanto = n1(enLaRegla * largo);
      poner(
        flaps,
        "transform",
        flaps.dataset.tumbada === "1"
          ? `translate(${cuanto} 0)`
          : `translate(0 ${cuanto})`,
      );
    }
    if (c?.escalaDeFlaps) {
      poner(
        this.pieza("[data-flaps-aguja]"),
        "transform",
        `rotate(${n1(anguloEn(c.escalaDeFlaps.barrido, enLaRegla))})`,
      );
      escribir(this.pieza("[data-flaps-cifra]"), `${Math.round(grados)}°`);
    }
    this.deposito(d, cifras);
    poner(
      this.pieza('[data-cristal="reversa"]'),
      "visibility",
      d.reversa ? "visible" : "hidden",
    );

    /*
     * Y las luces del tren, con sus tres estados. Verde solo cuando está fuera
     * **y trabado**: con el tren a medio camino la luz es ámbar, que quiere
     * decir «esperá», y esa espera de diez segundos es media lección del
     * mando. Ver `flight/tren.ts`.
     */
    this.laCarta(d, cifras);
    const tren = this.pieza('[data-cristal="tren"]');
    if (tren) {
      const luz = luzDeTren(d.tren);
      tren.classList.toggle("cr--moviendose", luz === "moviendose");
      tren.classList.toggle("cr--dentro", luz === "dentro");
    }
  }

  /**
   * El depósito: la barra que se acorta y la franja de la reserva.
   *
   * La franja está donde empiezan los cuarenta y cinco minutos de ley de
   * **este** avión y no se mueve: es la meta, y una meta que se desplaza no
   * enseña nada. Lo que se mueve es la barra. Ver `reservaEnKilos`.
   *
   * Y el color dice lo mismo que la raya, porque sale del mismo número. Fue
   * al revés un rato —el color por la autonomía de ahora, la raya por la de
   * crucero— y el banco enseñó por qué no: con el motor a fondo despegando, la
   * autonomía instantánea de cualquier avión baja de los cuarenta y cinco
   * minutos, y el aviso saltaba en todos los despegues. Ver
   * `comoVaElDeposito`.
   */
  private deposito(d: DatosDelTablero, cifras: boolean): void {
    this.relojDeCombustible(d, cifras);
    const g = this.pieza('[data-cristal="combustible"]');
    if (!g) return;
    if (!d.combustible) {
      poner(g, "visibility", "hidden");
      return;
    }
    poner(g, "visibility", "visible");
    const { kilos, cabe, reserva, estado } = d.combustible;
    g.classList.toggle("cr--reserva", estado === "reserva");
    g.classList.toggle("cr--poco", estado === "poco");

    const largo = Number(g.dataset.largo) || 1;
    const tumbada = g.dataset.tumbada === "1";
    const parte = (k: number) => Math.max(0, Math.min(1, k / Math.max(1, cabe)));
    const dentro = (que: string) =>
      this.pieza(`[data-cristal="combustible"] [data-combustible="${que}"]`);
    const llenar = (que: string, k: number): void => {
      const r = dentro(que);
      if (!r) return;
      const cuanto = parte(k) * largo;
      if (tumbada) poner(r, "width", n1(cuanto));
      else {
        // De pie se vacía por arriba: el suelo del rectángulo no se mueve.
        poner(r, "y", n1(largo - cuanto));
        poner(r, "height", n1(cuanto));
      }
    };
    llenar("barra", kilos);
    llenar("reserva", reserva);

    // Y la raya, que no se estira: se coloca. Ver `reglaDeCombustible`.
    const raya = dentro("raya");
    if (raya) {
      const donde = parte(reserva) * largo;
      if (tumbada) {
        poner(raya, "x1", n1(donde));
        poner(raya, "x2", n1(donde));
      } else {
        poner(raya, "y1", n1(largo - donde));
        poner(raya, "y2", n1(largo - donde));
      }
    }

    if (cifras) escribir(dentro("cifra"), String(Math.round(kilos)));
  }

  /**
   * El reloj de combustible de los de pistón: el mismo que el de la cabina.
   *
   * Sin vuelo del que decirlo no hay señal, y un instrumento sin señal no
   * marca cero: la aguja descansa en la E y la cifra se queda en blanco.
   */
  private relojDeCombustible(d: DatosDelTablero,
    cifras: boolean,
  ): void {
    const c = this.cuadro;
    const aguja = this.pieza("[data-fuel-aguja]");
    if (!c || !aguja) return;
    const kilos = d.combustible?.kilos ?? 0;
    poner(
      aguja,
      "transform",
      `rotate(${n1(anguloEn(c.combustible.barrido, enLaEscala(c.combustible, kilos)))})`,
    );
    const cifra = this.pieza("[data-fuel-cifra]");
    if (!cifra) return;
    // Sin vuelo se borra en el acto, sin esperar al turno de las cifras.
    if (cifras || !d.combustible)
      escribir(cifra, d.combustible ? String(Math.round(kilos)) : "");
    cifra.classList.toggle("cr--reserva", d.combustible?.estado === "reserva");
    cifra.classList.toggle("cr--poco", d.combustible?.estado === "poco");
  }

  /**
   * La carta: pone la pista, el eje de entrada y los otros donde toca.
   *
   * Solo mueve atributos de piezas que ya existen —las deja puestas `carta()`
   * en `cristal.ts`—: rehacer el marcado sesenta veces por segundo para cuatro
   * líneas sería pagar un repintado entero por nada.
   *
   * Y las cuentas son las de `ui/carta.ts`, las mismas que usan las pantallas
   * de la cabina. El dibujo puede ser distinto —aquí SVG, allí lienzo— pero
   * **dónde va cada cosa, no**: de eso se trataba.
   */
  private laCarta(d: DatosDelTablero, cifras: boolean): void {
    const grupo = this.pieza('[data-carta="grupo"]');
    if (!grupo) return;
    // El radio de **su** rosa, la del mapa: la primera de la página es la del
    // horizonte en el de cristal, y con ella la carta salía a otra escala.
    const radio = Number(grupo.getAttribute("data-radio")) || 120;
    /*
     * Con el rumbo **verdadero**, que es en lo que está el mundo. La rosa va
     * en magnéticos y la diferencia entre las dos es la declinación: una pista
     * rotulada 07 cae bajo el 07 de la rosa, que es lo correcto.
     */
    const dibujo = dibujarLaCarta(
      d.mapa,
      (d.estado.heading * 180) / Math.PI,
      radio,
    );
    const raya = (sel: string, a: Punto2 | null, b: Punto2 | null): void => {
      const el = this.pieza(sel);
      if (!el) return;
      if (!a || !b) {
        poner(el, "visibility", "hidden");
        return;
      }
      poner(el, "visibility", "visible");
      poner(el, "x1", n1(a.dx));
      poner(el, "y1", n1(a.dy));
      poner(el, "x2", n1(b.dx));
      poner(el, "y2", n1(b.dy));
    };
    raya(
      '[data-carta="eje"]',
      dibujo.eje?.desde ?? null,
      dibujo.eje?.hasta ?? null,
    );
    raya(
      '[data-carta="pista"]',
      dibujo.pista?.[0] ?? null,
      dibujo.pista?.[1] ?? null,
    );
    /*
     * **Los tráficos, con el símbolo del TCAS.** Rombo hueco para el que anda
     * por ahí, lleno para el que está cerca y círculo ámbar para el que
     * avisa; encima o debajo, su altura en centenas de pies, y a la derecha la
     * flecha si sube o baja deprisa. Las piezas están puestas —ver `carta` en
     * `cristal.ts`— y aquí solo se encienden. Lo que es cada uno lo decide
     * `flight/tcas.ts`, y dónde va, `ui/carta.ts`.
     */
    /*
     * **Y el que más importa, en la última pieza**, que en SVG es la que queda
     * encima. La lista viene del más importante al menos —así, si no caben
     * todos, sobran los que menos—, y repartida en ese orden el círculo ámbar
     * quedaba debajo del rombo de otro que pasaba por el mismo sitio. Visto
     * con la GPU, en Pettirossi.
     */
    const caben = dibujo.otros.slice(0, CUANTOS_OTROS);
    for (let i = 0; i < CUANTOS_OTROS; i++) {
      const otro = `[data-carta="otro-${i}"]`;
      const pieza = this.pieza(otro);
      if (!pieza) continue;
      const o = caben[caben.length - 1 - i];
      if (!o) {
        poner(pieza, "visibility", "hidden");
        continue;
      }
      poner(pieza, "visibility", "visible");
      poner(pieza, "transform", `translate(${n1(o.dx)} ${n1(o.dy)})`);
      poner(pieza, "class", `cr__trafico cr__trafico--${o.clase}`);
      const aviso = o.clase === "aviso";
      poner(
        this.pieza(`${otro} [data-tcas="rombo"]`),
        "visibility",
        aviso ? "hidden" : "inherit",
      );
      poner(
        this.pieza(`${otro} [data-tcas="circulo"]`),
        "visibility",
        aviso ? "inherit" : "hidden",
      );
      const altura = this.pieza(`${otro} [data-tcas="altura"]`);
      if (altura) {
        escribir(altura, o.etiqueta ?? "");
        // Encima si está más alto, debajo si está más bajo: la etiqueta dice
        // por dónde anda antes de leer el número.
        poner(altura, "y", o.encima ? "-10" : "18");
      }
      const flecha = this.pieza(`${otro} [data-tcas="flecha"]`);
      if (flecha) {
        const hay = o.tendencia !== 0 && !o.alBorde;
        poner(flecha, "visibility", hay ? "inherit" : "hidden");
        if (hay)
          poner(flecha, "transform", o.tendencia > 0 ? "" : "rotate(180 10 0)");
      }
    }
    /*
     * Fuera del grupo recortado: es un rótulo de la pantalla, como el rango.
     * **Y dice el modo que hay**, no solo el de en marcha: «TCAS STBY» en
     * tierra hasta el punto de espera, que una carta vacía con aviones en el
     * cielo no se entiende si no dice que el equipo está en espera. Ver
     * `modoEnPantalla` en `flight/tcas.ts`.
     */
    const modo = this.pieza('[data-carta="solo-ta"]');
    poner(modo, "visibility", dibujo.modoTcas ? "visible" : "hidden");
    if (dibujo.modoTcas) escribir(modo, dibujo.modoTcas);
    /*
     * **Y el relieve del avisador de terreno**, debajo de todo: un trazo por
     * color con todas sus celdas. Se rehace solo cuando la cuenta es otra, que
     * es pocas veces por segundo. Ver `relieveEnLaCarta` en `ui/carta.ts`.
     */
    const relieve = this.pieza('[data-carta="relieve"]');
    if (relieve && dibujo.relieve !== this.relieve) {
      this.relieve = dibujo.relieve;
      const trazos = new Map<string, string>();
      for (const c of dibujo.relieve) {
        const l = c.lado;
        trazos.set(
          c.color,
          `${trazos.get(c.color) ?? ""}M${n1(c.dx - l / 2)} ${n1(c.dy - l / 2)}h${n1(l)}v${n1(l)}h${n1(-l)}z`,
        );
      }
      relieve.innerHTML = [...trazos]
        .map(([color, d]) => `<path class="cr__relieve cr__relieve--${color}" d="${d}" />`)
        .join("");
    }
    /*
     * **Y el radar meteorológico.**
     *
     * Éste sí se rehace entero, y es la excepción del fichero: las células
     * son cuatro como mucho y cambian de sitio con el avión, así que mantener
     * piezas puestas costaría más de lo que ahorra. Todo lo demás de aquí
     * mueve atributos de piezas que ya existen. **Pero solo si ha cambiado**:
     * sin nubes se vaciaba un grupo vacío sesenta veces por segundo, y cada
     * vaciado es un repintado.
     */
    const radar = this.pieza('[data-carta="radar"]');
    if (radar) {
      const ecos = dibujo.celdas
        .flatMap((c) =>
          anillosDe(c.fuerza).map(
            ({ parte, color }) =>
              `<circle class="cr__eco cr__eco--${color}" cx="${c.dx.toFixed(1)}" cy="${c.dy.toFixed(1)}" r="${(c.radio * parte).toFixed(1)}" />`,
          ),
        )
        .join("");
      if (ecos !== this.ecos) {
        this.ecos = ecos;
        radar.innerHTML = ecos;
      }
    }

    /*
     * **Y el aeropuerto de destino**, si esta ruta lleva a otro.
     *
     * Va aquí y en el lienzo de la cabina, que es la regla de esta casa: dos
     * superficies que enseñan lo mismo se tocan las dos o no se toca ninguna.
     * Las cuentas son las mismas para las dos — ver `ui/carta.ts`.
     */
    const destino = this.pieza('[data-carta="destino"]');
    if (destino) {
      const d2 = dibujo.destino;
      poner(destino, "visibility", d2 ? "visible" : "hidden");
      if (d2) {
        poner(destino, "transform", `translate(${n1(d2.dx)} ${n1(d2.dy)})`);
        const punta = this.pieza('[data-carta="destino-punta"]');
        // La punta solo cuando está pegado al borde: dentro de la carta el
        // símbolo ya dice dónde está y una flecha encima sobra.
        poner(punta, "visibility", d2.dentro ? "hidden" : "visible");
        // Y apuntando hacia fuera, que es hacia donde queda el aeropuerto.
        if (!d2.dentro)
          poner(
            punta,
            "transform",
            `rotate(${n1((Math.atan2(d2.dx, -d2.dy) * 180) / Math.PI)})`,
          );
        escribir(this.pieza('[data-carta="destino-oaci"]'), d2.oaci ?? "");
      }
    }
    // Y el alternativo, igual pero sin punta: pegado al borde, el símbolo
    // ya dice por dónde cae, y una segunda flecha competiría con la del
    // destino, que es la que se sigue.
    const alterno = this.pieza('[data-carta="alterno"]');
    if (alterno) {
      const a2 = dibujo.alterno;
      poner(alterno, "visibility", a2 ? "visible" : "hidden");
      if (a2) {
        poner(alterno, "transform", `translate(${n1(a2.dx)} ${n1(a2.dy)})`);
        escribir(this.pieza('[data-carta="alterno-oaci"]'), a2.oaci ?? "");
      }
    }
    if (!cifras) return;
    this.texto("millas-destino",
      // Con el indicativo delante: a qué sitio son esas millas.
      dibujo.destino
        ? `${dibujo.destino.oaci ? `${dibujo.destino.oaci} ` : ""}${dibujo.destino.millas.toFixed(1)} NM`
        : "",
    );
    this.texto("rango", `${dibujo.rango} NM`);
    this.elPlan(d, dibujo);
  }

  /**
   * **El plan de vuelo en la carta**: la línea magenta por sus puntos, las
   * estrellas con su nombre, el círculo del descenso y, arriba a la derecha,
   * el punto al que se va con sus millas y —en el peldaño de cabina— su hora.
   * Las cuentas son las de `ui/carta.ts`, las mismas que la cabina. Se escribe
   * solo lo que cambia, como el resto del cuadro: ver `si-cambia.ts`.
   */
  private elPlan(
    d: DatosDelTablero,
    dibujo: ReturnType<typeof dibujarLaCarta>,
  ): void {
    const plan = dibujo.ruta;
    const linea = this.pieza('[data-carta="plan"]');
    if (linea) {
      poner(linea, "visibility", plan ? "visible" : "hidden");
      if (plan)
        poner(
          linea,
          "d",
          plan.linea
            .map((p, i) => `${i ? "L" : "M"}${n1(p.dx)} ${n1(p.dy)}`)
            .join(" "),
        );
    }
    for (let i = 0; i < CUANTOS_FIJOS; i++) {
      const pieza = this.pieza(`[data-carta="fijo-${i}"]`);
      if (!pieza) continue;
      const f = plan?.fijos[i];
      if (!f) {
        poner(pieza, "visibility", "hidden");
        continue;
      }
      poner(pieza, "visibility", "visible");
      poner(pieza, "transform", `translate(${n1(f.dx)} ${n1(f.dy)})`);
      pieza.classList.toggle("cr__fijo--activo", f.activo);
      escribir(pieza.querySelector('[data-carta="fijo-nombre"]'), f.nombre);
    }
    /*
     * **El T/C, en los reactores**, igual que el T/D: el punto de la ruta en
     * el que se llega al crucero. Es de su pantalla de navegación; el cristal
     * del turbohélice no lo pinta. Ver `puntoDeSubida` en `flight/ruta.ts`.
     */
    const tc = this.pieza('[data-carta="tc"]');
    if (tc) {
      const subida = this.familia === "linea" ? (plan?.subida ?? null) : null;
      poner(tc, "visibility", subida ? "visible" : "hidden");
      if (subida) poner(tc, "transform", `translate(${n1(subida.dx)} ${n1(subida.dy)})`);
    }
    // Y el nivel del plan, en magenta y con su «CRZ».
    this.texto("crz", plan?.crucero ? `CRZ ${plan.crucero}` : "");
    const td = this.pieza('[data-carta="td"]');
    if (td) {
      poner(td, "visibility", plan?.descenso ? "visible" : "hidden");
      if (plan?.descenso)
        poner(
          td,
          "transform",
          `translate(${n1(plan.descenso.dx)} ${n1(plan.descenso.dy)})`,
        );
    }
    /*
     * Arriba a la derecha, el punto al que se va y a cuántas millas: es lo
     * primero que se lee en una pantalla de navegación de verdad. Con misión
     * en curso manda la misión, que es a donde señala la aguja.
     */
    if (!d.objetivo)
      this.texto(
        "distancia",
        plan?.siguiente
          ? `${plan.siguiente.nombre} ${plan.siguiente.millas.toFixed(1)} NM`
          : "",
      );
    this.texto("eta", !d.objetivo && plan?.hora ? plan.hora : "");
  }

  /**
   * Cuánto acelera, en nudos por segundo, para el vector de tendencia.
   *
   * Se guarda porque la tendencia es una **derivada** y el cuadro solo recibe
   * el valor: derivarla aquí, con la velocidad del cuadro anterior, es la
   * única fuente que hay. Ver `cinta.ts`.
   */
  private aceleracion = 0;
  private nudosAntes: number | null = null;

  /** Lo llama el HUD antes de `update`, con el mismo paso de tiempo. */
  medirAceleracion(nudos: number, dt: number): void {
    if (dt > 0 && this.nudosAntes !== null) {
      /*
       * Suavizado de medio segundo: la derivada cruda de una velocidad que ya
       * viene muestreada da un vector de tendencia que baila, y un vector que
       * baila no enseña a anticipar nada.
       */
      const cruda = (nudos - this.nudosAntes) / dt;
      this.aceleracion = conRetardo(this.aceleracion, cruda, dt, 0.5);
    }
    this.nudosAntes = nudos;
  }

  /**
   * Lo que se lee en voz alta, cada tantos segundos.
   *
   * **Cada tanto y no en cada imagen**: una región viva que cambia sesenta
   * veces por segundo no se lee, se atasca — el lector empieza la frase, la
   * abandona y empieza otra, y quien escucha no se entera de nada. Cinco
   * segundos es más o menos lo que tarda en decirse, que es el único ritmo
   * que tiene sentido.
   */
  private cantar(d: DatosDelTablero, dt: number): void {
    if (!this.lectura) return;
    this.desdeLaLectura += dt;
    if (this.desdeLaLectura < ENTRE_LECTURAS) return;
    this.desdeLaLectura = 0;
    const rumbo = pad3(
      Math.round(
        (((d.estado.heading * GRADOS + (d.declinacion ?? 0)) % 360) + 360) %
          360,
      ) % 360,
    );
    this.lectura.textContent =
      `${Math.round(d.nudos)} nudos, ` +
      `${Math.round(d.pies / 10) * 10} pies, ` +
      `rumbo ${rumbo}`;
  }

  private texto(que: string, valor: string): void {
    if (!que) return;
    escribir(this.pieza(`[data-cristal="${que}"]`), valor);
  }
}

/** Cada cuánto se relee el cuadro en voz alta, en segundos. */
const ENTRE_LECTURAS = 5;

/**
 * **Cuántas veces por segundo se reescriben las cifras de apoyo**: la
 * velocidad sobre el suelo, los kilos, el régimen, el viento, las millas.
 *
 * Escritas en cada imagen, una cifra que baila entre 104 y 105 obligaba a
 * volver a maquetar y pintar su texto sesenta veces por segundo, y en el
 * cuadro abierto del teléfono eso se notaba en el fotograma. Ocho veces por
 * segundo es más de lo que se lee —una pantalla de verdad refresca sus
 * cifras a ese ritmo, justo para que se puedan leer— y la aguja de al lado
 * sigue moviéndose en cada imagen, que es lo que enseña la tendencia.
 */
const CIFRAS_POR_SEGUNDO = 8;

/** Cuántos nudos antes de la de nunca pasar se enciende el ámbar. */
const AVISA_CINCO_ANTES = 5;

/**
 * Desde qué altura sobre el suelo aparece el radioaltímetro, en pies.
 *
 * Dos mil quinientos, que es donde lo encienden los de verdad. Y por debajo de
 * doscientos se pone ámbar: ahí ya no es un dato, es un aviso.
 */
const DESDE_EL_RADIO = 2500;
const YA_ES_BAJO = 200;

function pad3(g: number): string {
  return String(((g % 360) + 360) % 360).padStart(3, "0");
}
