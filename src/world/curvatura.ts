/**
 * La Tierra curva, solo en el dibujo.
 *
 * El mundo de este juego es plano: la física, las colisiones, `sampleHeight`
 * y los rayos de los botones de cabina viven en un plano, y así se quedan.
 * Pero **lo que se ve** desde ocho mil pies no es un plano, y se notaba:
 * volando al atardecer de Gran Canaria a Tenerife, «se está viendo la parte
 * del sol que ya está oculta como si el planeta fuera traslúcido». Era
 * exactamente eso. En un mundo plano el horizonte está en la horizontal a
 * cualquier altura, el sol se corta en la horizontal, y entre el borde del
 * agua y esa horizontal quedaba una franja de «mar» del color del cielo que
 * se leía como cielo: el sol cortado por una raya recta por encima de la
 * costa de enfrente.
 *
 * En la Tierra de verdad, desde una altura `h`:
 *
 * - el horizonte del mar está **por debajo** de la horizontal un ángulo
 *   δ ≈ √(2h/R) —a 2 440 m, 1,6°—, y el sol se pone cuando baja de ahí, no
 *   de cero;
 * - lo lejano cae `d²/2R` —a cien kilómetros, 785 m—, así que desde Gran
 *   Canaria se ve el Teide y la costa de Tenerife se esconde detrás del mar.
 *
 * Es lo que un niño va a reconocer el día que se asome a la ventanilla, y
 * lo que hace cualquier simulador: **curvar el dibujo, no la física**. Cada
 * vértice baja `d²/2R` según su distancia horizontal al ojo, en el último
 * paso antes de proyectarlo. Cerca del avión la caída no existe —a un
 * kilómetro son ocho centímetros, a cien metros menos de un milímetro— y por
 * eso la física plana y el dibujo curvo no se pelean: donde se toca el suelo
 * son la misma cosa.
 *
 * Se hace parcheando el trozo de three.js que proyecta los vértices
 * (`project_vertex`), así que lo heredan todos los materiales de serie y los
 * que se cuelgan de ellos con `onBeforeCompile` —el grano del suelo, las
 * luces, el fundido del vecino— sin tocarlos. Los dos `ShaderMaterial` del
 * cielo van a mano: el agua incluye el mismo trozo y la cúpula no lo lleva,
 * porque está en el infinito y lo suyo es saber dónde cae el horizonte —ver
 * `sky.ts`—.
 */

import {
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderChunk,
} from "three";

/** Radio medio de la Tierra, m. */
export const RADIO_DE_LA_TIERRA = 6_371_000;

/**
 * Si el dibujo se curva. Para comparar, se apaga aquí o con `?curvatura=0`
 * en la dirección —ver `main.ts`—: el mundo vuelve a ser plano de punta a
 * punta, cúpula incluida.
 */
export const CURVAR_EL_DIBUJO = true;

/** Lo que baja cada metro cuadrado de distancia: `1 / 2R`. */
export const CAIDA_POR_METRO_CUADRADO = 1 / (2 * RADIO_DE_LA_TIERRA);

/**
 * Cuánto cae lo que está a `d` metros en horizontal, m.
 *
 * Es la parábola que aproxima la esfera cerca del ojo: a cien kilómetros se
 * aparta de la esfera de verdad en menos de una parte en diez mil, y a
 * cuatrocientos, en una en mil. Y tiene una ventaja que la esfera no tiene:
 * la misma cuenta cabe en un vértice y en la cúpula, y las dos dan el mismo
 * horizonte al milímetro.
 */
export function caida(d: number): number {
  return d * d * CAIDA_POR_METRO_CUADRADO;
}

/**
 * A qué distancia está el horizonte del mar desde `h` metros sobre él, m.
 *
 * √(2Rh): desde una playa, con los ojos a metro y medio, cuatro kilómetros
 * y pico; desde ocho mil pies, ciento setenta y seis.
 */
