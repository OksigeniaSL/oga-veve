"""
El Super Puma, modelado en Blender.

El AS 332 B1 del batallón de helicópteros del Ejército de Tierra en Los Rodeos
(Tenerife), el de **fuselaje corto**. Es el primer aparato de la flota que no
tiene ala, y por eso aquí lo que manda no es la envergadura sino el rotor: sus
quince metros sesenta de disco son lo que se ve de lejos, y lo que el juego
mide para ponerlo a escala.

**Lo que lo hace un Super Puma y no un helicóptero de juguete**, y por eso es
lo que más cuidado lleva:

- los dos motores encima de la cabina, con sus dos tomas redondas mirando al
  frente y los escapes a los costados;
- el cono de cola que se levanta en una deriva en flecha, con el rotor de cola
  de cinco palas a la derecha y **un solo estabilizador, a la izquierda**;
- los sponsons a los costados de la panza, con las ruedas principales debajo;
- la puerta corredera derecha con **la grúa encima**, en su borde delantero;
- el radomo del morro.

**De dónde salen las medidas.** La ficha de tipo (EASA TCDS R.002) da el largo
(15,53 m), el alto (4,95 m) y los dos rotores (15,60 m y cuatro palas; 3,05 m y
cinco); la «D-value» de Airbus (18,70 m) pone el rotor de cola a 9,375 m del
mástil. Lo que la ficha no trae —dónde van las ruedas, a qué altura giran las
palas, de qué lado van el rotor de cola y el estabilizador— sale de la muestra
de Gaudí del 11-11-2026, sacada de un plano de tres vistas a la escala de la
ficha y aprobada por Enrique: `arte-local/entregas/oga-veve/super-puma/muestra/`.
Cuando las dos chocan, **manda la ficha**: el plano saca el cono de cola un 3 %
largo, y aquí la cola se ha encogido hasta poner el rotor donde dice Airbus.

**Y el rotor se entrega parado y recto**, que es el contrato con el rotor de
Gaudí (`agents/arte/kit/oga-veve/rotor/` en hq): cada pala es una malla con
`pala` en el nombre, hija del vacío que gira, con el mástil en la Z local de
ese vacío. La caída de las palas paradas y el cono con el empuje los pone el
juego al montarlo; si las palas vinieran caídas de aquí, se sumarían dos
caídas. Ver `rotor_principal` y `rotor_de_cola`.

**Las piezas que se mueven**, por su nombre, que es el contrato con el juego:

- `rotor-principal`: el vacío que gira, en el buje. Cuelgan de él
  `rotor-principal-pala-1` a `-4` (con su manguito), sus puntas
  `rotor-principal-pala-N-punta` y la cabeza, `rotor-principal-buje`.
- `rotor-de-cola`: lo mismo, con `rotor-de-cola-pala-1` a `-5` y
  `rotor-de-cola-buje`.
- `grua`, en el pie del brazo, con `grua-brazo`, `grua-cabrestante`,
  `grua-cable` (origen arriba: se alarga estirándolo hacia abajo) y
  `grua-gancho` (origen en su ojo).
- `puerta-corredera`, con `eje` y `recorrido` en sus propiedades.
- El tren, con las bisagras de siempre: `bisagra-morro`,
  `bisagra-principal-derecha` e `-izquierda`, y las tapas del pozo de morro,
  `bisagra-tapa-morro-derecha` e `-izquierda`.
- Y en la cabina, los mandos de los dos puestos —`colectivo-N`,
  `ciclico-N` con `ciclico-N-profundidad` dentro, `pedal-N-derecho` e
  `-izquierdo`— y las palancas del techo, `palanca-motor-1` y `-2` y
  `palanca-freno-rotor`, cada una en su `…-pivote`. Ver `_que_se_mueve` en
  `comun.py`.

    blender --background --python modelos/jaz-super-puma.py

Origen: el centro de gravedad, que el modelo de vuelo pone bajo el mástil y a
1,8 m del suelo (`src/flight/super-puma.ts`). Así el suelo queda en y = -1,8.
"""

import math
import os
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import (  # noqa: E402
    COLORES, cabina, exportar, juntar_por_material, limpiar,
    se_busca_por_nombre,
)
from exterior import (  # noqa: E402
    Piel, _malla_en_escena, _orientar, _tubo, banda, bisagra,
    centro_de_gravedad, contorno, curva, de_ala, dentro_de, espejo, estacion,
    liso, llantas, neumaticos, paneles, paneles_zy, recogido, simetricos,
    superficie, torno, varillas, ventanas,
)

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "public", "assets", "aeronaves", "super-puma.glb")
# La letra de «RESCATE»: la de la carta, que ya está en el paquete con su
# licencia (OFL; ver CREDITOS.md). Ancha de trazo y estrecha de caja, que es
# como se rotula un helicóptero de rescate: se lee de lejos sin comerse el cono.
LETRA = os.path.join(RAIZ, "src", "assets", "letras",
                     "BarlowCondensed-SemiBold.woff2")

# ── Las medidas ───────────────────────────────────────────────────────────
#
# Todo desde el mástil, que es como las da la muestra, y con el suelo a 1,8 m
# por debajo del origen.
SUELO = -1.8
DIAMETRO = 15.60          # TCDS R.002
RADIO = DIAMETRO / 2
LARGO = 15.53             # TCDS R.002, fuselaje corto
ALTO = 4.95               # TCDS R.002
MORRO = -5.37             # la muestra: del morro al mástil
COLA = MORRO + LARGO      # 10,16: lo último del cono, el carenado de la caja
# El plano de las palas a 4,30 m del suelo posado (la muestra) y el mástil
# cinco grados hacia delante.
BUJE = (0.0, SUELO + 4.30, 0.0)
MASTIL = math.radians(5.0)
# El rotor de cola: a 9,375 m del mástil (D-value 18,70 menos los dos radios),
# medio metro a la derecha del eje, y **con la pala de arriba tocando el alto
# de la ficha**, 4,95 m. La muestra lo pone a 3,51 m del suelo; con el radio
# de la ficha eso daba 5,04 de alto, así que baja ocho centímetros.
RADIO_COLA = 3.05 / 2
BUJE_COLA = (0.50, SUELO + ALTO - RADIO_COLA, 9.375)
# Las ruedas: las de morro 3,6 m por delante del mástil, dos de 0,48 m a 0,45 m
# una de otra; las principales 1,66 m por detrás, una por lado de 0,62 m, con
# 3,1 m de vía.
RUEDA_MORRO = 0.24
MORRO_Z = -3.57
RUEDA = 0.31
PRINCIPAL_Z = 1.66
VIA = 3.10

# Los colores que solo lleva este aparato. **No son librea**: son los de las
# piezas que no se repintan, y por eso van fijos y no en la ficha.
COLORES.update({
    # El gris oscuro de las palas, que es también el del radomo: así lo pidió
    # Enrique en la muestra (los de Los Rodeos lo llevan negro).
    "rotor": (0.33, 0.35, 0.37, 1.0),
    # Las puntas de las palas, en el terracota de la casa. **Fijo y no del
    # capó**: el aro que dibuja el rotor de Gaudí cuando gira es de este color
    # y no lee la ficha, y una punta que no casara con su aro se vería al
    # arrancar.
    "punta-de-rotor": (0.745, 0.365, 0.22, 1.0),
    # El ocre de la casa, el del sol de las colas (`CASA.ocre` en
    # `src/flight/aircraft.ts`, #dd923f) y el de la muestra: va en el sol de la
    # base de la deriva y en la franja de rescate del cono. Fijo, como la
    # punta de las palas: es marca de rescate, no color de la ficha.
    "ocre": (0.867, 0.573, 0.247, 1.0),
})


def tramo(zs, ys):
    """Una curva de la librea dada por puntos: ver `curva` en exterior.py."""
    return curva(zs, ys)


