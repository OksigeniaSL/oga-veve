# 0020 — El modo inicio: el primer vuelo, paso a paso y esperando

Fecha: 2026-10-17
Estado: aceptado · sustituye a la pantalla de teclas como primera experiencia,
cuando la escena tiene voz

## Contexto

La primera vez que alguien jugaba, el juego le abría **la pantalla de las
teclas**: un teclado dibujado con los mandos encima, que se encienden al
apretarlos. Sirve para quien ya sabe para qué es cada cosa. A los cuatro años
es un dibujo que hay que mirar y relacionar con otro dibujo, y luego con el
vuelo; y con el dedo o con un mando de juego, ni eso.

Enrique lo pidió así (punto 232 de su lista): «que haga algo indicando al
niño "ahora para despegar pulsa la flecha de subir", y el juego para y se
mueve cuando lo hace. Como un modo de vuelo súper guiado que le enseñe a mover
el avión y a que pruebe las teclas, mejor que un teclado con instrucciones,
con una voz amable (la instructora no, por favor). Podría ser Jazlyn
enseñando a su hijo». Y después: «también habrá quien juegue con joystick».

## Decisión

### Una escena, paso a paso, con el mundo esperando

Jazlyn, la comandante, le enseña a volar a **Ara**: Ara pregunta y ella
enseña. Nueve pasos y siete gestos, en este orden —`GUION_DEL_INICIO` en
`src/flight/inicio.ts`—:

1. el saludo;
2. **arrancar** el motor: la llave;
3. **dar gas**;
4. la carrera, mirando —sin gesto—;
5. **despegar** en la Vr: la flecha de subir;
6. la subida, mirando, hasta sesenta metros;
7. **virar a la izquierda**;
8. **virar a la derecha**;
9. **enderezar**: alas derechas y vuelo nivelado;

y el final: la felicitación y **el primer sello del cuaderno**.

En cada paso que pide algo, **el mundo se queda quieto** hasta que se hace: no
corre el modelo de vuelo, ni el gas, ni la mano que sostiene; se mira lo que
pide quien juega —la tecla, el dedo o el mando— y en cuanto pide lo que toca,
el mundo se suelta. Quieto no es colgado: la escena sigue hablando y, si pasa
un rato sin que se haga nada o se aprieta otra cosa, **se le vuelve a pedir
con otras palabras**. Nunca un error: las normas se muestran, no se imponen.

**Cada paso sale a la primera con un dedo torpe.** Lo que se pide es el gesto,
no la puntería: un toque de la flecha de subir en la Vr basta y la mano de la
mamá sostiene el morro hasta que el avión se va del suelo; un empujón del gas
basta y ella lo lleva hasta arriba y lo sostiene hasta el final de la escena
—con un mando de consola el gas es el gatillo, y soltarlo para virar dejaría
el avión sin motor—; al enderezar, en cuanto se empieza, ella termina de
llevar la palanca al centro. Es lo que hace una instructora con doble mando el
primer día, y es lo que ya hace la de la final de Guyrami con el gas.

### Ara, ni niño ni niña

Quien aprende se llama **Ara** y no es niño ni niña: su voz es blanca, su
nombre no lo dice, su cara tampoco, y nada de lo que dice o se dice de Ara
lleva género —«¡Volé yo, sin ayuda!», no «yo solito»—. Así quien juega se
pone en su sitio, sea quien sea. Lo vigila una prueba de `inicio.test.ts`.

### Dónde, y con qué

En **el Chaco** —«el escenario fácil: no hay contra qué chocar», dice su
ficha, «para el primer vuelo de alguien que no ha volado nunca»—, con la
avioneta de escuela, en el peldaño de los pequeños, **alineado en la cabecera
y con el motor parado**, y un día sin viento ni nubes, que es el que elige un
instructor para la primera clase. Rodar por las calles es otra lección.

No en la granja, aunque por cariño era la primera candidata: al volver allí,
**Jazlyn sale a buscarte en bici**, y en esta escena va en el asiento de al
lado. La misma persona en dos sitios a la vez no es algo que un niño deje
pasar.

El modo es **su propio vuelo**: no cambia el sitio, el avión ni el peldaño que
tenga guardados quien juega.

### Sin leer, con el mando que se tenga en la mano

La tarjeta del modo dibuja **el mando que se está usando**, con la parte que
hay que tocar latiendo, moviéndose como hay que moverla, y al lado lo que
pasa en el avión —la nariz que sube, el ala que baja—:

- **teclado**: las teclas dibujadas como en la pantalla de teclas, la llave en
  la I y las cuatro flechas juntas, como están, con la buena encendida;
