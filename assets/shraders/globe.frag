#include <flutter/runtime_effect.glsl>

uniform vec2 uSize;

uniform float uTime;
uniform float uBeatPulse;
uniform float uRotation;
uniform float uGlobeOpacity;

uniform sampler2D uBackground;
uniform sampler2D uGlobeText;
uniform sampler2D uBubble;
uniform sampler2D uAtmosphere;
uniform sampler2D uPlasma;
uniform sampler2D uBlackhole;
uniform sampler2D uLightning;
uniform sampler2D uSolarWind;
uniform sampler2D uStarWind;

out vec4 fragColor;

const float PI = 3.14159265359;
const float TWO_PI = 6.28318530718;

/* -------------------------------------------------------------
   UTILITIES
------------------------------------------------------------- */

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);

  return mat2(
    c, -s,
    s, c
  );
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);

  return fract(p.x * p.y);
}

float noise2d(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);

  local = local * local * (
    3.0 - 2.0 * local
  );

  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0, 1.0));

  return mix(
    mix(a, b, local.x),
    mix(c, d, local.x),
    local.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += noise2d(p) * amplitude;

    p = p * 2.0 + vec2(13.1, 7.7);
    amplitude *= 0.5;
  }

  return value;
}

vec3 toneMap(vec3 color) {
  color = max(color, vec3(0.0));

  color = color / (
    color + vec3(1.0)
  );

  return pow(
    color,
    vec3(0.92)
  );
}

vec3 sphereNormal(vec2 spherePosition) {
  float depth = sqrt(
    max(
      0.0,
      1.0 - dot(
        spherePosition,
        spherePosition
      )
    )
  );

  return normalize(
    vec3(
      spherePosition.x,
      spherePosition.y,
      depth
    )
  );
}

/* -------------------------------------------------------------
   CINEMATIC BACKGROUND
------------------------------------------------------------- */

vec4 sampleCinematicBackground(
  vec2 uv,
  vec2 size,
  float time,
  float beatPulse
) {
  vec2 p = uv - vec2(0.5);

  float zoom =
      1.0
      + sin(time * 0.16) * 0.012
      + beatPulse * 0.018;

  float driftX =
      sin(time * 0.11) * 0.006
      + sin(time * 0.37) * 0.002;

  float driftY =
      cos(time * 0.09) * 0.009;

  p += vec2(
    driftX,
    driftY
  );

  p *= zoom;

  float radius = length(p);

  float lensWarp =
      radius * radius
      * (0.009 + beatPulse * 0.008);

  vec2 direction = normalize(
    p + vec2(0.0001)
  );

  p += direction * lensWarp;

  vec2 backgroundUv = p + vec2(0.5);

  backgroundUv = clamp(
    backgroundUv,
    vec2(0.001),
    vec2(0.999)
  );

  return texture(
    uBackground,
    backgroundUv
  );
}

/* -------------------------------------------------------------
   MAIN
------------------------------------------------------------- */

