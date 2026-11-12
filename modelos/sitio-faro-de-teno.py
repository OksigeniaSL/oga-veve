"""
El faro de Punta de Teno, como sitio con modelo: `public/assets/sitios/faro-de-teno.glb`.

Dos piezas, una al lado de la otra, y las dos son de verdad:

- **La torre de 1978**, de hormigón, cilíndrica y de 20 m (en.wikipedia,
  «Punta de Teno Lighthouse»). Desde abajo, como se ve en «Faro de Teno -
  Tenerife 03» (H. Zell), que es la única de las fotos en la que la roca no
  tapa el pie: un zócalo blanco, las franjas roja, blanca y roja, el fuste
  blanco con dos galerías con barandilla, la linterna, la cúpula blanca y la
  veleta. Las otras fotos empiezan en la franja roja de abajo porque el pie
  queda detrás de la roca. Los montantes en triángulo de la linterna, las
  ventanas de las franjas, la puerta de la galería y el panel solar no
  están: no se ven desde el aire y de las ventanas no se sabe a dónde dan.
- **La luz**, a 17,75 m del suelo en el modelo; la ficha del faro dice que
  su señal está a 20 m del suelo y a 59,6 sobre el mar. La diferencia es la
  del pie: en las fotos la roca lo tapa, y aquí se mide del suelo de la foto
  del camino. El suelo del juego en la punta, el del MDT05 a veinte metros,
  queda más bajo que el de verdad, y la luz sale a unos 44 m sobre el mar.
- **El faro de 1897**, pegado al oeste: una casa encalada de una planta en
  torno a un patio, con las esquinas, los marcos y la cornisa de piedra
  volcánica oscura, y en el centro de su fachada oeste la torre de piedra sin
  pintar, de 7,62 m, con su linterna octogonal de 1,8 m (es.wikipedia, «Faro
  de Punta de Teno»). OpenStreetMap solo trae la torre nueva (vía 570082211):
  la planta de la casa está medida sobre la ortofoto PNOA, y la torre vieja en
  el centro de la fachada sale de «Faro de punta Teno» (Yerie2017), tomada
  desde la pasarela del oeste.

**Las medidas** están sacadas de las fotos contra los 20 m de la torre, del
suelo a la veleta, con su margen: el fuste, de 2,8 m, sale 7,3 veces en el
alto; las galerías, de 4,2; la linterna, de 2,3, que es casi lo que da la
ficha del faro, 2,4. La luz, en el centro de la linterna, a 17,75 m del suelo.

**El suelo** es el parche fino de Punta de Teno (`data/terrain/parches/teno.bin`,
MDT05 a veinte metros), leído aquí para dos cosas: dónde empieza cada pared
—con su falda de treinta metros por debajo, que el suelo dibujado no es el
medido al metro— y contra qué se calcula la oclusión.

**El color**, en los vértices y en lineal, con la oclusión ambiente cocida:
rayos desde cada esquina de cada cara contra el modelo y ese suelo, sin sol.

Uso, sin ventana y con el candado de Blender:

    flock ~/Downloads/arte-local/blender.lock blender -t 8 -b --python modelos/sitio-faro-de-teno.py
"""

import bpy
import json
import math
import os
import struct
from mathutils import Vector
from mathutils.bvhtree import BVHTree

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "public", "assets", "sitios", "faro-de-teno.glb")

# El origen: la torre nueva, en las coordenadas de la Wikipedia (las de
# `data/sitios/sitios.json`). A metro y medio del centro del círculo de OSM.
LAT0, LON0 = 28.342096, -16.922865
R_TIERRA = 6371008.0
RAD = math.pi / 180

# Lo que baja todo lo que toca el suelo. Ver `data/sitios/README.md`.
FALDA = -30.0

# ── El suelo del parche ──────────────────────────────────────────────────


