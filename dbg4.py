import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':400,'height':225})).new_page()
        await pg.add_init_script("localStorage.setItem('rn_q','\"low\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(60):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(500); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("KEY.KeyZ=true"); 
        for i in range(4):
            await pg.wait_for_timeout(700)
            print(await pg.evaluate("JSON.stringify({ads:P.ads, sw:P.switchT, rl:P.reloadT, spr:P.sprintK, st:G.state, adsT:P.s().st.adsT, w:P.s().id, keyz:KEY.KeyZ})"))
        await b.close()
asyncio.run(run())
