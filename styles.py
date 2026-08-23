#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ChronoCoder Design System - "The Archive".

Art direction based on museum/archive design practice:
- Warm near-black canvas (lamplit reading room), cream vellum ink
- One brass accent, used sparingly: it marks what matters
- Serif display (Fraunces) / quiet sans body (Inter) / mono metadata (JetBrains Mono)
- Hairline rules, exhibit plaques, subdued motion. No glow, no sparkle.

Created by: Anubhav
Project: ChronoCoder - AI Mentor Chatbot
"""

# Shared design tokens + global chrome
_BASE_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
    --ink-canvas: #151310;
    --ink-raised: #1d1a16;
    --ink-input: #12100d;
    --vellum: #eae3d2;
    --vellum-dim: #a89f8d;
    --vellum-faint: #6f6759;
    --brass: #c9a227;
    --brass-bright: #dfb84a;
    --hairline: rgba(234, 227, 210, 0.12);
    --hairline-strong: rgba(201, 162, 39, 0.45);
}

/* ===== GLOBAL CHROME ===== */
.stApp {
    background:
        radial-gradient(1400px 800px at 50% -20%, rgba(201, 162, 39, 0.05), transparent 60%),
        var(--ink-canvas);
    color: var(--vellum);
    font-family: 'Inter', sans-serif;
}

/* Paper grain - archival texture, not stars */
.stApp::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.35;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.92 0 0 0 0 0.89 0 0 0 0 0.82 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
}

h1, h2, h3, h4, h5, h6 {
    font-family: 'Fraunces', serif !important;
    font-weight: 500 !important;
    color: var(--vellum) !important;
    letter-spacing: 0.01em;
}

.stMarkdown, p, li { color: var(--vellum) !important; }

hr {
    border: none !important;
    height: 1px !important;
    background: var(--hairline) !important;
    margin: 2.2rem 0 !important;
}

/* Mono eyebrow utility */
.cc-kicker {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--vellum-faint);
}

/* ===== BUTTONS - ghost at rest, brass on intent ===== */
.stButton > button {
    background: transparent !important;
    color: var(--vellum) !important;
    border: 1px solid var(--hairline) !important;
    border-radius: 8px;
    padding: 0.6rem 1.4rem;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 0.95rem;
    transition: all 0.25s ease;
}

.stButton > button:hover {
    background: var(--brass) !important;
    border-color: var(--brass) !important;
    color: #171410 !important;
}

button[kind="primary"] {
    background: var(--brass) !important;
    border-color: var(--brass) !important;
    color: #171410 !important;
    font-weight: 600;
}

button[kind="primary"]:hover {
    background: var(--brass-bright) !important;
    border-color: var(--brass-bright) !important;
}

/* ===== INPUTS ===== */
.stTextInput > div > div > input,
.stTextArea > div > div > textarea,
.stSelectbox > div > div {
    background: var(--ink-input) !important;
    border: 1px solid var(--hairline) !important;
    border-radius: 8px;
    color: var(--vellum) !important;
    transition: border-color 0.2s ease;
}

.stTextInput > div > div > input:focus,
.stTextArea > div > div > textarea:focus {
    border-color: var(--hairline-strong) !important;
    box-shadow: none !important;
}

.stTextArea textarea::placeholder,
.stTextInput input::placeholder { color: var(--vellum-faint) !important; }

.stTextArea textarea {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.88rem !important;
    line-height: 1.65 !important;
}

.stCodeBlock, pre {
    background: var(--ink-input) !important;
    border: 1px solid var(--hairline);
    border-radius: 8px !important;
}

code { font-family: 'JetBrains Mono', monospace !important; }

/* ===== ALERTS - transcript style ===== */
.stAlert {
    background: var(--ink-raised) !important;
    border: 1px solid var(--hairline) !important;
    border-radius: 8px !important;
    color: var(--vellum) !important;
}

div[data-testid="stSuccess"] { border-left: 2px solid #8ba07a !important; }
div[data-testid="stInfo"] { border-left: 2px solid var(--brass) !important; }
div[data-testid="stWarning"] { border-left: 2px solid #c2a36b !important; }
div[data-testid="stError"] { border-left: 2px solid #b57a72 !important; }

/* ===== EXPANDERS - structural divider, no box ===== */
details[data-testid="stExpander"] {
    background: transparent !important;
    border: none !important;
    border-top: 1px solid var(--hairline) !important;
    border-radius: 0 !important;
}

details[data-testid="stExpander"] summary {
    font-family: 'Inter', sans-serif !important;
    font-weight: 500 !important;
    color: var(--vellum) !important;
    padding-left: 0 !important;
}

/* ===== SIDEBAR ===== */
section[data-testid="stSidebar"] > div {
    background: var(--ink-canvas) !important;
    border-right: 1px solid var(--hairline) !important;
}

section[data-testid="stSidebar"] * { color: var(--vellum) !important; }
section[data-testid="stSidebar"] hr { opacity: 0.6; }

/* ===== ACCESSIBILITY ===== */
.stButton > button:focus-visible,
.stTextInput > div > div > input:focus-visible,
.stTextArea > div > div > textarea:focus-visible {
    outline: 2px solid var(--brass) !important;
    outline-offset: 2px !important;
}
"""

