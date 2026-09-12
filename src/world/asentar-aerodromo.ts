/**
 * Sube el aeródromo hasta quedar justo por encima de la fotografía.
 *
 * Se mide, no se supone: se cata la foto en un enjambre de puntos repartidos
 * por la pista, las calles y las plataformas, y se coge el **percentil
 * noventa** de lo que sobresale. No la media —que deja medio aeródromo por
 * debajo— y no el máximo, que lo levantaría por culpa de una farola o de un
 * avión aparcado que la limpieza de bultos no cazó.
 *
 * ## Por qué vive aquí y no en `game.ts`
 *
 * Trescientas veintiséis líneas que solo tocan tres cosas —el escenario, el
 * terreno y las teselas— y ninguna de ellas es el vuelo. Es construcción de
 * mundo: se ejecuta una vez al montar el aeródromo y no vuelve a mirar a nadie.
 * Segundo corte de #30, y de los baratos: no hay decisión que tomar, solo un
 * trozo que estaba en el sitio equivocado.
 *
 * Devuelve **cuánto hubo que subirlo sobre el datum**, o `null` si aquí no hay
 * foto que respetar —un aeródromo sin ortofoto, o el mundo dibujado—, que es
 * distinto de haberlo subido cero.
 */
import type { Scenario } from "./scenarios";
import type { Terrain } from "./terrain";
import type { Teselas } from "./teselas";

