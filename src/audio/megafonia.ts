/**
 * La megafonía de cabina: la comandante Jazlyn.
 *
 * Pedido así: «voz del piloto saludando o indicando cosas —"señores pasajeros
 * estamos iniciando la maniobra", "tripulación, armar rampas y crosscheck"—…
 * Si hace falta la voz de alguien que haga de capitán o comandante, será una
 * mujer y, obviamente, se llamará **Jazlyn**».
 *
 * ## Solo donde hay pasaje
 *
 * Del turbohélice para arriba. Una avioneta de escuela no lleva megafonía ni
 * tiene a quién hablarle, y eso es justo lo que enseña la escalera de la flota:
 * **cambiar de avión cambia el oficio**. En el Pykasu se vuela; en el Yvága se
 * lleva gente, y se nota antes de despegar.
 *
 * ## Qué decide que hable
 *
 * La fase del vuelo, y nada más. Cada anuncio tiene su momento, y el momento
 * pasa una vez: quien está rodando oye la bienvenida; quien acaba de recibir la
 * luz verde oye el crosscheck; quien llega arriba oye lo del cinturón. Si el
 * momento se fue —se despegó sin oír la bienvenida porque había otra cosa
 * sonando— **no se dice después**: un anuncio de bienvenida con el avión en el
 * aire no es un anuncio, es un error.
 *
 * ## Y nunca por encima de la instructora
 *
 * Es la regla de la casa y aquí importa más que en ningún sitio: la megafonía
 * es ambiente y la instructora es la lección. Si está hablando, Jazlyn espera
 * su turno; si el turno no llega, se calla. Ver `audio/boca.ts`, que es quien
 * reparte la palabra.
 *
 * ## El guion de cualquier vuelo de línea
 *
 * Pedido porque «forma parte de la vida de volar» y «así también volar se
 * hace más entretenido». Es el mismo en todos los vuelos de pasaje del mundo,
 * y por eso se aprende sin proponérselo:
 *
 * 1. En el puesto, con las puertas cerradas: armar toboganes.
 * 2. Rodando: la bienvenida, con el destino, cuánto dura y a qué altura.
 * 3. Autorizados: tripulación, sentados para el despegue.
 * 4. Arriba y asentados: se apaga el cartel del cinturón.
 * 5. Y poco después, **la tripulación anuncia el servicio**.
 * 6. Al empezar a bajar, la comandante: cuánto falta, qué cielo y qué
 *    temperatura hay allí. Y se enciende el cartel.
 * 7. A la vez, la tripulación: cinturones, respaldos y mesitas.
 * 8. Ya en la aproximación: tripulación, prepararse para el aterrizaje.
 * 9. Y al llegar, la despedida con el nombre del sitio.
 *
 * ## Y la tripulación de cabina solo donde la hay
 *
 * Con pasaje no basta. Un turbohélice de diecinueve plazas vuela **sin
 * auxiliares**, que es lo que dice la ley en Europa y en América: la
 * tripulación de cabina es obligatoria a partir de veinte plazas. Así que en
 * el JAZ 60 la comandante habla al pasaje y nadie arma toboganes ni pasa con
 * el carrito, porque no hay quién; en el JAZ 90 y el JAZ 120, sí. Ver
 * `conTripulacion`.
 *
 * ## Y en los momentos tranquilos
 *
 * La megafonía va en el mismo turno que la radio —ver `MEGAFONIA` en
 * `boca.ts` y el orden de `turnos.ts`—: una vez que habla no la pisa nadie,
 * y ella tampoco pisa a nadie. En un avión de verdad existe la **cabina estéril**: por
 * debajo de diez mil pies, en el despegue y en la llegada, nadie habla con los
 * pilotos de nada que no sea el vuelo. Aquí eso es la regla de siempre dicha
 * del todo: la megafonía espera a que **no hable nadie** —ni la instructora,
 * ni la torre, ni el otro avión, ni la voz de la máquina— y lo que no cabe en
 * su momento se calla. Lo nuevo del guion va en crucero y en la bajada, antes
 * de la final, que es donde lo pone cualquier comandante.
 */