export function distanciaAlHorizonte(h: number): number {
  return Math.sqrt(2 * RADIO_DE_LA_TIERRA * Math.max(0, h));
}

/**
 * Cuánto baja el horizonte del mar de la horizontal, en radianes.
 *
 * Con la parábola de `caida`, la dirección rasante al mar tiene de pendiente
 * exactamente √(2h/R): es el ángulo que la cúpula usa para partir cielo y
 * mar, y el que decide cuándo se pone el sol **visto desde aquí arriba**.
 */
export function bajadaDelHorizonte(h: number): number {
  return Math.atan(Math.sqrt((2 * Math.max(0, h)) / RADIO_DE_LA_TIERRA));
}

/**
 * A qué ángulo sobre la horizontal se ve un punto de `cota` metros a `d` de
 * distancia desde un ojo a `ojo` metros, contando con la caída. En radianes;
 * negativo es por debajo de la horizontal.
 *
 * Es la cuenta que decide si una cosa asoma por encima del horizonte o se
 * queda detrás del mar: asoma si este ángulo es mayor que menos la
 * `bajadaDelHorizonte`. Ver las pruebas del Teide y de la costa de Tenerife.
 */
export function anguloAparente(ojo: number, cota: number, d: number): number {
  return Math.atan2(cota - caida(d) - ojo, d);
}

/*
 * **El trozo que curva, en el espacio de la vista.**
 *
 * La cuenta natural sería en el mundo —`y -= d²/2R` con la posición del
 * vértice en el mapa—, y pasar por ahí cuesta precisión: el mapa de Gran
 * Canaria mide cuatrocientos kilómetros y en coma flotante de 32 bits eso
 * deja un centímetro de escalón, que es un temblor. `modelViewMatrix` llega
 * ya calculada en doble precisión y deja el vértice **relativo al ojo**, que
 * es lo que hace falta:
 *
 * - `mvPosition.xyz * mat3(viewMatrix)` es la traspuesta del giro de la
 *   cámara aplicada al vértice: el vector del ojo al vértice **en los ejes
 *   del mundo**. Su `xz` es la distancia horizontal.
 * - `viewMatrix[1].xyz` es el «arriba» del mundo visto desde la cámara: por
 *   ahí se baja.
 *
 * Solo con cámara en perspectiva: una ortográfica —una sombra, un plano
 * cenital— no tiene ojo desde el que caer. Y `SIN_CURVATURA` lo quita a un
 * material concreto: las estrellas, que están en el infinito.
 */
const GLSL_CURVATURA = /* glsl */ `
#ifndef SIN_CURVATURA
if ( isPerspectiveMatrix( projectionMatrix ) ) {
  vec3 desdeElOjo = mvPosition.xyz * mat3( viewMatrix );
  mvPosition.xyz -= viewMatrix[ 1 ].xyz * ( dot( desdeElOjo.xz, desdeElOjo.xz ) * ${CAIDA_POR_METRO_CUADRADO.toExponential(8)} );
}
#endif
`;

/** El nombre del trozo nuevo, para `#include <...>`. */
export const TROZO_DE_CURVATURA = "curvatura_vertex";

/**
 * Dónde se engancha en `project_vertex`: justo después de pasar a la vista
 * y antes de proyectar. Si una versión de three cambia esta línea, las
 * pruebas lo cazan antes que nadie — ver `curvatura.test.ts`.
 */
export const ANCLA_DE_LA_PROYECCION = "mvPosition = modelViewMatrix * mvPosition;";

const trozos = ShaderChunk as unknown as Record<string, string>;
const PROYECCION_ORIGINAL = ShaderChunk.project_vertex;
let encendida = false;
// El trozo existe desde el principio, vacío: el agua lo incluye por su
// nombre, y un `#include` que no se encuentra no compila.
trozos[TROZO_DE_CURVATURA] ??= "";

