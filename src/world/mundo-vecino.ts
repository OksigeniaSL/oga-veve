/**
 * El otro aeropuerto: un escenario entero puesto a su distancia.
 *
 * Para poder aterrizar en otro sitio no basta con dibujarlo. Hace falta suelo
 * que se pise —el modelo de vuelo pregunta la cota doscientas cuarenta veces
 * por segundo—, la pista con sus marcas y su número, las calles de rodaje, la
 * plataforma y los edificios. O sea: hace falta **todo lo que ya tiene un
 * escenario**.
 *
 * Y ahí está el hallazgo de este módulo, que es por qué es corto: **Tenerife
 * Sur ya es un escenario**. Tiene su mapa de alturas medido, su aeródromo
 * extraído con los umbrales a su cota, su ortofoto y su viento. No hay que
 * generar ni un dato nuevo ni escribir ni una regla nueva de construcción de
 * mundo: hay que **instanciarlo otra vez y desplazarlo** hasta donde cae visto
 * desde el de salida.
 *
 * ## Lo que no trae
 *
 * El horizonte. El anillo del mapa lejano se dibuja una vez, el del escenario
 * en el que se está volando, y abarca ciento veintiséis kilómetros: el vecino
 * cae dentro de él. Dos anillos serían dos horizontes solapados, y el de
 * detrás asomando por el de delante. Ver `sinHorizonte`.
 *
 * ## Y por qué el suelo se pregunta y no se copia
 *
 * El terreno de salida ya sabe preguntarle a otro qué hay fuera de su mapa
 * —ver `ponerSueloLejano`—, porque eso hacía falta desde que se puede volar
 * setenta kilómetros y ver la isla de enfrente. Aquí se usa ese mismo gancho,
 * encadenado: primero el vecino, que sabe de su isla con un metro de detalle, y
 * si la pregunta no cae en su mapa, lo que hubiera antes.
 */

import {
  Group,
  Vector3,
  type Mesh,
  type MeshLambertMaterial,
  type Object3D,
  type Texture,
} from "three";
import { Terrain } from "./terrain";
import type { Scenario } from "./scenarios";
import { dondeCae } from "./entre-aerodromos";
import { exposicionDelVecino } from "./ortofoto";
import type { Ciudad } from "./ciudad";
import { crearLucesDeCiudad, type LucesDeCiudad } from "./luces-de-ciudad";
import { crearAerodromoLejano, type AerodromoLejano } from "./aerodromo-lejano";
import { encendidoSegunElSol } from "./luces-de-rodadura";
import { esTorreDeControl } from "./aerodrome";

/** Cuántos metros de borde se funden con la foto del horizonte. */
const FUNDIDO = 3500;

/**
 * El trozo de programa del fundido: la lectura de la foto con la del
 * horizonte mezclada hacia el borde. Aparte para poder mirarlo en una prueba.
 */
export const GLSL_DEL_FUNDIDO = {
  cabecera: /* glsl */ `
    uniform sampler2D fotoHorizonte;
    uniform vec3 afinU;
    uniform vec3 afinV;
    uniform float ajusteHorizonte;
    uniform float medioLadoFino;
    uniform float fundidoFino;
    varying vec2 vDelVecino;
  `,
  mapa: /* glsl */ `
    #ifdef USE_MAP
      vec4 sampledDiffuseColor = texture2D(map, vMapUv);
      float alBorde = medioLadoFino - max(abs(vDelVecino.x), abs(vDelVecino.y));
      float gruesa = 1.0 - smoothstep(0.0, fundidoFino, alBorde);
      if (gruesa > 0.0) {
        vec3 p = vec3(vDelVecino, 1.0);
        vec4 deCasa = texture2D(fotoHorizonte, vec2(dot(afinU, p), dot(afinV, p)));
        deCasa.rgb *= ajusteHorizonte;
        sampledDiffuseColor = mix(sampledDiffuseColor, deCasa, gruesa);
      }
      diffuseColor *= sampledDiffuseColor;
    #endif
  `,
} as const;

/** Lo que devuelve la proyección de una ortofoto para un punto del mundo. */
interface Punto2 {
  u: number;
  v: number;
}

/**
 * El mismo escenario, sin el relieve del horizonte.
 *
 * Se exporta porque la razón de quitarlo no es obvia y hay que poder
 * comprobarla: un segundo anillo de ciento veintiséis kilómetros centrado a
 * cincuenta y cuatro del primero es un horizonte de más.
 */
export function sinHorizonte(escenario: Scenario): Scenario {
  const { relieveLejano: _fuera, ...resto } = escenario;
  return resto;
}

export class MundoVecino {
  /** El terreno del vecino, con su aeródromo y su agua dentro. */
  readonly terreno: Terrain;

