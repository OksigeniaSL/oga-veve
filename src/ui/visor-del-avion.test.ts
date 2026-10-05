/**
 * El visor de la tarjeta: **que no pinte cuando no se ve**, ni cuando no ha
 * cambiado nada. Es la regla de rendimiento de un segundo dibujo encima del
 * juego, y se comprueba sin navegador, con un pintor y un reloj de mentira.
 */
import { describe, expect, it } from "vitest";
import { VisorDelAvion, type Fotogramas, type Pintor } from "./visor-del-avion";
import { EXPLICACIONES_DEL_AVION } from "./explicaciones-del-avion";
import { ES_PY } from "../i18n/es-PY";
import { EN } from "../i18n/en";

/** Un reloj que solo avanza cuando la prueba lo dice. */
function relojDePrueba(): Fotogramas & { pedidos: number; avanzar(ms: number): void } {
  let cola: ((t: number) => void)[] = [];
  let t = 0;
  return {
    pedidos: 0,
    pedir(f) {
      this.pedidos += 1;
      cola.push(f);
      return cola.length;
    },
    soltar() {
      cola = [];
    },
    avanzar(ms) {
      t += ms;
      const ahora = cola;
      cola = [];
      for (const f of ahora) f(t);
    },
  };
}

function pintorDePrueba(): Pintor & { pintadas: number } {
  return {
    pintadas: 0,
    setPixelRatio() {},
    setSize() {},
    render() {
      this.pintadas += 1;
    },
    dispose() {},
  };
}

const lienzo = { clientWidth: 480, clientHeight: 300 } as HTMLCanvasElement;

describe("el visor de la tarjeta", () => {
  it("no pide ni un fotograma mientras no se ve", () => {
    const reloj = relojDePrueba();
    const pintor = pintorDePrueba();
    const v = new VisorDelAvion({ lienzo, pintor, fotogramas: reloj });
    v.marcar();
    v.girar(30, 0);
    v.ponerLuces({ baliza: true });
    expect(reloj.pedidos).toBe(0);
    expect(pintor.pintadas).toBe(0);
  });

  it("pinta al verse, y se para en cuanto deja de verse", () => {
    const reloj = relojDePrueba();
    const pintor = pintorDePrueba();
    // Girando sola, que es lo más caro: se pinta a su ritmo mientras se ve.
    const v = new VisorDelAvion({ lienzo, pintor, fotogramas: reloj, giraSolo: true });
    v.ver(true);
    for (let i = 0; i < 10; i++) reloj.avanzar(1000 / 30);
    const pintadas = pintor.pintadas;
    expect(pintadas).toBeGreaterThan(5);

    v.ver(false);
    for (let i = 0; i < 10; i++) reloj.avanzar(1000 / 30);
    expect(pintor.pintadas).toBe(pintadas);
  });

  it("quieto y sin cambios, deja de pedir fotogramas", () => {
    const reloj = relojDePrueba();
    const pintor = pintorDePrueba();
    // En el vuelo no gira sola: un avión quieto no se repinta.
    const v = new VisorDelAvion({ lienzo, pintor, fotogramas: reloj, giraSolo: false });
    v.ver(true);
    reloj.avanzar(16);
    reloj.avanzar(16);
    const pedidos = reloj.pedidos;
    const pintadas = pintor.pintadas;
    expect(pintadas).toBe(1);
    for (let i = 0; i < 20; i++) reloj.avanzar(16);
    expect(reloj.pedidos).toBe(pedidos);
    expect(pintor.pintadas).toBe(pintadas);
    // Y un cambio lo despierta: una pintada más y otra vez quieto.
    v.marcar();
    for (let i = 0; i < 5; i++) reloj.avanzar(40);
    expect(pintor.pintadas).toBe(pintadas + 1);
  });

  it("no pinta más deprisa de treinta por segundo cuando nadie lo toca", () => {
    const reloj = relojDePrueba();
    const pintor = pintorDePrueba();
    const v = new VisorDelAvion({ lienzo, pintor, fotogramas: reloj, giraSolo: true });
    v.ver(true);
    // Un segundo de fotogramas de pantalla a sesenta.
    for (let i = 0; i < 60; i++) reloj.avanzar(1000 / 60);
    expect(pintor.pintadas).toBeLessThanOrEqual(31);
  });
});

describe("los puntos de la tarjeta, sin pisarse", () => {
  it("dos puntos encima uno del otro se apartan hasta poder tocarse", async () => {
    const { separarPuntos } = await import("./tarjeta-del-avion");
    const juntos = [
      { pieza: "flaps" as const, x: 100, y: 100, detras: false },
      { pieza: "alerones" as const, x: 110, y: 104, detras: false },
      { pieza: "luces" as const, x: 100, y: 100, detras: false },
    ];
    const p = separarPuntos(juntos);
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        expect(Math.hypot(p[i]!.x - p[j]!.x, p[i]!.y - p[j]!.y)).toBeGreaterThan(38);
    // Y cada uno sigue cerca de su pieza.
    for (let i = 0; i < p.length; i++)
      expect(Math.hypot(p[i]!.x - juntos[i]!.x, p[i]!.y - juntos[i]!.y)).toBeLessThan(60);
  });
});

describe("las explicaciones de la tarjeta", () => {
  it("tienen id único, dibujo, texto y voz en los dos idiomas y su hueco de vídeo", () => {
    const ids = EXPLICACIONES_DEL_AVION.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EXPLICACIONES_DEL_AVION) {
      expect(e.id).toMatch(/^avion\.[a-z-]+$/);
      expect(e.dibujo.length).toBeGreaterThan(20);
      expect(ES_PY[e.texto], e.id).toBeTruthy();
      expect(ES_PY[e.voz], e.id).toBeTruthy();
      expect(EN[e.texto], e.id).toBeTruthy();
      expect(EN[e.voz], e.id).toBeTruthy();
      expect(e.video).toBeNull();
    }
  });

  /*
   * **La sustentación no se explica con el aire que corre más por arriba.**
   * Es falso aunque sea lo que se cuenta siempre (AGENTS.md, regla cuarta), y
   * el flap es donde más tienta: aquí se mira que no se haya colado.
   */
  it("no cuentan el cuento del aire que tiene que llegar a la vez", () => {
    for (const e of EXPLICACIONES_DEL_AVION)
      for (const texto of [ES_PY[e.texto], ES_PY[e.voz]])
        expect(texto).not.toMatch(/más camino|llegar a la vez|mismo tiempo|recorre más/i);
  });
});
