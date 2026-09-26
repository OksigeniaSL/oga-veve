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

**Y las proporciones de su clase**: el morro largo y afilado de un turbohélice
de línea, el fuselaje esbelto, las góndolas largas que sobresalen por detrás
del ala —ahí se mete el tren— con su toma de aire bajo el cono y sus escapes a
los lados, y hélices de cuatro palas con forma de pala.

Los ayudantes están en `comun.py` y `exterior.py`. Aquí queda solo lo que es
**este** avión.

    blender --background --python modelos/jaz-60-arasunu.py

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
    bisagra, espejo, flap, flaps_libres, flaps_moviles, helice, llantas,
    neumaticos, paneles, paneles_zy, ranurado, recogido, simetricos,
    superficie, varillas, ventanas, zy,
)

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# De `src/flight/aircraft.ts`: envergadura 19,8 m, cuerda 2,0 y cinco toneladas
# y media. El juego reescala el modelo a la envergadura de la ficha al
# cargarlo, así que modelar con las de verdad es lo único que garantiza que no
# se deforme.
ENVERGADURA = 19.8
CUERDA = 2.0
MORRO = -7.60
COLA = 9.60

ALA_Y = -0.55
ALA_Z = -0.95
DIEDRO = math.radians(6.5)

# Los motores. Hélice de dos metros sesenta y cuatro, que es lo que mueve un
# turbohélice de este porte, y por eso van a tres metros diez del eje: la punta
# de pala pasa a ochenta centímetros del costado.
MOTOR = 3.10
RADIO_HELICE = 1.32
EJE_HELICE = -0.50
Z_HELICE = -2.86

# El tren: 2,2 m del eje al suelo, el `gearHeight` de su ficha. Las ruedas,
# treinta centímetros por debajo de la punta de la pala: ese hueco es lo que
# decide lo largas que son las patas en un avión de ala baja con hélices
# grandes.
TREN = 2.20
RUEDA = 0.39
RUEDA_MORRO = 0.30
PRINCIPAL_Z = 0.30
# La batalla de la ficha: 7,21 m.
MORRO_Z = PRINCIPAL_Z - 7.21

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-60.glb",
)

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# El morro largo y afilado de un turbohélice de línea —ahí va la bodega de
# delante y el radar—, el tubo de pasaje y la cola que sube hasta la deriva.
PIEL = Piel([
    (MORRO, 0.0, -0.12, -0.12),
    (-7.50, 0.20, 0.06, -0.30),
    (-7.20, 0.42, 0.20, -0.52),
    (-6.70, 0.63, 0.32, -0.71),
    (-6.25, 0.77, 0.44, -0.83),
    (-5.70, 0.86, 0.76, -0.91),
    (-5.10, 0.91, 0.92, -0.95),
    (-4.40, 0.925, 0.95, -0.95),
    (2.60, 0.925, 0.95, -0.95),
    (4.60, 0.86, 0.93, -0.68),
    (6.60, 0.62, 0.88, -0.22),
    (8.10, 0.40, 0.83, 0.18),
    (9.20, 0.20, 0.78, 0.46),
    (COLA, 0.08, 0.74, 0.58),
])


def y_ala(x):
    return ALA_Y + x * math.tan(DIEDRO)