def leer_parche():
    carpeta = os.path.join(RAIZ, "data", "terrain", "parches")
    with open(os.path.join(carpeta, "teno.json"), encoding="utf8") as f:
        ficha = json.load(f)
    with open(os.path.join(carpeta, "teno.bin"), "rb") as f:
        crudo = f.read()
    n = ficha["filas"] * ficha["columnas"]
    datos = struct.unpack(f"<{n}h", crudo[: 2 * n])
    return ficha, datos


FICHA, DATOS = leer_parche()


def cota_medida(lat, lon):
    """La misma bilineal que `cotaDelParche` en `parches-de-relieve.ts`."""
    f = FICHA
    fy = (f["norte"] - lat) / (f["norte"] - f["sur"]) * (f["filas"] - 1)
    fx = (lon - f["oeste"]) / (f["este"] - f["oeste"]) * (f["columnas"] - 1)
    y0 = min(f["filas"] - 2, int(math.floor(fy)))
    x0 = min(f["columnas"] - 2, int(math.floor(fx)))
    ty, tx = fy - y0, fx - x0
    c = f["columnas"]
    h = lambda y, x: DATOS[y * c + x]
    return (h(y0, x0) * (1 - tx) + h(y0, x0 + 1) * tx) * (1 - ty) + (
        h(y0 + 1, x0) * (1 - tx) + h(y0 + 1, x0 + 1) * tx
    ) * ty


COTA0 = cota_medida(LAT0, LON0)


def suelo(x, y):
    """El suelo bajo (x, y) —este y norte en metros—, sobre el del origen."""
    lat = LAT0 + y / (R_TIERRA * RAD)
    lon = LON0 + x / (R_TIERRA * RAD * math.cos(LAT0 * RAD))
    return cota_medida(lat, lon) - COTA0


# ── Colores, en sRGB como se miran; se pasan a lineal al pintar ──────────

COLORES = {
    "blanco": (0.92, 0.92, 0.90),
    "rojo": (0.78, 0.16, 0.15),
    "cristal": (0.20, 0.27, 0.32),
    "barandilla": (0.80, 0.81, 0.82),
    "oscuro": (0.16, 0.16, 0.16),
    # La piedra volcánica sin pintar de la torre vieja y de los detalles.
    "piedra": (0.33, 0.31, 0.29),
    # La azotea, gris en la ortofoto.
    "azotea": (0.60, 0.60, 0.58),
    # La cúpula de la linterna vieja, de cobre verdeado en las fotos.
    "cobre": (0.36, 0.52, 0.46),
}


def lineal(c):
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


# ── La malla, en listas: vértices, caras y su color ──────────────────────

V = []  # (x, y, z)
CARAS = []  # (índices, color, liso)


def vert(p):
    V.append((float(p[0]), float(p[1]), float(p[2])))
    return len(V) - 1


def cara(idx, color, liso=False):
    CARAS.append((tuple(idx), color, liso))


def anillo(cx, cy, r, z, lados, fase=0.0):
    return [
        vert((cx + r * math.cos(fase + 2 * math.pi * i / lados), cy + r * math.sin(fase + 2 * math.pi * i / lados), z))
        for i in range(lados)
    ]


def costado(a, b, color, liso=True):
    """Las caras entre dos anillos del mismo número de lados, hacia fuera."""
    n = len(a)
    for i in range(n):
        j = (i + 1) % n
        cara((a[i], a[j], b[j], b[i]), color, liso)


def tapa(a, color, arriba=True):
    """Un polígono convexo en abanico desde su centro, mirando arriba o abajo."""
    cx = sum(V[i][0] for i in a) / len(a)
    cy = sum(V[i][1] for i in a) / len(a)
    c = vert((cx, cy, V[a[0]][2]))
    n = len(a)
    for i in range(n):
        j = (i + 1) % n
        cara((c, a[i], a[j]) if arriba else (c, a[j], a[i]), color)


def corona(dentro, fuera, color, arriba=True):
    """El anillo plano entre dos anillos concéntricos a la misma altura."""
    n = len(dentro)
    for i in range(n):
        j = (i + 1) % n
        q = (dentro[i], fuera[i], fuera[j], dentro[j])
        cara(q if arriba else tuple(reversed(q)), color)


