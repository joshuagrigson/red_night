import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width':844,'height':390}, device_scale_factor=1, is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:8765/test.html')
        for i in range(40):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.screenshot(path=OUT+'m_title.png')
        await pg.tap('#goChar'); await pg.wait_for_timeout(2500); await pg.screenshot(path=OUT+'m_char.png')
        await pg.tap('#goNight'); await pg.wait_for_timeout(1500)
        await pg.evaluate("G.wakeT=0; canvas.style.filter='none'; P.yaw=0; P.pitch=.1; P.pos.set(APT.x,0,APT.z+1)"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'m_apt.png')
        await pg.evaluate("openSmith('sniper')"); await pg.wait_for_timeout(2500); await pg.screenshot(path=OUT+'m_smith.png')
        await pg.evaluate("SM.tab='cus'; document.querySelector('[data-tab=cus]').click()"); await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'m_smith2.png')
        await pg.evaluate("closeSmith(); leaveApartment()"); await pg.wait_for_timeout(3000)
        await pg.evaluate("P.switchT=0"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'m_city.png')
        print(await pg.evaluate("(()=>{renderer.info.autoReset=false; renderer.info.reset(); renderer.render(scene,camera); const r={calls:renderer.info.render.calls,tris:renderer.info.render.triangles}; renderer.info.autoReset=true; return JSON.stringify(r)})()"))
        await pg.evaluate("pause()"); await pg.wait_for_timeout(1200); await pg.screenshot(path=OUT+'m_pause.png')
        print(errs[:8])
        await b.close()
asyncio.run(run())
