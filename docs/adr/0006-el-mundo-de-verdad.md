# ADR 0006 — El mundo de verdad

**Fecha**: 2026-09-01 · **Estado**: aceptada ·
**Revierte**: parte de [0003](0003-terreno-nasadem.md) y de
[0005](0005-que-se-puede-comprar.md)

## Contexto

Este ADR existe porque quien paga y dirige el proyecto dijo lo que quería, y lo
que quería no era lo que estábamos construyendo:

> «Busco realismo, no quiero ver cubitos tirados por ahí, quiero sobrevolar una
> ciudad o que sea realmente parecido, quiero sobrevolar el río y no una cosa
> azul marino que parpadea. Quiero volar y que parezca que vuelo, no que una
> avioneta hecha con 4 polígonos que ni Minecraft en sus primeras versiones
> engañaría a un niño de 2 años.»

Y antes, dos veces: «seguimos con diseño de los juegos Atari».

## Las dos decisiones que se revierten, y por qué estaban mal

### La de 0003: «coste recurrente y dependencia»

El ADR 0003 descartó la imaginería satelital —Google, Bing, Mapbox, Cesium ion—
con dos argumentos. Uno era el dinero y **estaba mal calculado**; el otro era
estético y **está desmentido por las capturas**.

> «A la altura a la que se vuela en este juego —cientos de metros, no diez mil—
> la ortofoto se pixela y el paisaje se ve sucio y plano.»

Eso es verdad de una **ortofoto pegada al relieve**, que es lo que se evaluó.
No es verdad de las **teselas 3D fotorrealistas**, que son fotogrametría: en
Madrid a ciento ochenta metros hay trescientos diecinueve mil triángulos con
volumen, sombra propia y la torre de San Pedro reconocible. Se evaluó la
tecnología que había, no la que hay.

Lo que sí sigue siendo verdad de aquel párrafo, y hay que decirlo: **en Asunción
la fotogrametría no existe**. Allí sí es una alfombra fotográfica pegada al
relieve. Ver más abajo.

### La de 0005: «ciento cuarenta y nueve dólares al mes»

El ADR 0005 escribió que Cesium ion costaba 149 $/mes y concluyó que era «un
gasto sin ingreso enfrente». **El precio real es otro y la conclusión se cae
sola.**

No hace falta Cesium ion. Las teselas se piden directamente a la Map Tiles API
de Google, y solo se cobra **la petición de tesela raíz**: seis dólares por cada
mil, y una petición cubre a un jugador durante tres horas. O sea, **seis dólares
por mil vuelos**, con los mil primeros de cada mes gratis — treinta y tres
vuelos diarios sin pagar nada.

A la escala real de este proyecto eso es **cero**. Toda la tanda de pruebas de
este ADR consumió siete peticiones.

Y conviene ser honesto sobre por qué el número era tan malo: se escribió
mirando la tarifa de un producto que no necesitábamos, sin comprobar la del que
sí. Es exactamente el error que este proyecto lleva toda la semana cazando en el
código —dar por buena una cuenta sin medirla— y esta vez estaba en una decisión.

## Lo que se midió

Volando de verdad en un navegador, con `spike/mundo-real.js` y
`spike/aerodromo-real.js`:

| | fps | triángulos |
| --- | --- | --- |
| Silvio Pettirossi, 700 m | 60 | 18.400 |
| Tenerife Norte, 900 m | 60 | 68.158 |
| La Laguna, 400 m | 60 | 119.495 |
| Asunción centro, 180 m | 61 | 28.987 |
| Madrid centro, 180 m | 60 | 318.968 |

**Sesenta fotogramas en todas**, y Silvio Pettirossi entero a setecientos metros
son dieciocho mil cuatrocientos triángulos contra los **doscientos noventa y
cinco mil** que gasta nuestro terreno de polígonos. El mundo de verdad no es más
caro que el que hicimos a mano: es dieciséis veces más barato, porque manda solo
lo que se ve y a la resolución a la que se ve.

Eso deja sin argumento la idea de tener dos niveles de fidelidad para las
tablets de colegio. **Lo que gasta no son polígonos, es red**, y eso se arregla
con caché.

### Y encaja con lo nuestro