def cilindro(cx, cy, tramos, lados, fase=0.0, liso=True):
    """
    Un fuste por tramos: `tramos` es [(z, r, color del tramo que empieza ahí)],
    de abajo arriba; el color del último no se usa.
    """
    anillos = [anillo(cx, cy, r, z, lados, fase) for z, r, _ in tramos]
    for k in range(len(tramos) - 1):
        costado(anillos[k], anillos[k + 1], tramos[k][2], liso)
    return anillos


def caja(x0, x1, y0, y1, z0, z1, color, abajo=True, girar=None):
    """Una caja recta; `girar` lleva sus esquinas a donde toque."""
    pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    if girar:
        pts = [girar(*p) for p in pts]
    a = [vert((x, y, z0)) for x, y in pts]
    b = [vert((x, y, z1)) for x, y in pts]
    for i in range(4):
        j = (i + 1) % 4
        cara((a[i], a[j], b[j], b[i]), color)
    cara(tuple(b), color)
    if abajo:
        cara(tuple(reversed(a)), color)


def pared(p, q, filas, columnas, colores):
    """
    Una pared vertical de `p` a `q` (en planta, con el exterior a su derecha
    yendo de p a q), partida en `filas` alturas y `columnas` fracciones del
    largo. `colores(fila, columna)` dice el color de cada trozo; las alturas
    pueden depender del punto: `filas` es una lista de funciones (x, y) -> z.
    """
    puntos = [
        (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t) for t in columnas
    ]
    rejilla = [[vert((x, y, f(x, y))) for x, y in puntos] for f in filas]
    for i in range(len(filas) - 1):
        for j in range(len(puntos) - 1):
            a, b = rejilla[i][j], rejilla[i][j + 1]
            c, d = rejilla[i + 1][j + 1], rejilla[i + 1][j]
            cara((a, b, c, d), colores(i, j))


# ── La torre de 1978 ─────────────────────────────────────────────────────

LADOS = 16
R_FUSTE = 1.4
R_GALERIA = 2.1
LUZ = 17.75  # el centro de la linterna; lo mismo que `luz.altura` en sitios.json


def torre_nueva():
    # El fuste, con la falda, el zócalo y las tres franjas. El anillo a 0,8 m
    # es para que la oclusión del pie se quede en el pie.
    cilindro(
        0,
        0,
        [
            (FALDA, R_FUSTE, "blanco"),
            (0.0, R_FUSTE, "blanco"),
            (0.8, R_FUSTE, "blanco"),
            (5.4, R_FUSTE, "rojo"),
            (8.2, R_FUSTE, "blanco"),
            (11.0, R_FUSTE, "rojo"),
            (13.7, R_FUSTE, None),
        ],
        LADOS,
    )
    # La galería de abajo: el vuelo que sale del fuste, el canto y el suelo.
    galeria(13.7, 14.0, 14.3, R_GALERIA)
    # El fuste de arriba, blanco, con la puerta a la galería.
    cilindro(0, 0, [(14.3, R_FUSTE, "blanco"), (15.6, R_FUSTE, None)], LADOS)
    galeria(15.6, 16.1, 16.5, 2.05)
    # La peana de la linterna, la linterna y la cúpula.
    peana = cilindro(0, 0, [(16.5, 1.2, "blanco"), (17.3, 1.2, None)], LADOS)
    vidrio = cilindro(0, 0, [(17.3, 1.15, "cristal"), (18.2, 1.15, None)], LADOS)
    corona(vidrio[0], peana[-1], "blanco")
    domo = cilindro(
        0,
        0,
        [(18.2, 1.25, "blanco"), (18.55, 1.1, "blanco"), (18.8, 0.7, "blanco"), (18.9, 0.3, None)],
        LADOS,
    )
    # El vuelo de la cúpula sobre el cristal, que se ve desde abajo.
    corona(vidrio[-1], domo[0], "blanco", arriba=False)
    # El remate y la veleta.
    remate = cilindro(0, 0, [(18.9, 0.25, "blanco"), (19.3, 0.25, None)], LADOS)
    corona(remate[0], domo[-1], "blanco")
    tapa(remate[-1], "blanco")
    caja(-0.03, 0.03, -0.03, 0.03, 19.3, 20.0, "oscuro", abajo=False)
    caja(-0.35, 0.35, -0.02, 0.02, 19.7, 19.85, "oscuro")
    # Las barandillas: un pasamanos cerrado y ocho montantes por galería.
    barandilla(14.3, 15.3, R_GALERIA - 0.08)
    barandilla(16.5, 17.4, 2.05 - 0.08)


