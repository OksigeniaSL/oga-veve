"""
El JAZ 20 *Pykasu*, modelado en Blender.

**El último de la flota en dejar de ser de otro.** Los otros cinco se
construyen aquí desde el primer día; éste era un `.glb` descargado —una Cessna
172 de Sketchfab, con su nombre y su silueta— y la pantalla de créditos tenía
que decirlo. O sea que el avión que vuela todo el mundo el primer día era el
único que contradecía la regla de la casa: los datos de vuelo de una aeronave
real son hechos y se usan; su nombre y su silueta, no.

Lo que queda es la **clase**, que no es de nadie: monomotor de ala alta
arriostrada, tren triciclo fijo y cuatro plazas. Esa es la forma de la mitad de
las avionetas del mundo desde los años cincuenta, y es la que hay que reconocer
al mirarla.

Se ejecuta sin ventana y escribe el glTF donde el juego lo busca:

    blender --background --python modelos/jaz-20-pykasu.py

Los ayudantes están en `comun.py`. Aquí queda solo lo que es este avión.
"""

import bpy  # noqa: F401
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import (  # noqa: E402
    ala, cabina, cilindro, exportar, helice, limpiar, montante, perfil,
    suavizar, ventanillas,
)
from mathutils import Vector  # noqa: E402

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# Salen de `src/flight/aircraft.ts`: envergadura 11,0 m y cuerda 1,5. El juego
# reescala el modelo a la envergadura de la ficha al cargarlo, así que modelar
# con las de verdad es lo único que garantiza que no se deforme.
ENVERGADURA = 11.0
CUERDA = 1.5
LARGO = 8.28
ALTO_FUSELAJE = 1.24
ANCHO_FUSELAJE = 1.02

# **El ala va encima de la cabina, que es lo que hace a este avión lo que es.**
#
# Y tiene que pasar por encima del cristal de verdad, no por dentro: el techo
# de la carlinga llega a 1,08, así que el plano se pone a 1,16 y el intradós
# queda justo encima. Desde el asiento se ve el suelo por debajo del ala, que
# es exactamente la ventaja de un ala alta y la razón de que se enseñe a volar
# en aviones así.
ALA_ALTA = 1.16

# **El tren: 1,40, que es el `gearHeight` de su ficha.**
#
# No es una elección de estilo. El juego coloca el origen del avión a esa
# altura sobre el terreno, así que si la rueda del modelo no cae exactamente
# ahí, el avión aparece flotando o enterrado — y hay un banco que lo mide
# («el avión parado tiene las ruedas en el suelo»).
TREN = 1.40
RUEDA = 0.22
# La batalla de la ficha: 1,65 m de la rueda de morro a las principales. De
# aquí sale el radio de giro con el que el juego decide si este avión puede
# darse la vuelta en una pista. Ver `flight/cabe.ts`.
BATALLA = 1.65
MAINS_Z = LARGO * 0.06
MORRO_Z = MAINS_Z - BATALLA

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-20.glb",
)


