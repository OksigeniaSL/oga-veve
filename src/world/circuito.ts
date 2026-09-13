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
 * ## Por la izquierda, salvo que haya una montaña
 *
 * El circuito estándar es a la izquierda en todo el mundo, y no es un
 * capricho: el comandante se sienta a la izquierda y desde ahí ve la pista por
 * su ventanilla durante toda la vuelta. Hay campos con circuito a la derecha
 * —por un pueblo, por una montaña, por un aeropuerto vecino— y se publican
 * como excepción.
 *
 * **Aquí era izquierda y punto, y en La Palma eso se ve.** Lo dijo quien lo
 * juega, volando allí: «¿de verdad siempre es con la pista en paralelo a la
 * izquierda? ¿No es más seguro sobrevolar el mar, porque hay menos
 * obstáculos?». Pues sí: la pista corre pegada a la costa con la isla
 * subiendo por un lado y el mar por el otro, y el circuito de la izquierda te
 * mete el viento en cola por encima de la ladera.
 *
 * Así que la mano **se decide mirando el terreno**, que es exactamente el
 * motivo por el que un campo de verdad publica el circuito al revés. Ver
 * `manoDelCircuito`: se mide cuánto se separa del suelo el tramo de viento en
 * cola por cada lado y se vuela por donde hay sitio. Y con empate gana la
 * izquierda, porque la izquierda es la norma y una regla no se rompe por diez
 * metros.
 *
 * No hace falta ninguna carta ni ningún dato nuevo: el juego ya tiene el
 * relieve de verdad de cada aeródromo.
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
 * Cuánto más grande es el circuito de **este** avión que el del entrenador.
 *
 * Todo lo de arriba son metros medidos para una avioneta que se aproxima a
 * treinta y tres metros por segundo, y así estuvo bien mientras la flota
 * fueron dos avionetas. Con el reactor y el de fuselaje ancho deja de estarlo,
 * y no por poco: el JAZ 120 vuela el mismo circuito a ciento cuarenta metros
 * por segundo, así que **el viento en cola entero le dura siete segundos**
 * donde al Pykasu le dura treinta y tres. Medido en La Palma: no llega a
 * doscientos noventa metros de altura en toda la vuelta, entra en final a dos
 * kilómetros y medio todavía a cien metros por segundo, y se come la montaña.
 *
 * > «El vuelo para dar una vuelta y volver a aterrizar me parece que es muy
 * > corto, no le da tiempo a descender y perder potencia.»
 *
 * Es exactamente eso, y es lo que pasa de verdad: **un circuito no se mide en
 * metros, se mide en tiempo**. El de un reactor de línea tiene la misma forma
 * y el mismo minuto por tramo que el de una avioneta, y por eso es tres o
 * cuatro veces más largo. Así que la figura se estira con la velocidad de
 * aproximación del avión, que es la que dice a qué ritmo se vuela esa parte.
 *
 * Nunca se encoge: con el biplano —que se aproxima más despacio que el
 * entrenador— el circuito se queda como está, porque lo que sobra de circuito
 * no molesta y lo que falta mata.
 */
const APROXIMACION_DEL_ENTRENADOR = 33;

export function escalaDeCircuito(aproximacion: number): number {
  return Math.max(1, aproximacion / APROXIMACION_DEL_ENTRENADOR);
}

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
export type Mano = "izquierda" | "derecha";

export interface Pista {
  x: number;
  z: number;
  heading: number;
  length: number;
}

/**
 * Cuánto separa del suelo el viento en cola volado por un lado, en metros.
 *
 * Es la cuenta que decide la mano, y es la de un piloto: el tramo largo del
 * circuito se vuela a `ALTURA_DE_CIRCUITO` sobre la pista, así que lo que
 * importa es **cuánto sube el terreno por debajo de él**. Se devuelve lo peor
 * de todo el tramo, que es lo único que cuenta cuando se habla de despejado.
 */
export function holguraDelViento(
  runway: Pista,
  cotaDePista: number,
  suelo: (x: number, z: number) => number,
  mano: Mano,
): number {
  const h = (runway.heading * Math.PI) / 180;
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const signo = mano === "izquierda" ? 1 : -1;
  const ix = -Math.cos(h) * signo;
  const iz = -Math.sin(h) * signo;
  const medio = runway.length / 2;
  const desde = medio + RECTO_TRAS_LA_PISTA;
  const hasta = -medio - ENTRADA_EN_FINAL;
  let peor = Infinity;
  // Veinte catas a lo largo del tramo: con mil metros de separación y tres
  // kilómetros de largo, es una cada ciento cincuenta metros.
  for (let k = 0; k <= 20; k++) {
    const a = desde + ((hasta - desde) * k) / 20;
    const x = runway.x + fx * a + ix * SEPARACION;
    const z = runway.z + fz * a + iz * SEPARACION;
    peor = Math.min(peor, cotaDePista + ALTURA_DE_CIRCUITO - suelo(x, z));
  }
  return peor;
}

