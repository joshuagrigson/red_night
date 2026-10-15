import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':640,'height':320})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append(m.type+': '+m.text[:300]) if m.type in ('error','warning') else None)
        await pg.goto('http://localhost:8765/test.html')
        for i in range(60):
            await pg.wait_for_timeout(1000)
            st = await pg.evaluate("typeof G!=='undefined' ? G.state : 'noG'")
            if st=='title': break
        print('state', st, 'pbr', await pg.evaluate("Object.keys(PBR.tex).length"))
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(3000); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(4000)
        print('state2', await pg.evaluate("G.state"))
        for e in errs[:8]: print(e)
        await b.close()
asyncio.run(run())
