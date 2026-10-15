import asyncio, time
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width':800,'height':450})
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error',) else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        t=time.time()
        await pg.add_init_script("localStorage.setItem('rn_q','\"low\"')")
        await pg.goto('http://localhost:8765/test.html')
        for i in range(20):
            await pg.wait_for_timeout(1000)
            st = await pg.evaluate("typeof G!=='undefined' ? G.state : 'nog'")
            print(round(time.time()-t,1), st, flush=True)
            if st=='title': break
        await pg.wait_for_timeout(2000)
        fps = await pg.evaluate("new Promise(r=>{let n=0;const s=performance.now();function f(){n++; if(performance.now()-s<2000) requestAnimationFrame(f); else r(n/2)} requestAnimationFrame(f)})")
        print('fps', fps, flush=True)
        await pg.screenshot(path=OUT+'q_title.png')
        print('errors', errs[:10])
        await b.close()
asyncio.run(run())
