import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':640,'height':360})).new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('file:///home/claude/game/dist/test.html')
        for i in range(40):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        await pg.evaluate("document.getElementById('goChar').click(); document.getElementById('goNight').click()")
        await pg.wait_for_timeout(500)
        await pg.evaluate("G.wakeT=0; leaveApartment()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("SPAWN.t=1e9; P.switchT=0; P.yaw=0; P.pitch=0; window.E=['purger','demon','vampire','shifter','reptile','witch'].map((k,i)=>{const e=new Enemy(k, 0, -12-i*0.01); ENEMIES.push(e); return e;}); P.hp=1e6; P.maxHp=1e6")
        for w in ['patriot15','riot','anvil50','xeno','chainsaw','katana','stars']:
            await pg.evaluate(f"G.load.s1='{w}'; equipLoadout(false); setWeapon(0); P.switchT=0; INP.fire=true; ENEMIES.forEach(e=>{{ if(!e.dead) {{ e.pos.set(0,0,P.pos.z-(W['{w}'].kind==='melee'||W['{w}'].kind==='saw'?2:10)); }} }})")
            await pg.wait_for_timeout(4000)
            r = await pg.evaluate("JSON.stringify({kills:P.kills, alive:ENEMIES.filter(e=>!e.dead).map(e=>e.type+':'+Math.round(e.hp)), wisps:WISPS.length, poss:+P.possT.toFixed(1), ammo:P.s().mag})")
            print(w, r, flush=True)
            if await pg.evaluate("ENEMIES.filter(e=>!e.dead).length===0"):
                await pg.evaluate("['purger','demon','vampire','witch'].forEach((k,i)=>{const e=new Enemy(k, i-1.5, P.pos.z-10); ENEMIES.push(e);})")
        await pg.evaluate("INP.fire=false")
        await pg.screenshot(path=OUT+'c_end.png')
        print('ERR', errs[:6])
        await b.close()
asyncio.run(run())
