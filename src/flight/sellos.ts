/**
 * **Los sellos con nombre**: la mitad del cuaderno que se colecciona.
 *
 * Es lo que le faltaba al issue #25, «La libreta de vuelo: horas, sellos y
 * licencias». Las horas, los grados y un sello por campo ya estaban; lo que
 * no había era la parte que un crío le enseña a su padre: **¡Veve!**,
 * **Karumbe**, **Mainumby**… Dieciséis, con los nombres del issue tal cual,
 * repartidos como los repartía el issue: seis de escuela —un tercio, que se
 * sacan con cinco años—, cinco de piloto y cinco de comandante.
 *
 * ## Cada uno premia algo que existe
 *
 * La regla 4 de AGENTS.md vale aquí más que en ningún sitio, porque un sello
 * es lo que el juego dice que **vale la pena hacer**. Así que ninguno premia
 * un truco: lo que premian los de pilotaje es lo que se entrena de verdad en
 * una escuela y lo que una examinadora mira —el vuelo lento, la vuelta a un
 * punto, los toques, el primer solo, la travesía, la toma de noche, la
 * aproximación estabilizada, el planeo hasta la pista sin motor—. Y los que
 * no son de pilotaje son sitios y horas, que es lo que lleva el cuaderno de un
 * piloto.
 *
 * Y uno va en contra de la costumbre de los juegos: **Mbarete**, «fuerte», es
 * el de renunciar. Renunciar es ganar —la regla de la casa—, y el sello lo
 * dice con su nombre: hace falta ser fuerte para irse al aire.
 *
 * Dos más se tuvieron que afinar para que fueran verdad:
 *
 * - **Ñandutí, atravesar una nube**, solo en un avión que vuela por
 *   instrumentos. Una avioneta de vuelo visual no se mete en una nube —es lo
 *   que mata a más pilotos de avioneta, y el parte de este juego ya lo enseña:
 *   ver `MINIMOS` en `parte-de-salida.ts`—. Premiarlo ahí sería enseñar justo
 *   lo contrario.
 * - **La vuelta al tajamar** no es dar vueltas por darlas: es el viraje
 *   alrededor de un punto, que se enseña para aprender a corregir el viento,
 *   a la altura a la que se enseña.
 *
 * ## Se ganan, no se pierden
 *
 * Lo mismo que los galones y las gafas: un sello ganado es para siempre, y
 * nada de aquí sabe quitarlo. Ni enseña lo que falta tachado: lo que falta es
 * un hueco en el álbum, como en un álbum de figuritas. Ver `ui/album.ts`.
 *
 * ## Y todo con lo que el juego ya medía
 *
 * Ninguna regla mide nada nuevo: el cuaderno, los galones, la pista de ahora,
 * la nube del cielo, el sol, el modo sin instructora y el modo sin motor ya
 * estaban. Esto los mira y dice qué sello sale. Ni dibuja, ni suena, ni sabe
 * del juego: quien lo usa decide cuándo se celebra. Ver
 * `celebrarLosSellosSiToca` en `game.ts`.
 *
 * Todo queda en el navegador, en el progreso del perfil, como el resto del
 * cuaderno. Sin datos de nadie: la regla 7.
 */

import { leerProgreso, ponerProgreso } from "../datos/guardado";
import { SCENARIOS } from "../world/scenarios";
import type { Cuaderno } from "./cuaderno";
import type { Galon } from "./galones";

/** De qué altura del issue es cada sello: el orden del álbum. */
export type Tramo = "escuela" | "piloto" | "comandante";

/**
 * **Los dieciséis**, en el orden del álbum: el del issue.
 *
 * El `id` es lo que se guarda en el perfil, y por eso no se cambia nunca: un
 * sello renombrado aquí sería un sello perdido en cada tablet que ya lo tenía.
 * Los nombres que se ven viven en el diccionario, en
 * `explica.sello.<id>.corta`.
 */
