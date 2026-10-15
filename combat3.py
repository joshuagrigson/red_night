import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':320,'height':180})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:8765/test.html')
        for i in range(40):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1200)
        js = """(wid)=>{ SPAWN.t=1e9; P.eyeH=1.66; P.crouch=0; ENEMIES.slice().forEach(e=>e.remove()); P.hp=1e6; P.maxHp=1e6; P.yaw=0; P.pitch=0; P.vel.set(0,0,0); P.sprintK=0;
          G.load.s1=wid; equipLoadout(false); setWeapon(0); P.switchT=0;
          const w=W[wid]; const near = (w.kind==='melee'||w.kind==='saw');
          const out={};
          for (const k of ['purger','demon','vampire','shifter','reptile','witch']) {
            ENEMIES.slice().forEach(e=>e.remove());
            const e=new Enemy(k,P.pos.x,P.pos.z-(near?1.8:9)); e.face=0; ENEMIES.push(e); e.sync(); e.R.root.updateMatrixWorld(true);
            if(k==='witch') e.pos.y=0.7;
            let shots=0;
            for(let i=0;i<40 && !e.dead;i++){ e.pos.set(P.pos.x, k==='witch'?0.7:0, P.pos.z-(near?1.8:9)); e.vanish=0; e.R.root.visible=true;
              P.fireCd=0; P.cycleT=0; P.reloadT=0; P.meleeT=0; P.slots[0].mag=Math.max(1,P.slots[0].mag);
              if(w.kind==='melee'){ P.meleeDur=w.swing; P.quick=false; meleeHit(); }
              else if(w.kind==='saw'){ for(let j=0;j<10;j++){P.sawAcc=1; INP.fire=true; sawTick(0.1);} INP.fire=false; }
              else if(w.kind==='plasma'||w.kind==='throw'){ fire(); for(let j=0;j<20;j++) updateProj(0.02); }
              else fire();
              shots++; }
            out[k]= e.dead? ('dead in '+shots) : ('hp '+Math.round(e.hp)+' after '+shots);
          }
          return JSON.stringify(out); }"""
        for w in ['kalash','katana','preacher']:
            r = await pg.evaluate(js, w); print(w, r, flush=True)
        print('ERR', errs[:6])
        await b.close()
asyncio.run(run())
