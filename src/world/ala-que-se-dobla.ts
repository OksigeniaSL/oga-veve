/**
 * **El ala que se dobla**, vista desde la ventanilla.
 *
 * Enrique, que ha volado mucho de pasajero: «en los grandes y modernos, el
 * ala que se dobla vista desde la ventanilla mientras dentro casi no se
 * nota». Es de lo primero que se ve desde el asiento de encima del ala: en el
 * puesto las puntas cuelgan; al rodar deprisa por la pista empiezan a subir,
 * que el ala ya sostiene; arriba van levantadas; y con los baches se doblan
 * de más y oscilan, despacio, mientras dentro apenas se mueve el café. Y al
 * tocar, con los frenos de tierra, el ala deja de sostener y cae de golpe.
 *
 * ## Qué se mueve
 *
 * La punta, con la carga: `porG` metros por cada g que sostiene el ala —ver
 * `alaQueSeDobla` en la ficha del avión, con de dónde sale cada número—, y
 * con su primer modo de flexión, un muelle de `hz` hercios poco amortiguado.
 * La forma a lo largo del ala es la de una viga en voladizo con la carga
 * repartida: nada en la raíz, que va atornillada al fuselaje, y cada vez más
 * hacia la punta. Ver `formaDeLaViga` y `formaEnEstaciones`.
 *
 * ## Dónde se mueve: en la tarjeta
 *
 * Doblar el ala en la CPU sería rehacer en cada fotograma decenas de miles de
 * vértices y subirlos. Así que se dobla en el sombreador de vértices de las
 * piezas que cuelgan del ala —la chapa, los flaps, los aerofrenos, las
 * canoas, los motores y sus pilones—, con lo mismo para todas: el vértice se
 * pasa a los ejes del avión, se mira a qué altura del ala está y se sube lo
 * que toque. Las piezas se mueven juntas porque usan la misma cuenta, y los
 * flaps y los aerofrenos siguen girando sobre su bisagra porque la cuenta se
 * hace después de colocarlos.
 *
 * Se hace **en el espacio de la vista**, no en el del mundo: el mundo de este
 * juego mide cientos de kilómetros y en coma flotante de 32 bits eso es un
 * temblor de centímetros —lo mismo que se evitó con la curvatura de la
 * tierra, ver `world/curvatura.ts`—. La matriz que lleva de la vista al avión
 * se calcula en la CPU con doble precisión, una vez por fotograma.
 *
 * Las luces de las puntas, que son puntos y no chapa, se suben a mano: son
 * unos pocos vértices.
 */

import {
  ShaderChunk,
  Box3,
  Matrix4,
  Vector3,
  type BufferAttribute,
  type Camera,
  type Material,
  type Mesh,
  type Object3D,
  type Points,
} from "three";
import { ANCLA_DE_LA_PROYECCION } from "./curvatura";

/**
 * **Las piezas que cuelgan del ala**, por su nombre en el modelo: es el
 * contrato con `modelos/exterior.py`, el mismo del que viven `flaps.ts` y
 * `aerofrenos.ts`. La pata del tren no: cuelga de la raíz, donde el ala no se
 * mueve.
 *
 * Y dos que no lo parecen por el nombre. **`franja-fija`** es chapa del ala:
 * el trozo que se queda quieto junto a cada flap, sacado a su malla —ver
 * `_franja_fija` en `modelos/exterior.py`—; sin doblarla, en crucero se abrían
 * rendijas de cielo a lo largo de los aerofrenos. Y **`remate`** lleva la
 * aleta de abajo de la punta del JAZ 120, junta con un filete del fuselaje
 * que, como está dentro de la raíz, no se mueve.
 */
export const PIEZAS_DEL_ALA =
  /^(ala|franja-fija|remate|aerofreno-|hueco-aerofreno-|flap-|hueco-flap-|canoa-|cola-canoa-|hueco-cola-canoa-|motor|pilon)/;

