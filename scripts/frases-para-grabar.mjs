/**
 * La lista de lo que hay que grabar, sacada del propio juego.
 *
 * El juego habla con la voz del navegador —«speechSynthesis»— y suena a robot.
 * Está así desde el primer día y con una salida preparada: `Instructor` es una
 * interfaz, y el resto del juego pide «decí esto» sin saber quién contesta. El
 * día que existan las grabaciones se escribe otra implementación y se cambia
 * una línea.
 *
 * Este guion prepara ese día: recorre los diccionarios y escribe la lista de
 * frases con su identificador, para grabarlas —o sintetizarlas— y devolverlas
 * como ficheros que el juego pueda buscar por nombre.
 *
 * ## Qué hace falta grabar, y qué no
 *
 * - **El instructor** habla en castellano paraguayo y es lo que sustituye al
 *   texto en el peldaño que no lee. Es lo primero y lo más importante.
 * - **La cabina** habla en inglés aeronáutico y son cantos cortos: *terrain,
 *   pull up*, *one hundred*, *V1*. No se traducen jamás, así que se graban una
 *   vez y valen para los tres idiomas.
 * - **La torre** es la misma lista de la cabina pero pasada por radio, y por
 *   eso va aparte: lo que la hace creíble no es la voz, es el filtro.
 * - **El guaraní no se sintetiza.** No hay voz de guaraní en ningún sintetizador
 *   y una voz castellana leyendo guaraní escrito suena a burla. Esas frases
 *   esperan a una persona que lo hable. Ver #6.
 *
 * Uso: `node scripts/frases-para-grabar.mjs [carpeta]`
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";

const SALIDA = process.argv[2] ?? "docs/voces";

/**
 * Qué grupos de claves habla el instructor.
 *
 * No es todo el diccionario: los créditos, los nombres de las teclas y los
 * rótulos del hangar se leen, no se oyen. Lo que se graba es **lo que se dice
 * mientras se vuela**, que es lo que alguien de cuatro años no puede leer.
 */
const HABLADOS = [
  ["vuelo", "instructor", "lo que toca hacer ahora, en vuelo y en tierra"],
  ["circuito", "instructor", "los cuatro tramos del circuito de tráfico"],
  ["percance", "instructor", "lo que salió mal, en la pantalla de fin"],
  ["fin", "instructor", "el reconocimiento al terminar"],
  ["grado", "instructor", "los cuatro grados del cuaderno"],
  ["galon", "instructor", "los galones que se ganan en el vuelo"],
  ["tutor", "instructor", "los consejos de los primeros minutos"],
  /*
   * **Y por qué no se puede bajar así**, que es la mitad que faltaba.
   *
   * La orden de irse al aire se decía sin decir el motivo: la tarjeta lo
   * llevaba —«Vas muy despacio. Venís mal para bajar…»— y la voz no, porque
   * estos seis no estaban grabados. A los cuatro años la voz **es** el canal, y
   * una orden sin motivo no enseña nada: enseña a obedecer.
   */
  ["motivo", "instructor", "por qué no se puede bajar así"],
  ["mission", "instructor", "las misiones"],
  /*
   * Aquí estaba «la cuenta de la toma, en casa»: la instructora contando en
   * metros en los aviones sin radioaltímetro. Esa cuenta no existe en ninguna
   * cabina y se quitó con sus tomas; la cuenta es de la caja, en pies. Ver
   * `flight/avisos-de-altura.ts`.
   */
  /*
   * **Y lo que explican los paneles.**
   *
   * Estaban fuera con el argumento de que «se leen, no se oyen», y vale para
   * los créditos y los rótulos del hangar — pero no para el esquema del ala,
   * que es una explicación y **la explicación es el panel**. Quien tiene
   * cuatro años abre esa pantalla, ve el aire azul chupando por arriba y no
   * puede leer por qué. Cuatro frases de las que cambian según dónde esté el
   * tirador, que es justo lo que un instructor diría mirando por encima del
   * hombro.
   */
  ["ala.dice", "instructor", "lo que explica el esquema del ala"],
  /*
   * **La torre de Canarias va primero, y por eso el grupo más concreto gana.**
   *
   * Sus claves son `torre.canario.*` y empiezan por `torre.`, así que el grupo
   * de abajo se las llevaría con la voz paraguaya si el orden no importara.
   * Importa: gana el primero que reclame una clave. Ver `i18n/habla.ts`, que es
   * quien decide qué campos hablan así —todo lo que empieza por `GC`—.
   */
  /*
   * **Y lo que se ve por la ventanilla**, que antes no se grababa: era una
   * plantilla con el nombre en un hueco y la decía la voz del navegador —«muy
   * robótica, sin emoción»—. Ahora es una frase por sitio, escrita a mano. La
   * de la instructora va primero por lo mismo que la torre canaria: sus claves
   * empiezan también por `ventanilla.` y gana el primero que reclame una. Ver
   * `src/audio/ventanilla.ts`.
   */
  [
    "ventanilla.vos",
    "instructor",
    "lo que se ve por la ventanilla, dicho al lado en la avioneta",
  ],
  [
    "ventanilla",
    "comandante",
    "lo que se ve por la ventanilla, por la megafonía",
  ],
  ["comandante", "comandante", "la megafonía de cabina, para el pasaje"],
  /*
   * **Y la tripulación de cabina**, con el habla del sitio como la torre: la
   * de Canarias va primero por lo mismo que allí, porque sus claves empiezan
   * también por `tripulacion.` y gana el primero que reclame una. Ver
   * `audio/servicio-a-bordo.ts`.
   */
  [
    "tripulacion.canario",
    "tripulacion-canarias",
    "la tripulación de cabina de Canarias, por megafonía",
  ],
  ["tripulacion", "tripulacion", "la tripulación de cabina, por megafonía"],
  ["torre.canario", "torre-canarias", "la torre de Canarias, que no vosea"],
  ["torre", "torre", "la lámpara de la torre, dicha en casa"],
  ["otro", "otro", "el otro avión de la frecuencia"],
];