  /** Y su sitio en el mundo de salida, para colgarlo de la escena. */
  readonly grupo = new Group();

  /** Dónde cae su centro, en coordenadas del mundo de salida. */
  readonly desplazamiento: { readonly x: number; readonly z: number };

  /** Hasta dónde llega su mapa fino, medido desde su centro. */
  private readonly medioLado: number;

  constructor(
    salida: Scenario,
    vecino: Scenario,
    /**
     * Su fotografía, si la tiene.
     *
     * **Sin ella el vecino sale de polígonos**, y eso se ve a la primera: se
     * cruza el canal con la isla de enfrente hecha de ladera lisa mientras la
     * de casa lleva la foto puesta. Contado jugando: «el paisaje era el de
     * fantasía, no el de las capas, no es realista».
     *
     * Es la misma del escenario cuando se juega solo en él: no hay fichero
     * nuevo que generar ni que bajar dos veces.
     */
    foto?: { textura: Texture; uv(x: number, z: number): Punto2 } | undefined,
  ) {
    const aquí = salida.aerodrome?.origin;
    const allí = vecino.aerodrome?.origin;
    if (!aquí || !allí)
      throw new Error(
        `${salida.id} → ${vecino.id}: los dos extremos necesitan aeródromo extraído`,
      );
    this.desplazamiento = dondeCae(aquí, allí);
    this.medioLado = vecino.size / 2;
    this.terreno = new Terrain(sinHorizonte(vecino));
    this.exposicion = exposicionDelVecino(salida.id, vecino.id);
    if (foto) this.ponerFoto(foto);
    /*
     * **Y sin su propia lámina de agua, si cae a la misma cota que la de
     * casa.** El agua de casa ya cubre el mundo entero; la del vecino era un
     * cuadrado de veintitantos kilómetros encima, en el mismo plano, y dos
     * láminas translúcidas una sobre otra son un mar **más oscuro** alrededor
     * de cada isla vecina, con el borde recto. Otro de los «cortes de tono».
     */
    const agua = this.terreno.group.getObjectByName("agua");
    if (agua && vecino.waterLevel === salida.waterLevel) agua.visible = false;
    this.grupo.add(this.terreno.group);
    this.grupo.position.set(this.desplazamiento.x, 0, this.desplazamiento.z);

    /*
     * **Y su aeropuerto de lejos, de noche**: el faro y unas pocas luces
     * blancas, en lugar del balizamiento entero. Ver `aerodromo-lejano.ts`.
     * Se ve solo mientras el de verdad está quitado.
     */
    const torre = vecino.aerodrome?.buildings.find(esTorreDeControl);
    let centro: [number, number] | null = null;
    if (torre && torre.polygon.length > 0) {
      let x = 0;
      let y = 0;
      for (const p of torre.polygon) {
        x += p[0];
        y += p[1];
      }
      // La Y del fichero apunta al norte; la Z del mundo, al sur.
      centro = [x / torre.polygon.length, -y / torre.polygon.length];
    }
    this.aerodromoLejano = crearAerodromoLejano(
      vecino.runway,
      (x, z) => this.terreno.sampleHeight(x, z),
      encendidoSegunElSol,
      centro,
    );
    this.deLejosVisible.add(this.aerodromoLejano.grupo);
    this.deLejosVisible.visible = false;
    this.grupo.add(this.deLejosVisible);
    this.grupo.add(this.deCercaVisible);
  }

  private readonly aerodromoLejano: AerodromoLejano;
  /** Lo que solo se enseña con la isla lejos. */
  private readonly deLejosVisible = new Group();
  /**
   * Y lo que solo se enseña con la isla cerca y no es del terreno: las luces
   * de aproximación, el PAPI y las azules de las calles, que monta el juego.
   * Van aquí para apagarse con el aeródromo, por lo mismo que él: se dibujan a
   * tamaño fijo en pantalla, y a cien kilómetros serían una mancha de colores
   * pegada a la costa.
   */
  private readonly deCercaVisible = new Group();

  /**
   * Cuelga algo del aeródromo del vecino, **en sus coordenadas**: las de su
   * propio mapa, sin correr. Se apaga y se enciende con él.
   */
  colgarDeCerca(objeto: Object3D): void {
    this.deCercaVisible.add(objeto);
  }

  /** Y lo descuelga, para rehacerlo. */
  descolgar(objeto: Object3D): void {
    this.deCercaVisible.remove(objeto);
  }

  /** Si la isla está lo bastante cerca como para dibujarle el aeródromo. */
  get cerca(): boolean {
    return !this.deLejos;
  }

