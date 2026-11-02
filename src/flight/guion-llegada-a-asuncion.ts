/**
 * **El tercer capítulo del vuelo largo: «Amanecer y llegada a Asunción»** (ADR
 * 0023). Se abre con `?inicio=4&capitulo=3` o con su ficha de «¿A qué jugás?»: el
 * JAZ 110 Tijereta, con Ara de pasaje, ya en crucero, y de ahí al puesto de
 * Pettirossi.
 *
 * ## Lo de antes de ver el mundo, bajo láminas
 *
 * El desayuno de verdad es hacia las 9 h 40 de vuelo, sobre Brasil, y el juego no
 * tiene Brasil dibujado: el capítulo entra en el mundo del Paraguay hacia las 10 h
 * 35. Así que todo lo de la mañana —el despertar, el mapa, el desayuno, el agua, el
 * huso, el ecuador, las piernas y el desfase— se cuenta con el mundo tapado, y la
 * ventanilla se abre después. Ver `apertura` y `ui/lamina-grande.ts`. El vuelo sigue
 * debajo a su paso, y el reloj no se toca: la lámina tapa una hora de cuento, no una
 * hora de vuelo.
 *
 * ## Lo que depende de hoy no se escribe fijo
 *
 * Con la fecha de verdad, de mayo a agosto se aterriza de noche cerrada, y con el
 * viento del sur se entra por la 20 y todo cambia de lado. Así que:
 *
 * - Lo del sol sale de la cuenta (`ruta-larga.ts`, a través de `DelVueloLargo`), y
 *   el río y el Chaco no se nombran a oscuras.
 * - Lo que se ve al llegar lo nombra Ara **solo si se ve por su cristal**, preguntando
 *   al motor de lo que se ve. Ninguna frase dice izquierda o derecha, y si hoy el río
 *   cae al otro lado, hoy Ara no lo nombra.
 *
 * ## Quién dice qué
 *
 * Idaira, de tú, y Derlis, de vos, atienden en persona: ninguno de los dos por
 * megafonía, y los dos con lo suyo de seguridad encima. La comandante no le contesta a
 * nadie: da su anuncio arriba, y abajo solo lo de volar. Ara, sin género: «me dormí»,
 * nunca «dormido».
 *
 * ## Ara no se duerme aquí
 *
 * El capítulo empieza con Ara recién despierta, y el motor, con catorce minutos
 * de crucero en silencio delante, la mandaría a dormir para bajar. Bajando,
 * nunca durmiendo: ver `sinSiesta`.
 */

import type { Linea } from "./conversacion";
import { GUION_TENERIFE_LA_PALMA, LADO_DE_ARA } from "./guion-tenerife-la-palma";
import {
  acabaDePonerse,
  bajando,
  enLaFinal,
  PREPARAR_LA_CABINA,
  type DefCharla,
  type DefMomento,
  type GuionDelPasaje,
  type LecturaDelPasaje,
} from "./motor-del-pasaje";

/** El avión de esta ruta. */
export const AVION_DEL_LARGO = "jaz-110";
/**
 * **El mundo de la llegada**: el del Paraguay entero. No hay pasillo de crucero
 * todavía, y el capítulo entra donde este mundo ya tiene suelo debajo. Ver
 * `entradaDeLaLlegada` en `ruta-larga.ts`.
 */
export const MUNDO_DE_LA_LLEGADA = "pettirossi";

/**
 * **La hora del cuento de lo de antes de ver el mundo**, s del despegue: el mapa de la
 * pantalla enseña dónde va el avión al desayunar, que es sobre Brasil, y no dónde va
 * el mundo que está debajo de la lámina. Plan, 1.2.
 */
export const SE_DESAYUNA_A = 9 * 3600 + 40 * 60;

/**
 * **El Chaco que se ve al llegar**: enfrente de la bahía de Asunción, a unos tres
 * kilómetros de la orilla, ya en la Región Occidental. Lo que se tiene delante desde
 * la final, y no los sitios del hito `chaco`, que están muy al norte.
 */
export const CHACO_ENFRENTE = { lat: -25.24, lon: -57.7 } as const;
/**
 * **El río que se ve al llegar**: el cauce de delante de la bahía de Asunción. El hito
 * `rio-paraguay` sigue la línea de Natural Earth, que por aquí es de trazo grueso y
 * va al otro lado de esta final en su trozo de más al sur: medido en el banco, por el
 * cristal no se veía nunca.
 */
export const RIO_ENFRENTE = { lat: -25.275, lon: -57.665 } as const;

