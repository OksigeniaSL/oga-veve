/**
 * **Al llegar, la raya, el coche y el señalero se ven — en todos los campos.**
 *
 * La prueba sin navegador —`salidas-a-un-puesto.test.ts`— dice que el plan
 * sabe llevarte de cada salida de pista a un puesto. Lo que no puede decir es
 * si eso **se ve**, y ahí estaba el fallo: aterrizando con «dar una vuelta» —la
 * lección de viajar y la de las misiones— el plan trazaba la ruta, la ayuda de
 * rodaje giraba el avión hacia la salida y la tarjeta ponía «E3», pero la
 * raya, el coche del sígame y el señalero no estaban en la escena. «Se giró él
 * solo, no sé a dónde va.» Y la tarjeta del señalero salía dando indicaciones
 * sin el muñeco. Todos los bancos miraban el dato —`ruta()`, `visible`— y
 * ninguno el dibujo.
 *
 * Aquí se aterriza en cada campo y se mira lo que hay en pantalla:
 *
 * - recién frenado en la pista: la raya está en la escena, con luces
 *   encendidas por delante y dentro del cuadro; y el coche, donde lo hay;
 * - llegando al puesto: el señalero está en la escena, de pie y en el
 *   cuadro, y hace un gesto;
 * - y en todo el rato, **la tarjeta del señalero no sale sin él en el
 *   cuadro**.
 *
 * El vuelo no se vuela: se pone el avión en el aire un rato —para que el plan
 * sepa que ha volado—, se posa en la pista y se frena; después se lleva a la
 * boca del puesto por su propia raya. Lo que se mide es lo que se ve al
 * llegar, no cómo se llega.
 *
 * Uso: `node scripts/verificar-llegadas.mjs [lección] [campo…]`. Por defecto
 * «vuelta», que es la que fallaba, y los dieciséis campos. `OGA_GPU=1` y
 * `OGA_FOTOS=carpeta` para mirar las capturas con la tarjeta de verdad;
 * `OGA_AVION=jaz-90` para otro avión (si no cabe en un campo, el juego pone el
 * mayor que quepa).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const LECCION = process.argv[2] ?? "vuelta";
// Los dieciséis que tienen aeródromo: el valle y el Chaco no tienen dónde llegar.
const TODOS = [
  "yvytu-rape",
  "pettirossi",
  "guarani",
  "encarnacion",
  "concepcion",
  "estigarribia",
  "pedro-juan",
  "tenerife-norte",
  "la-palma",
  "tenerife-sur",
  "gran-canaria",
  "lanzarote",
  "fuerteventura",
  "el-hierro",
  "la-gomera",
  "cuatro-vientos",
];
const CAMPOS = process.argv.length > 3 ? process.argv.slice(3) : TODOS;
const AVION = process.env.OGA_AVION ?? null;
const FOTOS = process.env.OGA_FOTOS ?? null;
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = 5297;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
if (FOTOS) {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(FOTOS, { recursive: true });
}

const filas = [];
let fallos = 0;

try {
  for (const campo of CAMPOS) {
    const page = await navegador.newPage({
      viewport: { width: 1000, height: 620 },
      locale: "es-PY",
    });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    await page.addInitScript(() =>
      localStorage.setItem("oga-veve:teclas-vistas", "1"),
    );
    await page.goto(
      `${BASE}/?escenario=${campo}&hora=16&leccion=${LECCION}&tramo=guyrami&meteo=` +
        (AVION ? `&avion=${AVION}` : ""),
    );
    const listo = await page
      .waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 120000 })
      .then(() => true)
      .catch(() => false);
    if (!listo) {
      filas.push(`✗ ${campo}: el juego no arrancó${errores.length ? ` (${errores[0]})` : ""}`);
      fallos++;
      await page.close();
      continue;
    }
    await page.waitForTimeout(4000);

    const foto = async (nombre) => {
      if (FOTOS)
        await page
          .screenshot({ path: `${FOTOS}/${campo}-${LECCION}-${nombre}.png` })
          .catch(() => {});
    };

    /*
     * Lo que se mira, en la página: si un objeto está colgado de la escena,
     * visible él y todos sus padres, y si un punto cae dentro del cuadro de la
     * cámara de verdad.
     */
    await page.evaluate(() => {
      const o = globalThis.__oga;
      const V = o.camaraViva().position.constructor;
      globalThis.__mira = {
        enEscena(obj) {
          let r = obj;
          while (r) {
            if (!r.visible) return false;
            if (r === o.escena()) return true;
            r = r.parent;
          }
          return false;
        },
        enCuadro(x, y, z) {
          const p = new V(x, y, z).project(o.camaraViva());
          return p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1;
        },
      };
      // Con el motor en marcha y frenado, y sin órdenes de irse al aire.
      o.mandarFrustrar?.("nunca");
      globalThis.__mandos = {
        throttle: 0,
        brakes: 1,
        aileron: 0,
        elevator: 0,
        rudder: 0,
        engineOn: true,
      };
      o.pilotar((m) => Object.assign(m, globalThis.__mandos));
    });

    /*
     * Y la tarjeta del señalero, vigilada todo el rato: cada vez que se vea,
     * el señalero tiene que estar en la escena y en el cuadro.
     */
    const fantasmas = [];
    let vigilando = true;
    const vigia = (async () => {
      while (vigilando) {
        const f = await page
          .evaluate(() => {
            const o = globalThis.__oga;
            const dibujo = o.tarjeta?.()?.dibujo ?? "";
            if (!dibujo.includes("senalero")) return null;
            const s = o.senalero();
            const g = s.grupo;
            const ok =
              globalThis.__mira.enEscena(g) &&
              globalThis.__mira.enCuadro(g.position.x, g.position.y + 1.5, g.position.z);
            return ok ? null : `${dibujo} con el señalero ${g.parent ? "fuera del cuadro" : "fuera de la escena"}`;
          })
          .catch(() => null);
        if (f && fantasmas.length < 3) fantasmas.push(f);
        await new Promise((r) => setTimeout(r, 150));
      }
    })();

    // ── Volado, posado y frenado ────────────────────────────────────────
    const pista = await page.evaluate(async () => {
      const o = globalThis.__oga;
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      const tren = o.avion().tren;
      /*
       * Quince segundos por encima de ciento veinte metros, que es lo que pide
       * el plan para dar por volado un vuelo —ver `haVolado` en `vuelo.ts`—.
       * Se vuelve a poner cada dos segundos para que no baje.
       */
      const f = o.puntoDeFinal(2500);
      for (let i = 0; i < 9; i++) {
        o.colocar(f.x, f.suelo + 250, f.z, o.avion().aproximacion ?? 50, f.h);
        await espera(2000);
      }
      const t = o.puntoDeFinal(-350);
      o.pedirTren?.(true);
      o.colocar(t.x, o.sueloDeVuelo(t.x, t.z) + tren + 0.05, t.z, 14, t.h);
      for (let i = 0; i < 60; i++) {
        await espera(500);
        if (o.fase() === "abandonando" || o.estado().groundSpeed < 1) break;
      }
      await espera(2500);
      return { fase: o.fase(), percance: o.percance?.() ?? null };
    });
    await foto("1-en-pista");

    const enPista = await page.evaluate(() => {
      const o = globalThis.__oga;
      const m = globalThis.__mira;
      const escena = o.escena();
      const ruta = o.ruta();
      const avance = o.avanceEnLaRuta?.() ?? 0;
      const raya = escena.getObjectByName("ruta");
      const brillos = escena.getObjectByName("ruta-brillos");
      // Los puntos de la raya de los próximos ochenta metros, en el cuadro.
      let andado = 0;
      let vistos = 0;
      let mirados = 0;
      for (let i = 1; i < ruta.length; i++) {
        andado += Math.hypot(ruta[i][0] - ruta[i - 1][0], ruta[i][1] - ruta[i - 1][1]);
        if (andado < avance + 5) continue;
        if (andado > avance + 80) break;
        mirados++;
        const y = o.sueloDeVuelo(ruta[i][0], ruta[i][1]);
        if (m.enCuadro(ruta[i][0], y, ruta[i][1])) vistos++;
      }
      // Luces encendidas: las que tienen transparencia por encima de cero.
      let encendidas = 0;
      const col = brillos?.geometry?.getAttribute?.("color");
      if (col) for (let k = 0; k < col.count; k++) if (col.getW(k) > 0.5) encendidas++;
      const coche = o.sigueme?.();
      const cg = coche?.grupo;
      return {
        puntos: ruta.length,
        rayaEnEscena: !!raya && m.enEscena(raya),
        encendidas,
        vistos,
        mirados,
        haySigueme: !!coche,
        enBici: !!coche?.enBici,
        cocheEnEscena: !!cg && m.enEscena(cg),
        cocheEnCuadro: !!cg && m.enCuadro(cg.position.x, cg.position.y + 1, cg.position.z),
        cocheA: cg
          ? Math.round(
              Math.hypot(cg.position.x - o.estado().position.x, cg.position.z - o.estado().position.z),
            )
          : null,
      };
    });

    // ── A la boca del puesto, por la raya ───────────────────────────────
    const llegada = await page.evaluate(async () => {
      const o = globalThis.__oga;
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      const tren = o.avion().tren;
      const ruta = o.ruta();
      if (ruta.length < 2) return { sinRuta: true };
      // El punto de la raya a tantos metros del final, y hacia dónde va.
      const aDelFinal = (d) => {
        let queda = 0;
        for (let i = ruta.length - 1; i > 0; i--) {
          const a = ruta[i - 1];
          const b = ruta[i];
          const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (queda + l >= d) {
            const t = (d - queda) / l;
            return {
              x: b[0] + (a[0] - b[0]) * t,
              z: b[1] + (a[1] - b[1]) * t,
              rumbo: Math.atan2(b[0] - a[0], -(b[1] - a[1])),
            };
          }
          queda += l;
        }
        return null;
      };
      const gestos = new Set();
      let visto = false;
      let enCuadro = false;
      const m = globalThis.__mira;
      for (const d of [70, 55, 40, 28, 18, 10]) {
        const p = aDelFinal(d);
        if (!p) continue;
        o.colocar(p.x, o.sueloDeVuelo(p.x, p.z) + tren + 0.05, p.z, 3, p.rumbo);
        await espera(700);
        const s = o.senalero();
        const g = s.grupo;
        if (m.enEscena(g)) visto = true;
        if (m.enEscena(g) && m.enCuadro(g.position.x, g.position.y + 1.5, g.position.z))
          enCuadro = true;
        if (s.gestoDeAhora) gestos.add(s.gestoDeAhora);
      }
      return { visto, enCuadro, gestos: [...gestos], fase: o.fase() };
    });
    await foto("2-en-el-puesto");

    vigilando = false;
    await vigia;

    const bien = [];
    const mal = [];
    const mira = (ok, texto) => (ok ? bien : mal).push(texto);
    mira(enPista.puntos > 1, `ruta de ${enPista.puntos} puntos`);
    mira(enPista.rayaEnEscena, "raya en la escena");
    mira(enPista.encendidas > 0, `${enPista.encendidas} luces encendidas`);
    mira(
      enPista.mirados > 0 && enPista.vistos >= enPista.mirados / 2,
      `raya en el cuadro ${enPista.vistos}/${enPista.mirados}`,
    );
    if (enPista.haySigueme && !enPista.enBici)
      mira(
        enPista.cocheEnEscena,
        `coche en la escena${enPista.cocheA !== null ? ` a ${enPista.cocheA} m` : ""}${enPista.cocheEnCuadro ? " y en el cuadro" : ""}`,
      );
    mira(!llegada.sinRuta && llegada.visto, "señalero en la escena");
    mira(!llegada.sinRuta && llegada.enCuadro, "señalero en el cuadro");
    mira((llegada.gestos?.length ?? 0) > 0, `gestos: ${llegada.gestos?.join(", ") || "ninguno"}`);
    mira(fantasmas.length === 0, fantasmas.length ? `tarjeta sin señalero: ${fantasmas.join(" | ")}` : "ninguna tarjeta sin señalero");
    const ok = mal.length === 0 && !pista.percance;
    if (!ok) fallos++;
    filas.push(
      `${ok ? "✓" : "✗"} ${campo} (${pista.fase}${pista.percance ? `, percance ${pista.percance}` : ""})` +
        (mal.length ? `\n    falla: ${mal.join(" · ")}` : "") +
        `\n    bien: ${bien.join(" · ")}`,
    );
    console.log(filas[filas.length - 1]);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

console.log(`\n  ${LECCION}: ${CAMPOS.length - fallos} de ${CAMPOS.length} campos con raya, coche y señalero a la vista.`);
process.exit(fallos ? 1 : 0);
