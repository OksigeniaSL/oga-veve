/**
 * El hangar: la pantalla que se ve antes de volar.
 *
 * Hasta ahora había cuatro escenarios y a tres solo se llegaba escribiendo
 * `?escenario=tenerife-norte` en la barra del navegador. Una niña de cuatro
 * años no hace eso. Todo lo que se ha construido —dos aeródromos reales, sus
 * letras amarillas, sus puntos de espera— estaba colgado de una casa sin
 * puerta.
 *
 * Dos decisiones que mandan sobre todo lo demás:
 *
 * **El plano del aeródromo se dibuja con sus propios datos.** La ficha de
 * Silvio Pettirossi no lleva un icono de aeropuerto: lleva Silvio Pettirossi,
 * sus 54 calles de rodaje y su pista de 3,3 km, sacados del mismo fichero que
 * dibuja el juego. Dos aeropuertos no se parecen en nada vistos desde arriba,
 * y esa es exactamente la diferencia que hay que enseñar. Además no puede
 * mentir: si algún día el plano de la ficha y el del juego dejan de
 * coincidir, es que el fichero cambió.
 *
 * **El color de la ficha sale de la paleta del escenario.** El Chaco es
 * ocre pálido, el valle es verde, Tenerife es azul y roca. Quien no lee
 * distingue los cuatro sitios por el color antes que por el nombre, que es
 * como se distinguen los sitios de verdad.
 *
 * Lo que aquí **no** hay, a propósito: ninguna edad, ninguna palabra
 * imprescindible y ningún «modo fácil». Los tramos se eligen por sus galones
 * y por el panel que traen, que es lo que de verdad cambia de un peldaño al
 * siguiente. Nadie quiere elegir el modo de pequeños.
 */

import { TIERS, type Tier } from '../flight/tiers';
import { LECCIONES, type Leccion } from '../flight/lecciones';
import { SCENARIOS, type Scenario } from '../world/scenarios';
import { LOCALES, LOCALE_NAMES, getLocale, setLocale, t } from '../i18n';
import { elegirMundo, mundoElegido } from './mundo';

/** Lo que el hangar devuelve cuando alguien le da al botón de despegar. */
export interface Eleccion {
  readonly scenario: Scenario;
  readonly tier: Tier;
  readonly leccion: Leccion;
}

// ── Qué cambia en cada tramo ─────────────────────────────────────────────
//
// Aquí iban cuatro aves, y no salieron. Dos intentos: cuatro retratos de
// perfil que parecían huevos con pico, y cuatro siluetas en vuelo que
// parecían libélulas. Es el mismo muro que con los avatares — **el sistema
// está bien, el dibujo necesita a alguien que sepa dibujar** —, así que el
// retrato queda pendiente y aquí va lo que sí se puede hacer bien y además
// dice más.
//
// Lo que se dibuja es **el panel de ese tramo**. Porque un tramo no es un
// personaje: es cuánta física se te confía, y eso se ve en los instrumentos.
// Guyrami vuela sin ninguno; Tukã tiene dibujos; Taguato, cifras; Taguato
// Ruvicha, los seis relojes de un avión de verdad.
//
// Y de paso resuelve algo que faltaba: hasta ahora nadie sabía qué ganaba al
// subir de peldaño. La ficha se lo enseña antes de elegir.

const panel = (cuerpo: string): string => `
  <svg class="ficha__panel" viewBox="0 0 120 84" aria-hidden="true">
    <rect class="panel__cielo" x="0" y="0" width="120" height="40" rx="3" />
    <rect class="panel__tierra" x="0" y="40" width="120" height="44" rx="3" />
    <path class="panel__horizonte" d="M0 40 h120" />
    ${cuerpo}
  </svg>
`;

/** Guyrami: la ventanilla y nada más. Se vuela mirando fuera. */
const GUYRAMI_SVG = panel('');

/**
 * Tukã: dibujos. Cada instrumento es una imagen, no un número.
 *
 * Y las dos imágenes tienen que **distinguirse entre sí**, que en el primer
 * intento las dos eran una loma con una flecha y parecían el mismo
 * instrumento repetido. La velocidad son barras que crecen; la altura, una
 * loma con el avión por encima.
 */
const TUKA_SVG = panel(`
  <rect class="panel__caja" x="8" y="48" width="46" height="30" rx="5" />
  <rect class="panel__pinta" x="15" y="66" width="6" height="7" rx="1.5" />
  <rect class="panel__pinta" x="24" y="61" width="6" height="12" rx="1.5" />
  <rect class="panel__pinta" x="33" y="56" width="6" height="17" rx="1.5" />
  <path class="panel__aguja" d="M42 60 l7 6 l-7 6 z" />
  <rect class="panel__caja" x="66" y="48" width="46" height="30" rx="5" />
  <path class="panel__pinta" d="M71 73 l12-14 l12 14 z" />
  <path class="panel__aguja" d="M92 56 l13-3 l-4 3 l4 3 z" />
  <circle class="panel__aguja" cx="88" cy="56" r="2.6" />
`);

