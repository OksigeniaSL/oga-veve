"""
El JAZ 40 *Panambi*, modelado en Blender.

El bimotor de ala baja: el avión de trabajo de la flota, el que lleva gente de
un campo a otro. Es la silueta con más que contar de las seis —dos góndolas
colgadas del ala, tren de morro, cabina de dos pilotos— y por eso es el primero
de los cuatro que faltaban.

**Y hacía falta.** Lo que había era lo que saca la fábrica paramétrica del
juego con la silueta `bimotor-ala-baja`, que es honesta pero es un arado: losas
con las aristas vivas y el fuselaje abierto por dentro. Ver la cabecera de
`jaz-25-mainumby.py`, que es donde está contado por qué Blender y no la fábrica.

**Con las proporciones de su clase**: el morro largo de la bodega, la cabina
de seis plazas con sus ventanillas grandes, el cono de cola que se afina y
sube, y dos motores de cilindros opuestos en góndolas con su capó, sus tomas y
su hélice tripala, que se alargan por detrás del ala porque ahí se mete el
tren.

Los ayudantes están en `comun.py` y `exterior.py`. Aquí queda solo lo que es
**este** avión.

    blender --background --python modelos/jaz-40-panambi.py

Si el fichero no está, el juego sigue con la fábrica: que falte un recurso no
puede dejar a nadie sin volar.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import caja, cabina, exportar, limpiar  # noqa: E402
from exterior import (  # noqa: E402
    Piel, banda, centro_de_gravedad, contorno, de_ala, de_deriva, dentro_de,
    bisagra, espejo, flap, flaps_moviles, helice, llantas, neumaticos,
    paneles, paneles_zy, ranurado, recogido, simetricos, superficie,
    varillas, zy,
)

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# De `src/flight/aircraft.ts`: envergadura 11,9 m, cuerda 1,6 y dos toneladas.
# El juego reescala el modelo a la envergadura de la ficha al cargarlo, así que
# modelar con las de verdad es lo único que garantiza que no se deforme.
ENVERGADURA = 11.9
CUERDA = 1.6
MORRO = -3.95
COLA = 5.20

# **Ala baja**, que es la silueta: el plano sale por debajo del fuselaje y se ve
# el dorso desde la ventanilla, al revés que en el Pykasu.
ALA_Y = -0.42
ALA_Z = -0.65
DIEDRO = math.radians(6)

# Dónde van los motores.
#
# No es un número libre: la hélice tiene que pasar lejos del fuselaje —aquí
# quedan ochenta y nueve centímetros de aire entre la punta de pala y el
# costado— y a la vez cuanto más cerca del eje, menos guiñada da un motor
# parado. Dos metros y medio es donde lo ponen los bimotores de este tamaño.
MOTOR = 2.45
RADIO_HELICE = 0.92
EJE = -0.22
Z_HELICE = -1.95

# El tren: 1,6 m del eje al suelo, el `gearHeight` de su ficha, que deja casi
# medio metro entre la punta de la pala y el asfalto. Un bimotor de este porte
# lo mete en vuelo: el principal en las góndolas y el de morro en la bodega.
TREN = 1.60
RUEDA = 0.29
RUEDA_MORRO = 0.22
PRINCIPAL_Z = 0.25
MORRO_Z = PRINCIPAL_Z - 2.8

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-40.glb",
)

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# El morro largo y afilado —ahí va la bodega, porque los motores están en las
# alas—, la cabina de costados rectos y techo plano, y el cono de cola.
PIEL = Piel([
    (MORRO, 0.0, -0.06, -0.06),
    (-3.85, 0.16, 0.07, -0.20),
    (-3.55, 0.34, 0.21, -0.38),
    (-3.00, 0.48, 0.31, -0.55),
    (-2.50, 0.56, 0.38, -0.64),
    (-2.00, 0.61, 0.62, -0.68),
    (-1.45, 0.64, 0.74, -0.70),
    (-0.80, 0.645, 0.76, -0.70),
    (0.60, 0.62, 0.74, -0.66),
    (1.60, 0.52, 0.62, -0.52),
    (2.80, 0.36, 0.46, -0.30),
    (4.10, 0.20, 0.36, -0.06),
    (5.00, 0.09, 0.31, 0.10),
    (COLA, 0.0, 0.25, 0.25),
], n=2.6)


def y_ala(x):
    return ALA_Y + x * math.tan(DIEDRO)


def construir():
    limpiar()
    piezas = []

    morro = [MORRO + 0.08 * i for i in range(1, 25)]
    piezas.append(PIEL.malla("fuselaje", lados=40, paso=0.15, extra=morro))

    # ── Cristales ─────────────────────────────────────────────────────────
    piezas.append(paneles("parabrisas", PIEL, simetricos([
        [(-2.46, 3), zy(PIEL, -2.36, 0.28), zy(PIEL, -1.80, 0.66),
         (-1.78, 3)],
    ]), fuera=0.006, div=6))
    # La ventanilla del piloto y las tres de la cabina de pasaje, grandes y
    # de esquinas redondas, que es lo que se ve de este avión desde el suelo.
    piezas.append(paneles_zy("ventanillas", PIEL, [
        [(-2.26, 0.26), (-1.55, 0.18), (-1.55, 0.62), (-1.86, 0.64)],
        [(-1.36, 0.14), (-0.66, 0.12), (-0.66, 0.58), (-1.36, 0.60)],
        [(-0.48, 0.12), (0.22, 0.12), (0.22, 0.56), (-0.48, 0.58)],
        [(0.40, 0.14), (0.98, 0.18), (0.90, 0.50), (0.40, 0.55)],
    ], fuera=0.006, div=4))

    # La puerta de la derecha, la de subir por el ala, y la de la bodega del
    # morro a la izquierda. Una junta en la chapa cada una.
    piezas.append(contorno("puerta", PIEL, -1.01, 0.02, 1.06, 0.80,
                           radio=0.08, grueso=0.016, fuera=0.009, lados=(1,)))
    piezas.append(contorno("puerta-trasera", PIEL, -0.13, 0.00, 1.14, 0.86,
                           radio=0.08, grueso=0.016, fuera=0.009, lados=(-1,)))
    piezas.append(contorno("bodega", PIEL, -3.05, -0.12, 0.52, 0.72,
                           radio=0.08, grueso=0.014, fuera=0.009, lados=(-1,)))

    # La franja, bajo las ventanillas, y su raya en el otro color.
    def sube(base, desde=1.2, cuanto=0.07):
        return lambda z: base + max(0.0, z - desde) * cuanto

    arriba = sube(0.02)

    def abajo(z):
        return arriba(z) - 0.16 * max(0.0, min(1.0, (z + 3.6) / 1.2))

    piezas.append(banda("cintura", PIEL, -3.6, 4.6, abajo, arriba,
                        fuera=0.007, paso=0.12))
    piezas.append(banda("cintura-fina", PIEL, -3.3, 4.5, sube(-0.20),
                        sube(-0.17), material_="detalle", fuera=0.007,
                        paso=0.12, filas=1))

    # Lo de dentro: dos plazas de frente, suelo bajo en la panza y el panel a
    # setenta centímetros de la cara. Ver `cabina` en `comun.py`.
    cab = cabina(
        # Este avión mete las patas, así que lleva su palanca.
        tren=True,
        ojos_z=-1.30,
        ancho=0.50,
        alto_panel=0.10,
        y_suelo=-0.42,
        y_respaldo=0.18,
        plazas=(-0.30, 0.30),
        pantallas_en=0.30,
        palancas=2,
        relojes=8,
        suelo_atras=1.70,
    )
    # Y dos plazas atrás. No se pilotan desde ahí —`ojoDePiloto` se queda con
    # el asiento más adelantado— pero sin ellas la cabina de un avión de seis
    # plazas es un pasillo vacío.
    for lado in (-1, 1):
        atras = caja(f"asiento-atras-{lado}", -0.24, 0.24, -0.40, 0.14,
                     -0.30, 0.20, "tapiceria")
        atras.location.x += lado * 0.30
        cab.append(atras)
    piezas += cab
    dentro_de(PIEL, cab)

    # ── Ala ───────────────────────────────────────────────────────────────
    #
    # Recta, afinándose hacia la punta, con el perfil grueso de un avión que
    # no tiene prisa. Flaps hasta la góndola y más allá, y alerones fuera.
    semi = ENVERGADURA / 2
    j = "oscuro"
    # **Y se mueven a los dos lados de la góndola, no a través de ella.** La
    # franja pintada pasa por encima del motor, pero un flap no baja dentro de
    # una góndola: en un bimotor de esta clase el flap va partido, uno entre
    # el fuselaje y el motor y otro entre el motor y el alerón. El trozo de
    # encima de la góndola se queda quieto, que es el carenado de detrás del
    # motor. Recogido no se nota el corte: las normales son las de siempre y
    # no hay raya pintada que mover.
    flaps = [flap("dentro", 0.70, 2.14, 0.735),
             flap("fuera", 2.79, 3.55, 0.735)]
    ala = superficie("ala", [
        de_ala(0.0, y_ala(0.0), ALA_Z, 2.10, 0.15, 6, 2.0),
        de_ala(MOTOR, y_ala(MOTOR), ALA_Z + 0.06, 1.80, 0.14, 6, 1.5),
        # Menos la punta redonda, que sobresale medio espesor.
        de_ala(semi - 0.06, y_ala(semi), ALA_Z + 0.22, 1.05, 0.11, 6, -1.0),
    ], curvatura=0.02, flaps=flaps, zonas=[
        (j, 0.65, 3.55, 0.72, 0.735),
        (j, 0.65, 0.70, 0.735, 1.0),
        (j, 3.55, 3.60, 0.735, 1.0),
        (j, 3.70, 5.65, 0.74, 0.755),
        (j, 5.60, 5.65, 0.755, 1.0),
    ])
    piezas.append(ala)
    # Ranurados, con los topes de un bimotor de pistón de seis plazas: diez,
    # veinticinco y cuarenta. Ver `ranurado`.
    piezas += flaps_moviles(ala, flaps, ranurado(
        muescas=(0, 10, 25, 40), recorrido=(0, 0.15, 0.21, 0.25)))

    # ── Góndolas y hélices ────────────────────────────────────────────────
    #
    # La góndola empieza por delante del borde de ataque y acaba por detrás
    # del borde de salida, que es como cuelga un motor de un ala: el ala la
    # atraviesa. El capó, del color de la franja, con sus dos tomas de aire a
    # los lados del cono.
    gondola = Piel([
        (Z_HELICE + 0.06, 0.16, EJE + 0.16, EJE - 0.16, EJE),
        (-1.80, 0.30, EJE + 0.26, EJE - 0.30, EJE),
        (-1.50, 0.38, EJE + 0.34, EJE - 0.40),
        (-0.80, 0.40, EJE + 0.36, EJE - 0.44),
        (0.30, 0.34, EJE + 0.24, EJE - 0.38),
        (1.20, 0.17, EJE + 0.06, EJE - 0.20),
        (1.55, 0.0, EJE - 0.08, EJE - 0.08),
    ], x=MOTOR, n=2.4)
    piezas.append(espejo(gondola.malla("gondola", "casco", lados=28,
                                       paso=0.15, zonas=[
        ("capo", -9, -1.05, 0, 180),
    ], extra=[-1.05])))
    piezas.append(espejo(paneles("tomas", gondola, simetricos([
        [(-1.86, 55), (-1.86, 100), (-1.77, 102), (-1.77, 52)],
    ]), material_="oscuro", fuera=0.005, div=3)))
    for lado, nombre in ((-1, "izquierda"), (1, "derecha")):
        piezas += helice(f"helice-{nombre}", (lado * MOTOR, EJE, Z_HELICE),
                         radio=RADIO_HELICE, cuantas=3, buje=0.15,
                         cuerda=0.14, largo_cono=0.34, giro=lado)

    # ── Cola ──────────────────────────────────────────────────────────────
    #
    # Convencional: el estabilizador en el fuselaje y la deriva encima. La cola
    # en T es del JAZ 60, y son dos siluetas distintas justamente porque se
    # distinguen de lejos.
    piezas.append(superficie("deriva", [
        de_deriva(0.0, 0.30, 2.95, 2.10, 0.05),
        de_deriva(0.0, 0.46, 3.72, 1.34, 0.10),
        de_deriva(0.0, 1.72, 4.40, 0.78, 0.09),
    ], material_="capo", simetria=False, zonas=[
        ("oscuro", 0.2, 1.3, 0.62, 0.635),
    ]))
    piezas.append(superficie("estabilizador", [
        de_ala(0.0, 0.26, 3.95, 1.05, 0.10, 3),
        de_ala(2.30, 0.26 + 2.3 * math.tan(math.radians(3)), 4.14, 0.70,
               0.09, 3),
    ], zonas=[
        ("oscuro", 0.25, 2.2, 0.60, 0.615),
    ]))

    # ── Tren triciclo ─────────────────────────────────────────────────────
    #
    # De morro, que es lo que lleva un avión de esta clase: se rueda mirando
    # hacia delante y se frena sin miedo a irse de morro. El Mainumby es de
    # rueda atrás y por eso rueda con el morro apuntando al cielo.
    #
    # Los principales, **dentro de las góndolas**, que es de donde salen en un
    # bimotor de ala baja.
    #
    # Y se meten girando sobre su muñón: el principal **hacia delante**,
    # dentro de la góndola y detrás del motor —si falla la hidráulica, el
    # viento lo empuja fuera y lo traba—, y el de morro **hacia atrás**, a la
    # bodega, porque por delante el morro se afila y no cabe. El tornapuntas
    # nace a los lados del muñón, en el eje de la bisagra, para girar con la
    # pata sin atravesar nada.
    eje = -(TREN - RUEDA)
    arriba = EJE - 0.10
    principal = [varillas("pata-principal", [
        ((MOTOR, arriba, PRINCIPAL_Z), (MOTOR, eje + 0.30, PRINCIPAL_Z),
         0.055),
        ((MOTOR, eje + 0.34, PRINCIPAL_Z), (MOTOR + 0.10, eje, PRINCIPAL_Z),
         0.036),
        ((MOTOR - 0.16, arriba, PRINCIPAL_Z),
         (MOTOR, eje + 0.40, PRINCIPAL_Z - 0.02), 0.025),
        ((MOTOR + 0.16, arriba, PRINCIPAL_Z),
         (MOTOR, eje + 0.40, PRINCIPAL_Z - 0.02), 0.025),
    ], material_="gris")]
    ruedas = [(MOTOR + 0.14, eje, PRINCIPAL_Z)]
    principal.append(neumaticos("rueda-principal", ruedas, RUEDA, 0.17))
    principal.append(llantas("rueda-principal-llanta", ruedas, RUEDA, 0.17))
    patas = bisagra("principal", (MOTOR, arriba, PRINCIPAL_Z), (1, 0, 0), 90,
                    principal, simetria=True)

    eje_m = -(TREN - RUEDA_MORRO)
    arriba_m = -0.45
    morro = [varillas("pata-morro", [
        ((0, arriba_m, MORRO_Z), (0, eje_m + 0.30, MORRO_Z), 0.045),
        ((0, eje_m + 0.34, MORRO_Z), (0, eje_m + 0.10, MORRO_Z), 0.030),
        ((-0.07, eje_m + 0.12, MORRO_Z), (-0.07, eje_m, MORRO_Z + 0.04), 0.018),
        ((0.07, eje_m + 0.12, MORRO_Z), (0.07, eje_m, MORRO_Z + 0.04), 0.018),
        ((-0.08, eje_m + 0.12, MORRO_Z), (0.08, eje_m + 0.12, MORRO_Z), 0.02),
    ], material_="gris")]
    morro.append(neumaticos("rueda-morro", [(0, eje_m, MORRO_Z + 0.04)],
                            RUEDA_MORRO, 0.13))
    morro.append(llantas("rueda-morro-llanta", [(0, eje_m, MORRO_Z + 0.04)],
                         RUEDA_MORRO, 0.13))
    patas += bisagra("morro", (0, arriba_m, MORRO_Z), (-1, 0, 0), 90, morro)
    # Y los flaps también tapan: son el trozo de ala de detrás del pozo.
    recogido(patas, [p for p in piezas if p.type == "MESH" and (
        p.name in ("fuselaje", "gondola", "ala") or p.name.startswith("flap-"))])
    piezas += patas

    piezas.append(centro_de_gravedad(ALA_Z + 0.55))
    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
