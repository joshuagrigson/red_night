import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
STEPS=[
 ("night","document.getElementById('goChar').click(); setTimeout(()=>document.getElementById('goNight').click(),300)",4000),
 ("wall","G.wakeT=0; canvas.style.filter='none'; P.yaw=0.0; P.pitch=0.12; P.pos.set(APT.x-1.5,0,APT.z-1.2)",2500),
 ("smith","openSmith('ar')",3000),
 ("city","closeSmith(); leaveApartment()",2500),
 ("hip","P.switchT=0; P.pitch=0.02",2000),
 ("ads","KEY.KeyZ=true",2500),
 ("tpp","KEY.KeyZ=false; toggleCam()",2500),
]
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':800,'height':450})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.add_init_script("localStorage.setItem('rn_q','\"low\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(60):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        print(await pg.evaluate("JSON.stringify({loaded:!!MODELS.patriot15.scene})"))
        for name,js,wait in STEPS:
            await pg.evaluate(js); await pg.wait_for_timeout(wait)
            await pg.screenshot(path=OUT+'g_'+name+'.png')
        print(await pg.evaluate("JSON.stringify({sightY:VM.gun.sightY, box:VM.gun.meta.glbBox})"))
        print('ERR', errs[:5])
        await b.close()
asyncio.run(run())