/** Taguato: cifras. Es cuando aparecen los números y sus unidades. */
const TAGUATO_SVG = panel(`
  <rect class="panel__caja" x="6" y="48" width="32" height="30" rx="5" />
  <rect class="panel__cifra" x="11" y="55" width="22" height="8" rx="2" />
  <rect class="panel__cifra" x="11" y="67" width="14" height="4" rx="1.6" />
  <rect class="panel__caja" x="44" y="48" width="32" height="30" rx="5" />
  <rect class="panel__cifra" x="49" y="55" width="22" height="8" rx="2" />
  <rect class="panel__cifra" x="49" y="67" width="14" height="4" rx="1.6" />
  <rect class="panel__caja" x="82" y="48" width="32" height="30" rx="5" />
  <rect class="panel__cifra" x="87" y="55" width="22" height="8" rx="2" />
  <rect class="panel__cifra" x="87" y="67" width="14" height="4" rx="1.6" />
`);

/**
 * Taguato Ruvicha: los seis relojes.
 *
 * No son seis círculos de adorno: es **el six-pack**, dos filas de tres, la
 * disposición que llevan todos los aviones del mundo desde los años cincuenta
 * y en ese orden. Quien la reconozca aquí la va a reconocer en la cabina de un
 * avión de línea.
 */
const RUVICHA_SVG = panel(
  Array.from({ length: 6 }, (_, i) => {
    const cx = 24 + (i % 3) * 36;
    const cy = 54 + Math.floor(i / 3) * 21;
    // Cada aguja mira a un sitio distinto: seis relojes con la aguja clavada
    // en el mismo punto no parecen instrumentos, parecen un dibujo repetido.
    const a = (i * 47 - 60) * (Math.PI / 180);
    return `
      <circle class="panel__reloj" cx="${cx}" cy="${cy}" r="9" />
      <path class="panel__aguja"
            d="M${cx} ${cy} l${(Math.sin(a) * 6.5).toFixed(1)} ${(-Math.cos(a) * 6.5).toFixed(1)}" />
      <circle class="panel__eje" cx="${cx}" cy="${cy}" r="1.5" />`;
  }).join(''),
);

const PANELES: Record<string, string> = {
  guyrami: GUYRAMI_SVG,
  tuka: TUKA_SVG,
  taguato: TAGUATO_SVG,
  'taguato-ruvicha': RUVICHA_SVG,
};

// ── El plano del aeródromo ───────────────────────────────────────────────

/** Un punto del fichero, pasado a coordenadas de dibujo. La Y del norte sube. */
const aPantalla = (p: readonly [number, number]): string => `${p[0]},${-p[1]}`;

export interface Caja {
  readonly cx: number;
  readonly cy: number;
  readonly lado: number;
}

/**
 * La caja que ocupa un escenario visto desde arriba.
 *
 * **Es la caja de lo dibujado, no la distancia al punto de referencia.** El
 * primer intento midió desde el origen del fichero, y el origen es el punto de
 * referencia del aeropuerto, que en Silvio Pettirossi está a casi trescientos
 * metros de la pista y descentrado respecto a las plataformas: salía una caja
 * el doble de grande de lo que hay, y por eso Asunción se veía más pequeña que
 * Tenerife siendo mayor. Es el mismo error de marcos de siempre, otra vez, y
 * van diez.
 */
export function caja(escenario: Scenario): Caja {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const mirar = (pts: readonly (readonly [number, number])[]) => {
    for (const [x, y] of pts) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  };

  const aero = escenario.aerodrome;
  if (aero) {
    for (const p of aero.runways) mirar(p.centerline);
    for (const c of aero.taxiways) mirar(c.path);
    for (const p of aero.aprons) mirar(p.polygon);
  } else {
    const { length, heading } = escenario.runway;
    const h = (heading * Math.PI) / 180;
    mirar([
      [(-Math.sin(h) * length) / 2, (-Math.cos(h) * length) / 2],
      [(Math.sin(h) * length) / 2, (Math.cos(h) * length) / 2],
    ]);
  }

  if (!Number.isFinite(minX)) return { cx: 0, cy: 0, lado: escenario.runway.length };
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    // Un margen del diez por ciento, para que la pista no muera en el filo.
    lado: Math.max(maxX - minX, maxY - minY) * 1.1,
  };
}

/**
 * El plano de un escenario, dibujado con sus propios datos.
 *
 * Cuando hay aeródromo real se dibuja lo que hay: plataformas, calles de
 * rodaje y pista, cada cosa con su grosor. Cuando no —los escenarios
 * inventados—, se dibuja su pista y ya, que es lo único que hay.
 *
 * Todos comparten escala, así que **la ficha de Silvio Pettirossi se ve más
 * grande que la del valle porque lo es**: 3,4 km de pista contra 1,1. Cuatro
 * iconos iguales no dirían eso; cuatro planos a escala sí, y sin una palabra.
 */
