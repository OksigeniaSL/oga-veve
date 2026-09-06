/**
 * El cuaderno de vuelo: lo que llevas hecho, y el grado que sale de ahí.
 *
 * Un vuelo suelto se olvida. Lo que hace que alguien vuelva mañana es ver que
 * lo de ayer sigue ahí, y eso en aviación tiene un nombre y un objeto: **el
 * cuaderno de vuelo**, donde se apuntan las horas, los despegues y los
 * aterrizajes, y que es lo que se enseña para demostrar lo que uno sabe hacer.
 *
 * ## Los grados suben y no bajan
 *
 * «¿Se quitan galones en la vida real?» No. Un galón no se pierde por meter la
 * pata: se sube por horas y por pruebas superadas, y cuando algo sale mal lo
 * que hay es repetir —vuelo de instrucción, revalidación, otra vez el
 * ejercicio hasta que sale—. Solo en casos graves y repetidos se suspende una
 * licencia, y eso ya no es «te quito un galón», es «no vuelas hasta que te
 * formes otra vez».
 *
 * Así que aquí los grados se ganan por **cosas hechas** y no por no fallar:
 * quien se estrella veinte veces aprendiendo llega igual, y quien no vuela, no
 * llega. Es la diferencia entre un juego que enseña y un juego que castiga.
 *
 * ## Y son los de verdad
 *
 * En la hombrera de un piloto van las barras de su grado: una el alumno, dos
 * el segundo oficial, tres el primer oficial y cuatro el comandante; instructor
 * es una habilitación aparte y por eso va la última. Los nombres se han dejado
 * en el registro del juego —«Aprendiz», «Instructora»— pero la escalera es la
 * de una carrera de verdad, y la manga que la dibuja ya existía: es la misma
 * que cuenta los galones de un vuelo.
 */

/** Lo que el cuaderno guarda. Todo son cuentas, y todas suben. */
export interface Cuaderno {
  /** Segundos volados, con las ruedas en el aire. */
  readonly segundos: number;
  readonly despegues: number;
  /** Aterrizajes **en la pista**. Los del campo son percances, no aterrizajes. */
  readonly aterrizajes: number;
  /** Frustradas: renunciar es ganar, y aquí se cuenta como lo que es. */
  readonly frustradas: number;
  /** Vuelos terminados de verdad: apagando el motor en el puesto. */
  readonly completos: number;
  /** Percances. Se apuntan porque pasaron, no para restar nada. */
  readonly percances: number;
  /** Los aeródromos en los que se ha volado, por su identificador. */
  readonly aerodromos: readonly string[];
}

export const CUADERNO_VACIO: Cuaderno = {
  segundos: 0,
  despegues: 0,
  aterrizajes: 0,
  frustradas: 0,
  completos: 0,
  percances: 0,
  aerodromos: [],
};

/** Los grados, de menos a más. El orden **es** la escalera. */
export const GRADOS = [
  "aprendiz",
  "piloto",
  "comandante",
  "instructora",
] as const;

export type Grado = (typeof GRADOS)[number];

/**
 * Qué hace falta para cada grado.
 *
 * Los números salen de lo que dura una tarde y de lo que cuesta cada cosa: un
 * aterrizaje bueno se consigue el primer día, diez ya piden constancia, y
 * veinticinco con tres aeródromos distintos es haber aprendido a aterrizar en
 * sitios que no te sabes de memoria — que es exactamente la diferencia entre
 * repetir un ejercicio y saber volar.
 *
 * Y la frustrada entra en el grado más alto **a propósito**: es la regla
 * número uno de la casa, la más difícil de aceptar y la que salva vidas. Quien
 * ha renunciado tres veces a un aterrizaje que iba mal sabe algo que no sabe
 * quien solo ha aterrizado.
 */
export interface Requisito {
  readonly grado: Grado;
  readonly aterrizajes: number;
  readonly aerodromos: number;
  readonly frustradas: number;
}

export const REQUISITOS: readonly Requisito[] = [
  { grado: "aprendiz", aterrizajes: 0, aerodromos: 0, frustradas: 0 },
  { grado: "piloto", aterrizajes: 3, aerodromos: 1, frustradas: 0 },
  { grado: "comandante", aterrizajes: 10, aerodromos: 2, frustradas: 1 },
  { grado: "instructora", aterrizajes: 25, aerodromos: 3, frustradas: 3 },
];

const cumple = (c: Cuaderno, r: Requisito): boolean =>
  c.aterrizajes >= r.aterrizajes &&
  c.aerodromos.length >= r.aerodromos &&
  c.frustradas >= r.frustradas;

/** El grado de este cuaderno: el más alto que se cumple entero. */
export function grado(c: Cuaderno): Grado {
  let cual: Grado = "aprendiz";
  for (const r of REQUISITOS) if (cumple(c, r)) cual = r.grado;
  return cual;
}

/** Cuántas barras lleva la hombrera de ese grado. Una por escalón. */
export const barrasDe = (g: Grado): number => GRADOS.indexOf(g) + 1;

/**
 * Lo que falta para el siguiente grado, o `null` si ya está el más alto.
 *
 * Devuelve **cuánto falta de cada cosa**, no un porcentaje: «te faltan dos
 * aterrizajes» es una frase que se puede cumplir esta tarde, y «llevas un 68 %»
 * no le dice a nadie qué hacer ahora.
 */
export function loQueFalta(
  c: Cuaderno,
): { readonly grado: Grado; readonly falta: Omit<Requisito, "grado"> } | null {
  const actual = GRADOS.indexOf(grado(c));
  const siguiente = REQUISITOS[actual + 1];
  if (!siguiente) return null;
  return {
    grado: siguiente.grado,
    falta: {
      aterrizajes: Math.max(0, siguiente.aterrizajes - c.aterrizajes),
      aerodromos: Math.max(0, siguiente.aerodromos - c.aerodromos.length),
      frustradas: Math.max(0, siguiente.frustradas - c.frustradas),
    },
  };
}

const LLAVE = "oga-veve:cuaderno";

/**
 * Lee el cuaderno del aparato.
 *
 * **Y aguanta lo que sea**: un cuaderno guardado por una versión anterior, un
 * navegador que bloquea el almacenamiento, un fichero a medio escribir. Lo que
 * no puede pasar es que un cuaderno raro impida volar, así que cualquier cosa
 * que no se entienda vale cero y se sigue.
 */
export function leerCuaderno(): Cuaderno {
  try {
    const crudo = localStorage.getItem(LLAVE);
    if (!crudo) return CUADERNO_VACIO;
    const d = JSON.parse(crudo) as Partial<Cuaderno>;
    const n = (v: unknown): number =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
    return {
      segundos: n(d.segundos),
      despegues: n(d.despegues),
      aterrizajes: n(d.aterrizajes),
      frustradas: n(d.frustradas),
      completos: n(d.completos),
      percances: n(d.percances),
      aerodromos: Array.isArray(d.aerodromos)
        ? [...new Set(d.aerodromos.filter((x) => typeof x === "string"))]
        : [],
    };
  } catch {
    return CUADERNO_VACIO;
  }
}

/** Y lo guarda. Si no se puede, se vuela igual. */
export function guardarCuaderno(c: Cuaderno): void {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(c));
  } catch {
    // Navegación privada o almacenamiento lleno: la partida no se rompe por
    // no poder apuntar, igual que no se rompe por no recordar el peldaño.
  }
}
