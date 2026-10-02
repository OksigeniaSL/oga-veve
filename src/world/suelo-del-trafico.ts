/**
 * **Por dónde rueda el tráfico dibujado**: por las calles del aeródromo, no
 * por la hierba.
 *
 * El otro avión se posaba, frenaba y «salía por el costado»: un punto a
 * cuarenta y cinco metros del eje, en diagonal y campo a través. Y el que iba a
 * despegar esperaba en otro punto inventado, en la hierba junto a la cabecera.
 * Se vio jugando en Silvio Pettirossi, dos veces: «vino esta avioneta por el
 * jardín», y después de volver a empezar, la misma avioneta **parada en la
 * hierba** a la izquierda del punto de espera, con la mano roja encendida.
 *
 * Un aeródromo se señaliza como uno de verdad y se usa como uno de verdad: el
 * que aterriza sale de la pista por una calle de salida y rueda por las calles
 * hasta la plataforma, y el que sale rueda desde la plataforma hasta un punto
 * de espera **pintado en una calle**. El grafo de calles es el mismo que usa
 * la raya verde de quien juega —ver `rodaje.ts`—, así que por construcción es
 * asfalto.
 *
 * Esto no sabe de three.js ni de la radio: devuelve caminos en coordenadas del
 * mundo y ya está. Quien los recorre es `trafico.ts`.
 */

import { enElPavimento, type Aerodrome, type Punto } from "./aerodrome";
import { construirGrafo, rodajeEntre, rodajesDesde, type Tramo } from "./rodaje";
import { delante, enEjesDePista } from "./rumbo";
import { desplazadoDe } from "./umbral-desplazado";

/** Un punto del mundo en el plano. */
export interface EnElPlano {
  readonly x: number;
  readonly z: number;
}

/** La pista en uso, en coordenadas del mundo y con su cabecera. */
export interface PistaEnUso {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly length: number;
  readonly desplazado?: number;
}

/**
 * Unos sitios del mundo por los que no se quiere pasar, y a cuánto de ellos.
 * Es `Ocupados` de `rodaje.ts` en los ejes del mundo.
 */
export interface OcupadosEnElMundo {
  readonly puntos: readonly EnElPlano[];
  readonly radio: number;
}

/** Lo que el tráfico necesita del suelo de este aeródromo. */
export interface SueloDelTrafico {
  /**
   * Para el que aterriza: la calle por la que sale y el camino hasta su
   * puesto, empezando **sobre el eje** en la boca de la salida. `pista` son
   * los metros de ese camino hasta pasar la doble raya de la salida: a partir
   * de ahí ya la ha dejado libre. Ver `DOBLE_RAYA`.
   *
   * `desdeElUmbral` es dónde puede ya salir, contado desde el umbral de
   * aterrizar: lo que tarda su tipo en frenar hasta velocidad de rodaje.
   */
  llegada(
    desdeElUmbral: number,
    evitar?: readonly EnElPlano[],
    /**
     * Por dónde no pasar si hay otra: tu avión y la raya por la que vas. Ver
     * `OCUPADA_CUESTA`.
     */
    ocupados?: OcupadosEnElMundo,
  ): {
    /** Metros desde el umbral de aterrizar hasta la boca de la salida. */
    readonly boca: number;
    readonly camino: readonly EnElPlano[];
    readonly pista: number;
  } | null;
  /**
   * Para el que sale: del puesto a la doble raya de una calle que entra en la
   * pista, y de ahí al eje. `espera` son los metros hasta la doble raya y
   * `eje`, hasta el punto del eje donde se alinea.
   */
  salida(
    evitar?: readonly EnElPlano[],
    /**
     * Por dónde va a rodar quien juega: la doble raya del que sale no puede
     * caer encima. Ver `PASA_A_TU_LADO`.
     */
    porDondeVas?: readonly EnElPlano[],
    /**
     * La pista que tiene que quedarle por delante para despegar, m. Sin ella,
     * cualquiera de las bocas de `BOCAS_DE_SALIDA`. Ver `PISTA_POR_DELANTE`.
     */
    pistaQueNecesita?: number,
  ): {
    readonly camino: readonly EnElPlano[];
    readonly espera: number;
    readonly eje: number;
  } | null;
  /**
   * **Si entre la plataforma y la pista no hay más que una calle**: todo lo
   * que va de un puesto a la pista pasa por la doble raya del que sale, y no
   * hay por dónde rodearle.
   *
   * Es Encarnación, La Gomera y Pedro Juan Caballero, y no se pone a mano: se
   * mide con el mismo buscador que traza la raya verde. Se pone al que sale
   * esperando en su doble raya y se busca ruta de cada salida de pista a cada
   * puesto rodeándole; si ninguna puede, la calle es una. Ahí la raya verde
   * no puede rodear a nadie, y lo que hace la torre es no mover dos aviones a
   * la vez por ella. Ver `Momento.calleOcupada` en `flight/radio.ts`.
   */
  unaSolaCalle(): boolean;
}

