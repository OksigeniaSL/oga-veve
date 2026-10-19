#!/usr/bin/env node
/**
 * **El hilo musical, del original al bucle que toca el juego**, y **el trozo
 * de la canción** que suena al acabar la luz verde.
 *
 *     node scripts/hacer-musica.mjs             # todo
 *     node scripts/hacer-musica.mjs canarias    # una
 *     node scripts/hacer-musica.mjs luz-verde   # el trozo de la canción
 *
 * Coge `crudo/musica/<nombre>.mp3` —la música de embarque de los vuelos de
 * Paraguay y de los de Canarias, ver `CREDITOS.md`— y escribe en
 * `src/assets/musica/` el bucle horneado en Opus y en AAC, y en
 * `bucles.json` dónde empieza y cuánto dura cada vuelta. Ver
 * `src/audio/hilo-musical.ts`, que es quien decide cuándo suena.
 *
 * ## Un bucle sin salto
 *
 * Una pieza de noventa segundos que vuelve a empezar se nota siempre: la
 * última nota se corta y la primera entra de golpe, y en un embarque largo se
 * oye cada minuto y medio. Así que no se repite la pieza: se busca **dónde se
 * parece el final al principio** y se cruzan ahí.
 *
 * - El final útil es hasta donde empieza el fundido de salida: se mide por
 *   la fuerza de cada medio segundo, y donde cae para no volver, se acaba.
 * - Se compara cada trocito del principio con cada trocito de cerca del
 *   final por dos cosas: **las notas** —el croma, cuánto suena cada una de
 *   las doce— y **el pulso** —dónde golpean las cuerdas—. El par que más se
 *   parece es el punto de bucle: ahí la música está en el mismo acorde y en
 *   el mismo tiempo del compás.
 * - Y se afina a la muestra, buscando el desfase de menos de diez
 *   milisegundos que mejor casa las dos ondas, para que al cruzarlas se
 *   sumen y no se anulen.
 * - El cruce dura dos segundos y medio: el final se va mientras el principio
 *   entra. El último trozo de la vuelta enlaza muestra a muestra con el
 *   primero.
 *
 * ## Y medio segundo de más a cada lado
 *
 * El fichero lleva delante el último medio segundo de la vuelta y detrás el
 * primero. Un códec con pérdida mete unas centésimas de silencio al empezar
 * —lo que el decodificador quita o no según el navegador—, y con ese margen
 * da igual: el bucle se toca de `desde` a `desde + dura`, y medio segundo
 * corrido a un lado o al otro sigue siendo la misma vuelta.
 *
 * ## Mono, igualada y sin precarga
 *
 * Mono, porque suena por el altavoz del techo, que es uno. Igualada a la
 * misma sonoridad que las voces —−16 LUFS, como `hacer-pack-de-voz.mjs`— con
 * una ganancia fija y no con `loudnorm` a secas, que cambia la ganancia por el
 * camino y dejaría el final de la vuelta a otro volumen que el principio. Lo
 * baja la mezcla, que la música va dieciocho decibelios por debajo de todo:
 * ver `audio/mezcla.ts`.
 *
 * Opus para casi todos y AAC para Safari, los dos desde la misma vuelta y
 * nunca uno del otro, como las voces. Entran por `import` con la huella en el
 * nombre: no van en la precarga del trabajador de servicio y se guardan la
 * primera vez que suenan. Ver `scripts/plantilla-sw.js`.
 *
 * ## El trozo de la canción
 *
 * «Luz verde», la canción de Granja Óga, entra en el juego en un trozo: el que
 * suena cuando aterrizan todos los avioncitos del juego de la torre. Ver
 * `src/audio/cancion.ts`. No es un bucle, suena una vez: se corta el trozo
 * del original y se le pone su fundido de entrada y de salida.
 *
 * - **Los cortes se buscan por la fuerza del sonido**: cerca de cada punto
 *   apuntado a oído en `TROZOS`, el trocito de veinte milisegundos más
 *   callado. El de entrada cae en la pausa de antes de la primera palabra y
 *   el de salida, en la cola del último acorde antes de que vuelva el bajo
 *   con la estrofa siguiente: los dos en el borde de un compás, donde la
 *   canción respira.
 * - **El fundido de entrada es corto**, lo justo para que no chasquee, que el
 *   corte ya está en silencio; **el de salida, largo**, sobre la cola del
 *   último acorde, que se apaga como se apagaría la canción.
 * - Y la misma sonoridad que las voces, con la ganancia fija, en mono —el
 *   juego la toca por el altavoz de la tablet, no por el del techo, pero la
 *   cabina de pasaje no da para estéreo— y en Opus y AAC. Dónde empieza y
 *   cuánto dura, en `trozos.json`.
 *
 * Cero dependencias de Node: solo `ffmpeg` en el PATH.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CRUDO = "crudo/musica";
const SALIDA = "src/assets/musica";
/**
 * **Los trozos de canción**, con sus cortes apuntados a oído, s del original:
 * el script los afina a la pausa más cercana. Ver la cabecera.
 */
