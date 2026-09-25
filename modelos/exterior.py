"""
La piel de los aviones: fuselaje, alas, góndolas, hélices, tren y librea.

**Por qué existe, dicho por quien los mira.** «Tenemos aviones de juguete»;
«aviones que no son ni de lejos aviones creíbles». Y era verdad, y no por un
detalle: por el método. Todo se hacía con cuatro primitivas —un tubo de doce
lados subdividido, un ala de cuatro puntos, cajas y cilindros— y con eso no
sale un avión por mucho que se afinen los números:

- **La subdivisión decide la forma, no quien modela.** Un tubo de doce lados
  con dos niveles de Catmull-Clark encoge «algo menos de la mitad» en las
  puntas y hay que adivinar cuánto: la rueda, las ventanillas y la franja se
  colocaban con factores tanteados para caer donde había acabado la piel.
- **Un morro de avión de línea no es un cono.** Tiene la punta por debajo del
  eje, el techo que baja en curva hasta el parabrisas y la panza casi recta;
  y la cola sube por abajo mientras el lomo sigue recto. Con aros centrados y
  simétricos eso no se puede decir.
- **Un ala no es una losa de cuatro puntos.** Tiene perfil —borde de ataque
  redondo, salida afilada—, se afina hacia la punta y lleva flaps y alerones.

Así que aquí la geometría se escribe **tal como se quiere ver**, sin
subdivisión que la mueva:

- `Piel`: un cuerpo por secciones de superelipse, con el techo, la panza y el
  ancho dados por separado y unidos por curvas monótonas. Sirve para el
  fuselaje, los carenados y las góndolas de hélice. Y sabe decir dónde está su
  propia superficie, que es lo que permite pegarle encima la librea.
- `superficie`: alas, derivas, pilones y palas, con perfil NACA de verdad y
  zonas de material por cuerda y envergadura (flaps, alerones, borde de ataque
  metálico).
- `torno`: cuerpos de revolución a partir de un perfil —góndolas de turbofán
  con su labio y su tobera, conos de hélice, ruedas—.
- La librea: franjas, ventanillas redondeadas, parabrisas por paneles y
  contornos de puerta, todos pegados a la piel un dedo por fuera.

Coordenadas: las del juego, como en `comun.py` — x a lo ancho (derecha
positiva), y arriba, z a lo largo con el morro en la z negativa.
"""

import bpy
import bmesh
import math
from mathutils import Vector

from comun import COLORES, material

# ── Los colores que no son de la ficha ────────────────────────────────────
#
# El casco, el capó y el detalle los repinta el juego con la ficha de cada
# avión; estos no, porque **no distinguen a un avión de otro**: el aluminio de
# un borde de ataque, el gris de una panza o el negro de la boca de un motor
# son iguales en toda la flota —y en toda la aviación—. Ponerlos en la ficha
# sería repetir seis veces el mismo trío, que es lo mismo que se decidió con
# el cristal y la goma. Ver `pintarDeLaFlota` en `aeronave-modelo.ts`.
COLORES.update({
    # El gris claro de la panza, de los flaps y de la cara de arriba del ala
    # de un avión de línea: se pintan así para que no deslumbren desde la
    # cabina y para que la mugre del tren no se note.
    "gris": (0.66, 0.68, 0.70, 1.0),
    # El metal sin pintar: labios de toma, bordes de ataque, conos de escape.
    "aluminio": (0.80, 0.81, 0.82, 1.0),
    # El negro de lo que es un agujero: la cara del fan, la boca de un escape,
    # el hueco entre dos paneles, una junta.
    "oscuro": (0.07, 0.07, 0.08, 1.0),
    # Y el amarillo de las puntas de pala, que no es librea: es seguridad. Es
    # lo que hace visible un disco que gira, en todos los aviones del mundo.
    "punta-de-pala": (0.93, 0.74, 0.12, 1.0),
})


def _malla_en_escena(nombre, bm, materiales):
    """Vuelca un bmesh en un objeto nuevo, con sus materiales en ese orden."""
    malla = bpy.data.meshes.new(nombre)
    bm.to_mesh(malla)
    bm.free()
    obj = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(obj)
    for m in materiales:
        obj.data.materials.append(material(m))
    return obj


def liso(obj, angulo=50):
    """
    Sombreado suave, y duro solo donde la chapa hace arista de verdad.

    El ángulo es lo que separa un borde de salida afilado —que tiene que verse
    como un filo— de una piel curva, que no puede verse facetada.
    """
    for p in obj.data.polygons:
        p.use_smooth = True
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angulo))
    return obj


def espejo(obj):
    """
    La otra mitad por simetría, en el mismo objeto.

    Es lo que ya hacía `ala` en `comun.py`, y por lo mismo: dos mitades
    modeladas por separado se desvían. Aquí se usa además para las góndolas,
    los pilones y el tren, que así salen de dos en dos y en una sola malla.
    """
    m = obj.modifiers.new("simetria", "MIRROR")
    m.use_axis = (True, False, False)
    return obj


# ── Curvas ────────────────────────────────────────────────────────────────


def curva(xs, ys):
    """
    Una curva suave que pasa por los puntos y **no se pasa de ellos**.

    Es una cúbica de Hermite monótona (Fritsch-Carlson). Una spline normal
    oscila entre dos puntos cercanos y un fuselaje dibujado con ella sale con
    bultos: una cintura antes del ala o un morro que se hincha y vuelve a
    adelgazar. Esta no puede, porque entre dos puntos nunca sube por encima
    del mayor ni baja por debajo del menor.
    """
    n = len(xs)
    if n == 1:
        return lambda x: ys[0]
    h = [xs[i + 1] - xs[i] for i in range(n - 1)]
    d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n
    m[0], m[-1] = d[0], d[-1]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0:
            m[i] = 0.0
        else:
            w1 = 2 * h[i] + h[i - 1]
            w2 = h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])

    def f(x):
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = 0
        while xs[i + 1] < x:
            i += 1
        t = (x - xs[i]) / h[i]
        t2, t3 = t * t, t * t * t
        return ((2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i]
                + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1])

    return f


