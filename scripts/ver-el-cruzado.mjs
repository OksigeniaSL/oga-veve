/**
 * **La final con viento cruzado, volada en el juego** (#92, H32a; ADR 0031,
 * enmienda H32a): Los Rodeos con el alisio de casa —del 040 a doce nudos,
 * casi doce de costado por la izquierda sobre la 12— y una de las dos
 * técnicas.
 *
 *   node scripts/ver-el-cruzado.mjs <carpeta>
 *
 * El piloto de banco es el de la mesa (`final-con-viento-cruzado.test.ts`),
 * metido en la página con `__oga.pilotar` para que mande en cada fotograma:
 *
 * - `OGA_TECNICA=cangrejo` (lo de siempre): el camino por el eje con el ala y
 *   la bola centrada —el timón automático, o sus pies en Taguato Ruvicha—, y
 *   en la recogida el pie y el morro a la pista;
 * - `OGA_TECNICA=ala-baja`: el morro en el eje con el pie y el camino con el
 *   ala; solo se ofrece en Taguato Ruvicha.
 *
 * Mira que se presente, que el cangrejo medido sea el del triángulo con el
 * viento que sopla, que al tocar el morro esté en la pista, y lo que dibuja y
 * escribe la tarjeta. Capturas **desde fuera**, que es desde donde se
 * distinguen las dos: el avión torcido sobre la raya, o derecho e inclinado.
 * El puerto, `OGA_PUERTO`; el peldaño, `OGA_TRAMO`; el avión, `OGA_AVION`; el
 * reloj, `OGA_VECES` (dos); con `OGA_GPU=1`, con la tarjeta de verdad; con
 * `OGA_TRAZA=1`, la final en renglones: el morro y el camino desde la pista,
 * el ala, el derrape, la verdadera, el viento de costado y lo que pide el
 * triángulo (H32b).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, readFileSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-cruzado";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const TECNICA = process.env.OGA_TECNICA ?? "cangrejo";
const TRAMO = process.env.OGA_TRAMO ?? (TECNICA === "ala-baja" ? "taguato-ruvicha" : "taguato");
const VECES = Number(process.env.OGA_VECES ?? 2);
const CON_GPU = process.env.OGA_GPU === "1";
const NOMBRE = `${TECNICA}-${AVION}-${TRAMO}`;

mkdirSync(SALIDA, { recursive: true });
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
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    const r = j.scenario.runway;
    const h = (r.heading * Math.PI) / 180;
    const q = s.orientation;
    return {
      ejercicio: o.cruzado(),
      altura: s.position.y - j.terrain.sampleHeight(s.position.x, s.position.z) - j.aircraft.gearHeight,
      eje: (s.position.x - r.x) * Math.cos(h) + (s.position.z - r.z) * Math.sin(h),
      morro: ((((s.heading - h) * 180) / Math.PI + 540) % 360) - 180,
      ala: (Math.asin(-2 * (q.x * q.y + q.w * q.z)) * 180) / Math.PI,
      enElSuelo: s.onGround,
      camino: ((((Math.atan2(s.velocity.x, -s.velocity.z) - h) * 180) / Math.PI + 540) % 360) - 180,
      derrape: (s.beta * 180) / Math.PI,
      piloto: o.pilotoAutomatico?.() ?? null,
      // La ráfaga que lleva el modelo de vuelo encima del viento del parte: solo para la traza.
      racha: j.flight?.racha ? { x: j.flight.racha.x, z: j.flight.racha.z } : null,
      alabeoPedido: j.input?.controls?.aileron ?? null,
      piePedido: j.input?.controls?.rudder ?? null,
      verdadera: s.airspeed,
      viento: j.vientoAqui?.aire ?? { x: 0, z: 0 },
      pista: r.heading,
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      texto: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    };
  });

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?escenario=tenerife-norte&hora=12&tramo=${TRAMO}&avion=${AVION}&ejercicio=${TECNICA}`);
  await page.waitForFunction(() => globalThis.__oga?.estado?.() != null && globalThis.__oga.cruzado?.() != null, null, {
    timeout: 120000,
  });
  await pausa(2500);
  await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
  const foto = async (n) => {
    const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
    await page.screenshot({ path: ruta });
    console.log(`    foto: ${ruta}`);
  };
  const tarjeta = await page.evaluate(() => {
    const g = document.createElement("canvas").getContext("webgl");
    const i = g?.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
  });
  console.log(`    tarjeta: ${tarjeta}`);

  let r = await leer(page);
  const e0 = r.ejercicio;
  const costado = -(r.viento.x * Math.cos((r.pista * Math.PI) / 180) + r.viento.z * Math.sin((r.pista * Math.PI) / 180));
  comprobar(
    "en la final de la 12, con el viento de costado por la izquierda",
    // La 12 por su rumbo verdadero, 111°: ver `data/aerodromes/gcxo.aero.json`.
    e0.tecnica === TECNICA && e0.lado === -1 && Math.abs(r.pista - 111) < 3 && costado < -5,
    `pista ${r.pista.toFixed(0)}, ${(Math.abs(costado) / 0.514444).toFixed(1)} kt de costado, ${Math.round(r.altura)} m`,
  );
  await foto("01-final");

  // Los flaps de aterrizar, como en la mesa: la final a la velocidad de aproximación.
  await page.evaluate(() => globalThis.__oga.pedirFlaps(1));
  // **El piloto de la mesa**, en la página. Ver `final-con-viento-cruzado.test.ts`.
  await page.evaluate(
    ({ tecnica, veces }) => {
      const o = globalThis.__oga;
      const j = o.juegoParaTrazas();
      const r = j.scenario.runway;
      const h = (r.heading * Math.PI) / 180;
      const fx = Math.sin(h);
      const fz = -Math.cos(h);
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const dif = (a, b) => {
        let d = a - b;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        return d;
      };
      const a = j.aircraft;
      // El punto de toma, a trescientos metros del umbral.
      const umbral = r.length / 2 - 300;
      const dt = veces / 60;
      let integral = 0;
      let pie = 0;
      let gas = null;
      o.pilotar((c) => {
        const s = o.estado();
        if (s.onGround) {
          c.throttle = 0;
          c.aileron = 0;
          c.elevator = 0;
          c.rudder = 0;
          c.brakes = 0.5;
          return;
        }
        if (gas === null) gas = c.throttle;
        // Sobre el suelo de debajo: la pista de Los Rodeos no está toda a la cota del campo.
        const hAlto = s.position.y - j.terrain.sampleHeight(s.position.x, s.position.z) - a.gearHeight;
        const x = (s.position.x - r.x) * fx + (s.position.z - r.z) * fz + umbral;
        const y = (s.position.x - r.x) * Math.cos(h) + (s.position.z - r.z) * Math.sin(h);
        const vy = s.velocity.x * Math.cos(h) + s.velocity.z * Math.sin(h);
        const q = s.orientation;
        const ala = Math.asin(-2 * (q.x * q.y + q.w * q.z));
        const morro = dif(s.heading, h);
        const tan3 = Math.tan((3 * Math.PI) / 180);
        const senda = -x * tan3;
        const recogida = hAlto < Math.max(4, a.gearHeight * 2);
        const vsQuiere = recogida ? -0.6 : -Math.hypot(s.velocity.x, s.velocity.z) * tan3 + 0.3 * (senda - hAlto);
        const err = vsQuiere - s.verticalSpeed;
        integral = clamp(integral + err * dt, -5, 5);
        c.elevator = clamp(0.12 * err + 0.03 * integral - 0.4 * s.pitchRate, -1, 1);
        gas = recogida ? 0 : clamp(gas + dt * 0.15 * (a.approachSpeed - s.airspeed), 0, 1);
        c.throttle = gas;
        const enderezar = tecnica === "cangrejo" && hAlto < Math.max(5, a.gearHeight * 2.5);
        const conElPie = tecnica === "ala-baja" || enderezar;
        if (conElPie) {
          pie = clamp(pie - (enderezar ? 3 : 1.5) * morro * dt, -1, 1);
          c.rudder = clamp(-(enderezar ? 4 : 3) * morro - 1.5 * s.yawRate + pie, -1, 1);
          const vyQuiere = clamp(-0.25 * y, -3, 3);
          const alaQuiere = clamp(0.18 * (vyQuiere - vy), -0.35, 0.35);
          c.aileron = clamp(3 * (alaQuiere - ala) - 0.6 * s.rollRate, -1, 1);
        } else {
          const camino = Math.atan2(s.velocity.x, -s.velocity.z);
          const quiere = h - Math.atan2(y, 150);
          const alaQuiere = clamp(2 * dif(quiere, camino), -0.3, 0.3);
          c.aileron = clamp(3 * (alaQuiere - ala) - 0.6 * s.rollRate, -1, 1);
          // Sin timón automático, la bola la centran los pies de quien vuela.
          c.rudder = j.tier.assists.autoRudder > 0 ? 0 : clamp(4.5 * s.beta, -1, 1);
        }
      });
    },
    { tecnica: TECNICA, veces: VECES },
  );
  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);

  let fotoMedida = false;
  let fotoCorta = false;
  let textoMedido = "";
  let tarjetaMedida = null;
  let tarjetaDelPie = null;
  const fin = Date.now() + 6 * 60000;
  const TRAZA = process.env.OGA_TRAZA === "1";
  let trazaEn = 0;
  while (Date.now() < fin && !r.enElSuelo && r.ejercicio?.fase !== "cerrada") {
    await pausa(120);
    r = await leer(page);
    if (TRAZA && Date.now() > trazaEn) {
      trazaEn = Date.now() + 700;
      const vc = -(r.viento.x * Math.cos((r.pista * Math.PI) / 180) + r.viento.z * Math.sin((r.pista * Math.PI) / 180));
      console.log(
        `    · ${Math.round(r.altura)} m  ${r.ejercicio.fase}  morro ${r.morro.toFixed(1)}  camino ${r.camino.toFixed(1)}  ala ${r.ala.toFixed(1)}  beta ${r.derrape.toFixed(1)}  ias ${(r.verdadera / 0.514444).toFixed(0)} kt  costado ${(vc / 0.514444).toFixed(1)} kt  pide ${r.ejercicio.pide.toFixed(1)}  eje ${r.eje.toFixed(1)}  racha de costado ${r.racha ? (-(r.racha.x * Math.cos((r.pista * Math.PI) / 180) + r.racha.z * Math.sin((r.pista * Math.PI) / 180)) / 0.514444).toFixed(1) : "?"} kt  ap ${r.piloto}  alerón ${r.alabeoPedido?.toFixed(2)}  pie ${r.piePedido?.toFixed(2)}`,
      );
    }
    const medido = TECNICA === "cangrejo" ? r.ejercicio.cangrejo : r.ejercicio.ala;
    if (!fotoMedida && medido !== null) {
      fotoMedida = true;
      textoMedido = r.texto;
      tarjetaMedida = r.tarjeta;
      console.log(`    medido: morro ${r.morro.toFixed(1)}°, ala ${r.ala.toFixed(1)}°, eje ${r.eje.toFixed(1)} m, ${Math.round(r.altura)} m`);
      await foto("02-medido");
    }
    if (r.ejercicio.fase === "corto" && tarjetaDelPie === null) tarjetaDelPie = r.tarjeta;
    if (!fotoCorta && r.altura < 12) {
      fotoCorta = true;
      console.log(`    corta: morro ${r.morro.toFixed(1)}°, ala ${r.ala.toFixed(1)}°, eje ${r.eje.toFixed(1)} m, ${r.altura.toFixed(1)} m`);
      await foto("03-corta");
    }
  }
  if (TECNICA === "cangrejo") {
    comprobar(
      "el cangrejo medido es el del triángulo con la verdadera y el viento de ese momento, a menos de dos grados",
      r.ejercicio.cangrejo !== null && Math.abs(r.ejercicio.cangrejo - r.ejercicio.pidioAlContar) < 2,
      `medido ${r.ejercicio.cangrejo?.toFixed(1)}°, pedía ${r.ejercicio.pidioAlContar?.toFixed(1)}°`,
    );
    comprobar("la tarjeta dibuja el avión torcido sobre la raya", tarjetaMedida === "cangrejo-viento-izquierda", String(tarjetaMedida));
    comprobar("y en la corta, el pie derecho", tarjetaDelPie === "pie-derecho", String(tarjetaDelPie));
    if (TRAMO !== "tuka")
      comprobar("desde Taguato, los grados escritos", /\d+° (al viento|into the wind)/.test(textoMedido), `«${textoMedido.slice(0, 80)}»`);
  } else {
    comprobar(
      "el ala del viento abajo, medida",
      r.ejercicio.ala !== null && r.ejercicio.ala >= 1,
      `${r.ejercicio.ala?.toFixed(1)}°`,
    );
    comprobar("la tarjeta dibuja el avión inclinado", tarjetaMedida === "ala-baja-viento-izquierda", String(tarjetaMedida));
  }
  // Lo que tarda en cerrarse tras tocar: un paso.
  const finToque = Date.now() + 20000;
  while (Date.now() < finToque && r.ejercicio?.fase !== "cerrada") {
    await pausa(100);
    r = await leer(page);
  }
  await pausa(300);
  r = await leer(page);
  comprobar(
    "toca con el morro en la pista y se cuenta",
    r.ejercicio.cierre === "derecho",
    `${r.ejercicio.cierre}, al tocar morro ${r.ejercicio.alTocar?.morro.toFixed(1)}° y ala ${r.ejercicio.alTocar?.ala.toFixed(1)}° al viento; tarjeta ${r.tarjeta}, «${r.texto.slice(0, 70)}»`,
  );
  await foto("04-tocado");
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));

  /*
   * **La lámina**: los dibujos de la tarjeta y la ficha del hangar, puestos
   * encima de la página con las clases de verdad, para mirarlos de cerca.
   */
  const hangar = readFileSync("src/ui/hangar.ts", "utf8");
  const avion = /const AVION = \(t: string\): string =>\s*`([\s\S]*?)`;/.exec(hangar)?.[1] ?? "";
  const fichaDe = (nombre) =>
    (new RegExp(`const ${nombre} = escena\\(\`([\\s\\S]*?)\`\\);`).exec(hangar)?.[1] ?? "").replace(
      /\$\{AVION\("([^"]*)"\)\}/g,
      (_, t) => avion.replace("${t}", t),
    );
  await page.evaluate(
    async (fichas) => {
      const { DIBUJOS } = await import("/src/ui/senal.ts");
      const caja = document.createElement("div");
      caja.style.cssText =
        "position:fixed;inset:0;z-index:99999;background:#1a2420;display:flex;flex-wrap:wrap;gap:24px;padding:24px;align-items:center;color:#f2f1ec";
      for (const n of [
        "cangrejo-viento-izquierda",
        "cangrejo-viento-derecha",
        "cangrejo-enderezado-izquierda",
        "ala-baja-viento-izquierda",
        "ala-baja-viento-derecha",
        "pie-derecho",
      ]) {
        const d = document.createElement("div");
        d.style.cssText = "width:130px;height:130px;fill:currentColor";
        d.innerHTML = DIBUJOS[n].replace("<svg ", '<svg width="130" height="130" ');
        caja.append(d);
      }
      for (const ficha of fichas) {
        const f = document.createElement("div");
        f.className = "ficha ficha--leccion ficha--ejercicio";
        f.style.cssText = "width:360px";
        f.innerHTML = `<span class="ficha__lienzo ficha__lienzo--panel"><svg class="ficha__panel" viewBox="0 0 120 84" width="360" height="252">
        <rect class="panel__cielo" x="0" y="0" width="120" height="46" rx="3" />
        <rect class="panel__tierra" x="0" y="42" width="120" height="42" rx="3" />${ficha}</svg></span>`;
        caja.append(f);
      }
      document.body.append(caja);
    },
    [fichaDe("EJ_CANGREJO"), fichaDe("EJ_ALA_BAJA")],
  );
  await pausa(300);
  await foto("05-lamina");
  await contexto.close();
} catch (e) {
  console.error(e);
  codigo = 1;
} finally {
  await navegador.close();
  await server.close();
}
const mal = resultados.filter((x) => !x.ok).length;
console.log(`\n${resultados.length - mal}/${resultados.length} bien`);
process.exit(mal || codigo ? 1 : 0);
