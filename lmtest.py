import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1500,'height':300})).new_page()
        await pg.goto('http://localhost:8765/lmtest.html')
        for i in range(80):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("window.ready")==5: break
        for name,az in [('front',0),('back',3.14159)]:
            await pg.evaluate(f"view({az})"); await pg.screenshot(path=OUT+f'lm_{name}.png')
        await b.close()
asyncio.run(run())
