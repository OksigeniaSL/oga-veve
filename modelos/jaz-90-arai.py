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

**Y lo que lo separa de un juguete**, que es lo que faltaba: el morro de avión
de línea —la punta por debajo del eje, el radomo y el parabrisas por paneles—,
la cola que sube por abajo, el carenado del ala en la panza, el ala con su
quiebro, sus flaps y sus aletas en la punta, los motores con labio, fan y
tobera, y un tren que se ve: la panza a metro setenta del suelo, como la lleva
un avión de esta clase.

Los ayudantes están en `comun.py` y `exterior.py`. Aquí queda solo lo que es
**este** avión.

    blender --background --python modelos/jaz-90-arai.py

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
    bisagra, canoas_con_flap, espejo, flap, flaps_libres, flaps_moviles,
    fowler, llantas, neumaticos,
    paneles, paneles_zy, recogido, simetricos, superficie, turbofan, varillas,
    ventanas, zy,
)

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# De `src/flight/aircraft.ts`: envergadura 26 m, cuerda 3,0, treinta toneladas
# y setenta y dos metros cuadrados de ala.
ENVERGADURA = 26.0
CUERDA = 3.0
LARGO = 31.5
MORRO = -LARGO / 2
COLA = LARGO / 2

# El ala: baja, en flecha, con el borde de ataque de la raíz a doce metros del
# morro —un poco antes de la mitad, como en todo avión de línea— y el quiebro
# del borde de salida donde cuelga el motor.
ALA_Y = -1.05
ALA_Z = -3.30
FLECHA = math.radians(25)
DIEDRO = math.radians(5)
QUIEBRO = 4.40

# **El tren, que es lo que se veía «enterrado».** La panza de un reactor de
# esta clase va a metro setenta del asfalto y la góndola a medio metro: por
# debajo del ala se ven las patas y las ruedas enteras. Con el tren a 2,8 la
# panza quedaba a metro escaso y las ruedas asomaban apenas bajo el motor.
# Es el `gearHeight` de su ficha, y tienen que decir lo mismo.
TREN = 3.35
RUEDA = 0.50
RUEDA_MORRO = 0.36
# De la rueda de morro a las principales, 11,5 m: la `batalla` de la ficha.
PRINCIPAL_Z = 1.30
MORRO_Z = PRINCIPAL_Z - 11.5
VIA = 2.55

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-90.glb",
)

# ── El fuselaje ───────────────────────────────────────────────────────────
#
# El morro, con la punta por debajo del eje; el parabrisas, del catorce al doce
# y medio; el tubo; y la cola, que sube por abajo mientras el lomo sigue casi
# recto. Es la silueta que cualquiera dibuja al decir «avión».
PIEL = Piel([
    (MORRO, 0.0, -0.36, -0.36),
    (-15.68, 0.30, -0.10, -0.60),
    (-15.50, 0.55, 0.08, -0.84),
    (-15.10, 0.82, 0.28, -1.10),
    (-14.60, 1.03, 0.40, -1.30),
    (-14.10, 1.18, 0.50, -1.45),
    (-13.50, 1.31, 0.98, -1.55),
    (-12.90, 1.40, 1.35, -1.61),
    (-12.20, 1.47, 1.56, -1.65),
    (-11.00, 1.50, 1.65, -1.65, 0.05),
    (6.00, 1.50, 1.65, -1.65, 0.05),
    (8.50, 1.45, 1.64, -1.45, 0.10),
    (11.00, 1.20, 1.58, -0.85),
    (13.00, 0.85, 1.48, -0.10),
    (14.50, 0.50, 1.35, 0.55),
    (15.40, 0.24, 1.22, 0.90),
    (COLA, 0.10, 1.10, 1.02),
])


def y_ala(x):
    return ALA_Y + x * math.tan(DIEDRO)


def z_ala(x):
    return ALA_Z + x * math.tan(FLECHA)


