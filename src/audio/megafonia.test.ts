/**
 * Que la comandante hable cuando toca y se calle cuando no.
 *
 * Lo que se comprueba aquí no es el texto: es **el momento**. Una megafonía que
 * saluda con el avión en el aire, o que repite la bienvenida cada vez que se
 * pasa por «rodando», no suena a vuelo: suena a máquina.
 */
import { describe, expect, it } from "vitest";
import { Megafonia, conPasaje, conTripulacion, seLePasoElMomento } from "./megafonia";
import type { Fase } from "../flight/vuelo";

/*
 * Por defecto, **arriba y asentado**: así las pruebas de fase siguen midiendo
 * la fase y no se les cuela la condición del cinturón. Las que van de eso la
 * ponen a mano.
 */
const CON_PASAJE = {
  conPasaje: true,
  instructorHablando: false,
  sobreElCampo: 900,
  vertical: 0,
  desdeLoMasAlto: 0,
};

/** Corre unos segundos en una fase y devuelve lo que se dijo. */
function correr(m: Megafonia, fase: Fase, segundos: number, extra = {}) {
  const dichos: string[] = [];
  for (let t = 0; t < segundos; t += 0.5) {
    const dice = m.paso(0.5, { fase, ...CON_PASAJE, ...extra });
    if (dice) dichos.push(dice);
  }
  return dichos;
}

describe("la megafonía de cabina", () => {
  it("saluda al pasaje mientras se rueda", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 12)).toEqual(["comandante.bienvenida"]);
  });

  it("pero no en el primer segundo, que ahí habla la instructora", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 3)).toEqual([]);
  });

  it("y no repite lo ya dicho aunque se vuelva a la misma fase", () => {
    const m = new Megafonia();
    correr(m, "rodando", 12);
    correr(m, "esperando", 6);
    expect(correr(m, "rodando", 12)).toEqual([]);
  });

  it("no habla por encima de la instructora", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 12, { instructorHablando: true })).toEqual([]);
  });

  it("y si el momento se pasa, ese anuncio ya no se dice", () => {
    const m = new Megafonia();
    // Media fase entera con la instructora hablando: el momento se va.
    correr(m, "rodando", 40, { instructorHablando: true });
    expect(correr(m, "rodando", 10)).toEqual([]);
  });

  it("dice lo suyo en cada fase del vuelo, y en orden", () => {
    const m = new Megafonia();
    const conAuxiliares = { conTripulacion: true };
    const todo = [
      // En el puesto, con las puertas cerradas: los toboganes.
      ...correr(m, "estacionado", 10, conAuxiliares),
      ...correr(m, "rodando", 10, conAuxiliares),
      ...correr(m, "autorizado", 10, conAuxiliares),
      ...correr(m, "alineando", 10, conAuxiliares),
      ...correr(m, "en-vuelo", 10, conAuxiliares),
      ...correr(m, "final", 10, conAuxiliares),
      ...correr(m, "abandonando", 10, conAuxiliares),
    ];
    /*
     * **Y ya no hay «empezamos a bajar» en la final**: el descenso va en su
     * sitio, al empezar a bajar, y aquí el avión no baja nunca. Ver el guion
     * entero más abajo.
     */
    expect(todo).toEqual([
      "comandante.crosscheck",
      "comandante.bienvenida",
      "comandante.despegue",
      "comandante.crucero",
      "comandante.llegada",
    ]);
  });

  it("y los toboganes se arman parados, nunca rodando ni autorizado", () => {
    /*
     * «Armar rampas y verificación cruzada» arma los toboganes de evacuación
     * y se canta con las puertas cerradas, antes de empujar. Dicho con el
     * avión ya rodando y autorizado no es tarde: es otro procedimiento.
     *
     * «La comandante le dice a la tripulación que armen rampas y verificación
     * cruzada cuando ya salí y estoy en rodadura con permiso para salir, eso
     * se dice antes de arrancar motores.»
     */
    const m = new Megafonia();
    const rodando = [
      ...correr(m, "rodando", 30),
      ...correr(m, "autorizado", 30),
      ...correr(m, "alineando", 30),
    ];
    expect(rodando).not.toContain("comandante.crosscheck");
  });

  it("y en un vuelo sin bajar habla seis veces y ni una más", () => {
    // Con auxiliares: toboganes, bienvenida, despegue, crucero, servicio y
    // llegada. Sin descenso, porque aquí el avión no baja nunca.
    const m = new Megafonia();
    let veces = 0;
    for (const fase of [
      "estacionado",
      "arrancando",
      "rodando",
      "esperando",
      "autorizado",
      "alineando",
      "despegando",
      "comprometido",
      "en-vuelo",
      "final",
      "aterrizado",
      "abandonando",
      "a-plataforma",
      "en-puesto",
    ] as Fase[]) {
      veces += correr(m, fase, 30, { conTripulacion: true }).length;
    }
    expect(veces).toBe(6);
  });

  it("un vuelo nuevo la vuelve a dejar hablar", () => {
    const m = new Megafonia();
    correr(m, "rodando", 10);
    m.reiniciar();
    expect(correr(m, "rodando", 10)).toEqual(["comandante.bienvenida"]);
  });
});

