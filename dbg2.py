import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':320,'height':180})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('file:///home/claude/game/dist/test.html')
        for i in range(40):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(300)
        await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1200)
        print(await pg.evaluate("""(()=>{ SPAWN.t=1e9; P.eyeH=1.66; ENEMIES.slice().forEach(e=>e.remove()); P.yaw=0; P.pitch=0;
          const e=new Enemy('purger',P.pos.x,P.pos.z-9); ENEMIES.push(e);
          const o=P.eye(), d=P.fwd(); const s=P.s();
          let hits={none:0,world:0,enemy:0}; let walls=[];
          for(let i=0;i<200;i++){ const dd=aimDir(currentSpread(s)); const h=hitscan(o,dd,320); if(!h) hits.none++; else if(h.world){hits.world++; if(walls.length<3) walls.push(h.t.toFixed(2));} else hits.enemy++; }
          return JSON.stringify({o, ppos:P.pos, spread:currentSpread(s), w:s.id, straight:hitscan(o,d,320) && (hitscan(o,d,320).world?'world':'enemy'), hits, walls, onGround:P.onGround, crouching:P.crouching, sprintK:P.sprintK});})()"""))
        await b.close()
asyncio.run(run())
