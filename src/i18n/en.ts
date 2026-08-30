/**
 * English.
 *
 * Not an afterthought for foreign visitors: aviation runs in English
 * worldwide. Someone who learns to fly here and later flies for real will
 * meet these words in a cockpit, in a chart and on the radio, so they may as
 * well meet them here first. See AGENTS.md, rule 3.
 *
 * The instrument labels on the HUD (IAS, ALT, HDG, V/S, THR) are not in this
 * file: they are the same in every language, exactly as they are in a real
 * aircraft. What this dictionary carries is the plain-words gloss underneath.
 */

import type { Dictionary } from './index';

export const EN: Dictionary = {
  'app.title': 'Óga Veve',
  'app.tagline': 'Fly over Paraguay',

  'hud.speed': 'Airspeed',
  'hud.altitude': 'Altitude',
  'hud.heading': 'Heading',
  'hud.throttle': 'Throttle',
  'hud.vspeed': 'Vertical speed',
  'hud.stall': 'Stall! Lower the nose',
  'hud.brakes': 'Brakes',
  'hud.crashed': 'Something broke. Back to the runway…',
  'hud.ground': 'On the ground',

  'mode.label': 'Flight assist',
  'mode.arcade': 'Arcade',
  'mode.pilot': 'Pilot',
  'mode.changed': 'Flight assist: {mode}',

  'units.kmh': 'km/h',
  'units.metres': 'm',
  'units.mps': 'm/s',
  'units.knots': 'kt',
  'units.feet': 'ft',
  'units.fpm': 'ft/min',

  'aircraft.oga172.description': 'Trainer. Steady and forgiving.',
  'aircraft.kuarahy.description': 'Crop duster biplane. Nimble and strong.',

  'scenario.valle.name': 'Cordillera Valley',
  'scenario.chaco.name': 'Chaco Plain',

  'help.title': 'How to fly',
  'help.pitch': 'Arrows or W A S D — climb, descend and turn',
  'help.rudder': 'Q and E — rudder',
  'help.throttle': 'Shift and Ctrl — throttle',
  'help.brakes': 'B — brakes',
  'help.camera': 'C — change view',
  'help.assist': 'M — flight assist',
  'help.reset': 'R — start again',
  'help.credits': 'F1 — credits',
  'help.language': 'L — language',
  'help.start': 'Throttle all the way up, then ease back when she runs',

  'credits.title': 'Credits',
  'credits.madeBy': 'An Oksigenia SL product, under the Granja Óga brand.',
  'credits.educational':
    'Free forever for Paraguayan education: schools, teachers, pupils and families. No paperwork, no payment.',
  'credits.terrain': 'Relief from NASADEM data (NASA), public domain.',
  'credits.engine': 'Flight model: {model}',
  'credits.licence': 'Code free under Apache-2.0. Content and brands, © Oksigenia SL.',
  'credits.close': 'Close',

  'language.label': 'Language',
  'language.changed': 'Language: {name}',
};
