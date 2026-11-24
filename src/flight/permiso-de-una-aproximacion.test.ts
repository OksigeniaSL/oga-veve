/**
 * **El permiso de aterrizar es de una aproximación** (H73, enmienda del ADR
 * 0029): si se deja —por la fase, por la torre o por donde sea— se retira, y
 * la siguiente lleva el suyo.
 *
 * La torre te ve en final por dos caminos, la fase del plan y su propia final,
 * y el permiso solo lo retiraba salir de la segunda, por tres de sus cuatro
 * lados y solo si ya se había oído. La H71c cerró el caso que se vio —la verde
 * fija subiendo, recién despegado— y dejó escrito que el camino seguía abierto.
 *
 * Aquí se vuela cada caso con la máquina de fases de verdad, la final de la
 * torre de verdad y el permiso como lo lleva el juego —pedido al entrar en la
 * final que ve la torre, cinco segundos de voz, retirado por la regla—, con
 * **la regla de antes** y con **la de ahora**. Los que la de antes dejaba
 * vivos están en rojo con ella, y eso también se comprueba; los que no tienen
 * que cambiar —el bache, quien se pasa del eje al coger la final, la recogida
 * larga, la cabecera desplazada— salen igual con las dos.
 */
import { describe, expect, it } from "vitest";
import { AproximacionDelPermiso, type PorQueSeDejo } from "./aproximacion-del-permiso";
import { LamparaSinRadio, type LuzSinRadio } from "./fallo-de-radio";
import { FinalDeLaTorre } from "./final-de-la-torre";
import { LaOtraCabecera } from "./la-otra-cabecera";
import { faseQueVeLaTorre, NO_CALLA_NADA } from "./lo-que-calla-el-ejercicio";
import { MILLA } from "./ruta";
import { Vuelo, type Fase, type Situacion } from "./vuelo";
import { alUmbralEnLaAproximacion, ejesDeLaAproximacion } from "../world/runway-guide";

const PASO = 0.05;
/** Lo que tarda en decirse tu permiso, s. */
const VOZ = 5;

/**
 * La pista, con el eje a lo largo de las X: el rumbo 90 de la convención
 * (`delante` en `world/rumbo.ts`), así que `x` es a lo largo y `z` a la
 * derecha. La 03L de Gran Canaria mide 3.104 m entre umbrales.
 */
interface Pista {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly length: number;
  readonly desplazado?: number;
}
const GANDO: Pista = { x: 0, z: 0, heading: 90, length: 3104 };

/** El avión, en los ejes de la pista. */
interface Avion {
  x: number;
  eje: number;
  h: number;
  vs: number;
  gs: number;
  /** Grados respecto al eje. */
  rumbo: number;
  gas: number;
  orden: boolean;
  enElSuelo: boolean;
}

function situacion(a: Avion, pista: Pista): Situacion {
  const alLargo = a.x - pista.x;
  const media = pista.length / 2;
  const desalineado = ((a.rumbo + 540) % 360) - 180;
  return {
    estado: {
      airspeed: a.gs,
      groundSpeed: a.gs,
      verticalSpeed: a.vs,
      onGround: a.enElSuelo,
    } as Situacion["estado"],
    alaRuta: 0,
    restante: 5000,
    alEjeDePista: Math.abs(a.eje),
    backTaxi: false,
    alLargoDePista: alLargo,
    pistaRestante: Math.max(0, media - alLargo),
    pistaQueNecesita: 400,
    enPista: Math.abs(a.eje) < 25 && Math.abs(alLargo) < media + 3,
    sobreElSuelo: a.h,
    motor: true,
    desalineado,
  };
}

type Regla = "antes" | "ahora";

/** Un momento del vuelo, para lo que se comprueba. */
interface Dado {
  readonly t: number;
  readonly alUmbral: number;
  readonly h: number;
}

/**
 * La mesa: el vuelo, la torre y el permiso, en el orden del juego
 * (`avanzarPlan` en `game.ts`).
 */
