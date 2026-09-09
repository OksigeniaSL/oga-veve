/**
 * La geometría del esquema del ala: perfil, corriente y presiones.
 *
 * Está aparte del panel porque es la única parte del dibujo que se puede
 * comprobar sin navegador. Aquí no hay DOM: entran números y salen cadenas de
 * `d` para SVG.
 *
 * ## El perfil es un perfil de verdad
 *
 * Un NACA 2412: la misma familia que lleva media aviación general y, en
 * concreto, el ala de la avioneta que se está volando. No cuesta más que
 * dibujar una lenteja —son dos polinomios— y sí cambia algo: la curvatura del
 * extradós es la que explica el pico de succión, y una lenteja simétrica no
 * lo explicaría.
 *
 * ## Y la corriente se dibuja, no se simula
 *
 * No hace falta resolver nada. Cada línea de corriente se desplaza según lo
 * que tenga debajo —el grosor y la incidencia del perfil— con el efecto
 * **decayendo con la distancia**, y detrás del ala baja: eso es la estela. De
 * ahí salen solas las dos cosas que hay que ver: que arriba las líneas se
 * aprietan, porque la de al lado del perfil se mueve mucho y la de arriba del
 * todo casi nada, y que **el ala manda aire hacia abajo**, que es la otra
 * mitad de por qué sube.
 */

import type { Presion } from "../flight/ala";

/** El lienzo del esquema, en unidades de usuario. */
export const ANCHO = 320;
export const ALTO = 180;

/** La cuerda del perfil dibujado, y dónde está su borde de ataque. */
export const CUERDA = 150;
export const BORDE_DE_ATAQUE_X = 78;
/** La línea de la cuerda, a media altura. */
export const EJE_Y = 96;
/** Se gira alrededor del cuarto de cuerda, que es donde gira un ala. */
export const CENTRO_DE_GIRO = 0.25;

/** Espesor y curvatura del NACA 2412, en fracción de cuerda. */
const ESPESOR = 0.12;
const CURVATURA = 0.02;
const DONDE_LA_CURVATURA = 0.4;

export interface Punto {
  readonly x: number;
  readonly y: number;
}

/** Medio espesor del perfil a lo largo de la cuerda, en fracción. */
function medioEspesor(t: number): number {
  return (
    5 *
    ESPESOR *
    (0.2969 * Math.sqrt(t) -
      0.126 * t -
      0.3516 * t * t +
      0.2843 * t * t * t -
      // El último coeficiente cierra el borde de salida en un punto. El de la
      // tabla original —0,1015— lo deja abierto, y en un dibujo grande eso se
      // ve como un ala partida por detrás.
      0.1036 * t * t * t * t)
  );
}

/** Y la línea de curvatura, que es lo que hace que un ala no sea simétrica. */
function combadura(t: number): number {
  const p = DONDE_LA_CURVATURA;
  if (t <= p) return (CURVATURA / (p * p)) * (2 * p * t - t * t);
  const q = 1 - p;
  return (CURVATURA / (q * q)) * (1 - 2 * p + 2 * p * t - t * t);
}

/**
 * El perfil, en fracción de cuerda y con el eje `y` hacia arriba.
 *
 * Se devuelve en coordenadas del ala —no de la pantalla— para poder girarlo
 * después sin repetir la cuenta.
 */
export function perfil(cuantos = 60): {
  readonly arriba: Punto[];
  readonly abajo: Punto[];
} {
  const arriba: Punto[] = [];
  const abajo: Punto[] = [];
  for (let i = 0; i <= cuantos; i++) {
    // Reparto por coseno: muchos puntos donde la curva es cerrada —el borde de
    // ataque— y pocos donde es recta. Con reparto uniforme el morro del perfil
    // sale poligonal, que es justo donde se mira.
    const t = 0.5 * (1 - Math.cos((Math.PI * i) / cuantos));
    const e = medioEspesor(t);
    const c = combadura(t);
    arriba.push({ x: t, y: c + e });
    abajo.push({ x: t, y: c - e });
  }
  return { arriba, abajo };
}

