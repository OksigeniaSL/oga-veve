/**
 * Cuando el viento gira, ¿se muda **todo** a la otra cabecera?
 *
 * Un aeródromo se usa por la cabecera que da la cara al viento, y eso cambia
 * media docena de cosas a la vez: por dónde se rueda, dónde están las luces de
 * aproximación, hacia dónde apunta el plano, y por dónde se entra a aterrizar.
 * Cada una vive en su sitio y se rehace por su cuenta, así que **el fallo
 * natural aquí es que una se quede atrás** — y no avisa: el juego sigue
 * funcionando, midiendo contra algo que está en el otro extremo del campo.
 *
 * Pasó con la senda de aros. `RunwayGuide` hornea la pista en su geometría al
 * construirse, y el cambio de tiempo rehacía el aeródromo, las luces, el plan
 * de rodaje y el plano — todo menos ella. Con el viento girado, los aros
 * quedaban en la cabecera contraria y el juego seguía dando por buenos los
 * cruces: «pasaste por debajo del aro» desde el extremo que no era.
 *
 * Uso: `node scripts/verificar-viento.mjs [escenario]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const PUERTO = 5297;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const page = await navegador.newPage({ viewport: { width: 900, height: 600 } });
page.on("pageerror", (e) => console.log("ERROR:", e.message));
await page.addInitScript(() =>
  localStorage.setItem("oga-veve:teclas-vistas", "1"),
);
await page.goto(
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=aterrizaje&tramo=guyrami`,
);
await page.bringToFront();
await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
  timeout: 60000,
});
await page.waitForTimeout(14000);

const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

/** Todo lo que depende de por dónde se entra, de una sentada. */
const retrato = () =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const p = o.puntoDeFinal(0);
    return {
      cabecera: p?.cabecera ?? null,
      umbral: p ? [Math.round(p.x), Math.round(p.z)] : null,
      aros: o.dondeEmpiezaLaSenda?.() ?? null,
    };
  });

const antes = await retrato();
/*
 * Se le da la vuelta al viento: treinta nudos **en la cola** de la cabecera
 * que se usa ahora, que es lo que obliga a cambiarse a la otra. Treinta y no
 * cinco porque un aeródromo de verdad aguanta algo de viento en cola antes de
 * mover todas sus operaciones al otro extremo, y este juego también.
 */
const rumboContrario = await page.evaluate(async () => {
  const o = globalThis.__oga;
  // El rumbo con el que se sale hoy; el viento que lo estropea es el que viene
  // justo por detrás.
  const salida = ((o.puntoDeFinal(-1000)?.h ?? 0) * 180) / Math.PI;
  const de = Math.round((salida + 180 + 360) % 360);
  o.ponerViento(de, 30);
  await new Promise((res) => setTimeout(res, 2500));
  return de;
});
const despues = await retrato();

comprobar(
  "girar el viento cambia la cabecera en uso",
  antes.cabecera !== despues.cabecera,
  `${antes.cabecera} → ${despues.cabecera} · viento de ${rumboContrario}°`,
);

const movido = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : null);

comprobar(
  "y el umbral por el que se entra se muda al otro extremo",
  (movido(antes.umbral, despues.umbral) ?? 0) > 300,
  `${(movido(antes.umbral, despues.umbral) ?? 0).toFixed(0)} m`,
);

/*
 * Y la senda de aros con él. Es la que se quedaba atrás: el aro más lejano
 * tiene que aparecer al otro lado del campo, a más de una pista de distancia.
 */
comprobar(
  "y la senda de aros se muda con ella",
  (movido(antes.aros, despues.aros) ?? 0) > 300,
  antes.aros && despues.aros
    ? `${(movido(antes.aros, despues.aros) ?? 0).toFixed(0)} m · de ${antes.aros} a ${despues.aros}`
    : "no se pudo mirar la senda",
);

/*
 * Y el plan de rodaje sabe la nueva. No se mira que haya raya pintada —en el
 * puesto y con el motor parado todavía no la hay— sino que el plan sepa
 * llevar al avión al punto de espera de la cabecera nueva.
 */
/*
 * Y el plan de rodaje se rehace. No se mira que haya raya pintada —en el
 * puesto y con el motor parado todavía no la hay—, sino que el plan haya
 * vuelto a ponerse: la ruta al punto de espera de la cabecera nueva no es la
 * de antes ni de lejos.
 */
/*
 * **Y lo que falta por comprobar aquí**, cuando se pueda: que la raya de
 * rodaje lleve a la cabecera nueva. No cabe todavía porque en el puesto y
 * recién arrancado el plan no tiene raya pintada que mirar, y hacer que la
 * tenga es rodar de verdad — o sea, otro banco. La raya sí se rehace: lo mide
 * `verificar-vuelo-entero` en los nueve aeropuertos.
 */

console.log(`\n  viento · ${ESCENARIO}\n`);
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);
