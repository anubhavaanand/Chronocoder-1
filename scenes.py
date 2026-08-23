#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Per-mentor 3D hero scenes (Three.js r128).

Each scene is era-authentic to the mentor:
  gears    - Ada Lovelace      : interlocking gear train of the Analytical Engine
  donut    - Linus Torvalds    : the spinning ASCII donut (donut.c homage)
  compass  - Grace Hopper      : naval compass rose with swinging needle
  rotors   - Alan Turing       : Enigma rotors counter-spinning
  orbit    - Margaret Hamilton : lunar trajectory around Earth
  pipeline - Dennis Ritchie    : minimal Unix pipeline with traveling pulse
  nested   - Barbara Liskov    : substitutable nested wireframes
  knot     - Guido van Rossum  : trefoil knot, an homage to the Python logo

Created by: Anubhav
Project: ChronoCoder - AI Mentor Chatbot
"""

_SHELL = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap');
html,body{{margin:0;padding:0;background:transparent;overflow:hidden}}
.cc-hero{{position:relative;height:100%;min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem 1rem}}
#stage,#ascii{{position:absolute;inset:0;z-index:0}}
.cc-hero-inner{{position:relative;z-index:1}}
.cc-kicker{{font-family:'JetBrains Mono',monospace;font-size:.68rem;letter-spacing:.34em;text-transform:uppercase;color:#6f6759;margin-bottom:1.1rem}}
.cc-kicker b{{color:{accent};font-weight:500}}
.cc-title{{font-family:'Fraunces',serif;font-size:clamp(1.9rem,4.6vw,3rem);font-weight:520;line-height:1.12;color:#eae3d2;margin:0 0 .9rem}}
.cc-title em{{font-style:italic;color:{accent};font-weight:480}}
.cc-sub{{font-family:'Inter',sans-serif;font-size:clamp(.88rem,1.5vw,1.02rem);color:#a89f8d;max-width:36em;margin:0 auto 1.2rem;line-height:1.65}}
.cc-quote{{font-family:'Fraunces',serif;font-style:italic;font-size:.98rem;color:#a89f8d;border-top:1px solid rgba(234,227,210,.14);padding-top:.9rem;max-width:30em;margin:0 auto}}
</style></head>
<body>
<div class="cc-hero">
  {canvas}
  <div class="cc-hero-inner">
    <p class="cc-kicker">Exhibit {exhibit_no} &middot; {era_label} &middot; {era_year}</p>
    <h1 class="cc-title">{title_line}</h1>
    <p class="cc-sub">{sub}</p>
    <p class="cc-quote">&ldquo;{quote}&rdquo;</p>
  </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var ACCENT = '{accent}';
{script}
</script>
</body></html>"""

_ASCII_CANVAS = "<pre id=\"ascii\" style=\"font-family:'JetBrains Mono',monospace;font-size:8px;line-height:8px;color:%s;opacity:.32;display:flex;align-items:center;justify-content:center\"></pre>"


def _three_shell(exhibit_no, era_label, era_year, title_line, sub, quote, accent, script):
    return _SHELL.format(
        exhibit_no=exhibit_no, era_label=era_label, era_year=era_year,
        title_line=title_line, sub=sub, quote=quote, accent=accent,
        canvas='<canvas id="stage"></canvas>', script=script,
    )


def _base_three_js():
    return """
var canvas=document.getElementById('stage');
var renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
var scene=new THREE.Scene();
var camera=new THREE.PerspectiveCamera(42,2,.1,100);
camera.position.set(0,0,7);
var group=new THREE.Group();scene.add(group);
var mx=0,my=0;
window.addEventListener('pointermove',function(e){
  mx=(e.clientX/window.innerWidth-.5)*.35;
  my=(e.clientY/window.innerHeight-.5)*.22;
});
function ringLine(r,seg,opacity,color){
  var pts=[];for(var i=0;i<=seg;i++){var a=i/seg*Math.PI*2;
  pts.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0));}
  var g=new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(g,new THREE.LineBasicMaterial({color:color||ACCENT,transparent:true,opacity:opacity}));
}
function lineLoop(pts,opacity){
  var g=new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(g,new THREE.LineBasicMaterial({color:ACCENT,transparent:true,opacity:opacity}));
}
function resize(){
  var w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
"""


