/**
 * **El avión rotando en la pista, de perfil**: si la cola y las ruedas están
 * donde tienen que estar cuando el morro llega a su tope.
 *
 * Lo pidió una medida: el 787 bajaba la panza un metro por debajo de las ruedas
 * a los 9,7° que le deja su fabricante, y el modelo de vuelo giraba en tierra
 * sobre el centro de gravedad, así que al levantar el morro las ruedas de atrás
 * se metían en el asfalto. Las dos cosas se ven de perfil, a ras de suelo, y
 * desde la cámara de seguir no se ven nunca.
 *
 * Pone cada avión en la cabecera de Los Rodeos a su velocidad de rotación, con
 * todo el gas, los flaps arriba —para que se quede en el suelo en el tope en vez
 * de irse— y la palanca atrás del todo. En cuanto el morro deja de subir con las
 * ruedas en el suelo, dibuja dos vistas desde el costado izquierdo con una
 * cámara propia y la misma escena: el avión entero y, de cerca, del tren
 * principal a la cola. Y dice, leído de las mallas que se dibujan, cuánto queda
 * entre el suelo y lo más bajo de las ruedas y de lo que no es rueda.
 *
 * Con el modelo de coeficientes (`taguato-ruvicha`), que es el que tiene tope de
 * cola; el sencillo no levanta el morro en el suelo.
 *
 * Uso: `node scripts/ver-cola-al-rotar.mjs [carpeta] [jaz-110 jaz-120 …]`
 * El puerto, con `OGA_PUERTO`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const CARPETA = process.argv[2] ?? "cola-al-rotar";
const PEDIDOS = process.argv.slice(3);
const PUERTO = Number(process.env.OGA_PUERTO ?? 5606);
const ANCHO = 1600;
const ALTO = 900;

mkdirSync(CARPETA, { recursive: true });
const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, strictPort: true, hmr: false },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});

try {
  for (const id of PEDIDOS.length ? PEDIDOS : ["jaz-110"]) {
    const page = await navegador.newPage({ viewport: { width: ANCHO, height: ALTO } });
    page.on("pageerror", (e) => console.log(`  ${id} ERROR:`, e.message.slice(0, 200)));
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(
      `${BASE}/?escenario=tenerife-norte&hora=12&tramo=taguato-ruvicha&avion=${id}&meteo=&viento=000/00`,
    );
    await page.bringToFront();
    await page.waitForFunction(
      () => globalThis.__oga?.estado?.() && globalThis.__oga?.aeronave?.().deVerdad,
      null,
      { timeout: 120000 },
    );
    await page.waitForTimeout(3000);
    const tarjeta = await page.evaluate(() => {
      const gl = globalThis.__oga.pintor().getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "sin nombre";
    });
    console.log(`\n  ${id} · ${tarjeta}`);

    /*
     * En la pista, a su velocidad de rotación y con los motores en marcha. Tres
     * veces, como en `ver-frenos-de-tierra.mjs`: lo primero que se coloca
     * mientras el juego termina de arrancar puede quedarse por el camino.
     */
    const colocar = () =>
      page.evaluate(() => {
        const o = globalThis.__oga;
        const t = o.puntoDeFinal(-400);
        const a = o.avion();
        o.pedirTren(true);
        o.pedirFlaps(0);
        o.pilotar((c) => {
          c.engineOn = true;
          c.throttle = 1;
          c.elevator = 1;
          c.brakes = 0;
        });
        o.colocar(t.x, o.sueloDeVuelo(t.x, t.z) + a.tren, t.z, a.rotacion, t.h);
      });
    for (let i = 0; i < 3; i++) {
      await colocar();
      await page.waitForTimeout(800);
    }
    await colocar();
    const lectura = await page.evaluate(
      ({ ancho, alto }) =>
        new Promise((resolver) => {
          const o = globalThis.__oga;
          const a = o.avion();
          const g = o.aeronave().grupo;
          const V = g.position.constructor;
          const Camara = o.camaraViva().constructor;
          let antes = -1;
          let quieto = 0;
          let fotogramas = 0;
          const mirar = () => {
            fotogramas++;
            const s = o.estado();
            const cabeceo = o.actitud().cabeceo;
            if (s.onGround && cabeceo > 0.08 && Math.abs(cabeceo - antes) < 2e-5) quieto++;
            else quieto = 0;
            antes = cabeceo;
            if (quieto < 6 && fotogramas < 60 * 40) {
              requestAnimationFrame(mirar);
              return;
            }
            o.pilotar(null);
            g.updateWorldMatrix(true, true);
            const suelo = o.sueloDeVuelo(s.position.x, s.position.z);
            // Lo más bajo de las ruedas y de lo que no es tren, y dónde.
            let ruedas = Infinity;
            let resto = Infinity;
            let dondeResto = null;
            let queResto = "";
            const v = new V();
            const delante = new V(0, 0, -1).applyQuaternion(s.orientation);
            // Solo lo que se dibuja: los calzos y las fundas del puesto viajan
            // con el avión, apagados.
            g.traverseVisible((m) => {
              if (!m.isMesh || !m.geometry?.attributes?.position) return;
              const pos = m.geometry.attributes.position;
              const tren = /^(rueda|pata)/.test(m.name) || /^(rueda|pata)/.test(m.parent?.name ?? "");
              for (let i = 0; i < pos.count; i++) {
                v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
                if (tren) ruedas = Math.min(ruedas, v.y);
                else if (v.y < resto) {
                  resto = v.y;
                  dondeResto = v.clone().sub(s.position).dot(delante);
                  // Con el nombre de quien la lleva, si ella no tiene: las
                  // luces y los destellos se cuelgan sin nombre.
                  let quien = m;
                  while (quien && !quien.name) quien = quien.parent;
                  queResto = `${quien?.name ?? "?"}${m.name ? "" : ` (${m.type})`}`;
                }
              }
            });
            // El largo del avión, para encuadrarlo entero.
            const caja = { min: Infinity, max: -Infinity };
            g.traverse((m) => {
              if (!m.isMesh || !m.geometry?.attributes?.position) return;
              const pos = m.geometry.attributes.position;
              for (let i = 0; i < pos.count; i += 7) {
                v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
                const d = v.clone().sub(s.position).dot(delante);
                caja.min = Math.min(caja.min, d);
                caja.max = Math.max(caja.max, d);
              }
            });
            const largo = caja.max - caja.min;
            // El costado izquierdo, en horizontal.
            const plano = new V(delante.x, 0, delante.z).normalize();
            const izquierda = new V(plano.z, 0, -plano.x);
            const pintor = o.pintor();
            const escena = o.escena();
            const vista = (centroAdelante, alturaDelCentro, distancia, fov) => {
              const cam = new Camara(fov, ancho / alto, 0.3, 20000);
              const centro = new V(s.position.x, suelo + alturaDelCentro, s.position.z).addScaledVector(
                plano,
                centroAdelante,
              );
              cam.position.copy(centro).addScaledVector(izquierda, distancia);
              cam.position.y = suelo + 1.2;
              cam.lookAt(centro);
              cam.updateMatrixWorld();
              pintor.setRenderTarget(null);
              pintor.render(escena, cam);
              return pintor.domElement.toDataURL("image/png");
            };
            const fov = 24;
            const tan = Math.tan(((fov / 2) * Math.PI) / 180) * (ancho / alto);
            const entero = vista((caja.min + caja.max) / 2, a.tren, (largo * 0.6) / tan, fov);
            // De cerca: de un poco por delante del tren principal hasta la cola.
            const desde = -a.tren * 0.5;
            const hasta = caja.min;
            const cerca = vista((desde + hasta) / 2, 1.5, ((desde - hasta) * 0.62) / tan, fov);
            resolver({
              cabeceo: (cabeceo * 180) / Math.PI,
              velocidad: s.airspeed,
              enTierra: s.onGround,
              ruedas: ruedas - suelo,
              resto: resto - suelo,
              dondeResto,
              queResto,
              origen: s.position.y - suelo,
              fotogramas,
              entero,
              cerca,
            });
          };
          requestAnimationFrame(mirar);
        }),
      { ancho: ANCHO, alto: ALTO },
    );
    for (const [nombre, url] of [
      ["entero", lectura.entero],
      ["cerca", lectura.cerca],
    ]) {
      const ruta = `${CARPETA}/${id}-${nombre}.png`;
      writeFileSync(ruta, Buffer.from(url.split(",")[1], "base64"));
      console.log(`    ${ruta}`);
    }
    console.log(
      `    a ${lectura.cabeceo.toFixed(2)}° y ${(lectura.velocidad / 0.514444).toFixed(0)} nudos, ` +
        `${lectura.enTierra ? "en el suelo" : "en el aire"} (${lectura.fotogramas} fotogramas): ` +
        `ruedas ${lectura.ruedas >= 0 ? "+" : ""}${lectura.ruedas.toFixed(3)} m, ` +
        `lo más bajo que no es tren ${lectura.resto >= 0 ? "+" : ""}${lectura.resto.toFixed(3)} m ` +
        `(${lectura.queResto}, a ${lectura.dondeResto.toFixed(1)} m del centro de gravedad), ` +
        `origen a ${lectura.origen.toFixed(3)} m del suelo`,
    );
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}
