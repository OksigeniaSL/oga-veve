/**
 * **Los árboles se tocan** (H35b): volar contra un árbol del mundo, fuera de
 * todo ejercicio, da el percance del árbol con su dibujo, su frase y su botón.
 *
 * Busca, alrededor de la pista, el primer árbol cuya copa esté a seis metros
 * del suelo, con copa de sobra y el camino hasta ella despejado —ni suelo a
 * menos de dos metros y medio por debajo, ni agua, ni otro árbol, ni un
 * edificio—, coloca el avión a doce metros de su copa, a treinta metros por
 * segundo y con las ruedas a la altura de su centro, y deja que el juego
 * decida. Lo de pasar por debajo de las copas del monte de la pista corta lo
 * mira `ver-la-pista-corta.mjs`; las reglas y lo que cuesta,
 * `world/arboleda.test.ts`.
 *
 * **Por el centro de la copa, y desde cerca** (H35c). Apuntaba al primer
 * punto que tocaba la copa, a seis metros del suelo y desde cuarenta metros,
 * y en Yvytu Rape no chocaba nunca, sin que el juego fallara:
 *
 * - En Guyrami el punto caía en el borde de la copa, a tres metros de su
 *   centro, con un radio de 4,4 que Guyrami perdona hasta 2,6: el avión
 *   pasaba rozando las hojas, que es justo lo que ese peldaño perdona.
 * - En Taguató Ruvichá, colocado a treinta metros por segundo y sin subir,
 *   el JAZ 20 se hunde antes de que el ala lo sostenga —en la mesa, casi
 *   cuatro metros en esos cuarenta; en el juego, los seis hasta el campo— y
 *   pasaba por debajo de una copa que, por donde se le apuntaba, empieza a
 *   tres metros del suelo.
 *
 * En Tenerife Norte salía porque la copa de allí es más grande. Ahora el
 * avión entra por el centro, que está dentro de la copa que se toca en los
 * cuatro peldaños —la piel nunca pasa de dos quintos—, y en doce metros baja
 * menos de lo que hay de copa.
 *
 *   node scripts/verificar-arboles.mjs [carpeta]   (con `OGA_PUERTO`)
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-arboles";
/**
 * Cómo se apunta, m: la copa más pequeña que vale —con los dos metros de
 * Guyrami le quedan 1,2 por cada lado del centro—, desde dónde se sale antes
 * de la copa, lo que tiene que quedar de suelo por debajo del camino y lo que
 * se sale por encima del centro, que es lo que el JAZ 20 baja hasta llegar.
 */
const APUNTAR = { copaMinima: 2, antesDeLaCopa: 12, sobreElSuelo: 2.5, encima: 0.5 };
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

    const sitio = await page.evaluate((apuntar) => {
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
          const arbol = j.arboleda.arbolEn(x, o.suelo(x, z) + 6, z);
          if (!arbol || arbol.radio < apuntar.copaMinima || arbol.semialto < apuntar.copaMinima) continue;
          // Al centro de la copa, desde la pista.
          const cx = arbol.x;
          const cz = arbol.z;
          const cy = arbol.y + arbol.centro;
          const lejos = Math.hypot(cx - r.x, cz - r.z);
          const dx = (cx - r.x) / lejos;
          const dz = (cz - r.z) / lejos;
          const desde = arbol.radio + apuntar.antesDeLaCopa;
          // Y el camino hasta la copa, despejado: ni suelo, ni agua, ni otro árbol.
          let libre = true;
          for (let s = arbol.radio + 0.5; s <= desde + 10 && libre; s += 1) {
            const px = cx - dx * s;
            const pz = cz - dz * s;
            if (o.suelo(px, pz) > cy - apuntar.sobreElSuelo || o.esAgua?.(px, pz) || j.arboleda.toca(px, cy, pz))
              libre = false;
          }
          if (!libre) continue;
          // Y sin una casa, un hangar o un galpón por medio: eso es otro percance.
          const y = cy + a.gearHeight;
          if (j.bultos.chocaEnElCamino(cx - dx * (desde + 10), y, cz - dz * (desde + 10), cx, y, cz)) continue;
          return {
            cx,
            cy,
            cz,
            dx,
            dz,
            desde,
            d: lejos,
            radio: arbol.radio,
            semialto: arbol.semialto,
            alSuelo: cy - o.suelo(cx, cz),
            cuantos,
            tren: a.gearHeight,
          };
        }
      return { fallo: "no hay un árbol a la vista", cuantos };
    }, APUNTAR);
    if (sitio.fallo) {
      comprobar(`${de}: hay un árbol que tocar`, false, `${sitio.fallo} (${sitio.cuantos} apuntados)`);
      await page.close();
      continue;
    }
    console.log(
      `    ${sitio.cuantos} árboles apuntados; el elegido, a ${Math.round(sitio.d)} m de la pista, ` +
        `con ${sitio.radio.toFixed(1)} m de radio y ${sitio.semialto.toFixed(1)} de semialto, ` +
        `el centro de la copa a ${sitio.alSuelo.toFixed(1)} m del suelo`,
    );

    const r = await page.evaluate(async (s) => {
      const o = globalThis.__oga;
      const espera = (ms) => new Promise((res) => setTimeout(res, ms));
      // A doce metros de la copa: más lejos, colocado sin subir, el avión se hunde por debajo de ella.
      const x0 = s.cx - s.dx * s.desde;
      const z0 = s.cz - s.dz * s.desde;
      const rumbo = Math.atan2(s.dx, -s.dz);
      o.colocar(x0, s.cy + s.tren + s.encima, z0, 30, rumbo);
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
      // Las ruedas respecto del centro de la copa, en la última muestra antes del final.
      let alCentro = NaN;
      while (o.reloj() - desde < 8 && !o.percance()) {
        await espera(30);
        const e = o.estado();
        minimo = Math.min(minimo, e.position.y - s.tren - o.suelo(e.position.x, e.position.z));
        alCentro = e.position.y - s.tren - s.cy;
      }
      const percance = o.percance();
      const e = o.estado();
      o.pilotar(null);
      return {
        percance,
        tardo: +(o.reloj() - desde).toFixed(2),
        recorrido: Math.round(Math.hypot(e.position.x - x0, e.position.z - z0)),
        minimo: +minimo.toFixed(1),
        alCentro: +alCentro.toFixed(1),
      };
    }, { ...sitio, encima: APUNTAR.encima });
    comprobar(
      `${de}: volar contra un árbol es el percance del árbol`,
      r.percance === "arbol",
      `percance ${r.percance} a los ${r.tardo} s, ${r.recorrido} m recorridos, las ruedas a ${r.minimo} m del suelo como poco ` +
        `y, al final, a ${r.alCentro} m del centro de la copa`,
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
