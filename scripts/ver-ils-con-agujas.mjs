/**
 * **«Aterrizar con las agujas», volado en el juego** (#51, ADR 0030, enmienda
 * H26i): Fuerteventura, la avioneta en el peldaño de cabina y el ILS de la 01,
 * IFV, con el alisio del sitio.
 *
 *   node scripts/ver-ils-con-agujas.mjs <carpeta>
 *
 * El piloto de banco hace lo que pide la instructora, con el automático en el
 * rumbo y la altura —lo que haría quien sostiene el avión— y el gas a mano:
 *
 * - corta el localizador a treinta grados mientras la aguja está a tope; en
 *   cuanto se despega, vira hacia el eje con el rumbo de la final más doce
 *   veces la aguja y lo que ve que el viento lo deriva;
 * - nivelado hasta que la aguja de la senda llega al centro desde abajo; ahí,
 *   flaps, la de aproximación y a bajar con la senda: la altura pedida, la de
 *   la senda que dice la aguja, y su ritmo;
 * - en los mínimos, a tierra; con `OGA_FUERA=1`, desde ochocientos pies va
 *   apartado un punto y medio largo del localizador, y en los mínimos se va
 *   al aire, que es lo que pide el ejercicio.
 *
 * Capturas, la página entera y el cuadro de cerca: la salida (el localizador a
 * tope y la bandera de la senda), la aguja despegándose, en el localizador con
 * la senda arriba —desviada—, en la final con las dos en cruz, los mínimos y
 * el final. El puerto, `OGA_PUERTO`; el reloj, por `OGA_VECES` (cuatro) hasta
 * los mil pies. Otro campo y otro avión, `OGA_ESCENARIO` y `OGA_AVION`.
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync } from "node:fs";
import { baseDe } from "./servidor.mjs";

const SALIDA = process.argv[2] ?? "capturas-ils";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const ESCENARIO = process.env.OGA_ESCENARIO ?? "fuerteventura";
const VECES = Number(process.env.OGA_VECES ?? 4);
const FUERA = process.env.OGA_FUERA === "1";
// El viento a mano, «grados/nudos» como `?viento=`: `0/0` es la calma. Sin él, el del sitio.
const VIENTO = process.env.OGA_VIENTO ?? "";
const NOMBRE = `${ESCENARIO}-${AVION}${FUERA ? "-fuera" : ""}${VIENTO ? `-viento-${VIENTO.replace("/", "-")}` : ""}`;

mkdirSync(SALIDA, { recursive: true });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const GRADO = Math.PI / 180;
const PIE = 0.3048;
const PIE_EN_LA_PAGINA = PIE;
const centrado = (g) => ((((g + 180) % 360) + 360) % 360) - 180;

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

/** Lo que dice el ejercicio, lo que marcan las dos agujas y lo que pinta el HSI. */
const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    const radio = j.radioAlDia();
    const a = j.avionParaLaRadio();
    const nav = a ? radio.leer(a, j.elevacionDeLaEstacion).nav : null;
    const vis = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute("visibility") !== "hidden" && getComputedStyle(el).visibility !== "hidden" : false;
    };
    const rombo = document.querySelector('[data-radio="senda-rombo"]');
    return {
      x: s.position.x,
      y: s.position.y,
      z: s.position.z,
      rumbo: s.heading,
      camino: Math.atan2(s.velocity.x, -s.velocity.z),
      gs: Math.hypot(s.velocity.x, s.velocity.z),
      indicada: s.airspeed,
      enElSuelo: s.onGround,
      ej: o.ilsConAgujas(),
      navMhz: radio.navMhz,
      curso: radio.curso,
      navId: nav?.lectura.emisora?.estacion.id ?? null,
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      textoDeLaTarjeta: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      hsi: {
        escala: vis('[data-radio="senda"]'),
        bandera: vis('[data-radio="senda-bandera"]'),
        rombo: rombo ? rombo.getAttribute("visibility") !== "hidden" : false,
        donde: rombo?.getAttribute("transform") ?? "",
      },
      vref: j.aircraft.approachSpeed,
      circuito: j.aircraft.velocidadDeCircuito,
    };
  });

