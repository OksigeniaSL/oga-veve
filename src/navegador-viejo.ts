/**
 * **Lo que un navegador de 2022 no tiene, hecho a mano.**
 *
 * El juego llega también a pizarras digitales de aula, y alguna lleva un
 * Android 8 con Firefox 98 que ya no se actualiza (ver
 * `src/navegador-viejo.test.ts`). Lo que ese navegador no conoce no puede
 * romper el juego ni cambiar lo que se enseña: el relieve del Teide sin
 * descomprimir es un Teide inventado, y eso es falsear el contenido.
 *
 * Cada función usa lo del navegador cuando existe y solo hace la cuenta a
 * mano cuando falta. Viven juntas para que la prueba pueda exigir que **nadie
 * más** llame a esas funciones nuevas a pelo: lo que se use fuera de aquí sin
 * reserva vuelve a romper la pizarra sin que nadie lo vea en su portátil.
 */

/**
 * Un rectángulo de esquinas redondeadas en el trazado en curso, como
 * `roundRect` (Firefox 112, Chrome 99), que no empieza trazado nuevo.
 * Sin él, `arcTo` dibuja lo mismo desde siempre.
 */
export function rectanguloRedondeado(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  radio: number,
): void {
  if (typeof g.roundRect === "function") {
    g.roundRect(x, y, ancho, alto, radio);
    return;
  }
  const r = Math.max(0, Math.min(radio, Math.abs(ancho) / 2, Math.abs(alto) / 2));
  g.moveTo(x + r, y);
  g.lineTo(x + ancho - r, y);
  g.arcTo(x + ancho, y, x + ancho, y + r, r);
  g.lineTo(x + ancho, y + alto - r);
  g.arcTo(x + ancho, y + alto, x + ancho - r, y + alto, r);
  g.lineTo(x + r, y + alto);
  g.arcTo(x, y + alto, x, y + alto - r, r);
  g.lineTo(x, y + r);
  g.arcTo(x, y, x + r, y, r);
  g.closePath();
}

/**
 * Una señal que corta una petición pasados `ms`, como `AbortSignal.timeout`
 * (Firefox 100). En el 98 aquello lanzaba dentro del `try` y el juego se
 * quedaba siempre con el tiempo de casa, sin decir por qué.
 */
export function senalConPlazo(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
  const corte = new AbortController();
  setTimeout(() => corte.abort(), ms);
  return corte.signal;
}

/**
 * Los bytes de un fichero gzip, descomprimidos.
 *
 * Con `DecompressionStream` (Firefox 113, Chrome 80) lo hace el navegador. Sin
 * él, `desgzip`, que es más lento pero da lo mismo byte a byte.
 */
export async function descomprimirGzip(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream === "function") {
    const flujo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(flujo).arrayBuffer();
  }
  const fuera = desgzip(new Uint8Array(bytes));
  return fuera.buffer.slice(fuera.byteOffset, fuera.byteOffset + fuera.byteLength) as ArrayBuffer;
}

/**
 * **Gzip a mano** (RFC 1952 por fuera, RFC 1951 por dentro), un solo miembro,
 * como los que escribe `zlib.gzipSync` al empaquetar. No mira el CRC: lo que
 * llega mal se nota igual al leerlo como relieve, que comprueba su tamaño.
 */
export function desgzip(gz: Uint8Array): Uint8Array {
  if (gz.length < 18 || gz[0] !== 0x1f || gz[1] !== 0x8b || gz[2] !== 8)
    throw new Error("no es gzip");
  const banderas = gz[3]!;
  let p = 10;
  if (banderas & 4) p += 2 + (gz[p]! | (gz[p + 1]! << 8));
  if (banderas & 8) while (gz[p++] !== 0 && p < gz.length);
  if (banderas & 16) while (gz[p++] !== 0 && p < gz.length);
  if (banderas & 2) p += 2;
  // El tamaño sin comprimir va en los cuatro últimos bytes (módulo 2³²).
  const n = gz.length;
  const tamano = (gz[n - 4]! | (gz[n - 3]! << 8) | (gz[n - 2]! << 16) | (gz[n - 1]! << 24)) >>> 0;
  return inflar(gz.subarray(p, n - 8), tamano);
}

const BASE_LARGO = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131,
  163, 195, 227, 258,
];
const EXTRA_LARGO = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
];
const BASE_DISTANCIA = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049,
  3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const EXTRA_DISTANCIA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];
const ORDEN_DE_LONGITUDES = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/** Un código de Huffman canónico: cuántos símbolos hay de cada largo y cuáles. */
interface Huffman {
  readonly cuenta: Uint16Array;
  readonly simbolo: Uint16Array;
}

function huffman(largos: ArrayLike<number>, n: number): Huffman {
  const cuenta = new Uint16Array(16);
  for (let s = 0; s < n; s++) cuenta[largos[s]!]!++;
  const desde = new Uint16Array(16);
  for (let l = 1; l < 15; l++) desde[l + 1] = desde[l]! + cuenta[l]!;
  const simbolo = new Uint16Array(n);
  for (let s = 0; s < n; s++) if (largos[s]) simbolo[desde[largos[s]!]!++] = s;
  cuenta[0] = 0;
  return { cuenta, simbolo };
}