import type { Fase } from "../flight/vuelo";

/** Lo que puede decir, en el orden en que pasa un vuelo. */
export const ANUNCIOS = [
  "comandante.crosscheck",
  "comandante.bienvenida",
  "comandante.despegue",
  "comandante.crucero",
  "tripulacion.servicio",
  "comandante.descenso",
  "tripulacion.cinturones",
  "comandante.aproximacion",
  "comandante.llegada",
] as const;

export type Anuncio = (typeof ANUNCIOS)[number];

/**
 * Los que no existen sin tripulación de cabina: los que se le dicen a ella y
 * los que dice ella. Sin auxiliares a bordo, «tripulación, sentados para el
 * despegue» no se lo dice nadie a nadie.
 */
const DE_LA_TRIPULACION: ReadonlySet<Anuncio> = new Set<Anuncio>([
  "comandante.crosscheck",
  "comandante.despegue",
  "tripulacion.servicio",
  "tripulacion.cinturones",
  "comandante.aproximacion",
]);

/**
 * En qué fase toca cada uno.
 *
 * No es una lista de momentos bonitos: es lo que de verdad se dice en un vuelo
 * y cuándo. El crosscheck va con la autorización —es el aviso de que esto va en
 * serio— y el de sentarse, con la alineación.
 */
/**
 * ── **Y la fase no basta para el del cinturón** ──
 *
 * «¿Cómo dice la comandante que ya estamos arriba y pueden soltarse el
 * cinturón si todavía estoy empezando a levantar el avión en la pista?»
 *
 * Exacto: la fase `en-vuelo` empieza **en el instante en que las ruedas dejan
 * el asfalto**, así que el anuncio de crucero salía a veinte metros de altura
 * con el avión todavía rotando. Eso no lo dice nadie en ningún avión.
 *
 * El del cinturón no es un anuncio de fase, es un anuncio de **condiciones**:
 * se dice cuando el avión está arriba y ha dejado de subir. Las dos cosas, y
 * no una — a mitad de una subida fuerte tampoco se suelta nadie el cinturón.
 */
/*
 * **Y cada anuncio tiene más de una fase buena, que es lo que faltaba.**
 *
 * Había una sola por anuncio, y eso se rompe en cuanto una lección no pasa por
 * ella. «Dar una vuelta» arranca **en la pista** —ver `lecciones.ts`— así que
 * las fases `rodando`, `autorizado` y `alineando` no ocurren nunca, y con
 * ellas se caían tres de los seis anuncios. Contado jugando, y con razón:
 * «hace tiempo que no oigo a la comandante, ¿ya dejó la compañía?».
 *
 * Así que cada anuncio lleva **las fases en las que todavía viene a cuento**,
 * en orden. La bienvenida se da rodando, y quien empieza en la pista la oye
 * antes de soltar frenos; el crosscheck, al recibir la autorización o ya
 * alineado. Lo que no se hace es decirlo fuera de tiempo: no hay bienvenida
 * después de despegar.
 */
/*
 * **Y en el orden en que pasa de verdad, que no era éste.**
 *
 * «Armar rampas y verificación cruzada» estaba puesto con la autorización de
 * despegue, y ahí no lo dice nadie: en un avión de verdad eso se canta con
 * las puertas ya cerradas, **antes de empujar y antes de arrancar motores** —
 * es lo que arma los toboganes de evacuación para que salgan solos si hace
 * falta, y por eso se hace parado en el puesto y no rodando—.
 *
 * Contado jugando, tres veces y en tres aeropuertos: «la comandante le dice a
 * la tripulación que armen rampas y verificación cruzada cuando ya salí y
 * estoy en rodadura con permiso para salir, eso se dice antes de arrancar
 * motores»; «pero si ya saqué el avión del hangar, es absurdo».
 *
 * Así que la secuencia queda como es: los toboganes en el puesto, la
 * bienvenida rodando, y «sentados para el despegue» con la autorización —que
 * es cuando la tripulación se sienta de verdad—.
 *
 * Y el que no cabe, no se dice: una lección que empieza en la pista no tiene
 * puesto ni puertas que cerrar, así que ahí no hay crosscheck. Es la misma
 * regla que ya gobierna la bienvenida: no se dice fuera de tiempo.
 */