/**
 * Y los cantos de cabina, que no están en el diccionario porque no se traducen.
 *
 * Viven escritos en `game.ts` y en `avisos-de-altura.ts`; aquí se listan con
 * su identificador para que las grabaciones vuelvan con nombre. Son la mitad
 * del juego que suena a avión.
 */
const CABINA = [
  ["cabina.v1", "V one", "el punto de no retorno del despegue"],
  /*
   * «Rotate», y no «Vr».
   *
   * Es lo que se canta de verdad en una cabina: V1 se dice porque es un
   * número y una decisión, y la siguiente no se dice como número sino como
   * orden, porque es una acción — «rotate» es literalmente «levantá el
   * morro». Decir «Vr» en voz alta no lo dice nadie.
   */
  ["cabina.vr", "rotate", "la velocidad de rotación: tirar"],
  [
    "cabina.terrainPullUp",
    "terrain, pull up",
    "aviso de terreno, el más urgente",
  ],
  ["cabina.tooLow", "too low", "vas bajo sobre el terreno"],
  ["cabina.tooFast", "too fast", "veredicto de toma rápida"],
  ["cabina.offTheRunway", "off the runway", "tomaste fuera de la pista"],
  ["cabina.airspeed", "airspeed", "vas rápido en el aire"],
  /*
   * **Las tres que el juego ya dice y todavía no están tomadas.**
   *
   * Los tres estados los calcula el avión desde hace tiempo y los tres tienen
   * su luz en el panel; lo que no había era voz. Quien mira la pantalla se
   * enteraba y quien depende del sonido, no — un canal menos, y en los avisos
   * que más importan.
   *
   * Van aquí y **no** en `CLAVE_DE_CABINA` todavía, que es donde estaba el
   * círculo: aquella tabla tiene que cuadrar con el manifiesto en las dos
   * direcciones —una clave sin grabación apunta a un audio que no existe— así
   * que una frase nueva entra allí **con su toma**. Y esta lista es la que
   * dice qué tomar. Primero se piden aquí, luego se graban, y entonces se
   * apuntan allí.
   *
   * Hasta entonces el juego las dice con la voz del navegador, que es lo que
   * hay, y con su luz y su texto al lado.
   */
  /*
   * **Los tres cientos de en medio de la cuenta de altura.**
   *
   * Pedidos jugando: «se echa de menos un indicador de voz indicando la
   * aproximación y la distancia a tierra: five hundred, four hundred… fifty,
   * forty». Faltaban los tres de en medio, y `avisos-de-altura.ts` no podía
   * pedirlos: una cuenta en la que tres números los dice otra voz suena peor
   * que una cuenta corta.
   */
  ["cabina.fourHundred", "four hundred", "cuenta de altura en la toma"],
  ["cabina.threeHundred", "three hundred", "cuenta de altura en la toma"],
  ["cabina.twoHundred", "two hundred", "cuenta de altura en la toma"],
  /*
   * **Y los dos que miran cómo se vuela, no dónde se está.**
   *
   * «Sink rate» es bajar más deprisa de lo que esa altura aguanta; «bank
   * angle», ir demasiado inclinado. Los dos los calcula el avión desde
   * siempre y ninguno se decía. Ver `flight/avisos-de-actitud.ts`.
   */
  /*
   * **El tren, que el juego ya pedía en voz alta sin tener la toma.**
   *
   * `game.ts` canta «gear up» y «gear down» desde hace tiempo —ver
   * `avisaDelTren`— y como no estaban aquí, salían por el sintetizador del
   * navegador en mitad de una cabina que suena grabada. Es la misma avería que
   * ya tuvo `minimums`, por tercera vez.
   *
   * Y «positive rate» delante, que es la que las ata: en un avión de verdad se
   * canta al ver la subida asentada, y la respuesta es meter el tren. Sin
   * ella, «gear up» llega suelta.
   */
  ["cabina.positiveRate", "positive rate", "el avión sube de verdad: tren adentro"],
  ["cabina.gearUp", "gear up", "meté el tren"],
  ["cabina.gearDown", "gear down", "sacá el tren"],
  ["cabina.sinkRate", "sink rate", "bajás muy rápido para lo bajo que estás"],
  ["cabina.bankAngle", "bank angle", "el avión va demasiado inclinado"],
  ["cabina.stall", "stall, stall", "el ala dejó de sustentar"],
  /*
   * **El aviso de tráfico del TCAS**, tal cual lo dice cualquier cabina con
   * TCAS I o II: dos veces la palabra y nada más. Es precaución y no alarma,
   * así que va con la misma voz plana que el resto y sin prisa. Ver
   * `src/flight/tcas.ts`.
   */
  ["cabina.traffic", "traffic, traffic", "otro avión cerca: mirá dónde dice la pantalla"],
  [
    "cabina.autopilotDisconnect",
    "autopilot disconnect",
    "el piloto automático se soltó y los mandos son tuyos otra vez",
  ],
  ["cabina.minimums", "minimums", "la altura de decisión: o la ves, o te vas"],
  ["cabina.slowDown", "slow down", "vas rápido en el suelo"],
  [
    "cabina.tooHighComeDown",
    "too high, come down",
    "te pasaste el aro por arriba",
  ],
  ["cabina.tooLowClimb", "too low, climb", "te pasaste el aro por abajo"],
  ["cabina.obstacleAhead", "obstacle ahead", "hay un edificio delante"],
  [
    "cabina.goAround",
    "going around. good decision",
    "te fuiste al aire: bien hecho",
  ],
  ["cabina.weHaveAProblem", "we have a problem", "se rompió el avión"],
  /*
   * **La orden de irse al aire, que no tenía toma.** La de arriba, con el
   * elogio detrás, es la de **después**; ésta es la de antes, seca, la que
   * se oye cuando el juego manda frustrar. Estaban las dos pidiendo la misma
   * grabación. Ver `CLAVE_DE_CABINA` en `src/audio/cabina.ts`.
   */
  ["cabina.goAroundOrder", "go around", "la orden de irse al aire"],
  // Y el aviso de velocidad baja, que el juego pedía sin toma.
  ["cabina.airspeedLow", "airspeed low", "vas lento para la configuración"],
  /*
   * **La cuenta del radioaltímetro, entera.** Los dos de arriba —el radar que
   * empieza a ver el suelo y los mil— se tomaron cuando la cuenta pasó a ser
   * de la caja y dejó de tener sentido recortarla. Y se fue «five», el cinco
   * de la cuenta en metros, que ningún radioaltímetro canta.
   */
  [
    "cabina.twentyFiveHundred",
    "twenty five hundred",
    "cuenta de la toma: el radar empieza a ver el suelo",
  ],
  ["cabina.oneThousand", "one thousand", "cuenta de la toma, en pies"],
  ["cabina.fiveHundred", "five hundred", "cuenta de la toma, en pies"],
  ["cabina.oneHundred", "one hundred", "cuenta de la toma, en pies"],
  ["cabina.fifty", "fifty", "cuenta de la toma, en pies"],
  ["cabina.forty", "forty", "cuenta de la toma, en pies"],
  ["cabina.thirty", "thirty", "cuenta de la toma, en pies"],
  ["cabina.twenty", "twenty", "cuenta de la toma, en pies"],
  ["cabina.ten", "ten", "cuenta de la toma, en pies"],
];