def elipse(z0, z1, v0, v1, pasos=5, potencia=2.0):
    """
    Los puntos de un cuarto de elipse entre dos estaciones: un morro redondo.

    La curva monótona hace puntas: entre el cero de la punta y el ancho del
    fuselaje pone una rampa. Un morro de avión es romo —la tangente en la
    punta es vertical—, y eso se consigue dándole los puntos de la elipse.
    """
    fuera = []
    for i in range(pasos + 1):
        a = i / pasos
        k = (1 - (1 - a) ** potencia) ** (1 / potencia)
        fuera.append((z0 + (z1 - z0) * a, v0 + (v1 - v0) * k))
    return fuera


# ── El fuselaje ───────────────────────────────────────────────────────────


class Piel:
    """
    Un cuerpo alargado por secciones de superelipse.

    Cada estación es `(z, medio_ancho, arriba, abajo)` y, si hace falta,
    `y_del_ancho` —a qué altura está lo más ancho— y `n`, el exponente de la
    superelipse: 2 es una elipse, 2,5 ya es un costado recto de avioneta, y
    más es una caja con las esquinas redondas.

    **Techo y panza van por separado**, y es lo que el tubo no sabía hacer: la
    punta del morro de un avión de línea está por debajo del eje y la de la
    cola por encima, así que el lomo y la panza son dos curvas distintas.

    Y sabe dónde está su superficie —`punto`, `t_de_y`—, que es lo que
    permite pegarle encima franjas y ventanillas sin factores de corrección.
    """

    def __init__(self, estaciones, x=0.0, n=2.0):
        zs = [e[0] for e in estaciones]
        self.z0, self.z1 = zs[0], zs[-1]
        self.zs = zs
        self.x = x
        self._w = curva(zs, [e[1] for e in estaciones])
        self._t = curva(zs, [e[2] for e in estaciones])
        self._b = curva(zs, [e[3] for e in estaciones])
        self._m = curva(zs, [
            e[4] if len(e) > 4 and e[4] is not None else (e[2] + e[3]) / 2
            for e in estaciones
        ])
        self._n = curva(zs, [e[5] if len(e) > 5 else n for e in estaciones])

    def seccion(self, z):
        z = max(self.z0, min(self.z1, z))
        arriba, abajo = self._t(z), self._b(z)
        medio = max(abajo, min(arriba, self._m(z)))
        return self._w(z), arriba, abajo, medio, self._n(z)

    def arriba(self, z):
        return self.seccion(z)[1]

    def abajo(self, z):
        return self.seccion(z)[2]

    def punto(self, z, t, fuera=0.0):
        """
        El punto de la piel en la estación `z` y el ángulo `t` (radianes).

        `t` cero es arriba, un cuarto de vuelta es el costado derecho y media
        vuelta es la panza; negativo, el lado izquierdo.
        """
        w, yt, yb, ym, n = self.seccion(z)
        e = 2.0 / n
        s, c = math.sin(t), math.cos(t)
        x = math.copysign(abs(s) ** e, s) * w
        if c >= 0:
            y = ym + (yt - ym) * abs(c) ** e
        else:
            y = ym - (ym - yb) * abs(c) ** e
        p = Vector((self.x + x, y, z))
        if fuera:
            p += self.normal(z, t) * fuera
        return p

    def normal(self, z, t):
        h = 1e-3
        dt = self.punto(z, t + h) - self.punto(z, t - h)
        za, zb = max(self.z0, z - h), min(self.z1, z + h)
        dz = self.punto(zb, t) - self.punto(za, t)
        nrm = dz.cross(dt)
        p = self.punto(z, t)
        radial = p - Vector((self.x, self.seccion(z)[3], z))
        if nrm.length < 1e-9:
            nrm = radial
        if nrm.dot(radial) < 0:
            nrm = -nrm
        return nrm.normalized() if nrm.length > 1e-9 else Vector((0, 1, 0))

    def t_de_y(self, z, y, lado=1):
        """El ángulo al que la piel pasa por la altura `y`, por ese costado."""
        _, yt, yb, _, _ = self.seccion(z)
        y = max(yb + 1e-5, min(yt - 1e-5, y))
        a, b = 0.0, math.pi
        for _ in range(40):
            m = (a + b) / 2
            if self.punto(z, m).y > y:
                a = m
            else:
                b = m
        return lado * (a + b) / 2

    def en(self, z, y, lado=1, fuera=0.0):
        """El punto de la piel a esa altura y por ese costado."""
        return self.punto(z, self.t_de_y(z, y, lado), fuera)

    def malla(self, nombre, material_="casco", lados=40, paso=0.25,
              zonas=(), extra=()):
        """
        La malla de la piel, ya cerrada.

        `zonas` pinta caras enteras de otro material: `(material, z0, z1,
        t0, t1)` con los ángulos en grados desde arriba y a los dos
        costados. Es como va el capó de una avioneta —la misma piel, otro
        color a partir de la cortafuegos— o la panza gris de uno de línea.
        """
        zs = sorted(set(self.zs) | set(e for e in extra
                                          if self.z0 < e < self.z1))
        anillos_z = []
        for a, b in zip(zs, zs[1:]):
            k = max(1, math.ceil((b - a) / paso))
            anillos_z += [a + (b - a) * i / k for i in range(k)]
        anillos_z.append(zs[-1])

        mats = [material_] + [z[0] for z in zonas if z[0] != material_]
        mats = list(dict.fromkeys(mats))
        bm = bmesh.new()
        anillos = []
        for z in anillos_z:
            w, yt, yb, _, _ = self.seccion(z)
            if w < 1e-4 and yt - yb < 1e-4:
                anillos.append([bm.verts.new(self.punto(z, 0.0))])
                continue
            anillos.append([
                bm.verts.new(self.punto(z, math.tau * i / lados))
                for i in range(lados)
            ])

        def zona(z, t):
            tg = abs(math.degrees(t))
            if tg > 180:
                tg = 360 - tg
            for mat, z0, z1, t0, t1 in zonas:
                if z0 <= z <= z1 and t0 <= tg <= t1:
                    return mats.index(mat)
            return 0

        for i, (a, b) in enumerate(zip(anillos, anillos[1:])):
            zc = (anillos_z[i] + anillos_z[i + 1]) / 2
            if len(a) == 1 and len(b) == 1:
                continue
            for j in range(lados):
                k = (j + 1) % lados
                tc = math.tau * (j + 0.5) / lados
                if len(a) == 1:
                    f = bm.faces.new((a[0], b[k], b[j]))
                elif len(b) == 1:
                    f = bm.faces.new((a[j], a[k], b[0]))
                else:
                    f = bm.faces.new((a[j], a[k], b[k], b[j]))
                f.material_index = zona(zc, tc)
        # Las tapas, si la punta no se cierra sola.
        for anillo in (anillos[0], anillos[-1]):
            if len(anillo) > 1:
                bm.faces.new(anillo)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return liso(_malla_en_escena(nombre, bm, mats), angulo=70)


