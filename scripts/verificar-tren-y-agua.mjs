/**
 * **El tren que no aguanta el campo, y el agua que no es un suelo** (#44).
 *
 * Lo que se comprueba, con el juego entero y no con la regla suelta —la regla
 * la miran `tren-y-agua.test.ts` y sus mapas de verdad—:
 *
 * - que en Taguató Ruvichá rodar deprisa por el campo **rompe el tren**, y que
 *   en Guyrami, a la misma velocidad y por el mismo sitio, no;
 * - que rodar igual de deprisa por la pista, por su franja y por una pista de
 *   hierba **no cambia nada**;
 * - que tocar el agua es percance, en los dos peldaños: viniendo del aire, y
 *   estando ya en el suelo, que es como se llega rodando desde la orilla.
 *
 * Cada prueba coloca el avión de verdad y deja que el juego decida: no se
 * llama a nada por dentro. Antes de cada una se posa parado en la pista un
 * momento, para que lo que venga después no se lea como una toma —un avión
 * colocado en el suelo viniendo del aire *es* un contacto, y fuera de la
 * pista eso ya tiene su percance, el de tocar el monte volando—.
 *
 * Uso: `node scripts/verificar-tren-y-agua.mjs` (con `OGA_PUERTO`).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle) => resultados.push({ nombre, ok: !!ok, detalle });

async function abrir(escenario, tramo) {
  const page = await navegador.newPage({ viewport: { width: 900, height: 600 } });
  page.on("pageerror", (e) => console.log("ERROR:", e.message));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=${escenario}&hora=16&leccion=aterrizaje&tramo=${tramo}&teselas=0`,
  );
  await page.bringToFront();
  await page.waitForFunction(() => !!globalThis.__oga?.estado && !!globalThis.__oga?.esAgua, null, {
    timeout: 120000,
  });
  await page.waitForTimeout(8000);
  return page;
}

/**
 * Todas las pruebas de un mundo y un peldaño, dentro de la página: buscar el
 * sitio, colocar, pilotar y mirar qué percance sale.
 */