/**
 * Y lo que dice la torre, que es lo mismo pasado por radio.
 *
 * Va aparte porque **lo que hace creíble una radio no es la voz, es el
 * filtro**: banda estrecha, un poco de saturación y el clic del final. Se
 * graba limpio y el efecto se pone después, así que estas frases se pueden
 * sacar de la misma sesión.
 */
/*
 * **Y éstas ya no se graban enteras: se montan.**
 *
 * Estaban aquí como cinco frases sueltas, de cuando la torre no sabía tu
 * matrícula. Ahora cada una es una receta —las letras de tu indicativo, el
 * número de pista y la orden— así que grabarlas enteras es pagar por un
 * fichero que además **tapa al montaje**: el pack busca por clave y encuentra
 * el churro antes que la receta. Lo que se graba son sus piezas, que están más
 * abajo en `TORRE_SOLO`. Ver `recetaDe` en `src/audio/banco-de-voz.ts`.
 */
const TORRE = [];

/**
 * El alfabeto aeronáutico, una sílaba por pieza.
 *
 * Es lo que convierte cinco frases en infinitas: con veintiséis piezas se monta
 * **cualquier** indicativo, y así el otro avión de la frecuencia deja de
 * llamarse siempre Zulu Papa Alfa Bravo Charlie. Se oyó jugando: «hay unas
 * pocas frases y en cada vuelo dice lo mismo».
 *
 * Y es exactamente lo que hace un GPS con el nombre de la calle. El mecanismo
 * de huecos —`{c1}`, `{c2}`…— llevaba construido y probado desde el principio
 * sin que lo usara nadie. Ver `recetaDe` en `src/audio/banco-de-voz.ts` y
 * `src/flight/matricula.ts`.
 *
 * **En castellano, no en inglés.** Quien lo dice es un piloto de la frecuencia
 * en Asunción o en Tenerife, no una torre internacional: dice «Alfa, Bravo,
 * Charlie» con su boca, que es lo que se oye en una radio de VFR local. Lo que
 * sí va en inglés es la fraseología de la torre, y eso ya está arriba.
 */
const FONETICO = [
  "Alfa",
  "Bravo",
  "Charlie",
  "Delta",
  "Echo",
  "Foxtrot",
  "Golf",
  "Hotel",
  "India",
  "Juliett",
  "Kilo",
  "Lima",
  "Mike",
  "November",
  "Oscar",
  "Papa",
  "Quebec",
  "Romeo",
  "Sierra",
  "Tango",
  "Uniform",
  "Victor",
  "Whiskey",
  "X-ray",
  "Yankee",
  "Zulu",
];

/**
 * Y las cifras, que en radio no se dicen como en la calle.
 *
 * «Niner» y no «nine», porque por una radio con ruido «nine» y «five» se
 * confunden y en alemán *nein* significa que no. Es de las cosas que suenan a
 * capricho hasta que se sabe por qué, y entonces ya no se olvidan. Con diez
 * piezas se dice el número de cualquier pista del mundo.
 */
const CIFRAS = [
  ["zero", "0"],
  ["one", "1"],
  ["two", "2"],
  ["three", "3"],
  ["four", "4"],
  ["five", "5"],
  ["six", "6"],
  ["seven", "7"],
  ["eight", "8"],
  ["niner", "9"],
];

/**
 * Lo que dice la torre **sin el indicativo ni el número de pista**.
 *
 * Igual que con el otro avión: pegados dentro de la grabación no se pueden
 * cambiar, y una torre que nunca te llama por tu nombre no es una torre, es un
 * altavoz. Separados, la receta los monta.
 */
