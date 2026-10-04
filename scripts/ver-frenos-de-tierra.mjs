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
 * - **Cuántos píxeles de alto ocupa en pantalla** cada panel desde la cámara
 *   de seguir, y a qué distancia y altura va ella. Un panel levantado se ve
 *   desde atrás de canto: lo que asoma es su cara de abajo, de la cuerda por
 *   el seno de lo que su ángulo le saca a la cámara.
 * - Y una captura de cada vista: la de seguir y las del pasaje.
 *
 * **Y tocando, que es cuando se miran.** Después de lo del puesto, se pone el
 * avión en final con los flaps abajo —captura desde el asiento de encima del
 * ala— y luego en la pista, a la velocidad de toma, con la palanca armada y el
 * gas al ralentí: los frenos de tierra salen solos, como en un aterrizaje. Se
 * mide lo mismo desde la de seguir y desde las ventanillas de encima del ala
 * —cuántos paneles se ven **por el cristal**—, y **cómo se mueve la cámara**
 * al tocar y al despegar: lo más que salta de un fotograma al siguiente, que
 * es lo que dice si se acerca con suavidad o de un tirón.
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
const VISTAS = [
  "chase",
  "pasaje-izquierda",
  "pasaje-derecha",
  "pasaje-ala-izquierda",
  "pasaje-ala-derecha",
];
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
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * **Lo que ocupa cada panel en pantalla** desde la cámara de ahora: su alto en
 * píxeles y, en el pasaje, si se ve por el cristal. `lado` es el ala que se
 * mide.
 */
const medirPaneles = (page, lado) =>
  page.evaluate(
    ({ alto, lado }) => {
      const o = globalThis.__oga;
      const g = o.aeronave().grupo;
      g.updateWorldMatrix(true, true);
      const camara = o.camaraViva();
      camara.updateMatrixWorld();
      const V = camara.position.constructor;
      const paneles = [];
      const patron = new RegExp(`^aerofreno-\\d+-${lado}-tapas$`);
      g.traverse((m) => {
        if (!patron.test(m.name)) return;
        const pos = m.geometry.attributes.position;
        const v = new V();
        const centro = new V();
        let arriba = -Infinity;
        let abajo = Infinity;
        let delante = true;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
          centro.add(v);
          const p = o.enElCuadro(v.x, v.y, v.z);
          delante &&= p.delante;
          arriba = Math.max(arriba, p.y);
          abajo = Math.min(abajo, p.y);
        }
        centro.divideScalar(Math.max(1, pos.count));
        const enCuadro = o.enElCuadro(centro.x, centro.y, centro.z);
        const cristal = o.porLaVentanilla(centro.x, centro.y, centro.z);
        paneles.push({
          n: m.name.split("-")[1],
          px: delante ? ((arriba - abajo) * alto) / 2 : 0,
          dentro: delante && Math.abs(enCuadro.x) < 1 && Math.abs(enCuadro.y) < 1,
          cristal,
        });
      });
      const d = camara.getWorldPosition(new V()).sub(g.getWorldPosition(new V()));
      const sube = (Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180) / Math.PI;
      return { paneles, lejos: d.length(), sube };
    },
    { alto: ALTO, lado },
  );

const describir = (m, pasaje) =>
  m.paneles
    .map(
      (p) =>
        `${p.n}: ${p.px.toFixed(1)} px` +
        (pasaje ? (p.cristal ? " (por el cristal)" : " (no se ve)") : ""),
    )
    .join(" · ");

/**
 * **Cómo se mueve la cámara** durante `ms`, respecto del avión: lo deprisa que
 * se mueve la cámara alrededor de él, en metros por segundo, y por dónde
 * empieza y acaba —detrás y arriba, en el marco del avión—.
 *
 * En metros por segundo y no por fotograma, y con los ejes del mundo: un
 * fotograma largo —una captura, el recolector de basura— hace saltar en metros
 * lo que va a su velocidad de siempre, y el avión que cabecea al tocar gira el
 * marco del avión sin que la cámara se mueva. Acercarse con su rampa son unos
 * veinte metros por segundo en el JAZ 120; un tirón, que el suavizado alcanza
 * en un séptimo de segundo, serían más de cien.
 */