class Mesa {
  readonly v = new Vuelo();
  readonly final = new FinalDeLaTorre();
  readonly lampara = new LamparaSinRadio();
  readonly aproximacion = new AproximacionDelPermiso();
  permiso: "sonando" | "oido" | null = null;
  readonly dados: Dado[] = [];
  readonly retirados: (PorQueSeDejo | "torre")[] = [];
  /** Si con la radio callada: el permiso no suena, se ve en el acto. */
  sinRadio = false;
  luz: LuzSinRadio = null;
  t = 0;
  fase: Fase = "estacionado";
  torre = "";
  /** Por dónde le salió la final a la torre al darse cada permiso. */
  readonly porDonde: ("el plan" | "su final")[] = [];
  private enLaFinal = false;
  private enLaFrustrada = false;
  private pedido = false;
  private suenaHasta = 0;
  private cualPista = "a";

  constructor(
    readonly regla: Regla,
    public pista: Pista = GANDO,
    readonly a: Avion = {
      x: -9000,
      eje: 3000,
      h: 400,
      vs: 0,
      gs: 40,
      rumbo: 90,
      gas: 0.4,
      orden: false,
      enElSuelo: false,
    },
  ) {
    this.v.reiniciar();
    // Un rato por encima del circuito, que es lo que pide haber volado.
    this.vuela(20);
  }

  get alUmbral(): number {
    return ejesDeLaAproximacion(this.pista, this.a.x, this.a.eje).alUmbral;
  }

  /** Vuela unos segundos, o hasta que se cumpla algo. */
  vuela(
    segundos: number,
    como: { giro?: number; vs?: number; gs?: number; gas?: number; orden?: boolean } = {},
    hasta: (m: Mesa) => boolean = () => false,
  ): this {
    const { a } = this;
    if (como.vs !== undefined) a.vs = como.vs;
    if (como.gs !== undefined) a.gs = como.gs;
    if (como.gas !== undefined) a.gas = como.gas;
    if (como.orden !== undefined) a.orden = como.orden;
    for (let s = 0; s < segundos && !hasta(this); s += PASO) {
      a.rumbo += (como.giro ?? 0) * PASO;
      const r = (a.rumbo * Math.PI) / 180;
      a.x += Math.cos(r) * a.gs * PASO;
      a.eje += Math.sin(r) * a.gs * PASO;
      a.h = a.enElSuelo ? 0 : Math.max(0, a.h + a.vs * PASO);
      this.paso();
    }
    return this;
  }

  /** Lo pone en otro sitio, como si hubiera volado hasta allí. */
  en(donde: Partial<Avion>): this {
    Object.assign(this.a, donde);
    return this;
  }

  /** Otra pista, con su cabecera: otro campo, o el viento que cambia. */
  cambiarDePista(pista: Pista, cual: string): void {
    this.pista = pista;
    if (this.regla === "ahora" && cual !== this.cualPista) {
      // Como `mirarSiCambiaLaPista`.
      this.final.reiniciar();
      this.enLaFinal = false;
      this.torre = "";
    }
    this.cualPista = cual;
  }

  private loQueSeVe() {
    const { a } = this;
    return {
      enElAire: !a.enElSuelo,
      pista: this.cualPista,
      ...ejesDeLaAproximacion(this.pista, a.x, a.eje),
      enLaFinalDelPlan: false,
      torcido: ((a.rumbo + 540) % 360) - 180,
      sobreLaPista: a.h,
      vertical: a.vs,
      gas: a.gas,
      ordenDeIrse: a.orden,
    };
  }

