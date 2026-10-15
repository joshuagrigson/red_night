import asyncio, sys, json
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
async def run(items):
    res={}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1200,'height':500})).new_page()
        pg.on('pageerror', lambda e: print('ERR',e))
        await pg.goto('http://localhost:8765/align.html'); await pg.wait_for_timeout(1500)
        for f,fz,fy,tl in items:
            info = json.loads(await pg.evaluate(f"align('{f}', {str(fz).lower()}, {str(fy).lower()}, {tl})"))
            v = await pg.evaluate("VIEW")
            path=OUT+'al_'+f.replace('.glb','')+'.png'
            await pg.screenshot(path=path)
            im=Image.open(path).convert('RGB'); d=ImageDraw.Draw(im)
            # grid every 0.05 m ; screen x: z = Lz/2 - x/1200*Lz ; y = top - py/400*(top-bot)
            Lz=v['Lz']; top=v['top']; bot=v['bot']
            import math
            for i in range(-30,31):
                z=i*0.05
                x=(Lz/2 - z)/Lz*1200
                if 0<=x<1200: d.line([(x,0),(x,500)],fill=(70,70,90)); d.text((x+2,2),f"{z:+.2f}",fill=(255,220,0))
            for j in range(0,40):
                y=j*0.05
                py=(top-y)/(top-bot)*500
                if 0<=py<500: d.line([(0,py),(1200,py)],fill=(70,70,90)); d.text((2,py+1),f"{y:.2f}",fill=(0,220,255))
            im.save(path)
            info['view']=v; res[f]=info
            print(json.dumps({'f':f,'q':info['q'],'off':info['off'],'size':info['size']}))
        await b.close()
    json.dump(res, open('/home/claude/game/align_out.json','a'))
items=[(a, b=='1', c=='1', float(t)) for a,b,c,t in (x.split(':') for x in sys.argv[1:])]
asyncio.run(run(items))