def galeria(z_vuelo, z_canto, z_suelo, r):
    anillos = cilindro(
        0, 0, [(z_vuelo, R_FUSTE, "blanco"), (z_canto, r, "blanco"), (z_suelo, r, None)], LADOS
    )
    dentro = anillo(0, 0, R_FUSTE, z_suelo, LADOS)
    corona(dentro, anillos[-1], "blanco")


def barandilla(z0, z1, r):
    for i in range(8):
        a = 2 * math.pi * (i + 0.5) / 8
        x, y = r * math.cos(a), r * math.sin(a)
        caja(x - 0.03, x + 0.03, y - 0.03, y + 0.03, z0, z1 - 0.05, "barandilla", abajo=False)
    fuera = anillo(0, 0, r + 0.03, z1 - 0.06, LADOS)
    fuera_arriba = anillo(0, 0, r + 0.03, z1, LADOS)
    dentro = anillo(0, 0, r - 0.03, z1 - 0.06, LADOS)
    dentro_arriba = anillo(0, 0, r - 0.03, z1, LADOS)
    costado(fuera, fuera_arriba, "barandilla", liso=False)
    costado(dentro_arriba, dentro, "barandilla", liso=False)
    corona(dentro_arriba, fuera_arriba, "barandilla")
    corona(dentro, fuera, "barandilla", arriba=False)


# ── El faro de 1897 ──────────────────────────────────────────────────────

# La casa, medida sobre la ortofoto PNOA: 15,8 m de este a oeste y 14,1 de
# norte a sur en su propio marco, girada veinte grados a la izquierda del
# norte, con el centro a 13,8 m al oeste y 4,6 al sur de la torre nueva.
CASA = {"x": -13.76, "y": -4.6, "ancho": 15.8, "fondo": 14.1, "giro": 20.0}
# El patio, de 6 × 4,3 m y no en el centro: corrido 1,1 m al oeste y 1,45 al norte.
PATIO = {"x": -1.1, "y": 1.45, "ancho": 6.0, "fondo": 4.3}
# Los altos: la pared hasta la cornisa, la cornisa y el pretil.
PARED, CORNISA, PRETIL = 3.3, 3.55, 3.9
ESQUINA = 0.45  # el ancho de la piedra de las esquinas, a cada lado


def en_la_casa(u, v):
    g = CASA["giro"] * RAD
    return (
        CASA["x"] + u * math.cos(g) - v * math.sin(g),
        CASA["y"] + u * math.sin(g) + v * math.cos(g),
    )


