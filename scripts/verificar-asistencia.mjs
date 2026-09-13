/**
 * ¿Te lleva la ayuda de dirección de vuelta a la raya, y cuánto?
 *
 * La ayuda de rodaje existe para que quien tiene cuatro años no se pase dos
 * kilómetros de calle peleándose con el volante, y se retira peldaño a
 * peldaño: Guyrami 0,5 · Tukã 0,35 · Taguato 0,25 · Taguato Ruvicha 0. Si
 * esos cuatro números no producen cuatro comportamientos distintos, la
 * escalera no existe.
 *
 * ## Lo que medía antes, y por qué no servía
 *
 * Soltaba el mando en el puesto y rodaba trescientos metros anotando lo más
 * que se apartaba de la ruta. Los cuatro peldaños daban lo mismo —de 27 a 33
 * metros— y el banco cantaba «se sale de la calle» en los cuatro.
 *
 * El número no medía la ayuda: medía **las curvas de la calle**. Sin tocar
 * nada el avión va recto, la ruta gira, y la distancia a la ruta sube y baja
 * sola con cada codo. En la traza se ve tal cual: 0 · 19 · 3 · 22 · 12 · 5 ·
 * 23 · 15, y casi los mismos números en el peldaño que **no tiene ayuda
 * ninguna**. Una cuenta que da igual con ayuda y sin ella no puede decidir
 * nada sobre la ayuda.
 *
 * ## Lo que mide ahora
 *
 * **Un tramo recto, el avión apartado a un lado, y a ver si vuelve.** Se busca
 * el tramo recto más largo de la ruta, se coloca el avión sobre él pero ocho
 * metros al costado y mirando por donde va el tramo, y se rueda con gas y sin
 * tocar el volante. La pregunta es de una sola cifra: cuántos metros queda del
 * eje al cabo de cien.
 *
 * Así la curva no entra en la cuenta, y lo único que puede devolver el avión a
 * la raya es la ayuda. Sin ella el avión sigue recto y se queda donde estaba,
 * que es exactamente lo que tiene que pasar en el peldaño de arriba.
 *
 * Uso: `node scripts/verificar-asistencia.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5239;
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

/**
 * El viento, fijo.
 *
 * Del 020 a seis nudos: flojo —para que no empuje al avión y mida otra cosa—
 * y de una dirección concreta, que es lo que hace que la cabecera en uso sea
 * siempre la misma y la ruta también.
 */
const VIENTO = "020/6";

/** Cuánto se aparta el avión del eje antes de soltarlo, m. */
const APARTADO = 8;

/** Y cuántos metros rueda desde ahí. */
const METROS = 100;

/** Cuántas veces se repite cada peldaño. Impar, para que la mediana sea una. */
const TIRADAS = 3;

const mediana = (xs) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

