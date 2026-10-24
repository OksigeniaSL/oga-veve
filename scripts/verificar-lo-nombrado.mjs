/**
 * **Lo que nombra la instructora, en el juego de verdad: solo si se ve, y
 * señalado.**
 *
 * Reproduce las dos capturas de Enrique con el JAZ 60 en Pettirossi:
 *
 * - el 273: en final, desde fuera y a más de una milla, «nariz un poco arriba
 *   hasta ver dos blancas y dos rojas» sin la pista ni el PAPI en la pantalla;
 * - el 272: «hasta que el rombo llegue al medio», sin decir qué rombo.
 *
 * Y mira, con la cámara y el cuadro de verdad:
 *
 * - que más allá de donde se distingue, o mirando a otro lado, el PAPI no se
 *   nombra: se nombra el rombo, que sí está en el cuadro, y late;
 * - que con el cuadro recogido no se nombra ni el rombo: se dice la acción;
 * - que de frente el PAPI sí se nombra, y lleva su aro encima: cerca y, desde
 *   el 277, también a dos millas, que es donde se distingue el de verdad;
 * - que desde la cabina el rombo es el de su pantalla, y late allí;
 * - y que la puerta de la boca no tuvo que parar nada: quien habla eligió bien.
 *
 * El «lejos» de la captura del 273 era a dos millas, y ahí el PAPI de la
 * pantalla no se distinguía: dibujado a su tamaño, solo en el último
 * kilómetro. El de verdad se ve a cinco millas de día (AIM 2-1-2 b), y desde
 * el 277 el de aquí también —ver `escalaDelPapi` en `world/aproximacion.ts`—,
 * así que a dos millas y de frente lo que toca es nombrarlo y señalarlo. Lo de
 * no nombrar lo que no se ve se mira ahora más allá de esas cinco millas.
 *
 * Saca capturas con la tarjeta de verdad —mira el renderer en cada una— del
 * rombo latiendo, del aro del PAPI y de la pantalla de la cabina.
 *
 * Uso: `node scripts/verificar-lo-nombrado.mjs [carpeta de capturas]`.
 */

import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const CAPTURAS = process.argv[2] ?? "/tmp/lo-nombrado";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5373);
const ESCENARIO = process.env.OGA_ESCENARIO ?? "pettirossi";
const AVION = process.env.OGA_AVION ?? "jaz-60";
const TRAMOS = (process.env.OGA_TRAMOS ?? "guyrami,taguato").split(",");
/**
 * **Lejos de verdad**, m antes del umbral: más allá de las cinco millas del
 * AIM, contando las del ojo a las luces. Ahí el PAPI no se distingue —de día
 * no se vería— y lo que se nombra es el rombo. Ver la cabecera.
 */
const LEJOS = 9500;
/**
 * **Y alto**, en veces la altura de la senda: a dos millas son trescientos
 * cincuenta metros sobre la pista, por encima de donde la instructora apunta a
 * las luces. Ahí apunta al rombo.
 */
const ALTO = 1.8;
mkdirSync(CAPTURAS, { recursive: true });

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  // Con la tarjeta de verdad si se pide (`OGA_GPU=1`), que es la que juzga una captura.
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl", "--autoplay-policy=no-user-gesture-required"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle) => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`${ok ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

