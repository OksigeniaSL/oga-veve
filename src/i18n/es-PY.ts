/**
 * Castellano paraguayo. Es el diccionario de referencia: cualquier clave
 * nueva se añade aquí primero.
 *
 * Registro: cercano, de tuteo, sin españolismos y sin tecnicismos. Si una
 * frase no la entendería Ña Emy, se reescribe (ver AGENTS.md).
 */

export const ES_PY = {
  "pilotos.titulo": "¿Cuál es tu avión?",
  "pilotos.nuevo": "Uno nuevo",
  "pilotos.quitar": "Quitar este avión",
  "pilotos.tuyo": "Este es tu avión",
  "pilotos.bicho": "El bicho",
  "pilotos.color": "El color",
  "pilotos.listo": "A volar",
  "bicho.tero": "Tero",
  "bicho.jaguarete": "Jaguareté",
  "bicho.karumbe": "Karumbé",
  "bicho.mburucuya": "Mburucuyá",
  "color.rojo": "Rojo",
  "color.azul": "Azul",
  "color.verde": "Verde",
  "color.amarillo": "Amarillo",
  "color.violeta": "Violeta",
  "color.naranja": "Naranja",
  "ajustes.titulo": "Ajustes",
  "ajustes.listo": "Listo",
  "ajustes.movimiento": "Movimiento",
  "ajustes.movimiento.sistema": "Como el aparato",
  "ajustes.movimiento.normal": "Normal",
  "ajustes.movimiento.reducido": "Reducido",
  "ajustes.cabeceo": "Subir y bajar el morro",
  "ajustes.cabeceo.normal": "Normal",
  "ajustes.cabeceo.invertido": "Al revés",
  "ajustes.unidades": "Unidades",
  "ajustes.unidades.peldano": "Las del peldaño",
  "ajustes.unidades.metrico": "km/h y metros",
  "ajustes.unidades.aeronautico": "Nudos y pies",
  "ajustes.tamano": "Tamaño de los mandos",
  "ajustes.tamano.pequeno": "Pequeño",
  "ajustes.tamano.normal": "Normal",
  "ajustes.tamano.grande": "Grande",
  "ajustes.volumen": "Sonido",
  "ajustes.volumen.normal": "Normal",
  "ajustes.volumen.bajo": "Bajito",
  "ajustes.volumen.mudo": "Sin sonido",
  "ajustes.contraste": "Contraste",
  "ajustes.contraste.normal": "Normal",
  "ajustes.contraste.alto": "Más marcado",
  "app.tagline": "Volá sobre Paraguay y Canarias",

  "hud.speed": "Velocidad",
  "luz.terreno": "SUELO",
  "luz.perdida": "PÉRDIDA",
  "luz.rapido": "RÁPIDO",
  "luz.tren": "TREN",
  "luz.combustible": "COMBUSTIBLE",
  "luz.frustrada": "AL AIRE",
  "luz.piloto": "SIN PILOTO",
  "luz.freno": "FRENO",
  // La cabina sin aire: ver `flight/despresurizacion.ts`.
  "luz.cabina": "CABINA",
  "luz.motor": "MOTOR",
  "hud.altitude": "Altura",
  "hud.heading": "Rumbo",
  "hud.throttleDown": "Menos motor",
  "hud.throttleUp": "Más motor",
  "hud.sinFoto": "Hoy no hay fotos del mundo. Volás el mundo dibujado.",
  "hud.sinVoz":
    "Este navegador no tiene voces instaladas: el instructor no puede hablar.",
  "hud.throttle": "Motor",
  "hud.vspeed": "Subida",
  "hud.stall": "¡Pérdida! Bajá el morro",
  "hud.pullUp": "El suelo. Subí",
  "hud.runwayEnd": "¡Se acaba la pista!",
  /*
   * Las dos tomas buenas se celebran igual, y las dos dicen por qué: **en su
   * sitio**. Lo que hace bueno un aterrizaje es dónde se toca, no lo suave
   * que fue (punto 299; ver `flight/aterrizaje.ts`).
   */
  "hud.landedSoft": "¡Qué aterrizaje! Suavecito y en su sitio",
  "hud.landedFast": "¡Muy rápido! Bajá el motor antes de tocar",
  "hud.landedFirm": "¡Buen aterrizaje! Firme y en su sitio",
  "hud.landedOffRunway": "Bajaste fuera de la pista, pero bajaste",
  "hud.landedShort":
    "Bajaste antes de la barra blanca: las flechas son para rodar y despegar",
  "hud.brakes": "Frenos",
  "hud.crashed": "Se rompió algo. Volvemos a la pista…",
  "hud.home": "Pista",
  "hud.objective": "Objetivo",
  "sound.normal": "Sonido normal",
  "sound.bajo": "Sonido bajo",
  "sound.mudo": "Sin sonido",

  "units.kmh": "km/h",
  "units.metres": "m",
  "units.mps": "m/s",
  "units.knots": "kt",
  "units.feet": "ft",
  "units.fpm": "ft/min",

  "aircraft.pykasu.description":
    "Avioneta de escuela. Tranquila y perdonadora.",
  "aircraft.mainumby.description":
    "Biplano fumigador. Ágil y con mucha fuerza.",
  "aircraft.panambi.description":
    "Bimotor de ala baja. Dos motores, más rápido y con las patas guardadas.",
  "aircraft.arasunu.description":
    "Turbohélice regional, cola en T. Grande, y entra en pistas cortas.",
  "aircraft.arai.description":
    "Reactor de ala en flecha. Rápido, y todo pasa más despacio.",
  "aircraft.yvaga.description":
    "Cuatrimotor de fuselaje ancho. El grande: cuenta los motores.",

  "mission.rio.name": "Ver el río",
  "mission.rioabajo.name": "Seguir el río",
  "mission.mar.name": "Salir al mar",
  "mission.anaga.name": "A Anaga",
  "mission.cumbre.name": "A la cumbre",
  "mission.lomas.name": "A las lomas",
  "mission.first.name": "Tu primer vuelo",
  "mission.valley.name": "La vuelta al valle",
  "mission.transfer.name": "El traslado",
  "mission.started": "{name}",
  "mision.titulo": "Qué hay que hacer",
  "mision.despegar": "Despegar",
  "mision.llegar": "Llegar al punto",
  "mision.aterrizar": "Aterrizar",
  "mision.hecho": "Hecho",
  "mission.step": "¡Bien! Seguí",
  "mission.done": "¡Misión cumplida!",
  "mission.none": "Vuelo libre",

  "scenario.guarani.name": "Guaraní · Ciudad del Este",
  "scenario.estigarribia.name": "Mariscal Estigarribia · el Chaco",
  "scenario.pedroJuan.name": "Pedro Juan Caballero · Amambay",
  "scenario.encarnacion.name": "Encarnación · el Paraná",
  "scenario.concepcion.name": "Concepción · el norte",
  "scenario.ayolas.name": "Ayolas · Yacyretá",
  "scenario.pilar.name": "Pilar · Ñeembucú",
  "scenario.valle.name": "Valle de la Cordillera",
  "scenario.pettirossi.name": "Silvio Pettirossi",
  "scenario.yvytu.name": "Yvytu Rape · Granja Óga",
  "scenario.chaco.name": "Llanura del Chaco",
  "scenario.tenerife.name": "Tenerife Norte",
  "scenario.laPalma.name": "La Palma",
  "scenario.tenerifeSur.name": "Tenerife Sur",
  "scenario.granCanaria.name": "Gran Canaria",
  "scenario.lanzarote.name": "Lanzarote",
  "scenario.fuerteventura.name": "Fuerteventura",
  "scenario.elHierro.name": "El Hierro",
  "scenario.laGomera.name": "La Gomera",
  "scenario.cuatroVientos.name": "Cuatro Vientos",

  "tutor.throttle": "Dale motor",
  "tutor.speed": "Esperá a que corra",
  "tutor.pull": "Tirá para arriba",
  "tutor.flying": "¡Estás volando!",
  "tutor.frenar": "Frená",
  "tutor.salir": "Seguí la raya y salí de la pista",
  "tutor.slow": "Bajá el motor",
  /*
   * **Los mandos, contados la primera vez que se usan**, en los tres peldaños
   * de abajo: la palanca del dedo que se queda donde se deja, el doble toque
   * que la centra, el tope de inclinación del avión protegido y el mando de
   * juego que se conecta. Sin su grabación no se piden: lo que hay mientras es
   * el dibujo y el movimiento de la palanca. Ver `explicarLosMandos` en
   * `game.ts`.
   */
  "tutor.palancaSeQueda":
    "La palanca se queda donde la dejás: el avión sigue así. Para volar derecho, tocala dos veces.",
  "tutor.dobleToque": "Muy bien: alas derechas y vuelo nivelado.",
  "tutor.inclinacionTope":
    "Más no se inclina: treinta y tres grados es el tope. Así viajan tranquilos los pasajeros.",
  "tutor.mandoConectado": "Mando conectado: podés volar con él.",
  "tutor.joystickConectado": "Joystick conectado: podés volar con él.",
  /*
   * **Y la palabra de la tarjeta del mando**, con su dibujo: el de consola o
   * el joystick. Ver `Game.mostrarElMando`.
   */
  "palabra.mando": "Mando",
  "palabra.joystick": "Joystick",
  /*
   * Y la barra alargada de abajo del teléfono, en tierra: «¿para qué es?».
   * «Se dobla» y no «la rueda de adelante», porque vale para los seis: el
   * fumigador lleva patín de cola y también dobla con los pedales. Ver
   * `contarLosPedales` en `game.ts`.
   */
  "tutor.pedales":
    "Abajo tenés los pedales del timón: en tierra, con ellos se dobla. Pisá el de la izquierda para ir a la izquierda.",
  "help.assist": "M — nivel de dificultad",
  "help.start": "Empujá el motor a tope y tirá suave cuando corra",

  "teclas.title": "Teclas",
  "teclas.cambiar": "Cambiar las teclas",
  "teclas.mano": "Con qué mano manejás el motor",
  "teclas.zurda": "Mano izquierda",
  "teclas.diestra": "Mano derecha",
  "teclas.hint":
    "Tocá una tecla para cambiarla. Escape para dejarlo como está.",
  "teclas.pulsa": "Apretá una tecla…",
  /*
   * **Lo que hace un toque corto de flecha**, que no se descubre solo. Va
   * debajo del dibujo que lo enseña, para quien ya lee. Ver
   * `flight/palanca-de-teclado.ts`. TRIM va en inglés: es lo que pone en la
   * cabina y en el indicador.
   */
  "teclas.toque":
    "En el aire, las flechas inclinan el avión y lo hacen subir o bajar despacio, y al soltarlas se queda como lo dejaste: lo sostiene el compensador, TRIM. Un toque cortito lo mueve un poquito más.",
  /*
   * **Que se puede jugar con mando o joystick.** Va debajo del dibujo del
   * mando y del joystick. Ver `conMando` en `ui/teclas.ts`.
   */
  "teclas.mando":
    "También se juega con mando o con joystick de vuelo: enchufalo y movelo. Con el joystick, la seta es el TRIM, el gatillo frena y los botones de la base mueven los flaps y el tren.",
  "teclas.restore": "Como venía",
  "teclas.close": "Cerrar",
  "tecla.pitchUp": "Subir el morro",
  "tecla.pitchDown": "Bajar el morro",
  /*
   * **El compensador**, que no es «subir el morro» otra vez.
   *
   * La diferencia es la que hay entre empujar una puerta y dejarla apoyada:
   * el mando vuelve al centro al soltarlo y el compensador se queda. Por eso
   * el rótulo dice «dejar» y no «subir» — es lo único que separa las dos
   * parejas de teclas cuando se ven juntas en el cuadro de mandos.
   */
  "tecla.trimUp": "Dejar el morro más arriba",
  "tecla.trimDown": "Dejar el morro más abajo",
  "tecla.cuadro": "Bajar o subir el cuadro",
  "tecla.rollLeft": "Girar a la izquierda",
  "tecla.rollRight": "Girar a la derecha",
  "tecla.yawLeft": "Timón a la izquierda",
  "tecla.yawRight": "Timón a la derecha",
  "tecla.throttleUp": "Más motor",
  "tecla.throttleDown": "Menos motor",
  "tecla.brakes": "Frenos",
  "tecla.reversa": "Reversa",
  "tecla.flaps": "Flaps",
  "tecla.tren": "Tren",
  "tecla.aerofrenos": "Aerofrenos",
  "tecla.autofreno": "Autofreno",
  "tecla.camera": "Cambiar cámara",
  "tecla.assist": "Nivel de dificultad",
  "tecla.reset": "Volver a empezar",
  "tecla.aircraft": "Cambiar de avión",
  "tecla.mission": "Cambiar de misión",
  "tecla.destino": "Cambiar de destino",
  /*
   * Al tocar la tarjeta del destino cuando no hay otro sitio adonde ir: con
   * este avión, o desde este campo. Que no parezca que el botón no anda.
   */
  "vuelo.solo-vuelta": "Desde acá, vuelta al campo",
  "vuelo.solo-vuelta.no-cabe":
    "Con este avión, vuelta al campo. Para ir a {sitios}, elegí uno más chico en el hangar",
  "tecla.qnhUp": "Subir el reglaje del altímetro",
  "tecla.qnhDown": "Bajar el reglaje del altímetro",
  /*
   * La rueda de la ventanilla ALT del automático, en la T y la Y, que están
   * juntas como la O y la U del altímetro. Ver `flight/altitud-seleccionada.ts`.
   */
  "tecla.altUp": "Subir la altura de la ventanilla ALT",
  "tecla.altDown": "Bajar la altura de la ventanilla ALT",
  "tecla.sound": "Sonido",
  "tecla.language": "Idioma",
  "tecla.credits": "Créditos",
  "tecla.keys": "Ver y cambiar las teclas",
  "tecla.pausa": "Parar el juego",
  "tecla.engine": "Arrancar o apagar el motor",
  "hud.engineOff": "Motor apagado",
  "hud.engineBusy": "Parate del todo y bajá el motor primero",
  "hud.engineOn": "¡Motor en marcha!",
  "credits.title": "Créditos",
  "credits.madeBy": "Un producto de Oksigenia SL, bajo la marca Granja Óga.",
  "credits.educational":
    "Gratis para siempre para toda la educación paraguaya: colegios, docentes, alumnos y familias. Sin trámites y sin pagar nada.",
  // **Literal y sin resumir**: la licencia de Copernicus exige esta frase
  // exacta, y por eso no se traduce la parte legal.
  "credits.cancion": "La canción del simulador: «Luz verde», de Granja Óga.",
  "credits.cancionEnlace": "Escuchala en YouTube",
  "credits.terrain":
    "Relieve a partir de Copernicus DEM GLO-30. © DLR e.V. 2010-2014 y © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.",
  "credits.terrainEs":
    "Relieve de España a partir del MDT05 del PNOA-LiDAR © Instituto Geográfico Nacional de España, CC BY 4.0.",
  /*
   * **Y las cuatro que faltaban, que llevaban meses solo en CREDITOS.md.**
   *
   * Un fichero del repositorio no es «atribución visible»: quien juega no lo
   * abre nunca. Las cuatro fuentes de abajo se cargan en el juego de verdad y
   * las cuatro licencias piden que se diga **a quien lo usa**. Que estuvieran
   * anotadas y no enseñadas es el error más fácil de cometer aquí, porque por
   * dentro parece hecho.
   */
  // ODbL: pide avisar a quien usa los datos, no solo guardarlo escrito.
  "credits.osm":
    "Aeródromos, calles de rodaje, plataformas y ciudades a partir de datos de © colaboradores de OpenStreetMap, bajo licencia ODbL.",
  "credits.ortoEs":
    "Ortofoto de España: PNOA © Instituto Geográfico Nacional de España, CC BY 4.0 · scne.es.",
  // La cadena que pide EOX, literal. Ver CREDITOS.md.
  "credits.ortoPy":
    "Ortofoto de Paraguay: EOxCloudless (cloudless.eox.at) de EOX IT Services GmbH — contiene datos Copernicus Sentinel modificados, 2020.",
  "credits.engine": "Modelo de vuelo: {model}",
  "credits.licence":
    "Código libre bajo Apache-2.0. Contenido y marcas, © Oksigenia SL.",
  "credits.dedication":
    "A Guillermo Ayala, del Parque Nacional del Teide, que lleva cuarenta años enseñando esa montaña a escolares. La regla que gobierna este juego es suya: seguridad, seguridad, seguridad — a partir de ahí, todo lo demás es aprendizaje.",
  "credits.close": "Cerrar",

  // ── El vuelo completo ──────────────────────────────────────────────────
  // Una frase por fase, y **todas en imperativo y en segunda persona**: quien
  // lee esto está haciendo algo, no consultando un manual. Cortas, porque se
  // leen de reojo y con las manos ocupadas.
  // La lámpara de la torre. El texto existe porque **un color solo no es
  // información**: quien no distinga el rojo del verde tiene que poder saberlo.
  /*
   * **Y la verde nombra la pista**, como la fraseología de verdad: «pista dos
   * cero, autorizado a despegar». Decía «podés entrar» sin decir por dónde, y
   * el número de la pista es lo que está pintado delante del morro mientras
   * se oye. Va con la matrícula, en el mismo hueco —«Zulu Papa Alfa, pista
   * dos cero»—: así cada idioma dice lo suyo detrás sin un hueco más que
   * llenar. Ver `pistaEnCastellano` y `luzDeTorre` en `game.ts`.
   */
  "torre.verde": "{indicativo}, autorizado a despegar",
  /*
   * **La torre habla como una torre, también en castellano.** Decía «esperá
   * acá», «podés volar a…» y «subí a…»: voseo de juego en boca de un
   * controlador. Lo que se oye aquí es la fraseología de verdad, la del Doc
   * 4444 de la OACI en español, que en Paraguay publica la DINAC (DINAC R
   * 4444, cap. 12) y en España el anexo V del Real Decreto 1180/2018; quien
   * cuenta en voz de casa qué ha dicho la torre es la instructora, en los
   * peldaños de abajo.
   *
   * La roja se enciende en el punto de espera, antes de la pista: «mantenga
   * fuera de pista (número)» —«hold short of runway»—, igual en las dos
   * fuentes (DINAC R 4444, 12.3.4.7 y 12.3.4.8; RD 1180/2018, 1.4.8 y 1.4.9).
   * El número lo pone `luzDeTorre` detrás, como pone el de la verde con la
   * matrícula: así cada idioma dice lo suyo sin un hueco más que llenar.
   */
  "torre.roja": "{indicativo}, mantenga fuera de pista",
  /* Y la verde a un avión **en el aire**, que en las señales de luz de verdad
     quiere decir otra cosa: autorizado para aterrizar. Con «para», que es
     como lo escriben las tres fuentes (Doc 4444 y DINAC R 4444, 12.3.4.16;
     RD 1180/2018, 1.4.17); «autorizado a» es el del despegue. Ver
     `luzDeTorre`. */
  "torre.aterrizar": "{indicativo}, autorizado para aterrizar",
  /*
   * Y la roja **en el aire**: la orden de irse al aire. Era la palabra de la
   * tarjeta, «¡Al aire!», dicha con la voz de la torre y sin grabar, así que
   * donde el navegador no tiene voz la orden de seguridad no sonaba. Ahora es
   * la de la fraseología: «ida al aire» (DINAC R 4444 y Doc 4444, 12.3.4.18).
   */
  "torre.alAire": "{indicativo}, ida al aire",
  /*
   * Y a quien se queda parado en la pista después de oír que había que
   * dejarla, la prisa: «acelere abandono de pista» —«expedite vacating»—, la
   * de la fraseología después del aterrizaje (RD 1180/2018, 1.4.21 c; las dos
   * salen del Doc 4444 en castellano). Una vez por toma, y solo con su
   * grabación. Ver `meterPrisaParaSalir` en `game.ts`.
   */
  "torre.acelereAbandono": "{indicativo}, acelere abandono de pista",
  /*
   * Y a quien aterrizó con la orden de irse al aire puesta, después de tocar:
   * que llame a la torre por teléfono al llegar, que es lo que se hace en
   * España y en la OACI (no hay frase del Doc 4444 para esto; en la FAA es el
   * aviso de Brasher). Ver `aterrizoContraLaOrden` en `game.ts`.
   */
  "torre.aterrizoSinPermiso":
    "{indicativo}, aterrizó sin autorización; llame a la torre por teléfono a su llegada",
  /*
   * Y a dónde se va, **antes de rodar**. En un vuelo a otro aeródromo lo
   * primero que da el control es la autorización con su límite —«cleared to
   * Tenerife Norte»—, y es lo que dice que ese vuelo va a alguna parte. En
   * castellano, «(indicativo) autorizado a» y el lugar (DINAC R 4444,
   * 12.3.2.1 b; RD 1180/2018, 1.2.1 b). `{destino}` es el nombre en radio del
   * campo: ver `lugar.*` más abajo y `audio/destino-dicho.ts`.
   */
  "torre.destino": "{indicativo}, autorizado a {destino}",
  /*
   * **La autorización de altitud, por escalones**: el control dice hasta
   * dónde subir. «Ascienda a (nivel)» en Paraguay (DINAC R 4444, 6.3.2.4.2 y
   * 12.3.1.2); por debajo de la altitud de transición en pies, con el millar
   * y la palabra MIL —«tres mil pies»—, y por encima en nivel de vuelo, cifra
   * a cifra —«nivel de vuelo uno uno cero»— (DINAC R 10, vol. II,
   * 5.2.1.4.1). `{altura}` va ya dicha así: ver `alturaEnCastellano` en
   * `flight/autorizacion-de-altitud.ts`.
   *
   * Los trozos `solo` son lo que se graba: una frase entera por millar en
   * pies, y el principio del nivel, al que siguen sus tres cifras.
   */
  "torre.subir": "{indicativo}, ascienda a {altura}",
  "torre.solo.subir": "ascienda a {n} mil pies",
  "torre.solo.subirNivel": "ascienda a nivel de vuelo",
  /*
   * ── Y la misma torre, en Canarias ──────────────────────────────────────
   *
   * **No es el acento: son las palabras.** El castellano del juego es
   * paraguayo y se vosea, y eso se queda; pero la torre no es el juego, es el
   * sitio, y en Tenerife nadie dice «podés». Grabar «podés entrar» con voz
   * canaria sería un canario imitando a un paraguayo.
   *
   * Quién habla así lo decide el indicativo OACI del aeródromo y no una lista
   * escrita a mano: todo lo que empieza por `GC` son las islas. Ver
   * `i18n/habla.ts`. «No sólo Tenerife y La Palma, si se ponen más
   * aeropuertos canarios también van.»
   *
   * Son claves aparte porque el pack de voz busca por clave: con la misma
   * clave, las dos torres sonarían con la voz que se hubiera cargado antes.
   */
  /*
   * ── **Lo que dice un AFIS**, que informa y no autoriza ──────────────────
   *
   * Donde contesta un AFIS —Pilar, Pedro Juan Caballero, Mariscal
   * Estigarribia, Concepción, La Gomera— no hay lámpara ni permiso: se dice
   * cómo está la pista y quién anda, y quien vuela decide. Van troceadas como
   * las de la lámpara, con la matrícula delante. Las dos «pista libre» se
   * dicen igual: la de final lleva otro nombre porque es la que se retira al
   * dejar la final. Ver `DICE_UN_AFIS` en `audio/torre.ts`.
   */
  "torre.afisLibre": "{indicativo}, pista libre",
  "torre.afisLibreEnFinal": "{indicativo}, pista libre",
  "torre.afisOcupada": "{indicativo}, pista ocupada",
  "torre.afisSinTrafico": "{indicativo}, sin tráfico conocido",
  "torre.afisTraficoAterriza": "{indicativo}, tráfico aterrizando",
  "torre.afisTraficoDespega": "{indicativo}, tráfico despegando",
  "torre.canario.afisLibre": "{indicativo}, pista libre",
  "torre.canario.afisLibreEnFinal": "{indicativo}, pista libre",
  "torre.canario.afisOcupada": "{indicativo}, pista ocupada",
  "torre.canario.afisSinTrafico": "{indicativo}, sin tráfico conocido",
  "torre.canario.afisTraficoAterriza": "{indicativo}, tráfico aterrizando",
  "torre.canario.afisTraficoDespega": "{indicativo}, tráfico despegando",
  "torre.canario.verde": "{indicativo}, autorizado a despegar",
  "torre.canario.roja": "{indicativo}, mantenga fuera de pista",
  "torre.canario.aterrizar": "{indicativo}, autorizado para aterrizar",
  // En España no es «ida al aire»: «motor y al aire» (RD 1180/2018, 1.4.19).
  "torre.canario.alAire": "{indicativo}, motor y al aire",
  "torre.canario.acelereAbandono": "{indicativo}, acelere abandono de pista",
  "torre.canario.aterrizoSinPermiso":
    "{indicativo}, aterrizó sin autorización; llame a la torre por teléfono a su llegada",
  "torre.canario.destino": "{indicativo}, autorizado a {destino}",
  /*
   * **Y en España se sube con «suba»**, no con «ascienda»: es la palabra del
   * anexo V del RD 1180/2018 —«SUBA A (nivel)», 1.1.2—. Lo que cambia aquí
   * no es el acento, es el reglamento. Los niveles, cifra a cifra como en
   * todas partes (SERA.14035, al que remite el RCA en 10.5.2.1.3).
   */
  "torre.canario.subir": "{indicativo}, suba a {altura}",
  /*
   * **Y tu número en la fila de salida**, detrás de la roja: «número dos para
   * la salida». Es información de secuencia, no una autorización —se espera
   * igual a la verde—, y se da con su número como la secuencia del circuito,
   * «NUMBER … FOLLOW» (Doc 4444, 12.3.4.14 b; «NÚMERO… SIGA» en el RD
   * 1180/2018, 1.4.15 b). Va suelta, detrás de la lámpara, y solo con su
   * grabación: ver `decirLaFila` en `game.ts`.
   */
  "torre.numeroDos": "número dos para la salida",
  "torre.numeroTres": "número tres para la salida",
  "torre.canario.numeroDos": "número dos para la salida",
  "torre.canario.numeroTres": "número tres para la salida",
  /** Lo que dice el dibujo de la fila, para quien no lo ve. Ver `setLuzDeTorre` en `ui/hud.ts`. */
  "hud.filaDeSalida": "Número {numero} para la salida",
  "hud.esperaLaEstela": "Esperamos la estela del avión que salió",
  "torre.canario.solo.subir": "suba a {n} mil pies",
  "torre.canario.solo.subirNivel": "suba a nivel de vuelo",

  /*
   * ── **Cómo se nombra cada campo por radio** ─────────────────────────────
   *
   * El nombre del sitio, no el del aeropuerto entero con su ciudad: es lo que
   * dice un controlador en el límite de una autorización. Solo los que son
   * destino de alguna ruta, que son los únicos que la torre puede nombrar.
   * Cada uno se graba como pieza suelta con la voz de la torre que lo dice.
   */
  "lugar.pettirossi": "Asunción",
  "lugar.guarani": "Guaraní",
  "lugar.encarnacion": "Encarnación",
  "lugar.yvytu-rape": "Yvytu Rape",
  "lugar.concepcion": "Concepción",
  "lugar.pedro-juan": "Pedro Juan Caballero",
  "lugar.estigarribia": "Mariscal Estigarribia",
  "lugar.ayolas": "Ayolas",
  "lugar.pilar": "Pilar",
  "lugar.tenerife-norte": "Tenerife Norte",
  "lugar.tenerife-sur": "Tenerife Sur",
  "lugar.gran-canaria": "Gran Canaria",
  "lugar.lanzarote": "Lanzarote",
  "lugar.fuerteventura": "Fuerteventura",
  "lugar.la-palma": "La Palma",
  "lugar.el-hierro": "El Hierro",
  "lugar.la-gomera": "La Gomera",

  /*
   * ── La megafonía de cabina: la comandante Jazlyn ────────────────────────
   *
   * **Solo en los aviones que llevan pasaje.** Una avioneta de escuela no tiene
   * megafonía ni tiene a quién hablarle, y eso es parte de lo que enseña la
   * escalera de la flota: cambiar de avión cambia el oficio. Ver `megafonia.ts`.
   *
   * Son cortas a propósito. Un anuncio de verdad dura cuarenta segundos y eso
   * en un juego es una eternidad: se queda lo que suena a anuncio y se corta lo
   * que solo es trámite.
   *
   * Y le habla a cien personas por un altavoz, así que es la primera voz del
   * juego que **no** es cercana: eso la hace reconocible sin decir quién es.
   */
  "comandante.bienvenida":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo.",
  "comandante.crosscheck": "Tripulación, armar toboganes y verificación cruzada.",
  "comandante.despegue": "Tripulación, sentados para el despegue.",
  "comandante.crucero":
    "Ya estamos arriba. Pueden soltarse el cinturón, pero si están sentados, déjenselo puestito.",
  /*
   * Y la de los baches, que acompaña al cartel del cinturón cuando lo enciende
   * el aire. Tranquila y verdadera: el peligro de una turbulencia no es para
   * el avión, es para quien va suelto, y por eso se pide el cinturón. Ver
   * `hablarDeLosBaches` en `game.ts`.
   */
  "comandante.turbulencia":
    "Señores pasajeros, vamos a pasar por una zona con algo de movimiento. Es normal y el avión está hecho para esto. Por favor, vuelvan a su asiento y abróchense el cinturón.",
  /*
   * **Y si los baches siguen, otro nivel**, siempre pedido al control. Ver
   * `flight/nivel-tranquilo.ts`. Las dos cosas que pueden pasar, y las dos
   * con calma: arriba se va mejor, o se mueve en todas partes y es normal.
   */
  "comandante.nivelMasTranquilo":
    "Señores pasajeros, les habla la comandante. Por los baches le pedimos otro nivel a control, y subimos para ir más cómodos.",
  "comandante.bachesEnTodos":
    "Señores pasajeros, les habla la comandante. Probamos otras alturas con control, pero hay baches en todos los niveles. Es normal: sigan con el cinturón puesto.",
  /*
   * **Y la turbulencia, por su nombre y dicha de muchas maneras**, todas
   * normales, para que se aprenda que es normal: por grados, la que no se
   * veía venir, la segunda vez del vuelo, la de la tormenta, la que avisó
   * otro avión, y al pasar. Ninguna grita ni dice «peligro»; las de grado
   * fuerte se graban en calma. Cada una suena el día que tiene su grabación,
   * y hasta entonces la de arriba. Ver `audio/anuncio-de-turbulencia.ts`.
   */
  "comandante.turbulencia.ligera":
    "Señores pasajeros, les habla la comandante. Vamos a pasar por una zona de turbulencia ligera: unos baches suaves, como un camino de tierra. Es normal, y el avión está hecho para esto. Se encendió la señal del cinturón: vuelvan a su asiento y abróchenselo, por favor.",
  "comandante.turbulencia.moderada":
    "Señores pasajeros, les habla la comandante. Más adelante hay turbulencia moderada: el avión se va a mover bastante un rato. Es normal, y el avión está hecho para esto. La tripulación también se va a sentar. Vuelvan a su asiento, abróchense bien el cinturón y guarden lo que tengan en la mesita.",
  "comandante.turbulencia.fuerte":
    "Señores pasajeros, les habla la comandante. Más adelante hay turbulencia fuerte. La vamos a pasar con calma: el avión está hecho para esto y nosotros sabemos cómo llevarlo. Siéntense ya y abróchense el cinturón bien ajustado. La tripulación también se sienta. Les aviso cuando pase.",
  "comandante.turbulencia.ahora.ligera":
    "Señores pasajeros, estamos pasando por un poco de turbulencia. Es de la que no se ve en el radar: se llama turbulencia en aire claro, y es normal. Se encendió la señal: vuelvan a su asiento y abróchense el cinturón.",
  "comandante.turbulencia.ahora.moderada":
    "Señores pasajeros, les habla la comandante. Estamos pasando por turbulencia moderada que no se veía venir: no sale en el radar. Es normal y el avión está hecho para esto. Vuelvan a su asiento y abróchense bien el cinturón. La tripulación se sienta también.",
  "comandante.turbulencia.ahora.fuerte":
    "Señores pasajeros, les habla la comandante. Estamos pasando por turbulencia fuerte. Con calma: el avión está hecho para esto. Quédense sentados con el cinturón bien ajustado. Les aviso cuando pase.",
  "comandante.turbulencia.otraVez.ligera":
    "Señores pasajeros, nos toca otro poquito de turbulencia, como la de antes. Ya saben: a su asiento, cinturón puesto, y seguimos el viaje tranquilos.",
  "comandante.turbulencia.otraVez.moderada":
    "Señores pasajeros, otra vez viene turbulencia, esta vez un poco más movida. Igual que antes: todos sentados y con el cinturón bien puesto. La tripulación también se sienta.",
  "comandante.turbulencia.otraVez.fuerte":
    "Señores pasajeros, les habla otra vez la comandante. Viene un tramo de turbulencia fuerte. Lo pasamos con calma, como el anterior: siéntense ya, con el cinturón bien ajustado. Les aviso cuando pase.",
  "comandante.turbulencia.tormenta":
    "Señores pasajeros, les habla la comandante. Hoy hay tormentas en el camino. El radar nos muestra dónde están y las vamos a rodear, pero el aire va a estar movido casi todo el vuelo. La señal del cinturón se queda encendida: quédense sentados y con el cinturón puesto.",
  "comandante.turbulencia.pirep":
    "Señores pasajeros, les habla la comandante. Un avión que va adelante nos avisó por radio que más adelante hay turbulencia. Gracias a su aviso nos podemos preparar: vuelvan a su asiento y abróchense el cinturón. Los aviones nos ayudamos entre nosotros.",
  "comandante.turbulencia.paso":
    "Señores pasajeros, ya estamos tranquilos. Apagamos la señal del cinturón: pueden soltarse, pero si están sentados, déjenselo puestito.",
  "comandante.turbulencia.pasoBajando":
    "Señores pasajeros, ya pasamos la turbulencia. La señal del cinturón sigue encendida porque ya empezamos a bajar.",
  "comandante.cinturon.porque":
    "Un consejo de la comandante: aunque la señal del cinturón esté apagada, mientras estén sentados déjenselo puesto, flojito. A veces la turbulencia llega sin avisar, y el cinturón es lo que los deja quietitos en su asiento.",

  /*
   * ── **Y el plan, detrás de la bienvenida** ──────────────────────────────
   *
   * Lo que dice cualquier comandante antes de salir: cuánto dura el vuelo y a
   * qué altura se va. Van en trozos aparte porque cambian con cada ruta, y
   * cada trozo es una frase entera con su número dentro: `{n}` lo rellena
   * `scripts/frases-para-grabar.mjs` con el número en letras para grabarlo,
   * y el juego con cifras para leerlo. Ver `audio/partes-de-la-comandante.ts`.
   */
  "comandante.previsto.vuelo": "El vuelo va a durar unos {n} minutos.",
  "comandante.previsto.nivel": "Vamos a volar a {n} mil pies.",
  /*
   * **Y pasada la hora, en horas**, como lo dice una comandante de verdad:
   * nadie anuncia «unos noventa minutos». Escritas enteras porque no salen
   * de rellenar la plantilla. Ver `HORAS_QUE_SE_DICEN`.
   */
  "comandante.previsto.vuelo.h75": "El vuelo va a durar más o menos una hora y cuarto.",
  "comandante.previsto.vuelo.h90": "El vuelo va a durar más o menos una hora y media.",
  "comandante.previsto.vuelo.h105":
    "El vuelo va a durar más o menos una hora y cuarenta y cinco.",
  "comandante.previsto.vuelo.h120": "El vuelo va a durar más o menos dos horas.",

  /*
   * ── **El descenso, en su sitio y con lo que se cuenta** ─────────────────
   *
   * «Empezamos a bajar» sonaba al entrar en final, que es donde no lo dice
   * nadie. Va donde lo pone cualquier vuelo de línea —al empezar a bajar— y
   * con lo que dice cualquier comandante: hacia dónde, cuánto falta, qué
   * cielo y qué temperatura hay allí. Se monta con cuatro trozos: el de hacia
   * dónde, uno por destino como la bienvenida; los minutos; el cielo y los
   * grados, que salen del parte del destino. Ver `descensoPara`.
   */
  "comandante.descenso.hacia":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar.",
  "comandante.descenso.vuelta":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar para volver al aeropuerto.",
  "comandante.descenso.hacia.pettirossi":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Asunción.",
  "comandante.descenso.hacia.guarani":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Ciudad del Este.",
  "comandante.descenso.hacia.encarnacion":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Encarnación.",
  "comandante.descenso.hacia.concepcion":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Concepción.",
  "comandante.descenso.hacia.pedro-juan":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Pedro Juan Caballero.",
  "comandante.descenso.hacia.estigarribia":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Mariscal Estigarribia.",
  "comandante.descenso.hacia.ayolas":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Ayolas.",
  "comandante.descenso.hacia.pilar":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Pilar.",
  "comandante.descenso.hacia.yvytu-rape":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Yvytu Rape, la pista de la Granja Óga.",
  "comandante.descenso.hacia.tenerife-norte":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Tenerife Norte.",
  "comandante.descenso.hacia.tenerife-sur":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Tenerife Sur.",
  "comandante.descenso.hacia.gran-canaria":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Gran Canaria.",
  "comandante.descenso.hacia.lanzarote":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Lanzarote.",
  "comandante.descenso.hacia.fuerteventura":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia Fuerteventura.",
  "comandante.descenso.hacia.la-palma":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia La Palma.",
  "comandante.descenso.hacia.el-hierro":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia El Hierro.",
  "comandante.descenso.hacia.la-gomera":
    "Señores pasajeros, les habla nuevamente la comandante. Empezamos a bajar hacia La Gomera.",
  "comandante.minutos": "Vamos a aterrizar en unos {n} minutos.",
  // Y lo mismo pasada la hora, si la bajada empieza tan lejos. Ver arriba.
  "comandante.minutos.h75": "Vamos a aterrizar en más o menos una hora y cuarto.",
  "comandante.minutos.h90": "Vamos a aterrizar en más o menos una hora y media.",
  "comandante.minutos.h105": "Vamos a aterrizar en más o menos una hora y cuarenta y cinco.",
  "comandante.minutos.h120": "Vamos a aterrizar en más o menos dos horas.",
  "comandante.cielo.despejado": "Allá el cielo está despejado.",
  "comandante.cielo.nubes": "Allá hay algunas nubes.",
  "comandante.cielo.nublado": "Allá está nublado.",
  "comandante.cielo.lluvia": "Allá está lloviendo.",
  /*
   * La tormenta se dice, porque es verdad y porque quien va sentado atrás
   * prefiere saberlo antes que descubrirlo con el primer bache. Y se dice
   * como se dice en una cabina: con lo que hay que hacer y sin drama. Las
   * voces avisan, no asustan.
   */
  "comandante.cielo.tormenta":
    "Allá hay tormenta, así que el avión se puede mover un poco: con el cinturón bien puesto, tranquilos.",
  "comandante.cielo.niebla": "Allá hay niebla.",
  "comandante.temperatura": "La temperatura es de {n} grados.",
  "comandante.temperaturaBajoCero": "La temperatura es de {n} grados bajo cero.",
  /*
   * Y ya en la aproximación, la orden a la tripulación de cabina: sentarse y
   * preparar la cabina. Por encima de la final, que en la final la palabra es
   * de la instructora. Ver `EN_APROXIMACION`.
   */
  "comandante.aproximacion": "Tripulación, prepararse para el aterrizaje.",
  /*
   * **Y la cabina sin aire**, con la frase de los procedimientos de verdad: la
   * comandante avisa a la tripulación de cabina —«atención, tripulación,
   * descenso de emergencia»— para que se siente y se ponga la máscara, y al
   * llegar abajo le dice que ya están a una altura segura. Al pasaje le habla
   * al llegar; las máscaras las cuenta la tripulación, y en el avión que no la
   * lleva, ella. Ver `flight/despresurizacion.ts`.
   */
  "comandante.descensoDeEmergencia": "Tripulación, descenso de emergencia.",
  "comandante.alturaSegura": "Tripulación, ya estamos a una altura segura.",
  "comandante.mascaras":
    "Señores pasajeros, les habla la comandante. Pónganse la máscara de oxígeno sobre la nariz y la boca: primero la suya, y después ayuden a los demás. Vamos a bajar rápido a una altura donde se respira bien.",
  "comandante.yaSeRespira":
    "Señores pasajeros, les habla la comandante. Ya estamos a una altura donde se respira bien: pueden quitarse la máscara. Vamos al aeropuerto más cercano. Gracias por la calma.",

  /*
   * ── **La tripulación de cabina** ────────────────────────────────────────
   *
   * Solo en los aviones que la llevan: del JAZ 90 para arriba. El JAZ 60, de
   * diecinueve plazas, vuela sin auxiliar, que es lo que dice la ley. Ver
   * `conTripulacion`.
   *
   * Le habla al pasaje de usted —«abróchense», «pongan»—, como cualquier
   * tripulación. Y con el acento del sitio, como la torre: en Paraguay dice
   * «derechito» y ofrece chipa; en Canarias, `tripulacion.canario.*`, dice
   * «recto» y llama plátano al plátano. Ver `audio/servicio-a-bordo.ts`.
   *
   * El servicio es **una plantilla y varios productos**, grabados enteros
   * con la misma voz: lo que cambia de un vuelo a otro es lo que se ofrece, y
   * nunca se repite seguido. Lo que se ofrece es de la granja e inventado; ni
   * una marca ajena.
   */
  "tripulacion.servicio.mango":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua fresca, y fruta deshidratada de mango de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.servicio.pina":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua fresca, y fruta deshidratada de piña de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.servicio.banana":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua fresca, y fruta deshidratada de banana de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.servicio.mani":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua fresca, y maní tostado de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.servicio.chipa":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua fresca, y chipa de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.servicio.mbeju":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua fresca, y mbejú de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.servicio.largo":
    "Y como el viaje es largo, también tenemos café y té calentitos.",
  "tripulacion.cinturones":
    "Señoras y señores, se encendió la señal de cinturones. Abróchense el cinturón, pongan el respaldo derechito y guarden la mesita, por favor. Muchas gracias.",
  /*
   * Y el servicio que se para por la turbulencia y sigue al pasar, detrás de
   * la comandante. Solo con su grabación. Ver `anunciarLaTurbulencia`.
   */
  "tripulacion.servicio.pausa":
    "Señoras y señores, por la turbulencia paramos un ratito el servicio y la tripulación se va a sentar. En cuanto se calme, seguimos.",
  "tripulacion.servicio.seguimos":
    "Ya se calmó: seguimos con el servicio. Muchas gracias por la paciencia.",
  "tripulacion.canario.servicio.mango":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua, y mango deshidratado de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.canario.servicio.pina":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua, y piña deshidratada de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.canario.servicio.banana":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua, y plátano deshidratado de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.canario.servicio.mani":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua, y manises tostados de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.canario.servicio.mango.paraguay":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua, y mango deshidratado; un sabor de Paraguay, de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.canario.servicio.pina.paraguay":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua, y piña deshidratada; un sabor de Paraguay, de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.canario.servicio.banana.paraguay":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua, y plátano deshidratado; un sabor de Paraguay, de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.canario.servicio.mani.paraguay":
    "Señoras y señores, en unos minutos pasamos por el pasillo con el servicio a bordo: agua, y manises tostados; un sabor de Paraguay, de la Granja Óga. ¡Que lo disfruten!",
  "tripulacion.canario.servicio.largo":
    "Y como el viaje es largo, también tenemos café y té.",
  "tripulacion.canario.cinturones":
    "Señoras y señores, se ha encendido la señal de cinturones. Por favor, abróchense el cinturón, pongan el respaldo recto y recojan la mesita. Muchas gracias.",
  "tripulacion.canario.servicio.pausa":
    "Señoras y señores, debido a la turbulencia interrumpimos un momento el servicio y la tripulación va a tomar asiento. En cuanto mejore, continuamos.",
  "tripulacion.canario.servicio.seguimos":
    "Ya se ha calmado: continuamos con el servicio. Muchas gracias por su paciencia.",
  /*
   * **Las máscaras**, que caen solas: lo que dice cualquier tripulación, con
   * «primero la suya» dentro. Al pasaje, de usted. En Canarias, «mascarilla»,
   * que es como se llama allí.
   */
  "tripulacion.mascaras":
    "Señoras y señores: tiren de la máscara hacia ustedes, pónganla sobre la nariz y la boca y respiren normal. Primero la suya, y después ayuden a los demás. Vamos a bajar a una altura donde se respira bien.",
  "tripulacion.canario.mascaras":
    "Señoras y señores: tiren de la mascarilla hacia ustedes, colóquensela sobre la nariz y la boca y respiren con normalidad. Pónganse primero la suya y luego ayuden a quien lo necesite. Vamos a bajar a una altura donde se respira bien.",
  /*
   * **Y al dejar la pista, rodando a la terminal**, lo que dice cualquier
   * tripulación: bienvenidos, sentados y con el cinturón hasta que el avión
   * pare y se apague la señal, ya se puede usar el teléfono, cuidado con los
   * compartimentos y que no se olvide nada. Ver
   * `audio/anuncio-tras-la-toma.ts`, con las fuentes.
   *
   * Dos frases enteras: la bienvenida, una por campo —solo los campos donde
   * cabe un avión con tripulación de cabina—, y el resto, igual en todos y con
   * sus otras formas en `audio/variantes.ts`. La de reserva, con el hueco del
   * nombre, para un campo nuevo que todavía no tenga la suya.
   *
   * En Paraguay, «celulares» y «compartimientos»; en Canarias, «móviles» y
   * «compartimentos superiores», que es como se dice en cada sitio.
   */
  "tripulacion.bienvenidos": "Señoras y señores, bienvenidos a {campo}.",
  "tripulacion.bienvenidos.pettirossi": "Señoras y señores, bienvenidos a Asunción.",
  "tripulacion.bienvenidos.guarani": "Señoras y señores, bienvenidos a Ciudad del Este.",
  "tripulacion.bienvenidos.encarnacion": "Señoras y señores, bienvenidos a Encarnación.",
  "tripulacion.bienvenidos.pedro-juan":
    "Señoras y señores, bienvenidos a Pedro Juan Caballero.",
  "tripulacion.trasLaToma":
    "Les pedimos que sigan sentados, con el cinturón abrochado, hasta que el avión se detenga por completo y se apague la señal de cinturones. Ya pueden usar sus celulares. Tengan cuidado al abrir los compartimientos de arriba, porque el equipaje se pudo mover durante el vuelo. Muchas gracias.",
  "tripulacion.canario.bienvenidos": "Señoras y señores, bienvenidos a {campo}.",
  "tripulacion.canario.bienvenidos.tenerife-norte":
    "Señoras y señores, bienvenidos a Tenerife Norte.",
  "tripulacion.canario.bienvenidos.tenerife-sur":
    "Señoras y señores, bienvenidos a Tenerife Sur.",
  "tripulacion.canario.bienvenidos.gran-canaria":
    "Señoras y señores, bienvenidos a Gran Canaria.",
  "tripulacion.canario.bienvenidos.lanzarote": "Señoras y señores, bienvenidos a Lanzarote.",
  "tripulacion.canario.bienvenidos.fuerteventura":
    "Señoras y señores, bienvenidos a Fuerteventura.",
  "tripulacion.canario.bienvenidos.la-palma": "Señoras y señores, bienvenidos a La Palma.",
  "tripulacion.canario.bienvenidos.la-gomera": "Señoras y señores, bienvenidos a La Gomera.",
  "tripulacion.canario.trasLaToma":
    "Por favor, permanezcan sentados y con el cinturón abrochado hasta que el avión se detenga por completo y se apague la señal de cinturones. Ya pueden utilizar sus teléfonos móviles. Tengan cuidado al abrir los compartimentos superiores, porque el equipaje puede haberse movido durante el vuelo. Muchas gracias.",
  // Y lo que pone la tarjeta del servicio debajo de la botella, desde el
  // peldaño que lee. En Guyrami va solo el dibujo.
  "servicio.rotulo": "Servicio a bordo",

  /*
   * ── **Y la bienvenida dice a dónde se va** ──────────────────────────────
   *
   * Lo primero que cuenta una comandante de verdad, después de presentarse,
   * es el destino: es la frase que confirma a cada pasajero que se subió al
   * avión que era. La de arriba no lo decía, y el destino se elegía en el
   * hangar para que después nadie lo nombrara hasta aterrizar.
   *
   * Una grabación entera por destino, como las llegadas: el nombre del sitio
   * pegado con piezas en mitad de una frase de megafonía se nota. La de
   * arriba se queda de reserva para un destino nuevo que todavía no tenga la
   * suya. Y la vuelta al campo también se dice, porque volver al mismo sitio
   * es un plan y no la falta de uno. Ver `bienvenidaPara`.
   */
  "comandante.bienvenida.local":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo. Hoy damos una vuelta por los alrededores y volvemos acá mismo.",
  "comandante.bienvenida.pettirossi":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Asunción.",
  "comandante.bienvenida.guarani":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Ciudad del Este.",
  "comandante.bienvenida.encarnacion":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Encarnación.",
  "comandante.bienvenida.concepcion":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Concepción.",
  "comandante.bienvenida.pedro-juan":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Pedro Juan Caballero.",
  "comandante.bienvenida.estigarribia":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Mariscal Estigarribia.",
  "comandante.bienvenida.ayolas":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Ayolas.",
  "comandante.bienvenida.pilar":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Pilar.",
  "comandante.bienvenida.yvytu-rape":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Yvytu Rape, la pista de la Granja Óga.",
  "comandante.bienvenida.tenerife-norte":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Tenerife Norte.",
  "comandante.bienvenida.tenerife-sur":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Tenerife Sur.",
  "comandante.bienvenida.gran-canaria":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Gran Canaria.",
  "comandante.bienvenida.lanzarote":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Lanzarote.",
  "comandante.bienvenida.fuerteventura":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a Fuerteventura.",
  "comandante.bienvenida.la-palma":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a La Palma.",
  "comandante.bienvenida.el-hierro":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a El Hierro.",
  "comandante.bienvenida.la-gomera":
    "Señores pasajeros, buenas, les habla la comandante Jazlyn. Bienvenidos a bordo de este vuelo a La Gomera.",

  /*
   * ── **Y la bienvenida, siempre distinta** ───────────────────────────────
   *
   * Las de arriba son la forma de siempre, y se quedan en la rueda. Éstas son
   * las otras: el saludo según la hora —desde la cabina, a los pasajeros, o a
   * los más chicos de a bordo—, con gracia, la frase del destino con un
   * detalle cierto del sitio, y el cierre. Se montan con el plan y el tiempo
   * de allá en la receta de siempre, y nunca sale la misma dos vuelos
   * seguidos. Cada una es una frase entera, para grabarla entera. Ver
   * `audio/bienvenidas.ts`.
   */
  "comandante.bienvenida.saludo.pasajeros.dias":
    "Buenos días, señores pasajeros. Les habla la comandante Jazlyn.",
  "comandante.bienvenida.saludo.pasajeros.tardes":
    "Buenas tardes, señores pasajeros. Les habla la comandante Jazlyn.",
  "comandante.bienvenida.saludo.pasajeros.noches":
    "Buenas noches, señores pasajeros. Les habla la comandante Jazlyn.",
  "comandante.bienvenida.saludo.cabina.dias":
    "Muy buenos días desde la cabina de mando: les saluda la comandante Jazlyn.",
  "comandante.bienvenida.saludo.cabina.tardes":
    "Muy buenas tardes desde la cabina de mando: les saluda la comandante Jazlyn.",
  "comandante.bienvenida.saludo.cabina.noches":
    "Muy buenas noches desde la cabina de mando: les saluda la comandante Jazlyn.",
  "comandante.bienvenida.saludo.chicos.dias":
    "Señoras y señores, y los más chicos de a bordo: ¡buenos días! Les habla la comandante Jazlyn.",
  "comandante.bienvenida.saludo.chicos.tardes":
    "Señoras y señores, y los más chicos de a bordo: ¡buenas tardes! Les habla la comandante Jazlyn.",
  "comandante.bienvenida.saludo.chicos.noches":
    "Señoras y señores, y los más chicos de a bordo: ¡buenas noches! Les habla la comandante Jazlyn.",
  "comandante.bienvenida.gracia.1":
    "Señores pasajeros, les habla la comandante Jazlyn, desde la oficina con la mejor vista de todo el avión.",
  "comandante.bienvenida.gracia.2":
    "Señores pasajeros, buenas: les habla la comandante Jazlyn. Ya revisamos todo, el avión está listo, y yo también.",
  "comandante.bienvenida.gracia.3":
    "Señores pasajeros, les habla la comandante Jazlyn. Tengo el trabajo más lindo del mundo, y hoy me toca llevarlos a ustedes.",
  "comandante.bienvenida.a.local":
    "Bienvenidos a bordo. Hoy damos una vuelta por los alrededores y volvemos acá mismo.",
  "comandante.bienvenida.a.pettirossi": "Bienvenidos a bordo de este vuelo a Asunción.",
  "comandante.bienvenida.a.guarani": "Bienvenidos a bordo de este vuelo a Ciudad del Este.",
  "comandante.bienvenida.a.encarnacion": "Bienvenidos a bordo de este vuelo a Encarnación.",
  "comandante.bienvenida.a.concepcion": "Bienvenidos a bordo de este vuelo a Concepción.",
  "comandante.bienvenida.a.pedro-juan":
    "Bienvenidos a bordo de este vuelo a Pedro Juan Caballero.",
  "comandante.bienvenida.a.estigarribia":
    "Bienvenidos a bordo de este vuelo a Mariscal Estigarribia.",
  "comandante.bienvenida.a.ayolas": "Bienvenidos a bordo de este vuelo a Ayolas.",
  "comandante.bienvenida.a.pilar": "Bienvenidos a bordo de este vuelo a Pilar.",
  "comandante.bienvenida.a.yvytu-rape":
    "Bienvenidos a bordo de este vuelo a Yvytu Rape, la pista de la Granja Óga.",
  "comandante.bienvenida.a.tenerife-norte": "Bienvenidos a bordo de este vuelo a Tenerife Norte.",
  "comandante.bienvenida.a.tenerife-sur": "Bienvenidos a bordo de este vuelo a Tenerife Sur.",
  "comandante.bienvenida.a.gran-canaria": "Bienvenidos a bordo de este vuelo a Gran Canaria.",
  "comandante.bienvenida.a.lanzarote": "Bienvenidos a bordo de este vuelo a Lanzarote.",
  "comandante.bienvenida.a.fuerteventura": "Bienvenidos a bordo de este vuelo a Fuerteventura.",
  "comandante.bienvenida.a.la-palma": "Bienvenidos a bordo de este vuelo a La Palma.",
  "comandante.bienvenida.a.el-hierro": "Bienvenidos a bordo de este vuelo a El Hierro.",
  "comandante.bienvenida.a.la-gomera": "Bienvenidos a bordo de este vuelo a La Gomera.",
  /*
   * Y con un detalle del sitio, **cierto y que se reconoce allí**: el río de
   * Asunción, la represa de Ayolas, los telescopios de La Palma, el silbo de
   * La Gomera. Uno solo y corto: es una bienvenida, no la llegada, que ya
   * cuenta lo suyo al aterrizar.
   */
  "comandante.bienvenida.detalle.local":
    "Bienvenidos a bordo. Hoy no vamos lejos: damos una vuelta para mirar todo desde arriba, y volvemos acá mismo.",
  "comandante.bienvenida.detalle.pettirossi":
    "Bienvenidos a bordo: hoy los llevamos a Asunción, la capital, a orillas del río Paraguay.",
  "comandante.bienvenida.detalle.guarani":
    "Bienvenidos a bordo: hoy los llevamos a Ciudad del Este, la segunda ciudad más grande del país.",
  "comandante.bienvenida.detalle.encarnacion":
    "Bienvenidos a bordo: hoy los llevamos a Encarnación, la capital de Itapúa, a orillas del Paraná.",
  "comandante.bienvenida.detalle.concepcion":
    "Bienvenidos a bordo: hoy los llevamos al norte, a Concepción, a orillas del río Paraguay.",
  "comandante.bienvenida.detalle.pedro-juan":
    "Bienvenidos a bordo: hoy los llevamos a Pedro Juan Caballero, en la frontera con Brasil.",
  "comandante.bienvenida.detalle.estigarribia":
    "Bienvenidos a bordo: hoy los llevamos a Mariscal Estigarribia, en pleno Chaco.",
  "comandante.bienvenida.detalle.ayolas":
    "Bienvenidos a bordo: hoy los llevamos a Ayolas, al lado de la represa de Yacyretá.",
  "comandante.bienvenida.detalle.pilar":
    "Bienvenidos a bordo: hoy los llevamos a Pilar, en el Ñeembucú, tierra de esteros.",
  "comandante.bienvenida.detalle.yvytu-rape":
    "Bienvenidos a bordo: hoy los llevamos a Yvytu Rape, la pista de pasto de la Granja Óga.",
  "comandante.bienvenida.detalle.tenerife-norte":
    "Bienvenidos a bordo: hoy los llevamos a Tenerife Norte, en La Laguna.",
  "comandante.bienvenida.detalle.tenerife-sur":
    "Bienvenidos a bordo: hoy los llevamos a Tenerife Sur, en la isla del Teide.",
  "comandante.bienvenida.detalle.gran-canaria":
    "Bienvenidos a bordo: hoy los llevamos a Gran Canaria, una isla casi redonda, con su cumbre en el medio.",
  "comandante.bienvenida.detalle.lanzarote":
    "Bienvenidos a bordo: hoy los llevamos a Lanzarote, la isla de los volcanes.",
  "comandante.bienvenida.detalle.fuerteventura":
    "Bienvenidos a bordo: hoy los llevamos a Fuerteventura, la isla más cerca de África.",
  "comandante.bienvenida.detalle.la-palma":
    "Bienvenidos a bordo: hoy los llevamos a La Palma, la isla de los telescopios.",
  "comandante.bienvenida.detalle.el-hierro":
    "Bienvenidos a bordo: hoy los llevamos a El Hierro, la isla que queda más al oeste de España.",
  "comandante.bienvenida.detalle.la-gomera":
    "Bienvenidos a bordo: hoy los llevamos a La Gomera, la isla donde se habla silbando.",
  "comandante.bienvenida.cierre.disfruten": "Relájense, pónganse cómodos y disfruten del vuelo.",
  "comandante.bienvenida.cierre.gracias":
    "Gracias por volar con nosotros, y que tengan un lindo viaje.",
  "comandante.bienvenida.cierre.acomodense": "Acomódense tranquilos, que en un ratito salimos.",

  /*
   * ── **Y lo que cuenta en un crucero largo** ─────────────────────────────
   *
   * El punto del vuelo con el último parte de allá, un saludo a los chicos y
   * chicas o a quien vuela por primera vez —sin nombres: a quien le toque—,
   * y una curiosidad verdadera. Poco y a su momento, según lo que dure el
   * tramo. Ver `audio/momentos-de-crucero.ts`.
   */
  "comandante.mitad.camino":
    "Señores pasajeros, les habla otra vez la comandante: ya vamos por la mitad del camino.",
  "comandante.mitad.viaje":
    "Señores pasajeros, les habla la comandante, para contarles cómo vamos: ya pasamos la mitad del viaje.",
  "comandante.mitad.parte": "Les paso el último parte del tiempo en destino.",
  "comandante.chicos.primeraVez":
    "Señores pasajeros, les habla la comandante. Un saludo especial para quien hoy vuela por primera vez: eso que se siente en la panza cuando el avión sube o baja es normal, y a todos nos pasó la primera vez.",
  "comandante.chicos.tripulacion":
    "Señores pasajeros, les habla la comandante. Un saludo grande a los chicos que viajan hoy: desde ahora son parte de la tripulación, y les toca vigilar el cielo por la ventanilla.",
  "comandante.chicos.aterrizar":
    "Señores pasajeros, les habla la comandante. Un saludo a los más chiquitos y a quien sube a un avión por primera vez: bienvenidos al cielo. Cuando bajemos, miren por la ventanilla cómo todo se va haciendo grande otra vez.",
  "comandante.curiosidad.alas":
    "Señores pasajeros, algo para los que van en la ventanilla: si miran el ala, la van a ver doblada un poquito hacia arriba. Es el aire que nos sostiene, empujándola. Está hecha para eso, así que tranquilos.",
  "comandante.curiosidad.rayas":
    "Señores pasajeros, un dato curioso de la comandante: las rayas blancas que dejan algunos aviones en el cielo son nubes. El vapor de agua que sale de los motores se congela con el frío, y queda dibujado ahí arriba.",
  "comandante.curiosidad.ventanilla":
    "Señores pasajeros, un secreto de las ventanillas: muchas tienen un agujerito chiquito abajo. No es una falla: así el vidrio de afuera hace toda la fuerza, y el de adentro no se empaña.",
  "comandante.curiosidad.ingles":
    "Señores pasajeros, un dato curioso de la comandante: el inglés es el idioma de la aviación. Un piloto de cualquier país puede hablar en inglés con la torre de cualquier aeropuerto internacional, y se entienden.",
  "comandante.curiosidad.llave":
    "Señores pasajeros, un secreto de la cabina: los aviones no tienen llave para arrancar, como los autos. Se arrancan con botones, siguiendo una lista, paso por paso.",
  "comandante.curiosidad.viento":
    "Señores pasajeros, ¿sabían que los aviones despegan y aterrizan de cara al viento? Con el viento de frente, el avión tiene que correr menos para que el aire lo levante, y le alcanza con menos pista.",

  /*
   * ── **Lo que se ve por la ventanilla** ──────────────────────────────────
   *
   * Lo que hace una comandante en un vuelo largo: señalar lo que se pasa por
   * debajo. Responde a una pega concreta —«durante los vuelos largos pueden
   * pasar cosas, entretener a la niña que vuela mucho rato»— y de paso enseña
   * geografía sin proponérselo, que es como se aprende.
   *
   * **Estas plantillas ya no se dicen**: eran para los nombres que traía
   * OpenStreetMap de cada escenario, y se quitaron con ellos. Lo que se dice
   * ahora está más abajo, en `ventanilla.*`, escrito a mano. `hito.unBarco` y
   * `hito.otroAvion` sí siguen: son el rótulo de la tarjeta de lo que se
   * mueve.
   *
   * Y el lado va en palabra y en flecha. La flecha es la que entiende quien
   * todavía no lee, y es la que va primero. Ver `hito()` en `ui/senal.ts`.
   */
  "hito.izquierda": "izquierda",
  "hito.derecha": "derecha",
  "hito.montana": "Miren por la ventanilla, a la {lado}: {nombre}, {altura} metros.",
  "hito.isla": "A la {lado} vamos dejando {nombre}.",
  "hito.ciudad": "Ahí abajo, a la {lado}, {nombre}.",

  /*
   * ── **Y lo mismo, pero dicho por la instructora** ───────────────────────
   *
   * Porque no todos los aviones llevan megafonía, y un Pykasu no tiene a
   * quién hablarle por un altavoz: la comandante solo existe donde hay pasaje
   * —ver `conPasaje`—. En una avioneta quien señala el paisaje es la
   * instructora, que está sentada al lado, y entonces no habla de usted a
   * cien personas: te habla **a vos**.
   *
   * Es la misma información y otro registro, y mezclarlos se nota: una
   * comandante que tutea suena a monitora y una monitora que dice «señores
   * pasajeros» suena a broma.
   */
  "hito.montana.vos": "Mirá por la ventanilla, a la {lado}: {nombre}, {altura} metros.",
  "hito.isla.vos": "A la {lado} vamos dejando {nombre}.",
  "hito.ciudad.vos": "Ahí abajo, a la {lado}, {nombre}.",
  /*
   * **Y lo que se mueve: un barco entre islas u otro avión**, solo en
   * Canarias. El barco no necesita frase propia: «Ahí abajo, a la derecha, un
   * barco» es la de los pueblos con otra cosa en el hueco, y así se dice con
   * lo que ya hay.
   *
   * El avión sí, y **solo la dice la instructora**. Señalar un avión que
   * cruza es lo que hace cualquier instructor al lado —mirar afuera es la
   * primera regla para no chocar con nadie—; una comandante no se lo anuncia
   * al pasaje, que solo sirve para asustar a quien va sentado atrás.
   */
  "hito.unBarco": "un barco",
  "hito.otroAvion": "otro avión",
  "hito.avion.vos": "Mirá, a la {lado}: otro avión.",
  /*
   * Y lo que se señala del cielo de noche, que se escribe en la tarjeta
   * desde el segundo peldaño. Lo que se dice va con las demás de la
   * ventanilla: `ventanilla.cruz-del-sur` y `ventanilla.polar`.
   */
  "hito.cruzDelSur": "Cruz del Sur",
  "hito.polar": "Estrella Polar",
  /*
   * **Lo que se ve de otro avión de noche**, escrito en su tarjeta desde el
   * tercer peldaño; en el segundo, «¡Mirá!». Es la regla de las luces de
   * navegación dicha desde el lado de quien las mira. Ver `queLucesSeLeVen`.
   */
  "luces.deFrente": "Verde a tu izquierda y roja a tu derecha: viene hacia vos",
  "luces.seAleja": "Solo la luz blanca: se está yendo",
  "luces.cruzaIzquierda": "Ves su luz roja: va hacia tu izquierda",
  "luces.cruzaDerecha": "Ves su luz verde: va hacia tu derecha",
  /*
   * ── **Lo que se ve por la ventanilla, contado a mano** ──────────────────
   *
   * Las plantillas de arriba —«Ahí abajo, a la {lado}, {nombre}»— ya no se
   * dicen: se oyeron como lo que eran, «muy robótica, sin emoción», y con
   * pueblos que ni se veían. Se quedan en el diccionario porque `gug.ts` las
   * tiene traducidas, y ese diccionario no se toca desde aquí.
   *
   * Lo que se dice ahora es esto: **una frase por sitio, escrita a mano**,
   * con algo que contar que se pueda recordar a los cuatro años, y grabada
   * entera con la voz de Jazlyn y con chispa. Delante va el lado, en frase
   * aparte y con dos formas, y la primera vez del vuelo, el saludo. Ver
   * `audio/ventanilla.ts` y `data/hitos/destacados.json`.
   *
   * **Todo lo que se cuenta es verdad**, y está comprobado: la cota del Teide,
   * los seis años de Timanfaya, el meridiano de El Hierro, la guerra que
   * terminó en Cerro Corá. Nada de «dicen que». Y cada una en su registro:
   * las de Canarias sin voseo ni paraguayismos, que la comandante habla allí
   * como se habla allí; las de Paraguay, en paraguayo. La comandante le habla
   * al pasaje de usted, así que en las suyas no hay voseo en ningún sitio.
   */
  "ventanilla.saludo": "Hola de nuevo, les habla la comandante.",
  "ventanilla.lado.izquierda": "Los que van del lado izquierdo, miren por la ventanilla.",
  "ventanilla.lado.derecha": "Los que van del lado derecho, miren por la ventanilla.",
  // Canarias.
  "ventanilla.teide":
    "Ese gigante es el Teide: tres mil setecientos quince metros, la montaña más alta de España. Y es un volcán: en invierno, hasta se pone un gorro de nieve.",
  "ventanilla.canadas":
    "A los pies del Teide está Las Cañadas: un cráter gigante, de más de diez kilómetros. Y esas rocas con formas raras son los Roques de García, talladas por el viento, la lluvia y el hielo.",
  "ventanilla.anaga":
    "Aquellas montañas verdes y arrugadas son Anaga, de lo más antiguo de Tenerife. Ahí se guarda la laurisilva, un bosque que hace millones de años cubría el sur de Europa.",
  "ventanilla.orotava":
    "Ese valle tan ancho que baja hasta el mar es el Valle de La Orotava. Se formó cuando un pedazo enorme de la isla se deslizó al océano, hace cientos de miles de años.",
  "ventanilla.gigantes":
    "Esa pared de roca que cae al mar son los Acantilados de Los Gigantes: cientos de metros cortados a pico sobre el agua. Por algo les pusieron ese nombre.",
  "ventanilla.garajonay":
    "Esa isla redondita es La Gomera, y lo verde de arriba es el Garajonay: un bosque tan húmedo que bebe agua de las nubes. Es Patrimonio de la Humanidad.",
  "ventanilla.taburiente":
    "Aquella es La Palma, la isla bonita. Arriba, en el borde de la Caldera de Taburiente, está el Roque de los Muchachos, lleno de telescopios para mirar las estrellas.",
  "ventanilla.tajogaite":
    "Esa montaña oscura es el Tajogaite, el volcán más joven de Canarias: nació en dos mil veintiuno y estuvo casi tres meses echando lava.",
  "ventanilla.hierro":
    "Aquella es El Hierro, la más pequeña de las siete islas grandes. Durante siglos, por ahí pasaba el meridiano cero: desde ahí se medía el mundo.",
  "ventanilla.nieves":
    "En lo alto de Gran Canaria está el Pico de las Nieves, casi dos mil metros. Hace siglos guardaban ahí la nieve del invierno en pozos, para tener hielo en verano.",
  "ventanilla.las-palmas":
    "Esa ciudad junto al mar es Las Palmas de Gran Canaria, la más grande de Canarias. Tiene una playa en plena ciudad, Las Canteras, con una barrera de roca que la protege de las olas.",
  "ventanilla.maspalomas":
    "Eso dorado junto al mar son las Dunas de Maspalomas: un pequeño desierto de arena que el viento va moviendo, poco a poco.",
  "ventanilla.fuerteventura":
    "Esa isla tan larga es Fuerteventura, la más antigua de Canarias: unos veinte millones de años. Tanto tiempo de viento y lluvia la dejaron así de llana, con playas enormes.",
  "ventanilla.lobos":
    "Ese islote es Lobos: se llama así por los lobos marinos, unas focas que vivían ahí. Y enfrente, las dunas blancas de Corralejo, en Fuerteventura.",
  "ventanilla.timanfaya":
    "Esas montañas rojas y negras son Timanfaya, en Lanzarote. Hace unos trescientos años, sus volcanes estuvieron seis años seguidos echando fuego, y el suelo todavía está calentito.",
  "ventanilla.barco":
    "Allá abajo va un barco, de una isla a otra: fíjense en la estela blanca que deja en el mar.",
  // Paraguay.
  "ventanilla.rio-paraguay":
    "Ese río ancho que brilla allá abajo es el río Paraguay, el que le da nombre al país. Lo parte en dos: de un lado la Región Oriental, y del otro, el Chaco.",
  "ventanilla.asuncion":
    "Esa ciudad grande a la orilla del río es Asunción, nuestra capital. La fundaron en mil quinientos treinta y siete, y le dicen Madre de Ciudades, porque de ahí salieron los que fundaron muchas otras.",
  "ventanilla.ypacarai":
    "Ese lago es el Ypacaraí, el de la canción Recuerdos de Ypacaraí, que se canta en muchísimos países del mundo.",
  "ventanilla.ypoa":
    "Aquella agua grande es el lago Ypoá, el más grande del Paraguay, rodeado de esteros llenos de aves.",
  "ventanilla.rio-parana":
    "Ese río enorme es el Paraná, el segundo más largo de Sudamérica: solamente el Amazonas le gana.",
  "ventanilla.yacyreta":
    "Aquella raya larga sobre el Paraná es la represa de Yacyretá, que compartimos con Argentina: con la fuerza del río hace luz para millones de casas.",
  "ventanilla.itaipu":
    "Allá está Itaipú, la represa que compartimos con Brasil: una de las que más energía producen en el mundo entero.",
  "ventanilla.iguazu":
    "Allá, entre Argentina y Brasil, están las Cataratas del Iguazú: casi trescientos saltos de agua. Con suerte se ve la nube de agua que levantan.",
  "ventanilla.triple-frontera":
    "Ahí, donde el Iguazú se junta con el Paraná, se tocan tres países: Paraguay, Argentina y Brasil. Le dicen la Triple Frontera.",
  "ventanilla.cerro-cora":
    "Esos cerros son Cerro Corá, un parque nacional. Ahí terminó, en mil ochocientos setenta, la guerra más grande de nuestra historia.",
  "ventanilla.chaco":
    "Eso de abajo es el Chaco: más de la mitad del país, pero con muy poca gente. Un monte inmenso donde viven yaguaretés, tatús y osos hormigueros.",
  "ventanilla.encarnacion":
    "Esa es Encarnación, la Perla del Sur, a orillas del Paraná. En verano tiene playas de río y el carnaval más famoso del país.",
  "ventanilla.trinidad":
    "Ahí están las ruinas de Trinidad, una misión jesuítica del siglo dieciocho. Es Patrimonio de la Humanidad, junto con la de Jesús, que está cerquita.",
  /*
   * El Ybytyruzú, que es lo único que se ve en una hora de Asunción a Ciudad
   * del Este o de Encarnación a Asunción: lo demás queda en la cabina estéril
   * de los dos campos. La cota, la de su cumbre.
   */
  "ventanilla.tres-kandu":
    "Esos cerros son el Ybytyruzú, y el más alto es el Tres Kandú: ochocientos cuarenta y dos metros, el punto más alto del Paraguay.",
  /*
   * **Y las dos estrellas que se enseñan de noche.** La Cruz solo se señala en
   * Paraguay y la Polar solo en Canarias —desde Paraguay está bajo el
   * horizonte toda la noche—, así que cada una va en el registro de su sitio:
   * la Cruz en paraguayo y la Polar sin voseo ni paraguayismos, como las de
   * Canarias. Las cuentas están comprobadas contra PyEphem: el palo de Gácrux
   * a Ácrux prolongado cuatro veces y media cae a menos de tres grados del
   * polo sur del cielo, y la Polar está a la altura de la latitud con menos de
   * un grado de diferencia. Ver `world/cielo-de-noche.test.ts`.
   */
  "ventanilla.cruz-del-sur":
    "Y ahora, miren el cielo: esas cuatro estrellas en cruz son la Cruz del Sur. Si alargan el palo largo unas cuatro veces y media, llegan justo al sur. ¡Así se orientaban los navegantes, mucho antes del GPS!",
  "ventanilla.polar":
    "Miren hacia el norte: esa estrella sola, ni muy alta ni muy baja, es la Estrella Polar. No es la más brillante, pero es la más útil: casi no se mueve en toda la noche y marca el norte. Y está tan alta como lejos estamos del ecuador: aquí, unos veintiocho grados.",
  /*
   * ── **Y detrás, su historia** ───────────────────────────────────────────
   *
   * Lo que se ve dice qué es; esto cuenta algo de ello que no se ve desde
   * arriba: quién vivía allí, qué pasó, por qué se llama así. Va justo
   * detrás de la frase del sitio, en su propia frase y con la misma voz —ver
   * `laHistoria` en `audio/ventanilla.ts`—, y solo para lo que se acaba de
   * señalar, que es lo que se tiene delante de los ojos.
   *
   * **Cada hecho tiene su fuente**, apuntada en `docs/historias/fuentes.md`:
   * la página de la UNESCO, del IAC o del MITECO, la Wikipedia con lo que
   * cita, o los libros —los Comentarios de Cabeza de Vaca, el viaje de
   * Schmidl, Pigafetta, Acosta—. Contado con nuestras palabras: ninguna frase
   * copiada. Y contado para quien tiene cuatro años y para quien tiene
   * catorce: sin la violencia de la conquista, sin accidentes y sin
   * estereotipos de los guaraníes ni de los antiguos canarios, que salen como
   * lo que eran: los que sembraban, los que sacaban agua de la niebla.
   *
   * Las de Canarias sin voseo ni paraguayismos, y las de Paraguay en
   * paraguayo; todas de usted, como lo demás de la comandante.
   */
  // Canarias.
  "ventanilla.historia.teide":
    "Y algo que no se ve: medido desde el fondo del mar, el Teide tiene unos siete mil quinientos metros. Es el tercer volcán más alto del mundo, después de dos de Hawái.",
  "ventanilla.historia.canadas":
    "En primavera, Las Cañadas se llenan de tajinastes rojos: torres de flores que pueden ser más altas que una persona, y que solo crecen en Canarias. Y entre las piedras, más arriba, vive la violeta del Teide.",
  "ventanilla.historia.anaga":
    "Anaga es Reserva de la Biosfera desde dos mil quince: es uno de los lugares de Europa con más plantas y animales que no viven en ninguna otra parte del mundo.",
  "ventanilla.historia.orotava":
    "En mil setecientos noventa y nueve pasó por este valle el sabio Alexander von Humboldt. Subió al Teide y se fijó en que las plantas cambian con la altura, como si la montaña tuviera pisos.",
  "ventanilla.historia.gigantes":
    "En el mar de enfrente viven todo el año los calderones, unos parientes grandes y oscuros de los delfines. Hay muy pocos sitios en el mundo donde se queden a vivir así.",
  "ventanilla.historia.garajonay":
    "Y en La Gomera se puede hablar silbando: es el silbo gomero, que cruza los barrancos de un lado a otro y se oye a kilómetros. Los niños de la isla lo aprenden en la escuela.",
  "ventanilla.historia.taburiente":
    "Para que esos telescopios vean bien, La Palma tiene una ley que cuida el cielo: las farolas alumbran hacia el suelo y no hacia arriba. Por eso allí, de noche, se ven tantísimas estrellas.",
  "ventanilla.historia.tajogaite":
    "Cuando la lava llegó al mar, la isla creció: nacieron dos trozos de tierra nueva junto a la costa, las fajanas del Tajogaite. Son más jóvenes que muchos de los niños que van a bordo.",
  "ventanilla.historia.hierro":
    "Los antiguos herreños, los bimbaches, bebían el agua de un árbol, el Garoé: sus hojas atrapaban la niebla y el agua caía gota a gota. Hasta los marineros de Magallanes oyeron hablar de él, en mil quinientos diecinueve.",
  "ventanilla.historia.nieves":
    "El centro de la isla es Patrimonio de la Humanidad. Allí, en Risco Caído, los antiguos canarios tallaron una cueva en la que el sol entra por un agujero, y su luz va cambiando de sitio en la pared con las estaciones.",
  "ventanilla.historia.las-palmas":
    "En mil cuatrocientos noventa y dos, camino de América, Cristóbal Colón paró en Gran Canaria para ponerle un timón nuevo a la Pinta, uno de sus tres barcos.",
  "ventanilla.historia.timanfaya":
    "Allí el suelo sigue tan caliente que, si echan agua en un agujero, sale disparada hacia arriba como un géiser. Y en el restaurante de la montaña asan la comida con el calor del volcán.",
  // Paraguay.
  "ventanilla.historia.rio-paraguay":
    "Fíjense en las curvas del río y en las lagunas con forma de herradura que tiene al lado: son curvas viejas. El agua se come la orilla de afuera de cada curva, hasta que un día el río corta camino y la curva se queda sola.",
  "ventanilla.historia.asuncion":
    "Cuando llegaron los primeros barcos europeos, hace casi quinientos años, los guaraníes de esta zona ya sembraban maíz, mandioca, batata y maní. Uno de aquellos viajeros escribió que en cuatro años no había comido un pan tan bueno.",
  "ventanilla.historia.ypacarai":
    "La música de esa canción la compuso un paraguayo, Demetrio Ortiz. Y la letra la escribió una poeta argentina, Zulema de Mirkin, sin haber visto nunca el lago: se inspiró en la guitarra de él.",
  "ventanilla.historia.ypoa":
    "En el Ypoá hay islas que flotan: colchones de plantas tan gruesos que hasta crecen arbolitos encima. Con los años, algunas se van pegando a la tierra firme.",
  "ventanilla.historia.yacyreta":
    "Yacyretá, en guaraní, quiere decir tierra de la luna: yasy es la luna. Así se llamaba una isla del río, y de ella tomó el nombre la represa.",
  "ventanilla.historia.itaipu":
    "Itaipú, en guaraní, quiere decir piedra que suena: así se llamaba una isla del río, cerca de donde se levantó la represa. Su primera turbina empezó a girar en mil novecientos ochenta y cuatro.",
  "ventanilla.historia.iguazu":
    "Iguazú, en guaraní, quiere decir agua grande. En mil quinientos cuarenta y dos llegó hasta ahí Álvar Núñez Cabeza de Vaca, camino de Asunción, y tuvo que cargar sus canoas a pie para rodear las cataratas.",
  "ventanilla.historia.triple-frontera":
    "En cada orilla hay un hito pintado con los colores de su bandera: celeste y blanco en Argentina, verde y amarillo en Brasil, y rojo, blanco y azul en Paraguay.",
  "ventanilla.historia.cerro-cora":
    "En los montes de Cerro Corá todavía vive el mboreví, el tapir: el animal de tierra más grande de Sudamérica, con una trompita en la nariz.",
  "ventanilla.historia.chaco":
    "En el Chaco crece el samuhú, el palo borracho: un árbol de tronco gordo como una botella, que guarda agua para los meses secos.",
  "ventanilla.historia.encarnacion":
    "Encarnación nació en mil seiscientos quince como un pueblo de las misiones, fundado por Roque González de Santa Cruz, un sacerdote nacido en Asunción. Hoy lleva su nombre el puente que la une con Posadas, en Argentina.",
  "ventanilla.historia.trinidad":
    "Dentro de su iglesia hay ángeles tallados en piedra que tocan música: arpa, órgano, trompetas y flauta. Llevan ahí más de doscientos cincuenta años.",
  "ventanilla.historia.cruz-del-sur":
    "Hace más de cuatrocientos años, el padre José de Acosta escribió que a estas cuatro estrellas las llamaban el Crucero, y que los marineros, con la del pie de la cruz, medían qué tan al sur estaban.",
  /*
   * **Y la ilustración que sale mientras se cuenta**, su texto alternativo:
   * corto y diciendo lo que se ve en el dibujo. El dibujo se entiende sin él;
   * es para quien no lo ve. La clave dice «foto» porque las primeras lo eran.
   * Ver `ui/ilustraciones-de-las-historias.ts`.
   */
  "historia.foto.teide": "El Teide en corte, con la parte que queda debajo del mar",
  "historia.foto.canadas": "Tajinastes rojos más altos que una persona, delante del Teide",
  "historia.foto.anaga": "La laurisilva de Anaga con una paloma, un mosquitero y un caracol",
  "historia.foto.orotava": "Humboldt dibujando los pisos de plantas del Teide",
  "historia.foto.gigantes": "Una familia de calderones nadando frente a los acantilados",
  "historia.foto.garajonay": "Un hombre silba en el barranco y un niño lo escucha del otro lado",
  "historia.foto.taburiente": "Telescopios bajo las estrellas y faroles que alumbran solo el suelo",
  "historia.foto.tajogaite": "La tierra nueva de lava negra del Tajogaite, entrando en el mar",
  "historia.foto.hierro": "El Garoé atrapa la niebla y su agua cae gota a gota en las pozas",
  "historia.foto.nieves": "Un rayo de sol entra por el techo de la cueva de Risco Caído",
  "historia.foto.las-palmas": "Carpinteros poniéndole un timón nuevo a la Pinta",
  "historia.foto.timanfaya": "Un chorro de vapor sale del suelo y la comida se asa con el volcán",
  "historia.foto.rio-paraguay": "El río Paraguay con sus curvas y sus lagunas en forma de herradura",
  "historia.foto.asuncion": "Un pueblo guaraní cosechando maíz, mandioca, batata y maní",
  "historia.foto.ypacarai": "Un guitarrista toca y una poeta se imagina el lago Ypacaraí",
  "historia.foto.ypoa": "Una isla flotante del Ypoá, con sus raíces colgando bajo el agua",
  "historia.foto.yacyreta": "La luna llena sobre una isla del río Paraná, de noche",
  "historia.foto.itaipu": "El agua golpeando las piedras del río, con la represa de Itaipú detrás",
  "historia.foto.iguazu": "Gente cargando canoas a pie para rodear las cataratas del Iguazú",
  "historia.foto.triple-frontera": "Los tres hitos de la Triple Frontera, con los colores de cada país",
  "historia.foto.cerro-cora": "Un mboreví, el tapir, con su cría junto a un arroyo",
  "historia.foto.chaco": "Un samuhú con su tronco de botella, un ñandú y un tatú",
  "historia.foto.encarnacion": "La orilla de Encarnación en 1615 y hoy, con el puente a Posadas",
  "historia.foto.trinidad": "Ángeles músicos tallados en la piedra roja de Trinidad",
  "historia.foto.cruz-del-sur": "Un marinero mide la Cruz del Sur con su ballestilla",
  /*
   * **Las ilustraciones**, su texto alternativo: lo que se ve, corto, para
   * quien no lo ve. Y de Ara, nada que diga si es niño o niña. Ver
   * `ui/ilustraciones.ts`.
   */
  "ilustracion.pasaje-embarque": "La cabina todavía vacía: las familias con criaturas suben primero",
  "ilustracion.pasaje-lleno": "La cabina llena, cada quien en su asiento, y Ara en la ventanilla",
  "ilustracion.pasaje-tripulante": "La tripulante le habla a Ara al lado de su asiento",
  "ilustracion.pasaje-ara-ventanilla": "Ara, con la cara contra el cristal, mirando el ala y el motor",
  "ilustracion.pasaje-comandante": "La comandante Jazlyn en su cabina, por encima de las nubes",
  "ilustracion.ara-durmiendo": "Ara duerme en la ventanilla, con la manta y el cinturón por encima",
  "ilustracion.ara-sonando": "Ara sueña, sonriendo, con un avión que vuela sobre las islas",
  "ilustracion.fuera-jaz-20": "El JAZ 20 volando sobre el río y el monte",
  "ilustracion.fuera-jaz-25": "El JAZ 25 pasando bajito sobre un cultivo",
  "ilustracion.fuera-jaz-40": "El JAZ 40 volando sobre un lago entre cerros",
  "ilustracion.fuera-jaz-60": "El JAZ 60 volando sobre los esteros",
  "ilustracion.fuera-jaz-90": "El JAZ 90 volando por encima de las nubes",
  "ilustracion.fuera-jaz-120": "El JAZ 120, con sus cuatro motores, por encima de las nubes",
  "ilustracion.cabina-jaz-20": "Jazlyn a los mandos del JAZ 20, en el asiento de la izquierda",
  "ilustracion.cabina-jaz-25": "Jazlyn a los mandos del JAZ 25, el biplano de una plaza",
  "ilustracion.cabina-jaz-40": "Jazlyn a los mandos del JAZ 40, con un motor en cada ala",
  "ilustracion.cabina-jaz-60": "Jazlyn a los mandos del JAZ 60, con sus pantallas",
  "ilustracion.cabina-jaz-90": "Jazlyn a los mandos del JAZ 90, con el Teide delante",
  "ilustracion.cabina-jaz-120": "Jazlyn a los mandos del JAZ 120, de noche y con la Cruz del Sur",
  "ilustracion.retrato-jazlyn": "Jazlyn, con su gorra de comandante y sus gafas de sol",
  // Los esquemas de lo que se explica en el vuelo de pasaje, y la torre de «Luz verde» (punto 311).
  "ilustracion.mascara": "El papá se pone su máscara primero y después ayuda a la criatura",
  "ilustracion.nube": "Una nube con lupa: gotitas de agua abajo y cristalitos de hielo arriba",
  "ilustracion.ala": "El ala de costado: el aire la rodea y sale empujado hacia abajo",
  "ilustracion.motor": "El motor por adentro: el aire entra por adelante, se calienta y sale por atrás",
  "ilustracion.frio": "Escarcha en el cristal de afuera; adentro, aire calentito y una taza humeante",
  "ilustracion.oido": "Ara bosteza, y el aire sube por dentro hasta el oído y lo destapa",
  "ilustracion.alto": "El avión, más alto que el Teide, vuela por encima del mar de nubes",
  "ilustracion.meneo": "El avión dentro de la nube, con el aire que sube y baja a su alrededor",
  "ilustracion.chaleco": "El chaleco se pone en el asiento y se infla afuera, ya en el agua",
  "ilustracion.maletero": "Un señor sube su maleta al compartimento de arriba",
  "ilustracion.torre-radio": "En la torre, el controlador habla por radio con el avión que llega",
  "ilustracion.mazo": "La ladera de Mazo por la ventanilla: bancales, casitas y caminos que suben",

  /*
   * **Y lo mismo, dicho por la instructora en la avioneta**: de vos, más
   * corto y a quien tiene al lado. Es la misma información en otro registro,
   * como las plantillas de arriba, y con su propia grabación en su voz.
   */
  "ventanilla.vos.lado.izquierda": "Mirá por la ventanilla, a tu izquierda.",
  "ventanilla.vos.lado.derecha": "Mirá por la ventanilla, a tu derecha.",
  "ventanilla.vos.teide":
    "¿Ves esa montaña enorme? Es el Teide, la más alta de toda España. ¡Y es un volcán!",
  "ventanilla.vos.canadas":
    "Mirá abajo, al pie del Teide: eso es Las Cañadas, un cráter gigante. Y esas rocas raras son los Roques de García.",
  "ventanilla.vos.anaga":
    "Esas montañas verdes y arrugadas son Anaga. Ahí crece la laurisilva, un bosque que ya existía hace millones de años.",
  "ventanilla.vos.orotava":
    "Ese valle que baja al mar es La Orotava. Se formó cuando un pedazo gigante de la isla se fue al mar.",
  "ventanilla.vos.gigantes":
    "Mirá esos acantilados: son Los Gigantes. Paredes de roca que caen derechito al mar.",
  "ventanilla.vos.garajonay":
    "Esa isla es La Gomera. Lo verde de arriba es el Garajonay, un bosque que toma agua de las nubes.",
  "ventanilla.vos.taburiente":
    "Esa es La Palma. Arriba de todo, en el Roque de los Muchachos, hay telescopios gigantes para mirar las estrellas.",
  "ventanilla.vos.tajogaite":
    "¿Ves esa montaña negra? Es el Tajogaite, un volcán que nació en dos mil veintiuno. ¡Estuvo casi tres meses echando lava!",
  "ventanilla.vos.hierro":
    "Esa es El Hierro, la más chiquita de las siete islas grandes. Hace mucho, el mundo se medía desde ahí.",
  "ventanilla.vos.nieves":
    "Arriba de Gran Canaria está el Pico de las Nieves. Antes guardaban nieve ahí, en pozos, para tener hielo en verano.",
  "ventanilla.vos.las-palmas":
    "Esa es Las Palmas de Gran Canaria, la ciudad más grande de las islas. ¡Tiene la playa en medio de la ciudad!",
  "ventanilla.vos.maspalomas":
    "¿Ves eso dorado? Son las dunas de Maspalomas: un desierto chiquito al lado del mar.",
  "ventanilla.vos.fuerteventura":
    "Esa isla larga es Fuerteventura, la más viejita de todas las Canarias. ¡Tiene unos veinte millones de años!",
  "ventanilla.vos.lobos":
    "Ese islote es Lobos. Se llama así por las focas que vivían ahí: los lobos marinos.",
  "ventanilla.vos.timanfaya":
    "Esas montañas rojas y negras son Timanfaya: volcanes que estuvieron seis años echando fuego. ¡El suelo todavía está caliente!",
  "ventanilla.vos.barco":
    "Mirá allá abajo: un barco, con la raya blanca que va dejando en el agua.",
  /*
   * Y otro avión, que solo lo señala la instructora: mirar afuera es la
   * primera regla para no chocar con nadie. Ver `hito.avion.vos`, arriba.
   */
  "ventanilla.vos.avion":
    "Mirá: otro avión. Mirar afuera es lo primero que hace un piloto, para ver a los demás.",
  "ventanilla.vos.rio-paraguay":
    "Ese río es el Paraguay, el que le da el nombre a nuestro país. Del otro lado empieza el Chaco.",
  "ventanilla.vos.asuncion":
    "Esa es Asunción, la capital. Es una de las ciudades más antiguas de Sudamérica.",
  "ventanilla.vos.ypacarai":
    "Ese lago es el Ypacaraí, el de la canción. ¿La conocés?",
  "ventanilla.vos.ypoa":
    "Ese es el lago Ypoá, el más grande del Paraguay. Ahí viven un montón de pájaros.",
  "ventanilla.vos.rio-parana":
    "Ese río enorme es el Paraná. En toda Sudamérica, solo el Amazonas es más largo.",
  "ventanilla.vos.yacyreta":
    "Esa raya larga en el río es la represa de Yacyretá. Con la fuerza del agua hace luz para las casas.",
  "ventanilla.vos.itaipu":
    "Allá está Itaipú, una represa gigante. Hace luz para Paraguay y para Brasil.",
  "ventanilla.vos.iguazu":
    "Por allá están las Cataratas del Iguazú. ¡Son casi trescientos saltos de agua!",
  "ventanilla.vos.triple-frontera":
    "Ahí se juntan dos ríos y tres países: Paraguay, Argentina y Brasil.",
  "ventanilla.vos.cerro-cora":
    "Esos cerros son Cerro Corá. Ahí terminó una guerra muy grande, hace mucho, en mil ochocientos setenta.",
  "ventanilla.vos.chaco":
    "Abajo está el Chaco: un monte enorme donde viven yaguaretés, tatús y osos hormigueros.",
  "ventanilla.vos.encarnacion":
    "Esa es Encarnación. En verano tiene playas en el río y un carnaval muy famoso.",
  "ventanilla.vos.trinidad":
    "Ahí están las ruinas de Trinidad: una misión jesuítica viejísima, Patrimonio de la Humanidad.",
  "ventanilla.vos.tres-kandu":
    "Esos cerros son el Ybytyruzú. Ahí está el Tres Kandú, ¡el punto más alto de todo el Paraguay!",
  // Y las dos estrellas, de vos en los dos sitios: la instructora vosea siempre.
  "ventanilla.vos.cruz-del-sur":
    "Mirá esas cuatro estrellas en cruz: es la Cruz del Sur. Si alargás el palo largo cuatro veces y media, apuntás al sur.",
  "ventanilla.vos.polar":
    "¿Ves esa estrella sola, hacia el norte? Es la Polar. Casi no se mueve: toda la noche marca el norte.",
  /*
   * **Y detrás, su historia, de vos**: la misma que cuenta la comandante,
   * más corta y a quien va al lado. Las fuentes, en `docs/historias/fuentes.md`.
   */
  "ventanilla.vos.historia.teide":
    "¿Sabías que, medido desde el fondo del mar, el Teide tiene siete mil quinientos metros? ¡Es de los volcanes más altos del mundo!",
  "ventanilla.vos.historia.canadas":
    "En primavera, ahí salen los tajinastes rojos: torres de flores que pueden ser más altas que vos. ¡Solo crecen en Canarias!",
  "ventanilla.vos.historia.anaga":
    "En Anaga viven plantas y animalitos que no existen en ningún otro lugar del mundo. ¡Solamente ahí!",
  "ventanilla.vos.historia.orotava":
    "Por este valle pasó hace mucho un sabio, Humboldt. Subió al Teide y se dio cuenta de que las plantas cambian con la altura, como los pisos de una casa.",
  "ventanilla.vos.historia.gigantes":
    "En ese mar viven todo el año los calderones: unos primos grandotes y oscuros de los delfines.",
  "ventanilla.vos.historia.garajonay":
    "En La Gomera la gente habla silbando, de un barranco a otro: el silbo gomero. ¡Los chicos lo aprenden en la escuela!",
  "ventanilla.vos.historia.taburiente":
    "Para que los telescopios vean bien, en La Palma las farolas alumbran para abajo, no para el cielo. ¡Hay una ley para cuidar las estrellas!",
  "ventanilla.vos.historia.tajogaite":
    "Cuando la lava llegó al mar, la isla creció: ¡nacieron dos pedazos de tierra nueva junto a la costa!",
  "ventanilla.vos.historia.hierro":
    "En El Hierro había un árbol que daba agua: el Garoé. Sus hojas atrapaban la niebla, y el agua caía gota a gota.",
  "ventanilla.vos.historia.nieves":
    "Los antiguos canarios hicieron una cueva donde el sol entra por un agujero. ¡Según la época del año, la luz cae en otro lugar de la pared!",
  "ventanilla.vos.historia.las-palmas":
    "Cristóbal Colón paró en esta isla antes de cruzar a América, para arreglar el timón de uno de sus barcos, la Pinta.",
  "ventanilla.vos.historia.timanfaya":
    "En Timanfaya el suelo está tan caliente que cocinan la comida con el calor del volcán. ¡Y si echan agua en un agujero, sale disparada para arriba!",
  "ventanilla.vos.historia.rio-paraguay":
    "¿Ves esas lagunas con forma de herradura al lado del río? Son curvas viejas que el río dejó cuando cortó camino.",
  "ventanilla.vos.historia.asuncion":
    "Cuando llegaron los primeros barcos de Europa, los guaraníes de acá ya sembraban maíz, mandioca, batata y maní.",
  "ventanilla.vos.historia.ypacarai":
    "La letra de esa canción la escribió una poeta que nunca había visto el lago. ¡Se inspiró escuchando la guitarra!",
  "ventanilla.vos.historia.ypoa":
    "¡En el Ypoá hay islas que flotan! Son colchones de plantas, y encima hasta crecen arbolitos.",
  "ventanilla.vos.historia.yacyreta":
    "¿Sabés qué quiere decir Yacyretá en guaraní? Tierra de la luna: yasy es la luna.",
  "ventanilla.vos.historia.itaipu":
    "Itaipú quiere decir piedra que suena, en guaraní. Así se llamaba una isla del río.",
  "ventanilla.vos.historia.iguazu":
    "Iguazú quiere decir agua grande, en guaraní. Hace mucho, unos viajeros tuvieron que cargar sus canoas a pie para pasar las cataratas.",
  "ventanilla.vos.historia.triple-frontera":
    "En cada orilla hay una columna pintada con los colores de su bandera. ¡Tres orillas, tres banderas!",
  "ventanilla.vos.historia.cerro-cora":
    "En esos montes vive el mboreví, el tapir: ¡el animal de tierra más grande de Sudamérica, con una trompita!",
  "ventanilla.vos.historia.chaco":
    "En el Chaco hay un árbol con la panza gorda como una botella: el samuhú. ¡Guarda agua adentro para cuando no llueve!",
  "ventanilla.vos.historia.encarnacion":
    "Encarnación empezó hace más de cuatrocientos años, como un pueblo de las misiones. ¡Y un puente largo la une con Argentina!",
  "ventanilla.vos.historia.trinidad":
    "En la iglesia de Trinidad hay ángeles de piedra tocando el arpa, el órgano y la flauta. ¡Una orquesta de piedra!",
  "ventanilla.vos.historia.cruz-del-sur":
    "Hace mucho, a estas estrellas las llamaban el Crucero, y los marineros las usaban para saber qué tan al sur estaban.",
  /*
   * **Y la llegada dice dónde has llegado.**
   *
   * Era «bienvenidos, gracias por volar con nosotros» y valía igual para los
   * once campos: una llegada que no nombra el sitio no es una llegada, es una
   * despedida genérica. En un avión de verdad lo primero que dice la
   * comandante al parar es el nombre del aeropuerto, y es de las pocas frases
   * del vuelo que quien viaja escucha entera — porque le dice dónde está.
   *
   * Pedido jugando: «en cada aeropuerto se le nombra, para que se sepa dónde
   * aterrizas». Y es de las cosas que este juego puede enseñar sin proponerse
   * enseñar nada: se aterriza once veces en once sitios con nombre y los
   * nombres se quedan.
   *
   * `{campo}` sale del escenario, así que no hay una lista que mantener al
   * lado. Ver `nameKey` en `world/scenarios.ts`.
   */
  "comandante.llegada":
    "Señores pasajeros, bienvenidos a {campo}. Gracias por volar con nosotros, y que les vaya lindo.",

  /*
   * ── **Y una llegada propia de cada campo** ──────────────────────────────
   *
   * La de arriba es la de reserva: sirve, nombra el sitio y no dice nada de
   * él. Y eso era exactamente la pega — «dirá cosas distintas en cada
   * aeropuerto y no una frase siempre igual con un hueco».
   *
   * Así que cada campo tiene la suya, y cada una cuenta algo **verdadero** de
   * dónde acabás de posarte: el silbo de La Gomera, el mar de nubes de Los
   * Rodeos, la tierra negra de Lanzarote, el piloto que le da nombre a
   * Asunción. Es la regla de la casa aplicada a lo que parecía un adorno: lo
   * que se enseña es real, y quien aprenda algo aquí tiene que reconocerlo el
   * día que lo vea de verdad.
   *
   * No hay una lista que mantener al lado: la clave se arma con el `id` del
   * escenario y, si algún campo nuevo no tiene la suya, sale la de reserva.
   * Ver `oirLaRadio` en `game.ts`.
   */
  "comandante.llegada.pettirossi":
    "Señores pasajeros, bienvenidos a Asunción. Este aeropuerto lleva el nombre de Silvio Pettirossi, que fue el primer paraguayo en volar — así que están en buen sitio para aterrizar. Gracias por acompañarnos.",
  "comandante.llegada.guarani":
    "Bienvenidos a Ciudad del Este. Si miran hacia el sur, por ahí andan las cataratas y tres países que se tocan en la misma esquina. Gracias por volar con nosotros.",
  "comandante.llegada.encarnacion":
    "Señores pasajeros, estamos en Encarnación, a la orilla del Paraná. Gracias por venir — y si se quedan para el carnaval, abríguense poco.",
  "comandante.llegada.estigarribia":
    "Bienvenidos a Mariscal Estigarribia, en pleno Chaco. Acá la pista es larguísima y el horizonte también. Gracias por volar con nosotros.",
  "comandante.llegada.pedro-juan":
    "Señores pasajeros, bienvenidos a Pedro Juan Caballero, en Amambay. Acá la frontera con Brasil pasa por el medio de la calle. Gracias por acompañarnos.",
  "comandante.llegada.concepcion":
    "Señores pasajeros, bienvenidos a Concepción. Del otro lado del río Paraguay empieza el Chaco, y de acá para el norte el río es el camino. Gracias por volar con nosotros.",
  "comandante.llegada.ayolas":
    "Señores pasajeros, bienvenidos a Ayolas. A veinte kilómetros está Yacyretá, la represa que el Paraguay comparte con la Argentina sobre el Paraná. Gracias por volar con nosotros.",
  "comandante.llegada.pilar":
    "Señores pasajeros, bienvenidos a Pilar, la capital del Ñeembucú, a orillas del río Paraguay. Gracias por volar con nosotros.",
  "comandante.llegada.yvytu-rape":
    "Bienvenidos a Yvytu Rape, la pista de la Granja Óga. Acá no hay cintas ni pasillos: se baja, se estira uno y ya está en casa. Gracias por volar con nosotros.",
  "comandante.llegada.valle-cordillera":
    "Señores pasajeros, bienvenidos al Valle de la Cordillera. Miren por la ventanilla antes de bajar, que esto de verde no se cansa. Gracias por venir.",
  "comandante.llegada.chaco":
    "Bienvenidos a la Llanura del Chaco. Acá el cielo empieza en el suelo y no se acaba nunca. Gracias por volar con nosotros.",
  "comandante.llegada.tenerife-norte":
    "Señores pasajeros, bienvenidos a Tenerife Norte. Si al salir les recibe una nube, no se asusten: acá el mar de nubes llega hasta la puerta. Gracias por acompañarnos.",
  "comandante.llegada.tenerife-sur":
    "Bienvenidos a Tenerife Sur. Acá abajo casi siempre hace sol y casi siempre sopla — las dos cosas a la vez. Gracias por volar con nosotros.",
  "comandante.llegada.gran-canaria":
    "Señores pasajeros, bienvenidos a Gran Canaria. Dicen que esta isla tiene todos los climas del mundo en una tarde; ya nos contarán. Gracias por venir.",
  "comandante.llegada.lanzarote":
    "Bienvenidos a Lanzarote. Esa tierra negra que ven no es sombra: es lava, y es más joven que casi todo lo demás. Gracias por volar con nosotros.",
  "comandante.llegada.fuerteventura":
    "Señores pasajeros, bienvenidos a Fuerteventura. Acá el viento es el que manda, y por eso la arena cambia de sitio. Gracias por acompañarnos.",
  "comandante.llegada.la-palma":
    "Bienvenidos a La Palma. Acá arriba hay telescopios mirando el cielo, así que esta noche no miren la pantalla: miren para arriba. Gracias por volar con nosotros.",
  "comandante.llegada.el-hierro":
    "Señores pasajeros, bienvenidos a El Hierro. Durante siglos esta isla fue el final del mapa: desde acá, ya no había nada dibujado. Gracias por venir.",
  "comandante.llegada.la-gomera":
    "Bienvenidos a La Gomera. Acá la gente se habla de un barranco a otro silbando, y se entiende todo. Gracias por volar con nosotros.",
  "comandante.llegada.cuatro-vientos":
    "Señores pasajeros, bienvenidos a Cuatro Vientos. Este es el aeródromo más antiguo de España y todavía trabaja: no se jubila nadie acá. Gracias por acompañarnos.",

  /*
   * ── El otro avión de la frecuencia ──────────────────────────────────────
   *
   * Cinco frases que no le dicen nada a quien juega y lo cambian todo: **se
   * oye a alguien más ahí fuera**. Un aeropuerto donde la radio está muerta
   * es un decorado; con esto, uno no está solo en el mundo. Todavía no hay
   * tráfico dibujado —eso es #118—, pero la radio ya no calla.
   *
   * Van con matrícula paraguaya de verdad, ZP, y con la fraseología de
   * siempre. Y **no las traduce nadie**: en Silvio Pettirossi la radio se
   * habla en castellano, y oírla en castellano mientras tu instructor te
   * habla en inglés es exactamente lo que suena en un aeropuerto de verdad.
   *
   * Sin número de pista a propósito: es una frase grabada, y decir «para la
   * uno cinco» en Tenerife Norte —que es la 12/30— sería enseñar algo falso
   * por un adorno.
   */
  /*
   * **Y se presenta con su matrícula, no con el nombre de tu avión.**
   *
   * Aquí decía «Buenos días, Óga uno siete dos», y eso está mal dos veces. Lo
   * primero, porque «Óga 172» es el nombre que este proyecto **retiró**: ciento
   * setenta y dos es el número de una avioneta de escuela que existe y cuyo
   * fabricante protege su nombre como marca, y por eso la flota se llama JAZ.
   * Ver #69 y `flight/flota.ts`. Que siguiera saliendo por la radio es
   * exactamente la fuga que aquel cambio quería tapar.
   *
   * Y lo segundo, porque en una radio **uno se presenta a sí mismo**. Las otras
   * cuatro frases de este avión ya lo hacen —«Zulu Papa Alfa Bravo Charlie,
   * rodando a la cabecera»— y el saludo era el único que nombraba a otro. Con
   * la flota en seis aviones, además, nombrar uno era nombrar el que no es.
   */
  "otro.buenosDias": "Buenos días, {indicativo}, rodando a la cabecera",
  "otro.rodando": "{indicativo}, rodando a la cabecera",
  "otro.enCola": "{indicativo}, viento en cola",
  "otro.final": "{indicativo}, en final",
  "otro.pistaLibre": "{indicativo}, pista libre",
  /*
   * **Las palabras del segundo peldaño.** Una sola palabra, corta, y siempre
   * la misma para la misma cosa.
   *
   * A los siete años se lee una palabra de un vistazo y una frase no se lee en
   * absoluto mientras se vuela: mirar el cartel es dejar de mirar la pista. Y
   * un vocabulario corto y repetido se aprende solo — «Bajá» quiere decir lo
   * mismo viniendo alto por la senda que pasando por encima de un aro, y esa
   * es justamente la idea. Ver `flight/escalera.ts`.
   */
  /*
   * **Cómo vuela un ala.** El esquema con el tirador del ángulo de ataque.
   *
   * Es lo único de este juego que no se entiende oyéndolo, así que estas
   * frases no explican el ala: acompañan al dibujo y dicen qué está pasando
   * ahora mismo. Quien navega con lector de pantalla las oye al mover el
   * tirador, que es lo más cerca del dibujo que se puede poner. Ver
   * `ui/pantalla-ala.ts`.
   */
  "ala.titulo": "Cómo vuela un ala",
  "ala.angulo": "Ángulo del ala",
  "ala.velocidad": "Velocidad",
  "ala.sustentacion": "Lo que sube",
  "ala.resistencia": "Lo que frena",
  "ala.finura": "Sube por frena",
  "ala.peso": "Veces el peso del avión",
  "ala.dice.arriba":
    "Mirá el azul: casi toda la fuerza la hace el aire de arriba, chupando. Y mirá cómo el aire sale para abajo detrás del ala.",
  "ala.dice.arrastra":
    "Con más ángulo sube más… pero también frena mucho más. Por eso no se vuela con el morro arriba del todo.",
  "ala.dice.cerca": "Cuidado: un poco más de ángulo y el aire se suelta.",
  "ala.dice.perdida":
    "El aire se despegó del ala: mirá los remolinos, y cómo el azul ya solo queda en la puntita de adelante. Eso es la pérdida: bajá el morro y vuelve.",
  "palabra.mudo": "Sin voz",
  "palabra.bien": "¡Bien!",
  "palabra.tira": "¡Tirá!",
  "palabra.gas": "Gas",
  "palabra.subi": "Subí",
  "palabra.baja": "¡Bajá!",
  "palabra.frena": "¡Frená!",
  "palabra.toca": "¡Tocá!",
  "palabra.volve": "¡Volvé!",
  // La verde en vuelo: tu permiso para aterrizar. Ver `autorizarElAterrizaje`.
  "palabra.aterriza": "¡Aterrizá!",
  "palabra.alAire": "¡Al aire!",
  // La vuelta entera que pide la torre para que salga otro. Ver `darteUnaVuelta`.
  "palabra.vuelta": "¡Una vuelta!",
  "palabra.laPista": "¿La pista?",
  "palabra.cuidado": "¡Cuidado!",
  "palabra.mira": "¡Mirá!",
  /*
   * **Y la tarjeta del aviso de tráfico cuando entran los números**: la hora
   * del reloj y la altura, que es como da el tráfico una torre de verdad —«a
   * las dos, trescientos pies por encima»—. No se graba: lleva huecos, y lo
   * que se oye es la frase de arriba o la cabina. Ver `Game.avisarDelTrafico`.
   */
  "tcas.hora": "a las {hora}",
  "tcas.hora.1": "a la una",
  "tcas.arriba": "Tráfico {donde}, {cuanto} por encima",
  "tcas.abajo": "Tráfico {donde}, {cuanto} por debajo",
  "tcas.nivel": "Tráfico {donde}, a tu misma altura",
  /*
   * **La maniobra del TCAS, en la tarjeta**: una palabra en el peldaño de la
   * palabra y, desde el de las cifras, la frase con su número, que es el de
   * la franja verde del variómetro. Con calma y sin «¡»: es una orden, no una
   * alarma. Ver `Game.ordenDelTcas` y `flight/tcas.ts`.
   */
  "palabra.ra.sube": "Subí",
  "palabra.ra.baja": "Bajá",
  "palabra.ra.nivela": "Nivelá",
  "palabra.ra.vigila": "Así",
  "tcas.ra.sube": "Subí: {ritmo} o más, hasta la franja verde",
  "tcas.ra.baja": "Bajá: {ritmo} o más, hasta la franja verde",
  "tcas.ra.nivela": "Nivelá: la aguja del variómetro, a cero",
  "tcas.ra.vigila": "Seguí así: la aguja del variómetro, fuera de lo rojo",
  /*
   * **Y el RA completo**: cruzar su altura, mantener lo que se lleva, reforzar
   * e invertir, con las mismas reglas. Ver `Orden` en `flight/tcas.ts`.
   */
  "palabra.ra.subeMas": "Subí más",
  "palabra.ra.bajaMas": "Bajá más",
  "palabra.ra.ahoraSube": "Ahora subí",
  "palabra.ra.ahoraBaja": "Ahora bajá",
  "palabra.ra.mantiene": "Mantené",
  "tcas.ra.cruzaSube": "Subí, cruzando su altura: {ritmo} o más, hasta la franja verde",
  "tcas.ra.cruzaBaja": "Bajá, cruzando su altura: {ritmo} o más, hasta la franja verde",
  "tcas.ra.mantiene": "Mantené el ritmo: la aguja del variómetro, en la franja verde",
  "tcas.ra.mantieneCruzando":
    "Mantené el ritmo, cruzando su altura: la aguja del variómetro, en la franja verde",
  "tcas.ra.subeMas": "Subí más rápido: {ritmo} o más, hasta la franja verde",
  "tcas.ra.bajaMas": "Bajá más rápido: {ritmo} o más, hasta la franja verde",
  "tcas.ra.ahoraSube": "Ahora subí, ya: {ritmo} o más, hasta la franja verde",
  "tcas.ra.ahoraBaja": "Ahora bajá, ya: {ritmo} o más, hasta la franja verde",
  "palabra.rapido": "Muy rápido",
  "palabra.fuera": "Fuera",
  "palabra.corto": "Corto",
  "palabra.largo": "Lejos",
  "palabra.duro": "Fuerte",
  "palabra.roto": "Se rompió",
  "vuelo.estacionado": "Arrancá el motor",
  "vuelo.arrancando": "Soltá el freno y andá despacito",
  "vuelo.rodando": "Seguí la raya verde",
  "vuelo.esperando": "Pará del todo y esperá la luz",
  /*
   * **Y por qué se espera, cuando es por alguien.** Con otro avión usando la
   * pista la luz roja puede durar tres minutos, y sin decir por qué eso es un
   * juego que se ha colgado. La torre lo dice en fraseología en los peldaños
   * de arriba —«hold short, landing traffic»—; en los de abajo lo cuenta la
   * instructora, con calma y en una línea. Ver `porQueEsperas` en
   * `flight/turno-de-pista.ts`.
   */
  "vuelo.esperaQueAterrice": "Esperamos: viene un avión a aterrizar",
  "vuelo.esperaQueDespegue": "Esperamos: primero sale el avión que está en la pista",
  /*
   * **Y en la fila de salida**, que es otro porqué: el de delante no está en
   * la pista, espera en su doble raya desde antes que vos, y sale antes. Y
   * detrás de uno grande, sus dos minutos de estela. Solo con su grabación;
   * sin ella lo cuenta la tarjeta.
   */
  "vuelo.esperaTurnoDeSalida": "Esperamos nuestro turno: primero sale el avión que llegó antes",
  "vuelo.esperaLaEstela":
    "Esperamos un poquito: el avión que salió deja remolinos en el aire",
  "vuelo.autorizado": "¡Luz verde! Entrá a la pista",
  /*
   * **Y en la pista de casa, sin torre ni lámpara**: se para y se mira antes
   * de entrar, y el permiso te lo das vos. Ver `guionSinTorre`.
   */
  "vuelo.esperandoMirando": "Pará y mirá: la manga, los animales y la pista",
  "vuelo.autorizadoSinTorre": "Todo libre: entrá a la pista",
  /*
   * **Y donde contesta un AFIS**, que informa y no da permiso: se escucha, se
   * mira y se decide. Ver `guionAfis`.
   */
  "vuelo.esperandoAfis":
    "Pará y escuchá: acá nadie te da permiso. La radio te dice si viene alguien, y decidís vos",
  "vuelo.autorizadoAfis": "La pista está libre: entrá cuando quieras",
  "vuelo.backTaxi": "Andá hasta el fondo y dá la vuelta",
  /*
   * **Y antes de entrar, por qué el lazo de la raya está al fondo**: en los
   * campos sin calle hasta la cabecera se remonta la pista. Una vez por
   * despegue, con el verde. Ver `contarPorDondeSeSale` en `game.ts`.
   */
  "vuelo.remontar": "Vamos por la pista hasta el final y damos la vuelta allá",
  /*
   * **Y con la avioneta, un trozo o nada.** El de línea remonta hasta el final;
   * la avioneta remonta solo lo que le hace falta, o sale desde la calle si la
   * pista que queda le sobra. Ver `remontaHastaLaCabecera` en
   * `flight/carrera.ts` y `contarPorDondeSeSale` en `game.ts`.
   */
  "vuelo.remontarUnTrecho":
    "Vamos un trecho por la pista y damos la vuelta: desde ahí nos sobra para despegar",
  "vuelo.desdeLaInterseccion":
    "Salimos desde acá, sin ir hasta el final: la pista que queda nos sobra",
  "vuelo.backTaxiUnTrecho": "Andá hasta la vuelta dibujada y girá ahí",
  /*
   * **Y el porqué, cuando el día lo cambia**: la misma avioneta que otro día
   * sale desde la calle, hoy remonta. Lo que lo cambia es lo que se cuenta
   * —el calor, que hace el aire más fino, o el viento de cola—, y solo cuando
   * alarga la cuenta una décima o más. Ver `porQueHoyMasPista`.
   */
  "vuelo.remontar.calor":
    "Hoy hace calor y el avión necesita más pista: vamos por la pista hasta el final y damos la vuelta allá",
  "vuelo.remontar.cola":
    "Hoy el viento viene de atrás y el avión necesita más pista: vamos por la pista hasta el final y damos la vuelta allá",
  "vuelo.remontarUnTrecho.calor":
    "Hoy hace calor y el avión necesita más pista: vamos un trecho por la pista y damos la vuelta",
  "vuelo.remontarUnTrecho.cola":
    "Hoy el viento viene de atrás y el avión necesita más pista: vamos un trecho por la pista y damos la vuelta",
  "vuelo.alineando": "Ponete derechito en el eje",
  "vuelo.minimos": "Mirá la pista: ¿la ves?",
  "vuelo.noEstabilizada": "Así no: andate y volvé a intentarlo",
  "motivo.sinPista": "No se ve la pista",
  "motivo.lento": "Vas muy despacio",
  "motivo.cayendo": "Estás cayendo muy rápido",
  "motivo.rapido": "Vas muy rápido",
  "motivo.torcido": "Estás torcido",
  "motivo.descolocado": "Estás fuera del eje",
  "motivo.alto": "Vas alto",
  "motivo.bajo": "Vas bajo",
  "motivo.sinConfigurar": "Falta el tren o los flaps",
  /*
   * **La instructora propone irse al aire**, no lo manda: a los quinientos
   * pies la aproximación no viene bien, o a los mínimos no se ve la pista.
   * Decide quien vuela. Ver `proponenIrseAlAire` en `game.ts`.
   */
  "vuelo.proponeIrse": "Así no viene bien. Si querés, nos vamos al aire y la volvemos a intentar",
  "vuelo.proponeIrseSinPista":
    "Lo seguro es irnos al aire y volver a intentarlo",
  /*
   * Y donde contesta un AFIS, con uno que va a salir esperando en la calle
   * por la que dejaríamos la pista: el AFIS lo cuenta, no manda, y ella lo
   * propone. Lleva el porqué dentro, que la voz es el canal. Ver
   * `flight/salida-tapada.ts`.
   */
  "vuelo.proponeIrseSalidaTapada":
    "Hay un avión esperando para salir justo por donde vamos a dejar la pista. Si querés, nos vamos al aire, lo dejamos salir y volvemos con calma",
  /*
   * **La toma larga**: flotando o tocando pasada la zona de toma, o sin
   * pista para parar, mientras todavía se puede subir. La instructora lo
   * propone, a tiempo y en calma. Ver `flight/toma-larga.ts`.
   */
  "vuelo.tomaLarga": "Así no: nos vamos al aire y lo volvemos a intentar",
  /*
   * **El veredicto de una toma larga y de una dura** (punto 299): sin
   * percance, dicho con calma. Firme y en su sitio es un buen aterrizaje;
   * suave y lejos, no. Ver `Aterrizaje` en `flight/aterrizaje.ts`.
   */
  "vuelo.tocasteLargo":
    "Tocaste largo, lejos de las marcas: así se come la pista. Mejor firme y en su sitio que suave y lejos",
  "vuelo.tocasteDuro": "Aterrizaje duro: ahora hay que revisar el avión. La próxima, recogé un poco más al final",
  /*
   * Y en los dos peldaños de abajo, en sencillo y empezando por lo que pasó:
   * se aterrizó. Ver `loQueSeDiceDeLaToma` en `game.ts`.
   */
  "vuelo.tocasteLargoFacil":
    "¡Aterrizaste! Pero lejos de las rayas blancas grandes: la próxima, tocá cerca de ellas, que así sobra pista para frenar",
  "vuelo.tocasteDuroFacil":
    "¡Aterrizaste! Pero con un golpe fuerte: la próxima, llegá al suelo más despacito, sin empujar la nariz para abajo",
  "vuelo.tomaLargaSinPista":
    "No nos da la pista para parar: nos vamos al aire y lo volvemos a intentar",
  /*
   * **Y después de aterrizar contra la orden de la torre**, una vez y detrás
   * de la torre: por qué, cuando la torre manda irse, uno se va. Sin grabar:
   * ver `aterrizoContraLaOrden` en `game.ts`.
   */
  "vuelo.aterrizasteContraLaOrden":
    "La torre nos había mandado al aire. Cuando la torre manda irse, uno se va: ella ve lo que nosotros desde acá no vemos",
  "vuelo.rotar": "Tirá para arriba",
  /*
   * **V1, dicho como lo dice una instructora y no como una alarma.**
   *
   * Decía «¡Ya no se puede frenar, volá!», y entre V1 y la rotación pasan dos
   * segundos: quien juega oía un grito y justo detrás un elogio tranquilo.
   * «Eso de "¡Sal ya que vamos a morir todos!" tan seguida de una sosegada y
   * tranquila "Estás en el aire, muy bien" no tiene sentido. ¿En qué quedamos,
   * estuvimos a punto de morir o todo va sobre la seda?»
   *
   * V1 no es un susto: es el momento en que ya se despega, y eso se dice con
   * calma porque **calma es la información**. El susto se lo guarda la
   * instructora para cuando de verdad lo haya.
   */
  "vuelo.comprometido": "Ya despegamos: seguí",
  "vuelo.despegando": "Motor a fondo",
  /*
   * Y lo mismo cuando lo dice al soltar el gas en Guyrami, ya alineado: es el
   * momento de verdad de dar todo el motor. Solo con su grabación; sin ella,
   * la de arriba. Ver `decirElGasSuelto`.
   */
  "vuelo.alineadoGasAFondo": "Ya estás alineado: gas a fondo",
  "vuelo.enVuelo": "Andá a dar una vuelta",
  "vuelo.enVueloAterrizando": "Andá a la pista",
  "vuelo.enVueloDestino": "Seguí la flecha: vamos al otro aeropuerto",
  "vuelo.final": "Bajá suavecito",
  /*
   * **Los avisos de las cajas del avión, explicados.** En el avión que las
   * lleva, la máquina canta *terrain* o *too low* en inglés y, en los peldaños
   * de abajo, la instructora dice esto justo detrás: qué pasa y qué se hace,
   * con calma. Por eso llevan las dos mitades —«vas muy bajo» a secas deja a
   * quien lo oye sin saber qué tocar—. Ver `flight/escalera.ts`.
   */
  "vuelo.terrenoBajo": "Vas muy bajo: subí un poco",
  "vuelo.terrenoSube": "El suelo está cerca: subí",
  // Y detrás de *caution terrain*: lo que ve por delante el avisador.
  "vuelo.terrenoDelante": "Adelante hay una montaña más alta que nosotros: subí",
  "vuelo.perdida": "Pérdida. Bajá el morro",
  /*
   * **El aviso de tráfico del TCAS, dicho en casa.** Es lo que en el peldaño
   * de arriba dice la cabina —«traffic, traffic»— y aquí lo dice la
   * instructora, que sabe por qué lado mirar. Tranquilo y sin «¡cuidado!»: un
   * aviso de tráfico no es una emergencia, es «mirá», y lo que se aprende
   * aquí es a mirar con calma. Ver `flight/tcas.ts`.
   */
  "vuelo.trafico.delante": "Mirá adelante: hay otro avión cerca",
  "vuelo.trafico.izquierda": "Mirá a tu izquierda: hay otro avión cerca",
  "vuelo.trafico.derecha": "Mirá a tu derecha: hay otro avión cerca",
  "vuelo.trafico.detras": "Hay otro avión cerca, detrás de vos",
  /*
   * **Y la maniobra, explicada detrás de la caja.** En los tres peldaños de
   * abajo, después de «climb, climb» o «level off» y nunca a la vez, la
   * instructora cuenta qué ha pedido y qué se hace, con calma: la primera vez
   * que se oye una orden de un TCAS tiene que oírse detrás a alguien que no se
   * asusta. Ver `Game.ordenDelTcas`.
   */
  "vuelo.ra.sube":
    "La caja nos pide subir para apartarnos del otro avión: subí con calma, hasta la franja verde.",
  "vuelo.ra.baja":
    "La caja nos pide bajar para apartarnos del otro avión: bajá con calma, hasta la franja verde.",
  "vuelo.ra.nivela":
    "La caja nos pide dejar de subir y de bajar: nivelá con calma, con la aguja en la franja verde.",
  "vuelo.ra.vigila":
    "La caja nos dice que así vamos bien: seguí como vas, sin llevar la aguja a lo rojo.",
  /*
   * Y las del RA completo, con la misma calma: la palabra rara que dice la
   * caja —*crossing*, *maintain*, *increase*, *NOW*— contada en casa. Esperan
   * su toma: ver `PENDIENTE-VOCES-cabina-2.md`.
   */
  "vuelo.ra.cruzaSube":
    "La caja nos pide subir y pasar por la altura del otro avión, que va a quedar abajo: subí con calma, hasta la franja verde.",
  "vuelo.ra.cruzaBaja":
    "La caja nos pide bajar y pasar por la altura del otro avión, que va a quedar arriba: bajá con calma, hasta la franja verde.",
  "vuelo.ra.mantiene":
    "La caja nos pide seguir como vamos, sin aflojar: la aguja, en la franja verde.",
  "vuelo.ra.mantieneCruzando":
    "La caja nos pide seguir como vamos, sin aflojar: vamos a pasar por la altura del otro avión. La aguja, en la franja verde.",
  "vuelo.ra.subeMas":
    "La caja nos pide subir más rápido: un poco más de nariz arriba, hasta la nueva franja verde.",
  "vuelo.ra.bajaMas":
    "La caja nos pide bajar más rápido: un poco más de nariz abajo, hasta la nueva franja verde.",
  "vuelo.ra.ahoraSube":
    "La caja cambió la orden: ahora hay que subir. Subí ya, con calma, hasta la franja verde.",
  "vuelo.ra.ahoraBaja":
    "La caja cambió la orden: ahora hay que bajar. Bajá ya, con calma, hasta la franja verde.",
  "vuelo.ra.libre": "Ya pasó: el otro avión se aleja. Volvemos con calma a la altura que teníamos.",
  /*
   * **El relevo de frecuencia, contado en casa**, en los peldaños que no leen
   * fraseología: una vez por vuelo al salir de la zona de la torre y otra al
   * volver a entrar en la del campo al que se va. Ver `relevoDeFrecuencia` en
   * `game.ts` y `flight/dependencia.ts`.
   */
  "vuelo.radio.otraFrecuencia":
    "Ya salimos de la zona del aeropuerto: ahora nos habla otro controlador, y a la torre ya no la oímos.",
  "vuelo.radio.otraVezLaTorre":
    "Ya estamos cerca: volvemos a oír a la torre, y a los aviones de este aeropuerto.",
  /*
   * **Y qué es un rombo, la primera vez que sale uno.** No es un aviso —un
   * TCAS no avisa de quien no se acerca— sino la explicación de un dibujo
   * que aparece en la pantalla sin que nadie lo nombre: se preguntó jugando
   * si uno que se cruzaba era peligroso o no. El rombo hueco con su «+10» ya
   * lo decía, pero eso hay que saber leerlo. Ver `explicarElTrafico` en
   * `game.ts`.
   */
  "vuelo.traficoArriba":
    "Ese rombo del mapa es otro avión. Va más alto que nosotros: no nos molesta",
  "vuelo.traficoAbajo":
    "Ese rombo del mapa es otro avión. Va más bajo que nosotros: no nos molesta",
  "vuelo.traficoNivel":
    "Ese rombo del mapa es otro avión. Va a nuestra altura, pero lejos: lo vamos mirando",
  /*
   * **Y las luces de otro avión de noche**, contadas con calma la primera vez
   * del vuelo que se le ven a uno de delante. La clave la elige
   * `queLucesSeLeVen` y lo que se ve lo pinta su tarjeta; esto es lo que dice
   * la instructora, solo con su grabación. La regla entera va la primera vez
   * de la partida, delante. Ver `contarLasLucesDeNoche`.
   */
  "vuelo.lucesDeNoche.deFrente":
    "Mirá ese avión: la luz verde a tu izquierda y la roja a tu derecha. Eso quiere decir que viene hacia nosotros. Para eso llevan luces los aviones: para verse a tiempo.",
  "vuelo.lucesDeNoche.seAleja":
    "¿Ves esa luz blanca sola? Es la cola de otro avión: se está alejando de nosotros.",
  "vuelo.lucesDeNoche.cruzaIzquierda":
    "Ese avión nos enseña su luz roja: lo vemos por su lado izquierdo, y va pasando hacia tu izquierda.",
  "vuelo.lucesDeNoche.cruzaDerecha":
    "Ese avión nos enseña su luz verde: lo vemos por su lado derecho, y va pasando hacia tu derecha.",
  "vuelo.lucesDeNoche.regla":
    "De noche, todos los aviones llevan las mismas luces: roja en la punta del ala izquierda, verde en la derecha y blanca atrás. Mirándolas se sabe hacia dónde va cada uno.",
  /*
   * **La información de tráfico, dicha en casa.** Es lo que en los peldaños
   * de arriba dice la torre —«traffic, two o'clock, one thousand feet
   * above»— y aquí lo cuenta la instructora: dónde mirar y una pregunta, que
   * es lo que enseña a buscar a otro avión con los ojos. Sin «cuidado»: no es
   * un aviso, es un vecino. Y detrás no se pregunta si se ve, que desde la
   * cabina no se ve. Ver `flight/informacion-de-trafico.ts`.
   */
  "vuelo.otroAvion.delante.arriba": "Adelante y más arriba va otro avión. ¿Lo ves?",
  "vuelo.otroAvion.delante.nivel": "Adelante, a nuestra altura, va otro avión. ¿Lo ves?",
  "vuelo.otroAvion.delante.abajo": "Adelante y más abajo va otro avión. ¿Lo ves?",
  "vuelo.otroAvion.derecha.arriba": "Arriba a la derecha va otro avión. ¿Lo ves?",
  "vuelo.otroAvion.derecha.nivel": "A la derecha, a nuestra altura, va otro avión. ¿Lo ves?",
  "vuelo.otroAvion.derecha.abajo": "Abajo a la derecha va otro avión. ¿Lo ves?",
  "vuelo.otroAvion.izquierda.arriba": "Arriba a la izquierda va otro avión. ¿Lo ves?",
  "vuelo.otroAvion.izquierda.nivel": "A la izquierda, a nuestra altura, va otro avión. ¿Lo ves?",
  "vuelo.otroAvion.izquierda.abajo": "Abajo a la izquierda va otro avión. ¿Lo ves?",
  "vuelo.otroAvion.detras.arriba": "Detrás de nosotros, más arriba, va otro avión. No hace falta hacer nada",
  "vuelo.otroAvion.detras.nivel": "Detrás de nosotros, a nuestra altura, va otro avión. No hace falta hacer nada",
  "vuelo.otroAvion.detras.abajo": "Detrás de nosotros, más abajo, va otro avión. No hace falta hacer nada",
  /*
   * **Las aves en la final**, en los dos peldaños de arriba. La torre avisa
   * por radio en inglés, como lo haría una de verdad, y detrás la
   * instructora cuenta qué ha dicho y qué se hace — con calma, que no es una
   * emergencia sino una maniobra. Lo que no parece: ante un ave de frente se
   * sube, porque las aves asustadas se tiran hacia abajo. Ver
   * `flight/aviso-de-aves.ts`.
   */
  "vuelo.aves.porQueSubir":
    "La torre avisa que hay pájaros en la final. Si ves alguno de frente, subí un poquito: cuando se asustan, los pájaros se tiran para abajo",
  /*
   * **Y la uve, que es la estela al revés.** Cada ave va en el aire que sube
   * junto a la punta del ala de la de delante; los aviones, ese mismo
   * remolino, lo esquivan. Se dice una vez, la primera que se ve una. Ver
   * `mirarLasUves` en `game.ts` y `separacionDeTorbellinos` en
   * `flight/estela.ts`.
   */
  "vuelo.aves.enUve":
    "¡Mirá, pájaros volando en V! Cada uno va en el aire que sube junto a la punta del ala del de adelante. Los aviones hacemos al revés: ese remolino lo esquivamos",
  /*
   * Y lo que pone la tarjeta: cuando avisa la torre, y cuando la bandada ya
   * está de frente. No se dicen —la voz es la de la torre y la de la
   * instructora—, se leen.
   */
  "aves.enLaFinal": "Pájaros en la final",
  "aves.deFrente": "Pájaros de frente: subí un poco",
  /**
   * **«De golpe» y no «rápido».** Decía «bajás muy rápido», y justo después de
   * «venís lento: metéle gas» eso se oye como lo contrario: «le meto gas y
   * "bajás muy rápido"… ¿qué se supone que tengo que hacer?». Es el ritmo de
   * bajada, no la velocidad, y la frase lo dice. Yendo lento, lo que explica
   * el *sink rate* es la de ir lento: ver `cantarLaActitud`.
   */
  "vuelo.bajasRapido": "Bajás muy de golpe: levantá un poco la nariz",
  "vuelo.muyInclinado": "Estás muy inclinado: enderezá las alas",
  "vuelo.pilotoSuelto": "Se soltó el piloto automático",
  /*
   * **El automático y los gases, contados.** La nivelada de los peldaños de
   * abajo al llegar a la ventanilla por debajo del crucero —arriba lo cuenta
   * el paso del crucero—, los gases que van con el automático en un reactor,
   * soltarlos tocando el motor y el automático que se suelta para aterrizar a
   * mano, en vez del «se soltó» de cuando se suelta sin querer. Cada una, solo
   * con su grabación. Ver `sostenerElNivel`, `ponerPilotoAutomatico` y
   * `soltarLosGases` en `game.ts`.
   */
  "vuelo.niveladaAsistida":
    "Llegamos a la altura de la ventanilla y el avión se queda acá solo. Ahora el motor es velocidad: más motor, más rápido.",
  "vuelo.gasesAutomaticos":
    "En este avión el automático también lleva el motor: mirá cómo la palanca se mueve sola para ir a la velocidad de la marca rosa.",
  "vuelo.gasesSueltos":
    "Tocaste el motor: ahora la velocidad la llevás vos. El automático sigue con la altura.",
  "vuelo.automaticoParaAterrizar":
    "Soltamos el automático para aterrizar a mano. Seguí la senda, como venía él.",
  /*
   * Y la ventanilla en la final, que solo cambia con el automático bajando por
   * la senda: lo cuenta en Taguató, el único peldaño donde cambia y todavía se
   * explica. Ver `ponerLaFrustradaEnLaVentanilla`.
   */
  "vuelo.ventanillaFrustrada":
    "El automático ya baja por la senda. En la ventanilla ponemos la altura de irse al aire, por si hay que subir: bajar, lo manda la senda.",
  /*
   * Al apretar el botón en tierra. No es un error de quien juega: un piloto
   * automático de verdad no engancha con peso en las ruedas. Ver
   * `sePuedeConectar`.
   */
  "vuelo.pilotoEnTierra": "El piloto automático se conecta en el aire",
  /*
   * Al pasar por el punto de descenso del plan de vuelo. Con calma: no es un
   * aviso de que algo va mal, es la parte del viaje que toca ahora. En cabina
   * lo canta la tripulación en inglés, *top of descent*. Ver
   * `flight/ruta.ts`.
   */
  "vuelo.empezamosABajar": "Empezamos a bajar: despacito, hasta la pista",
  /*
   * **La altura de la torre, en la ventanilla.** En los peldaños de abajo la
   * pone la instructora y lo cuenta: la primera vez entero, las siguientes en
   * corto. En Guyrami no hay automático ni ventanilla que girar: hay la raya
   * de la cinta. Ver `autorizarAltura` en `game.ts`.
   */
  "vuelo.alturaDeLaTorre":
    "La torre nos dio hasta dónde subir. La puse en la ventanilla de la altura, en magenta: subimos hasta ahí y nos quedamos.",
  "vuelo.alturaDeLaTorreRaya": "La torre nos dice hasta dónde subir: hasta la raya de la altura.",
  "vuelo.otraAlturaDeLaTorre": "La torre nos deja subir otro poco. Ya puse la altura nueva.",
  /*
   * Y el tono del avisador de altitud, contado detrás de la máquina y una sola
   * vez: ver `sonarElAvisador` en `game.ts`.
   */
  "vuelo.tonoDeAltitudCerca":
    "Ese tono avisa que ya casi llegamos a la altura de la ventanilla. Ahí se nivela.",
  "vuelo.tonoDeAltitudFuera":
    "Ese tono avisa que nos fuimos de la altura de la ventanilla. Volvé despacito.",
  /*
   * Y a tiempo, si se sube por encima del plan: «si la comandante dice que
   * vamos a ir a diez mil pies y yo subo hasta doce mil, bajar me costó».
   */
  "vuelo.masAltoQueElPlan":
    "Vamos más alto que el plan: hay más para bajar, así que vamos a empezar a bajar antes.",
  "palabra.aBajar": "A bajar",
  // Irse al aire no es fallar: es la decisión buena, y así se dice.
  "vuelo.mandanFrustrar": "Pista ocupada. Subí y volvé por el circuito",
  /*
   * **Y por qué se quita un permiso ya dado**, que a los cuatro años es lo
   * raro: «¿no me había dejado?». En lugar de la de arriba cuando el permiso se
   * había oído. Ver `mandaronIrseAlAire` en `game.ts`.
   */
  "vuelo.permisoAnulado":
    "La torre nos había dejado aterrizar, pero entró un avión en la pista. Con la pista ocupada no se aterriza: subimos y volvemos por el circuito.",
  /*
   * **Y el que va a salir tapa la calle por la que dejaríamos la pista**: la
   * torre nos pide una vuelta entera para que salga él, o, si ya no hay
   * sitio, nos manda al aire. Esperar en el aire no es un castigo: es lo que
   * se hace para que la pista sea de uno por vez. Ver
   * `flight/salida-tapada.ts`.
   */
  "vuelo.vueltaPorTuSalida":
    "La torre nos pide dar una vuelta entera: hay un avión esperando para salir justo por donde vamos a dejar la pista. Damos la vuelta, sale él, y volvemos.",
  "vuelo.vueltaHecha": "Vuelta entera. Ahora sí, volvemos a la pista.",
  "vuelo.alAirePorTuSalida":
    "Hay un avión esperando para salir justo por donde vamos a dejar la pista. Subimos, sale él, y volvemos por el circuito.",
  /*
   * Y a los mínimos sin el permiso de la torre, con la pista libre: el porqué
   * no es la pista. Ya no se dice —la torre no manda al aire por su propio
   * retraso: a los mínimos el permiso llega a la vista— y por eso no se
   * graba. Ver `HABLADOS` en `scripts/frases-para-grabar.mjs`.
   */
  /*
   * La cota de la pista de llegada, en el peldaño de los números: el número va
   * en la tarjeta; la voz lo cuenta sin él, para que valga en cualquier campo,
   * y con la carta y los mínimos, que es lo que se lee con ese número. Ver
   * `contarLaCotaDeLaPista` en `game.ts`.
   */
  "hud.cotaDeLaPista":
    "La pista a la que vamos está a {cota} sobre el mar: lo que marca el altímetro menos eso es lo alto que vas sobre ella",
  "vuelo.cotaDeLaPista":
    "Mirá la carta: al lado de la pista dice a cuánto está sobre el mar. Lo que marca el altímetro menos eso es lo alto que vamos sobre la pista, y con eso se ponen los mínimos",
  "vuelo.sinPermisoEnLosMinimos":
    "La torre no te dio permiso para aterrizar. Sin permiso no se aterriza: subí y volvé por el circuito",
  "percance.ocupada": "La pista estaba ocupada y te dijeron que no bajaras",
  "vuelo.puedeVolver": "La torre te deja volver a intentarlo",
  // Y en la pista de casa, donde no hay torre que deje nada: se ve.
  "vuelo.puedeVolverSinTorre": "La pista ya está libre: volvé a intentarlo",
  /*
   * Y tu permiso para aterrizar, en la tarjeta verde. No lo dice la
   * instructora: lo dice la torre, «podés aterrizar», y esto es lo que se lee
   * mientras tanto. Ver `autorizarElAterrizaje` en `game.ts`.
   */
  "vuelo.puedeAterrizar": "La torre te deja aterrizar",
  "vuelo.puedeAterrizarSinTorre": "Ahora sí: podés aterrizar",
  // Y donde un AFIS te dice que la pista está libre: nadie te autoriza.
  "vuelo.puedeAterrizarAfis": "La pista está libre: si venís bien, aterrizá",
  "vuelo.frustrada": "¡Bien hecho! Te fuiste al aire. Probá de nuevo",
  /*
   * **Y estos tres hablan como habla una persona.**
   *
   * Se pidió tal cual: «más natural, que me diga que baje, que estoy alto y
   * así, como diría una instructora». Así que ninguno nombra el aro — el aro es
   * el dibujo con el que el juego lo enseña, y lo que se corrige es la altura
   * **para la pista**, que es lo que se está mirando. Sus otras formas están en
   * `audio/variantes.ts`.
   */
  "vuelo.aroAlto": "Venís un poco alto. Bajá suave",
  "vuelo.aroBajo": "Venís un poco bajo. Subí suave",
  "vuelo.corregido": "¡Eso es! Así venís bien",
  "circuito.subida": "Subí derecho por el eje",
  "circuito.cruzado": "Girá a la izquierda: volvemos a la pista",
  "circuito.encola": "Volá al lado de la pista, con ella a tu izquierda",
  /*
   * **Y por la derecha, donde el campo lo publica así**: La Gomera por la 09,
   * La Palma por la 36, Tenerife Sur por la 07… siempre del lado del mar.
   * Con la frase de la izquierda, la frustrada de La Gomera mandaba girar
   * hacia la isla. La instructora las dice solo con su grabación: sin
   * ella hablan el dibujo y la raya. Ver `tramoDeCircuito` en `game.ts`.
   */
  "circuito.cruzado.derecha": "Girá a la derecha: volvemos a la pista",
  "circuito.encola.derecha": "Volá al lado de la pista, con ella a tu derecha",
  "circuito.base": "Girá otra vez y empezá a bajar: ya vamos a aterrizar",
  "vuelo.papiAlto": "Luces blancas: vas alto, bajá",
  "vuelo.lentoYBajo": "Venís lento: metéle gas",
  "vuelo.papiBajo": "Luces rojas: vas bajo, subí",
  "vuelo.papiBien": "Dos rojas y dos blancas: vas bien",
  /*
   * **Los consejos de la bajada y la final: la acción y el objetivo.**
   *
   * «No es que la instructora me corrija, es que no sé lo que tengo que
   * hacer.» Cada uno nombra **un solo mando** —el gas, la nariz, lo que
   * frena— y **hasta dónde**: la marca rosa de la cinta, dos blancas y dos
   * rojas del PAPI, el rombo en el medio, la marca rosa del variómetro.
   * Los decide uno solo, `flight/consejo-de-la-bajada.ts`, que espera a que el
   * avión responda antes de volver a corregir.
   *
   * Se dicen solo con su grabación; sin ella, la grabada que nombra el mismo
   * mando, y la tarjeta enseña esa misma frase. Ver `decirElConsejo` en
   * `game.ts`.
   *
   * **Y dicen dónde está lo que nombran** (272, 273): «el rombo rosa, el de al
   * lado de la altura», y no «el rombo», que en la pantalla hay varios; «las
   * cuatro luces de al lado de la pista»; «la marca rosa de la velocidad», que
   * rosas hay cuatro. Solo se dicen con eso a la vista, y la pieza late
   * mientras tanto; si no se ve, se dice su `.sinVer`, la misma acción sin el
   * «hasta». Ver `flight/lo-que-se-nombra.ts`.
   */
  "vuelo.consejo.masGas":
    "Un poquito más de gas, hasta la marca rosa de la velocidad. La nariz, quieta.",
  "vuelo.consejo.menosGas": "Un poquito menos de gas, hasta la marca rosa de la velocidad.",
  "vuelo.consejo.narizAbajoPapi":
    "Nariz un poquito abajo, hasta ver dos blancas y dos rojas en las cuatro luces de al lado de la pista.",
  "vuelo.consejo.narizArribaPapi":
    "Nariz un poquito arriba, hasta ver dos blancas y dos rojas en las cuatro luces de al lado de la pista.",
  "vuelo.consejo.narizAbajoSenda":
    "Nariz un poquito abajo, hasta que el rombo rosa, el de al lado de la altura, quede en el medio.",
  "vuelo.consejo.narizArribaSenda":
    "Nariz un poquito arriba, hasta que el rombo rosa, el de al lado de la altura, quede en el medio.",
  "vuelo.consejo.narizArribaRitmo":
    "Nariz un poquito arriba: bajamos más suave, hasta la marca rosa del variómetro.",
  "vuelo.consejo.narizArribaSuave": "Nariz un poquito arriba, para bajar más suave.",
  "vuelo.consejo.aerofrenos": "Sacá un poco los aerofrenos, hasta la marca rosa de la velocidad.",
  "vuelo.consejo.aerofrenos.sinVer": "Sacá un poco los aerofrenos, para ir más despacio.",
  /*
   * **Las del perfil de la bajada** (el `VDEV`), que no son las de la pista:
   * por debajo del perfil no se sube, se baja más suave o se nivela, y por
   * encima y sin poder bajar más deprisa se sacan los aerofrenos, que es el
   * «DRAG REQUIRED» de Boeing. Y **las del avión de cables** sin gases
   * automáticos, que lleva la senda con el gas y la velocidad con el morro
   * (ADR 0017).
   */
  "vuelo.consejo.nivelarPerfil":
    "Vamos un poco por debajo del perfil: bajá más suave, o nivelá un momento, hasta que el rombo rosa, el de al lado de la altura, llegue al medio.",
  "vuelo.consejo.nivelarPerfil.sinVer":
    "Vamos un poco por debajo del perfil: bajá más suave, o nivelá un momento.",
  "vuelo.consejo.narizAbajoPerfil":
    "Vamos por encima del perfil: la nariz un poquito abajo, hasta que el rombo rosa, el de al lado de la altura, llegue al medio.",
  "vuelo.consejo.aerofrenosPerfil":
    "Vamos por encima del perfil y el avión ya baja todo lo que puede: sacá los aerofrenos, hasta que el rombo rosa, el de al lado de la altura, llegue al medio.",
  "vuelo.consejo.aerofrenosPerfil.sinVer":
    "Vamos por encima del perfil y el avión ya baja todo lo que puede: sacá los aerofrenos.",
  "vuelo.consejo.masGasPerfil":
    "Vamos un poco por debajo del perfil: un toque de gas, para bajar más suave, hasta que el rombo rosa, el de al lado de la altura, llegue al medio.",
  "vuelo.consejo.masGasPerfil.sinVer":
    "Vamos un poco por debajo del perfil: un toque de gas, para bajar más suave.",
  "vuelo.consejo.menosGasPerfil":
    "Vamos por encima del perfil: un poquito menos de gas, para bajar más, hasta que el rombo rosa, el de al lado de la altura, llegue al medio.",
  "vuelo.consejo.menosGasPerfil.sinVer":
    "Vamos por encima del perfil: un poquito menos de gas, para bajar más.",
  "vuelo.consejo.masGasPapi":
    "Un poco bajo para la pista: un toque de gas, la nariz quieta, hasta ver dos blancas y dos rojas en las cuatro luces de al lado de la pista.",
  "vuelo.consejo.masGasSenda":
    "Un poco bajo: un toque de gas, la nariz quieta, hasta que el rombo rosa, el de al lado de la altura, quede en el medio.",
  "vuelo.consejo.masGasSenda.sinVer": "Un poco bajo: un toque de gas, la nariz quieta.",
  "vuelo.consejo.menosGasPapi":
    "Un poco alto para la pista: un poquito menos de gas, la nariz quieta, hasta ver dos blancas y dos rojas en las cuatro luces de al lado de la pista.",
  "vuelo.consejo.menosGasSenda":
    "Un poco alto: un poquito menos de gas, la nariz quieta, hasta que el rombo rosa, el de al lado de la altura, quede en el medio.",
  "vuelo.consejo.menosGasSenda.sinVer":
    "Un poco alto: un poquito menos de gas, la nariz quieta.",
  "vuelo.consejo.masGasSuave": "Bajamos muy de golpe: un toque de gas, para bajar más suave.",
  "vuelo.consejo.narizAbajoMarca":
    "Vamos lentos: la nariz un pelín abajo, hasta la marca rosa de la velocidad.",
  "vuelo.consejo.narizArribaMarca":
    "Vamos rápidos: la nariz un pelín arriba, hasta la marca rosa de la velocidad.",
  "vuelo.consejo.narizArribaMarca.sinVer": "Vamos rápidos: la nariz un pelín arriba.",
  // Y su palabra corta, para el peldaño que lee una palabra: el mando y hacia dónde.
  "palabra.masGas": "Más gas",
  "palabra.menosGas": "Menos gas",
  "palabra.narizArriba": "Nariz arriba",
  "palabra.narizAbajo": "Nariz abajo",
  /*
   * **El «¿y ahora qué?»: el paso siguiente en cada escalón del vuelo**, con
   * su acción y su objetivo. «Ni sabía a qué velocidad debería ir ahora»,
   * llegando a La Palma a mil ochocientos pies. Los decide uno solo,
   * `flight/siguiente-paso.ts`: subir, acelerar o frenar a la marca nueva, el
   * crucero, bajar, nivelar, los flaps por su orden, el tren y la senda.
   *
   * Se dicen solo con su grabación; sin ella, la grabada que pide lo mismo
   * —«Bajá el motor», «Bajá los flaps para frenar», «Sacá el tren»,
   * «Empezamos a bajar»— y, si ninguna sirve, el paso se ve en la tarjeta
   * y en la cabina y la voz calla.
   *
   * Y como los consejos, **solo nombran lo que se ve**: con el cuadro
   * recogido, la marca rosa no está, y entonces va la `.sinVer`. Ver
   * `flight/lo-que-se-nombra.ts`.
   */
  "vuelo.paso.subir": "Subimos hasta la raya de la altura, a la velocidad de la marca rosa.",
  "vuelo.paso.subir.sinVer": "Ahora subimos hasta la altura que nos toca.",
  "vuelo.paso.acelerarGas":
    "Ya podemos ir más rápido: más gas, hasta la marca rosa de la velocidad.",
  "vuelo.paso.acelerarGas.sinVer": "Ya podemos ir más rápido: más gas.",
  "vuelo.paso.acelerarNariz":
    "Ya podemos ir más rápido: la nariz un poquito abajo, hasta la marca rosa de la velocidad.",
  "vuelo.paso.acelerarNariz.sinVer": "Ya podemos ir más rápido: la nariz un poquito abajo.",
  "vuelo.paso.frenarGas":
    "Ahora vamos más despacio: menos gas, hasta la marca rosa de la velocidad.",
  "vuelo.paso.frenarAerofrenos":
    "Ahora vamos más despacio: un poco de aerofrenos, hasta la marca rosa de la velocidad.",
  "vuelo.paso.frenarAerofrenos.sinVer": "Ahora vamos más despacio: un poco de aerofrenos.",
  "vuelo.paso.frenarNariz":
    "Ahora vamos más despacio: la nariz un poquito arriba, que así frenamos, hasta la marca rosa de la velocidad.",
  "vuelo.paso.frenarNariz.sinVer":
    "Ahora vamos más despacio: la nariz un poquito arriba, que así frenamos.",
  "vuelo.paso.mantener":
    "La marca rosa de la velocidad se movió, y ya vamos justo ahí: seguimos así.",
  "vuelo.paso.marcaDelAutomatico":
    "La marca rosa de la velocidad se movió: el automático lleva el motor hasta ella. Mirá cómo se mueve la palanca.",
  "vuelo.paso.marcaDelAutomatico.sinVer":
    "Cambió la velocidad que toca: el automático lleva el motor solo. Mirá cómo se mueve la palanca.",
  "vuelo.paso.crucero":
    "Ya estamos arriba: gas de crucero, hasta la marca del motor. Así vamos a la velocidad de la marca rosa.",
  "vuelo.paso.crucero.sinVer": "Ya estamos arriba: gas de crucero, hasta la marca del motor.",
  "vuelo.paso.cruceroConAutomatico":
    "Ya estamos arriba: gas de crucero, hasta la marca del motor. Y si querés, poné el piloto automático: es el botón que late.",
  "vuelo.paso.cruceroConGases":
    "Ya estamos arriba. El automático pone el gas de crucero: mirá cómo la palanca va sola a la marca del motor.",
  "vuelo.paso.bajar":
    "Empezamos a bajar: menos gas, y bajamos despacito hasta la raya de la altura.",
  "vuelo.paso.bajarConAutomatico":
    "Empezamos a bajar. El automático baja por la senda hasta la raya de la altura: vos mirá que la velocidad siga en la marca rosa.",
  "vuelo.paso.nivelar":
    "Llegamos a la raya de la altura: nos quedamos acá, nivelados, hasta que la senda nos venga a buscar.",
  "vuelo.paso.nivelar.sinVer":
    "Llegamos a la altura que toca: nos quedamos acá, nivelados, hasta que la senda nos venga a buscar.",
  "vuelo.paso.flaps1": "Los primeros flaps, una muesca, y a la marca rosa de la velocidad.",
  "vuelo.paso.flaps2": "Otra muesca de flaps, y a la marca rosa de la velocidad.",
  "vuelo.paso.flaps3": "Los flaps de aterrizar, abajo del todo, y a la marca rosa de la velocidad.",
  "vuelo.paso.tren": "Sacá el tren, que ya vamos a aterrizar.",
  "vuelo.paso.recogerAerofrenos": "Ya vamos a la marca rosa de la velocidad: aerofrenos adentro.",
  "vuelo.paso.recogerAerofrenos.sinVer":
    "Ya vamos a la velocidad que toca: aerofrenos adentro.",
  "vuelo.paso.senda":
    "Ya estamos en la final: la nariz por la senda, y la velocidad en la marca rosa.",
  "vuelo.paso.senda.sinVer": "Ya estamos en la final: la nariz por la senda.",
  /*
   * Y en la final de Guyrami, **quién lleva el gas**: el avión que lleva gases
   * automáticos los usa; en el que no, lo lleva la instructora, que es una
   * ayuda del peldaño y no del avión. Ver `sostenerLaVelocidadDeLaFinal` en
   * `game.ts`.
   */
  "vuelo.paso.sendaConGases":
    "Ya estamos en la final. El avión lleva el motor, para ir a la marca rosa de la velocidad: vos llevá la nariz por la senda.",
  "vuelo.paso.sendaConGases.sinVer":
    "Ya estamos en la final. El avión lleva el motor: vos llevá la nariz por la senda.",
  "vuelo.paso.sendaConAyuda":
    "Ya estamos en la final. Yo te llevo el motor, para ir a la marca rosa de la velocidad: vos llevá la nariz por la senda.",
  "vuelo.paso.sendaConAyuda.sinVer":
    "Ya estamos en la final. Yo te llevo el motor: vos llevá la nariz por la senda.",
  "vuelo.paso.gasTuyo": "Tocaste el motor: ahora la velocidad la llevás vos, hasta la marca rosa.",
  "vuelo.paso.gasTuyo.sinVer": "Tocaste el motor: ahora la velocidad la llevás vos.",
  /*
   * **Y el número de la marca, dicho en el peldaño de las cifras** (punto
   * 115), detrás del paso de velocidad que lo pide: una frase entera por
   * cifra, montada con su hueco como las alturas de la torre. Las cifras que
   * se graban son las que el juego puede pedir: ver
   * `flight/velocidad-dicha.ts`.
   */
  "vuelo.paso.velocidad": "Son {n} kilómetros por hora.",
  "palabra.crucero": "Crucero",
  "palabra.nivela": "Nivelá",
  "palabra.laSenda": "La senda",
  /*
   * **La cota de la pista, empezada la bajada**: «¿cuánto tengo que bajar?».
   * Sin el número, para que valga en cualquier campo: el número va debajo de
   * la cinta de altitud y en la tarjeta.
   */
  "vuelo.paso.cotaAlMar":
    "La pista a la que vamos está casi a nivel del mar: lo que marca el altímetro es casi todo lo que nos queda por bajar.",
  "vuelo.paso.cotaEnAlto":
    "La pista a la que vamos está más alta que el mar: lo que nos queda por bajar es lo que marca el altímetro menos la cifra de la pista, la de abajo de la altura.",
  "palabra.pista": "Pista",
  "palabra.asi": "Así",
  "palabra.aerofrenosAdentro": "Aerofrenos adentro",
  // Lo que dice el dibujo de quién lleva el gas, para quien no lo ve.
  "hud.gasDelAvion": "El avión lleva el motor",
  "hud.gasDeLaAyuda": "La instructora lleva el motor",
  "vuelo.bulto": "Por ahí no se pasa: hay un edificio",
  // El final del vuelo. Ninguno es un reproche: ver flight/reconocimiento.ts.
  // La fila de avioncitos de la pantalla de fin: media hora cada uno.
  /*
   * ── El menú de pausa ────────────────────────────────────────────────────
   *
   * Tres puertas y ninguna palabra obligatoria: los dibujos ya las cuentan.
   * El texto aparece solo en los peldaños que leen, como en todas partes.
   */
  "pausa.titulo": "El vuelo está parado",
  "pausa.seguir": "Seguir volando",
  "pausa.reiniciar": "Empezar de nuevo",
  "pausa.hangar": "Volver al hangar",
  "hud.pausa": "Parar el juego",
  // El botón ⏩ de la escena de pasaje: solo icono; esto es para quien no ve la pantalla.
  "hud.adelantar": "Adelantar el viaje",
  "hud.camara": "Cambiar de vista",
  "hud.gafas": "Gafas de sol",
  /* El tirador del cuadro de mandos. Lo pidió quien juega: «un botón para
     bajarlo o volver a mostrarlo». */
  /* El cartel de la pantalla de pie: el dibujo lo dice todo, esto acompaña.
     Ver `.gira` en style.css. */
  "hud.gira": "Girá la pantalla",
  "hud.bajarCuadro": "Bajar el tablero",
  /*
   * **La lista antes de aterrizar**, en la tarjeta: armar los aerofrenos y
   * el autofreno. Son rótulos y no se dicen todavía: la voz está pendiente
   * de grabar. Ver PENDIENTE-VOCES-aterrizaje.md y
   * `flight/palanca-de-aerofrenos.ts`.
   */
  "hud.armaAerofrenos": "Armá los aerofrenos y el autofreno",
  "hud.aerofrenosArmados": "Aerofrenos y autofreno armados: los armé yo",
  "hud.pilotoAutomatico": "Piloto automático",
  /*
   * El compensador. Solo lo lee un lector de pantalla: en la pantalla hay una
   * aguja y el rótulo «TRIM», que es lo que pone en la cabina y no se
   * traduce. Ver la regla 3 de AGENTS.md.
   */
  "hud.trimArriba": "Compensador, morro arriba",
  "hud.trimAbajo": "Compensador, morro abajo",

  /*
   * El aviso de versión nueva. Corto porque es un botón pequeño en una
   * esquina, y con la flecha circular al lado, que es lo que se entiende sin
   * leer. Ver `avisarDeLaVersionNueva` en `main.ts`.
   */
  "version.nueva": "Hay una versión nueva",

  /*
   * Cuando se pide cambiar de avión y no hay otro que quepa en esta pista.
   * Una tecla que no hace nada se aprieta más fuerte; ésta contesta, y lo que
   * contesta es la lección: manda la pista. Ver `cycleAircraft`.
   */
  "avion.noCabeAqui": "En esta pista no cabe otro avión",
  /*
   * Cambiar de avión es empezar un vuelo con otro, y eso se hace en tierra y
   * parado, como en cualquier aeropuerto. Ver `cycleAircraft`.
   */
  "avion.cambiarParado": "Para cambiar de avión, pará en tierra",
  "hud.mandarCinturon": "Cartel del cinturón",
  "hud.subirCuadro": "Subir el tablero",
  // El cuadro del teléfono: cada losa pone grande su pantalla, y las dos
  // teclas de la ventanilla ALT. Ver ui/cuadro-telefono.ts.
  "hud.telGrande": "Ver la pantalla en grande",
  "hud.altBajar": "Bajar la altura pedida",
  "hud.altSubir": "Subir la altura pedida",
  /*
   * El botón de los cuatro puntos que recoge los demás en el teléfono, y el
   * de la pantalla completa que va dentro. Solo los lee un lector de
   * pantalla: en la pantalla son dibujos. Ver `ui/pantalla-completa.ts`.
   */
  "hud.volumen": "Volumen",
  "hud.menu": "Más botones",
  "hud.pantallaCompleta": "Pantalla completa",
  "hud.salirPantallaCompleta": "Salir de pantalla completa",
  /*
   * En el iPhone la pantalla completa no se pide: se consigue abriendo el
   * juego desde su ícono. «Agregar a inicio» es como lo dice el iPhone en
   * español de Latinoamérica, que es lo que va a leer quien lo busque. Ver
   * `ui/anadir-a-inicio.ts`.
   */
  "inicio.pasos":
    "Para jugar a pantalla completa: tocá Compartir y después «Agregar a inicio».",
  "inicio.cerrar": "Cerrar",
  /*
   * **Las teclas que tocan**: la tecla que pide el paso, en un lado. No se
   * dicen: se leen, y en el peldaño que no lee queda solo el visto. Ver
   * `ui/teclas-que-tocan.ts`.
   */
  "teclas.queTocan": "La tecla que toca",
  "teclas.yaMeLoAprendi": "Ya me lo aprendí",
  "teclas.yaLaSe": "Ya la sé",
  "ajustes.teclasQueTocan": "Las teclas que ya te aprendiste no salen más.",
  "ajustes.teclasQueTocan.volver": "Volver a mostrarlas",
  "ajustes.inicio":
    "En el iPhone, el juego va a pantalla completa abierto desde su ícono: en Safari tocá Compartir (o «•••» y Compartir), elegí «Agregar a inicio» y abrilo desde ahí.",
  "gafas.ganadas": "¡Tus gafas de sol!",
  "gafas.puestas": "Gafas puestas",
  "gafas.quitadas": "Gafas quitadas",
  "fin.horas": "Lo que llevás volado",
  "fin.llegaste": "¡Llegaste! Ya estás en casa",
  "fin.bien": "¡Buen vuelo!",
  "fin.muyBien": "¡Gran vuelo!",
  "fin.otra": "Otro vuelo",
  "fin.redondo": "¡Vuelo redondo! No se puede hacer mejor",
  "vuelo.aterrizado": "Frená",
  "vuelo.abandonando": "Salí de la pista, que viene otro",
  /*
   * Y en la pista de casa, sin apuro: ahí no viene nadie detrás. Con quien
   * te sale a buscar, si sale. Ver `guionSinTorre`.
   */
  "vuelo.abandonandoSinPrisa": "Sin apuro: salí de la pista y volvé a casa",
  "vuelo.abandonandoConLaBici":
    "Sin apuro: salí de la pista y seguí a Jazlyn, que vino a buscarte en bici",
  // Y en una pista pública sin torre, que no es casa: Ayolas.
  "vuelo.abandonandoSinTorre": "Sin apuro: salí de la pista y andá a la plataforma",
  "vuelo.pistaLibre": "¡Pista libre! Bien hecho",
  "vuelo.aPlataforma": "Volvé a tu lugar",
  "vuelo.enPuesto": "Llegaste. Apagá el motor",
  /*
   * **La seña de cortar motores, sola.** «Llegaste» va después de apagar: en
   * el orden de la OACI primero se corta y luego se termina. Solo con su
   * grabación; sin ella, la de arriba. Ver el oyente de `gestoDelSenalero`.
   */
  "vuelo.cortaMotores": "Te hace la seña de cortar: apagá el motor",
  "vuelo.apagado": "¡Vuelo terminado!",
  "vuelo.fuera": "Volvé a la raya verde",
  "vuelo.roto": "Se rompió. Volvemos a empezar",
  "vuelo.rapido": "Vas muy rápido",
  "vuelo.sobrevelocidad": "Muy rápido: bajá el motor",
  "vuelo.sobrevelocidadAire": "Muy rápido para esta altura",
  /*
   * **Y los dos límites de lo que llevás sacado.**
   *
   * No son el de la estructura: un tren y unos flaps aguantan mucho menos que
   * el fuselaje, y por eso se recogen antes de acelerar. Dicen qué recoger,
   * que es lo accionable — «vas muy rápido» a secas deja a quien lo oye sin
   * saber qué tocar.
   */
  "vuelo.trenPasado": "Muy rápido con el tren fuera: metélo",
  "vuelo.flapsPasados": "Muy rápido con los flaps: recogélos",
  "vuelo.pediFlaps": "Bajá los flaps para frenar",
  "palabra.flaps": "Flaps",
  /*
   * **Lo que les pasa a los flaps por pasarse**, que es distinto en cada
   * avión: el reactor se protege solo y la avioneta se lleva el golpe. Ver
   * `flight/carga-de-flaps.ts`. Con calma las dos: no es una emergencia, es
   * una consecuencia.
   */
  "vuelo.alivioDeFlaps":
    "Los flaps subieron un punto solos: el avión los cuida porque vamos rápido. Bajá la velocidad y vuelven.",
  "vuelo.flapsTocados":
    "Nos pasamos de velocidad con los flaps y quedaron tocados: ya no bajan más del primer punto. En tierra los revisa el mecánico.",
  /*
   * **Y los flaps después de tocar**: arriba al dejar la pista, no en la
   * carrera. Ver `flight/despues-de-aterrizar.ts`. La lista de después del
   * aterrizaje es la del peldaño de cabina, y dice qué es de cada uno: los
   * flaps los sube quien vuela, y lo demás lo hace quien va al lado.
   */
  "vuelo.flapsEnLaCarrera":
    "Los flaps, mejor al salir de la pista: corriendo por la pista se puede tocar el tren sin querer.",
  "vuelo.flapsArribaAlSalir": "Ya salimos de la pista: ahora sí, subí los flaps.",
  "vuelo.despuesDelAterrizaje":
    "Lista de después del aterrizaje: los flaps arriba son tuyos; las luces y el transpondedor los hago yo.",
  "vuelo.alPuestoConFlaps":
    "Llegamos al puesto con los flaps fuera. No pasa nada: la próxima, subílos al dejar la pista.",
  /*
   * **Y la lista de después del aterrizaje, punto por punto**: lo que tiene
   * tecla lo pide la instructora y lo hace quien vuela; las luces y el
   * transpondedor los hace ella y lo dice al hacerlo. Uno detrás de otro, cada
   * uno hecho antes de pedir el siguiente. Ver `ListaDeDespuesDeAterrizar` en
   * `flight/despues-de-aterrizar.ts`.
   */
  "vuelo.despues.aerofrenos": "Los aerofrenos, adentro: bajá la palanca.",
  "vuelo.despues.luces": "Las luces las hago yo: apago las de aterrizaje y dejo la de rodaje.",
  "vuelo.despues.transpondedor": "Y el transpondedor: pongo el TCAS en espera.",
  "palabra.luces": "Luces",
  "palabra.transpondedor": "Transpondedor",
  "vuelo.meteElTren": "Metélo, el tren te frena",
  /*
   * **El aterrizaje de un reactor, contado**: la lista de los aerofrenos y el
   * autofreno —pedirla y, en los peldaños de abajo, armarlos ella—, los
   * paneles que salen al tocar o que no salen por no estar armados, la
   * reversa que ya no frena y el autofreno que se suelta con el pie. Detrás de
   * la llamada de cabina cuando la hay, nunca a la vez. Ver
   * `atenderALaListaDeAterrizaje` y `contarLaCarrera` en `game.ts`.
   */
  "vuelo.armaLosAerofrenos":
    "Antes de aterrizar, armá los aerofrenos y el autofreno: al tocar salen solos y frenamos bien",
  "vuelo.losArmeYo": "Los aerofrenos y el autofreno los armé yo, para frenar bien al tocar",
  "vuelo.salenLosFrenosDeTierra":
    "¿Viste? Al tocar se levantaron los paneles del ala: el ala deja de sostener el avión y las ruedas frenan",
  "vuelo.sinFrenosDeTierra":
    "No salieron los aerofrenos porque no estaban armados: frená con calma, que al principio las ruedas casi no cargan",
  "vuelo.quitaLaReversa": "Ya vamos despacio: quitá la reversa",
  "vuelo.autofrenoSuelto": "Pisaste el freno: el autofreno se soltó y ahora frenás vos",
  /*
   * **Y es una tormenta, no lluvia.** Solo se avisa de las células de núcleo
   * rojo —ver `seRodea`—, que son las de tormenta: la lluvia floja se cruza y
   * no se nombra. Decir «lluvia» aquí enseñaba justo lo que no es.
   */
  "vuelo.tormenta": "Hay una tormenta delante: rodeála, no la cruces",
  "palabra.tormenta": "Tormenta",
  /*
   * Los baches del aire, sin avión de pasaje: lo dice la instructora. Lo que
   * se dice es lo verdadero y lo tranquilo —es el aire, el avión está hecho
   * para esto— porque para muchos será la primera turbulencia que sientan.
   * Ver `hablarDeLosBaches` en `game.ts`.
   */
  "vuelo.baches":
    "Se mueve un poco: son baches del aire, como las olas en el agua. El avión está hecho para esto. Seguí volando con calma.",
  /*
   * Y el aviso de otro avión por radio, contado en los dos peldaños de abajo
   * detrás de la radio, que va en inglés: lo que se oyó y para qué sirve.
   * Solo con su grabación. Ver `contarElPirep` en `game.ts`.
   */
  "vuelo.pirep":
    "¿Escuchaste la radio? Otro avión avisó que más adelante se mueve. Los aviones se ayudan entre ellos: así la comandante puede avisar antes.",
  /*
   * El combustible, en sus dos escalones. El primero no es una emergencia y
   * no se escribe como tal: entrar en la reserva es el momento de decidir, y
   * decidir bien pide calma. El segundo ya no pide decidir: pide planear.
   */
  /*
   * Y la reserva ya no manda a buscar: el alternativo se eligió en tierra y
   * la flecha se va sola al campo más cercano. Lo que queda es ir, con calma.
   */
  "vuelo.reserva":
    "Entraste en la reserva. Con calma: vamos al aeropuerto más cercano, seguí la flecha",
  /*
   * Y la reserva cuando el más cercano es el destino, o ya se está llegando:
   * se aterriza aquí. Y el «minimum fuel» de Taguató, contado como lo que es:
   * no es una emergencia, es avisar de que no se puede esperar (OACI, Anexo 6,
   * parte I, 4.3.7.2.2). Ver `quemarCombustible` y `declararCombustibleMinimo`.
   */
  "vuelo.reservaAqui":
    "Entramos en la reserva, pero tenemos de sobra para llegar: aterrizamos acá.",
  "vuelo.reservaMinimo":
    "Nos queda justo, así que avisamos a la torre: combustible mínimo. No es una emergencia: es avisarle que no podemos esperar.",
  "palabra.reserva": "Combustible",
  "vuelo.sinCombustible": "Se acabó el combustible: planeá hasta la pista",
  "palabra.sinCombustible": "Sin combustible",
  /*
   * Sin motor en el aire es otro vuelo, y lo dice con calma: la frase que se
   * dice en un fallo de motor de verdad, en primera persona del plural porque
   * es de las que se hacen juntos. Ver `flight/sin-motor.ts`.
   */
  "vuelo.sinMotor":
    "No tenemos motor: bajamos la nariz, mantenemos esta velocidad y vamos a esa pista",
  "palabra.planea": "Planeá",
  // Y la velocidad sin motor sale de la nariz, nunca del gas: no hay gas.
  "vuelo.planeoLento": "Vamos lentos: bajá un poco la nariz",
  "vuelo.planeoRapido":
    "Vamos rápidos: levantá un poco la nariz, que así llegamos más lejos",
  /*
   * **Lo que el aire enseña por el camino** (#89), en el momento en que se ve y
   * una vez: el frío al pasar por cero grados, el aire fino al llegar al
   * crucero, y en los presurizados la cabina que sube y baja. Cortas, con
   * gracia y sin sermón. Ver `flight/lecciones-del-aire.ts`.
   */
  "vuelo.aire.frio":
    "Afuera ya hace cero grados. Cada mil metros que subimos, unos seis grados y medio menos: allá arriba hace como cincuenta bajo cero.",
  "palabra.frio": "Frío",
  "vuelo.aire.crucero":
    "Ya estamos en crucero. Acá arriba el aire es finito: el avión frena menos y gasta menos combustible. Por eso los aviones vuelan tan alto.",
  "vuelo.aire.cruceroConCifras":
    "Mirá la velocidad: el reloj marca menos de lo que vamos de verdad, porque acá arriba el aire es finito. Y con menos aire se frena menos y se gasta menos: por eso los aviones vuelan tan alto.",
  "vuelo.aire.bolsa":
    "La cabina también sube, pero despacito: ahora va como a mil quinientos metros, aunque el avión esté mucho más alto. Por eso una bolsa de papitas cerrada abajo, acá arriba se infla.",
  "vuelo.aire.oidos":
    "Empezamos a bajar, y la cabina también baja. Si se te tapan los oídos, tragá saliva o bostezá, que se destapan. Y una botella cerrada allá arriba, abajo llega aplastada.",
  /*
   * **La cabina sin aire, y el descenso de emergencia**, como procedimiento y
   * sin drama: qué pasó, qué se hace y por qué la máscara primero, con el
   * número de la tabla. Ver `flight/despresurizacion.ts`.
   */
  "vuelo.cabinaSinPresion":
    "Se fue la presión de la cabina. Con calma: primero la máscara, y bajamos rápido a donde se respira. Gas al mínimo, aerofrenos afuera y nariz abajo.",
  "vuelo.cabinaSinPresionConTren":
    "Se fue la presión de la cabina. Con calma: primero la máscara, y bajamos rápido a donde se respira. Gas al mínimo, tren afuera y nariz abajo.",
  "palabra.mascara": "Máscara",
  "palabra.descensoDeEmergencia": "Descenso de emergencia",
  "vuelo.primeroLaTuya.segundos":
    "Cayeron las máscaras. Primero la tuya, porque a esta altura, sin oxígeno, quedan unos segundos para pensar bien: medio minuto o menos. Con la tuya puesta, ya podés ayudar.",
  "vuelo.primeroLaTuya.minuto":
    "Cayeron las máscaras. Primero la tuya, porque a esta altura, sin oxígeno, queda más o menos un minuto para pensar bien. Con la tuya puesta, ya podés ayudar.",
  "vuelo.primeroLaTuya.minutos":
    "Cayeron las máscaras. Primero la tuya, porque a esta altura, sin oxígeno, quedan unos pocos minutos para pensar bien. Con la tuya puesta, ya podés ayudar.",
  "vuelo.yaSeRespira":
    "Muy bien: acá ya se respira. Nivelamos y vamos al aeropuerto más cercano, con calma. Así lo practican los pilotos de verdad.",
  "palabra.yaSeRespira": "Ya se respira",
  // El nombre del ejercicio, para el selector de ejercicios del hangar.
  "hangar.ejercicio.despresurizacion": "Despresurización",
  /*
   * La otra cabecera: primero la pista en uso, con el porqué, y si se sigue,
   * la orden. Ver `flight/la-otra-cabecera.ts`.
   */
  "vuelo.laOtraPunta":
    "Esa no es la pista en uso: hoy el viento manda entrar por la otra punta",
  "palabra.otraPunta": "La otra punta",
  /*
   * Pasarse la salida y seguir hasta la próxima: lo que dice la torre como
   * «vacate next available», contado en casa. Ver `decirSalPorLaSiguiente`.
   */
  "vuelo.salidaSiguiente":
    "Te pasaste la salida. No pasa nada: seguí por la pista hasta la próxima",
  "palabra.salidaSiguiente": "La próxima",
  /*
   * Darle paso a uno que viene de frente por la calle de tu raya: la raya se
   * corta antes de esa calle y se espera ahí. Lo que diría el control de
   * tierra —«give way»—, contado en casa. Ver `decirQueDasPaso`.
   */
  "vuelo.dasPaso":
    "Paramos acá: por esa calle viene otro avión de frente, y por una calle pasa uno por vez. Lo dejamos pasar y seguimos",
  /*
   * «Caliente y alto», antes de despegar y solo cuando pesa: la voz lo dice
   * sin números y la tarjeta los pone. Dice **pista para despegar** y no
   * que la pista se alargue, que es lo que se entendería: lo que se alarga
   * es la carrera. Ver `flight/caliente-y-alto.ts`.
   */
  "vuelo.calor": "Hace calor: vamos a necesitar más pista para despegar",
  "calor.tarjeta":
    "Hace calor, {grados} °C: para despegar hace falta un {mas} % más de pista",
  "calor.tarjetaCabina":
    "{grados} °C, altitud de densidad {pies} ft: un {mas} % más de carrera",
  /*
   * La matrícula, presentada al empezar: la torre te llama así. Se monta con
   * las piezas del alfabeto; ver `presentarLaMatricula` en `game.ts`.
   */
  "vuelo.nuestroAvion": "Nuestro avión es {indicativo}. Así nos llama la torre",
  "vuelo.alAireOtraPunta": "Por esa punta no: andate al aire y volvé por la otra",
  "vuelo.alAireVientoDeCola":
    "Con viento de cola no frenás a tiempo: andate al aire y volvé por la otra punta",
  "vuelo.sacaElTren": "Sacá el tren",
  "vuelo.trenEnElSuelo": "Con el avión en el suelo, el tren no se mete",
  "palabra.tren": "Tren",
  "palabra.aerofrenos": "Aerofrenos",
  "vuelo.despacio": "Más despacio",
  // El «alto» del señalero: dice dónde se para, y la tarjeta lleva al lado la
  // tecla del freno. Sin eso, el gesto dice qué pero no cómo.
  "vuelo.alto": "Pará acá",
  /*
   * **Y qué quiere decir cada seña del señalero**, contado en los tres
   * peldaños de abajo detrás de la seña: las de la OACI (Anexo 2, apéndice
   * 1), que son las que se van a ver en cualquier plataforma del mundo. Arriba
   * la seña basta. Solo con su grabación.
   */
  "senalero.alto": "Cruzó los bastones arriba: eso es parar",
  "senalero.frenos": "Levanta la mano y cierra el puño: poné el freno",
  "senalero.calzos": "Junta los bastones arriba: ya puso los calzos en las ruedas",
  "vuelo.teLoPasaste": "Te pasaste. Frená y volvé",
  "vuelo.yaPodesTocar": "Ya podés tocar",
  /*
   * Lo único que se dice en la recogida: ahí ya no hay velocidad que
   * corregir, y llegar con gas hace flotar el avión y se come la pista. Y la
   * nariz, que es la otra mitad: quitar el gas sin recoger es tocar con toda
   * la bajada de la senda. A la altura de cada clase de avión: ver
   * `acompanarLaRecogida` y `flight/recogida.ts`.
   */
  "vuelo.quitaElGas": "Quitá el gas",
  "palabra.sinGas": "Sin gas",
  "vuelo.narizEnLaRecogida": "La nariz un poquito arriba",
  "vuelo.narizYQuitaElGas": "La nariz un poquito arriba, y quitá el gas",
  "palabra.narizYSinGas": "Nariz arriba, sin gas",
  "percance.coche": "Le pasaste por encima al coche",
  "percance.edificio": "Chocaste con un edificio",
  "percance.fuera": "Tocaste tierra fuera de la pista",
  "percance.golpe": "Llegaste dando un golpe",
  "percance.pasada": "Te pasaste del final de la pista",
  "percance.sinpermiso": "Entraste en la pista sin la luz verde",
  "percance.sintren": "Tocaste tierra sin sacar el tren",
  "grado.aprendiz": "Aprendiz",
  "grado.piloto": "Piloto",
  "grado.comandante": "Comandante",
  "grado.instructora": "Instructora",
  "cuaderno.title": "Mi cuaderno de vuelo",
  "cuaderno.horas": "horas",
  "cuaderno.despegues": "despegues",
  "cuaderno.aterrizajes": "aterrizajes",
  "cuaderno.frustradas": "frustradas",
  "cuaderno.aerodromos": "aeródromos",
  "cuaderno.falta": "Para {grado} te falta:",
  "cuaderno.completo": "¡Ya está todo! A seguir volando",
  "cuaderno.vuelos": "Tus vuelos",
  /*
   * Los sellos de campo, uno por aeródromo: dónde se estuvo. «Tus sellos» es
   * ahora el álbum de los sellos con nombre. Ver `ui/album.ts`.
   */
  "cuaderno.sellos": "Dónde estuviste",
  "cuaderno.album": "Tus sellos",
  "cuaderno.grados": "Los grados",
  "cuaderno.queEs": "¿Qué es esto?",
  "cuaderno.sinInstructora": "Volar sin instructora",
  "cuaderno.sinInstructoraPuesta": "Volás sin instructora porque ya sabés cuidarte.",
  "cuaderno.sinInstructoraQuitada": "La instructora vuela con vos.",
  "cuaderno.sinInstructoraFalta": "Para volar sin instructora te falta:",
  "sinInstructora.si": "Sí, sin instructora",
  "sinInstructora.no": "No, con instructora",
  "vuelo.sinInstructora.pregunta": "Hoy volás sin mí. ¿Lo querés así?",
  "vuelo.sinInstructora.si": "Dale. Si hay peligro, te aviso.",
  "vuelo.sinInstructora.no": "Bueno: hoy te acompaño.",
  // Se dice una vez y sin regañar. Lo que hay que aprender no es que el juego
  // te lo impida: es que en un aeropuerto de verdad ahí puede venir otro.
  "vuelo.sinPermiso": "Entraste sin la luz verde. La próxima, esperala",

  "hangar.pais.py": "Paraguay",
  "hangar.pais.es": "España",
  "hangar.pais.inventado": "Inventados",
  "hangar.tramos": "Aprender a volar",
  "hangar.misiones": "Ir a algún lado",
  /*
   * **De dónde se sale y a dónde se va, que son dos preguntas.** La primera
   * era «¿A dónde volamos?» y contestaba el sitio de salida; cuando entró la
   * de destino, las dos decían lo mismo con otras palabras.
   */
  "hangar.donde": "¿Desde dónde salís?",
  "hangar.adonde": "¿A dónde vas?",
  "hangar.vuelta": "Vuelta al campo",
  "hangar.combustible": "Combustible",
  // No «¿Con quién?»: eso hacía que los cuatro tramos se leyeran como cuatro
  // modelos de avión, que es exactamente la confusión de la que avisa
  // `tiers.ts`. Un tramo no es una aeronave, son tus galones.
  /*
   * **Por qué este avión no se puede elegir aquí.**
   *
   * No sale en pantalla: el dibujo ya lo dice —el avión sobresaliendo por los
   * dos extremos de la pista— y quien juega no lee. Esto es para el lector de
   * pantalla, que es el único canal que le queda a quien no ve el dibujo.
   */
  "hangar.nocabe.corta": "la pista es muy corta para este avión",
  "hangar.nocabe.estrecha": "la pista es muy angosta para sus alas",
  "hangar.nocabe.no-da-la-vuelta": "no puede dar la vuelta en esta pista",
  "hangar.nocabe.bomberos": "los bomberos de este aeropuerto no alcanzan para este avión",
  /*
   * **Y la cuenta, que esta sí sale**: en la ficha de un destino al que el
   * avión no llega, debajo del dibujo, para quien lee. Lo que pide el avión y
   * lo que tiene la pista, en metros, que es como lo pone un manual de vuelo.
   */
  "hangar.nocabe.largo": "pide {pide} m · hay {hay} m",
  "hangar.nocabe.ancho": "pide {pide} m de ancho · hay {hay} m",
  /*
   * Y la de los bomberos, desde el peldaño de las cifras: la categoría del
   * aeropuerto y la más baja que acepta el avión. Ver `flight/bomberos.ts`.
   */
  "hangar.nocabe.categoria": "categoría {hay} · pide {pide}",
  // Para el lector de pantalla: tocar la ficha cambia de avión y va allí.
  "hangar.nocabe.con": "Tocá para ir con el {avion}",
  "hangar.conque": "¿Con qué volás?",
  "hangar.como": "¿Qué piloto sos?",
  "hangar.despegar": "¡Despegar!",
  "pie.hecho": "Hecho en Capiibary, Paraguay.",
  "pie.oksigenia": "Desarrollado por Oksigenia",
  "pie.codigo": "Código fuente",
  "pie.promesa": "Sin cuentas ni permisos: abrís y volás.",
  "hangar.volver": "Elegir otro sitio",
  "mapa.title": "Ver el mapa",
  "mapa.cerca": "Ver más de cerca",
  "mapa.lejos": "Ver más lejos",
  "tiempo.title": "El tiempo",
  "tiempo.hora": "La hora del día",
  "tiempo.viento": "De dónde viene el viento y cuánto sopla",
  "tiempo.calma": "Sin viento",
  "tiempo.real": "El tiempo de ahora mismo",
  "tiempo.nubes": "Las nubes",
  "mundo.label": "Cómo se ve el mundo",
  "mundo.foto": "El mundo de verdad, en foto",
  "mundo.dibujado": "El mundo dibujado",
  "tiempo.despejado": "Cielo despejado",
  "tiempo.algunas": "Algunas nubes",
  "tiempo.cubierto": "Cielo cubierto",
  "hangar.aque": "¿A qué jugás?",
  "hangar.seguimos": "¿Seguimos donde lo dejaste?",
  "hangar.ajustes": "Ajustes",
  "hangar.atras": "Volver",
  "hangar.proximamente": "Próximamente",
  "hangar.reposo": "Si nadie juega, vuelve acá",
  "leccion.vuelta": "Dar una vuelta",
  "leccion.rodaje": "Rodar",
  "leccion.despegue": "Despegar",
  "leccion.aterrizaje": "Aterrizar",

  /*
   * ── **Practicar emergencias** ───────────────────────────────────────────
   *
   * Son procedimientos, no espectáculo: lo que hace un piloto de línea cada
   * seis meses en un simulador. Se eligen en el hangar y la instructora los
   * presenta antes con calma —qué va a pasar y qué se hace—, y los comenta
   * después. Nadie se hace daño: si sale mal, sale mal el ejercicio y se
   * repite. Ver `flight/ejercicios.ts` y el ADR 0014.
   *
   * Todo en plural, como `vuelo.sinMotor`: son cosas que se hacen juntos.
   */
  "hangar.emergencias": "Practicar emergencias",
  "hangar.ejercicio.planeo": "Planear sin motor",
  "hangar.ejercicio.antes-de-v1": "Motor antes de V1",
  "hangar.ejercicio.despues-de-v1": "Motor después de V1",
  "hangar.ejercicio.un-motor": "Volar con un motor",
  "hangar.ejercicio.simulador": "Sesión de simulador",
  "hangar.ejercicio.tormenta": "Rodear una tormenta",
  "ejercicio.planeo.antes":
    "Hoy practicamos el planeo. En un ratito el motor se va a parar, a propósito: bajamos la nariz, sostenemos la velocidad y llegamos planeando a la pista",
  "ejercicio.antes-de-v1.antes":
    "Hoy practicamos un despegue que se para. Antes de V1 va a fallar un motor: gas atrás, frenos, y paramos en la pista. Parar a tiempo también es ganar",
  "ejercicio.despues-de-v1.antes":
    "Hoy practicamos un motor que falla pasada V1. Ahí ya no queda pista para parar: seguimos volando con el otro motor y volvemos a aterrizar",
  "ejercicio.un-motor.antes":
    "Hoy practicamos volar con un motor. En un rato vamos a parar uno, y el avión sigue volando con el otro: pisamos el pedal del lado bueno, sostenemos la velocidad y aterrizamos",
  "ejercicio.simulador.antes":
    "Sesión de simulador: algo va a fallar, y no te digo qué ni cuándo. Volá el avión y hacé el procedimiento, como los pilotos de línea cada seis meses",
  /*
   * **Y la cabina sin aire**, que empieza ya arriba, en crucero: lo que pasa
   * después —el aviso, las máscaras, la bajada— lo cuentan las frases de
   * `vuelo.cabinaSinPresion` y las de las máscaras. Aquí solo qué va a pasar.
   */
  "ejercicio.despresurizacion.antes":
    "Hoy practicamos la cabina sin aire. En un ratito se va a ir la presión, a propósito: suena un aviso y caen las máscaras. Primero la máscara, y bajamos rápido hasta donde se respira. Es un procedimiento, y lo hacemos con calma",
  "palabra.practica": "Práctica",
  // Antes de V1: se para. La palabra corta es la de siempre, «¡Frená!».
  "ejercicio.paramos": "Falló un motor antes de V1: gas atrás y frenos, paramos",
  "ejercicio.seguimos": "Falló un motor, y ya pasamos V1: seguimos volando",
  "ejercicio.enVuelo": "Se paró un motor. El avión sigue volando con el otro",
  /*
   * **El pie del lado del motor bueno.** El avión tira hacia el parado, y se
   * sujeta pisando el otro pedal: «pie muerto, motor muerto», dicen los
   * manuales en inglés, porque el pie que no hace nada está del lado del
   * motor que no va.
   */
  "ejercicio.pieDerecho":
    "Se paró el izquierdo y el avión tira a la izquierda: pisá el pedal derecho",
  "ejercicio.pieIzquierdo":
    "Se paró el derecho y el avión tira a la derecha: pisá el pedal izquierdo",
  "palabra.pieDerecho": "Pie derecho",
  "palabra.pieIzquierdo": "Pie izquierdo",
  "ejercicio.velocidad":
    "Con la nariz, sostené esta velocidad. Con un motor se sube despacio, pero se sube",
  /*
   * **Y lo que hace la compañera con el motor parado**, según el avión: en el
   * bimotor de pistón la hélice se pone en bandera a mano y enseguida, que
   * con ella en molinete no sube; en el turbohélice ya se puso sola; en el
   * reactor no hay bandera y se le corta el combustible a los cuatrocientos
   * pies.
   */
  "ejercicio.bandera":
    "Pongo la hélice del motor parado en bandera: de canto al aire, frena mucho menos",
  "ejercicio.banderaSola":
    "La hélice del motor parado ya se puso sola en bandera. Le corto el combustible",
  "ejercicio.cortar":
    "Ya tenemos altura. Le corto el combustible al motor parado: queda asegurado",
  "ejercicio.declarar":
    "Avisamos a la torre con la palabra de emergencia y ponemos siete siete cero cero en el transpondedor. Así todos saben que volvemos, y nos dan prioridad",
  "ejercicio.bomberos":
    "¿Ves los camiones junto a la pista? Son los bomberos del aeropuerto. Esperan siempre que un avión vuelve con una emergencia: es lo normal",
  // Y donde su categoría da un camión solo: se cuenta el que se ve.
  "ejercicio.bomberosUno":
    "¿Ves el camión junto a la pista? Son los bomberos del aeropuerto. Esperan siempre que un avión vuelve con una emergencia: es lo normal",
  // La tarjeta de los bomberos en el peldaño de las cifras. Ver `ponerLosBomberos`.
  "palabra.bomberosCategoria": "Bomberos · categoría {n}",
  "ejercicio.bomberosFrenos":
    "Vienen los bomberos a mirar los frenos: frenar tan fuerte los calienta mucho. Es lo normal",
  // Y el cierre, que nunca es un reproche.
  "ejercicio.bien":
    "Ejercicio hecho: volaste el procedimiento como en un simulador de verdad",
  "ejercicio.bienDespresurizacion":
    "Ejercicio hecho: máscara primero, abajo rápido hasta donde se respira y al aeropuerto más cercano. Así lo practican los pilotos de línea en el simulador",
  "ejercicio.bienParado":
    "Paraste a tiempo y en la pista: eso es hacerlo bien. Renunciar a tiempo también es ganar",
  "ejercicio.paradoTrasV1":
    "Paraste, y te alcanzó la pista. Pasada V1 lo seguro es seguir volando, que el avión vuela con un motor. La próxima, seguimos",
  "ejercicio.seguidoAntesDeV1":
    "Volviste bien. Antes de V1 todavía queda pista, y lo seguro es parar. La próxima, paramos",
  "ejercicio.otraVez":
    "El ejercicio no salió esta vez. En el simulador se repite las veces que haga falta: vamos otra vez",
  "palabra.otraVez": "Otra vez",

  /*
   * ── **El ejercicio de la tormenta** ─────────────────────────────────────
   *
   * No es una emergencia: es no entrar en una nube de tormenta. Se rodea de
   * lejos —veinte millas del rojo del radar—, por el lado del viento; si se
   * entra, se cuenta con calma qué pasa y se repite; y un rayo que toca el
   * avión no le hace nada. Las fuentes, en `flight/practica-de-tormenta.ts`.
   *
   * La presentación, lo de dentro y el final, en los cuatro peldaños; lo demás,
   * en los tres de abajo, que en el de cabina lo dicen la radio y el radar.
   * Todo en calma: ver `PENDIENTE-VOCES-tormenta.md`.
   */
  "ejercicio.tormenta.antes":
    "Hoy volamos con una tormenta. ¿Ves esa nube enorme allá adelante, alta como una torre? Es una tormenta, y a una tormenta no se entra: la vamos a rodear de lejos, con calma",
  "ejercicio.tormenta.porQue":
    "Adentro de esa nube el aire sube y baja muy fuerte, llueve mucho y puede caer granizo. Por eso no se entra. Girá a la derecha, del lado de donde viene el viento, y dejala bien lejos",
  // Con los números: nombra el radar, así que solo con la carta a la vista.
  "ejercicio.tormenta.radar":
    "En el radar se ve: el rojo y el magenta son lo más fuerte, y ahí no se entra. A una tormenta así se la deja a veinte millas, unos treinta y siete kilómetros. Girá a la derecha, del lado del viento, lejos del yunque",
  "ejercicio.tormenta.avisamos":
    "Le avisamos al control que vamos a rodear la tormenta, y prendemos el cartel del cinturón: cerca de una tormenta el aire se mueve, y con el cinturón puesto un salto no te levanta del asiento",
  "ejercicio.tormenta.masDerecha":
    "Girá un poco más a la derecha: así todavía pasamos muy cerca de la tormenta",
  "ejercicio.tormenta.masIzquierda":
    "Girá un poco más a la izquierda: así todavía pasamos muy cerca de la tormenta",
  "ejercicio.tormenta.asiVa":
    "¡Así! Con este rumbo la dejamos lejos. Seguí derecho hasta que la tormenta quede atrás",
  "ejercicio.tormenta.rayoLejos":
    "¿Viste el destello adentro de la nube? Fue un rayo. Las tormentas tienen muchos, y desde lejos no nos hacen nada. Y si algún día un rayo toca un avión, tampoco: el avión está hecho para eso",
  "ejercicio.tormenta.adentro":
    "Entramos en la tormenta: por eso se sacude, llueve fuerte y suena el granizo. Con calma: cinturón puesto, alas derechas, y seguí derecho, que es el camino más corto para salir",
  "ejercicio.tormenta.rayoEnElAvion":
    "Nos tocó un rayo, y no pasa nada. Casi toda la electricidad corre por la chapa de afuera del avión y sigue de largo: está hecho para eso. A cada avión de línea le pasa una o dos veces por año",
  "ejercicio.tormenta.salimos":
    "Ya salimos. Así es adentro de una tormenta: sacude, llueve fuerte y graniza. Por eso no se entra: se la rodea de lejos. Vamos otra vez, desde el principio",
  "ejercicio.tormenta.bien":
    "¡Muy bien! Rodeaste la tormenta y la dejaste bien lejos, como hacen los pilotos de verdad. Ahora, de vuelta a casa",
  "ejercicio.tormenta.bienCerca":
    "La rodeaste sin entrar: bien hecho. Pasamos un poco cerca: la próxima, más lejos todavía, que de una tormenta así se pasa a veinte millas",
  // La palabra de cada tarjeta, en el peldaño de la palabra.
  "palabra.rodeala": "Rodeala",
  "palabra.masLejos": "Más lejos",
  "palabra.rayo": "Un rayo",
  "palabra.derecho": "Derecho",
  // Y la frase corta, con sus números, de Taguató para arriba.
  "tormenta.rotulo.rodearDerecha": "Rodeala por la derecha: a {n} {u} del rojo",
  "tormenta.rotulo.rodearIzquierda": "Rodeala por la izquierda: a {n} {u} del rojo",
  "tormenta.rotulo.masLejos": "Así pasás a {n} {u} del rojo: girá más",
  "tormenta.rotulo.asiVa": "¡Así! Pasás a {n} {u} del rojo",
  "tormenta.rotulo.rayoLejos": "Un rayo en la tormenta: de lejos no hace nada",
  "tormenta.rotulo.adentro": "Adentro: cinturón, alas derechas y seguí derecho",
  "tormenta.rotulo.rayoEnElAvion": "Un rayo tocó el avión: no pasa nada",
  "tormenta.rotulo.salimos": "Afuera. A una tormenta no se entra: otra vez",
  "tormenta.rotulo.bien": "¡Rodeada! Pasaste a {n} {u} del rojo",
  "tormenta.rotulo.bienCerca": "Rodeada a {n} {u} del rojo: la próxima, a {m} {u}",

  "tactil.palanca": "Palanca",
  "tactil.timon": "Pedales del timón",
  "tactil.motor": "Motor",
  /*
   * **La hoja de la instructora**: lo que se gana en cada vuelo, una fila por
   * parte con su visto. Las claves siguen llamándose `galon` porque así se
   * guardan en la bitácora de cada aparato; lo que dicen es lo que de verdad
   * se evalúa. El nombre entero sale en el final del vuelo desde el peldaño
   * de las cifras, la palabra corta en el de la palabra, y en Guyrami solo el
   * dibujo y el visto. Ver `ui/hoja.ts`.
   */
  "galon.manga": "La hoja de la instructora",
  "galon.aproximacion": "Aproximación estabilizada",
  "galon.toma": "Aterrizaje",
  "galon.aros": "Los aros",
  "galon.velocidad": "La velocidad",
  "galon.rodaje": "El rodaje",
  "galon.frustrada": "Frustrada cuando tocaba",
  "galon.aproximacion.corta": "Senda",
  "galon.toma.corta": "Toma",
  "galon.aros.corta": "Aros",
  "galon.velocidad.corta": "Velocidad",
  "galon.rodaje.corta": "Rodaje",
  "galon.frustrada.corta": "Frustrada",
  // Lo de antes de volar, en la línea de cada vuelo del cuaderno.
  "hoja.vuelta": "Vuelta al avión, entera",
  "hoja.vueltaAMedias": "Vuelta al avión, hasta la mitad",
  "hoja.enTierra": "Hoy te quedaste en tierra: bien decidido",
  "hoja.abortado": "Despegue abortado a tiempo: bien decidido",
  // Las barras de la manga, que son el grado. Ver `ui/manga.ts`.
  "manga.grado": "La manga de tu grado: {grado}",

  /*
   * **La tarjeta del avión**: la ficha, los puntos que se tocan y lo que
   * cuenta cada uno. Los rótulos de la ficha —WINGSPAN, MTOW, VREF— no están
   * aquí porque no se traducen; lo que se traduce es la glosa de debajo. Ver
   * `ui/tarjeta-del-avion.ts` y `ui/explicaciones-del-avion.ts`.
   */
  "tarjeta.abrir": "Ver el avión de cerca",
  "tarjeta.ficha.envergadura": "De punta a punta del ala",
  "tarjeta.ficha.largo": "De la nariz a la cola",
  "tarjeta.ficha.mtow": "Lo más que puede pesar para despegar",
  "tarjeta.ficha.crucero": "A qué velocidad viaja",
  "tarjeta.ficha.alcance": "Hasta dónde llega sin volver a cargar combustible",
  "tarjeta.ficha.techo": "Lo más alto que puede subir",
  "tarjeta.ficha.motores": "Cuántos motores lleva, y de qué clase",
  "tarjeta.ficha.plazas": "Cuántas personas caben, con quien pilota",
  "tarjeta.ficha.vref": "A qué velocidad cruza el umbral para aterrizar",
  "tarjeta.motor.piston": "de pistón",
  "tarjeta.motor.radial": "radial",
  "tarjeta.motor.turbohelice": "turbohélice",
  "tarjeta.motor.turbofan": "turbofán",
  "tarjeta.pieza.alerones": "Alerones",
  "tarjeta.pieza.profundidad": "Timón de profundidad",
  "tarjeta.pieza.timon": "Timón de dirección",
  "tarjeta.pieza.flaps": "Flaps",
  "tarjeta.pieza.aerofrenos": "Aerofrenos",
  "tarjeta.pieza.pitot": "Tubo pitot",
  "tarjeta.pieza.motor": "Motor",
  "tarjeta.pieza.tren": "Tren de aterrizaje",
  "tarjeta.pieza.luces": "Luces de navegación",
  "tarjeta.luz.navegacion": "Luces de navegación",
  "tarjeta.luz.baliza": "Baliza",
  "tarjeta.luz.estroboscopicas": "Destellos",
  "tarjeta.luz.aterrizaje": "Faros de aterrizaje",
  "tarjeta.tamano": "Comparar el tamaño",
  "tarjeta.tamano.colectivos": "De largo, como {n} colectivos en fila",
  "tarjeta.tamano.uno": "De largo, como un colectivo",
  "tarjeta.tamano.menos": "Más corto que un colectivo",
  "tarjeta.matricula.nombre": "Matrícula {matricula}",
  "tarjeta.pais.ZP": "Paraguay",
  "tarjeta.pais.EC": "España",
  /*
   * El nombre de los puntos que no tienen pieza propia en la tarjeta: el
   * título de su explicación cuando se abre por su id. Los demás usan el de
   * su pieza o su luz.
   */
  "tarjeta.corta.pitotMorro": "Tubos pitot",
  "tarjeta.corta.motorPiston": "Motor de pistón",
  "tarjeta.corta.motorRadial": "Motor radial",
  "tarjeta.corta.turbohelice": "Turbohélice",
  "tarjeta.corta.reactor": "Reactor",
  "tarjeta.corta.trenFijo": "Tren fijo",
  "tarjeta.corta.matricula": "Matrícula",
  "tarjeta.alerones":
    "Alerones. Cuando uno sube, el del otro lado baja: un ala sostiene más y la otra menos, y el avión se inclina para girar.",
  "tarjeta.profundidad":
    "Timón de profundidad. Sube o baja la cola, y con ella la nariz: si tirás de la palanca, la nariz sube.",
  "tarjeta.timon":
    "Timón de dirección. Lleva la cola a un lado y la nariz mira al otro. Se mueve con los pedales.",
  "tarjeta.flaps":
    "Flaps. Salen por detrás del ala y la hacen más curva y más grande: así sostiene al avión volando más despacio, para despegar y para aterrizar.",
  "tarjeta.aerofrenos":
    "Aerofrenos. Se levantan encima del ala, frenan y le quitan sustentación: para bajar sin acelerar y, al tocar la pista, para que las ruedas apoyen y frenen.",
  "tarjeta.pitot":
    "Tubo pitot. El aire entra de frente por la punta, y cuanto más rápido vuela el avión, más empuja. Así se mide la velocidad.",
  "tarjeta.pitotMorro":
    "Tubos pitot, a los dos lados de la nariz: uno para cada piloto. El aire entra de frente, y cuanto más rápido, más empuja. Así se mide la velocidad.",
  "tarjeta.motorPiston":
    "Motor y hélice. El motor hace girar la hélice; sus palas son alas chiquitas que empujan el aire hacia atrás y tiran del avión hacia adelante.",
  "tarjeta.motorRadial":
    "Motor radial. Sus cilindros van en círculo, como los rayos de una estrella, y hacen girar la hélice, que tira del avión.",
  "tarjeta.turbohelice":
    "Turbohélice. Adentro lleva una turbina, como la de un reactor, pero en vez de soplar hace girar la hélice.",
  "tarjeta.reactor":
    "Reactor. Traga aire por adelante, quema combustible y lo suelta por atrás muy rápido. El que más empuja es el ventilador grande de adelante.",
  "tarjeta.tren":
    "Tren de aterrizaje. Sale para aterrizar y se guarda después de despegar: guardado, el aire pasa mejor y el avión va más rápido.",
  "tarjeta.trenFijo":
    "Tren fijo. Va siempre afuera: es más sencillo y más liviano, aunque frena un poco al avión.",
  "tarjeta.luces":
    "Luces de navegación: roja en la punta izquierda, verde en la derecha y blanca en la cola. Si de noche ves la roja y la verde juntas, ese avión viene de frente.",
  "tarjeta.luzBaliza":
    "Baliza: la luz roja que parpadea. Se enciende antes de arrancar el motor y dice: este avión está vivo, no te acerques.",
  "tarjeta.luzEstrobos":
    "Destellos: luces blancas muy fuertes. Se encienden al entrar en la pista y en vuelo, para que los demás aviones te vean desde lejos.",
  "tarjeta.luzAterrizaje":
    "Faros de aterrizaje. Se encienden en la pista y por debajo de diez mil pies, donde hay más aviones y pájaros: así te ven.",
  "tarjeta.matricula":
    "La matrícula es la cédula del avión: no hay otro en el mundo que se llame igual. ZP quiere decir Paraguay; EC, España. Por radio se dice letra por letra.",

  /*
   * Y lo que dice la instructora al tocar cada punto: lo mismo, contado. Suena
   * en el vuelo y en el hangar, después del primer gesto. Ver
   * `audio/voz-del-hangar.ts`.
   */
  "tarjeta.voz.alerones":
    "Estos son los alerones. Cuando movés la palanca a un costado, uno sube y el otro baja, y el avión se inclina para girar.",
  "tarjeta.voz.profundidad":
    "Este es el timón de profundidad, en la cola. Si tirás de la palanca, la cola baja y la nariz sube.",
  "tarjeta.voz.timon":
    "Este es el timón de dirección. Con los pedales, la cola va para un lado y la nariz mira para el otro.",
  "tarjeta.voz.flaps":
    "Estos son los flaps. Al bajarlos, el ala se hace más curva y más grande, y sostiene al avión aunque vaya más despacio. Se usan para despegar y para aterrizar.",
  "tarjeta.voz.aerofrenos":
    "Estos son los aerofrenos. Se levantan encima del ala para frenar en el aire, y al tocar la pista, para que el avión apoye las ruedas y frene mejor.",
  "tarjeta.voz.pitot":
    "Este tubito es el pitot. El aire entra por la punta, y cuanto más rápido volás, más fuerte empuja: así sabe el avión a qué velocidad va.",
  "tarjeta.voz.pitotMorro":
    "Estos tubitos a los lados de la nariz son los pitot, uno para cada piloto. El aire entra de frente, y cuanto más rápido volás, más empuja: así se mide la velocidad.",
  "tarjeta.voz.motorPiston":
    "Acá está el motor. Hace girar la hélice, y la hélice, que tiene palas como alas chiquitas, tira del avión hacia adelante.",
  "tarjeta.voz.motorRadial":
    "Este es un motor radial: los cilindros van en círculo, como los rayos de una estrella. Hace girar la hélice, y la hélice tira del avión.",
  "tarjeta.voz.turbohelice":
    "Este es un turbohélice: adentro tiene una turbina, como la de un reactor, pero en vez de soplar, hace girar la hélice.",
  "tarjeta.voz.reactor":
    "Esto es un reactor. Traga aire por adelante, quema combustible y lo suelta por atrás muy rápido. Y el que más empuja es el ventilador grande de adelante.",
  "tarjeta.voz.tren":
    "Este es el tren de aterrizaje. Sale para aterrizar, y después de despegar se guarda adentro: así el aire pasa mejor y el avión va más rápido.",
  "tarjeta.voz.trenFijo":
    "Este tren no se guarda nunca: va siempre afuera. Es más sencillo y más liviano, aunque frena un poco al avión.",
  "tarjeta.voz.luces":
    "Estas son las luces de navegación: roja a la izquierda, verde a la derecha y blanca atrás. Si de noche ves la roja y la verde juntas, ese avión viene de frente.",
  "tarjeta.voz.luzBaliza":
    "La baliza es la luz roja que parpadea. Se enciende antes de arrancar el motor y les dice a todos: no te acerques, este avión se va a mover.",
  "tarjeta.voz.luzEstrobos":
    "Estos destellos blancos se encienden al entrar en la pista y en todo el vuelo, para que los demás aviones te vean desde lejos.",
  "tarjeta.voz.luzAterrizaje":
    "Los faros de aterrizaje se encienden para despegar, para aterrizar y siempre que volás por debajo de diez mil pies, donde hay más aviones y pájaros: así te ven.",
  "tarjeta.voz.matricula":
    "La matrícula es como la cédula del avión: no hay otro en el mundo que se llame igual. Las primeras letras dicen de qué país es: zeta pe es Paraguay, y e ce es España.",

  "language.label": "Idioma",
  "language.changed": "Idioma: {name}",

  /*
   * **Tocar una pieza del cuadro y que se explique** (#117, #204, #151, #154,
   * #205), y el rincón de las curiosidades del vuelo (#196). Ver
   * `ui/explicaciones-de-serie.ts`.
   *
   * La palabra corta sale desde el segundo peldaño y el texto entero desde el
   * tercero; en el primero, el dibujo y la voz. **La voz es solo la
   * grabada**: estas claves no pasan a la voz del navegador, y la que no
   * tenga su toma se calla. Lo que dicen es lo
   * real, simplificado: quien aprenda aquí qué es el T/D lo tiene que leer
   * igual en una cabina de verdad.
   */
  "explica.oir": "Escuchar otra vez",
  "explica.curiosidades": "Curiosidades del vuelo",

  "explica.velocidad.corta": "Velocidad",
  "explica.velocidad.texto":
    "IAS es la velocidad del aire que pasa por el ala, en nudos. El ala sostiene al avión solo si el aire pasa rápido: si vas muy despacio deja de sostener, y si vas muy rápido el avión sufre. Lo bueno es quedarse en el verde. Se mide con un tubito que mira para adelante: el pitot.",
  "explica.altitud.corta": "Altura",
  "explica.altitud.texto":
    "ALT es la altitud: a cuántos pies sobre el mar vas. Mil pies son unos trescientos metros. El altímetro no mira el suelo: mide cuánto pesa el aire que tenés encima, que arriba pesa menos. Por eso hay que ponerle la presión del día. La marca rosa es la altura que le pediste al avión.",
  "explica.rumbo.corta": "Rumbo",
  "explica.rumbo.texto":
    "HDG es el rumbo: para dónde apunta la nariz del avión, en grados, como en una brújula. El norte es 360, el este 90, el sur 180 y el oeste 270. Las pistas se llaman por su rumbo: la pista 03 apunta a 30 grados.",
  "explica.actitud.corta": "Horizonte",
  "explica.actitud.texto":
    "Es el horizonte artificial. Lo azul es el cielo y lo marrón, la tierra; el avioncito amarillo del medio sos vos. Si el azul baja, la nariz sube; si se inclina, estás virando. Sirve para volar derecho aunque afuera no se vea nada, dentro de una nube.",
  "explica.variometro.corta": "Sube o baja",
  "explica.variometro.texto":
    "V/S dice si el avión sube o baja, y qué tan rápido, en pies por minuto. Arriba es subir, abajo es bajar, y en el medio el avión va nivelado.",
  "explica.coordinador.corta": "Viraje",
  "explica.coordinador.texto":
    "El avioncito se inclina cuando virás, y dice qué tan rápido gira el avión. La bolita de abajo dice si el viraje va limpio: si se va para un lado, se la vuelve al medio con el pedal de ese lado.",
  "explica.motor.corta": "Motor",
  "explica.motor.texto":
    "Cuánta fuerza hace el motor. En los de hélice se mide en vueltas por minuto, RPM; en los reactores, en lo rápido que gira el ventilador de adelante, N1. Más motor es ir más rápido o subir; menos motor, ir más despacio o bajar. En un reactor la aguja tarda unos segundos en llegar a lo que pediste: un motor grande no se apura.",
  "explica.flaps.corta": "Flaps",
  "explica.flaps.texto":
    "Los flaps son la parte de atrás del ala, que sale para abajo. Hacen el ala más grande y más curva, y así sostiene al avión yendo más despacio. Se sacan para despegar y para aterrizar, y en el crucero se guardan, porque también frenan.",
  "explica.tren.corta": "Ruedas",
  "explica.tren.texto":
    "Las luces del tren. Verde quiere decir rueda abajo y trabada, lista para tocar el suelo. Después de despegar las ruedas se guardan, porque afuera frenan el aire. Antes de aterrizar siempre se mira: tres verdes.",
  "explica.combustible.corta": "Combustible",
  "explica.combustible.texto":
    "Cuánto combustible queda. En casi todos los aviones va dentro de las alas. La franja ámbar es la reserva: lo que se guarda siempre por si hay que esperar o ir a otro aeropuerto. Para llegar, nunca se cuenta con la reserva.",
  "explica.presurizacion.corta": "Aire de la cabina",
  "explica.presurizacion.texto":
    "Allá arriba el aire es tan finito que no alcanza para respirar bien. Por eso el avión mete aire en la cabina y la infla un poco, como un globo: adentro es como estar en un cerro alto, a dos mil cuatrocientos metros como mucho, aunque afuera vayas a más de diez mil. CAB ALT dice a qué altura está la cabina.",
  "explica.avisos.corta": "Luces de aviso",
  "explica.avisos.texto":
    "Se encienden cuando algo pide que lo mires. Ámbar quiere decir cuidado; rojo, que hay que hacer algo ya. Y siempre en el mismo orden: primero se vuela el avión, después se mira qué pasa.",
  "explica.matricula.corta": "Matrícula",
  "explica.matricula.texto":
    "Es el nombre del avión, como la chapa de un auto. Las primeras letras dicen de qué país es: ZP es Paraguay. La torre te llama por estas letras, cada una con su palabra de radio: Zulu, Papa… Por eso va a la vista, para saber que te hablan a vos.",
  "explica.carta.corta": "Mapa",
  "explica.carta.texto":
    "Es la pantalla del mapa. El triángulo amarillo sos vos, y lo de arriba es lo que tenés adelante. La línea rosa es el camino del plan de vuelo. Los rombos son otros aviones: el TCAS solo te enseña a los que vuelan cerca de tu altura. Los que van mucho más arriba o más abajo no salen, aunque los veas por la ventanilla.",
  "explica.carta.tierra":
    "En el suelo el radar de tráfico descansa; lo que hay en la pista te lo dice la torre. Por eso la pantalla dice TCAS STBY: el equipo espera. Se pone a trabajar en el punto de espera, antes de entrar a la pista, y mientras tanto lo que rueda se mira por la ventanilla.",
  "explica.tcas.corta": "Otro avión",
  "explica.tcas.ra":
    "Cada rombo es otro avión que vuela cerca de tu altura. Hueco, anda por ahí; lleno, está cerca. Si se vuelve un círculo ámbar, el TCAS avisa —traffic, traffic— y hay que buscarlo afuera. El número son cientos de pies: +10 es mil pies más arriba, y −05, quinientos más abajo. La flechita dice si sube o baja. Y en los reactores, si el otro se acerca de verdad, se vuelve un cuadrado rojo: el TCAS te dice si subir o bajar —climb, climb—, y la franja verde del variómetro, hasta dónde.",
  "explica.arco.corta": "Arco verde",
  "explica.arco.texto":
    "Este arco verde dice dónde vas a llegar a la altura que pediste, si seguís subiendo o bajando como ahora. Si cae antes de la pista, llegás abajo con tiempo; si cae después, no te da: hay que bajar más rápido o empezar antes.",
  "explica.arco.presenta":
    "¿Ves el arco verde en el mapa? Ahí vamos a llegar a la altura que pedimos.",
  "explica.td.corta": "Empezar a bajar",
  "explica.td.texto":
    "T/D quiere decir top of descent, lo alto de la bajada: acá empezamos a bajar. Desde este círculo verde, bajando tranquilos, se llega a la pista a la altura justa.",
  "explica.td.presenta": "Mirá el círculo verde en el mapa: acá empezamos a bajar.",
  "explica.tc.corta": "Terminar de subir",
  "explica.tc.texto":
    "T/C quiere decir top of climb, lo alto de la subida: acá terminamos de subir. Desde este círculo verde el avión va nivelado, en el crucero, hasta el T/D.",
  "explica.tc.presenta": "Ese círculo verde del mapa es donde terminamos de subir.",
  "explica.senda.corta": "Senda",
  "explica.senda.texto":
    "El rombo dice dónde está la senda, la rampa invisible que baja hasta la pista. Si el rombo está abajo, vas alto: bajá un poco más. Si está arriba, vas bajo. Se vuela hacia el rombo, hasta tenerlo en el medio.",
  "explica.senda.presenta":
    "Apareció el rombo rosa de la senda, al lado de la altura. Si lo tenemos en el medio, vamos bien hacia la pista.",
  "explica.gs-rodaje.corta": "Rodar",
  "explica.gs-rodaje.texto":
    "GS es la velocidad sobre el suelo. Rodando, esta barra dice qué tan rápido vas, y la marca rosa, hasta dónde llenarla: antes de una curva baja, porque las curvas se toman despacio. Verde es que vas bien; ámbar, que tenés que frenar.",
  "explica.gs-rodaje.presenta":
    "Esta barra dice qué tan rápido rodamos. Llenala hasta la marca rosa, nada más.",
  "explica.grado-aprendiz.corta": "Aprendiz",
  "explica.grado-aprendiz.texto":
    "Aprendiz es el primer grado. Estás aprendiendo, y la instructora vuela a tu lado y te dice qué toca. Equivocarse también es aprender: cada vuelo cuenta.",
  "explica.grado-piloto.corta": "Piloto",
  "explica.grado-piloto.texto":
    "Piloto es quien ya despega y aterriza. El avión lo llevás vos, del puesto al puesto, y la instructora te ayuda cuando hace falta.",
  "explica.grado-comandante.corta": "Comandante",
  "explica.grado-comandante.texto":
    "Comandante no quiere decir que mandás: quiere decir que respondés por el avión y por todos los que van a bordo. Para llegar hay que haberse ido al aire alguna vez, porque saber cuándo no aterrizar es lo que cuida a todos. Por eso, con este grado podés volar sin instructora.",
  "explica.grado-instructora.corta": "Instructora",
  "explica.grado-instructora.texto":
    "Instructora es quien sabe tanto que puede enseñarle a otro. Responde por su avión y, además, por lo que aprende quien vuela a su lado.",
  "explica.sin-instructora.corta": "Sin instructora",
  "explica.sin-instructora.texto":
    "Volás sin instructora porque ya sabés cuidarte. Ella se queda callada y solo habla si hay peligro: el suelo cerca, otro avión, una pérdida, una orden de la torre o una frustrada que hace falta. La torre y la voz del avión siguen igual. Para elegirlo hay que ser comandante.",
  "explica.galones.corta": "Galones",
  "explica.galones.texto":
    "Las barras de la manga dicen tu grado, como en cualquier línea aérea: una, quien aprende; dos, la segunda oficial; tres, la primera oficial, que ya lleva el avión; y cuatro, la comandante. Cuatro barras no quieren decir que manda más: quieren decir que responde por todos los que van a bordo. Lo que hiciste bien en cada vuelo no va en la manga: lo marca la instructora en su hoja, con un visto.",
  "explica.hoja.corta": "La hoja de la instructora",
  "explica.hoja.texto":
    "Después de cada vuelo, la instructora completa una hoja con las partes del vuelo: la vuelta al avión, la aproximación, la toma, la frustrada si hacía falta, la velocidad y el rodaje. A cada una que hiciste bien le pone un visto. Así se evalúa en una escuela de vuelo de verdad. Lo que todavía no sale no se tacha: se practica en el próximo vuelo.",

  /*
   * **Los sellos con nombre del cuaderno**, los del issue #25: su nombre, que
   * es el título de su ventana, y lo que dice la instructora al ganarlo y al
   * tocarlo en el álbum. Los nombres en guaraní van como los escribió el
   * issue. Ver `flight/sellos.ts` y `ui/album.ts`.
   */
  "explica.sello.veve.corta": "¡Veve!",
  "explica.sello.veve.texto":
    "¡Veve! Es el sello de tu primer despegue. Veve, en guaraní, quiere decir volar.",
  "explica.sello.karumbe.corta": "Karumbe",
  "explica.sello.karumbe.texto":
    "Karumbe, la tortuga: rodaste la pista entera, despacito y por el medio. En los campos sin calle de rodaje se va así hasta la cabecera.",
  "explica.sello.mainumby.corta": "Mainumby",
  "explica.sello.mainumby.texto":
    "Mainumby, el picaflor: volaste bien despacito, sin subir ni bajar y sin llegar a la pérdida. Volar lento se practica en la escuela para conocer bien al avión.",
  "explica.sello.nanduti.corta": "Ñandutí",
  "explica.sello.nanduti.texto":
    "Ñandutí: atravesaste una nube, blanca por dentro como el encaje. Adentro no se ve nada y se vuela mirando los instrumentos; por eso se hace solo en los aviones preparados para eso.",
  "explica.sello.tajamar.corta": "La vuelta al tajamar",
  "explica.sello.tajamar.texto":
    "La vuelta al tajamar: diste una vuelta entera alrededor del agua donde toma el ganado de la granja. Dar vueltas alrededor de un punto enseña a corregir el viento.",
  "explica.sello.tres-toques.corta": "Tres toques",
  "explica.sello.tres-toques.texto":
    "Tres toques: tocaste la pista y volviste a subir tres veces seguidas, sin parar. Así se practican los aterrizajes en la escuela, uno detrás de otro.",
  "explica.sello.primer-solo.corta": "Primer Solo",
  "explica.sello.primer-solo.texto":
    "Tu primer solo: despegaste y aterrizaste sin instructora, por tu cuenta. Es el día que todo piloto recuerda para siempre.",
  "explica.sello.chipa-volandera.corta": "Chipa volandera",
  "explica.sello.chipa-volandera.texto":
    "Chipa volandera: saliste de un aeródromo y llegaste a otro. Es tu primera travesía, como la chipa que viaja de pueblo en pueblo.",
  "explica.sello.jasy.corta": "Jasy",
  "explica.sello.jasy.texto":
    "Jasy, la luna: aterrizaste de noche. De noche la pista se encuentra por sus luces, y se baja con más calma todavía.",
  "explica.sello.mbarete.corta": "Mbarete",
  "explica.sello.mbarete.texto":
    "Mbarete quiere decir fuerte. Renunciaste a tiempo, cuando algo no salía: hace falta ser fuerte para no seguir. Es lo que hacen los buenos pilotos.",
  "explica.sello.ruta-jesuitica.corta": "Ruta Jesuítica",
  "explica.sello.ruta-jesuitica.texto":
    "Ruta Jesuítica: volaste en Encarnación y en Ayolas, la tierra de las misiones jesuíticas, con sus ruinas de piedra de hace más de doscientos años.",
  "explica.sello.pettirossi.corta": "La hazaña de Pettirossi",
  "explica.sello.pettirossi.texto":
    "La hazaña de Pettirossi: volaste en todos los aeródromos del Paraguay. Silvio Pettirossi fue el primer aviador paraguayo, y el aeropuerto de Asunción lleva su nombre.",
  "explica.sello.planeador.corta": "El planeador",
  "explica.sello.planeador.texto":
    "El planeador: llegaste a la pista sin motor, planeando. Es lo que se practica para el día que un motor se pare: con calma, a la velocidad de planeo y hacia la pista que se alcanza.",
  "explica.sello.manos-de-seda.corta": "Manos de seda",
  "explica.sello.manos-de-seda.texto":
    "Manos de seda: bajaste por la senda, a tu velocidad, y te posaste bien en la pista. Una aproximación así, estabilizada, es lo que más mira quien examina a un piloto.",
  "explica.sello.transchaco.corta": "Transchaco",
  "explica.sello.transchaco.texto":
    "Transchaco: volaste entre Asunción y Mariscal Estigarribia, por encima del Chaco, por donde va la ruta Transchaco. Un vuelo largo, de los que se planifican antes de salir.",
  "explica.sello.cien-horas.corta": "Cien horas",
  "explica.sello.cien-horas.texto":
    "Cien horas: tu cuaderno ya lleva cien horas de vuelo. Las horas son lo que cuenta de verdad un piloto, y estas son todas tuyas.",

  "explica.persianas.corta": "Las ventanillas",
  "explica.persianas.texto":
    "Para despegar y para aterrizar, las persianas de las ventanillas van subidas, y de noche se bajan las luces de la cabina. Así se ve afuera si pasa algo, y los ojos ya están acostumbrados a la luz de afuera si hubiera que salir. En algunos aviones nuevos, la tripulación aclara todas las ventanillas a la vez.",
  "explica.video-seguridad.corta": "Antes de despegar",
  "explica.video-seguridad.texto":
    "Antes de despegar, la tripulación enseña dónde están las salidas, cómo se abrocha el cinturón, el chaleco y las máscaras. Aunque vueles seguido, se mira siempre: cada avión es distinto, y la salida más cerca puede estar detrás tuyo.",
  "explica.mascaras.corta": "Las máscaras",
  "explica.mascaras.texto":
    "Si la cabina pierde el aire, caen máscaras del techo. Primero te ponés la tuya y después ayudás a quien está al lado, aunque sea un niño: sin aire no podrías ayudar a nadie. El oxígeno sale aunque la bolsita no se infle, y el avión baja enseguida adonde se respira bien.",
  "explica.no-fumar.corta": "No se fuma",
  "explica.no-fumar.texto":
    "En el avión no se fuma, tampoco con cigarrillo electrónico, y menos en el baño: un fuego en el aire es de lo más peligroso que hay. Por eso los baños tienen detector de humo.",
  "explica.cinturon.corta": "El cinturón",
  "explica.cinturon.texto":
    "Aunque la luz del cinturón esté apagada, sentado se lleva puesto, flojito. A veces el aire se mueve de golpe sin avisar, con el cielo despejado, y el cinturón es lo que te deja en tu asiento.",
  "explica.mesitas.corta": "Mesita y respaldo",
  "explica.mesitas.texto":
    "Para despegar y para aterrizar, la mesita guardada y el respaldo derecho. Así nadie se golpea si el avión frena fuerte, y el pasillo hasta la salida queda libre por si hubiera que salir rápido.",
  "explica.modo-avion.corta": "Modo avión",
  "explica.modo-avion.texto":
    "El celular, en modo avión. Su radio buscando señal se cuela en los auriculares de los pilotos como un zumbido, justo cuando escuchan a la torre. Y allá arriba no hay señal: el celular gasta la batería buscándola.",
  /*
   * **Los bomberos del aeropuerto**: se abre tocando el camión en la ficha de
   * un avión o de un destino que no se ofrece por eso. Enrique: «y se explica
   * de algún modo, eso se tiene que saber, yo no tenía ni idea». Las
   * categorías, del Anexo 14 de la OACI, tabla 9-1; ver `flight/bomberos.ts`.
   * Sin asustar: es seguridad que se cuida.
   */
  "explica.bomberos.corta": "Bomberos",
  "explica.bomberos.texto":
    "Cada aeropuerto tiene bomberos preparados para el avión más grande que recibe: cuanto más largo y más ancho es el avión, más agua, más espuma y más camiones hacen falta. Este avión es más grande de lo que pueden atender acá, así que no viene: si algo pasara, no habría con qué ayudarlo bien. Por eso cada aeropuerto dice su categoría, del 1 al 10, y cada avión va adonde lo pueden cuidar.",
  /*
   * **Y la curiosidad**, con el caso de verdad: La Gomera es de la categoría 5
   * (AIP de España, GCGM AD 2.6); el ATR 72 mide 27,2 m y es de la 5, y el
   * E195-E2 de Binter, 41,5 m, de la 7, que pide al menos la 6. Uno de ellos
   * se llama «La Gomera» (Diario de Avisos, diciembre de 2023) y no vuela
   * allí: a La Gomera solo va Binter, con el ATR 72. Ver
   * `world/bomberos-publicados.ts`.
   */
  "explica.bomberos-y-aviones.corta": "¿Por qué aviones chicos?",
  "explica.bomberos-y-aviones.texto":
    "A algunos aeropuertos solo van aviones chicos. Muchas veces es por la pista, y a veces por los bomberos. A La Gomera, en Canarias, Binter va con el ATR, un avión de hélice de veintisiete metros. Binter tiene también reactores de cuarenta y un metros y medio —uno hasta se llama «La Gomera»—, y no los lleva allí: los bomberos de La Gomera son de la categoría 5, preparados para aviones de hasta veintiocho metros, y esos reactores piden por lo menos la 6. Un aeropuerto se prepara para los aviones que recibe, y así cada avión va adonde lo pueden cuidar.",
  // ── Antes de volar: la vuelta al avión (punto 125) y el tiempo (punto 129) ──
  "vuelta.titulo": "La vuelta al avión",
  "vuelta.abrir": "Dar la vuelta al avión",
  "vuelta.volver": "Volver",
  "vuelta.seguir": "Seguir la vuelta",
  "vuelta.lista": "Vuelta lista",
  "vuelta.empezar":
    "Antes de volar, damos la vuelta al avión. Tocá lo que brilla.",
  "vuelta.entera": "¡Vuelta lista! El avión está para volar.",
  "vuelta.pitot.nombre": "La funda del pitot",
  "vuelta.pitot.globo": "Fuera la funda: el pitot tiene que respirar.",
  "vuelta.pitot.voz":
    "Esta funda roja tapa el pitot mientras el avión está guardado. Hay que sacarla: sin ella fuera, el avión no sabe a qué velocidad va.",
  "vuelta.sondas.nombre": "Las sondas y sus fundas",
  "vuelta.sondas.globo": "Sondas sin funda y sin golpes.",
  "vuelta.sondas.voz":
    "Estas son las sondas que miden la velocidad. Se les saca la funda y se mira que estén sanas y limpias.",
  "vuelta.superficies.nombre": "Los timones de la cola",
  "vuelta.superficies.globo": "Se mueven libres, sin trabas.",
  "vuelta.superficies.voz":
    "Los timones de la cola tienen que moverse libres, sin nada que los trabe.",
  "vuelta.calzos.nombre": "La rueda y los calzos",
  "vuelta.calzos.globo": "Rueda inflada; calzos fuera.",
  "vuelta.calzos.voz":
    "Los calzos son las cuñas que no dejan rodar al avión. Se sacan, y se mira que la rueda esté bien inflada.",
  "vuelta.frenos.nombre": "Las ruedas y los frenos",
  "vuelta.frenos.globo": "El pernito del freno asoma: queda freno.",
  "vuelta.frenos.voz":
    "En cada rueda se mira la goma y el freno. Este pernito, mientras asome, dice que al freno todavía le queda.",
  "vuelta.combustible.nombre": "El combustible",
  "vuelta.combustible.globo": "Se mira por la boca del ala, y se purga: azul y sin agua.",
  "vuelta.combustible.voz":
    "Por esta boca se mira cuánto combustible hay. Y con el vasito se saca un poco de abajo: tiene que salir azul y sin agua.",
  "vuelta.aceite.nombre": "El aceite",
  "vuelta.aceite.globo": "La varilla, entre las dos rayas.",
  "vuelta.aceite.voz":
    "Con la varilla se mira el aceite del motor: tiene que llegar entre las dos rayas.",
  "vuelta.helice.nombre": "La hélice",
  "vuelta.helice.globo": "Sin mellas ni golpes.",
  "vuelta.helice.voz":
    "La hélice se mira sin tocarla de más: que no tenga mellas ni golpes. Y nunca se para uno delante de ella.",
  "vuelta.motores.nombre": "Los motores",
  "vuelta.motores.globo": "Toma y salida libres.",
  "vuelta.motores.voz":
    "Se mira la boca del motor y la salida de atrás: que no haya nada adentro, ni un pájaro ni un trapo.",
  "vuelta.puertas.nombre": "Puertas y tapas",
  "vuelta.puertas.globo": "Todo cerrado y trabado.",
  "vuelta.puertas.voz":
    "Las puertas y las tapas que no se usan tienen que estar bien cerradas antes de salir.",
  "vuelta.luces.nombre": "Las luces",
  "vuelta.luces.globo": "Roja a la izquierda, verde a la derecha: encienden.",
  "vuelta.luces.voz":
    "Se prenden las luces y se mira que anden todas: la roja a la izquierda, la verde a la derecha y la blanca atrás.",
  "pitot.noMarca": "El anemómetro no marca: gas atrás y frená, con calma.",
  "pitot.abortado":
    "¡Muy bien! Parar era lo correcto. Era la funda del pitot: volvemos al puesto a sacarla.",
  "pitot.enElAire":
    "Volamos sin anemómetro: con el horizonte y el gas, tranquilos. Damos una vuelta y aterrizamos.",
  "pitot.volver": "Volver al puesto",
  "parte.abrir": "El tiempo de hoy",
  "parte.titulo": "El tiempo de hoy",
  "parte.salida": "Salida",
  "parte.llegada": "Llegada",
  "parte.aVolar": "¡A volar!",
  "parte.meQuedo": "Hoy me quedo",
  "parte.salgoIgual": "Salgo igual",
  "parte.ganaste": "¡Hoy ganaste: decidiste bien!",
  "parte.sinMetar": "sin METAR: el tiempo típico del lugar",
  /*
   * **La propuesta, con su porqué**: no basta con «mejor no»; se dice qué
   * pasaría. Enrique: «que se explique con datos al piloto, que sepa que es
   * una negativa argumentada». Con calma, y con las dos salidas buenas:
   * quedarse o esperar.
   */
  "parte.propone.tormenta":
    "Hay tormenta encima del campo. Debajo de una tormenta el viento cambia de golpe, y a una tormenta no se entra: mejor quedarnos, o esperar a que pase.",
  "parte.propone.visibilidad":
    "Hoy se ve menos de lo mínimo para este avión. Sin ver, no podríamos volver a encontrar la pista si hiciera falta: mejor quedarnos, o esperar a que abra.",
  "parte.propone.techo":
    "Las nubes están más bajas que el mínimo de este avión. Allá arriba nos meteríamos en ellas y no veríamos la pista para volver: mejor quedarnos, o esperar a que suban.",
  "parte.propone.cruzado":
    "Hoy el viento de costado es más fuerte que el que se probó en este avión. Con más viento de costado del que se probó, no sabemos cómo se porta al tocar el suelo: mejor quedarnos, o esperar a que afloje.",
  "parte.propone.pista":
    "Hoy este avión necesita más pista de la que hay, con el margen que pide su manual. Sin margen no se sale: mejor quedarnos, o esperar a que refresque o cambie el viento.",
  /* La palabra de cada porqué, desde el segundo peldaño. */
  "parte.palabra.cruzado": "Viento de costado",
  "parte.palabra.visibilidad": "Se ve poco",
  "parte.palabra.techo": "Nubes bajas",
  "parte.palabra.tormenta": "Tormenta",
  "parte.palabra.pista": "No alcanza la pista",
  /*
   * Y las cifras, desde el tercero: lo de hoy contra lo que aguanta el avión.
   * Las unidades son las de cabina —nudos y pies— y no se traducen.
   */
  "parte.cifras.cruzado": "viento de costado hoy: {hoy} · este avión, probado hasta {limite}",
  "parte.cifras.visibilidad": "se ve hoy: {hoy} · este avión necesita {limite}",
  "parte.cifras.techo": "nubes hoy a {hoy} · este avión necesita {limite}",
  "parte.cifras.tormenta": "tormenta encima del campo hoy · con tormenta no se sale",
  "parte.cifras.pista": "pista que necesita hoy: {hoy} · esta pista tiene {limite}",
  /* De dónde sale el límite, a la vista: no es un número inventado. */
  "parte.origen.demostrado": "demostrado en su certificación",
  "parte.origen.norma": "el mínimo que exige la norma",
  "parte.origen.visual": "el mínimo que exige la norma para volar mirando afuera",
  "parte.origen.instrumentos": "el mínimo que exige la norma para su aproximación",
  "parte.origen.manualEscuela": "su manual, con el margen de escuela",
  "parte.origen.manualCertificacion": "su manual, con el margen de su certificación",
  "parte.origen.tormenta": "a una tormenta no se entra",
  /* Esperar un rato y volver a mirar. */
  "parte.esperar": "Esperamos un rato",
  "parte.esperamos.voz": "Esperamos un rato y volvemos a mirar el parte.",
  "parte.sigueIgual": "Miramos otra vez: sigue igual",
  "parte.sigueIgual.voz":
    "Miramos otra vez y sigue igual. Podemos esperar otro rato, o quedarnos: las dos cosas están bien.",
  "parte.yaSePuede": "Miramos otra vez: ¡ya se puede!",
  "parte.yaSePuede.voz": "Miramos otra vez y ya mejoró: ahora sí podemos salir.",
  "parte.salgoIgual.voz":
    "Está bien: salimos con cuidado. Y si allá arriba no se puede, volvemos.",
  /*
   * **El modo inicio: Jazlyn le enseña a volar a Ara.** Ara pregunta y ella
   * enseña, paso a paso, con el avión esperando en cada uno. Jazlyn con la voz
   * de la comandante, pero al lado, no por la megafonía; Ara, con la suya, que
   * no dice si es niño o niña, y lo que dice tampoco. Ver
   * `src/flight/inicio.ts`. Ninguna de las de ella baja de treinta letras: con
   * chispa, una frase muy corta se inventa lo que falta (docs/voces/LEEME.md).
   */
  "inicio.modo.nombre": "Aprendé con Jazlyn",
  "inicio.modo.mama": "Jazlyn",
  "inicio.modo.ara": "Ara",
  "inicio.modo.seguir": "Seguir volando",
  "inicio.modo.llave": "Arrancar el motor",
  "inicio.ara.hola": "Mamá, mamá, ¿hoy me enseñás a volar?",
  "inicio.mama.hola":
    "¡Hoy pilotás vos, mi amor! Yo voy acá, a tu lado. El avión te espera en cada paso, y si algo no sale, lo probamos otra vez.",
  "inicio.ara.motor": "¿Y cómo se prende el avión, mamá?",
  "inicio.mama.motor": "Primero, el motor. Apretá la llave que brilla y escuchá cómo se despierta.",
  "inicio.mama.motor.otra1": "Buscá la llavecita que se mueve, mi vida. Apretala una vez, sin miedo.",
  "inicio.mama.motor.otra2":
    "El motor se prende con la llave. Hacé como el dibujo: un toquecito, y listo.",
  "inicio.ara.motor.bien": "¡Se prendió! ¡Mirá cómo suena, mamá!",
  "inicio.mama.motor.bien": "¡Eso! Ese ruido es la hélice dando vueltas. Ya tenemos motor.",
  "inicio.ara.gas": "¿Y ahora cómo hacemos para que corra?",
  "inicio.mama.gas":
    "Con el gas. Hacé como el dibujo y dale todo el gas: así la hélice tira con todas sus fuerzas.",
  "inicio.mama.gas.otra1":
    "El gas es el motor con la flechita para arriba. Dale, empujalo hasta arriba del todo.",
  "inicio.mama.gas.otra2":
    "Mirá el dibujo que brilla: ese es el gas. Dale más, mi amor, que el avión está esperando.",
  "inicio.mama.gas.bien": "¡Muy bien! Yo te sostengo el gas. Mirá cómo corremos por la pista.",
  "inicio.ara.carrera": "¡Mamá, vamos rapidísimo! ¿Cuándo volamos?",
  "inicio.mama.carrera":
    "Todavía no. Un avión necesita mucha velocidad para que el aire lo levante. Yo te aviso.",
  "inicio.mama.despegar": "¡Ahora! Para despegar, apretá la flecha de subir.",
  "inicio.mama.despegar.otra1":
    "La flecha que apunta para arriba, la que brilla. Apretala y el avión levanta la nariz.",
  "inicio.mama.despegar.otra2": "La de subir, mi amor, la que mira al cielo. Probá otra vez, sin apuro.",
  "inicio.ara.despegar.bien": "¡Estamos volando! ¡Mirá qué chiquitito se ve todo!",
  "inicio.mama.despegar.bien":
    "¡Despegaste! Así lo hace un avión de verdad: primero corre, y después levanta la nariz.",
  "inicio.ara.izquierda": "¿Y cómo hago para doblar, mamá?",
  "inicio.mama.izquierda":
    "Los aviones no doblan como un auto: viran inclinando las alas. Apretá la flecha de la izquierda.",
  "inicio.mama.izquierda.otra1":
    "La flecha de la izquierda, mi vida, la que brilla en el dibujo. Apretala y mirá el ala.",
  "inicio.mama.izquierda.otra2":
    "Hacé como el dibujo: la flecha que va para la izquierda, y el ala de ese lado baja.",
  "inicio.mama.masRato1": "¡Así! Un poquito más: dejala apretada hasta que el ala baje bien.",
  "inicio.mama.masRato2": "Vas bien. Mantenela un ratito más, que el avión se inclina despacito.",
  "inicio.mama.izquierda.bien": "¡Eso! ¿Ves cómo baja el ala de ese lado? Así se vira.",
  "inicio.ara.derecha": "¡Ahora quiero para el otro lado!",
  "inicio.mama.derecha": "¡Dale! Ahora la flecha de la derecha, la que brilla.",
  "inicio.mama.derecha.otra1":
    "La flecha de la derecha, mi amor, la del otro lado. Apretala y mirá cómo cambia el ala.",
  "inicio.mama.derecha.otra2":
    "Hacé como el dibujo: la flecha que va para la derecha, y el avión vira para allá.",
  "inicio.mama.derecha.bien": "¡Perfecto! A la izquierda y a la derecha: ya sabés virar.",
  "inicio.ara.nivelar": "Mamá, ¿y cómo hago para ir derechito?",
  "inicio.mama.nivelar":
    "Enderezamos las alas. Hacé como el dibujo, despacito, hasta que el avión quede derecho como una mesa.",
  "inicio.mama.nivelar.otra1":
    "Despacito, mi vida, hasta que las dos alas queden iguales, como tus brazos abiertos.",
  "inicio.mama.nivelar.otra2":
    "Mirá el dibujo: un poquito para el otro lado, y soltá cuando el avión quede derecho.",
  "inicio.mama.nivelar.bien": "¡Derechito! Las alas parejas: así se vuela tranquilo.",
  "inicio.ara.fin": "¡Mamá, mamá, mirá! ¡Volé yo, sin ayuda!",
  "inicio.mama.fin":
    "¡Volaste vos, mi amor! Te ganaste tu primer sello del cuaderno. Ahora seguí volando, que el cielo es tuyo.",
  "inicio.mama.finOtra":
    "¡Qué lindo vuelo, mi amor! Tu sello de este campo ya está en el cuaderno. Ahora seguí volando, que el cielo es tuyo.",
  /*
   * **La segunda escena: Ara aprende a aterrizar con Jazlyn.** Los mismos dos
   * y el mismo tono, ya en el aire y en la final del Chaco. En el aire el
   * mundo no se para: mientras espera el gesto, el avión lo lleva su mano, y
   * si la final no da para más, lo hace ella y lo dice. Ver
   * `src/flight/inicio-aterrizar.ts`. Tampoco aquí baja nada de treinta letras.
   */
  "inicio.modo.aterrizar": "Aterrizá con Jazlyn",
  "inicio.modo.freno": "Frenar",
  "inicio.ara.aterrizar.hola": "Mamá, ¿hoy me enseñás a aterrizar?",
  "inicio.mama.aterrizar.hola":
    "¡Hoy aterrizás vos, mi amor! En el aire el avión no se puede quedar quieto, así que yo lo llevo mientras te enseño.",
  "inicio.ara.aterrizar.gas": "¿Y qué es lo primero que hacemos, mamá?",
  "inicio.mama.aterrizar.gas":
    "Vamos un poquito rápido para aterrizar. Hacé como el dibujo y dale un poquito menos de gas.",
  "inicio.mama.aterrizar.gas.otra1":
    "El gas, mi vida, un poquito para abajo: así el motor afloja y el avión va más despacio.",
  "inicio.mama.aterrizar.gas.otra2":
    "Mirá el dibujo que brilla: es el gas. Un toquecito para abajo, sin apuro.",
  "inicio.mama.aterrizar.gas.bien":
    "¡Eso! ¿Escuchás cómo se calma el motor? Ya vamos a la velocidad justa para aterrizar.",
  "inicio.mama.aterrizar.gas.yo":
    "Esta vez el gas lo bajo yo, mirá la palanca: un poquito nomás, y el motor se calma.",
  "inicio.ara.aterrizar.nariz": "¿Y cómo hacemos para bajar hasta la pista?",
  "inicio.mama.aterrizar.nariz":
    "Con la nariz. Bajala un poquito, como en el dibujo, que apunte a la pista por adentro de los aros.",
  "inicio.mama.aterrizar.nariz.otra1":
    "La nariz un poquito para abajo, mi amor, que mire la pista. El avión va por adentro de los aros.",
  "inicio.mama.aterrizar.nariz.otra2":
    "Hacé como el dibujo: un toquecito para abajo, y la nariz apunta a la pista.",
  "inicio.ara.aterrizar.nariz.bien": "¡Mamá, mirá! ¡Los aros se ponen verdes!",
  "inicio.mama.aterrizar.nariz.bien":
    "¡Porque vamos justito por el caminito! Así se baja a una pista: despacito y derecho.",
  "inicio.mama.aterrizar.nariz.yo":
    "Esta vez la nariz la bajo yo, mirá: un poquito nomás, y apunta a la pista.",
  "inicio.ara.aterrizar.aros": "Mamá, ¿y por qué hay aros en el cielo?",
  "inicio.mama.aterrizar.aros":
    "Son para aprender: dibujan el caminito para bajar a la pista. En los aeropuertos, ese caminito lo marcan unas luces al lado de la pista.",
  "inicio.ara.aterrizar.senda": "¡Mamá, la pista se hace cada vez más grande!",
  "inicio.mama.aterrizar.senda":
    "Es que ya llegamos. Cuando estemos bajito, yo saco el gas y vos levantás la nariz, suave, para posarnos.",
  "inicio.mama.aterrizar.recogida": "¡Ahora! Levantá la nariz un poquito, suave, suave.",
  "inicio.ara.aterrizar.toque": "¡Tocamos el suelo, mamá! ¡Ni se sintió!",
  "inicio.mama.aterrizar.recogida.bien":
    "¡Aterrizaste! Primero las ruedas de atrás, suavecito, como lo hace un avión de verdad.",
  "inicio.mama.aterrizar.recogida.yo":
    "¡Aterrizamos! Esta vez la nariz la levanté yo. La próxima, la levantás vos.",
  "inicio.ara.aterrizar.frenar": "¿Y ahora cómo paramos el avión, mamá?",
  "inicio.mama.aterrizar.frenar":
    "Con el freno, como en un auto. Apretá el freno del dibujo y yo te ayudo a parar.",
  "inicio.mama.aterrizar.frenar.otra1":
    "El freno, mi vida, el dibujo que brilla. Apretalo y el avión se va parando.",
  "inicio.mama.aterrizar.frenar.otra2":
    "Buscá el freno en el dibujo y apretalo una vez, sin miedo. La pista es larga.",
  "inicio.mama.aterrizar.frenar.bien":
    "¡Muy bien! Mirá cómo frenamos, despacito y por el medio de la pista.",
  "inicio.ara.aterrizar.fin": "¡Lo hicimos, mamá! ¡Aterrizamos en la pista!",
  "inicio.mama.aterrizar.fin":
    "¡Aterrizaste, mi amor! Te ganaste tu primer sello del cuaderno. Cuando quieras, volamos otra vez.",
  "inicio.mama.aterrizar.finOtra":
    "¡Qué lindo aterrizaje, mi amor! El sello de este campo ya está en tu cuaderno. Cuando quieras, volamos otra vez.",
  /*
   * **La tercera escena: el primer vuelo de pasaje de Ara**, de Los Rodeos a
   * La Palma en el JAZ 90, con Jazlyn de comandante en la cabina de mando y
   * hablando por la megafonía. Ara va en la ventanilla y habla bajito con
   * quien va a su lado: lo suyo, con voseo y con la ilusión de la primera
   * vez. Lo que contesta sus preguntas son anuncios para todo el pasaje, de
   * usted y sin paraguayismos, que el vuelo es en Canarias: la comandante no
   * le contesta a un pasajero por la megafonía. Ver
   * `src/flight/inicio-pasaje.ts`. Nada baja de treinta letras.
   */
  "inicio.modo.pasaje": "Viajá con Jazlyn",
  "inicio.modo.tripulacion": "La tripulación, por la megafonía",
  "inicio.modo.megafonia": "Jazlyn, por la megafonía",
  "inicio.modo.volver": "Volver al hangar",
  "inicio.ara.pasaje.ventanilla": "¡Me tocó la ventanilla! Desde acá se ve el ala del avión, y el motor.",
  "inicio.tripulacion.pasaje.cinturon":
    "Señoras y señores, bienvenidos a bordo. Por favor, tomen asiento y abróchense el cinturón: bajito y bien ajustado.",
  "inicio.ara.pasaje.cinturon": "¡Clic! Ya me abroché el cinturón, bajito y bien ajustado.",
  "inicio.ara.pasaje.puertas": "Cerraron la puerta del avión. ¡Ya nos vamos!",
  "inicio.ara.pasaje.motores": "¡Escuchá! Se prendieron los motores: suenan como un secador gigante.",
  "inicio.ara.pasaje.comandante": "¡Es mamá! Ella es la comandante, allá adelante en la cabina.",
  "inicio.ara.pasaje.espera": "¿Por qué paramos acá, antes de la pista?",
  "inicio.mama.pasaje.espera":
    "Señores pasajeros, enseguida despegamos. Antes de entrar en la pista, siempre esperamos el permiso de la torre de control.",
  "inicio.ara.pasaje.despegue": "¡Ahora sí que vamos a despegar! Miro bien por la ventanilla.",
  "inicio.ara.pasaje.carrera": "¡Uy, cómo empuja! Me aprieta contra el asiento, ¡y vamos rapidísimo!",
  "inicio.ara.pasaje.volando": "¡Estamos volando! Las casas y los autos se ven chiquititos.",
  "inicio.ara.pasaje.nubes": "¡Todo blanco! Estamos adentro de una nube. ¿De qué estará hecha?",
  "inicio.ara.pasaje.nubesAbajo": "¡Ya pasamos las nubes! Ahora las vemos desde arriba. ¿De qué estarán hechas?",
  /*
   * Las gotitas de una nube no flotan: caen, pero tan despacio —unos
   * centímetros por segundo— que cualquier corriente de aire las sostiene.
   * Por eso «el aire las sostiene» y no «flotan».
   */
  "inicio.mama.pasaje.nubes":
    "Señores pasajeros, les habla la comandante. Para quienes vuelan hoy por primera vez: las nubes que pasamos al subir están hechas de agua, de millones de gotitas tan chiquitas y livianas que el aire las sostiene.",
  "inicio.ara.pasaje.niebla": "¡De agua! Entonces una nube es como la niebla, pero allá arriba.",
  "inicio.ara.pasaje.servicio": "¡Nos traen algo rico para comer! Yo quiero probar un poquito.",
  "inicio.ara.pasaje.teide": "¡Lo veo! Es enorme, y la punta sale por encima de las nubes.",
  "inicio.ara.pasaje.garajonay": "¿Hablar silbando? ¡Yo también quiero aprender a silbar así!",
  "inicio.ara.pasaje.orotava": "¡Qué valle tan grande! Baja desde la montaña hasta el mar.",
  "inicio.ara.pasaje.loVeo": "¡Lo veo! Desde acá arriba se ve todo chiquitito.",
  "inicio.ara.pasaje.oidos": "Se me tapan un poco los oídos… ¿por qué será?",
  "inicio.tripulacion.pasaje.oidos":
    "Señoras y señores, si al bajar se les tapan los oídos, es normal: va cambiando la presión del aire. Tragar saliva o bostezar ayuda a destaparlos.",
  "inicio.ara.pasaje.bostezo": "¡Bostecé bien grande, y se me destaparon los oídos!",
  "inicio.ara.pasaje.isla": "¡Ya se ve la isla adonde vamos! ¡Qué montañas tan altas tiene!",
  "inicio.ara.pasaje.flaps": "¡Mirá el ala! Le está saliendo un pedazo para atrás y para abajo.",
  "inicio.ara.pasaje.toma": "¡Tocamos el suelo! ¡Y cómo rugen los motores ahora!",
  /*
   * La reversa de un reactor desvía hacia delante el aire del ventilador: el
   * ruido fuerte después de tocar es ese aire frenando. Ver `flight/reversa.ts`.
   */
  "inicio.mama.pasaje.reversa":
    "Y para quienes volaron hoy por primera vez: ese ruido fuerte de los motores al aterrizar era para frenar. Los motores echan el aire hacia adelante, y eso frena el avión.",
  "inicio.ara.pasaje.fin": "¡Llegamos a La Palma! Ahora le cuento a mamá todo lo que vi por la ventanilla.",
  /*
   * **El vuelo de pasaje, contado de verdad** (18-10-2026). Enrique, al
   * probarlo: «algo más que contar, no se escucha a la tripulación de cabina
   * dando las indicaciones de cinturón y chalecos salvavidas», y ratos largos
   * sin nada. Así que entra la demostración de seguridad, la tripulante en
   * persona —se acerca al asiento de Ara y le habla sin altavoz, con el tú de
   * Canarias—, Jazlyn contando para todos lo que se pregunta quien vuela por
   * primera vez, y Ara notando lo que pasa: el tren, el giro, las nubes otra
   * vez. Ver `src/flight/inicio-pasaje.ts` y el ADR 0020.
   *
   * La demostración, por la megafonía y en el orden de la norma europea (AMC1
   * CAT.OP.MPA.170): el cinturón, las salidas y sus luces, las máscaras, el
   * chaleco, la tarjeta y los aparatos. El chaleco «se infla al salir» es lo
   * que dicen las tripulaciones; la norma pide decir cuándo y dónde.
   */
  "inicio.tripulacion.pasaje.demo.intro":
    "Señoras y señores, les rogamos un momento de atención: les vamos a mostrar el equipo de seguridad de este avión.",
  "inicio.tripulacion.pasaje.demo.cinturon":
    "El cinturón se abrocha metiendo la hebilla hasta oír clic, se ajusta tirando de la cinta y se suelta levantando la tapa.",
  /*
   * **Las salidas del JAZ 90, las de su clase** (punto 312): el ERJ 170 lleva
   * cuatro puertas tipo I —dos delante y dos detrás— y ninguna salida sobre
   * el ala, según su hoja de tipo de EASA (IM.A.001, apartado III.21). Las
   * ventanillas de salida sobre el ala son de los más largos, como el E190.
   * Ver `docs/historias/fuentes.md`.
   */
  "inicio.tripulacion.pasaje.demo.salidas":
    "Este avión tiene cuatro salidas de emergencia: dos delante y dos detrás. Busquen la más cercana, que puede estar detrás de ustedes. Unas luces en el suelo del pasillo marcan el camino hasta ellas.",
  "inicio.tripulacion.pasaje.demo.mascaras":
    "Si la cabina perdiera presión, caerán automáticamente del techo unas mascarillas de oxígeno. Tiren de una hacia ustedes, colóquensela sobre la nariz y la boca, y respiren con normalidad. Primero la suya, y después ayuden a quien lo necesite.",
  "inicio.tripulacion.pasaje.demo.chaleco":
    "Su chaleco salvavidas está debajo del asiento, y solo se usa si el avión tuviera que posarse en el agua. Se pasa por la cabeza y se abrocha a la cintura. No lo inflen dentro del avión: se infla al salir, tirando de las anillas rojas.",
  "inicio.tripulacion.pasaje.demo.tarjeta":
    "En el bolsillo del asiento de delante tienen la tarjeta de seguridad, con todo esto en dibujos. Por favor, léanla antes del despegue.",
  "inicio.tripulacion.pasaje.demo.aparatos":
    "Y los teléfonos y aparatos electrónicos, en modo avión durante todo el vuelo. Muchas gracias por su atención.",
  "inicio.ara.pasaje.demoMascara": "¡Primero la máscara de los grandes, y después la mía! Así me pueden ayudar.",
  "inicio.ara.pasaje.demoChaleco": "Abajo de mi asiento hay un chaleco amarillo. ¡Y se infla recién afuera del avión!",
  "inicio.ara.pasaje.demoTarjeta": "¡Encontré la tarjeta en el bolsillo de adelante! Tiene dibujitos de todo.",
  /*
   * **La demostración con gracia, de vez en cuando** (punto 294): una frase
   * en la entrada y otra en la despedida, nunca en las instrucciones, que son
   * las de arriba y no cambian. De usted, por la megafonía, con la gracia
   * amable de Canarias y sin ironía sobre la seguridad: el paisaje que puede
   * esperar, la tripulación que hasta se examina cada año —es verdad: ver
   * `docs/historias/fuentes.md`— y el cariño a quien vuela por primera vez.
   * Sale en uno de cada tres vuelos, y nunca dos seguidos: ver
   * `src/flight/demostracion-con-gracia.ts`.
   */
  "inicio.tripulacion.pasaje.demo.gracia.ventanilla.entrada":
    "Ya sé que por la ventanilla hay mejores vistas que nosotros, pero el paisaje no se va a ninguna parte: se lo prometo.",
  "inicio.tripulacion.pasaje.demo.gracia.ventanilla.despedida":
    "Y ahora sí, ya pueden volver a la ventanilla: el paisaje seguía ahí, como les prometí.",
  "inicio.tripulacion.pasaje.demo.gracia.examen.entrada":
    "Si ya se lo saben de memoria, repásenlo igual con nosotros: la tripulación lo repasa tanto que hasta tiene examen todos los años.",
  "inicio.tripulacion.pasaje.demo.gracia.examen.despedida":
    "Y a quien quiera repasarlo, la tarjeta del bolsillo se lo vuelve a contar, con dibujos y sin examen.",
  "inicio.tripulacion.pasaje.demo.gracia.primeraVez.entrada":
    "Hoy hay a bordo quien vuela por primera vez, así que se lo vamos a contar con todo el cariño del mundo. Y a los demás, también.",
  "inicio.tripulacion.pasaje.demo.gracia.primeraVez.despedida":
    "Y quien vuela hoy por primera vez ya sabe lo mismo que quien ha volado cien veces. ¡Buen viaje a todos!",
  /*
   * **La tripulante, en persona**: con el tú de Canarias, que es su habla, y
   * nada que diga si Ara es niño o niña. Lo de la persiana es la curiosidad
   * de siempre, `explica.persianas`, dicha a quien pregunta.
   */
  "inicio.tripulacion.pasaje.cerca.revision":
    "¡Hola! Déjame ver ese cinturón… ¡perfecto, así se lleva! Y la cortinilla, siempre subida para despegar.",
  "inicio.ara.pasaje.persiana": "¿Y por qué la persiana tiene que estar arriba para despegar?",
  "inicio.tripulacion.pasaje.cerca.persiana":
    "Así vemos bien fuera si pasa algo. Y de noche apagamos las luces de la cabina, para que los ojos ya estén hechos a lo de fuera.",
  "inicio.ara.pasaje.tren": "¡Sonó un golpe abajo del avión! Son las ruedas, que se guardan para volar.",
  "inicio.ara.pasaje.plop": "¡Plop! Me hicieron plop los oídos, como en el ascensor de un edificio alto.",
  "inicio.ara.pasaje.giroAbajo": "¡Estamos girando! El avión se inclina, y mi ala apunta para abajo.",
  "inicio.ara.pasaje.giroArriba": "¡Estamos girando! El avión se inclina, y mi ala apunta para el cielo.",
  "inicio.ara.pasaje.bici": "Mamá dice que los aviones se inclinan para girar, como una bici en una curva.",
  "inicio.ara.pasaje.marArriba": "¡Me pego a la ventanilla para ver más! Entre las nubes, allá abajo, se ve el mar.",
  /*
   * Lo que sostiene un avión, contado de verdad (AGENTS.md, regla 4): el ala
   * inclinada empuja el aire hacia abajo y el aire la empuja hacia arriba. Y
   * Ara lo entiende con una pandorga, que se sostiene igual.
   */
  "inicio.ara.pasaje.preguntaAla": "¿Cómo puede volar un avión tan grande y tan pesado sin caerse?",
  "inicio.mama.pasaje.ala":
    "Señores pasajeros, para quienes vuelan hoy por primera vez: ¿cómo se sostiene en el aire un avión tan pesado? Las alas van un poquito inclinadas y empujan el aire hacia abajo, y el aire las empuja a ellas hacia arriba. Por eso hay que ir rápido.",
  "inicio.ara.pasaje.pandorga": "¡Como una pandorga! El viento la empuja para arriba, y sube y sube.",
  "inicio.ara.pasaje.preguntaAlto": "¿Qué tan alto y qué tan rápido estaremos volando ahora?",
  "inicio.mama.pasaje.altoRapido":
    "Y para quienes vuelan hoy por primera vez: ahora vamos más alto que la cumbre del Teide, y a más de quinientos kilómetros por hora, mucho más rápido que cualquier coche.",
  "inicio.ara.pasaje.altoRapido": "¡Más alto que el Teide! Con razón desde acá arriba las montañas parecen de juguete.",
  "inicio.tripulacion.pasaje.cerca.hola":
    "¡Hola otra vez! Aquí tienes agua y algo rico. Te vi mirando las nubes por la ventanilla: ¿es tu primer vuelo?",
  "inicio.ara.pasaje.deVerdad": "¡Sí, es mi primer vuelo! ¿Las nubes son de agua de verdad?",
  /*
   * Las nubes de cerca: las del mar de nubes son de gotitas de agua, y las de
   * muy arriba, de cristalitos de hielo (Atlas Internacional de Nubes de la
   * OMM); se ven blancas porque las gotitas desparraman todos los colores de
   * la luz del sol por igual (Met Office).
   */
  "inicio.tripulacion.pasaje.cerca.nubes1":
    "¡De verdad! Una nube son millones de gotitas de agua, tan chiquititas que no se ven una a una, y el aire las sostiene.",
  "inicio.tripulacion.pasaje.cerca.nubes2":
    "Y muy arriba, donde hace mucho frío, son cristalitos de hielo. Se ven blancas porque las gotitas desparraman toda la luz del sol.",
  "inicio.tripulacion.pasaje.cerca.nubes3":
    "Cuando las cruzamos, todo se ve blanco, el avión se mueve un poquito y a veces se moja la ventanilla. No pasa nada: el avión está hecho para eso.",
  "inicio.ara.pasaje.nubesSostiene": "¡Agua que el aire sostiene en el cielo! Ahora las miro de otra manera.",
  "inicio.tripulacion.pasaje.cerca.frio":
    "¿Sabes qué? Fuera, tan alto, hace un frío de congelador, bajo cero. Aquí dentro metemos aire de fuera y lo calentamos, para ir a gusto.",
  "inicio.ara.pasaje.frio": "¡Afuera hace frío de congelador, y acá adentro se está calentito!",
  "inicio.tripulacion.pasaje.cerca.motor1":
    "¿Ves el motor, ahí debajo del ala? Delante tiene un ventilador gigante que se traga muchísimo aire.",
  "inicio.tripulacion.pasaje.cerca.motor2":
    "Dentro, el aire se aprieta, se calienta con el combustible y sale por detrás a toda velocidad. Eso empuja el avión hacia delante.",
  "inicio.ara.pasaje.secador": "¡Como el secador de pelo: un ventilador que tira aire calentito, pero gigante!",
  "inicio.ara.pasaje.preguntaBajar": "¿Y cómo hace el avión para bajar? ¿Apagan los motores?",
  "inicio.mama.pasaje.bajando":
    "Señores pasajeros, para quienes vuelan hoy por primera vez: para bajar no apagamos los motores. Los dejamos suavecito, y el avión va bajando poco a poco, como por un tobogán muy largo.",
  "inicio.tripulacion.pasaje.cerca.islas1":
    "¿Sabes que las islas Canarias salieron del fondo del mar? Son volcanes que fueron creciendo, durante millones de años, hasta asomar.",
  "inicio.tripulacion.pasaje.cerca.islas2":
    "La Palma, adonde vamos, es de las más jovencitas, y tiene unas montañas altísimas.",
  "inicio.ara.pasaje.islas": "¡Islas que eran volcanes en el fondo del mar! Se lo voy a contar a todos.",
  /*
   * **El silbo, también en otras islas** (punto 288): lo que Ara pregunta
   * después de oír la historia del silbo gomero, y lo que contesta la
   * tripulante en persona. Que se silbó también en El Hierro, en Tenerife y
   * en Gran Canaria está documentado —la carta de la comunidad científica de
   * 2023 y Díaz Reyes, ULPGC, 2017—, y la UNESCO cuenta que en las demás
   * islas se fue perdiendo; donde se conserva y se enseña en la escuela es en
   * La Gomera. En La Palma solo es «muy probable», así que no se dice. Las
   * fuentes, en `docs/historias/fuentes.md`.
   */
  "inicio.ara.pasaje.silboOtras": "¿Y en las otras islas también hablan silbando, o solamente en La Gomera?",
  "inicio.tripulacion.pasaje.cerca.silbo":
    "¡No solo allí! También se silbaba en El Hierro, en Tenerife, de donde venimos, y en Gran Canaria. Pero donde más se conserva hoy es en La Gomera: allí se aprende en la escuela.",
  "inicio.tripulacion.pasaje.cerca.ruta":
    "¿Y cómo sabe el avión el camino? La comandante y el copiloto llevan el mapa en una pantalla, y hablan por radio con la torre de control.",
  "inicio.ara.pasaje.mapa": "¡Como el mapa del celular, pero para aviones! Y con la torre por radio.",
  /*
   * El PAPI, del Anexo 14 de la OACI: cuatro luces al lado de la pista; dos
   * blancas y dos rojas es la senda justa.
   */
  "inicio.tripulacion.pasaje.cerca.papi":
    "Al lado de la pista hay cuatro lucecitas. Si se ven dos blancas y dos rojas, el avión baja justo por su camino.",
  "inicio.ara.pasaje.papi": "¡Dos blancas y dos rojas! Las voy a buscar cuando vuele con mamá.",
  "inicio.ara.pasaje.sobreLaIsla": "¡Estamos pasando por arriba de la isla! Se ven las montañas y los barrancos.",
  "inicio.ara.pasaje.marQuieto": "Desde tan alto, el mar parece quietito. ¡Pero de cerca tiene olas!",
  "inicio.ara.pasaje.nubesCerca": "Cada vez estamos más bajo: ¡las nubes ya están cerquita!",
  "inicio.ara.pasaje.bano": "¿Y si tengo ganas de ir al baño? ¿Hay baño en el avión?",
  /*
   * Ya no suena (punto 293): con la luz encendida, ahora la tripulante le dice
   * a Ara que le acompaña cuando se apague, y arriba va de verdad. Se queda
   * para no renumerar el guion de la tripulación, que está grabado. Ver
   * `inicio.tripulacion.pasaje.cerca.banoLuz`.
   */
  "inicio.tripulacion.pasaje.cerca.bano":
    "¡Claro que hay! Pero ahora, con la luz del cinturón encendida, mejor esperamos a aterrizar.",
  /*
   * Los telescopios del Roque de los Muchachos, en lo alto de La Palma: el
   * Gran Telescopio Canarias, de 10,4 m, entre ellos (Ministerio de Ciencia,
   * ficha de la ICTS). Que el cielo de la isla lo protege una ley —la «Ley del
   * Cielo», 31/1988—, por verificar en el BOE.
   */
  "inicio.tripulacion.pasaje.cerca.estrellas":
    "¿Sabes qué hay arriba de todo en La Palma? Unos telescopios enormes para mirar las estrellas: el cielo de la isla es de los más limpios del mundo.",
  "inicio.ara.pasaje.estrellas": "¡Telescopios gigantes para mirar las estrellas! Quiero ver uno de cerca.",
  "inicio.ara.pasaje.islaCerca": "¡La isla ya está cerquita! Se ven las montañas, la costa y el mar.",
  "inicio.ara.pasaje.otraNube": "¡Otra vez adentro de una nube, todo blanco! Ahora ya sé que es agua.",
  "inicio.ara.pasaje.marAbajo": "¡Me pego a la ventanilla para ver más! Allá abajo está el mar, enorme y azul oscurito.",
  "inicio.tripulacion.pasaje.cerca.aterrizaje":
    "Ya vamos a aterrizar: cinturón bien abrochado, respaldo derecho y la cortinilla arriba. ¡Lo estás haciendo genial!",
  "inicio.ara.pasaje.flapsPorque": "Mamá me contó que así el ala sostiene al avión aunque vaya despacito.",
  "inicio.ara.pasaje.giroFinal": "¡Otra vuelta! Así el avión queda derechito, mirando a la pista.",
  "inicio.ara.pasaje.masDespacio": "Ahora el avión va más despacio, para prepararse a aterrizar. ¡Se nota!",
  "inicio.ara.pasaje.ruedas": "¡Otro ruido abajo! Ahora salen las ruedas, para aterrizar.",
  "inicio.ara.pasaje.miro": "Ahora me quedo mirando por la ventanilla hasta que toquemos la pista.",
  "inicio.ara.pasaje.cerquita": "¡El mar está cada vez más cerquita! Ya falta poquito para la pista.",
  "inicio.ara.pasaje.yaCasi": "¡Ya casi! Las ruedas están por tocar la pista.",
  "inicio.ara.pasaje.cinturonQuieto": "¡Todavía no me saco el cinturón! Hay que esperar a que se apague la luz.",
  "inicio.ara.pasaje.despacito": "Ahora vamos despacito por el suelo, como un auto, hasta nuestro lugar.",
  "inicio.ara.pasaje.repaso": "¡Qué lindo fue! Las nubes por dentro, el mar enorme y las islas con montañas.",
  "inicio.tripulacion.pasaje.cerca.adios":
    "¡Hasta pronto, y gracias por volar con nosotros! Ahora ya sabes un montón de cosas de los aviones.",
  /*
   * **Quién habla, para quien no ve la cara**, y lo que enseña cada dibujo de
   * la ventanita, para quien no lo ve. No se graban: son de la pantalla.
   */
  "inicio.modo.tripulante": "La tripulante de cabina, a tu lado",
  "inicio.dibujo.cinturon": "El cinturón: se abrocha hasta el clic, se ajusta y se suelta levantando la tapa.",
  "inicio.dibujo.salidas": "Las salidas del avión y las luces del pasillo que llevan hasta ellas.",
  "inicio.dibujo.mascara": "Las máscaras de oxígeno: primero se la pone quien es grande, y después ayuda.",
  "inicio.dibujo.chaleco": "El chaleco salvavidas, debajo del asiento: se infla fuera del avión.",
  "inicio.dibujo.tarjeta": "La tarjeta de seguridad, en el bolsillo del asiento de delante.",
  "inicio.dibujo.modo-avion": "El teléfono en modo avión.",
  "inicio.dibujo.persiana": "La persiana subida para despegar: así se ve afuera.",
  "inicio.dibujo.nube": "Una nube de cerca: gotitas de agua abajo y cristalitos de hielo arriba.",
  "inicio.dibujo.ala": "El ala empuja el aire hacia abajo y el aire la empuja hacia arriba.",
  "inicio.dibujo.alto": "El avión, más alto que el Teide y más rápido que un auto.",
  "inicio.dibujo.motor": "El motor por dentro: traga aire, lo calienta y lo echa para atrás.",
  "inicio.dibujo.frio": "Afuera, bajo cero; adentro, calentito.",
  "inicio.dibujo.islas": "Los volcanes que crecen desde el fondo del mar hasta ser islas.",
  "inicio.dibujo.ruta": "El camino del avión, de Tenerife a La Palma, y la torre por radio.",
  "inicio.dibujo.oido": "El oído: al bajar el aire empuja, y al tragar o bostezar se destapa.",
  "inicio.dibujo.papi": "Las cuatro luces al lado de la pista: dos blancas y dos rojas.",
  "inicio.dibujo.estrellas": "Los telescopios en lo alto de La Palma, mirando las estrellas.",
  "inicio.dibujo.meneo": "Dentro de la nube, el aire sube y baja, las alas se doblan un poco y el cinturón va puesto.",
  "inicio.dibujo.techo": "La base de las nubes, el avión justo debajo, lo que falta hasta el mar y lo lejos que se ve.",
  /*
   * **El kit de viaje** (punto 275 de la lista de Enrique): la tripulante se
   * lo trae a Ara en la bajada, que es el tramo largo, con dos juegos dentro,
   * y antes de aterrizar pide guardarlo. Lo suyo, con el tú de Canarias; lo de
   * Ara y lo de los juegos, de vos, que es Ara quien juega con quien va a su
   * lado. Lo que se dice de cada pieza es lo de verdad: el ala empuja el aire
   * hacia abajo y el aire la empuja hacia arriba (AGENTS.md, regla 4); la
   * deriva lleva el avión derecho como las plumas de una flecha y el timón
   * le mueve la nariz a los lados. Ver `src/flight/kit-de-viaje.ts` y el ADR
   * 0020.
   */
  "inicio.tripulacion.pasaje.cerca.kitAqui":
    "¡Mira lo que te traigo: tu kit de viaje, con dos juegos dentro! Siempre llevamos unos cuantos a bordo.",
  "inicio.tripulacion.pasaje.cerca.kitRato":
    "Volar es apasionante, pero los vuelos duran un ratito. Con esto, el rato hasta La Palma se te pasa volando.",
  "inicio.ara.pasaje.kitGracias": "¡Gracias! ¿Jugamos? Tocá la mochilita y elegimos uno de los juegos.",
  "inicio.ara.pasaje.kit.elegir":
    "Hay dos juegos: ser la torre del aeropuerto o armar aviones de verdad, pieza por pieza. ¿Cuál querés?",
  "inicio.ara.pasaje.kit.piezas.empezar": "¿Me ayudás a armar el avión? Agarrá cada pieza y llevala a su lugar.",
  "inicio.ara.pasaje.kit.piezas.ala": "¡El ala! Empuja el aire para abajo, y el aire la empuja para arriba: así nos sostiene.",
  "inicio.ara.pasaje.kit.piezas.motor":
    "¡El motor! Traga aire por adelante y lo echa para atrás con mucha fuerza: así el avión va para adelante.",
  "inicio.ara.pasaje.kit.piezas.cola":
    "¡La cola! Lleva al avión derechito, como las plumas de una flecha, y su timón le mueve la nariz a los costados.",
  "inicio.ara.pasaje.kit.piezas.ruedas":
    "¡Las ruedas! Son para correr por la pista y para aterrizar. Volando, se guardan adentro del avión.",
  "inicio.ara.pasaje.kit.piezas.ayuda": "¡Casi! Esa pieza va en otro lugar del avión: mirá el que brilla.",
  "inicio.ara.pasaje.kit.piezas.fin": "¡Armamos el avión entero! Con ala, motor, cola y ruedas, ya puede volar.",
  /*
   * **Armá tu avión** (puntos 289, 290 y 304): un avión de la flota por nivel.
   * Lo que se dice al despegar cada uno es lo que tiene de suyo, y es lo de
   * verdad: el estabilizador con su timón de profundidad sube y baja la nariz;
   * las luces de navegación, roja a la izquierda, verde a la derecha y blanca
   * atrás, y quien ve la roja y la verde a la vez tiene el otro avión de frente
   * (14 CFR 25.1385 y 25.1387); el biplano Ag Cat lleva rueda de cola; un
   * bimotor sigue volando con un motor; la cola en T saca el estabilizador de
   * la estela del ala y de las hélices; los motores colgados descargan el ala
   * y se alcanzan sin desmontar nada; y los trenes de muchas ruedas reparten
   * el peso sobre la pista. Ver `src/flight/kit-de-viaje.ts`.
   */
  "inicio.ara.pasaje.kit.avion.estabilizador":
    "¡El estabilizador! Es un ala más corta, atrás en la cola, y con su timón el avión sube o baja la nariz.",
  "inicio.ara.pasaje.kit.avion.luces":
    "Ahora las luces: la roja va en la punta del ala izquierda, la verde en la derecha y la blanca atrás.",
  "inicio.ara.pasaje.kit.avion.noche":
    "De noche, con las luces, otro avión sabe para dónde vamos: si ve la roja y la verde a la vez, es que vamos hacia él.",
  "inicio.ara.pasaje.kit.avion.biplano":
    "¡Un biplano! Tiene dos alas, una arriba y otra abajo, y su ruedita no va en la nariz: va en la cola.",
  "inicio.ara.pasaje.kit.avion.bimotor":
    "Este lleva un motor en cada ala. Si uno se apaga, el otro sigue empujando y el avión puede seguir volando.",
  "inicio.ara.pasaje.kit.avion.colaEnT":
    "¡La cola en T! El estabilizador va arriba de todo, lejos del aire revuelto del ala y de las hélices.",
  "inicio.ara.pasaje.kit.avion.reactor":
    "¡Como el nuestro! Los motores cuelgan debajo del ala: su peso ayuda a que el ala no se doble tanto, y se llega fácil para cuidarlos.",
  "inicio.ara.pasaje.kit.avion.cuatrimotor":
    "¡Cuatro motores y un montón de ruedas! Tantas ruedas reparten el peso, para no romper la pista.",
  "inicio.tripulacion.pasaje.cerca.kitGuardar":
    "Ahora guarda el kit en el bolsillo del asiento, que vamos a aterrizar: todo bien recogido.",
  /*
   * **Lo que se ve, cuando pasa** (18-10-2026, puntos 280, 282 y 295 de la
   * lista de Enrique). Todo comprobado, y nada que diga si Ara es niño o niña.
   *
   * - **Dentro de la nube, el meneo**: el aire de dentro de la nube sube y
   *   baja, y las alas están hechas para doblarse un poco, así que se mueven;
   *   por eso se lleva el cinturón. Lo cuenta la comandante con calma, para
   *   todo el pasaje: de los baches y del cinturón se habla también subiendo.
   * - **El Teide, presentado** la primera vez que se nombra: un volcán, la
   *   montaña más alta de España, de unos 3.715 m (MITECO, Parque Nacional
   *   del Teide; ver `docs/historias/fuentes.md`).
   * - **Por debajo de las nubes**: su parte de abajo es la base, y cuando
   *   tapan más de medio cielo se llama techo —la definición de la OACI—; los
   *   números van solo cuando son los de hoy, y la visibilidad se mide en
   *   kilómetros. Lo cuenta la tripulante, en persona y con el tú de
   *   Canarias: la comandante, por debajo de los diez mil pies, solo habla
   *   del vuelo.
   */
  "inicio.ara.pasaje.meneo": "¡Uy, el avión se mueve un poquito! Y el ala sube y baja, como si saludara.",
  "inicio.mama.pasaje.meneo":
    "Señores pasajeros, les habla la comandante. Lo que notan es el aire de dentro de la nube, que sube y baja: es normal. Las alas están hechas para doblarse un poco, y por eso se mueven. Y por eso llevamos el cinturón abrochado.",
  "inicio.ara.pasaje.meneoBien": "¡Entonces es normal que se mueva! Y yo llevo el cinturón puesto, bien ajustado.",
  "inicio.mama.pasaje.teide":
    "Señores pasajeros, para quienes no lo conozcan: el Teide es el volcán de Tenerife, y con sus tres mil setecientos quince metros es la montaña más alta de España.",
  "inicio.ara.pasaje.bajoLasNubes":
    "¡Salimos por abajo de las nubes! Ahora las tenemos arriba, como un techo, y abajo se ve lejísimos.",
  "inicio.tripulacion.pasaje.cerca.techo":
    "¿Ves? La parte de abajo de las nubes se llama base. Y cuando tapan más de medio cielo, los pilotos la llaman techo.",
  "inicio.tripulacion.pasaje.cerca.techoHoy":
    "Hoy la base está a unos cinco mil pies, mil quinientos metros. Vamos justo debajo, así que hasta el mar nos falta más o menos eso.",
  "inicio.tripulacion.pasaje.cerca.visibilidad":
    "Por debajo se ve lejísimos, más de diez kilómetros: eso es la visibilidad. Para aterrizar, los pilotos tienen que ver la pista a tiempo.",
  "inicio.ara.pasaje.techo":
    "Mamá me enseñó que la parte de abajo de las nubes se llama base, ¡y que para aterrizar hay que ver la pista a tiempo!",
  "inicio.ara.pasaje.marDeNubes":
    "¡Mirá para abajo: nubes y más nubes, como un mar de algodón! Por eso le dicen mar de nubes.",
  "inicio.ara.pasaje.sigueLaNube":
    "Seguimos adentro de la nube y el avión se mueve un poquito. ¡Pero ya sé que es normal, y tengo el cinturón puesto!",
  /*
   * **La siesta de Ara** (punto 304): arriba y sin nada que contar, Ara
   * bosteza con el ruidito de los motores y se duerme un ratito; al despertar,
   * el mapa de la ruta de la ventanita enseña que el avión siguió su camino.
   * Y para bajar despierta a Ara la tripulante, por lo que es: el cinturón, y
   * que durmiendo se traga mucho menos saliva, y al bajar la presión de la
   * cabina empuja los oídos. Es el consejo de los médicos: no dormirse para
   * despegar ni para aterrizar (Mayo Clinic, «Airplane ear»). Lo de Ara, de
   * vos; lo de la tripulante, con el tú de Canarias. Nada que diga si Ara es
   * niño o niña.
   */
  "inicio.ara.pasaje.dormirse": "¡Aaah, qué sueño me da el ruidito del motor! Voy a cerrar los ojos un ratito.",
  "inicio.tripulacion.pasaje.cerca.despertar":
    "Despierta, que vamos a empezar a bajar: el cinturón bien puesto. Durmiendo se traga menos saliva, y al bajar los oídos lo notan.",
  "inicio.ara.pasaje.despertarse": "¡Uy, me dormí un ratito! Y mientras tanto, el avión siguió volando por su camino.",
  // Para quien no ve la pantalla: no se graba.
  "inicio.siesta": "Ara duerme un ratito y sueña, mientras el avión sigue su camino.",
  /*
   * **Lo que se oye cambiar, contado** (puntos 284 y 297). Los motores de un
   * reactor suenan distinto en cada tramo, y es de lo que más asusta a quien
   * vuela por primera vez: el gas de subida a los mil quinientos pies, el
   * ralentí al empezar a bajar y el empuje que sube con el tren y los flaps
   * fuera. Ara lo nota cuando pasa, y lo explica quien puede: la comandante
   * por la megafonía, pasados los diez mil pies o ya en tierra. Y el plop de
   * los oídos al subir, por la tripulante en persona cuando llega con el
   * servicio: la presión de la cabina
   * baja, el aire de dentro del oído sale, y tragar o bostezar ayuda a
   * igualarla; al bajar es al revés, el aire tiene que entrar. Ver
   * `src/flight/inicio-pasaje.ts`. Lo de Ara, de vos; lo de la tripulante, con
   * el tú de Canarias; la megafonía, de usted. Nada que diga si Ara es niño o
   * niña.
   */
  "inicio.ara.pasaje.menosGas": "¡Escuchá! Ahora los motores suenan más bajito, y seguimos subiendo igual.",
  "inicio.mama.pasaje.menosGas":
    "Para quienes vuelan hoy por primera vez: al poco de despegar quitamos un poco de gas, y los motores sonaron más bajito. Para subir no hace falta tanta fuerza como para despegar.",
  "inicio.tripulacion.pasaje.cerca.plop1":
    "Y al subir, ¿te hicieron plop los oídos? Es normal: la presión del aire de la cabina baja, y el aire que tienes dentro del oído sale.",
  "inicio.tripulacion.pasaje.cerca.plop2":
    "Eso es el plop. Si lo notas, traga saliva o bosteza: así la presión de dentro del oído se iguala con la de la cabina.",
  "inicio.ara.pasaje.ralenti": "¡Los motores suenan todavía más bajito! ¿Será que ya empezamos a bajar?",
  "inicio.ara.pasaje.oidosAlReves": "¡Ahora se me tapan un poco los oídos! Es al revés que al subir: el aire tiene que entrar.",
  "inicio.ara.pasaje.masGas": "¡Ahora los motores suenan más fuerte! ¿Para qué, si ya vamos a aterrizar?",
  "inicio.mama.pasaje.masGas":
    "Y un poco antes de tocar, los motores sonaron más fuerte: con las ruedas y los flaps fuera, el avión frena mucho, y hace falta más fuerza para no perder velocidad.",
  /*
   * **La vuelta en la pista de La Palma** (punto 300): Ara lo nota cuando el
   * avión gira en la punta, y la comandante lo explica en cuanto deja la
   * pista libre. Las salidas de La Palma están todas en la mitad sur, y por
   * delante de la C ya no hay ninguna; en la punta, el ensanche de viraje; y
   * para ir por la pista al revés hace falta permiso de la torre, que con la
   * pista ocupada no puede aterrizar nadie. AIP España, AD 2-GCLA: ver
   * `docs/historias/fuentes.md`.
   */
  "inicio.ara.pasaje.vueltaEnPista": "¡Estamos dando la vuelta en la pista! Volvemos por el mismo camino.",
  /*
   * **Los aerofrenos al tocar** (punto 296), contados por Ara en el primer rato
   * tranquilo rodando. Lo mismo que dice la instructora en los vuelos de
   * pilotar —`vuelo.salenLosFrenosDeTierra`—: el ala deja de sostener el avión
   * y las ruedas frenan.
   */
  "inicio.ara.pasaje.golpecito":
    "¿Notaste el golpecito al tocar? Es a propósito: así las ruedas agarran bien y el avión no se pasa de largo.",
  "inicio.ara.pasaje.aerofrenos":
    "¿Viste el ala cuando tocamos el suelo? Se le levantaron unas tapas por arriba: son los aerofrenos.",
  "inicio.ara.pasaje.aerofrenosPorque":
    "Mamá me contó que así el ala deja de sostener al avión: el avión se queda pegado al suelo y las ruedas frenan bien.",
  "inicio.mama.pasaje.vueltaEnPista":
    "Señores pasajeros: dimos la vuelta en la pista porque las salidas hacia la terminal nos quedaron atrás, y más adelante no hay ninguna. Al final de la pista hay un ensanche para dar la vuelta.",
  "inicio.mama.pasaje.permisoDeVuelta":
    "Para ir por la pista al revés hace falta permiso de la torre de control: mientras vamos por ella, nadie más puede aterrizar ni despegar.",
  /*
   * **Los que se levantan antes de tiempo, y lo que es la tripulación**
   * (punto 303). Parados en el puesto, alrededor se oyen hebillas y gente
   * levantándose con la luz todavía encendida; Ara lo oye y sigue en su
   * asiento —«todavía no», que ya estaba—, y se suelta con el *ding*. La
   * tripulante, ya de pie, se lo agradece y cuenta por qué: el avión podía
   * frenar de golpe y lo de arriba se pudo mover. Y su cara seria: está
   * trabajando, que lo suyo es la seguridad. Sin regañar a nadie.
   *
   * Y lo que sabe hacer, en la bajada: primeros auxilios y RCP con el
   * desfibrilador de a bordo, fuego y humo, evacuar el avión en noventa
   * segundos y los chalecos en el agua —Reglamento (UE) 1178/2011, Parte CC;
   * CS 25.803; ver `docs/historias/fuentes.md`—. Contado como lo que sabe
   * hacer, no como algo que vaya a pasar. La tripulante, con el tú de
   * Canarias y sin decir nada que diga si Ara es niño o niña.
   */
  "inicio.ara.pasaje.seLevantan": "¡Escuchá! Hay gente que ya se suelta el cinturón y se levanta.",
  "inicio.ara.pasaje.luzApagada": "¡Se apagó la luz del cinturón! Ahora sí me lo saco: ¡clic!",
  "inicio.tripulacion.pasaje.cerca.gracias":
    "¡Gracias por esperar con el cinturón hasta que se apagó la luz! Mientras el avión se mueve, todavía puede frenar de golpe.",
  "inicio.tripulacion.pasaje.cerca.maleteros":
    "Y al abrir los compartimentos de arriba hay que tener cuidado: las maletas se pudieron mover en el vuelo, y se pueden caer.",
  "inicio.tripulacion.pasaje.cerca.seria":
    "¿Y sabes por qué al aterrizar ponemos cara seria? Porque estamos trabajando, y lo primero es la seguridad. Yo también voy con el cinturón puesto hasta que el avión para: por eso lo recordamos por el altavoz.",
  "inicio.tripulacion.pasaje.cerca.oficio1":
    "¿Sabes qué? Lo más importante de mi trabajo no es traer agua: es la seguridad. Sé cuidar a alguien que se pone malo, y hasta ayudar a su corazón con el desfibrilador que llevamos a bordo.",
  "inicio.tripulacion.pasaje.cerca.oficio2":
    "Y sé apagar un fuego con la capucha para el humo puesta, sacar a todo el mundo del avión en noventa segundos y usar los chalecos en el agua. Lo practicamos todos los años.",
  "inicio.ara.pasaje.uniforme": "¡Entonces tu uniforme no es para servir: es para cuidarnos a todos!",
  /*
   * **El baño de Ara** (punto 293): la luz manda, y cuando se apaga, se puede.
   * Antes de subir, en el embarque; la pregunta, rodando, con la luz encendida
   * —`inicio.ara.pasaje.bano`, más arriba—; el viaje, arriba, con la luz
   * apagada, y bajando, que fue a tiempo; y si no hubo rato, esperar sin
   * drama. Al final del bloque, que lo grabado no se renumera. Ver
   * `puedeIrAlBano` en `flight/inicio-pasaje.ts`.
   */
  "inicio.ara.pasaje.banoAntes": "Antes de subir fui al baño: mamá dice que en los vuelos cortos casi no da tiempo.",
  "inicio.tripulacion.pasaje.cerca.banoLuz":
    "¡Claro que hay! Pero con la luz del cinturón encendida no se levanta nadie. Cuando se apague, te acompaño.",
  "inicio.tripulacion.pasaje.cerca.banoAhora":
    "Ya se apagó la luz del cinturón: ahora sí se puede ir al baño. ¡Vamos, te acompaño!",
  "inicio.ara.pasaje.banoVuelta": "¡Ya volví del baño! Y me abroché otra vez el cinturón, como dijo mamá.",
  "inicio.tripulacion.pasaje.cerca.banoATiempo":
    "¿Ves? Fuiste justo a tiempo: ahora, con la luz encendida, ya no se levanta nadie hasta aterrizar.",
  "inicio.ara.pasaje.banoEspero": "Con la luz del cinturón encendida, espero a que aterricemos. ¡Ya falta poquito!",
  /*
   * **Lo que se pregunta después de la demostración** (puntos 312 y 313), en
   * la revisión de cinturones, que es cuando la tripulante está al lado de
   * Ara: que las máscaras y el chaleco son por si acaso —no se llevan
   * puestas—, y que muchos aviones llevan salidas sobre el ala, pero este no: las suyas son las puertas.
   * Y el viento de hoy, que la comandante cuenta rodando: con el alisio del
   * nordeste, la 12 es la que lo tiene por delante.
   */
  "inicio.ara.pasaje.mascaraAhora": "¿Hay que ponerse la máscara ahora?",
  "inicio.tripulacion.pasaje.cerca.mascaraAhora":
    "No, no: solo caen si el aire de dentro del avión se escapara, y eso pasa poquísimas veces. Si no caen, no hacen falta. Te lo explicamos por si acaso, como el chaleco: ese solo se usa si el avión se posara en el agua.",
  "inicio.ara.pasaje.salidaAla": "¿Y por la ventanilla no se sale, sobre el ala?",
  "inicio.tripulacion.pasaje.cerca.salidaAla":
    "En muchos aviones, sí: tienen ventanillas de salida sobre el ala, con su letrero encima. En este, las salidas son las puertas.",
  "inicio.mama.pasaje.viento":
    "Hoy el viento viene del noreste, y los aviones despegan, siempre que pueden, con el viento por delante: así suben antes. Por eso salimos hacia el este, y luego damos la vuelta hacia La Palma.",
  /*
   * **Luz verde**, el tercer juego del kit (punto 304): quien juega es la
   * torre de La Palma. Las señales son las de SERA (Reglamento UE 923/2012,
   * apéndice 1, 3) y el Anexo 2 de la OACI, y el avión contesta como de verdad:
   * de día alabeando, salvo en base y en final; de noche, con los faros. Lo
   * primero que se dice es que la lámpara es el plan B: lo normal es la radio.
   * Y el «al aire» se celebra con la frase de la canción, «irse al aire también
   * es saber volar». Ver `src/flight/luz-verde.ts`.
   */
  "inicio.ara.pasaje.kit.luz.radio":
    "Los aviones hablan con la torre por radio. Si a uno se le rompe, la torre le habla con una linterna de colores.",
  "inicio.ara.pasaje.kit.luz.empezar":
    "Ahora la torre sos vos: tocá el avión sin radio y dale luz verde para aterrizar, o roja para que espere.",
  "inicio.ara.pasaje.kit.luz.alas": "¡Movió las alas! Así contesta el avión que vio la luz.",
  "inicio.ara.pasaje.kit.luz.sinAlas": "En la base y en la final no mueve las alas: ahí tiene que ir derechito a la pista.",
  "inicio.ara.pasaje.kit.luz.roja": "¡Luz roja! Da otra vuelta y espera su turno: esperar también es volar bien.",
  "inicio.ara.pasaje.kit.luz.alAire":
    "La pista estaba ocupada y se fue al aire solo. ¡Bien! Irse al aire también es saber volar.",
  "inicio.ara.pasaje.kit.luz.conRadio": "Ese tiene la radio bien: habla con la torre y aterriza sin linterna. Eso es lo normal.",
  "inicio.ara.pasaje.kit.luz.fin": "¡Aterrizaron todos! Con la linterna de colores, como en una torre de verdad.",
  "inicio.ara.pasaje.kit.luz.destellosRojos":
    "Hay un camión revisando la pista. Con la roja que parpadea, el avión sabe que no puede aterrizar.",
  "inicio.ara.pasaje.kit.luz.destellosVerdes":
    "Ya se fue el camión. Con la verde que parpadea, el avión sabe que puede volver para aterrizar.",
  "inicio.ara.pasaje.kit.luz.noche":
    "De noche no se ven las alas: el avión contesta apagando y encendiendo dos veces los faros.",
  /*
   * **Lo que se reconoce al llegar a La Palma** (punto 314): la ladera de
   * Villa de Mazo, por la ventanilla de Ara en la final de la 36, y su nombre
   * dicho por la comandante con la pista ya libre. Se nombran sitios, no
   * negocios. Ver la charla `mazo` en `flight/inicio-pasaje.ts`.
   *
   * Los caminitos, desde que las teselas se leen con filtro anisótropo: antes
   * la ladera, vista casi rasante, se emborronaba en una mancha y no se
   * decían. Son los de la ortofoto del PNOA. Ver `ANISOTROPIA` en
   * `world/teselas-de-ortofoto.ts`.
   */
  "inicio.ara.pasaje.mazo": "¡Ya se ven las fincas y las casitas, ahí en la ladera del monte!",
  "inicio.ara.pasaje.mazoCaminos": "¡Y se ven los caminitos que suben entre las fincas!",
  "inicio.ara.pasaje.mazoBici": "Seguro que por ahí sube gente caminando, y en bici.",
  "inicio.mama.pasaje.mazo":
    "Señores pasajeros: ese pueblo de la ladera que vieron por la izquierda al llegar es Villa de Mazo.",
  /*
   * **Por qué ponen música al bajar**: para que el rato sea tranquilo y
   * calmar los nervios, y muchas compañías eligen música de su tierra. Que
   * tape ruidos no lo dice ninguna fuente, y no se dice. Ver
   * `docs/historias/fuentes.md`.
   */
  "inicio.ara.pasaje.musica": "¡Están poniendo música! ¿Por qué ponen música cuando bajamos?",
  "inicio.tripulacion.pasaje.cerca.musica":
    "Para que el ratito de bajar sea un rato de calma, sin nervios. Y muchas compañías ponen música de su tierra: esta es de Canarias.",
  /*
   * **La ventanilla viva** (19-10-2026): se toca lo que se ve por la
   * ventanilla y te lo cuentan. Ara invita una vez y dice lo suyo de lo que
   * toca; lo demás —el Teide, la isla, Mazo, el mar de nubes, el ala— son sus
   * frases de siempre, y la tripulante cuenta las suyas. Ver
   * `flight/lo-que-se-toca.ts`. Que en La Gomera se habla silbando es el
   * silbo gomero, el de la historia de la comandante.
   */
  "inicio.ara.pasaje.toque.invita": "¡Mirá por la ventanilla! Si tocás algo con el dedo, te cuento lo que es.",
  "inicio.ara.pasaje.toque.motor": "¡Ese es el motor! Por adelante se traga el aire, y por atrás lo tira con fuerza.",
  "inicio.ara.pasaje.toque.gomera": "¡Esa isla redondita es La Gomera! Mamá dice que ahí se puede hablar silbando.",
  "inicio.ara.pasaje.toque.mar": "¡Todo eso de abajo es el mar! Y entre isla e isla hay muchísima agua.",
  // El cuaderno de viaje: lo que es de la pantalla y no se graba, para quien no ve los dibujos.
  "inicio.viaje.titulo": "Lo que viste por la ventanilla",
  "inicio.viaje.sello.motor": "El motor",
  "inicio.viaje.sello.ala": "El ala y sus flaps",
  "inicio.viaje.sello.nubes": "El mar de nubes",
  "inicio.viaje.sello.teide": "El Teide",
  "inicio.viaje.sello.gomera": "La Gomera",
  "inicio.viaje.sello.palma": "La Palma",
  "inicio.viaje.sello.ruedas": "Las ruedas",
  "inicio.viaje.sello.mazo": "Villa de Mazo",
  // Lo que es de la pantalla y no se graba: para quien no ve los dibujos.
  "inicio.kit.nombre": "Kit de viaje",
  "inicio.kit.abrir": "Abrir el kit de viaje",
  "inicio.kit.cerrar": "Guardar el kit",
  "inicio.kit.elegir": "Volver a los juegos",
  "inicio.kit.avion": "Armá tu avión",
  "inicio.kit.pieza.ala": "El ala",
  "inicio.kit.pieza.alaArriba": "El ala de arriba",
  "inicio.kit.pieza.alaAbajo": "El ala de abajo",
  "inicio.kit.pieza.motor": "El motor",
  "inicio.kit.pieza.cola": "La cola",
  "inicio.kit.pieza.estabilizador": "El estabilizador",
  "inicio.kit.pieza.deriva": "La deriva",
  "inicio.kit.pieza.trenPrincipal": "Las ruedas grandes",
  "inicio.kit.pieza.trenMorro": "La rueda de la nariz",
  "inicio.kit.pieza.trenCola": "La ruedita de la cola",
  "inicio.kit.pieza.roja": "La luz roja",
  "inicio.kit.pieza.verde": "La luz verde",
  "inicio.kit.pieza.blanca": "La luz blanca",
  "inicio.kit.pieza.otraBlanca": "La otra luz blanca",
  "inicio.kit.pausa": "Habla la megafonía: escuchá",
  "inicio.kit.luz": "Luz verde: la torre sos vos",
  "inicio.kit.luz.verde": "Luz verde fija: puede aterrizar",
  "inicio.kit.luz.roja": "Luz roja fija: que dé otra vuelta",
  "inicio.kit.luz.verde-destellos": "Destellos verdes: que vuelva para aterrizar",
  "inicio.kit.luz.roja-destellos": "Destellos rojos: que no aterrice",
  "inicio.kit.luz.conRadio": "Avión con la radio bien",
  "inicio.kit.luz.sinRadio": "Avión con la radio rota: pide luz",
} as const;
