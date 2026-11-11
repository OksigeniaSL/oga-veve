/**
 * **El remolque de quien juega, mirado** (ADR 0025, segunda mitad): el JAZ 90 en
 * Los Rodeos, saliendo de un puesto de contacto, en el peldaño de los dibujos y en
 * el de cabina.
 *
 * Mira, con el dedo y no por dentro:
 *
 * 1. Que empieza en un puesto de contacto con el morro al edificio, con la baliza
 *    apagada y la tarjeta que la pide puesta y tocable, y su botón ofreciéndose; y que
 *    si no se toca nada no pasa nada: sigue enganchado, sin moverse, con la misma
 *    tarjeta. Y que la llave, sin baliza, no lo saca: el tractor no empuja sin ella.
 * 2. Que la baliza se enciende —tocando la tarjeta en Guyrami, con su botón en el de
 *    cabina— y sale la tarjeta del tractor; que la coma del teclado la apaga y la
 *    enciende; y que tocar la tarjeta del tractor pide el empuje: al rato el
 *    tractor empuja, hacia atrás, sin motores; y vuelve la tarjeta de la llave.
 * 3. Los motores: en Guyrami se arrancan empujando, tocando la tarjeta; en el de
 *    cabina se dejan para el final, y el tractor espera enganchado y con el freno
 *    puesto hasta que se arrancan con la tecla.
 * 4. El pasador y el saludo, con su tarjeta, y que al quedar libre se rueda hacia
 *    delante hacia la raya.
 * 5. La radio de tierra: en el de cabina, la autorización de la ruta y el permiso de la
 *    torre al pedir el tractor, y las tres frases de la persona de tierra, todo en su
 *    orden y cada frase a la vista en la tira; en Guyrami, nada de eso.
 *
 * Uso: `node scripts/ver-remolque-de-quien-juega.mjs carpeta`. Con `OGA_GPU=1`, con
 * la tarjeta de verdad; con `OGA_PRISA`, el reloj del juego más deprisa; con
 * `OGA_PUERTO`, el puerto de vite.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const FOTOS = process.argv[2] ?? process.env.OGA_FOTOS;
if (!FOTOS) {
  console.error("  uso: node scripts/ver-remolque-de-quien-juega.mjs carpeta");
  process.exit(2);
}
mkdirSync(FOTOS, { recursive: true });
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5601);
const PRISA = process.env.OGA_PRISA ? Number(process.env.OGA_PRISA) : null;
const ESCENARIO = process.env.OGA_ESCENARIO ?? "tenerife-norte";
const AVION = process.env.OGA_AVION ?? "jaz-90";

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

const fallos = [];
const f = (v, d = 1) => (typeof v === "number" ? v.toFixed(d) : String(v));

/** Espera a que se cumpla algo en la página, mirando cada medio segundo; `null` si no llega. */
async function esperar(page, fn, arg, segundos) {
  try {
    await page.waitForFunction(fn, arg, { timeout: segundos * 1000, polling: 500 });
    return true;
  } catch {
    return false;
  }
}

const remolque = (page) => page.evaluate(() => globalThis.__oga.inicio().remolque);
const tarjeta = (page) =>
  page.evaluate(() => {
    const b = document.querySelector('[data-hud="senal"]');
    return {
      ...globalThis.__oga.tarjeta(),
      tocable: !!b && !b.hidden && !b.disabled,
      texto: document.querySelector('[data-hud="senal-texto"]')?.textContent ?? "",
      tecla: document.querySelector('[data-hud="senal-tecla"]')?.textContent ?? "",
    };
  });