const TORRE_SOLO = [
  ["torre.solo.runway", "runway", "antes del número de pista"],
  /*
   * Y el lado, para los aeropuertos con dos pistas paralelas: Gran Canaria
   * tiene la 03L y la 03R, y decir «zero three» a secas allí es no decir cuál.
   */
  ["lado.left", "left", "pista izquierda, donde hay dos paralelas"],
  ["lado.right", "right", "pista derecha"],
  ["lado.center", "center", "y la del medio, si algún día hay tres"],
  ["torre.solo.clearedTakeoff", "cleared for take-off", "el permiso"],
  ["torre.solo.clearedLand", "cleared to land", "el de llegada"],
  [
    "torre.solo.goAround",
    "go around, runway occupied",
    "la pista está ocupada",
  ],
  ["torre.solo.holdShort", "hold short of the runway", "pará en la doble raya"],
  /*
   * **Y a quien se pasó la salida**: abandone por la próxima disponible. La
   * raya ya se rehacía sola por la siguiente; faltaba que la torre lo dijera
   * como se dice. Ver `decirSalPorLaSiguiente` en `src/game.ts`.
   */
  [
    "torre.solo.vacateNext",
    "vacate next available",
    "te pasaste la salida: dejá la pista por la próxima",
  ],
  /*
   * **Y el porqué de la espera**, detrás de la orden: la información de
   * tráfico que da una torre de verdad a quien deja en el punto de espera.
   * Ver `porQueEsperas` en `src/flight/turno-de-pista.ts`.
   */
  ["torre.solo.landingTraffic", "landing traffic", "se espera: uno viene a aterrizar"],
  ["torre.solo.departingTraffic", "departing traffic", "se espera: uno sale antes"],
  ["torre.solo.lineUpWait", "line up and wait", "entrá y esperá en el eje"],
  /*
   * El principio de la autorización; el límite —el campo— va en un hueco,
   * porque cambia con cada ruta. Ver `DESTINOS_EN_RADIO` más abajo.
   */
  ["torre.solo.clearedTo", "cleared to", "la autorización, antes del destino"],
  /*
   * **Y las de la otra punta y el socorro.** «Runway in use» va delante del
   * número de la pista en uso; «go around» a secas, delante de él, para
   * mandar al aire a quien viene por la otra cabecera —la pista no está
   * ocupada, así que «runway occupied» sería mentir—; y «roger, Mayday» es la
   * torre contestando a quien se quedó sin motor. Ver
   * `src/flight/la-otra-cabecera.ts` y `src/flight/sin-motor.ts`.
   */
  ["torre.solo.runwayInUse", "runway in use", "la pista en uso, antes de su número"],
  ["torre.solo.goAroundSolo", "go around", "al aire, sin más: el porqué va detrás"],
  ["torre.solo.rogerMayday", "roger, Mayday", "la torre oyó la llamada de socorro"],
  /*
   * **Y lo que dice un AFIS**, que informa y no autoriza: la pista libre u
   * ocupada detrás de su número, y «no reported traffic» detrás de la pista
   * en uso. Ver `DICE_UN_AFIS` en `src/audio/torre.ts`.
   */
  ["torre.solo.free", "free", "un AFIS: la pista, libre; detrás de su número"],
  ["torre.solo.occupied", "occupied", "un AFIS: la pista, ocupada; detrás de su número"],
  [
    "torre.solo.noReportedTraffic",
    "no reported traffic",
    "un AFIS: sin tráfico conocido, detrás de la pista en uso",
  ],
];

/**
 * **Y el viento, que va en toda autorización de pista.**
 *
 * Una torre de verdad lo da al autorizar a despegar y a aterrizar —«wind zero
 * five zero degrees, one two knots, runway zero five, cleared to land»—, y
 * las cifras ya estaban grabadas: faltaban las palabras de alrededor. Se
 * llaman igual en las dos torres, como las cifras y el lado, porque van en un
 * hueco y el hueco no sabe qué torre habla. Ver `vientoEnPiezas` en
 * `src/flight/matricula.ts`.
 */
const VIENTO = [
  ["viento.wind", "wind", "el viento, antes de la dirección"],
  ["viento.degrees", "degrees", "detrás de la dirección del viento"],
  ["viento.knots", "knots", "detrás de la fuerza del viento"],
  ["viento.calm", "calm", "sin viento: «wind calm»"],
  ["viento.variable", "variable", "viento sin dirección fija"],
];

/** Y la pieza de cada letra, que es como se llama su fichero. */
const piezaFonetica = (letra) =>
  `fonetico.${letra.toLowerCase().replace("-", "")}`;

/**
 * Los cinco mensajes del otro avión **sin el indicativo delante**.
 *
 * El indicativo estaba pegado dentro de cada una de las cinco grabaciones, así
 * que no había forma de cambiarlo. Separado, la receta lo monta: las letras que
 * toquen y después el mensaje. Y «buenos días» lleva el indicativo detrás, que
 * es como se saluda por radio.
 */
/**
 * **La información de tráfico, en piezas**, para las dos torres.
 *
 * «Traffic, two o'clock, three miles, one thousand feet above»: se decía con
 * el texto montado y sin receta, así que la decía la voz del navegador —y en
 * Brave para Linux, nadie—. Aquí van las piezas que la montan: la palabra, las
 * doce horas del reloj, las millas de una a seis —hasta donde mira el TCAS— y
 * los pies de trescientos a mil doscientos, que es la banda en la que se
 * avisa. Ver `informacionEnPiezas` en `src/flight/informacion-de-trafico.ts`.
 *
 * Sin el habla en el nombre, como el viento: cada torre tiene su pack y las
 * dos graban `trafico.*` con el mismo nombre. Y las horas enteras, «two
 * o'clock», y no la cifra suelta: una hora del reloj no se dice cifra a
 * cifra. Los pies sí van como una altitud, con «niner».
 */
const HORAS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];
const MILLAS = ["one mile", "two miles", "three miles", "four miles", "five miles", "six miles"];
const CIENTOS = [
  [3, "three hundred feet"],
  [4, "four hundred feet"],
  [5, "five hundred feet"],
  [6, "six hundred feet"],
  [7, "seven hundred feet"],
  [8, "eight hundred feet"],
  [9, "niner hundred feet"],
  [10, "one thousand feet"],
  [11, "one thousand one hundred feet"],
  [12, "one thousand two hundred feet"],
];
const TRAFICO = [
  ["trafico.traffic", "traffic", "información de tráfico: empieza así"],
  ...HORAS.map((h, i) => [
    `trafico.hora.${i + 1}`,
    `${h} o'clock`,
    "dónde está el otro, en la hora del reloj",
  ]),
  ...MILLAS.map((m, i) => [`trafico.millas.${i + 1}`, m, "a qué distancia"]),
  ...CIENTOS.map(([n, pies]) => [`trafico.pies.${n}`, pies, "cuánto más alto o más bajo"]),
  ["trafico.above", "above", "va por encima"],
  ["trafico.below", "below", "va por debajo"],
  ["trafico.sameLevel", "same level", "va a tu misma altura"],
];