export const SELLOS = [
  { id: "veve", tramo: "escuela" },
  { id: "karumbe", tramo: "escuela" },
  { id: "mainumby", tramo: "escuela" },
  { id: "nanduti", tramo: "escuela" },
  { id: "tajamar", tramo: "escuela" },
  { id: "tres-toques", tramo: "escuela" },
  { id: "primer-solo", tramo: "piloto" },
  { id: "chipa-volandera", tramo: "piloto" },
  { id: "jasy", tramo: "piloto" },
  { id: "mbarete", tramo: "piloto" },
  { id: "ruta-jesuitica", tramo: "piloto" },
  { id: "pettirossi", tramo: "comandante" },
  { id: "planeador", tramo: "comandante" },
  { id: "manos-de-seda", tramo: "comandante" },
  { id: "transchaco", tramo: "comandante" },
  { id: "cien-horas", tramo: "comandante" },
] as const satisfies readonly { readonly id: string; readonly tramo: Tramo }[];

export type Sello = (typeof SELLOS)[number]["id"];

/** El tramo de un sello. */
export function tramoDe(id: Sello): Tramo {
  return SELLOS.find((s) => s.id === id)!.tramo;
}

const esSello = (x: unknown): x is Sello =>
  typeof x === "string" && SELLOS.some((s) => s.id === x);

/* ── Los listones ────────────────────────────────────────────────────────
 *
 * Todos con su porqué, y ninguno a ojo: o es el número de un reglamento, o es
 * el de una ficha de avión, o sale de lo que es la maniobra.
 */

/** Cien horas, en segundos: el cuaderno cuenta segundos. */
export const CIEN_HORAS = 100 * 3600;

/**
 * **La altura mínima para las maniobras de altura**, m sobre el suelo.
 *
 * Ciento cincuenta: los quinientos pies del vuelo visual fuera de poblado
 * (SERA.5005), los mismos que usa el circuito. El vuelo lento se practica alto
 * —si algo sale mal, hay sitio— y la vuelta a un punto, por encima de esto.
 */
export const ALTURA_DE_MANIOBRA = 150;

/**
 * **El vuelo lento**: hasta un diez por ciento por encima de la velocidad de
 * aproximación, que es 1,3 veces la de pérdida con todo fuera —ver
 * `velocidadDePerdida`—. Despacio de verdad, y siempre por encima del aviso.
 */
export const LENTO_SOBRE_VREF = 1.1;
/** Y sin subir ni bajar más de quinientos pies por minuto, m/s: nivelado. */
export const LENTO_NIVELADO = 2.5;
/** Diez segundos seguidos, como dice el issue. */
export const LENTO_DURANTE = 10;

/** **Rodando**: hasta lo más que se rueda en recta larga, con un poco de holgura. */
export const HOLGURA_DE_RODAJE = 1.2;
/**
 * **La pista entera**: lo que recorre el avión de punta a punta, en tanto por
 * uno del largo. No es uno porque el avión no llega a la raya de la punta —se
 * da la vuelta antes— y lo que se mide es dónde está su centro.
 */
export const PISTA_ENTERA = 0.85;

/** **Dentro de la nube**: el ojo ya no ve el fondo. Ver `cuantoDentro`. */
export const DENTRO_DE_LA_NUBE = 0.8;
/** Y fuera: casi nada de nube alrededor. */
export const FUERA_DE_LA_NUBE = 0.1;
/** Cuánto hay que estar dentro para haberla atravesado, s, y no rozado. */
export const EN_LA_NUBE_DURANTE = 2;

/**
 * **La vuelta a un punto**: entre quinientos y mil quinientos pies sobre el
 * suelo —se enseña entre seiscientos y mil— y a una distancia del punto que
 * se pueda mirar desde la ventanilla.
 */
export const TAJAMAR_ALTO = 450;
export const TAJAMAR_CERCA = 100;
export const TAJAMAR_LEJOS = 800;

