# Aeródromos

Geometría de aeródromos para Óga Veve, extraída con
`scripts/osm-a-aerodromo.mjs`.

## Atribución

> Geometría de aeródromos derivada de **OpenStreetMap**, © colaboradores de
> OpenStreetMap, bajo **Open Database License 1.0**
> (opendatacommons.org/licenses/odbl/). Elevaciones de umbral, anchuras,
> rumbos e iluminación de **OurAirports** (dominio público).

Ese texto va también en la pantalla de créditos del juego, no solo aquí.

## Por qué este directorio tiene su propia licencia

Estos ficheros son una **base de datos derivada** de OpenStreetMap, así que
heredan la ODbL. El resto del proyecto no: el código va bajo Apache-2.0 y el
contenido propio es de Oksigenia SL.

La separación se sostiene porque **aquí dentro solo hay datos** —números y
nombres—, nunca arte ni código. El propio extractor vive en `scripts/` y es
Apache-2.0: un programa que lee una base de datos no es una obra derivada de
ella.

Y como el repositorio es público, la obligación de compartir las mejoras de
la base de datos queda cumplida por el hecho de publicarlas.

## Cómo se regenera

```
node scripts/osm-a-aerodromo.mjs SGAS GCXO
```

Hace falta conexión. Tarda un par de minutos: la mayor parte es descargar los
CSV de OurAirports, que son grandes.

## Lo que hay que retocar a mano

El extractor **no inventa nada**. Lo que no está en ninguna de las dos
fuentes sale como `null`:

- **Marcas pintadas** (`markings`). No existen en OSM. Se decide la categoría
  —precisión, no precisión, visual— y se dibujan procedimentalmente.
- **PAPI y luces de aproximación** (`papi`, `approachLights`). En OSM hay
  nodos `aeroway=navigationaid`, que son ayudas **visuales**, pero sin decir
  cuál es cuál. Salen en `visualAids` como posiciones y ya está.
- **Altura de los edificios**, salvo que alguien la haya mapeado.

Para retocar algo sin perderlo, se le añade `"manual": true` al objeto:

```json
"papi": { "manual": true, "side": "left", "glideDeg": 3.0 }
```

El extractor conserva intacto cualquier objeto con esa marca. Sin eso, un
ajuste duraría hasta la siguiente extracción y nadie volvería a ejecutar el
extractor.

## Verificación

Los AIP oficiales de DINAC (Paraguay) y ENAIRE (España) se descargan gratis
pero **no tienen licencia abierta**. Se usan solo para **comprobar que
nuestros datos dicen la verdad** —un umbral desplazado es un hecho, no una
obra— y nunca para redistribuir nada suyo.

## Lo que hay ahora

| | Pista | Ancho | Pendiente | Elevación |
|---|---|---|---|---|
| **SGAS** · Silvio Pettirossi | 02/20, 3359 m | 45 m | 0,39 % | 89 m |
| **GCXO** · Tenerife Norte | 12/30, 3168 m | 45 m | 0,53 % | 633 m |

Esa pendiente de SGAS son trece metros de caída, y se notan al aterrizar. Y
esos 633 metros de GCXO son la razón de que allí se aterrice tan a menudo sin
ver la pista hasta el último momento: el aeropuerto está **a la altura del
mar de nubes**, no debajo.

---

# Añadir un aeródromo nuevo

Silvio Pettirossi costó una tarde entera y seis fallos del mismo tipo. Esto es
lo que se aprendió, en orden, para que el siguiente cueste una hora.

## 1. Extraer

```
node scripts/osm-a-aerodromo.mjs GCXO
```

Y **mirar la salida antes de seguir**: cuántas rodaduras, cuántas plataformas,
cuántas mangas, cuántos puntos de espera. Si sale con cero pistas, el
aeródromo no está mapeado como relación con su código OACI y hay que ir a
mirar OpenStreetMap a mano.

## 2. Comprobar los datos, no confiar

```
node scripts/mapa-aerodromo.mjs <escenario>
```