void main() {
  vec2 fragCoord =
      FlutterFragCoord().xy;

  vec2 uv =
      fragCoord / uSize;

  /*
   * BACKGROUND
   *
   * bg.png adalah layer dasar.
   * Semua efek lain dikomposisikan di atasnya.
   */
  vec4 backgroundPixel =
      sampleCinematicBackground(
        uv,
        uSize,
        uTime,
        uBeatPulse
      );

  vec3 finalColor =
      backgroundPixel.rgb;

  float finalAlpha =
      backgroundPixel.a;

  /*
   * VIGNETTE CINEMATIC
   */
  vec2 vignettePosition =
      (uv - vec2(0.5))
      * vec2(0.82, 1.0);

  float vignette = smoothstep(
    0.92,
    0.28,
    length(vignettePosition)
  );

  finalColor *= mix(
    0.72,
    1.0,
    vignette
  );

  /*
   * Warna background sedikit diarahkan
   * ke biru-ungu cinematic.
   */
  finalColor *= vec3(
    0.94,
    0.97,
    1.06
  );

  /*
   * -----------------------------------------------------------
   * GLOBE COORDINATES
   * -----------------------------------------------------------
   */

  vec2 centered =
      uv - vec2(0.5);

  /*
   * Koreksi aspect ratio agar globe tetap bulat.
   */
  centered.x *= uSize.x / uSize.y;

  /*
   * Gambar input portrait.
   * Nilai ini dapat dinaikkan atau diturunkan
   * sesuai ukuran globe yang diinginkan.
   */
  float globeRadius =
      0.325
      + uBeatPulse * 0.010;

  vec2 globePosition =
      centered / globeRadius;

  float globeDistance =
      length(globePosition);

  /*
   * Mask halus globe.
   *
   * Di dalam globe = 1.0
   * Di luar globe = 0.0
   */
  float globeMask = 1.0 - smoothstep(
    0.975,
    1.0,
    globeDistance
  );

  float insideGlobe = step(
    globeDistance,
    1.0
  );

  /*
   * -----------------------------------------------------------
   * SPHERE ROTATION AND NORMAL
   * -----------------------------------------------------------
   */

  vec2 rotatedPosition =
      rotate2d(
        uRotation
        + uTime * 0.035
      )
      * globePosition;

  vec3 normal =
      sphereNormal(rotatedPosition);

  /*
   * -----------------------------------------------------------
   * SPHERE UV
   * -----------------------------------------------------------
   */

  float longitude = atan(
    normal.z,
    normal.x
  );

  float latitude = asin(
    clamp(
      normal.y,
      -1.0,
      1.0
    )
  );

  vec2 sphereUv = vec2(
    longitude / TWO_PI + 0.5,
    latitude / PI + 0.5
  );

  sphereUv.x = fract(
    sphereUv.x
    + uTime * 0.008
  );

  /*
   * -----------------------------------------------------------
   * GLOBE LIGHTING
   * -----------------------------------------------------------
   */

  vec3 lightDirection = normalize(
    vec3(
      -0.45,
      -0.55,
      0.90
    )
  );

  float diffuse = max(
    dot(normal, lightDirection),
    0.0
  );

  float viewFacing = max(
    normal.z,
    0.0
  );

  float rim = pow(
    1.0 - viewFacing,
    3.3
  );

  float softRim = pow(
    1.0 - viewFacing,
    1.7
  );

  vec3 warmLight = vec3(
    1.00,
    0.30,
    0.075
  );

  vec3 blueRim = vec3(
    0.08,
    0.32,
    1.00
  );

  vec3 globeLighting =
      vec3(0.24)
      + warmLight * diffuse * 0.55
      + blueRim * rim * 0.24
      + vec3(1.0, 0.40, 0.12)
        * softRim
        * 0.08;

  vec3 globeBase = vec3(
    0.055,
    0.018,
    0.025
  );

  vec3 globeColor =
      globeBase * globeLighting;

  /*
   * -----------------------------------------------------------
   * PLASMA VORTEX
   * -----------------------------------------------------------
   */

  vec2 plasmaUv =
      sphereUv;

  plasmaUv.x +=
      uTime * 0.075;

  plasmaUv.y += sin(
    plasmaUv.x * TWO_PI * 4.0
    + uTime
  ) * 0.018;

  vec4 plasmaPixel =
      texture(
        uPlasma,
        fract(plasmaUv)
      );

  float plasmaAngle = atan(
    globePosition.y,
    globePosition.x
  );

  float plasmaSpiral = sin(
    plasmaAngle * 17.0
    - globeDistance * 27.0
    - uTime * 2.2
  );

  plasmaSpiral = smoothstep(
    0.05,
    0.88,
    plasmaSpiral
  );

  float plasmaDisc = 1.0 - smoothstep(
    0.32,
    1.0,
    globeDistance
  );

  float plasmaStrength =
      plasmaSpiral
      * plasmaDisc
      * (0.30 + uBeatPulse * 0.22);

  /*
   * Plasma hanya berada di dalam globe.
   */
  plasmaStrength *= globeMask;

  /*
   * Alpha plasma.png juga digunakan,
   * sehingga area transparan plasma tidak menutupi globe.
   */
  plasmaStrength *=
      0.68
      + plasmaPixel.a * 0.32;

  vec3 plasmaProceduralColor = mix(
    vec3(0.88, 0.012, 0.30),
    vec3(1.00, 0.18, 0.025),
    plasmaSpiral
  );

  vec3 plasmaColor = mix(
    plasmaProceduralColor,
    plasmaPixel.rgb,
    0.58
  );

  globeColor = mix(
    globeColor,
    plasmaColor,
    plasmaStrength
  );

  /*
   * -----------------------------------------------------------
   * BLACK HOLE
   * -----------------------------------------------------------
   */

  vec2 blackholeUv =
      globePosition * 0.5
      + vec2(0.5);

  blackholeUv =
      rotate2d(-uTime * 0.20)
      * (blackholeUv - 0.5)
      + 0.5;

  vec4 blackholePixel =
      texture(
        uBlackhole,
        blackholeUv
      );

  float blackholeCore =
      1.0 - smoothstep(
        0.07,
        0.22,
        globeDistance
      );

  float accretionRing =
      smoothstep(
        0.18,
        0.30,
        globeDistance
      )
      * (
        1.0 - smoothstep(
          0.30,
          0.46,
          globeDistance
        )
      );

  float blackholeStrength =
      blackholeCore * 0.48
      + accretionRing
        * (0.25 + uBeatPulse * 0.16)
      + blackholePixel.a * 0.16;

  blackholeStrength *= globeMask;

  blackholeStrength = clamp(
    blackholeStrength,
    0.0,
    0.70
  );

  vec3 blackholeColor = mix(
    vec3(0.0),
    vec3(1.0, 0.10, 0.015),
    accretionRing
  );

  globeColor = mix(
    globeColor,
    blackholeColor,
    blackholeStrength
  );

  globeColor +=
      blackholePixel.rgb
      * blackholePixel.a
      * 0.10
      * globeMask;

  /*
   * -----------------------------------------------------------
   * GLOBE TEXT BABE.INFO
   * -----------------------------------------------------------
   */

  vec2 textUv =
      sphereUv;

  /*
   * Jika teks terbalik secara vertikal,
   * baris ini memperbaikinya.
   */
  textUv.y =
      1.0 - textUv.y;

  vec4 textPixel =
      texture(
        uGlobeText,
        fract(textUv)
      );

  /*
   * Opacity sengaja tidak penuh agar plasma
   * tetap terlihat melalui warna dan celah tulisan.
   */
  float textOpacity =
      0.48;

  float textPulse =
      1.0
      + uBeatPulse * 0.08;

  float textAlpha =
      textPixel.a
      * globeMask
      * textOpacity
      * textPulse;

  /*
   * Warna emas bronze.
   */
  vec3 goldBase = vec3(
    0.82,
    0.38,
    0.035
  );

  vec3 goldHighlight = vec3(
    1.00,
    0.78,
    0.20
  );

  float goldLight = clamp(
    0.42
    + diffuse * 0.42
    + rim * 0.16,
    0.0,
    1.0
  );

  vec3 goldColor = mix(
    goldBase,
    goldHighlight,
    goldLight
  );

  /*
   * Pantulan warna plasma ke permukaan tulisan.
   */
  vec3 plasmaReflection = mix(
    vec3(0.75, 0.04, 0.24),
    vec3(1.00, 0.25, 0.04),
    plasmaSpiral
  );

  goldColor = mix(
    goldColor,
    goldColor * plasmaReflection,
    0.16
  );

  /*
   * Warna asli PNG tulisan hanya digunakan
   * sebagian agar kontrol emas tetap kuat.
   */
  goldColor = mix(
    goldColor,
    textPixel.rgb,
    0.28
  );

  /*
   * Extrusion/shadow kecil di bawah tulisan.
   */
  vec2 textShadowUv =
      fract(
        textUv
        - vec2(0.008, 0.012)
      );

  vec4 textShadowPixel =
      texture(
        uGlobeText,
        textShadowUv
      );

  float textShadowAlpha =
      textShadowPixel.a
      * globeMask
      * 0.18;

  globeColor = mix(
    globeColor,
    vec3(0.018, 0.004, 0.0),
    textShadowAlpha
  );

  /*
   * Tulisan berada di atas plasma,
   * tetapi tetap semi-transparan.
   */
  globeColor = mix(
    globeColor,
    goldColor,
    textAlpha
  );

  /*
   * -----------------------------------------------------------
   * ATMOSPHERE / ASAP ANGKASA
   * -----------------------------------------------------------
   */

  vec2 atmospherePosition =
      centered * 2.2;

  atmospherePosition =
      rotate2d(uTime * 0.035)
      * atmospherePosition;

  float smokeA = fbm(
    atmospherePosition * 3.0
    + vec2(
      uTime * 0.07,
      -uTime * 0.04
    )
  );

  float smokeB = fbm(
    atmospherePosition * 6.0
    + vec2(
      -uTime * 0.10,
      uTime * 0.055
    )
  );

  float smoke = smoothstep(
    0.28,
    0.78,
    smokeA * 0.68
    + smokeB * 0.32
  );

  float atmosphereEdge =
      smoothstep(
        0.68,
        0.99,
        globeDistance
      );

  vec4 atmospherePixel =
      texture(
        uAtmosphere,
        fract(centered * 1.25 + 0.5)
      );

  float atmosphereStrength =
      smoke
      * atmosphereEdge
      * (0.20 + uBeatPulse * 0.14);

  atmosphereStrength +=
      atmospherePixel.a
      * (0.12 + uBeatPulse * 0.06);

  atmosphereStrength *=
      0.80
      + globeMask * 0.20;

  atmosphereStrength = clamp(
    atmosphereStrength,
    0.0,
    0.52
  );

  vec3 atmosphereColor = mix(
    vec3(0.015, 0.10, 0.36),
    vec3(0.10, 0.65, 1.00),
    smoke
  );

  /*
   * Asap tipis di permukaan globe.
   */
  globeColor = mix(
    globeColor,
    atmosphereColor,
    atmosphereStrength
    * globeMask
    * 0.34
  );

  /*
   * -----------------------------------------------------------
   * COMPOSITE GLOBE KE BACKGROUND
   * -----------------------------------------------------------
   */

  float globeAlpha =
      globeMask
      * clamp(
        uGlobeOpacity,
        0.0,
        1.0
      );

  finalColor = mix(
    finalColor,
    globeColor,
    globeAlpha
  );

  finalAlpha = max(
    finalAlpha,
    globeAlpha
  );

  /*
   * Atmosfer di luar tepi globe.
   */
  float outsideMask =
      1.0 - globeMask;

  float outerAtmosphere =
      atmosphereStrength
      * outsideMask
      * 0.70;

  finalColor = mix(
    finalColor,
    atmosphereColor,
    outerAtmosphere
  );

  finalAlpha = max(
    finalAlpha,
    outerAtmosphere
  );

  /*
   * -----------------------------------------------------------
   * BUBBLE
   * -----------------------------------------------------------
   */

  vec2 bubbleUv =
      fract(
        uv * 1.35
        + vec2(
          uTime * 0.012,
          -uTime * 0.020
        )
      );

  vec4 bubblePixel =
      texture(
        uBubble,
        bubbleUv
      );

  float bubbleStrength =
      bubblePixel.a
      * (0.30 + uBeatPulse * 0.16);

  bubbleStrength = clamp(
    bubbleStrength,
    0.0,
    0.60
  );

  finalColor +=
      bubblePixel.rgb
      * bubbleStrength;

  finalAlpha = max(
    finalAlpha,
    bubbleStrength
  );

  /*
   * -----------------------------------------------------------
   * SOLAR WIND
   * -----------------------------------------------------------
   */

  vec2 solarUv =
      centered * 1.25;

  solarUv =
      rotate2d(-uTime * 0.10)
      * solarUv;

  solarUv += vec2(
    uTime * 0.018,
    -uTime * 0.010
  );

  vec4 solarPixel =
      texture(
        uSolarWind,
        fract(solarUv + 0.5)
      );

  float solarStrength =
      solarPixel.a
      * (0.16 + uBeatPulse * 0.14);

  solarStrength *=
      outsideMask;

  vec3 solarColor =
      solarPixel.rgb
      * vec3(
        0.30,
        0.70,
        1.00
      );

  finalColor +=
      solarColor
      * solarStrength;

  finalAlpha = max(
    finalAlpha,
    solarStrength
  );

  /*
   * -----------------------------------------------------------
   * STAR WIND
   * -----------------------------------------------------------
   */

  vec2 starUv =
      fract(
        uv * 1.65
        + vec2(
          -uTime * 0.025,
          uTime * 0.012
        )
      );

  vec4 starPixel =
      texture(
        uStarWind,
        starUv
      );

  float starStrength =
      starPixel.a
      * (0.20 + uBeatPulse * 0.12);

  vec3 starColor =
      starPixel.rgb
      * (0.68 + uBeatPulse * 0.22);

  finalColor +=
      starColor
      * starStrength;

  finalAlpha = max(
    finalAlpha,
    starStrength
  );

  /*
   * -----------------------------------------------------------
   * LIGHTNING
   * -----------------------------------------------------------
   */

  vec2 lightningUv =
      uv;

  lightningUv.x += sin(
    uTime * 0.5
  ) * 0.008;

  lightningUv.y -=
      uTime * 0.035;

  vec4 lightningPixel =
      texture(
        uLightning,
        fract(lightningUv)
      );

  float lightningPulse =
      smoothstep(
        0.64,
        0.92,
        sin(uTime * 8.0)
        * 0.5
        + 0.5
      );

  float lightningStrength =
      lightningPixel.a
      * (
        0.16
        + lightningPulse * 0.20
      )
      * (
        0.55
        + uBeatPulse * 0.45
      );

  /*
   * Petir hanya terlihat pada
   * alpha texture dan area globe.
   */
  lightningStrength *=
      globeMask;

  vec3 lightningColor =
      lightningPixel.rgb
      * (
        0.75
        + lightningPulse * 0.45
      );

  finalColor +=
      lightningColor
      * lightningStrength;

  finalAlpha = max(
    finalAlpha,
    lightningStrength
  );

  /*
   * -----------------------------------------------------------
   * RIM LIGHT
   * -----------------------------------------------------------
   */

  float rimStrength =
      rim
      * globeMask
      * (
        0.20
        + uBeatPulse * 0.12
      );

  finalColor +=
      blueRim
      * rimStrength;

  /*
   * -----------------------------------------------------------
   * LIMITED BLOOM
   * -----------------------------------------------------------
   */

  vec3 brightPart =
      max(
        finalColor - vec3(0.72),
        vec3(0.0)
      );

  finalColor +=
      brightPart * 0.10;

  /*
   * -----------------------------------------------------------
   * FINAL OUTPUT
   * -----------------------------------------------------------
   */

  finalColor =
      toneMap(finalColor);

  finalColor = clamp(
    finalColor,
    vec3(0.0),
    vec3(1.0)
  );

  finalAlpha = clamp(
    finalAlpha,
    0.0,
    1.0
  );

  fragColor = vec4(
    finalColor,
    finalAlpha
  );
}
