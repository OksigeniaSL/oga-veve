/**
 * Sin combustible es otro vuelo: **el planeo hasta una pista, de verdad**.
 *
 * Contado jugando, tras llegar planeando a Gando con el de fuselaje ancho:
 * «estuvo divertido, pero ¿cómo es que la instructora me dice que acelere, que
 * voy despacito?». Las pruebas de `sin-motor.test.ts` miran las cuentas; esto
 * mira la cadena entera en el juego: se coloca el avión en el aire, lejos de
 * la pista, se le deja el depósito con medio kilo y un piloto de banco planea
 * hasta ella a la velocidad de mejor planeo, como pediría la instructora.
 *
 * Lo que tiene que pasar:
 *
 * - el motor se para y el juego entra en el vuelo sin motor;
 * - la flecha va a la pista a la que se llega, y la instructora lo dice con
 *   calma —«no tenemos motor…»— y **nunca pide gas**;
 * - de Taguató para arriba la torre contesta al MAYDAY y, al alinearse, da la
 *   pista: «podés aterrizar» y «cleared to land»;
 * - nadie manda irse al aire en todo el planeo;
 * - y el avión llega y toca en la pista.
 *
 * Uso: `node scripts/verificar-planeo.mjs [escenario] [tramo] [avion] [metros]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const ESCENARIO = process.argv[2] ?? "gran-canaria";
const TRAMO = process.argv[3] ?? "taguato";
const AVION = process.argv[4] ?? "jaz-90";
/** A cuántos metros del umbral se coloca el avión, en su eje. */
const LEJOS = Number(process.argv[5] ?? 9000);
const PUERTO = 5331;

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
  // Con el motor en marcha: si no, el plan devuelve el avión a su puesto.
  await page.keyboard.press("i");
  await page.waitForTimeout(1500);

  const r = await page.evaluate(async (lejos) => {
    const o = globalThis.__oga;
    const espera = (ms) => new Promise((res) => setTimeout(res, ms));
    o.acelerar?.(4);
    const planeo = o.planeo();
    const umbral = o.puntoDeFinal(0);
    const cota = o.cotaDePistaDeAhora(umbral.x, umbral.z);
    const p = o.puntoDeFinal(lejos);
    /*
     * Alto de sobra para llegar, con la senda de tres grados y un poco: la
     * pista está a la vista y el planeo la alcanza. Lo que se mide no es si se
     * llega desde cualquier sitio, es qué hace el juego mientras se llega.
     */
    const alto = lejos * Math.tan((3.8 * Math.PI) / 180);
    o.colocar(p.x, cota + alto, p.z, planeo.velocidad, p.h);
    /*
     * La traza, desde que se coloca: cada segundo y medio, dónde está, cómo
     * vuela y qué piden los mandos. Sale si no llega, o con `OGA_TRAZA=1`.
     */
    const traza = [];
    const apuntar = setInterval(() => {
      const s = o.estado();
      const c = o.controles();
      traza.push(
        `${Math.round(Math.hypot(s.position.x - umbral.x, s.position.z - umbral.z))} m · ` +
          `${Math.round(s.position.y - cota)} alto · ${Math.round(s.airspeed * 1.943844)} kt · ` +
          `${s.verticalSpeed.toFixed(1)} vs · ${((o.actitud().cabeceo * 180) / Math.PI).toFixed(1)}° · ` +
          `${((o.actitud().alabeo * 180) / Math.PI).toFixed(1)}° alabeo · ` +
          `prof ${c.elevator.toFixed(2)} alerón ${c.aileron.toFixed(2)} gas ${c.throttle.toFixed(2)}` +
          `${o.sinMotor() ? " · sin motor" : ""}${s.onGround ? " · suelo" : ""}`,
      );
    }, 1500);
    const antes = {
      instructor: o.dichoTodo().instructor.length,
      torre: o.dichoTodo().torre.length,
      cantados: o.cantados().length,
    };
    /*
     * Medio kilo y gas hasta que se acaba: al ralentí, medio kilo dura lo que
     * dura un vuelo corto, y lo que se quiere ver es el momento de pararse.
     */
    o.pilotar((c) => {
      c.throttle = 1;
      c.elevator = 0;
    });
    o.ponerCombustible(0.5);
    for (let i = 0; i < 60 && !o.sinMotor(); i++) await espera(100);
    const alPararse = {
      sinMotor: o.sinMotor(),
      motor: o.controles().engineOn,
      ruta: o.rutaDelVuelo(),
    };

    /*
     * **El piloto de banco**, el mínimo que planea: el alerón hacia el eje por
     * el suelo, el timón de profundidad a la velocidad —la de mejor planeo
     * hasta los últimos tres kilómetros, y de ahí bajando hacia la de
     * aproximación con los flaps—, la recogida en los últimos metros y el
     * freno en el suelo. Sin gas, que no lo hay.
     */
    const error = (a, b) => {
      let e = a - b;
      while (e > Math.PI) e -= 2 * Math.PI;
      while (e < -Math.PI) e += 2 * Math.PI;
      return e;
    };
    const lejano = o.puntoDeFinal(-3000);
    /*
     * Pasado el umbral se apunta al fondo de la pista, y para siempre: con
     * el umbral detrás, «ir hacia el umbral» es dar la vuelta.
     */
    let yaPaso = false;
    const pasado = () => {
      if (yaPaso) return true;
      const s = o.estado();
      const hacia = (s.position.x - umbral.x) * Math.sin(umbral.h) - (s.position.z - umbral.z) * Math.cos(umbral.h);
      yaPaso = hacia > 0;
      return yaPaso;
    };
    const vref = planeo.vref;
    const vfe = planeo.vfeKt / 1.943844;
    let mandoAlAire = false;
    let toco = null;
    let bajo = Infinity;
    o.pilotar((c) => {
      const s = o.estado();
      c.throttle = 0;
      c.rudder = 0;
      const u = Math.hypot(s.position.x - umbral.x, s.position.z - umbral.z);
      const objetivo = u > 300 && !pasado() ? umbral : lejano;
      const deseado = Math.atan2(
        objetivo.x - s.position.x,
        -(objetivo.z - s.position.z),
      );
      const porSuelo = Math.hypot(s.velocity.x, s.velocity.z);
      const deriva =
        porSuelo > 5
          ? error(Math.atan2(s.velocity.x, -s.velocity.z), s.heading)
          : 0;
      const e = error(deseado - deriva, s.heading);
      if (s.onGround) {
        c.aileron = Math.max(-1, Math.min(1, e * 1.2));
        c.elevator = 0;
        c.brakes = 1;
        return;
      }
      const tope = (25 * Math.PI) / 180;
      const quiere = Math.max(-tope, Math.min(tope, e * 1.5));
      const alabeo = o.actitud().alabeo;
      c.aileron = Math.max(-0.35, Math.min(0.35, (quiere - alabeo) * 1.6));
      const sobre = s.position.y - cota;
      const objetivoV =
        u > 3000
          ? planeo.velocidad
          : Math.max(vref * 1.1, planeo.velocidad - (3000 - u) * 0.02);
      if (s.airspeed < vfe && u < 3500) o.pedirFlaps(1);
      const ganancia = Math.min(1, (90 / Math.max(1, s.airspeed)) ** 2);
      /*
       * **La bajada, no la velocidad.** Seguir la velocidad con el timón a
       * secas es una fugoide, y el primer piloto de este banco la hizo: de
       * subir a veintitrés metros por segundo a picar a ochenta grados. Se
       * sigue una senda de tres grados y medio hasta el umbral, que es lo que
       * hace quien ya tiene la pista hecha, con un suelo: si la velocidad baja
       * de la que toca, se baja la nariz aunque la senda diga otra cosa. Sin
       * motor, la velocidad no se recupera de ninguna otra forma.
       */
      // Apuntando cuatrocientos metros pista adentro, que es donde se toca.
      const senda = (u + (pasado() ? -400 : 400)) * Math.tan((3.5 * Math.PI) / 180);
      let quiereVs = Math.max(
        -14,
        Math.min(0, -s.airspeed * Math.sin((3.5 * Math.PI) / 180) + (senda - sobre) * 0.08),
      );
      if (s.airspeed < objetivoV * 0.95) quiereVs = Math.min(quiereVs, -s.airspeed / planeo.fineza - 2);
      // La recogida: frenar la bajada, no la velocidad.
      if (sobre < 14) quiereVs = -1.2 - sobre * 0.08;
      const mando = Math.max(-0.3, Math.min(0.3, (quiereVs - s.verticalSpeed) * 0.08));
      c.elevator = sobre < 14 ? Math.max(-0.2, Math.min(0.6, 0.05 + mando * 1.5)) : mando * ganancia;
    });
    const t0 = performance.now();
    while (performance.now() - t0 < 150000) {
      await espera(100);
      const s = o.estado();
      if (o.aproximacionManda()) mandoAlAire = true;
      if (!s.onGround) bajo = Math.min(bajo, s.position.y - cota);
      if (s.onGround && toco === null)
        toco = { enPista: !!s.onRunway, velocidad: s.airspeed };
      if (o.percance()) break;
      if (s.onGround && s.groundSpeed < 0.5) break;
    }
    // Un momento parado, que es cuando se acaba el planeo.
    await espera(1000);
    o.pilotar(null);
    clearInterval(apuntar);
    const todo = o.dichoTodo();
    return {
      traza,
      alPararse,
      planeo,
      vref,
      toco,
      bajo,
      mandoAlAire,
      percance: o.percance(),
      sinMotorAlFinal: o.sinMotor(),
      instructor: todo.instructor.slice(antes.instructor),
      torre: todo.torre.slice(antes.torre),
      cantados: o.cantados().slice(antes.cantados),
      descartadas: o.descartadas(),
    };
  }, LEJOS);

  const dice = (lista, trozo) => lista.some((k) => String(k).includes(trozo));
  const nudos = (v) => Math.round(v * 1.943844);
  comprobar(
    "se para el motor y empieza el vuelo sin motor",
    r.alPararse.sinMotor && !r.alPararse.motor,
    `sinMotor ${r.alPararse.sinMotor} · motor ${r.alPararse.motor}`,
  );
  comprobar(
    "la flecha va a la pista a la que se llega",
    r.alPararse.ruta.flecha === ESCENARIO ||
      (r.alPararse.ruta.flecha === null &&
        r.alPararse.ruta.destino === ESCENARIO),
    JSON.stringify(r.alPararse.ruta),
  );
  comprobar(
    "la instructora lo dice con calma: «no tenemos motor…»",
    dice(r.instructor, "vuelo.sinMotor"),
    r.instructor.slice(0, 6).join(" · "),
  );
  comprobar(
    "y nunca pide gas",
    !dice(r.instructor, "lentoYBajo") &&
      !dice(r.cantados, "lentoYBajo") &&
      !dice(r.cantados, "airspeed low"),
    r.instructor.filter((k) => /lento|planeo/.test(k)).join(" · ") || "ni una",
  );
  if (TRAMO === "taguato" || TRAMO === "taguato-ruvicha") {
    comprobar(
      "la torre contesta el MAYDAY",
      dice(r.torre, "mayday"),
      r.torre.filter((k) => /mayday/i.test(k)).join(" · ") || "no",
    );
  }
  comprobar(
    "y al alinearse da la pista, con prioridad",
    dice(r.torre, "aterrizar") || dice(r.torre, "clearedLand"),
    r.torre.filter((k) => /aterrizar|clearedLand/.test(k)).join(" · ") || "no",
  );
  comprobar(
    "nadie manda irse al aire a quien no puede subir",
    !r.mandoAlAire,
    r.mandoAlAire ? "se mandó" : "ninguna orden",
  );
  comprobar(
    "y el avión llega y toca en la pista",
    r.toco?.enPista && !r.percance,
    r.toco
      ? `tocó ${r.toco.enPista ? "en la pista" : "fuera"} a ${nudos(r.toco.velocidad)} kt` +
          (r.percance ? ` · percance ${r.percance}` : "")
      : `no llegó · lo más bajo ${Math.round(r.bajo)} m`,
  );
  comprobar(
    "y parado en el suelo ya no es un planeo",
    !r.sinMotorAlFinal || !r.toco,
    `sinMotor al final ${r.sinMotorAlFinal}`,
  );
  if (process.env.OGA_TRAZA || !r.toco?.enPista) {
    for (const l of r.traza) console.log(`    ${l}`);
    for (const l of r.descartadas.filter((d) => /sinMotor|reserva|planeo|mayday/i.test(d)))
      console.log(`    descartada ${l}`);
  }
  console.log(
    `\n  ${ESCENARIO} · ${AVION} · ${TRAMO} · planeo a ${nudos(r.planeo.velocidad)} kt, fineza ${r.planeo.fineza.toFixed(1)}`,
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
