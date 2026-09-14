"""
El JAZ 90 *Arai*, modelado en Blender.

El reactor: treinta toneladas, ala en flecha y dos turbofanes colgados del ala.
Es el único de la flota que va por encima de las nubes, y de ahí el nombre —
*arai* es nube en guaraní. Ver `flota.ts`.

**Lo que lo separa del Arasunu a simple vista son dos cosas**, y las dos están
modeladas aquí a propósito:

- **El ala va en flecha.** Un ala recta y un ala flechada se distinguen desde
  el suelo sin saber nada de aviones, y es lo primero que dice «este va
  rápido».
- **No tiene hélices.** Dos góndolas cortas y gordas bajo el ala, con la boca
  negra. Un turbofán moderno es tan ancho como largo, y eso también se cuenta.

Los ayudantes están en `comun.py`. Aquí queda solo lo que es **este** avión.

    blender --background --python modelos/jaz-90-arai.py

Si el fichero no está, el juego sigue con la fábrica: que falte un recurso no
puede dejar a nadie sin volar.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import (  # noqa: E402
    ala, cabina, cilindro, exportar, limpiar, perfil, pilon, suavizar,
    turbofan, ventanillas,
)
from mathutils import Vector  # noqa: E402

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# De `src/flight/aircraft.ts`: envergadura 26 m, cuerda 3,0, treinta toneladas
# y setenta y dos metros cuadrados de ala.
ENVERGADURA = 26.0
CUERDA = 3.0
LARGO = 31.5
ALTO_FUSELAJE = 3.30
ANCHO_FUSELAJE = 3.00

ALA_Y = -1.05
ALA_Z = 2.20
# La flecha: cuánto se va hacia atrás la punta del ala respecto de la raíz.
# Con trece metros de media envergadura, cinco y medio son veintitrés grados,
# que es lo que lleva un reactor de línea corta.
FLECHA = 5.50
DIEDRO = math.radians(5)

MOTOR = 4.40
RUEDA_Y = -2.78

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-90.glb",
)

# ── El fuselaje, aro a aro ────────────────────────────────────────────────
AROS = [
    (-LARGO * 0.50, ANCHO_FUSELAJE * 0.16, ALTO_FUSELAJE * 0.20, 0.16),
    (-LARGO * 0.46, ANCHO_FUSELAJE * 0.54, ALTO_FUSELAJE * 0.56, 0.10),
    (-LARGO * 0.42, ANCHO_FUSELAJE * 0.84, ALTO_FUSELAJE * 0.84, 0.04),
    (-LARGO * 0.36, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
    (LARGO * 0.20, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
    (LARGO * 0.32, ANCHO_FUSELAJE * 0.90, ALTO_FUSELAJE * 0.92, 0.04),
    (LARGO * 0.42, ANCHO_FUSELAJE * 0.60, ALTO_FUSELAJE * 0.66, 0.16),
    (LARGO * 0.47, ANCHO_FUSELAJE * 0.28, ALTO_FUSELAJE * 0.34, 0.30),
    (LARGO * 0.50, ANCHO_FUSELAJE * 0.12, ALTO_FUSELAJE * 0.18, 0.38),
]


def aro(z):
    """Cuánto mide el fuselaje a esa altura del morro. Interpolando los aros."""
    for (z0, a0, h0, y0), (z1, a1, h1, y1) in zip(AROS, AROS[1:]):
        if z <= z1 or (z1, a1, h1, y1) == AROS[-1]:
            t = max(0.0, min(1.0, (z - z0) / (z1 - z0)))
            return (a0 + (a1 - a0) * t, h0 + (h1 - h0) * t, y0 + (y1 - y0) * t)
    raise AssertionError


def carlinga():
    """El parabrisas: la piel del fuselaje, más gorda y subida. Ver el Panambi."""
    tramo = [
        (-14.10, -0.10, 0.06),
        (-13.40, 0.08, 0.17),
        (-12.50, 0.08, 0.17),
        (-11.70, 0.05, 0.12),
        (-10.90, -0.10, 0.04),
    ]
    aros = []
    for z, gordo, sube in tramo:
        ancho, alto, y = aro(z)
        aros.append((z, ancho + gordo, alto + gordo, y + sube))
    return perfil("parabrisas", aros, "cristal")


def rueda(nombre, en, diametro, ancho=0.28):
    """Una rueda: un cilindro achatado puesto de canto."""
    r = perfil(nombre, [
        (-ancho / 2, diametro, diametro, 0),
        (ancho / 2, diametro, diametro, 0),
    ], "goma")
    r.rotation_euler = (0, math.radians(90), 0)
    r.location = Vector(en)
    return suavizar(r, subdividir=2, biselar=0)


def construir():
    limpiar()
    piezas = []

    piezas.append(suavizar(perfil("fuselaje", AROS), subdividir=2, biselar=0))
    piezas.append(suavizar(carlinga(), subdividir=2, biselar=0))

    piezas += ventanillas(
        piel_x=ANCHO_FUSELAJE * 0.50, z_desde=-10.20, z_hasta=9.60, cada=0.85,
        y_centro=0.45, alto=0.42, largo=0.36,
    )

    piezas += cabina(
        ojos_z=-12.60,
        ancho=0.68,
        alto_panel=0.22,
        y_suelo=-0.60,
        y_respaldo=0.30,
        plazas=(-0.40, 0.40),
        pantallas_en=0.40,
        palancas=2,
        relojes=12,
        clase="reactor",
        suelo_atras=1.80,
    )

    # ── Ala en flecha ─────────────────────────────────────────────────────
    plano = ala("ala", ENVERGADURA / 2, CUERDA * 1.40, CUERDA * 0.53,
                CUERDA * 0.12, en=(0, ALA_Y, ALA_Z),
                flecha=FLECHA, diedro=DIEDRO)
    piezas.append(suavizar(plano, subdividir=1))

    # ── Los dos turbofanes ────────────────────────────────────────────────
    #
    # Por delante y por debajo del ala, que es donde cuelgan: **el motor tiene
    # que estar delante del borde de ataque** o el chorro del fan sopla contra
    # el ala. Como el ala va en flecha, la estación del motor está más atrás
    # cuanto más afuera, y por eso su z sale de la flecha y no de un número
    # escrito aparte: mover la flecha mueve los motores con ella.
    donde_ala = ALA_Z + (MOTOR / (ENVERGADURA / 2)) * FLECHA
    alto_ala = ALA_Y + MOTOR * math.tan(DIEDRO)
    for lado in (-1, 1):
        piezas += turbofan(
            f"motor-{lado}",
            (lado * MOTOR, alto_ala - 0.88, donde_ala - 2.50),
            largo=3.40, diametro=1.78,
        )
        piezas.append(
            pilon(f"pilon-{lado}", lado * MOTOR,
                  donde_ala - 2.30, donde_ala + 1.40,
                  alto_ala - 0.72, alto_ala + 0.12, grosor=0.22)
        )

    # ── Cola ──────────────────────────────────────────────────────────────
    #
    # Deriva en flecha y estabilizador **en el fuselaje**, no en su punta: la
    # cola en T es del JAZ 60 y son dos siluetas distintas a propósito. Al lado
    # el uno del otro tienen que poder contarse.
    deriva = ala("deriva", 5.60, CUERDA * 1.70, CUERDA * 0.80, CUERDA * 0.09,
                 en=(0, ALTO_FUSELAJE * 0.30, LARGO * 0.34),
                 flecha=CUERDA * 1.15, material_="capo")
    deriva.rotation_euler = (0, 0, math.radians(90))
    deriva.modifiers.remove(deriva.modifiers["simetria"])
    piezas.append(suavizar(deriva, subdividir=1))

    estabilizador = ala("estabilizador", ENVERGADURA * 0.195, CUERDA * 0.88,
                        CUERDA * 0.42, CUERDA * 0.08,
                        en=(0, ALTO_FUSELAJE * 0.16, LARGO * 0.415),
                        flecha=CUERDA * 0.60, diedro=math.radians(4))
    piezas.append(suavizar(estabilizador, subdividir=1))

    # ── Tren ──────────────────────────────────────────────────────────────
    #
    # Sale, como en los otros: nada lo recoge todavía. El principal va en la
    # panza —aquí las góndolas cuelgan del ala y no hay dónde meterlo— con dos
    # ruedas por pata, que es lo que lleva un avión de treinta toneladas.
    piezas.append(
        cilindro("pata-morro", 0.095, 1.20, (0, -1.72, -LARGO * 0.365))
    )
    piezas.append(
        rueda("rueda-morro", (0, RUEDA_Y + 0.36, -LARGO * 0.365), 0.72)
    )
    for lado in (-1, 1):
        piezas.append(
            cilindro(f"pata-{lado}", 0.115, 1.30, (lado * 1.90, -1.78, ALA_Z + 1.60))
        )
        for atras in (-1, 1):
            piezas.append(
                rueda(f"rueda-{lado}-{atras}",
                      (lado * 1.90, RUEDA_Y + 0.46, ALA_Z + 1.60 + atras * 0.52),
                      0.92, ancho=0.30)
            )

    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
