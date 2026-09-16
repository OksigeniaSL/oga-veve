/**
 * El cuadro de mandos de los seis aviones, mirado y medido.
 *
 * Existe por una frase: «esto no está centrado ni aunque venga Cristo y me lo
 * diga». Y por otra: «que cada aeronave parezca lo que es, que un 747 no
 * parezca un juguete». Las dos son cosas que **no se ven en una prueba
 * unitaria**: `familia.test.ts` comprueba que los repartos suman, pero un
 * reparto que suma se puede seguir dibujando torcido si el SVG lo escala mal o
 * si un rótulo se sale de su caja.
 *
 * Así que esto abre un navegador de verdad y mide lo que el navegador dibuja:
 *
 * 1. **Que el cuadro esté centrado**: lo que sobra por la izquierda tiene que
 *    ser lo que sobra por la derecha, con un píxel de tolerancia.
 * 2. **Que nada se salga**: ni un elemento del dibujo fuera de la caja.
 * 3. **Que cada avión sea el suyo**: la familia que le toca y tantas agujas de
 *    motor como motores tiene.
 * 4. **Que la información esté viva**: que las cifras digan algo y no se hayan
 *    quedado en blanco, que es como fallan estas cosas sin avisar.
 *
 * Y de paso saca la foto de los seis, que es lo único que contesta a «parece
 * lo que es».
 *
 * Uso: `node scripts/verificar-cuadro.mjs [fichero.png]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const SALIDA = process.argv[2] ?? "cuadros.png";
const PUERTO = 5294;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});
const page = await navegador.newPage({
  viewport: { width: 1200, height: 3600 },
});
page.on("pageerror", (e) => console.log("ERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLA:", m.text());
});

await page.goto(`http://localhost:${PUERTO}/scripts/ver-cuadros.html`);
await page.waitForFunction(() => globalThis.__listo === true, null, {
  timeout: 60000,
});

const partes = await page.evaluate(() => {
  const FAMILIA = {
    "jaz-20": "esferas",
    "jaz-25": "esferas",
    "jaz-40": "esferas",
    "jaz-60": "cristal",
    "jaz-90": "linea",
    "jaz-120": "linea",
  };
  const MOTORES = {
    "jaz-20": 1,
    "jaz-25": 1,
    "jaz-40": 2,
    "jaz-60": 2,
    "jaz-90": 2,
    "jaz-120": 4,
  };
  return [...document.querySelectorAll(".ficha")].map((ficha, i) => {
    const id = globalThis.__cuadros[i];
    const svg = ficha.querySelector("svg.tablero");
    const caja = svg.getBoundingClientRect();
    /*
     * La caja envolvente de lo que se ha dibujado de verdad, no la del SVG:
     * es la diferencia entre «el lienzo está centrado» —que siempre lo
     * estuvo— y «lo pintado está centrado», que es lo que fallaba.
     */
    let izq = Infinity;
    let der = -Infinity;
    let arriba = Infinity;
    let abajo = -Infinity;
    for (const el of svg.querySelectorAll("[data-fondo]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      izq = Math.min(izq, r.left);
      der = Math.max(der, r.right);
      arriba = Math.min(arriba, r.top);
      abajo = Math.max(abajo, r.bottom);
    }
    const textos = [...svg.querySelectorAll("text")];
    const cifras = textos
      .map((t) => t.textContent.trim())
      .filter((t) => t.length > 0);
    /*
     * Un rótulo que se sale de su pantalla es el otro modo de fallar, y no lo
     * ve el reparto: las cintas y la rosa se recortan **a propósito** —son
     * ventanas sobre algo que fluye— así que de lo recortado no se pregunta;
     * de todo lo demás, sí.
     */
    const desbordados = textos.filter((t) => {
      // Lo que va recortado se recorta **a propósito**: una cinta es una
      // ventana sobre algo que fluye, y la escala de cabeceo se sale del
      // horizonte por el mismo motivo. De eso no se pregunta; de lo demás, sí.
      if (t.closest("[clip-path]")) return false;
      const r = t.getBoundingClientRect();
      if (r.width === 0) return false;
      return (
        r.left < caja.left - 1 ||
        r.right > caja.right + 1 ||
        r.top < caja.top - 1 ||
        r.bottom > caja.bottom + 1
      );
    });
    return {
      id,
      familiaEsperada: FAMILIA[id],
      familia: svg.dataset.familia,
      motoresEsperados: MOTORES[id],
      motores: svg.querySelectorAll("[data-motor-cifra]").length,
      sobraIzq: izq - caja.left,
      sobraDer: caja.right - der,
      sobraArriba: arriba - caja.top,
      sobraAbajo: caja.bottom - abajo,
      cifras: cifras.length,
      desbordados: desbordados.length,
      cual: desbordados
        .map((t) => t.textContent.trim())
        .slice(0, 3)
        .join(" · "),
      esferas: svg.querySelectorAll("[data-dial]").length,
    };
  });
});

