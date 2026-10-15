import asyncio, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
TAG=sys.argv[1] if len(sys.argv)>1 else 'x'
SPOTS={'lm_cairo':(-140,-112,0.0),'lm_capitol':(100,-108,0.0),'lm_tex':(120,72,3.14159),'lm_salem':(-180,88,0.0),'lm_bridge':(200,-88,0.0),'rail':(150,201,1.57),'cairo':(-200,-80,0.4),'sac':(140,-120,-0.5),'tex':(120,140,2.4),'salem':(-120,120,-2.4),'center':(0,-40,0)}
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1000,'height':500})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('http://localhost:8765/test.html')
        for i in range(80):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(400); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1200)
        await pg.evaluate("SPAWN.t=1e9; ENEMIES.slice().forEach(e=>e.remove()); P.hp=1e9; P.maxHp=1e9; document.querySelectorAll('.banner,#banner').forEach(e=>e.style.display='none')")
        print(await pg.evaluate("JSON.stringify(FD._stats||{})"))
        for k,(x,z,yaw) in SPOTS.items():
            await pg.evaluate(f"P.pos.set({x},0,{z}); P.vel.set(0,0,0); P.yaw={yaw}; P.pitch=0.12;")
            await pg.wait_for_timeout(2200)
            await pg.screenshot(path=OUT+f'tour_{TAG}_{k}.png')
        print(await pg.evaluate("JSON.stringify({calls:renderer.info.render.calls, tris:renderer.info.render.triangles})"))
        print('ERR', errs[:5]); await b.close()
asyncio.run(run())