/**
 * Pone o quita la curvatura en todos los materiales que se compilen a partir
 * de ahora. Tiene que llamarse **antes** de pintar nada: three guarda los
 * programas ya compilados y no los rehace porque cambie un trozo.
 *
 * Devuelve si quedó puesta. Si three ya no trae la línea de la que se
 * cuelga, no se pone y el juego sigue en plano: mejor un mundo plano que un
 * mundo que no arranca.
 */
export function instalarCurvatura(si: boolean): boolean {
  const cabe = PROYECCION_ORIGINAL.includes(ANCLA_DE_LA_PROYECCION);
  encendida = si && cabe;
  trozos[TROZO_DE_CURVATURA] = encendida ? GLSL_CURVATURA : "";
  ShaderChunk.project_vertex = cabe
    ? PROYECCION_ORIGINAL.replace(
        ANCLA_DE_LA_PROYECCION,
        `${ANCLA_DE_LA_PROYECCION}\n#include <${TROZO_DE_CURVATURA}>`,
      )
    : PROYECCION_ORIGINAL;
  return encendida;
}

/** Si el dibujo está curvado ahora mismo. */
export function curvaturaEncendida(): boolean {
  return encendida;
}

/**
 * El `1/2R` que usan la cúpula y el agua, o cero con la Tierra plana. Con
 * cero, sus cuentas se quedan exactamente en las de antes.
 */
export function factorDeCurvatura(): number {
  return encendida ? CAIDA_POR_METRO_CUADRADO : 0;
}

/**
 * **Lo que mide de lado un triángulo sin que se note la curva**, m.
 *
 * La caída se calcula en los vértices y la tarjeta la reparte en línea recta
 * por dentro del triángulo, y una parábola partida en rectas se queda por
 * debajo de sí misma: en mitad de un lado de `s` metros, `s²/8R` —el error
 * no depende de lo lejos que esté, solo del tamaño—. Con doscientos
 * cincuenta metros son **1,2 mm**, y la pintura va veinte centímetros por
 * encima del asfalto. Con los dos kilómetros que llegan a medir los
 * triángulos de una pista de OpenStreetMap eran ocho centímetros, justo
 * debajo de las ruedas.
 */
export const LADO_SIN_CURVA = 250;

/**
 * Parte los triángulos con algún lado de más de `lado` metros.
 *
 * Cada lado se parte **por la mitad y según su largo**, sin mirar a qué
 * triángulo pertenece: el vecino que comparte ese lado toma la misma
 * decisión y pone el punto en el mismo sitio, así que no quedan grietas
 * aunque los triángulos no compartan vértices. Todo lo que lleve la
 * geometría —normales, coordenadas de textura, colores— se reparte igual
 * que la posición.
 *
 * Deja la geometría como estaba si trae grupos o morfos, que son cosas que
 * repartir así rompería; en este juego no los lleva nada de lo que se parte.
 */
