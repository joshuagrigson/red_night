import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1000,'height':500})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.add_init_script("localStorage.setItem('rn_q','\"low\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(80):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        print(await pg.evaluate("[CHARS_READY, Object.keys(CHARS).filter(k=>CHARS[k].scene).join(',')]"))
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(400); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("""(()=>{ SPAWN.t=1e9; ENEMIES.slice().forEach(e=>e.remove()); P.hp=1e6; P.maxHp=1e6; P.yaw=0; P.pitch=-0.05;
          const ks=['purger','demon','vampire','shifter','reptile','witch']; ks.forEach((k,i)=>{ const e=new Enemy(k,P.pos.x-5+i*2,P.pos.z-7); e.face=0; ENEMIES.push(e); e.sync(); window['E_'+k]=e; });
          return ENEMIES.map(e=>e.type+':'+(e.R.glb||'proc')).join(' '); })()""")
        print(await pg.evaluate("ENEMIES.map(e=>e.type+':'+(e.R.glb||'proc')).join(' ')"))
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'g_lineup_fpp.png')
        await pg.evaluate("toggleCam()"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'g_lineup_tpp.png')
        await pg.evaluate("P.lastFire=G.t; KEY.KeyZ=true; P.ads=1"); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=OUT+'g_tpp_aim.png')
        print('ERR', errs[:6]); await b.close()
asyncio.run(run())