/*
 * **Y el descenso ya no va en la final.** «Empezamos a bajar» sonaba al
 * entrar en final, que es justo donde no lo dice nadie: ahí se está a un
 * minuto de la pista, con la instructora hablando y la cabina estéril. Lo de
 * la bajada va en su sitio —el punto en que se empieza a bajar, dentro de
 * `en-vuelo`— y a la final no llega nada nuevo de la megafonía.
 */
const CUANDO: Record<Anuncio, readonly Fase[]> = {
  "comandante.crosscheck": ["estacionado", "arrancando"],
  "comandante.bienvenida": ["rodando", "esperando", "alineando"],
  "comandante.despegue": ["autorizado", "alineando", "despegando"],
  "comandante.crucero": ["en-vuelo"],
  "tripulacion.servicio": ["en-vuelo"],
  "comandante.descenso": ["en-vuelo"],
  "tripulacion.cinturones": ["en-vuelo"],
  "comandante.aproximacion": ["en-vuelo"],
  "comandante.llegada": ["abandonando", "a-plataforma"],
};

/**
 * **Si a un anuncio pedido se le pasó el momento** esperando su voz o su
 * turno: los de tierra tienen sus fases, y fuera de ellas no se dicen.
 *
 * Hace falta desde que lo pedido espera a su grabación —ver `estaLista` en
 * `audio/instructor-grabado.ts`—: el crosscheck pedido en el puesto puede
 * estar esperando cuando el avión ya rueda, y «armar toboganes» rodando es
 * justo lo que no se dice —«eso se dice antes de arrancar motores»—. Se
 * retira de la cola y ya está. Se reconoce por la clave, con sus formas y su
 * relleno detrás.
 */
export function seLePasoElMomento(clave: string | undefined, fase: Fase): boolean {
  if (!clave) return false;
  const base = clave.replace(/[@~].*$/, "");
  for (const a of DE_TIERRA)
    if (base === a || base.startsWith(a)) return !CUANDO[a].includes(fase);
  return false;
}

const DE_TIERRA = [
  "comandante.crosscheck",
  "comandante.bienvenida",
  "comandante.despegue",
] as const satisfies readonly Anuncio[];

/**
 * Cuánto se espera dentro de la fase antes de hablar, en segundos.
 *
 * Un anuncio pegado al cambio de fase pisa a la instructora, que es la que dice
 * lo que hay que hacer justo en ese instante. Cuatro segundos después, la orden
 * ya se oyó y la megafonía suena a lo que es: alguien hablándole al pasaje
 * mientras tú vuelas.
 */
const ESPERA = 4;

/**
 * Y cuánto dura el momento. Pasado esto, ese anuncio ya no toca.
 *
 * Veinticinco segundos: lo que dura una fase corta. Si no se pudo decir en ese
 * rato —porque estaba hablando la instructora— es que ya no venía a cuento.
 */
const SE_PASA = 25;

/**
 * **Menos los de crucero, que tienen todo el crucero.**
 *
 * Veinticinco segundos es lo que dura una fase de tierra. El servicio y la
 * bajada no van pegados a un instante: el servicio se anuncia cuando la
 * cabina está tranquila, y en un crucero con la radio hablando eso puede
 * tardar. Lo que no se hace es anunciarlo después de empezar a bajar, y eso
 * lo guardan sus condiciones, no el reloj.
 */
const VENTANA: Partial<Record<Anuncio, number>> = {
  "tripulacion.servicio": 120,
  "comandante.descenso": 60,
  "tripulacion.cinturones": 40,
  "comandante.aproximacion": 60,
};

/**
 * Cuánto después del cartel apagado se anuncia el servicio, en segundos.
 *
 * Veinte: el tiempo de que la tripulación se levante y prepare el carrito.
 * Pegado a la frase de la comandante sonaría a que se pisan.
 */