const medido = {};
for (const tramo of ["guyrami", "tuka", "taguato", "taguato-ruvicha"]) {
  const quedan = [];
  for (let tirada = 0; tirada < TIRADAS; tirada++) {
    const page = await navegador.newPage();
    page.on("pageerror", (e) => console.log("ERROR:", e.message));
    await page.addInitScript((t) => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
      localStorage.setItem("oga-veve:tramo", t);
    }, tramo);
    await page.goto(
      `http://localhost:${PUERTO}/?escenario=pettirossi&viento=${VIENTO}`,
    );
    await page.waitForFunction(
      () => globalThis.__oga?.ruta().length > 1,
      null,
      {
        timeout: 60000,
      },
    );
    await page.waitForTimeout(1500);

    const r = await page.evaluate(
      async ([APARTADO, METROS]) => {
        const o = globalThis.__oga;
        const cuadro = () =>
          new Promise((r) => requestAnimationFrame(() => r()));
        const ruta = o.ruta();

        /*
         * **El tramo recto más largo**, que es donde la curva no contamina la
         * cuenta. Se coge el más largo y se empieza un poco dentro, para que
         * el codo anterior quede atrás.
         */
        /*
         * Y se busca una **tirada de tramos seguidos que van casi al mismo
         * rumbo**, no un tramo suelto: la ruta que se dibuja lleva los codos
         * redondeados, así que una recta de doscientos metros son treinta
         * segmentos cortos y ni uno solo mide sesenta.
         */
        const rumboDe = (i) =>
          Math.atan2(ruta[i + 1][0] - ruta[i][0], ruta[i + 1][1] - ruta[i][1]);
        let mejor = null;
        let desde = 0;
        for (let i = 0; i < ruta.length - 1; i++) {
          const rompe =
            i + 1 >= ruta.length - 1 ||
            Math.abs(
              ((rumboDe(i + 1) - rumboDe(desde) + Math.PI * 3) %
                (Math.PI * 2)) -
                Math.PI,
            ) > 0.06;
          if (!rompe) continue;
          const [ax, az] = ruta[desde];
          const [bx, bz] = ruta[i + 1];
          const largo = Math.hypot(bx - ax, bz - az);
          if (!mejor || largo > mejor.largo) mejor = { largo, ax, az, bx, bz };
          desde = i + 1;
        }
        if (!mejor || mejor.largo < 60) return { falta: true };

        const ux = (mejor.bx - mejor.ax) / mejor.largo;
        const uz = (mejor.bz - mejor.az) / mejor.largo;
        // Veinte metros dentro del tramo, y ocho al costado.
        const x = mejor.ax + ux * 20 - uz * APARTADO;
        const z = mejor.az + uz * 20 + ux * APARTADO;
        // El rumbo del tramo, en grados. El morro mira a la −Z.
        const rumbo = (Math.atan2(ux, -uz) * 180) / Math.PI;

        o.pilotar((c) => {
          const e = o.estado();
          c.engineOn = true;
          c.aileron = 0;
          c.rudder = 0;
          c.elevator = 0;
          c.throttle = e.airspeed < 7 ? 0.45 : 0;
          c.brakes = e.airspeed > 10 ? 1 : 0;
        });
        o.colocar(x, o.suelo(x, z) + 0.2, z, 5, (rumbo * Math.PI) / 180);
        await new Promise((r) => setTimeout(r, 600));

        /** Cuánto se está del eje **de este tramo**, con signo fuera. */
        const alEje = () => {
          const e = o.estado();
          const px = e.position.x - mejor.ax;
          const pz = e.position.z - mejor.az;
          return Math.abs(px * -uz + pz * ux);
        };

        const empezo = alEje();
        let rodado = 0;
        let antes = { ...o.estado().position };
        const limite = performance.now() + 45000;
        /*
         * **Se promedia la segunda mitad, no se mira dónde acabó.**
         *
         * La ayuda no acerca en línea recta: mete el avión hacia la raya, se
         * pasa, y vuelve. Mirar solo el metro cien es preguntarle a un péndulo
         * dónde está — sale un número distinto según en qué parte del vaivén
         * te pille, y con eso Tukã parecía tirar menos que Taguato teniendo
         * más ayuda. El promedio del último trecho no depende de eso.
         */
        const tramoFinal = [];
        while (rodado < METROS && performance.now() < limite) {
          await cuadro();
          const e = o.estado();
          rodado += Math.hypot(e.position.x - antes.x, e.position.z - antes.z);
          antes = { ...e.position };
          if (rodado > METROS / 2) tramoFinal.push(alEje());
          if (!e.onGround) break;
        }
        const queda = tramoFinal.length
          ? tramoFinal.reduce((a, b) => a + b, 0) / tramoFinal.length
          : alEje();
        o.pilotar(null);
        return {
          empezo: +empezo.toFixed(1),
          queda: +queda.toFixed(1),
          rodado: Math.round(rodado),
        };
      },
      [APARTADO, METROS],
    );

    if (r.falta) {
      comprobar(
        `${tramo}: hay un tramo recto donde medir`,
        false,
        "la ruta no tiene ningún tramo de sesenta metros",
        "sin recta, lo que se mide es la curva",
      );
      await page.close();
      continue;
    }
    quedan.push(r.queda);
    await page.close();
  }
  if (!quedan.length) continue;
  medido[tramo] = mediana(quedan);
  const abanico = Math.max(...quedan) - Math.min(...quedan);
  console.log(
    `  ${tramo.padEnd(16)} de ${APARTADO} m del eje se queda de media en ` +
      `${String(medido[tramo]).padStart(5)} m  (±${abanico.toFixed(1)} en ${TIRADAS} tiradas)`,
  );
}