/** **Un bote no es un vuelo**: el toque cuenta subiendo de aquí, m. */
export const SUBE_DEL_TOQUE = 30;
/** Y parado no es un toque, es una toma completa: m/s. */
export const PARADO_EN_LA_PISTA = 3;
/** Los toques del sello. */
export const TOQUES = 3;

/**
 * **Los dos campos de la tierra de las misiones jesuíticas**: Encarnación, en
 * Itapúa, al lado de Trinidad y de Jesús, y Ayolas, en el departamento de
 * Misiones. Por escenario.
 */
export const RUTA_JESUITICA = ["encarnacion", "ayolas"] as const;

/** **La Transchaco** va de Asunción a Mariscal Estigarribia, y sigue. */
export const TRANSCHACO = ["pettirossi", "estigarribia"] as const;

/**
 * **Los campos del Paraguay**: los de verdad, sin los dos inventados. Salen de
 * los escenarios, que es donde se dice de qué país es cada uno.
 */
export const CAMPOS_DEL_PARAGUAY: readonly string[] = SCENARIOS.filter(
  (e) => e.pais === "py",
).map((e) => e.id);

/* ── Lo que se guarda ─────────────────────────────────────────────────── */

const GANADOS = "sellos.ganados";
const POR_CELEBRAR = "sellos.porCelebrar";

/**
 * Lo guardado, en el orden en que se ganó, una vez cada uno.
 *
 * **Y aguanta lo que sea**, como el cuaderno: un guardado viejo, uno editado
 * a mano o uno de una versión con un sello que ya no existe no rompen nada; lo
 * que no se reconoce no sale.
 */
function leerLista(llave: string): Sello[] {
  const d = leerProgreso(llave);
  return Array.isArray(d) ? [...new Set(d.filter(esSello))] : [];
}

/** Los sellos ganados, en el orden en que se ganaron. */
export function leerSellos(): readonly Sello[] {
  return leerLista(GANADOS);
}

/** Los ganados que todavía no se han celebrado. */
export function sellosPorCelebrar(): readonly Sello[] {
  return leerLista(POR_CELEBRAR);
}

/**
 * Ganar un sello. Devuelve `true` **solo la primera vez**, como las gafas: el
 * momento se celebra una vez y el estado no se vuelve a celebrar nunca.
 *
 * `celebrar` lo deja apuntado para celebrarlo, y **guardado**: se gana en el
 * aire y se celebra rodando, y entre una cosa y otra puede pasar de todo —un
 * percance, volver al hangar, cerrar la pestaña—. Lo que no se celebró hoy se
 * celebra la próxima vez que se esté despacio en tierra. Sin `celebrar` se
 * estampa en silencio: los que el cuaderno ya demostraba de antes de que
 * existieran los sellos. Ver `sellosDelCuaderno`.
 */
export function ganarSello(id: Sello, celebrar = true): boolean {
  const ya = leerSellos();
  if (ya.includes(id)) return false;
  ponerProgreso(GANADOS, [...ya, id]);
  if (celebrar) ponerProgreso(POR_CELEBRAR, [...sellosPorCelebrar(), id]);
  return true;
}

/** Ya se celebró: sale de la cola. */
export function selloCelebrado(id: Sello): void {
  ponerProgreso(
    POR_CELEBRAR,
    sellosPorCelebrar().filter((s) => s !== id),
  );
}

/* ── Cuándo se celebra ────────────────────────────────────────────────── */

