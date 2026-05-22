import * as THREE from 'three';
import { createDefaultPlayer, LIGHT_VISUAL_BY_TYPE, type PlayerState } from '../core/models/Player';
import { AlignmentSystem } from '../core/systems/AlignmentSystem';
import { createDefaultInventory, addFragment, getActivePouch, type InventoryState } from '../core/models/Inventory';
import { createStarFragment, createStarDeposit, FragmentTier, type StarFragmentData, type StarDepositData } from '../core/models/StarFragment';
import { createHammerAnimal, AnimalSpecies, HammerType, AnimalState, type HammerAnimalData } from '../core/models/HammerAnimal';
import { createNPC, NPCDisposition, NPCAction, type NPCData } from '../core/models/NPC';
import { DifficultyLevel, DIFFICULTY_PRESETS, type DifficultyConfig } from '../core/models/Difficulty';
import { LightSystem } from '../core/systems/LightSystem';
import { AISystem } from '../core/systems/AISystem';
import { CombatSystem } from '../core/systems/CombatSystem';
import { MiningSystem } from '../core/systems/MiningSystem';
import { MergeSystem } from '../core/systems/MergeSystem';
import { ProgressionSystem } from '../core/systems/ProgressionSystem';
import { CooperationSystem } from '../core/systems/CooperationSystem';
import { HP_REGEN_RATE, MAP_WIDTH, MAP_HEIGHT, TREE_COUNT, FRAGMENT_SCATTER_COUNT, DEPOSIT_COUNT, MERGE_COUNT, STICK_CRAFT_COUNT, MAP_INSCRIBED_RADIUS, MAP_CENTER_X, MAP_CENTER_Y, VERTEX_TREE_INTERACTION_RANGE, MOUNTAIN_EXCLUSION_RADIUS, VICTORY_TRIGGER_RADIUS } from '../core/constants/GameConstants';
import { distance } from '../shared/utils';
import { getPolygonVertices, isInsidePolygon, clampToPolygon, randomPointInPolygon, getStarShape, type Vec2 } from '../core/utils/PolygonMapUtils';
import { createMountain, createVertexTree, createPlacedStarMesh, enhanceTreeGlow, createFlowerShopBuilding, createPlacedFlower, createSpecialFlowerBloom, createChestMesh } from './MountainBuilder';
import { createVertexStarStates, getRequiredTier, type VertexStarState } from '../core/models/VertexStar';
import { FlowerType, createFlower, type FlowerData, type FlowerShopState } from '../core/models/Flower';
import { ChestType, ChestState, createChest, type ChestData } from '../core/models/Chest';
import { ChestSystem } from '../core/systems/ChestSystem';

const PICKUP_RANGE = 24;
const MINING_RANGE = 48;
const ATTACK_RANGE = 40;
const ENEMY_COUNT = 8;
const NPC_COUNT = 4;
const CHEST_RANGE = 60;
const SOLO_CHEST_COUNT = 4;
const COOP_CHEST_COUNT = 2;
const WORLD_SCALE = 0.02; // Convert 2D px to 3D units (3200px → 64 units)

// Color palette — Atkinson Grimshaw style, pastel night tones
const COLOR_GROUND = 0x1a2a1a;
const COLOR_GROUND2 = 0x1e2e1e;
const COLOR_TREE_TRUNK = 0x3a2a1a;
const COLOR_TREE_FOLIAGE = 0x1a3a1a;
const COLOR_PLAYER_GLOW = 0xffcc44;
const COLOR_FRAGMENT = 0xffffcc;
const COLOR_DEPOSIT = 0x2a2a3a;
const COLOR_NPC = 0xaabb99;
const COLOR_AMBIENT = 0x334466;
const COLOR_MOON = 0xccccdd;

const ENEMY_COLORS: Record<AnimalSpecies, number> = {
  [AnimalSpecies.HAMMER_BIRD]: 0x554433,
  [AnimalSpecies.HAMMER_WOLF]: 0x444455,
  [AnimalSpecies.HAMMER_BEAR]: 0x3a2a1a,
  [AnimalSpecies.HAMMER_TIGER]: 0x664422,
  [AnimalSpecies.HAMMER_ELEPHANT]: 0x555566,
};

const ENEMY_SIZES: Record<AnimalSpecies, number> = {
  [AnimalSpecies.HAMMER_BIRD]: 0.6,
  [AnimalSpecies.HAMMER_WOLF]: 0.8,
  [AnimalSpecies.HAMMER_BEAR]: 1.2,
  [AnimalSpecies.HAMMER_TIGER]: 1.0,
  [AnimalSpecies.HAMMER_ELEPHANT]: 1.5,
};

function toWorld(px: number, py: number): [number, number] {
  return [(px - MAP_WIDTH / 2) * WORLD_SCALE, (py - MAP_HEIGHT / 2) * WORLD_SCALE];
}

function fromWorld(wx: number, wz: number): [number, number] {
  return [wx / WORLD_SCALE + MAP_WIDTH / 2, wz / WORLD_SCALE + MAP_HEIGHT / 2];
}

export class Game {
  // Three.js core
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private clock = new THREE.Clock();

  // Game state
  private state: 'title' | 'playing' | 'gameover' | 'ending' = 'title';
  private playerState!: PlayerState;
  private inventory!: InventoryState;
  private difficulty!: DifficultyConfig;
  private fragments: StarFragmentData[] = [];
  private deposits: StarDepositData[] = [];
  private enemies: HammerAnimalData[] = [];
  private npcs: NPCData[] = [];

  // Polygon map
  private mapVertices: Vec2[] = [];
  private vertexTrees: {
    vertexIndex: number;
    gameX: number;
    gameY: number;
    mesh: THREE.Group;
    mountainMesh: THREE.Group;
    hasStarPlaced: boolean;
    starMesh?: THREE.Mesh;
  }[] = [];
  private vertexStarStates: VertexStarState[] = [];
  private allStarsPlaced = false;
  private centerStarMesh: THREE.Group | null = null;

  // Ending sequence
  private endingElapsed = 0;
  private endingPhase = 0;
  private ambientLight: THREE.AmbientLight | null = null;
  private endingOverlay: HTMLDivElement | null = null;

  // 3D objects
  private playerGroup!: THREE.Group;
  private playerBody!: THREE.Mesh;
  private playerFlame!: THREE.Mesh;
  private playerLight!: THREE.PointLight;
  private playerAmbientLight!: THREE.PointLight;
  private playerGlow!: THREE.Mesh;
  private enemyMeshes = new Map<string, THREE.Group>();
  private fragmentMeshes = new Map<string, THREE.Mesh>();
  private depositMeshes = new Map<string, THREE.Mesh>();
  private npcMeshes = new Map<string, THREE.Group>();
  private treeMeshes: THREE.Mesh[] = [];
  private attackArc!: THREE.Mesh;
  private attackArcTimer = 0;

  // Chests
  private chests: ChestData[] = [];
  private chestMeshes = new Map<string, THREE.Group>();
  private currentOpeningChest: ChestData | null = null;

  // Flower shop
  private flowerShop: FlowerShopState = { flowers: [], specialFlowerBought: false };
  private flowerShopGamePos = { x: 0, y: 0 };
  private flowerShopMesh: THREE.Group | null = null;
  private flowerMeshes: THREE.Group[] = [];
  private flowerShopOpen = false;
  private isTrueEnding = false;
  private specialFlowerMesh: THREE.Group | null = null;
  private respawnTimer = 0;

  // Input
  private keys = new Set<string>();
  private keyDownThisFrame = new Set<string>();
  private inventoryOpen = false;
  private currentMiningDeposit: StarDepositData | null = null;
  private inputBlocked = false; // Block game keys when admin panel input is focused

  // Admin
  private adminOpen = false;
  private speedMultiplier = 1.0;

  // Message
  private messageTimer = 0;

  // Floating damage numbers (managed in 3D)
  private floatingTexts: { mesh: THREE.Sprite; vy: number; life: number }[] = [];

  init(): void {
    this.setupInput();
    this.setupTitleScreen();
  }

  // --- Title Screen ---
  private setupTitleScreen(): void {
    const mainMenu = document.getElementById('main-menu')!;
    const diffButtons = document.getElementById('difficulty-buttons')!;
    const guidePanel = document.getElementById('guide-panel')!;
    const lorePanel = document.getElementById('lore-panel')!;

    const showPanel = (panel: 'main' | 'difficulty' | 'guide' | 'lore') => {
      mainMenu.style.display = panel === 'main' ? '' : 'none';
      diffButtons.style.display = panel === 'difficulty' ? '' : 'none';
      guidePanel.style.display = panel === 'guide' ? '' : 'none';
      lorePanel.style.display = panel === 'lore' ? '' : 'none';
    };

    // 메인 메뉴 버튼
    document.getElementById('btn-start')!.addEventListener('click', () => showPanel('difficulty'));
    document.getElementById('btn-guide')!.addEventListener('click', () => showPanel('guide'));
    document.getElementById('btn-lore')!.addEventListener('click', () => showPanel('lore'));
    document.getElementById('btn-guide-back')!.addEventListener('click', () => showPanel('main'));
    document.getElementById('btn-lore-back')!.addEventListener('click', () => showPanel('main'));

    // 난이도 선택 버튼
    const container = diffButtons;
    container.innerHTML = '';
    const levels = [
      { level: DifficultyLevel.STAR_5, label: '⬠ 보름달 (쉬움)' },
      { level: DifficultyLevel.STAR_6, label: '⬡ 하현달' },
      { level: DifficultyLevel.STAR_8, label: '✦ 그믐달 (어려움)' },
      { level: DifficultyLevel.STAR_12, label: '✧ 삭 (극한)' },
    ];
    const backBtn = document.createElement('button');
    backBtn.className = 'diff-btn';
    backBtn.textContent = '← 돌아가기';
    backBtn.style.marginTop = '10px';
    backBtn.style.color = '#666';
    backBtn.addEventListener('click', () => showPanel('main'));

    for (const { level, label } of levels) {
      const btn = document.createElement('button');
      btn.className = 'diff-btn';
      btn.textContent = label;
      btn.addEventListener('click', (ev) => { (ev.target as HTMLElement).blur(); this.startGame(level); });
      container.appendChild(btn);
    }
    container.appendChild(backBtn);
  }

  private showTitleMain(): void {
    document.getElementById('title-screen')!.style.display = 'flex';
    document.getElementById('main-menu')!.style.display = '';
    document.getElementById('difficulty-buttons')!.style.display = 'none';
    document.getElementById('guide-panel')!.style.display = 'none';
    document.getElementById('lore-panel')!.style.display = 'none';
  }

