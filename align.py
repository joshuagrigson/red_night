import asyncio, sys, json
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run(items):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1200,'height':400})).new_page()
        pg.on('pageerror', lambda e: print('ERR',e))
        await pg.goto('http://localhost:8765/align.html'); await pg.wait_for_timeout(1500)
        for f,fz,fy in items:
            info = await pg.evaluate(f"align('{f}', {str(fz).lower()}, {str(fy).lower()})")
            print(info)
            await pg.screenshot(path=OUT+'al_'+f.replace('.glb','')+'.png')
        await b.close()
items=[(a, b=='1', c=='1') for a,b,c in (x.split(':') for x in sys.argv[1:])]
asyncio.run(run(items))
