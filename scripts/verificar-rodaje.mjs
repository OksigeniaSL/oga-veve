/**
 * Rodando por la pista, ¿se queda el avión en el suelo?
 *
 * La pregunta parece la misma que la de `verificar-suelo.mjs` y no lo es. Allí
 * se mide el terreno; aquí, el modelo de vuelo. Hizo falta separarlas porque
 * durante horas se buscó en el terreno un problema que estaba en el modelo: el
 * pavimento de los dos aeropuertos está liso hasta el centímetro y aun así el
 * avión pasaba parte del rodaje en el aire, con el aviso «¡el suelo, subí!»
 * parpadeando.
 *
 * Se rueda **por la pista**, que es la superficie que ya se ha comprobado que
 * es lisa. Si aquí el avión se despega, no es el suelo.
 *
 * ## Y hasta hoy medía un avión parado
 *
 * Colocaba el avión moviéndole la posición a mano y le escribía los mandos
 * directamente, y el juego reescribe las dos cosas en cada fotograma: cero
 * metros rodados en los tres escenarios, tres veces en verde y nada
 * comprobado. Un comprobador que pasa siempre es peor que no tenerlo, porque
 * ocupa el sitio del que sí comprobaría. Ahora usa `colocar` y `pilotar`, que
 * es lo que usan los demás bancos desde que este fallo se arregló allí.
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const server = await createServer({
  root: process.cwd(),
  server: { port: 5279 },
});
await server.listen();
/*
 * Con WebGL por software, como el resto de los bancos.
 *
 * Sin estas banderas Chrome no da contexto gráfico aquí, el juego no llega a
 * arrancar su bucle y lo que se mide es un avión congelado: **cero metros
 * rodados**, tres veces en verde. Es la otra mitad de por qué este banco no
 * comprobaba nada.
 */
const b = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

for (const [esc, tramo] of [
  ["tenerife-norte", "taguato"],
  ["tenerife-norte", "guyrami"],
  ["pettirossi", "taguato"],
]) {
  const page = await b.newPage({
    viewport: { width: 900, height: 600 },
    locale: "es-PY",
    hasTouch: true,
    isMobile: true,
  });
  page.on("pageerror", (e) => console.log("ERROR:", e.message));
  await page.addInitScript(() =>
    localStorage.setItem("oga-veve:teclas-vistas", "1"),
  );
  /*
   * La misma dirección que usan los demás bancos —con su lección— y la misma
   * espera: hasta que el juego existe, y después un rato para que el mundo
   * termine de montarse. Con seis segundos a secas este guion medía antes de
   * que hubiera nada que medir.
   */
  await page.goto(
    `http://localhost:5279/?escenario=${esc}&leccion=aterrizaje&tramo=${tramo}`,
  );
  /*
   * **Y la pestaña, al frente.**
   *
   * El juego se para cuando nadie mira, y «nadie mira» incluye
   * `document.hasFocus()` — que en una pestaña abierta por el guion y nunca
   * traída al frente es falso. Resultado: el bucle no corría, el avión no se
   * movía y el banco medía un avión congelado sin enterarse. Ver `main.ts`.
   */
  await page.bringToFront();
  await page.waitForFunction(() => !!globalThis.__oga?.estado, null, {
    timeout: 60000,
  });
  await page.waitForTimeout(14000);

  const r = await page.evaluate(async () => {
    const o = globalThis.__oga;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    /*
     * **Se coloca con `colocar` y se pilota con `pilotar`.**
     *
     * Antes se hacía a mano: se movía `estado().position` y se escribía en
     * `controles()`. Las dos cosas están mal por el mismo motivo — el juego
     * las reescribe cada fotograma—, y el resultado era un banco que medía un
     * avión parado: **cero metros rodados en los tres escenarios**, tres veces
     * en verde sin haber comprobado nada. Es el mismo fallo que ya tuvo el
     * primer comprobador de rodaje: «el guion le ponía timón al avión y el
     * teclado se lo quitaba al instante».
     */
    /*
     * Y se coloca **ya rodando**, a doce metros por segundo.
     *
     * Parado en el puesto no arranca solo: el tope de rodaje mantiene el gas a
     * cero hasta que la lección lo suelta, así que el banco se quedaba mirando
     * un avión quieto. Lo que aquí se mide es si el suelo de la pista está
     * liso, y para eso hay que estar rodando por él.
     */
    /*
     * **Primero, un vuelo limpio.**
     *
     * Al cabo de un rato en el puesto sin tocar nada, el juego da el vuelo por
     * terminado y saca su pantalla — y con la pantalla puesta el avión no se
     * mueve, que es exactamente lo que tiene que pasar jugando y lo que dejaba
     * a este banco midiendo un avión congelado. `reiniciar` rearma la partida.
     */
    o.reiniciar();
    await espera(800);
    /*
     * **Y con la lección de aterrizar, no con la de despegar.**
     *
     * Poner el avión en la pista con la torre en rojo es una incursión en
     * pista, y el juego —bien— la castiga: percance puesto, avión congelado,
     * y el banco midiendo cero metros sin enterarse. En la lección de
     * aterrizar la pista es donde toca estar.
     */
    const p = o.puntoDeFinal(-200);
    o.colocar(p.x, p.suelo + 1.2, p.z, 12, p.h);
    o.pilotar((c) => {
      // Gas de rodaje y mando de cabeceo **quieto**: nadie está pidiendo subir.
      c.engineOn = true;
      c.throttle = 0.3;
      c.elevator = 0;
      c.aileron = 0;
      c.rudder = 0;
      c.brakes = 0;
    });
    await espera(1500);

    const inicio = { ...o.estado().position };
    let aire = 0;
    let masAlto = 0;
    for (let i = 0; i < 600; i++) {
      await espera(16);
      const s = o.estado();
      if (!s.onGround) aire++;
      const sobre = s.position.y - (o.suelo(s.position.x, s.position.z) + 1.2);
      if (sobre > masAlto) masAlto = sobre;
    }
    const s = o.estado();
    const c2 = o.controles();
    o.pilotar(null);
    return {
      aire,
      masAlto,
      metros: Math.round(
        Math.hypot(s.position.x - inicio.x, s.position.z - inicio.z),
      ),
      kmh: s.airspeed * 3.6,
    };
  });

  console.log(
    `${esc} · ${tramo}: rodó ${r.metros} m a ${r.kmh.toFixed(0)} km/h · ` +
      `en el aire ${r.aire} de 600 fotogramas · se levantó como mucho ${r.masAlto.toFixed(2)} m`,
  );
  await page.close();
}

await b.close();
await server.close();
