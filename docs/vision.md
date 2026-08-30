# Óga Veve — la tesis y el plan

Documento de partida, escrito el 2026-08-31 tras una ronda de catorce auditorías
paralelas sobre pedagogía infantil, jugabilidad, sonido, sensación de vuelo,
arquitectura, paisaje paraguayo, paisaje del mundo, meteorología, física,
navegación, interfaz y dirección de arte.

No es un resumen de aquellos informes: es lo que hemos decidido hacer con ellos.
Los documentos completos están enlazados al final.

---

## 1. La tesis

Hay tres o cuatro ideas que aparecieron por separado en informes que no se
hablaban entre sí. Cuando eso pasa, conviene hacer caso. Se combinan en una sola
frase:

> **El avión del pueblo: aviación de servicio en un Paraguay que se nombra a sí
> mismo en guaraní, jugado por un adulto y una niña en la misma tablet, dibujado
> como una tela tejida a mano.**

Cuatro decisiones dentro de esa frase, y ninguna la tiene nadie más:

**Se vuela para servir, no para lucirse.** Correo, vacunas, la pieza del tractor,
la maestra que va al pueblo, la chipa que todavía humea. Ningún simulador va de
ser útil; todos van de ser hábil. Y cada encargo obliga a aprender geografía
paraguaya de verdad, sin que parezca una lección.

**El mundo se nombra solo.** Sobrevuelas el río y una voz dice *ysyry*; pasas
junto al lapacho y ganas *tajy* para tu álbum. Coleccionar palabras por voz
funciona perfectamente con quien no sabe leer, y convierte el guaraní en mecánica
central en vez de en una casilla de traducción. Sería el primer juego del mundo
que hace eso, y solo puede hacerlo alguien de aquí.

**Se juega de dos en dos.** Una tablet, dos personas: una pilota y la otra navega,
fotografía o lleva los gases. Diseñado explícitamente para una niña de cinco años
en el regazo de un adulto. Resuelve además el problema difícil —que el tramo
infantil no aburra al adulto— porque el adulto no juega al juego de la niña:
juega a ser instructor, que es el juego más profundo que existe.

**El mundo es una tela.** El terreno ya se pinta por bandas de color, sin una
sola fotografía. Eso no es una carencia que disimular: es la dirección de arte.
Paraguay es el país del ñandutí y del ao po'i, y visto desde el aire es un país
tejido. Los ríos son cintas, los cultivos parches, la estela una puntada. Todo lo
radial de la interfaz —brújula, medallas, carga— es ñandutí. Sale gratis en
triángulos y no lo tiene ningún otro juego.

---

## 2. Cuatro tramos, un solo avión

Arcade y Piloto no bastan: Arcade con cuatro años no es Arcade con siete. Cuatro
tramos, elegidos con retratos de aves y sin que aparezca nunca una edad en
pantalla. Nadie elige «el modo de bebés»: elige el colibrí.

| | Mainumby (4-6) | Tukã (7-9) | Taguato (10-13) | Taguato Ruvicha (14+) |
|---|---|---|---|---|
| Pantalla | nada: solo paisaje | dos instrumentos pictóricos | HUD numérico completo | seis instrumentos analógicos |
| Mandos | solo el morro | + motor en tres pasos | + gases continuos, flaps | todo, incluido compensador |
| Ayudas | envolvente protegida | pérdida protegida | aviso de pérdida | ninguna |
| Fracaso | no existe | gag y reaparición en 2 s | fin de vuelo con traza | consecuencia real |
| Sesión | 5-8 min | 10-15 min | 15-25 min | 20-40 min |

Lo que cambia entre tramos **no es el mundo ni el avión**: es cuánta física se le
confía al jugador. El mismo Paraguay, la misma pista, el mismo modelo de
coeficientes debajo. Y bajar de tramo no tiene ceremonia —«hoy vuelo tranquilo»
es legítimo a los cuarenta—; subir sí la tiene.

**Consecuencia arquitectónica:** las ayudas dejan de ser un coeficiente `assist`
y pasan a ser capas activables por separado (protección de envolvente, gases
automáticos, autocoordinación, límites de actitud). Los tramos son preajustes de
esas capas.

---

## 3. El metajuego: la libreta de vuelo

Ni puntos, ni estrellas, ni monedas. La aviación ya tiene la moneda perfecta:
**horas de vuelo**. Se ganan por volar, no se pueden suspender, y son lo que
atesora un piloto de verdad.

