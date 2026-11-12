/**
 * **La misión de Teno, volada entera**: `?avion=super-puma&mision=teno`, del
 * helipuerto del Ejército en Los Rodeos al faro de Teno y al puerto de
 * Garachico. Ver `TENO` en `src/content/missions.ts`.
 *
 * La vuela un piloto de banco como el de `ver-helicoptero.mjs`, en Guyrami, con
 * la estabilización de estacionario: el colectivo lleva la altura y el cíclico
 * pide la velocidad que lleva al sitio. Para no esperar quince minutos de
 * crucero, **salta** con `colocar` a unos kilómetros de cada sitio, en el aire;
 * los despegues y las tomas se vuelan de verdad. Y mira:
 *
 * - **Que cada objetivo se cumple en orden**, y nada antes de tiempo.
 * - **Que la aguja señala el objetivo**: Teno al salir de Los Rodeos y
 *   Garachico posado junto al faro, no el helipuerto de casa.
 * - **Que las frases se piden en su orden**, una por paso, y quien las dice.
 * - **Que los dos llanos lo son** en el relieve del juego: menos de 5° en un
 *   círculo de veinte metros, secos y sin edificios.
 * - **Que se posa sin percances**, suave, y que **el final llega**: el sonido
 *   de logro y el cierre.
 * - **Y que en el peldaño de cabina habla la tripulación** y la instructora
 *   calla: una vuelta corta, solo el principio.
 * - **La gente**: que espera junto al faro y se la ve al llegar; que sube
 *   entera, por delante y nunca por detrás de la cola, con la corredera
 *   abierta y el tripulante fuera, y que la puerta se cierra; y que en
 *   Garachico baja y se queda fuera del disco. Y lo que cuesta dibujarla:
 *   llamadas, triángulos y tiempo de cuadro posado en Teno, con y sin ella.
 *
 * Capturas con `OGA_FOTOS=<carpeta>`; `OGA_TELEFONO=1` las saca en un
 * teléfono apaisado de 844×390 con dedo, en vez de en 1280×800.
 *
 * Uso: `OGA_PUERTO=5602 OGA_FOTOS=fotos node scripts/ver-mision-teno.mjs`
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5602);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const TELEFONO = process.env.OGA_TELEFONO === "1";
const ANCHO = TELEFONO ? 844 : 1280;
const ALTO = TELEFONO ? 390 : 800;
const SUFIJO = TELEFONO ? "-telefono" : "";
const VIENTO = process.env.OGA_VIENTO ?? "000/0";

/** Los dos sitios de la misión, los mismos de `content/missions.ts`. */
const FARO = { x: -56863.6, z: 15668.9, radio: 20 };
const GARACHICO = { x: -40552.2, z: 12094.9, radio: 20 };
const GCXM = { x: -924.6, z: -101.7 };
/** Donde espera la gente, el de `GENTE_EN_TENO`, y cuántos son: doce y un perro. */
const GENTE = { x: -56830.6, z: 15654.4 };
const CUANTOS = 13;
/** Lo que hay que esquivar del Super Puma: disco, mástil al rotor de cola y la puerta, m. */
const ROTOR = 7.8;
const COLA = 9.375;
/**
 * El borde de atrás del hueco de la puerta, m por delante del mástil: la
 * corredera va de 0,87 m por delante a 0,56 por detrás (`PUERTA` en
 * `modelos/jaz-super-puma.py`). Quien está en el hueco no está por la cola.
 */
const PUERTA_ATRAS = -0.56;
/**
 * **A qué se llega**, m/s: los cuarenta nudos de aproximación del helicóptero
 * (`approachSpeed` en `helicoptero-en-el-juego.ts`). Más deprisa, bajo y hacia
 * los acantilados de Teno y de Garachico, el avisador de terreno avisa, y con
 * razón: así no se llega a posarse.
 */
const APROXIMACION = 20;

/** Las frases de la instructora, en el orden en que se cuentan. */
const ORDEN = ["presenta", "ir", "posarse", "suben", "porDelante", "despegar", "garachico", "bajan", "cierre"].map(
  (p) => `mission.teno.${p}`,
);

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false }, logLevel: "warn" });
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

