import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const positions = [
  [-2.35, 0.7, 0.2], [-1.45, 1.45, -0.3], [-1.15, 0.1, 0.55], [-0.4, -1.05, -0.1],
  [0.15, 1.1, 0.45], [0.55, -0.05, -0.35], [1.1, -1.15, 0.15], [1.45, 0.95, -0.3],
  [2.3, 0.1, 0.2], [-2.05, -0.95, -0.2], [0.9, 1.95, 0.1], [2.05, -1.35, -0.15],
  [-0.3, 1.98, -0.25], [-0.25, 0.0, 0.0], [1.88, 1.7, 0.2]
];

export default function ProofGraph({ cases = [], selectedId, onSelect, status = 'idle' }) {
  const mount = useRef(null);
  const [unavailable, setUnavailable] = useState(false);
  const state = useRef({ cases, selectedId, onSelect, status });
  state.current = { cases, selectedId, onSelect, status };

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.4, 10.8);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      setUnavailable(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const group = new THREE.Group();
    scene.add(group);
    const ambient = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambient);
    const light = new THREE.PointLight(0x8de6d0, 20, 12);
    light.position.set(-2, 2, 4);
    scene.add(light);
    const nodes = [];
    const sphere = new THREE.SphereGeometry(0.115, 20, 20);
    const ring = new THREE.TorusGeometry(0.19, 0.008, 8, 48);
    positions.forEach((point, i) => {
      const material = new THREE.MeshStandardMaterial({ color: 0x60778e, roughness: 0.35, metalness: 0.25, emissive: 0x102335, emissiveIntensity: 0.8 });
      const mesh = new THREE.Mesh(sphere, material);
      mesh.position.set(...point);
      mesh.userData.index = i;
      group.add(mesh);
      const halo = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0x56748b, transparent: true, opacity: 0.34 }));
      halo.position.copy(mesh.position);
      halo.lookAt(camera.position);
      group.add(halo);
      nodes.push({ mesh, halo });
    });
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x446078, transparent: true, opacity: 0.42 });
    const edges = [[0,1],[0,2],[0,9],[1,4],[1,12],[2,3],[2,5],[3,6],[3,9],[4,5],[4,7],[4,10],[5,6],[5,7],[5,13],[6,11],[7,8],[7,10],[8,11],[8,14],[10,14],[12,13]];
    edges.forEach(([a,b]) => {
      const points = [new THREE.Vector3(...positions[a]), new THREE.Vector3(...positions[b])];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
    });
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let hover = -1;
    function resize() {
      const width = host.clientWidth || 600;
      const height = host.clientHeight || 420;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }
    function locate(event) {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(nodes.map(n => n.mesh))[0];
      return hit?.object.userData.index ?? -1;
    }
    function move(event) {
      hover = locate(event);
      renderer.domElement.style.cursor = hover >= 0 ? 'pointer' : 'default';
    }
    function click(event) {
      const index = locate(event);
      const item = state.current.cases[index];
      if (item) state.current.onSelect(item.id);
    }
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('click', click);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    function animate(time) {
      const { cases: currentCases, selectedId: currentSelected, status: currentStatus } = state.current;
      nodes.forEach(({ mesh, halo }, index) => {
        const item = currentCases[index];
        const selected = item && item.id === currentSelected;
        const color = item?.status === 'passed' ? 0x7fe1bd : item?.status === 'mismatch' || item?.status === 'error' ? 0xff8368 : currentStatus === 'running' ? 0xf2b66d : 0x7597af;
        mesh.material.color.setHex(color);
        mesh.material.emissive.setHex(color);
        mesh.material.emissiveIntensity = selected ? 0.56 : 0.22;
        halo.material.color.setHex(color);
        halo.material.opacity = selected ? 0.92 : item ? 0.54 : 0.26;
        mesh.scale.setScalar(selected ? 1.45 : hover === index ? 1.25 : 1);
        halo.scale.setScalar(selected ? 1.45 : 1);
      });
      if (!reduced) {
        group.rotation.y = Math.sin(time * 0.00025) * 0.11;
        group.rotation.x = Math.sin(time * 0.00019) * 0.035;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('click', click);
      host.removeChild(renderer.domElement);
      sphere.dispose(); ring.dispose(); lineMaterial.dispose();
      nodes.forEach(({ mesh, halo }) => { mesh.material.dispose(); halo.material.dispose(); });
      renderer.dispose();
    };
  }, []);

  return <div ref={mount} className="proof-graph" role="img" aria-label="Interactive graph of verification cases. The case list below offers the same selection controls.">{unavailable && <div className="empty-state"><h4>Evidence is ready below.</h4><p>This browser cannot display the 3D graph. Use the case list to inspect every result.</p></div>}</div>;
}
