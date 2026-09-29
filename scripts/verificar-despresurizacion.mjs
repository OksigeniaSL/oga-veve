/**
 * La cabina sin aire y el descenso de emergencia, **en el juego de verdad**.
 *
 * Las pruebas de `despresurizacion.test.ts` miden las cuentas y el motor de
 * vuelo; esto mira la cadena entera: se pone el avión en su crucero, se le va
 * el aire de la cabina con la sonda del ejercicio y un piloto de banco baja
 * como baja una tripulación —gas al ralentí, aerofrenos y la velocidad máxima
 * con el morro, ver `PilotoDelDescenso`—. Lo que tiene que pasar:
 *
 * - la cabina pasa de diez mil pies en un par de segundos y suena el aviso:
 *   la caja en el avión que la lleva, y la instructora detrás en los peldaños
 *   que explican —o ella sola, si el navegador no deja sonar la caja—;
 * - caen las máscaras: la tripulación lo cuenta al pasaje y la instructora
 *   cuenta por qué primero la tuya;
 * - la comandante avisa a la tripulación, y sale la tarjeta de qué hacer;
 * - se llega a la altura segura en lo que tarda un avión de verdad;
 * - y al llegar, la instructora, la comandante y la flecha al más cercano.
 *
 * Uso: `node scripts/verificar-despresurizacion.mjs [escenario] [tramo] [avion]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const ESCENARIO = process.argv[2] ?? "pettirossi";
const TRAMO = process.argv[3] ?? "taguato";
const AVION = process.argv[4] ?? "jaz-90";
const PUERTO = 5337;
/** El crucero de cada presurizado, m, y su verdadera allí, m/s: los de su ficha. */
const CRUCERO = { "jaz-60": [7600, 90], "jaz-90": [11000, 220], "jaz-120": [10700, 230] };
const [ALTO, VERDADERA] = CRUCERO[AVION] ?? CRUCERO["jaz-90"];

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
const comprobar = (nombre, ok, detalle) => resultados.push({ nombre, ok: !!ok, detalle });
const errores = [];

