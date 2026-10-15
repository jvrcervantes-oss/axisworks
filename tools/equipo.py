"""equipo.py -- bustos de los departamentos del organigrama (PIL, sin credito).

    python tools/equipo.py <carpeta de salida> [db,costs]     (sin lista: todos; con lista: solo esos)

Escribe dep-<cara>.webp en la salida, y prev_<cara>.png y sheet.png (hoja de contacto) en el directorio actual.
El dibujo de cada busto sale de su posicion en NAMES (semilla): un glifo nuevo va AL FINAL o cambian los demas.
"""
import numpy as np, math, random, sys
from PIL import Image, ImageDraw
if len(sys.argv) < 2:
    sys.exit(__doc__)
S=720; SS=3; W=S*SS
yy,xx=np.mgrid[0:S,0:S].astype(float)
COL=(244,242,236)
def bust(rnd):
    k=S/1254
    cx=640*k+rnd.uniform(-14,14)*k
    hry=rnd.uniform(245,280)*k; hrx=rnd.uniform(165,215)*k; jaw=rnd.uniform(35,62)*k
    hcy=520*k
    hv=(yy-hcy)/hry; rx=hrx-jaw*np.clip(hv,0,1)**1.5
    hu=((xx-cx)/rx)**2+hv**2
    head=np.where(hu<1,200*k*np.sqrt(np.clip(1-hu,0,1)),-1)
    nw=rnd.uniform(80,100)*k
    neck=np.where((abs(xx-cx)<nw)&(yy>hcy+100*k)&(yy<930*k),110*k*np.sqrt(np.clip(1-((xx-cx)/nw)**2,0,1)),-1)
    dx=np.abs(xx-640*k); slope=rnd.uniform(0.0010,0.0016)/k
    top=835*k+slope*np.maximum(dx-70*k,0)**2; sw=rnd.uniform(560,630)*k
    wu=np.clip(dx/sw,0,1)
    sh=np.where((yy>top)&(dx<sw),260*k*np.sqrt(1-wu**2)*np.clip((yy-top)/(120*k),0,1)**0.5+20*k,-1)
    z=np.maximum(np.maximum(head,neck),sh); inside=z>=0
    gy,gx=np.gradient(np.where(inside,z,0))
    n=np.dstack([-gx,-gy,np.ones_like(gx)*1.6]); n/=np.linalg.norm(n,axis=2,keepdims=True)
    L=np.array([rnd.uniform(-0.7,-0.4),-0.5,0.62]); L/=np.linalg.norm(L)
    key=np.clip((n*L).sum(2),0,1)**1.4
    R2=np.array([0.95,-0.15,0.25]); R2/=np.linalg.norm(R2)
    rim=np.clip((n*R2).sum(2),0,1)**6*0.8
    shade=np.clip(np.where(yy>860*k,key*0.45,key)+rim,0,1)*np.clip(1.25-(yy-700*k)/(900*k),0.35,1)
    r=np.hypot(xx-600*k,yy-520*k)/S
    bg=np.clip(0.17-0.14*r,0.03,0.17)
    img=Image.fromarray((np.dstack([bg]*3)*255).astype(np.uint8)).resize((W,W),Image.BICUBIC)
    d=ImageDraw.Draw(img)
    g0=int(57*k)
    for q in range(0,S,g0):
        d.line([(q*SS,0),(q*SS,W)],fill=(33,33,33),width=SS); d.line([(0,q*SS),(W,q*SS)],fill=(33,33,33),width=SS)
    step=max(int(13*k*1.25),7)
    for y in range(step//2,S,step):
        for x in range(step//2,S,step):
            if not inside[y,x]: continue
            v=0.06+0.94*shade[y,x]; rad=max(step*0.5*math.sqrt(v),0.8)
            g=int(70+185*v); R=rad*SS
            d.ellipse([x*SS-R,y*SS-R,x*SS+R,y*SS+R],fill=(g,g,g))
    return img,d,cx*SS,(hcy)*SS,k
def P(u):  # unit scale for glyphs
    return u
def glyph(d,name,cx,cy,k):
    a=92*k*SS; w=int(9*k*SS)+1; w2=max(int(5*k*SS),3)
    def L(*pts,wd=w): d.line([(cx+x*a,cy+y*a) for x,y in pts],fill=COL,width=wd,joint='curve')
    def C(x,y,r,wd=w,fill=None): d.ellipse([cx+(x-r)*a,cy+(y-r)*a,cx+(x+r)*a,cy+(y+r)*a],outline=COL,width=wd,fill=fill)
    def A(x,y,r,s,e,wd=w): d.arc([cx+(x-r)*a,cy+(y-r)*a,cx+(x+r)*a,cy+(y+r)*a],s,e,fill=COL,width=wd)
    if name=='ceo': L((-1,-1),(1,1)); L((-1,1),(1,-1))
    elif name=='dev': L((-.45,-.6),(-1,0),(-.45,.6)); L((.45,-.6),(1,0),(.45,.6)); L((.2,-.8),(-.2,.8))
    elif name=='design': C(-.3,.1,.55); d.rectangle([cx-.05*a,cy-.75*a,cx+.85*a,cy+.15*a],outline=COL,width=w)
    elif name=='data':
        for yy_ in (-.6,0,.6): d.ellipse([cx-.8*a,cy+(yy_-.25)*a,cx+.8*a,cy+(yy_+.25)*a],outline=COL,width=w)
        L((-.8,-.6),(-.8,.6)); L((.8,-.6),(.8,.6))
    elif name=='security': d.rectangle([cx-.7*a,cy-.1*a,cx+.7*a,cy+.85*a],outline=COL,width=w); A(0,-.35,.45,180,360); L((-.45,-.35),(-.45,-.1)); L((.45,-.35),(.45,-.1)); C(0,.35,.08,fill=COL)
    elif name=='marketing': C(0,0,.9); C(0,0,.55); C(0,0,.18,fill=COL)
    elif name=='legal': L((0,-.85),(0,.8)); L((-.5,.8),(.5,.8)); L((-.9,-.55),(.9,-.55)); L((-.9,-.55),(-1.1,.05),(-.7,.05),(-.9,-.55)); L((.9,-.55),(.7,.05),(1.1,.05),(.9,-.55))
    elif name=='docs': L((-.6,-.9),(.3,-.9),(.65,-.55),(.65,.9),(-.6,.9),(-.6,-.9)); [L((-.35,y),(.4,y),wd=w2) for y in (-.3,0,.3,.6)]
    elif name=='bots': d.rounded_rectangle([cx-.95*a,cy-.7*a,cx+.95*a,cy+.45*a],radius=int(.25*a),outline=COL,width=w); L((-.45,.45),(-.65,.9),(-.1,.45)); [C(x,-.12,.1,fill=COL) for x in (-.45,0,.45)]
    elif name=='deploy': L((0,.55),(0,-.85)); L((-.5,-.35),(0,-.85),(.5,-.35)); L((-.8,.9),(.8,.9))
    elif name=='admin': L((.7,-.8),(-.7,.8)); C(-.5,-.5,.25); C(.5,.5,.25)
    elif name=='arch': L((-.8,.85),(-.8,-.15),(0,-.9),(.8,-.15),(.8,.85),(-.8,.85)); d.rectangle([cx-.22*a,cy+.3*a,cx+.22*a,cy+.85*a],outline=COL,width=w2)
    elif name=='comms': C(0,0,.13,fill=COL); A(0,0,.5,-50,50); A(0,0,.5,130,230); A(0,0,.9,-45,45); A(0,0,.9,135,225)
    elif name=='models': L((0,-.9),(.8,-.45),(.8,.45),(0,.9),(-.8,.45),(-.8,-.45),(0,-.9)); L((0,0),(-.8,-.45)); L((0,0),(.8,-.45)); L((0,0),(0,.9))
    elif name=='pilots': L((-.9,.1),(.9,-.8),(.3,.85),(-.1,.2),(-.9,.1)); L((-.1,.2),(.9,-.8))
    elif name=='product': [ (C(-.7,y,.1,fill=COL), L((-.4,y),(x,y))) for y,x in ((-.6,.85),(0,.5),(.6,.15)) ]
    elif name=='ux': L((-.55,-.9),(-.55,.55),(-.2,.25),(.1,.85),(.32,.75),(.02,.15),(.5,.15),(-.55,-.9))
    elif name=='lang': C(0,0,.85); d.ellipse([cx-.38*a,cy-.85*a,cx+.38*a,cy+.85*a],outline=COL,width=w2); L((-.85,0),(.85,0),wd=w2); L((-.72,-.45),(.72,-.45),wd=w2); L((-.72,.45),(.72,.45),wd=w2)
    elif name=='costs': L((-.9,-.7),(-.35,-.1),(.05,-.4),(.75,.55)); L((.3,.6),(.8,.6),(.8,.1))
    elif name=='support': C(0,0,.85); C(0,0,.4); [L((.4*cx_,.4*cy_),(.85*cx_,.85*cy_)) for cx_,cy_ in ((.707,.707),(-.707,.707),(.707,-.707),(-.707,-.707))]
    elif name=='db':  # Base de datos (15-oct-2026): un cilindro de base con la lupa de quien la audita
        d.ellipse([cx-.9*a,cy-.85*a,cx+.2*a,cy-.45*a],outline=COL,width=w); L((-.9,-.65),(-.9,.6)); L((.2,-.65),(.2,-.25))
        d.arc([cx-.9*a,cy+.4*a,cx+.2*a,cy+.8*a],20,180,fill=COL,width=w); A(-.35,0,.55,20,160,wd=w2)
        C(.42,.3,.36); L((.68,.56),(1.0,.9))
    elif name=='org':C(0,-.65,.2); C(-.7,.65,.2); C(.7,.65,.2); L((0,-.45),(0,0)); L((-.7,0),(.7,0)); L((-.7,0),(-.7,.45)); L((.7,0),(.7,.45))
    # registration brackets, like Pepito's
    b=1.55*a; t=.3*a
    for sx in (-1,1):
        for sy in (-1,1):
            X,Y=cx+sx*b,cy+sy*b
            d.line([(X,Y),(X-sx*t,Y)],fill=COL,width=w2); d.line([(X,Y),(X,Y-sy*t)],fill=COL,width=w2)
NAMES=['dev','design','data','security','marketing','legal','docs','bots','deploy','admin','arch','comms','org','models','pilots','product','ux','lang','costs','support','db']
SOLO=sys.argv[2].split(',') if len(sys.argv)>2 else None   # python equipo.py <salida> [models,pilots]: solo esos (el seed sale del indice, los demas no cambian)
out=sys.argv[1]
for i,nm in enumerate(NAMES):
    if SOLO and nm not in SOLO: continue
    rnd=random.Random(1000+i*37)
    img,d,cx,cy,k=bust(rnd)
    glyph(d,nm,cx,cy,k)
    im=img.resize((S,S),Image.LANCZOS).crop((int(170*S/1254),int(150*S/1254),int(1110*S/1254),int(1090*S/1254))).resize((360,360),Image.LANCZOS)
    im.save(f'{out}/dep-{nm}.webp','WEBP',quality=80,method=6)
    im.save(f'prev_{nm}.png')
from PIL import Image as I
FILAS=(len(NAMES)+6)//7   # la hoja crece con NAMES: con 3 filas fijas el busto 22.º se perdia sin aviso
sheet=I.new('RGB',(360*7,360*FILAS),(240,240,240))
for i,nm in enumerate(NAMES):
    if SOLO and nm not in SOLO: continue
    sheet.paste(I.open(f'prev_{nm}.png'),((i%7)*360,(i//7)*360))
sheet.resize((1260,180*FILAS)).save('sheet.png')