/**
 * **La forma de una viga en voladizo con la carga repartida**, de 0 en la
 * raíz a 1 en la punta: `s²·(6 − 4s + s²)/3`. Es la elástica de libro, la de
 * cualquier texto de resistencia de materiales.
 */
export function formaDeLaViga(s: number): number {
  const x = Math.max(0, Math.min(1, s));
  return (x * x * (6 - 4 * x + x * x)) / 3;
}

/**
 * La flexión de la punta del 787 por g, partida por su semienvergadura: los
 * 7,6 m de su ensayo de carga última al 150 % de 2,5 g, en 30,06 m de
 * semiala. Ver `alaQueSeDobla` en `flight/aircraft.ts`.
 */
export const DEL_787_POR_G = 7.6 / (1.5 * 2.5) / 30.06;

/** Y su alargamiento, alrededor de diez. */
export const ALARGAMIENTO_DEL_787 = 10;

/**
 * **La flexión por g de otra ala**, m, escalada desde la del 787 con la
 * cuenta de una viga: con la misma deformación en la raíz y el mismo espesor
 * relativo, `δ/L` va con el alargamiento.
 */
export function flexionEscalada(envergadura: number, superficie: number): number {
  const semi = envergadura / 2;
  const alargamiento = (envergadura * envergadura) / superficie;
  return DEL_787_POR_G * semi * (alargamiento / ALARGAMIENTO_DEL_787);
}

/**
 * **Cuánto amortigua el ala.** En tierra solo la estructura: el uno y medio por
 * ciento del amortiguamiento crítico que da por supuesto la FAA para los
 * análisis de flameo (AC 25.629-1B, 7.1.3.3).
 *
 * En vuelo, además, el aire: el modo de flexión mueve el ala de arriba abajo
 * contra él, y cada trozo de ala que sube ve un ángulo de ataque menor. Con la
 * teoría de franjas cuasiestacionaria eso es `ζ ≈ ρ·V·a·c/(4·m'·ω)`, con `m'`
 * lo que pesa el ala por metro; en el 747 en crucero —ρ 0,38, 247 m/s, ocho
 * metros de cuerda, entre una y dos toneladas por metro entre estructura y
 * combustible, 1,1 Hz— sale entre el siete y el doce por ciento. Se toma el
 * ocho. Medido en el banco con el cinco, la punta se iba de −0,4 a +3,5 m en
 * turbulencia moderada: resonaba como un ala sin aire alrededor.
 */
const AMORTIGUA_EN_TIERRA = 0.015;
const AMORTIGUA_EN_VUELO = 0.08;

/** La carga que se le pasa como mucho, g: el ala no se dobla más que su ensayo. */
const CARGA_DE = -1;
const CARGA_A = 3.75;

/** **La punta, con su muelle**: la cuenta sin dibujo, para poder probarla. */
export class FlexionDelAla {
  /** Cuánto ha subido la punta desde como está en tierra parado, m. */
  punta = 0;
  private va = 0;

  constructor(
    readonly porG: number,
    readonly hz: number,
  ) {}

  /**
   * Un paso: `carga` es lo que sostiene el ala, en g —el factor de carga del
   * modelo de vuelo; en tierra, lo que ya sostiene con la velocidad—.
   */
  paso(dt: number, carga: number, enTierra: boolean): void {
    if (!(dt > 0)) return;
    const meta = this.porG * Math.max(CARGA_DE, Math.min(CARGA_A, carga));
    const w = 2 * Math.PI * this.hz;
    const z = enTierra ? AMORTIGUA_EN_TIERRA : AMORTIGUA_EN_VUELO;
    // A trozos de 1/240 s: con hercio y medio, estable de sobra con el reloj acelerado.
    const trozos = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / trozos;
    for (let i = 0; i < trozos; i++) {
      this.va += (w * w * (meta - this.punta) - 2 * z * w * this.va) * h;
      this.punta += this.va * h;
    }
  }