def _gears_scene():
    """Ada - Analytical Engine gear train."""
    return _base_three_js() + """
function makeGear(r,teeth,depth){
  var g=new THREE.Group();
  g.add(ringLine(r,96,.75));
  for(var i=0;i<teeth;i++){
    var a=i/teeth*Math.PI*2;
    var geo=new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a)*(r+.16),Math.sin(a)*(r+.16),0),
      new THREE.Vector3(Math.cos(a+.06)*(r+.30),Math.sin(a+.06)*(r+.30),0),
      new THREE.Vector3(Math.cos(a+.13)*(r+.16),Math.sin(a+.13)*(r+.16),0)
    ]);
    g.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:ACCENT,transparent:true,opacity:.7})));
  }
  for(var s=0;s<6;s++){
    var a=s/6*Math.PI*2;
    g.add(lineLoop([new THREE.Vector3(0,0,0),
      new THREE.Vector3(Math.cos(a)*r*.55,Math.sin(a)*r*.55,0)],.28));
  }
  g.add(ringLine(r*.18,24,.8));
  return g;
}
var gA=makeGear(1.5,16),gB=makeGear(1.05,11),gC=makeGear(.72,8);
gB.position.set(2.62,-.45,0);gC.position.set(-2.15,1.15,-.6);
group.add(gA);group.add(gB);group.add(gC);
group.rotation.x=.42;
var t=0;
(function frame(){
  t+=REDUCE?0:.008;
  if(!REDUCE){gA.rotation.z=t;gB.rotation.z=-t*16/11+offsetB();gC.rotation.z=t*16/8;}
  group.rotation.y=.25+mx;
  renderer.render(scene,camera);requestAnimationFrame(frame);
})();
function offsetB(){return Math.PI/11;}
"""


def _compass_scene():
    """Grace - naval compass rose."""
    return _base_three_js() + """
var rose=new THREE.Group();
rose.add(ringLine(2.5,128,.5));
rose.add(ringLine(2.1,128,.3));
for(var i=0;i<32;i++){
  var a=i/32*Math.PI*2,len=(i%8==0)?.42:(i%4==0)?.26:.13;
  rose.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a)*2.1,Math.sin(a)*2.1,0),
      new THREE.Vector3(Math.cos(a)*(2.1-len),Math.sin(a)*(2.1-len),0)]),
    new THREE.LineBasicMaterial({color:ACCENT,transparent:true,opacity:i%8==0?.85:.4})));
}
var needle=lineLoop([new THREE.Vector3(0,1.7,0),new THREE.Vector3(.09,0,0),
  new THREE.Vector3(0,-1.15,0),new THREE.Vector3(-.09,0,0),new THREE.Vector3(0,1.7,0)],.95);
needle.material.color.setHex(0xdfb84a);
rose.add(needle);
rose.add(ringLine(.08,16,.9));
group.add(rose);
var t=0;
(function frame(){
  t+=REDUCE?0:.0012;
  needle.rotation.z=Math.PI/3+Math.sin(t*2)*.5;
  rose.rotation.x=-mx*.8;rose.rotation.y=my*.5;
  group.rotation.z=.12;
  renderer.render(scene,camera);requestAnimationFrame(frame);
})();
"""


