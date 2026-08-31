# Óga Veve

Simulador de vuelo para navegador. Se vuela sobre Paraguay —el relieve es
real, el paisaje lo pintamos nosotros— y se aterriza donde se pueda.

### ▶ [Jugar ahora](https://oksigeniasl.github.io/oga-veve/)

> **Estado**: esqueleto funcional. Modelo de vuelo, terreno procedural, HUD y
> controles operativos. Sin arte final, sin audio, sin multijugador. Lo que
> falta está en los [issues](https://github.com/OksigeniaSL/oga-veve/issues).

Producto de **[Oksigenia SL](https://oksigenia.com)**, publicado bajo la
marca **Granja Óga**. **Gratis para siempre para la educación paraguaya** —
ver [LICENSE-CONTENIDO.md](LICENSE-CONTENIDO.md).

---

## Por qué existe

Porque una niña dijo que quería ser piloto "con las gafas de sol", y porque
no había ningún simulador que la dejara reconocer su país desde el aire.

Esa niña tiene cuatro años y medio, y eso no es una anécdota: es la
restricción de diseño más dura del proyecto. **La jugadora más joven todavía
no sabe leer.** Nada de lo esencial puede depender de un texto.

El objetivo no es la fidelidad de un simulador de entrenamiento. Es que
volar se sienta bien, que el paisaje se reconozca, y que un chico de ocho
años pueda despegar en el primer intento sin leer un manual —y que uno de
cuatro pueda hacerlo sin leer nada en absoluto.

## Arrancar

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>. No hace falta nada más: el escenario inicial se
genera por código, sin descargar datos.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compila a `dist/` (estático, se sirve con nginx) |
| `npm run typecheck` | Comprueba tipos sin compilar |
| `npm test` | Tests del modelo de vuelo |
| `npm run terreno` | Convierte teselas NASADEM a mapas de altura |

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Cabeceo / alabeo | Flechas o `W A S D` | Palanca izquierda |
| Timón | `Q` / `E` | Deslizar en la barra inferior |
| Motor | `Shift` / `Ctrl` | Palanca derecha |
| Frenos | `B` | Botón |
| Cámara | `C` | Botón |
| Reiniciar vuelo | `R` | Botón |
| Ayuda de vuelo | `M` | Ajustes |
| Idioma | `L` | Ajustes |
| Sonido | `V` | Ajustes |

También funciona con mando (Xbox / PlayStation) por la Gamepad API.

## Estructura

```
.
├── src/
│   ├── flight/         Modelo de vuelo, aeronaves, controles
│   │   ├── fdm.ts      FDM propio de coeficientes (el corazón)
│   │   ├── model.ts    Interfaz FlightModel — el punto de enchufe
│   │   ├── aircraft.ts Fichas técnicas de cada aeronave
│   │   └── input.ts    Teclado, táctil y mando
│   ├── world/          Terreno, cielo, escenarios
│   ├── ui/             HUD, menús, créditos
│   ├── i18n/           es-PY y guaraní (gug)
│   └── game.ts         Bucle de juego y ensamblaje
├── scripts/            Pipeline de terreno (NASADEM → mapa de altura)
├── docs/adr/           Decisiones de arquitectura y su porqué
└── public/assets/      Assets estáticos
```

## Modelo de vuelo

FDM propio, escrito en TypeScript, de coeficientes aerodinámicos: calcula
sustentación, resistencia, fuerza lateral y los tres momentos a partir del
ángulo de ataque, el derrape y las velocidades angulares, e integra las
ecuaciones de Euler del sólido rígido. Entra en pérdida de verdad.

Tiene dos modos: **Arcade** (amortiguación extra, timón automático,
pérdida indulgente) y **Piloto** (sin ayudas). El mismo modelo, distinto
coeficiente de asistencia.

Está detrás de la interfaz [`FlightModel`](src/flight/model.ts) a propósito:
**se le puede enchufar [JSBSim](https://github.com/JSBSim-Team/jsbsim)
compilado a WebAssembly como implementación alternativa** sin tocar el resto
del juego. El porqué —y las implicaciones de licencia LGPL, que son las que
nos hicieron no usarlo de entrada— está en
[`docs/adr/0002-modelo-de-vuelo-propio.md`](docs/adr/0002-modelo-de-vuelo-propio.md).

## Terreno

El relieve sale de **NASADEM** (NASA, dominio público, ~30 m de resolución).
`scripts/hgt-a-heightmap.mjs` convierte las teselas `.hgt` a mapas de altura
PNG de 16 bits que el juego carga como escenario.

El color **no** sale de imaginería satelital: se pinta por altitud, pendiente
y bioma con shaders propios. Sale más bonito, no cuesta nada al mes y no nos
ata a ningún proveedor.

## Idiomas e instrumentos

Tres idiomas, que se pasan con `L`: **español paraguayo** (`es-PY`),
**guaraní** (`gug`) e **inglés** (`en`). Como en el resto de productos de
Granja Óga se aplica el **test Ña Emy**: si una abuela paraguaya no puede usar
la pantalla, la pantalla no está terminada.

Los rótulos de los instrumentos —**IAS, ALT, HDG, V/S, THR**— no se traducen
en ningún idioma. Son los mismos en cualquier cabina del mundo, y aprenderlos
es parte de lo que el juego enseña sin proponérselo. Debajo de cada uno va la
palabra corriente en pequeño, que es la muleta de quien está aprendiendo a
leer y que con el tiempo se deja de mirar.

Las unidades siguen al modo de vuelo: **Arcade** muestra km/h y metros,
**Piloto** muestra nudos y pies. Quien decide que quiere volar en serio se
encuentra con las unidades de verdad en el mismo gesto.

## Licencia

- **Código** — [Apache-2.0](LICENSE). Úsalo, véndelo, no nos preguntes.
- **Contenido y marcas** — propietario, © Oksigenia SL.
- **Toda la educación paraguaya** — gratis, permanente, sin trámites.
  [Detalles](LICENSE-CONTENIDO.md).

Procedencia y licencia de cada dependencia y cada dato: [CREDITOS.md](CREDITOS.md).

## Contribuir

Issues y pull requests, bienvenidos. Antes de mandar código, lee
[docs/adr/](docs/adr/) para no chocar con una decisión ya tomada, y
[AGENTS.md](AGENTS.md) si trabajas con herramientas de asistencia.

Al contribuir aceptas que tu aportación se publique bajo Apache-2.0.