export function partirLoLargo(
  geo: BufferGeometry,
  lado: number = LADO_SIN_CURVA,
): BufferGeometry {
  if (geo.groups.length > 1 || Object.keys(geo.morphAttributes).length > 0)
    return geo;
  const pos = geo.getAttribute("position");
  if (!pos) return geo;
  const idx = geo.getIndex();
  const nTri = Math.floor((idx ? idx.count : pos.count) / 3);
  const tope = lado * lado;

  // ¿Hay algo que partir? Si no, la geometría se devuelve tal cual.
  const vertice = (i: number): number => (idx ? idx.getX(i) : i);
  const lejos = (a: number, b: number): number => {
    const dx = pos.getX(a) - pos.getX(b);
    const dy = pos.getY(a) - pos.getY(b);
    const dz = pos.getZ(a) - pos.getZ(b);
    return dx * dx + dy * dy + dz * dz;
  };
  let hayQuePartir = false;
  for (let t = 0; t < nTri && !hayQuePartir; t++) {
    const a = vertice(3 * t);
    const b = vertice(3 * t + 1);
    const c = vertice(3 * t + 2);
    hayQuePartir = lejos(a, b) > tope || lejos(b, c) > tope || lejos(c, a) > tope;
  }
  if (!hayQuePartir) return geo;

  const nombres = Object.keys(geo.attributes);
  const anchos = nombres.map((n) => geo.getAttribute(n)!.itemSize);
  const ancho = anchos.reduce((s, w) => s + w, 0);
  // Cada vértice como una fila de números: todos sus atributos seguidos.
  type Fila = Float64Array;
  const leer = (i: number): Fila => {
    const f = new Float64Array(ancho);
    let k = 0;
    for (let n = 0; n < nombres.length; n++) {
      const at = geo.getAttribute(nombres[n]!)!;
      for (let c = 0; c < anchos[n]!; c++) f[k++] = at.getComponent(i, c);
    }
    return f;
  };
  // Posición al principio de la fila, sea cual sea el orden de los atributos.
  const dondePos = nombres.slice(0, nombres.indexOf("position")).reduce(
    (s, n) => s + geo.getAttribute(n)!.itemSize,
    0,
  );
  const lejosF = (a: Fila, b: Fila): number => {
    const dx = a[dondePos]! - b[dondePos]!;
    const dy = a[dondePos + 1]! - b[dondePos + 1]!;
    const dz = a[dondePos + 2]! - b[dondePos + 2]!;
    return dx * dx + dy * dy + dz * dz;
  };
  const medio = (a: Fila, b: Fila): Fila => {
    const m = new Float64Array(ancho);
    // La misma suma en los dos vecinos: `a + b` y `b + a` dan lo mismo en
    // coma flotante, y por eso el punto nuevo cae en el mismo sitio.
    for (let k = 0; k < ancho; k++) m[k] = (a[k]! + b[k]!) * 0.5;
    return m;
  };

  const salida: Fila[] = [];
  const partir = (a: Fila, b: Fila, c: Fila, hondo: number): void => {
    const ab = lejosF(a, b) > tope;
    const bc = lejosF(b, c) > tope;
    const ca = lejosF(c, a) > tope;
    const cuantos = +ab + +bc + +ca;
    if (cuantos === 0 || hondo > 24) {
      salida.push(a, b, c);
      return;
    }
    if (cuantos === 3) {
      const mab = medio(a, b);
      const mbc = medio(b, c);
      const mca = medio(c, a);
      partir(a, mab, mca, hondo + 1);
      partir(mab, b, mbc, hondo + 1);
      partir(mca, mbc, c, hondo + 1);
      partir(mab, mbc, mca, hondo + 1);
      return;
    }
    if (cuantos === 1) {
      // Se gira para que el lado largo sea el primero: los giros cíclicos no
      // cambian el sentido del triángulo, y la cara sigue mirando arriba.
      if (bc) return partir(b, c, a, hondo);
      if (ca) return partir(c, a, b, hondo);
      const m = medio(a, b);
      partir(a, m, c, hondo + 1);
      partir(m, b, c, hondo + 1);
      return;
    }
    // Dos lados largos: se gira para que sean ab y bc, y el que queda, ca.
    if (!ab) return partir(b, c, a, hondo);
    if (!bc) return partir(c, a, b, hondo);
    const mab = medio(a, b);
    const mbc = medio(b, c);
    partir(mab, b, mbc, hondo + 1);
    // El cuadrilátero que queda, por su diagonal más corta.
    if (lejosF(a, mbc) <= lejosF(mab, c)) {
      partir(a, mab, mbc, hondo + 1);
      partir(a, mbc, c, hondo + 1);
    } else {
      partir(a, mab, c, hondo + 1);
      partir(mab, mbc, c, hondo + 1);
    }
  };
  for (let t = 0; t < nTri; t++)
    partir(leer(vertice(3 * t)), leer(vertice(3 * t + 1)), leer(vertice(3 * t + 2)), 0);

  const nueva = new BufferGeometry();
  let k0 = 0;
  for (let n = 0; n < nombres.length; n++) {
    const w = anchos[n]!;
    const datos = new Float32Array(salida.length * w);
    for (let v = 0; v < salida.length; v++)
      for (let c = 0; c < w; c++) datos[v * w + c] = salida[v]![k0 + c]!;
    nueva.setAttribute(nombres[n]!, new BufferAttribute(datos, w));
    k0 += w;
  }
  nueva.name = geo.name;
  nueva.userData = geo.userData;
  nueva.computeBoundingBox();
  nueva.computeBoundingSphere();
  return nueva;
}

