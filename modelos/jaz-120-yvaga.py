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

Los ayudantes están en `comun.py`. Aquí queda solo lo que es **este** avión.

    blender --background --python modelos/jaz-120-yvaga.py

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
# De `src/flight/aircraft.ts`, y de ahí de la CR-2144: envergadura 59,64 m y
# cuerda media 8,32. El largo no lo fija la ficha —el modelo de vuelo no lo
# usa— y sale de la proporción de un cuatrimotor de fuselaje ancho.
ENVERGADURA = 59.64
CUERDA = 8.32
LARGO = 68.0
ALTO_FUSELAJE = 6.50
ANCHO_FUSELAJE = 6.50

ALA_Y = -1.70
ALA_Z = 4.60
# Treinta y cinco grados de flecha, que es lo que lleva un avión que cruza a
# ochocientos por hora. Con casi treinta metros de media envergadura son
# veintiún metros de desplazamiento de la punta.
FLECHA = 20.80
DIEDRO = math.radians(6)

# Los cuatro motores, por su distancia al eje. **No están repartidos a partes
# iguales**: los de dentro van más cerca entre sí de lo que van del par de
# fuera, que es como se cuelgan de verdad —el de fuera manda sobre la flexión
# del ala y el de dentro sobre la guiñada si se para—.
MOTORES = (10.60, 20.40)
RUEDA_Y = -5.15

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-120.glb",
)