export const ANTES_DEL_SERVICIO = 20;

/**
 * Cuánto se tiene que llevar bajando, en segundos, para que sea un descenso.
 *
 * Doce, y con al menos `YA_EMPEZO_A_BAJAR` metros perdidos: una bajada que
 * dura eso es una decisión, y un bache de medio minuto no lo es. Es el
 * momento real en que el piloto empieza a bajar, visto desde fuera.
 */
export const BAJANDO_SEGUIDO = 12;

/**
 * Y a qué ritmo cuenta como bajar, en m/s: trescientos pies por minuto. Por
 * debajo de eso es el vaivén de cualquier crucero.
 */
export const BAJA = 1.5;

/**
 * Con cuánto perdido ya no hace falta esperar: cuatrocientos metros por
 * debajo de lo más alto es un descenso lo mida quien lo mida.
 */
export const BAJO_DE_VERDAD = 400;

/**
 * A qué altura sobre el campo empieza la aproximación, en metros.
 *
 * Mil, unos tres mil pies: es la altura a la que se empieza una aproximación
 * de verdad, y queda bien por encima de la final —trescientos—, que es donde
 * la instructora tiene la palabra. «Tripulación, prepararse para el
 * aterrizaje» se dice aquí y no allí.
 */
export const EN_APROXIMACION = 1000;

/**
 * Y cuánto después del aviso de los cinturones, en segundos: que la tripulación haya
 * tenido tiempo de pasar por el pasillo antes de que la manden sentarse.
 */
export const ANTES_DE_LA_APROXIMACION = 20;

/**
 * A qué altura sobre el campo se apaga el cartel del cinturón, en metros.
 *
 * Cuatrocientos. En un avión de verdad son diez mil pies y aquí eso sería no
 * decirlo nunca: el circuito de tráfico entero se vuela a doscientos
 * cincuenta. Cuatrocientos es **por encima del circuito** —o sea, ya no estás
 * dando vueltas al campo, te has ido— y se alcanza en cualquier vuelo que
 * vaya a alguna parte.
 *
 * Y en un circuito de toques y despegues no se dice, que es lo correcto: ahí
 * el cinturón no se suelta nadie.
 */
export const ARRIBA_DEL_TODO = 400;

/**
 * Y cuánto puede estar subiendo para considerarse asentado, en m/s.
 *
 * Dos y medio, que son unos quinientos pies por minuto: por encima de eso el
 * avión sigue subiendo de verdad y el cartel no se apaga. Es la misma banda
 * muerta que usa el variómetro para decidir si la altitud se mueve.
 */
export const YA_NO_SUBE = 2.5;

/**
 * Cuántos metros por debajo de lo más alto del vuelo cuentan como «ya baja».
 *
 * Ciento cincuenta. Por debajo de eso es la oscilación normal de un avión en
 * crucero —nadie mantiene el nivel al metro— y por encima ya es un descenso
 * que alguien decidió.
 */
export const YA_EMPEZO_A_BAJAR = 150;

