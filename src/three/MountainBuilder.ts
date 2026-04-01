import * as THREE from 'three';
import { FlowerType } from '../core/models/Flower';

const COLOR_MOUNTAIN = 0x2a2a3a;
const COLOR_MOUNTAIN_SNOW = 0x445566;
const COLOR_VERTEX_TREE_TRUNK = 0x4a3a2a;
const COLOR_VERTEX_TREE_FOLIAGE = 0xccaa44;
const COLOR_STAR_SLOT = 0xffcc44;
const COLOR_PLACED_STAR = 0xffffaa;

export function createMountain(height: number): THREE.Group {
  const group = new THREE.Group();

  // Main mountain cone
  const coneGeo = new THREE.ConeGeometry(3, height, 8);
  const coneMat = new THREE.MeshStandardMaterial({
    color: COLOR_MOUNTAIN,
    roughness: 0.9,
    metalness: 0.1,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = height / 2;
  cone.castShadow = true;
  cone.receiveShadow = true;
  group.add(cone);

  // Snow cap at peak
  const capGeo = new THREE.ConeGeometry(1.0, height * 0.25, 8);
  const capMat = new THREE.MeshStandardMaterial({
    color: COLOR_MOUNTAIN_SNOW,
    roughness: 0.7,
    emissive: 0x223344,
    emissiveIntensity: 0.15,
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = height * 0.75;
  cap.castShadow = true;
  group.add(cap);

  return group;
}

export function createVertexTree(mountainHeight: number): THREE.Group {
  const group = new THREE.Group();

  // Trunk - taller than regular trees
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.8, 6);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: COLOR_VERTEX_TREE_TRUNK,
    roughness: 0.8,
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = mountainHeight + 0.9;
  trunk.castShadow = true;
  group.add(trunk);

  // Glowing foliage
  const foliageMat = new THREE.MeshStandardMaterial({
    color: COLOR_VERTEX_TREE_FOLIAGE,
    emissive: COLOR_VERTEX_TREE_FOLIAGE,
    emissiveIntensity: 0.4,
    roughness: 0.5,
  });
  const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), foliageMat);
  f1.position.y = mountainHeight + 2.0;
  f1.castShadow = true;
  group.add(f1);

  const f2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), foliageMat);
  f2.position.set(0.2, mountainHeight + 2.5, 0.1);
  f2.castShadow = true;
  group.add(f2);

  // Star slot indicator (glowing ring at base of tree on mountain top)
  const ringGeo = new THREE.TorusGeometry(0.4, 0.06, 8, 16);
  const ringMat = new THREE.MeshStandardMaterial({
    color: COLOR_STAR_SLOT,
    emissive: COLOR_STAR_SLOT,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.7,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = mountainHeight + 0.05;
  group.add(ring);

  // Point light for glow
  const glow = new THREE.PointLight(COLOR_STAR_SLOT, 0.5, 5);
  glow.position.y = mountainHeight + 1.5;
  group.add(glow);

  return group;
}

export function createPlacedStarMesh(mountainHeight: number): THREE.Mesh {
  const geo = new THREE.OctahedronGeometry(0.35, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: COLOR_PLACED_STAR,
    emissive: COLOR_PLACED_STAR,
    emissiveIntensity: 1.0,
    roughness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = mountainHeight + 0.5;
  return mesh;
}

// --- Flower Shop & Flowers ---

const COLOR_SHOP_WOOD = 0x4a3a2a;
const COLOR_SHOP_ROOF = 0x3a2a3a;
const COLOR_SHOP_SIGN = 0xff88aa;
const FLOWER_COLORS: Record<FlowerType, number> = {
  [FlowerType.BASIC]: 0xff88aa,
  [FlowerType.ADVANCED]: 0xffaa44,
  [FlowerType.SPECIAL]: 0xdd66ff,
};

export function createFlowerShopBuilding(): THREE.Group {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.4, 1.0, 1.0);
  const bodyMat = new THREE.MeshStandardMaterial({ color: COLOR_SHOP_WOOD, roughness: 0.8 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Roof
  const roofGeo = new THREE.ConeGeometry(1.2, 0.6, 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: COLOR_SHOP_ROOF, roughness: 0.7 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 1.3;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  // Sign flower decoration
  const signGeo = new THREE.SphereGeometry(0.15, 8, 6);
  const signMat = new THREE.MeshStandardMaterial({
    color: COLOR_SHOP_SIGN,
    emissive: COLOR_SHOP_SIGN,
    emissiveIntensity: 0.8,
  });
  for (let i = 0; i < 3; i++) {
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(-0.3 + i * 0.3, 1.05, 0.55);
    group.add(sign);
  }

  // Warm point light
  const light = new THREE.PointLight(0xffaa66, 1.0, 8);
  light.position.y = 1.5;
  group.add(light);

  return group;
}

export function createPlacedFlower(type: FlowerType): THREE.Group {
  const group = new THREE.Group();
  const color = FLOWER_COLORS[type];

  // Stem
  const stemH = type === FlowerType.SPECIAL ? 0.6 : type === FlowerType.ADVANCED ? 0.45 : 0.3;
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, stemH, 4);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = stemH / 2;
  group.add(stem);

  // Petals
  const petalR = type === FlowerType.SPECIAL ? 0.18 : type === FlowerType.ADVANCED ? 0.12 : 0.08;
  const petalCount = type === FlowerType.SPECIAL ? 8 : type === FlowerType.ADVANCED ? 6 : 5;
  const petalGeo = new THREE.SphereGeometry(petalR, 6, 4);
  const petalMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: type === FlowerType.SPECIAL ? 1.0 : 0.6,
    roughness: 0.4,
  });
  for (let i = 0; i < petalCount; i++) {
    const a = (i / petalCount) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(Math.cos(a) * petalR * 1.2, stemH + 0.05, Math.sin(a) * petalR * 1.2);
    group.add(petal);
  }

  // Center
  const centerGeo = new THREE.SphereGeometry(petalR * 0.6, 6, 4);
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0xffffaa,
    emissive: 0xffffaa,
    emissiveIntensity: 0.8,
  });
  const center = new THREE.Mesh(centerGeo, centerMat);
  center.position.y = stemH + 0.05;
  group.add(center);

  // Small glow for special
  if (type === FlowerType.SPECIAL) {
    const glow = new THREE.PointLight(color, 0.5, 4);
    glow.position.y = stemH + 0.1;
    group.add(glow);
  }

  return group;
}

