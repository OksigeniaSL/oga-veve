/**
 * **Cambiar de peldaño en vuelo no deja ningún mando cogido.**
 *
 * Enrique, de Taguató Ruvichá con el automático puesto a Guyrami: «no me deja
 * bajar gas, se va al tope; es como si alguien estuviera tirando del timón».
 * Era el automático, enganchado y escondido —Guyrami no tenía botón— con su
 * canal de gas empujando, y al tocar la flecha sonó «autopilot disconnect».
 *
 * Este banco cambia de peldaño con la M, los cuatro seguidos, en tres fases
 * del vuelo —crucero con el automático, subiendo a mano y en final a mano— y
 * después de cada cambio mira:
 *
 * - si el automático está puesto, que su botón **se vea** y diga que está
 *   puesto, y que el FMA lo cuente;
 * - que **el gas sea de quien vuela**: se baja con la tecla y no vuelve a
 *   subir solo, y si había gases automáticos, se sueltan;
 * - que **nadie más escriba el gas** mientras no hay automático: un espía en
 *   el objeto de los mandos apunta quién lo cambia;
 * - y que la palanca suelta el automático, como en cualquier avión.
 *
 * Uso: `node scripts/verificar-cambio-de-peldano.mjs [aviones]`. Por defecto el
 * JAZ 120 (automático y gases) y el JAZ 20 (automático sin gases).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const AVIONES = (process.argv[2] ?? "jaz-120,jaz-20").split(",");
const PUERTO = 5352;
const ALTO = { "jaz-120": 20000, "jaz-90": 20000, "jaz-60": 12000, "jaz-40": 8000, "jaz-20": 6000 };

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
const resultados = [];
const comprobar = (nombre, ok, detalle) => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

try {
  for (const avion of AVIONES) {
    const page = await navegador.newPage({ viewport: { width: 1100, height: 700 }, locale: "es-PY" });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
    try {
      await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
      await page.goto(
        `${BASE}/?escenario=pettirossi&hora=10&avion=${avion}&tramo=taguato-ruvicha` +
          `&teselas=0&meteo=&viento=000/00&destino=pettirossi`,
      );
      await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 90000 });
      await page.waitForTimeout(8000);
      await page.keyboard.press("i");
      await page.waitForTimeout(500);

      /** Coloca el avión y lo deja limpio, con el gas de esa velocidad. */
      const colocar = (pies, kt, final) =>
        page.evaluate(
          async ([pies, kt, final]) => {
            const o = globalThis.__oga;
            const j = o.juegoParaTrazas();
            const { trueFromIndicated } = await import("/src/flight/atmosphere.ts");
            const espera = (ms) => new Promise((r) => setTimeout(r, ms));
            if (j.pilotoPuesto) o.pilotoAutomatico(false);
            const alto = pies * 0.3048;
            const p = o.puntoDeFinal(final ? 5000 : 120000);
            const h = final ? p.suelo + 300 : alto;
            const tas = trueFromIndicated(kt / 1.94384, h, j.flight.aireDelDia());
            o.colocar(p.x, h, p.z, tas, p.h);
            await espera(300);
            o.pedirTren(final);
            o.pedirFlaps(final ? 1 : 0);
            o.controles().throttle = j.flight.gasPara(tas);
            o.controles().trim = 0;
            j.ventanillaAlt = Math.round(pies / 100) * 100;
          },
          [pies, kt, final],
        );

      /** Lo que se mira tras cada cambio. */
      const mirar = () =>
        page.evaluate(() => {
          const o = globalThis.__oga;
          const j = o.juegoParaTrazas();
          const b = document.querySelector('[data-hud="piloto-auto"]');
          return {
            tramo: j.tier.id,
            puesto: j.pilotoPuesto,
            gases: j.gasesPuestos,
            boton: !!b && !b.hidden,
            pulsado: b?.getAttribute("aria-pressed") === "true",
            fma: j.elFma(),
            gas: o.controles().throttle,
            nivelada: !!j.nivelada,
          };
        });

      /** Un espía en el gas: quién lo escribe durante `ms`. */
      const espiarElGas = (ms) =>
        page.evaluate(async (ms) => {
          const o = globalThis.__oga;
          const j = o.juegoParaTrazas();
          const real = j.input.controls;
          const quien = {};
          const espia = new Proxy(real, {
            set(t, k, v) {
              if (k === "throttle" && Math.abs(v - t[k]) > 1e-4) {
                const pila = (new Error().stack ?? "")
                  .split("\n")
                  .slice(2, 3)
                  .map((l) => l.trim().replace(/^at /, "").split(" ")[0])
                  .join("");
                quien[pila] = (quien[pila] ?? 0) + 1;
              }
              t[k] = v;
              return true;
            },
          });
          Object.defineProperty(j.input, "controls", { value: espia, configurable: true });
          await new Promise((r) => setTimeout(r, ms));
          Object.defineProperty(j.input, "controls", { value: real, configurable: true });
          return quien;
        }, ms);

      const fases = [
        { nombre: "crucero con el automático", pies: ALTO[avion] ?? 8000, kt: avion.startsWith("jaz-1") || avion === "jaz-90" ? 270 : 110, final: false, automatico: true },
        { nombre: "subiendo a mano", pies: (ALTO[avion] ?? 8000) / 2, kt: avion === "jaz-120" || avion === "jaz-90" ? 250 : 90, final: false, automatico: false },
        { nombre: "en final a mano", pies: 1000, kt: avion === "jaz-120" ? 160 : avion === "jaz-90" ? 145 : 70, final: true, automatico: false },
      ];
      for (const f of fases) {
        await colocar(f.pies, f.kt, f.final);
        await page.waitForTimeout(1500);
        if (f.automatico) await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
        await page.waitForTimeout(1500);
        for (let i = 0; i < 4; i++) {
          await page.keyboard.press("m");
          await page.waitForTimeout(2500);
          const r = await mirar();
          const donde = `${avion}, ${f.nombre}, a ${r.tramo}`;
          if (f.automatico) {
            comprobar(`${donde}: el automático sigue puesto y su botón se ve pulsado`, r.puesto && r.boton && r.pulsado, JSON.stringify({ puesto: r.puesto, boton: r.boton, pulsado: r.pulsado }));
            comprobar(`${donde}: el FMA dice que manda`, r.fma?.piloto === true, JSON.stringify(r.fma));
          } else {
            comprobar(`${donde}: no hay automático puesto`, !r.puesto, JSON.stringify(r));
            const quien = await espiarElGas(2500);
            const otros = Object.keys(quien).filter((q) => !/InputManager|Input\./.test(q));
            comprobar(`${donde}: nadie más escribe el gas`, otros.length === 0, JSON.stringify(quien));
          }
          // El gas es de quien vuela: se baja con la tecla y no vuelve a subir.
          const antes = (await mirar()).gas;
          await page.keyboard.down("z");
          await page.waitForTimeout(900);
          await page.keyboard.up("z");
          const bajado = await mirar();
          await page.waitForTimeout(2500);
          const despues = await mirar();
          comprobar(
            `${donde}: el gas baja con la tecla y se queda`,
            bajado.gas < antes - 0.05 && despues.gas <= bajado.gas + 0.02 && !despues.gases,
            `${antes.toFixed(2)} → ${bajado.gas.toFixed(2)} → ${despues.gas.toFixed(2)}, gases ${despues.gases}`,
          );
          // Y lo vuelve a dejar como estaba para el siguiente cambio.
          await page.evaluate((g) => (globalThis.__oga.controles().throttle = g), antes);
          if (f.automatico) {
            // La palanca suelta el automático, como en cualquier avión.
            await page.keyboard.down("ArrowUp");
            await page.waitForTimeout(400);
            await page.keyboard.up("ArrowUp");
            await page.waitForTimeout(600);
            const suelto = await mirar();
            comprobar(`${donde}: la palanca lo suelta`, !suelto.puesto, JSON.stringify({ puesto: suelto.puesto }));
            await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
            await page.waitForTimeout(800);
          }
        }
      }
      if (errores.length) comprobar(`${avion}: sin errores en la página`, false, errores.slice(0, 3).join(" | "));
    } finally {
      await page.close();
    }
  }
} finally {
  await navegador.close();
  await server.close();
}
const mal = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - mal.length} de ${resultados.length}`);
process.exit(mal.length ? 1 : 0);
