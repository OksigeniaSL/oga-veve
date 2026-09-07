/**
 * El circuito de tráfico: la vuelta que se da alrededor de una pista.
 *
 * Hasta hoy el juego enseñaba dos maniobras sueltas —despegar y aterrizar— y
 * entre las dos había un limbo: te ibas, dabas una vuelta por donde te parecía
 * y volvías a buscar la pista como podías. Un piloto no aprende así. Lo
 * primero que hace, y lo que repite cien veces antes de ir a ninguna parte, es
 * **el circuito**: se despega, se sube recto, se gira a la izquierda, se vuela
 * al lado de la pista en sentido contrario, se gira otra vez y ya se está en
 * final. Siempre igual, siempre a la izquierda, siempre a la misma altura.
 *
 * Y es lo que convierte el aterrizaje en algo que se puede practicar: se toca,
 * se da gas, se despega y noventa segundos después se está otra vez en final.
 * En una escuela eso tiene nombre —**toques y despegues**— y es la tarde
 * entera de quien está aprendiendo.
 *
 * ## Los cuatro tramos, con sus nombres de verdad
 *
 * 1. **Subida** (*upwind*): recto, por el eje de la pista, subiendo.
 * 2. **Viento cruzado** (*crosswind*): el primer giro a la izquierda.
 * 3. **Viento en cola** (*downwind*): paralelo a la pista, al revés, ya a la
 *    altura del circuito. Es el tramo largo y el que da tiempo a pensar.
 * 4. **Base**: el segundo giro, bajando, apuntando al eje.
 *
 * Y después, final, que ya lo dibujan los aros y el hilo de la senda: ver
 * `runway-guide.ts`. El circuito se acaba justo donde empieza aquello, y por
 * eso el último punto de la base es el primero de la senda.
 *
 * ## Por la izquierda
 *
 * El circuito estándar es a la izquierda en todo el mundo, y no es un
 * capricho: el comandante se sienta a la izquierda y desde ahí ve la pista por
 * su ventanilla durante toda la vuelta. Hay campos con circuito a la derecha
 * —por un pueblo, por una montaña, por un aeropuerto vecino— y se publican
 * como excepción. Aquí, izquierda.
 *
 * ## Y se dibuja igual que la senda
 *
 * Un hilo de puntos, del mismo ocre que dice «por aquí» en el resto del juego.
 * No es una carretera ni un tubo: es la misma gramática de las rayas del suelo
 * levantada al aire, y ya está probada. Ver `hiloDeLaSenda`.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Points,
  PointsMaterial,
} from "three";

/** Un punto del circuito, en coordenadas de mundo. */
export interface PuntoDeCircuito {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Los tramos, en el orden en que se vuelan. */
export const TRAMOS = ["subida", "cruzado", "encola", "base"] as const;
export type TramoDeCircuito = (typeof TRAMOS)[number];

/**
 * Altura del circuito sobre la pista, m.
 *
 * Doscientos cincuenta, que son unos ochocientos pies. Mil pies es lo normal
 * en un aeropuerto y ochocientos lo que se vuela en muchos campos pequeños, y
 * aquí además hay un motivo de juego: desde doscientos cincuenta metros la
 * pista se ve entera desde el viento en cola, y desde trescientos ya cuesta
 * distinguirla del campo.
 */
export const ALTURA_DE_CIRCUITO = 250;

/**
 * Cuánto se separa el viento en cola del eje de la pista, m.
 *
 * Mil metros: poco más de media milla náutica, que es la separación de un
 * circuito de avioneta de verdad. Y es la distancia a la que la pista todavía
 * se ve por la ventanilla sin girar la cabeza — que es justamente para lo que
 * se elige.
 */
const SEPARACION = 1000;

/**
 * Cuánto se sigue recto pasado el final de la pista antes de girar, m.
 *
 * Mil doscientos. En un avión de verdad el primer giro se da al pasar el final
 * de la pista **y** tener quinientos pies; aquí manda la distancia, que es lo
 * que se puede dibujar. Ver `alturaEn`.
 */
const RECTO_TRAS_LA_PISTA = 1200;

/**
 * A qué distancia del umbral se entra en final, m.
 *
 * Mil ochocientos: ahí la senda de tres grados pasa a noventa y cuatro metros
 * sobre la pista, así que la base baja desde los doscientos cincuenta del
 * circuito hasta engancharla. Es también donde está el segundo aro de la
 * senda, y eso no es casualidad: **el circuito tiene que morir donde empieza
 * lo que ya estaba dibujado**, o serían dos caminos distintos para lo mismo.
 */
export const ENTRADA_EN_FINAL = 1800;

/** La senda de planeo, en radianes. La misma que la de los aros. */
const SENDA = (3 * Math.PI) / 180;

/** Cada cuánto se pone un punto del hilo, m. */
const PASO = 45;

/** El ocre de «por aquí», el mismo de los aros y del hilo de la senda. */
const OCRE = 0xdd923f;

/**
 * Hasta qué distancia del circuito se considera que se está volando en él, m.
 *
 * Mil doscientos. Más ancho y volar campo a través en dirección contraria
 * contaría como estar en el tramo de al lado; más estrecho y salirse un poco
 * —que es lo normal— dejaría de contar justo cuando el aviso hace falta.
 */
const EN_EL_CIRCUITO = 1200;

/**
 * Los vértices del circuito, en orden de vuelo.
 *
 * Cinco: el umbral de salida, el final de la subida, la esquina lejana, la
 * esquina de la base y la entrada en final. Los cuatro tramos son los cuatro
 * huecos entre ellos.
 */
export function verticesDelCircuito(
  runway: { x: number; z: number; heading: number; length: number },
  cotaDePista: number,
): PuntoDeCircuito[] {
  const h = (runway.heading * Math.PI) / 180;
  // Hacia dónde se despega, y qué es la izquierda desde ahí.
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const ix = -Math.cos(h);
  const iz = -Math.sin(h);
  const medio = runway.length / 2;

  /** Un punto a `a` metros por delante del centro y `l` a la izquierda. */
  const en = (a: number, l: number, alto: number): PuntoDeCircuito => ({
    x: runway.x + fx * a + ix * l,
    y: cotaDePista + alto,
    z: runway.z + fz * a + iz * l,
  });

  const circuito = ALTURA_DE_CIRCUITO;
  return [
    // La cabecera de salida, a ras de pista: el circuito empieza en el suelo.
    en(-medio, 0, 0),
    // Final de la subida, ya a la altura del circuito.
    en(medio + RECTO_TRAS_LA_PISTA, 0, circuito),
    // La esquina de allá: fin del viento cruzado.
    en(medio + RECTO_TRAS_LA_PISTA, SEPARACION, circuito),
    // La esquina de acá: fin del viento en cola, empieza la base.
    en(-medio - ENTRADA_EN_FINAL, SEPARACION, circuito),
    // Y la entrada en final, sobre el eje y ya en la senda de los aros.
    en(-medio - ENTRADA_EN_FINAL, 0, ENTRADA_EN_FINAL * Math.tan(SENDA)),
  ];
}

export interface Circuito {
  readonly grupo: Group;
  /** Los cinco vértices, por si alguien —el banco— quiere medirlos. */
  readonly vertices: readonly PuntoDeCircuito[];
  /**
   * En qué tramo está el avión, o `null` si anda lejos del circuito.
   *
   * Se resuelve por el punto más cercano de la línea quebrada, igual que hace
   * el coche del sígame con la ruta de rodaje: es lo único que funciona sin
   * pedirle al jugador que haga las cosas en orden, y quien juega no las hace
   * en orden.
   */
  tramoEn(x: number, z: number): TramoDeCircuito | null;
  dispose(): void;
}

/**
 * Monta el circuito de una pista.
 *
 * `cotaDePista` es la cota del asfalto, no la del terreno de debajo: el
 * circuito se vuela a una altura sobre **la pista**, que es lo que se mira
 * para saber si se va alto o bajo, y en un campo con lomas el suelo de debajo
 * no dice nada.
 */
export function crearCircuito(
  runway: { x: number; z: number; heading: number; length: number },
  cotaDePista: number,
  suelo?: (x: number, z: number) => number,
): Circuito {
  const vertices = verticesDelCircuito(runway, cotaDePista);
  const grupo = new Group();
  grupo.name = "circuito";

  const puntos: number[] = [];
  for (let i = 1; i < vertices.length; i++) {
    const a = vertices[i - 1]!;
    const b = vertices[i]!;
    const largo = Math.hypot(b.x - a.x, b.z - a.z);
    const cuantos = Math.max(1, Math.round(largo / PASO));
    for (let k = 0; k < cuantos; k++) {
      const t = k / cuantos;
      puntos.push(
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t,
      );
    }
  }
  const ultimo = vertices[vertices.length - 1]!;
  puntos.push(ultimo.x, ultimo.y, ultimo.z);

  /*
   * **Y las esquinas llevan poste.**
   *
   * Un hilo de puntos a tu misma altura se ve como una fila de puntos pegada
   * al horizonte, y desde ahí no se lee dónde hay que girar: se lee que hay
   * algo delante. Lo que hace falta saber en un circuito es **dónde está la
   * esquina**, así que cada una lleva su columna de puntos desde el suelo
   * hasta la altura del circuito.
   *
   * Es lo mismo que hace un piloto de verdad, que no mira al aire: mira un
   * punto del suelo —un pueblo, un depósito, un cruce— y gira ahí. Aquí el
   * punto del suelo se dibuja, porque el campo paraguayo no tiene depósitos.
   */
  if (suelo) {
    for (const v of vertices.slice(1, 4)) {
      const abajo = suelo(v.x, v.z);
      for (let y = abajo + 15; y < v.y; y += 25) puntos.push(v.x, y, v.z);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(puntos, 3));
  const material = new PointsMaterial({
    color: OCRE,
    // Tamaño fijo en pantalla, como el hilo de la senda: un punto que se
    // encoge con la distancia desaparece justo cuando hay que ver la vuelta
    // entera, que es al principio.
    size: 5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const hilo = new Points(geo, material);
  hilo.name = "hilo-del-circuito";
  hilo.renderOrder = 1;
  grupo.add(hilo);

  return {
    grupo,
    vertices,
    tramoEn(x, z) {
      let mejor: TramoDeCircuito | null = null;
      let menor = EN_EL_CIRCUITO * EN_EL_CIRCUITO;
      for (let i = 1; i < vertices.length; i++) {
        const a = vertices[i - 1]!;
        const b = vertices[i]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const largo2 = dx * dx + dz * dz;
        if (largo2 < 1) continue;
        const t = Math.max(
          0,
          Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / largo2),
        );
        const px = a.x + dx * t;
        const pz = a.z + dz * t;
        const d = (x - px) ** 2 + (z - pz) ** 2;
        if (d < menor) {
          menor = d;
          mejor = TRAMOS[i - 1] ?? null;
        }
      }
      return mejor;
    },
    dispose() {
      geo.dispose();
      material.dispose();
    },
  };
}
