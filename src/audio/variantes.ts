/**
 * Otras maneras de decir lo mismo.
 *
 * Un aviso que suena igual la vigésima vez deja de ser un aviso y pasa a ser
 * un ruido de fondo: el oído lo reconoce antes de entenderlo y lo aparta. Con
 * una voz grabada se nota más que con la del navegador, porque es siempre
 * exactamente el mismo fichero.
 *
 * Así que algunas frases tienen dos o tres formas, y al decirlas se elige una.
 *
 * ## Y hay frases que **no** pueden tener variantes
 *
 * La fraseología de aviación se dice tal cual. `cleared to land` es
 * `cleared to land` y no «podés aterrizar cuando quieras»: media docena de
 * frases fijas, iguales en todo el mundo y en todos los idiomas, son la razón
 * de que una torre y un piloto que no comparten idioma se entiendan. Cambiarlas
 * por sinónimos aquí sería enseñar justo lo contrario de lo que enseñan.
 *
 * Por eso esto es una **lista corta y escrita a mano**, y no una regla que se
 * aplique a todo: las que están, están porque alguien decidió que esa concreta
 * admite decirse de otra forma.
 *
 * ## Cómo casa con las grabaciones
 *
 * La primera forma es la que vive en `i18n`, y su grabación se llama como la
 * clave. Las demás se graban como `<clave>~2`, `<clave>~3`… y el guion de las
 * frases las saca de aquí, así que añadir una variante es escribirla y volver
 * a grabar: no hay una segunda lista que mantener.
 *
 * Y se elige **una vez por aviso**, no una para la pantalla y otra para la
 * voz: si no, el cartel diría una cosa y el instructor otra.
 */

import { t, type TranslationKey } from "../i18n";

/**
 * Las otras formas, sin contar la que ya está en `i18n`.
 *
 * En español paraguayo, que es el idioma del producto. Las variantes no se
 * traducen a los otros idiomas todavía: en inglés y en guaraní se dice la de
 * siempre, que es lo que hay grabado.
 */