/** Abre el juego con la misión en un peldaño. */
async function abrir(tramo) {
  const contexto = await navegador.newContext({
    viewport: { width: ANCHO, height: ALTO },
    locale: "es-PY",
    hasTouch: TELEFONO,
    isMobile: TELEFONO,
  });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?avion=super-puma&mision=teno&tramo=${tramo}&hora=12&meteo=&viento=${VIENTO}`);
  await page.waitForFunction(() => globalThis.__oga?.helicoptero?.() != null, null, { timeout: 120_000 });
  return { page, errores, contexto };
}

let codigo = 1;
try {
  const { page, errores, contexto } = await abrir("guyrami");
  const foto = async (nombre) => {
    if (!FOTOS) return;
    await page.screenshot({ path: `${FOTOS}/${nombre}${SUFIJO}.png` });
    console.log(`    foto: ${FOTOS}/${nombre}${SUFIJO}.png`);
  };
  const leer = () =>
    page.evaluate(() => {
      const o = globalThis.__oga;
      const s = o.estado();
      const m = o.mision();
      return {
        x: s.position.x,
        z: s.position.z,
        alto: s.heightAboveGround,
        vs: s.verticalSpeed,
        gs: s.groundSpeed,
        enTierra: s.onGround,
        toma: s.touchdownSinkRate,
        percance: o.percance(),
        mision: m,
        aguja: o.aguja(),
        senal: o.tarjeta()?.dibujo ?? null,
        rumbo: s.heading,
      };
    });
  const percances = new Set();
  const ahoras = [];
  /** Los avisos de bulto y de terreno, con dónde y cuándo: una misión tranquila no lleva ninguno. */
  const avisos = [];
  const leerApuntando = async () => {
    const r = await leer();
    if (r.percance) percances.add(String(r.percance));
    if ((r.senal === "edificio" || r.senal === "terreno") && avisos[avisos.length - 1]?.senal !== r.senal)
      avisos.push({ senal: r.senal, x: Math.round(r.x), z: Math.round(r.z), alto: Math.round(r.alto), paso: r.mision?.ahora });
    else if (r.senal !== "edificio" && r.senal !== "terreno" && avisos.length && avisos[avisos.length - 1].senal) avisos.push({ senal: null });
    const a = r.mision?.ahora ?? "fin";
    if (ahoras[ahoras.length - 1] !== a) ahoras.push(a);
    return r;
  };
  const esperar = async (cond, segundos, cada = 250) => {
    const hasta = Date.now() + segundos * 1000;
    let r = await leerApuntando();
    while (!cond(r) && Date.now() < hasta) {
      await pausa(cada);
      r = await leerApuntando();
    }
    return r;
  };
  /** Si la aguja señala (x, z): a la distancia que está y con el rumbo hacia él. */
  const senala = (r, sitio) => {
    if (!r.aguja) return { ok: false, detalle: "sin aguja" };
    const dx = sitio.x - r.x;
    const dz = sitio.z - r.z;
    const d = Math.hypot(dx, dz);
    let rel = Math.atan2(dx, -dz) - r.rumbo;
    while (rel > Math.PI) rel -= 2 * Math.PI;
    while (rel < -Math.PI) rel += 2 * Math.PI;
    const errRumbo = Math.abs(rel - r.aguja.relativo);
    return {
      ok: r.aguja.por === "objetivo" && Math.abs(r.aguja.metros - d) < 50 && errRumbo < 0.05,
      detalle: `por «${r.aguja.por}», ${(r.aguja.metros / 1000).toFixed(2)} km (el sitio a ${(d / 1000).toFixed(2)})`,
    };
  };
  /** Cómo va la gente, y dónde está cada uno en los ejes del helicóptero. */
  const leerGente = () =>
    page.evaluate(() => {
      const o = globalThis.__oga;
      const g = o.gente();
      const s = o.estado();
      const h = s.heading;
      const ejes = (q) => {
        const dx = q.x - s.position.x;
        const dz = q.z - s.position.z;
        return { f: dx * Math.sin(h) - dz * Math.cos(h), r: dx * Math.cos(h) + dz * Math.sin(h), estado: q.estado };
      };
      return { ...g, locales: g.sitios.map(ejes) };
    });
  /**
   * **Nadie por la cola**: mientras dura una espera, cada cuarto de segundo y
   * dentro de la página —para que no lo tapen las fotos ni las medidas del
   * banco—, nadie de los que andan dentro del estadio del helicóptero —el
   * disco más tres metros alrededor del segmento del mástil al rotor de cola—
   * por detrás del hueco de la puerta. `empezarAVigilar` lo pone en marcha y
   * `dejarDeVigilar` dice lo que vio.
   */
  const empezarAVigilar = () =>
    page.evaluate(
      ({ ROTOR, COLA, PUERTA_ATRAS }) => {
        const v = (globalThis.__cola = { malos: [], muestras: 0 });
        v.id = setInterval(() => {
          const o = globalThis.__oga;
          const s = o.estado();
          const h = s.heading;
          v.muestras++;
          for (const q of o.gente().sitios) {
            if (q.estado !== "andando") continue;
            const dx = q.x - s.position.x;
            const dz = q.z - s.position.z;
            const f = dx * Math.sin(h) - dz * Math.cos(h);
            const r = dx * Math.cos(h) + dz * Math.sin(h);
            const fc = Math.max(-COLA, Math.min(0, f));
            if (Math.hypot(f - fc, r) < ROTOR + 3 - 0.3 && f < PUERTA_ATRAS) v.malos.push(`f=${f.toFixed(1)} r=${r.toFixed(1)}`);
          }
        }, 250);
      },
      { ROTOR, COLA, PUERTA_ATRAS },
    );
  const dejarDeVigilar = () =>
    page.evaluate(() => {
      const v = globalThis.__cola;
      clearInterval(v.id);
      return { malos: v.malos, muestras: v.muestras };
    });
  /** Cuánto ha tardado la gente: de que empieza a que acaba, en segundos del juego. */
  const cuantoTardo = (r, que) => {
    const d = r.mision?.dicho ?? [];
    const empieza = d.filter((x) => x.quien === "gente" && x.que.startsWith(`empieza:${que}`)).pop();
    const acaba = d.filter((x) => x.quien === "gente" && x.que === "acaba" && empieza && x.cuando >= empieza.cuando)[0];
    return empieza && acaba ? (acaba.cuando - empieza.cuando).toFixed(1) : "?";
  };
  /**
   * **Lo que cuesta la gente**: llamadas de dibujo, triángulos y tiempo de
   * cuadro en ciento veinte cuadros, con ella y sin dibujarla.
   */
  const medirCoste = (apagada) =>
    page.evaluate(async (apagada) => {
      const o = globalThis.__oga;
      o.genteApagada(apagada);
      const cuadro = () => new Promise((r) => requestAnimationFrame(() => r(performance.now())));
      for (let i = 0; i < 10; i++) await cuadro();
      const tiempos = [];
      let llamadas = 0;
      let triangulos = 0;
      let antes = await cuadro();
      for (let i = 0; i < 120; i++) {
        const ahora = await cuadro();
        tiempos.push(ahora - antes);
        antes = ahora;
        const c = o.coste();
        llamadas += c.llamadas;
        triangulos += c.triangulos;
      }
      o.genteApagada(false);
      tiempos.sort((a, b) => a - b);
      return {
        llamadas: llamadas / 120,
        triangulos: Math.round(triangulos / 120),
        mediana: +tiempos[60].toFixed(2),
        p90: +tiempos[108].toFixed(2),
        cpuGente: o.gente().msPorPaso,
      };
    }, apagada);
  const conVista = async (vista, nombre) => {
    await page.evaluate((v) => globalThis.__oga.ponerVista(v), vista);
    await pausa(700);
    await foto(nombre);
    await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
  };

  /** La pendiente del suelo en un círculo de veinte metros, con agua, edificios y árboles. */
  const llano = (sitio) =>
    page.evaluate(({ x, z }) => {
      const o = globalThis.__oga;
      const pts = [];
      for (let dx = -20; dx <= 20; dx += 4)
        for (let dz = -20; dz <= 20; dz += 4)
          if (Math.hypot(dx, dz) <= 20) pts.push([dx, dz, o.sueloDeVuelo(x + dx, z + dz), o.suelo(x + dx, z + dz)]);
      let sxx = 0, szz = 0, sxh = 0, szh = 0;
      for (const [dx, dz, h] of pts) {
        sxx += dx * dx;
        szz += dz * dz;
        sxh += dx * h;
        szh += dz * h;
      }
      const pendiente = (Math.atan(Math.hypot(sxh / sxx, szh / szz)) * 180) / Math.PI;
      const agua = pts.filter(([, , h, t]) => h > t + 0.05).length;
      const bulto = o.bultoCerca(x, z);
      const juego = o.juegoParaTrazas();
      let arbol = Infinity;
      juego.vegetacion?.traverse((m) => {
        if (!m.isInstancedMesh) return;
        const a = m.instanceMatrix.array;
        for (let i = 0; i < m.count; i++) arbol = Math.min(arbol, Math.hypot(a[i * 16 + 12] - x, a[i * 16 + 14] - z));
      });
      return { pendiente, agua, cota: o.sueloDeVuelo(x, z), bulto: bulto ? bulto.d : Infinity, arbol };
    }, sitio);

  // ── El arranque ────────────────────────────────────────────────────────
  console.log("\nEn el helipuerto, con la misión puesta");
  await pausa(2500);
  await foto("1-arranque");
  // El suelo se asienta unos segundos después de abrir y recoloca la aeronave.
  await pausa(13_000);
  const inicio = await leerApuntando();
  comprobar(
    "la misión de Teno está puesta y empieza por despegar",
    inicio.mision?.id === "teno" && inicio.mision.ahora === "takeoff" && inicio.mision.total === 7,
    JSON.stringify({ id: inicio.mision?.id, ahora: inicio.mision?.ahora, total: inicio.mision?.total }),
  );
  comprobar(
    "la instructora la presenta al empezar",
    inicio.mision?.dicho.some((d) => d.que === "mission.teno.presenta" && d.quien === "instructora"),
    inicio.mision?.dicho.map((d) => d.que).join(", "),
  );
  const enCasa = senala(inicio, FARO);
  comprobar("posado en Los Rodeos, la aguja ya señala Teno y no el helipuerto", enCasa.ok, enCasa.detalle);
  comprobar(
    "empieza en el helipuerto",
    Math.hypot(inicio.x - GCXM.x, inicio.z - GCXM.z) < 5 && inicio.enTierra,
    `a ${Math.hypot(inicio.x - GCXM.x, inicio.z - GCXM.z).toFixed(1)} m`,
  );

  // ── El piloto de banco ──────────────────────────────────────────────────
  await page.evaluate(() => {
    const o = globalThis.__oga;
    const b = (globalThis.__banco = { fase: "quieto", alto: 40, integral: 0, antes: o.reloj(), destino: null });
    o.pilotar((c) => {
      const s = o.estado();
      const h = o.helicoptero();
      const ahora = o.reloj();
      const dt = Math.min(0.1, Math.max(0, ahora - b.antes));
      b.antes = ahora;
      c.elevator = 0;
      c.aileron = 0;
      c.rudder = 0;
      const colectivo = (ritmo) => {
        const falta = ritmo - s.verticalSpeed;
        b.integral = Math.max(-0.3, Math.min(0.3, b.integral + falta * dt * 0.05));
        c.throttle = Math.max(0, Math.min(1, h.estacionario + b.integral + 0.08 * falta));
      };
      const altura = (objetivo) => colectivo(Math.max(-2, Math.min(2, 0.5 * (objetivo - s.heightAboveGround))));
      /** El cíclico que lleva a (x, z), en ejes de la aeronave. Ver `ver-helicoptero.mjs`. */
      const ir = (x, z, tope) => {
        const dx = x - s.position.x;
        const dz = z - s.position.z;
        const r = h.actitud.rumbo;
        const adelante = dx * Math.sin(r) - dz * Math.cos(r);
        const derecha = dx * Math.cos(r) + dz * Math.sin(r);
        const quiere = (d, t) => Math.max(-t, Math.min(t, 0.25 * d));
        c.elevator = -quiere(adelante, tope) / 70;
        c.aileron = quiere(derecha, Math.min(tope, 8)) / 8;
        // Y el morro hacia donde se va, con los pedales, para ir de frente y no de lado.
        const quiereRumbo = Math.atan2(dx, -dz);
        let giro = quiereRumbo - r;
        while (giro > Math.PI) giro -= 2 * Math.PI;
        while (giro < -Math.PI) giro += 2 * Math.PI;
        if (Math.hypot(dx, dz) > 60) c.rudder = Math.max(-0.6, Math.min(0.6, giro * 1.2));
        return Math.hypot(dx, dz);
      };
      if (b.fase === "subir") {
        // Se sube la palanca poco a poco hasta que despega, y entonces manda el lazo.
        if (s.onGround && !b.despego) {
          b.gas = Math.min(1, (b.gas ?? 0) + 0.12 * dt);
          c.throttle = b.gas;
        } else {
          b.despego = true;
          altura(b.alto);
        }
      } else if (b.fase === "quieto") {
        if (s.onGround) c.throttle = 0;
        else altura(b.alto);
      } else if (b.fase === "ir") {
        altura(b.alto);
        b.lejos = ir(b.destino.x, b.destino.z, b.tope ?? 20);
      } else if (b.fase === "bajar") {
        b.lejos = ir(b.destino.x, b.destino.z, 1.5);
        colectivo(s.heightAboveGround > 6 ? -1.2 : -0.4);
        if (s.onGround) {
          b.fase = "posado";
          b.gas = c.throttle;
        }
      } else if (b.fase === "posado") {
        b.gas = Math.max(0, (b.gas ?? c.throttle) - 0.2 * dt);
        c.throttle = b.gas;
      }
    });
  });
  const fase = (f, extra = {}) =>
    page.evaluate(
      ({ f, extra }) => {
        const b = globalThis.__banco;
        Object.assign(b, extra);
        if (f === "subir") {
          b.despego = false;
          b.gas = 0;
          b.integral = 0;
        }
        b.fase = f;
      },
      { f, extra },
    );
  /** Salta a (x, z) a `alto` metros sobre el suelo, quieto y mirando hacia `hacia`. */
  const saltar = (x, z, alto, hacia) =>
    page.evaluate(
      ({ x, z, alto, hacia }) => {
        const o = globalThis.__oga;
        const rumbo = Math.atan2(hacia.x - x, -(hacia.z - z));
        o.colocar(x, o.sueloDeVuelo(x, z) + alto, z, 0, rumbo);
        globalThis.__banco.integral = 0;
      },
      { x, z, alto, hacia },
    );

  /**
   * Va a un sitio y se posa en él: a `alto` metros hasta tenerlo encima, y
   * luego abajo. Devuelve la lectura ya posado.
   */
  const irYPosarse = async (sitio, alto, alLlegar = null) => {
    await fase("ir", { destino: sitio, alto, tope: APROXIMACION });
    const encima = await esperar((r) => Math.hypot(r.x - sitio.x, r.z - sitio.z) < 4 && r.gs < 0.8, 240);
    if (alLlegar) await alLlegar();
    await fase("bajar");
    await esperar((r) => r.enTierra, 90);
    await pausa(2500);
    return { encima, posado: await leerApuntando() };
  };

  // ── Despegue de Los Rodeos ─────────────────────────────────────────────
  console.log("\nDespegue de Los Rodeos");
  await fase("subir", { alto: 40 });
  const despegado = await esperar((r) => r.mision?.ahora === "reach", 90);
  comprobar("despega y se cumple el primer objetivo", despegado.mision?.ahora === "reach", `a ${despegado.alto.toFixed(0)} m`);
  await pausa(1500);
  const haciaTeno = await leerApuntando();
  const aguja1 = senala(haciaTeno, FARO);
  comprobar("en el aire, la aguja señala Teno", aguja1.ok, aguja1.detalle);
  await foto("2-aguja-hacia-teno");

  // ── A Teno ─────────────────────────────────────────────────────────────
  console.log("\nA Teno, saltando el crucero");
  // Por el mar, al suroeste de la punta, para posarse de cara al alisio, que
  // sopla del nordeste, como dice la instructora: con la gente y el faro delante.
  await saltar(FARO.x - 1700, FARO.z + 1700, 120, FARO);
  await fase("ir", { destino: FARO, alto: 80, tope: APROXIMACION });
  const llegando = await esperar((r) => r.mision?.ahora === "land", 120);
  // Llegando, con la gente esperando delante, junto al faro.
  const cerca = await esperar((r) => Math.hypot(r.x - GENTE.x, r.z - GENTE.z) < 220, 60);
  const esperando = await leerGente();
  const junto = esperando.sitios.filter((q) => Math.hypot(q.x - GENTE.x, q.z - GENTE.z) < 6).length;
  comprobar(
    "la gente espera junto al faro desde que empieza la misión, y se ve al llegar",
    esperando.visible && esperando.fuera === CUANTOS && junto === CUANTOS,
    `${esperando.fuera} fuera, ${junto} en su sitio, ${esperando.visible ? "se ve" : "no se ve"}, a ${Math.hypot(cerca.x - GENTE.x, cerca.z - GENTE.z).toFixed(0)} m`,
  );
  await foto("g1-llegando-con-la-gente-esperando");
  const dondeEsperan = await page.evaluate(({ x, z }) => {
    const o = globalThis.__oga;
    const b = o.bultoCerca(x, z);
    // La pendiente entre los del corro: que estén de pie en algo que se pueda pisar.
    const cotas = o.gente().sitios.map((q) => o.sueloDeVuelo(q.x, q.z));
    const agua = o.gente().sitios.filter((q) => o.sueloDeVuelo(q.x, q.z) > o.suelo(q.x, q.z) + 0.05).length;
    return { bulto: b ? b.d : Infinity, desnivel: Math.max(...cotas) - Math.min(...cotas), agua };
  }, GENTE);
  comprobar(
    "donde espera la gente no hay edificios, ni agua, ni escalones",
    dondeEsperan.bulto > 4 && dondeEsperan.agua === 0 && dondeEsperan.desnivel < 2,
    `edificio a ${dondeEsperan.bulto} m, ${dondeEsperan.agua} en el agua, ${dondeEsperan.desnivel.toFixed(1)} m de desnivel en el corro`,
  );
  comprobar(
    "llega a Teno y toca posarse",
    llegando.mision?.ahora === "land",
    `a ${(Math.hypot(llegando.x - FARO.x, llegando.z - FARO.z) / 1000).toFixed(2)} km del llano`,
  );
  const medidoFaro = await llano(FARO);
  comprobar(
    "el llano del faro es llano, seco y sin bultos",
    medidoFaro.pendiente < 5 && medidoFaro.agua === 0 && medidoFaro.bulto > 20 && medidoFaro.arbol > 20,
    `${medidoFaro.pendiente.toFixed(1)}° en 20 m, a ${medidoFaro.cota.toFixed(1)} m, ${medidoFaro.agua} muestras de agua, bulto a ${medidoFaro.bulto}, árbol a ${medidoFaro.arbol}`,
  );
  // Encima del llano, antes de bajar: la gente saluda desde junto al faro.
  const teno = await irYPosarse(FARO, 30, async () => {
    await foto("g1b-encima-del-llano-la-gente-saluda");
    await conVista("morro", "g1c-encima-del-llano-de-frente");
  });
  comprobar(
    "se posa en el llano del faro, suave",
    teno.posado.enTierra && Math.hypot(teno.posado.x - FARO.x, teno.posado.z - FARO.z) < FARO.radio && teno.posado.toma < 2 && !teno.posado.percance,
    `a ${Math.hypot(teno.posado.x - FARO.x, teno.posado.z - FARO.z).toFixed(1)} m, tocó a ${teno.posado.toma.toFixed(2)} m/s`,
  );
  comprobar("y toca esperar a que suba la gente", teno.posado.mision?.ahora === "wait", teno.posado.mision?.ahora);
  await foto("3-posado-junto-al-faro");

  // ── La espera ──────────────────────────────────────────────────────────
  console.log("\nSube la gente");
  await fase("posado");
  const corriendo = await esperar((r) => r.mision?.espera?.corre === true, 20);
  await empezarAVigilar();
  comprobar("la espera corre posado y con el rotor en marcha", corriendo.mision?.espera?.corre, JSON.stringify(corriendo.mision?.espera));
  // Lo que cuesta, posado en Teno con la gente andando: con ella y sin dibujarla.
  await pausa(1500);
  const conGente = await medirCoste(false);
  const sinGente = await medirCoste(true);
  const tarjeta = await page.evaluate(() => {
    const gl = globalThis.__oga.juegoParaTrazas().renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  console.log(`    dibuja con: ${tarjeta}`);
  console.log(`    coste con gente: ${JSON.stringify(conGente)}`);
  console.log(`    coste sin gente: ${JSON.stringify(sinGente)}`);
  comprobar(
    "la gente cuesta una llamada de dibujo, y unos pocos miles de triángulos",
    conGente.llamadas - sinGente.llamadas <= 1.5 && conGente.triangulos - sinGente.triangulos < 6000,
    `${(conGente.llamadas - sinGente.llamadas).toFixed(1)} llamadas y ${conGente.triangulos - sinGente.triangulos} triángulos más; cuadro ${sinGente.mediana} → ${conGente.mediana} ms (p90 ${sinGente.p90} → ${conGente.p90}); ${conGente.cpuGente} ms de CPU por cuadro`,
  );
  let aLaMitad = await leerGente();
  for (let i = 0; i < 120 && !(aLaMitad.dentro >= 3 && aLaMitad.andando >= 3); i++) {
    await pausa(250);
    aLaMitad = await leerGente();
  }
  comprobar(
    "a mitad de la subida, el tripulante fuera y la corredera abierta",
    aLaMitad.tripulante === "fuera" && aLaMitad.puerta === 1 && aLaMitad.dentro >= 3,
    `${aLaMitad.dentro} dentro, ${aLaMitad.andando} andando, tripulante ${aLaMitad.tripulante}, puerta ${aLaMitad.puerta}`,
  );
  await conVista("wing", "g2-a-mitad-de-la-subida");
  await conVista("morro", "g2b-a-mitad-de-la-subida-de-frente");
  if (process.env.OGA_NOCHE !== "0") {
    await page.evaluate(() => globalThis.__oga.ponerHora(21.5));
    await pausa(1200);
    await conVista("wing", "g4-de-noche");
    await page.evaluate(() => globalThis.__oga.ponerHora(12));
    await pausa(600);
  }
  const subidos = await esperar((r) => r.mision?.ahora === "takeoff", 70);
  const vigilado = await dejarDeVigilar();
  comprobar(
    "nadie pasa por detrás de la cola mientras sube la gente",
    vigilado.malos.length === 0 && vigilado.muestras > 40,
    vigilado.malos.slice(0, 4).join("; ") || `${vigilado.muestras} vistazos, ninguno; subieron en ${cuantoTardo(subidos, "suben")} s`,
  );
  const yaDentro = await leerGente();
  comprobar(
    "al acabar la espera, todos dentro, el tripulante también y la puerta cerrada",
    yaDentro.dentro === CUANTOS && yaDentro.tripulante === "dentro" && yaDentro.puerta === 0,
    `${yaDentro.dentro} dentro, tripulante ${yaDentro.tripulante}, puerta ${yaDentro.puerta}, la espera ${JSON.stringify(subidos.mision?.espera)}`,
  );
  comprobar("pasados unos 25 s, toca despegar", subidos.mision?.ahora === "takeoff", JSON.stringify(subidos.mision?.espera));
  const gente = subidos.mision?.dicho.filter((d) => d.quien === "gente").map((d) => d.que) ?? [];
  comprobar(
    "el enganche de la gente: empieza a subir, por la puerta, y acaba",
    gente[0] === "empieza:suben:con puerta" && gente[1] === "acaba",
    gente.join(" → "),
  );
  await pausa(1000);
  const posadoEnTeno = await leerApuntando();
  const aguja2 = senala(posadoEnTeno, GARACHICO);
  comprobar("posado junto al faro, la aguja señala Garachico y no el helipuerto", aguja2.ok, aguja2.detalle);
  await foto("4-listos-en-teno");
  /*
   * **Y el cuadro de la misión**, por dónde va: cuatro hechos, el despegue el
   * que toca y cada paso con su nombre, no con el de su clase.
   */
  await page.evaluate(() => document.querySelector('[data-hud="mision-boton"]')?.click());
  await pausa(800);
  const cuadro = await page.evaluate(() =>
    [...document.querySelectorAll(".mision__paso")].map((li) => ({
      estado: li.className.replace(/.*mision__paso--/, ""),
      que: li.querySelector(".mision__que")?.textContent?.trim() ?? "",
    })),
  );
  comprobar(
    "el cuadro de la misión dice cada paso por su nombre, con cuatro hechos",
    cuadro.length === 7 && cuadro.filter((p) => p.estado === "hecho").length === 4 && cuadro[4]?.estado === "ahora" && cuadro[2]?.que === "Posarse junto al faro",
    cuadro.map((p) => `${p.que} (${p.estado})`).join(" · "),
  );
  await foto("4b-cuadro-de-la-mision");
  await page.keyboard.press("Escape");
  await pausa(500);

  // ── A Garachico ────────────────────────────────────────────────────────
  console.log("\nDespegue de Teno y a Garachico");
  await fase("subir", { alto: 40 });
  const otraVez = await esperar((r) => r.mision?.ahora === "land", 90);
  comprobar("despega de Teno", otraVez.mision?.ahora === "land", `a ${otraVez.alto.toFixed(0)} m`);
  await saltar(GARACHICO.x - 1200, GARACHICO.z - 1700, 120, GARACHICO);
  const medidoGarachico = await llano(GARACHICO);
  comprobar(
    "la explanada de Garachico es llana, seca y sin bultos",
    medidoGarachico.pendiente < 5 && medidoGarachico.agua === 0 && medidoGarachico.bulto > 20 && medidoGarachico.arbol > 20,
    `${medidoGarachico.pendiente.toFixed(1)}° en 20 m, a ${medidoGarachico.cota.toFixed(1)} m, ${medidoGarachico.agua} muestras de agua, bulto a ${medidoGarachico.bulto}, árbol a ${medidoGarachico.arbol}`,
  );
  const garachico = await irYPosarse(GARACHICO, 30);
  comprobar(
    "se posa en la explanada del puerto, suave",
    garachico.posado.enTierra &&
      Math.hypot(garachico.posado.x - GARACHICO.x, garachico.posado.z - GARACHICO.z) < GARACHICO.radio &&
      garachico.posado.toma < 2 &&
      !garachico.posado.percance,
    `a ${Math.hypot(garachico.posado.x - GARACHICO.x, garachico.posado.z - GARACHICO.z).toFixed(1)} m, tocó a ${garachico.posado.toma.toFixed(2)} m/s`,
  );
  await foto("5-posado-en-garachico");
  await fase("posado");
  await esperar((r) => r.mision?.espera?.corre === true, 20);
  await empezarAVigilar();
  const fin = await esperar((r) => r.mision?.terminada === true, 70);
  const bajando = await dejarDeVigilar();
  comprobar("baja la gente y la misión se termina", fin.mision?.terminada === true, JSON.stringify(fin.mision?.espera));
  comprobar(
    "nadie pasa por detrás de la cola mientras baja la gente",
    bajando.malos.length === 0 && bajando.muestras > 40,
    bajando.malos.slice(0, 4).join("; ") || `${bajando.muestras} vistazos, ninguno; bajaron en ${cuantoTardo(fin, "bajan")} s`,
  );
  // El último, ya fuera del disco, aún anda hasta el grupo: se le deja llegar.
  let abajo = await leerGente();
  for (let i = 0; i < 40 && abajo.andando > 0; i++) {
    await pausa(250);
    abajo = await leerGente();
  }
  const lejos = abajo.locales.filter((l) => Math.hypot(l.f, l.r) > ROTOR + 0.5);
  comprobar(
    "en Garachico baja toda la gente y se queda fuera del disco, por delante",
    abajo.fuera === CUANTOS && lejos.length === CUANTOS && abajo.locales.every((l) => l.f > 0) && abajo.tripulante === "dentro" && abajo.puerta === 0,
    `${abajo.fuera} fuera, ${lejos.length} fuera del disco, lo más cerca a ${Math.min(...abajo.locales.map((l) => Math.hypot(l.f, l.r))).toFixed(1)} m del mástil; tripulante ${abajo.tripulante}, puerta ${abajo.puerta}`,
  );
  await conVista("morro", "g3-en-garachico-con-la-gente-abajo");
  if (process.env.OGA_NOCHE !== "0") {
    await page.evaluate(() => globalThis.__oga.ponerHora(21.5));
    await pausa(1500);
    await conVista("morro", "g4b-de-noche-en-garachico");
    await page.evaluate(() => globalThis.__oga.ponerHora(12));
    await pausa(800);
  }
  await pausa(1500);
  await foto("6-final");

  /*
   * **Y el sello del faro de Teno**, que se gana al acabar y se celebra como
   * todos: posado, despacio y cuando nadie habla, con su dibujo en la tarjeta.
   * Ver `TENO.sello` y `celebrarLosSellosSiToca` en `game.ts`.
   */
  const ganado = await page.evaluate(() => globalThis.__oga.sellos().ganados);
  comprobar("gana el sello del faro de Teno al acabar", ganado.includes("teno"), ganado.join(", ") || "ninguno");
  let celebrado = null;
  for (let s = 0; s < 40 && !celebrado; s++) {
    await pausa(1000);
    celebrado = await page.evaluate(() => {
      const c = globalThis.__oga.sellos().celebrados.find((x) => x.sello === "teno");
      const t = globalThis.__oga.tarjeta();
      return c ? { ...c, tarjeta: t?.dibujo ?? t?.id ?? null } : null;
    });
  }
  comprobar(
    "y lo celebra posado, con su dibujo en la tarjeta",
    celebrado?.enTierra === true,
    celebrado ? `en tierra a ${celebrado.porElSuelo.toFixed(2)} m/s · tarjeta ${celebrado.tarjeta}` : "no llegó",
  );
  await pausa(600);
  await foto("6b-sello-de-teno");
  // Y en el cuaderno, en su sitio del álbum: el último de la fila de piloto.
  await page.evaluate(() => document.querySelector('[data-hud="cuaderno"]')?.click());
  await pausa(900);
  const enElAlbum = await page.evaluate(() => {
    const filas = [...document.querySelectorAll(".album__tramo")];
    const piloto = filas[1] ? [...filas[1].querySelectorAll(".album__sitio")] : [];
    const sello = document.querySelector('.album [data-sello="teno"]');
    sello?.scrollIntoView({ block: "center" });
    return { sitios: piloto.length, ultimo: piloto[piloto.length - 1]?.querySelector("[data-sello]")?.getAttribute("data-sello") ?? null };
  });
  comprobar(
    "y en el álbum del cuaderno, al final de la fila de piloto",
    enElAlbum.sitios === 6 && enElAlbum.ultimo === "teno",
    `${enElAlbum.sitios} sitios en la fila de piloto, el último ${enElAlbum.ultimo}`,
  );
  await pausa(400);
  await foto("6c-album-con-el-sello");
  await page.keyboard.press("Escape");
  await pausa(400);

  // ── Y al irse de Garachico, la gente se queda ─────────────────────────
  await fase("subir", { alto: 25 });
  await esperar((r) => !r.enTierra && r.alto > 12, 40);
  await pausa(2500);
  const despedida = await leerGente();
  const quietos = despedida.sitios.filter((q, i) => Math.hypot(q.x - abajo.sitios[i].x, q.z - abajo.sitios[i].z) < 0.5).length;
  comprobar(
    "al despegar de Garachico, la gente se queda donde estaba",
    despedida.fuera === CUANTOS && quietos === CUANTOS && despedida.visible,
    `${despedida.fuera} fuera, ${quietos} en el mismo sitio`,
  );
  await foto("g3b-despegando-de-garachico");

  // ── Lo que se dijo y lo que sonó ───────────────────────────────────────
  const final = await leerApuntando();
  const dichas = final.mision?.dicho.filter((d) => d.quien === "instructora").map((d) => d.que) ?? [];
  comprobar("las frases de la instructora, una por paso y en su orden", JSON.stringify(dichas) === JSON.stringify(ORDEN), dichas.join(" → "));
  comprobar(
    "la tripulación no habla en Guyrami",
    !final.mision?.dicho.some((d) => d.quien === "tripulacion"),
    final.mision?.dicho.filter((d) => d.quien === "tripulacion").map((d) => d.que).join(", ") || "nadie",
  );
  const sonidos = await page.evaluate(() => globalThis.__oga.sonidos());
  const cierre = final.mision?.dicho.find((d) => d.que === "mission.teno.cierre");
  comprobar(
    "el sonido de logro al final, con el cierre",
    cierre && sonidos.some((s) => s.que === "achieved" && Math.abs(s.cuando - cierre.cuando) < 2),
    sonidos.map((s) => `${s.que}@${s.cuando}`).join(", "),
  );
  comprobar(
    "los objetivos, en orden",
    JSON.stringify(ahoras) === JSON.stringify(["takeoff", "reach", "land", "wait", "takeoff", "land", "wait", "fin"]),
    ahoras.join(" → "),
  );
  comprobar("sin percances en toda la misión", percances.size === 0, [...percances].join(", ") || "ninguno");
  const conAviso = avisos.filter((a) => a.senal);
  comprobar(
    "sin avisos de bulto ni de terreno en toda la misión",
    conAviso.length === 0,
    conAviso.map((a) => `${a.senal} en (${a.x}, ${a.z}) a ${a.alto} m, ${a.paso}`).join("; ") || "ninguno",
  );
  comprobar("sin errores en la página", errores.length === 0, errores.slice(0, 3).join(" | "));
  await page.evaluate(() => globalThis.__oga.pilotar(null));
  await contexto.close();

  // ── En el peldaño de cabina habla la tripulación ───────────────────────
  if (!TELEFONO) {
    console.log("\nEn Taguató Ruvicha, la tripulación");
    const cabina = await abrir("taguato-ruvicha");
    await pausa(4000);
    const dicho = await cabina.page.evaluate(() => {
      const m = globalThis.__oga.mision();
      const tira = document.querySelector('[data-hud="radio"]')?.textContent?.trim() ?? null;
      return { dicho: m?.dicho ?? [], tira };
    });
    comprobar(
      "la presenta la tripulación, por el interfono, y la instructora calla",
      dicho.dicho.some((d) => d.que === "mission.teno.tripulacion.presenta" && d.quien === "tripulacion") &&
        !dicho.dicho.some((d) => d.quien === "instructora"),
      `${dicho.dicho.map((d) => `${d.quien}: ${d.que}`).join(", ")} · tira «${dicho.tira ?? "—"}»`,
    );
    if (FOTOS) {
      await cabina.page.screenshot({ path: `${FOTOS}/7-cabina-tripulacion.png` });
      console.log(`    foto: ${FOTOS}/7-cabina-tripulacion.png`);
    }
    comprobar("sin errores en la página, en cabina", cabina.errores.length === 0, cabina.errores.slice(0, 3).join(" | "));
    await cabina.contexto.close();
  }

  const malos = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length - malos.length} de ${resultados.length} bien`);
  codigo = malos.length ? 1 : 0;
} catch (e) {
  console.error(e);
} finally {
  await navegador.close();
  await server.close();
}
process.exit(codigo);
