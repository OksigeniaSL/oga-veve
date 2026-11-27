#!/usr/bin/env node
/**
 * **Lo que el AIP publica de cada puesto de estacionamiento**, sacado de sus cartas
 * PDC y casado con los puestos de la ficha (ADR 0025, enmienda H60f).
 *
 *     node scripts/puestos-del-aip.mjs extraer GCXO carta.txt [otra.txt …]
 *     node scripts/puestos-del-aip.mjs juntar GCXO [GCLP …]
 *     node scripts/puestos-del-aip.mjs poner GCFV
 *
 * `extraer` lee el texto de las cartas PDC de la parte AD 2 del AIP de ENAIRE
 * (aip.enaire.es), pasado por `pdftotext -layout`, y guarda la tabla
 * «Características de los puestos de estacionamiento» en
 * `data/aerodromes/aip/<id>.pdc.json`, cada puesto con la hoja y la fecha (WEF) de
 * la que sale. `juntar` pone a cada puesto de la ficha lo suyo —`aip`: salida,
 * mayor avión, si es de contacto, hacia dónde queda el morro— y lleva a su punto publicado el que está lejos de
 * él (`LEJOS`): la regla de la H60e —el puesto va a su parada— con el AIP como
 * fuente de la parada. `poner` es para el campo cuyos puestos no están en OpenStreetMap
 * (Fuerteventura, H85): los de la carta, en su punto, con la línea que ella dibuja y por
 * donde la casilla 20 dice que se sale y se llega.
 *
 * La de Silvio Pettirossi no se extrae: la hoja AD 2.1-14.2 de la DINAC es un dibujo sin
 * texto, y su tabla —seis puertas y sus coordenadas, nada más— está pasada a mano en
 * `aip/sgas.pdc.json` (H83).
 *
 * El AIP es una publicación oficial: de él se toman los hechos de cada puesto, no
 * se reproduce la carta.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const SALIDA = "data/aerodromes";
const AIP = join(SALIDA, "aip");
/** El de `osm-a-aerodromo.mjs`, para que los puntos salgan en los mismos ejes que la ficha. */
const R = 6371008;
const redondear = (n) => Math.round(n * 10) / 10;
function proyector(lat0, lon0) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return (lat, lon) => [
    redondear((R * (lon - lon0) * Math.PI * k) / 180),
    redondear((R * (lat - lat0) * Math.PI) / 180),
  ];
}

/**
 * **Lo que puede quedar el puesto de la ficha de su punto publicado**, m. Más allá
 * se lleva al publicado. Las coordenadas del AIP van a la centésima de segundo, unos
 * treinta centímetros; un nodo de OpenStreetMap puesto sobre la ortofoto, a uno o dos
 * metros de la parada. Los de las fichas de antes de #191, en el centro de su línea de
 * entrada, quedan a treinta, cincuenta o noventa metros (H60d): esos son los que se
 * mueven.
 */
const LEJOS = 10;

/** Lo que puede quedar el punto publicado al lado de la línea de entrada para estar en ella, m. */
const EN_LA_LINEA = 3;

/**
 * **Los puestos de contacto, por carta**: lo que dice cada AIP de cuáles tienen
 * pasarela, que no es la misma columna en todos. Los Rodeos y Gran Canaria lo ponen
 * como observación del puesto; Barajas, como una lista de puestos en la observación
 * (1) de cada carta. Los demás no lo dicen, y el puesto se queda sin saberlo (`null`):
 * manda lo que se ve en la foto (`PASARELAS`, H87) y, si no se sabe, la regla de siempre,
 * la de la pared a lo que alcanza una pasarela.
 */
const CONTACTO = {
  // AD 2-GCXO PDC 1.3: «(2) Pasarela. // Boarding bridge.»
  GCXO: { observacion: "(2)" },
  // AD 2-GCLP PDC 1: «(4) Pasarela // Bridge.»
  GCLP: { observacion: "(4)" },
  // AD 2-LEMD PDC 1, observación (1): «posiciones de contacto con el edificio terminal
  // (T-1 a T-35 y 70 a 74)»; PDC 2, observación (1): «(PRKG 300 a 312, 330 a 394 y 500 a 586)».
  LEMD: {
    rangos: [
      ["T1", "T35"],
      ["70", "74"],
      ["300", "312"],
      ["330", "394"],
      ["500", "586"],
    ],
  },
  // AIP Paraguay, AD 2.1-14.2: la hoja dibuja una pasarela en cada una de las seis puertas,
  // y ninguna en lo demás de la plataforma.
  SGAS: { rangos: [["1", "6"]] },
};

/**
 * **Qué puestos tienen pasarela donde la carta no lo dice** (H87): Tenerife Sur, La Palma, Lanzarote y
 * Fuerteventura, leído de la ortofoto del PNOA, que es donde se ven, y de lo que las cartas dan solo en
 * los de pasarela. `true` o `false` si se sabe, y `undefined` si no: el puesto que no está en la lista se
 * queda como estaba. Va en la ficha aparte de `contacto`, que es lo que dice la carta. Ver
 * `aip/pasarelas.json`, que lleva de cada uno de dónde sale.
 */
const PASARELAS = JSON.parse(await readFile(join(AIP, "pasarelas.json"), "utf8"));
const conPasarela = (id, ref) =>
  PASARELAS.campos[id]?.puestos.find((g) => g.refs.some((r) => refNormalizado(r) === refNormalizado(ref)))?.pasarela;
/** De dónde sale, para `aipPuestos` de la ficha. */
const fuenteDeLasPasarelas = (id) =>
  PASARELAS.campos[id]
    ? { pasarelas: { fuente: PASARELAS.fuente, url: PASARELAS.url, foto: PASARELAS.campos[id].foto, leido: PASARELAS.leido } }
    : {};

/**
 * **El APROAR que depende de la pista en uso** (H76), por la observación que lo dice. AD 2-LEMD
 * PDC 1.7, (5): «En Configuración Norte, aproar al S sobre A6 y en Configuración Sur aproar al E
 * sobre A5», y la (6), lo mismo para todo avión que no sea el A388 o el A124. Configuración Norte
 * es despegar y aterrizar hacia el norte.
 */
const APROAR_POR_CONFIGURACION = {
  LEMD: [{ carta: /PDC 1\./, observacion: /\([56]\)/, aproar: "S/E", norte: "S", sur: "E" }],
};

/**
 * **El APROAR que no da la tabla, puesto a puesto, sino la casilla 20 para todos** (H88). En Tenerife
 * Sur: «Pushback is obligatory in front stands and shall be performed such that the aircraft remains
 * nosing to the threshold in use», y «pushbacks on parking stands R19, G20, AG21, and J22 shall be
 * performed nosing to THR 25», que son los cuatro que la tabla da al E. Y «leaving apron gates "D" free»:
 * las puertas de la plataforma a la paralela (`puertasLibres`). El umbral de la 07 queda al
 * oeste de la plataforma y el de la 25 al este: en los ocho puntos con los que los da la tabla, W
 * despegando por la 07 (`norte`, que es hacia el 069) y E por la 25 (`sur`). Vale en los de salida
 * en retroceso; en los que la tabla lo da, manda la tabla.
 */
const APROAR_DE_LA_CASILLA = {
  GCTS: {
    aproar: "E/W",
    norte: "W",
    sur: "E",
    puertasLibres: ["D1", "D2", "D3", "D4", "D5", "D6"],
    fuente:
      "AIP España AD 2-GCTS, casilla 20.3.2.1 (AIRAC AMDT 10/26, WEF 29-OCT-26): «Pushback is obligatory in front stands and shall be performed such that the aircraft remains nosing to the threshold in use and leaving apron gates \"D\" free», y «Pushbacks on parking stands R19, G20, AG21, and J22 shall be performed nosing to THR 25», que son los que la tabla da al E. Salvo que «there are operational or safety reasons for push-backs without nosing to the threshold in use or leaving apron gates D free».",
  },
};

/**
 * **Por qué puerta se deja la plataforma, si la casilla 20 lo dice para todos** (H95). En Tenerife Sur:
 * «After push-back or autonomous departure, aircraft shall proceed to the threshold in use through the
 * first available apron gate», y los de salida autónoma de la segunda línea, «nosing to the threshold in
 * use», con su morro a la calle de plataforma. Se llega «from the appropriate apron gate for PRKG R19 to
 * G48, and from the parking stand centre line for PRKG E49 to E70»: cuál de las puertas no lo dice, y a
 * los de la segunda línea se entra de la paralela, por su raya. La calle de plataforma, que el AIP llama
 * «inner apron taxiway» y no tiene letra, es la INNER de OpenStreetMap. Las puertas son las de
 * `puertasLibres`.
 */
