/**
 * ¿Está esto al nivel del resto de la casa? (WCAG 2.2 AA)
 *
 * Ateneo, Ksiopea, Xpresiva y BenthosView declaran AA, y el panel de
 * accesibilidad de Oksigenia está publicado. Óga Veve lo decía de palabra.
 *
 * Un simulador de vuelo no va a ser jugable sin visión, y no pasa nada: la
 * meta no es esa. La meta es que **todo lo que rodea al vuelo** —menús,
 * créditos, ajustes, la promesa educativa— sí lo sea, y que quien tenga baja
 * visión o dependa del teclado pueda usarlo. Esto lo mide.
 *
 * ## Qué mide, y por qué así
 *
 * 1. **Contraste** (1.4.3). El HUD es translúcido y flota sobre el mundo, así
 *    que no tiene *un* fondo: tiene el que le toque. Aquí se compone cada
 *    color de texto con toda su pila de fondos y, cuando al final del camino
 *    todavía queda transparencia, se apoya en **dos extremos** —cielo claro y
 *    ladera oscura— y se toma el peor de los dos. Un texto que solo se lee
 *    sobre la mitad de los paisajes no cumple.
 * 2. **Foco visible** (2.4.7). Se enfoca cada control y se compara el estilo
 *    con el de antes: si no cambia nada, no hay foco visible. No vale con que
 *    exista una regla en la hoja; tiene que aplicarse a este control.
 * 3. **Ruta de teclado** (2.1.1). Se tabula y se apunta a dónde va el foco.
 *    Lo que nunca lo recibe, no existe para quien no usa ratón.
 * 4. **Nombre accesible** (4.1.2). Un `aria-label` en un `div` sin papel no
 *    lo lee casi ningún lector: o lleva papel, o el nombre no cuenta.
 * 5. **Movimiento reducido** (2.3.3). Con la preferencia puesta, la cámara no
 *    puede seguir balanceándose.
 *
 * Uso: `node scripts/verificar-acceso.mjs [escenario]`
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";

/**
 * Las acciones que existen de verdad, sacadas del mapa de teclas.
 *
 * Un mando táctil puede quedarse fuera del tabulador si declara con qué
 * teclas se hace lo mismo, pero esa declaración tiene que **apuntar a algo**:
 * `data-equivale-a="volarBonito"` no es una ruta de teclado, es una excusa.
 */
