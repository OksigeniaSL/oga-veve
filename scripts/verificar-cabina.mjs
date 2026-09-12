/**
 * La cabina por dentro, mirada desde el asiento del piloto.
 *
 * Un avión de este juego se vuela desde fuera casi siempre, pero la vista de
 * cabina es la que convierte el modelo en un avión: si desde el asiento no hay
 * panel, no hay cabina — hay una burbuja. «JAZ 25 no tiene panel de mandos.»
 *
 * Aquí se comprueban las tres cosas que se rompieron haciéndola, y ninguna de
 * las tres se ve en una prueba unitaria:
 *
 * 1. **Que haya algo delante del piloto y que se vea.** El panel estaba puesto
 *    y no salía: quedaba a cuarenta y cinco centímetros de los ojos y el plano
 *    cercano de la cámara está a sesenta, así que se recortaba entero.
 * 2. **Que los ojos estén donde va la cabeza**, no a la altura del cojín. El
 *    sitio sale del asiento más adelantado del modelo, y con el cojín y el
 *    respaldo como dos piezas ganaba el cojín: el piloto sentado en el suelo.
 * 3. **Que el horizonte esté a la izquierda**, como en un G1000. El orden se
 *    decidía con el centro de la geometría, y eso solo funciona en el modelo
 *    traído de fuera; en el hecho aquí las dos pantallas son la misma
 *    geometría movida por el nodo.
 *
 * Uso: `node scripts/verificar-cabina.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";

const PUERTO = 5288;
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

/** Los que tienen cabina de verdad: modelo glTF con panel dentro. */
for (const id of ["jaz-20", "jaz-25"]) {
  const page = await navegador.newPage({
    viewport: { width: 900, height: 600 },
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `http://localhost:${PUERTO}/?escenario=tenerife-norte&leccion=despegue&tramo=taguato&avion=${id}`,
  );
  await page
    .waitForFunction(
      () => globalThis.__oga?.aeronave?.().deVerdad === true,
      null,
      { timeout: 60000 },
    )
    .catch(() => {});

  const visto = await page.evaluate(() => {
    const o = globalThis.__oga;
    const a = o.aeronave();
    const g = a.grupo;
    g.updateWorldMatrix(true, true);
    const ojo = a.ojo;
    if (!ojo) return { ojo: null };
    /*
     * Qué hay delante de los ojos, dentro de la cabina.
     *
     * Se recorre el modelo pieza a pieza y se mira, en el marco del avión,
     * cuál cae delante del piloto —Z más negativa— y a qué distancia. Vale
     * cualquier pieza: lo que se comprueba es que **haya algo** ahí y que no
     * esté tan cerca que la cámara lo recorte.
     */
    let delante = null;
    g.traverse((n) => {
      if (!n.geometry || !n.name) return;
      if (!/panel|dash|salpic/i.test(n.name)) return;
      const pos = n.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const v = new n.position.constructor(
          pos.getX(i),
          pos.getY(i),
          pos.getZ(i),
        );
        n.localToWorld(v);
        const l = g.worldToLocal(v);
        const d = Math.hypot(l.x - ojo.x, l.y - ojo.y, l.z - ojo.z);
        if (l.z > ojo.z) continue; // detrás del piloto
        if (!delante || d < delante.distancia)
          delante = { nombre: n.name, distancia: +d.toFixed(2) };
      }
    });
    /*
     * Y lo alto que es el asiento **más adelantado**, que es el que elige el
     * juego para sentar al piloto. Vértice a vértice y en el marco del avión:
     * la caja de la geometría está en coordenadas de la pieza, y con el modelo
     * girado y escalado esas dos no son la misma cosa.
     */
    let asiento = null;
    g.traverse((n) => {
      if (!/asiento|seat|chair/i.test(n.name) || !n.geometry) return;
      const pos = n.geometry.attributes.position;
      let arriba = -Infinity;
      let adelante = Infinity;
      for (let i = 0; i < pos.count; i++) {
        const v = new n.position.constructor(
          pos.getX(i),
          pos.getY(i),
          pos.getZ(i),
        );
        n.localToWorld(v);
        const l = g.worldToLocal(v);
        arriba = Math.max(arriba, l.y);
        adelante = Math.min(adelante, l.z);
      }
      if (!asiento || adelante < asiento.z) asiento = { z: adelante, arriba };
    });
    /*
     * Y a qué distancia de los ojos queda cada pantalla. Es lo que de verdad
     * hay que poder leer desde el asiento, y es lo que se recortaba.
     */
    const lejos = [];
    const donde = {};
    g.traverse((n) => {
      if (!n.material?.map || n.geometry?.getAttribute("uv")?.count !== 4)
        return;
      const pos = n.geometry.attributes.position;
      let sx = 0,
        sy = 0,
        sz = 0;
      for (let i = 0; i < pos.count; i++) {
        const v = new n.position.constructor(
          pos.getX(i),
          pos.getY(i),
          pos.getZ(i),
        );
        n.localToWorld(v);
        const l = g.worldToLocal(v);
        sx += l.x;
        sy += l.y;
        sz += l.z;
      }
      const c = { x: sx / pos.count, y: sy / pos.count, z: sz / pos.count };
      lejos.push(+Math.hypot(c.x - ojo.x, c.y - ojo.y, c.z - ojo.z).toFixed(2));
      // Y a qué lado del avión cayó, medido aquí y no preguntado al juego.
      donde[n.uuid] = +c.x.toFixed(3);
    });
    return {
      ojo,
      delante,
      asiento,
      lejos,
      donde,
      near: o.camara().near,
      pantallas: o.pantallas(),
    };
  });

  const etiqueta = (t) => `${id}: ${t}`;

  comprobar(
    etiqueta("el piloto tiene sitio en el modelo"),
    visto.ojo !== null,
    visto.ojo ? "el modelo dice dónde se sienta" : "sin asiento en el modelo",
    "sin asiento manda la fórmula de las cajas y esto no mide nada",
  );
  if (!visto.ojo) {
    await page.close();
    continue;
  }

  comprobar(
    etiqueta("hay panel delante de los ojos"),
    visto.delante !== null,
    visto.delante
      ? `${visto.delante.nombre} a ${visto.delante.distancia} m`
      : "no hay ninguna pieza de panel delante",
    "una cabina sin panel es una burbuja",
  );

  /*
   * Y las pantallas, que es lo que hay que poder leer: más allá del plano
   * cercano de la cámara, o no se dibujan. Se mide su centro y no el vértice
   * más próximo, porque un panel ancho siempre tiene una esquina cerca — el
   * del Pykasu la tiene a cuarenta y cinco centímetros y se lee perfectamente.
   */
  comprobar(
    etiqueta("las pantallas caen más allá del plano cercano"),
    visto.lejos.length > 0 &&
      visto.lejos.every((d) => d !== null && d > visto.near),
    `${visto.lejos.join(" · ")} m · plano cercano ${visto.near} m`,
    "el panel entero estaba a 0,45 m con el plano a 0,60 y se recortaba",
  );

  comprobar(
    etiqueta("los ojos están a la altura de la cabeza, no del cojín"),
    visto.asiento !== null &&
      Math.abs(visto.ojo.y - visto.asiento.arriba) < 0.1,
    `ojos ${visto.ojo.y.toFixed(2)} · alto del asiento ${visto.asiento?.arriba.toFixed(2)}`,
    "con el cojín y el respaldo sueltos ganaba el cojín y el piloto iba sentado en el suelo",
  );

  comprobar(
    etiqueta("hay dos pantallas encendidas"),
    visto.pantallas?.length === 2,
    `${visto.pantallas?.length ?? 0} pantallas`,
    "el modelo trae dos, y en blanco quedan peor que sin nada",
  );

  /*
   * Y el horizonte a la izquierda del piloto, que es la −X del avión. En un
   * G1000 de verdad el horizonte está a la izquierda y la rosa a la derecha, y
   * quien se siente aquí un día se va a sentar en uno.
   */
  const conSitio = (visto.pantallas ?? []).map((p) => ({
    ...p,
    x: visto.donde[p.uuid],
  }));
  const horizonte = conSitio.find((p) => p.dibujo === "horizonte");
  const rumbo = conSitio.find((p) => p.dibujo === "rumbo");
  comprobar(
    etiqueta("el horizonte va a la izquierda, como en un G1000"),
    horizonte !== undefined && rumbo !== undefined && horizonte.x < rumbo.x,
    conSitio.map((p) => `${p.x} ${p.dibujo}`).join(" · ") || "sin pantallas",
    "el orden salía del centro de la geometría, que en un modelo hecho aquí es cero en las dos",
  );

  comprobar(
    etiqueta("sin errores"),
    !errores.length,
    errores[0] ?? "limpio",
    "",
  );
  await page.close();
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
