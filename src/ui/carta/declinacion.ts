/**
 * **La declinación magnética de hoy**, con el Modelo Magnético Mundial.
 *
 * La rosa de una carta lleva dos nortes: el verdadero, arriba, y el magnético,
 * que es al que apunta la brújula, girado lo que diga la declinación del sitio
 * —«VAR 4°W»—. Y no es un número fijo: el norte magnético se mueve, y en
 * Canarias la declinación baja algo más de un décimo de grado cada año. Una
 * carta de verdad la imprime con su año; aquí se calcula el día que se juega.
 *
 * ## De dónde sale
 *
 * Del **WMM2025** (World Magnetic Model), de NCEI/NOAA y el BGS, válido de 2025
 * a 2030: los coeficientes del fichero `WMM.COF` publicado el 13 de noviembre
 * de 2024, copiados abajo tal cual, línea a línea. Es dominio público. La
 * cuenta es la de su informe técnico —armónicos esféricos de grado doce sobre
 * la Tierra elipsoidal WGS 84— y la comprueba `declinacion.test.ts` contra los
 * valores de prueba que publica el propio modelo.
 *
 * Fuera de 2025-2030 sigue calculando, pero el error crece: el modelo se
 * renueva cada cinco años y entonces hay que cambiar los coeficientes.
 */

/** El año del modelo: los coeficientes valen en esta fecha y cambian desde ella. */
export const EPOCA = 2025.0;

/**
 * `WMM.COF`: grado, orden, g, h (nT) y su cambio al año (nT/año). Se copia
 * entero y sin tocar, para que se pueda comparar con el original.
 */
const COF = `
1 0 -29351.8 0.0 12.0 0.0
1 1 -1410.8 4545.4 9.7 -21.5
2 0 -2556.6 0.0 -11.6 0.0
2 1 2951.1 -3133.6 -5.2 -27.7
2 2 1649.3 -815.1 -8.0 -12.1
3 0 1361.0 0.0 -1.3 0.0
3 1 -2404.1 -56.6 -4.2 4.0
3 2 1243.8 237.5 0.4 -0.3
3 3 453.6 -549.5 -15.6 -4.1
4 0 895.0 0.0 -1.6 0.0
4 1 799.5 278.6 -2.4 -1.1
4 2 55.7 -133.9 -6.0 4.1
4 3 -281.1 212.0 5.6 1.6
4 4 12.1 -375.6 -7.0 -4.4
5 0 -233.2 0.0 0.6 0.0
5 1 368.9 45.4 1.4 -0.5
5 2 187.2 220.2 0.0 2.2
5 3 -138.7 -122.9 0.6 0.4
5 4 -142.0 43.0 2.2 1.7
5 5 20.9 106.1 0.9 1.9
6 0 64.4 0.0 -0.2 0.0
6 1 63.8 -18.4 -0.4 0.3
6 2 76.9 16.8 0.9 -1.6
6 3 -115.7 48.8 1.2 -0.4
6 4 -40.9 -59.8 -0.9 0.9
6 5 14.9 10.9 0.3 0.7
6 6 -60.7 72.7 0.9 0.9
7 0 79.5 0.0 -0.0 0.0
7 1 -77.0 -48.9 -0.1 0.6
7 2 -8.8 -14.4 -0.1 0.5
7 3 59.3 -1.0 0.5 -0.8
7 4 15.8 23.4 -0.1 0.0
7 5 2.5 -7.4 -0.8 -1.0
7 6 -11.1 -25.1 -0.8 0.6
7 7 14.2 -2.3 0.8 -0.2
8 0 23.2 0.0 -0.1 0.0
8 1 10.8 7.1 0.2 -0.2
8 2 -17.5 -12.6 0.0 0.5
8 3 2.0 11.4 0.5 -0.4
8 4 -21.7 -9.7 -0.1 0.4
8 5 16.9 12.7 0.3 -0.5
8 6 15.0 0.7 0.2 -0.6
8 7 -16.8 -5.2 -0.0 0.3
8 8 0.9 3.9 0.2 0.2
9 0 4.6 0.0 -0.0 0.0
9 1 7.8 -24.8 -0.1 -0.3
9 2 3.0 12.2 0.1 0.3
9 3 -0.2 8.3 0.3 -0.3
9 4 -2.5 -3.3 -0.3 0.3
9 5 -13.1 -5.2 0.0 0.2
9 6 2.4 7.2 0.3 -0.1
9 7 8.6 -0.6 -0.1 -0.2
9 8 -8.7 0.8 0.1 0.4
9 9 -12.9 10.0 -0.1 0.1
10 0 -1.3 0.0 0.1 0.0
10 1 -6.4 3.3 0.0 0.0
10 2 0.2 0.0 0.1 -0.0
10 3 2.0 2.4 0.1 -0.2
10 4 -1.0 5.3 -0.0 0.1
10 5 -0.6 -9.1 -0.3 -0.1
10 6 -0.9 0.4 0.0 0.1
10 7 1.5 -4.2 -0.1 0.0
10 8 0.9 -3.8 -0.1 -0.1
10 9 -2.7 0.9 -0.0 0.2
10 10 -3.9 -9.1 -0.0 -0.0
11 0 2.9 0.0 0.0 0.0
11 1 -1.5 0.0 -0.0 -0.0
11 2 -2.5 2.9 0.0 0.1
11 3 2.4 -0.6 0.0 -0.0
11 4 -0.6 0.2 0.0 0.1
11 5 -0.1 0.5 -0.1 -0.0
11 6 -0.6 -0.3 0.0 -0.0
11 7 -0.1 -1.2 -0.0 0.1
11 8 1.1 -1.7 -0.1 -0.0
11 9 -1.0 -2.9 -0.1 0.0
11 10 -0.2 -1.8 -0.1 0.0
11 11 2.6 -2.3 -0.1 0.0
12 0 -2.0 0.0 0.0 0.0
12 1 -0.2 -1.3 0.0 -0.0
12 2 0.3 0.7 -0.0 0.0
12 3 1.2 1.0 -0.0 -0.1
12 4 -1.3 -1.4 -0.0 0.1
12 5 0.6 -0.0 -0.0 -0.0
12 6 0.6 0.6 0.1 -0.0
12 7 0.5 -0.1 -0.0 -0.0
12 8 -0.1 0.8 0.0 0.0
12 9 -0.4 0.1 0.0 -0.0
12 10 -0.2 -1.0 -0.1 -0.0
12 11 -1.3 0.1 -0.0 0.0
12 12 -0.7 0.2 -0.1 -0.1
`;