  private paso(): void {
    this.t += PASO;
    const { a } = this;
    // La pista va al rumbo 90: en esos ejes, `x` a lo largo y `eje` a la derecha.
    this.v.gas = a.gas;
    this.v.ordenDeIrse = a.orden;
    this.fase = this.v.paso(situacion(a, this.pista), PASO).fase;
    const torreAntes = this.torre;
    const estaba = this.enLaFinal;
    this.enLaFinal = this.final.paso({
      enElAire: !a.enElSuelo,
      faseDelPlan: this.fase,
      enLaFinalDelPlan: false,
      alUmbral: alUmbralEnLaAproximacion(this.pista, a.x, a.eje),
      torcido: ((a.rumbo + 540) % 360) - 180,
      sobreLaPista: a.h,
      vertical: a.vs,
      gas: a.gas,
      ordenDeIrse: a.orden,
      recienDespegado:
        this.regla === "ahora" &&
        (this.v.acabaDeDespegar || (this.fase !== "en-vuelo" && this.fase !== "final")),
    });
    // ── La regla ──
    const salida = this.final.ultimaSalida;
    const porLaTorre = estaba && !this.enLaFinal && salida !== "fuera";
    if (this.regla === "antes") {
      // Como estaba en `game.ts`: solo la final de la torre, y solo el oído.
      if (porLaTorre && this.permiso === "oido") this.retira("torre");
    } else {
      const seFue = this.v.enLaFrustrada && !this.enLaFrustrada;
      const porque =
        this.aproximacion.paso(this.loQueSeVe()) ??
        (porLaTorre ? "torre" : null) ??
        (seFue ? "seVa" : null);
      if (porque && this.permiso !== null) this.retira(porque);
    }
    this.enLaFrustrada = this.v.enLaFrustrada;
    // ── Y pedirlo, sonar y darlo ──
    this.torre = faseQueVeLaTorre(this.fase, this.enLaFinal, NO_CALLA_NADA);
    if (this.torre === "final" && torreAntes !== "final" && this.permiso !== "oido") this.pedido = true;
    if (this.torre !== "final") this.pedido = false;
    if (this.pedido && !a.orden) {
      this.pedido = false;
      this.permiso = this.sinRadio ? "oido" : "sonando";
      this.suenaHasta = this.t + VOZ;
      this.aproximacion.empieza(this.loQueSeVe());
      this.dados.push({ t: this.t, alUmbral: this.alUmbral, h: a.h });
      this.porDonde.push(this.enLaFinal ? "su final" : "el plan");
    }
    if (this.permiso === "sonando" && this.t >= this.suenaHasta) this.permiso = "oido";
    if (this.sinRadio)
      this.luz = this.lampara.paso({
        enElAire: !a.enElSuelo,
        teMandaIrte: a.orden,
        teDejaAterrizar: this.permiso !== null,
        teCuenta: true,
        enLaBaseOEnLaFinal: this.enLaFinal,
        conElCodigo: 60,
      });
  }

  private retira(porque: PorQueSeDejo | "torre"): void {
    this.permiso = null;
    this.retirados.push(porque);
    this.aproximacion.olvidar();
  }
}

/** La final, alineado a esos metros del umbral y en la senda de tres grados. */
const enFinal = (m: Mesa, alUmbral: number): Mesa =>
  m.en({
    x: m.pista.x - m.pista.length / 2 + (m.pista.desplazado ?? 0) - alUmbral,
    eje: 5,
    rumbo: 0,
    h: 15 + alUmbral * Math.tan(Math.PI / 60),
    vs: -2.1,
    gs: 40,
    gas: 0.4,
  });

/** El circuito de vuelta: la subida, el cruzado y el viento en cola. */
const alVientoEnCola = (m: Mesa): Mesa =>
  m
    .vuela(20, { vs: 3, gas: 0.8 })
    .vuela(30, { giro: 3, vs: 2 })
    .vuela(10, { vs: 1 })
    .vuela(30, { giro: 3, vs: 0, gas: 0.6 })
    .vuela(20);

/** Y la base y la final otra vez, desde donde se esté en el viento en cola. */
const otraFinal = (m: Mesa): Mesa => {
  m.vuela(400, { vs: 0 }, () => m.alUmbral > 3500);
  return enFinal(m, 3400).vuela(20, { vs: -2.1 });
};