const RODAJE_DE_LA_CASILLA = {
  GCTS: {
    primeraPuerta: { calle: "INNER", puertas: ["D1", "D2", "D3", "D4", "D5", "D6"] },
    deFrente: { desde: "E49", hasta: "E70", salePor: ["INNER"], llegaPor: { norte: ["T"], sur: ["T"] } },
    fuente:
      "AIP España AD 2-GCTS, casilla 20.3.2 (AIRAC AMDT 10/26, WEF 29-OCT-26): «After push-back or autonomous departure, aircraft shall proceed to the threshold in use through the first available apron gate, unless there are operational or safety reasons to the contrary»; de los de salida autónoma, «Departure shall be performed nosing to the threshold in use»; y al llegar, «from the appropriate apron gate for PRKG R19 to G48, and from the parking stand centre line for PRKG E49 to E70».",
  },
};

/**
 * **La plataforma de aviación general cuyos puestos se cruzan** (H97), por la carta que la dibuja. En Tenerife
 * Sur, AD 2-GCTS PDC 1.1 (WEF 11-JUN-26): «GA APN», con tres calles, la U1, la U2 y la U3 —«22 MAX WINGSPAN»—,
 * y cinco puestos entre ellas, del AG1 al AG5, que la PDC 1.3 da de salida autónoma y de aviación general, con
 * su envergadura.
 *
 * - **Por dónde se entra y por dónde se sale**, de dónde está su parada: la rueda de morro para más cerca de una
 *   de las dos calles —a 17 m de la U3 y 35 de la U2 en el AG4— y el avión queda detrás, hacia la otra, así que se
 *   entra por la lejana y se sale hacia delante por la cercana. En la ortofoto hay una avioneta en el AG1, entre
 *   la U1 y su parada, con el morro a la U2.
 * - **Las líneas**: OpenStreetMap da dos por puesto, una de cada calle, y las llama «AG4» y «AG4 (U2)»: la que
 *   acaba en la parada es la de salir, y la otra, la de entrar, que se queda donde empieza el avión. Aquí son un
 *   solo puesto, con la de entrar hasta la parada. La de salir va en la ficha como raya de la calle a la que sale
 *   (`taxiways`, `soloPintada`), y los trozos en curva de las de entrar, también.
 * - La calle de plataforma a la que bajan las tres es la INNER.
 */
const DE_PASO = {
  GCTS: {
    uso: "general",
    plataforma: "INNER",
    fuente:
      "AIP España AD 2-GCTS PDC 1.1 (WEF 11-JUN-26), «GA APN», con las calles U1, U2 y U3, y PDC 1.3 (WEF 16-APR-26), del AG1 al AG5, «Aviación General»; a qué calle se entra y por cuál se sale, de dónde está su parada y de la ortofoto PNOA de máxima actualidad, Instituto Geográfico Nacional de España (CC BY 4.0; foto de 2024-02).",
    puestos: {
      AG1: { entra: "U1", sale: "U2" },
      AG2: { entra: "U1", sale: "U2" },
      AG3: { entra: "U2", sale: "U3" },
      AG4: { entra: "U2", sale: "U3" },
      AG5: { entra: "U2", sale: "U3" },
    },
  },
};

/**
 * **Los puestos de los que no se maniobra a la vez** (H97): «Simultaneous arrival/departure manoeuvres from
 * adjacent stands J1 and G2, G9 and G10 and G10 and H37 are incompatible» (AD 2-GCTS, casilla 20.3.2.1, A1; y al
 * llegar, la 20.3.2.2). No es de aparcar, que eso va en las observaciones de la tabla: es de moverse.
 */
const NUNCA_A_LA_VEZ = {
  GCTS: {
    parejas: [
      ["J1", "G2"],
      ["G9", "G10"],
      ["G10", "H37"],
    ],
    fuente:
      "AIP España AD 2-GCTS, casilla 20.3.2.1 (AIRAC AMDT 10/26, WEF 29-OCT-26): «Simultaneous arrival/departure manoeuvres from adjacent stands J1 and G2, G9 and G10 and G10 and H37 are incompatible.» Y la 20.3.2.2, al llegar.",
  },
};

/**
 * **De qué puestos sale el que va por sus medios, donde de los puestos de la ficha casi todos son de salida en
 * retroceso y ninguno es de aviación general** (H97). En La Palma, AD 2-GCLA PDC 1.2 (WEF 15-MAY-25): catorce «R»
 * y, de avión, dos «A», el 12 y el 14, que la PDC 1.1 dibuja de paso, entrando de la R y saliendo a ella; y la
 * carta no da plataforma de aviación general.
 *
 * En Los Rodeos (H103), AD 2-GCXO PDC 1.2 (WEF 06-AUG-26): de los quince de la ficha, el 17 y el 19 son «A», de
 * AT72, y los otros trece, «R»; y la casilla 20.1.2 los saca por la F. La carta sí da dos plataformas de aviación
 * general, la GA 1 (AG1 a AG3, por sus medios a la Y) y la GA 2 (AG4 a AG7, con tractor a la W), y del 28 al 38
 * deja salir por sus medios: nada de eso estaba en la ficha, que viene de OpenStreetMap y no los trae. La aviación
 * general está desde la H105 (`GENERAL_DE_LA_CARTA`), y a ella van las avionetas; del 17 y del 19 salen los
 * turbohélices. Del 28 al 38, todavía no.
 *
 * - **`calle`, por cuál se sale y se llega**, si la casilla lo dice: «Aircraft exiting PRKG 17 and 19 (…) enter
 *   TWY R via TWY F at F1 point», y se entra en ellos de la F, con el «FOLLOW ME» esperando en el F1 (20.1.3 F).
 *   Va a cada uno como `salePor` y `llegaPor`, y la calle a `callesDePlataforma`: sin ella, por la 30 el 19
 *   salía recto hacia el sur, entre el 15 y el 16, que tienen el morro hacia él.
 */
const POR_SUS_MEDIOS = {
  GCLA: {
    puestos: ["12", "14"],
    fuente:
      "AIP España AD 2-GCLA PDC 1.2 (WEF 15-MAY-25): salida «A» en el 12, el 14 y los de helicóptero, y «R», en retroceso, en los demás; ni las PDC ni el AD 2 (AIRAC AMDT 09/26, WEF 01-OCT-26) dicen dónde aparca la aviación general.",
  },
  GCXO: {
    puestos: ["17", "19"],
    calle: "F",
    fuente:
      "AIP España AD 2-GCXO PDC 1.2 (WEF 06-AUG-26): salida «A» en el 17 y el 19, de AT72, y «R», en retroceso, en los demás de la ficha; AD 2-GCXO, casilla 20.1.2 (AMDT 413/26, 26-NOV-26), C y E: «autonomous exit parking positions (…) to TWY F (PRKG 17 and 19)», «Aircraft exiting PRKG 17 and 19 (…) enter TWY R via TWY F at F1 point». Los de salida autónoma del 28 al 38 no están en la ficha; la aviación general, del AG1 al AG7, está desde la H105 (`GENERAL_DE_LA_CARTA`).",
  },
};

/**
 * **La aviación general que publica la carta y OpenStreetMap no trae** (H105). En Los Rodeos, AD 2-GCXO PDC 1.2
 * (WEF 06-AUG-26): del AG1 al AG7, «A», con su punto y su mayor avión —CN35, G150 y PA34—; la PDC 1.1 (WEF
 * 29-OCT-26) los reparte en dos plataformas, la APN GA 1 (AG1 a AG3) y la APN GA 2 (AG4 a AG7), con la Y y la W
 * llegando a ellas de la R por el Y1 y el W1. Y la casilla 20.1.2 (AMDT 413/26, 26-NOV-26): C, «autonomous exit
 * parking positions (…) to TWY Y (PRKG AG1, AG2 and AG3)»; I, de la GA 1 se sale por la Y; J, de la GA 2, «by
 * towing to the centre line of TWY W».
 *
 * - **Los puestos**, en su punto publicado, que ya trae `aip/<id>.pdc.json`; se ponen en la ficha con `manual` y
 *   se rehacen cada vez que se junta.
 * - **Las líneas de la GA 1**, la raya blanca pintada en la losa, en la ortofoto PNOA de máxima actualidad (foto
 *   de 2024), desde donde la Y llega a la plataforma, que es donde acaba la Y de OpenStreetMap, hasta la parada.
 *   Del AG1 la raya sigue hacia el oeste y da una vuelta cerrada, de unos seis metros de radio, para dejar el
 *   avión mirando a la salida; esa vuelta no va, y la línea acaba en la parada por el camino corto.
 * - **La GA 2 va sin línea y con `conTractorHasta`**: se sale de ella remolcado hasta el eje de la W, y el juego
 *   no remolca avionetas; en la foto, las de la AG4 y la AG5 están con el morro hacia la calle, metidas de
 *   espaldas. Están en la ficha y no se le dan a nadie. Ver el «Lo que queda» de la H105.
 * - **La Y y la W**, que en OpenStreetMap son calles sin nombre: se les pone el suyo, cada una por el primer punto
 *   de cada trozo. Son calles de plataforma (`callesDePlataforma`): solo rueda por ellas quien sale de un puesto
 *   que las nombra. Y la raya de cada puesto de la GA 1 va también como raya de la Y (`soloPintada`), para que se
 *   salga por ella: ver `conLasCalles`.
 */
