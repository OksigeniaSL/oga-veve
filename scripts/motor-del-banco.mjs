/**
 * **El motor del banco**: en marcha cuando hace falta, y vigilado mientras se
 * mide.
 *
 * Doce bancos lo arrancaban con la tecla, `page.keyboard.press("i")`, y seguían
 * sin mirar si había arrancado. Desde que a un reactor lo saca un tractor (ADR
 * 0025), en un puesto de pasarela la llave sin baliza suena a «así no» y no
 * hace nada; y colocar el avión en el aire quita el tractor, pero el motor se
 * queda como estaba. Así que el banco medía **un planeo**: con el gas puesto,
 * el automático enganchado y el N1 a cero. Y salía en verde, que es lo peor: el
 * del crucero miraba si el N1 se movía, y a cero no se mueve.
 *
 * Tres cosas, y cada banco coge las que le tocan:
 *
 * - **`ponerEnMarcha`**: a mano. Para el que solo necesita tenerlo en marcha,
 *   que es casi siempre —se coloca en el aire y se mide otra cosa—.
 * - **`arrancarConLaLlave`**: como quien juega, con sus teclas y su orden —la
 *   baliza, la llave para pedir el empuje y, empujando, la llave para arrancar;
 *   donde no hay tractor, la llave y ya—. Para el que mira la llave.
 * - **`vigilarElMotor`** y **`loDelMotor`**: mientras está en el aire, cada
 *   quinto de segundo se apunta si va en marcha. El banco que mide en vuelo lo
 *   pide al acabar y **falla si el motor se paró**, o si no llegó a volar: una
 *   vigilancia que no vio nada no dice que todo fuera bien.
 *
 * Los que van de otra cosa —el planeo sin combustible— no vigilan.
 */

/** Con qué régimen se da por parado, en tanto por ciento. El ralentí de cualquiera pasa de ahí. */
const PARADO = 5;

/**
 * **A mano, y comprobado.** Donde esté: en el puesto —con el tractor o sin él— o
 * en el aire. Colocar el avión no lo toca; `o.reiniciar()` sí, que vuelve al
 * puesto y lo apaga: después hay que volver a ponerlo.
 *
 * Y antes de colocarlo, no después: con el motor parado y quieto, el suelo que
 * se asienta al abrir devuelve el avión a su puesto (`recolocarTrasElMoldeado`).
 *
 * **Con una tecla, aunque no haga falta para el motor**: la «i» de antes era
 * también el primer gesto de la página, y sin él el audio no despierta ni baja
 * el pack de voz (`firstGesture` en `game.ts`): el banco mediría una
 * conversación muda. Mayúsculas, que no hace nada. Ver `verificar-tormenta.mjs`.
 */
export async function ponerEnMarcha(page) {
  await page.keyboard.press("Shift");
  const puesto = await page.evaluate(() => {
    const c = globalThis.__oga.controles();
    c.engineOn = true;
    return c.engineOn;
  });
  if (!puesto) throw new Error("el motor no se puso en marcha");
}

/** Cómo está el motor ahora, y el tractor si lo hay. */
export const comoEstaElMotor = (page) =>
  page.evaluate(() => {
    const o = globalThis.__oga;
    const r = o.inicio?.()?.remolque ?? null;
    return {
      motor: o.controles().engineOn,
      tractor: r && r.fase !== "libre" ? r.fase : null,
      baliza: !!r?.baliza,
      fase: o.fase(),
    };
  });

/**
 * **Como quien juega**: con las teclas y en su orden. Devuelve lo que hizo, en
 * una línea, o `null` si a los `tope` segundos no había arrancado —con el motor
 * parado no hay banco que valga, y quien llama lo da en rojo—.
 *
 * Con el tractor enganchado: la baliza con la coma, la llave para pedir el
 * empuje y, en cuanto echa a andar, la llave otra vez.
 */
export async function arrancarConLaLlave(page, tope = 60) {
  const pasos = [];
  let pedido = false;
  for (const hasta = Date.now() + tope * 1000; Date.now() < hasta; ) {
    const e = await comoEstaElMotor(page);
    if (e.motor) return pasos.join(" → ") || "ya estaba en marcha";
    if (e.tractor === "enganchado") {
      if (!e.baliza) {
        await page.keyboard.press("Comma");
        pasos.push("la baliza");
      } else if (!pedido) {
        await page.keyboard.press("KeyI");
        pasos.push("la llave: el tractor");
        pedido = true;
      }
    } else {
      await page.keyboard.press("KeyI");
      pasos.push(e.tractor ? "empujando, la llave" : "la llave");
    }
    await page.waitForTimeout(700);
  }
  return null;
}

/**
 * Empieza a vigilar el motor en esa página, o empieza de cero si ya se vigilaba.
 * Solo apunta en el aire: en el puesto y rodando, parado es lo normal.
 */
export const vigilarElMotor = (page) =>
  page.evaluate(async () => {
    const { regimen } = await import("/src/ui/cuadro.ts");
    const o = globalThis.__oga;
    const j = o.juegoParaTrazas();
    clearInterval(globalThis.__vigilaElMotor?.cada);
    const v = { muestras: 0, paradas: 0, primera: null, n1Min: Infinity, n1Max: -Infinity, cada: 0 };
    globalThis.__vigilaElMotor = v;
    v.cada = setInterval(() => {
      const s = o.estado();
      // Volando de verdad: recién colocado en el puesto hay un momento en que «en el suelo» no está puesto.
      if (s.onGround || !(s.heightAboveGround > 10)) return;
      const c = j.input.controls;
      const n1 = 100 * regimen(j.aircraft, j.flight.gasDelMotor?.() ?? c.throttle, c.engineOn);
      v.muestras++;
      v.n1Min = Math.min(v.n1Min, n1);
      v.n1Max = Math.max(v.n1Max, n1);
      const todos = j.flight.motoresAhora?.().every((m) => m === "marcha") ?? true;
      if (c.engineOn && todos) return;
      v.paradas++;
      v.primera ??= `a ${Math.round(s.position.y)} m y ${Math.round(s.airspeed)} m/s, con el gas a ${c.throttle.toFixed(2)}`;
    }, 200);
  });

/**
 * Lo vigilado hasta ahora, y deja de vigilar: si el motor estuvo en marcha en
 * todo lo volado, y el detalle para la comprobación.
 */
export async function loDelMotor(page) {
  const v = await page.evaluate(() => {
    const v = globalThis.__vigilaElMotor;
    if (!v) return null;
    clearInterval(v.cada);
    globalThis.__vigilaElMotor = null;
    return { muestras: v.muestras, paradas: v.paradas, primera: v.primera, n1Min: v.n1Min, n1Max: v.n1Max };
  });
  if (!v || !v.muestras) return { ok: false, detalle: "no se vio volar ni un momento: no se sabe", ...(v ?? {}) };
  const ok = v.paradas === 0 && v.n1Min > PARADO;
  const n1 = `N1 de ${v.n1Min.toFixed(0)} a ${v.n1Max.toFixed(0)}`;
  return {
    ok,
    detalle: ok
      ? `${n1}, en ${v.muestras} muestras volando`
      : `MOTOR PARADO en ${v.paradas} de ${v.muestras} muestras volando, ${v.primera ?? "sin régimen"} · ${n1}`,
    ...v,
  };
}

/** Cómo se llama la comprobación, igual en todos. */
export const EN_MARCHA = "el motor, en marcha mientras se mide en vuelo";
