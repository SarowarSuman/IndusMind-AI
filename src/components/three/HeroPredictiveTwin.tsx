import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type HeroControlMode =
  | "all-control"
  | "prevent-damage"
  | "zero-delay"
  | "zero-accident";

interface HeroNodeInfo {
  id: string;
  label: string;
  category: string;
  status: string;
  metric: string;
  detail: string;
}

const HERO_NODES: Record<string, HeroNodeInfo> = {
  hub: {
    id: "HUB-01",
    label: "IndusMindAI Central Hub",
    category: "AI Edge Core",
    status: "ALL SYSTEMS PROTECTED",
    metric: "100% Telemetry Coverage",
    detail: "Coordinates predictive maintenance, safety interlocks, and delivery routing across every line.",
  },
  motor: {
    id: "M-03",
    label: "Main Drive Motor-03",
    category: "Predictive Asset",
    status: "PREVENTIVE SHIELD ACTIVE",
    metric: "Health 96% · Temp 58°C",
    detail: "Early bearing-wear detection flags anomalies hours before mechanical damage can occur.",
  },
  route: {
    id: "RTE-02",
    label: "Express Delivery Corridor",
    category: "Logistics & Supply",
    status: "ON-TIME DELIVERY LOCKED",
    metric: "0 Delays · Dual Route Ready",
    detail: "Live weather and supplier tracking reroutes cargo automatically to protect dispatch deadlines.",
  },
  safety: {
    id: "SAF-04",
    label: "Safety & Cooling Towers",
    category: "Hazard Shield",
    status: "ZERO ACCIDENT PERIMETER",
    metric: "Thermal & Pressure Safe",
    detail: "Continuous safety interlocks and perimeter alerts prevent overheating and floor accidents.",
  },
};

interface HeroPredictiveTwinProps {
  mode: HeroControlMode;
  scrollProgress: number;
  onSelectNode?: (node: HeroNodeInfo) => void;
}