const GENERAL_DE_LA_CARTA = {
  GCXO: {
    fuente:
      "AIP España AD 2-GCXO PDC 1.2 (WEF 06-AUG-26), del AG1 al AG7, «A», con su punto; PDC 1.1 (WEF 29-OCT-26), la APN GA 1 (AG1 a AG3) y la APN GA 2 (AG4 a AG7), con la Y y la W; AD 2-GCXO, casilla 20.1.2 (AMDT 413/26, 26-NOV-26), C, I y J: de la GA 1 se sale por sus medios por la Y, y de la GA 2, «by towing to the centre line of TWY W». Las líneas de la GA 1, la raya pintada en la ortofoto PNOA de máxima actualidad, Instituto Geográfico Nacional de España (CC BY 4.0; foto de 2024, vista el 26-11-2026 a 20 cm por píxel); la Y y la W, las calles sin nombre de OpenStreetMap que llegan a ellas.",
    calles: {
      // Por el primer punto de cada trozo, tal como los trae la ficha de OpenStreetMap.
      Y: [
        [-1194, 574.8],
        [-1205.3, 600],
      ],
      W: [
        [-1025.4, 528.2],
        [-1005.7, 581.6],
      ],
    },
    puestos: {
      AG1: { sale: "Y", entrada: [[-1192.7, 634.1], [-1194, 640], [-1196.5, 647.5]] },
      AG2: { sale: "Y", entrada: [[-1192.7, 634.1], [-1190.5, 638.5], [-1186, 641], [-1180.5, 640.5]] },
      AG3: {
        sale: "Y",
        entrada: [
          [-1192.7, 634.1],
          [-1189, 640],
          [-1180, 645],
          [-1170, 647.5],
          [-1155, 646],
          [-1140, 641],
          [-1127, 634],
          [-1120, 627],
          [-1121.5, 619.5],
        ],
      },
      AG4: { conTractorHasta: "W" },
      AG5: { conTractorHasta: "W" },
      AG6: { conTractorHasta: "W" },
      AG7: { conTractorHasta: "W" },
    },
  },
};

/** De dónde sale la raya de un puesto de `GENERAL_DE_LA_CARTA` puesta como calle: por ella se reconoce al volver a juntar. */
const fuenteDeLaRaya = (ref, calle) =>
  `AIP España AD 2-GCXO PDC 1.1 (WEF 29-OCT-26), APN GA 1: la raya del ${ref}, de la ${calle} a la parada, pintada en la losa; trazada sobre la ortofoto PNOA de máxima actualidad, Instituto Geográfico Nacional de España (CC BY 4.0; foto de 2024).`;

/**
 * **Las calles de la ficha con lo de `GENERAL_DE_LA_CARTA`**, en su texto: los trozos sin `ref` que empiezan en uno de
 * sus puntos, con su nombre; y la raya de cada puesto de la GA 1 como raya de la calle por la que se sale, solo pintada
 * (`soloPintada`), como las de la aviación general de Tenerife Sur (H97). Sin ella, el tráfico salía del AG3 en recto por
 * la losa hasta la Y, pasando por encima del AG2: lo que no es calle no lo engancha, y la Y acaba en el borde de la losa.
 * La lista se escribe entera, con el formato que ya tiene; las rayas de otra tirada se quitan antes.
 */
function conLasCalles(texto, ficha, calles, rayas) {
  const cerca = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05;
  const deAntes = new Set(rayas.map((r) => r.fuente));
  const nuevas = ficha.taxiways
    .filter((c) => !(c.manual && deAntes.has(c.fuente)))
    .map((c) => {
      const suya = c.ref == null && Object.entries(calles).find(([, puntos]) => puntos.some((q) => cerca(q, c.path[0])));
      return suya ? { ...c, ref: suya[0] } : c;
    });
  for (const [ref, puntos] of Object.entries(calles))
    for (const q of puntos)
      if (!nuevas.some((c) => c.ref === ref && cerca(q, c.path[0]))) throw new Error(`no está el trozo de la ${ref} que empieza en ${q}`);
  const clave = '"taxiways": ';
  const desde = texto.indexOf(clave);
  if (desde < 0) throw new Error("la ficha no tiene taxiways");
  const abre = desde + clave.length;
  let nivel = 0;
  let cierra = -1;
  for (let i = abre, enCadena = false; i < texto.length; i++) {
    const c = texto[i];
    if (enCadena) {
      if (c === "\\") i++;
      else if (c === '"') enCadena = false;
    } else if (c === '"') enCadena = true;
    else if (c === "[") nivel++;
    else if (c === "]" && --nivel === 0) {
      cierra = i + 1;
      break;
    }
  }
  if (cierra < 0) throw new Error("la lista de taxiways no se cierra");
  const lista = JSON.stringify([...nuevas, ...rayas], null, 2).replace(/\n/g, "\n  ");
  return texto.slice(0, abre) + lista + texto.slice(cierra);
}

/**
 * **El campo cuyos puestos se ponen enteros de la carta** (H85), porque OpenStreetMap no trae
 * ninguno. En Fuerteventura, cero `parking_position`:
 *
 * - **La línea de cada uno**, la que dibuja AD 2-GCFV PDC 1.1 (WEF 11-JUN-26): recta, del eje de
 *   la calle de enfrente a la parada y perpendicular a él, con el morro hacia donde dice la tabla.
 *   El eje es el de OpenStreetMap. Las tres que la carta dibuja sesgadas, con su ángulo medido en
 *   ella: entran hacia el oeste y un poco al sur. Las del 14B y el 51B, que no son rectas, no van.
 * - **El APROAR no es el de otros campos.** Lo llevan también los de salida autónoma —del 31 al
 *   47, al W, que es hacia donde se entra de la T y se sigue a la A; y del 33B al 36B, al E, que
 *   salen «direct TWY T3»—, y en los de retroceso da al W, la terminal, con la calle de detrás de
 *   norte a sur: ahí no acaba ningún empuje. Es hacia dónde mira el avión en el puesto (`morro`).
 * - **Hacia dónde queda al acabar el empuje** lo dice la casilla 20.5 del AD 2, que da por dónde se
 *   sale de cada puesto y por dónde se llega según la pista: «PRKG from 11 to 18: assigned stand -
 *   TWY A1 - L2». Con el morro hacia la L por la A que nombra. Los del 51 («FM TWY A5»), por la A4:
 *   donde él cae, OpenStreetMap llama así a esa calle.
 * - **Los de la plataforma de carga y aviación general** no son de pasarela: la carta dibuja las
 *   suyas en la terminal y ahí, solo el edificio de carga.
 */
