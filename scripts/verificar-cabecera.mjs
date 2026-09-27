/**
 * **Venir por la otra punta**: lo que dice la torre, y cuándo.
 *
 * «No pasa nada por aterrizar en una cabecera o en otra (rojo, verde) y
 * debería estar avisado, y en relación al viento y el tipo de vuelo.» Las
 * pruebas de `la-otra-cabecera.test.ts` miran la máquina; esto la mira en el
 * juego, con la torre de verdad, en tres vuelos:
 *
 * 1. **Viento flojo de cara en la de uso**: quien se alinea con la otra oye
 *    la pista en uso y, si sigue, la orden de irse al aire por la pista en
 *    uso —no «runway occupied», que la pista está libre—. Y al irse, la
 *    frustrada se celebra, como todas.
 * 2. **Con viento fuerte**, por la otra punta sopla de cola por encima del
 *    límite del avión, y el porqué que se dice es ése.
 * 3. **Sin motor**, la torre no manda a nadie al aire: da esa pista, con su
 *    número.
 *
 * Uso: `node scripts/verificar-cabecera.mjs [escenario] [tramo] [avion]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const ESCENARIO = process.argv[2] ?? "gran-canaria";
const TRAMO = process.argv[3] ?? "taguato";
const AVION = process.argv[4] ?? "jaz-90";
const PUERTO = 5333;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
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

try {
  const page = await navegador.newPage({
    viewport: { width: 900, height: 600 },
    locale: "es-PY",
  });
  page.on("pageerror", (e) => console.log("ERROR:", e.message));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=16&avion=${AVION}&tramo=${TRAMO}&teselas=0`,
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
    timeout: 90000,
  });
  await page.waitForTimeout(12000);
  await page.keyboard.press("i");
  await page.waitForTimeout(1500);

  /**
   * Un vuelo por la otra punta: se pone el viento, se coloca el avión en su
   * final a `lejos` metros y `alto` sobre la pista, y un piloto de banco baja
   * por la senda hasta que la torre lo manda al aire —y entonces se va— o
   * hasta los cuarenta metros. Devuelve lo que se dijo por el camino.
   */
  const vuelo = (viento, sinMotor) =>
    page.evaluate(
      async ({ viento, sinMotor, id }) => {
        const o = globalThis.__oga;
        const espera = (ms) => new Promise((res) => setTimeout(res, ms));
        o.reiniciar();
        await espera(1500);
        o.ponerViento(viento.de, viento.kt);
        await espera(800);
        o.acelerar?.(3);
        o.aterrizarPorLaOtraPunta(id);
        const umbral = o.puntoDeFinalDe(0, id);
        const cota = o.cotaDePistaDeAhora(umbral.x, umbral.z);
        // Fuera del embudo de final, a tiempo para oír la pista en uso.
        const lejos = 6500;
        const p = o.puntoDeFinalDe(lejos, id);
        const planeo = o.planeo();
        const v = sinMotor ? planeo.velocidad : planeo.vref * 1.3;
        const alto = 360;
        const antes = {
          instructor: o.dichoTodo().instructor.length,
          torre: o.dichoTodo().torre.length,
          comandante: (o.dichoTodo().comandante ?? []).length,
          descartadas: o.descartadas().length,
        };
        o.colocar(p.x, cota + alto, p.z, v, p.h);
        // Reiniciar deja el motor apagado en el puesto: en el aire, en marcha.
        o.controles().engineOn = true;
        // Y configurado para aterrizar: sin flaps, a esta velocidad se entra
        // en pérdida al irse al aire.
        o.pedirFlaps(1);
        // Sin motor de verdad: con gas hasta que se acaba el medio kilo.
        if (sinMotor) o.ponerCombustible(0.5);
        const error = (a, b) => {
          let e = a - b;
          while (e > Math.PI) e -= 2 * Math.PI;
          while (e < -Math.PI) e += 2 * Math.PI;
          return e;
        };
        let mandado = false;
        let seFue = false;
        let loMasBajo = Infinity;
        o.pilotar((c) => {
          const s = o.estado();
          const deseado = Math.atan2(umbral.x - s.position.x, -(umbral.z - s.position.z));
          const e = error(deseado, s.heading);
          const tope = (20 * Math.PI) / 180;
          const quiere = Math.max(-tope, Math.min(tope, e * 1.5));
          c.aileron = Math.max(-0.35, Math.min(0.35, (quiere - o.actitud().alabeo) * 1.6));
          c.rudder = 0;
          const sobre = s.position.y - cota;
          const u = Math.hypot(s.position.x - umbral.x, s.position.z - umbral.z);
          if (seFue) {
            /*
             * La frustrada: gas y a subir, pero sin comerse la velocidad. Tirar
             * a secas metió al primer piloto de este banco en pérdida.
             */
            c.throttle = 1;
            const quiereVs = s.airspeed < planeo.vref * 1.25 ? 0 : 6;
            c.elevator = Math.max(-0.2, Math.min(0.3, (quiereVs - s.verticalSpeed) * 0.08));
            return;
          }
          // Por la senda de tres grados, con el gas a la velocidad.
          const senda = u * Math.tan((3 * Math.PI) / 180);
          const quiereVs = Math.max(-8, Math.min(2, (senda - sobre) * 0.1 - 4));
          c.elevator = Math.max(-0.3, Math.min(0.3, (quiereVs - s.verticalSpeed) * 0.08));
          c.throttle = sinMotor
            ? o.sinMotor()
              ? 0
              : 1
            : Math.max(0, Math.min(1, 0.35 + (v - s.airspeed) * 0.05));
        });
        const t0 = performance.now();
        const traza = [];
        let siguiente = 0;
        while (performance.now() - t0 < 60000) {
          await espera(100);
          const s = o.estado();
          const sobre = s.position.y - cota;
          if (performance.now() - t0 > siguiente) {
            siguiente += 1500;
            const u = Math.hypot(s.position.x - umbral.x, s.position.z - umbral.z);
            traza.push(
              `${Math.round(u)} m · ${Math.round(sobre)} alto · ${Math.round(s.airspeed * 1.943844)} kt · ` +
                `${s.verticalSpeed.toFixed(1)} vs · ${Math.round((s.heading * 180) / Math.PI)}° · ` +
                `manda ${o.aproximacionManda()} · sin motor ${o.sinMotor()}${s.onGround ? " · suelo" : ""}`,
            );
          }
          if (o.aproximacionManda() && !mandado) {
            mandado = true;
            if (!sinMotor) seFue = true;
          }
          if (!seFue) loMasBajo = Math.min(loMasBajo, sobre);
          if (seFue && sobre > loMasBajo + 120) break;
          if (!seFue && sobre < 40) break;
          if (o.percance()) break;
        }
        /*
         * Un rato más, para que se oiga lo que la subida dispara: la boca es
         * una y va por turnos —la lámpara, la torre, la instructora y la
         * frustrada, por ese orden—, y el historial apunta al empezar a sonar.
         */
        await espera(12000);
        o.pilotar(null);
        o.aterrizarPorLaOtraPunta(null);
        const todo = o.dichoTodo();
        return {
          traza,
          descartadas: o.descartadas().slice(antes.descartadas),
          comandante: (todo.comandante ?? []).slice(antes.comandante),
          mandado,
          seFue,
          sinMotor: o.sinMotor(),
          instructor: todo.instructor.slice(antes.instructor),
          torre: todo.torre.slice(antes.torre),
          cabecera: o.cabecera?.() ?? null,
        };
      },
      { viento, sinMotor, id: ESCENARIO },
    );

  const contar = (nombre, v) => {
    if (!process.env.OGA_TRAZA) return;
    console.log(`\n  ${nombre}`);
    for (const l of v.traza) console.log(`    ${l}`);
    console.log(`    instructora: ${v.instructor.join(" · ")}`);
    console.log(`    torre: ${v.torre.join(" · ")}`);
    console.log(`    comandante: ${v.comandante.join(" · ")}`);
    for (const l of v.descartadas) console.log(`    descartada ${l}`);
  };
  const dice = (lista, trozo) => lista.some((k) => String(k).includes(trozo));
  /*
   * **Pedida**, que no es lo mismo que oída: lo que se comprueba aquí es que
   * el juego decide decirla. Si luego cabe en la boca es cosa de la boca —una
   * sola para las cuatro voces, con su cola y sus caducidades—, y en este
   * banco la frecuencia llega revuelta por los reinicios. Lo que se pidió y
   * no sonó sale en `descartadas`, con el porqué. Ver `audio/boca.ts`.
   */
  const pedida = (v, trozo) =>
    dice(v.instructor, trozo) || dice(v.descartadas, trozo);
  const cuales = (lista, re) => lista.filter((k) => re.test(k)).join(" · ") || "nada";

  // La 03 de Gando con cinco nudos de cara: por la 21, cinco de cola.
  const flojo = await vuelo({ de: 30, kt: 5 }, false);
  contar("viento flojo", flojo);
  const conFraseologia = TRAMO === "taguato" || TRAMO === "taguato-ruvicha";
  comprobar(
    "por la otra punta, lejos: la pista en uso",
    conFraseologia
      ? dice(flojo.torre, "pistaEnUso")
      : pedida(flojo, "vuelo.laOtraPunta"),
    cuales([...flojo.torre, ...flojo.instructor, ...flojo.descartadas], /pistaEnUso|laOtraPunta/),
  );
  comprobar(
    "y si sigue, al aire por la pista en uso, no por ocupada",
    flojo.mandado &&
      dice(flojo.torre, "alAire") &&
      (!conFraseologia || dice(flojo.torre, "goAroundEnUso")) &&
      !dice(flojo.torre, "goAround@") &&
      (TRAMO === "taguato-ruvicha" || pedida(flojo, "vuelo.alAireOtraPunta")),
    cuales([...flojo.torre, ...flojo.instructor, ...flojo.descartadas], /goAround|alAire/),
  );
  comprobar(
    "y irse al aire se celebra, como todas",
    pedida(flojo, "vuelo.frustrada"),
    cuales([...flojo.instructor, ...flojo.descartadas], /frustrada/),
  );

  // Dieciocho nudos de cara en la de uso son dieciocho de cola en la otra.
  const fuerte = await vuelo({ de: 30, kt: 18 }, false);
  contar("viento fuerte", fuerte);
  comprobar(
    "con viento de cola de más, el porqué es el viento",
    fuerte.mandado &&
      (TRAMO === "taguato-ruvicha" || pedida(fuerte, "alAireVientoDeCola")),
    cuales([...fuerte.instructor, ...fuerte.descartadas], /alAire/),
  );

  const sinMotor = await vuelo({ de: 30, kt: 5 }, true);
  contar("sin motor", sinMotor);
  comprobar(
    "sin motor, nadie lo manda al aire",
    !sinMotor.mandado,
    sinMotor.mandado ? "se mandó" : "ninguna orden",
  );
  comprobar(
    "y la torre da esa pista, con su número",
    dice(sinMotor.torre, "aterrizar") || dice(sinMotor.torre, "clearedLand"),
    cuales(sinMotor.torre, /aterrizar|clearedLand|mayday/),
  );
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
