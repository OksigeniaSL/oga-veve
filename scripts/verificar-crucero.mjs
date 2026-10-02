/**
 * **El crucero quieto**: con el automático puesto y el aire en calma, el N1 no
 * se mueve.
 *
 * Enrique, en Taguató Ruvichá, nivelado a veintinueve mil pies con el JAZ 120
 * y el automático: el N1 iba y venía **entre 51 y 79** todo el rato, «y no
 * noto que los aviones hagan eso todo el tiempo». Lo real en crucero tranquilo
 * es un N1 casi quieto —correcciones de décimas— que solo se mueve con
 * turbulencia, viento o al cambiar de nivel.
 *
 * Este banco coloca el avión en crucero, con el aire en calma, engancha el
 * automático como el botón y mide cinco minutos de vuelo: el N1 más alto y el
 * más bajo, la velocidad y la altura. Pasa si el N1 no se aparta más de un
 * punto de su media. Y con `OGA_TRAZA=1` cuenta, además, **quién escribe el
 * gas** en cada fotograma: un espía en el objeto de los mandos que apunta la
 * función que lo cambia. Así se encontró el bombeo, y así se comprueba que en
 * el aire queda uno solo al mando.
 *
 * Uso: `node scripts/verificar-crucero.mjs [aviones] [tramos]`, con listas
 * separadas por comas. Por defecto, los dos reactores en los cuatro peldaños.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const AVIONES = (process.argv[2] ?? "jaz-120,jaz-90").split(",");
const TRAMOS = (process.argv[3] ?? "guyrami,tuka,taguato,taguato-ruvicha").split(",");
const ESCENARIO = process.env.OGA_ESCENARIO ?? "pettirossi";
const TRAZA = !!process.env.OGA_TRAZA;
/** Cinco minutos de vuelo medidos, después de uno para asentarse. */
const ASIENTA = Number(process.env.OGA_ASIENTA ?? 60);
const MIDE = Number(process.env.OGA_MIDE ?? 300);
const PUERTO = 5351;
/** Crucero de cada uno: nivel 290 y su indicada de crucero, nudos. */
const CRUCERO = { "jaz-120": 275, "jaz-90": 270, "jaz-60": 150, "jaz-40": 140, "jaz-20": 100 };
const PIES = Number(process.env.OGA_PIES ?? 29000);

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const filas = [];
let fallos = 0;
try {
  for (const avion of AVIONES) {
    for (const tramo of TRAMOS) {
      const page = await navegador.newPage({
        viewport: { width: 900, height: 600 },
        locale: "es-PY",
      });
      const errores = [];
      page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
      try {
        await page.addInitScript(() =>
          localStorage.setItem("oga-veve:teclas-vistas", "1"),
        );
        await page.goto(
          `${BASE}/?escenario=${ESCENARIO}&hora=10&avion=${avion}&tramo=${tramo}` +
            `&teselas=0&meteo=&viento=000/00&destino=${ESCENARIO}`,
        );
        await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
          timeout: 90000,
        });
        await page.waitForTimeout(8000);
        await page.keyboard.press("i");
        await page.waitForTimeout(800);
        const r = await page.evaluate(
          async ([kt, pies, asienta, mide, traza]) => {
            const o = globalThis.__oga;
            const j = o.juegoParaTrazas();
            const { trueFromIndicated } = await import("/src/flight/atmosphere.ts");
            const { regimen } = await import("/src/ui/cuadro.ts");
            const espera = (ms) => new Promise((res) => setTimeout(res, ms));
            const alto = pies * 0.3048;
            const ias = kt / 1.94384;
            const tas = trueFromIndicated(ias, alto, j.flight.aireDelDia());
            const p = o.puntoDeFinal(160000);
            o.colocar(p.x, alto, p.z, tas, p.h);
            const c = o.controles();
            c.throttle = j.flight.gasPara(tas);
            c.trim = 0;
            /*
             * La ventanilla en el nivel, como la dejaría quien vuela: sin plan
             * que la ponga en otro sitio, el automático se queda en él.
             */
            if ("ventanillaAlt" in j) j.ventanillaAlt = pies;
            /*
             * Y limpio: el avión sale del puesto con el tren fuera, y colocarlo
             * en el aire no lo mete. Con las patas fuera a veintinueve mil pies
             * se mide la resistencia del tren, no el crucero.
             */
            await espera(300);
            o.pedirTren(false);
            o.pedirFlaps(0);
            await espera(300);
            // Como el botón: si el peldaño lo esconde, como lo dejaría el de antes.
            o.pilotoAutomatico(true);
            const puesto = o.pilotoAutomatico();
            const quien = {};
            let espia = null;
            if (traza) {
              const real = j.input.controls;
              espia = new Proxy(real, {
                set(t, k, v) {
                  if (k === "throttle" && Math.abs(v - t[k]) > 1e-4) {
                    const pila = (new Error().stack ?? "")
                      .split("\n")
                      .slice(2, 4)
                      .map((l) => l.trim().replace(/^at /, "").split(" ")[0])
                      .join(" ← ");
                    quien[pila] = (quien[pila] ?? 0) + 1;
                  }
                  t[k] = v;
                  return true;
                },
              });
              Object.defineProperty(j.input, "controls", { value: espia, configurable: true });
            }
            const n1 = () =>
              100 * regimen(j.aircraft, j.input.controls.throttle, j.input.controls.engineOn);
            const ahora = () => {
              const s = o.estado();
              return {
                t: o.reloj(),
                n1: n1(),
                ias: o.velocidadDeCabina(),
                pies: s.position.y / 0.3048,
                vs: s.velocity.y * 196.85,
              };
            };
            o.acelerar?.(8);
            const t0 = o.reloj();
            while (o.reloj() - t0 < asienta) await espera(100);
            const tren = o.controles().tren;
            const muestras = [];
            const t1 = o.reloj();
            while (o.reloj() - t1 < mide) {
              muestras.push(ahora());
              await espera(50);
            }
            o.acelerar?.(1);
            return { puesto, muestras, quien, objetivos: o.objetivosDelPiloto(), plan: !!o.planDeVuelo(), tren };
          },
          [CRUCERO[avion] ?? 250, PIES, ASIENTA, MIDE, TRAZA],
        );
        const m = r.muestras;
        const n1s = m.map((x) => x.n1);
        const media = n1s.reduce((a, b) => a + b, 0) / Math.max(1, n1s.length);
        const n1Min = Math.min(...n1s);
        const n1Max = Math.max(...n1s);
        const ias = m.map((x) => x.ias ?? NaN).filter(Number.isFinite);
        const pies = m.map((x) => x.pies);
        const ok = n1Max - media <= 1 && media - n1Min <= 1;
        if (!ok) fallos++;
        const fila = {
          avion,
          tramo,
          automatico: r.puesto,
          muestras: m.length,
          n1: `${n1Min.toFixed(1)}–${n1Max.toFixed(1)} (media ${media.toFixed(1)})`,
          kt: ias.length ? `${Math.min(...ias).toFixed(0)}–${Math.max(...ias).toFixed(0)}` : "?",
          pies: `${Math.min(...pies).toFixed(0)}–${Math.max(...pies).toFixed(0)}`,
          ok,
        };
        filas.push(fila);
        console.log(
          `${ok ? "✓" : "✗"} ${avion} ${tramo}: N1 ${fila.n1} · ${fila.kt} kt · ${fila.pies} ft · automático ${r.puesto ? "puesto" : "NO"} · ${m.length} muestras${r.plan ? " · CON PLAN" : ""}${r.tren > 0.01 ? " · TREN FUERA" : ""}`,
        );
        if (TRAZA) {
          const lista = Object.entries(r.quien).sort((a, b) => b[1] - a[1]);
          console.log("   quién escribe el gas:");
          for (const [q, n] of lista) console.log(`     ${n}× ${q}`);
          if (!lista.length) console.log("     nadie lo movió");
        }
        if (errores.length) console.log("   errores:", errores.slice(0, 3));
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await navegador.close();
  await server.close();
}
console.log(`\n${filas.length - fallos} de ${filas.length} con el N1 quieto (±1 %)`);
process.exit(fallos ? 1 : 0);
