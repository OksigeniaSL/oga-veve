"""
El JAZ 25 *Mainumby*, modelado en Blender.

Se hace aquí y no con la fábrica paramétrica del juego —`fabrica-de-aeronaves.ts`—
porque es el techo que #68 escribió de antemano: «cuando ajustar una silueta
exija recompilar y tantear números en vez de arrastrar vértices, Blender gana».
Se tantearon números cinco veces y el avión seguía siendo losas naranjas con las
aristas duras y el fuselaje abierto por dentro.

Lo que Blender da y la fábrica no puede dar:

- **Superficies de subdivisión.** Un fuselaje es una superficie continua, no una
  tira de anillos cosidos. Con subdivisión se modela la silueta con ocho aros y
  sale una forma suave.
- **Biselado.** Ninguna arista de un avión de verdad es un canto vivo. Es lo que
  más separa una maqueta de una caja.
- **Simetría por modificador.** Se modela media ala y la otra media es la misma,
  siempre, sin poder desviarse.
- **Sombreado suave con ángulo.** Suaviza la chapa y deja vivas las aristas que
  de verdad lo son: el borde de ataque, la juntura del capó.

Los ayudantes —materiales, perfiles, alas, cabina, exportación— están en
`comun.py`, porque este fue el primero de cinco y copiarlos cuatro veces sería
garantizar que los cinco se desvíen. Aquí queda **solo lo que es este avión**.

Se ejecuta sin ventana y escribe el glTF donde el juego lo busca:

    blender --background --python modelos/jaz-25-mainumby.py

El juego lo carga solo si está —`world/aeronave-modelo.ts`— y si no, sigue con
la fábrica. Que falte un recurso no puede dejar a nadie sin volar.
"""

import bpy
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import (  # noqa: E402
    ala, cabina, cilindro, exportar, helice, limpiar, montante, perfil,
    pintar, suavizar,
)
from mathutils import Vector  # noqa: E402

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# Salen de `src/flight/aircraft.ts`: envergadura 12,5 m y cuerda 1,7. El juego
# reescala el modelo a la envergadura de la ficha al cargarlo, así que modelar
# con las de verdad es lo único que garantiza que no se deforme.
ENVERGADURA = 12.5
CUERDA = 1.7
LARGO = 8.2
ALTO_FUSELAJE = 1.30
ANCHO_FUSELAJE = 1.15
# El hueco entre alas de un biplano: lo que lo hace biplano.
HUECO = 1.55
# Dónde va cada plano, medido desde el eje del fuselaje.
#
# **El ala de arriba tiene que pasar por encima de la cabina**, y no pasaba: la
# dejaba a 0,96 y el techo del cristal llega a 1,03, así que el plano cruzaba
# por dentro de la carlinga. Desde el asiento eso es todo lo que se veía —un
# techo oscuro a ocho centímetros de la cabeza y ni rastro del mundo—, que es
# la mitad de «JAZ 25 no tiene panel de mandos»: no es solo que faltara el
# panel, es que tampoco había por dónde mirar.
#
# A 1,25 el intradós queda a 1,17, un palmo largo por encima del cristal y
# treinta centímetros por encima de los ojos: se ve el suelo por debajo del
# plano, que es como se vuela un fumigador de verdad.
ALA_ALTA = 1.25
ALA_BAJA = -HUECO * 0.38
# **Y el tren, alto, porque la hélice es grande.**
#
# Estaba en 1,05 y con eso el eje de la hélice quedaba a un metro escaso del
# suelo: una hélice de dos metros sesenta se clavaría treinta centímetros en el
# asfalto. Un fumigador de verdad va alto justamente por eso — y por eso tiene
# esa pinta de zanco. A 1,70 la punta de pala pasa a cuarenta centímetros del
# suelo, y además cuadra con el 1,8 de su ficha de vuelo.
TREN = 1.70

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-25.glb",
)