# ── El fuselaje ───────────────────────────────────────────────────────────
#
# El de un helicóptero de transporte: la cabina es una caja de esquinas
# redondas —ancha abajo, donde van los sponsons, y algo más estrecha en el
# techo—, el morro baja hasta el radomo y por detrás la panza sube de golpe
# hasta el cono de cola, que es alto y estrecho. Las estaciones son
# `(z, medio ancho, techo, panza, altura de lo más ancho, exponente)`; con
# exponente 3 la sección es casi un cuadrado redondeado, que es la de la cabina.
FUSELAJE = Piel([
    (MORRO, 0.00, -0.47, -0.47, -0.47, 2.0),
    (-5.33, 0.17, -0.34, -0.60, -0.48, 2.0),
    (-5.22, 0.30, -0.25, -0.73, -0.50, 2.2),
    (-5.02, 0.45, -0.14, -0.86, -0.52, 2.4),
    (-4.80, 0.60, -0.03, -0.96, -0.54, 2.6),
    (-4.50, 0.78, 0.20, -1.07, -0.55, 2.8),
    (-4.10, 0.94, 0.62, -1.165, -0.55, 3.0),
    (-3.70, 1.04, 0.98, -1.215, -0.55, 3.1),
    (-3.35, 1.085, 1.05, -1.235, -0.55, 3.2),
    (-2.90, 1.10, 1.03, -1.24, -0.55, 3.2),
    (1.40, 1.10, 1.02, -1.24, -0.55, 3.2),
    (2.00, 1.07, 1.05, -1.16, -0.48, 3.1),
    (2.60, 0.98, 1.11, -0.99, -0.33, 3.0),
    (3.16, 0.84, 1.15, -0.80, -0.08, 2.8),
    (3.80, 0.65, 1.13, -0.50, 0.22, 2.6),
    (4.54, 0.50, 1.10, -0.24, 0.40, 2.5),
    (5.80, 0.43, 1.03, -0.15, 0.42, 2.4),
    (7.09, 0.37, 0.96, -0.09, 0.42, 2.4),
    (8.00, 0.31, 0.92, -0.075, 0.42, 2.4),
    (8.45, 0.22, 0.80, 0.00, 0.40, 2.4),
    (8.60, 0.00, 0.45, 0.35, 0.40, 2.0),
])

# El lomo: los motores delante, con sus tomas, y la caja de transmisión bajo el
# mástil, que es la joroba más alta; por detrás baja en rampa hasta el cono. Es
# **más estrecho que la cabina**, y ese escalón a los lados del techo es lo que
# dice desde lejos que los motores van encima y no dentro.
LOMO = Piel([
    (-3.40, 0.00, 1.00, 0.85, 0.92),
    (-3.20, 0.42, 1.16, 0.78, 1.00),
    (-2.95, 0.56, 1.26, 0.74, 1.04),
    (-2.40, 0.62, 1.34, 0.72, 1.06),
    (-1.90, 0.63, 1.50, 0.72, 1.10),
    (-1.30, 0.64, 1.66, 0.72, 1.15),
    (-0.95, 0.63, 1.82, 0.72, 1.18),
    (-0.65, 0.61, 1.95, 0.72, 1.20),
    (1.40, 0.62, 1.96, 0.72, 1.20),
    (2.05, 0.58, 1.79, 0.76, 1.18),
    (2.60, 0.44, 1.33, 0.82, 1.10),
    (3.15, 0.00, 1.10, 1.00, 1.05),
], n=3.0)

# Los sponsons: dos cajones a los lados de la panza, donde van las ruedas
# principales y el combustible. Por dentro se hunden en el fuselaje, que por
# detrás ya está subiendo hacia el cono: si no llegaran tan adentro, quedaría
# una rendija entre la panza y el sponson.
SPONSON = Piel([
    (0.88, 0.00, -0.87, -0.87, -0.87),
    (0.95, 0.45, -0.68, -1.06, -0.87),
    (1.12, 0.75, -0.56, -1.18, -0.87),
    (1.45, 0.82, -0.52, -1.21, -0.87),
    (2.35, 0.82, -0.52, -1.20, -0.87),
    (2.80, 0.70, -0.55, -1.12, -0.85),
    (3.10, 0.45, -0.62, -0.98, -0.82),
    (3.26, 0.00, -0.76, -0.80, -0.78),
], x=0.90, n=3.0)

# El carenado que sube del sponson al costado: la aleta curva que se ve en
# cualquier foto del Puma de perfil.
ALETA = Piel([
    (1.55, 0.00, -0.55, -0.60, -0.58),
    (1.80, 0.10, -0.35, -0.70, -0.55),
    (2.05, 0.14, 0.05, -0.75, -0.45),
    (2.40, 0.14, 0.12, -0.75, -0.40),
    (2.55, 0.08, -0.10, -0.70, -0.45),
    (2.62, 0.00, -0.40, -0.60, -0.50),
], x=1.02, n=2.6)

# La caja del rotor de cola, en lo alto de la deriva: del gris de las palas,
# como en la muestra. Acaba donde acaba el largo de la ficha.
CAJA_DE_COLA = Piel([
    (8.80, 0.00, 1.53, 1.53, 1.53),
    (8.95, 0.12, 1.70, 1.36, 1.54),
    (9.30, 0.19, 1.82, 1.30, 1.57),
    (9.70, 0.18, 1.78, 1.30, 1.55),
    (10.00, 0.12, 1.66, 1.36, 1.52),
    (COLA, 0.00, 1.51, 1.51, 1.51),
], n=2.4)


# La deriva: `(y, borde de ataque, borde de salida, medio grueso)` de abajo
# arriba. Ver `deriva`.
DERIVA = [
    (-0.075, 8.00, 8.74, 0.32),
    (0.36, 8.00, 9.04, 0.30),
    (0.71, 8.02, 9.33, 0.27),
    (0.98, 8.27, 9.56, 0.22),
    (1.25, 8.58, 9.80, 0.17),
    (1.45, 8.80, 9.96, 0.15),
]
N_DERIVA = 2.6


def raya(z):
    """
    La altura de la raya verde, que es la que manda en la librea del costado.

    Va recta por la cabina, a la altura del suelo de dentro, y desde la puerta
    sube por el cono hasta el pie de la deriva: es la línea que lleva el ojo
    del morro a la cola, como la hoja de los aviones de la flota.
    """
    return _RAYA(z)


_RAYA = tramo([-5.15, -4.60, 0.60, 1.67, 3.36, 8.00],
              [-0.60, -0.68, -0.68, -0.52, -0.31, 0.10])


# ── Ayudantes de este guion ───────────────────────────────────────────────


def malla_de(nombre, bm, material_, angulo=40):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return liso(_malla_en_escena(nombre, bm, [material_]), angulo=angulo)


def bloque(bm, centro, medio, giro=None):
    """Una caja dentro de un bmesh: centro, medias medidas y giro opcional."""
    cx, cy, cz = centro
    hx, hy, hz = medio
    vs = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                p = Vector((sx * hx, sy * hy, sz * hz))
                if giro is not None:
                    p = giro @ p
                vs.append(bm.verts.new(p + Vector((cx, cy, cz))))
    for cara in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6),
                 (0, 2, 6, 4), (1, 5, 7, 3)):
        bm.faces.new([vs[k] for k in cara])


def colgar(hijos, padre):
    bpy.context.view_layer.update()
    for h in hijos:
        h.parent = padre
        h.matrix_parent_inverse = padre.matrix_world.inverted()


def vacio(nombre, donde, giro=(0.0, 0.0, 0.0)):
    bpy.ops.object.empty_add(location=donde)
    o = bpy.context.object
    o.name = nombre
    o.rotation_euler = giro
    bpy.context.view_layer.update()
    return o


