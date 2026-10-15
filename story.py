import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1000,'height':500})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('http://localhost:8765/test.html')
        for i in range(80):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(5500); await pg.screenshot(path=OUT+'story_intro.png')
        await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1200)
        await pg.evaluate("SPAWN.t=1e9; ENEMIES.slice().forEach(e=>e.remove()); P.hp=1e9; P.maxHp=1e9; STORY.queue=[]; STORY.cur=null;")
        # jump to 10 PM
        await pg.evaluate("G.nightT = 3.02/12 * G.nightMin*60"); await pg.wait_for_timeout(2500)
        print(await pg.evaluate("JSON.stringify({hour:G.hour.toFixed(2), safe:!!STORY.safe, obj:document.getElementById('objective').textContent, beacon:STORY.beacon&&STORY.beacon.visible})"))
        await pg.evaluate("const r=STORY.safe.door.ret; P.pos.set(r.x+14, 0, r.z-2); P.yaw=-1.4; P.pitch=0.2"); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=OUT+'story_safe.png')
        print(await pg.evaluate("document.getElementById('objective').textContent"))
        await pg.evaluate("const r=STORY.safe.door.ret; P.pos.set(r.x, 0, r.z)"); await pg.wait_for_timeout(1200)
        print(await pg.evaluate("JSON.stringify({safe:!!STORY.safe, score:P.score})"))
        await pg.evaluate("G.nightT = 11.01/12 * G.nightMin*60"); await pg.wait_for_timeout(4000)
        print(await pg.evaluate("JSON.stringify({final:!!STORY.done.final, enemies:ENEMIES.filter(e=>!e.dead).length})"))
        await pg.screenshot(path=OUT+'story_final.png')
        print('ERR', errs[:5]); await b.close()
asyncio.run(run())
