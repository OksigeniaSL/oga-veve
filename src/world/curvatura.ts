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
 * `Terrain.llevarElAguaA`— y sus anillos crecen un diez por ciento cada uno:
 * cerca del ojo, donde se miran las playas, el triángulo es de metros y el
 * error no llega al milímetro; a cien kilómetros el triángulo es de doce y
 * el error, de unos tres metros sobre setecientos ochenta y cinco de caída,
 * que a esa distancia es una milésima de grado. Que ese error lejano se
 * mueva un poco al moverse el disco con el avión no lo ve nadie.
 *
 * Son unos diez mil vértices sin textura ni luz. No se notan.
 */
export function discoDeAgua(
  radio: number,
  primero = 20,
  razon = 1.1,
  gajos = 96,
): BufferGeometry {
  const radios: number[] = [];
  for (let r = primero; r < radio; r *= razon) radios.push(r);
  radios.push(radio);

  const posiciones: number[] = [0, 0, 0];
  for (const r of radios) {
    for (let g = 0; g < gajos; g++) {
      const a = (g / gajos) * Math.PI * 2;
      // x = r·cos, z = −r·sin: visto desde arriba, con el norte (−z) hacia
      // arriba de la pantalla, los ángulos crecen en sentido antihorario, que
      // es el sentido de una cara que mira al cielo.
      posiciones.push(r * Math.cos(a), 0, -r * Math.sin(a));
    }
  }
  const indices: number[] = [];
  for (let g = 0; g < gajos; g++) indices.push(0, 1 + g, 1 + ((g + 1) % gajos));
  for (let anillo = 0; anillo + 1 < radios.length; anillo++) {
    const dentro = 1 + anillo * gajos;
    const fuera = dentro + gajos;
    for (let g = 0; g < gajos; g++) {
      const g2 = (g + 1) % gajos;
      const a = dentro + g;
      const b = dentro + g2;
      const c = fuera + g;
      const d = fuera + g2;
      indices.push(a, c, d, a, d, b);
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