# ── El fuselaje, aro a aro ────────────────────────────────────────────────
#
# Sección constante desde el morro hasta el arranque del cono de cola: es un
# tubo. Sin joroba, a propósito. Ver la cabecera.
AROS = [
    (-LARGO * 0.50, ANCHO_FUSELAJE * 0.14, ALTO_FUSELAJE * 0.18, 0.20),
    (-LARGO * 0.475, ANCHO_FUSELAJE * 0.52, ALTO_FUSELAJE * 0.54, 0.14),
    (-LARGO * 0.45, ANCHO_FUSELAJE * 0.82, ALTO_FUSELAJE * 0.82, 0.06),
    (-LARGO * 0.40, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
    (LARGO * 0.24, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
    (LARGO * 0.34, ANCHO_FUSELAJE * 0.92, ALTO_FUSELAJE * 0.94, 0.06),
    (LARGO * 0.43, ANCHO_FUSELAJE * 0.62, ALTO_FUSELAJE * 0.68, 0.30),
    (LARGO * 0.48, ANCHO_FUSELAJE * 0.26, ALTO_FUSELAJE * 0.32, 0.58),
    (LARGO * 0.50, ANCHO_FUSELAJE * 0.10, ALTO_FUSELAJE * 0.16, 0.72),
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
        (-30.60, -0.22, 0.12),
        (-29.10, 0.16, 0.36),
        (-27.20, 0.16, 0.36),
        (-25.60, 0.10, 0.26),
        (-24.00, -0.22, 0.08),
    ]
    aros = []
    for z, gordo, sube in tramo:
        ancho, alto, y = aro(z)
        aros.append((z, ancho + gordo, alto + gordo, y + sube))
    return perfil("parabrisas", aros, "cristal")


def rueda(nombre, en, diametro, ancho=0.40):
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

    # Cincuenta y tantas ventanillas por costado, en una sola pieza. Ver
    # `ventanillas` en `comun.py`: sueltas serían más nodos que el avión.
    piezas += ventanillas(
        piel_x=ANCHO_FUSELAJE * 0.50, z_desde=-22.50, z_hasta=22.50, cada=1.05,
        y_centro=0.90, alto=0.52, largo=0.44,
    )

    piezas += cabina(
        ojos_z=-27.40,
        ancho=0.80,
        alto_panel=0.26,
        y_suelo=-0.66,
        y_respaldo=0.34,
        plazas=(-0.46, 0.46),
        pantallas_en=0.46,
        palancas=4,
        relojes=16,
        suelo_atras=2.20,
    )

    # ── Ala en flecha ─────────────────────────────────────────────────────
    plano = ala("ala", ENVERGADURA / 2, CUERDA * 1.55, CUERDA * 0.42,
                CUERDA * 0.11, en=(0, ALA_Y, ALA_Z),
                flecha=FLECHA, diedro=DIEDRO)
    piezas.append(suavizar(plano, subdividir=1))

    # ── Los cuatro motores ────────────────────────────────────────────────
    #
    # Su sitio a lo largo sale de la flecha y su altura del diedro, igual que
    # en el Arai: cuanto más afuera, más atrás y más arriba está el ala, así
    # que el motor la sigue. Escrito así, cambiar la flecha mueve los cuatro
    # motores con ella en vez de dejarlos flotando.
    for lado in (-1, 1):
        for n, x in enumerate(MOTORES):
            donde_ala = ALA_Z + (x / (ENVERGADURA / 2)) * FLECHA
            alto_ala = ALA_Y + x * math.tan(DIEDRO)
            # El de fuera, un poco más adelantado que el de dentro: es como
            # cuelgan, y además es lo que hace que se cuenten cuatro y no dos
            # cuando el avión se mira desde delante.
            adelanto = 1.30 if n else 0.0
            piezas += turbofan(
                f"motor-{lado}-{n}",
                (lado * x, alto_ala - 2.05, donde_ala - 6.20 - adelanto),
                largo=6.60, diametro=3.40,
            )
            piezas.append(
                pilon(f"pilon-{lado}-{n}", lado * x,
                      donde_ala - 6.00 - adelanto, donde_ala + 2.20,
                      alto_ala - 1.70, alto_ala + 0.25, grosor=0.42)
            )

    # ── Cola ──────────────────────────────────────────────────────────────
    deriva = ala("deriva", 10.60, CUERDA * 1.75, CUERDA * 0.72, CUERDA * 0.08,
                 en=(0, ALTO_FUSELAJE * 0.32, LARGO * 0.34),
                 flecha=CUERDA * 1.25, material_="capo")
    deriva.rotation_euler = (0, 0, math.radians(90))
    deriva.modifiers.remove(deriva.modifiers["simetria"])
    piezas.append(suavizar(deriva, subdividir=1))

    estabilizador = ala("estabilizador", ENVERGADURA * 0.185, CUERDA * 0.82,
                        CUERDA * 0.38, CUERDA * 0.07,
                        en=(0, ALTO_FUSELAJE * 0.18, LARGO * 0.415),
                        flecha=CUERDA * 0.66, diedro=math.radians(7))
    piezas.append(suavizar(estabilizador, subdividir=1))

    # ── Tren ──────────────────────────────────────────────────────────────
    #
    # Cuatro patas principales y la de morro: dos en la panza y dos en el ala,
    # que es como reparte el peso un avión de doscientas cincuenta toneladas —
    # dieciséis ruedas principales, que aquí son cuatro por pata—. Sale, como
    # en todos: nada lo recoge todavía.
    piezas.append(
        cilindro("pata-morro", 0.20, 2.40, (0, -3.30, -LARGO * 0.40))
    )
    for atras in (-1, 1):
        piezas.append(
            rueda("rueda-morro" if atras < 0 else "rueda-morro-2",
                  (0, RUEDA_Y + 0.62, -LARGO * 0.40 + atras * 0.70), 1.24)
        )
    for lado in (-1, 1):
        for x, z in ((3.30, ALA_Z + 4.10), (6.30, ALA_Z + 2.60)):
            piezas.append(
                cilindro(f"pata-{lado}-{x:.0f}", 0.26, 2.60, (lado * x, -3.50, z))
            )
            for atras in (-1, 1):
                for fuera in (-1, 1):
                    piezas.append(
                        rueda(f"rueda-{lado}-{x:.0f}-{atras}-{fuera}",
                              (lado * x + fuera * 0.62,
                               RUEDA_Y + 0.68, z + atras * 0.80),
                              1.36, ancho=0.46)
                    )

    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