/** Lo que hace falta saber del momento para celebrar un sello. */
export interface MomentoDeCelebrar {
  readonly enTierra: boolean;
  /** Velocidad sobre el suelo, m/s. */
  readonly porElSuelo: number;
  /** La de rodar, m/s: la misma con la que se celebran las gafas. */
  readonly rodando: number;
  /** Una escena del modo inicio en marcha: la voz es de Jazlyn y Ara. */
  readonly enEscena: boolean;
  /** Un percance puesto: el intento se acabó y se cuenta lo que pasó. */
  readonly percance: boolean;
  /** El final del vuelo puesto, que esconde la tarjeta de señal. */
  readonly vueloTerminado: boolean;
  /** Las gafas, esperando su celebración: van primero. */
  readonly gafasPorCelebrar: boolean;
  /** Alguien hablando: la instructora, la torre o la máquina. */
  readonly alguienHabla: boolean;
  /** Una tarjeta que importa más, todavía en la esquina. */
  readonly tarjetaQueImporta: boolean;
}

/**
 * **Si ahora se puede celebrar un sello**: en tierra, rodando o parado, y
 * nunca en mitad de una maniobra. Un suceso, una voz: tampoco encima de otra
 * que esté hablando ni encima de una tarjeta que importa más. Y las gafas,
 * primero. Ver `celebrarLosSellosSiToca` en `game.ts`.
 */
export function esMomentoDeCelebrar(m: MomentoDeCelebrar): boolean {
  return (
    m.enTierra &&
    m.porElSuelo < m.rodando &&
    !m.enEscena &&
    !m.percance &&
    !m.vueloTerminado &&
    !m.gafasPorCelebrar &&
    !m.alguienHabla &&
    !m.tarjetaQueImporta
  );
}

/* ── Las reglas ───────────────────────────────────────────────────────── */

/**
 * Los escenarios donde se ha volado, a partir de lo que apunta el cuaderno: el
 * identificador del aeródromo, o el del escenario en los inventados. Ver
 * `camposDeLosSellos` en `ui/sellos.ts`, que hace la misma cuenta.
 */
function escenariosVolados(aerodromos: readonly string[]): Set<string> {
  const ids = new Set<string>();
  for (const a of aerodromos) {
    const e = SCENARIOS.find((s) => s.aerodrome?.id === a || s.id === a);
    if (e) ids.add(e.id);
  }
  return ids;
}

/**
 * **Los que el cuaderno ya demuestra por sí solo**: las cuentas que suben.
 *
 * - **¡Veve!**, el primer despegue. *Veve* es volar.
 * - **Mbarete**, la primera frustrada del cuaderno: irse al aire, o parar un
 *   despegue a tiempo, que el cuaderno cuenta igual —renunciar es ganar—.
 * - **Ruta Jesuítica**, haber volado en los dos campos de las misiones.
 * - **La hazaña de Pettirossi**, haber volado en todos los del Paraguay: el
 *   primer aviador paraguayo da nombre al aeropuerto de Asunción.
 * - **Cien horas**, que es el número redondo de un cuaderno de verdad.
 *
 * «Volado» es lo que el cuaderno apunta como aeródromo: donde se despegó o se
 * aterrizó a los mandos. Los de pasaje no cuentan, que de pasaje no se pilota.
 */
export function sellosDelCuaderno(
  c: Pick<Cuaderno, "despegues" | "frustradas" | "segundos" | "aerodromos">,
): Sello[] {
  const salen: Sello[] = [];
  if (c.despegues >= 1) salen.push("veve");
  if (c.frustradas >= 1) salen.push("mbarete");
  const volados = escenariosVolados(c.aerodromos);
  if (RUTA_JESUITICA.every((id) => volados.has(id))) salen.push("ruta-jesuitica");
  if (CAMPOS_DEL_PARAGUAY.length && CAMPOS_DEL_PARAGUAY.every((id) => volados.has(id)))
    salen.push("pettirossi");
  if (c.segundos >= CIEN_HORAS) salen.push("cien-horas");
  return salen;
}

