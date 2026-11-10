/**
 * **El tercer capítulo del vuelo largo, de principio a fin**: `?inicio=4&capitulo=3`.
 * Ver `src/flight/guion-llegada-a-asuncion.ts` y el ADR 0023.
 *
 * Es el banco de la tanda T4 del plan del largo radio: lo que se cuenta y el vuelo
 * entero. Mira que el vuelo se pueda hacer entero, que no se rompa nada del motor del
 * pasaje con otro guion, y que lo que se cuenta suene en su orden y con su lámina.
 *
 * ## Qué mira
 *
 * - **Se abre**: el JAZ 110, de pasajero, sin pasar por el hangar y sin menú. Y con
 *   su ficha de «¿A qué jugás?», con el dedo: `OGA_MENU=1`, solo eso.
 * - **El mundo no asoma antes de la ventanilla**, y cada lámina se ve de verdad, con
 *   su fichero bajado, y en su orden. Lo que falta por grabar se dice: `sin grabar`,
 *   que es lo esperado mientras no lleguen las voces, y no cuenta como fallo.
 * - **Entra en el sitio y la hora que da la cuenta**: en crucero, en el mundo de
 *   Paraguay, con la hora del vuelo de `entradaDeLaLlegada` y el sol de ese
 *   instante. Y sin la tarjeta de la escena en blanco.
 * - **El ⏩ funciona hasta los diez mil pies**, con el botón de verdad, y ahí se
 *   apaga solo, sin que vuelva: de ahí a la pista, a su paso.
 * - **Baja por su aproximación publicada**, y toca dentro de la pista a menos de
 *   tres metros por segundo. Lo fino de la toma no es de este banco: se acepta
 *   esto (el plan lo dice, y el piloto de banco ya costó dos horas).
 * - **Llega al puesto**, con los motores parados, y acaba el guion.
 * - **Con los motores en marcha en todo el vuelo y por encima de la reserva**, y
 *   **desde 25 km hasta la recogida, a la velocidad pedida** con diez nudos de
 *   margen. Quemando por el gas, el avión se quedaba seco a 26 km y volaba la final
 *   a 103 nudos, planeando, sin que fallara nada de lo demás: tocaba bien. Ver
 *   `empujeQueSeQuema` en `vuelo-de-linea.ts`.
 * - **Nunca suenan dos voces a la vez**, ni una voz que no sea de la escena.
 * - **Sin errores de consola.**
 *
 * Con la fecha fija, una de diciembre: `OGA_FECHA=` para otra. Con el viento de
 * siempre, del 020: `OGA_VIENTO=200/8` entra por la 20. `OGA_VECES` es el reloj de
 * los bancos por debajo de los diez mil pies, que el botón ⏩ no toca: acelera lo
 * que quien juega no puede, solo para no esperar media hora, y `OGA_PRISA` lo
 * pone desde el principio. `OGA_GPU=1` y `OGA_FOTOS=<dir>`, como los demás.
 * `OGA_APERTURA=1` para en cuanto se abre la ventanilla: es lo que tarda en comprobarse
 * lo que se cuenta, con sus capturas, sin volar lo demás.
 *
 * ## Con `OGA_CAPITULO=2`, la noche sobre el mar, y de ahí el tercero entero
 *
 * `?inicio=4&capitulo=2`: ver `src/flight/guion-noche-sobre-el-mar.ts`. Mira lo suyo, y
 * al caer del salto sigue por las mismas comprobaciones de arriba, una a una: lo que
 * quiere decir «el capítulo 3 corre igual que suelto» es que es el mismo banco.
 *
 * - **Arranca tapado**, en el JAZ 110, de noche, a la hora y en el punto que da la cuenta,
 *   dentro del mundo de Canarias, en crucero, con el nivel y la velocidad del perfil.
 * - **Pasa por El Hierro a su hora**, ±5 minutos, con Valverde debajo, Tenerife a 73 km a
 *   la izquierda y La Palma a 43 a la derecha, ±10 km: lo mide donde va el avión de verdad,
 *   no la cuenta.
 * - **Las luces bajan de verdad**: con la luz de la cabina leída, antes y a medio camino, que
 *   la bajada se vea gradual; y al caer en el capítulo 3, la de siempre.
 * - **La marca de El Hierro**: sale con lo que cuenta Idaira, en el lienzo, y se va al acabar.
 * - **La noche en el mapa**, en cada fotograma de la página: el mapa a toda pantalla, el mundo
 *   sin asomar y sin pintarse, el avión del mapa avanzando, y menos de un minuto de pared.
 * - **El medio despertar**: el *ding* una vez, su lámina con su fichero, el mapa quieto antes
 *   del ecuador, lo que se dice en su orden y sin pisarse, y a dormir otra vez.
 * - **Se puede dormir**: la siesta tapa, el salto cae a la hora del despertar y en el punto
 *   de la ortodrómica de esa hora, y nunca se ve saltar: lo mira cada fotograma de la página.
 * - **Lo que queda en los depósitos al despertar cuadra con la cuenta**.
 * - **El mundo de antes se va** de la tarjeta, medido justo al quitarlo. Y lo que hay al
 *   llegar sale en una línea, para compararlo con el tercero suelto, que es el mismo mundo.
 * - **Y cae con el parte de Asunción**, no con el de Canarias: vuela con el 040/12 del
 *   alisio, y `OGA_VIENTO` es el de allí. Con 200/8, tiene que entrar por la 20.
 * - **Lo que se cuenta**: cada lámina con su fichero y en su orden, las frases en el suyo,
 *   Tenerife solo si se ve por su cristal, y El Hierro nunca por el cristal: en el plano
 *   `respaldo`, con la pantalla enseñando dónde va el avión.
 * - **`OGA_CONSOLA=mapa` o `OGA_CONSOLA=juego`** abre la pantalla en cuanto sale, con el
 *   dedo, y la deja abierta: tiene que recogerse con su frase al bajar las luces y Ara
 *   dormirse igual. Con el juego, El Hierro no se cuenta encima.
 *
 * `OGA_SOLO_NOCHE=1` para al caer del salto, y `OGA_METAR=` da un parte a mano, que con el
 * alisio de siempre lleva una capa de nubes por debajo del avión: para las capturas.
 *
 * ## Con `OGA_CAPITULO=1`, la noche de Madrid
 *
 * `?inicio=4&capitulo=1`: ver `src/flight/guion-noche-de-madrid.ts`. Del embarque a la luz del
 * cinturón apagada, a su paso y con el ⏩ de quien juega; `OGA_PRISA` acelera el reloj de los
 * bancos desde que se abre la ventanilla. Con la fecha fija, como los otros, y con el viento
 * flojo del suroeste, `240/6`, salvo que `OGA_VIENTO` diga otro.
 *
 * - **Arranca tapado con la lámina del embarque**, con su fichero, y se abre la ventanilla.
 * - **En el puesto T5, de noche**: el JAZ 110 con los motores parados, a la hora de embarcar
 *   del horario de ese día y con el sol bien por debajo del horizonte.
 * - **Rueda hasta la Z4 sin pisar pista**, para en la doble raya y despega por la 36L.
 * - **Sigue la salida**: recto al norte hasta SSY y a la izquierda, al oeste.
 * - **Al decir las salidas Ara se asoma al pasillo** y se ve el letrero de la más cercana.
 * - **Madrid, a la izquierda**, si Ara la nombra; y el capítulo llega a su final con la luz del
 *   cinturón apagada y la tarjeta de seguir.
 * - **Nunca dos voces a la vez**, y sin errores de consola.
 *
 * `OGA_RED=1` mira la red: con los ficheros de Pettirossi que no contestan, al acabar la noche
 * se suelta y se abre el tercer capítulo por su camino de siempre. `OGA_RED=noche`, con la lámina
 * del medio despertar que no contesta: la noche sigue igual, sin nadie atrapado en ella.
 * `OGA_PASILLO=1` mira las luces desde el pasillo, para las capturas.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { baseDe } from "./servidor.mjs";

const PUERTO = Number(process.env.OGA_PUERTO ?? 5602);
const FOTOS = process.env.OGA_FOTOS ?? null;
if (FOTOS) mkdirSync(FOTOS, { recursive: true });
const FECHA = process.env.OGA_FECHA ?? "2026-12-15";
const VIENTO = process.env.OGA_VIENTO ?? "020/8";
const VECES = Number(process.env.OGA_VECES ?? 8);
const SOLO_APERTURA = !!process.env.OGA_APERTURA;
const CAPITULO = process.env.OGA_CAPITULO ?? "3";
const SOLO_NOCHE = !!process.env.OGA_SOLO_NOCHE;
const METAR = process.env.OGA_METAR ?? null;
const CONSOLA = process.env.OGA_CONSOLA ?? null;
/** Lo que se aparta como mucho de lo que dan las cuentas al pasar por las islas, m. */
const MARGEN_DE_LADO = 10_000;
/** El mundo de Tenerife Norte llega a esto de su centro, m: dieciocho veces sus dieciocho kilómetros, y la mitad. */
const EL_MUNDO_DE_LA_NOCHE_LLEGA_A = 162_000;
/** Las frases de lo que se cuenta antes de ver el mundo, en su orden. */
const DE_LA_APERTURA = (temporada, sol) => [
  "inicio.tripulacion.pasaje.cerca.despertar",
  "inicio.ara.pasaje.largo.meDormi",
  "inicio.tripulacion.pasaje.cerca.largo.mapa",
  "inicio.ara.pasaje.largo.mapa",
  "inicio.tripulacion.pasaje.derlis.desayuno",
  "inicio.ara.pasaje.largo.chipa",
  "inicio.ara.pasaje.largo.nariz",
  "inicio.tripulacion.pasaje.derlis.agua",
  "inicio.ara.pasaje.largo.huso",
  "inicio.tripulacion.pasaje.cerca.largo.huso",
  temporada === "verano" ? "inicio.tripulacion.pasaje.cerca.largo.husoVerano" : "inicio.tripulacion.pasaje.cerca.largo.husoInvierno",
  "inicio.tripulacion.pasaje.cerca.largo.ecuador1",
  "inicio.ara.pasaje.largo.ecuador",
  "inicio.tripulacion.pasaje.cerca.largo.ecuador2",
  "inicio.tripulacion.pasaje.derlis.piernas",
  "inicio.tripulacion.pasaje.derlis.desfase",
  ...(sol),
];
/** Las frases de la noche, por trozos: Tenerife y El Hierro, solo si hoy tocan. Ver `laNoche`. */
const DE_LA_NOCHE = {
  apertura: [
    "inicio.tripulacion.pasaje.derlis.cena",
    "inicio.ara.pasaje.largo.cena",
    "inicio.tripulacion.pasaje.cerca.largo.hornos",
    "inicio.tripulacion.pasaje.cerca.largo.cierres",
    "inicio.tripulacion.pasaje.derlis.aguaCena",
    "inicio.tripulacion.pasaje.derlis.piernasCena",
    "inicio.ara.pasaje.largo.noche",
  ],
  tenerife: ["inicio.ara.pasaje.largo.tenerife"],
  hierro: [
    "inicio.tripulacion.pasaje.cerca.largo.hierroEncima",
    "inicio.ara.pasaje.largo.hierroNoSeVe",
    "inicio.tripulacion.pasaje.cerca.largo.hierroDebajo",
    "inicio.tripulacion.pasaje.cerca.largo.meridiano",
    "inicio.tripulacion.pasaje.cerca.largo.greenwich",
  ],
  luces: [
    "comandante.largo.luces",
    "inicio.tripulacion.pasaje.cerca.largo.antifaz",
    "inicio.tripulacion.pasaje.cerca.largo.cinturonManta",
    "inicio.ara.pasaje.largo.cinturonArriba",
    "inicio.ara.pasaje.dormirse",
  ],
  medioDespertar: [
    "inicio.ara.pasaje.largo.medioDespertar",
    "inicio.tripulacion.pasaje.cerca.largo.nubesAltas",
    "inicio.tripulacion.pasaje.cerca.largo.nubesCinturon",
    "inicio.ara.pasaje.largo.sigoDurmiendo",
  ],
};
const SE_RECOGE_LA_CONSOLA = "inicio.tripulacion.pasaje.cerca.largo.consolaRecogeLuces";
/** De qué piezas tienen voz ya: lo que no, sale «sin grabar». */
const manifiesto = (voz) => JSON.parse(readFileSync(`data/voces/${voz}/manifiesto.json`, "utf8")).piezas;
const GRABADAS = new Set(["ara", "comandante", "tripulacion", "tripulacion-canarias"].flatMap((v) => Object.keys(manifiesto(v))));
/** Tope del vuelo entero, ms de pared. */
const TOPE = Number(process.env.OGA_TOPE ?? 50) * 60_000;
const PIE = 0.3048;
const DIEZ_MIL_PIES = 10_000 * PIE;

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false },
  logLevel: "warn",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const ruta = await server.ssrLoadModule("/src/flight/ruta-larga.ts");