  /** Recién puesto el avión: el ala donde le toca, sin venir de ninguna parte. */
  asentar(carga: number): void {
    this.punta = this.porG * Math.max(CARGA_DE, Math.min(CARGA_A, carga));
    this.va = 0;
  }
}

/**
 * **Cuántas estaciones de la chapa se miran como mucho.** La chapa del ala de
 * los modelos de `modelos/` es una sucesión de secciones a lo largo de la
 * envergadura —diez u once—, y entre una y otra es plana.
 */
const ESTACIONES = 24;

/**
 * **Las estaciones del ala**: dónde tiene secciones la chapa, m desde el eje,
 * sacadas de sus vértices. Los que caen a menos de quince centímetros unos de
 * otros son la misma sección —el diedro y el alabeo la tuercen un poco—, y de
 * cada una se guardan sus dos bordes.
 */
export function estacionesDe(xs: readonly number[], raiz: number): number[] {
  const o = xs.map(Math.abs).filter((x) => x > raiz).sort((a, b) => a - b);
  const salen: number[] = [raiz];
  let desde = o[0];
  for (let i = 1; i <= o.length; i++) {
    const x = o[i];
    const antes = o[i - 1]!;
    if (x !== undefined && x - antes <= 0.15) continue;
    if (desde !== undefined) {
      if (desde > salen[salen.length - 1]! + 0.01) salen.push(desde);
      if (antes > desde + 0.05) salen.push(antes);
    }
    desde = x;
  }
  // Si no caben, se quitan las más juntas: la forma entre ellas casi no cambia.
  while (salen.length > ESTACIONES) {
    let peor = 1;
    for (let i = 2; i < salen.length - 1; i++)
      if (salen[i]! - salen[i - 1]! < salen[peor]! - salen[peor - 1]!) peor = i;
    salen.splice(peor, 1);
  }
  return salen;
}

/**
 * **La forma, recta entre estación y estación.** La chapa es plana entre dos
 * secciones, y los paneles, los flaps y las canoas están encima de ella con
 * sus propios vértices en sitios intermedios: con la curva entera, cada pieza
 * se doblaba un poco distinto que la chapa que tiene debajo y asomaban
 * rendijas de cielo de unos centímetros entre los aerofrenos —se vio en la
 * primera captura en crucero—. Con la curva tomada en las estaciones y recta
 * entre ellas, todo lo que va encima de la chapa se mueve con ella.
 */
export function formaEnEstaciones(
  x: number,
  estaciones: readonly number[],
  formas: readonly number[],
): number {
  const ax = Math.abs(x);
  const n = estaciones.length;
  if (n === 0 || ax <= estaciones[0]!) return 0;
  if (ax >= estaciones[n - 1]!) return formas[n - 1]!;
  for (let i = 0; i < n - 1; i++) {
    const a = estaciones[i]!;
    const b = estaciones[i + 1]!;
    if (ax < b) return formas[i]! + ((formas[i + 1]! - formas[i]!) * (ax - a)) / Math.max(1e-4, b - a);
  }
  return formas[n - 1]!;
}

/** El trozo de sombreador: tras pasar el vértice a la vista, se sube. */
const TROZO = /* glsl */ `
{
  vec3 enElAvion = ( uVistaAlAvion * vec4( mvPosition.xyz, 1.0 ) ).xyz;
  float x = abs( enElAvion.x );
  float forma = 0.0;
  if ( x >= uEstacionesDelAla[ uCuantasEstaciones - 1 ] ) {
    forma = uFormasDelAla[ uCuantasEstaciones - 1 ];
  } else {
    for ( int i = 0; i < ${ESTACIONES - 1}; i ++ ) {
      if ( i + 1 >= uCuantasEstaciones ) break;
      float b = uEstacionesDelAla[ i + 1 ];
      if ( x < b ) {
        float a = uEstacionesDelAla[ i ];
        forma = x <= a ? uFormasDelAla[ i ] : mix( uFormasDelAla[ i ], uFormasDelAla[ i + 1 ], ( x - a ) / max( b - a, 1e-4 ) );
        break;
      }
    }
  }
  mvPosition.xyz += uArribaEnLaVista * ( uPuntaDelAla * forma );
}
`;

