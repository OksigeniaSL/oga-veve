"""
El JAZ 60 *Arasunu*, modelado en Blender.

El turbohélice regional: cola en T, diecinueve plazas y la fila de ventanillas
que dice de lejos que esto lleva pasaje. Es el primero de la flota que ya no es
una avioneta — cinco toneladas y media, veinte metros de ala— y el salto se
tiene que notar al verlo aparcado al lado del Panambi.

**La cola en T es su silueta**, y no un adorno: el estabilizador va encima de
la deriva, fuera de la estela del ala y de las hélices. Reconocerla es
exactamente la destreza que el álbum de postales enseña, así que es la pieza
que más cuidado lleva aquí.

Los ayudantes están en `comun.py`. Aquí queda solo lo que es **este** avión.

    blender --background --python modelos/jaz-60-arasunu.py

Si el fichero no está, el juego sigue con la fábrica: que falte un recurso no
puede dejar a nadie sin volar.
"""

import bpy
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import (  # noqa: E402
    ala, cabina, cilindro, exportar, limpiar, perfil, pintar, suavizar,
    ventanillas,
)
from mathutils import Vector  # noqa: E402

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# De `src/flight/aircraft.ts`: envergadura 19,8 m, cuerda 2,0 y cinco toneladas
# y media. El juego reescala el modelo a la envergadura de la ficha al
# cargarlo, así que modelar con las de verdad es lo único que garantiza que no
# se deforme.
ENVERGADURA = 19.8
CUERDA = 2.0
LARGO = 15.0
ALTO_FUSELAJE = 1.90
ANCHO_FUSELAJE = 1.85

ALA_Y = -0.50
ALA_Z = 0.60

# Los motores. Hélice de dos metros sesenta y cuatro, que es lo que mueve un
# turbohélice de este porte, y por eso van a tres metros diez del eje: la punta
# de pala pasa a setenta y cinco centímetros del costado.
MOTOR = 3.10
RADIO_HELICE = 1.32

# Las ruedas, treinta centímetros por debajo de la punta de la pala. Ese hueco
# es lo que decide lo largas que son las patas en un avión de ala baja con
# hélices grandes, y es por lo que este va tan alto para lo que pesa.
RUEDA_Y = -2.12

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-60.glb",
)

