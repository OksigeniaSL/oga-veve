/**
 * Las ruedas, sobre el asfalto: ni dentro ni flotando. En el juego de verdad,
 * con la flota, en el campo de salida y en los de llegada.
 *
 * Existe por Guaraní: el JAZ 40, el 60, el 90 y el 120 con las ruedas medio
 * metidas en la pista. Era de todos los campos —el modelo de vuelo apoyaba
 * las ruedas en el terreno aplanado, treinta y cinco centímetros por debajo
 * del asfalto dibujado; ver `mapa-del-pavimento.ts`— y ningún banco lo veía,
 * porque todos medían la altura del avión contra `sampleHeight`, que es
 * justo el suelo equivocado: medían una superficie contra sí misma.
 *
 * Así que aquí no se le pregunta al juego dónde está el suelo. Se mira **lo
 * que se ve**: el punto más bajo del modelo del avión —las ruedas— y, justo
 * debajo, un rayo contra lo que se dibuja, que es el asfalto, la hierba o el
 * agua que tenga encima el avión. La diferencia es cuánto están las ruedas
 * dentro (negativo) o por encima (positivo) de lo que se ve.
 *
 * `ruedas-en-el-asfalto.test.ts` mira lo mismo sin navegador y en cada metro
 * de pista; esto mira lo que aquella no puede: que cada modelo de la flota se
 * apoye por sus ruedas y que en el campo de llegada —que es otro mundo, con
 * su desplazamiento— conteste su pavimento y no el de casa.
 *
 * ## Dónde se mide
 *
 * En cada carga: en el puesto del campo de salida, en el centro de su pista,
 * y en el centro de la pista de **uno** de los campos de llegada montados, que
 * va rotando de avión en avión para que entre los seis pasen por todos.
 *
 * Uso: `node scripts/verificar-ruedas.mjs [campos] [aviones]`, con listas
 * separadas por comas. Sin nada, todos los campos con toda la flota: unos
 * veinte minutos. `OGA_FOTOS=carpeta` saca una foto de lado en cada medida y
 * `OGA_GPU=1` la hace con la tarjeta de verdad.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5317;

/** Cuánto se perdona, m: «unos centímetros». */
const TOLERANCIA = 0.05;

const CAMPOS = (process.argv[2] ?? "").split(",").filter(Boolean);
if (!CAMPOS.length)
  CAMPOS.push(
    "valle-cordillera", "chaco", "pettirossi", "guarani", "yvytu-rape",
    "encarnacion", "estigarribia", "pedro-juan",
    "concepcion", "tenerife-norte", "tenerife-sur", "la-palma",
    "gran-canaria", "el-hierro", "la-gomera", "lanzarote", "fuerteventura",
    "cuatro-vientos",
  );
const AVIONES = (process.argv[3] ?? "").split(",").filter(Boolean);
if (!AVIONES.length)
  AVIONES.push("jaz-20", "jaz-25", "jaz-40", "jaz-60", "jaz-90", "jaz-120");

const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(FOTOS, { recursive: true });
}
const CON_GPU = process.env.OGA_GPU === "1";

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

const medidas = [];
const problemas = [];

/**
 * Lo que se ve debajo de las ruedas, medido dentro de la página.
 *
 * El punto más bajo de las mallas visibles del avión, en el mundo, y un rayo
 * hacia abajo desde ahí contra todo lo que no sea el propio avión ni lo que
 * se pinta encima del suelo sin ser suelo: la raya verde, la sombra, las
 * luces y los aros.
 */
