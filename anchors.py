import asyncio, sys, json
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
OUT='/tmp/claude-0/-home-claude/eb643de0-1be9-5ee3-bb39-eecab359e0cd/scratchpad/shots/'
import os
SPEC = json.loads(open(os.environ.get('SPEC','spec.json')).read())
def est(pts, kind):
    zs=[p[2] for p in pts]; zmin,zmax=min(zs),max(zs); L=zmax-zmin; h=max(p[1] for p in pts)
    nb=80; top=[None]*nb; bot=[None]*nb
    for x,y,z in pts:
        i=min(nb-1,int((z-zmin)/L*nb))
        top[i]=y if top[i] is None or y>top[i] else top[i]; bot[i]=y if bot[i] is None or y<bot[i] else bot[i]
    zc=lambda i: zmin+(i+.5)/nb*L
    def near(arr,z):
        i=min(nb-1,max(0,int((z-zmin)/L*nb)));
        for d in range(nb):
            for j in (i-d,i+d):
                if 0<=j<nb and arr[j] is not None: return arr[j]
    mz=[p for p in pts if p[2]<zmin+0.03*L]; my=sorted(p[1] for p in mz)[len(mz)//2]
    muzzle=[0,my,zmin]
    if kind=='melee':
        gz=zmax-0.12*L; gy=(near(top,gz)+near(bot,gz))/2
        return dict(grip=[0,gy,gz], sup=[0,gy,gz+0.05*L], sight=[0,h,0], rail=[0,h,0], muzzle=muzzle, L=L, h=h)
    # grip: rear-most deep low protrusion in [-0.15L, +0.42L] (relative to center)
    cand=[i for i in range(nb) if bot[i] is not None and -0.15*L<=zc(i)-(zmin+L/2)<=0.42*L and bot[i]<0.27*h]
    if kind=='pistol' or not cand:
        lows=[i for i in range(nb) if bot[i] is not None and bot[i]<0.2*h]; gi=max(lows) if lows else nb//2
    else:
        gi=max(cand)
        # walk forward to the middle of this protrusion
        j=gi
        while j-1 in cand: j-=1
        gi=(gi+j)//2
    gz=zc(gi); gy=bot[gi]+0.62*(near(top,gz)-bot[gi]) if kind!='pistol' else bot[gi]+0.7*(near(top,gz)-bot[gi])
    # sight: highest top near the rear/centre
    win=[i for i in range(nb) if top[i] is not None and -0.25*L<=zc(i)-(zmin+L/2)<=0.15*L]
    si=max(win,key=lambda i: top[i]); sight=[0,top[si]-0.012*h*3,zc(si)]
    if kind=='pistol':
        sup=[0,gy-0.02,gz+0.02]; rail=[0,near(top,gz-0.1*L),gz-0.1*L]
    else:
        sz_=max(zmin+0.1*L, gz-0.40*L); sup=[0,near(bot,sz_)+0.015,sz_]; rail=[0,near(top,gz-0.12*L),gz-0.12*L]
    return dict(grip=[0,gy,gz], sup=sup, sight=sight, rail=rail, muzzle=muzzle, L=L, h=h)
async def run():
    res={}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width':1200,'height':500})).new_page()
        pg.on('pageerror', lambda e: print('ERR',e))
        await pg.goto('http://localhost:8765/align.html'); await pg.wait_for_timeout(1500)
        for f,sp in SPEC.items():
            info = json.loads(await pg.evaluate(f"align('{f}', {str(sp['fz']).lower()}, {str(sp['fy']).lower()}, {sp.get('tilt',0)})"))
            v = await pg.evaluate("VIEW"); pts = await pg.evaluate("PTS.map(p=>[p.x,p.y,p.z])")
            a = est(pts, sp['kind'])
            def prof(fx):
                z=v['Lz']/2-fx*v['Lz']; L=a['L']; near=[p for p in pts if abs(p[2]-z)<0.012*L]
                ys=[p[1] for p in near] or [a['h']/2]; return z,min(ys),max(ys)
            if 'gx' in sp:
                z,lo,hi=prof(sp['gx']); a['grip']=[0,lo+sp.get('gk',.62)*(hi-lo),z]
            if 'sx' in sp:
                z,lo,hi=prof(sp['sx']); a['sup']=[0,lo+.015,z]
            path=OUT+'an_'+f.replace('.glb','')+'.png'; await pg.screenshot(path=path)
            im=Image.open(path).convert('RGB'); d=ImageDraw.Draw(im); Lz=v['Lz']; top=v['top']; bot=v['bot']
            P=lambda q: ((Lz/2-q[2])/Lz*1200, (top-q[1])/(top-bot)*500)
            for k,c in (('grip',(255,0,0)),('sup',(0,255,0)),('sight',(255,255,0)),('rail',(255,0,255)),('muzzle',(0,200,255))):
                x,y=P(a[k]); d.ellipse([x-7,y-7,x+7,y+7],outline=c,width=3); d.text((x+9,y-6),k,fill=c)
            im.save(path)
            res[f]=dict(view=v, q=info['q'], off=info['off'], anchors={k:[round(t,4) for t in a[k]] for k in ('grip','sup','sight','rail','muzzle')}, nativeLen=round(a['L'],4))
            print(f, json.dumps(res[f]['anchors']))
        await b.close()
    json.dump(res, open(os.environ.get('AOUT','anchors_out.json'),'w'), indent=1)
asyncio.run(run())
