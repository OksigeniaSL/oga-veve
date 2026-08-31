/**
 * Castellano paraguayo. Es el diccionario de referencia: cualquier clave
 * nueva se añade aquí primero.
 *
 * Registro: cercano, de tuteo, sin españolismos y sin tecnicismos. Si una
 * frase no la entendería Ña Emy, se reescribe (ver AGENTS.md).
 */

export const ES_PY = {
  'app.title': 'Óga Veve',
  'app.tagline': 'Volá sobre Paraguay',

  'hud.speed': 'Velocidad',
  'hud.altitude': 'Altura',
  'hud.heading': 'Rumbo',
  'hud.throttle': 'Motor',
  'hud.vspeed': 'Subida',
  'hud.stall': '¡Pérdida! Bajá el morro',
  'hud.pullUp': '¡El suelo! Subí',
  'hud.brakes': 'Frenos',
  'hud.crashed': 'Se rompió algo. Volvemos a la pista…',
  'hud.ground': 'En tierra',
  'hud.home': 'Pista',
  'hud.objective': 'Objetivo',

  'mode.label': 'Nivel',
  'mode.arcade': 'Arcade',
  'mode.pilot': 'Piloto',
  'mode.changed': 'Ayuda de vuelo: {mode}',
  'sound.normal': 'Sonido normal',
  'sound.bajo': 'Sonido bajo',
  'sound.mudo': 'Sin sonido',

  'units.kmh': 'km/h',
  'units.metres': 'm',
  'units.mps': 'm/s',
  'units.knots': 'kt',
  'units.feet': 'ft',
  'units.fpm': 'ft/min',

  'aircraft.oga172.description': 'Avioneta de escuela. Tranquila y perdonadora.',
  'aircraft.mainumby.description': 'Biplano fumigador. Ágil y con mucha fuerza.',

  'mission.first.name': 'Tu primer vuelo',
  'mission.valley.name': 'La vuelta al valle',
  'mission.transfer.name': 'El traslado',
  'mission.started': '{name}',
  'mission.step': '¡Bien! Seguí',
  'mission.done': '¡Misión cumplida!',
  'mission.none': 'Vuelo libre',
  'help.mission': 'N — misión',

  'scenario.valle.name': 'Valle de la Cordillera',
  'scenario.chaco.name': 'Llanura del Chaco',

  'tutor.throttle': 'Dale motor',
  'tutor.speed': 'Esperá a que corra',
  'tutor.pull': 'Tirá para arriba',
  'tutor.flying': '¡Estás volando!',
  'tutor.slow': 'Bajá el motor',

  'help.title': 'Cómo se vuela',
  'help.pitch': 'Flechas o W A S D — subir, bajar y girar',
  'help.rudder': 'Q y E — timón',
  'help.throttle': 'Más y menos — motor',
  'help.brakes': 'B o espacio — frenos',
  'help.camera': 'C — cambiar cámara',
  'help.assist': 'M — nivel de dificultad',
  'help.reset': 'R — volver a empezar',
  'help.credits': 'F1 — créditos',
  'help.language': 'L — idioma',
  'help.sound': 'V — sonido (o el botón)',
  'help.aircraft': 'P — cambiar de avión',
  'help.start': 'Empujá el motor a tope y tirá suave cuando corra',

  'teclas.title': 'Teclas',
  'teclas.hint': 'Tocá una tecla para cambiarla. Escape para dejarlo como está.',
  'teclas.pulsa': 'Apretá una tecla…',
  'teclas.restore': 'Como venía',
  'teclas.close': 'Cerrar',
  'tecla.pitchUp': 'Subir el morro',
  'tecla.pitchDown': 'Bajar el morro',
  'tecla.rollLeft': 'Girar a la izquierda',
  'tecla.rollRight': 'Girar a la derecha',
  'tecla.yawLeft': 'Timón a la izquierda',
  'tecla.yawRight': 'Timón a la derecha',
  'tecla.throttleUp': 'Más motor',
  'tecla.throttleDown': 'Menos motor',
  'tecla.brakes': 'Frenos',
  'tecla.flaps': 'Flaps',
  'tecla.camera': 'Cambiar cámara',
  'tecla.assist': 'Nivel de dificultad',
  'tecla.reset': 'Volver a empezar',
  'tecla.aircraft': 'Cambiar de avión',
  'tecla.mission': 'Cambiar de misión',
  'tecla.sound': 'Sonido',
  'tecla.language': 'Idioma',
  'tecla.credits': 'Créditos',
  'tecla.keys': 'Ver y cambiar las teclas',
  'credits.title': 'Créditos',
  'credits.madeBy': 'Un producto de Oksigenia SL, bajo la marca Granja Óga.',
  'credits.educational':
    'Gratis para siempre para toda la educación paraguaya: colegios, docentes, alumnos y familias. Sin trámites y sin pagar nada.',
  'credits.terrain': 'Relieve a partir de datos NASADEM (NASA), de dominio público.',
  'credits.engine': 'Modelo de vuelo: {model}',
  'credits.licence': 'Código libre bajo Apache-2.0. Contenido y marcas, © Oksigenia SL.',
  'credits.dedication':
    'A Guillermo Ayala, del Parque Nacional del Teide, que lleva cuarenta años enseñando esa montaña a escolares. La regla que gobierna este juego es suya: seguridad, seguridad, seguridad — a partir de ahí, todo lo demás es aprendizaje.',
  'credits.close': 'Cerrar',

  'language.label': 'Idioma',
  'language.changed': 'Idioma: {name}',
} as const;
