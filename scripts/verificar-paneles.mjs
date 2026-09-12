/**
 * Los paneles que se abren encima del vuelo, **con el avión volando**.
 *
 * `verificar-acceso` ya los abre uno a uno y mide el teclado, el foco y el
 * contraste. Lo que no puede medir es lo único que importa con el avión en el
 * aire, y es lo que #70 exige con estas palabras: «un panel abierto pausa el
 * vuelo o lo deja en vuelo recto; **nunca se cae el avión mientras alguien
 * está eligiendo gorra**».
 *
 * Hasta hoy no pasaba: abrir el plano en vuelo dejaba el avión volando solo
 * detrás del velo —ochenta y tres metros en los dos segundos que tarda
 * cualquiera en mirar dónde está— y volver era volver a un avión que ya no
 * estaba donde se dejó. Para quien tiene cuatro años eso no es una pausa: es
 * que el juego le quitó el avión.
 *
 * Y se mide por los seis a la vez, no por uno: el arreglo vive en la clase
 * `Panel`, así que lo que hay que comprobar es que **ninguno** se escapa. La
 * lista sale de la misma tabla que dibuja los botones, `ui/paneles.ts`, para
 * que un panel nuevo entre aquí sin que nadie se acuerde de meterlo.
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5281;
const ESCENARIO = process.argv[2] ?? "pettirossi";

/** Cuánto puede haberse movido el avión con un panel abierto. */
const LO_QUE_SE_PERDONA = 0.5;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO },
});
await server.listen();