function probar(page, que) {
  return page.evaluate(async (que) => {
    const o = globalThis.__oga;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const veces = o.acelerar?.(4) ?? 1;
    const r = o.pista();
    const hp = (r.heading * Math.PI) / 180;
    // Delante y a la derecha de la pista, en metros del mundo (la Y del norte es la Z negativa).
    const fx = Math.sin(hp);
    const fz = -Math.cos(hp);
    const dx = Math.cos(hp);
    const dz = Math.sin(hp);
    const en = (a, c) => [r.x + fx * a + dx * c, r.z + fz * a + dz * c];

    /** Parado en la pista un momento: que lo de después no sea una toma. */
    async function posarEnLaPista() {
      o.pilotar(null);
      o.reiniciar();
      await espera(400 / veces);
      const [x, z] = en(-r.length / 4, 0);
      o.colocar(x, o.sueloDeVuelo(x, z), z, 0, hp);
      for (let i = 0; i < 30 && !o.estado().onGround; i++) await espera(50 / veces);
      await espera(1200 / veces);
    }

    /**
     * Coloca el avión en el suelo en (x, z) a `v` m/s con ese rumbo, con el
     * gas que lo sostenga y el morro abajo, y mira `segundos` de juego.
     */
    async function rodarDesde(x, z, v, rumbo, segundos = 3) {
      await posarEnLaPista();
      o.colocar(x, o.sueloDeVuelo(x, z), z, v, rumbo);
      o.pilotar((c) => {
        c.engineOn = true;
        c.throttle = 0.7;
        c.brakes = 0;
        c.elevator = -0.25;
        c.aileron = 0;
      });
      const desde = o.reloj();
      let vmax = 0;
      let superficie = null;
      let antesDelPaso = null;
      const pisadas = {};
      let enElSuelo = 0;
      let pasos = 0;
      while (o.reloj() - desde < segundos && !o.percance()) {
        await espera(40 / veces);
        const e = o.estado();
        vmax = Math.max(vmax, e.groundSpeed);
        /*
         * **Lo que pisa, leído después de un paso del juego, no antes** (H43).
         * El juego mira el suelo al principio de cada paso, y `colocar` no
         * lo vuelve a mirar; si la espera de arriba —diez milisegundos con el
         * reloj por cuatro— acaba antes de que corra un fotograma, lo que se
         * lee es el suelo de `posarEnLaPista`, que es asfalto. En la ronda de
         * la tanda 18 salió «pisaba asfalto» rompiendo el tren en el campo, a
         * ciento cincuenta metros del eje, y metido en el mar a diez
         * kilómetros; en la de la 19, en la franja, que es la única que lo
         * comprobaba, y falló. Ahora cuenta lo leído con el reloj ya en marcha,
         * y `pisadas` dice todo lo que se pisó.
         */
        antesDelPaso ??= o.superficie();
        if (o.reloj() > desde) {
          const s = o.superficie();
          superficie ??= s;
          pisadas[s] = (pisadas[s] ?? 0) + 1;
        }
        pasos++;
        if (e.onGround) enElSuelo++;
      }
      const percance = o.percance();
      const e = o.estado();
      o.pilotar(null);
      return {
        percance,
        superficie,
        antesDelPaso,
        pisadas,
        v: +e.groundSpeed.toFixed(1),
        vmax: +vmax.toFixed(1),
        suelo: pasos ? +(enElSuelo / pasos).toFixed(2) : 0,
        tardo: +(o.reloj() - desde).toFixed(2),
      };
    }

    /** Busca, de dentro afuera, el primer punto que cumpla. */
    function buscar(cumple, paso, hasta) {
      for (let d = paso; d <= hasta; d += paso)
        for (let k = 0; k < 16; k++) {
          const ang = (k / 16) * Math.PI * 2;
          const x = r.x + Math.cos(ang) * d;
          const z = r.z + Math.sin(ang) * d;
          if (cumple(x, z)) return [x, z];
        }
      return null;
    }

    const out = { veces };

    if (que.campo) {
      /*
       * Un campo llano al lado de la pista: a ciento cincuenta metros o más del
       * eje, fuera de la franja, que no sea agua ni calle ni plataforma, y con
       * cien metros por delante sin cuesta de más de un cinco por ciento.
       */
      let sitio = null;
      for (const c of [150, -150, 220, -220, 300, -300, 400, -400])
        for (const a of [0, -r.length / 4, r.length / 4]) {
          if (sitio) break;
          const [x, z] = en(a, c);
          const [x2, z2] = en(a + 100, c);
          if (o.esAgua(x, z) || o.esAgua(x2, z2)) continue;
          if (Math.abs(o.suelo(x2, z2) - o.suelo(x, z)) > 5) continue;
          sitio = [x, z, a, c];
        }
      out.campo = sitio
        ? { donde: sitio.slice(2), ...(await rodarDesde(sitio[0], sitio[1], 24, hp)) }
        : { fallo: "no hay campo llano junto a la pista" };
    }

    if (que.pista) {
      const [x, z] = en(-r.length / 2 + 200, 0);
      out.pista = await rodarDesde(x, z, 24, hp);
    }

    if (que.franja) {
      /*
       * En la franja: pasado el borde del asfalto —que con sus márgenes llega
       * más lejos que el ancho de la pista— y dentro del ancho doble, que es
       * hasta donde llega la franja. Ver `sobreAlguna` en `pistas-del-vuelo.ts`.
       */
      const [x, z] = en(-r.length / 4, r.width * 0.93);
      out.franja = await rodarDesde(x, z, 24, hp);
    }

    if (que.agua) {
      /*
       * Agua de verdad, no la orilla: donde el suelo dibujado quede tres metros
       * o más por debajo de la lámina, y con agua alrededor hasta medio
       * kilómetro. Con solo lo primero salía un punto al pie de un acantilado
       * de Anaga, y el avión, que en un segundo avanza treinta metros, tocaba
       * la orilla y no el mar.
       */
      const hondo = (x, z) => o.esAgua(x, z) && o.sueloDeVuelo(x, z) - o.suelo(x, z) > 3;
      const agua = buscar(
        (x, z) => {
          if (!hondo(x, z)) return false;
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            if (!hondo(x + Math.cos(a) * 500, z + Math.sin(a) * 500)) return false;
          }
          return true;
        },
        250,
        30000,
      );
      if (!agua) out.agua = { fallo: "no se encontró agua a menos de 30 km" };
      else {
        const [x, z] = agua;
        const distancia = Math.round(Math.hypot(x - r.x, z - r.z));
        // Mar adentro: el rumbo de la pista a ese punto, que se aleja de la costa.
        const mar = Math.atan2(x - r.x, -(z - r.z));
        // Del aire: a doce metros, despacio y con el morro abajo.
        await posarEnLaPista();
        o.colocar(x, o.sueloDeVuelo(x, z) + 12, z, 30, mar);
        o.pilotar((c) => {
          c.engineOn = true;
          c.throttle = 0;
          c.brakes = 0;
          c.elevator = -0.3;
          c.aileron = 0;
        });
        const desde = o.reloj();
        // Lo que pasa, por si sale mal: cuándo toca, dónde y qué pisa.
        const traza = [];
        while (o.reloj() - desde < 12 && !o.percance()) {
          await espera(40 / veces);
          const e = o.estado();
          const { x: px, z: pz } = e.position;
          traza.push(
            `${(o.reloj() - desde).toFixed(2)} s · alto ${(e.position.y - o.sueloDeVuelo(px, pz)).toFixed(1)} m` +
              ` · ${e.onGround ? "en el suelo" : "en el aire"} · agua ${o.esAgua(px, pz)}` +
              ` · ${o.superficie()} · bajo la lámina ${(o.sueloDeVuelo(px, pz) - o.suelo(px, pz)).toFixed(1)} m` +
              ` · ${e.groundSpeed.toFixed(1)} m/s`,
          );
        }
        const delAire = {
          percance: o.percance(),
          tardo: +(o.reloj() - desde).toFixed(1),
          traza: traza.slice(-12),
        };
        o.pilotar(null);
        // Y ya en el suelo, sin venir del aire: como quien entra rodando desde la orilla.
        const rodando = await rodarDesde(x, z, 4, mar, 2);
        out.agua = { distancia, delAire, rodando };
      }
    }
    o.acelerar?.(1);
    return out;
  }, que);
}

