/**
 * Que los carteles del vuelo no se pisen unos a otros.
 *
 * El HUD de este juego tiene dos cosas que dicen qué hacer y las dos viven
 * abajo y en el medio, que es donde ya mira quien pilota:
 *
 * - **la señal**, que es la orden —«arrancá el motor», «frená», «salí de la
 *   pista»— y cuando se puede tocar lleva un borde ocre que late;
 * - **el tutor**, que es la explicación con su barra —«esperá a que corra».
 *
 * Las dos son `position: fixed`, las dos van centradas abajo y las dos tenían
 * el mismo `z-index`, así que **con las dos puestas a la vez se solapaban**:
 * el filo naranja de la de atrás asomando por un lado de la de delante. Se vio
 * jugando, en una foto: «aquí hay solapes de carteles».
 *
 * Esto no se caza con una prueba unitaria —hace falta CSS de verdad, y el
 * tamaño de cada tarjeta depende de lo que lleve escrito— ni se caza fácil
 * jugando, porque las dos coinciden solo en unos segundos concretos. Así que
 * aquí se **fuerzan las dos a la vez**, con el texto más largo que pueden
 * llevar, y se mide si se tocan. En cuatro tamaños de pantalla, que es donde
 * la cuenta de porcentajes cambia.
 *
 * Y lo mismo con **los carteles que se encienden solos**: la lámpara de la
 * torre y el cartel del cinturón. Ésos nadie los pide, así que cuando uno de
 * ellos se queda debajo de otra cosa no se ve como un solape — se ve como que
 * el juego suena y no enseña nada. Pasó con el cinturón: vivía arriba en el
 * centro, que es donde va la fila de tarjetas de «qué toca hacer ahora», y se
 * encendía detrás de ellas. «Oigo como un timbre después de despegar y
 * aproximándome, pero no veo señales de cinturón ni nada, ¿está detrás de
 * algo?» Estaba.
 *
 * Uso: `node scripts/verificar-carteles.mjs`
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = 5291;
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

/**
 * Los tamaños donde esto puede romperse.
 *
 * El sitio de las dos tarjetas se calcula en porcentaje de la altura —8 % y
 * 9 %— más lo que ocupe el cuadro de mandos, así que en una pantalla baja los
 * dos porcentajes valen casi lo mismo y en una alta se separan. Van una tablet
 * de pie, una apaisada, un móvil estrecho y un portátil.
 */
const PANTALLAS = [
  [565, 641, "dedo"],
  [900, 600],
  [400, 780, "dedo"],
  [1280, 800],
  /*
   * **Y con el dedo**, que es otro reparto: `pointer: coarse` reserva la
   * franja de los pulgares y, en pantallas bajas, dibuja el HUD a escala. Sin
   * estas, nadie vio que en un teléfono apaisado la columna de mandos caía
   * entera por debajo del borde y la llave de arrancar se cortaba — desde un
   * móvil no se podía ni arrancar. Ver la regla de pantallas bajas en
   * `style.css`.
   */
  [1280, 800, "dedo"],
  [1024, 600, "dedo"],
  [915, 412, "dedo"],
  [800, 360, "dedo"],
];

/*
 * **Y dos juegos, no uno.** El reactor de La Palma lleva la columna de mandos
 * más larga —tren, reversa, freno—; el peldaño de los pequeños lleva el
 * rincón más alto —los cuatro dibujos y la tarjeta—. Mirando solo el reactor
 * no se vio que en Guyrami la llave de arrancar caía encima del cuadro.
 */
const JUEGOS = [
  /*
   * Tenerife Norte y no La Palma: el mismo reactor, y además el mensaje de la
   * tripulación al arrancar, que ocupa dos líneas en la barra de arriba y
   * empuja la columna hacia abajo. En La Palma no sale y el destino cabía.
   */
  { escenario: "tenerife-norte", tramo: "taguato", avion: "jaz-90" },
  { escenario: "pettirossi", tramo: "guyrami", avion: "jaz-20" },
];

