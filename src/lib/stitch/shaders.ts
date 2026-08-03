// GLSL for the instanced thread renderer. Each leg is one instance of a quad
// strip laid along a quadratic Bézier; the vertex stage positions and tapers
// the ribbon, the fragment stage shades a rounded, sheened, twisted strand.
// Independently written — thread/ribbon shading along a curve is a generic
// technique; this is my own formulation (analytic curve tangent, my own
// cross-section and sheen model).

export const VERT = `
precision highp float;

attribute float aT;      // 0..1 position along the strand (per strip vertex)
attribute float aSide;   // -1 / +1 : which edge of the ribbon
attribute vec2  aA;      // strand start
attribute vec2  aB;      // strand end
attribute vec2  aCtrl;   // quadratic control point
attribute vec3  aCol;
attribute float aWid;
attribute float aProg;   // reveal fraction 0..1
attribute float aRev;    // >0.5 -> grow from the far end
attribute vec4  aMatA;   // sheen, band, ply, plyFreq
attribute vec4  aMatB;   // edgeDark, tintR, tintG, tintB

uniform vec2  uRes;
uniform float uShadow;       // 0 = strand pass, 1 = cast-shadow pass
uniform vec2  uShadowDir;
uniform float uShadowOff;
uniform float uShadowSpread;

varying vec3  vCol;
varying float vSide;
varying float vT;
varying float vLen;
varying vec4  vMatA;
varying vec4  vMatB;
varying float vShadow;

vec2 curve(float t) {
  float u = 1.0 - t;
  return u * u * aA + 2.0 * u * t * aCtrl + t * t * aB;
}
vec2 curveTangent(float t) {
  // analytic derivative of the quadratic Bézier
  return 2.0 * (1.0 - t) * (aCtrl - aA) + 2.0 * t * (aB - aCtrl);
}

void main() {
  float grow  = clamp(aProg, 0.0, 1.0);
  float drawn = aT * grow;                       // revealed portion
  float t = (aRev > 0.5) ? (1.0 - drawn) : drawn;

  vec2 pos  = curve(t);
  vec2 tang = normalize(curveTangent(t) + vec2(1e-4, 0.0));
  vec2 norm = vec2(-tang.y, tang.x);

  // pinch both ends of the stitch so it reads as a needle-drawn thread
  float pinch = smoothstep(0.0, 0.12, aT) * smoothstep(1.0, 0.88, aT);
  float hw = 0.5 * aWid * mix(0.70, 1.0, pinch);
  if (uShadow > 0.5) hw *= uShadowSpread;

  pos += norm * aSide * hw;
  if (uShadow > 0.5) pos += uShadowDir * aWid * uShadowOff;

  vec2 ndc = (pos / uRes) * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);

  vCol = aCol;
  vSide = aSide;
  vT = aT;
  vLen = length(aB - aA);
  vMatA = aMatA;
  vMatB = aMatB;
  vShadow = uShadow;
}`;

export const FRAG = `
precision highp float;

varying vec3  vCol;
varying float vSide;
varying float vT;
varying float vLen;
varying vec4  vMatA;
varying vec4  vMatB;
varying float vShadow;

void main() {
  float s = abs(vSide);                          // 0 at the ridge, 1 at the rim

  if (vShadow > 0.5) {
    // soft drop shadow: a tighter dark contact core fading to a light penumbra
    float core     = (1.0 - smoothstep(0.0, 0.60, s)) * 0.45;
    float penumbra = (1.0 - smoothstep(0.10, 1.0, s)) * 0.32;
    gl_FragColor = vec4(0.06, 0.04, 0.03, max(core, penumbra));
    return;
  }

  float sheen   = vMatA.x;
  float band    = vMatA.y;
  float ply     = vMatA.z;
  float plyFreq = vMatA.w;
  float edgeDark = vMatB.x;
  vec3  tint     = vMatB.yzw;

  // treat the cross-section as a half-cylinder: bright ridge, shaded rim
  float dome = sqrt(max(0.0, 1.0 - s * s));
  vec3  rim  = vCol * edgeDark;
  vec3  col  = mix(rim, vCol, smoothstep(0.0, 0.6, dome));

  // sheen = a lifted tint of the strand's own colour, not chalky white
  vec3 hi = vCol + (1.0 - vCol) * (sheen * 0.35);
  if (dot(tint, tint) > 0.001) hi *= mix(vec3(1.0), tint, 0.4);
  col = mix(col, hi, smoothstep(1.0 - band * 0.7, 1.0, dome));

  // ply: a gentle twist ripple running along the strand
  float twists = max(3.0, vLen * plyFreq);
  float ripple = sin((vT * twists + vSide * 0.5) * 6.2831853);
  col *= 1.0 + ripple * 0.11 * ply;

  // strands stacked underneath read a touch recessed at the rim
  float occ = edgeDark > 0.995 ? 0.0 : 0.22;
  col *= 1.0 - smoothstep(0.80, 1.0, s) * occ;

  float alpha = 1.0 - smoothstep(0.88, 1.0, s);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), alpha);
}`;