# ── La librea: lo que va pegado a la piel ─────────────────────────────────


def _orientar(bm, piel):
    """Cada cara mirando hacia fuera de la piel, que es la que se ve."""
    bm.normal_update()
    for f in bm.faces:
        c = f.calc_center_median()
        radial = c - Vector((piel.x, piel.seccion(c.z)[3], c.z))
        if f.normal.dot(radial) < 0:
            f.normal_flip()
    bm.normal_update()


def _redondeado(ancho, alto, radio, segs=4, tramo=0.12):
    """
    El contorno de un rectángulo de esquinas redondas, en (z, y).

    **Con puntos a lo largo de los lados rectos**, no solo en las esquinas: un
    lado de metro y medio con dos vértices es una cuerda, y sobre un costado
    curvo la cuerda se mete por dentro de la chapa. La puerta del Pykasu salía
    como un arco suelto en la esquina de abajo y nada más.
    """
    a, b = ancho / 2, alto / 2
    r = max(0.0, min(radio, a, b))
    pts = []
    for cz, cy, a0 in ((a - r, b - r, 0), (-a + r, b - r, 90),
                       (-a + r, -b + r, 180), (a - r, -b + r, 270)):
        for i in range(segs + 1):
            ang = math.radians(a0 + 90 * i / segs)
            pts.append((cz + r * math.cos(ang), cy + r * math.sin(ang)))
    return _denso(pts, tramo)


def _denso(pts, tramo):
    """Un contorno cerrado con un punto cada `tramo` metros como mucho."""
    fuera = []
    for i, p in enumerate(pts):
        q = pts[(i + 1) % len(pts)]
        d = math.hypot(q[0] - p[0], q[1] - p[1])
        k = max(1, math.ceil(d / tramo))
        for j in range(k):
            f = j / k
            fuera.append((p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f))
    return fuera


def ventanas(nombre, piel, zs, y, alto, ancho, radio=None, fuera=0.012,
             material_="cristal", segs=4, lados=(-1, 1)):
    """
    Una fila de ventanillas redondeadas, a los dos costados y en una malla.

    **Redondeadas y no cuadradas**: una ventanilla de avión con esquinas vivas
    se raja por la esquina al presurizar, y por eso no las hay desde los años
    cincuenta. Un niño que dibuja un avión las dibuja redondas, y tiene razón.

    Cada una es un abanico de triángulos sobre su contorno, llevado a la piel
    punto a punto: sigue la curva del costado y no flota por fuera.
    """
    radio = min(ancho, alto) * 0.45 if radio is None else radio
    bm = bmesh.new()
    contorno = _redondeado(ancho, alto, radio, segs)
    for lado in lados:
        for zc in zs:
            centro = bm.verts.new(piel.en(zc, y, lado, fuera))
            borde = [bm.verts.new(piel.en(zc + dz, y + dy, lado, fuera))
                     for dz, dy in contorno]
            for i in range(len(borde)):
                bm.faces.new((centro, borde[i], borde[(i + 1) % len(borde)]))
    _orientar(bm, piel)
    return liso(_malla_en_escena(nombre, bm, [material_]), angulo=80)


def contorno(nombre, piel, zc, yc, alto, ancho, radio=0.12, grueso=0.03,
             fuera=0.01, material_="oscuro", segs=4, lados=(-1, 1)):
    """
    El contorno de una puerta: una raya fina con su forma, no una losa.

    Una puerta de avión **no es de otro color**: es una junta en la chapa,
    una raya oscura del ancho de un dedo. Pintada como un rectángulo verde era
    una pegatina; dibujada como es, dice «puerta» y además da la escala.
    """
    bm = bmesh.new()
    # Los dos contornos con los mismos puntos, para coserlos uno a uno: el de
    # dentro sale de encoger el de fuera hacia el centro de su esquina.
    fuera_ = _redondeado(ancho, alto, radio, segs)
    a, b = ancho / 2, alto / 2
    dentro = [(dz - grueso * (1 if dz > 0 else -1) * min(1.0, abs(dz) / max(a - radio, 1e-6)),
               dy - grueso * (1 if dy > 0 else -1) * min(1.0, abs(dy) / max(b - radio, 1e-6)))
              for dz, dy in fuera_]
    for lado in lados:
        a = [bm.verts.new(piel.en(zc + dz, yc + dy, lado, fuera))
             for dz, dy in fuera_]
        b = [bm.verts.new(piel.en(zc + dz, yc + dy, lado, fuera))
             for dz, dy in dentro]
        for i in range(len(a)):
            j = (i + 1) % len(a)
            bm.faces.new((a[i], a[j], b[j], b[i]))
    _orientar(bm, piel)
    return liso(_malla_en_escena(nombre, bm, [material_]), angulo=80)


