import * as THREE from 'three';

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