def juntar_en(nombre, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = objs[0]
    o.name = nombre
    o.data.name = f"m-{nombre}"
    return o


def girado(perfil_, nombre, material_, lados=24, transformar=None):
    """
    Un cuerpo de revolución alrededor de la Y: torno hace los suyos alrededor
    de la Z, y aquí se le da un cuarto de vuelta para ponerlo de pie.
    """
    o = torno(nombre, perfil_, en=(0, 0, 0), lados=lados, eje="z",
              material_=material_)
    m = Matrix.Rotation(math.radians(-90), 4, "X")
    if transformar is not None:
        m = transformar @ m
    o.data.transform(m)
    return o


# ── Las palas ─────────────────────────────────────────────────────────────


def pala(nombre, direccion, arriba, sentido, estaciones, material_,
         punta=False):
    """
    Una pala recta en el plano del rotor, con su perfil y su paso.

    `direccion` es hacia dónde apunta y `arriba` el eje del rotor. `sentido`
    dice hacia dónde gira por la regla de la mano derecha alrededor de
    `arriba`: el borde de ataque va delante en ese giro. Cada estación es
    `(radio, cuerda, espesor, paso en grados)`, y el eje de paso pasa por el
    cuarto de la cuerda, como en una pala de verdad.

    **Recta**: ni caída ni cono. Los pone el rotor de Gaudí en el juego, y si
    vinieran de aquí se sumarían dos.
    """
    d = Vector(direccion).normalized()
    w = Vector(arriba).normalized()
    avance = w.cross(d) * sentido
    hacia_atras = -avance
    est = []
    for r, c, t, paso in estaciones:
        th = math.radians(paso)
        cd = hacia_atras * math.cos(th) - w * math.sin(th)
        gd = w * math.cos(th) + hacia_atras * math.sin(th)
        ataque = d * r - cd * (c * 0.25)
        est.append(estacion(ataque, c, t, cd, gd))
    return superficie(nombre, est, material_=material_, curvatura=0.02,
                      puntos=11, simetria=False, punta=punta, angulo=60)


def rotor_principal():
    """
    El rotor principal: el vacío que gira y, colgando de él, las cuatro palas,
    sus puntas y la cabeza.

    **El contrato con el juego**, el del rotor de Gaudí:

    - El vacío se llama `rotor-principal` y está en el buje, en el plano de
      las palas. Su **Z local**, ya en el glTF, es el mástil hacia arriba, cinco
      grados adelantado; su X, a la derecha, y su Y, hacia el morro.
    - Cada pala es una malla con `pala` en el nombre —`rotor-principal-pala-1`
      a `-4`, con su manguito—, y su punta terracota otra:
      `rotor-principal-pala-1-punta`. Todas hijas directas del vacío.
    - La cabeza —buje, tapa, bieletas, plato de arriba y mástil— gira con él y
      no lleva `pala` en el nombre: no cae.

    Gira **en el sentido de las agujas del reloj visto desde arriba**, como los
    de Aérospatiale (`sentido: 1` en `super-puma.ts`): en la Z local del vacío
    es un giro **negativo**. Las palas llevan el borde de ataque delante en ese
    sentido.

    Paradas apuntan a los cuatro puntos —derecha, morro, izquierda y cola—, y
    no en aspa como en la muestra: el juego mide el ancho del modelo para
    ponerlo a escala, y así lo ancho es el diámetro del rotor.
    """
    # Se construye de pie en el origen —mástil en la Y, palas en el plano XZ—
    # y luego se inclina y se sube al buje: así cada pieza se escribe con los
    # números de un rotor y no con los de un rotor torcido.
    al_buje = (Matrix.Translation(BUJE)
               @ Matrix.Rotation(-MASTIL, 4, "X"))
    arriba = Vector((0, 1, 0))
    piezas = []

    # Las palas: 0,6 m de cuerda (la de la ficha de vuelo), un 12 % de espesor
    # y ocho grados de torsión, más paso en la raíz que en la punta. La raíz se
    # estrecha hasta el manguito, que es la pieza de metal que la une al buje.
    cuerpo = [(0.95, 0.30, 0.22, 9.0), (1.30, 0.60, 0.13, 8.5),
              (4.00, 0.60, 0.12, 5.3), (7.22, 0.60, 0.12, 1.5)]
    remate = [(7.22, 0.60, 0.12, 1.5), (7.55, 0.58, 0.12, 1.1),
              (RADIO - 0.03, 0.50, 0.12, 0.8)]
    # Derecha, morro, izquierda y cola: la 1 es la de la derecha y siguen en el
    # sentido contrario al de giro, como se numeran mirando desde arriba.
    direcciones = [(1, 0, 0), (0, 0, -1), (-1, 0, 0), (0, 0, 1)]
    for i, d in enumerate(direcciones, start=1):
        nombre = f"rotor-principal-pala-{i}"
        hoja = pala(nombre, d, arriba, -1, cuerpo, "rotor")
        bm = bmesh.new()
        dv = Vector(d)
        # El manguito, de la bisagra a la raíz de la pala: gordo junto al buje
        # y adelgazando, con el amortiguador de arrastre al lado.
        _tubo(bm, dv * 0.30, dv * 1.05, 0.085, 12)
        lado = arriba.cross(dv) * 0.13
        _tubo(bm, dv * 0.34 + lado, dv * 0.80 + lado * 0.7, 0.035, 8)
        manguito = malla_de(f"{nombre}-manguito", bm, "rotor")
        hoja = juntar_en(nombre, [hoja, manguito])
        punta = pala(f"{nombre}-punta", d, arriba, -1, remate,
                     "punta-de-rotor", punta=True)
        piezas += [hoja, punta]

    # La cabeza. El buje con sus cuatro brazos, la tapa redonda de encima —la
    # cúpula del batidor, que llega a 4,72 m del suelo—, el plato oscilante de
    # arriba y las cuatro bieletas que bajan de los manguitos a él.
    cabeza = [girado([(-0.14, 0.0), (-0.14, 0.26), (-0.10, 0.30),
                      (0.08, 0.30), (0.12, 0.24), (0.12, 0.0)],
                     "cabeza-buje", "rotor", 24)]
    cabeza.append(girado([(0.20, 0.0), (0.20, 0.50), (0.23, 0.57),
                          (0.30, 0.52), (0.37, 0.36), (0.42, 0.0)],
                         "cabeza-tapa", "rotor", 32))
    cabeza.append(girado([(-0.42, 0.0), (-0.42, 0.33), (-0.36, 0.33),
                          (-0.36, 0.0)], "cabeza-plato", "rotor", 24))
    bm = bmesh.new()
    _tubo(bm, (0, -0.70, 0), (0, 0.02, 0), 0.12, 16)        # el mástil
    _tubo(bm, (0, 0.10, 0), (0, 0.22, 0), 0.10, 12)         # el pie de la tapa
    for d in direcciones:
        dv = Vector(d)
        _tubo(bm, dv * 0.20, dv * 0.36, 0.09, 10)           # los brazos
        # La bieleta va del lado del borde de ataque, como el cuerno de paso.
        delante = arriba.cross(dv) * -1
        a = dv * 0.30 + delante * 0.16 + arriba * -0.36
        b = dv * 0.38 + delante * 0.16 + arriba * -0.02
        _tubo(bm, a, b, 0.022, 8)
    cabeza.append(malla_de("cabeza-varillas", bm, "rotor"))
    buje = juntar_en("rotor-principal-buje", cabeza)
    piezas.append(buje)

    for p in piezas:
        p.data.transform(al_buje)

    # El vacío. Blender pasa sus ejes a los de glTF cambiando de sitio la Y y
    # la Z, así que la Z del glTF es la −Y de aquí: el giro de 175° alrededor
    # de la X deja la −Y local en el mástil, cinco grados hacia el morro.
    eje = vacio("rotor-principal", BUJE,
                (math.radians(180) - MASTIL, 0.0, 0.0))
    colgar(piezas, eje)

    # Lo que no gira: el plato de abajo y sus tres servos, que bajan al lomo.
    bm = bmesh.new()
    for k in range(3):
        a = math.radians(90 + 120 * k)
        c, s = math.cos(a), math.sin(a)
        _tubo(bm, (0.30 * c, -0.48, 0.30 * s), (0.30 * c, -0.64, 0.30 * s),
              0.035, 8)
    fijo = [malla_de("plato-fijo-servos", bm, "rotor"),
            girado([(-0.50, 0.0), (-0.50, 0.36), (-0.44, 0.36), (-0.44, 0.0)],
                   "plato-fijo-disco", "rotor", 24)]
    plato = juntar_en("plato-fijo", fijo)
    plato.data.transform(al_buje)
    return [eje] + piezas + [plato]


def rotor_de_cola():
    """
    El rotor de cola: cinco palas al aire, a la derecha de la deriva.

    El mismo contrato que el principal: el vacío `rotor-de-cola` en el buje,
    con su **Z local** en el eje de giro, que mira a la derecha; las palas,
    `rotor-de-cola-pala-1` a `-5`, hijas suyas, y `rotor-de-cola-buje`. Una
    pala apunta arriba: es la que da el alto de la ficha.

    Gira con **la pala de arriba yendo hacia la cola**, que en su Z local es
    un giro **positivo**. Ninguna ficha pública lo dice; es lo que llevan los
    rotores de cola de su clase y se cambia aquí, en `sentido`.
    """
    # De pie en el origen, como el principal, y luego tumbado: la Y de
    # construcción pasa a ser la X del avión, y la X, el suelo.
    al_buje = (Matrix.Translation(BUJE_COLA)
               @ Matrix.Rotation(math.radians(-90), 4, "Z"))
    arriba = Vector((0, 1, 0))
    piezas = []
    # Cuerda de 0,19 m (la ficha de vuelo), recta y sin torsión.
    estaciones = [(0.20, 0.12, 0.25, 9.0), (0.34, 0.19, 0.13, 8.0),
                  (RADIO_COLA - 0.012, 0.19, 0.12, 8.0)]
    for i in range(5):
        a = math.radians(72 * i)
        # La X de construcción apunta al suelo una vez tumbado: la pala 1, que
        # va hacia −X, queda de pie.
        d = Vector((-math.cos(a), 0.0, math.sin(a)))
        piezas.append(pala(f"rotor-de-cola-pala-{i + 1}", d, arriba, 1,
                           estaciones, "rotor", punta=True))
    cabeza = [girado([(-0.10, 0.0), (-0.10, 0.17), (0.03, 0.17),
                      (0.10, 0.12), (0.14, 0.0)], "cola-tapa", "rotor", 20)]
    bm = bmesh.new()
    for i in range(5):
        a = math.radians(72 * i)
        d = Vector((-math.cos(a), 0.0, math.sin(a)))
        _tubo(bm, d * 0.10, d * 0.26, 0.04, 8)
    cabeza.append(malla_de("cola-horquillas", bm, "rotor"))
    piezas.append(juntar_en("rotor-de-cola-buje", cabeza))
    for p in piezas:
        p.data.transform(al_buje)
    # La Z del glTF es la −Y de Blender: un cuarto de vuelta en la Z la pone
    # mirando a la derecha del avión.
    eje = vacio("rotor-de-cola", BUJE_COLA, (0.0, 0.0, math.radians(90)))
    colgar(piezas, eje)
    return [eje] + piezas


# ── La librea ─────────────────────────────────────────────────────────────


def rotulo(texto, piel, z_centro, y_centro, alto, lado, fuera=0.014):
    """
    Un rótulo pegado a la piel: letras de verdad, de la letra de la carta,
    llevadas punto a punto al costado como las ventanillas.

    **Que se lea en los dos costados.** En el derecho, mirando desde fuera, el
    morro queda a la derecha de quien mira, así que el texto avanza hacia el
    morro; en el izquierdo, hacia la cola. Un rótulo reflejado en espejo es lo
    único que no se perdona.
    """
    curva_ = bpy.data.curves.new(f"letras-{texto}", "FONT")
    curva_.body = texto
    try:
        curva_.font = bpy.data.fonts.load(LETRA, check_existing=True)
    except RuntimeError:
        pass  # sin la letra de la carta, la de Blender: que no pare el guion
    curva_.resolution_u = 3
    curva_.align_x = "CENTER"
    obj = bpy.data.objects.new(f"letras-{texto}", curva_)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    plano = obj.evaluated_get(deps).to_mesh()
    bm = bmesh.new()
    bm.from_mesh(plano)
    obj.evaluated_get(deps).to_mesh_clear()
    bpy.data.objects.remove(obj)
    ys = [v.co.y for v in bm.verts]
    y0, y1 = min(ys), max(ys)
    escala = alto / (y1 - y0)
    # Cortado en tiras: una letra es un polígono grande y la piel es curva, y
    # una cara que va de lado a lado de una curva se mete por dentro.
    for k in range(1, 12):
        y = y0 + (y1 - y0) * k / 12
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                               plane_co=(0, y, 0), plane_no=(0, 1, 0))
    xs = [v.co.x for v in bm.verts]
    for k in range(1, 28):
        x = min(xs) + (max(xs) - min(xs)) * k / 28
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                               plane_co=(x, 0, 0), plane_no=(1, 0, 0))
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    ym = (y0 + y1) / 2
    for v in bm.verts:
        z = z_centro - lado * v.co.x * escala
        y = y_centro + (v.co.y - ym) * escala
        v.co = piel.en(z, y, lado, fuera)
    _orientar(bm, piel)
    return bm


