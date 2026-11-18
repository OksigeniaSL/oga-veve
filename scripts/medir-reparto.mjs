/**
 * Lo que cuesta **el reparto de lo que se lee** (`ui/reparto.ts`) con la CPU
 * de una tablet de gama media (ADR 0030, enmienda H28g).
 *
 * El reparto no corre en cada fotograma: en cada uno mira una firma de lo que
 * se lee —clases y texto, sin maquetar— y solo reparte si ha cambiado. Pero
 * cuando reparte mide decenas de cajas y obliga a maquetar, y la regla 6 pide
 * sesenta imágenes por segundo en esa tablet: medio milisegundo de más en
 * cada fotograma ya se nota. Esto lo mide igual cada vez, para que un cambio
 * del reparto se pueda defender con un número.
 *
 * - Con la CPU a ×4 (`Emulation.setCPUThrottlingRate`), que es la de una
 *   tablet Android de gama media: ver `verificar-rendimiento.mjs`.
 * - En el aire y virando, con el JAZ 90 de Taguato: el juego entero corriendo.
 * - **Dos tramos**: uno quieto, en que solo se mira la firma, y otro con
 *   cambios —un subtítulo nuevo cada 400 ms, el aviso y la lámpara que se
 *   encienden y se apagan cada segundo y medio y la cámara que entra y sale
 *   de la cabina cada cuatro—, mucho más de lo que cambia en un vuelo.
 *
 * Y un tercero **como un vuelo**: una frase cada tres segundos, y el aviso y
 * la lámpara, los que ponga el juego.
 *
 * Lo que dice cada tramo: los fotogramas, cuántas veces se repartió, los
 * milisegundos por fotograma que se lleva todo (firma y reparto), lo que
 * cuesta cada reparto de media y el más caro. **La maqueta que el juego dejó
 * pendiente se cuenta aparte**: el reparto es el primero que la pide en el
 * fotograma y sin separarla se le apuntaba entera, cuando el navegador la
 * hace igual al pintar (`gasto.separar`).
 *
 * Uso: `node scripts/medir-reparto.mjs`
 *   `OGA_VISTA=915x412` en otra pantalla (por defecto, 1024 × 600 con el dedo).
 *   `OGA_APRIETE=1` sin frenar la CPU, para comparar.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5378);
const [ANCHO, ALTO] = (process.env.OGA_VISTA ?? "1024x600").split("x").map(Number);
const APRIETE = Number(process.env.OGA_APRIETE ?? 4);
const QUIETO = 5000;
const CON_CAMBIOS = 12000;
const VECES = 120;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});

try {
  const page = await navegador.newPage({
    viewport: { width: ANCHO, height: ALTO },
    hasTouch: true,
    isMobile: true,
  });
  page.on("pageerror", (e) => console.log("  ERROR:", e.message));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  const cdp = await page.context().newCDPSession(page);
  await page.goto(
    `${BASE}/?escenario=tenerife-norte&hora=16&leccion=despegue&tramo=taguato&avion=jaz-90&meteo=`,
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado?.(), null, { timeout: 90000 });
  await page.waitForTimeout(6000);
  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.pintor?.()?.getContext?.();
    const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
  });
  // En el aire, virando suave con el motor tirando: el juego entero en marcha.
  await page.evaluate(() => {
    const o = globalThis.__oga;
    const a = o.avion();
    const { x, z } = o.estado().position;
    o.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 0.75;
      c.elevator = 0.02;
      c.aileron = 0.04;
    });
    o.colocar(x, o.suelo(x, z) + 900, z, (a.aproximacion ?? 40) * 1.6);
  });
  await page.waitForTimeout(2000);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: APRIETE });
  await page.waitForTimeout(1500);

  /**
   * Corre en la página: un tramo de `ms`, con cambios o sin ellos. `cada` dice
   * cada cuánto cambia cada cosa: el subtítulo, el aviso y la lámpara, y la
   * cámara (0, nunca).
   */
  const tramo = (ms, cambios, cada = { frase: 400, aviso: 1500, camara: 4000 }) =>
    page.evaluate(
      async ([ms, cambios, cada]) => {
        const hud = globalThis.__oga.juegoParaTrazas().hud;
        hud.gastoDelReparto().separar = true;
        const g0 = { ...hud.gastoDelReparto() };
        const FRASES = [
          "Mantené las alas niveladas y el morro un poquito arriba.",
          "Mirá la pista a lo lejos: vamos hacia ella.",
          "Nos queda justo, así que avisamos a la torre: combustible mínimo.",
          "Todo bien. Seguimos subiendo.",
        ];
        const aviso = document.querySelector('[data-hud="warning"]');
        const avTexto = aviso?.querySelector('[data-hud="warning-text"]');
        const torre = document.querySelector('[data-hud="torre"]');
        const raiz = document.querySelector(".hud");
        let fotogramas = 0;
        let estado = 0;
        let frase = -1;
        const inicio = performance.now();
        let ultimo = inicio;
        let peor = 0;
        await new Promise((listo) => {
          const paso = () => {
            const ahora = performance.now();
            peor = Math.max(peor, ahora - ultimo);
            ultimo = ahora;
            fotogramas++;
            const t = ahora - inicio;
            if (cambios) {
              const f = Math.floor(t / cada.frase);
              if (f !== frase) {
                frase = f;
                hud.flash(FRASES[f % FRASES.length], 0.5);
              }
              // El aviso y la lámpara, encendidos a mano en cada fotograma: el
              // juego los apaga en el suyo, como en `verificar-carteles.mjs`.
              estado = cada.aviso ? Math.floor(t / cada.aviso) % 4 : 0;
              const conAviso = estado === 1 || estado === 3;
              const conTorre = estado === 2 || estado === 3;
              if (cada.aviso) {
                raiz?.classList.toggle("hud--avisando", conAviso);
                aviso?.classList.toggle("aviso-hud--visible", conAviso);
                const dice = conAviso ? "Se rompió algo. Volvemos al helipuerto…" : "";
                if (avTexto && avTexto.textContent !== dice) avTexto.textContent = dice;
                if (torre) {
                  torre.hidden = !conTorre;
                  torre.classList.toggle("torre--roja", conTorre);
                }
              }
              const v = cada.camara && Math.floor(t / cada.camara) % 2 ? "cockpit" : "chase";
              if (globalThis.__oga.vista() !== v) globalThis.__oga.ponerVista(v);
            }
            if (t < ms) requestAnimationFrame(paso);
            else listo();
          };
          requestAnimationFrame(paso);
        });
        if (cambios) {
          raiz?.classList.remove("hud--avisando");
          aviso?.classList.remove("aviso-hud--visible");
          if (torre) torre.hidden = true;
          globalThis.__oga.ponerVista("chase");
        }
        const g = hud.gastoDelReparto();
        const duracion = performance.now() - inicio;
        return {
          fotogramas,
          msPorImagen: duracion / fotogramas,
          peorImagen: peor,
          miradas: g.miradas - g0.miradas,
          repartos: g.repartos - g0.repartos,
          ms: g.ms - g0.ms - (g.msMaqueta - g0.msMaqueta),
          msReparto: g.msReparto - g0.msReparto,
          msMaqueta: g.msMaqueta - g0.msMaqueta,
          maximo: g.maximo,
        };
      },
      [ms, cambios, cada],
    );

  /**
   * **Y cada reparto, a mano**: `VECES` seguidos con un subtítulo distinto en
   * cada uno, que obliga a maquetar de nuevo como en un fotograma con cambios.
   * Mide lo mismo en un árbol que aún no lleve la cuenta (`gastoDelReparto`),
   * para tener el antes de un cambio.
   */
  const aMano = () =>
    page.evaluate((veces) => {
      const hud = globalThis.__oga.juegoParaTrazas().hud;
      const hint = document.querySelector('[data-hud="hint"]');
      const tiempos = [];
      for (let i = 0; i < veces; i++) {
        if (hint) hint.textContent = `Mirá la pista a lo lejos: vamos hacia ella (${i}).`;
        const t0 = performance.now();
        hud.repartirAhora();
        tiempos.push(performance.now() - t0);
      }
      if (hint) hint.textContent = "";
      tiempos.sort((a, b) => a - b);
      return {
        media: tiempos.reduce((a, b) => a + b, 0) / tiempos.length,
        mediana: tiempos[Math.floor(tiempos.length / 2)],
        peor: tiempos[tiempos.length - 1],
      };
    }, VECES);

  const cuenta = await page.evaluate(() => !!globalThis.__oga.juegoParaTrazas().hud.gastoDelReparto?.());
  const quieto = cuenta ? await tramo(QUIETO, false) : null;
  const conCambios = cuenta ? await tramo(CON_CAMBIOS, true) : null;
  /*
   * Y como en un vuelo: una frase cada tres segundos, y el aviso y la lámpara
   * los que ponga el juego. Encendidos a mano no valen aquí: el juego los
   * apaga en cada fotograma y el banco los vuelve a encender, y esa pelea
   * cambia la firma en cada imagen, cosa que en un vuelo no pasa.
   */
  const comoUnVuelo = cuenta
    ? await tramo(CON_CAMBIOS, true, { frase: 3000, aviso: 0, camara: 0 })
    : null;
  const mano = await aMano();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  console.log(`  ${ANCHO}×${ALTO} con el dedo, CPU ×${APRIETE}, dibuja ${tarjeta}`);
  console.log(
    `  a mano       ${VECES} repartos de ${mano.media.toFixed(2)} ms de media` +
      ` (mediana ${mano.mediana.toFixed(2)}, el peor ${mano.peor.toFixed(2)}), con la maqueta que obliga cada uno`,
  );
  if (!cuenta) console.log("  (este árbol no lleva la cuenta del reparto: solo a mano)");
  for (const [nombre, r] of cuenta
    ? [
        ["quieto", quieto],
        ["con cambios", conCambios],
        ["como un vuelo", comoUnVuelo],
      ]
    : [])
    console.log(
      `  ${nombre.padEnd(12)} ${r.fotogramas} imágenes de ${r.msPorImagen.toFixed(1)} ms (la peor ${r.peorImagen.toFixed(0)})` +
        ` · el reparto: ${(r.ms / r.fotogramas).toFixed(3)} ms por imagen,` +
        ` ${r.repartos} repartos de ${r.repartos ? (r.msReparto / r.repartos).toFixed(2) : "–"} ms de media` +
        ` (el más caro, ${r.maximo.toFixed(2)} desde que se pintó)` +
        ` · y la maqueta que el juego dejó pendiente, aparte: ${r.repartos ? (r.msMaqueta / r.repartos).toFixed(2) : "–"} ms por reparto`,
    );
} finally {
  await navegador.close();
  await server.close();
}
