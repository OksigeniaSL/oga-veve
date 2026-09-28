"""
El JAZ 120 *Yvága*, modelado en Blender.

El grande: doscientas cincuenta y cinco toneladas, sesenta metros de ala y
**cuatro motores**. Vuela los números de un 747 de verdad —masa, inercias,
superficie alar, envergadura y cuerda salen de la NASA CR-2144, que es dominio
público; ver `aircraft.ts`— y no lleva ni su rótulo ni su joroba.

Eso último es una decisión de forma y está aquí: **el fuselaje es un tubo de
sección constante de punta a punta**. Un cuatrimotor de fuselaje ancho sin
joroba es una clase entera de avión —el DC-8, el 707, el A340— y no una marca.
Lo que este juego promete es volar como vuela un avión de verdad; llamarse como
se llama, no.

**Y la silueta es «cuatro motores debajo del ala».** Contarlos desde el suelo o
desde la ventanilla es exactamente la destreza que el álbum de postales enseña,
así que los cuatro van separados y a distinta distancia del eje, como están de
verdad: los de dentro más juntos y más adelantados que los de fuera.

**Y un tren que se vea**: la panza a dos metros y medio del asfalto, cuatro
patas principales con sus bogies de cuatro ruedas —dos en el ala y dos en la
panza— y la de morro con dos. Con la panza a dos metros escasos y las ruedas
tapadas por los motores se leía «ruedas enterradas».

**Y que se lea grande, no estirado.** «El reactor bimotor quedó lindo, el 747
podría mejorar su aspecto.» Y un primer arreglo que movió la cabina, recortó el
radomo y arrimó los motores no se notó: «lo veo igual, o muy parecido, al de
siempre». Eran cambios de proporción de un metro en un avión de sesenta y
ocho, y a la distancia del hangar no se ven. Lo que se ve a primera vista son
tres cosas, y son las que se cambiaron:

- **El grueso del tubo.** Era más flaco de perfil que el Arai, y al lado el uno
  del otro el grande parecía el pequeño estirado. Ver `LARGO`.
- **La cara.** Un morro redondo y lleno con el parabrisas en el hombro, y no
  una frente de dos metros y medio sobre una rendija. Ver `OJOS_Y` y `PIEL`.
- **La librea.** La franja del Arai en verde era una raya; aquí es una hoja
  que crece del morro a la cola y se hace deriva, y los motores llevan la
  toma del color del sol. Ver la franja en `construir`.

Y las puntas de ala **en flecha** en vez de las aletas del Arai: dos aviones de
la misma casa se tienen que poder distinguir por la silueta, y la punta en
flecha es la de los que cruzan océanos.

Los ayudantes están en `comun.py` y `exterior.py`. Aquí queda solo lo que es
**este** avión.

    blender --background --python modelos/jaz-120-yvaga.py

Si el fichero no está, el juego sigue con la fábrica: que falte un recurso no
puede dejar a nadie sin volar.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import cabina, exportar, limpiar  # noqa: E402
from exterior import (  # noqa: E402
    Piel, banda, centro_de_gravedad, contorno, de_ala, de_deriva, dentro_de,
    bisagra, canoas_con_flap, espejo, flap, flaps_libres, flaps_moviles,
    fowler, juntar, llantas, marca, neumaticos, paneles, paneles_zy,
    recogido,
    simetricos, superficie, turbofan, varillas, ventanas, zy,
)

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# De `src/flight/aircraft.ts`, y de ahí de la CR-2144: envergadura 59,64 m y
# cuerda media 8,32. El largo no lo fija la ficha —el modelo de vuelo no lo
# usa— y sale de la proporción de un cuatrimotor de fuselaje ancho.
ENVERGADURA = 59.64
CUERDA = 8.32

# **El tubo, gordo para su largo.** Lo que se veía era un pasillo único
# estirado, y no era una impresión: medía 68 m de largo por 6,5 de alto, 10,5
# veces, y el Arai mide 9,5, lo mismo que el A320 de verdad. Al lado el uno
# del otro —que es como se miran en el hangar, cada uno llenando su tarjeta—
# el grande era el más flaco de los dos.
#
# Los cuatrimotores de fuselaje ancho sin joroba van de 9,1 —el IL-96— a
# 11,3 —el A340-300—, así que el de antes cabía en la clase, pero en su mitad
# flaca. Ahora son **64 m por 6,9 de alto y 6,7 de ancho: 9,3 veces de perfil
# y 9,6 en planta**, en su mitad gorda, entre el IL-96 y el IL-86, y más gordo
# que el Arai, que es lo que tiene que parecer. Un poco más alto que ancho,
# como los fuselajes anchos de verdad —el de un A350 o un 767—: el lóbulo de
# abajo es la bodega. Y de ancho, poco más que un 747, que es el avión cuyos
# números vuela.
#
# Los cuatro metros que se quitan salen de la cola, que se adelanta entera:
# el morro, la cabina, el ala, los motores y el tren siguen donde estaban, y
# con ellos todo lo que mide la ficha. La cola toca el suelo más tarde, no
# antes: el `maxGroundPitch` sigue siendo el que manda.
LARGO = 64.0
MORRO = -34.0
COLA = MORRO + LARGO
ANCHO = 3.35
TECHO = 3.52
PANZA = -3.38
# A qué altura es más ancho: un pelo por encima del eje, donde va el suelo de
# la cabina de pasaje.
CINTURA = 0.10

# El ala: baja, con treinta y cinco grados de flecha —lo que lleva un avión que
# cruza a ochocientos por hora— y el borde de ataque de la raíz a veintiún
# metros del morro.
ALA_Y = -1.90
ALA_Z = -13.0
FLECHA = math.radians(35)
DIEDRO = math.radians(6)
QUIEBRO = 11.5

# Los cuatro motores, por su distancia al eje. **No están repartidos a partes
# iguales**: los de dentro van más cerca entre sí de lo que van del par de
# fuera, que es como se cuelgan de verdad —el de fuera manda sobre la flexión
# del ala y el de dentro sobre la guiñada si se para—.
MOTORES = (10.60, 20.40)

# **El tren**: la panza a dos metros y medio largos y el motor de dentro a casi
# un metro del suelo. Es el `gearHeight` de su ficha y tienen que decir lo
# mismo.
TREN = 5.90
RUEDA = 0.62
RUEDA_MORRO = 0.55
# Las patas del ala, más adelantadas, y las de la panza, detrás. De su punto
# medio a la de morro, los 25,6 m de la `batalla` de la ficha.
PATAS_ALA = (5.60, -2.20)
PATAS_PANZA = (1.95, 0.90)
MORRO_Z = (PATAS_ALA[1] + PATAS_PANZA[1]) / 2 - 25.6

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-120.glb",
)

# **La cabina, a tres metros de la punta y no a cuatro y medio.** Es lo que
# más dice «fuselaje ancho»: los pilotos no crecen con el avión, así que su
# cabina va en la punta del tubo y el morro por delante de ella es un radomo
# corto. Con el parabrisas a cuatro metros y medio de la punta quedaba un
# morro largo y bajo por delante, el de un avión de dos pisos sin el segundo
# piso. Movida entera —un metro y veinte hacia delante—, cristal y
# muebles, sin cambiar nada de dentro: el piloto se sienta igual, a la misma
# distancia del panel y a la misma altura, y ve lo mismo. Lo mide
# `verificar-cabina.mjs`.
OJOS_Z = -28.60
# **Y en el hombro del morro, a dos tercios del alto.** Los ojos iban a 0,44
# sobre el eje, con el cristal por fuera medio metro más arriba —los pilotos
# miraban la chapa—, y con el fuselaje de ahora, de casi siete metros de alto,
# la cabina a media altura deja encima una frente de dos metros y medio: la
# cara de un avión de dos pisos, que es una marca. En uno de fuselaje ancho de
# un piso el parabrisas va en el hombro del morro, y los ojos con él.
#
# Subida entera, cincuenta y cinco centímetros —asiento, panel, techo y
# suelo—, sin cambiar nada de dentro: el piloto se sienta igual, a la misma
# distancia del panel y ve lo mismo, ahora a 6,9 m del asfalto. Lo mide
# `verificar-cabina.mjs`. Y el cristal sale de aquí: su borde de abajo, a la
# altura de los ojos, como en el Arai.
OJOS_Y = 0.99

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# Sección constante de detrás de la cabina hasta la cola, a propósito: es un
# tubo. La cola sube por abajo hasta la boca del grupo auxiliar.
#
# **El morro es el de un fuselaje ancho**: redondo, lleno y alto. La cabina es
# la de siempre —los pilotos no crecen con el avión, ver `OJOS_Z`—, así que lo
# que dice «grande» es lo que la rodea:
#
# - **El radomo, redondo**, con la punta casi a media altura: la cara llena de
#   los aviones de fuselaje ancho, y no el pico de los de pasillo único.
# - **Lleno a los lados**: el ancho crece a la vez que el alto, y no después.
#   Un morro que ensancha tarde se lee como un pico de pato.
# - **El parabrisas en el hombro**, subiendo a treinta y siete grados —ver
#   `OJOS_Y`—, con paneles de metro diez.
# - **La frente, corta**: el lomo alcanza el tubo cinco metros por detrás del
#   cristal. Con la cabina a media altura eran dos metros y medio de frente
#   sobre una rendija, y de tres cuartos no se veía otra cosa.
PIEL = Piel([
    (MORRO, 0.0, -0.30, -0.30),
    (-33.90, 0.80, 0.20, -0.85),
    (-33.62, 1.40, 0.62, -1.40),
    (-33.12, 1.98, 0.95, -1.98),
    (-32.45, 2.48, 1.15, -2.48),
    (-31.70, 2.84, 1.27, -2.84),
    (-30.95, 3.06, 1.36, -3.06),
    (-30.20, 3.18, 1.92, -3.18),
    (-29.50, 3.25, 2.44, -3.25),
    (-28.60, 3.30, 2.86, -3.31),
    (-27.40, 3.33, 3.22, -3.35),
    (-26.00, ANCHO, 3.43, PANZA),
    (-24.40, ANCHO, TECHO, PANZA, CINTURA),
    (10.00, ANCHO, TECHO, PANZA, CINTURA),
    (15.00, 3.21, 3.48, -2.72, 0.22),
    (20.00, 2.63, 3.33, -1.62),
    (24.00, 1.86, 3.10, -0.12),
    (27.00, 1.09, 2.80, 1.05),
    (29.20, 0.46, 2.48, 1.74),
    (COLA, 0.20, 2.30, 1.96),
])


def y_ala(x):
    return ALA_Y + x * math.tan(DIEDRO)


def z_ala(x):
    return ALA_Z + x * math.tan(FLECHA)


# Los metros a lo largo del ala por cada metro de envergadura: las zonas y los
# flaps de `superficie` se miden sobre el ala, que va en flecha y con diedro,
# y el fuselaje y el carenado están donde están a lo ancho.
E_POR_X = math.sqrt(1 + math.tan(DIEDRO) ** 2 + math.tan(FLECHA) ** 2)


def _suave(z, a, b):
    """De cero a uno entre `a` y `b`, sin esquina en ninguno de los dos."""
    t = max(0.0, min(1.0, (z - a) / (b - a)))
    return t * t * (3 - 2 * t)


def construir():
    limpiar()
    piezas = []

    # Anillos apretados en el morro y en el parabrisas, donde la chapa se
    # quiebra, y menos en la frente, que es una curva larga y tendida.
    morro = ([MORRO + 0.2 * i for i in range(1, 31)]
             + [MORRO + 6.0 + 0.4 * i for i in range(1, 15)])
    piezas.append(PIEL.malla("fuselaje", lados=56, paso=0.8, extra=morro,
                             zonas=[("oscuro", COLA - 0.01, 99, 0, 180)]))

    # El carenado del ala, grande como es en un avión así: donde el ala
    # atraviesa la panza y donde se meten las patas del centro. Asoma por
    # debajo de la panza lo mismo que antes de que la panza bajara.
    carenado = Piel([
        (-16.0, 0.0, -2.40, -2.40),
        (-13.5, 2.05, -1.70, -3.40),
        (-9.0, 2.95, -1.50, -3.74),
        (2.0, 3.00, -1.50, -3.78),
        (6.5, 2.30, -1.70, -3.57),
        (9.5, 0.0, -2.70, -2.70),
    ], n=2.3)
    piezas.append(carenado.malla("carenado", "gris", lados=36, paso=0.8))

    # ── Parabrisas ────────────────────────────────────────────────────────
    #
    # Medido desde los ojos, porque va con ellos: si la cabina se mueve, el
    # cristal se mueve con ella.
    #
    # **Con alto de parabrisas**: metro diez de cristal en los de costado, y
    # el de cara subiendo por el morro de pie. Es lo que lleva un avión de
    # fuselaje ancho de los de ahora —paneles grandes, que es de lo primero que
    # se ve en su cara—, con el borde de abajo a la altura de los ojos, como
    # en el Arai. Con setenta y ocho centímetros echados sobre el morro, de
    # tres cuartos quedaba una rendija negra.
    o = OJOS_Z
    b = OJOS_Y - 0.04
    piezas.append(paneles("parabrisas", PIEL, simetricos([
        [(o - 2.35, 3), zy(PIEL, o - 2.12, b), zy(PIEL, o - 1.05, b + 1.10),
         (o - 0.95, 3)],
    ]), fuera=0.02, div=6))
    piezas.append(paneles_zy("parabrisas-lado", PIEL, [
        [(o - 1.95, b), (o - 0.98, b), (o - 0.62, b + 1.22),
         (o - 0.90, b + 1.10)],
        [(o - 0.80, b), (o + 0.22, b), (o + 0.34, b + 1.00),
         (o - 0.46, b + 1.22)],
    ], fuera=0.02, div=5))

    # ── Ventanillas, puertas y librea ─────────────────────────────────────
    #
    # Cinco puertas por costado, que es lo que lleva un avión de cuatrocientas
    # plazas, y cuarenta y tantas ventanillas entre ellas, en una sola malla.
    # A dos tercios del alto, que es donde va la fila de un fuselaje ancho: el
    # tercio de abajo es la bodega.
    puertas = (-23.4, -11.6, -0.6, 8.2, 17.0)
    fila = [-24.2 + i * 1.07 for i in range(41)]
    fila = [z for z in fila if all(abs(z - p) > 0.95 for p in puertas)]
    piezas.append(ventanas("ventanillas", PIEL, fila, 1.25, 0.52, 0.36,
                           radio=0.15, fuera=0.02))
    for z in puertas:
        piezas.append(contorno(f"puerta{z:+.0f}", PIEL, z, 0.82, 1.95, 1.10,
                               radio=0.18, grueso=0.05, fuera=0.025))
    piezas.append(ventanas("ventanita-puerta", PIEL, list(puertas), 1.32,
                           0.30, 0.24, radio=0.11, fuera=0.02))

    # **La franja es una hoja que acaba siendo la cola.**
    #
    # La de antes era la del Arai en verde: medio metro bajo las ventanillas
    # que acababa en punta al pie de la deriva. En terracota eso tiene cuerpo;
    # en el verde de las hojas, que es mucho más oscuro, a la distancia del
    # hangar se leía una raya, y la librea quedaba plana. Así que aquí la hoja
    # crece:
    #
    # - **Nace en punta bajo el parabrisas** y engorda hasta metro setenta de
    #   ancho, un cuarto del alto del avión, de las ventanillas a la raíz del
    #   ala: en verde oscuro es lo que hace falta para que, de tres cuartos y a
    #   la distancia del hangar, se lea como color y no como raya. Con metro
    #   diez el retrato seguía siendo el de un avión blanco con una raya.
    # - **Y a la cola sube y envuelve el lomo**, y la deriva sale de ella. La
    #   cola verde con el sol naciendo en la raíz —ver `motivoQueSeLee` en
    #   `librea.ts`— ya decía «la deriva hace de hoja»; ahora la hoja es una
    #   sola, del morro a la punta de la deriva, y el sol nace de ella.
    #
    # El borde de arriba alcanza el lomo antes que la deriva, y el de abajo
    # sigue la cola hasta cerrarse en el lomo por detrás de ella: visto de
    # lado, la hoja se ensancha hacia la cola, como una de verdad hacia su
    # punta.
    #
    # La franja que sube y se hace cola es de las formas de siempre de pintar
    # un avión de línea, y aquí es además el motivo de la casa: una hoja.
    nace, y_nace = -32.2, 0.05
    alto_franja, bajo_franja = 0.82, -0.88
    cierra = COLA - 1.2

    def arriba(z):
        # Por debajo del parabrisas de costado hasta pasada la cabina: el
        # borde de abajo del cristal va a la altura de los ojos.
        y = y_nace + (alto_franja - y_nace) * _suave(z, nace, -25.0)
        return y + (PIEL.arriba(z) - y) * _suave(z, 0.0, 14.5)

    def abajo(z):
        y = y_nace + (bajo_franja - y_nace) * _suave(z, nace, -26.0)
        t = max(0.0, min(1.0, (z - 4.0) / (cierra - 4.0)))
        return y + (PIEL.arriba(z) - y) * t ** 1.8

    # En dos trozos: por delante es una franja de metro setenta y le bastan
    # cuatro filas; por detrás envuelve el lomo, cinco metros de chapa curva,
    # y con pocas filas cada una es una cuerda que se mete por dentro de la
    # piel y deja asomar el casco en rayas. Con doce, la cuerda no pasa de un
    # dedo.
    # Y juntos en una malla, que son el mismo color: una llamada de dibujo.
    junta = 2.0
    piezas.append(juntar("cintura", [
        banda("cintura", PIEL, nace, junta, abajo, arriba, fuera=0.018,
              paso=0.5, filas=4),
        banda("cintura-cola", PIEL, junta, cierra, abajo, arriba,
              fuera=0.018, paso=0.5, filas=12),
    ]))

    # Y la raya del color del sol, pegada por debajo: la misma raya fina que
    # acompaña a la franja del Arai, y aquí el ocre de la ficha. Nace un poco
    # por detrás de la punta y se afila al llegar al lomo.
    def fina_abajo(z):
        grueso = 0.22 * _suave(z, -30.8, -28.0) * (
            1 - _suave(z, cierra - 6.0, cierra))
        return abajo(z) - grueso

    piezas.append(banda("cintura-fina", PIEL, -30.8, cierra, fina_abajo,
                        abajo, material_="detalle", fuera=0.018, paso=0.4,
                        filas=1))

    # La marca detrás de la puerta de delante, sobre las ventanillas: la
    # misma firma que en el JAZ 90, a la escala de este avión. Ver `marca`.
    piezas.append(marca(PIEL, -22.55, -19.35, 1.72, 2.50, fuera=0.022))

    cab = cabina(
        # Este avión mete las patas, así que lleva su palanca.
        tren=True,
        ojos_z=OJOS_Z,
        ancho=0.80,
        alto_panel=OJOS_Y - 0.18,
        y_suelo=OJOS_Y - 1.10,
        y_respaldo=OJOS_Y - 0.10,
        plazas=(-0.34, 0.34),
        pantallas_en=0.46,
        palancas=4,
        relojes=16,
        clase="reactor",
        mide="n1",
        suelo_atras=2.20,
    )
    piezas += cab
    dentro_de(PIEL, cab)

    # ── Ala en flecha, con quiebro y punta en flecha ──────────────────────
    #
    # **La punta, en flecha y no con aleta.** Los últimos cuatro metros vuelven
    # atrás con más flecha que el ala —cincuenta y tantos grados en el borde de
    # ataque— y se afilan hasta una cuerda de palmo: es lo que lleva el avión
    # que cruza océanos, porque a igual envergadura alarga el ala sin el peso
    # ni el arrastre de una aleta. Y separa las dos siluetas de la casa: el
    # Arai levanta la punta; el Yvága la estira.
    #
    # Hasta el arranque de la flecha el ala es **la misma de antes**, la misma
    # cuerda, el mismo espesor y el mismo calado por el mismo camino: la
    # estación nueva cae sobre la recta que ya unía el quiebro con la punta.
    # Así los flaps, las canoas y el foco de aterrizaje siguen donde estaban.
    # Ver `flaps-del-modelo.test.ts`.
    semi = ENVERGADURA / 2
    raiz, quiebro, punta = 14.5, 9.0, 3.2
    x_aleta = semi - 1.10

    def sobre_la_recta(x, a, b):
        return a + (b - a) * (x - QUIEBRO) / (x_aleta - QUIEBRO)

    x_flecha = 26.0
    c_flecha = sobre_la_recta(x_flecha, quiebro, punta)
    # El borde de salida sigue la flecha del ala, un poco más atrás; el de
    # ataque es el que se tumba.
    sale = z_ala(x_flecha) + c_flecha
    salida_por_x = math.tan(FLECHA) - (quiebro - punta) / (x_aleta - QUIEBRO)

    def en_flecha(x, cuerda):
        z_sale = sale + (x - x_flecha) * salida_por_x * 1.12
        return z_sale - cuerda

    estaciones = [
        de_ala(0.0, y_ala(0.0), z_ala(0.0), raiz, 0.14, 6, 2.0),
        de_ala(QUIEBRO, y_ala(QUIEBRO), z_ala(QUIEBRO), quiebro, 0.115, 6, 0.5),
        de_ala(x_flecha, y_ala(x_flecha), z_ala(x_flecha), c_flecha,
               sobre_la_recta(x_flecha, 0.115, 0.10), 6,
               sobre_la_recta(x_flecha, 0.5, -2.0)),
        de_ala(28.3, y_ala(28.3) + 0.03, en_flecha(28.3, 2.05), 2.05, 0.095,
               7, -2.2),
        de_ala(semi, y_ala(semi) + 0.10, en_flecha(semi, 0.62), 0.62, 0.09,
               8, -2.5),
    ]
    j = "oscuro"
    # **El de dentro empieza a 6,0 m del eje, pasada la pata del ala.** Esa
    # pata cuelga a 5,6 m y se mete tumbándose hacia la panza por dentro del
    # ala, a lo largo de toda la raíz, justo por delante de la junta: la nariz
    # guardada de un flap que empezara antes caía encima de ella, y al salir
    # la atravesaba. Lo mide `flaps_libres`. En uno de verdad la pata va por
    # delante del larguero de atrás y el flap por detrás; aquí moverla sería
    # cambiar el avión, así que el trozo de franja de encima se queda quieto,
    # como en el Arai. Recogido no se ve el corte, porque no hay raya pintada
    # que mover y las normales son las de siempre. Antes empezaba a 3,05,
    # fuera del carenado de la panza, que abulta tres metros a cada lado a la
    # altura por la que baja el flap. Ver `jaz-90-arai.py`.
    flaps = [flap("dentro", E_POR_X * 6.0, 11.5, 0.73),
             flap("fuera", 11.65, 21.6, 0.73)]
    ala = superficie("ala", estaciones, material_="gris", curvatura=0.015,
                     flaps=flaps, zonas=[
        # El borde de ataque de metal, hasta donde empieza la punta: es el
        # tramo que lleva slats, y la punta en flecha no los lleva.
        ("aluminio", 3.2, x_flecha * E_POR_X, 0.0, 0.06),
        (j, 2.6, 21.6, 0.72, 0.73),
        (j, 2.6, 2.75, 0.73, 1.0),
        (j, 11.5, 11.65, 0.73, 1.0),
        (j, 21.6, 21.75, 0.73, 1.0),
        (j, 21.8, 27.9, 0.76, 0.77),
        (j, 27.8, 27.95, 0.77, 1.0),
        (j, 3.5, 20.5, 0.60, 0.607, "arriba"),
    ])
    piezas.append(ala)
    # **Fowler**, con los topes de un cuatrirreactor de fuselaje ancho —cinco,
    # veinte y treinta— y el carril más largo de la flota: cuatro quintos de
    # su cuerda, casi todo en la primera muesca, y el borde de salida hacia
    # atrás hasta la última. La cuerda crece más de un diez por ciento. Ver
    # `fowler`.
    los_flaps = flaps_moviles(ala, flaps, fowler(
        muescas=(0, 5, 20, 30), recorrido=(0, 0.45, 0.60, 0.80)))
    piezas += los_flaps

    def cuerda_en(x):
        if x < QUIEBRO:
            return raiz - (raiz - quiebro) * x / QUIEBRO
        return quiebro - (quiebro - punta) * (x - QUIEBRO) / (x_aleta - QUIEBRO)

    # Y la cola de las que caen bajo un flap baja con él. Ver
    # `canoas_con_flap`.
    canoas = []
    for n, x in enumerate((6.5, 13.0, 17.5, 23.5)):
        z0 = z_ala(x) + cuerda_en(x) * 0.48
        largo = cuerda_en(x) * 0.72
        y0 = y_ala(x) - 0.25
        canoa = Piel([
            (z0, 0.0, y0, y0),
            (z0 + largo * 0.25, 0.30, y0 + 0.05, y0 - 0.75),
            (z0 + largo * 0.70, 0.28, y0 + 0.05, y0 - 0.66),
            (z0 + largo, 0.0, y0 - 0.20, y0 - 0.20),
        ], x=x)
        o = canoa.malla(f"canoa-{n}", "gris", lados=12, paso=0.6)
        espejo(o)
        canoas.append(o)
    piezas += canoas
    piezas += canoas_con_flap(canoas, los_flaps)

    # ── Los cuatro motores ────────────────────────────────────────────────
    #
    # **Con la vuelta del color del sol en la cubierta**, la raya ocre de la
    # franja dada la vuelta al motor. Verde sobre el campo, desde la
    # persecución y en el aire las cuatro cubiertas eran cuatro jorobas
    # oscuras delante del ala que había que buscar; el ocre, por delante del
    # borde de ataque, es lo que las cuenta. Va en el tramo recto de delante,
    # que es el que asoma. Ver `turbofan`.
    #
    # Su sitio a lo largo sale de la flecha y su altura del diedro: cuanto más
    # afuera, más atrás y más arriba está el ala, así que el motor la sigue.
    # El de fuera, además, un poco más adelantado respecto de su ala, que es
    # como cuelgan y lo que hace que se cuenten cuatro y no dos de frente.
    #
    # **Y arrimados al ala**, con la cubierta a setenta centímetros del borde
    # de ataque y no a un metro: colgados más abajo, el pilón se veía entero y
    # los motores parecían cuatro latas en cuatro palos. Un turbofán de
    # fuselaje ancho va pegado por delante del ala, que es donde el pilón es
    # más corto y más fuerte; y así el de dentro gana veinte centímetros de
    # suelo.
    for n, x in enumerate(MOTORES):
        adelanto = 0.9 if n else 0.0
        centro = (x, y_ala(x) - 2.30, z_ala(x) - 2.55 - adelanto)
        piezas.append(turbofan(f"motor-{n}", centro, largo=6.60,
                               diametro=3.20, anillo=(0.05, 0.20, "detalle")))
        piezas.append(superficie(f"pilon-{n}", [
            de_deriva(x, centro[1] + 1.20, centro[2] - 2.2, 7.4, 0.10),
            de_deriva(x, y_ala(x) - 0.10, z_ala(x) - 1.3, 6.4, 0.10),
        ], material_="gris", punta=False))

    # ── Cola ──────────────────────────────────────────────────────────────
    #
    # Adelantada con la cola entera —ver `LARGO`— y subida con el lomo, con la
    # misma altura por encima de él.
    piezas.append(superficie("deriva", [
        de_deriva(0.0, 3.32, 15.2, 14.0, 0.05),
        de_deriva(0.0, 4.57, 18.9, 10.6, 0.10),
        de_deriva(0.0, 14.27, 25.3, 4.6, 0.10),
    ], material_="cola", simetria=False, zonas=[
        ("oscuro", 2.0, 11.0, 0.68, 0.688),
    ]))
    # Con las puntas acabando antes que la cola: la luz blanca de atrás va
    # en el cono, que es lo último del avión, y no en la punta de un plano.
    #
    # Y con la cuerda de un avión de este peso: un plano de cola que tiene que
    # levantar el morro de doscientas cincuenta toneladas es ancho de raíz, y
    # con la de antes, visto desde atrás, parecía prestado del Arai. Crece
    # por delante, para que la punta siga acabando antes que el cono.
    y_est = 1.75
    z_est = 19.7
    piezas.append(superficie("estabilizador", [
        de_ala(0.0, y_est, z_est, 8.2, 0.10, 7),
        de_ala(10.9, y_est + 10.9 * math.tan(math.radians(7)),
               z_est + 10.9 * math.tan(math.radians(34)), 2.45, 0.09, 7),
    ], material_="gris", zonas=[
        ("aluminio", 1.8, 10.6, 0.0, 0.06),
        ("oscuro", 1.8, 10.6, 0.70, 0.707),
    ]))

    # ── Tren ──────────────────────────────────────────────────────────────
    #
    # Cuatro patas principales —dos en el ala, dos en la panza—, cada una con
    # un bogie de cuatro ruedas: dieciséis, que es como reparte el peso un
    # avión de doscientas cincuenta toneladas. Y la de morro, con dos.
    #
    # Y cada una se mete a su manera, que es como lo hace un cuatrimotor de
    # fuselaje ancho: las del ala se tumban **hacia dentro**, hasta la panza;
    # las de la panza, que ya están debajo del pozo, **hacia delante**; y la
    # de morro, **hacia delante** también, para que si falla la hidráulica el
    # viento la empuje fuera y la trabe.
    #
    # El tornapuntas de cada pata nace en el eje de su bisagra, para girar con
    # ella: en las del ala, un poco por delante del muñón; en las de la panza
    # y la de morro, a los lados.
    eje = -(TREN - RUEDA)
    patas = []
    for nombre, (x, z), arriba_y, eje_giro, grados in (
        ("ala", PATAS_ALA, y_ala(PATAS_ALA[0]) - 0.30, (0, 0, -1), 90),
        ("panza", PATAS_PANZA, -1.60, (1, 0, 0), 90),
    ):
        if nombre == "ala":
            tornapuntas = [((x, arriba_y, z - 1.4), (x, eje + 1.9, z - 0.05),
                            0.10)]
        else:
            tornapuntas = [((x + dx, arriba_y, z), (x, eje + 1.9, z), 0.10)
                           for dx in (-0.6, 0.6)]
        # La caña y la viga del bogie, del grueso de las de un avión de este
        # peso: con las de antes, al lado de una góndola de tres metros, el
        # tren se leía de alambre.
        pata = [varillas(f"pata-{nombre}", [
            ((x, arriba_y, z), (x, eje + 1.35, z), 0.27),
            ((x, eje + 1.40, z), (x, eje + 0.30, z), 0.18),
            ((x, eje + 0.30, z - 0.95), (x, eje + 0.30, z + 0.95), 0.14),
            ((x, eje + 0.30, z - 0.72), (x, eje, z - 0.72), 0.10),
            ((x, eje + 0.30, z + 0.72), (x, eje, z + 0.72), 0.10),
            ((x - 0.62, eje, z - 0.72), (x + 0.62, eje, z - 0.72), 0.11),
            ((x - 0.62, eje, z + 0.72), (x + 0.62, eje, z + 0.72), 0.11),
        ] + tornapuntas, material_="gris")]
        ruedas = [(x + dx, eje, z + dz) for dx in (-0.62, 0.62)
                  for dz in (-0.72, 0.72)]
        pata.append(neumaticos(f"rueda-{nombre}", ruedas, RUEDA, 0.44))
        pata.append(llantas(f"rueda-{nombre}-llanta", ruedas, RUEDA, 0.44))
        patas += bisagra(nombre, (x, arriba_y, z), eje_giro, grados, pata,
                         simetria=True)

    eje_m = -(TREN - RUEDA_MORRO)
    arriba_m = -2.20
    morro = [varillas("pata-morro", [
        ((0, arriba_m, MORRO_Z), (0, eje_m + 1.00, MORRO_Z), 0.18),
        ((0, eje_m + 1.05, MORRO_Z), (0, eje_m, MORRO_Z + 0.12), 0.12),
        ((-0.45, eje_m, MORRO_Z + 0.12), (0.45, eje_m, MORRO_Z + 0.12), 0.08),
        ((-0.55, arriba_m, MORRO_Z), (0, eje_m + 1.6, MORRO_Z + 0.02), 0.08),
        ((0.55, arriba_m, MORRO_Z), (0, eje_m + 1.6, MORRO_Z + 0.02), 0.08),
    ], material_="gris")]
    ruedas_m = [(-0.33, eje_m, MORRO_Z + 0.12), (0.33, eje_m, MORRO_Z + 0.12)]
    morro.append(neumaticos("rueda-morro", ruedas_m, RUEDA_MORRO, 0.38))
    morro.append(llantas("rueda-morro-llanta", ruedas_m, RUEDA_MORRO, 0.38))
    patas += bisagra("morro", (0, arriba_m, MORRO_Z), (1, 0, 0), 95, morro)
    # Y los flaps también tapan: son el trozo de ala de detrás del pozo; y
    # la franja que no baja, lo que queda de él donde acaba cada flap.
    recogido(patas, [p for p in piezas if p.type == "MESH" and (
        p.name in ("fuselaje", "carenado", "ala")
        or p.name.startswith(("flap-", "franja-")))])
    piezas += patas
    # Y ningún flap atraviesa nada al bajar: ni el tren, fuera o metido, ni
    # lo que cuelga cerca de él. Ver `flaps_libres`.
    flaps_libres(piezas, [p for p in piezas if p.type == "MESH" and (
        (p.parent and p.parent.name.startswith("bisagra-"))
        or p.name in ("fuselaje", "carenado")
        or p.name.startswith(("pilon-", "motor-"))
        or (p.name.startswith("canoa-") and "-cola" not in p.name))])

    piezas.append(centro_de_gravedad(z_ala(12.0) + CUERDA * 0.25))
    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