El aeropuerto que construimos a mano cae sobre el asfalto de la fotografía: la
pista sobre la pista y la calle de rodaje sobre la calle de rodaje. El único
desajuste es vertical y **constante**:

| | nuestro fichero | Google | diferencia |
| --- | --- | --- | --- |
| Tenerife, cabecera 12 | 628,5 m | ~676 m | 47,5 m |
| Tenerife, cabecera 30 | 611,7 m | ~661 m | 49,3 m |
| Asunción | 89 m | 95,9 m | 6,9 m |

Es la separación entre el geoide —donde vive Copernicus— y el elipsoide —donde
vive Google—. Se corrige preguntándole al mundo a qué altura está en vez de
pelearse con los datums, y como es constante no hay deformación, ni rotación, ni
escala que ajustar.

## Decisión

1. **Se adopta `3d-tiles-renderer`** (NASA-AMMOS, **Apache-2.0**, la misma
   licencia que este código) sobre three.js pelado. No se cambia de motor de
   render: el ADR 0001 sigue en pie.
2. **El mundo pasa a ser fotorrealista donde lo haya**, con el relieve y el
   asfalto propios como suelo para donde no.
3. **Se abre la puerta a dependencias**, con la política de abajo.
4. **El cielo, el sol, la niebla, las nubes y el agua siguen siendo nuestros.**
   Google manda suelo y nada más — lo cual va bien, porque son justamente las
   piezas que hay que controlar para el amanecer y el atardecer.

## La política de dependencias, que hasta ahora no estaba escrita

Este proyecto se ha comportado como si tuviera una regla de cero dependencias.
No la tenía: no está en `AGENTS.md`, ni en el README, ni en ningún ADR. Era una
costumbre, y una costumbre sin escribir no se puede discutir — solo obedecer.

Ahora está escrita, y no es «cero»:

- **Se admite una dependencia cuando resuelve un problema que no es el nuestro.**
  Leer un formato de teselas 3D no es el oficio de este proyecto; enseñar a
  volar sí.
- **Licencia compatible con Apache-2.0**, sin excepciones, y anotada en
  `CREDITOS.md`.
- **Se prefiere la que no arrastra un árbol.** `3d-tiles-renderer` trae tres
  paquetes; React traería doscientos.
- **Y sigue sin haber framework de UI.** El HUD es DOM y CSS, y pagar doscientos
  kilobytes por un marcador de velocidad sigue sin tener sentido.

## Lo que esto no arregla, y hay que saberlo

**Asunción no tiene fotogrametría.** A ciento ochenta metros da veintinueve mil
triángulos contra los trescientos diecinueve mil de Madrid: es una alfombra
fotográfica pegada al relieve. El río, la bahía, las calles y el aeropuerto son
reales y preciosos; los edificios son planos.

La pieza que falta ya existe por casualidad: la **rejilla de ciudad** de
`data/cities/`, noventa y seis por noventa y seis celdas de uso del suelo y
densidad sacadas de OpenStreetMap. Google pone el suelo verdadero y nosotros el
volumen. Se construyó por otro motivo y encaja aquí.

**Y hay un hallazgo que cambia el diseño**: donde hay fotogrametría, la pista ya
viene pintada —designador, teclas de piano, eje— mejor de lo que la pintamos
nosotros. En esos aeropuertos no hay que dibujar asfalto: hay que dibujar lo que
la foto no puede dar, que son las luces, la manga, la raya de guía y la física.
Las marcas que hemos pintado esta semana siguen haciendo falta para Asunción,
para el Chaco y para los ochenta mil aeropuertos sin cobertura.

## Consecuencias

- El estilo visual deja de ser enteramente nuestro. El ADR 0003 decía que «una
  ortofoto es de otro» y eso sigue siendo cierto: **la atribución de Google es
  obligatoria y se pinta siempre**, tesela a tesela. Lo que es de Granja Óga
  pasa a ser el cielo, la luz, la señalética, los personajes y la enseñanza.
- Aparece una dependencia de red que antes no había. Sin conexión —o sin clave
  configurada— el juego tiene que seguir volando con su mundo de polígonos. Eso
  no es un modo degradado: es el suelo sobre el que se construye todo lo demás,
  y por eso no se tira.
- Y aparece una factura. Es de céntimos, pero existe, y va escrita junto a los
  donativos en el README.
