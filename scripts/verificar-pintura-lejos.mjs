/**
 * **¿Parpadea la pintura de lejos?**
 *
 * La pintura iba veinte centímetros sobre el asfalto y ahora va a dos, sobre
 * el asfalto dibujado —ver `PINTURA_ALTURA` en `aerodrome.ts`—. Veinte
 * centímetros no la separaban de lejos: a doscientos metros el búfer de
 * profundidad ya no distingue eso, y lo que la mantiene encima es el
 * desplazamiento de polígono. Esto lo comprueba en vez de suponerlo.
 *
 * El parpadeo de dos superficies que se pelean es **lo que cambia de un
 * fotograma a otro sin que cambie nada**. Así que se pinta la escena quieta
 * ocho veces desde el mismo sitio, moviendo la cámara un milímetro cada vez
 * —nada que se vea—, y se cuentan los píxeles que cambian de color. Todo en
 * el mismo instante del juego: el mundo no se mueve entre una y otra, solo la
 * cámara. Un borde que cae entre dos píxeles también cambia, y eso es igual
 * con veinte centímetros que con dos; lo que se compara es el número con el
 * arreglo y sin él, desde los mismos sitios.
 *
 * Vistas: en final a uno y medio, tres y seis kilómetros sobre la senda de
 * tres grados, y a ras de pista —dos metros— mirando la pista entera, que es
 * donde el ángulo es más rasante.
 *
 * Uso: `OGA_GPU=1 node scripts/verificar-pintura-lejos.mjs [campo…]`.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const CAMPOS = process.argv.length > 2 ? process.argv.slice(2) : ["tenerife-norte", "pettirossi", "gran-canaria"];
const CON_GPU = process.env.OGA_GPU === "1";
const PUERTO = 5298;

const server = await createServer({ root: process.cwd(), server: { port: PUERTO, hmr: false } });
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader"],
});

try {
  for (const campo of CAMPOS) {
    const page = await navegador.newPage({ viewport: { width: 1000, height: 620 } });
    await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
    await page.goto(`${BASE}/?escenario=${campo}&hora=16&leccion=vuelta&meteo=`);
    await page.waitForFunction(() => !!globalThis.__oga?.estado, null, { timeout: 120000 });
    await page.waitForTimeout(6000);
    const r = await page.evaluate(() => {
      const o = globalThis.__oga;
      const pintor = o.pintor();
      const gl = pintor.getContext();
      const escena = o.escena();
      const cam = o.camaraViva().clone();
      const p = o.pista();
      const h = (p.heading * Math.PI) / 180;
      const fx = Math.sin(h);
      const fz = -Math.cos(h);
      const umbral = { x: p.x - fx * (p.length / 2), z: p.z - fz * (p.length / 2) };
      const cota = o.sueloDeVuelo(umbral.x, umbral.z);
      const V = cam.position.constructor;
      const vistas = [
        ...[1500, 3000, 6000].map((d) => ({
          nombre: `final ${d / 1000} km`,
          ojo: new V(umbral.x - fx * d, cota + d * Math.tan((3 * Math.PI) / 180), umbral.z - fz * d),
          mira: new V(umbral.x + fx * 300, cota, umbral.z + fz * 300),
        })),
        {
          nombre: "a ras de pista",
          ojo: new V(umbral.x - fx * 20, cota + 2, umbral.z - fz * 20),
          mira: new V(umbral.x + fx * p.length, cota + 1, umbral.z + fz * p.length),
        },
      ];
      const w = gl.drawingBufferWidth;
      const alto = gl.drawingBufferHeight;
      const tomar = () => {
        pintor.render(escena, cam);
        const px = new Uint8Array(w * alto * 4);
        gl.readPixels(0, 0, w, alto, gl.RGBA, gl.UNSIGNED_BYTE, px);
        return px;
      };
      const derecha = new V();
      return vistas.map((v) => {
        let cambian = 0;
        let antes = null;
        for (let k = 0; k < 8; k++) {
          cam.position.copy(v.ojo);
          cam.lookAt(v.mira);
          cam.updateMatrixWorld(true);
          derecha.setFromMatrixColumn(cam.matrixWorld, 0);
          // Un milímetro a la derecha y otro arriba por fotograma: menos que lo
          // que mueve un borde un píxel a veinte metros, y de sobra para que
          // dos superficies empatadas cambien de ganadora.
          cam.position.addScaledVector(derecha, 0.001 * k);
          cam.position.y += 0.001 * k;
          cam.updateMatrixWorld(true);
          const px = tomar();
          if (antes) {
            for (let i = 0; i < px.length; i += 4) {
              const d =
                Math.abs(px[i] - antes[i]) +
                Math.abs(px[i + 1] - antes[i + 1]) +
                Math.abs(px[i + 2] - antes[i + 2]);
              if (d > 60) cambian++;
            }
          }
          antes = px;
        }
        return { vista: v.nombre, cambian: Math.round(cambian / 7) };
      });
    });
    console.log(`${campo}: ${r.map((x) => `${x.vista} ${x.cambian} px`).join(" · ")}`);
    await page.close();
  }
} finally {
  await navegador.close();
  await server.close();
}