const N = 12;

/**
 * Los coeficientes, ya en la normalización que usa la cuenta. Se preparan una
 * vez al cargar el módulo: son 90 líneas.
 */
const { c, cd, k } = (() => {
  const c: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(N + 1).fill(0));
  const cd: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(N + 1).fill(0));
  const k: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(N + 1).fill(0));
  for (const linea of COF.trim().split("\n")) {
    const [n, m, g, h, gd, hd] = linea.trim().split(/\s+/).map(Number) as [number, number, number, number, number, number];
    c[m]![n] = g;
    cd[m]![n] = gd;
    if (m !== 0) {
      c[n]![m - 1] = h;
      cd[n]![m - 1] = hd;
    }
  }
  // De Schmidt semi-normalizados a los de Gauss que pide la recurrencia.
  const snorm: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(N + 1).fill(0));
  snorm[0]![0] = 1;
  for (let n = 1; n <= N; n++) {
    snorm[0]![n] = (snorm[0]![n - 1]! * (2 * n - 1)) / n;
    let j = 2;
    for (let m = 0; m <= n; m++) {
      k[m]![n] = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
      if (m > 0) {
        const flnmj = ((n - m + 1) * j) / (n + m);
        snorm[m]![n] = snorm[m - 1]![n]! * Math.sqrt(flnmj);
        j = 1;
        c[n]![m - 1] = snorm[m]![n]! * c[n]![m - 1]!;
        cd[n]![m - 1] = snorm[m]![n]! * cd[n]![m - 1]!;
      }
      c[m]![n] = snorm[m]![n]! * c[m]![n]!;
      cd[m]![n] = snorm[m]![n]! * cd[m]![n]!;
    }
  }
  k[1]![1] = 0;
  return { c, cd, k };
})();

/** Un año con decimales: 2026,82 es finales de octubre de 2026. */
export function anoDecimal(fecha: Date): number {
  const y = fecha.getUTCFullYear();
  const inicio = Date.UTC(y, 0, 1);
  const fin = Date.UTC(y + 1, 0, 1);
  return y + (fecha.getTime() - inicio) / (fin - inicio);
}

/**
 * **La declinación**, en grados: positiva al este y negativa al oeste, que es
 * la convención del modelo. En Canarias sale negativa —el norte magnético
 * cae al oeste del verdadero—, y en una carta se escribe «VAR 4°W».
 *
 * `lat` y `lon` geodésicos en grados, `alturaKm` sobre el elipsoide y `ano`
 * con decimales. Es la cuenta del informe técnico del WMM, la misma que la de
 * su programa de referencia.
 */
