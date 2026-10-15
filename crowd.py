import asyncio, json
from playwright.async_api import async_playwright
STEP = """(secs) => { const dt=1/30; for (let i=0;i<secs*30;i++){ G.t+=dt; G.dt=dt; updateTraffic(dt); for (const c of CARS) if (c!==P.inCar) c.update(dt, c.ai && !c.dead && c.aiInp ? c.aiInp : {x:0,y:0}); updateCivs(dt); } return 1; }"""
SNAP = """() => { const sw = p => { const lx=((p.x+HALF)%CW+CW)%CW, lz=((p.z+HALF)%CW+CW)%CW; const dx=Math.min(lx, CW-lx), dz=Math.min(lz, CW-lz); return Math.min(dx,dz).toFixed(1); };
  const t = TRAFFIC.map(c => { const lx=((c.pos.x+HALF)%CW+CW)%CW, lz=((c.pos.z+HALF)%CW+CW)%CW; const off=Math.min(Math.min(lx,CW-lx), Math.min(lz,CW-lz)); return [c.speed.toFixed(1), off.toFixed(1), c.pos.distanceTo(P.pos).toFixed(0)].join('/'); });
  const civ = CIVS.filter(c=>!c.dead); const onSide = civ.filter(c => { const v=+sw(c.pos); return v>4.6 && v<7.4; }).length;
  return { civs: civ.length, groups: GROUPS.length, sizes: GROUPS.map(g=>g.members.length+(g.standing?'s':'')+(g.cross?'x':'')).join(' '), onSidewalk: onSide, modes: [...new Set(civ.map(c=>c.mode))].join(','), traffic: t.join(' ') }; }"""
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':480,'height':240})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.add_init_script("localStorage.setItem('rn_q','\"high\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(120):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(2500); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("window.requestAnimationFrame=()=>0; G.state='city'; SPAWN.t=1e9; P.pos.set(41.6,0,60);")
        import time
        for k in range(5):
            t0=time.time(); await pg.evaluate(STEP, 8); el=time.time()-t0
            print(f't={(k+1)*8}s ({el/240*1000:.1f} ms/frame)', json.dumps(await pg.evaluate(SNAP)))
        print('ERR', errs[:5]); await b.close()
asyncio.run(run())
