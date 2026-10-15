import asyncio, json
from playwright.async_api import async_playwright
JS_RELOAD = """
([id, mag]) => { G.state='paused'; const s = makeSlot(id); P.slots[P.cur] = s; s.mag = mag; s.res = 200; P.reloadT=0; P.switchT=0; P.meleeT=0; P.cycleT=0; P.rStages=null; P.shellMode=false;
  const log=[]; const op=AU.play; AU.play=function(n,o){ log.push(n+'@'+t.toFixed(2)); return false; };
  var t=0; startReload(); const dur=P.reloadDur; let n=0; while ((P.reloadT>0) && n<2000) { tickReloadCoD(1/60); t+=1/60; n++; if (P.reloadT<=0) P.rStages=null; }
  AU.play=op; return {id, start:mag, end:s.mag, cap:s.w.mag, t:+t.toFixed(2), dur:+(dur||0).toFixed?.(2), log}; }
"""
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
        pg = await (await b.new_context(viewport={'width':640,'height':320})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append(m.type+': '+m.text[:300]) if m.type in ('error',) else None)
        await pg.goto('http://localhost:8765/test.html')
        for i in range(90):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(3000); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(3000)
        print('state', await pg.evaluate("G.state"))
        for wid, mag in [('patriot15',10),('patriot15',0),('iron45',0),('preacher',2),('kalash',0),('riot',2),('riot',0),('twin',0),('bren',5),('longshot',0)]:
            r = await pg.evaluate(JS_RELOAD, [wid, mag]); print(json.dumps(r))
        await pg.evaluate("G.state='city'")
        # surfaces: shoot rays at nearby boxes
        r = await pg.evaluate("""() => { const out={}; for (let a=0;a<36;a++){ const d=new T.Vector3(Math.sin(a/36*TAU),-.02,Math.cos(a/36*TAU)).normalize(); const o=P.eye(); const h=rayBoxes(o,d,120); if(!h) continue; const p=o.clone().addScaledVector(d,h.t); const s=surfOfHit(h,p); out[s]=(out[s]||0)+1; impact(p,h.n,s,{}); } const gd=new T.Vector3(.3,-1,.2).normalize(); const g=rayBoxes(P.eye(),gd,50); out.ground=surfOfHit(g,P.eye().addScaledVector(gd,g.t)); out.decalPools=Object.keys(DEC); return out; }""")
        print('surf', r)
        # car damage
        r = await pg.evaluate("""() => { const c = CARS.reduce((a,b)=> a && a.pos.distanceTo(P.pos)<b.pos.distanceTo(P.pos)?a:b); const o=c.pos.clone().add(new T.Vector3(6,1,0)); const d=c.pos.clone().setY(.9).sub(o).normalize(); const h=rayCar(o,d,30); const res={hit:!!h, glass:h&&h.glass}; for(let i=0;i<5;i++) carHit(c,40,o.clone().addScaledVector(d,h.t),h.n,false); res.hp=c.dm.hp; res.holes=c.dm.holes.count; const e=new Enemy('purger', c.pos.x+3, c.pos.z+1); ENEMIES.push(e); const hp0=e.hp; c.dm.hp=10; carHit(c,30,o.clone().addScaledVector(d,h.t),h.n,false); res.dead=c.dead; res.enemyHp=[hp0,e.hp,e.dead]; res.losBlock=!losClear(o, c.pos.clone().add(new T.Vector3(-6,1,0))); return res; }""")
        print('car', r)
        # AI: spawn a squad aware 25m away, run 8 s of real loop
        await pg.evaluate("""() => { for (let k=0;k<5;k++){ const e=new Enemy('purger', P.pos.x+20+k*2, P.pos.z+18, {ranged:1, aware:true}); ENEMIES.push(e);} ENEMIES.push(new Enemy('demon', P.pos.x-30, P.pos.z-30)); P.hp=99999; }""")
        await pg.wait_for_timeout(9000)
        r = await pg.evaluate("""() => ({ enemies: ENEMIES.filter(e=>!e.dead).map(e=>({t:e.type, aware:!!e.aware, sees:!!e.seesP, role:e.role||null, cover:!!e.cover, crouch:e.st.crouch||0, supp:+(e.supp||0).toFixed(2), d:+Math.sqrt(e.dist2()).toFixed(1)})), civs: CIVS.map(c=>c.mode+(c.dead?'-dead':'')), fps: G.fps||null, hp: P.hp })""")
        print('ai', json.dumps(r))
        # player shoots: noise wakes things, civs panic
        await pg.evaluate("""() => { const s=makeSlot('patriot15'); P.slots[P.cur]=s; P.fireCd=0; P.sprintK=0; fire(); }""")
        await pg.wait_for_timeout(1500)
        r = await pg.evaluate("""() => ({ civs: CIVS.map(c=>c.mode), aware: ENEMIES.filter(e=>!e.dead).map(e=>!!e.aware) })""")
        print('after shot', r)
        await pg.screenshot(path='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/c5.png')
        for e in errs[:12]: print(e)
        print('errors', len(errs))
        await b.close()
asyncio.run(run())
