/**
 * **Mirar la pantalla del asiento**: una captura de cada modo, puesta dentro de la
 * cabina del JAZ 110 con la tarjeta de verdad, y lo que cuesta un repintado de cada
 * uno en esta máquina.
 *
 *   OGA_FOTOS=carpeta node scripts/ver-pantalla-respaldo.mjs
 *
 * Abre `?inicio=3&avion=jaz-110`, pone el plano `respaldo` y va pasando los modos sobre
 * la pantalla que lleva puesta la cabina, en tres momentos: de noche sobre el mar, por
 * la mañana con sol en Madrid y a oscuras todavía en Asunción, y de día en las dos. De
 * paso deja el lienzo plano de cada uno, sin la cabina, para mirar el dibujo tal cual.
 *
 * La medida se hace con una pantalla nueva, con el avión en otro sitio cada vez para
 * que repinte siempre, y da tres cifras en ms:
 *
 * - `pintar`: lo que tarda el `poner` en el hilo del juego. Con el lienzo acelerado, el
 *   dibujo solo se apunta aquí, y lo paga la tarjeta después.
 * - `subir`: lo anterior más la subida a la tarjeta, con sus mipmaps, en el mismo hilo
 *   (`initTexture`): lo que de verdad le quita a un fotograma.
 * - `hasta el final`: lo anterior esperando a que la tarjeta termine, leyendo un píxel,
 *   que obliga a esperar a toda la cola (con `gl.finish`, en Chrome no se espera a
 *   nada: daba cero, y esa medida no podía ver nada). Lo pesimista, porque en el juego
 *   eso va en paralelo.
 *
 * A una y a cuatro veces de CPU, la tablet de gama media del banco de rendimiento.
 * `OGA_SOLO_MEDIR=1` no saca fotos; `OGA_LIENZO_SIN_TARJETA=1` lo mide con el lienzo 2D
 * sin acelerar, que es lo peor que se puede encontrar: una tablet o un portátil de
 * colegio en la lista negra de Chrome, donde todo eso va en el hilo del juego.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.env.OGA_FOTOS ?? "capturas-pantalla-respaldo";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5605);
const SOLO_MEDIR = !!process.env.OGA_SOLO_MEDIR;
const LIENZO_SIN_TARJETA = !!process.env.OGA_LIENZO_SIN_TARJETA;
mkdirSync(FOTOS, { recursive: true });

const MODOS = ["mapa", "cerca", "pelota", "relojes", "datos"];
/** Los momentos, con su fecha: uno de noche sobre el mar y otro con el sol ya en Madrid. */
const MOMENTOS = [
  { nombre: "noche", fecha: "2026-11-15", t: 3 * 3600 },
  { nombre: "manana", fecha: "2026-06-15", t: 10 * 3600 },
  { nombre: "dia", fecha: "2026-11-15", t: 10.6 * 3600 },
];
/** Los sitios del camino en los que se mira el trozo de cerca: Madrid, Canarias, el mar y el Paraguay. */
const DE_CERCA = [0.4, 2.3, 6, 11];
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: [
    "--use-gl=angle",
    "--use-angle=gl",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--disable-gpu-vsync",
    ...(LIENZO_SIN_TARJETA ? ["--disable-accelerated-2d-canvas"] : []),
  ],
});
const informe = [];

const laTarjeta = (page) =>
  page.evaluate(() => {
    const g = globalThis.__oga.pintor().getContext();
    const i = g.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin extensión";
  });

/** El lienzo plano de un modo y momento, sin cabina: la pantalla entera tal cual se pinta. */
async function lienzoPlano(page, modo, fecha, t, ruta) {
  const datos = await page.evaluate(
    async ({ modo, fecha, t }) => {
      const { PantallaDelRespaldo } = await import("/src/world/pantalla-del-respaldo.ts");
      const { perfilDelVuelo, horarioDelDia } = await import("/src/flight/ruta-larga.ts");
      const pantalla = new PantallaDelRespaldo();
      pantalla.mostrar(modo);
      pantalla.poner(perfilDelVuelo(horarioDelDia(new Date(`${fecha}T12:00:00Z`))), t, { altitud: 11_582, velocidad: 240, temperatura: -56.5 });
      return pantalla.textura.image.toDataURL("image/png");
    },
    { modo, fecha, t },
  );
  writeFileSync(ruta, Buffer.from(datos.split(",")[1], "base64"));
}

/** La misma foto, sin nada de lo que el juego pone encima: lo que se mira aquí es la pantalla. */
async function fotoLimpia(page, ruta) {
  const estilo = await page.addStyleTag({ content: "* { visibility: hidden !important; } canvas#game, #game canvas, canvas { visibility: visible !important; }" });
  await pausa(100);
  await page.screenshot({ path: ruta });
  await estilo.evaluate((n) => n.remove());
}