/**
 * Cuánto se puede equivocar la curva **vista de lejos**, en radianes: lo que
 * baja de más un punto del disco de agua entre vértices, dividido por lo
 * lejos que está. Una diezmilésima es una décima de píxel en una pantalla de
 * novecientos puntos de alto y sesenta y dos grados de campo.
 */
export const TOLERANCIA_DE_LA_CURVA = 1e-4;

/**
 * Cuánto crece cada anillo del disco de agua cerca del ojo: dos quintos de su
 * radio. Ver `pasoDeAnillo`.
 */
export const CRECE_CERCA = 0.4;

/** El primer anillo, m. Dentro, un abanico de triángulos alrededor del ojo. */
export const PRIMER_ANILLO = 50;

/**
 * **Cuántos gajos lleva el disco según lo lejos**: `[hasta, gajos]`, del ojo
 * hacia fuera. Ver `discoDeAgua`.
 */
export const GAJOS_DEL_AGUA: readonly (readonly [number, number])[] = [
  [10_000, 16],
  [80_000, 32],
  [Number.POSITIVE_INFINITY, 64],
];

/**
 * Cuánto más lejos va el anillo siguiente al que está a `r` metros del ojo.
 *
 * El error de repartir la parábola en recta por un triángulo de lado `s` es
 * `s²/8R`, y visto desde el ojo pesa lo que ese error dividido por la
 * distancia. Así que lejos el anillo puede crecer mucho sin que se note: con
 * `s = √(8R·τ·r)` el error se queda exactamente en la tolerancia `τ`.
 *
 * Cerca eso no basta, porque cerca no se mira el ángulo sino la orilla: el
 * disco va pegado al ojo y su error se mueve con él, y la raya del agua
 * respira sobre una playa llana lo que ese error partido por la pendiente de
 * la playa. Así que manda el más corto de los dos pasos, y hasta los veinte
 * kilómetros eso es crecer dos quintos del radio: a un kilómetro el error es
 * de cuatro milímetros, a cinco de una decena de centímetros, y la orilla de
 * una playa del dos por ciento vista desde trescientos metros se mueve menos
 * de una décima de píxel. Ver la prueba en `curvatura.test.ts`.
 */
export function pasoDeAnillo(r: number): number {
  return Math.min(
    r * CRECE_CERCA,
    Math.sqrt(8 * RADIO_DE_LA_TIERRA * TOLERANCIA_DE_LA_CURVA * r),
  );
}

/** Los gajos del anillo que está a `r` metros del ojo. */
function gajosA(r: number): number {
  for (const [hasta, gajos] of GAJOS_DEL_AGUA) if (r <= hasta) return gajos;
  return GAJOS_DEL_AGUA[GAJOS_DEL_AGUA.length - 1]![1];
}

