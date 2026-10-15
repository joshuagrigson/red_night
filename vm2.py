import asyncio, time, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
STEPS=[
 ("night","document.getElementById('goChar').click(); setTimeout(()=>document.getElementById('goNight').click(),300)",4500),
 ("city","G.wakeT=0; leaveApartment()",2500),
 ("aug","G.load.s1='bullpupA3'; equipLoadout(true); setWeapon(0); P.pitch=0",3500),
 ("augads","P.adsHeld=true; KEY.KeyZ=true",2000),
 ("rpk","KEY.KeyZ=false; P.adsHeld=false; G.load.s1='rpk'; equipLoadout(true); setWeapon(0)",3500),
 ("anvil","G.load.s1='anvil50'; equipLoadout(true); setWeapon(0)",3500),
 ("twin","G.load.s1='twin'; equipLoadout(true); setWeapon(0)",3500),
 ("kurz","G.load.s1='kurz5'; equipLoadout(true); setWeapon(0)",3500),
 ("iron45","G.load.s2='iron45'; equipLoadout(true); setWeapon(1)",3500),
 ("stutter","G.load.s2='stutter18'; equipLoadout(true); setWeapon(1)",3500),
 ("saw","G.load.s2='chainsaw'; equipLoadout(true); setWeapon(1)",3500),
 ("hockey","G.load.melee='hockey'; equipLoadout(true); setWeapon(2)",3500),
 ("nodachi","G.load.melee='nodachi'; equipLoadout(true); setWeapon(2)",3500),
 ("karambit","G.load.melee='karambit'; equipLoadout(true); setWeapon(2)",3500),
]
async def run():
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
        print(await pg.evaluate("(()=>{renderer.info.autoReset=false; renderer.info.reset(); renderer.render(scene,camera); const r={calls:renderer.info.render.calls,tris:renderer.info.render.triangles,baked:G.baked}; renderer.info.autoReset=true; return JSON.stringify(r)})()"))
        for name,js,wait in STEPS:
            await pg.evaluate(js); await pg.wait_for_timeout(wait)
            await pg.screenshot(path=OUT+'v2_'+name+'.png')
            if name=='city':
                print(await pg.evaluate("(()=>{renderer.info.autoReset=false; renderer.info.reset(); renderer.render(scene,camera); const r={calls:renderer.info.render.calls,tris:renderer.info.render.triangles}; renderer.info.autoReset=true; return JSON.stringify(r)})()"))
            print(name, errs[:3], flush=True); errs.clear()
        await b.close()
asyncio.run(run())
