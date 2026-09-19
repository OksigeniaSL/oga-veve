/**
 * El panel de la cabina **visto desde el asiento**, que es lo único que cuenta.
 *
 * Existe por una frase corta: «tú me estás vacilando», dicha con cinco
 * capturas de las seis cabinas delante. Y llevaba razón dos veces. Primero,
 * porque el rediseño se había hecho en el cuadro del HUD, que solo sale en el
 * peldaño de arriba, mientras lo que se ve volando en Guyrami es **esto**.
 * Y segundo, porque en esas capturas se veía lo que ningún banco decía:
 * pantallas cortadas por el borde, una segunda brújula asomando del puesto del
 * copiloto, y todo el grupo escorado con medio panel en negro.
 *
 * `verificar-cabina.mjs` ya medía la cabina **en metros** —que el reloj esté a
 * tantos centímetros del asiento— y daba verde. No se contradecían: un panel
 * puede estar perfecto en metros y salir escorado en pantalla, porque lo que
 * decide es dónde está el ojo. Así que esto mide **en píxeles de pantalla**,
 * con la sonda `enPantalla`, y comprueba lo que se ve:
 *
 * 1. Que las pantallas del piloto se vean **enteras**, sin que las corte el
 *    borde de la pantalla.
 * 2. Que el grupo esté **centrado** en la vista: lo que sobra a un lado tiene
 *    que ser lo que sobra al otro.
 * 3. Que **no se pisen** entre ellas.
 * 4. Y que no haya dos brújulas: una sola referencia de rumbo por avión.
 *
 * Uso: `node scripts/verificar-panel.mjs [carpeta-de-fotos]`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const FOTOS = process.argv[2] ?? "";
const PUERTO = 5301;
const FLOTA = ["jaz-20", "jaz-25", "jaz-40", "jaz-60", "jaz-90", "jaz-120"];

if (FOTOS) mkdirSync(FOTOS, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

for (const id of FLOTA) {
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=tenerife-sur&hora=16&leccion=despegue&tramo=guyrami&avion=${id}`,
  );
  await page
    .waitForFunction(
      () => globalThis.__oga?.aeronave?.().deVerdad === true,
      null,
      { timeout: 60000 },
    )
    .catch(() => {});
  await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
  await page.waitForTimeout(1200);

  const visto = await page.evaluate(() => {
    const o = globalThis.__oga;
    // Primero lo que se enciende: las pantallas y los relojes.
    const { ancho, alto, piezas } = o.enPantalla("^(pantalla|reloj)");
    /*
     * Y **el mueble**, que es lo otro que se ve torcido y que no medía nadie.
     * Los instrumentos pueden estar centrados en la cara del piloto y la
     * cabina entera seguir escorada, porque se construye simétrica respecto al
     * eje del fuselaje y él no se sienta ahí: «descentradas las cabinas, no el
     * cuadro de mando».
     */
    const mueble = o.enPantalla("^(montante|visera|panel-de-techo)").piezas;
    return { ancho, alto, piezas, mueble, vista: o.vista() };
  });

  const etiqueta = (que) => `${id}: ${que}`;
  const dentro = visto.piezas.filter((p) => !p.detras);

  comprobar(
    etiqueta("se está mirando desde el asiento"),
    visto.vista === "cockpit",
    visto.vista,
    "medido desde fuera, todo esto no dice nada",
  );

  comprobar(
    etiqueta("hay instrumentos encendidos delante"),
    dentro.length > 0,
    `${dentro.length} piezas`,
    "una cabina sin instrumentos es una burbuja",
  );

  if (dentro.length) {
    /*
     * **Que se vean enteros.** Una pantalla cortada por el borde no es un
     * detalle estético: es un instrumento que no se puede leer, y en las
     * capturas había dos por avión.
     */
    const cortadas = dentro.filter(
      (p) => p.x0 < 0 || p.x1 > visto.ancho || p.y0 < 0 || p.y1 > visto.alto,
    );
    comprobar(
      etiqueta("ninguna pantalla la corta el borde"),
      cortadas.length === 0,
      cortadas.length
        ? cortadas
            .map((p) => `${p.nombre} [${p.x0.toFixed(0)}…${p.x1.toFixed(0)}]`)
            .join(" · ")
        : `${dentro.length} enteras`,
      "un instrumento que no se ve entero no es un instrumento",
    );

    const izq = Math.min(...dentro.map((p) => p.x0));
    const der = Math.max(...dentro.map((p) => p.x1));
    const sobraIzq = izq;
    const sobraDer = visto.ancho - der;
    comprobar(
      etiqueta("el grupo está centrado en la vista"),
      Math.abs(sobraIzq - sobraDer) <= visto.ancho * 0.06,
      `sobran ${sobraIzq.toFixed(0)} px por la izquierda y ${sobraDer.toFixed(0)} por la derecha`,
      "«esto no está centrado ni aunque venga Cristo y me lo diga»",
    );

    // Y que no se monten unas encima de otras.
    const ordenadas = [...dentro].sort((a, b) => a.x0 - b.x0);
    /**
     * De qué instrumento es esta pieza.
     *
     * **Un reloj y su aro no se pisan: son el mismo reloj.** `reloj-asi` es la
     * esfera y `reloj-asi-caja` el cilindro que la enmarca, y el cilindro va
     * detrás a propósito. Contándolos como dos, el six-pack daba ocho solapes
     * el día que apareció y ninguno era real; con dos relojes en el tablero no
     * se notaba porque el orden por x los separaba de casualidad.
     */
    const suyo = (p) => p.nombre.replace(/-caja$/, "");
    /*
     * Y **se comparan todas contra todas**, no cada una con la siguiente.
     *
     * Comparar solo vecinas en la lista ordenada por x deja fuera las que se
     * pisan sin ser consecutivas — que en una rejilla de dos filas son
     * justamente las de filas distintas. Dieciséis piezas: doscientas
     * cincuenta comparaciones, que no es nada.
     */
    let pisadas = 0;
    for (let i = 0; i < ordenadas.length; i++)
      for (let j = i + 1; j < ordenadas.length; j++) {
        const a = ordenadas[i];
        const b = ordenadas[j];
        if (suyo(a) === suyo(b)) continue;
        const solapaX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const solapaY = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (solapaX > 4 && solapaY > 4) pisadas += 1;
      }
    comprobar(
      etiqueta("y no se pisan entre ellas"),
      pisadas === 0,
      pisadas ? `${pisadas} solapes` : "ninguna",
      "",
    );
  }

  /*
   * La cabina en sí: lo que enmarca el mundo tiene que enmarcarlo derecho. Se
   * mide con los montantes del parabrisas, la visera y el panel de techo, que
   * son piezas simétricas por definición — si ésas salen torcidas, la cabina
   * entera lo está.
   */
  const mueble = (visto.mueble ?? []).filter((p) => !p.detras);
  if (mueble.length) {
    const izq = Math.min(...mueble.map((p) => p.x0));
    const der = visto.ancho - Math.max(...mueble.map((p) => p.x1));
    comprobar(
      etiqueta("y la cabina se ve derecha desde el asiento"),
      Math.abs(izq - der) <= visto.ancho * 0.06,
      `sobran ${izq.toFixed(0)} px por la izquierda y ${der.toFixed(0)} por la derecha`,
      "«descentradas las cabinas, no el cuadro de mando»",
    );
  }

  /*
   * **Y que no haya avión por delante de los instrumentos.**
   *
   * El fallo que este banco no veía y que se vio en una captura: el biplano
   * llevaba la cabina entera montada un palmo por encima de su propio
   * fuselaje —era el único de los seis que se sentaba con los valores por
   * defecto de `cabina()`, escritos para un fuselaje más hondo—, y el lomo del
   * avión pasaba entre el ojo del piloto y el panel. Desde el asiento eso es
   * un arco naranja cruzando por delante de los relojes; desde aquí eran
   * cuarenta y ocho de ciento setenta puntos tapados y el banco decía 42 de 42.
   *
   * Se barre una rejilla sobre el panel y se pregunta **qué hay en cada
   * píxel**, que es la pregunta que se hace quien mira la pantalla. Lo que
   * tapa un instrumento estando más cerca que él no es un detalle de dibujo:
   * es el instrumento que no está.
   *
   * Los mandos no cuentan: un botón está en el panel a propósito, y la
   * palanca de vuelo cruza el tablero en cualquier avión del mundo.
   */
  const SE_PUEDE_PONER_DELANTE = /^(boton|palanca|cuerno|pedestal|manche)/;
  const tapando = await page.evaluate(
    ([re]) => {
      const cuenta = {};
      const suyo = new RegExp(re);
      for (let x = 340; x <= 1000; x += 40)
        for (let y = 440; y <= 800; y += 40) {
          const v = globalThis.__oga.queHayEn(x, y, 3);
          const i = v.findIndex(
            (o) =>
              o.nombre === "panel" ||
              o.nombre.startsWith("pantalla") ||
              o.nombre.startsWith("reloj"),
          );
          if (i > 0)
            for (const o of v.slice(0, i))
              if (!suyo.test(o.nombre))
                cuenta[o.nombre] = (cuenta[o.nombre] ?? 0) + 1;
        }
      return cuenta;
    },
    [SE_PUEDE_PONER_DELANTE.source],
  );
  const estorbos = Object.entries(tapando);
  comprobar(
    etiqueta("y no hay avión por delante de los instrumentos"),
    estorbos.length === 0,
    estorbos.length
      ? estorbos.map(([n, c]) => `${n} (${c} puntos)`).join(" · ")
      : "nada por delante",
    "la cabina va dentro del fuselaje, no encima",
  );

  /*
   * **Y que en el peldaño de los pequeños no haya una sola letra aquí dentro.**
   *
   * Todo este banco vuela en `guyrami`, que es el primero. El banco del cuadro
   * plano ya exigía esto mismo —«en el primer peldaño el cuadro no tiene ni
   * una letra»— y lo cumplía, mientras la cabina del mismo avión en el mismo
   * peldaño enseñaba «IAS», «ALT», «V/S», «GS», «HDG», «RPM», «FLAPS» y once
   * cifras a diez centímetros de la cara. Dos superficies, dos bancos, y solo
   * uno de los dos sabía cuál es la promesa: se empieza a los cuatro años y no
   * se lee.
   *
   * Se mide en la de dentro, que es la que mira quien vuela desde la cabina.
   */
  const escrito = await page.evaluate(() => ({
    rotulos: globalThis.__oga.rotulosDeCabina?.() ?? -1,
    cifras: globalThis.__oga.cifrasDeCabina?.() ?? -1,
  }));
  comprobar(
    etiqueta("y en el primer peldaño no tiene ni una palabra"),
    escrito.rotulos === 0,
    escrito.rotulos < 0 ? "no se pudo contar" : `${escrito.rotulos} palabras`,
    "se empieza a los cuatro años y no se lee inglés aeronáutico",
  );
  /*
   * **Pero cifras sí, desde el primero.**
   *
   * Es lo que se vio jugando: «¿y los relojes no llevan números? ¿cómo sabe el
   * jugador los valores?». Un dígito no es lectura —un niño de cuatro años
   * reconoce el 8 y el 2 por su forma— y sin él la aguja señala a un sitio que
   * no tiene nombre. Lo que espera al tercer peldaño es la palabra.
   */
  comprobar(
    etiqueta("y cifras sí, que si no la aguja no señala a nada"),
    escrito.cifras > 0,
    escrito.cifras < 0 ? "no se pudo contar" : `${escrito.cifras} cifras`,
    "«no veo números ni datos en ninguno»",
  );

  /*
   * **Y que las dos superficies enseñen lo mismo.**
   *
   * Es la comprobación que faltaba y por la que se pudo llegar a esto: el
   * cuadro plano dibujaba seis esferas redondas para un avión de pistón y la
   * cabina del mismo avión, dos cristales de G1000. Los dos bancos daban todo
   * verde porque cada uno miraba su lado.
   *
   * Aquí se preguntan las dos a la vez: la familia sale de `familiaDe` y **los
   * dos dibujos tienen que obedecerla**. Si un día alguien cambia una y se
   * olvida de la otra, esto lo dice.
   */
  const acuerdo = await page.evaluate(() => {
    const o = globalThis.__oga;
    const plano = !!document.querySelector('[data-hud="sixpack"]');
    const dentro = o
      .enPantalla("^reloj")
      .piezas.map((p) => p.nombre.replace(/-caja$/, ""));
    const seis = ["asi", "ai", "alt", "tc", "dg", "vsi"];
    return {
      familia: o.familia(),
      plano,
      dentro: seis.every((q) => dentro.includes(`reloj-${q}`)),
    };
  });
  comprobar(
    etiqueta("y el cuadro plano y la cabina son de la misma familia"),
    (acuerdo.familia === "esferas") === acuerdo.plano &&
      acuerdo.plano === acuerdo.dentro,
    `${acuerdo.familia}: plano ${acuerdo.plano ? "esferas" : "cristal"}, cabina ${acuerdo.dentro ? "esferas" : "cristal"}`,
    "la familia la manda el motor, y la mandan las dos superficies o no la manda nadie",
  );

  comprobar(
    etiqueta("sin errores"),
    !errores.length,
    errores[0] ?? "limpio",
    "",
  );

  if (FOTOS) await page.screenshot({ path: join(FOTOS, `${id}.png`) });
  await page.close();
}

