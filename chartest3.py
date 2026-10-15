import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1400,'height':520})).new_page()
        await pg.goto('http://localhost:8765/chartest.html')
        for i in range(120):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("window.ready"): break
        print(await pg.evaluate("Object.fromEntries(Object.entries(CHARS.female.clips).map(([k,c])=>[k,c.duration.toFixed(2)]))"))
        for name,t in [('fall',0.5),('fall',1.2),('fall',3),('shoot',0.1),('shoot',1.5),('die',0.8),('die',1.6)]:
            await pg.evaluate(f"pose3('{name}',{t},['female','purger','demon','beast'])"); await pg.screenshot(path=OUT+f'q_{name}_{t}.png')
        await b.close()
asyncio.run(run())