def librea(piezas):
    """
    La de la flota, como en la muestra: el casco crema, la franja terracota en
    lo bajo de la cabina que sube por el cono, la raya verde encima con un
    filete de crema entre las dos, la deriva verde con el sol ocre naciendo en
    su base (ver `sol_de_la_deriva`), «RESCATE» en grande en el cono y, entre
    las letras y la deriva, la franja ocre de rescate de las láminas.
    """
    # La franja terracota, de bajo la raya hasta la panza: en la cabina es lo
    # bajo del costado, y en el cono, que es estrecho, su mitad de abajo.
    def arriba(z):
        return raya(z) - 0.075

    def abajo(z):
        return FUSELAJE.abajo(z) + 0.004

    piezas.append(banda("franja", FUSELAJE, -4.25, 7.98, abajo, arriba,
                        fuera=0.010, paso=0.12, filas=4))
    piezas.append(banda("raya", FUSELAJE, -5.12, 7.98,
                        lambda z: raya(z) - 0.025, lambda z: raya(z) + 0.025,
                        material_="detalle", fuera=0.010, paso=0.12, filas=1))
    # «RESCATE», en terracota y en grande en el cono: es lo que se lee primero,
    # y como lo rotulan los de rescate de verdad.
    bm = bmesh.new()
    for lado in (-1, 1):
        parte = rotulo("RESCATE", FUSELAJE, 5.70, 0.30, 0.46, lado)
        malla = bpy.data.meshes.new("tmp")
        parte.to_mesh(malla)
        parte.free()
        bm.from_mesh(malla)
        bpy.data.meshes.remove(malla)
    piezas.append(liso(_malla_en_escena("rescate", bm, ["capo"]), angulo=80))
    # Y la franja ocre de rescate, una vuelta entera al cono entre las letras y
    # la deriva, por encima de la franja y de la raya: es la marca que pidió
    # Enrique junto a «RESCATE», y la que llevan las dos láminas.
    bm = bmesh.new()
    vuelta, filas = 48, 2
    z0, z1 = 7.00, 7.55
    anillos = [[bm.verts.new(FUSELAJE.punto(z0 + (z1 - z0) * k / filas,
                                            math.tau * i / vuelta, 0.016))
                for i in range(vuelta)] for k in range(filas + 1)]
    for a, b in zip(anillos, anillos[1:]):
        for i in range(vuelta):
            j = (i + 1) % vuelta
            bm.faces.new((a[i], a[j], b[j], b[i]))
    _orientar(bm, FUSELAJE)
    piezas.append(liso(_malla_en_escena("franja-de-rescate", bm, ["ocre"]),
                       angulo=80))


# ── La cabina por fuera ───────────────────────────────────────────────────


def cristales(piezas):
    """
    El parabrisas, las ventanillas de la cabina de mando y las de la de carga.

    La cabina por dentro va aparte —ver `cabina_por_dentro`—: el cristal es
    opaco, como en el resto de la flota, y lo que se ve a través es su reflejo
    oscuro.
    """
    # **Una pecera, no ventanillas sueltas.** La cabina de mando del Puma es
    # casi toda cristal: de perfil se ve una sola mancha oscura con montantes
    # finos y claros, y eso es lo que dice «helicóptero» desde lejos. Los
    # montantes son la piel que queda entre panel y panel: por eso los huecos
    # entre cristales son de cinco centímetros y no más.
    def t(z, y):
        return math.degrees(FUSELAJE.t_de_y(z, y, 1))

    # El parabrisas: dos paneles grandes sobre el morro que sube, con su
    # montante en medio, y su borde de costado bajando en diagonal.
    piezas.append(paneles("parabrisas", FUSELAJE, simetricos([
        [(-4.52, 1.2), (-3.74, 1.2), (-3.74, t(-3.74, 0.66)),
         (-4.52, t(-4.52, -0.02))],
    ]), fuera=0.010, div=8))
    # De costado, tres paneles separados por montantes que se inclinan hacia
    # el morro; encima, la ceja que da al techo, y debajo la ventanilla de la
    # puerta y la de los pies, que llega hasta el radomo.
    piezas.append(paneles_zy("ventanillas-de-mando", FUSELAJE, [
        [(-4.44, 0.0), (-4.00, 0.0), (-3.76, 0.76), (-3.79, 0.62)],
        [(-3.95, 0.0), (-3.56, 0.0), (-3.34, 0.76), (-3.71, 0.76)],
        [(-3.51, 0.0), (-3.10, 0.0), (-3.10, 0.76), (-3.29, 0.76)],
        [(-3.66, 0.82), (-3.12, 0.82), (-3.12, 0.97), (-3.56, 0.97)],
        [(-3.98, -0.07), (-3.56, -0.07), (-3.56, -0.58), (-3.98, -0.58)],
        [(-4.70, -0.07), (-4.04, -0.07), (-4.04, -0.64), (-4.52, -0.62)],
    ], fuera=0.010, div=6))
    # Las de la cabina de carga. La grande de delante es la de emergencia.
    piezas.append(ventanas("ventanillas", FUSELAJE, [2.80, 1.46, -1.24], 0.13,
                           0.34, 0.47, radio=0.08, fuera=0.010))
    piezas.append(ventanas("ventanilla-grande", FUSELAJE, [-1.87], 0.15, 0.66,
                           0.56, radio=0.09, fuera=0.010))
    # A la izquierda, la puerta corredera es solo su junta y sus ventanillas.
    piezas.append(ventanas("ventanillas-puerta-izquierda", FUSELAJE,
                           [0.14, -0.50], 0.13, 0.34, 0.47, radio=0.08,
                           fuera=0.010, lados=(-1,)))
    piezas.append(contorno("puerta-izquierda", FUSELAJE, -0.155, -0.29, 1.73,
                           1.43, radio=0.08, grueso=0.022, fuera=0.012,
                           lados=(-1,)))