/**
 * Lo que se aparta del eje la doble raya de un punto de espera, m.
 *
 * Cuarenta más media pista, como `FUERA_DE_LA_PISTA` en el plan de tierra: es
 * la distancia de un punto de espera de clave C (OACI, Anexo 14, tabla 3-2,
 * noventa metros para una pista de aproximación de precisión; setenta y cinco
 * para visual), recortada a lo que dibujan nuestras calles cortas.
 */
const DOBLE_RAYA = 40;

/** Cuánto hace falta apartarse del eje para estar fuera de la pista, m. */
const FUERA_DEL_EJE = 8;

/**
 * Lo más que puede girar una salida contra el sentido de la carrera, grados.
 * Igual que en el plan de tierra: una salida se toma hacia donde se va.
 */
const GIRO_DE_SALIDA = 100;

/** Metros de calle que se miran para saber hacia dónde sale. */
const PRIMER_TRAMO = 40;

/** Cada cuánto se mira que el camino vaya por asfalto, m. */
const MUESTRA = 5;

/**
 * Lo que se le perdona al camino fuera del asfalto dibujado, m: los ejes de
 * OpenStreetMap se unen en los cruces con un par de metros de juego.
 */
const HOLGURA_DEL_PAVIMENTO = 6;

/**
 * Lo que cuesta, en metros de pista, cada metro que se rueda **por la pista
 * después de la boca** o hacia atrás: el doble, porque es pista ocupada a paso
 * de calle en vez de a velocidad de carrera.
 */
const VOLVER_CUESTA = 2;

/**
 * **Lo que cuesta una salida que pasa por encima de ti**, m: más que cualquier
 * otra que no lo haga. Aterrizando, el tráfico salía por la calle en la que
 * esperabas tú y se quedaba plantado entre tu doble raya y la pista, sin poder
 * pasar ni dejarte pasar: lo que dice una torre es «siga hasta la próxima».
 * Si no hay otra, por ésa, y espera a que pases. Ver `cedeA` en `trafico.ts`.
 */
const OCUPADA_CUESTA = 1e5;

/** Y lo que cuesta una salida que obliga a torcer más de noventa grados, m. */
const TORCER_CUESTA = 150;

/** De cuántas bocas, desde la cabecera, se prueba a salir. */
const BOCAS_DE_SALIDA = 6;

/**
 * Lo más que puede rodar por la propia pista para llegar a su boca de
 * salida, m: más que eso es que ha entrado por otra.
 */
const RODANDO_HASTA_LA_BOCA = 80;

/**
 * Lo que se aparta el tráfico de quien juega al elegir puesto: ni aparca en el
 * suyo ni sale de uno pegado a él, m. Una envergadura larga de las de la flota
 * y su margen. En su doble raya sí espera, en la fila: ver `salida`.
 */
const APARTE_DE_TI = 80;

/**
 * Lo que se aparta la doble raya del tráfico de la raya verde de quien juega,
 * m: las dos semialas —la del reactor del tráfico y la del JAZ 120— y el
 * margen de ala de la clave C. Menos que eso, al pasar por su lado las alas
 * se tocan; es lo que se vio en Los Rodeos, con la raya verde llevando al
 * avión de quien juega contra uno que esperaba en su doble raya.
 */
const PASA_A_TU_LADO = 17 + 18 + 7.5;

/**
 * **Lo que mide la fila de salida**, m, contado hacia atrás desde tu doble
 * raya: lo que ocupan en la calle el que espera en ella y el de detrás. Ahí el
 * tráfico no se aparta de tu raya: se pone en la cola. Ver `salida`.
 */
const FILA_DE_SALIDA = 120;

