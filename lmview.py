import asyncio, base64
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
VIEWS={'cairo':((-112,9,-104),(-140,12,-140)),'capitol':((128,8,-100),(100,10,-140)),'tex':((146,7,62),(120,9,100)),'salem':((-158,6,92),(-180,8,60)),'bridge':((200,7,-88),(200,9,-120))}
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
        print(await pg.evaluate("Object.keys(LMS).filter(k=>LMS[k].scene).join(',')"))
        for k,(eye,at) in VIEWS.items():
            await pg.evaluate(f"P.pos.set({eye[0]},0,{eye[2]}); P.vel.set(0,0,0)")
            await pg.wait_for_timeout(1500)
            d = await pg.evaluate(f"""(()=>{{ const c=new T.PerspectiveCamera(60,2,.1,1500); c.position.set({eye[0]},{eye[1]},{eye[2]}); c.lookAt({at[0]},{at[1]},{at[2]}); c.updateMatrixWorld();
               POST.composer.passes[0].camera=c; POST.composer.render(); const u=renderer.domElement.toDataURL('image/jpeg',.85); POST.composer.passes[0].camera=camera; return u; }})()""")
            open(OUT+f'lmv_{k}.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        print('ERR', errs[:5]); await b.close()
asyncio.run(run())
