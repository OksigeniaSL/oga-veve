"""
Lo que comparten todos los aviones modelados en Blender.

Estaba todo dentro de `jaz-25-mainumby.py`, que fue el primero, y ahí estuvo
bien mientras fue el único. Con cuatro aviones más esperando modelo —y con #68
diciendo que «un avión nuevo tiene que ser una fila en una tabla»— copiarlo
cuatro veces sería garantizar que los cinco se desvíen: uno con el bisel a
0,012 y otro a 0,015, uno exportando con `export_yup` y otro sin él.

Lo que hay aquí es lo que **no** depende de qué avión se esté haciendo:

- **Los colores y los materiales**, con la conversión de sRGB a lineal y la
  cara de atrás quitada.
- **Las cuatro primitivas**: un perfil de revolución achatado, un ala, una caja
  y un cuadro con coordenadas de textura.
- **El suavizado**, que es lo que separa una maqueta de una caja.
- **La cabina**, que es igual en todos: suelo, panel, visera, dos pantallas y
  una silla. Cambian las medidas, no la anatomía.
- **La exportación**, con su comprobación de que el avión no sale de pie.

Uso, desde el guion de cada avión:

    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from comun import *

Y se ejecuta sin ventana:

    blender --background --python modelos/jaz-40-panambi.py
"""

import bpy
import bmesh
import math
import os
from mathutils import Matrix, Vector

# ── Colores ───────────────────────────────────────────────────────────────
#
# Uno por material y **color por vértice no**: un glTF con materiales separados
# se lee mejor en el juego, que ya sabe tratarlos, y permite que el cristal sea
# cristal.
#
# **Y quien manda no es esta tabla.** El color de cada avión vive en
# `src/flight/aircraft.ts` y el juego repinta el modelo al cargarlo —ver
# `pintarDeLaFlota` en `src/world/aeronave-modelo.ts`—, porque si el color
# viniera también en el `.glb` habría dos verdades. Esto es para que el fichero
# se vea bien en un visor cualquiera y para poder mirarlo en Blender.
#
# Van escritos como se escriben los colores, en sRGB, y se convierten a lineal
# antes de dárselos a Blender. El primer intento los metía tal cual y el avión
# salía descolorido: el terracota del capó llegaba al juego como un salmón y el
# verde oscuro de los detalles, como un gris. Lo oscuro es lo que más se
# levanta al confundir los dos espacios.
COLORES = {
    "casco": (0.89, 0.89, 0.85, 1.0),
    "capo": (0.75, 0.36, 0.22, 1.0),
    "detalle": (0.18, 0.32, 0.26, 1.0),
    "cristal": (0.11, 0.15, 0.18, 1.0),
    "goma": (0.09, 0.09, 0.10, 1.0),
    # Los de dentro. El salpicadero es gris oscuro mate y la tapicería un
    # cuero gastado: los dos tienen que quedarse **por debajo** del mundo que
    # se ve por el parabrisas, que es lo que se está mirando.
    "tablero": (0.15, 0.155, 0.17, 1.0),
    # **Y la visera, aparte y más oscura.** Iban las dos en `tablero`, y desde
    # el asiento el panel y su visera eran la misma losa gris sin canto: no se
    # leía dónde acaba lo de mirar fuera y empieza lo de mirar dentro. En un
    # avión de verdad la visera es negra y mate —para que el sol no rebote en
    # el parabrisas— y el panel, un gris algo más claro donde se recortan las
    # esferas.
    "visera": (0.05, 0.052, 0.058, 1.0),
    "tapiceria": (0.29, 0.23, 0.17, 1.0),
    # Y las dos pantallas del panel. El nombre no es libre: `pantallas-cabina.ts`
    # busca exactamente `g1000_display` para encenderlas.
    "g1000_display": (0.02, 0.03, 0.04, 1.0),
    # La chapa de un panel grande: algo más clara que el tablero, para que se
    # distingan las cajas del fondo y no sea todo una mancha negra.
    "chapa": (0.27, 0.28, 0.29, 1.0),
    # Y el aluminio de las palancas y los cuernos.
    "metal": (0.62, 0.63, 0.64, 1.0),
    # Las esferas de los relojes. **El nombre no es libre**: todo lo que empieza
    # por `reloj_` lo enciende `world/relojes-cabina.ts`, que le pinta encima su
    # escala y su aguja, y lo que va detrás del guion bajo dice **qué mide**.
    # El color solo se ve el instante antes de que el juego lo tape.
    "reloj_n1": (0.04, 0.05, 0.05, 1.0),
    "reloj_rpm": (0.04, 0.05, 0.05, 1.0),
    "reloj_par": (0.04, 0.05, 0.05, 1.0),
    "reloj_flaps": (0.04, 0.05, 0.05, 1.0),
    # Y los seis de vuelo, que es lo que lleva delante quien vuela un avión de
    # pistón: velocidad, actitud, altímetro, viraje, rumbo y variómetro. Ver
    # `six-pack.ts`, que dibuja estos mismos en el cuadro plano.
    "reloj_asi": (0.04, 0.05, 0.05, 1.0),
    "reloj_ai": (0.04, 0.05, 0.05, 1.0),
    "reloj_alt": (0.04, 0.05, 0.05, 1.0),
    "reloj_tc": (0.04, 0.05, 0.05, 1.0),
    "reloj_dg": (0.04, 0.05, 0.05, 1.0),
    "reloj_vsi": (0.04, 0.05, 0.05, 1.0),
    # Y los mandos que se pueden pulsar. **El nombre tampoco es libre**: lo que
    # se llame `boton-<qué>` lo enciende `world/botones-cabina.ts` y responde al
    # dedo, al ratón y a su tecla. Ver `boton`.
    "boton": (0.72, 0.36, 0.22, 1.0),
    # ── Lo que hace que la cabina sea un objeto y no una caja con relojes ──
    #
    # El bisel de cada instrumento: casi negro y satinado, que es lo que da el
    # canto de luz arriba y la sombra abajo que se ve en cualquier panel de
    # verdad. Es el «anillo mecanizado» del documento de cuadros de mando.
    "bisel": (0.07, 0.075, 0.082, 1.0),
    # La chapa sobre la que va el grupo de vuelo, un punto más clara que el
    # tablero: en una avioneta de verdad los seis relojes van en una placa
    # atornillada aparte, y esa placa es la que separa «lo que se lee» del resto.
    "subpanel": (0.25, 0.26, 0.28, 1.0),
    # Los tornillos, de acero: puntos de luz pequeños que dicen «esto está
    # montado», que es lo que distingue una pieza de un dibujo.
    "tornillo": (0.62, 0.63, 0.66, 1.0),
    # Los forros de los costados: plástico gris claro mate, como el de
    # cualquier avioneta. Más claros que el panel para que la cabina tenga
    # fondo, y más oscuros que el mundo para no competir con él.
    "forro": (0.40, 0.40, 0.39, 1.0),
    # Los pomos: negros y brillantes, que es como son en un avión de verdad
    # (el gas es negro; el rojo es de la mezcla, que aquí no se toca).
    "pomo": (0.05, 0.05, 0.055, 1.0),
    # El gris de Boeing: el de los paneles de techo, del pedestal y del panel
    # de modos de la visera en un avión de línea. En los reactores de verdad
    # el panel es gris claro, no negro.
    "gris_linea": (0.36, 0.39, 0.42, 1.0),
    # Las rotulaciones iluminadas por detrás: los rectángulos de los
    # interruptores del techo y de los mandos del pedestal. Blanco cálido y
    # tenue, porque en una cabina de verdad la retroiluminación es blanca y
    # los colores (verde, ámbar, rojo) se reservan para lo que avisa.
    "retro": (0.93, 0.88, 0.76, 1.0),
}

# El acabado de cada material del interior: rugosidad y metal. Todo lo que no
# está aquí sale con el acabado de siempre. Un interior todo del mismo mate es
# lo que lo hace parecer de plastilina: la visera es un mate profundo (para que
# no rebote el sol en el parabrisas, que es para lo que existe), los biseles y
# los pomos brillan un poco y los tornillos son de metal.
ACABADOS = {
    "visera": (0.95, 0.0),
    "tablero": (0.75, 0.0),
    "chapa": (0.7, 0.0),
    "subpanel": (0.6, 0.05),
    "bisel": (0.32, 0.25),
    "tornillo": (0.3, 0.9),
    "metal": (0.3, 0.85),
    "pomo": (0.22, 0.0),
    "forro": (0.85, 0.0),
    "tapiceria": (0.8, 0.0),
    "gris_linea": (0.65, 0.05),
    "boton": (0.4, 0.0),
}

# Lo que emite luz propia, y cuánta. **Es luz de verdad, no un truco**: una
# rotulación retroiluminada se ve igual de día que de noche, solo que de día el
# sol la tapa. Por eso va en el fichero y no en el juego, y por eso es tenue:
# de noche es lo único que se ve en el techo, como en un avión de verdad.
EMISION = {
    "retro": 0.35,
}


def srgb(color):
    """De sRGB a lineal, que es como Blender guarda un color de material."""

    def canal(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b, a = color
    return (canal(r), canal(g), canal(b), a)


def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(nombre):
    if nombre in bpy.data.materials:
        return bpy.data.materials[nombre]
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = srgb(COLORES[nombre])
    rugoso, metalico = ACABADOS.get(nombre, (0.55, 0.0))
    bsdf.inputs["Roughness"].default_value = rugoso
    bsdf.inputs["Metallic"].default_value = metalico
    if nombre in EMISION:
        bsdf.inputs["Emission Color"].default_value = srgb(COLORES[nombre])
        bsdf.inputs["Emission Strength"].default_value = EMISION[nombre]
    # **Y con la cara de atrás quitada**, que es lo que hace que se pueda ir
    # dentro del avión.
    #
    # Blender exporta un material a glTF como `doubleSided` mientras no se le
    # diga lo contrario, y un avión entero a doble cara **no tiene dentro**:
    # desde el asiento se veía la carlinga y el fuselaje por su cara interior,
    # una mancha oscura tapando el mundo entero. Con la cara de atrás quitada,
    # el casco y el cristal desaparecen desde dentro y queda lo que tiene que
    # quedar: el panel, la silla y el mundo por el parabrisas.
    m.use_backface_culling = True
    return m


def pintar(obj, nombre):
    obj.data.materials.append(material(nombre))
    return obj


def suavizar(obj, subdividir=1, biselar=0.012, angulo=40):
    """Lo que separa una maqueta de una caja: bisel, subdivisión y sombreado."""
    if biselar:
        b = obj.modifiers.new("bisel", "BEVEL")
        b.width = biselar
        b.segments = 2
        b.limit_method = "ANGLE"
        b.angle_limit = math.radians(30)
    if subdividir:
        s = obj.modifiers.new("sub", "SUBSURF")
        s.levels = subdividir
        s.render_levels = subdividir
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()
    # El sombreado por ángulo cambió de sitio en Blender 4.1: `use_auto_smooth`
    # desapareció de la malla y pasó a ser un modificador que pone un operador.
    # Se hacen las dos cosas porque este guion tiene que seguir corriendo con
    # la 4.0 que había instalada y con la 4.5 que trajo el MCP.
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(angulo)
    else:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angulo))
    return obj


def perfil(nombre, aros, material_="casco"):
    """
    Un cuerpo de revolución achatado, a partir de una lista de aros.

    Cada aro es `(z, ancho, alto, y)`. Es la misma idea que la fábrica del
    juego, pero aquí el resultado pasa por subdivisión, así que con ocho aros
    sale una superficie y no un prisma.
    """
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    lados = 12
    anillos = []
    for z, ancho, alto, y in aros:
        vs = []
        for i in range(lados):
            a = (i / lados) * math.tau
            vs.append(
                bm.verts.new((math.cos(a) * ancho / 2, y + math.sin(a) * alto / 2, z))
            )
        anillos.append(vs)
    for a, b in zip(anillos, anillos[1:]):
        for i in range(lados):
            j = (i + 1) % lados
            bm.faces.new((a[i], a[j], b[j], b[i]))
    # Las tapas, que es lo que cierra el avión: sin ellas se ve por dentro.
    bm.faces.new(list(reversed(anillos[0])))
    bm.faces.new(anillos[-1])
    bm.normal_update()
    bm.to_mesh(malla)
    bm.free()
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    return pintar(obj, material_)


def casquete(nombre, aros, desde=-55, hasta=55, fuera=0.03,
             material_="cristal", lados=10):
    """
    Un trozo de la piel, en un sector de ángulo, despegado un pelo hacia fuera.

    Lo que hace falta para poner un **parabrisas** y no una venda. Hasta ahora
    la carlinga se hacía con `perfil`: una copia del fuselaje algo más gorda y
    subida, en cristal, a ver si asomaba solo por arriba. Asomaba por arriba y
    por los costados y por debajo, y el resultado era que todos los aviones de
    la flota tenían **la cara negra** — un casco de buzo en vez de un morro.
    Se dijo con la palabra exacta: «los aviones deben parecer aviones, no
    supositorios gigantes».

    Un parabrisas de verdad ocupa un sector de arriba y nada más. Aquí se pide
    ese sector y se construye solo esa tira de superficie, separada `fuera`
    metros de la piel para que no pelee con ella en el búfer de profundidad.

    Los ángulos van en grados y **cero es arriba**, que es como se piensa un
    parabrisas: «de menos cincuenta y cinco a más cincuenta y cinco» es lo que
    se ve desde el asiento. Los aros son los mismos `(z, ancho, alto, y)` que
    come `perfil`, así que salen de la misma tabla que el fuselaje y no puede
    haber dos verdades sobre dónde está la piel.
    """
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    a0 = math.radians(desde)
    a1 = math.radians(hasta)
    anillos = []
    for z, ancho, alto, y in aros:
        vs = []
        for i in range(lados + 1):
            # Cero arriba y creciendo hacia el costado derecho, que es como se
            # describe un parabrisas. De ahí el seno en x y el coseno en y.
            a = a0 + (a1 - a0) * (i / lados)
            vs.append(
                bm.verts.new((
                    math.sin(a) * (ancho / 2 + fuera),
                    y + math.cos(a) * (alto / 2 + fuera),
                    z,
                ))
            )
        anillos.append(vs)
    for p, q in zip(anillos, anillos[1:]):
        for i in range(lados):
            bm.faces.new((p[i], p[i + 1], q[i + 1], q[i]))
    bm.normal_update()
    """
    **Y mirando hacia fuera.**

    Esto es una superficie abierta, así que el orden en que se escriben los
    cuatro vértices decide hacia dónde mira, y ese orden depende de por qué
    lado del avión se esté. Con la cara del revés el cristal sale **gris
    claro** en vez de oscuro —se ve la trasera, que en este proyecto va
    quitada— y el parabrisas parece una pegatina. Se arregla preguntándoselo a
    la geometría en vez de acertar el orden: si la normal apunta hacia el eje,
    se le da la vuelta.
    """
    for cara in bm.faces:
        centro = cara.calc_center_median()
        radial = Vector((centro.x, centro.y - aros[0][3], 0.0))
        if radial.length > 1e-6 and cara.normal.dot(radial.normalized()) < 0:
            cara.normal_flip()
    bm.normal_update()
    bm.to_mesh(malla)
    bm.free()
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    return pintar(obj, material_)