const casos = [
  { escenario: "tenerife-norte", tramo: "taguato-ruvicha", que: { campo: true, pista: true, franja: true, agua: true } },
  { escenario: "tenerife-norte", tramo: "guyrami", que: { campo: true, agua: true } },
  { escenario: "yvytu-rape", tramo: "taguato-ruvicha", que: { pista: true } },
];

const fmt = (r) =>
  r.fallo
    ? r.fallo
    : `percance: ${r.percance ?? "ninguno"} · pisaba ${r.superficie} · a ${r.vmax} m/s como mucho` +
      ` (${(r.vmax * 3.6).toFixed(0)} km/h), en el suelo el ${Math.round(r.suelo * 100)} %, ${r.tardo} s` +
      ` · pisadas ${JSON.stringify(r.pisadas)}` +
      (r.antesDelPaso !== r.superficie ? ` · antes del primer paso se leía ${r.antesDelPaso}` : "");

try {
  for (const c of casos) {
    const page = await abrir(c.escenario, c.tramo);
    const r = await probar(page, c.que);
    await page.close();
    const de = `${c.escenario} · ${c.tramo}`;
    console.log(`\n  ${de}: reloj ×${r.veces}`);
    const enTagRuv = c.tramo === "taguato-ruvicha";
    if (r.campo) {
      const deprisa = !r.campo.fallo && r.campo.vmax > 20;
      if (enTagRuv)
        comprobar(`${de}: rodar deprisa por el campo rompe el tren`, deprisa && r.campo.percance === "tren", fmt(r.campo));
      else
        comprobar(
          `${de}: rodar igual de deprisa por el campo no rompe nada`,
          deprisa && r.campo.percance !== "tren" && r.campo.superficie === "campo",
          fmt(r.campo),
        );
    }
    if (r.pista)
      comprobar(
        `${de}: rodar deprisa por la pista no cambia nada`,
        r.pista.percance === null && r.pista.vmax > 20,
        fmt(r.pista),
      );
    if (r.franja)
      comprobar(
        `${de}: ni por su franja, que es campo allanado`,
        r.franja.percance === null && r.franja.vmax > 20 && r.franja.superficie === "campo",
        fmt(r.franja),
      );
    if (r.agua) {
      if (r.agua.fallo) comprobar(`${de}: el agua es percance`, false, r.agua.fallo);
      else {
        const ok = r.agua.delAire.percance === "agua";
        comprobar(
          `${de}: tocar el agua viniendo del aire es percance`,
          ok,
          `a ${r.agua.distancia} m de la pista · percance: ${r.agua.delAire.percance} a los ${r.agua.delAire.tardo} s`,
        );
        if (!ok) for (const l of r.agua.delAire.traza) console.log(`    ${l}`);
        comprobar(
          `${de}: y estar en ella sin venir del aire, también`,
          r.agua.rodando.percance === "agua",
          fmt(r.agua.rodando),
        );
      }
    }
  }
} finally {
  console.log(`\n  tren y agua\n`);
  for (const r of resultados) console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
  const bien = resultados.filter((r) => r.ok).length;
  console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);
  await navegador.close();
  await server.close();
  process.exitCode = bien === resultados.length && resultados.length ? 0 : 1;
}
