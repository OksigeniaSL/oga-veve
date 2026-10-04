/**
 * Los frenos de tierra en el juego de verdad: si suben, a cuánto, y cuánto
 * se ven desde cada vista. Con la tarjeta gráfica del equipo.
 *
 * Lo pidió lo que contó Enrique tras aterrizar el JAZ 120 en Los Rodeos y en
 * Gran Canaria: «yo no veo en la aeronave los frenos esos que se levantan;
 * sí se enciende el piloto de un lado, pero no veo que se eleven esos
 * paneles». Mirarlo a ojo no basta —la pregunta es si suben o si no se
 * ven—, así que esto pone cada reactor en tierra en Los Rodeos, saca los
 * frenos de tierra con su palanca, como quien la sube, y dice:
 *
 * - **A cuántos grados está cada panel**, leído del vacío que lo mueve. Si
 *   no es su tope de tierra, el fallo es del modelo o del enlace con los
 *   vacíos. Ver `world/aerofrenos.ts`.
 * - **Cuántos píxeles de alto ocupa en pantalla** un panel de dentro y uno de
 *   fuera desde la cámara de seguir, y a qué distancia y altura va ella. Un
 *   panel levantado se ve desde atrás de canto: lo que asoma es su cara de
 *   abajo, de la cuerda por el seno de lo que su ángulo le saca a la cámara.
 * - Y una captura de cada vista: la de seguir y las del pasaje.
 *
 * Uso: `node scripts/ver-frenos-de-tierra.mjs [carpeta] [jaz-90 jaz-120]`
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const CARPETA = process.argv[2] ?? "frenos-de-tierra";
const PEDIDOS = process.argv.slice(3);
const REACTORES = ["jaz-90", "jaz-120"];
const VISTAS = ["chase", "pasaje-izquierda", "pasaje-derecha"];
const PUERTO = 5312;
const ALTO = 800;

mkdirSync(CARPETA, { recursive: true });
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});
try {
  for (const id of PEDIDOS.length ? PEDIDOS : REACTORES) {
    const page = await navegador.newPage({ viewport: { width: 1280, height: ALTO } });
    page.on("pageerror", (e) => console.log(`  ${id} ERROR:`, e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(`${BASE}/?escenario=tenerife-norte&hora=12&tramo=guyrami&avion=${id}`);
    await page.waitForFunction(
      () => globalThis.__oga?.estado?.() && globalThis.__oga?.aeronave?.().deVerdad,
      null,
      { timeout: 120000 },
    );
    await page.waitForTimeout(3000);
    await page.evaluate(() => globalThis.__oga.ponerPalancaDeAerofrenos("fuera"));
    // Salen en un segundo; ver `TARDAN_LOS_DE_TIERRA`.
    await page.waitForTimeout(2500);
    const palanca = await page.evaluate(() => globalThis.__oga.aerofrenos());
    const grados = await page.evaluate(() => {
      const fuera = [];
      globalThis.__oga.aeronave().grupo.traverse((o) => {
        if (!/^aerofreno-\d+-derecha$/.test(o.name)) return;
        const w = Math.min(1, Math.abs(o.quaternion.w));
        fuera.push(`${o.name.split("-")[1]}: ${((2 * Math.acos(w) * 180) / Math.PI).toFixed(0)}°`);
      });
      return fuera;
    });
    console.log(`  ${id}: palanca ${palanca.palanca}, frenos de tierra ${palanca.enTierra}`);
    console.log(`    paneles de la derecha · ${grados.join(" · ")}`);
    for (const vista of VISTAS) {
      const puesta = await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
      if (puesta !== vista) continue;
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${CARPETA}/${id}-${vista}.png` });
      if (vista !== "chase") continue;
      const medida = await page.evaluate((alto) => {
        const o = globalThis.__oga;
        const g = o.aeronave().grupo;
        g.updateWorldMatrix(true, true);
        const camara = o.camaraViva();
        camara.updateMatrixWorld();
        const V = camara.position.constructor;
        const fuera = [];
        g.traverse((m) => {
          if (!/^aerofreno-\d+-derecha-tapas$/.test(m.name)) return;
          const pos = m.geometry.attributes.position;
          const v = new V();
          let arriba = -Infinity;
          let abajo = Infinity;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
            const p = o.enElCuadro(v.x, v.y, v.z);
            arriba = Math.max(arriba, p.y);
            abajo = Math.min(abajo, p.y);
          }
          fuera.push(`${m.name.split("-")[1]}: ${(((arriba - abajo) * alto) / 2).toFixed(1)} px`);
        });
        const d = camara.getWorldPosition(new V()).sub(g.getWorldPosition(new V()));
        const sube = (Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180) / Math.PI;
        return { fuera, lejos: d.length(), sube };
      }, ALTO);
      console.log(
        `    desde la de seguir, a ${medida.lejos.toFixed(0)} m y ${medida.sube.toFixed(0)}° ` +
          `por encima · ${medida.fuera.join(" · ")} de alto`,
      );
    }
    await page.close();
  }
  console.log(`\n  capturas en ${CARPETA}/`);
} finally {
  await navegador.close();
  await server.close();
}
