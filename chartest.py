import asyncio, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1400,'height':520})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:8765/chartest.html')
        for i in range(120):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("window.ready"): break
        print(await pg.evaluate("[window.CR, window.info]"))
        for name,t,side in [('idle',0.5,0),('walk',0.4,0),('walk',0.4,1),('run',0.3,1),('shoot',0.5,0),('slash',0.5,1),('punch',0.4,0),('cast',0.8,0),('die',3,1),('hit',0.3,0)]:
            await pg.evaluate(f"pose('{name}',{t},{side})"); await pg.screenshot(path=OUT+f'c_{name}_{side}.png')
        print('ERR', errs[:6]); await b.close()
asyncio.run(run())
