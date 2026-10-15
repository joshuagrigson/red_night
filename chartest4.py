import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1400,'height':520})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('http://localhost:8765/chartest.html')
        for i in range(120):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("window.ready"): break
        await pg.evaluate("aimT(['female','purger','suit','vampire'],0,0,Math.PI*0.75)"); await pg.screenshot(path=OUT+'aim_34.png')
        await pg.evaluate("aimT(['female','purger','suit','vampire'],0,0,Math.PI*0.5)"); await pg.screenshot(path=OUT+'aim_side.png')
        await pg.evaluate("aimT(['female','purger','suit','vampire'],2,0.4,Math.PI*1.25)"); await pg.screenshot(path=OUT+'aim_walk_up.png')
        print('ERR', errs[:6]); await b.close()
asyncio.run(run())
