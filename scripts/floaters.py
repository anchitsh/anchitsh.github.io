# Port of the floater block in GlassesLens.shader. Renders build-steps.png for the floaters write-up.
# Usage: python3 floaters.py <output_dir>
import numpy as np, sys
from PIL import Image
O=sys.argv[1]
def frac(x): return x-np.floor(x)
def ss(a,b,x): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def hash21(p):
    p=frac(p*np.array([123.34,456.21])); d=(p*(p+45.32)).sum(-1,keepdims=True); p=p+d; return frac(p[...,0]*p[...,1])
def vnoise(p):
    i=np.floor(p); f=frac(p); f=f*f*(3-2*f)
    a=hash21(i); b=hash21(i+[1,0]); c=hash21(i+[0,1]); d=hash21(i+[1,1])
    return (a+(b-a)*f[...,0])+((c+(d-c)*f[...,0])-(a+(b-a)*f[...,0]))*f[...,1]
def strand(p,k,off,t,parts=("wave","noise","tube","clumps")):
    fk=float(k)
    c=np.array([-0.28+fk*0.3,0.12-fk*0.13])+off*(1+0.35*fk)+np.array([np.sin(t*0.05+fk*2.1),np.cos(t*0.04+fk)])*0.02
    ln=0.09+0.04*fk; q=(p-c)/ln
    wave=np.sin(q[...,0]*(1.9+fk*0.7)+fk*1.7+t*0.03)*0.2
    if "wave2" in parts or "noise" in parts: wave=wave+np.sin(q[...,0]*4.1+fk*3.3)*0.08
    if "noise" in parts: wave=wave+(vnoise(np.stack([q[...,0]*3.0,np.full(q.shape[:-1],fk*7.0)],-1))-0.5)*0.25
    d=np.abs(q[...,1]-wave); ends=ss(1.0,0.5,np.abs(q[...,0]))
    if "tube" in parts:
        body=ss(0.16,0.05,d); edges=ss(0.16,0.11,d)*ss(0.03,0.09,d); s=(body*0.55+edges*0.45)*ends
    else:
        s=ss(0.035,0.0,d)*ends
    if "clumps" in parts:
        cl=ss(0.22,0.06,np.linalg.norm(np.stack([(frac(q[...,0]*1.6+fk*0.37)-0.5)*0.6,d],-1),axis=-1))
        s=np.maximum(s,cl*ends*(hash21(np.stack([np.floor(q[...,0]*1.6+fk*0.37)+fk]*2,-1))>=0.4)*0.7)
    return s
def grid(W,H):
    asp=W/H; ys,xs=np.mgrid[0:H,0:W]; return np.stack([((xs+.5)/W-.5)*asp,(1-(ys+.5)/H)-.5],-1)
def save(a,n): Image.fromarray(np.uint8(np.clip(a,0,1)*255)).save(f"{O}/{n}")
# build-up, one strand, zoomed: sine, + second wave and noise, tube (+ clumps)
# K = which of the shader's three strands to draw. Strand 2 is used because it has a clump
# in its fully opaque middle; strand 0's only clump sits in the faded end and doesn't show.
K=2; fk=float(K); ln=0.09+0.04*fk
centre=np.array([-0.28+fk*0.3,0.12-fk*0.13])+np.array([np.sin(fk*2.1),np.cos(fk)])*0.02
W,H=420,240; p=grid(W,H)*(0.15*ln/0.09)+centre
steps=[("wave",),("wave","noise"),("wave","noise","tube","clumps")]
tiles=[np.ones((H,W,3))*0.97-strand(p,K,np.zeros(2),0.0,st)[...,None]*0.75 for st in steps]
gap=np.ones((H,8,3))
save(np.concatenate([tiles[0],gap,tiles[1],gap,tiles[2]],1),"build-steps.png")
