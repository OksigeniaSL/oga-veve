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
COLORES = {
    "casco": (0.88, 0.86, 0.80, 1.0),
    "capo": (0.72, 0.28, 0.16, 1.0),
    "detalle": (0.20, 0.22, 0.19, 1.0),
    "cristal": (0.10, 0.14, 0.17, 1.0),
    "goma": (0.09, 0.09, 0.08, 1.0),
}


def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(nombre):
    if nombre in bpy.data.materials:
        return bpy.data.materials[nombre]
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = COLORES[nombre]
    bsdf.inputs["Roughness"].default_value = 0.55
    bsdf.inputs["Metallic"].default_value = 0.0
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
    obj.data.use_auto_smooth = True
    obj.data.auto_smooth_angle = math.radians(angulo)
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


def montante(x, z, y0, y1, grosor=0.045):
    """Un montante entre alas. Redondo, que es lo que es."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, radius=grosor, depth=abs(y1 - y0),
        location=(x, (y0 + y1) / 2, z),
    )
    o = bpy.context.object
    o.rotation_euler = (0, 0, 0)
    return pintar(o, "detalle")


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

    # ── Las dos alas ──────────────────────────────────────────────────────
    arriba = ala("ala-alta", ENVERGADURA / 2, CUERDA, CUERDA * 0.86, CUERDA * 0.13,
                 en=(0, HUECO * 0.62, -LARGO * 0.13), diedro=math.radians(1.5))
    abajo = ala("ala-baja", ENVERGADURA * 0.46, CUERDA * 0.94, CUERDA * 0.80,
                CUERDA * 0.12, en=(0, -HUECO * 0.38, -LARGO * 0.02),
                diedro=math.radians(2.5))
    piezas += [suavizar(arriba, subdividir=1), suavizar(abajo, subdividir=1)]

    # Los montantes: lo que dice «biplano» es el hueco **con algo dentro**.
    for lado in (-1, 1):
        for dz in (-CUERDA * 0.30, CUERDA * 0.28):
            piezas.append(
                montante(lado * ENVERGADURA * 0.30, -LARGO * 0.07 + dz,
                         -HUECO * 0.38, HUECO * 0.62)
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
