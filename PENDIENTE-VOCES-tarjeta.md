# Pendiente: la voz en el hangar

Las voces de la tarjeta del avión (`tarjeta.voz.*`) y la explicación de los
bomberos (`explica.bomberos.texto`) se grabaron el 11 de octubre de 2026, y en
el vuelo suenan: `TarjetaDelAvion.abrirGlobo` (`src/ui/tarjeta-del-avion.ts`)
llama a `decir(t(voz), voz)`, que en el vuelo es `Game.instructor.decir`.

Queda una decisión. **En el hangar todavía no hay instructora montada** —el
sonido arranca con el vuelo—, así que allí el globo de cada punto de la tarjeta
y el camión de bomberos de la ficha de un avión o de un destino se leen y no se
oyen, aunque estén grabados. Hay que decidir si el hangar monta una voz propia.
Ver también el ADR 0019, en «La voz de la explicación de los bomberos en el
hangar».
