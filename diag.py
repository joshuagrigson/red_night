import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':320,'height':180})).new_page()
        await pg.goto('file:///home/claude/game/dist/test.html')
        for i in range(30):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("typeof G!=='undefined' && G.state==='title'"): break
        print(await pg.evaluate("""(()=>{const m={}; let n=0; scene.traverse(o=>{ if(!(o.isMesh||o.isSprite||o.isPoints||o.isLine)) return; n++; let par=o; let tag=''; while(par.parent&&par.parent!==scene) par=par.parent; tag = o.type+':'+(o.material.type)+':'+(par.userData.dyn?'dyn':'st')+':'+o.geometry.type; m[tag]=(m[tag]||0)+1;}); return JSON.stringify(Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,30))+' total '+n})()"""))
        await b.close()
asyncio.run(run())
