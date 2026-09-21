/**
 * Por dónde escucha de verdad el servidor de pruebas.
 *
 * Cada banco levanta su propio Vite en un puerto escrito a mano —uno distinto
 * por banco, para poder correr varios a la vez— y después navegaba a ese
 * mismo número. El fallo está en el «después»: **si el puerto está ocupado,
 * Vite se muda al siguiente libre sin decir nada**, y entonces el navegador
 * entra en el servidor de otro, o en un desarrollo que quedó abierto, o en
 * nada. Lo que se ve no es un error: es un informe que sale vacío o, peor, un
 * informe de otro escenario.
 *
 * Se arregló una vez en `verificar-vuelo-entero.mjs`, contando el mismo
 * síntoma —«sin parte»— y estaba igual en los veinticinco bancos restantes.
 * Una corrección que hay que repetir veinticinco veces estaba en el sitio
 * equivocado, así que ahora vive aquí y la usan todos.
 */

/**
 * La dirección del servidor ya levantado, sin la barra del final.
 *
 * Y con un aviso por consola si no es la que se pidió: que el puerto estuviera
 * ocupado no es un error —el banco funciona igual— pero **hay que saberlo**,
 * porque casi siempre significa que quedó algo corriendo de antes.
 */
export function baseDe(server, puerto) {
  const base = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
  if (!base) throw new Error("el servidor de pruebas no dijo por dónde escucha");
  if (puerto !== undefined && !base.endsWith(`:${puerto}`))
    console.log(`  (el ${puerto} estaba ocupado: se usa ${base})`);
  return base;
}