const TROZOS = {
  /*
   * «Luz verde» (3:12): el puente entero y el primer estribillo. «Arrancá el
   * motor, soltá el freno, seguí la raya verde despacito, pará del todo, mirá
   * la pista… y esperá la luz. ¡Luz verde! La pista es tuya, motor a fondo y
   * la nariz al cielo. El mundo es grande, pero vos también: volá sin miedo,
   * que yo te espero.»
   *
   * El estribillo empieza en el 1:11 y acaba en el 1:25 con su cola: catorce
   * segundos. Desde «y esperá la luz» serían veinte, y desde «pará del todo,
   * mirá la pista», veintitrés; el puente entero son ocho compases que
   * empiezan con el bajo, después de una pausa, y es el sitio limpio para
   * entrar: treinta segundos, y lo que cuenta la letra es lo mismo que el
   * juego —esperar la luz para tener la pista—.
   */
  "luz-verde": { entra: 57.4, sale: 87.5 },
};
const MUSICAS = process.argv.length > 2 ? process.argv.slice(2) : ["paraguay", "canarias", ...Object.keys(TROZOS)];
/** Lo que se busca alrededor de cada corte apuntado, s: antes y después. */
const BUSCA_ANTES = 0.4;
const BUSCA_DESPUES = 0.15;
/** El fundido de entrada y el de salida del trozo, s. Ver la cabecera. */
const FUNDE_ENTRADA = 0.12;
const FUNDE_SALIDA = 1.6;

/** La frecuencia de muestreo de todo: la del original y la de Opus. */
const SR = 48000;
/** Lo que dura el cruce del final con el principio, s. */
const CRUCE = 2.5;
/** El margen a cada lado del bucle en el fichero, s. Ver la cabecera. */
const MARGEN = 0.5;
/**
 * **Lo menos que dura una vuelta**, s: un bucle corto se nota. Con sesenta, el
 * mejor cruce de las dos piezas caía en el primer estribillo que se repite
 * —una vuelta de un minuto que tiraba veinte segundos de música—; con setenta
 * y dos, se parecen igual y entra casi toda.
 */
const VUELTA_MINIMA = 72;
/** Hasta dónde se busca el principio de la vuelta, s. */
const PRINCIPIO_HASTA = 10;
/** La sonoridad de las voces, LUFS, y el pico que no se pasa, dBTP. */
const SONORIDAD = -16;
const PICO = -1.5;

const MB = 1024 * 1024;
const ffmpeg = (args, opciones = {}) =>
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { maxBuffer: 256 * MB, ...opciones });

