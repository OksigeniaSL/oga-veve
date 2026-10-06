/**
 * **Los ruidos del vuelo, medidos en el juego de verdad**: que en cada vista
 * suene lo que toca.
 *
 * Pedido volando con lluvia en Tenerife Norte: «dentro de un avión, ¿cómo se
 * escucha la lluvia? ¿Y el granizo?», y lo demás de la lista —las juntas, el
 * tren, la reversa, los aerofrenos, los flaps, la APU y el aire—. Lo que se
 * decide está probado sin navegador en `src/audio/ruidos.test.ts`; esto
 * comprueba lo otro, que **suena**: que los nodos están montados, que les
 * llega la señal y que cada vista oye lo suyo.
 *
 * ## Cómo se mide lo que no se puede oír
 *
 * Desde un banco no se oye nada. Lo que se puede hacer es poner un analizador
 * detrás de cada capa —`__oga.ruidos()`, ver `RuidosEnElAire.medir`— y leer
 * su valor eficaz en decibelios mientras el juego vuela. Se lee antes del bus,
 * así que lo que se mide es la capa y no el agachado de la mezcla cuando
 * habla alguien, que va aparte y ya lo comprueba su propio banco.
 *
 * Los números absolutos dependen de la calibración; lo que se compara son
 * **diferencias**: la lluvia en la cabina contra la del pasaje, el granizo
 * contra la lluvia, la APU desde fuera contra la APU desde dentro. Y «calla»
 * quiere decir por debajo de −70 dB, que es silencio para cualquier altavoz.
 *
 * ## Y lo que cuesta
 *
 * Al final, `medirElCoste`: el grafo entero renderizado en un contexto sin
 * altavoz, con y sin los ruidos nuevos, en milisegundos de proceso por
 * segundo de audio; y el paso de cada fotograma en el hilo del juego, en
 * microsegundos.
 *
 * Uso: `node scripts/verificar-sonidos.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5381;
/** Un día de lluvia de verdad en Los Rodeos, con la capa a tres mil pies. */
const METAR = "METAR GCXO 021300Z 31012KT 5000 RA BKN030 19/17 Q1017";
/** Por debajo de esto, calla. */
const CALLA = -70;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: [
    "--use-gl=angle",
    "--use-angle=gl",
    "--enable-unsafe-swiftshader",
    // Sin esto el contexto de audio no arranca, y lo que se mide es que suene.
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const resultados = [];
const comprobar = (nombre, ok, detalle) => resultados.push({ nombre, ok: !!ok, detalle });
const db = (v) => (Number.isFinite(v) ? `${v.toFixed(1)} dB` : "silencio");

/** Abre el juego con un avión en un campo, y espera a que se pueda medir. */
async function abrir(escenario, avion, metar = METAR) {
  const page = await navegador.newPage({ viewport: { width: 900, height: 600 } });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=${escenario}&hora=13&leccion=vuelta&tramo=guyrami&avion=${avion}` +
      `&meteo=&metar=${encodeURIComponent(metar)}`,
  );
  await page.waitForFunction(() => globalThis.__oga?.estado?.() && globalThis.__oga.ruidos?.(), null, {
    timeout: 120000,
  });
  /*
   * El primer gesto, que es lo que despierta el audio en un navegador. **En el
   * cielo, no en el cuadro**: desde la ola 2 un toque corto sobre una pieza del
   * cuadro abre su explicación, y la ventana congela el vuelo mientras está
   * abierta. El clic iba a (450, 560), encima de los instrumentos, y todo el
   * banco medía un juego parado: 8 de 25, con todos los ruidos en silencio
   * (encontrado por bisección el 6-oct-2026: lo rompió a6cc8f3b, y medido
   * con una sonda: pausado y con el mundo callado). Escape no sirve para
   * cerrarla: en el juego abre la pausa.
   */
  await page.mouse.click(450, 160);
  await page.waitForFunction(() => globalThis.__oga.sonido().contexto === "running", null, {
    timeout: 20000,
  });
  return { page, errores };
}

/**
 * Lo que suena en cada capa desde una vista, de media durante un rato: el
 * analizador ve cuarenta milisegundos cada vez, y una junta o una gota caen o
 * no caen dentro. Se promedia la potencia, no los decibelios.
 */
async function oir(page, vista, segundos = 2.5) {
  return page.evaluate(
    async ({ vista, segundos }) => {
      const o = globalThis.__oga;
      o.ponerVista(vista);
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      // Lo que tarda en asentarse: las constantes de tiempo son de décimas, y
      // lo que se apaga al cambiar de vista tiene que haberse apagado.
      await espera(2500);
      const suma = {};
      let n = 0;
      const fin = performance.now() + segundos * 1000;
      while (performance.now() < fin) {
        const { medida } = o.ruidos();
        for (const [k, v] of Object.entries(medida))
          suma[k] = (suma[k] ?? 0) + (Number.isFinite(v) ? Math.pow(10, v / 10) : 0);
        n++;
        await espera(60);
      }
      const media = {};
      for (const [k, v] of Object.entries(suma)) media[k] = v > 0 ? 10 * Math.log10(v / n) : -Infinity;
      return { vista: o.vista(), media, niveles: o.ruidos().niveles };
    },
    { vista, segundos },
  );
}

/** Coloca el avión y lo deja con los mandos que se le digan. */
async function colocar(page, { altura, velocidad, enPista = true, mandos = {} }) {
  await page.evaluate(
    ({ altura, velocidad, enPista, mandos }) => {
      const o = globalThis.__oga;
      const e = o.escenario();
      const x = e.runway.x;
      const z = e.runway.z;
      // Sobre el suelo de vuelo más el tren: con altura cero, justo apoyado.
      const suelo = o.sueloDeVuelo(x, z) + (o.avion().tren ?? 2);
      const rumbo = (e.runway.heading * Math.PI) / 180;
      o.colocar(x, suelo + altura, z, velocidad, rumbo);
      o.pilotar((c) => {
        c.engineOn = true;
        Object.assign(c, mandos);
      });
      void enPista;
    },
    { altura, velocidad, enPista, mandos },
  );
}

const tabla = [];
const costes = [];

/**
 * **Lo que cuesta el sonido**, en milisegundos de proceso por segundo de
 * audio: el grafo entero de `Audio` montado en un contexto sin altavoz, que
 * renderiza tan deprisa como puede. En una página en blanco y no en la del
 * juego, que con el mundo pintándose por software en los mismos núcleos el
 * reloj mide más la pelea que el sonido.
 *
 * Tres situaciones —volando con buen tiempo, bajo un aguacero desde la
 * cabina, y el peor caso con todo a la vez— y la primera también sin los
 * ruidos del vuelo. El peor caso es el reactor, que lo lleva todo, rodando
 * por losas gastadas bajo una tormenta con granizo, con la reversa, los
 * aerofrenos, el tren y los flaps moviéndose, mirando desde la cabina: no
 * pasa nunca jugando, es el techo. Y lo que cuesta el paso de cada fotograma
 * en el hilo del juego, en microsegundos.
 */
async function medirElCoste() {
  const page = await navegador.newPage();
  try {
    await page.goto(`${BASE}/favicon.svg`);
    return await page.evaluate(async () => {
      const { Audio } = await import("/src/audio/audio.ts");
      const { avionQueSuena } = await import("/src/audio/ruidos.ts");
      const { FIRMES } = await import("/src/world/firme.ts");
      const { ARAI } = await import("/src/flight/aircraft.ts");
      const { neutralControls } = await import("/src/flight/model.ts");
      const fs = 48000;
      const segundos = 10;
      const estado = (enElSuelo) => ({
        position: { x: 0, y: enElSuelo ? 2 : 300, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        airspeed: enElSuelo ? 60 : 70,
        groundSpeed: enElSuelo ? 60 : 70,
        alpha: 0.05,
        beta: 0.02,
        verticalSpeed: 0,
        loadFactor: 1,
        onGround: enElSuelo,
        stalled: false,
      });
      const enVuelo = () => ({ ...neutralControls(), throttle: 0.6, engineOn: true, tren: 0 });
      const todo = (paso) => ({
        ...enVuelo(),
        throttle: 0.3,
        tren: 0.4 + paso,
        flaps: 0.4 + paso,
        reversa: 1,
        aerofrenos: 1,
        frenosDeTierra: 1,
      });
      const montar = (caso, ctx, sinRuidos = false) => {
        const a = new Audio();
        a.montarEn(ctx, sinRuidos);
        a.setEngine(ARAI.sound);
        a.ponerAvion(avionQueSuena(ARAI));
        a.ponerOido(caso === "seco" ? "fuera" : "cabina");
        if (caso !== "seco") a.ponerLluvia(caso === "peor" ? "tormenta" : "lluvia", 1, 70, 1);
        a.ponerGranizo(caso === "peor" ? 1 : 0);
        a.ponerFirme(FIRMES.losas.gastado);
        const suelo = caso === "peor";
        const mandos = caso === "peor" ? todo : enVuelo;
        a.seguir(estado(suelo), mandos(0));
        a.seguir(estado(suelo), mandos(0.05));
        return a;
      };
      const una = async (caso, sinRuidos = false) => {
        const ctx = new OfflineAudioContext(2, fs * segundos, fs);
        montar(caso, ctx, sinRuidos);
        const t0 = performance.now();
        await ctx.startRendering();
        return (performance.now() - t0) / segundos;
      };
      /*
       * **Intercalado, y la mediana de cinco.** La máquina de los bancos la
       * comparten otras sesiones, y una medida suelta puede pillar a las
       * otras compilando: medidas una detrás de otra, las cuatro situaciones
       * se llevan la misma carga, y la mediana se queda con la de en medio.
       */
      const veces = { secoSinRuidos: [], seco: [], lluvia: [], peor: [] };
      for (let r = 0; r < 5; r++) {
        veces.secoSinRuidos.push(await una("seco", true));
        veces.seco.push(await una("seco"));
        veces.lluvia.push(await una("lluvia"));
        veces.peor.push(await una("peor"));
      }
      const mediana = (v) => Math.round([...v].sort((x, y) => x - y)[2] * 100) / 100;
      const secoSinRuidos = mediana(veces.secoSinRuidos);
      const seco = mediana(veces.seco);
      const lluvia = mediana(veces.lluvia);
      const peor = mediana(veces.peor);
      // Mil pasos con el tren y los flaps moviéndose: se escribe todo.
      const a = montar("peor", new OfflineAudioContext(2, fs, fs));
      const t0 = performance.now();
      for (let i = 0; i < 1000; i++) a.seguir(estado(true), todo(0.05 + i * 1e-4));
      const microsegundosPorPaso = Math.round((performance.now() - t0) * 10) / 10;
      return { secoSinRuidos, seco, lluvia, peor, microsegundosPorPaso };
    });
  } finally {
    await page.close();
  }
}
const apuntar = (caso, r) => {
  tabla.push({ caso, vista: r.vista, ...Object.fromEntries(Object.entries(r.media).map(([k, v]) => [k, Number.isFinite(v) ? Math.round(v) : "—"])) });
};

try {
  // ── El reactor regional: lo lleva todo ─────────────────────────────────
  {
    const { page, errores } = await abrir("tenerife-norte", "jaz-90");

    // En el puesto, con los motores parados: la APU y los packs.
    await page.evaluate(() => globalThis.__oga.pilotar((c) => (c.engineOn = false)));
    const fueraPuesto = await oir(page, "chase", 3);
    const cabinaPuesto = await oir(page, "cockpit");
    const pasajePuesto = await oir(page, "pasaje-izquierda");
    for (const r of [fueraPuesto, cabinaPuesto, pasajePuesto]) apuntar("en el puesto", r);
    comprobar(
      "en el puesto, la APU suena desde fuera",
      fueraPuesto.media.apu > -45,
      db(fueraPuesto.media.apu),
    );
    comprobar(
      "y desde la cabina se oye bastante menos, que está en la cola",
      fueraPuesto.media.apu - cabinaPuesto.media.apu > 12,
      `fuera ${db(fueraPuesto.media.apu)}, cabina ${db(cabinaPuesto.media.apu)}`,
    );
    comprobar(
      "los packs soplan en el pasaje, y desde fuera casi nada",
      pasajePuesto.media.aire > -50 && pasajePuesto.media.aire - fueraPuesto.media.aire > 25,
      `pasaje ${db(pasajePuesto.media.aire)}, fuera ${db(fueraPuesto.media.aire)}`,
    );

    // En vuelo bajo la lluvia, a 70 m/s y trescientos metros.
    await colocar(page, { altura: 300, velocidad: 70, mandos: { throttle: 0.6 } });
    const fuera = await oir(page, "chase");
    const cabina = await oir(page, "cockpit");
    const pasaje = await oir(page, "pasaje-derecha");
    for (const r of [fuera, cabina, pasaje]) apuntar("lluvia en vuelo", r);
    comprobar(
      "fuera, la lluvia de siempre, sin gotas de cristal",
      fuera.media.lluvia > -50 && fuera.media.gotas < CALLA,
      `siseo ${db(fuera.media.lluvia)}, gotas ${db(fuera.media.gotas)}`,
    );
    comprobar(
      "en la cabina, el tamborileo contra el parabrisas",
      cabina.media.gotas > -40,
      db(cabina.media.gotas),
    );
    comprobar(
      "en el pasaje, en vuelo, la lluvia apenas se oye: muy por debajo de la cabina",
      cabina.media.gotas - pasaje.media.gotas > 12,
      `cabina ${db(cabina.media.gotas)}, pasaje ${db(pasaje.media.gotas)}`,
    );
    comprobar(
      "los limpias, desde la cabina y solo desde ella",
      cabina.media.limpias > -50 &&
        cabina.media.limpias - pasaje.media.limpias > 25 &&
        cabina.media.limpias - fuera.media.limpias > 25,
      `cabina ${db(cabina.media.limpias)}, pasaje ${db(pasaje.media.limpias)}, fuera ${db(fuera.media.limpias)}`,
    );
    comprobar(
      "el viento suena más fuera que en el pasaje",
      fuera.media.viento - pasaje.media.viento > 3,
      `fuera ${db(fuera.media.viento)}, pasaje ${db(pasaje.media.viento)}`,
    );

    // El granizo: el del parte, puesto a mano.
    await page.evaluate(() => globalThis.__oga.ponerLluvia("tormenta", 1, 1));
    const gFuera = await oir(page, "chase");
    const gCabina = await oir(page, "cockpit");
    const gPasaje = await oir(page, "pasaje-derecha");
    for (const r of [gFuera, gCabina, gPasaje]) apuntar("granizo", r);
    comprobar(
      "el granizo suena en las tres vistas",
      [gFuera, gCabina, gPasaje].every((r) => r.media.granizo > -50),
      [gFuera, gCabina, gPasaje].map((r) => `${r.vista} ${db(r.media.granizo)}`).join(", "),
    );
    comprobar(
      "y en la cabina pega más que la lluvia más fuerte",
      gCabina.media.granizo > gCabina.media.gotas,
      `granizo ${db(gCabina.media.granizo)}, lluvia ${db(gCabina.media.gotas)}`,
    );
    comprobar(
      "y más en la cabina que fuera",
      gCabina.media.granizo > gFuera.media.granizo,
      `cabina ${db(gCabina.media.granizo)}, fuera ${db(gFuera.media.granizo)}`,
    );
    await page.evaluate(() => globalThis.__oga.ponerLluvia("nada", 0, 0));
    const seco = await oir(page, "cockpit", 1.5);
    comprobar(
      "y sin agua no suena nada de esto",
      seco.media.granizo < CALLA && seco.media.gotas < CALLA && seco.media.limpias < CALLA,
      `granizo ${db(seco.media.granizo)}, gotas ${db(seco.media.gotas)}, limpias ${db(seco.media.limpias)}`,
    );

    // El tren: subirlo en vuelo y oír su motor mientras se mueve.
    const tren = await page.evaluate(async () => {
      const o = globalThis.__oga;
      o.ponerVista("pasaje-derecha");
      o.pilotar((c) => {
        c.engineOn = true;
        c.throttle = 0.6;
      });
      o.pedirTren(true);
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      await espera(400);
      o.pedirTren(false);
      await espera(2500);
      const moviendose = o.ruidos().medida.motorDelTren;
      const patasFuera = o.ruidos().niveles?.tren.patas ?? 0;
      await espera(11000);
      return {
        moviendose,
        patasFuera,
        quieto: o.ruidos().medida.motorDelTren,
        patasDentro: o.ruidos().niveles?.tren.patas ?? 0,
        tocados: o.ruidosTocados(),
      };
    });
    comprobar(
      "el tren suena mientras se mueve, y calla dentro",
      tren.moviendose > -60 && tren.quieto < CALLA,
      `moviéndose ${db(tren.moviendose)}, dentro ${db(tren.quieto)}`,
    );
    comprobar(
      "y al quedarse dentro, golpea",
      tren.tocados.some((t) => t === "tren:dentro"),
      tren.tocados.join(", ") || "nada",
    );

    // Los aerofrenos, en vuelo.
    await colocar(page, { altura: 300, velocidad: 90, mandos: { throttle: 0.3, aerofrenos: 1 } });
    const af = await oir(page, "pasaje-derecha");
    const afFuera = await oir(page, "chase");
    apuntar("aerofrenos", af);
    apuntar("aerofrenos", afFuera);
    comprobar(
      "los aerofrenos tiemblan, más en el pasaje que fuera",
      af.media.aerofrenos > -50 && af.media.aerofrenos > afFuera.media.aerofrenos,
      `pasaje ${db(af.media.aerofrenos)}, fuera ${db(afFuera.media.aerofrenos)}`,
    );
    // Y después de un buen rato en el aire, la APU está apagada.
    comprobar("y en vuelo la APU está apagada", afFuera.media.apu < CALLA, db(afFuera.media.apu));

    // Los flaps, mientras se mueven.
    const flaps = await page.evaluate(async () => {
      const o = globalThis.__oga;
      o.pilotar((c) => {
        c.engineOn = true;
        c.throttle = 0.6;
        c.aerofrenos = 0;
      });
      o.ponerVista("pasaje-derecha");
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      await espera(1000);
      const antes = o.ruidos().medida.flaps;
      o.pedirFlaps(1 / 3);
      await espera(1500);
      const durante = o.ruidos().medida.flaps;
      return { antes, durante };
    });
    comprobar(
      "los flaps zumban mientras se mueven",
      flaps.durante > -60 && flaps.antes < CALLA,
      `quietos ${db(flaps.antes)}, moviéndose ${db(flaps.durante)}`,
    );

    // La carrera: en la pista, con la reversa, por asfalto cuidado.
    await colocar(page, {
      altura: 0,
      velocidad: 50,
      mandos: { throttle: 0, reversa: 1, aerofrenos: 0, frenosDeTierra: 1, tren: 1, flaps: 0 },
    });
    const rev = await oir(page, "chase", 1.5);
    apuntar("reversa", rev);
    comprobar("la reversa ruge desde fuera", rev.media.reversa > -45, db(rev.media.reversa));
    comprobar(
      "y la pista de Los Rodeos, de asfalto, no tiene juntas",
      (rev.niveles?.rodadura.juntas ?? 1) === 0,
      `juntas ${rev.niveles?.rodadura.juntas}`,
    );

    // El toque: soltarlo a metro y medio, despacio, y que se pose.
    const toque = await page.evaluate(async () => {
      const o = globalThis.__oga;
      o.ruidosTocados();
      const e = o.escenario();
      const suelo = o.sueloDeVuelo(e.runway.x, e.runway.z) + (o.avion().tren ?? 2);
      o.colocar(e.runway.x, suelo + 3, e.runway.z, 45, (e.runway.heading * Math.PI) / 180);
      o.pilotar((c) => {
        c.engineOn = true;
        c.throttle = 0;
        c.reversa = 0;
        c.tren = 1;
      });
      const espera = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 60 && !o.estado().onGround; i++) await espera(100);
      await espera(300);
      return { enElSuelo: o.estado().onGround, tocados: o.ruidosTocados() };
    });
    comprobar(
      "al tocar, chirrían las ruedas",
      toque.tocados.some((t) => t.startsWith("toque")),
      `${toque.enElSuelo ? "en el suelo" : "sin tocar"}: ${toque.tocados.join(", ") || "nada"}`,
    );

    comprobar("sin errores en la página del reactor", errores.length === 0, errores.join(" | ") || "ninguno");

    await page.close();
  }

  // ── Las juntas: hormigón gastado en Pilar, con la avioneta ─────────────
  {
    const { page, errores } = await abrir("pilar", "jaz-20", "METAR SGPI 021300Z 18005KT 9999 SCT040 25/15 Q1015");
    await colocar(page, { altura: 0, velocidad: 15, mandos: { throttle: 0.35, brakes: 0, flaps: 0 } });
    const cabina = await oir(page, "cockpit", 2);
    const fuera = await oir(page, "chase", 2);
    for (const r of [cabina, fuera]) apuntar("losas de pilar", r);
    comprobar(
      "sobre el hormigón de Pilar suenan las juntas",
      cabina.media.rodadura > -50 && (cabina.niveles?.rodadura.juntas ?? 0) > 0,
      `${db(cabina.media.rodadura)}, cada ${cabina.niveles?.rodadura.cada.toFixed(2)} s`,
    );
    comprobar(
      "y la avioneta no tiene APU ni limpias ni aire que suene",
      cabina.media.apu < CALLA && cabina.media.limpias < CALLA && cabina.media.aire < CALLA,
      `apu ${db(cabina.media.apu)}, limpias ${db(cabina.media.limpias)}, aire ${db(cabina.media.aire)}`,
    );
    comprobar("sin errores en la página de la avioneta", errores.length === 0, errores.join(" | ") || "ninguno");
    await page.close();
  }

  // ── Y lo que cuesta, con las páginas del juego ya cerradas ─────────────
  {
    const coste = await medirElCoste();
    costes.push(coste);
    /*
     * Lo que se pide al coste: que volando con buen tiempo —lo de casi
     * siempre— los ruidos nuevos no cuesten casi nada, porque callados van
     * desenchufados; y que el peor caso, que no pasa nunca, no llegue al
     * triple de lo de antes.
     */
    comprobar(
      "y lo que cuesta, medido: con buen tiempo casi nada; con todo a la vez, menos del triple",
      coste.seco < coste.secoSinRuidos * 1.3 + 2 && coste.peor < coste.secoSinRuidos * 3,
      `ms de proceso por segundo de audio: sin los ruidos ${coste.secoSinRuidos}, ` +
        `con buen tiempo ${coste.seco}, con lluvia ${coste.lluvia}, todo a la vez ${coste.peor}; ` +
        `${coste.microsegundosPorPaso} µs por fotograma`,
    );
  }
} finally {
  await navegador.close();
  await server.close();
}

console.table(tabla);
if (costes.length) console.table(costes);
let mal = 0;
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre} — ${r.detalle}`);
  if (!r.ok) mal++;
}
console.log(`\n  ${resultados.length - mal} de ${resultados.length}`);
process.exit(mal ? 1 : 0);