def _rotors_scene():
    """Alan - three Enigma rotors."""
    return _base_three_js() + """
function rotor(x,r,speed,dir,op){
  var g=new THREE.Group();
  g.add(ringLine(r,64,.7));
  g.add(ringLine(r*.86,64,.35));
  var spokes=[];
  for(var i=0;i<26;i++){
    var a=i/26*Math.PI*2;
    spokes.push(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(a)*r*.86,Math.sin(a)*r*.86,0),
        new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0)]),
      new THREE.LineBasicMaterial({color:ACCENT,transparent:true,opacity:.45})));
    g.add(spokes[spokes.length-1]);
  }
  var notch=new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-r*.86,0),new THREE.Vector3(0,-r,0)]),
    new THREE.LineBasicMaterial({color:0xeae3d2,transparent:true,opacity:.9}));
  g.add(notch);
  g.position.x=x;g.userData={speed:speed,dir:dir};
  group.add(g);return g;
}
var rA=rotor(-2.3,1.15,.010,1,.8),rB=rotor(0,1.15,.016,-1,.65),rC=rotor(2.3,1.15,.023,1,.5);
group.rotation.x=.30;group.rotation.y=.18;
var t=0;
(function frame(){
  t++;
  if(!REDUCE){
    rA.rotation.z=t*rA.userData.speed*rA.userData.dir;
    rB.rotation.z=t*rB.userData.speed*rB.userData.dir;
    rC.rotation.z=t*rC.userData.speed*rC.userData.dir;
  }
  group.rotation.y=.15+mx*.6;group.rotation.x=.30+my*.4;
  renderer.render(scene,camera);requestAnimationFrame(frame);
})();
"""


def _orbit_scene():
    """Margaret - lunar trajectory."""
    return _base_three_js() + """
var earth=new THREE.Mesh(new THREE.SphereGeometry(.95,20,20),
  new THREE.MeshBasicMaterial({color:ACCENT,wireframe:true,transparent:true,opacity:.55}));
group.add(earth);
var orbitPts=[];
for(var i=0;i<=160;i++){var a=i/160*Math.PI*2;
  orbitPts.push(new THREE.Vector3(Math.cos(a)*3.1,Math.sin(a)*3.1*.92,Math.sin(a)*.8));}
var orbit=lineLoop(orbitPts,.4);orbit.rotation.x=.5;group.add(orbit);
var moonPivot=new THREE.Group();moonPivot.rotation.x=.5;
var moon=new THREE.Mesh(new THREE.SphereGeometry(.3,12,12),
  new THREE.MeshBasicMaterial({color:0xeae3d2,wireframe:true,transparent:true,opacity:.8}));
moon.position.set(3.1,0,0);moonPivot.add(moon);group.add(moonPivot);
// trajectory dots behind moon
var trailPts=[];
for(var j=0;j<=40;j++){var a=j/40*Math.PI*2;
  trailPts.push(new THREE.Vector3(Math.cos(a)*3.1,Math.sin(a)*3.1*.92,Math.sin(a)*.8));}
var trailGeo=new THREE.BufferGeometry().setFromPoints(trailPts.slice(0,1));
var stars=new THREE.Points((function(){
  var g=new THREE.BufferGeometry(),N=140,p=new Float32Array(N*3);
  for(var i=0;i<N;i++){p[i*3]=(Math.random()-.5)*16;p[i*3+1]=(Math.random()-.5)*9;p[i*3+2]=(Math.random()-.5)*8;}
  g.setAttribute('position',new THREE.BufferAttribute(p,3));return g;})(),
  new THREE.PointsMaterial({color:0xeae3d2,size:.03,transparent:true,opacity:.35}));
scene.add(stars);
var t=0;
(function frame(){
  if(!REDUCE){t+=.006;moonPivot.rotation.z=t;earth.rotation.y=t*.4;}
  group.rotation.y=mx*.7;group.rotation.x=my*.5;
  orbit.rotation.x=.5;moonPivot.rotation.x=.5;
  renderer.render(scene,camera);requestAnimationFrame(frame);
})();
"""


