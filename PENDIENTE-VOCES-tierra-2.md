# Pendiente: la radio de la salida desde la intersección, con voz

Lo de tierra de las tandas 9 y 14 y del punto 257 se grabó el 11 de octubre de
2026 y ya suena: la prisa de la torre en la pista («expedite vacating»,
«acelere abandono de pista»), remontar la pista («backtrack runway» y lo que
cuenta la instructora, con su porqué), salir desde la intersección, el número
en la fila de salida y la estela. Queda la radio de la intersección, que hoy se
lee en la tira y no se oye.

## La radio de la intersección (de Taguató para arriba)

En inglés, como el resto de la radio de los peldaños de arriba. La fraseología
es la de SERA (AMC1 SERA.14001, apéndice 1, 1.4.10 l a q) y la OACI (Doc 4444,
12.3.4.7 n a p); la de España, en castellano, en el RD 1180/2018, anexo V,
1.4.8 y 1.4.11, por si se graba la torre en castellano para los peldaños de
abajo. Se escribe en la tira desde `contarPorDondeSeSale` en `src/game.ts`.

| quién | en inglés (lo que sale en la tira) | en castellano (RD 1180/2018) | cuándo |
|---|---|---|---|
| torre | {matrícula}, advise able to depart from runway {pista}, intersection {calle} | {matrícula}, indique si está listo para despegar de la pista {pista}, intersección {calle} | con torre, si se entra por una intersección con nombre |
| quien vuela | Affirm, {matrícula} | Afirmo, {matrícula} | la cuenta le da |
| torre | {matrícula}, TORA runway {pista}, from intersection {calle}, {metros} metres | {matrícula}, TORA pista {pista}, desde intersección {calle}, {metros} metros | detrás del «affirm»; redondeado a la baja a la centena |
| quien vuela | Negative, request backtrack, {matrícula} (el de línea: request full length) | Negativo, solicito regresar por pista, {matrícula} | la cuenta no le da |
| quien vuela, con AFIS | {matrícula}, backtracking runway {pista} / departing from intersection {calle}, runway {pista} | — | un AFIS no ofrece ni autoriza: quien vuela dice lo que hace |

La única con voz es «backtrack runway» de la torre (`torre.backtrack`). Para
darles voz a las otras de la torre hacen falta piezas nuevas en `TORRE_SOLO`
(«advise able to depart from runway», «intersection», «TORA runway», «from
intersection», «thousand», «hundred», «metres») y la calle en letras y cifras
sueltas, que ya están. Las de quien vuela no tienen voz en el juego: van solo
en la tira.

## Y comprobarlo en el banco, que no se ha hecho

Lo grabado el 11 de octubre se comprobó con `verificar-voces` y las pruebas,
pero no con el banco del vuelo entero en el navegador:

- parar el avión en la pista después de «salí de la pista»: la torre mete
  prisa una vez, y no otra si se vuelve a parar;
- salir de Encarnación con viento del norte (la 12 se remonta, y hay torre) y
  de Pilar (AFIS: solo la instructora);
- salir de Mariscal Estigarribia con viento del sur (la 01: la avioneta
  remonta un trozo; el JAZ 90, la pista entera) y del norte (la 19: la
  avioneta y el JAZ 90 salen desde la calle; el JAZ 120 pide la pista entera);
- Tenerife Sur con `OGA_FILA_DE_SALIDA=1`: el número en la fila y la estela.