Dibuja el aeródromo desde arriba con el pavimento, los umbrales, el centro y
el punto de arranque, y **da las distancias en metros**. Esta herramienta
existe porque cuatro intentos de deducir un fallo desde capturas de la cabina
no bastaron y desde arriba se vio en dos minutos.

Lo que hay que ver en verde: el arranque dentro del asfalto, y el rumbo del
eje medido coincidiendo con el del escenario.

## 3. Los tres números de una pista, que son tres y distintos

Esto es lo que más confusión causó, y conviene tenerlo claro antes de empezar:

| | Qué es | De dónde sale |
|---|---|---|
| **Rumbo geométrico** | Por dónde corre el asfalto de verdad | Se **mide** entre los dos umbrales |
| **Rumbo magnético** | El geométrico más la declinación | Se deduce del designador |
| **Designador** | El número **pintado** | Viene del fichero, tal cual |

En Silvio Pettirossi son 192,45°, 202° y «20». Usar el que no toca:

- **Volar con el publicado** en vez del medido: dos grados y medio de error, y
  el avión se sale de la pista en setecientos metros de carrera.
- **Calcular el designador del rumbo verdadero**: pinta un 01 donde va un 02.

## 4. El fallo que va a volver: dos marcos parecidos

Seis veces en una tarde. Cada vez con otra cara y siempre lo mismo:

- **La Y del fichero apunta al norte; en el mundo el norte es la Z negativa.**
  Si algo sale espejado de norte a sur, es esto.
- **Delante de un rumbo es `(sen h, −cos h)`, no `(sen h, cos h)`.** Con 0° y
  90° las dos aciertan, así que no se nota hasta que hay un aeródromo real.
  Está en `src/world/rumbo.ts` — **usarlo, no rehacer la cuenta**.
- **La recta que une los umbrales NO es el eje del pavimento.** Una viene de
  OurAirports y la otra de OpenStreetMap, se diferencian en metros, y
  cualquier cosa que vaya cerca del filo acaba en la hierba. Todo lo que se
  sitúe sobre la pista pasa por `sobreElEje()`.
- **Y el eje puede venir recorrido en cualquiera de los dos sentidos.** Hay que
  mirar por cuál umbral empieza antes de medir distancias desde él.

## 5. Colocar el avión

- El arranque va **en el umbral del fichero**, no en una cuenta desde el
  centro. La de retroceder media pista funciona con pistas sintéticas y falla
  con rumbos cualesquiera.
- La cota se **mide del terreno aplanado**, no se toma del aeródromo: una
  pista con pendiente no está a la cota del aeropuerto en ningún punto salvo
  por casualidad. Si el avión aparece en el aire y se cae, es esto.

## 6. Lo que hay que revisar mirando

Por orden de lo que costó descubrir:

1. ¿Se ve el pavimento? Si no, mira el sentido de giro de los triángulos y si
   el terreno está aplanado **un poco por debajo** (`RESALTE`).
2. ¿Está el avión sobre el asfalto al empezar?
3. ¿Se mantiene en la pista durante la carrera, sin tocar nada?
4. ¿Las líneas de borde están sobre el asfalto y no en la hierba?
5. ¿La pintura está centrada respecto al asfalto?
6. ¿El designador se lee del derecho **desde la aproximación**? Desde la pista
   mirando hacia fuera se ve invertido, y eso es correcto.
7. ¿Las luces están al borde y con sus colores? Blancas, ámbar los últimos 600
   metros, verdes en la cabecera de llegada y rojas en la de salida.
8. ¿Hay árboles en la pista? Si los hay, el rectángulo de la franja está
   girado noventa grados.
9. ¿El amarillo de las rodaduras se corta al llegar a la pista?
10. ¿Las letras de las calles se leen del derecho rodando **hacia la pista**?
11. ¿Se puede aterrizar y el juego lo dice?
12. ¿Se puede rodar del puesto a la doble raya siguiendo la raya verde?

El punto 12 tiene su propia comprobación, y rueda de verdad:

