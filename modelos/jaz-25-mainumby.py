"""
El JAZ 25 *Mainumby*, modelado en Blender.

Se hace aquí y no con la fábrica paramétrica del juego —`fabrica-de-aeronaves.ts`—
porque es el techo que #68 escribió de antemano: «cuando ajustar una silueta
exija recompilar y tantear números en vez de arrastrar vértices, Blender gana».
Se tantearon números cinco veces y el avión seguía siendo losas naranjas con las
aristas duras y el fuselaje abierto por dentro.

Lo que Blender da y la fábrica no puede dar:

- **Superficies de subdivisión.** Un fuselaje es una superficie continua, no una
  tira de anillos cosidos. Con subdivisión se modela la silueta con ocho aros y
  sale una forma suave.
- **Biselado.** Ninguna arista de un avión de verdad es un canto vivo. Es lo que
  más separa una maqueta de una caja.
- **Simetría por modificador.** Se modela media ala y la otra media es la misma,
  siempre, sin poder desviarse.
- **Sombreado suave con ángulo.** Suaviza la chapa y deja vivas las aristas que
  de verdad lo son: el borde de ataque, la juntura del capó.

Se ejecuta sin ventana y escribe el glTF donde el juego lo busca:

    blender --background --python modelos/jaz-25-mainumby.py

El juego lo carga solo si está —`world/aeronave-modelo.ts`— y si no, sigue con
la fábrica. Que falte un recurso no puede dejar a nadie sin volar.
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector

# ── Las medidas, que son las de su ficha de vuelo ─────────────────────────
#
# Salen de `src/flight/aircraft.ts`: envergadura 12,5 m y cuerda 1,7. El juego
# reescala el modelo a la envergadura de la ficha al cargarlo, así que modelar
# con las de verdad es lo único que garantiza que no se deforme.
ENVERGADURA = 12.5
CUERDA = 1.7
LARGO = 8.2
ALTO_FUSELAJE = 1.30
ANCHO_FUSELAJE = 1.15
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
TREN = 1.05

SALIDA = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public", "assets", "aeronaves", "jaz-25.glb",
)

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
    "tablero": (0.13, 0.14, 0.15, 1.0),
    "tapiceria": (0.29, 0.23, 0.17, 1.0),
    # Y las dos pantallas del panel. El nombre no es libre: `pantallas-cabina.ts`
    # busca exactamente `g1000_display` para encenderlas.
    "g1000_display": (0.02, 0.03, 0.04, 1.0),
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
    bsdf.inputs["Roughness"].default_value = 0.55
    bsdf.inputs["Metallic"].default_value = 0.0
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


def ala(nombre, media_envergadura, cuerda_raiz, cuerda_punta, espesor,
        en, flecha=0.0, diedro=0.0, material_="casco"):
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
        bm.verts.new((media_envergadura, v.co.y + media_envergadura * math.tan(diedro),
                      v.co.z * (cuerda_punta / cuerda_raiz) + flecha))
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
    # **Y puestas como las quiere el juego**, que no es como uno las pondría.
    #
    # `pantallas-cabina.ts` pinta el lienzo en espejo y además da la vuelta a
    # las dos coordenadas al cargarlo, porque la pantalla del modelo traído de
    # fuera se ve **por su cara de atrás** y eso mete un espejo por sí solo.
    # Esta se ve de frente, así que hay que darle esa vuelta aquí: con las UV
    # «derechas» la pantalla salía girada media vuelta —el suelo arriba, el
    # cielo abajo y los rótulos del revés—, que es justo lo que se ve cuando
    # una imagen se voltea en los dos ejes.
    #
    # Medido, no razonado: se pintaron las dos pantallas con lo mismo y con el
    # espejo puesto en una sí y en la otra no, que es lo que enseña de una vez
    # cuál de las cuatro combinaciones es la buena.
    for bucle, uv in zip(cara.loops, [(0, 1), (1, 1), (1, 0), (0, 0)]):
        bucle[capa].uv = uv
    bm.normal_update()
    bm.to_mesh(malla)
    bm.free()
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    obj.location = Vector(en)
    return pintar(obj, material_)


def montante(x, z, y0, y1, grosor=0.045):
    """Un montante entre alas. Redondo, que es lo que es."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, radius=grosor, depth=abs(y1 - y0),
        location=(x, (y0 + y1) / 2, z),
    )
    o = bpy.context.object
    o.rotation_euler = (0, 0, 0)
    return pintar(o, "detalle")


