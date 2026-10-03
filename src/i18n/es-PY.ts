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
  "hud.landedSoft": "¡Qué aterrizaje! Suavecito",
  "hud.landedFast": "¡Muy rápido! Bajá el motor antes de tocar",
  "hud.landedFirm": "Aterrizaje firme. Ya estás abajo",
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
  "torre.canario.destino": "{indicativo}, autorizado a {destino}",
  /*
   * **Y en España se sube con «suba»**, no con «ascienda»: es la palabra del
   * anexo V del RD 1180/2018 —«SUBA A (nivel)», 1.1.2—. Lo que cambia aquí
   * no es el acento, es el reglamento. Los niveles, cifra a cifra como en
   * todas partes (SERA.14035, al que remite el RCA en 10.5.2.1.3).
   */
  "torre.canario.subir": "{indicativo}, suba a {altura}",
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
  /*
   * **Las máscaras**, que caen solas: lo que dice cualquier tripulación, con
   * «primero la suya» dentro. Al pasaje, de usted. En Canarias, «mascarilla»,
   * que es como se llama allí.
   */
  "tripulacion.mascaras":
    "Señoras y señores: tiren de la máscara hacia ustedes, pónganla sobre la nariz y la boca y respiren normal. Primero la suya, y después ayuden a los demás. Vamos a bajar a una altura donde se respira bien.",
  "tripulacion.canario.mascaras":
    "Señoras y señores: tiren de la mascarilla hacia ustedes, colóquensela sobre la nariz y la boca y respiren con normalidad. Pónganse primero la suya y luego ayuden a quien lo necesite. Vamos a bajar a una altura donde se respira bien.",
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
   * desde el segundo peldaño. La frase hablada todavía no está grabada: ver
   * `PENDIENTE-VOCES-noche.md`.
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
  "palabra.rapido": "Muy rápido",
  "palabra.fuera": "Fuera",
  "palabra.corto": "Corto",
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
  "vuelo.autorizadoAfis": "La pista está libre: entrá cuando estés listo",
  "vuelo.backTaxi": "Andá hasta el fondo y dá la vuelta",
  "vuelo.alineando": "Ponete derechito en el eje",
  "vuelo.minimos": "Mirá la pista: ¿la ves?",
  "vuelo.noEstabilizada": "Así no: andate y volvé a intentarlo",
  "motivo.sinPista": "No se ve la pista",
  "motivo.lento": "Vas muy despacio",
  "motivo.cayendo": "Estás cayendo muy rápido",
  "motivo.rapido": "Vas muy rápido",
  "motivo.torcido": "Estás torcido",
  "motivo.descolocado": "Estás fuera del eje",
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
   * **Y qué es un rombo, la primera vez que sale uno.** No es un aviso —un
   * TCAS no avisa de quien no se acerca— sino la explicación de un dibujo
   * que aparece en la pantalla sin que nadie lo nombre: se preguntó jugando
   * si uno que se cruzaba era peligroso o no. El rombo hueco con su «+10» ya
   * lo decía, pero eso hay que saber leerlo. Ver `explicarElTrafico` en
   * `game.ts`.
   */
  "vuelo.traficoArriba":
    "Ese rombo de la pantalla es otro avión. Va más alto que nosotros: no nos molesta",
  "vuelo.traficoAbajo":
    "Ese rombo de la pantalla es otro avión. Va más bajo que nosotros: no nos molesta",
  "vuelo.traficoNivel":
    "Ese rombo de la pantalla es otro avión. Va a nuestra altura, pero lejos: lo vamos mirando",
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
  "vuelo.alturaDeLaTorreRaya": "La torre nos dice hasta dónde subir: hasta la raya de la cinta.",
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
   * Y a los mínimos sin el permiso de la torre, con la pista libre: el porqué
   * no es la pista. De momento solo en la tarjeta; la voz, cuando se grabe
   * (ver `PENDIENTE-VOCES-torre-final.md`).
   */
  /*
   * La cota de la pista de llegada, en el peldaño de los números: solo en la
   * tarjeta, con el número. Su voz está por grabar, sin él. Ver
   * `contarLaCotaDeLaPista` en `game.ts`.
   */
  "hud.cotaDeLaPista":
    "La pista a la que vamos está a {cota} sobre el mar: lo que marca el altímetro menos eso es lo alto que vas sobre ella",
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
   * hacia la isla. Sin grabar todavía: hasta que lo esté, la instructora
   * calla en esos dos tramos y hablan el dibujo y la raya. Ver
   * `PENDIENTE-VOCES-terreno.md`.
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
   * Sin grabar todavía: ver `PENDIENTE-VOCES-bajada.md`. Hasta que lo estén,
   * se dice la grabada que nombra el mismo mando y la tarjeta enseña esa misma
   * frase; éstas salen solas en cuanto tienen su grabación.
   */
  "vuelo.consejo.masGas": "Un poquito más de gas, hasta la marca rosa. La nariz, quieta.",
  "vuelo.consejo.menosGas": "Un poquito menos de gas, hasta la marca rosa.",
  "vuelo.consejo.narizAbajoPapi": "Nariz un poquito abajo, hasta ver dos blancas y dos rojas.",
  "vuelo.consejo.narizArribaPapi": "Nariz un poquito arriba, hasta ver dos blancas y dos rojas.",
  "vuelo.consejo.narizAbajoSenda": "Nariz un poquito abajo, hasta que el rombo quede en el medio.",
  "vuelo.consejo.narizArribaSenda": "Nariz un poquito arriba, hasta que el rombo quede en el medio.",
  "vuelo.consejo.narizArribaRitmo":
    "Nariz un poquito arriba: bajamos más suave, hasta la marca rosa del variómetro.",
  "vuelo.consejo.narizArribaSuave": "Nariz un poquito arriba, para bajar más suave.",
  "vuelo.consejo.aerofrenos": "Sacá un poco los aerofrenos, hasta la marca rosa.",
  // Y su palabra corta, para el peldaño que lee una palabra: el mando y hacia dónde.
  "palabra.masGas": "Más gas",
  "palabra.menosGas": "Menos gas",
  "palabra.narizArriba": "Nariz arriba",
  "palabra.narizAbajo": "Nariz abajo",
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
  "vuelo.meteElTren": "Metélo, el tren te frena",
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
  // El nombre del ejercicio, para el selector de ejercicios.
  "ejercicio.despresurizacion": "Despresurización",
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
  "vuelo.teLoPasaste": "Te pasaste. Frená y volvé",
  "vuelo.yaPodesTocar": "Ya podés tocar",
  /*
   * Lo único que se dice en los últimos veinte pies: ahí ya no hay velocidad
   * que corregir, y llegar con gas hace flotar el avión y se come la pista.
   * Ver `acompanarLaRecogida`.
   */
  "vuelo.quitaElGas": "Quitá el gas",
  "palabra.sinGas": "Sin gas",
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
  /*
   * **Y la cuenta, que esta sí sale**: en la ficha de un destino al que el
   * avión no llega, debajo del dibujo, para quien lee. Lo que pide el avión y
   * lo que tiene la pista, en metros, que es como lo pone un manual de vuelo.
   */
  "hangar.nocabe.largo": "pide {pide} m · hay {hay} m",
  "hangar.nocabe.ancho": "pide {pide} m de ancho · hay {hay} m",
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
   * Los galones. Solo los ve quien usa lector de pantalla: en la pantalla un
   * galón es un dibujo y no lleva ni una palabra, que para eso se inventó.
   */
  "tactil.palanca": "Palanca",
  "tactil.timon": "Pedales del timón",
  "tactil.motor": "Motor",
  "galon.manga": "Los galones de este vuelo",
  "galon.aproximacion": "Galón de la aproximación",
  "galon.toma": "Galón del aterrizaje",
  "galon.aros": "Galón de los aros",
  "galon.velocidad": "Galón de la velocidad",
  "galon.rodaje": "Galón del rodaje",
  "galon.frustrada": "Galón de la frustrada",

  "language.label": "Idioma",
  "language.changed": "Idioma: {name}",
} as const;
