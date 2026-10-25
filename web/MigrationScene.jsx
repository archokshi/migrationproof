import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default function MigrationScene({ stage, playing, fault, repaired, selected, onSelect, view = 'overview', agentActive = false, haltFlow = false, recorded = false }) {
  const hostRef = useRef(null);
  const data = useRef({});
  const [fallback, setFallback] = useState(false);
  data.current = { stage, playing, fault, repaired, selected, onSelect, view, agentActive, haltFlow };

  useEffect(() => {
    const host = hostRef.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setFallback(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    renderer.setClearColor(0x08131c, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08131c, 0.018);
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
    camera.position.set(0, 9.2, 17.8);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.7, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 4; controls.maxDistance = 25;
    controls.minAzimuthAngle = -0.28; controls.maxAzimuthAngle = 0.28;
    controls.minPolarAngle = 0.85; controls.maxPolarAngle = 1.28;
    controls.update();
    scene.add(new THREE.AmbientLight(0xaecad6, 2.1));
    const key = new THREE.DirectionalLight(0xe8f4ff, 3.5);
    key.position.set(-3, 8, 5); scene.add(key);
    const blue = new THREE.PointLight(0x6c9cff, 30, 16);
    blue.position.set(5, 4, 3); scene.add(blue);
    const green = new THREE.PointLight(0x9de36b, 24, 13);
    green.position.set(-5, 3, 2); scene.add(green);
    const materials = [];
    const textures = [];
    const clickable = [];
    const makeMaterial = (color, emissive = 0x000000, intensity = 0) => {
      const material = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.34, emissive, emissiveIntensity: intensity });
      materials.push(material); return material;
    };
    const dark = makeMaterial(0x14232d);
    const slate = makeMaterial(0x314756);
    const board = makeMaterial(0x1e3c38);
    const gpuGlow = makeMaterial(0xb4f375, 0x82d94b, 0.8);
    const tpuGlow = makeMaterial(0x87baff, 0x4a87f5, 0.65);
    const silver = makeMaterial(0x9aaeb9);
    const copper = makeMaterial(0xa67d50);
    const bridgeGlow = makeMaterial(0xb5f0dd, 0x70d9bc, 0.55);
    const fans = [];
    function box(parent, size, position, material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position); parent.add(mesh); return mesh;
    }
    function label(text, color, size = [2.65, 0.48]) {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 112;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(9,23,32,0.94)';
      ctx.beginPath(); ctx.roundRect(4, 4, 632, 104, 17); ctx.fill();
      ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.font = '600 31px monospace'; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 320, 57);
      const texture = new THREE.CanvasTexture(canvas); textures.push(texture);
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
      materials.push(material);
      const sprite = new THREE.Sprite(material); sprite.scale.set(size[0], size[1], 1); return sprite;
    }
    function wire(parent, points, color, opacity = 0.7) {
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      materials.push(material);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))), material);
      parent.add(line); return line;
    }
    function station(id, x) {
      const group = new THREE.Group(); group.position.x = x; scene.add(group);
      box(group, [4.05, 0.18, 3.05], [0, -0.32, 0], dark);
      box(group, [3.82, 0.035, 2.82], [0, -0.21, 0], slate);
      const outline = wire(group, [[-2,-.2,-1.5],[2,-.2,-1.5],[2,-.2,1.5],[-2,-.2,1.5],[-2,-.2,-1.5]], id === 'gpu' ? 0x9cda65 : 0x6e9fee);
      return { group, outline, id };
    }
    function enclosure(parent, height, glow) {
      box(parent,[3.85,height,.09],[0,height/2-.15,-1.35],dark);
      for(const x of [-1.9,1.9]) {
        box(parent,[.12,height,2.75],[x,height/2-.15,0],slate);
        box(parent,[.19,.12,3],[x,height-.1,0],silver);
        for(const z of [-1.35,1.35]) {
          const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.04,10),silver);
          bolt.position.set(x,height-.02,z);parent.add(bolt);
        }
      }
      box(parent,[3.75,.45,.14],[0,.02,1.43],dark);
      for(const x of [-1.3,-.48,.34]) {
        const rim=new THREE.Mesh(new THREE.TorusGeometry(.27,.027,8,32),silver);
        rim.position.set(x,.02,1.52);parent.add(rim);
        const fan=new THREE.Group();fan.position.copy(rim.position);
        const hub=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.06,16),slate);
        hub.rotation.x=Math.PI/2;fan.add(hub);
        for(let i=0;i<7;i++){
          const blade=new THREE.Mesh(new THREE.BoxGeometry(.08,.19,.025),slate);
          const a=i*Math.PI*2/7;blade.position.set(Math.sin(a)*.14,Math.cos(a)*.14,0);blade.rotation.z=-a+.35;fan.add(blade);
        }
        parent.add(fan);fans.push(fan);
      }
      for(let i=0;i<3;i++)box(parent,[.22,.1,.025],[1.12,.13-i*.13,1.52],i===0?glow:copper);
      for(const x of [-1.76,1.76])box(parent,[.12,.36,.2],[x,.03,1.6],silver);
    }
    const gpu = station('gpu', -5.1);
    enclosure(gpu.group,1.95,gpuGlow);
    for (let layer = 0; layer < 3; layer++) {
      const y = 0.15 + layer * 0.6;
      box(gpu.group, [3.05, .16, 1.95], [0, y, 0], board);
      box(gpu.group, [1.25, .19, 1.2], [-.25, y + .17, 0], dark);
      for (let fin = 0; fin < 9; fin++) box(gpu.group, [.075, .22, 1.12], [-.76 + fin * .13, y + .35, 0], silver);
      for (let chip = 0; chip < 3; chip++) box(gpu.group, [.32, .13, .38], [1.08, y + .12, -.6 + chip * .6], dark);
      for (let pin = 0; pin < 12; pin++) box(gpu.group, [.12, .06, .16], [-1.2 + pin * .21, y, 1.01], gpuGlow);
      box(gpu.group, [2.6, .045, .04], [0, y + .12, -.91], gpuGlow);
    }
    const gpuLabel = label('NVIDIA  /  CUDA', '#b5ec7b'); gpuLabel.position.set(0, 2.45, 0); gpu.group.add(gpuLabel);
    const gpuSub = label('EMBEDDING WORKER', '#91aa9b', [2.55,.35]); gpuSub.position.set(0,-.85,1.65);gpu.group.add(gpuSub);
    const tpu = station('tpu', 5.1);
    enclosure(tpu.group,1.02,tpuGlow);
    box(tpu.group, [3.45, .2, 2.5], [0,.12,0], makeMaterial(0x1b3454));
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      const x = -.83 + col * 1.66; const z = -.64 + row * 1.28;
      box(tpu.group, [1.12,.22,.92],[x,.38,z], silver);
      box(tpu.group, [.84,.15,.66],[x,.56,z], tpuGlow);
      box(tpu.group, [.55,.025,.4],[x,.65,z], makeMaterial(0x142d4a));
      for(let p=0;p<6;p++) {
        box(tpu.group,[.08,.05,.13],[x-.43+p*.17,.35,z+.52],tpuGlow);
        box(tpu.group,[.08,.05,.13],[x-.43+p*.17,.35,z-.52],tpuGlow);
      }
    }
    wire(tpu.group,[[-.83,.3,-.64],[.83,.3,-.64],[.83,.3,.64],[-.83,.3,.64],[-.83,.3,-.64]],0x84b1ff,1);
    for(const z of [-1.02,1.02]){
      const coolant=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.6,.78,z),new THREE.Vector3(-.8,.81,z),new THREE.Vector3(.8,.81,z),new THREE.Vector3(1.6,.6,z)]);
      tpu.group.add(new THREE.Mesh(new THREE.TubeGeometry(coolant,24,.045,8,false),silver));
    }
    const tpuLabel=label('GOOGLE  /  TPU', '#9abfff');tpuLabel.position.set(0,2.45,0);tpu.group.add(tpuLabel);
    const tpuSub=label('TORCHTPU CANDIDATE','#8ea6c0',[2.6,.35]);tpuSub.position.set(0,-.85,1.65);tpu.group.add(tpuSub);
    const bridge = new THREE.Group();scene.add(bridge);
    const ringMaterial=makeMaterial(0x9ce7cf,0x4eb493,.7);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.95,.055,12,72),ringMaterial);
    ring.position.set(0,1,0);bridge.add(ring);
    const ring2=new THREE.Mesh(new THREE.TorusGeometry(1.17,.014,8,72),bridgeGlow);
    ring2.position.copy(ring.position);bridge.add(ring2);
    const core=new THREE.Mesh(new THREE.OctahedronGeometry(.43,0),bridgeGlow);
    core.position.copy(ring.position);bridge.add(core);
    const agentOrbit=new THREE.Group();agentOrbit.position.copy(ring.position);bridge.add(agentOrbit);
    const agentNodes=[];
    for(let i=0;i<3;i++){
      const node=new THREE.Mesh(new THREE.IcosahedronGeometry(.13,0),tpuGlow);
      agentOrbit.add(node);agentNodes.push(node);
    }
    const agentBadge=label(recorded?'ARGON AGENT / REPLAY':'ARGON AGENT / LIVE','#a9d1ff',[3,.38]);agentBadge.position.set(0,3.05,0);bridge.add(agentBadge);
    const bridgeLabel=label('MIGRATIONPROOF','#b8f0dc',[2.7,.43]);bridgeLabel.position.set(0,2.55,0);bridge.add(bridgeLabel);
    const bridgeSub=label('INDEPENDENT CHECKS','#88b5ab',[2.75,.32]);bridgeSub.position.set(0,-.65,1.65);bridge.add(bridgeSub);
    const floor=new THREE.GridHelper(30,45,0x294554,0x17313f);floor.position.y=-.46;floor.material.transparent=true;floor.material.opacity=.35;scene.add(floor);
    const network=new THREE.Group();scene.add(network);
    box(network,[2.6,.24,.75],[0,-.12,-3.4],slate);
    for(let i=0;i<8;i++)box(network,[.19,.09,.035],[-.98+i*.28,-.1,-2.99],bridgeGlow);
    const sharedLabel=label('SUPPORTSEARCH / API + INDEX','#8baab6',[3.4,.35]);
    sharedLabel.position.set(0,.65,-3.4);network.add(sharedLabel);
    const serviceCurves=[-1,1].map(side=>new THREE.CubicBezierCurve3(
      new THREE.Vector3(side*1.2,-.08,-3.2),new THREE.Vector3(side*3,-.08,-3.2),
      new THREE.Vector3(side*5.1,-.08,-2.2),new THREE.Vector3(side*5.1,.2,-1.4)));
    serviceCurves.forEach((curve,index)=>scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,24,.035,8,false),index===0?board:slate)));
    const curves=[
      new THREE.CubicBezierCurve3(new THREE.Vector3(-3.4,.9,0),new THREE.Vector3(-2.5,1.35,0),new THREE.Vector3(-1.4,1.35,0),new THREE.Vector3(-.4,1,0)),
      new THREE.CubicBezierCurve3(new THREE.Vector3(.4,1,0),new THREE.Vector3(1.4,1.35,0),new THREE.Vector3(2.5,1.35,0),new THREE.Vector3(3.4,.65,0))
    ];
    for(const curve of curves) {
      const m=new THREE.MeshBasicMaterial({color:0x4e8e9d,transparent:true,opacity:.24});materials.push(m);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,32,.025,8,false),m));
    }
    const particles=[];
    curves.forEach((curve,ci)=>{
      for(let i=0;i<7;i++){
        const mesh=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),ci===0?gpuGlow:tpuGlow);
        scene.add(mesh);particles.push({mesh,curve,offset:i/7,ci});
      }
    });
    serviceCurves.forEach((curve,ci)=>{
      for(let i=0;i<4;i++){
        const mesh=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),ci===0?gpuGlow:tpuGlow);
        scene.add(mesh);particles.push({mesh,curve,offset:i/4,ci,service:true});
      }
    });
    const codeCards=['encoder.py','runtime.json','migration.md'].map((name,i)=>{
      const sprite=label(name,'#d7f6ec',[1.7,.32]);scene.add(sprite);return {sprite,offset:i/3};
    });
    for(const item of [gpu,tpu,{group:bridge,id:'bridge'}]) {
      item.group.traverse(object=>{if(object.isMesh){object.userData.station=item.id;clickable.push(object);}});
    }
    const ray=new THREE.Raycaster();const pointer=new THREE.Vector2();
    let down=null;
    function pointerDown(event){down=[event.clientX,event.clientY];}
    function pointerUp(event){
      if(!down||Math.hypot(event.clientX-down[0],event.clientY-down[1])>6)return;
      const rect=renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      ray.setFromCamera(pointer,camera);
      const hit=ray.intersectObjects(clickable)[0];
      if(hit)data.current.onSelect(hit.object.userData.station);
    }
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    function fittedFov(view){
      const distance=view==='overview'?Math.hypot(8.5,17.8):Math.hypot(3.8,6.2);
      const span=view==='overview'?18.5:7.2;
      const verticalSpan=Math.max(span/camera.aspect,5.5);
      return THREE.MathUtils.radToDeg(2*Math.atan(verticalSpan/(2*distance)));
    }
    function resize(){
      const w=host.clientWidth||1000,h=host.clientHeight||510;
      camera.aspect=w/h;
      camera.fov=fittedFov(data.current.view);
      camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    }
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame=0,last=0,elapsed=0,lastView='overview',transition=0;
    const cameraGoals={
      overview:{position:new THREE.Vector3(0,9.2,17.8),target:new THREE.Vector3(0,.7,0)},
      gpu:{position:new THREE.Vector3(-5.1,4.4,6.2),target:new THREE.Vector3(-5.1,.65,0)},
      tpu:{position:new THREE.Vector3(5.1,4.3,6.2),target:new THREE.Vector3(5.1,.4,0)}
    };
    function animate(now){
      const state=data.current;
      const dt=Math.min((now-last)/1000,.05);last=now;
      if(state.playing&&!reduced)elapsed+=dt;
      if(state.view!==lastView){lastView=state.view;transition=1.4;}
      if(transition>0){
        const goal=cameraGoals[lastView]||cameraGoals.overview;
        camera.position.lerp(goal.position,reduced?1:.12);
        controls.target.lerp(goal.target,reduced?1:.12);
        camera.fov=THREE.MathUtils.lerp(camera.fov,fittedFov(lastView),reduced?1:.12);
        camera.updateProjectionMatrix();
        transition-=dt;
      }
      const blocked=state.haltFlow||(state.stage>=4&&state.fault&&!state.repaired);
      const targetActive=state.stage>=3;
      gpuGlow.emissiveIntensity=state.stage===5?.18:.8;
      tpuGlow.emissiveIntensity=targetActive?.95:.08;
      blue.intensity=targetActive?34:9;
      ringMaterial.color.setHex(blocked?0xff987e:0x9ce7cf);
      ringMaterial.emissive.setHex(blocked?0xc0472c:0x4eb493);
      agentOrbit.visible=state.agentActive;agentBadge.visible=state.agentActive;
      agentNodes.forEach((node,i)=>{const angle=elapsed*1.2+i*Math.PI*2/3;node.position.set(Math.cos(angle)*1.35,Math.sin(angle)*.95,.4);});
      core.rotation.y=elapsed*.7;core.rotation.z=elapsed*.3;
      fans.forEach((fan,index)=>{fan.rotation.z=elapsed*(index<3?9:7);});
      ring2.rotation.z=elapsed*.16;
      gpu.outline.material.opacity=state.selected==='gpu'?1:.45;
      tpu.outline.material.opacity=state.selected==='tpu'?1:.45;
      particles.forEach(({mesh,curve,offset,ci,service})=>{
        mesh.visible=!state.haltFlow&&(ci===0?state.stage<5:state.stage>=(service?3:2));
        mesh.position.copy(curve.getPoint((elapsed*.22+offset)%1));
      });
      codeCards.forEach(({sprite,offset})=>{
        sprite.visible=state.stage===2;
        const t=(elapsed*.1+offset)%1;
        sprite.position.set(state.haltFlow?Math.cos(t*Math.PI*2)*.8:-2.8+t*5.6,state.haltFlow?1.6+Math.sin(t*Math.PI*2)*.45:2.1+Math.sin(t*Math.PI)*.4,.5);
      });
      controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate);
    }
    frame=requestAnimationFrame(animate);
    return()=>{
      cancelAnimationFrame(frame);observer.disconnect();controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
      scene.traverse(object=>{object.geometry?.dispose();});
      materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());
      floor.material.dispose();renderer.dispose();host.removeChild(renderer.domElement);
    };
  },[]);
  return <div ref={hostRef} className="migration-scene" aria-label="3D migration scene: NVIDIA GPU on the left, MigrationProof in the center, Google TPU on the right. Use the component buttons below for accessible details." role="img">{fallback&&<div className="scene-fallback"><strong>NVIDIA GPU → MigrationProof → Google TPU</strong><p>3D rendering is unavailable in this browser. The timeline and comparison below remain interactive.</p></div>}</div>;
}