/**
 * **La pista que necesita por delante el que sale, en carreras de su tipo.**
 *
 * La carrera de `TIPOS` es la de despegue; lo que se pide para salir por una
 * intersección es esa carrera con su margen, el mismo veinte por ciento y pico
 * que se suma en cualquier cálculo de pista requerida. Con menos, por la boca
 * de la cabecera. Ver `salida`.
 */
export const PISTA_POR_DELANTE = 1.25;

/** Los puestos que no caen encima de quien juega; si no queda ninguno, todos. */
function lejosDe(
  puestos: readonly Punto[],
  evitar: readonly EnElPlano[] | undefined,
): readonly Punto[] {
  if (!evitar?.length) return puestos;
  const libres = puestos.filter((p) =>
    evitar.every((e) => Math.hypot(p[0] - e.x, -p[1] - e.z) > APARTE_DE_TI),
  );
  return libres.length ? libres : puestos;
}

/** Del plano del fichero (la y al norte) al del mundo (la z al sur). */
const alMundo = (p: Punto): EnElPlano => ({ x: p[0], z: -p[1] });

/**
 * El suelo del tráfico de este aeródromo, o `null` si no tiene calles con las
 * que rodar —un campo inventado o uno de hierba sin calles—: entonces el
 * tráfico hace lo de antes.
 *
 * `semiala` es la media envergadura del tráfico: con ella el grafo encarece
 * los callejones por los que no cabe, igual que para quien juega.
 */
