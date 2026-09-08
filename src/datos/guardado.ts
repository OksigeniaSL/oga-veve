/**
 * Lo que el juego recuerda de una partida a la siguiente, en un solo sitio y
 * con número de versión.
 *
 * Hasta hoy eran **trece claves sueltas** en `localStorage` —escenario,
 * lección, peldaño, idioma, volumen, vista, mundo, mano, teclas, si ya se vio
 * la pantalla de teclas, los aeródromos recientes, el cuaderno y la bitácora—
 * y **ninguna llevaba versión**. Mientras el juego no tenía usuarios eso no
 * costaba nada. En cuanto alguien lleve cuarenta vuelos apuntados, el día que
 * cambie un campo sus horas desaparecen sin avisar y sin poder recuperarlas.
 *
 * Esto es lo único de todo el proyecto que **no se puede arreglar después**:
 * el código se reescribe, los datos de la gente no.
 *
 * ## Las cinco reglas, y por qué cada una
 *
 * 1. **Una clave, con versión.** `oga-veve:guardado`. Saber en qué formato
 *    está escrito algo es la diferencia entre migrarlo y perderlo.
 * 2. **Migraciones como cadena de funciones puras** `v0→v1→v2`, cada una con
 *    su prueba contra un fichero del formato viejo **de verdad**. Una
 *    migración sin prueba del formato real es una suposición.
 * 3. **Copia antes de migrar.** Lo que había se guarda entero en
 *    `oga-veve:guardado.bak` antes de tocar nada. Si la migración estaba mal,
 *    los datos siguen ahí.
 * 4. **Carga defensiva.** Un dato corrupto —almacenamiento lleno a medias,
 *    alguien editándolo a mano, una extensión— se aparta en
 *    `oga-veve:guardado.roto` y se arranca limpio. El juego jamás se rompe por
 *    lo que guardó ayer.
 * 5. **Escritura por eventos y con freno**, nunca por fotograma. Sesenta
 *    escrituras por segundo en `localStorage` bloquean el hilo principal, que
 *    es el mismo que dibuja.
 *
 * ## Perfiles
 *
 * En un aula la tablet es de todos, así que el documento guarda una lista de
 * perfiles y cuál está activo, **sin cuentas y sin servidor**. Hoy solo hay
 * uno y nadie lo elige: la pantalla para crearlos y cambiarlos es #26, y
 * cuando llegue no habrá que migrar nada porque el hueco ya está hecho.
 *
 * **Y sin datos de menores.** Un perfil no tiene nombre ni edad ni nada que
 * identifique a nadie: tiene un icono y un identificador que no sale de este
 * navegador. Lo que no se recoge no se puede perder.
 */

/** Dónde vive todo, dónde la copia y dónde lo que no se pudo leer. */
export const LLAVE = "oga-veve:guardado";
export const LLAVE_COPIA = "oga-veve:guardado.bak";
export const LLAVE_ROTA = "oga-veve:guardado.roto";

/** La versión del formato de hoy. */
export const VERSION = 1;

/**
 * El presupuesto, en kilobytes.
 *
 * `localStorage` da unos cinco megas por origen, pero el juego no es el único
 * que los usa y llenarlo hace que las escrituras empiecen a fallar sin decir
 * nada. Cien kilobytes son de sobra para lo que guardamos y dejan sitio.
 */
export const PRESUPUESTO_KB = 100;

/** Lo que se recuerda de cómo le gusta jugar a alguien. */
export type Ajustes = Record<string, unknown>;

/** Y lo que ha hecho: el cuaderno, la bitácora y por dónde ha volado. */
export type Progreso = Record<string, unknown>;

export interface Perfil {
  /** Un identificador que no sale de este navegador. */
  readonly id: string;
  /** El icono, que es cómo se reconoce un perfil sin saber leer. */
  readonly avatar: string;
  readonly ajustes: Ajustes;
  readonly progreso: Progreso;
}

