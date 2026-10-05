/**
 * **El «¿y ahora qué?», volado de punta a punta.**
 *
 * Enrique, llegando a La Palma a mil ochocientos pies y ciento noventa y siete
 * nudos: «ni sabía a qué velocidad debería ir ahora». La cadena del vuelo
 * —`src/flight/siguiente-paso.ts`— dice el paso siguiente en cada escalón, y
 * su prueba de unidad lo comprueba con un vuelo de mentira. Lo que esa prueba
 * no ve es el juego de verdad: el plan, la ventanilla que pone la torre, la
 * escalera de velocidades con su aire del día, el automático que baja por la
 * senda. Y el banco de vuelo entero no vuela el trayecto —salta a la final del
 * otro campo—, así que el crucero, el punto de descenso, los 250 y el área
 * terminal no los mide nadie.
 *
 * Esto sí: despega del aire cerca de la cabecera, sube con el automático hasta
 * el crucero del plan, lo sigue fijo a fijo —el automático de este juego lleva
 * el rumbo, no la ruta: la ruta la lleva este banco, como quien gira la rueda—,
 * baja por la senda del plan y entra en la final. Y **hace lo que se le pide**:
 * cuando un paso pide flaps o tren, los pone dos segundos después, como un
 * alumno aplicado. La velocidad la llevan los gases automáticos.
 *
 * Mira:
 *
 * - que salgan los escalones de un vuelo de verdad y en su orden —subir, el
 *   crucero, bajar, los flaps por su orden, el tren y la final—;
 * - que ninguno se diga dos veces;
 * - que nunca vayan dos pasos a la vez —el respiro de `ENTRE_PASOS`—;
 * - y que la instructora de la bajada no repita como consejo lo que acaba de
 *   pedir un paso: un suceso, una voz.
 *
 * Uso: `node scripts/verificar-escalones.mjs [avion] [tramo] [escenario] [destino]`.
 * Por defecto el JAZ 90 en Taguató, de Tenerife Norte a La Palma. Con
 * `OGA_VOCES=fichero` vuelca la línea de tiempo entera.
 */

import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const AVION = process.argv[2] ?? "jaz-90";
const TRAMO = process.argv[3] ?? "taguato";
const ESCENARIO = process.argv[4] ?? "tenerife-norte";
const DESTINO = process.argv[5] ?? "la-palma";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5353);
/** Cuántas veces más deprisa va el reloj del juego. */
const VECES = Number(process.env.OGA_VECES ?? 6);
/** El tope de vuelo, en segundos de juego. */
const TOPE = Number(process.env.OGA_TOPE ?? 2400);

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
const comprobar = (nombre, ok, detalle) => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

