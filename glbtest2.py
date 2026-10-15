import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':800,'height':450})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.add_init_script("localStorage.setItem('rn_q','\"low\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(60):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(500); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("P.switchT=0; P.pitch=0.02; P.yaw=0"); await pg.wait_for_timeout(1500)
        await pg.wait_for_timeout(2000); await pg.screenshot(path=OUT+"h_hip.png")
        await pg.evaluate("KEY.KeyZ=true; P.ads=1"); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=OUT+'h_ads.png')
        await pg.evaluate("KEY.KeyZ=false; P.ads=0; toggleCam(); P.lastFire=G.t+100"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'h_tpp.png')
        await pg.evaluate("P.yaw=Math.PI*0.75; G.camMode='tpp'"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'h_tpp2.png')
        await pg.evaluate("toggleCam(); P.reloadT=0; P.s().mag=5; P.yaw=0; startReload()"); await pg.wait_for_timeout(900)
        await pg.screenshot(path=OUT+'h_reload.png')
        print('ERR', errs[:5])
        await b.close()
asyncio.run(run())