def casa_vieja():
    # La cota de la casa: la del suelo medido en su centro. Por donde el suelo
    # baja, asoma un zócalo de piedra, que es el muro que la asienta.
    h0 = suelo(CASA["x"], CASA["y"])
    a, f = CASA["ancho"] / 2, CASA["fondo"] / 2
    # Los rectángulos, en sentido antihorario visto desde arriba: SO, SE, NE, NO.
    # `pared` deja el exterior a la derecha del recorrido, así que el contorno
    # se recorre así y el patio, al revés.
    rect = lambda u0, u1, v0, v1: [en_la_casa(*p) for p in [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]]
    esquinas = rect(-a, a, -f, f)
    filas = [
        lambda x, y: FALDA,
        lambda x, y: min(h0, suelo(x, y)),
        lambda x, y: h0,
        lambda x, y: h0 + 0.8,
        lambda x, y: h0 + PARED,
        lambda x, y: h0 + CORNISA,
        lambda x, y: h0 + PRETIL,
    ]

    def color(fila, col):
        if fila <= 1:
            return "piedra"  # el muro que la asienta, donde el suelo baja
        if fila == 4:
            return "piedra"  # la cornisa
        if fila in (2, 3) and col in (0, 2):
            return "piedra"  # las esquinas
        return "blanco"

    for i in range(4):
        p, q = esquinas[i], esquinas[(i + 1) % 4]
        largo = math.dist(p, q)
        pared(p, q, filas, [0, ESQUINA / largo, 1 - ESQUINA / largo, 1], color)

    # El pretil por dentro, la azotea y el patio.
    dentro = rect(-a + 0.3, a - 0.3, -f + 0.3, f - 0.3)
    px, py = PATIO["x"], PATIO["y"]
    pa, pf = PATIO["ancho"] / 2, PATIO["fondo"] / 2
    patio = rect(px - pa, px + pa, py - pf, py + pf)
    arriba_fuera = [vert((x, y, h0 + PRETIL)) for x, y in esquinas]
    arriba_dentro = [vert((x, y, h0 + PRETIL)) for x, y in dentro]
    azotea_fuera = [vert((x, y, h0 + CORNISA)) for x, y in dentro]
    azotea_patio = [vert((x, y, h0 + CORNISA)) for x, y in patio]
    for i in range(4):
        j = (i + 1) % 4
        cara((arriba_fuera[i], arriba_fuera[j], arriba_dentro[j], arriba_dentro[i]), "blanco")
        cara((azotea_fuera[i], azotea_fuera[j], azotea_patio[j], azotea_patio[i]), "azotea")
    # La cara de dentro del pretil y las paredes del patio miran hacia dentro
    # de su rectángulo: se recorren en sentido horario.
    pretil = [lambda x, y: h0 + CORNISA, lambda x, y: h0 + PRETIL]
    filas_patio = [
        lambda x, y: FALDA,
        lambda x, y: h0,
        lambda x, y: h0 + 0.8,
        lambda x, y: h0 + CORNISA,
    ]
    for anillo_, alturas in ((dentro, pretil), (patio, filas_patio)):
        horario = list(reversed(anillo_))
        for i in range(4):
            pared(horario[i], horario[(i + 1) % 4], alturas, [0, 1], lambda fila, col: "blanco")

    # Las dos ventanas de la fachada oeste, a cada lado de la torre: el marco
    # de piedra y el hueco oscuro, un poco por delante de la pared.
    oeste = -a
    for v in (-3.8, 3.8):
        marco = lambda u, w: en_la_casa(u, w)
        caja(oeste - 0.08, oeste, v - 0.7, v + 0.7, h0 + 0.8, h0 + 2.9, "piedra", abajo=False, girar=marco)
        caja(oeste - 0.10, oeste - 0.08, v - 0.45, v + 0.45, h0 + 1.0, h0 + 2.65, "oscuro", abajo=False, girar=marco)

    torre_vieja(h0, oeste)
    return h0