const salto = await server.ssrLoadModule("/src/flight/salto-bajo-tapa.ts");
const { vientoDeCasa } = await server.ssrLoadModule("/src/world/meteo.ts");
const { PETTIROSSI: ESCENARIO_DE_LA_LLEGADA } = await server.ssrLoadModule("/src/world/scenarios.ts");
const { AIRCRAFT } = await server.ssrLoadModule("/src/flight/aircraft.ts");
const JAZ_110 = AIRCRAFT.find((a) => a.id === "jaz-110");
const perfil = ruta.perfilDelVuelo(ruta.horarioDelDia(new Date(`${FECHA}T12:00:00Z`)));

const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args:
    process.env.OGA_GPU === "1"
      ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl", "--autoplay-policy=no-user-gesture-required"]
      : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok, detalle });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

async function foto(page, nombre) {
  if (!FOTOS) return;
  const r = await page.evaluate(() => {
    const c = document.querySelector("#lienzo");
    const gl = c?.getContext("webgl2") ?? c?.getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "desconocido";
  });
  const corto = /swiftshader/i.test(r) ? "swiftshader" : /intel/i.test(r) ? "intel" : /nvidia/i.test(r) ? "nvidia" : "otro";
  const fichero = `${FOTOS}/inicio-4-${nombre}-${corto}.png`;
  await page.screenshot({ path: fichero });
  console.log(`  📷 ${fichero}  —  ${r}`);
}

/** Lo que se lee del juego de una vez, que entre lecturas el avión se mueve. */
const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const s = o.estado();
    const i = o.inicio();
    const j = o.juegoParaTrazas();
    const tarjeta = document.querySelector("#inicio .inicio__tarjeta");
    const caja = tarjeta?.getBoundingClientRect();
    const boton = document.querySelector('[data-hud="adelantar"]');
    const cajaBoton = boton?.getBoundingClientRect();
    return {
      x: s.position.x,
      y: s.position.y,
      z: s.position.z,
      rumbo: s.heading,
      velocidad: s.airspeed,
      suelo: s.groundSpeed,
      vertical: s.verticalSpeed,
      enTierra: s.onGround,
      enPista: s.onRunway,
      altura: s.heightAboveGround,
      fase: o.fase(),
      percance: o.percance?.() ?? null,
      motor: o.controles().engineOn,
      flaps: o.controles().flaps,
      tren: o.controles().tren,
      gas: o.controles().throttle,
      escena: i.escena,
      lamina: i.lamina ?? null,
      tapa: i.estado?.tapa ?? null,
      momento: i.estado?.momento ?? null,
      dichos: i.estado?.dichos ?? [],
      saltados: i.estado?.saltados ?? [],
      terminado: i.estado?.terminado ?? false,
      puedeSeguir: i.estado?.puedeSeguir ?? false,
      plano: i.estado?.plano ?? null,
      siestas: i.estado?.siestas ?? [],
      adelanto: i.estado?.adelanto ?? null,
      linea: i.estado?.linea?.clave ?? null,
      registro: (i.registro ?? []).map((d) => ({ clave: d.clave, desde: d.desde, hasta: d.hasta, como: d.como, cortada: d.cortada })),
      nombrados: i.estado?.nombrados ?? [],
      charlas: i.estado?.charlas ?? [],
      cartel: o.salto().cartel,
      sobreElMundo: {
        visible: document.querySelector("#lamina-grande")?.hidden === false,
        opacidad: Number(document.querySelector("#lamina-grande")?.style.opacity ?? 0),
      },
      tripulacion: i.tripulacion,
      manos: i.manos ?? null,
      combustible: o.combustible(),
      sinMotor: o.sinMotor(),
      faltaParaTocar: i.lecturaDeLinea?.faltaParaTocar ?? null,
      enLaFinal: i.lecturaDeLinea?.enLaFinal ?? null,
      lado: i.lecturaDeLinea?.pista?.lado ?? null,
      ultimaToma: i.ultimaToma ?? null,
      vista: i.vista,
      salto: o.salto(),
      luz: j.cabinaParaBanco.luz,
      noche: i.estado?.noche ?? null,
      marca: i.estado?.marca ?? null,
      pantalla: i.pantallaDelAsiento ?? null,
      dings: j.loQueSono.filter((x) => x.que === "cinturon").length,
      siestaConElMapa: i.siesta?.conElMapa ?? false,
      fotogramasPintados: j.renderer.info.render.frame,
      reloj: j.relojDelJuego,
      habladas: o.habladas(),
      maquina: o.maquina(),
      coste: o.coste(),
      siesta: i.siesta ?? null,
      kit: i.estado?.kit ?? null,
      consola: i.estado?.consola ?? null,
      enLaPantalla: i.consola?.enLaPantalla ?? null,
      plan: j.planParaBanco ?? null,
      tarjeta: tarjeta
        ? {
            alto: caja.height,
            texto: tarjeta.textContent.trim(),
            visible: getComputedStyle(tarjeta).visibility !== "hidden" && getComputedStyle(tarjeta).display !== "none" && caja.height > 0,
          }
        : null,
      boton: boton
        ? {
            visible: !boton.closest("[hidden]") && getComputedStyle(boton).visibility !== "hidden" && (cajaBoton?.width ?? 0) > 4,
            pulsado: boton.getAttribute("aria-pressed") === "true",
          }
        : null,
    };
  });

const sitioDe = (l) => salto.sitioDelMundo(l.salto.origen, l.x, l.z);
/** Lo que se aparta de donde dice la cuenta a esa hora, m por la superficie. */
const fueraDeLaCuenta = (l) => ruta.ortodromica(sitioDe(l), ruta.dondeVa(perfil, l.salto.hora).sitio).distancia;

/**
 * **Cada fotograma de la página**, lo mismo que en `verificar-salto.mjs`: dónde está el
 * avión y lo que tapa la pantalla, que entre dos lecturas de este guion no se vería nada.
 * Y **lo que asoma del mundo** en los cinco segundos siguientes al salto, con la siesta
 * yéndose y la lámina del capítulo que sigue debajo: si se fundieran las dos a la vez,
 * asomaría por en medio.
 */
const vigilarLaTapa = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const saltos = [];
    const asomo = { maximo: 0, fotogramas: 0 };
    // Lo mismo con el mapa de la noche: cada fotograma con él puesto, si tapa, y si llena la pantalla.
    const noche = { fotogramas: 0, asomos: 0, loMenos: 1, desde: null, hasta: null, sinLlenar: 0 };
    // Y cada vez que la marca entra o sale del lienzo.
    const elLienzo = [];
    const deEl = (id) => {
      const el = document.getElementById(id);
      return el && !el.hidden ? Number(getComputedStyle(el).opacity) : 0;
    };
    let antes = null;
    let hastaCuando = 0;
    const mirar = () => {
      const s = o.estado();
      const tapa = 1 - (1 - deEl("siesta")) * (1 - deEl("lamina-grande"));
      if (antes && Math.hypot(s.position.x - antes.x, s.position.z - antes.z) > 5000) {
        saltos.push({ antes: antes.tapa, despues: tapa });
        hastaCuando = performance.now() + 5000;
      }
      if (performance.now() < hastaCuando) {
        asomo.maximo = Math.max(asomo.maximo, 1 - tapa);
        asomo.fotogramas++;
      }
      antes = { x: s.position.x, z: s.position.z, tapa };
      // Con la prisa del banco, el plano cambia a los pocos fotogramas de irse la marca: aquí se ve igual.
      const conMarca = o.juegoParaTrazas().pasilloMontado?.pasillo?.pantalla?.paraBanco.conMarca;
      if (conMarca !== undefined && conMarca !== elLienzo.at(-1)) elLienzo.push(conMarca);
      const mapa = document.querySelector("#siesta .siesta__mapa");
      if (mapa) {
        const ahora = performance.now();
        noche.desde ??= ahora;
        noche.hasta = ahora;
        noche.fotogramas++;
        noche.loMenos = Math.min(noche.loMenos, tapa);
        if (tapa < 0.999) noche.asomos++;
        const caja = mapa.getBoundingClientRect();
        if (caja.width < innerWidth - 1 || caja.height < innerHeight - 1) noche.sinLlenar++;
      }
      requestAnimationFrame(mirar);
    };
    requestAnimationFrame(mirar);
    globalThis.__saltosVistos = saltos;
    globalThis.__asomoTrasElSalto = asomo;
    globalThis.__laNoche = noche;
    globalThis.__elLienzo = elLienzo;
  });

/** Lo que queda a la derecha —positivo— de quien va en `l`, m, y a cuánto está. */
function respectoAlAvion(l, sitio) {
  const q = salto.sitioDelMundo(l.salto.origen, l.x, l.z);
  const distancia = ruta.ortodromica(q, sitio).distancia;
  // Con `x` al este y `z` al sur, en el mismo plano que el avión: el lado no cambia a estas distancias.
  const k = Math.cos((q.lat * Math.PI) / 180);
  const dx = ((sitio.lon - q.lon) * Math.PI * 6371008 * k) / 180;
  const dz = -((sitio.lat - q.lat) * Math.PI * 6371008) / 180;
  return { distancia, lado: dx * Math.cos(l.rumbo) + dz * Math.sin(l.rumbo) };
}

/**
 * **El capítulo 2**, de que se abre a que el salto cae en el tercero: lo suyo. De ahí en
 * adelante, `elCapitulo` sigue como con el tercero suelto.
 */
