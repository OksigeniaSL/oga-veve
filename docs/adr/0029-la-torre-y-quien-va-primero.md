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
  turbohélice aparcado en su puesto, en la entrada de la plataforma por la que
  se llega a todos los puestos de ese lado.

  Se probaron dos cosas y no se quedaron. Retenerle en su puesto hasta que
  hayas pasado por toda su calle, como ya se hace con los del tráfico que
  aterrizan: despegan las siete, pero tú te quedas parado detrás de él —está en
  tu camino— hasta que tu paciencia te hace pasar por encima, y el rodaje de la
  toma al puesto pasa de 203 a 233 s de media en las cuarenta y ocho llegadas
  (+96 s en doce por la 12). Y darte otro puesto al que se llegue sin pasar
  junto a un avión parado: en esas llegadas no lo hay entre los seis más
  cercanos. Lo que queda por decidir es lo de debajo: **un puesto en el que el
  avión aparcado tapa la entrada de la plataforma** —el turbohélice con su
  centro a dos metros de tu raya— no debería ser un puesto para ese avión, o
  la raya debería ir por otro sitio.
