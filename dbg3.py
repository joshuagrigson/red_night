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
        print(await pg.evaluate("""(()=>{ SPAWN.t=1e9; P.eyeH=1.66; ENEMIES.slice().forEach(e=>e.remove()); P.yaw=0; P.pitch=0; P.sprintK=0;
          G.load.s1='kurz5'; equipLoadout(false); setWeapon(0); P.switchT=0;
          const e=new Enemy('purger',P.pos.x,P.pos.z-9); ENEMIES.push(e);
          const orig=window.hitscan; const log={world:0,enemy:0,none:0,calls:0};
          window.hitscan = function(o,d,m){ const h=orig(o,d,m); log.calls++; if(!h) log.none++; else if(h.world) log.world++; else log.enemy++; return h; };
          const ret=[];
          for(let i=0;i<10;i++){ P.fireCd=0; P.cycleT=0; P.reloadT=0; P.meleeT=0; const before=P.slots[0].mag; fire(); ret.push(before+'>'+P.slots[0].mag); }
          window.hitscan=orig;
          return JSON.stringify({log, ret, hp:e.hp, sprint:P.sprintK, sb:P.sprintBlock, pitch:P.pitch});})()"""))
        await b.close()
asyncio.run(run())
