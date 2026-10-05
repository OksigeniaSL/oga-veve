/**
 * **Los flaps, arriba al dejar la pista. No antes.**
 *
 * Visto en vídeos de aterrizajes: «los pilotos suben los flaps al acabar». Es
 * verdad, y el cuándo es la mitad de la lección. Se suben **al dejar la
 * pista**, como primera cosa de la lista de después del aterrizaje —flaps
 * arriba, aerofrenos recogidos, luces de aterrizaje apagadas y las de rodaje
 * encendidas, transpondedor—, y no en la carrera: con el avión corriendo, la
 * palanca de flaps está al lado de otras, y la que se toca sin querer puede
 * ser la del tren. Es de las pocas cosas de una cabina que se enseñan con un
 * accidente detrás.
 *
 * Tres momentos, y en ninguno se castiga nada:
 *
 * - **En la carrera**, si se suben: se dice por qué ahí no, una vez.
 * - **Al salir de la pista**, si siguen fuera: se recuerda. En los peldaños
 *   de abajo, «ahora sí, subí los flaps»; en el de cabina, la lista de
 *   después del aterrizaje, que es como se hace en un avión de dos pilotos.
 * - **Al llegar al puesto**, si todavía siguen fuera: se nota, con calma —la
 *   próxima, al dejar la pista—. Rodar con los flaps fuera no rompe nada, pero
 *   las piedras y el barro de las calles van a dar justo ahí, y en un
 *   aeropuerto de verdad el de tierra lo ve desde lejos.
 *
 * Función pura: recibe la fase de antes y la de ahora, la palanca de antes y
 * la de ahora, y lo que ya se dijo en esta toma. `Game` pone la voz.
 */

import type { Fase } from "./vuelo";

/** Lo que ya se dijo en esta toma, para no repetirlo. */
export interface LoDicho {
  readonly enLaCarrera: boolean;
  readonly alSalir: boolean;
  readonly alPuesto: boolean;
}

/** Nada dicho: una toma nueva. */
export const NADA_DICHO: LoDicho = {
  enLaCarrera: false,
  alSalir: false,
  alPuesto: false,
};

/** Qué toca decir ahora, si algo. */
export type LoQueToca = "enLaCarrera" | "alSalir" | "alPuesto" | null;

/** Las fases de la carrera: el avión en la pista, después de tocar. */
const EN_LA_CARRERA: ReadonlySet<Fase | ""> = new Set(["aterrizado", "abandonando"]);

/** Y las de después, ya fuera de ella. */
const FUERA_DE_LA_PISTA: ReadonlySet<Fase | ""> = new Set([
  "a-plataforma",
  "en-puesto",
]);

export function flapsTrasLaToma(
  antes: { readonly fase: Fase | ""; readonly palanca: number },
  ahora: { readonly fase: Fase; readonly palanca: number },
  dicho: LoDicho,
): { readonly toca: LoQueToca; readonly dicho: LoDicho } {
  // Una toma nueva empieza de cero: lo dicho en la anterior ya no cuenta.
  const nueva = ahora.fase === "aterrizado" && !EN_LA_CARRERA.has(antes.fase);
  const ya = nueva ? NADA_DICHO : dicho;

  if (
    EN_LA_CARRERA.has(ahora.fase) &&
    !nueva &&
    ahora.palanca < antes.palanca &&
    !ya.enLaCarrera
  )
    return { toca: "enLaCarrera", dicho: { ...ya, enLaCarrera: true } };

  const fuera = ahora.palanca > 0;
  if (
    antes.fase === "abandonando" &&
    FUERA_DE_LA_PISTA.has(ahora.fase) &&
    fuera &&
    !ya.alSalir
  )
    return { toca: "alSalir", dicho: { ...ya, alSalir: true } };

  // Al puesto viniendo de rodar hacia él: si se llega directo desde la pista,
  // el recordatorio de salir acaba de sonar y dos seguidos sobran.
  if (
    antes.fase === "a-plataforma" &&
    ahora.fase === "en-puesto" &&
    fuera &&
    ya.alSalir &&
    !ya.alPuesto
  )
    return { toca: "alPuesto", dicho: { ...ya, alPuesto: true } };

  return { toca: null, dicho: ya };
}