  private startGame(level: DifficultyLevel): void {
    document.getElementById('title-screen')!.style.display = 'none';
    document.getElementById('hud')!.style.display = 'block';
    document.getElementById('gameover-screen')!.classList.remove('open');
    document.getElementById('game-canvas')!.focus();

    this.difficulty = { ...DIFFICULTY_PRESETS[level] };
    this.playerState = createDefaultPlayer(MAP_CENTER_X, MAP_CENTER_Y);
    this.inventory = createDefaultInventory();
    this.fragments = [];
    this.deposits = [];
    this.enemies = [];
    this.npcs = [];
    this.inventoryOpen = false;
    this.flowerShopOpen = false;
    this.currentMiningDeposit = null;
    this.chests = [];
    this.chestMeshes.clear();
    this.currentOpeningChest = null;
    this.messageTimer = 0;
    this.flowerShop = { flowers: [], specialFlowerBought: false };
    this.flowerMeshes = [];
    this.flowerShopMesh = null;
    this.isTrueEnding = false;
    this.specialFlowerMesh = null;
    document.getElementById('flower-shop-panel')!.classList.remove('open');
    this.keys.clear();
    this.keyDownThisFrame.clear();
    this.inputBlocked = false;

    // Compute polygon map vertices
    this.mapVertices = getPolygonVertices(level, MAP_INSCRIBED_RADIUS, MAP_CENTER_X, MAP_CENTER_Y);
    this.vertexStarStates = createVertexStarStates(level, level);
    this.vertexTrees = [];
    this.allStarsPlaced = false;
    this.centerStarMesh = null;
    this.endingElapsed = 0;
    this.endingPhase = 0;
    this.endingOverlay = null;

    this.setupThreeJS();
    this.buildWorld();
    this.spawnEntities();
    this.setupAdminPanel();
    this.state = 'playing';
    this.clock.start();
    // Focus canvas for keyboard input
    const canvas = document.getElementById('game-canvas')!;
    canvas.focus();
    this.animate();
  }

  // --- Three.js Setup ---
  private setupThreeJS(): void {
    // Clean up existing scene
    if (this.renderer) {
      this.renderer.dispose();
    }

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const mb = this.difficulty.moonBrightness;
    this.renderer.toneMappingExposure = 1.5 + mb * 2.0;

    this.scene = new THREE.Scene();
    // Brighter background for easier difficulties
    const bgBrightness = Math.round(0x05 + mb * 0x05);
    const bgR = bgBrightness;
    const bgG = Math.round(0x08 + mb * 0x08);
    const bgB = Math.round(0x10 + mb * 0x10);
    const bgColor = (bgR << 16) | (bgG << 8) | bgB;
    this.scene.background = new THREE.Color(bgColor);
    this.scene.fog = new THREE.FogExp2(bgColor, 0.008 + (1 - mb) * 0.025);

    // Isometric-like orthographic camera
    const aspect = window.innerWidth / window.innerHeight;
    const frustum = 20;
    this.camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 200,
    );
    // 3/4 view angle (looking down at ~45 degrees, slightly rotated)
    this.camera.position.set(30, 35, 30);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(COLOR_AMBIENT, 0.5 + mb * 1.5);
    this.scene.add(this.ambientLight);

    // Moon directional light
    const moonLight = new THREE.DirectionalLight(COLOR_MOON, 0.5 + mb * 1.5);
    moonLight.position.set(20, 40, -10);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(1024, 1024);
    moonLight.shadow.camera.near = 1;
    moonLight.shadow.camera.far = 100;
    moonLight.shadow.camera.left = -40;
    moonLight.shadow.camera.right = 40;
    moonLight.shadow.camera.top = 40;
    moonLight.shadow.camera.bottom = -40;
    this.scene.add(moonLight);

    // Resize handler
    window.addEventListener('resize', () => {
      const a = window.innerWidth / window.innerHeight;
      this.camera.left = -frustum * a;
      this.camera.right = frustum * a;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // --- World Building ---
  private buildWorld(): void {
    // Void plane beneath everything (dark abyss outside polygon)
    const voidGeo = new THREE.PlaneGeometry(200, 200);
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x020408 });
    const voidPlane = new THREE.Mesh(voidGeo, voidMat);
    voidPlane.rotation.x = -Math.PI / 2;
    voidPlane.position.y = -0.1;
    this.scene.add(voidPlane);

    // Polygon-shaped ground
    const shape = new THREE.Shape();
    const worldVerts = this.mapVertices.map(v => toWorld(v.x, v.y));
    shape.moveTo(worldVerts[0][0], worldVerts[0][1]);
    for (let i = 1; i < worldVerts.length; i++) {
      shape.lineTo(worldVerts[i][0], worldVerts[i][1]);
    }
    shape.closePath();

    const groundGeo = new THREE.ShapeGeometry(shape);
    const groundMat = new THREE.MeshStandardMaterial({
      color: COLOR_GROUND,
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid overlay on polygon
    const gridGeo = new THREE.ShapeGeometry(shape);
    const gridMat = new THREE.MeshStandardMaterial({
      color: COLOR_GROUND2,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.01;
    this.scene.add(grid);

    // Polygon boundary line
    const borderPoints = worldVerts.map(([wx, wz]) => new THREE.Vector3(wx, 0.05, wz));
    borderPoints.push(borderPoints[0].clone()); // close the loop
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMat = new THREE.LineBasicMaterial({ color: 0x334455, linewidth: 1 });
    const borderLine = new THREE.Line(borderGeo, borderMat);
    this.scene.add(borderLine);

    // Mountains at each vertex + vertex trees
    this.vertexTrees = [];
    for (let i = 0; i < this.mapVertices.length; i++) {
      const v = this.mapVertices[i];
      // Mountain position: slightly inward from vertex
      const dx = MAP_CENTER_X - v.x;
      const dy = MAP_CENTER_Y - v.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const inset = 80; // push mountain slightly inward
      const mx = v.x + (dx / len) * inset;
      const my = v.y + (dy / len) * inset;

      const [mwx, mwz] = toWorld(mx, my);
      const mountainHeight = 4 + Math.random() * 2;
      const mountain = createMountain(mountainHeight);
      mountain.position.set(mwx, 0, mwz);
      this.scene.add(mountain);

      // Vertex tree on mountain peak (slightly more inward so player can reach)
      const treeInset = 160;
      const treeX = v.x + (dx / len) * treeInset;
      const treeY = v.y + (dy / len) * treeInset;
      const [twx, twz] = toWorld(treeX, treeY);
      const vtree = createVertexTree(mountainHeight * 0.6);
      vtree.position.set(twx, 0, twz);
      this.scene.add(vtree);

      this.vertexTrees.push({
        vertexIndex: i,
        gameX: treeX,
        gameY: treeY,
        mesh: vtree,
        mountainMesh: mountain,
        hasStarPlaced: false,
      });
    }

    // Regular trees (inside polygon, away from center and mountains)
    this.treeMeshes = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      const pt = randomPointInPolygon(this.mapVertices, 100);
      // Skip if too close to center or any mountain
      if (distance(pt.x, pt.y, MAP_CENTER_X, MAP_CENTER_Y) < 100) continue;
      let tooCloseToMountain = false;
      for (const vt of this.vertexTrees) {
        if (distance(pt.x, pt.y, vt.gameX, vt.gameY) < MOUNTAIN_EXCLUSION_RADIUS) {
          tooCloseToMountain = true;
          break;
        }
      }
      if (tooCloseToMountain) continue;

      const [wx, wz] = toWorld(pt.x, pt.y);
      const tree = this.createTree();
      tree.position.set(wx, 0, wz);
      tree.castShadow = true;
      this.scene.add(tree);
      this.treeMeshes.push(tree);
    }

    // Flower shop building
    this.flowerShopGamePos = { x: MAP_CENTER_X + MAP_INSCRIBED_RADIUS * 0.35, y: MAP_CENTER_Y + MAP_INSCRIBED_RADIUS * 0.25 };
    const [fsx, fsz] = toWorld(this.flowerShopGamePos.x, this.flowerShopGamePos.y);
    this.flowerShopMesh = createFlowerShopBuilding();
    this.flowerShopMesh.position.set(fsx, 0, fsz);
    this.scene.add(this.flowerShopMesh);

    // Player
    this.playerGroup = new THREE.Group();
    // Body (glowing sphere)
    const bodyGeo = new THREE.SphereGeometry(0.3, 16, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf5e6c8,
      emissive: COLOR_PLAYER_GLOW,
      emissiveIntensity: 0.5,
      roughness: 0.4,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    this.playerGroup.add(body);
    this.playerBody = body;

    // Flame
    const flameGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff8844,
      emissive: 0xffcc44,
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.9,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.8;
    this.playerGroup.add(flame);
    this.playerFlame = flame;

    // Player point light
    this.playerLight = new THREE.PointLight(COLOR_PLAYER_GLOW, 2, 15);
    this.playerLight.position.y = 0.6;
    this.playerLight.castShadow = true;
    this.playerLight.shadow.mapSize.set(512, 512);
    this.playerGroup.add(this.playerLight);

    // Ambient visibility light (full-moon brightness around player when not cloaked)
    this.playerAmbientLight = new THREE.PointLight(COLOR_MOON, 0, 20);
    this.playerAmbientLight.position.y = 5;
    this.playerGroup.add(this.playerAmbientLight);

    // Glow disc on ground
    const glowGeo = new THREE.CircleGeometry(2, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: COLOR_PLAYER_GLOW,
      transparent: true,
      opacity: 0.08,
    });
    this.playerGlow = new THREE.Mesh(glowGeo, glowMat);
    this.playerGlow.rotation.x = -Math.PI / 2;
    this.playerGlow.position.y = 0.02;
    this.playerGroup.add(this.playerGlow);

    this.scene.add(this.playerGroup);

    // Attack arc (hidden by default)
    const arcGeo = new THREE.RingGeometry(0.5, 0.8, 16, 1, 0, Math.PI * 0.6);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.attackArc = new THREE.Mesh(arcGeo, arcMat);
    this.attackArc.rotation.x = -Math.PI / 2;
    this.attackArc.position.y = 0.3;
    this.playerGroup.add(this.attackArc);
  }

  private createTree(): THREE.Mesh {
    const group = new THREE.Group();
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 1.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: COLOR_TREE_TRUNK, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.6;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage — multiple dark spheres
    const foliageMat = new THREE.MeshStandardMaterial({ color: COLOR_TREE_FOLIAGE, roughness: 0.8 });
    const f1 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), foliageMat);
    f1.position.y = 1.4;
    f1.castShadow = true;
    group.add(f1);
    const f2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), foliageMat);
    f2.position.set(0.2, 1.8, 0.1);
    f2.castShadow = true;
    group.add(f2);

