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