console.log("");

/*
 * **Lo que promete la escalera, y lo que no.**
 *
 * No promete que el juego conduzca: `tiers.ts` lo dice en Guyrami con todas
 * las letras —«girar es de quien juega, en los cuatro peldaños; lo que cambia
 * con la edad es cuánto perdona salirse»—. Así que lo que hay que comprobar no
 * es que el avión vuelva al eje, sino que **la ayuda tire hacia él** donde la
 * hay y **no tire** donde no la hay.
 */
comprobar(
  "donde hay ayuda, tira hacia la raya",
  ["guyrami", "tuka", "taguato"].every(
    (t) => medido[t] !== undefined && medido[t] < APARTADO - 0.5,
  ),
  ["guyrami", "tuka", "taguato"]
    .map((t) => `${t} ${medido[t] ?? "?"}`)
    .join(" · ") + ` m · salió de ${APARTADO}`,
  "una ayuda que no acerca a la raya no es una ayuda",
);

/*
 * **Y donde no la hay, no.** Taguato Ruvicha no tiene ninguna, así que el
 * avión sigue recto y se queda donde lo dejaron. Sin este contraste el banco
 * no distingue la ayuda de la suerte.
 */
comprobar(
  "y donde no la hay, el avión sigue recto",
  medido["taguato-ruvicha"] !== undefined &&
    medido["taguato-ruvicha"] > APARTADO - 0.5,
  `taguato-ruvicha ${medido["taguato-ruvicha"] ?? "?"} m, y salió de ${APARTADO}`,
  "si el peldaño de arriba también volviera solo, la escalera no existiría",
);

/*
 * **Y el peldaño de los pequeños tiene que ser el que más perdona.**
 *
 * Es lo que dice su propia ficha: «girar es de quien juega, en los cuatro
 * peldaños; lo que cambia con la edad es **cuánto perdona salirse**». Guyrami
 * es el de cuatro a seis años y el que más ayuda lleva —0,5 contra 0,35 y
 * 0,25—, así que tiene que ser el que más acerque a la raya.
 *
 * Hoy es el que menos. Y no es la cifra de la ayuda: es que Guyrami vuela
 * **otro modelo de vuelo** —el sencillo, donde el avión va donde apunta el
 * morro— y ahí el mismo empujón hace mucho menos. Lo comprobé también bajando
 * el timón automático y el amortiguador extra de Tukã a lo que tiene Taguato,
 * por si la diferencia venía de esas capas: no venía, el número no se movió.
 *
 * Es lo mismo que decía #145, que se cerró con una medida que no medía esto.
 */
comprobar(
  "el peldaño de los pequeños es el que más perdona salirse",
  medido.guyrami !== undefined &&
    medido.tuka !== undefined &&
    medido.taguato !== undefined &&
    medido.guyrami <= Math.min(medido.tuka, medido.taguato),
  `guyrami (0,5) ${medido.guyrami ?? "?"} m · tukã (0,35) ${medido.tuka ?? "?"} m · taguato (0,25) ${medido.taguato ?? "?"} m`,
  "el que más ayuda lleva es el que menos acerca, y es el de cuatro años",
);

for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);
