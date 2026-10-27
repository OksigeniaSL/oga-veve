/**
 * **La turbulencia, de punta a punta**: el guion de cada ruta, el tope de cada
 * peldaño, el cartel y el aviso.
 *
 * Existe por un vuelo de El Hierro a La Gomera con el JAZ 60: «cuando hay
 * turbulencias no se enciende la luz del cinturón y no dice nada». Volado aquí
 * con el automático, por la ruta del plan y con el tiempo de casa, salió lo
 * que pasaba: la comandante soltaba el cinturón en la base del mar de nubes y
 * el avión cruzaba la capa subiendo con σ entre 0,45 y 0,75 y baches de ±0,24
 * g, con el cartel apagado de punta a punta. Ver `SACUDE` en
 * `src/flight/cinturon.ts`.
 *
 * Dos partes, y cada una se puede pedir sola:
 *
 * - **`guion`**: en tres rutas —El Hierro a La Gomera, Los Rodeos a Gando y
 *   Asunción a Encarnación— y en los cuatro peldaños, trescientos guiones con
 *   los datos de verdad del vuelo, sin volarlos (`guionDeTurbulencia` en
 *   `src/dev/sondas.ts`). Se mira que cumplan el tope del peldaño —`TOPES` y
 *   `HUECO` en `src/flight/guion-de-turbulencia.ts`—, que dos semillas
 *   seguidas no den el mismo vuelo, y se cuenta cuánto se menea cada ruta.
 * - **`vuelo`**: El Hierro a La Gomera con el JAZ 60, volado con el
 *   automático por la ruta, con una moderada prevista y una ligera de aire
 *   claro puestas en el camino. Se mira que el cartel esté encendido siempre
 *   que el aire sacude lo que lo enciende, que la comandante anuncie la
 *   moderada una vez y la ligera ninguna, y que el cartel se apague al pasar.
 *
 * Uso: `node scripts/verificar-turbulencia.mjs [guion|vuelo]`. Sin nada, las
 * dos. `OGA_PUERTO` para el puerto, como los demás bancos. Con
 * `OGA_DETALLE=1`, el perfil del vuelo lleva además lo que mira la megafonía
 * para soltar el cinturón y la cola de voces, cada `OGA_CADA` metros.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PARTE = process.argv[2] ?? "todo";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5371);
/** Cuántos guiones por ruta y peldaño. */
const GUIONES = Number(process.env.OGA_GUIONES ?? 300);
const RUTAS = [
  ["el-hierro", "la-gomera"],
  ["tenerife-norte", "gran-canaria"],
  ["pettirossi", "encarnacion"],
];
const TRAMOS = ["guyrami", "tuka", "taguato", "taguato-ruvicha"];
/*
 * El día y la hora, fijos: un banco que mide la hora a la que se corre no da
 * dos veces lo mismo. Enero a las cuatro: la tarde de verano del Paraguay y
 * el invierno de Canarias.
 */
const FECHA = process.env.OGA_FECHA ?? "2027-01-15";
const HORA = process.env.OGA_HORA ?? "16";