- **dedo**: la palanca o el gas de la pantalla dibujados con un dedo encima, y
  **otro dedo sobre el mando de verdad** de la pantalla haciendo el gesto; la
  llave se toca en el propio dibujo, como la tarjeta de siempre;
- **mando de consola**: la palanca izquierda, el gatillo derecho y el botón de
  empezar;
- **joystick de vuelo** (el HOTAS X, reconocido por `pad.id`): la palanca de
  gases y la de mando, moviéndose las dos.

Lo que manda es **el último mando que se tocó** (`InputManager.ultimoMando`):
una tecla, un dedo, o un mando de juego que se mueve —un botón que se aprieta o
una palanca que se va de donde estaba, no uno enchufado y quieto—. Cambiar de
mando a mitad cambia el dibujo al momento.

Para que el modo se pudiera hacer con un mando de juego hicieron falta dos
cosas fuera de él, en `src/flight/mandos-fisicos.ts`:

- **La llave en el botón de empezar** —el de las tres rayas en uno de consola,
  el ST en el HOTAS X—: con un mando en la mano no había forma de arrancar el
  motor. Solo responde parado en el suelo, como la tecla.
- **El cabeceo del HOTAS X, al derecho**: tirar de la palanca hacia uno es
  morro arriba, como en cualquier avión y como decía la tabla de su cabecera.
  Estaba con el signo del mando de consola y subía empujando. Sigue escrito sin
  el aparato delante.

### La voz

Jazlyn habla con **la voz de la comandante**, pero **sin megafonía**: aquí no
le habla al pasaje, le habla a Ara, en el asiento de al lado. Ara, con **una
voz nueva del pack, `ara`**. Mientras dura la escena **la instructora se
calla**, y también la tarjeta de la señal y el tutor: un suceso, una voz, y
también un dibujo.

Las frases van una detrás de otra, nunca dos a la vez; si quien juega hace lo
que se pedía antes de que acabe de pedirse, lo que quedaba se calla. Y sin
voz, la siguiente espera el rato de leer la anterior en voz alta: el subtítulo
es lo que queda para quien acompañe al niño.

**Y la conversación no la corta nadie.** Enrique lo probó: «las radios de
otros pilotos cortan la conversación». El Chaco no tiene aeródromo, y su
frecuencia sonaba igual —el «buenos días» de otro avión, la torre mandándole
esperar— sin un solo avión a la vista, metiéndose entre la pregunta de Ara y
la respuesta de Jazlyn. Así que en el vuelo del modo inicio **no hay
frecuencia**: es la primera lección de alguien, en un campo del Chaco, y van
solos, como en la granja. Y de red, mientras dura la escena **la boca es
suya** (`reservar` en `audio/boca.ts`): ni la radio, ni la megafonía, ni los
cantos de cabina piden turno, tampoco lo urgente. La máquina no pasa por la
boca, y el JAZ 20 no la lleva.

### La carrera, con tiempo para explicarla

Del gas a la Vr el JAZ 20 tarda 13,75 s en este peldaño y rueda 226 m; lo
que se dice en ese rato —«¡muy bien! Yo te sostengo el gas…», «¡mamá, vamos
rapidísimo!», «todavía no… yo te aviso»— son 11,5 s de grabación con sus
silencios: unos 14,5. La Vr llegaba a mitad de «yo te aviso» y el «¡ahora!»
lo cortaba: «a mamá no le da tiempo de explicar que un avión necesita
velocidad».

Jazlyn lleva el gas, así que hace lo que haría una instructora con doble
mando: **no deja que el avión llegue a la rotación hasta que acaba de
explicarla**. La mano va aflojando el gas al acercarse y deja el avión
rodando un metro por segundo por debajo de la Vr; al acabar la frase, gas a
fondo, y en un segundo y poco la Vr y el «¡ahora!», con el mundo esperando la
flecha (`SOSTIENE_POR_DEBAJO` en `flight/inicio.ts`). Lo que suelta la mano
es que acabe la frase —sin voz, el rato de leerla—, no un reloj. Medido con
las grabaciones: el «¡ahora!» a los 16,1 s del gas, con 288 m rodados, y los
quince metros de altura a los 450, en una pista de 1.400.

Y la pista manda sobre la frase: si quedan 600 m o menos, se despega aunque
no haya acabado de hablar (`PISTA_QUE_SE_GUARDA`). Con una frase colgada, el
«¡ahora!» llega a los 827 m y los quince metros a los 989.

### Cuándo es la primera experiencia

**Solo cuando sus frases están grabadas en el pack, y eso lo decide el pack**,
no una bandera: `main.ts` lee los manifiestos de las dos voces mientras se
elige piloto y pregunta si cada frase de la escena tiene su receta
(`inicioGrabado`). Un modo guiado sin voz, para quien no lee y en un navegador
sin voces del sistema —el Brave de Linux—, no guía a nadie.

