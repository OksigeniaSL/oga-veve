/**
 * **Sin desdoblar por sexos.** El castellano tiene masculino genérico, y este
 * proyecto lo usa: «señores pasajeros», «los chicos», «bienvenidos a bordo».
 * «Señoras y señores» se queda, porque es la fórmula de siempre de la
 * megafonía y no un desdoblamiento hecho a propósito.
 *
 * Es una norma de Oksigenia para todos sus trabajos, y se coló en la
 * bienvenida de la comandante y en su saludo a los chicos, grabados ya en la
 * voz. Esto la vigila en los textos que se leen y se graban, en castellano y
 * en inglés, porque una norma que solo vive en una memoria se cumple mientras
 * alguien se acuerda.
 */
import { describe, expect, it } from "vitest";
import { ES_PY } from "./es-PY";
import { EN } from "./en";

/**
 * Los desdoblamientos que no entran, en cualquier orden, y las grafías con @,
 * x o e. Una expresión por forma y no una sola unida con «|»: con las
 * referencias atrás, el `\1` de la segunda apuntaba al grupo de la primera.
 */
const DESDOBLADOS: readonly RegExp[] = [
  /\b(chic|niñ|nen|pib|amig|tod|pasajer|compañer|herman|abuel|hij|alumn|viajer)(os|es)? y (las )?\1as\b/iu,
  /\b(chic|niñ|nen|pib|amig|tod|pasajer|compañer|herman|abuel|hij|alumn|viajer)as y (los )?\1os\b/iu,
  /\b(chic|niñ|amig|tod|pasajer|compañer|bienvenid)[@x]s?\b/iu,
  /\b(chiques|niñes|amigues|todes|elles|compañeres|bienvenides)\b/iu,
  /\b(boys and girls|girls and boys|he or she|she or he|his or her|her or his)\b/iu,
];

const desdobla = (texto: string): boolean => DESDOBLADOS.some((r) => r.test(texto));

describe("sin desdoblar por sexos", () => {
  it("la regla de medir ve lo que tiene que ver", () => {
    // Una regla que no ve nada da siempre verde.
    for (const mal of [
      "Señoras y señores, chicos y chicas: ¡buenos días!",
      "a todos y todas",
      "las niñas y los niños",
      "bienvenidxs a bordo",
      "chiques",
      "Ladies and gentlemen, boys and girls",
    ])
      expect(desdobla(mal), mal).toBe(true);
    for (const bien of [
      "Señoras y señores, y los más chicos de a bordo: ¡buenos días!",
      "Señores pasajeros, bienvenidos a bordo.",
      "Un saludo grande a los chicos que viajan hoy.",
      "Ladies and gentlemen, and our youngest passengers",
    ])
      expect(desdobla(bien), bien).toBe(false);
  });

  it("ningún texto del juego desdobla, ni en castellano ni en inglés", () => {
    for (const [nombre, dic] of [
      ["es-PY", ES_PY],
      ["en", EN],
    ] as const)
      for (const [clave, texto] of Object.entries(dic))
        if (typeof texto === "string")
          expect(desdobla(texto), `${nombre} ${clave}: «${texto}»`).toBe(false);
  });
});
