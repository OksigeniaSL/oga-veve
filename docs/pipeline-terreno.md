# Pipeline de terreno

Cómo se pasa de un dato de satélite a un valle por el que se puede volar.

## 1. Conseguir la tesela

Los datos son **NASADEM / SRTM a 1 arcosegundo** (~30 m), de la NASA. Son de
dominio público: se pueden usar, vender y redistribuir sin pedir permiso
(ver [ADR 0003](adr/0003-terreno-nasadem.md)).

Dos sitios de descarga:

- [Earthdata Search](https://search.earthdata.nasa.gov) — colección
  `NASADEM_HGT v001`. Pide registro gratuito.
- [OpenTopography](https://portal.opentopography.org/raster?opentopoID=OTSDEM.032021.4326.3)
  — SRTM GL1, sin registro, con recorte por rectángulo.

Cada tesela cubre un grado por un grado y se llama por su esquina suroeste.
Paraguay va de los 19° a los 27° sur y de los 54° a los 62° oeste.

| Zona | Teselas de partida |
|---|---|
| Cordillera de los Altos / Asunción | `S26W058`, `S26W057`, `S25W058` |
| Encarnación y el Paraná | `S28W056`, `S28W057` |
| Chaco central | `S23W060`, `S23W061` |
| Saltos del Monday / Ciudad del Este | `S26W055` |

Las teselas **no se versionan**: pesan 25 MB cada una y `.gitignore` excluye
`datos/dem/`. Se descargan y se convierten.

## 2. Convertir a mapa de altura

```bash
mkdir -p datos/dem
# ...descargar S26W057.hgt en datos/dem/
node scripts/hgt-a-heightmap.mjs datos/dem/S26W057.hgt --size 1025
```

Genera dos ficheros en `public/assets/terreno/`:

- `S26W057.png` — mapa de altura en escala de grises de **16 bits**. Ocho
  bits darían escalones de varios metros y el terreno saldría aterrazado.
- `S26W057.json` — cota mínima y máxima. El PNG solo guarda 0..65535; sin
  esos dos números no se puede volver a metros.

La conversión no depende de ninguna biblioteca externa: el codificador PNG
está en el propio script.

## 3. Enganchar el mapa al escenario

Hoy los escenarios de `src/world/scenarios.ts` generan el relieve por código
a partir de una semilla. Para usar un mapa real, el escenario apuntará al PNG
y `buildHeightfield` leerá de ahí en vez de del generador de ruido. El resto
—color por bandas, agua, pista, muestreo de cota— no cambia.

Esa es la razón de que la generación esté aislada en una sola función.

## 4. Elegir la paleta

El color no viene de ninguna ortofoto: se elige a mano por bandas de altitud
en el escenario. Reglas que funcionan:

- Entre cuatro y seis bandas. Con menos se ve plano, con más deja de leerse.
- Saturación baja en las cotas altas: las montañas lejanas tiran a gris.
- El color de la niebla debe estar cerca del color del cielo en el horizonte,
  o se ve el corte donde acaba el terreno.
- Probar siempre en una pantalla mala. Lo que se ve bien en un monitor bueno
  se ve lavado en la tablet de un colegio.

## 5. Un escenario inventado

Exactamente el mismo camino, saltándose el paso 1: se genera el mapa de
altura con lo que sea —ruido, un dibujo a mano en escala de grises, un mapa
esculpido en cualquier editor— y se guarda como PNG de 16 bits. Un desierto,
un glaciar o una isla que no existe entran por la misma puerta que Paraguay.