describe("quién lleva megafonía", () => {
  it("y quién lleva además tripulación de cabina: de veinte plazas arriba", () => {
    // El JAZ 60, diecinueve plazas y cinco toneladas y media: sin auxiliar.
    expect(conTripulacion(5600)).toBe(false);
    // El JAZ 90 y el JAZ 120, sí.
    expect(conTripulacion(30000)).toBe(true);
    expect(conTripulacion(255826)).toBe(true);
  });

  it("los que llevan pasaje", () => {
    // Turbohélice, reactor regional y de fuselaje ancho.
    expect(conPasaje(7200)).toBe(true);
    expect(conPasaje(35000)).toBe(true);
    expect(conPasaje(255826)).toBe(true);
  });

  it("y no una avioneta, que no tiene a quién hablarle", () => {
    expect(conPasaje(1100)).toBe(false);
    expect(conPasaje(1500)).toBe(false);
    expect(conPasaje(2100)).toBe(false);
  });
});

describe("y el del cinturón pide altura, no fase", () => {
  /*
   * «¿Cómo dice la comandante que ya estamos arriba y pueden soltarse el
   * cinturón si todavía estoy empezando a levantar el avión en la pista?»
   *
   * La fase `en-vuelo` empieza en el instante en que las ruedas dejan el
   * asfalto, así que el anuncio salía a veinte metros con el avión rotando.
   */
  it("no se dice recién despegado, a ras del campo", () => {
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 40, { sobreElCampo: 20, vertical: 6 }),
    ).toEqual([]);
  });

  it("ni subiendo fuerte, por muy alto que se vaya", () => {
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 40, { sobreElCampo: 1200, vertical: 7 }),
    ).toEqual([]);
  });

  it("ni volando el circuito, que es donde nadie se suelta el cinturón", () => {
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 60, { sobreElCampo: 250, vertical: 0 }),
    ).toEqual([]);
  });

  it("y sí arriba y asentado", () => {
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 12, { sobreElCampo: 900, vertical: 0 }),
    ).toEqual(["comandante.crucero"]);
  });

  it("y la ventana se cuenta desde que se cumplen, no desde la fase", () => {
    /*
     * El anuncio pide altura y calma, y eso llega cuando llega. Medido desde
     * el cambio de fase, los veinticinco segundos de ventana se agotaban
     * durante la subida y no salía nunca — que es el otro modo de fallar,
     * más silencioso y por eso peor.
     */
    const m = new Megafonia();
    expect(
      correr(m, "en-vuelo", 90, { sobreElCampo: 80, vertical: 6 }),
    ).toEqual([]);
    expect(
      correr(m, "en-vuelo", 12, { sobreElCampo: 900, vertical: 0 }),
    ).toEqual(["comandante.crucero"]);
  });
});

