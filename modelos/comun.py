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


def reloj(nombre, que, radio, en):
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
    return [
        # **La caja va detrás de la esfera, no delante.** Puesta delante —que es
        # lo que sale de sumar en la z sin pensar hacia dónde mira el panel— lo
        # que se veía era el octógono gris tapando el instrumento, o sea
        # exactamente lo que esto venía a quitar. El piloto está en la z mayor.
        # Un cilindro se coloca por su **centro**, así que hay que retirarlo su
        # medio grosor y un poco más: puesto a ocho milímetros con dos
        # centímetros de canto, su tapa quedaba dos milímetros por delante de la
        # esfera y lo que se veía era el octógono gris tapando el instrumento —
        # o sea, otra vez lo que esto venía a quitar.
        cilindro(f"{nombre}-caja", radio * 1.12, 0.02, (x, y, z - 0.022),
                 "tablero", giro=None),
        cuadro(f"{nombre}", radio * 2, radio * 2, (x, y, z), f"reloj_{que}"),
    ]


def _cuerno(x, y_suelo, panel_z, grande):
    """
    El volante de un piloto: la columna y el cuerno.

    Lo que se agarra en un avión de transporte y en casi cualquier avioneta. Va
    delante de cada plaza, sale del suelo —de la base del panel, en realidad— y
    termina en una barra con dos empuñaduras.
    """
    alto = 0.42 if grande else 0.30
    ancho_cuerno = 0.22 if grande else 0.16
    base = y_suelo + 0.02
    z = panel_z + (0.34 if grande else 0.26)
    piezas = [
        cilindro(
            f"palanca-columna-{x:.2f}", 0.028 if grande else 0.022, alto,
            (x, base + alto / 2, z), "tablero",
        ),
        caja(
            f"cuerno-{x:.2f}", x - ancho_cuerno / 2, x + ancho_cuerno / 2,
            base + alto - 0.02, base + alto + 0.03, z - 0.03, z + 0.03,
            "metal",
        ),
    ]
    # Las dos empuñaduras, que es lo que hace que se lea como un volante y no
    # como un palo con una tabla.
    for lado in (-1, 1):
        piezas.append(
            caja(
                f"cuerno-puno-{x:.2f}-{lado}",
                x + lado * ancho_cuerno / 2 - 0.025,
                x + lado * ancho_cuerno / 2 + 0.025,
                base + alto - 0.02, base + alto + 0.10,
                z - 0.025, z + 0.025, "tablero",
            )
        )
    return piezas