export interface Guardado {
  readonly version: number;
  readonly activo: string;
  readonly perfiles: readonly Perfil[];
}

/** Las claves sueltas de antes, con el nombre que tenían. */
export const CLAVES_VIEJAS = {
  ajustes: [
    "oga-veve:escenario",
    "oga-veve:leccion",
    "oga-veve:tramo",
    "oga-veve:idioma",
    "oga-veve:volumen",
    "oga-veve:vista",
    "oga-veve:mundo",
    "oga-veve:mano",
    "oga-veve:teclas",
    "oga-veve:teclas-vistas",
  ],
  progreso: ["oga-veve:cuaderno", "oga-veve:bitacora", "oga-veve:recientes"],
} as const;

/** El nombre corto de una clave: `oga-veve:vista` → `vista`. */
const corto = (llave: string): string => llave.replace("oga-veve:", "");

const almacen = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Almacenamiento bloqueado por política del navegador. Se juega igual.
    return null;
  }
};

const nuevoId = (): string => {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `p${Date.now()}`;
  } catch {
    return `p${Date.now()}`;
  }
};

/** Un guardado recién estrenado, con su único perfil. */
export function guardadoNuevo(): Guardado {
  const id = nuevoId();
  return {
    version: VERSION,
    activo: id,
    perfiles: [{ id, avatar: "🐦", ajustes: {}, progreso: {} }],
  };
}

/**
 * De trece claves sueltas al documento con versión.
 *
 * Es la migración v0→v1, y es la única que existirá con un formato «viejo»
 * que no era un formato: era no tener ninguno. Lee lo que haya, **sin
 * interpretarlo** —cada módulo sigue validando lo suyo al leerlo, como
 * siempre— y lo mete donde va.
 */
export function migrarDeClavesSueltas(
  leer: (llave: string) => string | null,
): Guardado {
  const base = guardadoNuevo();
  const perfil = base.perfiles[0]!;
  const ajustes: Ajustes = {};
  const progreso: Progreso = {};
  const meter = (destino: Record<string, unknown>, llave: string): void => {
    const crudo = leer(llave);
    if (crudo === null) return;
    try {
      destino[corto(llave)] = JSON.parse(crudo);
    } catch {
      // Lo que no es JSON es una cadena suelta —el id de un escenario, el de
      // un idioma— y se guarda tal cual, que es lo que era.
      destino[corto(llave)] = crudo;
    }
  };
  for (const llave of CLAVES_VIEJAS.ajustes) meter(ajustes, llave);
  for (const llave of CLAVES_VIEJAS.progreso) meter(progreso, llave);
  return {
    ...base,
    perfiles: [{ ...perfil, ajustes, progreso }],
  };
}

/**
 * La cadena de migraciones, de la versión de cada índice a la siguiente.
 *
 * `MIGRACIONES[1]` lleva de la 1 a la 2, y así. Está vacía porque hoy la
 * versión es la 1 y no ha habido ningún cambio de formato todavía; el hueco
 * y la cadena están hechos, que es de lo que se trataba. La primera que se
 * escriba será, casi seguro, la que convierta el perfil único en una lista
 * elegible cuando llegue #26.
 */
export const MIGRACIONES: readonly ((d: Guardado) => Guardado)[] = [];

/** ¿Esto tiene pinta de ser un guardado nuestro? */
function esGuardado(d: unknown): d is Guardado {
  if (typeof d !== "object" || d === null) return false;
  const g = d as Partial<Guardado>;
  return (
    typeof g.version === "number" &&
    typeof g.activo === "string" &&
    Array.isArray(g.perfiles) &&
    g.perfiles.every(
      (p) =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as Perfil).id === "string",
    )
  );
}

/**
 * Sube un documento hasta la versión de hoy.
 *
 * Un documento de una versión **más nueva** que la del código —alguien que
 * abrió una versión nueva del juego y volvió a una vieja— no se toca ni se
 * borra: se devuelve tal cual y cada módulo se queda con lo que entienda.
 * Migrar hacia atrás sería inventarse datos.
 */