/** El original, en mono y a 48 kHz, como números. */
function leer(ruta) {
  const crudo = ffmpeg(["-i", ruta, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"]);
  return new Float32Array(crudo.buffer, crudo.byteOffset, crudo.length / 4).slice();
}

// ── Lo que se compara: la fuerza, las notas y el pulso ──────────────────

const HOP = 480; // diez milisegundos
const N = 4096;

/** Una FFT de base dos, en su sitio. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let largo = 2; largo <= n; largo <<= 1) {
    const ang = (-2 * Math.PI) / largo;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += largo) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < largo / 2; k++) {
        const a = i + k;
        const b = a + largo / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/**
 * Por cada diez milisegundos: el croma —doce números, cuánto suena cada nota
 * de la escala, normalizado— y el pulso —cuánto crece el sonido respecto al
 * trozo anterior—.
 */
function rasgos(x) {
  const tramas = Math.floor((x.length - N) / HOP);
  const croma = new Float32Array(tramas * 12);
  const pulso = new Float32Array(tramas);
  const ventana = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const nota = new Int8Array(N / 2).fill(-1);
  for (let k = 1; k < N / 2; k++) {
    const f = (k * SR) / N;
    if (f < 80 || f > 4000) continue;
    nota[k] = ((Math.round(12 * Math.log2(f / 440)) % 12) + 12) % 12;
  }
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  let antes = new Float32Array(N / 2);
  for (let t = 0; t < tramas; t++) {
    for (let i = 0; i < N; i++) {
      re[i] = x[t * HOP + i] * ventana[i];
      im[i] = 0;
    }
    fft(re, im);
    const ahora = new Float32Array(N / 2);
    let flujo = 0;
    for (let k = 1; k < N / 2; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]));
      ahora[k] = m;
      flujo += Math.max(0, m - antes[k]);
      if (nota[k] >= 0) croma[t * 12 + nota[k]] += m;
    }
    antes = ahora;
    pulso[t] = flujo;
    let n2 = 0;
    for (let c = 0; c < 12; c++) n2 += croma[t * 12 + c] ** 2;
    const n = Math.sqrt(n2) || 1;
    for (let c = 0; c < 12; c++) croma[t * 12 + c] /= n;
  }
  return { tramas, croma, pulso };
}

/** Dónde empieza el fundido de salida, s: lo último que suena a la fuerza de siempre. */
function finUtil(x) {
  const medio = SR / 2;
  const db = [];
  for (let i = 0; i + medio <= x.length; i += medio) {
    let s = 0;
    for (let j = 0; j < medio; j++) s += x[i + j] * x[i + j];
    db.push(10 * Math.log10(s / medio + 1e-12));
  }
  const ordenados = [...db].sort((a, b) => a - b);
  const mediana = ordenados[Math.floor(ordenados.length / 2)];
  let ultimo = db.length - 1;
  while (ultimo > 0 && db[ultimo] < mediana - 4) ultimo--;
  return (ultimo + 1) * 0.5;
}

/**
 * **Cuánto se parecen dos trozos**, de 0 a 1: las notas —el coseno medio de
 * los cromas— y el pulso —la correlación de los golpes—, a partes iguales.
 */
function parecido(r, a, b, largo, paso = 1) {
  let notas = 0;
  let n = 0;
  let sa = 0;
  let sb = 0;
  let saa = 0;
  let sbb = 0;
  let sab = 0;
  for (let k = 0; k < largo; k += paso) {
    let c = 0;
    for (let i = 0; i < 12; i++) c += r.croma[(a + k) * 12 + i] * r.croma[(b + k) * 12 + i];
    notas += c;
    const pa = r.pulso[a + k];
    const pb = r.pulso[b + k];
    sa += pa;
    sb += pb;
    saa += pa * pa;
    sbb += pb * pb;
    sab += pa * pb;
    n++;
  }
  const cov = sab / n - (sa / n) * (sb / n);
  const va = saa / n - (sa / n) ** 2;
  const vb = sbb / n - (sb / n) ** 2;
  const golpes = va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0;
  return 0.5 * (notas / n) + 0.5 * Math.max(0, golpes);
}

