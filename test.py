import asyncio, sys, json
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run(mobile=False):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        if mobile:
            ctx = await b.new_context(viewport={'width':844,'height':390}, device_scale_factor=2, is_mobile=True, has_touch=True)
        else:
            ctx = await b.new_context(viewport={'width':1280,'height':720})
        pg = await ctx.new_page()
        errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('file:///home/claude/game/dist/test.html')
        await pg.wait_for_timeout(7000)
        tag = 'm_' if mobile else 'd_'
        await pg.screenshot(path=OUT+tag+'1title.png')
        await pg.click('#goChar'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+tag+'2char.png')
        await pg.click('#goNight'); await pg.wait_for_timeout(4500)
        await pg.evaluate("P.yaw=0.0; P.pitch=0.05; P.pos.set(APT.x,0,APT.z)")
        await pg.wait_for_timeout(600)
        await pg.screenshot(path=OUT+tag+'3apt.png')
        await pg.evaluate("openSmith('ar')"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+tag+'4smith.png')
        await pg.evaluate("SM.sel='longshot'; SM.cls='sniper'; smRefresh()"); await pg.wait_for_timeout(700)
        await pg.evaluate("closeSmith(); leaveApartment()"); await pg.wait_for_timeout(1800)
        await pg.screenshot(path=OUT+tag+'5city.png')
        # spawn one of each around the player
        await pg.evaluate("""(()=>{const t=['purger','demon','vampire','shifter','reptile','witch'];t.forEach((k,i)=>{const e=new Enemy(k,-7.5+i*3,-9);ENEMIES.push(e);}); SPAWN.t=999; })()""")
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=OUT+tag+'6enemies.png')
        await pg.evaluate("INP.fire=true"); await pg.wait_for_timeout(1500); await pg.evaluate("INP.fire=false")
        await pg.evaluate("toggleCam()"); await pg.wait_for_timeout(900)
        await pg.screenshot(path=OUT+tag+'7tpp.png')
        await pg.evaluate("P.adsHeld=true; KEY.KeyZ=true"); await pg.wait_for_timeout(800)
        await pg.screenshot(path=OUT+tag+'8tppads.png')
        await pg.evaluate("toggleCam(); setWeapon(1); P.adsHeld=true"); await pg.wait_for_timeout(900)
        await pg.screenshot(path=OUT+tag+'9ads.png')
        await pg.evaluate("P.adsHeld=false; KEY.KeyZ=false; setWeapon(2); startMelee(false)"); await pg.wait_for_timeout(250)
        await pg.screenshot(path=OUT+tag+'10melee.png')
        await pg.evaluate("P.pos.set(-120,0,100); P.yaw=0.6"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+tag+'11salem.png')
        await pg.evaluate("P.pos.set(-118,0,-116); P.yaw=0.8; P.pitch=0.25"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+tag+'12cairo.png')
        await pg.evaluate("P.pos.set(160,0,-120); P.yaw=-1.5707; P.pitch=0.1"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+tag+'13sac.png')
        await pg.evaluate("P.pos.set(120,0,60); P.yaw=0; P.pitch=0.1"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+tag+'14tex.png')
        # drive
        await pg.evaluate("enterCar(CARS[0]); KEY.KeyW=true"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+tag+'15car.png')
        await pg.evaluate("KEY.KeyW=false; exitCar(); SPAWN.t=0"); 
        # let the night run fast for a while with spawns
        await pg.evaluate("G.nightMin=1; P.hp=99999; P.maxHp=99999")
        for i in range(6):
            await pg.evaluate("INP.fire=true; P.yaw+=0.7")
            await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+tag+'16busy.png')
        info = await pg.evaluate("JSON.stringify({state:G.state, enemies:ENEMIES.length, kills:P.kills, hour:G.hour, calls:renderer.info.render.calls, tris:renderer.info.render.triangles, geos:renderer.info.memory.geometries})")
        print(tag, info)
        await pg.wait_for_timeout(1000)
        print(tag,'ERRORS:', len(errs))
        seen=set()
        for e in errs:
            if e in seen: continue
            seen.add(e); print('  ', e[:300])
        await b.close()
asyncio.run(run(len(sys.argv)>1))