def construir():
    limpiar()
    piezas = []

    morro = [MORRO + 0.1 * i for i in range(1, 30)]
    piezas.append(PIEL.malla("fuselaje", lados=40, paso=0.3, extra=morro))

    # El carenado de la raíz del ala: la panza se ensancha donde el ala
    # entra, que es lo que hace que no parezca clavada.
    carenado = Piel([
        (-1.9, 0.0, -0.55, -0.55),
        (-1.2, 0.80, -0.40, -0.98),
        (0.6, 0.98, -0.35, -1.06),
        (1.8, 0.80, -0.40, -1.0),
        (2.9, 0.0, -0.70, -0.70),
    ], n=2.4)
    piezas.append(carenado.malla("carenado", "casco", lados=28, paso=0.3))

    # ── Parabrisas y ventanillas ──────────────────────────────────────────
    piezas.append(paneles("parabrisas", PIEL, simetricos([
        [(-6.22, 3), zy(PIEL, -6.10, 0.30), zy(PIEL, -5.62, 0.72),
         (-5.62, 3)],
    ]), fuera=0.008, div=6))
    piezas.append(paneles_zy("parabrisas-lado", PIEL, [
        [(-6.02, 0.30), (-5.40, 0.30), (-5.18, 0.72), (-5.58, 0.76)],
    ], fuera=0.008, div=5))

    # Diez ventanillas por costado, ovaladas y más altas que anchas: es lo
    # que dice «esto lleva pasaje» desde la otra punta de la plataforma.
    fila = [-3.35 + i * 0.80 for i in range(10)]
    piezas.append(ventanas("ventanillas", PIEL, fila, 0.24, 0.40, 0.30,
                           radio=0.14, fuera=0.008))
    piezas.append(contorno("puerta", PIEL, -4.25, -0.12, 1.50, 0.74,
                           radio=0.12, grueso=0.025, fuera=0.012))

    # La franja, azul con su raya ocre, que sube a la deriva por la cola.
    def sube(base, desde=4.2, cuanto=0.26):
        return lambda z: base + max(0.0, z - desde) * cuanto

    arriba = sube(0.00)

    def abajo(z):
        return arriba(z) - 0.28 * max(0.0, min(1.0, (z + 6.6) / 1.2))

    piezas.append(banda("cintura", PIEL, -6.6, 7.3, abajo, arriba,
                        fuera=0.008, paso=0.15))
    piezas.append(banda("cintura-fina", PIEL, -6.2, 7.2, sube(-0.36),
                        sube(-0.32), material_="detalle", fuera=0.008,
                        paso=0.15, filas=1))

    # Lo de dentro: dos plazas de frente, el panel a setenta centímetros de la
    # cara y el suelo en la panza. Ver `cabina` en `comun.py`.
    cab = cabina(
        # Este avión mete las patas, así que lleva su palanca.
        tren=True,
        ojos_z=-5.20,
        ancho=0.62,
        alto_panel=0.18,
        y_suelo=-0.44,
        y_respaldo=0.26,
        plazas=(-0.36, 0.36),
        pantallas_en=0.36,
        palancas=2,
        relojes=10,
        mide="par",
        suelo_atras=1.60,
    )
    piezas += cab
    dentro_de(PIEL, cab)

    # ── Ala ───────────────────────────────────────────────────────────────
    #
    # Recta y afinándose hacia la punta, con el borde de salida algo hacia
    # delante: la planta de un turbohélice que no pasa de quinientos por
    # hora. Flaps de dentro y de fuera del motor y alerones en la punta.
    semi = ENVERGADURA / 2
    estaciones = [
        de_ala(0.0, y_ala(0.0), ALA_Z, 2.60, 0.17, 6.5, 2.0),
        de_ala(MOTOR, y_ala(MOTOR), ALA_Z + 0.10, 2.35, 0.16, 6.5, 1.5),
        # Menos la punta redonda, que sobresale medio espesor.
        de_ala(semi - 0.07, y_ala(semi), ALA_Z + 0.45, 1.15, 0.12, 6.5, -1.0),
    ]
    j = "oscuro"
    # El de dentro acaba **antes de la góndola**, no en la junta pintada de
    # detrás de ella: un flap no baja a través de un motor. El trozo de
    # encima de la góndola se queda quieto, como el carenado de detrás del
    # motor de un turbohélice de verdad. Ver `jaz-40-panambi.py`.
    flaps = [flap("dentro", 1.02, 2.64, 0.73), flap("fuera", 3.70, 6.3, 0.73)]
    ala = superficie("ala", estaciones, curvatura=0.02, flaps=flaps, zonas=[
        (j, 0.95, 6.3, 0.715, 0.73),
        (j, 0.95, 1.02, 0.73, 1.0),
        (j, 3.62, 3.70, 0.73, 1.0),
        (j, 6.3, 6.38, 0.73, 1.0),
        (j, 6.45, 9.4, 0.74, 0.755),
        (j, 9.35, 9.42, 0.755, 1.0),
    ])
    piezas.append(ala)
    # Ranurados, con los topes de un turbohélice de diecinueve plazas: diez,
    # veinte y treinta y cinco. Ver `ranurado`.
    piezas += flaps_moviles(ala, flaps, ranurado(
        muescas=(0, 10, 20, 35), recorrido=(0, 0.15, 0.21, 0.25)))

    # ── Góndolas y hélices ────────────────────────────────────────────────
    #
    # Largas por detrás del ala: ahí es donde se recoge el tren principal en un
    # turbohélice de ala baja, y por eso las góndolas de estos aviones salen
    # tanto hacia atrás. La toma de aire, debajo del cono —la «barbilla» de
    # todo turbohélice—, y los escapes a los costados.
    gondola = Piel([
        (Z_HELICE + 0.08, 0.23, EJE_HELICE + 0.23, EJE_HELICE - 0.23,
         EJE_HELICE),
        (-2.62, 0.36, EJE_HELICE + 0.36, EJE_HELICE - 0.44, EJE_HELICE),
        (-2.10, 0.45, EJE_HELICE + 0.49, EJE_HELICE - 0.53),
        (-1.00, 0.46, EJE_HELICE + 0.52, EJE_HELICE - 0.56),
        (0.30, 0.43, EJE_HELICE + 0.44, EJE_HELICE - 0.52),
        (1.60, 0.34, EJE_HELICE + 0.28, EJE_HELICE - 0.40),
        (2.70, 0.16, EJE_HELICE + 0.08, EJE_HELICE - 0.20),
        (3.10, 0.0, EJE_HELICE - 0.06, EJE_HELICE - 0.06),
    ], x=MOTOR, n=2.2)
    piezas.append(espejo(gondola.malla("gondola", "casco", lados=28,
                                       paso=0.25)))
    piezas.append(espejo(paneles("toma", gondola, simetricos([
        [(-2.66, 148), (-2.66, 180), (-2.50, 180), (-2.50, 150)],
    ]), material_="oscuro", fuera=0.008, div=3)))
    piezas.append(espejo(ventanas("escapes", gondola, [-1.30], EJE_HELICE
                                  + 0.12, 0.26, 0.44, radio=0.12,
                                  material_="oscuro", fuera=0.008)))
    for lado, nombre in ((-1, "izquierda"), (1, "derecha")):
        piezas += helice(f"helice-{nombre}",
                         (lado * MOTOR, EJE_HELICE, Z_HELICE),
                         radio=RADIO_HELICE, cuantas=4, buje=0.24,
                         cuerda=0.22, largo_cono=0.55, giro=lado)

    # ── Cola en T ─────────────────────────────────────────────────────────
    #
    # **Aquí está la silueta.** La deriva sube dos metros y medio sobre el lomo
    # y el estabilizador va **en su punta**, no en el fuselaje: esa T es lo que
    # separa a este avión del Panambi de un vistazo, y es la razón de que la
    # ficha le ponga menos actitud en tierra que a los demás —una cola en T no
    # perdona rotar de más, porque al hacerlo se mete ella sola en la estela
    # del ala—. Ver `maxGroundPitch` en `aircraft.ts`.
    #
    # Y el estabilizador sale de la punta de la deriva, no de un número
    # escrito aparte: si se escribieran los dos por separado, mover la deriva
    # dejaría el plano flotando en el aire.
    alto = 3.55
    punta_z = 7.30
    punta_c = 1.75
    piezas.append(superficie("deriva", [
        de_deriva(0.0, 0.72, 3.80, 4.60, 0.05),
        de_deriva(0.0, 1.10, 5.40, 2.95, 0.12),
        de_deriva(0.0, alto, punta_z, punta_c, 0.12),
    ], material_="capo", simetria=False, zonas=[
        ("oscuro", 0.55, 2.4, 0.66, 0.675),
    ], punta=False))
    piezas.append(superficie("estabilizador", [
        de_ala(0.0, alto - 0.02, punta_z - 0.05, 1.85, 0.11),
        de_ala(3.45, alto - 0.02, punta_z + 0.55, 1.00, 0.10),
    ], material_="capo", zonas=[
        ("oscuro", 0.3, 3.2, 0.62, 0.64),
    ]))
    # La bala que tapa el cruce de la deriva con el estabilizador.
    bala = Piel([
        (punta_z - 0.45, 0.0, alto + 0.02, alto + 0.02),
        (punta_z + 0.1, 0.14, alto + 0.16, alto - 0.12),
        (punta_z + 1.4, 0.13, alto + 0.14, alto - 0.10),
        (punta_z + 2.1, 0.0, alto + 0.02, alto + 0.02),
    ])
    piezas.append(bala.malla("bala-de-cola", "capo", lados=16, paso=0.2))

    # ── Tren triciclo ─────────────────────────────────────────────────────
    #
    # El principal sale de las góndolas, con dos ruedas por pata —reparten la
    # carga y dejan aterrizar en pista sin asfaltar—, y se mete **hacia
    # delante**, dentro de la góndola, detrás del motor: si falla la
    # hidráulica, el viento lo empuja fuera y lo traba. El de morro sale bajo
    # la cabina y se mete **hacia atrás**, porque por delante el morro se
    # afila y no cabe.
    #
    # El tornapuntas de cada pata nace a los lados del muñón, en el eje de la
    # bisagra, para girar con ella sin atravesar nada.
    eje = -(TREN - RUEDA)
    arriba = EJE_HELICE - 0.05
    principal = [varillas("pata-principal", [
        ((MOTOR, arriba, PRINCIPAL_Z), (MOTOR, eje + 0.45, PRINCIPAL_Z), 0.085),
        ((MOTOR, eje + 0.50, PRINCIPAL_Z), (MOTOR, eje, PRINCIPAL_Z), 0.055),
        ((MOTOR - 0.32, eje, PRINCIPAL_Z), (MOTOR + 0.32, eje, PRINCIPAL_Z),
         0.045),
        ((MOTOR - 0.22, arriba, PRINCIPAL_Z),
         (MOTOR, eje + 0.60, PRINCIPAL_Z - 0.02), 0.035),
        ((MOTOR + 0.22, arriba, PRINCIPAL_Z),
         (MOTOR, eje + 0.60, PRINCIPAL_Z - 0.02), 0.035),
    ], material_="gris")]
    ruedas = [(MOTOR - 0.24, eje, PRINCIPAL_Z), (MOTOR + 0.24, eje,
                                                  PRINCIPAL_Z)]
    principal.append(neumaticos("rueda-principal", ruedas, RUEDA, 0.22))
    principal.append(llantas("rueda-principal-llanta", ruedas, RUEDA, 0.22))
    # Hacia delante: la rueda va al morro girando sobre el eje x.
    patas = bisagra("principal", (MOTOR, arriba, PRINCIPAL_Z), (1, 0, 0), 90,
                    principal, simetria=True)

    eje_m = -(TREN - RUEDA_MORRO)
    arriba_m = -0.55
    morro = [varillas("pata-morro", [
        ((0, arriba_m, MORRO_Z), (0, eje_m + 0.40, MORRO_Z), 0.065),
        ((0, eje_m + 0.45, MORRO_Z), (0, eje_m, MORRO_Z + 0.05), 0.042),
        ((-0.18, eje_m, MORRO_Z + 0.05), (0.18, eje_m, MORRO_Z + 0.05), 0.035),
    ], material_="gris")]
    ruedas_m = [(-0.13, eje_m, MORRO_Z + 0.05), (0.13, eje_m, MORRO_Z + 0.05)]
    morro.append(neumaticos("rueda-morro", ruedas_m, RUEDA_MORRO, 0.16))
    morro.append(llantas("rueda-morro-llanta", ruedas_m, RUEDA_MORRO, 0.16))
    # Hacia atrás: el mismo eje x, girando al revés.
    patas += bisagra("morro", (0, arriba_m, MORRO_Z), (-1, 0, 0), 90, morro)
    # Y los flaps también tapan: son el trozo de ala de detrás del pozo; y
    # la franja que no baja, lo que queda de él donde acaba cada flap.
    recogido(patas, [p for p in piezas if p.type == "MESH" and (
        p.name in ("fuselaje", "carenado", "gondola", "ala")
        or p.name.startswith(("flap-", "franja-")))])
    piezas += patas
    # Y ningún flap atraviesa nada al bajar: ni el tren, fuera o metido, ni
    # la góndola que lo parte en dos. Ver `flaps_libres`.
    flaps_libres(piezas, [p for p in piezas if p.type == "MESH" and (
        (p.parent and p.parent.name.startswith("bisagra-"))
        or p.name in ("fuselaje", "carenado", "gondola"))])

    piezas.append(centro_de_gravedad(ALA_Z + 0.08 + 2.2 * 0.27))
    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
