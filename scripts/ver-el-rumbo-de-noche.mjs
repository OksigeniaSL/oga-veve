/**
 * **«Rumbo de noche», volado en el juego** (#51, ADR 0031, enmienda H26o):
 * Asunción, la avioneta y el río Paraguay, con el sol de hoy recién puesto.
 *
 *   node scripts/ver-el-rumbo-de-noche.mjs <carpeta>
 *
 * El piloto de banco hace lo que pide la instructora, con el automático de
 * rumbo como quien sostiene el avión:
 *
 * - con luz, sigue el río mirando por delante: el rumbo al punto del cauce a
 *   veinte segundos de vuelo, como quien lo mira por la ventana. Perseguía
 *   cada punto del cauce hasta trescientos metros, y eso es la avioneta: uno
 *   rápido vira más ancho, se pasa el punto y vuelve a buscarlo (H26u). Veinte
 *   y no menos porque el automático vira al error de rumbo entre diez
 *   segundos y entra en el viraje a cinco grados de ala por segundo: lo que
 *   se le pide lo hace con retraso;
 * - de noche, el rumbo pedido, el de la marca de la rosa;
 * - con `OGA_SE_VA=1`, a los veinte segundos de noche se le va el morro
 *   quince grados a la derecha un rato, y vuelve. Volver al rumbo no es
 *   volver a la recta: se sigue paralelo a ella, apartado lo que llevó la
 *   ida, y se puede pasar al lado. Es lo de verdad, y el ejercicio lo cuenta
 *   sin castigar (H26u).
 *
 * Mira que el cielo sea el de la hora del ejercicio, que la noche caiga en el
 * puente con el sol a seis grados bajo el horizonte, que se encienda la
 * ciudad, que la marca de la rosa se vaya al rumbo pedido y que se llegue
 * encima de donde el río sigue; y lo de H26f: nada que no sea del ejercicio.
 * Capturas desde fuera y desde la cabina, antes y después de anochecer. El
 * puerto, `OGA_PUERTO`; el peldaño, `OGA_TRAMO` (Taguató, con su número); el
 * reloj, por `OGA_VECES` (cuatro); con `OGA_GPU=1`, con la tarjeta de verdad;
 * el avión, `OGA_AVION` (el JAZ 20).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, readFileSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import { vigilarLoAjeno } from "./lo-ajeno-al-ejercicio.mjs";

const SALIDA = process.argv[2] ?? "capturas-rumbo-de-noche";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const TRAMO = process.env.OGA_TRAMO ?? "taguato";
const VECES = Number(process.env.OGA_VECES ?? 4);
const SE_VA = process.env.OGA_SE_VA === "1";
const CON_GPU = process.env.OGA_GPU === "1";
const NOMBRE = `pettirossi-${AVION}${SE_VA ? "-se-va" : ""}-${TRAMO}`;

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

const centrado = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
const GRADO = Math.PI / 180;

/** Lo andado por el río y lo apartado de él, m: lo mismo que `avanceSobreElCauce`. */
const sobreElCauce = (cauce, x, z) => {
  let lejos = Infinity;
  let avance = 0;
  let antes = 0;
  for (let i = 1; i < cauce.length; i++) {
    const a = cauce[i - 1];
    const b = cauce[i];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (l * l)));
    const d = Math.hypot(a.x + dx * t - x, a.z + dz * t - z);
    if (d < lejos) {
      lejos = d;
      avance = antes + t * l;
    }
    antes += l;
  }
  return { avance, lejos };
};

/** El punto del cauce a `s` metros de su principio; pasado el final, el final. */
const puntoDelCauce = (cauce, s) => {
  let resta = s;
  for (let i = 1; i < cauce.length; i++) {
    const a = cauce[i - 1];
    const b = cauce[i];
    const l = Math.hypot(b.x - a.x, b.z - a.z);
    if (resta <= l) return { x: a.x + ((b.x - a.x) * resta) / l, z: a.z + ((b.z - a.z) * resta) / l };
    resta -= l;
  }
  return cauce[cauce.length - 1];
};

