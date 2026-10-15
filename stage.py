import asyncio, time, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
STEPS = [
 ("title", None, 0),
 ("char", "document.getElementById('goChar').click()", 1500),
 ("apt", "document.getElementById('goNight').click()", 5000),
 ("aptlook", "P.yaw=0.0; P.pitch=0.05; P.pos.set(APT.x,0,APT.z+1)", 1500),
 ("smith", "openSmith('ar')", 2000),
 ("city", "closeSmith(); leaveApartment()", 2500),
 ("enemies", "(()=>{const t=['purger','demon','vampire','shifter','reptile','witch'];t.forEach((k,i)=>{const e=new Enemy(k,-7.5+i*3,-6);e.face=0; ENEMIES.push(e);}); SPAWN.t=999; P.pitch=-0.05})()", 1500),
 ("fire", "INP.fire=true", 2500),
 ("tpp", "INP.fire=false; toggleCam()", 1500),
 ("tppads", "KEY.KeyZ=true", 1500),
 ("fppads", "toggleCam(); setWeapon(1)", 2000),
 ("melee", "KEY.KeyZ=false; setWeapon(2); startMelee(false)", 300),
 ("salem", "P.pos.set(-120,0,100); P.yaw=0.6; ENEMIES.forEach(e=>e.remove())", 2500),
 ("cairo", "P.pos.set(-118,0,-116); P.yaw=0.8; P.pitch=0.25", 2500),
 ("sac", "P.pos.set(160,0,-120); P.yaw=-1.5707; P.pitch=0.1", 2500),
 ("tex", "P.pos.set(120,0,60); P.yaw=0; P.pitch=0.1", 2500),
 ("car", "enterCar(CARS[0]); KEY.KeyW=true", 2500),
 ("run", "KEY.KeyW=false; exitCar(); SPAWN.t=0; G.nightMin=2; P.hp=1e6; P.maxHp=1e6; INP.fire=true", 12000),
]
async def run(start, end):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width':640,'height':360})
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error',) else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.add_init_script("localStorage.setItem('rn_q','\"low\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(30):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        t=time.time()
        for i,(name, js, wait) in enumerate(STEPS):
            if js: await pg.evaluate(js)
            if wait: await pg.wait_for_timeout(wait)
            if start <= i <= end:
                await pg.screenshot(path=OUT+'s_%02d_%s.png'%(i,name))
            info = await pg.evaluate("JSON.stringify({st:G.state,e:ENEMIES.length,k:P.kills,h:+(G.hour||0).toFixed(2),calls:renderer.info.render.calls,tris:renderer.info.render.triangles})")
            print(round(time.time()-t,1), name, info, flush=True)
            if errs: print('ERR', errs[:5], flush=True); errs.clear()
        await b.close()
asyncio.run(run(int(sys.argv[1]), int(sys.argv[2])))