export const VARIANTES: Partial<Record<TranslationKey, readonly string[]>> = {
  /*
   * **La frustrada.** Es el aviso que más se repite de los que importan —una
   * de cada cuatro aproximaciones acaba así, y quien practica aterrizajes hace
   * veinte seguidas— y es además el que peor entra: hay que entenderlo
   * mientras se está bajando y decidiendo.
   *
   * Las tres dicen lo mismo en el mismo orden: **qué hacer primero** —gas y
   * subir— y **qué se abandona**. Jugando se pidió justo eso: «algo del tipo,
   * volvemos al aire, gas y aire, abandoná la maniobra de aterrizaje».
   */
  "vuelo.mandanFrustrar": [
    "¡Hay alguien en la pista! Gas, subí y dejá el aterrizaje",
    "No podés bajar: metele gas y volvé a subir",
  ],
  /*
   * **Y ninguna dice «no entra».**
   *
   * Decía «Así no entra: gas y al aire», y se entendió como que el avión no
   * cabía en la pista: «"así no entra" con 3400 m de pista y la velocidad al
   * mínimo». Con un 747 delante y una pista larguísima, eso es una acusación
   * falsa y además desconcertante — el avión cabe de sobra; lo que no va a
   * salir es **esta** aproximación.
   *
   * Lo que hay que decir es que venís mal, no que no quepas.
   */
  "vuelo.noEstabilizada": [
    "Venís mal para bajar: gas y al aire, lo probamos otra vez",
    "Dejá el aterrizaje. Gas, subí, y volvemos a intentarlo",
  ],
  "vuelo.frustrada": [
    "Muy bien: irse al aire también es volar bien",
    "Eso estuvo bien. Damos otra vuelta y volvemos",
  ],
  "vuelo.puedeVolver": ["La pista quedó libre: podés volver a bajar"],

  /*
   * **Y los avisos de senda**, que salen varias veces en cada aproximación.
   * Son los que más cansan de oír repetidos, y los que menos se pueden callar:
   * si no se dicen, no se aprende a corregir.
   *
   * **Y hablan como habla una persona, no como una máquina de aros.** Quien lo
   * jugó pidió esto con todas las letras: «más natural, que me diga que baje,
   * que estoy alto y así, como diría una instructora». Así que ninguna nombra
   * el aro: nombran **la pista**, que es lo que se está mirando, y dicen qué
   * hacer. Un aro es el dibujo con el que el juego lo enseña; lo que se corrige
   * es la altura para la pista.
   *
   * Cuatro formas de cada una, que es lo que separa a alguien que te acompaña
   * de un aviso grabado. Salen tres o cuatro veces por aproximación.
   */
  /*
   * **La llegada de la comandante, que es el único sitio del juego donde una
   * variante existe para hacer gracia y no para no cansar.**
   *
   * Todas nombran el aeropuerto —eso no es adorno, es lo que convierte la
   * frase en una llegada— y todas cierran distinto. Pedido jugando: «algún
   * chascarrillo o algo simpático de la comandante, pero sin repetir el
   * chiste».
   *
   * Un chiste que sale siempre deja de ser un chiste a la segunda vez, y a la
   * quinta es el ruido de fondo del que habla la cabecera de este fichero. Con
   * cinco cierres, aterrizar once veces en once campos no suena nunca igual.
   *
   * Y una de ellas aplaude a quien acaba de aterrizar, que a los cuatro años
   * es media razón para volver a jugar.
   */
  "comandante.llegada": [
    "Señores pasajeros, acabamos de llegar a {campo}. Gracias por acompañarnos, y no se olviden nada en el bolsillo del asiento.",
    "Bienvenidos a {campo}. De parte de toda la tripulación, muchas gracias — y un aplauso para quien iba a los mandos.",
    "Señores pasajeros, ya estamos en {campo}. Cuidado al abrir los compartimentos, que en el vuelo las cosas se mudan de sitio.",
    "Bienvenidos a {campo}. Gracias por volar con nosotros; la próxima vez les guardamos la ventanilla.",
    "Señores pasajeros, {campo}. Gracias por venir, y que sigan teniendo un lindo día allá abajo.",
  ],
  /*
   * ── **Y cinco por aeropuerto, no una** ─────────────────────────────────
   *
   * La de arriba, la genérica, ya tenía cinco formas. Pero el juego prefiere
   * siempre la propia del campo cuando existe —y existe en los diecisiete—,
   * así que aterrizar en Los Rodeos sonaba **siempre igual**. Contado
   * jugando: «más variedad de frases de la comandante al aterrizar en
   * aeropuertos, que no siempre diga lo mismo, unas 5 frases por aeropuerto
   * que se lancen de manera aleatoria para que parezca que no es una voz
   * grabada ni una comandante poco original».
   *
   * Cada una es una **grabación entera**, porque la comandante dice el nombre
   * del sitio y eso no se monta con piezas: son sesenta y ocho ficheros
   * nuevos. Hasta que se graben, las cuatro nuevas de cada campo las dice la
   * voz del navegador; el guion de frases las recoge solo desde aquí.
   *
   * Y todas dicen algo **cierto** del sitio, que es la regla de la casa: quien
   * lo oiga acá tiene que reconocerlo el día que lo vea.
   */
  "comandante.llegada.pettirossi": [
    "Bienvenidos a Asunción. Este campo está en Luque, así que técnicamente todavía no llegaron a la capital: les falta un puente. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en Asunción. Si van para el centro, el río Paraguay les va a quedar a la derecha todo el camino. Gracias por acompañarnos.",
    "Bienvenidos a Asunción. Silvio Pettirossi hacía acrobacias cuando volar era todavía cosa de valientes; nosotros hoy lo hicimos tranquilo. Gracias por venir.",
    "Señores pasajeros, Asunción. Acá al lado está el Ñu Guasú, que de arriba se ve verde y de abajo también. Gracias por volar con nosotros.",
  ],
  "comandante.llegada.guarani": [
    "Señores pasajeros, bienvenidos a Ciudad del Este. Acá cerca el Paraná mueve una de las represas más grandes del mundo. Gracias por acompañarnos.",
    "Bienvenidos a Ciudad del Este. Desde este campo, cruzando el Puente de la Amistad, se está en Brasil en diez minutos. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en Ciudad del Este. Si oyen un ruido de fondo que no es el motor, son las cataratas. Gracias por venir.",
    "Bienvenidos a Ciudad del Este, en Alto Paraná. Tres países se tocan acá al lado, y cada uno con su bandera en la punta. Gracias por acompañarnos.",
  ],
  "comandante.llegada.encarnacion": [
    "Bienvenidos a Encarnación. Enfrente, al otro lado del Paraná, ya es Argentina: el puente se ve desde la ventanilla. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en Encarnación. A media hora de acá están las ruinas de Trinidad, que llevan ahí desde antes que existiera el avión. Gracias por venir.",
    "Bienvenidos a Encarnación, la perla del sur. Acá la playa es de río, y no por eso es menos playa. Gracias por acompañarnos.",
    "Señores pasajeros, Encarnación. Bajen despacio la escalera, que después del carnaval las piernas no siempre responden. Gracias por volar con nosotros.",
  ],
  "comandante.llegada.estigarribia": [
    "Señores pasajeros, bienvenidos a Mariscal Estigarribia. Esta pista mide más de tres kilómetros: sobra avión para lo que sobra asfalto. Gracias por acompañarnos.",
    "Bienvenidos a Mariscal Estigarribia. Acá en el Chaco el aire se mueve poco y calienta mucho; tomen agua. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en el Chaco Boreal. Desde acá hasta la próxima esquina hay más kilómetros que casas. Gracias por venir.",
    "Bienvenidos a Mariscal Estigarribia. Al norte están las colonias, al sur el camino, y en medio esto: sitio. Gracias por acompañarnos.",
  ],
  "comandante.llegada.pedro-juan": [
    "Bienvenidos a Pedro Juan Caballero. Si cruzan la avenida, ya están en Ponta Porã y en otro país, sin mostrar nada. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en Amambay. Acá los cerros se levantan de golpe en medio del campo, como si los hubieran puesto a mano. Gracias por venir.",
    "Bienvenidos a Pedro Juan Caballero. Cerro Corá queda acá cerca, y en ese parque se acabó la Guerra Grande. Gracias por acompañarnos.",
    "Señores pasajeros, Pedro Juan Caballero. Dos países, una calle y un solo aeropuerto: éste. Gracias por volar con nosotros.",
  ],
  "comandante.llegada.yvytu-rape": [
    "Señores pasajeros, estamos en Yvytu Rape. El nombre quiere decir camino del viento, y hoy el viento nos dejó pasar. Gracias por acompañarnos.",
    "Bienvenidos a la pista de la Granja Óga. Cuidado al bajar, que acá el pasto se moja de noche. Gracias por volar con nosotros.",
    "Señores pasajeros, Yvytu Rape. Esto no tiene terminal, ni falta que hace: la casa está a cien metros. Gracias por venir.",
    "Bienvenidos a Yvytu Rape. Si ven animales cerca de la pista, no se preocupen: viven acá y nosotros somos las visitas. Gracias por acompañarnos.",
  ],
  "comandante.llegada.valle-cordillera": [
    "Bienvenidos al Valle de la Cordillera. Estas lomas no son montañas, pero desde el aire disimulan muy bien. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en el valle. Abajo hay río, y el río va para donde quiere. Gracias por venir.",
    "Bienvenidos al Valle de la Cordillera. Acá el verde tiene como seis colores distintos y todos se llaman verde. Gracias por acompañarnos.",
    "Señores pasajeros, el Valle de la Cordillera. Se aterriza mirando al campo, que es la mejor manera de aterrizar. Gracias por volar con nosotros.",
  ],
  "comandante.llegada.chaco": [
    "Señores pasajeros, bienvenidos a la Llanura del Chaco. Acá no hay cuesta ninguna: se mire donde se mire, es recto. Gracias por acompañarnos.",
    "Bienvenidos al Chaco. Si buscan una referencia en el horizonte, la referencia es el horizonte. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en la llanura. De noche acá se ven estrellas que en la ciudad no existen. Gracias por venir.",
    "Bienvenidos a la Llanura del Chaco. Poca gente, mucho bicho y un cielo enorme: eso es todo, y es bastante. Gracias por acompañarnos.",
  ],
  "comandante.llegada.tenerife-norte": [
    "Bienvenidos a Tenerife Norte. Estamos a más de seiscientos metros sobre el mar, así que acá arriba abriga un poco más. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en Los Rodeos. La Laguna queda acá al lado, y su casco viejo es Patrimonio de la Humanidad. Gracias por venir.",
    "Bienvenidos a Tenerife Norte. Durante medio siglo éste fue el único aeropuerto de la isla; el del sur es el hermano pequeño. Gracias por acompañarnos.",
    "Señores pasajeros, Tenerife Norte. Si el Teide se dejó ver en el camino, hoy tuvieron suerte. Gracias por volar con nosotros.",
  ],
  "comandante.llegada.tenerife-sur": [
    "Señores pasajeros, bienvenidos a Tenerife Sur. Este aeropuerto se abrió porque el del norte se llenaba de nubes; acá casi nunca. Gracias por acompañarnos.",
    "Bienvenidos a Tenerife Sur, en Granadilla. Acá al lado, en El Médano, el viento se usa para navegar encima de una tabla. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en el sur de Tenerife. Esa montaña colorada que se ve desde la pista es justo eso: colorada. Gracias por venir.",
    "Bienvenidos a Tenerife Sur. Misma isla que el norte y otro clima: eso también es Canarias. Gracias por acompañarnos.",
  ],
  "comandante.llegada.gran-canaria": [
    "Bienvenidos a Gran Canaria. Este campo lo comparte la aviación civil con una base aérea, así que no se extrañen de los vecinos. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en Gando. Al sur están las dunas de Maspalomas, que son arena de verdad y no de mentira. Gracias por venir.",
    "Bienvenidos a Gran Canaria. A esta isla la llaman un continente en miniatura, y en una hora de coche se entiende por qué. Gracias por acompañarnos.",
    "Señores pasajeros, Gran Canaria. Si se van al centro de la isla, lleven algo de abrigo: allá arriba no es playa. Gracias por volar con nosotros.",
  ],
  "comandante.llegada.lanzarote": [
    "Señores pasajeros, bienvenidos a Lanzarote. Este aeropuerto lleva el nombre de César Manrique, que se pasó la vida peleando para que la isla siguiera pareciéndose a sí misma. Gracias por acompañarnos.",
    "Bienvenidos a Lanzarote. En Timanfaya el suelo todavía está caliente a unos metros de profundidad. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en Lanzarote. Acá las viñas crecen en hoyos cavados en la ceniza, una por hoyo. Gracias por venir.",
    "Bienvenidos a Lanzarote. Los volcanes que ven estuvieron seis años seguidos en erupción, y de eso hace nada: el siglo dieciocho. Gracias por acompañarnos.",
  ],
  "comandante.llegada.fuerteventura": [
    "Bienvenidos a Fuerteventura. Ésta es la isla más vieja del archipiélago: lleva millones de años dejándose gastar por el viento. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en Fuerteventura. Al norte, en Corralejo, hay un desierto de arena que se mueve solo. Gracias por venir.",
    "Bienvenidos a Fuerteventura. Acá hay más cabras que gente, y el queso lo demuestra. Gracias por acompañarnos.",
    "Señores pasajeros, Fuerteventura. Las playas de esta isla se miden en kilómetros, no en metros. Gracias por volar con nosotros.",
  ],
  "comandante.llegada.la-palma": [
    "Señores pasajeros, bienvenidos a La Palma. A esta isla la llaman la isla bonita, y desde el aire no hay mucho que discutir. Gracias por acompañarnos.",
    "Bienvenidos a La Palma. En el centro tiene una caldera enorme, y dentro caben barrancos, bosque y niebla. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en La Palma. Hace poco un volcán cambió el mapa de esta isla; lo que ven es más nuevo que ustedes. Gracias por venir.",
    "Bienvenidos a La Palma. Acá el cielo de noche está protegido por ley, para que se siga viendo. Gracias por acompañarnos.",
  ],
  "comandante.llegada.el-hierro": [
    "Bienvenidos a El Hierro. Es la más pequeña y la más lejana, y llegar acá siempre tiene algo de hazaña. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en El Hierro. Durante siglos los mapas empezaban a contar los grados desde esta isla. Gracias por venir.",
    "Bienvenidos a El Hierro. Acá el viento y el agua le dan luz a la isla entera: se lo inventaron ellos. Gracias por acompañarnos.",
    "Señores pasajeros, El Hierro. Hay sabinas retorcidas por el viento que llevan así cientos de años y no se quejan. Gracias por volar con nosotros.",
  ],
  "comandante.llegada.la-gomera": [
    "Señores pasajeros, bienvenidos a La Gomera. El silbo con el que se hablan acá está reconocido por la Unesco, y no es un juego: es un idioma. Gracias por acompañarnos.",
    "Bienvenidos a La Gomera. Arriba, en Garajonay, hay un bosque de niebla que ya existía cuando Europa era otra cosa. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en La Gomera. De San Sebastián salió Colón para el último viaje antes de América. Gracias por venir.",
    "Bienvenidos a La Gomera. Esta isla es casi toda cuesta, así que lo llano que pisan ahora es raro. Gracias por acompañarnos.",
  ],
  "comandante.llegada.cuatro-vientos": [
    "Bienvenidos a Cuatro Vientos. Acá se vuela desde mil novecientos once, y todavía no se han cansado. Gracias por volar con nosotros.",
    "Señores pasajeros, estamos en Cuatro Vientos. Al lado hay un museo lleno de aviones que ya no vuelan y merecen que se los mire. Gracias por venir.",
    "Bienvenidos a Cuatro Vientos. De este campo salió el avión que cruzó el Atlántico y le puso el nombre al sitio. Gracias por acompañarnos.",
    "Señores pasajeros, Cuatro Vientos. Acá aprenden a volar los que después van a los grandes: buen sitio para aterrizar. Gracias por volar con nosotros.",
  ],
  "vuelo.aroAlto": [
    "Venís un poco alto. Bajá el morro despacito",
    "Estás por encima. Soltá un poquito y vas a ir entrando",
    "Un poco alto para la pista: bajá suave",
  ],
  "vuelo.aroBajo": [
    "Venís bajo. Tirá un poquito y un toque de motor",
    "Estás por debajo: subí despacio, sin pasarte",
    "Un poco bajo para la pista: levantá suave",
  ],

  /*
   * **Y el que dice que lo arreglaste.** Éste lleva variantes por una razón
   * distinta de las demás: no cansa por repetirse, cansa por sonar a premio de
   * máquina. Tres formas de decir «muy bien» se parecen más a una persona.
   */
  "vuelo.corregido": [
    "Muy bien, así venís",
    "Eso. Ahora entrás derechito",
    "Perfecto, quedate así",
  ],
};