/** Los casos: cada uno acaba con el avión fuera de la aproximación, en el circuito. */
const CASOS: readonly {
  readonly nombre: string;
  readonly vuela: (m: Mesa) => void;
  /** Si la regla de antes lo dejaba vivo. */
  readonly antes: "vivo" | "retirado";
  readonly porque: PorQueSeDejo;
  /** Si al acabar ya se va por el viento en cola. */
  readonly enCola?: true;
  /** Si antes se había dado y retirado otro, por la final de la torre. */
  readonly otroAntes?: true;
}[] = [
  {
    nombre: "la frustrada de siempre, con el gas y el permiso ya oído",
    vuela: (m) => void enFinal(m, 3400).vuela(20).vuela(15, { vs: 4, gas: 1 }),
    antes: "retirado",
    porque: "seVa",
  },
  {
    nombre: "la frustrada con el permiso todavía sonando",
    vuela: (m) => void enFinal(m, 3400).vuela(1).vuela(20, { vs: 4, gas: 1 }),
    antes: "vivo",
    porque: "seVa",
  },
  {
    nombre: "dado con la final del plan sola, y la frustrada",
    /*
     * A cuatro millas, con el gas a fondo y veinte metros arriba: para la
     * torre se fue, y no vuelve a verle en su final hasta que dé la vuelta. El
     * sigue bajando, y a trescientos metros la fase del plan dice «final».
     */
    vuela: (m) =>
      void enFinal(m, 4 * MILLA)
        .vuela(5)
        .vuela(7, { vs: 4, gas: 1 })
        .vuela(200, { vs: -2.1, gas: 0.4 }, (n) => n.alUmbral < 2000)
        .vuela(15, { vs: 4, gas: 1 }),
    antes: "vivo",
    porque: "seVa",
    otroAntes: true,
  },
  {
    nombre: "dado con la final del plan sola, y fuera por un lado dándose la vuelta",
    vuela: (m) =>
      void enFinal(m, 4 * MILLA)
        .vuela(5)
        .vuela(7, { vs: 4, gas: 1 })
        .vuela(200, { vs: -2.1, gas: 0.4 }, (n) => n.alUmbral < 3600)
        .vuela(60, { vs: 0, giro: 3 }),
    antes: "vivo",
    porque: "vuelta",
    enCola: true,
    otroAntes: true,
  },
  {
    nombre: "pasar la pista de largo, sin subir",
    vuela: (m) =>
      void enFinal(m, 3400)
        .vuela(200, { vs: -2.1 }, (n) => n.a.h < 40)
        .vuela(200, { vs: 0 }, (n) => n.a.x > n.pista.length / 2 + 300),
    antes: "vivo",
    porque: "pasada",
  },
  {
    nombre: "romper la final a un lado: de través, y luego el viento en cola",
    vuela: (m) =>
      void enFinal(m, 1500)
        .vuela(8, { vs: -2 })
        .vuela(30, { giro: 3, vs: 1 })
        .vuela(25, { vs: 1 })
        .vuela(30, { giro: 3, vs: 0 }),
    antes: "vivo",
    porque: "deTraves",
    enCola: true,
  },
  {
    nombre: "un viraje que cruza el eje bajo, cerca del umbral",
    vuela: (m) =>
      void m
        .en({ x: -1552 - 1300, eje: -500, rumbo: 90, h: 120, vs: -0.3, gs: 40, gas: 0.5 })
        .vuela(90, { giro: -3 }),
    antes: "vivo",
    porque: "deTraves",
    enCola: true,
  },
  {
    nombre: "alejarse por un lado sin darse la vuelta",
    vuela: (m) => void enFinal(m, 9000).vuela(8, { vs: -2 }).vuela(18.3, { giro: 3, vs: 0.5 }).vuela(350, { vs: 0, gas: 0.6 }),
    antes: "vivo",
    porque: "lejos",
  },
];