export function subirDeVersion(d: Guardado): Guardado {
  let salida = d;
  while (salida.version < VERSION) {
    const migrar = MIGRACIONES[salida.version];
    if (!migrar) return { ...salida, version: VERSION };
    salida = { ...migrar(salida), version: salida.version + 1 };
  }
  return salida;
}

/** Lo leído en esta sesión. Se lee una vez y se trabaja en memoria. */
let memoria: Guardado | null = null;

/**
 * El guardado de esta sesión: leído, migrado y a prueba de sorpresas.
 *
 * Si lo que hay no se puede leer, se aparta en `oga-veve:guardado.roto` y se
 * arranca limpio. Apartarlo y no borrarlo no es un capricho: es la única
 * forma de que alguien pueda recuperar sus horas si el fallo fue nuestro.
 */
export function leerGuardado(): Guardado {
  if (memoria) return memoria;
  const s = almacen();
  if (!s) return (memoria = guardadoNuevo());

  const crudo = s.getItem(LLAVE);
  if (crudo === null) {
    // Ni documento ni nada: o es la primera vez, o viene de las claves
    // sueltas. Las dos cosas se resuelven igual.
    const migrado = migrarDeClavesSueltas((k) => s.getItem(k));
    guardarCopia(s);
    memoria = migrado;
    escribirYa();
    limpiarClavesViejas(s);
    return memoria;
  }

  try {
    const leido: unknown = JSON.parse(crudo);
    if (!esGuardado(leido)) throw new Error("no es un guardado");
    memoria = subirDeVersion(leido);
    if (memoria.version !== leido.version) {
      guardarCopia(s);
      escribirYa();
    }
    return memoria;
  } catch {
    try {
      s.setItem(LLAVE_ROTA, crudo);
    } catch {
      // Si ni eso cabe, se pierde. No hay nada más que se pueda hacer.
    }
    memoria = guardadoNuevo();
    escribirYa();
    return memoria;
  }
}

function guardarCopia(s: Storage): void {
  try {
    const viejo = s.getItem(LLAVE);
    if (viejo !== null) {
      s.setItem(LLAVE_COPIA, viejo);
      return;
    }
    // Antes de la primera migración lo que hay son las claves sueltas: se
    // copian todas juntas, que es lo que había que poder recuperar.
    const sueltas: Record<string, string> = {};
    for (const llave of [...CLAVES_VIEJAS.ajustes, ...CLAVES_VIEJAS.progreso]) {
      const v = s.getItem(llave);
      if (v !== null) sueltas[llave] = v;
    }
    if (Object.keys(sueltas).length) {
      s.setItem(LLAVE_COPIA, JSON.stringify(sueltas));
    }
  } catch {
    // Sin sitio para la copia se sigue: perder la copia no puede impedir jugar.
  }
}

function limpiarClavesViejas(s: Storage): void {
  try {
    for (const llave of [...CLAVES_VIEJAS.ajustes, ...CLAVES_VIEJAS.progreso]) {
      s.removeItem(llave);
    }
  } catch {
    // Da igual: lo que manda ya es el documento nuevo.
  }
}

/** El perfil que está jugando ahora. */
function perfilActivo(g: Guardado): Perfil {
  return g.perfiles.find((p) => p.id === g.activo) ?? g.perfiles[0]!;
}

/** Un ajuste guardado, o `undefined` si no lo hay. */
export function leerAjuste(nombre: string): unknown {
  return perfilActivo(leerGuardado()).ajustes[nombre];
}

/** Un trozo de progreso guardado: el cuaderno, la bitácora, los recientes. */
export function leerProgreso(nombre: string): unknown {
  return perfilActivo(leerGuardado()).progreso[nombre];
}

