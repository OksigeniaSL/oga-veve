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

## Enmienda H24a (17-11-2026): los datos de la carta de aproximación

Las tres cosas que la enmienda anterior daba por faltantes —el perfil
vertical, los mínimos y la altitud mínima de sector— ya tienen sus datos, y
la frustrada con ellos. **Solo los datos**: el dibujo es de otra tanda, y lo
que se transcribe aquí es para que no tenga que inventar nada.

### De qué carta

De **la del procedimiento que ya vuela el juego**: la que nombra `carta` en
`procedimientos-canarias.ts` y `procedimientos-paraguay.ts`, una por
cabecera. Son las RNP: en Canarias, las «RNP Z (LPV ONLY)», las RNP de
Fuerteventura, la RNP de la 21 de Lanzarote y la RNP A de La Palma; en
Paraguay, las RNP Z. Las veintiuna aproximaciones publicadas del juego,
todas. Así los puntos del perfil son los mismos que ya pinta la ruta, con el
mismo nombre, y la carta que se dibuje es la que se vuela.

`world/aproximaciones-publicadas.ts`, con el criterio de los demás ficheros
transcritos: las coordenadas como cadena, tal cual —«283119.1N» en ENAIRE y
«S 25:20:10.57» en la tabla de codificación de la DINAC—, las altitudes en
pies con la altura que la carta pone entre paréntesis, y la frustrada en
inglés, como la imprime la carta. Por cabecera: la MSA (o TAA) con su centro,
su radio y sus sectores; el perfil del punto intermedio al umbral, con las
millas de cada punto, el ángulo, la pendiente, el RDH, la cota y las
coordenadas del umbral y la tabla de la senda («ALT/HGT FNA»); la OCA/H de
cada categoría para cada línea de mínimos, con la pendiente de frustrada y,
en Paraguay, la visibilidad; la frustrada; la altitud de transición; y las
notas de la carta.

### Las fuentes

- **España**: las cartas IAC del AIP de ENAIRE en inglés —la carta, la lista
  de puntos y la tabla codificada de cada una—, bajadas el 17-NOV-2026 de
  aip.enaire.es con el índice en «29-OCT-26 (AIRAC 10/26 and AMDT 412/26)».
  GCXO IAC 1 y 6, GCTS IAC 1 y 7, GCLP IAC 8 y 17 (WEF 11-JUN-26, AIRAC AMDT
  05/26; la 1.3 de Los Rodeos, AIRAC 08/26), GCFV IAC 8 y 16 (09-JUL-26,
  AMDT 408/26), GCRR IAC 1 y 7 (WEF 03-SEP-26, AIRAC AMDT 08/26) y GCLA IAC
  1 y 4 (WEF 02-OCT-25, AIRAC AMDT 10/25).
- **Paraguay**: las cartas del AD 2 de la DINAC del paquete AMDT AIRAC
  02/2026, con su tabla de codificación (la página .1): AD 2.1-17 y 2.1-18
  (Asunción, 01 OCT 2026), 2.2-13 y 2.2-14 (Guaraní, 28 NOV 2024), 2.3-12 y
  2.3-13 (Mariscal Estigarribia, 07 AUG 2025), 2.4-11 y 2.4-12 (Pedro Juan
  Caballero, 07 AUG 2025) y 2.5-10 (Encarnación, 01 OCT 2026). La carta de
  la DINAC es un dibujo sin texto que extraer: sus cifras se copiaron
  mirando la página, y las coordenadas, de la tabla.