export const HeroPredictiveTwin: React.FC<HeroPredictiveTwinProps> = ({
  mode,
  scrollProgress,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<HeroControlMode>(mode);
  const scrollRef = useRef<number>(scrollProgress);
  const userInteractingRef = useRef<boolean>(false);

  const [webglError, setWebglError] = useState(false);
  const [hovered, setHovered] = useState<{
    node: HeroNodeInfo;
    x: number;
    y: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string>("hub");

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    const gl = renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const rdrStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    const isSoftwareGl = /SwiftShader|llvmpipe|Software Rasterizer/i.test(rdrStr);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
    renderer.setSize(container.clientWidth || 1200, container.clientHeight || 720);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1626);
    scene.fog = new THREE.FogExp2(0x0f1626, 0.017);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(
      38,
      (container.clientWidth || 1200) / (container.clientHeight || 720),
      0.5,
      180
    );
    camera.position.set(22, 17, 25);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = false; // preserve page scroll!
    controls.minPolarAngle = 0.42;
    controls.maxPolarAngle = Math.PI / 2 - 0.14;
    controls.target.set(0, 1.5, 0);

    const onControlStart = () => {
      userInteractingRef.current = true;
    };
    controls.addEventListener("start", onControlStart);

    // 3-point atmospheric night-city lighting
    const hemi = new THREE.HemisphereLight(0x8bb8ff, 0x0b101d, 0.7);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffe6bd, 1.55);
    keyLight.position.set(24, 34, 22);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 5;
      keyLight.shadow.camera.far = 90;
      const d = 26;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3fd8ff, 1.3);
    rimLight.position.set(-22, 16, -20);
    scene.add(rimLight);

    // Ground slate-navy plane + subtle grid
    const groundGeo = new THREE.PlaneGeometry(140, 140);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f1626,
      roughness: 0.92,
      metalness: 0.08,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(64, 32, 0x223254, 0x17223a);
    grid.position.y = 0.02;
    scene.add(grid);

    // Clay-graphite night buildings with warm amber lit windows
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.78,
      metalness: 0.16,
    });
    const darkRoofMat = new THREE.MeshStandardMaterial({
      color: 0x131b2b,
      roughness: 0.85,
      metalness: 0.2,
    });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffc66b });
    const limeMat = new THREE.MeshBasicMaterial({ color: 0xc6ff2e });
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x3fd8ff });

    const interactiveGroups: Array<{ key: string; group: THREE.Object3D }> = [];
    const tagInteractive = (obj: THREE.Object3D, key: string) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.heroNodeKey = key;
          child.layers.enable(1);
        }
      });
      interactiveGroups.push({ key, group: obj });
    };

    // Surrounding isometric night-city blocks (warm lit windows)
    const cityBlocks: Array<[number, number, number, number, number]> = [
      [-15, -13, 4.5, 4.8, 3.8],
      [-15, -6, 3.8, 3.2, 3.4],
      [-14, 7, 4.8, 5.4, 4.2],
      [-9, -15, 5.2, 3.8, 3.5],
      [14, -13, 5.0, 6.2, 4.5],
      [15, 9, 4.2, 3.8, 3.8],
      [-7, 13, 5.5, 2.8, 3.6],
      [6, 13, 4.0, 4.6, 3.2],
    ];
    cityBlocks.forEach(([x, z, w, h, d]) => {
      const b = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), clayMat);
      body.position.y = h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      b.add(body);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.22, d * 0.92), darkRoofMat);
      roof.position.y = h + 0.1;
      b.add(roof);

      const rows = Math.max(2, Math.floor(h * 0.85));
      for (let r = 0; r < rows; r++) {
        for (let c = -1; c <= 1; c++) {
          if ((r + c + Math.round(x)) % 3 === 0) continue;
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.35), windowMat);
          win.position.set(c * (w * 0.25), 0.8 + r * 0.85, d / 2 + 0.02);
          b.add(win);
        }
      }
      b.position.set(x, 0, z);
      scene.add(b);
    });

    // 1. CENTRAL PREDICTIVE HUB (HUB-01)
    const hubGroup = new THREE.Group();
    const hubPlinth = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 4.2, 0.5, 8),
      darkRoofMat
    );
    hubPlinth.position.y = 0.25;
    hubPlinth.receiveShadow = true;
    hubGroup.add(hubPlinth);

    const hubCore = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 3.4, 4.4),
      new THREE.MeshStandardMaterial({ color: 0x24344d, roughness: 0.45, metalness: 0.35 })
    );
    hubCore.position.y = 2.1;
    hubCore.castShadow = true;
    hubGroup.add(hubCore);

    const hubGlass = new THREE.Mesh(
      new THREE.BoxGeometry(4.55, 0.45, 4.55),
      cyanMat
    );
    hubGlass.position.y = 3.2;
    hubGroup.add(hubGlass);

    const hubHalo = new THREE.Mesh(
      new THREE.TorusGeometry(4.8, 0.09, 12, 64),
      cyanMat
    );
    hubHalo.rotation.x = Math.PI / 2;
    hubHalo.position.y = 0.55;
    hubGroup.add(hubHalo);

    const hubBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), limeMat);
    hubBeacon.position.y = 5.1;
    hubGroup.add(hubBeacon);

    const hubLight = new THREE.PointLight(0x3fd8ff, 3.5, 16);
    hubLight.position.set(0, 4.5, 0);
    hubGroup.add(hubLight);

    scene.add(hubGroup);
    tagInteractive(hubGroup, "hub");

    // 2. PREDICTIVE DRIVE MOTOR & ROBOTIC LINE (M-03)
    const motorGroup = new THREE.Group();
    const motorBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 2.6), darkRoofMat);
    motorBase.position.y = 0.25;
    motorGroup.add(motorBase);

    const motorBodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.65,
    });
    const motorCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 2.2, 20),
      motorBodyMat
    );
    motorCylinder.rotation.z = Math.PI / 2;
    motorCylinder.position.set(-0.2, 1.3, 0);
    motorCylinder.castShadow = true;
    motorGroup.add(motorCylinder);

    const rotor = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.14, 10, 24),
      cyanMat
    );
    rotor.rotation.y = Math.PI / 2;
    rotor.position.set(1.05, 1.3, 0);
    motorGroup.add(rotor);

    const motorRingMat = new THREE.MeshBasicMaterial({
      color: 0x3fd8ff,
      transparent: true,
      opacity: 0.85,
    });
    const motorShieldRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.08, 10, 48),
      motorRingMat
    );
    motorShieldRing.rotation.x = Math.PI / 2;
    motorShieldRing.position.y = 0.4;
    motorGroup.add(motorShieldRing);

    motorGroup.position.set(-6.8, 0, 3.5);
    scene.add(motorGroup);
    tagInteractive(motorGroup, "motor");

    // 3. THERMAL COOLING TOWERS & SAFETY DOME (SAF-04)
    const safetyGroup = new THREE.Group();
    [-1.4, 1.4].forEach((offset) => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.35, 3.6, 18),
        clayMat
      );
      tower.position.set(offset, 1.8, 0);
      tower.castShadow = true;
      safetyGroup.add(tower);

      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.92, 0.07, 8, 24),
        limeMat
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(offset, 3.45, 0);
      safetyGroup.add(collar);
    });

    // Wind turbine beside cooling towers
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 5.2, 10), clayMat);
    mast.position.set(0, 2.6, -2.5);
    safetyGroup.add(mast);

    const turbineHub = new THREE.Group();
    turbineHub.position.set(0, 5.1, -2.35);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 0.04), cyanMat);
      blade.position.y = 0.9;
      const pivot = new THREE.Group();
      pivot.rotation.z = (i * Math.PI * 2) / 3;
      pivot.add(blade);
      turbineHub.add(pivot);
    }
    safetyGroup.add(turbineHub);

    safetyGroup.position.set(8.2, 0, -2.2);
    scene.add(safetyGroup);
    tagInteractive(safetyGroup, "safety");

    // 4. PROTECTIVE SHIELD DOME (transparent sphere wireframe covering facility)
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x3fd8ff,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    const shieldDome = new THREE.Mesh(new THREE.SphereGeometry(12.2, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    shieldDome.position.y = 0.1;
    scene.add(shieldDome);

    // 5. GLOWING CYAN DELIVERY ROUTES & MOVING PACKETS (RTE-02)
    const routeGroup = new THREE.Group();
    const routesDef = [
      [
        new THREE.Vector3(-18, 0.16, -9),
        new THREE.Vector3(-8, 0.16, -5),
        new THREE.Vector3(0, 0.16, 0),
      ],
      [
        new THREE.Vector3(-6.8, 0.16, 3.5),
        new THREE.Vector3(-3, 0.16, 1.8),
        new THREE.Vector3(0, 0.16, 0),
      ],
      [
        new THREE.Vector3(0, 0.16, 0),
        new THREE.Vector3(5.5, 0.16, 4.5),
        new THREE.Vector3(16, 0.16, 10),
      ],
      [
        new THREE.Vector3(8.2, 0.16, -2.2),
        new THREE.Vector3(4, 0.16, -1),
        new THREE.Vector3(0, 0.16, 0),
      ],
    ];

    const routeCurves: THREE.CatmullRomCurve3[] = [];
    const routeLineMats: THREE.MeshBasicMaterial[] = [];
    const packetMeshes: Array<{ mesh: THREE.Mesh; curveIdx: number; offset: number; speed: number }> = [];

    routesDef.forEach((pts, idx) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      routeCurves.push(curve);
      const rMat = new THREE.MeshBasicMaterial({ color: idx === 2 ? 0xc6ff2e : 0x3fd8ff });
      routeLineMats.push(rMat);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.1, 6, false), rMat);
      routeGroup.add(tube);

      for (let p = 0; p < 3; p++) {
        const pkt = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.3, 0.65),
          idx === 2 ? limeMat : cyanMat
        );
        routeGroup.add(pkt);
        packetMeshes.push({
          mesh: pkt,
          curveIdx: idx,
          offset: p / 3,
          speed: 0.22 + idx * 0.03,
        });
      }
    });

    scene.add(routeGroup);
    tagInteractive(routeGroup, "route");

    // Raycasting on layer 1
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();

    const pickNode = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const h of hits) {
        if (h.object.userData?.heroNodeKey) {
          return String(h.object.userData.heroNodeKey);
        }
      }
      return null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const key = pickNode(e.clientX, e.clientY);
      if (key && HERO_NODES[key]) {
        const rect = renderer.domElement.getBoundingClientRect();
        setHovered({
          node: HERO_NODES[key],
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        renderer.domElement.style.cursor = "pointer";
      } else {
        setHovered(null);
        renderer.domElement.style.cursor = "grab";
      }
    };

    const onClick = (e: MouseEvent) => {
      const key = pickNode(e.clientX, e.clientY);
      if (key && HERO_NODES[key]) {
        setSelectedId(key);
        onSelectNode?.(HERO_NODES[key]);
      }
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1200;
      const h = container.clientHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation loop with SwiftShader pacing
    const clock = new THREE.Clock();
    let raf = 0;
    let disposed = false;

    const animate = () => {
      if (disposed) return;
      const t = clock.getElapsedTime();
      const activeMode = modeRef.current;
      const p = scrollRef.current;

      // Gentle camera glide driven by scroll if user hasn't manually orbited
      if (!userInteractingRef.current) {
        const targetPos = new THREE.Vector3(
          22 - p * 9 + Math.sin(t * 0.25) * 1.2,
          17 - p * 4.5,
          25 - p * 10 + Math.cos(t * 0.25) * 1.2
        );
        camera.position.lerp(targetPos, 0.06);
        controls.target.lerp(new THREE.Vector3(0, 1.5 + p * 0.6, 0), 0.06);
      }
      controls.update();

      // Rotate hub beacon, motor rotor & wind turbine
      hubBeacon.rotation.y = t * 1.1;
      hubBeacon.position.y = 5.0 + Math.sin(t * 2) * 0.18;
      hubHalo.scale.setScalar(1 + Math.sin(t * 2.2) * 0.04);
      rotor.rotation.x = t * (activeMode === "prevent-damage" ? 3.5 : 2.2);
      turbineHub.rotation.z = -t * 1.6;

      // Mode-specific visual feedback
      if (activeMode === "zero-accident") {
        domeMat.color.setHex(0xc6ff2e);
        domeMat.opacity = 0.28 + Math.sin(t * 3) * 0.06;
        motorRingMat.color.setHex(0xc6ff2e);
      } else if (activeMode === "prevent-damage") {
        domeMat.color.setHex(0x3fd8ff);
        domeMat.opacity = 0.2;
        motorRingMat.color.setHex(0xc6ff2e);
        motorShieldRing.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
      } else if (activeMode === "zero-delay") {
        domeMat.color.setHex(0x3fd8ff);
        domeMat.opacity = 0.14;
        motorRingMat.color.setHex(0x3fd8ff);
      } else {
        domeMat.color.setHex(0x3fd8ff);
        domeMat.opacity = 0.17 + Math.sin(t * 1.8) * 0.03;
        motorRingMat.color.setHex(0x3fd8ff);
      }

      // Move cargo/telemetry packets smoothly along delivery curves
      const speedMul = activeMode === "zero-delay" ? 1.85 : 1.0;
      packetMeshes.forEach((item) => {
        const u = (item.offset + t * item.speed * speedMul) % 1;
        const pos = routeCurves[item.curveIdx].getPointAt(u);
        const tangent = routeCurves[item.curveIdx].getTangentAt(u);
        item.mesh.position.copy(pos);
        item.mesh.lookAt(pos.clone().add(tangent));
      });

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        setTimeout(() => {
          if (!disposed) raf = requestAnimationFrame(animate);
        }, 40);
      } else {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.removeEventListener("start", onControlStart);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onSelectNode]);

  if (webglError) {
    return (
      <div className="w-full h-full bg-[#0f1626] flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-2">
          <div className="text-xs font-mono text-[#3fd8ff] uppercase">3D Spatial View</div>
          <div className="text-lg font-semibold text-white">IndusMindAI Night Plant Hub</div>
          <p className="text-xs text-slate-400">
            WebGL hardware context is unavailable in this browser; telemetry and predictive controls
            remain active below.
          </p>
        </div>
      </div>
    );
  }

  const activeNode = HERO_NODES[selectedId] || HERO_NODES.hub;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Solid Dark Hover Tooltip (never backdrop-blur over WebGL) */}
      {hovered && (
        <div
          style={{
            left: Math.min(hovered.x + 14, (containerRef.current?.clientWidth || 900) - 240),
            top: Math.max(12, hovered.y - 16),
          }}
          className="pointer-events-none absolute z-20 w-56 rounded-xl border border-[#3fd8ff]/40 bg-[#0f1626] p-3 shadow-xl"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-[#3fd8ff]">
            <span>{hovered.node.id}</span>
            <span className="text-[#c6ff2e]">{hovered.node.category}</span>
          </div>
          <div className="text-xs font-semibold text-white mt-0.5">{hovered.node.label}</div>
          <div className="text-[11px] font-mono text-emerald-300 mt-1">{hovered.node.metric}</div>
        </div>
      )}

      {/* Compact Interactive Selected Node Card (top-right inside 3D canvas on desktop) */}
      <div className="hidden md:block absolute top-20 right-8 z-10 w-64 rounded-xl border border-white/15 bg-[#0f1626]/95 p-3.5 text-left">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-[#3fd8ff]">{activeNode.id} · INTERACTIVE 3D NODE</span>
          <span className="text-[#c6ff2e]">LIVE</span>
        </div>
        <div className="text-xs font-semibold text-white mt-1">{activeNode.label}</div>
        <div className="text-[11px] font-mono text-[#3fd8ff] mt-0.5">{activeNode.status}</div>
        <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">{activeNode.detail}</p>
        <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-400">
          Drag anywhere on 3D city to orbit · Click hub, motor, routes, or towers
        </div>
      </div>
    </div>
  );
};
