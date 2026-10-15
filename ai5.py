import asyncio, json
from playwright.async_api import async_playwright
STEP = """(secs) => { const dt=1/30; for (let i=0;i<secs*30;i++){ G.t+=dt; G.dt=dt; for (const c of CARS) if (c!==P.inCar) c.update(dt,{x:0,y:0}); for (let k=ENEMIES.length-1;k>=0;k--) ENEMIES[k]&&ENEMIES[k].update(dt); updateSquads(dt); updateCivs(dt); updateMolotovs(dt); updateCarDamage(dt); updateMags(dt); updateProj(dt); FXA.update(dt); FXN.update(dt); P.suppressed=Math.max(0,(P.suppressed||0)-dt*.7);} return 1; }"""
SNAP = """() => ({ hp:+P.hp.toFixed(0), supp:+(P.suppressed||0).toFixed(2), enemies: ENEMIES.filter(e=>!e.dead).map(e=>[e.type, e.aware?'A':'-', e.seesP?'S':'-', e.role||'', e.cover?'C':'', e.st.crouch?'crouch':'', e.peeking?'peek':'', +Math.sqrt(e.dist2()).toFixed(1), +(e.supp||0).toFixed(2)].join(' ')), civs: CIVS.map(c=>c.mode+(c.dead?'-dead':'')+':'+c.pos.distanceTo(P.pos).toFixed(0)), molos: MOLOS.length+FIREZONES.length, decals: Object.values(DEC).filter(d=>d.im).map(d=>d.im.count).reduce((a,b)=>a+b,0) })"""
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':480,'height':240})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('http://localhost:8765/test.html')
        for i in range(90):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(3000); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(2000)
        await pg.evaluate("window.requestAnimationFrame=()=>0; G.state='city'; P.hp=1e6; P.maxHp=1e6;")
        await pg.evaluate(STEP, 12)
        print('civs only', json.dumps(await pg.evaluate(SNAP)))
        # unaware patrol + demon stalking civilians
        await pg.evaluate("() => { ENEMIES.push(new Enemy('demon', P.pos.x-25, P.pos.z+4)); ENEMIES.push(new Enemy('vampire', P.pos.x+5, P.pos.z-40)); const c = CIVS[0]; if (c) { ENEMIES.push(new Enemy('purger', c.pos.x+6, c.pos.z, {ranged:1})); } }")
        await pg.evaluate(STEP, 6); print('stalk', json.dumps(await pg.evaluate(SNAP)))
        # aware squad
        await pg.evaluate("() => { for (let k=0;k<5;k++){ ENEMIES.push(new Enemy('purger', P.pos.x+22+k*1.5, P.pos.z+16-k, {ranged: k<4?1:0, aware:true})); } }")
        for t in range(4):
            await pg.evaluate(STEP, 3); print('t+%d'%((t+1)*3), json.dumps(await pg.evaluate(SNAP)))
        # player suppresses the squad
        await pg.evaluate("() => { const e=ENEMIES.find(e=>e.role==='suppress'&&!e.dead) || ENEMIES.find(e=>e.type==='purger'&&!e.dead); const o=P.eye(); const d=e.headPos().add(new T.Vector3(0,.8,0)).sub(o).normalize(); for(let i=0;i<8;i++) playerShotNoise(o,d,80,false); }")
        await pg.evaluate(STEP, 2); print('suppressed', json.dumps(await pg.evaluate(SNAP)))
        # hide the player behind a building: expect search, flank, molotov
        r = await pg.evaluate("""() => { const b = BOX.filter(b=>b.y1>8 && b.shoot && (b.x1-b.x0)>8 && (b.x1-b.x0)<30 && Math.hypot((b.x0+b.x1)/2-P.pos.x,(b.z0+b.z1)/2-P.pos.z)<80)[0]; if(!b) return 'nobox';
          const cz=(b.z0+b.z1)/2; P.pos.set(b.x1+1.5,0,cz); P.crouching=true;
          ENEMIES.forEach(e=>e.remove()); ENEMIES.length=0;
          for (let k=0;k<4;k++){ const e=new Enemy('purger', b.x0-14, cz-4+k*2.5, {ranged:1, aware:true}); e.molotov=true; e.lastKnown=P.pos.clone(); e.lastSeen=G.t-3; ENEMIES.push(e); }
          return [b.x0,b.x1,b.z0,b.z1]; }""")
        print('box', r)
        for t in range(6):
            await pg.evaluate(STEP, 2.5); print('hid+%.1f'%((t+1)*2.5), json.dumps(await pg.evaluate(SNAP)), await pg.evaluate("ENEMIES.filter(e=>!e.dead).map(e=>[e.pos.x.toFixed(0),e.pos.z.toFixed(0), e.navWp?e.navWp.x.toFixed(0)+','+e.navWp.z.toFixed(0):'-'].join(' '))"))
        for e in errs[:10]: print(e)
        print('errors', len(errs))
        await b.close()
asyncio.run(run())