/**
 * **Y la instructora presenta nuestra matrícula al empezar**: «Nuestro avión
 * es Zulu Papa Alfa Romeo India. Así nos llama la torre». Se monta con las
 * letras del alfabeto en su voz —las de la torre están en inglés y por radio,
 * y esto lo dice ella sentada al lado— y dos trozos alrededor. Ver
 * `presentarLaMatricula` en `src/game.ts`.
 */
const INSTRUCTOR_SOLO = [
  ["matricula.nuestroAvion", "Nuestro avión es", "al empezar, antes de las letras de la matrícula"],
  ["matricula.asiNosLlama", "Así nos llama la torre.", "y detrás de las letras"],
];

const OTRO_SOLO = [
  ["otro.solo.buenosDias", "Buenos días,", "el saludo, antes del indicativo"],
  ["otro.solo.rodando", "rodando a la cabecera", "sale del puesto"],
  ["otro.solo.enCola", "viento en cola", "entra en el circuito"],
  ["otro.solo.final", "en final", "ya viene a la pista"],
  ["otro.solo.pistaLibre", "pista libre", "y la deja"],
];

/*
 * **El otro avión ya no vive aquí.**
 *
 * Sus cinco frases estaban escritas en este guion, y eso duró hasta que el
 * juego empezó a decirlas de verdad: entonces había dos copias del mismo
 * texto y una de ellas —la de aquí— seguía diciendo «viento en cola para la
 * uno cinco» cuando la del juego ya no nombraba ninguna pista. Ahora salen
 * del diccionario, como las del instructor, y no hay dos.
 *
 * Ver `otro.*` en `src/i18n/es-PY.ts` y `src/flight/radio.ts`.
 */

const claves = (ruta) => {
  const s = readFileSync(ruta, "utf8");
  const salida = new Map();
  /*
   * **Y el guion cuenta como parte de la clave.**
   *
   * Esto decía `[\w.]+`, y `\w` no incluye el guion: toda clave con guion se
   * caía de la lista **sin decir nada**. El día que la comandante tuvo una
   * llegada por aeródromo se llevó por delante a diez de los diecisiete
   * —`la-palma`, `el-hierro`, `la-gomera`, `tenerife-norte`…— y el recuento
   * seguía dando un número creíble, que es lo que lo hace peligroso: se paga
   * una tanda de estudio a la que le faltan diez frases y no se nota hasta que
   * el juego aterriza en La Palma y calla.
   */
  for (const m of s.matchAll(/"([\w.-]+)":\s*\n?\s*"((?:[^"\\]|\\.)*)"/g)) {
    salida.set(m[1], m[2]);
  }
  return salida;
};

const es = claves("src/i18n/es-PY.ts");

/**
 * Las otras formas de decir cada cosa, leídas de `src/audio/variantes.ts`.
 *
 * Se saca del fuente con una expresión regular en vez de importarlo porque
 * este guion corre en Node a pelo y aquello es TypeScript. La forma del
 * fichero es una tabla de literales, así que basta.
 */
const variantes = (() => {
  const fuente = readFileSync("src/audio/variantes.ts", "utf8");
  const cuerpo = fuente.slice(
    fuente.indexOf("VARIANTES:"),
    fuente.indexOf("export function cuantasFormas"),
  );
  const salida = new Map();
  for (const m of cuerpo.matchAll(/"([\w.-]+)":\s*\[([\s\S]*?)\]/g)) {
    const textos = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
    if (textos.length) salida.set(m[1], textos);
  }
  return salida;
})();

mkdirSync(SALIDA, { recursive: true });

let filas = [];
/** Las claves que ya tienen voz asignada. Ver el bucle. */
const yaPuestas = new Set();
let total = 0;
for (const [grupo, voz, para] of HABLADOS) {
  for (const [k, v] of es) {
    /*
     * El grupo se compara por **el principio de la clave**, no solo por el
     * primer trozo. `vuelo` coge todo `vuelo.*` como siempre, y `ala.dice`
     * coge las cuatro explicaciones del esquema del ala sin arrastrar sus
     * rótulos —«Ángulo del ala», «Velocidad»—, que son etiquetas de mando y
     * no algo que nadie diga en voz alta.
     */
    if (k !== grupo && !k.startsWith(`${grupo}.`)) continue;
    // Y una clave la graba **una sola voz**: gana el grupo más concreto, que
    // es el que va antes en la tabla. Sin esto, la torre canaria se grabaría
    // dos veces, una con cada voz, y el pack no sabría cuál poner.
    if (yaPuestas.has(k)) continue;
    yaPuestas.add(k);
    filas.push({ id: k, voz, idioma: "es-PY", texto: v, para });
    total += v.length;
    /*
     * **Y las otras formas de decirlo**, si esta frase tiene.
     *
     * Salen de `src/audio/variantes.ts`, que es donde se escriben, para que
     * añadir una variante sea escribirla y volver a grabar — sin una segunda
     * lista que se quede vieja. La primera forma es la de `i18n` y se llama
     * como la clave; las demás llevan su número.
     */
    for (const [n, otra] of (variantes.get(k) ?? []).entries()) {
      filas.push({
        id: `${k}~${n + 2}`,
        voz,
        idioma: "es-PY",
        texto: otra,
        para: `${para} · otra forma de decirlo`,
      });
      total += otra.length;
    }
  }
}
for (const [id, texto, para] of CABINA) {
  filas.push({ id, voz: "cabina", idioma: "en", texto, para });
  total += texto.length;
}
for (const [id, texto, para] of TORRE) {
  filas.push({ id, voz: "torre", idioma: "en", texto, para });
  total += texto.length;
}
for (const letra of FONETICO) {
  filas.push({
    id: piezaFonetica(letra),
    voz: "otro",
    idioma: "es",
    texto: letra,
    para: "una letra del indicativo",
  });
  total += letra.length;
}
for (const [id, texto, para] of INSTRUCTOR_SOLO) {
  filas.push({ id, voz: "instructor", idioma: "es-PY", texto, para });
  total += texto.length;
}
for (const letra of FONETICO) {
  filas.push({
    id: piezaFonetica(letra),
    voz: "instructor",
    idioma: "es-PY",
    texto: letra,
    para: "una letra de nuestra matrícula, dicha al empezar",
  });
  total += letra.length;
}
for (const [id, texto, para] of OTRO_SOLO) {
  filas.push({ id, voz: "otro", idioma: "es", texto, para });
  total += texto.length;
}
/*
 * **Y la torre también monta.** El alfabeto y las cifras, para poder llamar a
 * cada uno por su matrícula y nombrar la pista en uso. Es inglés aeronáutico y
 * se dice igual en Tenerife que en Asunción, así que lo graba **una** voz y
 * vale para los dos campos. Ver `i18n/habla.ts`.
 */
