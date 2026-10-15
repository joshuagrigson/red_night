import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':400,'height':225})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('http://localhost:8765/test.html')
        for i in range(80):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(400); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("SPAWN.t=1e9; ENEMIES.slice().forEach(e=>e.remove()); toggleCam(); P.yaw=0.0; P.pitch=0")
        for label,js in [('relaxed',"P.lastFire=-99; P.ads=0; KEY.KeyZ=false"),('aim',"P.lastFire=G.t; KEY.KeyZ=true; P.ads=1")]:
            await pg.evaluate(js); await pg.wait_for_timeout(2500)
            print(label, await pg.evaluate("""(()=>{ const m=new T.Vector3(); PGUN.muzzle.getWorldPosition(m); const h=new T.Vector3(); PBODY.rArm.hand.getWorldPosition(h); const r=PBODY.root.position;
              const fw=new T.Vector3(0,0,-1).applyQuaternion(PBODY.root.getWorldQuaternion(new T.Quaternion()));
              const d=m.clone().sub(r); return {aimW:+(PBODY.aimW||0).toFixed(2), muzzleFwd:+d.dot(fw).toFixed(2), muzzleY:+d.y.toFixed(2), handFwd:+h.clone().sub(r).dot(fw).toFixed(2), handY:+(h.y-r.y).toFixed(2), camYaw:+P.yaw.toFixed(2), bodyRot:+PBODY.root.rotation.y.toFixed(2)}; })()"""))
        print('ERR', errs[:5]); await b.close()
asyncio.run(run())