// Con WebGL por software, como el resto de los bancos. Sin esto el juego no
// arranca su bucle y lo que se mediría es un avión congelado — o sea, verde
// por el motivo contrario al que se busca.
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const page = await navegador.newPage({
  viewport: { width: 900, height: 600 },
  locale: "es-PY",
});
page.on("pageerror", (e) => console.log("ERROR:", e.message));
await page.addInitScript(() =>
  localStorage.setItem("oga-veve:teclas-vistas", "1"),
);
await page.goto(
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&leccion=aterrizaje&tramo=taguato`,
);
// El juego se para cuando nadie mira, y «nadie mira» incluye una pestaña que
// nunca se trajo al frente. Ver `main.ts`.
await page.bringToFront();
await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
  timeout: 60000,
});
await page.waitForTimeout(14000);

const resultados = [];
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok, detalle });

const donde = () =>
  page.evaluate(() => {
    const p = globalThis.__oga.estado().position;
    return [p.x, p.y, p.z];
  });
/** Lo que ha sonado la concha desde la última vez que se preguntó. */
const sonido = () => page.evaluate(() => globalThis.__oga.sonido());
const separacion = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const rato = async (ms) => {
  const antes = await donde();
  await page.waitForTimeout(ms);
  return separacion(antes, await donde());
};

// Al aire, que es donde la pregunta tiene sentido.
await page.evaluate(() => {
  const o = globalThis.__oga;
  const e = o.estado();
  const { x, z } = e.position;
  o.colocar(x, o.suelo(x, z) + 300, z, 40);
});
await page.waitForTimeout(1500);

/*
 * **Primero, que el avión se mueva.**
 *
 * Sin esto todo lo demás sale verde con el juego roto: un avión que no vuela
 * tampoco vuela con un panel abierto. Es el fallo que ya tuvo el banco de
 * rodaje —cero metros rodados, tres veces en verde— y no se repite.
 */
const volando = await rato(2000);
comprobar(
  "con todo cerrado el avión vuela",
  volando > 20,
  `${volando.toFixed(1)} m en dos segundos`,
);

const paneles = await page.evaluate(() => globalThis.__oga?.paneles?.() ?? []);
comprobar(
  "el banco recorre todos los paneles de la tabla",
  paneles.length >= 6,
  `la tabla trajo ${paneles.length}`,
);

for (const { id, caja } of paneles) {
  const donde_ = id.replace(/-boton$/, "");
  await page.click(`[data-hud="${id}"]`);
  await page.waitForTimeout(500);
  const quieto = await rato(2000);
  comprobar(
    `${donde_}: abierto, el avión no se mueve`,
    quieto <= LO_QUE_SE_PERDONA,
    `${quieto.toFixed(1)} m en dos segundos`,
  );
  /*
   * Y **sin sacar el menú de pausa**, que es la diferencia entre parar y
   * echar a alguien de la partida. Quien abre el plano quiere mirar el plano,
   * no encontrarse cuatro botones encima preguntándole si sigue o se va.
   */
  const pausaFuera = await page.evaluate(
    () => document.querySelector("#pausa")?.hidden !== false,
  );
  comprobar(
    `${donde_}: y no sale el menú de pausa`,
    pausaFuera,
    pausaFuera ? "no sale" : "salió",
  );

  /*
   * **Y suena, con el vuelo congelado.**
   *
   * Es la parte que no se ve en pantalla y por eso hay que medirla aquí: el
   * vuelo se congela con un panel abierto, y la forma fácil de congelarlo
   * —suspender el contexto de audio, que es lo que se hace cuando nadie mira
   * la pestaña— deja la concha muda justo cuando alguien está recorriendo
   * opciones. No hay nada en la pantalla que lo delate. Ver
   * `Audio.callarElMundo` y #70.
   */
  const alAbrir = await sonido();
  comprobar(
    `${donde_}: al abrirlo suena`,
    alAbrir.concha.includes("abrir"),
    alAbrir.concha.join(" · ") || "no sonó nada",
  );
  comprobar(
    `${donde_}: y el sonido sigue vivo con el vuelo parado`,
    alAbrir.contexto === "running" && alAbrir.mundoCallado,
    `contexto ${alAbrir.contexto} · mundo ${alAbrir.mundoCallado ? "callado" : "sonando"}`,
  );
  /*
   * Y al pasar de un mando al siguiente. **Si hay un siguiente**: los
   * créditos y el cuaderno tienen un solo botón, así que el tabulador se
   * queda donde está y lo correcto ahí es que no suene nada. Un acuse de
   * recibo de un movimiento que no ocurrió es peor que el silencio.
   */
  const mandos = await page.evaluate(
    (sel) =>
      [
        ...(document
          .querySelector(sel)
          ?.querySelectorAll(
            'button, summary, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ) ?? []),
      ].filter((e) => !e.hasAttribute("disabled") && e.offsetParent !== null)
        .length,
    caja,
  );
  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
  const alMoverse = await sonido();
  comprobar(
    mandos > 1
      ? `${donde_}: y al pasar de un mando al siguiente`
      : `${donde_}: con un solo mando, el tabulador no suena`,
    mandos > 1
      ? alMoverse.concha.includes("mover")
      : !alMoverse.concha.includes("mover"),
    `${mandos} mando${mandos === 1 ? "" : "s"} · ${alMoverse.concha.join(" · ") || "no sonó nada"}`,
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  // Y si Escape no lo cerró, se cierra a mano: lo que se mide es el panel
  // siguiente. **La caja, no el botón** — para dos de ellos el `data-hud` de
  // la tabla es el del botón, y esconder el botón deja el panel fuera de
  // alcance para siempre.
  await page.evaluate((s) => {
    for (const sel of [s, "#pausa"]) {
      const c = document.querySelector(sel);
      if (c && !c.hidden) c.hidden = true;
    }
  }, caja);
  await page.waitForTimeout(400);
  // Y al cerrarlo vuelve a volar: una pausa de la que no se sale es un cuelgue.
  const alCerrar = await sonido();
  comprobar(
    `${donde_}: y al cerrarlo suena la vuelta`,
    alCerrar.concha.includes("cerrar"),
    alCerrar.concha.join(" · ") || "no sonó nada",
  );
  const otraVez = await rato(1500);
  comprobar(
    `${donde_}: al cerrarlo el avión vuelve a volar`,
    otraVez > 15,
    `${otraVez.toFixed(1)} m en segundo y medio`,
  );
}

/*
 * Y el cuarto sonido, el de elegir, que hace falta un mando que **no** cierre
 * el panel para poder oírlo. El de calma del tiempo sirve: cambia el viento y
 * deja el panel abierto.
 */
await page.click('[data-hud="tiempo-boton"]');
await page.waitForTimeout(500);
await sonido();
await page.click('[data-hud="tiempo-calma"]');
await page.waitForTimeout(300);
const alElegir = await sonido();
comprobar(
  "elegir algo dentro de un panel suena, y no suena a cierre",
  alElegir.concha.includes("elegir") && !alElegir.concha.includes("cerrar"),
  alElegir.concha.join(" · ") || "no sonó nada",
);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

console.log(`\n  paneles · ${ESCENARIO}\n`);
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);