function plano(escenario: Scenario, escala: number): string {
  const { cx, cy, lado } = caja(escenario);
  // **Con suelo de escala.** Todas comparten escala para que se vea de un
  // vistazo cuál es la pista larga, pero sin suelo el valle salía como un
  // palito perdido en medio de la ficha. Con el suelo al 55 % la diferencia se
  // sigue leyendo —el valle ocupa la mitad que Asunción— y el pequeño se ve.
  const v = Math.max(lado, escala * 0.55);
  const vb = `${cx - v / 2} ${-cy - v / 2} ${v} ${v}`;
  const aero = escenario.aerodrome;

  /** Las dos cabeceras, marcadas. Sin esto una pista corta es una raya y ya. */
  const umbrales = (
    a: readonly [number, number],
    b: readonly [number, number],
    ancho: number,
  ): string => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const px = (-dy / l) * (ancho / 2);
    const py = (dx / l) * (ancho / 2);
    return [a, b]
      .map(
        (p) =>
          `<line class="plano__umbral" x1="${p[0] - px}" y1="${-(p[1] - py)}"
                 x2="${p[0] + px}" y2="${-(p[1] + py)}" />`,
      )
      .join('');
  };

  if (!aero) {
    const { length, heading, width } = escenario.runway;
    const h = (heading * Math.PI) / 180;
    const a: readonly [number, number] = [(-Math.sin(h) * length) / 2, (-Math.cos(h) * length) / 2];
    const b: readonly [number, number] = [(Math.sin(h) * length) / 2, (Math.cos(h) * length) / 2];
    return `
      <svg class="ficha__plano" viewBox="${vb}" preserveAspectRatio="xMidYMid meet"
           aria-hidden="true">
        <line class="plano__pista" x1="${a[0]}" y1="${-a[1]}" x2="${b[0]}" y2="${-b[1]}" />
        ${umbrales(a, b, width * 2.6)}
      </svg>`;
  }

  const rodaduras = aero.taxiways
    .filter((c) => c.path.length > 1)
    .map((c) => `<polyline class="plano__rodadura" points="${c.path.map(aPantalla).join(' ')}" />`)
    .join('');

  const plataformas = aero.aprons
    .filter((p) => p.polygon.length > 2)
    .map(
      (p) => `<polygon class="plano__plataforma" points="${p.polygon.map(aPantalla).join(' ')}" />`,
    )
    .join('');

  const pistas = aero.runways
    .filter((p) => p.centerline.length > 1)
    .map((p) => {
      const eje = p.centerline;
      const a = eje[0]!;
      const b = eje[eje.length - 1]!;
      return (
        `<polyline class="plano__pista" points="${eje.map(aPantalla).join(' ')}" />` +
        umbrales(a, b, (p.widthM ?? 45) * 2.6)
      );
    })
    .join('');

  return `
    <svg class="ficha__plano" viewBox="${vb}" preserveAspectRatio="xMidYMid meet"
         aria-hidden="true">
      ${plataformas}${rodaduras}${pistas}
    </svg>`;
}

/** El designador pintado en la cabecera, si el aeródromo lo trae. */
export function designador(escenario: Scenario): string {
  const nombres = Object.keys(escenario.aerodrome?.runways[0]?.thresholds ?? {});
  if (nombres.length >= 2) return `${nombres[0]}/${nombres[1]}`;
  // Los escenarios inventados sí calculan el número: es su rumbo magnético
  // partido por diez, que es de donde sale el número de una pista.
  const mag = (escenario.runway.heading + escenario.magneticVariation + 360) % 360;
  const n = Math.round(mag / 10) || 36;
  const otro = ((n + 17) % 36) + 1;
  return `${String(n).padStart(2, '0')}/${String(otro).padStart(2, '0')}`;
}

/**
 * Los dos colores de la ficha, sacados de la paleta del escenario.
 *
 * No son colores elegidos a mano: son el cielo y el suelo de ese sitio, los
 * mismos que se van a ver al volar. Por eso el Chaco sale pálido, el valle
 * verde y Tenerife azul y roca, y por eso quien no lee los distingue.
 */
function pieles(escenario: Scenario): { cielo: string; suelo: string } {
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  const bandas = escenario.bands;
  return {
    cielo: hex(escenario.sky.zenith),
    suelo: hex(bandas[Math.min(2, bandas.length - 1)]?.colour ?? 0x4d6136),
  };
}

/** El idioma en el formato que entiende `Intl`. */
const idioma = (): string => (getLocale() === 'gug' ? 'es-PY' : getLocale());

// ── La pantalla ──────────────────────────────────────────────────────────

const ESCALA = Math.max(...SCENARIOS.map((e) => caja(e).lado));

