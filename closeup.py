import asyncio, base64
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
# eye, look-at
VIEWS={'cairo':((-200,1.7,-80),(-206,3,-74)),'salem':((-120,1.7,120),(-114,2.5,114))}
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':800,'height':400})).new_page()
        await pg.goto('http://localhost:8765/test.html')
        for i in range(90):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(2000); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(3000)
        await pg.evaluate("SPAWN.t=1e9; ENEMIES.slice().forEach(e=>e.remove()); document.getElementById('bcast') && (document.getElementById('bcast').style.display='none')")
        for k,(eye,at) in VIEWS.items():
            await pg.evaluate(f"P.pos.set({eye[0]},0,{eye[2]}); P.vel.set(0,0,0)"); await pg.wait_for_timeout(2500)
            for on in [1,0]:
                d = await pg.evaluate(f"""(()=>{{ const mats=[...Object.values(STYLES).map(s=>s.mat), PBR.ground, FDMAT.curb, PBR.ledge]; mats.forEach(m=>{{ if(m&&m.userData.det){{ const U=m.userData.det; if(m.userData.k0===undefined){{m.userData.k0=U.detK.value; m.userData.n0=U.detNK.value;}} U.detK.value={on}?m.userData.k0:0; U.detNK.value={on}?m.userData.n0:0; }} }});
                   const c=new T.PerspectiveCamera(60,2,.1,500); c.position.set({eye[0]},{eye[1]},{eye[2]}); c.lookAt({at[0]},{at[1]},{at[2]});
                   POST.composer.passes[0].camera=c; POST.composer.render(); const u=renderer.domElement.toDataURL('image/jpeg',.85); POST.composer.passes[0].camera=camera; return u; }})()""")
                open(OUT+f'cu_{k}_{on}.jpg','wb').write(base64.b64decode(d.split(',')[1]))
            await pg.evaluate("location.reload ? 0 : 0")
            # restore strengths by reloading defaults is complex; just re-apply
            await pg.evaluate("applyCityDetail && 0")
        await b.close()
asyncio.run(run())