/*
 * **Y una pasada en el peldaño de arriba, porque cero no basta.**
 *
 * «Ni una letra» se cumple igual de bien con la pantalla apagada, con el
 * módulo sin cargar o con la cuenta devolviendo siempre cero. Lo que hace que
 * la comprobación de arriba signifique algo es que en el cuarto peldaño
 * salgan letras: entonces cero en el primero es una decisión y no una avería.
 */
{
  const page = await navegador.newPage({
    viewport: { width: 1280, height: 720 },
  });
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=tenerife-sur&hora=16&leccion=despegue&tramo=taguato-ruvicha&avion=jaz-120`,
  );
  await page
    .waitForFunction(
      () => globalThis.__oga?.aeronave?.().deVerdad === true,
      null,
      { timeout: 60000 },
    )
    .catch(() => {});
  await page.evaluate(() => globalThis.__oga.ponerVista("cockpit"));
  await page.waitForTimeout(1200);
  const rotulos = await page.evaluate(
    () => globalThis.__oga.rotulosDeCabina?.() ?? -1,
  );
  comprobar(
    "jaz-120 en el cuarto peldaño: y ahí sí hay palabras, que el cuadro crece",
    rotulos > 0,
    rotulos < 0 ? "no se pudo contar" : `${rotulos} rótulos`,
    "«ni una letra» se cumple igual de bien con la pantalla apagada",
  );
  await page.close();
}

console.log("");
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);