export function sueloDelTrafico(
  aero: Aerodrome,
  pista: PistaEnUso,
  ancho: number,
  semiala = 6,
): SueloDelTrafico | null {
  if (!aero.taxiways?.length) return null;
  const grafo = construirGrafo(aero, semiala);
  if (!grafo.nudos.length) return null;

  const mitad = pista.length / 2;
  const [fx, fz] = delante(pista.heading);
  const ejes = (p: EnElPlano) =>
    enEjesDePista(p.x, p.z, pista.x, pista.z, pista.heading);
  /** El umbral de aterrizar, contado desde el centro hacia atrás. */
  const umbral = -mitad + desplazadoDe(pista);
  const enElEje = (along: number): EnElPlano => ({
    x: pista.x + fx * along,
    z: pista.z + fz * along,
  });

  /** Nudos sobre el asfalto de la pista con alguna calle colgando. */
  const bocas: { nudo: number; along: number; calles: Tramo[] }[] = [];
  grafo.nudos.forEach((n, i) => {
    const { along, across } = ejes(alMundo(n));
    if (Math.abs(across) > ancho / 2) return;
    if (Math.abs(along) > mitad + 5) return;
    const calles = (grafo.desde[i] ?? [])
      .map((t) => grafo.tramos[t]!)
      .filter((t) => !t.pista);
    if (calles.length) bocas.push({ nudo: i, along, calles });
  });
  if (!bocas.length) return null;

  const puestos = (aero.parkingPositions ?? []).map((p) => p.xy);

  /** Si todo el camino va por asfalto: calle, pista o plataforma. */
  const porElAsfalto = (puntos: readonly Punto[]): boolean => {
    for (let i = 1; i < puntos.length; i++) {
      const a = puntos[i - 1]!;
      const b = puntos[i]!;
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let s = 0; s <= d; s += MUESTRA) {
        const t = d > 0 ? s / d : 0;
        const q: Punto = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        if (!enElPavimento(aero, q, HOLGURA_DEL_PAVIMENTO)) return false;
      }
    }
    return true;
  };

  /**
   * Una ruta entre un puesto y un punto del grafo, **por asfalto**, de los
   * puestos más cercanos: la más corta que no cruce hierba. El buscador
   * remata en línea recta del último nudo al puesto, y los puestos están en
   * la plataforma, no en las calles: ese remate vale si cae en la plataforma
   * y no vale si cruza el campo.
   */
  const rutaConPuesto = (
    punto: Punto,
    hacia: "puesto" | "punto",
    evitar: readonly EnElPlano[] | undefined,
    ocupados?: OcupadosEnElMundo,
  ): { puntos: Punto[]; ocupada: boolean } | null => {
    const porDondeNo = ocupados?.puntos.length
      ? {
          puntos: ocupados.puntos.map((e): Punto => [e.x, -e.z]),
          radio: ocupados.radio,
        }
      : undefined;
    const cerca = [...lejosDe(puestos, evitar)]
      .sort(
        (a, b) =>
          Math.hypot(a[0] - punto[0], a[1] - punto[1]) -
          Math.hypot(b[0] - punto[0], b[1] - punto[1]),
      )
      .slice(0, 8);
    let mejor: { puntos: Punto[]; largo: number; ocupada: boolean } | null = null;
    /*
     * Hacia los puestos, de una vez: el buscador corre una vez por origen y
     * cada destino es solo su último trozo. Uno por puesto eran ocho búsquedas
     * por boca, y en Gando volver a elegir la salida al tomar tierra costaba
     * noventa milisegundos —cinco fotogramas— con tu raya que rodear.
     */
    const rutas =
      hacia === "puesto"
        ? rodajesDesde(grafo, punto, cerca, 400, porDondeNo)
        : cerca.map((xy) => rodajeEntre(grafo, xy, punto, 400, porDondeNo));
    for (let k = 0; k < cerca.length; k++) {
      const r = rutas[k];
      if (!r) continue;
      const ocupada = !!r.ocupada;
      // La que no pasa por encima de nadie, y de ésas la más corta.
      if (mejor && (ocupada && !mejor.ocupada)) continue;
      if (mejor && ocupada === mejor.ocupada && r.largo >= mejor.largo) continue;
      /*
       * Y si el remate hasta el puesto cruza campo —hay aeródromos con los
       * puestos dibujados lejos de toda calle y fuera de la plataforma
       * dibujada—, se acaba donde acaba el asfalto: en la última calle de la
       * plataforma, que es donde se le ve aparcar de lejos.
       */
      const puntos = recortarAlAsfalto([...r.puntos], hacia, porElAsfalto);
      if (!puntos) continue;
      mejor = { puntos, largo: r.largo, ocupada };
    }
    return mejor ? { puntos: mejor.puntos, ocupada: mejor.ocupada } : null;
  };

  let unaSola: boolean | undefined;
  const suelo: SueloDelTrafico = {
    llegada(desdeElUmbral, evitar, ocupados) {
      /*
       * **La salida que antes deja la pista libre**, no la primera que hay.
       *
       * Se cogía la primera boca por delante de donde ya rueda despacio, y hay
       * bocas que no llevan a ninguna parte útil: en Guaraní la primera sale
       * a una calle que vuelve a la pista, y el avión rodaba setecientos
       * metros más por el asfalto antes de dejarlo —minuto y medio de roja
       * para quien esperaba—. Se mira cuánto le queda de pista a cada una,
       * contando lo que rueda hasta la boca y lo que sigue pisándola después,
       * y gana la que menos. Hacia delante mejor que hacia atrás, que dar la
       * vuelta en la pista es lo último que se hace; pero se hace —en El
       * Hierro la única calle está en medio—.
       */
      const puede = umbral + desdeElUmbral;
      let mejor: { coste: number; boca: number; camino: EnElPlano[]; pista: number } | null =
        null;
      const hastaLa = (along: number): number =>
        along >= puede ? along - puede : (puede - along) * VOLVER_CUESTA;
      /*
       * De la que menos cuesta llegar a la que más: lo que cuesta llegar a una
       * boca es lo menos que puede costar salir por ella, así que en cuanto
       * una sale bien las de detrás ya no se miran. Es lo que deja volver a
       * elegir al tomar tierra sin que se note: ver `rehacerLaLlegada` en
       * `trafico.ts`.
       */
      const enOrden = [...bocas].sort((a, b) => hastaLa(a.along) - hastaLa(b.along));
      for (const boca of enOrden) {
        const hastaLaBoca = hastaLa(boca.along);
        if (mejor && hastaLaBoca >= mejor.coste) continue;
        const desde = grafo.nudos[boca.nudo]!;
        const hecha = rutaConPuesto(desde, "puesto", evitar, ocupados);
        if (!hecha) continue;
        const ruta = hecha.puntos;
        const camino = [enElEje(boca.along), ...ruta.map(alMundo)];
        const enLaPista = hastaSalir(camino, ejes, ancho);
        // Y la deja de verdad: un camino que se queda en la pista, o que
        // vuelve a ella para acabar encima, no vale.
        const fin = ejes(camino[camino.length - 1]!);
        const acabaFuera =
          Math.abs(fin.across) > ancho / 2 + FUERA_DEL_EJE ||
          Math.abs(fin.along) > mitad;
        if (enLaPista >= largo(camino) - 1 || !acabaFuera) continue;
        /*
         * Ni la cruza después de haberla dejado: ya ha dicho «pista libre», y
         * volver a pisarla camino del puesto es meterse en una pista que la
         * torre le está dando a otro —quizá a ti—.
         */
        if (pisaLaPista(camino, enLaPista + 1, Infinity, ejes, ancho, mitad))
          continue;
        const haciaDelante = boca.calles.some((t) =>
          saleHacia(t, grafo.nudos[boca.nudo]!, pista.heading),
        );
        const coste =
          hastaLaBoca +
          enLaPista * VOLVER_CUESTA +
          (haciaDelante ? 0 : TORCER_CUESTA) +
          (hecha.ocupada ? OCUPADA_CUESTA : 0);
        /*
         * **Y la pista queda libre al pasar la doble raya de la salida**, no
         * al asomar las ruedas fuera del asfalto. Se daba por libre a ocho
         * metros del borde, y a esa distancia un turbohélice de veintisiete
         * metros de envergadura todavía tiene media ala sobre la pista: en La
         * Gomera se oía «pista libre» con el otro rodando a mil noventa metros
         * del umbral, a veintitantos del eje. «Pista libre» es haber pasado el
         * punto de espera de la calle, el mismo que respeta quien va a entrar;
         * si el camino no llega tan lejos, cuando acaba. Ver `DOBLE_RAYA`.
         */
        const libre = Math.max(
          enLaPista,
          hastaSalir(camino, ejes, ancho, DOBLE_RAYA),
        );
        if (!mejor || coste < mejor.coste)
          mejor = { coste, boca: boca.along - umbral, camino, pista: libre };
      }
      return mejor
        ? { boca: mejor.boca, camino: mejor.camino, pista: mejor.pista }
        : null;
    },

    salida(evitar, porDondeVas, pistaQueNecesita = 0) {
      /*
       * Por la boca más cerca de la cabecera de salida —la que deja más pista
       * por delante—: del puesto a la boca por las calles, y en el camino, la
       * doble raya donde la calle ya está a la distancia de un punto de
       * espera. Es la cuenta que usa el plan de tierra para quien juega.
       *
       * **Y en tu misma doble raya, si es la suya: detrás de ti, en la cola.**
       * Aquí se apartaba de tu doble raya a la boca siguiente, y la siguiente
       * queda más lejos de la cabecera: en Guaraní, con la paralela, el
       * reactor salía del puesto hacia la otra punta de la pista mientras tú
       * ibas a la cabecera. «Si los aviones deben ir hacia la cabecera X, ¿por
       * qué este rueda a la cabecera contraria?» Un aeropuerto de verdad no
       * reparte a los que salen por puntos de espera distintos para que no se
       * junten: los pone en fila en el mismo, y el que llega detrás espera.
       * Ahora el tráfico ve a quien juega —ver `cedeA` en `trafico.ts`— y la
       * fila se hace sola, también contigo delante.
       *
       * **Y nunca con menos pista de la que necesita su tipo.** Una boca a
       * mitad de pista es una salida por intersección, y un reactor no sale
       * con ochocientos metros por delante. Ver `PISTA_POR_DELANTE`.
       *
       * Lo único que se sigue evitando es esperar **encima de la calle por la
       * que vas a pasar** camino de otra doble raya: eso no es una fila, es un
       * tapón. El final de tu raya —tu doble raya y lo que hay justo antes—
       * es la fila, y ahí sí se espera.
       */
      void evitar;
      const deCabecera = [...bocas].sort((a, b) => a.along - b.along);
      const fin = porDondeVas?.[porDondeVas.length - 1];
      const deTuCalle = (porDondeVas ?? []).filter(
        (e) => !fin || dist(e, fin) > PASA_A_TU_LADO + FILA_DE_SALIDA,
      );
      /*
       * Por orden de pista por delante: la primera que se puede rodar y le da
       * su pista. Si ninguna se la da —la calle más cerca de la cabecera no
       * se puede rodar, o el campo es más corto que eso, como El Hierro para
       * el turbohélice—, la que más deja de las que se pueden rodar, que es
       * lo que había: el de verdad remontaría la pista, y eso el tráfico no lo
       * sabe hacer. Nunca, por no tener la ideal, una que deja menos.
       */
      let deReserva: ReturnType<SueloDelTrafico["salida"]> = null;
      let sinSuPista: ReturnType<SueloDelTrafico["salida"]> = null;
      for (const boca of deCabecera.slice(0, BOCAS_DE_SALIDA)) {
        const daSuPista = mitad - boca.along >= pistaQueNecesita;
        if (!daSuPista && sinSuPista) continue;
        const nudo = grafo.nudos[boca.nudo]!;
        const ruta = rutaConPuesto(nudo, "punto", evitar)?.puntos;
        if (!ruta) continue;
        const hecha = cortarEnLaRaya(ruta.map(alMundo), ejes, ancho, mitad);
        if (!hecha) continue;
        // Y hasta la raya no pisa la pista: sin permiso no se entra.
        if (pisaLaPista(hecha.hastaLaRaya, 0, Infinity, ejes, ancho, mitad))
          continue;
        const entrada = enElEje(boca.along);
        // Y ya en el eje, unos metros hacia donde se despega: alineado.
        const alineado = enElEje(boca.along + 30);
        // De la raya a la pista, por lo que queda de calle, no en diagonal.
        const hastaElEje = [...hecha.resto, entrada];
        const camino = [...hecha.hastaLaRaya, ...hastaElEje.slice(1), alineado];
        const espera = largo(hecha.hastaLaRaya);
        const salida = {
          camino,
          espera,
          eje: espera + largo(hastaElEje) + 30,
        };
        const raya = hecha.hastaLaRaya[hecha.hastaLaRaya.length - 1]!;
        const encimaDeTuCalle = deTuCalle.some((e) => dist(raya, e) <= PASA_A_TU_LADO);
        if (!daSuPista) {
          if (!encimaDeTuCalle) sinSuPista = salida;
          deReserva ??= salida;
          continue;
        }
        if (!encimaDeTuCalle) return salida;
        deReserva ??= salida;
      }
      return sinSuPista ?? deReserva;
    },

    unaSolaCalle() {
      if (unaSola !== undefined) return unaSola;
      unaSola = false;
      const sale = suelo.salida();
      if (!sale) return unaSola;
      const raya = aLosMetros(sale.camino, sale.espera);
      const parado: Punto = [raya.x, -raya.z];
      const ocupados = { puntos: [parado], radio: PASA_A_TU_LADO };
      let alguna = false;
      for (const boca of bocas)
        for (const xy of puestos) {
          // Un puesto al lado de la doble raya no dice nada de la calle.
          if (Math.hypot(xy[0] - parado[0], xy[1] - parado[1]) < PASA_A_TU_LADO)
            continue;
          const ruta = rodajeEntre(grafo, grafo.nudos[boca.nudo]!, xy, 400, ocupados);
          if (!ruta) continue;
          alguna = true;
          if (!ruta.ocupada) return unaSola;
        }
      unaSola = alguna;
      return unaSola;
    },
  };
  return suelo;
}