describe("el permiso se retira al dejar su aproximación (H73)", () => {
  for (const c of CASOS) {
    it(`${c.nombre}: ahora se retira, y la final siguiente lleva el suyo`, () => {
      const m = new Mesa("ahora");
      c.vuela(m);
      const suyos = c.otroAntes ? 2 : 1;
      expect(m.dados.length, "los dados").toBe(suyos);
      // Y el del caso, con la final del plan sola.
      expect(m.porDonde.at(-1)).toBe(c.otroAntes ? "el plan" : "su final");
      expect(m.permiso).toBeNull();
      expect(m.retirados.length).toBe(suyos);
      expect(m.retirados.at(-1)).toBe(c.porque);
      if (c.enCola) m.vuela(20);
      else alVientoEnCola(m);
      expect(m.permiso).toBeNull();
      otraFinal(m);
      expect(m.dados.length, "y en la final siguiente, otro").toBe(suyos + 1);
      expect(m.permiso).toBe("oido");
    });

    it(`${c.nombre}: antes, ${c.antes}`, () => {
      const m = new Mesa("antes");
      c.vuela(m);
      if (c.enCola) m.vuela(20);
      else alVientoEnCola(m);
      if (c.antes === "retirado") expect(m.permiso).toBeNull();
      else {
        // Vivo en el viento en cola, y en la final siguiente nadie pide otro.
        const dados = m.dados.length;
        expect(m.permiso).toBe("oido");
        otraFinal(m);
        expect(m.dados.length).toBe(dados);
      }
    });
  }

  it("el que se dio con la final del plan sola se gasta también al tocar", () => {
    const vuela = (regla: Regla): Mesa => {
      const m = new Mesa(regla);
      enFinal(m, 4 * MILLA)
        .vuela(5)
        .vuela(7, { vs: 4, gas: 1 })
        .vuela(300, { vs: -2.1, gas: 0.4 }, (n) => n.a.h < 1);
      expect(m.porDonde.at(-1)).toBe("el plan");
      m.en({ enElSuelo: true, vs: 0, h: 0 }).vuela(4);
      // Y el toque y despegue.
      return m.en({ enElSuelo: false, h: 1 }).vuela(20, { vs: 4, gas: 1 });
    };
    expect(vuela("antes").permiso).toBe("oido");
    const ahora = vuela("ahora");
    expect(ahora.permiso).toBeNull();
    expect(ahora.retirados.at(-1)).toBe("tierra");
  });
});

describe("y por un bache no se retira, ni suena dos veces (H73)", () => {
  const IGUAL: readonly { readonly nombre: string; readonly vuela: (m: Mesa) => void }[] = [
    {
      nombre: "una corrección de senda que saca de la fase veinticinco metros arriba",
      vuela: (m) =>
        void enFinal(m, 3400)
          .vuela(20)
          .vuela(12, { vs: 2.1, gas: 0.7 })
          .vuela(300, { vs: -2.6, gas: 0.4 }, (n) => n.a.h < 1),
    },
    {
      nombre: "el bamboleo de ochenta metros sin el gas de despegue",
      vuela: (m) =>
        void enFinal(m, 8000)
          .vuela(10)
          .vuela(16, { vs: 5, gas: 0.8 })
          .vuela(400, { vs: -3, gas: 0.4 }, (n) => n.a.h < 1),
    },
    {
      nombre: "quien se pasa del eje al coger la final, se sale del cono y vuelve",
      vuela: (m) =>
        void m
          .en({ x: -1552 - 1500, eje: -700, rumbo: 55, h: 110, vs: -0.2, gs: 40, gas: 0.4 })
          .vuela(200, {}, (n) => n.a.eje > 900)
          .vuela(35, { giro: -3 })
          .vuela(200, {}, (n) => n.a.eje < 250)
          .vuela(17, { giro: 3 })
          .vuela(1),
    },
    {
      nombre: "la recogida que flota media pista",
      vuela: (m) =>
        void enFinal(m, 3400)
          .vuela(300, { vs: -2.1 }, (n) => n.a.h < 4)
          .vuela(300, { vs: -0.02 }, (n) => n.a.x > 400)
          .vuela(60, { vs: -0.5 }, (n) => n.a.h < 1),
    },
    {
      nombre: "el gas de despegue diez metros, y se sigue bajando",
      vuela: (m) =>
        void enFinal(m, 3400)
          .vuela(20)
          .vuela(2.5, { vs: 4, gas: 1 })
          .vuela(300, { vs: -2.3, gas: 0.4 }, (n) => n.a.h < 1),
    },
  ];
  for (const c of IGUAL) {
    for (const regla of ["antes", "ahora"] as const)
      it(`${c.nombre} (${regla}): uno, y vale hasta tocar`, () => {
        const m = new Mesa(regla);
        c.vuela(m);
        expect(m.retirados).toEqual([]);
        expect(m.dados.length).toBe(1);
        expect(m.permiso).toBe("oido");
      });
  }

  it("con la cabecera desplazada mil metros (la 01 de Fuerteventura), igual", () => {
    const fuerteventura: Pista = { ...GANDO, length: 3406, desplazado: 1000 };
    for (const regla of ["antes", "ahora"] as const) {
      const m = new Mesa(regla, fuerteventura);
      enFinal(m, 3400).vuela(300, { vs: -2.1 }, (n) => n.a.h < 1);
      expect(m.dados.length).toBe(1);
      expect(m.retirados).toEqual([]);
      expect(m.permiso).toBe("oido");
      // Y tocando, se gasta.
      m.en({ enElSuelo: true, vs: 0, h: 0 }).vuela(1);
      expect(m.permiso).toBeNull();
    }
  });

  it("y con una aproximación publicada, dado de lejos y de lado, viniendo", () => {
    const a = new AproximacionDelPermiso();
    const v = {
      enElAire: true,
      pista: "a",
      alUmbral: 9 * MILLA,
      deLado: 3 * MILLA,
      pistaPorDelante: 9 * MILLA,
      enElCono: false,
      enLaFinalDelPlan: true,
      torcido: -35,
      sobreLaPista: 900,
      vertical: -3,
      gas: 0.4,
      ordenDeIrse: false,
    };
    a.empieza(v);
    for (let d = 9; d > 1; d -= 0.1)
      expect(a.paso({ ...v, alUmbral: d * MILLA, deLado: (d / 3) * MILLA })).toBeNull();
    expect(a.enMarcha).toBe(true);
  });
});