/** Gira un punto del ala y lo pasa a coordenadas de pantalla. */
export function aPantalla(p: Punto, alfaGrados: number): Punto {
  const a = (alfaGrados * Math.PI) / 180;
  const dx = p.x - CENTRO_DE_GIRO;
  const dy = p.y;
  // Ángulo de ataque positivo es morro arriba: el borde de ataque sube, y en
  // pantalla subir es restar.
  const gx = dx * Math.cos(a) + dy * Math.sin(a);
  const gy = -dx * Math.sin(a) + dy * Math.cos(a);
  return {
    x: BORDE_DE_ATAQUE_X + (gx + CENTRO_DE_GIRO) * CUERDA,
    y: EJE_Y - gy * CUERDA,
  };
}

const dos = (n: number): string => (Math.round(n * 100) / 100).toString();

/** Una lista de puntos como `d` de SVG. */
export function trazo(puntos: readonly Punto[], cerrado = false): string {
  if (puntos.length === 0) return "";
  const partes = puntos.map(
    (p, i) => `${i === 0 ? "M" : "L"}${dos(p.x)} ${dos(p.y)}`,
  );
  return partes.join(" ") + (cerrado ? " Z" : "");
}

/** El contorno del perfil girado, listo para pintar. */
export function contorno(alfaGrados: number): string {
  const { arriba, abajo } = perfil();
  const vuelta = [...arriba, ...[...abajo].reverse()];
  return trazo(
    vuelta.map((p) => aPantalla(p, alfaGrados)),
    true,
  );
}

/** Cuánto baja la estela por unidad de sustentación, en unidades de lienzo. */
const BAJADA_POR_CL = 15;
/** A qué distancia deja de notarse el ala, en unidades de lienzo. */
const ALCANCE = 62;
/** Y a qué distancia por delante y por detrás se entera el aire de que hay ala. */
const SE_ENTERA_ANTES = 46;

/**
 * Una línea de corriente que entra por la izquierda a la altura `entrada`.
 *
 * `entrada` va en unidades de pantalla respecto al eje: negativo es por
 * encima del ala. Lo que hace que el dibujo se entienda es que el
 * desplazamiento **decae con la distancia**: la línea que roza el perfil se
 * curva entera y la de arriba del todo apenas se entera, y entre las dos las
 * de arriba quedan más juntas de lo que entraron.
 */
export function corriente(
  entrada: number,
  alfaGrados: number,
  cl: number,
  separacion: number,
  cuantos = 48,
): string {
  const { arriba, abajo } = perfil(40);
  const arribaP = arriba.map((p) => aPantalla(p, alfaGrados));
  const abajoP = abajo.map((p) => aPantalla(p, alfaGrados));
  const salidaX = aPantalla({ x: 1, y: 0 }, alfaGrados).x;
  const encima = entrada < 0;
  const superficie = encima ? arribaP : abajoP;
  const yBase = EJE_Y + entrada;

  /**
   * Cuánto se aparta la corriente del camino recto en una `x`.
   *
   * Decae con la distancia a la piel, y de ese decaimiento salen las dos
   * cosas que hay que ver: que la línea de al lado del perfil se curva entera
   * mientras la de arriba del todo casi no se entera, y que por eso **arriba
   * las líneas se aprietan**.
   */
  const bordes = [superficie[0]!.x, superficie[superficie.length - 1]!.x];
  const morro = Math.min(...bordes);
  const cola = Math.max(...bordes);
  const apartarse = (x: number): number => {
    const piel = alturaEn(superficie, x);
    if (piel !== null) {
      return (piel - yBase) * Math.exp(-Math.abs(yBase - piel) / ALCANCE);
    }
    /*
     * **Delante del ala y detrás también hay ala.**
     *
     * Fuera del perfil el desplazamiento valía cero de golpe, y eso se veía:
     * las líneas llegaban rectas hasta el borde de ataque y ahí pegaban un
     * escalón. El aire no hace eso — se entera de que hay un ala **antes de
     * llegar**, que es de hecho por qué existe la circulación. Así que el
     * desplazamiento del borde se estira hacia afuera y se apaga con la
     * distancia.
     */
    const borde = x < morro ? morro : cola;
    const lejos = Math.abs(x - borde);
    const enElBorde = alturaEn(superficie, borde);
    if (enElBorde === null) return 0;
    const suyo =
      (enElBorde - yBase) * Math.exp(-Math.abs(yBase - enElBorde) / ALCANCE);
    return suyo * Math.exp(-lejos / SE_ENTERA_ANTES);
  };

  /*
   * Y dónde se suelta el flujo de la piel, si es que se suelta. Detrás de ese
   * punto la línea **deja de seguir el ala**: se queda por donde iba y por
   * debajo quedan los remolinos. Eso es una pérdida vista desde fuera — el
   * aire ya no se entera de que ahí hay un ala.
   */
  const corteX = encima
    ? aPantalla({ x: separacion, y: 0 }, alfaGrados).x
    : Infinity;
  const congelado = separacion < 1 ? apartarse(corteX) : 0;

  const puntos: Punto[] = [];
  for (let i = 0; i <= cuantos; i++) {
    const x = (i / cuantos) * ANCHO;
    const apartar = x > corteX ? congelado : apartarse(x);
    // Y la estela: detrás del ala, todo baja. Es la otra mitad de por qué
    // sube el ala, y por eso se dibuja aunque no se pregunte por ella.
    puntos.push({ x, y: yBase + apartar + bajada(x, salidaX, cl) });
  }
  return trazo(puntos);
}

