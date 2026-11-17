# 0021 — La carta: el relieve, el mar y el suelo, horneados por región

Fecha: 2026-10-26
Estado: aceptado · añade un origen de datos de terreno para los mapas; no
toca el del mundo que se vuela (ADR 0003, 0005 y 0006)

## Contexto

Enrique aprobó que la cara del juego sea **la carta aeronáutica**: papel de
aviación de verdad, con las tintas hipsométricas del relieve, el sombreado, la
cubierta del suelo, el mar con sus veriles, el aeródromo de la OACI y la rosa
con su declinación. La hoja de estilo es la de Gaudí, sobre la carta 1:500 000
de ENAIRE, hoja GC Canarias 2025.

El relieve que ya tiene el juego no sirve para eso. Son mapas por escenario
—el fino y el del horizonte, Copernicus GLO-30 y el MDT05 del IGN—, de
dieciocho a trescientos kilómetros alrededor de cada campo, sin mar debajo del
agua. La carta del hangar pide el Paraguay entero (mil kilómetros), las siete
islas con el fondo del Atlántico entre ellas, y Madrid por Cuatro Vientos. Y
pide lo que el terreno del vuelo no sabe: si un monte es seco o húmedo.

## Decisión

### Tres fuentes nuevas, todas con licencia comprobada

- **El relieve y el fondo del mar: ETOPO 2022** de NCEI/NOAA, a 15″ (unos
  460 m). Obra del Gobierno de los Estados Unidos, dominio público; se pide
  citarlo (doi:10.25921/fd45-gt74). Trae tierra y batimetría en el mismo
  fichero, que es lo que hace falta para los veriles de 200, 1000 y 2000 m.
  En tierra, ETOPO 2022 se apoya en el propio Copernicus, así que no
  contradice al relieve del vuelo.
- **La cubierta del suelo: ESA WorldCover 2021 v200**, CC BY 4.0, con la
  atribución que lleva el propio fichero. Se leen las vistas reducidas que
  trae cada GeoTIFF por dentro, de 300 a 600 m por píxel: de cada tesela de
  tres grados se bajan unos cientos de kilobytes y no los cien megas enteros.
- **La lluvia del año: CHELSA V2.1**, bio12 de 1981-2010, CC0 (comprobado en
  la ficha de EnviDat). WorldCover dice «árboles» y no si son el monte seco del
  Chaco o el húmedo de Itapúa; la lluvia lo dice, y con ella se reparte el
  tinte entre el húmedo y el seco de cada región.

La costa y el contorno del país siguen siendo los de Natural Earth, los mismos
que se trazan encima: así la costa pintada y la trazada coinciden.

### Horneado fuera del juego, una imagen por región y por fuerza de sombra

`scripts/carta-hornear.mjs` (`npm run carta`) baja lo que haga falta a
`datos/carta/` —fuera de git— y pinta cada región en un WebP: rampa en
peldaños de pies, cubierta multiplicada a su fuerza, sombreado del noroeste,
mar en cuatro azules con sus veriles, punteado y juncos. Sin dependencias: el
lector de GeoTIFF es el de `copernicus-a-relieve.mjs`, ampliado a tiras y a
vistas reducidas.

Dos imágenes por región porque la hoja pide el sombreado más fuerte para los
de cuatro a seis años (0,46 frente a 0,38), y hornearlas sale más barato que
componer la sombra en la tablet.

Lo que cambia por peldaño —las letras, las cifras, la radio— no se hornea: se
dibuja encima (SVG y HTML en el hangar, lienzo en el plano del vuelo).

### Cuánto pesa

| Región   | Tamaño       | Normal | Pequeños |
| -------- | ------------ | ------ | -------- |
| Canarias | 1397 × 630   | 31 KB  | 32 KB    |
| Paraguay | 1320 × 1395  | 49 KB  | 57 KB    |
| Madrid   | 536 × 450    | 14 KB  | 16 KB    |

No entran en la precarga: se bajan al abrir la carta de su región.

## Consecuencias

- Cambiar la rampa, los tintes o el sombreado es cambiar `src/ui/carta/estilo.ts`
  y volver a hornear; el juego lee el mismo fichero.
- El volcán de la hoja (los malpaíses con su punteado) **no sale**: WorldCover
  mete la lava reciente en «suelo desnudo», igual que el ocre de Fuerteventura,
  y sin otra fuente no hay forma honrada de separarlos. Queda preparado —clase
  100, musgo y liquen— por si una versión lo distingue.
- Si se añade un campo fuera de las tres regiones, hay que añadir su región y
  hornearla; mientras, su carta sale vacía como la de un escenario inventado.

## Enmienda H22c (17-11-2026): las radioayudas y el descargo