/** El punto de bucle: el principio `a` y el final `b`, en muestras, y cuánto se parecen. */
function puntoDeBucle(x) {
  const r = rasgos(x);
  const fin = finUtil(x);
  const tramasDelCruce = Math.round((CRUCE * SR) / HOP);
  const deS = (s) => Math.round((s * SR) / HOP);
  const bHasta = Math.min(r.tramas - tramasDelCruce - 1, deS(fin - CRUCE - 0.05));
  let mejor = { a: 0, b: 0, s: -Infinity };
  // A lo grueso, de cinco en cinco tramas…
  for (let a = 0; a <= deS(PRINCIPIO_HASTA); a += 5)
    for (let b = a + deS(VUELTA_MINIMA); b <= bHasta; b += 5) {
      const s = parecido(r, a, b, tramasDelCruce, 2);
      if (s > mejor.s) mejor = { a, b, s };
    }
  // …y afinado, trama a trama, alrededor.
  const grueso = mejor;
  for (let a = Math.max(0, grueso.a - 5); a <= grueso.a + 5; a++)
    for (let b = Math.max(a + deS(VUELTA_MINIMA), grueso.b - 5); b <= Math.min(bHasta, grueso.b + 5); b++) {
      const s = parecido(r, a, b, tramasDelCruce);
      if (s > mejor.s) mejor = { a, b, s };
    }
  // Y a la muestra: el desfase que mejor casa las dos ondas en el cruce.
  const a = mejor.a * HOP;
  const b0 = mejor.b * HOP;
  const largo = Math.round(CRUCE * SR);
  let mejorD = 0;
  let mejorC = -Infinity;
  let ea = 0;
  for (let i = 0; i < largo; i++) ea += x[a + i] * x[a + i];
  for (let d = -HOP; d <= HOP; d++) {
    let c = 0;
    let eb = 0;
    for (let i = 0; i < largo; i++) {
      c += x[a + i] * x[b0 + d + i];
      eb += x[b0 + d + i] * x[b0 + d + i];
    }
    const cn = c / Math.sqrt(ea * eb || 1);
    if (cn > mejorC) {
      mejorC = cn;
      mejorD = d;
    }
  }
  return { a, b: b0 + mejorD, parecido: mejor.s, onda: mejorC, fin };
}

/**
 * **La vuelta**: de `a` a `b`, con el cruce al principio. Si las dos ondas se
 * parecen —están casadas a la muestra—, el cruce es de ganancia constante,
 * que no hincha la suma; si no, de potencia constante, que no la hunde.
 */
function vuelta(x, a, b, onda) {
  const L = b - a;
  const X = Math.round(CRUCE * SR);
  const out = new Float32Array(L);
  const potencia = onda < 0.5;
  for (let i = 0; i < L; i++) {
    if (i >= X) {
      out[i] = x[a + i];
      continue;
    }
    const w = i / X;
    const entra = potencia ? Math.sin((w * Math.PI) / 2) : 0.5 - 0.5 * Math.cos(w * Math.PI);
    const sale = potencia ? Math.cos((w * Math.PI) / 2) : 1 - entra;
    out[i] = x[a + i] * entra + x[b + i] * sale;
  }
  return out;
}

/** `ebur128` escribe en la salida de errores; se lee de ahí. */
function loQueMide(muestras) {
  const ruta = join(tmpdir(), `oga-musica-${process.pid}.f32`);
  writeFileSync(ruta, Buffer.from(muestras.buffer, muestras.byteOffset, muestras.byteLength));
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-f", "f32le", "-ar", String(SR), "-ac", "1", "-i", ruta, "-af", "ebur128=peak=true", "-f", "null", "-"],
    { maxBuffer: 64 * MB, encoding: "utf8" },
  ).stderr;
  unlinkSync(ruta);
  const resumen = r.slice(r.lastIndexOf("Summary"));
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(resumen)?.[1]);
  const pico = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(resumen)?.[1]);
  return { I, pico };
}

/**
 * **El salto en la costura**: lo que cambia la onda de la última muestra de la
 * vuelta a la primera, frente a lo que cambia de una muestra a la siguiente
 * en el noventa y nueve por ciento de la vuelta. Por debajo de uno, la
 * costura no se distingue de la música.
 */