def torre_vieja(h0, oeste):
    """La torre de piedra, de 2,4 m de lado, en el centro de la fachada oeste."""
    lado = 2.4
    u0 = oeste - lado / 2
    girar = lambda u, w: en_la_casa(u, w)
    # El fuste de piedra, en tres tramos: la falda, el pie y el resto. Sin la
    # cara del este, que queda dentro de la casa.
    pts = [girar(*p) for p in [(u0 - lado / 2, -lado / 2), (u0 + lado / 2, -lado / 2), (u0 + lado / 2, lado / 2), (u0 - lado / 2, lado / 2)]]
    filas = [lambda x, y: FALDA, lambda x, y: min(h0, suelo(x, y)), lambda x, y: h0 + 0.8, lambda x, y: h0 + 6.0]
    for i in (0, 2, 3):
        pared(pts[i], pts[(i + 1) % 4], filas, [0, 1], lambda fila, col: "piedra")
    # La cornisa que sostiene la linterna.
    caja(u0 - 1.4, u0 + 1.4, -1.4, 1.4, h0 + 6.0, h0 + 6.2, "piedra", girar=girar)
    # La linterna octogonal de 1,8 m, la cúpula de cobre y la veleta.
    cx, cy = girar(u0, 0)
    vidrio = cilindro(cx, cy, [(h0 + 6.2, 0.9, "cristal"), (h0 + 7.0, 0.9, None)], 8, fase=math.pi / 8, liso=False)
    domo = cilindro(
        cx, cy, [(h0 + 7.0, 0.95, "cobre"), (h0 + 7.35, 0.7, "cobre"), (h0 + 7.6, 0.12, None)], 8, fase=math.pi / 8
    )
    corona(vidrio[-1], domo[0], "cobre", arriba=False)
    tapa(domo[-1], "cobre")
    caja(cx - 0.02, cx + 0.02, cy - 0.02, cy + 0.02, h0 + 7.6, h0 + 8.0, "oscuro", abajo=False)


# ── La oclusión cocida ───────────────────────────────────────────────────


def normal_de(idx):
    p = [Vector(V[i]) for i in idx]
    n = Vector((0, 0, 0))
    for k in range(len(p)):
        a, b = p[k], p[(k + 1) % len(p)]
        n.x += (a.y - b.y) * (a.z + b.z)
        n.y += (a.z - b.z) * (a.x + b.x)
        n.z += (a.x - b.x) * (a.y + b.y)
    return n.normalized() if n.length > 1e-9 else Vector((0, 0, 1))


def direcciones(n=64):
    """Un hemisferio de direcciones repartidas a la Fibonacci, pesadas por el coseno."""
    salida = []
    oro = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        r = math.sqrt((i + 0.5) / n)
        a = i * oro
        salida.append(Vector((r * math.cos(a), r * math.sin(a), math.sqrt(max(0.0, 1 - r * r)))))
    return salida


def oclusion():
    """
    Cuánta luz del cielo llega a cada esquina de cada cara, de 0 a 1: rayos
    contra el modelo y contra el suelo del parche. Sin sol, que el del juego
    se mueve con la hora.
    """
    # El suelo para los rayos: el parche, en una rejilla de dos metros y medio.
    suelo_v, suelo_c = [], []
    xs = [-55 + 2.5 * i for i in range(37)]
    ys = [-40 + 2.5 * j for j in range(29)]
    for y in ys:
        for x in xs:
            suelo_v.append((x, y, suelo(x, y)))
    nx = len(xs)
    for j in range(len(ys) - 1):
        for i in range(nx - 1):
            a = j * nx + i
            suelo_c.append((a, a + 1, a + nx + 1, a + nx))
    base = len(V)
    arbol = BVHTree.FromPolygons(
        V + suelo_v, [c[0] for c in CARAS] + [tuple(base + k for k in q) for q in suelo_c]
    )
    # Las normales de las caras lisas, promediadas en cada vértice.
    normales = [normal_de(c[0]) for c in CARAS]
    en_vertice = {}
    for (idx, _, liso), n in zip(CARAS, normales):
        if liso:
            for i in idx:
                en_vertice[i] = en_vertice.get(i, Vector((0, 0, 0))) + n
    hemisferio = direcciones()
    cache = {}
    resultado = []
    for (idx, _, liso), n in zip(CARAS, normales):
        esquinas = []
        for i in idx:
            nn = en_vertice[i].normalized() if liso and i in en_vertice else n
            clave = (i, round(nn.x, 3), round(nn.y, 3), round(nn.z, 3))
            if clave not in cache:
                cache[clave] = luz_del_cielo(arbol, Vector(V[i]), nn, hemisferio)
            esquinas.append(cache[clave])
        resultado.append(esquinas)
    return resultado