// ── La lista de después del aterrizaje, cada cosa a su ritmo ──────────

/*
 * **Una cosa detrás de otra, y no todas a la vez.**
 *
 * Enrique, saliendo de la pista: «los flaps los estoy recogiendo ahora, que la
 * instructora no me da ni tiempo a hacerlo todo». Al dejar la pista sonaban
 * juntos la fase —«volvé a tu lugar»—, la torre con el rodaje y los flaps; y
 * en el peldaño de cabina, la lista entera en una frase. Una lista no se hace
 * así en ningún avión: se lee punto por punto y cada punto se hace antes de
 * leer el siguiente.
 *
 * Lo real, por clase:
 *
 * - **Un avión de línea de reactor.** El procedimiento de después del
 *   aterrizaje del 737 NG (FCOM, *Normal Procedures*, «After Landing
 *   Procedure») empieza **al dejar libre la pista activa**, y lo hace el que
 *   no rueda: la palanca de los aerofrenos abajo, los flaps arriba, las luces
 *   —las de aterrizaje apagadas, la de rodaje encendida— y el transpondedor
 *   como toque. El de Airbus va en el mismo orden para lo que aquí se mueve:
 *   aerofrenos desarmados, flaps a cero, el TCAS en espera y las luces de
 *   fuera (FlyByWire, A32NX, *After Landing and Taxi to Gate*).
 * - **Un turbohélice y una avioneta**, sin aerofrenos: la lista de su clase
 *   empieza por los flaps —«Wing Flaps — UP», el primer punto del *After
 *   Landing* del manual de una Cessna 172— y sigue con las luces y el
 *   transpondedor.
 *
 * Y quién hace cada punto: **lo que tiene tecla lo hace quien vuela** —los
 * aerofrenos y los flaps—, que es lo que se aprende haciéndolo; **las luces y
 * el transpondedor los hace la instructora**, que va sentada al lado, y lo
 * dice al hacerlo. Lo que ya está hecho no se pide.
 *
 * El ritmo: el primer punto espera a que se oiga lo de dejar la pista; cada
 * punto pedido espera a estar hecho, o un rato razonable si no se hace —no se
 * insiste, se sigue—, y entre uno y otro queda un respiro. Y nadie habla
 * encima de nadie: si alguien está hablando, el punto siguiente espera.
 */

/** Los puntos de la lista que se mueven en este juego. */
export type PuntoDeLaLista = "aerofrenos" | "flaps" | "luces" | "transpondedor";

/** De quién es cada punto: de quien vuela, o de la instructora. */
export const DE_QUIEN: Readonly<Record<PuntoDeLaLista, "tuyo" | "suyo">> = {
  aerofrenos: "tuyo",
  flaps: "tuyo",
  luces: "suyo",
  transpondedor: "suyo",
};

/** Lo que hace falta saber de un avión para su lista. */
export interface ClaseDeLaLista {
  readonly llevaFlaps: boolean;
  /** Si lleva aerofrenos: `null` si no. */
  readonly aerofrenos: unknown;
}

/** La lista de este avión, en su orden. Ver la nota de arriba. */
export function listaDe(a: ClaseDeLaLista): readonly PuntoDeLaLista[] {
  const lista: PuntoDeLaLista[] = [];
  if (a.aerofrenos !== null && a.aerofrenos !== undefined) lista.push("aerofrenos");
  if (a.llevaFlaps) lista.push("flaps");
  lista.push("luces", "transpondedor");
  return lista;
}

/**
 * **Cuánto se espera, ya fuera de la pista, a leer el primer punto**, s:
 * lo que tarda en oírse la fase y la torre con el rodaje.
 */
export const ANTES_DE_EMPEZAR = 6;

/** **El respiro entre un punto hecho y el siguiente**, s. */
export const ENTRE_PUNTOS = 4;

