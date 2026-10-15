import asyncio, base64, json, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
Q = sys.argv[1] if len(sys.argv) > 1 else 'high'
STEP = open('crowd.py').read().split('STEP = """')[1].split('"""')[0]
SPOTS = {'sac':(86.2,-60,.3), 'tex':(126.2,140,.3), 'down':(6.2,30,.25), 'salem':(-113.8,140,.3), 'cairo':(-113.8,-100,.3)}
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
        await pg.wait_for_timeout(2500); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("window.requestAnimationFrame=()=>0; G.state='city'; SPAWN.t=1e9; G.camMode='tpp';")
        for k,(x,z,yaw) in SPOTS.items():
            await pg.evaluate(f"() => {{ CIVS.slice().forEach(c=>c.remove()); GROUPS.length=0; P.pos.set({x},0,{z}); P.yaw={yaw}; P.pitch=-.04; TRAFFIC.forEach(c=>trafficPlace(c)); camera.position.set({x},1.6,{z}); camera.lookAt({x},1.6,{z}+10); camera.updateMatrixWorld(); for (let i=0;i<22;i++) spawnGroup(); const bi=Math.floor(({x}+HALF)/CW), bj=Math.floor(({z}+HALF)/CW); GROUPS.forEach((g,n)=>{{ g.i=bi+(n%3===2?-1:0); g.j=bj-(n%2); g.edge=[3,1,0,2][n%4]; g.t=rand(2,26); g.place(); g.members.forEach(m=>{{ const q=g.slotPos(m.slot); m.pos.copy(q); }}); }}); }}")
            await pg.evaluate(STEP, 12)
            d = await pg.evaluate("""() => { for(let i=0;i<40;i++){ updateBody(1/30); updateCamera(1/30); } refillNear(); for (const f of UPD) f(.1, 5); updateLights(.1); VM.root.visible=false; renderer.info.autoReset=false; renderer.info.reset(); POST.composer.render(); const inf=[renderer.info.render.calls, renderer.info.render.triangles]; renderer.info.autoReset=true; const fr=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); const inView=CIVS.filter(c=>fr.containsPoint(c.pos.clone().setY(1))).length; return [renderer.domElement.toDataURL('image/jpeg',.88), inf, CIVS.length+' inView '+inView]; }""")
            open(OUT+f's_{k}.jpg','wb').write(base64.b64decode(d[0].split(',')[1])); print(k, 'calls', d[1][0], 'tris', d[1][1], 'civs', d[2])
        print('ERR', errs[:5]); await b.close()
asyncio.run(run())