El contenedor es una **libreta que se escribe sola**: al apagar el motor aparece
una línea con el dibujo de la ruta, la duración y los aterrizajes. Quien no sabe
leer la lee igual, porque cada entrada es un dibujo y cada logro es un **sello**
estampado en tinta. Cuando la libreta demuestra que ya sabes algo, la **licencia**
llega sola: Alumno → Primer Solo → Piloto Privado → Comandante.

**Las gafas de sol no se compran ni se eligen en un menú. Se ganan con el Primer
Solo.** Esa es la promesa fundacional del proyecto y tiene que cumplirse dentro
del juego.

La celebración ocurre **al apagar el motor, nunca en vuelo**: no queremos enseñar
que volar es el trámite entre premios. Y hay una lista explícita de lo que no
haremos por tratarse de niños: nada de azar en las recompensas, nada de rachas
diarias que castiguen faltar un día, nada de temporizadores, nada de comparar a
un niño con otro.

**Sin cuentas.** El perfil no es un avatar: es tu avión, que pintas y al que
pones un símbolo animal. Doce huecos en el hangar de una tablet de aula. Para
llevártelo a casa, un carné imprimible con QR que contiene la libreta entera.
Cero servidor, cero nombre, cero correo.

---

## 4. Lo que se enseña, por capas

Regla transversal: **nada se lee que pueda volarse**, y ninguna visualización
dibuja nada que el motor no haya calculado de verdad. Una flecha bonita que no es
la fuerza real sería un fraude, y esto se va a usar en escuelas.

**Física del vuelo.** De «el aire empuja» a la envolvente V-n, en cinco peldaños.
Con una corrección importante desde el primer día: la explicación popular de
Bernoulli —los tiempos de tránsito iguales, el camino más largo por arriba— **es
falsa**, y no la vamos a enseñar aunque salga en mil libros. Herramientas: gafas
de físico con vectores leídos del estado real, hilos de corriente con downwash,
cuña de ángulo de ataque, y un **laboratorio** con deslizadores de masa,
superficie, densidad y gravedad, con preajustes de Luna, Marte y Titán.

**Meteorología.** De «las nubes esponjosas son sitios donde el aire sube» al
cálculo de la base del cúmulo. La pieza técnica que lo desbloquea todo es un
**campo de viento** `W(x,y,z,t)` restado en el cálculo de velocidad aerodinámica
—hueco que el modelo ya dejó preparado—: viento base, térmicas gaussianas
ancladas al terreno, ladera, turbulencia por ruido, y la tormenta de verano
paraguaya con su ciclo completo de tarde.

**Navegación y geografía.** De «sigue el río» —jugable a los cinco años, sin
instrumentos ni texto— al VOR, pasando por el rumbo, la deriva por viento y la
estima. Cada instrumento aparece **cuando el ojo ya no basta**, que es exactamente
por qué se inventó: cae la noche, entra la bruma, y entonces aparece la aguja. La
carta aeronáutica se construye por capas y nunca muestra un símbolo que no se
haya necesitado volando.

**Astronomía.** El cielo austral de verdad: la Cruz del Sur, las Nubes de
Magallanes, el centro galáctico casi en el cénit en julio. Y una lección que el
material del hemisferio norte omite: aquí el sol culmina al norte.

---

## 5. El mundo

**Paraguay primero, y se empieza en casa.** El primer escenario es Coronel
Oviedo, con la propia granja: terreno llano, sin fallo posible y el perro
esperando. Después Ypacaraí, Asunción, Encarnación y las misiones, Itaipú y el
Monday, el Ybytyruzú, Cerro Corá, Ñeembucú, el Chaco central y, como graduación,
el Pantanal.

**Reconocer sin ortofoto.** Cuatro capas por orden de coste: los cauces reales
excavados desde vectores, los caminos pintados en el shader, entre tres y cinco
hitos modelados a mano por escenario, y vegetación característica. Con eso un
paraguayo reconoce su ciudad en tres segundos.

**Y después el mundo**, y lo que no existe: dunas, fiordo glaciar, acantilados,
archipiélago, cordillera nevada, cañón estratificado, volcán, islas del cielo.
Con una regla que no se rompe: **lo imaginario cambia el mundo, nunca las leyes**.
En la Luna de Veve la gravedad baja a 0,3 g pero el aire sigue siendo aire. Esa
línea separa el asombro de la mentira.

**Rigor.** Cerro Corá es un memorial y se sobrevuela, no se puntúa. Bajo el lago
de Itaipú están los Saltos del Guairá y la ficha lo dirá. Y no se georreferencian
comunidades indígenas sin consentimiento libre, previo e informado.