# Page-specific: mentor selection - "The Gallery"
_SELECTION_CSS = """
<style>
/* Exhibit card: a plaque, not a neon tile */
.cc-exhibit {
    --accent: var(--brass);
    position: relative;
    background: var(--ink-raised);
    border: 1px solid var(--hairline);
    border-top: 2px solid color-mix(in srgb, var(--accent) 60%, transparent);
    border-radius: 8px;
    padding: 1.6rem 1.5rem 1.3rem;
    margin: 0.9rem 0 1.1rem;
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                border-color 0.35s ease, box-shadow 0.35s ease,
                background-color 0.35s ease;
    min-height: 250px;
    transform-style: preserve-3d;
    perspective: 800px;
}

.cc-exhibit:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
    background: #211d18;
}

.cc-exhibit-no {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.68rem;
    letter-spacing: 0.26em;
    color: var(--vellum-faint);
    margin-bottom: 1rem;
}

.cc-exhibit:hover .cc-exhibit-no { color: var(--accent); }

.cc-exhibit-icon {
    font-size: 1.7rem;
    float: right;
    margin-top: -2.4rem;
    filter: grayscale(30%);
    transition: filter 0.35s ease, transform 0.35s ease;
}

.cc-exhibit:hover .cc-exhibit-icon {
    filter: grayscale(0%);
    transform: scale(1.06);
}

.cc-exhibit-name {
    font-family: 'Fraunces', serif;
    font-size: 1.55rem;
    font-weight: 550;
    color: var(--vellum);
    line-height: 1.15;
    margin-bottom: 0.3rem;
}

.cc-exhibit-title {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-weight: 450;
    font-size: 1.02rem;
    color: var(--accent);
    margin-bottom: 0.8rem;
}

.cc-exhibit-desc {
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--vellum-dim);
    margin-bottom: 1rem;
}

.cc-exhibit-tags {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--vellum-faint);
    line-height: 1.9;
}

.cc-exhibit-tags b { color: var(--vellum-dim); font-weight: 500; }

/* Placard footer note under the grid */
.cc-placard {
    border-top: 2px solid var(--hairline-strong);
    padding-top: 1.4rem;
    margin-top: 2.4rem;
    max-width: 640px;
}

.cc-placard h3 {
    font-size: 1.45rem;
    margin-bottom: 0.6rem;
}

.cc-placard p {
    color: var(--vellum-dim);
    font-size: 0.95rem;
    line-height: 1.65;
}

.cc-placard .cc-fineprint {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--vellum-faint);
    margin-top: 1.1rem;
}
"""

