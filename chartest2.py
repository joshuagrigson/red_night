import asyncio, sys
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
        sets={'a':"['female','purger','demon','vampire']",'b':"['reptile','witch','beast','suit']"}
        for name,t in [('walk',0.35),('run',0.25),('shoot',0.6),('slash',0.45),('punch',0.35),('cast',1.0),('die',3),('hit',0.25)]:
            for k,ids in sets.items():
                await pg.evaluate(f"pose3('{name}',{t},{ids})"); await pg.screenshot(path=OUT+f'p_{name}_{k}.png')
        print('ERR', errs[:6]); await b.close()
asyncio.run(run())
