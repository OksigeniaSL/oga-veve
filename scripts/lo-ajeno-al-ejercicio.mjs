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
 * y su frase, que sin torre la dice la instructora) vale siempre.
 */

/** Lo de seguridad, que sale aunque no sea del ejercicio: el tráfico cerca. */
const DE_SEGURIDAD = /trafico|traffic/i;

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
    async comprobar(page, comprobar, propias) {
      const dicho = await page.evaluate(() => globalThis.__oga.dichoTodo());
      const ajeno = Object.entries(dicho).flatMap(([quien, claves]) =>
        claves
          .filter((c) => !(quien === "instructor" && (/^ejercicio\./.test(c) || DE_SEGURIDAD.test(c))))
          .map((c) => `${quien}: ${c}`),
      );
      comprobar(
        "no se oye nada que no sea del ejercicio o de seguridad",
        ajeno.length === 0,
        ajeno.slice(0, 6).join(" | ") || `la instructora, ${dicho.instructor?.length ?? 0} frases del ejercicio`,
      );
      const tarjetas = [...visto.tarjetas];
      const ajenas = tarjetas.filter((t) => !propias.test(t) && !/^cerca-/.test(t));
      const rotulos = [...visto.rotulos];
      comprobar(
        "ni se ve: solo sus tarjetas, sin rótulo, sin tira de la radio y sin la flecha de casa latiendo",
        ajenas.length === 0 && rotulos.length === 0 && visto.radio.size === 0 && !visto.perdido,
        `tarjetas ${tarjetas.join(", ") || "ninguna"}; rótulos ${rotulos.join(" | ") || "ninguno"}; ` +
          `radio ${[...visto.radio].join(" | ") || "nada"}; perdido ${visto.perdido}`,
      );
    },
  };
}
