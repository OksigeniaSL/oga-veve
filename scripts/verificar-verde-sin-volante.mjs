/**
 * **Con la luz verde y sin tocar el volante**, en el peldaño de los de cuatro
 * años: ¿llega el avión a la pista, o se va contra algo?
 *
 * En Guyrami el juego conduce por las calles: quien juega pone gas y la
 * ayuda de rodaje sigue la raya verde. Se encontró de paso que, en Silvio
 * Pettirossi, **tras la luz verde** el avión se seguía recto hasta un
 * edificio: la ayuda no tomaba la curva de entrada a la pista. Un niño de
 * cuatro años no la gira solo, y ese peldaño promete llevarle.
 *
 * Aquí se rueda como rodaría él: gas hasta el punto de espera —el juego
 * frena y conduce—, parar con la luz roja y, con la verde, **gas y nada
 * más**: ni volante ni timón. Dos gases, porque son los dos que haría:
 * dejar la palanca donde estaba —en la marca de rodaje— o subirla a fondo,
 * que es lo que un crío entiende por «¡verde!». Se mira qué pasa desde la
 * verde hasta estar alineado en la pista o hasta chocar.
 *
 * Uso: `node scripts/verificar-verde-sin-volante.mjs [escenarios] [avión]`
 *   escenarios separados por comas; por defecto, pettirossi.
 *   `OGA_GAS=rodaje,fondo` qué gases se prueban con la verde.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const ESCENARIOS = (process.argv[2] ?? "pettirossi").split(",");
const AVION = process.argv[3] ?? "jaz-20";
const GASES = (process.env.OGA_GAS ?? "rodaje,fondo").split(",");
const RELOJ = 3;
/**
 * Cuánto se deja rodar, s de juego: el rodaje de Los Rodeos con el JAZ 120,
 * del puesto a la cabecera 30, no cabe en los diez minutos de Pettirossi.
 */
const TIEMPO = Number(process.env.OGA_TIEMPO ?? 600);
const PUERTO = 5243;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

/**
 * Abre una partida y espera a que haya raya, **con un reintento**: con la
 * máquina cargada —otro banco volando al lado— un escenario gordo puede
 * tardar más de dos minutos en pintar la primera vez, y un banco que revienta
 * por eso a mitad de dieciocho campos no dice nada del juego. Es lo mismo que
 * hace `partida` en `verificar-asistencia`.
 */
async function abrir(escenario, errores) {
  for (let intento = 0; ; intento++) {
    const page = await navegador.newPage({
      viewport: { width: 1000, height: 620 },
    });
    page.on("pageerror", (e) => errores.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
    });
    try {
      await page.goto(
        `${BASE}/?escenario=${escenario}&hora=16&leccion=despegue` +
          `&tramo=guyrami&avion=${AVION}&meteo=`,
      );
      await page.waitForFunction(
        () => globalThis.__oga?.ruta().length > 1,
        null,
        { timeout: 120000 },
      );
      await page.waitForTimeout(1500);
      return page;
    } catch (e) {
      await page.close();
      if (intento >= 1) throw e;
      console.log(`  (${escenario}: la partida no llegó a pintar; se repite)`);
    }
  }
}