/**
 * Por qué lado se vuela el circuito de esta pista.
 *
 * Izquierda, que es la norma, **salvo que por la derecha haya bastante más
 * sitio**. Bastante es `VENTAJA`: mover un circuito de lado es cambiar una
 * regla que todo el mundo conoce, y eso no se hace por unos metros.
 *
 * Sin terreno que mirar —una prueba, un escenario sin relieve— izquierda.
 *
 * ## Lo medido, sobre el relieve de verdad de los nueve campos
 *
 * Holgura del viento en cola por cada lado, por las dos cabeceras:
 *
 *     yvytu-rape      140°  izq 232  der 207      320°  izq 217  der 219
 *     pettirossi      192°  izq 229  der 238       12°  izq 237  der 229
 *     guarani          41°  izq 239  der 236      221°  izq 239  der 239
 *     encarnacion      12°  izq 142  der 163      192°  izq 154  der 140
 *     estigarribia    178°  izq 247  der 244      358°  izq 245  der 247
 *     pedro-juan       14°  izq 256  der 255      194°  izq 255  der 257
 *     tenerife-norte  291°  izq 160  der 169      111°  izq 173  der 162
 *     la-palma        179°  izq 275  der  32      359°  izq  27  der 275
 *     cuatro-vientos  274°  izq 239  der 243       94°  izq 237  der 239
 *
 * **Ocho de los nueve no se enteran de esto**: son llanos, las dos holguras se
 * parecen en menos de treinta metros y se quedan por la izquierda de siempre.
 *
 * Y **La Palma cambia de mano con la cabecera**, que es el campo que hizo
 * falta. La pista corre pegada a la costa con la isla subiendo por un lado y
 * el Atlántico por el otro, así que el lado bueno no es el mismo despegando
 * al norte que al sur: con la izquierda de siempre, salir hacia el norte te
 * mandaba a volar el viento en cola con **veintisiete metros** por encima de
 * la isla. Eso no es holgura, es la ladera. Los doscientos setenta y cinco del
 * otro lado son el mar.
 *
 * Lo dijo quien lo juega volando allí: «¿de verdad siempre es con la pista en
 * paralelo a la izquierda? ¿No es más seguro sobrevolar el mar, porque hay
 * menos obstáculos?».
 */
export function manoDelCircuito(
  runway: Pista,
  cotaDePista: number,
  suelo?: (x: number, z: number) => number,
): Mano {
  if (!suelo) return "izquierda";
  const izq = holguraDelViento(runway, cotaDePista, suelo, "izquierda");
  const der = holguraDelViento(runway, cotaDePista, suelo, "derecha");
  return der > izq + VENTAJA ? "derecha" : "izquierda";
}

/**
 * Cuánta holgura de más tiene que dar la derecha para ganarse el circuito, m.
 *
 * Cien metros. Es un tercio de la altura del circuito: por debajo de eso, los
 * dos lados son el mismo lado y manda la norma.
 */
const VENTAJA = 100;

export function verticesDelCircuito(
  runway: Pista,
  cotaDePista: number,
  mano: Mano = "izquierda",
  escala = 1,
): PuntoDeCircuito[] {
  const h = (runway.heading * Math.PI) / 180;
  // Hacia dónde se despega, y qué es la izquierda desde ahí. Con el circuito
  // por la derecha es lo mismo con el signo cambiado, y nada más.
  const fx = Math.sin(h);
  const fz = -Math.cos(h);
  const signo = mano === "izquierda" ? 1 : -1;
  const ix = -Math.cos(h) * signo;
  const iz = -Math.sin(h) * signo;
  const medio = runway.length / 2;

  /** Un punto a `a` metros por delante del centro y `l` hacia la mano. */
  const en = (a: number, l: number, alto: number): PuntoDeCircuito => ({
    x: runway.x + fx * a + ix * l,
    y: cotaDePista + alto,
    z: runway.z + fz * a + iz * l,
  });

  const recto = RECTO_TRAS_LA_PISTA * escala;
  const separacion = SEPARACION * escala;
  const entrada = ENTRADA_EN_FINAL * escala;
  /*
   * **Y la altura sale de la senda, no de otro factor.**
   *
   * Estirar la figura sin subirla dejaría la base cayendo casi nada: el avión
   * llegaría al punto de entrada en final **por debajo** de la senda de tres
   * grados, que a cinco kilómetros y medio del umbral pasa por trescientos
   * metros. Así que el circuito va a lo que pide la senda ahí, más ciento
   * cincuenta metros de base para bajarlos — y nunca por debajo de los
   * doscientos cincuenta de siempre.
   *
   * Con el entrenador la cuenta da doscientos cuarenta y cuatro y manda el
   * suelo, así que **el circuito de la avioneta no se mueve ni un metro**. Con
   * el JAZ 120 da cuatrocientos sesenta: mil quinientos pies, que es
   * exactamente la altura de circuito de un avión de línea.
   */
  const circuito = Math.max(
    ALTURA_DE_CIRCUITO,
    entrada * Math.tan(SENDA) + 150,
  );
  return [
    // La cabecera de salida, a ras de pista: el circuito empieza en el suelo.
    en(-medio, 0, 0),
    // Final de la subida, ya a la altura del circuito.
    en(medio + recto, 0, circuito),
    // La esquina de allá: fin del viento cruzado.
    en(medio + recto, separacion, circuito),
    // La esquina de acá: fin del viento en cola, empieza la base.
    en(-medio - entrada, separacion, circuito),
    // Y la entrada en final, sobre el eje y ya en la senda de los aros.
    en(-medio - entrada, 0, entrada * Math.tan(SENDA)),
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
  runway: Pista,
  cotaDePista: number,
  suelo?: (x: number, z: number) => number,
  escala = 1,
): Circuito {
  const vertices = verticesDelCircuito(
    runway,
    cotaDePista,
    manoDelCircuito(runway, cotaDePista, suelo),
    escala,
  );
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
      // Y el ancho con el que se cuenta «estoy en el circuito» crece con la
      // figura: en un circuito tres veces más largo, mil doscientos metros
      // son un pasillo estrecho.
      const ancho = EN_EL_CIRCUITO * escala;
      let menor = ancho * ancho;
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