const DE_LA_CARTA = {
  GCFV: {
    carta: "AD 2-GCFV PDC 1.1",
    wef: "11-JUN-26",
    /** Cuánto se aparta la línea de la perpendicular, en grados: entrando, a la izquierda. */
    sesgo: { "18B": 4, "19B": 4, 23: 4.6 },
    sinLinea: ["14B", "51B"],
    rodaje: "AD 2-GCFV, casilla 20.5, «Apron taxiing routes» (AMDT 408/26, 09-JUL-26)",
    callesDePlataforma: ["A1", "A2", "A3", "A4", "A5", "B1", "B2", "L1", "L2", "L3", "L4", "L5"],
    /** «APN CARGA & GA», en la carta: la plataforma de carga y aviación general. */
    general: { desde: "51", hasta: "60" },
    /** Por dónde se sale: igual en las dos configuraciones. La primera fila que le toca. */
    salidas: [
      [["33B", "34B", "35B", "36B"], ["T3"]],
      [{ desde: "11", hasta: "18" }, ["A1", "L2"]],
      [{ desde: "19", hasta: "24" }, ["A2", "L3"]],
      [{ desde: "25", hasta: "28" }, ["A3", "L4"]],
      [{ desde: "31", hasta: "36" }, ["A1", "L2"]],
      [{ desde: "41", hasta: "44" }, ["A2", "L3"]],
      [{ desde: "45", hasta: "47" }, ["A3", "L4"]],
      [{ desde: "51", hasta: "51" }, ["A4"]],
      [{ desde: "52", hasta: "56" }, ["B1"]],
      [{ desde: "57", hasta: "60" }, ["B2"]],
    ],
    /** Por dónde se llega, con la pista al norte (01) y al sur (19). */
    llegadas: {
      norte: [
        [["33B", "34B", "35B", "36B"], ["L1", "A1"]],
        [{ desde: "11", hasta: "17" }, ["L1", "A1"]],
        [{ desde: "18", hasta: "22" }, ["L2", "A2"]],
        [{ desde: "23", hasta: "27" }, ["L3", "A3"]],
        [{ desde: "28", hasta: "28" }, ["L4"]],
        [{ desde: "31", hasta: "36" }, ["T3"]],
        [{ desde: "41", hasta: "44" }, ["T4"]],
        [{ desde: "45", hasta: "47" }, ["T5"]],
        [{ desde: "51", hasta: "51" }, ["A4"]],
        [{ desde: "52", hasta: "56" }, ["B1"]],
        [{ desde: "57", hasta: "60" }, ["B2"]],
      ],
      sur: [
        [["33B", "34B", "35B", "36B"], ["L2", "A1"]],
        [{ desde: "11", hasta: "12" }, ["L1", "A1"]],
        [{ desde: "13", hasta: "18" }, ["L2"]],
        [{ desde: "19", hasta: "24" }, ["L3"]],
        [{ desde: "25", hasta: "28" }, ["L4", "A3"]],
        [{ desde: "31", hasta: "36" }, ["T3"]],
        [{ desde: "41", hasta: "44" }, ["T4"]],
        [{ desde: "45", hasta: "47" }, ["T5"]],
        [{ desde: "51", hasta: "51" }, ["A4"]],
        [{ desde: "52", hasta: "56" }, ["B1"]],
        [{ desde: "57", hasta: "60" }, ["B2"]],
      ],
    },
  },
};

/** El APROAR de un puesto por la configuración de pistas, o `null` si no depende de ella. */
function aproarPorConfiguracion(id, a) {
  const r = (APROAR_POR_CONFIGURACION[id] ?? []).find(
    (x) => x.aproar === a.aproar && x.carta.test(a.carta ?? "") && x.observacion.test(a.obs ?? ""),
  );
  return r ? { norte: r.norte, sur: r.sur } : null;
}

/** `282913.9N` → grados. */
function grados(s) {
  const m = /^(\d{2,3})(\d{2})(\d{2}(?:\.\d+)?)([NSEW])$/.exec(s);
  if (!m) throw new Error(`coordenada que no se lee: ${s}`);
  const g = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
  return m[4] === "S" || m[4] === "W" ? -g : g;
}

/** Para casar el `ref` de la ficha con el del AIP: `T-01` y `T1`, `03` y `3`. */
export function refNormalizado(ref) {
  return String(ref ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/(^|[A-Z])0+(\d)/g, "$1$2");
}

/** El número y la letra de un `ref`, para los rangos de Barajas: `T16` → [T, 16, ""]. */
function partes(ref) {
  const m = /^([A-Z]*)(\d+)([A-Z]*)$/.exec(refNormalizado(ref));
  return m ? { letra: m[1], n: Number(m[2]), sufijo: m[3] } : null;
}

function enRango(ref, [desde, hasta]) {
  const p = partes(ref);
  const a = partes(desde);
  const b = partes(hasta);
  if (!p || !a || !b || p.letra !== a.letra) return false;
  return p.n >= a.n && p.n <= b.n;
}

/** La salida publicada, en lo que entiende el juego: «R» empujado, «A» por sus medios, «AR» las dos. */
function salidaDe(s) {
  const t = s.replace(/\(\d+\)/g, "").trim().toUpperCase();
  if (/^PUSH-BACK R$/.test(t) || t === "R") return "R";
  if (t === "A") return "A";
  if (/^(A[-/]R|R[-/]A)$/.test(t)) return "AR";
  return null;
}

/** Un designador de tipo, o varios separados por barra: «A333/AS32», el mayor avión y el mayor helicóptero. */
const ES_TIPO = /^[A-Z][A-Z0-9]{1,3}(\/[A-Z][A-Z0-9]{1,3})*$/;
/** La marca de cambio de la enmienda, que sale en medio del texto: «A21N/_<-_B3XM» es «A21N/B3XM». */
const MARCA_DE_CAMBIO = /_<-_/g;
/** La llamada a una observación pegada al tipo: «B738 (2)». */
const LLAMADA = /\s*\(\d+\)$/;
/** Los que la carta no escribe con su designador de la OACI (Doc 8643), y el suyo: los de Fuerteventura (H85). */
const SU_DESIGNADOR = { ATR72: "AT72", "CL-600": "CL60" };
/** El mayor avión dado por su envergadura: «24 m», en la plataforma de carga de Fuerteventura (H85). */
const ES_ENVERGADURA = /^\d+(\.\d+)? m$/;
/** El mayor avión de una columna, como lo entiende el juego; `null` si la columna es otra cosa. */
function mayorAvion(t) {
  const sin = t.replace(LLAMADA, "");
  if (SU_DESIGNADOR[sin]) return SU_DESIGNADOR[sin];
  return ES_TIPO.test(sin) || ES_ENVERGADURA.test(sin) ? sin : null;
}
/** Hacia dónde queda el morro, o varios: «NE/SW», y «E/W/S» en el 580 y el 582 de Barajas (H76). */
const ES_APROAR = /^([NSEW]{1,2}(\/[NSEW]{1,2})*)$/;
const NADA = /^[–—-]$/;

/**
 * **La tabla de una carta**: cada fila con coordenadas es un puesto. Las columnas no
 * van alineadas igual en todos los campos, así que se lee por campos separados por
 * dos espacios o más, después de la salida —la rampa puede faltar, como en el 51B de
 * Fuerteventura—: el mayor avión, si parece un designador
 * de tipo; hacia dónde queda el morro, si son puntos cardinales; y lo demás, las
 * observaciones.
 */
function filasDe(texto) {
  const hojas = texto.split("\f");
  const filas = [];
  const FILA =
    /^\s*([A-Z0-9][A-Z0-9-]*)\s+(?:(\S+)\s+)?(\d{6}(?:\.\d+)?[NS])\s+(\d{7}(?:\.\d+)?[EW])\s+(Push-Back R(?: \(\d+\))?(?: \/)?|A\/R|A-R|R\/A|R-A|A|R(?: \(\d+\))?)(?=\s|$)(.*)$/;
  for (const hoja of hojas) {
    const cabeza = hoja.split("\n").slice(0, 8).join("\n");
    const carta = /AD 2-[A-Z]{4} PDC [0-9.]+/.exec(cabeza)?.[0] ?? null;
    // La fecha va detrás de «WEF», salvo en alguna hoja en la que el texto sale sin él (GCTS PDC 1.4).
    const wef = /(?:WEF )?(\d{2}-[A-Z]{3}-\d{2})/.exec(cabeza)?.[1] ?? null;
    const lineas = hoja.split("\n");
    for (const [n, linea] of lineas.entries()) {
      const m = FILA.exec(linea);
      if (!m) continue;
      // «Push-Back R /» y debajo «A (4)», o «Push-Back R (6)» y debajo «/ A (7)»: las dos salidas (H85).
      const debajo = lineas[n + 1] ?? "";
      const deLasDos = (m[5].endsWith("/") ? /^\s*A(?: \(\d+\))?\s*$/ : /^\s*\/ A(?: \(\d+\))?\s*$/).test(debajo);
      const salida = deLasDos ? "AR" : salidaDe(m[5].replace(/ \/$/, ""));
      if (!salida) continue;
      const resto = m[6].replace(MARCA_DE_CAMBIO, "").trim().split(/\s{2,}/).filter(Boolean);
      let max = null;
      let aproar = null;
      let llamada = "";
      if (resto.length && (NADA.test(resto[0]) || mayorAvion(resto[0])) && !ES_APROAR.test(resto[0])) {
        const t = resto.shift();
        llamada = LLAMADA.exec(t)?.[0].trim() ?? "";
        max = NADA.test(t) ? null : mayorAvion(t);
      }
      if (resto.length && (NADA.test(resto[0]) || ES_APROAR.test(resto[0]))) {
        const t = resto.shift();
        aproar = NADA.test(t) ? null : t;
      }
      /*
       * «(3) Max span» en el renglón de arriba y «15 m» en el de debajo: la celda partida de los de aviación
       * general de Tenerife Sur (H97). Su columna, en el renglón del puesto, queda en blanco.
       */
      const arriba = /^\s*(\(\d+\)) Max span\s*$/.exec(lineas[n - 1] ?? "");
      const metros = /^\s*(\d+(?:\.\d+)? m)\s*$/.exec(debajo);
      if (max === null && arriba && metros) {
        max = metros[1];
        llamada = arriba[1];
      }
      const obs = [llamada, resto.join(" ").replace(/^[–—-]$/, "").trim()].filter(Boolean).join(" ");
      filas.push({
        ref: m[1],
        lat: grados(m[3]),
        lon: grados(m[4]),
        salida,
        max,
        aproar,
        obs: obs || null,
        carta,
        wef,
      });
    }
  }
  return filas;
}