const server = await createServer({
  root: process.cwd(),
  // Sin vigilar ficheros: el banco no los cambia, y con muchos bancos a la vez se agotan.
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle) => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

/** Una página con el juego listo, en ese campo, con ese destino y peldaño. */
async function abrir(escenario, destino, tramo, avion = "jaz-60") {
  const page = await navegador.newPage({ viewport: { width: 900, height: 600 }, locale: "es-PY" });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=${escenario}&destino=${destino}&avion=${avion}&tramo=${tramo}` +
      `&hora=${HORA}&fecha=${FECHA}&teselas=0&meteo=&leccion=despegue`,
  );
  await page.waitForFunction(() => !!globalThis.__oga?.guionDeTurbulencia, null, { timeout: 120000 });
  // Que el plan esté hecho: el guion lo necesita.
  await page.waitForFunction(() => !!globalThis.__oga.planDeVuelo(), null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  return { page, errores };
}

try {
  if (PARTE === "todo" || PARTE === "guion") {
    console.log(`\n── El guion de cada ruta, en los cuatro peldaños (${GUIONES} vuelos de cada) ──`);
    for (const [escenario, destino] of RUTAS)
      for (const tramo of TRAMOS) {
        const { page, errores } = await abrir(escenario, destino, tramo);
        try {
          const r = await page.evaluate(async (cuantos) => {
            const { TOPES, HUECO, LA_FINAL } = await import("/src/flight/guion-de-turbulencia.ts");
            const o = globalThis.__oga;
            // Como saldrían uno detrás de otro por esta ruta. Ver `guionSiguiente`.
            const { datos, guiones } = o.guionesSeguidos(cuantos, 1);
            return { guiones, datos, tope: datos ? TOPES[datos.peldano] : null, HUECO, LA_FINAL };
          }, GUIONES);
          const { guiones, datos, tope, HUECO, LA_FINAL } = r;
          if (!datos) {
            comprobar(`${escenario}→${destino} ${tramo}: hay datos del vuelo`, false, "sin plan ni destino");
            continue;
          }
          const fallos = [];
          let conMeneo = 0;
          let episodios = 0;
          let moderadas = 0;
          let peorParte = 0;
          const causas = {};
          for (const g of guiones) {
            if (g.length) conMeneo++;
            episodios += g.length;
            if (g.length > tope.episodios) fallos.push(`${g.length} episodios`);
            let meneo = 0;
            for (let i = 0; i < g.length; i++) {
              const e = g[i];
              causas[e.causa] = (causas[e.causa] ?? 0) + 1;
              if (e.intensidad === "moderada") moderadas++;
              if (e.intensidad === "fuerte") fallos.push("fuerte");
              if (tope.fuerte === "ligera" && e.intensidad !== "ligera") fallos.push(e.intensidad);
              const dura = (e.hasta - e.desde) / datos.velocidad;
              if (dura > tope.dura + 1e-6) fallos.push(`${dura.toFixed(0)} s`);
              if (!tope.enLaFinal && e.hasta > datos.largo - LA_FINAL + 1e-6) fallos.push("en la final");
              if (i > 0 && (e.desde - g[i - 1].hasta) / datos.velocidad < HUECO - 1e-6)
                fallos.push("sin hueco");
              meneo += e.hasta - e.desde;
            }
            const parte = meneo / datos.largo;
            peorParte = Math.max(peorParte, parte);
            if (parte > tope.delVuelo + 1e-9) fallos.push(`${(parte * 100).toFixed(0)} % del vuelo`);
          }
          // Dos vuelos seguidos por la misma ruta no salen iguales: el mismo meneo en el mismo sitio.
          const igual = (a, b) =>
            a.length > 0 &&
            a.length === b.length &&
            a.every(
              (e, k) =>
                e.intensidad === b[k].intensidad &&
                Math.abs(e.desde - b[k].desde) < 2000 &&
                Math.abs(e.hasta - b[k].hasta) < 2000,
            );
          let iguales = 0;
          for (let i = 1; i < guiones.length; i++) if (igual(guiones[i], guiones[i - 1])) iguales++;
          const resumen =
            `${((conMeneo / guiones.length) * 100).toFixed(0)} % con meneo · ` +
            `${(episodios / guiones.length).toFixed(2)} episodios de media · ` +
            `${episodios ? ((moderadas / episodios) * 100).toFixed(0) : 0} % moderados · ` +
            `lo más, ${(peorParte * 100).toFixed(0)} % del vuelo · ` +
            `${Object.entries(causas).map(([c, n]) => `${c} ${n}`).join(", ") || "nada"} · ` +
            `${(datos.largo / 1000).toFixed(0)} km, ${datos.vientoKt} kt de ${datos.vientoDe ?? "—"}`;
          comprobar(
            `${escenario}→${destino} ${tramo} (${datos.peldano}): dentro del tope`,
            fallos.length === 0,
            fallos.length ? `${fallos.length} fuera: ${[...new Set(fallos)].slice(0, 4).join(", ")}` : resumen,
          );
          comprobar(`${escenario}→${destino} ${tramo}: dos vuelos seguidos no salen iguales`, iguales === 0, `${iguales} repetidos`);
          if (errores.length) comprobar(`${escenario}→${destino} ${tramo}: sin errores`, false, errores[0]);
        } finally {
          await page.close();
        }
      }
  }

  if (PARTE === "todo" || PARTE === "vuelo") {
    console.log("\n── El vuelo: El Hierro a La Gomera con el JAZ 60, con una moderada y una ligera ──");
    const { page, errores } = await abrir("el-hierro", "la-gomera", "tuka");
    try {
      await page.keyboard.press("i");
      await page.waitForTimeout(800);
      /*
       * Separadas lo bastante para que la primera pase antes de que se anuncie
       * la segunda —más que `AVISA_ANTES` volado—, y la segunda antes de la
       * bajada, que en esta ruta empieza hacia los cuarenta kilómetros.
       */
      const zonas = [
        { desde: 19000, hasta: 24000, intensidad: "moderada", como: "prevista", capa: null },
        { desde: 33000, hasta: 36000, intensidad: "ligera", como: "sin-avisar", capa: null },
      ];
      await page.evaluate(async (zonas) => {
        const o = globalThis.__oga;
        const j = o.juegoParaTrazas();
        const { SACUDE, YA_NO_SACUDE } = await import("/src/flight/cinturon.ts");
        globalThis.__umbral = { SACUDE, YA_NO_SACUDE };
        o.ponerTurbulencia(zonas);
        const p0 = o.puntoDeFinal(0);
        const p = o.puntoDeFinal(-3000);
        // Recién despegado, a trescientos metros sobre el campo y en el eje.
        o.colocar(p.x, p0.suelo + 300, p.z, 70, p0.h);
        await new Promise((r) => setTimeout(r, 300));
        o.pedirTren(false);
        o.pedirFlaps(0);
        await new Promise((r) => setTimeout(r, 300));
        o.pilotoAutomatico(true);
        /*
         * A seis mil pies, por encima del mar de nubes: el plan pone cuatro
         * mil, justo en la base de la capa —1226 m con el tiempo de casa—, y
         * ahí el aire se mueve todo el crucero y el cartel no se apaga nunca,
         * que es lo que haría una comandante de verdad, pero no deja ver lo
         * que pasa al cruzar una zona con el pasaje suelto.
         */
        if ("ventanillaAlt" in j) j.ventanillaAlt = 6000;
        /*
         * El piloto: el automático con el rumbo al punto del plan que toca, y
         * el gas a mano —el turbohélice no lleva gases automáticos—.
         */
        o.pilotar((c) => {
          const s = j.flight.state;
          const obj = j.objetivos;
          const pl = o.planDeVuelo();
          const fijo = pl?.fijos[pl.activo];
          if (fijo && j.pilotoPuesto && obj.rumbo !== null && j.modoLateral !== "LOC")
            j.objetivos = { ...obj, rumbo: Math.atan2(fijo.x - s.position.x, -(fijo.z - s.position.z)) };
          const subiendo = obj.altitud !== null && obj.altitud > s.position.y + 60;
          const bajando = obj.altitud !== null && obj.altitud < s.position.y - 60;
          const gas = j.flight.gasPara?.(75) ?? 0.6;
          c.throttle = subiendo ? 1 : bajando ? Math.max(0.15, gas - 0.25) : gas;
          /*
           * **Y a tiempo real mientras alguien habla o espera turno.** El
           * vuelo a ×16 comprime el juego y no el habla, que va con el reloj
           * de pared: es la trampa de `relojPara` en el banco del vuelo
           * entero. Medido en este vuelo al juntar la turbulencia con el
           * vuelo vivo: el anuncio de la moderada, pedido a los 12,9 km,
           * esperó en la cola detrás de la torre y la instructora y empezó a
           * sonar a los 21 km, ya dentro de la zona; sonó nueve segundos de
           * pared, que a ×9 eran ochenta de juego, y pasó la zona entera con
           * él hablando. Detrás esperaba «buscamos un nivel más tranquilo»
           * desde los 17 km, y «pueden soltarse el cinturón», listo desde que
           * pasó la moderada a los 25,6 km, agotó su ventana de dos minutos
           * de juego con la megafonía ocupada y no sonó nunca —o sonó a los
           * 36,7 km, después de la ligera—. A tiempo real, la cola entera es
           * cosa de veinte segundos y todo cae donde cae jugando.
           */
          const b = o.bocaAhora();
          const quiere = b.ocupada || b.espera.length ? 1 : 16;
          if (quiere !== globalThis.__reloj) {
            globalThis.__reloj = quiere;
            o.acelerar(quiere);
          }
        });
        globalThis.__t0 = o.reloj();
        globalThis.__reloj = 16;
        o.acelerar(16);
      }, zonas);
      const muestras = [];
      const pared = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, 120));
        const m = await page.evaluate(() => {
          const o = globalThis.__oga;
          const j = o.juegoParaTrazas();
          const s = o.estado();
          return {
            t: o.reloj() - globalThis.__t0,
            fase: o.fase(),
            agl: s.heightAboveGround,
            sigma: j.movimientoDelAire,
            cartel: j.cinturonPuesto,
            hud: !document.querySelector('[data-hud="cinturon"]')?.hidden,
            mando: j.cinturon.comoEsta,
            suelto: j.cinturon.pasajeSuelto,
            volado: j.turbulenciaDelVuelo.loVolado,
            bajando: j.megafonia.bajandoAlDestino,
            y: s.position.y,
            vs: s.verticalSpeed,
            // Lo que mira la megafonía para soltar el cinturón: ver `seDanLasCondiciones`.
            listo: j.megafonia.listoDesde.get("comandante.crucero") ?? 0,
            descenso: j.megafonia.descensoEmpezado,
            porPasar: j.turbulenciaDelVuelo.porPasarTodavia,
            movido: j.cinturon.sacudiendoAhora,
            boca: `${o.bocaAhora().ultima}|${o.bocaAhora().espera.join(",")}|${j.comandante.hablando ? "C" : ""}${j.tripulacion.hablando ? "T" : ""}${j.llamadas.length}`,
            n: s.loadFactor - 1,
            suelo: s.onGround,
          };
        });
        muestras.push(m);
        if (m.suelo || m.fase === "final" || m.volado > 42000 || Date.now() - pared > 20 * 60000) break;
      }
      const fin = await page.evaluate(() => {
        const o = globalThis.__oga;
        o.acelerar(1);
        o.pilotar(null);
        return { turb: o.turbulencia(), megafonia: o.megafonia(), umbral: globalThis.__umbral };
      });
      const { SACUDE } = fin.umbral;
      // El cartel, siempre que sacude lo que lo enciende, en el aire y con el mando en automático.
      const apagadoConBaches = muestras.filter(
        (m) => m.fase === "en-vuelo" && m.agl > 300 && m.mando === "auto" && m.sigma >= SACUDE && !m.cartel,
      );
      comprobar(
        "con baches que se notan, el cartel encendido",
        apagadoConBaches.length === 0,
        apagadoConBaches.length
          ? `${apagadoConBaches.length} muestras apagado, la primera a los ${apagadoConBaches[0].t.toFixed(0)} s con σ ${apagadoConBaches[0].sigma.toFixed(2)}`
          : `${muestras.length} muestras, hasta ${(muestras.at(-1).volado / 1000).toFixed(1)} km`,
      );
      // Y el dibujo, que es el canal que está en todos los peldaños.
      const distinto = muestras.filter((m) => m.cartel !== m.hud);
      comprobar("el dibujo del cartel dice lo mismo que el cartel", distinto.length <= 2, `${distinto.length} muestras distintas`);
      const enZona = (z) => muestras.filter((m) => m.volado >= z.desde + 500 && m.volado <= z.hasta - 500);
      for (const z of zonas) {
        const dentro = enZona(z);
        comprobar(
          `en la ${z.intensidad}, el cartel encendido`,
          dentro.length > 0 && dentro.every((m) => m.cartel),
          `${dentro.filter((m) => m.cartel).length} de ${dentro.length} muestras`,
        );
      }
      const anuncios = fin.megafonia.filter((h) => /comandante\.turbulencia(?:$|\.(?!paso))/.test(h));
      comprobar(
        "la moderada, anunciada una vez por la comandante; la ligera, sin megafonía",
        anuncios.length === 1,
        `megafonía: ${fin.megafonia.filter((h) => h.includes("turbulencia")).join(" · ") || "nada"}`,
      );
      const crucero = fin.megafonia.find((h) => h.includes("comandante.crucero"));
      comprobar("la comandante soltó el cinturón, y fuera de los baches", !!crucero, crucero ?? "no lo dijo");
      // Al pasar cada una, el cartel se apaga en seguida, o sigue porque ya se baja.
      const pasos = fin.turb.sucesos.filter((s) => s.suceso.que === "paso");
      const sinApagar = pasos.filter((p) => {
        const luego = muestras.filter((m) => m.volado >= p.volado + 200 && m.volado <= p.volado + 2500);
        return luego.length > 0 && !luego.some((m) => !m.cartel || m.bajando);
      });
      comprobar(
        "y al pasar cada una se apaga, o sigue porque ya se baja",
        pasos.length === zonas.length && sinApagar.length === 0,
        `sucesos: ${fin.turb.sucesos.map((s) => `${(s.volado / 1000).toFixed(1)} km ${s.suceso.que}${s.suceso.intensidad ? ` ${s.suceso.intensidad}` : ""}`).join(" · ")}`,
      );
      // El perfil, cada tres kilómetros: altura, σ, cartel y si el pasaje va suelto.
      let siguiente = 0;
      const perfil = [];
      for (const m of muestras)
        if (m.volado >= siguiente) {
          siguiente += Number(process.env.OGA_CADA ?? 3000);
          perfil.push(
            `${(m.volado / 1000).toFixed(0)} km ${m.y.toFixed(0)} m ${m.vs >= 0 ? "+" : ""}${m.vs.toFixed(1)} σ${m.sigma.toFixed(2)} ${m.cartel ? "■" : "□"}${m.suelto ? "s" : ""}` +
              (process.env.OGA_DETALLE ? ` [listo ${m.listo.toFixed(0)}${m.descenso ? " baja" : ""}${m.porPasar ? " porPasar" : ""}${m.movido ? " movido" : ""} ${m.boca}]` : ""),
          );
        }
      console.log(`  (perfil: ${perfil.join(" · ")})`);
      const peorN = Math.max(...muestras.map((m) => Math.abs(m.n)));
      console.log(`  (la mayor carga medida: ±${peorN.toFixed(2)} g)`);
      if (errores.length) comprobar("sin errores en la página", false, errores[0]);
    } finally {
      await page.close();
    }
  }
} finally {
  await navegador.close();
  await server.close();
}
const malos = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - malos} de ${resultados.length} bien`);
process.exit(malos ? 1 : 0);