# ── La cabina por dentro ──────────────────────────────────────────────────
#
# Los muebles —panel, pantallas, pedestal, consola del techo, asientos y
# mandos— los pone `cabina` en `comun.py`, con la clase «helicóptero». Aquí va
# lo que depende de **este** fuselaje: el suelo, los forros que siguen su piel
# y dejan el hueco de sus ventanas, los montantes y el techo.
#
# **Por qué hace falta.** La piel y el cristal solo se pintan por fuera (ver
# `material` en `comun.py`), así que desde el asiento un fuselaje sin forros es
# una pecera entera: se veía el mundo por todas partes y, por debajo, la pata
# de la rueda de morro. Por dentro, **lo que no se forra es ventana**; por eso
# los forros dejan justo los huecos de las ventanas de Gaudí, y ninguno más.
#
# El ojo: el del comandante, en el asiento de la derecha, a 3,55 m por delante
# del mástil y 2,30 sobre el suelo posado —el de la silueta de cajas era
# parecido—. El suelo de la cabina, a la altura de la raya verde, que es la del
# suelo de dentro.
OJOS_Z = -3.695
Y_SUELO = -0.70
Y_RESPALDO = 0.40
PLAZAS = (0.40, -0.40)
ATRAS = -3.05          # el mamparo entre la cabina de mando y la de carga
# Las ventanas de abajo de Gaudí, `(z0, z1, y0, y1)`: la de los pies, en el
# costado del morro hasta el radomo, y la de la puerta. Ver `cristales`.
VENTANA_DE_LOS_PIES = (-4.54, -4.04, -0.62, -0.07)
VENTANA_DE_LA_PUERTA = (-3.98, -3.56, -0.58, -0.07)
DENTRO = 0.03          # lo que se separa el forro de la piel


def hueco(z, y):
    """Medio ancho de la cabina por dentro a esa altura: la piel, menos el forro."""
    return FUSELAJE.en(z, y, 1).x - DENTRO


def _rejilla(bm, filas, hacia_dentro):
    """
    Caras entre filas de puntos, con la cara buena hacia `hacia_dentro`.

    Los forros se ven solo por la cara que mira al piloto, así que cada cara se
    vuelve hacia ahí: hacia el eje del avión en los costados, hacia abajo en el
    techo, hacia arriba en el suelo.
    """
    for a, b in zip(filas, filas[1:]):
        for i in range(len(a) - 1):
            if a[i] is None or a[i + 1] is None or b[i] is None \
                    or b[i + 1] is None:
                continue
            f = bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
            f.normal_update()
            c = f.calc_center_median()
            if f.normal.dot(hacia_dentro(c)) < 0:
                f.normal_flip()


def _pasos(desde, hasta, cada, tambien=()):
    """De `desde` a `hasta` cada tanto, sin saltarse los cortes de `tambien`."""
    n = max(1, round(abs(hasta - desde) / cada))
    xs = {round(desde + (hasta - desde) * k / n, 4) for k in range(n + 1)}
    xs |= {round(t, 4) for t in tambien if min(desde, hasta) <= t <= max(desde, hasta)}
    return sorted(xs)


def cabina_por_dentro(z_nariz):
    """
    El suelo, los forros de los costados con sus ventanas, los montantes del
    parabrisas, la tapa del morro y el techo. Todo en pocas mallas.
    """
    piezas = []
    zs = _pasos(z_nariz, ATRAS, 0.10, VENTANA_DE_LOS_PIES[:2]
                + VENTANA_DE_LA_PUERTA[:2])

    # El suelo, a lo ancho entre los dos forros.
    bm = bmesh.new()
    filas = []
    for z in zs:
        w = hueco(z, Y_SUELO + 0.02)
        filas.append([bm.verts.new((x, Y_SUELO, z)) for x in (-w, 0.0, w)])
    _rejilla(bm, filas, lambda c: Vector((0, 1, 0)))
    piezas.append(_malla_en_escena("suelo-cabina", bm, ["forro"]))

    # Los costados, de bajo el suelo al alféizar, **con el hueco de sus dos
    # ventanas**: por la de los pies se ve el helipuerto al posarse, y por la
    # de la puerta, el suelo junto a la rueda.
    ys = [Y_SUELO - 0.01, -0.62, -0.58, -0.35, -0.07, 0.0]
    bm = bmesh.new()
    for lado in (-1, 1):
        filas = []
        for z in zs:
            fila = []
            for y in ys:
                fila.append(bm.verts.new((lado * hueco(z, y), y, z)))
            filas.append(fila)
        # Se quita la cara que cae dentro de una ventana: se marca su vértice
        # de arriba a la izquierda y `_rejilla` se la salta.
        caras = []
        for i, (za, zb) in enumerate(zip(zs, zs[1:])):
            for j, (ya, yb) in enumerate(zip(ys, ys[1:])):
                hueca = any(
                    v[0] <= za and zb <= v[1] and v[2] <= ya and yb <= v[3]
                    for v in (VENTANA_DE_LOS_PIES, VENTANA_DE_LA_PUERTA))
                if not hueca:
                    caras.append((filas[i][j], filas[i][j + 1],
                                  filas[i + 1][j + 1], filas[i + 1][j]))
        for c in caras:
            f = bm.faces.new(c)
            f.normal_update()
            if f.normal.x * lado > 0:
                f.normal_flip()
    piezas.append(_malla_en_escena("forros", bm, ["forro"]))

    # **La tapa del morro**, por dentro de la piel, de donde acaba el
    # parabrisas hacia delante, mirando al piloto. Desde el asiento, por encima de la visera se
    # ve el borde de abajo del parabrisas; y entre él y la visera lo que hay
    # de verdad es el morro, opaco. Sin esta tapa ahí se veía el suelo a
    # través de la piel.
    #
    # Hasta la punta, y por los lados hasta donde lo tapa la visera: la raya
    # que va de los ojos al labio baja unos veintiocho grados, y lo que queda
    # por debajo de ella no se ve. Con la tapa más corta se colaba una media
    # luna de suelo entre la tapa y la visera.
    ojo_y, ojo_z = Y_RESPALDO + 0.10, OJOS_Z + 0.145
    bm = bmesh.new()
    filas = []
    fuera = []
    for z in _pasos(MORRO + 0.02, -4.50, 0.08):
        raya_ = ojo_y - math.tan(math.radians(28)) * (ojo_z - z) - 0.06
        _, yt, yb, _, _ = FUSELAJE.seccion(z)
        tl = FUSELAJE.t_de_y(z, max(yb + 0.02, min(-0.07, raya_, yt - 0.05)), 1)
        ts = [tl * k / 8 for k in range(-8, 9)]
        filas.append([bm.verts.new(FUSELAJE.punto(z, t, -DENTRO)) for t in ts])
        fuera += [FUSELAJE.normal(z, t) for t in ts]
    _rejilla(bm, filas, lambda c: Vector((0, -0.55, c.z)) - c)
    # Del color del casco, que es el que tiene el morro por fuera y el que se
    # ve por el parabrisas: lo repinta el juego con el de la ficha.
    #
    # **Y alumbrada como la piel de fuera**: se ve por su cara de dentro, pero
    # lo que hace de ella es la chapa de fuera, que el sol pega desde arriba.
    # Con las normales hacia dentro salía una cúpula oscura sobre la visera,
    # de noche a mediodía. Se le dan las de la piel: la cara buena sigue
    # siendo la de dentro, y la luz, la de fuera.
    tapa = _malla_en_escena("tapa-del-morro", bm, ["casco"])
    me = tapa.data
    for pol in me.polygons:
        pol.use_smooth = True
    me.normals_split_custom_set(
        [tuple(fuera[me.loops[i].vertex_index]) for i in range(len(me.loops))])
    piezas.append(tapa)

    # El techo, entre las ventanas de la ceja, hasta el mamparo.
    bm = bmesh.new()
    filas = []
    for z in _pasos(-3.74, ATRAS, 0.10):
        tc = FUSELAJE.t_de_y(z, 0.95, 1)
        filas.append([bm.verts.new(FUSELAJE.punto(z, tc * k / 6, -DENTRO))
                      for k in range(-6, 7)])
    _rejilla(bm, filas, lambda c: Vector((0, -1, 0)))
    piezas.append(_malla_en_escena("techo-cabina", bm, ["forro"]))

    # El mamparo de atrás, entero: la cabina de carga no tiene dentro, y
    # mirando hacia atrás se vería el mundo por la piel.
    bm = bmesh.new()
    filas = []
    for y in (Y_SUELO, -0.30, 0.10, 0.50, 0.80, 0.95):
        w = hueco(ATRAS, y)
        filas.append([bm.verts.new((x, y, ATRAS)) for x in (-w, 0.0, w)])
    _rejilla(bm, filas, lambda c: Vector((0, 0, -1)))
    piezas.append(_malla_en_escena("mamparo", bm, ["forro"]))

    # Los montantes: lo que queda de piel entre cristal y cristal, visto por
    # dentro. Sin ellos la pecera no tenía marco y el mundo entraba entero.
    def por_la_piel(puntos_zy, lado):
        return [tuple(FUSELAJE.en(z, y, lado, -0.035)) for z, y in puntos_zy]

    def tramo_recto(a, b, n=6):
        return [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)
                for k in range(n + 1)]

    tramos = []
    for lado in (-1, 1):
        for a, b in (((-4.49, 0.0), (-3.77, 0.70)),     # parabrisas y costado
                     ((-3.975, 0.0), (-3.735, 0.76)),   # entre las de costado
                     ((-3.53, 0.0), (-3.31, 0.76)),
                     ((-3.08, 0.0), (-3.08, 0.95)),
                     ((-4.49, 0.0), (ATRAS, 0.0)),      # el alféizar
                     ((-3.77, 0.79), (ATRAS, 0.79))):   # bajo la ceja
            p = por_la_piel(tramo_recto(a, b, 3), lado)
            tramos += [(p[k], p[k + 1], 0.018) for k in range(len(p) - 1)]
    # El del medio del parabrisas, por el lomo, y el travesaño de arriba.
    p = [tuple(FUSELAJE.punto(z, 0.0, -0.035))
         for z in _pasos(-4.52, -3.74, 0.26)]
    tramos += [(p[k], p[k + 1], 0.018) for k in range(len(p) - 1)]
    t1 = FUSELAJE.t_de_y(-3.75, 0.70, 1)
    p = [tuple(FUSELAJE.punto(-3.75, t1 * k / 4, -0.035)) for k in range(-4, 5)]
    tramos += [(p[k], p[k + 1], 0.026) for k in range(len(p) - 1)]
    # Y el marco de las dos ventanas de abajo, que sin él eran un hueco en el
    # forro: por la de los pies tiene que leerse «ventana», que es por donde
    # se mira el helipuerto al posarse.
    for lado in (-1, 1):
        for z0, z1, y0, y1 in (VENTANA_DE_LOS_PIES, VENTANA_DE_LA_PUERTA):
            for a, b in (((z0, y0), (z1, y0)), ((z1, y0), (z1, y1)),
                         ((z1, y1), (z0, y1)), ((z0, y1), (z0, y0))):
                p = por_la_piel(tramo_recto(a, b, 2), lado)
                tramos += [(p[k], p[k + 1], 0.014) for k in range(len(p) - 1)]
    # Oscuros, como los de verdad: los de un gris claro se leían como barras
    # cruzando el parabrisas más que como su marco.
    #
    # De seis caras y en pocos tramos: son ciento y pico tubos, y con ocho
    # caras y tramos cortos pesaban más que el fuselaje entero.
    piezas.append(varillas("pilares-de-cabina", tramos, material_="tablero",
                           lados=6))
    return piezas


