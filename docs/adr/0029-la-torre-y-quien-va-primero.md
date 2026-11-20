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
