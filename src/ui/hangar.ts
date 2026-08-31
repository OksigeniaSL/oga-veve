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
 * **El plano del aeródromo se dibuja con sus propios datos.** La tarjeta de
 * Silvio Pettirossi no lleva un icono de aeropuerto: lleva Silvio Pettirossi,
 * sus 54 calles de rodaje y su pista de 3,3 km, sacados del mismo fichero que
 * dibuja el juego. Dos aeropuertos no se parecen en nada vistos desde arriba,
 * y esa es exactamente la diferencia que hay que enseñar. Además no puede
 * mentir: si algún día el plano de la tarjeta y el del juego dejan de
 * coincidir, es que el fichero cambió.
 *
 * **El color de la tarjeta sale de la paleta del escenario.** El Chaco es
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
import { SCENARIOS, type Scenario } from '../world/scenarios';
import { getLocale, t } from '../i18n';

/** Lo que el hangar devuelve cuando alguien le da al botón de despegar. */
export interface Eleccion {
  readonly scenario: Scenario;
  readonly tier: Tier;
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
// subir de peldaño. La tarjeta se lo enseña antes de elegir.

const panel = (cuerpo: string): string => `
  <svg class="tarjeta__panel" viewBox="0 0 120 84" aria-hidden="true">
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
 * Todos comparten escala, así que **la tarjeta de Silvio Pettirossi se ve más
 * grande que la del valle porque lo es**: 3,4 km de pista contra 1,1. Cuatro
 * iconos iguales no dirían eso; cuatro planos a escala sí, y sin una palabra.
 */
function plano(escenario: Scenario, escala: number): string {
  const { cx, cy } = caja(escenario);
  const vb = `${cx - escala / 2} ${-cy - escala / 2} ${escala} ${escala}`;
  const aero = escenario.aerodrome;

  if (!aero) {
    const { length, heading } = escenario.runway;
    const h = (heading * Math.PI) / 180;
    const dx = (Math.sin(h) * length) / 2;
    const dy = (Math.cos(h) * length) / 2;
    return `
      <svg class="tarjeta__plano" viewBox="${vb}" preserveAspectRatio="xMidYMid meet"
           aria-hidden="true">
        <line class="plano__pista" x1="${-dx}" y1="${dy}" x2="${dx}" y2="${-dy}"
              stroke-width="${escenario.runway.width}" />
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
    .map(
      (p) =>
        `<polyline class="plano__pista" points="${p.centerline.map(aPantalla).join(' ')}"
                   stroke-width="${p.widthM ?? 45}" />`,
    )
    .join('');

  return `
    <svg class="tarjeta__plano" viewBox="${vb}" preserveAspectRatio="xMidYMid meet"
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
 * Los dos colores de la tarjeta, sacados de la paleta del escenario.
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

function tarjetaDeSitio(escenario: Scenario, elegido: boolean): string {
  const { cielo, suelo } = pieles(escenario);
  // Con la coma decimal que toca. `toFixed` da un punto, y «3.4 km» en un
  // producto para Paraguay está mal escrito.
  const km = (escenario.runway.length / 1000).toLocaleString(idioma(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `
    <button class="tarjeta tarjeta--sitio" type="button" role="radio"
            aria-checked="${elegido}" tabindex="${elegido ? 0 : -1}"
            data-sitio="${escenario.id}"
            style="--cielo: ${cielo}; --suelo: ${suelo}">
      <span class="tarjeta__lienzo">${plano(escenario, ESCALA)}</span>
      <span class="tarjeta__pie">
        <span class="tarjeta__numero">${designador(escenario)}</span>
        <span class="tarjeta__nombre">${t(escenario.nameKey as never)}</span>
        <span class="tarjeta__dato">${km} km</span>
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
  `<span class="tarjeta__galones" aria-hidden="true">${'<i></i>'.repeat(n)}</span>`;

function tarjetaDeTramo(tier: Tier, indice: number, elegido: boolean): string {
  return `
    <button class="tarjeta tarjeta--tramo" type="button" role="radio"
            aria-checked="${elegido}" tabindex="${elegido ? 0 : -1}"
            data-tramo="${tier.id}">
      <span class="tarjeta__lienzo tarjeta__lienzo--panel">${PANELES[tier.id] ?? GUYRAMI_SVG}</span>
      <span class="tarjeta__pie">
        ${galones(indice + 1)}
        <span class="tarjeta__nombre">${tier.name}</span>
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
export function abrirHangar(
  root: HTMLElement,
  inicial: { scenario: Scenario; tier: Tier },
): Promise<Eleccion> {
  let sitio = inicial.scenario;
  let tramo = inicial.tier;

  const pintar = (): void => {
    root.innerHTML = `
      <div class="hangar__marco">
        <h1 class="hangar__marca">Óga Veve</h1>

        <section class="hangar__bloque" aria-labelledby="hangar-sitio">
          <h2 class="hangar__pregunta" id="hangar-sitio">${t('hangar.donde')}</h2>
          <div class="hangar__fila" role="radiogroup" aria-labelledby="hangar-sitio">
            ${SCENARIOS.map((e) => tarjetaDeSitio(e, e.id === sitio.id)).join('')}
          </div>
        </section>

        <section class="hangar__bloque" aria-labelledby="hangar-tramo">
          <h2 class="hangar__pregunta" id="hangar-tramo">${t('hangar.como')}</h2>
          <div class="hangar__fila" role="radiogroup" aria-labelledby="hangar-tramo">
            ${TIERS.map((tier, i) => tarjetaDeTramo(tier, i, tier.id === tramo.id)).join('')}
          </div>
        </section>

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
    /** Elegir una tarjeta: repintar y devolverle el foco a la que se eligió. */
    const elegir = (atributo: 'data-sitio' | 'data-tramo', id: string): void => {
      if (atributo === 'data-sitio') sitio = SCENARIOS.find((e) => e.id === id) ?? sitio;
      else tramo = TIERS.find((x) => x.id === id) ?? tramo;
      pintar();
      // Sin esto, quien navega con teclado se queda tirado al principio del
      // documento cada vez que elige algo, porque el nodo que tenía el foco
      // ha dejado de existir.
      root.querySelector<HTMLElement>(`[${atributo}="${id}"]`)?.focus();
    };

    root.addEventListener('click', (event) => {
      const boton = (event.target as HTMLElement | null)?.closest('button');
      if (!boton) return;

      const idSitio = boton.getAttribute('data-sitio');
      if (idSitio) return elegir('data-sitio', idSitio);

      const idTramo = boton.getAttribute('data-tramo');
      if (idTramo) return elegir('data-tramo', idTramo);

      if (boton.hasAttribute('data-despegar')) {
        root.hidden = true;
        root.innerHTML = '';
        resolve({ scenario: sitio, tier: tramo });
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
      const atributo = siguiente?.hasAttribute('data-sitio') ? 'data-sitio' : 'data-tramo';
      const id = siguiente?.getAttribute(atributo);
      if (id) elegir(atributo, id);
    });
  });
}