PUERTA = (-0.87, 0.56, -1.16, 0.58)   # z0, z1, y0, y1


def puerta_corredera():
    """
    La puerta corredera derecha, que **se desliza hacia el morro** por sus dos
    carriles, como en la muestra: el carril de arriba sigue hasta pasada la
    ventanilla grande.

    Es el vacío `puerta-corredera`, con `eje` —hacia dónde se va, en los ejes
    del avión— y `recorrido` en metros, como la reversa de los reactores; de
    él cuelgan la chapa, sus ventanillas, su trozo de franja y su junta. Al
    abrirse deja ver el hueco, oscuro, que va pegado al fuselaje.
    """
    z0, z1, y0, y1 = PUERTA
    zc, yc = (z0 + z1) / 2, (y0 + y1) / 2
    hijos = []
    hijos.append(paneles_zy("puerta-corredera-chapa", FUSELAJE,
                            [[(z0, y0), (z1, y0), (z1, y1), (z0, y1)]],
                            fuera=0.034, material_="casco", div=8, lados=(1,)))
    hijos.append(ventanas("puerta-corredera-ventanillas", FUSELAJE,
                          [0.14, -0.50], 0.13, 0.34, 0.47, radio=0.08,
                          fuera=0.044, lados=(1,)))
    hijos.append(banda("puerta-corredera-franja", FUSELAJE, z0 + 0.03, z1 - 0.03,
                       lambda z: y0 + 0.03, lambda z: raya(z) - 0.075,
                       fuera=0.042, paso=0.12, filas=2, lados=(1,)))
    hijos.append(banda("puerta-corredera-raya", FUSELAJE, z0 + 0.03, z1 - 0.03,
                       lambda z: raya(z) - 0.025, lambda z: raya(z) + 0.025,
                       material_="detalle", fuera=0.042, paso=0.12, filas=1,
                       lados=(1,)))
    hijos.append(contorno("puerta-corredera-junta", FUSELAJE, zc, yc,
                          y1 - y0, z1 - z0, radio=0.06, grueso=0.02,
                          fuera=0.046, lados=(1,)))
    hueco = paneles_zy("hueco-de-puerta", FUSELAJE,
                       [[(z0 + 0.04, y0 + 0.04), (z1 - 0.04, y0 + 0.04),
                         (z1 - 0.04, y1 - 0.04), (z0 + 0.04, y1 - 0.04)]],
                       fuera=0.018, material_="oscuro", div=6, lados=(1,))
    p = FUSELAJE.en(zc, yc, 1, 0.034)
    eje = vacio("puerta-corredera", (p.x, p.y, p.z))
    eje["eje"] = [0.0, 0.0, -1.0]
    eje["recorrido"] = 1.10
    colgar(hijos, eje)
    # Los carriles: el de arriba sigue hacia el morro lo que corre la puerta.
    tramos = []
    for y, desde in ((y1 + 0.05, z0 - 1.10), (y0 - 0.02, z0 - 1.10)):
        a = FUSELAJE.en(z1, y, 1, 0.03)
        b = FUSELAJE.en(desde, y, 1, 0.03)
        tramos.append((tuple(a), tuple(b), 0.018))
    carril = varillas("carriles-de-puerta", tramos, material_="gris", lados=8)
    # Y el estribo, bajo la puerta.
    est = varillas("estribo", [
        (tuple(FUSELAJE.en(z1 - 0.1, -1.17, 1, 0.10)),
         tuple(FUSELAJE.en(z0 + 0.1, -1.17, 1, 0.10)), 0.025),
    ], material_="gris", lados=8)
    return [eje] + hijos + [hueco, carril, est]


def grua():
    """
    La grúa de rescate, sobre la puerta y en su borde delantero.

    Un brazo que sale del techo, el cabrestante en su punta, el cable y el
    gancho. Va con nombres para moverse: el vacío `grua` en el pie del brazo
    —el brazo de verdad se abate hacia fuera para trabajar—, y el cable con su
    origen arriba, para que alargarlo sea estirarlo hacia abajo; el gancho,
    con el suyo en el ojo donde se engancha.
    """
    z = -0.78
    raiz = FUSELAJE.en(z, 0.90, 1, -0.05)
    punta_x = 1.50
    y = 0.95
    bm = bmesh.new()
    _tubo(bm, (raiz.x, y, z), (punta_x, y, z), 0.05, 10)
    _tubo(bm, (raiz.x + 0.05, 0.62, z), (punta_x - 0.30, y - 0.02, z), 0.03, 8)
    bloque(bm, (raiz.x + 0.04, 0.80, z), (0.08, 0.20, 0.10))
    brazo = malla_de("grua-brazo", bm, "rotor")
    cabrestante = torno("grua-cabrestante", [
        (-0.30, 0.0), (-0.30, 0.10), (-0.27, 0.13), (0.22, 0.13),
        (0.25, 0.10), (0.25, 0.0)], en=(punta_x + 0.10, y, z + 0.02),
        lados=16, eje="z", material_="gris")
    arriba = y - 0.10
    abajo = 0.50
    bm = bmesh.new()
    _tubo(bm, (0, 0, 0), (0, abajo - arriba, 0), 0.008, 6)
    cable = malla_de("grua-cable", bm, "oscuro")
    cable.location = (punta_x + 0.10, arriba, z - 0.26)
    bm = bmesh.new()
    bloque(bm, (0, -0.06, 0), (0.045, 0.06, 0.035))
    _tubo(bm, (0, -0.12, 0), (0, -0.20, 0.05), 0.018, 8)
    gancho = malla_de("grua-gancho", bm, "capo")
    gancho.location = (punta_x + 0.10, abajo, z - 0.26)
    pie = vacio("grua", (raiz.x, y, z))
    colgar([brazo, cabrestante, cable, gancho], pie)
    return [pie, brazo, cabrestante, cable, gancho]


