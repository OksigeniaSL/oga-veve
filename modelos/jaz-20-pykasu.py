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

**Y con las proporciones de la clase**, que es lo que le faltaba para no
parecer de juguete: el morro corto —el motor va justo delante del panel—, la
cabina alta y cuadrada debajo del ala, el parabrisas tumbado, la cola larga que
se estrecha y sube, y el tren de ballesta con sus carenados.

Se ejecuta sin ventana y escribe el glTF donde el juego lo busca:

    blender --background --python modelos/jaz-20-pykasu.py

Los ayudantes están en `comun.py` y en `exterior.py`. Aquí queda solo lo que
es este avión.
"""

import bpy  # noqa: F401
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import cabina, exportar, limpiar  # noqa: E402
from exterior import (  # noqa: E402
    Piel, banda, centro_de_gravedad, contorno, de_deriva, de_ala, dentro_de,
    espejo, estacion, flap, flaps_moviles, helice, llantas, neumaticos,
    paneles, paneles_zy, ranurado, simetricos, superficie, varillas, zy,
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

# **Dónde está cada cosa a lo largo**, que es lo que hace la silueta.
#
# El motor va justo delante del panel —la cortafuegos es la pared de delante
# de los pies—, así que el morro mide un metro escaso. Lo largo es la cola:
# cinco metros desde el borde de salida del ala hasta el timón. Antes era al
# revés —cuatro metros de morro y la cola corta—, y un avión así no se ha
# construido nunca: se leía como un juguete sin que nadie supiera decir por
# qué.
CORTAFUEGOS = -1.70
BORDE_DE_ATAQUE = -0.92
COLA = 5.53

# **El ala va encima de la cabina, que es lo que hace a este avión lo que es.**
# El techo de la cabina llega a 1,08 y el ala se apoya en él. Desde el asiento
# se ve el suelo por debajo del ala, que es exactamente la ventaja de un ala
# alta y la razón de que se enseñe a volar en aviones así.
ALA_ALTA = 1.13
TECHO = 1.08

# **El tren: 1,40, que es el `gearHeight` de su ficha.**
#
# No es una elección de estilo. El juego coloca el origen del avión a esa
# altura sobre el terreno, así que si la rueda del modelo no cae exactamente
# ahí, el avión aparece flotando o enterrado — y hay un banco que lo mide
# («el avión parado tiene las ruedas en el suelo»).
TREN = 1.40
RUEDA = 0.28
RUEDA_MORRO = 0.23
# La batalla de la ficha: 1,65 m de la rueda de morro a las principales. De
# aquí sale el radio de giro con el que el juego decide si este avión puede
# darse la vuelta en una pista. Ver `flight/cabe.ts`.
BATALLA = 1.65
MAINS_Z = -0.12
MORRO_Z = MAINS_Z - BATALLA
# La vía: de rueda a rueda, dos metros y medio.
VIA = 1.27

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-20.glb",
)

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# Estaciones `(z, medio ancho, techo, panza, altura de lo más ancho, n)`. La
# `n` alta es lo que hace el costado recto de una avioneta de chapa: una
# cabina de cuatro plazas es una caja con las esquinas redondas, no un tubo.
PIEL = Piel([
    (-2.40, 0.17, 0.24, -0.12, 0.06, 2.0),   # el plato del cono
    (-2.35, 0.32, 0.33, -0.24, 0.04, 2.3),
    (-2.22, 0.42, 0.40, -0.36, 0.02, 2.5),
    (-1.98, 0.48, 0.46, -0.46, 0.00, 2.7),
    (CORTAFUEGOS, 0.52, 0.50, -0.52, 0.00, 2.9),
    (-1.30, 0.555, 0.82, -0.55, 0.08, 3.0),  # el parabrisas, tumbado
    (-0.95, 0.57, TECHO, -0.56, 0.14, 3.1),
    (0.62, 0.565, TECHO, -0.53, 0.14, 3.1),
    (1.35, 0.50, 0.92, -0.44, 0.17, 2.9),    # la ventanilla de atrás
    (2.40, 0.37, 0.66, -0.27, 0.19, 2.6),
    (3.60, 0.23, 0.51, -0.07, 0.22, 2.4),
    (4.70, 0.13, 0.45, 0.09, 0.26, 2.2),
    (5.40, 0.07, 0.43, 0.20, 0.30, 2.2),
    (COLA, 0.0, 0.36, 0.36, 0.36),
])


def construir():
    limpiar()
    piezas = []

    # ── Fuselaje, con el capó en la misma piel ────────────────────────────
    #
    # El capó no es una pieza aparte encajada delante: es la misma chapa con
    # otro color a partir de la cortafuegos. Así no hay escalón entre los dos,
    # que es lo que delataba la maqueta.
    piezas.append(PIEL.malla("fuselaje", zonas=[
        ("capo", -9, CORTAFUEGOS, 0, 180),
    ], extra=[CORTAFUEGOS], paso=0.10))

    # Las dos tomas de aire del motor, a cada lado del cono: lo que dice que
    # delante hay un motor de cilindros y no una nariz.
    piezas.append(paneles("tomas", PIEL, simetricos([
        [(-2.385, 52), (-2.385, 96), (-2.33, 100), (-2.33, 48)],
    ]), material_="oscuro", fuera=0.006, div=3))

    # ── Cristales ─────────────────────────────────────────────────────────
    #
    # El parabrisas de una pieza, tumbado del capó al ala, y las dos
    # ventanillas de cada costado: la de la puerta y la de atrás. Entre ellas
    # queda la chapa —los montantes—, que es lo que las hace ventanas.
    piezas.append(paneles("parabrisas", PIEL, [[
        zy(PIEL, -1.64, 0.40, -1), zy(PIEL, -1.64, 0.40, 1),
        zy(PIEL, -0.99, 1.00, 1), zy(PIEL, -0.99, 1.00, -1),
    ]], fuera=0.008, div=8))
    piezas.append(paneles_zy("ventanillas", PIEL, [
        [(-1.24, 0.60), (-0.30, 0.52), (-0.30, 1.00), (-0.93, 1.00)],
        [(-0.16, 0.52), (0.78, 0.55), (1.20, 0.86), (-0.16, 1.00)],
    ], fuera=0.008, div=6))

    # ── La librea ─────────────────────────────────────────────────────────
    #
    # Una franja que nace en el capó, baja por el costado por debajo de las
    # ventanillas y sube hacia la cola, y una raya fina debajo en el otro
    # color. Es como se pinta un avión de escuela, y da referencia de actitud
    # desde fuera: se ve si el avión va con el morro arriba.
    def sube(base):
        return lambda z: base + max(0.0, z - 0.8) * 0.055

    piezas.append(banda("cintura", PIEL, CORTAFUEGOS - 0.02, 5.0,
                        sube(0.02), sube(0.17), fuera=0.007, paso=0.15))
    piezas.append(banda("cintura-fina", PIEL, CORTAFUEGOS + 0.15, 4.9,
                        sube(-0.05), sube(-0.015), material_="detalle",
                        fuera=0.007, paso=0.15, filas=1))

    # La puerta: una junta en la chapa, con la ventanilla dentro. Por ahí se
    # entra al asiento de la izquierda y por ahí se sale.
    piezas.append(contorno("puerta", PIEL, -0.77, 0.30, 1.42, 1.02,
                           radio=0.10, grueso=0.018, fuera=0.009))

    # Y lo de dentro: dos plazas delante, que son las que se pilotan.
    #
    # Sin palancas de pedestal —en una avioneta el gas es un pomo en el
    # tablero— y con los seis relojes del panel, que aquí son *los* seis.
    cab = cabina(
        ojos_z=-LARGO * 0.10,
        ancho=0.42,
        alto_panel=0.46,
        y_suelo=-0.30,
        y_respaldo=0.34,
        plazas=(-0.22, 0.22),
        pantallas_en=0.20,
        relojes=6,
    )
    piezas += cab
    dentro_de(PIEL, cab)

    # ── Ala alta, arriostrada ─────────────────────────────────────────────
    #
    # Recta y de cuerda constante hasta media envergadura, y afinándose hacia
    # la punta, con un par de grados de alabeo —la punta menos calada que la
    # raíz, para que entre en pérdida la última y el alerón siga mandando—.
    # Perfil de dos por ciento de curvatura y doce de espesor, el de toda la
    # vida en esta clase.
    def y_ala(x):
        return ALA_ALTA + x * math.tan(math.radians(1.7))

    raiz = CUERDA * 1.04
    punta = CUERDA * 0.74
    estaciones = [
        de_ala(0.0, y_ala(0.0), BORDE_DE_ATAQUE, raiz, 0.12, 1.7, 1.5),
        de_ala(2.55, y_ala(2.55), BORDE_DE_ATAQUE, raiz, 0.12, 1.7, 1.5),
        de_ala(ENVERGADURA / 2 - 0.06, y_ala(ENVERGADURA / 2),
               BORDE_DE_ATAQUE + 0.11, punta, 0.11, 1.7, -1.0),
    ]
    # Flaps por dentro y alerones por fuera, dibujados como lo que se ve: la
    # junta de la bisagra y el corte entre los dos.
    junta = "oscuro"
    flaps = [flap("dentro", 0.60, 2.72, 0.72)]
    ala = superficie("ala", estaciones, curvatura=0.02, flaps=flaps, zonas=[
        (junta, 0.55, 5.02, 0.705, 0.72),
        (junta, 0.55, 0.60, 0.72, 1.0),
        (junta, 2.72, 2.80, 0.72, 1.0),
        (junta, 4.97, 5.02, 0.72, 1.0),
    ])
    piezas.append(ala)
    # **Ranurado**: diez, veinte y treinta grados, los tres topes de una
    # avioneta de escuela de ala alta. Sale un cuarto de su cuerda por sus
    # carriles —la mitad y pico en el primer tope, que es el de despegar— y
    # acaba con la nariz justo debajo del labio, abriendo una ranura estrecha.
    # Ver `ranurado`.
    piezas += flaps_moviles(ala, flaps, ranurado(
        muescas=(0, 10, 20, 30), recorrido=(0, 0.15, 0.21, 0.25)))

    # **Y su montante, que es media silueta de este avión.** Va del costado
    # bajo del fuselaje al ala, a media envergadura: es lo que permite que un
    # ala alta sea ligera, y lo que se ve desde la ventanilla toda la vida.
    # Perfilado, como es: un tubo redondo en el viento frena el doble.
    abajo = Vector((0.50, -0.32, -0.36))
    arriba = Vector((2.60, y_ala(2.60) - 0.06, -0.52))
    d = (arriba - abajo).normalized()
    g = d.cross(Vector((0, 0, 1))).normalized()
    piezas.append(superficie("puntal-del-ala", [
        estacion(abajo, 0.13, 0.30, (0, 0, 1), g),
        estacion(arriba, 0.13, 0.30, (0, 0, 1), g),
    ], material_="casco", punta=False))

    # ── Cola ──────────────────────────────────────────────────────────────
    #
    # La deriva en flecha con su aleta dorsal delante —la que la une al lomo
    # en curva—, y el timón marcado por su junta. El estabilizador, recto y
    # de punta cuadrada, con su timón de profundidad.
    piezas.append(superficie("deriva", [
        de_deriva(0.0, 0.40, 3.20, 2.30, 0.05),
        de_deriva(0.0, 0.62, 4.28, 1.30, 0.09),
        de_deriva(0.0, 1.76, 5.06, 0.64, 0.09),
    ], material_="capo", simetria=False, zonas=[
        ("oscuro", 0.25, 1.40, 0.60, 0.615),
    ]))
    y_cola = 0.34
    piezas.append(superficie("estabilizador", [
        de_ala(0.0, y_cola, 4.55, 0.98, 0.09),
        de_ala(1.00, y_cola, 4.58, 0.95, 0.09),
        de_ala(1.72, y_cola, 4.72, 0.66, 0.08),
    ], zonas=[
        ("oscuro", 0.18, 1.62, 0.56, 0.575),
    ]))

    # ── Tren triciclo fijo ────────────────────────────────────────────────
    #
    # Con rueda de morro, que es lo que hace que se aprenda a rodar mirando
    # por dónde se va en vez de en zigzag.
    #
    # **Las principales cuelgan de dos ballestas**: una pletina de acero que
    # sale de la panza y se abre hacia fuera, plana y ancha, y que hace de
    # muelle. Y las tres ruedas llevan su carenado, la «polaina» de toda
    # avioneta de escuela: una gota que tapa la rueda y deja asomar el
    # neumático por abajo.
    eje_y = -(TREN - RUEDA)
    arriba_p = Vector((0.40, -0.50, MAINS_Z))
    abajo_p = Vector((VIA - 0.10, eje_y + 0.02, MAINS_Z))
    d = (abajo_p - arriba_p).normalized()
    g = d.cross(Vector((0, 0, 1))).normalized()
    piezas.append(superficie("pata-principal", [
        estacion(arriba_p - Vector((0, 0, 0.09)), 0.18, 0.22, (0, 0, 1), g),
        estacion(abajo_p - Vector((0, 0, 0.05)), 0.10, 0.22, (0, 0, 1), g),
    ], material_="casco", punta=False))
    piezas.append(neumaticos("rueda-principal", [(VIA, eje_y, MAINS_Z)],
                             RUEDA, 0.16, simetria=True))
    piezas.append(llantas("rueda-principal-llanta", [(VIA, eje_y, MAINS_Z)],
                          RUEDA, 0.16, simetria=True))
    piezas.append(polaina("rueda-polaina", VIA, eje_y, MAINS_Z, RUEDA, 0.105,
                          simetria=True))

    # La de morro, con su amortiguador: la caña, el vástago que brilla, la
    # horquilla y su polaina.
    eje_m = -(TREN - RUEDA_MORRO)
    piezas.append(varillas("pata-de-morro", [
        ((0, -0.44, MORRO_Z - 0.06), (0, -0.86, MORRO_Z - 0.06), 0.045),
        ((0, -0.86, MORRO_Z - 0.06), (0, -1.00, MORRO_Z - 0.04), 0.030),
        ((-0.07, -0.98, MORRO_Z - 0.04), (-0.07, eje_m, MORRO_Z), 0.018),
        ((0.07, -0.98, MORRO_Z - 0.04), (0.07, eje_m, MORRO_Z), 0.018),
        ((-0.08, -0.98, MORRO_Z - 0.04), (0.08, -0.98, MORRO_Z - 0.04), 0.022),
    ], material_="gris"))
    piezas.append(neumaticos("rueda-de-morro", [(0, eje_m, MORRO_Z)],
                             RUEDA_MORRO, 0.13))
    piezas.append(llantas("rueda-de-morro-llanta", [(0, eje_m, MORRO_Z)],
                          RUEDA_MORRO, 0.13))
    piezas.append(polaina("rueda-de-morro-polaina", 0.0, eje_m, MORRO_Z,
                          RUEDA_MORRO, 0.095))

    # ── Hélice ────────────────────────────────────────────────────────────
    #
    # Dos palas y un metro noventa de diámetro, que es lo que mueve un motor
    # de esta potencia. Con el eje a 0,06 sobre la línea del fuselaje, la punta
    # de pala pasa a medio metro del suelo, como en el avión de verdad.
    piezas += helice("helice", (0, 0.06, -2.42), radio=0.95, cuantas=2,
                     buje=0.17, cuerda=0.13, largo_cono=0.40)

    # El centro de gravedad, a un cuarto de la cuerda: por ahí gira el avión.
    piezas.append(centro_de_gravedad(BORDE_DE_ATAQUE + raiz * 0.28))
    return piezas


def polaina(nombre, x, y, z, radio, medio_ancho, simetria=False):
    """
    El carenado de una rueda: una gota que la tapa y deja asomar la goma.

    Es la pieza que más dice «avioneta de escuela» después del ala alta, y la
    que antes faltaba: tres ruedas desnudas colgando de tres palos.
    """
    p = Piel([
        (z - radio * 1.55, 0.0, y + radio * 0.10, y + radio * 0.10),
        (z - radio * 1.25, medio_ancho * 0.72, y + radio * 0.78,
         y - radio * 0.50, y + radio * 0.08, 2.2),
        (z - radio * 0.45, medio_ancho, y + radio * 1.22,
         y - radio * 0.78, y + radio * 0.10, 2.7),
        (z + radio * 0.45, medio_ancho, y + radio * 1.20,
         y - radio * 0.78, y + radio * 0.10, 2.7),
        (z + radio * 1.45, medio_ancho * 0.50, y + radio * 0.66,
         y - radio * 0.34, y + radio * 0.12, 2.2),
        (z + radio * 2.05, 0.0, y + radio * 0.22, y + radio * 0.22),
    ], x=x)
    o = p.malla(nombre, "casco", lados=20, paso=0.08)
    o.data.name = f"m-{nombre}"
    if simetria:
        espejo(o)
    return o


exportar(construir(), SALIDA, ENVERGADURA)