export function createSpecialFlowerBloom(): THREE.Group {
  const group = new THREE.Group();

  // Large multi-layered bloom
  const layers = 3;
  for (let l = 0; l < layers; l++) {
    const r = 0.3 - l * 0.07;
    const petalCount = 10 - l * 2;
    const y = l * 0.15;
    const color = [0xdd66ff, 0xff88cc, 0xffaadd][l];
    const petalGeo = new THREE.SphereGeometry(r, 8, 6);
    const petalMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });
    for (let i = 0; i < petalCount; i++) {
      const a = (i / petalCount) * Math.PI * 2 + l * 0.3;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(Math.cos(a) * r * 2.5, y + 0.5, Math.sin(a) * r * 2.5);
      group.add(petal);
    }
  }

  // Golden center
  const centerGeo = new THREE.SphereGeometry(0.25, 12, 8);
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0xffffaa,
    emissive: 0xffffcc,
    emissiveIntensity: 1.5,
  });
  const center = new THREE.Mesh(centerGeo, centerMat);
  center.position.y = 0.6;
  group.add(center);

  // Glow light
  const glow = new THREE.PointLight(0xff88dd, 2.0, 15);
  glow.position.y = 1.0;
  group.add(glow);

  return group;
}

export function enhanceTreeGlow(treeGroup: THREE.Group): void {
  treeGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        mat.emissiveIntensity = Math.min(mat.emissiveIntensity + 0.5, 1.5);
      }
    }
    if (child instanceof THREE.PointLight) {
      child.intensity = 2.0;
      child.distance = 10;
    }
  });
}