# ── El tren ───────────────────────────────────────────────────────────────


def tren():
    """
    Triciclo y retráctil, como en los B1 del Ejército: las dos ruedas de morro
    en una pata que se mete hacia atrás, y una principal en cada sponson, que
    también se mete hacia atrás dentro de él.

    Con la bisagra de siempre (`bisagra` en exterior.py), que es lo que lee
    `world/patas.ts`. Las tapas de la pata de morro cuelgan abiertas a sus
    lados y se cierran girando sobre su borde al meterse la rueda.
    """
    piezas = []
    eje_y = SUELO + RUEDA
    x = VIA / 2
    munon = (x - 0.15, -0.88, PRINCIPAL_Z)
    principal = [varillas("pata-principal", [
        ((x - 0.15, -0.80, PRINCIPAL_Z), (x - 0.15, eje_y + 0.10, PRINCIPAL_Z),
         0.06),
        ((x - 0.15, eje_y + 0.12, PRINCIPAL_Z), (x - 0.15, eje_y, PRINCIPAL_Z),
         0.045),
        ((x - 0.20, eje_y, PRINCIPAL_Z), (x + 0.08, eje_y, PRINCIPAL_Z), 0.035),
        ((x - 0.15, -0.86, PRINCIPAL_Z - 0.32),
         (x - 0.15, eje_y + 0.20, PRINCIPAL_Z - 0.02), 0.03),
    ], material_="gris")]
    rueda = [(x, eje_y, PRINCIPAL_Z)]
    principal.append(neumaticos("rueda-principal", rueda, RUEDA, 0.20))
    principal.append(llantas("rueda-principal-llanta", rueda, RUEDA, 0.20))
    bm = bmesh.new()
    bloque(bm, (x - 0.24, -1.02, PRINCIPAL_Z), (0.012, 0.16, 0.20))
    principal.append(malla_de("tapa-tren-principal", bm, "casco"))
    piezas += bisagra("principal", munon, (-1, 0, 0), 90, principal,
                      simetria=True)

    eje_m = SUELO + RUEDA_MORRO
    morro = [varillas("pata-morro", [
        ((0, -0.95, MORRO_Z), (0, eje_m + 0.16, MORRO_Z), 0.06),
        ((0, eje_m + 0.18, MORRO_Z), (0, eje_m, MORRO_Z + 0.04), 0.045),
        ((-0.33, eje_m, MORRO_Z + 0.04), (0.33, eje_m, MORRO_Z + 0.04), 0.035),
        ((0, -1.05, MORRO_Z + 0.22), (0, eje_m + 0.20, MORRO_Z + 0.02), 0.025),
    ], material_="gris")]
    ruedas = [(-0.225, eje_m, MORRO_Z + 0.04), (0.225, eje_m, MORRO_Z + 0.04)]
    morro.append(neumaticos("rueda-morro", ruedas, RUEDA_MORRO, 0.16))
    morro.append(llantas("rueda-morro-llanta", ruedas, RUEDA_MORRO, 0.16))
    piezas += bisagra("morro", (0, -0.90, MORRO_Z), (-1, 0, 0), 90, morro)
    # Las tapas del pozo de morro, abiertas a los lados de las ruedas. Al
    # cerrarse, la de la derecha gira hacia dentro sobre su bisagra, que va a
    # lo largo del avión; la de la izquierda sale en espejo.
    bm = bmesh.new()
    bloque(bm, (0.36, -1.31, MORRO_Z + 0.10), (0.010, 0.10, 0.26))
    tapa = malla_de("tapa-tren-morro", bm, "casco")
    piezas += bisagra("tapa-morro", (0.36, -1.21, MORRO_Z + 0.14), (0, 0, -1),
                      90, [tapa], simetria=True)
    return piezas


# ── El aparato entero ─────────────────────────────────────────────────────


def construir():
    limpiar()
    piezas = []

    # El radomo es del gris de las palas, y baja más por la barbilla que por
    # encima: así lo lleva el Puma.
    piezas.append(FUSELAJE.malla(
        "fuselaje", lados=44, paso=0.25,
        zonas=[("rotor", MORRO - 0.1, -4.96, 0, 180),
               ("rotor", -4.96, -4.62, 92, 180),
               ("rotor", -4.62, -4.36, 124, 180)],
        extra=[-4.96, -4.62, -4.36, -3.70, -3.35, 0.88, 3.26, 8.0]))
    piezas.append(LOMO.malla("lomo", lados=36, paso=0.2))
    piezas.append(espejo(SPONSON.malla("sponson", lados=32, paso=0.15)))
    piezas.append(espejo(ALETA.malla("aleta-de-sponson", lados=20, paso=0.12)))
    piezas.append(CAJA_DE_COLA.malla("caja-de-cola", "rotor", lados=24,
                                     paso=0.12))
    # El eje de salida de la caja, hasta el buje del rotor de cola.
    bm = bmesh.new()
    _tubo(bm, (0.10, BUJE_COLA[1], BUJE_COLA[2]),
          (BUJE_COLA[0] - 0.08, BUJE_COLA[1], BUJE_COLA[2]), 0.09, 14)
    piezas.append(malla_de("eje-de-cola", bm, "rotor"))

    # ── Las dos tomas y los dos escapes ──────────────────────────────────
    #
    # Las tomas, dos cilindros que asoman por encima del lomo sobre el techo
    # de la cabina de mando, con la boca redonda al frente y el cono en medio:
    # son los ojos del Super Puma de frente. El lomo baja entre ellas para que
    # se lean como dos y no como un bulto. Los escapes salen a los costados, delante del
    # mástil, brillantes de calor.
    piezas.append(espejo(torno("toma-de-motor", [
        (-2.98, 0.0, "oscuro"), (-2.94, 0.07), (-2.90, 0.10), (-2.90, 0.19),
        (-3.05, 0.20, "aluminio"), (-3.12, 0.225), (-3.10, 0.255, "casco"),
        (-3.01, 0.27), (-1.40, 0.27), (-1.20, 0.20), (-1.12, 0.0),
    ], en=(0.30, 1.42, 0.0), lados=28, eje="z", material_="casco")))
    piezas.append(espejo(torno("escape", [
        (0.48, 0.25, "aluminio"), (0.78, 0.245), (0.80, 0.215),
        (0.79, 0.18, "oscuro"), (0.66, 0.17), (0.66, 0.0),
    ], en=(0.0, 1.27, -0.27), lados=24, eje="x", material_="aluminio")))

    # ── La cola ──────────────────────────────────────────────────────────
    #
    # La deriva en flecha que sale del final del cono y sostiene arriba la caja
    # del rotor de cola. Es gruesa —por dentro va el eje que mueve el rotor—,
    # así que no es un ala de canto sino un pilón de esquinas redondas. Va en
    # el material `cola`, el verde de la flota sobre el que el juego dibuja el
    # sol; empieza donde acaba la franja, como en la muestra.
    piezas.append(deriva("deriva", DERIVA))
    piezas += sol_de_la_deriva()
    # Un solo estabilizador, a la izquierda: a la derecha va el rotor de cola.
    piezas.append(superficie("estabilizador", [
        de_ala(-0.20, 0.75, 8.40, 0.95, 0.12, 0.0, -2.0),
        de_ala(-2.55, 0.75, 8.66, 0.68, 0.10, 0.0, -2.0),
    ], material_="casco", simetria=False, curvatura=0.0))
    # La aleta de debajo del cono, con el patín que protege el rotor de cola
    # si se toca el suelo de cola.
    piezas.append(superficie("aleta-ventral", [
        estacion((0, -0.02, 7.21), 1.62, 0.07, (0, 0, 1), (-1, 0, 0)),
        estacion((0, -0.62, 7.76), 1.27, 0.08, (0, 0.165, 1), (-1, 0, 0)),
    ], material_="casco", simetria=False))
    piezas.append(varillas("patin-de-cola", [
        ((0, -0.42, 8.80), (0, -0.56, 9.35), 0.025),
        ((0, -0.56, 9.35), (0, -0.52, 9.55), 0.025),
    ], material_="gris"))

    # ── La librea, los cristales y lo pequeño ────────────────────────────
    librea(piezas)
    cristales(piezas)
    # ── La cabina por dentro: ver «La cabina por dentro», arriba ─────────
    cab = cabina(
        OJOS_Z, ancho=1.0, alto_panel=0.13, y_suelo=Y_SUELO,
        y_respaldo=Y_RESPALDO, plazas=PLAZAS, clase="helicoptero",
        # El tren se recoge: lleva su mando, como el cuadro plano sus luces.
        tren=True, hueco=hueco,
    )
    dentro = juntar_por_material(cab + cabina_por_dentro(OJOS_Z - 0.86),
                                 "interior", deja=se_busca_por_nombre)
    dentro_de(FUSELAJE, dentro)
    piezas += dentro
    piezas += puerta_corredera()
    piezas += grua()
    # Las antenas de cuchilla del lomo del cono y la del techo.
    bm = bmesh.new()
    for z in (6.28, 6.62):
        bloque(bm, (0, FUSELAJE.arriba(z) + 0.05, z), (0.012, 0.06, 0.07))
    bloque(bm, (0, 1.10, 1.20), (0.012, 0.10, 0.12))
    bloque(bm, (0.0, FUSELAJE.abajo(-4.20) - 0.07, -4.20), (0.012, 0.08, 0.10))
    piezas.append(malla_de("antenas", bm, "rotor"))
    # Las juntas que se ven de lejos: donde el cono se atornilla a la cabina, y
    # las tapas de registro de los motores y de la caja a los lados del lomo. Rayas finas, como las puertas: dicen
    # «esto está hecho de piezas» sin ensuciar la librea.
    bm = bmesh.new()
    for z in (3.30,):
        vuelta = 48
        a = [bm.verts.new(FUSELAJE.punto(z - 0.011, math.tau * i / vuelta,
                                         0.012)) for i in range(vuelta)]
        b = [bm.verts.new(FUSELAJE.punto(z + 0.011, math.tau * i / vuelta,
                                         0.012)) for i in range(vuelta)]
        for i in range(vuelta):
            j = (i + 1) % vuelta
            bm.faces.new((a[i], a[j], b[j], b[i]))
    _orientar(bm, FUSELAJE)
    piezas.append(liso(_malla_en_escena("juntas-del-cono", bm, ["oscuro"]),
                       angulo=80))
    piezas.append(contorno("tapas-del-lomo", LOMO, -1.35, 1.32, 0.42, 1.05,
                           radio=0.06, grueso=0.016, fuera=0.010))
    piezas.append(contorno("tapas-de-la-caja", LOMO, 0.70, 1.45, 0.50, 1.30,
                           radio=0.08, grueso=0.016, fuera=0.010))
    # Los dos tubos de Pitot a los lados del morro, apuntando al frente. Los
    # limpiaparabrisas no: sobre un cristal opaco y oscuro solo se leían como
    # rayas claras sueltas, y de verdad son negros.
    tubos = []
    for lado in (-1, 1):
        base = FUSELAJE.en(-4.70, -0.20, lado, 0.0)
        punta = base + Vector((0.0, 0.0, -0.32))
        tubos.append((tuple(base), tuple(punta), 0.014))
    piezas.append(varillas("pitot", tubos, material_="rotor", lados=6))

    # ── Los rotores y el tren ────────────────────────────────────────────
    piezas += rotor_principal()
    piezas += rotor_de_cola()
    patas = tren()
    # Metidas, las ruedas quedan dentro del fuselaje y de los sponsons. Con
    # ocho centímetros de holgura: el canto redondeado del sponson muerde el
    # hombro del neumático de fuera, y el juego deja de dibujar la pata en
    # cuanto está dentro del todo (`world/patas.ts`).
    recogido([p for p in patas if p.name.startswith("bisagra-")
              and "tapa" not in p.name],
             [p for p in piezas if p.type == "MESH"
              and p.name in ("fuselaje", "sponson")], tolerancia=0.09)
    piezas += patas

    piezas.append(centro_de_gravedad(0.0, 0.0))
    return piezas


