# 0029 — La torre y quién va primero: la llegada en final y la salida que no cabe

Fecha: 2026-11-16
Estado: aceptado · enmienda lo que decide la torre cuando uno que sale tapa
tu salida de la pista (`flight/salida-tapada.ts`, `flight/turno-de-pista.ts`
y `world/trafico.ts`); no cambia la frecuencia, ni las voces, ni el tráfico
dibujado

Hasta hoy no había un ADR de la torre: sus decisiones viven en los
comentarios de esos tres ficheros, cada una con su porqué. Este es el
primero, y recoge la regla de prioridad que las ordena; lo que se decida
después sobre la torre va aquí, como enmienda.

## Contexto

En un vuelo entero del JAZ 90 en Los Rodeos (banco de H15b, tanda 6 de #192)
la torre le mandó al aire tres veces por «salida tapada» —uno que va a salir
espera en una doble raya que está en la calle por la que vas a dejar la
pista—, las tres a 304–306 m (996–1003 ft). H20a lo analizó:

- Las tres saltan **al pasar a final**: la torre cambia la cuenta del
  circuito por la de la final, y el JAZ 90 entra en final a menos de 90 s
  del umbral (`VUELTA_DESDE_EN_FINAL`). No le cabe la vuelta de espera, y el
  único remedio que quedaba era irse al aire.
- **Una contradicción.** A t=947 sonó «cleared for take-off» para EC-TMD en
  el mismo instante en que a ti te mandaban al aire por él. Había tres
  cuentas de si al que sale le da tiempo a irse antes de que llegues:
  `enTuSalida` no contaba lo que espera a que la pista quede libre de los
  demás; `seVaAntes` y `seVaAntesQueTu` sí.
- EC-LHV llevaba 47 s en la pista sin alinearse y seguía contando como que
  tapaba tu salida.

## La fuente

OACI, *Procedures for Air Navigation Services — Air Traffic Management*
(PANS-ATM, Doc 4444), 16.ª edición, 2016, con la enmienda 9; capítulo 7,
*Procedures for aerodrome control service*:

- **7.8, el orden de prioridad**: «An aircraft landing or in the final
  stages of an approach to land shall normally have priority over an
  aircraft intending to depart from the same or an intersecting runway.»
- **7.9.3.1, la autorización de despegue**: se da cuando hay seguridad
  razonable de que existirá la separación de 7.9.2 al empezar la carrera.
- **7.10.1, la separación en la pista**: el que aterriza no cruza el umbral
  hasta que la salida de delante ha pasado el final de la pista o ha
  empezado a virar, o hasta que los que aterrizaron delante la han dejado.
- **7.10.2**: se autoriza a aterrizar con seguridad razonable de que esa
  separación existirá al cruzar el umbral.
- **7.10.3.1 c)**: a quien aterriza se le puede pedir que deje la pista por
  una salida concreta.
- **7.6.3.1.3.1**: no se retiene a nadie más cerca de la pista que en su
  punto de espera.

Y la fraseología, capítulo 12: «ORBIT RIGHT (o LEFT)», 12.3.4.17 b);
«GO AROUND», 12.3.4.18 a); «TAKE OFF IMMEDIATELY OR VACATE RUNWAY» y «HOLD
POSITION», 12.3.4.11 c) y 12.3.4.8 b). Los dos primeros ya se citaban en
`salida-tapada.ts` con el párrafo «por verificar»; quedan verificados.

El Reglamento de Circulación Aérea español y el SERA (Reglamento de
Ejecución (UE) 923/2012) no se consultaron: la fuente que se sigue es la de la
OACI, que es la que vale en Paraguay y en las islas.

## Decisión

### Una sola cuenta

`leDaTiempo(segundos, tapa)` en `flight/salida-tapada.ts`: al que sale le
da tiempo si lo que te falta para el umbral es más que lo que tarda en irse
—hasta su doble raya, lo que remonte, entrar, alinearse, correr y pasar el
final de la pista, con su margen— **más lo que espera a que la pista quede
libre de los demás**. La usan los cuatro sitios que deciden darle la pista a
uno que sale contigo en camino: `enTuSalida` (al darte la pista y al dársela
en cuanto queda libre), `seVaAntesQueTu` (la calle única) y `seVaAntes` (si
la torre te retrasa). Lo que tarda en irse lo cuenta una sola función,
`loQueTardaEnIrse` en `world/trafico.ts`.

Con eso, la torre ya no le da la salida a uno al que en el mismo paso ve sin
tiempo de irse.

### Quién va primero

- **En el circuito**, la torre puede sacar antes al que sale y retrasarte a
  ti con una vuelta (12.3.4.17). No cambia.
- **En la final, con tiempo para la vuelta** (90 s o más, y 150 m sobre la
  pista), igual. No cambia.
- **En la final corta**, quien está en final va primero (7.8), y lo que se
  hace depende de dónde está el que sale:
  - **Ya en la pista** —pasada su doble raya, entrando, remontando o
    alineándose— ya no tapa tu salida: ocupa la pista, y lo que toca es que se
    vaya. La torre le da la salida si no la tiene («cleared for take-off»; la
    fraseología de verdad para el que no la cumple es «TAKE OFF IMMEDIATELY OR
    VACATE RUNWAY», 12.3.4.11 c), y tú sigues. Si al llegar a la decisión
    todavía está en ella, no se cruza el umbral (7.10.1) y te manda al aire
    la pista ocupada (`pistaOcupada`, «go around, runway occupied»): la
    frustrada por pista ocupada sigue existiendo cuando la pista está
    ocupada, porque eso es real y se enseña. Es el remedio nuevo `despegar`.
  - **Todavía fuera**, rodando hacia su doble raya o esperando en ella: se le
    retiene donde está (7.6.3.1.3.1), no se le da la pista, y a ti no se te
    pide nada. Dejas la pista por otra salida, rodeándole, que es lo que
    traza tu raya verde (7.10.3.1 c). Es el remedio nuevo `retener`.
  - **Salvo que su doble raya esté en tu única salida**: retenido ahí te
    cierra el paso, aterrizas y no puedes dejar la pista, y él no puede entrar
    hasta que la dejes. Entonces sí te manda al aire, «go around, departing
    traffic», y sale él. Se mira con el mismo buscador que traza las calles del
    tráfico, rodeando su doble raya (`otraSalidaSin` en `world/trafico.ts`).

Un AFIS sigue sin mandar: cuenta lo que hay y, en la final, la instructora
propone irse.

### Lo que no se hace

- **No se dice «vacate via…»** a quien juega: haría falta grabar la frase en
  las voces de las torres, y la raya verde ya traza la otra salida.
- **No se acorta el margen** de 30 s (`MARGEN_PARA_IRSE`) para el que ya
  corre con su autorización. Con el margen, la torre manda al aire un poco
  antes de lo que haría una de verdad, que esperaría a ver si se va; la red de
  la altura de decisión (`pistaOcupada`) sigue ahí para el que no se fue.

## Lo medido

Sin navegador, con el banco de mesa de `salida-tapada.test.ts` —la
frecuencia, el turno, el tráfico dibujado con sus calles y tu plan de tierra,
con un piloto que hace lo que le dicen—:

- **El Hierro, Encarnación y los AFIS** (Pilar, Concepción, Estigarribia), las
  dos cabeceras, el avión más pequeño y el más grande que caben, cuatro
  repartos de salidas y tres semillas: siguen sin nadie parado en tu calle,
  llegas a tu puesto, salen los que salían y nunca hay dos en la pista. La
  prueba mira ahora además que la torre no le dé la salida a uno de tu salida,
  todavía fuera de la pista, al que en ese paso ve sin tiempo (salió una vez
  antes de corregir la medida: era la salida que se le da mientras la torre
  cuenta con la vuelta que te pidió, que es para eso), y que no te mande al aire por tu
  salida con el que sale ya en la pista o con otra salida para ti.
- **Si no das la vuelta**, en El Hierro, o te vas al aire o aterrizas con el
  de tu salida retenido y sin pasar a su lado.
- **Los Rodeos con el JAZ 90** (`RODEOS=1`: la final empieza a sesenta
  segundos, y antes la torre te ve por el circuito), dos cabeceras, ocho
  repartos de salidas y tres semillas, 48 llegadas: en ese banco la salida
  tapada no se da ni antes ni después —ninguna orden de irse al aire por ella,
  ninguna salida dada a destiempo, nunca dos en la pista—. Lo que mandó al aire
  al JAZ 90 en el navegador fue una salida que la torre ya había metido en la
  pista estando él en el circuito; ese banco no lo reproduce. Las once
  frustradas que sí salen allí son por la pista ocupada a la decisión, por un
  avión del tráfico que aterrizaba delante, y son las mismas antes y después.

- **El Hierro y Encarnación, antes y después**, las dos cabeceras, los dos
  aviones, cuatro repartos, tres semillas, dando la vuelta y sin darla: 192
  llegadas, y lo mismo antes que después —dos órdenes de irse al aire por tu
  salida, las dos en la calle única de Encarnación, donde no hay otra salida y
  es lo que toca; nunca dos en la pista; ninguna salida dada a destiempo—. Con
  esos repartos la final corta con uno en tu salida casi no se da, así que lo
  nuevo se prueba también con el caso puesto a mano (`quien-va-primero.test.ts`):
  fuera de la pista y con otra salida, se le retiene y no se te pide nada; ya
  en la pista, tampoco; y en tu única salida, al aire.

En el navegador, con la tarjeta de verdad (`OGA_GPU=1`), una tirada de cada:

| Banco | H15b, tanda 6 | Ahora |
|---|---|---|
| Vuelo entero, Los Rodeos, JAZ 90 | 4 órdenes de irse al aire (3 por la salida, a 1.000 ft); no llegó a terminar | ninguna; aterriza a la primera y acaba apagado en su puesto, 62 de 63 |
| Despegue, Los Rodeos, JAZ 90 | 21 de 21 | 21 de 21 |

La que falla del vuelo entero es «el avión parado tiene las ruedas en el
suelo», hundido 0,23 m, y no es de la torre. Es una tirada con otro reloj
(×1, la de H15b iba más deprisa), y con el aire de Los Rodeos cada vuelo es
distinto: no basta para decir que las frustradas por la salida no vuelven,
solo que en esta no hubo.

## Lo que queda

- **El salto de la cuenta al pasar a final.** Con el JAZ 90, la cuenta del
  circuito da más tiempo del que luego hay en la final, y la torre deja entrar
  en la pista a salidas que, al pasar tú a final, todavía no se han ido. Ahora
  se les da la salida y lo decide la altura de decisión, en vez de mandarte al
  aire a mil pies; pero la cuenta del circuito sigue sin medirse contra lo que
  vuela de verdad un reactor.
- **«Vacate via…»** a quien juega, con voz, cuando la torre retiene a uno en
  su salida.
- En el banco de Los Rodeos, por la 30, siete de veinticuatro llegadas acaban
  con una salida que no llega a despegar —recibe «hold short» y se le adelantan
  las de detrás—; pasa igual antes y después, y no es de esta tanda.

  **De dónde sale (17-11-2026), sin arreglar todavía.** No se queda olvidada en
  la frecuencia: se le retira el dibujo. La torre la tiene en su puesto mientras
  tu salida de la pista pasa por su doble raya (`quienDejaLaPistaPorSuRaya`),
  y la doble raya de la 30 está a dos kilómetros de los puestos. En cuanto la
  pasas la suelta, y sale de su puesto hacia ella por la misma calle por la que
  tú vuelves al tuyo: frente a frente, los dos dentro, sin sitio para recular
  —su puesto está en tu camino—, y a los treinta segundos parada por ti se le
  retira (`PACIENCIA_CON_QUIEN_JUEGA`), con su «hold short» ya dicho. Medido en
  las siete: en todas, tu raya pasa a menos de seis metros del centro del
  turbohélice que espera, en la entrada de la plataforma por la que se llega a
  todos los puestos de ese lado. **Y no está en un puesto**: el más cercano, el
  15, queda a 63 m. Su camino se recortó al asfalto (`recortarAlAsfalto` en
  `world/suelo-del-trafico.ts`: el remate al puesto cruza fuera del pavimento
  dibujado) y espera en el último nudo, que es una calle.

  Se probaron dos cosas y no se quedaron. Retenerle en su puesto hasta que
  hayas pasado por toda su calle, como ya se hace con los del tráfico que
  aterrizan: despegan las siete, pero tú te quedas parado detrás de él —está en
  tu camino— hasta que tu paciencia te hace pasar por encima, y el rodaje de la
  toma al puesto pasa de 203 a 233 s de media en las cuarenta y ocho llegadas
  (+96 s en doce por la 12). Y darte otro puesto al que se llegue sin pasar
  junto a un avión parado: en esas llegadas no lo hay entre los seis más
  cercanos. Lo que va a la raíz es que el tráfico no espere en una calle:
  **que entre los puestos cercanos prefiera uno al que su camino llega entero
  antes que uno recortado**. Probado en una copia, sin juntar, con el mismo
  banco de mesa de cuarenta y ocho llegadas: las salidas que no despegan pasan
  de siete a una, el rodaje de la toma al puesto de 203 a 192 s de media, y
  las pruebas de `src/world/` y de la torre pasan; pero sale una nueva de
  «parado a tu lado» —un reactor a 42,8 m, con el límite en 43,25— y una
  llegada tarda 98 s más. Falta mirar esas dos y el navegador antes de
  juntarlo.

  **Arreglado (17-11-2026, H22a).** El parche entra, con dos cosas más
  (`rutaEntre` y `mejorEntre` en `world/suelo-del-trafico.ts`, y
  `asomaElMorro` en `world/trafico.ts`):

  - **La llegada que tardaba 98 s más** era la misma raíz por el otro lado:
    el que salía ya no esperaba en el ramal de la entrada de la plataforma,
    pero el turbohélice que aterrizaba, contigo detrás, sí aparcaba allí —al
    final del ramal, en (-312, 255), a 137 m del 13—, porque de los ocho
    puestos más cercanos a su boca no llegaba entero a ninguno, y el
    recortado más corto era ése. Tu raya pasaba a cuatro metros de su
    centro y te quedabas detrás de él hasta que lo retiraban. Ahora, si los
    ocho más cercanos solo dan recortados, se miran los ocho siguientes y
    los otros ocho (`POR_TANDA`, `TANDAS`), y gana uno al que se llegue
    entero; si ninguno de los veinticuatro, el recortado de antes. Lo mide
    `trafico-en-tu-calle.test.ts` en Los Rodeos: ningún camino de la pista
    a un puesto pasa ya junto a donde aparca el que llega, y si uno se
    queda en ese ramal, la raya lo rodea.
  - **El reactor «parado a tu lado»** es el que sale del 13 por la 30
    mientras vuelves al 15: espera bien, fuera de tu tramo, pero con la
    separación de ala, y de cara a tu calle lo primero que entra es el
    morro, que en el reactor va 20,6 m por delante del centro con una
    semiala de 17. Esperaba con el centro a 40,0 m de tu raya y el morro a
    unos seis metros de tu punta de ala. Ahora el que espera cuenta lo que
    el morro va más allá del ala (`asomaElMorro`, 3,6 m en el reactor y
    nada en los demás) y espera con el centro a 43,7 m. El banco lo sigue
    contando, a 43,2 m de ti con el límite en 43,25 —el piloto del banco
    recorta la esquina y pasa medio metro por dentro de la raya—: con el
    morro a más de nueve metros de tu punta de ala y las alas a trece, no
    es un tapón sino el turno de cada uno, y se deja así.

  Con el banco de mesa de cuarenta y ocho llegadas por Los Rodeos con el
  JAZ 90:

  | | Antes | Solo el parche | Ahora |
  |---|---|---|---|
  | Salidas que no despegan | 7 | 1 | 0 |
  | Rodaje medio de la toma al puesto | 202,7 s | 191,9 s | 189,1 s |
  | «Parado a tu lado» | 0 | 1 (42,8 m) | 1 (43,2 m) |
  | Frustradas, dos en la pista, sin llegar | 9, 0, 0 | 9, 0, 0 | 9, 0, 0 |

  Lo que no se ha hecho todavía es pasarlo por el navegador: el candado
  estuvo ocupado hasta pasado el tope de la tanda. Ver «Sin pasar por el
  navegador» en el ADR 0025.

## Enmienda H28a (17-11-2026): dos tráficos cerca a la vez

En los vuelos enteros del JAZ 90 en Los Rodeos de H25d y H25e
(`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-90`) fallaba la
misma comprobación de la radio: «del tráfico cercano se informa». Un tráfico
del circuito —EC-JSN en la de H25d, EC-XCD en la de H25e— llevaba doce
segundos de rombo lleno sin una palabra, a los 310 y 309 s, recién
despegado. Lo que decía el banco en ese instante era siempre lo mismo: la
información callaba por **«entre dos»**, y el otro del circuito —EC-KLH,
EC-YMW— ya estaba nombrado.

No llegaba tarde a la cola ni lo pisaba nada: no se pedía. Al pasar los
quinientos pies (a los 298 s), que es desde donde se da la información, los
dos del circuito ya estaban dentro de las seis millas y los mil doscientos
pies, a la vez. La torre nombraba al más cercano y el segundo esperaba
`ENTRE_DOS`, quince segundos **contados desde que se pidió el primero**,
acabara el primero cuando acabara. Era un reloj de cuando la
información esperaba a que la boca estuviera libre del todo y lo único que
separaba dos voces era el tiempo; desde que pide turno en la boca, la segunda
no puede pisar a la primera, y los quince segundos solo dejaban al segundo
tráfico sin nombrar. Con dos a la vez, el segundo se quedaba sin nombrar
siempre más de doce.

Un controlador con dos tráficos que darte los dice seguidos, casi siempre en
la misma transmisión. Ahora:

- **Lo que separa dos informaciones se cuenta desde que la primera se acaba
  de oír** —entera o cortada—, y es un respiro: `ENTRE_DOS`, dos segundos.
  Mientras se oye, la información calla por «sonando»: ni la voz del
  segundo, ni su tarjeta, que taparía la del primero mientras se dice.
- **La red** (`SUENA_COMO_MUCHO`, quince segundos, lo que duraba el rato de
  antes): si el aviso de que acabó no llega —la boca se vacía de golpe al
  cambiar de avión—, pasado eso se da por oída. Sin ella, una información
  que no avisa de su final no dejaría pasar a ninguna otra.
- Sin voz —la frase se cae por repetida, o no tiene con qué sonar y su
  tarjeta ya se vio— ya se acabó: el respiro cuenta desde ahí.

`informacion-de-trafico.test.ts` lo deja escrito: dos cerca a la vez, la
primera dura seis segundos y el segundo se pide a los ocho, no a los quince;
mientras se oye la primera no se da otra; y sin aviso de final, pasados
`SUENA_COMO_MUCHO` se sigue.

Volado el 17-11-2026, puerto 5688 (`… tenerife-norte taguato 1 jaz-90`):
la comprobación pasa —«ningún rombo lleno doce segundos de reloj sin que
nadie lo cuente»—, con dos informaciones de tráfico dadas y los 22 nombrados
en el mundo. **Lo que el vuelo no prueba por sí solo**: el tráfico del banco
sale cada vez distinto, esta vez se despegó a los 480 s con uno delante en la
fila, y el banco no dice si al pasar los quinientos pies volvió a haber dos
cerca a la vez. El caso queda probado en la mesa, no en esta tirada. Lo que
falló en ella es de la toma, no de la radio: el piloto del banco tocó a
3,1 m/s, recogiendo a 10,7 m de ruedas, y sin toma buena no hay gafas de sol
(62 de 64, dos sin medir).

## Enmienda (17-11-2026, H29d): tu permiso, antes de las dos millas

### El caso

En el banco del vuelo entero del JAZ 90 en Los Rodeos con el reloj ×12
(H29a, `tenerife-norte taguato 12 jaz-90`), dos rojos de la torre: «la torre
dice la fraseología del vuelo» y «tu cleared to land suena, y en final: se
aterrizó y no sonó ninguna». En la cola de la boca, «torre.canario.aterrizar»
y su «clearedLand» se retiraron a los 493,2 s «porque ya no era verdad»,
entre los doscientos y los cien pies de la cuenta: es `darElPermisoYa`, que a
la decisión da el permiso a la vista y retira la voz que queda.

**No esperaron turno en una boca llena: se pidieron tarde.** Lo tuyo va en
`mando`, por delante de la instructora, y con la boca ocupada espera una
frase, no una final. Lo que tenía el permiso guardado era la pista: «al
costado: 722 s a 49 m: EC-ZFP a 1541 m del umbral y -73 m del eje (llegada
15209/1031/13783/15187)». EC-ZFP era una llegada del tráfico —tocó en el metro
13.783 de su camino y deja la pista en el 15.187— que justo entonces pasaba
su punto de salida: 1.400 m de pista ocupada por delante del JAZ 90 mientras
éste volaba su final corta. Con alguien encima la torre no autoriza (`paso`
en `flight/turno-de-pista.ts`, la regla de La Gomera), y cuando la dejó el
JAZ 90 estaba en la decisión.

**La causa**: el tráfico solo te ponía en su fila de llegadas al coger la
final (`laFila` en `world/trafico.ts`, con `alUmbral`), y en Los Rodeos el
circuito del JAZ 90 tiene la final de 4.163 m y la base a 2.459 m del eje, un
pelo fuera del cono de treinta grados: la final de la torre empieza al acabar
el viraje, a unos 4,5 km. El que giraba a su base mientras tú volabas la tuya
no te veía y entraba delante sin su hueco. Es lo mismo que daba las nueve
frustradas del banco de mesa de 48 llegadas («Lo medido», arriba): «al aire:
pista ocupada» a 19 s del umbral, cada una con el «pista libre» de una llegada
del tráfico detrás.

Y una segunda, más rara, por el mismo lado: al que sale se le daba la pista
si se iba antes de que cruzaras el umbral (`llegaAntesDeQueSalga`), no antes
de cuando tiene que sonar tu permiso. En la mesa, un despegue autorizado con
el JAZ 90 a dos minutos corría todavía al coger éste la final, y su permiso se
pedía a 2.176 m.

### La fuente

OACI, Doc 4444, 16.ª edición, 2016:

- **8.9.6.1.7**: «Clearance to land or any alternative clearance received from
  the aerodrome controller … should normally be passed to the aircraft before
  it reaches a distance of 4 km (2 NM) from touchdown.» Y 8.9.6.1.8 a) iii):
  sin permiso a esa distancia, al aire. Es el listón: tu permiso empieza a
  sonar antes de las dos millas.
- **7.7.1.2**: «Sufficient separation shall be effected between aircraft in
  flight in the traffic circuit to allow the spacing of arriving and departing
  aircraft as outlined in 7.9.2, 7.10.1 and 7.11.» El hueco entre llegadas se
  hace en el circuito, no en la final.
- **7.6.2**, posición 4: «Clearance to land is issued here as practicable», y
  las posiciones se vigilan «so that proper clearances may be issued without
  delay».

### Decisión

- **Volando el circuito entras en la fila de llegadas** (`QuienJuega.porElCircuito`,
  puesto por `tuLlegada` en `game.ts` con lo que te queda de circuito). A quien
  todavía no ha girado a su base y no cabe delante de ti le toca su vuelta de
  espera, como ya le tocaba contigo en la final. Lo que ya había girado
  aterriza delante, como con un control de verdad.
- **Y al que sale, la pista solo si se ha ido antes de las dos millas de tu
  final y de lo que tarda en sonar tu permiso** (`antesDeTuPermiso`: las dos
  millas a tu velocidad y diez segundos de boca), no solo antes del umbral.
- **No cambia**: la torre sigue sin autorizar con otro encima de la pista, la
  red de la decisión —a la vista y sin la frase a destiempo— sigue ahí, y la
  boca y sus pesos, igual. El banco del vuelo entero, también: no fue cosa del
  ×12.

### Lo medido

Sin navegador:

- **`permiso-a-tiempo.test.ts`**, nueva: la frecuencia de Los Rodeos con su
  tráfico y sus calles, el turno, una boca de verdad con lo que dura cada
  frase y el JAZ 90 que entra en el circuito a cinco minutos del umbral y coge
  la final de la torre a 4,5 km; dos cabeceras, seis momentos y tres
  semillas. Pide que tu permiso empiece a sonar antes de las dos millas, sin
  irse al aire ni darse a la vista.

  | | Tarde | Al aire | Sonó, de … a … m del umbral |
  |---|---|---|---|
  | Antes | 6 de 36 | 1 | 1.521 a 4.497 |
  | Solo la regla de la salida | 5 de 36 | 1 | 1.521 a 4.497 |
  | Ahora | 0 de 36 | 0 | 4.064 a 4.497 |

- **El banco de mesa de 48 llegadas** (`RODEOS=1` en `salida-tapada.test.ts`,
  que ahora también te pone en la fila desde el circuito, como el juego):
  frustradas de 9 a 0, «parado a tu lado» de 1 a 0, y siguen sin salidas que no
  despegan, sin llegadas que no llegan y nunca dos en la pista.

- **Las pruebas de El Hierro de `salida-tapada.test.ts`** que miran qué hace
  la torre cuando uno que sale tapa tu salida —la vuelta, la ida al aire, el
  aviso de un AFIS— se quedaron sin caso: el tercero que ocupaba la pista
  mientras el que sale esperaba en tu salida era justo una llegada del
  tráfico que se te metía delante. Vuelan ahora sin entrar en la fila desde
  el circuito (`filaDesdeElCircuito`), que es el caso de uno que ya había
  girado a su base cuando tú llegaste al circuito, y sigue pasando.

En el navegador, `tenerife-norte taguato 12 jaz-90`, una tirada de cada en una
copia del código, con el volcado de voces (`OGA_VOCES`):

| | Comprobaciones | Tu permiso |
|---|---|---|
| Antes | 62 de 63 | sonó: «616 s aterrizar a 245 m, pista de otro hasta hace 6 s», con un «go around» a uno del tráfico que se te había metido en la final |
| Ahora | 64 de 64 | «682 s aterrizar a 269 m (883 ft), pista de otro hasta hace 325 s» y «clearedLand» a 748 ft |

La tirada de antes no repitió el fallo de H29a —su rojo fue otro, «antes de
tocar, el juego dice que ya se puede tocar», que no es de la torre—: depende de
dónde caiga el tráfico, y por eso lo que mide el arreglo es la mesa.

### Las aves de los 414 s

No es la misma causa. «torre.canario.aves» se pidió a los 504,5 s del reloj de
la ruta, en el viento en cola, y se retiró a los 605,8 s, cuando las aves
quedaron detrás: 101 s de juego. Ahí el banco vuela a ×12 —no hay permiso
pendiente ni es una fase a tiempo real—, así que fueron unos ocho segundos de
pared, con la boca hablando. Es la trampa de siempre del banco: el reloj
acelerado comprime el juego y no el habla. Jugando, ese aviso tiene minuto y
medio para sonar.

Se arreglaría en el banco como el permiso —a uno mientras el aviso de aves
espera turno, con una sonda como `permisoPorOir`—; no se ha hecho en esta
tanda.

## Enmienda (17-11-2026, H29f): lo que el reloj apretado no deja sonar, la intersección en la roja y «ya podés tocar»

Tres cosas que dejó vistas H29d en el banco del vuelo entero del JAZ 90 en Los
Rodeos (`tenerife-norte taguato 12 jaz-90`), con sus volcados de voces.

### Las aves, y todo lo que solo retira el juego

Lo de «Las aves de los 414 s», arriba: «torre.canario.aves» pedido a los
504,5 s del reloj de la ruta y retirado a los 605,8 s. En el juego no hay nada
que lo haga caducar antes, y está bien que no lo haya: no caduca con el reloj
de la boca (`esElAvisoDeAves`) y lo retira `vigilarLasAves` cuando las aves
dejan de estar delante —espantadas, detrás o a más de ocho kilómetros— o se
toca tierra. Eso es lo que hay que decir: un aviso de aves que ya se pasaron
no enseña nada. Lo que no casaba era el banco, que aceleraba el reloj del
juego con el aviso esperando turno, y el reloj de la boca es el de pared.

No son solo las aves. Todo lo que `cuantoAguanta` deja sin reloj —la
información de tráfico, la fase, lo que la torre te da, el descenso— lo
retira el juego al dejar de ser verdad, y eso va con su reloj: a ×12 llega
doce veces antes de pared. Así que **el banco vuela a ×1 mientras espere
turno en la boca algo que no caduca con su reloj** (sonda `algoPorOir`, en
`src/dev/sondas.ts`, y `relojPara` en `verificar-vuelo-entero.mjs`), como ya
lo hacía con tu permiso (`permisoPorOir`). Lo que sí caduca con el reloj de
la boca no hace falta mirarlo: ese reloj ya es el de pared.

### La oferta de la intersección

`torre.canario.ofreceInterseccion` caducaba esperando en las tres tiradas, y
no era el ×12: la carrera ya va a tiempo real en el banco. Se pedía en el
juego en un momento en que no podía sonar. `contarPorDondeSeSale` iba con la
fase «autorizado», o sea a la vez que la verde en castellano y el «cleared
for take-off» con su viento: dieciocho segundos de boca (de 362,1 a 380,3 s en
la tirada de después de H29d) contra los doce de `CADUCA_LA_ORDEN`. Caía la
pregunta y sonaba la respuesta, «TORA runway one two, from intersection Echo
two», sin que nadie la hubiera hecho. Y «vuelo.desdeLaInterseccion», lo de la
instructora en los peldaños de abajo, con los cuatro segundos de un aviso, se
caía siempre detrás de la verde.

Y era el orden al revés. La oferta y la pista que queda van con el rodaje
(Doc 4444, 12.3.4.7, la fraseología que ya citaba el código): la torre
pregunta antes de autorizar, no después de haberlo hecho. En esa tirada el
JAZ 90 estuvo dos minutos parado en la roja, de los 243,8 a los 362,1 s, y
entre el «cleared for take-off» del otro, a los 286 s, y tu verde no habló
nadie.

Ahora:

- **Se cuenta en la roja, en cuanto calla la frecuencia** (`porDondeSeSalePorDecir`):
  con la boca libre y la torre sin hablar, como pregunta una torre de verdad,
  y no delante de la roja y su porqué. Si llega antes la verde, se cuenta con
  ella, como antes.
- **Y espera su turno sin reloj** (`cuentaPorDondeSeSale` en `audio/boca.ts`):
  la oferta, la pista que queda o remontar, y lo de la instructora. Lo retira
  el juego al empezar la carrera, que es cuando deja de ser verdad. Solo lo
  tuyo: el «backtrack» a otro avión de la frecuencia va en `baja` y caduca
  como la charla.
- **Remontar sigue con la verde**: «backtrack runway one two» es entrar en la
  pista, y con la roja encendida la torre se contradiría.

### «Antes de tocar, el juego dice que ya se puede tocar»

El rojo de la tirada de antes de H29d: «no salió · el juego lo decidió 1 veces
(683 s/final/12 m, y en pantalla «nariz-arriba»)». No es la regla de medir:
el juego decidió la tarjeta y otra la tapó. «Ya podés tocar» pedía estar sobre
la zona de toma, del umbral en adelante y sin margen —el de trescientos metros
se quitó porque en la 01 de Fuerteventura salía sobre las flechas—, así que
cruzando el umbral por debajo de los dieciocho metros salía en el umbral. Ese
avión lo cruzó a doce sobre la cota, que son los treinta pies de ruedas a los
que el JAZ 90 pide la recogida (`flight/recogida.ts`), y la tarjeta de la
nariz, de la misma prioridad, la tapó en el paso siguiente. A ×12 hay doce
pasos por fotograma y el banco no llegó a verla; jugando habría durado lo que
se tarda en bajar de una altura a la otra, décimas. Quien juega no se
enteraba.

Ahora **«ya podés tocar» se adelanta hasta segundo y medio al umbral si desde
ahí ya no se puede tocar antes**: si bajando el doble de lo que se baja las
ruedas llegan al suelo pasado el umbral (`llegandoALaZonaDeToma` en
`world/pistas-del-vuelo.ts`, con su prueba). Dicho ahí sigue siendo verdad, y
la tarjeta tiene ese segundo y medio para verse antes de la recogida.
Cruzando el umbral a los quince metros de la senda no cambia nada: sale en el
umbral, como siempre. Y sobre las flechas, bajo, no sale: desde ahí se
tocaría antes.

### Lo medido

En la mesa: `boca.test.ts` (por dónde se sale espera sin reloj, y solo lo
tuyo) y `pistas-del-vuelo.test.ts` (el segundo y medio, y que sobre las
flechas bajo no se adelanta). vitest entero, 506 ficheros y 10.367 pruebas
en verde.

En el navegador, `tenerife-norte taguato 12 jaz-90`, puerto 5689, con el
volcado de voces: **no se voló en esta tanda**. La cola del navegador iba con
varios bancos delante y el turno no llegó antes del tope. Lo de arriba sale
de los volcados de H29d y de la mesa; queda por ver en el banco que la oferta
suena en la roja, que las aves suenan con el reloj a uno y que la tarjeta de
tocar sale. Y una cosa que el banco tampoco podría probar en Los Rodeos: sin
roja, la oferta sigue sonando detrás de la verde, en el orden de antes, solo
que ahora sin caerse.

## Enmienda (20-11-2026, H41): el que aterrizó delante, de frente, y el permiso a 55 m

### El caso

En la ronda C29, el banco del vuelo entero en Los Rodeos con viento 040/12
—se aterriza por la 12— dio dos rojos que en C28 salían en verde. Entre las
dos no se tocó nada del tráfico ni de la torre: cambió el ritmo del piloto
del banco, que llega a la final en otro momento. Eran fallos viejos.

- **«Y ningún tráfico viene de frente en la final»**, en
  `tenerife-norte taguato 1 jaz-90` y con el Tuka: EC-TIX toca delante a los
  614 s y a los 632 s, con el JAZ 90 en final a unos 1.500 m del umbral, se le
  ve venir de frente a 2.365 m, a ras de pista. A los 644 s la torre manda al
  aire por pista ocupada.
- **«El permiso de aterrizar se oye antes de los 500 ft, o antes de la
  decisión si la pista acababa de quedar libre»**, con el JAZ 20 en Guyrami y
  el JAZ 90 en Taguató: el permiso empieza a sonar a 55 m (180 ft), por debajo
  de los mínimos que la máquina acaba de cantar; en el JAZ 90, solo «podés
  aterrizar», con el «cleared to land» retirado detrás.

### Lo que hacía el de delante

Toca a los 300 m, frena hasta los 900 y **da media vuelta en la pista** para
volver a la salida de los 590 m. No es la que le toca por la geometría: con la
pista vacía sale por la de los 1.598 m, hacia delante. Pero con dos o tres
puestos cogidos por otros del tráfico, el que queda libre solo se alcanza desde
la de 1.598 m rodando 1.144 m **por la pista hacia atrás** —el grafo de calles
no tiene otro camino—, y `llegada` en `suelo-del-trafico.ts` la pone detrás de
la de 590 m (coste 2.987 frente a 1.042). Volver por la pista es lo que se
hace de verdad cuando no hay otra; lo que no se hace es a cuarenta y cinco
nudos: la velocidad de la llegada bajaba en línea recta de la toma a la boca,
**contada por el camino con la vuelta dentro**, así que la media vuelta se
daba a 23 m/s y el remonte hacia el umbral, hacia quien venía en final, a más
de 20. Un reactor la daba a 32. Medido en la mesa, con una llegada cada
noventa segundos durante veintitrés minutos: de dos a tres medias vueltas a
más de 20 m/s en cada una de tres tiradas, y la salida rápida de los 590 m
cogida hacia atrás a 13,8 m/s por las avionetas.

Y la torre no lo dejaba ir hacia nadie: lo veía en la pista y mandaba al aire
a los mínimos, que es lo que toca. Lo que fallaba era el dibujo.

### Por qué el permiso llegaba a 55 m

El turno de pista decide a los sesenta metros —con la pista ocupada, al aire;
con el permiso pedido y sin sonar, a la vista— con la altura que le da
`game.ts`, y esa se medía contra la **cota del centro** de la pista
(`cotaDelCampo`). La aproximación, que canta *minimums*, mide contra la cota
de la pista bajo el avión, que en final es **la del umbral** (`cotaDePistaEn`).
El umbral de la 12 está a 628,5 m y el de la 30 a 611,7: 8,4 m por encima del
centro. Los sesenta metros del turno eran 51,6 sobre la pista, y lo que
empezaba a sonar entre las dos alturas —el permiso que esperaba a que el de
delante soltara la pista, o a que su «pista libre» sonara antes— salía después
de oír *minimums*, sin que nadie lo viera tarde. En el JAZ 90, su fraseología
sí se retiraba: al bajar de los sesenta del turno.

No es que la boca retenga el permiso más de la cuenta: la espera a que suene
antes lo que suelta la pista sigue siendo la de siempre, y a la decisión, o
la pista es tuya y lo sabes, o te vas.

### Decisión

- **El turno mide la altura como la aproximación**, con `cotaDePistaEn`: la
  decisión de la torre —al aire con la pista ocupada, el permiso a la vista—
  cae donde se canta *minimums*. Ver `alto` en el turno de `game.ts`.
- **La media vuelta del tráfico, todavía no.** El arreglo está hecho y medido
  —la llegada sabe dónde tuerce más de cien grados entre la toma y dejar la
  pista (`virajesCerrados`, mirando treinta metros a cada lado), frena para
  llegar a cada media vuelta a `VIRA_A` con 2,5 m/s² y, dada, remonta a
  `REMONTA_A` hasta dejar la pista (`alVirarEnLaPista`)—, pero no entra en
  esta tanda: con el remonte a su paso de verdad la pista va ocupada más rato
  en los campos de una sola salida, y lo que se calibró con el remonte a
  cuarenta nudos deja de cuadrar. En Ayolas la roja más larga de
  `roja-de-verdad.test.ts` pasa de menos de 170 s a 222 s (con el remonte a
  14 m/s y acelerando a 1 m/s², 186 s), y en El Hierro tres pruebas de
  `salida-tapada.test.ts` se quedan sin el caso que miden («expected 0 to be
  greater than 0»). Lo que hay que decidir antes es cuánto dura de verdad la
  roja detrás de una llegada que remonta —la de 170 s es de uno que sale por
  una calle—, y volver a montar los casos de El Hierro con el remonte nuevo.
  Queda en la rama `h41-media-vuelta`.
- **No cambia** la elección de la salida: con los puestos libres solo al otro
  lado, el tráfico de Los Rodeos sigue volviendo por la pista. Que busque otro
  puesto antes que remontar con alguien en final es otra tanda.

### Lo medido

En la mesa:

- **`la-torre-mide-sobre-el-umbral.test.ts`**, nueva: el umbral de la 12
  está más de cinco metros por encima del centro, y la altura del turno y la
  de la aproximación salen de `cotaDePistaEn`.
- **La media vuelta**, en la rama `h41-media-vuelta`
  (`trafico-que-da-la-vuelta.test.ts`): en Los Rodeos por la 12 y por la 30,
  con una llegada cada noventa segundos durante quince minutos, lo más
  deprisa que alguien corre por la pista hacia el umbral de aterrizar. Antes,
  por la 12, 23,4 m/s (EC-HWR a 893 m del umbral); con el arreglo, como mucho
  los 10,3 del remonte.

En el navegador, puerto 5686:

- `tenerife-norte taguato 1 jaz-90`, con los dos arreglos —el de la torre y
  el de la media vuelta, sin juntar—: 62 de 62 comprobaciones, «nadie de
  frente» y el permiso a 284 m (932 ft). **No prueba la media vuelta**: en
  esta tirada el piloto del banco llegó a otro ritmo, en 901 s de vuelo frente
  a los 1.243 de C29, y solo una llegada del tráfico cantó final; ninguna tocó
  delante. Ni tampoco la torre a los mínimos: no hubo pista ocupada en la
  final.
- `tenerife-norte taguato 12 jaz-90`, con lo que se junta —el arreglo de la
  torre solo—: 64 de 64, permiso a 285 m (935 ft) y «cleared to land» a
  250 m. Tampoco aquí hubo pista ocupada en la final: la pista llevaba 320 s
  libre al pedirlo. La altura de los mínimos con la pista recién soltada
  queda sin ver en el navegador.

## Enmienda (20-11-2026, H41b): la paralela de Los Rodeos, y quien remonta donde no la hay

### El caso

La H41 dejó escrito que en Los Rodeos, por la 12, el turbohélice que aterriza
con los puestos de su lado cogidos solo llega al que queda libre desde la
salida de los 1.598 m «rodando 1.144 m por la pista hacia atrás: el grafo de
calles no tiene otro camino». Los Rodeos tiene calle paralela a toda la pista,
la R, y un avión de verdad que aterriza por la 12 no remonta la pista con otro
en final: sale por delante y rueda por la paralela.

### Por qué no había camino

El camino sí estaba. Lo que pasaba es que, al tomar tierra, el turbohélice
veía **de frente** al que había aterrizado noventa segundos antes y rodaba por
la R hacia el mismo sitio, delante de él y en su mismo sentido. `repartirLosTramos`
le buscaba entonces otra salida con el otro como estorbo de 38 m de radio
encima de la R, que es lo único que une la E3 con la plataforma, y la única
otra era volver por la pista hasta la de 590 m.

Y lo veía de frente por dos cosas del grafo, no de los datos:

- **La R iba en zigzag.** OpenStreetMap trae, al borde de la R, once rabos de
  diez metros —el arranque de las líneas de entrada a la plataforma— y los dos
  chaflanes del cruce de la F. Sus dos puntas caen a menos de una soldadura
  (12 m) de la R, y el nodado metía también la lejana en ella: la paralela iba
  de su eje al borde de la plataforma y vuelta, diez metros cada vez, con una
  uve en la F.
- **Las puntas soldadas dejaban un salto.** Un tramo que acaba a menos de doce
  metros de un nudo se suelda a él, pero seguía empezando en su punta: el que
  torcía por la F desde la R pasaba el nudo y volvía ocho metros hacia el este
  para cogerla.

Cualquiera de los dos pone, junto al camino del que viene detrás, un trocito
que va en sentido contrario, y `tramoDeFrente` mira sentido a sentido.

### Decisión

- **Lo que cuelga de una calle no la tuerce** (`colgadasDe` en `rodaje.ts`):
  una calle de menos de 36 m con una punta en otra y la otra a menos de una
  soldadura de ella no mete su punta lejana en la de la que cuelga. Queda unida
  por la que está dentro, y su punta lejana, si es cruce de algo, por los
  cruces. Hecha la cuenta en los diecinueve campos, son puntas que torcían su
  calle en ocho: 18 en Silvio Pettirossi, 16 en Los Rodeos, 12 en Guaraní, 12
  en Fuerteventura, 9 en Cuatro Vientos, 4 en Barajas, 2 en El Hierro y 1 en
  Gran Canaria. Ninguno cambia de salida con la pista vacía.
- **Cada tramo empieza y acaba en su nudo**, no en su punta: el camino sigue
  sin saltos por las soldaduras. **Menos lo que toca un nudo de la pista**,
  que van cada ochenta metros: cosida a él, la boca de una salida empezaba
  hasta doce metros más allá por el eje, y en El Hierro, por la 16, el JAZ 20
  que para a 815 m volvía 291 m por la pista para coger otra
  (`rodar-por-el-asfalto.test.ts`, que lo vio).
- **La media vuelta, con la velocidad de la H41** —frena a 3 m/s para darla y
  remonta como mucho a veinte nudos—, ya junta. Con la pista vacía la dan,
  porque la única salida les queda detrás de donde frenan: Ayolas por la 02
  (los tres tipos, el reactor 1.379 m), La Gomera por la 27 (505 m), El
  Hierro por la 34 (343 m), Silvio Pettirossi por la 02 la avioneta (335 m),
  Encarnación por la 20 el bimotor (255 m), La Palma por la 36 el reactor
  (228 m), Cuatro Vientos por la 09 la avioneta (126 m) y Concepción por la
  21 el turbohélice (93 m). Ninguno en Los Rodeos.
- **Y la torre separa las llegadas por lo que tarda en dejar la pista el que
  remonta** (`ocupaLaPista` en `trafico.ts`): «a landing aircraft will not
  normally be permitted to cross the runway threshold on its final approach
  until [...] all preceding landing aircraft are clear of the runway-in-use»
  (OACI, Doc 4444, 7.10.1.2), y la separación se hace en el circuito
  (7.7.1.2). El de detrás de uno que remonta deja, en vez de los dos minutos
  de siempre, lo que éste tiene la pista ocupada: del umbral a dejarla, vuelta
  incluida. Solo pasa de los dos minutos en Ayolas por la 02: 179 s el
  reactor y 123 el turbohélice. Los demás remontes la dejan libre antes.
- **Quien juega no cambia**: si llega detrás de uno que remonta y la pista
  sigue ocupada a los mínimos, la torre le manda al aire, como antes. Lo que no
  hace todavía es alargarle el viento en cola antes, como al tráfico.
- **La roja detrás de uno que remonta dura lo que dura de verdad**: a los
  170 s de `roja-de-verdad.test.ts`, que son los de quien espera a uno que
  sale por una calle, se suma en cada campo la media vuelta a `VIRA_A` y el
  remonte más largo de su tráfico a `REMONTA_A`, los veinte nudos del rodaje
  normal («Normal taxi speed is approximately 20 knots», Boeing, *737 Flight
  Crew Training Manual*, Taxi Speed and Braking).

### Lo medido

En la mesa:

- **`trafico-que-da-la-vuelta.test.ts`**: la R del grafo no se aparta ni un
  metro de la R dibujada (antes, más de nueve en cada rabo); en Los Rodeos, con una
  llegada cada noventa segundos durante quince minutos, por la 12 nadie
  vuelve por la pista y por la 30 lo más que alguien retrocede sin salir de
  la franja son 95 m, cogiendo casi parado la E4, que está trazada para la
  12; y nadie corre hacia el umbral a más de los 10,3 m/s del remonte. En
  Ayolas por la 02, el reactor que remonta tiene la pista ocupada 179 s.
- **La roja**, la más larga de 120 semillas por campo, con su límite: Ayolas
  222 s (325), La Palma 132 (226), El Hierro 120,5 (224), Encarnación 128,5
  (170), Silvio Pettirossi 112,5 (170), Los Rodeos 110 (170), Cuatro Vientos
  95,5 (170), La Gomera 87 (170) y Concepción 83,5 (170). La separación por
  la pista ocupada no mueve la de Ayolas: 222 s con ella y sin ella.

### Lo que queda

- **Los casos de El Hierro de `salida-tapada.test.ts`, sin volver a montar.**
  Cuatro pruebas se quedan sin el caso que miden: las tres que vio la H41,
  por la media vuelta a su paso, y «el caso medido: sin la regla sale el
  fallo», que se va además con el cosido de los tramos a su nudo (con el
  grafo de antes sigue saliendo). Buscado en sesenta combinaciones —las dos
  cabeceras, el JAZ 20 y el JAZ 90, los dos que salen de 300 a 700 s antes
  de tu toma con treinta segundos entre ellos y las semillas 1 a 3—: ni
  vueltas ni idas al aire con torre, ni avisos con AFIS, ni el fallo sin la
  regla; y en otras 168 —los dos que salen de 180 a 600 s antes, siete
  pares, semillas 1 a 6, con el JAZ 20 y el más grande que cabe—, ni el
  fallo sin la regla ni nada pedido con ella: el caso no se da en El Hierro
  con nada de lo probado. En el caso medido —por la 16, JAZ 20, salen a los 600 y 560 s,
  semilla 1— la frecuencia y la torre dicen lo mismo con los dos grafos;
  lo que cambia es tu rodaje: con los tramos cosidos a su nudo llegas a tu
  puesto por otro camino, a los 689 s en vez de a los 768, y ya no pasas a
  25,8 m de EC-FCB, que espera en su doble raya. Hay que buscar con
  `VER_CASO` dónde vuelve a darse el caso y montarlo ahí.
- **Dos de `de-frente-en-la-calle.test.ts` en Los Rodeos, en rojo por el
  grafo nuevo**, cada una por una de sus dos piezas (medido cambiando solo
  una cada vez):
  - «Y si ya rodaba por tu calle cuando se traza tu raya, pasa él y tu raya
    espera» se queda sin el caso: nadie llega a «pasar». Lo quita el cosido
    de los tramos a su nudo; con la R recta y sin coser, sale.
  - «Nadie de frente…» por la 12 con el JAZ 110 y EC-ADX saliendo a los 40 s
    de dejar tú la pista: 6,2 s parados de frente. Lo trae la R recta, con
    cosido o sin él; y con el cosido y la R en zigzag, el coche del sígame
    se mete en EC-ADX a 18,6 m.
  Las dos son de quien juega volviendo por la R mientras uno del tráfico
  sale por ella hacia la cabecera: la R en zigzag también movía dónde se ven
  de frente quien juega y el tráfico, y lo que se calibró con ella hay que
  volver a mirarlo con la R recta.
- **`puesto-de-salida-de-cada-campo.test.ts`** se cae en Los Rodeos, El
  Hierro y La Gomera: compara el puesto y la doble raya de quien juega con
  el fichero de `1438bc99` al centímetro, y el grafo nuevo los mueve. Es la
  caída que esa prueba pide cuando se cambia a propósito; falta mirar que
  cada cambio sea el querido y rehacer el fichero con `OGA_REHACER_SALIDAS=1`.
- **`remolque.test.ts`**: «de Los Rodeos, con pasaje, el JAZ 90 acaba con el
  morro hacia la calle: al soltarlo rueda casi recto», en rojo: la raya ya
  no pasa por el punto exacto del cruce del empuje. Y
  **`aerodromo-desplazado.test.ts`**: la misma ruta con el aeródromo corrido
  mide 95,19 m en vez de 95,80. Las dos apuntan al cosido: los cruces se
  cuentan en una rejilla fija (`clave`), y coser a un nudo que depende de
  ella deja de ser lo mismo en cualquier sitio. El cosido es la pieza
  frágil de esta enmienda: lo que hace falta de verdad es que dos cruces
  distintos a doce metros —el de la F con su chaflán y el de la R con el
  otro chaflán— no se suelden en uno, y eso queda por hacer.
- **Quien juega** detrás de uno que remonta sigue sin que se le alargue el
  circuito: la torre le manda al aire en los mínimos si la pista sigue
  ocupada. Al tráfico sí se le separa.
- **Por la 30 de Los Rodeos** el turbohélice sale por la E4, trazada para la
  12, con un viraje de casi ciento cincuenta grados, porque `llegada` la pone
  por delante de la rápida de la E3. No remonta, pero no es la que daría una
  torre.
- **El navegador**: `tenerife-norte taguato 1 jaz-90` no llegó a volar; el
  candado del navegador tenía delante dos bancos de otros encargos y el
  tope de esta tanda no daba para esperarlos.

Vitest entero, una vez, con todo lo de arriba: 541 de 546 ficheros y 10.937
de 10.978 pruebas en verde; 12 en rojo, en los cinco ficheros que se dicen
aquí (`salida-tapada`, `de-frente-en-la-calle`, `puesto-de-salida-de-cada-campo`,
`remolque` y `aerodromo-desplazado`).

## Enmienda (20-11-2026, H41c): sin cosido, y la F sin cruces falsos

### El caso

La H41b dejó la paralela de Los Rodeos recta y a nadie remontando por la
12, pero con doce pruebas en rojo, y la pieza frágil era el cosido de cada
tramo a su nudo: movía geometría en todos los campos. Se quita, y se ataca
lo que hacía falta coser.

### Lo que había en el cruce de la F

Dos cosas del nodado y de la soldadura, no de los datos:

- **Una punta que ya estaba en una calle se metía en una tercera.** El
  arranque del chaflán oeste de la F está en la R; caía a 11,5 m del
  chaflán este, y el nodado lo metía en él: el chaflán este iba de la R al
  arranque del otro y volvía a la F. Ese paso atrás de doce metros, junto al
  camino del que venía detrás por la R, era ir de frente con él.
- **Dos cruces de verdad se soldaban en uno.** El de la F con su chaflán y
  el de la R con el otro están a 11,9 m, menos que una soldadura (12 m).

### Decisión

- **Fuera el cosido.** Cada tramo empieza y acaba en su punta, como antes de
  la H41b.
- **Una punta que ya está en otra calle** —a menos de un metro— **no se mete
  en una tercera** que pasa a unos metros (`yaEnOtra` en `rodaje.ts`).
- **Dos cruces de verdad** —el mismo punto, al milímetro, en dos calles— **a
  más de media soldadura son dos nudos** (`nudoDe`, `CRUCES_DISTINTOS`). Más
  cerca, como los arranques de dos rabos a tres o cuatro metros en la R, son
  el mismo cruce dibujado dos veces. **En la pista se sueldan como siempre**:
  sin soldar, en El Hierro el JAZ 20 que para a 815 m por la 16 volvía 291 m
  por la pista para coger otra salida.
- Se quedan la R recta (`colgadasDe`), la media vuelta de la H41, la pista
  ocupada del que remonta (`ocupaLaPista`) y la roja por campo.

### El puesto de salida

`puesto-de-salida-de-cada-campo.json` se rehace después de mirar clave por
clave lo que cambia. El plan elige el par puesto–doble raya que menos rueda de
ida y de vuelta (`parDeSalida`), y lo que cambia son puestos vecinos casi
empatados, y ninguna doble raya se mueve:

| Campo | Cabecera | Aviones | Puesto | Doble raya |
|---|---|---|---|---|
| Los Rodeos | 12 | JAZ 20, 25 y 40 | 23 → 26 (81 m) | la misma |
| Los Rodeos | 12, de contacto | JAZ 90, 110 y 120 | 23 → 24 (7 m) | la misma |
| El Hierro | 16 | JAZ 20, 25 y 40 | 3A → 3 (22 m) | la misma |
| El Hierro | 16 | JAZ 50, 60 y 90 (y el 90 de contacto) | 2 → 2A (24 m) | la misma |
| Guaraní | 23 | JAZ 60 y 90 (y el 90 de contacto) | 3 → 1 (70 m) | la misma |

### Pruebas que se vuelven a montar donde está su caso

- **`remolque.test.ts`**: el empuje que se mide es el del 23, y el plan elige
  ahora el 24; se pide el 23 con `reiniciarDesde`. Su empuje es el mismo de
  antes: 39,4 m hasta el cruce, el morro a 0° de él y 5,2° de giro al soltar.
- **`de-frente-en-la-calle.test.ts`, «pasa él y tu raya espera»**: por la 05
  de Guaraní ya no se te cruza nadie en tu calle (EC-AAX, EC-ABX y EC-ACX,
  saliendo de -20 a 60 s después de dejar tú la pista); por la 23, EC-ABX a
  los 0 s sí.

Y **una punta que ya está en otra calle solo se deja de meter en una tercera
si esa tercera ya se toca con la suya** por otro sitio (`seTocan`). Sin esa
condición, el anillo de plataforma de Pedro Juan Caballero, que pasa a unos
metros del cruce de las calles que llegan a él y no tiene otra unión, se
quedaba fuera del grafo con todas sus salidas (`salidas-a-un-puesto.test.ts`).

Con eso, frente al fichero de main cambian 16 claves: las de Los Rodeos, El
Hierro y Guaraní de la tabla. Barajas y Pedro Juan Caballero quedan como
estaban.

### Lo medido

- En la mesa, Los Rodeos por la 12 con una llegada cada noventa segundos: sin
  ningún remonte (antes de la H41b, dos por tirada); lo más deprisa hacia el
  umbral, 8,1 m/s, en la curva de la salida de los 1.598 m.
- `rodar-por-el-asfalto`, `remolque`, `aerodromo-desplazado`,
  `salidas-a-un-puesto`, `trafico-que-da-la-vuelta` y
  `puesto-de-salida-de-cada-campo`, en verde con lo último.
- Construir el grafo de Barajas: 75 ms antes de la H41b y 121 ms ahora, en
  el portátil y con una tanda de vitest al lado. La caja de cada calle en
  `yaEnOtra` no cambia nada del grafo (la misma huella en los 19 campos) y
  tampoco ese tiempo: lo que cuesta está en otra parte, y en una tablet no
  se ha medido. Es al montar el campo, no en cada fotograma.

### Lo que queda

- **«Nadie de frente…» en Los Rodeos**, por la 12 con el JAZ 110 y EC-ADX
  saliendo a los 40 s: 6,2 s parados de frente. No es la R ni la F. Con la R
  recta, la raya pide en ella la velocidad de recta larga, 30 kt (15,4 m/s;
  `rectaLarga` en `velocidades-en-tierra.ts`), donde el zigzag la dejaba en
  5,1 m/s; quien juega llega 35 s antes a la Z y se encuentra a EC-ADX recién
  salido del 23, parado a 37 m de su camino, mirando hacia él. Su raya se
  corta a 67,7 m de él y él no se mueve —sin ceder ni esperar tramo— hasta
  que, siete segundos después, se le marca «de frente» y recula. Qué lo tiene
  parado esos siete segundos no está aislado: es una espera de los dos que
  ya estaba ahí y que la llegada antes ha destapado.
- **`remontar-por-tipo.test.ts`**: en El Hierro, el JAZ 40 con 4 m/s de cola
  ya no remonta: entra por intersección. Sin mirar si la entrada que coge ahora
  le deja de verdad la pista que pide.
- **Las tres de El Hierro de `salida-tapada.test.ts`** que vio la H41, por la
  media vuelta a su paso: siguen sin su caso. El caso medido sí vuelve a salir.
- **El navegador**: el candado seguía ocupado por la ronda; no se voló.

## Enmienda (20-11-2026, H41d): el remolque que barría tu raya, la 3A con cola y los casos de El Hierro

### Los siete segundos de Los Rodeos eran un remolque

EC-ADX es un reactor del tráfico en un puesto de contacto, el 23, y sale
empujado por un tractor. Anunciado a los 40 s de dejar tú la pista, acaba de
empujar a los 146 s de la tirada, con 37 m de su camino hechos, y desde ahí
sigue con el tractor puesto: el freno (4 s), soltarlo (8 s), el tractor que
se aparta, la persona que va a su sitio y el pasador y el saludo (6 s). Son
43 s parado, hasta los 189 s. En ese rato:

- **No cede ni espera tramo** porque no rueda: `empujar` le pone a cero lo
  cedido y lo esperado, y `repartirLosTramos` no lo mira mientras lleva
  remolque. Por eso `frenteATi` es nulo.
- **Lo que barre el empuje sigue siendo suyo** (`zonaDelEmpuje`, ADR 0025),
  también para ti: tu raya se corta antes (`tramosQueTienen`, marcada
  `empuja`), y te paras a 67,7 m de él a los 183 s.
- **Al saludo queda libre** mirando hacia donde va a rodar, que es tu calle
  de frente; los dos estáis ya dentro del camino del otro, se le marca
  «frente» y recula. De los 183 a los 189 s, parados y mirándoos: los 6,2 s.

Lo que lo destapa es la R recta: a 15,4 m/s llegas 35 s antes que con el
zigzag, que te dejaba en 5,1 y te hacía llegar después del saludo. Lo que
estaba mal es la autorización del empuje: `calleLibreParaEmpujar` miraba
dónde estás tú y `porDondeVa`, los metros de tus próximos segundos —como
mucho cuatro veces tu velocidad, unos 60 m a treinta nudos—, y no la raya
entera que el control ya te había dado. El empuje empezó contigo a cientos
de metros, y un empuje con su saludo coge la calle más de un minuto.

### Decisión

- **No se autoriza un remolque cuya zona toca tu raya** (`EnTierra.ruta`),
  en `calleLibreParaEmpujar`. Es lo que ya decía su comentario —el que rueda
  por detrás del puesto pasa primero— y lo que hace el control de tierra: no
  aprueba un «pushback» hacia la calle por la que acaba de mandar rodar a
  otro. Espera enganchado, sin baliza, a que pases.
- **No deja a nadie esperando al otro**: enganchado y sin empezar, no
  reserva nada (`empujando` es falso) y tu raya no se corta por él.

### El JAZ 40 en El Hierro con cola: la intersección se la da

Por la 34, con 4 m/s de cola, pide 740,7 m (606,3 un día de tablas; ADR
0027, la de su manual con el 1,33 de escuela). Desde la 3A se entra en la
pista por los dos chaflanes de la C: el que mira hacia donde se despega llega
al eje con 724,9 m por delante, y el que mira a la cabecera, 23 m más atrás,
con 748,1. Ninguno le va bien sin media vuelta —por el primero hay que
remontar; por el segundo se llega mirando a la cabecera— y entre dos así
`bocaDeEntrada` coge el de menos rodaje. Con el grafo de main ganaba el
primero, y remontaba; con el de la H41c gana el segundo, y con la media
vuelta dada queda alineado a unos 744 m del final, que le bastan.

La prueba pedía el remonte por los 23 m de un empate de rodaje, no por la
pista. Ahora mira el remonte con 5 m/s de cola, que piden 776,4 m y no se los
da ningún chaflán (con 4,5 m/s ya son 758,4 y también remonta), y con 4 m/s
que la pista que tiene por delante, salga por donde salga, le basta y que
dice que es por el viento.

### Los casos de El Hierro de `salida-tapada.test.ts`

Buscados con el banco de la propia prueba:

- **Con torre**, 192 tiradas: las dos cabeceras, el JAZ 20 y el JAZ 90, doce
  parejas de salidas de los 700 y 660 s a los 160 y 120 s antes de tu toma, y
  las semillas 1 a 4. Solo hay vuelta con los dos saliendo a los **560 y
  530 s**: por la 16 con el JAZ 20 (semillas 3 y 4) y el JAZ 90 (3), y por la
  34 con el JAZ 20 (3). Las demás, ni vuelta ni aire.
- **Sin dar la vuelta y con AFIS**, de los 580/550 a los 540/510 y con las
  semillas 1 a 4: con 560/530 y la semilla 3, por las dos cabeceras, la
  vuelta pedida y no dada acaba en el aire, y el AFIS avisa y propone irse.

Las tres pruebas vuelan ahora también los 560 y 530 s
(`SALEN_EN_EL_HIERRO`), y vuelven a medir lo que dicen: «lo que se pide es
real» con torre, «te vas al aire» sin dar la vuelta, y el aviso y la
propuesta del AFIS. Encarnación sigue con las cuatro de siempre. No se ha
quitado ninguna.

### Lo medido

- `de-frente-en-la-calle.test.ts`, Los Rodeos por la 12 con el JAZ 110 y
  EC-ADX a los 40 s: 0 s de frente, lo más cerca 77,1 m (la separación es
  54,6) y se llega al puesto. Los doce casos de Los Rodeos, en verde.
- `remolque.test.ts` y `recula-de-frente.test.ts`, en verde.
- `remontar-por-tipo.test.ts` y las tres de El Hierro de
  `salida-tapada.test.ts`, en verde, y «el caso medido: sin la regla sale el
  fallo» sigue saliendo.
- Vitest entero, una vez, con todo lo de arriba: 547 de 547 ficheros y
  10.969 pruebas en verde y 29 saltadas, ninguna en rojo, en 1.092 s con
  dos hilos.

### Lo que queda

- **El navegador**: `tenerife-norte taguato 1 jaz-90` no se voló; el candado
  tenía en cola otros tres bancos y no cabían en el tope de esta tanda.

## Enmienda (20-11-2026, H41e): la boca que mira a la cabecera es de remontar

### Lo que pasaba

En El Hierro, por la 34 y con 4 m/s de cola, el JAZ 40 pide 740,7 m. Desde
la 3A se llega a la pista por los dos chaflanes de la C: el que mira hacia
donde se despega llega al eje con 724,9 m por delante, y el que mira a la
cabecera, 23 m más atrás, con 748,1. `bocaDeEntrada` no veía bien ninguno
—el primero se queda corto y el segundo llega al revés— y cogía el de menos
rodaje, el segundo. Desde él la pista bastaba, así que no había remonte: se
entraba mirando a la cabecera, se rodaban unos diez metros pista abajo hacia
ella, se daba la media vuelta y se despegaba con unos 744 m. La radio lo
llamaba salida por intersección, y la torre la ofrecía rodando con su TORA.

Lo que se decía no era lo que se hacía (regla 4). Rodar por la pista en
sentido contrario al del despegue es remontar —«backtrack», Doc 4444,
12.3.4.7 p; «regreso por pista» en la fraseología española, RD 1180/2018,
anexo V, 1.4.8, la que ya cita `vueltaDelBackTaxi`—, aunque sean diez metros.
Y esos 748 no son la pista de la intersección de la C: la de la C es la del
chaflán que mira hacia donde se despega, la que se tiene sin volver atrás.
Un control de verdad, a quien le pide la C y no le basta, le autoriza a
remontar, y quien remonta entra por el chaflán que mira hacia donde va a
rodar, que es la cabecera.

### Decisión

- **Una boca a la que la calle llega mirando a la cabecera es de remontar**
  (`remontaPorLaBoca` en `bocaDeEntrada`), aunque la pista que tiene por
  delante bastara: para despegar desde ella hay que rodar por la pista hacia
  atrás. El criterio es la geometría: el mismo coseno de la calle con el
  rumbo de despegue que ya decide qué boca va «bien», al revés (≤ −0,2).
  Nada de El Hierro.
- **Y desde ella se remonta como se remonta** (`vueltaDelBackTaxi` con
  `porLaBoca`): el de línea hasta el final, la avioneta su trozo; y si el
  trozo quedaría a menos de 100 m de la boca, o por delante de ella
  (`REMONTE_QUE_SE_ENTIENDE`), hasta el final, que un lazo pegado a la
  entrada es otra vez el de Pilar. Si ni así queda nada que remontar —se
  entra ya en la cabecera—, la boca sigue como estaba.
- **Solo gana a las bocas que llegan mal.** Una que llega bien, para
  entrar y despegar o para remontar, va antes que una al revés, y entre dos
  que llegan bien sigue mandando el rodaje más corto. Así la elección solo
  cambia donde antes ninguna boca iba bien.
- **Lo que se dice sale de ahí, sin frases nuevas.** `comoSeSale`,
  `comoSeSaldraDesdeLaEspera` y `pistaParaRemontar` hacen la misma cuenta,
  así que rodando no se ofrece la intersección y con la verde se dice
  remontar: «request backtrack» en la tira y «backtrack runway three four»
  de la torre (`torre.canario.backtrack`, grabada), y la instructora
  «vuelo.remontar.cola».

### Lo medido

Con un piloto perfecto, del puesto a la carrera, la 34 de GCHI y el JAZ 40
(`remontar-por-el-chaflan.test.ts`, y la misma cuenta suelta):

- **Con 4 m/s de cola** pide 740,7 m. Rodando se sabe ya que remonta, desde
  la 3A con 748,1 m desde la entrada; con la verde, remonte hasta el final
  y por la cola. Pisa el asfalto con 739 m por delante, va hacia la cabecera
  hasta tener 1.229, da la vuelta allí (giro a 37 m de la punta) y suelta
  frenos con 1.217,9 por delante. Antes, la misma prueba daba «interseccion».
- **Con 5 m/s** pide 776,4 y hace lo mismo, como antes.
- **Sin cola** pide 606,3: sale de la C por el chaflán que mira hacia donde
  se despega, se dice intersección con 724,9 m, y no va hacia atrás ni un
  metro (pisa con 736,1 por delante y suelta con 717,6).
- **Lo que se dice es lo que se rueda** en El Hierro, La Gomera y Pilar, con
  cada avión que cabe y por las dos cabeceras: quien sale desde la cabecera
  o una intersección va hacia atrás por el asfalto menos de 5 m (cruzar el
  borde por una calle que no llega a escuadra), y quien remonta, más de 100.
- **La herradura de Pettirossi sin el otro ramal** (`entrada-al-reves.test.ts`)
  ya remonta: la media vuelta que llega al revés se da en la cabecera de la
  02, en fase de back-taxi, y la ayuda de Guyrami la toma igual. La prueba
  mira ahora esa vuelta, con el tope de seis metros por segundo de
  `back-taxi-vuelta.test.ts`.
- `remontar-por-tipo.test.ts` pide ahora el remonte con 4 m/s, y su
  comentario ya no cuenta el empate de rodaje de la H41c. Con ella,
  `por-donde-se-sale-en-la-roja.test.ts`, `back-taxi.test.ts` y
  `back-taxi-vuelta.test.ts`, en verde.
- Vitest entero, una vez: 553 de 553 ficheros y 11.085 pruebas en verde y
  29 saltadas, ninguna en rojo, en 1.115 s con dos hilos. Ahí van
  `salida-tapada.test.ts` y los de Los Rodeos.

### En el navegador

`verificar-despegue.mjs el-hierro taguato "" jaz-40` con
`OGA_URL_EXTRA='&metar=GCHI 201200Z 15005KT CAVOK 37/10 Q1013'` (y `42/10`
en la tercera tirada). Cuatro
metros por segundo de cola no se pueden pedir en el juego: con más de cinco
nudos la 34 deja de ser la preferente y se opera por la 16
(`COLA_QUE_SE_AGUANTA`), así que se aprieta con el calor: cinco nudos de
cola y 37 °C, con los 1.945 kg de la hoja de carga, piden unos 722 m, al
borde de los 724,9 del chaflán que mira hacia donde se despega. El banco
cuenta ahora dónde pisa el avión la pista, lo más atrás que va, dónde suelta
frenos, lo que decide el plan y lo que se dijo.

- **Primera tirada, 20 de 20**, con 37 °C. La torre dijo
  `torre.canario.backtrack` y nada de intersección ni de TORA. Pero el piloto del banco, ya en la pista
  y todavía en «autorizado», apuntaba al rumbo de despegue: se alineó en la
  boca —pisó con 739 m por delante y soltó frenos con 708— y el juego, donde
  el hecho gana al plan si queda la pista que el avión necesita sin márgenes
  (`deducir` en `flight/vuelo.ts`), lo dio por despegue. Lo dicho era
  remontar y el que no remontó fue el banco: ahora, con un remonte trazado,
  sigue la raya por la pista también en «autorizado».
- **Segunda tirada, 20 de 20**, igual, con el banco ya siguiendo la raya, sin
  tráfico y la verde a los 10,8 s: el plan dice intersección, pide 722 m y
  la C le da 725. Entra por el chaflán que mira hacia donde se despega y no
  va ni un metro hacia atrás (pisa con 739 por delante y lo más atrás es eso
  mismo). La torre no dijo nada de la salida: con la verde no se ofrece, y
  el rodaje fue de 71 m. En la primera, con la verde a los 287,6 s, la
  torre dijo remontar; lo que pedía el plan entonces no se leyó: el banco lo
  leía con la carrera ya empezada, cuando ya se ha borrado.
- **Tercera tirada, 20 de 20, el caso**: a 42 °C pide 734 m, entre los
  724,9 de un chaflán y los 748,1 del otro. El plan dice remonte hasta el
  final, desde la entrada 748 y 1.217 por delante, por la cola. Entra por el
  chaflán que mira a la cabecera (pisa con 740 por delante), rueda por la
  pista hasta tener 1.232, da la vuelta en el giro de la cabecera (a 37 m de
  la punta) y suelta frenos con 1.213. Se dijo `torre.canario.backtrack` y,
  de la instructora, `vuelo.backTaxi`; nada de intersección ni de TORA.
- **Y una cosa que se vio de paso**: en la intersección el avión suelta
  frenos con menos pista de la que dice la torre —708 m en la segunda
  tirada, 717,6 con el piloto perfecto, frente a 725—, porque la vuelta
  para ponerse en el eje se come unos metros pasado el nudo. Le sobra con
  el margen de escuela, pero no es la TORA que se cuenta.

## Enmienda (20-11-2026, H47): el empuje del 24 de Los Rodeos, que acababa atravesado

### El caso

El banco de la tripulación de línea (`verificar-inicio-3.mjs`, Los Rodeos a
La Palma con el JAZ 90, por la 12) pasó de 126 de 126 en la tanda 19 a 125
de 126 en la tanda 20. Lo que cayó es que el empuje deje el avión con el
morro hacia la raya:

| Tanda | Puesto | Empujado | Giro | Rumbo al acabar | Gira rodando los primeros 30 m |
|---|---|---|---|---|---|
| 19 (3cff2357) | 23 | 90,5 m | 140°, radio 11,5 m | 217° | −8° |
| 20 (92b3d1ba) | 24 | 33,8 m | 90°, radio 11,5 m | 166° | 78° |

En un aeropuerto de verdad el tractor deja el avión parado en la calle, con
el morro hacia donde va a rodar, y la tripulación arranca recto. Con 78° en
los primeros treinta metros, el avión salía atravesado a la raya.

### Por qué

El remolque no cambió: cambió el puesto. Desde la H41c el grafo no suelda
los cruces, y el 24, a siete metros del 23, pasó de tener una raya con un
quiebro de ida y vuelta a los 85 m a tener una limpia: 90 m rectos por la
plataforma (rumbo 256°) y una curva hacia la Z cuyos tramos se apartan 6°,
20°, 35° y 49°. Sale unos metros más corto y el plan lo elige (`parDeSalida`;
la tabla de «El puesto de salida» de la H41c). La H41c llevó la prueba de
`remolque.test.ts` al 23 con `reiniciarDesde` y dejó escrito que «de él se
sale de frente»: era esto.

`trayectoriaDelEmpuje` busca la calle donde la raya tuerce más de cuarenta
grados (`LA_CALLE_TUERCE`, mirando treinta metros por delante desde cada
punto) y, si la raya sale de espaldas por la plataforma, la busca hasta donde
acaba su recta —cada tramo a menos de 5° de la salida— más un metro
(`RECTA_DE_LA_PLATAFORMA`). Desde el 24:

- la recta acaba a los **90 m**, con el tramo de 6°;
- la calle se busca hasta los **91 m**;
- en el punto de los 90 m, lo que viene por delante va a 39,6°; en el de los
  **94 m**, a 46,7°: la calle cae tres metros fuera;
- y sin calle se empuja «de frente»: el cruce a medio largo de avión y quince
  metros (29 m), noventa grados de giro, y el avión atravesado.

Desde el 23 la misma cuenta salía por un metro: la recta acaba a los 96 m
justo en la esquina, y los cuarenta grados se ven en ese mismo punto. El
metro de más contaba con que la raya tuerce en una esquina, y tuerce en una
curva de varios puntos.

### Decisión

**La calle se busca en la curva entera con la que acaba la recta**: hasta
`MIRA_LA_CALLE` (30 m, lo que ya se mira para saber hacia dónde va la calle)
más allá del final de la recta, si la recta cabe en la plataforma. Si es más
larga que `RECTA_DE_LA_PLATAFORMA`, como antes. El tráfico, que busca la
calle sin la recta de la plataforma (`porLaPlataforma` en falso), no cambia.

Desde el 24, con el JAZ 90: **91,7 m empujado, 133° de giro con radio
11,5 m y el morro a 209°**, con el cruce 35 m por delante y la raya que sigue
desde él a 0°. Con el JAZ 110 y el JAZ 120, 78 m, 133° y radio 25,8 y 25,6 m.
El 23 queda como estaba: 90,5 m, 140° y 217°.

No se toca nada de la H41b a la H41d: la R recta, los cruces sin soldar, el
puesto que elige el plan y el remolque que espera a que pases siguen igual.

### La prueba

`empuje-hasta-la-calle.test.ts` mira la raya y no la regla del empuje: si
sale del puesto de espaldas, sigue recta —a menos de 3 m de su primera
dirección— como mucho `RECTA_DE_LA_PLATAFORMA`, y antes de `MIRA_LA_CALLE`
más allá ya va a más de cuarenta grados (mirado metro a metro sobre treinta
metros, que un quiebro corto que vuelve no es una calle), el empuje tiene que
acabar con el morro **a menos de 5°** de donde sigue la raya y con la calle
por delante. Se mira con el JAZ 90 desde todos los puestos de contacto, por
las dos cabeceras de cada campo con pasarelas —a cualquiera se puede llegar,
y de cualquiera se sale empujado (`salirEmpujadoDeDondeSeLlego`)—, y con los
tres reactores desde el que elige el plan. Y aparte, que el de este banco es
de esos.

Sin el arreglo se cae en cinco campos —Pettirossi, Los Rodeos, La Palma,
Tenerife Sur y Gran Canaria—, con el morro a 77–90° de la raya, y en la de
Los Rodeos del banco, a 90°. Con él, en verde, en unos 25 s con dos hilos.

La prueba de Los Rodeos de `remolque.test.ts` vuelve a medir el puesto que
elige el plan, el 24, y también el 23.

### Lo medido

- **Todos los empujes de contacto**, con un barrido fuera del repositorio: los
  tres reactores, las dos cabeceras y cada puesto de contacto de los siete
  campos donde se sale empujado, 678 empujes. Salían de frente 235 y salen
  213: **22 acaban ahora en su calle** en lugar de a 77–90° de ella —el 24
  de Los Rodeos por las dos cabeceras con los tres; el 17 de Los Rodeos; el
  6A y el 5 de La Palma; el G10 y el H37 de Tenerife Sur por la 25 con los
  tres; el T11 de Gran Canaria por la 03L con los tres, y el M01 y el M03—, y
  ninguno de los que ya acababan en su calle cambia. De los puestos que elige
  el plan, salían de frente 23 y salen 19: Los Rodeos por la 12 con los tres
  y Pettirossi por la 02 con el JAZ 90.
- **Vitest de lo tocado**, 21 ficheros del remolque, el tráfico empujado, el
  puesto de salida y el rodaje: 539 pruebas en verde.
- **Vitest entero**, una vez, con el arreglo: 554 de 554 ficheros y 11.083
  pruebas en verde y 29 saltadas, ninguna en rojo, en 1.243 s con dos hilos
  y el banco del navegador volando al lado.
- **El navegador**, `verificar-inicio-3.mjs` una vez con el arreglo y con el
  vitest entero al lado: lo del remolque, en verde —**91,7 de 91,7 m
  empujado, giro 133° con radio 11,5 m, rumbo al acabar 209° y −5° en los
  primeros treinta metros rodando**, y las fases en su orden—. El vuelo no
  llegó al puesto de La Palma: con la máquina cargada se acabó el tope de
  pared de 1.800 s en la recogida, a los 2.120 s de reloj del juego (la tanda
  19 apagaba a los 2.455), y caen las 48 comprobaciones de lo que pasa
  después o se cuenta al final: 77 de 125. Hasta la recogida, las fases de la
  tripulación salen con pocos segundos de diferencia con la tanda 19, salvo
  que no se apunta «crucero» entre la subida y la bajada (en la tanda 19 duró
  23 s de juego) y la final empieza a los 1.760 s y no a los 1.935. No se
  volvió a volar: no cabía en el tope de esta tanda. Los otros bancos de
  rodaje (`npm run -s rodaje` y `ver-rodaje-y-cambios.mjs`) no se volaron: el
  candado del navegador estuvo ocupado por otros bancos los veinte minutos que
  quedaban.

### Lo que queda

Lo que sigue saliendo de frente es la raya que no tuerce cerca, y el empuje
la deja atravesada a propósito (ADR 0025): se gira noventa grados y lo demás
lo rueda el avión. Con los puestos que elige el plan:

- **La recta de más de 120 m**: Los Rodeos por la 30 desde el 13 (132 m de
  recta y la calle a los 142) con el JAZ 90 y el JAZ 110, y desde uno sin
  número con el JAZ 120 (138 y 149); Tenerife Sur por la 07 desde el H43 (124
  y 128) y por la 25 desde el J8 (156 y 160), con los tres reactores. Es el
  tope de `RECTA_DE_LA_PLATAFORMA`: llevarlo a unos 160 m las metería en su
  calle, con empujes de dos minutos y medio. Es una decisión del ADR 0025 y
  aquí no se ha tocado.
- **La recta que acaba en un quiebro y tuerce lejos**: Pettirossi por la 20
  desde el 6 (113 m de recta, la calle a los 234), La Palma por la 36 desde
  el 7 (56 y 114) y Lanzarote por la 03 desde el T2 (124 y 276). Ningún
  empuje puede dejar ahí el morro hacia la raya sin llevar el avión hasta la
  curva.
- **El reactor grande con la calle muy cerca**: el morro acaba hacia donde va
  la raya, pero al lado de ella, porque ni con setenta grados de rueda el giro
  cabe: 7 m en La Palma por la 18 desde el 10, 14 m en Lanzarote por la 21 y
  20–24 m en Barajas desde el 329, con el JAZ 110 y el JAZ 120.

## Enmienda (20-11-2026, H47b): el empuje sigue la raya hasta la calle

### El caso

Lo que dejó la H47 en «Lo que queda»: de los puestos que elige el plan, 19
empujes salían «de frente» —noventa grados a medio camino y el avión
atravesado a la raya— y los reactores grandes acababan con el morro bien
pero al lado de ella. De verdad, el tractor deja el avión parado sobre la
línea de rodaje, con el morro hacia donde va a rodar, y la tripulación
arranca recto; si el puesto no lo permite con un empuje corto, el empuje
sigue la línea pintada hasta la calle.

### Por qué

Tres causas, una por grupo:

- **La recta de más de 120 m.** `RECTA_DE_LA_PLATAFORMA` dejaba fuera la
  calle de Los Rodeos por la 30 desde el 13 (132 m de recta, la calle a los
  142), la del puesto sin número con el JAZ 120 (138 y 149) y las de
  Tenerife Sur desde el H43 (124 y 128) y el J8 (156 y 160).
- **El quiebro.** La raya sale recta, se tuerce poco y sigue: Pettirossi
  desde el 6 va 113 m recta, 110 m más a 34° y tuerce a los 234; La Palma
  desde el 7 hace a los 56 m un quiebro de 15 m de lado y tuerce a los 114
  (la raya acaba a los 119); Lanzarote desde el T2 va 124 m recta, se
  aparta 17 m, sigue 91 m a 3° y tuerce a los 276. Ni la recta ni la
  búsqueda de los cuarenta grados llegaban.
- **La cuerda.** La calle era la dirección de los treinta metros siguientes
  al primer punto donde la raya se aparta más de cuarenta grados, y ese
  punto es el principio de la curva: dentro de ella la cuerda va a medio
  torcer. En La Palma desde el 10 por la 18 la raya tuerce 90° en una curva
  de 29 m y la cuerda iba a 45°; el JAZ 110 tenía que girar 134° hacia una
  calle que no existe, con el cruce en el principio de la curva, a 12 m de
  su centro, y ni con la rueda a setenta grados (radio 9,4 m, 22,7 m de
  tangente) le cabía: acababa a 7 m de la raya. Lo mismo en Lanzarote por
  la 21 y en Barajas desde el 329 por la 18. Y lo mismo, más pequeño, en
  casi todos los puestos con la raya en curva: el morro mirando a mitad de
  la curva, 10–15° torcido respecto a la calle de verdad.

### Decisión

En `trayectoriaDelEmpuje`, para el empuje de quien juega
(`porLaPlataforma`) y con la raya saliendo del puesto de espaldas:

1. **La calle es la raya cuando ha acabado de torcer.** Desde el primer
   punto que tuerce, se sigue la curva hasta `MIRA_LA_CALLE` más allá y la
   calle es el primer punto desde el que ya no se aparta más; el avión
   acaba en el eje de lo que sale de la curva, por detrás de ella.
2. **Si tuerce más lejos que la recta de la plataforma, el tractor sigue la
   raya** (`SIGUE_LA_RAYA`, 300 m; `siguiendoLaRaya`): con sus quiebros,
   hasta un largo de avión antes de la curva, y desde ahí la recta, el arco
   y la recta de siempre. Trescientos metros son cinco minutos a paso de
   persona; más allá, la raya es una calle que sale de frente.
3. **Y si así acaba a más de un largo de avión de la raya, gira cerrado.**
   Con una curva ancha, la calle que sale de ella se cruza con la recta que
   llega lejos de la propia curva: desde el T2 de Lanzarote el JAZ 90
   acababa a 33 m de la raya, más que su largo, que es lo que exige
   `remolque-en-cada-campo.test.ts`. Con la rueda a setenta grados, 27.

No cambia: el empuje del tráfico, que se empuja corto; la raya que sale del
puesto de lado; la media vuelta, que no se empuja; ni nada de la H41b a la
H47 —la R recta, los cruces sin soldar, el puesto que elige el plan y el
remolque que espera a que pases—. Sí cambia dónde acaban los empujes que ya
acababan en su calle, porque ahora miran a la calle de después de la curva y
no a la mitad de ella: el 24 de Los Rodeos por la 12, con el JAZ 90, pasa de
92 m y 133° a 99 m y 125°; el 23, de 90,5 m y 140° a 106 m y 124°.

### La prueba

`empuje-hasta-la-calle.test.ts` mira ahora también, **desde el puesto que
elige el plan**, con los tres reactores y por las dos cabeceras de cada campo
con pasarelas, que el avión acabe sobre la raya y mirando por ella. Se mide
por delante del morro, sin la regla del empuje: de los 150 m de raya que
tiene delante, el sitio que queda en su eje —a menos de 3 m— con la raya más
alineada con el morro, que tiene que torcer menos de 5° en sus quince metros
siguientes. Queda fuera solo la raya que sale del puesto de lado; y de la que
tuerce debajo del avión —deja de ir recta más cerca del puesto que el tren
principal— se mira solo el morro (ver «Lo que queda»).

Y el barrido de la H47 vive ahora en el mismo fichero:
`OGA_BARRIDO_DEL_EMPUJE=1 npx vitest run empuje-hasta-la-calle` saca la
tabla de todos los empujes de contacto —los tres reactores, las dos
cabeceras y cada puesto de contacto, 678—, medidos igual. Tarda minuto y
medio con dos hilos.

### Lo medido

- **El barrido**, con la medida de arriba, que es más estricta que la de la
  H47 (aquella comparaba con la cuerda y daba por buenos los morros a mitad
  de curva):

  | | Antes (cc0a35b5) | Después |
  |---|---|---|
  | Sobre la raya y mirando por ella | 121 de 678 | 539 de 678 |
  | Atravesados, más de 60°, sin contar los que salen de lado | 106 | 18 |
  | Torcidos 5–60°, ídem | 338 | 4 |
  | Bien orientados pero a más de 3 m, ídem | 0 | 4 |
  | Salen de lado, sin arreglar | 113 | 113 |
  | **Del puesto que elige el plan** | **11 de 42** | **41 de 42** |

  Ninguno de los que estaban bien pasa a estar mal. Los del plan que se
  arreglan, con el JAZ 90: Los Rodeos por la 30 desde el 13, 152 m y 114°;
  Tenerife Sur desde el H43, 133 m y −125°, y desde el J8, 160 m y 135°;
  Pettirossi desde el 6, 247 m y −102°; La Palma desde el 7, 118 m y 115°,
  y desde el 10, 58 m y −91°; Lanzarote desde el T2, 290 m y −89°. Con el
  JAZ 110 y el JAZ 120, La Palma desde el 10, 52 m y −91° a 0,2 m de la
  raya; Lanzarote por la 21, 38 m y 91°, a 0,2 m; Barajas desde el 329 por
  la 18, 23 m y −91°, a 2 m. La H47 los medía a 7, 14 y 20 m.
  De los 539 que salen bien, 4 son de la raya que tuerce debajo del avión:
  miran por ella, pero a su lado (ver «Lo que queda»).
- **Vitest de lo tocado**: los 12 ficheros del remolque, el tráfico
  empujado, el puesto de salida, el rodaje y la vuelta a la raya, 305
  pruebas en verde.
- **Vitest entero**, una vez: 555 de 555 ficheros y 11.125 pruebas en verde
  y 30 saltadas —una, el barrido—, ninguna en rojo, en 1.121 s con dos hilos.
- **El navegador**, `ver-remolque-de-quien-juega.mjs` una vez en Los Rodeos
  con el JAZ 90 y el viento del 300 (`OGA_VIENTO`, que el banco acepta desde
  esta tanda), con la tarjeta Intel: sale del 13, **152 de 152 m empujado,
  giro de 114° con radio 11,5 m, rumbo al acabar 112°, y gira 11° en Guyrami
  y 0° en el de cabina en los primeros treinta metros rodando** —antes, 34 m,
  noventa grados y atravesado—; ningún fotograma dentro de un edificio, y
  las fases en su orden. Cae una cosa del de cabina: en la tira de la radio
  no se ven la autorización de la ruta, el permiso de la torre ni el
  «empezamos a empujar»; sí los dos últimos de la persona de tierra y, en su
  lugar, un «cleared to land» de la 30. Son frases de antes de empujar o del
  arranque del empuje, que no dependen de su forma; con la 30 hay tráfico
  aterrizando y la torre está hablando. No se voló el mismo banco sin el
  arreglo para compararlo: por la 30 no se había volado nunca.

### Lo que queda

- **La raya que tuerce debajo del avión**: Barajas desde el 329 por la 36
  con el JAZ 120, que es del plan. La raya va 15 m recta y tuerce a −58° en
  una curva; el tren principal está a 25,6 m de la rueda de morro, así que
  la calle pasa entre los dos, y el morro tiene que acabar mirando hacia
  donde va: 118°, con el centro a 6 m de la calle y alejándose de ella en
  todo empuje que gira hacia ese lado. Ningún empuje de menos de media
  vuelta lo deja en ella: acaba con el morro bien (4°) y a 11 m de la raya
  (antes, 19–24). Igual el 306 de Barajas con los dos grandes, que no lo
  elige el plan: a 6–7 m. Un tractor de verdad lo resolvería empujando y
  volviendo a tirar, que aquí no se hace.
- **La raya que sale de lado**: Barajas desde el 560 por la 36 con el JAZ
  110, del plan, 26 m al lado y 9° torcido. La raya pasa por delante del tren
  principal, a lo largo de la fachada; no se ha tocado.
- **La raya que sigue alejándose del edificio**: con un tramo largo a menos
  de cuarenta grados de la salida, el avión tendría que girar más de media
  vuelta para mirar por ella, y se sigue empujando de frente. Son los 18
  atravesados del barrido, ninguno del plan: Lanzarote desde el T6 y el T7
  y Barajas desde el 350, el 370 y el 562. Y cuatro con un quiebro de lado
  que sigue recto, Barajas desde el 346 y el 368 con los grandes, que
  acaban mirando al quiebro.
- **Empujes largos**: desde el T2 de Lanzarote, 290 m, casi cinco minutos;
  desde el 6 de Pettirossi, 247; desde el J8 de Tenerife Sur, 160. Es lo
  que da la raya de OpenStreetMap, que no trae las calles de servicio de la
  plataforma; con ellas el empuje sería más corto.

## Enmienda (20-11-2026, H48): la roja sin porqué y la radio de tierra que se perdía

Dos fallos de la ronda de la tanda 20 en Los Rodeos con el JAZ 90.

### La radio de tierra por la 30

**El caso.** `ver-remolque-de-quien-juega.mjs` con el viento del 300 (el de
la enmienda H47b), en el peldaño de cabina: en la tira no salían la
autorización de la ruta, el «pushback and start-up approved» ni el «Cabina,
tierra: empezamos a empujar»; sí los dos últimos de la persona de tierra.

**Es del juego, y no de la tanda 20.** El banco escribe ahora, cuando falta
algo, la tira entera con su hora y si el reparto la tiene esperando sitio. Se
reprodujo a la primera (código de main, 50dce346):

- a los 17 s, la bienvenida de la comandante —casi cuatrocientas letras— se
  escribe y el reparto la deja esperando sitio; a los 42 s lo tiene, a los 44
  lo vuelve a perder, y **espera hasta el segundo 111**;
- esperando sitio, su reloj no corre (ADR 0030, enmienda H28g), así que no
  suelta el turno: tus tres frases, pedidas al pedir el tractor y al echar a
  andar, esperan detrás;
- la cola guarda tres y tiraba la más vieja (b25b2120); llegan del tráfico de
  la 30 «viento en cola», «rodando a la cabecera» y «hold short», y echan a
  las tuyas. Al soltarse la bienvenida se escriben esas tres, de otros.

Por la 12 hay menos tráfico hablando mientras se empuja y las tuyas salían
detrás de la bienvenida: es lo que medía el banco hasta ahora. No empieza en
ningún commit de la tanda 20: es la suma de la cola de tres (b25b2120) y la
espera de sitio sin tope (0e80796a), y por la 30 no se había volado nunca.

**Decisión** (`ui/cola-de-la-radio.ts`):

1. **Si no caben, sobra antes lo de los demás.** Lo que se oye para otro es
   ambiente; lo tuyo es lo que tienes que hacer. Se va lo de otros
   (`paraTi: false`) de lo más viejo a lo más nuevo, y solo sin nada de eso,
   lo más viejo.
2. **La que espera sitio guarda su turno diez segundos**, no para siempre:
   con otras detrás, pasado `ESPERANDO_SITIO_COMO_MUCHO_MS`, deja pasar a la
   siguiente, que suele caber donde ella no. Es un candado entre la tira y el
   reparto, y le faltaba la red.

**La prueba**: `cola-de-la-radio.test.ts` monta la cola con las mismas frases
y en el mismo orden que el banco, y mira la red de la espera de sitio.

### La roja que no daba la verde

**El caso.** `verificar-despegue.mjs tenerife-norte guyrami "" jaz-90`, 21 de
22: parado en la doble raya, la torre no dio la verde en quince segundos, con
la lámpara roja y sin porqué.

**No se reprodujo.** Una tirada con el código de main y las sondas de abajo:
22 de 22, verde a los 55 s detrás de EC-LQN, que despegaba. Las tiradas del
mismo banco en las rondas anteriores dan lo mismo que el sorteo del tráfico:
3,5 y 10,8 s sin nadie por medio; de 27 a 96 s detrás de uno que despega. Lo
de la tanda 20 que toca la torre —la R recta, los cruces, la media vuelta, el
remonte y el remolque que espera— cambia quién hay en la frecuencia al llegar
a la raya, y no la cuenta de la verde (`atenderALaTorre` en `flight/vuelo.ts`
no se tocó). Sin reproducirlo no se puede decir en qué commit empieza, ni si
empieza en alguno.

**Lo que sujeta la roja sin porqué.** El banco solo espera más de quince
segundos si `porQueEsperas` nombra a alguien. Sin nadie a quien nombrar, la
torre no te mira por una de estas, y ninguna lo decía:

- **la lista de antes de despegar**, que espera a que calle la radio para
  pedir o poner los flaps y el compensador; tiene su red, `LA_LISTA_COMO_MUCHO`;
- **lo que le suelta la pista a otro sin sonar todavía**: la frecuencia da la
  pista por libre al pedir su «pista libre» o su «cleared for take-off», y la
  verde espera a oírlo para no dársela a dos (`sueltaLaPista` en
  `audio/boca.ts`). Esa frase no caduca ni se cae de la cola, a propósito.
  **Esta no tenía red en el suelo**: si la boca no la decía nunca, la roja
  era para siempre. En el aire la tiene, la altura de decisión.

**Decisión.**

1. **La red** (`LO_QUE_SUELTA_COMO_MUCHO`, treinta segundos, en
   `flight/turno-de-pista.ts`): parado en la doble raya, lo que suelta la
   pista y no ha sonado en ese rato se retira de la boca, y con ello la roja.
   Treinta segundos son tres o cuatro frases de la doble raya y lo de los
   demás detrás; mucho menos de lo que tarda un niño en pensar que el juego
   se ha colgado. Retirarla, y no solo dejar de esperarla, es porque sonando
   detrás de tu verde diría otra cosa.
2. **Que se diga por qué**: la sonda `noTeMira` —fuera de la raya, la pista
   de otros y de qué está hecha pieza a pieza, la lista, o sin parar
   todavía—, que el banco escribe cuando no llega la verde. La próxima vez que
   falle dirá qué la sujetaba.
3. **Y el banco no se rinde ante lo que tiene red**: con la lista o una
   frase sin sonar, corre el reloj como con alguien por medio y exige que la
   verde llegue antes que la red más un margen, ciento cinco segundos. Lo que
   sigue exigiendo es lo mismo: sin nadie y sin nada pendiente, doce segundos.

**La prueba**: `roja-sin-porque.test.ts`, con una boca que no dice nunca el
«pista libre» ni el «cleared for take-off» del otro: mientras la espera la
roja sigue, sin nadie a quien nombrar; a los treinta segundos se acaba y la
frase se retira; y rodando hacia la raya no se cuenta. Sin la red, la roja
dura los ciento veinte segundos de la prueba y los que hagan falta.

### Lo medido

- **El remolque por la 30**, `ver-remolque-de-quien-juega.mjs` con el viento
  del 300 y el peldaño de cabina (`OGA_TRAMO`, que el banco acepta desde esta
  enmienda), con la tarjeta Intel: antes, la tira de arriba y el fallo;
  después, **todo en orden**: la ruta, el permiso de empujar, el «empezamos a
  empujar», el freno y el «Desconecto», en su orden y una vez cada uno.
- **El despegue de Los Rodeos con el JAZ 90 en Guyrami**, dos tiradas: con el
  código de main y las sondas, 22 de 22 y verde a los 55 s detrás de EC-LQN;
  con la red y el banco nuevo, 22 de 22 y verde a los 49 s detrás de EC-HHX.
  Ninguna de las dos se quedó sin porqué, así que la red no se ha visto
  actuar en el navegador: solo en `roja-sin-porque.test.ts`.
- **El despegue de Los Rodeos en Taguató**, con la red y el banco nuevo: 20 de
  20, verde a los 10,8 s sin nadie por medio, **esperando la lista**: la
  sonda dice que esos diez segundos de siempre sin nadie por medio son la
  lista —pedir los flaps, ocho segundos de paciencia y ponerlos— y no la
  torre. Es lo más probable de la tanda 20: la lista espera a que calle la
  radio para pedir y para poner, y con la frecuencia o la megafonía hablando
  en la doble raya pasa de los quince segundos que esperaba el banco. No está
  medido en esa tirada.
- **Vitest**: las dos pruebas nuevas en verde; `roja-sin-porque.test.ts` sin
  la red cae en dos de tres, con la roja a los 120 s de la prueba. El entero,
  una vez: 558 de 558 ficheros, 11.150 pruebas en verde y 30 saltadas,
  ninguna en rojo, en 1.169 s con dos hilos.

### Lo que queda

- **La roja de la tanda 20 sigue sin causa medida.** Con la sonda puesta, la
  próxima vez que el banco no vea la verde escribirá qué la sujetaba: si es
  la lista, la pista de otros pieza a pieza, o el avión sin parar.
- **La red de la tira no se ha visto actuar sola en el navegador**: el banco
  del remolque pasa con las dos piezas puestas, y no se voló con solo una.
- **La roja larga del peldaño de cabina**: en la ronda de la tanda 20,
  `verificar-despegue.mjs tenerife-norte taguato-ruvicha "" jaz-90` dio la
  verde a los 293 s, esperando detrás de EC-MCM, primero en la fila y después
  despegando. Tiene porqué y acaba, pero es mucho más que la paciencia de la
  fila (`PACIENCIA_EN_LA_FILA`, 180 s); no se ha mirado.

## Enmienda (20-11-2026, H41f): la TORA que se dice y la que se tiene, y quien no remonta

Los dos flecos que dejó la H41e.

### La TORA que se decía no era la que había

**Lo que pasaba.** Saliendo por una intersección, la torre daba la pista
desde el punto donde la calle toca el eje —725 m en la C de El Hierro con el
JAZ 40—, la cuenta de si bastaba (`vueltaDelBackTaxi`) usaba ese mismo
número, y el avión soltaba frenos con menos: 717,6 m con el piloto perfecto y
708 con el del banco, porque para quedar en el eje la raya redondea el codo y
se come unos metros pasado el nudo. Ni lo dicho era lo publicado ni la cuenta
restaba nada por alinearse.

**Lo real.** Son dos números:

- La TORA de una intersección se publica **desde el borde de la calle**, el
  del lado de la cabecera, para que cuadre con la de la pista entera (CAP 168
  de la CAA británica, cap. 3; leído citado, no en el original). Donde el AIP
  la publica, es la suya: en Los Rodeos, «12 INT E-2» TORA 2.546 y «30 INT
  E-4» 1.906 (AD 2.13); en La Gomera, «09 INT A» 400 y «27 INT A» 1.100.
- Esa longitud declarada «no tiene en cuenta la alineación del avión en el
  sentido del despegue», y quien calcula el despegue le resta la **pérdida por
  alineación**: para la TORA y la TODA, lo que va del principio de la pista
  declarada a las ruedas principales ya alineadas; para la ASDA, a la rueda
  de morro (AMC1 CAT.POL.A.205, Reglamento (UE) 965/2012, con la entrada a
  noventa grados y la media vuelta en la pista; el AMC da la cuenta con la
  batalla y el ángulo de la rueda de morro cuando el fabricante no da la
  suya). Las tablas por tipo no se han leído: la página de la CAA con el AMC
  no se abrió sin navegador.

**Decisión: una sola cuenta**, `pistaDesdeLaBoca` en `plan-de-vuelo.ts`, que
da las dos cosas y de la que sale todo lo demás:

- **La TORA** (`desdeLaEntrada`, la que dice la torre): la del AIP si la
  publica para esa calle y esa cabecera (`bocasPermitidas` guarda ahora la
  cifra junto a la boca), y si no, la que publicaría: desde donde el borde de
  la calle del lado de la cabecera se junta con el borde de la pista, con el
  ancho de la calle de los datos o el que se dibuja (`ANCHO_RODADURA`), y
  más atrás cuanto más en diagonal llega (con el seno de la entrada, que no
  baja de 0,5). Una entrada a menos de `EN_LA_CABECERA` del final es la de la
  cabecera: la pista entera.
- **La alineación** (`alinearse`): del principio de esa TORA a donde el avión
  queda en el eje **siguiendo la raya**, alisada como la alisa `ponerRuta`
  con el radio de giro de este avión: donde empieza su recta final. Es la
  pérdida de este avión por esta entrada, y no una tabla: el juego sabe por
  dónde va a ir. Como mucho la de un codo de noventa grados, que lo que llega
  mirando a la cabecera es de remontar (H41e). Con la del AIP, la alineación
  se cuenta desde donde empieza la suya —la pista entera menos esa cifra—:
  la E-2 de Los Rodeos entra a doce grados, como la salida rápida que es para
  la 30, y desde el borde de la calle en los datos habría 2.705 m; el AIP da
  2.546, que empiezan unos treinta metros pasado donde el avión ya va
  alineado, así que ahí la alineación es cero y la cuenta se queda con la
  publicada.
- **Lo que decide** es la TORA menos la alineación (`alSoltarFrenos`, el
  `porDelante` de la intersección): `vueltaDelBackTaxi`, `bocaDeEntrada`,
  `pistaParaRemontar` y `comoSeSale` usan ese número. Si con él la
  intersección ya no basta, se remonta.

**Medido sin navegador** (`tora-de-la-interseccion.test.ts`, piloto perfecto
del puesto a la carrera):

- **El Hierro, 34, JAZ 40, sin viento**: la torre dice **749 m** (antes 725),
  la alineación es de **29 m** y quedan **720** al soltar frenos; el piloto
  perfecto queda en el eje con 717,6 —la fase de despegar llega un par de
  metros después de acabar el codo—. Pide 606: intersección, sin ir hacia
  atrás.
- **El mismo campo, con un día que pide tres metros más de los 720** (cola
  buscada en la prueba): menos que la TORA dicha, más que lo que queda
  alineado. Antes salía desde la C; ahora remonta, más de cien metros hacia
  la cabecera, y suelta frenos con lo que pide. Es el caso de la segunda
  tirada de la H41e, la de 37 °C, que pedía 722 con 725 desde el nudo: hoy
  remontaría.
- **Los Rodeos, 12, JAZ 90**: sale por la E-2, la torre dice **2.546** —la del
  AIP; antes, la de la geometría— y la alineación es cero.
- `remontar-por-el-chaflan`, `remontar-por-tipo`, `por-donde-se-sale-en-la-roja`,
  `back-taxi`, `back-taxi-vuelta`, `entrada-al-reves`, `salida-del-trafico` y
  `despegue-en-taguato`, en verde sin tocarlas.

### Quien no remonta

**Lo que pasaba.** Con la torre diciendo «backtrack», quien se alineaba en la
boca y daba gas despegaba en cuanto la pista que quedaba bastaba sin
márgenes (`deducir` en `flight/vuelo.ts`: el hecho gana al plan). Pasaba a
«despegando» con un remonte trazado y nadie decía nada.

**Lo real.** Despegar sin hacer lo autorizado no es lo que se enseña. Pero
aquí no se castiga: se ve la consecuencia y se vuelve a intentar (AGENTS.md).
Y la pista que necesita un avión es cosa de quien vuela, no de la torre:
a uno que empieza la carrera, una torre le dice «stop immediately» si ve un
peligro (SKYbrary, *Take-off without ATC clearance*; Doc 4444, 12.3.4.10),
que es una orden de emergencia, no una lección.

**Decisión.** Lo de otros casos de no seguir la raya —pasarse la salida
(`decirSalPorLaSiguiente`)—: la máquina sigue haciendo lo de siempre y se
cuenta el porqué.

- **La fase, como estaba.** Si queda la pista que necesita sin márgenes, es
  un despegue con su V1 y su Vr; si no, sigue siendo rodaje: en Guyrami y
  Tukã el tope de rodaje no deja correr, y de Taguató para arriba lo que se
  ve es el aviso de que se acaba la pista (`runningOutOfRunway` en el HUD).
- **Se apunta una vez** (`vigilarElRemonte`, `Paso.sinRemontar`): con el
  remonte por delante, derecho en el eje hacia donde se despega y por encima
  de `YA_ES_RODAJE` —el mismo hecho que gana al plan—, con si bastaba. Y
  solo si desde que pisó la pista no fue hacia la cabecera más de
  `SIN_REMONTAR` (30 m): quien remontó y dio la vuelta antes del lazo
  dibujado hizo lo que dijo la torre, aunque la bandera del remonte siga
  puesta hasta llegar a él.
- **La instructora lo cuenta en los tres peldaños de abajo**
  (`decirQueNoSeRemonto` en `game.ts`), con calma y solo grabada: con la
  pista que alcanza, «La torre nos dijo ir primero por la pista y dar la
  vuelta, para tener más pista por delante. Hoy alcanza igual: seguí»; con la
  que no, «…: desde acá no alcanza la pista para despegar», y el «frená» lo
  pone el aviso de fin de pista. En la tarjeta, la frase o «Primero, la
  vuelta», según se lea.
- **La torre calla** en todos: lo que diría es una orden de emergencia, y el
  peligro, si lo hay, lo avisa la cabina.

Las pruebas, en `vuelo.test.ts`: con la pista que basta se despega y se
apunta `basta` una vez; sin ella sigue el back-taxi y se apunta `noBasta`;
rodando por la raya, yendo hacia la cabecera, sin remonte o habiendo
remontado ochenta metros y dado la vuelta antes del lazo, nada.

**Frases nuevas, sin grabar** (es-PY y en): `vuelo.sinRemontar`,
`vuelo.sinRemontarNoAlcanza` y `palabra.sinRemontar`. Sin grabación no
suenan; la tarjeta sale igual en los peldaños que leen.

### En el navegador

Una tirada de cada, con el piloto del banco (`verificar-despegue.mjs`, que
ahora escribe también la alineación).

- **El Hierro, Taguató, JAZ 40, a 42 °C**
  (`OGA_URL_EXTRA='&metar=GCHI%20201200Z%2015005KT%20CAVOK%2042%2F10%20Q1013'`),
  **20 de 20**. Pide 734 m: no le basta ninguna de las dos bocas de la C, y
  el plan dice remonte hasta el final, por la cola, con 1.217 m por delante.
  Entra por el chaflán que mira a la cabecera (en el metro −114 del eje), va
  hasta el −605, da la vuelta en el −590 y suelta frenos en el −516. Rota con
  509 m de 1.254. De la instructora sonó `vuelo.backTaxi`; **la torre no dijo
  el `torre.canario.backtrack`** que sí sonó en la tercera tirada de la H41e,
  con la verde a los 10,8 s. Lo que se dice al remontar no lo toca esta
  enmienda, y no se ha mirado por qué no sonó.
- **Los Rodeos, Taguató, JAZ 90, por la 12**, **21 de 21**. Pisa la pista por
  la E-2 en el metro −1.130 —la calle entra a doce grados— y suelta frenos en
  el −999, con 2.583 m por delante: más de los 2.546 que publica el AIP, que
  es con lo que decide ahora la cuenta. Ni la oferta ni la TORA sonaron en
  esta tirada (la verde a los 10,8 s, sin roja que dé tiempo, como en la
  H29m), y el banco leyó el plan con la carrera empezada, cuando ya se ha
  borrado (lo mismo que contó la H41e): **la TORA dicha de Los Rodeos está
  comprobada en vitest, no en el navegador**.
- **Quien no remonta** no se ha volado en el navegador: el piloto del banco
  sigue la raya del remonte desde la H41e. Está en `vuelo.test.ts`.

**Vitest entero**, una vez y con el código final: 564 de 564 ficheros, 11.221
pruebas en verde, 32 saltadas y una pendiente, ninguna en rojo, en 1.636 s con
dos hilos.

### Lo que queda

- **El tráfico no resta la alineación**: `pistaDesde` en
  `suelo-del-trafico.ts` sigue con la TORA del AIP o la pista desde el nudo.
  La cuenta de quien juega y la del tráfico vuelven a ser dos.
- **El ancho de las calles** no viene en los datos de ningún campo canario;
  se toma el que se dibuja, 23 m. Con el de verdad, la TORA dicha de El
  Hierro sería unos metros menor.
- **Las tablas del AMC por tipo** no se han leído: la alineación sale de la
  raya que sigue el avión, no de ellas.

## Enmienda (20-11-2026, H41g): los flecos de la TORA de la intersección

Los tres que dejó la H41f.

### El tráfico decidía con otra cuenta

**Lo que pasaba.** `pistaDesde`, en `suelo-del-trafico.ts`, daba la TORA del
AIP o la pista desde el nudo de la boca, sin restar la alineación. Con el
mismo avión y por la misma boca, el tráfico y quien juega decidían con dos
números: en El Hierro por la 34, por la boca a la que va el tráfico (la de la
calle del 3A, a 238,5 m del centro), 865,6 m desde el nudo para el tráfico y
855,5 al soltar frenos para quien juega —885,6 de TORA dicha y 30,1 de
alineación—. Un día que pidiera 856 m, el tráfico salía desde la calle y a
quien juega la torre le decía remontar.

**Decisión: la misma cuenta, no una tercera.** `pistaDesdeLaBoca` sale de
`PlanDeVuelo` a una función de módulo con lo que necesita como argumentos
—la pista, la calle hasta el eje, el radio de giro del avión y la TORA que
publica el AIP desde esa boca— y el método de la clase se queda en una
llamada. El tráfico la usa con la calle por la que llega a la boca, y lo que
decide es lo que queda al soltar frenos, sin pasar nunca de la TORA que
publica la cabecera (la de Fuerteventura por la 19, que pierde mil metros).
El radio de giro es el de la batalla del que sale de pasarela; los demás
giran más cerrado de lo que redondea la raya, y la cuenta da lo mismo.

Y con ella, la regla de la H41e: una calle que llega a la pista mirando a la
cabecera, lejos de ella, es de remontar, con el mismo coseno que
`bocaDeEntrada`. Sin eso, por el chaflán de la C que mira a la cabecera el
tráfico salía desde la calle y quien juega remontaba.

Como la alineación sale de la calle, el tráfico mira si una boca le da su
pista después de buscarle camino, y no antes: lo que el AIP no deja sigue
saltándose sin buscar.

**La prueba** (`tora-de-la-interseccion.test.ts`): se pone a quien juega en
la doble raya del tráfico, se le pregunta lo que dará la verde
(`comoSeSaldraDesdeAqui`) y se le pide al tráfico la misma pista. A un metro
por debajo de lo que queda al soltar frenos, los dos salen desde la calle; a
un metro por encima, los dos remontan. Con la cuenta de antes, a un metro por
encima el tráfico salía desde la calle.

### La torre de El Hierro no decía «backtrack»

**Lo medido**, con `verificar-despegue.mjs` instrumentado para esto en una
copia del árbol, sin commitear: cuándo se cuenta por dónde se sale
(`contarPorDondeSeSale`, con qué salida y si ya estaba contado), qué se le
pide a la torre, qué hace la boca con ello —a la cola, le toca, se cae y por
qué, se retira— y con qué piezas sonó cada frase de la torre.

- **Se pide, y se escribe.** En El Hierro a 42 °C, con la verde detrás de
  EC-RDY, la tira escribe «request backtrack» y, 3,8 s después, «ZP-PNB,
  backtrack runway three four». En Los Rodeos por la E-2 la oferta se cuenta
  rodando, con la salida por intersección.
- **Pero a la torre no llega, ni a la cola de la boca**: en el banco de
  Taguató ninguna frase de la torre suena grabada —en Los Rodeos, todas las de
  su historial salen sin piezas—, porque el banco no hace ningún gesto y el pack
  de voz se baja después del primero, como en el juego (H44b; solo lo cargan
  Taguató Ruvichá y `OGA_CON_VOCES=1`). Y lo que cuenta `contarPorDondeSeSale`
  va **solo con su grabación**, a propósito: sin ella, la tira, que una frase
  de la torre sin grabar se le pasaría a la voz del navegador, que en Brave
  para Linux es muda.
- **El «backtrack» que se oyó en la tercera tirada de la H41e no era el
  tuyo.** La torre también se lo dice al tráfico que remonta —«line up and
  wait» dicho al que remonta, `AL_QUE_REMONTA`—, y esas sí se apuntan en el
  historial aunque no haya pack. El banco apuntaba cualquier «backtrack» de
  la torre: en aquella tirada la verde llegó detrás de EC-BRM, que salía
  remontando; en la de hoy, detrás de EC-RDY, y su «backtrack runway three
  four» es el que salía, a los 33,9 s de juego, mientras el tuyo, a los
  264,2, solo se escribía. En la H41f la verde llegó a los 10,8 s sin nadie
  por medio, y no había «backtrack» de nadie que apuntar.

No es de la H41f ni de la H48: la cola de la tira no toca la voz, y a la de
la boca la frase no llega sin su grabación. Lo que estaba mal era la medida.

**Decisión: medir lo que se oye, y solo lo tuyo.**

- El banco mira las piezas con que sonó cada frase de la torre y cuenta solo
  las que llevan tu indicativo; las demás las escribe como «torre a otro».
- Lee lo que decide el plan con la verde, y no al empezar la carrera, cuando
  ya se ha borrado: en Los Rodeos salía «el plan: null» (H41e, H41f).
- Y con las voces cargadas, de Taguató para arriba, comprueba que si el plan
  remonta la torre te dice «backtrack».

**Medido con las voces cargadas** (`OGA_CON_VOCES=1`), en El Hierro a 42 °C:
la verde llega a los 267,4 s, detrás de EC-AWE, que sale remontando. Su
«backtrack runway three four» suena con sus piezas (Echo Charlie Alfa
Whiskey Echo) y el banco lo escribe como «torre a otro». El tuyo se le pide
a la torre en `mando` unos cuatro segundos después de la verde, espera
detrás de la verde en castellano y del «cleared for take-off», le toca a los
15,1 s y suena entero con tus piezas; detrás, la instructora con
`vuelo.remontar.cola` y `vuelo.backTaxi`. Nada se cae ni se retira.

La segunda pasada con voces no llegó a volar en el tiempo de esta enmienda:
el navegador lo tenían otras rondas.

### Soltar frenos setenta metros más adelante

**Lo medido**, con el mismo banco instrumentado: en cada paso desde la
verde, la fase, dónde está el avión a lo largo y a lo ancho del eje, el
rumbo, la velocidad que pide el juego y qué rama del piloto manda. El banco
de verdad apunta ahora dónde queda el avión en el eje y mirando pista abajo
(«en el eje en»). En El Hierro a 42 °C, con el
código de main:

- entra por el chaflán que mira a la cabecera en el −113, va pista abajo
  **a doce metros del eje** —la raya de ida de la media vuelta centrada, la
  de las pistas estrechas: la de El Hierro mide treinta y el JAZ 40 no cabe
  en la apartada—, gira en el −590, llega hasta el −605 y sale de la vuelta
  **a quince metros del otro lado**;
- de ahí la raya vuelve al eje **en diagonal**, a diez grados: el avión pasa
  de «back-taxi» a «alineando» en el −595 y no está en el eje y mirando pista
  abajo hasta el **−523**, sesenta y ocho metros pista abajo del giro;
- el banco sigue la raya hasta el eje (`EN_EL_EJE`, H44b), da gas ahí y la
  fase pasa a «despegando» en el **−514**.

Así que no es el codo ni la fase: es la raya. En la H41e el banco daba gas
en cuanto el morro miraba pista abajo, con el avión todavía a catorce metros
del eje, en el −586; desde la H44b sigue la raya hasta el eje, y la raya
llegaba sesenta y ocho metros más allá del giro. Lo que se perdía lo perdía
el juego: `backTaxiDesde` ponía detrás de la vuelta centrada un punto del eje
a `4 · radio + 20` del giro, y la cuenta (`porDelante`, la pista desde el
giro) no lo contaba.

**Decisión: la centrada vuelve al eje con una ese.** Sigue la misma
circunferencia de la media vuelta sesenta grados más, hacia el eje, y los
deshace con otra del mismo radio: queda en el eje y mirando pista abajo a
`√3 · radio` del giro. Con los doce metros del JAZ 40 en El Hierro, veintiún
metros y no sesenta y ocho. Es lo que hace quien remonta una pista estrecha:
termina la vuelta pegado al borde y se mete en el eje sin girar más cerrado
de lo que ya giraba. La ese va marcada como geometría exacta, como la media
vuelta, y se rueda a su velocidad.

**Medido después**, en la misma tirada de El Hierro: el avión queda en el
eje y mirando pista abajo en el **−559** y suelta frenos en el −558, con el
giro en el −590: treinta y un metros pista abajo del giro, y no sesenta y
ocho. La ese de la raya acaba a veintiuno; el piloto del banco, que mira doce
metros por delante, la redondea. Desde ahí hay 1.185 m por delante, y no
1.141.

### Los Rodeos por la 12 y la E-2

`verificar-despegue.mjs tenerife-norte taguato "120/08" jaz-90`, una pasada,
**21 de 21**: la verde a los 10,6 s, sin nadie por medio y esperando la lista
de antes de despegar. El plan, leído ya con la verde: salida por la E-2, la
TORA que dice la torre **2.546 m, la del AIP**, alineación cero y 1.152 m que
pide por el calor. Pisa la pista en el −1.128, queda en el eje en el −1.002 y
suelta frenos en el −998, con 2.582 m por delante. Sin voces: lo que se
comprueba en el navegador es la TORA que decide el plan, no que suene.

### Vitest

Entero, una vez, con el código de los tres flecos: 564 de 564 ficheros,
11.228 pruebas en verde, 31 saltadas y una pendiente, ninguna en rojo, en
1.816 s con dos hilos.

### Lo que queda

- **La cuenta del remonte sigue contando desde el giro.** `porDelante` es
  `mitad − giro`, y con la ese el avión queda en el eje veintiún metros más
  allá; por la regla de la máquina de fases —a menos de doce metros y ocho
  grados— ya está alineado al acabar la media vuelta, así que la cuenta y la
  fase dicen lo mismo. Restar la ese, como se resta la alineación en la
  intersección, movería todas las decisiones de remontar un trozo; no se ha
  hecho.
- **La apartada y la raqueta** acaban ya en el eje: no se han tocado.
- **A quien juega, la torre le dice «cleared for take-off» en la doble raya
  y luego «backtrack»**: en El Hierro suena la verde, su fraseología con el
  viento y detrás el remonte, y al acabar la vuelta otra vez la verde y el
  «cleared for take-off». Al tráfico ya no se le hace (`remonta` en
  `flight/radio.ts`: la pista para remontarla y la salida al dar la vuelta);
  a quien juega, sí. No se ha tocado.
- **El banco de Taguató sigue sin voces por defecto**: la comprobación del
  «backtrack» solo corre con `OGA_CON_VOCES=1` o en Taguató Ruvichá.

## Enmienda (20-11-2026, H41h): a quien remonta, el «backtrack» primero y una sola autorización de despegar

### El caso

Lo que dejó la H41g. En El Hierro a 42 °C, con el JAZ 40 y las voces
cargadas, cuando el plan de quien juega era remontar, la lámpara se ponía
verde en la doble raya y la torre decía «pista tres cuatro, autorizado a
despegar» y «runway three four, cleared for take-off» con el viento; unos
cuatro segundos después se pedía el «backtrack runway three four», que sonaba
15,1 s después de la verde, detrás de la autorización; y al acabar la media
vuelta, otra vez la verde y otra vez «cleared for take-off». La lámpara se
apagaba en el back-taxi y se volvía a encender en «alineando», y cada vez que
se encendía hablaba (`luzDeTorre`). Al tráfico ya no le pasaba desde la
`remonta` de `flight/radio.ts`: a él se le dice el «backtrack» y la salida al
dar la vuelta.

### Lo real

Leído en el original, salvo lo que se dice:

- **Son dos transmisiones, y el «backtrack» va primero.** La fraseología de
  rodaje de la OACI tiene «REQUEST BACKTRACK», «BACKTRACK APPROVED» y
  «BACKTRACK RUNWAY (number)» (Doc 4444, 16.ª ed., 12.3.4.7 n, o y p; en esa
  edición, bajo la circunstancia de después del aterrizaje), y la española lo
  mismo: «SOLICITO REGRESAR POR PISTA», «REGRESO POR PISTA APROBADO»,
  «REGRESO POR PISTA (número)» (RD 1180/2018, anexo V, 1.4.8 n, o y p). La
  autorización de despegar va aparte, en la suya: «RUNWAY (number) CLEARED FOR
  TAKE-OFF» (12.3.4.11 a) y «PISTA (número) AUTORIZADO A DESPEGAR» (1.4.12 a).
- **Y cuándo se da la de despegar**: «when the aircraft is ready for take-off
  and at or approaching the departure runway, and the traffic situation
  permits» (Doc 4444, 7.9.3.4). Quien todavía tiene que rodar la pista hacia
  atrás no está listo para despegar.
- **El CAP 413 británico** (ed. 24) da el «backtrack» con «report lined up»
  —«BACKTRACK RUNWAY (designator) REPORT (LINED UP or LINING UP)»— y la salida
  después, en otra transmisión. En ningún ejemplo de los tres textos van el
  «backtrack» y el «cleared for take-off» juntos.
- **Las luces**, a una aeronave en tierra (SERA, apéndice 1, 3.1.1, tabla AP
  1-1): «verde fija: autorizado para despegar»; «serie de destellos verdes:
  autorizado para rodaje». La verde fija y el «cleared for take-off» son lo
  mismo dicho por dos canales; a quien entra en la pista para remontarla le
  corresponden los destellos.

No se ha leído el Doc 4444 de 2020 en adelante, ni el AIP-España GEN 3.4 ni el
manual de fraseología de ENAIRE.

### Decisión

- **La luz de quien sale**, en un solo sitio: `luzDeLaSalida` en
  `flight/luz-de-la-salida.ts`, con la fase, si la torre ya dio la pista y si
  el plan tiene todavía la media vuelta del remonte por dar
  (`PlanDeVuelo.dondeSeGira`, que se baja al acabarla). Roja en el punto de
  espera; **destellos verdes** («rodar») en «autorizado» y en «back-taxi» con
  la vuelta por dar; verde fija en «autorizado» y «alineando» sin ella. El
  back-taxi entra ahora en las fases en que se mira la lámpara: antes se
  apagaba en él, y por eso al volver la verde hablaba otra vez.
- **Los destellos no dicen nada por la lámpara.** Lo que se dice al darte la
  pista para remontarla es el «request backtrack» y el «backtrack runway» de
  `contarPorDondeSeSale`, en el mismo paso, y la instructora lo cuenta en los
  peldaños de abajo como antes. No hay frase grabada en castellano para
  remontar, y «autorizado a despegar» diría lo que no es. La roja que había
  se retira de la cola igual que con la verde (`alCambiarLaLuz`).
- **La verde fija y su «cleared for take-off» llegan al dar la vuelta, una
  vez**: el cambio de destellos a fija es un cambio de luz, y habla.
- **En un AFIS**, que no autoriza nada, los destellos se tratan como la verde:
  «pista libre» una vez en la doble raya, quien vuela dice «backtracking», y
  al dar la vuelta no se repite.
- **El HUD** pinta los destellos con el verde y la flecha de seguir, encendida
  y apagada de golpe, sin frase escrita; sin movimiento no parpadea y lleva un
  aro a trazos (`torre--destellos`).
- **Quien no remonta** y despega desde la boca (H41f) no llega a tener la
  verde fija: con la bandera del remonte puesta la fase es «back-taxi» hasta
  que el hecho gana al plan, y de ahí pasa a «despegando», donde la lámpara se
  apaga. Ni la torre ni la lámpara le autorizan lo que no se le autorizó; la
  instructora cuenta lo de siempre (`decirQueNoSeRemonto`).

### La prueba

`la-verde-del-que-remonta.test.ts`, con el piloto perfecto de
`remontar-por-el-chaflan.test.ts` del puesto a la carrera, apuntando la luz de
cada paso: El Hierro por la 34 con el JAZ 40 y 4 m/s de cola, roja, destellos
y una verde, ya vuelto; sin cola, por la C, roja y verde; Los Rodeos por la 12
con el JAZ 90, roja y verde. Y en El Hierro, La Gomera y Pilar, con cada avión
que cabe y por las dos cabeceras —30 casos, 15 de remonte—: una sola verde,
nunca con la vuelta por dar, y destellos solo en los que remontan.

`verificar-despegue.mjs` apunta ahora lo que la torre te dijo a ti, por orden
y con tu indicativo en las piezas, y con las voces cargadas comprueba que la
autorización de despegar se dice una vez y que, si se remonta, el
«backtrack» va antes.

### Lo medido

**Vitest entero**, una vez y con el código de esta enmienda: 565 de 565
ficheros, 11.266 pruebas en verde, 31 saltadas y una pendiente, ninguna en
rojo, en 2.082 s con dos hilos.

**En el navegador**, `verificar-despegue.mjs el-hierro taguato "" jaz-40` con
`OGA_CON_VOCES=1` y
`OGA_URL_EXTRA='&metar=GCHI%20201200Z%2015005KT%20CAVOK%2042%2F10%20Q1013'`:

- **Primera pasada, 23 de 23.** La verde —ahora los destellos— a los 182,9 s
  de juego, detrás de EC-UUL, que aterrizaba, y de la fila con EC-OCH. El
  plan, remonte hasta el final por la cola: pide 734 m, 750 desde la entrada
  y 1.217 por delante. Lo que la torre te dijo a ti, por orden:
  `destino · roja · holdShortNumberTwo · holdShortLanding · backtrack · verde
  · clearedTakeoff`. El «backtrack» es lo primero al darte la pista, y la
  autorización de despegar, en castellano y en inglés, una vez y detrás. El
  avión entra en el −113, va hasta el −605, gira en el −590, queda en el eje
  en el −559 y suelta frenos en el −557, como en la H41g (−558); rota con
  504 m de 1.254.
- **Segunda pasada, 23 de 23**, con la verde a los 49,8 s y sin nadie por
  medio: `destino · roja · holdShort · backtrack · verde · clearedTakeoff`.
  Entra en el −114, gira en el −590, queda en el eje en el −560 y suelta
  frenos en el −557.
- **Los Rodeos por la 12 y la E-2**, `tenerife-norte taguato "120/08" jaz-90`
  con voces, **22 de 22**: la intersección sin remonte, como antes. Rodando,
  la torre ofrece la E-2 y da la TORA, 2.546 m, la del AIP, alineación cero;
  en la doble raya la roja, y con la verde a los 288,5 s —detrás de EC-JUO,
  que aterrizaba, y de EC-HQC, que salía— la verde y «cleared for take-off»,
  una vez. Pisa la pista en el −1.128, queda en el eje en el −1.001 y suelta
  frenos en el −995. Sin destellos: no hay remonte por dar.

### Lo que queda

- **No hay frase en castellano para remontar.** En Guyrami y Tukã la torre
  no dice nada con los destellos —lo cuenta la instructora— y la caja de la
  lámpara va sin texto. La que tocaría es «{indicativo}, regrese por pista»
  (RD 1180/2018, anexo V, 1.4.8 p, «REGRESO POR PISTA (número)»), con las
  dos voces de torre; no se ha escrito ni grabado.
- **Quien da la vuelta antes del lazo dibujado** (H41f: si remontó más de
  treinta metros, hizo lo que dijo la torre) sigue con la bandera del remonte
  puesta, y la verde fija no le llega hasta que el hecho gana al plan, que ya
  es «despegando»: despega sin oír su autorización. No se ha tocado; con
  `mirandoLaPista` se le podría dar, pero en una entrada que llega mirando
  pista abajo antes de remontar daría la verde antes de tiempo, que es justo
  lo que se arregla aquí.
- **«Report lined up»**: el CAP 413 lo pone con el «backtrack», y aquí no se
  dice; la autorización llega sola al acabar la vuelta.

## Enmienda (21-11-2026, H41i): quien da la vuelta antes, «regreso por pista» y los destellos vistos

### El caso

Los tres flecos de la H41h:

- **Quien da la vuelta antes del lazo dibujado no recibía la autorización.**
  Si remontaba más de treinta metros y giraba antes del sitio de girar, la
  bandera del remonte (`PlanDeVuelo.dondeSeGira`) seguía puesta hasta el
  lazo: la fase no salía del back-taxi, la lámpara no pasaba de los
  destellos a la verde fija y despegaba sin oír su «cleared for take-off».
- **En castellano la lámpara a destellos callaba y su caja iba sin texto**:
  no había frase escrita ni grabada para remontar.
- **Los destellos no los había visto nadie** en una pantalla.

### Lo real

Leído en el original:

- **Paraguay**: DINAC R 4444, «Gestión de Tránsito Aéreo», cuarta edición
  R00, Resolución 419/2018 del 05-11-2018, 12.3.4.7, procedimientos de
  rodaje, «... después del aterrizaje»: «\*n) SOLICITO REGRESAR POR PISTA»,
  «o) REGRESO POR PISTA APROBADO», «p) REGRESO POR PISTA (número)», en tabla
  con «REQUEST BACKTRACK», «BACKTRACK APPROVED», «BACKTRACK RUNWAY (number)».
  Es el PDF que cuelga la DINAC
  (`dinac.gov.py/Seguridad_Operacional/docs/DINAC_R-4444_RES_4192018.pdf`);
  no está en su lista pública de reglamentos, y no se ha mirado si hay una
  edición posterior.
- **España**: RD 1180/2018 (BOE-A-2018-15406, texto consolidado de
  05-06-2024), anexo V, 1.4.8 n, o y p: las mismas tres frases, letra por
  letra.
- **OACI en español**: Doc 4444, 15.ª edición (2007), 12.3.4.7 n, o y p, lo
  mismo; y el Doc 9870 (prevención de incursiones en la pista), apéndice A,
  «(distintivo de llamada) REGRESO POR PISTA (número)». La 16.ª edición en
  español no se ha podido leer.

Así que la frase es **la misma en los dos sitios**, «regreso por pista
(número)», y cada torre la dice con su voz. Es impersonal: no hay voseo que
quitar.

### Decisión

- **El remonte hecho es una sola regla**, `LoRemontado` en
  `flight/lo-remontado.ts`: más de `SIN_REMONTAR` (30 m) hacia la cabecera
  desde donde se pisó la pista. La miran `vigilarElRemonte` en
  `flight/vuelo.ts` —que ya la tenía, y la cuenta se ha mudado allí— y
  `situacion` en `world/plan-de-vuelo.ts`, que **baja la bandera del remonte
  en cuanto el avión ha remontado y mira pista abajo** (a menos de
  `YA_DIO_LA_VUELTA`, 30°, del rumbo de despegue, y en la pista). Con eso la
  fase pasa a «alineando», la lámpara a la verde fija y suena la
  autorización, una vez, como al acabar el lazo. Mirar pista abajo solo no
  basta: una entrada que llega así sin haber remontado sigue con los
  destellos.
- **«Regreso por pista»**, `torre.regreso` y `torre.canario.regreso` en
  `i18n/es-PY.ts` —«{indicativo}, regreso por pista» y el número detrás, como
  la roja— y en `en.ts`, «backtrack runway». El guaraní no se toca. La caja
  de la lámpara la escribe donde se lee —«regreso por pista 34»— y la lámpara
  la dice en los cuatro peldaños, delante del «backtrack runway» de
  Taguató para arriba, como la verde va delante de su «cleared for
  take-off». **Solo con su toma** (`vozDe`): mientras no esté grabada se
  apunta «sin grabar, no se pide» y calla, como antes. Está en
  `ESPERAN_SU_TOMA` de `audio/torre.ts`, y `torre.test.ts` mira que su pieza
  esté en la lista de grabar y que no tenga toma en ninguna de las dos
  torres. Y en `DE_LA_LAMPARA`: con la verde fija ya no es verdad, y se
  retira de la cola.
- **Lo que hay que grabar**: la pieza «regreso por pista», con
  `torre.solo.regresoPorPista` (voz `torre`) y
  `torre.canario.solo.regresoPorPista` (voz `torre-canarias`), al final de
  la lista de cada torre (`DEL_REGRESO_POR_PISTA` en
  `scripts/frases-para-grabar.mjs`, 170 y 172 de sus guiones), para no
  renumerar lo grabado. Las recetas, al grabarlas, como las de la roja:
  `{c1}`…`{c5}`, la pieza, `{p1}`, `{p2}` y el lado en `.L`, `.R` y `.C`.
- **Los destellos, en el banco de carteles**: `mirarLosDestellos` en
  `scripts/verificar-carteles.mjs` (con `OGA_SOLO=destellos`, solo eso).

### La prueba

En `la-verde-del-que-remonta.test.ts`, con el piloto perfecto, El Hierro por
la 34 y el JAZ 40 con 4 m/s de cola, girando en el sitio a 20°/s: a los
sesenta metros de remonte, a más de doscientos del lazo, roja y destellos,
destellos mientras gira, **una** verde fija al acabar la vuelta y la
carrera; nada más pisar la pista, mirando pista abajo sin remontar, siguen
los destellos y la bandera; y a veinte metros, lo mismo.

Un primer intento ponía el morro de golpe en el rumbo de despegue, y la
verde no llegaba: en el eje y alineado de una vez la fase salta del
back-taxi a «despegando», sin pasar por «alineando», que es donde se
enciende la verde —también al acabar el lazo dibujado—. Un giro de verdad
pasa por ella.

### Lo medido

**Los destellos, vistos** (`OGA_SOLO=destellos node
scripts/verificar-carteles.mjs`, El Hierro con el JAZ 40, en es-PY): en
Guyrami y en Taguató, en la tablet de 1024 × 600 y el teléfono de 800 × 360
con el dedo, de pie en una ventana de 400 × 780, y las tres otra vez con el
movimiento reducido. La lámpara se ve, dentro de la pantalla y sin tapar la
tarjeta de la orden ni los dibujos del rincón. Se distingue de la fija: con
movimiento, `torre-destellos` frente a `torre-late`, y la luz pasa de verde
(126, 200, 106) a apagada (58, 66, 61); sin movimiento, quieta y con el aro a
trazos, que la fija no lleva. En Guyrami no sale ni una palabra: en la caja
solo la placa, igual que con la verde. En Taguató, «Zulu Papa Papa November
Bravo, regreso por pista 34», y con la verde «…, pista 34, autorizado a
despegar». De pie con el dedo tapa el vuelo el cartel de girar, como debe.
En la ventana estrecha de pie la lámpara se recoge a su dibujo, sin frase,
con la verde igual que con los destellos (`lee-recogida`): la primera
pasada lo daba por fallo y la comprobación se ha corregido para aceptarlo
cuando la verde hace lo mismo. Mirado en foto: en la tablet de Guyrami, la
lámpara de cerca apagada, encendida y con el aro a trazos frente a la fija;
el teléfono de Guyrami, sin una letra; y Taguató en la tablet, con la verde
y con los destellos sin movimiento, el teléfono y la ventana de pie.

**El Hierro con voces**, `verificar-despegue.mjs el-hierro taguato "" jaz-40`
con `OGA_CON_VOCES=1` y el METAR de 42 °C de la H41h: **23 de 23**. La verde
a los 40,4 s, sin nadie por medio; el plan, remonte hasta el final por la
cola (pide 734 m, 750 desde la entrada, 1.217 por delante). Entra en el
−114, va hasta el −605, gira en el −590, queda en el eje en el −558 y suelta
frenos en el −557, como en la H41h; rota con 501 m de 1.254. Lo que la torre
te dijo: `destino · roja · holdShort · backtrack · verde · clearedTakeoff`,
una autorización de despegar y el «backtrack» antes. «Regreso por pista» no
está: no tiene toma, y sin ella no se pide.

**Guyrami en El Hierro**, `verificar-despegue.mjs el-hierro guyrami "" jaz-40`
con voces y el mismo METAR: **21 de 21**. Número dos en la fila detrás de
EC-ANX, que sale y deja estela: la roja con «número dos para la salida», y la
pista a los 270,1 s. El plan, el mismo remonte hasta el final; entra en el
−112, va hasta el −600, gira en el −590 y suelta frenos en el −589. Lo
cuenta la instructora, `vuelo.remontar.cola` y `vuelo.backTaxi`; la torre,
en inglés, solo al otro.

**El banco de carteles entero** no se ha pasado: con otro ayudante volando
en el mismo turno de navegador no cabía. Se ha pasado su parte nueva, la de
arriba.

**Vitest entero**, una vez y con el código de esta enmienda ya juntado con
main: 568 de 568 ficheros, 11.291 pruebas en verde, 31 saltadas y una
pendiente, ninguna en rojo, en 1.329 s con dos hilos.

### Lo que queda

- **Grabar «regreso por pista»** con las dos voces de torre:
  `torre.solo.regresoPorPista` (`torre`) y
  `torre.canario.solo.regresoPorPista` (`torre-canarias`), y sus recetas
  `torre.regreso` y `torre.canario.regreso`, con sus `.L`, `.R` y `.C`. Al
  grabarlas, `torre.regreso` sale de `ESPERAN_SU_TOMA`; la prueba lo recuerda.
- **Un giro de golpe se salta la verde**: si el morro pasa de treinta grados
  a alineado en menos de la histéresis de las fases (0,5 s), la fase va del
  back-taxi a «despegando» sin «alineando», y la verde no llega. Pasa igual
  al acabar el lazo dibujado; a veinte grados por segundo no pasa. No se ha
  tocado.
- **En inglés, la lámpara y la radio dicen lo mismo**: «backtrack runway» en
  la caja y en la voz, como ya pasa con «cleared for take-off».
- **«Report lined up»**, del CAP 413, sigue sin decirse.
- **La ventana estrecha de pie sin dedo** (400 × 780): la barra del título
  queda debajo de los botones redondos de arriba, con la verde igual que con
  los destellos; no es de esta enmienda y no se ha tocado.

## Enmienda (21-11-2026, H41j): el morro en el eje de golpe, y la autorización de despegar

### El caso

El segundo fleco de la H41i: «un giro de golpe se salta la verde». Con el
piloto perfecto de `la-verde-del-que-remonta.test.ts`, El Hierro por la 34 y
el JAZ 40 con 4 m/s de cola —remonte hasta el final—, y el morro puesto en el
rumbo de despegue en un solo paso en vez de a veinte grados por segundo:

- **Tras remontar sesenta metros**, a más de doscientos del lazo (en el −172,
  a 10,7 m del eje: el remonte va por un lado de la pista): las luces de
  después del giro, `rodar` y nada más.
- **En el lazo dibujado**, pasado el sitio de girar y cruzando el eje a media
  vuelta (en el −602): igual, `rodar` y nada más.
- **En una entrada sin remonte** —sin cola sale por la C— no pasaba: la verde
  fija ya se dio en la doble raya, `roja · verde`, y del eje a la carrera.

La fase iba del back-taxi a «despegando» sin pasar por «alineando», y la
lámpara de los destellos a apagada: ni verde fija ni «cleared for take-off».
El avión empezaba la carrera sin que la torre le hubiera autorizado y el
juego lo daba por bueno.

### Por qué

La autorización de despegar se da en «alineando»: la verde fija va en
«autorizado» y «alineando» sin la vuelta por dar (`luzDeLaSalida`, H41h), y a
quien remonta le llega al dar la vuelta. Pero `deducir` daba «despegando» a
cualquiera que estuviera en el eje, quieto o no, y una fase nueva tiene que
sostenerse medio segundo para valer (`HISTERESIS`). Del morro a treinta
grados —donde se baja la bandera del remonte— a alineado en menos de eso,
«alineando» no llegaba a asentarse. Y pasar a «despegando» gasta el permiso:
la verde ya no vuelve.

### Lo real

En una pista con torre no se despega sin «cleared for take-off» (Doc 4444,
12.3.4.11 a), que se da cuando el avión está listo y en la pista de salida o
llegando a ella (7.9.3.4). A quien empieza la carrera sin ella, una torre
solo le habla si ve un peligro, y lo que le dice es «stop immediately»
(12.3.4.10; ver la nota de la H41f).

### Decisión

- **La máquina de fases sabe si la autorización de despegar se ha dado**
  (`despegueDado` en `Vuelo`): si la lámpara ya estuvo en verde fija con la
  pista dada. Lo decide `luzDeLaSalida`, la misma cuenta que pinta la lámpara
  y dice el «cleared for take-off» en `game.ts`, así que la máquina sabe lo
  que se vio y se oyó. Se mira al empezar el paso, con la fase y la verde del
  paso anterior —lo que el juego acaba de pintar— y la bandera del remonte de
  ahora: el remonte se traza al pasar a «autorizado», detrás de la máquina de
  fases (`alCambiarDeFase`), y mirado en ese mismo fotograma los destellos
  parecerían la verde fija.
- **En el eje, con la pista dada y sin esa autorización, la fase es
  «alineando»** mientras no se corra (`YA_ES_RODAJE`, por el suelo: parado de
  cara a mucho viento el anemómetro ya marca): ahí se enciende la
  verde fija y suena su autorización, y en el paso siguiente ya es un
  despegue. Venga como venga el avión: del remonte, del lazo o de una entrada
  a la que se llega derecho. Con la verde ya dada en la doble raya no cambia
  nada.
- **Si llega al eje ya corriendo, es un despegue** —el hecho gana al plan, como
  con el remonte— y se cuenta una vez: `Paso.sinAutorizacion`
  (`vigilarLaCarrera`). Con la bandera del remonte todavía puesta lo cuenta
  `sinRemontar` (H41f), que es el porqué de esa carrera, y sin la pista es el
  percance de la luz: un suceso, una voz.
- **La instructora lo cuenta** en los tres peldaños de abajo, con calma y solo
  grabada, y la tarjeta donde se lee (`decirQueNoTeAutorizaron` en
  `game.ts`). Solo donde hay torre que autorice: un AFIS no autoriza nada, y
  sin nadie en la radio no hay autorización que esperar.
- **La torre calla.** La carrera sin autorizar solo se empieza con la pista
  dada, y desde que te la dan es tuya: la verde no se enciende con otro en
  ella (`pistaDeOtros`) y, mientras la tengas, la frecuencia no se la da a
  nadie (`PISTA_TUYA` en `flight/radio.ts`). No hay nadie en ella a quien
  estorbar, así que no hay peligro que decir.
- **Y la lámpara no se apaga entre los destellos y la verde fija.** En el
  medio segundo en que la fase sigue en el back-taxi con la bandera ya bajada
  la lámpara quedaba apagada —también con el giro a veinte grados por
  segundo—; ahora siguen los destellos hasta «alineando».

**Frase nueva, sin grabar** (es-PY y en; el guaraní no se toca):
`vuelo.sinAutorizacion` —«Salimos sin que la torre nos autorizara a despegar.
Eso se espera en el eje, hasta que la luz se pone verde fija. La pista es
nuestra: seguí, y la próxima, esperala»— y, para la tarjeta,
`palabra.sinAutorizacion`, «Sin la verde». Va al final de la lista del
instructor en su bloque, `DE_LA_CARRERA_SIN_AUTORIZACION` en
`scripts/frases-para-grabar.mjs`, apartada de su grupo en la expresión del
principio; es la 899 de su guion. Sin grabación no suena; la tarjeta sale
igual en los peldaños que leen.

### La prueba

- `la-verde-del-que-remonta.test.ts`, «el morro en el eje de golpe»: los tres
  casos de arriba con el morro puesto de una vez. Con el código de antes, los
  dos del remonte en rojo (`["rodar"]` donde se espera `["rodar", "verde"]`) y
  la entrada sin remonte en verde; ahora los tres en verde: `roja · rodar`
  antes del giro, `rodar · verde` después, por «alineando», y la carrera.
- `vuelo.test.ts`, «la autorización de despegar, en el eje y de golpe»: con la
  pista dada para remontar, dado la vuelta de golpe y quieto en el eje,
  `back-taxi · alineando · despegando` y una verde; llegando ya a veinte metros
  por segundo, `back-taxi · despegando`, sin verde y `sinAutorizacion` una vez
  y solo una; sin remonte, del eje a la carrera sin esperar; con la bandera
  puesta, `sinRemontar` y no las dos; y sin la pista, nada de esto.

### Lo medido

**Vitest entero**, una vez y con el código de esta enmienda: 568 de 568
ficheros, 11.303 pruebas en verde, 31 saltadas y una pendiente, ninguna en
rojo, en 1.186 s con dos hilos. Ahí va `por-grabar.test.ts`, que lee las
puertas de la instructora en `game.ts` y pedía receta para
`vuelo.sinAutorizacion`: espera su toma en la excepción escrita de esa
prueba (`ESPERAN_SU_TOMA`), y en cuanto se grabe sale de allí.

**El Hierro con voces**, `verificar-despegue.mjs el-hierro taguato "" jaz-40`
con `OGA_CON_VOCES=1` y el METAR de 42 °C de la H41h: **23 de 23**. Número
dos detrás de EC-SMP, que remontaba y salía, y luego su estela: la verde a los
269,7 s de juego. El plan, remonte hasta el final por la cola (pide 734 m, 750
desde la entrada, 1.217 por delante). Entra en el −113, va hasta el −605,
gira en el −590, queda en el eje en el −559 y suelta frenos en el −558, como
en la H41i; rota con 508 m de 1.254. Lo que la torre te dijo: `destino ·
roja · holdShortNumberTwo · holdShortWake · regreso · backtrack · verde ·
clearedTakeoff`: «regreso por pista», que ya tiene su toma, el «backtrack»
antes y una sola autorización de despegar. El piloto del banco gira por la
raya y pasa por «alineando», como antes: el giro de golpe está en vitest, no
en el navegador.

**Los Rodeos con Guyrami**, `verificar-despegue.mjs tenerife-norte guyrami`
(el JAZ 20, sin voces): **21 de 21**. Sale por la E-2 sin remonte —pide 531 m,
2.546 desde la entrada, alineación cero—, con la verde a los 10,7 s de juego y
nadie por medio. Pisa la pista en el −1.118, queda en el eje en el −996 y
suelta frenos en el −995; rota con 393 m de 3.168. Sin remonte la verde ya se
da en la doble raya, y del eje a la carrera no se espera nada.

### Lo que queda

- **«Stop immediately» no existe en el juego**, ni escrita ni grabada. Hoy no
  hace falta: la carrera sin autorizar solo se empieza con la pista dada, y
  dada es tuya. Si un día la torre pudiera dar la pista a otro con la tuya
  dada, esa frase tendría que existir antes, con las dos voces de torre.
- **`vuelo.sinAutorizacion` sin grabar**: sin toma no suena, y en los peldaños
  que leen sale la tarjeta. Al grabarla, sale de `ESPERAN_SU_TOMA` en
  `por-grabar.test.ts`.
- **El caso de llegar al eje ya corriendo** solo está en vitest
  (`vuelo.test.ts`); con el piloto perfecto o el del banco no se llega así, y
  en el navegador no se ha forzado.
- **«Report lined up»**, del CAP 413, sigue sin decirse (H41h).

## Enmienda (23-11-2026, H68): la pista ocupada que ponía el banco, y las frustradas que no se pusieron

### El caso

En la ronda de cierre de la tanda 23 (copia fija 2f861096),
`OGA_PISTA_OCUPADA=1 node scripts/verificar-vuelo-entero.mjs tenerife-norte
taguato 1 jaz-20` dio **34 de 38**, y en la tanda 22 (3028690a) había salido en
verde. Cuatro rojos:

1. **No acabó**: «volver» a los 1800 s, con dos frustradas por la pista.
2. **«Dos encima de la pista»**, 202 muestras desde los 1041 s, con quien juega
   en final: EC-GIX (avioneta) y EC-PSO (turbohélice), los dos de salida.
3. **El señalero sin gestos**, y «lo más cerca, 1 m» del puesto.
4. **«Stall, stall» en la subida inicial**: 54 kt, α 13,4°, 46 m y 1,28 g, con
   la primera muesca.

### Por qué, uno por uno

**El 2 lo puso el banco.** Con `OGA_PISTA_OCUPADA`, el banco le da un despegue
a EC-PSO (`traficoAnuncia`) cuando quien juega, en final, pasa de 75 a 62 m
«después de tu permiso». Lo de después de tu permiso era
`tusAutorizaciones.length > 0`: que hubiera sonado alguno **en todo el
vuelo**. Había sonado uno a los 683 s, en el ascenso de la primera frustrada,
con el juego en «final» siete segundos a 281 m y 1.329 m pasado el umbral. En
la segunda final no había permiso: la torre lo retenía por EC-GIX, una
avioneta que había entrado en la pista a los 947,5 s y a los 1041 s volaba a
197 m sobre el asfalto sin haber pasado su final, que es cuando la deja (Doc
4444, 7.10.1; ver `encimaDeLaPista` en `world/trafico.ts`). El banco le metió
detrás al turbohélice, y él mismo contó los dos. Ninguna torre lo hace, y la
del juego tampoco lo hizo: no se lo autorizó nadie.

**El 1 y el 3 son el presupuesto.** La primera frustrada, a los 617 s, fue por
EC-IUV; la segunda, a los 1052 s, por EC-GIX, que ya la daba sola sin el
turbohélice. Ninguna de las dos la puso el banco. Se tocó a los 1517 s, y a
los 1800 el avión rodaba a cien metros de su puesto (−700, −470 frente a
−653, −553). Sin frustradas ese vuelo acaba en 968 s —el mismo banco sin
`OGA_PISTA_OCUPADA`, en la misma ronda—, cada circuito son unos 430 s y de la
toma al puesto hay unos 305: dos frustradas son 1.830 s, y los treinta
minutos se habían puesto para que cupieran dos. Y el señalero no tenía nada
que hacer: el metro es el de la salida, que se empieza en el puesto.

**El 4 es el piloto del banco.** Hasta los 120 m la avioneta sube por actitud,
doce grados, y los sigue aunque la velocidad se caiga; a 62–64 kt con la
primera muesca, una racha de Los Rodeos la dejó a 54 kt y 1,28 g. Su
frustrada ya no hace eso desde la H34e del ADR 0027 —el ala lejos del
avisador, cuatro grados— y la subida inicial no se había llevado lo mismo.

**Las dos frustradas por las salidas**, que son las que no cupieron: EC-IUV y
EC-GIX entraron en la pista a los 497,5 y 947,5 s, con el JAZ 20 en el viento
en cola y la base, 47 y 29 s antes de coger la final, que en Los Rodeos le
empieza a 3,4 km del umbral, dentro de las dos millas de tu permiso. Para no
soltar a nadie así está `llegaAntesDeQueSalga`, que te mira también por el
circuito (`QuienJuega.llegada`). Pero esa llegada por el circuito
(`tuCircuitoParaLaTorre` en `game.ts`) es `null` con `haciaOtroCampo()`, y el
banco vuela una vuelta al campo con el plan del juego puesto hacia otra isla:
la instructora dijo «vuelo.enVueloDestino», que `guion-de-fases.ts` solo elige
con `haciaOtroCampo`. Así que en el viento en cola y en la base la torre no te
veía, y soltaba a quien salía. Es el banco haciendo lo que el juego no le
propone: el plan es una isla, y la tarjeta del destino pasa también por tu
propio campo, que es la vuelta al campo (`camposDelVuelo`, y `elDestino` da
`null` con el destino en la salida), y el banco no la elige. Lo que la torre veía de ti al entrar cada uno, el parte de quién entra
en la pista lo dice ahora (abajo).

### Si pasaba en la tanda 22

Lo que decide los cuatro es lo mismo en las dos: `world/trafico.ts`,
`flight/turno-de-pista.ts`, `flight/salida-tapada.ts` y `flight/radio.ts` no
cambian entre 3028690a y c16e9f0a, y en el banco tampoco la pista ocupada, el
presupuesto ni la subida por actitud de la avioneta. Del motor que tarda (ADR
0034) al JAZ 20 no le llega nada: el pistón responde en el acto. Lo que sí
cambió en Los Rodeos es de dónde sale el tráfico —el tipo de cada puesto del
AIP (H60f) y el 13 en vez del 14 (H65)—, y con eso a qué hora llega cada
salida a su doble raya. Así que la ronda vio una tirada mala de lo que ya
podía pasar; no una avería nueva.

**El mismo banco sobre c16e9f0a**, tal cual, con la máquina menos cargada:
**58 de 58**. Una frustrada, la puesta —EC-PSO a los 613 s con el avión a 75
m, con el permiso oído—; apagado a los 1394 s; tocó a 1,06 m/s, a 0,5 m del
eje; el avisador, ni una vez. Y en ese vuelo, a los 689 s, otra vez un «cleared
to land» en el ascenso de la frustrada: es lo de los 683 s del primero, y
queda abajo.

### Lo que se cambia, en el banco

- **La pista ocupada se pone con tu permiso en vigor y la pista vacía**: el
  permiso, oído o sonando (`sendaYPermiso().permiso`), y nadie del tráfico
  `enLaPista`. Es lo que se quería ver —alguien que entra después de tu
  «cleared to land»— y con eso no se pone encima de otro.
- **Y desde la segunda frustrada, diez minutos más de presupuesto**
  (`CIRCUITO_DE_MAS`), una vez: si con eso no cabe, el parte lo dice.
  `seQuedoSinTiempo` juzga con el tope que tuvo el vuelo, que va en el parte.
- **La avioneta, lejos del avisador también en la subida inicial**: a menos de
  cuatro grados del aviso, ni un grado más de morro que el que lleva, y la
  palanca se afloja ocho veces lo que se pasa, como `palancaDeLaFrustrada`.
- **Y quién entra en la pista dice qué veía la torre de ti**: la fase, tu
  llegada por la final, por el circuito y por la ruta, la de la torre, quién
  tapaba tu salida y lo de `porTuSalida`. Solo se lee.

### Los 2,03 m/s del vuelo sin pista ocupada

Es la recogida del banco. El juego mide la caída en la normal del suelo donde
se toca, que es la de siempre (H63 del ADR 0027), y el banco midió lo mismo:
2,03 del juego y 2,03 del modelo. La pista de Los Rodeos baja en el sentido
de la toma, así que contra ella se toca más suave que con el variómetro, y la
recogida del banco ya vuela contra la pista. Empezó a 8,3 m bajando 2,7 m/s;
en el vuelo de arriba, a 7,5 m bajando 2,4, tocó a 1,06. No se toca.

### Lo que queda

- **La vuelta al campo del banco, con el plan en la vuelta al campo.** Lo que
  dejó ciega a la torre es que el banco vuela el circuito de casa con el
  destino del juego en otra isla. Elegir la vuelta al campo al empezar
  (`ponerDestino` con el campo de salida) es lo que haría quien juega, pero
  cambia con qué plan se vuela **cada** vuelo entero sin destino —la
  ventanilla de la final se mide solo con el plan acabando aquí, y lo que
  dicen la torre y la instructora al salir es otro—, y eso pide su ronda.
- **Y la torre, que te vea en su circuito aunque tu plan vaya a otro sitio.**
  Quien vuelve de verdad a su campo, con el plan puesto en otra isla, vuela el
  viento en cola sin que la torre le cuente, igual que el banco. Una torre lo
  ve; aquí la llegada por el circuito se apaga entera con `haciaOtroCampo()`,
  también para quien ya va de vuelta.
- **«Cleared to land» en el ascenso de la frustrada.** A los 683 s en la
  ronda y a los 689 s en el vuelo de arriba: el juego pasa a «final» con el
  avión nivelado a 270–280 m sobre la primera mitad de la pista
  (`deducir` en `flight/vuelo.ts` admite la final hasta el centro de la pista,
  pensado para quien flota en la recogida), y la torre autoriza. El banco ya
  no se fía de eso para poner la pista ocupada.
- **El presupuesto crece una vez.** Con la avioneta a tiempo real caben tres
  frustradas (unos 2.260 s de 2.400); con cuatro no, y el parte lo dice.
- **Los tres cambios del banco no se han volado todavía.** Detrás del vuelo de
  arriba el navegador fue de la ronda, y a tiempo real no cabía otro antes de
  entregar: lo que hay es la sintaxis y los tipos. La guarda de la subida
  actúa también al soltar el suelo —en el vuelo de arriba, 39 de 831 muestras
  de la subida inicial a menos de cuatro grados del aviso, todas en el medio
  segundo de la rotación, a 1,35° lo más cerca—; es de esperar que no se
  note, y es lo primero que hay que mirar en la siguiente ronda.

## Enmienda (23-11-2026, H69): la torre ve tu circuito aunque tu plan vaya a otra isla, y en la frustrada no hay final

### El caso

Lo que quedó de H68, que eran dos fallos del juego y no del banco:

1. **La torre no veía tu circuito si tu plan iba a otra isla.**
   `tuCircuitoParaLaTorre` en `game.ts` era `null` entera con
   `haciaOtroCampo()`. Quien despega con el plan a otro campo y vuelve —porque
   se va al aire, porque se lo piensa mejor o porque es un ejercicio— volaba el
   viento en cola y la base sin que la torre lo contara, y la torre le soltaba
   salidas delante: EC-IUV y EC-GIX entraron en la pista 47 y 29 s antes de
   que el JAZ 20 cogiera la final, y le costaron dos frustradas.
2. **«Cleared to land» en la subida de la frustrada.** `deducir` en
   `flight/vuelo.ts` daba «final» a cualquier altura por debajo de trescientos
   metros hasta el centro de la pista, y en «final» se seguía encima de la
   pista entera (`posandose`, pensado para quien flota en la recogida, que no
   miraba la altura). En la subida de la frustrada el avión nivelaba a
   270–280 m sobre la primera mitad, el variómetro pasaba un pelo por debajo
   de cero y ya era «final». La torre mira la fase del plan antes que su propia
   final (`faseQueVeLaTorre`), así que autorizaba: a los 683 y a los 689 s, a
   quien se estaba yendo. La final de la torre ya no dejaba volver a entrar
   tras irse (`trasIrse` en `flight/final-de-la-torre.ts`), y la voz de la fase
   tampoco (`flight/la-final-tras-irse.ts`): los dos eran parches de lo mismo,
   puestos donde se oía. Faltaba la fase.

### Lo real

Una torre ve a quien está en su circuito, vaya a donde vaya su plan: la
separación entre llegadas y salidas se hace en el circuito (Doc 4444, 7.7.1.2,
ya citado arriba), y ahí se cuenta a quien lo vuela. Pero la subida por el eje
de la pista la vuela igual quien se va que quien da la vuelta; de verdad lo
distingue lo que dice por radio, y aquí, que quien juega no lo dice, lo
distingue su plan o haberse ido al aire en ese campo. Quien vuela el viento en
cola o la base a la altura del circuito, sin subir, está en el circuito.

Y quien se va al aire está en la frustrada y luego en el circuito: la
autorización de aterrizar es de una aproximación (7.10.2, y «El permiso es de
una aproximación» en `game.ts`), y la siguiente empieza cuando vuelve a estar
en final.

### Decisión

- **La torre te cuenta en su circuito por dónde vuelas**
  (`flight/circuito-de-la-torre.ts`, `CircuitoDeLaTorre`), con la misma franja
  y la misma altura de siempre: con el plan aquí o tras irte al aire aquí
  (`LaFinalTrasIrse.yendose`), todo el circuito, como antes; con el plan
  fuera, desde que vuelas el viento en cola o la base sin subir (más de 1 m/s,
  `SIN_SUBIR`, el mismo número de la final de la torre). Una vez visto, te
  sigue viendo hasta que sales de la franja o de su altura, y un bache no te
  borra de la fila. La subida por el eje con el plan fuera no se cuenta, y
  quien vira de vuelta hacia su isla subiendo por el viento en cola tampoco.
- **La fase del plan no vuelve a «final» en la frustrada** (`trasIrse` en
  `flight/vuelo.ts`). Irse de verdad es lo mismo que mira la torre,
  `seVaDeVerdad`: cien metros sobre lo más bajo de la final, o quince con el
  gas de despegue o con una orden de irse puesta. Para eso el juego le pasa al
  plan el gas y la orden (`PlanDeVuelo.paraIrse`), como ya le pasaba la pista
  de otros. Y se vuelve al darse la vuelta (`TORCIDO_PARA_SALIR`, 120°), al
  pasar el centro de la pista o al salir del pasillo de la final (400 m del
  eje). Los veinte metros que sacan de la fase no bastan para cerrarla, a
  propósito: son una corrección de senda con el teclado, y ésa sigue
  volviendo a final al bajar.

Sin frases nuevas: no hace falta ninguna.

### La prueba

- `flight/final-en-la-frustrada.test.ts`: la frustrada paso a paso con la
  máquina de fases, de la decisión a la altura del circuito por el eje,
  nivelando encima de la pista. Con el `vuelo.ts` de antes, cinco de seis en
  rojo: «final» nivelando, y siguiendo en «final» trescientos metros pasado
  el centro. La que no cambia, la corrección de senda, en verde en los dos.
- `flight/circuito-de-la-torre.test.ts`: el circuito del JAZ 20 en Los Rodeos
  con sus vértices y lo que queda por la línea quebrada, como en el juego. Con
  la regla de antes, ningún punto del circuito con el plan fuera; ahora, el
  viento en cola menos su esquina y la base entera, y nada de la salida por el
  eje ni de la que vira de vuelta subiendo.
- `flight/circuito-con-plan-a-otra-isla.test.ts`: la mesa de
  `permiso-a-tiempo.test.ts` con el JAZ 20 por su viento en cola y su base y
  el plan en otra isla, la frecuencia, el tráfico dibujado y el turno de Los
  Rodeos; dos cabeceras, ocho momentos y tres semillas. Con la regla de
  antes, **2 de 48** llegadas con una salida entrando en la pista en el
  minuto de antes de la final y **5 al aire**; con la de ahora, **0 y 0**.

### Lo medido

En el navegador, sobre una copia fija de la rama:

- **`OGA_PISTA_OCUPADA=1 … tenerife-norte taguato 1 jaz-20`: 58 de 58**
  (dos sin medir). Una frustrada, la que pone el banco: EC-PSO entra a los
  617,5 s con el avión en final a 75 m, «go around» a los 623,8 s por la
  pista ocupada, a 60 m. Los permisos, uno por final: «aterrizar» y «cleared
  to land» a los 542 y 549 s, a 189 m, y a los 978 y 986 s en la final
  siguiente; **ninguno en la subida de la frustrada**, donde H68 los oyó a
  los 683 y 689 s. Ninguna salida soltada delante en el viento en cola ni en
  la base: la única que entró en la pista fue la del banco. Apagado a los
  1.398 s.
- **El mismo sin la pista ocupada: 57 de 58** (dos sin medir). Ninguna
  frustrada —en la ronda de la tanda 23, sobre 2f861096, ese vuelo se fue una
  vez al aire por EC-ABY encima—, un permiso, a los 548 y 555 s, y apagado a
  los 973 s. El rojo es **«ningún tráfico viene de frente en la salida ni en
  la final»**: 43 muestras desde los 566 s, en «final», con EC-XGI a 4.213 m
  y 90 m por encima, de frente. El parte no dice qué hacía EC-XGI, y no está
  averiguado si viene de esto: en la ronda anterior ese vuelo salió en verde,
  y la torre le mandó al aire a dos del tráfico en los dos vuelos, como en
  todos los de esa ronda. Las salidas que se quedan sin soltar delante de ti
  cambian a qué hora vuela cada uno del tráfico, y con eso dónde está cada uno
  cuando llegas.

Y el vitest entero de la rama: 581 ficheros, 11.566 pruebas en verde.

### Lo que queda

- **Qué hacía EC-XGI** de frente a 4,2 km de la final. El parte dice ahora,
  de quien viene de frente, su tipo, si llega y con permiso, si da la vuelta
  de espera, su rumbo frente al tuyo y dónde y cuándo os cruzaríais. Falta
  volar ese banco otra vez y leerlo.
- **El JAZ 40 con la pista ocupada** (`OGA_PISTA_OCUPADA=1 … tenerife-norte
  taguato 1 jaz-40`) no se voló: detrás del segundo vuelo el anillo de
  memoria lo tenían los bancos y los vitest de otros, y no cabía con el vitest
  entero de esta rama antes de entregar. El circuito que vuela el JAZ 90 no
  cambia, y su banco de Gran Canaria tampoco se voló.
- **La subida por el eje con el plan fuera** sigue sin contar para la torre:
  quien despega con el plan a otra isla y da la vuelta al campo desde la
  subida, sin irse al aire, entra en su fila al llegar al viento en cola, no
  antes. Es lo que distingue una salida de una vuelta sin oír a quien vuela.
- **La final de la torre y la voz de la fase tras irse al aire**
  (`trasIrse` en `final-de-la-torre.ts` y `la-final-tras-irse.ts`) siguen
  como estaban, ahora por encima de una fase que ya no vuelve a «final» en la
  frustrada. Si se quitan, que sea con su prueba.

## Enmienda (23-11-2026, H71): sin radio, la torre habla con la lámpara

El fallo de radio (ADR 0014, enmienda H71) le pide dos cosas a la torre, y
las dos son de este ADR:

- **Que lleve el turno de quien vuelve sin radio aunque la lección no lleve
  torre.** La vuelta al campo (`VUELTA`) no tiene torre: no hay permiso de
  despegar ni de aterrizar, y la torre solo contestaba las llamadas de
  emergencia. Con la radio callada, el turno de la pista y el permiso de
  aterrizar en su final van por `laTorreTeLleva` —la lección con torre, o la
  radio callada—: un 7600 en la pantalla de la torre es alguien que vuelve a
  aterrizar, y se le turna como a cualquiera, con el tráfico que haya.
- **Que diga lo mismo sin voz.** Lo que la torre decide no cambia: la orden
  de irse con la pista ocupada, la otra punta o la salida tapada, y el
  permiso de aterrizar cuando la pista es tuya. Cambia cómo llega: la voz de
  la torre y la del otro avión se caen en su boca (`callaSalvo`), la tira no
  escribe, y lo que se dice se enciende: la orden, roja fija; el permiso,
  verde fija; y mientras te cuenta en su circuito sin haberte dejado todavía,
  destellos verdes —«regrese para aterrizar», SERA, apéndice 1, tabla AP
  1-1—. La regla va en `flight/fallo-de-radio.ts`, con su prueba; el permiso,
  que esperaba a que su voz empezara a sonar para pintar la verde, sin radio
  la pinta en el acto, que no hay voz que esperar.

Lo demás de la torre queda como estaba, y al cerrarse el ejercicio vuelve la
radio.

## Enmienda (23-11-2026, H71c): recién despegado, la torre no te ve en final

El fallo de radio (ADR 0014, enmienda H71c) volvió a encender la verde fija
subiendo, a 176 m, y no era de la final de la torre: era de **la fase del
plan**, que la torre mira antes que su propia final (`faseQueVeLaTorre`).
Por una pista larga, la avioneta pasa de los 120 m antes del centro, y ahí un
bache daba «final» en `deducir`; encima del asfalto se seguía en ella
(`posandose`). Es lo mismo que la H69 arregló para la frustrada, en el otro
extremo del circuito.

- **Recién despegado no hay final** (`recienDespegado` en `flight/vuelo.ts`),
  hasta haberse dado la vuelta, haber salido del pasillo de la final, estar
  por delante de la pista o volver al suelo. Como la torre lee esa fase, no
  te da la pista ni te pide el permiso en la subida, ni con radio ni sin
  ella. La final de la torre, que solo se coge delante del umbral, no cambia.
- **Y el banco sabe de dónde le sale la final a la torre**: al pasar a
  «final» queda apuntado «la torre te ve en final: la fase del plan» o «su
  final». El primer arreglo de esto, en la H71, se puso en la final de la
  torre porque nadie lo apuntaba.

Lo que queda: el permiso dado con una «final» que solo era del plan no se
retira al salir de ella —lo retira la salida de la final de la torre—. Con
esta regla y la de la H69 no se ha encontrado otra «final» del plan sin la
de la torre, ni en la subida ni en la frustrada; pero si apareciera, la
verde duraría el circuito entero, como en este banco.

Comprobado en el navegador, con las voces grabadas: el fallo de radio en
Gran Canaria con el JAZ 20 dos veces seguidas, 13 de 13; con la pista
ocupada, 13 de 13; con el JAZ 40, 13 de 13; y el vuelo entero de Tenerife
Norte con el JAZ 20, 58 de 58, con un permiso y en la final. El vitest
entero, 584 ficheros y 11.624 pruebas en verde.

## Enmienda (24-11-2026, H73): el permiso de aterrizar es de una aproximación, y si se deja se retira

### El caso

Lo que dejó escrito la H71c: la torre te ve en final por dos caminos —la fase
«final» del plan y su propia final, `faseQueVeLaTorre`— y el permiso solo lo
retiraba salir de la segunda. Se buscó en una mesa de node, con la máquina de
fases, la final de la torre y el permiso en el orden del juego, qué lo dejaba
vivo **hoy**. No era un resto teórico: eran siete formas, y solo dos venían
por la fase del plan.

| Lo que se vuela | Con la regla de antes |
| --- | --- |
| La frustrada con el permiso ya oído | retirado |
| **La frustrada con el permiso todavía sonando** | **vivo** el circuito entero: se retiraba solo el oído, y al acabar de sonar, ya fuera, se daba por oído |
| **Dado con la «final» del plan sola**, y la frustrada, o la media vuelta | **vivo**: a cuatro millas, gas a fondo y veinte metros arriba es irse para la torre, que no vuelve a entrar hasta la media vuelta; se sigue bajando, y a trescientos metros la fase del plan es «final» |
| El mismo, y tocar y despegar | **vivo** subiendo: tocar lo gastaba solo si se estaba en la final de la torre |
| **Pasar la pista de largo sin subir** | **vivo**: para la final de la torre es salirse «fuera», que no retiraba nada |
| **Romper la final a un lado**, de través, y luego el viento en cola | **vivo**: se sale del cono antes de los 120°, «fuera» |
| **Un viraje que cruza el eje bajo**, cerca del umbral | **vivo**: lo mismo |
| Alejarse por un lado sin darse la vuelta | **vivo**: lo mismo |
| Irse al aire y seguir derecho a **otro campo** con la pista al mismo rumbo | la torre de allí no te veía en su final, y el permiso salía a 300 m |
| **Despegar de una pista con la cabecera desplazada** (la 01 de Fuerteventura) | el permiso **al despegar**: ver abajo |
| La cabecera de enfrente pasa a ser la de uso a media final | retirado: para ella se va en media vuelta |
| La frustrada sin seguir: gas y diez metros, y abajo otra vez | vale el que había, como tiene que ser |
| Quien se coloca en el aire | ninguno de más: todos los de la mesa empiezan así |
| El vuelo libre sin plan, o una lección sin torre | no hay permiso que pedir (`laTorreTeLleva`) |

Y lo peor de los vivos no era la lámpara: en la final siguiente la torre **no
daba otro permiso**, porque el de antes seguía «oído». Sin radio, la verde
fija duraba el circuito.

La cabecera desplazada no se había visto. La final de la torre se coge por
delante del umbral **de aterrizar**, y en la 01 de Fuerteventura, con mil
metros de desplazado, la avioneta deja el suelo setecientos metros antes de
él: alineada, dentro del cono y, en el primer instante, con la vertical por
debajo de un metro por segundo. Entraba, y a los doce metros, cuando la fase
pasa a «en vuelo», la torre te veía en final y te daba la pista para
aterrizar. Con el gas de despegue entero se iba a los quince metros; con el
gas reducido, a los cien. Las otras desplazadas de más de cuatrocientos
metros: la 19 de Fuerteventura y cuatro de Barajas.

### Lo real

La autorización de aterrizar es de una aproximación (Doc 4444, 7.10.2, ya
citado en la H69): quien se va, se da la vuelta o pasa la pista de largo no
la lleva puesta al circuito, y la torre le da otra en la final siguiente. Y
quien corrige la senda o se pasa un poco del eje al coger la final sigue en
la misma, y no se le repite.

### Decisión

- **El permiso se retira cuando se deja su aproximación, mirando lo que hace
  el avión desde que se dio** y no por dónde le veía la torre
  (`flight/aproximacion-del-permiso.ts`, `AproximacionDelPermiso`): irse al
  aire de verdad (`seVaDeVerdad`, la misma regla de la torre y de la fase,
  desde lo más bajo desde que se dio), darse la vuelta (120°), salirse del
  cono hacia fuera y de través (60°, los de entrar en ella), pasar la otra
  punta de la pista sin tocar, alejarse más allá de donde llega la final de
  la torre, tocar, u otra pista. Ningún número nuevo.
- **Y también por la torre y por la fase**: salir de la final de la torre por
  donde antes, y entrar el plan en la frustrada (`mirarSiSeDejaLaAproximacion`
  en `game.ts`). Se retira esté oído, sonando o esperando turno; lo que de él
  espere en la boca no se dice, y la lámpara y la tarjeta se apagan si eran
  suyas (`retirarElPermiso`).
- **No se deja por un bache**: veinticinco metros corrigiendo la senda, el
  bamboleo de ochenta sin el gas de despegue, salirse del cono al coger la
  final y volver, flotar media pista o diez metros con el gas a fondo siguen
  con el suyo, dicho una vez.
- **Levantar una orden de irse sin volver a darte la pista lo retira**: la
  orden lo había anulado. **Sin motor no hay otra aproximación**: solo se
  gasta tocando o con otra pista. Y con una **emergencia declarada y motor**,
  quien deja la aproximación a la que se autorizó tiene otra al alinearse
  (`LaOtraCabecera.seDejoLaAproximacion`): se retiraba y nadie la volvía a
  dar.
- **Con otra pista, la final de la torre empieza de cero**
  (`mirarSiCambiaLaPista`): otro campo, o la otra cabecera.
- **Recién despegado, la final de la torre tampoco** (`recienDespegado` en
  `LoQueVeLaTorre`): la regla de la H71c, que solo miraba la fase, vale ahora
  para los dos caminos.

Sin frases nuevas: no hace falta ninguna.

### La prueba

`flight/permiso-de-una-aproximacion.test.ts`: cada caso de la tabla con la
regla de antes y con la de ahora, en la misma mesa; los vivos están
comprobados como vivos con la de antes, y con la de ahora se retiran por lo
que toca y la final siguiente lleva el suyo. Los baches, la cabecera
desplazada y la aproximación publicada, igual con las dos. La lámpara del
fallo de radio, con la pista pasada de largo: antes, verde en el viento en
cola; ahora, destellos, y verde en la final siguiente. Y
`LaOtraCabecera`, que se rearma solo si se dejó y solo fuera de los embudos.

### Lo medido

En el navegador, con las voces grabadas, sobre una copia fija de la rama
(el `src/` de 5fa3609e):

- **`radio gran-canaria jaz-20 taguato`: 13 de 13.** Destellos a 197 m, las
  alas a los 3,1 s, la verde fija en la final a 248 m, y la toma con ella a
  82 m del umbral, cerrada con `ejercicio.radio.bien`.
- **`verificar-vuelo-entero.mjs tenerife-norte taguato 1 jaz-20`: 58 de 58**
  (dos sin medir). Un permiso, y en la final: «aterrizar» a los 539 s, a
  197 m, y «cleared to land» a los 547 s, a 186 m; nadie de frente; apagado a
  los 961 s.

Y el vitest entero de la rama: 585 ficheros y 11.663 pruebas en verde, con 32
saltadas y una pendiente. `tsc --noEmit -p .`, en verde.

### Lo que queda

- **Los bancos con la pista ocupada** (`OGA_PISTA_OCUPADA=1`, el de Gran Canaria sin radio y el de Tenerife
  Norte) no se volaron: el anillo de memoria y el navegador los tenían otros
  hasta la hora de entregar. La mesa vuela la frustrada con el permiso oído y
  sonando; falta verla con la orden de la torre y el tráfico.
- **El despegue por delante del umbral desplazado** se ve en la mesa, no en el
  navegador: falta un despegue del JAZ 20 por la 01 de Fuerteventura con la
  lámpara apuntada.
- **Quien se va al aire a cuatro millas y se arrepiente** sigue como estaba:
  para la torre se fue, no vuelve a su final hasta la media vuelta, y su
  permiso sale por la fase del plan, a trescientos metros. Ahora, ese permiso
  también se retira si se deja.
- **Lo que ya está sonando se acaba**: quien se va en mitad del «autorizado
  para aterrizar» oye el final de la frase con la lámpara ya apagada. Cortarla
  sería un sobresalto, y no hay orden que la contradiga.

## Enmienda H81 (24-11-2026): al que ya está alineado no se le retiene por ti

Con el pavimento nuevo de Los Rodeos (ADR 0025, H81) cambian los horarios del
tráfico, y de las 48 llegadas de `circuito-con-plan-a-otra-isla.test.ts` una
acababa al aire. Trazada segundo a segundo: EC-MLA se alinea a los 832 s, sin
nadie a la vista; el JAZ 20 entra en el circuito a los 840, a doscientos cuarenta
segundos del umbral; y desde los 845 la torre lo retiene en la cabecera, porque
no se habría ido a tiempo para el permiso del JAZ 20 (`antesDeTuPermiso`, Doc
4444, 8.9.6.1.7). Lo suelta a los 990, con el JAZ 20 ya en la final, y a los 1.050
lo manda al aire con la pista ocupada.

Ese margen es para no meter a nadie delante de ti. Con uno ya encima de la pista
hace lo contrario: retenerlo te la tapa. Para el que está alineado, la salida se
da si se habrá ido antes de que cruces el umbral, sin el margen del permiso. El
alinearse sigue con él.

Con la regla: 0 de 48 al aire y ninguna salida en la pista en el minuto de antes
de la final; y las 35 pruebas de tráfico y turno de pista, 494 en verde.

## Enmienda H93 (25-11-2026): la vuelta de espera, por donde no pasa nadie

### El caso

En la ronda de cierre de la tanda 26, dos de cinco vuelos enteros desde Los
Rodeos dieron rojo en «y ningún tráfico viene de frente»: una avioneta que
esperaba turno, en su vuelta de espera, con el rumbo contrario al del JAZ 50 y
al del JAZ 90 en su viento en cola. En los 57 vuelos de las rondas anteriores no
había salido.

No lo trajo ningún cambio: estaba desde antes. Una mesa sin navegador
—la frecuencia, el turno, el tráfico con sus calles y el relieve de verdad, y
quien juega despegando cuando le dejan y dando su circuito con los virajes de
su avión, hasta 300 m a un lado u otro de la línea—, 600 vuelos en Los Rodeos
por versión (las dos cabeceras; JAZ 20, 50, 60, 90 y 120; 60 semillas):

| | rojo con el criterio del banco | a menos de 300 m y 150 de altura, en su vuelta |
|---|---|---|
| 809545a4 (tanda 24) | 18 | 9 |
| 477c30ff (tanda 25) | 20 | 11 |
| 33ad3c06 (tanda 26) | 20 | 11 |

El JAZ 90 y el JAZ 120 por la 12, que son los que más, uno de cada once vuelos.
La regla de H81 (`llegaAntesDeQueSalga` con `alineado`) no lo mueve.

### Por qué

La vuelta se daba siempre en la esquina de la base, hacia fuera del circuito, a
tres grados por segundo y sin mirar a nadie:

- **Fuera del viento en cola de uno está el del otro.** La avioneta lo lleva a
  1.000 m del eje y su vuelta, de 764 m de radio, se abría hasta 2.528. El JAZ
  50 vuela el suyo a 1.800, el JAZ 90 a 2.460. En Los Rodeos, además, el terreno
  sube los circuitos bajos y van todos a alturas parecidas: 52 m entre la
  avioneta y el JAZ 90.
- **Y la esquina de uno está en la base del otro.** Lo peor no era la avioneta:
  era el turbohélice, dando su vuelta en su esquina, por donde el JAZ 90 corta
  la suya. A 40 m y a su altura. Eso el banco no lo veía nunca, porque no va de
  frente.

En nueve de los once, el que espera va **detrás** de ti en la fila. Está bien
que espere; lo que estaba mal es por dónde.

Y el criterio del banco señalaba a otros: alarga un minuto en línea recta el
rumbo de uno que está virando. Ninguno de los 20 rojos es uno de los once: los
que salían rojos pasaron a entre 340 m y 1,9 km, y los que pasaron cerca no iban
de frente.

### Lo real

- **OACI, Doc 4444 (PANS-ATM), 12.3.4.17**, «Delaying aircraft»: «CIRCLE THE
  AERODROME; ORBIT (RIGHT, or LEFT) [FROM PRESENT POSITION]; MAKE ANOTHER
  CIRCUIT». **FAA, JO 7110.65, 3-8-1**: «EXTEND DOWNWIND», «MAKE SHORT APPROACH»,
  «MAKE LEFT/RIGHT THREE-SIXTY». Hacia dónde se vira lo dice la torre, y las dos
  manos valen.
- **SERA.3225 b) y c)** (OACI, Anexo 2, 3.2.5): seguir la corriente de tránsito
  de los demás o mantenerse apartado de ella, y virar a la izquierda salvo que el
  control diga otra cosa.
- **CAA de Nueva Zelanda, *Flight Instructor Guide*, «Circuit considerations»**:
  la órbita es «a procedure used by ATC to improve separation from aircraft
  ahead»; se da en el viento en cola y es «a 360-degree medium level turn,
  outside the circuit pattern, which positions the aeroplane back into the
  downwind leg, at about the same place, approximately one minute later». Y
  avisa de esto: «a conflict with traffic approaching head-on is a real
  possibility». En la base y en la final, no.
- **FAA, AIM 4-3-5**: un tres sesenta en el circuito no se da sin decírselo
  antes al controlador, o si lo manda él.

Quien la hace es el que va detrás en la secuencia, a la orden de la torre.

### Decisión

- **Un viraje medio, treinta grados** (`ALABEO_DE_LA_VUELTA`), y no tres grados
  por segundo, que es lo de una espera instrumental. La avioneta la da en 44 s y
  abre 564 m, donde daba la vuelta en dos minutos y abría 1.528.
- **La torre mira por dónde vas a pasar** (`vueltaSegura`), tú y los demás del
  tráfico, durante todas las vueltas que le hagan falta. Hacia fuera si por ahí
  no pasa nadie; si no, hacia la pista, sin acercarse a menos de 300 m de la
  final; y si por los dos lados os encontráis, más amplia —25° o 20°—, que es lo
  que cambia cuándo vuelve. A 600 m de ti, porque nadie vuela la línea clavada,
  y a 300 de los demás; con 150 m de altura entre los dos no cuenta.
- **Y al final del viento en cola, no solo en la esquina** (`leTocaEsperar`):
  desde que pasa a la altura del umbral, si la de la esquina le va a llevar por
  donde pasa alguien y la de ahí no. El que espera antes de la esquina no pierde
  su sitio en la fila (`enLaFila`).
- **Por dónde vas** lo dice el juego (`QuienJuega.porDondeVuela`): lo que te
  queda de tu circuito con las esquinas viradas a tu velocidad, sin devolverte a
  la línea si la llevas abierta (`porDondeSigues`), y si no estás en él, por
  derecho.
- **El banco mide de verdad lo que antes alargaba.** Las dos rectas se alargan
  si los dos van derechos; de frente a menos de 300 m cuenta siempre; y hay una
  comprobación nueva, «y nadie da su vuelta de espera por donde pasas»: a menos
  de 300 m y 150 de altura, venga como venga.

No se toca quién espera ni a quién: la fila y su separación son las mismas.

### La prueba

`src/world/vuelta-de-espera.test.ts`: la mesa, con 160 vuelos en Los Rodeos por
la 12, y la cuenta ve el caso —sin saber la torre por dónde vuelas, sale—; y
`porDondeSigues`, a solas.

### Lo medido

A menos de 300 m y 150 de altura, uno en su vuelta de espera, en la mesa con los
virajes en arco:

| | vuelos | antes | ahora |
|---|---|---|---|
| Los Rodeos, las dos cabeceras, cinco aviones | 600 | 12 | 0 |
| Los Rodeos por la 12, JAZ 60 y 90, otras semillas | 160 | 14 | 0 |
| Gando | 60 | 7 | 0 |
| Cuatro Vientos | 60 | 8 | 0 |
| Tenerife Sur | 60 | 2 | 0 |
| La Palma | 60 | 2 | 0 |
| Pettirossi | 60 | 1 | 0 |
| Fuerteventura | 60 | 1 | 0 |
| Lanzarote | 60 | 0 | 0 |

Y entre dos del tráfico, uno en su vuelta, de 6 a 0 en los 600. Lo que esperan
los demás, lo mismo: de 66,7 a 65,9 s por llegada, 659 y 654 tomas; en los otros
campos, entre 16 s menos (Fuerteventura) y 8 más (La Palma).

Con el criterio de antes, el banco seguiría dando 19 rojos de 600 sin que ninguno
pase a menos de 480 m en su vuelta: por eso hacía falta cambiarlo también. Con el de ahora,
ninguno en los 80 vuelos por la 30 en los que el de antes daba once.

Mirarlo cuesta 0,7 ms en el percentil 99 y 2,8 en el peor caso, una vez por
segundo y solo mientras hay que esperar. El vitest entero, en verde: 591 ficheros
y 12.008 pruebas, con 32 saltadas y una pendiente.

### Lo que queda

- **Los bancos del navegador no se volaron**: los tenía la ronda de cierre.
- **Llegando por la ruta del plan**, fuera del circuito, la mesa no vuela: ahí lo
  que mira la torre es que sigues derecho.
- **Barajas no está en la mesa**: su aeródromo no va con los demás escenarios.
- **La verde con uno en la base.** En 46 de los 600 vuelos (54 con lo de ahora,
  tres semillas más) alguien que no espera pasa a menos de 300 m, casi siempre en
  la subida: la torre te da la pista con uno en la base que todavía no ha cantado
  final, llega a la decisión contigo en ella, se va al aire y sube por encima de
  tu despegue. No es de la vuelta de espera y es de antes; con vueltas más cortas
  hay algo más de gente en la base. Pide su encargo.
- **La vuelta que la torre te pide a ti** (`salida-tapada.ts`) sigue siendo de
  tres grados por segundo y hacia fuera: no mira a los demás.

## Enmienda H94 (25-11-2026): la verde con uno en la base, y al aire por el lado

### El caso

Lo que quedó de H93. En su mesa —600 vuelos en Los Rodeos: las dos cabeceras;
JAZ 20, 50, 60, 90 y 120; 60 semillas—, en 54 vuelos alguien del tráfico **que
no da vueltas** pasa a menos de 300 m y 150 de altura de quien juega. Contados
uno a uno, son 56 encuentros:

| | cuántos | a qué distancia (en planta; en altura) | cuándo |
|---|---|---|---|
| **la verde con uno girado a la base o en final**, que se va al aire por ti y sube por tu línea | 39 | 0–295 m, mediana 10; mediana 73 m | 38 en tu subida y uno en el viento cruzado, de 14 a 127 s después de irte |
| **uno que sale detrás de ti** y te alcanza antes de tu giro | 8 | 7–95 m; 11–115 m | subida, 82–96 s después |
| **uno que se fue al aire antes de tu verde** y va delante, más despacio | 7 | 0–204 m; 12–105 m | subida, 28–65 s después |
| uno que se fue al aire y vuelve por su viento en cola, al lado del tuyo | 2 | 75 y 203 m; 60 y 15 m | viento en cola |

Al de la base **le quedaban de 29 a 76 s para la decisión** (mediana, 52) cuando
te dieron la verde, y quien juega tarda de 47 (JAZ 20) a 69 s (JAZ 120) en
estar en el aire. No había cantado final: con la roja puesta la frecuencia
solo deja hablar al que ya ocupa la pista o va a cantarla, y con la pista libre
un instante la lámpara se ponía verde sin mirar quién venía volando. En 87 de
los 600 vuelos se daba la verde a alguien que no iba a irse antes; en los que
no salía cerca, el otro se fue al aire más alto o más lejos.

**Ninguno es solo de la mesa.** Con quien juega tardando 8 s en alinearse, y no
25, salen los mismos: 27 de los 240 vuelos del JAZ 20, 50, 60 y 90 por la 12 (15
de la verde, por 20 antes, y más de los que van delante). Y tardando cien —un
niño parado en la cabecera—, 50 de 360.

Entre dos del tráfico pasaba lo mismo: 13 parejas a menos de 300 m en los 600.

### Lo real

- **OACI, Doc 4444 (PANS-ATM), 16.ª ed.** 7.9.2: «a departing aircraft will not
  normally be permitted to commence take-off until the preceding departing
  aircraft has crossed the end of the runway-in-use or has started a turn or
  until all preceding landing aircraft are clear of the runway-in-use».
  7.9.3.1: «Take-off clearance may be issued to an aircraft when there is
  reasonable assurance that the separation in 7.9.2 […] will exist when the
  aircraft commences take-off». 7.10.1, quien llega no cruza el umbral hasta
  que la salida de delante ha pasado el final de la pista o ha empezado a virar.
  7.8, quien aterriza o está en las últimas fases de la aproximación va antes
  que quien sale. Y 7.7.1.2, en el circuito se deja el hueco para las salidas.
- **La salida inmediata** (7.9.3.5): «In the interest of expediting traffic, a
  clearance for immediate take-off may be issued to an aircraft before it enters
  the runway. On acceptance of such clearance the aircraft shall taxi out to the
  runway and take off in one continuous movement». Es lo que se usa con uno en
  la base, y es para quien puede hacerlo: no se le pide a quien está
  aprendiendo. Lo mismo el «behind the landing …, line up and wait»: la
  autorización condicional pide ver al que llega, y aquí la lámpara es roja o
  verde.
- **SERA.8012** es la separación por estela, no la de la pista; la de la pista, en
  Europa, va en los medios aceptables de ATS.TR.210, que no se han podido leer
  (la página de EASA no da el texto). La del **FAA, JO 7110.65, 3-9-6 y 3-10-3**,
  es la misma regla con sus distancias si la otra va en el aire; tampoco se ha
  releído, que faa.gov no deja. Lo que manda aquí es el Doc 4444, que sí.
- **Quien se va al aire con otro despegando, se aparta del eje para verle.**
  FAA, *Airplane Flying Handbook* (FAA-H-8083-3), «Standard airport traffic
  patterns»: el tramo de la pista es también el de quien se va al aire desde la
  final, y «when a safe altitude is attained, the pilot should commence a
  shallow bank turn to the upwind side of the airport. This will allow better
  visibility of the runway for departing aircraft». CAA de Nueva Zelanda,
  *Vector*, 3/2017, «Go-arounds»: «If the go-around was initiated due to traffic
  on the runway […] it is advisable to perform the procedure to the right of
  centreline. This ensures that any aircraft on the runway, or climbing out,
  remain in sight to the pilot's left». FAA, AC 90-66C, 11.6: ni quien despega
  ni quien se va al aire vira antes del final de la pista.
- **TAIC (Nueva Zelanda), informe 95-012**, un 737 y un HS 748 en Wellington:
  es este caso. Al 748 se le dio la salida con el 737 a 1,1 millas del umbral;
  de haberse ido al aire, lo habría adelantado «within 60 seconds, or about 1 NM
  north of the aerodrome». Y: «Historically ab-initio pilot training has taught
  that aircraft going around from short final should be flown to the right, or
  to the non-traffic side of the runway ahead», que con un reactor pesado o con
  un monte a ese lado puede no valer.

### Decisión

**La torre no da la pista** (`estorbanTuSalida` en `world/trafico.ts`; la pieza
«llega» de `pistaDeOtros`):

- si uno **ya girado a la base** llega a la decisión antes de que estés en el
  aire, con cinco segundos de margen. Lo que tardas lo dice el juego
  (`QuienJuega.sale`, `tuSalidaParaLaTorre` en `game.ts`): entrar y alinearse,
  lo que remontes, y la carrera de ese avión con su peso.
- si alcanzarías a **uno que vuela por delante** —se fue al aire, o acaba de
  salir—, mirando los próximos tres minutos por tu circuito, con las esquinas
  viradas.

El que todavía **no ha girado** no te frena: da él su vuelta en la esquina, la
de H93. Con la pista ya tuya, si llegaría a la decisión contigo en ella; y
contigo en la roja, si nadie ha girado antes que él (`tuTurnoDeSalir`): uno
aterriza y sale otro. Y entre dos llegadas se deja el hueco en que cabes
(`huecoParaTuSalida`). Al que ya baja por la final no se le manda al aire por
ti hasta la decisión, si al umbral vas a estar en el aire.

**Todo candado con su red**: a los tres minutos de roja solo por esto, la torre
te la da (`LO_QUE_SE_ESPERA_POR_QUIEN_LLEGA`); a los cinco, los que llegan dejan
de esperar por ti, en la roja y con la pista dada (`ESPERAN_POR_TI`). El porqué
de la roja es el de siempre, «viene un avión a aterrizar», con su matrícula:
**sin frases nuevas**.

**Quien se va al aire con otro despegando no sube por su línea**
(`alAirePorElLado`): se aparta 600 m al lado muerto en dos kilómetros —unos
diecisiete grados—, el contrario a **tu** circuito, sube paralelo a la pista y
gira donde siempre si al girar no se encuentra contigo ni con nadie
(`girarSiSePuede`); si no, sigue derecho y mira otra vez, hasta seis kilómetros.
Si por ese lado no libra el suelo por 100 m, por el otro; y si por ninguno, por
el eje. Vale por ti, desde que tienes la pista hasta que viras, y por cualquiera
del tráfico que la corra. Sin nadie saliendo, por el eje como siempre.

**Detrás de uno más lento no se sale hasta que se aparta** (`seEchariaEncima`):
el «cleared for take-off» espera si a 600 m de ti —300 de otro del tráfico— y a
menos de 150 de altura os vais a encontrar. Alinearse, sí. Con su red: 150 s.

**Y de paso, la vuelta que la torre te pide a ti** (`ladoDeTuVuelta`): hacia
fuera, o hacia la pista si por fuera pasa alguien, con la misma cuenta que la de
los demás. La flecha de la tarjeta y la torre ya sabían decir los dos lados.

`porDondeSigues` desempataba por redondeo entre la subida y la final, que con el
umbral desplazado son la misma recta: a quien acababa de despegar de
Fuerteventura le salía que seguía por la final, y por eso se le soltaba uno
detrás. Ahora gana la subida.

### La prueba

`src/world/verde-con-uno-en-la-base.test.ts`: quién estorba y quién no; la red;
el lado muerto con las dos manos, el eje sin nadie y que acaba girando aunque te
quedes en la pista; la salida detrás de ti y su red; el empate de la subida; tu
vuelta; y la mesa, 93 vuelos en Los Rodeos sin nadie encima —y 62 tardando cien
segundos—, que sin saber la torre que sales da catorce. La mesa es la de H93,
sacada a `mesa-del-circuito-de-prueba.ts` para las dos.

### Lo medido

A menos de 300 m y 150 de altura, sin estar en su vuelta, en vuelos:

| | vuelos | antes | ahora |
|---|---|---|---|
| Los Rodeos, dos cabeceras, cinco aviones | 600 | 54 | 0 |
| Los Rodeos, tardando cien segundos alineado | 360 | 50 | 0 |
| Gando | 60 | 4 | 0 |
| Cuatro Vientos | 60 | 2 | 0 |
| Pettirossi | 60 | 6 | 0 |
| Tenerife Sur | 60 | 6 | 0 |
| La Palma | 60 | 0 | 0 |
| Fuerteventura | 60 | 9 | 0 |
| Lanzarote | 60 | 2 | 0 |

Y en su vuelta, ninguno, como con H93; entre dos del tráfico, en los 600, de 13
a 0.

**Lo que se espera por la verde**, s (media; mediana; p90; máximo), y los demás:

| | antes | ahora | se van al aire en la decisión | tomas | espera por llegada |
|---|---|---|---|---|---|
| Los Rodeos (600) | 24,9; 2; 97; 246 | 35,9; 2; 118; 246 | 174 → 39 | 654 → 742 | 65,9 → 60,9 s |
| Gando (60) | 50,8; 24; 177; 197 | 49,0; 24; 115; 197 | 15 → 7 | 69 → 74 | 62,6 → 60,2 s |
| Cuatro Vientos (60) | 11,3; 2; 61; 75 | 17,3; 2; 75; 104 | 11 → 3 | 54 → 60 | 76,8 → 70,8 s |
| Pettirossi (60) | 34,5; 2; 106; 107 | 40,2; 12; 107; 139 | 16 → 7 | 62 → 68 | 48,0 → 45,8 s |
| Tenerife Sur (60) | 30,1; 2; 108; 112 | 39,4; 15; 120; 149 | 22 → 6 | 58 → 69 | 66,2 → 58,3 s |
| La Palma (60) | 80,0; 55; 182; 274 | 81,5; 56; 182; 274 | 20 → 18 | 71 → 71 | 86,4 → 84,9 s |
| Fuerteventura (60) | 20,4; 2; 88; 99 | 25,4; 2; 88; 126 | 16 → 1 | 61 → 69 | 65,5 → 57,7 s |
| Lanzarote (60) | 19,1; 2; 89; 102 | 19,4; 2; 89; 102 | 11 → 3 | 57 → 63 | 62,6 → 60,5 s |

**La roja sí sale a más**: once segundos de media en Los Rodeos, entre nada y
nueve en los otros y dos menos en Gando; la mediana, igual salvo en Pettirossi
y Tenerife Sur, y el máximo, igual o hasta 37 s más en los demás (en Los Rodeos no
se mueve). Es lo que se esperaba menos de la cuenta: de los 90 vuelos de los 600
que ahora esperan más, en 67 se daba la verde con uno girado a la base que
llegaba a la decisión antes de que te fueras —en 28 de los 90 hubo encuentro; en
los demás se iba al aire por ti, más alto— y en 15 con uno que se acababa de ir
al aire volando por delante; los otros ocho esperan de 6 a 12 s más. A cambio,
más de tres de cada cuatro de esas aproximaciones (174 → 39) acaban en el suelo,
y los demás esperan menos, no más.

En tu subida, con el que se aparta y con el que sale detrás, y entre dos del
tráfico: de 13 parejas cerca a ninguna en Los Rodeos, y de 5 a ninguna en Gando.
Las salidas de los demás, las mismas (664 y 671).

El vitest entero, por partes, en verde: 592 ficheros y 12.080 pruebas, con las
saltadas de siempre.

### Lo que queda

- **Los bancos del navegador no se volaron**: no hay turno.
- **El Hierro y La Gomera**, remontando, y los AFIS no están en la mesa: ahí lo
  que tardas lo lleva el remonte, y la red son los mismos tres minutos.
- **Dos llegadas tuyas no se miran**: lo de aquí es tu salida. Con quien juega
  en final y otro que se va al aire por delante, no cambia nada.
- **El permiso tardío.** Con quien juega ya corriendo, quien llega a la decisión
  se va al aire aunque al umbral la pista fuera a estar libre; una torre le
  diría «continue» y le daría el permiso por debajo (7.10.2). Daría la verde
  antes en media docena de los 600.
- **La vuelta que se te pide** sigue sin decir con qué alabeo: cada cual la da
  como sabe, y se cuenta con tres.

## Enmienda H96 (25-11-2026): el permiso tardío

### El caso

Lo que quedó de H94, punto por punto y medido antes de tocar nada, con su mesa
ampliada: quien juega remonta donde su avión remonta, se va al aire si se lo
mandan o porque sí, y llega también derecho a la final, a diez kilómetros y sin
que nadie le espere.

- **El permiso tardío.** A la decisión con la pista ocupada, al aire siempre: el
  tráfico y quien juega. En las 600 de Los Rodeos se iban 47 del tráfico, y de los
  quince que se miraron uno a uno, **ninguno ya por quien juega**, que desde H94
  no tiene la verde con uno a punto de decidir: por otro del tráfico que salía. De
  los seis casos distintos, dos la habrían dejado libre a tiempo, dos y cuatro
  segundos antes de que cruzara el umbral.
  Y a quien juega, en Estigarribia, 17 de 300: una avioneta que aterrizó delante y
  rueda la pista entera hasta su calle.
- **Dos llegadas tuyas.** Con quien juega en el circuito o en la final, y el de
  delante yéndose al aire a la fuerza en la decisión, **nadie a menos de 300 m
  y 150 de altura, en 840 vuelos** (Los Rodeos, Gando, Tenerife Sur y Pettirossi;
  por el circuito y derecho) y 137 idas al aire forzadas. No se toca.
- **Pero si quien se va al aire es quien juega**, sí: 8 de 480 por el circuito y 7
  de 360 derecho, todos con el JAZ 20. No es el de delante: es uno que esperaba
  en su doble raya, al que la torre daba la salida y pasaba por debajo, a 120 o
  150 m, subiendo más.
- **Remontando y con AFIS**, 300 salidas y 300 llegadas por campo (JAZ 20, 50 y
  60; las dos cabeceras): El Hierro, 0; La Gomera, 3; Pilar, Pedro Juan,
  Concepción y Estigarribia, 0. Y entre dos del tráfico, 18 parejas en El Hierro,
  3 en Pilar, una en Pedro Juan y una en Concepción.

### Por qué

- **La torre te acababa en el umbral.** `porDondeSigues` mira en qué tramo vas, y
  antes de la pista, subiendo, sale la final: para la torre ibas a desaparecer en
  el umbral, y soltaba al que esperaba.
- **El que sale tarda más de lo contado**: veinte segundos en entrar, cuando por la
  E-2 de Los Rodeos son treinta y tres; y con diez de menos se le contaba un
  kilómetro por delante de quien tenía encima.
- **En La Gomera**, al lado muerto hay monte, y el que se iba al aire por el lado
  iba por el del circuito de quien acababa de despegar. Dos de los tres eran la
  frustrada **del guion**, la que la frecuencia sortea, con la pista libre y quien
  juega subiendo por delante.
- **En El Hierro**, a 148 m de altura uno del otro: la cuenta era de 150 justos,
  mirada cada dos segundos.

### Lo real

- **OACI, Doc 4444 (PANS-ATM), 16.ª ed., 7.10.2**: «An aircraft may be cleared to
  land when there is reasonable assurance that the separation in 7.10.1, or
  prescribed in accordance with 7.11 will exist when the aircraft crosses the
  runway threshold, provided that a clearance to land shall not be issued until a
  preceding landing aircraft has crossed the runway threshold». Y la de 7.10.1 es
  que la salida de delante haya pasado el final de la pista en uso o haya empezado
  a virar, o que todos los que aterrizaron la hayan dejado: en el aire no basta.
- **12.3.4.15 d)**: «CONTINUE APPROACH [PREPARE FOR POSSIBLE GO AROUND]». En
  español, **RD 1180/2018, anexo V, 1.4.16 d)**: «CONTINÚE APROXIMACIÓN [PREPARE
  POSIBLE MOTOR Y AL AIRE]».
- **Europa**: lo mismo, en los medios aceptables de la Parte ATS —Decisión ED
  2020/008/R, anexo IV—, **AMC18 ATS.TR.210(a)(3)**, «Clearance to land», y **AMC8
  ATS.TR.210(c)(2)(i)**, la separación en la pista. Los que H94 no pudo leer. La
  **SERA.8012**, leída en la copia de la CAA británica, es la separación por estela
  y de esto no dice nada; su AMC no se ha podido leer.
- **AIP España** (leído hoy; AD 2, enmienda AIRAC 10/26). Lo publica para dos: **AD 2-GCTS, 20.2**
  —«Even if the runway is temporarily occupied by other traffic, landing clearance
  may be issued to an arriving ACFT if the controller is satisfied that at the time
  the ACFT crosses the threshold of the runway in use, the prescribed separation
  from the preceding ACFT shall exist»— y **AD 2-LEMD, 20.9**, lo mismo; con su
  fraseología, «BEHIND LANDING/DEPARTING (ACFT type) CLEARED TO LAND RUNWAY
  (number)», y solo de día. Los Rodeos, Gando, Lanzarote, Fuerteventura, La Palma,
  El Hierro y La Gomera no publican nada de esto, ni separación reducida (7.11).
- **AFIS**, ENR 1.5, 4.2: «The AFIS officer shall not provide any instructions with
  regard to joining the traffic circuit, nor shall he/she establish a landing
  order»; y AD 1.1, 5.6 G: en el punto de espera, «if there is traffic
  interference, the aircraft will remain on the spot». La Gomera es AFIS siempre;
  **El Hierro, torre de lunes a viernes y AFIS los fines de semana** (AD 2-GCHI, 3,
  18 y 20).
- **El alabeo de la vuelta**: el viraje medio, el de «a 360-degree medium level
  turn» del CAA de Nueva Zelanda (H93). El Doc 4444 no lo dice: «ORBIT».

### Decisión

**Al umbral, libre; si no, al aire** (`sigueHastaElUmbral` y `libreDentroDe` en
`world/trafico.ts`, `quedaLibreATiempo` en `flight/turno-de-pista.ts`):

- Se cuenta lo que le falta para dejar la pista a quien la tiene, con la velocidad
  de su tipo metro a metro: al que aterriza, frenar y salir; al que sale y ya
  corre, pasar el final; a ti, lo que tardas en pasarlo. Alineado sin su salida,
  remontando, parado o tú aterrizado, no se sabe, y entonces no.
- **El tráfico** sigue por debajo de la decisión si la deja libre tres segundos
  antes de que cruce el umbral; con ella libre se le da el permiso, y si deja de
  estar claro, al aire desde donde esté. Solo con alguien en ella: con la pista
  libre y sin permiso, decide donde siempre.
- **Quien juega**, lo mismo con cinco segundos: a esos cinco del umbral, o está libre
  o te manda al aire, y se felicita. El permiso llega por debajo, **a la vista**:
  la lámpara verde y su tarjeta, sin la frase, que a esa altura no se dice. Con el
  permiso ya dado y uno que entra y sale a tiempo, sigue valiendo. Al que iba
  delante y ya la dejó no se le espera a que lo cante (`dejoLaPista`). Sin radio no
  hay quien te lo diga y no vale: la pista es tuya con la verde fija.
- **Y la torre te dice que sigas**, una vez por final, si está ocupada al entrar:
  «continúe aproximación» en los dos peldaños de abajo y «continue approach» en los
  de arriba, por la puerta por la que un AFIS dice «pista ocupada». Antes no decía
  nada. Se grabaron el mismo día, con las dos voces de torre.
- **La verde** no espera a quien decide contigo corriendo si al umbral ya habrás
  pasado el final (`estorbanTuSalida`).

**Y con quien se va al aire:** subiendo antes del umbral sigues por la pista y la
subida (`porDondeSigues`, `subiendo`); al que sale se le cuenta lo que mide su
entrada, y cinco segundos de menos y diez de más (`seEchariaEncima`); por el lado
de tu circuito no va nadie si por ahí pasas tú (`teEncontraria`); la frustrada del
guion espera si tú subes por delante, y con la pista libre aterriza; y quien gira
deja treinta metros más de altura.

**La vuelta que se te pide** dice con cuánto, donde hay cifras: «· 30°» detrás del
rótulo de su tarjeta, sin frase nueva. En los dos de abajo sigue siendo la flecha.

En el banco del vuelo entero, la comprobación de alguien en tu pista sin orden se
mira a cuatro segundos del umbral, y no a la decisión.

### La prueba

`src/world/permiso-tardio.test.ts`: el tráfico y quien juega, quién sigue y quién
no, a cuánto se va, la cuenta de lo que falta contra lo que tarda de verdad cada
tipo, la verde, el lado del circuito, la frustrada del guion, quien se va al aire
antes del umbral y las frases.

### Lo medido

A menos de 300 m y 150 de altura de quien juega, en vuelos, y entre dos del
tráfico, en parejas:

| | vuelos | antes | ahora | parejas, antes | ahora |
|---|---|---|---|---|---|
| Los Rodeos | 600 | 0 | 0 | 0 | 0 |
| Gando | 60 | 0 | 0 | 0 | 0 |
| Tenerife Sur | 60 | 0 | 0 | 0 | 0 |
| Lanzarote | 60 | 0 | 0 | 0 | 0 |
| Fuerteventura | 60 | 0 | 0 | 0 | 0 |
| La Palma | 60 | 0 | 0 | 0 | 0 |
| Cuatro Vientos | 60 | 0 | 0 | 0 | 0 |
| Pettirossi | 60 | 0 | 0 | 0 | 0 |
| El Hierro, remontando | 300 | 0 | 0 | 18 | 0 |
| La Gomera, remontando | 300 | 3 | 0 | 0 | 0 |
| Pilar | 300 | 0 | 0 | 3 | 0 |
| Pedro Juan | 300 | 0 | 0 | 1 | 1 |
| Concepción | 300 | 0 | 0 | 1 | 0 |
| Estigarribia | 300 | 0 | 0 | 0 | 0 |

Lo que se espera por la verde, s (media; mediana; p90; máximo), y los demás:

| | antes | ahora | se van al aire en la decisión | tomas | espera por llegada |
|---|---|---|---|---|---|
| Los Rodeos (600) | 36,3; 7; 116,5; 246,5 | 36,3; 7; 116,5; 246,5 | 47 → 40 | 736 → 759 | 60,6 → 59,6 s |
| Gando (60) | 49,0; 24,5; 115,5; 197 | 49,0; 24,5; 115,5; 197 | 7 → 6 | 74 → 79 | 60,2 → 59,3 s |
| Tenerife Sur (60) | 45,2; 36; 120; 150,5 | 47,7; 36; 150,5; 164 | 6 → 3 | 71 → 73 | 53,2 → 53,3 s |
| Lanzarote (60) | 19,4; 2; 89,5; 102 | 18,5; 2; 89,5; 102 | 3 → 0 | 63 → 66 | 60,5 → 62,0 s |
| Fuerteventura (60) | 25,4; 2; 88; 126 | 25,4; 2; 88; 126 | 1 → 0 | 69 → 75 | 57,7 → 57,9 s |
| La Palma (60) | 81,5; 56; 182,5; 274,5 | 81,5; 56; 182,5; 274,5 | 18 → 18 | 71 → 74 | 84,9 → 83,4 s |
| Cuatro Vientos (60) | 17,3; 2; 75; 104 | 17,3; 2; 75; 104 | 3 → 0 | 60 → 63 | 70,8 → 63,9 s |
| Pettirossi (60) | 40,2; 12; 107,5; 139 | 40,2; 12; 107,5; 139 | 7 → 7 | 68 → 70 | 45,8 → 42,6 s |
| El Hierro, remontando (300) | 90,5; 96; 173; 256,5 | 90,8; 96,5; 171,5; 256,5 | 81 → 64 | 409 → 438 | 95,4 → 90,6 s |
| La Gomera, remontando (300) | 83,0; 55,5; 199,5; 319,5 | 83,0; 55,5; 199,5; 319,5 | 7 → 6 | 347 → 365 | 99,3 → 97,6 s |
| Pilar (300) | 44,4; 39; 114; 289 | 44,4; 39; 114; 289 | 7 → 2 | 431 → 456 | 60,8 → 59,0 s |
| Pedro Juan (300) | 30,6; 5; 83,5; 190 | 30,6; 5; 83,5; 190 | 6 → 0 | 404 → 426 | 71,9 → 71,4 s |
| Concepción (300) | 64,4; 31; 193,5; 332,5 | 64,8; 31; 193,5; 332,5 | 18 → 13 | 384 → 396 | 73,4 → 73,8 s |
| Estigarribia (300) | 50,1; 28; 149; 236,5 | 48,7; 12,5; 149; 236,5 | 37 → 32 | 383 → 424 | 50,3 → 53,1 s |

**Siguen por debajo de la decisión**, del tráfico, 7 en las 600 de Los Rodeos, 11 en
los otros siete campos, 6 en El Hierro, 2 en Concepción y 33 en Estigarribia, y
todos esos aterrizan; con quien juega llegando derecho y sin avisar, 9, y tres de
ellos acaban al aire. Las tomas salen a más en todos los campos, y las idas al
aire en la decisión, a menos o igual. La espera de los que llegan, a menos, salvo
1,5 s más en Lanzarote y 2,8 en Estigarribia; y las salidas de los demás, casi las
mismas (682 por 684 en Los Rodeos; la que más, nueve menos en Pilar, de 585).

**Quien juega**: en Estigarribia, de 17 idas al aire ordenadas en 300 vuelos a 10,
con 6 permisos por debajo de los sesenta metros; y llegando derecho a la final (540
vuelos en Los Rodeos, Gando y Tenerife Sur, sin que nadie le haga sitio), de 7 a 1,
con 6 permisos tardíos y ninguna toma con alguien en la pista. Yéndose al aire él, a
menos de 300 m y 150: de 8 en 480 vuelos por el circuito a ninguno, y de 7 en 360
derecho a ninguno.

**La roja** no se mueve: la misma en Los Rodeos, al décimo, y en los demás, entre
1,4 s menos (Estigarribia) y 0,4 más. Menos en Tenerife Sur, 2,5 s más: es **una**
semilla de las veinte, en la que aterriza uno que antes se iba al aire y otro llega
antes a la fila de salida; con cincuenta semillas más, 40,5 s antes y ahora.

La verde no llega antes en ninguno de los 600: con la separación de 7.10.1 —pasar el
final, no solo estar en el aire— en una pista de 3.171 m no da. La media docena que
se esperaba en H94 era contando con el avión en el aire.

El vitest entero, por partes: `src/world`, 201 ficheros y 4.490 pruebas; `src/audio`, 38
y 874; `src/flight`, 277 y 5.246; el resto, 87 y 1.606. En verde, con las saltadas de
siempre, después de ajustar dos pruebas que contaban con irse al aire: en
`salida-tapada.test.ts`, quien no da la vuelta en El Hierro ahora puede llegar con el
permiso tardío; y en `trafico-que-da-la-vuelta.test.ts`, la avioneta que para en la
salida de los 590 m por la 12 retrocede 128 m, y antes no llegaba a aterrizar.

### Lo que queda

- **Los bancos del navegador no se volaron**: no hay turno.
- **El permiso «detrás de»** de Tenerife Sur y Barajas, con la pista ocupada y de día:
  pide una frase nueva por tipo de avión, «behind landing…, cleared to land».
- **Con quien juega ya en el aire y todavía sobre la pista**, quien llega decide como
  siempre, con las ruedas en el aire y no con el final pasado: en 29 de las 759 tomas
  de Los Rodeos (25 de 736, antes) cruza el umbral con él a kilómetro y medio o más y
  a ciento cuarenta metros o más. Con la regla a la letra se irían al aire, o esperarías
  más la verde.
- **El Hierro los fines de semana es AFIS**, y en el juego tiene torre siempre.
- **En Estigarribia**, la avioneta que aterriza delante de ti rueda la pista hasta su
  calle, a tres kilómetros del umbral, y no cuenta con que llegas: de ahí las diez
  idas al aire que quedan.
- **En Pedro Juan**, dos del tráfico dando vueltas a 295 m uno de otro, de antes.
- **La vuelta, con los virajes de cada cual**: se dice treinta grados y se sigue
  contando con los tres alabeos; no se mide si se da.

## Enmienda H98 (25-11-2026): la luz que no salía, y quien va a tardar en dejar la pista

### El caso

En la ronda de la tanda 26, el fallo de radio en Pettirossi con el JAZ 20: en la
final, a sesenta metros y con la pista libre, seguían los destellos. Ni verde ni
roja. El banco apuntó a un reactor del tráfico, ZP-TCC, «salida 764 m, 5 m de
alto», y se leyó como uno que despegaba. **No despegaba**: 764 son los metros de su
camino, y la doble raya del reactor está a 1.857. Puesto ahí en la mesa, rueda por la
paralela, a 210 m del eje y con las ruedas cuatro por encima del centro de la pista, que
la calle sube. Por eso no contaba como «en la pista»: no lo estaba.

Con la mesa de H96 ampliada —la vuelta de espera que se te pide, tu salida de la
pista y la radio callada—, 600 vuelos por campo en los once con torre, la mitad
por la línea del circuito y la mitad alargando el viento en cola tres kilómetros,
que es como lo vuela el banco. **Sin señal ninguna, 223 de 6.895 finales**, todas con
la pista libre:

| | por la línea | alargado |
|---|---|---|
| Guaraní | 24 | 51 |
| La Palma | 4 | 46 |
| Tenerife Sur | 13 | 36 |
| Pettirossi | 0 | 27 |
| Encarnación | 3 | 10 |
| El Hierro | 0 | 9 |
| Los Rodeos, Gando, Lanzarote, Fuerteventura y Cuatro Vientos | 0 | 0 |

### Por qué

Tres cosas, una detrás de otra:

1. **La torre dejó de verte en la esquina.** Su franja llega hasta 2.400 m de la
   línea; alargando, entre el viento en cola y la final hay medio minuto en que no te
   contaba. En 12 de las 13 de una tirada de 30 se le dijo «ruede al punto de espera»
   justo ahí al que luego estorbaba. La decimotercera, recién despegado.
2. **Te pidió una vuelta, con la voz.** Su doble raya está en tu salida y no se iba
   antes que tú (`mirarTuSalida`). Sin radio no se oye, y en la lámpara no hay «dé una
   vuelta».
3. **Al pedírtela te quitó el permiso, y al dejar de esperarla no lo pidió otra vez.**
   Solo lo pedía entrar en la final. **Con radio, lo mismo** a quien no la daba: 10 de
   24 en Pettirossi, alargando.

### Lo real

- **OACI, Doc 4444 (PANS-ATM), 16.ª ed., con la enmienda 8** (leído hoy en una copia;
  la de la OACI se vende). **7.8**: «An aircraft landing or in the final stages of an
  approach to land shall normally have priority over an aircraft intending to depart
  from the same or an intersecting runway». **7.9.2** y **7.9.3.1** hablan de empezar a
  despegar, y **7.10.1**, de la salida que está en la pista o en el aire: a quien rueda
  fuera de ella no hay por qué contarlo para dejarte aterrizar (**7.10.2**). **7.7.3.1**,
  de quien entra en el circuito sin hablar con la torre: «it shall be permitted to land
  if its actions indicate that it so desires. If circumstances warrant, aircraft which
  are in contact with the controller may be instructed by the controller to give way
  […]. In no case shall permission to land be withheld indefinitely». **15.3.3 a)**: con
  la comunicación perdida, en visual, la separación con los demás se hace contando con
  que aterrizará en el aeródromo adecuado más próximo. **7.1.1.2**: «shall maintain a
  continuous watch on all flight operations on and in the vicinity of an aerodrome».
- **SERA, apéndice 1, tabla AP 1-1**: la roja fija a un avión en vuelo es «ceda el paso
  a las otras aeronaves y siga en el circuito» (H71).
- **AIP Paraguay, AD 2.3, SGME** (DINAC, paquete AMDT AIRAC 02/2026, leído hoy).
  **2.3-8**: calle de rodaje, de hormigón, 34 m. **Plano, AD 2.3-10 (07 APR 2026, AMDT
  NR 02)**: una sola calle, «TWY», y una plataforma; «01 a TWY, 550 M; 19 a TWY, 2953 M»,
  lo que queda de pista desde ella para cada despegue, o sea a 2.953 m del umbral de la
  01 y a 550 del de la 19. **2.3-13**: LDA, 3.503 m por las dos. **2.3-18**: AFIS, H24.
- **AD 2-GCTS, casillas 20.3.2.1 y 20.3.2.2** (H97): las dos maniobras, la de salir y la
  de llegar, entre puestos de al lado.

### Contestado: ¿tenía que haberlo retenido?

**Por la pista, no**: no iba a despegar, rodaba, y nada de 7.9 ni de 7.10 lo frena. **Por
tu salida, sí**: es la regla de no dejar rodar hacia tu salida a quien no se iría
antes (`quienDejaLaPistaPorSuRaya`), y no se aplicó porque la torre no te veía. Y con él
ya rodando, lo que tocaba era lo que ya se hace en la final corta: retenerlo en su doble
raya, que oye, y dejarte aterrizar.

### Decisión

- **Sin radio no se te pide una vuelta** (`remedioParaTuSalida`, `teOyen`): en el
  circuito, nada; en la final se retiene al que sale, y si su doble raya está en tu
  única salida, la roja. Si la radio se va con la vuelta pedida, se deja de esperar.
- **El permiso que se cae al pedir una vuelta se vuelve a pedir** al acabarla o al dejar
  de esperarla, si sigues en la final; si saliste de ella, al volver, como antes.
- **Quien te vio volver te sigue viendo** (`SIGUE_VIENDOTE`): si te sales de la franja
  desde el viento en cola o la base, a la altura del circuito, te cuenta tres minutos
  más, a lo que hay en línea recta hasta el umbral. Después, como si te hubieras ido.
- **El que entra en un puesto de pareja espera** (`antesDelDeAlLado`) en la calle, a
  ciento cincuenta metros, si empujan al del otro —o a ti, desde que pides el tractor—;
  quien ya ha empezado a entrar, entra, y no se espera al que está enganchado sin
  permiso, que es quien espera por él. Con su red: tres minutos
  (`ESPERA_AL_DE_AL_LADO`).
- **7.10.1, con el que todavía no ha girado** (`hastaQueSale`, `subesPorLaPista`): con la
  pista ya tuya, gira cuando al umbral habrás pasado el final, y no solo cuando a la
  decisión estés en el aire; y en el aire se te sigue contando hasta que lo pasas. Con su
  red, dos minutos encima de la pista. La verde, igual que antes.
- **Nadie se mete delante de otro si va a tardar en dejar la pista** (`retrasoPara`):
  cuenta lo que él mismo la va a tener ocupada, y detrás de él, también, remonte o no.
  Solo se daba a quien daba media vuelta en ella, y solo a los de detrás.
- **En Estigarribia la calle está donde la pone el AIP**, y se sale por ella: 2.963 m en el
  juego. Lo que faltaba era contar con que la avioneta está en la pista 166 s.

**Sin frases nuevas.** Y en el banco del fallo de radio, una comprobación más: «y a
ninguna decisión se llega sin señal con la pista libre».

### La prueba

`src/world/la-luz-que-no-sale.test.ts`: la vuelta que no se oye, el permiso que vuelve,
24 finales en Pettirossi con su tráfico y sin radio —sin el arreglo, la tercera parte sin
señal—, la torre que no te pierde en la esquina, el que llega al J1 de Tenerife Sur con
el del G2 y con su red, el que no ha girado contigo corriendo, y la avioneta de
Estigarribia contigo detrás. Sin los arreglos fallan todas menos tres, las que dicen lo
que no debe cambiar.

### Lo medido

Sin radio, 600 vuelos por campo en los once con torre (JAZ 20 y 50, las dos cabeceras):

| | finales sin señal | rojas | vueltas que se pedían |
|---|---|---|---|
| Guaraní | 75 → 0 | 21 → 0 | 123 → 0 |
| La Palma | 50 → 0 | 82 → 0 | 154 → 0 |
| Tenerife Sur | 49 → 0 | 9 → 0 | 100 → 0 |
| Pettirossi | 27 → 0 | 9 → 0 | 70 → 0 |
| Encarnación | 13 → 0 | 73 → 55 | 96 → 0 |
| El Hierro | 9 → 0 | 213 → 0 | 227 → 0 |
| Los Rodeos, Gando, Lanzarote, Fuerteventura y Cuatro Vientos | 0 → 0 | 1 → 0 | 0 → 0 |
| **los once** | **223 → 0** | **408 → 55** | **770 → 0** |

Las 55 de Encarnación, que remonta, son con uno en la pista. Con radio y sin dar la vuelta,
en Pettirossi y alargando, de 10 de 24 a una, que es el permiso tardío de H96 a 34 m; y las
vueltas que se piden, de 14 a 5, o de 20 a 7 dándolas, porque la torre ya no te pierde.

**Quien llega y cruza el umbral contigo en el aire sobre la pista**, de 93 a 12 en los
catorce campos; y lo demás, antes y ahora, con los vuelos de H96:

| | contigo encima | roja media, s | frustradas | tomas | espera por llegada, s |
|---|---|---|---|---|---|
| Los Rodeos (600) | 29 → 8 | 36,3 → 36,3 | 40 → 40 | 759 → 744 | 59,6 → 65,5 |
| Gando (60) | 4 → 0 | 49,0 → 49,0 | 6 → 6 | 79 → 78 | 59,3 → 64,5 |
| Tenerife Sur (60) | 4 → 0 | 47,7 → 47,7 | 3 → 3 | 73 → 70 | 53,3 → 67,6 |
| Lanzarote (60) | 2 → 0 | 18,5 → 18,5 | 0 → 0 | 66 → 65 | 62,0 → 67,9 |
| Fuerteventura (60) | 7 → 1 | 25,4 → 25,4 | 0 → 0 | 75 → 71 | 57,9 → 71,3 |
| La Palma (60) | 0 → 0 | 81,5 → 81,5 | 18 → 18 | 74 → 73 | 83,4 → 86,7 |
| Cuatro Vientos (60) | 0 → 0 | 17,3 → 17,3 | 0 → 0 | 63 → 63 | 63,9 → 64,6 |
| Pettirossi (60) | 4 → 1 | 40,2 → 40,2 | 7 → 7 | 70 → 69 | 42,6 → 45,5 |
| El Hierro, remontando (300) | 0 → 0 | 90,8 → 90,8 | 64 → 64 | 438 → 438 | 90,6 → 90,6 |
| La Gomera, remontando (300) | 5 → 0 | 83,0 → 83,0 | 6 → 6 | 365 → 362 | 97,6 → 101,2 |
| Pilar (300) | 0 → 0 | 44,4 → 44,4 | 2 → 2 | 456 → 456 | 59,0 → 59,1 |
| Pedro Juan (300) | 0 → 0 | 30,6 → 30,6 | 0 → 0 | 426 → 424 | 71,4 → 72,8 |
| Concepción (300) | 7 → 2 | 64,8 → 64,8 | 13 → 13 | 396 → 396 | 73,8 → 75,5 |
| Estigarribia (300) | 31 → 0 | 48,7 → 46,7 | 32 → 26 | 424 → 403 | 53,1 → 72,1 |

A menos de 300 m y 150 de altura de quien juega, ninguno en ninguno, como antes; y
entre dos del tráfico, lo mismo, más una pareja en Estigarribia, las dos en su vuelta, a
299 m. La mediana, el p90 y el máximo de la roja tampoco se mueven, salvo en
Estigarribia (mediana, de 12,5 a 15,5 s; p90, de 149 a 145; máximo, de 236,5 a 226).

**En Estigarribia**, a quien juega se le mandaba al aire en 10 de 300 y ahora en una; con la
pista ocupada se tocaba en 9 y ahora en ninguna; y permisos por debajo de los sesenta
metros, de 6 a 3.

**La roja y las frustradas no se mueven; las tomas bajan** un dos por ciento en Los
Rodeos, y un cinco en Fuerteventura y en Estigarribia: son vueltas de más, 26 en los 600 de
Los Rodeos. No se pierden, llegan después: quien da una vuelta de más llega un minuto más
tarde, y los de detrás, también. Con cuatro minutos más de mesa detrás de tu toma son las
mismas en Tenerife Sur (95), 101 por 104 en Fuerteventura y 341 por 354 en 180 vuelos de
Los Rodeos. Contando tu subida con la velocidad entera, y no con el 85 %, lo mismo (152 por
151, con el JAZ 20). Es lo que cuesta la regla a la letra, y va en `hastaQueSale`.

**Lo de antes, igual**: de frente con el criterio de H93, 0 de 600; a menos de 300 m y 150 de
altura, 0 de 600, y 0 yéndose al aire quien juega, en 480 por el circuito y 318 derecho a la
final. Llegando derecho y sin avisar, 180 vuelos idénticos uno a uno.

El vitest entero, por partes: `src/world`, 203 ficheros y 4.532 pruebas; `src/audio`, 38 y
874; `src/flight`, 277 y 5.246; el resto, 87 y 1.606. En verde, con las saltadas de siempre, y
sin tocar ninguna de las de antes; la nueva, también en `--pool=forks`.

### Lo que queda

- **Los bancos del navegador no se volaron**: no hay turno. Son
  `OGA_PUERTO=5691 OGA_GPU=1 node scripts/verificar-emergencias.mjs radio pettirossi jaz-20 taguato`,
  el mismo con `guarani` y con `la-palma`, y
  `OGA_PUERTO=5691 OGA_GPU=1 node scripts/verificar-vuelo-entero.mjs estigarribia guyrami 12 jaz-20`.
- **Quedan 12 contigo encima** de las 93: ocho en Los Rodeos, reactores que ya bajaban por
  la base cuando te dieron la verde, a 62 s de decidir. Con la regla a la letra, o se van
  al aire, o esperas tú dos minutos más.
- **Con radio, y quien sale lejos todavía**, la torre te pide una vuelta en la final larga
  aunque puedas dejar la pista por otra calle. Con 7.8 delante, lo suyo sería retenerlo a
  él, como sin radio; no se ha tocado, y pide su mesa.
- **Quien juega, aterrizando delante de otro en Estigarribia**, tiene la pista lo mismo que
  la avioneta, y el que viene detrás sigue contando dos minutos: lo que tardas en dejarla
  no lo sabe el tráfico.
- **Aterrizar largo**, que es lo que se hace con la calle a tres kilómetros (7.10.3.1 b: «land
  beyond the touchdown zone»), no lo hace nadie del tráfico: baja de la toma a la calle en
  dos minutos y tres cuartos.
- **La pareja del J1 y el G2**, la única a la que llega el tráfico casi siempre, no se ha visto
  en el navegador.

## Enmienda H100 (26-11-2026): la salida que espera en su doble raya con la pista vacía, y el avión sin radio que viene por tu única calle

### El caso

Dos cosas de la ronda de la tanda 27, con traza:

- **La Palma, con la fila de salida** (`OGA_FILA_DE_SALIDA=1`, JAZ 20, reloj ×12). La salida
  de delante de quien juega se quedaba 84 s en una tirada y 105 en otra parada en su doble
  raya, con la pista vacía y nadie entre los que llegan, antes de su «line up and wait».
- **Encarnación, con el fallo de radio.** La lámpara daba la roja fija en la final dos veces
  —«destellos → roja → destellos → roja → destellos → verde»—, las dos por una salida que
  esperaba en la doble raya de la única calle: la primera con otra despegando delante; la
  segunda, por una que no estaba al llegar a la primera.

### Por qué

**En La Palma, la frecuencia esperaba a que el canal quedara libre.** Se repitió el banco con
la frecuencia diciendo, cada vez que no habla, por qué (la traza se quitó después): de los
152 a los 190 s, en las ocho muestras, ni llegó a mirar al de delante. Dos veces la boca
ocupada —la torre contándote a ti la roja y el «número dos»—, cuatro la instructora
explicando la fila y la estela, y otras dos la boca; a los 190, su «line up and wait». Nadie
llegando, nadie en la pista, ninguna red: una radio de uno en uno que no habla encima de nadie
(`Momento.canalOcupado`, `instructorHablando`). Fueron 38 s de juego y quince de reloj de
pared: **las voces van con el reloj de pared y el banco con el suyo a ×12** (×3,9 de verdad en
esa tirada), así que cada segundo de voz se come hasta doce del juego. Las dos primeras tiradas
no llevaban la traza; en la de 105 s, que iba a ×4,2, sonó además una explicación entera
(«explica.gs-rodaje.presenta»), y 105 s de juego son unos veinticinco de pared. Es el mismo
mecanismo, con más que explicar. **Una radio de uno en uno es de verdad, y no se toca**; lo que
la estira es el reloj del banco. La roja de quien juega, que en las dos tiradas trazadas llegó a
cinco minutos, es después lo que hay que esperar: el remonte de 620 m del de delante, girar y
alinearse, su carrera y sus dos minutos de estela (Doc 4444, 5.8.3.1).

**Lo que sí sale sin motivo, en la mesa y sin nadie detrás**: el que llega a su doble raya
antes de que pase el rato de una llamada cualquiera —de 35 a 75 s después de su «hold
short»— espera parado lo que le falta, con la pista libre y nada pendiente. En una mesa de La
Palma con su tráfico (doce semillas, media hora cada una), 177 de 642 muestras de espera en la
raya son eso; en Encarnación, cinco salidas esperan 66–68 s seguidos así. Con quien juega
detrás ya no pasa (`primeroDeLaFila`), y por eso no sale en el banco. Darles la pista en cuanto
están listos —«the take-off clearance shall be issued when the aircraft is ready for take-off
and at or approaching the departure runway, and the traffic situation permits», 7.9.3.4— se
probó y **no entra**: con radio, las salidas de los demás se adelantan y en La Palma y El Hierro
aparecen tres parejas del tráfico a menos de 300 m en cada uno, donde no había ninguna. Queda
abajo.

**En Encarnación, sin radio, dos cosas:**

1. **La torre dejaba de contarte al despegar y al subir tras la roja**, y en ese rato soltaba
   hacia tu única calle a quien luego no se iba a tiempo. La retención (`quienDejaLaPistaPorSuRaya`)
   solo te miraba con tu llegada a la vista: en el circuito o en la final de la torre. Sin
   radio no hay vuelta que pedir para arreglarlo después.
2. **El que ya estaba en la calle no tenía tiempo, ni lo iba a tener.** Remontar la pista de
   Encarnación le lleva más de cinco minutos —de 310 a 342 s desde la raya hasta pasar el final—,
   más que tu circuito entero (270 s): la roja de H98 es lo que toca. Y después, «sale él y
   vuelves por el circuito» se hacía solo mientras durara la orden de irte, que se levanta al
   subir; pasada, ya solo se le daba la pista si se iba antes que tú, que no pasa nunca. Por eso
   la lámpara podía dar dos rojas por el mismo avión.

Los «210 s» del borrador de la tanda 28 son eso mismo visto desde la mesa: el de la raya 78 no
se iba a tiempo en ninguno de los 210 s (le hacían falta más de 300) y la torre no le da la
pista a quien no habrá pasado el final antes de que cruces el umbral (7.9.3.1, 7.10.1). Su mesa
estaba bien —`decirAOtro` a `null` no estorba: lo que se le da a otro se le anuncia al dibujo
antes—; lo que no veía es que esos seis ya estaban en la raya antes de que vinieras.

### Lo real

- **OACI, Doc 4444 (PANS-ATM), 16.ª ed.**, leído hoy en la copia de H96. **7.9.1**: las salidas
  «shall normally be cleared in the order in which they are ready for take-off». **7.9.2**: no
  se empieza a despegar hasta que la salida de delante ha pasado el final de la pista o ha
  empezado a virar, o todos los que aterrizaron la han dejado. **7.9.3.1**: la autorización de
  despegue, con seguridad razonable de que eso se cumplirá al empezar la carrera. **7.9.3.4**:
  «the take-off clearance shall be issued when the aircraft is ready for take-off and at or
  approaching the departure runway, and the traffic situation permits». **7.10.1**: quien llega
  no cruza el umbral hasta lo mismo. **5.8.3.1**: detrás de una salida MEDIUM, una LIGHT espera
  dos minutos; detrás de una HEAVY, una LIGHT o MEDIUM, dos.
- **7.7.3.1**, de quien entra en el circuito sin hablar con la torre: «it shall be permitted to
  land if its actions indicate that it so desires. If circumstances warrant, aircraft which are
  in contact with the controller may be instructed by the controller to give way […]. In no
  case shall permission to land be withheld indefinitely». **15.3.3 a)**: con la comunicación
  perdida se cuenta con que aterrizará en el aeródromo adecuado más próximo.
- **SERA, apéndice 1, tabla AP 1-1**: la roja fija a quien vuela, «ceda el paso a las otras
  aeronaves y siga en el circuito» (H71, H98).

### Decisión

- **Sin radio, volando cerca de casa, vienes a aterrizar aunque la torre no te vea en su
  circuito** (`sinRadioAqui` en `tuLlegada`, `game.ts`): tu salida de la pista se le cuenta al
  tráfico desde que te quedas sin radio en el aire, y `QuienJuega.sinRadio` dice que no se deje
  rodar hacia ella a nadie, le dé tiempo o no (`quienDejaLaPistaPorSuRaya`). Con la red de
  siempre, `RETENCION_MAXIMA`.
- **Al que ya te mandó al aire por tu salida, la pista en cuanto quede libre**, le dé tiempo o
  no (`alAirePorEnEstaLlegada` en `mirarTuSalida`), fuera de la final. Si a tu final todavía está
  en la pista, es la pista ocupada; si sigue en su raya, otra vez la roja. Medido, no llega a
  nada en Encarnación: ver abajo.
- **El que ya estaba en la calle al callarse la radio, como en H98**: la pista si se va antes que
  tú, y si no, la roja.
- **La Palma: nada.** **Sin frases nuevas.**

### La prueba

`src/world/sin-radio-tu-unica-calle.test.ts`: en Encarnación, con radio y lejos se deja rodar y
cerca no, como antes; sin radio no, ni lejos ni sin verte en el circuito, y sin venir aquí a
nadie; y al que te mandó al aire se le da la salida al volver tú al circuito, con la pista
ocupada al levantarse la orden y sin ella. Las dos de lo que no cambia —con radio, y sin venir
aquí— pasan igual sin los arreglos; no se han corrido contra la rama de antes.

La mesa de lo medido es la de H98, fuera del repositorio como aquélla, con dos cosas más: lo que pone ahora el juego
sin radio en el aire, y la radio que se calla un rato después de despegar, como en el banco.

### Lo medido

**Encarnación sin radio**, JAZ 20, cien semillas por cabecera, por la línea y alargando: 400
vuelos. Rojas por tu salida, y en cuántos vuelos:

| | antes | ahora |
|---|---|---|
| la radio callada desde que despegas | 41 en 36 vuelos | 5 en 5 |
| la radio que se calla a los 20 s de despegar, como en el banco | 41 en 36 | 41 en 36 |

Con la radio callada desde el principio, de las 41 de antes 39 eran de uno que salió a rodar hacia
la única calle en los segundos entre tu despegue y que la torre te viera en su circuito, y 2 de
uno que rodó con la torre viéndote. Las rojas de todo tipo, de 56 a 15, y las finales, de 441 a
410: se aterriza a la primera. **Las 5 que quedan son la red de la retención**: las cinco, después
de una roja por la pista ocupada, a los 420,5 s de despegar (`RETENCION_MAXIMA`) se suelta al que
esperaba en su puesto, rueda con quien juega a dos minutos y medio del umbral y no le da tiempo.
Ninguna es inevitable.

Con la radio callándose a los 20 s, **no cambia nada, vuelo a vuelo**, y es lo que se esperaba ver
en el banco: **39 de las 41 son inevitables** —el de la raya 78 ya estaba en la calle al callarse
la radio, y le hacían falta de 310 a 334 s para irse, con quien juega a 264–270 del umbral—, y las
otras 2, otra vez la red de siete minutos. En cinco vuelos la lámpara da dos rojas por **el mismo**
avión: lo de darle la pista en cuanto quede libre no llega a nada, porque con el tráfico del campo
siempre hay alguien que aterriza dentro de los cinco minutos de su remontada, y a él sí se le
cuenta (7.9.3.1).

**Sin radio, en los once campos con torre** (la mesa de H98, 160 vuelos por campo: JAZ 20 y 50, las
dos cabeceras, por la línea y alargando, con la radio callada desde el principio): finales sin
señal, 0 y 0; rojas, de 16 a 3 en Encarnación —por tu salida, de 13 a 1— y ninguna en los otros
diez, antes ni ahora.

**Con radio, nada a peor, y nada distinto**: los 2.820 vuelos de H96 y H98 —Los Rodeos, 600 con las
dos cabeceras y cinco aviones; Gando, Tenerife Sur, Lanzarote, Fuerteventura, La Palma, Cuatro
Vientos y Pettirossi, 60 cada uno; El Hierro, La Gomera, Pilar, Pedro Juan, Concepción y
Estigarribia remontando, 300 cada uno— salen **iguales uno a uno**: a menos de 300 m y 150 de
altura de quien juega, 0; en su vuelta, 0 (H93 y H94); la roja media, las frustradas, las tomas,
las salidas y la espera de los que llegan, las mismas cifras que la tabla de H98.

**La cadencia que no entra**, para que conste: dándole la pista al que está listo en su raya
(7.9.3.4), con radio, la roja media de La Palma va de 81,5 a 83,8 s y su mediana de 56 a 81; la de
El Hierro, de 90,8 a 71,6; la de Estigarribia, de 46,7 a 53,5; tomas y salidas a más en todos los
que cambian; y tres parejas del tráfico a menos de 300 m y 150 de altura en La Palma y otras tres en
El Hierro, donde había cero.

El vitest entero, por partes: `src/world`, 204 ficheros y 4.537 pruebas; `src/flight`, 277 y 5.247;
`src/audio`, 38 y 874; el resto, 88 y 1.619. En verde, con las saltadas de siempre y sin tocar
ninguna de las de antes; la nueva, también en `--pool=forks`.

**Y la red de la retención, la larga, con quien juega sin radio** (`RETENCION_SIN_RADIO`, veinte
minutos). El banco de la radio apunta ahora quién rodaba hacia tu salida al callarse la radio y quién
salió a rodar después, y da por buena una roja solo si la explica alguien de lo primero o alguien en
la pista. Con `taguato-ruvicha`, nadie rodaba al callarse; a los 406 y 410 s salieron ZP-GLL y
ZP-BWL hacia la raya 78, sueltos por los siete minutos de `RETENCION_MAXIMA`, y la lámpara dio la
roja por el primero en la final. De la primera final a la segunda, sin radio y con una roja, se pasa
de los siete minutos; una torre con un 7600 en el circuito no deja salir a nadie hacia su calle, así
que, retenido por quien juega sin radio y en el aire, la red es de veinte minutos —tres circuitos con
sus rojas— y sigue siendo una red, por si no viene nunca. En la mesa, por tu salida: con la radio
callada desde el principio, de 5 a 0 (las rojas de todo tipo, de 15 a 10); callándose a los 20 s, de
41 a 39, y las 39 son de quien ya estaba en la calle al callarse. En los once campos sin radio, solo
cambia Encarnación: rojas de 3 a 2, por tu salida de 1 a 0, tocar con la pista ocupada de 1 a 0. Con
radio no cambia nada: la red larga solo se mira sin ella.

### Lo que queda

- **Del navegador, una tirada**: `node scripts/verificar-emergencias.mjs radio encarnacion jaz-20
  taguato`, 14 de 15. Una roja y no dos —«destellos → roja → destellos → verde»—, en la primera
  final, con ZP-XPT esperando en la raya 78, ZP-GDB rodando detrás de él a 58 m de su camino y
  la pista vacía; en la segunda, la verde. Lo que pide esa comprobación, «sin roja», no lo da el
  juego cuando el de la calle no se va a tiempo (H98). El banco ya lo apunta y lo distingue, y la red
  de los siete minutos ya no corre con quien juega sin radio en el aire (arriba).
- **El remontante de Encarnación y el tráfico que llega.** Con quien juega sin radio y uno que le
  tapa la única calle, quien tiene que ceder es el tráfico que sí oye (7.7.3.1): mientras llega
  alguien cada pocos minutos, el de la raya no remonta nunca, y la lámpara da roja tras roja por él
  hasta la red de la salida. Pide que, por el que te mandó al aire, la torre retrase a los que
  llegan como lo hace por ti (`tuTurnoDeSalir`).
- **La cadencia de la frecuencia** (arriba): el que llega listo a su doble raya espera el rato de
  una llamada cualquiera si no hay nadie detrás. El arreglo de 7.9.3.4 está probado y descartado
  por las parejas de La Palma y El Hierro; antes de volver a él hay que mirar esas seis.
- ~~**El banco a reloj ×12 mide la espera del canal en reloj de juego**~~: hecho, ver la enmienda
  siguiente.

## Enmienda del 26-11-2026: la vuelta que da por tu salida no te la quita, y la roja a ×1

Dos rojos de la ronda de la tanda 28, los dos en la doble raya y antes de despegar.

**En Estigarribia, con Guyrami** (`verificar-vuelo-entero.mjs estigarribia guyrami 12 jaz-20`), una
roja de 228 s con la pista vacía. La sostenía ZP-DXB, que daba su vuelta de espera en la esquina de
la base, quieta en el metro 6.519 de su camino, durante tres minutos. Era un candado entre dos reglas:

- la llegada daba la vuelta **por ti**: con nadie girado a la base, el siguiente en salir eres tú
  (`tuTurnoDeSalir`), y al cerrar la vuelta mira otra vez y da otra si sigues ahí;
- la torre no te daba la pista **por ella** (`estorbanTuSalida`, H94): contaba lo que le quedaba de
  vuelta hasta la decisión y, con la remontada hasta la cabecera, lo que tardas en estar en el aire
  es más que su vuelta entera. Nunca cabía.

Lo soltaba la red de `LO_QUE_SE_ESPERA_POR_QUIEN_LLEGA`. Ahora el que da la vuelta por ti no cuenta
entre los que estorban tu salida. Con la pista tuya entras en su fila con lo que tardas en irte
(`laFila`), y al cerrar la vuelta da otra mientras sigas en la pista. El que da vueltas por otro sí
cuenta, como antes. Prueba en `verde-con-uno-en-la-base.test.ts`, con una salida de 300 s y la
vuelta entera; sin el cambio, no pasa.

En la mesa con radio (la de H96 y H98 con los vuelos de frustrar y los directos, 3.660 vuelos en 14
campos), antes y después:
- a menos de 300 m de quien juega, 0 y 0;
- parejas del tráfico, 2 y 2;
- tocar con la pista ocupada y vuelos sin acabar, 0 y 0;
- la roja media, de 43,1 a 40,6 s.

Baja donde se remonta: El Hierro con el JAZ 60, de 97,5 a 83,9 s; La Gomera, de 82–84 a 73–74;
Pedro Juan con el JAZ 60, de 39,5 a 24,5, y su p90 de 182,5 a 76,5.

**En Tenerife Sur** (`tenerife-sur guyrami 12 jaz-20`), una roja de 241 s. El que acababa de
aterrizar dejó la pista a los 235 s, y la torre siguió contándolo encima hasta los 331, esperando su
«pista libre». Eso era la frecuencia esperando canal, de verdad, pero a reloj ×12: la voz que suena
se come doce segundos de juego por cada uno suyo, y es lo que H100 dejó escrito para La Palma. El
juego no cambia. Cambia el banco: la roja se cuenta como a ×1, con el reloj de juego mientras la boca
calla y el de pared mientras suena (`bocaAhora`), y la línea dice las dos cosas.

## Enmienda H102 (26-11-2026): sin radio, el tráfico que oye cede su turno al de tu única calle; y la salida que espera una llamada con la pista libre

### El caso

Lo que quedó de H100, con la mesa de H98 y H100 (fuera del repositorio, como aquéllas) y dos
cosas más: quien juega obedece **cada** roja —la mesa solo se iba al aire en la primera, y en la
segunda aterrizaba encima del que remontaba: los «tocar con la pista ocupada» de la mesa de
H100 eran eso— y el que tapa tu calle se sigue hasta que entra en la pista, con los que aterrizan
mientras.

1. **El remontante de Encarnación.** Sin radio desde los 20 s de despegar, como en el banco; JAZ
   20, las dos cabeceras, por la línea y alargando, 250 semillas: 1.000 vuelos. Hay 79 rojas por
   tu salida en 74 vuelos, y de los 78 que tapaban la calle:
   - 54 entran en la pista en cuanto te mandan al aire (H100), en menos de 30 s;
   - 11 esperan de 48 a 74 s a que pase el final otro que remonta delante, más su estela (Doc
     4444, 7.9.2 y 5.8.3.1): es lo que toca;
   - y **13 esperan de 173 a 332 s**, porque viene alguien a aterrizar dentro de su remontada:
     en los trece aterriza uno mientras, y en uno la lámpara da **otra roja por el mismo avión**.
     En doce de los trece quien juega llega a su segunda final con él todavía en la raya o en la
     pista, y las finales salen roja, roja y verde.

   No es «roja tras roja hasta la red»: la red larga de H100 y la pista al que te mandó al aire ya
   lo dejaron en esto. Pero lo que queda es eso mismo, más corto.

2. **Las seis parejas de la cadencia.** Con el arreglo de H100 puesto otra vez —la pista al que
   está listo en su raya, sin el rato de una llamada (7.9.3.4)—, las seis salen iguales que
   entonces: tres en La Palma y tres en El Hierro. **Son dos sucesos**, cada uno repetido con tres
   aviones de quien juega, porque el tráfico de una semilla es el mismo hasta que despegas:
   - **La Palma, semilla 20, a los 231 s**: EC-GCN, un turbohélice que sale remontando desde su
     raya, y EC-OZZ, un reactor que se va al aire; a 286 m y 56 de altura.
   - **El Hierro, semilla 7, a los 198 s**: EC-WJB, que sale remontando, y EC-GXP, un turbohélice
     que se va al aire; a 285 m y 23 de altura.

   La traza dice lo mismo en los dos. Con la cadencia, a EC-GCN se le da «line up and wait» a los
   31 s y la salida a los 72, todavía remontando, con EC-OZZ en el viento en cola: no ha girado a
   la base y **no está en la fila**, así que la torre no lo cuenta (`llegaAntesDeQueSalga` mira la
   fila). Y EC-OZZ, al girar a la base, **no cuenta a la salida que remonta**: la fila de los que
   llegan es de llegadas y de quien juega, y del tráfico que sale no sabe nada. Baja, llega a la
   decisión con EC-GCN en su carrera —remontar 530 m y dar la vuelta en la cabecera le lleva de
   los 31 s a los 149, en que empieza a correr—, se va al aire por el lado (H94), sube paralelo y,
   al virar al viento cruzado, se cruza con EC-GCN, que sube por el eje. Sin la cadencia pasaba lo
   mismo hasta la decisión: EC-OZZ se iba al aire igual, con EC-GCN remontando delante; pero la
   salida de EC-GCN esperaba el rato de una llamada, le llegaba **después** de la frustrada, a los
   159 s, y subía detrás. En El
   Hierro, EC-WJB recibe su «line up and wait» a los 57 s con EC-GXP en el viento en cola, y lo
   mismo.

   O sea: **la cadencia no mete las parejas; las destapa.** El rato de una llamada tapaba un
   agujero: quien llega no cuenta en su turno al que ya tiene la pista para salir.

### Lo real

- **OACI, Doc 4444 (PANS-ATM), 16.ª ed.**, leído hoy en la copia de H96. **7.7.3.1**: «If an
  aircraft enters an aerodrome traffic circuit without proper authorization, it shall be permitted
  to land if its actions indicate that it so desires. If circumstances warrant, aircraft which are
  in contact with the controller may be instructed by the controller to give way so as to remove as
  soon as possible the hazard introduced by such unauthorized operation. In no case shall
  permission to land be withheld indefinitely». **15.3.3 a)**: si el avión no indica que recibe, la
  separación con los demás se mantiene contando con que, en visual, siga en visual y aterrice en el
  aeródromo adecuado más próximo.
- **7.7.1.2**: «Sufficient separation shall be effected between aircraft in flight in the traffic
  circuit to allow the spacing of arriving and departing aircraft as outlined in 7.9.2, 7.10.1».
  **7.8**: la prioridad es de quien aterriza o está «in the final stages of an approach»; quien va
  por el viento en cola no lo está.
- **7.9.1**: las salidas, en el orden en que están listas. **7.9.2**: no se empieza a despegar
  hasta que la salida de delante ha pasado el final de la pista o virado, o los que aterrizaron la
  han dejado. **7.9.3.1**: la autorización, con seguridad razonable de que eso se cumplirá al
  empezar la carrera. **7.9.3.4**: «the take-off clearance shall be issued when the aircraft is
  ready for take-off and at or approaching the departure runway, and the traffic situation
  permits».
- **7.10.1**: quien aterriza no cruza el umbral hasta que la salida de delante ha pasado el final
  de la pista en uso o ha empezado a virar, o los que aterrizaron la han dejado. **7.10.2**: el
  permiso, con seguridad razonable de que eso se cumplirá al cruzarlo.

### Decisión

**Lo 1. Sin radio, el que oye cede** (`cederleElTurno` y `suTurnoDeSalir` en `world/trafico.ts`;
`mirarTuSalida` en `flight/turno-de-pista.ts`). Con quien juega sin radio y en el aire, la torre
pide al tráfico que ceda su turno al que ya te mandó al aire por tu salida
(`alAirePorEnEstaLlegada`, H100). Es lo mismo que `tuTurnoDeSalir` hace por ti en tu doble raya:

- sale **detrás de los que ya han girado a la base**, que aterrizan y dejan la pista;
- los que todavía no han girado **dan su vuelta de espera** hasta que haya pasado el final de la
  pista, y **nadie se le mete delante**, aunque cupiera antes de su hora;
- y en su autorización (`puedeSalirSinEsperarte`) no cuentan los que dan esa vuelta por él, que al
  cerrarla dan otra mientras no se haya ido: contarlos era el candado de Estigarribia (enmienda
  del 26-11).

Dura hasta que se va, con su red: `CEDEN_COMO_MUCHO`, diez minutos —la remontada de Encarnación
son cinco y medio, y la espera a los que ya bajaban, uno o dos—. **Con radio no cambia nada**: a
quien oye se le pide una vuelta (H98). **Sin frases nuevas**: la vuelta de espera del tráfico es la
de siempre.

**Lo 2: la traza dice cómo, pero no entra.** Para que no salgan las parejas, quien llega y todavía
no ha girado a la base tiene que contar en su turno a la salida que **ya tiene la pista** —encima de
ella, remontando o alineada— hasta que pase su final, como cuenta la tuya (`tuTurnoDeSalir`) y ahora
la cedida; y en la autorización de ésa no se cuentan los que dan su vuelta por ella, o es el candado
de Estigarribia. Es 7.7.1.2: la separación entre llegadas y salidas se hace en el circuito. Con eso
y la cadencia de 7.9.3.4, las dos parejas desaparecen, y de paso casi todas las idas al aire del
tráfico. **Pero no es nada a peor**: la espera de los que llegan sube en nueve de los catorce campos
—en Gando, de 64,5 a 95,0 s por llegada— y la roja de quien juega, en cuatro —en La Palma, la
mediana de 56 a 83 s—. Lo de quien llega, sin la cadencia, igual: es eso lo que lo cuesta, no la
cadencia. El tráfico cambia idas al aire por vueltas de espera, que la mesa cuenta como espera y a
las idas al aire no. No se toca; las cifras, abajo.

### La prueba

`src/world/ceden-el-turno-sin-radio.test.ts`: la torre lo pide sin radio, tras la roja por el de
tu única calle, y con radio no; y en Encarnación, con su tráfico y tres semillas, uno en la raya
que remonta y otro en el viento en cola que aterrizaría dentro de su remontada. Sin cederle el
turno, el que llega gira a la base y se va al aire, porque la frecuencia le da la pista al de la
raya sin contarlo —es lo 2, abajo—; cediéndoselo, da su vuelta de espera, no se va al aire y el
de la raya tiene la pista. Pasa en `--pool=threads` y en `--pool=forks`.

### Lo medido

**Encarnación sin radio**, la radio callada a los 20 s de despegar y quien juega obedeciendo cada
roja; JAZ 20, las dos cabeceras, por la línea y alargando, 250 semillas: 1.000 vuelos.

| | antes | ahora |
|---|---|---|
| rojas de todo tipo, en 1.111 y 1.099 finales | 111 | 99 |
| rojas por tu salida (vuelos) | 79 (74) | 78 (74) |
| la segunda roja por el mismo avión | 1 | 0 |
| el de la calle entra en la pista tras la roja: hasta 5 s / 5–30 / 30–80 / más | 53 / 1 / 11 / 13 | 66 / 1 / 11 / 0 |
| lo más que espera, s | 332 | 73,5 |
| aterrizan mientras espera | 13 | 0 |

Cambian 25 vuelos de los 1.000. **Los trece de la espera larga**: en doce las finales pasan de
roja, roja y verde a roja y verde, y el vuelo acaba de 270 a 450 s antes; el decimotercero ya era
roja y verde. Y doce en los que el de la calle ya entraba enseguida, en los que solo cambia el
tráfico de detrás: el que iba a llegar durante la remontada espera fuera, o da su vuelta, en vez
de entrar en el circuito y dar en él sus vueltas de espera. Los once de 48 a 74 s siguen igual:
esperan a que pase el final otro que remonta delante, y su estela. Con la mesa de H100 tal cual
—quien juega solo obedece la primera roja—, en 400 vuelos: rojas de 54 a 48, por tu salida de 39
a 38, y aterrizar con él en la pista, que en esa mesa es desobedecer la segunda, de 6 a 3. Con la
radio callada desde el principio, los 400 iguales uno a uno.

**Nada a peor.** Con radio, los 2.820 vuelos de H96 y H98 —Los Rodeos, 600 con las dos cabeceras y
cinco aviones; Gando, Tenerife Sur, Lanzarote, Fuerteventura, La Palma, Cuatro Vientos y
Pettirossi, 60 cada uno; El Hierro, La Gomera, Pilar, Pedro Juan, Concepción y Estigarribia
remontando, 300 cada uno— salen **iguales uno a uno**: a menos de 300 m y 150 de altura de quien
juega, 0; en su vuelta, 0 (H93 y H94), y los 0 de 600 de Los Rodeos; entre dos del tráfico, las dos
de siempre (Estigarribia y Pedro Juan); la roja media, 48,8 s; las frustradas, 186; las tomas,
3.723; las salidas, 4.536; la espera de los que llegan, 72,8 s por llegada. Sin radio desde el
principio, los 1.760 vuelos de los once campos con torre de H98 y H100, iguales uno a uno: finales
sin señal, 0; rojas, 2, las dos en Encarnación, y ninguna por tu salida.

El vitest entero, en seis partes de 2 GB: 608 ficheros y 12.285 pruebas, en verde, con las
saltadas de siempre, y sin tocar ninguna de las de antes; la nueva, también en `--pool=forks`.

**Del navegador, una tirada de cada**, en el puerto 5692: `verificar-emergencias.mjs radio encarnacion
jaz-20 taguato`, 15 de 15, y con `taguato-ruvicha`, 15 de 15, los dos «destellos → verde», sin roja y
sin nadie rodando al callarse la radio: no se dio el caso de la cesión, y no se rompe nada.
`OGA_FILA_DE_SALIDA=1 verificar-vuelo-entero.mjs la-palma guyrami 12 jaz-20`, 63 de 65: no se celebra
en tierra, como en la tirada de la tanda 28, y la verde te llega con EC-TPZ, que esperaba antes que
tú, todavía en su raya. Con radio lo de aquí no cambia nada —los 2.820 vuelos son los mismos—, así
que no viene de esto; no se ha mirado más.

**Lo 2, probado y sin entrar.** Con radio, los mismos 2.820 vuelos, y antes → con la salida que tiene
la pista en el turno de los que llegan y la cadencia (entre paréntesis, sin la cadencia):

| | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s |
|---|---|---|---|---|---|
| Los Rodeos (600) | 40 → 0 (0) | 744 → 766 (766) | 680 → 666 (666) | 36,1 (7) → 37,4 (7) | 65,5 → 67,3 (67,3) |
| Gando (60) | 6 → 0 (0) | 78 → 71 (71) | 93 → 90 (90) | 49,0 (24,5) → 37,1 (2) | 64,5 → 95,0 (95,0) |
| Tenerife Sur (60) | 3 → 0 (0) | 70 → 71 (71) | 85 → 85 | 47,7 (36) → 44,1 (36) | 67,6 → 70,9 (70,9) |
| Lanzarote (60) | 0 → 0 | 65 → 65 | 63 → 63 | 18,5 → 18,5 | 67,9 → 67,9 |
| Fuerteventura (60) | 0 → 0 | 71 → 70 | 67 → 67 | 25,4 → 25,4 | 71,3 → 74,8 |
| La Palma (60) | 18 → 0 (0) | 73 → 75 (78) | 102 → 114 (108) | 81,5 (56) → 84,9 (83) (92,3; 94,5) | 86,7 → 81,6 (94,2) |
| Cuatro Vientos (60) | 0 → 0 | 63 → 63 | 69 → 69 | 17,3 → 17,3 | 64,6 → 66,6 |
| Pettirossi (60) | 7 → 0 (0) | 69 → 79 (75) | 92 → 91 (91) | 39,9 (12) → 35,0 (2) (38,2; 12) | 45,5 → 53,0 (53,6) |
| El Hierro, remontando (300) | 64 → 1 (1) | 437 → 478 (475) | 561 → 623 (548) | 86,3 → 63,0 (85,5) | 89,3 → 92,7 (91,5) |
| La Gomera, remontando (300) | 6 → 0 (0) | 369 → 406 (368) | 527 → 570 (524) | 73,6 → 62,7 (71,7) | 97,0 → 92,3 (100,6) |
| Pilar (300) | 2 → 1 (1) | 456 → 477 (456) | 576 → 654 (575) | 39,1 → 33,7 (38,3) | 56,3 → 61,3 (57,2) |
| Pedro Juan (300) | 0 → 0 | 426 → 459 (426) | 561 → 613 (561) | 25,3 → 24,9 (25,3) | 69,7 → 59,9 (69,7) |
| Concepción (300) | 13 → 0 (0) | 399 → 424 (396) | 520 → 547 (525) | 61,4 → 64,8 (62,7) | 73,5 → 68,7 (75,4) |
| Estigarribia (300) | 27 → 27 (24) | 403 → 411 (391) | 540 → 580 (540) | 45,0 → 46,6 (43,6) | 72,1 → 72,9 (78,4) |
| **los 2.820** | **186 → 29 (26)** | **3.723 → 3.915 (3.771)** | **4.536 → 4.832 (4.512)** | **48,8 → 45,0 (48,6)** | **72,8 → 73,1 (75,9)** |

A menos de 300 m y 150 de altura de quien juega, 0 en todos; entre dos del tráfico, las dos de
siempre, y las de La Palma y El Hierro, ninguna. Sin radio desde el principio, los once campos,
iguales en lo que mira la mesa de H98. Y en Encarnación sin radio callada a los 20 s, las rojas por
tu salida bajan de 78 a 38 en los 1.000 vuelos: con la cadencia, quien estaba listo se va antes de
que te calles. En el conjunto, mejor; campo a campo, no: Gando espera treinta segundos más por
llegada, y en La Palma la mitad de las veces quien juega espera la verde casi medio minuto más.

### Lo que queda

- **Lo 2**, con lo de arriba: si se da por bueno cambiar idas al aire por vueltas de espera —en
  Gando, seis idas al aire en 60 vuelos por treinta segundos más de espera de cada llegada—, el
  arreglo está medido y es corto: `lasQueSalen` en la fila de `retrasoPara`, con su red de diez
  minutos por avión, y en `todaviaNo` y `puedeSalirSinEsperarte` sin los que esperan por quien ya
  tiene la pista; y la cadencia de H100 encima. Antes de meterlo habría que ver por qué en Gando, sin
  remontar, quien llega espera tanto más: el que espera alineado sin su salida cuenta con su carrera
  entera, y puede que baste con contar solo al que ya tiene la salida. Mirado en H104, abajo: no es
  eso, y sigue sin entrar.
- **Sin la cesión, en Encarnación y sin nadie más, el que llega se va al aire** por el que remonta:
  la prueba nueva lo enseña en sus tres semillas, y en el buscador salió en ocho de ocho casos. Es lo
  2 visto desde el otro lado, y con radio pasa igual.

## Enmienda H104 (27-11-2026): la salida que tiene la pista en el turno de los que llegan, medida otra vez, y sin entrar

### El caso

Lo 2 de H102 —que quien llega y todavía no ha girado a la base cuente en su turno a la salida que
ya tiene la pista, hasta que pase su final, y la cadencia de H100 encima— bajaba las frustradas de
los 2.820 vuelos con radio de 186 a 29, pero no entró: los que llegan esperaban más en nueve de los
catorce campos —en Gando, de 64,5 a 95,0 s por llegada, sin remontar— y en La Palma la mediana de
la roja de quien juega subía de 56 a 83 s. Quedaron dos preguntas: por qué Gando espera treinta
segundos más, y si hay un arreglo que dé la vuelta de espera en vez de la ida al aire sin hacer
esperar a nadie más de lo que pide la pista. Para que entrara se pidió, campo a campo: frustradas a
menos, ningún encuentro a más, la espera por llegada no más de un 10 % peor y la mediana de la roja
de quien juega no más de 10 s peor.

La mesa es la de H102, fuera del repositorio como aquélla, con una traza más: cada vez que el
tráfico decide si le toca su vuelta de espera (`retrasoPara`), se apunta quién se la impone —el
último de la fila que le empuja la hora— y cuánto de ella es por las salidas que tienen la pista; y
cada medio segundo de vuelta se carga a eso.

### Por qué Gando espera treinta segundos más

Gando, 60 vuelos (JAZ 20, 60 y 90, veinte semillas), segundos de vuelta de espera por llegada,
según quién la impone:

| quién impone la vuelta | antes | lo 2 de H102 | lo 2 sin el margen de 30 s |
|---|---|---|---|
| quien juega, en la fila por su circuito o su final | 34,7 | 50,8 | 35,0 |
| tu salida: en tu raya, en la pista o recién en el aire | 12,1 | 11,8 | 14,4 |
| otra llegada | 10,1 | 10,2 | 10,4 |
| otra llegada en su vuelta | 7,5 | 7,0 | 4,7 |
| **una salida que tiene la pista** | — | **15,2** | **5,7** |
| — con su despegue | — | 6,9 | 0 |
| — alineada sin su despegue | — | 4,1 | 1,4 |
| — entrando en la pista | — | 4,2 | 4,3 |
| **total** | **64,5** | **95,0** | **70,2** |
| vueltas · frustradas | 40 · 6 | 51 · 0 | 40 · 3 |

Son dos cosas, y casi a partes iguales:

- **La vuelta es entera, y lo que hace falta es poco.** Hay once vueltas más, y catorce empiezan por
  una salida que tiene la pista. A cada una le hacían falta de 5,6 a 34,6 s —y 90,4 en dos sucesos,
  por uno que entraba en la pista y al que se le contaban 158 s para pasar el final—; una vuelta de
  un reactor son de 77 a 93 s. Y treinta de esos segundos son `MARGEN_PARA_IRSE`, que se suma a lo
  que le queda para pasar el final y está pensado para dejar rodar a uno hacia la pista, no para
  quien ya está en ella: por una salida con su despegue empiezan cuatro vueltas, que piden 29,9 y
  5,6 s, y sin el margen no empieza ninguna.
- **Al cerrarla, ya no cabe delante de ti.** El que da la vuelta vuelve a mirar al cerrarla, y para
  entonces quien juega ya está en la fila por su circuito: para ir delante le hacen falta 135 s
  (los 120 entre llegadas y el colchón de 15) y le quedan menos. Espera detrás de todo tu circuito,
  vuelta a vuelta. EC-BWN, semilla 14: le faltan 35 s por EC-GOK, que entra en la pista; da su
  vuelta de 77, y al cerrarla tú estás a 202 s del umbral y le quedan 123 de los 135: da otras
  tres, 313 s en total. Antes giraba a la base sin esperar, y EC-GOK se iba a tiempo.

**La sospecha de H102, contada: no es eso.** El que espera alineado sin su despegue cuenta 4,1 s de
los 30,5. Y contar solo a la salida que ya tiene el despegue, probado, deshace lo 2: en los siete
campos de 60 vuelos las frustradas van de 34 a 34 —en La Palma, de 18 a 21— y vuelven las tres
parejas de La Palma a menos de 300 m.

### Lo probado

En los siete campos de 60 vuelos (Gando, Tenerife Sur, Lanzarote, Fuerteventura, La Palma, Cuatro
Vientos y Pettirossi: 420 vuelos), antes → con cada variante. Tenerife Sur, Lanzarote,
Fuerteventura y Cuatro Vientos cumplen en todas:

| variante | frustradas | encuentros a menos de 300 m | lo que no cumple |
|---|---|---|---|
| lo 2 de H102 (con la cadencia) | 34 → 0 | 0 → 0 | espera en Gando +47 %, en Pettirossi +16 %; mediana de la roja en La Palma 56 → 83 |
| solo la salida con su despegue | 34 → 34 | 0 → 3 (La Palma) | frustradas; parejas; espera en Gando +20 %; La Palma 56 → 81 |
| **sin el margen de 30 s** | **34 → 3** | 0 → 0 | **mediana de la roja en La Palma 56 → 92** |
| lo 2 sin la cadencia | 34 → 0 | 0 → 0 | Gando +47 %, Pettirossi +18 %, La Palma 56 → 94,5 |
| sin el margen y sin la cadencia | 34 → 3 | 0 → 0 | La Palma 56 → 94,5 |
| sin el margen, y tu turno detrás de la salida que tiene la pista | 34 → 3 | 0 → 0 | Gando +12 %; La Palma 56 → 92 |
| sin el margen, y los que todavía no se ven no la esperan (solo La Palma) | 18 → 0 | 0 → 0 | La Palma 56 → 81 |

«Tu turno detrás de la salida»: el que llega da su vuelta por ti contigo en la raya
(`tuTurnoDeSalir`) contando que no sales hasta que la que tiene la pista haya pasado su final. «Los
que todavía no se ven»: `noCabeTodavia` sin las salidas, para que el que va a aparecer no espere
fuera por ellas.

La mejor es **sin el margen**: lo 2 de H102 con lo que le queda a la salida para pasar el final sin
los 30 s de `MARGEN_PARA_IRSE`, y la cadencia. Medida entera, antes → ahora.

**Con radio**, los 2.820 vuelos de H96 y H98. El antes de Los Rodeos se ha vuelto a correr, que H103
le cambió las salidas; el de los demás es el de H102, comprobado: los 420 vuelos de los campos de 60
y 200 de los que remontan salen iguales uno a uno con el juego de hoy, y en Encarnación, 350.

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Los Rodeos (600) | 40 → 17 | 742 → 740 | 659 → 657 | 35,8 (2) → 34,5 (2) | 63,1 → 65,0 | 0/0/0 | 0/0 |
| Gando (60) | 6 → 3 | 78 → 77 | 93 | 49,0 (24,5) → 48,7 (24,5) | 64,5 → 70,2 | 0/0/0 | 0/0 |
| Tenerife Sur (60) | 3 → 0 | 70 → 71 | 85 | 47,7 (36) → 44,1 (36) | 67,6 → 70,9 | 0/0/0 | 0/0 |
| Lanzarote (60) | 0 | 65 | 63 | 18,5 (2) | 67,9 | 0/0/0 | 0/0 |
| Fuerteventura (60) | 0 | 71 → 70 | 67 | 25,4 (2) | 71,3 → 74,8 | 0/0/0 | 0/0 |
| La Palma (60) | 18 → 0 | 73 → 79 | 102 → 109 | 81,5 (56) → 88,6 (92) | 86,7 → 80,6 | 0/0/0 | 0/0 |
| Cuatro Vientos (60) | 0 | 63 | 69 | 17,3 (2) | 64,6 → 66,6 | 0/0/0 | 0/0 |
| Pettirossi (60) | 7 → 0 | 69 → 80 | 92 → 93 | 39,9 (12) → 40,3 (12) | 45,5 → 49,7 | 0/0/0 | 0/0 |
| El Hierro, remontando (300) | 64 → 1 | 437 → 513 | 561 → 617 | 86,3 (94) → 70,0 (68,5) | 89,3 → 85,5 | 0/0/0 | 0/0 |
| La Gomera, remontando (300) | 6 → 0 | 369 → 406 | 527 → 570 | 73,6 (52) → 62,7 (40,5) | 97,0 → 92,3 | 0/0/0 | 0/0 |
| Pilar (300) | 2 → 1 | 456 → 477 | 576 → 654 | 39,1 (35,5) → 33,7 (15) | 56,3 → 61,3 | 0/0/0 | 0/0 |
| Pedro Juan (300) | 0 | 426 → 459 | 561 → 613 | 25,3 (5) → 24,9 (3) | 69,7 → 59,9 | 0/0/1 | 0/0 |
| Concepción (300) | 13 → 0 | 399 → 424 | 520 → 547 | 61,4 (31) → 64,8 (35) | 73,5 → 68,7 | 0/0/0 | 0/0 |
| Estigarribia (300) | 27 | 403 → 435 | 540 → 579 | 45,0 (15,5) → 50,3 (22,5) | 72,1 → 70,1 | 0/0/1 | 0/0 |
| **todos (2.820)** | **186 → 49** | **3.721 → 3.959** | **4.515 → 4.816** | **48,8 (23) → 46,0 (19,5)** | **72,4 → 71,0** | **0/0/2 → 0/0/2** | **0/0 → 0/0** |

Cumple en trece de los catorce campos: las frustradas bajan de 186 a 49, ningún encuentro sube —las
dos parejas del tráfico siguen siendo una en Estigarribia y otra en Pedro Juan—, la espera por
llegada no empeora más de un 9,2 % en ninguno —Pettirossi, de 45,5 a 49,7; Gando, de 64,5 a 70,2, un 8,8 %— y
la mediana de la roja de quien juega no sube más de 7 s en ninguno salvo en uno: **La Palma, de 56 a
92 s.**

**Encarnación sin radio**, JAZ 20, las dos cabeceras, por la línea y alargando:

| | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | rojas a ti (por tu salida) |
|---|---|---|---|---|---|---|---|
| callada a los 20 s de despegar, obedeciendo cada roja (1.000) | 46 → 0 | 1.413 → 1.490 | 1.584 → 1.644 | 90,0 (54) → 83,6 (43,5) | 68,7 → 69,8 | 0/6/22 → 0/7/12 | 99 (78) → 76 (40) |
| callada desde el principio (400) | 22 → 0 | 540 → 568 | 576 → 608 | 92,8 (58,5) → 87,7 (44,5) | 69,1 → 74,6 | 0/1/12 → 0/2/12 | 10 (0) → 7 (0) |

Las rojas por tu salida bajan a la mitad, como con lo 2 de H102, y las parejas del tráfico de 22 a
12. Pero **los encuentros con quien juega en la vuelta de otro suben**, de 6 a 7 y de 1 a 2: todos
alargando —tres kilómetros más de viento en cola—, a 200–260 m y a su misma altura, de uno que da su
vuelta en el viento en cola. Con más vueltas, en la mesa de mil salen seis donde no había y se van
cinco. La vuelta se pone por donde no vas a pasar (H93), contando con tu circuito de siempre, y
alargando tres kilómetros pasas por donde no se contaba. Con lo 2 de H102 tal cual, lo mismo —de 6 a
7 y de 1 a 2—, y además la espera por llegada subía de 68,7 a 76,4 s y de 69,1 a 81,4: sin el margen
queda en 69,8 y 74,6.

**Sin radio desde el principio**, los 1.760 vuelos de los once campos con torre de H98 y H100 (el
antes, el de H102; 40 comprobados, iguales): lo mismo que antes en lo que mira esa mesa —finales sin
señal, 0; rojas, 2, las dos en Encarnación, y ninguna por tu salida—.

### Por qué La Palma no llega

Porque es lo que cuesta el arreglo, y no un efecto suyo de más. En La Palma (60 vuelos, sin el
margen) la roja de quien juega sube más de 10 s en 15 vuelos y baja más de 10 s en 10; la media, de
81,5 a 88,6. **De los 15 que suben, 12 tenían una frustrada del tráfico antes**: el reactor que se
iba al aire con la salida delante dejaba la pista libre justo cuando llegabas a tu raya, y salías
detrás de la salida. Ahora espera fuera o da su vuelta, aterriza, y la pista es suya mientras
frena y rueda hasta el final —en la semilla 2, EC-DBJ toca a los 720 s y la deja a los 800—: la
roja es esperar a que aterrice. Los otros tres son la cadencia, en la semilla 9: el de delante sale
antes, EC-SCL llega a su raya a los 337,5 s —antes, a los 386,5, después que tú, que llegas a los
379— y sale antes que tú, que es lo que toca (7.9.1); remontar, alinearse y correr le lleva 145 s.
Y la mediana cae en un hueco de la tabla: antes, ordenadas, las esperas 31.ª a 34.ª son 56, 56, 58
y 94,5, y mover tres semillas —tres vuelos cada una, con el mismo tráfico— la lleva de un lado al
otro.

Para ver si es el arreglo o la muestra, La Palma con sesenta semillas más (de la 21 a la 80, 180
vuelos), fuera de la mesa de lo que se pide: la roja de quien juega **baja**, la media de 96,8 a
75,2 s y la mediana de 87 a 65,5; con las ochenta juntas, la mediana se queda en 68,5 antes y
después, y las frustradas van de 60 a 0. Lo de la mediana en la mesa de 60 lo deciden tres
semillas. **Pero en esas 180 sale una pareja del tráfico donde no había**: semilla 70, EC-IMW y
EC-FOS, los dos dando su vuelta de espera, a 279 m y 34 de altura. Con más vueltas, dos que se
juntan.

### Decisión

**No entra.** Nada cambia en el juego. La variante sin el margen cumple todo menos dos cosas: la
mediana de la roja de quien juega en La Palma —y lo que la sube es justo lo que se buscaba: que el
que llega dé su vuelta y aterrice, en vez de irse al aire y dejarte la pista—, y un encuentro más en
la vuelta de otro en cada mesa de Encarnación sin radio, alargando. Y fuera de la mesa, en La Palma
con más semillas, sale una pareja de dos del tráfico en su vuelta. Si lo primero se da por bueno y
lo otro se arregla, el arreglo está medido y es corto: lo 2 de H102 (`lasQueSalen` en la fila de
`retrasoPara`, con la red de diez minutos por avión; en `todaviaNo` y `puedeSalirSinEsperarte`, sin
los que esperan por quien ya tiene la pista; la cadencia de 7.9.3.4) y, en `lasQueSalen`, lo que le
queda para pasar el final sin `MARGEN_PARA_IRSE`. En H104b, abajo, cumple en la mesa con las dos
cosas de las vueltas arregladas y la mediana de La Palma fuera de los criterios; falta rehacer tres
pruebas que pierden su caso y mirar una roja larga en Guaraní.

### Lo que queda

- **La regla de La Palma.** En la mesa de 60 vuelos, la mediana la deciden tres semillas; con
  ochenta, no se mueve. Lo que el arreglo cuesta de verdad es esperar el aterrizaje del que antes se
  iba al aire, y decidir si eso pesa más que la frustrada no es de la mesa.
- **Lo que el margen tapaba.** Sin él quedan 17 frustradas de 40 en Los Rodeos —tres sucesos por
  la 30 con los cinco aviones, y uno con dos de ellos— y 3 de 6 en Gando, donde lo 2 de H102 las
  quitaba todas. Las de Gando son un mismo suceso, con los tres aviones: EC-VVJ, una avioneta,
  despega por la 21 con EC-LNA, un reactor, en el viento en cola; sube despacio y a los 376 s sigue
  sobre el asfalto, a 2.841 m del umbral —la pista tiene 3.104— y a 239 de altura, con EC-LNA a 774
  m del umbral: al aire. Lo que le queda a la que sale para pasar el final
  (`loQueLeFaltaParaDejarla`) no cuenta bien lo que tarda en el aire una avioneta sobre una pista de
  tres kilómetros, y el margen de 30 s lo tapaba.
- **Alargar el viento en cola.** El tráfico solo sabe dar la vuelta entera, de 77 a 93 s un reactor,
  aunque le falten cinco; de verdad, quien llega da su vuelta o alarga lo que haga falta, que la
  separación entre llegadas y salidas se hace en el circuito (Doc 4444, 7.7.1.2). Alargar no existe
  en el modelo, y es lo que más espera ahorraría.
- **Sin radio y alargando, la vuelta del tráfico en tu viento en cola.** Ya pasaba —seis en mil
  vuelos, uno en cuatrocientos— y con más vueltas pasa en otros sitios. Dónde se pone la vuelta
  (`vueltaSegura`) mira por dónde vas a volar con tu circuito de siempre, y no cuenta con que
  alargues.
- **Dos vueltas juntas.** La vuelta se aparta de quien juega y de los demás que vuelan
  (`vueltaSegura`), pero en la esquina de la base, si no hay ninguna apartada, se da la que más se
  aparta (`leTocaEsperar`). En La Palma, semilla 70, dos del tráfico la dan a 279 m uno de otro.
  Antes de volver a lo 2 hay que mirar ese caso. Mirado en H104b: el segundo veía al primero
  medio segundo atrasado.
- **El que cierra su vuelta y ya no cabe delante de ti** espera todo tu circuito: 135 s delante,
  contando el colchón de quien juega. Con lo 2 es la mitad de lo que crece la espera de Gando; sin
  lo 2 ya son 34,7 s por llegada.

## Enmienda H104b (27-11-2026): las vueltas de espera que se juntaban, y la salida que tiene la pista en el turno de los que llegan, medida y escrita, y todavía sin entrar

### El caso

H104 dejó medido el candidato **sin el margen** —lo 2 de H102 sin sumar `MARGEN_PARA_IRSE` a lo que le
queda a la salida que tiene la pista para pasar su final, con la cadencia de H100— y lo dejó fuera por
dos cosas. Una era la mediana de la roja de quien juega en La Palma, de 56 a 92 s en la mesa de 60
vuelos. Esa **deja de ser criterio**, porque es lo de verdad: de los 15 vuelos que suben más de 10 s,
12 son el reactor que antes se iba al aire contra tu salida y ahora aterriza, y esperas a que deje la
pista; los otros 3, la cadencia, que deja salir antes al que estaba primero en la fila (Doc 4444,
7.9.1). Con las 80 semillas, la mediana no se mueve: 68,5 antes y después. Irse al aire contra una
salida no es lo que pasa; esperar a que el de delante aterrice y deje la pista, sí. Lo que se pide
allí es que la roja más larga quede por debajo de lo que el banco permite: 170 s más lo de la fila.

La otra era la separación, y esa sí bloqueaba:

- en Encarnación sin radio, alargando tres kilómetros el viento en cola, un encuentro más con la
  vuelta de otro en cada mesa: callada a los 20 s, de 6 a 7; desde el principio, de 1 a 2;
- y en La Palma, con las ochenta semillas, una pareja nueva: semilla 70, dos del tráfico en su
  vuelta de espera a 279 m.

### Por qué se juntaban

La mesa es la de H104, con dos trazas más: dónde se pone cada vuelta, con qué holgura y contra quién
—las seis maneras de darla, por los dos lados y con los tres alabeos—, y dónde está de verdad cada uno
mientras la da.

**Encarnación, alargando.** Los nueve encuentros del candidato en las dos mesas —siete callada a los
20 s, dos desde el principio; ocho de ellos nuevos— son el mismo suceso. Uno del tráfico va **por
delante de ti en el mismo viento en cola**, con su esquina de la base más afuera que la tuya —una
avioneta abriendo un poco más, o un bimotor—, y **espera por ti**: la traza dice en todos «TU», con
medio minuto o un minuto y medio de ventaja cuando le hacen falta 135 o 154 s. Da su vuelta en su esquina, a entre 2.200 y
2.960 m del umbral y a entre 1.150 y 1.490 de la pista. La torre la pone por donde no vas a pasar
(H93), pero **con tu circuito de siempre**: giras a la base en tu esquina, más adentro, y no pasas por
la suya. Alargando tres kilómetros sí pasas, y te encuentras con él cuando vuelve a su esquina:
ZP-JKA, semilla 177, cierra una vuelta a los 804,5 s con holgura 1,33 contando con tu circuito, y a
los 869 está otra vez en su esquina con tu viento en cola pasando por ella, a 263 m y 31 de altura;
ZP-XOV, semilla 20, a 257 m y a tu altura; ZP-APL, semilla 21, a 203 m. Con radio la torre te diría
dónde girar; **sin radio no te puede decir nada**, y tú puedes alargar para hacerte sitio, que es lo
que se hace. El candidato no lo mete: con más vueltas, sale en otros vuelos —seis nuevos, cinco que se
van—.

**La Palma, semilla 70.** EC-FOS, un reactor, da su vuelta en su esquina desde los 782 s, esperando
por ti; a los 945,5 llega EC-IMW a la suya, también por ti y detrás de EC-FOS, y la pone hacia fuera
con el alabeo de siempre. Los dos círculos se cortan —1.235 y 843 m de radio, con los centros a
1.374 m—, y EC-IMW lo mira: **cuenta 306 m** con EC-FOS, holgura 1,02, y le vale. **Fueron 279**, a
los 967 s, con EC-FOS todavía en la vuelta que cuenta. Lo que se ve de EC-FOS es lo que la torre
predice de él; la traza de dónde está de verdad da la diferencia: **medio segundo**. El tráfico se
mueve de uno en uno en cada paso, y cuando EC-IMW decide su vuelta, EC-FOS —que va detrás en el
bucle— todavía no se ha movido en ese paso: se le ve donde estaba medio segundo antes, y a 84 m/s son
cuarenta metros por su vuelta. Contándolo, EC-IMW ve 279 m (0,93) y la pone hacia dentro, con
holgura 3,95. En el juego, a sesenta pasos por segundo, es un metro; en la mesa, con medio segundo,
cuarenta. Pero la cuenta no puede depender del orden en que se mueven.

### Decisión

**Cumple en la mesa, y no entra todavía**: el código está escrito y probado, pero en el vitest entero
una roja de Guaraní pasa del límite y tres pruebas de `salida-tapada.test.ts` se quedan sin su caso
(abajo, en «La prueba»). El juego no cambia hasta resolverlo. Lo que se mete, cuando se meta, es lo 2
de H102 sin el margen (H104), con la cadencia de H100: `lasQueSalen` en la fila de `retrasoPara`, con
lo que le queda a la salida para pasar el final sin `MARGEN_PARA_IRSE`
(`loQueLeQuedaParaPasarElFinal`); en `todaviaNo` y `puedeSalirSinEsperarte`, sin los que esperan por
quien ya tiene la pista; y la pista al que espera listo en su doble raya, sin el rato de una llamada
(`enSuRaya`, OACI, Doc 4444, 7.9.3.4). Y con ello, las dos cosas de las vueltas, en `dondeVanAEstar`,
que es lo que mira la torre antes de mandar a nadie a dar una vuelta:

1. **Sin radio, también por derecho.** Con quien juega sin radio y en su viento en cola, la torre
   cuenta además con que sigas por derecho hasta dos minutos (`ALARGAS_POR_DERECHO`, lo mismo que el
   juego prevé de quien no vuela su circuito, `PREVER_POR_DERECHO`). Es lo que hace la vuelta
   apartarse de donde puedes alargar. Con radio no cambia: te puede decir dónde girar.
2. **Cada uno, desde donde está de verdad.** A los que todavía no se han movido en ese paso se les
   cuenta lo que les falta por moverse (`movidoA`).

**Lo que se probó y no entra**, con lo mismo que lo de arriba de base:

- **Las vueltas que le quedan al otro.** Que el que llega cuente que el que ya da su vuelta seguirá
  dándolas mientras le haga falta, y no que se va al cerrar ésta; y mirar lo más cerca que pasan
  entre una mirada y la siguiente, cada dos segundos. Con las dos, La Palma 70 se arregla, pero en
  Estigarribia sale una pareja de 166 m —dos en su vuelta en la misma esquina, sin ninguna manera de
  darla que libre al otro, que se dan la menos mala una y otra vez hasta coincidir en ella— y en
  Encarnación desde el principio los encuentros suben de 1 a 3.
- **Por derecho, sola**, sin lo del paso: Encarnación, de 6 a 2 y de 1 a 1; pero La Palma 70 sigue.
- **La vuelta quinientos pies por encima** cuando ninguna de las seis libra al otro: dos que esperan
  en el mismo sitio se separan en altura, como en una espera de las de instrumentos. En los vuelos de
  arriba quita los encuentros, pero no se ha medido entera: no hacía falta para cumplir, y subir y bajar en la vuelta
  es más que poner dónde se da.

### Lo medido

Antes → ahora, con la mesa de H104 tal cual. El antes es el de H104 (el de H102 para Encarnación y los
campos que no se han vuelto a correr; Los Rodeos, corrido otra vez en H104).

**Con radio**, los 2.820 vuelos de H96 y H98:

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Los Rodeos (600) | 40 → 17 | 742 → 740 | 659 → 657 | 35,8 (2) → 34,5 (2) | 63,1 → 65,0 | 0/0/0 | 0/0 |
| Gando (60) | 6 → 3 | 78 → 77 | 93 | 49,0 (24,5) → 48,7 (24,5) | 64,5 → 70,2 | 0/0/0 | 0/0 |
| Tenerife Sur (60) | 3 → 0 | 70 → 71 | 85 | 47,7 (36) → 44,1 (36) | 67,6 → 70,9 | 0/0/0 | 0/0 |
| Lanzarote (60) | 0 | 65 | 63 | 18,5 (2) | 67,9 | 0/0/0 | 0/0 |
| Fuerteventura (60) | 0 | 71 → 70 | 67 | 25,4 (2) | 71,3 → 74,8 | 0/0/0 | 0/0 |
| La Palma (60) | 18 → 0 | 73 → 79 | 102 → 109 | 81,5 (56) → 88,6 (92) | 86,7 → 80,6 | 0/0/0 | 0/0 |
| Cuatro Vientos (60) | 0 | 63 | 69 | 17,3 (2) | 64,6 → 66,6 | 0/0/0 | 0/0 |
| Pettirossi (60) | 7 → 0 | 69 → 80 | 92 → 93 | 39,9 (12) → 40,3 (12) | 45,5 → 49,7 | 0/0/0 | 0/0 |
| El Hierro, remontando (300) | 64 → 1 | 437 → 513 | 561 → 617 | 86,3 (94) → 70,0 (68,5) | 89,3 → 85,5 | 0/0/0 | 0/0 |
| La Gomera, remontando (300) | 6 → 0 | 369 → 406 | 527 → 570 | 73,6 (52) → 62,7 (40,5) | 97,0 → 92,3 | 0/0/0 | 0/0 |
| Pilar (300) | 2 → 1 | 456 → 477 | 576 → 654 | 39,1 (35,5) → 33,7 (15) | 56,3 → 61,3 | 0/0/0 | 0/0 |
| Pedro Juan (300) | 0 | 426 → 459 | 561 → 613 | 25,3 (5) → 24,9 (3) | 69,7 → 59,9 | 0/0/1 → 0/0/0 | 0/0 |
| Concepción (300) | 13 → 0 | 399 → 424 | 520 → 547 | 61,4 (31) → 64,8 (35) | 73,5 → 68,7 | 0/0/0 | 0/0 |
| Estigarribia (300) | 27 | 403 → 435 | 540 → 579 | 45,0 (15,5) → 50,3 (22,5) | 72,1 → 70,1 | 0/0/1 | 0/0 |
| **todos (2.820)** | **186 → 49** | **3.721 → 3.959** | **4.515 → 4.816** | **48,8 (23) → 46,0 (19,5)** | **72,4 → 71,0** | **0/0/2 → 0/0/1** | **0/0 → 0/0** |

Ningún encuentro sube —la pareja de Pedro Juan se va, y queda la de Estigarribia—; la espera por
llegada no empeora más de un 9,2 % en ningún campo (Pettirossi, de 45,5 a 49,7; Gando, 8,8 %; Pilar,
8,9 %); la mediana de la roja de quien juega no sube más de 7 s en ninguno salvo en La Palma, que ya
no es criterio. Allí **la roja más larga no cambia**: 274,5 s en la semilla 11, con los tres aviones,
antes y después. La mesa no apunta cuántos tenías delante en la fila, así que si cabe en lo que
permite el banco no se puede decir desde aquí; lo que sí se ve es que no la trae el arreglo. La
siguiente baja de 182,5 a 160,5 s, que cabe sin contar fila; y con las ochenta semillas, la más larga
baja de 325,5 a 282 s. Frente al candidato de H104, las cifras de los 2.820 son las mismas menos la
pareja de Pedro Juan.

**Encarnación sin radio**, JAZ 20, las dos cabeceras, por la línea y alargando:

| | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | rojas a ti (por tu salida) |
|---|---|---|---|---|---|---|---|
| callada a los 20 s de despegar, obedeciendo cada roja (1.000) | 46 → 0 | 1.413 → 1.490 | 1.584 → 1.644 | 90,0 (54) → 83,6 (43,5) | 68,7 → 69,8 | 0/6/22 → **0/2/12** | 99 (78) → 76 (40) |
| callada desde el principio (400) | 22 → 0 | 540 → 568 | 576 → 608 | 92,8 (58,5) → 87,7 (44,5) | 69,1 → 74,3 | 0/1/12 → **0/1/12** | 10 (0) → 7 (0) |

Con el candidato de H104 eran 0/7/12 y 0/2/12. De los dos que quedan callada, uno ya estaba antes
(ZP-FNY, semilla 144, el mismo a 292 m) y el otro es ZP-XOV en la semilla 20, que sale en las dos mesas:
ahí ninguna de las seis vueltas libra tu viento en cola ni contando con que alargues —la mejor, 0,61—,
y se da la menos mala. Desde el principio, el que queda es ése mismo; el que había antes (ZP-DIM,
semilla 70) se va.

**La Palma con las ochenta semillas** (240 vuelos):

| | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| La Palma (240) | 60 → 0 | 331 → 367 | 391 → 400 | 93,0 (68,5) → 78,6 (68,5) | 84,0 → 80,4 | 1/0/0 → **1/0/0** | 0/0 |

Con el candidato de H104, 1/0/1.

La pareja de la semilla 70 no sale. La roja más larga baja de 325,5 s a 282. El encuentro «cerca de
ti» es otro vuelo: el de la semilla 21 (EC-VQP, a 124 m) se va con lo 2, y sale uno en la 60 (EC-IET,
un reactor sin permiso en tu viento en cola, a 261 m), el mismo que con el candidato de H104.

**Sin radio desde el principio**, los 1.760 vuelos de los once campos con torre de H98 y H100 (el
antes, el de H102): lo que mira esa mesa, igual que antes —finales sin señal, 0; rojas, 2, las dos en
Encarnación, y ninguna por tu salida—. Los encuentros, en el total, de 22/4/11 a 22/4/1 —con el
candidato de H104, 22/9/5—; pero campo a campo, en La Palma la vuelta de otro a menos de 300 m de ti
pasa de 0 a 2 —el mismo vuelo con las dos mitades del viento: EC-UKM, semilla 7, a 298 m y 63 de
altura, alargando, con tu base por su esquina— y en Encarnación de 0 a 1 —ZP-XOV, el de la semilla 20
de arriba—, y se van los de Cuatro Vientos y Tenerife Sur. La espera por llegada sube en Pettirossi
un 10,1 % y en Encarnación un 11,7 %. Las dos cosas son las mismas con el candidato de H104: son de lo
2, y esta mesa no es de las que se pedían; quedan abajo.

La mesa con el juego del repositorio, y no con la copia de la mesa, sale igual uno a uno en 290
vuelos (La Palma, Estigarribia, Pedro Juan y Encarnación callada y alargando).

### La prueba

`src/world/vuelta-de-espera-sin-radio.test.ts`, en la mesa de `mesa-del-circuito-de-prueba.ts`, que
ahora sabe de otro campo, de volar sin radio y de alargar el viento en cola: en Los Rodeos, con el JAZ
90 alargando tres kilómetros, con radio sale la vuelta de un turbohélice a 280 m de ti —el instrumento
ve el caso—, y sin radio, en veinte semillas, nadie da su vuelta a menos de 300 m.

`src/world/ceden-el-turno-sin-radio.test.ts`, rehecha: el caso de H102 —uno en la raya que no puede
salir todavía y otro que aterrizaría dentro de su remontada— ya no se da en trescientas semillas, así
que pide solo que el de la raya remonte. En las semillas 52, 54 y 78, que antes se iban al aire sin la
cesión, el que llega da su vuelta con ella y sin ella. Y una nueva con lo 2 a secas: uno que ya remonta
y otro en el viento en cola a menos de dos minutos y medio del suelo; en las semillas 5, 6 y 15 el que
llega se iba al aire, y ahora no, y el que remonta se va. Pasan en `--pool=threads` y en
`--pool=forks`.

**Del navegador**, con el código puesto, una tirada de cada en el puerto 5692 y con
`OGA_FILA_DE_SALIDA=1`: `verificar-vuelo-entero.mjs la-palma guyrami 12 jaz-20`, 65 de 65 —en H102
fueron 63 de 65—; `pettirossi taguato 1 jaz-20`, 59 de 59; `gran-canaria taguato 1 jaz-90`, 63 de 63.

**Lo que no deja entrarlo.** El vitest entero, en seis partes de 2 GB y con el código puesto: 611
ficheros y 12.335 pruebas, con cuatro fallos. Uno es de verdad: en `src/flight/roja-de-verdad.test.ts`,
en Guaraní, la roja más larga de ciento veinte frecuencias pasa a 178 s, y el límite es 170 —las
siguientes, 157,5, 115, 113,5 y 109,5—. No se ha mirado de qué es: con radio solo cambian lo 2 y lo
del paso. Los otros tres, en `src/flight/salida-tapada.test.ts` y los tres en El
Hierro: «nadie parado en tu calle, llegas, salen, y lo que se pide es real», «si no das la vuelta» y
«El Hierro como AFIS». Ninguno encuentra nada mal —las listas de lo que falla salen vacías—: lo que
falla es la comprobación de que el instrumento ve el caso (se pidió alguna vuelta, se dio algún
aviso). Con la cadencia y la salida que tiene la pista en el turno de los que llegan, los dos que
salen por tu calle con esas horas ya no te la tapan cuando llegas, y no hay nada que pedir. Es lo que
se buscaba, pero esas pruebas tienen que volver a ver su caso —otras horas de salida, otra semilla—
antes de que el código entre: una prueba que no puede ver lo que mira no prueba nada.

### Lo que queda

- **La roja de 178 s en Guaraní** (`roja-de-verdad.test.ts`): ver de qué es y arreglarlo. Mirado en
  H104c, abajo: es la de verdad.
- **Rehacer las tres de `salida-tapada.test.ts`** en El Hierro para que vean su caso con lo 2 y la
  cadencia —en H41d hizo falta buscarlo en 192 tiradas—, correr el vitest entero y meter el código,
  que está en 04b00f97 —revertido en 9abaf028— tal cual está medido aquí. Buscado en H104c, abajo,
  en más de mil cuatrocientas tiradas: no sale ningún caso de verdad que ver.
- **Dos en su vuelta en la misma esquina.** Cuando ninguna de las seis maneras de darla libra al otro,
  se da la que más se aparta (`leTocaEsperar`). De verdad, el segundo espera en otro sitio, alarga o
  se separa en altura; el modelo solo sabe dar el tres sesenta en la esquina. Lo de quinientos pies
  por encima está probado en los casos y sin medir entero.
- **El que va por delante de ti y espera por ti** da su vuelta en tu mismo viento en cola. Con medio
  minuto de ventaja, de verdad aterrizaría delante; aquí le hacen falta los 135 s de dos llegadas.
- **Alargar el viento en cola**, para el tráfico: sigue sin existir (H104).
- **Sin radio, alargando y girando a la base más afuera.** Lo que se cuenta por derecho es tu viento
  en cola, no la base que das al final de él: en La Palma, semilla 7, la vuelta de EC-UKM queda a
  298 m de tu base. Y en esa mesa sin radio, Pettirossi y Encarnación esperan por llegada un 10,1 y un
  11,7 % más con lo 2: no es de las mesas que se pedían, pero ahí está.
- **La vuelta del otro, solo hasta que la cierra.** Lo que se probó para contar las que le quedan no
  entra (arriba); con dos en la misma esquina hace falta otra manera de esperar, no mejor cuenta.

## Enmienda H104c (27-11-2026): la roja de Guaraní, que es la de verdad, y las tres de El Hierro, que ya no tienen caso que ver; la salida que tiene la pista en el turno de los que llegan sigue sin entrar

### El caso

H104b dejó el arreglo medido y fuera por el vitest entero: en `roja-de-verdad.test.ts`, en Guaraní,
una roja de 178 s con un límite de 170, y tres pruebas de `salida-tapada.test.ts` en El Hierro que se
quedaban sin su caso. Se vuelve a poner el código tal cual (04b00f97, revertido en 9abaf028) y se mira
cada cosa con la traza.

### La roja de Guaraní: es la de verdad

La prueba de fuera de vitest, con la traza de cada medio segundo (quién tiene la pista en la frecuencia,
qué pieza sujeta la roja y dónde va cada uno del tráfico), da la misma lista que la prueba: 178 s en la
semilla 21, y detrás 157,5, 115, 113,5 y 109,5. Sin el código, la semilla 21 no tiene roja: 2,5 s.

Semilla 21, por orden:

- A los 178 s ZP-IKW, un reactor, tiene su salida: entra en la pista por la calle y la remonta un
  kilómetro y medio a veinte nudos hasta la cabecera antes de correr. La pista es suya hasta que pasa
  el final, a los 446 s.
- ZP-HYQ, una avioneta que llega, **antes se iba al aire** por él: cantaba final a los 363 s y la torre
  la mandaba al aire a los 379,5. Ahora espera su turno detrás de la salida que tiene la pista (lo 2):
  canta el viento en cola a los 349 y la final a los 429.
- Llegas a tu doble raya a los 431,4, dos segundos después de esa final. La roja es de la frecuencia:
  ZP-HYQ en final.
- A los 446,5, con ZP-IKW pasado el final, a ZP-HYQ se la autoriza a aterrizar. Toca a los 476, 44 s
  después de que llegues.
- Su salida, a 1.422 m de la toma, **la tapa ZP-GAJ**, un bimotor que espera en esa doble raya desde
  los 374 s: sigue hasta la siguiente, a 2.289 m de la toma (`rehacerLaLlegada`, «siga hasta la
  próxima»). Rueda esos 2,3 km a 17 m/s de media y deja la pista a los 607,5: 131 s después de tocar.
- Con el «pista libre», la verde 2,5 s después: 178 s.

Ninguno sobra. La avioneta va más despacio que el reactor en la final y en la pista, y la siguiente
salida le queda 867 m más allá; mientras no deje la pista no sale nadie: «until all preceding landing
aircraft are clear of the runway-in-use» (Doc 4444, 7.9.2). Los 170 s del límite eran lo de un
reactor que canta final, frena y deja la pista, con diez segundos de su salida tapada; con una avioneta
y la suya tapada en una pista de 3,4 km son más. **El límite pasa a
185 s, con la cuenta escrita en la prueba.** Nada cambia en el código.

### Las tres de El Hierro: no queda caso que ver

Las tres miran lo mismo, de tres maneras: uno de la frecuencia rueda a una doble raya de tu salida, un
tercero le ocupa la pista y, cuando queda libre, ya no le da tiempo a irse antes que tú. Con torre se
pide una vuelta (o irse al aire); si no la das, o te vas al aire, o el de tu salida se queda retenido,
o el permiso te llega por debajo de la decisión (H96); con un AFIS se te avisa y en la final se te
propone irte. Cada prueba exige además que eso pase alguna vez —que el instrumento vea el caso—, y la
de no dar la vuelta, que lo pedido fuera de verdad: una vuelta que no das y tras la que no pasa nada
de eso no hacía falta.

El barrido, con el código puesto y la prueba tal cual, fuera de vitest (el fichero de la prueba con su
`llegarConDosQueSalen`, y un bucle al final):

| qué | tiradas | vueltas o idas al aire pedidas | avisos · propuestas (AFIS) |
|---|---|---|---|
| 29 parejas de horas, de 700/670 a 140/110 s, semillas 1 a 3, las dos cabeceras, JAZ 20 y el más grande: con torre y con AFIS | 348 + 348 | 0 | 0 · 0 |
| las 5 parejas de la prueba, semillas 4 a 21, con torre | 360 | 40, todas en la 152, con 500/470 y 360/330 y de la semilla 9 en adelante | — |
| esas 2 parejas, semillas 9 a 21, sin dar la vuelta y con AFIS | 104 + 104 | 40, y ninguna lleva a nada: 0 idas al aire, 0 retenidos, 0 permisos tardíos | 40 · **0** |
| las otras 3 parejas de la prueba, semillas 9, 10 y 13, sin dar la vuelta y con AFIS | 36 + 36 | 0 | 0 · 0 |
| 10 parejas de 320/290 a 140/110, semillas 9, 10 y 13, en la 152: con torre, sin dar la vuelta y con AFIS | 60 · 60 · 60 | 6 con torre y 6 sin darla, todas con 320/290, y ninguna lleva a nada | 11 · 8, todas con 320/290 |

Lo que queda, de la semilla 9 en adelante, es siempre lo mismo. 360/330, semilla 9, JAZ 20 por la
152: EC-GCZ entra en la pista a los 28 s y la remonta 630 m; EC-JFX espera en la doble raya de tu
salida. A los 153 s, con 236 s para tu toma, la torre cuenta que a EC-JFX le hacen falta 184 s más 53
de esperar a EC-GCZ, 237, y te pide la vuelta: le falta un segundo. Pero a EC-JFX se le da la salida
a los 170, 17 s después y no 53 —con la cadencia de H100, en cuanto la pista lo permite—, y de ahí a
estar en el aire tarda 139 s: a los 309 pasa de los veinte metros. Sin dar la vuelta tocas a los 390,
81 s después, con el permiso a su hora. La vuelta la pide la cuenta por arriba de lo que tarda en
irse el que remonta (`loQueTardaEnIrse`: `MARGEN_PARA_IRSE` y lo que se le cuenta de remonte, carrera y
espera), no un conflicto: es justo lo que la prueba de no dar la vuelta marca como «sin vuelta, sin
irse al aire, sin retener a nadie y sin permiso tardío». Con el AFIS, con 500/470 y 360/330, lo mismo:
se avisa, y en la final no hay nada que proponer.

Con 320/290 el AFIS sí ve su caso, y es otro: los de la frecuencia salen uno detrás de otro por tu
única salida, cada uno remontando sus 630 m, y en la final siempre hay uno que no se ha ido. Con el
JAZ 20, en la semilla 9, se te propone irte cuatro veces seguidas —por EC-JFX, EC-SCL, EC-XBG y
EC-TRQ— y tocas a los 951 s. La prueba del AFIS lo vería; la de no dar la vuelta, con esa misma hora y
torre, sigue con la vuelta que no lleva a nada.

Sin el código pasa igual en la otra cabecera: con 360/330 y las semillas 10 y 13, por la 332, la
vuelta pedida tampoco lleva a nada. Por la 152, con el código de antes, sí: el de tu salida salía más
tarde y el permiso te llegaba por debajo de la decisión; con la cadencia sale antes y llega a tiempo.

**No se ha encontrado hora ni semilla con la que las tres vean su caso y lo pedido sea de verdad.** Con
lo 2 y la cadencia, en El Hierro el conflicto que miran ya no se da con este montaje —es lo que se
buscaba—, y lo único que queda es una vuelta que la torre pide de más. Meter una semilla de la 9 en
adelante, con 320/290, haría pasar la de torre y la del AFIS, y fallar con razón la de no dar la
vuelta («sin nada»); y lo que vería la de torre es esa vuelta que no hace falta. No se rebaja
ninguna, y no se mete ninguna hora ni semilla.

### Lo sin radio que subía

En la mesa sin radio de los 1.760 vuelos de H98 y H100, que no era de las pedidas, subían dos cosas.
No se ha arreglado ninguna.

- **La espera por llegada, en Pettirossi de 46,0 a 50,7 s (10,1 %) y en Encarnación de 61,9 a 69,1
  (11,7 %).** Con la traza de quién impone cada vuelta, corrida también en el antes (la mesa con el
  código de antes y la traza sale igual vuelo a vuelo que la de H102: 320 de 320), segundos por
  llegada:

  | quién impone la vuelta | Pettirossi | Encarnación |
  |---|---|---|
  | quien juega | 32,5 → 27,9 | 38,2 → 43,8 |
  | tu salida | 6,6 → 9,9 | 8,9 → 5,6 |
  | otra llegada | 6,9 → 6,6 | 13,7 → 14,3 |
  | otra llegada en su vuelta | — | 1,1 → 5,4 |
  | una salida del tráfico que tiene la pista (lo 2) | 0 → 6,3 | 0 |
  | **total** | **46,0 → 50,7** | **61,9 → 69,1** |
  | frustradas | 14 → 0 | 12 → 0 |

  En Pettirossi lo que más sube es lo 2, 6,3 s, y es lo de verdad: el que antes se iba al aire con
  la salida delante ahora espera a que pase el final (7.10.1); la espera por tu salida sube 3,3 y la
  de quien juega baja 4,6. Son 1.734 s más de espera en 254 llegadas, 124 por cada frustrada que se
  va. En Encarnación no hay nada de lo 2: suben la espera detrás de quien juega y detrás de otra
  llegada que da su vuelta —con más vueltas, más vueltas en cadena—, y baja la de tu salida. De dónde
  sale lo de quien juega no se ha mirado, y no se puede decir si es de verdad.
- **La Palma, la vuelta de otro a menos de 300 m de ti, de 0 a 2**: EC-UKM, semilla 7, alargando y con
  tu base por su esquina (H104b). No se ha mirado más.

### Decisión

**Sigue sin entrar.** La roja de Guaraní es la de verdad y tiene su límite con la cuenta, pero las tres
de El Hierro no vuelven a ver su caso con ninguna hora ni semilla de las barridas, y no se rebajan. El
juego no cambia. El código, con el límite nuevo de `roja-de-verdad.test.ts`, queda en la historia tal
como entraría (83ffdfe2, revertido en 2c6cfb4b), y es el mismo de 04b00f97 con lo de H105
encima: la mesa con el worktree sale igual vuelo a vuelo que la de H104b en La Palma (60 de 60).

Como no entra, no se ha corrido el vitest entero ni los tres bancos del navegador: eran para meterlo.
Sí, con el código puesto, `roja-de-verdad.test.ts`, `vuelta-de-espera-sin-radio.test.ts` y
`ceden-el-turno-sin-radio.test.ts`, en `--pool=threads` y en `--pool=forks`: 25 de 25 en los dos, con
la de Guaraní en 178 s y por debajo de los 185.

### Lo medido

Sin cambios en el código desde H104b, las tablas son las suyas, salvo Los Rodeos: H105 le cambió la
aviación general y se ha vuelto a correr, antes y con el código, con la mesa de H104 tal cual. Con
radio, los 2.820 vuelos (antes → con el código):

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Los Rodeos (600) | 61 → 17 | 747 → 776 | 688 → 679 | 36,1 (2) → 37,0 (2) | 65,9 → 66,9 | 0/0/0 | 1/0 |
| Gando (60) | 6 → 3 | 78 → 77 | 93 | 49,0 (24,5) → 48,7 (24,5) | 64,5 → 70,2 | 0/0/0 | 0/0 |
| Tenerife Sur (60) | 3 → 0 | 70 → 71 | 85 | 47,7 (36) → 44,1 (36) | 67,6 → 70,9 | 0/0/0 | 0/0 |
| Lanzarote (60) | 0 | 65 | 63 | 18,5 (2) | 67,9 | 0/0/0 | 0/0 |
| Fuerteventura (60) | 0 | 71 → 70 | 67 | 25,4 (2) | 71,3 → 74,8 | 0/0/0 | 0/0 |
| La Palma (60) | 18 → 0 | 73 → 79 | 102 → 109 | 81,5 (56) → 88,6 (92) | 86,7 → 80,6 | 0/0/0 | 0/0 |
| Cuatro Vientos (60) | 0 | 63 | 69 | 17,3 (2) | 64,6 → 66,6 | 0/0/0 | 0/0 |
| Pettirossi (60) | 7 → 0 | 69 → 80 | 92 → 93 | 39,9 (12) → 40,3 (12) | 45,5 → 49,7 | 0/0/0 | 0/0 |
| El Hierro, remontando (300) | 64 → 1 | 437 → 513 | 561 → 617 | 86,3 (94) → 70,0 (68,5) | 89,3 → 85,5 | 0/0/0 | 0/0 |
| La Gomera, remontando (300) | 6 → 0 | 369 → 406 | 527 → 570 | 73,6 (52) → 62,7 (40,5) | 97,0 → 92,3 | 0/0/0 | 0/0 |
| Pilar (300) | 2 → 1 | 456 → 477 | 576 → 654 | 39,1 (35,5) → 33,7 (15) | 56,3 → 61,3 | 0/0/0 | 0/0 |
| Pedro Juan (300) | 0 | 426 → 459 | 561 → 613 | 25,3 (5) → 24,9 (3) | 69,7 → 59,9 | 0/0/1 → 0/0/0 | 0/0 |
| Concepción (300) | 13 → 0 | 399 → 424 | 520 → 547 | 61,4 (31) → 64,8 (35) | 73,5 → 68,7 | 0/0/0 | 0/0 |
| Estigarribia (300) | 27 | 403 → 435 | 540 → 579 | 45,0 (15,5) → 50,3 (22,5) | 72,1 → 70,1 | 0/0/1 | 0/0 |
| **todos (2.820)** | **207 → 49** | **3.726 → 3.995** | **4.544 → 4.838** | **48,8 (23) → 46,5 (20,5)** | **72,9 → 71,3** | **0/0/2 → 0/0/1** | **1/0 → 1/0** |

En Los Rodeos, H105 sola sube las frustradas del tráfico de 40 a 61 y trae un aterrizaje con la pista
ocupada en 600 vuelos (JAZ 20, viento de 300, semilla 6, con EC-GVY en ella), que sale igual con el
código y sin él; con el código, las frustradas bajan a 17 y la espera por llegada sube un 1,5 %. Lo
que no cumple de los criterios de H104 es la mediana de La Palma, que H104b ya dejó fuera: el resto,
todo.

Encarnación sin radio, JAZ 20, las dos cabeceras, por la línea y alargando:

| | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | rojas a ti (por tu salida) |
|---|---|---|---|---|---|---|---|
| callada a los 20 s de despegar, obedeciendo cada roja (1.000) | 46 → 0 | 1.413 → 1.490 | 1.584 → 1.644 | 90,0 (54) → 83,6 (43,5) | 68,7 → 69,8 | 0/6/22 → 0/2/12 | 99 (78) → 76 (40) |
| callada desde el principio (400) | 22 → 0 | 540 → 568 | 576 → 608 | 92,8 (58,5) → 87,7 (44,5) | 69,1 → 74,3 | 0/1/12 → 0/1/12 | 10 (0) → 7 (0) |

### Lo que queda

- **Lo que tarda en irse el que remonta, contado por arriba.** En El Hierro la torre pide vueltas que
  no hacen falta: a EC-JFX se le contaban 237 s y se fue en 156. Es lo único que les queda de caso a
  las tres pruebas de El Hierro, y no es de verdad; pasa también sin el código (por la 332, semillas 10
  y 13). O se ajusta esa cuenta —`MARGEN_PARA_IRSE`, el remonte, la espera a la que tiene la pista— y
  se vuelve a buscar el caso, o se monta de otra manera: con una llegada que aterrice delante de ti
  mientras el de tu salida espera, que es el de H41d y que con lo 2 no ha salido en el barrido.
- **Encarnación sin radio**, los 7,2 s de espera de más por llegada, que no son de la salida que tiene
  la pista: vienen de esperar detrás de quien juega (+5,6) y de otra llegada en su vuelta (+4,3), y
  falta ver por qué.
- **La Palma sin radio**, la vuelta de EC-UKM a 298 m de tu base alargando (H104b).
- Y lo de H104b que sigue igual: dos en su vuelta en la misma esquina, el que va por delante de ti y
  espera por ti, alargar el viento en cola para el tráfico.

## Enmienda H107 (27-11-2026): Los Rodeos con la aviación general, la toma con la pista ocupada y las frustradas que subían

### El caso

H105 llevó las avionetas de Los Rodeos a la GA 1, en la punta oeste, y la mesa de los 600 vuelos con radio de H104 (JAZ 20,
50, 60, 90 y 120, por la 12 y por la 30, semillas 1 a 60) dio dos cosas que trae H105 sola, sin nada de lo de H104: **un
aterrizaje con la pista ocupada** —JAZ 20, viento de 300, semilla 6, con EC-GVY en ella— y **las frustradas del tráfico de 40 a
61**. Las dos se miran con la traza, no razonando.

### La toma con la pista ocupada

La mesa con el código de main (5ecd16cb) sale igual vuelo a vuelo que la de H104c (600 de 600); semilla 6, por la 30:

- **EC-CYD**, avioneta, toca a los 178 s, deja la pista por la salida de 1.180 m y rueda dos kilómetros por la paralela hacia la
  GA 1, al AG2. A los 500 s sigue rodando por ella, a 2.580 m del umbral.
- **EC-GVY**, avioneta, vuelve de dar otra vuelta: final a los 455, «cleared to land» de la torre a los 460 —con su ocupación
  de pista contada, 88 s, cabía delante de ti— y toca a los 499,5. Va al AG1, al lado del AG2.
- **A los 500,5, recién tocada, se le cambia la salida.** Su ruta al AG1 y la de EC-CYD al AG2 van de frente en los últimos
  veinte metros, junto a los puestos (a 13,5 m y en sentido contrario); y como la paralela entera es el mismo trozo de calle
  cerca de la ruta del otro, EC-CYD ya estaba dentro. En `repartirLosTramos`, el que corre por la pista pasaba siempre primero,
  y con el otro dentro se le buscaba otra salida que no pasara por donde estaba (`rehacerLaLlegada`): la única era la del final
  de la pista. **Boca de 10.169 a 11.566 m de su camino, 1.397 m más de pista, y ocupación de 88 a 158 s.** EC-CYD, mientras,
  se para en la paralela a los 530 y espera a EC-GVY, que está dos kilómetros y medio por detrás.
- **Quien juega**, JAZ 20, despegó a los 311,5 y vuelve: final a los 579. La torre le dice que la pista está ocupada a 154 m
  y 44 s del umbral, y **le manda al aire a 59 m y 31 s, por EC-GVY**. En esta tabla la mesa no obedece la frustrada —solo con
  `FRUSTRA=orden`—, así que toca a los 633 con EC-GVY rodando todavía a 2.555 m del umbral, a 11 m/s; la deja a los 652.

Así que la torre sí lo vio, y mandó al aire; quien toca es quien juega, que en la mesa no obedece —y en el juego puede no
obedecer—. Lo que no es de verdad es lo de EC-GVY: setenta segundos más corriendo por la pista para no cruzarse en la calle con
uno que iba a estar aparcado mucho antes de que ella llegara. El que aterriza deja la pista por la primera salida que le sirve
—«landing aircraft (…) shall vacate the runway», y el siguiente no cruza el umbral hasta que la ha dejado (OACI, Doc 4444,
7.10.1)— y lo de la calle se resuelve en la calle. Con el tráfico solo, sin quien juega, pasa igual: en 30 semillas por la 30,
EC-GVY en la 6 y EC-YAJ en la 29 dejan la pista a 2.812 m del principio de la pista, 153 s después de tocar; las demás, a 984 o
1.613 m, en 83 a 85 s.

### Por qué subían las frustradas

La mesa con la traza de cada frustrada del tráfico —quién se va y quién tenía la pista en ese momento, y qué hacía—, antes de
H105 (be0fe04a, con la ficha de entonces) y con H105. Salen las dos igual vuelo a vuelo que las del material (600 de 600 cada
una). Cada caso sale cinco veces, una por avión de quien juega: el tráfico hace lo mismo hasta que tú cuentas.

| quién se va · quién tenía la pista | antes de H105 | con H105 |
|---|---|---|
| avioneta · turbohélice alineado, sin despegar (por la 30, raya a 2.249 m) | 15 | 15 |
| reactor · turbohélice alineado, sin despegar (por la 30) | 10 | 10 |
| turbohélice · turbohélice alineado (por la 12) | 5 | 5 |
| avioneta · avioneta en el aire, sin pasar el final (por la 30, del 19 → del AG3) | 5 | 5 |
| avioneta · avioneta en el aire (por la 12, del 19) | 5 | — |
| **turbohélice · avioneta alineada, sin despegar (por la 12, del AG1 por la E2)** | — | **11** |
| **reactor · avioneta alineada, sin despegar (por la 12, del AG1 por la E2)** | — | **5** |
| turbohélice · avioneta en el aire (por la 30, del AG3) | — | 5 |
| turbohélice · turbohélice en el aire (por la 12) | — | 5 |
| **total** | **40** | **61** |

Lo nuevo es la avioneta alineada en la 12. Desde H105 sale del AG1 por la E2, en la cabecera misma: 405 m hasta su doble raya y
sin remontar, contra los 1.226 del 19 de antes. Llega antes y la torre la alinea con la fila vacía. Semilla 20: EC-GCN llega a
su doble raya a los 70 s y se la alinea a los 72; EC-OZZ, un turbohélice, va por el viento en cola, a 97 s del umbral, y la
fila empieza en la esquina de la base, así que no cuenta. A los 96 gira a la base y entra en la fila: con él ahí la avioneta ya
no tiene despegue —no pasaría el final de los 3.168 m antes de que él cruzara el umbral—, y él, al girar, no cuenta con la
salida que tiene la pista. Baja hasta la decisión con EC-GCN alineada, 63 s parada en la cabecera, y a los 152,5 se va al aire.
Con el tráfico solo, por la 12 y en 30 semillas, 8 de las 9 idas al aire son por una salida alineada que no despega, cinco de
ellas avionetas de la GA 1.

**No es una pista más ocupada de verdad: es un fallo de la torre**, que no alineaba a nadie sin mirar quién venía en final pero
no veía al que venía por el viento en cola. Contigo sí lo miraba, por el circuito (`llegaAntesDeQueSalga`). Una torre de verdad ve
al del viento en cola y no alinea a quien no se va a haber ido antes de que él cruce el umbral (Doc 4444, 7.10.1.2): la avioneta
espera en su doble raya, fuera de la pista. Las salidas sí suben de verdad con H105 —de 659 a 688 en los 600 vuelos—, porque la
avioneta llega a la 12 sin remontar; las frustradas, no tienen por qué.

Lo demás de la tabla es la misma clase que ya había antes de H105 y que H104 quería arreglar sin conseguir que entrara: una salida
a la que se dio la pista con la fila vacía y uno que gira a la base sin contar con ella. Por la 30 la avioneta sale del AG3
rodando 3.213 m en vez de 2.441, y las horas se mueven: una que estaba (semilla 13 por la 12) se va y llegan dos (semilla 15 por
la 30 y semilla 13 por la 12).

### Decisión

1. **El que corre por la pista solo pasa primero en un tramo de frente si no puede esperar fuera de ella** (`noEsperaFuera` en
   `trafico.ts`): si el tramo empieza antes de haber dejado la pista —pasada la doble raya de su salida—. Solo entonces, y con el
   otro dentro, se le busca otra salida. Si empieza después, deja la pista por la de siempre, espera fuera como cualquiera que
   rueda y el tramo se reparte como entre dos que ruedan: pasa el que ya estaba dentro. La de `rehacerLaLlegada` por un avión
   que espera en la doble raya de su salida (la «siga hasta la próxima» de Guaraní, H104c) no cambia: ésa sí le tapa la salida.
2. **Medido y fuera: que «line up and wait» mire también a los del tráfico que vienen y todavía no han girado a la base** (`vieneDelTraficoAntesDe`
   en `llegaAntesDeQueSalga`), con su hora natural de umbral, igual que contigo por el circuito. **Solo para alinearse.** Se probó
   también para la salida directa, sin alinearse: las frustradas de Los Rodeos bajaban a 5, pero en la semilla 38 por la 12 una
   avioneta retenida por EC-ASL, que en su final se iba al aire por guion, despegaba detrás de su frustrada y se le quedaba a 264 m
   y 86 m por debajo: un encuentro a más. `seEchariaEncima` no mira tan lejos, y eso queda (ver «Lo que queda»). **Y solo
   para el que no remonta**: el que entra a remontar ya cuenta su remonte en el hueco, y sin radio los que llegan le ceden el
   turno (H102). Mirándolo también para él, el vitest entero vio caer las dos de Encarnación de `ceden-el-turno-sin-radio.test.ts`
   —en la semilla 6 ya no se daba el caso—. Con él, en los 2.820, El Hierro bajaba de 64 frustradas a 4: queda para mirarlo
   con esas pruebas (ver «Lo que queda»).

**El 2 no entra**: con él, en `fila-de-salida.test.ts` (Tenerife Sur) cae «el que esperaba antes que tú sale antes, y la torre
sabe tu número», y no ha dado tiempo a ver por qué. Queda en la historia tal como entraría, con su prueba
(`alinearse-con-uno-en-el-viento-en-cola.test.ts`, vista fallar sin él: ocho idas al aire por una salida alineada), en bb5b7219,
y se saca en 0a55c173. El juego lleva el 1.

No entra nada de H104 (la salida que tiene la pista en el turno de los que llegan, ni la cadencia de la doble raya), ni lo de los
puestos incompatibles, ni el remolque de avionetas.

### Lo medido

**Lo que entra, el arreglo 1**: en Los Rodeos con radio cambian 26 de los 600 vuelos, ninguna toma con la pista ocupada (de 1 a
0), las frustradas igual, 61, la roja de quien juega de 36,1 (2) a 36,6 (2) y la espera por llegada de 65,9 a 66,9; en los 2.820,
fuera de Los Rodeos cambian seis vuelos, dos en Lanzarote y cuatro en Estigarribia, y nada más. Sin radio y en Encarnación no se
ha medido el 1 solo.

Lo que sigue es **con los dos**, el 2 tal como queda en la historia.

Con radio, Los Rodeos (los 600, con `FRUSTRA` sin poner y `H100=1`), con H105 → con los dos:

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Los Rodeos (600) | 61 → 20 | 747 → 787 | 688 → 682 | 36,1 (2) → 39,9 (9) | 65,9 → 63,6 | 0/0/0 | 1/0 → 0/0 |

Antes de H105 eran 40 frustradas, 742 tomas, 659 salidas, la roja de quien juega en 35,8 s de media (mediana 2) y 63,1 s de espera
por llegada: con los dos, 20, 787, 682, 39,9 (9) y 63,6. La mediana de la roja sube 7 s: es la salida del tráfico que ahora espera en
su doble raya al del viento en cola, y tú detrás; avión a avión y por cabecera, la mediana de cada uno sube 3 s como mucho, o nada.

Las frustradas, por quién tenía la pista, con los dos:

| quién se va · quién tenía la pista | con H105 | con los dos |
|---|---|---|
| avioneta · turbohélice alineado, sin despegar (por la 30) | 15 | 5 |
| reactor · turbohélice alineado, sin despegar (por la 30) | 10 | — |
| turbohélice · turbohélice alineado (por la 12) | 5 | — |
| turbohélice · avioneta alineada, sin despegar (por la 12, del AG1 por la E2) | 11 | — |
| reactor · avioneta alineada, sin despegar (por la 12, del AG1 por la E2) | 5 | — |
| avioneta · avioneta en el aire, sin pasar el final (por la 30, del AG3) | 5 | 5 |
| turbohélice · avioneta en el aire (por la 30, del AG3) | 5 | 5 |
| turbohélice · turbohélice en el aire (por la 12) | 5 | 5 |
| **total** | **61** | **20** |

Las veinte que quedan son todas la clase de H104: una salida con la pista dada y uno que gira a la base sin contar con ella.
Son la mitad de las de antes de H105.

Con radio, los 2.820 (antes, `todoA105` del material de H104c, con el código de main: sale igual vuelo a vuelo que la mesa de
ahora en Los Rodeos, 600 de 600, y en El Hierro con el JAZ 20, 100 de 100):

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Los Rodeos (600) | 61 → 20 | 747 → 787 | 688 → 682 | 36,1 (2) → 39,9 (9) | 65,9 → 63,6 | 0/0/0 | 1/0 → 0/0 |
| Gando (60) | 6 → 3 | 78 | 93 → 90 | 49,0 (24,5) → 55,0 (24,5) | 64,5 → 70,0 | 0/0/0 | 0/0 |
| Tenerife Sur (60) | 3 | 70 | 85 | 47,7 (36) | 67,6 | 0/0/0 | 0/0 |
| Lanzarote (60) | 0 | 65 | 63 → 61 | 18,5 (2) | 67,9 | 0/0/0 | 0/0 |
| Fuerteventura (60) | 0 | 71 | 67 | 25,4 (2) | 71,3 | 0/0/0 | 0/0 |
| La Palma (60) | 18 | 73 | 102 | 81,5 (56) | 86,7 | 0/0/0 | 0/0 |
| Cuatro Vientos (60) | 0 | 63 | 69 | 17,3 (2) | 64,6 | 0/0/0 | 0/0 |
| Pettirossi (60) | 7 → 3 | 69 → 74 | 92 → 90 | 39,9 (12) → 43,0 (17,5) | 45,5 → 46,9 | 0/0/0 | 0/0 |
| El Hierro, remontando (300) | 64 | 437 | 561 | 86,3 (94) | 89,3 | 0/0/0 | 0/0 |
| La Gomera, remontando (300) | 6 | 369 | 527 | 73,6 (52) | 97,0 | 0/0/0 | 0/0 |
| Pilar (300) | 2 → 1 | 456 → 457 | 576 → 574 | 39,1 (35,5) | 56,3 → 56,2 | 0/0/0 | 0/0 |
| Pedro Juan (300) | 0 | 426 | 561 → 557 | 25,3 (5) | 69,7 | 0/0/1 | 0/0 |
| Concepción (300) | 13 | 399 | 520 | 61,4 (31) | 73,5 | 0/0/0 | 0/0 |
| Estigarribia (300) | 27 | 403 → 405 | 540 → 542 | 45,0 (15,5) → 44,9 (15,5) | 72,1 → 72,2 | 0/0/1 | 0/0 |
| **todos (2.820)** | **207 → 158** | **3.726 → 3.774** | **4.544 → 4.527** | **48,8 (23) → 49,8 (24,5)** | **72,9 → 72,5** | **0/0/2 → 0/0/2** | **1/0 → 0/0** |

Cumple campo a campo lo pedido: ninguna toma con la pista ocupada, ningún encuentro a más, ninguna espera por llegada más de un
10 % peor —Gando, de 64,5 a 70,0, un 8,5 %— y ninguna mediana de la roja más de 10 s peor —Pettirossi, de 12 a 17,5—. Cambian 87
de los 2.820 vuelos: 62 en Los Rodeos y 25 en Gando, Lanzarote, Pettirossi, Pilar, Pedro Juan y Estigarribia; La Palma, El
Hierro, La Gomera y Concepción salen iguales vuelo a vuelo.

Sin radio, los 1.760 de H98 y H100 (`corre-luz.sh`, 20 semillas por campo, cabecera, largo y avión), main → con los dos:

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Gando (160) | 10 → 4 | 262 → 264 | 277 → 273 | 47,7 (8,5) → 50,8 (8,5) | 63,9 → 68,1 | 0/0/0 | 0/0 |
| Tenerife Sur (160) | 4 | 190 → 198 | 225 → 226 | 34,5 (2) → 34,5 (2) | 77,4 → 73,4 | 0/1/3 | 0/0 |
| Lanzarote (160) | 20 → 4 | 202 → 216 | 247 → 243 | 23,3 (2) → 29,4 (2) | 84,7 → 80,0 | 0/0/0 | 0/0 |
| Fuerteventura (160) | 0 | 216 | 202 | 26,7 (2) | 81,4 | 0/0/0 | 0/0 |
| La Palma (160) | 48 | 232 | 272 | 81,1 (56) | 82,0 | 0/0/0 | 0/0 |
| Cuatro Vientos (160) | 16 → 2 | 220 → 228 | 204 → 200 | 26,4 (5,5) → 29,7 (11) | 93,2 → 89,5 | 0/2/4 → 0/2/2 | 0/0 |
| Pettirossi (160) | 14 → 6 | 208 → 216 | 239 → 229 | 30,9 (2) → 32,4 (2) | 46,0 → 47,8 | 8/0/0 | 0/0 |
| Encarnación (160) | 12 | 206 | 264 | 93,7 (40,5) | 61,9 | 0/0/4 | 0/0 |
| El Hierro (160) | 36 | 204 | 274 | 85,1 (90,5) | 127,6 | 0/0/0 | 0/0 |
| Guaraní (160) | 0 | 210 | 253 | 54,3 (13,5) | 91,0 | 14/1/0 | 0/0 |
| Los Rodeos (160) | 26 → 16 | 205 → 216 | 222 → 224 | 35,2 (7,5) → 41,6 (15) | 75,5 → 79,1 | 0/0/0 | 0/0 |
| **todos (1.760)** | **186 → 132** | **2.355 → 2.406** | **2.679 → 2.660** | **49,0 (11) → 50,8 (14)** | **81,5 → 81,2** | **22/4/11 → 22/4/9** | **0/0 → 0/0** |

Cambian 98 de los 1.760. Las frustradas bajan de 186 a 132 y la espera por llegada se queda en 81,5 → 81,2, sin un encuentro a
más; pero **no sale igual o mejor en todo**: la roja de quien juega sube en Los Rodeos (mediana de 7,5 a 15 s, media de 35,2 a
41,6), en Cuatro Vientos (5,5 a 11) y de media en Lanzarote (23,3 a 29,4) y Gando (47,7 a 50,8), y la espera por llegada, en
Gando de 63,9 a 68,1 (6,6 %), en Los Rodeos de 75,5 a 79,1 y en Pettirossi de 46,0 a 47,8. Por lo que se
ha visto con radio en Los Rodeos, es la salida del tráfico que ahora espera en su doble raya a que aterrice el del viento en
cola, con quien juega detrás; sin radio no se ha trazado. Todo dentro de lo que se pide a los de con radio —ni un 10 % más de espera ni 10 s más de mediana—, y escrito para que se decida.

Encarnación sin radio, JAZ 20, callada a los 20 s y obedeciendo cada roja, las dos cabeceras, por la línea y alargando (los
1.000 de H102): **iguales vuelo a vuelo, 1.000 de 1.000**. El de main sale igual que el «antes» de la tabla de H104c: 46
frustradas, 1.413 tomas, 1.584 salidas, la roja en 90,0 s (54), 68,7 s por llegada y 0/6/22.

**Pruebas nuevas** (la segunda, con el 2, en la historia), en `--pool=threads` y en `--pool=forks`, con lo que monta el juego —la frecuencia, el tráfico con sus calles y
sus tipos, y el turno— sin quien juega, 30 semillas:

- `deja-la-pista-con-otra-rodando.test.ts`: en Los Rodeos por la 30, que se vea el caso —EC-GVY toca en la semilla 6 con EC-CYD
  rodando hacia la GA 1— y que ninguna avioneta ni bimotor que llega deje la pista pasados los 2.000 m ni tarde más de dos minutos.
  Vista fallar sin el arreglo: EC-GVY en la 6 y EC-YAJ en la 29, a 2.812 m y 153 s.
- `alinearse-con-uno-en-el-viento-en-cola.test.ts`: en Los Rodeos por la 12, que las avionetas de la GA 1 salgan —EC-GCN en la
  semilla 20— y que nadie del tráfico se vaya al aire por una salida alineada que no despega. Vista fallar sin el arreglo: ocho:
  cinco por avionetas de la GA 1 (tres de ellas, EC-OZZ en la semilla 20) y tres por un turbohélice y dos reactores.

**Vitest, por partes de 2 GB**, en `--pool=threads`: `src/world` en cuatro, 209 ficheros, 4.563 en verde y 3 saltadas; `src/flight`,
la primera de tres, 93 ficheros, 1.677 en verde, 14 saltadas y una pendiente. Todo eso con los dos arreglos. Después, las pruebas de `src/flight`
que montan el tráfico o el turno: con los dos cae `fila-de-salida.test.ts`, y por eso el 2 sale. **Con el 1 solo**:
`fila-de-salida`, `deja-la-pista-con-otra-rodando` (hilos y procesos) y `ceden-el-turno-sin-radio`, en verde, y `tsc`. Las
partes segunda y tercera de `src/flight` y lo de fuera de `src/world` y `src/flight` **no se han corrido**: no dio el tiempo. Con la primera versión del arreglo 2 —sin la
excepción del que remonta— la segunda parte de `src/world` vio caer las dos de Encarnación de `ceden-el-turno-sin-radio.test.ts`
(ver «Decisión»); con la de ahora pasan.

**Navegador**, con `OGA_GPU=1` y en el puerto 5692. `OGA_METAR="GCXO 270900Z 30012KT 9999 FEW025 17/12 Q1019" node
scripts/verificar-vuelo-entero.mjs tenerife-norte guyrami 3 jaz-20`: **63 de 63 comprobaciones y 2 sin medir**; del AG1 a la
doble raya de la 30, 2.033 m en 224 s, despega, vuelve y aparca en el AG1, a un metro de su punto, con el señalero delante. Se
voló con los dos arreglos, el 2 todavía sin la excepción del que remonta. Y `node scripts/verificar-vuelo-entero.mjs tenerife-norte
taguato 1 jaz-90`, con los dos arreglos: **63 de 63 comprobaciones y 3 sin medir**; 509 m del puesto a la doble raya
en 68 s, y el vuelo acaba apagado en el puesto, con el señalero, a los 905 s. **Con el 1 solo, que es lo que entra, no se ha volado
ninguno.**

### Lo que queda

- **El arreglo 2, fuera**: ver por qué cae `fila-de-salida.test.ts` con él —en Tenerife Sur, el que espera delante de ti en la
  fila y la torre que ya no le alinea con uno en el viento en cola— y volver a medirlo. Con él las frustradas de Los Rodeos son
  20; sin él siguen en 61, y de ellas dieciséis son la avioneta alineada en la 12.
- **Lo que no mira `seEchariaEncima`**: una salida que despega detrás de uno que se va al aire por la misma subida. Con la
  salida directa retenida por los del viento en cola, en la semilla 38 de Los Rodeos por la 12, 264 m. Hasta mirarlo, la
  salida directa no se retiene por ellos.
- **El que entra a remontar con uno en el viento en cola**: no se mira, para no deshacer la cesión de H102. Mirándolo, El
  Hierro bajaba de 64 frustradas a 4 en los 2.820, y caían las dos de Encarnación de `ceden-el-turno-sin-radio.test.ts`, que
  ya no encontraban su caso. Pide rehacer ese caso —y los tres de El Hierro de H104c— con la torre que ya no alinea.
- **La clase de H104** —una salida con la pista dada y uno que gira a la base sin contar con ella— sigue: veinte de las
  frustradas de Los Rodeos. Ver «Lo que queda» de H104c.
- **Quien juega en la mesa con radio no obedece la frustrada** salvo con `FRUSTRA=orden`: «tocar ocupada» en esa tabla cuenta
  también a quien la torre ya mandó al aire. Aquí la torre mandaba al aire a 59 m y 31 s del umbral; el fallo era la pista
  ocupada, no la orden.

## Enmienda H107b (27-11-2026): el «line up and wait» que mira a los del viento en cola, afinado, y por qué dejaba sin su caso la fila de Tenerife Sur

### El caso

El arreglo 2 de H107 —que «line up and wait», solo al que no remonta, mire también a los del tráfico que vienen y todavía no
han girado a la base— bajaba las frustradas de Los Rodeos de 61 a 20 y las de los 2.820 con radio de 207 a 158, cumpliendo
campo a campo, pero no entró: con él caía «el que esperaba antes que tú sale antes, y la torre sabe tu número», de
`fila-de-salida.test.ts`, en Tenerife Sur, y no dio tiempo a ver por qué. Aquí se ve, con el arreglo encima tal como quedó en
la historia y la prueba trazada vuelo a vuelo.

### Por qué caía la fila de Tenerife Sur

Caen cuatro de las 160 frecuencias, las semillas 55, 92, 97 y 138, las cuatro con «verde con … esperando delante», y las cuatro
son el mismo caso. Semilla 55:

- **EC-MGE**, turbohélice, llega a su doble raya a los 664,5 s con el guion de la espera: lo siguiente que le toca es «line up
  and wait».
- **EC-DDD**, reactor, da otra vuelta después de una frustrada y va por el viento en cola, a 125 s de la toma. No está en la
  fila —empieza en la esquina de la base—, pero con el arreglo 2 la torre lo mira, y el hueco para alinearse de un turbohélice
  en los 3.195 m de Tenerife Sur es de 160 s: 20 de entrar y alinearse, 25 de carrera, 40 hasta pasar el final y los 75 de
  `ESPERA_MAXIMA`, lo más que puede tardar la radio en darle la salida al que espera alineado. 125 no llega: EC-MGE se queda en
  su doble raya. Sin esos 75, 85 s, y cabría con cuarenta de sobra.
- **Quien juega**, el JAZ 60 de la prueba, llega a la suya en el mismo medio segundo, detrás: la torre le dice su número, el
  dos, por EC-MGE.
- EC-DDD gira a la base a los 706, toca hacia los 789 y deja la pista hacia los 852. EC-MGE lleva entonces 190 s esperando en
  su doble raya; a los 180, `PACIENCIA_EN_LA_FILA` le ha sacado de la fila de quien juega —es la red para el que no sale
  nunca—, y con la pista libre la verde es para el JAZ 60, que sale antes que él.

Las otras tres, igual: un turbohélice o un reactor en su doble raya, con uno que da otra vuelta tras su frustrada por el viento
en cola, entre los dos huecos —EC-EYY con EC-CIB a 124 s en la 92, EC-HBG, reactor, con EC-DEN a 149 en la 97, EC-FGR con EC-KPA
a 131 en la 138—, de 190 a 216 s parado, y la verde para quien juega antes que él.

**Sin el arreglo 2, en la 55, la 97 y la 138 nadie esperaba delante**: el que salía se alineaba nada más llegar a su doble
raya, con quien juega todavía rodando, y la prueba no encontraba su caso (la 92 sí lo era, y pasaba). Y en la 55 eso costaba una
frustrada: EC-MGE, alineado de los 665 a los 771 sin su salida —la radio con su espera de una llamada cualquiera, y desde los
707, con EC-DDD ya en la base, sin hueco—, y **a los 771 EC-DDD se iba al aire por él**. Es la clase que el arreglo 2 quita en
Los Rodeos, aquí en Tenerife Sur.

### Lo real

¿Se alinearía de verdad EC-MGE con EC-DDD a 125 s? Sí, y saldría. Alineado y autorizado sin esperar, el turbohélice ha pasado
el final de la pista en 85 s, y el que llega no cruza el umbral hasta que el que sale ha pasado el final (OACI, Doc 4444,
7.10.1.2): cabe de sobra. Y con la fila detrás, ninguna torre deja al primero en la pista lo que tarda una llamada cualquiera:
lo alinea y lo saca. La prueba pide lo de verdad —las salidas se autorizan en el orden en que están listas (Doc 4444, 7.9), y a
quien juega no se le da la verde con otro listo delante—, y lo que la rompía era la torre: contaba, para irse el alineado, una
espera de la radio que no iba a tener. **El arreglo estaba mal medido; la prueba no cambia.**

Esa espera ya la quita la radio con quien juega en su doble raya: al primero de la fila le da el «line up and wait» sin la
espera de una llamada cualquiera (`primeroDeLaFila` en `flight/radio.ts`), y al que espera alineado, la salida en cuanto puede
(`alineadoConFila`). Así que la torre puede contar con ello. Sin nadie detrás, la radio sí espera, hasta 75 s, y ahí el hueco
entero es el bueno: es lo de Los Rodeos, donde la avioneta se alineaba con la fila vacía y nadie le metía prisa.

### Decisión

**Entra el arreglo 2, afinado** (`trafico.ts`, en `llegaAntesDeQueSalga`): el «line up and wait» del que no remonta mira a los
del viento en cola con su hueco entero, `ESPERA_MAXIMA` incluida, **menos con quien juega esperando en su doble raya**, que
entonces mira lo que tarda en alinearse, correr su despegue y pasar el final. Lo demás de H107 queda: solo para alinearse, no
para la salida directa —lo de la semilla 38 de Los Rodeos y `seEchariaEncima`—, y no para el que remonta.

Con eso, semilla 55: quien juega llega a su doble raya a los 664,5 y EC-MGE se alinea en ese mismo medio segundo; su salida suena
antes de los 669 y despega a los 720. EC-DDD toca hacia los 789 sin irse al aire, y la verde de quien juega llega a los 855,5, la
misma hora que con el arreglo sin afinar —los dos minutos de estela del turbohélice y el reactor, que aterriza y deja la pista—,
pero detrás de EC-MGE. Las cuatro semillas, lo mismo: sale primero el de delante y nadie se va al aire.

### Lo medido

Las mismas mesas y los mismos criterios de H107, con el código de main (c11dd7fb, que lleva el arreglo 1) antes y el arreglo 2
afinado después. La mesa de main sale igual vuelo a vuelo que la del material de H107 con el arreglo 1 (600 de 600 en Los Rodeos).

**Con radio sale igual vuelo a vuelo que el arreglo 2 sin afinar: 2.820 de 2.820.** En estas mesas no se da el caso de Tenerife
Sur —quien juega esperando detrás de una salida con uno por el viento en cola entre los dos huecos—, así que el después es el de
H107; el antes, aquí, es main con el arreglo 1. Main → afinado (`FRUSTRA` sin poner y `H100=1`):

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Los Rodeos (600) | 61 → 20 | 749 → 787 | 693 → 682 | 36,6 (2) → 39,9 (9) | 66,9 → 63,6 | 0/0/0 | 0/0 |
| Gando (60) | 6 → 3 | 78 | 93 → 90 | 49,0 (24,5) → 55,0 (24,5) | 64,5 → 70,0 | 0/0/0 | 0/0 |
| Tenerife Sur (60) | 3 | 70 | 85 | 47,7 (36) | 67,6 | 0/0/0 | 0/0 |
| Lanzarote (60) | 0 | 65 | 61 | 18,5 (2) | 67,9 | 0/0/0 | 0/0 |
| Fuerteventura (60) | 0 | 71 | 67 | 25,4 (2) | 71,3 | 0/0/0 | 0/0 |
| La Palma (60) | 18 | 73 | 102 | 81,5 (56) | 86,7 | 0/0/0 | 0/0 |
| Cuatro Vientos (60) | 0 | 63 | 69 | 17,3 (2) | 64,6 | 0/0/0 | 0/0 |
| Pettirossi (60) | 7 → 3 | 69 → 74 | 92 → 90 | 39,9 (12) → 43,0 (17,5) | 45,5 → 46,9 | 0/0/0 | 0/0 |
| El Hierro, remontando (300) | 64 | 437 | 561 | 86,3 (94) | 89,3 | 0/0/0 | 0/0 |
| La Gomera, remontando (300) | 6 | 369 | 527 | 73,6 (52) | 97,0 | 0/0/0 | 0/0 |
| Pilar (300) | 2 → 1 | 456 → 457 | 576 → 574 | 39,1 (35,5) | 56,3 → 56,2 | 0/0/0 | 0/0 |
| Pedro Juan (300) | 0 | 426 | 561 → 557 | 25,3 (5) | 69,7 | 0/0/1 | 0/0 |
| Concepción (300) | 13 | 399 | 520 | 61,4 (31) | 73,5 | 0/0/0 | 0/0 |
| Estigarribia (300) | 27 | 405 | 543 → 542 | 44,9 (15,5) | 72,2 | 0/0/1 | 0/0 |
| **todos (2.820)** | **207 → 158** | **3.730 → 3.774** | **4.550 → 4.527** | **48,9 (23) → 49,8 (24,5)** | **73,1 → 72,5** | **0/0/2 → 0/0/2** | **0/0 → 0/0** |

Cumple campo a campo: ninguna toma con la pista ocupada, ningún encuentro a más, ninguna espera por llegada más de un 10 % peor
—Gando, de 64,5 a 70,0, un 8,5 %— y ninguna mediana de la roja más de 10 s peor —Los Rodeos, de 2 a 9; Pettirossi, de 12 a
17,5—. Cambian 55 de los 2.820: 36 en Los Rodeos, 9 en Gando, 4 en Pedro Juan, 3 en Pettirossi, 2 en Pilar y 1 en Estigarribia.

Las frustradas de Los Rodeos, por quién tenía la pista (los 600, con la traza `FRUS=1`):

| quién se va · quién tenía la pista | main | afinado |
|---|---|---|
| avioneta · turbohélice alineado, sin despegar (por la 30) | 15 | 5 |
| reactor · turbohélice alineado, sin despegar (por la 30) | 10 | — |
| turbohélice · turbohélice alineado, sin despegar (por la 12) | 5 | — |
| turbohélice · avioneta alineada, sin despegar (por la 12, del AG1 por la E2) | 11 | — |
| reactor · avioneta alineada, sin despegar (por la 12, del AG1 por la E2) | 5 | — |
| avioneta · avioneta en el aire (por la 30, del AG3) | 5 | 5 |
| turbohélice · avioneta en el aire (por la 30, del AG3) | 5 | 5 |
| turbohélice · turbohélice en el aire (por la 12) | 5 | 5 |
| **total** | **61** | **20** |

Sin radio, los 1.760 de H98 y H100 (`corre-luz.sh`), main → afinado. Aquí el afinado sí cambia algo respecto al arreglo sin
afinar: dos vuelos, la semilla 16 de Cuatro Vientos con los dos largos, que son el caso de Tenerife Sur —EC-GSU, avioneta,
esperaba en su doble raya a EC-PGH, que daba su vuelta de espera, quien juega salía antes por la paciencia de la fila y EC-GSU no
salía nunca—; afinado, EC-GSU se alinea al llegar quien juega, despega a los 121,5 y la roja baja de 182,5 a 67 s.

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Gando (160) | 10 → 4 | 262 → 264 | 277 → 273 | 47,7 (8,5) → 50,8 (8,5) | 63,9 → 68,1 | 0/0/0 | 0/0 |
| Tenerife Sur (160) | 4 | 198 | 226 | 34,5 (2) | 73,4 | 0/1/3 | 0/0 |
| Lanzarote (160) | 20 → 4 | 202 → 216 | 243 | 23,3 (2) → 29,4 (2) | 84,7 → 80,0 | 0/0/0 | 0/0 |
| Fuerteventura (160) | 0 | 216 | 202 | 26,7 (2) | 81,4 | 0/0/0 | 0/0 |
| La Palma (160) | 48 | 232 | 272 | 81,1 (56) | 82,0 | 0/0/0 | 0/0 |
| Cuatro Vientos (160) | 16 → 2 | 220 → 228 | 204 → 202 | 26,4 (5,5) → 28,3 (11) | 93,2 → 88,7 | 0/2/4 → 0/2/2 | 0/0 |
| Pettirossi (160) | 14 → 6 | 208 → 216 | 233 → 229 | 30,9 (2) → 32,4 (2) | 46,0 → 47,8 | 8/0/0 | 0/0 |
| Encarnación (160) | 12 | 206 | 264 | 93,7 (40,5) | 61,9 | 0/0/4 | 0/0 |
| El Hierro (160) | 36 | 204 | 274 | 85,1 (90,5) | 127,6 | 0/0/0 | 0/0 |
| Guaraní (160) | 0 | 210 | 253 | 54,3 (13,5) | 91,0 | 14/1/0 | 0/0 |
| Los Rodeos (160) | 26 → 16 | 206 → 216 | 226 → 224 | 37,3 (9) → 41,6 (15) | 78,0 → 79,1 | 0/0/0 | 0/0 |
| **todos (1.760)** | **186 → 132** | **2.364 → 2.406** | **2.674 → 2.662** | **49,2 (11) → 50,7 (14)** | **81,4 → 81,2** | **22/4/11 → 22/4/9** | **0/0 → 0/0** |

Cumple: frustradas de 186 a 132, ningún encuentro a más (los pares, de 11 a 9), la espera por llegada de 81,4 a 81,2 en todos y
como mucho un 6,6 % peor en un campo —Gando, de 63,9 a 68,1—, y la mediana de la roja como mucho 6 s peor —Los Rodeos, de 9 a 15,
y Cuatro Vientos, de 5,5 a 11—. Cambian 62 de los 1.760.

Encarnación sin radio, los 1.000 de H102: **iguales vuelo a vuelo con main, 1.000 de 1.000**: 46 frustradas, 1.413 tomas, 1.584
salidas, la roja en 90,0 s (54), 68,7 s por llegada y 0/6/22.

**Lo que salía peor sin radio, y sigue**, mirado vuelo a vuelo contra main:

- **Los Rodeos** (mediana de la roja de 9 a 15): cuatro vuelos, la semilla 20 por la 12 con los dos aviones y los dos largos. En
  main EC-GCN, avioneta de la GA 1, se alinea a los 70 y está 105 s en la cabecera sin despegar, y EC-OZZ se va al aire por ella;
  en esos cuatro vuelos hay diez frustradas. Ahora EC-GCN espera en su doble raya a que EC-OZZ aterrice, a los 173,5, entra a los
  237,5 y despega a los 306,5, y la tarde entera se corre. Cuando quien juega llega a su doble raya, a los 563,5, tiene delante a
  EC-VUQ, otra avioneta de la GA 1, que espera desde los 441 a EC-JUU: a esa hora EC-JUU estaba a unos 125 s de tocar, y la
  avioneta necesita 130 para pasar el final de los 3.168 m. EC-JUU toca a los 566,5 y deja la pista hacia los 625; EC-VUQ entra
  entonces y no pasa el final hasta poco antes de los 739, que es cuando quien juega tiene la verde: 175,5 s de roja contra 2, y
  ninguna frustrada.
- **Cuatro Vientos** (mediana de 5,5 a 11): la roja sube en 14 vuelos y baja en 6, y en esos veinte las frustradas pasan de 16 a 2.
  Es siempre lo mismo: en main una salida se alineaba en cuanto llegaba a su doble raya, con uno por el viento en cola, y en la
  pista corta tampoco cabía —EC-BSC, semilla 9, alineado a los 313,5 y 104 s en la cabecera, en un vuelo con una frustrada—. Ahora
  espera fuera a que aterrice el que llega y deje la pista, y quien juega, detrás, espera eso también: en la 9, de 71,5 a 170,5 s.
- **Lanzarote** (media de la roja de 23,3 a 29,4, la mediana igual): doce vuelos, frustradas de 12 a 0 en ellos; lo mismo.
- **Gando** (espera por llegada de 63,9 a 68,1, un 6,6 %): cambian trece vuelos; en los 160, las frustradas van de 10 a 4 y las
  vueltas de espera de 105 a 112. Casi todo es lo mismo —la salida espera fuera y el que llega no se va al aire; la tarde se corre—, **pero en la
  semilla 17 no**: es la espera en círculo de «Lo que queda».

Es lo de verdad: esperar a que pase el que llega en vez de alinearse delante de él y mandarle al aire. Salvo Gando, semilla 17.

### Las pruebas

Con lo que monta el juego —la frecuencia, el tráfico con sus calles y sus tipos, y el turno—, en `--pool=threads` y en
`--pool=forks`:

- **`fila-de-salida.test.ts`, sin tocar.** Con el arreglo 2 sin afinar cae «el que esperaba antes que tú sale antes, y la torre
  sabe tu número»: las cuatro semillas de arriba. Afinado, las tres en verde.
- **`alinearse-con-uno-en-el-viento-en-cola.test.ts` vuelve** tal como estaba en bb5b7219. Vista fallar sin el arreglo: ocho idas
  al aire por una salida alineada que no despega —cinco por avionetas de la GA 1 (las semillas 3, 20, tres veces, y 22) y tres por
  un turbohélice y dos reactores—; con él, las dos en verde.

**Vitest entero, una vez y con el arreglo afinado**, por partes de 2 GB en `--pool=threads`: `src/world` en cuatro, 210 ficheros,
4.573 en verde y 3 saltadas; `src/flight` en tres, 277 ficheros, 5.247 en verde, 29 saltadas y una pendiente; el resto, 127
ficheros y 2.498 en verde. Ninguna roja. Entre ellas, las dos de Encarnación de `ceden-el-turno-sin-radio.test.ts` y
`deja-la-pista-con-otra-rodando.test.ts`.

**Navegador**, con `OGA_GPU=1`, en el puerto 5692 y con el arreglo afinado. `OGA_FILA_DE_SALIDA=1 node
scripts/verificar-vuelo-entero.mjs tenerife-sur guyrami 12 jaz-20`: **62 de 63 comprobaciones y 2 sin medir**; vuelo entero, del
puesto a apagado en el puesto con el señalero a los 1.248 s, la roja más larga de 31 s y la pista de uno por vez. La que falta es
la de la toma: 2,18 m/s, y pide de uno a dos; es el piloto del banco en la recogida, no la torre. En la fila de salida no había
nadie delante en ese vuelo, así que el caso de la prueba no se dio. `node scripts/verificar-vuelo-entero.mjs tenerife-norte
guyrami 3 jaz-20`: **63 de 63 comprobaciones y 2 sin medir**; apagado en el puesto a los 923 s, la roja más larga de 20 s.

### Lo que queda

- **La espera en círculo de Gando, semilla 17** (tres vuelos de los 2.820 con radio y cuatro de los 1.760 sin radio; ya estaba
  con el arreglo sin afinar, en H107, sin verse). EC-LIO, avioneta, llega a su doble raya a los 430,5 con EC-SHC, otra avioneta,
  por el viento en cola a 86 s de la toma: no se la alinea, y está bien —tarda 128 s en pasar el final de los 3.104 m—. Quien
  juega llega a la suya un segundo después, detrás. A los 446 EC-SHC llega a la esquina de la base y da su vuelta de espera para
  dejarte salir —`tuTurnoDeSalir`: «el que llega a la esquina da su vuelta y sales»—; con él en la fila, a 75–119 s del umbral
  según por dónde vaya de su vuelta, EC-LIO sigue sin alinearse, y al cerrarla EC-SHC da otra, porque tú sigues esperando. Nadie
  se mueve hasta que, a los 180 s, `PACIENCIA_EN_LA_FILA` te suelta: sales antes que EC-LIO, que no sale en todo el vuelo. Sin el
  arreglo, EC-LIO se alineaba a los 431, antes de que EC-SHC llegara a la base, y despegaba a los 467,5. Lo de verdad es que la
  vuelta del que llega es para que salga la fila del punto de espera, empezando por el primero: la salida que va delante de ti no
  tendría que esperar al que da su vuelta por tu turno, como ya no lo espera la salida a la que se cede el turno sin radio
  (`sinLosQueEsperan`, H102). Probado así de simple en una copia, sin entrar —la salida que estaba lista antes que tú, contigo
  esperando, no cuenta a los que dan su vuelta, ni para alinearse ni para despegar—, no basta: en Gando quita las verdes con otro
  delante, pero las frustradas suben de 3 a 6 con radio y de 4 a 8 sin radio, todas en la semilla 17. EC-LIO se alinea a los
  446,5 y no despega hasta los 818, con una frustrada en medio y EC-SHC sin aterrizar en todo el vuelo, y quien juega espera
  460 s. Hace falta además que a la salida que se alinea por la vuelta del otro le llegue su despegue antes de que el otro la
  cierre. Contadas en las mesas, las verdes de quien juega con otro
  listo delante que no ha entrado en la pista: con radio, de 9 a 12 (las tres de Gando; las nueve de Concepción, de antes); sin
  radio, de 12 a 16 (las cuatro de Gando; las de Encarnación y Guaraní, de antes); con el arreglo sin afinar eran 12 y 18.
- **Sin nadie detrás, el alineado sigue esperando su vez en la radio**, hasta 75 s, y por eso el «line up and wait» cuenta con
  ella y espera fuera. Una torre de verdad no deja a nadie en la pista con otro por el viento en cola: le daría la salida en cuanto
  pudiera, y entonces bastaría con mirar lo que tarda en irse. No se ha probado.
- Lo de H107 sigue: lo que no mira `seEchariaEncima`, por lo que la salida directa no se retiene por los del viento en cola; el que
  entra a remontar, que no los mira; la clase de H104, las veinte frustradas de Los Rodeos que quedan; y quien juega en la mesa con
  radio, que no obedece la frustrada salvo con `FRUSTRA=orden`.

## Enmienda H107c (27-11-2026): la verde para quien juega con otro listo delante en la fila, y la paciencia de la fila que se gastaba esperando lo mismo

### El caso

En la ronda de la tanda 31 cayó por primera vez, en el árbol c11dd7fb, «y en la fila de salida sale primero el que esperaba
antes», con `OGA_FILA_DE_SALIDA=1 node scripts/verificar-vuelo-entero.mjs la-palma guyrami 12 jaz-20` (el 12 es el reloj, ×12;
con viento de 035 la pista es la 01, y se remonta): el banco saca a rodar a EC-OMK al empezar, quien juega rueda detrás de él
75 s, llega a su doble raya a los 152 y la torre le dice «número dos» a los 159; EC-GMO tiene la pista con «cleared to land» a
los 208; a los 335, 183 s después de llegar, la verde es para quien juega, que remonta y sale, y EC-OMK sigue en su doble raya,
a 137 m de su camino. La roja fue de 182 s de juego, **144 de ellos con voz sonando**.

Y la misma clase —la verde con otro listo delante que todavía no ha entrado en la pista— ya estaba en la mesa con main: sin
radio, 12 de los 1.760 (Encarnación, semillas 9 y 17; Guaraní, 11), y con radio, 9 de los 2.820 (Concepción, 11 y 12). Con
H107b se les suma Gando, semilla 17: 16 y 12.

### ¿Es de la tanda 31?

No. La mesa de H104 con la fila del banco (`FILA=1`: uno de la frecuencia sale a rodar al empezar, con `sacarARodar`, y quien
juega, JAZ 20, llega a su doble raya de 90 a 270 s después; en el banco, a los 152), en La Palma con viento de 035/10:

| árbol | vuelos | con alguien listo delante al llegar | verde con él sin entrar |
|---|---|---|---|
| main, 4c96454d | 400 | 139 | 0 |
| tanda 31, c11dd7fb (main + H106 + H107) | 80 | 25 | 0 |
| tanda 32, dd4865b2 (+ H107b) | 400 | 139 | 0 |

Los tres sacan los mismos vuelos byte a byte: H106 y H107 no cambian nada de La Palma. Lo que cambia es el banco, que **sortea
su frecuencia en cada vuelo**: la misma orden, cuatro veces en una ronda, dio cuatro puestos a rodar distintos (EC-IWP, EC-WCK,
EC-ZOK y EC-LNF). En las rondas que pasaron, al de delante le llegó su «backtrack» unos cuarenta segundos después de que llegaras;
en la que cayó tocó un sorteo con EC-GMO llegando, y a ×12, donde cada segundo de voz son doce de juego (ADR 0014, «Del juego,
la fila: no es la red»).

### Por qué la torre retenía al primero

Caso a caso, con la traza de `todaviaNo` y de `llegaAntesDeQueSalga` cada cinco segundos mientras quien juega espera:

- **Encarnación, semillas 9 y 17 (sin radio).** ZP-JFX entra a remontar a los 358 y despega a los 600,5: 242 s con la pista
  ocupada (en la 17, ZP-IRF, de los 349 a los 589). ZP-SCL espera en su doble raya desde los 361,5 por la pista ocupada en el
  dibujo, y quien juega, que llega a los 379, por lo mismo («dibujo+fila»). A los 559, con la pista todavía ocupada, la paciencia
  de la fila ha contado sus 180 s y saca a ZP-SCL de tu fila; al despegar ZP-JFX, los dos estáis libres a la vez y la verde es
  tuya a los 629,5. ZP-SCL entra a los 677,5, cuando ya has despegado.
- **Concepción, semilla 12 (con radio, por la 16).** Lo mismo: ZP-IHT remonta de los 491 a los 682, ZP-HVH y tú esperáis por él,
  y la verde es tuya a los 700; ZP-HVH entra a los 748.
- **Concepción, semilla 11 (por la 16 y por la 34), y Guaraní, semilla 11 (sin radio).** ZP-GHJ remonta hasta los 253,5 (229,5
  por la 34; en Guaraní, hasta los 307), y después ZP-WCS espera **la estela** de ZP-GHJ: `llegaAntesDeQueSalga` ya no le pone
  nada —ni fila, ni viento en cola, ni tú— y `todaviaNo` sigue diciendo que no hasta dos minutos después de su despegue. A quien
  juega la mesa no le da su estela —con radio no la mira; sin radio le dice «M»—, así que su roja era solo la fila, y la paciencia,
  que había contado el remonte que esperabais los dos, se acaba antes que la estela. En el juego el JAZ 20 es ligero y habría
  esperado la misma estela; lo que no es de verdad es que la paciencia contara los noventa segundos de remonte.
- **Gando, semilla 17 (con radio y sin radio).** La de «Lo que queda» de H107b: EC-SHC da su vuelta de espera por tu turno
  (`tuTurnoDeSalir`), y para EC-LIO sigue en la fila, a 84–115 s del umbral según por dónde va de su vuelta, contra un hueco de
  128 s. Tu roja es solo la fila, la paciencia cuenta, y a los 180 s sales tú.
- **La Palma, el banco.** EC-OMK remonta, y con EC-GMO llegando no cabe —su «cleared to land» es a los 208—: lo mismo te tiene a
  ti en la roja («frecuencia», después «dibujo»), y después, el canal ocupado. La paciencia contó las tres cosas.

**No es la cuenta del remonte que se pasa por arriba** (H104d): en ninguno de estos casos el retenido lo está por su remonte
contado de más. Son dos cosas: la paciencia contaba el rato en que el de delante y tú esperabais lo mismo —la pista ocupada, una
estela, el canal—, y la vuelta de espera que se da por tu turno no le vale al de delante.

**Y la segunda sale mucho más de lo que veían las mesas.** `fila-de-salida.test.ts` no le da a quien juega su salida (`sale`), y
sin ella no hay vuelta por tu turno. Con la prueba de la fila tal cual pero con la salida contada como la cuenta el juego
—`tuSalidaParaLaTorre`: entrar y alinearse, lo que remontes y tu carrera—, en 160 semillas por campo:

| campo, viento, avión | con alguien delante | verde con él sin entrar | roja con alguien delante, mediana, s |
|---|---|---|---|
| Gando, 021/10, JAZ 20 | 96 | 27 → 0 | 210 → 234 |
| Gando, 021/10, JAZ 60 | 96 | 28 → 0 | 182 → 188 |
| Guaraní, 041/10, JAZ 20 | 20 | 6 → 0 | 341,5 → 387 |
| Guaraní, 041/10, JAZ 60 | 22 | 6 → 0 | 236,5 → 311,5 |
| Tenerife Sur, 069/10, JAZ 20 | 62 | 9 → 0 | 216 → 258,5 |
| Tenerife Sur, 069/10, JAZ 60 | 62 | 3 → 0 | 128 → 174 |
| Los Rodeos por la 12, 120/12, JAZ 20 | 79 | 21 → 0 | 190,5 → 229,5 |
| Los Rodeos por la 12, 120/12, JAZ 60 | 79 | 22 → 0 | 145 → 166,5 |
| Los Rodeos por la 30, 300/12, JAZ 20 | 59 | 1 → 0 | 238 |

Concepción por la 16, La Palma, El Hierro y Pilar, con los dos aviones: 0 antes y 0 después, y la misma roja. Casi todos son la
vuelta por tu turno: en Tenerife Sur, semilla 22, EC-BVU da su vuelta a 9.468 m de su camino de los 310 a los 370 con EC-GHW, un
reactor, en su doble raya; en Los Rodeos por la 12, semilla 18, EC-CCD la da de los 160 a los 325 con EC-GXD delante. La roja
de quien juega con alguien delante sube: es la del de delante, que ahora sale primero.

### Decisión

1. **La paciencia de la fila solo cuenta el rato en que lo único que te tiene en la roja es la fila, y con el canal libre**
   (`contarLaFila` en `flight/turno-de-pista.ts`). Es la red del candado entre el dibujo y la frecuencia —si la frecuencia no le
   da su salida al de delante pudiendo dársela—, y no tiene por qué gastarse mientras los dos esperáis por lo mismo: la pista
   ocupada en el dibujo o en la frecuencia, una estela, uno que llega, lo que suelta la pista por sonar. Ni con el canal ocupado,
   que es cuando la frecuencia no le puede decir nada a nadie. La calle única cuenta como fila: en una sola calle, el de delante
   esperando en ella es la fila (`SOLO_LA_FILA`).
2. **La vuelta de espera por tu turno, solo si eres el siguiente** (`tuTurnoDeSalir` en `world/trafico.ts`): con otro listo en su
   doble raya desde antes que tú, no se da. El que llega aterriza, el de delante sale detrás de él y tú detrás del de delante, en
   el orden en que estabais listos (Doc 4444, 7.9).

Lo de H107b —que la salida de delante no cuente a los que dan la vuelta por tu turno— no se ha vuelto a probar ni se ha trazado
por qué subían con ello las frustradas de Gando (de 3 a 6, EC-LIO alineado a los 446,5 y sin despegar hasta los 818). Con el 2
ya no hay vuelta por tu turno con alguien delante, y el de delante no se alinea delante de uno que da una vuelta que no es por él.

### Lo medido

Las mesas y los criterios de H107 y H107b, con el código de dd4865b2 antes (la mesa de entonces, que sale igual vuelo a vuelo que
`t-mio` y `s-mio` de H107b) y los dos arreglos después.

Con radio, los 2.820 (`FRUSTRA` sin poner y `H100=1`). Cambian 12 vuelos, los 12 de la verde con otro delante:

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Los Rodeos (600) | 20 | 787 | 682 | 39,9 (9) | 63,6 | 0/0/0 | 0/0 |
| Gando (60) | 3 | 78 → 77 | 90 → 93 | 55,0 (24,5) → 54,9 (24,5) | 70,0 → 69,5 | 0/0/0 | 0/0 |
| Tenerife Sur (60) | 3 | 70 | 85 | 47,7 (36) | 67,6 | 0/0/0 | 0/0 |
| Lanzarote (60) | 0 | 65 | 61 | 18,5 (2) | 67,9 | 0/0/0 | 0/0 |
| Fuerteventura (60) | 0 | 71 | 67 | 25,4 (2) | 71,3 | 0/0/0 | 0/0 |
| La Palma (60) | 18 | 73 | 102 | 81,5 (56) | 86,7 | 0/0/0 | 0/0 |
| Cuatro Vientos (60) | 0 | 63 | 69 | 17,3 (2) | 64,6 | 0/0/0 | 0/0 |
| Pettirossi (60) | 3 | 74 | 90 | 43,0 (17,5) | 46,9 | 0/0/0 | 0/0 |
| El Hierro, remontando (300) | 64 | 437 | 561 | 86,3 (94) | 89,3 | 0/0/0 | 0/0 |
| La Gomera, remontando (300) | 6 | 369 | 527 | 73,6 (52) | 97,0 | 0/0/0 | 0/0 |
| Pilar (300) | 1 | 457 | 574 | 39,1 (35,5) | 56,2 | 0/0/0 | 0/0 |
| Pedro Juan (300) | 0 | 426 | 557 | 25,3 (5) | 69,7 | 0/0/1 | 0/0 |
| Concepción (300) | 13 | 399 → 401 | 520 | 61,4 (31) → 64,1 (31) | 73,5 → 76,1 | 0/0/0 | 0/0 |
| Estigarribia (300) | 27 | 405 | 542 | 44,9 (15,5) | 72,2 | 0/0/1 | 0/0 |
| **todos (2.820)** | **158** | **3.774 → 3.775** | **4.527 → 4.530** | **49,8 (24,5) → 50,1 (24,5)** | **72,5 → 72,8** | **0/0/2** | **0/0** |

Sin radio, los 1.760 de H98 y H100 (`corre-luz.sh`). Cambian 16, los 16 de la verde con otro delante:

| campo (vuelos) | frustradas | tomas | salidas | roja media, s (mediana) | espera por llegada, s | cerca de ti / en su vuelta / pares | tocar ocupada / sin acabar |
|---|---|---|---|---|---|---|---|
| Gando (160) | 4 | 264 | 273 → 275 | 50,8 (8,5) | 68,1 → 68,6 | 0/0/0 | 0/0 |
| Tenerife Sur (160) | 4 | 198 | 226 | 34,5 (2) | 73,4 | 0/1/3 | 0/0 |
| Lanzarote (160) | 4 | 216 | 243 | 29,4 (2) | 80,0 | 0/0/0 | 0/0 |
| Fuerteventura (160) | 0 | 216 | 202 | 26,7 (2) | 81,4 | 0/0/0 | 0/0 |
| La Palma (160) | 48 | 232 | 272 | 81,1 (56) | 82,0 | 0/0/0 | 0/0 |
| Cuatro Vientos (160) | 2 | 228 | 202 | 28,3 (11) | 88,7 | 0/2/2 | 0/0 |
| Pettirossi (160) | 6 | 216 | 229 | 32,4 (2) | 47,8 | 8/0/0 | 0/0 |
| Encarnación (160) | 12 | 206 → 210 | 264 | 93,7 (40,5) → 107,2 (40,5) | 61,9 → 61,7 | 0/0/4 | 0/0 |
| El Hierro (160) | 36 | 204 | 274 | 85,1 (90,5) | 127,6 | 0/0/0 | 0/0 |
| Guaraní (160) | 0 | 210 | 253 | 54,3 (13,5) → 57,9 (13,5) | 91,0 → 94,7 | 14/1/0 | 0/0 |
| Los Rodeos (160) | 16 | 216 | 224 | 41,6 (15) | 79,1 | 0/0/0 | 0/0 |
| **todos (1.760)** | **132** | **2.406 → 2.410** | **2.662 → 2.664** | **50,7 (14) → 52,3 (14)** | **81,2 → 81,5** | **22/4/9** | **0/0** |

Encarnación sin radio, los 1.000 de H102: cambian 34, los 34 de la verde con otro delante que había ahí (de 34 a 0). Frustradas
46, tomas 1.413, salidas 1.584 → 1.585, la roja de 90,0 (54) a 99,4 (54), 68,7 s por llegada y 0/6/22: iguales salvo la roja
media.

Cumple campo a campo: ninguna toma con la pista ocupada, ningún encuentro a más, las frustradas iguales en todos los campos, la
espera por llegada como mucho un 4,1 % peor en un campo —Guaraní sin radio, de 91,0 a 94,7; Concepción con radio, un 3,5 %— y la
mediana de la roja de quien juega igual en todos. Lo que sube es la roja media donde la verde iba antes que el de delante: en
Encarnación, en la semilla 9, de 250,5 a 520 s —ZP-SCL remonta antes que tú, cuatro minutos—, y en Guaraní,
en la 11, de 182,5 a 326. Es lo que se espera de verdad detrás de uno que remonta.

### Las pruebas

Con lo que monta el juego —la frecuencia, el tráfico con sus calles y sus tipos, y el turno— y quien juega esperando en su doble
raya con su salida contada como la cuenta el juego, **`paciencia-de-la-fila.test.ts`**, nueva:

- **con el canal ocupado la paciencia no se gasta**: en Tenerife Sur, con alguien listo delante y 240 s de roja con el canal
  ocupado, el de delante sigue en tu fila. Vista fallar sin el arreglo: en la semilla 4, a los 180 s EC-IJP ya no estaba;
- **en Gando, Guaraní y Tenerife Sur, con alguien listo delante cuando llegas, la verde espera a que se vaya**, 60 semillas por
  campo con el JAZ 20. Vista fallar sin el arreglo: en Gando, nueve (semillas 16, 20, 22, 29, 35, 38, 44, 46 y 48); en Guaraní, tres
  (11, 37 y 43); en Tenerife Sur, dos (22 y 35).

Las cuatro en verde con los arreglos, en `--pool=threads` y en `--pool=forks`, igual que `fila-de-salida.test.ts` y
`alinearse-con-uno-en-el-viento-en-cola.test.ts`, sin tocar.

**Vitest entero, una vez y con los dos arreglos**, por partes de 2 GB en `--pool=threads`: `src/world` en cuatro, 210 ficheros,
4.573 en verde y 3 saltadas; `src/flight`, la primera y la segunda de tres, 186 ficheros, 3.573 en verde, 27 saltadas y una pendiente. Ninguna roja. **La
tercera parte de `src/flight` y lo de fuera de `src/world` y `src/flight` no se han corrido**: no dio el tiempo.

**Navegador**, con `OGA_GPU=1`, en el puerto 5692 y con los dos arreglos. `OGA_FILA_DE_SALIDA=1 node
scripts/verificar-vuelo-entero.mjs la-palma guyrami 12 jaz-20`: **65 de 65 comprobaciones y 1 sin medir**, y el caso de la prueba
se dio: EC-EKT, puesto a rodar, delante; «número dos» a los 162; EC-TXV cantando final a los 235; una roja de 478 s de juego, **398
de ellos con voz sonando** (126 s a ×1), y EC-EKT salió primero. Con el código de antes la paciencia contaba esos 478 s
enteros; el mismo sorteo no se ha volado con él. Vuelo entero, apagado en el puesto a los 1.292 s. Y `node scripts/verificar-vuelo-entero.mjs gran-canaria
taguato 1 jaz-90`: **63 de 63 comprobaciones y 3 sin medir**, sin nadie delante en la fila y la roja más larga de 40 s.

### Lo que queda

- **La estela de quien juega en la mesa**: con radio no la mira y sin radio le dice «M» a cualquier avión. En Concepción y Guaraní
  el JAZ 20 habría esperado la misma estela que el de delante. Las tablas de aquí no se han medido con ella.
- **La roja detrás del que remonta una pista larga** puede pasar de lo que el banco permite: en Encarnación, 520 s. Es la de
  verdad, y el banco no ha volado ese caso.
- **La cuenta del remonte que se pasa por arriba** (H104d) no aparece en ninguno de estos casos; sigue en la lista.
- **El vitest entero**: falta la tercera parte de `src/flight` y lo de fuera de `src/world` y `src/flight`.
- Lo de H107b sigue: sin nadie detrás, el alineado espera su vez en la radio hasta 75 s; lo que no mira `seEchariaEncima`; el que
  entra a remontar, que no mira a los del viento en cola; la clase de H104; y quien juega en la mesa con radio, que no obedece la
  frustrada salvo con `FRUSTRA=orden`.