function contactoDe(id, fila) {
  const regla = CONTACTO[id];
  if (!regla) return null;
  if (regla.observacion) return (fila.obs ?? "").includes(regla.observacion);
  if (regla.rangos) return regla.rangos.some((r) => enRango(fila.ref, r));
  return null;
}

async function extraer(id, textos) {
  const filas = [];
  for (const t of textos) filas.push(...filasDe(await readFile(t, "utf8")));
  const cartas = [...new Map(filas.map((f) => [f.carta, { carta: f.carta, wef: f.wef }])).values()];
  const puestos = filas.map((f) => ({ ...f, contacto: contactoDe(id, f) }));
  await mkdir(AIP, { recursive: true });
  const salida = {
    id,
    fuente: `AIP España (ENAIRE), AD 2-${id}, cartas PDC: características de los puestos de estacionamiento`,
    url: `https://aip.enaire.es/AIP/contenido_AIP/AD/AD2/${id}/`,
    leido: new Date().toISOString().slice(0, 10),
    cartas,
    contacto: CONTACTO[id] ?? null,
    puestos,
  };
  await writeFile(join(AIP, `${id.toLowerCase()}.pdc.json`), JSON.stringify(salida, null, 1) + "\n");
  console.log(`${id}: ${puestos.length} puestos de ${cartas.map((c) => `${c.carta} (WEF ${c.wef})`).join(", ")}`);
}

/** El punto de la línea más cercano a `p`, con su tramo y su distancia. */
function sobreLaLinea(linea, [px, py]) {
  let mejor = { d: Infinity, i: 0, q: null };
  for (let i = 1; i < linea.length; i++) {
    const [ax, ay] = linea[i - 1];
    const [bx, by] = linea[i];
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    const q = [ax + t * dx, ay + t * dy];
    const d = Math.hypot(q[0] - px, q[1] - py);
    if (d < mejor.d) mejor = { d, i, q };
  }
  return mejor;
}

/**
 * **La línea de entrada que acaba en el punto publicado**: cortada allí si el punto
 * está sobre ella, o alargada hasta él si queda pasada su punta —la línea de un puesto
 * en el centro de su raya acaba en ese centro (H60)—. `undefined` si el puesto no tiene
 * raya, y `null` si el punto no está ni en la línea ni en su prolongación.
 */
function lineaHasta(linea, p) {
  if (!linea || linea.length < 2) return undefined;
  const s = sobreLaLinea(linea, p);
  if (s.d <= EN_LA_LINEA) {
    const out = [...linea.slice(0, s.i), p];
    return out.length >= 2 && Math.hypot(out[0][0] - p[0], out[0][1] - p[1]) >= 3 ? out : undefined;
  }
  // ¿Pasada la punta, por su prolongación?
  const a = linea.at(-2);
  const b = linea.at(-1);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const t = ((p[0] - b[0]) * dx + (p[1] - b[1]) * dy) / l;
  const lado = Math.abs((p[0] - b[0]) * dy - (p[1] - b[1]) * dx) / l;
  if (t > 0 && lado <= EN_LA_LINEA) return [...linea, p];
  return null;
}

/** Lo que mide la línea de entrada, m. */
function largo(linea) {
  let l = 0;
  for (let i = 1; i < linea.length; i++) l += Math.hypot(linea[i][0] - linea[i - 1][0], linea[i][1] - linea[i - 1][1]);
  return l;
}

/**
 * **Si el punto está en la otra mitad de la línea**: pasada la punta, por su prolongación y
 * a no más de lo que mide lo que hay, con `LEJOS` de margen. Un puesto de antes de #191 está
 * en el centro de su línea, así que la mitad que falta mide lo mismo que la que hay (H60):
 * la parada de ese puesto está ahí. Devuelve lo que se queda del final, m, o `null`.
 */
function enLaOtraMitad(linea, p) {
  if (!lineaHasta(linea, p)) return null;
  const [ax, ay] = linea.at(-2);
  const [bx, by] = linea.at(-1);
  const pasada = ((p[0] - bx) * (bx - ax) + (p[1] - by) * (by - ay)) / (Math.hypot(bx - ax, by - ay) || 1);
  const l = largo(linea);
  return pasada > 0 && pasada <= l + LEJOS ? Math.abs(l - pasada) : null;
}

/** Lo que puede quedar un punto sin nombre del puesto del que es un tramo, m: dos aviones no caben tan cerca. */
const REPETIDO = 20;

/** Si el punto cae dentro de una plataforma de la ficha. */
function enLaPlataforma(ficha, [x, y]) {
  return [...(ficha.aprons ?? []), ...(ficha.plataformasDeducidas ?? [])].some((a) => {
    let dentro = false;
    const g = a.polygon;
    for (let i = 0, j = g.length - 1; i < g.length; j = i++)
      if (g[i][1] > y !== g[j][1] > y && x < ((g[j][0] - g[i][0]) * (y - g[i][1])) / (g[j][1] - g[i][1]) + g[i][0]) dentro = !dentro;
    return dentro;
  });
}

/**
 * **Cada puesto de la ficha, casado con el de la carta** (H75). Por su `ref`; y lo que no
 * casa así, por el sitio, que es lo único que dice una ficha de antes de #191 de una línea
 * sin nombre:
 *
 * - El que tiene otro `ref` que el de la carta y está donde la carta pone uno que la ficha
 *   no tiene, o en el centro de una línea cuya otra mitad llega a él, es ese: en Lanzarote el
 *   segundo «23» está en el 22, y en La Palma la línea del «2» acaba en el H2.
 * - El que no tiene `ref`, o su `ref` no está en la carta, y está en el centro de una línea
 *   cuya otra mitad llega al punto publicado de un puesto que la ficha trae como nodo y sin
 *   línea, es la línea de ese puesto, repetido: se le da y la copia se quita. Si a donde llega
 *   es al nodo, con el publicado en otra parte, también: el 7 de Lanzarote, publicado cinco
 *   segundos de longitud al oeste de la fila, detrás de la terminal.
 */
function casar(puestos, aip, proyectar) {
  const porRef = new Map();
  for (const p of aip.puestos) {
    const k = refNormalizado(p.ref);
    if (!porRef.has(k)) porRef.set(k, { ...p, xy: proyectar(p.lat, p.lon) });
  }
  const todos = [...porRef.values()];
  const lista = puestos.map((p) => ({ p, a: porRef.get(refNormalizado(p.ref)) ?? null, linea: null, copia: false }));
  const lejosDe = (x) => Math.hypot(x.p.xy[0] - x.a.xy[0], x.p.xy[1] - x.a.xy[1]);
  const enLaFicha = (a, menos) => lista.filter((x) => x !== menos && x.a === a);
  const cambiados = [];
  // El que se llama de otra manera y está donde la carta pone uno que la ficha no tiene.
  for (const x of lista) {
    if (!x.p.ref) continue;
    if (x.a && (lejosDe(x) <= LEJOS || !x.p.entrada || lineaHasta(x.p.entrada, x.a.xy) !== null)) continue;
    if (x.a && !enLaFicha(x.a, x).length) continue;
    const otro = todos
      .filter((a) => a !== x.a && !enLaFicha(a, x).length)
      .find(
        (a) =>
          Math.hypot(x.p.xy[0] - a.xy[0], x.p.xy[1] - a.xy[1]) <= LEJOS ||
          (x.p.entrada && enLaOtraMitad(x.p.entrada, a.xy) !== null),
      );
    if (!otro) continue;
    cambiados.push(`${x.p.ref} → ${otro.ref}`);
    x.a = otro;
    x.p = { ...x.p, ref: otro.ref };
  }
  // La línea sin nombre que llega a un puesto que la ficha trae como nodo y sin línea.
  const repetidos = [];
  for (const x of lista) {
    if (x.a || x.p.ref || !x.p.entrada) continue;
    const sinLinea = lista.filter((n) => n.a && !n.p.entrada && !n.linea && !n.copia);
    const candidatos = [];
    for (const n of sinLinea) {
      const enLaPunta = Math.hypot(x.p.xy[0] - n.a.xy[0], x.p.xy[1] - n.a.xy[1]) <= EN_LA_LINEA;
      const alPublicado = enLaPunta ? 0 : enLaOtraMitad(x.p.entrada, n.a.xy);
      if (alPublicado !== null) candidatos.push({ n, queda: alPublicado });
      else if (lejosDe(n) > LEJOS) {
        const alNodo = enLaOtraMitad(x.p.entrada, n.p.xy);
        if (alNodo !== null) candidatos.push({ n, queda: alNodo });
      }
    }
    candidatos.sort((a, b) => a.queda - b.queda);
    const n = candidatos[0]?.n;
    if (!n) continue;
    n.linea = x.p.entrada;
    x.copia = true;
    repetidos.push(n.p.ref);
  }
  return { lista, cambiados, repetidos };
}

