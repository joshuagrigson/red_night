/* =====================================================================
   RED NIGHT — post-processing: neon bloom, lens fringing, film grain, grade
   ===================================================================== */
const POST = { on: false };
function setupPost() {
  if (!T.EffectComposer || !T.UnrealBloomPass || !T.RenderPass || !T.ShaderPass) return;
  try {
    const comp = new T.EffectComposer(renderer);
    comp.addPass(new T.RenderPass(scene, camera));
    class VMPass extends T.Pass {
      constructor() { super(); this.needsSwap = false; }
      render(r, writeBuffer, readBuffer) { if (!G.vmOn) return; r.setRenderTarget(readBuffer); r.clearDepth(); r.render(vmScene, vmCam); }
    }
    comp.addPass(new VMPass());
    const w = window.innerWidth, h = window.innerHeight;
    const bloom = new T.UnrealBloomPass(new T.Vector2(w, h), .85, .55, .7);
    comp.addPass(bloom);
    const fin = new T.ShaderPass({
      uniforms: { tDiffuse: { value: null }, time: { value: 0 }, ca: { value: .006 }, grain: { value: .045 }, hurt: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform float ca; uniform float grain; uniform float hurt; varying vec2 vUv;
        vec3 toSRGB(vec3 c){ return mix(c*12.92, pow(c, vec3(.41666))*1.055-.055, step(.0031308, c)); }
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 d = vUv - .5; float r2 = dot(d,d); vec2 off = d * (ca + hurt*.02) * (.4 + r2*3.0);
          vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
          c = toSRGB(clamp(c, 0.0, 1.0));
          float l = dot(c, vec3(.299,.587,.114));
          c = mix(c, c * vec3(.86, .92, 1.12), (1.0 - l) * .35);   // cool, cyan-violet shadows
          c = mix(c, c * vec3(1.08, .98, .92), l * .25);            // warm neon highlights
          c = (c - .5) * 1.06 + .5;                                  // a touch of contrast
          c += (h(vUv * 917.0 + fract(time * 13.7)) - .5) * grain;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    comp.addPass(fin);
    POST.composer = comp; POST.bloom = bloom; POST.fin = fin; POST.on = true;
    postSize();
  } catch (e) { POST.on = false; }
}
function postSize() {
  if (!POST.on) return;
  const w = window.innerWidth, h = window.innerHeight;
  POST.composer.setPixelRatio(renderer.getPixelRatio()); POST.composer.setSize(w, h);
  const k = G.quality === 'high' ? 1 : .5; POST.bloom.setSize(w * renderer.getPixelRatio() * k, h * renderer.getPixelRatio() * k);
}