describe("y los anuncios no se pierden porque una lección salte una fase", () => {
  /*
   * **La queja, y era buena:** «hace tiempo que no oigo a la comandante, ¿ya
   * dejó la compañía y se fue a Egyptair?».
   *
   * «Dar una vuelta» arranca en la pista —ver `lecciones.ts`—, así que las
   * fases `rodando`, `autorizado` y `alineando` no ocurren nunca. Con una sola
   * fase por anuncio, eso se llevaba por delante tres de los seis.
   */
  const momento = (fase: string, extra = {}) => ({
    fase: fase as never,
    conPasaje: true,
    instructorHablando: false,
    sobreElCampo: 1000,
    vertical: 0,
    desdeLoMasAlto: 0,
    ...extra,
  });

  /** Deja correr `segundos` en una fase y devuelve lo que se dijo. */
  function correr(m: Megafonia, fase: string, segundos: number): string[] {
    const dichos: string[] = [];
    for (let t = 0; t < segundos; t += 1 / 30) {
      const a = m.paso(1 / 30, momento(fase));
      if (a) dichos.push(a);
    }
    return dichos;
  }

  it("empezando en la pista, la comandante saluda igual", () => {
    const m = new Megafonia();
    // Nada de rodar, nada de autorización: alineado y a volar.
    const dichos = correr(m, "alineando", 20);
    expect(dichos).toContain("comandante.bienvenida");
  });

  it("y empezando por el puesto también, que no se rompe lo que ya iba", () => {
    const m = new Megafonia();
    expect(correr(m, "rodando", 20)).toContain("comandante.bienvenida");
  });

  it("y el de crucero no se pierde por subir a ratos", () => {
    /*
     * El otro fallo, y es de reloj: la ventana se contaba con el reloj de la
     * fase, así que se agotaba **mientras las condiciones no se cumplían**. Un
     * avión que nivela un momento y vuelve a subir la gastaba entera sin haber
     * podido decir nada.
     */
    const m = new Megafonia();
    // Un minuto subiendo de verdad: no toca decirlo y no debe gastarse nada.
    for (let t = 0; t < 60; t += 1 / 30)
      m.paso(1 / 30, momento("en-vuelo", { vertical: 6 }));
    // Y ahora se nivela: aquí sí.
    expect(correr(m, "en-vuelo", 20)).toContain("comandante.crucero");
  });

  it("y aun así cada anuncio se dice una sola vez", () => {
    const m = new Megafonia();
    const dichos = [
      ...correr(m, "alineando", 40),
      ...correr(m, "en-vuelo", 40),
      ...correr(m, "final", 40),
    ];
    expect(new Set(dichos).size).toBe(dichos.length);
  });
});

describe("y el anuncio de crucero es del final de la subida", () => {
  /*
   * Contado jugando, bajando de Tenerife Sur a Tenerife Norte: «ahora la
   * comandante dice que ya estamos arriba y que se suelten el cinturón… no es
   * el momento de quitarse el cinturón, es el momento de ponérselo».
   *
   * Y tenía razón. En una ruta entre dos aeropuertos el descenso entero pasa
   * dentro de la misma fase, `en-vuelo`, y la velocidad vertical cruza el cero
   * cada poco: con mirar solo la fase y la vertical, la frase salía bajando.
   */
  const enRuta = (extra = {}) => ({
    fase: "en-vuelo" as Fase,
    conPasaje: true,
    instructorHablando: false,
    sobreElCampo: 3000,
    vertical: 0,
    desdeLoMasAlto: 0,
    ...extra,
  });

  const correrlo = (m: Megafonia, extra: object, segundos: number) => {
    const dichos: string[] = [];
    for (let t = 0; t < segundos; t += 0.5) {
      const d = m.paso(0.5, enRuta(extra));
      if (d) dichos.push(d);
    }
    return dichos;
  };

  it("nivelado arriba y sin haber bajado, se dice", () => {
    expect(correrlo(new Megafonia(), {}, 20)).toContain("comandante.crucero");
  });

  it("**pero bajando hacia el destino, no**", () => {
    // Quinientos metros por debajo de lo más alto: eso es un descenso que
    // alguien decidió, no la oscilación de un crucero.
    expect(
      correrlo(new Megafonia(), { desdeLoMasAlto: 500 }, 40),
    ).not.toContain("comandante.crucero");
  });

  it("y la oscilación normal del crucero no lo impide", () => {
    // Nadie mantiene el nivel al metro. Cien metros siguen siendo crucero.
    expect(correrlo(new Megafonia(), { desdeLoMasAlto: 100 }, 20)).toContain(
      "comandante.crucero",
    );
  });
});