let FIJO: { largo: Huffman; distancia: Huffman } | null = null;
function codigosFijos(): { largo: Huffman; distancia: Huffman } {
  if (FIJO) return FIJO;
  const l = new Uint8Array(288);
  l.fill(8, 0, 144);
  l.fill(9, 144, 256);
  l.fill(7, 256, 280);
  l.fill(8, 280, 288);
  FIJO = { largo: huffman(l, 288), distancia: huffman(new Uint8Array(30).fill(5), 30) };
  return FIJO;
}

/** Deflate en crudo. `previsto` es el tamaño esperado; si se queda corto, se agranda. */
export function inflar(entrada: Uint8Array, previsto = entrada.length * 4): Uint8Array {
  let salida = new Uint8Array(Math.max(1024, previsto));
  let fin = 0;
  let pos = 0;
  let reserva = 0;
  let nReserva = 0;

  const bits = (n: number): number => {
    while (nReserva < n) {
      if (pos >= entrada.length) throw new Error("deflate cortado");
      reserva |= entrada[pos++]! << nReserva;
      nReserva += 8;
    }
    const v = reserva & ((1 << n) - 1);
    reserva >>>= n;
    nReserva -= n;
    return v;
  };
  const sitio = (mas: number): void => {
    if (fin + mas <= salida.length) return;
    const nueva = new Uint8Array(Math.max(salida.length * 2, fin + mas));
    nueva.set(salida.subarray(0, fin));
    salida = nueva;
  };
  const decodificar = (h: Huffman): number => {
    let codigo = 0;
    let primero = 0;
    let indice = 0;
    for (let largo = 1; largo < 16; largo++) {
      codigo |= bits(1);
      const c = h.cuenta[largo]!;
      if (codigo - c < primero) return h.simbolo[indice + (codigo - primero)]!;
      indice += c;
      primero = (primero + c) << 1;
      codigo <<= 1;
    }
    throw new Error("código de Huffman imposible");
  };

  let ultimo = 0;
  while (!ultimo) {
    ultimo = bits(1);
    const tipo = bits(2);
    if (tipo === 0) {
      // Guardado tal cual: al byte siguiente, largo y su complemento.
      reserva = 0;
      nReserva = 0;
      if (pos + 4 > entrada.length) throw new Error("deflate cortado");
      const largo = entrada[pos]! | (entrada[pos + 1]! << 8);
      pos += 4;
      if (pos + largo > entrada.length) throw new Error("deflate cortado");
      sitio(largo);
      salida.set(entrada.subarray(pos, pos + largo), fin);
      fin += largo;
      pos += largo;
      continue;
    }
    let lc: Huffman;
    let dc: Huffman;
    if (tipo === 1) ({ largo: lc, distancia: dc } = codigosFijos());
    else if (tipo === 2) {
      const nLargos = bits(5) + 257;
      const nDistancias = bits(5) + 1;
      const nCodigos = bits(4) + 4;
      const largos = new Uint8Array(320);
      for (let i = 0; i < nCodigos; i++) largos[ORDEN_DE_LONGITUDES[i]!] = bits(3);
      const deLargos = huffman(largos, 19);
      largos.fill(0);
      for (let i = 0; i < nLargos + nDistancias; ) {
        const s = decodificar(deLargos);
        if (s < 16) largos[i++] = s;
        else {
          let repite = 0;
          let valor = 0;
          if (s === 16) {
            if (i === 0) throw new Error("repetición sin anterior");
            valor = largos[i - 1]!;
            repite = 3 + bits(2);
          } else if (s === 17) repite = 3 + bits(3);
          else repite = 11 + bits(7);
          if (i + repite > nLargos + nDistancias) throw new Error("demasiados largos");
          largos.fill(valor, i, i + repite);
          i += repite;
        }
      }
      lc = huffman(largos.subarray(0, nLargos), nLargos);
      dc = huffman(largos.subarray(nLargos, nLargos + nDistancias), nDistancias);
    } else throw new Error("bloque deflate de tipo 3");

    for (;;) {
      const s = decodificar(lc);
      if (s < 256) {
        sitio(1);
        salida[fin++] = s;
      } else if (s === 256) break;
      else {
        const k = s - 257;
        if (k >= 29) throw new Error("largo imposible");
        const largo = BASE_LARGO[k]! + bits(EXTRA_LARGO[k]!);
        const d = decodificar(dc);
        if (d >= 30) throw new Error("distancia imposible");
        const distancia = BASE_DISTANCIA[d]! + bits(EXTRA_DISTANCIA[d]!);
        if (distancia > fin) throw new Error("distancia antes del principio");
        sitio(largo);
        // Byte a byte: la copia puede pisarse a sí misma, y así se repite.
        for (let j = 0; j < largo; j++) salida[fin + j] = salida[fin - distancia + j]!;
        fin += largo;
      }
    }
  }
  return salida.subarray(0, fin);
}