export type MomentoDeLaLlegada =
  | "despertar"
  | "mapa"
  | "desayuno"
  | "agua"
  | "huso"
  | "ecuador"
  | "piernas"
  | "desfase"
  | "ventanilla"
  | "anuncio"
  | "bajada"
  | "oidos"
  | "aproximacion"
  | "flaps"
  | "aterrizando"
  | "toma"
  | "llegada"
  | "hora"
  | "impacientes"
  | "seLevantan"
  | "luz"
  | "suelto"
  | "gracias"
  | "puesto"
  | "fin";

/** Lo que Ara nombra al llegar, cuando se ve. Y el sol, si sale bajando. */
export type CharlaDeLaLlegada = "amanece" | "rio" | "chaco" | "asuncion" | "asuncionNoche";

const ara = (clave: string): Linea => ({ quien: "ara", clave: `inicio.ara.pasaje.${clave}` });
const delLargo = (clave: string): Linea => ara(`largo.${clave}`);
const tripulante = (clave: string): Linea => ({ quien: "tripulacion", clave: `inicio.tripulacion.pasaje.cerca.${clave}` });
/** Idaira, en persona: la de Canarias, que ya cuidó a Ara en el primer vuelo. */
const idaira = (clave: string): Linea => tripulante(`largo.${clave}`);
/** Derlis, en persona: la voz de la tripulación del Paraguay, sin el altavoz del techo. */
const derlis = (clave: string): Linea => ({ quien: "tripulacion", clave: `inicio.tripulacion.pasaje.derlis.${clave}` });
/** Un anuncio de la megafonía de siempre, montado por el juego con el campo de hoy. Ver `loQueDiceLaMegafonia`. */
const anuncio = (clave: string): Linea => ({
  quien: clave.startsWith("tripulacion.") ? "tripulacion" : "mama",
  clave,
  megafonia: true,
});
/** La comandante, por la megafonía, con una frase de este vuelo. */
const comandante = (clave: string): Linea => ({ quien: "mama", clave: `comandante.largo.${clave}`, megafonia: true });
const con = (l: Linea, dibujo: string): Linea => ({ ...l, dibujo });

/** Tocado, lo que tarda en decirse: las ruedas, y la reversa ya rugiendo. Como en el vuelo corto. */
const DESPUES_DE_TOCAR = 1.2;
/** Parado en el puesto, lo que se deja ver parar antes de la gente que se levanta, s. */
const PARADO_DEL_TODO = 3;
/** Lo que se oyen las hebillas antes de que Ara lo note, s. */
const SE_OYEN_LAS_HEBILLAS = 6;
/** Con los motores ya parados, lo que tarda la comandante en apagar la luz, s. */
const APAGA_LA_LUZ = 6;
/** Y del *ding* a que Ara se suelte el cinturón, s. */
const TRAS_EL_DING = 1;
/** Lo que se deja mirar una lámina nueva antes de que hablen, s. */
const SE_MIRA = 1;
/** Lo que se deja mirar por la ventanilla, ya abierta, antes del anuncio, s. */
const SE_MIRA_POR_LA_VENTANILLA = 4;
/** Cuando la cabina baja a esto, m/s, ya se nota en los oídos. Como en el vuelo corto. */
const SE_NOTAN_LOS_OIDOS = -0.9;

/**
 * **Cómo está el sol para contarlo**, grados: de noche con el ocaso civil, el mismo
 * criterio con el que el juego enciende sus luces (`esDeNoche`); amaneciendo desde que
 * asoma en el horizonte del suelo y hasta que ya está alto; y de día a partir de ahí.
 * Entre la noche y el amanecer, el rato de clarear, no se dice nada: no es ni lo uno ni
 * lo otro. Sin la cuenta —las pruebas que no la dan— tampoco.
 */
const DE_NOCHE = -6;
const YA_ASOMA = -1;
const YA_ALTO = 8;
const deNoche = (l: LecturaDelPasaje): boolean => !!l.largo && l.largo.sol < DE_NOCHE;
const amaneciendo = (l: LecturaDelPasaje): boolean =>
  !!l.largo && l.largo.sol >= YA_ASOMA && l.largo.sol < YA_ALTO && l.largo.solPorMiVentanilla;
const deDia = (l: LecturaDelPasaje): boolean => !!l.largo && l.largo.sol >= YA_ALTO;
/** **Si hay luz para ver el suelo**, con el mismo criterio: el río y el Chaco, a oscuras, no se nombran. */
const conLuz = (l: LecturaDelPasaje): boolean => !!l.largo && l.largo.sol >= DE_NOCHE;