def asiento_de_una_pieza():
    """El cojín y el respaldo, unidos. Ver `cabina_interior`."""
    cojin = caja("asiento", -0.24, 0.24, 0.34, 0.42, -0.90, -0.50, "tapiceria")
    respaldo = caja("respaldo", -0.24, 0.24, 0.42, 0.88, -0.55, -0.45, "tapiceria")
    bpy.ops.object.select_all(action="DESELECT")
    cojin.select_set(True)
    respaldo.select_set(True)
    bpy.context.view_layer.objects.active = cojin
    bpy.ops.object.join()
    cojin.name = "asiento"
    return cojin


def cabina_interior():
    """
    Lo que se ve desde el asiento: suelo, panel, visera, pantallas y silla.

    **Hacía falta porque el avión no tenía dentro.** El modelo era una carcasa
    cerrada con cristal ahumado, y desde la vista de cabina se veía el capó y
    el mundo y nada más: «JAZ 25 no tiene panel de mandos». Un avión sin panel
    por dentro no es una cabina, es una burbuja.

    Nada de esto se ve desde fuera —el cristal es oscuro— así que va contado en
    caras: son siete piezas rectas, sin subdividir, y el avión entero sigue por
    debajo de lo que costaba antes el modelo traído de fuera.

    Dos nombres no son libres:

    - **`asiento`**, porque de ahí sale el sitio de los ojos. `ojoDePiloto` lo
      busca por nombre y pone la cabeza en el borde de arriba del respaldo.
    - **`g1000_display`**, el material de las dos pantallas, que es lo que
      busca `pantallas-cabina.ts` para encenderlas.
    """
    piezas = []

    # El suelo, que si no se ve el interior del fuselaje por debajo de la silla.
    piezas.append(caja("suelo-cabina", -0.36, 0.36, 0.32, 0.34, -1.70, -0.10))

    # ── El panel ──────────────────────────────────────────────────────────
    #
    # **A setenta centímetros de los ojos, no a cuarenta.** El primer intento
    # lo puso a cuarenta y cinco y desde el asiento no se veía: el plano
    # cercano de la cámara está a sesenta centímetros, así que el panel entero
    # quedaba **por delante** de él y se recortaba. Se veía el mundo, el capó y
    # ni rastro de la cabina — igual que cuando no había panel. En un avión de
    # verdad el panel cae a unos setenta y cinco centímetros de la cara, que
    # es más o menos el brazo estirado.
    #
    # Vertical y mirando al piloto, con la visera por encima: esa visera es lo
    # que en un avión de verdad hace que las pantallas se lean con sol, y aquí
    # además es lo que separa el panel del parabrisas.
    piezas.append(caja("panel", -0.38, 0.38, 0.40, 0.80, -1.60, -1.48))
    piezas.append(caja("visera", -0.40, 0.40, 0.80, 0.84, -1.66, -1.40))

    # Las dos pantallas, pegadas a la cara de atrás del panel. Separadas, que
    # es como está un G1000: horizonte a la izquierda, rumbos a la derecha.
    for lado in (-1, 1):
        piezas.append(
            cuadro(
                "pantalla-izquierda" if lado < 0 else "pantalla-derecha",
                0.28, 0.20, (lado * 0.155, 0.62, -1.475), "g1000_display",
            )
        )

    # ── La silla ──────────────────────────────────────────────────────────
    #
    # Una sola: un fumigador lleva al piloto y nada más.
    #
    # **Y en una sola pieza**, que no es un capricho. `ojoDePiloto` busca el
    # asiento **más adelantado** y pone los ojos en el borde de arriba de su
    # caja. Con el cojín y el respaldo como dos objetos, el más adelantado era
    # el cojín y los ojos quedaban a su altura: el piloto sentado en el suelo,
    # con el panel por encima de la cabeza. Unidos, el borde de arriba de la
    # caja es el del respaldo, que es donde va la cabeza de quien va sentado.
    piezas.append(asiento_de_una_pieza())

    # La palanca. No se toca, pero un avión sin palanca no es un avión.
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, radius=0.026, depth=0.32, location=(0, 0.54, -1.16)
    )
    piezas.append(pintar(bpy.context.object, "tablero"))

    return piezas


