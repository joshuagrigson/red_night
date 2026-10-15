import asyncio, time, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
STEPS=[
 ("night","document.getElementById('goChar').click(); setTimeout(()=>document.getElementById('goNight').click(),300)",4500),
 ("city","G.wakeT=0; leaveApartment()",3500),
 ("look2","P.yaw=Math.PI/2; P.pitch=0.05",2500),
 ("look3","P.yaw=Math.PI; P.pitch=0.05",2500),
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
            await pg.screenshot(path=OUT+'v3_'+name+'.png')
            if name=='city':
                print(await pg.evaluate("(()=>{renderer.info.autoReset=false; renderer.info.reset(); renderer.render(scene,camera); const r={calls:renderer.info.render.calls,tris:renderer.info.render.triangles}; renderer.info.autoReset=true; return JSON.stringify(r)})()"))
            print(name, errs[:3], flush=True); errs.clear()
        await b.close()
asyncio.run(run())