Con voz, el primer vuelo de un piloto nuevo es el modo inicio, en lugar del
hangar y de la pantalla de las teclas; la pantalla sigue en su botón para quien
la quiera. Sin voz, todo sigue como estaba, y el modo está en el hangar —la
ficha de Jazlyn, en «¿A qué jugás?»— y en la dirección, con `?inicio=1`.

## Consecuencias

- Hay **una voz más** que bajar, `ara`, y treinta frases más de la
  comandante. Están las cuarenta en el pack, así que el modo ya es la primera
  experiencia; falta oírlas en el juego: `PENDIENTE-VOCES-inicio.md`.
- El modo se prueba con `scripts/verificar-inicio.mjs`: que un piloto nuevo
  entra solo en él, la escena entera con teclado, con dedo y con los dos mandos
  de juego de mentira, y la tarjeta en las pantallas donde se juega. Y, con
  las voces del pack, que la carrera no pasa de Vr mientras se habla de ella,
  que el «¡ahora!» no pisa al «todavía no» y que en toda la escena no habla
  nadie más.
- El HOTAS X sigue sin probarse con el aparato de verdad.

## La segunda escena: aterrizar con Jazlyn

Fecha: 2026-10-17

### Contexto

La primera escena gustó —«Lindísimo», «estoy emocionado escuchando a mamá
enseñando»— y Enrique pidió la segunda: **Ara aprende a aterrizar con
Jazlyn**, con el mismo tono, los mismos personajes y el mismo mecanismo. Con
una condición que cambia el mecanismo por dentro: **en el aire el mundo no
puede pararse como en tierra**. La primera paraba el avión en el aire para
virar; eso es un truco, y un avión que se queda quieto en el aire es justo lo
que no hay que aprender.

### Decisión

**Una final larga, ya en el aire.** La de la lección de aterrizar —a 3,6 km
del umbral, sobre la senda de los aros— en el Chaco, con el JAZ 20, en
Guyrami y sin viento: el mismo vuelo de la primera, pero llegando. Ocho pasos
y cuatro gestos, en el orden en que aterriza una avioneta de escuela
(`GUION_DE_ATERRIZAR` en `src/flight/inicio-aterrizar.ts`):

1. el saludo, y por qué el avión lo lleva ella mientras habla;
2. **un poquito menos de gas**: se entra algo rápido —35 m/s para una
   aproximación de 33— y en la final se vuela a la velocidad de aproximación;
3. **la nariz un poquito abajo**, apuntando a la pista por dentro de los
   aros: desde ahí la nariz es de quien juega;
4. la senda, mirando: a mitad, qué son los aros —para aprender; en un
   aeropuerto ese caminito lo marcan unas luces, el PAPI—, y cerca de la
   pista, lo que va a pasar;
5. **la recogida**: «¡ahora!, levantá la nariz un poquito, suave», a la
   altura de su manual —quince pies en los de hélice, ver
   `flight/recogida.ts`—, con el gas fuera, que lo saca ella;
6. tocar, primero las ruedas de atrás;
7. **frenar**, en el suelo, y parar en la pista;
8. la felicitación y el sello.

**En el aire, la mano de Jazlyn lleva el avión mientras espera el gesto.**
Es su mano y no un truco: lo que hace una instructora con doble mando. Lleva
el avión por la senda de los aros —la del rombo y la del automático, contada
por el eje y en cero pasadas las luces— y por el eje de la pista, con calma:
nunca corrige más de metro y medio por segundo ni inclina más de doce
grados. Pide a la profundidad un ritmo de subida y al alerón una
inclinación, y el modelo de vuelo dice qué palanca da cada cosa
(`enLosMandos`). Y **solo cede lo que se hace bien**:

- pedido el gas, lo lleva ella a la velocidad de la final y de ahí no se
  mueve, ni para arriba ni para abajo;
- pedida la nariz, es de quien juega, dentro de un pasillo alrededor de la
  senda —un cuarto de la altura, de metro y medio a ocho— que se estrecha
  al acercarse al suelo; lo que se sale, no se cede;
- el alabeo no se pide, y no se cede nunca: el avión va por el eje.

**La final manda sobre el gesto**, como la pista mandaba sobre la frase en
la carrera. Si el gas no llega antes de 2.200 m del umbral o la nariz antes de
1.200, lo hace ella y lo cuenta —«esta vez el gas lo bajo yo, mirá la
palanca»—, sin drama: la próxima lo hacés vos. Medido con las frases al ritmo
de leerlas, que es lo más despacio que va la escena: el gas se pide hacia los
3.000 m y quedan dos «otra vez» antes de su sitio; la nariz, hecho el gas por
ella, hacia los 1.700, y queda una.