# Page-specific: workspace - "The Reading Room"
_APP_CSS = """
<style>
.main .block-container {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    backdrop-filter: none;
    margin: 1.5rem auto !important;
    padding: 2.5rem 2rem !important;
    max-width: 1280px !important;
}

.cc-header-rule {
    width: 56px;
    height: 2px;
    background: var(--brass);
    margin: 0.4rem 0 0.9rem;
}

.cc-main-header {
    font-family: 'Fraunces', serif;
    font-size: 2.3rem;
    font-weight: 550;
    color: var(--vellum) !important;
    line-height: 1.1;
}

.cc-tagline {
    font-family: 'Fraunces', serif;
    font-style: italic;
    color: var(--vellum-dim) !important;
    font-size: 1.02rem;
}

.cc-credits {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--vellum-faint) !important;
}

.cc-credits b { color: var(--brass); font-weight: 500; }

.cc-footer {
    text-align: center;
    color: var(--vellum-faint);
}

@media (max-width: 768px) {
    .main .block-container { padding: 1.4rem 1rem !important; }
}
"""


def get_base_css() -> str:
    return _BASE_CSS


def get_selection_css() -> str:
    return _BASE_CSS + _SELECTION_CSS


def get_app_css() -> str:
    return _BASE_CSS + _APP_CSS


def get_mentor_workspace_css(accent: str, accent_soft: str) -> str:
    """Re-tint the workspace chrome with the selected mentor's era pigment."""
    return f"""
<style>
:root {{
    --mentor-accent: {accent};
    --mentor-soft: {accent_soft};
}}
.stButton > button:hover {{
    background: var(--mentor-accent) !important;
    border-color: var(--mentor-accent) !important;
}}
button[kind="primary"] {{
    background: var(--mentor-accent) !important;
    border-color: var(--mentor-accent) !important;
}}
button[kind="primary"]:hover {{ filter: brightness(1.12); }}
.stApp {{
    background:
        radial-gradient(1200px 600px at 50% -12%, var(--mentor-soft), transparent 60%),
        var(--ink-canvas);
}}
div[data-testid="stInfo"] {{ border-left-color: var(--mentor-accent) !important; }}
details[data-testid="stExpender"], details[data-testid="stExpander"] summary:hover {{
    color: var(--mentor-accent) !important;
}}
.cc-plaque {{
    display: flex; align-items: baseline; gap: .9rem;
    border-top: 2px solid var(--mentor-accent);
    padding-top: .8rem;
}}
.cc-plaque .no {{
    font-family: 'JetBrains Mono', monospace;
    font-size: .7rem; letter-spacing: .24em;
    color: var(--vellum-faint);
    white-space: nowrap;
}}
.cc-plaque .name {{
    font-family: 'Fraunces', serif;
    font-size: 1.5rem; font-weight: 550; color: var(--vellum);
}}
.cc-plaque .era {{
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: .95rem; color: var(--mentor-accent);
}}
.cc-greeting {{
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: 1.05rem; line-height: 1.6;
    color: var(--vellum);
    background: var(--ink-raised);
    border: 1px solid var(--hairline);
    border-left: 2px solid var(--mentor-accent);
    border-radius: 8px;
    padding: 1rem 1.3rem;
}}
</style>
"""