def _pipeline_scene():
    """Dennis - minimal unix pipeline."""
    return _base_three_js() + """
var nodes=[new THREE.Vector3(-3.2,-.6,0),new THREE.Vector3(-1.1,.8,0),
           new THREE.Vector3(1.1,-.8,0),new THREE.Vector3(3.2,.6,0)];
var path=new THREE.CatmullRomCurve3(nodes);
group.add(new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(path.getPoints(120)),
  new THREE.LineBasicMaterial({color:ACCENT,transparent:true,opacity:.4})));
nodes.forEach(function(p,i){
  var box=new THREE.Mesh(new THREE.BoxGeometry(.34,.34,.34),
    new THREE.MeshBasicMaterial({color:ACCENT,wireframe:true,transparent:true,opacity:.85}));
  box.position.copy(p);box.userData.spin=i%2?1:-1;group.add(box);
});
var pulse=new THREE.Mesh(new THREE.SphereGeometry(.09,10,10),
  new THREE.MeshBasicMaterial({color:0xeae3d2}));
group.add(pulse);
var t=0;
(function frame(){
  if(!REDUCE){
    t+=.0016;pulse.position.copy(path.getPointAt(t%1));
    group.children.forEach(function(c){if(c.geometry&&c.geometry.type=='BoxGeometry')c.rotation.y=t*40*c.userData.spin;});
  } else {pulse.position.copy(path.getPointAt(.37));}
  group.rotation.y=mx*.8;group.rotation.x=my*.6;
  renderer.render(scene,camera);requestAnimationFrame(frame);
})();
"""


def _nested_scene():
    """Barbara - substitution via nested wireframes."""
    return _base_three_js() + """
function cubeWire(s,op){
  return new THREE.Mesh(new THREE.BoxGeometry(s,s,s),
    new THREE.MeshBasicMaterial({color:ACCENT,wireframe:true,transparent:true,opacity:op}));
}
function tetraWire(s,op){
  var g=new THREE.OctahedronGeometry(s,0);
  return new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:ACCENT,wireframe:true,transparent:true,opacity:op}));
}
var outer=cubeWire(3.4,.28),mid=tetraWire(2.0,.5),inner=cubeWire(1.0,.85);
group.add(outer);group.add(mid);group.add(inner);
var t=0;
(function frame(){
  if(!REDUCE){
    t+=.004;
    outer.rotation.y=t;outer.rotation.x=t*.3;
    mid.rotation.y=-t*1.4;mid.rotation.z=t*.5;
    inner.rotation.y=t*2;inner.rotation.x=-t*.8;
  }
  group.rotation.y=.4+mx*.7;group.rotation.x=my*.5;
  renderer.render(scene,camera);requestAnimationFrame(frame);
})();
"""


def _knot_scene():
    """Guido - trefoil knot, Python logo homage."""
    return _base_three_js() + """
function trefoil(t){
  var p=2,q=3;
  var r=Math.cos(q*t)+2;
  return new THREE.Vector3(r*Math.cos(p*t),r*Math.sin(p*t),-Math.sin(q*t));
}
var pts=[];for(var i=0;i<=400;i++){pts.push(trefoil(i/400*Math.PI*2));}
var curve=new THREE.CatmullRomCurve3(pts);
var tube=new THREE.Mesh(new THREE.TubeGeometry(curve,220,.16,10,true),
  new THREE.MeshBasicMaterial({color:ACCENT,wireframe:true,transparent:true,opacity:.6}));
tube.scale.setScalar(.52);
group.add(tube);
var halo=ringLine(2.9,128,.18,0xeae3d2);
halo.rotation.x=Math.PI/2.4;group.add(halo);
var t=0;
(function frame(){
  if(!REDUCE){t+=.004;tube.rotation.z=t;tube.rotation.x=Math.sin(t*.7)*.3;}
  group.rotation.y=.3+mx*.7;group.rotation.x=my*.5;
  renderer.render(scene,camera);requestAnimationFrame(frame);
})();
"""