```
node scripts/verificar-vuelo.mjs              # tres minutos
node scripts/verificar-vuelo.mjs --circuito   # veinte
```

Un piloto automático que rueda del puesto a la doble raya siguiendo la raya
verde, para, espera la luz, entra en pista, se alinea y despega. Un vuelo
probado solo con pruebas unitarias no está probado: esto encontró cinco fallos
que ninguna prueba unitaria puede ver, porque ahí las situaciones se le dan a
la máquina ya masticadas.

Por defecto para al despegar, que es lo que sale siempre. `--circuito` vuela
además la vuelta entera hasta apagar el motor, pero **el piloto todavía se cae
en los virajes** (issue abierto): una comprobación que falla por culpa del
comprobador se acaba ignorando, y una ignorada es peor que ninguna.

Los puntos 4, 5 y 10 ya no hace falta juzgarlos a ojo:

```
node scripts/verificar-aerodromo.mjs
```

Construye cada aeródromo en un navegador de verdad, cuenta las llamadas de
dibujo —incluidas las mallas con textura, que el test de presupuesto no ve
porque corre en Node y allí no hay `canvas`—, **mide** la separación de la
pintura respecto al eje de la pista, y deja dos imágenes: el aeródromo entero
desde arriba y un acercamiento a un rótulo.

Y para el escenario que lo rodea:

```
node scripts/verificar-escenario.mjs tenerife-norte
node scripts/buscar-semilla.mjs tenerife-norte
```

El primero mira el escenario entero desde dieciocho kilómetros y cuenta: cota
medida de la pista, terreno alrededor, **qué porcentaje está bajo el agua** y a
qué distancia queda la costa. Encontró a la primera que el escenario de
Asunción llevaba desde siempre con **el treinta y ocho por ciento sumergido**,
cosa que desde la cabina no se ve nunca. El segundo elige la semilla del
relieve midiendo, en vez de probando: la buena es la que deja el terreno de
alrededor a la cota del aeródromo, para que la meseta sea meseta y no un
pedestal.

## 6 bis. El terreno que lo rodea

Tres cosas aprendidas montando Tenerife Norte, que está a 632 m y no a 89 como
Asunción:

- **El aplanado sigue a la pista, no al punto de referencia.** En redondo salía
  un disco liso de cuatro kilómetros que desde el aire cantaba. Un aeropuerto
  es una terraza alargada. El ancho de la banda sale de los datos: lo más
  apartado del eje que hay que sostener —394 m en Tenerife, 850 en Asunción,
  que tiene una plataforma muy separada—.
- **La mezcla se estira con el desnivel.** Si el ruido dejó el llano a 200 m y
  el aeródromo está a 630, cuatrocientos metros de transición son un
  acantilado. Va a razón de ocho a uno, con tope.
- **Una isla no sale de tocar números.** Se probaron 1.440 combinaciones de
  semilla y parámetros buscando un Tenerife con mar y **ninguna lo tenía**: el
  ruido fractal hace cordilleras que siguen y siguen. Hay que decir dónde acaba
  la tierra, y para eso está `island` en el escenario.

## 6 ter. El grafo de rodaje, y por qué se rompe

Para que un vuelo empiece en la plataforma hay que saber por dónde se va de un
sitio a otro. OSM da las calles como polilíneas sueltas —cincuenta y cuatro en
Silvio Pettirossi— sin decir en ningún sitio cuál empalma con cuál.

**Los empalmes de un aeropuerto son en T, no punta con punta.** Esto no se
dedujo, se midió, y es el dato más útil de toda esta sección:

| En Tenerife Norte, de 70 puntas de calle… | |
| --- | --- |
| caen cerca de la **punta** de otra | 30 |
| caen sobre el **costado** de otra | **60** |