| Campo | Cabecera | MSA / TAA | IF → FAF/FAP | Mínimos (OCA/H, CAT A) | Frustrada |
| ----- | -------- | --------- | ------------ | ---------------------- | --------- |
| GCXO | 12 | MSA 14500, 25 NM ARP | XO11W → XO06W 4000, 5,8 NM | LPV 2699 (637) | 5500 |
| GCXO | 30 | MSA 14500 | BUNIX 5000 → XO69E 4300, 6,9 NM | LPV 2599 (592) | 3500, como mucho 6000 |
| GCTS | 07 | MSA 14300 | TS710 2500 → TS705 1900, 5,1 NM | LPV 512 (324) | 3000 |
| GCTS | 25 | MSA 14300 | TS511 2500 → TS506 2200, 6,0 NM | LPV 467 (259) | 3000 |
| GCLP | 03L | MSA 8500 | FALPU 2500 → LP6SW 2000, 5,8 NM | LPV 395 (318) | 3000 |
| GCLP | 21R | MSA 8500 | TIPUX 2500 → LP6NW 1900, 5,6 NM | LPV 442 (410) | 3000 |
| GCFV | 01 | MSA 3500 | LIRBU 2700 → FV07S 2500, 7,4 NM | LNAV/VNAV 640 (610); LNAV 840 (810) | 4000 |
| GCFV | 19 | MSA 3500 | TUVIL 3000 → FV04N 1500, 4,3 NM | LNAV/VNAV 530 (450); LNAV 600 (520) | 4000 |
| GCRR | 03 | MSA 3500 | GOLFY 2300 → RR05S 1700, 5,1 NM | LPV 469 (451) | 5000 |
| GCRR | 21 | MSA 3500 | SONUS 3000 → RR03E 2700 → MAPt RR551 1700 | solo en circuito (VPT): 1700 (1660) | 4000 |
| GCLA | 18 | MSA 10000 | VENZA 4000 → LA505 3000 → MAPt LA510 | solo en circuito: 1370 (1270) | 4500 |
| GCLA | 36 | MSA 10000 | RECKA 2400 → LA07S 2400, 6,9 NM | LPV 1310 (1206) | 4500 |
| SGAS | 02 | TAA 3000, 25 NM VURDO | VURDO 1930 → OSUNU 1930, 5 NM | LNAV/VNAV 780 (490); LNAV 880 (590) | 3000 |
| SGAS | 20 | TAA 3000, 25 NM LONEL | LONEL 1890 → BURVA 1890, 5 NM | LNAV/VNAV 620 (371); LNAV 690 (441) | 3000 |
| SGES | 05 | MSA 3000, 25 NM ARP | NINDA 2500 → GILMO 2490, 5 NM | LNAV/VNAV 1283 (437); LNAV 1290 (444) | 3000 |
| SGES | 23 | MSA 3000 | ROGER 2500 → MOLMA 2420, 5 NM | LNAV/VNAV 1024 (250); LNAV 1160 (386) | 3000 |
| SGME | 01 | TAA 3000, 25 NM VASIK | VASIK 2200 → BUPNI 2200, 5 NM | LNAV/VNAV 801 (247); LNAV 840 (286) | 3000 |
| SGME | 19 | TAA 3000, 25 NM SUGVO | SUGVO 2200 → POPNA 2200, 5 NM | LNAV/VNAV 897 (349); LNAV 980 (432) | 3000 |
| SGPJ | 03 | TAA 4000, 25 NM PJ336 | PJ336 3600 → PJ335 3490, 5 NM | LNAV/VNAV 2100 (255), D N.A | 4000 |
| SGPJ | 21 | TAA 4000, 25 NM PJ226 | PJ226 3600 → PJ225 3490, 5 NM | LNAV/VNAV 2220 (375), D N.A | 4000 |
| SGEN | 20 | TAA 3000, 25 NM EN010 | EN010 2300 → EN011 2300, 5 NM | LNAV/VNAV 980 (327), sin columna D | 3000 |

### Lo que las cartas dicen y hay que dibujar tal cual

- **Ninguna publica la altitud de decisión.** ENAIRE y la DINAC publican la
  OCA/H; la DA/H la fija cada operador a partir de ella. La tabla se rotula
  «OCA/H», no «DA».