try {
  for (const tramo of ["guyrami", "taguato-ruvicha"]) {
    const t = (s) => `${tramo}: ${s}`;
    const page = await navegador.newPage({
      viewport: { width: 1280, height: 720 },
      hasTouch: true,
      locale: "es-PY",
    });
    page.on("pageerror", (e) => {
      console.log(t(`ERROR ${e.message}`));
      fallos.push(t(`error de página: ${e.message}`));
    });
    await page.addInitScript(() => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
      /*
       * Y lo que pasa por la tira de la radio, en orden: el permiso de la torre y lo que
       * dice la persona de tierra. Cada cincuenta milisegundos, que con prisa el freno y
       * el «desconecto» llegan casi juntos.
       */
      globalThis.__radios = [];
      setInterval(() => {
        const r = document.querySelector('[data-hud="radio"]');
        const x = r && !r.hidden ? (r.textContent ?? "").trim() : "";
        if (x && globalThis.__radios.at(-1) !== x) globalThis.__radios.push(x);
      }, 50);
    });
    await page.goto(`${BASE}/?escenario=${ESCENARIO}&hora=12&leccion=despegue&tramo=${tramo}&avion=${AVION}`);
    await page.bringToFront();
    await page.waitForFunction(() => globalThis.__oga?.aeronave?.().deVerdad === true, null, { timeout: 120000 });
    const renderer = await page.evaluate(() => {
      const c = document.createElement("canvas").getContext("webgl2");
      const ext = c?.getExtension("WEBGL_debug_renderer_info");
      return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "?";
    });
    console.log(t(`renderer ${renderer}`));

    // ── 1. En el puesto, enganchado ──
    if (!(await esperar(page, () => globalThis.__oga.inicio().remolque?.fase === "enganchado", null, 60))) {
      fallos.push(t("no sale enganchado a un tractor"));
      await page.screenshot({ path: `${FOTOS}/${tramo}-sin-remolque.png` });
      await page.close();
      continue;
    }
    // Lo que tarde el suelo en asentarse, que recoloca el avión y vuelve a enganchar.
    await page.waitForTimeout(6000);
    if (PRISA) await page.evaluate((v) => globalThis.__oga.acelerar(v), PRISA);
    const alEdificio = await page.evaluate(() => globalThis.__oga.inicio().alEdificio);
    const t0 = await tarjeta(page);
    const r0 = await remolque(page);
    console.log(
      t(`en el puesto: morro a ${f(alEdificio?.delMorro)} m del edificio, desviado ${f(alEdificio?.desviado, 0)}° · tarjeta ${t0.dibujo} «${t0.texto}» tecla ${t0.tecla} tocable ${t0.tocable} · empuje ${f(r0.medida?.largo, 0)} m, giro ${f(r0.medida?.giro, 0)}°`),
    );
    if (!alEdificio || alEdificio.delMorro > 50 || Math.abs(alEdificio.desviado) > 50)
      fallos.push(t(`no empieza con el morro al edificio (${JSON.stringify(alEdificio)})`));
    if (t0.dibujo !== "baliza" || !t0.tocable) fallos.push(t(`la tarjeta del puesto no es la de la baliza tocable (${t0.dibujo}, ${t0.tocable})`));
    if (r0.baliza) fallos.push(t("en el puesto ya está la baliza encendida"));
    const boton0 = await page.evaluate(() => {
      const b = document.querySelector('[data-hud="baliza-mando"]');
      return { visible: !!b && !b.hidden && b.getBoundingClientRect().width > 0, pulsado: b?.getAttribute("aria-pressed"), ofrecido: !!b?.classList.contains("baliza-mando--propuesto") };
    });
    console.log(t(`botón de la baliza: ${JSON.stringify(boton0)}`));
    if (!boton0.visible || boton0.pulsado !== "false" || !boton0.ofrecido) fallos.push(t(`el botón de la baliza no está, o no se ofrece (${JSON.stringify(boton0)})`));
    await page.screenshot({ path: `${FOTOS}/${tramo}-1-en-el-puesto.png` });

    // Quieto, sin tocar nada: no pasa nada, ni se castiga. Sigue enganchado y con su tarjeta.
    const p0 = await page.evaluate(() => ({ ...globalThis.__oga.estado().position }));
    await page.waitForTimeout(PRISA ? 2500 : 15000);
    const quieto = await page.evaluate((p) => {
      const q = globalThis.__oga.estado().position;
      return { movido: Math.hypot(q.x - p.x, q.z - p.z), fase: globalThis.__oga.inicio().remolque?.fase, dibujo: globalThis.__oga.tarjeta().dibujo };
    }, p0);
    console.log(t(`sin tocar nada: se movió ${f(quieto.movido, 2)} m, ${quieto.fase}, tarjeta ${quieto.dibujo}`));
    if (quieto.movido > 0.2 || quieto.fase !== "enganchado" || quieto.dibujo !== "baliza")
      fallos.push(t(`sin tocar nada cambió algo (${JSON.stringify(quieto)})`));

    // La llave sin baliza: no pide el empuje. El tractor no empuja un avión con la baliza apagada.
    await page.keyboard.press("KeyI");
    await page.waitForTimeout(PRISA ? 2500 : 6000);
    const sinBaliza = await remolque(page);
    const tSin = await tarjeta(page);
    console.log(t(`la llave sin baliza: ${sinBaliza.fase}, baliza ${sinBaliza.baliza}, tarjeta ${tSin.dibujo}`));
    if (sinBaliza.fase !== "enganchado" || sinBaliza.baliza || tSin.dibujo !== "baliza")
      fallos.push(t(`la llave sin baliza cambió algo (${sinBaliza.fase}, ${sinBaliza.baliza}, ${tSin.dibujo})`));

    // ── 2. La baliza: con la tarjeta en Guyrami, con su botón en el de cabina ──
    if (tramo === "guyrami") await page.locator('[data-hud="senal"]').tap();
    else await page.locator('[data-hud="baliza-mando"]').tap();
    await page.waitForTimeout(600);
    const conBaliza = await remolque(page);
    const tCon = await tarjeta(page);
    const boton1 = await page.evaluate(() => {
      const b = document.querySelector('[data-hud="baliza-mando"]');
      return { pulsado: b?.getAttribute("aria-pressed"), ofrecido: !!b?.classList.contains("baliza-mando--propuesto") };
    });
    console.log(t(`baliza encendida: ${conBaliza.baliza}, ${conBaliza.fase}, tarjeta ${tCon.dibujo} «${tCon.texto}» tocable ${tCon.tocable} · botón ${JSON.stringify(boton1)}`));
    if (!conBaliza.baliza) fallos.push(t("tocar la baliza no la enciende"));
    if (conBaliza.fase !== "enganchado") fallos.push(t(`encender la baliza ya movió el tractor (${conBaliza.fase})`));
    if (tCon.dibujo !== "remolque" || !tCon.tocable) fallos.push(t(`con la baliza, la tarjeta no es la del tractor tocable (${tCon.dibujo}, ${tCon.tocable})`));
    if (boton1.pulsado !== "true" || boton1.ofrecido) fallos.push(t(`el botón no dice que está encendida (${JSON.stringify(boton1)})`));
    await page.screenshot({ path: `${FOTOS}/${tramo}-1b-con-la-baliza.png` });

    // La coma del teclado la apaga y la vuelve a encender: salió publicada sin hacer nada.
    await page.keyboard.press("Comma");
    await page.waitForTimeout(400);
    const conComa = await remolque(page);
    const tComa = await tarjeta(page);
    await page.keyboard.press("Comma");
    await page.waitForTimeout(400);
    const otraComa = await remolque(page);
    const tOtra = await tarjeta(page);
    console.log(t(`la coma: ${conComa.baliza} (tarjeta ${tComa.dibujo}) y otra vez ${otraComa.baliza} (tarjeta ${tOtra.dibujo})`));
    if (conComa.baliza || tComa.dibujo !== "baliza" || !otraComa.baliza || tOtra.dibujo !== "remolque")
      fallos.push(t(`la coma no mueve la baliza (${conComa.baliza}, ${tComa.dibujo}, ${otraComa.baliza}, ${tOtra.dibujo})`));

    // ── 2b. Se pide con el dedo ──
    await page.locator('[data-hud="senal"]').tap();
    await page.waitForTimeout(300);
    const pedido = await remolque(page);
    console.log(t(`tocado: baliza ${pedido.baliza}, ${pedido.fase}`));
    if (!pedido.baliza) fallos.push(t("al pedir el empuje se apagó la baliza"));
    if (!(await esperar(page, () => globalThis.__oga.inicio().remolque?.fase === "empujando", null, 20)))
      fallos.push(t("el tractor no echa a andar"));
    await page.waitForTimeout(PRISA ? 600 : 5000);
    const t1 = await tarjeta(page);
    console.log(t(`empujando: tarjeta ${t1.dibujo} «${t1.texto}» tocable ${t1.tocable} · motor ${await page.evaluate(() => globalThis.__oga.controles().engineOn)}`));
    if (t1.dibujo !== "llave" || !t1.tocable) fallos.push(t(`empujando, la tarjeta no es la llave tocable (${t1.dibujo})`));
    await page.screenshot({ path: `${FOTOS}/${tramo}-2-empujando.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${FOTOS}/${tramo}-2-empujando-cabina.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));

    // ── 3. Los motores ──
    if (tramo === "guyrami") {
      // Empujando, con el dedo en la tarjeta de la llave.
      await page.locator('[data-hud="senal"]').tap();
      await page.waitForTimeout(500);
      const motor = await page.evaluate(() => globalThis.__oga.controles().engineOn);
      console.log(t(`tocada la llave empujando: motor ${motor}`));
      if (!motor) fallos.push(t("la tarjeta de la llave no arranca empujando"));
    } else {
      // Al final: el tractor tiene que esperar, enganchado y frenado.
      if (!(await esperar(page, () => globalThis.__oga.inicio().remolque?.fase === "frenado", null, 180)))
        fallos.push(t("no acaba de empujar"));
      await page.waitForTimeout(PRISA ? 4000 : 25000);
      const espera = await remolque(page);
      console.log(t(`acabado sin motores: ${espera.fase}`));
      if (espera.fase !== "frenado") fallos.push(t(`sin motores el tractor no espera (${espera.fase})`));
      await page.keyboard.press("KeyI");
      await page.waitForTimeout(500);
      const motor = await page.evaluate(() => globalThis.__oga.controles().engineOn);
      console.log(t(`la tecla al final: motor ${motor}`));
      if (!motor) fallos.push(t("la tecla del motor no arranca al final del empuje"));
    }

    // ── 4. El pasador y el saludo ──
    if (!(await esperar(page, () => globalThis.__oga.inicio().remolque?.fase === "saludando", null, 240)))
      fallos.push(t("no llega al saludo"));
    else {
      await page.waitForTimeout(PRISA ? 300 : 1500);
      const t2 = await tarjeta(page);
      console.log(t(`saludando: tarjeta ${t2.dibujo}`));
      if (t2.dibujo !== "pasador") fallos.push(t(`la tarjeta del saludo no es el pasador (${t2.dibujo})`));
      await page.screenshot({ path: `${FOTOS}/${tramo}-3-saludo.png` });
      await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${FOTOS}/${tramo}-3-saludo-cabina.png` });
      await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    }
    if (!(await esperar(page, () => globalThis.__oga.inicio().remolque?.fase === "libre", null, 120)))
      fallos.push(t("no queda libre"));
    await page.waitForTimeout(800);
    const t3 = await tarjeta(page);
    console.log(t(`libre: tarjeta ${t3.dibujo} «${t3.texto}» · fase ${await page.evaluate(() => globalThis.__oga.fase())}`));
    if (t3.dibujo === "remolque" || t3.dibujo === "pasador") fallos.push(t("libre, sigue la tarjeta del remolque"));

    // Y a rodar, con un poco de gas: hacia delante, por la raya.
    await page.evaluate(() =>
      globalThis.__oga.pilotar((c) => {
        c.engineOn = true;
        c.brakes = 0;
        c.throttle = 0.3;
      }),
    );
    await page.waitForTimeout(PRISA ? 4000 : 25000);
    const fin = await remolque(page);
    const m = fin.medida;
    console.log(
      t(`fases ${m.fases.map((x) => x.fase).join(" → ")} · baliza al empujar ${m.balizaAlEmpujar} · motores empujando ${m.motorEmpujando}, al acabar ${m.motorAlAcabar}`),
    );
    console.log(
      t(`hacia delante a lo peor ${f(m.peorAdelante, 2)} · empujado ${f(m.empujado, 0)} de ${f(m.largo, 0)} m · giro ${f(m.giro, 0)}° r ${f(m.radio)} m · rumbo al acabar ${f(m.rumboAlAcabar, 0)}° · gira ${f(m.giroRodando30, 0)}° en los primeros 30 m rodando`),
    );
    console.log(
      t(`tractor a ${f(m.tractorFuera)} m de la punta del ala, persona a ${f(m.personaFuera)} m · al fuselaje: tractor ${f(m.tractorAlFuselaje)} persona ${f(m.personaAlFuselaje)} · tractor a la persona ${f(m.tractorALaPersona)} · dentro de un edificio ${m.dentroDeUnEdificio} fotogramas · pared ${f(m.paredAlEmpezar)} → ${f(m.paredAlAcabar)} m`),
    );
    if (!(m.peorAdelante < -0.9)) fallos.push(t(`empujando no va de culo (${m.peorAdelante})`));
    if (!m.balizaAlEmpujar) fallos.push(t("la baliza no estaba encendida al empujar"));
    if (tramo === "guyrami" && !m.motorEmpujando) fallos.push(t("en Guyrami los motores no arrancaron empujando"));
    if (tramo !== "guyrami" && m.motorEmpujando) fallos.push(t("en cabina los motores arrancaron empujando sin pedirlo"));
    if (!(m.tractorFuera > 0) || !(m.personaFuera > 0)) fallos.push(t("el tractor o la persona quedan bajo el ala"));
    if (m.dentroDeUnEdificio > 0) fallos.push(t("el tractor o la persona atraviesan un edificio"));
    if (!(m.paredAlAcabar > m.paredAlEmpezar)) fallos.push(t("la terminal no se aleja"));
    if (m.giroRodando30 === null) fallos.push(t("no rueda 30 m tras soltarse"));
    else if (Math.abs(m.giroRodando30) > 60) fallos.push(t(`al rodar gira ${m.giroRodando30}°: no salía mirando hacia la raya`));

    // ── 5. La radio de tierra: el permiso de la torre y la persona de tierra, en cabina ──
    const radios = await page.evaluate(() => globalThis.__radios);
    const deLaSalida = radios.filter((x) => /cleared to|pushback|Cabina, tierra|aparcamiento|Desconecto/.test(x));
    console.log(t(`la radio de la salida: ${deLaSalida.join(" | ") || "nada"}`));
    if (tramo === "guyrami") {
      if (deLaSalida.some((x) => !/cleared to/.test(x)))
        fallos.push(t("en Guyrami no habla la radio de tierra: lo cuenta la instructora"));
    } else {
      // La ruta primero, que es lo primero que se recibe en el puesto; y cada frase a la vista.
      const orden = [
        /cleared to/,
        /pushback and start-up approved/,
        /Cabina, tierra: empezamos a empujar/,
        /freno de aparcamiento/,
        /Desconecto\. Miren mi señal/,
      ].map((re) => deLaSalida.findIndex((x) => re.test(x)));
      if (orden.some((i) => i < 0)) fallos.push(t(`en cabina falta algo de la radio de tierra (${orden.join(", ")})`));
      else if (orden.some((i, n) => n > 0 && i < orden[n - 1])) fallos.push(t(`la radio de tierra, fuera de orden (${orden.join(", ")})`));
      if (deLaSalida.filter((x) => /pushback/.test(x)).length > 1) fallos.push(t("el permiso de la torre se dijo más de una vez"));
    }
    await page.screenshot({ path: `${FOTOS}/${tramo}-4-rodando.png` });
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

if (fallos.length) {
  console.log(`\n  ${fallos.length} fallos:`);
  for (const x of fallos) console.log(`   - ${x}`);
  process.exit(1);
}
console.log("\n  todo en orden");
