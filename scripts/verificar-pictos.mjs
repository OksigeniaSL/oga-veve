/**
 * Los dibujos del primer peldaño, mirados de verdad.
 *
 * Esto imprimía cuatro líneas y salía con cero pasara lo que pasara: una
 * sonda que no puede fallar no mira nada. Ahora comprueba lo que de verdad
 * importa de un instrumento sin letras — **que se mueva cuando cambia lo que
 * mide** y que los dos botones del motor **no sean el mismo dibujo**.
 *
 * Lo segundo hacía falta: llevaban la misma hélice en dos tamaños y en
 * pantalla se leían como dos `+`. «Quiere que suba, pero no me deja meter gas
 * ¿cómo subo?» — estaba apretando el de bajar.
 *
 * Uso: `node scripts/verificar-pictos.mjs [carpeta-de-capturas]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const D = process.argv[2] ?? null;
const PUERTO = 5196;
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  localStorage.setItem("oga-veve:tramo", "guyrami");
  localStorage.setItem("oga-veve:teclas-vistas", "1");
});
await page.goto(`${BASE}/?escenario=valle-cordillera&hora=16`);
await page.waitForSelector('[data-picto="speed"]', { timeout: 60000 });
await page.waitForTimeout(2200);

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

const leer = async () => ({
  vel: await page.locator('[data-picto="speed"]').getAttribute("transform"),
  alt: await page.locator('[data-picto="altitude"]').getAttribute("transform"),
  boton: await page.locator(".freno--boton:not([hidden])").count(),
});

const parado = await leer();
if (D) await page.screenshot({ path: `${D}/picto-parado.png` });

/*
 * ── Los dos botones del motor ─────────────────────────────────────────────
 *
 * Se comparan **en píxeles**, no en marcado: dos SVG distintos pueden
 * dibujar lo mismo, y eso era justo el fallo — una hélice de radio 7 y otra
 * de radio 11 son dos cadenas distintas y la misma cruz en pantalla. Se
 * recortan los dos botones y se cuenta en cuántos píxeles se diferencian.
 */
const menos = page.locator('[data-hud="throttle-down"]');
const mas = page.locator('[data-hud="throttle-up"]');
comprobar(
  "los dos botones del motor están en pantalla",
  (await menos.count()) === 1 && (await mas.count()) === 1,
  `menos ${await menos.count()} · más ${await mas.count()}`,
  "sin botones no hay nada que comparar",
);

const distintos = await (async () => {
  const a = (await menos.screenshot()).toString("base64");
  const c = (await mas.screenshot()).toString("base64");
  /*
   * En píxeles de verdad, no en bytes del PNG: dos capturas comprimidas casi
   * nunca comparten bytes, así que compararlas crudas daba «100 % distintas»
   * también cuando los dos botones eran la misma cruz. Una comprobación que
   * sale bien pase lo que pase no comprueba nada.
   */
  return page.evaluate(
    async ([a, c]) => {
      const pintar = async (b64) => {
        const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
        const img = await createImageBitmap(
          new Blob([bin], { type: "image/png" }),
        );
        const lienzo = new OffscreenCanvas(img.width, img.height);
        const ctx = lienzo.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height);
      };
      const [x, y] = [await pintar(a), await pintar(c)];
      if (x.width !== y.width || x.height !== y.height) return 1;
      let lejos = 0;
      for (let i = 0; i < x.data.length; i += 4) {
        const d =
          Math.abs(x.data[i] - y.data[i]) +
          Math.abs(x.data[i + 1] - y.data[i + 1]) +
          Math.abs(x.data[i + 2] - y.data[i + 2]);
        if (d > 60) lejos++;
      }
      return lejos / (x.data.length / 4);
    },
    [a, c],
  );
})();
comprobar(
  "el botón de más motor no se ve igual que el de menos",
  distintos > 0.03,
  `se diferencian en el ${(distintos * 100).toFixed(1)} % de los píxeles`,
  "eran la misma hélice en dos tamaños y las dos se leían como un +",
);