const leerSolo = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    return {
      x: s.position.x,
      z: s.position.z,
      y: s.position.y,
      rumbo: s.heading,
      suelo: Math.hypot(s.velocity.x, s.velocity.z),
      ejercicio: o.rumboDeNoche(),
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      textoDeLaTarjeta: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      reloj: j.clock?.elapsedTime ?? 0,
      pista: j.terrain?.runwayElevation ?? 0,
    };
  });

const ajeno = vigilarLoAjeno();
/** Lo dicho en la última lectura con el ejercicio abierto: lo de después ya es un vuelo (H26g). */
let dichoMientras = null;
const leer = async (page) => {
  const r = await leerSolo(page);
  const abierto = r.ejercicio && r.ejercicio.fase !== "cerrada";
  await ajeno.mirar(page, abierto);
  if (abierto) dichoMientras = await page.evaluate(() => globalThis.__oga.dichoTodo());
  return r;
};

const rumboAlAutomatico = (page, rumbo) =>
  page.evaluate((r) => {
    const j = globalThis.__oga.juegoParaTrazas();
    if (j.objetivos) j.objetivos.rumbo = r;
  }, rumbo);

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?escenario=pettirossi&tramo=${TRAMO}&avion=${AVION}&ejercicio=rumbo`);
  await page.waitForFunction(() => globalThis.__oga?.rumboDeNoche?.()?.colocacion != null, null, { timeout: 120000 });
  await pausa(3000);
  const { cauce, anochece, variacion } = await page.evaluate(async () => {
    const { RIOS_DE_NOCHE } = await import("/src/flight/rumbo-de-noche.ts");
    const { SCENARIOS } = await import("/src/world/scenarios.ts");
    const esc = SCENARIOS.find((s) => s.id === "pettirossi");
    return { ...RIOS_DE_NOCHE.SGAS, variacion: esc?.magneticVariation ?? 0 };
  });
  const puente = cauce[anochece];
  const vista = (v) => page.evaluate((v) => globalThis.__oga.ponerVista(v), v);
  await vista("chase");
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
  const c = r.ejercicio.colocacion;
  /*
   * Encima del cauce, al principio de él. Se medía del primer punto, y la
   * lectura llega tres segundos largos después de salir: a doscientos
   * cincuenta nudos son cuatrocientos metros río abajo, y el JAZ 90 salía
   * «a 401 m del cauce» yendo encima de él (H26u).
   */
  const alSalir = sobreElCauce(cauce, r.x, r.z);
  comprobar(
    "empieza en el aire, encima del cauce y por él",
    alSalir.lejos < 400 && alSalir.avance < 1000 && r.y - r.pista > 400 && Math.abs(centrado(r.rumbo / GRADO - 157)) < 5,
    `${Math.round(alSalir.lejos)} m del cauce, ${Math.round(alSalir.avance)} m río abajo, ${Math.round(r.y - r.pista)} m sobre la pista, rumbo ${((r.rumbo / GRADO + 360) % 360).toFixed(0)}`,
  );
  comprobar(
    "el cielo, a la hora del ejercicio, con el sol recién puesto",
    Math.abs(r.ejercicio.horaDelCielo - r.ejercicio.hora) < 0.02 && r.ejercicio.sol < 0 && r.ejercicio.sol > -6 && Math.abs(r.ejercicio.sol - c.solDeSalida) < 0.5,
    `hora solar ${r.ejercicio.horaDelCielo.toFixed(3)} (ejercicio ${r.ejercicio.hora.toFixed(3)}), sol ${r.ejercicio.sol.toFixed(2)}° (salida ${c.solDeSalida.toFixed(2)}°)`,
  );
  comprobar("la tarjeta dibuja el río con el sol", r.tarjeta === "rumbo-rio", `${r.tarjeta}, «${r.textoDeLaTarjeta.slice(0, 80)}»`);
  await foto("01-con-luz");
  await vista("cockpit");
  await pausa(600);
  await foto("02-con-luz-cabina");
  await vista("chase");

  await page.evaluate(() => globalThis.__oga.pilotoAutomatico(true));
  await rumboAlAutomatico(page, r.rumbo);
  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);

  // Con luz: el río, mirando por delante.
  const fin1 = Date.now() + 4 * 60000;
  let fotoAMitad = false;
  while (Date.now() < fin1 && r.ejercicio.fase === "rio") {
    const p = puntoDelCauce(cauce, sobreElCauce(cauce, r.x, r.z).avance + Math.max(400, 20 * r.suelo));
    await rumboAlAutomatico(page, Math.atan2(p.x - r.x, -(p.z - r.z)));
    if (!fotoAMitad && r.ejercicio.sol < -5) {
      fotoAMitad = true;
      await foto("03-anocheciendo");
    }
    await pausa(150);
    r = await leer(page);
  }
  const lejosDelPuente = Math.hypot(r.x - puente.x, r.z - puente.z);
  comprobar(
    "la noche cae en el puente, con el sol a seis grados bajo el horizonte",
    r.ejercicio.fase === "rumbo" && lejosDelPuente < 700 && r.ejercicio.solCuandoAnochecio <= -6 && r.ejercicio.solCuandoAnochecio > -6.3,
    `${Math.round(lejosDelPuente)} m del puente, sol ${r.ejercicio.solCuandoAnochecio?.toFixed(2)}°`,
  );
  /*
   * El rumbo se pide desde donde se está, de cinco en cinco y en magnético; y
   * con la noche en el puente es el del río que sigue, el 225 de la rosa.
   */
  const desde = r.ejercicio.dondeAnochecio;
  const alDestino = desde ? Math.atan2(r.ejercicio.destino.x - desde.x, -(r.ejercicio.destino.z - desde.z)) / GRADO : NaN;
  const debia = ((Math.round((((alDestino + variacion) % 360) + 360) % 360 / 5) * 5) % 360) || 360;
  comprobar(
    "pide el rumbo del río que sigue, en magnético",
    r.ejercicio.rumboPedido === debia && Math.abs(centrado(r.ejercicio.rumboPedido - 225)) <= 5,
    `rumbo ${r.ejercicio.rumboPedido} (de donde anocheció, ${debia}; del puente, 225)`,
  );
  comprobar("y se encienden las luces de la ciudad", r.ejercicio.lucesDeCiudad, String(r.ejercicio.lucesDeCiudad));
  comprobar("la tarjeta dibuja la rosa con la marca", r.tarjeta === "rumbo-en-la-marca", `${r.tarjeta}, «${r.textoDeLaTarjeta.slice(0, 90)}»`);
  if (TRAMO !== "tuka" && TRAMO !== "guyrami")
    comprobar(
      "desde Taguató, el rumbo escrito",
      new RegExp(`(Rumbo|Heading) ${String(r.ejercicio.rumboPedido).padStart(3, "0")}`).test(r.textoDeLaTarjeta),
      `«${r.textoDeLaTarjeta.slice(0, 60)}»`,
    );
  const pedidoVerdadero = (r.ejercicio.rumboPedido - variacion) * GRADO;
  comprobar(
    "la marca de la rosa, en el rumbo pedido",
    r.ejercicio.objetivo && Math.abs(centrado((r.ejercicio.objetivo.rumbo - pedidoVerdadero) / GRADO)) < 0.5,
    `${((r.ejercicio.objetivo?.rumbo ?? NaN) / GRADO).toFixed(1)}° verdaderos`,
  );
  await foto("04-anochece");
  await vista("cockpit");
  await pausa(600);
  await foto("05-anochece-cabina");
  await vista("chase");

  // De noche: el rumbo pedido, con una ida de la marca si se pide.
  const t0 = r.reloj;
  let vioSeVa = false;
  let fotoDeNoche = false;
  const fin2 = Date.now() + 5 * 60000;
  while (Date.now() < fin2 && r.ejercicio.fase !== "cerrada") {
    const t = (r.reloj - t0) * puestas;
    const fuera = SE_VA && t > 20 && t < 36 ? 15 : 0;
    await rumboAlAutomatico(page, pedidoVerdadero + fuera * GRADO);
    if (r.tarjeta === "rumbo-se-va-a-la-derecha") vioSeVa = true;
    if (!fotoDeNoche && t > 45) {
      fotoDeNoche = true;
      await foto("06-de-noche");
    }
    await pausa(150);
    r = await leer(page);
  }
  if (SE_VA) comprobar("se fue de la marca y lo dijo, con el avión a la derecha", vioSeVa, String(vioSeVa));
  /*
   * **Con `OGA_SE_VA`, encima o al lado** (H26u): quince grados dieciséis
   * segundos son doscientos cincuenta metros a la derecha con la avioneta, y
   * más con el viraje de ida y el de vuelta; con el rumbo de vuelta en la
   * marca se va paralelo a la recta, apartado eso. Lo que no se puede es no
   * llegar: el ejercicio se cierra hecho, y lo cuenta.
   */
  comprobar(
    SE_VA ? "llega encima de donde el río sigue, o al lado si se fue" : "llega encima de donde el río sigue",
    r.ejercicio.cierre === "hecho" && (r.ejercicio.llegada === "encima" || (SE_VA && r.ejercicio.llegada === "alLado")),
    `${r.ejercicio.cierre}, ${r.ejercicio.llegada}, a ${Math.round(r.ejercicio.apartado ?? NaN)} m`,
  );
  comprobar(
    "lo que se apartó el morro, medido",
    r.ejercicio.desvioMedio !== null && (SE_VA ? r.ejercicio.desvioMasGrande > 10 : r.ejercicio.desvioMedio < 3),
    `${r.ejercicio.desvioMedio?.toFixed(1)}° de media, ${r.ejercicio.desvioMasGrande.toFixed(1)}° como mucho`,
  );
  comprobar("ya es de noche para el suelo", r.ejercicio.sol < -8, `sol ${r.ejercicio.sol.toFixed(2)}°`);
  comprobar("la tarjeta dibuja el río entre las luces", r.tarjeta === "rumbo-llegaste", `${r.tarjeta}, «${r.textoDeLaTarjeta.slice(0, 90)}»`);
  await ajeno.comprobar(page, comprobar, /^rumbo-/, /^vuelo\.baches/, dichoMientras);
  const alCerrar = await page.evaluate(() => globalThis.__oga.dichoTodo());
  const despues = Object.entries(alCerrar).flatMap(([quien, claves]) =>
    claves.slice(dichoMientras?.[quien]?.length ?? 0).map((c) => `${quien}: ${c}`),
  );
  console.log(`    dicho al cerrar, ya en vuelo: ${despues.join(", ") || "nada"}`);
  await foto("07-encima");
  await vista("cockpit");
  await pausa(600);
  await foto("08-encima-cabina");
  await vista("chase");
  await pausa(4000);
  await foto("09-final");
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));

  /*
   * **La lámina**: los dibujos de la tarjeta y la ficha del hangar, puestos
   * encima de la página con las clases de verdad, para mirarlos de cerca.
   */
  const hangar = readFileSync("src/ui/hangar.ts", "utf8");
  const avion = /const AVION = \(t: string\): string =>\s*`([\s\S]*?)`;/.exec(hangar)?.[1] ?? "";
  const ficha = (/const EJ_RUMBO = escena\(`([\s\S]*?)`\);/.exec(hangar)?.[1] ?? "").replace(
    /\$\{AVION\("([^"]*)"\)\}/g,
    (_, t) => avion.replace("${t}", t),
  );
  await page.evaluate(async (ficha) => {
    const { DIBUJOS } = await import("/src/ui/senal.ts");
    const caja = document.createElement("div");
    caja.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:#1a2420;display:flex;flex-wrap:wrap;gap:24px;padding:24px;align-items:center;color:#f2f1ec";
    for (const n of ["rumbo-rio", "rumbo-en-la-marca", "rumbo-se-va-a-la-derecha", "rumbo-se-va-a-la-izquierda", "rumbo-llegaste"]) {
      const d = document.createElement("div");
      d.style.cssText = "width:160px;height:160px;fill:currentColor";
      d.innerHTML = DIBUJOS[n].replace("<svg ", '<svg width="160" height="160" ');
      caja.append(d);
    }
    const f = document.createElement("div");
    f.className = "ficha ficha--leccion ficha--ejercicio";
    f.style.cssText = "width:360px";
    f.innerHTML = `<span class="ficha__lienzo ficha__lienzo--panel"><svg class="ficha__panel" viewBox="0 0 120 84" width="360" height="252">
      <rect class="panel__cielo" x="0" y="0" width="120" height="46" rx="3" />
      <rect class="panel__tierra" x="0" y="42" width="120" height="42" rx="3" />${ficha}</svg></span>`;
    caja.append(f);
    document.body.append(caja);
  }, ficha);
  await pausa(300);
  await foto("10-lamina");
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
