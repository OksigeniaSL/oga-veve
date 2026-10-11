# Pendiente: oír en el banco la salida desde la intersección

Grabado y horneado el 11 de octubre de 2026: las siete piezas de cada torre
para la oferta —«{matrícula}, advise able to depart from runway {pista},
intersection {calle}»— y la pista que queda —«{matrícula}, TORA runway
{pista}, from intersection {calle}, {metros} metres»—. Las piezas de los
metros, `metros.thousand` y `metros.hundred`, llevan ya su propia receta en las
dos torres: sin ella no se bajaban con el pack y la TORA no se montaba nunca.
Ver `contarPorDondeSeSale` en `src/game.ts`.

## Lo que falta: oírlo en el banco

Lo de tierra se comprobó con `verificar-voces` y las pruebas, pero no con el
banco del vuelo entero en el navegador:

- parar el avión en la pista después de «salí de la pista»: la torre mete
  prisa una vez, y no otra si se vuelve a parar;
- salir de Encarnación con viento del norte (la 12 se remonta, y hay torre) y
  de Pilar (AFIS: solo la instructora);
- salir de Mariscal Estigarribia con viento del sur (la 01: la avioneta
  remonta un trozo; el JAZ 90, la pista entera) y del norte (la 19: la
  avioneta y el JAZ 90 salen desde la calle; el JAZ 120 pide la pista entera),
  y que la oferta y la TORA suenan con la voz de la torre, en su orden y
  detrás de nada;
- Tenerife Sur con `OGA_FILA_DE_SALIDA=1`: el número en la fila y la estela.