const DECLARACIONES = /* glsl */ `
uniform mat4 uVistaAlAvion;
uniform vec3 uArribaEnLaVista;
uniform float uEstacionesDelAla[ ${ESTACIONES} ];
uniform float uFormasDelAla[ ${ESTACIONES} ];
uniform int uCuantasEstaciones;
uniform float uPuntaDelAla;
`;

export interface AlaQueSeDobla {
  readonly flexion: FlexionDelAla;
  /** Cuántas mallas se doblan: para el banco. */
  readonly piezas: number;
  /** Dónde empieza a doblarse y cuánto mide lo que se dobla, m. */
  readonly raiz: number;
  readonly largo: number;
  /** Las secciones de la chapa, m desde el eje. Ver `estacionesDe`. */
  readonly estaciones: readonly number[];
  /** Un paso de la física del ala. */
  paso(dt: number, carga: number, enTierra: boolean): void;
  /** Antes de pintar, con la cámara ya puesta: la matriz y las luces. */
  antesDePintar(camara: Camera): void;
}

/**
 * Prepara el ala de un modelo para doblarse, o `null` si el avión no la dobla
 * o el modelo no trae ala.
 *
 * Se llama **con el modelo recién colocado** —el grupo en el origen y sin
 * girar—, y antes de `luzDeCabina`, que reparte la luz por los materiales que
 * encuentre: así encuentra también los de aquí.
 */