Una calle de rodaje termina en medio de otra, que es como se construyen los
aeropuertos. Soldando solo punta con punta, el grafo salía en **diecinueve
trozos incomunicados** y el mayor tenía siete nudos de cuarenta y cinco: no
existía ninguna ruta. Con el nodado en T —cada punta que cae sobre el costado
de otra calle se mete como vértice suyo— los dos aeropuertos pasan a ser una
sola pieza, el 100 % conectado.

Lo demás que hace falta saber:

- **Soldar por cercanía, no por identidad.** Doce metros. Un empalme dibujado
  con medio metro de diferencia parte el aeropuerto en dos.
- **La ruta empieza en las ruedas**, no en el nudo más cercano. Un puesto de
  estacionamiento puede estar a cien metros de la calle más próxima.
- **Un aeródromo sin `parking_position` no da para un vuelo completo.** Se
  comprueba antes de nada: sin puestos no hay de dónde salir.

## 6 quater. Volar un circuito con un piloto automático

Hace falta uno para comprobar el vuelo completo, y las cuatro cosas que costó
sirven para cualquier otro que se escriba:

- **Actitud, no velocidad.** El primer mando era «si vas a más de treinta y dos,
  tira del morro». La velocidad oscilaba justo en ese umbral, el elevador
  castañeteaba y el avión entraba en **fugoide**: alpha paseando entre 4° y 11°,
  factor de carga entre 0,57 y 1,29, subiendo a tirones. Con control de actitud
  —elegir ocho grados de morro arriba y mantenerlos, amortiguando con la
  velocidad de cabeceo— sale clavado: alpha 3,5°, carga 1,00, sin oscilar.
- **En tierra se dirige con el alabeo**, no con el timón: la rueda de morro va
  en ese eje. Poner el timón y el alabeo a cero hace que el avión salga
  perfectamente recto del puesto y siga recto para siempre.
- **Los mandos se llaman `aileron`, `elevator`, `rudder`.** Escribir en `roll`,
  `pitch` o `yaw` no da error: crea propiedades que nadie lee.
- **Frenar del todo al llegar.** La torre solo mira a quien está parado, que es
  justamente la lección; un piloto que se acerca despacio pero no se detiene
  nunca recibe el permiso.

## 7. La pintura no se descarga: se genera

**OpenStreetMap no mapea las marcas pintadas.** Existe un tag `aeroway=marking`
pero tiene ochocientos usos en todo el planeta y ni siquiera esquema aprobado:
no se puede construir sobre eso.

Lo que sí trae OSM es la **geometría más el `ref`**, y con eso basta, porque
las marcas aeronáuticas tienen medidas fijas (Anexo 14 de OACI): el eje amarillo
de rodaje mide 15 cm, las teclas de piano 1,8 m de ancho, la barra doble del
punto de espera va cruzando la calle. De ahí sale todo:

| Se pinta | De qué dato sale |
| --- | --- |
| Designador de pista («02») | `ref` de la pista |
| Letra de calle («A») | `ref` de la calle |
| Punto de espera | nodo `aeroway=holding_position` |
| Eje amarillo | la propia polilínea de la calle |

Dos trampas del `ref` de las calles:

- **El sentido de una calle en OSM es arbitrario.** El de una pista no —va de
  un umbral al otro—, pero una calle se dibujó en el sentido que le vino bien a
  quien la mapeó, así que la mitad de las letras salen boca abajo. Se orientan
  **hacia la cabecera más cercana**, que es adonde va quien rueda.
- **Un `ref` se repite en muchos tramos.** Rotularlos todos llena de letras el
  cruce donde se juntan tres calles: solo se rotulan los tramos largos.

Y una nota de coste: cada rótulo necesita su textura, y trece texturas son
trece llamadas de dibujo, más que todo el resto del aeródromo junto. Las letras
van en **un solo atlas** y cada cuadrado se queda con su celda a base de UVs.
Trece rótulos, una llamada.

## 8. Lo que no está en ninguna fuente y hay que decidir

El extractor deja `null` y **no inventa**: categoría de marcas, PAPI, luces de
aproximación, altura de edificios. Se rellenan a mano con `"manual": true`,
que el extractor respeta.