export function asentarAerodromoSobreLaFoto(
  scenario: Scenario,
  terrain: Terrain,
  teselas: Teselas | null,
): number | null {
  const aero = scenario.aerodrome;
  if (!aero || !teselas) return null;
  const datum = teselas.desfase ?? 0;

  /*
   * **El perfil de la pista, sacado de la propia fotografía.**
   *
   * Se cata el eje cada cien metros y se suaviza con una media móvil de siete
   * catas —setecientos metros—, que es lo que separa la rasante de verdad del
   * ruido de la rejilla.
   *
   * Es el término medio entre los dos extremos que fallaron. Una recta entre
   * las cotas de los umbrales no sigue la pista: en Tenerife Norte se aparta
   * más de metro y medio en la sexta parte de los puntos, y taparla obligaba
   * a levantar el aeródromo dos metros, con su escalón en el filo del
   * asfalto. Y la superficie cruda de la foto sigue la pista demasiado bien:
   * conserva saltos de metros entre nudos y el avión sale despedido rodando
   * —medido, seiscientos cincuenta y seis de cada novecientos fotogramas en
   * el aire en Asunción—.
   *
   * Una curva lisa que sí sube y baja con la pista no tiene ninguno de los
   * dos problemas.
   */
  const perfilDeLaFoto = ((): ((t: number) => number) | null => {
    const pista = aero.runways[0];
    const umbrales = pista
      ? Object.values(pista.thresholds).filter(
          (u): u is NonNullable<typeof u> => !!u?.xy,
        )
      : [];
    const a = umbrales[0]?.xy;
    const b = umbrales[1]?.xy;
    if (!pista || !a || !b) return null;
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const catas = Math.max(8, Math.round(largo / 100));

    /*
     * **Se cata sobre el eje de OpenStreetMap, no sobre la recta que une los
     * umbrales.** Son dos rectas parecidas y no la misma, y la diferencia son
     * metros: catando la segunda se cae fuera del asfalto y se mide el arcén,
     * que baja. El primer intento salió con la fotografía medio metro por
     * encima de nuestra pista —un hundimiento donde antes había un escalón—
     * y la causa era ésta.
     *
     * Es la cuarta vez esta semana que dos ejes parecidos se llevan algo por
     * delante: el eje discontinuo, las luces de cabecera, el designador, y
     * ahora la rasante.
     */
    const eje = pista.centerline;
    const largoEje = (() => {
      let d = 0;
      for (let i = 0; i < eje.length - 1; i++) {
        d += Math.hypot(
          eje[i + 1]![0] - eje[i]![0],
          eje[i + 1]![1] - eje[i]![1],
        );
      }
      return d;
    })();
    const sobreElEje = (d: number): [number, number] | null => {
      let visto = 0;
      for (let i = 0; i < eje.length - 1; i++) {
        const [ax, ay] = eje[i]!;
        const [bx, by] = eje[i + 1]!;
        const l = Math.hypot(bx - ax, by - ay);
        if (l < 0.001) continue;
        if (visto + l >= d) {
          const k = (d - visto) / l;
          return [ax + (bx - ax) * k, ay + (by - ay) * k];
        }
        visto += l;
      }
      return null;
    };
    // Dónde caen los dos umbrales sobre ese eje: las marcas van de umbral a
    // umbral, y el eje del fichero es más largo que la pista.
    const alLargo = (p: readonly [number, number]): number => {
      let visto = 0;
      let mejor = 0;
      let cerca = Infinity;
      for (let i = 0; i < eje.length - 1; i++) {
        const [ax, ay] = eje[i]!;
        const [bx, by] = eje[i + 1]!;
        const l = Math.hypot(bx - ax, by - ay) || 1;
        const k = Math.max(
          0,
          Math.min(
            1,
            ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / (l * l),
          ),
        );
        const d = Math.hypot(
          ax + (bx - ax) * k - p[0],
          ay + (by - ay) * k - p[1],
        );
        if (d < cerca) {
          cerca = d;
          mejor = visto + k * l;
        }
        visto += l;
      }
      return mejor;
    };
    const dA = alLargo(a);
    const dB = alLargo(b);
    void largoEje;

    const crudo: (number | null)[] = [];
    for (let i = 0; i <= catas; i++) {
      const t = i / catas;
      const p = sobreElEje(dA + (dB - dA) * t);
      crudo.push(p ? teselas!.alturaEn(p[0], -p[1]) : null);
    }
    if (crudo.filter((c) => c !== null).length < catas * 0.6) return null;

    // Los huecos se rellenan con el vecino: una cata perdida no puede abrir
    // un agujero en la rasante.
    for (let i = 0; i < crudo.length; i++) {
      if (crudo[i] !== null) continue;
      const antes = crudo
        .slice(0, i)
        .reverse()
        .find((c) => c !== null);
      const despues = crudo.slice(i + 1).find((c) => c !== null);
      crudo[i] = (antes ?? despues ?? null) as number | null;
    }

    const VENTANA = 3;
    const liso = crudo.map((_, i) => {
      let suma = 0;
      let n = 0;
      /*
       * **La ventana encoge en los bordes, no repite la muestra del filo.**
       *
       * Antes se pinzaba el índice, así que en las siete últimas catas se
       * contaba siete veces la misma cota: la del final de la pista. En una
       * pista que baja diecisiete metros de una cabecera a la otra eso tira
       * del perfil **hacia arriba** justo donde el terreno sigue cayendo, y
       * nuestro asfalto emerge de la fotografía con su pared y todo.
       *
       * La firma era inconfundible: «ocurre en el último kilómetro». Una
       * media móvil que pinza los extremos siempre falla en los extremos.
       */
      for (let k = -VENTANA; k <= VENTANA; k++) {
        const j = i + k;
        if (j < 0 || j >= crudo.length) continue;
        const v = crudo[j];
        if (v !== null && v !== undefined) {
          suma += v;
          n++;
        }
      }
      return n ? suma / n : 0;
    });

    return (t: number): number => {
      const f = Math.max(0, Math.min(catas - 0.001, t * catas));
      const i = Math.floor(f);
      return liso[i]! + (liso[i + 1]! - liso[i]!) * (f - i);
    };
  })();
  /*
   * Primero, liso y con el datum. A partir de aquí `sampleHeight` en el
   * aeródromo es nuestra superficie, y ya se puede comparar con la foto.
   *
   * **Y liso de verdad, no la forma de la foto alisada.** Se probó lo otro
   * —conservar la pendiente real de la fotografía y quitarle solo los
   * escalones— porque deja el aeródromo dos metros más bajo y sin escalón en
   * el filo del asfalto. Medido rodando quince segundos:
   *
   *   perfil recto        · Tenerife  26 de 900 fotogramas en el aire
   *   forma de la foto    · Tenerife 312, **Asunción 656**
   *
   * Asunción pasaba de cero a seiscientos cincuenta y seis. Por muy alisada
   * que esté, una superficie fotogramétrica sobre una rejilla de cincuenta y
   * siete metros conserva variación de metros, y el avión sale despedido a
   * cada paso. El escalón es un problema de aspecto; esto es un problema de
   * jugar, y gana el de jugar.
   */
  // Con perfil de la foto el datum ya está dentro de las catas; sin él, hay
  // que sumarlo a mano porque las cotas de los umbrales van sobre el mar.
  terrain.reasentarAerodromo(
    scenario,
    perfilDeLaFoto ? 0 : datum,
    perfilDeLaFoto,
  );

  const puntos: [number, number][] = [];
  const pista = aero.runways[0];
  if (pista) {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const a = pista.centerline[0]!;
      const b = pista.centerline[pista.centerline.length - 1]!;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      for (const lado of [-15, 0, 15]) puntos.push([x + lado, -(y + lado)]);
    }
  }
  /*
   * **Solo el eje de la pista.** Ni plataformas ni calles de rodaje.
   *
   * Una plataforma tiene aviones aparcados, pasarelas y farolas, y la foto
   * los trae con su volumen: catar ahí no mide el desajuste del suelo, mide
   * la altura de un Boeing. Con las calles pasa lo mismo un nivel más abajo
   * —pasan pegadas a hangares y el rayo devuelve el tejado—, y se vio igual:
   * el percentil se quedaba clavado en el tope aunque la forma ya fuera la de
   * la foto.
   *
   * El eje de una pista es lo único de un aeropuerto donde se puede
   * garantizar que no hay nada encima. Es la única cata que no miente.
   */

  const sobresale: number[] = [];
  for (const [x, z] of puntos) {
    const foto = teselas.alturaEn(x, z);
    if (foto === null) continue;
    sobresale.push(foto - terrain.sampleHeight(x, z));
  }
  if (sobresale.length < 20) return null;
  sobresale.sort((a, b) => a - b);
  // El percentil noventa y cinco: ahora que la forma es la de la foto, lo
  // que queda por tapar es su rugosidad y no la diferencia con una recta.
  // Se puede ser exigente sin que el número se dispare.
  const p85 = sobresale[Math.floor(sobresale.length * 0.95)]!;

  /*
   * **Con tope de metro y medio**, y el tope no es prudencia: es la lección.
   *
   * El primer intento usaba el percentil noventa sin tope y subió Tenerife
   * Norte **cuatro metros**, porque entre las catas cayó algo de veintitrés
   * —un edificio, una torre, lo que fuera— y el percentil se lo tragó. Con
   * eso la pista quedaba flotando cuatro metros y medio sobre la fotografía,
   * que es un escalón que se ve desde el aire.
   *
   * Este alzado está para salvar la rugosidad que le queda a la fotografía
   * después de alisarla —decímetros—, no para salvar un edificio. Si hace
   * falta más de metro y medio, lo que hay debajo no es suelo y taparlo
   * subiendo el aeropuerto entero sería el remedio equivocado.
   *
   * Los quince centímetros de holgura son menos que el grosor de la pintura
   * y no se ven.
   */
  /*
   * **El tope no baja aunque el perfil salga de la fotografía.**
   *
   * Se probó bajarlo a medio metro, con el argumento de que siguiendo ya la
   * forma de la foto lo único que queda por tapar es su rugosidad. Medido:
   * el aeródromo quedaba **sesenta centímetros por debajo** de la foto. El
   * escalón cambiaba de signo y se convertía en un hundimiento, que es el
   * lado malo — entre ver el filo del asfalto y que la pista se te trague, se
   * ve el filo.
   */
  const tope = 1.5;
  const alzado =
    (perfilDeLaFoto ? 0 : datum) + Math.min(tope, Math.max(0, p85)) + 0.15;
  terrain.reasentarAerodromo(scenario, alzado, perfilDeLaFoto);
  terrain.rehacerAerodromo(scenario);

  /*
   * **Y se apaga el hormigón de las plataformas, que aquí el argumento se da
   * la vuelta.**
   *
   * En la pista aportamos pintura nítida sobre una ortofoto borrosa, y por
   * eso nuestro asfalto se queda. En la plataforma no aportamos nada: es una
   * losa de color plano sobre un sitio donde la fotografía tiene terminal,
   * pasarelas, aviones aparcados y sus marcas. Y como el aeródromo va subido
   * para no hundirse en la foto, esa losa además entierra metro y medio de
   * todo lo que hay debajo.
   *
   * Se vio jugando en Tenerife Norte y la descripción fue exacta: «ha caído
   * la del pulpo sobre Los Rodeos y tenemos todas las aeronaves sepultadas
   * bajo un lodazal».
   *
   * El suelo no se toca: el avión sigue rodando sobre nuestra superficie
   * lisa. Lo que se quita es la manta.
   *
   * Va aquí y no en `apagarElMundoDeMentira` porque el aeródromo se acaba de
   * reconstruir en la línea de arriba, y la reconstrucción se lleva por
   * delante cualquier cosa que se hubiera apagado antes.
   */
  /*
   * **Sobre la fotografía, la pista es la de la fotografía.**
   *
   * Empezó apagando solo el hormigón de las plataformas, porque una losa de
   * color plano sobre una terminal fotografiada era «la del pulpo sobre Los
   * Rodeos». El resto se dejaba con el argumento de que nuestra pista es
   * nítida y la de la foto no. Jugando se vio que ese argumento no se
   * sostiene: la foto de Tenerife Norte trae la 12/30 **con sus marcas de
   * verdad**, y lo que hacíamos era taparla con una losa nuestra, más
   * oscura, descentrada y metro y medio en el aire — con su pared y todo.
   * «Asfalto mezclado con tierra marrón.» «Ocurre en el último kilómetro.»
   *
   * Así que sobre la foto se apaga todo lo que la foto ya trae: el asfalto,
   * las cintas de rodadura, el eje, las teclas de piano, el designador y el
   * amarillo de las calles.
   *
   * **Y se queda lo que la foto no trae**, que es justo lo que enseña:
   *
   *   las luces         · borde, umbral, aproximación y PAPI
   *   las letras        · las de la foto no se leen desde el aire
   *   la raya verde     · la ruta, que es del juego y no del aeropuerto
   *   las mangas        · el viento de hoy, no el del día de la foto
   *
   * El suelo no se toca: el avión sigue rodando sobre nuestra superficie
   * lisa. Lo que se quita es la manta, y ahora entera.
   *
   * En el mundo dibujado no se apaga nada: allí no hay foto que respetar y
   * nuestra pista es la única que hay.
   */
  const DE_LA_FOTO = new Set([
    "pavimento:asphalt",
    "pavimento:rodadura",
    "pavimento:concrete",
    "pintura",
    "designador",
    "amarillo",
  ]);
  terrain.group.getObjectByName(`aerodromo:${aero.id}`)?.traverse((o) => {
    if (DE_LA_FOTO.has(o.name)) o.visible = false;
  });
  return alzado - (perfilDeLaFoto ? 0 : datum);
}
