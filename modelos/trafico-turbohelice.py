"""
El turbohélice regional del tráfico, modelado en Blender.

No es un avión de la flota: es el que **une las islas** y el que hace cola
contigo en Los Rodeos. Hasta ahora se dibujaba con las dos primitivas de la
fábrica —ver `src/world/aviones-de-las-islas.ts`—, unos cuatrocientos
triángulos que desde lejos dicen «turbohélice de ala alta» y de cerca dicen
«juguete»: esperando delante de ti en la paralela, a treinta metros, es un
tubo gris con dos tablas. Contado jugando: «esos aviones se ven feos».

Lo que tiene que reconocerse, y por eso está aquí y no en la flota —el JAZ 60
es de ala baja y diecinueve plazas, y ponerlo en su lugar sería enseñar un
avión que no pasa por ahí—:

- **El ala alta, encima del fuselaje**, con su carenado en el lomo.
- **Las góndolas colgadas del ala**, largas, con hélices de seis palas.
- **Los carenados del tren a los costados de la panza**: el tren principal
  no cabe en un ala que está arriba, y se mete en el fuselaje.
- **La cola en T.**
- Las medidas de su clase, redondeadas de fichas públicas: veintisiete metros
  de ala y otros tantos de largo, hélices de casi cuatro metros.

Sin cabina por dentro ni marca de la casa: el tráfico no las enseña, y el
horneado las quitaría igual (ver `cuerpos-del-trafico.ts`). Y sin flaps ni
tren que se muevan, que el tráfico no los mueve.

    blender --background --python modelos/trafico-turbohelice.py
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import exportar, limpiar  # noqa: E402
from exterior import (  # noqa: E402
    Piel, banda, contorno, de_ala, de_deriva, espejo, helice, llantas,
    neumaticos, paneles, simetricos, superficie, varillas, ventanas, zy,
)

# ── Las medidas de su clase ───────────────────────────────────────────────
#
# Veintisiete metros de envergadura, que es la de `TIPOS.turbohelice` en
# `src/world/trafico.ts`: el juego lo reescala a ella al cargarlo, así que
# modelar con la de verdad es lo que garantiza que no se deforme.
ENVERGADURA = 27.05
RADIO = 1.43
MORRO = -12.60
COLA = 13.90

# El ala, arriba: el plano medio de la raíz por encima del lomo.
ALA_Y = RADIO + 0.12
ALA_Z = -1.30
DIEDRO = math.radians(2.0)

# Los motores, colgados del ala a cuatro metros del eje. Hélices de seis
# palas y casi cuatro metros: la punta pasa a sesenta centímetros del
# costado, que es lo que decide dónde van.
MOTOR = 4.05
RADIO_HELICE = 1.96
EJE_HELICE = 1.05
Z_HELICE = -3.55

# El tren: el fondo del fuselaje a un metro del suelo, que es lo que deja
# subir por una escalerilla corta. Ruedas dobles en cada pata.
SUELO = -RADIO - 0.95
RUEDA = 0.41
RUEDA_MORRO = 0.23
PRINCIPAL_Z = 1.25
VIA = 2.05
MORRO_Z = PRINCIPAL_Z - 10.77

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "trafico-turbohelice.glb",
)

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# El morro romo de un turbohélice de línea, con el parabrisas en escalón; el
# tubo de pasaje, largo y recto; y la cola que sube hacia la deriva.
PIEL = Piel([
    (MORRO, 0.0, -0.32, -0.32),
    (-12.45, 0.42, 0.02, -0.66),
    (-12.15, 0.74, 0.34, -0.98),
    (-11.70, 1.02, 0.70, -1.20),
    (-11.10, 1.23, 1.04, -1.34),
    (-10.40, 1.37, 1.29, -1.41),
    (-9.60, 1.425, 1.41, -1.43),
    (-8.80, RADIO, RADIO, -RADIO),
    (5.40, RADIO, RADIO, -RADIO),
    (7.40, 1.35, 1.42, -1.02),
    (9.40, 1.06, 1.38, -0.42),
    (11.30, 0.72, 1.33, 0.16),
    (12.90, 0.38, 1.27, 0.62),
    (COLA, 0.08, 1.20, 0.92),
])


def y_ala(x):
    return ALA_Y + x * math.tan(DIEDRO)


def construir():
    limpiar()
    piezas = []

    morro = [MORRO + 0.1 * i for i in range(1, 36)]
    piezas.append(PIEL.malla("fuselaje", lados=40, paso=0.35, extra=morro,
                             zonas=[("gris", -9.0, 5.4, 150, 180)]))

    # El lomo sobre el que se asienta el ala: sin él el ala parece posada
    # encima de un tubo, y en los de verdad es una joroba larga.
    lomo = Piel([
        (-3.40, 0.0, RADIO - 0.10, RADIO - 0.10),
        (-2.20, 0.70, RADIO + 0.30, RADIO - 0.40),
        (0.40, 0.82, RADIO + 0.42, RADIO - 0.40),
        (2.60, 0.66, RADIO + 0.32, RADIO - 0.40),
        (4.40, 0.0, RADIO - 0.05, RADIO - 0.05),
    ], n=2.4)
    piezas.append(lomo.malla("lomo", "casco", lados=24, paso=0.3))

    # Los carenados del tren, a los costados de la panza: ahí se mete el
    # principal, que en un ala alta no tiene otro sitio.
    carenado = Piel([
        (-0.60, 0.0, -0.95, -0.95),
        (0.10, 0.40, -0.62, -1.40),
        (1.30, 0.46, -0.56, -1.50),
        (2.60, 0.40, -0.62, -1.40),
        (3.70, 0.0, -0.95, -0.95),
    ], x=1.52, n=2.4)
    piezas.append(espejo(carenado.malla("carenado-tren", "casco", lados=24,
                                        paso=0.3)))

    # ── Parabrisas, ventanillas y puertas ─────────────────────────────────
    # Dos paneles de frente y dos de costado, grandes: la cabina de uno de
    # línea se ve desde la calle de al lado.
    piezas.append(paneles("parabrisas", PIEL, simetricos([
        [(-11.62, 3), zy(PIEL, -11.52, 0.34), zy(PIEL, -10.98, 0.86),
         (-10.92, 3)],
        [zy(PIEL, -11.44, 0.30), zy(PIEL, -10.62, 0.26),
         zy(PIEL, -10.30, 0.90), zy(PIEL, -10.90, 0.92)],
    ]), fuera=0.008, div=6))

    # Una fila larga de ventanillas pequeñas: es lo que dice «pasaje» desde
    # la otra punta de la plataforma, y lo que da la escala.
    fila = [-8.30 + i * 0.76 for i in range(17)]
    piezas.append(ventanas("ventanillas", PIEL, fila, 0.28, 0.34, 0.26,
                           radio=0.11, fuera=0.008))
    piezas.append(contorno("puerta", PIEL, -9.35, -0.05, 1.70, 0.76,
                           radio=0.12, grueso=0.03, fuera=0.012))
    piezas.append(contorno("puerta-atras", PIEL, 5.00, -0.10, 1.60, 0.72,
                           radio=0.12, grueso=0.03, fuera=0.012))

    # La franja de cintura, que sube hacia la cola. Del color de la librea.
    def arriba(z):
        return -0.12 + max(0.0, z - 5.0) * 0.14

    def abajo(z):
        return arriba(z) - 0.22

    piezas.append(banda("cintura", PIEL, -11.0, 11.8, abajo, arriba,
                        material_="detalle", fuera=0.008, paso=0.3, filas=1))

    # ── Ala ───────────────────────────────────────────────────────────────
    #
    # Recta, con el borde de ataque casi sin flecha y el de salida afilándose
    # hacia la punta, y un poco de diedro. La junta de los flaps y alerones,
    # dibujada.
    semi = ENVERGADURA / 2
    estaciones = [
        de_ala(0.0, y_ala(0.0), ALA_Z, 2.57, 0.18, 2.0, 1.0),
        de_ala(MOTOR, y_ala(MOTOR), ALA_Z + 0.05, 2.45, 0.17, 2.0, 0.5),
        de_ala(semi - 0.07, y_ala(semi), ALA_Z + 0.40, 1.40, 0.13, 2.0, -1.0),
    ]
    j = "oscuro"
    piezas.append(superficie("ala", estaciones, curvatura=0.02, zonas=[
        (j, 1.3, 9.2, 0.735, 0.75),
        (j, 9.2, 12.9, 0.75, 0.765),
        (j, 9.15, 9.23, 0.75, 1.0),
    ]))

    # ── Góndolas y hélices ────────────────────────────────────────────────
    #
    # Colgadas del ala, largas y finas, con la toma de aire en la barbilla.
    E = EJE_HELICE
    gondola = Piel([
        (Z_HELICE + 0.10, 0.27, E + 0.27, E - 0.27, E),
        (-3.20, 0.44, E + 0.44, E - 0.50, E),
        (-2.50, 0.54, E + 0.58, E - 0.62),
        (-1.40, 0.56, y_ala(MOTOR) - E + E - 0.05, E - 0.64),
        (0.40, 0.50, y_ala(MOTOR) - 0.05, E - 0.54),
        (1.90, 0.36, y_ala(MOTOR) - 0.10, E - 0.30),
        (3.00, 0.12, y_ala(MOTOR) - 0.20, E + 0.02),
        (3.40, 0.0, E + 0.20, E + 0.20),
    ], x=MOTOR, n=2.2)
    piezas.append(espejo(gondola.malla("gondola", "casco", lados=28,
                                       paso=0.25)))
    piezas.append(espejo(paneles("toma", gondola, simetricos([
        [(-3.16, 150), (-3.16, 180), (-2.96, 180), (-2.96, 152)],
    ]), material_="oscuro", fuera=0.008, div=3)))
    for lado, nombre in ((-1, "izquierda"), (1, "derecha")):
        piezas += helice(f"helice-{nombre}", (lado * MOTOR, E, Z_HELICE),
                         radio=RADIO_HELICE, cuantas=6, buje=0.30,
                         cuerda=0.24, largo_cono=0.80, giro=lado)

    # ── Cola en T ─────────────────────────────────────────────────────────
    #
    # La deriva, grande y en flecha, con el estabilizador en su punta: la T
    # es la silueta de esta clase de avión. Del color de la librea, que es
    # como van pintados los de verdad.
    alto = 5.15
    punta_z = 12.25
    punta_c = 2.00
    piezas.append(superficie("deriva", [
        de_deriva(0.0, 1.10, 8.10, 5.60, 0.08),
        de_deriva(0.0, 1.90, 9.40, 4.15, 0.11),
        de_deriva(0.0, alto, punta_z, punta_c, 0.12),
    ], material_="cola", simetria=False, zonas=[
        ("oscuro", 0.9, 3.9, 0.66, 0.675),
    ], punta=False))
    piezas.append(superficie("estabilizador", [
        de_ala(0.0, alto - 0.02, punta_z - 0.05, 2.05, 0.11),
        de_ala(3.65, alto + 0.05, punta_z + 0.75, 1.10, 0.10),
    ], material_="cola", zonas=[
        ("oscuro", 0.3, 3.4, 0.64, 0.66),
    ]))
    bala = Piel([
        (punta_z - 0.50, 0.0, alto + 0.02, alto + 0.02),
        (punta_z + 0.10, 0.16, alto + 0.18, alto - 0.14),
        (punta_z + 1.60, 0.15, alto + 0.16, alto - 0.12),
        (punta_z + 2.35, 0.0, alto + 0.02, alto + 0.02),
    ])
    piezas.append(bala.malla("bala-de-cola", "cola", lados=16, paso=0.2))

    # ── Tren, fuera ───────────────────────────────────────────────────────
    #
    # El principal baja de su carenado con dos ruedas por pata; el de morro,
    # también doble, bajo la cabina.
    eje = SUELO + RUEDA
    arriba_p = -0.95
    patas = [varillas("pata-principal", [
        ((VIA - 0.35, arriba_p, PRINCIPAL_Z), (VIA - 0.05, eje + 0.35,
                                                PRINCIPAL_Z), 0.10),
        ((VIA - 0.05, eje + 0.40, PRINCIPAL_Z), (VIA, eje, PRINCIPAL_Z), 0.06),
        ((VIA - 0.30, eje, PRINCIPAL_Z), (VIA + 0.30, eje, PRINCIPAL_Z),
         0.05),
    ], material_="gris", simetria=True)]
    ruedas = [(VIA - 0.22, eje, PRINCIPAL_Z), (VIA + 0.22, eje, PRINCIPAL_Z)]
    patas.append(neumaticos("rueda-principal", ruedas, RUEDA, 0.24,
                            simetria=True))
    patas.append(llantas("rueda-principal-llanta", ruedas, RUEDA, 0.24,
                         simetria=True))

    eje_m = SUELO + RUEDA_MORRO
    patas.append(varillas("pata-morro", [
        ((0, -RADIO + 0.25, MORRO_Z), (0, eje_m + 0.35, MORRO_Z), 0.07),
        ((0, eje_m + 0.40, MORRO_Z), (0, eje_m, MORRO_Z + 0.06), 0.045),
        ((-0.18, eje_m, MORRO_Z + 0.06), (0.18, eje_m, MORRO_Z + 0.06),
         0.035),
    ], material_="gris"))
    ruedas_m = [(-0.14, eje_m, MORRO_Z + 0.06), (0.14, eje_m, MORRO_Z + 0.06)]
    patas.append(neumaticos("rueda-morro", ruedas_m, RUEDA_MORRO, 0.16))
    patas.append(llantas("rueda-morro-llanta", ruedas_m, RUEDA_MORRO, 0.16))
    piezas += patas
    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