try {
  for (const tramo of TRAMOS) {
    console.log(`\n── ${AVION} en ${ESCENARIO}, ${tramo} ──`);
    const page = await navegador.newPage({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
    try {
      await page.addInitScript(() => {
        localStorage.setItem("oga-veve:teclas-vistas", "1");
      });
      await page.goto(
        `${BASE}/?escenario=${ESCENARIO}&hora=12&avion=${AVION}&tramo=${tramo}` +
          `&teselas=0&meteo=&viento=000/00`,
      );
      await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 120000 });
      await page.waitForTimeout(8000);
      await page.keyboard.press("i");
      await page.waitForTimeout(2000);

      const renderer = await page.evaluate(() => {
        const g = globalThis.__oga.pintor().getContext();
        const e = g.getExtension("WEBGL_debug_renderer_info");
        return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "¿?";
      });
      console.log(`  renderer: ${renderer}`);

      /** Pone el avión en la final, a `d` m del umbral y `factor` veces la altura de la senda. */
      const enLaFinal = (d, factor, vista, torcido = 0) =>
        page.evaluate(
          async ([d, factor, vista, torcido]) => {
            const o = globalThis.__oga;
            const j = o.juegoParaTrazas();
            const espera = (ms) => new Promise((r) => setTimeout(r, ms));
            const p = o.puntoDeFinal(d);
            const alto = p.suelo + Math.tan((3 * Math.PI) / 180) * (d + 300) * factor;
            const v = j.aircraft.approachSpeed;
            const h = p.h + (torcido * Math.PI) / 180;
            o.colocar(p.x, alto, p.z, v, h);
            const s = o.estado();
            s.velocity.x = Math.sin(h) * v;
            s.velocity.z = -Math.cos(h) * v;
            s.velocity.y = -v * Math.tan((3 * Math.PI) / 180);
            o.pedirTren(true);
            o.controles().throttle = 0.45;
            o.ponerVista(vista);
            await espera(2600);
            return { alto: Math.round(alto - p.suelo), vista: o.vista() };
          },
          [d, factor, vista, torcido],
        );

      /** Lo que se ve, y lo que dice la instructora si se le pide el consejo de ir bajo. */
      const pedirElConsejo = (accion = "narizArriba", motivo = "bajo") =>
        page.evaluate(
          async ([accion, motivo]) => {
            const o = globalThis.__oga;
            const j = o.juegoParaTrazas();
            const espera = (ms) => new Promise((r) => setTimeout(r, ms));
            const antes = j.cantados.length;
            const ve = j.loNombradoParaBanco;
            j.decirElConsejo({ accion, motivo }, null);
            const dicho = j.cantados.slice(antes).find((c) => c.startsWith("consejo")) ?? null;
            const clave = (dicho ?? "").split("→ ")[1]?.split(" ")[0] ?? "";
            /*
             * Lo que suena se señala al empezar, y puede esperar turno en la
             * boca: se mira hasta que empieza, con un tope.
             */
            let despues = j.loNombradoParaBanco;
            let latiendo = [];
            let aro = null;
            const t0 = Date.now();
            while (Date.now() - t0 < 8000) {
              await espera(100);
              despues = j.loNombradoParaBanco;
              latiendo = [...document.querySelectorAll(".explica--presenta[data-nombra]")].map((e) =>
                e.getAttribute("data-nombra"),
              );
              aro = aro ?? despues.aro;
              const quiere = /Papi$/.test(clave) ? "papi" : /Senda$|Perfil$/.test(clave) ? "rombo" : null;
              if (!quiere || despues.senalados[quiere] !== undefined) break;
            }
            await espera(300);
            aro = aro ?? j.loNombradoParaBanco.aro;
            // Y si la voz llegó a sonar, o qué fue de ella: es la otra mitad.
            const oida = (o.dichoTodo().instructor ?? []).slice(-6).includes(clave);
            const tirada = (o.descartadas?.() ?? []).slice(-6).find((d) => JSON.stringify(d).includes(clave));
            return { ve, dicho, senalados: despues.senalados, aro, latiendo, oida, tirada: tirada ? JSON.stringify(tirada).slice(0, 120) : null };
          },
          [accion, motivo],
        );

      const clave = (dicho) => (dicho ?? "").split("→ ")[1]?.split(" ")[0] ?? "";

      // ── El 273, a dos millas y desde fuera: ahora sí se distingue (277) ──
      const dosMillas = await enLaFinal(3400, 0.75, "chase");
      const c0 = await pedirElConsejo();
      await page.screenshot({ path: `${CAPTURAS}/${tramo}-273-dos-millas.png` });
      comprobar(
        `${tramo} · a dos millas (${dosMillas.alto} m, ${dosMillas.vista}): el PAPI se distingue, se nombra y lleva su aro`,
        c0.ve.papiSeDistingue && /Papi$/.test(clave(c0.dicho)) && c0.aro !== null,
        `${clave(c0.dicho)} · ` +
          (c0.ve.papi ? `${c0.ve.papi.anchoPx.toFixed(1)} px de luces, ${Math.round(c0.ve.papi.distancia)} m` : "sin PAPI") +
          ` · aro ${c0.aro ? `${Math.round(c0.aro.x)},${Math.round(c0.aro.y)}` : "no"}`,
      );

      // ── Más allá de las cinco millas, el PAPI no se distingue ───────────
      const lejos = await enLaFinal(LEJOS, 0.75, "chase");
      const ve = await page.evaluate(() => globalThis.__oga.juegoParaTrazas().loNombradoParaBanco);
      await page.screenshot({ path: `${CAPTURAS}/${tramo}-273-lejos.png` });
      comprobar(
        `${tramo} · lejos (${lejos.alto} m, ${lejos.vista}): el PAPI no se distingue`,
        !ve.papiSeDistingue,
        ve.papi ? `${ve.papi.anchoPx.toFixed(1)} px de luces, ${Math.round(ve.papi.distancia)} m` : "sin PAPI",
      );

      /*
       * ── Y por encima de los mil pies, la senda es la del rombo ──────────
       *
       * Las luces se nombran por debajo de los trescientos metros —ver
       * `mirarLaSenda` en `game.ts`—, y con el rombo en el cuadro, lo que se
       * nombra es el rombo, y late.
       */
      const alto = await enLaFinal(3400, ALTO, "chase");
      const c1 = await pedirElConsejo();
      comprobar(
        `${tramo} · alto (${alto.alto} m, ${alto.vista}): no dice «dos blancas y dos rojas»`,
        !/Papi/.test(clave(c1.dicho)),
        clave(c1.dicho),
      );
      comprobar(
        `${tramo} · alto: con el cuadro a la vista, nombra el rombo y el rombo late`,
        /Senda$/.test(clave(c1.dicho)) &&
          c1.ve.seVen.includes("rombo") &&
          c1.senalados.rombo !== undefined &&
          c1.latiendo.includes("rombo"),
        `${clave(c1.dicho)} · se ven ${c1.ve.seVen.join(",")} · late ${c1.latiendo.join(",") || "nada"} · ${c1.oida ? "sonó" : (c1.tirada ?? "no sonó todavía")}`,
      );

      // ── Con el cuadro recogido, ni el rombo ─────────────────────────────
      await page.evaluate(() => globalThis.__oga.juegoParaTrazas().hud.recogerElCuadro(true));
      await page.waitForTimeout(2600);
      const c2 = await pedirElConsejo();
      comprobar(
        `${tramo} · cuadro recogido: no nombra el rombo ni las luces`,
        !c2.ve.seVen.includes("rombo") && !/Senda$|Papi$/.test(clave(c2.dicho)),
        `${clave(c2.dicho)} · se ven ${c2.ve.seVen.join(",") || "nada"}`,
      );
      const c2b = await pedirElConsejo("masGas", "lento");
      comprobar(
        `${tramo} · cuadro recogido: «hasta la marca rosa» tampoco`,
        !/consejo\.masGas$/.test(clave(c2b.dicho)),
        clave(c2b.dicho),
      );
      await page.evaluate(() => globalThis.__oga.juegoParaTrazas().hud.recogerElCuadro(false));

      // ── Cerca y de frente: el PAPI sí, con su aro ───────────────────────
      const cerca = await enLaFinal(550, 0.85, "chase");
      /*
       * Y sin el cartel de la radio encima: el «autorizado para aterrizar»
       * cae justo donde están las luces, y detrás de él no se ven. Se espera
       * a que se vaya, como haría quien mira.
       */
      const sinCartel = await page.evaluate(async () => {
        const j = globalThis.__oga.juegoParaTrazas();
        const t0 = Date.now();
        while (Date.now() - t0 < 6000) {
          if (j.loNombradoParaBanco.seVen.includes("papi")) return Math.round((Date.now() - t0) / 100) / 10;
          await new Promise((r) => setTimeout(r, 100));
        }
        return null;
      });
      const c3 = await pedirElConsejo();
      await page.screenshot({ path: `${CAPTURAS}/${tramo}-papi-con-aro.png` });
      comprobar(
        `${tramo} · cerca (${cerca.alto} m): el PAPI se distingue y nada lo tapa`,
        c3.ve.papiSeDistingue && sinCartel !== null,
        c3.ve.papi
          ? `${c3.ve.papi.anchoPx.toFixed(1)} px, ${Math.round(c3.ve.papi.distancia)} m, x ${c3.ve.papi.x.toFixed(2)} y ${c3.ve.papi.y.toFixed(2)}, tapado ${c3.ve.papi.tapado}, a la vista a los ${sinCartel} s`
          : "sin PAPI",
      );
      comprobar(
        `${tramo} · cerca: nombra las cuatro luces y les pone el aro`,
        /Papi$/.test(clave(c3.dicho)) && c3.aro !== null,
        `${clave(c3.dicho)} · aro ${c3.aro ? `${Math.round(c3.aro.x)},${Math.round(c3.aro.y)}` : "no"} · ${c3.oida ? "sonó" : (c3.tirada ?? "no sonó todavía")}`,
      );

      // ── Cerca, pero mirando a otro lado: el PAPI no está en la pantalla ─
      await enLaFinal(450, 0.85, "chase", 100);
      const c4 = await pedirElConsejo();
      await page.screenshot({ path: `${CAPTURAS}/${tramo}-papi-fuera-de-la-vista.png` });
      comprobar(
        `${tramo} · cerca y mirando a otro lado: no nombra las luces, ni les pone aro`,
        !c4.ve.seVen.includes("papi") && !/Papi$/.test(clave(c4.dicho)) && c4.aro === null,
        `${clave(c4.dicho)}${c4.ve.papi ? ` · x ${c4.ve.papi.x.toFixed(2)}, delante ${c4.ve.papi.delante}` : ""}`,
      );

      // ── Desde la cabina: el rombo de su pantalla, latiendo ──────────────
      const cabina = await enLaFinal(3400, ALTO, "cockpit");
      if (cabina.vista === "cockpit") {
        const c5 = await pedirElConsejo();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${CAPTURAS}/${tramo}-cabina-rombo.png` });
        comprobar(
          `${tramo} · desde la cabina: el rombo es el de su pantalla, y late allí`,
          c5.ve.seVen.includes("rombo") && /Senda$/.test(clave(c5.dicho)) && c5.senalados.rombo !== undefined,
          `${clave(c5.dicho)} · se ven ${c5.ve.seVen.join(",")}`,
        );
      }

      // ── El rombo latiendo en el cuadro, para la captura del 272 ─────────
      // En lo alto del primer latido, que dura 1,1 s: ver `.explica--presenta`.
      await enLaFinal(3400, ALTO, "chase");
      await page.evaluate(() =>
        globalThis.__oga.juegoParaTrazas().decirElConsejo({ accion: "narizAbajo", motivo: "alto" }, null),
      );
      await page.waitForTimeout(550);
      await page.screenshot({ path: `${CAPTURAS}/${tramo}-272-rombo-latiendo.png` });

      // ── Y la puerta de la boca no tuvo que parar nada ───────────────────
      const noSeVeia = await page.evaluate(
        () => globalThis.__oga.juegoParaTrazas().loNombradoParaBanco.noSeVeia,
      );
      /*
       * Aquí se piden consejos seguidos y se gira la cámara entre uno y otro,
       * así que la puerta puede parar uno: el de las luces que esperaba turno
       * cuando la cámara dejó de verlas, o el del rombo que esperaba cuando se
       * recogió el cuadro —en Guyrami la cola va más llena y le pasa—. Eso es
       * lo que tiene que hacer. Lo que no puede parar es otra cosa: el resto lo
       * eligió bien quien habla.
       */
      comprobar(
        `${tramo} · la puerta de la boca solo paró lo que dejó de verse esperando turno`,
        noSeVeia.every((c) => /Papi$|Senda$/.test(c)),
        noSeVeia.join(", ") || "nada",
      );
      comprobar(`${tramo} · sin errores en la página`, errores.length === 0, errores.join(" | "));
    } finally {
      await page.close();
    }
  }

} finally {
  await navegador.close();
  await server.close();
}

const mal = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - mal.length} de ${resultados.length} · capturas en ${CAPTURAS}`);
process.exit(mal.length ? 1 : 0);
