/**
 * ¿Se queda el avión en la calle de rodaje sin que nadie lo dirija?
 *
 * Es la pregunta que hace útil la asistencia de dirección, y la única forma de
 * contestarla es soltar el mando y mirar. Se rueda con gas y **sin tocar el
 * timón ni los alerones**, y se anota cuánto se aparta el avión de la raya.
 *
 * Un peldaño con asistencia tiene que llevarlo; uno sin ella, no. Si Guyrami y
 * Taguato Ruvicha dan el mismo número, la escalera no existe.
 *
 * ## Y el número tiene que ser el mismo dos veces seguidas
 *
 * No lo era: 53, 196, 330 y 465 metros en cuatro tiradas del mismo peldaño.
 * Un banco que contesta cuatro cosas distintas a la misma pregunta no sirve
 * para decidir nada, y lo peor es que **parece que sirve** — se mira el número
 * de hoy, se toca una ganancia, se vuelve a mirar y se cree que el cambio hizo
 * algo.
 *
 * De dónde salía el baile, por orden de tamaño:
 *
 * - **El viento.** Lo trae el METAR de verdad, y el viento elige la cabecera
 *   en uso; con otra cabecera, otro puesto, otra ruta y otras curvas. Dos
 *   tiradas del mismo peldaño podían estar rodando por sitios distintos del
 *   aeropuerto. Ahora se fija con `?viento=`.
 * - **El reloj.** Se rodaba «setenta y cinco segundos» de reloj de pared, y a
 *   distinto número de fotogramas por segundo eso es distinto recorrido.
 *   Ahora se mide por **metros rodados**, que es lo que se está juzgando.
 * - **Y lo que quede.** Tres tiradas y se informa de la mediana y del abanico:
 *   un desvío de «14 ± 2 m» y uno de «14 ± 200» no dicen lo mismo, y hasta hoy
 *   se contaban igual.
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const server = await createServer({
  root: process.cwd(),
  server: { port: 5239 },
});
await server.listen();
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });

/** Cuántas veces se rueda cada peldaño. Impar, para que la mediana sea una. */
const TIRADAS = 3;

/**
 * Y cuántos metros se ruedan en cada tirada. Ver la cabecera.
 *
 * Trescientos: lo que se tarda en salir del puesto, tomar la primera curva y
 * enfilar una calle, que es donde la asistencia enseña lo que sabe. Con
 * quinientos el banco entero pasaba de un cuarto de hora y nadie lo iba a
 * correr.
 */
const METROS = 300;

/**
 * El viento, fijo.
 *
 * Del 020 a seis nudos: flojo —para que no empuje al avión y mida otra cosa—
 * y de una dirección concreta, que es lo que hace que la cabecera en uso sea
 * siempre la misma y la ruta también.
 */
const VIENTO = "020/6";

const mediana = (xs) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

console.log(
  `tramo              desvío (mediana de ${TIRADAS})   abanico   al final   ¿se sale de la calle?`,
);
for (const tramo of ["guyrami", "tuka", "taguato", "taguato-ruvicha"]) {
  const peores = [];
  const finales = [];
  for (let tirada = 0; tirada < TIRADAS; tirada++) {
    const page = await b.newPage();
    page.on("pageerror", (e) => console.log("ERROR:", e.message));
    await page.addInitScript((t) => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
      localStorage.setItem("oga-veve:tramo", t);
    }, tramo);
    await page.goto(
      `http://localhost:5239/?escenario=pettirossi&viento=${VIENTO}`,
    );
    await page.waitForTimeout(2500);

    const r = await page.evaluate(async (METROS) => {
      const o = globalThis.__oga;
      const cuadro = () => new Promise((r) => requestAnimationFrame(() => r()));
      const alaRaya = (e, ruta) => {
        let m = Infinity;
        for (let i = 0; i < ruta.length - 1; i++) {
          const [ax, az] = ruta[i];
          const [bx, bz] = ruta[i + 1];
          const dx = bx - ax;
          const dz = bz - az;
          const l = dx * dx + dz * dz || 1;
          const t = Math.max(
            0,
            Math.min(
              1,
              ((e.position.x - ax) * dx + (e.position.z - az) * dz) / l,
            ),
          );
          m = Math.min(
            m,
            Math.hypot(
              e.position.x - (ax + t * dx),
              e.position.z - (az + t * dz),
            ),
          );
        }
        return m;
      };
      let peor = 0;
      // **Solo gas.** Ni alerón ni timón: es lo que hace alguien de cuatro años
      // que todavía no sabe que hay que girar.
      o.pilotar((c) => {
        const e = o.estado();
        c.engineOn = true;
        c.aileron = 0;
        c.rudder = 0;
        c.elevator = 0;
        c.throttle = e.airspeed < 7 ? 0.45 : 0;
        c.brakes = e.airspeed > 10 ? 1 : 0;
      });
      /*
       * **Se mide por metros rodados, no por segundos de reloj.**
       *
       * Con un tope de tiempo, la misma prueba recorre distinto trecho según lo
       * cargada que esté la máquina, y lo que se juzga —cuánto te apartas de la
       * raya— depende de por dónde vas, no de cuánto rato llevas.
       */
      let rodado = 0;
      let antes = { ...o.estado().position };
      const limite = performance.now() + 60000;
      while (rodado < METROS && performance.now() < limite) {
        await cuadro();
        const e = o.estado();
        rodado += Math.hypot(e.position.x - antes.x, e.position.z - antes.z);
        antes = { ...e.position };
        const ruta = o.ruta();
        if (ruta.length > 1) peor = Math.max(peor, alaRaya(e, ruta));
        if (!e.onGround) break;
      }
      const e = o.estado();
      const ruta = o.ruta();
      o.pilotar(null);
      return {
        rodado: Math.round(rodado),
        peor: Math.round(peor),
        final: ruta.length > 1 ? Math.round(alaRaya(e, ruta)) : -1,
      };
    }, METROS);

    peores.push(r.peor);
    finales.push(r.final);
    await page.close();
  }

  // Una calle de rodaje tiene veintitrés metros: pasar de doce del eje es
  // tener una rueda fuera del asfalto.
  const peor = mediana(peores);
  const abanico = Math.max(...peores) - Math.min(...peores);
  const fuera = peor > 12;
  console.log(
    `${tramo.padEnd(18)} ${String(peor).padStart(9)} m ` +
      `${String(`±${abanico}`).padStart(9)} m ${String(mediana(finales)).padStart(10)} m   ` +
      `${fuera ? "SÍ ✗" : "no ✓"}`,
  );
}
await b.close();
await server.close();