/** El punto de un camino a tantos metros de su principio. */
function aLosMetros(camino: readonly EnElPlano[], metros: number): EnElPlano {
  let recorrido = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const d = dist(a, b);
    if (recorrido + d >= metros) {
      const t = d > 0 ? (metros - recorrido) / d : 0;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    }
    recorrido += d;
  }
  return camino[camino.length - 1]!;
}

/**
 * Quita del lado del puesto los puntos que cruzan campo, hasta dos: el remate
 * recto al puesto y, como mucho, el del nudo de antes. Si ni así va por
 * asfalto, `null`.
 */
function recortarAlAsfalto(
  puntos: Punto[],
  hacia: "puesto" | "punto",
  porElAsfalto: (p: readonly Punto[]) => boolean,
): Punto[] | null {
  for (let quitados = 0; quitados <= 2 && puntos.length >= 2; quitados++) {
    if (porElAsfalto(puntos)) return puntos;
    if (hacia === "puesto") puntos.pop();
    else puntos.shift();
  }
  return null;
}

/**
 * El camino hasta la doble raya: se recorre la ruta desde la pista hacia
 * atrás hasta el primer punto a la distancia de un punto de espera, y ahí se
 * corta. `null` si la ruta llega a la pista por encima de ella —desde otra
 * boca, rodando por el asfalto— y no por su calle.
 */