try {
  for (const escenario of ESCENARIOS)
    for (const gas of GASES) {
      const errores = [];
      const page = await abrir(escenario, errores);

      const r = await page.evaluate(
        async ([gas, RELOJ, TIEMPO]) => {
          const o = globalThis.__oga;
          o.acelerar(RELOJ);
          const espera = (ms) => new Promise((r) => setTimeout(r, ms));
          let fase = "arrancar";
          let verdeEn = null;
          let gasDeRodaje = o.palancaDeGas().marcas[1] ?? 0.3;
          /*
           * Solo gas y freno: el volante no se toca **nunca**. El gancho corre
           * antes que la ayuda de rodaje, así que lo que se deja a cero aquí
           * es lo de quien juega, y la ayuda suma lo suyo encima.
           */
          o.pilotar((c) => {
            c.engineOn = true;
            c.aileron = 0;
            c.rudder = 0;
            c.elevator = 0;
            if (fase === "arrancar" || fase === "rodar") {
              c.throttle = gasDeRodaje;
              c.brakes = 0;
            } else if (fase === "esperar") {
              c.throttle = 0;
              c.brakes = 1;
            } else {
              c.throttle = gas === "fondo" ? 1 : gasDeRodaje;
              c.brakes = 0;
            }
          });
          /** Lo más lejos de la raya, desde la verde. */
          let lejos = 0;
          let lejosDonde = "";
          let mas = 0;
          const traza = [];
          const empezo = o.reloj();
          let fin = null;
          const alRaya = (x, z) => {
            const ruta = o.ruta();
            // Sin raya —ya despegando— no hay de qué apartarse.
            if (ruta.length < 2) return 0;
            let d = Infinity;
            for (let i = 0; i + 1 < ruta.length; i++) {
              const [ax, az] = ruta[i];
              const [bx, bz] = ruta[i + 1];
              const dx = bx - ax;
              const dz = bz - az;
              const l2 = dx * dx + dz * dz || 1;
              const t = Math.max(
                0,
                Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2),
              );
              d = Math.min(d, Math.hypot(ax + dx * t - x, az + dz * t - z));
            }
            return d;
          };
          while (o.reloj() - empezo < TIEMPO) {
            await espera(100);
            const s = o.estado();
            const f = o.fase();
            const t = o.reloj() - empezo;
            if (o.percance()) {
              fin = `percance «${o.percance()}» a los ${t.toFixed(0)} s en ${f}`;
              break;
            }
            if (fase === "arrancar" && s.onGround) fase = "rodar";
            /*
             * Parar en el punto de espera es cosa de quien juega también en
             * Guyrami: se frena a la distancia a la que un frenazo suave
             * deja el avión en la doble raya, como en `verificar-dedo`.
             */
            if (fase === "rodar") {
              const r = o.rodajeAsi();
              const v = Math.hypot(s.velocity.x, s.velocity.z);
              if (
                f === "esperando" ||
                (r.fase === "rodando" &&
                  r.restante >= 0 &&
                  r.restante < (v * v) / 3 + 6)
              )
                fase = "esperar";
            }
            if (fase === "esperar" && o.luzVerde()) {
              fase = "verde";
              verdeEn = t;
            }
            if (fase === "verde") {
              const v = Math.hypot(s.velocity.x, s.velocity.z);
              mas = Math.max(mas, v);
              const d = alRaya(s.position.x, s.position.z);
              if (d > lejos) {
                lejos = d;
                lejosDonde = `${f} a ${v.toFixed(1)} m/s, ${(t - verdeEn).toFixed(1)} s tras la verde`;
              }
              if (traza.length === 0 || Math.round((t - verdeEn) * 10) % 50 === 0) {
                const ruta = o.ruta();
                const p = o.pistaDeAhora?.() ?? o.pista();
                traza.push(
                  `RUTA ${ruta.length} puntos: ${ruta
                    .filter((_, i) => i % Math.max(1, Math.floor(ruta.length / 12)) === 0 || i === ruta.length - 1)
                    .map((q) => `(${q[0].toFixed(0)},${q[1].toFixed(0)})`)
                    .join(" ")} · avión (${s.position.x.toFixed(0)},${s.position.z.toFixed(0)}) · pista ${p.heading}° en (${p.x.toFixed(0)},${p.z.toFixed(0)}) · backTaxi ${JSON.stringify(o.backTaxi?.() ?? null)}`,
                );
              }
              if (traza.length < 400)
                traza.push(
                  `${(t - verdeEn).toFixed(1)}s ${f} v${v.toFixed(1)} raya${d.toFixed(1)} rumbo${((s.heading * 180) / Math.PI).toFixed(0)} pista${s.onRunway ? 1 : 0} ail${o.controles().aileron.toFixed(2)} gas${o.controles().throttle.toFixed(2)}`,
                );
              if (["despegando", "comprometido", "en-vuelo"].includes(f)) {
                fin = `llegó a «${f}» a los ${(t - verdeEn).toFixed(0)} s de la verde`;
                break;
              }
              /*
               * Y **parado** también es una respuesta, si lo es a propósito: el
               * peldaño puede preferir esperar a que se gire. Se da por tal un
               * avión quieto más de veinte segundos con la verde.
               */
            }
            if (fase === "verde" && t - verdeEn > 150) {
              fin = `a los 150 s de la verde seguía en «${f}»`;
              break;
            }
          }
          o.pilotar(null);
          return {
            fin: fin ?? `se acabó el tiempo en ${fase}/${o.fase()}`,
            verdeEn,
            lejos: +lejos.toFixed(1),
            lejosDonde,
            mas: +mas.toFixed(1),
            percance: o.percance(),
            gasDeRodaje,
            traza,
          };
        },
        [gas, RELOJ, TIEMPO],
      );
      if (process.env.OGA_TRAZA) console.log(r.traza.join("\n"));
      comprobar(
        `${escenario} · ${AVION} · con la verde, gas ${gas} y sin volante: a la pista y sin chocar`,
        r.verdeEn !== null && !r.percance && /llegó a/.test(r.fin) && r.lejos < 20,
        `${r.fin} · lo más lejos de la raya ${r.lejos} m (${r.lejosDonde}) · lo más rápido ${r.mas} m/s` +
          (errores.length ? ` · errores: ${errores.join(" | ")}` : ""),
      );
      await page.close();
    }
} finally {
  await navegador.close();
  await server.close();
}

console.log("");
for (const r of resultados)
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);
process.exit(bien === resultados.length ? 0 : 1);