async function medirAqui(page) {
  return page.evaluate(async () => {
    const o = globalThis.__oga;
    const { Raycaster, Vector3 } = await import(
      "/node_modules/three/build/three.module.js"
    );
    const avion = o.aeronave().grupo;
    avion.updateWorldMatrix(true, true);
    const visible = (n) => {
      for (let p = n; p; p = p.parent) if (!p.visible) return false;
      return true;
    };
    const v = new Vector3();
    let bajo = null;
    avion.traverse((m) => {
      if (!m.isMesh || !visible(m)) return;
      const pos = m.geometry?.attributes?.position;
      if (!pos) return;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        if (!bajo || v.y < bajo.y) bajo = { x: v.x, y: v.y, z: v.z, pieza: m.name };
      }
    });
    if (!bajo) return null;
    const rayo = new Raycaster(
      new Vector3(bajo.x, bajo.y + 30, bajo.z),
      new Vector3(0, -1, 0),
    );
    /*
     * Lo que no es suelo: lo que se pinta encima sin serlo —la raya verde,
     * la sombra, las luces, los aros—, lo que anda por ahí, y **la pintura**,
     * que va a propósito veinte centímetros sobre el asfalto para no pelearse
     * con él de lejos (`PINTURA_ALTURA`) y no se pisa. Y el agua de casa, que
     * sobre el campo de llegada no se dibuja —su orilla lo tapa— y el rayo
     * sí la encuentra.
     */
    const NO_ES_SUELO =
      /plan-de-vuelo|ruta|sombra|luces|balizas|aros|senda|cielo|nubes|lluvia|sigueme|senalero|trafico|amarillo|pintura|designador|letreros|marcas|puntos-de-mira|cabeceras|helipuertos|agua/;
    const golpes = rayo.intersectObjects(o.escena().children, true);
    let suelo = null;
    for (const g of golpes) {
      if (!g.object.isMesh || g.object.isInstancedMesh) continue;
      if (!visible(g.object)) continue;
      let deAvion = false;
      let nombres = "";
      for (let p = g.object; p; p = p.parent) {
        if (p === avion) deAvion = true;
        nombres += `${p.name}<`;
      }
      if (deAvion || NO_ES_SUELO.test(nombres)) continue;
      suelo = { y: g.point.y, que: nombres.split("<").filter(Boolean).slice(0, 2).join("<") };
      break;
    }
    const s = o.estado();
    return {
      avion: o.avion().id,
      dibujo: o.avion().dibujo,
      oaci: o.aerodromoDeAhora?.() ?? null,
      pieza: bajo.pieza,
      ruedas: bajo.y,
      suelo: suelo?.y ?? null,
      que: suelo?.que ?? "nada",
      enTierra: s.onGround,
      velocidad: s.airspeed,
    };
  });
}

/** Pone el avión parado y frenado en un punto, y deja que se asiente. */
async function ponerEn(page, x, z, rumbo) {
  await page.evaluate(
    ({ x, z, rumbo }) => {
      const o = globalThis.__oga;
      o.pilotar((c) => {
        c.throttle = 0;
        c.brakes = 1;
      });
      // Al suelo de vuelo más el tren: justo apoyado, sin caer.
      const y = o.sueloDeVuelo(x, z) + o.estado().position.y - o.sueloDeVuelo(
        o.estado().position.x,
        o.estado().position.z,
      );
      o.colocar(x, y, z, 0, rumbo);
    },
    { x, z, rumbo },
  );
  // Que el vecino se monte de cerca y el modelo de vuelo se asiente.
  await page.waitForTimeout(3000);
}