function cortarEnLaRaya(
  ruta: readonly EnElPlano[],
  ejes: (p: EnElPlano) => { along: number; across: number },
  ancho: number,
  mitad: number,
): { hastaLaRaya: EnElPlano[]; resto: EnElPlano[] } | null {
  const sobreLaPista = (p: EnElPlano): boolean => {
    const e = ejes(p);
    return Math.abs(e.across) < ancho / 2 + 5 && Math.abs(e.along) <= mitad;
  };
  const aparte = ancho / 2 + DOBLE_RAYA;
  let porLaPista = 0;
  for (let i = ruta.length - 1; i > 0; i--) {
    const b = ruta[i]!;
    const a = ruta[i - 1]!;
    const da = Math.abs(ejes(a).across);
    const db = Math.abs(ejes(b).across);
    if (da >= aparte) {
      const t = da > db ? Math.max(0, Math.min(1, (da - aparte) / (da - db))) : 0;
      const raya = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      return {
        hastaLaRaya: [...ruta.slice(0, i), raya],
        resto: [raya, ...ruta.slice(i)],
      };
    }
    // Rodando por la pista desde otra boca no se llega a la raya de ésta.
    if (sobreLaPista(a) && sobreLaPista(b)) porLaPista += dist(a, b);
    if (porLaPista > RODANDO_HASTA_LA_BOCA) return null;
  }
  return null;
}

