import { describe, expect, it } from "vitest";
import {
  PantallaDespierta,
  type Cerrojo,
  type Despertador,
  type Documento,
} from "./pantalla-despierta";

/** Un sistema de mentira que lleva la cuenta de lo que se le pide. */
function sistema(niega = false) {
  const cerrojos: (Cerrojo & { soltado: boolean; avisar: () => void })[] = [];
  const despertador: Despertador = {
    request: () => {
      if (niega) return Promise.reject(new Error("NotAllowedError"));
      let alSoltar: (() => void) | null = null;
      const c = {
        soltado: false,
        get released() {
          return this.soltado;
        },
        release() {
          this.soltado = true;
          return Promise.resolve();
        },
        addEventListener(_e: "release", cb: () => void) {
          alSoltar = cb;
        },
        // Lo que hace el navegador al ocultarse la pestaña.
        avisar() {
          this.soltado = true;
          alSoltar?.();
        },
      };
      cerrojos.push(c);
      return Promise.resolve(c);
    },
  };
  let alCambiar: (() => void) | null = null;
  const documento: Documento & { visibilityState: string; cambiar(v: string): void } = {
    visibilityState: "visible",
    addEventListener: (_e, cb) => {
      alCambiar = cb;
    },
    cambiar(v: string) {
      this.visibilityState = v;
      alCambiar?.();
    },
  };
  return { despertador, documento, cerrojos };
}

const despues = () => new Promise((r) => setTimeout(r, 0));

describe("la pantalla, despierta mientras se vuela", () => {
  it("pide el cerrojo al volar y lo suelta en la pausa", async () => {
    const s = sistema();
    const p = new PantallaDespierta(s.despertador, s.documento);
    p.ponerse(true);
    await despues();
    expect(p.puesta).toBe(true);
    p.ponerse(false);
    expect(p.puesta).toBe(false);
    expect(s.cerrojos[0]?.soltado).toBe(true);
  });

  it("no pide dos cerrojos por pedirlo dos veces", async () => {
    const s = sistema();
    const p = new PantallaDespierta(s.despertador, s.documento);
    p.ponerse(true);
    p.ponerse(true);
    await despues();
    p.ponerse(true);
    await despues();
    expect(s.cerrojos).toHaveLength(1);
  });

  /*
   * El navegador suelta el cerrojo al ocultar la pestaña y no lo devuelve:
   * si se sigue volando, hay que volver a pedirlo al hacerse visible.
   */
  it("lo vuelve a pedir al volver a la pestaña, si se sigue volando", async () => {
    const s = sistema();
    const p = new PantallaDespierta(s.despertador, s.documento);
    p.ponerse(true);
    await despues();
    s.documento.cambiar("hidden");
    s.cerrojos[0]?.avisar();
    expect(p.puesta).toBe(false);
    s.documento.cambiar("visible");
    await despues();
    expect(p.puesta).toBe(true);
    expect(s.cerrojos).toHaveLength(2);
  });

  it("y no lo pide al volver si ya no se vuela", async () => {
    const s = sistema();
    const p = new PantallaDespierta(s.despertador, s.documento);
    p.ponerse(true);
    await despues();
    p.ponerse(false);
    s.documento.cambiar("hidden");
    s.documento.cambiar("visible");
    await despues();
    expect(s.cerrojos).toHaveLength(1);
    expect(p.puesta).toBe(false);
  });

  it("un cerrojo que llega después de parar se suelta en el acto", async () => {
    const s = sistema();
    const p = new PantallaDespierta(s.despertador, s.documento);
    p.ponerse(true);
    p.ponerse(false);
    await despues();
    expect(p.puesta).toBe(false);
    expect(s.cerrojos[0]?.soltado).toBe(true);
  });

  it("si el sistema se niega, o no hay API, se vuela igual", async () => {
    const s = sistema(true);
    const p = new PantallaDespierta(s.despertador, s.documento);
    p.ponerse(true);
    await despues();
    expect(p.puesta).toBe(false);
    const sin = new PantallaDespierta(null, s.documento);
    expect(() => sin.ponerse(true)).not.toThrow();
  });
});