/** Lo que la megafonía mira del vuelo para saber si le toca hablar. */
export interface Momento {
  readonly fase: Fase;
  /** Si este avión lleva pasaje. Ver `conPasaje`. */
  readonly conPasaje: boolean;
  /**
   * Si además lleva tripulación de cabina. Ver `conTripulacion`. Sin ella
   * no hay servicio, ni toboganes, ni nadie a quien mandar sentarse.
   */
  readonly conTripulacion?: boolean;
  /** Si la instructora está diciendo algo ahora mismo. */
  readonly instructorHablando: boolean;
  /**
   * Si habla **cualquier otro** de fuera de la megafonía: la torre, el otro
   * avión o la voz de la máquina. Ver «Y en los momentos tranquilos» arriba.
   */
  readonly otrosHablando?: boolean;
  /**
   * Si la propia megafonía está sonando: la comandante señalando un monte o
   * la tripulación a media frase. Un anuncio no empieza encima de otro —el
   * altavoz del techo es uno—, y esperar en la cola de la boca no sirve: allí
   * lo que espera más de cuatro segundos caduca. Ver `CADUCA` en `boca.ts`.
   */
  readonly megafoniaHablando?: boolean;
  /**
   * Si el cartel del cinturón está encendido. El servicio no se anuncia con
   * el cartel puesto: con turbulencia, la tripulación se queda sentada.
   */
  readonly cartelPuesto?: boolean;
  /** A qué altura se va sobre el aeródromo, en metros. */
  readonly sobreElCampo: number;
  /** Y cuánto se sube o se baja, en metros por segundo. */
  readonly vertical: number;
  /**
   * Cuántos metros se ha bajado ya desde lo más alto de este vuelo.
   *
   * Sirve para una cosa sola y hace falta: **saber si el vuelo ya empezó a
   * bajar**. La fase no lo dice —en una ruta entre dos aeropuertos el descenso
   * entero ocurre dentro de `en-vuelo`— y la velocidad vertical tampoco, porque
   * un descenso suave pasa por cero muchas veces.
   *
   * Sin esto, la comandante decía «ya estamos arriba, pueden soltarse el
   * cinturón» **bajando hacia el destino**: «no es el momento de quitarse el
   * cinturón, es el momento de ponérselo».
   */
  readonly desdeLoMasAlto: number;
}

/**
 * Si se está arriba y asentado: la condición del cartel apagado.
 *
 * Ver `ARRIBA_DEL_TODO`, `YA_NO_SUBE` y `YA_EMPEZO_A_BAJAR`.
 */
function arribaYAsentado(m: Momento): boolean {
  return (
    m.sobreElCampo >= ARRIBA_DEL_TODO &&
    Math.abs(m.vertical) < YA_NO_SUBE &&
    /*
     * **Y que el vuelo no haya empezado a bajar.**
     *
     * Este anuncio es del final de la subida, no de cualquier momento
     * nivelado. En una ruta entre dos aeropuertos el descenso entero pasa
     * dentro de la misma fase y con la vertical cruzando el cero cada poco,
     * así que sin mirar cuánto se ha bajado ya desde lo más alto, la frase
     * salía **descendiendo hacia el destino** — justo cuando el cinturón se
     * pone, no se quita. Ver `YA_EMPEZO_A_BAJAR`.
     */
    m.desdeLoMasAlto < YA_EMPEZO_A_BAJAR
  );
}

export class Megafonia {
  /** Lo ya dicho en este vuelo: cada anuncio se dice una vez. */
  private readonly dichos = new Set<Anuncio>();
  /** En qué fase se está y cuánto lleva. */
  private fase: Fase | null = null;
  private desde = 0;
  /** Desde cuándo cada anuncio cumple sus condiciones. Ver `paso`. */
  private readonly listoDesde = new Map<Anuncio, number>();
  /**
   * Cuánto hace que se dijo cada anuncio, en segundos de juego.
   *
   * Hace falta para lo que va **detrás** de otro: el servicio, un rato
   * después de apagarse el cartel; la aproximación, un rato después de los
   * cinturones. Pegados suenan a que se pisan.
   */
  private readonly haceQue = new Map<Anuncio, number>();
  /** Si este vuelo llegó a estar arriba y asentado. Ver `seDanLasCondiciones`. */
  private estuvoArriba = false;
  /** Cuántos segundos seguidos lleva bajando. Ver `BAJANDO_SEGUIDO`. */
  private bajando = 0;
  /** Si ya empezó el descenso, lo haya visto esto o lo haya dicho el plan. */
  private descensoEmpezado = false;

  /** Vuelo nuevo: se olvida de todo. */
  reiniciar(): void {
    this.dichos.clear();
    this.listoDesde.clear();
    this.haceQue.clear();
    this.fase = null;
    this.desde = 0;
    this.estuvoArriba = false;
    this.bajando = 0;
    this.descensoEmpezado = false;
  }