function salto(y, desde, dura) {
  const L = Math.round(dura * SR);
  const pasos = new Float32Array(L - 1);
  for (let i = 1; i < L; i++) pasos[i - 1] = Math.abs(y[desde + i] - y[desde + i - 1]);
  pasos.sort();
  const casiTodos = pasos[Math.floor(pasos.length * 0.99)] || 1;
  return Math.abs(y[desde] - y[desde + L - 1]) / casiTodos;
}

// ── El trozo de canción ──────────────────────────────────────────────────

/** **El corte**, en muestras: el trocito de veinte milisegundos más callado cerca de `s` segundos. */
function corte(x, s) {
  const trocito = Math.round(0.02 * SR);
  const paso = Math.round(0.005 * SR);
  let mejor = { i: Math.round(s * SR), db: Infinity };
  for (let i = Math.round((s - BUSCA_ANTES) * SR); i + trocito <= Math.round((s + BUSCA_DESPUES) * SR); i += paso) {
    let e = 0;
    for (let j = 0; j < trocito; j++) e += x[i + j] * x[i + j];
    const db = 10 * Math.log10(e / trocito + 1e-12);
    if (db < mejor.db) mejor = { i: i + Math.round(trocito / 2), db };
  }
  return mejor;
}

/** **El trozo**, con su fundido de entrada corto y el de salida largo, de coseno: sin escalón. */
function trozo(x, a, b) {
  const out = x.slice(a, b);
  const fe = Math.round(FUNDE_ENTRADA * SR);
  const fs = Math.round(FUNDE_SALIDA * SR);
  for (let i = 0; i < fe; i++) out[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fe);
  for (let i = 0; i < fs; i++) out[out.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fs);
  return out;
}

/** Hornea un trozo de canción en Opus y AAC, y apunta en `trozos` dónde y cuánto. */
function hacerTrozo(nombre, x, trozos) {
  const t = TROZOS[nombre];
  const a = corte(x, t.entra);
  const b = corte(x, t.sale);
  const v = trozo(x, a.i, b.i);
  const { I, pico } = loQueMide(v);
  const ganancia = Math.min(SONORIDAD - I, PICO - pico);
  const g = 10 ** (ganancia / 20);
  for (let i = 0; i < v.length; i++) v[i] *= g;
  const crudo = join(tmpdir(), `oga-musica-${nombre}-${process.pid}.f32`);
  writeFileSync(crudo, Buffer.from(v.buffer));
  const entrada = ["-f", "f32le", "-ar", String(SR), "-ac", "1", "-i", crudo];
  const opus = join(SALIDA, `${nombre}.ogg`);
  const aac = join(SALIDA, `${nombre}.m4a`);
  // Con algo más que el hilo musical, que esto lleva voz y se oye en primer plano.
  ffmpeg([...entrada, "-c:a", "libopus", "-b:a", "48k", "-application", "audio", opus]);
  ffmpeg([...entrada, "-c:a", "aac", "-b:a", "64k", aac]);
  unlinkSync(crudo);
  const dura = v.length / SR;
  trozos[nombre] = {
    dura: Number(dura.toFixed(3)),
    original: { entra: Number((a.i / SR).toFixed(3)), sale: Number((b.i / SR).toFixed(3)) },
    ganancia: Number(ganancia.toFixed(2)),
  };
  const kb = (statSync(opus).size + statSync(aac).size) / 1024;
  console.log(
    `\n  ${nombre} · trozo de ${dura.toFixed(2)} s: del ${(a.i / SR).toFixed(2)} al ${(b.i / SR).toFixed(2)} del original ` +
      `(los cortes, a ${a.db.toFixed(0)} y ${b.db.toFixed(0)} dB)\n` +
      `  ganancia ${ganancia.toFixed(1)} dB · ${(statSync(opus).size / 1024).toFixed(0)} KB en Opus · ` +
      `${(statSync(aac).size / 1024).toFixed(0)} KB en AAC · ${kb.toFixed(0)} KB los dos`,
  );
}