describe("despegando de una pista con la cabecera desplazada (H73)", () => {
  /**
   * **El despegue de Fuerteventura por la 01**: 3.406 m de asfalto y el umbral
   * de aterrizar a mil metros de la punta. La avioneta deja el suelo a unos
   * trescientos metros, o sea **por delante del umbral de aterrizar**, dentro
   * del cono de la aproximación y alineada: lo mismo que ve la torre en una
   * final. La vertical crece en dos segundos hasta su subida.
   */
  const despegue = (
    regla: Regla,
    gas: number,
  ): { torre: Set<string>; dados: number; alUmbral: number; alto: number } => {
    const fuerteventura: Pista = { ...GANDO, length: 3406, desplazado: 1000 };
    const m = new Mesa(regla, fuerteventura);
    m.v.reiniciar(true);
    m.final.reiniciar();
    m.en({ x: -1703 + 40, eje: 1, rumbo: 0, h: 0, vs: 0, gs: 0, gas, enElSuelo: true });
    while (m.a.gs < 30) m.vuela(PASO, { gs: m.a.gs + 2 * PASO });
    const alUmbral = m.alUmbral;
    m.en({ enElSuelo: false });
    const torre = new Set<string>();
    // Hasta dónde se sube con el permiso de aterrizar puesto.
    let alto = 0;
    for (let t = 0; t < 40; t += PASO) {
      m.vuela(PASO, { vs: Math.min(4.8, t * 2.4) });
      torre.add(m.torre);
      if (m.permiso !== null) alto = m.a.h;
    }
    return { torre, dados: m.dados.length, alUmbral, alto };
  };

  for (const gas of [1, 0.85])
    it(`con el gas al ${gas * 100} %, la torre no te ve en final ni te da la pista`, () => {
      const ahora = despegue("ahora", gas);
      // Se va al aire por delante del umbral de aterrizar.
      expect(ahora.alUmbral).toBeGreaterThan(500);
      expect([...ahora.torre]).not.toContain("final");
      expect(ahora.dados).toBe(0);
      // Y antes te veía y te la daba, recién despegado.
      const antes = despegue("antes", gas);
      expect([...antes.torre]).toContain("final");
      expect(antes.dados).toBe(1);
    });

  it("antes, con el gas reducido, el permiso duraba casi cien metros de subida", () => {
    expect(despegue("antes", 0.85).alto).toBeGreaterThan(90);
  });
});