async function seguirLaCamara(page, ms, mientras, ignorar = 0) {
  await page.evaluate(() => {
    const o = globalThis.__oga;
    const V = o.camaraViva().position.constructor;
    const Q = o.camaraViva().quaternion.constructor;
    const marcas = [];
    globalThis.__marcasDeCamara = marcas;
    globalThis.__siguiendo = true;
    const paso = () => {
      if (!globalThis.__siguiendo) return;
      const s = o.estado();
      const c = o.camaraViva();
      const dentro = new Q().copy(s.orientation).invert();
      const w = new V().copy(c.position).sub(s.position);
      const d = w.clone().applyQuaternion(dentro);
      marcas.push({
        t: performance.now(),
        x: d.x,
        y: d.y,
        z: d.z,
        wx: w.x,
        wy: w.y,
        wz: w.z,
        suelo: s.onGround,
      });
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
  await mientras();
  const restante = Math.max(0, ms);
  await pausa(restante);
  return page.evaluate((ignorar) => {
    globalThis.__siguiendo = false;
    const m = globalThis.__marcasDeCamara ?? [];
    /*
     * Por tramos de una décima de segundo y no de fotograma a fotograma: detrás
     * de un fotograma largo el navegador entrega dos seguidos casi en el mismo
     * milisegundo, y la cuenta de uno a otro daba velocidades de cien metros
     * por segundo donde no se movía nada.
     */
    let salto = 0;
    let cuando = 0;
    let j = 0;
    for (let i = 1; i < m.length; i++) {
      // Lo primero, si se pide, no cuenta: es la cámara alcanzando al avión
      // recién puesto en otro sitio, no la vista moviéndose sola.
      if ((m[i].t - m[0].t) / 1000 < ignorar) {
        j = i;
        continue;
      }
      while (j < i && m[i].t - m[j + 1].t >= 100) j++;
      const dt = (m[i].t - m[j].t) / 1000;
      if (dt < 0.08) continue;
      const v = Math.hypot(m[i].wx - m[j].wx, m[i].wy - m[j].wy, m[i].wz - m[j].wz) / dt;
      if (v > salto) {
        salto = v;
        cuando = (m[i].t - m[0].t) / 1000;
      }
    }
    const primero = m[0];
    const ultimo = m[m.length - 1];
    const cambio = m.findIndex((x, i) => i > 0 && x.suelo !== m[i - 1].suelo);
    return {
      fotogramas: m.length,
      salto,
      cuando,
      desde: primero && { y: primero.y, z: primero.z },
      hasta: ultimo && { y: ultimo.y, z: ultimo.z },
      cambioDeSuelo: cambio > 0 ? (m[cambio].t - m[0].t) / 1000 : null,
      // El fotograma más largo: si pasa de cincuenta milisegundos, el salto de
      // ese fotograma no es de la cámara sino de la página que se paró.
      fotogramaMasLargo: m.reduce((x, p, i) => (i ? Math.max(x, p.t - m[i - 1].t) : 0), 0),
    };
  }, ignorar);
}

/**
 * Sobre la pista, en el punto de visada, a la velocidad de toma, armado y con
 * el gas al ralentí: `alto` metros por encima, y el morro un poco abajo para
 * que toque solo. Con cero, ya en el suelo.
 */
const ponerEnLaToma = (page, alto = 0) =>
  page.evaluate((alto) => {
    const o = globalThis.__oga;
    const t = o.puntoDeFinal(-300);
    const tren = o.avion().tren;
    o.pedirTren(true);
    o.pedirFlaps(1);
    o.ponerPalancaDeAerofrenos("armada");
    const c = o.controles();
    c.throttle = 0;
    c.elevator = alto > 0 ? -0.15 : 0;
    o.colocar(t.x, o.sueloDeVuelo(t.x, t.z) + tren + 0.05 + alto, t.z, o.avion().aproximacion ?? 70, t.h);
  }, alto);

/** En final, a novecientos metros y cincuenta de alto, con todo abajo. */
const ponerEnFinal = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const f = o.puntoDeFinal(900);
    o.pedirTren(true);
    o.pedirFlaps(1);
    o.ponerPalancaDeAerofrenos("armada");
    o.controles().throttle = 0.5;
    o.colocar(f.x, f.suelo + 50, f.z, o.avion().aproximacion ?? 70, f.h);
  });

const lineaDeCamara = (c) =>
  `${c.fotogramas} fotogramas (el más largo, ${c.fotogramaMasLargo.toFixed(0)} ms), lo más deprisa ${c.salto.toFixed(1)} m/s a los ${c.cuando.toFixed(1)} s` +
  (c.cambioDeSuelo != null ? ` · cambia de suelo a los ${c.cambioDeSuelo.toFixed(1)} s` : "") +
  (c.desde && c.hasta
    ? ` · detrás ${c.desde.z.toFixed(0)} → ${c.hasta.z.toFixed(0)} m, arriba ${c.desde.y.toFixed(0)} → ${c.hasta.y.toFixed(0)} m`
    : "");

try {
  for (const id of PEDIDOS.length ? PEDIDOS : REACTORES) {
    const page = await navegador.newPage({ viewport: { width: 1280, height: ALTO } });
    page.on("pageerror", (e) => console.log(`  ${id} ERROR:`, e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=tenerife-norte&hora=12&tramo=guyrami&avion=${id}&meteo=&viento=000/00`,
    );
    await page.bringToFront();
    await page.waitForFunction(
      () => globalThis.__oga?.estado?.() && globalThis.__oga?.aeronave?.().deVerdad,
      null,
      { timeout: 120000 },
    );
    await page.waitForTimeout(3000);
    const tarjeta = await page.evaluate(() => {
      const gl = globalThis.__oga.pintor().getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
    });
    console.log(`\n  ${id} · ${tarjeta}`);

    // ── En el puesto, la palanca a mano ───────────────────────────────────
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
    console.log(`  en el puesto: palanca ${palanca.palanca}, frenos de tierra ${palanca.enTierra}`);
    console.log(`    paneles de la derecha · ${grados.join(" · ")}`);
    for (const vista of VISTAS) {
      const puesta = await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
      if (puesta !== vista) {
        console.log(`    (sin vista «${vista}» en este avión)`);
        continue;
      }
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${CARPETA}/${id}-puesto-${vista}.png` });
      const lado = vista.endsWith("izquierda") ? "izquierda" : "derecha";
      const m = await medirPaneles(page, lado);
      console.log(
        vista === "chase"
          ? `    desde la de seguir, a ${m.lejos.toFixed(0)} m y ${m.sube.toFixed(0)}° por encima · ${describir(m)} de alto`
          : `    desde «${vista}» · ${describir(m, true)}`,
      );
    }
    await page.evaluate(() => globalThis.__oga.ponerPalancaDeAerofrenos("recogida"));

    // ── En final, los flaps desde encima del ala ──────────────────────────
    const ala = (await page.evaluate(() => globalThis.__oga.ponerVista("pasaje-ala-izquierda"))) ===
      "pasaje-ala-izquierda";
    for (let i = 0; i < 4; i++) {
      await ponerEnFinal(page);
      await pausa(1000);
    }
    await page.waitForTimeout(1500);
    if (ala) await page.screenshot({ path: `${CARPETA}/${id}-final-pasaje-ala-izquierda.png` });
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    for (let i = 0; i < 3; i++) {
      await ponerEnFinal(page);
      await pausa(1000);
    }
    await page.screenshot({ path: `${CARPETA}/${id}-final-chase.png` });

    // ── La toma, desde la de seguir ───────────────────────────────────────
    // Primero sin capturas, que una captura para la página y el fotograma de
    // después salta lo que no ha saltado: solo cómo se mueve la cámara.
    const tocar = async () => {
      await ponerEnLaToma(page, 4);
      // En cuanto toca, el morro suelto.
      await page
        .waitForFunction(() => globalThis.__oga.estado().onGround, null, { timeout: 15000 })
        .catch(() => {});
      await page.evaluate(() => {
        globalThis.__oga.controles().elevator = 0;
      });
    };
    const toma = await seguirLaCamara(page, 5000, tocar, 1);
    // Y otra vez, con capturas.
    await ponerEnFinal(page);
    await pausa(2500);
    await tocar();
    await pausa(500);
    await page.screenshot({ path: `${CARPETA}/${id}-toma-chase-0.5s.png` });
    await pausa(4500);
    await page.screenshot({ path: `${CARPETA}/${id}-toma-chase-5s.png` });
    const enTierra = await page.evaluate(() => globalThis.__oga.aerofrenos());
    const m = await medirPaneles(page, "derecha");
    console.log(`  tocando: frenos de tierra ${enTierra.enTierra.toFixed(2)}, palanca ${enTierra.palanca}`);
    console.log(
      `    desde la de seguir, a ${m.lejos.toFixed(0)} m y ${m.sube.toFixed(0)}° por encima · ${describir(m)} de alto`,
    );
    console.log(`    la cámara al tocar: ${lineaDeCamara(toma)}`);

    // ── La toma, desde encima del ala ─────────────────────────────────────
    for (const vista of ["pasaje-ala-izquierda", "pasaje-ala-derecha"]) {
      if ((await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista)) !== vista) continue;
      await ponerEnFinal(page);
      await pausa(1500);
      await ponerEnLaToma(page);
      await pausa(400);
      await page.screenshot({ path: `${CARPETA}/${id}-toma-${vista}-0.4s.png` });
      await pausa(2100);
      await page.screenshot({ path: `${CARPETA}/${id}-toma-${vista}-2.5s.png` });
      const lado = vista.endsWith("izquierda") ? "izquierda" : "derecha";
      const mm = await medirPaneles(page, lado);
      console.log(`    desde «${vista}» tocando · ${describir(mm, true)}`);
    }

    // ── Y el despegue: la cámara se aleja sin tirones ─────────────────────
    // Rodando por la pista con la cámara ya cerca, el avión se sube quince
    // metros donde está, con gas a fondo: deja de tocar el suelo, y se mira
    // cómo se va la cámara pasado lo que tarda en alcanzar el salto.
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
    await ponerEnLaToma(page);
    await pausa(4000);
    const despegue = await seguirLaCamara(
      page,
      6000,
      async () => {
        await page.evaluate(() => {
          const o = globalThis.__oga;
          o.ponerPalancaDeAerofrenos("recogida");
          o.pedirFlaps(0.2);
          o.controles().throttle = 1;
          const s = o.estado();
          o.colocar(s.position.x, s.position.y + 15, s.position.z, 80, s.heading);
        });
      },
      0.7,
    );
    const alto = await page.evaluate(() => {
      const o = globalThis.__oga;
      const s = o.estado();
      return { suelo: s.onGround, sobre: s.position.y - o.sueloDeVuelo(s.position.x, s.position.z) };
    });
    console.log(
      `    la cámara al despegar: ${lineaDeCamara(despegue)} · ${alto.sobre.toFixed(0)} m sobre el suelo al final`,
    );
    await page.screenshot({ path: `${CARPETA}/${id}-despegue-chase.png` });
    await page.close();
  }
  console.log(`\n  capturas en ${CARPETA}/`);
} finally {
  await navegador.close();
  await server.close();
}
