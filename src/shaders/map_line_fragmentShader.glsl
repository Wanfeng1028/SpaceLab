// Fragment shader for map stream lines
varying vec2 vUv;
uniform float u_time;
uniform vec3 color;
void main() {
  gl_FragColor = vec4(color, 1.0);
}