/**
 * **La línea de entrada de un puesto al que se le lleva a su punto publicado**: la suya,
 * cortada o alargada hasta él (`lineaHasta`), y si ya acaba a menos de `EN_LA_LINEA`, con la
 * punta en él. `undefined` si no tiene línea, y `null` si el punto no cae en ella.
 */
function lineaAlPublicado(entrada, p) {
  if (!entrada || entrada.length < 2) return undefined;
  const [bx, by] = entrada.at(-1);
  if (Math.hypot(bx - p[0], by - p[1]) <= EN_LA_LINEA) return [...entrada.slice(0, -1), p];
  return lineaHasta(entrada, p);
}

/** Lo que pueden no ser paralelas dos líneas de puestos vecinos, en grados. */
const PARALELAS = 5;

/**
 * **La línea de un puesto ancho entre dos estrechos** (H75): el que la carta da por incompatible
 * con los dos de al lado es el mismo hueco con otra línea en medio, y la carta la dibuja paralela
 * a las de ellos —el T7 de Lanzarote, entre el T3 y el T4 (AD 2-GCRR PDC 1-1)—. OpenStreetMap no
 * la trae. Solo si los incompatibles con línea quedan a los dos lados y sus líneas son paralelas:
 * es la del más cercano, llevada de lado hasta el punto publicado. `null` si no.
 */
function lineaEntreIncompatibles(xy, obs, conLinea) {
  const refs = /INCOMP\.?\s*(.*)$/.exec(obs ?? "")?.[1]?.split(/[,\s]+/) ?? [];
  const vecinos = refs
    .map((r) => conLinea.get(refNormalizado(r)))
    .filter(Boolean)
    .map((p) => {
      const [ax, ay] = p.entrada.at(-2);
      const [bx, by] = p.entrada.at(-1);
      const l = Math.hypot(bx - ax, by - ay) || 1;
      const u = [(bx - ax) / l, (by - ay) / l];
      const lado = (xy[0] - bx) * -u[1] + (xy[1] - by) * u[0];
      return { p, u, lado };
    });
  if (vecinos.length < 2) return null;
  const [a] = vecinos;
  const paralelas = vecinos.every((v) => a.u[0] * v.u[0] + a.u[1] * v.u[1] >= Math.cos((PARALELAS * Math.PI) / 180));
  if (!paralelas || !vecinos.some((v) => v.lado > 0) || !vecinos.some((v) => v.lado < 0)) return null;
  const n = vecinos.reduce((m, v) => (Math.abs(v.lado) < Math.abs(m.lado) ? v : m));
  const w = [-n.u[1] * n.lado, n.u[0] * n.lado];
  const antes = n.p.entrada
    .map(([x, y]) => [redondear(x + w[0]), redondear(y + w[1])])
    .filter(([x, y]) => (xy[0] - x) * n.u[0] + (xy[1] - y) * n.u[1] >= 3);
  return antes.length ? [...antes, xy] : null;
}

/** Lo que puede quedar de una calle la punta de una línea que nace en ella, m. */
const JUNTO_A_LA_CALLE = 3;

/**
 * **La línea por la que se entra a un puesto que se cruza** (H97, `DE_PASO`): la que OpenStreetMap trae de la calle
 * `entra`, alargada hasta la parada, desde donde deja de torcer —lo de antes es curva, y va en la ficha como raya de
 * la calle—. Si no la trae, que es volver a juntar una ficha ya hecha, `null`: se queda la que tiene.
 */
function lineaDePaso(ficha, p, ref, entra) {
  const calles = (ficha.taxiways ?? []).filter((t) => t.ref === entra);
  const suya = (ficha.parkingPositions ?? []).find(
    (q) =>
      q.ref?.startsWith(`${ref} (`) &&
      q.entrada?.length > 1 &&
      calles.some((t) => sobreLaLinea(t.path, q.entrada[0]).d <= JUNTO_A_LA_CALLE),
  );
  if (!suya) return null;
  return [...(suya.entrada.length > 2 ? suya.entrada.slice(-1) : suya.entrada), p.xy];
}