/** Lo que se sabe de una toma que cuenta: en la pista, sin percance. */
export interface TomaDelSello {
  /** El escenario del campo donde se ha tocado. */
  readonly campo: string;
  /** El escenario de donde se despegó en este vuelo, o vacío si no se despegó. */
  readonly salida: string;
  /** De noche: el sol a más de seis grados por debajo del horizonte. Ver `esDeNoche`. */
  readonly noche: boolean;
  /** Si se vuela sin instructora. Ver `flight/sin-instructora.ts`. */
  readonly sola: boolean;
  /** Si se llega sin motor, planeando. Ver `flight/sin-motor.ts`. */
  readonly sinMotor: boolean;
}

/**
 * **De noche, a efectos de volar**: desde que acaba el crepúsculo civil, con el
 * sol a seis grados por debajo del horizonte. Es la noche de la OACI (Anexo 2)
 * y la de la habilitación nocturna, no la de la hora del reloj.
 *
 * `alturaDelSol` es la componente vertical de la dirección del sol, que es el
 * seno de su altura sobre el horizonte.
 */
export function esDeNoche(alturaDelSol: number): boolean {
  return alturaDelSol < Math.sin((-6 * Math.PI) / 180);
}

/** Lo que se mira en cada fotograma. Todo en SI, como el modelo de vuelo. */
export interface LecturaDeLosSellos {
  readonly enTierra: boolean;
  /** Velocidad sobre el suelo, m/s. */
  readonly porElSuelo: number;
  /** Altura sobre el suelo, m. */
  readonly altura: number;
  /** Velocidad respecto al aire, m/s. */
  readonly velocidad: number;
  /** Velocidad vertical, m/s. */
  readonly vertical: number;
  /** Si suena el avisador de pérdida. Ver `avisaLaPerdida`. */
  readonly avisoDePerdida: boolean;
  /** La velocidad de aproximación de este avión, m/s. */
  readonly vref: number;
  /** Lo más que rueda este avión en una recta larga, m/s. Ver `velocidadesEnTierra`. */
  readonly rodajeMaximo: number;
  /**
   * El avión en los ejes de la pista de ahora —a lo largo desde su centro y de
   * través—, con su largo y su ancho, m. `null` si no hay pista.
   */
  readonly enPista: {
    readonly along: number;
    readonly across: number;
    readonly largo: number;
    readonly ancho: number;
  } | null;
  /** Cuánto se está dentro de una nube, de 0 a 1. Ver `cuantoDentro`. */
  readonly enNube: number;
  /** Si este avión vuela por instrumentos. Ver `MINIMOS` en `parte-de-salida.ts`. */
  readonly porInstrumentos: boolean;
  /** Del tajamar de la granja al avión, m, si hay granja con tajamar. */
  readonly alTajamar: { readonly dx: number; readonly dz: number } | null;
  /** Lo que lleva marcado la hoja de este vuelo. Ver `Galones`. */
  readonly galones: readonly Galon[];
}

/** Un ángulo llevado a entre −π y π. */
const aLaMitad = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * **La cuenta de los sellos de un vuelo**: lo que hace falta seguir de un
 * fotograma a otro —los diez segundos despacio, la pista que se lleva rodada,
 * la vuelta que se lleva dada al tajamar, los toques—, y las tomas y los
 * despegues que dicen el resto.
 *
 * Devuelve los sellos cuya regla se acaba de cumplir, **una vez por vuelo**:
 * cuáles son nuevos de verdad lo decide `ganarSello`, que es quien sabe lo
 * que ya se tenía.
 */
export class MedidorDeSellos {
  private readonly dichos = new Set<Sello>();

  private despacio = 0;
  private rodada: { desde: number; hasta: number } | null = null;
  private enLaNube = 0;
  private alrededor = 0;
  private anguloAntes: number | null = null;
  private tocoSinParar = false;
  private toques = 0;
  private solaDesdeElDespegue = false;
  private despego = false;