def luz_del_cielo(arbol, p, n, hemisferio, lejos=8.0):
    if p.z < FALDA + 1:
        return 0.5
    t = Vector((1, 0, 0)) if abs(n.x) < 0.9 else Vector((0, 1, 0))
    b1 = n.cross(t).normalized()
    b2 = n.cross(b1)
    origen = p + n * 0.04
    libres = 0
    for d in hemisferio:
        rayo = b1 * d.x + b2 * d.y + n * d.z
        golpe, *_ = arbol.ray_cast(origen, rayo, lejos)
        if golpe is None:
            libres += 1
    return libres / len(hemisferio)


# ── A Blender y fuera ────────────────────────────────────────────────────


def a_blender(ao):
    malla = bpy.data.meshes.new("sitio")
    malla.from_pydata(V, [], [c[0] for c in CARAS])
    malla.update()
    for poli, (_, _, liso) in zip(malla.polygons, CARAS):
        poli.use_smooth = liso
    attr = malla.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    malla.color_attributes.active_color = attr
    k = 0
    for poli, (_, color, _), luces in zip(malla.polygons, CARAS, ao):
        base = lineal(COLORES[color])
        for esquina, cielo in zip(poli.loop_indices, luces):
            # Nunca negro del todo: lo que no ve el cielo ve el suelo y las paredes.
            f = 0.3 + 0.7 * cielo
            attr.data[esquina].color = (base[0] * f, base[1] * f, base[2] * f, 1.0)
            k += 1
    mat = bpy.data.materials.new("faro")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = 1.0
    bsdf.inputs["Metallic"].default_value = 0.0
    malla.materials.append(mat)
    obj = bpy.data.objects.new("sitio", malla)
    bpy.context.collection.objects.link(obj)
    return obj


def bulto(nombre, ancho, fondo, z0, z1, x, y, giro_grados):
    """Una caja de choque, recta en su marco y girada en el nudo."""
    malla = bpy.data.meshes.new(nombre)
    a, f = ancho / 2, fondo / 2
    vs = [(-a, -f, z0), (a, -f, z0), (a, f, z0), (-a, f, z0), (-a, -f, z1), (a, -f, z1), (a, f, z1), (-a, f, z1)]
    cs = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    malla.from_pydata(vs, [], cs)
    obj = bpy.data.objects.new(nombre, malla)
    obj.location = (x, y, 0)
    obj.rotation_euler = (0, 0, giro_grados * RAD)
    bpy.context.collection.objects.link(obj)
    return obj


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    torre_nueva()
    h0 = casa_vieja()
    ao = oclusion()
    a_blender(ao)
    bulto("bulto-torre", 2 * R_GALERIA, 2 * R_GALERIA, -5.0, 20.0, 0, 0, 0)
    bulto("bulto-casa", CASA["ancho"], CASA["fondo"], -5.0, h0 + PRETIL, CASA["x"], CASA["y"], CASA["giro"])
    tx, ty = en_la_casa(-CASA["ancho"] / 2 - 1.2, 0)
    bulto("bulto-torre-vieja", 2.8, 2.8, -5.0, h0 + 8.0, tx, ty, CASA["giro"])

    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=SALIDA,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_normals=True,
        export_texcoords=False,
        export_tangents=False,
        export_materials="EXPORT",
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=False,
        export_attributes=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_extras=False,
    )
    tris = sum(len(c[0]) - 2 for c in CARAS)
    xs = [v[0] for v in V]
    ys = [v[1] for v in V]
    zs = [v[2] for v in V if v[2] > FALDA + 1]
    print(f"PIEZAS: 1 malla y 3 bultos · triángulos: {tris} · luz a {LUZ} m · cota de la casa {h0:+.2f} m")
    print(
        f"MEDIDAS: ancho {max(xs) - min(xs):.2f} · alto {max(zs) - min(zs):.2f} · largo {max(ys) - min(ys):.2f}"
    )
    print(f"ESCRITO: {SALIDA}")


main()
