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

/**
 * Y desde dónde se sueltan los dos que se comparan entre sí.
 *
 * La ayuda tiene **seis metros de holgura**: dentro de ellos no toca nada,
 * porque ahí no hay deriva que corregir, hay un avión rodando. Soltando a
 * ocho, la ayuda dispone de dos metros de señal y los dos peldaños de en medio
 * terminan aparcados en el mismo sitio —el borde de la holgura, 6,7 contra
 * 6,4— y salen empatados o cambiados de orden. No era un mando desafinado: era
 * la regla de medir puesta dentro de la banda muerta.
 *
 * Dieciocho metros es fuera de la calle, en la hierba, que es justo el caso
 * para el que existe la ayuda, y deja doce metros de corrección donde sí se ve
 * cuál de los dos tira más.
 */
const LEJOS = 18;

/** Cuántas veces se repite cada peldaño. Impar, para que la mediana sea una. */
const TIRADAS = 3;

const mediana = (xs) =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const resultados = [];
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

/**
 * Abre una partida en un peldaño y espera a que haya ruta.
 *
 * **Con un reintento**, y no por capricho: el banco abre diecinueve partidas
 * seguidas en el mismo navegador y de vez en cuando una se queda sin pintar —
 * el contexto de GPU se cae y la página no llega a tener ruta nunca. Sin
 * reintento eso tumba el banco entero con un plantón de sesenta segundos y
 * parece un fallo del juego, que es lo peor que puede hacer una regla de medir.
 */
async function partida(tramo) {
  for (let intento = 0; ; intento++) {
    const page = await navegador.newPage();
    page.on("pageerror", (e) => console.log("ERROR:", e.message));
    await page.addInitScript((t) => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
      localStorage.setItem("oga-veve:tramo", t);
    }, tramo);
    await page.goto(
      `http://localhost:${PUERTO}/?escenario=pettirossi&viento=${VIENTO}`,
    );
    try {
      await page.waitForFunction(
        () => globalThis.__oga?.ruta().length > 1,
        null,
        { timeout: 60000 },
      );
      await page.waitForTimeout(1500);
      return page;
    } catch (e) {
      await page.close();
      if (intento >= 1) throw e;
      console.log(`  (${tramo}: la partida no llegó a pintar; se repite)`);
    }
  }
}

