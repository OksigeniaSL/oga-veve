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
from mathutils import Matrix, Vector

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
        # Las tapas, si la punta no se cierra sola, del color de su zona: la
        # cara de delante del capó de un radial es la del motor, no chapa.
        for anillo, z in ((anillos[0], anillos_z[0]),
                          (anillos[-1], anillos_z[-1])):
            if len(anillo) > 1:
                bm.faces.new(anillo).material_index = zona(z, 0.0)
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
               angulo=35, flaps=(), marcar=False):
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

    `flaps` son los que se mueven —ver `flap` y `flaps_moviles`—: aquí solo
    se asegura que haya anillo donde empieza y acaba cada uno y corte de
    cuerda donde está su bisagra, y se marca cada vértice con su anillo y su
    punto del perfil. Con eso `flaps_moviles` sabe, sin adivinar por la
    geometría, qué caras son de la franja del flap.
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
    # **Y los anillos que solo hacen falta para cortar un flap, encima de las
    # aristas que ya había.** Donde un flap empieza en una junta pintada, el
    # anillo ya existe; donde no —al lado de una góndola—, uno nuevo sacado
    # de las cuatro cifras de la sección bombeaba la chapa medio milímetro y
    # se notaba en el borde de salida y en el sombreado. Sacado de los
    # vértices de los dos anillos de al lado, cae justo sobre la arista que
    # los unía y el ala recogida sigue siendo la misma superficie.
    for e in sorted(set(x for f in flaps for x in (f["e0"], f["e1"])
                        if 0 < x < eta[-1])):
        if any(abs(e - x) < 1e-4 for x in eta):
            continue
        viejos = [k for k in range(len(est)) if "entre" not in est[k]]
        ka = max(k for k in viejos if eta[k] < e)
        kb = min(k for k in viejos if eta[k] > e)
        f = (e - eta[ka]) / (eta[kb] - eta[ka])
        a, b = est[ka], est[kb]
        nueva = {
            "pos": a["pos"].lerp(b["pos"], f),
            "c": a["c"] + (b["c"] - a["c"]) * f,
            "t": a["t"] + (b["t"] - a["t"]) * f,
            "cd": a["cd"].lerp(b["cd"], f).normalized(),
            "gd": a["gd"].lerp(b["gd"], f).normalized(),
            "entre": (a, b, f),
        }
        i = max(k for k in range(len(eta)) if eta[k] < e)
        est.insert(i + 1, nueva)
        eta.insert(i + 1, e)

    # La cuerda repartida en coseno —más puntos en el borde de ataque, que es
    # donde se curva— y con los cortes de las zonas dentro.
    us = {0.5 * (1 - math.cos(math.pi * i / (puntos - 1))) for i in range(puntos)}
    us |= {u for z in zonas for u in (z[3], z[4]) if 0 < u < 1}
    us |= {u for u in cortes if 0 < u < 1}
    us |= {f["u0"] for f in flaps if 0 < f["u0"] < 1}
    us = sorted(us)
    # El contorno: del borde de salida por arriba al de ataque, y vuelta por
    # abajo. El de salida es un solo vértice: el perfil cierra en filo.
    bucle = [(1.0, 0)] + [(u, 1) for u in reversed(us[1:-1])] + [(0.0, 0)] + \
        [(u, -1) for u in us[1:-1]]

    mats = list(dict.fromkeys([material_] + [z[0] for z in zonas]))
    bm = bmesh.new()
    # Solo si hay flaps que sacar: el anillo y el punto del perfil de cada
    # vértice. Las demás superficies salen exactamente como salían.
    marcar = marcar or bool(flaps)
    if marcar:
        capa_anillo = bm.verts.layers.int.new("anillo")
        capa_punto = bm.verts.layers.int.new("punto")
    def en_el_perfil(e, u, lado):
        if "entre" in e:
            a, b, f = e["entre"]
            return en_el_perfil(a, u, lado).lerp(en_el_perfil(b, u, lado), f)
        yt, yc = _naca(u, e["t"], curvatura)
        v = yc + lado * yt
        return e["pos"] + e["cd"] * (u * e["c"]) + e["gd"] * (v * e["c"])

    anillos = []
    for i, e in enumerate(est):
        anillo = []
        for j, (u, lado) in enumerate(bucle):
            vert = bm.verts.new(en_el_perfil(e, u, lado))
            if marcar:
                vert[capa_anillo] = i
                vert[capa_punto] = j
            anillo.append(vert)
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
        if marcar:
            tip[capa_anillo] = -1
            tip[capa_punto] = -1
        for j in range(n):
            bm.faces.new((anillos[-1][j], anillos[-1][(j + 1) % n], tip))
    else:
        bm.faces.new(anillos[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = _malla_en_escena(nombre, bm, mats)
    if flaps:
        # Lo que `flaps_moviles` necesita saber de la rejilla. Va aparte y no
        # en las propiedades del objeto porque éstas se exportan al glTF.
        rejilla = {"eta": eta, "bucle": bucle}
        if any("entre" in e for e in est):
            # **Y el ala sin los anillos de los flaps, para sacarle las
            # normales.** Un anillo nuevo, aunque caiga encima de las aristas,
            # cambia un pelo la normal de sus vecinos —medido: dos décimas de
            # grado— y eso son bandas de un tono en el flap del bimotor. Con
            # las del ala de siempre, el sombreado es el de siempre.
            viejo = superficie(
                f"{nombre}-sin-cortes", estaciones, material_, curvatura,
                zonas, tuple(cortes) + tuple(f["u0"] for f in flaps), puntos,
                simetria, punta, angulo, marcar=True)
            nuevos = [i for i, e in enumerate(est) if "entre" not in e]
            rejilla["viejo"] = viejo.name
            rejilla["de_viejo"] = nuevos
            rejilla["entre"] = {
                i: (next(k for k, x in enumerate(est) if x is e["entre"][0]),
                    next(k for k, x in enumerate(est) if x is e["entre"][1]),
                    e["entre"][2])
                for i, e in enumerate(est) if "entre" in e
            }
        _REJILLAS[obj.name] = rejilla
    if simetria:
        espejo(obj)
    return liso(obj, angulo=angulo)


_REJILLAS = {}


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

    **Y abierto por detrás.** Con el plato cerrado, desde el asiento se veía
    un disco del color del capó flotando sobre el panel: la cara de atrás del
    cono mira al piloto, y el capó que la tapa de verdad no se dibuja desde
    dentro —toda la chapa lleva la cara de atrás quitada—. Abierto, lo que
    mira al piloto es el interior del cono, que tampoco se dibuja.
    """
    largo = radio * 2.3 if largo is None else largo
    perfil_ = [(-largo, 0.0)]
    for i in range(1, 8):
        a = i / 8
        r = radio * math.sqrt(1 - (1 - a) ** 2)
        perfil_.append((-largo + largo * a, r))
    perfil_ += [(0.0, radio), (0.0, radio * 1.02), (largo * 0.08, radio * 1.02)]
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


def bisagra(nombre, en, eje, grados, piezas, simetria=False):
    """
    La pata que se mete: sus piezas colgadas de un vacío puesto en la bisagra.

    **Un tren se recoge girando, no subiendo.** Cada pata cuelga de un eje
    —el muñón, arriba, clavado en el ala, la góndola o la panza— y da un
    cuarto de vuelta hasta su pozo con las ruedas pegadas a ella, como un
    sólido. Antes se deslizaba hacia arriba, y como la pieza vive dentro del
    nodo `avion`, que va girado para pasar de los ejes de aquí a los de
    Blender, su «arriba» era en realidad «hacia atrás»: se la veía irse de
    espaldas, desplegada, y desaparecer. «Un intento de recogerlo que salió
    mal», y lo era.

    El vacío se llama `bisagra-…` y lleva en sus propiedades **el eje y el
    ángulo**, en los ejes del avión (x a la derecha, y arriba, z a la cola):
    girando `grados` alrededor de `eje` por la regla de la mano derecha, la
    pata queda dentro. El juego no sabe nada de cada avión; lee eso y gira.
    Ver `world/patas.ts`.

    Con `simetria`, la otra pata sale **como objeto aparte** y reflejada, con
    su bisagra reflejada: el espejo de siempre no vale, porque dejaría las
    dos patas en una malla y una misma rotación mete la derecha hacia dentro
    y la izquierda hacia fuera. Un eje, bajo el reflejo en x, cambia de signo
    en y y en z —es un vector axial—, y eso es lo que hace que las dos se
    metan hacia el mismo sitio.

    Devuelve los vacíos y las piezas, para sumarlos a las del avión.
    """
    lados = [("derecha", 1)] + ([("izquierda", -1)] if simetria else [])
    salida = []
    for lado, s in lados:
        suf = f"-{lado}" if simetria else ""
        bpy.ops.object.empty_add(location=(en[0] * s, en[1], en[2]))
        b = bpy.context.object
        b.name = f"bisagra-{nombre}{suf}"
        b["eje"] = [float(eje[0]), float(eje[1]) * s, float(eje[2]) * s]
        b["grados"] = float(grados)
        bpy.context.view_layer.update()
        salida.append(b)
        for p in piezas:
            h = p if s > 0 else _reflejo(p)
            h.name = f"{p.name.removesuffix('-derecha')}{suf}"
            h.data.name = f"m-{h.name}"
            h.parent = b
            h.matrix_parent_inverse = b.matrix_world.inverted()
            salida.append(h)
    return salida


def _reflejo(obj):
    """Una copia de la pieza, reflejada en x y con la malla ya horneada."""
    malla = obj.data.copy()
    malla.transform(Matrix.Scale(-1, 4, (1, 0, 0)) @ obj.matrix_world)
    # Un reflejo vuelve del revés las caras: sin esto la pata de la izquierda
    # se vería por dentro.
    malla.flip_normals()
    copia = obj.copy()
    copia.data = malla
    copia.matrix_world = Matrix.Identity(4)
    bpy.context.collection.objects.link(copia)
    return copia


# ── Los flaps ─────────────────────────────────────────────────────────────


def flap(nombre, e0, e1, u0):
    """
    Un flap que se mueve: de `e0` a `e1` metros a lo largo del ala y desde
    `u0` de la cuerda hasta el borde de salida.

    **Es la franja que ya estaba pintada**, con las mismas cifras que la zona
    que la dibujaba: las juntas oscuras se quedan en el ala y el flap es lo
    de dentro de ellas. Así el corte cae justo en la raya oscura y, recogido,
    no hay costura nueva que ver. Ver `flaps_moviles`.

    O un trozo de ella, cuando parte de la franja no puede bajar: la que va
    metida en el carenado de la panza, o la que pasa por encima de una
    góndola. Esa se queda quieta, que es lo que hace en un avión de verdad.
    """
    return {"nombre": nombre, "e0": e0, "e1": e1, "u0": u0}


def ranurado(muescas, recorrido, ranura=0.015, solape=0.005):
    """
    Un flap ranurado, el de una avioneta o un turbohélice.

    Sale un poco hacia atrás por unos carriles cortos que van por dentro del
    ala, y baja a la vez. Recogido, **su nariz va metida bajo el labio del
    extradós**; fuera, queda justo debajo de él, y entre los dos se abre la
    ranura: un canal estrecho por el que el aire del intradós pasa al
    extradós y le pega la corriente al flap. Es estrecha —un par de
    centésimas de la cuerda— y por eso funciona: una ranura ancha no es una
    ranura, es un agujero, y el flap de detrás se queda sin aire.

    `muescas`: los grados de cada tope de la palanca, empezando por el cero
    de recogido. `recorrido`: cuánto ha salido hacia atrás en cada tope, en
    cuerdas del flap; en uno ranurado, poco y parejo con el ángulo.
    `ranura` y `solape`: dónde queda la nariz respecto del labio en el último
    tope, en cuerdas del ala. Ver `_disenar_flap`.

    Y **sus carriles se ven** con el flap fuera: dos por flap, por dentro de
    la cala, llegando hasta la nariz. En un avión de línea van dentro de las
    canoas; en una avioneta no hay canoas, y un flap que baja sin nada que
    lo sujete no es un flap. Ver `_carriles`.
    """
    return {"tipo": "ranurado", "muescas": list(muescas),
            "recorrido": list(recorrido), "ranura": ranura, "solape": solape,
            "carriles": (0.2, 0.8)}


def fowler(muescas, recorrido, ranura=0.015, solape=0.005):
    """
    Un flap Fowler, el de un avión de línea: **primero sale hacia atrás** por
    sus carriles y luego baja.

    Es lo que hace que un reactor pueda aterrizar despacio: al salir hacia
    atrás el ala se hace más grande —más cuerda, más superficie— y al bajar
    se curva. Las primeras muescas son casi todo carril y poco ángulo, para
    despegar sin mucha resistencia; las últimas, ángulo, para frenar y bajar.

    Por eso recogido lleva **una buena parte metida bajo los spoilers**: lo
    que luego sale es lo que estaba guardado ahí. Y al final se queda como el
    ranurado, con la nariz justo bajo el labio y la ranura estrecha.

    `recorrido`: cuánto ha salido en cada muesca, en cuerdas del flap.
    `ranura` y `solape`, como en `ranurado`.
    """
    return {"tipo": "fowler", "muescas": list(muescas),
            "recorrido": list(recorrido), "ranura": ranura, "solape": solape}


def flaps_moviles(ala, flaps, movimiento, hueco="oscuro"):
    """
    Saca los flaps del ala como piezas propias, colgadas de su carril.

    **Recogidos, el avión tiene que verse exactamente igual que antes**, y
    eso manda sobre cómo se hace:

    - **Las mismas caras.** El flap es la franja que el ala ya tenía, con sus
      vértices tal cual, no un flap nuevo puesto encima. Encima habría dos
      superficies en el mismo sitio y parpadearían.
    - **Las mismas normales.** Un ala lisa promedia la normal de cada vértice
      con las caras de alrededor, y al partirla los vértices del corte se
      quedarían con la mitad de sus caras: se vería una raya de sombreado
      donde antes no había nada. Así que antes de partir se leen las normales
      de cada esquina y después se le ponen tal cual a cada trozo.
    - **Lo nuevo, solo por dentro.** La nariz del flap, el labio, la cala en
      la que se guarda y las paredes de los lados van en mallas aparte —las
      tapas y el hueco— que caen enteras dentro del ala y que el juego no
      dibuja con el flap recogido. Recogido, el avión es exactamente las
      caras que tenía antes. Ver `_nariz_y_cala`.

    **Y fuera, lo que se ve es lo de un ala de verdad.** El flap no es el
    trozo de atrás del ala cortado a hachazo: tiene nariz redonda, y recogido
    la lleva guardada en una cala, bajo el labio del extradós. Al salir no
    deja una pared roma del grueso del ala, sino una ranura estrecha entre el
    labio y la nariz, con la cala oscura detrás. Ver `_disenar_flap`.

    El espejo del ala se aplica aquí: cada flap sale por separado a cada
    lado, con su propio carril, igual que las patas en `bisagra` y por lo
    mismo — una sola malla para los dos no puede girar hacia abajo por los
    dos lados a la vez.

    Cada flap cuelga de un vacío `flap-…` puesto en el origen, con, en los
    ejes del avión:

    - `bisagra` y `eje`: por dónde pasa el eje sobre el que gira —el de las
      ruedas de su carro, dentro de la nariz— y hacia dónde va; girando por
      la regla de la mano derecha, el borde de salida baja.
    - `muescas`: los grados en cada tope de la palanca. Tienen que ser los de
      `muescasDeFlaps` en la ficha del avión —ver `aircraft.ts`—, que es lo
      que rotula la regla del cuadro; lo comprueba
      `world/flaps-del-modelo.test.ts`.
    - `carril` y `recorrido`: hacia dónde sale y cuántos metros en cada tope.

    Del vacío cuelgan la piel del flap y sus tapas; el hueco que deja en el
    ala va aparte, como `hueco-flap-…`. El juego no sabe nada de cada avión:
    lee eso y mueve. Ver `world/flaps.ts`.

    El corte de cuerda de un flap tiene que caer en uno que ya pinte una
    zona —la raya de la junta—: un corte nuevo cambiaría el perfil del ala
    entera. Los extremos, en cambio, pueden caer donde haga falta; ver los
    anillos «entre» de `superficie`.
    """
    rej = _REJILLAS.pop(ala.name)
    eta, bucle = rej["eta"], rej["bucle"]
    n = len(bucle)
    j_ba = bucle.index((0.0, 0))

    for f in flaps:
        f["i0"] = next(i for i, e in enumerate(eta) if abs(e - f["e0"]) < 1e-4)
        f["i1"] = next(i for i, e in enumerate(eta) if abs(e - f["e1"]) < 1e-4)
        f["jt"] = bucle.index((f["u0"], 1))
        f["jb"] = bucle.index((f["u0"], -1))
        # Del intradós en la bisagra, hacia atrás hasta el borde de salida y
        # vuelta por el extradós hasta la bisagra: el perfil del flap.
        f["cadena"] = list(range(f["jb"], n)) + list(range(0, f["jt"] + 1))
        f["puntos"] = set(f["cadena"])

    # El espejo, aplicado: las dos alas en una malla, como las escribe el
    # exportador. Y las normales de cada esquina, leídas ya con él.
    bpy.ops.object.select_all(action="DESELECT")
    ala.select_set(True)
    bpy.context.view_layer.objects.active = ala
    for m in list(ala.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    me = ala.data
    antes = [0.0] * (3 * len(me.loops))
    me.corner_normals.foreach_get("vector", antes)
    if "viejo" in rej:
        _normales_sin_cortes(me, antes, rej)
    me.attributes.new("normal-de-antes", "FLOAT_VECTOR", "CORNER") \
        .data.foreach_set("vector", antes)

    def de_quien(cara, ca, cp):
        """De qué flap y de qué lado es esta cara, o `None` si es del ala."""
        for k, f in enumerate(flaps):
            if all(f["i0"] <= v[ca] <= f["i1"] and v[cp] in f["puntos"]
                   for v in cara.verts):
                return k, (1 if cara.calc_center_median().x > 0 else -1)
        return None

    def indice(bm):
        ca = bm.verts.layers.int["anillo"]
        cp = bm.verts.layers.int["punto"]
        return ca, cp, {(v[ca], v[cp], 1 if v.co.x > 0 else -1): v
                        for v in bm.verts if v.link_faces}

    def quitar(bm, caras):
        """Quita esas caras y lo que se quede suelto."""
        bmesh.ops.delete(bm, geom=caras, context="FACES")
        sueltos = [v for v in bm.verts if not v.link_faces]
        bmesh.ops.delete(bm, geom=sueltos, context="VERTS")

    salida = []
    lados = ((1, "derecha"), (-1, "izquierda"))
    # Dónde está cada flap y por dónde se corta, leído del ala entera.
    bm = bmesh.new()
    bm.from_mesh(me)
    ca, cp, entera = indice(bm)
    entera = {k: v.co.copy() for k, v in entera.items()}
    centros = {}
    for cara in bm.faces:
        quien = de_quien(cara, ca, cp)
        if quien:
            centros.setdefault(quien, []).append(cara.calc_center_median())
    centros = {k: sum(v, Vector()) / len(v) for k, v in centros.items()}
    bm.free()

    def en(i, j, s):
        return entera[(i, j, s)].copy()

    # ── Cada flap, una pieza ──────────────────────────────────────────────
    for k, f in enumerate(flaps):
        for s, lado in lados:
            nombre = f"flap-{f['nombre']}-{lado}"
            bm = bmesh.new()
            bm.from_mesh(me)
            ca, cp, _ = indice(bm)
            quitar(bm, [c for c in bm.faces if de_quien(c, ca, cp) != (k, s)])
            malla = bpy.data.meshes.new(f"m-{nombre}-piel")
            bm.to_mesh(malla)
            bm.free()
            for mat in me.materials:
                malla.materials.append(mat)
            _normales_de_antes(malla)
            piel = bpy.data.objects.new(f"{nombre}-piel", malla)
            bpy.context.collection.objects.link(piel)

            anillos = range(f["i0"], f["i1"] + 1)
            secciones = [_seccion(en, i, s, f["jt"], f["jb"], j_ba)
                         for i in anillos]
            cuerda = sum((en(i, 0, s) - (en(i, f["jt"], s)
                                         + en(i, f["jb"], s)) / 2).length
                         for i in (f["i0"], f["i1"])) / 2
            d = _disenar_flap(secciones, movimiento, cuerda)
            cadenas = [[en(i, j, s) for j in f["cadena"]]
                       for i in (f["i0"], f["i1"])]
            tapas, agujero = _nariz_y_cala(
                nombre, secciones, d, cadenas, me.materials[0].name, hueco,
                centros[(k, s)])
            if movimiento.get("carriles"):
                salida.append(_carriles(f"hueco-{nombre}-carriles",
                                        secciones, d, movimiento["carriles"]))

            # **El vacío va en el origen, no en la bisagra**, y la bisagra va
            # escrita en él: así, recogido, el flap cuelga de la misma matriz
            # que el ala y no de un «ir a la bisagra y volver» en coma
            # flotante, que no da exactamente cero.
            bpy.ops.object.empty_add(location=(0.0, 0.0, 0.0))
            b = bpy.context.object
            b.name = nombre
            b["bisagra"] = [float(c) for c in d["bisagra"]]
            b["eje"] = [float(c) for c in d["eje"]]
            b["muescas"] = [float(g) for g in movimiento["muescas"]]
            b["carril"] = [float(c) for c in d["carril"]]
            b["recorrido"] = [float(r) for r in d["recorrido"]]
            bpy.context.view_layer.update()
            for h in (piel, tapas):
                h.parent = b
                h.matrix_parent_inverse = b.matrix_world.inverted()
            # Por dónde pasa el flap en cada anillo, para que las canoas se
            # partan en su sitio: el eje de giro y dónde acaba la punta de la
            # nariz en el último tope. Ver `canoas_con_flap`.
            _JUNTAS[nombre] = [
                (abs(fo["centro"].x), fo["centro"].z,
                 (sec["P"] - sec["cd"] * movimiento["solape"] * sec["c"]).z)
                for sec, fo in zip(secciones, d["formas"])]
            salida += [b, piel, tapas, agujero]
            print(f"FLAP: {nombre} · cuerda {cuerda:.2f} m · "
                  f"{len(malla.polygons)} caras · " + d["resumen"])

    # ── Y el ala, sin ellos ──────────────────────────────────────────────
    bm = bmesh.new()
    bm.from_mesh(me)
    ca, cp, _ = indice(bm)
    quitar(bm, [c for c in bm.faces if de_quien(c, ca, cp)])
    bm.to_mesh(me)
    bm.free()
    _normales_de_antes(me)
    return salida


_JUNTAS = {}


def _seccion(en, i, s, jt, jb, j_ba):
    """
    Un anillo del ala en el tramo de un flap, en el plano de su perfil.

    `ξ` va a lo largo de la cuerda, del borde de ataque hacia atrás; `η`,
    hacia el extradós; `w`, lo poco que el anillo se sale de ese plano —un
    anillo «entre» es la mezcla de dos que no son del todo paralelos—, para
    que lo nuevo caiga sobre la chapa que ya había y no a un milímetro.
    """
    ba, bs = en(i, j_ba, s), en(i, 0, s)
    cd = (bs - ba).normalized()
    arriba, abajo = en(i, jt, s), en(i, jb, s)
    v = arriba - abajo
    gd = (v - cd * v.dot(cd)).normalized()
    nr = cd.cross(gd)

    def plano(p):
        d = p - ba
        return (d.dot(cd), d.dot(gd), d.dot(nr))

    return {
        "ba": ba, "cd": cd, "gd": gd, "nr": nr, "c": (bs - ba).length,
        "P": arriba, "L": abajo,
        # Las dos caras, del corte hacia el borde de ataque.
        "arriba": [plano(en(i, j, s)) for j in range(jt, j_ba + 1)],
        "abajo": [plano(en(i, j, s)) for j in range(jb, j_ba - 1, -1)],
    }


def _en_curva(curva, xi):
    """La altura `η` —y el `w`— de una cara del perfil en `ξ`, en línea recta
    entre sus vértices, que es como la dibuja la malla."""
    for (x0, y0, w0), (x1, y1, w1) in zip(curva, curva[1:]):
        if x1 <= xi <= x0:
            f = (x0 - xi) / (x0 - x1) if x0 > x1 else 0.0
            return y0 + (y1 - y0) * f, w0 + (w1 - w0) * f
    x0, y0, w0 = curva[0] if xi > curva[0][0] else curva[-1]
    return y0, w0


def _punto(sec, xi, eta, curva="arriba"):
    """Del plano del perfil al espacio."""
    w = _en_curva(sec[curva], xi)[1]
    return sec["ba"] + sec["cd"] * xi + sec["gd"] * eta + sec["nr"] * w


# Cuánto más adelgaza la nariz que el labio hacia la junta: la holgura entre
# la nariz guardada y el labio es `_HOLGURA - 1` veces el grosor del labio.
_HOLGURA = 1.5
# Cuánto queda la cala por delante de la nariz guardada, en cuerdas del ala.
_FONDO = 0.012
# El radio de la nariz, en fracción del medio grueso del ala en la junta.
_REDONDO = 0.65


def _disenar_flap(secciones, mov, cuerda_flap):
    """
    La nariz, la cala y el carril de un flap, sacados de dónde tiene que
    quedar al final.

    **Se diseña hacia atrás, desde el último tope**, que es lo que se mide en
    un flap de verdad: la ranura —del labio a la nariz— y el solape —cuánto
    queda la nariz por delante del labio—. De ahí sale todo lo demás:

    - **La nariz** es tan larga como lo que el flap sale por su carril: lo
      que sale es lo que estaba guardado. Es redonda, con el centro sobre el
      eje de giro, que es el de las ruedas de su carro: girar no la mueve de
      su sitio, así que el carril la lleva recta a donde se diseñó. Por
      arriba sigue al labio y por abajo sube desde la junta hasta la curva,
      como el vientre de un flap de verdad.
    - **La cala** es el hueco en el que se guarda, con un labio arriba y otro
      abajo que acaban en filo justo en la junta pintada. En filo porque ahí
      la chapa del ala y la del flap están a ras, y un labio con grosor en
      ese punto sería una raya nueva con el flap recogido.
    - **El labio adelgaza hacia atrás más deprisa que el perfil**, y la nariz
      con él. Si no, al salir hacia atrás la parte gorda de la nariz llegaría
      a donde el ala es más fina y asomaría por encima del labio: el perfil
      de un ala cae unas diez centésimas por cada unidad de cuerda en esa
      zona, y la nariz tiene que caer más.
    - **El carril**, uno para todo el flap, porque el flap es rígido: la media
      de lo que piden sus dos extremos para llevar su nariz a su sitio. En
      medio, el flap rígido deja la ranura que deja; se mide y se dice.

    Y luego **se comprueba moviéndolo**, tope a tope y entre topes, anillo a
    anillo: que la nariz no pise el labio ni se salga por la chapa mientras
    sale. Es lo que mide `holguras` en el resumen; una negativa no sale del
    guion. Ver `_holguras`.

    Todo en metros y en el plano de cada anillo; la cuerda cambia a lo largo
    del ala y la nariz no, así que en la punta la nariz es más larga en
    proporción.
    """
    c_media = sum(s["c"] for s in secciones) / len(secciones)
    recorrido = mov["recorrido"]
    nariz = recorrido[-1] * cuerda_flap + mov["solape"] * c_media

    # Primero, dónde iría el centro de la nariz de cada anillo por sí solo.
    # Los de los extremos fijan el eje de giro.
    naturales = []
    for sec in secciones:
        xi0, eta0, _ = sec["arriba"][0]
        cala = _cala(sec, xi0 - nariz - _FONDO * sec["c"])
        r = _REDONDO * (eta0 - sec["abajo"][0][1]) / 2
        xi_b = xi0 - nariz + r
        naturales.append(_punto(sec, xi_b, cala["nariz_arriba"](xi_b) - r))
    a, b = naturales[0], naturales[-1]
    eje = (b - a).normalized()
    bisagra = (a + b) / 2
    te = sum((s["ba"] + s["cd"] * s["c"] for s in secciones), Vector()) \
        / len(secciones)
    # Que girar en positivo baje el borde de salida, sea cual sea el lado:
    # en el izquierdo el eje va al revés.
    if eje.cross(te - bisagra).y > 0:
        eje = -eje

    # **Y luego cada nariz con su centro sobre el eje**, que es donde van las
    # ruedas del carro. En un flap recto es donde ya estaba; en uno que pasa
    # por el quiebro del ala, la junta hace codo y el eje no: con la nariz del
    # codo fuera del eje, al girar subía y pisaba el labio. Sobre el eje sale
    # más corta o más larga, y la ranura del codo, un poco más ancha.
    formas = []
    for sec in secciones:
        c = sec["c"]
        xi0, eta0, _ = sec["arriba"][0]
        eta_l0 = sec["abajo"][0][1]
        t = (sec["ba"] - bisagra).dot(sec["nr"]) / eje.dot(sec["nr"])
        v = bisagra + eje * t - sec["ba"]
        xi_b, m = v.dot(sec["cd"]), v.dot(sec["gd"])
        xi_c = xi0 - nariz - _FONDO * c
        for _ in range(3):
            cala = _cala(sec, xi_c)
            r = cala["nariz_arriba"](xi_b) - m
            xi_c = min(xi0 - nariz, xi_b - r) - _FONDO * c
        cala = _cala(sec, xi_c)
        r = cala["nariz_arriba"](xi_b) - m
        # Que quepa: la curva de la nariz por encima del labio de abajo.
        holgura_abajo = (m - r) - (cala["abajo"](xi_b) + cala["grueso"](xi_b))
        if holgura_abajo < 0.002 * c or r < 0.004 * c:
            raise SystemExit(
                f"La nariz del flap no cabe en su cala (radio {r:.3f} m, "
                f"holgura {holgura_abajo:.3f} m): el ala es demasiado fina "
                "para tanto recorrido. Ver `_disenar_flap`.")
        # El perfil de la nariz, de la junta de abajo a la de arriba. Por
        # abajo sube deprisa al salir de la junta y llega a la curva sin
        # codo: al girar, lo de detrás del eje baja, y el vientre de la nariz
        # tiene que ir por encima del labio de abajo desde el primer palmo.
        CUERPO, CURVA = 6, 8
        nar = [(xi0, eta_l0, "abajo")]
        for q in range(1, CUERPO):
            f = q / (CUERPO - 1)
            x = xi0 + (xi_b - xi0) * f
            nar.append((x, eta_l0 + (m - r - eta_l0) * (1 - (1 - f) ** 2),
                        "abajo"))
        for q in range(1, CURVA):
            ang = math.radians(270 - 180 * q / CURVA)
            nar.append((xi_b + r * math.cos(ang), m + r * math.sin(ang),
                        "arriba"))
        for q in range(CUERPO - 1, 0, -1):
            x = xi0 + (xi_b - xi0) * q / (CUERPO - 1)
            nar.append((x, cala["nariz_arriba"](x), "arriba"))
        nar.append((xi0, eta0, "arriba"))
        # Y la cala: el labio de abajo hacia delante, el fondo, y el de
        # arriba de vuelta al filo.
        LABIO = 6
        cal = [(xi0, eta_l0, "abajo")]
        for q in range(1, LABIO):
            x = xi0 + (xi_c - xi0) * q / (LABIO - 1)
            cal.append((x, cala["abajo"](x) + cala["grueso"](x), "abajo"))
        bajo = cala["abajo"](xi_c) + cala["labio"]
        alto = cala["arriba"](xi_c) - cala["labio"]
        for q in range(1, 3):
            cal.append((xi_c, bajo + (alto - bajo) * q / 3, "arriba"))
        for q in range(LABIO - 1, 0, -1):
            x = xi0 + (xi_c - xi0) * q / (LABIO - 1)
            cal.append((x, cala["arriba"](x) - cala["grueso"](x), "arriba"))
        cal.append((xi0, eta0, "arriba"))

        centro = _punto(sec, xi_b, m)
        # Y dónde tendría que acabar ese centro: la nariz a `ranura` del
        # filo del labio y su punta `solape` por delante de él.
        g = mov["ranura"] * c
        o = mov["solape"] * c
        dx = r - o
        dy = math.sqrt(max((r + g) ** 2 - dx * dx, 0.0))
        final = _punto(sec, xi0 + dx, eta0 - dy)
        formas.append({**cala, "xi0": xi0, "r": r, "nariz": nar, "cala": cal,
                       "centro": centro, "final": final})

    # El carril, uno para todo el flap: la media de lo que piden los dos
    # extremos, que son los que tienen la nariz donde se diseñó.
    viaje = ((formas[0]["final"] - formas[0]["centro"])
             + (formas[-1]["final"] - formas[-1]["centro"])) / 2
    largo = viaje.length
    ultimo = recorrido[-1] or 1.0
    d = {
        "formas": formas, "bisagra": bisagra, "eje": eje,
        "carril": viaje.normalized(),
        "recorrido": [largo * r / ultimo for r in recorrido],
        "muescas": list(mov["muescas"]),
    }
    h = _holguras(secciones, d)
    if min(h["labio"], h["abajo"], h["chapa"]) < 0:
        raise SystemExit(
            f"El flap pisa su cala al salir (labio {h['labio'] * 100:.2f} %, "
            f"abajo {h['abajo'] * 100:.2f} %, chapa {h['chapa'] * 100:.2f} % "
            "de la cuerda): se vería asomar por fuera del ala o meterse en "
            "el labio. Ver `_disenar_flap`.")
    d["holguras"] = h
    d["resumen"] = (
        f"nariz {nariz:.2f} m · carril {largo:.2f} m · "
        f"ranura {h['ranura'][0] * 100:.1f}–{h['ranura'][1] * 100:.1f} % · "
        f"solape {h['solape'][0] * 100:.1f}–{h['solape'][1] * 100:.1f} % · "
        f"labio {max(fo['labio'] / s['c'] for fo, s in zip(formas, secciones)) * 100:.1f} % · "
        f"holguras al salir: labio {h['labio'] * 100:.2f} %, "
        f"abajo {h['abajo'] * 100:.2f} %, chapa {h['chapa'] * 100:.2f} %")
    return d


def _cala(sec, xi_c):
    """
    La cala de un anillo si empieza en `xi_c`: dónde están sus labios y por
    dónde va la nariz guardada en ella.

    El labio acaba en filo en la junta y engorda hacia el fondo. Lo que
    engorda sale de lo que cae el extradós en ese tramo, más un margen: la
    nariz, que va `_HOLGURA` veces más separada, cae entonces más deprisa que
    el perfil, y al salir hacia atrás no asoma por encima del labio.
    """
    c = sec["c"]
    xi0 = sec["arriba"][0][0]
    largo = xi0 - xi_c

    def arriba(x):
        return _en_curva(sec["arriba"], x)[0]

    def abajo(x):
        return _en_curva(sec["abajo"], x)[0]

    xs = [xi_c + largo * q / 24 for q in range(25)]
    paso = largo / 24
    cae = max(0.0, max((arriba(a) - arriba(b)) / paso
                       for a, b in zip(xs, xs[1:])))
    labio = max(0.006 * c, (cae + 0.06) * largo / _HOLGURA)

    def grueso(x):
        return labio * max(0.0, min(1.0, (xi0 - x) / largo))

    def nariz_arriba(x):
        return arriba(x) - _HOLGURA * grueso(x)

    return {"xi_c": xi_c, "labio": labio, "arriba": arriba, "abajo": abajo,
            "grueso": grueso, "nariz_arriba": nariz_arriba}


def _mover_flap(d, p, donde):
    """Dónde está el punto `p` del flap con los flaps en `donde` (0 a 1), como
    lo mueve `world/flaps.ts`: por su carril y girando sobre su eje."""
    def en_la_muesca(tabla):
        k = min(2, int(donde * 3))
        f = donde * 3 - k
        return tabla[k] + (tabla[k + 1] - tabla[k]) * f
    giro = Matrix.Rotation(math.radians(en_la_muesca(d["muescas"])), 3,
                           d["eje"])
    return (giro @ (p - d["bisagra"]) + d["bisagra"]
            + d["carril"] * en_la_muesca(d["recorrido"]))


def _holguras(secciones, d):
    """
    **El flap, movido de verdad y medido anillo a anillo**, en fracciones de
    la cuerda de cada uno.

    - `labio`: lo más que se acerca la nariz al labio de arriba mientras
      sale; negativo, lo pisa.
    - `abajo`: lo mismo con el labio de abajo.
    - `chapa`: lo que queda entre la nariz y la chapa de fuera, arriba y
      abajo, delante de la junta; negativo, asoma por fuera del ala.
    - `ranura` y `solape`: los del último tope, lo más y lo menos a lo largo
      del flap —el flap es rígido y un anillo no queda como otro—.
    """
    peor = {"labio": math.inf, "abajo": math.inf, "chapa": math.inf}
    ranuras, solapes = [], []
    for sec, fo in zip(secciones, d["formas"]):
        c = sec["c"]
        base = [_punto(sec, x, e, cur) for x, e, cur in fo["nariz"][1:-1]]
        for q in range(1, 61):
            donde = q / 60
            for p in base:
                v = _mover_flap(d, p, donde) - sec["ba"]
                x, e = v.dot(sec["cd"]), v.dot(sec["gd"])
                if not (fo["xi_c"] < x < fo["xi0"] - 1e-4):
                    continue
                arriba, abajo = fo["arriba"](x), fo["abajo"](x)
                peor["chapa"] = min(peor["chapa"], (arriba - e) / c,
                                    (e - abajo) / c)
                peor["labio"] = min(peor["labio"],
                                    (arriba - fo["grueso"](x) - e) / c)
                peor["abajo"] = min(peor["abajo"],
                                    (e - abajo - fo["grueso"](x)) / c)
        fin = [_mover_flap(d, p, 1.0) for p in base]
        ranuras.append(min((p - sec["P"]).length for p in fin) / c)
        solapes.append(max((sec["P"] - p).dot(sec["cd"]) for p in fin) / c)
    return {**peor, "ranura": (min(ranuras), max(ranuras)),
            "solape": (min(solapes), max(solapes))}


def _nariz_y_cala(nombre, secciones, d, cadenas, material_flap, hueco,
                  centro_flap):
    """
    Lo que solo se ve con el flap fuera, en dos mallas que el juego apaga
    con el flap recogido.

    - **Las tapas**, del color del flap y colgadas de él: la nariz redonda
      que recogido va guardada en la cala, y los dos costados del flap.
    - **El hueco**, oscuro y fijo al ala: la cala —el labio de arriba por
      debajo, el fondo y el labio de abajo por encima— y las paredes de los
      lados, donde el ala sigue.

    Van enteras por dentro del ala, y por eso recogidas no se verían aunque
    estuvieran encendidas; pero su borde es el borde de la junta, a la misma
    profundidad que la chapa, y eso sí asomaría como píxeles sueltos. Ver
    `_tapas` y `world/flaps.ts`.

    Cada anillo con los mismos puntos, para tender la malla de uno a otro; y
    los de la junta, los mismos vértices del ala, para que no quede rendija.
    """
    def al_espacio(sec, perfil):
        pts = [_punto(sec, x, e, cur) for x, e, cur in perfil]
        pts[0], pts[-1] = sec["L"].copy(), sec["P"].copy()
        return pts

    narices = [al_espacio(sec, fo["nariz"])
               for sec, fo in zip(secciones, d["formas"])]
    calas = [al_espacio(sec, fo["cala"])
             for sec, fo in zip(secciones, d["formas"])]
    ejes_de_giro = [fo["centro"] for fo in d["formas"]]

    def tender(nombre_, filas, caps, material_, hacia_fuera):
        """Las filas tendidas de anillo a anillo y las dos tapas de los
        lados, mirando fuera de la nariz o hacia ella."""
        bm = bmesh.new()
        vs = [[bm.verts.new(p) for p in fila] for fila in filas]
        caras = []
        for a, (fa, fb) in enumerate(zip(vs, vs[1:])):
            for j in range(len(fa) - 1):
                cara = bm.faces.new((fa[j], fa[j + 1], fb[j + 1], fb[j]))
                caras.append((cara, (ejes_de_giro[a] + ejes_de_giro[a + 1]) / 2))
        bm.normal_update()
        cuenta = sum((c.calc_center_median() - ref).dot(c.normal)
                     for c, ref in caras)
        if (cuenta > 0) != hacia_fuera:
            for c, _ in caras:
                c.normal_flip()
        for cap in caps:
            c = bm.faces.new([bm.verts.new(p) for p in cap])
            c.normal_update()
            # Las del flap, lejos de él; las del ala, hacia donde estaba.
            if ((c.calc_center_median() - centro_flap).dot(c.normal) > 0) \
                    != hacia_fuera:
                c.normal_flip()
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        return liso(_malla_en_escena(nombre_, bm, [material_]), angulo=40)

    caps_flap = [cad + list(reversed(nar))[1:-1]
                 for cad, nar in zip(cadenas, (narices[0], narices[-1]))]
    caps_ala = [cad + list(reversed(cal))[1:-1]
                for cad, cal in zip(cadenas, (calas[0], calas[-1]))]
    tapas = tender(f"{nombre}-tapas", narices, caps_flap, material_flap, True)
    agujero = tender(f"hueco-{nombre}", calas, caps_ala, hueco, False)
    return tapas, agujero


def _carriles(nombre, secciones, d, donde, material_="metal"):
    """
    Los carriles de un flap sin canoas: una pletina por cada uno, fija al
    fondo de la cala, que va por donde va el centro de la nariz.

    Recogido van enteros dentro del ala y del flap, y además apagados, como
    el hueco del que forman parte —se llaman `hueco-flap-…-carriles`, y el
    juego los enciende y apaga con él—. Con el flap fuera se ven cruzar la
    ranura y meterse en la nariz, que es por donde entra de verdad el carril
    en el carro. **La nariz no se sale nunca de ellos**: su centro va sobre
    el eje de giro, y el eje sobre el carril, así que el carril la lleva
    metida en todo el recorrido. Ver `_disenar_flap`.

    `donde`: a qué fracción del flap va cada uno, de dentro afuera.
    """
    bm = bmesh.new()
    a, b = d["formas"][0], d["formas"][-1]
    sa, sb = secciones[0], secciones[-1]
    viaje = d["carril"] * d["recorrido"][-1]
    for f in donde:
        c = sa["c"] + (sb["c"] - sa["c"]) * f
        centro = a["centro"].lerp(b["centro"], f)
        r = a["r"] + (b["r"] - a["r"]) * f
        # El fondo de la cala a la altura del centro, en esa estación, y un
        # poco metido en él: clavado, no apoyado.
        fondo = _punto(sa, a["xi_c"] - 0.003 * sa["c"],
                       (a["centro"] - sa["ba"]).dot(sa["gd"])).lerp(
            _punto(sb, b["xi_c"] - 0.003 * sb["c"],
                   (b["centro"] - sb["ba"]).dot(sb["gd"])), f)
        arriba = sa["gd"].lerp(sb["gd"], f).normalized()
        lado = sa["nr"].lerp(sb["nr"], f).normalized()
        alto, ancho = 0.35 * r, max(0.006 * c, 0.012)
        linea = [fondo, centro, centro + viaje]
        anillos = []
        for p in linea:
            anillos.append([bm.verts.new(p + arriba * (sy * alto)
                                         + lado * (sx * ancho / 2))
                            for sy, sx in ((1, 1), (1, -1), (-1, -1), (-1, 1))])
        for u, w in zip(anillos, anillos[1:]):
            for j in range(4):
                bm.faces.new((u[j], u[(j + 1) % 4], w[(j + 1) % 4], w[j]))
        bm.faces.new(list(reversed(anillos[0])))
        bm.faces.new(anillos[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = _malla_en_escena(nombre, bm, [material_])
    for p in o.data.polygons:
        p.use_smooth = False
    return o


def canoas_con_flap(canoas, piezas_de_flaps):
    """
    Los carenados de los carriles, partidos: la cola va con el flap.

    Un carenado de carril —la «canoa» que asoma bajo el borde de salida de un
    avión de línea— no es de una pieza. La mitad de delante va clavada al ala
    y tapa el carril; la de atrás va colgada del carro que lleva el flap y
    **baja con él**. Con los flaps fuera se ve la canoa quebrada, con la cola
    apuntando hacia abajo, y así se reconoce un reactor aterrizando.

    Entera y fija, la cola atravesaba el flap al bajar: se le veía asomar la
    punta por encima.

    **Se parte en el primer anillo que ya tenía por detrás del eje de giro
    del flap, medido en la estación de la canoa**, y nunca más atrás de donde
    acaba su nariz en el último tope. Por delante del eje, la cola sube al
    girar y se clava en el ala; por detrás de donde acaba la nariz, la parte
    fija se queda debajo de ella y con los flaps abajo la nariz acaba metida
    en la canoa. Y lo más adelante que se pueda, porque la canoa asoma por
    dentro de la cala: lo que de ella va bajo la cala, mejor que baje con el
    flap que no que la nariz lo atraviese al salir.

    En la estación de la canoa, no en la mitad del flap: en un ala en flecha
    el flap va cada vez más atrás hacia la punta, y una canoa lejos de la
    mitad se partía más de un metro por delante de él. Esa cola subía al
    girar y atravesaba el ala, y la punta de delante se quedaba suelta en el
    aire.

    Con las normales de antes, y las dos caras del corte aparte y apagadas
    mientras el flap está recogido, como las del flap. Ver `flaps_moviles` y
    `_tapas`. Una canoa que no cae debajo de ningún flap —la de fuera, bajo
    el alerón— se queda como está.
    """
    salida = []
    vacios = [p for p in piezas_de_flaps if p.type == "EMPTY"]
    for canoa in canoas:
        bpy.ops.object.select_all(action="DESELECT")
        canoa.select_set(True)
        bpy.context.view_layer.objects.active = canoa
        for m in list(canoa.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
        me = canoa.data
        antes = [0.0] * (3 * len(me.loops))
        me.corner_normals.foreach_get("vector", antes)
        me.attributes.new("normal-de-antes", "FLOAT_VECTOR", "CORNER") \
            .data.foreach_set("vector", antes)
        cortes = {}
        for s, lado in ((1, "derecha"), (-1, "izquierda")):
            suyos = [v for v in me.vertices if v.co.x * s > 0]
            if not suyos:
                continue
            x = sum(abs(v.co.x) for v in suyos) / len(suyos)
            # El flap de este lado que cae encima de la canoa, y en esta
            # estación su eje de giro y dónde acaba su nariz, entre los dos
            # anillos del flap que la rodean.
            suyo, eje, nariz = None, None, None
            for b in vacios:
                if not b.name.endswith(f"-{lado}"):
                    continue
                linea = sorted(_JUNTAS[b.name])
                if linea[0][0] < x < linea[-1][0]:
                    suyo = b
                    for p, q in zip(linea, linea[1:]):
                        if p[0] <= x <= q[0]:
                            f = (x - p[0]) / max(1e-9, q[0] - p[0])
                            eje = p[1] + (q[1] - p[1]) * f
                            nariz = p[2] + (q[2] - p[2]) * f
            if suyo is None:
                continue
            # Un anillo de verdad: ni la punta de delante ni la de atrás, que
            # son un solo vértice y no se pueden tapar.
            cuenta = {}
            for v in suyos:
                z = round(v.co.z, 5)
                cuenta[z] = cuenta.get(z, 0) + 1
            anillos = sorted(z for z, n in cuenta.items() if n >= 3)
            entre = [z for z in anillos if eje <= z <= nariz - 0.02]
            if not entre:
                raise SystemExit(
                    f"La canoa {canoa.name} no tiene ningún anillo entre el "
                    f"eje del flap ({eje:.2f}) y su nariz ({nariz:.2f}): no "
                    "hay dónde partirla. Ver `canoas_con_flap`.")
            cortes[s] = (suyo, entre[0])
        if not cortes:
            _normales_de_antes(me)
            continue

        def de_atras(cara, s, z):
            c = cara.calc_center_median()
            return c.x * s > 0 and c.z > z

        for s, (suyo, z) in cortes.items():
            lado = "derecha" if s > 0 else "izquierda"
            bm = bmesh.new()
            bm.from_mesh(me)
            bmesh.ops.delete(bm, geom=[c for c in bm.faces
                                       if not de_atras(c, s, z)],
                             context="FACES")
            bmesh.ops.delete(bm, geom=[v for v in bm.verts
                                       if not v.link_faces], context="VERTS")
            anillo = [v.co.copy() for v in bm.verts if abs(v.co.z - z) < 1e-4]
            malla = bpy.data.meshes.new(f"m-{canoa.name}-{lado}-cola")
            bm.to_mesh(malla)
            bm.free()
            for mat in me.materials:
                malla.materials.append(mat)
            _normales_de_antes(malla)
            cola = bpy.data.objects.new(f"{canoa.name}-{lado}-cola", malla)
            bpy.context.collection.objects.link(cola)
            # El anillo del corte, en orden alrededor de su centro.
            centro = sum(anillo, Vector()) / len(anillo)
            anillo.sort(key=lambda p: math.atan2(p.y - centro.y,
                                                 p.x - centro.x))
            delante = centro - Vector((0, 0, 1))
            detras = centro + Vector((0, 0, 1))
            tapa_cola = _tapas(f"{canoa.name}-{lado}-cola-tapas", [anillo],
                               me.materials[0].name, detras, fuera=True)
            tapa_canoa = _tapas(f"hueco-{suyo.name}-{canoa.name}", [anillo],
                                me.materials[0].name, delante, fuera=True)
            for h in (cola, tapa_cola):
                h.parent = suyo
                h.matrix_parent_inverse = suyo.matrix_world.inverted()
            salida += [cola, tapa_cola, tapa_canoa]
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.delete(bm, geom=[c for c in bm.faces if any(
            de_atras(c, s, z) for s, (_, z) in cortes.items())],
            context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces],
                         context="VERTS")
        bm.to_mesh(me)
        bm.free()
        _normales_de_antes(me)
        print(f"CANOA: {canoa.name} partida en "
              + ", ".join(f"{z:.2f}" for _, z in cortes.values()))
    return salida


def _tapas(nombre, caras, material_, hacia, fuera):
    """
    Las caras que cierran un corte, en una malla **aparte**.

    Aparte porque recogido no deben existir. Van por dentro y no se ven, pero
    su borde es el borde del corte, a la misma profundidad que la chapa: con
    ellas dentro de la misma malla, la junta se llenaba de píxeles sueltos de
    la pared oscura peleándose con la piel. Aparte, el juego no las dibuja
    con el flap en su sitio —ver `world/flaps.ts`— y el avión recogido es
    exactamente las caras que tenía antes.

    Planas, y mirando hacia fuera de su pieza: las del flap, lejos de él; las
    del hueco del ala, hacia donde estaba el flap.
    """
    bm = bmesh.new()
    for cara in caras:
        c = bm.faces.new([bm.verts.new(p) for p in cara])
        c.smooth = False
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    for c in bm.faces:
        c.normal_update()
        sentido = c.calc_center_median() - hacia
        if (c.normal.dot(sentido) < 0) == fuera:
            c.normal_flip()
    return _malla_en_escena(nombre, bm, [material_])


def _normales_sin_cortes(me, normales, rej):
    """
    Las normales del ala tal como eran antes de ponerle los anillos de los
    flaps: las de siempre en los vértices de siempre, y en los del anillo
    nuevo, la mezcla de las de sus dos vecinos — que es exactamente lo que el
    ala sin ese anillo pintaba en ese punto, a lo largo de la arista.

    Cada esquina se reconoce por su anillo, su punto del perfil, el punto de
    al lado en su cara y hacia qué anillo va la cara: así una esquina de una
    cara nueva, que va del vecino al anillo nuevo, encuentra la de la cara
    vieja, que iba del vecino al otro vecino.
    """
    viejo = bpy.data.objects[rej["viejo"]]
    bpy.ops.object.select_all(action="DESELECT")
    viejo.select_set(True)
    bpy.context.view_layer.objects.active = viejo
    for m in list(viejo.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    mv = viejo.data
    de_viejo = rej["de_viejo"]

    def claves(malla, a_nuevo):
        anillo = [a.value for a in malla.attributes["anillo"].data]
        punto = [a.value for a in malla.attributes["punto"].data]
        for p in malla.polygons:
            vs = [malla.loops[li].vertex_index for li in p.loop_indices]
            rs = {anillo[v] for v in vs}
            js = {punto[v] for v in vs}
            if len(rs) != 2 or len(js) != 2 or -1 in rs:
                continue
            for li, v in zip(p.loop_indices, vs):
                r, j = anillo[v], punto[v]
                otro_r, otro_j = (rs - {r}).pop(), (js - {j}).pop()
                r, otro_r = a_nuevo(r), a_nuevo(otro_r)
                lado = 1 if malla.vertices[v].co.x > 0 else -1
                yield li, (r, j, otro_j, 1 if otro_r > r else -1, lado)

    cn = mv.corner_normals
    antes = {k: Vector(cn[li].vector) for li, k in claves(mv, lambda r: de_viejo[r])}
    bpy.data.objects.remove(viejo, do_unlink=True)
    for li, (r, j, oj, sentido, lado) in claves(me, lambda r: r):
        if r in rej["entre"]:
            a, b, f = rej["entre"][r]
            na = antes.get((a, j, oj, 1, lado))
            nb = antes.get((b, j, oj, -1, lado))
            if na is None or nb is None:
                continue
            n = na.lerp(nb, f).normalized()
        else:
            n = antes.get((r, j, oj, sentido, lado))
            if n is None:
                continue
        normales[3 * li:3 * li + 3] = list(n)


def _normales_de_antes(me):
    """
    Le devuelve a cada esquina la normal que tenía el ala entera.

    Las caras nuevas —las que cierran el hueco— no la tenían: van planas,
    con la suya. Y se quitan las marcas que solo servían para partir.
    """
    at = me.attributes["normal-de-antes"]
    vals = [0.0] * (3 * len(me.loops))
    at.data.foreach_get("vector", vals)
    lista = [Vector(vals[3 * i:3 * i + 3]) for i in range(len(me.loops))]
    for p in me.polygons:
        for li in p.loop_indices:
            if lista[li].length < 0.5:
                lista[li] = p.normal.copy()
    me.normals_split_custom_set([tuple(v) for v in lista])
    peor = max((Vector(a.vector) - b).length
               for a, b in zip(me.corner_normals, lista))
    for nombre in ("normal-de-antes", "anillo", "punto"):
        if nombre in me.attributes:
            me.attributes.remove(me.attributes[nombre])
    if peor > 1e-3:
        raise SystemExit(
            f"Las normales de {me.name} no quedaron como estaban ({peor:.4f}): "
            "se vería una raya donde antes no había. Ver `flaps_moviles`."
        )


def _asoma(tapa, p):
    """
    Cuánto se sale el punto `p` (en el mundo) de la malla `tapa`; cero dentro.

    Dentro es detrás de la superficie más cercana, mirando su normal: vale
    para cualquier malla cerrada —fuselaje, carenado, góndola, ala— sin
    tener que saber cómo se dibujó.
    """
    local = tapa.matrix_world.inverted() @ p
    hay, sitio, normal, _ = tapa.closest_point_on_mesh(local)
    if not hay:
        return math.inf
    if (sitio - local).dot(normal) > 0:
        return 0.0
    return (tapa.matrix_world @ sitio - p).length


def recogido(bisagras, tapas, tolerancia=0.03):
    """
    Que la pata metida quede **dentro**, dicho al exportar.

    Se gira cada pata a su posición de guardada y se mira vértice a vértice
    si cae dentro de alguna de las piezas que la tapan —fuselaje, carenado,
    góndola, ala—. Es la prueba de que el tren no se apaga al final del
    recorrido porque haya que esconderlo, sino porque ya no se ve: si asoma,
    lo que se enseña es un avión con la rueda colgando de la panza.

    Las tapas se miran también reflejadas, porque las que van de dos en dos
    —la góndola, el ala— se modelan a la derecha y el espejo pone la otra.
    """
    bpy.context.view_layer.update()
    malos = []
    for b in bisagras:
        if not b.name.startswith("bisagra-"):
            continue
        giro = (Matrix.Translation(b.location)
                @ Matrix.Rotation(math.radians(b["grados"]), 4,
                                  Vector(b["eje"]))
                @ Matrix.Translation(-b.location))
        peor, donde = 0.0, ""
        for h in b.children:
            if h.type != "MESH":
                continue
            for v in h.data.vertices:
                p = giro @ (h.matrix_world @ v.co)
                q = Vector((-p.x, p.y, p.z))
                a = min(min(_asoma(t, p), _asoma(t, q)) for t in tapas)
                if a > peor:
                    peor = a
                    donde = f" ({h.name} en {p.x:.2f} {p.y:.2f} {p.z:.2f})"
        print(f"RECOGIDO: {b.name} asoma {peor:.2f}{donde}")
        if peor > tolerancia:
            malos.append(f"{b.name} +{peor:.2f}")
    if malos:
        raise SystemExit(
            "Tren que no entra: " + " · ".join(malos)
            + ". Metido, tiene que quedar dentro de la piel. Ver `bisagra`."
        )


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
