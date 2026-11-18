/**
 * **Lo que no es del ejercicio**, para los bancos de los ejercicios de radio
 * (H26f, ADR 0030). Volando «Interceptar un radial» salía «Andá a la pista»
 * todo el rato, la torre contaba el tráfico de otros y la Isla de Lobos tapaba
 * la tarjeta del ejercicio. Los tres bancos de radio miran lo mismo con esto:
 *
 * - `mirar(page, abierto)` en cada lectura, mientras el ejercicio no se haya
 *   cerrado: apunta la tarjeta, el rótulo grande, la tira de la radio y si la
 *   flecha de casa late;
 * - `comprobar(page, comprobar, propias)` al final: que ninguna boca dijo nada
 *   que no fuera del ejercicio o de seguridad, y que no se vio nada más que las
 *   tarjetas `propias` y las de seguridad.
 *
 * **La seguridad no se calla**: la información de tráfico (su tarjeta `cerca-…`
 * y su frase, que sin torre la dice la instructora) vale siempre. Qué frase es
 * de seguridad no lo adivina el banco: es la lista `SEGURIDAD` de
 * `flight/sin-instructora.ts`, la misma que sigue sonando con la instructora
 * quitada, pedida al servidor de desarrollo desde la página.
 */

export function vigilarLoAjeno() {
  const visto = { tarjetas: new Set(), rotulos: new Set(), radio: new Set(), perdido: false };
  return {
    visto,
    async mirar(page, abierto) {
      if (!abierto) return;
      const v = await page.evaluate(() => {
        const o = globalThis.__oga;
        const j = o.juegoParaTrazas();
        const radio = document.querySelector('[data-hud="radio"]');
        return {
          tarjeta: o.tarjeta?.()?.dibujo ?? null,
          rotulo: document.querySelector('[data-hud="hint"]')?.textContent?.trim() || null,
          radio: radio && !radio.hidden ? radio.textContent.replace(/\s+/g, " ").trim() || null : null,
          perdido: j.perdidoParaBanco?.perdido ?? false,
        };
      });
      if (v.tarjeta) visto.tarjetas.add(v.tarjeta);
      if (v.rotulo) visto.rotulos.add(v.rotulo);
      if (v.radio) visto.radio.add(v.radio);
      visto.perdido ||= v.perdido;
    },
    async comprobar(page, comprobar, propias, tambien = null) {
      const dicho = await page.evaluate(async () => {
        const { SEGURIDAD, claveBase } = await import("/src/flight/sin-instructora.ts");
        return Object.entries(globalThis.__oga.dichoTodo()).map(([quien, claves]) => ({
          quien,
          claves: claves.map((c) => ({ c, seguridad: SEGURIDAD.has(claveBase(c)) })),
        }));
      });
      const ajeno = dicho.flatMap(({ quien, claves }) =>
        claves
          .filter(
            ({ c, seguridad }) => !(quien === "instructor" && (/^ejercicio\./.test(c) || seguridad || tambien?.test(c))),
          )
          .map(({ c }) => `${quien}: ${c}`),
      );
      const delInstructor = dicho.find((d) => d.quien === "instructor")?.claves ?? [];
      comprobar(
        "no se oye nada que no sea del ejercicio o de seguridad",
        ajeno.length === 0,
        ajeno.slice(0, 6).join(" | ") ||
          `la instructora: ${delInstructor.map(({ c, seguridad }) => (seguridad ? `${c} (seguridad)` : c)).join(", ") || "nada"}`,
      );
      const tarjetas = [...visto.tarjetas];
      const ajenas = tarjetas.filter((t) => !propias.test(t) && !/^cerca-/.test(t));
      /*
       * El rótulo del destino al empezar —«Fuerteventura · GCFV», cuatro
       * segundos— es la tarjeta de casa diciendo cuál es, como en todo vuelo:
       * no pide nada ni es de la pista. Lo demás que se escriba ahí, sí cuenta.
       */
      const rotulos = [...visto.rotulos].filter((r) => !/^[^·]+ · [A-Z]{4}$/.test(r));
      comprobar(
        "ni se ve: solo sus tarjetas, sin rótulo, sin tira de la radio y sin la flecha de casa latiendo",
        ajenas.length === 0 && rotulos.length === 0 && visto.radio.size === 0 && !visto.perdido,
        `tarjetas ${tarjetas.join(", ") || "ninguna"}; rótulos ${rotulos.join(" | ") || "ninguno"}; ` +
          `radio ${[...visto.radio].join(" | ") || "nada"}; perdido ${visto.perdido}`,
      );
    },
  };
}