let n = 0;
for (const campo of CAMPOS) {
  const vistos = new Set();
  for (const pedido of AVIONES) {
    const page = await navegador.newPage({ viewport: { width: 1000, height: 620 } });
    const errores = [];
    page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
    await page.addInitScript(() => {
      localStorage.setItem("oga-veve:teclas-vistas", "1");
    });
    try {
      await page.goto(
        `${BASE}/?escenario=${campo}&hora=16&leccion=despegue&tramo=guyrami&avion=${pedido}`,
      );
      const arranco = await page
        .waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 120000 })
        .then(() => true)
        .catch(() => false);
      if (!arranco) {
        problemas.push(`${campo} · ${pedido}: el juego no arrancó`);
        continue;
      }
      // El modelo de verdad, no el de la fábrica: es el que tiene ruedas.
      await page
        .waitForFunction(() => globalThis.__oga.avion().dibujo === "modelo", null, {
          timeout: 30000,
        })
        .catch(() => {});
      await page.waitForTimeout(2500);
      const id = await page.evaluate(() => globalThis.__oga.avion().id);
      /*
       * **Cada avión solo donde puede ir.** Si el juego no deja traer este
       * avión a este campo, pone otro; ese otro ya se mide cuando le toque.
       */
      if (id !== pedido || vistos.has(id)) {
        console.log(`  · ${campo}: ${pedido} no va aquí (sale el ${id})`);
        continue;
      }
      vistos.add(id);
      if (FOTOS) await page.evaluate(() => globalThis.__oga.ponerVista("izquierda"));

      const sitios = [];
      const medirY = async (donde) => {
        const medida = await medirAqui(page);
        sitios.push({ donde, medida });
        if (FOTOS)
          await page.screenshot({ path: `${FOTOS}/${campo}-${id}-${donde}.png` });
      };
      await medirY("puesto");
      const pista = await page.evaluate(() => globalThis.__oga.pista());
      if (pista) {
        await ponerEn(page, pista.x, pista.z, (pista.heading * Math.PI) / 180);
        await medirY("pista");
      }
      /*
       * Y uno de los campos de llegada, rotando: con seis aviones por campo,
       * los montados —cuatro como mucho— pasan todos.
       */
      const fuera = await page.evaluate(() => globalThis.__oga.pistasDeLosVecinos());
      if (fuera.length) {
        const otra = fuera[n % fuera.length];
        await ponerEn(page, otra.x, otra.z, (otra.heading * Math.PI) / 180);
        await medirY("llegada");
      }
      n++;

      for (const { donde, medida } of sitios) {
        if (!medida || medida.suelo === null) {
          problemas.push(`${campo} · ${id} · ${donde}: no hay nada que medir`);
          continue;
        }
        const d = medida.ruedas - medida.suelo;
        const fila = {
          campo,
          avion: id,
          donde,
          oaci: medida.oaci,
          d,
          que: medida.que,
          dibujo: medida.dibujo,
          enTierra: medida.enTierra,
        };
        medidas.push(fila);
        const bien = Math.abs(d) <= TOLERANCIA && medida.enTierra;
        console.log(
          `  ${bien ? "✓" : "✗"} ${campo.padEnd(16)} ${id.padEnd(7)} ${donde.padEnd(8)} ` +
            `${(medida.oaci ?? "").padEnd(5)} ${(d * 100).toFixed(1).padStart(6)} cm  ` +
            `sobre ${medida.que}${medida.enTierra ? "" : "  (¡en el aire!)"}` +
            `${medida.dibujo === "modelo" ? "" : "  (modelo de fábrica)"}`,
        );
        if (!bien)
          problemas.push(
            `${campo} · ${id} · ${donde} (${medida.oaci}): ` +
              `${(d * 100).toFixed(0)} cm ${d < 0 ? "dentro de" : "por encima de"} ${medida.que}`,
          );
      }
      if (errores.length) problemas.push(`${campo} · ${id}: ${errores[0]}`);
    } finally {
      await page.close();
    }
  }
}

await navegador.close();
await server.close();

const malas = medidas.filter((m) => Math.abs(m.d) > TOLERANCIA || !m.enTierra);
const campos = new Set(medidas.map((m) => m.oaci ?? m.campo));
const aviones = new Set(medidas.map((m) => m.avion));
console.log(
  `\n  ${medidas.length - malas.length} de ${medidas.length} medidas con las ruedas a menos de ` +
    `${TOLERANCIA * 100} cm de lo que se ve · ${campos.size} campos · ${aviones.size} aviones`,
);
for (const p of problemas) console.log(`  ✗ ${p}`);
process.exit(problemas.length || !medidas.length ? 1 : 0);