def construir():
    limpiar()
    piezas = []

    # ── Fuselaje ──────────────────────────────────────────────────────────
    #
    # Nueve aros: morro corto y romo —detrás va un motor de cuatro cilindros
    # opuestos, que es ancho y plano—, cabina alta, y una cola larga y fina.
    cuerpo = perfil("fuselaje", [
        (-LARGO * 0.50, ANCHO_FUSELAJE * 0.46, ALTO_FUSELAJE * 0.40, 0.06),
        (-LARGO * 0.44, ANCHO_FUSELAJE * 0.82, ALTO_FUSELAJE * 0.70, 0.03),
        (-LARGO * 0.34, ANCHO_FUSELAJE * 0.98, ALTO_FUSELAJE * 0.86, 0.00),
        (-LARGO * 0.16, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 0.94, -0.01),
        (LARGO * 0.02, ANCHO_FUSELAJE * 0.96, ALTO_FUSELAJE * 0.90, -0.02),
        (LARGO * 0.18, ANCHO_FUSELAJE * 0.74, ALTO_FUSELAJE * 0.72, -0.02),
        (LARGO * 0.32, ANCHO_FUSELAJE * 0.48, ALTO_FUSELAJE * 0.52, 0.00),
        (LARGO * 0.44, ANCHO_FUSELAJE * 0.28, ALTO_FUSELAJE * 0.36, 0.04),
        (LARGO * 0.50, ANCHO_FUSELAJE * 0.16, ALTO_FUSELAJE * 0.26, 0.08),
    ])
    piezas.append(suavizar(cuerpo, subdividir=2, biselar=0))

    # ── Capó ──────────────────────────────────────────────────────────────
    #
    # Corto y con la cara plana: un cuatro cilindros opuesto va tumbado y no
    # necesita más morro que el suyo. Es la mitad de la silueta de un avión de
    # escuela — lo otro es el ala alta.
    capo = perfil("capo", [
        (-LARGO * 0.56, ANCHO_FUSELAJE * 0.34, ANCHO_FUSELAJE * 0.30, 0.08),
        (-LARGO * 0.52, ANCHO_FUSELAJE * 0.74, ANCHO_FUSELAJE * 0.60, 0.07),
        (-LARGO * 0.44, ANCHO_FUSELAJE * 0.92, ANCHO_FUSELAJE * 0.68, 0.04),
        (-LARGO * 0.34, ANCHO_FUSELAJE * 0.98, ANCHO_FUSELAJE * 0.72, 0.01),
    ], "capo")
    piezas.append(suavizar(capo, subdividir=2, biselar=0))

    # ── Carlinga ──────────────────────────────────────────────────────────
    #
    # Acristalada por delante y por los lados, que en un ala alta es de donde
    # viene la vista. El cristal es un material, no un agujero.
    carlinga = perfil("cabina", [
        (-LARGO * 0.30, ANCHO_FUSELAJE * 0.62, ALTO_FUSELAJE * 0.50, ALTO_FUSELAJE * 0.52),
        (-LARGO * 0.18, ANCHO_FUSELAJE * 0.90, ALTO_FUSELAJE * 0.76, ALTO_FUSELAJE * 0.42),
        (-LARGO * 0.02, ANCHO_FUSELAJE * 0.94, ALTO_FUSELAJE * 0.78, ALTO_FUSELAJE * 0.40),
        (LARGO * 0.14, ANCHO_FUSELAJE * 0.72, ALTO_FUSELAJE * 0.58, ALTO_FUSELAJE * 0.40),
    ], "cristal")
    piezas.append(suavizar(carlinga, subdividir=2, biselar=0))

    # Las ventanillas de atrás, que es lo que dice «van cuatro dentro».
    piezas += ventanillas(
        ANCHO_FUSELAJE * 0.97, LARGO * 0.04, LARGO * 0.20, LARGO * 0.08,
        ALTO_FUSELAJE * 0.62, alto=0.26,
    )

    # Y lo de dentro: dos plazas delante, que son las que se pilotan.
    #
    # Sin palancas de pedestal —en una avioneta el gas es un pomo en el
    # tablero— y con los seis relojes del panel, que aquí son *los* seis.
    piezas += cabina(
        ojos_z=-LARGO * 0.10,
        ancho=ANCHO_FUSELAJE * 0.86,
        alto_panel=ALTO_FUSELAJE * 0.60,
        y_suelo=-0.10,
        y_respaldo=0.52,
        plazas=(-0.26, 0.26),
        pantallas_en=0.26,
        relojes=6,
    )

    # ── Ala alta, arriostrada ─────────────────────────────────────────────
    plano = ala("ala", ENVERGADURA / 2, CUERDA, CUERDA * 0.82, CUERDA * 0.13,
                en=(0, ALA_ALTA, -LARGO * 0.02), diedro=math.radians(1.7))
    piezas.append(suavizar(plano, subdividir=1))

    # **Y su montante, que es media silueta de este avión.** Va del costado
    # bajo del fuselaje al ala, a media envergadura: es lo que permite que un
    # ala alta sea ligera, y lo que se ve desde la ventanilla toda la vida.
    for lado in (-1, 1):
        piezas.append(
            montante(
                lado * ENVERGADURA * 0.27,
                -LARGO * 0.02,
                -ALTO_FUSELAJE * 0.30,
                ALA_ALTA - CUERDA * 0.05,
                grosor=0.05,
            )
        )

    # ── Cola ──────────────────────────────────────────────────────────────
    estabilizador = ala("estabilizador", ENVERGADURA * 0.30, CUERDA * 0.72,
                        CUERDA * 0.48, CUERDA * 0.09,
                        en=(0, ALTO_FUSELAJE * 0.24, LARGO * 0.42))
    piezas.append(suavizar(estabilizador, subdividir=1))

    deriva = ala("deriva", ALTO_FUSELAJE * 0.98, CUERDA * 0.92, CUERDA * 0.46,
                 CUERDA * 0.08, en=(0, ALTO_FUSELAJE * 0.26, LARGO * 0.38),
                 flecha=CUERDA * 0.42, material_="capo")
    deriva.rotation_euler = (0, 0, math.radians(90))
    deriva.modifiers.remove(deriva.modifiers["simetria"])
    piezas.append(suavizar(deriva, subdividir=1))

    # ── Tren triciclo fijo ────────────────────────────────────────────────
    #
    # Con rueda de morro, que es lo que hace que se aprenda a rodar mirando
    # por dónde se va en vez de en zigzag. Las principales cuelgan de dos
    # patas de ballesta —aquí, dos cilindros inclinados no: rectos, que a esta
    # escala se ve igual y la comprobación de orientación de `exportar` mide
    # que lo que se llama «pata» esté de pie.
    for lado in (-1, 1):
        piezas.append(
            cilindro(
                f"pata-{lado}",
                0.045,
                TREN - RUEDA,
                (lado * ENVERGADURA * 0.15, -(TREN - RUEDA) * 0.5, MAINS_Z),
            )
        )
        rueda = perfil(f"rueda-{lado}", [
            (-0.08, RUEDA, RUEDA, 0),
            (0.08, RUEDA, RUEDA, 0),
        ], "goma")
        rueda.rotation_euler = (0, math.radians(90), 0)
        rueda.location = Vector(
            (lado * ENVERGADURA * 0.15, -(TREN - RUEDA), MAINS_Z)
        )
        piezas.append(suavizar(rueda, subdividir=2, biselar=0))

    piezas.append(
        cilindro(
            "pata-de-morro",
            0.04,
            TREN - RUEDA * 0.9,
            (0, -(TREN - RUEDA * 0.9) * 0.5, MORRO_Z),
        )
    )
    morro = perfil("rueda-de-morro", [
        (-0.06, RUEDA * 0.9, RUEDA * 0.9, 0),
        (0.06, RUEDA * 0.9, RUEDA * 0.9, 0),
    ], "goma")
    morro.rotation_euler = (0, math.radians(90), 0)
    morro.location = Vector((0, -(TREN - RUEDA * 0.9), MORRO_Z))
    piezas.append(suavizar(morro, subdividir=2, biselar=0))

    # ── Hélice ────────────────────────────────────────────────────────────
    #
    # Dos palas y un metro noventa de diámetro, que es lo que mueve un motor
    # de esta potencia. Con el eje a 0,06 sobre la línea del fuselaje, la punta
    # de pala pasa a un palmo largo del suelo, como en el avión de verdad.
    piezas += helice(
        "helice", (0, 0.06, -LARGO * 0.575), radio=0.95, palas=2, buje=0.17
    )

    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
