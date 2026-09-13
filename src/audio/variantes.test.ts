/**
 * Que se elija una forma y que la grabación que se pide sea la de esa forma.
 *
 * Es el único sitio donde una equivocación no se ve jugando: si el
 * identificador no casa con el texto, la voz grabada no existe, el instructor
 * cae al suplente del navegador —que en Linux no hay— y la frase **no suena**.
 * Desde fuera se parece a «esa frase todavía no está grabada».
 */
import { describe, expect, it } from "vitest";
import { VARIANTES, cuantasFormas, idDeLaForma, unaForma } from "./variantes";
import { t } from "../i18n";

describe("las formas de una frase", () => {
  it("sin variantes, siempre la de i18n y con su nombre", () => {
    const f = unaForma("vuelo.rodando", () => 0.99);
    expect(f.texto).toBe(t("vuelo.rodando"));
    expect(f.id).toBe("vuelo.rodando");
  });

  it("con variantes, la primera se llama como la clave", () => {
    const f = unaForma("vuelo.frustrada", () => 0);
    expect(f.texto).toBe(t("vuelo.frustrada"));
    expect(f.id).toBe("vuelo.frustrada");
  });

  it("y las demás llevan su número, empezando en dos", () => {
    const f = unaForma("vuelo.frustrada", () => 0.99);
    expect(f.id).toBe("vuelo.frustrada~3");
    expect(f.texto).toBe(VARIANTES["vuelo.frustrada"]![1]);
  });

  /*
   * **El texto y el identificador van juntos o no van.** Si se eligiera el
   * texto por un lado y el nombre del fichero por otro, el instructor diría
   * una cosa y la pantalla otra, o pediría una grabación que no existe.
   */
  it("el texto y el nombre del fichero son siempre de la misma forma", () => {
    for (const clave of Object.keys(VARIANTES) as (keyof typeof VARIANTES)[]) {
      const formas = cuantasFormas(clave);
      for (let n = 0; n < formas; n++) {
        const f = unaForma(clave, () => (n + 0.5) / formas);
        expect(f.id).toBe(idDeLaForma(clave, n));
        expect(f.texto).toBe(n === 0 ? t(clave) : VARIANTES[clave]![n - 1]);
      }
    }
  });

  it("y el azar no se sale del rango, ni en el borde", () => {
    for (const azar of [0, 0.999999, 1]) {
      const f = unaForma("vuelo.frustrada", () => azar);
      expect(cuantasFormas("vuelo.frustrada")).toBe(3);
      expect([
        "vuelo.frustrada",
        "vuelo.frustrada~2",
        "vuelo.frustrada~3",
      ]).toContain(f.id);
    }
  });

  /*
   * **Y ninguna variante puede ser de fraseología fija.** `cleared to land` se
   * dice tal cual en todo el mundo, y que dos aeropuertos lo digan distinto es
   * exactamente lo que esas frases existen para evitar.
   */
  it("ninguna frase de cabina ni de torre tiene variantes", () => {
    for (const clave of Object.keys(VARIANTES)) {
      expect(clave.startsWith("cabina.")).toBe(false);
      expect(clave.startsWith("torre.")).toBe(false);
    }
  });
});
