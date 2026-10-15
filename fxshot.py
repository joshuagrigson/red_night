import asyncio, base64
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
RENDER = """(([ex,ey,ez,ax,ay,az])=>{ const c=new T.PerspectiveCamera(55,2,.05,800); c.position.set(ex,ey,ez); c.lookAt(ax,ay,az); c.updateMatrixWorld(); POST.composer.passes[0].camera=c; POST.composer.render(); const u=renderer.domElement.toDataURL('image/jpeg',.88); POST.composer.passes[0].camera=camera; return u; })"""
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1000,'height':500})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('http://localhost:8765/test.html')
        for i in range(90):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(2500); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(2000)
        await pg.evaluate("window.requestAnimationFrame=()=>0;")
        w = await pg.evaluate("""() => { const out=[]; for (const sfk of ['brick','stone','plaster','wood']) { const b = BOX.find(b=>b.surf===sfk && b.y1>6 && (b.z1-b.z0)>6 && Math.abs(b.x1)<200 && (()=>{ const t=new T.Vector3(b.x1+3.2,0,(b.z0+b.z1)/2); const q=t.clone(); collideCircle(q,.4,0,1.8); return q.distanceTo(t)<.01; })()); if(!b) continue;
             const cz=(b.z0+b.z1)/2; const cam=new T.Vector3(b.x1+3.2,1.9,cz); const at=new T.Vector3(b.x1,1.9,cz); const kinds={};
             for (let i=0;i<34;i++){ const tgt=at.clone().add(new T.Vector3(0,rand(-.4,2.4),rand(-1.6,1.6))); const d=tgt.sub(cam).normalize(); const h=rayBoxes(cam,d,10); if(!h) continue; const pt=cam.clone().addScaledVector(d,h.t); const sf=surfOfHit(h,pt); kinds[sf]=(kinds[sf]||0)+1; impact(pt,h.n,sf,{snd:false}); }
             for (let i=0;i<12;i++){ const pt=new T.Vector3(b.x1+rand(1.2,2.6),0,cz+rand(-1.5,1.5)); impact(pt,new T.Vector3(0,1,0),surfOfHit({box:null},pt),{snd:false}); }
             out.push({sfk, cam:[cam.x,cam.y+.6,cam.z+1.2], at:[at.x,1.6,at.z], kinds}); }
           for (let k=0;k<40;k++){ FXA.update(1/30); FXN.update(1/30); } return out; }""")
        print('wall', w)
        for v in w:
            await pg.evaluate(f"P.pos.set({v['cam'][0]},0,{v['cam'][2]}); updateLights(.1)")
            d = await pg.evaluate(RENDER, [*v['cam'], *v['at']]); open(OUT+'fx_wall_'+v['sfk']+'.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        # pick a car near the player and a building wall behind it
        info = await pg.evaluate("""() => { const c = CARS.slice().sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos))[0];
          const side = new T.Vector3(Math.cos(c.h),0,-Math.sin(c.h)); const eye = c.pos.clone().addScaledVector(side, 7).setY(1.6);
          // spray the car flank
          for (let i=0;i<14;i++){ const tgt=c.pos.clone().add(new T.Vector3(rand(-1.6,1.6),rand(.5,1.3),rand(-1.6,1.6))); const d=tgt.sub(eye).normalize(); const h=rayCar(eye,d,30); if(h) carHit(c,12,eye.clone().addScaledVector(d,h.t),h.n,h.glass); }
          // wall + street holes: shoot from the car side outward
          const o = c.pos.clone().addScaledVector(side,-1.5).setY(1.5); let wall=null;
          for (let i=0;i<60;i++){ const d=new T.Vector3(-side.x+rand(-.25,.25), rand(-.25,.2), -side.z+rand(-.25,.25)).normalize(); const h=rayBoxes(o,d,60); if(!h) continue; const pt=o.clone().addScaledVector(d,h.t); impact(pt,h.n,surfOfHit(h,pt),{snd:false}); if(h.box) wall=pt; }
          for (let i=0;i<20;i++){ const pt=c.pos.clone().addScaledVector(side, rand(2,5)).add(new T.Vector3(rand(-2,2),0,rand(-2,2))).setY(0); impact(pt,new T.Vector3(0,1,0),surfOfHit({box:null},pt),{snd:false}); }
          for (let k=0;k<12;k++){ FXA.update(1/30); FXN.update(1/30); }
          return { eye:[eye.x,eye.y,eye.z], car:[c.pos.x,.9,c.pos.z], wall: wall?[wall.x,wall.y,wall.z]:null, hp:c.dm.hp }; }""")
        print(info)
        e, cpos = info['eye'], info['car']
        d = await pg.evaluate(RENDER, [*e, *cpos]); open(OUT+'fx_car.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        if info['wall']:
            w = info['wall']; d = await pg.evaluate(RENDER, [cpos[0]+(w[0]-cpos[0])*.55, 1.7, cpos[2]+(w[2]-cpos[2])*.55, *w]); open(OUT+'fx_wall.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        # blow it up
        await pg.evaluate("() => { const c = CARS.slice().sort((a,b)=>a.pos.distanceTo(P.pos)-b.pos.distanceTo(P.pos))[0]; carExplode(c); for (let k=0;k<20;k++){ updateCarDamage(1/30); FXA.update(1/30); FXN.update(1/30); updateFires(1/30); updateLights(1/30);} }")
        d = await pg.evaluate(RENDER, [*e, *cpos]); open(OUT+'fx_boom.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        await pg.evaluate("() => { for (let k=0;k<120;k++){ updateCarDamage(1/30); FXA.update(1/30); FXN.update(1/30); updateFires(1/30); updateLights(1/30);} }")
        d = await pg.evaluate(RENDER, [*e, *cpos]); open(OUT+'fx_wreck.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        print('ERR', errs[:5]); await b.close()
asyncio.run(run())