/**
 * Un ajuste que es una cadena, que son casi todos.
 *
 * Doce de los trece sitios que guardaban algo guardaban **un identificador
 * suelto** —«tenerife-norte», «cockpit», «bajo»— y no un objeto. Esta pareja
 * existe para que esos sitios queden en una línea y sigan comprobando lo suyo
 * como siempre: aquí no se valida nada, solo se guarda y se devuelve.
 *
 * Devuelve `null` y no `undefined` porque es lo que devolvía
 * `localStorage.getItem`, y así los doce sitios no cambian su forma de mirar.
 */
export function leerTexto(nombre: string): string | null {
  const v = leerAjuste(nombre);
  if (typeof v === "string") return v;
  // «1» se guardó como número al migrar, porque es JSON válido. Se devuelve
  // como lo que era.
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

export function ponerTexto(nombre: string, valor: string): void {
  ponerAjuste(nombre, valor);
}

export function ponerAjuste(nombre: string, valor: unknown): void {
  cambiar((p) => ({ ...p, ajustes: { ...p.ajustes, [nombre]: valor } }));
}

export function ponerProgreso(nombre: string, valor: unknown): void {
  cambiar((p) => ({ ...p, progreso: { ...p.progreso, [nombre]: valor } }));
}

function cambiar(fn: (p: Perfil) => Perfil): void {
  const g = leerGuardado();
  const activo = perfilActivo(g);
  memoria = {
    ...g,
    perfiles: g.perfiles.map((p) => (p.id === activo.id ? fn(p) : p)),
  };
  pedirEscritura();
}

/**
 * El freno de la escritura.
 *
 * Los ajustes cambian a golpes —quien mueve el mando de la hora dispara
 * treinta cambios en dos segundos— y cada escritura en `localStorage` es
 * síncrona y en el hilo que dibuja. Con un cuarto de segundo de espera, esos
 * treinta se quedan en una.
 */
export const ESPERA_DE_ESCRITURA = 250;
let reloj: ReturnType<typeof setTimeout> | null = null;

function pedirEscritura(): void {
  if (reloj !== null) return;
  reloj = setTimeout(() => {
    reloj = null;
    escribirYa();
  }, ESPERA_DE_ESCRITURA);
}

/**
 * Escribe ahora mismo, sin esperar al freno.
 *
 * La llama el propio freno, y también quien esté cerrando: una pestaña que se
 * va con un cambio a medio guardar lo pierde, y eso es justo el vuelo que
 * acaba de terminar.
 */
export function escribirYa(): void {
  if (reloj !== null) {
    clearTimeout(reloj);
    reloj = null;
  }
  const s = almacen();
  if (!s || !memoria) return;
  try {
    s.setItem(LLAVE, JSON.stringify(memoria));
  } catch {
    // Navegación privada, almacenamiento lleno o bloqueado. Se ha jugado
    // igual, y el juego no puede pararse porque no quepa el recuerdo.
  }
}

/** Cuánto ocupa el guardado ahora mismo, en kilobytes. */
export function tamanoKB(): number {
  if (!memoria) return 0;
  return JSON.stringify(memoria).length / 1024;
}

/**
 * Guarda lo pendiente cuando la pestaña se va.
 *
 * `pagehide` es el que se dispara siempre —en móvil, `beforeunload` no llega—
 * y `visibilitychange` cubre el cambio de aplicación, que en una tablet de
 * aula es lo que pasa de verdad.
 */
export function guardarAlSalir(): void {
  const irse = (): void => escribirYa();
  globalThis.addEventListener?.("pagehide", irse);
  globalThis.addEventListener?.("visibilitychange", () => {
    if (globalThis.document?.visibilityState === "hidden") irse();
  });
}

/** Solo para las pruebas: olvida lo leído. */
export function olvidar(): void {
  memoria = null;
  if (reloj !== null) {
    clearTimeout(reloj);
    reloj = null;
  }
}