  /**
   * **El tiempo de hoy, también aquí.** Rehace el aeródromo con su viento: la
   * manga. El color de cada extremo de la pista ya no depende de él —las luces
   * son direccionales, como las de verdad; ver `lucesDePista`—.
   *
   * Se construía una vez y en calma, y ningún cambio de tiempo llegaba al
   * vecino: en Los Rodeos la manga colgaba a plomo mientras el avión recibía
   * veinte nudos, y con el viento girado la pista seguía pintada para la
   * cabecera de antes. El viento del mundo es uno; la manga de cada campo
   * tiene que decir lo mismo.
   */
  ponerTiempo(vecino: Scenario): void {
    this.terreno.rehacerAerodromo(sinHorizonte(vecino));
    // El rehecho sale encendido: si la isla está lejos, se apaga como el resto.
    for (const o of this.terreno.group.children)
      if (o.name.startsWith("aerodromo:")) o.visible = !this.deLejos;
  }
  private lucesDeCiudad: LucesDeCiudad | null = null;
  private seno = -1;

  /**
   * **Las luces de su ciudad**, cuando llegue su rejilla.
   *
   * Sin ellas, de noche la isla de enfrente era una silueta negra y nada
   * más, y lo primero que se ve de Tenerife desde Gran Canaria de noche es
   * justo eso: el resplandor de Santa Cruz y La Laguna en la costa. Son las
   * mismas luces que las de casa —la misma rejilla de OpenStreetMap, el
   * mismo material—, colgadas del vecino. Se piden después de arrancar,
   * como su fotografía. Ver la carga en `main.ts`.
   */
  ponerLuces(
    ciudad: Ciudad,
    enElAeropuerto: (x: number, z: number) => boolean,
    nivelDelAgua: number,
  ): void {
    if (this.lucesDeCiudad) return;
    this.lucesDeCiudad = crearLucesDeCiudad(
      ciudad,
      (x, z) => this.terreno.sampleHeight(x, z),
      enElAeropuerto,
      nivelDelAgua,
    );
    this.lucesDeCiudad.ponerSol(this.seno);
    this.grupo.add(this.lucesDeCiudad.grupo);
  }

  /** Enciende o apaga sus luces. `seno` es `sunDirection.y`. */
  ponerSol(seno: number): void {
    this.seno = seno;
    this.lucesDeCiudad?.ponerSol(seno);
    this.aerodromoLejano.ponerSol(seno);
  }

  /**
   * Su fotografía, cuando llegue. Se pide **después** de arrancar: no hace
   * falta para despegar, y en un teléfono con 3G eran dos megas más de espera
   * antes de poder jugar. Ver la carga en `main.ts`.
   */
  ponerFoto(foto: { textura: Texture; uv(x: number, z: number): Punto2 }): void {
    this.terreno.ponerOrtofoto(foto, this.exposicion);
    this.tieneFoto = true;
    // Poner la foto rehace el material, y con él se va el fundido: se
    // vuelve a poner si ya estaba la del horizonte.
    this.fundir();
  }

  private tieneFoto = false;
  private envoltorio: MeshLambertMaterial["onBeforeCompile"] | undefined;
  private debajo: MeshLambertMaterial["onBeforeCompile"] | undefined;
  private horizonte:
    | { textura: Texture; uv(x: number, z: number): Punto2; exposicion: number }
    | undefined;

  /**
   * **El borde de su foto, fundido con la del horizonte de casa.**
   *
   * La isla de enfrente lleva su propia foto, fina —ocho metros por píxel—,
   * que solo cubre su mapa; alrededor, el resto de la isla sale de la foto
   * del horizonte de casa, a ciento treinta y cinco. El paso de una a otra
   * era una raya recta: volando de noche hacia Tenerife, «la ortofoto parece
   * que es de calidad en la zona urbana, pero no es tan buena en el resto»,
   * con un recuadro nítido de canto duro alrededor de La Laguna. No era la
   * zona urbana: era el borde del mapa fino.
   *
   * Así que en los últimos kilómetros de su mapa la foto fina se va
   * cambiando por la gruesa, **la misma que hay al otro lado del borde** y
   * con su misma exposición: al llegar al canto ya son iguales y no queda
   * nada que se vea. Es una lectura más de textura en esa franja y ninguna
   * en el resto.
   */
  fundirConElHorizonte(foto: {
    textura: Texture;
    uv(x: number, z: number): Punto2;
    exposicion: number;
  }): void {
    this.horizonte = foto;
    this.fundir();
  }

