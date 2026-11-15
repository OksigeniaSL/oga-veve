"""
El JAZ 50 *Tujuju*, modelado en Blender.

Un DHC-6 Twin Otter de la Serie 400 tal como es: el turbohélice de ala alta y
tren fijo de las pistas cortas de tierra y de hierba. Lo que lo hace
reconocible de un vistazo, y por eso lo que más cuidado lleva aquí:

- **El ala alta y recta**, de cuerda constante, con una **riostra** a cada
  lado que baja del ala, junto a la góndola, hasta el carenado del tren.
- **Las dos góndolas de los PT6A colgadas del ala**, con la toma de aire bajo
  el cono —la «barbilla»—, los escapes a los costados y **hélices de tres
  palas**.
- **El tren fijo de triciclo**: las principales en dos patas que salen
  abiertas de un carenado bajo el costado, y la de morro bajo la cabina.
- **El morro largo** de la serie 300 y de la 400, que es la bodega de delante.
- **La cola**: la deriva grande en flecha con su aleta dorsal, el timón de
  dirección hasta abajo, y el estabilizador sobre el cono, al pie de la
  deriva.
- **Las puertas donde van**: la de cada piloto a los dos lados de la cabina,
  la doble de carga a la izquierda detrás, la de pasaje a la derecha detrás,
  la salida de emergencia delante a la izquierda y la bodega del morro.

## Las fuentes

- **EASA, hoja de tipo EASA.IM.A.575**, número 6 (18-6-2026), A.III.4 y 6:
  envergadura 19,81 m, largo 15,77 m, alto 19 ft 6 in, cuerda media 1,98 m,
  hélice Hartzell de tres palas y 2,591 m que gira a la derecha vista desde
  atrás, y los neumáticos (A.III.20): 11.00 × 12 los principales y 8.90 ×
  12.5 el de morro.
- **De Havilland Canada, *Twin Otter Classic 300-G Wheels Specifications***
  (2025), la ficha del -400 con otro nombre: alto 5,94 m, estabilizador de
  6,29 m de punta a punta, cabina de 5,61 × 1,75 × 1,50 m, la puerta de la
  izquierda de 1,27 × 1,42 m y la de la derecha de 0,76 × 1,16.
- **NASA TM-101427** (Ranaudo y otros, 1989), figura 1: la vista en tres
  planos acotada del Twin Otter de investigación de NASA Lewis, que es de
  donde sale todo lo que las hojas no dan —la batalla de 4,5 m, la vía de
  3,81, la cuerda del estabilizador de 1,45, la cola que toca a 10,5°— y,
  medido en el dibujo, dónde va cada cosa: el ala, las góndolas, las patas,
  la riostra y la deriva. Su dibujo pone el avión 28 cm más bajo que su
  propia cota de alto, 5,66 m donde las hojas dan 5,94, y le dibuja ruedas de
  medio metro donde los neumáticos de su hoja miden ochenta centímetros: aquí
  se toman sus formas y se sube el avión esos 28 cm, que es lo que dejan ver
  las fotos con ruedas de verdad.
- **Fotos** de Wikimedia Commons, para situar puertas, ventanillas, riostra y
  cola: «Aurora, DHC-6-400, RA-67284» (Fedor Leukhin, CC BY-SA 2.0), de frente
  y de costado, y los -400 C-GVKI y A3-KLT rodando (Bidgee, CC BY-SA 3.0 AU).
  Se han mirado, no se han copiado: aquí no entra ni un píxel suyo.

## Los ejes

Como en los demás guiones: la `x` a la derecha, la `y` arriba y la `z` hacia la
cola, y el origen en el centro de gravedad. Las cotas se escriben como las da
el dibujo —metros desde la punta del morro, `d`, y altura sobre el suelo,
`h`— y `Z` e `Y` las pasan a los ejes del modelo: así cada número se puede
comparar con su fuente sin hacer cuentas.

    blender --background --python modelos/jaz-50-tujuju.py

Si el fichero no está, el juego sigue con la fábrica: que falte un recurso no
puede dejar a nadie sin volar.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import exportar, limpiar  # noqa: E402
from exterior import (  # noqa: E402
    Piel, banda, centro_de_gravedad, contorno, de_ala, de_deriva, en_punta,
    espejo, estacion, flap, flaps_libres, flaps_moviles, helice, largo_hasta,
    llantas, mando, mandos_libres, mandos_moviles, marca, neumaticos, paneles,
    paneles_zy, piezas_de_mandos, ranurado, simetricos, superficie, varillas,
    ventanas, zy,
)
from mathutils import Vector  # noqa: E402

# ── Las medidas ───────────────────────────────────────────────────────────
#
# 65 ft de envergadura, 19,81 m (EASA.IM.A.575, A.III.4), y la cuerda de 1,98:
# el ala del Twin Otter es recta y de cuerda constante. El juego reescala el
# modelo a la envergadura de la ficha al cargarlo, así que modelar con la de
# verdad es lo único que garantiza que no se deforme.
ENVERGADURA = 19.81
CUERDA = 1.98
# 51 ft 9 in de la punta del morro al borde de salida del timón, 15,77 m
# (A.III.4). Lo mide `exportar` y lo dice al acabar.
LARGO = 15.77

# **El centro de gravedad**, a 5,60 m de la punta del morro: el 28 % de la
# cuerda, dentro de los límites de su hoja de tipo —del 20 al 36 % de la cuerda
# media al despegar (A.III.13)—, como el del JAZ 20. Y a media altura del
# fuselaje, en su eje, como el del JAZ 60: 1,98 m sobre el suelo, que es el
# `gearHeight` de la ficha.
CDG = 5.60
TREN = 1.98


def Z(d):
    """De metros desde la punta del morro a la `z` del modelo."""
    return d - CDG


def Y(h):
    """De altura sobre el suelo a la `y` del modelo."""
    return h - TREN


# El ala: el borde de ataque a 5,05 m del morro (NASA, figura 1, en planta), y
# el plano de la cuerda en la raíz a 3,15 m del suelo, apoyado en el techo de
# la cabina. Dos grados y medio de diedro, medidos en la foto de frente del
# RA-67284: la vista de NASA es demasiado tosca para leerlo y no se ha
# encontrado la cifra publicada.
ALA_D = 5.05
ALA_H = 3.15
DIEDRO = math.radians(2.5)

# **Los motores, a 2,75 m del eje**: medidos en la vista de frente de NASA,
# entre los centros de los dos discos de 2,59 m, con la vía de 3,81 como
# regla. La punta de la pala pasa a 54 cm del costado.
MOTOR = 2.75
# La hélice de 8 ft 6 in, 2,591 m (A.III.6.2).
RADIO_HELICE = 2.591 / 2
# El eje de la hélice a 2,83 m del suelo y el disco a 3,62 m del morro, en la
# vista de costado: la punta de la pala pasa a metro y medio del suelo, que
# es lo que le deja posarse en una pista de tierra sin comérsela.
EJE_HELICE = 2.83
HELICE_D = 3.62

# El tren, de la misma figura: **4,5 m de batalla y 3,81 de vía**, las
# principales a 6,31 m del morro. Las ruedas, de los neumáticos de su hoja de
# tipo (A.III.20): un 11.00 × 12 mide unos 79 cm de diámetro y el 8.90 × 12.5
# del morro, unos 66.
PRINCIPAL_D = 6.31
BATALLA = 4.5
MORRO_D = PRINCIPAL_D - BATALLA
VIA = 3.81
RUEDA = 0.395
RUEDA_MORRO = 0.33

# **La cola toca a 10,5°**, la cota de NASA (figura 1): de la huella de las
# principales a lo más bajo de detrás, que es la punta de abajo del timón.
# Aquí se pone esa punta un pelo por encima de la recta, para que el dibujo
# toque en esa actitud y no antes. Lo mide `apoyo.test.ts`.
COLA_TOCA = math.radians(10.5)

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-50.glb",
)


def P(d, ancho, techo, panza, medio=None, n=None):
    """Una estación de piel dada en cotas del dibujo."""
    e = [Z(d), ancho, Y(techo), Y(panza)]
    if medio is not None or n is not None:
        e.append(None if medio is None else Y(medio))
    if n is not None:
        e.append(n)
    return tuple(e)


# ── El fuselaje ───────────────────────────────────────────────────────────
#
# Una caja de esquinas redondas: el Twin Otter no está presurizado, y su
# sección es la de una furgoneta, de costados rectos, y no la de un tubo. 1,82
# m de ancho por fuera —en la vista de NASA, 1,77 en planta y 1,87 de frente—,
# los 1,75 de su cabina con su pared, y del suelo a 0,90 m al techo a 3,07: el
# combustible va debajo del suelo de la cabina, y por eso el fuselaje es más
# alto que el metro y medio que se puede estar de pie dentro.
#
# Delante, **el morro largo** de la serie 300 —la bodega de delante—, romo y
# bajo, y el parabrisas subiendo hasta el ala. Detrás, la panza sube hacia la
# cola y el lomo baja poco: es la cola alta de un avión que tiene que poder
# rotar en una pista corta.
PIEL = Piel([
    P(0.00, 0.0, 1.48, 1.48),
    P(0.08, 0.27, 1.70, 1.30, 1.50, 2.2),
    P(0.30, 0.50, 1.95, 1.18, 1.54, 2.4),
    P(0.75, 0.68, 2.19, 1.10, 1.62, 2.6),
    P(1.40, 0.80, 2.36, 1.05, 1.70, 2.8),
    P(2.10, 0.88, 2.55, 0.99, 1.82, 3.0),
    P(2.50, 0.91, 2.88, 0.94, 1.92, 3.2),
    P(2.85, 0.91, 3.07, 0.91, 1.98, 3.2),
    P(8.40, 0.91, 3.07, 0.90, 1.98, 3.2),
    P(9.60, 0.87, 3.04, 1.00, 2.02, 3.0),
    P(11.00, 0.70, 2.96, 1.20, 2.10, 2.7),
    P(12.40, 0.47, 2.83, 1.40, 2.15, 2.5),
    P(13.30, 0.31, 2.71, 1.51, 2.14, 2.3),
    P(13.82, 0.21, 2.64, 1.56, 2.12, 2.2),
])


def y_ala(x):
    return Y(ALA_H) + x * math.tan(DIEDRO)


def construir():
    limpiar()
    piezas = []

    morro = [Z(0.05 * i) for i in range(1, 30)]
    piezas.append(PIEL.malla("fuselaje", lados=40, paso=0.3, extra=morro))

    # ── Parabrisas, puertas y ventanillas ─────────────────────────────────
    #
    # El parabrisas, de dos paneles con su montante en el centro, subiendo
    # del morro al techo; y detrás, a cada lado, la puerta de cada piloto con
    # su ventanilla grande, que es por donde se sube a la cabina: el Twin
    # Otter no tiene paso de la cabina de pasaje a la de mando.
    piezas.append(paneles("parabrisas", PIEL, simetricos([
        [(Z(2.10), 3), zy(PIEL, Z(2.15), Y(2.40)), zy(PIEL, Z(2.74), Y(2.93)),
         (Z(2.80), 3)],
    ]), fuera=0.008, div=6))
    piezas.append(contorno("puerta-de-cabina", PIEL, Z(2.97), Y(2.06), 1.52,
                           0.66, radio=0.08, grueso=0.022, fuera=0.012))
    piezas.append(paneles_zy("ventanilla-de-cabina", PIEL, [
        [(Z(2.68), Y(2.30)), (Z(3.24), Y(2.30)), (Z(3.24), Y(2.92)),
         (Z(2.84), Y(2.92))],
    ], fuera=0.010, div=5))

    # Seis ventanillas por costado en la cabina de pasaje, cuadradas de
    # esquinas redondas: dos delante del disco de la hélice y cuatro detrás.
    # Las fotos del RA-67284 y del C-GVKI las ponen ahí; su separación exacta no
    # está acotada, y van a paso regular.
    fila = [3.95, 4.55, 5.25, 5.85, 6.45, 7.05]
    piezas.append(ventanas("ventanillas", PIEL, [Z(d) for d in fila],
                           Y(2.36), 0.32, 0.26, radio=0.07, fuera=0.008))

    # **Las puertas de atrás, distintas a cada lado**, como las da su ficha:
    # a la izquierda la doble de carga, de 1,27 × 1,42 m, con su junta en
    # medio y la ventanilla en la hoja de atrás; a la derecha la de pasaje, de
    # 0,76 × 1,16, con la suya. El umbral, a la altura del suelo de la cabina.
    piezas.append(contorno("puerta-de-carga", PIEL, Z(8.20), Y(1.93), 1.42,
                           1.27, radio=0.08, grueso=0.024, fuera=0.012,
                           lados=(-1,)))
    piezas.append(paneles_zy("puerta-de-carga-junta", PIEL, [
        [(Z(8.19), Y(1.25)), (Z(8.21), Y(1.25)), (Z(8.21), Y(2.61)),
         (Z(8.19), Y(2.61))],
    ], material_="oscuro", fuera=0.012, div=2, lados=(-1,)))
    piezas.append(ventanas("ventanilla-de-carga", PIEL, [Z(8.52)], Y(2.36),
                           0.32, 0.26, radio=0.07, fuera=0.010, lados=(-1,)))
    piezas.append(contorno("puerta", PIEL, Z(8.25), Y(1.98), 1.16, 0.76,
                           radio=0.08, grueso=0.024, fuera=0.012, lados=(1,)))
    piezas.append(ventanas("ventanilla-de-la-puerta", PIEL, [Z(8.25)],
                           Y(2.36), 0.32, 0.26, radio=0.07, fuera=0.010,
                           lados=(1,)))
    # La salida de emergencia, la trampilla alrededor de la primera ventanilla
    # de la izquierda: así va marcada en el RA-67284.
    piezas.append(contorno("salida-de-emergencia", PIEL, Z(3.95), Y(2.22),
                           0.68, 0.54, radio=0.08, grueso=0.020, fuera=0.012,
                           lados=(-1,)))
    # Y la bodega del morro, con su puerta a cada lado: es para lo que se
    # alargó el morro en la serie 300.
    piezas.append(contorno("bodega-de-morro", PIEL, Z(1.15), Y(1.74), 0.56,
                           0.86, radio=0.10, grueso=0.020, fuera=0.012))

    # ── La librea ─────────────────────────────────────────────────────────
    #
    # La de la flota, como el JAZ 60: la franja terracota ancha en el costado
    # bajo, de bajo las ventanillas hacia la panza, subiendo hacia la cola y
    # acabando en punta de hoja al pie de la deriva, y la raya fina debajo. Los
    # colores los pone la ficha: ver `LIBREA` en `src/flight/aircraft.ts`.
    cola_sube = Z(9.0)

    def arriba(z):
        return Y(2.03) + max(0.0, z - cola_sube) * 0.087

    def abajo(z):
        return arriba(z) - 0.50 * max(0.0, min(1.0, (z - Z(0.9)) / 2.0))

    fin_banda = Z(13.72)
    abajo_punta = en_punta(abajo, arriba, Z(11.0), fin_banda + 0.01)
    piezas.append(banda("cintura", PIEL, Z(0.9), fin_banda, abajo_punta,
                        arriba, fuera=0.008, paso=0.15))

    def afila(z):
        return (max(0.0, min(1.0, (z - Z(1.3)) / 0.8))
                * (1 - max(0.0, min(1.0, (z - Z(11.0)) / 2.4))))

    def fina_arriba(z):
        return abajo_punta(z) - 0.04 * afila(z)

    piezas.append(banda("cintura-fina", PIEL, Z(1.3), fin_banda,
                        lambda z: fina_arriba(z) - 0.04 * afila(z),
                        fina_arriba, material_="detalle", fuera=0.008,
                        paso=0.15, filas=1))

    # La marca, en el costado de atrás, entre la puerta y la cola: donde los
    # Twin Otter de verdad llevan la matrícula. Ver `marca`.
    piezas.append(marca(PIEL, Z(9.40), Z(10.70), Y(2.30), Y(2.74),
                        fuera=0.010))

    # ── Ala ───────────────────────────────────────────────────────────────
    #
    # **Alta, recta y de cuerda constante**, con la punta redonda: el ala de
    # un avión que despega corto, gruesa —el 16 % de la cuerda, la del NACA
    # 63A516 que le da Aerospaceweb— y sin flecha. Detrás, de la raíz a los
    # alerones, flaps de dos ranuras a lo largo de toda el ala; aquí, de una:
    # se simplifica la forma, no la pieza. Y partidos por la góndola, que no se
    # mueve.
    semi = ENVERGADURA / 2
    estaciones = [
        de_ala(0.0, y_ala(0.0), Z(ALA_D), CUERDA, 0.16, 2.5, 2.0),
        de_ala(MOTOR, y_ala(MOTOR), Z(ALA_D), CUERDA, 0.16, 2.5, 2.0),
        # Menos la punta redonda, que sobresale medio espesor: 15 cm.
        de_ala(semi - 0.148, y_ala(semi), Z(ALA_D), CUERDA, 0.15, 2.5, 2.0),
    ]
    j = "oscuro"
    flaps = [flap("dentro", 0.95, 2.30, 0.70), flap("fuera", 3.20, 6.40, 0.70)]
    # **Y el alerón, que se mueve**: 17,5° arriba y 16° abajo con los flaps
    # recogidos (FAA, hoja de tipo A9EA, del -300, rev. 13, leída en una copia
    # que no es la de la FAA). En el de verdad baja además con los flaps, para
    # sustentar más; eso aquí no se dibuja.
    alerones = [mando("aleron", 6.47, 9.55, 0.72, "alabeo", 17.5, 16)]
    ala = superficie("ala", estaciones, curvatura=0.02, flaps=flaps,
                     mandos=alerones, zonas=[
        (j, 0.88, 6.40, 0.685, 0.70),
        (j, 0.88, 0.95, 0.70, 1.0),
        (j, 3.13, 3.20, 0.70, 1.0),
        (j, 6.40, 6.47, 0.70, 1.0),
        (j, 6.47, 9.62, 0.705, 0.72),
        (j, 9.55, 9.62, 0.72, 1.0),
    ])
    piezas.append(ala)
    # Los topes de su manual: arriba, 10°, 20° y 37° (PSM 1-64-1A, § 3.2; ver
    # `muescasDeFlaps` en su ficha).
    piezas += flaps_moviles(ala, flaps, ranurado(
        muescas=(0, 10, 20, 37), recorrido=(0, 0.13, 0.19, 0.25)),
        mandos=alerones)
    piezas += piezas_de_mandos(alerones)

    # **La riostra**, una a cada lado: del carenado del tren, en el costado
    # bajo, al ala, por dentro de la góndola. Es la que deja que el ala alta
    # sea ligera, y media silueta de este avión. Perfilada, como es.
    abajo_r = Vector((1.02, Y(1.38), Z(6.22)))
    arriba_r = Vector((2.40, Y(3.15), Z(5.86)))
    d_r = (arriba_r - abajo_r).normalized()
    g_r = d_r.cross(Vector((0, 0, 1))).normalized()
    piezas.append(superficie("riostra", [
        estacion(abajo_r, 0.22, 0.26, (0, 0, 1), g_r),
        estacion(arriba_r, 0.22, 0.26, (0, 0, 1), g_r),
    ], material_="casco", punta=False))

    # ── Góndolas y hélices ────────────────────────────────────────────────
    #
    # **Colgadas del ala**, casi enteras por debajo de ella y con una joroba
    # encima: el PT6A va delante del borde de ataque, con la toma de aire
    # grande bajo el cono y los dos escapes a los costados, justo detrás de la
    # hélice. Acaban antes del borde de salida (NASA, figura 1, en planta).
    A = EJE_HELICE
    gondola = Piel([
        (Z(HELICE_D + 0.06), 0.22, Y(A + 0.22), Y(A - 0.22), Y(A)),
        (Z(3.95), 0.32, Y(3.16), Y(2.32), Y(2.80)),
        (Z(4.40), 0.36, Y(3.30), Y(2.15), Y(2.80)),
        (Z(5.05), 0.36, Y(3.46), Y(2.15)),
        (Z(5.80), 0.33, Y(3.50), Y(2.30)),
        (Z(6.40), 0.20, Y(3.46), Y(2.68)),
        (Z(6.75), 0.02, Y(3.42), Y(3.22)),
    ], x=MOTOR, n=2.3)
    piezas.append(espejo(gondola.malla("gondola", "casco", lados=28,
                                       paso=0.25)))
    piezas.append(espejo(paneles("toma", gondola, simetricos([
        [(Z(3.97), 146), (Z(3.97), 180), (Z(4.16), 180), (Z(4.16), 148)],
    ]), material_="oscuro", fuera=0.008, div=3)))
    piezas.append(espejo(ventanas("escapes", gondola, [Z(4.28)], Y(2.92),
                                  0.24, 0.34, radio=0.10,
                                  material_="oscuro", fuera=0.008)))
    # **Tres palas**, «Number of blades 3 (Aluminum)» (A.III.6), y las dos
    # giran igual, a la derecha vistas desde el asiento: «Propellers rotate
    # Clockwise in view of flight direction» (A.III.6.1). Por eso tiene motor
    # crítico. Los conos, oscuros como en el JAZ 60.
    for lado, nombre in ((-1, "izquierda"), (1, "derecha")):
        piezas += helice(f"helice-{nombre}",
                         (lado * MOTOR, Y(A), Z(HELICE_D)),
                         radio=RADIO_HELICE, cuantas=3, buje=0.21,
                         cuerda=0.20, largo_cono=0.40, giro=-1,
                         cono="oscuro")

    # ── Cola ──────────────────────────────────────────────────────────────
    #
    # **La deriva grande en flecha**, de lado a lado del alto que le falta al
    # fuselaje: arriba, a 5,94 m del suelo (De Havilland, 2025), con la punta
    # cuadrada; el borde de ataque, con la flecha de la vista de NASA; y el
    # borde de salida, el del timón, a 15,77 m del morro arriba. Por debajo
    # baja hasta la punta de la cola: en el Twin Otter el timón llega abajo
    # del todo, y es su punta de abajo lo primero que tocaría el suelo.
    #
    # La punta de abajo del timón, en la recta de 10,5° desde la huella de las
    # principales y dos centímetros por encima: ahí toca, y no antes.
    te_abajo = 15.20
    h_abajo = (te_abajo - PRINCIPAL_D) * math.tan(COLA_TOCA) + 0.02

    def a_la_altura(h):
        """La sección de la deriva a esa altura, entre la de abajo y la punta."""
        t = (h - h_abajo) / (5.94 - h_abajo)
        ataque = 11.79 + t * (14.25 - 11.79)
        salida = te_abajo + t * (LARGO - te_abajo)
        return de_deriva(0.0, Y(h), Z(ataque), salida - ataque, 0.11)

    # **Partida en dos a la altura del lomo**, con el mismo borde de ataque y
    # el mismo de salida, así que la bisagra del timón es una sola recta. La de
    # arriba es la que lleva el motivo —el material `cola`—, porque el juego
    # pone el sol naciendo en su raíz y la mide en la malla: con la deriva
    # entera, la raíz era la punta de abajo del timón, dentro del cono, y el sol
    # salía por debajo del lomo. La de abajo, del mismo verde, sin motivo.
    LOMO = 2.80
    de_la_deriva = [a_la_altura(LOMO), a_la_altura(5.94)]
    de_la_deriva_baja = [a_la_altura(h_abajo), a_la_altura(LOMO)]
    alto_deriva = largo_hasta(de_la_deriva, 1)
    # **Y el timón se mueve**, de abajo a un palmo de la punta, con sus topes
    # de la A9EA: 21° a la derecha y 20° a la izquierda (la misma copia que
    # el alerón). La bisagra, a dos tercios de la cuerda, como en la vista de
    # NASA. Ver `mando`.
    techo = alto_deriva - 0.25
    timon = [mando("timon-de-direccion", 0.0, techo, 0.66, "guinada",
                   21, 20)]
    deriva = superficie("deriva", de_la_deriva, material_="cola",
                        simetria=False, mandos=timon, zonas=[
        ("oscuro", 0.0, techo, 0.645, 0.66),
        ("oscuro", techo, techo + 0.05, 0.66, 1.0),
    ], punta=False)
    piezas.append(deriva)
    piezas += mandos_moviles(deriva, timon)
    # Y el trozo de abajo del timón, que gira con el de arriba por la misma
    # bisagra: el juego mueve con los pedales todo lo que se llama `timon-`.
    bajo = largo_hasta(de_la_deriva_baja, 1)
    timon_bajo = [mando("timon-de-direccion-abajo", 0.0, bajo, 0.66,
                        "guinada", 21, 20)]
    deriva_baja = superficie("deriva-baja", de_la_deriva_baja,
                             material_="detalle", simetria=False,
                             mandos=timon_bajo, zonas=[
        ("oscuro", 0.0, bajo, 0.645, 0.66),
    ], punta=False)
    piezas.append(deriva_baja)
    piezas += mandos_moviles(deriva_baja, timon_bajo)
    # La aleta dorsal, que la une al lomo en curva: del verde de la raya, que
    # es el de la cola, y no en `cola`, que es solo la deriva con el motivo.
    piezas.append(superficie("aleta-dorsal", [
        de_deriva(0.0, Y(2.80), Z(11.40), 1.80, 0.10),
        de_deriva(0.0, Y(3.40), Z(12.74), 0.45, 0.12),
    ], material_="detalle", simetria=False, punta=False))

    # **El estabilizador, sobre el cono y al pie de la deriva**, recto y de
    # puntas redondas: 6,29 m de punta a punta (De Havilland, 2025) y 1,45 de
    # cuerda (NASA, figura 1), algo por encima del lomo. Del color del casco.
    # La profundidad, partida en dos por el timón, que baja entre las dos
    # mitades: 25° arriba (FAA A9EA, la que da su ficha) y 15° abajo, sin
    # fuente leída.
    profundidad = [mando("profundidad", 0.30, 3.00, 0.66, "cabeceo", 25, 15)]
    estabilizador = superficie("estabilizador", [
        de_ala(0.0, Y(3.26), Z(12.95), 1.45, 0.12),
        # Menos la punta redonda, que sobresale medio espesor.
        de_ala(6.29 / 2 - 0.075, Y(3.26), Z(12.95), 1.45, 0.11),
    ], material_="casco", mandos=profundidad, zonas=[
        ("oscuro", 0.30, 3.00, 0.645, 0.66),
    ])
    piezas.append(estabilizador)
    piezas += mandos_moviles(estabilizador, profundidad)

    # ── Tren triciclo fijo ────────────────────────────────────────────────
    #
    # «Fixed gear aeroplane» (A.III.2). Las principales salen de un carenado
    # bajo el costado —ahí apoya también la riostra—, en una pata abierta
    # hacia fuera y abajo con una rueda grande cada una, la de las pistas de
    # tierra. La de morro, con su amortiguador, bajo la bodega.
    carenado = Piel([
        (Z(5.75), 0.0, Y(1.22), Y(1.22)),
        (Z(6.00), 0.20, Y(1.46), Y(0.96)),
        (Z(6.55), 0.22, Y(1.48), Y(0.93)),
        (Z(7.00), 0.16, Y(1.40), Y(1.00)),
        (Z(7.35), 0.0, Y(1.24), Y(1.24)),
    ], x=0.98, n=2.4)
    piezas.append(espejo(carenado.malla("carenado-del-tren", "casco",
                                        lados=24, paso=0.2)))

    x_rueda = VIA / 2
    z_p = Z(PRINCIPAL_D)
    piezas.append(varillas("pata-principal", [
        ((1.02, Y(1.02), z_p), (x_rueda - 0.20, Y(RUEDA + 0.04), z_p), 0.075),
        ((x_rueda - 0.22, Y(RUEDA), z_p), (x_rueda + 0.04, Y(RUEDA), z_p),
         0.04),
    ], material_="gris", simetria=True))
    piezas.append(neumaticos("rueda-principal", [(x_rueda, Y(RUEDA), z_p)],
                             RUEDA, 0.28, simetria=True))
    piezas.append(llantas("rueda-principal-llanta",
                          [(x_rueda, Y(RUEDA), z_p)], RUEDA, 0.28,
                          simetria=True))

    z_m = Z(MORRO_D)
    piezas.append(varillas("pata-morro", [
        ((0, Y(1.15), z_m - 0.04), (0, Y(0.80), z_m - 0.04), 0.065),
        ((0, Y(0.82), z_m - 0.04), (0, Y(0.70), z_m), 0.045),
        ((-0.15, Y(0.72), z_m), (0.15, Y(0.72), z_m), 0.035),
        ((-0.15, Y(0.72), z_m), (-0.15, Y(RUEDA_MORRO), z_m), 0.03),
        ((0.15, Y(0.72), z_m), (0.15, Y(RUEDA_MORRO), z_m), 0.03),
    ], material_="gris"))
    piezas.append(neumaticos("rueda-morro", [(0, Y(RUEDA_MORRO), z_m)],
                             RUEDA_MORRO, 0.22))
    piezas.append(llantas("rueda-morro-llanta", [(0, Y(RUEDA_MORRO), z_m)],
                          RUEDA_MORRO, 0.22))

    # Los flaps no atraviesan nada al bajar: ni el fuselaje, ni la góndola que
    # los parte en dos, ni la riostra, que llega al ala por delante de ellos.
    def mallas(*nombres):
        return [p for p in piezas if p.type == "MESH"
                and (p.name in nombres or p.name.startswith(nombres))]
    flaps_libres(piezas, mallas("fuselaje", "gondola", "riostra"))
    # Ni los mandos al moverse: el alerón no toca la góndola ni la riostra,
    # el timón no toca el estabilizador ni la profundidad, y la profundidad no
    # toca la deriva ni el timón. Ver `mandos_libres`.
    mandos_libres(alerones, mallas("fuselaje", "gondola", "riostra"))
    mandos_libres(timon, mallas("fuselaje", "estabilizador", "profundidad-",
                                "aleta-dorsal"))
    mandos_libres(timon_bajo, mallas("fuselaje"))
    mandos_libres(profundidad, mallas("deriva", "timon-"))

    piezas.append(centro_de_gravedad(Z(CDG)))
    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