/**
 * **Lo que se espera a que se haga un punto pedido**, s: veinte. Pasado eso,
 * se sigue con el siguiente sin insistir; lo que quede por hacer se ve en el
 * cuadro y, los flaps, al llegar al puesto. Ver `flapsTrasLaToma`.
 */
export const PACIENCIA = 20;

/** Lo que mira la lista en cada paso. */
export interface LecturaDeLaLista {
  readonly fase: Fase;
  readonly flapsFuera: boolean;
  readonly aerofrenosFuera: boolean;
  /** Si hay alguien hablando: el punto siguiente espera a que acabe. */
  readonly hablando: boolean;
  readonly dt: number;
}

/** Lo que toca leer ahora de la lista: el punto, y si se pide o se hace. */
export interface PuntoLeido {
  readonly punto: PuntoDeLaLista;
  readonly como: "pide" | "hace";
}

export class ListaDeDespuesDeAterrizar {
  private lista: readonly PuntoDeLaLista[];
  private i = 0;
  private empezada = false;
  private tocada = false;
  private pedido = false;
  private desde = 0;
  private faseAntes: Fase | "" = "";
  /** Lo leído en esta toma, en orden. Para el banco y las pruebas. */
  readonly leidos: PuntoLeido[] = [];

  constructor(a: ClaseDeLaLista) {
    this.lista = listaDe(a);
  }

  /** Otro avión, o un vuelo nuevo: la lista de ese avión, sin empezar. */
  reiniciar(a?: ClaseDeLaLista): void {
    if (a) this.lista = listaDe(a);
    this.i = 0;
    this.empezada = false;
    this.tocada = false;
    this.pedido = false;
    this.desde = 0;
    this.faseAntes = "";
    this.leidos.length = 0;
  }

  /** El punto pedido que se espera ahora, si hay uno. */
  get esperando(): PuntoDeLaLista | null {
    return this.empezada && this.pedido ? (this.lista[this.i] ?? null) : null;
  }

  paso(l: LecturaDeLaLista): PuntoLeido | null {
    const antes = this.faseAntes;
    this.faseAntes = l.fase;
    // Una toma nueva —también la de después de un toque y despegue—, de cero.
    if (l.fase === "aterrizado" && !EN_LA_CARRERA.has(antes)) {
      this.reiniciar();
      this.tocada = true;
      this.faseAntes = l.fase;
      return null;
    }
    if (!this.tocada) return null;
    // El primer punto es dejar libre la pista: hecho al salir de ella.
    if (!FUERA_DE_LA_PISTA.has(l.fase)) return null;
    if (!this.empezada) {
      this.empezada = true;
      this.desde = 0;
    }
    this.desde += l.dt;
    while (this.i < this.lista.length) {
      const punto = this.lista[this.i]!;
      const hecho =
        punto === "flaps" ? !l.flapsFuera : punto === "aerofrenos" ? !l.aerofrenosFuera : false;
      if (this.pedido) {
        // Lo pedido, hecho o esperado lo bastante: al siguiente, con respiro.
        if (hecho || this.desde >= PACIENCIA) {
          this.i++;
          this.pedido = false;
          this.desde = 0;
        }
        return null;
      }
      // Lo tuyo que ya está hecho no se pide: se pasa sin decir nada.
      if (DE_QUIEN[punto] === "tuyo" && hecho) {
        this.i++;
        continue;
      }
      const respiro = this.leidos.length === 0 ? ANTES_DE_EMPEZAR : ENTRE_PUNTOS;
      if (this.desde < respiro || l.hablando) return null;
      this.desde = 0;
      const leido: PuntoLeido = { punto, como: DE_QUIEN[punto] === "tuyo" ? "pide" : "hace" };
      this.leidos.push(leido);
      // Lo suyo se hace al decirlo; lo tuyo espera a que lo hagas.
      if (leido.como === "hace") this.i++;
      else this.pedido = true;
      return leido;
    }
    return null;
  }
}