# Los metros a lo largo del ala por cada metro de envergadura: las zonas y los
# flaps de `superficie` se miden sobre el ala, que va en flecha y con diedro,
# y el carenado y el pilón están donde están a lo ancho.
E_POR_X = math.sqrt(1 + math.tan(DIEDRO) ** 2 + math.tan(FLECHA) ** 2)


def construir():
    limpiar()
    piezas = []

    # ── Fuselaje, con la panza gris y la boca del APU en la punta ─────────
    # Con los anillos apretados en el morro: entre el radomo y el parabrisas
    # la chapa hace un valle, y con anillos separados la cuerda asomaba por
    # encima del cristal como una sierra.
    morro = [MORRO + 0.12 * i for i in range(1, 36)]
    piezas.append(PIEL.malla("fuselaje", lados=48, paso=0.4, extra=morro, zonas=[
        ("oscuro", COLA - 0.01, 99, 0, 180),
    ]))

    # El carenado del ala: el bulto de la panza donde el ala entra en el
    # fuselaje. Tapa la unión —un ala no se clava en un tubo— y es donde va
    # el tren metido: por eso sube hasta el ala y abulta lo que abulta. Es de
    # las primeras cosas que dicen «avión de línea».
    carenado = Piel([
        (-5.0, 0.0, -1.10, -1.10),
        (-4.2, 0.98, -0.82, -1.62),
        (-2.4, 1.46, -0.55, -1.84),
        (2.2, 1.52, -0.55, -1.86),
        (4.2, 1.12, -0.82, -1.74),
        (5.6, 0.0, -1.25, -1.25),
    ], n=2.3)
    piezas.append(carenado.malla("carenado", "gris", lados=32, paso=0.4))

    # ── El parabrisas, por paneles ────────────────────────────────────────
    #
    # Dos de frente y dos de costado a cada lado, con la chapa entre ellos
    # haciendo de marco. Una cinta oscura alrededor del morro era una venda;
    # los paneles son lo que se reconoce.
    piezas.append(paneles("parabrisas", PIEL, simetricos([
        [(-14.06, 3), zy(PIEL, -13.96, 0.34), zy(PIEL, -13.28, 1.02),
         (-13.22, 3)],
    ]), fuera=0.012, div=6))
    piezas.append(paneles_zy("parabrisas-lado", PIEL, [
        [(-13.86, 0.34), (-13.22, 0.34), (-12.92, 0.92), (-13.20, 1.04)],
        [(-13.10, 0.34), (-12.52, 0.34), (-12.42, 0.80), (-12.80, 0.94)],
    ], fuera=0.012, div=5))

    # ── Ventanillas, puertas y librea ─────────────────────────────────────
    #
    # Veinte y pico por costado, redondeadas, con el hueco de las salidas
    # sobre el ala. Van en una sola malla: sueltas serían más nodos que el
    # avión entero.
    fila = [-10.25 + i * 0.86 for i in range(25)]
    fila = [z for z in fila if not (-1.2 < z < -0.1)]
    piezas.append(ventanas("ventanillas", PIEL, fila, 0.52, 0.40, 0.27,
                           radio=0.11))
    # Las dos puertas de pasaje de la izquierda y sus gemelas de servicio a
    # la derecha, con su ventanita; y las salidas de emergencia sobre el ala.
    for z in (-11.05, 10.55):
        piezas.append(contorno(f"puerta{z:+.0f}", PIEL, z, 0.28, 1.86, 0.86,
                               radio=0.14, grueso=0.035, fuera=0.015))
    piezas.append(ventanas("ventanita-puerta", PIEL, [-11.05, 10.55], 0.72,
                           0.24, 0.20, radio=0.09))
    piezas.append(contorno("salida-de-emergencia", PIEL, -0.65, 0.40, 1.02,
                           0.56, radio=0.10, grueso=0.03, fuera=0.015))
    piezas.append(ventanas("ventanita-salida", PIEL, [-0.65], 0.52, 0.40,
                           0.27, radio=0.11))

    # La franja: por debajo de las ventanillas, del morro a la cola, y
    # subiendo al final hacia la deriva. Y una raya fina en el otro color.
    def sube(base, desde=7.5, cuanto=0.20):
        return lambda z: base + max(0.0, z - desde) * cuanto

    def morro_fino(abajo, arriba):
        # Y la franja nace fina bajo el parabrisas y engorda hacia atrás.
        return lambda z: arriba(z) - (arriba(z) - abajo(z)) * max(
            0.0, min(1.0, (z + 14.4) / 1.6))

    arriba = sube(0.20)
    piezas.append(banda("cintura", PIEL, -14.4, 12.6,
                        morro_fino(sube(-0.08), arriba), arriba,
                        fuera=0.010, paso=0.25))
    piezas.append(banda("cintura-fina", PIEL, -13.6, 12.4, sube(-0.24),
                        sube(-0.16), material_="detalle", fuera=0.010,
                        paso=0.3, filas=1))

    cab = cabina(
        # Este avión mete las patas, así que lleva su palanca.
        tren=True,
        ojos_z=-12.60,
        ancho=0.68,
        alto_panel=0.22,
        y_suelo=-0.60,
        y_respaldo=0.30,
        plazas=(-0.30, 0.30),
        pantallas_en=0.40,
        palancas=2,
        relojes=12,
        clase="reactor",
        mide="n1",
        suelo_atras=1.80,
    )
    piezas += cab
    dentro_de(PIEL, cab)

    # ── Ala en flecha, con quiebro y aletas ───────────────────────────────
    #
    # El borde de salida es recto por dentro del motor —ahí van los flaps
    # grandes y el tren— y en flecha por fuera. El perfil es fino, de avión
    # rápido, y la punta se levanta en una aleta que corta el torbellino.
    # Gris por arriba y por abajo, con el borde de ataque de metal: los slats.
    semi = ENVERGADURA / 2
    raiz = 5.60
    quiebro = 3.40
    punta = 1.30
    x_aleta = semi - 0.62
    estaciones = [
        de_ala(0.0, y_ala(0.0), z_ala(0.0), raiz, 0.14, 5, 2.0),
        de_ala(QUIEBRO, y_ala(QUIEBRO), z_ala(QUIEBRO), quiebro, 0.12, 5, 0.5),
        de_ala(x_aleta, y_ala(x_aleta), z_ala(x_aleta), punta, 0.10, 5, -1.5),
        de_ala(semi - 0.18, y_ala(semi - 0.18) + 0.22, z_ala(x_aleta) + 0.36,
               1.08, 0.09, 38, -1.0),
        de_ala(semi - 0.03, y_ala(semi) + 0.80, z_ala(x_aleta) + 0.86, 0.86,
               0.09, 76, 0.0),
        de_ala(semi, y_ala(semi) + 1.62, z_ala(x_aleta) + 1.62, 0.52, 0.09,
               82, 0.0),
    ]
    j = "oscuro"
    # Los flaps que se mueven son la franja de dentro de las juntas: de la
    # panza al motor y del motor al alerón. Ver `flaps_moviles`. Y sus dos
    # extremos de dentro, medidos a lo ancho y no a lo largo del ala, que va
    # en flecha:
    #
    # - **El de dentro empieza a 2,80 m del eje, pasada la pata del tren.** La
    #   pata principal cuelga a 2,55 m y entra en el ala por detrás de la
    #   junta, dentro de la franja: con el tren fuera —que es como se
    #   aterriza— el flap bajaba atravesándola, y metida se tumba hacia la
    #   panza justo donde va la nariz guardada. En uno de verdad la pata va
    #   por delante del flap, clavada al larguero de atrás; aquí moverla sería
    #   cambiar el avión, que ya está bien. Así que el trozo de franja de
    #   encima de la pata se queda quieto, como el de encima de la góndola en
    #   los de hélice. Antes empezaba a 1,55, fuera del carenado, que ya le
    #   pedía no pasar de ahí: abulta 1,52 m a cada lado a la altura por la que
    #   baja el flap.
    # - **El de fuera empieza pasado el pilón**, a quince centímetros del
    #   quiebro. La junta pintada entre los dos flaps está a 4,40 m **a lo
    #   largo del ala**, que son cuatro metros a lo ancho, y el pilón cuelga a
    #   4,40 a lo ancho: el primer palmo del flap de fuera caía encima de la
    #   cola del pilón y al bajar se la comía. En un bimotor de esta clase los
    #   flaps se parten en el pilón, y el trozo de franja de encima se queda
    #   quieto.
    #
    # Recogido no se nota ninguno de los dos cortes: no hay raya pintada que
    # mover y las normales son las de siempre.
    flaps = [flap("dentro", E_POR_X * 2.80, 4.40, 0.73),
             flap("fuera", E_POR_X * (QUIEBRO + 0.15), 9.2, 0.73)]
    ala = superficie("ala", estaciones, material_="gris", curvatura=0.015,
                     flaps=flaps, zonas=[
        ("aluminio", 1.4, 12.2, 0.0, 0.07),
        # Los flaps, por dentro y por fuera del motor, y el alerón.
        (j, 1.0, 9.2, 0.715, 0.73),
        (j, 1.0, 1.08, 0.73, 1.0),
        (j, 4.40, 4.48, 0.73, 1.0),
        (j, 9.2, 9.28, 0.73, 1.0),
        (j, 9.3, 12.1, 0.765, 0.78),
        (j, 12.05, 12.12, 0.78, 1.0),
        # Y los spoilers, por arriba.
        (j, 1.6, 8.8, 0.60, 0.61, "arriba"),
    ])
    piezas.append(ala)
    # **Fowler**, como todo reactor de línea: la primera muesca es casi todo
    # carril —sale hacia atrás y apenas baja, que es como se despega sin
    # frenar—, y las dos últimas son ángulo. Cinco, quince y treinta grados,
    # los topes de un bimotor de pasillo único. Y el carril, largo: al final
    # ha salido cuatro quintos de su cuerda, casi todo en la primera muesca
    # —que es como un Fowler alarga el ala para despegar—, y el borde de
    # salida va hacia atrás hasta la última. La cuerda crece un diez por
    # ciento; con el tercio de antes crecía un tres y en la última muesca el
    # giro se comía el carril y el borde volvía hacia delante.
    los_flaps = flaps_moviles(ala, flaps, fowler(
        muescas=(0, 5, 15, 30), recorrido=(0, 0.44, 0.54, 0.80)))
    piezas += los_flaps

    # Los carenados de los raíles de los flaps: las «canoas» que asoman por
    # detrás del borde de salida. Tres por ala, y la cola de las que caen bajo
    # un flap baja con él. Ver `canoas_con_flap`.
    canoas = []
    for n, x in enumerate((3.2, 6.1, 8.6)):
        z0 = z_ala(x) + (raiz - (raiz - quiebro) * min(x, QUIEBRO) / QUIEBRO
                         if x < QUIEBRO else
                         quiebro - (quiebro - punta) * (x - QUIEBRO)
                         / (x_aleta - QUIEBRO)) * 0.45
        largo = 2.3 - 0.35 * n
        y0 = y_ala(x) - 0.12
        canoa = Piel([
            (z0, 0.0, y0, y0),
            (z0 + largo * 0.25, 0.13, y0 + 0.02, y0 - 0.34),
            (z0 + largo * 0.70, 0.12, y0 + 0.02, y0 - 0.30),
            (z0 + largo, 0.0, y0 - 0.10, y0 - 0.10),
        ], x=x)
        o = canoa.malla(f"canoa-{n}", "gris", lados=12, paso=0.3)
        espejo(o)
        canoas.append(o)
    piezas += canoas
    piezas += canoas_con_flap(canoas, los_flaps)

    # ── Los dos turbofanes ────────────────────────────────────────────────
    #
    # Por delante y por debajo del ala, que es donde cuelgan: **el motor tiene
    # que estar delante del borde de ataque** o el chorro del fan sopla contra
    # el ala. Como el ala va en flecha, la estación del motor sale de la
    # flecha: mover la flecha mueve los motores con ella.
    motor_y = y_ala(QUIEBRO) - 1.40
    motor_z = z_ala(QUIEBRO) - 1.20
    piezas.append(turbofan("motor", (QUIEBRO, motor_y, motor_z),
                           largo=3.40, diametro=1.70))
    piezas.append(superficie("pilon", [
        de_deriva(QUIEBRO, motor_y + 0.62, motor_z - 1.0, 3.8, 0.11),
        de_deriva(QUIEBRO, y_ala(QUIEBRO) - 0.05, z_ala(QUIEBRO) - 0.55,
                  3.6, 0.11),
    ], material_="gris", punta=False))

    # ── Cola ──────────────────────────────────────────────────────────────
    #
    # Deriva en flecha con su aleta dorsal, y estabilizador **en el
    # fuselaje**, no en su punta: la cola en T es del JAZ 60 y son dos
    # siluetas distintas a propósito. Al lado el uno del otro tienen que
    # poder contarse.
    piezas.append(superficie("deriva", [
        de_deriva(0.0, 1.40, 7.30, 7.60, 0.05),
        de_deriva(0.0, 2.10, 9.70, 5.20, 0.10),
        de_deriva(0.0, 7.20, 13.40, 2.25, 0.10),
    ], material_="capo", simetria=False, zonas=[
        ("oscuro", 0.8, 5.9, 0.68, 0.692),
    ]))
    y_est = 0.78
    piezas.append(superficie("estabilizador", [
        de_ala(0.0, y_est, 11.50, 3.30, 0.10, 6),
        de_ala(5.15, y_est + 5.15 * math.tan(math.radians(6)), 14.45, 1.20,
               0.09, 6),
    ], material_="gris", zonas=[
        ("aluminio", 0.9, 5.0, 0.0, 0.07),
        ("oscuro", 0.9, 5.0, 0.68, 0.695),
    ]))

    # ── Tren ──────────────────────────────────────────────────────────────
    #
    # Dos ruedas por pata, que es lo que lleva un avión de treinta toneladas:
    # el principal cuelga del ala junto al quiebro y se mete **hacia dentro**,
    # hacia la panza, girando sobre su muñón: la caña queda tumbada bajo el
    # ala y las ruedas, de canto, en el carenado. Así se mete el tren de
    # cualquier bimotor de pasillo único. El de morro se mete **hacia
    # delante**, a la panza bajo la cabina: si falla la hidráulica, el viento
    # lo empuja fuera y lo traba, que es la razón de que se haga así.
    #
    # Cada pata con su amortiguador —la caña gruesa y el vástago que brilla—,
    # su compás y su tornapuntas. El tornapuntas **nace en el eje de la
    # bisagra**, a un lado de la caña: así gira con la pata sin atravesar
    # nada, que es lo que hace el muñón de dos apoyos de uno de verdad.
    eje = -(TREN - RUEDA)
    arriba = y_ala(VIA) - 0.04
    principal = [
        varillas("pata-principal", [
            ((VIA, arriba, PRINCIPAL_Z), (VIA, eje + 0.75, PRINCIPAL_Z), 0.13),
            ((VIA, eje + 0.80, PRINCIPAL_Z), (VIA, eje, PRINCIPAL_Z), 0.085),
            ((VIA, arriba, PRINCIPAL_Z - 0.85),
             (VIA, eje + 1.20, PRINCIPAL_Z - 0.04), 0.06),
            ((VIA - 0.36, eje, PRINCIPAL_Z), (VIA + 0.36, eje, PRINCIPAL_Z),
             0.07),
            ((VIA, eje + 0.72, PRINCIPAL_Z - 0.14),
             (VIA, eje + 0.35, PRINCIPAL_Z - 0.24), 0.035),
            ((VIA, eje + 0.35, PRINCIPAL_Z - 0.24),
             (VIA, eje + 0.08, PRINCIPAL_Z - 0.12), 0.035),
        ], material_="gris"),
    ]
    ruedas = [(VIA - 0.30, eje, PRINCIPAL_Z), (VIA + 0.30, eje, PRINCIPAL_Z)]
    principal.append(neumaticos("rueda-principal", ruedas, RUEDA, 0.32))
    principal.append(llantas("rueda-principal-llanta", ruedas, RUEDA, 0.32))
    # La de la derecha gira hacia la izquierda: eje hacia el morro. Y algo
    # menos de un cuarto de vuelta, con la caña un poco caída hacia la panza:
    # tumbada del todo, la punta asomaba por encima del carenado, detrás del
    # borde de salida, donde el ala ya es fina. Lo mide `recogido`.
    patas = bisagra("principal", (VIA, arriba, PRINCIPAL_Z), (0, 0, -1), 84,
                    principal, simetria=True)

    eje_m = -(TREN - RUEDA_MORRO)
    arriba_m = -1.15
    morro = [varillas("pata-morro", [
        ((0, arriba_m, MORRO_Z), (0, eje_m + 0.60, MORRO_Z), 0.10),
        ((0, eje_m + 0.65, MORRO_Z), (0, eje_m, MORRO_Z + 0.08), 0.065),
        ((-0.26, eje_m, MORRO_Z + 0.08), (0.26, eje_m, MORRO_Z + 0.08), 0.05),
        ((-0.30, arriba_m, MORRO_Z), (0, eje_m + 1.0, MORRO_Z + 0.02),
         0.045),
        ((0.30, arriba_m, MORRO_Z), (0, eje_m + 1.0, MORRO_Z + 0.02), 0.045),
    ], material_="gris")]
    ruedas_m = [(-0.20, eje_m, MORRO_Z + 0.08), (0.20, eje_m, MORRO_Z + 0.08)]
    morro.append(neumaticos("rueda-morro", ruedas_m, RUEDA_MORRO, 0.22))
    morro.append(llantas("rueda-morro-llanta", ruedas_m, RUEDA_MORRO, 0.22))
    # Hacia delante: la rueda va al morro girando sobre el eje x.
    patas += bisagra("morro", (0, arriba_m, MORRO_Z), (1, 0, 0), 95, morro)
    # Y los flaps también tapan: son el trozo de ala de detrás del pozo; y
    # la franja que no baja, lo que queda de él donde acaba cada flap.
    recogido(patas, [p for p in piezas if p.type == "MESH" and (
        p.name in ("fuselaje", "carenado", "ala")
        or p.name.startswith(("flap-", "franja-")))])
    piezas += patas
    # Y ningún flap atraviesa nada al bajar: ni el tren, fuera o metido, ni
    # lo que cuelga cerca de él. Ver `flaps_libres`.
    flaps_libres(piezas, [p for p in piezas if p.type == "MESH" and (
        (p.parent and p.parent.name.startswith("bisagra-principal"))
        or p.name in ("fuselaje", "carenado", "pilon", "motor")
        or (p.name.startswith("canoa-") and "-cola" not in p.name))])

    # El centro de gravedad, a un cuarto de la cuerda media del ala.
    piezas.append(centro_de_gravedad(z_ala(5.2) + 0.80))
    return piezas


exportar(construir(), SALIDA, ENVERGADURA)
