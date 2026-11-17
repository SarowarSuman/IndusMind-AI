import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MachineAsset } from "../../types/industrial";

export type TwinCameraPreset = "overview" | "isometric" | "topdown" | "critical";

interface FactoryTwin3DProps {
  machines: MachineAsset[];
  selectedMachineId?: string;
  onSelectMachine?: (machineId: string) => void;
  cameraPreset?: TwinCameraPreset;
  presetTrigger?: number;
  zoomDelta?: number;
  zoomTrigger?: number;
  compact?: boolean;
  showZones?: boolean;
}

const _vec3 = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _pointer = new THREE.Vector2();

function statusHexColor(status: MachineAsset["status"], riskLevel: string): number {
  if (status === "Critical" || riskLevel === "Critical Risk") return 0xef4444;
  if (status === "Warning" || riskLevel === "High Risk" || riskLevel === "Moderate Risk") return 0xf59e0b;
  return 0x22c55e;
}

function createFloorGridTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#090f1c";
  ctx.fillRect(0, 0, 512, 512);

  // Subtle industrial sub-grid
  ctx.strokeStyle = "rgba(59, 130, 246, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Major bay lines
  ctx.strokeStyle = "rgba(0, 229, 255, 0.22)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

interface BuiltMachineHandle {
  group: THREE.Group;
  beaconMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
  rotor?: THREE.Object3D;
  armJoint?: THREE.Object3D;
  beltParcels?: THREE.Object3D[];
  hitMesh: THREE.Mesh;
}