def _donut_html(exhibit_no, era_label, era_year, title_line, sub, quote):
    """Linus - the spinning ASCII donut (no WebGL needed, pure math like donut.c)."""
    return _SHELL.format(
        exhibit_no=exhibit_no, era_label=era_label, era_year=era_year,
        title_line=title_line, sub=sub, quote=quote, accent="#e0a458",
        canvas=_ASCII_CANVAS % "#e0a458",
        script="""
var pre=document.getElementById('ascii');
if(REDUCE){pre.style.opacity=.5;}
function frame(){
  var A=REDUCE?0.9:Date.now()*0.0008,B=REDUCE?0.4:Date.now()*0.00048;
  var b=[],z=[],W=104,H=42;
  for(var i=0;i<W*H;i++){b[i]=' ';z[i]=0;}
  for(var j=0;j<6.28;j+=0.07){
    for(var i=0;i<6.28;i+=0.02){
      var c=Math.sin(i),d=Math.cos(j),e=Math.sin(A),f=Math.sin(j),g=Math.cos(A),
          h=d+2,D=1/(c*h*e+f*g+5),l=Math.cos(i),m=Math.cos(B),n=Math.sin(B),
          t=c*h*g-f*e;
      var x=Math.floor(W/2+(W*.42)*(D*(l*h*m-t*n))),
          y=Math.floor(H/2+(H*.9)*(D*(l*h*n+t*m))),
          o=x+W*y,
          N=Math.floor(8*((f*e-c*d*g)*m-c*d*e-f*g-l*d*n));
      if(y>=0&&y<H&&x>=0&&x<W&&D>z[o]){z[o]=D;b[o]=".,-~:;=!*#$@"[N>0?N:0];}
    }
  }
  var out='';for(var k=0;k<H;k++){out+=b.slice(k*W,(k+1)*W).join('')+'\\n';}
  pre.textContent=out;
  requestAnimationFrame(frame);
}
frame();
""",
    )


def get_hero_scene(mentor_name: str) -> str:
    """Return complete hero HTML for a mentor's page."""
    from themes import get_mentor_theme
    th = get_mentor_theme(mentor_name)
    common = dict(
        exhibit_no=th["exhibit_no"], era_label=th["era_label"], era_year=th["era_year"],
        sub=f"Your code will be reviewed in the voice of {mentor_name}. "
            f"Scroll down and paste your Python below.",
        quote=th["tagline"],
    )
    titles = {
        "Ada Lovelace": ("Code as <em>poetry</em>", "gears"),
        "Linus Torvalds": ("<em>Show me</em> the code", "donut"),
        "Grace Hopper": ("Debug it, <em>step by step</em>", "compass"),
        "Alan Turing": ("Can machines <em>think?</em>", "rotors"),
        "Margaret Hamilton": ("Software for <em>mission-critical</em> moments", "orbit"),
        "Dennis Ritchie": ("Simplicity is <em>the point</em>", "pipeline"),
        "Barbara Liskov": ("Abstraction is <em>discipline</em>", "nested"),
        "Guido van Rossum": ("Beautiful, <em>Pythonic</em> code", "knot"),
    }
    title_line, _ = titles.get(mentor_name, ("The Archive", "gears"))

    if th["scene"] == "donut":
        return _donut_html(common["exhibit_no"], common["era_label"],
                           common["era_year"], title_line, common["sub"], common["quote"])

    scripts = {
        "gears": _gears_scene,
        "compass": _compass_scene,
        "rotors": _rotors_scene,
        "orbit": _orbit_scene,
        "pipeline": _pipeline_scene,
        "nested": _nested_scene,
        "knot": _knot_scene,
    }
    script_fn = scripts.get(th["scene"], _gears_scene)
    return _three_shell(title_line=title_line, accent=th["accent"], script=script_fn(), **common)