export function prepararElAla(
  raiz: Object3D,
  grupo: Object3D,
  como: { readonly porG: number; readonly hz: number } | undefined,
  luces?: Points | null,
): AlaQueSeDobla | null {
  if (!como || !(como.porG > 0)) return null;
  grupo.updateWorldMatrix(true, true);
  const delGrupo = new Matrix4().copy(grupo.matrixWorld).invert();

  // Qué mallas son del ala: ellas o algún padre suyo se llaman como una pieza.
  const delAla: Mesh[] = [];
  raiz.traverse((o) => {
    if (!(o as Mesh).isMesh) return;
    for (let p: Object3D | null = o; p && p !== raiz; p = p.parent)
      if (PIEZAS_DEL_ALA.test(p.name)) {
        delAla.push(o as Mesh);
        return;
      }
  });
  const chapa = raiz.getObjectByName("ala");
  const fuselaje = raiz.getObjectByName("fuselaje");
  if (!chapa || !fuselaje || !delAla.length) return null;
  // Las medidas, en los ejes del avión: hasta dónde llega el ala y dónde sale
  // del fuselaje.
  const caja = new Box3().setFromObject(chapa).applyMatrix4(delGrupo);
  const cuerpo = new Box3().setFromObject(fuselaje).applyMatrix4(delGrupo);
  const semi = Math.max(Math.abs(caja.min.x), Math.abs(caja.max.x));
  const raizDelAla = Math.max(Math.abs(cuerpo.min.x), Math.abs(cuerpo.max.x));
  const largo = semi - raizDelAla;
  if (!(largo > 1)) return null;

  // Las secciones de la chapa, en los ejes del avión.
  const xs: number[] = [];
  const v = new Vector3();
  chapa.updateWorldMatrix(true, true);
  chapa.traverse((o) => {
    const g = (o as Mesh).isMesh ? (o as Mesh).geometry.getAttribute("position") : null;
    if (!g) return;
    for (let i = 0; i < g.count; i++) {
      v.fromBufferAttribute(g, i).applyMatrix4(o.matrixWorld).applyMatrix4(delGrupo);
      xs.push(v.x);
    }
  });
  const estaciones = estacionesDe(xs, raizDelAla);
  const formas = estaciones.map((x) => formaDeLaViga((x - raizDelAla) / largo));
  const relleno = (a: number[]) => [...a, ...new Array<number>(ESTACIONES - a.length).fill(a[a.length - 1] ?? 0)];

  const uniformes = {
    uVistaAlAvion: { value: new Matrix4() },
    uArribaEnLaVista: { value: new Vector3(0, 1, 0) },
    uEstacionesDelAla: { value: relleno(estaciones) },
    uFormasDelAla: { value: relleno(formas) },
    uCuantasEstaciones: { value: estaciones.length },
    uPuntaDelAla: { value: 0 },
  };

  /*
   * Un material propio para lo del ala: el mismo gris de la chapa lo lleva
   * también el fuselaje, que no se dobla. Un clon por material, compartido
   * por todas las piezas del ala que lo usan.
   */
  const clones = new Map<Material, Material>();
  const doblado = (m: Material): Material => {
    let c = clones.get(m);
    if (c) return c;
    c = m.clone();
    const previo = m.onBeforeCompile;
    const llave = m.customProgramCacheKey();
    c.onBeforeCompile = (shader, pintor) => {
      previo.call(m, shader, pintor);
      Object.assign(shader.uniforms, uniformes);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${DECLARACIONES}`)
        .replace(
          "#include <project_vertex>",
          ShaderChunk.project_vertex.replace(
            ANCLA_DE_LA_PROYECCION,
            `${ANCLA_DE_LA_PROYECCION}\n${TROZO}`,
          ),
        );
    };
    // `onBeforeCompile` no entra en la llave de la caché de programas: sin
    // esto, el clon se pintaría con el programa del original, sin doblar.
    c.customProgramCacheKey = () => `${llave}|ala-que-se-dobla`;
    clones.set(m, c);
    return c;
  };
  for (const malla of delAla)
    malla.material = Array.isArray(malla.material)
      ? malla.material.map(doblado)
      : doblado(malla.material);

  // Las luces de las puntas, a mano: dónde estaban y cuánto suben.
  const posiciones = luces?.geometry.getAttribute("position") as BufferAttribute | undefined;
  const base = posiciones ? Float32Array.from(posiciones.array as Float32Array) : null;
  let puntaPuesta = Number.NaN;

  const flexion = new FlexionDelAla(como.porG, como.hz);
  const vistaAlMundo = new Matrix4();
  const arriba = new Vector3();
  return {
    flexion,
    piezas: delAla.length,
    raiz: raizDelAla,
    largo,
    estaciones,
    paso(dt, carga, enTierra) {
      flexion.paso(dt, carga, enTierra);
    },
    antesDePintar(camara) {
      grupo.updateWorldMatrix(true, false);
      camara.updateMatrixWorld();
      // De la vista al avión: la cámara al mundo, y el mundo al avión.
      vistaAlMundo.copy(grupo.matrixWorld).invert().multiply(camara.matrixWorld);
      uniformes.uVistaAlAvion.value.copy(vistaAlMundo);
      // Y el arriba del avión visto desde la cámara.
      arriba
        .set(0, 1, 0)
        .transformDirection(grupo.matrixWorld)
        .transformDirection(camara.matrixWorldInverse);
      uniformes.uArribaEnLaVista.value.copy(arriba);
      uniformes.uPuntaDelAla.value = flexion.punta;
      // Las luces, solo si la punta se ha movido un milímetro.
      if (posiciones && base && Math.abs(flexion.punta - puntaPuesta) > 0.001) {
        puntaPuesta = flexion.punta;
        const a = posiciones.array as Float32Array;
        for (let i = 0; i < a.length; i += 3)
          a[i + 1] = base[i + 1]! + flexion.punta * formaEnEstaciones(base[i]!, estaciones, formas);
        posiciones.needsUpdate = true;
      }
    },
  };
}