/** **Lo que cuesta un repintado** de cada modo: mediana y peor de cuarenta, en ms. Ver la cabecera. */
async function medir(page) {
  const cdp = await page.context().newCDPSession(page);
  const salida = [];
  for (const veces of [1, 4]) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: veces });
    const filas = await page.evaluate(async (modos) => {
      const { PantallaDelRespaldo } = await import("/src/world/pantalla-del-respaldo.ts");
      const { perfilDelVuelo, horarioDelDia } = await import("/src/flight/ruta-larga.ts");
      const perfil = perfilDelVuelo(horarioDelDia(new Date("2026-11-15T12:00:00Z")));
      const avion = { altitud: 11_582, velocidad: 240, temperatura: -56.5 };
      const pintor = globalThis.__oga.pintor();
      const gl = pintor.getContext();
      const resultado = [];
      for (const modo of modos) {
        const pantalla = new PantallaDelRespaldo();
        pantalla.mostrar(modo);
        // El primero aparte: en la pelota es el que paga su fondo.
        let a = performance.now();
        pantalla.poner(perfil, 1800, avion);
        pintor.initTexture(pantalla.textura);
        const pixel = new Uint8Array(4);
        const esperar = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        esperar();
        const primero = performance.now() - a;
        const cifras = { pintar: [], subir: [], final: [] };
        for (let i = 1; i <= 40; i++) {
          // Un fotograma por medio: la tarjeta tiene su cola, y en el juego no se repinta seguido.
          await new Promise((r) => requestAnimationFrame(r));
          const t = 1800 + i * 900;
          // Los datos no se repintan más de dos veces por segundo: aquí se le olvida.
          pantalla.datosPintadosA = -Infinity;
          // Lo que el juego tenía en cola no es de este repintado.
          esperar();
          a = performance.now();
          const repinto = pantalla.poner(perfil, t, { ...avion, velocidad: 200 + i });
          const b = performance.now();
          pintor.initTexture(pantalla.textura);
          const c = performance.now();
          esperar();
          const d = performance.now();
          if (!repinto) continue;
          cifras.pintar.push(b - a);
          cifras.subir.push(c - a);
          cifras.final.push(d - a);
        }
        const resumen = (l) => {
          const o = [...l].sort((x, y) => x - y);
          return [+o[Math.floor(o.length / 2)].toFixed(2), +o[o.length - 1].toFixed(2)];
        };
        resultado.push({
          modo,
          repintados: cifras.pintar.length,
          primeroHastaElFinal: +primero.toFixed(1),
          pintar: resumen(cifras.pintar),
          subir: resumen(cifras.subir),
          hastaElFinal: resumen(cifras.final),
        });
        // Los dos testigos, para saber de quién es cada cosa. Sin pintar nada, solo subir lo que hay:
        const soloSubir = [];
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => requestAnimationFrame(r));
          esperar();
          a = performance.now();
          pantalla.textura.needsUpdate = true;
          pintor.initTexture(pantalla.textura);
          esperar();
          soloSubir.push(performance.now() - a);
        }
        // Y la pregunta de cada fotograma, cuando no hay que repintar: es lo único que se paga siempre.
        a = performance.now();
        const fijo = 1800 + 41 * 900;
        for (let i = 0; i < 2000; i++) pantalla.poner(perfil, fijo, { ...avion, velocidad: 241 });
        const pregunta = (performance.now() - a) / 2000;
        const ultima = resultado[resultado.length - 1];
        ultima.soloSubirHastaElFinal = resumen(soloSubir);
        ultima.preguntaMicros = +(pregunta * 1000).toFixed(1);
        pantalla.dispose();
      }
      return resultado;
    }, MODOS);
    for (const f of filas) {
      console.log(`  ×${veces} ${f.modo.padEnd(8)} pintar ${f.pintar.join(" / ")} · subir ${f.subir.join(" / ")} · hasta el final ${f.hastaElFinal.join(" / ")} · el primero ${f.primeroHastaElFinal} · sin pintar, solo subir ${f.soloSubirHastaElFinal.join(" / ")} (mediana / peor, ms; ${f.repintados} repintados) · sin repintar, ${f.preguntaMicros} µs por fotograma`);
      salida.push({ veces, ...f });
    }
  }
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  return salida;
}

try {
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  for (const { nombre, fecha, t } of SOLO_MEDIR ? MOMENTOS.slice(0, 1) : MOMENTOS) {
    console.log(`${nombre}: ${fecha}, a ${t / 3600} h del despegue`);
    const page = await contexto.newPage();
    page.on("pageerror", (e) => console.log("  ERROR:", e.message.slice(0, 300)));
    page.on("console", (m) => {
      if (m.type() === "error" || /THREE\./.test(m.text())) console.log("  consola:", m.text().slice(0, 300));
    });
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(`${BASE}/?inicio=3&avion=jaz-110&fecha=${fecha}&largo=${t}&hasta=${t}`);
    await page.waitForFunction(() => !!globalThis.__oga?.inicio?.()?.estado, null, { timeout: 240_000 });
    await page.keyboard.press("ShiftLeft");
    await page.waitForFunction(() => globalThis.__oga.inicio().vista?.startsWith("pasaje"), null, { timeout: 120_000 }).catch(() => {});
    await pausa(800);
    const tarjeta = await laTarjeta(page);
    console.log(`  tarjeta: ${tarjeta}`);
    informe.push(`${nombre}: ${tarjeta}`);
    await page.evaluate(() => globalThis.__oga.ponerPlano("respaldo"));
    await pausa(1500);
    for (const modo of SOLO_MEDIR ? [] : MODOS) {
      const puesto = await page.evaluate((m) => globalThis.__oga.modoDeLaPantalla?.(m) ?? null, modo);
      await pausa(1200);
      console.log(`  ${modo}: ${JSON.stringify(puesto)}`);
      await fotoLimpia(page, `${FOTOS}/${modo}-${nombre}.png`);
      await lienzoPlano(page, modo, fecha, t, `${FOTOS}/${modo}-${nombre}-lienzo.png`);
    }
    if (nombre === "noche") {
      for (const h of SOLO_MEDIR ? [] : DE_CERCA) await lienzoPlano(page, "cerca", "2026-06-15", h * 3600, `${FOTOS}/cerca-a-${h}h-lienzo.png`);
      informe.push(JSON.stringify(await medir(page), null, 1));
    }
    await page.close();
  }
  writeFileSync(`${FOTOS}/informe${LIENZO_SIN_TARJETA ? "-sin-tarjeta" : ""}.txt`, informe.join("\n") + "\n");
} finally {
  await navegador.close();
  await server.close();
}