  /**
   * **El punto de empezar a bajar, dicho desde fuera.**
   *
   * El descenso se ve aquí mirando el avión —salir de crucero y bajar de forma
   * sostenida—, que es el momento real en que el piloto empieza a bajar. Pero
   * una comandante de verdad no espera a notarlo: lo tiene calculado en el
   * plan, es el T/D —*top of descent*— y el anuncio se hace ahí. Cuando el
   * juego sepa calcularlo (`alEmpezarElDescenso`, ver #72), lo avisa por aquí
   * y el guion sigue igual, solo que a su hora exacta.
   *
   * Solo cuenta si el vuelo llegó a estar arriba: un T/D en mitad de la subida
   * de un salto corto no es un descenso que anunciar.
   */
  empezarElDescenso(): void {
    this.descensoEmpezado = true;
  }

  /** Si ya se empezó a bajar hacia el destino. Para el juego y los bancos. */
  get bajandoAlDestino(): boolean {
    return this.descensoEmpezado && this.estuvoArriba;
  }

  /**
   * Si este anuncio, además de su fase, pide condiciones.
   *
   * Los de tierra no piden nada más que su fase. Los del aire son de
   * **condiciones**: el cartel se apaga arriba y asentado, el servicio va
   * detrás de él, el descenso cuando de verdad se baja, y cada aviso de la
   * bajada detrás del anterior. Es el orden de un vuelo de verdad, y aquí no
   * puede salir de otro modo.
   */
  private seDanLasCondiciones(anuncio: Anuncio, m: Momento): boolean {
    switch (anuncio) {
      case "comandante.crucero":
        return arribaYAsentado(m) && !this.descensoEmpezado;
      case "tripulacion.servicio":
        return (
          this.hace("comandante.crucero") >= ANTES_DEL_SERVICIO &&
          !m.cartelPuesto &&
          !this.descensoEmpezado &&
          m.sobreElCampo >= ARRIBA_DEL_TODO
        );
      case "comandante.descenso":
        return this.bajandoAlDestino;
      case "tripulacion.cinturones":
        return this.dichos.has("comandante.descenso");
      case "comandante.aproximacion":
        return (
          this.hace("tripulacion.cinturones") >= ANTES_DE_LA_APROXIMACION &&
          m.sobreElCampo < EN_APROXIMACION
        );
      default:
        return true;
    }
  }

  /** Segundos desde que se dijo, o `-Infinity` si no se ha dicho. */
  private hace(anuncio: Anuncio): number {
    return this.haceQue.get(anuncio) ?? -Infinity;
  }

  /**
   * Mira si el vuelo ya baja de verdad hacia el destino.
   *
   * Dos maneras, y cualquiera vale: llevar `BAJANDO_SEGUIDO` segundos bajando
   * con `YA_EMPEZO_A_BAJAR` metros perdidos, o haber perdido `BAJO_DE_VERDAD`
   * de golpe. Subir de verdad pone el reloj a cero; el vaivén del crucero, que
   * cruza el cero cada poco, ni suma ni resta.
   */
  private mirarSiBaja(dt: number, m: Momento): void {
    if (arribaYAsentado(m)) this.estuvoArriba = true;
    if (m.vertical < -BAJA) this.bajando += dt;
    else if (m.vertical > YA_NO_SUBE) this.bajando = 0;
    if (!this.estuvoArriba) return;
    if (
      (m.desdeLoMasAlto >= YA_EMPEZO_A_BAJAR &&
        this.bajando >= BAJANDO_SEGUIDO) ||
      m.desdeLoMasAlto >= BAJO_DE_VERDAD
    )
      this.descensoEmpezado = true;
  }