  /** Otro vuelo: lo que se llevaba a medias, a cero. Lo ganado no se toca. */
  reiniciar(): void {
    this.dichos.clear();
    this.despacio = 0;
    this.rodada = null;
    this.enLaNube = 0;
    this.alrededor = 0;
    this.anguloAntes = null;
    this.tocoSinParar = false;
    this.toques = 0;
    this.solaDesdeElDespegue = false;
    this.despego = false;
  }

  /** Lo que sale, sin repetir en este vuelo. */
  private salen(cuales: readonly Sello[]): Sello[] {
    const nuevos = cuales.filter((s) => !this.dichos.has(s));
    for (const s of nuevos) this.dichos.add(s);
    return nuevos;
  }

  /** Un fotograma. */
  paso(dt: number, l: LecturaDeLosSellos): Sello[] {
    const salen: Sello[] = [];
    if (this.karumbe(l)) salen.push("karumbe");
    if (this.mainumby(dt, l)) salen.push("mainumby");
    if (this.nanduti(dt, l)) salen.push("nanduti");
    if (this.tajamar(l)) salen.push("tajamar");
    if (this.tresToques(l)) salen.push("tres-toques");
    /*
     * **Manos de seda**: la aproximación estabilizada y la toma buena en el
     * mismo vuelo, que es lo que más mira quien examina a un piloto. Se mira
     * en la hoja, que ya las juzga: ver `Galones`, y no hay dos maneras de
     * decir qué es aproximar bien.
     */
    if (l.galones.includes("aproximacion") && l.galones.includes("toma"))
      salen.push("manos-de-seda");
    return this.salen(salen);
  }

  /**
   * **Karumbe**: rodar la pista de punta a punta, despacio y sin salirse de
   * ella. Es lo que se hace en un campo sin calle de rodaje paralela —rodar
   * por la pista hasta la cabecera, el *backtrack*—, y se gana antes de saber
   * volar: lo único que pide es ir despacio y por el medio.
   */
  private karumbe(l: LecturaDeLosSellos): boolean {
    const p = l.enPista;
    const rodando =
      l.enTierra && l.porElSuelo <= l.rodajeMaximo * HOLGURA_DE_RODAJE;
    if (!p || !rodando || Math.abs(p.across) > p.ancho / 2) {
      this.rodada = null;
      return false;
    }
    const r = this.rodada ?? { desde: p.along, hasta: p.along };
    r.desde = Math.min(r.desde, p.along);
    r.hasta = Math.max(r.hasta, p.along);
    this.rodada = r;
    return r.hasta - r.desde >= p.largo * PISTA_ENTERA;
  }

  /**
   * **Mainumby**, el picaflor: diez segundos volando despacio, nivelado, alto
   * y sin que suene el avisador de pérdida. Es el vuelo lento de la escuela
   * —el ejercicio 10A del programa de piloto privado de EASA—, que enseña cómo
   * se siente el avión cerca de su límite sin llegar a él.
   */
  private mainumby(dt: number, l: LecturaDeLosSellos): boolean {
    const despacio =
      !l.enTierra &&
      l.altura >= ALTURA_DE_MANIOBRA &&
      l.velocidad <= l.vref * LENTO_SOBRE_VREF &&
      Math.abs(l.vertical) <= LENTO_NIVELADO &&
      !l.avisoDePerdida;
    this.despacio = despacio ? this.despacio + dt : 0;
    return this.despacio >= LENTO_DURANTE;
  }

  /**
   * **Ñandutí**: entrar en una nube y salir de ella, en un avión que vuela por
   * instrumentos. Ver la cabecera: en una avioneta de vuelo visual no sale.
   */
  private nanduti(dt: number, l: LecturaDeLosSellos): boolean {
    if (!l.porInstrumentos || l.enTierra) {
      this.enLaNube = 0;
      return false;
    }
    if (l.enNube >= DENTRO_DE_LA_NUBE) {
      this.enLaNube += dt;
      return false;
    }
    if (l.enNube > FUERA_DE_LA_NUBE) return false;
    const atraveso = this.enLaNube >= EN_LA_NUBE_DURANTE;
    this.enLaNube = 0;
    return atraveso;
  }