function fichaDeSitio(escenario: Scenario, elegido: boolean): string {
  const { cielo, suelo } = pieles(escenario);
  // Con la coma decimal que toca. `toFixed` da un punto, y «3.4 km» en un
  // producto para Paraguay está mal escrito.
  const km = (escenario.runway.length / 1000).toLocaleString(idioma(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const aero = escenario.aerodrome;

  /*
   * El código OACI, en grande y sobre el plano.
   *
   * Es la matrícula de un aeropuerto: cuatro letras que lo identifican en todo
   * el mundo, y las dos primeras dicen la región —SG es Paraguay, GC son las
   * Canarias—. Quien aprenda aquí que Asunción es SGAS ha aprendido algo que
   * usa un comandante todos los días, y no cuesta nada: ya está en el fichero.
   *
   * Los escenarios inventados no llevan ninguno, porque inventarse un código
   * OACI es inventarse el de alguien.
   */
  /*
   * Los dos datos van **en la misma pastilla y arriba a la izquierda**. Iban
   * uno en cada esquina de arriba y la cota de Tenerife quedaba justo debajo
   * de la marca de elegido: 633 m tapados por un visto.
   */
  const ficha =
    aero &&
    `<span class="plano__ficha"><b>${aero.id}</b>${
      aero.elevationM != null ? `<i>${Math.round(aero.elevationM)} m</i>` : ''
    }</span>`;

  return `
    <button class="ficha ficha--sitio" type="button" role="radio"
            aria-checked="${elegido}" tabindex="${elegido ? 0 : -1}"
            data-sitio="${escenario.id}"
            style="--cielo: ${cielo}; --suelo: ${suelo}">
      <span class="ficha__lienzo">${ficha || ''}${plano(escenario, ESCALA)}</span>
      <span class="ficha__pie">
        <!--
          En dos filas. En una sola, «Valle de la Cordillera» y «Llanura del
          Chaco» se partían en dos líneas y descuadraban la ficha: el nombre
          necesita el ancho entero y los datos caben de sobra en su renglón.
        -->
        <span class="ficha__renglon">
          <span class="ficha__numero">${designador(escenario)}</span>
          <span class="ficha__dato">${km} km</span>
        </span>
        <span class="ficha__nombre">${t(escenario.nameKey as never)}</span>
      </span>
    </button>`;
}

/**
 * Los galones. Uno por peldaño, como en la manga de un uniforme.
 *
 * Es la única forma que se nos ocurrió de decir «este es el siguiente» sin
 * decir «este es el de mayores»: se cuentan, y contar hasta cuatro sí se sabe
 * a los cuatro años.
 */
const galones = (n: number): string =>
  `<span class="ficha__galones" aria-hidden="true">${'<i></i>'.repeat(n)}</span>`;

function fichaDeTramo(tier: Tier, indice: number, elegido: boolean): string {
  return `
    <button class="ficha ficha--tramo" type="button" role="radio"
            aria-checked="${elegido}" tabindex="${elegido ? 0 : -1}"
            data-tramo="${tier.id}">
      <span class="ficha__lienzo ficha__lienzo--panel">${PANELES[tier.id] ?? GUYRAMI_SVG}</span>
      <span class="ficha__pie">
        <!-- Dos filas, igual que las de sitio: en columna estrecha «Taguato
             Ruvicha» no cabe al lado de los galones. -->
        ${galones(indice + 1)}
        <span class="ficha__nombre">${tier.name}</span>
      </span>
    </button>`;
}


/**
 * Los cuatro dibujos de lección.
 *
 * Cada uno tiene que decir la lección entera **sin una palabra**, porque esto
 * lo elige quien no lee. Así que ninguno es un símbolo: los cuatro son la misma
 * avioneta en cuatro sitios distintos, que es lo único que un niño de cuatro
 * años necesita comparar.
 *
 * Se dibujan sobre el mismo lienzo que las fichas de tramo —cielo arriba,
 * tierra abajo— para que las tres filas del hangar se lean como tres preguntas
 * sobre la misma cosa y no como tres pantallas distintas.
 */
const AVION = (t: string): string =>
  `<path class="leccion__avion" transform="${t}"
     d="M-11 0.6 L-1.2 -0.4 V-7 a1 1 0 0 1 2 0 v6.6 L11 0.6 v2.4 L0.8 4 v3.8
        l2.4 1.4 v1.2 L0 9.6 L-3.2 10.4 V9.2 L-0.8 7.8 V4 L-11 3 Z" />`;

const escena = (cuerpo: string): string => `
  <svg class="ficha__panel" viewBox="0 0 120 84" aria-hidden="true">
    <rect class="panel__cielo" x="0" y="0" width="120" height="46" rx="3" />
    <rect class="panel__tierra" x="0" y="42" width="120" height="42" rx="3" />
    ${cuerpo}
  </svg>
`;

/** Dar una vuelta: el avión arriba, y nada más. El paisaje es el premio. */
const LEC_VUELTA = escena(`
  <path class="leccion__loma" d="M0 62 q22-12 40-2 q18 10 34-4 q16-13 46 2 v26 H0 Z" />
  ${AVION('translate(60 26) rotate(-8)')}
`);

/** Rodar: el avión sobre la raya amarilla, camino de la doble raya. */
const LEC_RODAJE = escena(`
  <path class="leccion__asfalto" d="M14 84 L44 46 h30 L58 84 Z" />
  <path class="leccion__amarilla" d="M40 84 L58 47" />
  <path class="leccion__doble" d="M22 74 h34 M26 79 h34" />
  ${AVION('translate(52 60) rotate(-38) scale(1.15)')}
`);

/** Despegar: el avión subiendo desde la pista. */
const LEC_DESPEGUE = escena(`
  <path class="leccion__asfalto" d="M0 84 L34 50 h26 L26 84 Z" />
  <path class="leccion__estela" d="M22 72 q26-14 52-34" />
  ${AVION('translate(84 26) rotate(-26) scale(1.05)')}
`);

/** Aterrizar: el avión bajando a la pista, con su senda. */
const LEC_ATERRIZAJE = escena(`
  <path class="leccion__asfalto" d="M52 84 L86 50 h26 L78 84 Z" />
  <path class="leccion__estela" d="M14 22 q34 18 70 34" />
  ${AVION('translate(34 30) rotate(24) scale(1.05)')}
`);

const DIBUJOS_LECCION: Record<string, string> = {
  vuelta: LEC_VUELTA,
  rodaje: LEC_RODAJE,
  despegue: LEC_DESPEGUE,
  aterrizaje: LEC_ATERRIZAJE,
};

function fichaDeLeccion(leccion: Leccion, elegida: boolean): string {
  return `
    <button class="ficha ficha--leccion" type="button" role="radio"
            aria-checked="${elegida}" tabindex="${elegida ? 0 : -1}"
            data-leccion="${leccion.id}">
      <span class="ficha__lienzo ficha__lienzo--panel">${DIBUJOS_LECCION[leccion.id] ?? ''}</span>
      <span class="ficha__pie">
        <span class="ficha__nombre">${t(`leccion.${leccion.id}` as never)}</span>
      </span>
    </button>`;
}

/** El avión despegando del botón de despegar. */
const DESPEGA = `
  <svg viewBox="0 0 48 32" aria-hidden="true">
    <path d="M4 26 h34" class="despega__pista" />
    <path d="M9 19 L27 13 L33 6 L36 7 L33 14 L42 12 L44 15 L34 19 L26 22 L11 22 Z" />
  </svg>
`;

/**
 * Abre el hangar y no vuelve hasta que alguien elige.
 *
 * Devuelve una promesa a propósito: el juego no se construye hasta que hay
 * escenario, y así no hay que inventar un mecanismo para cambiárselo en
 * caliente. Cambiar de aeropuerto es empezar otro vuelo, que es lo que es.
 */
/*
 * Los dibujos de los cuatro pasos. Trazo y no relleno: al lado de las fichas
 * —que son ilustraciones llenas de color— un icono relleno compite, y uno de
 * línea acompaña.
 */
const trazo = (d: string): string =>
  `<svg class="paso__icono" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">${d}</svg>`;

const PASO_DONDE = trazo(
  '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" />',
);
const PASO_QUE = trazo(
  '<path d="M3 17h18" /><path d="M5 13.5 12.5 6l2.6 2.6-4.2 4.9Z" /><path d="M15 6.4 17.3 4l2.7 2.7-2.4 2.3Z" />',
);
const PASO_QUIEN = trazo(
  '<circle cx="12" cy="8.4" r="3.6" /><path d="M4.8 20c.7-3.7 3.6-5.6 7.2-5.6s6.5 1.9 7.2 5.6" />',
);
const PASO_AJUSTES = trazo(
  '<circle cx="12" cy="12" r="3.1" /><path d="M12 2.6v3M12 18.4v3M21.4 12h-3M5.6 12h-3M18.6 5.4l-2.1 2.1M7.5 16.5l-2.1 2.1M18.6 18.6l-2.1-2.1M7.5 7.5 5.4 5.4" />',
);
const PASO_VOLVER = trazo('<path d="M15 5 8 12l7 7" />');

/**
 * Los últimos sitios jugados, del más reciente al más antiguo.
 *
 * La pantalla de inicio enseña **dónde se estuvo**, no un catálogo, y para eso
 * hace falta acordarse. Sin historial —primera partida, ventana privada— se
 * enseñan los primeros del catálogo, que es lo más parecido a «lo de siempre»
 * que se puede decir sin saber nada.
 */
const ALMACEN_RECIENTES = 'oga-veve:recientes';

function recientes(): Scenario[] {
  let ids: string[] = [];
  try {
    ids = JSON.parse(localStorage.getItem(ALMACEN_RECIENTES) ?? '[]') as string[];
  } catch {
    ids = [];
  }
  const vistos = ids
    .map((id) => SCENARIOS.find((e) => e.id === id))
    .filter((e): e is Scenario => e !== undefined);
  for (const e of SCENARIOS) {
    if (vistos.length >= 3) break;
    if (!vistos.some((v) => v.id === e.id)) vistos.push(e);
  }
  return vistos.slice(0, 3);
}

function apuntarReciente(id: string): void {
  try {
    const ids = JSON.parse(localStorage.getItem(ALMACEN_RECIENTES) ?? '[]') as string[];
    const nuevos = [id, ...ids.filter((x) => x !== id)].slice(0, 6);
    localStorage.setItem(ALMACEN_RECIENTES, JSON.stringify(nuevos));
  } catch {
    // Vale para esta partida.
  }
}

/**
 * Cuánto se espera sin tocar nada antes de volver a la pantalla de inicio.
 *
 * Dos minutos. No es una medida de seguridad ni de rendimiento: es que una
 * tablet compartida —un aula, una feria, la mesa de casa— tiene que quedar
 * lista para el siguiente **sin que nadie la ordene**. Quien se levantó a medio
 * elegir no deja su elección a medias encima de la mesa.
 */
const REPOSO_MS = 120000;

/** Las pantallas del hangar. Una cada vez, y la de inicio no crece nunca. */
type Pantalla = 'inicio' | 'donde' | 'que' | 'quien' | 'ajustes';

export function abrirHangar(
  root: HTMLElement,
  inicial: { scenario: Scenario; tier: Tier; leccion: Leccion },
): Promise<Eleccion> {
  let sitio = inicial.scenario;
  let tramo = inicial.tier;
  let leccion = inicial.leccion;
  let pantalla: Pantalla = 'inicio';
  let reposo: ReturnType<typeof setTimeout> | null = null;

  /*
   * Los dos mundos, dibujados. El de la foto es una loma con su textura y sus
   * casas; el dibujado, la misma loma en tres planos planos. Es literalmente
   * lo que se ve al elegir uno u otro.
   */
  const MUNDO_FOTO = `
    <svg viewBox="0 0 28 20" aria-hidden="true">
      <rect x="1" y="1" width="26" height="18" rx="3" fill="currentColor" opacity=".22" />
      <path d="M1 14 L8 8 L13 12 L19 5 L27 13 V17 a2 2 0 0 1-2 2 H3 a2 2 0 0 1-2-2 Z"
            fill="currentColor" />
      <circle cx="21" cy="5.5" r="2.4" fill="currentColor" />
      <path d="M4 16 h4 M11 16.5 h6" stroke="currentColor" stroke-width="1.1"
            stroke-linecap="round" opacity=".55" />
    </svg>`;
  const MUNDO_DIBUJADO = `
    <svg viewBox="0 0 28 20" aria-hidden="true">
      <rect x="1" y="1" width="26" height="18" rx="3" fill="currentColor" opacity=".22" />
      <path d="M1 17 L9 7 L15 17 Z" fill="currentColor" />
      <path d="M12 17 L20 9 L27 17 Z" fill="currentColor" opacity=".7" />
      <circle cx="22" cy="5.5" r="2.2" fill="currentColor" />
    </svg>`;

  const pintar = (): void => {
    root.innerHTML = `
      <div class="hangar__marco">
        <!--
          El idioma, aquí y no escondido detrás de una tecla del vuelo.
          Estaba solo en un atajo de teclado, así que a quien le abría en
          inglés le abría en inglés para siempre: un mando que no se anuncia
          no existe, y esta es la segunda vez que nos pasa lo mismo.
        -->
        <h1 class="hangar__marca">Óga Veve</h1>

        ${
          pantalla === 'inicio'
            ? `
        <!--
          **Se abre listo para volar, no preguntando.**

          Antes esto era un formulario: tres preguntas apiladas que había que
          contestar antes de jugar, y en un portátil la tercera ya no cabía. Lo
          que se enseña ahora es **dónde se estuvo**, con el botón a mano;
          cambiar algo es entrar a cambiarlo.
        -->
        <section class="hangar__bloque" aria-labelledby="hangar-seguimos">
          <h2 class="hangar__pregunta" id="hangar-seguimos">${t('hangar.seguimos')}</h2>
          <div class="hangar__fila hangar__fila--tres" role="radiogroup"
               aria-labelledby="hangar-seguimos">
            ${recientes()
              .map((e) => fichaDeSitio(e, e.id === sitio.id))
              .join('')}
          </div>
          <p class="hangar__reposo">${t('hangar.reposo')}</p>
        </section>`
            : ''
        }

        ${
          pantalla === 'donde'
            ? `
        <section class="hangar__bloque" aria-labelledby="hangar-sitio">
          <h2 class="hangar__pregunta" id="hangar-sitio">${t('hangar.donde')}</h2>
          <div class="hangar__rejilla" role="radiogroup" aria-labelledby="hangar-sitio">
            ${SCENARIOS.map((e) => fichaDeSitio(e, e.id === sitio.id)).join('')}
          </div>
        </section>`
            : ''
        }

        ${
          pantalla === 'que'
            ? `
        <!--
          **A qué se juega dice también desde dónde se empieza.**

          Aterrizar arranca ya volando, en final; despegar, en el puesto. No
          hace falta preguntarlo aparte: ya está dicho al elegir a qué se juega.
        -->
        <section class="hangar__bloque" aria-labelledby="hangar-leccion">
          <h2 class="hangar__pregunta" id="hangar-leccion">${t('hangar.aque')}</h2>
          <div class="hangar__rejilla" role="radiogroup" aria-labelledby="hangar-leccion">
            ${LECCIONES.map((l) => fichaDeLeccion(l, l.id === leccion.id)).join('')}
          </div>
        </section>`
            : ''
        }

        ${
          pantalla === 'quien'
            ? `
        <section class="hangar__bloque" aria-labelledby="hangar-tramo">
          <h2 class="hangar__pregunta" id="hangar-tramo">${t('hangar.como')}</h2>
          <div class="hangar__rejilla" role="radiogroup" aria-labelledby="hangar-tramo">
            ${TIERS.map((tier, i) => fichaDeTramo(tier, i, tier.id === tramo.id)).join('')}
          </div>
        </section>`
            : ''
        }

        ${
          pantalla === 'ajustes'
            ? `
        <!--
          **Lo que se decide una vez, fuera del camino.**

          Idioma y mundo no son preguntas de partida. Estaban arriba a la
          derecha porque no había otro sitio; ahora lo hay, y quien tiene cuatro
          años no entra aquí nunca.
        -->
        <section class="hangar__bloque" aria-labelledby="hangar-ajustes">
          <h2 class="hangar__pregunta" id="hangar-ajustes">${t('hangar.ajustes')}</h2>
          <div class="hangar__ajustes">
            <div class="ajuste">
              <span class="ajuste__titulo">${t('language.label')}</span>
              <div class="hangar__idiomas" role="radiogroup" aria-label="${t('language.label')}">
                ${LOCALES.map(
                  (l) => `
                <button class="idioma" type="button" role="radio" lang="${l === 'gug' ? 'gn' : l}"
                        aria-checked="${l === getLocale()}" tabindex="${l === getLocale() ? 0 : -1}"
                        data-idioma="${l}">${LOCALE_NAMES[l]}</button>`,
                ).join('')}
              </div>
            </div>
            <div class="ajuste">
              <span class="ajuste__titulo">${t('mundo.label')}</span>
              <div class="hangar__mundos" role="radiogroup" aria-label="${t('mundo.label')}">
                ${(['foto', 'dibujado'] as const)
                  .map(
                    (m) => `
                <button class="mundo" type="button" role="radio" data-mundo="${m}"
                        aria-checked="${m === mundoElegido()}"
                        tabindex="${m === mundoElegido() ? 0 : -1}"
                        aria-label="${t(m === 'foto' ? 'mundo.foto' : 'mundo.dibujado')}"
                        title="${t(m === 'foto' ? 'mundo.foto' : 'mundo.dibujado')}">
                  ${m === 'foto' ? MUNDO_FOTO : MUNDO_DIBUJADO}
                </button>`,
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </section>`
            : ''
        }
      </div>

      <!--
        **La barra de abajo no es un menú: es el estado.**

        Dice qué está elegido ahora mismo, y de paso deja entrar a cambiarlo.
        Quien tiene cuatro años ve fichas y un botón naranja; quien tiene
        cuarenta ve la partida entera configurada de un vistazo.

        Y no crece: da igual que haya cuatro aeropuertos o cuarenta, aquí
        siempre hay cuatro pasos y un botón. Lo que crece son las pantallas de
        detalle, que sí pueden desplazarse.
      -->
      <div class="hangar__barra">
        ${
          pantalla === 'inicio'
            ? `
        <div class="hangar__pasos">
          ${[
            ['donde', t('hangar.donde'), t(sitio.nameKey as never), PASO_DONDE],
            ['que', t('hangar.aque'), t(`leccion.${leccion.id}` as never), PASO_QUE],
            ['quien', t('hangar.como'), tramo.name, PASO_QUIEN],
            ['ajustes', t('hangar.ajustes'), LOCALE_NAMES[getLocale()], PASO_AJUSTES],
          ]
            .map(
              ([id, que, valor, icono]) => `
          <button class="paso" type="button" data-pantalla="${id}">
            ${icono}
            <span class="paso__texto">
              <span class="paso__que">${que}</span>
              <span class="paso__valor">${valor}</span>
            </span>
          </button>`,
            )
            .join('')}
        </div>`
            : `
        <button class="paso paso--volver" type="button" data-pantalla="inicio">
          ${PASO_VOLVER}
          <span class="paso__texto">
            <span class="paso__valor">${t('hangar.atras')}</span>
          </span>
        </button>`
        }
        <button class="hangar__despegar" type="button" data-despegar>
          ${DESPEGA}
          <span>${t('hangar.despegar')}</span>
        </button>
      </div>
    `;
  };

  pintar();
  root.hidden = false;

  return new Promise<Eleccion>((resolve) => {
    /** Elegir una ficha: repintar y devolverle el foco a la que se eligió. */
    const elegir = (
      atributo: 'data-sitio' | 'data-tramo' | 'data-leccion',
      id: string,
    ): void => {
      if (atributo === 'data-sitio') sitio = SCENARIOS.find((e) => e.id === id) ?? sitio;
      else if (atributo === 'data-tramo') tramo = TIERS.find((x) => x.id === id) ?? tramo;
      else leccion = LECCIONES.find((x) => x.id === id) ?? leccion;
      pintar();
      // Sin esto, quien navega con teclado se queda tirado al principio del
      // documento cada vez que elige algo, porque el nodo que tenía el foco
      // ha dejado de existir.
      root.querySelector<HTMLElement>(`[${atributo}="${id}"]`)?.focus();
    };

    /*
     * El reposo: si nadie toca nada, el hangar se recompone solo.
     *
     * No es limpieza ni ahorro: una tablet compartida tiene que quedar lista
     * para el siguiente sin que nadie la ordene. Quien se levantó a medio
     * elegir no deja su elección a medias encima de la mesa.
     */
    const aplazarReposo = (): void => {
      if (reposo !== null) clearTimeout(reposo);
      reposo = setTimeout(() => {
        if (pantalla !== 'inicio') {
          pantalla = 'inicio';
          pintar();
        }
      }, REPOSO_MS);
    };
    aplazarReposo();
    root.addEventListener('pointerdown', aplazarReposo);
    root.addEventListener('keydown', aplazarReposo);

    root.addEventListener('click', (event) => {
      const boton = (event.target as HTMLElement | null)?.closest('button');
      if (!boton) return;

      const aDonde = boton.getAttribute('data-pantalla');
      if (aDonde) {
        pantalla = aDonde as Pantalla;
        pintar();
        return;
      }

      const idIdioma = boton.getAttribute('data-idioma');
      if (idIdioma) {
        setLocale(idIdioma as (typeof LOCALES)[number]);
        pintar();
        root.querySelector<HTMLElement>(`[data-idioma="${idIdioma}"]`)?.focus();
        return;
      }

      const idSitio = boton.getAttribute('data-sitio');
      const idMundo = boton.getAttribute('data-mundo');
      if (idMundo === 'foto' || idMundo === 'dibujado') {
        elegirMundo(idMundo);
        pintar();
        return;
      }
      if (idSitio) {
        elegir('data-sitio', idSitio);
        if (pantalla === 'donde') {
          pantalla = 'inicio';
          pintar();
        }
        return;
      }

      const idTramo = boton.getAttribute('data-tramo');
      if (idTramo) {
        elegir('data-tramo', idTramo);
        if (pantalla === 'quien') {
          pantalla = 'inicio';
          pintar();
        }
        return;
      }

      const idLeccion = boton.getAttribute('data-leccion');
      if (idLeccion) {
        elegir('data-leccion', idLeccion);
        if (pantalla === 'que') {
          pantalla = 'inicio';
          pintar();
        }
        return;
      }

      if (boton.hasAttribute('data-despegar')) {
        if (reposo !== null) clearTimeout(reposo);
        apuntarReciente(sitio.id);
        root.hidden = true;
        root.innerHTML = '';
        resolve({ scenario: sitio, tier: tramo, leccion });
      }
    });

    /**
     * Las flechas recorren el grupo, que es como se recorre un `radiogroup`.
     *
     * Con solo el tabulador hacen falta ocho pulsaciones para llegar al botón
     * de despegar, y quien navega con teclado tiene que pasar por las ocho
     * tarjetas aunque ya sepa cuál quiere. Con flechas son dos: elegir sitio,
     * tabular, elegir tramo, tabular.
     */
    root.addEventListener('keydown', (event) => {
      const paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (paso === undefined) return;
      const boton = (event.target as HTMLElement | null)?.closest('button');
      const grupo = boton?.closest('[role="radiogroup"]');
      if (!boton || !grupo) return;
      event.preventDefault();

      const tarjetas = [...grupo.querySelectorAll<HTMLElement>('[role="radio"]')];
      const i = tarjetas.indexOf(boton as HTMLElement);
      // Da la vuelta al llegar al final, que es lo que hace un grupo de radio.
      const siguiente = tarjetas[(i + paso + tarjetas.length) % tarjetas.length];
      const atributo = siguiente?.hasAttribute('data-sitio')
        ? 'data-sitio'
        : siguiente?.hasAttribute('data-leccion')
          ? 'data-leccion'
          : 'data-tramo';
      const id = siguiente?.getAttribute(atributo);
      if (id) elegir(atributo, id);
    });
  });
}