**La recogida no espera a nadie.** Se pide tres segundos antes de su altura,
cortando lo que se estuviera diciendo —no corta nada: lo de la senda acaba
muy por encima—, y la mano recoge siempre: en cuanto bajar menos que la senda
es lo suyo, pide de lo que baja la senda a casi nada al tocar, y saca el gas
con la altura, al ralentí al tocar, que es lo que dice el manual. La nariz de
quien juega no se suma a nada: hace empezar la recogida un metro más arriba y
acabar más suave. Medido con el JAZ 20 en Guyrami: sola toca a 0,6-0,7 m/s y
con la nariz de quien juega a 0,3, a unos 350 m del umbral de una pista de
1.400, y se para con más de 600 por delante. Si no tiró, lo cuenta ella:
«esta vez la nariz la levanté yo».

**En el suelo sí espera**: el freno, con el mundo quieto, como la Vr de la
primera. Pedido el freno, frena su mano hasta parar. Y si al rodar quedan
menos de 500 m de pista antes de pedirlo, se pide ya (`PISTA_PARA_FRENAR`).

**Ni frustradas, ni vaca, ni percances, ni nadie más hablando.** Mientras
dura la escena el avión lo lleva ella (`manoDeJazlyn` en `game.ts`): no se
engancha la ayuda del gas de la final de Guyrami, ni la nivelada, ni la
ayuda de rodaje; la aproximación no manda ni propone irse al aire, no hay toma
larga ni aves en la final, y la boca es de la escena como en la primera. En
el Chaco tampoco hay vaca: no es aeródromo.

**El sello es el del Chaco**, el que da el cuaderno por aterrizar allí: el
aterrizaje entra en el cuaderno como cualquier otro, con el «primer sello» o
«ya está en tu cuaderno» según toque. Si en esta toma se ganan las gafas de
sol —el primer aterrizaje que cuenta—, se celebran al acabar la escena: con
la boca de la escena, la voz de la instructora se caía.

**Cómo se abre**: con su ficha, «Aterrizá con Jazlyn», al lado de la de
aprender en «¿A qué jugás?», y con `?inicio=2`. **No es la primera
experiencia**: esa sigue siendo el despegue, y `inicioGrabado` solo mira las
frases de la primera escena.

**Las voces, sin grabar.** Son treinta y una —veintidós de Jazlyn, nueve de
Ara— y van a la lista de grabar detrás de las de la primera, para no
renumerar lo grabado: `PENDIENTE-VOCES-inicio-2.md`. Mientras tanto, la escena
guía con los dibujos y los subtítulos, al ritmo de leerlos.

**Y la conversación, compartida.** La cola de frases de la primera escena
salió a `src/flight/conversacion.ts`, y las dos hablan con ella: dos copias de
la misma cola son dos sitios donde un día se corta a alguien.

### Lo que destapó

**En el Chaco y en el Valle, aterrizar era «fuera de pista».** La lista de
pistas del vuelo solo metía la de casa si el campo tenía aeródromo extraído,
y esos dos —los campos para empezar— no lo tienen: posarse en el medio de la
pista del Chaco a treinta centímetros por segundo salía percance. Nadie había
aterrizado allí. Ahora la de casa va siempre (`pistasDelVuelo` en `game.ts`).

### Consecuencias

- Treinta y una frases más por grabar, y un gesto nuevo del modo inicio en
  cada mando: menos gas, la nariz abajo y el freno, con su dibujo para el
  teclado, el dedo —que señala también el botón rojo del freno—, el mando de
  consola —el gatillo del gas apenas apretado— y el HOTAS X.
- La secuencia se prueba en `inicio-aterrizar.test.ts`, que vuela la final
  entera con el modelo de Guyrami y tres pilotos —quien hace lo que se le
  pide, quien no hace nada y quien aprieta de todo— y mira que se toque
  dentro de la pista, despacio, por el eje, y que se pare en ella.
- Y en el navegador, `scripts/verificar-inicio-2.mjs`: la escena entera con
  teclado, dedo, mando de consola y HOTAS X, que en el aire el mundo no se
  para ni un fotograma, que la mano lo lleva, el error con otras palabras, la
  toma, el cuaderno sin percance ni frustrada, que no habla nadie más, el sello
  y la ficha del hangar.
- La escena dura unos dos minutos y medio. Entre la nariz y la pista hay dos
  ratos callados de unos veinticinco segundos, volando los aros: si con las
  voces se hacen largos, lo que se mueve es `DESDE_LOS_AROS` y `DESDE_LA_SENDA`.
