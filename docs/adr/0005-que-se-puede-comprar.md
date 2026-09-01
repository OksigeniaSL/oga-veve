# ADR 0005 — Qué se puede licenciar, y qué no compensa

**Fecha**: 2026-09-01 · **Estado**: aceptada

## Contexto

Después de una semana peleando con el modelo de vuelo, el terreno, el pipeline
de aeródromos y la guía de rodaje, la pregunta sale sola:

> «¿No hay más información sobre cómo diseñar este tipo de juego y que ya tenga
> estas dinámicas resueltas? Parece que estemos diseñando nosotros el primer
> simulador de vuelo de la historia.»

Así que se estudió qué hay licenciable para no escribirlo nosotros. Todo lo de
abajo está comprobado en la fuente y con fecha; lo que no se pudo comprobar se
dice.

## Lo que está licenciable, comprobado

### Terreno y mundo

| Fuente | Licencia | ¿Comercial? | Coste |
| --- | --- | --- | --- |
| **Copernicus DEM GLO-30** | Licencia Copernicus WorldDEM-30 | **Sí**, con atribución obligatoria | Gratis |
| **NASADEM / SRTM** | Dominio público | Sí | Gratis |
| **CesiumJS** | Apache-2.0 | Sí | Gratis |
| **Cesium ion** (terreno, imaginería, edificios) | Suscripción | Sí, plan Commercial | 149 $/mes individual, 524 $/mes equipo |
| **OpenStreetMap** | ODbL | Sí, con compartir-igual sobre la base | Gratis |
| **OurAirports** | Dominio público | Sí | Gratis |

La atribución de Copernicus es literal y hay que ponerla tal cual:
`© DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH 2014-2018, provided
under COPERNICUS by the European Union and ESA`.

### Modelo de vuelo

**JSBSim** es LGPL-2.1, así que se puede usar en un producto comercial siempre
que se enlace de forma que el usuario final pueda sustituir la librería. Es el
motor de FlightGear y lo usan ArduPilot y PX4: calidad no le falta.

Pero el puerto a JavaScript, `JSBSim.js`, **está abandonado**: siete commits en
total y envuelve JSBSim 1.0, que es de hace años. Usarlo aquí significa portar
JSBSim a WebAssembly nosotros, y eso es un proyecto entero.

**FlightGear** entero es GPL-2.0, y eso es vírico: sus aeronaves y sus
escenarios obligarían a poner todo Óga Veve bajo GPL. El código ya es libre
—Apache-2.0— pero el contenido y las marcas son de Oksigenia, así que no.

### Cartas y procedimientos — **descartado, y conviene saber por qué**

**Navigraph no se puede usar en este proyecto.** No por precio: por objeto.
Sus términos de desarrollador permiten los datos solo para

> «game-based learning in personal computer flight simulation software»

y excluyen explícitamente el uso profesional, las escuelas y la formación
organizada. Óga Veve es **gratis para siempre para toda la educación
paraguaya**: colegios, docentes, alumnos. Eso es exactamente lo que su licencia
no permite. Además Navigraph no licencia al desarrollador sino al usuario
final, con suscripción individual, lo que es incompatible con un aula.

**openAIP** es CC BY-NC-SA: el uso libre es no comercial. Sí ofrecen licencia
comercial a medida, y para el espacio aéreo de Paraguay sería la vía si algún
día hace falta.

Mientras tanto: **los hechos no tienen copyright**. Un rumbo, una frecuencia y
una altitud de circuito son datos, no obra. El AIP de DINAC son PDF públicos y
transcribir un puñado de cifras es legal y barato. Para prelectores, además,
los procedimientos instrumentales no hacen ninguna falta.

## Decisión

**Se compra el mundo. No se compra el modelo de vuelo ni la pedagogía.**

1. **El relieve real entra por Copernicus GLO-30**, no por Cesium ion. Es
   gratis, permite uso comercial y da treinta metros en todo el planeta, que
   para un juego que se mira desde una avioneta sobra. Cesium ion queda
   anotado para el día que se quiera fotorrealismo, no antes: **ciento
   cuarenta y nueve dólares al mes contra un producto que es gratis para la
   educación paraguaya es un gasto sin ingreso enfrente**.
2. **El modelo de vuelo se queda como está.** No es el cuello de botella y
   nunca lo fue: funciona, tiene pruebas, y a un niño aprendiendo a rodar
   JSBSim no le aporta **nada que pueda percibir**. Portarlo a WebAssembly
   sería semanas de trabajo para mejorar lo único que ya está bien.
3. **Las cartas se transcriben, no se licencian.** Navigraph está descartado
   por licencia y openAIP queda para más adelante si hiciera falta.
4. **La capa didáctica es nuestra y es el producto.** No hay nada que comprar
   ahí, y ese es justamente el trabajo que cuesta.

## Consecuencias

Lo que esto arregla de golpe, y no es poco: el relieve real hace desaparecer
media docena de problemas que llevamos días parcheando. El río Paraguay deja de
ser un archipiélago de charcos, Tenerife deja de necesitar una elipse dibujada
a mano para tener mar, y la semilla del relieve deja de elegirse midiendo,
porque el terreno **es** el que hay. Ver #122 y el ADR 0003, que ya lo
anticipaba.

Y una cosa que el estudio deja clara y conviene no olvidar: **lo caro de este
proyecto no es la simulación, es la enseñanza.** Ninguna licencia del mundo
vende una señal que entienda alguien de cuatro años que no sabe leer. Eso hay
que hacerlo, y es lo que lo hace valer.

## Una corrección, porque esto ya se había decidido

`CREDITOS.md` decía desde antes que **descartábamos Copernicus** justamente por
su atribución obligatoria, y que NASADEM daba la misma resolución sin ataduras.
Ese razonamiento era bueno, y esta ADR lo contradijo sin haberlo mirado.

Se mantiene Copernicus, pero por un motivo distinto del original y comprobado:
NASADEM exige cuenta de Earthdata para descargar —gratis, pero hay que crearla—
y el espejo de AWS que no la exige **no es SRTM puro**: mezcla fuentes con
atribuciones distintas, incluida EU-DEM, que es Copernicus de todos modos.

Es una decisión reversible y barata de revertir: con una cuenta de Earthdata y
un lector de `.hgt` —cuarenta líneas, Int16 crudo en big-endian— el resto del
pipeline se queda igual.

## Lo que no se pudo comprobar

- El precio real de una licencia comercial de openAIP: hay que preguntarles.
- Los términos exactos de las teselas fotorrealistas 3D de Google, que tienen
  restricciones de caché y de atribución que habría que leer antes de contar
  con ellas.
