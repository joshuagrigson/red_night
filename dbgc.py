import asyncio
from playwright.async_api import async_playwright
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1400,'height':520})).new_page()
        await pg.goto('http://localhost:8765/chartest.html')
        for i in range(120):
            await pg.wait_for_timeout(500)
            if await pg.evaluate("window.ready"): break
        print(await pg.evaluate("""(()=>{const out=[];for(const r of rigs){r.root.traverse(o=>{if(o.isMesh){const g=o.geometry;const bad=[];for(const k in g.attributes){if(!g.attributes[k])bad.push(k)}for(const k in g.morphAttributes){(g.morphAttributes[k]||[]).forEach((a,i)=>{if(!a)bad.push('m'+k+i)})} if(!g.index&&0)bad.push('noidx'); out.push(r.glb+':'+o.name+':'+Object.keys(g.attributes).join(',')+' bad='+bad.join(',')+' skel='+(o.skeleton?o.skeleton.bones.filter(b=>!b).length:'-'))}})}return out})()"""))
        await b.close()
asyncio.run(run())