const resultados = [];
const comprobar = (nombre, ok, detalle) => {
  resultados.push({ nombre, ok, detalle });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

for (const p of partes) {
  const desvio = Math.abs(p.sobraIzq - p.sobraDer);
  comprobar(
    `${p.id}: el cuadro está centrado`,
    desvio <= 1.5,
    `sobran ${p.sobraIzq.toFixed(1)} px por la izquierda y ${p.sobraDer.toFixed(1)} por la derecha`,
  );
  comprobar(
    `${p.id}: nada se sale de la caja`,
    p.sobraIzq >= -0.5 &&
      p.sobraDer >= -0.5 &&
      p.sobraArriba >= -0.5 &&
      p.sobraAbajo >= -0.5,
    `arriba ${p.sobraArriba.toFixed(1)}, abajo ${p.sobraAbajo.toFixed(1)}`,
  );
  comprobar(
    `${p.id}: lleva la cabina que le toca`,
    p.familia === p.familiaEsperada,
    `${p.familia}`,
  );
  comprobar(
    `${p.id}: una aguja por motor`,
    p.motores === p.motoresEsperados,
    `${p.motores} de ${p.motoresEsperados}`,
  );
  comprobar(
    `${p.id}: ningún rótulo se sale`,
    p.desbordados === 0,
    p.desbordados ? `${p.desbordados} fuera: ${p.cual}` : "",
  );
  comprobar(
    `${p.id}: el cuadro dice cosas`,
    p.cifras >= 10,
    `${p.cifras} rótulos con algo escrito`,
  );
}

/*
 * Y los avisos, que ninguna foto quieta enseña: se vuelve a pintar el mismo
 * cuadro en pérdida y pasado de velocidad, y se comprueba que **se encienden**
 * y que lo que se enciende es el marco, no los dígitos.
 */
const avisos = await page.evaluate(() => {
  const salida = [];
  for (const id of globalThis.__cuadros) {
    const pintar = globalThis.__pintar[id];
    const svg = [...document.querySelectorAll("svg.tablero")].find(
      (s) =>
        globalThis.__cuadros[
          [...document.querySelectorAll("svg.tablero")].indexOf(s)
        ] === id,
    );
    const marco = () => svg.querySelector('[data-cristal="perdida"]');
    const caja = () => svg.querySelector('[data-alerta="ias"]');
    // Tranquilo: ni marco ni caja de color. La calma también es información.
    pintar({ nudos: 100 }, 0.1);
    const enCalma = {
      marco: marco()?.getAttribute("visibility") ?? "sin marco",
      caja: caja()?.getAttribute("class") ?? "sin caja",
    };
    // Y en apuros: el marco aparece y la caja se pone roja.
    pintar({ perdida: true, nudos: 4000 }, 0.1);
    const enApuros = {
      marco: marco()?.getAttribute("visibility") ?? "sin marco",
      caja: caja()?.getAttribute("class") ?? "sin caja",
      // Los dígitos, en cambio, siguen ahí: lo que parpadea es el marco.
      cifra: svg.querySelector('[data-cristal="ias"]')?.textContent ?? "",
    };
    salida.push({ id, enCalma, enApuros });
  }
  return salida;
});

for (const a of avisos) {
  comprobar(
    `${a.id}: en calma no hay ningún aviso encendido`,
    a.enCalma.marco === "hidden" && !a.enCalma.caja.includes("--"),
    `${a.enCalma.marco} · ${a.enCalma.caja}`,
  );
  comprobar(
    `${a.id}: la pérdida enciende el marco del horizonte`,
    a.enApuros.marco === "visible",
    a.enApuros.marco,
  );
  /*
   * La caja roja de la velocidad es de los que llevan cinta. En una esfera lo
   * que avisa es el **arco rojo**, que ya está pintado en su sitio desde la
   * primera vuelta: poner además una caja sería inventar un instrumento que
   * una avioneta no tiene.
   */
  if (a.enCalma.caja !== "sin caja") {
    comprobar(
      `${a.id}: pasarse de velocidad pone la caja roja, y el número se sigue leyendo`,
      a.enApuros.caja.includes("cr__caja--limite") &&
        a.enApuros.cifra.length > 0,
      `${a.enApuros.caja} · dice «${a.enApuros.cifra}»`,
    );
  }
}

/*
 * Y con «Movimiento: reducido» puesto, el aviso se enciende y **se queda**: un
 * parpadeo es la clase de movimiento que ese ajuste existe para quitar, y lo
 * que el aviso tiene que hacer no depende de que se mueva. Se mira en el medio
 * segundo en que, parpadeando, estaría apagado.
 */
const quietos = await page.evaluate(() => {
  const salida = [];
  const marcoDe = (i) =>
    document.querySelectorAll("svg.tablero")[i].querySelector(
      '[data-cristal="perdida"]',
    );
  globalThis.__cuadros.forEach((id, i) => {
    const pintar = globalThis.__pintar[id];
    // Primero moviéndose: a los 0,6 s de nacer, el parpadeo lo tiene apagado.
    document.documentElement.classList.remove("sin-movimiento");
    pintar({}, 1);
    pintar({ perdida: true }, 0.6);
    const parpadeando = marcoDe(i)?.getAttribute("visibility");
    // Y ahora quieto, en el mismo instante.
    document.documentElement.classList.add("sin-movimiento");
    pintar({}, 1);
    pintar({ perdida: true }, 0.6);
    const quieto = marcoDe(i)?.getAttribute("visibility");
    document.documentElement.classList.remove("sin-movimiento");
    salida.push({ id, parpadeando, quieto });
  });
  return salida;
});

for (const q of quietos) {
  comprobar(
    `${q.id}: con el movimiento reducido el aviso no parpadea, se queda`,
    q.parpadeando === "hidden" && q.quieto === "visible",
    `parpadeando ${q.parpadeando} · quieto ${q.quieto}`,
  );
}

/*
 * Y se dejan otra vez en vuelo tranquilo antes de la foto: la foto es para
 * mirar cómo queda el cuadro, y seis cuadros en pérdida con la velocidad a
 * cuatro mil nudos no enseñan nada de eso.
 */
await page.evaluate(() => {
  for (const id of globalThis.__cuadros) globalThis.__pintar[id]({}, 6);
});

await page.screenshot({ path: SALIDA, fullPage: true });
console.log(`\n  ${SALIDA}`);
await navegador.close();
await server.close();

const fallos = resultados.filter((r) => !r.ok).length;
if (fallos) {
  console.log(`\n  ${fallos} sin pasar.`);
  process.exitCode = 1;
}