def en_la_deriva(z, y, lado, fuera=0.0):
    """
    El punto del costado de la deriva a esa altura y esa distancia a lo largo.

    Entre dos anillos la piel es la mezcla lineal de los dos —cada vértice va
    en línea recta al de arriba—, así que basta con mezclar sus medidas.
    """
    for (ya, za, zb, ba), (yb, zc, zd, bb) in zip(DERIVA, DERIVA[1:]):
        if y <= yb:
            break
    k = max(0.0, min(1.0, (y - ya) / (yb - ya)))
    ataque = za + (zc - za) * k
    salida = zb + (zd - zb) * k
    b = ba + (bb - ba) * k
    a = (salida - ataque) / 2
    u = min(1.0, abs(z - (ataque + salida) / 2) / a)
    x = b * (1 - u ** N_DERIVA) ** (1 / N_DERIVA)
    return Vector((lado * (x + fuera), y, z)), ataque, salida


def sol_de_la_deriva():
    """
    El sol que nace en la base de la deriva, como en la muestra: un disco ocre
    cuyo centro queda por debajo del cono, así que de él solo asoma el trozo
    que cae en el pie de la deriva, recortado por su borde de ataque, por el
    de salida y por abajo. Lo separa del verde un filete del crema del casco,
    que es como la casa despega el ocre del verde (ver `librea.ts`).

    Va por filas de abajo arriba: en cada altura, de dónde a dónde cae el
    disco en la cuerda. Así el arco sale redondo y no en escalera.
    """
    centro_z, centro_y = 8.04, -0.39
    radio, filete = 0.88, 0.95
    y_pie = DERIVA[0][0]
    salen = []
    for nombre, material_, r0, r1 in (("sol-de-la-deriva", "ocre", None, radio),
                                     ("filete-del-sol", "casco", radio, filete)):
        bm = bmesh.new()
        for lado in (-1, 1):
            filas = []
            pasos = 18
            alto = centro_y + r1
            for k in range(pasos + 1):
                y = y_pie + (alto - y_pie) * k / pasos
                _, ataque, salida = en_la_deriva(8.3, y, lado)

                def borde(r):
                    d = r * r - (y - centro_y) ** 2
                    return centro_z + math.sqrt(d) if d > 0 else None

                fin = borde(r1)
                if fin is None:
                    continue
                ini = ataque if r0 is None else (borde(r0) or ataque)
                ini, fin = max(ini, ataque), min(fin, salida)
                if fin - ini < 0.005:
                    continue
                fila = [bm.verts.new(en_la_deriva(
                    ini + (fin - ini) * j / 6, y, lado, 0.012)[0])
                    for j in range(7)]
                filas.append(fila)
            for a, b in zip(filas, filas[1:]):
                for j in range(6):
                    bm.faces.new((a[j], a[j + 1], b[j + 1], b[j]))
        bm.normal_update()
        for f in bm.faces:
            c = f.calc_center_median()
            if f.normal.x * c.x < 0:
                f.normal_flip()
        salen.append(liso(_malla_en_escena(nombre, bm, [material_]),
                          angulo=80))
    return salen


def deriva(nombre, anillos, n=N_DERIVA, lados=24):
    """
    Un pilón de esquinas redondas tendido entre anillos horizontales:
    `(y, borde de ataque, borde de salida, medio grueso)`.

    **A alturas exactas**, como una deriva de las de `superficie`: el juego
    agrupa por altura los vértices de la cola para saber dónde está su borde de
    ataque y dónde el de salida, y coloca el sol en esas fracciones. Ver
    `perfilDe` en `src/world/librea.ts`.
    """
    bm = bmesh.new()
    vueltas = []
    for y, za, zb, b in anillos:
        a = (zb - za) / 2
        zc = (za + zb) / 2
        vuelta = []
        for i in range(lados):
            t = math.tau * i / lados
            s, c = math.sin(t), math.cos(t)
            x = math.copysign(abs(s) ** (2 / n), s) * b
            z = zc + math.copysign(abs(c) ** (2 / n), c) * a
            vuelta.append(bm.verts.new((x, y, z)))
        vueltas.append(vuelta)
    for va, vb in zip(vueltas, vueltas[1:]):
        for i in range(lados):
            j = (i + 1) % lados
            bm.faces.new((va[i], va[j], vb[j], vb[i]))
    bm.faces.new(list(reversed(vueltas[0])))
    bm.faces.new(vueltas[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return liso(_malla_en_escena(nombre, bm, ["cola"]), angulo=50)


exportar(construir(), SALIDA, DIAMETRO, largo=LARGO, rotores=[
    dict(eje="rotor-principal", diametro=DIAMETRO, palas=4,
         mastil=(0.0, math.cos(MASTIL), -math.sin(MASTIL))),
    dict(eje="rotor-de-cola", diametro=2 * RADIO_COLA, palas=5,
         mastil=(1.0, 0.0, 0.0)),
])
