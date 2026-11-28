/**
 * **Las tomas largas que se dejan volando**, y si en ellas sonó «frená» (H109).
 *
 * Con la toma larga propuesta —«así no, nos vamos al aire»—, quien mete gas
 * puede rozar la pista mientras los motores cogen empuje, y el juego le decía
 * «frená» un segundo después: dos órdenes contrarias para un suceso. Esto
 * cuenta las propuestas que acaban en el aire y las voces de «frená» que
 * caen entre la propuesta y la subida.
 *
 * **Y la ida al aire puede pasar por «abandonando».** La primera versión de
 * esta cuenta descartaba la propuesta si «abandonando» venía antes que «en
 * vuelo», para no contar como ida al aire la toma que acaba en la salida y
 * el despegue del tramo siguiente. Pero el 747 del banco en Los Rodeos, en la
 * ronda de la tanda 33, rozó la pista a 615 m, metió gas y pasó dos segundos
 * en «abandonando» —a 75 m/s, dos metros por encima de las ruedas y ya fuera
 * del rectángulo de la pista— antes de «en vuelo»: el banco dijo que no se
 * había medido nada con una ida al aire delante. Lo que separa una toma de
 * la otra es otra cosa: la que se queda en tierra pasa por la plataforma, el
 * puesto o el punto de espera antes de volver a volar. Entre la propuesta y
 * la subida de una ida al aire solo caben la final, la pista y su salida.
 *
 * @param {{ t: number, clave: string }[]} oido      las voces de la toma, con el reloj del banco
 * @param {{ t: number, fase: string }[]} hitos       los cambios de fase, en segundos enteros
 * @returns {{ idas: number, rozando: number, porLaSalida: number, contrarias: string[] }}
 */
export function laTomaQueSeDejaVolando(oido, hitos) {
  const contrarias = [];
  let idas = 0;
  let rozando = 0;
  let porLaSalida = 0;
  for (const p of oido.filter((x) => /^vuelo\.tomaLarga(?:SinPista)?$/.test(x.clave))) {
    // Medio segundo antes: los hitos van redondeados al segundo.
    const desde = p.t - 0.5;
    const sube = hitos.find((h) => h.t >= desde && h.fase === "en-vuelo");
    if (!sube) continue;
    const entre = hitos.filter((h) => h.t >= desde && h.t < sube.t);
    if (entre.some((h) => !DE_LA_IDA_AL_AIRE.has(h.fase))) continue;
    idas++;
    if (entre.some((h) => h.fase === "aterrizado")) rozando++;
    if (entre.some((h) => h.fase === "abandonando")) porLaSalida++;
    for (const x of oido)
      if (x.clave === "vuelo.aterrizado" && x.t >= p.t && x.t <= sube.t + 0.5)
        contrarias.push(`${p.t}s ${p.clave}, ${x.t}s «frená» y al aire a los ${sube.t}s`);
  }
  return { idas, rozando, porLaSalida, contrarias };
}

/** Las fases que caben entre «así no, nos vamos al aire» y la subida. */
const DE_LA_IDA_AL_AIRE = new Set(["final", "aterrizado", "abandonando"]);
