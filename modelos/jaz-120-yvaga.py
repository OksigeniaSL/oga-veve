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
    bisagra, canoas_con_flap, espejo, flap, flaps_moviles, fowler, llantas,
    neumaticos, paneles, paneles_zy, recogido,
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

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# Sección constante del parabrisas hasta la cola, a propósito: es un tubo. El
# morro, el de un fuselaje ancho —el radomo largo que sube despacio y el
# parabrisas que se levanta de golpe—; la cola sube por abajo hasta la boca
# del grupo auxiliar.
PIEL = Piel([
    (MORRO, 0.0, -0.75, -0.75),
    (-33.86, 0.62, -0.30, -1.22),
    (-33.50, 1.12, 0.05, -1.70),
    (-32.80, 1.68, 0.40, -2.25),
    (-31.80, 2.15, 0.62, -2.66),
    (-30.60, 2.52, 0.78, -2.94),
    (-29.60, 2.76, 0.95, -3.10),
    (-28.70, 2.93, 1.55, -3.17),
    (-27.80, 3.05, 2.15, -3.22),
    (-26.60, 3.16, 2.72, -3.25),
    (-25.20, 3.22, 3.08, -3.25),
    (-23.50, RADIO, RADIO, -RADIO, 0.05),
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
    piezas.append(paneles("parabrisas", PIEL, simetricos([
        [(-29.55, 3), zy(PIEL, -29.35, 0.72), zy(PIEL, -28.40, 1.50),
         (-28.30, 3)],
    ]), fuera=0.02, div=6))
    piezas.append(paneles_zy("parabrisas-lado", PIEL, [
        [(-29.22, 0.72), (-28.25, 0.72), (-27.90, 1.70), (-28.32, 1.50)],
        [(-28.10, 0.72), (-27.15, 0.72), (-27.05, 1.50), (-27.75, 1.70)],
    ], fuera=0.02, div=5))

    # ── Ventanillas, puertas y librea ─────────────────────────────────────
    #
    # Cinco puertas por costado, que es lo que lleva un avión de cuatrocientas
    # plazas, y cincuenta y tantas ventanillas entre ellas, en una sola malla.
    puertas = (-22.4, -11.6, -0.6, 10.0, 21.0)
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
        return abajo(z) + 0.50 * max(0.0, min(1.0, (z + 31.0) / 2.2))

    piezas.append(banda("cintura", PIEL, -31.0, 25.5, abajo, arriba,
                        fuera=0.018, paso=0.5))
    piezas.append(banda("cintura-fina", PIEL, -29.8, 25.2, sube(-0.20),
                        sube(-0.07), material_="detalle", fuera=0.018,
                        paso=0.5, filas=1))

    cab = cabina(
        # Este avión mete las patas, así que lleva su palanca.
        tren=True,
        ojos_z=-27.40,
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

    # ── Ala en flecha, con quiebro y aletas ───────────────────────────────
    semi = ENVERGADURA / 2
    raiz, quiebro, punta = 14.5, 9.0, 3.2
    x_aleta = semi - 1.10
    estaciones = [
        de_ala(0.0, y_ala(0.0), z_ala(0.0), raiz, 0.14, 6, 2.0),
        de_ala(QUIEBRO, y_ala(QUIEBRO), z_ala(QUIEBRO), quiebro, 0.115, 6, 0.5),
        de_ala(x_aleta, y_ala(x_aleta), z_ala(x_aleta), punta, 0.10, 6, -2.0),
        de_ala(semi - 0.35, y_ala(semi - 0.35) + 0.42, z_ala(x_aleta) + 0.95,
               2.55, 0.09, 40, -1.0),
        de_ala(semi - 0.06, y_ala(semi) + 1.40, z_ala(x_aleta) + 2.05, 1.95,
               0.09, 76, 0.0),
        de_ala(semi, y_ala(semi) + 3.10, z_ala(x_aleta) + 3.60, 1.10, 0.09,
               80, 0.0),
    ]
    j = "oscuro"
    # **El de dentro empieza a 3,05 m del eje, y no donde el ala sale del
    # fuselaje.** Al bajar pasa por delante del carenado de la panza, que ahí
    # abulta tres metros a cada lado, y un flap no baja a través de él: medido
    # moviéndolo, hasta 3,0 lo rozaba. El trozo de franja entre el fuselaje y
    # el flap se queda quieto, que es lo que hace en un avión de verdad; y
    # recogido no se ve el corte, porque no hay raya pintada que mover y las
    # normales son las de siempre. Ver `jaz-90-arai.py`.
    flaps = [flap("dentro", E_POR_X * 3.05, 11.5, 0.73),
             flap("fuera", 11.65, 21.6, 0.73)]
    ala = superficie("ala", estaciones, material_="gris", curvatura=0.015,
                     flaps=flaps, zonas=[
        ("aluminio", 3.2, 28.2, 0.0, 0.06),
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
    # veinte y treinta— y el carril más largo de la flota. Ver `fowler`.
    los_flaps = flaps_moviles(ala, flaps, fowler(
        muescas=(0, 5, 20, 30), recorrido=(0, 0.20, 0.32, 0.38)))
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
    for n, x in enumerate(MOTORES):
        adelanto = 0.9 if n else 0.0
        centro = (x, y_ala(x) - 2.60, z_ala(x) - 2.55 - adelanto)
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
    ], material_="capo", simetria=False, zonas=[
        ("oscuro", 2.0, 11.0, 0.68, 0.688),
    ]))
    # Con las puntas acabando antes que la cola: la luz blanca de atrás va
    # en el cono, que es lo último del avión, y no en la punta de un plano.
    y_est = 1.60
    piezas.append(superficie("estabilizador", [
        de_ala(0.0, y_est, 24.2, 7.4, 0.10, 7),
        de_ala(10.9, y_est + 10.9 * math.tan(math.radians(7)),
               24.2 + 10.9 * math.tan(math.radians(34)), 2.3, 0.09, 7),
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
        pata = [varillas(f"pata-{nombre}", [
            ((x, arriba_y, z), (x, eje + 1.35, z), 0.24),
            ((x, eje + 1.40, z), (x, eje + 0.30, z), 0.16),
            ((x, eje + 0.30, z - 0.95), (x, eje + 0.30, z + 0.95), 0.12),
            ((x, eje + 0.30, z - 0.72), (x, eje, z - 0.72), 0.09),
            ((x, eje + 0.30, z + 0.72), (x, eje, z + 0.72), 0.09),
            ((x - 0.62, eje, z - 0.72), (x + 0.62, eje, z - 0.72), 0.10),
            ((x - 0.62, eje, z + 0.72), (x + 0.62, eje, z + 0.72), 0.10),
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
    # Y los flaps también tapan: son el trozo de ala de detrás del pozo.
    recogido(patas, [p for p in piezas if p.type == "MESH" and (
        p.name in ("fuselaje", "carenado", "ala") or p.name.startswith("flap-"))])
    piezas += patas

    piezas.append(centro_de_gravedad(z_ala(12.0) + CUERDA * 0.25))
    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