async function juntar(id) {
  const ruta = join(SALIDA, `${id.toLowerCase()}.aero.json`);
  const texto = await readFile(ruta, "utf8");
  const ficha = JSON.parse(texto);
  const aip = JSON.parse(await readFile(join(AIP, `${id.toLowerCase()}.pdc.json`), "utf8"));
  const proyectar = proyector(ficha.origin.lat, ficha.origin.lon);
  const movidos = [];
  const sueltos = [];
  const puestos = [];
  // Los de la aviación general que la ficha no trae se rehacen cada vez (H105, `GENERAL_DE_LA_CARTA`).
  const general = GENERAL_DE_LA_CARTA[id];
  const deOsm = ficha.parkingPositions.filter((p) => !(p.manual && general?.puestos[p.ref]));
  const cuenta = { puestos: deOsm.length, casan: 0, movidos: 0, sinLinea: 0, copias: 0, sinAip: [] };
  const { lista, cambiados, repetidos } = casar(deOsm, aip, proyectar);
  const cabos = [];
  for (const { p, a, linea: suLinea, copia } of lista) {
    if (copia) {
      cuenta.copias++;
      continue;
    }
    // El cabo de la línea de uno que se cruza, que OpenStreetMap da como otro puesto. Ver `DE_PASO`.
    const deCual = /^(\S+) \((\S+)\)$/.exec(p.ref ?? "");
    if (!a && deCual && DE_PASO[id]?.puestos[deCual[1]]) {
      cabos.push(p.ref);
      continue;
    }
    /*
     * El que no tiene nombre ni línea, no está en la carta y la ficha lo trae a un paso de uno que
     * sí está, no es otro puesto: es el centro de un tramo de la raya de ese, que la ficha de antes
     * de #191 apuntaba aparte. En La Palma, el de la entrada del 14 quedaba a seis metros del eje
     * de la R, y con el 14 en su punto las avionetas salían de ahí; en Lanzarote, diez sobre las
     * líneas de los de salida autónoma.
     */
    if (
      !a &&
      !p.ref &&
      !p.entrada &&
      ficha.parkingPositions.some((q) => q.ref && q.aip?.carta && Math.hypot(q.xy[0] - p.xy[0], q.xy[1] - p.xy[1]) <= REPETIDO)
    ) {
      sueltos.push(`${p.xy}`);
      continue;
    }
    const { aip: _viejo, entradaDeducida, ...limpio } = p;
    // La que se dedujo en otra tirada se vuelve a deducir, abajo.
    if (entradaDeducida) delete limpio.entrada;
    if (!a) {
      cuenta.sinAip.push(p.ref ?? "—");
      /*
       * Si el AIP dice cuáles son de contacto, uno que no está en la carta no lo es: el lavadero
       * y los puestos de prueba de motores de Barajas, o un nodo sin `ref` de OpenStreetMap junto
       * a los de pasarela de Los Rodeos. Lo demás de él no se sabe.
       */
      const suya = conPasarela(id, p.ref);
      puestos.push(
        CONTACTO[id]
          ? { ...limpio, aip: { salida: null, max: null, contacto: false, carta: null } }
          : suya === undefined
            ? limpio
            : { ...limpio, aip: { salida: null, max: null, contacto: null, pasarela: suya, carta: null } },
      );
      continue;
    }
    cuenta.casan++;
    const publicado = a.xy;
    const lejos = Math.hypot(p.xy[0] - publicado[0], p.xy[1] - publicado[1]);
    const nuevo = { ...limpio, aip: { salida: a.salida, max: a.max, contacto: a.contacto, carta: a.carta } };
    // Y si la carta no dice si tiene pasarela, lo que se ve (H87).
    const suya = a.contacto === null ? conPasarela(id, a.ref) : undefined;
    if (suya !== undefined) nuevo.aip.pasarela = suya;
    // Hacia dónde queda el morro al acabar el empuje, si la carta lo da (H76).
    if (a.aproar) {
      nuevo.aip.aproar = a.aproar;
      const segun = aproarPorConfiguracion(id, a);
      if (segun) nuevo.aip.aproarPorPista = segun;
    } else if (APROAR_DE_LA_CASILLA[id] && a.salida !== "A") {
      // Y si lo da la casilla 20 para todos los de retroceso, según la pista (H88).
      const { aproar, norte, sur } = APROAR_DE_LA_CASILLA[id];
      nuevo.aip.aproar = aproar;
      nuevo.aip.aproarPorPista = { norte, sur };
    }
    /*
     * Al punto publicado, por su raya: cortada o alargada hasta él. Si el puesto tiene raya y
     * el punto publicado no cae en ella ni en su prolongación, la ficha y el AIP no dicen el
     * mismo puesto —una raya de OpenStreetMap que es de otro, o un `ref` cambiado—, y no se
     * mueve: se cuenta, y lleva lo lejos que queda (`lejos`). El que no tiene raya, al punto
     * publicado si cae en la plataforma de la ficha; si no, tampoco. Y el que acaba de recibir
     * la suya, a donde ella acaba, aunque esté cerca: la raya acaba en el puesto.
     */
    const entrada = suLinea ?? limpio.entrada;
    const mover = lejos > LEJOS || suLinea !== null;
    const linea = mover ? lineaAlPublicado(entrada, publicado) : undefined;
    if (mover && (linea === null || (!entrada && !enLaPlataforma(ficha, publicado)))) {
      cuenta.sinLinea++;
      movidos.push(`${p.ref} ${lejos.toFixed(0)} m (fuera de su raya, sin mover)`);
      nuevo.aip.lejos = Math.round(lejos);
      if (suLinea) nuevo.entrada = lineaHasta(suLinea, p.xy) ?? suLinea;
    } else if (mover) {
      nuevo.xy = publicado;
      // La raya acaba en el punto del puesto; si de ella no quedan tres metros, sin raya.
      if (linea) nuevo.entrada = linea;
      else delete nuevo.entrada;
      cuenta.movidos++;
      movidos.push(`${p.ref} ${lejos.toFixed(0)} m`);
    }
    // Y los que la casilla 20 saca por delante y mete por su raya (H95).
    const deFrente = RODAJE_DE_LA_CASILLA[id]?.deFrente;
    if (deFrente && a.salida === "A" && enRango(a.ref, [deFrente.desde, deFrente.hasta])) {
      nuevo.aip.salePor = deFrente.salePor;
      nuevo.aip.llegaPor = deFrente.llegaPor;
    }
    // Y los de la plataforma de aviación general, que se cruzan (H97).
    const dePaso = DE_PASO[id]?.puestos[a.ref];
    if (dePaso) {
      const entrando = [DE_PASO[id].plataforma, dePaso.entra];
      nuevo.aip.uso = DE_PASO[id].uso;
      nuevo.aip.salePor = [dePaso.sale, DE_PASO[id].plataforma];
      nuevo.aip.llegaPor = { norte: entrando, sur: entrando };
      const linea = lineaDePaso(ficha, p, a.ref, dePaso.entra);
      if (linea) nuevo.entrada = linea;
    }
    // Y los de salir por sus medios cuya calle publica la casilla (H103).
    const autonomo = POR_SUS_MEDIOS[id];
    if (autonomo?.calle && autonomo.puestos.includes(a.ref)) {
      nuevo.aip.salePor = [autonomo.calle];
      nuevo.aip.llegaPor = { norte: [autonomo.calle], sur: [autonomo.calle] };
    }
    puestos.push(nuevo);
  }
  // Dos puestos con el mismo `ref` en el mismo punto: el del centro de su línea y el de
  // su nodo, que la ficha de antes de #191 repetía. Se queda el primero.
  const vistos = new Map();
  const finales = [];
  for (const p of puestos) {
    const k = refNormalizado(p.ref);
    const otro = p.ref ? vistos.get(k) : null;
    if (otro && Math.hypot(otro.xy[0] - p.xy[0], otro.xy[1] - p.xy[1]) < 1) {
      cuenta.copias++;
      continue;
    }
    if (p.ref && p.aip) vistos.set(k, p);
    finales.push(p);
  }
  // Y los de la aviación general de la carta, en su punto publicado (H105), con su raya como raya de la calle.
  const rayas = [];
  for (const a of general ? aip.puestos.filter((q) => general.puestos[q.ref]) : []) {
    const xy = proyectar(a.lat, a.lon);
    const { sale, entrada, conTractorHasta } = general.puestos[a.ref];
    const suyo = { salida: a.salida, max: a.max, contacto: false, carta: a.carta, uso: "general" };
    if (sale) {
      suyo.salePor = [sale];
      suyo.llegaPor = { norte: [sale], sur: [sale] };
    }
    if (conTractorHasta) suyo.conTractorHasta = conTractorHasta;
    finales.push({ ref: a.ref, xy, ...(entrada ? { entrada: [...entrada, xy] } : {}), manual: true, aip: suyo });
    if (sale && entrada) {
      const raya = { ref: sale, kind: "taxilane", widthM: null, soloPintada: true, manual: true, fuente: fuenteDeLaRaya(a.ref, sale) };
      rayas.push({ ...raya, path: [...entrada, xy] });
    }
  }
  // Y el ancho entre dos incompatibles, sin línea en OpenStreetMap, con una paralela a las suyas.
  const conLinea = new Map(finales.filter((p) => p.ref && p.entrada && p.aip && !p.aip.lejos).map((p) => [refNormalizado(p.ref), p]));
  const deducidas = [];
  for (const { p: deAntes, a } of lista) {
    const p = a && finales.find((q) => q.ref === deAntes.ref && !q.entrada && q.aip?.carta === a.carta && q.aip.lejos === undefined);
    if (!p || a.salida === "A") continue;
    const linea = lineaEntreIncompatibles(p.xy, a.obs, conLinea);
    if (!linea) continue;
    p.entrada = linea;
    p.entradaDeducida = true;
    deducidas.push(p.ref);
  }
  const meta = {
    fuente: aip.fuente,
    url: aip.url,
    leido: aip.leido,
    cartas: aip.cartas,
    ...(APROAR_DE_LA_CASILLA[id] ? { aproar: APROAR_DE_LA_CASILLA[id].fuente, puertasLibres: APROAR_DE_LA_CASILLA[id].puertasLibres } : {}),
    ...(RODAJE_DE_LA_CASILLA[id]
      ? {
          rodaje: RODAJE_DE_LA_CASILLA[id].fuente,
          callesDePlataforma: [RODAJE_DE_LA_CASILLA[id].primeraPuerta.calle],
          primeraPuerta: RODAJE_DE_LA_CASILLA[id].primeraPuerta,
        }
      : {}),
    ...(DE_PASO[id] ? { general: DE_PASO[id].fuente } : {}),
    ...(general ? { general: general.fuente } : {}),
    ...(NUNCA_A_LA_VEZ[id] ? { nuncaALaVez: NUNCA_A_LA_VEZ[id] } : {}),
    ...(POR_SUS_MEDIOS[id] ? { porSusMedios: { puestos: POR_SUS_MEDIOS[id].puestos, fuente: POR_SUS_MEDIOS[id].fuente } } : {}),
    ...(POR_SUS_MEDIOS[id]?.calle && !RODAJE_DE_LA_CASILLA[id]
      ? { callesDePlataforma: [POR_SUS_MEDIOS[id].calle, ...Object.keys(general?.calles ?? {})] }
      : {}),
    ...fuenteDeLasPasarelas(id),
  };
  // Lo del AIP, al final de cada puesto: la ficha sale igual se junte las veces que se junte.
  const ordenados = finales.map(({ aip: suyo, ...p }) => (suyo ? { ...p, aip: suyo } : p));
  const conCalles = general ? conLasCalles(texto, ficha, general.calles, rayas) : texto;
  await writeFile(ruta, conLosPuestos(conCalles, ordenados, meta));
  console.log(
    `${id}: ${cuenta.casan} de ${cuenta.puestos} casan con el AIP; ${cuenta.movidos} a su punto publicado` +
      ` (${cuenta.sinLinea} lejos y fuera de su raya, sin mover), ${cuenta.copias} copias quitadas; sin AIP: ${cuenta.sinAip.join(" ") || "ninguno"}${CONTACTO[id] && cuenta.sinAip.length ? " (no son de contacto)" : ""}`,
  );
  if (cabos.length) console.log(`  cabos de la línea de un puesto que se cruza, en él: ${cabos.join(", ")}`);
  if (cambiados.length) console.log(`  con otro nombre en la carta: ${cambiados.join(", ")}`);
  if (repetidos.length) console.log(`  con la línea de su copia sin nombre: ${repetidos.join(", ")}`);
  if (sueltos.length) console.log(`  sin nombre y sin línea, junto a uno de la carta, quitados: ${sueltos.join(" · ")}`);
  if (deducidas.length) console.log(`  con la línea deducida de sus incompatibles: ${deducidas.join(", ")}`);
  if (movidos.length) console.log(`  movidos: ${movidos.join(", ")}`);
}