def construir():
    limpiar()
    piezas = []

    # ── Fuselaje ──────────────────────────────────────────────────────────
    #
    # Ocho aros: morro afilado, hombros anchos donde va la cabina, y afinando
    # hasta la cola. Con subdivisión esto es una superficie, no un tubo.
    cuerpo = perfil("fuselaje", [
        (-LARGO * 0.50, ANCHO_FUSELAJE * 0.42, ALTO_FUSELAJE * 0.46, 0.02),
        (-LARGO * 0.42, ANCHO_FUSELAJE * 0.86, ALTO_FUSELAJE * 0.90, 0.00),
        (-LARGO * 0.26, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
        (-LARGO * 0.06, ANCHO_FUSELAJE * 0.96, ALTO_FUSELAJE * 0.98, -0.01),
        (LARGO * 0.12, ANCHO_FUSELAJE * 0.80, ALTO_FUSELAJE * 0.82, -0.02),
        (LARGO * 0.30, ANCHO_FUSELAJE * 0.52, ALTO_FUSELAJE * 0.58, -0.02),
        (LARGO * 0.44, ANCHO_FUSELAJE * 0.26, ALTO_FUSELAJE * 0.34, 0.00),
        (LARGO * 0.50, ANCHO_FUSELAJE * 0.14, ALTO_FUSELAJE * 0.22, 0.02),
    ])
    piezas.append(suavizar(cuerpo, subdividir=2, biselar=0))

    # ── Capó del radial ───────────────────────────────────────────────────
    #
    # Un fumigador lleva un radial de nueve cilindros: ancho, corto y romo. Es
    # media silueta del avión.
    capo = perfil("capo", [
        (-LARGO * 0.53, ANCHO_FUSELAJE * 0.70, ANCHO_FUSELAJE * 0.70, 0.02),
        (-LARGO * 0.50, ANCHO_FUSELAJE * 1.16, ANCHO_FUSELAJE * 1.16, 0.02),
        (-LARGO * 0.44, ANCHO_FUSELAJE * 1.18, ANCHO_FUSELAJE * 1.18, 0.02),
        (-LARGO * 0.38, ANCHO_FUSELAJE * 1.02, ANCHO_FUSELAJE * 1.02, 0.01),
    ], "capo")
    piezas.append(suavizar(capo, subdividir=2, biselar=0))

    # ── Cabina abierta ────────────────────────────────────────────────────
    #
    # Un fumigador va con la cabina alta y acristalada para ver el cultivo. El
    # cristal es un material, no un agujero.
    carlinga = perfil("cabina", [
        (-LARGO * 0.20, ANCHO_FUSELAJE * 0.62, ALTO_FUSELAJE * 0.52, ALTO_FUSELAJE * 0.44),
        (-LARGO * 0.10, ANCHO_FUSELAJE * 0.78, ALTO_FUSELAJE * 0.66, ALTO_FUSELAJE * 0.46),
        (LARGO * 0.02, ANCHO_FUSELAJE * 0.72, ALTO_FUSELAJE * 0.58, ALTO_FUSELAJE * 0.42),
    ], "cristal")
    piezas.append(suavizar(carlinga, subdividir=2, biselar=0))

    # Y lo de dentro. Una sola plaza: un fumigador lleva al piloto y nada más.
    piezas += cabina(
        ojos_z=-0.90, palancas=1, relojes=6, mando="palanca",
    )

    # ── Las dos alas ──────────────────────────────────────────────────────
    arriba = ala("ala-alta", ENVERGADURA / 2, CUERDA, CUERDA * 0.86, CUERDA * 0.13,
                 en=(0, ALA_ALTA, -LARGO * 0.13), diedro=math.radians(1.5))
    abajo = ala("ala-baja", ENVERGADURA * 0.46, CUERDA * 0.94, CUERDA * 0.80,
                CUERDA * 0.12, en=(0, ALA_BAJA, -LARGO * 0.02),
                diedro=math.radians(2.5))
    piezas += [suavizar(arriba, subdividir=1), suavizar(abajo, subdividir=1)]

    # Los montantes: lo que dice «biplano» es el hueco **con algo dentro**.
    for lado in (-1, 1):
        for dz in (-CUERDA * 0.30, CUERDA * 0.28):
            piezas.append(
                montante(lado * ENVERGADURA * 0.30, -LARGO * 0.07 + dz,
                         ALA_BAJA, ALA_ALTA)
            )

    # Y las cabañas, del fuselaje al ala de arriba. Con el plano subido por
    # encima de la carlinga hay medio metro de aire entre los dos, y sin nada
    # que lo cruce el ala parece puesta ahí con alfileres.
    for lado in (-1, 1):
        for dz in (-CUERDA * 0.34, CUERDA * 0.20):
            piezas.append(
                montante(lado * 0.34, -LARGO * 0.13 + dz,
                         ALTO_FUSELAJE * 0.50, ALA_ALTA, grosor=0.035)
            )

    # ── Cola ──────────────────────────────────────────────────────────────
    estabilizador = ala("estabilizador", ENVERGADURA * 0.20, CUERDA * 0.64,
                        CUERDA * 0.42, CUERDA * 0.09,
                        en=(0, ALTO_FUSELAJE * 0.10, LARGO * 0.40))
    piezas.append(suavizar(estabilizador, subdividir=1))

    deriva = ala("deriva", HUECO * 0.72, CUERDA * 0.80, CUERDA * 0.40,
                 CUERDA * 0.08, en=(0, ALTO_FUSELAJE * 0.18, LARGO * 0.41),
                 flecha=CUERDA * 0.30, material_="capo")
    deriva.rotation_euler = (0, 0, math.radians(90))
    deriva.modifiers.remove(deriva.modifiers["simetria"])
    piezas.append(suavizar(deriva, subdividir=1))

    # ── Tren fijo, con carenado ───────────────────────────────────────────
    #
    # **Por `cilindro` y con nombre**, no con una llamada suelta a Blender.
    # Estas tres piezas se creaban a mano y salían tumbadas a lo largo del
    # fuselaje —como todo lo que Blender crea sin girar, ver `cilindro`—, y
    # además sin nombre: se llamaban `Cylinder.008` y siguientes, así que la
    # comprobación de orientación de `exportar`, que mira el nombre porque en
    # esta casa el nombre dice lo que la pieza es, pasaba de largo por ellas.
    for lado in (-1, 1):
        piezas.append(
            cilindro(
                f"pata-{lado}",
                0.05,
                TREN * 0.78,
                (lado * ENVERGADURA * 0.11, -TREN * 0.42, -LARGO * 0.10),
            )
        )
        rueda = perfil(f"rueda-{lado}", [
            (-0.07, TREN * 0.46, TREN * 0.46, 0),
            (0.07, TREN * 0.46, TREN * 0.46, 0),
        ], "goma")
        rueda.rotation_euler = (0, math.radians(90), 0)
        rueda.location = Vector((lado * ENVERGADURA * 0.11, -TREN * 0.77, -LARGO * 0.10))
        piezas.append(suavizar(rueda, subdividir=2, biselar=0))
    # Patín de cola: un fumigador es de rueda atrás.
    piezas.append(
        cilindro(
            "pata-de-cola",
            0.04,
            TREN * 0.34,
            (0, -TREN * 0.26, LARGO * 0.42),
            lados=6,
        )
    )

    # ── Hélice ────────────────────────────────────────────────────────────
    #
    # **Tres palas y dos metros sesenta de diámetro**, que es lo que mueve un
    # radial de fumigador y lo que dice su propia ficha (`appearance.blades`).
    #
    # Aquí había una hélice de la mitad: el radio se copió de `RADIO_DE_HELICE`
    # —la constante del respaldo de cajas, donde ese número **es** un radio
    # porque la pala se desplaza hacia fuera— y aquí la barra iba centrada en
    # el buje, así que el mismo número pasaba a ser el diámetro. Y las «dos»
    # palas eran la misma barra girada media vuelta: una pintada encima de
    # otra, con la misma geometría y el mismo material.
    piezas += helice(
        "helice", (0, 0.02, -LARGO * 0.57), radio=1.30, palas=3, buje=0.22
    )

    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