def construir():
    limpiar()
    piezas = []

    # ── Fuselaje ──────────────────────────────────────────────────────────
    #
    # Ocho aros: morro afilado, hombros anchos donde va la cabina, y afinando
    # hasta la cola. Con subdivisión esto es una superficie, no un tubo.
    cuerpo = perfil("fuselaje", [
        (-LARGO * 0.50, ANCHO_FUSELAJE * 0.42, ALTO_FUSELAJE * 0.46, 0.02),
        (-LARGO * 0.42, ANCHO_FUSELAJE * 0.86, ALTO_FUSELAJE * 0.90, 0.00),
        (-LARGO * 0.26, ANCHO_FUSELAJE * 1.00, ALTO_FUSELAJE * 1.00, 0.00),
        (-LARGO * 0.06, ANCHO_FUSELAJE * 0.96, ALTO_FUSELAJE * 0.98, -0.01),
        (LARGO * 0.12, ANCHO_FUSELAJE * 0.80, ALTO_FUSELAJE * 0.82, -0.02),
        (LARGO * 0.30, ANCHO_FUSELAJE * 0.52, ALTO_FUSELAJE * 0.58, -0.02),
        (LARGO * 0.44, ANCHO_FUSELAJE * 0.26, ALTO_FUSELAJE * 0.34, 0.00),
        (LARGO * 0.50, ANCHO_FUSELAJE * 0.14, ALTO_FUSELAJE * 0.22, 0.02),
    ])
    piezas.append(suavizar(cuerpo, subdividir=2, biselar=0))

    # ── Capó del radial ───────────────────────────────────────────────────
    #
    # Un fumigador lleva un radial de nueve cilindros: ancho, corto y romo. Es
    # media silueta del avión.
    capo = perfil("capo", [
        (-LARGO * 0.53, ANCHO_FUSELAJE * 0.70, ANCHO_FUSELAJE * 0.70, 0.02),
        (-LARGO * 0.50, ANCHO_FUSELAJE * 1.16, ANCHO_FUSELAJE * 1.16, 0.02),
        (-LARGO * 0.44, ANCHO_FUSELAJE * 1.18, ANCHO_FUSELAJE * 1.18, 0.02),
        (-LARGO * 0.38, ANCHO_FUSELAJE * 1.02, ANCHO_FUSELAJE * 1.02, 0.01),
    ], "capo")
    piezas.append(suavizar(capo, subdividir=2, biselar=0))

    # ── Cabina abierta ────────────────────────────────────────────────────
    #
    # Un fumigador va con la cabina alta y acristalada para ver el cultivo. El
    # cristal es un material, no un agujero.
    cabina = perfil("cabina", [
        (-LARGO * 0.20, ANCHO_FUSELAJE * 0.62, ALTO_FUSELAJE * 0.52, ALTO_FUSELAJE * 0.44),
        (-LARGO * 0.10, ANCHO_FUSELAJE * 0.78, ALTO_FUSELAJE * 0.66, ALTO_FUSELAJE * 0.46),
        (LARGO * 0.02, ANCHO_FUSELAJE * 0.72, ALTO_FUSELAJE * 0.58, ALTO_FUSELAJE * 0.42),
    ], "cristal")
    piezas.append(suavizar(cabina, subdividir=2, biselar=0))

    piezas += cabina_interior()

    # ── Las dos alas ──────────────────────────────────────────────────────
    arriba = ala("ala-alta", ENVERGADURA / 2, CUERDA, CUERDA * 0.86, CUERDA * 0.13,
                 en=(0, ALA_ALTA, -LARGO * 0.13), diedro=math.radians(1.5))
    abajo = ala("ala-baja", ENVERGADURA * 0.46, CUERDA * 0.94, CUERDA * 0.80,
                CUERDA * 0.12, en=(0, ALA_BAJA, -LARGO * 0.02),
                diedro=math.radians(2.5))
    piezas += [suavizar(arriba, subdividir=1), suavizar(abajo, subdividir=1)]

    # Los montantes: lo que dice «biplano» es el hueco **con algo dentro**.
    for lado in (-1, 1):
        for dz in (-CUERDA * 0.30, CUERDA * 0.28):
            piezas.append(
                montante(lado * ENVERGADURA * 0.30, -LARGO * 0.07 + dz,
                         ALA_BAJA, ALA_ALTA)
            )

    # Y las cabañas, del fuselaje al ala de arriba. Con el plano subido por
    # encima de la carlinga hay medio metro de aire entre los dos, y sin nada
    # que lo cruce el ala parece puesta ahí con alfileres.
    for lado in (-1, 1):
        for dz in (-CUERDA * 0.34, CUERDA * 0.20):
            piezas.append(
                montante(lado * 0.34, -LARGO * 0.13 + dz,
                         ALTO_FUSELAJE * 0.50, ALA_ALTA, grosor=0.035)
            )

    # ── Cola ──────────────────────────────────────────────────────────────
    estabilizador = ala("estabilizador", ENVERGADURA * 0.20, CUERDA * 0.64,
                        CUERDA * 0.42, CUERDA * 0.09,
                        en=(0, ALTO_FUSELAJE * 0.10, LARGO * 0.40))
    piezas.append(suavizar(estabilizador, subdividir=1))

    deriva = ala("deriva", HUECO * 0.72, CUERDA * 0.80, CUERDA * 0.40,
                 CUERDA * 0.08, en=(0, ALTO_FUSELAJE * 0.18, LARGO * 0.41),
                 flecha=CUERDA * 0.30, material_="capo")
    deriva.rotation_euler = (0, 0, math.radians(90))
    deriva.modifiers.remove(deriva.modifiers["simetria"])
    piezas.append(suavizar(deriva, subdividir=1))

    # ── Tren fijo, con carenado ───────────────────────────────────────────
    for lado in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=8, radius=0.05, depth=TREN * 0.78,
            location=(lado * ENVERGADURA * 0.11, -TREN * 0.42, -LARGO * 0.10),
        )
        piezas.append(pintar(bpy.context.object, "detalle"))
        rueda = perfil(f"rueda-{lado}", [
            (-0.07, TREN * 0.46, TREN * 0.46, 0),
            (0.07, TREN * 0.46, TREN * 0.46, 0),
        ], "goma")
        rueda.rotation_euler = (0, math.radians(90), 0)
        rueda.location = Vector((lado * ENVERGADURA * 0.11, -TREN * 0.77, -LARGO * 0.10))
        piezas.append(suavizar(rueda, subdividir=2, biselar=0))
    # Patín de cola: un fumigador es de rueda atrás.
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=0.04, depth=TREN * 0.34,
        location=(0, -TREN * 0.26, LARGO * 0.42),
    )
    piezas.append(pintar(bpy.context.object, "detalle"))

    # ── Hélice ────────────────────────────────────────────────────────────
    #
    # Se llama «helice» para que el juego la encuentre y la haga girar: busca
    # ese nombre dentro del modelo. Ver `NOMBRES_DE_HELICE`.
    radio = ENVERGADURA * 0.11
    bpy.ops.mesh.primitive_cone_add(
        vertices=10, radius1=radio * 0.16, radius2=radio * 0.05, depth=radio * 0.5,
        location=(0, 0.02, -LARGO * 0.57), rotation=(math.radians(90), 0, 0),
    )
    buje = pintar(bpy.context.object, "capo")
    buje.name = "helice"
    for i in range(2):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.02, -LARGO * 0.57))
        pala = bpy.context.object
        pala.scale = (radio, radio * 0.09, radio * 0.035)
        pala.rotation_euler = (0, 0, i * math.pi)
        pala.name = f"helice-pala-{i}"
        # **Con la inversa del padre.** Colgar un objeto de otro sin esto le
        # suma la transformación del padre a la suya: el buje está girado
        # noventa grados y las palas se iban a cuatro metros y medio de altura,
        # que es lo que hacía al avión medir cinco metros setenta de alto.
        pala.parent = buje
        pala.matrix_parent_inverse = buje.matrix_world.inverted()
        piezas.append(suavizar(pintar(pala, "detalle"), subdividir=0, biselar=0.01))
    piezas.append(buje)

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


def exportar(piezas):
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    aBlender(piezas)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=SALIDA,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
    )
    caras = sum(len(p.data.polygons) for p in piezas if p.type == "MESH")
    print(f"PIEZAS: {len(piezas)} · caras sin subdividir: {caras}")
    # Y la medida final, en los ejes del juego: lo ancho tiene que ser la
    # envergadura. Es la comprobación que habría cazado el avión de pie.
    bpy.context.view_layer.update()
    xs, ys, zs = [], [], []
    for p in piezas:
        if p.type != "MESH":
            continue
        for v in p.bound_box:
            w = p.matrix_world @ Vector(v)
            xs.append(w.x); ys.append(w.y); zs.append(w.z)
    ancho, alto, largo = max(xs) - min(xs), max(zs) - min(zs), max(ys) - min(ys)
    print(f"MEDIDAS: ancho {ancho:.2f} · alto {alto:.2f} · largo {largo:.2f}")
    if abs(ancho - ENVERGADURA) > 0.6:
        raise SystemExit(
            f"El avión no mide de ancho su envergadura ({ancho:.2f} vs {ENVERGADURA}): "
            "está tumbado o mal escalado."
        )
    print(f"ESCRITO: {SALIDA}")


exportar(construir())