/** En cada momento de esto, callados un rato: una lámina no cambia a media frase. */
const callados = (_l: LecturaDelPasaje, e: { readonly callaDesde: number }): boolean => e.callaDesde >= SE_MIRA;

const elDesayuno = (l: LecturaDelPasaje): string => (l.largo && !l.largo.conSolAlDesayunar ? "desayuno-noche" : "desayuno");
const elHuso = (l: LecturaDelPasaje): string => (l.largo?.temporada === "verano" ? "huso-verano" : "huso-invierno");

type Momento = DefMomento<MomentoDeLaLlegada, MomentoDeLaLlegada, CharlaDeLaLlegada>;
type Charla = DefCharla<MomentoDeLaLlegada, CharlaDeLaLlegada>;

const MOMENTOS: readonly Momento[] = [
  /*
   * **El despertar.** Lo primero que se ve es la cabina a oscuras, que se va
   * encendiendo como la enciende la tripulación: la luz sube poco a poco hasta el
   * color del amanecer. Es la frase que llevaba tiempo grabada y muda.
   */
  {
    id: "despertar",
    cuando: () => true,
    tapaSegun: elDesayuno,
    enciende: true,
    lineas: [tripulante("despertar"), delLargo("meDormi")],
  },
  /*
   * **El mapa**, en la pantalla de verdad del asiento de delante: es de las pocas
   * cosas de por dentro que se pueden enseñar en vez de dibujar. Ver
   * `SE_DESAYUNA_A`.
   */
  {
    id: "mapa",
    cuando: callados,
    tapa: null,
    plano: "respaldo",
    lineas: [idaira("mapa"), delLargo("mapa")],
  },
  {
    id: "desayuno",
    cuando: callados,
    tapaSegun: elDesayuno,
    lineas: [derlis("desayuno"), delLargo("chipa")],
  },
  // El agua: lo seco y un vasito cuando haya sed. Que el avión deshidrata es falso, y lo dice la OMS.
  {
    id: "agua",
    cuando: callados,
    lineas: [delLargo("nariz"), derlis("agua")],
  },
  {
    id: "huso",
    cuando: callados,
    tapaSegun: elHuso,
    lineas: [delLargo("huso"), idaira("huso"), idaira("husoInvierno")],
    segun: (l) => [delLargo("huso"), idaira("huso"), idaira(l.largo?.temporada === "verano" ? "husoVerano" : "husoInvierno")],
  },
  // Lo del agua que gira al revés en el lavabo no se cuenta: es falso, por mucho que se repita.
  {
    id: "ecuador",
    cuando: callados,
    tapa: "ecuador",
    lineas: [idaira("ecuador1"), delLargo("ecuador"), idaira("ecuador2")],
  },
  {
    id: "piernas",
    cuando: callados,
    tapaSegun: elDesayuno,
    lineas: [con(derlis("piernas"), "piernas")],
  },
  // Nada de melatonina, que no se recomienda, ni de que los niños se adapten antes, que no hay pruebas.
  {
    id: "desfase",
    cuando: callados,
    tapaSegun: elHuso,
    lineas: [derlis("desfase")],
  },
  /*
   * **Y se abre la ventanilla**, y Ara dice lo que hay: de día, amaneciendo o de
   * noche, según la cuenta de hoy. Es lo que abre el mundo: ver `apertura`.
   */
  {
    id: "ventanilla",
    cuando: callados,
    tapa: null,
    plano: "ventanilla",
    lineas: [],
    segun: (l) => (deDia(l) ? [delLargo("deDia")] : amaneciendo(l) ? [delLargo("amanece")] : deNoche(l) ? [delLargo("deNoche")] : []),
  },
  /*
   * **El anuncio de la comandante**, unos cuarenta minutos antes de tocar, con el
   * punto de descenso todavía por delante. Ver `anuncioDeLaBajadaDelVueloLargo`.
   */
  {
    id: "anuncio",
    cuando: (_l, e) => e.desdeQueSeDijo("ventanilla") >= SE_MIRA_POR_LA_VENTANILLA && e.callaDesde >= SE_MIRA,
    caduca: (l) => bajando(l.tramo),
    lineas: [],
    segun: (l) => {
      const dicho = l.largo?.anuncioDeLaBajada();
      return dicho ? [{ ...comandante("anuncio"), clave: dicho.clave, texto: dicho.texto, relleno: dicho.relleno }] : [];
    },
  },
  {
    /*
     * **Empezamos a bajar**, que es lo que espera el modo rápido del crucero y lo
     * que enciende el cartel. Ya lo dijo la comandante: aquí solo suenan los motores
     * y la tripulación pide los cinturones.
     */
    id: "bajada",
    cuando: (l) => bajando(l.tramo) && !l.enTierra,
    lineas: [anuncio("tripulacion.cinturones")],
    segun: (l) => [...(acabaDePonerse(l, "ralenti") ? [ara("ralenti")] : []), anuncio("tripulacion.cinturones")],
  },
  /*
   * **Los oídos**: Ara ya sabe lo que es, del vuelo corto, e Idaira le añade lo de
   * masticar. Y lo que hace Ara se dice detrás, que ya está grabado.
   */
  {
    id: "oidos",
    cuando: (l) => l.cabina <= SE_NOTAN_LOS_OIDOS && !l.enTierra,
    caduca: (l) => enLaFinal(l) || l.enTierra || l.faltaParaTocar < PREPARAR_LA_CABINA,
    lineas: [ara("oidosAlReves"), con(idaira("oidos"), "oido"), con(ara("bostezo"), "oido")],
  },
  {
    id: "aproximacion",
    cuando: (l) => l.faltaParaTocar < PREPARAR_LA_CABINA && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 300,
    lineas: [anuncio("comandante.aproximacion")],
  },
  {
    id: "flaps",
    cuando: (l) => l.flaps > 0.2 && !l.enTierra,
    caduca: (l) => l.enTierra || l.altura < 150,
    lineas: [ara("flaps"), ara("flapsPorque")],
    mira: "ala",
    plano: "fuera-ala",
  },
  {
    id: "aterrizando",
    cuando: (l) => !l.enTierra && enLaFinal(l) && l.altura < 60,
    caduca: (l) => l.enTierra,
    lineas: [ara("yaCasi")],
    plano: "fuera-pista",
  },
  {
    id: "toma",
    cuando: (l) => l.tramo === "frenando" && l.enTramo >= DESPUES_DE_TOCAR,
    caduca: (l) => l.tramo === "al-puesto" || l.tramo === "aparcado" || l.tramo === "apagado",
    lineas: [ara("toma")],
    mira: "motor",
    plano: "fuera-pista",
  },
  {
    // La bienvenida de Asunción, la que cuenta quién era Pettirossi. Ver `loQueDiceLaMegafonia`.
    id: "llegada",
    cuando: (l) => (l.tramo === "al-puesto" && l.porElSuelo > 1.5) || l.tramo === "aparcado",
    lineas: [anuncio("comandante.llegada"), anuncio("tripulacion.llegada")],
    plano: "fuera-rodando",
  },
  /*
   * **La hora de aquí**, ya parados y con los calzos puestos, que es de cuando es
   * esa hora: las 06:25 con el horario de verano de Europa, las 07:30 con el de invierno.
   */
  {
    id: "hora",
    cuando: (l, e) => (l.tramo === "aparcado" || l.tramo === "apagado") && e.callaDesde >= SE_MIRA,
    lineas: [],
    segun: (l) => (l.largo ? [comandante(`llegada.${l.largo.temporada}`)] : []),
  },
  {
    // Las hebillas y la gente que se levanta, sin palabras: lo pone el juego. Ver `MotorDelPasaje.gente`.
    id: "impacientes",
    cuando: (l) => (l.tramo === "aparcado" && l.enTramo >= PARADO_DEL_TODO) || l.tramo === "apagado",
    lineas: [],
  },
  {
    id: "seLevantan",
    cuando: (_l, e) => e.desdeQueSeDijo("impacientes") >= SE_OYEN_LAS_HEBILLAS,
    lineas: [ara("seLevantan"), ara("cinturonQuieto")],
  },
  {
    // La luz la apaga la comandante con los motores ya parados, con su *ding*: lo pone el juego.
    id: "luz",
    cuando: (l, e) => l.tramo === "apagado" && l.enTramo >= APAGA_LA_LUZ && e.callaDesde >= 0.6,
    lineas: [],
  },
  {
    id: "suelto",
    cuando: (_l, e) => e.desdeQueSeDijo("luz") >= TRAS_EL_DING,
    lineas: [ara("luzApagada")],
  },
  {
    id: "gracias",
    cuando: (_l, e) => e.callaDesde >= 1,
    lineas: [tripulante("gracias"), tripulante("maleteros"), tripulante("seria")],
  },
  {
    id: "puesto",
    cuando: (l) => l.tramo === "apagado" && l.enTramo >= 1.5,
    lineas: [delLargo("llegamos"), tripulante("adios")],
  },
  { id: "fin", cuando: () => true, lineas: [] },
];