# ── El fuselaje, aro a aro ────────────────────────────────────────────────
#
# Un tubo largo de sección constante con el morro afilado y el cono de cola
# levantado, que es lo que es un regional: la cabina de pasaje manda y todo lo
# demás se le pega. Fuera de `construir` porque el parabrisas se calcula a
# partir de estos mismos aros. Ver `carlinga`.
AROS = [
    (-LARGO * 0.50, ANCHO_FUSELAJE * 0.22, ALTO_FUSELAJE * 0.26, 0.10),
    (-LARGO * 0.46, ANCHO_FUSELAJE * 0.60, ALTO_FUSELAJE * 0.62, 0.06),
    (-LARGO * 0.41, ANCHO_FUSELAJE * 0.88, ALTO_FUSELAJE * 0.88, 0.02),
    (-LARGO * 0.34, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
    (LARGO * 0.10, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
    (LARGO * 0.26, ANCHO_FUSELAJE * 0.92, ALTO_FUSELAJE * 0.94, 0.00),
    (LARGO * 0.38, ANCHO_FUSELAJE * 0.62, ALTO_FUSELAJE * 0.68, 0.06),
    (LARGO * 0.46, ANCHO_FUSELAJE * 0.30, ALTO_FUSELAJE * 0.38, 0.14),
    (LARGO * 0.50, ANCHO_FUSELAJE * 0.14, ALTO_FUSELAJE * 0.22, 0.20),
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
    El parabrisas: la piel del fuselaje, un poco más gorda y un poco subida.

    La misma receta que en el Panambi, y por el mismo motivo — está contada
    entera allí. Aquí los números son mayores porque el fuselaje lo es: cinco
    centímetros de más y el centro subido nueve, para que asome lo mismo en
    proporción sobre un morro que mide casi dos metros de ancho.
    """
    tramo = [
        (-6.55, -0.06, 0.04),
        (-5.95, 0.05, 0.11),
        (-5.05, 0.05, 0.11),
        (-4.35, 0.03, 0.08),
        (-3.70, -0.06, 0.03),
    ]
    aros = []
    for z, gordo, sube in tramo:
        ancho, alto, y = aro(z)
        aros.append((z, ancho + gordo, alto + gordo, y + sube))
    return perfil("parabrisas", aros, "cristal")


def rueda(nombre, en, diametro, ancho=0.24):
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
    Una hélice de cuatro palas, con su buje.

    Cuatro, que es lo que dice la ficha (`appearance.blades`) y lo que lleva un
    turbohélice: con la misma potencia y menos diámetro, más palas. Van
    separadas la una de la otra y el juego les monta un eje a cada una. Ver
    `ejesDeHelice`.
    """
    piezas = []
    buje_en = (lado * MOTOR, ALA_Y, z)
    bpy.ops.mesh.primitive_cone_add(
        vertices=12, radius1=0.24, radius2=0.07, depth=0.58,
        location=buje_en, rotation=(math.radians(90), 0, 0),
    )
    buje = pintar(bpy.context.object, "capo")
    buje.name = f"helice-{'izquierda' if lado < 0 else 'derecha'}"

    for i in range(4):
        angulo = i * math.tau / 4
        bpy.ops.mesh.primitive_cube_add(size=1)
        pala = bpy.context.object
        pala.name = f"{buje.name}-pala-{i}"
        pala.scale = (RADIO_HELICE, RADIO_HELICE * 0.15, RADIO_HELICE * 0.04)
        pala.rotation_euler = (0, 0, angulo)
        pala.location = (
            buje_en[0] + math.cos(angulo) * RADIO_HELICE / 2,
            buje_en[1] + math.sin(angulo) * RADIO_HELICE / 2,
            buje_en[2],
        )
        # Con la inversa del padre, que si no la transformación del buje se le
        # suma a la suya. Está contado en el Mainumby.
        pala.parent = buje
        pala.matrix_parent_inverse = buje.matrix_world.inverted()
        piezas.append(suavizar(pintar(pala, "detalle"), subdividir=0, biselar=0.014))
    piezas.append(buje)
    return piezas


def construir():
    limpiar()
    piezas = []

    piezas.append(suavizar(perfil("fuselaje", AROS), subdividir=2, biselar=0))
    piezas.append(suavizar(carlinga(), subdividir=2, biselar=0))

    # La fila de ventanillas: ocho por costado. Es lo que dice «esto lleva
    # pasaje» desde la otra punta de la plataforma, y es la diferencia de
    # silueta que hay entre este avión y el Panambi mirándolos de lado.
    piezas += ventanillas(
        piel_x=ANCHO_FUSELAJE * 0.50, z_desde=-3.30, z_hasta=3.30, cada=0.95,
        y_centro=0.26, alto=0.42, largo=0.40,
    )

    # Lo de dentro: dos plazas de frente, el panel a setenta centímetros de la
    # cara y el suelo en la panza. Ver `cabina` en `comun.py`.
    piezas += cabina(
        ojos_z=-5.20,
        ancho=0.62,
        alto_panel=0.18,
        y_suelo=-0.44,
        y_respaldo=0.26,
        plazas=(-0.36, 0.36),
        pantallas_en=0.36,
        suelo_atras=1.60,
    )

    # ── Ala ───────────────────────────────────────────────────────────────
    plano = ala("ala", ENVERGADURA / 2, CUERDA * 1.25, CUERDA * 0.75,
                CUERDA * 0.13, en=(0, ALA_Y, ALA_Z), diedro=math.radians(4))
    piezas.append(suavizar(plano, subdividir=1))

    # ── Góndolas y hélices ────────────────────────────────────────────────
    #
    # Largas por detrás del ala: ahí es donde se recoge el tren principal en un
    # turbohélice de ala baja, y por eso las góndolas de estos aviones salen
    # tanto hacia atrás.
    for lado in (-1, 1):
        gondola = perfil(f"gondola-{lado}", [
            (-2.70, 0.62, 0.62, 0.00),
            (-2.35, 1.02, 1.00, 0.00),
            (-1.20, 1.06, 1.04, 0.00),
            (0.60, 0.92, 0.88, -0.04),
            (1.90, 0.36, 0.34, -0.10),
        ], "capo")
        gondola.location = Vector((lado * MOTOR, ALA_Y, 0.0))
        piezas.append(suavizar(gondola, subdividir=2, biselar=0))
        piezas += helice(lado, -2.98)

    # ── Cola en T ─────────────────────────────────────────────────────────
    #
    # **Aquí está la silueta.** La deriva sube dos metros y medio sobre el lomo
    # y el estabilizador va **en su punta**, no en el fuselaje: esa T es lo que
    # separa a este avión del Panambi de un vistazo, y es la razón de que la
    # ficha le ponga menos actitud en tierra que a los demás —una cola en T no
    # perdona rotar de más, porque al hacerlo se mete ella sola en la estela
    # del ala—. Ver `maxGroundPitch` en `aircraft.ts`.
    alto_deriva = 2.52
    base_deriva = ALTO_FUSELAJE * 0.30
    flecha_deriva = CUERDA * 0.62
    deriva = ala("deriva", alto_deriva, CUERDA * 1.30, CUERDA * 0.78,
                 CUERDA * 0.10, en=(0, base_deriva, LARGO * 0.40),
                 flecha=flecha_deriva, material_="capo")
    deriva.rotation_euler = (0, 0, math.radians(90))
    deriva.modifiers.remove(deriva.modifiers["simetria"])
    piezas.append(suavizar(deriva, subdividir=1))

    # Y el estabilizador encima, en la punta de la deriva: **su altura y su
    # flecha salen de las de la deriva**, no de un número escrito aparte. Si se
    # escribieran los dos por separado, mover la deriva dejaría el plano
    # flotando en el aire y nadie se enteraría hasta ver una foto.
    estabilizador = ala("estabilizador", ENVERGADURA * 0.157, CUERDA * 0.76,
                        CUERDA * 0.48, CUERDA * 0.08,
                        en=(0, base_deriva + alto_deriva - 0.06,
                            LARGO * 0.40 + flecha_deriva),
                        flecha=CUERDA * 0.14)
    piezas.append(suavizar(estabilizador, subdividir=1))

    # ── Tren triciclo ─────────────────────────────────────────────────────
    #
    # Sale, como en el Panambi: nada lo recoge todavía. Ver el comentario de
    # `RUEDA_Y` allí.
    piezas.append(
        cilindro("pata-morro", 0.075, 0.98, (0, -1.36, -LARGO * 0.36))
    )
    piezas.append(
        rueda("rueda-morro", (0, RUEDA_Y + 0.30, -LARGO * 0.36), 0.60)
    )
    for lado in (-1, 1):
        # Dos ruedas por pata, que es lo que lleva un avión de cinco toneladas
        # y media: reparten la carga y dejan aterrizar en pista sin asfaltar.
        piezas.append(
            cilindro(f"pata-{lado}", 0.090, 0.80, (lado * MOTOR, -1.38, 0.30))
        )
        for lado_rueda in (-1, 1):
            piezas.append(
                rueda(f"rueda-{lado}-{lado_rueda}",
                      (lado * MOTOR + lado_rueda * 0.26, RUEDA_Y + 0.39, 0.30),
                      0.78, ancho=0.26)
            )

    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
