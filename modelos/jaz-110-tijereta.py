"""
El JAZ 110 *Tijereta*, modelado en Blender.

El bimotor de fuselaje ancho, el del vuelo largo: **dos motores grandes en un
tubo gordo**. Es la silueta que el álbum enseña a distinguir de dos en un tubo
estrecho —el Arai— y de cuatro —el Yvága—. La tijereta es el ave que se va del
Paraguay en invierno y vuelve en primavera.

**De la clase del 787-9 y sin su cara.** Las medidas son las de su clase, con
la fuente al lado de cada una; lo que dice qué modelo es, no está: ni la máscara
negra del parabrisas, ni los dientes de la tobera, ni el rótulo. Lleva cuatro
cristales de parabrisas separados por la chapa, y góndolas lisas. Las puntas de
ala inclinadas sí, porque las lleva media clase.

**Lo que manda es la fuente.** Boeing, D6-58333 rev. Q (octubre de 2025),
*787 Airplane Characteristics for Airport Planning*:

- 2.2.2: 62,81 m de largo, hasta la punta del estabilizador; 62,00 de tubo, los
  mismos de la hoja de tipo; 60,12 de ala, 17,02 de alto, 5,77 × 5,94 de tubo,
  25,83 de batalla, 9,80 de vía, 5,41 del morro a la pata de morro, 19,81 de
  estabilizador, los motores a 9,91 del eje y su boca a 20,80 del morro, y la
  punta del ala a 43,36 m del morro. La forma, medida sobre ese mismo dibujo.
- 2.3.2: lo que hay hasta el suelo: panza 1,75–1,85; góndola 0,61–0,79; lomo
  7,42–7,82; estabilizador 6,88–7,14; deriva 16,81–17,09.
- 2.7.1: las cuatro puertas por lado, a 6,30, 18,36, 35,43 y 49,66 m del morro.
  **Ninguna sobre el ala**: es lo que dice también la hoja de tipo de EASA,
  IM.A.115.
- 4.4.1: los ojos, a 5,48 m del suelo y a 2,64 de la punta; 21° por encima del
  morro y 25,4° hacia arriba.
- 7.2: ruedas de 54 × 21 pulgadas las principales y de 40 × 16 las de morro,
  con 1,51 m entre las de un eje y 1,52 entre los ejes.

El retrato aprobado, `tijereta-perfil.png`, manda en la librea: casco crema,
franja terracota, panza verde, cola verde con el sol y góndolas de la franja.

    blender --background --python modelos/jaz-110-tijereta.py

Si el fichero no está, el juego sigue con la fábrica: que falte un recurso no
puede dejar a nadie sin volar.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import cabina, exportar, limpiar  # noqa: E402
from exterior import (  # noqa: E402
    Piel, aerofreno, aerofrenos_libres, banda, centro_de_gravedad, contorno,
    de_ala, de_deriva, dentro_de, en_punta, piezas_de_aerofrenos,
    bisagra, canoas_con_flap, espejo, flap, flaps_libres, flaps_moviles,
    fowler, largo_hasta, llantas, mando, mandos_libres,
    mandos_moviles, marca, neumaticos, paneles, paneles_zy, piezas_de_mandos,
    recogido, reversa,
    simetricos, superficie, turbofan, varillas, ventanas, zy,
)

# ── Las medidas ───────────────────────────────────────────────────────────
#
# Las de su ficha de vuelo, `src/flight/aircraft.ts`, que salen de lo mismo.
ENVERGADURA = 60.12
# La cuerda media del ala entera: ver `chord` en la ficha.
CUERDA = 8.37

# El tubo, de 62,00 m. Los 62,81 del avión son hasta la punta del estabilizador,
# que se pasa del cono: es lo que dibuja 2.2.2. El origen, a treinta metros de la
# punta, cerca del centro de gravedad: la pata principal queda justo por detrás.
LARGO = 62.00
MORRO = -30.0
COLA = MORRO + LARGO
# 5,77 de ancho y 5,94 de alto: un poco más alto que ancho, porque el lóbulo de
# abajo es la bodega. La panza a 1,86 m del suelo y el lomo a 7,80, con el
# `TREN` de abajo: los dos caen en la horquilla de 2.3.2.
ANCHO = 2.885
TECHO = 3.00
PANZA = -2.94
# A qué altura es más ancho: un pelo por encima del eje, donde va el suelo de
# la cabina de pasaje.
CINTURA = 0.09

# El ala, baja. El borde de ataque, medido sobre el dibujo en planta de 2.2.2: en
# línea recta de 19,61 m del morro, en el eje, a 38,57 a 26,84 del eje, donde la
# punta se empieza a tumbar. Son 35,2° de flecha en ese borde.
ALA_Y = -1.65
ALA_Z = MORRO + 19.61
FLECHA = math.atan((38.57 - 19.61) / 26.84)
# Diedro de su clase, leído del dibujo de frente: por verificar.
DIEDRO = math.radians(6)
# El quiebro del borde de salida, por dentro del motor: hasta aquí va recto, a
# 33,76 m del morro.
QUIEBRO = 9.50

# **Un motor por ala, a 9,91 m del eje**: la cota de 2.2.2. Lo lee
# `motores.test.ts`, y es lo que dice la ficha.
MOTOR = 9.91
# Con la góndola a 72 cm del suelo, en el medio de la horquilla de 2.3.2. De tres
# metros setenta y seis de ancho y con la tobera fría a unos 5,7 m de la boca,
# medidos en 2.2.2; el núcleo sigue por debajo del ala. Ver `turbofan`, que deja
# esa tobera a dos tercios de su largo.
GONDOLA = 3.76
LARGO_GONDOLA = 8.60
MOTOR_Y = -(4.80 - 0.72 - GONDOLA / 2)
# La boca, a 20,80 del morro.
MOTOR_Z = MORRO + 20.80 + LARGO_GONDOLA / 2

# **El tren**: es el `gearHeight` de su ficha y tienen que decir lo mismo.
TREN = 4.80
# Neumáticos de 54 pulgadas, los de la ficha de tipo y de 7.2.
RUEDA = 0.686
ANCHO_RUEDA = 0.53
# Y los de morro, de 40.
RUEDA_MORRO = 0.508
# A 4,90 m del eje: la mitad de sus 9,80 de vía. Y de ahí a la de morro, los
# 25,83 de `batalla`; y de la de morro a la punta, los 5,41 de 2.2.2.
PATA_X = 4.90
MORRO_Z = MORRO + 5.41
PATA_Z = MORRO_Z + 25.83

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-110.glb",
)

# Los ojos, a 2,64 m de la punta y a 5,48 del suelo (4.4.1).
OJOS_Z = MORRO + 2.64
OJOS_Y = 5.48 - TREN

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# **El morro, redondo y sin la cara de nadie.** Los ojos van muy adelante, a 2,64
# de la punta, y la frente sube tendida hasta casi diez metros, como en 2.2.2. La
# punta, medio metro más arriba de lo que dibuja Boeing: esa punta caída es de lo
# que dice qué avión es, y en el retrato no está.
#
# La cola, medida sobre el mismo dibujo: la panza empieza a subir a 47 m del morro
# y el cono acaba a 62,00, un metro por encima del eje. Más larga y más baja que
# la de sus hermanos, y por eso pega antes contra la pista: ver `maxGroundPitch`.
PIEL = Piel([
    (MORRO, 0.0, -0.60, -0.60),
    (MORRO + 0.12, 0.62, -0.20, -0.95),
    (MORRO + 0.45, 1.05, 0.15, -1.42),
    (MORRO + 1.00, 1.48, 0.68, -1.90),
    (MORRO + 1.64, 1.78, 1.08, -2.22),
    (MORRO + 2.64, 2.08, 1.62, -2.52),
    (MORRO + 3.60, 2.30, 2.05, -2.72),
    (MORRO + 4.80, 2.52, 2.45, -2.86),
    (MORRO + 6.40, 2.72, 2.78, -2.92),
    (MORRO + 8.00, 2.84, 2.94, PANZA),
    (MORRO + 10.00, ANCHO, TECHO, PANZA, CINTURA),
    (COLA - 15.00, ANCHO, TECHO, PANZA, CINTURA),
    (COLA - 12.80, 2.70, 2.84, -2.79, 0.10),
    (COLA - 7.20, 1.76, 2.40, -1.84),
    (COLA - 3.90, 1.05, 1.95, -0.84),
    (COLA - 1.65, 0.50, 1.50, 0.06),
    (COLA, 0.10, 1.17, 0.84),
])


def y_ala(x):
    return ALA_Y + x * math.tan(DIEDRO)


def z_ala(x):
    return ALA_Z + x * math.tan(FLECHA)


# Los metros a lo largo del ala por cada metro de envergadura: las zonas y los
# flaps de `superficie` se miden sobre el ala, que va en flecha y con diedro,
# y el fuselaje y el carenado están donde están a lo ancho.
E_POR_X = math.sqrt(1 + math.tan(DIEDRO) ** 2 + math.tan(FLECHA) ** 2)


def _suave(z, a, b):
    """De cero a uno entre `a` y `b`, sin esquina en ninguno de los dos."""
    t = max(0.0, min(1.0, (z - a) / (b - a)))
    return t * t * (3 - 2 * t)


def construir():
    limpiar()
    piezas = []

    # Anillos apretados en el morro y en el parabrisas, donde la chapa se
    # quiebra, y menos en la frente, que es una curva larga y tendida.
    morro = ([MORRO + 0.12 * i for i in range(1, 36)]
             + [MORRO + 4.2 + 0.35 * i for i in range(1, 12)])
    piezas.append(PIEL.malla("fuselaje", lados=56, paso=0.7, extra=morro,
                             zonas=[("oscuro", COLA - 0.01, 99, 0, 180)]))

    # El carenado del ala, en el verde de la panza: es panza, y en el retrato
    # no se distingue de ella. Gris sería una mancha en medio del verde.
    carenado = Piel([
        (-13.5, 0.0, -2.05, -2.05),
        (-11.3, 1.78, -1.45, -2.95),
        (-7.0, 2.56, -1.30, -3.24),
        (3.0, 2.58, -1.30, -3.28),
        (6.5, 1.98, -1.45, -3.08),
        (9.0, 0.0, -2.30, -2.30),
    ], n=2.3)
    piezas.append(carenado.malla("carenado", "detalle", lados=36, paso=0.7))

    # ── Parabrisas ────────────────────────────────────────────────────────
    #
    # **Cuatro cristales**: dos de frente y uno de costado a cada lado, con la
    # chapa del casco haciendo de marco. Es lo contrario de la máscara negra,
    # que es lo que dice qué avión es: aquí se ven cuatro cristales sueltos en una
    # cara crema, como en el retrato.
    o = OJOS_Z
    piezas.append(paneles("parabrisas", PIEL, simetricos([
        [(o - 1.94, 9), (o - 1.72, 52), (o - 1.16, 52), (o - 1.04, 9)],
    ]), fuera=0.02, div=6))
    piezas.append(paneles_zy("parabrisas-lado", PIEL, [
        [(o - 0.98, 0.36), (o - 0.08, 0.36), (o + 0.08, 1.00),
         (o - 0.58, 1.16)],
    ], fuera=0.02, div=5))

    # ── Ventanillas, puertas y librea ─────────────────────────────────────
    #
    # **Las cuatro puertas por lado, donde las pone 2.7.1**, con su metro siete
    # de ancho y su metro noventa y tres de alto, y el umbral a 4,5 m del suelo
    # (2.3.2). Ninguna sobre el ala: la 2 queda delante y la 3 detrás.
    puertas = tuple(MORRO + d for d in (6.30, 18.36, 35.43, 49.66))
    # Las ventanillas, de 47 × 27 cm, las más grandes de su clase, cada 97 cm;
    # de la primera puerta a la última, como en el retrato. Las oscurece el
    # cristal: ver `ventanillas` en la ficha.
    fila = [puertas[0] + 1.0 + i * 0.97 for i in range(46)]
    fila = [z for z in fila
            if all(abs(z - p) > 0.85 for p in puertas) and z < puertas[3]]
    piezas.append(ventanas("ventanillas", PIEL, fila, 0.90, 0.47, 0.27,
                           radio=0.12, fuera=0.03))
    for z in puertas:
        piezas.append(contorno(f"puerta{z:+.0f}", PIEL, z, 0.69, 1.93, 1.07,
                               radio=0.16, grueso=0.05, fuera=0.034))
    piezas.append(ventanas("ventanita-puerta", PIEL, list(puertas), 1.04,
                           0.28, 0.22, radio=0.10, fuera=0.03))

    # **La franja de la casa: terracota, ancha y acabada en punta de hoja**, a
    # la escala de este avión; un cuarto del alto, de las ventanillas para abajo.
    # Nace en punta bajo el parabrisas y se cierra por debajo del estabilizador,
    # como en el retrato: el borde de arriba, recto; el de abajo sube a buscarlo.
    # Ver `en_punta`.
    nace, y_nace = MORRO + 2.00, -0.58
    alto_franja, bajo_franja = 0.46, -0.98
    afila_desde, cierra = 14.0, 24.0

    def arriba(z):
        return y_nace + (alto_franja - y_nace) * _suave(z, nace, MORRO + 9.0)

    def abajo_recto(z):
        return y_nace + (bajo_franja - y_nace) * _suave(z, nace, MORRO + 6.0)

    abajo = en_punta(abajo_recto, arriba, afila_desde, cierra)
    piezas.append(banda("cintura", PIEL, nace, cierra, abajo, arriba,
                        fuera=0.026, paso=0.5, filas=4))

    # **Y la panza verde, de punta a punta**, la del retrato: del morro a la
    # cola, por debajo de la franja y con un filete crema entre las dos. Es lo
    # que más separa a este avión de sus hermanos en la fila, y es librea de la
    # casa: el verde es el de la cola. Por delante baja al morro desde la punta de
    # la franja, y por detrás sube con el cono hasta cerrar en su boca, por debajo
    # del estabilizador. Por abajo llega hasta la quilla: `piel.en` no pasa de ahí.
    #
    # En tres tramos, y con la malla más apretada donde la chapa se curva: una
    # banda con pocas filas se mete por dentro del morro y sale a lunares.
    def filete(z):
        return 0.12 * _suave(z, nace, MORRO + 6.0) * (1 - _suave(z, afila_desde, cierra))

    def panza_arriba(z):
        if z <= nace:
            return y_nace - 0.14 * (nace - z) / (nace - MORRO)
        if z >= cierra:
            return arriba(cierra) + (1.04 - arriba(cierra)) * (z - cierra) / (COLA - 0.2 - cierra)
        return abajo(z) - filete(z)

    def quilla(z):
        return PIEL.abajo(z) - 0.2

    for n, (z0, z1, paso_, filas_) in enumerate((
            (MORRO + 0.30, MORRO + 8.00, 0.12, 14),
            (MORRO + 8.00, COLA - 15.00, 0.70, 14),
            (COLA - 15.00, COLA - 0.20, 0.25, 12))):
        piezas.append(banda(f"panza-{n}", PIEL, z0, z1, quilla, panza_arriba,
                            material_="detalle", fuera=0.016, paso=paso_,
                            filas=filas_))

    # La marca detrás de la puerta de delante, sobre las ventanillas: la misma
    # firma que en sus hermanos, a la escala de este avión. Ver `marca`.
    piezas.append(marca(PIEL, puertas[0] + 0.85, puertas[0] + 3.85, 1.38, 2.08,
                        fuera=0.03))

    cab = cabina(
        # Este avión mete las patas, así que lleva su palanca.
        tren=True,
        ojos_z=OJOS_Z,
        ancho=0.80,
        # El labio del guardasol, justo por debajo de esos 21°: un poco más abajo que en
        # el grande, que ve 18°.
        alto_panel=OJOS_Y - 0.295,
        y_suelo=OJOS_Y - 1.10,
        y_respaldo=OJOS_Y - 0.10,
        plazas=(-0.34, 0.34),
        pantallas_en=0.46,
        palancas=2,
        relojes=14,
        clase="reactor",
        mide="n1",
        suelo_atras=2.20,
        # **El parabrisas por dentro, con lo que se ve desde su asiento**: 21°
        # por encima del morro y 25,4° hacia arriba, con los ojos a 0,53 m del
        # eje (D6-58333, 4.4.1). Con su limpiaparabrisas.
        parabrisas=dict(
            sobre_el_morro=21.0,
            hacia_arriba=25.4,
            montantes=[(-0.50, 0.055, 0.0), (0.50, 0.055, 0.0),
                       (-0.77, 0.05, 0.30), (0.77, 0.05, 0.30)],
            limpias=True,
        ),
    )
    piezas += cab
    dentro_de(PIEL, cab)

    # ── Ala en flecha, con quiebro y la punta inclinada ───────────────────
    #
    # **Sin aleta que suba: la punta se tumba hacia atrás** y se levanta apenas,
    # que es la silueta de su clase y lo que la separa de un vistazo de las dos
    # aletas del Yvága. La cuerda, medida sobre el dibujo en planta de 2.2.2:
    # 14,15 m en el eje, 7,48 en el quiebro y 2,49 donde empieza a tumbarse, y
    # hasta los 43,36 m del morro por el borde de salida de la punta.
    #
    # Y con esas cuerdas salen unos 381 m² contando lo que cruza el fuselaje, que
    # es lo que da la superficie de la ficha, 377. Ver `wingArea`.
    semi = ENVERGADURA / 2
    raiz, quiebro, punta = 14.15, 7.48, 2.49
    # Donde empieza a tumbarse.
    x_tumba = 26.84

    def sobre_la_recta(x, a, b):
        return a + (b - a) * (x - QUIEBRO) / (x_tumba - QUIEBRO)

    # Donde acaban los slats: el borde de ataque de metal no llega a la punta.
    x_slats = 25.8
    # Lo de más afuera, exactamente en la envergadura: el juego escala el modelo
    # por lo que mide de ancho, y la punta se gira con el diedro.
    fuera = -0.015
    estaciones = [
        de_ala(0.0, y_ala(0.0), z_ala(0.0), raiz, 0.14, 6, 2.0),
        de_ala(QUIEBRO, y_ala(QUIEBRO), z_ala(QUIEBRO), quiebro, 0.115, 6, 0.5),
        de_ala(x_slats, y_ala(x_slats), z_ala(x_slats),
               sobre_la_recta(x_slats, quiebro, punta),
               sobre_la_recta(x_slats, 0.115, 0.095), 6,
               sobre_la_recta(x_slats, 0.5, -2.0)),
        de_ala(x_tumba, y_ala(x_tumba), z_ala(x_tumba), punta, 0.095, 6, -2.0),
        # La punta inclinada: el borde de ataque se tumba cada vez más mientras
        # el de salida sigue casi recto, y sube lo justo.
        de_ala(28.00, y_ala(28.00) + 0.06, MORRO + 40.20, 1.70, 0.09, 8, -2.0),
        de_ala(29.20, y_ala(29.20) + 0.16, MORRO + 41.90, 0.85, 0.085, 10, -2.0),
        de_ala(semi + fuera, y_ala(semi) + 0.30, MORRO + 43.00, 0.36, 0.08,
               12, -2.0),
    ]

    def a_lo_largo(k):
        """Lo que mide el ala por su borde de ataque hasta la estación `k`."""
        return sum((b["pos"] - a["pos"]).length
                   for a, b in zip(estaciones[:k], estaciones[1:k + 1]))
    j = "oscuro"
    # **Los flaps, a los dos lados de la góndola y sin tocar la pata.** El de
    # dentro empieza pasada la pata del ala, que cuelga a 4,90 m y se tumba hacia
    # la panza justo por delante de la junta; lo mide `flaps_libres`. Ver
    # `jaz-120-yvaga.py`.
    e_dentro = (E_POR_X * 5.40, E_POR_X * 9.50)
    e_fuera = (E_POR_X * 9.63, 21.60)
    flaps = [flap("dentro", e_dentro[0], e_dentro[1], 0.73),
             flap("fuera", e_fuera[0], e_fuera[1], 0.73)]
    # **Seis aerofrenos por semiala, dos por dentro del motor y cuatro por
    # fuera.** Cuántos lleva su clase y cuáles salen en vuelo: por verificar; es
    # el reparto de su hermano mayor, sin la pareja de más afuera, que se queda
    # abajo en el aire como allí.
    aerofrenos = [
        aerofreno("1", 4.40, 7.60, 0.607, 0.72, vuelo=20, tierra=45),
        aerofreno("2", 7.64, 10.90, 0.607, 0.72, vuelo=20, tierra=45),
        aerofreno("3", 13.40, 15.00, 0.607, 0.72, vuelo=45, tierra=45),
        aerofreno("4", 15.04, 16.60, 0.607, 0.72, vuelo=45, tierra=45),
        aerofreno("5", 16.64, 18.20, 0.607, 0.72, vuelo=0, tierra=45),
        aerofreno("6", 18.24, 19.80, 0.607, 0.72, vuelo=0, tierra=45),
    ]
    # El alerón, por fuera de los flaps. Los grados, provisionales: ver
    # `RECORRIDO_DE_MANDOS`.
    alerones = [mando("aleron", 21.80, 28.60, 0.77, "alabeo", 25, 25)]
    ala = superficie("ala", estaciones, material_="gris", curvatura=0.015,
                     flaps=flaps, aerofrenos=aerofrenos, mandos=alerones,
                     zonas=[
        # El borde de ataque de metal, hasta donde acaban los slats.
        ("aluminio", 3.2, x_slats * E_POR_X, 0.0, 0.06),
        # Y la punta, en el color de la casa: es donde las compañías de verdad
        # lo ponen, y aquí se ve de frente aunque no suba.
        ("remate", a_lo_largo(3), 99.0, 0.0, 1.0),
        (j, 2.6, 21.6, 0.72, 0.73),
        (j, 2.6, 2.75, 0.73, 1.0),
        (j, e_dentro[1], e_fuera[0], 0.73, 1.0),
        (j, 21.6, 21.75, 0.73, 1.0),
        (j, 21.8, 28.7, 0.76, 0.77),
        (j, 28.6, 28.75, 0.77, 1.0),
        (j, 3.5, 20.5, 0.60, 0.607, "arriba"),
    ])
    piezas.append(ala)
    # **Fowler**, con cinco, veinte y treinta. El carril, de los largos, como en
    # el grande. Ver `fowler`.
    los_flaps = flaps_moviles(ala, flaps, fowler(
        muescas=(0, 5, 20, 30), recorrido=(0, 0.45, 0.60, 0.80)),
        aerofrenos=aerofrenos, mandos=alerones)
    piezas += los_flaps
    piezas += piezas_de_aerofrenos(aerofrenos)
    piezas += piezas_de_mandos(alerones)

    def cuerda_en(x):
        if x < QUIEBRO:
            return raiz - (raiz - quiebro) * x / QUIEBRO
        return quiebro - (quiebro - punta) * (x - QUIEBRO) / (x_tumba - QUIEBRO)

    # Las canoas de los carriles. Y la cola de las que caen bajo un flap baja
    # con él. Ver `canoas_con_flap`.
    canoas = []
    for n, x in enumerate((6.8, 12.4, 16.3)):
        z0 = z_ala(x) + cuerda_en(x) * 0.48
        largo = cuerda_en(x) * 0.72
        y0 = y_ala(x) - 0.25
        canoa = Piel([
            (z0, 0.0, y0, y0),
            (z0 + largo * 0.25, 0.28, y0 + 0.05, y0 - 0.68),
            (z0 + largo * 0.70, 0.26, y0 + 0.05, y0 - 0.60),
            (z0 + largo, 0.0, y0 - 0.18, y0 - 0.18),
        ], x=x)
        c = canoa.malla(f"canoa-{n}", "gris", lados=12, paso=0.6)
        espejo(c)
        canoas.append(c)
    piezas += canoas
    piezas += canoas_con_flap(canoas, los_flaps)

    # ── Los dos motores ───────────────────────────────────────────────────
    #
    # **Grandes y muy pegados al ala**, que es lo que dice el tamaño de su fan: la
    # góndola entera por delante del borde de ataque, con su lomo a la altura del
    # ala y el núcleo metido debajo, y el pilón apenas se ve. Lisos, del color de
    # la franja, como en el retrato.
    centro = (MOTOR, MOTOR_Y, MOTOR_Z)
    piezas.append(turbofan("motor", centro, largo=LARGO_GONDOLA,
                           diametro=GONDOLA, cubierta="capo", reversa=True))
    # Y su reversa: el manguito de atrás se va hacia la cola y deja ver la
    # cascada. Ver `reversa`.
    piezas += reversa("motor", centro, largo=LARGO_GONDOLA, diametro=GONDOLA,
                      cubierta="capo")
    piezas.append(superficie("pilon", [
        de_deriva(MOTOR, MOTOR_Y + 1.30, MOTOR_Z - 1.6, 6.8, 0.10),
        de_deriva(MOTOR, y_ala(MOTOR) - 0.10, z_ala(MOTOR) - 0.8, 4.8, 0.10),
    ], material_="gris", punta=False))

    # ── Cola ──────────────────────────────────────────────────────────────
    #
    # La deriva, medida sobre el dibujo de 2.2.2: hasta los 17,02 m del suelo y con
    # la punta de 58,1 a 62,0 m del morro, y el borde de salida echado hacia atrás.
    # Un pelo por debajo, que la tapa de la punta abulta. El pie, metido en el cono:
    # el lomo baja bajo el borde de salida, y un pie a la altura del tubo dejaba la
    # deriva en el aire. Y el timón se mueve.
    y_punta = 17.02 - TREN - 0.16
    de_la_deriva = [
        de_deriva(0.0, 1.70, 19.0, 9.7, 0.05),
        de_deriva(0.0, 4.00, 21.7, 7.26, 0.10),
        de_deriva(0.0, y_punta, 28.1, 3.9, 0.10),
    ]
    pie, punta_d = largo_hasta(de_la_deriva, 1), largo_hasta(de_la_deriva, 2)
    timon = [mando("timon-de-direccion", pie, punta_d, 0.688, "guinada",
                   30, 30)]
    deriva = superficie("deriva", de_la_deriva, material_="cola",
                        simetria=False, mandos=timon, zonas=[
        ("oscuro", 2.0, 11.0, 0.68, 0.688),
        ("oscuro", 11.0, punta_d, 0.68, 0.688),
    ])
    piezas.append(deriva)
    piezas += mandos_moviles(deriva, timon)
    # El estabilizador, de 19,81 m, con la punta a siete metros del suelo (2.3.2)
    # y a 62,81 del morro, que es lo más atrás del avión: se pasa del cono, como
    # en el dibujo de 2.2.2. La blanca va en el cono de todos modos: ver
    # `puntasDe` en `world/luces-de-posicion.ts`.
    semi_est = 19.81 / 2
    y_est = 7.00 - TREN - semi_est * math.tan(math.radians(7))
    z_est = 22.84
    tan_est = (MORRO + 62.81 - 1.93 - z_est) / semi_est
    profundidad = [mando("profundidad", 1.8, 10.2, 0.707, "cabeceo", 30, 17)]
    estabilizador = superficie("estabilizador", [
        de_ala(0.0, y_est, z_est, 6.2, 0.10, 7),
        de_ala(semi_est, y_est + semi_est * math.tan(math.radians(7)),
               z_est + semi_est * tan_est, 1.93, 0.09, 7),
    ], material_="gris", mandos=profundidad, zonas=[
        ("aluminio", 1.8, 10.2, 0.0, 0.06),
        ("oscuro", 1.8, 10.2, 0.70, 0.707),
    ])
    piezas.append(estabilizador)
    piezas += mandos_moviles(estabilizador, profundidad)

    # ── Tren ──────────────────────────────────────────────────────────────
    #
    # **Dos patas principales con su bogie de cuatro ruedas**, y la de morro con
    # dos: ocho ruedas grandes en lugar de las dieciséis del grande, que es lo que
    # dice la ficha de tipo y lo que un avión de esta clase se puede permitir.
    # Las principales se tumban hacia dentro, hasta la panza; la de morro, hacia
    # delante, para que si falla la hidráulica el viento la empuje fuera.
    eje = -(TREN - RUEDA)
    x, z = PATA_X, PATA_Z
    arriba_y = y_ala(PATA_X) - 0.30
    # 1,52 m entre los ejes y 1,51 entre las ruedas de un eje (7.2).
    dz_rueda, dx_rueda = 0.76, 0.755
    pata = [varillas("pata-ala", [
        ((x, arriba_y, z), (x, eje + 1.35, z), 0.27),
        ((x, eje + 1.40, z), (x, eje + 0.30, z), 0.18),
        ((x, eje + 0.30, z - 1.00), (x, eje + 0.30, z + 1.00), 0.14),
        ((x, eje + 0.30, z - dz_rueda), (x, eje, z - dz_rueda), 0.10),
        ((x, eje + 0.30, z + dz_rueda), (x, eje, z + dz_rueda), 0.10),
        ((x - dx_rueda, eje, z - dz_rueda), (x + dx_rueda, eje, z - dz_rueda), 0.11),
        ((x - dx_rueda, eje, z + dz_rueda), (x + dx_rueda, eje, z + dz_rueda), 0.11),
        ((x, arriba_y, z - 1.4), (x, eje + 1.9, z - 0.05), 0.10),
    ], material_="gris")]
    ruedas = [(x + dx, eje, z + dz) for dx in (-dx_rueda, dx_rueda)
              for dz in (-dz_rueda, dz_rueda)]
    pata.append(neumaticos("rueda-ala", ruedas, RUEDA, ANCHO_RUEDA))
    pata.append(llantas("rueda-ala-llanta", ruedas, RUEDA, ANCHO_RUEDA))
    patas = bisagra("ala", (x, arriba_y, z), (0, 0, -1), 90, pata, simetria=True)

    # La de morro, con sus dos ruedas a 0,72 m (7.2).
    eje_m = -(TREN - RUEDA_MORRO)
    arriba_m = -2.00
    morro_t = [varillas("pata-morro", [
        ((0, arriba_m, MORRO_Z), (0, eje_m + 0.90, MORRO_Z), 0.18),
        ((0, eje_m + 0.95, MORRO_Z), (0, eje_m, MORRO_Z + 0.12), 0.12),
        ((-0.45, eje_m, MORRO_Z + 0.12), (0.45, eje_m, MORRO_Z + 0.12), 0.08),
        ((-0.55, arriba_m, MORRO_Z), (0, eje_m + 1.40, MORRO_Z + 0.02), 0.08),
        ((0.55, arriba_m, MORRO_Z), (0, eje_m + 1.40, MORRO_Z + 0.02), 0.08),
    ], material_="gris")]
    ruedas_m = [(-0.36, eje_m, MORRO_Z + 0.12), (0.36, eje_m, MORRO_Z + 0.12)]
    morro_t.append(neumaticos("rueda-morro", ruedas_m, RUEDA_MORRO, 0.41))
    morro_t.append(llantas("rueda-morro-llanta", ruedas_m, RUEDA_MORRO, 0.41))
    patas += bisagra("morro", (0, arriba_m, MORRO_Z), (1, 0, 0), 95, morro_t)
    recogido(patas, [p for p in piezas if p.type == "MESH" and (
        p.name in ("fuselaje", "carenado", "ala")
        or p.name.startswith(("flap-", "franja-", "aerofreno-")))])
    piezas += patas
    # Y ningún flap atraviesa nada al bajar. Ver `flaps_libres`.
    flaps_libres(piezas, [p for p in piezas if p.type == "MESH" and (
        (p.parent and p.parent.name.startswith("bisagra-"))
        or p.name in ("fuselaje", "carenado")
        or p.name.startswith(("pilon", "motor"))
        or (p.name.startswith("canoa-") and "-cola" not in p.name))])

    # Y ningún aerofreno se mete en el fuselaje, el carenado o un motor al subir.
    aerofrenos_libres(aerofrenos, [p for p in piezas if p.type == "MESH" and (
        p.name in ("fuselaje", "carenado")
        or p.name.startswith(("pilon", "motor")))])

    # Ni los mandos al moverse. Ver `mandos_libres`.
    def mallas(*nombres):
        return [p for p in piezas if p.type == "MESH"
                and (p.name in nombres or p.name.startswith(nombres))]
    mandos_libres(alerones, mallas("fuselaje", "canoa-", "cola-canoa-"))
    mandos_libres(timon, mallas("fuselaje", "estabilizador", "profundidad-"))
    mandos_libres(profundidad, mallas("fuselaje", "deriva", "timon-"))

    # El centro de gravedad, un metro ochenta por delante de la pata: lo mismo
    # que su hermano mayor. El de verdad depende de la carga, y la hoja de tipo
    # lo deja al manual de vuelo.
    piezas.append(centro_de_gravedad(PATA_Z - 1.80))
    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
