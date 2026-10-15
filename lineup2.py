import asyncio, base64, json
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
RENDER = """(([ex,ey,ez,ax,ay,az,fov])=>{ const c=new T.PerspectiveCamera(fov,2,.05,800); c.position.set(ex,ey,ez); c.lookAt(ax,ay,az); c.updateMatrixWorld(); VM.root.visible=false; POST.composer.passes[0].camera=c; POST.composer.render(); const u=renderer.domElement.toDataURL('image/jpeg',.9); POST.composer.passes[0].camera=camera; return u; })"""
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1400,'height':700})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append(m.type+': '+m.text[:200]) if m.type=='error' else None)
        await pg.goto('http://localhost:8765/test.html')
        for i in range(90):
            await pg.wait_for_timeout(1000)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("G.char.gender='m'; G.char.outfit='nomad'; G.char.skin=2; G.char.hairCol=0; document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(2500); await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(2000)
        res = await pg.evaluate("""() => { window.requestAnimationFrame=()=>0; SPAWN.t=1e9; ENEMIES.slice().forEach(e=>e.remove()); CIVS.slice().forEach(c=>c.remove());
          const X0=P.pos.x, Z0=P.pos.z-8; const row=[];
          const mk=(label, fn)=>{ const i=row.length; const o=fn(X0-11+i*2.0, Z0); row.push({label,o}); };
          mk('purger gun', (x,z)=>{ const e=new Enemy('purger',x,z,{ranged:1}); ENEMIES.push(e); return e; });
          mk('purger gun2', (x,z)=>{ const e=new Enemy('purger',x,z,{ranged:1}); ENEMIES.push(e); return e; });
          mk('purger bat', (x,z)=>{ const e=new Enemy('purger',x,z,{ranged:0}); ENEMIES.push(e); return e; });
          mk('demon', (x,z)=>{ const e=new Enemy('demon',x,z); ENEMIES.push(e); return e; });
          mk('vampire', (x,z)=>{ const e=new Enemy('vampire',x,z); ENEMIES.push(e); return e; });
          mk('shifter (disguised)', (x,z)=>{ const e=new Enemy('shifter',x,z); ENEMIES.push(e); return e; });
          mk('shifter (beast)', (x,z)=>{ const e=new Enemy('shifter',x,z); ENEMIES.push(e); e.transform(); e.morphT=5; return e; });
          mk('reptile (suit)', (x,z)=>{ const e=new Enemy('reptile',x,z); ENEMIES.push(e); return e; });
          mk('reptile (revealed)', (x,z)=>{ const e=new Enemy('reptile',x,z); ENEMIES.push(e); e.reveal(); e.morphT=5; return e; });
          mk('witch', (x,z)=>{ const e=new Enemy('witch',x,z); ENEMIES.push(e); return e; });
          mk('civilian A', (x,z)=>{ const c=new Civ(x,z); c.rig='civilian'; CIVS.push(c); return c; });
                    mk('player body', (x,z)=>{ PBODY.root.position.set(x,0,z); return {R:PBODY, pos:new T.Vector3(x,0,z), face:0, st:PBODY.st, sync(){ PBODY.root.position.copy(this.pos); PBODY.root.rotation.y=0; }}; });
          const v=new T.Vector3(), a=new T.Vector3(), c=new T.Vector3();
          for (let k=0;k<45;k++) for (const r of row){ const o=r.o; o.face=0; if(o.vel) o.vel.set(0,0,0); o.st.speed=0; o.st.t=(o.st.t||0)+1/30; if (o.type==='purger' && o.ranged) o.st.aimHold=1; if(o.type==='witch') o.pos.y=.7; if (o.R.glb) animGLB(o.R,o.st,1/30); o.sync(); }
          return row.map(r=>{ const R=r.o.R; if(!R.glb) return {label:r.label, rig:'PROCEDURAL'}; const m=R.model; m.updateMatrixWorld(true);
            const top=findBone(m,'headtopend')||R.head; top.getWorldPosition(v); const la=findBone(m,'leftarm'), ra=findBone(m,'rightarm'); la.getWorldPosition(a); ra.getWorldPosition(c);
            const root=R.root.position.y; return {label:r.label, rig:R.glb, topY:+(v.y-root).toFixed(2), expect:CHARS[R.glb].h, rightIsPlusX: c.x>a.x, clip:R.curName, visible:R.root.visible, gun:!!R.gunMount, cust:!!R.cust, x:+R.root.position.x.toFixed(1)}; }); }""")
        for r in res: print(json.dumps(r))
        x0 = await pg.evaluate("P.pos.x"); z0 = await pg.evaluate("P.pos.z-8")
        await pg.evaluate("PBODY.root.visible=true")
        print('GUNS', await pg.evaluate("""() => { const out=[]; for (const id of ['preacher','vexor','kalash','patriot15','riot']) { const e=new Enemy('purger', P.pos.x, P.pos.z-30, {ranged:1}); ENEMIES.push(e); e.R.root.remove; 
              // force a specific gun
              e.R.gunMount.g.clear(); const built=buildWeapon(W[id], defaultCfg(W[id]), true); built.g.rotation.x=-Math.PI/2; built.g.position.set(0,-.07,-.02); const hold=new T.Group(); hold.add(built.g); e.R.gunMount.g.add(hold); e.R.gunMount.mode='tpp';
              e.face=0; e.sync(); e.st.aimHold=1; for(let k=0;k<20;k++) animGLB(e.R,e.st,1/30); e.R.root.updateMatrixWorld(true);
              const a=new T.Vector3(), b=new T.Vector3(); built.g.getWorldPosition(a); const tip=new T.Object3D(); tip.position.set(0,0,-1); built.g.add(tip); tip.getWorldPosition(b); const d=b.sub(a).normalize();
              out.push(id+' fwd='+d.toArray().map(v=>v.toFixed(2))+' muzzle='+(built.muzzle?'y':'n')); e.remove(); } return out.join(' | '); }"""))
        print('BONES', await pg.evaluate("""() => { const v=new T.Vector3(); const out=[]; const all=[...ENEMIES.map(e=>[e.type+'/'+e.R.glb,e.R]), ...CIVS.map(c=>['civ/'+c.R.glb,c.R]), ['player',PBODY]]; for (const [n,R] of all){ R.root.traverse(o=>{ if(o.isSkinnedMesh){ const b=o.skeleton.bones.find(b=>/Hips/i.test(b.name))||o.skeleton.bones[0]; b.getWorldPosition(v); let anc=b; while(anc.parent) anc=anc.parent; const inRoot = (()=>{ let a=b; while(a){ if(a===R.root) return true; a=a.parent;} return false; })(); out.push(n+' rootX='+R.root.position.x.toFixed(1)+' hipsX='+v.x.toFixed(2)+' boneInOwnRoot='+inRoot+' verts='+o.geometry.attributes.position.count); } }); } return out.join(' | '); }"""))
        print(await pg.evaluate("""() => { const out=[]; scene.children.forEach(o=>{ if(!o.isGroup) return; let sk=0, names=new Set(); o.traverse(c=>{ if(c.isSkinnedMesh){ sk++; } }); if(!sk) return; const e=ENEMIES.find(e=>e.R.root===o), c=CIVS.find(c=>c.R.root===o); out.push([o.position.x.toFixed(1), o.position.z.toFixed(1), o.visible, sk, e? e.type+'/'+e.mode+'/'+e.R.glb : c? 'civ/'+c.R.glb : (o===PBODY.root?'player':'?')].join(' ')); }); return out.join(' | '); }"""))
        for k,r in enumerate(res):
            xx=r['x']; await pg.evaluate(f"flashLight.position.set({xx},2.2,{z0}-2); flashLight.color.set(0xffffff); flashLight.intensity=3; flashLight.distance=8;"); d = await pg.evaluate(RENDER, [xx, 1.25, z0-3.4, xx, 1.0, z0, 36]); open(OUT+f'lu_{k}.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        json.dump([r['label']+' · '+str(r.get('rig')) for r in res], open(OUT+'lu_labels.json','w'))
        print('ERR', errs[:6]); await b.close()
asyncio.run(run())
