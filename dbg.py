import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':320,'height':180})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('file:///home/claude/game/dist/test.html')
        for i in range(40):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1200)
        print(await pg.evaluate("""(()=>{ SPAWN.t=1e9; ENEMIES.slice().forEach(e=>e.remove()); P.yaw=0; P.pitch=0;
          const e=new Enemy('purger',P.pos.x,P.pos.z-9); ENEMIES.push(e);
          const o=P.eye(), d=P.fwd();
          return JSON.stringify({eye:o, d, epos:e.pos, head:e.headPos(), part:e.partAt(o,d), hs:hitscan(o,d,320), wall:rayBoxes(o,d,30), ppos:P.pos});})()"""))
        await b.close()
asyncio.run(run())