// ── Y que los dibujos se muevan con lo que miden ──────────────────────────
for (let i = 0; i < 60; i++) await page.keyboard.press("+");
await page.waitForTimeout(1500);
const rodando = await leer();
comprobar(
  "el avioncito de la velocidad se mueve al acelerar",
  rodando.vel !== parado.vel,
  `${parado.vel} → ${rodando.vel}`,
  "un instrumento que no se mueve no es un instrumento",
);

await page.keyboard.down("ArrowUp");
await page.waitForTimeout(6000);
await page.keyboard.up("ArrowUp");
const volando = await leer();
if (D) await page.screenshot({ path: `${D}/picto-volando.png` });
comprobar(
  "el avioncito de la altura sube al despegar",
  volando.alt !== rodando.alt,
  `${rodando.alt} → ${volando.alt}`,
  "la altura es el único dibujo que no traduce nada: tiene que subir",
);
/*
 * ── El horizonte ──────────────────────────────────────────────────────────
 *
 * El cuarto dibujo, y el que faltaba. Con el avión inclinado no había en los
 * peldaños sin cifras **una sola cosa en pantalla** que lo dijera: la tarjeta
 * del horizonte y las esferas solo existen de Taguato para arriba. «Yo ni
 * escucho ni veo eso de los grados.»
 *
 * Se comprueba lo que hace un instrumento de actitud: que la raya se incline
 * al inclinarse el avión —y al revés que él, que es como funciona uno de
 * verdad— y que avise cuando el viraje deja de ser un viraje.
 */
const alabear = async (grados) =>
  page.evaluate(async (g) => {
    const o = globalThis.__oga;
    o.pilotar((c) => {
      c.engineOn = true;
      c.throttle = 0.8;
      c.elevator = 0;
      c.rudder = 0;
      const a = (o.actitud().alabeo * 180) / Math.PI;
      c.aileron = g === 0 ? -a * 0.05 : a < g ? 1 : 0.2;
    });
    await new Promise((r) => setTimeout(r, 4500));
    return Math.round((o.actitud().alabeo * 180) / Math.PI);
  }, grados);

const giroDe = () =>
  page
    .locator('[data-picto="horizonte"]')
    .getAttribute("transform")
    .then((t) => Number(/rotate\(([-0-9.]+)/.exec(t ?? "")?.[1] ?? NaN));

const derecho = await alabear(0);
const giroDerecho = await giroDe();
const torcido = await alabear(85);
const giroTorcido = await giroDe();
const ambar = await page
  .locator('[data-picto="horizonte"].picto__mundo--mucho')
  .count();

comprobar(
  "el horizonte está en pantalla en los peldaños sin cifras",
  Number.isFinite(giroDerecho),
  Number.isFinite(giroDerecho) ? "sale" : "no hay dibujo de actitud",
  "con el avión de canto no había nada que lo dijera",
);
comprobar(
  "y se inclina al revés que el avión, como uno de verdad",
  Math.abs(giroTorcido + torcido) < 8 && Math.abs(giroTorcido) > 20,
  `avión ${torcido}° · horizonte ${giroTorcido.toFixed(0)}°`,
  "si girase con el avión, quien aprenda aquí tendrá que desaprenderlo",
);
comprobar(
  "y se pone ámbar cuando el viraje deja de ser un viraje",
  ambar === 1 && giroDerecho !== null,
  `a ${torcido}° ${ambar ? "ámbar" : "sigue apagado"}`,
  "el aviso estaba en 45° y el nivelador de alas no deja pasar de 43",
);
await page.evaluate(() => globalThis.__oga.pilotar(null));

comprobar(
  "el botón del freno se esconde en el aire",
  volando.boton === 0,
  `${volando.boton} botones de freno visibles`,
  "en el aire el freno no sirve de nada y ocupa sitio",
);
comprobar(
  "sin errores en consola",
  !errores.length,
  errores[0] ?? "limpio",
  "",
);

for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones`);

await b.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);