for (const letra of FONETICO) {
  filas.push({
    id: piezaFonetica(letra),
    voz: "torre",
    idioma: "en",
    texto: letra,
    para: "una letra de la matrícula",
  });
  total += letra.length;
}
for (const [palabra, cifra] of CIFRAS) {
  filas.push({
    id: `cifra.${cifra}`,
    voz: "torre",
    idioma: "en",
    texto: palabra,
    para: "una cifra del número de pista",
  });
  total += palabra.length;
}
for (const [id, texto, para] of [...TORRE_SOLO, ...VIENTO, ...TRAFICO]) {
  filas.push({ id, voz: "torre", idioma: "en", texto, para });
  total += texto.length;
}
/*
 * **Y la lámpara verde a un avión en el aire**, que no dice «podés entrar»:
 * en las señales de luz de verdad, la verde fija a un avión en vuelo es
 * «autorizado a aterrizar». Va troceada como las demás de la lámpara —la
 * matrícula delante la pone la receta—, en las dos voces de torre.
 */
const EN_EL_AIRE =
  "la lámpara verde con el avión en el aire: autorizado a aterrizar";
/*
 * Y la de a dónde se va, antes de rodar: la autorización dicha en palabras
 * de casa, con el campo en un hueco. Ver `autorizarLaRuta` en `src/game.ts`.
 */
const A_DONDE = "a dónde se va, antes de rodar; el campo va detrás";
/*
 * Y lo que dice un AFIS en castellano, en los cuatro peldaños y en las dos
 * voces: no autoriza, informa. Sin voseo que cambiar, así que las mismas
 * palabras en las dos. Ver `luzDeTorre` en `src/game.ts`.
 */
const DE_UN_AFIS = [
  ["afisLibre", "pista libre", "un AFIS: la pista está libre, y decidís vos"],
  ["afisOcupada", "pista ocupada", "un AFIS: hay alguien en la pista"],
  ["afisSinTrafico", "sin tráfico conocido", "un AFIS: no sabe de nadie más"],
  ["afisTraficoAterriza", "tráfico aterrizando", "un AFIS: viene uno a aterrizar"],
  ["afisTraficoDespega", "tráfico despegando", "un AFIS: sale uno antes"],
];
const LAMPARA_SOLO = [
  ["torre", "torre.solo.aterrizar", "podés aterrizar", EN_EL_AIRE],
  ["torre-canarias", "torre.canario.solo.aterrizar", "puedes aterrizar", EN_EL_AIRE],
  ["torre", "torre.solo.destino", "podés volar a", A_DONDE],
  ["torre-canarias", "torre.canario.solo.destino", "puedes volar a", A_DONDE],
  ...DE_UN_AFIS.flatMap(([id, texto, para]) => [
    ["torre", `torre.solo.${id}`, texto, para],
    ["torre-canarias", `torre.canario.solo.${id}`, texto, para],
  ]),
];
for (const [voz, id, texto, para] of LAMPARA_SOLO) {
  filas.push({ id, voz, idioma: "es", texto, para });
  total += texto.length;
}

/*
 * **Y el nombre de cada destino, dicho por la torre que lo nombra.**
 *
 * Salen de las claves `lugar.*` del diccionario, que es donde se escriben,
 * y los graba solo la torre desde la que se puede ir allí: a Lanzarote se
 * va desde Canarias y a Encarnación desde Paraguay, así que grabar los doce
 * con las dos voces sería pagar por nombres que nadie va a pedir. La regla
 * es la de `hablaDe`: los campos canarios son los que tienen un indicativo
 * `GC`, y aquí se escriben por su `id` porque este guion no lee los
 * aeródromos.
 */
const CANARIOS = new Set([
  "tenerife-norte",
  "tenerife-sur",
  "gran-canaria",
  "lanzarote",
  "fuerteventura",
  "la-palma",
  "el-hierro",
  "la-gomera",
]);
for (const [k, v] of es) {
  if (!k.startsWith("lugar.")) continue;
  const id = k.slice("lugar.".length);
  filas.push({
    id: `destino.${id}`,
    voz: CANARIOS.has(id) ? "torre-canarias" : "torre",
    idioma: "es",
    texto: v,
    para: "el destino, en la autorización de la torre",
  });
  total += v.length;
}

/*
 * **Y la torre de Canarias dice lo mismo, con su voz.**
 *
 * Aquí había un agujero que se oía y nadie había medido: en Tenerife la
 * lámpara la dice la voz canaria —«Puedes entrar»— y un segundo después la
 * radio dice «cleared for take-off» con la voz de torre general. La misma
 * torre, dos personas. Se oyó jugando: «voz de hombre primero y luego de
 * mujer».
 *
 * El inglés aeronáutico se dice igual en Tenerife que en Asunción, sí — pero
 * **no lo dice la misma persona**, y eso es lo que se nota. Así que la torre
 * canaria graba su juego entero: su alfabeto, sus cifras y sus cinco órdenes.
 * Cuarenta y cuatro piezas para que una torre suene a una torre.
 */