---

## 6. Cómo suena y cómo se siente

**El arpa paraguaya es el instrumento de la interfaz**, no solo de la música.
Cinco notas muestreadas dan todo el idioma de acierto, error, atención y logro,
con una gramática fija: subir es bien, bajar es corregir. La música es
acontecimiento, no fondo: una guarania y una polca encargadas a un arpista
paraguayo, con cesión por escrito, que suenan al conseguir algo y callan en
misión.

**El motor enseña física antes de que nadie la explique**: el tono sube con el
gas y, en la pérdida, el viento late a 10 Hz antes de que el HUD diga nada.

**Y el audio nunca es el único canal de nada.** Habrá veinte tablets en un aula,
la mitad en silencio. Criterio de aceptación: el juego entero, en mute, jugado
por alguien que no lee, sin perder información.

**Sensación de velocidad.** No se ve: se infiere del paralaje cercano. Postes y
matas junto a la pista, vibración de cámara ligada a la rugosidad, y el detalle
que lo vende todo: **al despegar, la vibración se corta en 200 ms**. Ese silencio
es el despegue.

---

## 7. La arquitectura que hace falta

`Game` es hoy un buen ensamblador de 318 líneas, pero no aguanta lo que viene.
Tres costuras, por orden:

1. **Bus de eventos tipado.** Hechos consumados, no órdenes: `touchdown`,
   `crashed`, `stalled`. Misiones, logros y audio se suscriben sin que `Game` los
   conozca. Es la costura de mayor rendimiento por línea invertida.
2. **Máquina de estados de partida.** Ya existe una embrionaria y vergonzante:
   un `crashedFor` con un `if` en el bucle.
3. **Separar contenido de motor.** `content/` con escenarios, aeronaves, misiones
   y fichas educativas como **datos**. Es además la frontera de negocio del ADR
   0004: el código es Apache-2.0 y el contenido es propietario.

Lo que **no** vamos a hacer: ni ECS ni contenedor de estado inmutable. Hay un
avión y un terreno; sería moda pagada en legibilidad, que es el activo del repo.

**El riesgo real de rendimiento no son los 295 000 triángulos** —eso una tablet
lo traga— sino generar el terreno en el hilo principal y el sobredibujado de
capas transparentes. Y lo más urgente y barato: un medidor de fps en el propio
juego, para poder cumplir de verdad la regla de medir antes de añadir.

---

## 8. El plan

**0.2 — Que se pueda jugar.** Audio del motor y el viento, iconos en vez de
palabras, arreglos de accesibilidad y táctil, sensación de velocidad al despegar,
primeras misiones y las gafas de sol.

**0.3 — Que enseñe.** Tramos de edad, libreta de vuelo con sellos, campo de
viento y térmicas, «sigue el río», copiloto instructor.

**0.4 — Que sea de Paraguay.** Terreno real desde NASADEM, Coronel Oviedo con la
granja, toponimia con voz en guaraní, aeródromos desde OurAirports.

**0.5 — Que sea bonito.** Dirección Mundo Tejido: flota modelada, vegetación con
silueta, kit ñandutí de interfaz, nieve y agua por profundidad.

**Después:** física visualizada, planetario integrado, escenarios del mundo,
multimonitor, joystick, y volar acompañados.

---

## 9. Informes completos

| Tema | Documento |
|---|---|
| Niveles por edad | https://claude.ai/code/artifact/5947108b-c11f-4eff-996b-3fbabe21f979 |
| Jugabilidad y referencias | https://claude.ai/code/artifact/d7a874b9-b217-47f7-97ea-9b6196e7099e |
| Progresión y recompensas | https://claude.ai/code/artifact/d32d414a-6a89-4be2-a497-3cd8be6d6473 |
| Diseño sonoro | https://claude.ai/code/artifact/3396cd40-bf34-4064-9b3d-09ee4f3b490e |
| Física y astronomía | https://claude.ai/code/artifact/e4cfde90-0a12-43c9-9bae-fcda858a0a59 |
| Meteorología y cielo | https://claude.ai/code/artifact/e6f00713-ed9b-4b90-b20f-800edbeb550f |
| Paisajes del mundo | https://claude.ai/code/artifact/479ad253-de9b-4c18-9bcc-7730e5288ffe |
| Dirección de arte | https://claude.ai/code/artifact/7c13ae56-e259-4a65-ab7a-38cc88b3dc16 |

Lenguaje sin letras, atlas paraguayo, navegación, interfaz y auditoría de
arquitectura están recogidos en los issues correspondientes.
