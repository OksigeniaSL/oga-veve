/**
 * **La final con viento cruzado, volada en el juego** (#92, H32a; ADR 0031,
 * enmienda H32a): Los Rodeos con el alisio de casa —del 040 a doce nudos,
 * casi doce de costado por la izquierda sobre la 12— y una de las dos
 * técnicas.
 *
 *   node scripts/ver-el-cruzado.mjs <carpeta>
 *
 * El piloto de banco es el de la mesa (`final-con-viento-cruzado.test.ts`),
 * metido en la página con `__oga.pilotar` para que mande en cada fotograma:
 *
 * - `OGA_TECNICA=cangrejo` (lo de siempre): el camino por el eje con el ala y
 *   la bola centrada —el timón automático, o sus pies en Taguato Ruvicha—, y
 *   en la recogida el pie y el morro a la pista;
 * - `OGA_TECNICA=ala-baja`: el morro en el eje con el pie y el camino con el
 *   ala; solo se ofrece en Taguato Ruvicha.
 *
 * Mira que se presente, que el cangrejo medido sea el del triángulo con el
 * viento que sopla, que al tocar el morro esté en la pista, y lo que dibuja y
 * escribe la tarjeta. Capturas **desde fuera**, que es desde donde se
 * distinguen las dos: el avión torcido sobre la raya, o derecho e inclinado.
 * El puerto, `OGA_PUERTO`; el peldaño, `OGA_TRAMO`; el avión, `OGA_AVION`; el
 * reloj, `OGA_VECES` (dos); con `OGA_GPU=1`, con la tarjeta de verdad; con
 * `OGA_TRAZA=1`, la final en renglones: el morro y el camino desde la pista,
 * el ala, el derrape, la verdadera, el viento de costado y lo que pide el
 * triángulo (H32b), y lo del piloto: el gas, la senda y la altura sobre el
 * punto de toma, y lo que baja contra lo que pide (H34a).
 */
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdirSync, readFileSync } from "node:fs";
import { baseDe } from "./servidor.mjs";
import {
  palancaDelReactorEnLaRecogida,
  pideAlPuntoDeToma,
  porLoQueAceleraElReactor,
} from "./recogida-del-reactor.mjs";

const SALIDA = process.argv[2] ?? "capturas-cruzado";
const PUERTO = Number(process.env.OGA_PUERTO ?? 5687);
const AVION = process.env.OGA_AVION ?? "jaz-20";
const TECNICA = process.env.OGA_TECNICA ?? "cangrejo";
const TRAMO = process.env.OGA_TRAMO ?? (TECNICA === "ala-baja" ? "taguato-ruvicha" : "taguato");
const VECES = Number(process.env.OGA_VECES ?? 2);
const CON_GPU = process.env.OGA_GPU === "1";
const NOMBRE = `${TECNICA}-${AVION}-${TRAMO}`;