/**
 * El mar: un disco de anillos que se aprietan hacia el centro.
 *
 * Era un cuadrado de dos triángulos de cuatrocientos kilómetros, y con la
 * curva eso no vale: la caída se calcula en las cuatro esquinas y por dentro
 * se reparte en recta, así que el mar entero bajaba lo que bajan las
 * esquinas —tres kilómetros— y el avión volaba por debajo del agua.
 *
 * El error de repartir la curva en recta es `s²/8R` para un triángulo de
 * lado `s`, esté donde esté: una rejilla fija que no se notara en ninguna
 * playa tendría que ser de cuadros de medio kilómetro sobre cuatrocientos,
 * más de un millón de triángulos. Así que el disco va **pegado al ojo** —ver
 * `Terrain.llevarElAguaA`— y sus anillos crecen con la distancia, cada uno lo
 * que diga `pasoDeAnillo`.
 *
 * **Y con los triángulos justos, que el agua no es barata.** Cada arista que
 * cruza la pantalla hace a la tarjeta pintar dos veces los píxeles que caen a
 * caballo —pinta de cuatro en cuatro—, y el agua es de lo más caro que se
 * pinta: medido en la GPU del portátil, un disco de cuatro mil triángulos,
 * con cuarenta y ocho gajos de punta a punta, costaba un cuatro por ciento
 * del cuadro más que un cuadrado de dos. Pero la cuerda entre dos gajos, que
 * es lo que obliga a tener muchos, se equivoca con el cuadrado de la
 * distancia: cerca sobran, y lejos hacen falta. Así que los gajos se doblan
 * hacia fuera —ver `GAJOS_DEL_AGUA`—, cada anillo que dobla se cose al de
 * dentro sin dejar vértices en mitad de un lado, y el disco se queda en unos
 * dos mil triángulos con el error de lejos por debajo del de antes: menos de
 * una quinta de píxel visto desde el ojo, y menos de veinticinco metros hasta
 * los ciento ochenta kilómetros, que es lo que hace falta para que el fondo
 * del mapa lejano, hundido treinta bajo el agua, no asome. Aun así cuesta un
 * tres y medio por ciento más que el cuadrado: es lo que vale el agua curva,
 * y está pagado con lo que dejó de gastar la cúpula —ver el ADR 0009—.
 */
export function discoDeAgua(radio: number): BufferGeometry {
  const radios: number[] = [];
  for (let r = PRIMER_ANILLO; r < radio; r += pasoDeAnillo(r)) radios.push(r);
  radios.push(radio);

  const posiciones: number[] = [0, 0, 0];
  const primero: number[] = [];
  const cuantos: number[] = [];
  for (const r of radios) {
    const gajos = gajosA(r);
    primero.push(posiciones.length / 3);
    cuantos.push(gajos);
    for (let g = 0; g < gajos; g++) {
      const a = (g / gajos) * Math.PI * 2;
      // x = r·cos, z = −r·sin: visto desde arriba, con el norte (−z) hacia
      // arriba de la pantalla, los ángulos crecen en sentido antihorario, que
      // es el sentido de una cara que mira al cielo.
      posiciones.push(r * Math.cos(a), 0, -r * Math.sin(a));
    }
  }
  const indices: number[] = [];
  const g0 = cuantos[0]!;
  for (let g = 0; g < g0; g++)
    indices.push(0, primero[0]! + g, primero[0]! + ((g + 1) % g0));
  for (let anillo = 0; anillo + 1 < radios.length; anillo++) {
    const dentro = primero[anillo]!;
    const fuera = primero[anillo + 1]!;
    const gd = cuantos[anillo]!;
    const gf = cuantos[anillo + 1]!;
    for (let g = 0; g < gd; g++) {
      const a = dentro + g;
      const b = dentro + ((g + 1) % gd);
      if (gf === gd) {
        const c = fuera + g;
        const d = fuera + ((g + 1) % gf);
        indices.push(a, c, d, a, d, b);
      } else {
        // El de fuera tiene el doble: cada lado de dentro se cose a dos de
        // fuera con tres triángulos, y el vértice nuevo cae en el anillo de
        // fuera, no en un lado de dentro, así que no queda grieta.
        const c = fuera + 2 * g;
        const m = fuera + 2 * g + 1;
        const e = fuera + ((2 * g + 2) % gf);
        indices.push(a, c, m, a, m, b, b, m, e);
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(posiciones, 3));
  const normales = new Float32Array(posiciones.length);
  for (let i = 1; i < normales.length; i += 3) normales[i] = 1;
  geo.setAttribute("normal", new BufferAttribute(normales, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}
