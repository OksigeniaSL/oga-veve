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
podría mejorar su aspecto.» Lo que tenía era un morro largo y bajo —el
parabrisas a cuatro metros y medio de la punta y la frente subiendo cuatro
metros por detrás de él—, que es la proporción de los cuatrimotores de pasillo
único de los años sesenta, y a sesenta y ocho metros se leía «estirado». La
cabina de un avión de fuselaje ancho es del mismo tamaño que la de uno pequeño
—los pilotos no crecen—, así que en un tubo de seis metros y medio el morro es
**corto, lleno y romo**, con la cabina en la punta y una frente que alcanza el
tubo enseguida. Es la proporción que dice «grande» sin necesidad de joroba. Y
las puntas de ala **en flecha** en vez de las aletas del Arai: dos aviones de
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
    en_punta, fowler, llantas, marca, neumaticos, paneles, paneles_zy,
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
LARGO = 68.0
MORRO = -LARGO / 2
COLA = LARGO / 2
RADIO = 3.25

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

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# Sección constante de detrás de la cabina hasta la cola, a propósito: es un
# tubo. La cola sube por abajo hasta la boca del grupo auxiliar.
#
# **El morro es el de un fuselaje ancho.** Con la cabina en su sitio —ver
# `OJOS_Z`—, tres cosas lo hacen:
#
# - **El radomo, corto y romo**: tres metros y cuarto de la punta al pie del
#   parabrisas, medio diámetro, y la punta a media altura baja. Era de cuatro
#   y medio con la punta más caída, que es un pico.
# - **Lleno a los lados**: el ancho crece a la vez que el alto, y no después.
#   Un morro que ensancha tarde se lee como un pico de pato.
# - **La frente, corta y alta**: el lomo alcanza el tubo a unos ocho metros de
#   la punta, 1,2 diámetros, y no a diez y medio. Por encima del parabrisas
#   queda una frente, y no una rampa de cuatro metros.
PIEL = Piel([
    (MORRO, 0.0, -0.50, -0.50),
    (-33.88, 0.74, -0.06, -0.98),
    (-33.58, 1.28, 0.30, -1.52),
    (-33.05, 1.86, 0.62, -2.08),
    (-32.35, 2.36, 0.84, -2.56),
    (-31.55, 2.70, 0.98, -2.88),
    (-30.80, 2.90, 1.08, -3.05),
    (-29.95, 3.04, 1.58, -3.14),
    (-29.10, 3.13, 2.20, -3.20),
    (-28.20, 3.19, 2.70, -3.23),
    (-27.20, 3.23, 3.03, -3.25),
    (-26.10, 3.245, 3.20, -3.25),
    (-24.80, RADIO, RADIO, -RADIO, 0.05),
    (14.00, RADIO, RADIO, -RADIO, 0.05),
    (19.00, 3.12, 3.22, -2.62, 0.20),
    (24.00, 2.55, 3.10, -1.55),
    (28.00, 1.80, 2.90, -0.10),
    (31.00, 1.05, 2.62, 1.05),
    (33.20, 0.45, 2.30, 1.72),
    (COLA, 0.20, 2.12, 1.92),
])


def y_ala(x):
    return ALA_Y + x * math.tan(DIEDRO)


def z_ala(x):
    return ALA_Z + x * math.tan(FLECHA)


# Los metros a lo largo del ala por cada metro de envergadura: las zonas y los
# flaps de `superficie` se miden sobre el ala, que va en flecha y con diedro,
# y el fuselaje y el carenado están donde están a lo ancho.
E_POR_X = math.sqrt(1 + math.tan(DIEDRO) ** 2 + math.tan(FLECHA) ** 2)


