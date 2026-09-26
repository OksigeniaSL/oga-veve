"""
El JAZ 25 *Mainumby*, modelado en Blender.

Se hace aquí y no con la fábrica paramétrica del juego —`fabrica-de-aeronaves.ts`—
porque es el techo que #68 escribió de antemano: «cuando ajustar una silueta
exija recompilar y tantear números en vez de arrastrar vértices, Blender gana».
Se tantearon números cinco veces y el avión seguía siendo losas naranjas con las
aristas duras y el fuselaje abierto por dentro.

Es un **biplano fumigador**, y lo que lo hace reconocible está todo modelado a
propósito: el capó redondo y gordo del motor radial, el fuselaje de costados
rectos que se estrecha hacia la cola, la carlinga alta y acristalada para ver
el cultivo, las dos alas con su decalaje —la de arriba adelantada—, los
montantes en I entre ellas con sus cables en cruz, el tren fijo de patas
separadas y la rueda de cola.

Los ayudantes están en `comun.py` y `exterior.py`. Aquí queda **solo lo que es
este avión**.

Se ejecuta sin ventana y escribe el glTF donde el juego lo busca:

    blender --background --python modelos/jaz-25-mainumby.py

El juego lo carga solo si está —`world/aeronave-modelo.ts`— y si no, sigue con
la fábrica. Que falte un recurso no puede dejar a nadie sin volar.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import cabina, exportar, limpiar  # noqa: E402
from exterior import (  # noqa: E402
    Piel, banda, centro_de_gravedad, de_ala, de_deriva, dentro_de, espejo,
    estacion, helice, llantas, neumaticos, paneles, simetricos, superficie,
    varillas,
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
# El decalaje: la de arriba va un palmo largo por delante de la de abajo, que
# es lo que deja ver el suelo por delante del plano de abajo y lo que se
# reconoce de perfil.
LE_ALTA = -1.92
LE_BAJA = -0.95
# **Y el tren, alto, porque la hélice es grande.**
#
# Estaba en 1,05 y con eso el eje de la hélice quedaba a un metro escaso del
# suelo: una hélice de dos metros sesenta se clavaría treinta centímetros en el
# asfalto. Un fumigador de verdad va alto justamente por eso — y por eso tiene
# esa pinta de zanco. A 1,70 la punta de pala pasa a cuarenta centímetros del
# suelo, y además cuadra con el 1,8 de su ficha de vuelo.
TREN = 1.70
RUEDA = 0.36
VIA = 1.40
PRINCIPAL_Z = -0.82

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-25.glb",
)

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# El capó redondo del radial delante, y detrás un fuselaje de costados rectos
# —una estructura de tubos forrada, que es como se hacen estos aviones— que se
# estrecha y sube hacia la cola.
PIEL = Piel([
    (-4.36, 0.44, 0.46, -0.42, 0.02, 2.0),
    (-4.30, 0.62, 0.64, -0.60, 0.02, 2.0),
    (-4.05, 0.67, 0.69, -0.65, 0.02, 2.0),
    (-3.45, 0.64, 0.66, -0.62, 0.02, 2.1),
    (-3.10, 0.58, 0.64, -0.62, 0.02, 2.6),
    (-2.00, 0.55, 0.64, -0.62, 0.02, 3.0),
    (-1.20, 0.54, 0.62, -0.62, 0.00, 3.2),
    (0.00, 0.50, 0.58, -0.58, 0.00, 3.0),
    (1.50, 0.38, 0.49, -0.44, 0.03, 2.8),
    (3.00, 0.24, 0.36, -0.26, 0.05, 2.5),
    (4.00, 0.13, 0.28, -0.12, 0.08, 2.3),
    (4.20, 0.0, 0.18, 0.18),
])


def construir():
    limpiar()
    piezas = []

    # ── Fuselaje, con el capó del radial ──────────────────────────────────
    #
    # Un fumigador lleva un radial de nueve cilindros: ancho, corto y romo. Es
    # media silueta del avión. La cara de delante, oscura: detrás del cono se
    # ven las culatas, no una chapa.
    piezas.append(PIEL.malla("fuselaje", lados=40, paso=0.15, zonas=[
        ("oscuro", -9, -4.31, 0, 180),
        ("capo", -4.31, -3.45, 0, 180),
    ], extra=[-4.31, -3.45]))

    # ── La franja, y **ninguna puerta** ───────────────────────────────────
    #
    # Un biplano de trabajo tiene la carlinga alta y se entra por un costado
    # abatible: no hay puerta de pasaje que dibujar. Ponerle una porque la
    # llevan los otros cinco sería justo lo que esta casa no hace — falsear
    # para que quede bonito. Lo que se enseña aquí tiene que reconocerse el día
    # que se vea de verdad.
    piezas.append(banda("cintura", PIEL, -3.40, 3.9, -0.06, 0.06,
                        material_="detalle", fuera=0.007, paso=0.12))

    # ── Carlinga ──────────────────────────────────────────────────────────
    #
    # Alta y acristalada por todos lados, para ver el cultivo por debajo del
    # ala de arriba. Con su arco de chapa en medio, que es también lo que
    # protege al piloto si el avión vuelca.
    carlinga = Piel([
        (-1.68, 0.30, 0.52, 0.40, 0.46),
        (-1.35, 0.42, 0.88, 0.40, 0.50, 2.4),
        (-0.70, 0.44, 0.98, 0.40, 0.52, 2.6),
        (0.00, 0.40, 0.92, 0.40, 0.50, 2.6),
        (0.35, 0.22, 0.62, 0.40, 0.46),
    ])
    piezas.append(carlinga.malla("carlinga", "cristal", lados=24, paso=0.1))
    piezas.append(banda("carlinga-arco", carlinga, -0.78, -0.70, 0.45, 0.975,
                        material_="casco", fuera=0.008, paso=0.04, filas=6))
    piezas.append(banda("carlinga-marco", carlinga, -1.40, -1.33, 0.45, 0.87,
                        material_="casco", fuera=0.008, paso=0.035, filas=6))

    # Y lo de dentro. Una sola plaza: un fumigador lleva al piloto y nada más.
    # Las cifras son las del entrenador, que tiene el fuselaje casi igual de
    # hondo. Ver `cabina` en `comun.py`.
    # Sin flaps, que es lo que lleva un biplano fumigador de esta clase: ni
    # botón ni reloj de flaps en el tablero. Ver `llevaFlaps` en
    # `src/flight/aircraft.ts`.
    cab = cabina(
        ojos_z=-0.90, palancas=1, relojes=6, mando="palanca",
        alto_panel=0.42, y_suelo=-0.28, y_respaldo=0.32, flaps=False,
    )
    piezas += cab
    dentro_de(PIEL, cab)

    # ── Las dos alas ──────────────────────────────────────────────────────
    #
    # Perfil grueso y curvado, de avión lento que tiene que sustentar mucho
    # peso de líquido a poca velocidad. Alerones en las dos, con su junta.
    j = "oscuro"
    semi_a = ENVERGADURA / 2
    semi_b = ENVERGADURA * 0.46
    ta = math.tan(math.radians(1.5))
    tb = math.tan(math.radians(2.5))
    piezas.append(superficie("ala-alta", [
        de_ala(0.0, ALA_ALTA, LE_ALTA, CUERDA, 0.12, 1.5),
        # La punta redonda sobresale medio espesor: se descuenta, para que el
        # avión mida de ancho lo que dice su ficha.
        de_ala(semi_a - 0.10, ALA_ALTA + semi_a * ta, LE_ALTA, CUERDA * 0.96,
               0.12, 1.5),
    ], curvatura=0.04, zonas=[
        (j, 3.3, 6.05, 0.74, 0.755),
        (j, 3.3, 3.36, 0.755, 1.0),
    ]))
    piezas.append(superficie("ala-baja", [
        de_ala(0.0, ALA_BAJA, LE_BAJA, CUERDA * 0.94, 0.12, 2.5),
        de_ala(semi_b, ALA_BAJA + semi_b * tb, LE_BAJA, CUERDA * 0.90, 0.12,
               2.5),
    ], curvatura=0.04, zonas=[
        (j, 3.1, 5.55, 0.74, 0.755),
        (j, 3.1, 3.16, 0.755, 1.0),
    ]))

    # Los montantes en I entre las dos alas: lo que dice «biplano» es el hueco
    # **con algo dentro**. Perfilados, anchos, inclinados hacia delante por
    # arriba, que es como sigue el decalaje.
    x_m = ENVERGADURA * 0.30
    abajo = Vector((x_m, ALA_BAJA + x_m * tb + 0.08, LE_BAJA + 0.35))
    arriba = Vector((x_m, ALA_ALTA + x_m * ta - 0.08, LE_ALTA + 0.35))
    piezas.append(superficie("riostra-entre-alas", [
        estacion(abajo, 0.95, 0.12, (0, 0, 1), (-1, 0, 0)),
        estacion(arriba, 0.95, 0.12, (0, 0, 1), (-1, 0, 0)),
    ], punta=False))
    # Y los cables en cruz: la otra mitad de la estructura de un biplano, la
    # que trabaja a tracción. Plateados y finos, como son.
    piezas.append(varillas("cables", [
        ((0.45, 0.30, LE_ALTA + 0.55), (x_m, arriba.y, LE_ALTA + 0.75), 0.012),
        ((0.45, ALA_BAJA + 0.05, LE_BAJA + 0.45), (x_m, arriba.y,
                                                    LE_ALTA + 0.95), 0.012),
        ((0.40, 0.64, LE_ALTA + 0.95), (x_m, abajo.y, LE_BAJA + 0.55), 0.012),
    ], material_="aluminio", lados=6, simetria=True))

    # Y las cabañas, del fuselaje al ala de arriba: dos patas en N a cada
    # lado, por delante y por detrás de la carlinga.
    piezas.append(varillas("cabanas", [
        ((0.44, 0.52, -2.10), (0.56, ALA_ALTA - 0.08, -1.80), 0.035),
        ((0.40, 0.50, 0.42), (0.56, ALA_ALTA - 0.08, -0.45), 0.035),
    ], material_="detalle", lados=8, simetria=True))

    # ── Cola ──────────────────────────────────────────────────────────────
    #
    # Deriva alta y redondeada con el timón grande —a poca velocidad hace falta
    # mucho timón— y el estabilizador con sus riostras, que es lo que llevan
    # los aviones de estructura de tubos.
    piezas.append(superficie("deriva", [
        de_deriva(0.0, 0.20, 2.85, 1.55, 0.06),
        de_deriva(0.0, 0.34, 3.30, 1.10, 0.09),
        de_deriva(0.0, 1.18, 3.55, 0.78, 0.09),
        de_deriva(0.0, 1.46, 3.78, 0.48, 0.08),
    ], material_="capo", simetria=False, zonas=[
        ("oscuro", 0.2, 1.3, 0.50, 0.52),
    ]))
    piezas.append(superficie("estabilizador", [
        de_ala(0.0, 0.16, 3.30, 1.08, 0.09),
        de_ala(2.35, 0.16, 3.42, 0.88, 0.08),
        de_ala(2.50, 0.16, 3.58, 0.60, 0.08),
    ], zonas=[
        ("oscuro", 0.2, 2.3, 0.56, 0.58),
    ]))
    piezas.append(varillas("riostras-de-cola", [
        ((0.10, -0.10, 3.55), (1.30, 0.14, 3.70), 0.015),
        ((0.06, 0.80, 3.55), (1.30, 0.20, 3.70), 0.015),
    ], material_="aluminio", lados=6, simetria=True))

    # ── Tren fijo ─────────────────────────────────────────────────────────
    #
    # Dos patas separadas que salen de la panza, con la rueda grande de pista
    # de tierra, y la rueda de cola: un fumigador es de rueda atrás, y por eso
    # rueda con el morro apuntando al cielo.
    eje = -(TREN - RUEDA) + 0.04
    piezas.append(superficie("pata-principal", [
        estacion((0.36, -0.58, PRINCIPAL_Z - 0.10), 0.20, 0.25, (0, 0, 1),
                 (Vector((VIA - 0.36, eje + 0.58, 0)).cross(Vector((0, 0, 1)))
                  .normalized())),
        estacion((VIA - 0.10, eje + 0.05, PRINCIPAL_Z - 0.06), 0.12, 0.25,
                 (0, 0, 1),
                 (Vector((VIA - 0.36, eje + 0.58, 0)).cross(Vector((0, 0, 1)))
                  .normalized())),
    ], material_="detalle", punta=False))
    piezas.append(neumaticos("rueda-principal", [(VIA, eje, PRINCIPAL_Z)],
                             RUEDA, 0.20, simetria=True))
    piezas.append(llantas("rueda-principal-llanta", [(VIA, eje, PRINCIPAL_Z)],
                          RUEDA, 0.20, simetria=True))
    # La rueda de cola, en su ballesta.
    piezas.append(varillas("pata-de-cola", [
        ((0, -0.16, 3.40), (0, -0.52, 3.62), 0.03),
        ((-0.05, -0.52, 3.62), (0.05, -0.52, 3.62), 0.015),
    ], material_="detalle", lados=8))
    piezas.append(neumaticos("rueda-de-cola", [(0, -0.60, 3.64)], 0.11, 0.07))

    # ── Hélice ────────────────────────────────────────────────────────────
    #
    # **Tres palas y dos metros sesenta de diámetro**, que es lo que mueve un
    # radial de fumigador y lo que dice su propia ficha (`appearance.blades`).
    piezas += helice("helice", (0, 0.02, -4.40), radio=1.30, cuantas=3,
                     buje=0.24, cuerda=0.20, largo_cono=0.42)

    piezas.append(centro_de_gravedad(LE_BAJA - 0.05))
    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