def parabrisas(nombre, aros, desde=24, hasta=84, fuera=0.03):
    """
    El parabrisas: dos casquetes, uno por costado, con su techo en medio.

    Dos y no uno, porque **un avión tiene techo**. Un solo sector centrado en
    la corona pondría cristal justo donde va la chapa del morro, que es lo que
    distingue una cabina de un casco de moto. Entre los dos queda una tira
    blanca de cuarenta y ocho grados: eso es el techo, y visto de lado es la
    línea que separa el parabrisas del lomo.

    Los ángulos se cuentan desde arriba, así que «de veinticuatro a ochenta y
    cuatro» quiere decir que el cristal empieza un poco por debajo de la
    corona y baja hasta casi el costado — que es donde acaba la ventanilla
    lateral del comandante. Ver `casquete`.
    """
    izq = casquete(f"{nombre}-i", aros, -hasta, -desde, fuera)
    der = casquete(f"{nombre}-d", aros, desde, hasta, fuera)
    bpy.ops.object.select_all(action="DESELECT")
    izq.select_set(True)
    der.select_set(True)
    bpy.context.view_layer.objects.active = izq
    bpy.ops.object.join()
    izq.name = nombre
    return izq


def ala(
    nombre,
    media_envergadura,
    cuerda_raiz,
    cuerda_punta,
    espesor,
    en,
    flecha=0.0,
    diedro=0.0,
    material_="casco",
):
    """
    Media ala, y la otra media por simetría.

    El modificador de simetría no es comodidad: es lo que garantiza que las dos
    mitades sean la misma para siempre. Un ala modelada dos veces se desvía.
    """
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()

    def perfil_ala(x, cuerda, grosor):
        # Cuatro puntos: borde de ataque afilado, panza plana, dorso curvo. La
        # subdivisión hace el resto.
        return [
            bm.verts.new((x, 0.0, -cuerda * 0.5)),
            bm.verts.new((x, grosor * 0.62, -cuerda * 0.12)),
            bm.verts.new((x, grosor * 0.12, cuerda * 0.5)),
            bm.verts.new((x, -grosor * 0.38, -cuerda * 0.1)),
        ]

    raiz = perfil_ala(0.0, cuerda_raiz, espesor)
    punta = [
        bm.verts.new(
            (
                media_envergadura,
                v.co.y + media_envergadura * math.tan(diedro),
                v.co.z * (cuerda_punta / cuerda_raiz) + flecha,
            )
        )
        for v in raiz
    ]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((raiz[i], raiz[j], punta[j], punta[i]))
    bm.faces.new(list(reversed(raiz)))
    bm.faces.new(punta)
    bm.normal_update()
    bm.to_mesh(malla)
    bm.free()
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    obj.location = Vector(en)
    m = obj.modifiers.new("simetria", "MIRROR")
    m.use_axis = (True, False, False)
    return pintar(obj, material_)