def _cabina_de_reactor(ojos_z, panel_z, ancho, alto_panel, y_suelo, plazas,
                       motores, relojes, pantallas, pantallas_en, mide="n1"):
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
    borde = ancho + 0.02

    # 1. El panel y su visera.
    piezas.append(
        caja("panel", -borde, borde, y_suelo + 0.30, alto_panel,
             panel_z - 0.14, panel_z, "chapa")
    )
    piezas.append(
        caja("visera", -borde - 0.04, borde + 0.04, alto_panel,
             alto_panel + 0.07, panel_z - 0.26, panel_z + 0.12)
    )
    # El faldón de debajo del panel, para que no se vea el hueco hasta el suelo.
    piezas.append(
        caja("faldon", -borde, borde, y_suelo + 0.02, y_suelo + 0.30,
             panel_z - 0.10, panel_z - 0.04)
    )

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
    radio = min(0.075, (ancho * 0.62) / max(1, motores * 2))
    paso = radio * 2.35
    libre = paso * (motores - 1) / 2 + radio + 0.03
    que = mide
    for m in range(motores):
        x = -paso * (motores - 1) / 2 + paso * m
        piezas += reloj(
            f"reloj-motor-{m}", que, radio,
            (x, alto_panel - 0.13, panel_z + 0.008),
        )
    # Y debajo de la columna, los flaps: en un avión de línea es de las pocas
    # cosas que quien juega mueve y puede ver moverse.
    piezas += reloj(
        "reloj-flaps", "flaps", radio * 0.8,
        (0, alto_panel - 0.13 - radio * 2.3, panel_z + 0.008),
    )
    # `relojes` ya no cuenta discos sueltos: los instrumentos de esta cabina son
    # los motores y los flaps, y ninguno es de adorno.
    _ = relojes

    # 2. Un puesto por piloto, con sus dos pantallas.
    #
    # Las encendidas son las del comandante —son las que el juego dibuja de
    # verdad, ver `pantallas-cabina.ts`— y el copiloto lleva las suyas apagadas,
    # que es lo que se ve desde la izquierda: un panel simétrico. La interior de
    # cada uno arranca donde acaba la columna de motores, y la exterior a su
    # lado; así el panel se llena de fuera adentro sin que nada se pise.
    ancho_p = 0.24
    for i, x in enumerate(plazas):
        signo = -1 if x < 0 else 1
        dentro = signo * max(abs(x) - 0.14, libre + ancho_p / 2)
        for k, sitio in enumerate((dentro, dentro + signo * (ancho_p + 0.02))):
            # **Las cuatro encendidas.** Las del copiloto iban apagadas —cristal
            # oscuro— para que el panel se viera simétrico, y lo que se veía eran
            # dos cuadros negros: «hay cuadros vacíos». Una pantalla apagada en
            # un avión que vuela dice que algo no funciona, y aquí no lo está.
            # Cada piloto tiene las suyas, como en el avión de verdad.
            piezas.append(
                cuadro(
                    f"pantalla-{i}-{k}", ancho_p, 0.22,
                    (sitio, alto_panel - 0.16, panel_z + 0.006),
                    "g1000_display" if pantallas else "cristal",
                )
            )

    # 4. El pedestal, entre los dos asientos, con las palancas de gas.
    if motores:
        alto_pedestal = y_suelo + 0.26
        piezas.append(
            caja("pedestal", -0.14, 0.14, y_suelo + 0.02, alto_pedestal,
                 panel_z + 0.02, ojos_z + 0.10)
        )
        hueco = min(0.06, 0.22 / max(1, motores))
        for i in range(motores):
            x = -hueco * (motores - 1) / 2 + hueco * i
            piezas.append(
                cilindro(
                    f"palanca-de-gas-{i}", 0.016, 0.20,
                    (x, alto_pedestal + 0.09, panel_z + 0.30), "metal",
                )
            )
        # Y las dos de siempre detrás: flaps y aerofrenos.
        for j, dz in enumerate((0.52, 0.66)):
            piezas.append(
                cilindro(
                    f"palanca-{'flaps' if j == 0 else 'frenos'}", 0.014, 0.16,
                    (0.06 if j else -0.06, alto_pedestal + 0.07, panel_z + dz),
                    "tablero",
                )
            )

    # 5. El panel de techo. Es media cabina de un avión de línea, y es lo que
    #    un niño señala primero: filas y filas de interruptores.
    techo = ojos_y + 0.34
    piezas.append(
        caja("panel-de-techo", -0.50, 0.50, techo, techo + 0.07,
             ojos_z - 0.62, ojos_z + 0.12)
    )
    for fila in range(3):
        for k in range(9):
            x = -0.40 + k * 0.10
            piezas.append(
                caja(
                    f"interruptor-{fila}-{k}", x - 0.032, x + 0.032,
                    techo - 0.018, techo,
                    ojos_z - 0.52 + fila * 0.20, ojos_z - 0.52 + fila * 0.20 + 0.12,
                    "chapa",
                )
            )

    # 6. Los montantes del parabrisas, que enmarcan el mundo.
    for lado in (-1, 1):
        piezas.append(
            caja(
                f"montante-parabrisas-{lado}", lado * 0.42 - 0.035,
                lado * 0.42 + 0.035, alto_panel + 0.06, techo,
                panel_z - 0.34, panel_z - 0.26, "chapa",
            )
        )
    return piezas