try {
  const page = await navegador.newPage({
    viewport: { width: 900, height: 600 },
    locale: "es-PY",
  });
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=16&avion=${AVION}&tramo=${TRAMO}&teselas=0`,
  );
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 90000 });
  await page.waitForTimeout(12000);
  await page.keyboard.press("i");
  await page.waitForTimeout(1500);

  const r = await page.evaluate(async ([crucero, verdadera]) => {
    const o = globalThis.__oga;
    const espera = (ms) => new Promise((res) => setTimeout(res, ms));
    // Lejos del campo, en el eje de su pista y a la altura de crucero del avión.
    const p = o.puntoDeFinal(60000);
    o.colocar(p.x, crucero, p.z, verdadera, p.h);
    o.pilotar((c) => {
      c.throttle = 0.55;
      c.elevator = 0;
    });
    await espera(3000);
    const antes = o.presurizacion();
    const dichoAntes = o.dichoTodo();
    const cuantos = Object.fromEntries(Object.entries(dichoAntes).map(([q, l]) => [q, l.length]));
    const pudo = o.despresurizar();
    o.volarElDescenso();
    o.acelerar?.(8);
    const tarjetas = new Set();
    const t0 = performance.now();
    let ahora = o.presurizacion();
    while (performance.now() - t0 < 150000) {
      await espera(200);
      ahora = o.presurizacion();
      const t = o.tarjeta();
      if (t.queda > 0) tarjetas.add(t.dibujo);
      if (ahora.descenso?.abajoEn != null) break;
    }
    /*
     * Y lo que se dice al llegar, que va detrás de lo que esté sonando y dura
     * lo suyo: el historial lo apunta al acabar. Hasta medio minuto.
     */
    o.acelerar?.(1);
    const dichoAlLlegar = () => {
      const t = o.dichoTodo();
      return (
        t.instructor.includes("vuelo.yaSeRespira") &&
        t.comandante.includes("comandante.yaSeRespira")
      );
    };
    for (let i = 0; i < 150 && !dichoAlLlegar(); i++) await espera(200);
    o.volarElDescenso(false);
    const todo = o.dichoTodo();
    const nuevo = Object.fromEntries(
      Object.entries(todo).map(([q, l]) => [q, l.slice(cuantos[q] ?? 0)]),
    );
    return {
      crucero,
      antes,
      pudo,
      ahora: o.presurizacion(),
      tarjetas: [...tarjetas],
      dicho: nuevo,
      maquina: o.maquina().slice(-20),
      ruta: o.rutaDelVuelo?.() ?? null,
      descartadas: o.descartadas().filter((d) => /Presion|primeroLaTuya|yaSeRespira|mascaras|alturaSegura|descensoDeEmergencia/.test(d)),
      habladas: o.habladas?.() ?? [],
    };
  }, [ALTO, VERDADERA]);

  const d = r.ahora.descenso;
  /*
   * Lo dicho entero y, para la instructora, también lo que empezó a sonar: el
   * historial apunta al acabar, y un aviso de tráfico de la caja puede cortar
   * una frase larga a la mitad. Empezada, se oyó.
   */
  const dice = (quien, trozo) =>
    (r.dicho[quien] ?? []).some((k) => String(k).includes(trozo)) ||
    (quien === "instructor" && r.habladas.some((h) => h.includes(` ${trozo}`)));
  const pies = (m) => Math.round(m / 0.3048);
  /*
   * Los reactores, por debajo de ocho mil pies; el turbohélice, con sus cinco
   * psi, por debajo del aviso de diez mil. Ver `cabina-presurizada.ts`.
   */
  const tope = AVION === "jaz-60" ? 10000 : 8000;
  comprobar(
    `arriba, la cabina va por debajo de ${tope} ft`,
    pies(r.antes.cabina) <= tope && !r.antes.despresurizada,
    `${pies(r.antes.cabina)} ft con el avión a ${pies(r.crucero)} ft`,
  );
  comprobar("la sonda dispara el ejercicio", r.pudo && d, `despresurizar() → ${r.pudo}`);
  if (d) {
    comprobar(
      "el aviso llega en un par de segundos, y las máscaras detrás",
      d.avisoEn - d.desde < 2 && d.mascarasEn !== null && d.mascarasEn - d.desde < 5,
      `aviso a ${(d.avisoEn - d.desde).toFixed(1)} s · máscaras a ${(d.mascarasEn - d.desde).toFixed(1)} s`,
    );
    const minutos = (d.segundos ?? Infinity) / 60;
    comprobar(
      `baja a ${pies(d.objetivo)} ft en lo que tarda uno de verdad`,
      minutos > 3 && minutos < 6,
      `${minutos.toFixed(2)} min desde ${pies(d.alturaAlEmpezar)} ft`,
    );
  }
  const laCaja = r.maquina.some((l) => l.includes("cabina.cabin"));
  comprobar(
    "suena el aviso: la caja, y la instructora con calma",
    dice("instructor", "vuelo.cabinaSinPresion") || (TRAMO === "taguato-ruvicha" && laCaja),
    `${laCaja ? "caja pedida · " : ""}${(r.dicho.instructor ?? []).slice(0, 4).join(" · ")}`,
  );
  if (TRAMO !== "taguato-ruvicha")
    comprobar(
      "y cuenta por qué primero la tuya",
      dice("instructor", "vuelo.primeroLaTuya."),
      (r.dicho.instructor ?? []).filter((k) => k.includes("primeroLaTuya")).join(" · ") || "no",
    );
  comprobar(
    "la megafonía: la tripulación con las máscaras, o la comandante",
    dice("tripulacion", "mascaras") || dice("comandante", "comandante.mascaras"),
    [...(r.dicho.comandante ?? []), ...(r.dicho.tripulacion ?? [])].join(" · "),
  );
  comprobar(
    "la tarjeta de la máscara y la de qué hacer",
    r.tarjetas.includes("mascara") && (r.tarjetas.includes("aerofrenos") || r.tarjetas.includes("descenso")),
    r.tarjetas.join(" · "),
  );
  comprobar(
    "y al llegar, ya se respira",
    dice("instructor", "vuelo.yaSeRespira") && dice("comandante", "comandante.yaSeRespira"),
    `${(r.dicho.instructor ?? []).slice(-2).join(" · ")} · ${(r.dicho.comandante ?? []).slice(-1).join("")}`,
  );
  comprobar("sin errores en la página", errores.length === 0, errores.slice(0, 3).join(" | ") || "ninguno");
  if (process.env.OGA_TRAZA) {
    console.log(JSON.stringify(r, null, 2));
  }
  console.log(`\n  ${ESCENARIO} · ${AVION} · ${TRAMO}`);
} finally {
  await navegador.close();
  await server.close();
}

console.log("");
for (const r of resultados) console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);
process.exit(bien === resultados.length ? 0 : 1);