- **Las LPV de Canarias están fuera de servicio** por suplemento: SUP 155/26
  (La Palma), 156/26 (Gran Canaria), 157/26 (Lanzarote), 158/26 (Tenerife
  Sur) y 159/26 (Los Rodeos), del 03-SEP-26 al 03-SEP-27 estimado. Las cartas
  siguen publicadas y van con su nota. El índice del AIP cuelga el de
  Lanzarote de la IAC 2 (RNP Y) y no de la IAC 1, que es la transcrita; la
  nota lo dice.
- **En las RNP de la DINAC la altitud mínima es de llegada (TAA)**, de dos o
  tres zonas a la misma altitud: va como un círculo, con `tipo: "TAA"` y su
  nota. Guaraní lleva MSA de verdad.
- **Hay categorías sin mínimos**: la D de Pedro Juan Caballero («N.A») y la
  de Encarnación (sin columna).
- **Dos no tienen final directa**: la RNP de la 21 de Lanzarote y la RNP A de
  La Palma, que su carta restringe a los mínimos en circuito «por ángulo
  excesivo entre la derrota de aproximación final y el eje de la pista». Su
  perfil no tiene senda, ni RDH, ni tabla, y acaba en el punto de frustrada:
  llevan `final: "circuito"`, sus millas se miden al MAPt y sus alturas a la
  cota del aeródromo, como en la carta.

### Lo que comprueba la prueba

`aproximaciones-publicadas.test.ts`: que toda aproximación del juego está
transcrita o en la lista de pendientes —hoy vacía—; que cada carta lleva
AIP, página, enmienda y fecha; que los puntos con nombre del perfil son los
del procedimiento —mismo nombre, a menos de cincuenta metros y a la misma
altitud— y están a las millas que dice la carta de su umbral; que ese umbral
es el de la pista del juego a menos de cien metros, contando el
desplazamiento; que las altitudes bajan hacia el umbral; y lo que se puede
sacar de dos cifras de la carta y casar con la tercera: la altura es la
altitud menos la cota, la tabla de la senda es la de su ángulo y su RDH, y la
OCA es la OCH más la cota sobre la que se mide.

### Los tres flecos de H22c

- **Encarnación 20 y Mariscal Estigarribia 01 tienen ILS** —localizador y
  senda con DME en su AD 2.19— y la tabla de las sendas no lo decía: ahora
  `ils: true`. Lo que cambia es `tieneIls`, y con él el *five hundred* del
  JAZ 60, que solo se canta en las de no precisión. Una prueba nueva mira
  que cada ILS del 2.19 esté en esa tabla.
- **Barajas tiene sus frecuencias**, del AD 2.18 (AD 2-LEMD-15 y -16, AIRAC
  AMDT 10/26), menos las militares y la de UHF, con sus canales de 8,33 kHz.

### Lo que queda

- **La VPT 1 de Lanzarote**, la carta de la maniobra visual que termina la
  21, no se ha transcrito: sus puntos ya están en `procedimientos-canarias.ts`.
- **Las cartas ILS, LOC y VOR** de las mismas pistas no se han transcrito:
  la carta del juego es la de la RNP que vuela. Las ILS Z de Los Rodeos,
  Tenerife Sur y Gran Canaria están bajadas, sin leer.
- **El dibujo** del perfil, la tabla de mínimos y el círculo de la MSA en la
  ficha del campo con el calco de la radio.
- **Un desajuste que no es de esta tanda**: la carta de la 19 de
  Fuerteventura rotula TUVIL como punto intermedio, y
  `procedimientos-canarias.ts` lo tiene como un punto más de la ruta, sin
  ningún intermedio en la rama. La prueba lo deja anotado y avisa si cambia.

## Enmienda H24b (17-11-2026): el dibujo de la carta de aproximación