def banda(nombre, piel, z0, z1, abajo, arriba, fuera=0.012, paso=0.2,
          filas=3, material_="capo", lados=(-1, 1)):
    """
    Una franja pegada al costado, entre dos alturas que pueden variar.

    `abajo` y `arriba` son números o funciones de `z`: así la franja puede
    subir hacia la cola o afinarse en el morro, que es como se pintan de
    verdad. Es la línea de cintura de toda la vida —«ninguna compañía del
    mundo pinta un avión de un solo color», ver `franja` en `comun.py`—, pero
    llevada a la piel punto a punto en vez de a una elipse supuesta.
    """
    fa = abajo if callable(abajo) else (lambda z, v=abajo: v)
    fb = arriba if callable(arriba) else (lambda z, v=arriba: v)
    k = max(2, math.ceil((z1 - z0) / paso) + 1)
    bm = bmesh.new()
    for lado in lados:
        filas_v = []
        for i in range(k):
            z = z0 + (z1 - z0) * i / (k - 1)
            ya, yb = fa(z), fb(z)
            filas_v.append([
                bm.verts.new(piel.en(z, ya + (yb - ya) * j / filas, lado, fuera))
                for j in range(filas + 1)
            ])
        for a, b in zip(filas_v, filas_v[1:]):
            for j in range(filas):
                bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    _orientar(bm, piel)
    return liso(_malla_en_escena(nombre, bm, [material_]), angulo=80)


def paneles(nombre, piel, cuadros, fuera=0.012, material_="cristal", div=5):
    """
    Paneles pegados a la piel, dados por sus cuatro esquinas en `(z, t)`.

    Es como se hace un **parabrisas**: no una tira de cristal, sino paneles
    con su marco entre medias —el marco es la chapa que queda sin cubrir—.
    Los ángulos van en grados desde arriba, como en `Piel.malla`, y cada panel
    se da una vez y sale a los dos costados si `espejo` lo pide.
    """
    bm = bmesh.new()
    for cuadro in cuadros:
        (za, ta), (zb, tb), (zc, tc), (zd, td) = cuadro
        filas = []
        for i in range(div + 1):
            u = i / div
            fila = []
            for j in range(div + 1):
                v = j / div
                z = ((1 - u) * (1 - v) * za + u * (1 - v) * zb
                     + u * v * zc + (1 - u) * v * zd)
                t = ((1 - u) * (1 - v) * ta + u * (1 - v) * tb
                     + u * v * tc + (1 - u) * v * td)
                fila.append(bm.verts.new(piel.punto(z, math.radians(t), fuera)))
            filas.append(fila)
        for a, b in zip(filas, filas[1:]):
            for j in range(div):
                bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
    _orientar(bm, piel)
    return liso(_malla_en_escena(nombre, bm, [material_]), angulo=80)


def paneles_zy(nombre, piel, cuadros, fuera=0.012, material_="cristal",
               div=6, lados=(-1, 1)):
    """
    Paneles del costado dados por sus esquinas en `(z, y)`: ventanillas.

    Como `paneles`, pero interpolando en altura y no en ángulo. Hace falta en
    cuanto la sección cambia a lo largo de la ventana: la misma `t` es una
    altura distinta en cada estación, y la ventanilla de la puerta del Pykasu
    salía con el borde de abajo arqueado hacia arriba, como una uve.
    """
    bm = bmesh.new()
    for lado in lados:
        for cuadro in cuadros:
            (za, ya), (zb, yb), (zc, yc), (zd, yd) = cuadro
            filas = []
            for i in range(div + 1):
                u = i / div
                fila = []
                for j in range(div + 1):
                    v = j / div
                    z = ((1 - u) * (1 - v) * za + u * (1 - v) * zb
                         + u * v * zc + (1 - u) * v * zd)
                    y = ((1 - u) * (1 - v) * ya + u * (1 - v) * yb
                         + u * v * yc + (1 - u) * v * yd)
                    fila.append(bm.verts.new(piel.en(z, y, lado, fuera)))
                filas.append(fila)
            for a, b in zip(filas, filas[1:]):
                for j in range(div):
                    bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
    _orientar(bm, piel)
    return liso(_malla_en_escena(nombre, bm, [material_]), angulo=80)


def simetricos(cuadros):
    """Los mismos paneles, y su reflejo en el otro costado."""
    return list(cuadros) + [[(z, -t) for z, t in c] for c in cuadros]


# ── Alas, derivas, pilones y palas ────────────────────────────────────────


def _naca(u, espesor, curvatura=0.0, donde=0.4):
    """Semiespesor y línea media de un NACA de cuatro cifras, en cuerdas."""
    yt = 5 * espesor * (0.2969 * math.sqrt(u) - 0.1260 * u - 0.3516 * u * u
                        + 0.2843 * u ** 3 - 0.1036 * u ** 4)
    if curvatura <= 0:
        return yt, 0.0
    if u < donde:
        yc = curvatura / donde ** 2 * (2 * donde * u - u * u)
    else:
        yc = curvatura / (1 - donde) ** 2 * ((1 - 2 * donde) + 2 * donde * u - u * u)
    return yt, yc


def estacion(pos, cuerda, espesor, cuerda_dir=(0, 0, 1), grosor_dir=(0, 1, 0)):
    """Una sección de superficie: dónde está su borde de ataque y cómo mira."""
    return {
        "pos": Vector(pos), "c": cuerda, "t": espesor,
        "cd": Vector(cuerda_dir).normalized(),
        "gd": Vector(grosor_dir).normalized(),
    }