export function declinacion(lat: number, lon: number, ano: number, alturaKm = 0): number {
  const a = 6378.137;
  const b = 6356.7523142;
  const re = 6371.2;
  const a2 = a * a;
  const b2 = b * b;
  const c2 = a2 - b2;
  const a4 = a2 * a2;
  const b4 = b2 * b2;
  const c4 = a4 - b4;
  const dt = ano - EPOCA;
  const rlat = (lat * Math.PI) / 180;
  const rlon = (lon * Math.PI) / 180;
  const srlat = Math.sin(rlat);
  const crlat = Math.cos(rlat);
  const srlat2 = srlat * srlat;
  const crlat2 = crlat * crlat;
  const sp = new Array<number>(N + 1).fill(0);
  const cp = new Array<number>(N + 1).fill(0);
  sp[1] = Math.sin(rlon);
  cp[0] = 1;
  cp[1] = Math.cos(rlon);
  // De geodésicas a esféricas.
  const q = Math.sqrt(a2 - c2 * srlat2);
  const q1 = alturaKm * q;
  const q2 = ((q1 + a2) / (q1 + b2)) ** 2;
  const ct = srlat / Math.sqrt(q2 * crlat2 + srlat2);
  const st = Math.sqrt(1 - ct * ct);
  const r2 = alturaKm * alturaKm + 2 * q1 + (a4 - c4 * srlat2) / (q * q);
  const r = Math.sqrt(r2);
  const d = Math.sqrt(a2 * crlat2 + b2 * srlat2);
  const ca = (alturaKm + d) / r;
  const sa = (c2 * crlat * srlat) / (r * d);
  for (let m = 2; m <= N; m++) {
    sp[m] = sp[1]! * cp[m - 1]! + cp[1]! * sp[m - 1]!;
    cp[m] = cp[1]! * cp[m - 1]! - sp[1]! * sp[m - 1]!;
  }
  const p: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(N + 1).fill(0));
  const dp: number[][] = Array.from({ length: N + 1 }, () => new Array<number>(N + 1).fill(0));
  p[0]![0] = 1;
  const pp = new Array<number>(N + 1).fill(0);
  pp[0] = 1;
  const aor = re / r;
  let ar = aor * aor;
  let br = 0;
  let bt = 0;
  let bp = 0;
  let bpp = 0;
  for (let n = 1; n <= N; n++) {
    ar *= aor;
    for (let m = 0; m <= n; m++) {
      // Las funciones de Legendre y sus derivadas, por recurrencia.
      if (n === m) {
        p[m]![n] = st * p[m - 1]![n - 1]!;
        dp[m]![n] = st * dp[m - 1]![n - 1]! + ct * p[m - 1]![n - 1]!;
      } else if (n === 1 && m === 0) {
        p[m]![n] = ct * p[m]![n - 1]!;
        dp[m]![n] = ct * dp[m]![n - 1]! - st * p[m]![n - 1]!;
      } else {
        if (m > n - 2) {
          p[m]![n - 2] = 0;
          dp[m]![n - 2] = 0;
        }
        p[m]![n] = ct * p[m]![n - 1]! - k[m]![n]! * p[m]![n - 2]!;
        dp[m]![n] = ct * dp[m]![n - 1]! - st * p[m]![n - 1]! - k[m]![n]! * dp[m]![n - 2]!;
      }
      // Los coeficientes del día.
      const g = c[m]![n]! + dt * cd[m]![n]!;
      const h = m !== 0 ? c[n]![m - 1]! + dt * cd[n]![m - 1]! : 0;
      const par = ar * p[m]![n]!;
      const temp1 = g * cp[m]! + h * sp[m]!;
      const temp2 = g * sp[m]! - h * cp[m]!;
      bt -= ar * temp1 * dp[m]![n]!;
      bp += m * temp2 * par;
      br += (n + 1) * temp1 * par;
      // En los polos, la componente este se calcula aparte.
      if (st === 0 && m === 1) {
        pp[n] = n === 1 ? pp[n - 1]! : ct * pp[n - 1]! - k[m]![n]! * pp[n - 2]!;
        bpp += m * temp2 * ar * pp[n]!;
      }
    }
  }
  bp = st === 0 ? bpp : bp / st;
  // De vuelta a geodésicas: el norte y el este del sitio.
  const bx = -bt * ca - br * sa;
  const by = bp;
  return (Math.atan2(by, bx) * 180) / Math.PI;
}

/**
 * La declinación como se escribe en una carta: «VAR 4°W», redondeada al grado
 * —como la imprime la carta— salvo por debajo de uno, que se da con su
 * decimal para que no salga «VAR 0°».
 */
export function varEscrita(grados: number): string {
  const abs = Math.abs(grados);
  const cifra = abs < 1 ? abs.toFixed(1) : String(Math.round(abs));
  return `VAR ${cifra}°${grados < 0 ? "W" : "E"}`;
}
