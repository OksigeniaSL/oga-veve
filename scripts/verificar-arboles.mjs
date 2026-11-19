/**
 * **Los árboles se tocan** (H35b): volar contra un árbol del mundo, fuera de
 * todo ejercicio, da el percance del árbol con su dibujo, su frase y su botón.
 *
 * Busca, alrededor de la pista, el primer árbol cuya copa esté a seis metros
 * del suelo con ochenta metros despejados por delante —ni suelo más alto, ni
 * agua, ni un edificio—, coloca el avión ahí a treinta metros por segundo y a la altura de la
 * copa, y deja que el juego decida. Lo de pasar por debajo de las copas del
 * monte de la pista corta lo mira `ver-la-pista-corta.mjs`; las reglas y lo
 * que cuesta, `world/arboleda.test.ts`.
 *
 *   node scripts/verificar-arboles.mjs [carpeta]   (con `OGA_PUERTO`)
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-arboles";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
mkdirSync(SALIDA, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

const casos = [
  { escenario: "yvytu-rape", tramo: "taguato-ruvicha", frase: true },
  { escenario: "yvytu-rape", tramo: "guyrami", frase: false },
  { escenario: "tenerife-norte", tramo: "taguato-ruvicha", frase: true },
];

try {
  for (const c of casos) {
    const de = `${c.escenario} · ${c.tramo}`;
    console.log(`\n${de}`);
    const page = await navegador.newPage({ viewport: { width: 1100, height: 700 } });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(`${BASE}/?escenario=${c.escenario}&hora=11&leccion=aterrizaje&tramo=${c.tramo}&avion=jaz-20&teselas=0`);
    await page.waitForFunction(() => !!globalThis.__oga?.estado?.() && !!globalThis.__oga?.juegoParaTrazas, null, {
      timeout: 120000,
    });
    await page.waitForTimeout(6000);

    const sitio = await page.evaluate(() => {
      const o = globalThis.__oga;
      const j = o.juegoParaTrazas();
      const r = o.pista();
      const a = j.aircraft;
      const cuantos = j.arboleda.cuantos;
      for (let d = 250; d <= 4000; d += 15)
        for (let k = 0, n = Math.ceil((2 * Math.PI * d) / 8); k < n; k++) {
          const ang = (k / n) * Math.PI * 2;
          const x = r.x + Math.cos(ang) * d;
          const z = r.z + Math.sin(ang) * d;
          const suelo = o.suelo(x, z);
          if (!j.arboleda.toca(x, suelo + 6, z)) continue;
          // Desde la pista hacia él, y ochenta metros despejados por delante.
          const dx = (x - r.x) / d;
          const dz = (z - r.z) / d;
          let libre = true;
          for (let s = 20; s <= 80 && libre; s += 5) {
            const px = x - dx * s;
            const pz = z - dz * s;
            if (o.suelo(px, pz) > suelo + 2 || o.esAgua?.(px, pz) || j.arboleda.toca(px, suelo + 6, pz)) libre = false;
          }
          if (!libre) continue;
          // Y sin una casa, un hangar o un galpón por medio: eso es otro percance.
          const y = suelo + 6 + a.gearHeight;
          if (j.bultos.chocaEnElCamino(x - dx * 90, y, z - dz * 90, x, y, z)) continue;
          return { x, z, suelo, dx, dz, d, cuantos, tren: a.gearHeight };
        }
      return { fallo: "no hay un árbol a la vista", cuantos };
    });
    if (sitio.fallo) {
      comprobar(`${de}: hay un árbol que tocar`, false, `${sitio.fallo} (${sitio.cuantos} apuntados)`);
      await page.close();
      continue;
    }
    console.log(`    ${sitio.cuantos} árboles apuntados; el elegido, a ${Math.round(sitio.d)} m de la pista`);

    const r = await page.evaluate(async (s) => {
      const o = globalThis.__oga;
      const espera = (ms) => new Promise((res) => setTimeout(res, ms));
      // A cuarenta metros: más lejos, colocado sin subir, el avión se hunde y toca el campo antes que el árbol.
      const x0 = s.x - s.dx * 40;
      const z0 = s.z - s.dz * 40;
      const rumbo = Math.atan2(s.dx, -s.dz);
      o.colocar(x0, s.suelo + 6 + s.tren, z0, 30, rumbo);
      o.pilotar((c) => {
        c.engineOn = true;
        c.throttle = 0.7;
        c.brakes = 0;
        c.elevator = 0.05;
        c.aileron = 0;
        c.rudder = 0;
      });
      const desde = o.reloj();
      let minimo = Infinity;
      while (o.reloj() - desde < 8 && !o.percance()) {
        await espera(30);
        const e = o.estado();
        minimo = Math.min(minimo, e.position.y - s.tren - o.suelo(e.position.x, e.position.z));
      }
      const percance = o.percance();
      const e = o.estado();
      o.pilotar(null);
      return {
        percance,
        tardo: +(o.reloj() - desde).toFixed(2),
        recorrido: Math.round(Math.hypot(e.position.x - x0, e.position.z - z0)),
        minimo: +minimo.toFixed(1),
      };
    }, sitio);
    comprobar(
      `${de}: volar contra un árbol es el percance del árbol`,
      r.percance === "arbol",
      `percance ${r.percance} a los ${r.tardo} s, ${r.recorrido} m recorridos, las ruedas a ${r.minimo} m del suelo como poco`,
    );
    await page.waitForTimeout(2500);
    const fin = await page.evaluate(() => ({
      dibujo: document.querySelector('[data-hud="fin-manga"]')?.innerHTML ?? "",
      frase: document.querySelector('[data-hud="fin-frase"]')?.textContent ?? "",
      fraseOculta: document.querySelector('[data-hud="fin-frase"]')?.hidden ?? true,
      boton: !!document.querySelector('[data-hud="fin-otra"]'),
      enPercance: !!document.querySelector(".fin--percance:not([hidden])"),
    }));
    await page.screenshot({ path: `${SALIDA}/arbol-${c.escenario}-${c.tramo}.png` });
    console.log(`    foto: ${SALIDA}/arbol-${c.escenario}-${c.tramo}.png`);
    comprobar(
      `${de}: con el dibujo del árbol y el botón de otra vez`,
      fin.enPercance && fin.boton && fin.dibujo.includes('ellipse cx="32" cy="27"'),
      fin.enPercance ? "" : "sin la pantalla del percance",
    );
    if (c.frase) comprobar(`${de}: y su frase`, !fin.fraseOculta && fin.frase.length > 5, `«${fin.frase}»`);
    else comprobar(`${de}: sin palabras, donde todavía no se lee`, fin.fraseOculta || fin.frase === "", `«${fin.frase}»`);
    comprobar(`${de}: sin errores en la página`, errores.length === 0, errores.slice(0, 2).join(" | "));
    await page.close();
  }
} catch (e) {
  console.error(e);
  resultados.push({ nombre: "excepción", ok: false });
} finally {
  await navegador.close();
  await server.close();
}
const mal = resultados.filter((x) => !x.ok).length;
console.log(`\n${resultados.length - mal}/${resultados.length} bien`);
process.exit(mal ? 1 : 0);