def construir():
    limpiar()
    piezas = []

    morro = [MORRO + 0.2 * i for i in range(1, 50)]
    piezas.append(PIEL.malla("fuselaje", lados=56, paso=0.8, extra=morro,
                             zonas=[("oscuro", COLA - 0.01, 99, 0, 180)]))

    # El carenado del ala, grande como es en un avión así: donde el ala
    # atraviesa la panza y donde se meten las patas del centro.
    carenado = Piel([
        (-16.0, 0.0, -2.30, -2.30),
        (-13.5, 2.05, -1.70, -3.28),
        (-9.0, 2.95, -1.50, -3.62),
        (2.0, 3.00, -1.50, -3.66),
        (6.5, 2.30, -1.70, -3.45),
        (9.5, 0.0, -2.60, -2.60),
    ], n=2.3)
    piezas.append(carenado.malla("carenado", "gris", lados=36, paso=0.8))

    # ── Parabrisas ────────────────────────────────────────────────────────
    #
    # Medido desde los ojos, porque va con ellos: si la cabina se mueve, el
    # cristal se mueve con ella.
    o = OJOS_Z
    piezas.append(paneles("parabrisas", PIEL, simetricos([
        [(o - 2.15, 3), zy(PIEL, o - 1.95, 0.72), zy(PIEL, o - 1.00, 1.50),
         (o - 0.90, 3)],
    ]), fuera=0.02, div=6))
    piezas.append(paneles_zy("parabrisas-lado", PIEL, [
        [(o - 1.82, 0.72), (o - 0.85, 0.72), (o - 0.50, 1.70),
         (o - 0.92, 1.50)],
        [(o - 0.70, 0.72), (o + 0.25, 0.72), (o + 0.35, 1.50),
         (o - 0.35, 1.70)],
    ], fuera=0.02, div=5))

    # ── Ventanillas, puertas y librea ─────────────────────────────────────
    #
    # Cinco puertas por costado, que es lo que lleva un avión de cuatrocientas
    # plazas, y cincuenta y tantas ventanillas entre ellas, en una sola malla.
    puertas = (-23.4, -11.6, -0.6, 10.0, 21.0)
    fila = [-24.2 + i * 1.07 for i in range(48)]
    fila = [z for z in fila if all(abs(z - p) > 0.95 for p in puertas)]
    piezas.append(ventanas("ventanillas", PIEL, fila, 1.05, 0.52, 0.36,
                           radio=0.15, fuera=0.02))
    for z in puertas:
        piezas.append(contorno(f"puerta{z:+.0f}", PIEL, z, 0.62, 1.95, 1.10,
                               radio=0.18, grueso=0.05, fuera=0.025))
    piezas.append(ventanas("ventanita-puerta", PIEL, list(puertas), 1.12,
                           0.30, 0.24, radio=0.11, fuera=0.02))

    # La franja, bajo las ventanillas: nace en punta bajo el parabrisas y
    # sube al final hacia la deriva.
    def sube(base, desde=15.0, cuanto=0.20):
        return lambda z: base + max(0.0, z - desde) * cuanto

    abajo = sube(0.05)

    def arriba(z):
        return abajo(z) + 0.50 * max(0.0, min(1.0, (z + 32.2) / 2.2))

    # Y acaba en punta de hoja al pie de la deriva, con la raya fina
    # cerrándose en la misma punta. Ver `en_punta`.
    abajo_punta = en_punta(abajo, arriba, 21.5, 26.5)
    piezas.append(banda("cintura", PIEL, -32.2, 26.48, abajo_punta, arriba,
                        fuera=0.018, paso=0.5))

    def fina_arriba(z):
        return abajo_punta(z) - 0.12 * (1 - max(0.0, min(1.0, (z - 21.5) / 5.0)))

    piezas.append(banda("cintura-fina", PIEL, -31.0, 26.48,
                        en_punta(lambda z: fina_arriba(z) - 0.13, fina_arriba,
                                 21.5, 26.5),
                        fina_arriba, material_="detalle", fuera=0.018,
                        paso=0.5, filas=1))

    # La marca detrás de la puerta de delante, sobre las ventanillas: la
    # misma firma que en el JAZ 90, a la escala de este avión. Ver `marca`.
    piezas.append(marca(PIEL, -22.55, -19.35, 1.55, 2.33, fuera=0.022))

    cab = cabina(
        # Este avión mete las patas, así que lleva su palanca.
        tren=True,
        ojos_z=OJOS_Z,
        ancho=0.80,
        alto_panel=0.26,
        y_suelo=-0.66,
        y_respaldo=0.34,
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
                               diametro=3.20))
        piezas.append(superficie(f"pilon-{n}", [
            de_deriva(x, centro[1] + 1.20, centro[2] - 2.2, 7.4, 0.10),
            de_deriva(x, y_ala(x) - 0.10, z_ala(x) - 1.3, 6.4, 0.10),
        ], material_="gris", punta=False))

    # ── Cola ──────────────────────────────────────────────────────────────
    piezas.append(superficie("deriva", [
        de_deriva(0.0, 2.95, 19.2, 14.0, 0.05),
        de_deriva(0.0, 4.20, 22.9, 10.6, 0.10),
        de_deriva(0.0, 13.9, 29.3, 4.6, 0.10),
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
    y_est = 1.60
    piezas.append(superficie("estabilizador", [
        de_ala(0.0, y_est, 23.7, 8.2, 0.10, 7),
        de_ala(10.9, y_est + 10.9 * math.tan(math.radians(7)),
               23.7 + 10.9 * math.tan(math.radians(34)), 2.45, 0.09, 7),
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