/**
 * **Lo que Ara ve al llegar**: solo si se ve por su cristal —`plano: "ventanilla"`— y
 * con luz para verlo. Con el viento de casi siempre se entra por la 02, con la ciudad,
 * la bahía, el río y el Chaco de su lado; con viento del sur, por la 20, y queda todo en
 * la otra ventanilla. Ninguna lo dice: lo decide lo que se ve. Y sin llegar a la final,
 * que entonces es lo de la pista lo que importa, y a menos de esto, ya no da tiempo a
 * mirar lo que se nombra.
 */
const LLEGANDO = 150;
const enLaLlegada = (l: LecturaDelPasaje): boolean => bajando(l.tramo) && !l.enTierra && l.altura > LLEGANDO;

const CHARLAS: readonly Charla[] = [
  {
    // Si no ha salido ya al abrir la ventanilla: sale bajando. Lo pasa en septiembre y octubre.
    id: "amanece",
    tras: 2,
    cuando: (l, e) => amaneciendo(l) && !e.pedida("inicio.ara.pasaje.largo.amanece") && !e.enLaApertura && !l.enTierra,
    caduca: (l) => l.enTierra,
    lineas: [delLargo("amanece")],
  },
  {
    id: "rio",
    tras: 3,
    cuando: (l) => enLaLlegada(l) && conLuz(l),
    caduca: (l) => l.enTierra,
    nombra: "rio-enfrente",
    plano: "ventanilla",
    lineas: [delLargo("rio")],
  },
  {
    // El Chaco se cuenta a partir del río, que es lo que lo define: «del otro lado».
    id: "chaco",
    tras: 3,
    cuando: (l, e) => enLaLlegada(l) && conLuz(l) && e.dichaLaCharla("rio"),
    caduca: (l) => l.enTierra,
    nombra: "chaco-enfrente",
    plano: "ventanilla",
    lineas: [delLargo("chaco")],
  },
  {
    id: "asuncion",
    tras: 3,
    cuando: (l) => enLaLlegada(l) && conLuz(l),
    caduca: (l) => l.enTierra,
    nombra: "hito:asuncion",
    plano: "ventanilla",
    lineas: [delLargo("asuncion")],
  },
  {
    // A oscuras, la ciudad son sus luces: el río no se ve, y ni se nombra.
    id: "asuncionNoche",
    tras: 3,
    cuando: (l) => enLaLlegada(l) && deNoche(l),
    caduca: (l) => l.enTierra,
    nombra: "hito:asuncion",
    plano: "ventanilla",
    lineas: [delLargo("asuncionNoche")],
  },
];

