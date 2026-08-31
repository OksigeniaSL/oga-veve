/**
 * Cielo y luz.
 *
 * Una esfera invertida con un degradado vertical y dos luces. Nada más.
 * Un cielo físico con dispersión de Rayleigh se ve mejor en una captura y
 * cuesta caro en una tablet; el degradado con la niebla del escenario da un
 * horizonte creíble por una fracción del coste. Ver AGENTS.md, regla 3.
 */

import {
  BackSide,
  Color,
  DirectionalLight,
  Fog,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Scenario } from './scenarios';

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 horizonColour;
  uniform vec3 zenithColour;
  uniform vec3 sunColour;
  uniform vec3 sunDirection;
  uniform float offset;
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition + vec3(0.0, offset, 0.0));

    // La potencia comprime el degradado hacia el horizonte, que es donde el
    // ojo espera ver la transición. Un lerp lineal se ve plano.
    float t = pow(max(dir.y, 0.0), 0.62);
    vec3 sky = mix(horizonColour, zenithColour, t);

    // Sol y halo. Son dos potencias del mismo coseno: una muy cerrada para el
    // disco y otra muy abierta para el resplandor que lo rodea. Diez líneas
    // que cambian por completo la sensación de que hay una hora del día.
    float toSun = max(dot(dir, normalize(sunDirection)), 0.0);
    float halo = pow(toSun, 12.0) * 0.55;
    float disc = smoothstep(0.9986, 0.9994, toSun);
    sky += sunColour * halo;
    sky = mix(sky, sunColour, disc);

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export interface SkyRig {
  group: Group;
  sun: DirectionalLight;
  fog: FogExp2;
  /** Dirección desde la que viene la luz, normalizada. */
  sunDirection: Vector3;
}

export function createSky(scenario: Scenario): SkyRig {
  const group = new Group();

  const geometry = new SphereGeometry(1, 24, 16);
  const material = new ShaderMaterial({
    uniforms: {
      horizonColour: { value: new Color(scenario.sky.horizon) },
      zenithColour: { value: new Color(scenario.sky.zenith) },
      sunColour: { value: new Color(0xfff4e2) },
      sunDirection: { value: new Vector3(0, 1, 0) },
      offset: { value: 0.12 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    side: BackSide,
    depthWrite: false,
    fog: false,
  });

  const azimuth = (scenario.sun.azimuth * Math.PI) / 180;
  const elevation = (scenario.sun.elevation * Math.PI) / 180;
  const sunDirection = new Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(azimuth),
  ).normalize();
  material.uniforms.sunDirection!.value = sunDirection;

  const dome = new Mesh(geometry, material);
  // El cielo se escala en el bucle para seguir a la cámara: así nunca se
  // sale de él por mucho que se suba.
  dome.scale.setScalar(scenario.size);
  dome.renderOrder = -1;
  dome.name = 'cielo';
  group.add(dome);

  const sun = new DirectionalLight(0xfff1da, 2.9);
  sun.position.copy(sunDirection).multiplyScalar(scenario.size * 0.4);
  group.add(sun);
  group.add(sun.target);

  // Relleno hemisférico: cielo arriba, rebote del suelo abajo. Sin esto las
  // caras en sombra quedan negras y el paisaje parece de noche.
  //
  // Va flojo y con un azul pálido, no con el azul del cenit. La primera
  // versión usaba `sky.zenith` a intensidad 1.15 y el resultado era que
  // media escena se teñía de azul —el avión, que es beige, salía celeste— y
  // el relieve se aplanaba porque el relleno competía con el sol. La luz
  // direccional es la que tiene que modelar el terreno; esta solo abre las
  // sombras.
  const ambient = new HemisphereLight(0xc2dcf0, scenario.fill, 0.5);
  group.add(ambient);

  const fog = new FogExp2(scenario.fog.colour, scenario.fog.density);

  return { group, sun, fog, sunDirection };
}

/** El domo sigue a la cámara para que el horizonte no se acerque nunca. */
export function updateSky(rig: SkyRig, cameraPosition: Vector3): void {
  const dome = rig.group.getObjectByName('cielo');
  if (dome) dome.position.copy(cameraPosition);
}

export type { Fog };