const medido = {};
const TRABAJOS = [
  ["guyrami", APARTADO],
  ["tuka", APARTADO],
  ["taguato", APARTADO],
  ["taguato-ruvicha", APARTADO],
  // Y los dos del mismo modelo, otra vez desde fuera de la holgura. Ver `LEJOS`.
  ["tuka", LEJOS],
  ["taguato", LEJOS],
];
for (const [tramo, APARTADO] of TRABAJOS) {
  const clave = APARTADO === LEJOS ? `${tramo}-lejos` : tramo;
  const quedan = [];
  for (let tirada = 0; tirada < TIRADAS; tirada++) {
    const page = await partida(tramo);

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
  medido[clave] = mediana(quedan);
  const abanico = Math.max(...quedan) - Math.min(...quedan);
  console.log(
    `  ${tramo.padEnd(16)} de ${String(APARTADO).padStart(2)} m del eje se queda de media en ` +
      `${String(medido[clave]).padStart(5)} m  (±${abanico.toFixed(1)} en ${TIRADAS} tiradas)`,
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
 * **Y el peldaño de los pequeños tiene que quedarse dentro de la calle.**
 *
 * Una calle de rodaje mide veintitrés metros: once y medio a cada lado del
 * eje. Cuatro metros es estar dentro con sitio de sobra, y es lo mínimo que se
 * le puede pedir al peldaño de los cuatro a los seis años, que es el que más
 * ayuda lleva.
 *
 * Antes se quedaba a 6,6 m — aparcado en el borde de la holgura de la ayuda,
 * donde ya no tiraba, y con media calle consumida.
 */
comprobar(
  "el peldaño de los pequeños se queda dentro de la calle",
  medido.guyrami !== undefined && medido.guyrami < 4,
  `guyrami ${medido.guyrami ?? "?"} m del eje · media calle son 11,5 m`,
  "se quedaba a 6,6 m, que es media calle, y ahí se quedaba para siempre",
);

/*
 * **Y entre los dos que vuelan el mismo modelo, tira más el que más ayuda
 * tiene.**
 *
 * Solo entre Tukã (0,35) y Taguato (0,25): los dos usan el modelo de
 * coeficientes, así que la comparación es limpia. Guyrami no entra —vuela el
 * modelo sencillo, y comparar cuánto tira la ayuda entre dos físicas distintas
 * no dice nada de la ayuda—.
 *
 * Antes salía al revés, 3,3 contra 2,8, y no era la cifra de la ayuda: era que
 * la corrección se pasaba de largo y lo que se medía era la amplitud del
 * vaivén.
 *
 * **Y se sueltan desde dieciocho metros, no desde ocho.** Desde ocho los dos
 * se paran en el borde de la holgura de seis y salen 6,7 contra 6,4: la
 * diferencia que se leía no era la de la ayuda, era dónde pilló a cada uno el
 * último bandazo dentro de la banda muerta. Una regla que mide donde la ayuda
 * está apagada no puede ordenar dos ayudas. Ver `LEJOS`.
 */
const tuka = medido["tuka-lejos"];
const taguato = medido["taguato-lejos"];
comprobar(
  "y a más ayuda, más tirón, entre los que vuelan el mismo modelo",
  tuka !== undefined && taguato !== undefined && tuka <= taguato + 0.2,
  `de ${LEJOS} m · tukã (0,35) ${tuka ?? "?"} m · taguato (0,25) ${taguato ?? "?"} m`,
  "dos números de ayuda distintos que dan el orden cambiado son un mando desafinado",
);

/*
 * **Y la pregunta que decide si la ayuda tiene que conducir: con el mando
 * suelto, ¿llega Guyrami al punto de espera?**
 *
 * En el código había —sin usarse— una anticipación de curvas: apuntar a un
 * punto de la ruta por delante y girar hacia él. La documentación de
 * `asistencia()` la justificaba con una frase rotunda: «en Guyrami, rodando sin
 * tocar nada, el avión no llega nunca al punto de espera — se sale en la
 * primera curva», y ese peldaño es de cuatro años y su promesa entera es
 * llevarte.
 *
 * Contra eso, `tiers.ts`, `tiers.test.ts` y este mismo banco dicen lo
 * contrario y con palabras de quien juega: «no tiene mucho sentido que el juego
 * conduzca por el jugador. Y si todo se hace solo, vaya aburrimiento». Y la
 * aritmética le daba la razón a ellos sin decirlo: la anticipación salía de
 * `(fuerza − 0,5) × 2` y medio es justo lo que tiene Guyrami, así que valía
 * **cero en los cuatro peldaños**. La rama no se ejecutaba nunca.
 *
 * O sea que la frase rotunda describía un juego que no existe desde hace
 * tiempo. Esto lo comprueba en vez de discutirlo: se rueda la ruta entera desde
 * el puesto, con gas y sin tocar el volante, y se mira si se llega.
 */
{
  const page = await partida("guyrami");

  const r = await page.evaluate(async () => {
    const o = globalThis.__oga;
    o.acelerar(5);
    /** Lo que falta de ruta por delante, m, que es lo que dice si se avanza. */
    const restante = () => {
      const e = o.estado();
      const r = o.ruta();
      let corte = 0;
      let mejor = Infinity;
      let sobre = 0;
      let suma = 0;
      const largos = [];
      for (let i = 0; i < r.length - 1; i++) {
        const l = Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1]);
        largos.push(l);
        suma += l;
      }
      let acumulado = 0;
      for (let i = 0; i < r.length - 1; i++) {
        const [ax, az] = r[i];
        const dx = r[i + 1][0] - ax;
        const dz = r[i + 1][1] - az;
        const l2 = dx * dx + dz * dz;
        if (l2 >= 1) {
          const t = Math.max(
            0,
            Math.min(
              1,
              ((e.position.x - ax) * dx + (e.position.z - az) * dz) / l2,
            ),
          );
          const d = Math.hypot(
            ax + dx * t - e.position.x,
            az + dz * t - e.position.z,
          );
          if (d < mejor) {
            mejor = d;
            corte = i;
            sobre = t;
          }
        }
        acumulado += largos[i];
      }
      void acumulado;
      let hecho = 0;
      for (let i = 0; i < corte; i++) hecho += largos[i];
      hecho += largos[corte] * sobre;
      return suma - hecho;
    };

    /*
     * **Y el piloto de pruebas frena al final, que si no esto no mide nada.**
     *
     * Sin frenos el avión llegaba al punto de espera, no paraba, se metía en la
     * pista sin autorización y el juego lo devolvía al puesto — y el banco
     * anotaba «no llegó», cuando lo que había pasado es que llegó y siguió.
     * Medido en la traza: ruta de sesenta y siete puntos seguida a menos de
     * cuatro metros del eje durante cuatrocientos veinte, y de golpe una ruta
     * de dos puntos y el avión otra vez en la plataforma.
     *
     * Parar en la doble raya es lo que hay que aprender y no lo hace la ayuda
     * —ver `LLEGADA_SIN_AYUDA`—, así que aquí lo hace el piloto de pruebas.
     * Lo que se mide sigue siendo solo la dirección.
     */
    const frenando = () => restante() < 45;

    o.pilotar((c) => {
      const e = o.estado();
      c.engineOn = true;
      // Ni volante ni pedales: eso es justo lo que se está midiendo.
      c.aileron = 0;
      c.rudder = 0;
      c.elevator = 0;
      c.throttle = frenando() ? 0 : e.airspeed < 7 ? 0.5 : 0;
      c.brakes = frenando() ? 1 : 0;
    });

    /** Lo más que se llegó a estar de la ruta dibujada, m. */
    const aLaRuta = () => {
      const e = o.estado();
      const r = o.ruta();
      let peor = Infinity;
      for (let i = 0; i < r.length - 1; i++) {
        const [ax, az] = r[i];
        const [bx, bz] = r[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const l2 = dx * dx + dz * dz;
        if (l2 < 1) continue;
        const t = Math.max(
          0,
          Math.min(
            1,
            ((e.position.x - ax) * dx + (e.position.z - az) * dz) / l2,
          ),
        );
        const d = Math.hypot(
          ax + dx * t - e.position.x,
          az + dz * t - e.position.z,
        );
        if (d < peor) peor = d;
      }
      return peor;
    };

    let lejos = 0;
    let quieto = 0;
    let llego = false;
    /*
     * **Y si pisó hierba, que es la pregunta de verdad.**
     *
     * Los metros de desvío de la raya no dicen si el avión se salió: una
     * plataforma es ancha y treinta metros de desvío ahí siguen siendo asfalto,
     * mientras que en una calle de veintitrés, doce ya son hierba. Así que se
     * pregunta por el pavimento, que es lo que se ve por la ventanilla.
     */
    let enHierba = 0;
    let cuadros = 0;
    const empezoCon = restante();
    const limite = performance.now() + 220000;
    let fase = o.fase();
    while (performance.now() < limite) {
      await new Promise((r) => requestAnimationFrame(() => r()));
      fase = o.fase();
      const d = aLaRuta();
      if (Number.isFinite(d)) lejos = Math.max(lejos, d);
      /*
       * **Quieto se mide contra el suelo.** `airspeed` es la velocidad
       * respecto al aire: un avión parado con el freno puesto marca la del
       * viento que le da, así que con brisa esto no contaba un solo cuadro de
       * avión quieto. La regla está en `flight/model.ts`: «lo que hace volar
       * es el aire; lo que hace avanzar es el suelo».
       */
      quieto = o.estado().groundSpeed < 0.5 ? quieto + 1 : 0;
      cuadros++;
      if (o.enElPavimento() === false) enHierba++;
      // El punto de espera, que es donde termina el rodaje de salida: o lo
      // dice la fase, o se ha llegado a la doble raya y ahí se para.
      if (
        fase === "esperando" ||
        fase === "autorizado" ||
        fase === "alineando" ||
        restante() < 25
      ) {
        llego = true;
        break;
      }
      if (o.estado().crashed) break;
      // Diez segundos parado es que no va a llegar por mucho que se espere.
      if (quieto > 600) break;
    }
    o.pilotar(null);
    return {
      fase,
      llego,
      roto: !!o.estado().crashed,
      lejos: +lejos.toFixed(1),
      parado: quieto > 600,
      ruta: Math.round(empezoCon),
      falta: Math.round(restante()),
      hierba: cuadros ? Math.round((enHierba / cuadros) * 100) : 0,
    };
  });
  await page.close();

  comprobar(
    "y con el mando suelto, el peldaño de los pequeños llega al punto de espera",
    r.llego && !r.roto,
    `guyrami acabó en «${r.fase}»${r.roto ? " y roto" : ""}${r.parado ? " y parado" : ""} · ` +
      `le faltaban ${r.falta} m de ${r.ruta} · lo más que se apartó de la ruta, ${r.lejos} m` +
      ` · fuera del asfalto el ${r.hierba} % del rodaje`,
    "si no llega, la ayuda de los cuatro años no cumple lo que promete",
  );

  /*
   * **Y sin pisar hierba**, que es lo que se ve por la ventanilla.
   *
   * Los metros de desvío no lo contestan —una plataforma es ancha y treinta
   * metros de desvío ahí siguen siendo asfalto—, así que esto se pregunta
   * aparte y contra el pavimento de verdad del aeródromo.
   */
  comprobar(
    "y sin irse a la hierba por el camino",
    r.hierba <= 5,
    `guyrami rodó fuera del asfalto el ${r.hierba} % del rodaje`,
    "una ayuda que te lleva por la hierba no te lleva",
  );
}

for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  if (!r.ok && r.porque) console.log(`      ${r.porque}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones`);

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);
