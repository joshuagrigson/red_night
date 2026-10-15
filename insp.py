import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':900,'height':300})).new_page()
        pg.on('pageerror', lambda e: print('ERR',e))
        await pg.goto('http://localhost:8765/inspect.html')
        for i in range(60):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("!!window.DONE"): break
        print(await pg.evaluate("JSON.stringify(window.INFO)"))
        await pg.screenshot(path='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/glb_views.png')
        await b.close()
asyncio.run(run())