def cabina(ojos_z, ancho=0.36, alto_panel=0.80, pantallas=True, plazas=(0.0,),
           suelo_atras=0.80, y_suelo=0.32, y_respaldo=0.88, pantallas_en=0.155,
           palancas=0, relojes=0, clase="avioneta", mando="cuerno",
           mide="rpm"):
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
    panel_z = ojos_z - 0.58
    grande = clase == "reactor"
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
    alto_panel = max(
        min(alto_panel, y_respaldo - 0.08), y_respaldo - 0.22
    )
    # El suelo, que si no se ve el interior del fuselaje por debajo de la silla.
    piezas.append(
        caja("suelo-cabina", -ancho, ancho, y_suelo, y_suelo + 0.02,
             panel_z - 0.22, ojos_z + suelo_atras)
    )
    if grande:
        piezas += _cabina_de_reactor(
            ojos_z, panel_z, ancho, alto_panel, y_suelo, plazas, palancas,
            relojes, pantallas, pantallas_en, mide,
        )
    # El panel, vertical y mirando al piloto, con la visera por encima: esa
    # visera es lo que en un avión de verdad hace que las pantallas se lean con
    # sol, y aquí además es lo que separa el panel del parabrisas.
    if not grande:
        piezas.append(
            caja("panel", -ancho - 0.02, ancho + 0.02, y_suelo + 0.08,
                 alto_panel, panel_z - 0.12, panel_z)
        )
        piezas.append(
            caja("visera", -ancho - 0.04, ancho + 0.04, alto_panel,
                 alto_panel + 0.04, panel_z - 0.18, panel_z + 0.08)
        )
    if pantallas and not grande:
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
    # Los instrumentos del panel de una avioneta: **uno por motor y el de
    # flaps**, encendidos por el juego. Ver `reloj`.
    #
    # Aquí había una rejilla de discos grises sin cara, repartidos por el
    # tablero «para que pareciera una cabina». Lo que parecía era un tablero con
    # pegatinas: desde el asiento no se leía ni uno. Un instrumento que no marca
    # sobra, y los que marcan son estos.
    if not grande:
        # **En una fila debajo de las pantallas**, no en medio de ellas.
        #
        # Puestos en el centro del panel, a la altura de las pantallas, el
        # cuentavueltas se dibujaba justo encima del hueco que dejan las dos y
        # las tapaba por los bordes. Debajo hay sitio de sobra y es además donde
        # están en una cabina de verdad: lo que se mira todo el rato arriba, lo
        # que se mira de vez en cuando abajo.
        cuantos = max(1, palancas) + 1
        radioReloj = min(0.07, (ancho * 1.5) / (cuantos * 2.6))
        for m in range(cuantos):
            x = (m - (cuantos - 1) / 2) * radioReloj * 2.5
            if m < cuantos - 1:
                piezas += reloj(
                    f"reloj-motor-{m}", mide, radioReloj,
                    (x, alto_panel - 0.29 - radioReloj, panel_z + 0.008),
                )
            else:
                piezas += reloj(
                    "reloj-flaps", "flaps", radioReloj,
                    (x, alto_panel - 0.29 - radioReloj, panel_z + 0.008),
                )
    _ = relojes
    # El pedestal central con sus palancas de gas, una por motor.
    if palancas and not grande:
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
    # El mando. No se toca, pero un avión sin nada que agarrar no es un avión.
    #
    # **Y lo que se agarra no es lo mismo en todos.** Aquí había una palanca de
    # bastón en los seis aviones, cuatrimotor incluido: un avión de transporte
    # lleva un volante —un «cuerno»— delante de cada piloto, y una avioneta de
    # escuela también. El bastón es de los que se pilotan con una mano y llevan
    # el brazo entre las rodillas, que en esta flota es el fumigador.
    if mando == "cuerno":
        for i, x in enumerate(plazas):
            piezas += _cuerno(x, y_suelo, panel_z, grande)
        return piezas
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