La carta ya llevaba en el calco de la radio las frecuencias del AD 2.18 de
cada campo (`world/frecuencias-publicadas.ts`). Le faltaban las radioayudas
(#75) —sin ellas el quinto escalón de #78, «las balizas invisibles», no
existía— y el descargo que #74 pedía y no aparecía en ninguna parte.

### Los datos: el AD 2.19 de cada campo, transcrito

`world/radioayudas-publicadas.ts`, con el mismo criterio que las frecuencias:
cada fila como la imprime su AIP —«117.700 MHz» y «283212.6N» en España,
«115.9MHZ» y «S25°14’39’’» en Paraguay—, con su página, y las coordenadas
pasadas a grados al cargar para que lo copiado se coteje letra a letra.

- **España**: AIP de ENAIRE en inglés, AD 2 de cada campo, apartado 2.19,
  bajado el 17-NOV-2026 con el índice en «29-OCT-26 (Incorporados AIRAC 10/26
  and AMDT 412/26)». Las páginas, cada una con su enmienda: AD 2-GCXO-10
  (AIRAC 10/26), AD 2-GCTS-10 y -11 (AIRAC 10/26), AD 2-GCLP-14 y -15 (AIRAC
  09/26), AD 2-GCRR-9 y -10 (AMDT 412/26), AD 2-GCFV-10 (AMDT 408/26),
  AD 2-GCLA-9 (AIRAC 09/26), AD 2-GCHI-8 (AIRAC 05/26), AD 2-GCGM-7 y -8
  (AMDT 408/26), AD 2-LECU/LEVS-8 (AIRAC 07/26) y AD 2-LEMD-16 a -18 (AIRAC
  10/26).
- **Paraguay**: AIP de la DINAC, paquete de la AMDT AIRAC 02/2026, el mismo
  de las frecuencias: AD 2.1-8 (Asunción), 2.2-8 (Guaraní), 2.3-8
  (Mariscal Estigarribia), 2.4-8 (Pedro Juan Caballero), 2.5-7
  (Encarnación), 2.6-7 (Concepción) y 2.8-7 (Pilar, la tabla entera en NIL).
  La tabla de la DINAC no dice a qué pista sirve cada ILS; lo dice el título
  de su carta: «ILS or LOC Z RWY 20» (AD 2.1-15), «ILS Y RWY 23» (AD 2.2-12)
  e «ILS OR LOC Z RWY 20» (AD 2.5-9). Mariscal Estigarribia publica el ILS
  IMCL sin carta: la 01 sale de dónde pone el AIP sus dos antenas, y así lo
  dice su nota.
- **Ayolas** solo está en el AD 3, sin apartado de radioayudas; **Yvytu
  Rape**, en ningún AIP.
- **Fuera**: los TACAN militares de Gando (TGN) y Lanzarote (TLZ), como las
  frecuencias militares; y las observaciones de cobertura, que son de
  planificar un vuelo, no de la caja de una carta.

Los VOR y NDB de ruta que ya salían como puntos de las salidas y
aproximaciones (TFN, LRO, TFS, GDV, LPC, LTE, LZR, FTV, HIE, HR, VAS, VES)
están todos en el AD 2.19 de algún campo del juego: la prueba comprueba que
cada uno tiene su fila y que cae a menos de cincuenta metros del punto de la
ruta. Y que cada ILS casa con su pista: la senda a menos de 600 m de su
umbral, el localizador pasado el otro extremo y el rumbo de la final —el
publicado más la declinación de la estación, o el de las antenas donde no se
publica— a menos de tres grados del de la pista.

| Campo | Radioayudas |
| ----- | ----------- |
| GCXO | DVOR/DME TFN 117.700 CH 124X; DVOR/DME LRO 116.200 CH 109X; ILS 12 INOR 108.700 CH 24X; ILS 30 ITF 110.300 CH 40X |
| GCTS | DVOR/DME TFS 116.400 CH 111X; ILS 07 ITS 109.700 CH 34X; ILS 25 ISUR 110.900 CH 46X |
| GCLP | DVOR/DME GDV 112.900 CH 76X; DVOR/DME LPC 115.000 CH 97X; ILS 21R RLP 110.700 CH 44X; ILS 03L ILP 109.900 CH 36X |
| GCRR | DVOR/DME LTE 114.400 CH 91X; DVOR/DME LZR 115.200 CH 99X; ILS 03 IRR 109.100 CH 28X |
| GCFV | DVOR/DME FTV 114.100 CH 88X; NDB FV 397 kHz con DME FUE CH 17X; ILS 01 IFV 109.500 CH 32X; ILS 19 IFA 111.300 CH 50X |
| GCLA | NDB BX 389 kHz con DME BV CH 71X |
| GCHI | NDB HIE 376 kHz con DME HR CH 79X |
| GCGM | DVOR/DME LGM 116.000 CH 107X |
| LECU | NDB CVT 417 kHz |
| LEMD | DVOR/DME BRA, PDT, RBO, SIE, SSY, NVS, TLD, CNR, NEA, BAN y CJN; ILS 32L MAA, 18L IML, 18R IMR y 32R MBB, de categoría III |
| SGAS | DVOR/DME VAS 115.9 CH 106X; ILS 20 IPST 109.5 CH 32X |
| SGES | VOR/DME VES 116.3 CH 110X; ILS 23 ICES 111.3 CH 50X |
| SGME | ILS 01 IMCL 111.3 CH 50X |
| SGPJ | NDB PJC 353 kHz |
| SGEN | VOR/DME VEN 116.9 CH 116X; ILS 20 IENC 108.5 CH 22X |
| SGCO | NDB CON 405 kHz |
| SGPI | NIL |
| SGAY | sin apartado (AD 3) |

### En la carta: símbolo y caja, solo en el calco de la radio

Los símbolos son del Anexo 4 de la OACI, Apéndice 2, dibujados por
Oksigenia como los demás de `ui/carta/simbolos/`: el hexágono con su punto
del VOR, el cuadrado del DME, el hexágono dentro del rectángulo del VOR/DME,
el punto con sus anillos de puntos del NDB y la pluma del localizador, con la
mitad de la derecha de quien llega rellena. Al lado, **la caja**: el
identificador con su frecuencia, el canal DME y el morse letra a letra
(Recomendación UIT-R M.1677, la que pide el Anexo 10). Un VOR y su DME son una
estación; un NDB con un DME al lado, también, y si el DME lleva otro
identificador se escribe aparte —«HIE 376.000 kHz / DME HR CH 79X»—.

- **En la ficha del campo**, la lista de sus radioayudas con su símbolo y su
  caja, y su fuente debajo; y en el dibujo de la pista, las que caen dentro
  —el VOR LRO en la punta oeste de Los Rodeos, el NDB de Hierro— y
  la pluma de cada ILS a lo largo del eje, por fuera de su cabecera, con el
  número de la pista encima en su halo de papel. El encuadre es el mismo que
  con las cifras: el dibujo que ya se conocía no se achica para hacer sitio a
  la radio, se le suma encima.
- **En el plano en vuelo**, las que caen dentro del plano, con la caja que
  quepa: entera, sin el canal, sin el morse o sin caja. La pluma solo desde
  que una milla ocupa tres píxeles; en el plano del archipiélago entero eran
  nueve rayas encima de nueve aeropuertos.

**En los peldaños de abajo no salen, ni como dibujo mudo.** Lo que el calco
del territorio enseña en los cuatro es lo que se ve por la ventanilla; una
radioayuda no se ve, y un hexágono sin su caja no enseña nada, porque en una
carta el símbolo y la caja son una sola cosa. Es el quinto escalón de #78,
que ya es para quien lee. La rosa, que sí va en los cuatro, es otro caso: sin
cifras sigue diciendo dónde está el norte.

### El descargo, donde lo lleva una carta

«No apto para navegación real» (en inglés, «Not for real navigation»; el
guaraní espera su traducción, como las demás claves), **al pie de la hoja**:
abajo a la derecha en la carta del hangar, en la esquina que deje libre el
colocador, y en el plano en vuelo abajo a la derecha, colocado antes que
ningún otro rótulo y, si ahí cae un aeródromo, corrido por el borde de abajo
o por el de arriba, en una línea o en dos. Solo en el plano más chico con el
país entero —que tiene un aeródromo en cada borde, porque el encuadre se
ajusta a ellos— puede no caber, y entonces no se escribe. Desde el calco de los nombres, el primero con
letra: en Guyrami la carta no lleva ni una, y quien pudiera llevarse esta
carta a un avión de verdad ya lee. Y en la ficha del campo, debajo de su
radio, en el calco de la radio, que es el que la convierte en una carta de
aeródromo con sus cifras.

### Lo que falta para la carta de aproximación (#72)

La carta de aproximación como documento sigue sin existir. Con lo que hay,
le faltan tres cosas, y ninguna tiene aún sus datos:

- **El perfil vertical**: la escalera de altitudes de la final, del punto de
  inicio al umbral, con la senda y su ángulo. Los puntos y sus altitudes
  mínimas ya están en `procedimientos-*.ts` (IAF, IF y FAF con la cota de la
  tabla de codificación) y el ángulo de la senda en `sendas-publicadas.ts`;
  faltan la distancia DME de cada punto —que se calcula—, la altura de cruce
  del umbral (el RDH del AD 2.19 está en la página, no transcrito) y el
  dibujo.
- **Los mínimos**: la OCA/OCH de cada categoría de avión y la altitud de
  decisión, que solo están en la tabla de mínimos de cada carta IAC; no se
  han transcrito para ningún campo.
- **La altitud mínima de sector (MSA)**: el círculo de 25 millas con sus
  sectores, impreso en cada carta IAC y en ningún apartado de texto del AD 2;
  tampoco está transcrita.

Y la interactividad que pedía #72 —tocar una radioayuda y oír su morse,
tocar una frecuencia y sintonizarla— no está: la caja se lee, no suena.