/**
 * **El piloto de banco**, dentro de la página y en cada fotograma
 * (`pilotar`), con los mandos de quien juega y mirando solo las dos agujas,
 * como en una nube:
 *
 * - **lateral**: a tope, el rumbo de la cortada; despegada la aguja, el de la
 *   final más doce veces la aguja en grados —a tope, los treinta de la
 *   cortada—, menos lo que ve que el viento lo deriva y lo poco que queda; el
 *   alabeo hacia ese rumbo, veinte grados como mucho;
 * - **vertical**: nivelado en la altura de la salida hasta que la aguja de la
 *   senda llega al centro desde abajo; ahí, flaps y a bajar al ritmo de la
 *   senda con su velocidad sobre el suelo, corrigiendo lo que marque la aguja;
 *   por debajo de los mínimos se mira afuera, se sigue al ritmo de la senda y
 *   a cinco metros se recoge;
 * - **el gas**, a la velocidad del circuito y luego a la de aproximación;
 * - con `fuera`, apartado un punto y siete del localizador desde ochocientos
 *   pies; y si en los mínimos se pide la frustrada, gas a fondo y a subir.
 */
const ponerElPiloto = (page, datos) =>
  page.evaluate((d) => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const G = Math.PI / 180;
    const c0 = (g) => ((((g + 180) % 360) + 360) % 360) - 180;
    const b = { despegada: null, ajuste: 0, flaps: false, alAire: false, recoge: false, antes: null };
    globalThis.__ilsBanco = b;
    o.pilotar((c) => {
      const s = o.estado();
      const ej = o.ilsConAgujas();
      const a = j.avionParaLaRadio();
      const nav = a ? j.radioAlDia().leer(a, j.elevacionDeLaEstacion).nav?.lectura : null;
      const loc = nav?.desviacion ?? null;
      const senda = nav?.senda && !nav.senda.bandera ? nav.senda.puntos : null;
      const h = s.position.y - j.terrain.runwayElevation;
      const gs = Math.hypot(s.velocity.x, s.velocity.z);
      const rumbo = (s.heading / G + 360) % 360;
      const camino = (Math.atan2(s.velocity.x, -s.velocity.z) / G + 360) % 360;
      if (ej?.fase === "frustrando" || (d.fuera && ej?.fase === "cerrada" && ej.cierre === "frustrada")) b.alAire = true;
      // Lateral.
      let quiero = d.cortada;
      if (loc !== null && (Math.abs(loc) < 2.5 || b.despegada !== null)) {
        b.despegada ??= loc;
        const apartado = d.fuera && h < 800 * 0.3048 ? 1.7 * 1.25 * Math.sign(b.despegada || 1) : 0;
        const grados = loc - apartado;
        if (Math.abs(grados) < 0.8) b.ajuste = Math.max(-8, Math.min(8, b.ajuste + 0.002 * grados));
        quiero = d.rf + Math.max(-30, Math.min(30, 12 * grados)) - c0(camino - rumbo) + b.ajuste;
      }
      const e = c0(quiero - rumbo) * G;
      const alabeo = Math.max(-20 * G, Math.min(20 * G, e * 1.5));
      c.aileron = Math.max(-0.35, Math.min(0.35, (alabeo - o.actitud().alabeo) * 1.6));
      c.rudder = 0;
      // Vertical y gas.
      let vs = 0;
      let quiereKt = d.circuito;
      if (b.alAire) {
        vs = s.airspeed < d.vref * 1.2 ? 0 : 5;
        c.throttle = 1;
      } else if (ej && (ej.fase === "bajando" || ej.fase === "pista" || ej.fase === "frustrando" || ej.fase === "cerrada")) {
        if (!b.flaps) {
          b.flaps = true;
          o.pedirFlaps(1);
          // Y el tren, en el que lo lleva dentro: la senda capturada es donde se configura.
          o.pedirTren(true);
        }
        quiereKt = d.vref * 1.25;
        const ritmo = -gs * Math.tan(d.ang * G);
        if (h > 60 && senda !== null) vs = ritmo - 1.2 * senda;
        else if (h > 5 && !b.recoge) vs = ritmo;
        else {
          b.recoge = true;
          vs = -0.6;
          quiereKt = 0;
        }
      } else vs = Math.max(-3, Math.min(3, (d.alto0 - s.position.y) * 0.08));
      // Con lo que se va sumando: el morro que sostiene la velocidad no es cero, y solo con la proporcional se queda corto.
      const ahora = performance.now();
      const dt = b.antes === null ? 0 : Math.min(0.1, (ahora - b.antes) / 1000);
      b.antes = ahora;
      b.integral = Math.max(-0.2, Math.min(0.2, (b.integral ?? 0) + (vs - s.verticalSpeed) * 0.02 * dt));
      c.elevator = Math.max(-0.3, Math.min(0.3, (vs - s.verticalSpeed) * 0.08 + b.integral));
      if (!b.alAire) c.throttle = quiereKt === 0 ? 0 : Math.max(0, Math.min(1, 0.45 + (quiereKt - s.airspeed) * 0.05));
      if (s.onGround) {
        c.throttle = 0;
        c.elevator = 0;
      }
    });
  }, datos);

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(
    `${BASE}/?escenario=${ESCENARIO}&hora=12&tramo=taguato-ruvicha&avion=${AVION}&ejercicio=ils${VIENTO ? `&viento=${VIENTO}` : ""}`,
  );
  await page.waitForFunction(() => globalThis.__oga?.ilsConAgujas?.()?.colocacion != null, null, { timeout: 120000 });
  // A la salida, antes de que la presentación acabe: con el reloj normal, son sus catorce segundos.
  await pausa(2000);
  const foto = async (n) => {
    const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
    await page.screenshot({ path: ruta });
    const cuadro = page.locator(".cuadro").first();
    if (await cuadro.count()) await cuadro.screenshot({ path: `${SALIDA}/${NOMBRE}-${n}-cuadro.png` }).catch(() => {});
    console.log(`    foto: ${ruta}`);
  };
  const tarjetaGrafica = await page.evaluate(() => {
    const g = document.createElement("canvas").getContext("webgl");
    const i = g?.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
  });
  console.log(`    tarjeta: ${tarjetaGrafica}`);

  let r = await leer(page);
  const ant = r.ej.antenas;
  const RF = ant.rumboFinal;
  const ANG = ant.angulo;
  const lejosDeLaSenda = () => Math.hypot(r.x - ant.senda.x, r.z - ant.senda.z);
  comprobar(
    "empieza en el aire, a doce millas de la senda, por debajo de ella",
    r.ej.altura > 300 && Math.abs(lejosDeLaSenda() / 1852 - 12) < 0.8 && r.ej.altura < Math.tan(ANG * GRADO) * lejosDeLaSenda(),
    `${(lejosDeLaSenda() / 1852).toFixed(1)} NM, ${Math.round(r.ej.altura)} m sobre la pista (${Math.round(r.ej.altura / PIE)} ft), ${r.ej.ils.rotulo}`,
  );
  comprobar(
    "la NAV con el ILS y el OBS en el curso de la final",
    r.navId === r.ej.ils.id && Math.abs(r.navMhz - r.ej.ils.mhz) < 0.001,
    `${r.navId} ${r.navMhz?.toFixed(2)}, OBS ${r.curso}`,
  );
  comprobar(
    "el localizador a tope y la bandera de la senda, que está a más de diez millas",
    Math.abs(r.ej.agujas?.loc ?? 0) >= 2 && r.ej.agujas?.bandera === true && r.hsi.escala && r.hsi.bandera && !r.hsi.rombo,
    `loc ${r.ej.agujas?.loc?.toFixed(2)} puntos, senda ${r.ej.agujas?.bandera ? "bandera" : r.ej.agujas?.senda?.toFixed(2)}; HSI ${JSON.stringify(r.hsi)}`,
  );
  const lado = (p) => ((p ?? 0) >= 0 ? "derecha" : "izquierda");
  comprobar(
    "la tarjeta escribe el ILS y dibuja la aguja del lado en que está",
    r.textoDeLaTarjeta.includes(r.ej.ils.rotulo) && r.tarjeta === `ils-a-la-${lado(r.ej.agujas?.loc)}`,
    `«${r.textoDeLaTarjeta.slice(0, 80)}», ${r.tarjeta}`,
  );
  comprobar(
    "el morro, cortando el localizador a treinta grados",
    Math.abs(Math.abs(centrado(r.rumbo / GRADO - RF)) - 30) < 3,
    `${centrado(r.rumbo / GRADO - RF).toFixed(1)}°`,
  );
  /*
   * El día del ejercicio: en un avión de instrumentos, cubierto a trescientos
   * pies sobre la pista; en uno de reglas visuales, el de siempre del sitio,
   * sin nube baja, que no lleva con qué volar dentro. Ver `elDiaDelIls`.
   */
  const nube = await page.evaluate(() => globalThis.__oga.capaDeNubes());
  const reglas = await page.evaluate(() => globalThis.__oga.juegoParaTrazas().aircraft.reglasDeVuelo);
  const conNube = reglas === "instrumentos";
  const comoEsLaNube = nube
    ? `base ${Math.round(nube.techoM / PIE_EN_LA_PAGINA)} ft, tapadura ${nube.tapadura}, techo de la capa ${Math.round(nube.techo - nube.base)} m más arriba`
    : "sin capa";
  comprobar(
    conNube
      ? "el día del ejercicio, con un avión de instrumentos: cubierto a trescientos pies sobre la pista"
      : "el día del ejercicio, con uno de reglas visuales: sin nube baja",
    conNube
      ? nube && Math.abs(nube.techoM / PIE_EN_LA_PAGINA - 300) < 1 && nube.tapadura >= 1
      : !nube || nube.techoM / PIE_EN_LA_PAGINA >= 1500,
    `${reglas}: ${comoEsLaNube}`,
  );
  await foto("01-salida");

  await ponerElPiloto(page, {
    rf: RF,
    ang: ANG,
    cortada: r.rumbo / GRADO,
    alto0: r.y,
    circuito: r.circuito,
    vref: r.vref,
    fuera: FUERA,
  });
  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);

  let fotoDespegada = false;
  let fotoSendaArriba = false;
  let fotoEnCruz = false;
  let fotoMinimos = false;
  let fotoDentro = false;
  /** Dentro de la nube, a unos trescientos treinta pies; y fuera, en los mínimos, con la pista delante. */
  let dentro = null;
  let enLosMinimosSeVe = null;
  /** Cuánto llevaba dicho la instructora al llegar a los mínimos: lo de después es lo de la frustrada o la toma. */
  let dichoHastaLosMinimos = null;
  const comoSeVe = () =>
    page.evaluate(() => {
      const o = globalThis.__oga;
      const j = o.juegoParaTrazas();
      const s = o.estado();
      const ej = o.ilsConAgujas();
      const c = o.capaDeNubes();
      const umbral = ej?.antenas?.senda;
      const cota = j.terrain.runwayElevation;
      return {
        enLaNube: c?.enLaNube ?? 0,
        // Lo que deja ver la capa del avión a la antena de la senda, al lado del umbral.
        haciaLaPista: umbral ? j.sky.transparenciaEntre({ x: s.position.x, y: s.position.y, z: s.position.z }, { x: umbral.x, y: cota + 2, z: umbral.z }) : null,
        pies: (s.position.y - cota) / 0.3048,
        dicho: (o.dichoTodo().instructor ?? []).length,
      };
    });
  let enElLoc = null;
  let capturada = null;
  let enCruz = null;
  let veces = VECES;
  let peorSenda = 0;
  let peorLoc = 0;
  const fin = Date.now() + 9 * 60000;
  while (Date.now() < fin && r.ej.fase !== "cerrada") {
    r = await leer(page);
    const ag = r.ej.agujas;
    const loc = ag?.loc ?? null;
    const senda = ag && !ag.bandera ? ag.senda : null;
    const h = r.ej.altura;
    if (!fotoDespegada && r.tarjeta?.startsWith("ils-viniendo")) {
      fotoDespegada = true;
      comprobar(
        "la aguja del localizador se despega y la tarjeta la dibuja viniendo de su lado",
        r.tarjeta === `ils-viniendo-de-la-${lado(loc)}`,
        `loc ${loc?.toFixed(2)} puntos, tarjeta ${r.tarjeta}`,
      );
      await foto("02-se-despega");
    }
    if (enElLoc === null && r.ej.fase !== "localizador") {
      enElLoc = { loc, senda, bandera: ag?.bandera, tarjeta: r.tarjeta, nm: lejosDeLaSenda() / 1852 };
    }
    // Desviada: en el localizador, con la senda arriba.
    if (!fotoSendaArriba && r.ej.fase === "senda" && senda !== null && senda < -1) {
      fotoSendaArriba = true;
      comprobar(
        "en el localizador, la senda arriba: la aguja por encima y el rombo del HSI arriba",
        Math.abs(loc ?? 9) < 0.5 && r.hsi.rombo && /translate\(0 -/.test(r.hsi.donde) && r.tarjeta === "ils-senda-arriba",
        `loc ${loc?.toFixed(2)}, senda ${senda.toFixed(2)} puntos, rombo ${r.hsi.donde}, tarjeta ${r.tarjeta}`,
      );
      await foto("03-senda-arriba");
    }
    if (capturada === null && r.ej.fase === "bajando") capturada = { senda, tarjeta: r.tarjeta, nm: lejosDeLaSenda() / 1852 };
    if (r.ej.fase === "bajando" && h < 1000 * PIE && h > 60 && senda !== null && loc !== null) {
      peorSenda = Math.max(peorSenda, Math.abs(senda));
      peorLoc = Math.max(peorLoc, Math.abs(loc));
    }
    if (!fotoEnCruz && r.ej.fase === "bajando" && h < 1000 * PIE && h > 600 * PIE) {
      fotoEnCruz = true;
      enCruz = { loc, senda, hsi: r.hsi, tarjeta: r.tarjeta };
      await foto("04-en-cruz");
    }
    // El reloj, despacio cerca del suelo.
    const quiereVeces = h < 400 * PIE ? 1 : h < 1200 * PIE ? 2 : VECES;
    if (quiereVeces !== veces) {
      veces = quiereVeces;
      await page.evaluate((v) => globalThis.__oga.acelerar(v), veces);
    }
    if (!fotoDentro && r.ej.fase === "bajando" && h < 340 * PIE) {
      fotoDentro = true;
      dentro = await comoSeVe();
      await foto("04b-dentro-de-la-nube");
    }
    if (!fotoMinimos && (r.ej.fase === "pista" || r.ej.fase === "frustrando")) {
      fotoMinimos = true;
      enLosMinimosSeVe = await comoSeVe();
      dichoHastaLosMinimos = enLosMinimosSeVe.dicho;
      await foto("05-minimos");
    }
    await pausa(120);
  }
  await page.evaluate(() => globalThis.__oga.acelerar(1));

  comprobar(
    "establecido en el localizador, con la senda todavía arriba o con su bandera",
    enElLoc && Math.abs(enElLoc.loc ?? 9) < 0.5 && (enElLoc.bandera || (enElLoc.senda ?? 0) < -0.5) && enElLoc.tarjeta === "ils-senda-arriba",
    enElLoc ? `loc ${enElLoc.loc?.toFixed(2)}, senda ${enElLoc.bandera ? "bandera" : enElLoc.senda?.toFixed(2)}, a ${enElLoc.nm.toFixed(1)} NM, tarjeta ${enElLoc.tarjeta}` : "no llegó",
  );
  comprobar(
    "la senda, capturada desde abajo, y la tarjeta con las dos agujas en cruz",
    capturada && Math.abs(capturada.senda ?? 9) < 0.5 && capturada.tarjeta === "ils-en-cruz",
    capturada ? `senda ${capturada.senda?.toFixed(2)} puntos a ${capturada.nm.toFixed(1)} NM, tarjeta ${capturada.tarjeta}` : "no llegó",
  );
  comprobar(
    "en la final, las dos agujas en cruz y el rombo del HSI en el centro",
    enCruz && Math.abs(enCruz.loc ?? 9) < 1 && Math.abs(enCruz.senda ?? 9) < 1 && enCruz.hsi.rombo,
    enCruz ? `loc ${enCruz.loc?.toFixed(2)}, senda ${enCruz.senda?.toFixed(2)} puntos, rombo ${enCruz.hsi.donde}` : "no llegó",
  );
  const m = r.ej.enLosMinimos;
  comprobar(
    FUERA ? "a los mínimos con el localizador fuera de un punto: frustrada" : "a los mínimos, las dos agujas dentro de un punto",
    m && (FUERA ? Math.abs(m.loc) > 1 : Math.abs(m.loc) <= 1 && Math.abs(m.senda) <= 1),
    m ? `loc ${m.loc.toFixed(2)}, senda ${Number.isFinite(m.senda) ? m.senda.toFixed(2) : "sin señal"} puntos; desde mil pies lo peor, loc ${peorLoc.toFixed(2)} y senda ${peorSenda.toFixed(2)}` : "no llegó",
  );
  if (conNube) comprobar(
    "a trescientos treinta pies, dentro de la nube; en los mínimos, fuera, con la pista a la vista",
    dentro && enLosMinimosSeVe && dentro.enLaNube > 0.3 && enLosMinimosSeVe.enLaNube < 0.2 && (enLosMinimosSeVe.haciaLaPista ?? 0) > 0.95,
    dentro && enLosMinimosSeVe
      ? `a ${Math.round(dentro.pies)} ft en la nube ${dentro.enLaNube.toFixed(2)}; a ${Math.round(enLosMinimosSeVe.pies)} ft ${enLosMinimosSeVe.enLaNube.toFixed(2)}, hacia la pista deja ver ${enLosMinimosSeVe.haciaLaPista?.toFixed(2)}`
      : "no llegó",
  );
  comprobar(
    FUERA ? "se fue al aire y el ejercicio cierra con la frustrada" : "aterrizó y el ejercicio cierra con la pista",
    r.ej.cierre === (FUERA ? "frustrada" : "pista"),
    `fase ${r.ej.fase}, cierre ${r.ej.cierre}`,
  );
  const pedido = await page.evaluate(() => {
    const o = globalThis.__oga;
    const sinGrabar = o
      .cantados()
      .map((c) => /^(ejercicio\.[\w.]+): sin grabar/.exec(c)?.[1])
      .filter(Boolean);
    return { dicho: o.dichoTodo(), sinGrabar };
  });
  const delIls = [...new Set([...(pedido.dicho.instructor ?? []), ...pedido.sinGrabar].filter((c) => /^ejercicio\.ils\./.test(c)))];
  const esperado = [
    "ejercicio.ils.antes",
    "ejercicio.ils.aTope",
    "ejercicio.ils.seMueve",
    "ejercicio.ils.enElLocalizador",
    "ejercicio.ils.capturada",
    FUERA ? "ejercicio.ils.frustrada" : "ejercicio.ils.pista",
  ];
  /*
   * En su orden lo que sonó, y entero contando lo que se calló sin voz: con
   * las frases ya grabadas, la presentación —en el primer paso— puede caer
   * antes de que la voz haya cargado y quedarse en «sin grabar, se calla»,
   * que va en otra lista y no sabe de orden. Se dice aparte.
   */
  const sonaron = (pedido.dicho.instructor ?? []).filter((c) => /^ejercicio\.ils\./.test(c));
  const mudas = pedido.sinGrabar.filter((c) => /^ejercicio\.ils\./.test(c));
  comprobar(
    "la instructora lo cuenta por pasos, en su orden",
    [...delIls].sort().join(",") === [...esperado].sort().join(",") &&
      sonaron.join(",") === esperado.filter((c) => sonaron.includes(c)).join(","),
    `${sonaron.join(", ")}${mudas.length ? `; sin voz: ${[...new Set(mudas)].join(", ")}` : ""}`,
  );
  // Un suceso, una voz: los mínimos del ejercicio, y no además los de siempre.
  comprobar(
    "en los mínimos habla el ejercicio y no además el «mirá la pista» de siempre",
    !(pedido.dicho.instructor ?? []).includes("vuelo.minimos"),
    (pedido.dicho.instructor ?? []).filter((c) => /minimos/.test(c)).join(", ") || "nada más",
  );
  const otros = Object.entries(pedido.dicho).flatMap(([quien, claves]) =>
    claves.filter((c) => !/^ejercicio\.ils\./.test(c)).map((c) => `${quien}: ${c}`),
  );
  console.log(`    lo demás que se dijo: ${otros.join(", ") || "nada"}`);
  await pausa(6000);
  await foto("06-final");
  const despues = await page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const yo = j.miIndicativo?.matricula ?? null;
    const alAire = o
      .nombrados()
      .lista.filter((n) => /goAround/.test(n.clave))
      .map((n) => ({ t: Math.round(n.t), clave: n.clave, quien: n.quien, aMi: n.quien === yo }));
    const conPiezas = (o.dichoConPiezas().torre ?? []).filter((d) => /goAround/.test(d.clave));
    return {
      yo,
      alAire,
      conPiezas,
      instructor: o.dichoTodo().instructor ?? [],
      fin: document.querySelector('[data-hud="fin-frase"]')?.textContent ?? "",
      finVisible: !document.querySelector(".fin")?.hidden,
    };
  });
  // La torre manda al aire con el indicativo delante, como en todas sus frases: a quién y cuándo.
  console.log(
    `    la torre, al aire: ${despues.alAire.map((n) => `${n.clave} a ${n.quien}${n.aMi ? " (a mí)" : ""} a los ${n.t} s`).join(", ") || "nadie"}`,
  );
  comprobar(
    "la torre manda al aire a alguien con nombre: el indicativo en el rótulo y en la voz",
    despues.alAire.every((n) => n.quien) && despues.conPiezas.every((d) => d.piezas === null || d.piezas.some((p) => /^fonetico\./.test(p))),
    despues.conPiezas.map((d) => `${d.clave}: ${d.piezas ? d.piezas.join(" ") : "sin grabar"}`).join(" | ") || "no hubo",
  );
  // Un suceso, una voz: desde los mínimos, la fase no repite «andá a la pista» ni «bajá suavecito».
  const trasLosMinimos = dichoHastaLosMinimos === null ? [] : despues.instructor.slice(dichoHastaLosMinimos);
  comprobar(
    "desde los mínimos, la fase no vuelve a decir «andá a la pista» ni la final",
    dichoHastaLosMinimos !== null && !trasLosMinimos.some((c) => c === "vuelo.enVueloAterrizando" || c === "vuelo.final"),
    trasLosMinimos.join(", ") || "nada",
  );
  comprobar(
    "el panel del final, con la frase de cierre del ejercicio",
    despues.finVisible &&
      (FUERA ? /Bien decidido|Good call/.test(despues.fin) : /Aterrizaste con las agujas|You landed on the needles/.test(despues.fin)),
    `«${despues.fin.slice(0, 90)}»`,
  );
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));
  await contexto.close();
} catch (e) {
  console.error(e);
  codigo = 1;
} finally {
  await navegador.close();
  await server.close();
}
const mal = resultados.filter((x) => !x.ok).length;
console.log(`\n${resultados.length - mal}/${resultados.length} bien`);
process.exit(mal || codigo ? 1 : 0);