    // Merge into single mesh for performance
    // (keeping as group for simplicity)
    return group as unknown as THREE.Mesh;
  }

  // --- Entity Spawning ---
  private spawnEntities(): void {
    // Fragments
    const fragCount = Math.round(FRAGMENT_SCATTER_COUNT * this.difficulty.fragmentDropRate);
    for (let i = 0; i < fragCount; i++) {
      const pt = randomPointInPolygon(this.mapVertices, 100);
      const frag = createStarFragment(pt.x, pt.y);
      this.fragments.push(frag);
      this.createFragmentMesh(frag);
    }

    // Deposits
    const depCount = Math.round(DEPOSIT_COUNT * this.difficulty.depositFrequency);
    for (let i = 0; i < depCount; i++) {
      const pt = randomPointInPolygon(this.mapVertices, 200);
      const dep = createStarDeposit(pt.x, pt.y);
      this.deposits.push(dep);
      this.createDepositMesh(dep);
    }

    // Enemies
    const speciesList = Object.values(AnimalSpecies);
    const hammerTypes = Object.values(HammerType);
    const enemyCount = Math.round(ENEMY_COUNT * this.difficulty.enemySpawnRate);
    for (let i = 0; i < enemyCount; i++) {
      const pt = randomPointInPolygon(this.mapVertices, 150);
      if (distance(pt.x, pt.y, MAP_CENTER_X, MAP_CENTER_Y) < 300) continue;
      const species = speciesList[i % speciesList.length];
      const hammerType = hammerTypes[Math.min(Math.floor(i / speciesList.length), hammerTypes.length - 1)];
      const patrolPath = [];
      for (let p = 0; p < 4; p++) {
        const pp = randomPointInPolygon(this.mapVertices, 100);
        patrolPath.push({ x: pp.x, y: pp.y });
      }
      const animal = createHammerAnimal(species, hammerType, pt.x, pt.y, patrolPath);
      animal.damage = Math.round(animal.damage * this.difficulty.enemyDamageMultiplier);
      animal.hp = Math.round(animal.hp * this.difficulty.enemyHpMultiplier);
      animal.maxHp = animal.hp;
      this.enemies.push(animal);
      this.createEnemyMesh(animal);
    }

    // NPCs
    const dispositions = [NPCDisposition.FRIENDLY, NPCDisposition.NEUTRAL, NPCDisposition.NEUTRAL, NPCDisposition.HOSTILE];
    for (let i = 0; i < NPC_COUNT; i++) {
      const pt = randomPointInPolygon(this.mapVertices, 250);
      const npc = createNPC(pt.x, pt.y, dispositions[i % dispositions.length]);
      this.npcs.push(npc);
      this.createNPCMesh(npc);
    }

    // Chests (SOLO scattered, COOP scarce, one with NPC requesting help)
    for (let i = 0; i < SOLO_CHEST_COUNT; i++) {
      const pt = randomPointInPolygon(this.mapVertices, 150);
      const chest = createChest(pt.x, pt.y, ChestType.SOLO);
      this.chests.push(chest);
      this.createChestMeshOnMap(chest);
    }
    for (let i = 0; i < COOP_CHEST_COUNT; i++) {
      const pt = randomPointInPolygon(this.mapVertices, 200);
      // First COOP chest gets a requesting NPC nearby
      let chest;
      if (i === 0 && this.npcs.length > 0) {
        // Pick a friendly NPC to be the requester
        const requester = this.npcs.find(n => n.disposition === NPCDisposition.FRIENDLY) || this.npcs[0];
        requester.x = pt.x + 30;
        requester.y = pt.y + 30;
        requester.currentAction = NPCAction.REQUESTING_HELP;
        chest = createChest(pt.x, pt.y, ChestType.COOP, requester.id);
      } else {
        chest = createChest(pt.x, pt.y, ChestType.COOP);
      }
      this.chests.push(chest);
      this.createChestMeshOnMap(chest);
    }
  }

  private createChestMeshOnMap(chest: ChestData): void {
    const mesh = createChestMesh(chest.type);
    const [wx, wz] = toWorld(chest.x, chest.y);
    mesh.position.set(wx, 0, wz);
    this.scene.add(mesh);
    this.chestMeshes.set(chest.id, mesh);
  }

  private createFragmentMesh(frag: StarFragmentData): void {
    const geo = new THREE.OctahedronGeometry(0.12, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: COLOR_FRAGMENT,
      emissive: 0xffffaa,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const [wx, wz] = toWorld(frag.x, frag.y);
    mesh.position.set(wx, 0.25, wz);
    this.scene.add(mesh);
    this.fragmentMeshes.set(frag.id, mesh);
  }

  private createDepositMesh(dep: StarDepositData): void {
    const geo = new THREE.BoxGeometry(0.8, 0.4, 0.6);
    const mat = new THREE.MeshStandardMaterial({
      color: COLOR_DEPOSIT,
      roughness: 0.85,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const [wx, wz] = toWorld(dep.x, dep.y);
    mesh.position.set(wx, 0.2, wz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.depositMeshes.set(dep.id, mesh);
  }

  private createEnemyMesh(animal: HammerAnimalData): void {
    const s = ENEMY_SIZES[animal.species];
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.3 * s, 8, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: ENEMY_COLORS[animal.species],
      roughness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.3 * s;
    body.castShadow = true;
    group.add(body);

    // Hammer head
    const hammerGeo = new THREE.BoxGeometry(0.3 * s, 0.15 * s, 0.2 * s);
    const hammerMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
    const hammer = new THREE.Mesh(hammerGeo, hammerMat);
    hammer.position.set(0, 0.5 * s, -0.25 * s);
    hammer.castShadow = true;
    group.add(hammer);

    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3 * s, 4);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x664422 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 0.35 * s, -0.15 * s);
    group.add(handle);

    // Eyes (red)
    const eyeGeo = new THREE.SphereGeometry(0.04 * s, 6, 4);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.5 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.12 * s, 0.35 * s, 0.2 * s);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.12 * s, 0.35 * s, 0.2 * s);
    group.add(eyeR);

    const [wx, wz] = toWorld(animal.x, animal.y);
    group.position.set(wx, 0, wz);
    this.scene.add(group);
    this.enemyMeshes.set(animal.id, group);
  }

  private createNPCMesh(npc: NPCData): void {
    const group = new THREE.Group();
    const bodyGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLOR_NPC,
      roughness: 0.6,
      emissive: 0xffaa44,
      emissiveIntensity: 0.15,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.3;
    body.castShadow = true;
    group.add(body);

    // Small candle light
    const light = new THREE.PointLight(0xffaa44, 0.5, 5);
    light.position.y = 0.5;
    group.add(light);

    const [wx, wz] = toWorld(npc.x, npc.y);
    group.position.set(wx, 0, wz);
    this.scene.add(group);
    this.npcMeshes.set(npc.id, group);
  }

  // --- Input ---
  private setupInput(): void {
    const GAME_KEYS = new Set(['w','a','s','d','q','e','z',' ','1','2','3','4',
      'arrowup','arrowdown','arrowleft','arrowright']);

    window.addEventListener('keydown', (e) => {
      if (this.inputBlocked) return;
      const key = e.key.toLowerCase();
      if (GAME_KEYS.has(key)) e.preventDefault();
      if (!this.keys.has(key)) this.keyDownThisFrame.add(key);
      this.keys.add(key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    // Keep focus on canvas during gameplay — prevents buttons/UI from stealing keyboard input
    const canvas = document.getElementById('game-canvas')!;
    document.addEventListener('click', () => {
      if (this.state === 'playing') {
        canvas.focus();
      }
    });

    // Game over restart
    document.getElementById('gameover-restart')!.addEventListener('click', () => {
      document.getElementById('gameover-screen')!.classList.remove('open');
      this.showTitleMain();
      this.state = 'title';
    });
  }

  // --- Game Loop ---
  private animate = (): void => {
    if (this.state !== 'playing' && this.state !== 'ending') return;
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.state === 'ending') {
      this.updateEnding(dt);
    } else {
      this.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
    this.keyDownThisFrame.clear();
  };

  private update(dt: number): void {
    if (!this.playerState.isAlive) return;

    // Handle inventory toggle
    if (this.keyDownThisFrame.has('e')) {
      this.inventoryOpen = !this.inventoryOpen;
      this.updateInventoryUI();
    }

    if (this.inventoryOpen) {
      this.handleInventoryKeys();
      return;
    }

    if (this.flowerShopOpen) {
      this.handleFlowerShopKeys();
      return;
    }

    // Movement
    this.handleMovement(dt);

    // Light fuel
    LightSystem.consumeFuel(this.playerState.lightSource, dt);

    // HP regen
    CombatSystem.naturalRegen(this.playerState, HP_REGEN_RATE, dt);

    // Fragment pickup
    this.checkFragmentPickup();

    // Chest opening (must come before mining; both use Z key)
    this.handleChestOpening(dt);

    // Mining
    this.handleMining(dt);

    // NPC interaction
    this.handleNPCInteraction(dt);

    // Vertex tree interaction (star placement)
    this.handleVertexTreeInteraction();

    // Flower shop interaction
    this.handleFlowerShopInteraction();

    // Victory check
    if (this.allStarsPlaced) {
      const dist = distance(this.playerState.x, this.playerState.y, MAP_CENTER_X, MAP_CENTER_Y);
      if (dist < VICTORY_TRIGGER_RADIUS) {
        this.triggerVictoryEnding();
        return;
      }
    }

    // Enemy AI
    this.updateEnemies(dt);

    // Hammer transformation check
    if (CooperationSystem.checkHammerTransformation(this.playerState.hammerScore, this.playerState.lightScore)) {
      this.playerState.isAlive = false;
      this.showMessage('망치 점수가 너무 높아 망치동물이 되었습니다...');
      setTimeout(() => this.gameOver('hammer'), 2500);
      return;
    }

    // Cloak toggle
    if (this.keyDownThisFrame.has('q')) {
      LightSystem.toggleCloak(this.playerState.lightSource);
      this.showMessage(this.playerState.lightSource.isCloaked ? '망토를 덮었습니다 (적에게 안 보임)' : '망토를 벗었습니다');
    }

    // Attack
    if (this.keyDownThisFrame.has(' ')) {
      this.playerAttack();
    }

    // Update visuals
    this.updateVisuals(dt);
    this.updateHUD();

    // Message timer
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        document.getElementById('message-text')!.style.opacity = '0';
      }
    }

    // Floating damage texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.mesh.position.y += ft.vy * dt;
      ft.life -= dt;
      (ft.mesh.material as THREE.SpriteMaterial).opacity = Math.max(0, ft.life / 0.8);
      if (ft.life <= 0) {
        this.scene.remove(ft.mesh);
        ft.mesh.material.dispose();
        this.floatingTexts.splice(i, 1);
      }
    }

    // Attack arc fade
    if (this.attackArcTimer > 0) {
      this.attackArcTimer -= dt;
      (this.attackArc.material as THREE.MeshBasicMaterial).opacity = Math.max(0, this.attackArcTimer / 0.25);
    }

    // Respawn check (every ~3 seconds via elapsed time)
    this.respawnTimer = (this.respawnTimer ?? 0) + dt;
    if (this.respawnTimer >= 3) {
      this.respawnTimer = 0;
      this.checkRespawns();
    }
  }

  // --- Movement ---
  private handleMovement(dt: number): void {
    let vx = 0, vz = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) vx = -1;
    if (this.keys.has('d') || this.keys.has('arrowright')) vx = 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) vz = -1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) vz = 1;

    if (vx !== 0 && vz !== 0) { vx *= 0.707; vz *= 0.707; }

    const speed = this.playerState.speed * dt;
    this.playerState.x += vx * speed;
    this.playerState.y += vz * speed;

    // Clamp to polygon bounds
    if (!isInsidePolygon(this.playerState.x, this.playerState.y, this.mapVertices)) {
      const clamped = clampToPolygon(this.playerState.x, this.playerState.y, this.mapVertices, 15);
      this.playerState.x = clamped.x;
      this.playerState.y = clamped.y;
    }

    // Update 3D position
    const [wx, wz] = toWorld(this.playerState.x, this.playerState.y);
    this.playerGroup.position.set(wx, 0, wz);

    // Camera follow
    this.camera.position.x = wx + 30;
    this.camera.position.z = wz + 30;
    this.camera.lookAt(wx, 0, wz);
  }

  // --- Fragment Pickup ---
  private checkFragmentPickup(): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      const dist = distance(this.playerState.x, this.playerState.y, frag.x, frag.y);
      if (dist < PICKUP_RANGE) {
        // Evil players have a chance to lose fragments to the darkness
        const vanishChance = AlignmentSystem.getFragmentVanishChance(this.playerState);
        if (vanishChance > 0 && Math.random() < vanishChance) {
          this.fragments.splice(i, 1);
          const mesh = this.fragmentMeshes.get(frag.id);
          if (mesh) { this.scene.remove(mesh); this.fragmentMeshes.delete(frag.id); }
          this.showMessage('악의 기운이 별조각을 삼켰습니다...');
          continue;
        }

        if (addFragment(this.inventory, frag)) {
          this.fragments.splice(i, 1);
          const mesh = this.fragmentMeshes.get(frag.id);
          if (mesh) { this.scene.remove(mesh); this.fragmentMeshes.delete(frag.id); }

          const xp = MergeSystem.getXpValue(frag);
          const newLight = ProgressionSystem.addXp(this.playerState, xp);
          if (newLight) this.showMessage(`레벨 업! ${newLight}로 업그레이드`);
          LightSystem.refuelFromFragment(this.playerState.lightSource, 5);
        }
      }
    }
  }

  // --- Mining ---
  private handleMining(dt: number): void {
    // Skip mining if near a vertex tree (Z is used for star placement there)
    if (this.isNearVertexTree()) return;
    // Skip mining if currently opening a chest
    if (this.currentOpeningChest) return;
    // Skip mining if near any chest (chest takes priority for Z key)
    if (this.isNearChest()) return;

    if (this.keys.has('z')) {
      if (!this.currentMiningDeposit) {
        for (const dep of this.deposits) {
          if (dep.isDepleted) continue;
          if (distance(this.playerState.x, this.playerState.y, dep.x, dep.y) < MINING_RANGE) {
            this.currentMiningDeposit = dep;
            dep.isBeingMined = true;
            if (!dep.minerIds.includes('player')) dep.minerIds.push('player');
            break;
          }
        }
      }
      if (this.currentMiningDeposit) {
        const minedFragments = MiningSystem.advanceMining(this.currentMiningDeposit, dt);
        this.showMiningBar(this.currentMiningDeposit.currentMiningProgress, this.currentMiningDeposit.miningTimeRequired);

        if (minedFragments.length > 0) {
          for (const frag of minedFragments) {
            frag.x = this.currentMiningDeposit.x + (Math.random() - 0.5) * 60;
            frag.y = this.currentMiningDeposit.y + (Math.random() - 0.5) * 60;
            this.fragments.push(frag);
            this.createFragmentMesh(frag);
          }
          this.showMessage(`별조각 ${minedFragments.length}개 발견!`);
          this.hideMiningBar();
          this.currentMiningDeposit = null;
        }
      }
    } else if (this.currentMiningDeposit) {
      this.currentMiningDeposit.isBeingMined = false;
      const idx = this.currentMiningDeposit.minerIds.indexOf('player');
      if (idx !== -1) this.currentMiningDeposit.minerIds.splice(idx, 1);
      this.currentMiningDeposit = null;
      this.hideMiningBar();
    }
  }

  // --- Combat ---
  private playerAttack(): void {
    const stick = this.inventory.starSticks.length > 0 ? this.inventory.starSticks[0] : null;
    const baseDamage = stick ? stick.damage : 1 + Math.floor(Math.random() * 2);

    // Show attack arc
    this.attackArcTimer = 0.25;
    (this.attackArc.material as THREE.MeshBasicMaterial).opacity = 0.8;

    let nearestEnemy: HammerAnimalData | null = null;
    let nearestDist = Infinity;
    for (const enemy of this.enemies) {
      const d = distance(this.playerState.x, this.playerState.y, enemy.x, enemy.y);
      if (d < ATTACK_RANGE && d < nearestDist) { nearestDist = d; nearestEnemy = enemy; }
    }

    // Also consider NPCs as attack targets (priority by distance)
    let nearestNpc: NPCData | null = null;
    for (const n of this.npcs) {
      const d = distance(this.playerState.x, this.playerState.y, n.x, n.y);
      if (d < ATTACK_RANGE && d < nearestDist) { nearestDist = d; nearestNpc = n; nearestEnemy = null; }
    }

    if (nearestNpc) {
      const damage = baseDamage;
      nearestNpc.hp -= damage;
      const npcGroup = this.npcMeshes.get(nearestNpc.id);
      if (npcGroup) {
        this.flashMesh(npcGroup, 0xff4444, 200);
        this.spawnDamageNumber(npcGroup.position, damage, 0xff4444);
      }
      if (nearestNpc.hp <= 0) {
        const idx = this.npcs.indexOf(nearestNpc);
        if (idx !== -1) this.npcs.splice(idx, 1);
        if (npcGroup) { this.scene.remove(npcGroup); this.npcMeshes.delete(nearestNpc.id); }
        AlignmentSystem.addEvilness(this.playerState, 1);
        for (const other of this.npcs) other.trustOfPlayer -= 20;
        this.showMessage('NPC를 처치했습니다 (악 +1)');
      }
      return;
    }

    if (nearestEnemy) {
      let damage: number;
      let stickBroken = false;
      if (stick) {
        const result = CombatSystem.playerAttackEnemy(stick, nearestEnemy);
        damage = result.damage;
        stickBroken = result.stickBroken;
      } else {
        damage = baseDamage;
        nearestEnemy.hp -= damage;
      }

      // Visual: enemy flash + floating damage
      const enemyGroup = this.enemyMeshes.get(nearestEnemy.id);
      if (enemyGroup) {
        this.flashMesh(enemyGroup, 0xffffff, 200);
        this.spawnDamageNumber(enemyGroup.position, damage, 0xffff44);
      }

      if (nearestEnemy.hp <= 0) {
        const idx = this.enemies.indexOf(nearestEnemy);
        if (idx !== -1) this.enemies.splice(idx, 1);
        if (enemyGroup) { this.scene.remove(enemyGroup); this.enemyMeshes.delete(nearestEnemy.id); }

        const dropCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < dropCount; i++) {
          const frag = createStarFragment(
            nearestEnemy.x + (Math.random() - 0.5) * 40,
            nearestEnemy.y + (Math.random() - 0.5) * 40,
          );
          this.fragments.push(frag);
          this.createFragmentMesh(frag);
        }
        AlignmentSystem.addGoodness(this.playerState, 0.5);
        this.showMessage('망치동물 처치!');
      }

      if (stickBroken) {
        this.inventory.starSticks.splice(0, 1);
        this.showMessage('별 막대기가 부서졌습니다!');
      }
    } else {
      this.showMessage('공격 범위에 대상이 없습니다');
    }
  }

  // --- Enemy Update ---
  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      const result = AISystem.updateAnimal(enemy, this.playerState, dt);

      if (result.shouldAttack) {
        const combat = CombatSystem.enemyAttackPlayer(enemy, this.playerState, this.difficulty.enemyDamageMultiplier);
        this.showMessage(`${enemy.species} 공격! -${combat.damage} HP`);

        // Player hit flash + damage number
        this.flashMesh(this.playerGroup, 0xff2222, 200);
        this.spawnDamageNumber(this.playerGroup.position, combat.damage, 0xff4444);

        // Enemy attack visual
        const eg = this.enemyMeshes.get(enemy.id);
        if (eg) this.flashMesh(eg, 0xff4444, 150);

        if (combat.playerDead) {
          this.playerState.isAlive = false;
          this.showMessage('불이 꺼졌습니다...');
          setTimeout(() => this.gameOver('death'), 2500);
          return;
        }
      }

      // Update enemy 3D position
      const eg = this.enemyMeshes.get(enemy.id);
      if (eg) {
        const [wx, wz] = toWorld(enemy.x, enemy.y);
        eg.position.set(wx, 0, wz);

        // Tint by state
        const body = eg.children[0] as THREE.Mesh;
        const mat = body.material as THREE.MeshStandardMaterial;
        switch (enemy.state) {
          case AnimalState.ALERT:
            mat.emissive.setHex(0xffff44);
            mat.emissiveIntensity = 0.3;
            break;
          case AnimalState.CHARGING:
            mat.emissive.setHex(0xff6644);
            mat.emissiveIntensity = 0.4;
            break;
          case AnimalState.ATTACKING:
            mat.emissive.setHex(0xff2222);
            mat.emissiveIntensity = 0.5;
            break;
          default:
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
        }
      }
    }
  }

  // --- NPC ---
  private handleNPCInteraction(dt: number): void {
    const playerLightRadius = LightSystem.getDetectionRadius(this.playerState.lightSource);
    const playerLightOn = playerLightRadius > 0 && !this.playerState.lightSource.isCloaked;

    for (const npc of this.npcs) {
      const dist = distance(this.playerState.x, this.playerState.y, npc.x, npc.y);

      // Drawn to light: NPC sees player's light when not cloaked, walks toward it (or COOP chest)
      if (playerLightOn && dist < playerLightRadius * 1.2 &&
          (npc.currentAction === NPCAction.IDLE || npc.currentAction === NPCAction.FLEEING)) {
        npc.currentAction = NPCAction.DRAWN_TO_LIGHT;
        // If player is opening a COOP chest, target the chest instead
        if (this.currentOpeningChest && this.currentOpeningChest.type === ChestType.COOP) {
          npc.drawTargetX = this.currentOpeningChest.x;
          npc.drawTargetY = this.currentOpeningChest.y;
        } else {
          npc.drawTargetX = this.playerState.x;
          npc.drawTargetY = this.playerState.y;
        }
      }

      if (npc.currentAction === NPCAction.DRAWN_TO_LIGHT) {
        // Update target if player switches to opening a COOP chest
        if (this.currentOpeningChest && this.currentOpeningChest.type === ChestType.COOP) {
          npc.drawTargetX = this.currentOpeningChest.x;
          npc.drawTargetY = this.currentOpeningChest.y;
        }
        if (npc.drawTargetX !== undefined && npc.drawTargetY !== undefined) {
          AISystem.moveNpcToward(npc, npc.drawTargetX, npc.drawTargetY, 30, dt);
        }
        // Reach a COOP chest → join opening
        if (this.currentOpeningChest && this.currentOpeningChest.type === ChestType.COOP) {
          const dToChest = distance(npc.x, npc.y, this.currentOpeningChest.x, this.currentOpeningChest.y);
          if (dToChest < CHEST_RANGE) {
            npc.currentAction = NPCAction.OPENING_CHEST;
            npc.targetChestId = this.currentOpeningChest.id;
            if (!this.currentOpeningChest.openerIds.includes(npc.id)) {
              this.currentOpeningChest.openerIds.push(npc.id);
            }
          }
        }
        // Light goes off → return to idle
        if (!playerLightOn) {
          npc.currentAction = NPCAction.IDLE;
        }
      } else if (npc.currentAction === NPCAction.OPENING_CHEST) {
        const chest = this.chests.find(c => c.id === npc.targetChestId);
        if (!chest || chest.state === ChestState.OPENED) {
          npc.currentAction = NPCAction.IDLE;
          npc.targetChestId = null;
        }
      } else if (npc.currentAction === NPCAction.REQUESTING_HELP) {
        // Stay near requested chest, slight idle wander
        if (Math.random() < 0.005) {
          npc.x += (Math.random() - 0.5) * 10;
          npc.y += (Math.random() - 0.5) * 10;
        }
        if (dist < CHEST_RANGE * 1.5 && this.messageTimer <= 0) {
          this.showMessage('NPC가 상자 여는 것을 도와달라고 합니다');
        }
      } else if (npc.currentAction === NPCAction.IDLE && Math.random() < 0.005) {
        const newX = npc.x + (Math.random() - 0.5) * 40;
        const newY = npc.y + (Math.random() - 0.5) * 40;
        if (isInsidePolygon(newX, newY, this.mapVertices)) {
          npc.x = newX;
          npc.y = newY;
        }
      } else if (npc.currentAction === NPCAction.FLEEING) {
        const dx = npc.x - this.playerState.x;
        const dy = npc.y - this.playerState.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        npc.x += (dx / d) * 2;
        npc.y += (dy / d) * 2;
        if (dist > 200) npc.currentAction = NPCAction.IDLE;
      }

      if (dist < 60 && this.currentMiningDeposit && npc.currentAction === NPCAction.IDLE && npc.trustOfPlayer > -10) {
        const action = CooperationSystem.decideNPCAction(npc.trustOfPlayer);
        if (action === 'cooperate' && !this.currentMiningDeposit.minerIds.includes(npc.id)) {
          this.currentMiningDeposit.minerIds.push(npc.id);
          npc.currentAction = NPCAction.COOPERATING;
          npc.trustOfPlayer += 5;
          this.playerState.lightScore += 2;
          this.showMessage('NPC가 채굴을 돕습니다! 빛점수 +2');
        }
      }

      if (npc.currentAction === NPCAction.COOPERATING && (!this.currentMiningDeposit || this.currentMiningDeposit.isDepleted)) {
        npc.currentAction = NPCAction.IDLE;
      }

      // Update NPC mesh position
      const mesh = this.npcMeshes.get(npc.id);
      if (mesh) {
        const [wx, wz] = toWorld(npc.x, npc.y);
        mesh.position.set(wx, 0, wz);
      }
    }
  }

  // --- Chest Opening ---
  private isNearChest(): boolean {
    for (const c of this.chests) {
      if (c.state === ChestState.OPENED) continue;
      if (distance(this.playerState.x, this.playerState.y, c.x, c.y) < CHEST_RANGE) return true;
    }
    return false;
  }

  private handleChestOpening(dt: number): void {
    if (this.isNearVertexTree()) return;

    if (!this.keys.has('z')) {
      // Released Z → cancel
      if (this.currentOpeningChest) {
        const idx = this.currentOpeningChest.openerIds.indexOf('player');
        if (idx !== -1) this.currentOpeningChest.openerIds.splice(idx, 1);
        this.currentOpeningChest = null;
        this.hideMiningBar();
      }
      return;
    }

    // Find chest in range to start opening
    if (!this.currentOpeningChest) {
      for (const c of this.chests) {
        if (c.state === ChestState.OPENED) continue;
        if (distance(this.playerState.x, this.playerState.y, c.x, c.y) >= CHEST_RANGE) continue;

        // COOP chests require cloak off + light on
        if (c.type === ChestType.COOP) {
          if (this.playerState.lightSource.isCloaked) {
            if (this.messageTimer <= 0) this.showMessage('망토를 벗어야 협력 상자를 열 수 있습니다');
            return;
          }
          if (!this.playerState.lightSource.isOn || this.playerState.lightSource.fuel <= 0) {
            if (this.messageTimer <= 0) this.showMessage('빛이 꺼져 있어 NPC를 부를 수 없습니다');
            return;
          }
        }

        this.currentOpeningChest = c;
        if (!c.openerIds.includes('player')) c.openerIds.push('player');
        break;
      }
    }

    if (!this.currentOpeningChest) return;
    const chest = this.currentOpeningChest;

    // COOP: opening canceled if cloak goes on or light goes out mid-progress
    if (chest.type === ChestType.COOP &&
        (this.playerState.lightSource.isCloaked || !this.playerState.lightSource.isOn || this.playerState.lightSource.fuel <= 0)) {
      this.showMessage('망토를 벗어야 합니다 (협력 중단)');
      const idx = chest.openerIds.indexOf('player');
      if (idx !== -1) chest.openerIds.splice(idx, 1);
      this.currentOpeningChest = null;
      this.hideMiningBar();
      return;
    }

    const result = ChestSystem.advance(chest, dt, chest.openerIds.length);
    this.showMiningBar(chest.currentOpenProgress, chest.openTimeRequired);

    if (result === 'opened') {
      const initiator = chest.requesterNpcId ? 'npc' : 'player';
      this.distributeChestReward(chest, initiator);
      this.removeChest(chest);
      this.currentOpeningChest = null;
      this.hideMiningBar();
    } else if (result === 'blocked') {
      // Waiting for NPC to arrive — keep bar visible but no progress
      if (this.messageTimer <= 0 && chest.type === ChestType.COOP) {
        this.showMessage('NPC를 기다리는 중...');
      }
    }
  }

  private distributeChestReward(chest: ChestData, initiator: 'player' | 'npc'): void {
    const mul = AlignmentSystem.getChestRewardMultiplier(this.playerState);
    const { raw, merged } = ChestSystem.rollRewards(chest, mul);

    const isNpcOwned = (initiator === 'npc');
    const playerShare = isNpcOwned
      ? Math.min(1, 0.3 + AlignmentSystem.getHelperShareBonus(this.playerState))
      : 1.0;

    const playerRaw = Math.round(raw * playerShare);
    const playerMerged = Math.round(merged * playerShare);

    // Spawn player's share as fragments at chest position (auto-pickup)
    for (let i = 0; i < playerRaw; i++) {
      const frag = createStarFragment(chest.x + (Math.random() - 0.5) * 40, chest.y + (Math.random() - 0.5) * 40, FragmentTier.RAW);
      this.fragments.push(frag);
      this.createFragmentMesh(frag);
    }
    for (let i = 0; i < playerMerged; i++) {
      const frag = createStarFragment(chest.x + (Math.random() - 0.5) * 40, chest.y + (Math.random() - 0.5) * 40, FragmentTier.MERGED);
      this.fragments.push(frag);
      this.createFragmentMesh(frag);
    }

    // Distribute remaining to participating NPCs (added to their inventory)
    const remainingRaw = raw - playerRaw;
    const remainingMerged = merged - playerMerged;
    const participatingNpcIds = chest.openerIds.filter(id => id !== 'player');
    if (participatingNpcIds.length > 0) {
      const perRaw = Math.floor(remainingRaw / participatingNpcIds.length);
      const perMerged = Math.floor(remainingMerged / participatingNpcIds.length);
      for (const id of participatingNpcIds) {
        const npc = this.npcs.find(n => n.id === id);
        if (!npc) continue;
        const pouch = npc.inventory.pouches[npc.inventory.activePouchIndex];
        for (let i = 0; i < perRaw && pouch.fragments.length < pouch.capacity; i++) {
          pouch.fragments.push(createStarFragment(npc.x, npc.y, FragmentTier.RAW));
        }
        for (let i = 0; i < perMerged && pouch.fragments.length < pouch.capacity; i++) {
          pouch.fragments.push(createStarFragment(npc.x, npc.y, FragmentTier.MERGED));
        }
        npc.currentAction = NPCAction.IDLE;
        npc.targetChestId = null;
        npc.trustOfPlayer += 5;
      }
    }

    if (isNpcOwned) {
      AlignmentSystem.addGoodness(this.playerState, 1);
      this.showMessage(`상자 열기 완료! ★${playerRaw} ✦${playerMerged} (선 +1)`);
    } else {
      this.showMessage(`상자 열기 완료! ★${playerRaw} ✦${playerMerged}`);
    }
  }

  private removeChest(chest: ChestData): void {
    const idx = this.chests.indexOf(chest);
    if (idx !== -1) this.chests.splice(idx, 1);
    const mesh = this.chestMeshes.get(chest.id);
    if (mesh) {
      this.scene.remove(mesh);
      this.chestMeshes.delete(chest.id);
    }
  }

  // --- Visual Updates ---
  private updateVisuals(dt: number): void {
    const ls = this.playerState.lightSource;
    const visual = LIGHT_VISUAL_BY_TYPE[ls.type];

    // Body scale by light source level
    this.playerBody.scale.setScalar(visual.bodyScale);

    // Player light intensity
    if (ls.isOn && !ls.isCloaked && ls.fuel > 0) {
      const effectiveRange = LightSystem.getEffectiveRange(ls, this.difficulty.moonBrightness);
      this.playerLight.intensity = ls.brightness * 3;
      this.playerLight.distance = effectiveRange * WORLD_SCALE * 3;
      this.playerGlow.scale.set(effectiveRange * WORLD_SCALE * 0.5, effectiveRange * WORLD_SCALE * 0.5, 1);
      (this.playerGlow.material as THREE.MeshBasicMaterial).opacity = 0.08;
    } else {
      this.playerLight.intensity = 0.1;
      this.playerLight.distance = 3;
      this.playerGlow.scale.set(1, 1, 1);
      (this.playerGlow.material as THREE.MeshBasicMaterial).opacity = 0.02;
    }

    // Player ambient visibility light (simulates full-moon brightness, scaled by level)
    if (ls.isOn && !ls.isCloaked && ls.fuel > 0) {
      const fullMoonMb = 0.8;
      const boost = Math.max(0, fullMoonMb - this.difficulty.moonBrightness);
      this.playerAmbientLight.intensity = boost * 2.5 * visual.rangeMul;
      this.playerAmbientLight.distance = ls.range * visual.rangeMul * WORLD_SCALE * 3;
    } else {
      this.playerAmbientLight.intensity = 0;
    }

    // Dim player when cloaked
    const bmat = this.playerBody.material as THREE.MeshStandardMaterial;
    bmat.emissiveIntensity = ls.isCloaked ? 0.1 : 0.5;

    // Flame flicker (multiplied by body scale to keep proportional)
    const flameBase = visual.bodyScale;
    if (ls.fuel < ls.maxFuel * 0.2 && ls.isOn) {
      this.playerFlame.scale.setScalar((0.7 + Math.random() * 0.6) * flameBase);
    } else if (ls.isCloaked) {
      this.playerFlame.scale.setScalar(0.3 * flameBase);
    } else {
      this.playerFlame.scale.setScalar(flameBase);
    }
    // Move flame closer to body proportionally
    this.playerFlame.position.y = 0.4 + 0.4 * flameBase;

    // Fragment bobbing animation
    const time = this.clock.elapsedTime;
    for (const [, mesh] of this.fragmentMeshes) {
      mesh.position.y = 0.25 + Math.sin(time * 3 + mesh.position.x * 5) * 0.05;
      mesh.rotation.y += dt * 2;
    }
  }

  // --- HUD ---
  private updateHUD(): void {
    const hp = this.playerState.hp / this.playerState.maxHp * 100;
    const fuel = this.playerState.lightSource.fuel / this.playerState.lightSource.maxFuel * 100;
    document.getElementById('hp-bar')!.style.width = `${hp}%`;
    document.getElementById('fuel-bar')!.style.width = `${fuel}%`;

    const pouch = getActivePouch(this.inventory);
    const align = this.playerState.evilness > 0
      ? `<span style="color:#ff6644">악 ${'●'.repeat(this.playerState.evilness)}</span>`
      : `<span style="color:#ffcc44">선 ${'◆'.repeat(Math.max(1, this.playerState.goodness))}</span>`;
    document.getElementById('status-text')!.innerHTML =
      `Lv.${this.playerState.level} | XP:${this.playerState.xp}<br>` +
      `★ ${pouch.fragments.length} | ⚔ ${this.inventory.starSticks.length}<br>` +
      `빛:${this.playerState.lightScore} 망치:${this.playerState.hammerScore}<br>` +
      align;
  }

  // --- Inventory UI ---
  private updateInventoryUI(): void {
    const panel = document.getElementById('inventory-panel')!;
    if (!this.inventoryOpen) {
      panel.classList.remove('open');
      return;
    }
    panel.classList.add('open');

    const pouch = getActivePouch(this.inventory);
    document.getElementById('inv-title')!.textContent = `별 주머니 (${pouch.fragments.length}/${pouch.capacity})`;

    // Grid
    const grid = document.getElementById('inv-grid')!;
    grid.innerHTML = '';
    const tierSymbols: Record<string, string> = { raw: '★', merged: '✦', super_merged: '✧' };
    const tierColors: Record<string, string> = { raw: '#ffffaa', merged: '#ffaa44', super_merged: '#ff44ff' };
    for (let i = 0; i < pouch.capacity; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      if (i < pouch.fragments.length) {
        const f = pouch.fragments[i];
        slot.textContent = tierSymbols[f.tier] || '★';
        slot.style.color = tierColors[f.tier] || '#fff';
      }
      grid.appendChild(slot);
    }

    // Counts
    const rawCount = pouch.fragments.filter(f => f.tier === FragmentTier.RAW).length;
    const mergedCount = pouch.fragments.filter(f => f.tier === FragmentTier.MERGED).length;
    const superCount = pouch.fragments.filter(f => f.tier === FragmentTier.SUPER_MERGED).length;
    document.getElementById('inv-counts')!.textContent = `★ ${rawCount}  ✦ ${mergedCount}  ✧ ${superCount}`;

    // Actions
    const actions = document.getElementById('inv-actions')!;
    actions.innerHTML = '';
    const buttons = [
      { key: '1', label: `합치기 (★×${MERGE_COUNT}→✦)`, enabled: rawCount >= MERGE_COUNT, action: () => this.invMergeRaw() },
      { key: '2', label: `별막대기 제작 (★×${STICK_CRAFT_COUNT})`, enabled: rawCount >= STICK_CRAFT_COUNT, action: () => this.invCraftStick() },
      { key: '3', label: `조각→XP (★×1 = 10XP)`, enabled: rawCount >= 1, action: () => this.invUseXP() },
      { key: '4', label: `조각→HP (★×1 = +10HP)`, enabled: rawCount >= 1, action: () => this.invUseHP() },
    ];
    for (const btn of buttons) {
      const el = document.createElement('button');
      el.textContent = `[${btn.key}] ${btn.label}`;
      el.disabled = !btn.enabled;
      el.addEventListener('click', () => { btn.action(); this.updateInventoryUI(); });
      actions.appendChild(el);
    }

    // Star sticks
    const sticksEl = document.getElementById('inv-sticks')!;
    if (this.inventory.starSticks.length > 0) {
      sticksEl.textContent = '별 막대기: ' + this.inventory.starSticks.map(s => `⚔${s.tier}(${s.durability}/${s.maxDurability})`).join(' ');
    } else {
      sticksEl.textContent = '';
    }
  }

  private handleInventoryKeys(): void {
    if (this.keyDownThisFrame.has('1')) { this.invMergeRaw(); this.updateInventoryUI(); }
    if (this.keyDownThisFrame.has('2')) { this.invCraftStick(); this.updateInventoryUI(); }
    if (this.keyDownThisFrame.has('3')) { this.invUseXP(); this.updateInventoryUI(); }
    if (this.keyDownThisFrame.has('4')) { this.invUseHP(); this.updateInventoryUI(); }
  }

  private invMergeRaw(): void {
    const pouch = getActivePouch(this.inventory);
    const raw = pouch.fragments.filter(f => f.tier === FragmentTier.RAW);
    if (raw.length < MERGE_COUNT) return;
    const toMerge = raw.slice(0, MERGE_COUNT);
    const result = MergeSystem.mergeFragments(toMerge);
    if (!result) return;
    for (const f of toMerge) { const i = pouch.fragments.indexOf(f); if (i !== -1) pouch.fragments.splice(i, 1); }
    pouch.fragments.push(result);
    this.showMessage('합치기 완료!');
  }

  private invCraftStick(): void {
    const pouch = getActivePouch(this.inventory);
    const raw = pouch.fragments.filter(f => f.tier === FragmentTier.RAW);
    if (raw.length < STICK_CRAFT_COUNT) return;
    const toUse = raw.slice(0, STICK_CRAFT_COUNT);
    const stick = MergeSystem.craftStarStick(toUse);
    if (!stick) return;
    for (const f of toUse) { const i = pouch.fragments.indexOf(f); if (i !== -1) pouch.fragments.splice(i, 1); }
    this.inventory.starSticks.push(stick);
    this.showMessage('별 막대기 제작 완료!');
  }

  private invUseXP(): void {
    const pouch = getActivePouch(this.inventory);
    const raw = pouch.fragments.find(f => f.tier === FragmentTier.RAW);
    if (!raw) return;
    const i = pouch.fragments.indexOf(raw);
    if (i !== -1) pouch.fragments.splice(i, 1);
    const xp = MergeSystem.getXpValue(raw);
    const newLight = ProgressionSystem.addXp(this.playerState, xp);
    this.showMessage(newLight ? `+${xp}XP! 레벨 업! ${newLight}로 업그레이드` : `+${xp}XP`);
  }

  private invUseHP(): void {
    const pouch = getActivePouch(this.inventory);
    const raw = pouch.fragments.find(f => f.tier === FragmentTier.RAW);
    if (!raw) return;
    const i = pouch.fragments.indexOf(raw);
    if (i !== -1) pouch.fragments.splice(i, 1);
    CombatSystem.healPlayer(this.playerState, 10);
    this.showMessage('+10 HP 회복');
  }

  // --- Vertex Tree Interaction ---
  private isNearVertexTree(): boolean {
    for (const vt of this.vertexTrees) {
      if (!vt.hasStarPlaced && distance(this.playerState.x, this.playerState.y, vt.gameX, vt.gameY) < VERTEX_TREE_INTERACTION_RANGE) {
        return true;
      }
    }
    return false;
  }

  private handleVertexTreeInteraction(): void {
    for (let i = 0; i < this.vertexTrees.length; i++) {
      const vt = this.vertexTrees[i];
      if (vt.hasStarPlaced) continue;

      const dist = distance(this.playerState.x, this.playerState.y, vt.gameX, vt.gameY);
      if (dist < VERTEX_TREE_INTERACTION_RANGE) {
        const state = this.vertexStarStates[i];
        const tierName = state.requiredTier === FragmentTier.MERGED ? '✦합성' : '✧초합성';
        const placed = this.vertexTrees.filter(v => v.hasStarPlaced).length;
        const total = this.vertexTrees.length;

        if (this.keyDownThisFrame.has('z')) {
          // Try to place star
          const pouch = getActivePouch(this.inventory);
          const fragIdx = pouch.fragments.findIndex(f => f.tier === state.requiredTier);
          if (fragIdx !== -1) {
            // Consume fragment and place star
            pouch.fragments.splice(fragIdx, 1);
            vt.hasStarPlaced = true;
            state.isPlaced = true;

            // Visual: create placed star mesh
            const [twx, twz] = toWorld(vt.gameX, vt.gameY);
            const starMesh = createPlacedStarMesh(1.5);
            starMesh.position.set(twx, 0, twz);
            this.scene.add(starMesh);
            vt.starMesh = starMesh;

            // Enhance tree glow
            enhanceTreeGlow(vt.mesh);

            const newPlaced = placed + 1;
            this.showMessage(`별 배치 완료! (${newPlaced}/${total})`);

            // Check if all stars placed
            if (this.vertexTrees.every(v => v.hasStarPlaced)) {
              this.allStarsPlaced = true;
              this.spawnCenterStar();
              this.showMessage('모든 별이 배치되었습니다! 중앙의 별로 가세요!');
            }
          } else {
            this.showMessage(`${tierName} 별조각이 필요합니다`);
          }
        } else {
          // Show hint
          if (this.messageTimer <= 0) {
            this.showMessage(`[Z] 별 배치 (${tierName} 필요) — ${placed}/${total}`);
          }
        }
        return; // Only interact with nearest tree
      }
    }
  }

  // --- Flower Shop ---
  private handleFlowerShopInteraction(): void {
    const dist = distance(this.playerState.x, this.playerState.y, this.flowerShopGamePos.x, this.flowerShopGamePos.y);
    if (dist >= VERTEX_TREE_INTERACTION_RANGE) return;
    // Don't open if near a vertex tree (Z key conflict)
    if (this.isNearUnplacedVertexTree()) return;

    if (this.keyDownThisFrame.has('z')) {
      this.flowerShopOpen = true;
      this.updateFlowerShopUI();
      document.getElementById('flower-shop-panel')!.classList.add('open');
    } else if (this.messageTimer <= 0) {
      this.showMessage('[Z] 꽃집 열기');
    }
  }

  private handleFlowerShopKeys(): void {
    if (this.keyDownThisFrame.has('z') || this.keyDownThisFrame.has('escape')) {
      this.flowerShopOpen = false;
      document.getElementById('flower-shop-panel')!.classList.remove('open');
      return;
    }
    if (this.keyDownThisFrame.has('1')) this.buyFlower(FlowerType.BASIC);
    if (this.keyDownThisFrame.has('2')) this.buyFlower(FlowerType.ADVANCED);
    if (this.keyDownThisFrame.has('3')) this.buyFlower(FlowerType.SPECIAL);
  }

  private buyFlower(type: FlowerType): void {
    const pouch = getActivePouch(this.inventory);
    const vertexCount = this.difficulty.level;

    if (type === FlowerType.BASIC) {
      const idx = pouch.fragments.findIndex(f => f.tier === FragmentTier.MERGED);
      if (idx === -1) { this.showMessage('✦합성 별조각이 필요합니다'); return; }
      pouch.fragments.splice(idx, 1);
    } else if (type === FlowerType.ADVANCED) {
      const idx = pouch.fragments.findIndex(f => f.tier === FragmentTier.SUPER_MERGED);
      if (idx === -1) { this.showMessage('✧초합성 별조각이 필요합니다'); return; }
      pouch.fragments.splice(idx, 1);
    } else {
      // SPECIAL: costs vertexCount SUPER_MERGED
      if (this.flowerShop.specialFlowerBought) { this.showMessage('이미 특별한 꽃을 구매했습니다'); return; }
      const superFrags = pouch.fragments.filter(f => f.tier === FragmentTier.SUPER_MERGED);
      if (superFrags.length < vertexCount) {
        this.showMessage(`✧초합성 별조각 ${vertexCount}개가 필요합니다 (보유: ${superFrags.length})`);
        return;
      }
      // Remove vertexCount SUPER_MERGED fragments
      let removed = 0;
      for (let i = pouch.fragments.length - 1; i >= 0 && removed < vertexCount; i--) {
        if (pouch.fragments[i].tier === FragmentTier.SUPER_MERGED) {
          pouch.fragments.splice(i, 1);
          removed++;
        }
      }
      this.flowerShop.specialFlowerBought = true;
    }

    // Place flower on map
    const pt = randomPointInPolygon(this.mapVertices, 100);
    const flower = createFlower(type, pt.x, pt.y);
    this.flowerShop.flowers.push(flower);

    const [wx, wz] = toWorld(flower.x, flower.y);
    const mesh = createPlacedFlower(type);
    mesh.position.set(wx, 0, wz);
    this.scene.add(mesh);
    this.flowerMeshes.push(mesh);

    const name = type === FlowerType.SPECIAL ? '특별한 꽃' : type === FlowerType.ADVANCED ? '금빛 꽃' : '꽃';
    this.showMessage(`${name}을 피웠습니다! (총 ${this.flowerShop.flowers.length}송이)`);
    this.updateFlowerShopUI();
  }

  private updateFlowerShopUI(): void {
    const pouch = getActivePouch(this.inventory);
    const mergedCount = pouch.fragments.filter(f => f.tier === FragmentTier.MERGED).length;
    const superCount = pouch.fragments.filter(f => f.tier === FragmentTier.SUPER_MERGED).length;
    const vertexCount = this.difficulty.level;

    document.getElementById('flower-shop-count')!.textContent = `피운 꽃: ${this.flowerShop.flowers.length}송이`;

    const container = document.getElementById('flower-shop-items')!;
    container.innerHTML = '';

    const items = [
      { key: '1', label: `꽃 (✦합성 x1)`, enabled: mergedCount >= 1, cost: `보유: ${mergedCount}` },
      { key: '2', label: `금빛 꽃 (✧초합성 x1)`, enabled: superCount >= 1, cost: `보유: ${superCount}` },
      {
        key: '3',
        label: this.flowerShop.specialFlowerBought ? '특별한 꽃 (구매 완료)' : `특별한 꽃 (✧초합성 x${vertexCount})`,
        enabled: !this.flowerShop.specialFlowerBought && superCount >= vertexCount,
        cost: this.flowerShop.specialFlowerBought ? '' : `보유: ${superCount}/${vertexCount}`,
      },
    ];

    for (const item of items) {
      const btn = document.createElement('button');
      btn.textContent = `[${item.key}] ${item.label}`;
      btn.disabled = !item.enabled;
      if (item.cost) btn.title = item.cost;
      container.appendChild(btn);
    }
  }

  private isNearUnplacedVertexTree(): boolean {
    for (const vt of this.vertexTrees) {
      if (!vt.hasStarPlaced && distance(this.playerState.x, this.playerState.y, vt.gameX, vt.gameY) < VERTEX_TREE_INTERACTION_RANGE) {
        return true;
      }
    }
    return false;
  }

  // --- Victory: Center Star ---
  private spawnCenterStar(): void {
    const sides = this.difficulty.level;
    const starPoints = getStarShape(sides, 100, 40, { x: MAP_CENTER_X, y: MAP_CENTER_Y });

    // Create star line on ground
    const group = new THREE.Group();
    const worldPoints = starPoints.map(p => {
      const [wx, wz] = toWorld(p.x, p.y);
      return new THREE.Vector3(wx, 0.1, wz);
    });
    worldPoints.push(worldPoints[0].clone());

    const lineGeo = new THREE.BufferGeometry().setFromPoints(worldPoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffaa,
      linewidth: 2,
      transparent: true,
      opacity: 0,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);

    // Glowing star shape fill
    const shape = new THREE.Shape();
    const wPts = starPoints.map(p => toWorld(p.x, p.y));
    shape.moveTo(wPts[0][0], wPts[0][1]);
    for (let i = 1; i < wPts.length; i++) shape.lineTo(wPts[i][0], wPts[i][1]);
    shape.closePath();

    const fillGeo = new THREE.ShapeGeometry(shape);
    const fillMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.05;
    group.add(fill);

    // Point light at center
    const light = new THREE.PointLight(0xffffaa, 0, 15);
    const [cwx, cwz] = toWorld(MAP_CENTER_X, MAP_CENTER_Y);
    light.position.set(cwx, 2, cwz);
    group.add(light);

    this.scene.add(group);
    this.centerStarMesh = group;

    // Fade in animation using tween over frames
    let fadeProgress = 0;
    const fadeIn = () => {
      fadeProgress += 0.016;
      const t = Math.min(fadeProgress / 2.5, 1); // 2.5 seconds
      lineMat.opacity = t;
      fillMat.opacity = t * 0.3;
      fillMat.emissiveIntensity = t * 0.8;
      light.intensity = t * 3;
      if (t < 1 && this.state === 'playing') requestAnimationFrame(fadeIn);
    };
    requestAnimationFrame(fadeIn);
  }

  // --- Victory Ending Sequence ---
  private triggerVictoryEnding(): void {
    this.state = 'ending';
    this.endingElapsed = 0;
    this.endingPhase = 0;
    this.isTrueEnding = this.flowerShop.specialFlowerBought;
    document.getElementById('hud')!.style.display = 'none';
    document.getElementById('inventory-panel')!.classList.remove('open');
    document.getElementById('flower-shop-panel')!.classList.remove('open');
  }

  private updateEnding(dt: number): void {
    this.endingElapsed += dt;
    const t = this.endingElapsed;

    // Phase 0: Brighten the map (0-3s)
    if (this.endingPhase === 0) {
      const progress = Math.min(t / 3, 1);
      this.renderer.toneMappingExposure = (1.5 + this.difficulty.moonBrightness * 2.0) + progress * 4;
      if (this.ambientLight) this.ambientLight.intensity = (0.5 + this.difficulty.moonBrightness * 1.5) + progress * 3;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = Math.max(0, (0.008 + (1 - this.difficulty.moonBrightness) * 0.025) * (1 - progress));
      }
      if (t >= 2) {
        this.endingPhase = 1;
        this.transformEntitiesToStars();
      }
    }

    // Phase 1: Entities rise (2-6s)
    if (this.endingPhase >= 1) {
      // Animate floating entities
      for (const [, mesh] of this.enemyMeshes) {
        mesh.position.y += dt * 3;
        mesh.traverse(child => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.transparent) mat.opacity = Math.max(0, mat.opacity - dt * 0.3);
          }
        });
      }
      for (const [, mesh] of this.npcMeshes) {
        mesh.position.y += dt * 2.5;
      }
      for (const [, mesh] of this.fragmentMeshes) {
        mesh.position.y += dt * 4;
      }

      if (t >= 4 && this.endingPhase === 1) {
        this.endingPhase = 2;
        // Vertex stars fly up
        for (const vt of this.vertexTrees) {
          if (vt.starMesh) {
            vt.starMesh.userData.rising = true;
          }
        }
      }
    }

    // Phase 2: Vertex stars rise (4-7s)
    if (this.endingPhase >= 2) {
      for (const vt of this.vertexTrees) {
        if (vt.starMesh?.userData.rising) {
          vt.starMesh.position.y += dt * 5;
        }
      }
      // Player glow intensifies
      this.playerLight.intensity = Math.min(10, this.playerLight.intensity + dt * 2);

      // True ending: special flower blooms at center
      if (this.isTrueEnding && this.specialFlowerMesh) {
        const scale = Math.min(1, this.specialFlowerMesh.scale.x + dt * 0.5);
        this.specialFlowerMesh.scale.setScalar(scale);
        this.specialFlowerMesh.rotation.y += dt * 0.5;
      } else if (this.isTrueEnding && !this.specialFlowerMesh && t >= 4.5) {
        this.specialFlowerMesh = createSpecialFlowerBloom();
        const [cx, cz] = toWorld(MAP_CENTER_X, MAP_CENTER_Y);
        this.specialFlowerMesh.position.set(cx, 0, cz);
        this.specialFlowerMesh.scale.setScalar(0);
        this.scene.add(this.specialFlowerMesh);
      }

      if (t >= 6 && this.endingPhase === 2) {
        this.endingPhase = 3;
        this.showEndingOverlay();
      }
    }

    // Phase 3: Text overlay shown (6s+), wait for input
    if (this.endingPhase === 3 && t >= 8) {
      this.endingPhase = 4;
      this.showEndingControls();
    }
  }

  private transformEntitiesToStars(): void {
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 1,
    });

    // Transform enemies
    for (const [, mesh] of this.enemyMeshes) {
      mesh.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.material = starMat.clone();
          child.scale.setScalar(0.5);
        }
      });
    }

    // Transform NPCs
    for (const [, mesh] of this.npcMeshes) {
      mesh.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.material = starMat.clone();
          child.scale.setScalar(0.5);
        }
      });
    }

    // Transform remaining fragments (already star-like, just boost glow)
    for (const [, mesh] of this.fragmentMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.0;
    }
  }

  private showEndingOverlay(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:100;';

    const title = document.createElement('div');
    title.textContent = this.isTrueEnding ? '꽃이 피었습니다' : '별이 되었습니다';
    title.style.cssText = `font-size:36px;color:${this.isTrueEnding ? '#ffaadd' : '#ffffcc'};font-family:serif;opacity:0;transition:opacity 2s;`;
    overlay.appendChild(title);

    const sub = document.createElement('div');
    sub.textContent = this.isTrueEnding
      ? '어둠 속에서, 빛이 아닌 생명을 피워냈습니다'
      : '어둠의 숲에 빛이 되어 남았습니다';
    sub.style.cssText = 'font-size:14px;color:#888877;font-family:monospace;font-style:italic;margin-top:16px;opacity:0;transition:opacity 2s 1s;';
    overlay.appendChild(sub);

    // Flower achievement
    if (this.flowerShop.flowers.length > 0) {
      const achievement = document.createElement('div');
      achievement.textContent = `피운 꽃: ${this.flowerShop.flowers.length}송이`;
      achievement.style.cssText = 'font-size:12px;color:#aa8866;font-family:monospace;margin-top:24px;opacity:0;transition:opacity 2s 2s;';
      overlay.appendChild(achievement);
      requestAnimationFrame(() => { achievement.style.opacity = '1'; });
    }

    document.body.appendChild(overlay);
    this.endingOverlay = overlay;

    // Trigger fade-in
    requestAnimationFrame(() => {
      title.style.opacity = '1';
      sub.style.opacity = '1';
    });
  }

  private showEndingControls(): void {
    if (!this.endingOverlay) return;

    const controls = document.createElement('div');
    controls.style.cssText = 'font-size:13px;color:#666655;font-family:monospace;margin-top:40px;opacity:0;transition:opacity 1.5s;pointer-events:auto;';
    controls.textContent = '[ENTER] 다음 난이도  [ESC] 타이틀';
    this.endingOverlay.appendChild(controls);
    this.endingOverlay.style.pointerEvents = 'auto';

    requestAnimationFrame(() => { controls.style.opacity = '1'; });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        window.removeEventListener('keydown', handleKey);
        this.cleanupEnding();
        const nextDiffs: Record<number, DifficultyLevel> = {
          [DifficultyLevel.STAR_5]: DifficultyLevel.STAR_6,
          [DifficultyLevel.STAR_6]: DifficultyLevel.STAR_8,
          [DifficultyLevel.STAR_8]: DifficultyLevel.STAR_12,
          [DifficultyLevel.STAR_12]: DifficultyLevel.STAR_12,
        };
        this.startGame(nextDiffs[this.difficulty.level]);
      } else if (e.key === 'Escape') {
        window.removeEventListener('keydown', handleKey);
        this.cleanupEnding();
        this.showTitleMain();
        this.state = 'title';
      }
    };
    window.addEventListener('keydown', handleKey);
  }

  private cleanupEnding(): void {
    if (this.endingOverlay) {
      document.body.removeChild(this.endingOverlay);
      this.endingOverlay = null;
    }
  }

  // --- Respawn System ---
  private checkRespawns(): void {
    const maxFragments = Math.round(FRAGMENT_SCATTER_COUNT * this.difficulty.fragmentDropRate);
    const maxDeposits = Math.round(DEPOSIT_COUNT * this.difficulty.depositFrequency);
    const maxEnemies = Math.round(ENEMY_COUNT * this.difficulty.enemySpawnRate);
    const fragThreshold = Math.floor(maxFragments * 0.3);
    const depThreshold = Math.floor(maxDeposits * 0.3);
    const enemyThreshold = Math.floor(maxEnemies * 0.3);

    // Respawn fragments
    if (this.fragments.length < fragThreshold) {
      const toSpawn = Math.min(3, maxFragments - this.fragments.length);
      for (let i = 0; i < toSpawn; i++) {
        const pt = randomPointInPolygon(this.mapVertices, 100);
        const frag = createStarFragment(pt.x, pt.y);
        this.fragments.push(frag);
        this.createFragmentMesh(frag);
      }
    }

    // Respawn deposits
    if (this.deposits.length < depThreshold) {
      const toSpawn = Math.min(2, maxDeposits - this.deposits.length);
      for (let i = 0; i < toSpawn; i++) {
        const pt = randomPointInPolygon(this.mapVertices, 200);
        const dep = createStarDeposit(pt.x, pt.y);
        this.deposits.push(dep);
        this.createDepositMesh(dep);
      }
    }

    // Respawn enemies
    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length < enemyThreshold) {
      const speciesList = Object.values(AnimalSpecies);
      const hammerTypes = Object.values(HammerType);
      const toSpawn = Math.min(2, maxEnemies - aliveEnemies.length);
      for (let i = 0; i < toSpawn; i++) {
        const pt = randomPointInPolygon(this.mapVertices, 150);
        if (distance(pt.x, pt.y, MAP_CENTER_X, MAP_CENTER_Y) < 300) continue;
        if (distance(pt.x, pt.y, this.playerState.x, this.playerState.y) < 400) continue;
        const species = speciesList[Math.floor(Math.random() * speciesList.length)];
        const hammerType = hammerTypes[Math.floor(Math.random() * hammerTypes.length)];
        const patrolPath = [];
        for (let p = 0; p < 4; p++) {
          const pp = randomPointInPolygon(this.mapVertices, 100);
          patrolPath.push({ x: pp.x, y: pp.y });
        }
        const animal = createHammerAnimal(species, hammerType, pt.x, pt.y, patrolPath);
        animal.damage = Math.round(animal.damage * this.difficulty.enemyDamageMultiplier);
        animal.hp = Math.round(animal.hp * this.difficulty.enemyHpMultiplier);
        animal.maxHp = animal.hp;
        this.enemies.push(animal);
        this.createEnemyMesh(animal);
      }
    }
  }

  // --- Game Over ---
  private gameOver(reason: string): void {
    this.state = 'gameover';
    document.getElementById('hud')!.style.display = 'none';
    document.getElementById('inventory-panel')!.classList.remove('open');
    const screen = document.getElementById('gameover-screen')!;
    screen.classList.add('open');
    document.getElementById('gameover-title')!.textContent =
      reason === 'hammer' ? '망치동물이 되었습니다' : '불이 꺼졌습니다';
    document.getElementById('gameover-reason')!.textContent =
      reason === 'hammer' ? '망치 점수가 빛 점수를 초과했습니다' : '체력이 0이 되었습니다';
  }

  // --- Helpers ---
  private showMessage(text: string): void {
    const el = document.getElementById('message-text')!;
    el.textContent = text;
    el.style.opacity = '1';
    this.messageTimer = 2.5;
  }

  private showMiningBar(current: number, max: number): void {
    const bar = document.getElementById('mining-bar')!;
    bar.style.display = 'block';
    document.getElementById('mining-fill')!.style.width = `${(current / max) * 100}%`;
  }

  private hideMiningBar(): void {
    document.getElementById('mining-bar')!.style.display = 'none';
  }

  private flashMesh(group: THREE.Group | THREE.Object3D, color: number, duration: number): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          const origEmissive = mat.emissive.getHex();
          const origIntensity = mat.emissiveIntensity;
          mat.emissive.setHex(color);
          mat.emissiveIntensity = 1;
          setTimeout(() => {
            mat.emissive.setHex(origEmissive);
            mat.emissiveIntensity = origIntensity;
          }, duration);
        }
      }
    });
  }

  private spawnDamageNumber(pos: THREE.Vector3, damage: number, color: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.textAlign = 'center';
    ctx.fillText(`-${damage}`, 32, 24);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.position.y += 1;
    sprite.scale.set(1.5, 0.75, 1);
    this.scene.add(sprite);
    this.floatingTexts.push({ mesh: sprite, vy: 1.5, life: 0.8 });
  }

  // --- Admin Panel ---
  private setupAdminPanel(): void {
    const toggle = document.getElementById('admin-toggle')!;
    const panel = document.getElementById('admin-panel')!;

    // Sync helper: bind range + number input pair
    const bindPair = (rangeId: string, numId: string): { get: () => number; set: (v: number) => void } => {
      const range = document.getElementById(rangeId) as HTMLInputElement;
      const num = document.getElementById(numId) as HTMLInputElement;
      range.addEventListener('input', () => { num.value = range.value; });
      num.addEventListener('input', () => { range.value = num.value; });
      // Block game keys when input is focused
      for (const el of [range, num]) {
        el.addEventListener('focus', () => { this.inputBlocked = true; });
        el.addEventListener('blur', () => { this.inputBlocked = false; });
      }
      return {
        get: () => parseFloat(range.value),
        set: (v: number) => { range.value = String(v); num.value = String(v); },
      };
    };

    const brightness = bindPair('admin-brightness', 'admin-brightness-val');
    const enemyCount = bindPair('admin-enemy-count', 'admin-enemy-count-val');
    const fragCount = bindPair('admin-frag-count', 'admin-frag-count-val');
    const enemySpeed = bindPair('admin-enemy-speed', 'admin-enemy-speed-val');
    const damage = bindPair('admin-damage', 'admin-damage-val');

    // Set initial values
    brightness.set(this.renderer.toneMappingExposure);
    enemyCount.set(this.enemies.length);
    fragCount.set(this.fragments.length);
    enemySpeed.set(this.speedMultiplier);
    damage.set(this.difficulty.enemyDamageMultiplier);

    toggle.onclick = () => {
      this.adminOpen = !this.adminOpen;
      panel.style.display = this.adminOpen ? 'block' : 'none';
      if (this.adminOpen) {
        brightness.set(this.renderer.toneMappingExposure);
        enemyCount.set(this.enemies.length);
        fragCount.set(this.fragments.length);
        enemySpeed.set(this.speedMultiplier);
        damage.set(this.difficulty.enemyDamageMultiplier);
      }
    };

    document.getElementById('admin-apply')!.onclick = () => {
      // Brightness
      this.renderer.toneMappingExposure = brightness.get();

      // Enemy count
      const targetEnemies = Math.round(enemyCount.get());
      while (this.enemies.length > targetEnemies) {
        const removed = this.enemies.pop()!;
        const mesh = this.enemyMeshes.get(removed.id);
        if (mesh) { this.scene.remove(mesh); this.enemyMeshes.delete(removed.id); }
      }
      const speciesList = Object.values(AnimalSpecies);
      const hammerTypes = Object.values(HammerType);
      while (this.enemies.length < targetEnemies) {
        const pt = randomPointInPolygon(this.mapVertices, 150);
        const x = pt.x;
        const y = pt.y;
        const i = this.enemies.length;
        const species = speciesList[i % speciesList.length];
        const hammerType = hammerTypes[Math.min(Math.floor(i / speciesList.length), hammerTypes.length - 1)];
        const patrolPath = [];
        for (let p = 0; p < 4; p++) {
          const pp = randomPointInPolygon(this.mapVertices, 100);
          patrolPath.push({ x: pp.x, y: pp.y });
        }
        const animal = createHammerAnimal(species, hammerType, x, y, patrolPath);
        animal.damage = Math.round(animal.damage * this.difficulty.enemyDamageMultiplier);
        animal.hp = Math.round(animal.hp * this.difficulty.enemyHpMultiplier);
        animal.maxHp = animal.hp;
        this.enemies.push(animal);
        this.createEnemyMesh(animal);
      }

      // Fragment count
      const targetFrags = Math.round(fragCount.get());
      while (this.fragments.length > targetFrags) {
        const removed = this.fragments.pop()!;
        const mesh = this.fragmentMeshes.get(removed.id);
        if (mesh) { this.scene.remove(mesh); this.fragmentMeshes.delete(removed.id); }
      }
      while (this.fragments.length < targetFrags) {
        const pt = randomPointInPolygon(this.mapVertices, 100);
        const frag = createStarFragment(pt.x, pt.y);
        this.fragments.push(frag);
        this.createFragmentMesh(frag);
      }

      // Enemy speed multiplier
      const newSpeedMul = enemySpeed.get();
      const ratio = newSpeedMul / this.speedMultiplier;
      for (const enemy of this.enemies) {
        enemy.speed = Math.round(enemy.speed * ratio);
      }
      this.speedMultiplier = newSpeedMul;

      // Damage multiplier
      this.difficulty.enemyDamageMultiplier = damage.get();

      this.showMessage('관리자 설정 적용됨');
    };
  }
}