for (const letra of FONETICO) {
  filas.push({
    id: piezaFonetica(letra),
    voz: "torre-canarias",
    idioma: "en",
    texto: letra,
    para: "una letra de la matrícula, dicha en Canarias",
  });
  total += letra.length;
}
for (const [palabra, cifra] of CIFRAS) {
  filas.push({
    id: `cifra.${cifra}`,
    voz: "torre-canarias",
    idioma: "en",
    texto: palabra,
    para: "una cifra del número de pista, dicha en Canarias",
  });
  total += palabra.length;
}
for (const [id, texto, para] of [...TORRE_SOLO, ...VIENTO, ...TRAFICO]) {
  filas.push({
    // Las claves llevan el habla en medio para no pisarse con las de casa.
    // Ver `comoSeDiceAqui` en `i18n/habla.ts`.
    id: id.startsWith("torre.") ? id.replace("torre.", "torre.canario.") : id,
    voz: "torre-canarias",
    idioma: "en",
    texto,
    para: `${para}, en Canarias`,
  });
  total += texto.length;
}

/*
 * **Y los trozos con número de la comandante**: cuánto dura el vuelo, a qué
 * altura se va, cuánto falta y cuántos grados hay allí.
 *
 * Cambian con cada vuelo, así que se montan —ver
 * `src/audio/partes-de-la-comandante.ts`—; pero cada trozo es **una frase
 * entera con su número dentro**, y no el número suelto, porque un «diez»
 * pegado en mitad de una frase de megafonía se nota al instante. La plantilla
 * sale del diccionario —`comandante.minutos`: «Vamos a aterrizar en unos {n}
 * minutos.»— y aquí se rellena con el número **en letras**, que es como se
 * lee sin tropezar. Los números que existen salen del propio juego, así que
 * no hay una segunda lista que se quede vieja.
 */
const partes = readFileSync("src/audio/partes-de-la-comandante.ts", "utf8");
const niveles = readFileSync("src/flight/nivel-de-crucero.ts", "utf8");
const numeroDe = (fuente, nombre) => {
  const m = new RegExp(`export const ${nombre}\\s*=\\s*(-?\\d+)`).exec(fuente);
  if (!m) throw new Error(`no encuentro ${nombre}`);
  return Number(m[1]);
};
const MINUTOS = (() => {
  const m = /MINUTOS_QUE_SE_DICEN\s*=\s*\[([^\]]*)\]/.exec(partes);
  if (!m) throw new Error("no encuentro MINUTOS_QUE_SE_DICEN");
  return m[1].split(",").map((x) => Number(x.trim())).filter(Number.isFinite);
})();
const PRIMER_NIVEL = numeroDe(partes, "PRIMER_NIVEL");
const ULTIMO_NIVEL = numeroDe(niveles, "HASTA") / 1000;
const MAS_FRIO = numeroDe(partes, "MAS_FRIO");
const MAS_CALOR = numeroDe(partes, "MAS_CALOR");

/**
 * Un número en letras, delante de un nombre masculino —minutos, grados, mil
 * pies—: «un grado», «veintiún minutos», «treinta y un mil». Hasta noventa y
 * nueve, que es lo que hace falta.
 */
const UNIDADES = [
  "cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho",
  "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis",
  "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiún", "veintidós",
  "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete",
  "veintiocho", "veintinueve",
];
const DECENAS = { 3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta",
  7: "setenta", 8: "ochenta", 9: "noventa" };
function enLetras(n) {
  if (n < 30) return UNIDADES[n];
  const d = DECENAS[Math.floor(n / 10)];
  const u = n % 10;
  return u === 0 ? d : `${d} y ${UNIDADES[u]}`;
}

/** La plantilla con el número puesto, y el singular arreglado. */
const conNumero = (plantilla, n) =>
  plantilla.replace("{n}", enLetras(n)).replace(/\bun grados\b/, "un grado");

const CON_NUMERO = [
  ["comandante.minutos", "comandante.minutos", MINUTOS, "cuánto falta para aterrizar, al empezar a bajar"],
  ["comandante.previsto.vuelo", "comandante.previsto.vuelo", MINUTOS, "cuánto dura el vuelo, detrás de la bienvenida"],
  [
    "comandante.previsto.nivel",
    "comandante.previsto.nivel",
    Array.from({ length: ULTIMO_NIVEL - PRIMER_NIVEL + 1 }, (_, i) => PRIMER_NIVEL + i),
    "a qué altura se va, detrás de la bienvenida",
  ],
  [
    "comandante.temperatura",
    "comandante.temperatura",
    Array.from({ length: MAS_CALOR + 1 }, (_, i) => i),
    "la temperatura del destino, al empezar a bajar",
  ],
  [
    "comandante.temperaturaBajoCero",
    "comandante.temperatura.menos",
    Array.from({ length: -MAS_FRIO }, (_, i) => i + 1),
    "la temperatura del destino, bajo cero",
  ],
];
for (const [plantilla, prefijo, numeros, para] of CON_NUMERO) {
  const texto = es.get(plantilla);
  if (!texto) throw new Error(`falta la plantilla ${plantilla} en es-PY`);
  for (const n of numeros) {
    const conSuNumero = conNumero(texto, n);
    filas.push({
      // Las de bajo cero van pegadas a su número —`menos3`— y las demás con
      // un punto delante, que es como las pide el juego. Ver `piezaDeGrados`.
      id: prefijo.endsWith(".menos") ? `${prefijo}${n}` : `${prefijo}.${n}`,
      voz: "comandante",
      idioma: "es-PY",
      texto: conSuNumero,
      para,
    });
    total += conSuNumero.length;
  }
}

/*
 * **Y fuera lo que no se graba: lo que se monta.**
 *
 * Las frases con hueco —«{indicativo}, en final»— no son frases: son recetas.
 * Lo que se graba son sus piezas, que ya están en la lista por su cuenta. Si se
 * quedan aquí, el día que alguien pida grabar esa voz se gasta saldo en que
 * alguien lea en voz alta «llave indicativo coma en final», y encima ese
 * fichero tapa a la receta: el pack busca por clave y encuentra el churro antes
 * que el montaje. Se cuela solo, porque salen del diccionario y el diccionario
 * las tiene con hueco.
 */
const conHueco = filas.filter((f) => f.texto.includes("{"));
if (conHueco.length) {
  filas = filas.filter((f) => !f.texto.includes("{"));
  console.log(
    `\n  ${conHueco.length} no se graban, se montan: ` +
      conHueco.map((f) => f.id).join(", "),
  );
}

