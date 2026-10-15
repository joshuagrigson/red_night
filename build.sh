#!/bin/bash
set -e
cd "$(dirname "$0")"
JS="src/core.js src/pbr.js src/data.js src/world.js src/facade.js src/dressing.js src/city2.js src/interiors.js src/story.js src/combat.js src/ai.js src/traffic.js src/ambience.js src/actors.js src/chars.js src/landmarks.js src/player.js src/ui.js src/post.js src/digital.js src/main.js"
cat $JS > dist/game.js
node --check dist/game.js
{ cat src/head.html; echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'; echo '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>'; echo '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js"></script>'; echo '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js"></script>'; echo '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>'; echo '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>'; echo '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>'; echo '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>'; echo '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>'; echo '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>';  echo '<script>'; cat dist/game.js; echo '</script>'; } > dist/red-night.html
{ cat src/head.html; echo '<script src="three.min.js"></script>'; echo '<script src="GLTFLoader.js"></script>'; echo '<script src="meshopt_decoder.js"></script>'; echo '<script src="ex/utils/SkeletonUtils.js"></script>'; echo '<script src="ex/shaders/CopyShader.js"></script>'; echo '<script src="ex/shaders/LuminosityHighPassShader.js"></script>'; echo '<script src="ex/postprocessing/EffectComposer.js"></script>'; echo '<script src="ex/postprocessing/RenderPass.js"></script>'; echo '<script src="ex/postprocessing/ShaderPass.js"></script>'; echo '<script src="ex/postprocessing/UnrealBloomPass.js"></script>';  echo '<script>'; cat dist/game.js; echo '</script>'; } > dist/test.html
cp node_modules/three/build/three.min.js dist/three.min.js
cp node_modules/three/examples/js/loaders/GLTFLoader.js dist/GLTFLoader.js
cp node_modules/three/examples/js/libs/meshopt_decoder.js dist/meshopt_decoder.js
mkdir -p dist/assets
mkdir -p dist/ex/shaders dist/ex/postprocessing dist/ex/utils
cp node_modules/three/examples/js/utils/SkeletonUtils.js dist/ex/utils/
for f in optl/*.glb; do [ -e "$f" ] || continue; n=$(basename $f .glb); base64 -w0 $f > dist/assets/$n.glb.txt; done
for f in optc/*.glb; do [ -e "$f" ] || continue; n=$(basename $f .glb); base64 -w0 $f > dist/assets/$n.glb.txt; done
for f in optp/*.glb; do n=$(basename $f .glb); base64 -w0 $f > dist/assets/p_$n.glb.txt; done
for f in opt/rn_*.glb; do n=$(basename $f .glb); n=${n#rn_}; base64 -w0 $f > dist/assets/$n.glb.txt; done
cp node_modules/three/examples/js/shaders/CopyShader.js dist/ex/shaders/CopyShader.js
cp node_modules/three/examples/js/shaders/LuminosityHighPassShader.js dist/ex/shaders/LuminosityHighPassShader.js
cp node_modules/three/examples/js/postprocessing/EffectComposer.js dist/ex/postprocessing/EffectComposer.js
cp node_modules/three/examples/js/postprocessing/RenderPass.js dist/ex/postprocessing/RenderPass.js
cp node_modules/three/examples/js/postprocessing/ShaderPass.js dist/ex/postprocessing/ShaderPass.js
cp node_modules/three/examples/js/postprocessing/UnrealBloomPass.js dist/ex/postprocessing/UnrealBloomPass.js
ls -la dist/red-night.html
