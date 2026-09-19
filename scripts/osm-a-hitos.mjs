#!/usr/bin/env node
/**
 * Extractor de hitos: OpenStreetMap → `data/hitos/<escenario>.hitos.json`.
 *
 *     npx tsx scripts/osm-a-hitos.mjs tenerife-norte
 *     npx tsx scripts/osm-a-hitos.mjs            # todos
 *
 * ## Para qué
 *
 * Para que la comandante pueda decir lo que se ve por la ventanilla. Es lo que
 * hace una comandante de verdad en un vuelo largo —«a la izquierda, el
 * Teide»—, y aquí hace tres cosas a la vez: entretiene el rato de crucero, que
 * era la pega («durante los vuelos largos pueden pasar cosas»), enseña dónde
 * está uno, y da una razón para mirar por la ventana en vez de a los
 * instrumentos.
 *
 * ## Por qué se extrae y no se escribe a mano
 *
 * Porque **lo que se enseña es real**. Un niño que aprenda aquí que ese volcán
 * de la izquierda es el Teide tiene que acertar el día que lo vea desde un
 * avión de verdad, y una lista escrita de memoria acierta casi siempre, que es
 * otra manera de decir que falla. Los nombres, las coordenadas y las cotas
 * salen de OpenStreetMap, con su licencia anotada, como el aeródromo y la
 * ciudad.
 *
 * ## Qué se trae, y qué no
 *
 * Puntos con nombre y sin ambigüedad, de las clases que se reconocen **desde
 * el aire**:
 *
 *   - `natural=volcano` y `natural=peak` con cota — la montaña que se ve.
 *   - `place=island` — la isla de enfrente, que en Canarias es media lección
 *     de geografía. Los islotes no: «a la derecha vamos dejando Piedra del
 *     Gallo» no lo diría nadie.
 *   - `place=city` y `town` — el pueblo de abajo.
 *
 * No se traen polígonos: un río o un embalse es una geometría grande y lo que
 * hace falta aquí es un punto al que apuntar. No se traen aldeas ni cumbres
 * sin cota: hay cientos y ninguna se reconoce. Y no se trae nada sin nombre,
 * porque el nombre **es** el dato.
 *
 * ## Cuántos
 *
 * Los más destacados de cada clase dentro del cuadro del horizonte —ver
 * `CUPO`—, y separados entre sí por `SEPARACION` para que no salgan tres
 * cumbres del mismo macizo. Sin eso, Tenerife trae ciento veinte picos y el
 * vuelo se convierte en un locutor.
 *
 * ## Licencia
 *
 * Base de datos derivada de OpenStreetMap: **ODbL 1.0**. Anotada en
 * `CREDITOS.md` con el resto de lo que sale de ahí.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { SCENARIOS, vecesLejosDe } from '../src/world/scenarios.ts';
import { overpass, proyector } from './osm-comun.mjs';

const SALIDA = 'data/hitos';

const redondear = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Cuántos hitos como mucho de cada clase.
 *
 * Con un solo tope para todos salían catorce montañas y ni una isla: Tenerife
 * tiene más cumbres mapeadas que ninguna otra cosa, y ordenando por altura se
 * llevaban la lista entera —«Montaña Abreu, 1.312 m» no se lo sabe ni quien
 * vive allí—. El cupo por clase es lo que hace que un vuelo por Canarias
 * nombre el Teide, la isla de enfrente y el pueblo de abajo, que es lo que
 * nombraría cualquiera.
 */
const CUPO = { montana: 4, isla: 4, ciudad: 5 };

/**
 * Cuánto tienen que estar separados dos hitos, m.
 *
 * Ocho kilómetros. El macizo del Teide trae el pico, Pico Viejo, Montaña
 * Blanca y media docena más en un puñado de kilómetros: todos son cumbres de
 * verdad y nombrarlas una detrás de otra no enseña nada. Se queda la más
 * alta.
 */
const SEPARACION = 8000;

/** Las clases que se piden, con lo que hace falta para quedarse una. */
const CLASES = [
  {
    clase: 'montana',
    consulta: '[natural~"^(volcano|peak)$"]',
    // Sin cota no hay con qué ordenar, y una cumbre sin cota mapeada casi
    // siempre es un cerro que no se ve desde arriba.
    /*
     * Mil metros. Con cuatrocientos salían «Montaña Abreu» y «Montaña de las
     * Yescas», que son cumbres de verdad y no las conoce ni quien vive
     * debajo. Lo que se señala desde el aire es lo que destaca.
     */
    vale: (t) => Number.isFinite(Number(t.ele)) && Number(t.ele) >= 1000,
    peso: (t) => Number(t.ele),
  },
  {
    clase: 'isla',
    consulta: '[place=island]',
    /*
     * `islet` fuera. Los peñascos de la costa de Tenerife están mapeados como
     * islote y son de verdad, pero «a la derecha vamos dejando Piedra del
     * Gallo» no es lo que diría nadie: lo que se señala desde un avión es la
     * isla de enfrente. Las islas de OSM no traen tamaño en el nodo, así que
     * se ordenan por población cuando la hay y, si no, valen todas: hay pocas.
     */
    vale: () => true,
    peso: (t) => Number(t.population ?? 0),
  },
  {
    clase: 'ciudad',
    consulta: '[place~"^(city|town)$"]',
    vale: (t) => Number(t.population ?? 0) >= 5000,
    peso: (t) => Number(t.population ?? 0),
  },
];