async function laNoche(page) {
  const carga = salto.cargaDelVueloLargo(JAZ_110, perfil);
  await vigilarLaTapa(page);
  /*
   * **El parte de allí, distinto del de aquí**: con `?viento=` los dos serían el mismo, y no
   * se vería cuál se usa. Después de lo que pida `main.ts`, que con la dirección ya contestó.
   */
  const [de, kt] = VIENTO.split("/").map(Number);
  const deAlla = { ...vientoDeCasa(ESCENARIO_DE_LA_LLEGADA.vientoDominante), vientoDe: de, vientoKt: kt, fuente: "mano" };
  await page.evaluate((m) => globalThis.__oga.juegoParaTrazas().ponerTiempoDeLaLlegada(m), deAlla);
  await pausa(1500);
  const uno = await leer(page);
  const avion = await page.evaluate(() => globalThis.__oga.avion().id);
  const entrada = ruta.entradaDeLaNoche(perfil);
  comprobar(
    "arranca tapado: el mundo no asoma antes de abrirse la ventanilla",
    uno.sobreElMundo.visible && uno.sobreElMundo.opacidad === 1 && uno.tapa !== null,
    `lámina ${uno.tapa} · opacidad ${uno.sobreElMundo.opacidad}`,
  );
  comprobar(
    "se abre con el JAZ 110, con Ara a la izquierda, en el mundo de Canarias y con la tripulación en crucero",
    avion === "jaz-110" && uno.salto.mundo === "tenerife-norte" && uno.tripulacion?.tramo === "crucero" && !uno.enTierra && uno.motor === true && uno.vista === "pasaje-izquierda",
    `${avion} · ${uno.salto.mundo} · ${uno.tripulacion?.tramo} · vista ${uno.vista}`,
  );
  comprobar(
    "entra a la hora que da la cuenta",
    Math.abs(uno.salto.hora - entrada) < 60,
    `${(uno.salto.hora / 3600).toFixed(3)} h del despegue (cuenta: ${(entrada / 3600).toFixed(3)} h, ${perfil.horario.temporada})`,
  );
  comprobar(
    "y en el sitio que da la cuenta, dentro del mundo",
    fueraDeLaCuenta(uno) < 500 && Math.abs(uno.x) < EL_MUNDO_DE_LA_NOCHE_LLEGA_A && Math.abs(uno.z) < EL_MUNDO_DE_LA_NOCHE_LLEGA_A,
    `${fueraDeLaCuenta(uno).toFixed(0)} m de la cuenta · lat ${sitioDe(uno).lat.toFixed(2)} lon ${sitioDe(uno).lon.toFixed(2)} · x ${(uno.x / 1000).toFixed(0)} km z ${(uno.z / 1000).toFixed(0)} km`,
  );
  const solAqui = ruta.solEn(new Date(perfil.horario.despegue.getTime() + uno.salto.hora * 1000), sitioDe(uno));
  comprobar(
    "con el sol de ese sitio y ese instante, de noche",
    Math.abs(uno.salto.alturaDelSol - (solAqui.altura * 180) / Math.PI) < 1 && solAqui.deNoche,
    `el sol a ${uno.salto.alturaDelSol.toFixed(1)}° (cuenta: ${((solAqui.altura * 180) / Math.PI).toFixed(1)}°)`,
  );
  const delPerfil = ruta.dondeVa(perfil, uno.salto.hora);
  comprobar(
    "en crucero, con el nivel y la velocidad del perfil",
    delPerfil.fase === "crucero" && Math.abs(uno.y - delPerfil.altitud) < 30 && Math.abs(uno.velocidad - delPerfil.velocidad) < 3,
    `FL${(uno.y / 30.48).toFixed(0)} (perfil FL${(delPerfil.altitud / 30.48).toFixed(0)}) · ${uno.velocidad.toFixed(1)} m/s (perfil ${delPerfil.velocidad.toFixed(1)} m/s)`,
  );
  const alEntrar = salto.estadoDelSalto(perfil, uno.salto.hora, JAZ_110, { en: 0, kilos: carga }).combustible;
  comprobar(
    "con lo que le queda a esa hora en los depósitos",
    Math.abs(uno.combustible.kilos - alEntrar) < 200,
    `${uno.combustible.kilos.toFixed(0)} kg (cuenta: ${alEntrar.toFixed(0)} kg)`,
  );
  await foto(page, "noche-0-tapado");

  // ── Se vuela hasta pasar El Hierro ───────────────────────────────────
  const lejos = () => ({ distancia: Infinity, lado: 0, hora: 0 });
  const pasos = {
    valverde: { sitio: ruta.SITIOS_DEL_CAMINO.valverde, ...lejos() },
    tenerife: { sitio: ruta.SITIOS_DEL_CAMINO.tenerife, ...lejos() },
    laPalma: { sitio: ruta.SITIOS_DEL_CAMINO.laPalma, ...lejos() },
  };
  const fotosHechas = new Set();
  let desnudo = 0;
  let pulsado = false;
  let prisa = false;
  let fuera = 0;
  let dejoElCrucero = false;
  const pared0 = Date.now();
  let pedido = null;
  let consolaTocada = false;
  let enElHierro = null;
  const tapas = [];
  const planos = [];
  // Las luces: lo último que marcaba antes de anunciarlo, y lo que va marcando desde ahí.
  let luzAntes = null;
  const lucesBajando = [];
  // La marca: las frases en que estaba puesta, si llegó al lienzo, y lo que queda al acabar.
  const conMarca = new Set();
  let marcaEnElLienzo = false;
  let repintadosConMarca = [Infinity, 0];
  let lienzoTrasLaMarca = null;
  let marcaAlBajarLasLuces = null;
  for (;;) {
    const l = await leer(page);
    if (tapas.at(-1) !== l.tapa) tapas.push(l.tapa);
    if (planos.at(-1) !== l.plano) planos.push(l.plano);
    if (!l.dichos.includes("luces")) luzAntes = l.luz;
    else if (l.tapa !== "manta" || !l.lamina?.tapa) lucesBajando.push({ pared: Date.now(), luz: l.luz, linea: l.linea });
    if (l.marca && l.linea) {
      conMarca.add(l.linea);
      if (l.pantalla?.conMarca) {
        marcaEnElLienzo = true;
        repintadosConMarca = [Math.min(repintadosConMarca[0], l.pantalla.repintados), Math.max(repintadosConMarca[1], l.pantalla.repintados)];
      }
    }
    if (l.dichos.includes("luces") && lienzoTrasLaMarca === null) {
      marcaAlBajarLasLuces = l.marca;
      lienzoTrasLaMarca = await page.evaluate(() => globalThis.__elLienzo);
    }
    // Desde que se acaba lo de El Hierro: la captura de antes tiene que ser del mismo plano que la de después.
    if (process.env.OGA_PASILLO && conMarca.size > 0 && !l.marca)
      await page.evaluate(() => {
        globalThis.__oga.juegoParaTrazas().planoForzadoParaBanco = "pasillo";
      });
    if (!enElHierro && l.linea?.endsWith("largo.hierroEncima")) enElHierro = { plano: l.plano, pantalla: l.enLaPantalla };
    // Antes del `break`: la última lectura también cuenta para lo que se quedó a la vista.
    if (l.salto.enCurso) {
      pedido = l;
      break;
    }
    if (CONSOLA && !consolaTocada && l.consola?.sale) {
      consolaTocada = true;
      /*
       * Con el ratón en el centro de su caja, como un dedo: el botón late hasta que se abre
       * la primera vez, y `click` espera a que algo deje de moverse. `force` tampoco, que se
       * salta mirar si lo tapa algo, y eso es lo que hay que saber: si lo tapa, no se abre.
       */
      const caja = await page.locator('[data-consola="abrir"]').boundingBox({ timeout: 5000 });
      await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await page.waitForFunction(() => globalThis.__oga.inicio().estado?.consola?.abierta, null, { timeout: 5000 });
      if (CONSOLA === "juego") {
        await page.locator('[data-consola-pestana="juegos"]').click({ timeout: 5000 });
        await page.waitForFunction(() => globalThis.__oga.inicio().estado?.kit?.abierto, null, { timeout: 5000 });
      }
      await pausa(800);
      await foto(page, `noche-consola-${CONSOLA}`);
    }
    if (l.percance || Date.now() - pared0 > 15 * 60_000) break;
    const dichos = l.dichos;
    if (l.tapa === null && !dichos.includes("ventanilla") && !l.sobreElMundo.visible) desnudo++;
    if (l.tripulacion?.tramo !== "crucero") dejoElCrucero = true;
    if (dichos.includes("ventanilla")) {
      for (const p of Object.values(pasos)) {
        const r = respectoAlAvion(l, p.sitio);
        if (r.distancia < p.distancia) Object.assign(p, r, { hora: l.salto.hora });
      }
      if (fueraDeLaCuenta(l) > fuera) fuera = fueraDeLaCuenta(l);
      if (process.env.OGA_PRISA && !prisa) {
        prisa = true;
        await page.evaluate((v) => globalThis.__oga.acelerar(v), Number(process.env.OGA_PRISA));
      }
      if (!prisa && !pulsado && l.adelanto?.sale && !l.adelanto.puesto) {
        pulsado = true;
        await page.locator('[data-hud="adelantar"]').click({ timeout: 5000 }).catch(() => page.evaluate(() => document.querySelector('[data-hud="adelantar"]')?.click()));
      }
    }
    for (const [cual, cuando] of [
      ["noche-lamina-cena", l.lamina?.vista === "cena" && l.lamina.tapa && !!l.linea],
      ["noche-1-ventanilla", dichos.includes("ventanilla") && !l.sobreElMundo.visible],
      ["noche-2-tenerife", l.linea?.endsWith("largo.tenerife")],
      ["noche-3-pantalla-el-hierro", l.plano === "respaldo" && l.linea?.endsWith("largo.hierroEncima")],
      ["noche-3-la-marca", l.plano === "respaldo" && l.linea?.endsWith("largo.hierroDebajo")],
      ["noche-3-sin-la-marca", conMarca.size > 0 && !l.marca && l.plano === "respaldo"],
      ["noche-4-luces-antes", dichos.includes("luces") && l.linea === "comandante.largo.luces" && l.luz > 0.26],
      ["noche-4-luces-despues", dichos.includes("luces") && l.luz < 0.135 && !l.lamina?.tapa],
      ["noche-lamina-manta", l.lamina?.vista === "manta" && l.lamina.tapa && !!l.linea],
    ])
      if (cuando && !fotosHechas.has(cual)) {
        fotosHechas.add(cual);
        // Las de las luces y la de sin la marca, sin esperar: lo que enseñan dura poco.
        if (!cual.startsWith("noche-4-luces") && cual !== "noche-3-sin-la-marca") await pausa(900);
        await foto(page, cual);
      }
    await pausa(250);
  }
  comprobar("y el mundo no asoma antes de la ventanilla", desnudo === 0, `${desnudo} lecturas con el mundo a la vista`);
  const laminas = pedido?.lamina ?? { vistas: [], sinFichero: ["(no se durmió)"] };
  comprobar(
    "cada lámina se ve, con su fichero, en su orden",
    laminas.vistas.join() === "cena,manta" && laminas.sinFichero.length === 0 && tapas.filter((t) => t && t !== "a-oscuras").join() === "cena,manta",
    `vistas ${laminas.vistas.join(" → ")} · pedidas ${tapas.join(" → ")} · sin fichero ${laminas.sinFichero.join(", ") || "ninguna"}`,
  );
  comprobar("va todo el rato en crucero", !dejoElCrucero, "");
  const horaDeValverde = ruta.cuandoPasa(perfil, ruta.PASA_EL_HIERRO);
  const { valverde, tenerife, laPalma } = pasos;
  const delPlan = (p) => ruta.respectoALaRuta(ruta.DE_MADRID_A_ASUNCION, p.sitio).lado;
  comprobar(
    "pasa por El Hierro a la hora de la cuenta, ±5 minutos, con Valverde debajo",
    Math.abs(valverde.hora - horaDeValverde) < 300 && Math.abs(valverde.distancia) < MARGEN_DE_LADO,
    `a las ${(valverde.hora / 3600).toFixed(3)} h (cuenta: ${(horaDeValverde / 3600).toFixed(3)} h) · Valverde a ${(valverde.distancia / 1000).toFixed(1)} km (cuenta: ${(Math.abs(delPlan(valverde)) / 1000).toFixed(1)} km)`,
  );
  comprobar(
    "con Tenerife a 73 km a la izquierda, ±10 km",
    tenerife.lado < 0 && Math.abs(tenerife.distancia - 73_000) < MARGEN_DE_LADO,
    `${(tenerife.distancia / 1000).toFixed(1)} km, ${tenerife.lado < 0 ? "izquierda" : "derecha"} (cuenta: ${(delPlan(tenerife) / 1000).toFixed(1)} km)`,
  );
  comprobar(
    "y La Palma a 43 km a la derecha, ±10 km",
    laPalma.lado > 0 && Math.abs(laPalma.distancia - 43_000) < MARGEN_DE_LADO,
    `${(laPalma.distancia / 1000).toFixed(1)} km, ${laPalma.lado < 0 ? "izquierda" : "derecha"} (cuenta: ${(delPlan(laPalma) / 1000).toFixed(1)} km)`,
  );
  comprobar("y sin apartarse de la raya en todo el rato", fuera < 2000, `como mucho, a ${fuera.toFixed(0)} m de donde dice la cuenta`);

  // ── Luces bajas, siesta y salto ──────────────────────────────────────
  comprobar(
    "Ara se duerme, ya pasado El Hierro, y la siesta tapa la pantalla",
    !!pedido && pedido.salto.tapa === true && pedido.siestas.length === 1 && pedido.salto.hora > horaDeValverde && pedido.dichos.includes("luces"),
    pedido ? `a las ${(pedido.salto.hora / 3600).toFixed(3)} h · tapa ${pedido.salto.tapa} · opacidad ${pedido.siesta?.opacidad} · siestas ${pedido.siestas.length}` : "no se durmió",
  );
  if (!pedido) throw new Error("Ara no se durmió");
  const kilosAntes = pedido.salto.combustible;

  // ── Las luces ────────────────────────────────────────────────────────
  const aMedias = lucesBajando.filter((x) => x.luz > 0.11 && x.luz < 0.29);
  comprobar(
    "al anunciarlo, la cabina baja de luz: de la de crucero a la de dormir",
    Math.abs(luzAntes - 0.3) < 0.005 && pedido.luz < 0.115,
    `antes ${luzAntes?.toFixed(3)} · al dormirse ${pedido.luz.toFixed(3)}`,
  );
  comprobar(
    "y gradual, medido en sus lecturas: varias a medio camino, sin subir nunca, y a lo largo de varios segundos",
    aMedias.length >= 3 && lucesBajando.every((x, i) => i === 0 || x.luz <= lucesBajando[i - 1].luz + 1e-6) && (aMedias.at(-1)?.pared ?? 0) - (aMedias[0]?.pared ?? 0) >= 3000,
    `${lucesBajando.slice(0, 8).map((x) => x.luz.toFixed(3)).join(" → ")}… · ${aMedias.length} lecturas a medias, en ${(((aMedias.at(-1)?.pared ?? 0) - (aMedias[0]?.pared ?? 0)) / 1000).toFixed(1)} s`,
  );

  // ── La marca ─────────────────────────────────────────────────────────
  if (dejaContarElHierro(pedido))
    comprobar(
      "la marca de El Hierro sale en sus frases, llega al lienzo y late; y se va al acabar",
      DE_LA_NOCHE.hierro.filter((c) => !conMarca.has(c)).length <= 1 && marcaEnElLienzo && repintadosConMarca[1] - repintadosConMarca[0] >= 10 && lienzoTrasLaMarca?.includes(true) && lienzoTrasLaMarca?.at(-1) === false && marcaAlBajarLasLuces === null,
      `en ${[...conMarca].map((c) => c.split(".").at(-1)).join(", ")} · en el lienzo ${marcaEnElLienzo} · repintada ${repintadosConMarca[1] - repintadosConMarca[0]} veces · en el lienzo, por orden: ${lienzoTrasLaMarca?.join(" → ")} · al bajar las luces ${marcaAlBajarLasLuces}`,
    );

  // ── La noche en el mapa ──────────────────────────────────────────────
  const dingsAntes = pedido.dings;
  const pintadosAntes = pedido.fotogramasPintados;
  const laNocheDe = { horas: [], parado: [], fases: [], conMapa: 0, sinMapa: 0, lamina: null, dings: 0, pintados: 0, ultimaFase: null, tope: false };
  const fotosDeLaNoche = new Set();
  const paredDeLaNoche = Date.now();
  for (;;) {
    const n = await leer(page);
    if (n.salto.hechos.length > 0) break;
    if (Date.now() - paredDeLaNoche > 150_000) break;
    if (!n.noche) {
      await pausa(100);
      continue;
    }
    const f = n.noche.fase;
    if (laNocheDe.ultimaFase !== f) {
      laNocheDe.fases.push(f);
      laNocheDe.ultimaFase = f;
    }
    laNocheDe.tope ||= n.noche.porElTope;
    laNocheDe.dings = n.dings - dingsAntes;
    if (n.noche.fase !== "acaba" && n.noche.fase !== "acabada") laNocheDe.pintados = n.fotogramasPintados - pintadosAntes;
    if (f === "corre" && !n.lamina?.tapa && n.lamina?.opacidad === 0) {
      if (n.siestaConElMapa && n.pantalla?.modo === "mapa") laNocheDe.conMapa++;
      else laNocheDe.sinMapa++;
      laNocheDe.horas.push(n.pantalla?.hora ?? -1);
    }
    if (f === "despierta") {
      laNocheDe.parado.push({ noche: n.noche.hora, pantalla: n.pantalla?.hora ?? -1 });
      if (n.lamina?.vista === "medio-despertar" && n.lamina?.tapa) laNocheDe.lamina ??= { vista: n.lamina.vista, sinFichero: n.lamina.sinFichero };
    }
    const dormidoOtraVez = laNocheDe.fases.includes("despierta") && f === "corre";
    for (const [cual, cuando] of [
      ["noche-5-mapa-corre", f === "corre" && !dormidoOtraVez && !n.lamina?.tapa && n.lamina?.opacidad === 0 && n.noche.hora > n.noche.plan.desde + 3600],
      ["noche-6-medio-despertar", f === "despierta" && n.lamina?.tapa && !!n.linea && DE_LA_NOCHE.medioDespertar.includes(n.linea)],
      ["noche-7-mapa-sigue", dormidoOtraVez && n.lamina?.opacidad === 0 && n.noche.hora > n.noche.plan.seDespiertaEn + 3600],
    ])
      if (cuando && !fotosDeLaNoche.has(cual)) {
        fotosDeLaNoche.add(cual);
        await foto(page, cual);
      }
    await pausa(150);
  }
  // Lo que quede de la prisa no es del tercero: suelto, su apertura corre a su paso.
  await page.evaluate(() => globalThis.__oga.acelerar(1));
  const despierto = await leer(page);
  const hecho = despierto.salto.hechos[0];
  if (!hecho) throw new Error(`la noche no acabó: ${JSON.stringify(laNocheDe.fases)}`);
  const enLaPagina = await page.evaluate(() => globalThis.__laNoche);
  const elEcuador = ruta.cuandoPasa(perfil, ruta.cruceDelEcuador(ruta.DE_MADRID_A_ASUNCION).recorrido);
  const planDeHoy = pedido.noche?.plan;
  comprobar(
    "la noche enseña el mapa, a toda pantalla, y el mundo no asoma: ni una lectura, ni un fotograma pintado",
    laNocheDe.conMapa > 10 && laNocheDe.sinMapa === 0 && enLaPagina.asomos === 0 && enLaPagina.sinLlenar === 0 && laNocheDe.pintados === 0,
    `${laNocheDe.conMapa} lecturas con el mapa · ${laNocheDe.sinMapa} sin él · ${enLaPagina.fotogramas} fotogramas: ${enLaPagina.asomos} con el mundo asomando (lo menos tapado: ${enLaPagina.loMenos.toFixed(3)}), ${enLaPagina.sinLlenar} sin llenar · ${laNocheDe.pintados} pintados`,
  );
  comprobar(
    "el avión del mapa avanza, y acaba donde lo enseña el capítulo que sigue",
    laNocheDe.horas.length > 10 && laNocheDe.horas.every((h, i) => i === 0 || h >= laNocheDe.horas[i - 1]) && (laNocheDe.horas.at(-1) ?? 0) > 8 * 3600 && (laNocheDe.horas[0] ?? Infinity) < 5 * 3600,
    `de ${((laNocheDe.horas[0] ?? 0) / 3600).toFixed(2)} h a ${((laNocheDe.horas.at(-1) ?? 0) / 3600).toFixed(2)} h del despegue, en ${laNocheDe.horas.length} lecturas`,
  );
  comprobar("y la noche dura menos de un minuto de pared", hecho.pared < 60 && hecho.pared > 25, `${hecho.pared.toFixed(1)} s desde que tapa hasta el corte (en la página, ${((enLaPagina.hasta - enLaPagina.desde) / 1000).toFixed(1)} s con el mapa puesto)`);
  comprobar(
    "suena el ding, una vez, y por él se despierta",
    laNocheDe.dings === 1 && /^(tapando,)?corre,despierta,corre,acaba/.test(laNocheDe.fases.join()),
    `${laNocheDe.dings} ding · ${laNocheDe.fases.join(" → ")}`,
  );
  comprobar(
    "con su lámina, con su fichero",
    laNocheDe.lamina?.vista === "medio-despertar" && despierto.lamina.vistas.includes("medio-despertar") && despierto.lamina.sinFichero.length === 0,
    `${laNocheDe.lamina?.vista ?? "no se vio"} · sin fichero ${despierto.lamina.sinFichero.join(", ") || "ninguna"}`,
  );
  comprobar(
    "el mapa se queda quieto mientras tanto, en la zona de tormentas y antes del ecuador",
    // Lo pintado va hasta un píxel por detrás: es lo que tarda en repintar, un minuto largo de vuelo.
    laNocheDe.parado.length > 0 && laNocheDe.parado.every((x) => x.noche === planDeHoy?.seDespiertaEn && Math.abs(x.pantalla - x.noche) < 120) && planDeHoy.seDespiertaEn > 6 * 3600 && planDeHoy.seDespiertaEn < Math.min(elEcuador, 6.95 * 3600),
    `quieto a las ${((planDeHoy?.seDespiertaEn ?? 0) / 3600).toFixed(3)} h (el ecuador, a las ${(elEcuador / 3600).toFixed(3)} h) · ${laNocheDe.parado.length} lecturas`,
  );
  comprobar("y no se suelta por el tope, con todo respondiendo", !laNocheDe.tope, "");

  const elParte = await page.evaluate(() => {
    const m = globalThis.__oga.juegoParaTrazas().scenario.meteo;
    return { vientoDe: m?.vientoDe, vientoKt: m?.vientoKt };
  });
  const ultimoFijo = despierto.plan?.fijos?.at(-1)?.nombre;
  const cabecera = de > 90 && de < 270 ? "RW20" : "RW02";
  comprobar(
    "y al caer en el capítulo 3, la luz de crucero, la de siempre",
    Math.abs(despierto.luz - 0.3) < 0.005,
    `${despierto.luz.toFixed(3)}`,
  );
  comprobar(
    "cae con el parte de Asunción, y entra por la cabecera que da su viento",
    elParte.vientoDe === de && elParte.vientoKt === kt && ultimoFijo === cabecera,
    `viento ${elParte.vientoDe}/${elParte.vientoKt} · el plan acaba en ${ultimoFijo} (el de Canarias era 040/12)`,
  );
  const delAntes = await page.evaluate(() => {
    const d = globalThis.__oga.inicio().capituloDeAntes;
    return d ? { registro: d.registro.map((x) => ({ clave: x.clave, desde: x.desde, hasta: x.hasta, cortada: x.cortada, como: x.como })), dichos: d.estado.dichos } : null;
  });
  const elDespertar = ruta.entradaDeLaLlegada(perfil);
  comprobar(
    "el salto cae a la hora del despertar, en el mundo del Paraguay, con el mundo ya bajado",
    Math.abs(hecho.hasta - elDespertar) < 1 && hecho.mundo === "pettirossi" && !hecho.sinElMundo && !hecho.porLaRed,
    `de ${(hecho.desde / 3600).toFixed(3)} h a ${(hecho.hasta / 3600).toFixed(3)} h (cuenta: ${(elDespertar / 3600).toFixed(3)} h) · ${hecho.mundo} · ${hecho.pared.toFixed(1)} s de pared`,
  );
  comprobar(
    "y en el punto de la ortodrómica de esa hora, ±10 km",
    fueraDeLaCuenta(despierto) < MARGEN_DE_LADO,
    `${fueraDeLaCuenta(despierto).toFixed(0)} m de la cuenta · lat ${sitioDe(despierto).lat.toFixed(2)} lon ${sitioDe(despierto).lon.toFixed(2)}`,
  );
  const vistos = await page.evaluate(() => ({ saltos: globalThis.__saltosVistos, asomo: globalThis.__asomoTrasElSalto }));
  comprobar(
    "nunca se ve saltar: la pantalla está opaca en el fotograma del corte",
    vistos.saltos.length === 1 && vistos.saltos.every((x) => x.antes >= 0.999 && x.despues >= 0.999),
    JSON.stringify(vistos.saltos),
  );
  const esperado = salto.estadoDelSalto(perfil, hecho.hasta, JAZ_110, { en: 0, kilos: carga }).combustible;
  const queda = despierto.salto.combustible;
  const t = hecho.tarjeta;
  const deLaTarjeta = t ? `geometrías ${t.geometrias[0]} → ${t.geometrias[1]} · texturas ${t.texturas[0]} → ${t.texturas[1]}` : "sin medida";
  /*
   * Three.js cuenta lo que ya se ha pintado, y con la pantalla delante se pinta menos mundo: el
   * número de antes baja y esta cuenta falla sin que se quede nada. Medido: 192 → 150 sin
   * consola y 181 → 150 con ella. Sin consola es donde dice algo; con ella, solo se enseña.
   */
  if (CONSOLA) console.log(`  la tarjeta, sin juzgar con la pantalla delante: ${deLaTarjeta}`);
  else comprobar("al quitar el mundo de antes, lo suyo se va de la tarjeta", !!t && t.geometrias[1] < t.geometrias[0] * 0.8, deLaTarjeta);
  comprobar(
    "lo que queda al despertar cuadra con la cuenta",
    Math.abs(queda - esperado) < 500,
    `${queda.toFixed(0)} kg (cuenta del vuelo entero: ${esperado.toFixed(0)} kg) · al dormirse ${kilosAntes.toFixed(0)} kg`,
  );
  const reg = delAntes?.registro ?? [];
  let pisadas = 0;
  for (let k = 1; k < reg.length; k++) if (reg[k].desde < (reg[k - 1].hasta ?? Infinity) - 1e-6) pisadas++;
  const dichos = delAntes?.dichos ?? [];
  const seVioTenerife = dichos.includes("tenerife");
  const seContoElHierro = dichos.includes("hierro");
  const momentos = ["cena", "cocina", "agua", "ventanilla", ...(seVioTenerife ? ["tenerife"] : []), ...(seContoElHierro ? ["hierro"] : []), "luces", "manta"];
  comprobar(
    "en este capítulo tampoco suenan dos voces a la vez, y se dice lo suyo en su orden",
    pisadas === 0 && reg.every((d) => !d.cortada) && momentos.join() === dichos.filter((m) => m !== "bajada").join(),
    `${reg.length} frases · ${pisadas} pisadas · ${dichos.join(", ")}`,
  );
  const orden = [
    ...DE_LA_NOCHE.apertura,
    ...(seVioTenerife ? DE_LA_NOCHE.tenerife : []),
    ...(seContoElHierro ? DE_LA_NOCHE.hierro : []),
    ...(CONSOLA ? [SE_RECOGE_LA_CONSOLA] : []),
    ...DE_LA_NOCHE.luces,
    ...DE_LA_NOCHE.medioDespertar,
  ];
  const lasDichas = reg.map((d) => d.clave);
  let hasta = -1;
  const fueraDeOrden = orden.filter((c) => {
    const j = lasDichas.indexOf(c);
    if (j <= hasta) return true;
    hasta = j;
    return false;
  });
  comprobar("suena todo, en su orden", fueraDeOrden.length === 0, fueraDeOrden.length ? `fuera de orden o sin decir: ${fueraDeOrden.join(", ")}` : `${orden.length} frases`);
  const sinSonar = reg.filter((d) => d.como !== null && d.como !== "sono").map((d) => d.clave);
  const graves = sinSonar.filter((c) => GRABADAS.has(c));
  comprobar(
    "lo que no suena es solo lo que está sin grabar: ni una grabada muda",
    graves.length === 0,
    graves.length ? `grabadas y mudas: ${graves.join(", ")}` : `sin grabar, y por eso mudas: ${sinSonar.length} de ${reg.length}`,
  );
  if (sinSonar.length) console.log(`  sin grabar: ${sinSonar.join(" · ")}`);
  comprobar(
    "de lo de prueba, nada: ni el mar azul oscurito, ni lo de tocar con el dedo",
    !lasDichas.some((c) => /marAbajo|toque\.invita|cerca\.estrellas|cerca\.persiana/.test(c)),
    "",
  );

  // ── Lo que se nombra ─────────────────────────────────────────────────
  const delTenerife = pedido.nombrados.filter((n) => n.sitio === "luces-de-tenerife");
  comprobar(
    "Tenerife, solo si se ve por su cristal, y por su lado",
    seVioTenerife
      ? delTenerife.length === 1 && ["ventanilla", "asomado"].includes(delTenerife[0].como) && delTenerife[0].lado === "izquierda"
      : pedido.saltados.includes("tenerife") && delTenerife.length === 0 && !lasDichas.includes(DE_LA_NOCHE.tenerife[0]),
    seVioTenerife ? `se nombró: ${delTenerife[0]?.como}, ${delTenerife[0]?.lado}` : "hoy no se veía, y no se nombró",
  );
  comprobar(
    "Ara no nombra El Hierro por el cristal: nada mirando abajo, y nada nombrado de la isla",
    !planos.includes("asomado-abajo") && !pedido.nombrados.some((n) => /hierro|valverde/i.test(n.sitio)),
    `planos ${planos.join(" → ")} · nombrado ${pedido.nombrados.map((n) => n.sitio).join(", ") || "nada"}`,
  );
  if (CONSOLA !== "juego")
    comprobar(
      "El Hierro va en el plano del respaldo, con la pantalla enseñando dónde va el avión",
      enElHierro?.plano === "respaldo" && enElHierro?.pantalla === "cerca",
      enElHierro ? `plano ${enElHierro.plano} · pantalla ${enElHierro.pantalla}` : "no se contó",
    );

  // ── La consola ───────────────────────────────────────────────────────
  const consolaAlDormirse = pedido.consola;
  comprobar(
    "la consola se ha ido al bajar las luces, y no vuelve a salir",
    !!consolaAlDormirse && consolaAlDormirse.recogida && !consolaAlDormirse.abierta && !consolaAlDormirse.sale,
    consolaAlDormirse ? `abierta ${consolaAlDormirse.abierta} · recogida ${consolaAlDormirse.recogida} · por la red ${consolaAlDormirse.porElTope}` : "sin consola",
  );
  if (CONSOLA) {
    comprobar(
      `con ${CONSOLA === "juego" ? "un juego abierto" : "la pantalla abierta"} al bajar las luces, se recoge con su frase, sin la de los diez mil pies, y Ara se duerme igual`,
      consolaTocada &&
        lasDichas.includes(SE_RECOGE_LA_CONSOLA) &&
        !lasDichas.includes("inicio.tripulacion.pasaje.cerca.largo.consolaRecoge") &&
        lasDichas.indexOf(SE_RECOGE_LA_CONSOLA) < lasDichas.indexOf("comandante.largo.luces") &&
        pedido.siestas.length === 1 &&
        !pedido.consola.abierta,
      `tocada ${consolaTocada} · siestas ${pedido.siestas.length} · kit abierto ${!!pedido.kit?.abierto}`,
    );
    if (CONSOLA === "juego")
      comprobar(
        "y con el juego delante, El Hierro no se cuenta encima",
        !seContoElHierro && pedido.saltados.includes("hierro") && !pedido.kit?.abierto,
        `dichos ${dichos.join(", ")} · saltados ${pedido.saltados.join(", ")}`,
      );
  } else comprobar("sin abrirla, no se pide guardarla", !lasDichas.includes(SE_RECOGE_LA_CONSOLA), "");
  console.log(`  lo dicho: ${reg.map((d) => `${d.clave}(${d.como})`).join(" · ")}`);
  console.log(`  ${((Date.now() - pared0) / 1000).toFixed(0)} s de pared de la ventanilla al salto`);
  await foto(page, "noche-8-tras-el-salto");
}

