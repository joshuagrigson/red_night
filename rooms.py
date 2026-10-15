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
        await pg.wait_for_timeout(400); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1200)
        await pg.evaluate("SPAWN.t=1e9; ENEMIES.slice().forEach(e=>e.remove()); P.hp=1e9; P.maxHp=1e9;")
        print(await pg.evaluate("JSON.stringify(Object.fromEntries(Object.entries(ROOMS).map(([k,r])=>[k,r.doors.map(d=>[d.d,Math.round(d.ret.x),Math.round(d.ret.z)])])))"))
        # street view of a door
        await pg.evaluate("const D=ROOMS.club.doors[0]; P.pos.set(D.ret.x+3,0,D.ret.z-6); P.yaw=-0.45; P.pitch=0.1;"); await pg.wait_for_timeout(1800)
        await pg.screenshot(path=OUT+'room_door.png')
        for rid in ['guns','church','club','metro']:
            await pg.evaluate(f"enterRoom('{rid}', ROOMS['{rid}'].doors[0])"); await pg.wait_for_timeout(1600)
            await pg.evaluate("P.pitch=0.05"); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=OUT+f'room_{rid}.png')
            info = await pg.evaluate("JSON.stringify({inside:G.inside, enemies:ENEMIES.filter(e=>!e.dead).length, rain:G.rain.visible, dist:document.getElementById('distName').textContent})")
            print(rid, info)
            await pg.evaluate("exitRoom()"); await pg.wait_for_timeout(900)
        await pg.evaluate("P.yaw=Math.PI; P.pitch=0.15; P.pos.z-=3"); await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'room_door2.png')
        print(await pg.evaluate("JSON.stringify({inside:G.inside, pos:[P.pos.x,P.pos.z].map(Math.round), enemies:ENEMIES.filter(e=>!e.dead).length})"))
        print('ERR', errs[:5]); await b.close()
asyncio.run(run())
