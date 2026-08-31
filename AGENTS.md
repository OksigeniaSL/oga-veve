# Contexto del repositorio

Notas para cualquiera —persona o herramienta de asistencia— que toque este
código sin haber estado en las conversaciones que lo originaron.

## Qué es

Simulador de vuelo para navegador. Producto de **Oksigenia SL**, publicado
bajo la marca **Granja Óga**. Público objetivo: niños de 4 a 14 años en
Paraguay, y adultos que quieran volar sin leer un manual.

## La regla que va antes de las reglas

Viene de un formador de campismo de montaña con menores, y arranca los cursos
con ella:

> «Lo único que deben aprender conmigo es que se cumple a rajatabla la regla
> de las tres eses: **Seguridad, Seguridad, Seguridad**. A partir de ahí, todo
> lo demás es aprendizaje: empezamos.»

Vale igual para volar, y gobierna este juego entero. No es una funcionalidad
ni un módulo: es el criterio con el que se resuelve cualquier duda de diseño
que no tenga respuesta obvia.

En la práctica, tres consecuencias que sí son decisiones concretas:

- **Renunciar es ganar.** Una aproximación frustrada se **felicita**, y puntúa
  igual o más que un aterrizaje. Nada de música de tensión ni pantalla roja:
  no es una emergencia, es una maniobra —a entrenar, eso sí—. Si el juego la
  dramatiza enseña justo lo contrario de lo que quiere enseñar, que es que
  abandonar da miedo.
- **Las normas se muestran, no se imponen.** Nunca se castiga: se ve la
  consecuencia y se vuelve a intentar. El objetivo es que se entienda el
  porqué, no que se obedezca.
- **Los galones no son mando, son responsabilidad.** Si el juego enseña a
  contar las barras de la manga —y las enseña—, tiene que enseñar también
  qué significan: cuatro barras no quieren decir que mandes, quieren decir
  que respondes.

## Reglas que no se negocian

1. **Dos registros del castellano, y no se mezclan.**
   - *Texto de producto* —lo que lee quien juega: `src/i18n/es-PY.ts`, el
     título y la descripción de `index.html`— va en **castellano paraguayo**,
     con voseo y sin españolismos, junto al guaraní (`gug`) y al inglés
     (`en`), que está por la aeronáutica y no por los turistas.
   - *Texto de desarrollo* —README, ADR, este fichero, comentarios del
     código, mensajes de commit— lo escribe Oksigenia desde Canarias y va en
     **castellano peninsular**. No hay que fingir un acento que no es el
     nuestro para hablarnos entre nosotros.
2. **Se juega sin saber leer.** La jugadora más joven tiene cuatro años. Lo
   esencial —despegar, virar, aterrizar, entender que algo va mal— se
   comunica con iconos, color, movimiento y sonido. El texto acompaña, nunca
   es el único canal. Una pantalla que obliga a leer para avanzar está mal.
3. **La aeronáutica se aprende en su idioma.** Los rótulos de instrumento
   (IAS, ALT, HDG, V/S, THR) no se traducen nunca: son los mismos en toda
   cabina del mundo y quien juegue aquí se los va a encontrar tal cual el día
   que vuele de verdad. Lo que se traduce es la glosa en pequeño que va
   debajo. Lo mismo con las unidades: nudos y pies en modo Piloto.
4. **Lo que se enseña es real.** Se puede simplificar la presentación tanto
   como haga falta —un niño de cinco años ve tres cosas en pantalla— pero no
   se falsea el contenido. Un aeródromo se señaliza como se señaliza uno de
   verdad; un aviso sonoro solo se pone en un avión que lo llevaría; una
   pista lleva el número que le corresponde por su rumbo. La prueba es esta:
   **quien aprenda algo aquí tiene que reconocerlo el día que lo vea de
   verdad**, y no tener que desaprenderlo. Es lo que separa este juego de un
   juguete con aviones, y es también lo que lo hace defendible en un aula.

   Corolario incómodo y aceptado: cuando la realidad y la comodidad chocan,
   gana la realidad y se resuelve simplificando la *presentación*. La
   explicación popular de la sustentación —«el aire de arriba tiene más
   camino y tiene que llegar a la vez»— es cómoda y es falsa, así que no se
   enseña ni en el peldaño más bajo. Ojo con el matiz: la sustentación **sí**
   es una diferencia de presión, y el ángulo de ataque y la curvatura del
   perfil son los que mandan. Lo falso es solo ese *porqué*. Presión y
   deflexión no son teorías rivales: son la misma cosa vista por los dos
   lados.

5. **Test Ña Emy**: si una abuela paraguaya con WhatsApp como única
   referencia no puede usar una pantalla, la pantalla no está terminada.
6. **Rendimiento primero**: el objetivo es 60 fps en una tablet Android de
   gama media y en el portátil de un colegio. Antes de añadir un efecto
   visual, se mide.
7. **Sin telemetría de menores**: este juego no recoge datos personales, no
   pide registro y no lleva analítica de terceros. No se añade ninguna.
8. **Cada asset se anota en `CREDITOS.md`** con su licencia y su origen,
   antes de entrar. Sin licencia verificable, no entra.
9. **Los comentarios explican el porqué**, no el qué. El código ya dice qué
   hace.

## Convenciones de código

- Identificadores y nombres de fichero en **inglés**; comentarios y
  documentación en **castellano**. Es un repositorio público que aspira a
  recibir contribuciones de fuera, pero el equipo piensa en castellano.
- TypeScript estricto. `noUncheckedIndexedAccess` está activo a propósito.
- Sin framework de UI: el HUD es DOM y CSS. Añadir React aquí sería pagar
  200 KB por un marcador de velocidad.
- Unidades **SI dentro del modelo de vuelo** (metros, m/s, newtons, radianes)
  y conversión a nudos/pies/km-h **solo en la capa de presentación**. Mezclar
  unidades dentro del FDM es la forma más rápida de romperlo.

## Dónde está el porqué

En `docs/adr/`. Antes de cambiar el motor de render, el modelo de vuelo o el
origen de los datos de terreno, lee el ADR correspondiente: la decisión ya se
tomó con argumentos, y si se cambia hay que escribir el ADR que la revierte.

## Publicación

Los créditos del juego y el `NOTICE` mencionan a Oksigenia SL y Granja Óga.
No se acreditan herramientas de desarrollo, ni de asistencia, ni de
generación, ni en el repositorio ni en el juego ni en los mensajes de commit.
