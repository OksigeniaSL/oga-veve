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