/*
 * **Y las que se graban en calma, con cómo se graban.**
 *
 * Dos avisos de la instructora salieron gritados —el de terreno y el de sacar
 * el tren— y estuvieron meses apartados en `A_VOCES`, cayendo en la voz del
 * navegador, que en Brave para Linux es muda: el aviso de terreno, sin voz. La
 * toma gritada no es un defecto del texto sino de la lectura: una orden de dos
 * palabras con punto en medio es justo lo que un sintetizador lee como alarma.
 *
 * Así que la receta de la toma se escribe aquí y viaja con la frase, para que
 * el día que se rehaga salga igual: `dicho` es lo que se le da a leer —las
 * mismas palabras que la tarjeta, con la puntuación de quien lo dice sin
 * levantar la voz— y `ajustes` los de la voz, estables y sin exagerar. Firme,
 * no alarmada: la calma es la forma que tiene la seguridad de funcionar.
 */
const AJUSTES_EN_CALMA = {
  stability: 0.85,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: false,
  speed: 0.95,
};
/*
 * **Y las explicaciones de los avisos de las cajas, también.** Suenan justo
 * detrás de la máquina —*terrain*, *sink rate*— y son la otra mitad de la
 * lección: la primera alarma de avión que se oye, y detrás alguien que no se
 * asusta. Leídas como alarma, enseñarían lo contrario. Ver
 * `flight/escalera.ts`.
 */
const EN_CALMA = {
  "vuelo.terrenoSube": "El suelo está cerca: subí.",
  "vuelo.terrenoBajo": "Vas muy bajo: subí un poco.",
  "vuelo.bajasRapido": "Bajás muy de golpe: levantá un poco la nariz.",
  "vuelo.muyInclinado": "Estás muy inclinado: enderezá las alas.",
  "vuelo.quitaElGas": "Quitá el gas.",
  "vuelo.sacaElTren": "Sacá el tren.",
};
for (const f of filas) {
  const dicho = EN_CALMA[f.id];
  if (!dicho) continue;
  f.dicho = dicho;
  f.ajustes = AJUSTES_EN_CALMA;
}

/*
 * **Y las de la ventanilla, al revés: con chispa.**
 *
 * Es lo contrario de un aviso. La comandante está contando algo bonito, con
 * desparpajo, y la referencia es el servicio a bordo con el maní de la granja,
 * no la señal de cinturones. Con los ajustes de la voz, que son los de una
 * megafonía seria, salía plano: «una azafata que no ha dormido bien».
 *
 * Menos estabilidad es más entonación —la voz sube y baja como quien cuenta
 * algo—, y el estilo es lo que ElevenLabs llama exagerar el de la voz: a
 * cuarenta y cinco sale con gracia sin pasarse a locutora de feria. El
 * refuerzo del hablante mantiene que siga siendo Jazlyn. Las de la
 * instructora igual: lo que cuenta es lo mismo y se cuenta con las mismas
 * ganas.
 */
const AJUSTES_CON_CHISPA = {
  stability: 0.35,
  similarity_boost: 0.8,
  style: 0.45,
  use_speaker_boost: true,
  speed: 1,
};
/*
 * **Y ninguna muy corta.** «Mirá a tu izquierda», veinte letras, volvió con
 * nueve segundos de voz; y grabada con la voz quieta, con cinco: con tan poco
 * texto el modelo sigue hablando por su cuenta. No era cosa de los ajustes
 * sino del texto, así que se alargó —«Mirá por la ventanilla, a tu
 * izquierda»— y aquí se avisa de la próxima que baje de treinta letras.
 */
for (const f of filas) {
  if (!f.id.startsWith("ventanilla.")) continue;
  f.ajustes = AJUSTES_CON_CHISPA;
  if (f.texto.length < 30)
    console.log(`\n  ¡Ojo! ${f.id} es muy corta para grabarla suelta: «${f.texto}»`);
}

const tsv = [
  ["voz", "fichero", "idioma", "texto", "dónde suena"].join("\t"),
  ...filas.map((f) =>
    [f.voz, `${f.voz}/${f.id}.ogg`, f.idioma, f.texto, f.para].join("\t"),
  ),
].join("\n");
writeFileSync(`${SALIDA}/frases.tsv`, tsv + "\n");

/*
 * Y un fichero por voz con **solo el texto**, una frase por línea y en el
 * orden de la tabla: es lo que se pega de una vez en el estudio, y lo que
 * vuelve son los audios en ese mismo orden.
 */
for (const voz of new Set(filas.map((f) => f.voz))) {
  const suyas = filas.filter((f) => f.voz === voz);
  writeFileSync(
    `${SALIDA}/guion-${voz}.txt`,
    suyas.map((f) => f.texto).join("\n") + "\n",
  );
  writeFileSync(
    `${SALIDA}/guion-${voz}.tsv`,
    suyas
      .map((f, i) => `${String(i + 1).padStart(3, "0")}\t${f.id}\t${f.texto}`)
      .join("\n") + "\n",
  );
}

// Y el mismo contenido como JSON, que es lo que leerá el juego para saber qué
// fichero suena con cada clave.
writeFileSync(`${SALIDA}/frases.json`, JSON.stringify(filas, null, 2) + "\n");

console.log(`\n  ${filas.length} frases · ${total} caracteres en total\n`);
const porVoz = new Map();
for (const f of filas) {
  const [n, c] = porVoz.get(f.voz) ?? [0, 0];
  porVoz.set(f.voz, [n + 1, c + f.texto.length]);
}
for (const [voz, [n, c]] of porVoz) {
  console.log(
    `  ${voz.padEnd(11)} ${String(n).padStart(4)} frases · ${String(c).padStart(5)} caracteres`,
  );
}
console.log(
  `\n  El inglés de cabina se graba una vez y vale para los tres idiomas.\n` +
    `  El guaraní no se sintetiza: espera a una persona que lo hable (#6).\n` +
    `\n  → ${SALIDA}/frases.tsv y ${SALIDA}/frases.json\n`,
);