  /**
   * **La vuelta al tajamar**: una vuelta entera alrededor del tajamar de la
   * granja, en el aire y a la altura de la maniobra. Se cuenta el ángulo que
   * se va girando visto desde el agua; salirse del anillo —muy cerca, muy
   * lejos, muy bajo o muy alto— empieza la cuenta otra vez.
   */
  private tajamar(l: LecturaDeLosSellos): boolean {
    const t = l.alTajamar;
    const d = t ? Math.hypot(t.dx, t.dz) : 0;
    const enElAnillo =
      t !== null &&
      !l.enTierra &&
      l.altura >= ALTURA_DE_MANIOBRA &&
      l.altura <= TAJAMAR_ALTO &&
      d >= TAJAMAR_CERCA &&
      d <= TAJAMAR_LEJOS;
    if (!enElAnillo || !t) {
      this.alrededor = 0;
      this.anguloAntes = null;
      return false;
    }
    const angulo = Math.atan2(t.dz, t.dx);
    if (this.anguloAntes !== null) this.alrededor += aLaMitad(angulo - this.anguloAntes);
    this.anguloAntes = angulo;
    return Math.abs(this.alrededor) >= 2 * Math.PI;
  }

  /**
   * **Tres toques**: tocar la pista y volver a subir sin parar, tres veces en
   * el mismo vuelo. Es el toque y despegue de las tardes de escuela, la forma
   * de practicar tomas una detrás de otra.
   */
  private tresToques(l: LecturaDeLosSellos): boolean {
    if (!this.tocoSinParar) return false;
    if (l.enTierra && l.porElSuelo < PARADO_EN_LA_PISTA) {
      // Se ha parado: eso es una toma completa, no un toque.
      this.tocoSinParar = false;
      return false;
    }
    if (l.enTierra || l.altura < SUBE_DEL_TOQUE) return false;
    this.tocoSinParar = false;
    this.toques++;
    return this.toques >= TOQUES;
  }

  /** Se acaba de despegar, saliendo de una carrera de verdad. */
  alDespegar(sola: boolean): void {
    this.despego = true;
    this.solaDesdeElDespegue = sola;
  }

  /**
   * **Una toma que cuenta**: en la pista, sin percance y sin golpe. Es la
   * misma que apunta el cuaderno, y por eso se llama desde el mismo sitio.
   */
  alAterrizar(toma: TomaDelSello): Sello[] {
    this.tocoSinParar = true;
    const salen: Sello[] = [];
    /*
     * **El primer solo**: despegar y aterrizar sin instructora. Es el día que
     * se recuerda de toda una carrera, y es exactamente eso: la instructora
     * se baja y se da una vuelta al circuito. Con el despegue en este vuelo:
     * empezar en el aire no es un solo.
     */
    if (toma.sola && this.despego && this.solaDesdeElDespegue) salen.push("primer-solo");
    /*
     * **Chipa volandera**: despegar de un campo y aterrizar en otro. Es la
     * primera travesía, la que lleva de un pueblo a otro como la chipa.
     */
    if (toma.salida && toma.campo !== toma.salida) salen.push("chipa-volandera");
    // **Jasy**, la luna: una toma de noche.
    if (toma.noche) salen.push("jasy");
    /*
     * **El planeador**: llegar a la pista sin motor. Es lo que se entrena
     * para el día que un motor se pare, y lo que hizo el planeador de Gimli.
     */
    if (toma.sinMotor) salen.push("planeador");
    /*
     * **Transchaco**: de Asunción a Mariscal Estigarribia, o al revés, por
     * encima del Chaco que cruza la ruta.
     */
    const ida = [toma.salida, toma.campo].sort().join(">");
    if (ida === [...TRANSCHACO].sort().join(">")) salen.push("transchaco");
    return this.salen(salen);
  }
}