for (const juego of JUEGOS)
for (const [ancho, alto, dedo] of PANTALLAS) {
  const page = await navegador.newPage({
    viewport: { width: ancho, height: alto },
    hasTouch: !!dedo,
    isMobile: !!dedo,
  });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 160)));
  /*
   * Y todo lo que pase en la carga, para imprimirlo si no arranca: se ha
   * visto «main.ts no llegó a ejecutarse» sin ninguna petición abierta, y
   * eso deja fuera solo lo pendiente. Lo que falla o responde con error
   * también cuenta.
   */
  const carga = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      carga.push(`consola ${m.type()}: ${m.text().slice(0, 160)}`);
  });
  page.on("requestfailed", (r) =>
    carga.push(`falló ${r.url().replace(/^https?:\/\/[^/]+/, "")} ${r.failure()?.errorText ?? ""}`),
  );
  page.on("response", (r) => {
    if (r.status() >= 400)
      carga.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, "")}`);
  });
  const pendientes = new Set();
  page.on("request", (r) => pendientes.add(r.url().replace(/^https?:\/\/[^/]+/, "")));
  page.on("requestfinished", (r) => pendientes.delete(r.url().replace(/^https?:\/\/[^/]+/, "")));
  page.on("requestfailed", (r) => pendientes.delete(r.url().replace(/^https?:\/\/[^/]+/, "")));
  await page.addInitScript(() => {
    localStorage.setItem("oga-veve:teclas-vistas", "1");
  });
  await page.goto(
    `${BASE}/?escenario=${juego.escenario}&hora=16&leccion=despegue` +
      `&tramo=${juego.tramo}&avion=${juego.avion}`,
  );
  /*
   * **Y si no arranca, se dice.** Aquí había un `.catch(() => {})`, y un
   * arranque lento salía después como «no se encontraron las tarjetas»: un
   * fallo del HUD que no era del HUD.
   */
  const arranco = await page
    .waitForFunction(() => globalThis.__oga?.estado?.(), null, {
      timeout: 60000,
    })
    .then(() => true)
    .catch(() => false);
  if (!arranco) {
    // Y hasta dónde llegó: ver las migas de `main.ts`.
    const migas = await page
      .evaluate(() => globalThis.__arranque ?? null)
      .catch(() => null);
    comprobar(
      `${ancho}×${alto}${dedo ? " con el dedo" : ""}: el juego arrancó`,
      false,
      `no arrancó en 60 s · ${migas ? `llegó a: ${migas.join(" · ")}` : "sin migas: main.ts no llegó a ejecutarse"}` +
        (pendientes.size
          ? ` · peticiones abiertas: ${[...pendientes].slice(0, 5).join(" ")}`
          : " · ninguna petición abierta") +
        ` · errores: ${errores.slice(0, 3).join(" | ") || "ninguno"}` +
        ` · en la carga: ${carga.slice(0, 8).join(" | ") || "nada raro"}`,
      "no es un fallo de los carteles: es que no hubo juego que medir",
    );
    await page.close();
    continue;
  }
  await page.waitForTimeout(1200);

  const visto = await page.evaluate(() => {
    const senal = document.querySelector('[data-hud="senal"]');
    const tutor = document.querySelector('[data-hud="tutor"]');
    if (!senal || !tutor) return null;
    /*
     * Las dos puestas y con lo más largo que pueden llevar. La señal ya está
     * puesta al arrancar —«arrancá el motor», que además es la pulsable, la
     * del borde ocre—, así que solo hay que sacar el tutor.
     */
    tutor.hidden = false;
    const texto = tutor.querySelector('[data-hud="tutor-text"]');
    if (texto)
      texto.textContent = "Empujá el motor a tope y esperá a que corra";
    const a = senal.getBoundingClientRect();
    const b = tutor.getBoundingClientRect();
    const solape =
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0;
    return {
      solape,
      hueco: Math.round(a.top - b.bottom),
      senal: [Math.round(a.top), Math.round(a.bottom)],
      tutor: [Math.round(b.top), Math.round(b.bottom)],
      clase: senal.className,
      // Y que ninguna se salga de la pantalla por arriba o por abajo.
      fuera: b.top < 0 || a.bottom > window.innerHeight,
    };
  });

  /*
   * Y los que se encienden solos, encendidos a la fuerza: se mira **quién les
   * cae encima**. Se descartan los velos que cubren la pantalla entera —la
   * viñeta y el destello de V1—, que se solapan con todo por definición y no
   * tapan nada: son transparentes.
   */
  const tapados = await page.evaluate(() => {
    const salida = [];
    for (const que of ["cinturon", "torre"]) {
      const el = document.querySelector(`[data-hud="${que}"]`);
      if (!el) continue;
      el.hidden = false;
      const c = el.getBoundingClientRect();
      /*
       * **Y «se ve» no es «no se solapa»: es estar por delante.**
       *
       * En una pantalla estrecha el HUD va apretado y solaparse con algo es
       * inevitable; lo que no puede pasar es quedar **debajo**. Así que en vez
       * de medir cajas se pregunta lo único que importa: en el centro del
       * cartel, ¿quién está pintado delante? Se le devuelven los clics un
       * instante para poder preguntarlo, y se le quitan después: un cartel que
       * se enciende solo no se pulsa.
       */
      const antes = el.style.pointerEvents;
      el.style.pointerEvents = "auto";
      const punto = document.elementFromPoint(
        c.left + c.width / 2,
        c.top + c.height / 2,
      );
      el.style.pointerEvents = antes;
      const encima =
        punto && !el.contains(punto) && punto !== el ? [punto] : [];
      /*
       * Y la lámpara, además de verse, **no tapa**: la tarjeta de la orden y
       * los dibujos del rincón quedaban debajo de ella en la tablet de 1024.
       */
      const tapa =
        que !== "torre"
          ? []
          : ["senal", "pictos"].filter((q) => {
              const o = document.querySelector(`[data-hud="${q}"]`);
              if (!o || o.closest("[hidden]")) return false;
              const b = o.getBoundingClientRect();
              return (
                Math.min(c.right, b.right) - Math.max(c.left, b.left) > 1 &&
                Math.min(c.bottom, b.bottom) - Math.max(c.top, b.top) > 1
              );
            });
      el.hidden = true;
      salida.push({
        que,
        dentro:
          c.left >= 0 &&
          c.top >= 0 &&
          c.right <= window.innerWidth &&
          c.bottom <= window.innerHeight,
        encima: [...new Set(encima.map((o) => String(o.className)))].slice(
          0,
          4,
        ),
        tapa,
      });
    }
    return salida;
  });

  /*
   * **De pie y con el dedo, lo único que tiene que haber es el cartel de
   * girar**, tapándolo todo: ahí no cabe un avión y no se mide lo que no se
   * puede pilotar. Ver `.gira` en `style.css`.
   */
  if (dedo && alto > ancho) {
    const gira = await page.evaluate(() => {
      const el = document.querySelector('[data-hud="gira"]');
      if (!el) return null;
      const c = el.getBoundingClientRect();
      const p = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      return {
        tapa: c.width >= innerWidth - 1 && c.height >= innerHeight - 1,
        delante: !!p && el.contains(p),
      };
    });
    comprobar(
      `${ancho}×${alto} de pie: sale el cartel de girar la pantalla`,
      gira?.tapa && gira?.delante,
      gira ? `tapa ${gira.tapa ? "todo" : "a medias"}, ${gira.delante ? "por delante" : "por detrás"}` : "no está",
      "de pie no cabe la palanca, el motor y el cuadro: se pide girarla con un dibujo",
    );
    await page.close();
    continue;
  }

  /*
   * **Lo que se toca, dentro de la pantalla.** La columna de la derecha —gas,
   * freno, tren, flaps y la tarjeta del destino— y el rincón de los avisos.
   * Se cuenta lo que está puesto: lo escondido no tiene que caber.
   */
  const fuera = await page.evaluate(() => {
    const que = [
      "throttle-up",
      "throttle-down",
      "brakes-touch",
      "tren-touch",
      "flaps-touch",
      "home",
      "senal",
      "pictos",
    ];
    return que.filter((q) => {
      const el = document.querySelector(`[data-hud="${q}"]`);
      if (!el || el.closest("[hidden]")) return false;
      const c = el.getBoundingClientRect();
      if (c.width < 2 || c.height < 2) return false;
      return (
        c.left < -1 ||
        c.top < -1 ||
        c.right > innerWidth + 1 ||
        c.bottom > innerHeight + 1
      );
    });
  });

  /*
   * **Y el aviso y el mensaje, por delante del cuadro.** Vivían en el flujo
   * de la franja de abajo y, desde que el cuadro se clavó al borde, quedaban
   * detrás de él: el aviso de pérdida y el del suelo, tapados por las
   * esferas. Se encienden los dos como los enciende el juego —con
   * `hud--avisando`, que esconde el tutor— y se pregunta quién está pintado
   * delante en su centro. Y el tutor, fuera de las esferas: en pantallas
   * táctiles se colocaba al 44 % del alto y caía encima del cuadro.
   */
  const abajo = await page.evaluate(() => {
    const hud = document.querySelector(".hud");
    const aviso = document.querySelector('[data-hud="warning"]');
    const texto = document.querySelector('[data-hud="warning-text"]');
    const hint = document.querySelector('[data-hud="hint"]');
    const tutor = document.querySelector('[data-hud="tutor"]');
    const cuadro = document.querySelector('[data-hud="tablero"]');
    if (!hud || !aviso || !texto || !hint || !tutor || !cuadro) return null;
    const alFrente = (el) => {
      const c = el.getBoundingClientRect();
      const antes = el.style.pointerEvents;
      el.style.pointerEvents = "auto";
      const p = document.elementFromPoint(
        c.left + c.width / 2,
        c.top + c.height / 2,
      );
      el.style.pointerEvents = antes;
      return !p || el.contains(p) ? "" : String(p.className).slice(0, 40);
    };
    const pisa = (a, b) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    // El tutor, primero, que es el que está puesto mientras no hay aviso.
    tutor.hidden = false;
    const tutorPisa = pisa(
      tutor.getBoundingClientRect(),
      cuadro.getBoundingClientRect(),
    );
    hud.classList.add("hud--avisando");
    aviso.classList.add("aviso-hud--visible");
    texto.textContent = "¡El suelo! Subí";
    hint.textContent = "Un mensaje de prueba";
    /*
     * Y con el dedo, la barra del timón fuera del cuadro: vive abajo en el
     * centro, como el cuadro, y le caía encima de la brújula.
     */
    const timon = document.querySelector(".pad--rudder");
    const timonPisa =
      !!timon &&
      getComputedStyle(timon).display !== "none" &&
      pisa(timon.getBoundingClientRect(), cuadro.getBoundingClientRect());
    /*
     * Y el rincón —los dibujos y la tarjeta de la orden— fuera del cuadro y de
     * la columna de mandos: en Guyrami la llave caía encima de las esferas.
     */
    const rincon = [
      document.querySelector('[data-hud="pictos"]'),
      document.querySelector('[data-hud="senal"]'),
    ].filter((e) => e && !e.closest("[hidden]"));
    const mandos = [...document.querySelectorAll(".hud__derecha > *")].filter(
      (e) => !e.closest("[hidden]") && e.getBoundingClientRect().height > 2,
    );
    const mandosPisan = mandos
      .filter((m) => pisa(m.getBoundingClientRect(), cuadro.getBoundingClientRect()))
      .map((m) => m.dataset.hud ?? String(m.className).slice(0, 24));
    const rinconPisa = rincon
      .flatMap((r) =>
        [cuadro, ...mandos]
          .filter((o) => pisa(r.getBoundingClientRect(), o.getBoundingClientRect()))
          .map((o) => `${r.dataset.hud} sobre ${o.dataset.hud ?? String(o.className).slice(0, 24)}`),
      )
      .slice(0, 3);
    const salida = {
      aviso: alFrente(aviso),
      mensaje: alFrente(hint),
      tutorPisa,
      timonPisa,
      rinconPisa,
      mandosPisan,
    };
    hud.classList.remove("hud--avisando");
    aviso.classList.remove("aviso-hud--visible");
    texto.textContent = "";
    hint.textContent = "";
    return salida;
  });

  /*
   * **Y todo lo que es un botón, se puede tocar.** Se pregunta en el centro de
   * cada botón visible del HUD quién recibe el toque. La tarjeta del destino
   * se toca para cambiar de destino, y el toque le llegaba al lienzo: vivía
   * dentro del HUD, que deja pasar los toques al mundo, y nunca se los
   * devolvió. Nadie lo preguntó hasta que se preguntó así.
   */
  const sordos = await page.evaluate(() => {
    const hud = document.querySelector(".hud");
    if (!hud) return [];
    return [...hud.querySelectorAll("button")]
      .filter((b) => {
        if (b.closest("[hidden]") || b.disabled) return false;
        const cs = getComputedStyle(b);
        if (cs.visibility === "hidden" || cs.display === "none") return false;
        if (Number(cs.opacity) === 0) return false;
        const c = b.getBoundingClientRect();
        return (
          c.width > 8 &&
          c.height > 8 &&
          c.right > 0 &&
          c.bottom > 0 &&
          c.left < innerWidth &&
          c.top < innerHeight
        );
      })
      .map((b) => {
        const c = b.getBoundingClientRect();
        const x = Math.min(innerWidth - 1, Math.max(0, c.left + c.width / 2));
        const y = Math.min(innerHeight - 1, Math.max(0, c.top + c.height / 2));
        const p = document.elementFromPoint(x, y);
        if (!p || b === p || b.contains(p)) return null;
        const quien = p.dataset?.hud || p.id || String(p.className);
        return `${b.dataset.hud ?? b.className} → ${quien}`.slice(0, 70);
      })
      .filter(Boolean);
  });

  const donde = `${juego.tramo} ${ancho}×${alto}${dedo ? " con el dedo" : ""}`;
  comprobar(
    `${donde}: todos los botones reciben el toque`,
    sordos.length === 0,
    sordos.length ? sordos.slice(0, 4).join(" · ") : "todos",
    "un botón que no recibe el toque es un dibujo de botón",
  );
  comprobar(
    `${donde}: los mandos y los avisos caben en la pantalla`,
    fuera.length === 0,
    fuera.length ? `fuera: ${fuera.join(", ")}` : "todo dentro",
    "un mando fuera de la pantalla no existe, y en un móvil eran todos los de la derecha",
  );
  if (abajo) {
    comprobar(
      `${donde}: el aviso se ve por delante`,
      !abajo.aviso,
      abajo.aviso ? `tapado por ${abajo.aviso}` : "libre",
      "un panel bonito que esconde un «terrain, pull up» es peor que no tener panel",
    );
    comprobar(
      `${donde}: el mensaje se ve por delante`,
      !abajo.mensaje,
      abajo.mensaje ? `tapado por ${abajo.mensaje}` : "libre",
      "",
    );
    comprobar(
      `${donde}: los mandos de la columna no pisan el cuadro`,
      abajo.mandosPisan.length === 0,
      abajo.mandosPisan.join(" · ") || "libre",
      "un freno detrás de las esferas no se encuentra cuando hace falta",
    );
    comprobar(
      `${donde}: los avisos del rincón no pisan el cuadro ni los mandos`,
      abajo.rinconPisa.length === 0,
      abajo.rinconPisa.join(" · ") || "libre",
      "",
    );
    if (dedo)
      comprobar(
        `${donde}: la barra del timón no tapa el cuadro`,
        !abajo.timonPisa,
        abajo.timonPisa ? "encima de las esferas" : "libre",
        "un mando encima de la brújula la tapa justo a quien la usa para saber adónde va",
      );
    comprobar(
      `${donde}: el tutor no tapa las esferas`,
      !abajo.tutorPisa,
      abajo.tutorPisa ? "encima del cuadro" : "libre",
      "",
    );
  }
  if (!visto) {
    comprobar(`${donde}: están las dos tarjetas`, false, "no se encontraron");
    await page.close();
    continue;
  }

  comprobar(
    `${donde}: la señal y el tutor no se pisan`,
    !visto.solape,
    `señal ${visto.senal.join("–")} · tutor ${visto.tutor.join("–")} · ${visto.hueco} px de hueco`,
    "las dos son fijas, centradas abajo y del mismo z-index: sin reservarse sitio se apilan",
  );

  comprobar(
    `${donde}: las dos caben en la pantalla`,
    !visto.fuera,
    visto.fuera ? "alguna se sale" : "dentro",
    "subir una encima de la otra no vale si la de arriba se va por el borde",
  );

  for (const t of tapados) {
    comprobar(
      `${donde}: el cartel de ${t.que} se ve entero`,
      t.dentro && t.encima.length === 0,
      t.encima.length ? `tapado por ${t.encima.join(" · ")}` : "libre",
      "un cartel que suena y no se ve es peor que no tener cartel",
    );
    if (t.que === "torre")
      comprobar(
        `${donde}: la lámpara de la torre no tapa el rincón`,
        t.tapa.length === 0,
        t.tapa.length ? `encima de ${t.tapa.join(" y ")}` : "libre",
        "la lámpara y la orden se leen juntas: «esperá a la luz» y la luz",
      );
  }

  /*
   * **Y el panel del final, con un vuelo detrás.** Sin vuelo no hay plano del
   * recorrido y el panel cabe siempre; con él, en un teléfono apaisado «Otro
   * vuelo» quedaba por debajo del borde y la barra del timón encima. Se
   * vuela unos segundos, se termina y se pregunta por los dos botones.
   */
  if (!(dedo && alto > ancho)) {
    await page.evaluate(() => {
      const s = globalThis.__oga.estado();
      globalThis.__oga.colocar(s.position.x, s.position.y + 300, s.position.z, 40);
      globalThis.__oga.acelerar?.(8);
    });
    await page.waitForTimeout(5000);
    const fin = await page.evaluate(() => {
      globalThis.__oga.acelerar?.(1);
      globalThis.__oga.acabar();
      return new Promise((listo) =>
        setTimeout(() => {
          const malos = [];
          for (const q of ["fin-otra", "fin-hangar"]) {
            const b = document.querySelector(`[data-hud="${q}"]`);
            if (!b) continue;
            const c = b.getBoundingClientRect();
            const fuera = c.top < 0 || c.bottom > innerHeight || c.left < 0 || c.right > innerWidth;
            const p = document.elementFromPoint(
              Math.min(innerWidth - 1, c.left + c.width / 2),
              Math.min(innerHeight - 1, c.top + c.height / 2),
            );
            if (fuera) malos.push(`${q} fuera`);
            else if (!p || !(b === p || b.contains(p)))
              malos.push(`${q} tapado por ${p?.className ?? "nada"}`);
          }
          listo(malos);
        }, 1200),
      );
    });
    comprobar(
      `${donde}: el panel del final cabe y sus botones se tocan`,
      fin.length === 0,
      fin.join(" · ") || "los dos",
      "«Otro vuelo» es el botón para volver a jugar",
    );
  }

  comprobar(
    `${donde}: sin errores`,
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