let vuelo = null;
try {
  const page = await navegador.newPage({ viewport: { width: 1100, height: 700 }, locale: "es-PY" });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  try {
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=${ESCENARIO}&hora=12&avion=${AVION}&tramo=${TRAMO}` +
        `&teselas=0&meteo=&viento=000/00&destino=${DESTINO}&leccion=despegue`,
    );
    await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 120000 });
    await page.waitForTimeout(8000);
    await page.keyboard.press("i");
    await page.waitForTimeout(2000);
    vuelo = await page.evaluate(
      async ([veces, tope]) => {
        const o = globalThis.__oga;
        const j = o.juegoParaTrazas();
        const { trueFromIndicated } = await import("/src/flight/atmosphere.ts");
        const { rumboHacia } = await import("/src/world/rumbo.ts");
        const espera = (ms) => new Promise((r) => setTimeout(r, ms));
        // El plan se hace en tierra, con su salida: se espera a que esté.
        for (let i = 0; i < 100 && !j.navegacion.plan; i++) await espera(100);
        const plan = j.navegacion.plan;
        if (!plan) return { error: "sin plan de vuelo" };
        const f0 = plan.fijos[0];
        const f1 = plan.fijos[1] ?? f0;
        const suelo = o.suelo(f0.x, f0.z);
        // En el aire sobre el primer fijo, por debajo de los mil quinientos
        // pies sobre el suelo, subiendo hacia el siguiente: como recién salido.
        const alto = suelo + 900 * 0.3048;
        const rumbo = rumboHacia(f0.x, f0.z, f1.x, f1.z);
        o.colocar(f0.x, alto, f0.z, trueFromIndicated(190 / 1.94384, alto, j.flight.aireDelDia()), rumbo);
        await espera(300);
        o.pedirTren(false);
        o.pedirFlaps(0);
        o.controles().throttle = 0.9;
        o.controles().trim = 0;
        await espera(300);
        o.pilotoAutomatico(true);
        const puesto = o.pilotoAutomatico();
        const reloj0 = o.reloj();
        o.acelerar(veces);
        const linea = [];
        const pasosVistos = [];
        let cantadosVistos = j.cantados.length;
        let pendiente = null;
        let soltado = null;
        let fin = "tope";
        /*
         * **Y la hora del plan, contra la de verdad.** Enrique, de
         * Fuerteventura a Gran Canaria: la comandante dijo quince minutos al
         * empezar a bajar y a los quince aún quedaban la final y la toma. Se
         * apunta lo que decía el plan al salir y en el punto de descenso, y lo
         * que tardó de verdad hasta tocar.
         */
        let horaAlSalir = null;
        let horaEnElTd = null;
        let horaAlSoltar = null;
        let tocoEn = null;
        while (o.reloj() - reloj0 < tope) {
          await espera(250);
          const t = +(o.reloj() - reloj0).toFixed(1);
          const s = j.flight.state;
          const progHora = j.navegacion.progreso;
          if (horaAlSalir === null && progHora && Number.isFinite(progHora.segundos))
            horaAlSalir = { t, s: progHora.segundos };
          if (horaEnElTd === null && j.navegacion.bajando && progHora && Number.isFinite(progHora.segundos))
            horaEnElTd = { t, s: progHora.segundos };
          const pies = Math.round(j.altitudIndicada() / 0.3048);
          const kt = Math.round(s.airspeed * 1.94384);
          // Los pasos nuevos, con su hora.
          const pasos = j.pasosParaBanco;
          if (pasos.length > pasosVistos.length) {
            for (const p of pasos.slice(pasosVistos.length)) {
              pasosVistos.push({ t, ...p, pies, kt });
              linea.push(`${t}s paso ${p.escalon}: ${p.que} → ${p.objetivo.kt} kt${p.objetivo.pies !== null ? ` · ${p.objetivo.pies} ft` : ""}${p.objetivo.muesca !== null ? ` · muesca ${p.objetivo.muesca}` : ""} [${pies} ft, ${kt} kt]`);
              if (p.que === "flaps" || p.que === "tren" || p.que === "recogerAerofrenos")
                pendiente = { p, en: t + 2 };
              /*
               * Y frenar bajando por la senda, con aerofrenos: es lo que pide
               * el paso en el reactor —ver `comoSeDice`—, y se hace igual.
               */
              // Y nunca con los flaps de la final por delante, como el juego.
              if (
                p.que === "frenar" &&
                s.verticalSpeed < -2.5 &&
                j.aircraft.aerofrenos !== null &&
                !/:(segundos-flaps|final):/.test(p.escalon)
              )
                pendiente = { p: { ...p, que: "aerofrenos" }, en: t + 2 };
            }
          } else if (pasos.length < pasosVistos.length) {
            pasosVistos.length = pasos.length;
          }
          // Lo que se cantó, con la hora de la vuelta en que se vio.
          const cantados = j.cantados;
          for (const c of cantados.slice(cantadosVistos))
            if (/^(consejo|gas de la final|paso )/.test(c)) linea.push(`${t}s ${c.split(" [")[0]}`);
          cantadosVistos = cantados.length;
          // Lo que pide el paso, hecho dos segundos después.
          if (pendiente && t >= pendiente.en) {
            // La palanca tiene tres puntos —recogida, armada, fuera—: un solo
            // toque desde abajo los arma, no los saca. Se pone donde se pide.
            if (pendiente.p.que === "tren") o.pedirTren(true);
            else if (pendiente.p.que === "aerofrenos") {
              o.ponerPalancaDeAerofrenos("fuera");
              linea.push(`${t}s el banco saca los aerofrenos`);
            } else if (pendiente.p.que === "recogerAerofrenos") {
              o.ponerPalancaDeAerofrenos("recogida");
              linea.push(`${t}s el banco recoge los aerofrenos`);
            } else o.pedirFlaps((pendiente.p.objetivo.muesca ?? 0) / 3);
            pendiente = null;
          }
          // La ruta la lleva el banco: el rumbo al fijo que toca.
          const prog = j.navegacion.progreso;
          if (j.pilotoPuesto && prog && j.objetivos.rumbo !== null && j.modoLateral !== "LOC") {
            const r = rumboHacia(s.position.x, s.position.z, prog.siguiente.x, prog.siguiente.z);
            j.objetivos = { ...j.objetivos, rumbo: (r + 2 * Math.PI) % (2 * Math.PI) };
          }
          if (!j.pilotoPuesto && soltado === null) {
            soltado = t;
            // Y lo que decía el plan aquí, para medir hasta aquí y no a ojo.
            const p = j.navegacion.progreso;
            if (p && Number.isFinite(p.segundos)) horaAlSoltar = { t, s: p.segundos };
            linea.push(`${t}s el automático se suelta [${pies} ft, ${kt} kt] · FMA ${JSON.stringify(j.elFma())} · gases ${j.gasesPuestos}`);
          }
          if (s.onGround) {
            fin = "en tierra";
            tocoEn = t;
            break;
          }
          if (soltado !== null && t - soltado > 20) {
            fin = "suelto el automático";
            break;
          }
        }
        o.acelerar(1);
        return {
          puesto,
          fin,
          plan: {
            crucero: Math.round(j.navegacion.cruceroPlaneado / 0.3048),
            total: Math.round((j.navegacion.progreso?.total ?? 0) / 1852),
          },
          pasos: pasosVistos,
          linea,
          duro: +(o.reloj() - reloj0).toFixed(0),
          hora: { alSalir: horaAlSalir, enElTd: horaEnElTd, alSoltar: horaAlSoltar, toco: tocoEn },
          // Lo que pidió decir la instructora, por su clave. Ver el 154, abajo.
          dichas: [...(o.dichoTodo?.().instructor ?? [])],
          // Y lo que dijo la boca y lo que tiró, para saber por qué si calla.
          habladas: o.habladas?.() ?? [],
          descartadas: o.descartadas?.() ?? [],
        };
      },
      [VECES, TOPE],
    );
  } finally {
    if (errores.length) comprobar("sin errores en la página", false, errores.slice(0, 3).join(" | "));
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}

if (!vuelo || vuelo.error) {
  comprobar("el vuelo se pudo volar", false, vuelo?.error ?? "sin datos");
} else {
  console.log(
    `\n  ${AVION} en ${TRAMO}, ${ESCENARIO} → ${DESTINO}: crucero ${vuelo.plan.crucero} ft, ` +
      `${vuelo.duro} s de juego, acabó ${vuelo.fin}\n`,
  );
  for (const l of vuelo.linea) console.log(`    ${l}`);
  console.log("");
  const escalones = vuelo.pasos.map((p) => p.escalon);
  comprobar("el automático se puso", vuelo.puesto, "");
  /*
   * Los escalones de un vuelo de verdad, en su orden. El punto de nivelar y
   * los de velocidad dependen del perfil —si se nivela en la ventanilla antes
   * de la final, si el crucero pasa de diez mil pies—, y no se exigen. Ni el
   * crucero, si el punto de descenso llega antes de alcanzarlo: el JAZ 90 de
   * Guyrami sube más despacio, y entre islas no siempre llega arriba.
   */
  const ORDEN = ["subida", "crucero", "descenso", "flaps:1", "tren", "flaps:2", "flaps:3", "final"].filter(
    (e) =>
      (e !== "tren" || !/jaz-2[05]/.test(AVION)) &&
      (e !== "crucero" || escalones.includes("crucero")),
  );
  const enOrden = ORDEN.map((e) => escalones.indexOf(e));
  const faltan = ORDEN.filter((_, i) => enOrden[i] < 0);
  const desordenados = enOrden.filter((x) => x >= 0).some((x, i, l) => i > 0 && x < l[i - 1]);
  comprobar(
    "salen los escalones de un vuelo de verdad, en su orden",
    faltan.length === 0 && !desordenados,
    `${escalones.join(" → ")}${faltan.length ? ` · faltan: ${faltan.join(", ")}` : ""}`,
  );
  /*
   * **Y el punto de descenso, dicho donde la instructora explica.**
   *
   * El 154 de la lista: «ya existe el aviso `puntoDeDescenso`: comprobar que
   * suena en Guyrami». El T/D lo anuncia el paso `bajar` de la cadena, y en
   * los tres peldaños de abajo la instructora lo dice —con la grabada de
   * «empezamos a bajar» mientras la frase nueva no tenga voz—. Se mira aquí y
   * no en el vuelo entero porque aquel salta a la final del otro campo y no
   * pasa nunca por el T/D: allí un «no suena» no diría nada. En el peldaño de
   * cabina no habla nadie: es el mensaje de la pantalla, «TOP OF DESCENT».
   */
  {
    const canto = vuelo.linea.find((l) => /paso descenso: bajar \(/.test(l));
    const clave = canto ? / → (\S+)$/.exec(canto.trim())?.[1] ?? null : null;
    const deCabina = TRAMO === "taguato-ruvicha";
    const dicha =
      !!clave && (vuelo.dichas ?? []).some((c) => String(c).split(/[@~]/)[0] === clave);
    comprobar(
      "el punto de descenso suena donde la instructora explica",
      deCabina ? !!canto : !!canto && /^vuelo\./.test(clave ?? "") && dicha,
      !canto
        ? "el paso de bajar no salió"
        : `${canto.replace(/^[\d.]+s /, "")}${deCabina ? "" : dicha ? " · dicha" : " · no la pidió la instructora"}`,
    );
  }
  const repetidos = escalones.filter((e, i) => escalones.indexOf(e) !== i);
  comprobar("ninguno se dice dos veces", repetidos.length === 0, repetidos.join(", "));
  const juntos = [];
  for (let i = 1; i < vuelo.pasos.length; i++) {
    const a = vuelo.pasos[i - 1];
    const b = vuelo.pasos[i];
    // La hora es la de la vuelta del banco, que va de cuarto en cuarto de
    // segundo de pared: con el reloj acelerado, eso es más de un segundo de
    // juego de margen.
    if (b.t - a.t < 4 - 0.25 * VECES - 0.1) juntos.push(`${a.escalon} y ${b.escalon} a ${(b.t - a.t).toFixed(1)} s`);
  }
  comprobar("nunca dos pasos a la vez", juntos.length === 0, juntos.join(" · ") || `${vuelo.pasos.length} pasos`);
  /*
   * **Un suceso, una voz**: tras un paso que pide frenar —menos gas,
   * aerofrenos, flaps—, la instructora de la bajada no dice lo mismo como
   * consejo mientras el avión todavía no ha tenido tiempo de responder.
   */
  const repite = [];
  const tiempo = (l) => Number(l.split("s ")[0]);
  for (const l of vuelo.linea) {
    if (!/paso \S+: (frenar|flaps)/.test(l)) continue;
    const t0 = tiempo(l);
    for (const m of vuelo.linea)
      if (/^[\d.]+s consejo (menosGas|frenar)/.test(m) && tiempo(m) > t0 && tiempo(m) - t0 < 10)
        repite.push(`${l.split(" [")[0]} y ${m}`);
  }
  comprobar("la instructora de la bajada no repite lo que pidió el paso", repite.length === 0, repite.join(" · "));
  /*
   * **La hora del plan, contra la de verdad**: lo que decía al salir y en el
   * punto de descenso, frente a lo que se tardó hasta tocar. Un quince por
   * ciento: la comandante lo dice en múltiplos de cinco minutos, y un vuelo
   * con su viento y sus giros no se clava.
   */
  const h = vuelo.hora;
  /*
   * Hasta tocar si tocó; si no, hasta donde se soltó el automático, a
   * seiscientos pies, con lo que el plan decía que quedaba desde ahí.
   */
  const hasta = h?.toco != null ? { t: h.toco, s: 0 } : h?.alSoltar ?? null;
  if (hasta) {
    const parte = (desde) => {
      if (!desde || desde.t >= hasta.t) return null;
      const real = hasta.t - desde.t;
      const dijo = desde.s - hasta.s;
      return { dijo: dijo / 60, real: real / 60, error: (dijo - real) / real };
    };
    const salir = parte(h.alSalir);
    const td = parte(h.enElTd);
    const dice = (x) => (x ? `dijo ${x.dijo.toFixed(1)} min, tardó ${x.real.toFixed(1)} (${(x.error * 100).toFixed(0)} %)` : "—");
    comprobar(
      "la hora del plan cuadra con lo que se tarda",
      [salir, td].every((x) => !x || Math.abs(x.error) < 0.15),
      `al salir ${dice(salir)} · en el T/D ${dice(td)}`,
    );
  } else comprobar("la hora del plan cuadra con lo que se tarda", false, `no llegó a la final (${vuelo.fin})`);
  if (process.env.OGA_VOCES) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(process.env.OGA_VOCES, JSON.stringify(vuelo, null, 1));
  }
}

const mal = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - mal.length} de ${resultados.length}`);
process.exit(mal.length ? 1 : 0);