describe("el guion de un vuelo de línea, entero y en orden", () => {
  /*
   * Pedido porque «forma parte de la vida de volar»: el mismo guion en todos
   * los vuelos de pasaje del mundo. Lo que se comprueba es **el orden** y que
   * cada cosa salga en su momento y no en otro — el servicio con el cartel
   * apagado, la bajada al bajar, la aproximación antes de la final.
   */
  type Tramo = {
    fase: Fase;
    segundos: number;
    vertical?: number;
    extra?: object;
  };

  /**
   * Vuela un perfil: en tierra, sube a tres mil metros, cruza, baja y aterriza.
   * La altura y lo bajado desde lo más alto se llevan como las lleva el juego.
   */
  function volar(
    m: Megafonia,
    tramos: readonly Tramo[],
    comun: object = {},
    alDecir?: (a: string, alto: number) => void,
  ) {
    const dichos: string[] = [];
    let alto = 0;
    let techo = 0;
    const dt = 0.25;
    for (const tr of tramos) {
      for (let t = 0; t < tr.segundos; t += dt) {
        alto = Math.max(0, alto + (tr.vertical ?? 0) * dt);
        techo = Math.max(techo, alto);
        const dice = m.paso(dt, {
          fase: tr.fase,
          conPasaje: true,
          conTripulacion: true,
          instructorHablando: false,
          sobreElCampo: alto,
          vertical: tr.vertical ?? 0,
          desdeLoMasAlto: techo - alto,
          ...comun,
          ...(tr.extra ?? {}),
        });
        if (dice) {
          dichos.push(dice);
          alDecir?.(dice, alto);
        }
      }
    }
    return dichos;
  }

  const DE_LINEA: readonly Tramo[] = [
    { fase: "estacionado", segundos: 15 },
    { fase: "rodando", segundos: 30 },
    { fase: "autorizado", segundos: 10 },
    { fase: "alineando", segundos: 10 },
    { fase: "despegando", segundos: 20 },
    // Subida a tres mil metros, a diez por segundo.
    { fase: "en-vuelo", segundos: 300, vertical: 10 },
    // Crucero: cuatro minutos nivelados.
    { fase: "en-vuelo", segundos: 240 },
    // Bajada hasta la final, a ocho por segundo.
    { fase: "en-vuelo", segundos: 337, vertical: -8 },
    { fase: "final", segundos: 60, vertical: -4 },
    { fase: "aterrizado", segundos: 20 },
    { fase: "abandonando", segundos: 30 },
  ];

  it("dice los nueve anuncios, cada uno una vez y en el orden de la realidad", () => {
    expect(volar(new Megafonia(), DE_LINEA)).toEqual([
      "comandante.crosscheck",
      "comandante.bienvenida",
      "comandante.despegue",
      "comandante.crucero",
      "tripulacion.servicio",
      "comandante.descenso",
      "tripulacion.cinturones",
      "comandante.aproximacion",
      "comandante.llegada",
    ]);
  });

  it("y lo de la bajada, bajando y por encima de la final", () => {
    const donde = new Map<string, number>();
    volar(new Megafonia(), DE_LINEA, {}, (a, alto) => donde.set(a, alto));
    // El descenso, ya bajando de verdad desde el crucero: ni arriba del todo
    // ni en la aproximación.
    expect(donde.get("comandante.descenso")).toBeLessThan(3000 - 150);
    expect(donde.get("comandante.descenso")).toBeGreaterThan(2000);
    // Y la aproximación por debajo de mil metros y por encima de la final.
    expect(donde.get("comandante.aproximacion")).toBeLessThan(1000);
    expect(donde.get("comandante.aproximacion")).toBeGreaterThan(300);
  });

  it("sin auxiliares, la comandante habla y nadie pasa con el agua", () => {
    // El JAZ 60: pasaje sí, tripulación de cabina no.
    expect(volar(new Megafonia(), DE_LINEA, { conTripulacion: false })).toEqual(
      [
        "comandante.bienvenida",
        "comandante.crucero",
        "comandante.descenso",
        "comandante.llegada",
      ],
    );
  });

  it("con el cartel puesto por turbulencia no se anuncia el servicio", () => {
    const dichos = volar(new Megafonia(), DE_LINEA, { cartelPuesto: true });
    expect(dichos).not.toContain("tripulacion.servicio");
    // Y el resto del guion sigue igual.
    expect(dichos).toContain("comandante.descenso");
  });

  it("no habla nunca por encima de la torre, el otro avión o la máquina", () => {
    const dichos = volar(new Megafonia(), DE_LINEA, { otrosHablando: true });
    expect(dichos).toEqual([]);
  });

  it("y un anuncio no empieza encima de otro de la megafonía", () => {
    // La comandante habla sin parar durante el crucero: el servicio no entra.
    const tramos = DE_LINEA.map((tr, i) =>
      i === 6 ? { ...tr, extra: { megafoniaHablando: true } } : tr,
    );
    expect(volar(new Megafonia(), tramos)).not.toContain(
      "tripulacion.servicio",
    );
  });

  it("el vaivén del crucero no es un descenso", () => {
    const m = new Megafonia();
    const dichos: string[] = [];
    const arriba = {
      fase: "en-vuelo" as Fase,
      conPasaje: true,
      conTripulacion: true,
      instructorHablando: false,
      sobreElCampo: 3000,
      vertical: 0,
      desdeLoMasAlto: 0,
    };
    for (let t = 0; t < 30; t += 0.25) {
      const d = m.paso(0.25, arriba);
      if (d) dichos.push(d);
    }
    // Diez minutos subiendo y bajando cien metros, a dos por segundo.
    for (let t = 0; t < 600; t += 0.25) {
      const sentido = Math.floor(t / 50) % 2 === 0 ? -1 : 1;
      const d = m.paso(0.25, {
        ...arriba,
        vertical: 2 * sentido,
        desdeLoMasAlto: 100,
      });
      if (d) dichos.push(d);
    }
    expect(dichos).not.toContain("comandante.descenso");
    expect(m.bajandoAlDestino).toBe(false);
  });

  it("y con el punto de descenso del plan, se anuncia a su hora aunque aún no se baje", () => {
    /*
     * El T/D lo calcula el plan de vuelo —ver `empezarElDescenso`—, y una
     * comandante de verdad hace el anuncio ahí, no cuando ya lleva un minuto
     * bajando.
     */
    const m = new Megafonia();
    const nivelado = {
      fase: "en-vuelo" as Fase,
      conPasaje: true,
      conTripulacion: true,
      instructorHablando: false,
      sobreElCampo: 3000,
      vertical: 0,
      desdeLoMasAlto: 0,
    };
    for (let t = 0; t < 60; t += 0.25) m.paso(0.25, nivelado);
    m.empezarElDescenso();
    const dichos: string[] = [];
    for (let t = 0; t < 30; t += 0.25) {
      const d = m.paso(0.25, nivelado);
      if (d) dichos.push(d);
    }
    expect(dichos[0]).toBe("comandante.descenso");
    expect(dichos).toContain("tripulacion.cinturones");
  });

  it("si se entra en final antes de tiempo, la aproximación ya no se dice", () => {
    // Bajada en picado desde el crucero directa a la final: no da tiempo, y
    // en la final la palabra es de la instructora.
    const tramos: Tramo[] = [
      ...DE_LINEA.slice(0, 7),
      { fase: "en-vuelo", segundos: 30, vertical: -30 },
      { fase: "final", segundos: 120, vertical: -8 },
    ];
    const dichos = volar(new Megafonia(), tramos);
    expect(dichos).toContain("comandante.descenso");
    expect(dichos).not.toContain("comandante.aproximacion");
  });
});