def de_ala(x, y, z, cuerda, espesor, diedro=0.0, torsion=0.0):
    """
    Una estación de ala: `diedro` inclina la sección hacia arriba (grados) y
    `torsion` levanta el borde de ataque (grados), que es el calado.
    """
    fi = math.radians(diedro)
    tw = math.radians(torsion)
    n = Vector((-math.sin(fi), math.cos(fi), 0))
    cd = Vector((0, 0, 1)) * math.cos(tw) - n * math.sin(tw)
    gd = Vector((0, 0, 1)) * math.sin(tw) + n * math.cos(tw)
    return estacion((x, y, z), cuerda, espesor, cd, gd)


def de_deriva(x, y, z, cuerda, espesor):
    """Una estación de deriva: la misma sección, puesta de canto."""
    return estacion((x, y, z), cuerda, espesor, (0, 0, 1), (-1, 0, 0))


def superficie(nombre, estaciones, material_="casco", curvatura=0.0,
               zonas=(), cortes=(), puntos=13, simetria=True, punta=True,
               angulo=35):
    """
    Una superficie con perfil: ala, estabilizador, deriva, pilón o pala.

    Se da como una lista de estaciones —ver `estacion`, `de_ala`,
    `de_deriva`— y entre cada dos se tiende la piel. El perfil es un NACA de
    cuatro cifras: el borde de ataque redondo y el de salida afilado, que es
    lo primero que dice «ala» y lo que la losa de cuatro puntos no tenía.

    `zonas` pinta partes de otro material, cada una `(material, e0, e1, u0,
    u1)`: de `e0` a `e1` metros a lo largo de la envergadura y de `u0` a `u1`
    en fracción de cuerda. Así salen los **flaps y los alerones** —la franja
    de atrás, de otro gris— y el borde de ataque de metal de un reactor. Los
    cortes de cuerda que hagan falta se añaden solos; `cortes` añade más.
    """
    # Las estaciones, con su distancia a la raíz a lo largo de la superficie.
    est = list(estaciones)
    eta = [0.0]
    for a, b in zip(est, est[1:]):
        eta.append(eta[-1] + (b["pos"] - a["pos"]).length)

    # Estaciones intermedias donde empiezan y acaban las zonas: si no, un
    # flap empezaría donde le cayera la estación más cercana.
    bordes = sorted(set(e for z in zonas for e in (z[1], z[2])
                        if 0 < e < eta[-1]))
    for e in bordes:
        if any(abs(e - x) < 1e-4 for x in eta):
            continue
        i = next(k for k in range(len(eta) - 1) if eta[k] < e < eta[k + 1])
        f = (e - eta[i]) / (eta[i + 1] - eta[i])
        a, b = est[i], est[i + 1]
        nueva = {
            "pos": a["pos"].lerp(b["pos"], f),
            "c": a["c"] + (b["c"] - a["c"]) * f,
            "t": a["t"] + (b["t"] - a["t"]) * f,
            "cd": a["cd"].lerp(b["cd"], f).normalized(),
            "gd": a["gd"].lerp(b["gd"], f).normalized(),
        }
        est.insert(i + 1, nueva)
        eta.insert(i + 1, e)

    # La cuerda repartida en coseno —más puntos en el borde de ataque, que es
    # donde se curva— y con los cortes de las zonas dentro.
    us = {0.5 * (1 - math.cos(math.pi * i / (puntos - 1))) for i in range(puntos)}
    us |= {u for z in zonas for u in (z[3], z[4]) if 0 < u < 1}
    us |= {u for u in cortes if 0 < u < 1}
    us = sorted(us)
    # El contorno: del borde de salida por arriba al de ataque, y vuelta por
    # abajo. El de salida es un solo vértice: el perfil cierra en filo.
    bucle = [(1.0, 0)] + [(u, 1) for u in reversed(us[1:-1])] + [(0.0, 0)] + \
        [(u, -1) for u in us[1:-1]]

    mats = list(dict.fromkeys([material_] + [z[0] for z in zonas]))
    bm = bmesh.new()
    anillos = []
    for e in est:
        anillo = []
        for u, lado in bucle:
            yt, yc = _naca(u, e["t"], curvatura)
            v = yc + lado * yt
            anillo.append(bm.verts.new(
                e["pos"] + e["cd"] * (u * e["c"]) + e["gd"] * (v * e["c"])))
        anillos.append(anillo)

    def zona(ea, eb, u, arriba):
        em = (ea + eb) / 2
        for k, z in enumerate(zonas):
            mat, e0, e1, u0, u1 = z[:5]
            cara = z[5] if len(z) > 5 else "ambas"
            if cara == "arriba" and not arriba:
                continue
            if cara == "abajo" and arriba:
                continue
            if e0 <= em <= e1 and u0 <= u <= u1:
                return mats.index(mat)
        return 0

    n = len(bucle)
    for i, (a, b) in enumerate(zip(anillos, anillos[1:])):
        for j in range(n):
            k = (j + 1) % n
            u = (bucle[j][0] + bucle[k][0]) / 2
            arriba = j < n // 2
            f = bm.faces.new((a[j], a[k], b[k], b[j]))
            f.material_index = zona(eta[i], eta[i + 1], u, arriba)
    # La raíz, plana: queda dentro del fuselaje o del motor.
    bm.faces.new(list(reversed(anillos[0])))
    # Y la punta, redondeada: un abanico hasta un punto un poco más allá.
    if punta and len(est) > 1:
        ult = est[-1]
        fuera = (est[-1]["pos"] - est[-2]["pos"]).normalized()
        centro = sum((v.co for v in anillos[-1]), Vector()) / n
        tip = bm.verts.new(centro + fuera * (ult["t"] * ult["c"] * 0.5))
        for j in range(n):
            bm.faces.new((anillos[-1][j], anillos[-1][(j + 1) % n], tip))
    else:
        bm.faces.new(anillos[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = _malla_en_escena(nombre, bm, mats)
    if simetria:
        espejo(obj)
    return liso(obj, angulo=angulo)


# ── Cuerpos de revolución ─────────────────────────────────────────────────


def torno(nombre, perfil_, en=(0, 0, 0), lados=32, eje="z", material_="capo"):
    """
    Un cuerpo de revolución a partir de su perfil: `(a, r[, material])`.

    `a` es la posición a lo largo del eje y `r` el radio. El material de cada
    punto vale para el tramo que empieza en él. **El perfil se recorre con la
    materia a la derecha**: así la cara que se ve es la de fuera sin tener
    que adivinarlo, y un mismo perfil puede tener dentro y fuera —el labio de
    una toma de aire, que se ve por los dos lados—.

    `eje` es `"z"` para góndolas y conos, que miran al frente, y `"x"` para
    ruedas, que ruedan de lado.
    """
    mats = []
    for p in perfil_:
        m = p[2] if len(p) > 2 else None
        if m and m not in mats:
            mats.append(m)
    if material_ not in mats:
        mats.insert(0, material_)
    ox, oy, oz = en

    def pos(a, r, ang):
        c, s = math.cos(ang) * r, math.sin(ang) * r
        if eje == "z":
            return Vector((ox + c, oy + s, oz + a))
        return Vector((ox + a, oy + s, oz + c))

    bm = bmesh.new()
    anillos = []
    for p in perfil_:
        a, r = p[0], p[1]
        if r < 1e-6:
            anillos.append([bm.verts.new(pos(a, 0, 0))])
        else:
            anillos.append([bm.verts.new(pos(a, r, math.tau * i / lados))
                            for i in range(lados)])
    actual = material_
    for i, (pa, pb) in enumerate(zip(perfil_, perfil_[1:])):
        if len(pa) > 2 and pa[2]:
            actual = pa[2]
        a, b = anillos[i], anillos[i + 1]
        if len(a) == 1 and len(b) == 1:
            continue
        # La normal del tramo en el perfil: a la izquierda de la marcha.
        da, dr = pb[0] - pa[0], pb[1] - pa[1]
        n2 = (-dr, da)
        for j in range(lados):
            k = (j + 1) % lados
            if len(a) == 1:
                f = bm.faces.new((a[0], b[j], b[k]))
            elif len(b) == 1:
                f = bm.faces.new((a[j], a[k], b[0]))
            else:
                f = bm.faces.new((a[j], a[k], b[k], b[j]))
            f.material_index = mats.index(actual)
            f.normal_update()
            ang = math.tau * (j + 0.5) / lados
            quiere = pos(n2[0], n2[1], ang) - pos(0, 0, ang)
            if f.normal.dot(quiere) < 0:
                f.normal_flip()
    bm.normal_update()
    return liso(_malla_en_escena(nombre, bm, mats), angulo=40)


def turbofan(nombre, en, largo, diametro, cubierta="capo", espejo_=True):
    """
    Un turbofán de verdad: labio, fan, tobera de derivación, núcleo y cono.

    Lo que tenía era un huevo con un disco negro delante. Un turbofán visto
    desde la plataforma son cinco cosas, y las cinco se cuentan:

    - **El labio de la toma**, de metal y redondo, que se ve por dentro y por
      fuera: la boca tiene grosor.
    - **El fan**, al fondo de la toma y no a ras de ella, con su cono en
      medio. Es lo que hace que la boca se lea como un agujero.
    - **La cubierta**, que es donde va el color de la compañía.
    - **La tobera del aire frío**, más estrecha que la boca, y por ella se
      asoma el **núcleo**: un cilindro gris más fino que sale por detrás.
    - **El cono de escape**, al final del núcleo.

    Todo de un solo perfil, recorrido con la materia a la derecha. Ver
    `torno`.
    """
    L, R = largo, diametro / 2
    f = -L / 2
    perfil_ = [
        (f + 0.20 * L, 0.0, "oscuro"),          # punta del cono del fan
        (f + 0.27 * L, 0.24 * R),
        (f + 0.29 * L, 0.26 * R),
        (f + 0.29 * L, 0.85 * R),               # la cara del fan
        (f + 0.10 * L, 0.86 * R, "gris"),      # la pared de la toma
        (f + 0.02 * L, 0.87 * R, "aluminio"),  # el labio
        (f + 0.000 * L, 0.92 * R),
        (f + 0.012 * L, 0.975 * R),
        (f + 0.05 * L, 1.0 * R, cubierta),     # la cubierta
        (f + 0.30 * L, 1.0 * R),
        (f + 0.52 * L, 0.95 * R),
        (f + 0.66 * L, 0.84 * R),               # la tobera fría
        (f + 0.655 * L, 0.80 * R, "oscuro"),
        (f + 0.60 * L, 0.74 * R),
        (f + 0.62 * L, 0.58 * R, "gris"),       # el núcleo asoma
        (f + 0.70 * L, 0.56 * R),
        (f + 0.86 * L, 0.46 * R),
        (f + 0.865 * L, 0.40 * R, "oscuro"),
        (f + 0.85 * L, 0.34 * R, "aluminio"),   # el cono de escape
        (f + 0.92 * L, 0.22 * R),
        (f + 1.00 * L, 0.0),
    ]
    obj = torno(nombre, perfil_, en=en, lados=36, material_=cubierta)
    if espejo_:
        espejo(obj)
    return obj


def cono_de_helice(nombre, en, radio, largo=None, material_="capo"):
    """
    El cono de una hélice: una ojiva, no un cono de helado.

    Mira al frente —z negativa— con la punta estrecha delante, que es lo que
    comprueba `exportar`. Detrás lleva el plato, un pelo más ancho.
    """
    largo = radio * 2.3 if largo is None else largo
    perfil_ = [(-largo, 0.0)]
    for i in range(1, 8):
        a = i / 8
        r = radio * math.sqrt(1 - (1 - a) ** 2)
        perfil_.append((-largo + largo * a, r))
    perfil_ += [(0.0, radio), (0.0, radio * 1.02), (largo * 0.08, radio * 1.02),
                (largo * 0.08, 0.0)]
    return torno(nombre, perfil_, en=en, lados=24, material_=material_)


def palas(nombre, en, radio, cuantas, raiz, cuerda=None, material_="oscuro",
          punta="punta-de-pala", paso_raiz=48, paso_punta=16, giro=1):
    """
    Las palas de una hélice, con forma de pala: `nombre-palas` y sus puntas.

    Eran cajas. Una pala de verdad es un ala pequeña y retorcida: estrecha en
    la raíz, más ancha a dos tercios y redonda en la punta, muy calada junto
    al buje y casi plana en el extremo —porque ahí va mucho más deprisa—.
    Todo eso se ve cuando la hélice está parada en la plataforma, que es
    cuando más se mira.

    **Van todas en una malla**, y las puntas amarillas en otra. Las dos llevan
    `pala` en el nombre, que es por donde el juego las encuentra para
    desvanecerlas cuando giran, y `helice`, que es por donde las junta con su
    cono. Ver `discoDeHelice` y `ejesDeHelice` en `aeronave-modelo.ts`.
    """
    cuerda = radio * 0.16 if cuerda is None else cuerda
    ox, oy, oz = en
    fracciones = [0.0, 0.12, 0.35, 0.6, 0.8, 0.92, 1.0]
    anchos = [0.55, 0.85, 1.0, 1.0, 0.9, 0.72, 0.42]
    gruesos = [0.18, 0.13, 0.10, 0.085, 0.075, 0.07, 0.06]
    corte = 0.9  # a partir de aquí, la punta pintada

    def una(i, desde, hasta, con_raiz):
        ang = giro * math.tau * i / cuantas
        ca, sa = math.cos(ang), math.sin(ang)
        est = []
        for f_, a_, g_ in zip(fracciones, anchos, gruesos):
            if f_ < desde - 1e-6 or f_ > hasta + 1e-6:
                continue
            est.append((f_, a_, g_))
        # Los extremos exactos del tramo, interpolados.
        def inter(x):
            for (f0, a0, g0), (f1, a1, g1) in zip(
                    zip(fracciones, anchos, gruesos),
                    list(zip(fracciones, anchos, gruesos))[1:]):
                if f0 <= x <= f1:
                    k = (x - f0) / (f1 - f0)
                    return (x, a0 + (a1 - a0) * k, g0 + (g1 - g0) * k)
            return (x, anchos[-1], gruesos[-1])
        if not est or abs(est[0][0] - desde) > 1e-6:
            est.insert(0, inter(desde))
        if abs(est[-1][0] - hasta) > 1e-6:
            est.append(inter(hasta))
        salida = []
        for f_, a_, g_ in est:
            r = raiz + (radio - raiz) * f_
            beta = math.radians(paso_raiz + (paso_punta - paso_raiz) * f_)
            # La pala sale por la x local; la cuerda está en el plano del
            # disco inclinada `beta`, con el borde de ataque delante.
            c = cuerda * a_
            cd = Vector((0, -giro * math.cos(beta), math.sin(beta)))
            gd = Vector((0, -giro * math.sin(beta), -math.cos(beta)))
            # El eje de la pala pasa por un tercio de la cuerda.
            p = Vector((r, 0, 0)) - cd * (c * 0.33)
            gira = lambda v: Vector((v.x * ca - v.y * sa, v.x * sa + v.y * ca, v.z))
            salida.append(estacion(
                gira(p) + Vector((ox, oy, oz)), c, g_,
                gira(cd), gira(gd)))
        return salida

    piezas = []
    for cual, desde, hasta, mat in (("palas", 0.0, corte, material_),
                                    ("puntas", corte, 1.0, punta)):
        objs = []
        for i in range(cuantas):
            objs.append(superficie(f"{nombre}-{cual}-{i}", una(i, desde, hasta, True),
                                   material_=mat, curvatura=0.03,
                                   puntos=9, simetria=False,
                                   punta=(hasta >= 1.0), angulo=60))
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        objs[0].name = f"{nombre}-{'palas' if cual == 'palas' else 'palas-puntas'}"
        objs[0].data.name = objs[0].name
        piezas.append(objs[0])
    return piezas


def helice(nombre, en, radio, cuantas, buje, cuerda=None, cono="capo",
           largo_cono=None, giro=1):
    """
    Una hélice entera: el cono con su nombre y las palas colgando de él.

    El contrato con el juego es el de `comun.helice`, y no se toca: el cono se
    llama `nombre` —que lleva «helice»—, mira al frente, y las palas cuelgan
    de él con la inversa del padre para no moverse al colgarlas.
    """
    c = cono_de_helice(nombre, en, buje, largo=largo_cono, material_=cono)
    piezas = palas(nombre, en, radio, cuantas, raiz=buje * 0.75,
                   cuerda=cuerda, giro=giro)
    for p in piezas:
        p.parent = c
        p.matrix_parent_inverse = c.matrix_world.inverted()
    return piezas + [c]


# ── El tren ───────────────────────────────────────────────────────────────


def _tubo(bm, a, b, r, lados=10):
    """Un cilindro tapado entre dos puntos, dentro de un bmesh."""
    a, b = Vector(a), Vector(b)
    eje = (b - a).normalized()
    ref = Vector((1, 0, 0)) if abs(eje.x) < 0.9 else Vector((0, 1, 0))
    u = eje.cross(ref).normalized()
    v = eje.cross(u).normalized()
    ra, rb = [], []
    for i in range(lados):
        ang = math.tau * i / lados
        d = u * math.cos(ang) * r + v * math.sin(ang) * r
        ra.append(bm.verts.new(a + d))
        rb.append(bm.verts.new(b + d))
    for i in range(lados):
        j = (i + 1) % lados
        bm.faces.new((ra[i], ra[j], rb[j], rb[i]))
    bm.faces.new(list(reversed(ra)))
    bm.faces.new(rb)


def varillas(nombre, tramos, material_="gris", lados=10, simetria=False):
    """
    Varios tubos en una sola malla: `(desde, hasta, radio)` cada uno.

    Es de lo que está hecha una pata de tren: la caña gruesa, el vástago del
    amortiguador que sale de ella, el compás que impide que gire y el eje de
    la rueda. Por separado serían cuatro objetos por pata; juntos, uno.
    """
    bm = bmesh.new()
    for a, b, r in tramos:
        _tubo(bm, a, b, r, lados)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = _malla_en_escena(nombre, bm, [material_])
    if simetria:
        espejo(obj)
    return liso(obj, angulo=40)


def neumaticos(nombre, centros, radio, ancho, simetria=False):
    """
    Ruedas con su neumático redondeado: el hombro de goma, no un disco.

    Van juntas en una malla —todas las de un tren— y la llanta aparte, en
    `llantas`, porque es de otro material y en este juego una malla con dos
    materiales se parte en dos al cargarla, y las patas se buscan por nombre.
    Ver `world/patas.ts`.
    """
    a, r = ancho / 2, radio
    perfil_ = [
        (-a * 0.70, r * 0.58), (-a * 0.95, r * 0.70), (-a, r * 0.84),
        (-a * 0.86, r * 0.97), (-a * 0.5, r), (a * 0.5, r), (a * 0.86, r * 0.97),
        (a, r * 0.84), (a * 0.95, r * 0.70), (a * 0.70, r * 0.58),
    ]
    # Se cierra por dentro para que sea un sólido: vuelta al primer punto.
    perfil_.append(perfil_[0])
    objs = []
    for i, c in enumerate(centros):
        objs.append(torno(f"{nombre}-{i}", perfil_, en=c, lados=24, eje="x",
                          material_="goma"))
    return _juntar(nombre, objs, simetria)


def llantas(nombre, centros, radio, ancho, simetria=False):
    """La llanta de cada rueda: un disco metálico hundido en el neumático."""
    a, r = ancho / 2, radio
    perfil_ = [
        (-a * 0.72, 0.0), (-a * 0.72, r * 0.18), (-a * 0.62, r * 0.24),
        (-a * 0.62, r * 0.58), (a * 0.62, r * 0.58), (a * 0.62, r * 0.24),
        (a * 0.72, r * 0.18), (a * 0.72, 0.0),
    ]
    objs = []
    for i, c in enumerate(centros):
        objs.append(torno(f"{nombre}-{i}", perfil_, en=c, lados=16, eje="x",
                          material_="aluminio"))
    return _juntar(nombre, objs, simetria)


def _juntar(nombre, objs, simetria=False):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = objs[0]
    o.name = nombre
    o.data.name = f"m-{nombre}"
    if simetria:
        espejo(o)
    return o


def juntar(nombre, objs):
    """Varias piezas del mismo material en una sola malla, con ese nombre."""
    return _juntar(nombre, objs)


def dentro_de(piel, objetos, margen=0.0):
    """
    Lo que se sale de la piel, dicho en voz alta y sin parar la exportación.

    La cabina la monta otra función —`cabina` en `comun.py`— con sus propias
    medidas, y el fuselaje se dibuja aquí. Si el fuselaje adelgaza y la cabina
    no se entera, el panel asoma por fuera del morro, y eso no lo ve nadie
    hasta que alguien da una vuelta alrededor del avión. Esto lo cuenta al
    exportar.
    """
    fuera = []
    for o in objetos:
        if o.type != "MESH":
            continue
        peor = 0.0
        for v in o.data.vertices:
            p = o.matrix_world @ v.co
            if not (piel.z0 < p.z < piel.z1):
                continue
            w, yt, yb, ym, n = piel.seccion(p.z)
            if p.y > yt - margen or p.y < yb + margen:
                peor = max(peor, max(p.y - yt, yb - p.y) + margen)
                continue
            b = (yt - ym) if p.y >= ym else (ym - yb)
            k = abs(p.y - ym) / max(b, 1e-6)
            ancho = w * (1 - k ** n) ** (1 / n) if k < 1 else 0.0
            if abs(p.x - piel.x) > ancho - margen:
                peor = max(peor, abs(p.x - piel.x) - ancho + margen)
        if peor > 0.005:
            fuera.append(f"{o.name} +{peor:.2f}")
    if fuera:
        print("FUERA DE LA PIEL: " + " · ".join(fuera))
    return fuera


def centro_de_gravedad(z, y=0.0):
    """
    Dónde está el centro de gravedad, para que el juego gire el avión por ahí.

    Es un vacío con nombre, sin geometría. El cargador lo busca y pone el
    origen del avión en él en vez de en el centro de la caja. Ver
    `cargarModelo` en `aeronave-modelo.ts`.
    """
    bpy.ops.object.empty_add(location=(0.0, y, z))
    o = bpy.context.object
    o.name = "centro-de-gravedad"
    return o


def zy(piel, z, y, lado=1):
    """Una esquina dada por su altura, en las `(z, t)` que come `paneles`."""
    return (z, math.degrees(piel.t_de_y(z, y, lado)))