mkdirSync(SALIDA, { recursive: true });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await createServer({
  root: process.cwd(),
  server: { port: PUERTO, hmr: false, watch: null },
  logLevel: "error",
});
await server.listen();
const BASE = baseDe(server, PUERTO);
const navegador = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: CON_GPU
    ? ["--headless=new", "--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
    : ["--use-gl=angle", "--use-angle=gl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok: !!ok });
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}${detalle ? `  —  ${detalle}` : ""}`);
};

const leer = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    const s = o.estado();
    const r = j.scenario.runway;
    const h = (r.heading * Math.PI) / 180;
    const q = s.orientation;
    return {
      ejercicio: o.cruzado(),
      altura: s.position.y - j.terrain.sampleHeight(s.position.x, s.position.z) - j.aircraft.gearHeight,
      eje: (s.position.x - r.x) * Math.cos(h) + (s.position.z - r.z) * Math.sin(h),
      morro: ((((s.heading - h) * 180) / Math.PI + 540) % 360) - 180,
      ala: (Math.asin(-2 * (q.x * q.y + q.w * q.z)) * 180) / Math.PI,
      enElSuelo: s.onGround,
      camino: ((((Math.atan2(s.velocity.x, -s.velocity.z) - h) * 180) / Math.PI + 540) % 360) - 180,
      derrape: (s.beta * 180) / Math.PI,
      piloto: o.pilotoAutomatico?.() ?? null,
      // La ráfaga que lleva el modelo de vuelo encima del viento del parte: solo para la traza.
      racha: j.flight?.racha ? { x: j.flight.racha.x, z: j.flight.racha.z } : null,
      alabeoPedido: j.input?.controls?.aileron ?? null,
      piePedido: j.input?.controls?.rudder ?? null,
      verdadera: s.airspeed,
      viento: j.vientoAqui?.aire ?? { x: 0, z: 0 },
      pista: r.heading,
      tarjeta: o.tarjeta?.()?.dibujo ?? null,
      delPiloto: globalThis.__trazaDelPiloto ?? null,
      texto: document.querySelector(".senal")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    };
  });

let codigo = 0;
try {
  console.log(`\n${NOMBRE}`);
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false });
  const page = await contexto.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message.slice(0, 200)));
  await page.addInitScript(() => localStorage.setItem("oga-veve:teclas-vistas", "1"));
  await page.goto(`${BASE}/?escenario=tenerife-norte&hora=12&tramo=${TRAMO}&avion=${AVION}&ejercicio=${TECNICA}`);
  await page.waitForFunction(() => globalThis.__oga?.estado?.() != null && globalThis.__oga.cruzado?.() != null, null, {
    timeout: 120000,
  });
  await pausa(2500);
  await page.evaluate(() => globalThis.__oga.ponerVista("chase"));
  /*
   * **Cada tarjeta que se pide por debajo de ochenta metros, y si entra**
   * (H32c). El bucle lee cada ciento veinte milisegundos, y entre dos lecturas
   * caben varias tarjetas: en la corta del JAZ 90 salió «toma» en vez del pie,
   * y con solo el dibujo no se sabía cuál de las tres que lo usan la puso.
   */
  await page.evaluate(() => {
    const j = globalThis.__oga.juegoParaTrazas();
    const senal = j.hud.senal;
    const original = senal.mostrar.bind(senal);
    globalThis.__tarjetasDeLaCorta = [];
    senal.mostrar = (dibujo, texto, letra, opciones = {}) => {
      original(dibujo, texto, letra, opciones);
      const s = j.flight.state;
      const alto = s.position.y - j.terrain.sampleHeight(s.position.x, s.position.z) - j.aircraft.gearHeight;
      if (alto < 80)
        globalThis.__tarjetasDeLaCorta.push(
          `${alto.toFixed(1)} m ${dibujo}${senal.puesto.dibujo === dibujo ? "" : " (espera)"} «${(texto || "").slice(0, 40)}»`,
        );
    };
  });
  const foto = async (n) => {
    const ruta = `${SALIDA}/${NOMBRE}-${n}.png`;
    await page.screenshot({ path: ruta });
    console.log(`    foto: ${ruta}`);
  };
  const tarjeta = await page.evaluate(() => {
    const g = document.createElement("canvas").getContext("webgl");
    const i = g?.getExtension("WEBGL_debug_renderer_info");
    return i ? g.getParameter(i.UNMASKED_RENDERER_WEBGL) : "sin WebGL";
  });
  console.log(`    tarjeta: ${tarjeta}`);

  let r = await leer(page);
  const e0 = r.ejercicio;
  const costado = -(r.viento.x * Math.cos((r.pista * Math.PI) / 180) + r.viento.z * Math.sin((r.pista * Math.PI) / 180));
  comprobar(
    "en la final de la 12, con el viento de costado por la izquierda",
    // La 12 por su rumbo verdadero, 111°: ver `data/aerodromes/gcxo.aero.json`.
    e0.tecnica === TECNICA && e0.lado === -1 && Math.abs(r.pista - 111) < 3 && costado < -5,
    `pista ${r.pista.toFixed(0)}, ${(Math.abs(costado) / 0.514444).toFixed(1)} kt de costado, ${Math.round(r.altura)} m`,
  );
  await foto("01-final");

  // Los flaps de aterrizar, como en la mesa: la final a la velocidad de aproximación.
  await page.evaluate(() => globalThis.__oga.pedirFlaps(1));
  /*
   * **La recogida de un reactor, desde su módulo** (H46), la del vuelo entero:
   * ver `recogidaDelReactor` abajo. Va a la página como texto.
   */
  await page.addScriptTag({
    content: `${porLoQueAceleraElReactor.toString()}\n${pideAlPuntoDeToma.toString()}\n${palancaDelReactorEnLaRecogida.toString()}\nglobalThis.__palancaDelReactorEnLaRecogida = palancaDelReactorEnLaRecogida;`,
  });
  // **El piloto de la mesa**, en la página. Ver `final-con-viento-cruzado.test.ts`.
  await page.evaluate(
    async ({ tecnica, veces }) => {
      const o = globalThis.__oga;
      const j = o.juegoParaTrazas();
      const { mandosPara, memoriaNueva } = await import("/src/flight/piloto-automatico.ts");
      const r = j.scenario.runway;
      const h = (r.heading * Math.PI) / 180;
      const fx = Math.sin(h);
      const fz = -Math.cos(h);
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const dif = (a, b) => {
        let d = a - b;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        return d;
      };
      const a = j.aircraft;
      // El punto de toma, a trescientos metros del umbral.
      const umbral = r.length / 2 - 300;
      /*
       * **La senda, sobre la cota de la pista en el punto de toma**, y no sobre
       * el suelo de debajo (H34a). La final de la 12 de Los Rodeos va sobre
       * un terreno que sube hacia el campo: unos ochenta metros por debajo de
       * la pista a tres kilómetros y medio, y dos al cruzar el umbral. Con la
       * senda sobre ese suelo, el piloto se tiraba sesenta metros al empezar
       * —bajando a 19 m/s, y el gas a cero al embalarse— y luego volaba casi
       * nivelado, con el gas a fondo y hasta cuarenta y cinco metros por
       * debajo de la senda de verdad; en una tirada de H32b se quedó en 56
       * nudos. La senda de un PAPI o de un ILS es de la pista, y es la que
       * vuela quien juega.
       */
      const cotaDe = o.cotaDePistaDeAhora ?? o.cotaDePista;
      const cotaDeLaToma = cotaDe(r.x - fx * umbral, r.z - fz * umbral);
      const dt = veces / 60;
      let integral = 0;
      let pie = 0;
      let gas = null;
      const reactor = o.avion?.()?.propulsion === "chorro";
      let memoria = null;
      let reloj = null;
      /*
       * **Y un reactor recoge como en el vuelo entero** (H46), no con la ley de
       * la avioneta. Esa ley —un escalón a 0,6 m/s a los 6,7 m— seguía
       * sumando su error mientras el automático volaba la senda, y al recoger
       * lo soltaba de golpe (H43): con la palanca a 0,36 el JAZ 90 se paraba en
       * 4,8 m, subía a 5,6 y perdía catorce nudos; otras veces no recogía y
       * tocaba a 3,3–3,7 m/s. Quitarle lo sumado es peor: en la mesa del
       * cangrejo (el modelo, el automático, este piloto y las rachas del
       * juego, doscientas cortas con 12 y 16 nudos) toca a 4,7 m/s en aire
       * quieto, porque recogía con lo que había sumado por error. La del vuelo
       * entero empieza a los tres segundos y pico de senda desde la palanca
       * del automático y reparte el ritmo en la altura que queda: con σ_w 1
       * m/s, de 127 tomas de más de 2 m/s a 98 y la peor de 6,7 a 4,2; en
       * aire quieto, de 496 m y 1,26 m/s a 419 m y 1,76. Ver
       * `scripts/recogida-del-reactor.mjs`.
       */
      let recogidaDelReactor = null;
      let palancaMedia = null;
      let gasDelAutomatico = null;
      o.pilotar((c) => {
        const s = o.estado();
        if (s.onGround) {
          c.throttle = 0;
          c.aileron = 0;
          c.elevator = 0;
          c.rudder = 0;
          c.brakes = 0.5;
          return;
        }
        if (gas === null) gas = c.throttle;
        // Sobre el suelo de debajo, para la recogida: la pista de Los Rodeos no está toda a la cota del campo.
        const hAlto = s.position.y - j.terrain.sampleHeight(s.position.x, s.position.z) - a.gearHeight;
        const x = (s.position.x - r.x) * fx + (s.position.z - r.z) * fz + umbral;
        const y = (s.position.x - r.x) * Math.cos(h) + (s.position.z - r.z) * Math.sin(h);
        const vy = s.velocity.x * Math.cos(h) + s.velocity.z * Math.sin(h);
        const q = s.orientation;
        const ala = Math.asin(-2 * (q.x * q.y + q.w * q.z));
        const morro = dif(s.heading, h);
        const tan3 = Math.tan((3 * Math.PI) / 180);
        const senda = -x * tan3;
        const sobreLaToma = s.position.y - cotaDeLaToma - a.gearHeight;
        const alturaDelReactor = Math.max(4, Math.min(15, 3.2 * Math.max(s.airspeed * tan3, -s.verticalSpeed)));
        const recogida = reactor
          ? recogidaDelReactor !== null || hAlto < alturaDelReactor
          : hAlto < Math.max(4, a.gearHeight * 2);
        const vsQuiere = recogida ? -0.6 : -Math.hypot(s.velocity.x, s.velocity.z) * tan3 + 0.3 * (senda - sobreLaToma);
        const err = vsQuiere - s.verticalSpeed;
        integral = clamp(integral + err * dt, -5, 5);
        c.elevator = clamp(0.12 * err + 0.03 * integral - 0.4 * s.pitchRate, -1, 1);
        gas = recogida ? 0 : clamp(gas + dt * 0.15 * (a.approachSpeed - s.airspeed), 0, 1);
        c.throttle = gas;
        /*
         * **Y el reactor, con el automático del juego en la senda y los gases
         * en la velocidad** (H34a), hasta la recogida: el de `volarLaSenda` en
         * `verificar-vuelo-entero.mjs`, por lo mismo. Con la ley de la
         * avioneta el morro del JAZ 90 —un período de cinco segundos y poco
         * amortiguado— se pelea con el gas: en la mesa, de bajar a 11,7 m/s a
         * subir a 2,6 con el gas de cero a fondo. Con el automático baja a 3,1
         * quieto, a la Vref y cinco en indicada, que es como vuela la final
         * uno de verdad.
         */
        if (reactor && !recogida) {
          const ahora = o.reloj();
          const paso = reloj === null ? 1 / 60 : Math.max(1 / 240, Math.min(0.1, ahora - reloj));
          reloj = ahora;
          const engancha = memoria === null;
          if (engancha) memoria = memoriaNueva();
          const actitud = o.actitud();
          const m = mandosPara(
            {
              heading: s.heading,
              alabeo: actitud.alabeo,
              cabeceo: actitud.cabeceo,
              altitud: s.position.y,
              vertical: s.velocity.y,
              velocidad: (o.velocidadDeCabina?.() ?? 0) / 1.94384,
              gas: c.throttle,
              verdadera: s.airspeed,
              ritmoDeCabeceo: s.pitchRate,
              timon: engancha ? c.elevator : undefined,
              autoridadDelTimon: o.autoridadDelTimon?.(),
              subeElAire: o.subeElAire?.() ?? 0,
              anguloSinSustentacion: o.anguloSinSustentacion?.(),
            },
            {
              rumbo: null,
              altitud: cotaDeLaToma + a.gearHeight + senda,
              ritmo: -Math.hypot(s.velocity.x, s.velocity.z) * tan3,
              velocidad: a.approachSpeed + 5 * 0.514444,
            },
            paso,
            memoria,
          );
          c.elevator = m.elevator;
          if (m.throttle !== null) c.throttle = gas = m.throttle;
          palancaMedia = palancaMedia === null ? c.elevator : palancaMedia + (c.elevator - palancaMedia) * Math.min(1, paso / 2);
          gasDelAutomatico = c.throttle;
        }
        if (reactor && recogida) {
          if (recogidaDelReactor === null) {
            const porElSuelo = Math.hypot(s.velocity.x, s.velocity.z);
            const p = o.avion?.()?.cabeceo;
            recogidaDelReactor = {
              altura: hAlto,
              caida: Math.max(1.2, Math.min(6, Math.max(porElSuelo * tan3, Math.min(-s.verticalSpeed, porElSuelo * tan3 * 1.1)))),
              palanca: palancaMedia ?? c.elevator,
              acumulado: 0,
              velocidad: s.airspeed,
              // El del automático: la ley de la avioneta ya lo ha puesto a cero en este paso.
              gas: gasDelAutomatico ?? c.throttle,
              porAngulo: p && p.cmElevator ? Math.abs(p.cmAlpha / p.cmElevator) : Math.abs(a.aero.cmAlpha / a.aero.cmElevator),
            };
          }
          c.elevator = globalThis.__palancaDelReactorEnLaRecogida({
            ruedas: hAlto,
            vertical: s.verticalSpeed,
            verdadera: s.airspeed,
            ritmoDeCabeceo: s.pitchRate,
            carga: s.loadFactor ?? 1,
            porAngulo: recogidaDelReactor.porAngulo,
            envergadura: a.wingSpan,
            dt,
            rec: recogidaDelReactor,
          });
          // El gas, al ralentí a los treinta pies: ver `RECOGIDA_DE_REACTOR` en el vuelo entero.
          c.throttle = gas = hAlto > 30 * 0.3048 ? recogidaDelReactor.gas : 0;
        }
        globalThis.__trazaDelPiloto = { gas, senda, sobreLaToma, hAlto, vs: s.verticalSpeed, vsQuiere, elev: c.elevator };
        // La corta, paso a paso, con `OGA_TRAZA=1`: lo de cada lectura no ve el enderezado, que dura un par de segundos.
        const fina = (globalThis.__trazaFina ??= []);
        if (hAlto < 20 && fina.length < 600 && !(o.reloj() - (fina.at(-1)?.t ?? -1) < 0.05)) {
          fina.push({
            t: o.reloj(),
            h: hAlto,
            morro: (morro * 180) / Math.PI,
            ala: (ala * 180) / Math.PI,
            guinada: (s.yawRate * 180) / Math.PI,
            vs: s.verticalSpeed,
            ias: o.velocidadDeCabina?.() ?? 0,
          });
        }
        const enderezar = tecnica === "cangrejo" && hAlto < Math.max(5, a.gearHeight * 2.5);
        const conElPie = tecnica === "ala-baja" || enderezar;
        const ultima = globalThis.__trazaFina?.at(-1);
        if (conElPie) {
          pie = clamp(pie - (enderezar ? 3 : 1.5) * morro * dt, -1, 1);
          c.rudder = clamp(-(enderezar ? 4 : 3) * morro - 1.5 * s.yawRate + pie, -1, 1);
          const vyQuiere = clamp(-0.25 * y, -3, 3);
          /*
           * **Y el reactor, con el ala de un reactor al tocar** (H43). Lo que
           * se iría de lado se sujeta con el ala, y la ley de la avioneta deja
           * hasta veinte grados. En el JAZ 90 eso es lo que tocaba torcido:
           * las dos tomas torcidas que se han visto —H32c y la ronda de la
           * tanda 19— llevaban 11,8° y 14,5° de ala, con el morro a 3,6° y
           * 4,6° de la pista; un avión inclinado vira, y el morro se va contra
           * el pie. En la mesa —el modelo del juego, la corta del JAZ 90 con
           * el automático en la senda, el timón automático de Taguató, 12 y 16
           * nudos de costado y rachas de seis de un lado y del otro en el
           * segundo y medio del enderezar—, con veinte grados toca con el
           * morro a 2,5° como mucho y 9,1° de ala; con ocho, a 1,0° y 4,4°, y
           * a diez metros y medio del eje en el peor. Un reactor de verdad
           * toca con pocos grados de ala: los manuales de los de línea la
           * limitan al tocar por la góndola y la punta del ala. La avioneta y
           * el ala baja, igual. Ver la enmienda H43 del ADR 0031.
           */
          const tope = reactor && enderezar ? (8 * Math.PI) / 180 : 0.35;
          const alaQuiere = clamp(0.18 * (vyQuiere - vy), -tope, tope);
          c.aileron = clamp(3 * (alaQuiere - ala) - 0.6 * s.rollRate, -1, 1);
          if (ultima && hAlto < 20) Object.assign(ultima, { pie: c.rudder, aleron: c.aileron });
        } else {
          const camino = Math.atan2(s.velocity.x, -s.velocity.z);
          /*
           * **Y el reactor, mirando más lejos** (H34a). El ala da la
           * aceleración de lado —g por la inclinación— y el camino se mide en
           * ángulo, que es esa velocidad de lado partida por la del suelo: con
           * el morro de la inclinación en proporción al camino que falta hacia
           * un punto a `L` metros, el amortiguamiento va como √(g·L/2)/V. Con
           * los ciento cincuenta metros de la avioneta, a 33 m/s es 0,8; a los
           * 64 del JAZ 90, 0,4, y con el alabeo de un reactor, que tarda más,
           * menos: hacía eses de cien metros, con el morro de −48° a +25° de
           * la pista (H32b). Mirando en proporción al cuadrado de la velocidad
           * el amortiguamiento es el de la avioneta en todos, y el reactor se
           * inclina como uno en final: quince grados como mucho.
           */
          const porElSuelo = Math.hypot(s.velocity.x, s.velocity.z);
          const lejos = reactor ? Math.max(150, 150 * (porElSuelo / 33) ** 2) : 150;
          const quiere = h - Math.atan2(y, lejos);
          const tope = reactor ? 0.26 : 0.3;
          const alaQuiere = clamp(2 * dif(quiere, camino), -tope, tope);
          c.aileron = clamp(3 * (alaQuiere - ala) - 0.6 * s.rollRate, -1, 1);
          // Sin timón automático, la bola la centran los pies de quien vuela.
          c.rudder = j.tier.assists.autoRudder > 0 ? 0 : clamp(4.5 * s.beta, -1, 1);
        }
      });
    },
    { tecnica: TECNICA, veces: VECES },
  );
  const puestas = await page.evaluate((v) => globalThis.__oga.acelerar(v), VECES);
  console.log(`    reloj por ${puestas}`);

  let fotoMedida = false;
  let fotoCorta = false;
  let textoMedido = "";
  let tarjetaMedida = null;
  let tarjetaDelPie = null;
  const fin = Date.now() + 6 * 60000;
  const TRAZA = process.env.OGA_TRAZA === "1";
  let trazaEn = 0;
  while (Date.now() < fin && !r.enElSuelo && r.ejercicio?.fase !== "cerrada") {
    await pausa(120);
    r = await leer(page);
    if (TRAZA && Date.now() > trazaEn) {
      trazaEn = Date.now() + 700;
      const vc = -(r.viento.x * Math.cos((r.pista * Math.PI) / 180) + r.viento.z * Math.sin((r.pista * Math.PI) / 180));
      console.log(
        `    · ${Math.round(r.altura)} m  ${r.ejercicio.fase}  morro ${r.morro.toFixed(1)}  camino ${r.camino.toFixed(1)}  ala ${r.ala.toFixed(1)}  beta ${r.derrape.toFixed(1)}  ias ${(r.verdadera / 0.514444).toFixed(0)} kt  costado ${(vc / 0.514444).toFixed(1)} kt  pide ${r.ejercicio.pide.toFixed(1)}  eje ${r.eje.toFixed(1)}  racha de costado ${r.racha ? (-(r.racha.x * Math.cos((r.pista * Math.PI) / 180) + r.racha.z * Math.sin((r.pista * Math.PI) / 180)) / 0.514444).toFixed(1) : "?"} kt  ap ${r.piloto}  alerón ${r.alabeoPedido?.toFixed(2)}  pie ${r.piePedido?.toFixed(2)}` +
          (r.delPiloto
            ? `  gas ${r.delPiloto.gas.toFixed(2)}  senda ${r.delPiloto.senda.toFixed(0)}  sobre la toma ${r.delPiloto.sobreLaToma.toFixed(0)}  vs ${r.delPiloto.vs.toFixed(1)} (pide ${r.delPiloto.vsQuiere.toFixed(1)})  palanca ${r.delPiloto.elev.toFixed(2)}`
            : ""),
      );
    }
    const medido = TECNICA === "cangrejo" ? r.ejercicio.cangrejo : r.ejercicio.ala;
    if (!fotoMedida && medido !== null) {
      fotoMedida = true;
      textoMedido = r.texto;
      tarjetaMedida = r.tarjeta;
      console.log(`    medido: morro ${r.morro.toFixed(1)}°, ala ${r.ala.toFixed(1)}°, eje ${r.eje.toFixed(1)} m, ${Math.round(r.altura)} m`);
      await foto("02-medido");
    }
    if (r.ejercicio.fase === "corto" && tarjetaDelPie === null) tarjetaDelPie = r.tarjeta;
    if (!fotoCorta && r.altura < 12) {
      fotoCorta = true;
      console.log(`    corta: morro ${r.morro.toFixed(1)}°, ala ${r.ala.toFixed(1)}°, eje ${r.eje.toFixed(1)} m, ${r.altura.toFixed(1)} m`);
      await foto("03-corta");
    }
  }
  if (TECNICA === "cangrejo") {
    comprobar(
      "el cangrejo medido es el del triángulo con la verdadera y el viento de ese momento, a menos de dos grados",
      r.ejercicio.cangrejo !== null && Math.abs(r.ejercicio.cangrejo - r.ejercicio.pidioAlContar) < 2,
      `medido ${r.ejercicio.cangrejo?.toFixed(1)}°, pedía ${r.ejercicio.pidioAlContar?.toFixed(1)}°`,
    );
    comprobar("la tarjeta dibuja el avión torcido sobre la raya", tarjetaMedida === "cangrejo-viento-izquierda", String(tarjetaMedida));
    const pedidas = await page.evaluate(() => globalThis.__tarjetasDeLaCorta ?? []);
    comprobar(
      "y en la corta, el pie derecho",
      tarjetaDelPie === "pie-derecho",
      `${tarjetaDelPie} · las pedidas por debajo de 80 m: ${pedidas.join(" | ")}`,
    );
    if (TRAMO !== "tuka")
      comprobar("desde Taguato, los grados escritos", /\d+° (al viento|into the wind)/.test(textoMedido), `«${textoMedido.slice(0, 80)}»`);
  } else {
    comprobar(
      "el ala del viento abajo, medida",
      r.ejercicio.ala !== null && r.ejercicio.ala >= 1,
      `${r.ejercicio.ala?.toFixed(1)}°`,
    );
    comprobar("la tarjeta dibuja el avión inclinado", tarjetaMedida === "ala-baja-viento-izquierda", String(tarjetaMedida));
  }
  // Lo que tarda en cerrarse tras tocar: un paso.
  const finToque = Date.now() + 20000;
  while (Date.now() < finToque && r.ejercicio?.fase !== "cerrada") {
    await pausa(100);
    r = await leer(page);
  }
  await pausa(300);
  r = await leer(page);
  comprobar(
    "toca con el morro en la pista y se cuenta",
    r.ejercicio.cierre === "derecho",
    `${r.ejercicio.cierre}, al tocar morro ${r.ejercicio.alTocar?.morro.toFixed(1)}° y ala ${r.ejercicio.alTocar?.ala.toFixed(1)}° al viento; tarjeta ${r.tarjeta}, «${r.texto.slice(0, 70)}»`,
  );
  await foto("04-tocado");
  if (TRAZA) {
    const fina = await page.evaluate(() => globalThis.__trazaFina ?? []);
    let antes = -1;
    for (const p of fina) {
      if (p.t - antes < 0.2 && p !== fina.at(-1)) continue;
      antes = p.t;
      console.log(
        `    ~ ${p.t.toFixed(2)} s  ${p.h.toFixed(1)} m  morro ${p.morro.toFixed(1)}  ala ${p.ala.toFixed(1)}  guiñada ${p.guinada.toFixed(1)}°/s  vs ${p.vs.toFixed(1)}  ias ${p.ias} kt` +
          (p.pie !== undefined ? `  pie ${p.pie.toFixed(2)}  alerón ${p.aleron.toFixed(2)}` : ""),
      );
    }
  }
  comprobar("sin errores en la página", errores.length === 0, errores.join(" | "));

  /*
   * **La lámina**: los dibujos de la tarjeta y la ficha del hangar, puestos
   * encima de la página con las clases de verdad, para mirarlos de cerca.
   */
  const hangar = readFileSync("src/ui/hangar.ts", "utf8");
  const avion = /const AVION = \(t: string\): string =>\s*`([\s\S]*?)`;/.exec(hangar)?.[1] ?? "";
  const fichaDe = (nombre) =>
    (new RegExp(`const ${nombre} = escena\\(\`([\\s\\S]*?)\`\\);`).exec(hangar)?.[1] ?? "").replace(
      /\$\{AVION\("([^"]*)"\)\}/g,
      (_, t) => avion.replace("${t}", t),
    );
  await page.evaluate(
    async (fichas) => {
      const { DIBUJOS } = await import("/src/ui/senal.ts");
      const caja = document.createElement("div");
      caja.style.cssText =
        "position:fixed;inset:0;z-index:99999;background:#1a2420;display:flex;flex-wrap:wrap;gap:24px;padding:24px;align-items:center;color:#f2f1ec";
      for (const n of [
        "cangrejo-viento-izquierda",
        "cangrejo-viento-derecha",
        "cangrejo-enderezado-izquierda",
        "ala-baja-viento-izquierda",
        "ala-baja-viento-derecha",
        "pie-derecho",
      ]) {
        const d = document.createElement("div");
        d.style.cssText = "width:130px;height:130px;fill:currentColor";
        d.innerHTML = DIBUJOS[n].replace("<svg ", '<svg width="130" height="130" ');
        caja.append(d);
      }
      for (const ficha of fichas) {
        const f = document.createElement("div");
        f.className = "ficha ficha--leccion ficha--ejercicio";
        f.style.cssText = "width:360px";
        f.innerHTML = `<span class="ficha__lienzo ficha__lienzo--panel"><svg class="ficha__panel" viewBox="0 0 120 84" width="360" height="252">
        <rect class="panel__cielo" x="0" y="0" width="120" height="46" rx="3" />
        <rect class="panel__tierra" x="0" y="42" width="120" height="42" rx="3" />${ficha}</svg></span>`;
        caja.append(f);
      }
      document.body.append(caja);
    },
    [fichaDe("EJ_CANGREJO"), fichaDe("EJ_ALA_BAJA")],
  );
  await pausa(300);
  await foto("05-lamina");
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