Con los datos de H24a, la carta de aproximación ya se dibuja (#72). Es la
hoja que le faltaba al peldaño de arriba, Taguató Ruvichá: la misma ficha del
campo, con un calco más.

### Dónde va y cómo se abre

En la ficha de cada campo con carta transcrita, en el calco de la radio, un
botón debajo del nombre —«IAC RWY 12», con su glosa «Carta de aproximación»—
abre una hoja que tapa la ficha entera menos su cruz. Es la del procedimiento
de **la pista en servicio** (`cabeceraEnUso`, la misma con la que el juego
traza la llegada), y arriba lleva una pestaña por cabecera con carta: la otra
se ve con un toque. La flecha de la izquierda vuelve a la ficha, y abrir otra
ficha la abre siempre por la ficha y no por la carta que se dejó abierta.

Se abre sin código: unos botones de radio escondidos al principio de la ficha
y sus etiquetas, y la hoja de estilos enseña la página del marcado. El hangar
no se repinta, y su manejador de toques no se ha tocado. `cabeceraEnUso` se
ha sacado de `world/terrain.ts` a `world/cabecera-en-uso.ts` —y se sigue
exportando desde terrain— para que la carta del hangar la use sin traerse el
relieve, que va en el trozo del juego y no en el del arranque.

**En los peldaños de abajo no sale**: ni el botón, ni la hoja escondida. Lo
mira la prueba de los calcos (`mapa-del-pais.test.ts`), como con las
radioayudas.

### Qué lleva, y de dónde

`ui/carta/carta-de-aproximacion.ts`, todo de `aproximaciones-publicadas.ts`, y
todo en el inglés aeronáutico de la carta (regla 3):

- **La planta**, el norte arriba y a escala, con su barra de cinco millas: la
  pista de la cabecera, la derrota de la final del punto intermedio al umbral
  —o al punto de frustrada— y cada punto con nombre donde dicen sus
  coordenadas, con la estrella del punto de recorrido del Anexo 4 y su rótulo
  entre paréntesis, «BUNIX (IF)». Los que la carta no da en la lista —la
  comprobación de altitud de ENAIRE, el escalón de la 20 de Asunción— van sobre
  la derrota, a sus millas.
- **El perfil**, debajo, como en la carta: cada punto con su rótulo (IF, FAP o
  FAF, ACL, SDF, MAPt, THR) en la franja de arriba, y su nombre si es un
  punto de la lista —el de la comprobación de altitud, «4.0 RW12», repetiría
  sus millas—; su raya al suelo, su altitud con la altura entre paréntesis
  —debajo y a la izquierda si la del punto de antes no le deja sitio— y sus
  millas debajo; el RDH bajo la pista; en la franja de abajo, el ángulo y la
  pendiente de la senda bajo su tramo, «3.0° (5.2%)», y la cota de
  referencia, «THR ELEV 2062»; y la frustrada como una flecha a trazos que
  sube hasta su altitud. Debajo, la tabla de la senda (NM, ALT, HGT). No va a
  escala de alto, como el de la carta.
- **Los mínimos**, rotulados «OCA (OCH)», una línea por tipo —LPV, LNAV/VNAV,
  LNAV, CIRCLING— y una columna por categoría, con la OCA encima y la OCH
  debajo entre paréntesis. **La columna del avión que va, marcada como con
  rotulador**, y debajo «Tu aeronave: CAT C». La categoría sale de
  `categoriaDeAproximacion` (`flight/aircraft.ts`), por la Vref a la masa
  máxima al aterrizar (`vrefDeSuCategoria`) y los cortes de PANS-OPS: las
  cuatro avionetas y el JAZ 50 son de la A; el JAZ 60, de la B; el JAZ 90, de la
  C; el 110 y el 120, de la D. Un helicóptero es la H, que no tiene columna en
  estas cartas: no se marca nada.
- **La MSA**: el círculo con su altitud dentro, «MSA» encima y «25 NM ARP»
  debajo. Las TAA de la DINAC, igual con «TAA» y su punto, «25 NM VURDO», y su
  nota al lado. Sin rayas de sector: la carta no da los límites de sus zonas
  en grados, y dibujarlos sería inventarlos.
- **La frustrada**, en su caja: la altitud con la flecha de frustrada, y su
  techo si lo tiene —«3500 · MAX 6000»—, y el texto de la carta tal cual.
- **Al pie**, el TA, la carta y su fuente, y el descargo.

### Lo que no se dibuja, porque la carta no lo trae

- **Ni DA ni DH**: la tabla es de OCA/OCH, con ese nombre.
- **«N.A» solo donde la carta tiene la casilla**: la D de Pedro Juan
  Caballero. La tabla de Encarnación no tiene columna D, y aquí tampoco. Para
  distinguir los dos casos, `CartaDeAproximacion` lleva ahora `categorias`, las
  columnas de su tabla si no son las cuatro: solo Encarnación lo necesita.
- **Una altitud que la carta no imprime no lleva cifra**, y la línea del
  perfil no pasa por ella: el intermedio de la 12 de Los Rodeos, XO11W, sale
  con su raya y su nombre, y la línea empieza en el FAP. En la 18 de La Palma,
  sin altitud en el punto de frustrada, la flecha de la frustrada sube sola
  por el borde: no se inventa de dónde sale.
- **Las de circuito**, sin senda, sin RDH y sin tabla: el perfil acaba en el
  MAPt, mide a la cota del aeródromo («AD ELEV 48») y no lleva pista.
- **Las LPV de Canarias** se dibujan, con su línea tachada y su suplemento,
  «U/S SUP 159/26», que sale de su nota. Las demás notas de la carta —los
  sectores sin circuito, la restricción de las de circuito— están en
  castellano en el fichero de datos y no se escriben: esta hoja va en el
  inglés de la carta. Tampoco la visibilidad que imprime la DINAC, ni la
  pendiente de frustrada de cada línea.

La prueba (`carta-de-aproximacion.test.ts`) mira, en las veintiuna, que **no
se escribe ni una cifra que no traiga su carta**: cada número del perfil, de
los mínimos y de la MSA está en los datos de esa cabecera.

### En tablet y en teléfono tumbado

En la tablet cabe entera a la vista: la planta y el perfil a la izquierda; los
mínimos, la MSA y la frustrada a la derecha. **En el teléfono tumbado no
cabe**, y se ha elegido qué se ve primero: el perfil y los mínimos, que es lo
que no está en ninguna otra parte del juego, con la MSA debajo de los mínimos;
la planta, la frustrada y el pie, rodando. De pie, una sola columna: perfil,
mínimos y lo demás.

### Los dos flecos que quedaban

- **La radio de Gran Canaria**: los datos de la ficha iban en columnas de
  periódico con el alto fijo, y lo que no cabía se iba a otra columna por la
  derecha, fuera de la ficha; en la tablet, las radioayudas no se veían. Ahora
  las columnas van en una caja de dentro de alto libre, la de fuera rueda de
  arriba abajo, y lleva la sombra de lo que queda por debajo, que es lo que
  dice que hay más.
- **TUVIL es el intermedio de la 19 de Fuerteventura**: la carta lo rotula
  «(IF)» en la planta y en el perfil (AD 2-GCFV IAC 16.1, mirada en la página
  bajada por H24a); su «TF» de la tabla codificada es el tipo de tramo, no el
  papel del punto. En `procedimientos-canarias.ts` pasa de `ruta` a `if`, y la
  prueba que lo dejaba anotado ahora pide que toda aproximación tenga su
  intermedio. **En el vuelo**, la rama se puede tomar desde TUVIL, como las
  demás desde su intermedio. Viniendo de Lanzarote, la ruta ya no pasa de
  largo por encima del campo para bajar a BAMKU, al sur de la isla, y volver
  por la costa: de la 21 de Lanzarote a la 19 son 34 millas en vez de 71, y de
  la 03, 42 en vez de 79 (medido con `rutaDelTramo` y el relieve del juego,
  como `rutas-de-canarias.test.ts`, que ahora lo comprueba). De Gran Canaria,
  que viene del sur, sigue entrando por BAMKU. Y su tramo inicial y su
  intermedio se miden contra el relieve con el margen de cada uno
  (`aproximaciones-sobre-el-relieve.test.ts`), que antes no se medían porque la
  rama no tenía intermedio; libran.