/**
 * Cuántas formas tiene una frase, contando la de `i18n`.
 *
 * Lo usa el guion que arma la lista de grabación.
 */
export function cuantasFormas(clave: TranslationKey): number {
  return 1 + (VARIANTES[clave]?.length ?? 0);
}

/**
 * El identificador de grabación de la forma número `n`, empezando en cero.
 *
 * La primera se llama como la clave, para que nada de lo ya grabado cambie de
 * nombre al añadir una variante.
 */
export function idDeLaForma(clave: TranslationKey, n: number): string {
  return n === 0 ? clave : `${clave}~${n + 1}`;
}

/**
 * Una de las formas, al azar, con su identificador de grabación.
 *
 * `azar` se puede pasar para poder comprobarlo sin depender de la suerte.
 */
export function unaForma(
  clave: TranslationKey,
  azar: () => number = Math.random,
  /**
   * Lo que va en los huecos de la frase, si los tiene.
   *
   * **Y hace falta aquí y no solo en `t()`**: las variantes son cadenas
   * escritas en este fichero y no pasan por el diccionario, así que un
   * `{campo}` dentro de una variante se quedaba sin rellenar y la comandante
   * le daba la bienvenida a «{campo}». La primera forma sí pasaba por `t()` y
   * salía bien, que es la peor manera de tener este fallo: funciona cuatro de
   * cada cinco veces.
   */
  valores?: Record<string, string | number>,
): { readonly texto: string; readonly id: string } {
  const rellenar = (texto: string): string =>
    valores
      ? texto.replace(/\{(\w+)\}/g, (m, n: string) => String(valores[n] ?? m))
      : texto;
  const otras = VARIANTES[clave];
  if (!otras?.length) return { texto: t(clave, valores), id: clave };
  const n = Math.min(otras.length, Math.floor(azar() * (otras.length + 1)));
  return {
    texto: n === 0 ? t(clave, valores) : rellenar(otras[n - 1]!),
    id: idDeLaForma(clave, n),
  };
}
