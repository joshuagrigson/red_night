import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':800,'height':400})).new_page()
        await pg.add_init_script("localStorage.setItem('rn_q','\"low\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(80):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(400); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1200)
        for spot in ['0,-40','-120,-120','140,-120','120,140','-120,120']:
            await pg.evaluate(f"P.pos.set({spot},0).set({spot.split(',')[0]},0,{spot.split(',')[1]}); P.yaw=0.7;")
            await pg.wait_for_timeout(900)
            print(spot, await pg.evaluate("(()=>{ renderer.info.autoReset=false; renderer.info.reset(); POST.composer.render(); const r=renderer.info.render; const o={calls:r.calls, tris:r.triangles, geos:renderer.info.memory.geometries, tex:renderer.info.memory.textures}; renderer.info.autoReset=true; return JSON.stringify(o); })()"))
        await b.close()
asyncio.run(run())