const pedidos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const escenarios = SCENARIOS.filter(
  (e) => e.aerodrome?.origin && (pedidos.length === 0 || pedidos.includes(e.id)),
);
if (escenarios.length === 0) {
  console.error('Nada que extraer. ¿El identificador es de SCENARIOS?');
  process.exit(1);
}

mkdirSync(SALIDA, { recursive: true });

for (const esc of escenarios) {
  // El origen es el del aeródromo extraído: el mismo punto que usan el relieve
  // y la ortofoto. Si aquí se usara otro, los hitos caerían desplazados.
  const origen = esc.aerodrome.origin;
  /*
   * El cuadro es el del horizonte, que es hasta donde se ve: no tiene sentido
   * nombrar lo que no se puede mirar. Y en grados, que es lo que entiende
   * Overpass, con la corrección del coseno en la longitud.
   */
  const medio = (esc.size * vecesLejosDe(esc)) / 2;
  const dLat = (medio / 6371000) * (180 / Math.PI);
  const dLon = dLat / Math.cos((origen.lat * Math.PI) / 180);
  const caja = [
    origen.lat - dLat, origen.lon - dLon,
    origen.lat + dLat, origen.lon + dLon,
  ].map((v) => v.toFixed(5)).join(',');

  const aMetros = proyector(origen.lat, origen.lon);
  const hitos = [];
  for (const clase of CLASES) {
    const consulta = `[out:json][timeout:60];node(${caja})${clase.consulta};out;`;
    const datos = await overpass(consulta);
    const escogidos = [];
    const suyos = (datos.elements ?? [])
      .filter((n) => n.tags?.name && clase.vale(n.tags))
      .map((n) => {
        const [x, norte] = aMetros(n.lat, n.lon);
        return {
          nombre: n.tags.name,
          clase: clase.clase,
          lat: redondear(n.lat, 5),
          lon: redondear(n.lon, 5),
          // La Z del juego apunta al sur, como en todos los extractores.
          x: Math.round(x),
          z: Math.round(-norte),
          ele: Number.isFinite(Number(n.tags.ele))
            ? Math.round(Number(n.tags.ele))
            : null,
          peso: clase.peso(n.tags) || 0,
        };
      })
      .sort((a, b) => b.peso - a.peso);
    /*
     * La separación se mide **dentro de la clase**, no contra todo. Dos
     * cumbres del mismo macizo son la misma cosa dicha dos veces; una cumbre y
     * el pueblo que tiene al pie son dos cosas distintas, y las dos se ven.
     */
    for (const h of suyos) {
      if (escogidos.length >= (CUPO[clase.clase] ?? 0)) break;
      if (escogidos.some((o) => Math.hypot(o.x - h.x, o.z - h.z) < SEPARACION))
        continue;
      escogidos.push(h);
    }
    hitos.push(...escogidos);
  }

  const finales = hitos
    .sort((a, b) => orden(a) - orden(b))
    .map(({ peso: _, ...resto }) => resto);

  const fichero = `${SALIDA}/${esc.id}.hitos.json`;
  writeFileSync(
    fichero,
    `${JSON.stringify(
      {
        id: esc.id,
        fuente: 'OpenStreetMap',
        licencia: 'ODbL 1.0',
        origen,
        hitos: finales,
      },
      null,
      2,
    )}\n`,
  );
  const cuenta = {};
  for (const h of finales) cuenta[h.clase] = (cuenta[h.clase] ?? 0) + 1;
  console.log(
    `${esc.id.padEnd(18)} ${String(finales.length).padStart(2)} hitos · ` +
      Object.entries(cuenta).map(([c, n]) => `${n} ${c}`).join(', '),
  );
}

/** Un orden estable entre clases: primero lo que más se ve. */
function orden(h) {
  const rango = { montana: 0, isla: 1, ciudad: 2 }[h.clase] ?? 9;
  // Dentro de la clase, de más destacado a menos.
  return rango * 1e9 - h.peso;
}

