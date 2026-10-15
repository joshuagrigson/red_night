import asyncio, base64, json, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
Q = sys.argv[1] if len(sys.argv) > 1 else 'high'
VIEWS = {'downtown':((1.8,1.7,62),(1.8,26,-30)), 'texarkana':((121.6,1.7,150),(121.6,4,95)), 'salem':((-118.4,1.7,150),(-118.4,4,95)), 'sacramento':((81.6,1.7,-40),(81.6,30,-150)), 'cairo':((-118.4,1.7,-60),(-118.4,6,-120))}
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1200,'height':560})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.add_init_script(f"localStorage.setItem('rn_q','\"{Q}\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(120):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(2500); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(2000)
        await pg.evaluate("window.requestAnimationFrame=()=>0; SPAWN.t=1e9;")
        print(await pg.evaluate("[G.quality, FAC.ok, Object.keys(PROPS).length, Object.values(PROPS).reduce((a,p)=>a+p.list.length,0), GRASS.length, MAILBOX.length, Object.keys(SKY.parts).length, SKY.beacons.length]"))
        for k,(eye,at) in VIEWS.items():
            d = await pg.evaluate(f"""(()=>{{ P.pos.set({eye[0]},0,{eye[2]}); camera.position.set({eye[0]},{eye[1]},{eye[2]}); camera.lookAt({at[0]},{at[1]},{at[2]}); camera.fov=64; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
               refillNear(); for (const f of UPD) f(.1, 5); updateLights(.1); VM.root.visible=false; renderer.info.autoReset=false; renderer.info.reset(); POST.composer.render(); const inf=[renderer.info.render.calls, renderer.info.render.triangles]; renderer.info.autoReset=true; return [renderer.domElement.toDataURL('image/jpeg',.88), inf]; }})()""")
            open(OUT+f'v_{k}.jpg','wb').write(base64.b64decode(d[0].split(',')[1])); print(k, 'calls', d[1][0], 'tris', d[1][1])
        print('ERR', errs[:5]); await b.close()
asyncio.run(run())