const ACCIONES = new Set(
  [
    ...readFileSync("src/flight/keymap.ts", "utf8").matchAll(
      /^\s{2}(\w+): \{ label:|^\s{2}(\w+): \{$/gm,
    ),
  ]
    .map((m) => m[1] ?? m[2])
    .filter(Boolean),
);

const ESCENARIO = process.argv[2] ?? "tenerife-norte";
const PUERTO = 5287;

/** Los dos mundos sobre los que flota el HUD, y entre los que hay que leerlo. */
const EXTREMOS = {
  cielo: [207, 227, 242],
  ladera: [16, 26, 18],
};

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
const comprobar = (nombre, ok, detalle) =>
  resultados.push({ nombre, ok: !!ok, detalle });

// ── El navegador de siempre ──────────────────────────────────────────────

const page = await navegador.newPage({
  viewport: { width: 1100, height: 700 },
});
await page.addInitScript(() =>
  localStorage.setItem("oga-veve:teclas-vistas", "1"),
);
await page.goto(`http://localhost:${PUERTO}/?escenario=${ESCENARIO}&teselas=0`);
await page.waitForTimeout(12000);

// ── 1. Contraste ─────────────────────────────────────────────────────────

const MEDIR_CONTRASTE = (EXTREMOS) => {
  const canal = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luz = ([r, g, b]) =>
    0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  const razon = (a, b) => {
    const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const leer = (s) => {
    const n = s.match(/[\d.]+/g);
    if (!n) return null;
    return [+n[0], +n[1], +n[2], n[3] === undefined ? 1 : +n[3]];
  };
  /** Pone `arriba` encima de `abajo`, con la alfa de arriba. */
  const encima = (arriba, abajo) =>
    [0, 1, 2].map((i) => arriba[3] * arriba[i] + (1 - arriba[3]) * abajo[i]);

  /**
   * Las pilas de fondo posibles bajo un elemento, de arriba abajo.
   *
   * Son varias y no una por los degradados. `background: linear-gradient(...)`
   * no es `background-color` —para `getComputedStyle` ese elemento es
   * transparente—, así que la primera versión de esto midió la letra de una
   * tecla encendida contra el verde del panel que hay tres capas más abajo y
   * la acusó de 1,48:1 cuando sobre su ocre está a 5,5. Un degradado además
   * **no tiene un color, tiene varios**, y el que cuenta es el peor: se
   * devuelve una pila por parada de color y luego se toma la de menos
   * contraste.
   */
  const fondosDe = (el) => {
    let pilas = [[]];
    for (let n = el; n; n = n.parentElement) {
      const e = getComputedStyle(n);
      const paradas = [...e.backgroundImage.matchAll(/rgba?\([^)]*\)/g)]
        .map((m) => leer(m[0]))
        .filter((c) => c && c[3] > 0);
      const fondo = leer(e.backgroundColor);
      const capas = [];
      if (fondo && fondo[3] > 0) capas.push(fondo);
      if (paradas.length) {
        // Cada parada es una alternativa: se ramifica la pila, con tope.
        pilas = pilas
          .flatMap((pila) => paradas.map((p) => [...pila, ...capas, p]))
          .slice(0, 12);
      } else if (capas.length) {
        pilas = pilas.map((pila) => [...pila, ...capas]);
      }
      // Opaco de verdad: por debajo ya no se ve nada.
      if ((fondo && fondo[3] === 1) || paradas.some((p) => p[3] === 1)) break;
    }
    return pilas;
  };

  const salida = [];
  const vistos = new Set();
  for (const el of document.querySelectorAll("body *")) {
    // Solo lo que pinta texto propio y se ve.
    const propio = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
    );
    if (!propio) continue;
    const caja = el.getBoundingClientRect();
    if (caja.width < 4 || caja.height < 4) continue;
    const e = getComputedStyle(el);
    if (e.visibility === "hidden" || e.display === "none") continue;
    if (el.closest("[hidden]")) continue;

    // La opacidad heredada multiplica la alfa del texto: es lo que hace que
    // una glosa «al 55 %» no tenga el contraste que parece en la hoja.
    let opacidad = 1;
    for (let n = el; n; n = n.parentElement) {
      const o = getComputedStyle(n).opacity;
      if (o !== "") opacidad *= +o;
    }
    // Lo que está a cero de opacidad no se lee ni se deja de leer: es el
    // destello del V1 esperando su momento. Cuando destella sí se mide.
    if (opacidad < 0.05) continue;
    const texto = leer(e.color);
    if (!texto) continue;
    texto[3] *= opacidad;

    const tamano = parseFloat(e.fontSize);
    const gordo = +e.fontWeight >= 700;
    // 1.4.3: 3:1 vale para texto grande —18,66px en negrita o 24px—.
    const exigido = tamano >= 24 || (gordo && tamano >= 18.66) ? 3 : 4.5;

    let peor = Infinity;
    let dondePeor = "";
    for (const [nombre, mundo] of Object.entries(EXTREMOS)) {
      for (const pila of fondosDe(el)) {
        let fondo = mundo;
        for (const capa of [...pila].reverse()) fondo = encima(capa, fondo);
        const r = razon(encima(texto, fondo), fondo);
        if (r < peor) {
          peor = r;
          dondePeor = nombre;
        }
      }
    }
    const clave = `${el.className}|${Math.round(tamano)}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({
      que: (el.className || el.tagName).toString().slice(0, 42),
      texto: el.textContent.trim().slice(0, 22),
      px: Math.round(tamano),
      exigido,
      razon: Math.round(peor * 100) / 100,
      sobre: dondePeor,
    });
  }
  return salida.sort((a, b) => a.razon - b.razon);
};

/**
 * La misma auditoría, pantalla por pantalla.
 *
 * Porque el vuelo es la mitad: los créditos, el teclado, el cuaderno y el
 * hangar son **lo que rodea al vuelo**, que es justo lo que sí tiene que ser
 * usable sin ver. Se abren como los abre cualquiera —pulsando su botón— y se
 * miden igual.
 */
/*
 * **Y el panel se nombra con un selector, no con un `id`.**
 *
 * Iba por `getElementById`, y eso deja fuera a los paneles que no tienen uno:
 * el plano y el tiempo se buscan por `data-hud`, porque los construye su
 * propio módulo dentro del HUD en vez de venir de `index.html`. Un banco que
 * solo sabe mirar a los que tienen `id` es un banco que no mira a los que
 * hacen falta. Ver #70.
 */
async function auditar(page, donde, encierra = null) {
  const escapados = [];
  const contrastes = await page.evaluate(MEDIR_CONTRASTE, EXTREMOS);
  const flojos = contrastes.filter((c) => c.razon < c.exigido);
  comprobar(
    `${donde}: el texto se lee sobre cualquier paisaje`,
    flojos.length === 0,
    flojos.length
      ? `${flojos.length} por debajo · ` +
          flojos
            .slice(0, 5)
            .map(
              (f) =>
                `${f.que}«${f.texto}» ${f.razon}:1 (pide ${f.exigido}, sobre ${f.sobre})`,
            )
            .join(" · ")
      : `${contrastes.length} textos, el peor a ${contrastes[0]?.razon ?? "—"}:1`,
  );

  const recorrido = [];
  const sinFoco = [];
  /*
   * **El recorrido se acaba al repetir el mismo mando, no el mismo nombre.**
   *
   * Iba por nombre, y el nombre sale de `data-hud` o de la clase, así que
   * tres botones que comparten uno —las tres nubes del tiempo— cortaban la
   * vuelta en el segundo: los dos mandos que iban detrás, «calma» y «tiempo
   * de verdad», quedaban **sin visitar y sin nadie que lo dijera**. Ya había
   * pasado con los once botones de ajustes y se tapó dándoles un nombre
   * compuesto; eso es una lista que hay que ir alargando con cada pantalla.
   *
   * Comparar el elemento es exacto y no hace falta nombrar nada: se marcan en
   * la propia página, que es donde viven. Ver #70.
   */
  await page.evaluate(() => {
    globalThis.__vistos = new WeakSet();
  });
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    /*
     * El foco se mide **tabulando**, no llamando a `focus()`.
     *
     * `:focus-visible` no es `:focus`: Chrome se lo guarda para cuando el foco
     * llegó del teclado, que es exactamente el caso que hay que comprobar.
     * Enfocar desde el guion no lo enciende, y la primera versión de esto
     * acusó de no marcar el foco a un botón que sí lo marca.
     */
    const parada = await page.evaluate((encierra) => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      /*
       * El nombre tiene que ser **único por mando**, no por clase: en la
       * pantalla de ajustes hay once botones con la misma clase, y con el
       * nombre por clase el recorrido se daba por terminado en el segundo.
       */
      const nombre =
        a.getAttribute("data-hud") ??
        a.getAttribute("data-touch") ??
        (a.getAttribute("data-ajuste")
          ? `${a.getAttribute("data-ajuste")}:${a.getAttribute("data-valor")}`
          : null) ??
        a.getAttribute("data-pausa") ??
        a.getAttribute("data-ala") ??
        (a.className || a.tagName).toString().split(" ")[0];
      const retrato = (e) =>
        `${e.outlineWidth}|${e.outlineStyle}|${e.outlineColor}|${e.boxShadow}|${e.backgroundColor}|${e.borderColor}`;
      const enfocado = retrato(getComputedStyle(a));
      a.blur();
      const suelto = retrato(getComputedStyle(a));
      a.focus();
      const repetido = globalThis.__vistos.has(a);
      globalThis.__vistos.add(a);
      return {
        repetido,
        nombre,
        marca: enfocado !== suelto,
        // Y de qué panel es. Un diálogo modal no puede dejar que el
        // tabulador se vaya por detrás, a lo que está tapado.
        dentroDe: encierra && a.closest(encierra) ? encierra : null,
      };
    }, encierra);
    if (parada === null) continue;
    if (parada.repetido) break;
    if (!recorrido.includes(parada.nombre)) recorrido.push(parada.nombre);
    if (!parada.marca) sinFoco.push(parada.nombre);
    if (encierra && parada.dentroDe !== encierra) escapados.push(parada.nombre);
  }

  /*
   * **Un mando no es siempre un botón.**
   *
   * Esta lista decía `button, summary, [data-touch]`, y con eso el esquema del
   * ala pasaba las cinco comprobaciones sin que nadie mirara sus dos
   * tiradores: no eran botones, así que no estaban en la lista, así que no
   * había nada que alcanzar ni nada que medir. Una comprobación que no puede
   * fallar es peor que no tenerla.
   */
  const visibles = await page.evaluate(
    (encierra) =>
      [
        ...(encierra
          ? (document.querySelector(encierra) ?? document)
          : document
        ).querySelectorAll("button, summary, input, [data-touch]"),
      ]
        .filter(
          (e) =>
            e.getBoundingClientRect().width > 4 &&
            !e.closest("[hidden]") &&
            getComputedStyle(e).display !== "none",
        )
        .map((e) => ({
          nombre:
            e.getAttribute("data-hud") ??
            e.getAttribute("data-touch") ??
            (e.getAttribute("data-ajuste")
              ? `${e.getAttribute("data-ajuste")}:${e.getAttribute("data-valor")}`
              : null) ??
            e.getAttribute("data-pausa") ??
            e.getAttribute("data-ala") ??
            (e.className || e.tagName).toString().split(" ")[0],
          equivale: e.getAttribute("data-equivale-a"),
        })),
    /*
     * Con un panel modal abierto solo cuentan sus mandos. Los del vuelo siguen
     * en pantalla, detrás del velo, y **no alcanzarlos es justo lo que tiene que
     * pasar**: para eso está el encierro.
     */
    encierra,
  );
  const fuera = [];
  const declarados = [];
  for (const v of visibles) {
    if (recorrido.includes(v.nombre)) continue;
    if (!v.equivale) {
      if (!fuera.includes(v.nombre)) fuera.push(v.nombre);
      continue;
    }
    // Declara equivalente: vale, pero el equivalente tiene que existir.
    const inventadas = v.equivale.split(/\s+/).filter((a) => !ACCIONES.has(a));
    if (inventadas.length) {
      fuera.push(`${v.nombre} (dice ${inventadas.join("/")} y no existe)`);
    } else if (!declarados.includes(v.nombre)) {
      declarados.push(v.nombre);
    }
  }

  comprobar(
    `${donde}: todo mando visible se alcanza con el tabulador`,
    fuera.length === 0,
    fuera.length
      ? `sin alcanzar: ${fuera.join(", ")}`
      : `${recorrido.length} paradas` +
          (declarados.length
            ? ` · con teclas equivalentes: ${declarados.join(", ")}`
            : `: ${recorrido.slice(0, 6).join(" → ")}`),
  );
  /*
   * **Y que lo que se toca se pueda tocar.**
   *
   * La hoja declara `--tacto: 48px` como mínimo de la casa, pero declararlo
   * no es cumplirlo: en una tablet de 720 px los siete botones de la barra se
   * dibujaban a **34**, porque flexbox reparte el sitio que falta quitándoselo
   * a los elementos. El mínimo duro de WCAG 2.5.8 son 24, así que aquello no
   * era un incumplimiento — era el aparato del aula haciendo el objetivo más
   * pequeño justo donde más grande tendría que ser. Ver #150.
   */
  const chicos = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        "button, input, [role='radio'], [data-touch]",
      ),
    ]
      .filter((e) => {
        const c = e.getBoundingClientRect();
        if (!c.width || e.closest("[hidden]")) return false;
        /*
         * Y lo que declara que su objetivo es más grande de lo que se ve, no
         * cuenta. Se declara en el marcado —`data-objetivo="extendido"`— y no
         * se adivina: un pseudoelemento que agranda el área no sale en
         * `getBoundingClientRect`, así que o se dice o no se puede medir.
         * Es el mismo trato que `data-equivale-a` en los mandos táctiles.
         */
        return e.getAttribute("data-objetivo") !== "extendido";
      })
      .map((e) => {
        const c = e.getBoundingClientRect();
        return {
          nombre:
            e.getAttribute("data-hud") ??
            e.getAttribute("data-valor") ??
            (e.className || e.tagName).toString().split(" ")[0],
          lado: Math.round(Math.min(c.width, c.height)),
        };
      })
      .filter((x) => x.lado < 44),
  );
  comprobar(
    `${donde}: lo que se toca mide lo que tiene que medir`,
    chicos.length === 0,
    chicos.length
      ? `por debajo de 44 px: ${chicos.map((c) => `${c.nombre} (${c.lado})`).join(", ")}`
      : "todos por encima del mínimo táctil",
  );
  comprobar(
    `${donde}: y al llegar el foco se ve dónde está`,
    sinFoco.length === 0,
    sinFoco.length ? `sin marca: ${sinFoco.join(", ")}` : "todas marcan",
  );

  const sinPapel = await page.evaluate(() => {
    const neutros = new Set(["DIV", "SPAN", "P", "SECTION"]);
    const malos = [];
    for (const el of document.querySelectorAll("[aria-label]")) {
      if (!neutros.has(el.tagName)) continue;
      if (el.hasAttribute("role")) continue;
      if (!el.getBoundingClientRect().width) continue;
      if (getComputedStyle(el).display === "none") continue;
      malos.push(
        `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`,
      );
    }
    return [...new Set(malos)];
  });
  comprobar(
    `${donde}: ningún nombre accesible en un elemento sin papel`,
    sinPapel.length === 0,
    sinPapel.length ? sinPapel.join(", ") : "ninguno",
  );

  if (encierra) {
    /*
     * **Un panel modal tiene que atrapar el tabulador.**
     *
     * Se declara `aria-modal="true"`, que le dice a un lector de pantalla «lo
     * de detrás no existe». Si el tabulador sí se va por detrás, el lector
     * dice una cosa y el teclado hace otra, y quien navega así acaba pulsando
     * botones del vuelo creyendo que sigue en los créditos.
     */
    comprobar(
      `${donde}: el tabulador no se escapa del panel (2.4.3)`,
      escapados.length === 0,
      escapados.length
        ? `se fue a: ${[...new Set(escapados)].slice(0, 6).join(", ")}`
        : "se queda dentro",
    );
  }
  return contrastes;
}

/** Y una salida de emergencia: lo que se abre con teclado se cierra con Escape. */
async function comprobarEscape(page, donde, selector) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const cerrado = await page.evaluate(
    (s) => document.querySelector(s)?.hidden === true,
    selector,
  );
  comprobar(
    `${donde}: se sale con Escape (2.1.2)`,
    cerrado,
    cerrado ? "sí" : "sigue abierto",
  );
}

/*
 * La tira de la radio se saca a propósito antes de medir.
 *
 * Solo aparece unos segundos cuando el otro avión dice algo, así que una
 * auditoría que pase por delante no la ve nunca — y fue justo la primera que
 * se coló por debajo de AA. Lo que no se enseña no se mide.
 */
await page.evaluate(() => {
  const r = document.querySelector('[data-hud="radio"]');
  if (r) {
    r.hidden = false;
    r.textContent = "Zulu Papa Alfa Bravo Charlie, viento en cola";
  }
});

let peores = await auditar(page, "vuelo");

/*
 * **Todas las pantallas que se abren encima, no las que se acordó alguien.**
 *
 * Esta lista tenía cuatro y el juego tiene seis. Las dos que faltaban —el
 * plano y el tiempo— eran justo las dos que **no** eran paneles: sin
 * `role="dialog"`, sin encierro del foco y sin Escape. O sea que el banco no
 * fallaba porque no las abría, que es la peor forma de pasar. Ver #70.
 *
 * (El hangar y los pilotos son pantallas de entrada, no paneles encima del
 * vuelo: se auditan aparte, y sin Escape ni encierro, porque ahí no procede.)
 *
 * Una pantalla que se abre encima del vuelo y no está aquí es una pantalla sin
 * vigilar: al añadir la siguiente, se añade aquí.
 */
for (const [donde, boton, caja] of [
  ["créditos", "credits", "#creditos"],
  ["teclas", "keys", "#teclas"],
  ["cuaderno", "cuaderno", "#cuaderno"],
  ["plano", "mapa-boton", '[data-hud="mapa"]'],
  ["tiempo", "tiempo-boton", '[data-hud="tiempo"]'],
  /*
   * Y el esquema del ala, que es el único panel del juego **con un mando que
   * no es un botón**: dos tiradores. Ahí lo que se mide de verdad es el
   * objetivo táctil, porque la barra pintada mide doce píxeles y lo que se
   * toca tiene que medir cuarenta y cuatro — son dos cosas distintas y es
   * fácil confundirlas al escribir el CSS. Ver `ui/pantalla-ala.ts`.
   */
  ["ala", "ala", "#ala"],
]) {
  await page.click(`[data-hud="${boton}"]`);
  await page.waitForTimeout(600);
  const abierta = await page.evaluate(
    (s) => document.querySelector(s)?.hidden === false,
    caja,
  );
  if (!abierta) {
    comprobar(`${donde}: se abre`, false, "no se abrió al pulsar su botón");
    continue;
  }
  peores = peores.concat(await auditar(page, donde, caja));
  await comprobarEscape(page, donde, caja);
  /*
   * Y si Escape no lo cerró, se cierra a mano: lo que se mide es el panel
   * siguiente, y no se puede medir con este encima.
   *
   * **Y el menú de pausa también.** Un panel que no atiende Escape deja que la
   * tecla llegue al juego, y en el juego Escape es la pausa: el panel sigue
   * abierto **y** encima sale el menú, que tapa la pantalla entera y bloquea
   * el botón del panel siguiente. Así se cayó este banco la primera vez que
   * miró el plano. Ver #70.
   */
  await page.evaluate((s) => {
    for (const sel of [s, "#pausa", "#ajustes"]) {
      const c = document.querySelector(sel);
      if (c && !c.hidden) c.hidden = true;
    }
  }, caja);
  await page.waitForTimeout(150);
}

/*
 * Y los ajustes, que se abren **sobre** el menú de pausa.
 *
 * Es el único panel del juego que se abre encima de otro, así que es el único
 * donde se puede comprobar que Escape cierra **lo que estás mirando** y no lo
 * de debajo. Sin pila de paneles ganaba el que se hubiera registrado antes:
 * Escape cerraba la pausa y dejaba los ajustes flotando sobre el vuelo.
 */
await page.click('[data-hud="pausa"]');
await page.waitForTimeout(500);
await page.click('[data-pausa="ajustes"]');
await page.waitForTimeout(500);
const ajustesAbiertos = await page.evaluate(
  () => document.querySelector("#ajustes")?.hidden === false,
);
if (ajustesAbiertos) {
  peores = peores.concat(await auditar(page, "ajustes", "#ajustes"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const donde = await page.evaluate(() => ({
    ajustes: document.querySelector("#ajustes")?.hidden === true,
    pausa: document.querySelector("#pausa")?.hidden === false,
  }));
  comprobar(
    "ajustes: Escape cierra lo de arriba y deja lo de abajo",
    donde.ajustes && donde.pausa,
    `ajustes ${donde.ajustes ? "cerrados" : "abiertos"} · pausa ${donde.pausa ? "sigue" : "se fue"}`,
  );
  await page.evaluate(() => {
    const p = document.querySelector("#pausa");
    if (p) p.hidden = true;
  });
} else {
  comprobar("ajustes: se abren desde la pausa", false, "no se abrieron");
}

// ── El aparato táctil, que es el del aula ────────────────────────────────

const tableta = await navegador.newPage({
  viewport: { width: 900, height: 560 },
  hasTouch: true,
  isMobile: true,
});
await tableta.addInitScript(() =>
  localStorage.setItem("oga-veve:teclas-vistas", "1"),
);
await tableta.goto(
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&teselas=0`,
);
await tableta.waitForTimeout(12000);
peores = peores.concat(await auditar(tableta, "tableta"));

// ── Los pilotos, que es lo primero que se ve ─────────────────────────────

/*
 * Se abre **sin `?escenario=`**, que es como entra quien juega: con la
 * dirección puesta el juego va directo al vuelo y esta pantalla no aparece.
 * Y es la primera de todas, así que si algo aquí no se alcanza con el
 * teclado, no se llega ni a elegir avión.
 */
const pilotos = await navegador.newPage({
  viewport: { width: 1000, height: 620 },
});
await pilotos.addInitScript(() => {
  localStorage.setItem("oga-veve:teclas-vistas", "1");
});
await pilotos.goto(`http://localhost:${PUERTO}/`);
await pilotos.waitForTimeout(3000);
peores = peores.concat(await auditar(pilotos, "pilotos"));
await pilotos.close();

// ── Movimiento reducido ─────────────────────────────────────────────────

const quieta = await navegador.newPage({
  viewport: { width: 900, height: 560 },
  reducedMotion: "reduce",
});
await quieta.addInitScript(() =>
  localStorage.setItem("oga-veve:teclas-vistas", "1"),
);
await quieta.goto(
  `http://localhost:${PUERTO}/?escenario=${ESCENARIO}&teselas=0`,
);
await quieta.waitForTimeout(12000);
// A todo gas por la pista, que es donde traquetea de verdad.
const balanceo = await quieta.evaluate(async () => {
  const o = globalThis.__oga;
  o.pilotar?.({ empuje: 1 });
  await new Promise((r) => setTimeout(r, 6000));
  if (!o.ojoDeCamara) return null;
  const alturas = [];
  for (let i = 0; i < 90; i++) {
    alturas.push(o.ojoDeCamara().y);
    await new Promise((r) => requestAnimationFrame(r));
  }
  /*
   * Lo que oscila alrededor de su propia tendencia. Subir volando no es
   * balanceo: restarle la media de los dos fotogramas anteriores deja solo la
   * vibración, que es lo que hay que apagar.
   */
  let peor = 0;
  for (let i = 2; i < alturas.length; i++) {
    peor = Math.max(
      peor,
      Math.abs(alturas[i] - (alturas[i - 2] + alturas[i - 1]) / 2),
    );
  }
  return { peor };
});
comprobar(
  "con movimiento reducido la cámara no se balancea (2.3.3)",
  balanceo !== null && balanceo.peor < 0.05,
  balanceo === null
    ? "no se pudo mirar la cámara"
    : `oscila ${balanceo.peor.toFixed(3)} m entre fotogramas`,
);

// ── El parte ─────────────────────────────────────────────────────────────

console.log(`\n  acceso · ${ESCENARIO}\n`);
for (const r of resultados) {
  console.log(`  ${r.ok ? "✓" : "✗"} ${r.nombre}  —  ${r.detalle}`);
}
const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length} comprobaciones\n`);
if (peores.length) {
  console.log("  los ocho textos con menos contraste:");
  for (const c of peores.sort((a, b) => a.razon - b.razon).slice(0, 8)) {
    console.log(
      `    ${String(c.razon).padStart(5)}:1  pide ${c.exigido}  ${c.px}px  ${c.que} «${c.texto}»`,
    );
  }
  console.log();
}

await navegador.close();
await server.close();
process.exit(bien === resultados.length ? 0 : 1);
