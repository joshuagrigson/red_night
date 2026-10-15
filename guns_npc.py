import asyncio, base64
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
RENDER = open('lineup2.py').read().split('RENDER = """')[1].split('"""')[0]
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1400,'height':700})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('http://localhost:8765/test.html')
        for i in range(90):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(2500); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(2000)
        await pg.evaluate("""() => { window.requestAnimationFrame=()=>0; SPAWN.t=1e9; ENEMIES.slice().forEach(e=>e.remove()); CIVS.slice().forEach(c=>c.remove());
          ['preacher','vexor','kalash','patriot15','riot'].forEach((id,i)=>{ const e=new Enemy('purger', P.pos.x-3+i*1.5, P.pos.z-8, {ranged:1}); ENEMIES.push(e);
            e.R.gunMount.g.clear(); const built=buildWeapon(W[id], defaultCfg(W[id]), true); built.g.rotation.x=-Math.PI/2; built.g.position.set(0,-.07,-.02); const hold=new T.Group(); hold.add(built.g); e.R.gunMount.g.add(hold); e.R.gunMount.mode='tpp';
            e.face=0; e.st.aimHold = i<3 ? 1 : 0; e.sync(); for(let k=0;k<30;k++) animGLB(e.R,e.st,1/30); });
          flashLight.position.set(P.pos.x+2,2.5,P.pos.z-11); flashLight.color.set(0xffffff); flashLight.intensity=4; flashLight.distance=10; }""")
        x0 = await pg.evaluate("P.pos.x"); z0 = await pg.evaluate("P.pos.z-8")
        d = await pg.evaluate(RENDER, [x0+4.2, 1.6, z0-4.2, x0, 1.1, z0, 42]); open(OUT+'npc_guns.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        print(errs[:3]); await b.close()
asyncio.run(run())