mkdirSync(SALIDA, { recursive: true });
const rutaBucles = join(SALIDA, "bucles.json");
const bucles = existsSync(rutaBucles) ? JSON.parse(readFileSync(rutaBucles, "utf8")) : {};
const rutaTrozos = join(SALIDA, "trozos.json");
const trozos = existsSync(rutaTrozos) ? JSON.parse(readFileSync(rutaTrozos, "utf8")) : {};

for (const nombre of MUSICAS) {
  const original = join(CRUDO, `${nombre}.mp3`);
  if (!existsSync(original)) {
    console.error(`  No encuentro ${original}`);
    process.exit(1);
  }
  const x = leer(original);
  if (TROZOS[nombre]) {
    hacerTrozo(nombre, x, trozos);
    continue;
  }
  const p = puntoDeBucle(x);
  const v = vuelta(x, p.a, p.b, p.onda);
  // La ganancia fija, para que la vuelta suene como las voces y sin pasarse de pico.
  const { I, pico } = loQueMide(v);
  const ganancia = Math.min(SONORIDAD - I, PICO - pico);
  const g = 10 ** (ganancia / 20);
  const M = Math.round(MARGEN * SR);
  const fichero = new Float32Array(M + v.length + M);
  fichero.set(v.subarray(v.length - M), 0);
  fichero.set(v, M);
  fichero.set(v.subarray(0, M), M + v.length);
  for (let i = 0; i < fichero.length; i++) fichero[i] *= g;

  const crudo = join(tmpdir(), `oga-musica-${nombre}-${process.pid}.f32`);
  writeFileSync(crudo, Buffer.from(fichero.buffer));
  const entrada = ["-f", "f32le", "-ar", String(SR), "-ac", "1", "-i", crudo];
  const opus = join(SALIDA, `${nombre}.ogg`);
  const aac = join(SALIDA, `${nombre}.m4a`);
  ffmpeg([...entrada, "-c:a", "libopus", "-b:a", "40k", "-application", "audio", opus]);
  ffmpeg([...entrada, "-c:a", "aac", "-b:a", "64k", aac]);
  unlinkSync(crudo);

  const dura = v.length / SR;
  bucles[nombre] = {
    desde: MARGEN,
    dura: Number(dura.toFixed(6)),
    original: {
      desde: Number((p.a / SR).toFixed(3)),
      hasta: Number((p.b / SR).toFixed(3)),
      finUtil: p.fin,
    },
    parecido: Number(p.parecido.toFixed(3)),
    onda: Number(p.onda.toFixed(3)),
    ganancia: Number(ganancia.toFixed(2)),
  };
  // Y la costura, medida en lo horneado: el Opus vuelto a abrir.
  const vuelto = leer(opus);
  const s = salto(vuelto, M, dura);
  const kb = (statSync(opus).size + statSync(aac).size) / 1024;
  console.log(
    `\n  ${nombre} · vuelta de ${dura.toFixed(2)} s (del ${(p.a / SR).toFixed(2)} al ${(p.b / SR).toFixed(2)} del original; ` +
      `el fundido de salida empieza en ${p.fin.toFixed(1)})\n` +
      `  parecido del cruce ${p.parecido.toFixed(2)} · ondas casadas a ${p.onda.toFixed(2)} · ganancia ${ganancia.toFixed(1)} dB\n` +
      `  costura en el Opus: ${s.toFixed(2)} del paso más grande de la onda (por debajo de uno no se distingue)\n` +
      `  ${(statSync(opus).size / 1024).toFixed(0)} KB en Opus · ${(statSync(aac).size / 1024).toFixed(0)} KB en AAC · ${kb.toFixed(0)} KB los dos`,
  );
}

writeFileSync(rutaBucles, JSON.stringify(bucles, null, 2) + "\n");
writeFileSync(rutaTrozos, JSON.stringify(trozos, null, 2) + "\n");
console.log(`\n  → ${SALIDA}\n`);