describe("la lámpara, con la radio callada (H73)", () => {
  it("la verde no dura el circuito: al dejar la aproximación vuelven los destellos", () => {
    const luces = (regla: Regla): { enCola: LuzSinRadio; luego: LuzSinRadio } => {
      const m = new Mesa(regla);
      m.sinRadio = true;
      m.vuela(1);
      enFinal(m, 3400)
        .vuela(200, { vs: -2.1 }, (n) => n.a.h < 40)
        .vuela(200, { vs: 0 }, (n) => n.a.x > n.pista.length / 2 + 300);
      alVientoEnCola(m);
      const enCola = m.luz;
      otraFinal(m);
      return { enCola, luego: m.luz };
    };
    expect(luces("antes").enCola).toBe("verde");
    expect(luces("ahora")).toEqual({ enCola: "destellos", luego: "verde" });
  });

  it("y por un bache en la final buena, no se apaga ni cambia", () => {
    const m = new Mesa("ahora");
    m.sinRadio = true;
    m.vuela(1);
    enFinal(m, 3400).vuela(5);
    const vistas = new Set<LuzSinRadio>();
    const mirar = (s: number, vs: number, gas: number): void => {
      for (let i = 0; i < s / PASO; i++) {
        m.vuela(PASO, { vs, gas });
        vistas.add(m.luz);
      }
    };
    mirar(12, 2.1, 0.7);
    mirar(20, -2.6, 0.4);
    expect([...vistas]).toEqual(["verde"]);
  });
});

describe("con otra pista, la final empieza de cero (H73)", () => {
  /** Se va al aire aquí, y sigue derecho a otro campo con la pista al mismo rumbo. */
  const derechoAOtroCampo = (regla: Regla): Mesa => {
    const m = new Mesa(regla);
    enFinal(m, 3400).vuela(20).vuela(30, { vs: 5, gas: 1 });
    m.cambiarDePista({ ...GANDO, x: 120_000 }, "b");
    m.en({ x: 120_000 - 1552 - 6 * MILLA, h: 600, vs: 0, gas: 0.5, eje: 5, rumbo: 0 }).vuela(1);
    return m.vuela(400, { vs: -2.1 }, (n) => n.alUmbral < 2000);
  };

  it("la torre de allí te ve a sus cinco millas, y no a los trescientos metros", () => {
    const antes = derechoAOtroCampo("antes").dados.at(-1)!;
    const ahora = derechoAOtroCampo("ahora").dados.at(-1)!;
    expect(antes.h).toBeLessThan(301);
    expect(ahora.alUmbral).toBeGreaterThan(4.9 * MILLA);
  });

  it("y si cambia la cabecera en uso, el permiso de la otra no vale", () => {
    const m = new Mesa("ahora");
    enFinal(m, 3400).vuela(10);
    expect(m.permiso).toBe("oido");
    // La misma pista vista desde la otra punta: se va hacia ella, y en cola.
    m.cambiarDePista(GANDO, "a-otra");
    m.en({ x: -m.a.x, eje: -m.a.eje, rumbo: 180 }).vuela(1);
    expect(m.permiso).toBeNull();
    expect(m.retirados).toEqual(["otraPista"]);
  });
});

describe("con una emergencia declarada, la que se elija, y otra vez si se deja (H73)", () => {
  const paso = { deColaEnLaOtra: 0, sinMotor: true, alto: 200 };
  it("tras irse al aire, al alinearse otra vez se autoriza otra vez", () => {
    const o = new LaOtraCabecera();
    expect(o.paso({ ...paso, enUso: 3000, otra: null })?.que).toBe("autorizada");
    o.seDejoLaAproximacion();
    // En la subida todavía está en su embudo: no se repite ahí.
    expect(o.paso({ ...paso, enUso: 500, otra: null })).toBeNull();
    expect(o.paso({ ...paso, enUso: null, otra: null })).toBeNull();
    expect(o.paso({ ...paso, enUso: 3000, otra: null })?.que).toBe("autorizada");
  });
  it("y sin haberla dejado, no", () => {
    const o = new LaOtraCabecera();
    expect(o.paso({ ...paso, enUso: 3000, otra: null })?.que).toBe("autorizada");
    expect(o.paso({ ...paso, enUso: null, otra: null })).toBeNull();
    expect(o.paso({ ...paso, enUso: 3000, otra: null })).toBeNull();
  });
});
