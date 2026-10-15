import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':640,'height':360})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.add_init_script("localStorage.setItem('rn_q','\"low\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(90):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        print(await pg.evaluate("JSON.stringify(Object.fromEntries(Object.entries(MODELS).map(([k,v])=>[k,!!v.scene])))"))
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(600)
        await pg.evaluate("G.wakeT=0; canvas.style.filter='none'; P.yaw=0; P.pitch=0.1; P.pos.set(APT.x,0,APT.z+0.6)"); await pg.wait_for_timeout(3000)
        await pg.screenshot(path=OUT+'w_wall.png')
        await pg.evaluate("leaveApartment()"); await pg.wait_for_timeout(1500)
        for wid,slot in [('preacher',1),('vexor',0),('kalash',0),('bren',0),('patriot15',0)]:
            key = ['s1','s2','melee'][slot]
            await pg.evaluate(f"G.load.{key}='{wid}'; equipLoadout(false); setWeapon({slot}, true); P.switchT=0; P.pitch=0; P.yaw=0; P.ads=0")
            await pg.wait_for_timeout(1800)
            await pg.screenshot(path=OUT+f'w_{wid}.png')
            if slot<2:
                await pg.evaluate("KEY.KeyZ=true; P.ads=1"); await pg.wait_for_timeout(1800)
                await pg.screenshot(path=OUT+f'w_{wid}_ads.png'); await pg.evaluate("KEY.KeyZ=false; P.ads=0")
        print('ERR', errs[:5])
        await b.close()
asyncio.run(run())