/*
 * **Lo que esperaba su voz y se le pasó el momento, no se dice.** El
 * crosscheck pedido en el puesto puede seguir esperando su grabación cuando
 * el avión ya rueda: «armar toboganes» rodando es justo lo que no se dice.
 */
describe("a lo que se le pasó el momento", () => {
  it("el crosscheck, en el puesto sí y rodando no", () => {
    expect(seLePasoElMomento("comandante.crosscheck", "estacionado")).toBe(false);
    expect(seLePasoElMomento("comandante.crosscheck", "arrancando")).toBe(false);
    expect(seLePasoElMomento("comandante.crosscheck", "rodando")).toBe(true);
    expect(seLePasoElMomento("comandante.crosscheck~2", "rodando")).toBe(true);
  });

  it("la bienvenida, con su plan y su sitio, hasta alinearse", () => {
    expect(seLePasoElMomento("comandante.bienvenidaConPlan@x", "rodando")).toBe(false);
    expect(seLePasoElMomento("comandante.bienvenidaConPlan@x", "en-vuelo")).toBe(true);
  });

  it("y lo del aire no lo retira esto: lo guardan sus condiciones", () => {
    expect(seLePasoElMomento("comandante.descenso@x", "final")).toBe(false);
    expect(seLePasoElMomento("tripulacion.servicio", "en-vuelo")).toBe(false);
    expect(seLePasoElMomento(undefined, "rodando")).toBe(false);
  });
});