function buildCompositeMachine(machine: MachineAsset): BuiltMachineHandle {
  const group = new THREE.Group();
  group.position.set(machine.position3D[0], 0, machine.position3D[2]);
  group.userData.machineId = machine.id;

  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.78,
    roughness: 0.34,
  });
  const brushedAlum = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.85,
    roughness: 0.24,
  });
  const bodySlate = new THREE.MeshStandardMaterial({
    color: 0x263449,
    metalness: 0.55,
    roughness: 0.48,
  });
  const copperAccent = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    metalness: 0.88,
    roughness: 0.22,
  });

  const statusColor = statusHexColor(machine.status, machine.prediction.riskLevel);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: statusColor,
    emissive: statusColor,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.1,
  });

  // Base industrial plinth (common grounding pad)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 1.8), darkSteel);
  plinth.position.y = 0.09;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Corner mounting bolts
  const boltGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8);
  for (const bx of [-0.95, 0.95]) {
    for (const bz of [-0.75, 0.75]) {
      const bolt = new THREE.Mesh(boltGeo, brushedAlum);
      bolt.position.set(bx, 0.2, bz);
      group.add(bolt);
    }
  }

  let rotor: THREE.Object3D | undefined;
  let armJoint: THREE.Object3D | undefined;
  let beltParcels: THREE.Object3D[] | undefined;

  if (machine.visualKind === "motor") {
    // 1. Stator housing
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 1.25, 24), bodySlate);
    housing.rotation.z = Math.PI / 2;
    housing.position.set(0, 0.82, 0);
    housing.castShadow = true;
    group.add(housing);

    // 2. Cooling fins
    for (let i = -4; i <= 4; i++) {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 24), brushedAlum);
      fin.rotation.z = Math.PI / 2;
      fin.position.set(i * 0.11, 0.82, 0);
      group.add(fin);
    }

    // 3. Bearing end-bells
    for (const sx of [-0.66, 0.66]) {
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.54, 0.16, 20), darkSteel);
      bell.rotation.z = Math.PI / 2;
      bell.position.set(sx, 0.82, 0);
      group.add(bell);
    }

    // 4. Terminal junction box
    const jbox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.34), copperAccent);
    jbox.position.set(0.1, 1.44, 0);
    jbox.castShadow = true;
    group.add(jbox);

    // 5. Rotating output shaft & fan coupling
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0.86, 0.82, 0);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.52, 16), brushedAlum);
    shaft.rotation.z = Math.PI / 2;
    rotorGroup.add(shaft);
    const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 16), copperAccent);
    pulley.rotation.z = Math.PI / 2;
    pulley.position.x = 0.16;
    rotorGroup.add(pulley);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.56, 0.09), brushedAlum);
      blade.position.x = 0.22;
      blade.rotation.x = (b * Math.PI) / 4;
      rotorGroup.add(blade);
    }
    group.add(rotorGroup);
    rotor = rotorGroup;
  } else if (machine.visualKind === "pump") {
    // 1. Pressure receiver tank
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 1.35, 22), bodySlate);
    tank.position.set(-0.35, 0.9, 0);
    tank.castShadow = true;
    group.add(tank);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), brushedAlum);
    cap.position.set(-0.35, 1.56, 0);
    group.add(cap);

    // 2. Drive unit & impeller housing
    const drive = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.72), darkSteel);
    drive.position.set(0.48, 0.52, 0);
    drive.castShadow = true;
    group.add(drive);

    // 3. Flanged intake/discharge manifold pipe
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 14), copperAccent);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0.1, 1.12, 0);
    group.add(pipe);

    // 4. Spinning impeller indicator wheel
    const wheel = new THREE.Group();
    wheel.position.set(0.88, 0.55, 0);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), brushedAlum);
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.08), copperAccent);
    bar.position.x = 0.05;
    wheel.add(bar);
    group.add(wheel);
    rotor = wheel;
  } else if (machine.visualKind === "robot") {
    // 1. Pedestal base
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.48, 20), darkSteel);
    ped.position.y = 0.42;
    ped.castShadow = true;
    group.add(ped);

    // 2. Articulated turret + arm group
    const turret = new THREE.Group();
    turret.position.y = 0.68;
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.32, 18), brushedAlum);
    turret.add(shoulder);

    const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.22), bodySlate);
    lowerArm.position.set(0, 0.52, 0);
    lowerArm.rotation.z = -0.28;
    lowerArm.castShadow = true;
    turret.add(lowerArm);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), copperAccent);
    elbow.position.set(0.16, 0.92, 0);
    turret.add(elbow);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.16), brushedAlum);
    upperArm.position.set(0.52, 1.04, 0);
    upperArm.rotation.z = 0.22;
    turret.add(upperArm);

    const gripper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.28), darkSteel);
    gripper.position.set(0.9, 1.08, 0);
    turret.add(gripper);

    group.add(turret);
    armJoint = turret;
  } else if (machine.visualKind === "conveyor") {
    // 1. Twin side rails
    for (const rz of [-0.46, 0.46]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 0.08), brushedAlum);
      rail.position.set(0, 0.62, rz);
      rail.castShadow = true;
      group.add(rail);
    }
    // 2. Support legs
    for (const lx of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.46, 0.9), darkSteel);
      leg.position.set(lx, 0.38, 0);
      group.add(leg);
    }
    // 3. Belt surface
    const belt = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, 0.84), darkSteel);
    belt.position.set(0, 0.62, 0);
    group.add(belt);

    // 4. Overhead scanner arch
    const archLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.1), brushedAlum);
    archLeft.position.set(0.1, 0.95, -0.45);
    group.add(archLeft);
    const archRight = archLeft.clone();
    archRight.position.z = 0.45;
    group.add(archRight);
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 1.02), copperAccent);
    archTop.position.set(0.1, 1.28, 0);
    group.add(archTop);

    // 5. Moving cargo boxes
    const boxes: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++) {
      const pkg = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.24, 0.36),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.2, roughness: 0.6 })
      );
      pkg.position.set(-0.7 + i * 0.68, 0.78, 0);
      pkg.castShadow = true;
      group.add(pkg);
      boxes.push(pkg);
    }
    beltParcels = boxes;
  } else if (machine.visualKind === "boiler") {
    // 1. Pressure vessel
    const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.35, 24), bodySlate);
    vessel.position.set(-0.1, 0.88, 0);
    vessel.castShadow = true;
    group.add(vessel);

    // 2. Thermal ring collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.05, 10, 24), copperAccent);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(-0.1, 1.25, 0);
    group.add(collar);

    // 3. Exhaust stack
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.05, 16), brushedAlum);
    stack.position.set(0.35, 1.45, -0.2);
    stack.castShadow = true;
    group.add(stack);

    // 4. Inspection viewport
    const viewport = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
      })
    );
    viewport.rotation.x = Math.PI / 2;
    viewport.position.set(-0.1, 0.88, 0.62);
    group.add(viewport);
  } else {
    // Generator / Substation
    const enclosure = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.05, 1.15), bodySlate);
    enclosure.position.y = 0.72;
    enclosure.castShadow = true;
    group.add(enclosure);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.88), brushedAlum);
    grille.position.set(0.89, 0.72, 0);
    group.add(grille);

    const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.72, 14), darkSteel);
    muffler.position.set(-0.55, 1.45, -0.25);
    group.add(muffler);

    for (let i = -1; i <= 1; i++) {
      const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.28, 12), copperAccent);
      coil.position.set(0.25 + i * 0.25, 1.38, 0.22);
      group.add(coil);
    }
  }

  // Status beacon dome on top of every machine
  const beaconPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), brushedAlum);
  beaconPole.position.set(-0.82, 1.55, -0.62);
  group.add(beaconPole);

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), beaconMat);
  beacon.position.set(-0.82, 1.82, -0.62);
  group.add(beacon);

  // Ground status perimeter ring
  const ringMat = new THREE.MeshBasicMaterial({
    color: statusColor,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.28, 36), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  group.add(ring);

  // Invisible raycast collision box on layer 1 for crisp, fast picking
  const hitMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 2.2, 2.0),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitMesh.position.y = 1.0;
  hitMesh.layers.set(1);
  hitMesh.userData.machineId = machine.id;
  group.add(hitMesh);

  return { group, beaconMat, ringMat, rotor, armJoint, beltParcels, hitMesh };
}