  private fundir(): void {
    const h = this.horizonte;
    if (!h || !this.tieneFoto) return;
    const malla = this.terreno.group.getObjectByName("terreno") as Mesh | undefined;
    if (!malla) return;
    const mat = malla.material as MeshLambertMaterial;
    /*
     * La foto del horizonte se lee con coordenadas de **casa**; el vecino
     * está corrido. En dieciocho kilómetros la proyección es una recta a
     * todos los efectos, así que basta con tres puntos para escribirla como
     * una cuenta afín de las coordenadas del vecino.
     */
    const { x: dx, z: dz } = this.desplazamiento;
    const o = h.uv(dx, dz);
    const ex = h.uv(dx + 1000, dz);
    const ez = h.uv(dx, dz + 1000);
    const afinU = new Vector3((ex.u - o.u) / 1000, (ez.u - o.u) / 1000, o.u);
    const afinV = new Vector3((ex.v - o.v) / 1000, (ez.v - o.v) / 1000, o.v);
    const ajuste = h.exposicion / this.exposicion;
    const medioLado = this.medioLado;
    // Lo que ya tuviera el material —el grano—, y no el fundido de una vez
    // anterior: envolverlo dos veces declara los uniformes dos veces.
    const previo =
      mat.onBeforeCompile === this.envoltorio ? this.debajo! : mat.onBeforeCompile;
    this.debajo = previo;
    this.envoltorio = (shader, pintor) => {
      previo.call(mat, shader, pintor);
      mat.userData.fundido = true;
      shader.uniforms.fotoHorizonte = { value: h.textura };
      shader.uniforms.afinU = { value: afinU };
      shader.uniforms.afinV = { value: afinV };
      shader.uniforms.ajusteHorizonte = { value: ajuste };
      shader.uniforms.medioLadoFino = { value: medioLado };
      shader.uniforms.fundidoFino = { value: FUNDIDO };
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "varying vec2 vDelVecino;\nvoid main() {")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvDelVecino = position.xz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", GLSL_DEL_FUNDIDO.cabecera + "\nvoid main() {")
        .replace("#include <map_fragment>", GLSL_DEL_FUNDIDO.mapa);
    };
    mat.onBeforeCompile = this.envoltorio;
    mat.customProgramCacheKey = () => "grano-del-suelo+fundido";
    mat.needsUpdate = true;
  }

  /**
   * Un paso de cámara: de lejos, la isla con menos detalle.
   *
   * Con el mundo entero dentro del plano lejano, las cuatro islas vecinas de
   * Gran Canaria se dibujaban siempre, cada una con su mapa fino entero: 1,3
   * millones de triángulos en vez de 0,8 para ver unas siluetas a cien
   * kilómetros. A partir de treinta kilómetros del borde de su mapa se
   * dibuja un nudo de cada cuatro; con cinco de holgura para volver, que así
   * no parpadea quien vuele justo por la raya.
   *
   * **Y el aeródromo se apaga**: a cuarenta y tantos kilómetros una pista es
   * menos de un píxel, pero sus luces no, porque se dibujan a tamaño fijo en
   * pantalla, y Tenerife Sur salía desde Gran Canaria como una mancha verde,
   * blanca y roja pegada a la costa. Ninguna luz de pista se ve a cien
   * kilómetros; a treinta y tantos, las de aproximación sí, y ahí ya vuelve.
   */
  alPaso(ojoX: number, ojoZ: number): void {
    const d = Math.max(
      Math.abs(ojoX - this.desplazamiento.x),
      Math.abs(ojoZ - this.desplazamiento.z),
    ) - this.medioLado;
    if (d > 35000 && !this.deLejos) this.ponerLejos(true);
    else if (d < 30000 && this.deLejos) this.ponerLejos(false);
    if (this.deLejos) this.aerodromoLejano.alPaso(performance.now() / 1000);
  }

  private ponerLejos(lejos: boolean): void {
    this.deLejos = lejos;
    this.terreno.ponerDetalle(lejos ? 4 : 1);
    for (const o of this.terreno.group.children)
      if (o.name.startsWith("aerodromo:")) o.visible = !lejos;
    this.deLejosVisible.visible = lejos;
    this.deCercaVisible.visible = !lejos;
  }

  private deLejos = false;

  /** Cuánto se multiplica su foto para casar con el horizonte de casa. */
  private readonly exposicion: number;

  /**
   * La cota del vecino en coordenadas del **mundo de salida**, o `null` si la
   * pregunta no cae en su mapa.
   *
   * Devolver `null` fuera es lo que permite encadenar: quien pregunta se queda
   * con la primera respuesta que no sea nula. Si esto devolviera el borde
   * repetido —que es lo que hace un mapa de alturas por su cuenta— el vecino
   * contestaría a todo el mundo y taparía al de salida.
   */
  cota(x: number, z: number): number | null {
    const dx = x - this.desplazamiento.x;
    const dz = z - this.desplazamiento.z;
    if (Math.abs(dx) > this.medioLado || Math.abs(dz) > this.medioLado)
      return null;
    return this.terreno.sampleHeight(dx, dz);
  }

  /** Si un punto del mundo de salida cae dentro de la isla del vecino. */
  dentro(x: number, z: number): boolean {
    return this.cota(x, z) !== null;
  }
}
