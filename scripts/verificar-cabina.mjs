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
import { baseDe } from "./servidor.mjs";

const PUERTO = 5288;
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
const comprobar = (nombre, ok, detalle, porque) =>
  resultados.push({ nombre, ok: !!ok, detalle, porque });

/** Los que tienen cabina de verdad: modelo glTF con panel dentro. */
for (const id of [
  "jaz-20",
  "jaz-25",
  "jaz-40",
  "jaz-60",
  "jaz-90",
  "jaz-120",
]) {
  const page = await navegador.newPage({
    viewport: { width: 900, height: 600 },
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `${BASE}/?escenario=tenerife-norte&hora=16&leccion=despegue&tramo=taguato&avion=${id}`,
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
    /*
     * Y dónde gira cada hélice.
     *
     * Se mide el eje de giro y se busca **la pieza de hélice más cercana**. Es
     * la pregunta que importa: un eje puesto donde no hay hélice no la hace
     * girar, la hace orbitar. Con un eje único para las dos de un bimotor,
     * cae en el eje del fuselaje, que está a dos metros y medio de las dos.
     */
    const bujes = [];
    g.traverse((n) => {
      if (!n.geometry) return;
      if (!/prop|helice|hélice|spinner|blade/i.test(n.name)) return;
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
      bujes.push({ x: sx / pos.count, y: sy / pos.count, z: sz / pos.count });
    });
    const ejes = o.aeronave().helices.map((h) => {
      const v = h.getWorldPosition(new h.position.constructor());
      const l = g.worldToLocal(v);
      const cerca = bujes.length
        ? Math.min(
            ...bujes.map((b) => Math.hypot(b.x - l.x, b.y - l.y, b.z - l.z)),
          )
        : null;
      return {
        x: +l.x.toFixed(2),
        cerca: cerca === null ? null : +cerca.toFixed(2),
      };
    });

    /*
     * Y lo que mide el avión ya puesto en el mundo, en los ejes del avión.
     *
     * Lo ancho tiene que ser su envergadura y lo largo su fuselaje. El
     * cargador lo decidía adivinando —«la dimensión mayor es el ala»—, y eso
     * es verdad en una avioneta y mentira en cuanto el avión es de línea.
     */
    const medidas = (() => {
      let minX = Infinity,
        maxX = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity;
      /*
       * **Y sin las luces**, que no son estructura.
       *
       * Una luz de navegación va *sobre* la puntera del ala y su destello se
       * dibuja un poco por fuera, para que no lo tape la propia ala. Contarlo
       * como envergadura decía que el JAZ 90 mide 26,63 m cuando su ficha
       * —y el modelo de vuelo— dicen 26: sesenta y tres centímetros de avión
       * que no existen, y una comprobación en rojo que no señalaba ningún
       * fallo. Lo que se mide aquí es el avión, no lo que le brilla encima.
       */
      const enLasLuces = (n) => {
        for (let p = n; p; p = p.parent)
          if (p.name === "luces-de-posicion") return true;
        return false;
      };
      g.traverse((n) => {
        if (!n.geometry || enLasLuces(n)) return;
        const pos = n.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const v = new n.position.constructor(
            pos.getX(i),
            pos.getY(i),
            pos.getZ(i),
          );
          n.localToWorld(v);
          const l = g.worldToLocal(v);
          minX = Math.min(minX, l.x);
          maxX = Math.max(maxX, l.x);
          minZ = Math.min(minZ, l.z);
          maxZ = Math.max(maxZ, l.z);
        }
      });
      return {
        ancho: +(maxX - minX).toFixed(2),
        largo: +(maxZ - minZ).toFixed(2),
      };
    })();

    return {
      ojo,
      delante,
      asiento,
      lejos,
      donde,
      ejes,
      medidas,
      envergadura: o.avion().envergadura,
      hayHelices: bujes.length > 0,
      near: o.camara().near,
      pantallas: o.pantallas(),
      relojes: o.relojes(),
      plazas: o.plazas(),
      deLinea: o.deLinea(),
      familia: o.familia(),
      motores: o.avion().motores,
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

  /*
   * **Y el motor, donde lo lleva este avión.**
   *
   * Los instrumentos redondos del panel eran discos grises sin cara: se
   * pusieron sin mirarlos nunca desde el asiento y lo que se veía eran manchas.
   * Ahora los dibuja el juego —ver `world/relojes-cabina.ts`—.
   *
   * Pero **no todos los aviones llevan relojes**, y darlo por hecho era enseñar
   * una cabina que no existe: un reactor lleva pantalla de motores —el EICAS—,
   * y los relojes redondos son de los de hélice. Así que se comprueba lo que a
   * cada uno le toca, y no lo mismo para los seis. Ver `ui/familia.ts`.
   */
  if (visto.deLinea) {
    comprobar(
      etiqueta(
        "los motores tienen su pantalla, que es lo que lleva un reactor",
      ),
      (visto.pantallas ?? []).some((p) => p.dibujo === "motores"),
      `${(visto.pantallas ?? []).map((p) => p.dibujo).join(" · ")}`,
      "un reactor no lleva relojes de motor: lleva EICAS",
    );
  } else {
    /*
     * **Los de motor, que ya no son los únicos.**
     *
     * Este banco contaba todos los relojes del tablero contra el número de
     * motores, y eso valía mientras en el tablero de una avioneta solo hubiera
     * relojes de motor. Desde que un avión de pistón lleva su six-pack, los
     * seis de vuelo son relojes también — y no son motores. Ver `DE_VUELO` en
     * `world/relojes-cabina.ts`.
     */
    const DE_VUELO = ["asi", "ai", "alt", "tc", "dg", "vsi"];
    const deMotor = (visto.relojes ?? []).filter(
      (r) => r.que !== "flaps" && !DE_VUELO.includes(r.que),
    );
    comprobar(
      etiqueta("hay un reloj encendido por motor"),
      deMotor.length === visto.motores,
      `${deMotor.map((r) => r.que).join(" · ") || "ninguno"} · ${visto.motores} motores`,
      "un panel con discos grises sin cara no es un panel",
    );

    comprobar(
      etiqueta("y el de flaps, que es lo otro que se mueve"),
      (visto.relojes ?? []).some((r) => r.que === "flaps"),
      `${(visto.relojes ?? []).length} relojes`,
      "",
    );
  }

  /*
   * **Dos pantallas por piloto, y todas encendidas.**
   *
   * Eran exactamente dos, y en el avión de línea las del copiloto iban apagadas
   * para que el panel se viera simétrico: lo que se veía eran dos cuadros
   * negros —«hay cuadros vacíos»—, y una pantalla apagada en un avión que vuela
   * dice que algo no funciona.
   */
  /*
   * Dos por piloto en un avión de línea y dos en total en una avioneta, que es
   * como son de verdad: un G1000 lleva una pantalla de vuelo y una de
   * navegación para los dos asientos, y una cabina de transporte lleva el juego
   * entero repetido a cada lado.
   */
  /*
   * **Tres en el de línea, y las tres del comandante.**
   *
   * Llevaba un puesto completo por piloto más el EICAS en el eje, que es como
   * está un avión de verdad. Desde el asiento eso se veía así: las del
   * copiloto cortadas por el canto derecho de la pantalla y el grupo entero
   * escorado, con cuatrocientos píxeles de negro a la izquierda. En un 747 el
   * comandante ve exactamente eso y está bien, porque hay otro señor sentado
   * ahí; **aquí no hay otro señor**, y la cámara vive siempre en el asiento de
   * la izquierda. Así que el puesto del copiloto no era realismo: eran cuatro
   * instrumentos cortados que se veían todos los vuelos.
   *
   * Ahora el reactor lleva las tres del comandante en fila y centradas en su
   * cara: actitud, navegación y motores. Ver `_cabina_de_reactor`.
   */
  /*
   * **Y un avión de pistón no lleva ninguna**, que es lo que este banco daba
   * por hecho al revés.
   *
   * Exigía dos cristales a los seis aviones, así que el entrenador de escuela,
   * el fumigador y el bimotor volaban con un G1000 delante — una cabina que
   * ese avión no tiene. La familia la manda el motor y no el peldaño: los de
   * pistón llevan seis esferas redondas, el turbohélice dos pantallas y los
   * reactores las tres del comandante. Es lo mismo que decide el cuadro plano.
   * Ver `familiaDe` en `ui/familia.ts`.
   */
  const DE_VUELO = ["asi", "ai", "alt", "tc", "dg", "vsi"];
  const esferas = visto.familia === "esferas";
  const cuantasTocan = esferas ? 0 : visto.deLinea ? 3 : 2;
  comprobar(
    etiqueta("están todas las pantallas y encendidas"),
    (visto.pantallas?.length ?? 0) === cuantasTocan,
    `${visto.pantallas?.length ?? 0} de ${cuantasTocan} · familia ${visto.familia}`,
    "una pantalla apagada en un avión que vuela dice que algo no funciona",
  );

  if (esferas) {
    const hay = (visto.relojes ?? []).map((r) => r.que);
    comprobar(
      etiqueta("y un avión de pistón lleva sus seis de vuelo"),
      DE_VUELO.every((q) => hay.includes(q)),
      DE_VUELO.filter((q) => !hay.includes(q)).join(" · ") || "los seis",
      "el six-pack que lleva cualquier avioneta del mundo, y el mismo que dibuja el cuadro plano",
    );
  }

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
  if (!esferas)
    comprobar(
      etiqueta("el horizonte va a la izquierda, como en un G1000"),
      horizonte !== undefined && rumbo !== undefined && horizonte.x < rumbo.x,
      conSitio.map((p) => `${p.x} ${p.dibujo}`).join(" · ") || "sin pantallas",
      "el orden salía del centro de la geometría, que en un modelo hecho aquí es cero en las dos",
    );

  /*
   * **Que el avión haya entrado derecho y del tamaño que dice su ficha.**
   *
   * El cargador escala el modelo por su lado mayor y lo gira si le parece que
   * está cruzado, y las dos cosas son adivinanzas que acertaban porque los dos
   * primeros aviones eran avionetas —más anchas que largas—. El JAZ 90 mide
   * veintiséis de ala y treinta y uno y medio de largo: con la regla vieja
   * habría entrado cruzado en la calle de rodaje y escalado por el fuselaje.
   *
   * Aquí no se adivina: lo ancho tiene que ser la envergadura de su ficha, que
   * es la que usa el modelo de vuelo para calcular la sustentación. Si el
   * dibujo y la física no miden lo mismo, el avión parece de otro tamaño del
   * que vuela.
   */
  comprobar(
    etiqueta("mide de ancho la envergadura de su ficha"),
    Math.abs(visto.medidas.ancho - visto.envergadura) < 0.4,
    `ancho ${visto.medidas.ancho} · largo ${visto.medidas.largo} · ficha ${visto.envergadura} m`,
    "el cargador lo giraba y lo escalaba por su lado mayor, y en un avión de línea el lado mayor es el fuselaje",
  );

  /*
   * Y cada hélice sobre su motor.
   *
   * El cargador juntaba todas las piezas de hélice del avión en un eje y lo
   * ponía en el centro de todas. En un monomotor eso es el buje; en el
   * bimotor es el eje del fuselaje, donde no hay ninguna hélice, y las dos se
   * ponen a dar vueltas alrededor del morro. Diez centímetros de holgura: una
   * hélice grande tiene el buje donde tiene el eje, y no más lejos.
   */
  if (visto.hayHelices) {
    comprobar(
      etiqueta("cada hélice gira sobre su motor"),
      visto.ejes.length > 0 &&
        visto.ejes.every((e) => e.cerca !== null && e.cerca < 0.1),
      visto.ejes.map((e) => `x ${e.x} · buje a ${e.cerca} m`).join(" · "),
      "un eje puesto donde no hay hélice no la gira, la pone a orbitar",
    );
  }

  /*
   * **Y que los instrumentos se vean, que es lo único que este banco no miraba.**
   *
   * Daba 64 de 64 mientras quien jugaba decía «todos descentrados y fuera de
   * los márgenes de la pantalla». No se contradecían: todo lo de arriba mide en
   * **metros** —que el reloj esté a tantos centímetros del asiento, que la
   * pantalla caiga sobre el panel— y lo que se ve es otra cosa. Un panel puede
   * estar perfecto en metros y salir medio fuera del cuadro, que es lo que
   * pasaba: los cuatro relojes de motor del de fuselaje ancho iban en una fila
   * de sesenta y ocho centímetros centrada en el eje del fuselaje, y desde el
   * asiento del comandante el cuarto caía en x 1.227…1.370 de un lienzo de
   * 1.280.
   *
   * Se mira en píxeles y desde la cámara de cabina, que es de donde se mira de
   * verdad. Ver la sonda `enPantalla`.
   */
  const enCabina = await page.evaluate(() => {
    const o = globalThis.__oga;
    o.ponerVista("cockpit");
    return o.enPantalla("^(reloj-(motor|flaps)|boton)");
  });
  if (enCabina && enCabina.piezas.length) {
    const fuera = enCabina.piezas.filter(
      (p) =>
        p.detras ||
        p.x0 < 0 ||
        p.x1 > enCabina.ancho ||
        p.y0 < 0 ||
        p.y1 > enCabina.alto,
    );
    comprobar(
      etiqueta("los instrumentos del piloto caben en la pantalla"),
      fuera.length === 0,
      fuera.length
        ? fuera
            .map((p) => `${p.nombre} en x ${p.x0}…${p.x1} de ${enCabina.ancho}`)
            .join(" · ")
        : `${enCabina.piezas.length} piezas, todas dentro`,
      "un reloj que se sale del cuadro es un reloj que no existe para quien juega",
    );
  }

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
