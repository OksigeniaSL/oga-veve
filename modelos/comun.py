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
from mathutils import Vector

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


def cabina(ojos_z, ancho=0.36, alto_panel=0.80, pantallas=True, plazas=(0.0,),
           suelo_atras=0.80, y_suelo=0.32, y_respaldo=0.88, pantallas_en=0.155,
           palancas=0, relojes=0):
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

    `palancas` son las de gas del pedestal central, una por motor, y `relojes`
    los instrumentos redondos repartidos por el panel. Las dos existen por lo
    mismo, y lo dijo quien juega: «el cuadro de mandos me sale igual en todos;
    si estoy en un reactor o en un 747, el niño quiere ver botones y lucecitas,
    quiere un monstruo de avión, no una avioneta». Una avioneta lleva cero
    palancas de pedestal y un puñado de relojes; un cuatrimotor lleva cuatro
    palancas juntas en el centro, que es la imagen de una cabina grande.

    Dos nombres no son libres: **`asiento`**, porque `ojoDePiloto` lo busca por
    nombre, y **`g1000_display`**, que es lo que busca `pantallas-cabina.ts`.
    """
    piezas = []
    panel_z = ojos_z - 0.58
    # El suelo, que si no se ve el interior del fuselaje por debajo de la silla.
    piezas.append(
        caja("suelo-cabina", -ancho, ancho, y_suelo, y_suelo + 0.02,
             panel_z - 0.22, ojos_z + suelo_atras)
    )
    # El panel, vertical y mirando al piloto, con la visera por encima: esa
    # visera es lo que en un avión de verdad hace que las pantallas se lean con
    # sol, y aquí además es lo que separa el panel del parabrisas.
    piezas.append(
        caja("panel", -ancho - 0.02, ancho + 0.02, y_suelo + 0.08, alto_panel,
             panel_z - 0.12, panel_z)
    )
    piezas.append(
        caja("visera", -ancho - 0.04, ancho + 0.04, alto_panel, alto_panel + 0.04,
             panel_z - 0.18, panel_z + 0.08)
    )
    if pantallas:
        # Separadas, que es como está un G1000: horizonte a la izquierda,
        # rumbos a la derecha. Un palmo por debajo del borde de arriba del
        # panel, que es donde caen los ojos de quien va sentado.
        for lado in (-1, 1):
            piezas.append(
                cuadro(
                    "pantalla-izquierda" if lado < 0 else "pantalla-derecha",
                    0.28,
                    0.20,
                    (lado * pantallas_en, alto_panel - 0.18, panel_z + 0.005),
                    "g1000_display",
                )
            )
    # Los relojes del panel: discos finos pegados al tablero, en fila.
    #
    # No son instrumentos que funcionen —lo que se lee de verdad está en el HUD,
    # en SVG y legible, ver `ui/six-pack.ts`— y no pasa nada: en una cabina de
    # verdad la mayoría de lo que se ve tampoco se mira casi nunca. Lo que hacen
    # es que la cabina **parezca** lo que es.
    for i in range(relojes):
        fila = i // max(1, relojes // 2 or 1)
        en_fila = relojes - (relojes // 2) if fila else relojes // 2
        j = i if not fila else i - (relojes // 2)
        paso = (ancho * 1.5) / max(1, en_fila)
        x = -paso * (en_fila - 1) / 2 + paso * j
        piezas.append(
            cilindro(
                f"reloj-{i}",
                min(0.05, paso * 0.42),
                0.012,
                (x, alto_panel - 0.17 - fila * 0.12, panel_z + 0.008),
                "tablero",
                giro=(0, math.radians(90), 0),
            )
        )
    # El pedestal central con sus palancas de gas, una por motor.
    if palancas:
        piezas.append(
            caja("pedestal", -0.10, 0.10, y_suelo + 0.02, y_suelo + 0.16,
                 panel_z, panel_z + 0.46)
        )
        for i in range(palancas):
            paso = 0.16 / max(1, palancas)
            x = -paso * (palancas - 1) / 2 + paso * i
            piezas.append(
                cilindro(
                    f"palanca-de-gas-{i}",
                    0.014,
                    0.20,
                    (x, y_suelo + 0.24, panel_z + 0.22),
                    "tablero",
                )
            )

    for i, x in enumerate(plazas):
        silla = asiento_de_una_pieza(
            "asiento" if i == 0 else f"asiento-{i}", ojos_z,
            y_cojin=y_suelo + 0.02, y_respaldo=y_respaldo,
        )
        silla.location.x += x
        piezas.append(silla)
    # La palanca. No se toca, pero un avión sin palanca no es un avión.
    #
    # **Y sale del suelo de la cabina, no de una altura fija.** Estaba clavada
    # en 0,54, que es lo que le toca al biplano —suelo a 0,32— y en los otros
    # cuatro, que tienen el suelo entre −0,42 y −0,66, quedaba entre veinte y
    # cincuenta centímetros **por encima de la cabeza del piloto**. No se veía
    # desde el asiento porque cae dentro del plano cercano de la cámara, que es
    # justo lo que hace que un fallo así dure.
    piezas.append(
        cilindro(
            "palanca",
            0.026,
            0.32,
            (plazas[0], y_suelo + 0.22, panel_z + 0.32),
            "tablero",
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
        export_yup=True,
    )
    print(f"ESCRITO: {salida}")
