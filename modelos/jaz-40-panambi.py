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

Los ayudantes están en `comun.py`. Aquí queda solo lo que es **este** avión.

    blender --background --python modelos/jaz-40-panambi.py

Si el fichero no está, el juego sigue con la fábrica: que falte un recurso no
puede dejar a nadie sin volar.
"""

import bpy
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import (  # noqa: E402
    ala, caja, cabina, cilindro, exportar, limpiar, perfil, pintar, suavizar,
    ventanillas,
)
from mathutils import Vector  # noqa: E402

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# De `src/flight/aircraft.ts`: envergadura 11,9 m, cuerda 1,6 y dos toneladas.
# El juego reescala el modelo a la envergadura de la ficha al cargarlo, así que
# modelar con las de verdad es lo único que garantiza que no se deforme.
ENVERGADURA = 11.9
CUERDA = 1.6
LARGO = 9.0
ALTO_FUSELAJE = 1.45
ANCHO_FUSELAJE = 1.28

# **Ala baja**, que es la silueta: el plano sale por debajo del fuselaje y se ve
# el dorso desde la ventanilla, al revés que en el Pykasu.
ALA_Y = -0.30
ALA_Z = 0.20

# Dónde van los motores.
#
# No es un número libre: la hélice tiene que pasar lejos del fuselaje —aquí
# quedan ochenta y nueve centímetros de aire entre la punta de pala y el
# costado— y a la vez cuanto más cerca del eje, menos guiñada da un motor
# parado. Dos metros y medio es donde lo ponen los bimotores de este tamaño.
MOTOR = 2.45
RADIO_HELICE = 0.92

# El tren, saliendo. **Sale porque nada lo recoge todavía**: un bimotor de este
# porte lleva tren retráctil, pero el juego no anima nada dentro del modelo, así
# que un tren dibujado arriba dejaría al avión rodando sobre la panza. Cuando
# haya animación de tren, esto es una pieza que se mueve y no un comentario.
#
# Las ruedas quedan a 1,44 por debajo del eje, que deja veintidós centímetros
# entre la punta de la pala y el suelo. Es el número que manda en un bimotor de
# ala baja y es lo que decide lo largas que son las patas.
RUEDA_Y = -1.44

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-40.glb",
)


def rueda(nombre, en, diametro, ancho=0.18):
    """Una rueda: un cilindro achatado puesto de canto."""
    r = perfil(nombre, [
        (-ancho / 2, diametro, diametro, 0),
        (ancho / 2, diametro, diametro, 0),
    ], "goma")
    r.rotation_euler = (0, math.radians(90), 0)
    r.location = Vector(en)
    return suavizar(r, subdividir=2, biselar=0)


def helice(lado, z):
    """
    Una hélice de tres palas, con su buje.

    El nombre lleva «helice» porque es por ahí por donde el juego la encuentra
    para hacerla girar —ver `NOMBRES_DE_HELICE`—, y **las dos van separadas**:
    el cargador agrupa las piezas de hélice por cercanía y monta un eje sobre
    cada grupo, precisamente para que en un bimotor cada una gire sobre su
    motor y no las dos alrededor del morro. Ver `ejesDeHelice`.
    """
    piezas = []
    buje_en = (lado * MOTOR, ALA_Y, z)
    bpy.ops.mesh.primitive_cone_add(
        vertices=12, radius1=0.17, radius2=0.05, depth=0.42,
        location=buje_en, rotation=(math.radians(90), 0, 0),
    )
    buje = pintar(bpy.context.object, "capo")
    buje.name = f"helice-{'izquierda' if lado < 0 else 'derecha'}"

    # Tres palas, que es lo que dice la ficha (`appearance.blades`). Cada una
    # sale del buje hacia fuera, no de lado a lado: con tres, una barra que
    # cruzara el centro saldrían seis.
    for i in range(3):
        angulo = i * math.tau / 3
        bpy.ops.mesh.primitive_cube_add(size=1)
        pala = bpy.context.object
        pala.name = f"{buje.name}-pala-{i}"
        pala.scale = (RADIO_HELICE, RADIO_HELICE * 0.16, RADIO_HELICE * 0.045)
        pala.rotation_euler = (0, 0, angulo)
        pala.location = (
            buje_en[0] + math.cos(angulo) * RADIO_HELICE / 2,
            buje_en[1] + math.sin(angulo) * RADIO_HELICE / 2,
            buje_en[2],
        )
        # **Con la inversa del padre**, que si no la transformación del buje se
        # le suma a la suya y las palas se van a tomar el aire. Está contado en
        # el Mainumby, donde costó que el avión midiera cinco metros de alto.
        pala.parent = buje
        pala.matrix_parent_inverse = buje.matrix_world.inverted()
        piezas.append(suavizar(pintar(pala, "detalle"), subdividir=0, biselar=0.012))
    piezas.append(buje)
    return piezas


# ── El fuselaje, aro a aro ────────────────────────────────────────────────
#
# Nueve aros: morro romo —aquí no hay motor delante, los motores van en las
# alas—, cabina ancha de dos plazas de frente, y afinando hasta la cola con la
# punta levantada. Con subdivisión esto es una superficie, no un tubo.
#
# Está fuera de `construir` porque **el parabrisas se calcula a partir de él**,
# y esa dependencia tiene que verse. Ver `carlinga`.
AROS = [
    (-LARGO * 0.50, ANCHO_FUSELAJE * 0.26, ALTO_FUSELAJE * 0.30, 0.08),
    (-LARGO * 0.45, ANCHO_FUSELAJE * 0.62, ALTO_FUSELAJE * 0.60, 0.05),
    (-LARGO * 0.36, ANCHO_FUSELAJE * 0.90, ALTO_FUSELAJE * 0.88, 0.02),
    (-LARGO * 0.22, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
    (-LARGO * 0.02, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
    (LARGO * 0.14, ANCHO_FUSELAJE * 0.88, ALTO_FUSELAJE * 0.90, -0.01),
    (LARGO * 0.30, ANCHO_FUSELAJE * 0.60, ALTO_FUSELAJE * 0.64, 0.00),
    (LARGO * 0.42, ANCHO_FUSELAJE * 0.30, ALTO_FUSELAJE * 0.38, 0.05),
    (LARGO * 0.50, ANCHO_FUSELAJE * 0.14, ALTO_FUSELAJE * 0.22, 0.10),
]


def aro(z):
    """Cuánto mide el fuselaje a esa altura del morro. Interpolando los aros."""
    for (z0, a0, h0, y0), (z1, a1, h1, y1) in zip(AROS, AROS[1:]):
        if z <= z1 or (z1, a1, h1, y1) == AROS[-1]:
            t = max(0.0, min(1.0, (z - z0) / (z1 - z0)))
            return (a0 + (a1 - a0) * t, h0 + (h1 - h0) * t, y0 + (y1 - y0) * t)
    raise AssertionError


def carlinga():
    """
    El parabrisas: **la piel del fuselaje, un poco más gorda y un poco subida**.

    Los dos primeros intentos lo hicieron como un cuerpo aparte encima del
    lomo, y las dos veces se leyó como un techo solar: un óvalo negro pegado al
    morro, con fuselaje blanco entre él y las ventanillas. Un parabrisas de
    verdad no está *encima* del fuselaje, **es** el fuselaje en ese tramo.

    Así que se calcula desde los mismos aros: tres centímetros más ancho y más
    alto, y el centro subido seis. Con eso la elipse del cristal asoma por
    arriba y por los hombros —ocho centímetros en la corona, uno y medio en el
    costado— y se queda metida por debajo, que es exactamente la forma que
    tiene un parabrisas envolvente visto de lado. Y se apaga sola en los dos
    extremos, donde el crecimiento es menor que el del fuselaje.

    **Y la cabeza del piloto queda dentro**, que es la otra condición. Todos los
    materiales llevan la cara de atrás quitada —ver `material` en `comun.py`—,
    así que desde dentro el cristal desaparece... siempre que se esté dentro.
    Con el cristal a la altura del lomo y los ojos a dieciséis centímetros del
    eje, el piloto lo miraba **por debajo**: una banda negra cruzando el cielo
    de lado a lado. Aquí el suelo del cristal cae a sesenta y seis centímetros
    por debajo del eje, medio metro más abajo que los ojos.
    """
    # z, cuánto crece respecto del fuselaje, y cuánto sube el centro.
    tramo = [
        (-3.00, -0.04, 0.03),
        (-2.55, 0.03, 0.08),
        (-1.90, 0.03, 0.08),
        (-1.20, 0.02, 0.06),
        (-0.60, -0.04, 0.02),
    ]
    aros = []
    for z, gordo, sube in tramo:
        ancho, alto, y = aro(z)
        aros.append((z, ancho + gordo, alto + gordo, y + sube))
    return perfil("parabrisas", aros, "cristal")


def construir():
    limpiar()
    piezas = []

    cuerpo = perfil("fuselaje", AROS)
    piezas.append(suavizar(cuerpo, subdividir=2, biselar=0))
    piezas.append(suavizar(carlinga(), subdividir=2, biselar=0))

    # Y las ventanillas de la cabina de pasaje, que es lo que dice que este
    # avión lleva gente y no sacos.
    piezas += ventanillas(
        piel_x=ANCHO_FUSELAJE * 0.49, z_desde=-0.15, z_hasta=0.85, cada=1.00,
        y_centro=0.16, alto=0.36, largo=0.80,
    )

    # Lo de dentro: dos plazas de frente, suelo bajo en la panza y el panel a
    # setenta centímetros de la cara. Ver `cabina` en `comun.py`.
    piezas += cabina(
        ojos_z=-1.30,
        ancho=0.50,
        alto_panel=0.10,
        y_suelo=-0.42,
        y_respaldo=0.18,
        plazas=(-0.30, 0.30),
        pantallas_en=0.30,
        suelo_atras=1.70,
    )
    # Y dos plazas atrás. No se pilotan desde ahí —`ojoDePiloto` se queda con
    # el asiento más adelantado— pero sin ellas la cabina de un avión de seis
    # plazas es un pasillo vacío.
    for lado in (-1, 1):
        atras = caja(f"asiento-atras-{lado}", -0.24, 0.24, -0.40, 0.14,
                     -0.30, 0.20, "tapiceria")
        atras.location.x += lado * 0.30
        piezas.append(atras)

    # ── Ala ───────────────────────────────────────────────────────────────
    plano = ala("ala", ENVERGADURA / 2, CUERDA, CUERDA * 0.62, CUERDA * 0.14,
                en=(0, ALA_Y, ALA_Z), diedro=math.radians(5))
    piezas.append(suavizar(plano, subdividir=1))

    # ── Góndolas y hélices ────────────────────────────────────────────────
    #
    # La góndola empieza por delante del borde de ataque y acaba por detrás del
    # borde de salida, que es como cuelga un motor de un ala: el ala la
    # atraviesa. Es la pieza que hace que esta silueta se reconozca desde el
    # suelo.
    for lado in (-1, 1):
        gondola = perfil(f"gondola-{lado}", [
            (-1.80, 0.50, 0.50, 0.00),
            (-1.55, 0.74, 0.72, 0.00),
            (-0.90, 0.78, 0.76, 0.00),
            (0.20, 0.66, 0.62, -0.02),
            (0.95, 0.30, 0.30, -0.05),
        ], "capo")
        gondola.location = Vector((lado * MOTOR, ALA_Y, 0.0))
        piezas.append(suavizar(gondola, subdividir=2, biselar=0))
        piezas += helice(lado, -1.95)

    # ── Cola ──────────────────────────────────────────────────────────────
    #
    # Convencional: el estabilizador en el fuselaje y la deriva encima. La cola
    # en T es del JAZ 60, y son dos siluetas distintas justamente porque se
    # distinguen de lejos.
    estabilizador = ala("estabilizador", ENVERGADURA * 0.19, CUERDA * 0.66,
                        CUERDA * 0.44, CUERDA * 0.09,
                        en=(0, ALTO_FUSELAJE * 0.12, LARGO * 0.42),
                        flecha=CUERDA * 0.10, diedro=math.radians(3))
    piezas.append(suavizar(estabilizador, subdividir=1))

    deriva = ala("deriva", 1.25, CUERDA * 0.92, CUERDA * 0.46, CUERDA * 0.09,
                 en=(0, ALTO_FUSELAJE * 0.21, LARGO * 0.41),
                 flecha=CUERDA * 0.36, material_="capo")
    deriva.rotation_euler = (0, 0, math.radians(90))
    deriva.modifiers.remove(deriva.modifiers["simetria"])
    piezas.append(suavizar(deriva, subdividir=1))

    # ── Tren triciclo ─────────────────────────────────────────────────────
    #
    # De morro, que es lo que lleva un avión de esta clase: se rueda mirando
    # hacia delante y se frena sin miedo a irse de morro. El Mainumby es de
    # rueda atrás y por eso rueda con el morro apuntando al cielo.
    #
    # El de morro va en la panza; los principales, **dentro de las góndolas**,
    # que es de donde salen en un bimotor de ala baja: por eso las góndolas son
    # tan largas por detrás del ala.
    piezas.append(
        cilindro("pata-morro", 0.055, 0.56, (0, -0.98, -LARGO * 0.33))
    )
    piezas.append(
        rueda("rueda-morro", (0, RUEDA_Y + 0.23, -LARGO * 0.33), 0.46)
    )
    for lado in (-1, 1):
        piezas.append(
            cilindro(f"pata-{lado}", 0.065, 0.62,
                     (lado * MOTOR, -0.90, -0.20))
        )
        piezas.append(
            rueda(f"rueda-{lado}", (lado * MOTOR, RUEDA_Y + 0.29, -0.20), 0.58)
        )

    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