export const FactoryTwin3D: React.FC<FactoryTwin3DProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
  cameraPreset = "overview",
  presetTrigger = 0,
  zoomDelta = 0,
  zoomTrigger = 0,
  compact = false,
  showZones = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredMachine, setHoveredMachine] = useState<{
    machine: MachineAsset;
    x: number;
    y: number;
  } | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const machinesRef = useRef<MachineAsset[]>(machines);
  machinesRef.current = machines;

  const selectedIdRef = useRef<string | undefined>(selectedMachineId);
  selectedIdRef.current = selectedMachineId;

  const onSelectRef = useRef(onSelectMachine);
  onSelectRef.current = onSelectMachine;

  const cameraTargetGoal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) setReducedMotion(true);
  }, []);

  // Compute structural signature so we rebuild 3D meshes only when machine IDs/count change
  const machineSignature = useMemo(
    () => machines.map((m) => `${m.id}:${m.visualKind}`).join("|"),
    [machines]
  );

  // Trigger smooth camera preset transitions
  useEffect(() => {
    if (presetTrigger === 0) return;
    if (cameraPreset === "overview") {
      cameraTargetGoal.current = {
        pos: new THREE.Vector3(10.5, 8.2, 11.8),
        target: new THREE.Vector3(0, 0.7, 0),
      };
    } else if (cameraPreset === "isometric") {
      cameraTargetGoal.current = {
        pos: new THREE.Vector3(-11.5, 9.5, 10.5),
        target: new THREE.Vector3(0, 0.5, 0),
      };
    } else if (cameraPreset === "topdown") {
      cameraTargetGoal.current = {
        pos: new THREE.Vector3(0.01, 16.5, 0.5),
        target: new THREE.Vector3(0, 0, 0),
      };
    } else if (cameraPreset === "critical") {
      const crit =
        machinesRef.current.find((m) => m.prediction.riskLevel === "Critical Risk") ||
        [...machinesRef.current].sort((a, b) => b.prediction.riskScore - a.prediction.riskScore)[0];
      if (crit) {
        const [mx, , mz] = crit.position3D;
        cameraTargetGoal.current = {
          pos: new THREE.Vector3(mx + 4.4, 3.8, mz + 5.2),
          target: new THREE.Vector3(mx, 0.85, mz),
        };
      }
    }
  }, [cameraPreset, presetTrigger]);

  // Zoom button handler
  const zoomQueueRef = useRef<number>(0);
  useEffect(() => {
    if (zoomTrigger > 0) {
      zoomQueueRef.current = zoomDelta;
    }
  }, [zoomDelta, zoomTrigger]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // WebGL availability & software renderer guard
    let isSoftwareGl = false;
    try {
      const probe = document.createElement("canvas").getContext("webgl2");
      if (!probe) {
        setWebglError("WebGL2 is unavailable on this browser; showing interactive 2D twin view.");
        return;
      }
      const ext = probe.getExtension("WEBGL_debug_renderer_info");
      const gpu = String(probe.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER));
      probe.getExtension("WEBGL_lose_context")?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      setWebglError("Unable to initialize 3D graphics context.");
      return;
    }

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(260, container.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.022);

    const camera = new THREE.PerspectiveCamera(compact ? 42 : 44, width / height, 0.1, 120);
    camera.position.set(10.5, 8.2, 11.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError("3D graphics context paused. Switch to 2D schematic or reload.");
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

    // Mandatory studio reflections via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // 3-Point Warm/Cool Industrial Lighting Rig
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.7);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    keyLight.position.set(11, 16, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -14;
    keyLight.shadow.camera.right = 14;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00e5ff, 1.15);
    rimLight.position.set(-12, 8, -10);
    scene.add(rimLight);

    const aiCoreGlow = new THREE.PointLight(0x8b5cf6, 2.5, 16, 1.5);
    aiCoreGlow.position.set(0, 2.5, 0);
    scene.add(aiCoreGlow);

    // Ground floor with procedural texture
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const floorTex = createFloorGridTexture(maxAniso);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.72,
      metalness: 0.28,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Zone boundary slabs
    if (showZones) {
      const zoneColors = [
        { x: -1.5, z: -2.8, w: 12.2, d: 4.2, color: 0x00e5ff },
        { x: -3.0, z: 2.6, w: 6.2, d: 4.0, color: 0x3b82f6 },
        { x: 3.0, z: 2.6, w: 6.2, d: 4.0, color: 0x8b5cf6 },
      ];
      for (const zc of zoneColors) {
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(zc.w, 0.03, zc.d));
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: zc.color, transparent: true, opacity: 0.35 })
        );
        line.position.set(zc.x, 0.02, zc.z);
        scene.add(line);
      }
    }

    // Central Holographic AI Intelligence Core
    const coreGroup = new THREE.Group();
    const corePedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.85, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0x111c2d, metalness: 0.8, roughness: 0.25 })
    );
    corePedestal.position.y = 0.18;
    coreGroup.add(corePedestal);

    const coreCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00e5ff,
        emissiveIntensity: 0.9,
        metalness: 0.2,
        roughness: 0.15,
        wireframe: false,
      })
    );
    coreCrystal.position.y = 1.45;
    coreGroup.add(coreCrystal);

    const coreRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.02, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.65 })
    );
    coreRing1.position.y = 1.45;
    coreRing1.rotation.x = Math.PI / 3;
    coreGroup.add(coreRing1);

    const coreRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.015, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.5 })
    );
    coreRing2.position.y = 1.45;
    coreRing2.rotation.y = Math.PI / 4;
    coreGroup.add(coreRing2);
    scene.add(coreGroup);

    // Build all machines & data pathways
    const machineHandles = new Map<string, BuiltMachineHandle>();
    const pickTargets: THREE.Object3D[] = [];
    const packetCurves: Array<{ curve: THREE.CatmullRomCurve3; packet: THREE.Mesh; speed: number; offset: number }> = [];

    const packetGeo = new THREE.SphereGeometry(0.085, 8, 8);
    const packetMatCyan = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const packetMatAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    machinesRef.current.forEach((m, idx) => {
      const handle = buildCompositeMachine(m);
      scene.add(handle.group);
      machineHandles.set(m.id, handle);
      pickTargets.push(handle.hitMesh);

      // Curved data pathway from machine to central AI Edge Core
      const start = new THREE.Vector3(m.position3D[0], 0.28, m.position3D[2]);
      const mid = new THREE.Vector3(m.position3D[0] * 0.45, 0.16, m.position3D[2] * 0.45);
      const end = new THREE.Vector3(0, 0.35, 0);
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 18, 0.025, 6, false),
        new THREE.MeshBasicMaterial({
          color: idx % 2 === 0 ? 0x00e5ff : 0x3b82f6,
          transparent: true,
          opacity: 0.35,
        })
      );
      scene.add(tube);

      const packet = new THREE.Mesh(
        packetGeo,
        m.status === "Operational" ? packetMatCyan : packetMatAmber
      );
      scene.add(packet);
      packetCurves.push({ curve, packet, speed: 0.28 + idx * 0.04, offset: idx * 0.17 });
    });

    // Atmospheric data particles
    const particleCount = 90;
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 24;
      pPos[i * 3 + 1] = 0.6 + Math.random() * 6.5;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.07, transparent: true, opacity: 0.45 })
    );
    particles.frustumCulled = false;
    scene.add(particles);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minDistance = 4.5;
    controls.maxDistance = 26;
    controls.autoRotate = !isSoftwareGl && !reducedMotion && compact;
    controls.autoRotateSpeed = 0.45;
    controls.target.set(0, 0.7, 0);

    controls.addEventListener("start", () => {
      cameraTargetGoal.current = null;
      controls.autoRotate = false;
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycaster interaction
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastHoverCheck = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 45) return;
      lastHoverCheck = now;

      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_pointer, camera);
      const hits = raycaster.intersectObjects(pickTargets, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.machineId as string;
        const found = machinesRef.current.find((m) => m.id === hitId);
        if (found) {
          renderer.domElement.style.cursor = "pointer";
          setHoveredMachine({
            machine: found,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
          return;
        }
      }
      renderer.domElement.style.cursor = "grab";
      setHoveredMachine(null);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_pointer, camera);
      const hits = raycaster.intersectObjects(pickTargets, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.machineId as string;
        if (hitId && onSelectRef.current) {
          onSelectRef.current(hitId);
        }
      }
    };

    const handleLeave = () => {
      setHoveredMachine(null);
      renderer.domElement.style.cursor = "default";
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("pointerleave", handleLeave);

    // ResizeObserver for crisp container fitting
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, entry.contentRect.width);
        const h = Math.max(240, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    ro.observe(container);

    // Animation loop with software-WebGL afterDraw pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      // Zoom button queue
      if (zoomQueueRef.current !== 0) {
        _vec3.subVectors(camera.position, controls.target);
        const factor = zoomQueueRef.current > 0 ? 0.82 : 1.22;
        const newLen = THREE.MathUtils.clamp(_vec3.length() * factor, 4.5, 26);
        _vec3.setLength(newLen);
        camera.position.copy(controls.target).add(_vec3);
        zoomQueueRef.current = 0;
      }

      // Smooth damped camera preset transitions
      if (cameraTargetGoal.current) {
        const goal = cameraTargetGoal.current;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, goal.pos.x, 4.8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, goal.pos.y, 4.8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, goal.pos.z, 4.8, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, goal.target.x, 4.8, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, goal.target.y, 4.8, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, goal.target.z, 4.8, delta);

        if (camera.position.distanceTo(goal.pos) < 0.08) {
          cameraTargetGoal.current = null;
        }
      }

      controls.update();

      // Update machine visuals dynamically from shared state
      if (!reducedMotion) {
        coreCrystal.rotation.y += delta * 0.7;
        coreRing1.rotation.z += delta * 0.5;
        coreRing2.rotation.x -= delta * 0.4;
        particles.rotation.y += delta * 0.025;

        for (const item of packetCurves) {
          const t = (elapsed * item.speed + item.offset) % 1;
          item.curve.getPointAt(t, _targetVec);
          item.packet.position.copy(_targetVec);
        }
      }

      for (const m of machinesRef.current) {
        const handle = machineHandles.get(m.id);
        if (!handle) continue;
        const hex = statusHexColor(m.status, m.prediction.riskLevel);
        handle.beaconMat.color.setHex(hex);
        handle.beaconMat.emissive.setHex(hex);
        handle.ringMat.color.setHex(hex);

        const isSelected = selectedIdRef.current === m.id;
        handle.ringMat.opacity = isSelected ? 0.95 : m.status === "Critical" ? 0.72 + Math.sin(elapsed * 5) * 0.2 : 0.42;

        if (!reducedMotion) {
          const speedScale = m.status === "Critical" ? 0.45 : 1;
          if (handle.rotor) {
            handle.rotor.rotation.x += delta * 6.5 * speedScale;
          }
          if (handle.armJoint) {
            handle.armJoint.rotation.y = Math.sin(elapsed * 0.85 * speedScale) * 0.55;
          }
          if (handle.beltParcels) {
            handle.beltParcels.forEach((box, bIdx) => {
              const xPos = (((elapsed * 0.45 * speedScale + bIdx * 0.68) % 2.04) - 1.02);
              box.position.x = xPos;
            });
          }
          // Subtle vibration jitter when vibration is high
          if (m.status === "Critical") {
            handle.group.position.x = m.position3D[0] + Math.sin(elapsed * 42) * 0.025;
          } else {
            handle.group.position.x = m.position3D[0];
          }
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("pointerleave", handleLeave);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      controls.dispose();
      envTex.dispose();
      floorTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [machineSignature, compact, showZones, reducedMotion]);

  if (webglError) {
    // Graceful 2D Interactive Digital Twin Fallback
    return (
      <div className="relative w-full h-full min-h-[340px] rounded-xl bg-[#0D1422] border border-slate-800 p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>2D Interactive Schematic Fallback</span>
          <span>{webglError}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-6">
          {machines.map((m) => {
            const isCrit = m.prediction.riskLevel === "Critical Risk";
            const isWarn = m.prediction.riskLevel === "High Risk" || m.prediction.riskLevel === "Moderate Risk";
            return (
              <button
                key={m.id}
                onClick={() => onSelectMachine?.(m.id)}
                className={`text-left p-4 rounded-lg border transition-colors ${
                  selectedMachineId === m.id
                    ? "border-[#00E5FF] bg-[#111C2D]"
                    : "border-slate-800 bg-[#0A101D] hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-slate-200">{m.id}</span>
                  <span
                    className={`text-xs font-medium ${
                      isCrit ? "text-[#EF4444]" : isWarn ? "text-[#F59E0B]" : "text-[#22C55E]"
                    }`}
                  >
                    {m.prediction.healthScore}%
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-100 mt-1 truncate">{m.name}</p>
                <p className="text-xs text-slate-400 mt-1 font-mono tabular-nums">
                  {m.temperature.toFixed(1)}°C · {m.vibration.toFixed(2)} mm/s
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[340px] select-none overflow-hidden rounded-xl border border-slate-800/80 bg-[#070B14]">
      <div ref={mountRef} className="w-full h-full" aria-label="Interactive 3D Factory Digital Twin" />

      {/* Hover Tooltip — solid dark surface (no backdrop-blur over WebGL) */}
      {hoveredMachine && (
        <div
          className="pointer-events-none absolute z-20 w-56 rounded-lg border border-slate-700 bg-[#0D1422]/95 p-3 shadow-xl"
          style={{
            left: Math.min(hoveredMachine.x + 14, 460),
            top: Math.max(12, hoveredMachine.y - 20),
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-[#00E5FF]">
              {hoveredMachine.machine.id}
            </span>
            <span
              className={`text-xs font-semibold ${
                hoveredMachine.machine.prediction.riskLevel === "Critical Risk"
                  ? "text-[#EF4444]"
                  : hoveredMachine.machine.prediction.riskLevel === "Low Risk"
                  ? "text-[#22C55E]"
                  : "text-[#F59E0B]"
              }`}
            >
              {hoveredMachine.machine.prediction.riskLevel}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-100 mt-1 truncate">
            {hoveredMachine.machine.name}
          </p>
          <div className="mt-2 space-y-1 text-xs text-slate-300 font-mono tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-400">Health Score</span>
              <span>{hoveredMachine.machine.prediction.healthScore}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vibration</span>
              <span>{hoveredMachine.machine.vibration.toFixed(2)} mm/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Temperature</span>
              <span>{hoveredMachine.machine.temperature.toFixed(1)} °C</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