  /**
   * Un paso. Devuelve la clave que toca decir, o `null`.
   *
   * Se llama cada fotograma y contesta `null` casi siempre, que es lo propio de
   * una megafonía: en un vuelo entero habla nueve veces.
   */
  paso(dt: number, m: Momento): Anuncio | null {
    if (m.fase !== this.fase) {
      this.fase = m.fase;
      this.desde = 0;
    }
    this.desde += dt;
    for (const [a, s] of this.haceQue) this.haceQue.set(a, s + dt);
    this.mirarSiBaja(dt, m);
    if (!m.conPasaje) return null;
    /*
     * **Callada mientras habla cualquiera**, no solo la instructora: la torre
     * dando una autorización, el otro avión, la máquina cantando un aviso, o
     * la propia megafonía a media frase. Es la cabina estéril dicha con las
     * reglas de este juego. Ver la cabecera.
     */
    const hayQueCallar =
      m.instructorHablando || !!m.otrosHablando || !!m.megafoniaHablando;
    for (const anuncio of ANUNCIOS) {
      if (this.dichos.has(anuncio)) continue;
      if (DE_LA_TRIPULACION.has(anuncio) && !m.conTripulacion) continue;
      if (!CUANDO[anuncio].includes(m.fase)) continue;
      if (!this.seDanLasCondiciones(anuncio, m)) continue;
      /*
       * **Y la ventana se cuenta desde que se puede decir, no desde la fase.**
       *
       * El del cinturón pide altura y calma, y eso llega cuando llega: medido
       * desde el cambio de fase, los veinticinco segundos se agotaban durante
       * la subida y el anuncio no salía nunca. Un anuncio con condiciones
       * tiene su propio reloj, que arranca el día que las cumple.
       *
       * Y el reloj se pone en marcha **aunque la instructora esté hablando**:
       * el momento pasa igual. Si no se pudo decir mientras duraba, es que ya
       * no venía a cuento — que es justo lo que este módulo prometía y lo que
       * se rompía apuntando la hora solo cuando había silencio.
       */
      /*
       * **Y el reloj cuenta el tiempo con las condiciones puestas, no el de
       * pared.**
       *
       * Antes se apuntaba el instante en que se cumplieron por primera vez y
       * se comparaba con el reloj de la fase. En una subida con el avión
       * nivelando un momento y volviendo a subir, la ventana de veinticinco
       * segundos se agotaba **mientras las condiciones no se cumplían**, y el
       * anuncio de crucero no salía jamás. Es la misma lección que ya está
       * escrita en otro sitio de esta casa: un reloj que corre cuando no pasa
       * nada no mide nada.
       */
      const llevaba = this.listoDesde.get(anuncio) ?? 0;
      const espera = llevaba + dt;
      this.listoDesde.set(anuncio, espera);
      if (hayQueCallar) return null;
      if (espera < ESPERA || espera > ESPERA + (VENTANA[anuncio] ?? SE_PASA))
        continue;
      this.dichos.add(anuncio);
      this.haceQue.set(anuncio, 0);
      return anuncio;
    }
    return null;
  }
}

/**
 * Si este avión lleva pasaje, y por tanto megafonía.
 *
 * Por el número de plazas de su ficha no, que no lo tiene: por lo que es. Del
 * turbohélice para arriba hay cabina de pasaje; del bimotor para abajo, no.
 * Se mira el peso porque es el dato que de verdad lo separa —cinco toneladas
 * largas— y no una lista de identificadores que habría que mantener a mano.
 */
export function conPasaje(masaKg: number): boolean {
  return masaKg >= 5000;
}

/**
 * Si además lleva **tripulación de cabina**: auxiliares que arman toboganes,
 * pasan con el agua y piden abrocharse los cinturones.
 *
 * Por la misma raya que la ley: hasta diecinueve plazas un avión de pasaje
 * vuela sin auxiliares, y a partir de veinte los lleva obligatoriamente —en
 * Europa y en América, que es la regla de los dos sitios del juego—. Y esa
 * raya de plazas es también una raya de peso: la categoría de cercanías, la de
 * los turbohélices de diecinueve plazas, acaba en los 8 618 kg de despegue.
 * Por encima ya es un avión de transporte con más de veinte asientos.
 *
 * Deja el JAZ 60 —diecinueve plazas, cinco toneladas y media— con pasaje y sin
 * auxiliar, que es exactamente lo que es.
 */
export function conTripulacion(masaKg: number): boolean {
  return masaKg > 8618;
}