/** Cuánto ha bajado la corriente en `x`, con el ala saliendo en `salidaX`. */
export function bajada(x: number, salidaX: number, cl: number): number {
  const total = BAJADA_POR_CL * Math.max(cl, 0);
  // Empieza a bajar ya sobre el ala —el aire se entera antes de llegar al
  // borde de salida— y termina de bajar un poco detrás.
  const t = (x - (salidaX - CUERDA * 0.5)) / (CUERDA * 0.9);
  if (t <= 0) return 0;
  if (t >= 1) return total;
  // Un escalón suave, sin esquinas: la corriente no dobla, se curva.
  return total * (t * t * (3 - 2 * t));
}

/** La altura de una superficie del perfil en una `x` de pantalla, o `null`. */
export function alturaEn(
  superficie: readonly Punto[],
  x: number,
): number | null {
  let previo: Punto | null = null;
  for (const p of superficie) {
    if (previo) {
      const a = Math.min(previo.x, p.x);
      const b = Math.max(previo.x, p.x);
      if (x >= a && x <= b) {
        const k = b === a ? 0 : (x - previo.x) / (p.x - previo.x);
        return previo.y + (p.y - previo.y) * k;
      }
    }
    previo = p;
  }
  return null;
}

/** Cuánto lienzo ocupa un coeficiente de presión de uno. */
const ALTO_POR_CP = 17;

/**
 * La envolvente de presiones sobre una cara del perfil.
 *
 * Se dibuja **normal a la piel**, que es como se dibuja en cualquier libro y
 * como se entiende: la altura de la curva sobre el ala es cuánto chupa o
 * cuánto empuja ahí. Sale cerrada contra la propia piel para poder rellenarla
 * de color.
 */
export function envolvente(
  lecturas: readonly Presion[],
  alfaGrados: number,
  encima: boolean,
): string {
  const { arriba, abajo } = perfil(60);
  const piel = encima ? arriba : abajo;
  const dentro: Punto[] = [];
  const fuera: Punto[] = [];
  for (const l of lecturas) {
    const y = alturaEn(piel, l.x);
    if (y === null) continue;
    const base = { x: l.x, y };
    dentro.push(aPantalla(base, alfaGrados));
    // El signo manda hacia dónde sale: chupar tira de la piel hacia afuera.
    const fueraDe = encima ? -l.cp : l.cp;
    fuera.push(
      aPantalla(
        {
          x: l.x,
          y: y + ((encima ? 1 : -1) * (fueraDe * ALTO_POR_CP)) / CUERDA,
        },
        alfaGrados,
      ),
    );
  }
  if (dentro.length === 0) return "";
  return trazo([...fuera, ...dentro.reverse()], true);
}