def hero_scene_html() -> str:
    """Full-bleed hero with Three.js armillary sphere behind Fraunces headline."""
    return """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap');
html, body { margin:0; padding:0; background:transparent; overflow:hidden; }
.cc-hero {
    position:relative; height:100%; min-height:360px;
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    text-align:center; padding:2rem 1rem;
}
#stage { position:absolute; inset:0; z-index:0; opacity:0.9; }
.cc-hero-inner { position:relative; z-index:1; }
.cc-kicker {
    font-family:'JetBrains Mono',monospace;
    font-size:0.68rem; letter-spacing:0.34em; text-transform:uppercase;
    color:#6f6759; margin-bottom:1.1rem;
}
.cc-title {
    font-family:'Fraunces',serif;
    font-size:clamp(2.4rem,6vw,3.9rem);
    font-weight:520; line-height:1.05;
    color:#eae3d2; margin:0 0 1rem;
}
.cc-title em { font-style:italic; color:#c9a227; font-weight:480; }
.cc-sub {
    font-family:'Inter',sans-serif;
    font-size:clamp(0.92rem,1.6vw,1.08rem);
    color:#a89f8d; max-width:34em; margin:0 auto 1.3rem; line-height:1.6;
}
.cc-badge {
    display:inline-block;
    font-family:'JetBrains Mono',monospace;
    font-size:0.68rem; letter-spacing:0.22em; text-transform:uppercase;
    color:#a89f8d;
    border:1px solid rgba(201,162,39,0.35);
    border-radius:999px;
    padding:0.5rem 1.3rem;
}
</style>
</head>
<body>
<div class="cc-hero">
  <canvas id="stage"></canvas>
  <div class="cc-hero-inner">
    <p class="cc-kicker">The ChronoCoder Archive &middot; Est. by Anubhav</p>
    <h1 class="cc-title">Learn from the <em>legends</em><br>of computing</h1>
    <p class="cc-sub">Eight mentors across three centuries of computing history review your Python code &mdash; each in their own voice.</p>
    <span class="cc-badge">&#9742;&nbsp; Select an exhibit below</span>
  </div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('stage');
  var renderer = new THREE.WebGLRenderer({canvas:canvas, alpha:true, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 2, 0.1, 100);
  camera.position.set(0, 0, 7);

  var group = new THREE.Group();
  scene.add(group);

  // Armillary rings - brass lines
  function ring(r, rotX, rotZ, opacity){
    var pts = [];
    for(var i=0;i<=128;i++){
      var a = i/128*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(a)*r, Math.sin(a)*r, 0));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mat = new THREE.LineBasicMaterial({color:0xc9a227, transparent:true, opacity:opacity});
    var line = new THREE.Line(geo, mat);
    line.rotation.x = rotX; line.rotation.z = rotZ;
    group.add(line);
  }
  ring(2.6, Math.PI/2.6, 0.2, 0.55);
  ring(2.2, Math.PI/1.7, -0.5, 0.40);
  ring(1.8, Math.PI/3.4, 0.9, 0.30);
  ring(1.4, Math.PI/2.2, -1.2, 0.25);

  // Meridian bar
  var mGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.6,0,0), new THREE.Vector3(2.6,0,0)
  ]);
  group.add(new THREE.Line(mGeo, new THREE.LineBasicMaterial({color:0xdfb84a, transparent:true, opacity:0.35})));

  // Dust particles
  var pGeo = new THREE.BufferGeometry();
  var N=160, pos=new Float32Array(N*3);
  for(var i=0;i<N;i++){
    pos[i*3]=(Math.random()-0.5)*14;
    pos[i*3+1]=(Math.random()-0.5)*8;
    pos[i*3+2]=(Math.random()-0.5)*6-1;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  var points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color:0xeae3d2, size:0.02, transparent:true, opacity:0.4
  }));
  scene.add(points);

  var mx=0,my=0;
  window.addEventListener('pointermove',function(e){
    mx=(e.clientX/window.innerWidth-0.5)*0.4;
    my=(e.clientY/window.innerHeight-0.5)*0.25;
  });

  function resize(){
    var w=canvas.clientWidth||window.innerWidth, h=canvas.clientHeight||window.innerHeight;
    renderer.setSize(w,h,false);
    camera.aspect=w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize',resize); resize();

  var t=0;
  function frame(){
    t+=0.0016;
    if(!reduce){
      group.rotation.y=t+mx;
      group.rotation.x=my*0.6;
      points.rotation.y=-t*0.4;
    } else {
      group.rotation.y=0.6; group.rotation.x=0.15;
    }
    renderer.render(scene,camera);
    requestAnimationFrame(frame);
  }
  frame();
})();
</script>
</body>
</html>
"""