/** El T5 de la T1 y la doble raya de la Z4, en el mundo: x al este, z al sur. Ver `SALIDA_DE_BARAJAS`. */
const EL_T5 = { x: 293.6, z: 3407.2 };
const LA_Z4 = { x: -320, z: 95.1 };
/** Las tiras de luz del suelo del pasillo que se tienen que ver, como poco, con Ara asomada. */
const UNAS_CUANTAS_TIRAS = 4;
/** El centro de Madrid: ver `LUCES_DE_MADRID`. */
const MADRID = { lat: 40.4169, lon: -3.7035 };
/** Grados, de rumbo en radianes del juego. */
const grados = (r) => ((((r * 180) / Math.PI) % 360) + 360) % 360;

/**
 * **El primer capítulo, del embarque a la luz del cinturón apagada.** Ver la cabecera.
 */
async function laNocheDeMadrid() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text().slice(0, 200));
  });
  const pared0 = Date.now();
  try {
    await page.goto(`${BASE}/?inicio=4&capitulo=1&fecha=${FECHA}&viento=${process.env.OGA_VIENTO ?? "240/6"}`);
    await page.bringToFront();
    await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
    await page.keyboard.press("ShiftLeft");
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    await pausa(1200);
    const uno = await leer(page);
    const avion = await page.evaluate(() => globalThis.__oga.avion().id);
    comprobar(
      "arranca tapado, con la lámina del embarque",
      uno.sobreElMundo.visible && uno.sobreElMundo.opacidad === 1 && (uno.tapa === "embarque" || uno.tapa === "a-oscuras"),
      `lámina ${uno.tapa} · opacidad ${uno.sobreElMundo.opacidad}`,
    );
    comprobar(
      "con el JAZ 110, de pasajero, en Barajas, en tierra y con los motores parados",
      avion === "jaz-110" && uno.escena === "largo" && uno.salto.mundo === "barajas" && uno.enTierra && !uno.motor && uno.vista === "pasaje-izquierda",
      `${avion} · ${uno.escena} · ${uno.salto.mundo} · en tierra ${uno.enTierra} · motor ${uno.motor} · vista ${uno.vista}`,
    );
    const enElT5 = Math.hypot(uno.x - EL_T5.x, uno.z - EL_T5.z);
    comprobar("en el puesto T5 de la T1", enElT5 < 30, `a ${enElT5.toFixed(1)} m del T5 · x ${uno.x.toFixed(0)} z ${uno.z.toFixed(0)}`);
    const embarque = -(ruta.RODAJE_DE_SALIDA + 40 * 60);
    comprobar(
      "a la hora de embarcar de ese día, y de noche",
      Math.abs(uno.salto.hora - embarque) < 60 && uno.salto.alturaDelSol < -12,
      `${(uno.salto.hora / 60).toFixed(1)} min del despegue (cuenta: ${embarque / 60}) · el sol a ${uno.salto.alturaDelSol.toFixed(1)}° · ${perfil.horario.temporada}`,
    );
    console.log(`  el plan: ${uno.plan?.fijos?.filter((f) => f.nombre).map((f) => `${f.nombre}(${f.papel})`).join(" → ") ?? "?"}`);

    const fotos = new Set();
    const tramos = [];
    const pasillo = { muestras: 0, buenas: 0, peor: null, tiras: [] };
    let pisaPista = 0;
    let enLaEspera = null;
    let alDespegar = null;
    let alNorteDeSSY = null;
    let giroALaIzquierda = null;
    let madridDicha = null;
    let laminaDelEmbarque = null;
    let prisa = false;
    let pulsado = false;
    const rumbosAntesDeSSY = [];
    let l = uno;
    let trazaEn = 0;
    for (;;) {
      l = await leer(page);
      const tramo = l.tripulacion?.tramo ?? "?";
      if (tramos.at(-1) !== tramo) tramos.push(tramo);
      if (!laminaDelEmbarque && l.lamina?.vista === "embarque" && l.lamina.tapa) {
        laminaDelEmbarque = l.lamina;
        await pausa(900);
        await foto(page, "c1-lamina-embarque");
      }
      if (l.dichos.includes("ventanilla") && !fotos.has("puesto") && l.tapa === null && !l.sobreElMundo.visible) {
        fotos.add("puesto");
        await pausa(600);
        await foto(page, "c1-puesto");
      }
      // Desde que se abre la ventanilla: el ⏩, con el dedo, y la prisa del banco si se pide.
      if (l.dichos.includes("ventanilla") && process.env.OGA_PRISA && !prisa) {
        prisa = true;
        await page.evaluate((v) => globalThis.__oga.acelerar(v), Number(process.env.OGA_PRISA));
      }
      if (l.adelanto?.sale && !l.adelanto.puesto && !pulsado) {
        pulsado = true;
        await page.locator('[data-hud="adelantar"]').click({ timeout: 5000 }).catch(() => page.evaluate(() => document.querySelector('[data-hud="adelantar"]')?.click()));
      }
      if ((tramo === "rodando" || tramo === "esperando") && l.enPista) pisaPista++;
      if (tramo === "rodando" && l.suelo > 3 && !fotos.has("rodando") && l.plano !== "pasillo") {
        fotos.add("rodando");
        await foto(page, `c1-rodando-${l.plano}`);
      }
      if (l.dichos.includes("lucesDeLasCalles") && !fotos.has("luces")) {
        fotos.add("luces");
        await foto(page, `c1-luces-${l.plano}`);
      }
      if (tramo === "esperando" && !enLaEspera) enLaEspera = { x: l.x, z: l.z };
      if (l.plano === "pasillo") {
        const visto = await page.evaluate(() => ({ plano: globalThis.__oga.inicio().planoVisto, velo: Number(globalThis.__oga.inicio().velo) || 0 }));
        if (visto.plano === "pasillo" && visto.velo < 0.02) {
          const p = await page.evaluate(() => globalThis.__oga.pasillo?.() ?? null).catch(() => null);
          pasillo.muestras++;
          /*
           * Las tiras del suelo, unas cuantas: el pasillo de este avión mide más de cincuenta
           * metros, y desde el asiento de Ara se ve su trozo de delante, no el treinta por
           * ciento que se le pide al del vuelo corto.
           */
          const bien = !!p?.letrero && p.letrero.entero && !p.letrero.tapado && p.colgado && !p.marco && p.tiras.vistas >= Math.min(UNAS_CUANTAS_TIRAS, p.tiras.de);
          if (p) pasillo.tiras.push(`${p.tiras.vistas}/${p.tiras.de}`);
          if (bien) pasillo.buenas++;
          else pasillo.peor ??= p && { ...p, letrero: p.letrero && { entero: p.letrero.entero, tapado: p.letrero.tapado } };
          if (!fotos.has("pasillo-primero")) {
            fotos.add("pasillo-primero");
            await foto(page, "c1-pasillo");
          }
          if (bien && !fotos.has("pasillo")) {
            fotos.add("pasillo");
            await foto(page, "c1-pasillo-exit");
          }
        }
      }
      if (tramo === "carrera" && !fotos.has("despegue") && l.suelo > 40) {
        fotos.add("despegue");
        await foto(page, `c1-despegue-${l.plano}`);
      }
      if (!l.enTierra && !alDespegar) alDespegar = { x: l.x, z: l.z, rumbo: grados(l.rumbo) };
      if (!l.enTierra && l.z > -5500) rumbosAntesDeSSY.push(grados(l.rumbo));
      if (!l.enTierra && l.z < -6500 && !alNorteDeSSY) alNorteDeSSY = { x: l.x, z: l.z };
      if (alNorteDeSSY && !giroALaIzquierda) {
        const r = grados(l.rumbo);
        if (r > 270 && r < 330) giroALaIzquierda = { rumbo: r, x: l.x, z: l.z, y: l.y };
      }
      if (l.dichos.includes("madrid") && !madridDicha) {
        madridDicha = { ...respectoAlAvion(l, MADRID), rumbo: grados(l.rumbo), y: l.y };
        await foto(page, "c1-madrid");
      }
      if (giroALaIzquierda && !fotos.has("giro") && l.y > giroALaIzquierda.y + 300) {
        fotos.add("giro");
        await foto(page, `c1-subiendo-${l.plano}`);
      }
      if (Date.now() - trazaEn > 15_000) {
        trazaEn = Date.now();
        console.log(
          `  · ${((Date.now() - pared0) / 1000).toFixed(0).padStart(4)} s · ${tramo} · ${l.fase} · x ${(l.x / 1000).toFixed(2)} z ${(l.z / 1000).toFixed(2)} km · FL${(l.y / 30.48).toFixed(0)} · ${(l.velocidad / 0.5144).toFixed(0)} kt · rumbo ${grados(l.rumbo).toFixed(0)} · ${l.momento} · plano ${l.plano} · ⏩ ${l.adelanto?.adelantando ? "corre" : "—"} · ${l.linea ?? ""}`,
        );
      }
      if (l.terminado || (l.momento === "fin" && l.puedeSeguir) || l.percance || Date.now() - pared0 > TOPE) break;
      await pausa(250);
    }
    const paredes = (Date.now() - pared0) / 60_000;
    await foto(page, "c1-final");
    comprobar(
      "la lámina del embarque se ve, con su fichero",
      (l.lamina?.vistas ?? []).includes("embarque") && (l.lamina?.sinFichero ?? []).length === 0,
      `vistas ${(l.lamina?.vistas ?? []).join(" → ")} · sin fichero ${(l.lamina?.sinFichero ?? []).join(", ") || "ninguna"}`,
    );
    comprobar("rueda sin pisar ninguna pista", pisaPista === 0 && tramos.includes("rodando"), `${pisaPista} lecturas en una pista · tramos ${tramos.join(" → ")}`);
    const aLaZ4 = enLaEspera ? Math.hypot(enLaEspera.x - LA_Z4.x, enLaEspera.z - LA_Z4.z) : Infinity;
    comprobar("y para en la doble raya de la Z4", aLaZ4 < 60, enLaEspera ? `a ${aLaZ4.toFixed(0)} m de la Z4` : "no llegó a esperar");
    comprobar(
      "despega por la 36L, hacia el norte",
      !!alDespegar && Math.abs(alDespegar.x + 210) < 60 && Math.min(alDespegar.rumbo, 360 - alDespegar.rumbo) < 6,
      alDespegar ? `x ${alDespegar.x.toFixed(0)} z ${alDespegar.z.toFixed(0)} · rumbo ${alDespegar.rumbo.toFixed(0)}` : "no despegó",
    );
    const torcido = rumbosAntesDeSSY.filter((r) => Math.min(r, 360 - r) > 10).length;
    comprobar(
      "sigue la salida: recto al norte hasta SSY, y a la izquierda, al oeste",
      rumbosAntesDeSSY.length > 0 && torcido === 0 && !!giroALaIzquierda,
      `${torcido} de ${rumbosAntesDeSSY.length} lecturas torcidas antes de SSY · ${giroALaIzquierda ? `a rumbo ${giroALaIzquierda.rumbo.toFixed(0)} en x ${(giroALaIzquierda.x / 1000).toFixed(1)} z ${(giroALaIzquierda.z / 1000).toFixed(1)} km` : "sin giro a la izquierda"}`,
    );
    comprobar(
      "al decir las salidas Ara se asoma al pasillo y se ve el letrero de la más cercana",
      pasillo.muestras > 0 && pasillo.buenas >= Math.max(1, 0.8 * pasillo.muestras),
      `${pasillo.buenas} de ${pasillo.muestras} muestras buenas · tiras vistas ${[...new Set(pasillo.tiras)].slice(0, 6).join(", ")}${pasillo.peor ? ` · la peor: ${JSON.stringify(pasillo.peor).slice(0, 300)}` : ""}`,
    );
    comprobar(
      "Madrid, si Ara la nombra, a su izquierda",
      !madridDicha || madridDicha.lado < 0,
      madridDicha ? `a ${(madridDicha.distancia / 1000).toFixed(1)} km, ${madridDicha.lado < 0 ? "a la izquierda" : "a la derecha"} · rumbo ${madridDicha.rumbo.toFixed(0)} · FL${(madridDicha.y / 30.48).toFixed(0)}` : "hoy no se nombró",
    );
    comprobar(
      "llega a su final con la luz del cinturón apagada, y con la tarjeta de seguir",
      l.momento === "fin" && l.dichos.includes("arriba") && l.cartel === false && l.dings >= 1,
      `${l.momento} · cartel ${l.cartel ? "encendido" : "apagado"} · dings ${l.dings} · FL${(l.y / 30.48).toFixed(0)} · dichos ${l.dichos.join(", ")} · saltados ${l.saltados.join(", ") || "ninguno"}`,
    );
    const registro = l.registro;
    let pisadas = 0;
    for (let k = 1; k < registro.length; k++) if (registro[k].desde < (registro[k - 1].hasta ?? Infinity) - 1e-6) pisadas++;
    comprobar(
      "nunca suenan dos voces a la vez",
      registro.length >= 15 && pisadas === 0 && registro.every((d) => !d.cortada),
      `${registro.length} frases · ${pisadas} pisadas · ${registro.filter((d) => d.cortada).length} cortadas · ${registro.filter((d) => d.como === "sono").length} sonadas`,
    );
    console.log(`  lo dicho: ${registro.map((d) => `${d.clave}(${d.como})`).join(" · ")}`);
    console.log(`  ${paredes.toFixed(1)} min de pared${process.env.OGA_PRISA ? `, con el reloj ×${process.env.OGA_PRISA}` : ""}`);
    comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 4).join(" · "));
    // ── Y el botón de la tarjeta, que lleva al segundo capítulo ──────────
    if (l.momento === "fin" && l.puedeSeguir) {
      const boton = page.locator("[data-inicio='seguir']");
      const texto = (await boton.textContent().catch(() => "")) ?? "";
      await boton.click({ timeout: 5000 }).catch(() => page.evaluate(() => document.querySelector("[data-inicio='seguir']")?.click()));
      const llega = await page
        .waitForFunction(() => globalThis.__oga?.salto?.().mundo === "tenerife-norte" && globalThis.__oga.salto().hora != null, null, { timeout: 240_000 })
        .then(() => true)
        .catch(() => false);
      const alli = llega ? await leer(page) : null;
      comprobar(
        "y su botón, «seguir volando», lleva al segundo capítulo: la noche sobre el mar, tapada con su lámina",
        /seguir/i.test(texto) && llega && !!alli && alli.sobreElMundo.visible && (alli.tapa === "cena" || alli.tapa === "a-oscuras"),
        `«${texto.trim()}» · ${page.url().replace(BASE, "")} · ${alli ? `${alli.salto.mundo} · lámina ${alli.tapa}` : "no llegó"}`,
      );
    }
  } catch (e) {
    comprobar("el capítulo", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

/** **Si hoy se contó El Hierro**: con un juego delante no se cuenta, y no hay marca que mirar. */
const dejaContarElHierro = (l) => l.dichos.includes("hierro");

async function elCapitulo() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  const avisos = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text().slice(0, 200));
    if (m.type() === "warning") avisos.push(m.text().slice(0, 200));
  });
  try {
    // En la noche, el alisio de Canarias: `VIENTO` es el de allí. Ver `laNoche`.
    await page.goto(`${BASE}/?inicio=4&capitulo=${CAPITULO}&fecha=${FECHA}&viento=${CAPITULO === "2" ? "040/12" : VIENTO}${METAR ? `&metar=${encodeURIComponent(METAR)}` : ""}`);
    await page.bringToFront();
    await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
    await page.keyboard.press("ShiftLeft");
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    if (CAPITULO === "2") await laNoche(page);
    else await pausa(1500);
    if (SOLO_NOCHE) {
      comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 4).join(" · "));
      return;
    }

    // ── Se abre, y entra donde toca ──────────────────────────────────────
    const uno = await leer(page);
    comprobar(
      "arranca tapado: el mundo no asoma antes de abrirse la ventanilla",
      uno.sobreElMundo.visible && uno.sobreElMundo.opacidad === 1 && uno.tapa !== null,
      `lámina ${uno.tapa} · opacidad ${uno.sobreElMundo.opacidad}`,
    );
    const avion = await page.evaluate(() => globalThis.__oga.avion().id);
    comprobar(
      "se abre con el JAZ 110, de pasajero, en el mundo del Paraguay y con la tripulación en crucero",
      avion === "jaz-110" && uno.escena === "largo" && uno.salto.mundo === "pettirossi" && uno.tripulacion?.tramo === "crucero" && !uno.enTierra && uno.motor === true && uno.vista?.startsWith("pasaje"),
      `${avion} · ${uno.escena} · ${uno.salto.mundo} · ${uno.tripulacion?.tramo} · FL${Math.round(uno.y / 30.48)} · vista ${uno.vista}`,
    );
    const entrada = ruta.entradaDeLaLlegada(perfil);
    comprobar(
      "entra a la hora que da la cuenta",
      Math.abs(uno.salto.hora - entrada) < 60,
      `${(uno.salto.hora / 3600).toFixed(3)} h del despegue (cuenta: ${(entrada / 3600).toFixed(3)} h, ${perfil.horario.temporada})`,
    );
    comprobar(
      "y en el sitio que da la cuenta, dentro del mundo",
      fueraDeLaCuenta(uno) < 500 && Math.abs(uno.x) < 374_000 && Math.abs(uno.z) < 374_000,
      `${fueraDeLaCuenta(uno).toFixed(0)} m de la cuenta · lat ${sitioDe(uno).lat.toFixed(2)} lon ${sitioDe(uno).lon.toFixed(2)} · x ${(uno.x / 1000).toFixed(0)} km z ${(uno.z / 1000).toFixed(0)} km`,
    );
    const sol = ruta.solEn(new Date(perfil.horario.despegue.getTime() + uno.salto.hora * 1000), sitioDe(uno));
    comprobar(
      "con el sol de ese sitio y ese instante",
      Math.abs(uno.salto.alturaDelSol - (sol.altura * 180) / Math.PI) < 1,
      `el sol a ${uno.salto.alturaDelSol.toFixed(1)}° (cuenta: ${((sol.altura * 180) / Math.PI).toFixed(1)}°)`,
    );
    comprobar(
      "y sin la tarjeta de la escena en blanco: si nadie habla, no se ve",
      !uno.tarjeta?.visible || uno.tarjeta.texto.length > 0,
      uno.tarjeta ? `visible ${uno.tarjeta.visible} · «${uno.tarjeta.texto.slice(0, 40)}»` : "sin tarjeta",
    );
    const plan = uno.plan;
    console.log(`  el plan: ${plan?.fijos?.filter((f) => f.nombre).map((f) => `${f.nombre}(${f.papel})`).join(" → ")}`);

    // ── Lo de antes de ver el mundo ──────────────────────────────────────
    const fotos = new Set();
    const planosVistos = [];
    const tapasVistas = [];
    let desnudo = 0;
    let abierta = null;
    const pared00 = Date.now();
    await foto(page, "0-a-oscuras");
    for (;;) {
      const a = await leer(page);
      if (tapasVistas.at(-1) !== a.tapa) tapasVistas.push(a.tapa);
      if (planosVistos.at(-1) !== a.plano) planosVistos.push(a.plano);
      // Sin lámina ni pantalla delante, antes de tiempo: el mundo a la vista.
      if (a.tapa === null && a.plano !== "respaldo" && !a.dichos.includes("ventanilla") && !a.sobreElMundo.visible) desnudo++;
      const vista = a.lamina?.vista ?? null;
      if (vista && a.lamina.tapa && !fotos.has(vista) && a.linea && (a.momento !== "despertar" || a.lamina.opacidad === 1)) {
        // Ya con la luz subida del todo, si es la del despertar.
        if (a.dichos.includes("mapa") || vista !== (a.lamina.vistas[0] ?? "")) {
          fotos.add(vista);
          await pausa(1100);
          await foto(page, `lamina-${vista}`);
        }
      }
      if (a.plano === "respaldo" && !fotos.has("respaldo") && a.linea?.endsWith("largo.mapa")) {
        fotos.add("respaldo");
        await pausa(1500);
        await foto(page, "pantalla-del-respaldo");
      }
      if (!fotos.has("piernas") && a.linea?.endsWith("derlis.piernas")) {
        fotos.add("piernas");
        await pausa(1500);
        await foto(page, "lamina-piernas");
      }
      if (a.dichos.includes("ventanilla")) {
        abierta = a;
        break;
      }
      if (a.percance || Date.now() - pared00 > 12 * 60_000) break;
      await pausa(300);
    }
    const a = abierta;
    comprobar("la apertura se acaba, y se abre la ventanilla", !!a, a ? `${((Date.now() - pared00) / 1000).toFixed(0)} s de pared` : "no se abrió");
    if (a) {
      comprobar("con la cabina como siempre: la luz de crucero, no la de dormir", Math.abs(a.luz - 0.3) < 0.005, `${a.luz.toFixed(3)}`);
      const temporada = perfil.horario.temporada;
      const conSol = ruta.solEnElVuelo(perfil, ruta.entradaDeLaLlegada(perfil)).asoma;
      const desayuno = conSol ? "desayuno" : "desayuno-noche";
      const huso = temporada === "verano" ? "huso-verano" : "huso-invierno";
      const esperadas = [desayuno, huso, "ecuador"];
      comprobar(
        "cada lámina se ve, con su fichero, y es la de hoy",
        esperadas.every((c) => a.lamina.vistas.includes(c)) && a.lamina.sinFichero.length === 0 && !a.lamina.vistas.includes(conSol ? "desayuno-noche" : "desayuno"),
        `vistas ${a.lamina.vistas.join(" → ")} · sin fichero ${a.lamina.sinFichero.join(", ") || "ninguna"}`,
      );
      comprobar(
        "en su orden, con la pantalla del asiento entre medias",
        tapasVistas.filter((t) => t).join() === ["a-oscuras", desayuno, desayuno, huso, "ecuador", desayuno, huso].filter((t, i) => t !== "a-oscuras" || tapasVistas[0] === "a-oscuras").join() &&
          planosVistos.includes("respaldo"),
        `${tapasVistas.join(" → ")} · planos ${planosVistos.join(" → ")}`,
      );
      comprobar("y sin que el mundo asome antes de tiempo", desnudo === 0, `${desnudo} lecturas con el mundo a la vista`);
      const orden = DE_LA_APERTURA(temporada, []);
      const dichas = a.registro.map((d) => d.clave);
      let i = -1;
      const fueraDeOrden = orden.filter((c) => {
        const j = dichas.indexOf(c);
        if (j <= i) return true;
        i = j;
        return false;
      });
      comprobar("suena todo, en su orden", fueraDeOrden.length === 0, fueraDeOrden.length ? `fuera de orden o sin decir: ${fueraDeOrden.join(", ")}` : `${orden.length} frases`);
      // La última puede estar aún sonando al abrirse la ventanilla, y entonces su `como` es null: no ha acabado, no es muda.
      const sin = a.registro.filter((d) => d.como !== null && d.como !== "sono").map((d) => d.clave);
      const graves = sin.filter((c) => GRABADAS.has(c));
      comprobar(
        "lo que no suena es solo lo que está sin grabar",
        graves.length === 0,
        graves.length ? `grabadas y mudas: ${graves.join(", ")}` : `sin grabar, y por eso mudas: ${sin.length} de ${a.registro.length}`,
      );
      if (sin.length) console.log(`  sin grabar: ${sin.join(" · ")}`);
      comprobar(
        "la frase de Idaira que llevaba tiempo muda, la primera",
        dichas[0] === "inicio.tripulacion.pasaje.cerca.despertar",
        `${a.registro[0]?.clave} (${a.registro[0]?.como})`,
      );
      comprobar("y no sale el ⏩ mientras dura", !(a.adelanto?.pulsado > 0), `pulsado ${a.adelanto?.pulsado}`);
      await pausa(1500);
      await foto(page, "1-ventanilla");
    }
    if (SOLO_APERTURA) {
      comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 4).join(" · "));
      return;
    }

    // ── El vuelo entero ──────────────────────────────────────────────────
    // Para mirar la llegada sin esperar el crucero; las comprobaciones del ⏩ siguen valiendo.
    if (process.env.OGA_PRISA) await page.evaluate((v) => globalThis.__oga.acelerar(v), Number(process.env.OGA_PRISA));
    const pared0 = Date.now();
    const adelanto = { pulsadas: 0, corrio: false, enLaLlegada: null, botonTrasLaLlegada: 0, pulsaTras: null, corrioTras: false };
    const tramosVistos = [];
    let ultimo = uno;
    let trazaEn = 0;
    let fotoFinal = false;
    let fotoCorta = false;
    let fotoRodando = false;
    let tocado = null;
    let flaps = false;
    const fotosDeLoNombrado = new Set();
    let seParo = null;
    let alLlegar = null;
    let lecturasDeVelocidad = 0;
    let loPeor = null;
    for (;;) {
      const l = await leer(page);
      ultimo = l;
      const ad = l.adelanto;
      const tramo = l.tripulacion?.tramo ?? "?";
      if (tramosVistos.at(-1)?.tramo !== tramo)
        tramosVistos.push({ tramo, pared: (Date.now() - pared0) / 1000, hora: l.salto.hora, y: l.y });
      if (!seParo && tramo !== "apagado" && (!l.motor || l.sinMotor))
        seParo = { hora: l.salto.hora, falta: l.faltaParaTocar, tramo, kilos: l.combustible.kilos };
      // Lo último antes de apagar: al apagar en el campo de llegada se reposta para la vuelta. Ver `repostar`.
      if (tramo !== "apagado") alLlegar = l.combustible.kilos;
      // Solo en lo que lleva el gas: en la recogida sale con la altura, y lo que se pierde ahí es de la toma.
      if (!l.enTierra && (tramo === "bajada" || tramo === "final") && l.manos && l.faltaParaTocar < 25_000) {
        lecturasDeVelocidad++;
        const margen = l.velocidad - l.manos.velocidad;
        if (!loPeor || margen < loPeor.margen)
          loPeor = { margen, velocidad: l.velocidad, pedida: l.manos.velocidad, falta: l.faltaParaTocar };
      }
      if (Date.now() - trazaEn > 15_000) {
        trazaEn = Date.now();
        console.log(
          `  · ${((Date.now() - pared0) / 1000).toFixed(0).padStart(4)} s · ${(l.salto.hora / 3600).toFixed(3)} h · ${tramo} · ${l.fase} · FL${(l.y / 30.48).toFixed(0)} · ${(l.velocidad / 0.5144).toFixed(0)} kt · VS ${(l.vertical / 0.00508).toFixed(0)} fpm · falta ${((l.faltaParaTocar ?? 0) / 1000).toFixed(1)} km · ${l.momento} · gas ${l.gas.toFixed(2)} pide ${((l.manos?.velocidad ?? 0) / 0.5144).toFixed(0)} kt · flaps ${l.flaps.toFixed(2)} tren ${l.tren.toFixed(1)} · ⏩ ${ad?.sale ? "sale" : "—"}${ad?.puesto ? " puesto" : ""}${ad?.adelantando ? " corre" : ""} · plano ${l.plano} · ${l.linea ?? ""}`,
        );
      }
      // El botón, con el dedo de verdad, en cuanto sale.
      if (ad?.sale && !ad.puesto && adelanto.pulsadas === 0) {
        await page.locator('[data-hud="adelantar"]').click({ timeout: 5000 }).catch(() => page.evaluate(() => document.querySelector('[data-hud="adelantar"]')?.click()));
        adelanto.pulsadas++;
      }
      if (ad?.adelantando) adelanto.corrio = true;
      if (l.dichos.includes("bajada") && adelanto.cartelAlBajar === undefined && Date.now() - (adelanto.bajadaEn ??= Date.now()) > 8000)
        adelanto.cartelAlBajar = l.cartel;
      if (ad?.llegada != null && !adelanto.enLaLlegada) {
        adelanto.enLaLlegada = { y: l.y, seApagoSolo: ad.seApagoSolo, puesto: ad.puesto, falta: l.faltaParaTocar, pared: Date.now() };
        // Desde aquí, el reloj de los bancos: lo que queda es a su paso para quien juega, y son veinte minutos.
        await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
        console.log(`  la llegada a FL${(l.y / 30.48).toFixed(0)}, ⏩ se apagó solo ${ad.seApagoSolo}; reloj de los bancos ×${VECES}`);
      }
      if (adelanto.enLaLlegada && Date.now() - adelanto.enLaLlegada.pared > 2500) {
        if (l.boton?.visible || ad?.sale || ad?.puesto) adelanto.botonTrasLaLlegada++;
        if (ad?.adelantando) adelanto.corrioTras = true;
      }
      for (const n of l.nombrados) {
        if (fotosDeLoNombrado.has(n.sitio)) continue;
        fotosDeLoNombrado.add(n.sitio);
        await foto(page, `nombra-${n.sitio.replace(":", "-")}`);
      }
      if (!flaps && l.flaps > 0.2) {
        flaps = true;
        await foto(page, "3-flaps");
      }
      if (!fotoCorta && l.enLaFinal && l.altura < 300) {
        fotoCorta = true;
        await foto(page, "4-final");
      }
      if (!fotoFinal && adelanto.corrio && l.salto.hora > entrada + 900) {
        fotoFinal = true;
        await foto(page, "2-bajando");
      }
      if (l.tripulacion?.tocado && !tocado) {
        tocado = { t: Date.now(), lectura: l };
        await foto(page, "5-toma");
      }
      if (!fotoRodando && tramo === "al-puesto") {
        fotoRodando = true;
        await foto(page, "6-rodando");
      }
      if (l.momento === "fin" && l.puedeSeguir) break;
      if (l.percance) break;
      if (Date.now() - pared0 > TOPE) break;
      await pausa(400);
    }
    const l = ultimo;
    await foto(page, "7-puesto");
    await page.evaluate(() => globalThis.__oga.acelerar(1));
    console.log(`  tramos: ${tramosVistos.map((t) => `${t.tramo}@${t.pared.toFixed(0)}s`).join(" → ")}`);

    // ── El ⏩ ─────────────────────────────────────────────────────────────
    comprobar(
      "el ⏩ se pone con el botón, y corre",
      adelanto.pulsadas === 1 && adelanto.corrio,
      `pulsado ${adelanto.pulsadas} · corrió ${adelanto.corrio}`,
    );
    const ll = adelanto.enLaLlegada;
    comprobar(
      "se apaga solo al llegar a los diez mil pies",
      !!ll && ll.seApagoSolo && !ll.puesto && (ll.y < DIEZ_MIL_PIES + 60 * PIE || (ll.falta ?? Infinity) < 28_000),
      ll ? `a ${(ll.y / PIE).toFixed(0)} ft · faltando ${((ll.falta ?? 0) / 1000).toFixed(1)} km · se apagó solo ${ll.seApagoSolo}` : "no llegó",
    );
    comprobar(
      "y desde ahí no vuelve: ×1 para quien juega, sin botón",
      !!ll && adelanto.botonTrasLaLlegada === 0 && !adelanto.corrioTras,
      `el botón a la vista ${adelanto.botonTrasLaLlegada} veces · corrió después ${adelanto.corrioTras}`,
    );

    // ── La toma ───────────────────────────────────────────────────────────
    const t = l.tripulacion;
    const ut = l.ultimaToma;
    comprobar(
      "toca dentro de la pista, a menos de tres metros por segundo",
      !!t?.tocado && (t.caidaAlTocar ?? Infinity) < 3 && !l.percance && !!tocado && tocado.lectura.enPista,
      t?.tocado
        ? `${t.caidaAlTocar?.toFixed(2)} m/s · «${ut?.veredicto}» a ${ut?.pasado?.toFixed(0)} m del umbral · a ${Math.abs(tocado?.lectura.lado ?? NaN).toFixed(1)} m del eje · percance ${l.percance ?? "ninguno"}`
        : `no se tocó · ${l.percance ?? ""}`,
    );
    comprobar(
      "llega al puesto, con los motores parados",
      t?.tramo === "apagado" && l.motor === false && l.enTierra,
      `${t?.tramo} · ${l.fase} · motor ${l.motor}`,
    );
    /*
     * **Lo que hay en la tarjeta al llegar**: si el mundo de antes se quedara, aquí se
     * sumaría. El mismo número sale con el tercero suelto, que es la referencia. Antes y
     * después de cambiar no se compara: three.js cuenta lo que ya se ha pintado, y a
     * cuarenta mil pies sobre el mar es poco.
     */
    console.log(`  en la tarjeta al llegar: geometrías ${l.coste.geometrias} · texturas ${l.coste.texturas}`);
    const reserva = l.combustible.reserva;
    const alTocar = tocado?.lectura.combustible.kilos ?? 0;
    comprobar(
      "con los motores en marcha en todo el vuelo, y por encima de la reserva al tocar y al llegar al puesto",
      !seParo && alTocar > reserva && (alLlegar ?? 0) > reserva,
      `al tocar ${alTocar.toFixed(0)} kg · antes de apagar ${(alLlegar ?? 0).toFixed(0)} kg · reserva ${reserva.toFixed(0)} kg · ${
        seParo ? `parados en ${seParo.tramo} a las ${(seParo.hora / 3600).toFixed(3)} h, faltando ${(seParo.falta / 1000).toFixed(1)} km, con ${seParo.kilos.toFixed(0)} kg` : "sin pararse"
      }`,
    );
    // Veinte lecturas como poco: una comprobación que apenas ha mirado no ha comprobado nada.
    comprobar(
      "desde 25 km hasta la recogida, la velocidad no baja de la pedida menos 10 kt",
      lecturasDeVelocidad >= 20 && !!loPeor && loPeor.margen > -10 * 0.5144,
      loPeor
        ? `lo peor, ${(loPeor.margen / 0.5144).toFixed(1)} kt: ${(loPeor.velocidad / 0.5144).toFixed(0)} pidiendo ${(loPeor.pedida / 0.5144).toFixed(0)} a ${(loPeor.falta / 1000).toFixed(1)} km · ${lecturasDeVelocidad} lecturas`
        : `${lecturasDeVelocidad} lecturas`,
    );
    const recogida = await page.evaluate(() => globalThis.__oga.inicio().recogida?.muestras ?? []);
    const alRecoger = recogida.find((m) => m.tramo === "recogida");
    const posado = recogida.find((m) => m.enTierra);
    console.log(
      `  la recogida: ${alRecoger ? (alRecoger.velocidad / 0.5144).toFixed(0) : "?"} kt al empezar · ${posado ? (posado.velocidad / 0.5144).toFixed(0) : "?"} kt al tocar`,
    );
    comprobar(
      "y el guion acaba: se puede volver",
      l.momento === "fin" && l.puedeSeguir,
      `${l.momento} · dichos ${l.dichos.join(", ")} · saltados ${l.saltados.join(", ") || "ninguno"}`,
    );

    // ── Las voces ─────────────────────────────────────────────────────────
    const registro = l.registro;
    let pisadas = 0;
    for (let k = 1; k < registro.length; k++) if (registro[k].desde < (registro[k - 1].hasta ?? Infinity) - 1e-6) pisadas++;
    const queSono = registro.filter((d) => d.como === "sono").length;
    comprobar(
      "nunca suenan dos voces a la vez",
      registro.length >= 20 && pisadas === 0 && registro.every((d) => !d.cortada),
      `${registro.length} frases, ${queSono} sonadas · ${pisadas} pisadas · ${registro.filter((d) => d.cortada).length} cortadas`,
    );
    console.log(`  lo dicho: ${registro.map((d) => `${d.clave}(${d.como})`).join(" · ")}`);
    // ── Lo de la ventanilla, ya abierta ──────────────────────────────────
    const lasDichas = registro.map((d) => d.clave);
    const delAnuncio = registro.find((d) => d.clave === "comandante.largo.anuncio");
    comprobar(
      "el anuncio de la comandante, y después los cinturones, los oídos y prepararse para aterrizar",
      !!delAnuncio &&
        ["comandante.largo.anuncio", "tripulacion.cinturones", "inicio.tripulacion.pasaje.cerca.largo.oidos", "comandante.aproximacion"].every(
          (c, k, t) => lasDichas.includes(c) && (k === 0 || lasDichas.indexOf(t[k - 1]) < lasDichas.indexOf(c)),
        ),
      lasDichas.filter((c) => /largo\.anuncio|cinturones|largo\.oidos|aproximacion/.test(c)).join(" → "),
    );
    comprobar(
      "el cartel se enciende al bajar",
      adelanto.cartelAlBajar === true,
      `el cartel a ${adelanto.cartelAlBajar ?? "?"}`,
    );
    const solAlAcabar = ruta.solEnElVuelo(perfil, l.salto.hora);
    const nombro = l.nombrados.map((n) => `${n.sitio}(${n.como}${n.lado ? `, ${n.lado}` : ""})`);
    console.log(`  lo que Ara nombró: ${nombro.join(" · ") || "nada"} · charlas ${l.charlas.join(", ") || "ninguna"}`);
    comprobar(
      "lo que nombra Ara, solo por su cristal",
      l.nombrados.every((n) => n.como === "ventanilla" && (n.lado === null || n.lado === "izquierda")),
      nombro.join(" · ") || "nada: hoy no se veía por su lado",
    );
    comprobar(
      "y de noche cerrada, ni el río ni el Chaco",
      solAlAcabar.deNoche ? !l.charlas.includes("rio") && !l.charlas.includes("chaco") : true,
      `el sol al acabar a ${((solAlAcabar.altura * 180) / Math.PI).toFixed(0)}°`,
    );
    // Con la 02 y de día queda todo de su lado: si aquí no nombra nada, es que lo que mira no ve.
    if (VIENTO.startsWith("020") && !solAlAcabar.deNoche)
      comprobar(
        "y con la 02 y de día, nombra el río y Asunción, y el Chaco si llega a verse",
        ["rio", "asuncion"].every((c) => l.charlas.includes(c)),
        l.charlas.join(", "),
      );
    const horaFinal = `comandante.largo.llegada.${perfil.horario.temporada}`;
    comprobar("la hora de allí al llegar, la de hoy", lasDichas.includes(horaFinal), horaFinal);
    comprobar(
      "y Ara dice que llegó, y no a La Palma",
      lasDichas.includes("inicio.ara.pasaje.largo.llegamos") && !lasDichas.includes("inicio.ara.pasaje.fin"),
      "",
    );
    const ajenas = l.habladas.filter((h) => !/ (inicio\.|comandante\.|tripulacion\.)/.test(h));
    comprobar(
      "ni otra voz que no sea de la escena, ni la de la máquina",
      ajenas.length === 0 && l.maquina.length === 0,
      `boca: ${ajenas.slice(0, 3).join(" · ") || "nada ajeno"} · máquina: ${l.maquina.slice(0, 3).join(" · ") || "nada"}`,
    );
    comprobar("Ara no se duerme en este capítulo", l.siestas.length === 0, `${l.siestas.length} siestas`);
    if (CAPITULO === "2") {
      const vistos = await page.evaluate(() => globalThis.__asomoTrasElSalto);
      comprobar(
        "y al caer del salto, el mundo no asoma con la siesta yéndose",
        vistos.fotogramas > 30 && vistos.maximo < 0.01,
        `lo más que asomó: ${(vistos.maximo * 100).toFixed(1)} % en ${vistos.fotogramas} fotogramas`,
      );
    }
    comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 4).join(" · "));
    if (avisos.length) console.log(`  avisos de consola: ${avisos.length}; el primero: ${avisos[0]}`);
  } catch (e) {
    comprobar("el capítulo", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

/**
 * Una ficha de «¿A qué jugás?», con el dedo: abre su capítulo, sin obligar a leer. La de la
 * noche es lo único que la abre fuera de desarrollo, así que aquí no se le da `?capitulo=`.
 */
async function laFicha(cual) {
  const LA_ESPERADA = cual === "noche" ? { nombre: "de cruzar el mar de noche", mundo: "tenerife-norte", hora: ruta.entradaDeLaNoche(perfil) } : { nombre: "de llegar a Asunción", mundo: "pettirossi", hora: ruta.entradaDeLaLlegada(perfil) };
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 800 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  // Como en los otros bancos del menú: sin el pack de Ara, un piloto nuevo va al hangar y no a la primera experiencia.
  await page.route("**/data/voces/ara/manifiesto.json", (r) => r.fulfill({ status: 404, body: "" }));
  try {
    await page.goto(`${BASE}/?hora=12&fecha=${FECHA}`);
    await page.click("[data-nuevo]", { timeout: 120_000 });
    await page.click("[data-crear]");
    await page.waitForSelector('[data-pantalla="que"]', { timeout: 120_000 });
    await page.click('[data-pantalla="que"]');
    const selector = `[data-inicio-modo="${cual}"]`;
    await page.waitForSelector(selector, { timeout: 20_000 });
    const ficha = await page.evaluate((sel) => {
      const b = document.querySelector(sel);
      const c = b.getBoundingClientRect();
      return { alto: c.height, ancho: c.width, dibujo: !!b.querySelector("svg"), nombre: b.querySelector(".ficha__nombre")?.textContent?.trim() };
    }, selector);
    comprobar(`la ficha ${LA_ESPERADA.nombre}, con su dibujo y su nombre`, ficha.dibujo && ficha.alto >= 44 && !!ficha.nombre, `«${ficha.nombre}» ${Math.round(ficha.ancho)} × ${Math.round(ficha.alto)} px`);
    if (FOTOS) await page.screenshot({ path: `${FOTOS}/inicio-4-menu-${cual}.png` });
    await page.click(selector);
    await page.waitForFunction(() => globalThis.__oga?.inicio?.()?.estado && globalThis.__oga.salto?.()?.hora != null, null, { timeout: 240_000 });
    const abre = await page.evaluate(() => ({ escena: globalThis.__oga.inicio().escena, avion: globalThis.__oga.avion().id, mundo: globalThis.__oga.salto().mundo, hora: globalThis.__oga.salto().hora, url: location.search }));
    comprobar(
      "y abre su capítulo, a su hora",
      abre.escena === "largo" && abre.avion === "jaz-110" && abre.mundo === LA_ESPERADA.mundo && Math.abs(abre.hora - LA_ESPERADA.hora) < 60 && !abre.url.includes("capitulo"),
      `${abre.escena} · ${abre.avion} · ${abre.mundo} · ${(abre.hora / 3600).toFixed(3)} h · dirección «${abre.url}»`,
    );
    comprobar("sin errores de consola, desde el menú", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("la ficha", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

/**
 * **La red de la noche**: sin el mundo de la llegada no se puede caer en la llegada, y una
 * espera sin salida se queda colgada. Se recarga en el capítulo 3, que sí baja lo suyo.
 */
async function laRedDeLaNoche() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  try {
    await page.goto(`${BASE}/?inicio=4&capitulo=2&fecha=${FECHA}&viento=${VIENTO}`);
    await page.bringToFront();
    await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
    /*
     * No contesta nunca, que es lo que hace una red caída. Ya con el juego arrancado, como en
     * `verificar-salto.mjs`: interceptar pasa por aquí cada petición, y en desarrollo son miles.
     */
    const elMundo = /\/data\/(terrain|ortho)\/pettirossi[^/]*\.(bin|jpg)/;
    await page.route(elMundo, () => {});
    await page.keyboard.press("ShiftLeft");
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    await page.waitForFunction(() => globalThis.__oga.inicio().estado?.dichos?.includes("ventanilla"), null, { timeout: 120_000 });
    await page.evaluate(() => globalThis.__oga.acelerar(8));
    await page.waitForFunction(() => globalThis.__oga.salto().enCurso !== null, null, { timeout: 600_000 });
    const pedido = Date.now();
    // Con la noche en el mapa por delante: la red de veinte segundos ya pasó cuando acaba.
    await page.waitForURL(/capitulo=3/, { timeout: 120_000, waitUntil: "commit" });
    const pared = (Date.now() - pedido) / 1000;
    // Al recargar, ya sí contesta: lo que se prueba es que suelta, no una red que siga caída.
    await page.unroute(elMundo);
    comprobar(
      "sin el mundo de la llegada, pasada la red y acabada la noche, suelta y se abre el capítulo 3",
      pared >= 19 && pared < 70,
      `a los ${pared.toFixed(1)} s de pared · ${page.url().replace(BASE, "")}`,
    );
    await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
    const abierto = await page.evaluate(() => ({ mundo: globalThis.__oga.salto().mundo, hora: globalThis.__oga.salto().hora, escena: globalThis.__oga.inicio().escena }));
    const entrada = ruta.entradaDeLaLlegada(perfil);
    comprobar(
      "y es el de siempre: en su mundo, a su hora",
      abierto.mundo === "pettirossi" && abierto.escena === "largo" && Math.abs(abierto.hora - entrada) < 60,
      `${abierto.mundo} · ${(abierto.hora / 3600).toFixed(3)} h (cuenta: ${(entrada / 3600).toFixed(3)} h)`,
    );
    comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("la red de la noche", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

/**
 * **La red de lo nuevo**: si la lámina del medio despertar no contesta nunca, la noche sigue
 * igual. Lo que se queda sin dibujo se queda a oscuras, y se oye lo mismo. Lo de las voces que
 * no contestan lo prueba `guion-noche-sobre-el-mar.test.ts`, y se suelta por el tope.
 */
async function laRedDelMedioDespertar() {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 720 }, locale: "es-PY" });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  try {
    // El fichero y no su módulo, que en desarrollo se importa con `?url`: sin él no arranca nada.
    await page.route(/medio-despertar\.webp$/, () => {});
    await page.goto(`${BASE}/?inicio=4&capitulo=2&fecha=${FECHA}&viento=${VIENTO}`, { waitUntil: "domcontentloaded" });
    await page.bringToFront();
    await page.waitForFunction(() => globalThis.__oga?.salto?.().hora != null, null, { timeout: 240_000 });
    await page.keyboard.press("ShiftLeft");
    await page.evaluate(() => globalThis.__ogaEmpezar?.());
    await page.waitForFunction(() => globalThis.__oga.inicio().estado?.dichos?.includes("ventanilla"), null, { timeout: 120_000 });
    await page.evaluate(() => globalThis.__oga.acelerar(8));
    await page.waitForFunction(() => globalThis.__oga.salto().enCurso !== null, null, { timeout: 600_000 });
    const pedido = Date.now();
    await page.waitForFunction(() => globalThis.__oga.salto().hechos.length > 0, null, { timeout: 120_000 });
    const pared = (Date.now() - pedido) / 1000;
    const l = await leer(page);
    const alCaer = l.salto.hechos[0];
    comprobar(
      "con la lámina que no contesta, nadie se queda en la siesta: la noche acaba a su hora y cae en el capítulo 3",
      pared < 60 && alCaer.mundo === "pettirossi" && !alCaer.sinElMundo,
      `${pared.toFixed(1)} s de pared · ${alCaer.mundo} · ${l.escena}`,
    );
    comprobar("sin errores de consola", errores.length === 0, errores.slice(0, 3).join(" · "));
  } catch (e) {
    comprobar("la red del medio despertar", false, `${String(e).slice(0, 300)} · ${errores.slice(0, 2).join(" · ")}`);
  } finally {
    await ctx.close();
  }
}

try {
  if (process.env.OGA_MENU) {
    await laFicha("noche");
    await laFicha("largo");
  }
  else if (process.env.OGA_RED === "noche") await laRedDelMedioDespertar();
  else if (process.env.OGA_RED) await laRedDeLaNoche();
  else if (CAPITULO === "1") await laNocheDeMadrid();
  else await elCapitulo();
} finally {
  await navegador.close();
  await server.close();
}

const bien = resultados.filter((r) => r.ok).length;
console.log(`\n  ${bien} de ${resultados.length}\n`);
process.exit(bien === resultados.length ? 0 : 1);