/** Si una calle sale de ese nudo hacia donde va la carrera, o casi. */
function saleHacia(tramo: Tramo, nudo: Punto, rumbo: number): boolean {
  const pts = tramo.puntos;
  if (pts.length < 2) return false;
  const desdeElPrincipio =
    Math.hypot(pts[0]![0] - nudo[0], pts[0]![1] - nudo[1]) <
    Math.hypot(
      pts[pts.length - 1]![0] - nudo[0],
      pts[pts.length - 1]![1] - nudo[1],
    );
  const orden = desdeElPrincipio ? pts : [...pts].reverse();
  let lejos = orden[orden.length - 1]!;
  for (const q of orden) {
    if (Math.hypot(q[0] - nudo[0], q[1] - nudo[1]) >= PRIMER_TRAMO) {
      lejos = q;
      break;
    }
  }
  const dx = lejos[0] - nudo[0];
  const dy = lejos[1] - nudo[1];
  const l = Math.hypot(dx, dy);
  if (l < 1) return false;
  const h = (rumbo * Math.PI) / 180;
  // Hacia delante en el fichero es (sen h, cos h): la y apunta al norte.
  const coseno = (dx * Math.sin(h) + dy * Math.cos(h)) / l;
  return coseno >= Math.cos((GIRO_DE_SALIDA * Math.PI) / 180);
}

/** Si entre esos metros del camino algún punto cae sobre la pista. */
function pisaLaPista(
  camino: readonly EnElPlano[],
  desde: number,
  hasta: number,
  ejes: (p: EnElPlano) => { along: number; across: number },
  ancho: number,
  mitad: number,
): boolean {
  let recorrido = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const d = dist(a, b);
    for (let s = 0; s <= d; s += MUESTRA) {
      const m = recorrido + s;
      if (m < desde || m > hasta) continue;
      const t = d > 0 ? s / d : 0;
      const e = ejes({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      if (Math.abs(e.across) < ancho / 2 && Math.abs(e.along) < mitad) return true;
    }
    recorrido += d;
  }
  return false;
}

/** Metros de camino hasta el primer punto que queda fuera de la pista. */
function hastaSalir(
  camino: readonly EnElPlano[],
  ejes: (p: EnElPlano) => { along: number; across: number },
  ancho: number,
  /** Cuánto más allá del borde, m: fuera del asfalto, o pasada la doble raya. */
  pasado = FUERA_DEL_EJE,
): number {
  let recorrido = 0;
  for (let i = 1; i < camino.length; i++) {
    const a = camino[i - 1]!;
    const b = camino[i]!;
    const d = dist(a, b);
    const da = Math.abs(ejes(a).across);
    const db = Math.abs(ejes(b).across);
    const limite = ancho / 2 + pasado;
    if (db >= limite) {
      const t = db > da ? Math.max(0, Math.min(1, (limite - da) / (db - da))) : 1;
      return recorrido + d * t;
    }
    recorrido += d;
  }
  return recorrido;
}

function dist(a: EnElPlano, b: EnElPlano): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function largo(camino: readonly EnElPlano[]): number {
  let total = 0;
  for (let i = 1; i < camino.length; i++)
    total += dist(camino[i - 1]!, camino[i]!);
  return total;
}
