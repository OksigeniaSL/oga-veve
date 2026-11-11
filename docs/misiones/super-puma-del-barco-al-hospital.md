# La misión del Super Puma: del barco al hospital

**Estado**: borrador para Enrique. No hay nada hecho: se aprueba antes de escribir código ni grabar una frase. Es el
paso 4 del helicóptero (ADR 0026).

## Por qué esta

- **Es lo que hace de verdad.** Un helicóptero militar sale de Gando a petición de Salvamento Marítimo, recoge a un
  marinero herido en un barco y lo deja en la helisuperficie del Hospital Doctor Negrín, donde le espera una ambulancia
  del Servicio de Urgencias Canario. Lo contó RTVC, y es el trabajo del 802 Escuadrón.
- **Es tranquila.** El marinero se ha hecho daño en una pierna: está bien, pero tiene que ir al hospital. Día claro,
  el alisio de siempre, sin noche, sin temporal y sin prisa. La calma se enseña (AGENTS.md).
- **Enseña lo que solo hace un helicóptero**: quedarse quieto en el aire sobre algo que se mueve y de cara al viento,
  la grúa, y posarse en una hache.
- **La tripulación es seguridad.** Van cuatro: quien juega a los mandos, el copiloto, el operador de grúa, que guía al
  piloto mirando por la puerta, y el rescatador, que baja por el cable.

## Paso a paso

1. **En Gando**, en la plataforma del 802, la parte militar de Gran Canaria. Llega el aviso de Salvamento Marítimo:
   «un pescador se ha hecho daño en una pierna a bordo, a unas millas de la costa; hay que llevarlo al hospital».
   Baliza, arranque —motores, freno del rotor fuera, vueltas arriba— y comprobaciones.
2. **El despegue**: hacia arriba hasta unos metros del suelo, donde ayuda el efecto suelo; se mira que hay potencia de
   sobra y se sale hacia delante.
3. **Al barco**: un pesquero al este de Gando, que navega despacio con la proa al viento. Que el barco mantenga rumbo
   y velocidad es lo que se le pide de verdad para una grúa: en el rescate del crucero a 500 km de Canarias, el avión de
   vigilancia le pasó al buque el rumbo y la velocidad que necesitaba el helicóptero (El Debate, defensa.com).
4. **La llegada**: por detrás y de cara al viento, frenando, hasta quedarse quieto al costado del barco y por encima.
5. **La grúa**: el operador guía al piloto con frases cortas, el rescatador baja por el cable, recoge al pescador y
   suben los dos. Quien juega sostiene el estacionario. Las palabras exactas del operador **están por confirmar**: no
   hay fuente pública con el vocabulario de las tripulaciones españolas, y no se inventa.
6. **Al hospital**: la helisuperficie del Doctor Negrín, en Las Palmas, unos 21 km al norte de Gando, a 190 pies
   (OurAirports ES-0367: 28,1222 N, 15,4435 W). Aproximación de cara al viento y toma en la hache. Espera la ambulancia.
7. **El final**: la tripulación cuenta lo que se ha hecho, y el sello.

## Por peldaño

Va con la estabilización que decida el paso 3 (ADR 0026). La propuesta:

- **Abajo**: la estabilización de estacionario. La raya lleva al barco y a la hache; quien juega sube, va, se para
  encima y deja que la grúa trabaje, que es justo lo que se le pide a un piloto en ese momento: no mover nada. La
  instructora cuenta cada paso.
- **En medio**: igual, con el cíclico pidiendo velocidad y el viento notándose.
- **Arriba**: la estabilización de actitud; el estacionario sobre el barco lo lleva quien juega. El operador de grúa y
  el rescatador hablan ellos, como la persona de tierra en el peldaño de cabina, y la instructora calla.

## Lo que hace falta

- **Datos**: la helisuperficie del Doctor Negrín, con su fuente y medida en la ortofoto, y la plataforma del 802 en
  Gando.
- **El pesquero**: un tipo nuevo en `world/barcos.ts`, que hoy dibuja un ferri, un catamarán y un trimarán.
- **La grúa** del modelo de Gaudí —brazo, cable y gancho, animados—, el rescatador y el pescador.
- **Las voces**:
  - la instructora, unas doce frases;
  - el operador de grúa, con voz nueva o con una de la tripulación;
  - el aviso de Salvamento Marítimo.
- **La lámina** del rescatador bajando, que ya está en la propuesta de Gaudí.
- **Coste**: dos o tres tandas, más grabar.

## Lo que decide Enrique

1. **Mar o montaña.** Esta es de mar. La otra sería un senderista con el tobillo torcido junto al Roque Nublo, que ya
   está modelado y sería precioso; pero en Gran Canaria esos rescates los suelen hacer los helicópteros del Grupo de
   Emergencias y Salvamento, no el 802. La recomendación es el mar.
2. **El operador de grúa**: voz nueva o una de la tripulación que ya tenemos.
3. **Quién habla en cada peldaño**: la propuesta es la de arriba, como con la persona de tierra.

## Fuentes

- RTVC, «Un helicóptero militar traslada al hospital a un marinero herido grave en Gran Canaria»:
  https://rtvc.es/trasladan-al-hospital-en-helicoptero-a-un-marinero-herido-grave/
- El Debate, el rescate del crucero a 500 km de Canarias (10-04-2024):
  https://www.eldebate.com/espana/defensa/20240410/helicoptero-super-puma-rescata-mujer-ictus-crucero-lujo-500-kilometros-canarias_188006.html
- OurAirports, «Doctor Negrín Hospital Heliport» (ES-0367), en sus datos abiertos:
  https://davidmegginson.github.io/ourairports-data/airports.csv