const CARDINALES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** Hacia dónde apunta un rumbo, en grados del norte a la derecha, en puntos cardinales. */
const enCardinales = (grados) => CARDINALES[Math.round((((grados % 360) + 360) % 360) / 45) % 8];
const rumboEntre = ([ax, ay], [bx, by]) => (Math.atan2(bx - ax, by - ay) * 180) / Math.PI;
const diferencia = (a, b) => ((a - b + 540) % 360) - 180;

/** Lo que se alarga el final de un eje para que lo encuentre la línea de un puesto, y lo más que se busca, m. */
const ALARGA_EL_EJE = 5;
const HASTA_LA_CALLE = 220;
/** Lo atravesada que tiene que llegar la línea a la calle, en grados. */
const ATRAVESADA = 60;

/**
 * **La línea de un puesto de la carta** (H85, `DE_LA_CARTA`): del eje de la calle que tiene detrás
 * a su parada, perpendicular a él —más su sesgo— y con el morro al punto cardinal publicado.
 * `null` si detrás no hay calle.
 */
function lineaDeLaCarta(ficha, xy, morro, sesgo) {
  const cardinal = CARDINALES.indexOf(morro) * 45;
  const cruza = (rumbo, calle) => {
    let mejor = null;
    const a = (rumbo * Math.PI) / 180;
    const d = [-Math.sin(a), -Math.cos(a)];
    for (let i = 1; i < calle.length; i++) {
      const [p, q] = [calle[i - 1], calle[i]];
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (l < 1e-6) continue;
      const u = [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
      const den = d[0] * u[1] - d[1] * u[0];
      if (Math.abs(den) < Math.sin((ATRAVESADA * Math.PI) / 180)) continue;
      const w = [p[0] - xy[0], p[1] - xy[1]];
      const t = (w[0] * u[1] - w[1] * u[0]) / den;
      const k = (w[0] * d[1] - w[1] * d[0]) / den;
      const desde = i === 1 ? -ALARGA_EL_EJE : 0;
      const hasta = l + (i === calle.length - 1 ? ALARGA_EL_EJE : 0);
      if (t < 3 || t > HASTA_LA_CALLE || k < desde || k > hasta) continue;
      if (!mejor || t < mejor.t) mejor = { t, eje: rumboEntre(p, q), punto: [redondear(xy[0] + d[0] * t), redondear(xy[1] + d[1] * t)] };
    }
    return mejor;
  };
  const primera = (rumbo) =>
    (ficha.taxiways ?? []).map((t) => cruza(rumbo, t.path)).reduce((m, c) => (c && (!m || c.t < m.t) ? c : m), null);
  const eje = primera(cardinal)?.eje;
  if (eje === undefined) return null;
  const perpendicular = [eje + 90, eje - 90].find((r) => Math.abs(diferencia(r, cardinal)) < 45);
  const c = perpendicular === undefined ? null : primera(perpendicular - sesgo);
  return c ? [c.punto, xy] : null;
}

/** La fila de `lista` que le toca a un puesto: su ref, o el tramo de números en el que cae. */
const filaDe = (lista, ref) =>
  lista.find(([quien]) => (Array.isArray(quien) ? quien.includes(ref) : enRango(ref, [quien.desde, quien.hasta])))?.[1] ?? null;

/**
 * **Hacia dónde queda el morro al acabar el empuje, de la ruta que publica la casilla 20** (H85):
 * por la calle de la plataforma que nombra, hacia la que sale de ella.
 */
function haciaSuSalida(ficha, [plataforma, sale]) {
  if (!sale) return null;
  const puntas = (ref) => (ficha.taxiways ?? []).filter((t) => t.ref === ref).map((t) => t.path);
  const eje = puntas(plataforma)[0];
  if (!eje) return null;
  const [a, b] = [eje[0], eje[eje.length - 1]];
  const lejos = (p) => Math.min(...puntas(sale).flat().map((q) => Math.hypot(q[0] - p[0], q[1] - p[1])));
  return enCardinales(lejos(b) < lejos(a) ? rumboEntre(a, b) : rumboEntre(b, a));
}

/** Los puestos de la carta, en una ficha que no los trae de OpenStreetMap. Ver `DE_LA_CARTA`. */
async function poner(id) {
  const regla = DE_LA_CARTA[id];
  if (!regla) throw new Error(`${id}: no es de los que se ponen de la carta (DE_LA_CARTA)`);
  const ruta = join(SALIDA, `${id.toLowerCase()}.aero.json`);
  const texto = await readFile(ruta, "utf8");
  const ficha = JSON.parse(texto);
  const aip = JSON.parse(await readFile(join(AIP, `${id.toLowerCase()}.pdc.json`), "utf8"));
  const proyectar = proyector(ficha.origin.lat, ficha.origin.lon);
  const sinLinea = [];
  const puestos = aip.puestos.map((a) => {
    const xy = proyectar(a.lat, a.lon);
    const linea =
      a.aproar && !regla.sinLinea.includes(a.ref) ? lineaDeLaCarta(ficha, xy, a.aproar, regla.sesgo[a.ref] ?? 0) : null;
    if (!linea) sinLinea.push(a.ref);
    const salePor = filaDe(regla.salidas, a.ref);
    const general = enRango(a.ref, [regla.general.desde, regla.general.hasta]);
    const suyo = { salida: a.salida, max: a.max, contacto: general ? false : a.contacto, carta: a.carta };
    const conSuya = suyo.contacto === null ? conPasarela(id, a.ref) : undefined;
    if (conSuya !== undefined) suyo.pasarela = conSuya;
    if (a.aproar) suyo.morro = a.aproar;
    // Los que dan su mayor avión por envergadura, de las avionetas; los de un tipo, de carga y ambulancia.
    if (general) suyo.uso = ES_ENVERGADURA.test(a.max ?? "") ? "general" : "carga";
    if (salePor) {
      const aproar = a.salida !== "A" ? haciaSuSalida(ficha, salePor) : null;
      if (aproar) suyo.aproar = aproar;
      suyo.salePor = salePor;
    }
    const norte = filaDe(regla.llegadas.norte, a.ref);
    const sur = filaDe(regla.llegadas.sur, a.ref);
    if (norte && sur) suyo.llegaPor = { norte, sur };
    return { ref: a.ref, xy, ...(linea ? { entrada: linea, entradaDeducida: true } : {}), manual: true, aip: suyo };
  });
  const meta = {
    fuente: aip.fuente,
    url: aip.url,
    leido: aip.leido,
    cartas: [...aip.cartas, { carta: regla.carta, wef: regla.wef }],
    rodaje: regla.rodaje,
    callesDePlataforma: regla.callesDePlataforma,
    ...fuenteDeLasPasarelas(id),
  };
  await writeFile(ruta, conLosPuestos(texto, puestos, meta));
  console.log(`${id}: ${puestos.length} puestos de la carta, ${puestos.length - sinLinea.length} con su línea; sin ella: ${sinLinea.join(" ") || "ninguno"}`);
}

/**
 * **La ficha con estos puestos**, tocando solo su lista y la clave `aipPuestos` y
 * dejando el resto del texto como estaba (la ficha no es `JSON.stringify` entera). La
 * de `lineas-de-entrada.mjs`, con la fuente delante de la lista.
 */
function conLosPuestos(texto, puestos, meta) {
  let t = texto.replace(/\n  "aipPuestos": .*,\n/, "\n");
  const clave = '"parkingPositions": ';
  const desde = t.indexOf(clave);
  if (desde < 0) throw new Error("la ficha no tiene parkingPositions");
  const abre = desde + clave.length;
  let nivel = 0;
  let cierra = -1;
  for (let i = abre, enCadena = false; i < t.length; i++) {
    const c = t[i];
    if (enCadena) {
      if (c === "\\") i++;
      else if (c === '"') enCadena = false;
    } else if (c === '"') enCadena = true;
    else if (c === "[") nivel++;
    else if (c === "]" && --nivel === 0) {
      cierra = i + 1;
      break;
    }
  }
  if (cierra < 0) throw new Error("la lista de parkingPositions no se cierra");
  const lista = JSON.stringify(puestos, null, 2).replace(/\n/g, "\n  ");
  return t.slice(0, desde) + `"aipPuestos": ${JSON.stringify(meta)},\n  ` + clave + lista + t.slice(cierra);
}

const [modo, id, ...resto] = process.argv.slice(2);
if (modo === "extraer" && id && resto.length) await extraer(id.toUpperCase(), resto);
else if (modo === "poner" && id) await poner(id.toUpperCase());
else if (modo === "juntar" && id) {
  for (const i of [id, ...resto]) await juntar(i.toUpperCase());
}
else {
  console.error("uso: puestos-del-aip.mjs extraer ICAO carta.txt […] | juntar ICAO […] | poner ICAO");
  process.exit(1);
}