/** **El guion del tercer capítulo**, sobre el mismo motor que el vuelo corto. */
export const GUION_LLEGADA_A_ASUNCION: GuionDelPasaje<MomentoDeLaLlegada, CharlaDeLaLlegada> = {
  lado: LADO_DE_ARA,
  momentos: MOMENTOS,
  charlas: CHARLAS,
  apertura: {
    hasta: "ventanilla",
    laminas: ["desayuno", "desayuno-noche", "huso-invierno", "huso-verano", "ecuador"],
  },
  // Lo de señalar por la ventanilla, con sus sitios y sus frases, es de otra tanda.
  seSenalaDesde: [],
  tripulanteEnElPasillo: () => false,
  siesta: {
    seDuerme: GUION_TENERIFE_LA_PALMA.siesta.seDuerme,
    seDespierta: GUION_TENERIFE_LA_PALMA.siesta.seDespierta,
    laDespiertan: GUION_TENERIFE_LA_PALMA.siesta.laDespiertan,
    puedenEsperar: new Set(),
    trasAlDespertar: {},
    antesDeDormirse: [],
    sinSiesta: true,
  },
  senalado: {
    suyas: {},
    loVeo: GUION_TENERIFE_LA_PALMA.senalado.loVeo,
    contestaALaHistoria: new Set(),
  },
  sellosAlDecirlo: () => [],
  seQuedanHastaLaSiguiente: new Set(),
  elPlop: [],
  elOficio: [],
  bano: null,
  kit: null,
  // Desde que se abre la ventanilla: lo de antes es un cuento con láminas, y no se ofrece encima.
  consola: {
    desde: "ventanilla",
    elBoton: idaira("consolaBoton"),
    loQueHay: delLargo("consolaAbre"),
    seRecoge: idaira("consolaRecoge"),
  },
};