def caja(nombre, x0, x1, y0, y1, z0, z1, material_="tablero"):
    """Una caja recta, que es lo que es un salpicadero."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object
    o.name = nombre
    o.scale = ((x1 - x0), (y1 - y0), (z1 - z0))
    o.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    bpy.ops.object.transform_apply(location=True, scale=True)
    return pintar(o, material_)


def cuadro(nombre, ancho, alto, en, material_):
    """
    Un rectángulo plano mirando al piloto, **con coordenadas de textura**.

    Las pantallas del panel se pintan desde el juego sobre un lienzo, y eso
    necesita UV: sin ellas `estirarUV` se va de vacío y la pantalla se queda
    sin nada que enseñar. Un `bmesh` no las trae puestas, así que se ponen a
    mano — las cuatro esquinas del cuadrado, que es lo que hay.

    **Y puestas como las quiere el juego**, que no es como uno las pondría.
    `pantallas-cabina.ts` pinta el lienzo en espejo y además da la vuelta a las
    dos coordenadas al cargarlo. Con las UV «derechas» la pantalla salía girada
    media vuelta —el suelo arriba, el cielo abajo y los rótulos del revés—.
    Medido, no razonado: se pintaron las dos pantallas con lo mismo y con el
    espejo puesto en una sí y en la otra no.
    """
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    a, b = ancho / 2, alto / 2
    vs = [
        bm.verts.new((-a, -b, 0.0)),
        bm.verts.new((a, -b, 0.0)),
        bm.verts.new((a, b, 0.0)),
        bm.verts.new((-a, b, 0.0)),
    ]
    cara = bm.faces.new(vs)
    capa = bm.loops.layers.uv.new("UVMap")
    for bucle, uv in zip(cara.loops, [(0, 1), (1, 1), (1, 0), (0, 0)]):
        bucle[capa].uv = uv
    bm.normal_update()
    bm.to_mesh(malla)
    bm.free()
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    obj.location = Vector(en)
    return pintar(obj, material_)


def turbofan(nombre, en, largo, diametro, material_="capo"):
    """
    Una góndola de turbofán, con su cara de fan.

    Un turbofán moderno es **corto y gordo** —el diámetro es del orden de la
    mitad del largo—, y eso es justo lo que lo distingue de un turborreactor de
    los años sesenta, que era un tubo fino y largo. Es la silueta que hay que
    dar: el niño que cuenta motores debajo del ala también ve de qué tamaño
    son.

    La boca lleva un disco oscuro. Sin él la góndola se lee como un depósito:
    lo que dice «motor» es el agujero negro de delante.
    """
    piezas = []
    cuerpo = perfil(nombre, [
        (-largo * 0.50, diametro * 0.88, diametro * 0.88, 0.0),
        (-largo * 0.40, diametro * 1.00, diametro * 1.00, 0.0),
        (largo * 0.08, diametro * 0.98, diametro * 0.98, 0.0),
        (largo * 0.38, diametro * 0.78, diametro * 0.78, -diametro * 0.03),
        (largo * 0.50, diametro * 0.56, diametro * 0.56, -diametro * 0.05),
    ], material_)
    cuerpo.location = Vector(en)
    piezas.append(suavizar(cuerpo, subdividir=2, biselar=0))

    boca = perfil(f"{nombre}-fan", [
        (-largo * 0.47, diametro * 0.80, diametro * 0.80, 0.0),
        (-largo * 0.40, diametro * 0.78, diametro * 0.78, 0.0),
    ], "cristal")
    boca.location = Vector(en)
    piezas.append(suavizar(boca, subdividir=2, biselar=0))
    return piezas


def pilon(nombre, x, z0, z1, y0, y1, grosor=0.16, material_="casco"):
    """El pilón que cuelga un motor del ala. Una losa fina, que es lo que es."""
    return caja(nombre, x - grosor / 2, x + grosor / 2, y0, y1, z0, z1, material_)


def helice(nombre, en, radio, palas, buje=None):
    """
    Una hélice con su buje, mirando al frente.

    **Estaba copiada en tres guiones** —el biplano, el bimotor y el
    turbohélice— y las tres copias se habían desviado ya: una con dos palas
    superpuestas, otra con tres y otra con cuatro, y la del biplano con la
    mitad del diámetro que le toca. Es exactamente lo que este módulo existe
    para evitar.

    Tres cosas que no son libres:

    - **El nombre lleva «helice»**, que es por donde el juego la encuentra para
      hacerla girar. Ver `NOMBRES_DE_HELICE` en `aeronave-modelo.ts`.
    - **El cono mira al frente**, o sea a la Z negativa, y por eso va sin girar
      y con el radio pequeño delante. Girarlo noventa grados —que es lo que
      hacían los tres guiones— lo pone apuntando al suelo.
    - **Las palas cuelgan del buje con la inversa del padre.** Sin eso, la
      transformación del buje se les suma a la suya y se van a tomar el aire.

    Y las palas salen del buje **hacia fuera**, no de lado a lado: una barra
    que cruce el centro son dos palas, así que con tres salían seis y con dos
    salía una pintada encima de otra.
    """
    piezas = []
    gordo = buje if buje is not None else radio * 0.19
    bpy.ops.mesh.primitive_cone_add(
        vertices=12,
        radius1=gordo * 0.3,
        radius2=gordo,
        depth=gordo * 2.4,
        location=en,
    )
    cono = pintar(bpy.context.object, "capo")
    cono.name = nombre

    for i in range(palas):
        angulo = i * math.tau / palas
        bpy.ops.mesh.primitive_cube_add(size=1)
        pala = bpy.context.object
        pala.name = f"{nombre}-pala-{i}"
        pala.scale = (radio, radio * 0.15, radio * 0.042)
        pala.rotation_euler = (0, 0, angulo)
        pala.location = (
            en[0] + math.cos(angulo) * radio / 2,
            en[1] + math.sin(angulo) * radio / 2,
            en[2],
        )
        pala.parent = cono
        pala.matrix_parent_inverse = cono.matrix_world.inverted()
        piezas.append(suavizar(pintar(pala, "detalle"), subdividir=0, biselar=0.012))
    piezas.append(cono)
    return piezas


def ventanillas(piel_x, z_desde, z_hasta, cada, y_centro,
                alto=0.32, largo=0.34, grosor=0.03):
    """
    Una fila de ventanillas a cada costado.

    Lo que dice que un avión lleva gente. En un fuselaje curvo no hace falta
    recortar nada: basta una losa fina puesta **justo en la piel** —tres
    centímetros por fuera de ella— y asoma donde el costado es más estrecho que
    la losa, que es exactamente el contorno de la ventanilla. Es lo mismo que
    hace el parabrisas del Panambi con toda la sección.

    `piel_x` es el medio ancho del fuselaje ahí: si se pone de menos, las
    ventanillas se quedan dentro y no se ven.

    **Y salen todas en una sola pieza.** Un regional lleva ocho por costado y
    el de fuselaje ancho pasa de cincuenta: como objetos sueltos serían más
    nodos que el resto del avión entero y una llamada de dibujo cada uno, en un
    juego que tiene que abrir en una tablet. Unidas, son una malla con muchas
    caras, que es lo que la tarjeta sabe hacer barato.
    """
    partes = []
    cuantas = max(1, int(round((z_hasta - z_desde) / cada)) + 1)
    for lado in (-1, 1):
        for i in range(cuantas):
            z = z_desde + i * (z_hasta - z_desde) / max(1, cuantas - 1)
            x0, x1 = sorted((lado * piel_x, lado * (piel_x + grosor)))
            partes.append(
                caja(f"ventanilla-{'i' if lado < 0 else 'd'}-{i}",
                     x0, x1, y_centro - alto / 2, y_centro + alto / 2,
                     z - largo / 2, z + largo / 2, "cristal")
            )
    bpy.ops.object.select_all(action="DESELECT")
    for p in partes:
        p.select_set(True)
    bpy.context.view_layer.objects.active = partes[0]
    bpy.ops.object.join()
    partes[0].name = "ventanillas"
    return [partes[0]]


def franja(nombre, aro, z_desde, z_hasta, y_centro, alto,
           material_="capo", grosor=0.04, paso=0.6):
    """
    Una franja de color a lo largo del costado: la **línea de cintura**.

    Es la pieza que faltaba y la que explica la queja que la destapó: «los
    aviones siguen pareciendo supositorios gigantes». Y es verdad, y no era la
    forma: las proporciones están bien —esbeltez de siete a diez y media, que
    es la de un avión de verdad— y los aros afinan por los dos extremos. Lo que
    fallaba es que el costado era **liso y de un solo color** de punta a punta,
    y un cuerpo de revolución liso y monocolor se lee como una cápsula por
    bien proporcionado que esté.

    Ninguna compañía del mundo pinta un avión de un solo color: todas llevan
    una banda a la altura de las ventanillas, y es por lo mismo que aquí —
    porque un tubo blanco no parece nada. También sirve para algo que este
    juego sí necesita: da **referencia de actitud** desde fuera, que es cómo se
    ve si el avión va con el morro arriba cuando la cámara va detrás.

    Se hace con el mismo truco que `ventanillas`: una piel fina pegada por
    fuera del casco, siguiendo los aros, que asoma donde el costado se estrecha.
    `aro(z)` es la función que cada avión ya tiene para saber cuánto mide su
    fuselaje ahí.
    """
    malla = bpy.data.meshes.new(nombre)
    bm = bmesh.new()
    cuantos = max(2, int((z_hasta - z_desde) / paso) + 1)
    anillos = []
    for i in range(cuantos):
        z = z_desde + i * (z_hasta - z_desde) / (cuantos - 1)
        ancho, altoAro, y = aro(z)
        for lado in (-1, 1):
            pass
        anillos.append((z, ancho, altoAro, y))
    caras = []
    for lado in (-1, 1):
        borde = []
        for (z, ancho, altoAro, y) in anillos:
            # El costado a la altura de la franja: la elipse resuelta en x.
            dy = (y_centro - y) / max(altoAro / 2, 1e-6)
            dy = max(-0.999, min(0.999, dy))
            x = (ancho / 2 + grosor) * math.sqrt(1 - dy * dy)
            arriba = bm.verts.new((lado * x, y_centro + alto / 2, z))
            abajo = bm.verts.new((lado * x, y_centro - alto / 2, z))
            borde.append((arriba, abajo))
        for a, b in zip(borde, borde[1:]):
            caras.append((a[0], a[1], b[1], b[0]) if lado > 0
                         else (b[0], b[1], a[1], a[0]))
    for c in caras:
        try:
            bm.faces.new(c)
        except ValueError:
            pass
    bm.normal_update()
    bm.to_mesh(malla)
    bm.free()
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    return pintar(obj, material_)


def puerta(nombre, aro, z, y_centro, alto=1.75, ancho=0.80,
           material_="detalle", grosor=0.035):
    """
    Una puerta de pasaje: el rectángulo alto del costado delantero.

    Va por el mismo procedimiento que la franja y las ventanillas —una piel
    fina pegada por fuera— y está por lo mismo: **da escala**. Un tubo sin
    puerta no dice de qué tamaño es; con ella, cualquiera sabe al instante si
    lo que mira es una avioneta o un avión de línea, porque una puerta mide lo
    que mide una persona y eso no hay que explicarlo.
    """
    a, h, y = aro(z)
    dy = (y_centro - y) / max(h / 2, 1e-6)
    dy = max(-0.999, min(0.999, dy))
    x = (a / 2 + grosor) * math.sqrt(1 - dy * dy)
    piezas = []
    for lado in (-1, 1):
        x0, x1 = sorted((lado * x, lado * (x + grosor)))
        piezas.append(
            caja(f"{nombre}-{'i' if lado < 0 else 'd'}",
                 x0, x1, y_centro - alto / 2, y_centro + alto / 2,
                 z - ancho / 2, z + ancho / 2, material_)
        )
    bpy.ops.object.select_all(action="DESELECT")
    for p in piezas:
        p.select_set(True)
    bpy.context.view_layer.objects.active = piezas[0]
    bpy.ops.object.join()
    piezas[0].name = nombre
    return [piezas[0]]


# Un cuarto de vuelta en X: lo que pone de pie un cilindro. Ver `cilindro`.
DE_PIE = (math.radians(90), 0, 0)


def cilindro(nombre, radio, largo, en, material_="detalle", lados=8,
             giro=DE_PIE):
    """
    Un cilindro: un montante, una pata, una palanca, un pilón.

    **De pie por omisión, y ahí estaba el fallo.** Blender crea sus cilindros a
    lo largo de **su** Z, y aquí se modela con la Y hacia arriba —ver
    `aBlender`—, así que un cilindro recién creado sale tumbado **a lo largo
    del fuselaje**. Todo lo que en estos cinco aviones tenía que estar de pie no
    lo estaba: los montantes entre alas del biplano, sus cabañas, las patas de
    los trenes de los cinco y hasta la palanca de la cabina.

    Medido en el `.glb` del biplano, en coordenadas de mundo y con las
    transformaciones de los nodos aplicadas: los once cilindros daban 9 cm de
    ancho, 9 de alto y **1,84 m de largo**. Un montante de ala a ala convertido
    en una varilla apuntando al morro.

    No se vio antes porque medir la caja de la malla **en local** dice que sí
    está de pie: la que engaña es esa, porque el nodo lleva encima el giro de la
    escena entera. Lo caza `exportar`, que ahora mira el mundo.
    """
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=lados, radius=radio, depth=largo, location=en
    )
    o = bpy.context.object
    o.name = nombre
    if giro:
        o.rotation_euler = giro
    return pintar(o, material_)


def montante(x, z, y0, y1, grosor=0.045, material_="detalle"):
    """Un montante vertical entre dos alturas. Redondo, que es lo que es."""
    return cilindro(
        f"montante-{x:.2f}-{z:.2f}",
        grosor,
        abs(y1 - y0),
        (x, (y0 + y1) / 2, z),
        material_,
    )


def puntal(desde, hasta, grosor=0.05, material_="detalle"):
    """
    Una barra entre dos puntos cualesquiera, con la inclinación que salga.

    **`montante` solo sabe ponerse de pie**, y hay cosas que no van de pie: el
    arriostramiento del ala de una avioneta de ala alta sale del costado bajo
    del fuselaje y sube en diagonal hasta media envergadura. Modelado con
    montantes verticales, lo que se veía era un avión encima de dos patas de
    mesa — «con esas patas, como mesa para la barbacoa quedaría curioso».

    Se orienta llevando el eje del cilindro —que aquí, con la Y arriba, es la Y
    después del giro de `cilindro`— sobre el vector que une los dos puntos.
    """
    d = Vector(hasta) - Vector(desde)
    largo = d.length
    medio = (Vector(desde) + Vector(hasta)) / 2
    o = cilindro(
        f"puntal-{desde[0]:.2f}-{desde[2]:.2f}", grosor, largo, tuple(medio),
        material_, giro=None,
    )
    # El cilindro nace a lo largo de la Z de Blender; se gira para que su eje
    # caiga sobre la diagonal que une los dos puntos.
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return o


# ── Las piezas con forma del interior ─────────────────────────────────────
#
# La cabina estaba hecha solo de `caja` y `cilindro`, y desde el asiento eso
# se veía exactamente así: «una cabina de mandos de juguete». Lo que separa un
# panel de verdad de una caja con relojes no es la cantidad de cosas, es que
# **nada tiene el canto vivo**: la visera tiene el borde redondo, los relojes
# van hundidos en un bisel atornillado, las pantallas tienen marco. Estas
# cuatro funciones son lo que hace falta para eso y nada más.
#
# Todas modelan en los ejes del juego —x a lo ancho, y arriba, z hacia la
# cola—, como `caja`. `aBlender` gira el conjunto al final.


def solido(nombre, verts, caras, material_, suave=None):
    """
    Una malla cerrada hecha a mano, con las normales hacia fuera.

    **Hacia fuera de verdad**, porque todo material va sin cara de atrás —ver
    `material`— y una cara vuelta del revés no se ve: se ve el hueco. Se
    recalculan con `bmesh` en vez de cuidar el orden de cada cara a mano, que
    es lo que se equivoca.

    `suave`: el ángulo, en grados, por debajo del cual la arista se sombrea
    suave. Para lo que tiene curvas (la visera, los biseles): así el canto
    redondo se ve redondo y las esquinas de verdad siguen siendo esquinas.
    """
    malla = bpy.data.meshes.new(nombre)
    malla.from_pydata(verts, [], caras)
    malla.update()
    bm = bmesh.new()
    bm.from_mesh(malla)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(malla)
    bm.free()
    if suave:
        for p in malla.polygons:
            p.use_smooth = True
        if hasattr(malla, "set_sharp_from_angle"):
            malla.set_sharp_from_angle(angle=math.radians(suave))
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    return pintar(obj, material_)


def barrido(nombre, perfil_, xs, material_, curvar=None, suave=35,
            a_lo_largo=False):
    """
    Un perfil cerrado arrastrado a lo ancho: una visera, un reborde, un alféizar.

    `perfil_` son puntos `(y, z)` de la sección, en orden alrededor de ella;
    `xs`, dónde se corta a lo ancho. `curvar(x, y, z) -> (y, z)` deforma cada
    sección según su x, que es lo que da a la visera su borde en arco.

    Con `a_lo_largo` se arrastra a lo largo del avión: el perfil es `(x, y)` y
    `xs` son posiciones en z. Es lo que hace falta para el alféizar de una
    ventanilla, que corre hacia la cola.
    """
    n = len(perfil_)
    verts = []
    for x in xs:
        for y, z in perfil_:
            if curvar:
                y, z = curvar(x, y, z)
            verts.append((y, z, x) if a_lo_largo else (x, y, z))
    caras = []
    for i in range(len(xs) - 1):
        for k in range(n):
            caras.append((
                i * n + k, i * n + (k + 1) % n,
                (i + 1) * n + (k + 1) % n, (i + 1) * n + k,
            ))
    caras.append(tuple(range(n)))
    caras.append(tuple((len(xs) - 1) * n + k for k in range(n)))
    return solido(nombre, verts, caras, material_, suave)


def aro(nombre, centro, r_in, r_out, perfil_, material_, lados=24,
        cuadrado=True):
    """
    Un bisel: redondo por dentro y, por fuera, un cuadrado de esquinas romas.

    Es la forma de la caja de un instrumento de avión, que es cuadrada con el
    cristal redondo: se atornilla al panel por las cuatro esquinas. Y sirve
    además para algo que no es de estética: **tapa las esquinas de la esfera**,
    que es un cuadrado pintado. Sin él, cada reloj era un cuadrado oscuro con un
    círculo dentro, y se veían los cuadrados.

    `perfil_` son puntos `(t, dz)` de la sección: `t` va de 0 en el borde de
    dentro a 1 en el de fuera, y `dz` es hacia el piloto desde `centro`. Se
    cierra solo: el último punto se cose con el primero.
    """
    cx, cy, cz = centro
    n = len(perfil_)
    verts = []
    for j in range(lados):
        a = 2 * math.pi * j / lados
        c, s = math.cos(a), math.sin(a)
        # Un superelipse de grado cuatro: un cuadrado con las esquinas romas.
        r = r_out / ((abs(c) ** 4 + abs(s) ** 4) ** 0.25) if cuadrado else r_out
        for t, dz in perfil_:
            rr = r_in + (r - r_in) * t
            verts.append((cx + rr * c, cy + rr * s, cz + dz))
    caras = []
    for j in range(lados):
        for k in range(n):
            caras.append((
                j * n + k, j * n + (k + 1) % n,
                ((j + 1) % lados) * n + (k + 1) % n, ((j + 1) % lados) * n + k,
            ))
    return solido(nombre, verts, caras, material_, suave=50)


def marco(nombre, centro, ancho, alto, borde, fondo, material_):
    """
    El marco de una pantalla: un rectángulo con un hueco del tamaño del cristal.

    Una pantalla pegada al tablero sin marco es una pegatina, y así se veían
    las del G1000 y las de los reactores. El hueco es **exactamente** el
    cristal: lo que pinta el juego llega hasta el borde (las cintas de
    velocidad y altura van pegadas a los lados), y un marco que montara encima
    se comería los números.
    """
    cx, cy, cz = centro
    a, b = ancho / 2, alto / 2
    A, B = a + borde, b + borde
    anillo = []
    for (x, y, X, Y) in ((-a, -b, -A, -B), (a, -b, A, -B), (a, b, A, B),
                         (-a, b, -A, B)):
        anillo.append(((x, y), (X, Y)))
    verts = []
    # Cuatro vueltas: dentro-detrás, dentro-delante, fuera-delante,
    # fuera-detrás. Dentro-delante va un milímetro hacia fuera: el chaflán que
    # coge la luz.
    for (x, y), (X, Y) in anillo:
        verts += [
            (cx + x, cy + y, cz - fondo),
            (cx + x * 1.0, cy + y * 1.0, cz + fondo * 0.6),
            (cx + (x + (X - x) * 0.35), cy + (y + (Y - y) * 0.35), cz + fondo),
            (cx + X, cy + Y, cz + fondo * 0.4),
            (cx + X, cy + Y, cz - fondo),
        ]
    n = 5
    caras = []
    for j in range(4):
        for k in range(n):
            caras.append((
                j * n + k, j * n + (k + 1) % n,
                ((j + 1) % 4) * n + (k + 1) % n, ((j + 1) % 4) * n + k,
            ))
    return solido(nombre, verts, caras, material_)


def tornillos(nombre, puntos, radio=0.0032, material_="tornillo"):
    """
    Cabezas de tornillo, todas en una sola malla mirando al piloto.

    **En una sola**, por rendimiento: son cuatro por instrumento y veintitantos
    por avión, y cada malla suelta es una llamada de dibujo más en la tablet del
    colegio. Juntas cuestan lo que una.
    """
    bm = bmesh.new()
    for x, y, z in puntos:
        bmesh.ops.create_cone(
            bm, cap_ends=True, cap_tris=False, segments=6, radius1=radio,
            radius2=radio * 0.75, depth=radio * 0.9,
            matrix=Matrix.Translation((x, y, z + radio * 0.45)),
        )
    malla = bpy.data.meshes.new(nombre)
    bm.to_mesh(malla)
    bm.free()
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    return pintar(obj, material_)


def redondear(obj, radio=0.008, segmentos=2):
    """
    El canto roto de una caja, sin subdividirla.

    `suavizar` también bisela, pero subdivide y suaviza la malla entera, que es
    lo que se quiere en un fuselaje y no en un tablero: el tablero tiene que
    seguir siendo plano, solo sin el canto de cuchillo.
    """
    b = obj.modifiers.new("canto", "BEVEL")
    b.width = radio
    b.segments = segmentos
    b.limit_method = "ANGLE"
    b.angle_limit = math.radians(40)
    return obj


def _visera(medio_ancho, arriba, grosor, z_delante, z_labio, arco):
    """
    La visera: una ceja con el borde redondo y en arco.

    Era una losa: un rectángulo negro con el canto vivo, que desde el asiento
    se leía como una tapa puesta encima de una caja. En un avión de verdad la
    visera tiene el labio redondeado —es lo que se agarra al entrar y lo que
    no corta— y en planta es un arco que abraza al piloto, que es por lo que
    se reconoce en una foto antes que ninguna otra cosa del panel.

    **El arco se abre hacia delante en los extremos, no hacia el piloto en el
    centro.** El labio está a sesenta y cinco centímetros de los ojos, y el
    plano cercano de la cámara a sesenta: una visera que se acercara en el
    centro se recortaría justo delante de la cara.

    Y la raya de arriba sigue donde estaba —`arriba` y `z_delante` son los de
    la caja de antes—, que es la que mide `encuadreDeCabina` para decidir
    cuánto se ve por el parabrisas.
    """
    g = grosor
    yc, zc = arriba - g / 2, z_labio - g / 2
    perfil_ = [(arriba - g * 0.45, z_delante), (arriba, z_delante + 0.015)]
    for grados in (0, 30, 60, 90, 120, 150, 180):
        a = math.radians(grados)
        perfil_.append((yc + g / 2 * math.cos(a), zc + g / 2 * math.sin(a)))
    perfil_.append((arriba - g, z_delante + 0.03))
    pasos = 16
    xs = [-medio_ancho + 2 * medio_ancho * i / pasos for i in range(pasos + 1)]

    def curvar(x, y, z):
        if z <= z_delante + 0.02:
            return y, z
        f = (x / medio_ancho) ** 2
        return y, z - arco * f

    return barrido("visera", perfil_, xs, "visera", curvar, suave=40)


def _costados(ancho, y_suelo, alto, panel_z, ojos_z, atras=0.40):
    """
    Los dos costados de la cabina: su forro y el alféizar de la ventanilla.

    Sin ellos, desde el asiento el panel flotaba: a los lados se veía el
    fuselaje por dentro —o el mundo, que con la cara de atrás quitada es lo
    mismo— y la cabina era un mueble suelto en el aire. En un avión de verdad
    el panel **se apoya** en los costados, y el alféizar sigue la línea de la
    visera hacia atrás: es la raya que dice dónde acaba el avión y empieza la
    ventanilla.

    `alto` es la altura del alféizar: la del borde del panel, que es donde
    está en cualquier avioneta —por debajo, la puerta; por encima, cristal—.
    """
    piezas = []
    z0, z1 = panel_z - 0.10, ojos_z + atras
    for lado in (-1, 1):
        x_dentro = lado * (ancho - 0.004)
        x_fuera = lado * (ancho + 0.02)
        piezas.append(
            caja(f"forro-{lado}", min(x_dentro, x_fuera), max(x_dentro, x_fuera),
                 y_suelo + 0.02, alto - 0.03, z0, z1, "forro")
        )
        # El alféizar: un canto redondo encima del forro, que es lo que coge
        # la luz y dibuja la raya.
        r = 0.024
        xc = lado * (ancho - 0.004 + 0.006)
        perfil_ = [
            (xc + r * math.cos(math.radians(g)),
             alto - 0.03 + r * 0.6 * math.sin(math.radians(g)))
            for g in range(0, 360, 30)
        ]
        piezas.append(
            barrido(f"alfeizar-{lado}", perfil_, [z0, z1], "tablero",
                    a_lo_largo=True)
        )
    return piezas


def asiento_de_una_pieza(nombre, z_atras, medio_ancho=0.24, largo=0.40,
                         y_cojin=0.34, alto_cojin=0.08, y_respaldo=0.88,
                         material_="tapiceria"):
    """
    El cojín y el respaldo, unidos.

    **En una sola pieza**, que no es un capricho.  `ojoDePiloto` busca el
    asiento **más adelantado** y pone los ojos en el borde de arriba de su
    caja. Con el cojín y el respaldo como dos objetos, el más adelantado era el
    cojín y los ojos quedaban a su altura: el piloto sentado en el suelo, con
    el panel por encima de la cabeza. Unidos, el borde de arriba de la caja es
    el del respaldo, que es donde va la cabeza de quien va sentado.

    `z_atras` es el borde de atrás del cojín; el respaldo va a caballo del
    borde de delante, que es donde está en una silla.
    """
    x = medio_ancho
    cojin = caja(
        "cojin", -x, x, y_cojin, y_cojin + alto_cojin, z_atras, z_atras + largo,
        material_,
    )
    resp = caja(
        "respaldo", -x, x, y_cojin + alto_cojin, y_respaldo,
        z_atras + largo - 0.05, z_atras + largo + 0.05, material_,
    )
    bpy.ops.object.select_all(action="DESELECT")
    cojin.select_set(True)
    resp.select_set(True)
    bpy.context.view_layer.objects.active = cojin
    bpy.ops.object.join()
    cojin.name = nombre
    return cojin


def boton(que, ancho, alto, en, fondo=True):
    """
    Un mando que se puede pulsar de verdad: el contacto, los flaps, el freno.

    Pedido jugando: «quería también botones que poder pulsar, tanto con clic,
    tap como tecla». Las teclas ya estaban y los botones del HUD también; lo que
    faltaba era **el mando que está en la cabina**, que es donde lo busca quien
    se ha sentado ahí.

    El nombre manda: `boton-<qué>` con `qué` en {`motor`, `flaps`, `freno`}. El
    juego los busca por ese prefijo, los ilumina al pasar por encima y dispara
    la acción al soltar. Ver `world/botones-cabina.ts`.
    """
    x, y, z = en
    piezas = []
    if fondo:
        # El marco, como el de un interruptor de verdad: un rebaje con canto
        # que dice «esto se aprieta», en vez de una tecla pegada a la chapa.
        piezas.append(
            marco(f"boton-{que}-hueco", (x, y, z - 0.002), ancho * 1.06,
                  alto * 1.06, min(ancho, alto) * 0.14, 0.006, "bisel")
        )
    # Y la tecla con los cantos rotos. El dibujo lo pone el juego en la cara
    # que mira al piloto, midiendo la caja: el bisel no la cambia.
    piezas.append(
        redondear(
            caja(f"boton-{que}", x - ancho / 2, x + ancho / 2, y - alto / 2,
                 y + alto / 2, z - 0.004, z + 0.012, "boton"),
            radio=min(ancho, alto) * 0.1,
        )
    )
    return piezas


def reloj(nombre, que, radio, en, puntos=None):
    """
    Un instrumento redondo del panel: su caja y su esfera.

    La esfera es un cuadrado plano con material `reloj_<que>`, y eso es lo único
    que hace falta para que el juego la encienda: `world/relojes-cabina.ts` busca
    ese nombre, le da su propio lienzo y le pinta la escala, la aguja y el
    rótulo. `que` dice qué mide —`n1`, `rpm`, `par`, `flaps`— y de ahí sale el
    dibujo.

    **Antes eran cilindros lisos**, sin cara: octógonos grises en mitad del
    tablero que no decían nada. «Sólo con ver los cuadros de cabina me hago una
    idea de la respuesta.» Un instrumento que no marca no es un instrumento; es
    una pegatina.
    """
    x, y, z = en
    # **La esfera, hundida en su bisel.**
    #
    # Aquí había un cilindro gris detrás de la esfera, y cada reloj se veía
    # como lo que era: un cuadrado oscuro pegado a un disco. Un instrumento de
    # avión es una caja cuadrada atornillada al panel por las cuatro esquinas
    # con el cristal redondo hundido dentro, y eso es lo que se hace ahora.
    #
    # **El borde de dentro cae justo sobre el canto de la esfera** —el 99 % de
    # su radio— y no más adentro: lo que pinta el juego llega hasta ahí (los
    # arcos de colores van en el anillo de fuera) y un bisel más cerrado se
    # comería justo lo que dice si el motor va bien. Y va **cinco milímetros**
    # por delante de ella, no más: se mira desde arriba, y un bisel hondo tapa
    # con su canto de arriba la parte alta de la escala.
    #
    # Y sigue llamándose `<nombre>-caja`, que es como se llamaba: el encuadre de
    # la cabina mide todo lo que empieza por `reloj-`, así que el bisel cuenta
    # para que el reloj quepa entero en la pantalla, con su marco.
    fuera = radio * 1.2
    piezas = [
        aro(
            f"{nombre}-caja", (x, y, z), radio * 0.99, fuera,
            [(0.0, -0.004), (0.0, 0.003), (0.06, 0.005), (0.9, 0.0055),
             (1.0, 0.003), (1.0, -0.004)],
            "bisel",
        ),
        cuadro(f"{nombre}", radio * 2, radio * 2, (x, y, z), f"reloj_{que}"),
    ]
    if puntos is not None:
        # Las cuatro esquinas, donde van los tornillos de una caja de verdad.
        d = fuera * 0.74
        puntos += [(x + sx * d, y + sy * d, z + 0.0055)
                   for sx in (-1, 1) for sy in (-1, 1)]
    return piezas


def tubo(nombre, camino, radio, material_, lados=10, radios=None):
    """
    Un tubo que sigue un camino: el cuerno de un volante, un asa, una barandilla.

    El camino va en un plano de z constante —el de un volante, que mira al
    piloto—, así que cada sección se orienta con la tangente y el eje z, y no
    hace falta nada más fino que eso.
    """
    verts = []
    n = len(camino)
    for i, p in enumerate(camino):
        a = Vector(camino[max(0, i - 1)])
        b = Vector(camino[min(n - 1, i + 1)])
        t = (b - a).normalized()
        u = t.cross(Vector((0, 0, 1))).normalized()
        w = t.cross(u).normalized()
        for k in range(lados):
            ang = 2 * math.pi * k / lados
            rr = radios[i] if radios else radio
            q = Vector(p) + (u * math.cos(ang) + w * math.sin(ang)) * rr
            verts.append(tuple(q))
    caras = []
    for i in range(n - 1):
        for k in range(lados):
            caras.append((
                i * lados + k, i * lados + (k + 1) % lados,
                (i + 1) * lados + (k + 1) % lados, (i + 1) * lados + k,
            ))
    caras.append(tuple(range(lados)))
    caras.append(tuple((n - 1) * lados + k for k in range(lados)))
    return solido(nombre, verts, caras, material_, suave=60)


def _cuerno(x, y_suelo, panel_z, grande, y_centro=None, z_centro=None):
    """
    El volante de un piloto: la columna y el cuerno.

    Lo que se agarra en un avión de transporte y en casi cualquier avioneta.
    **En U, con los dos cuernos hacia arriba**, que es la forma que tiene y la
    que se reconoce: aquí había una tabla con dos tacos, y eso desde el asiento
    no se leía como un volante sino como un palo con una tabla.

    Y sale de donde sale en cada avión. En una avioneta el eje **atraviesa el
    panel** —se empuja y se tira de él—; en un avión de línea es una **columna
    que sube del suelo**. Las dos cosas se ven desde el asiento y las dos
    enseñan algo: que el morro se baja empujando.

    **Pegado al panel, no en el regazo.** Estaba a treinta centímetros del
    tablero, y eso lo metía dentro del plano cercano de la cámara —sesenta
    centímetros desde los ojos—: se recortaba entero y no se veía nunca. Un
    volante de verdad va a un palmo del panel, que es también donde se ve.
    """
    ancho = 0.34 if grande else 0.30
    w = ancho / 2
    z = z_centro if z_centro is not None else panel_z + (0.16 if grande else 0.13)
    yc = y_centro if y_centro is not None else y_suelo + (0.46 if grande else 0.34)
    r = 0.016 if grande else 0.013
    # La U: de la punta del cuerno izquierdo, abajo al centro y arriba al otro.
    camino = [
        (x - w, yc + 0.11, z), (x - w, yc + 0.06, z), (x - w * 0.97, yc + 0.02, z),
        (x - w * 0.86, yc - 0.012, z), (x - w * 0.6, yc - 0.03, z),
        (x - w * 0.25, yc - 0.035, z), (x + w * 0.25, yc - 0.035, z),
        (x + w * 0.6, yc - 0.03, z), (x + w * 0.86, yc - 0.012, z),
        (x + w * 0.97, yc + 0.02, z), (x + w, yc + 0.06, z), (x + w, yc + 0.11, z),
    ]
    piezas = [tubo(f"cuerno-{x:.2f}", camino, r, "metal")]
    # Las dos empuñaduras, negras y más gordas: es lo que se agarra.
    for lado in (-1, 1):
        # Redondeadas arriba, como un puño de verdad, y no cortadas a sierra.
        xg = x + lado * w
        piezas.append(
            tubo(f"cuerno-puno-{x:.2f}-{lado}",
                 [(xg, yc + 0.03, z), (xg, yc + 0.035, z), (xg, yc + 0.10, z),
                  (xg, yc + 0.115, z), (xg, yc + 0.124, z), (xg, yc + 0.128, z)],
                 r, "pomo",
                 radios=[r * 1.25, r * 1.5, r * 1.5, r * 1.3, r * 0.9, r * 0.3])
        )
    # El centro, donde el eje se une a la U.
    piezas.append(
        redondear(
            caja(f"cuerno-centro-{x:.2f}", x - 0.045, x + 0.045, yc - 0.055,
                 yc - 0.005, z - 0.02, z + 0.02, "tablero"),
            radio=0.008,
        )
    )
    if grande:
        # La columna, del suelo al centro del cuerno.
        alto = yc - 0.03 - y_suelo
        piezas.append(
            cilindro(f"palanca-columna-{x:.2f}", 0.035, alto,
                     (x, y_suelo + alto / 2, z - 0.01), "tablero", lados=12)
        )
    else:
        # El eje, que sale del panel.
        largo = z - panel_z
        piezas.append(
            cilindro(f"cuerno-eje-{x:.2f}", 0.014, largo,
                     (x, yc - 0.03, panel_z + largo / 2), "metal", lados=12,
                     giro=None)
        )
    return piezas


def _cabina_de_reactor(ojos_z, panel_z, ancho, alto_panel, y_suelo, plazas,
                       motores, relojes, pantallas, pantallas_en, mide="n1",
                       mandos=("motor", "flaps", "freno"), ojo_y=None):
    """
    La cabina de un avión de línea, que no es la de una avioneta estirada.

    Lo que la hace reconocible, y en este orden de importancia:

    1. **La visera**, profunda y de lado a lado. Es lo primero que se ve al
       sentarse y lo que da la sensación de ir metido dentro de algo grande.
    2. **Dos puestos iguales**, uno por piloto, cada uno con sus pantallas.
    3. **La columna de motores en el centro**: una fila de relojes por motor.
       En un cuatrimotor son cuatro columnas, y eso no lo tiene ningún otro
       avión del mundo — es *la* imagen de esta cabina.
    4. **El pedestal entre los dos asientos**, con las palancas de gas: una por
       motor, juntas, para poder llevarlas las cuatro con una mano.
    5. **El panel de techo**, con sus filas de interruptores.
    6. Y los montantes del parabrisas, que es lo que enmarca el mundo.

    Todo son cajas y cilindros: nada de esto se ve desde fuera y nada de esto
    se subdivide.
    """
    piezas = []
    ojos_y = y_suelo + 1.00
    # Los ojos de verdad, que no son los de arriba: aquéllos son la altura del
    # techo y éstos, la de la cara. Ver `ojoDePiloto`.
    ojo_y = ojo_y if ojo_y is not None else ojos_y
    ojo_z = ojos_z + 0.145
    borde = ancho + 0.02

    # 1. El panel y su visera.
    #
    # **El panel, gris; la visera, negra.** Un avión de línea de verdad no
    # tiene el panel negro: lo tiene gris azulado —el «gris Boeing»—, y sobre
    # él las pantallas negras se recortan solas. Negro sobre negro era la
    # «caja con relojes» de la que venía la queja.
    puntos = []
    piezas.append(
        redondear(
            caja("panel", -borde, borde, y_suelo + 0.30, alto_panel,
                 panel_z - 0.14, panel_z, "gris_linea"),
            radio=0.012,
        )
    )
    piezas.append(
        _visera(borde + 0.04, alto_panel + 0.07, 0.07, panel_z - 0.26,
                panel_z + 0.12, arco=0.10)
    )
    # El faldón de debajo del panel, para que no se vea el hueco hasta el suelo.
    piezas.append(
        caja("faldon", -borde, borde, y_suelo + 0.02, y_suelo + 0.30,
             panel_z - 0.10, panel_z - 0.04)
    )
    piezas += _costados(borde, y_suelo, alto_panel, panel_z, ojos_z, atras=0.6)
    piezas += _mcp(alto_panel, panel_z + 0.12, puntos)

    # 3. La columna de motores: **un reloj de régimen por motor**, encendido.
    #
    # **Va primero porque es la que manda.** Ocupa el centro del panel y las
    # pantallas de los pilotos se colocan a partir de donde ella acaba: puestas
    # antes, con una cuenta suya, los relojes del cuatrimotor se dibujaban
    # encima de la pantalla derecha del comandante.
    #
    # Y son los que son: **uno por motor y ninguno de adorno**. Aquí hubo una
    # rejilla de dieciséis discos grises sin cara —tres por motor más los que
    # sobraran— y lo que se veía desde el asiento eran manchas. Lo que se ve de
    # un motor en esta cabina es su N1, que es el mando con el que se vuela de
    # verdad; lo demás sería inventarse números que el juego no calcula.
    # **En bloque, no en fila.**
    #
    # Iban los cuatro en una sola fila centrada en el eje del fuselaje, y el eje
    # del fuselaje no es donde se sienta nadie: con cuatro motores la fila mide
    # sesenta y ocho centímetros, así que desde el asiento del comandante —a
    # treinta y dos a la izquierda— el cuarto reloj quedaba a sesenta y seis
    # centímetros de su cara hacia la derecha. Medido en pantalla con la sonda
    # `enPantalla`: el reloj del motor 4 caía en x 1.227…1.370 de un lienzo de
    # 1.280. Fuera del cuadro, literalmente.
    #
    # Y no es solo que se saliera: **en un avión de línea los regímenes de los
    # motores se leen juntos**, en un bloque, porque lo que se mira es si van
    # iguales. Cuatro agujas en fila de casi un metro no se comparan de un
    # vistazo; dos filas de dos, sí. Es como están en un EICAS de verdad.
    # **El EICAS, y no una rejilla de relojes.**
    #
    # Aquí había una fila de esferas redondas de N1, una por motor, y un reloj
    # de flaps debajo. Eso no lo lleva ningún avión de línea desde 1980: lo que
    # hay en el centro de una cabina de reactor es **una pantalla** con lo que
    # hacen los motores, la que miran los dos pilotos. Se dijo jugando, y con
    # razón: «que un 747 no parezca un juguete».
    #
    # Y hay un motivo además del parecido, el mismo que ya decía el comentario
    # de las dos filas: lo que se mira de cuatro motores no es cuánto da cada
    # uno, es **si dan lo mismo**. Cuatro cintas una al lado de otra se leen de
    # un vistazo; cuatro agujas hay que leerlas una por una, y por eso un EICAS
    # de verdad las pone en cintas.
    #
    # Aquí sólo va el cristal. Lo que se dibuja encima está en `pintarMotores`,
    # en `world/pantallas-cabina.ts`, y los flaps van dentro — que es donde se
    # miran: con el empuje, en la misma ojeada de la aproximación.
    # **Un solo juego de pantallas, y delante del comandante.**
    #
    # Aquí había dos puestos completos —dos pantallas por piloto— más el EICAS
    # en el eje del fuselaje, y desde el asiento eso se veía así: las del
    # copiloto cortadas por el canto derecho de la pantalla —medido,
    # `pantalla-1-1` de 1419 a 1681 en un cuadro de 1280— y el grupo entero
    # escorado, con 417 píxeles de negro a la izquierda. Con una brújula del
    # copiloto asomando a medias por el borde, que es lo que se ve en una
    # captura y lo que hizo decir «tú me estás vacilando».
    #
    # En un 747 de verdad eso es exactamente lo que ve el comandante, y está
    # bien: él tiene su puesto y el otro el suyo. Pero **aquí solo hay un
    # piloto y la cámara vive siempre en su asiento**, así que el puesto del
    # copiloto no es realismo: es media pantalla de instrumentos cortados que
    # se ven todos los vuelos y no sirven para nada.
    #
    # Así que el avión de línea lleva lo que lleva su comandante, en fila y
    # centrado en su cara: **actitud, navegación y motores**. Es el orden de
    # barrido real —de dentro hacia fuera— y es el mismo que el cuadro del HUD,
    # que es media lección del juego: lo que se aprende en una avioneta se lee
    # en un Boeing.
    #
    # *Desviación consciente:* en el avión de verdad el EICAS va entre los dos
    # asientos porque lo miran los dos. Aquí no hay dos.
    # **El tamaño sale de lo que cabe centrado en su cara, no al revés.**
    #
    # Es la regla de anclaje del cuadro del HUD, dicha entera: si el grupo no
    # cabe **se encoge lo de dentro; jamás se empuja el grupo a un lado**. Se
    # probó al revés —pantallas de treinta centímetros y luego arrimarlas al
    # borde del panel— y el resultado fue el de siempre: el comandante se
    # encontraba su grupo entero medio metro a la derecha de su cara. Medido
    # desde el asiento: 391 píxeles de sobra por la izquierda y 64 por la
    # derecha.
    #
    # Lo que cabe simétrico alrededor del asiento es lo que va del asiento al
    # costado más cercano, dos veces. En el de fuselaje ancho salen pantallas
    # de veintiún centímetros, que es más o menos lo que mide una de verdad en
    # un 747: las suyas son de veinte.
    hueco_p = 0.014
    cabe = 2 * (ancho - abs(plazas[0])) - 0.04
    ancho_p = max(0.14, min(0.30, (cabe - hueco_p * 2) / 3))
    grupo = ancho_p * 3 + hueco_p * 2
    borde = plazas[0] - grupo / 2
    alto_p = ancho_p * 0.86
    y_p = alto_panel - 0.035 - alto_p / 2
    for k, nombre in enumerate(("horizonte", "rumbo", "motores")):
        centro = (borde + ancho_p / 2 + k * (ancho_p + hueco_p), y_p,
                  panel_z + 0.006)
        piezas.append(
            cuadro(
                f"pantalla-{nombre}", ancho_p, alto_p, centro,
                "g1000_display" if pantallas else "cristal",
            )
        )
        # Cada pantalla en su caja, que es lo que es: una unidad que se
        # desmonta del panel, con su marco y sus cuatro tornillos.
        piezas.append(
            marco(f"pantalla-{nombre}-marco", centro, ancho_p, alto_p,
                  hueco_p * 0.45, 0.006, "bisel")
        )
    # Y el conjunto, en su bastidor: un marco ancho alrededor de las tres, que
    # es lo que las hace un puesto y no tres cuadros sueltos.
    ancho_g = ancho_p * 3 + hueco_p * 2
    piezas.append(
        marco("bastidor-de-pantallas", (borde + ancho_g / 2, y_p, panel_z + 0.004),
              ancho_g + hueco_p * 0.9, alto_p + hueco_p * 0.9, 0.018, 0.005,
              "bisel")
    )
    for sx in (-1, 1):
        for sy in (-1, 1):
            puntos.append((borde + ancho_g / 2 + sx * (ancho_g / 2 + 0.017),
                           y_p + sy * (alto_p / 2 + 0.017),
                           panel_z + 0.009))
    ancho_eicas = ancho_p
    _ = mide
    _ = relojes
    _ = pantallas_en

    # Y los tres mandos que se pulsan, en fila bajo la columna de motores: el
    # contacto, los flaps y el freno. Ver `boton`.
    #
    # **En el centro del panel y no a un lado.** Puestos a la derecha de la
    # columna de motores caían fuera de lo que ve el comandante —el ojo está en
    # su asiento, cuarenta y seis centímetros a la izquierda del eje— y no había
    # manera de pulsarlos: comprobado a barridos, ni un píxel de la pantalla los
    # tocaba. En el centro los alcanzan los dos pilotos, que es donde están los
    # mandos que comparten.
    # El tamaño sale del cristal del EICAS y no de un radio de reloj, que ya no
    # hay relojes: un botón es un dedo, y un dedo mide lo que mide.
    # Y **bajo las pantallas del comandante**, no en el eje del avión: es su
    # mano la que los pulsa, y el eje del avión no es donde se sienta nadie.
    # **Y la fila centrada en su cara, sean tres o cuatro.**
    #
    # El sitio del primero estaba escrito a mano —«uno y pico a la izquierda»—
    # y eso acierta con tres y falla con cuatro: al aparecer la palanca del
    # tren, la fila se corría a la derecha y el último quedaba fuera de lo que
    # se ve. Medido con `npm run botones`: el del tren no se alcanzaba con el
    # dedo en ninguno de los dos reactores.
    lado_boton = ancho_eicas * 0.22
    paso_boton = lado_boton * 1.15
    for i, que in enumerate(mandos):
        piezas += boton(
            que, lado_boton * 0.95, lado_boton * 0.75,
            (plazas[0] + (i - (len(mandos) - 1) / 2) * paso_boton,
             y_p - alto_p / 2 - lado_boton, panel_z + 0.008),
        )

    # La raya de lo que se lee: por debajo de ella, lo que va delante del
    # panel no tapa nada. Ver «Lo que va delante del panel» en `cabina`.
    y_linea = y_p - alto_p / 2 - lado_boton - lado_boton * 0.75 / 2 - 0.012
    baja = (ojo_y - y_linea) / (ojo_z - panel_z)

    def techo_en(z):
        return ojo_y - baja * (ojo_z - z)

    # 4. El pedestal, entre los dos asientos, con las palancas de gas.
    if motores:
        # **Entre los dos asientos**, que ya no es el eje del avión: con el
        # comandante puesto en el eje, el pedestal centrado ahí le quedaba
        # entre las piernas. Va donde va: en el hueco que dejan los dos.
        entre = (plazas[0] + plazas[-1]) / 2
        # Su tapa, **por debajo de la raya en su canto de delante**, que es
        # el que se ve más alto: por encima taparía la pantalla de motores.
        alto_pedestal = min(y_suelo + 0.30, techo_en(panel_z + 0.02) - 0.005)
        piezas.append(
            redondear(
                caja("pedestal", entre - 0.14, entre + 0.14, y_suelo + 0.02,
                     alto_pedestal, panel_z + 0.02, ojos_z + 0.10,
                     "gris_linea"),
                radio=0.025,
            )
        )
        # Las de gas, con sus pomos, justo detrás del canto de delante: es
        # lo que asoma por abajo cuando se mira el panel con la pantalla
        # ancha de un teléfono.
        z_l = panel_z + 0.14
        piezas += _palancas_de_gas(
            motores, entre, 0.24, alto_pedestal,
            max(alto_pedestal + 0.08, techo_en(z_l - 0.022)), z_l,
        )
        # Y las dos de siempre detrás: flaps y aerofrenos.
        for j, dz in enumerate((0.40, 0.50)):
            x = entre + (0.10 if j else -0.10)
            piezas.append(
                cilindro(
                    f"palanca-{'flaps' if j == 0 else 'frenos'}", 0.008, 0.12,
                    (x, alto_pedestal + 0.06, panel_z + dz), "metal", lados=8,
                )
            )
            piezas.append(
                redondear(
                    caja(f"pomo-{'flaps' if j == 0 else 'frenos'}",
                         x - 0.025, x + 0.025, alto_pedestal + 0.11,
                         alto_pedestal + 0.14, panel_z + dz - 0.015,
                         panel_z + dz + 0.015, "pomo"),
                    radio=0.008,
                )
            )

    # 5. El panel de techo. Es media cabina de un avión de línea, y es lo que
    #    un niño señala primero: filas y filas de interruptores.
    #
    #    **Y con sus rótulos encendidos**, que es como se ven de verdad: cada
    #    interruptor lleva debajo una placa iluminada por detrás. De noche es
    #    lo único que se ve del techo, y es de las imágenes más bonitas de una
    #    cabina. Todo en dos mallas —placas y palancas—, que son veintisiete
    #    de cada y sueltas serían cincuenta y cuatro llamadas de dibujo.
    techo = ojos_y + 0.34
    piezas.append(
        redondear(
            caja("panel-de-techo", -0.50, 0.50, techo, techo + 0.07,
                 ojos_z - 0.62, ojos_z + 0.12, "gris_linea"),
            radio=0.02,
        )
    )
    placas = bmesh.new()
    palancas_ = bmesh.new()
    for fila in range(3):
        for k in range(9):
            x = -0.40 + k * 0.10
            z = ojos_z - 0.52 + fila * 0.20
            bmesh.ops.create_cube(
                placas, size=1.0,
                matrix=Matrix.Translation((x, techo - 0.002, z + 0.075))
                @ Matrix.Diagonal((0.05, 0.004, 0.022, 1.0)),
            )
            bmesh.ops.create_cone(
                palancas_, cap_ends=True, segments=4, radius1=0.006,
                radius2=0.004, depth=0.03,
                matrix=Matrix.Translation((x, techo - 0.015, z + 0.03))
                @ Matrix.Rotation(math.radians(90), 4, "X"),
            )
    for bm_, nombre, mat in ((placas, "rotulos-de-techo", "retro"),
                             (palancas_, "interruptores-de-techo", "metal")):
        malla = bpy.data.meshes.new(nombre)
        bm_.to_mesh(malla)
        bm_.free()
        obj = bpy.data.objects.new(nombre, malla)
        bpy.context.collection.objects.link(obj)
        piezas.append(pintar(obj, mat))

    # 6. Los montantes del parabrisas, que enmarcan el mundo.
    #
    # **Con forma y con travesaño.** Eran dos vigas negras de sección
    # cuadrada, y desde el asiento se leían como dos palos puestos delante de
    # la cámara. Un montante de verdad es una pieza forrada, estrecha por
    # delante —para tapar poco— y unida arriba al marco del techo: con el
    # travesaño se lee como un parabrisas enmarcado y no como dos postes.
    for lado in (-1, 1):
        piezas.append(
            redondear(
                caja(
                    f"montante-parabrisas-{lado}", lado * 0.42 - 0.03,
                    lado * 0.42 + 0.03, alto_panel + 0.06, techo,
                    panel_z - 0.34, panel_z - 0.26, "forro",
                ),
                radio=0.022,
            )
        )
    piezas.append(
        redondear(
            caja("marco-de-techo", -0.46, 0.46, techo - 0.05, techo,
                 panel_z - 0.36, panel_z - 0.22, "forro"),
            radio=0.02,
        )
    )
    if puntos:
        piezas.append(tornillos("tornillos", puntos))
    # Y la raya, que la necesita el volante. Ver `cabina`.
    return piezas, y_linea


def _mcp(alto_panel, z_labio, puntos):
    """
    El panel de modos de la visera: donde un Boeing guarda lo que se quiere.

    Es la firma de una cabina de línea —la franja gris con ruedas en mitad de
    la visera negra— y es la misma que dibuja el cuadro plano con sus tres
    ventanillas. Aquí van **las ruedas y los rótulos, no las cifras**: unas
    ventanillas negras sin número serían instrumentos que no marcan, y eso en
    este juego no se pone. Las cifras están en el cuadro, que sí las lleva.

    Va en el labio de la visera, un centímetro por delante de él: más cerca
    de los ojos entraría en el plano cercano de la cámara.

    **Y en la mitad de arriba del labio, no colgando de él.** Está más cerca
    de los ojos que las pantallas, así que se ve más bajo de lo que está: con
    el canto de abajo a ras del panel tapaba el borde de arriba del PFD, las
    cifras de la cinta de velocidad incluidas.
    """
    piezas = []
    y0, y1 = alto_panel + 0.032, alto_panel + 0.066
    z0, z1 = z_labio - 0.03, z_labio + 0.01
    piezas.append(
        redondear(caja("mcp", -0.22, 0.22, y0, y1, z0, z1, "gris_linea"),
                  radio=0.005)
    )
    # Las tres ruedas —velocidad, rumbo, altura—, en el orden de siempre.
    for k, x in enumerate((-0.14, 0.0, 0.14)):
        piezas.append(
            redondear(
                cilindro(f"mcp-rueda-{k}", 0.01, 0.012,
                         (x, y0 + 0.013, z1 + 0.006), "pomo", lados=14,
                         giro=None),
                radio=0.003,
            )
        )
        # Y encima de cada rueda, su rótulo iluminado.
        piezas.append(
            caja(f"mcp-rotulo-{k}", x - 0.026, x + 0.026, y1 - 0.009,
                 y1 - 0.005, z1, z1 + 0.001, "retro")
        )
    puntos += [(sx * 0.21, (y0 + y1) / 2, z1) for sx in (-1, 1)]
    return piezas


def cabina(ojos_z, ancho=0.36, alto_panel=0.80, pantallas=True, plazas=(0.0,),
           suelo_atras=0.80, y_suelo=0.32, y_respaldo=0.88, pantallas_en=0.155,
           palancas=0, relojes=0, clase="avioneta", mando="cuerno",
           mide="rpm", tren=False):
    """
    Lo que se ve desde el asiento: suelo, panel, visera, pantallas y silla.

    **Hace falta porque si no el avión no tiene dentro.** Un modelo que es una
    carcasa cerrada con cristal ahumado deja la vista de cabina en el capó y el
    mundo y nada más: «JAZ 25 no tiene panel de mandos». Un avión sin panel por
    dentro no es una cabina, es una burbuja.

    Nada de esto se ve desde fuera —el cristal es oscuro— así que va contado en
    caras: son piezas rectas, sin subdividir.

    `ojos_z` es el borde de atrás del asiento del piloto, que es lo que decide
    dónde se sienta. **El panel cae cincuenta y ocho centímetros por delante de
    ahí, y no cuarenta**: el plano cercano de la cámara está a sesenta, así que
    un panel más cerca queda por delante de él y se recorta entero — se ve el
    mundo, el capó y ni rastro de la cabina, igual que cuando no había panel.
    En un avión de verdad el panel cae a un brazo estirado de la cara.

    `plazas` son las x de los asientos: `(0.0,)` es un fumigador, `(-0.32,
    0.32)` una cabina de dos pilotos. La primera es la del piloto y es la que
    lleva el nombre `asiento`.

    `clase` decide **qué muebles hay**, y ahí está lo que esto vino a arreglar.
    La primera versión era una sola cabina para los seis aviones, y al de
    fuselaje ancho se le estiraba la de la avioneta: un tablero negro liso, dos
    pantallitas y unos puntos sueltos. Visto desde el asiento no era una cabina
    de avión de línea, era una pared. «Esto es un despropósito de cabina de
    mandos impropia de un diseño hecho con cuidado; un B-747 no tiene esto así
    ni jarto de grifa.»

    - `"avioneta"`: panel plano, dos pantallas y sus relojes. Lo de siempre.
    - `"reactor"`: visera profunda de lado a lado, un puesto por piloto, la
      **columna de motores** en el centro —una fila de relojes por motor, que
      es lo que se mira de verdad en un avión de línea—, pedestal entre los dos
      asientos con sus palancas de gas, **panel de techo** con sus filas de
      interruptores y los montantes del parabrisas.

    `mando` es lo que se agarra: `"cuerno"` —el volante de un avión de
    transporte y de casi cualquier avioneta— o `"palanca"`, que es lo que lleva
    un fumigador. Iba una palanca de bastón en los seis, también en el
    cuatrimotor.

    `palancas` son las de gas del pedestal, una por motor, y `mide` dice qué
    marca el reloj de cada motor: `rpm` en un pistón, `par` en un turbohélice
    —cuya hélice gira a vueltas constantes, así que lo que cambia es la fuerza—
    y `n1` en un turbofán, que es el número con el que se vuela un avión de
    línea. Ver `reloj`.

    Dos nombres no son libres: **`asiento`**, porque `ojoDePiloto` lo busca por
    nombre, y **`g1000_display`**, que es lo que busca `pantallas-cabina.ts`.
    """
    piezas = []
    # Dónde van los tornillos de todo el panel: se juntan en una sola malla al
    # final. Ver `tornillos`.
    puntos = []
    panel_z = ojos_z - 0.58
    grande = clase == "reactor"
    #
    # ── **El piloto vuela en el eje del avión** ──
    #
    # Y es lo último que quedaba del «esto no está centrado». Los instrumentos
    # ya se centraban en su asiento, pero **el mueble no**: el panel, la visera,
    # los montantes del parabrisas, el panel de techo y el suelo se construyen
    # simétricos respecto al eje del fuselaje, y el piloto se sentaba treinta
    # centímetros a la izquierda de él. Desde ahí la cabina entera se ve
    # torcida: un montante cerca y el otro lejos, media plancha a un lado.
    # Dicho mirando las capturas: «descentradas las cabinas, no el cuadro de
    # mando».
    #
    # En un avión de verdad eso es así y está bien, porque a la derecha hay otro
    # señor sentado. **Aquí no lo hay**: hay un piloto y la cámara vive siempre
    # en su asiento. Así que las plazas se corren para que la primera —la suya—
    # caiga en el eje, y la segunda queda a su lado. Nada de esto se ve desde
    # fuera: el cristal es oscuro.
    #
    # Se hace aquí y no en los seis modelos para que la regla sea una sola, y
    # para que cada avión pueda seguir diciendo lo suyo —«hay dos plazas y están
    # a sesenta y ocho centímetros»—, que es lo que de verdad describe su cabina.
    if plazas:
        corrimiento = plazas[0]
        plazas = tuple(x - corrimiento for x in plazas)
        # **Y la de al lado, solo si cabe dentro.** Con el piloto en el eje, la
        # segunda plaza se corre hacia el costado lo mismo que se movió la
        # primera, y en las cabinas estrechas se salía: al rehacer los
        # fuselajes con su forma de verdad, el asiento y el cuerno de la
        # derecha asomaban por fuera de la piel entre cinco y veintiséis
        # centímetros en el entrenador, el bimotor y el turbohélice. Desde el
        # asiento del piloto esa plaza no se ve; desde fuera, atravesando el
        # avión, sí. La primera se queda siempre.
        plazas = plazas[:1] + tuple(
            x for x in plazas[1:] if abs(x) + 0.30 <= ancho
        )

    # Los mandos que se pulsan. **El del tren solo donde hay tren**: en un
    # entrenador de escuela esa palanca no existe, y un botón que se pulsa y no
    # hace nada enseña que los mandos son decoración. Ver `botones-cabina.ts`.
    mandos = ("motor", "flaps", "freno") + (("tren",) if tren else ())
    #
    # **La visera cae un palmo por debajo de los ojos. En todos.**
    #
    # `alto_panel` se escribió avión por avión y se fue de madre por los dos
    # lados: en el entrenador el borde del panel quedaba doce centímetros **por
    # encima** de los ojos —se veía tablero y un hilo de mundo— y en el
    # turbohélice, ocho por debajo, con lo que los relojes caían fuera de la
    # pantalla. Desde el asiento eso no son dos estilos de cabina: es una bien y
    # otra rota.
    #
    # En cualquier avión del mundo la visera está entre ocho y veintidós
    # centímetros por debajo de la vista del piloto —lo que hace falta para ver
    # el suelo delante y que el sol no dé en las esferas—, así que eso es lo que
    # se exige aquí. Lo que cada avión pida dentro de esa banda, se respeta.
    #
    #
    # **Y lo bastante por debajo como para ver el mundo por encima del morro.**
    #
    # Con ocho centímetros bajo el respaldo, el borde de la visera quedaba a
    # la altura de los ojos: 1,3° por debajo en las avionetas y **0,9° por
    # encima** en los reactores, cuya visera es más gruesa. Volando en
    # crucero, con el morro un poco arriba, por el parabrisas solo se veía
    # cielo: «ir volando y no ver nada enfrente, es raro». Un avión se diseña
    # al revés, desde el ojo: por encima del morro se ven unos diez grados
    # hacia abajo en una avioneta y unos doce en uno de línea, que es lo que
    # deja ver la pista en final y el mar en crucero. Medido con la sonda del
    # encuadre, esto los deja en esa banda.
    baja_minima = 0.17 if clase == "reactor" else 0.12
    alto_panel = max(
        min(alto_panel, y_respaldo - baja_minima), y_respaldo - 0.26
    )
    # El suelo, que si no se ve el interior del fuselaje por debajo de la silla.
    piezas.append(
        caja("suelo-cabina", -ancho, ancho, y_suelo, y_suelo + 0.02,
             panel_z - 0.22, ojos_z + suelo_atras)
    )
    if grande:
        de_linea, y_linea = _cabina_de_reactor(
            ojos_z, panel_z, ancho, alto_panel, y_suelo, plazas, palancas,
            relojes, pantallas, pantallas_en, mide, mandos,
            ojo_y=y_respaldo + 0.10,
        )
        piezas += de_linea
    # El panel, vertical y mirando al piloto, con la visera por encima: esa
    # visera es lo que en un avión de verdad hace que las pantallas se lean con
    # sol, y aquí además es lo que separa el panel del parabrisas.
    if not grande:
        piezas.append(
            redondear(
                caja("panel", -ancho - 0.02, ancho + 0.02, y_suelo + 0.08,
                     alto_panel, panel_z - 0.12, panel_z),
                radio=0.012,
            )
        )
        piezas.append(
            _visera(ancho + 0.04, alto_panel + 0.04, 0.05, panel_z - 0.18,
                    panel_z + 0.08, arco=0.06)
        )
        piezas += _costados(ancho, y_suelo, alto_panel, panel_z, ojos_z)
    # ── **Un avión de pistón lleva relojes, no cristal** ──
    #
    # La familia la manda el motor y no el peldaño: los de pistón llevan seis
    # esferas redondas, el turbohélice dos pantallas y los reactores la cabina
    # de línea entera. Eso ya lo decía el cuadro plano —ver `familiaDe` en
    # `ui/familia.ts`— y aquí dentro no se cumplía: el entrenador de escuela,
    # el fumigador y el bimotor volaban con dos cristales de G1000 delante.
    #
    # Y lo que había en el tablero eran **dos relojes de motor y nada más**,
    # con un comentario que lo explicaba así: «no son instrumentos que
    # funcionen; lo que se lee de verdad está en el HUD». Eso valía mientras el
    # HUD se viera desde la cabina. Ya no se ve —ahí el cuadro es el del
    # avión—, así que la decoración se quedó de único panel.
    #
    # Seis, en dos filas de tres y en el orden de siempre: velocidad, actitud y
    # altímetro arriba; viraje, rumbo y variómetro abajo. Es el «six-pack» que
    # lleva cualquier avioneta del mundo, y el mismo que dibuja `six-pack.ts`
    # en el cuadro plano.
    seispack = mide == "rpm" and not grande

    # ── **Cuánto sitio hay de verdad, decidido una sola vez** ──
    #
    # Todo lo que va en el tablero —el six-pack, la columna de motor y la fila
    # de botones— se reparte este hueco, y cada pieza se encoge si hace falta.
    # Es la regla del cuadro plano traída aquí: **se encoge lo de dentro, nunca
    # se empuja el grupo a un lado**. Ver `ui/familia.ts`.
    #
    # El techo no es el borde del panel: **la visera sobresale ocho centímetros
    # hacia el piloto**, así que lo que caiga justo debajo de ella se ve
    # cortado desde el asiento. Se vio en el bimotor, con la fila de arriba del
    # six-pack partida por la mitad.
    techo_inst = alto_panel - 0.05
    suelo_inst = y_suelo + 0.10
    alto_util = max(0.12, techo_inst - suelo_inst)
    cuantos_r = max(1, palancas) + 1
    # La columna de motor mide `r*(2,4·n − 0,4)` y debajo va la fila de
    # botones, que pide otro `1,7·r`. De ahí sale el tope.
    radio_reloj = min(0.07, alto_util / (2.4 * cuantos_r + 1.3))
    # Y el six-pack, dos filas.
    #
    # **El paso se mide por el aro, no por la esfera.** La caja de un reloj es
    # un cilindro de `radio·1,12` —ver `reloj`—, o sea que dos esferas
    # separadas por su propio diámetro tienen los aros montados uno encima del
    # otro. Se veía poco a ojo y el banco lo cantó de golpe: ocho solapes en
    # los tres aviones de pistón.
    PASO_DE_ESFERA = 2.45
    radio_s = min(0.058, alto_util / (PASO_DE_ESFERA + 2)) if seispack else 0.0
    paso_s = radio_s * PASO_DE_ESFERA
    columna_s = radio_reloj * 2 + 0.03
    if seispack:
        # Y a lo ancho, lo mismo: si el grupo entero no cabe en el tablero, se
        # encoge; nunca se sale ni se descentra.
        sobra = paso_s * 3 + columna_s - ancho * 2
        if sobra > 0:
            radio_s = max(0.026, radio_s - sobra / (PASO_DE_ESFERA * 3))
            paso_s = radio_s * PASO_DE_ESFERA
        grupo_s = paso_s * 3 + columna_s
        borde_s = plazas[0] - grupo_s / 2
        # Arrimado a la visera, por lo mismo que las pantallas: es donde cae la
        # vista al bajarla del horizonte.
        arriba_s = techo_inst - radio_s
        for i, que in enumerate(("asi", "ai", "alt", "tc", "dg", "vsi")):
            piezas += reloj(
                f"reloj-{que}",
                que,
                radio_s,
                (
                    borde_s + radio_s + (i % 3) * paso_s,
                    arriba_s - (i // 3) * paso_s,
                    # **Delante de la plancha, no clavado en ella.** A ras del
                    # panel las dos caras pelean por el mismo plano y lo que
                    # sale es media esfera sí y media no, distinta según desde
                    # dónde se mire: en el bimotor desaparecía la fila de abajo
                    # entera. Los relojes de motor ya iban ocho milímetros por
                    # delante, por esto mismo.
                    panel_z + 0.008,
                ),
                puntos,
            )
        # **La placa del grupo de vuelo.** En una avioneta de verdad los seis
        # van en una chapa aparte atornillada al panel, y es lo que hace que se
        # lean como un grupo: lo que hay que mirar, junto, y el resto alrededor.
        m = radio_s * 1.2 + 0.016
        x0 = borde_s + radio_s - m
        x1 = borde_s + radio_s + 2 * paso_s + m
        y1 = min(arriba_s + m, alto_panel - 0.012)
        y0 = arriba_s - paso_s - m
        piezas.append(
            redondear(
                caja("subpanel", x0, x1, y0, y1, panel_z - 0.004,
                     panel_z + 0.004, "subpanel"),
                radio=0.003, segmentos=1,
            )
        )
        puntos += [(x, y, panel_z + 0.004) for x in (x0 + 0.009, x1 - 0.009)
                   for y in (y0 + 0.009, y1 - 0.009)]

    if pantallas and not grande and not seispack:
        # **El grupo entero centrado en el ojo del piloto.**
        #
        # Las pantallas ya se centraban en su asiento, pero la columna de
        # relojes se colgaba **a la derecha de ellas**, así que el conjunto de
        # lo que se lee quedaba escorado: medido desde el asiento con la sonda
        # `enPantalla`, sobraban 376 píxeles por la izquierda y 235 por la
        # derecha en un cuadro de 1280. Eso es lo que se ve en una captura y lo
        # que se dijo mirándola.
        #
        # Es la misma regla que el cuadro del HUD: **se centra el grupo, no una
        # de sus piezas**. Y si algo no cupiera se encoge lo de dentro; jamás se
        # empuja el grupo a un lado. Ver `ui/familia.ts`.
        #
        # **Y las dos pantallas pegadas, sin solaparse.** La separación era un
        # desplazamiento desde el centro —`min(pantallas_en, 0.16)`— y con un
        # panel estrecho eso las metía una dentro de otra: 0,28 de ancho cada
        # una a 0,31 de distancia entre centros. Se veía como una sola pantalla
        # ancha partida por una raya. Ahora se colocan por su borde, que es lo
        # que no se puede equivocar.
        ancho_p = 0.28
        alto_p = 0.24
        hueco_p = 0.012
        par = ancho_p * 2 + hueco_p
        # Lo que ocupa la columna de relojes, si la hay, con su hueco.
        radio_reloj = min(0.07, 0.175 / max(2, max(1, palancas) + 1))
        columna = 0.0 if grande else radio_reloj * 2 + 0.03
        grupo = par + columna
        borde = plazas[0] - grupo / 2
        # **Arrimadas a la visera, no en mitad del tablero.**
        #
        # Estaban dieciocho centímetros por debajo del borde de arriba, o sea
        # en el centro de la plancha, y lo que se veía desde el asiento era un
        # tablero enorme con dos cuadraditos en medio. En cualquier cabina del
        # mundo los instrumentos de vuelo empiezan justo debajo de la visera,
        # porque es donde cae la vista al bajarla del horizonte: lo que se mira
        # todo el rato va lo más cerca posible de lo que se mira todo el rato.
        y_p = alto_panel - 0.04 - alto_p / 2
        for k, nombre in enumerate(("horizonte", "rumbo")):
            centro = (borde + ancho_p / 2 + k * (ancho_p + hueco_p),
                      y_p, panel_z + 0.005)
            piezas.append(
                cuadro(f"pantalla-{nombre}", ancho_p, alto_p, centro,
                       "g1000_display")
            )
            # Y su marco, que es media pantalla de un G1000: el cristal va
            # dentro de una caja con canto, no pegado a la chapa.
            piezas.append(
                marco(f"pantalla-{nombre}-marco", centro, ancho_p, alto_p,
                      hueco_p * 0.45, 0.005, "bisel")
            )

    # Los relojes del panel: discos finos pegados al tablero, en fila.
    #
    # No son instrumentos que funcionen —lo que se lee de verdad está en el HUD,
    # en SVG y legible, ver `ui/six-pack.ts`— y no pasa nada: en una cabina de
    # verdad la mayoría de lo que se ve tampoco se mira casi nunca. Lo que hacen
    # es que la cabina **parezca** lo que es.
    # Los instrumentos del panel de una avioneta: **uno por motor y el de
    # flaps**, encendidos por el juego. Ver `reloj`.
    #
    # Aquí había una rejilla de discos grises sin cara, repartidos por el
    # tablero «para que pareciera una cabina». Lo que parecía era un tablero con
    # pegatinas: desde el asiento no se leía ni uno. Un instrumento que no marca
    # sobra, y los que marcan son estos.
    if not grande:
        # **En columna al lado de las pantallas**, no en fila debajo.
        #
        # Debajo es donde están en una cabina de verdad, y aquí no se podían
        # dejar por dos cosas que se ven en cuanto se mira la captura. Una: la
        # tarjeta de lo que hay que hacer —«arrancá el motor»— vive abajo en el
        # centro de la pantalla y les caía justo encima, así que los dos únicos
        # instrumentos que marcan de verdad estaban tapados el noventa por
        # ciento del vuelo. Y dos: con todo el tablero centrado en el asiento
        # del piloto, **la mitad derecha del panel es una plancha negra vacía**,
        # que es media pantalla de nada y es de donde sale lo de «parece un
        # juguete de los chinos».
        #
        # Puestos en columna a la derecha de la pantalla de rumbos, las dos
        # cosas se arreglan a la vez: se ven siempre y llenan el hueco. Y sigue
        # siendo una cabina creíble — en muchas avionetas el grupo del motor va
        # justo ahí, a la derecha del panel de vuelo.
        cuantos = cuantos_r
        # **Una sola columna, y los relojes encogen para que quepa.**
        #
        # La columna va pegada al borde derecho de lo que se ve desde el
        # asiento, así que **a lo ancho no hay sitio**: se probó a ponerlos en
        # bloque de dos como en el cuatrimotor y la segunda columna se salía por
        # el canto derecho —medido, x hasta 1.399 de un lienzo de 1.280—. Lo que
        # sí hay es alto, y lo que sobra es tamaño.
        #
        # **Y el tamaño ya está decidido arriba**, del hueco que hay entre la
        # visera y el canto de abajo, que es de donde come todo. Estaba aquí
        # con una cuenta suya —`0,175 / n`— y por eso en el bimotor la tercera
        # esfera se salía por debajo del panel y se metía entre los botones.
        radioReloj = radio_reloj
        cols = 1
        paso_r = radioReloj * 2.4
        # **Donde acaba el par de pantallas**, que es lo que fija el grupo.
        #
        # Salía de una cuenta suya —el centro del asiento más un puñado de
        # sumandos— y por eso el conjunto quedaba escorado a la derecha. Ahora
        # el reparto lo decide un sitio solo, arriba, y esto se limita a
        # ponerse detrás.
        # **Y lo que fija el grupo es lo que haya a su izquierda**, que ya no
        # es siempre el par de pantallas: en un avión de pistón son las tres
        # esferas del six-pack. Con la cuenta del par escrita a pelo, la
        # columna de motor se plantaba donde estarían los cristales que ese
        # avión ya no lleva.
        par_r = paso_s * 3 if seispack else 0.28 * 2 + 0.012
        grupo_r = par_r + radioReloj * 2 + 0.03
        izq = plazas[0] - grupo_r / 2 + par_r + 0.03 + radioReloj
        columna = izq + (cols - 1) * paso_r / 2
        # A la altura de lo que tiene al lado, y por debajo de la visera.
        arriba = techo_inst - radioReloj
        filas_r = (cuantos + cols - 1) // cols
        for m in range(cuantos):
            x = izq + (m % cols) * paso_r
            y = arriba - (m // cols) * paso_r
            if m < cuantos - 1:
                piezas += reloj(
                    f"reloj-motor-{m}", mide, radioReloj,
                    (x, y, panel_z + 0.008), puntos,
                )
            else:
                piezas += reloj(
                    "reloj-flaps", "flaps", radioReloj,
                    (x, y, panel_z + 0.008), puntos,
                )
        # Y los tres mandos que se pulsan, **debajo de la columna de relojes**.
        #
        # Estuvieron centrados debajo de las pantallas, y ahí los tapaba la
        # tarjeta de lo que hay que hacer igual que a los relojes: abajo y en el
        # centro es donde vive ese cartel el vuelo entero. Un mando que no se ve
        # no se pulsa, y éstos existen precisamente porque se pidió poder
        # pulsarlos «tanto con clic, tap como tecla».
        #
        # A un lado a secas tampoco valían —en el turbohélice, con el ojo en el
        # asiento izquierdo, los tres caían fuera de la pantalla, medido con
        # `npm run botones`—, y por eso van pegados a la columna de relojes, que
        # ya está comprobado que se ve entera.
        # Y centrados en la columna, sean tres o cuatro: el «−1» de antes daba
        # por hecho que eran tres y con el del tren corría la fila a la derecha.
        #
        # **Y dentro del tablero, no colgando por debajo.** La fila caía donde
        # acabara la columna de relojes, y eso en el fumigador y en el bimotor
        # era por debajo del canto del panel: medido en el avión, los botones
        # del Panambi asomaban siete centímetros al aire. Un mando que flota
        # fuera del tablero no es un mando, es un error de dibujo — y encima se
        # veía, porque es justo lo que queda a la vista al mirar hacia abajo.
        alto_boton = radioReloj * 0.8
        y_boton = max(
            y_suelo + 0.08 + alto_boton,
            arriba - (filas_r - 1) * paso_r - radioReloj * 1.7,
        )
        # Y por los costados igual: la fila se arrima lo justo para caber
        # entera. En el fumigador, con la columna pegada al borde derecho, el
        # botón del freno asomaba un centímetro al aire.
        paso_boton = radioReloj * 1.3
        medio_fila = (len(mandos) - 1) * paso_boton / 2 + radioReloj
        # **Y centrados en el piloto, no debajo de la columna de motor.**
        #
        # Iban ahí por una razón que ya no existe: abajo y en el centro vivía
        # la tarjeta de «lo que toca hacer ahora» y les caía encima. Desde que
        # esa tarjeta sube a la franja de arriba en la vista de cabina, el
        # centro está libre — y el centro es donde va la mano. Amontonados a un
        # costado se veían torcidos en el biplano y en el bimotor.
        #
        # Salvo con bastón, que sale del suelo entre las rodillas y desde el
        # asiento cae justo delante del centro de la fila: en el fumigador
        # tapaba los tres botones. Ahí la fila se aparta a su derecha.
        deseado = plazas[0] + (medio_fila + 0.04 if mando == "palanca" else 0)
        centro_fila = max(
            -ancho + medio_fila, min(ancho - medio_fila, deseado)
        )
        for i, que in enumerate(mandos):
            piezas += boton(
                que, radioReloj * 1.0, alto_boton,
                (centro_fila + (i - (len(mandos) - 1) / 2) * paso_boton,
                 y_boton,
                 panel_z + 0.008),
            )
    _ = relojes
    # El pedestal con sus palancas de gas, una por motor.
    #
    # **Entre los dos asientos, no delante del piloto.** Iba en el eje del
    # avión, que es el sitio del pedestal mientras el piloto se sentaba a la
    # izquierda; desde que el piloto se sienta en el eje —ver arriba— el
    # pedestal le quedaba entre las rodillas y tapaba los mandos del centro
    # del panel: en el bimotor y en el turbohélice, dos de cuatro botones.
    # Con una sola plaza, a su derecha, que es donde va la mano del gas.
    ped_x = (
        (plazas[0] + plazas[1]) / 2 if len(plazas) > 1 else plazas[0] + 0.30
    )
    # ── **Lo que va delante del panel no tapa el panel** ──
    #
    # El pedestal, las palancas, el volante y el bastón están más cerca de
    # los ojos que el tablero, así que una misma altura se ve **más abajo**
    # cuanto más cerca está. Aquí había un pedestal que tapaba media esfera de
    # flaps en el turbohélice: medido en metros quedaba bajo el panel, y
    # desde el asiento se comía el reloj.
    #
    # Así que la altura de todo eso sale de un ángulo y no de un número: la
    # raya que va de los ojos a lo más bajo que hay que leer —la fila de
    # botones—. Por debajo de esa raya no tapa nada. **Y se mide en el canto
    # más lejano** de cada pieza, que es el que se ve más alto: el primer
    # intento la midió en el de atrás y el pedestal seguía tapando el freno.
    ojo_y = y_respaldo + 0.10
    ojo_z = ojos_z + 0.145
    if not grande:
        y_linea = y_boton - alto_boton * 0.5 - 0.012
    baja = (ojo_y - y_linea) / (ojo_z - panel_z)

    def techo_en(z):
        return ojo_y - baja * (ojo_z - z)

    if palancas and not grande:
        # **Pegado al panel**, con las palancas saliendo de él hacia el
        # piloto, que es como es el cuadrante de gases de un bimotor. Iba
        # medio metro hacia atrás y las palancas quedaban dentro del plano
        # cercano de la cámara: desde el asiento no se veía ni una.
        fondo = 0.30
        arriba_p = min(y_suelo + 0.22, techo_en(panel_z) - 0.005)
        piezas.append(
            redondear(
                caja("pedestal", ped_x - 0.10, ped_x + 0.10, y_suelo + 0.02,
                     arriba_p, panel_z, panel_z + fondo),
                radio=0.02,
            )
        )
        z_l = panel_z + 0.10
        piezas += _palancas_de_gas(
            palancas, ped_x, 0.15, arriba_p,
            max(arriba_p + 0.08, techo_en(z_l - 0.022)), z_l,
        )
    elif not grande:
        # **Y donde no hay pedestal, el pomo del gas en el tablero**, que es lo
        # que decía el guion del entrenador y no estaba: «en una avioneta el
        # gas es un pomo en el tablero». Negro, redondo y abajo en el centro,
        # como en un 172. Se empuja para acelerar, que es lo que se aprende.
        # Justo bajo la raya de lo que se lee, y entre el eje del volante y su
        # cuerno derecho: ahí es donde cae la mano derecha. El pomo y **su
        # eje**, que entra en el panel y es lo más lejano: es el que se ve
        # más alto, y a ras de la raya se metía en el botón del freno.
        yp = max(y_suelo + 0.12,
                 min(techo_en(panel_z + 0.054) - 0.02, y_linea - 0.01))
        xp = plazas[0] + 0.075
        piezas.append(
            cilindro("pomo-de-gas-eje", 0.006, 0.06, (xp, yp, panel_z + 0.03),
                     "metal", lados=8, giro=None)
        )
        piezas.append(
            redondear(
                cilindro("pomo-de-gas", 0.02, 0.022, (xp, yp, panel_z + 0.065),
                         "pomo", lados=16, giro=None),
                radio=0.006,
            )
        )

    for i, x in enumerate(plazas):
        silla = asiento_de_una_pieza(
            "asiento" if i == 0 else f"asiento-{i}", ojos_z,
            y_cojin=y_suelo + 0.02, y_respaldo=y_respaldo,
        )
        silla.location.x += x
        piezas.append(silla)

    if puntos:
        piezas.append(tornillos("tornillos", puntos))

    # El mando. No se toca, pero un avión sin nada que agarrar no es un avión.
    #
    # **Y lo que se agarra no es lo mismo en todos.** Aquí había una palanca de
    # bastón en los seis aviones, cuatrimotor incluido: un avión de transporte
    # lleva un volante —un «cuerno»— delante de cada piloto, y una avioneta de
    # escuela también. El bastón es de los que se pilotan con una mano y llevan
    # el brazo entre las rodillas, que en esta flota es el fumigador.
    #
    # **A la altura a la que se ve.** Lo que asoma desde el asiento son las
    # puntas de los cuernos, a los lados de la fila de botones y no encima de
    # ella: un mando que tapa los mandos no ayuda. Como el volante está más
    # cerca de los ojos que el panel, la misma altura se ve más abajo; por eso
    # la cuenta va en ángulo y no en metros.
    if mando == "cuerno":
        for i, x in enumerate(plazas):
            z_c = panel_z + (0.16 if grande else 0.13)
            punta = techo_en(z_c) + 0.012
            piezas += _cuerno(x, y_suelo, panel_z, grande,
                              y_centro=punta - 0.12, z_centro=z_c)
        return piezas
    #
    # **Y sale del suelo de la cabina, no de una altura fija.** Estaba clavada
    # en 0,54, que es lo que le toca al biplano —suelo a 0,32— y en los otros
    # cuatro, que tienen el suelo entre −0,42 y −0,66, quedaba entre veinte y
    # cincuenta centímetros **por encima de la cabeza del piloto**. No se veía
    # desde el asiento porque cae dentro del plano cercano de la cámara, que es
    # justo lo que hace que un fallo así dure.
    #
    # **Y con su empuñadura**, que es lo que la hace un bastón y no un palo: un
    # puño negro, algo inclinado hacia el piloto, con el pulsador arriba.
    z_b = panel_z + 0.20
    alto_b = techo_en(z_b) - 0.11 - y_suelo
    piezas.append(
        cilindro("palanca", 0.016, alto_b,
                 (plazas[0], y_suelo + alto_b / 2, z_b), "metal", lados=10)
    )
    y_b = y_suelo + alto_b
    piezas.append(
        tubo("palanca-puno",
             [(plazas[0], y_b - 0.02, z_b), (plazas[0], y_b, z_b),
              (plazas[0], y_b + 0.04, z_b), (plazas[0], y_b + 0.09, z_b),
              (plazas[0], y_b + 0.105, z_b), (plazas[0], y_b + 0.112, z_b)],
             0.016, "pomo", lados=12,
             radios=[0.012, 0.016, 0.019, 0.018, 0.013, 0.004])
    )
    # Y la bota de cuero de la base, que tapa el agujero del suelo.
    piezas.append(
        cilindro("bota-de-palanca", 0.05, 0.06,
                 (plazas[0], y_suelo + 0.05, z_b), "tapiceria", lados=12)
    )
    return piezas


def _palancas_de_gas(cuantas, x_centro, ancho, y_base, y_pomo, z):
    """
    Las palancas de gas: una por motor, juntas, cada una con su pomo.

    Una palanca de gas de verdad no es un palo: es un brazo que sale de una
    ranura del pedestal y termina en un pomo que llena la mano. Juntas, para
    poder llevarlas todas con una mano, que es lo que se hace.
    """
    piezas = []
    paso = min(0.06, ancho / max(1, cuantas))
    largo = y_pomo - 0.03 - y_base
    for i in range(cuantas):
        x = x_centro - paso * (cuantas - 1) / 2 + paso * i
        piezas.append(
            cilindro(f"palanca-de-gas-{i}", 0.008, largo + 0.01,
                     (x, y_base + largo / 2, z), "metal", lados=8)
        )
        piezas.append(
            redondear(
                caja(f"pomo-de-gas-{i}", x - paso * 0.42, x + paso * 0.42,
                     y_pomo - 0.04, y_pomo, z - 0.022, z + 0.022, "pomo"),
                radio=0.01,
            )
        )
    return piezas


def aBlender(piezas):
    """
    Pone el avión en los ejes de Blender antes de exportar.

    **Aquí se modela con la Y hacia arriba**, que es la convención del juego y
    la de glTF: x a lo ancho, y arriba, z a lo largo con el morro en la z
    negativa. Blender usa otra —la Z es arriba y la Y es hacia delante— y su
    exportador convierte de la suya a la de glTF.

    Sin esto, las dos conversiones se suman en vez de cancelarse: el avión sale
    tumbado y la envergadura acaba en el eje del largo. Medido: 5,74 de ancho,
    9,49 de alto y 12,50 de largo, o sea un avión de pie.

    Se gira todo junto colgándolo de un vacío en el origen, que es la única
    forma de girar alrededor del centro del mundo y no de cada pieza.
    """
    bpy.ops.object.empty_add(location=(0, 0, 0))
    eje = bpy.context.object
    eje.name = "avion"
    for p in piezas:
        if p.parent is None and p is not eje:
            p.parent = eje
            p.matrix_parent_inverse = eje.matrix_world.inverted()
    eje.rotation_euler = (math.radians(90), 0, 0)
    return eje


def exportar(piezas, salida, envergadura):
    """
    **Primero se comprueba, y después se escribe.**

    Estaba al revés: exportaba y luego miraba, así que un guion que fallara la
    comprobación dejaba igualmente el `.glb` malo en `public/` — y el juego lo
    cargaba tan contento. Una comprobación que corre después de publicar no
    protege nada; solo avisa de lo que ya está hecho.

    Lo que se comprueba, y cada cosa por un fallo que pasó de verdad:

    - **Que el avión no salga de pie.** Lo ancho de un avión es su envergadura.
      Es lo que habría cazado el primer Mainumby sin abrir el juego: salía 5,74
      de ancho, 9,49 de alto y 12,50 de largo.
    - **Que lo que tiene que estar de pie lo esté.** Blender crea sus cilindros
      a lo largo de su Z y aquí se modela con la Y arriba, así que montantes,
      patas y palanca salían tumbados a lo largo del fuselaje.
    - **Que el cono de la hélice mire al frente.** Iban apuntando al suelo.

    Se mira por el nombre, que en esta casa dice lo que la pieza es.
    """
    aBlender(piezas)
    bpy.context.view_layer.update()

    def caja(p):
        """La caja de esta pieza en el mundo, en ejes del juego: x, y, z."""
        c = [p.matrix_world @ Vector(v) for v in p.bound_box]
        # Blender tiene la Z arriba y la Y hacia delante; el juego, al revés.
        return (
            [min(v.x for v in c), max(v.x for v in c)],
            [min(v.z for v in c), max(v.z for v in c)],
            [min(v.y for v in c), max(v.y for v in c)],
        )

    mallas = [p for p in piezas if p.type == "MESH"]
    if not mallas:
        raise SystemExit("No hay ni una malla que exportar.")

    # ── Lo ancho es la envergadura ──────────────────────────────────────
    cajas = [caja(p) for p in mallas]
    ancho = max(c[0][1] for c in cajas) - min(c[0][0] for c in cajas)
    alto = max(c[1][1] for c in cajas) - min(c[1][0] for c in cajas)
    largo = max(c[2][1] for c in cajas) - min(c[2][0] for c in cajas)
    caras = sum(len(p.data.polygons) for p in mallas)
    print(f"PIEZAS: {len(piezas)} · caras sin subdividir: {caras}")
    print(f"MEDIDAS: ancho {ancho:.2f} · alto {alto:.2f} · largo {largo:.2f}")
    if abs(ancho - envergadura) > 0.6:
        raise SystemExit(
            f"El avión no mide de ancho su envergadura ({ancho:.2f} vs "
            f"{envergadura}): está tumbado o mal escalado."
        )

    # ── Y cada pieza mirando a donde tiene que mirar ────────────────────
    #
    # No se vio en meses porque **medir la caja de la malla engaña**: en
    # coordenadas locales todas decían estar de pie, porque el giro vive en el
    # nodo y no en la malla. Hay que mirar el mundo, que es lo que se hace aquí.
    mal = []
    for p, (cx, cy, cz) in zip(mallas, cajas):
        n = p.name.lower()
        if n.startswith(("montante", "pata", "palanca")):
            dy, dz = cy[1] - cy[0], cz[1] - cz[0]
            if dz > dy:
                mal.append(f"{p.name} tumbado (alto {dy:.2f}, largo {dz:.2f})")

    # ── El cono de la hélice, por dónde es más gordo ────────────────────
    #
    # **Y esto no se puede mirar con la caja**, que fue el primer intento y no
    # servía para nada: un cono tumbado y uno derecho tienen cajas parecidas, y
    # además la del buje incluye las palas, que cuelgan de él. Lo que distingue
    # una hélice bien puesta de una apuntando al suelo es **dónde está la
    # punta**: un cono de hélice es estrecho por delante y gordo por detrás.
    #
    # Así que se miran sus vértices: los de la mitad de delante tienen que
    # quedar más juntos del eje que los de la mitad de atrás.
    for p in mallas:
        if not p.name.lower().startswith(("helice", "buje")):
            continue
        if p.parent is not None and p.parent.type == "MESH":
            continue  # una pala, no el cono
        pts = [p.matrix_world @ v.co for v in p.data.vertices]
        if len(pts) < 6:
            continue
        # En ejes del juego el morro está en la Z negativa, y en los de Blender
        # eso es la Y positiva.
        medio = (max(q.y for q in pts) + min(q.y for q in pts)) / 2
        centro_x = sum(q.x for q in pts) / len(pts)
        centro_z = sum(q.z for q in pts) / len(pts)

        def gordura(delante):
            de = [q for q in pts if (q.y > medio) == delante]
            if not de:
                return 0.0
            return max(
                math.hypot(q.x - centro_x, q.z - centro_z) for q in de
            )

        if gordura(True) > gordura(False) * 1.1:
            mal.append(
                f"{p.name} apunta al revés "
                f"(delante {gordura(True):.2f}, detrás {gordura(False):.2f})"
            )

    if mal:
        raise SystemExit(
            "Piezas mal orientadas: "
            + " · ".join(mal)
            + ". Blender crea los cilindros y los conos a lo largo de su Z y "
            "aquí se modela con la Y arriba. Ver `cilindro` y `DE_PIE`."
        )

    # Y ahora sí, se escribe.
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=salida,
        export_format="GLB",
        export_apply=True,
        # Las bisagras del tren llevan su eje y su ángulo como propiedades, y
        # sin esto no salen. Ver `bisagra` en `exterior.py`.
        export_extras=True,
        export_yup=True,
    )
    print(f"ESCRITO: {salida}")
