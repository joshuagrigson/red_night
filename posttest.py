import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':800,'height':450})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.add_init_script("localStorage.setItem('rn_q','\"high\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(60):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        print(await pg.evaluate("JSON.stringify({post:POST.on})"))
        await pg.wait_for_timeout(2500); await pg.screenshot(path=OUT+'p_title.png')
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(500); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("P.switchT=0; P.pitch=0.06; P.yaw=0"); await pg.wait_for_timeout(4000)
        await pg.screenshot(path=OUT+'p_city.png')
        await pg.evaluate("P.pos.set(-118,0,-116); P.yaw=0.8; P.pitch=0.25"); await pg.wait_for_timeout(4000)
        await pg.screenshot(path=OUT+'p_cairo.png')
        await pg.evaluate("P.pos.set(-120,0,100); P.yaw=0.6; P.pitch=0.05"); await pg.wait_for_timeout(4000)
        await pg.screenshot(path=OUT+'p_salem.png')
        print('ERR', errs[:5])
        await b.close()
asyncio.run(run())
