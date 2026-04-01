import * as THREE from 'three';
import { createDefaultPlayer, type PlayerState } from '../core/models/Player';
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
import { HP_REGEN_RATE, MAP_WIDTH, MAP_HEIGHT, TREE_COUNT, FRAGMENT_SCATTER_COUNT, DEPOSIT_COUNT, MERGE_COUNT, STICK_CRAFT_COUNT } from '../core/constants/GameConstants';
import { distance } from '../shared/utils';

const PICKUP_RANGE = 24;
const MINING_RANGE = 48;
const ATTACK_RANGE = 40;
const ENEMY_COUNT = 8;
const NPC_COUNT = 4;
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
  private state: 'title' | 'playing' | 'gameover' = 'title';
  private playerState!: PlayerState;
  private inventory!: InventoryState;
  private difficulty!: DifficultyConfig;
  private fragments: StarFragmentData[] = [];
  private deposits: StarDepositData[] = [];
  private enemies: HammerAnimalData[] = [];
  private npcs: NPCData[] = [];

  // 3D objects
  private playerGroup!: THREE.Group;
  private playerLight!: THREE.PointLight;
  private playerGlow!: THREE.Mesh;
  private enemyMeshes = new Map<string, THREE.Group>();
  private fragmentMeshes = new Map<string, THREE.Mesh>();
  private depositMeshes = new Map<string, THREE.Mesh>();
  private npcMeshes = new Map<string, THREE.Group>();
  private treeMeshes: THREE.Mesh[] = [];
  private attackArc!: THREE.Mesh;
  private attackArcTimer = 0;

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
    const container = document.getElementById('difficulty-buttons')!;
    container.innerHTML = '';
    const levels = [
      { level: DifficultyLevel.STAR_3, label: '☆3 보름달 (쉬움)' },
      { level: DifficultyLevel.STAR_4, label: '☆4 상현달' },
      { level: DifficultyLevel.STAR_5, label: '☆5 반달 (보통)' },
      { level: DifficultyLevel.STAR_6, label: '☆6 하현달' },
      { level: DifficultyLevel.STAR_8, label: '☆8 그믐달' },
      { level: DifficultyLevel.STAR_12, label: '☆12 삭 (극한)' },
    ];
    for (const { level, label } of levels) {
      const btn = document.createElement('button');
      btn.className = 'diff-btn';
      btn.textContent = label;
      btn.addEventListener('click', (ev) => { (ev.target as HTMLElement).blur(); this.startGame(level); });
      container.appendChild(btn);
    }
  }

  private startGame(level: DifficultyLevel): void {
    document.getElementById('title-screen')!.style.display = 'none';
    document.getElementById('hud')!.style.display = 'block';
    document.getElementById('gameover-screen')!.classList.remove('open');

    this.difficulty = { ...DIFFICULTY_PRESETS[level] };
    this.playerState = createDefaultPlayer(MAP_WIDTH / 2, MAP_HEIGHT / 2);
    this.inventory = createDefaultInventory();
    this.fragments = [];
    this.deposits = [];
    this.enemies = [];
    this.npcs = [];
    this.inventoryOpen = false;
    this.currentMiningDeposit = null;
    this.messageTimer = 0;
    this.keys.clear();
    this.keyDownThisFrame.clear();
    this.inputBlocked = false;

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
    const ambient = new THREE.AmbientLight(COLOR_AMBIENT, 0.5 + mb * 1.5);
    this.scene.add(ambient);

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
    // Ground plane — large dark plane
    const groundGeo = new THREE.PlaneGeometry(MAP_WIDTH * WORLD_SCALE, MAP_HEIGHT * WORLD_SCALE);
    const groundMat = new THREE.MeshStandardMaterial({
      color: COLOR_GROUND,
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Subtle grid texture on ground
    const gridGeo = new THREE.PlaneGeometry(MAP_WIDTH * WORLD_SCALE, MAP_HEIGHT * WORLD_SCALE);
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

    // Trees
    this.treeMeshes = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      const tx = Math.random() * (MAP_WIDTH - 64) + 32;
      const ty = Math.random() * (MAP_HEIGHT - 64) + 32;
      if (distance(tx, ty, MAP_WIDTH / 2, MAP_HEIGHT / 2) < 100) continue;

      const [wx, wz] = toWorld(tx, ty);
      const tree = this.createTree();
      tree.position.set(wx, 0, wz);
      tree.castShadow = true;
      this.scene.add(tree);
      this.treeMeshes.push(tree);
    }

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

    // Player point light
    this.playerLight = new THREE.PointLight(COLOR_PLAYER_GLOW, 2, 15);
    this.playerLight.position.y = 0.6;
    this.playerLight.castShadow = true;
    this.playerLight.shadow.mapSize.set(512, 512);
    this.playerGroup.add(this.playerLight);

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
      const x = Math.random() * (MAP_WIDTH - 100) + 50;
      const y = Math.random() * (MAP_HEIGHT - 100) + 50;
      const frag = createStarFragment(x, y);
      this.fragments.push(frag);
      this.createFragmentMesh(frag);
    }

    // Deposits
    const depCount = Math.round(DEPOSIT_COUNT * this.difficulty.depositFrequency);
    for (let i = 0; i < depCount; i++) {
      const x = Math.random() * (MAP_WIDTH - 200) + 100;
      const y = Math.random() * (MAP_HEIGHT - 200) + 100;
      const dep = createStarDeposit(x, y);
      this.deposits.push(dep);
      this.createDepositMesh(dep);
    }

    // Enemies
    const speciesList = Object.values(AnimalSpecies);
    const hammerTypes = Object.values(HammerType);
    const enemyCount = Math.round(ENEMY_COUNT * this.difficulty.enemySpawnRate);
    for (let i = 0; i < enemyCount; i++) {
      const x = Math.random() * (MAP_WIDTH - 200) + 100;
      const y = Math.random() * (MAP_HEIGHT - 200) + 100;
      if (distance(x, y, MAP_WIDTH / 2, MAP_HEIGHT / 2) < 300) continue;
      const species = speciesList[i % speciesList.length];
      const hammerType = hammerTypes[Math.min(Math.floor(i / speciesList.length), hammerTypes.length - 1)];
      const patrolPath = [];
      for (let p = 0; p < 4; p++) {
        patrolPath.push({
          x: Math.max(50, Math.min(MAP_WIDTH - 50, x + (Math.random() - 0.5) * 400)),
          y: Math.max(50, Math.min(MAP_HEIGHT - 50, y + (Math.random() - 0.5) * 400)),
        });
      }
      const animal = createHammerAnimal(species, hammerType, x, y, patrolPath);
      animal.damage = Math.round(animal.damage * this.difficulty.enemyDamageMultiplier);
      animal.hp = Math.round(animal.hp * this.difficulty.enemyHpMultiplier);
      animal.maxHp = animal.hp;
      this.enemies.push(animal);
      this.createEnemyMesh(animal);
    }

    // NPCs
    const dispositions = [NPCDisposition.FRIENDLY, NPCDisposition.NEUTRAL, NPCDisposition.NEUTRAL, NPCDisposition.HOSTILE];
    for (let i = 0; i < NPC_COUNT; i++) {
      const x = Math.random() * (MAP_WIDTH - 400) + 200;
      const y = Math.random() * (MAP_HEIGHT - 400) + 200;
      const npc = createNPC(x, y, dispositions[i % dispositions.length]);
      this.npcs.push(npc);
      this.createNPCMesh(npc);
    }
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

    // Game over restart
    document.getElementById('gameover-restart')!.addEventListener('click', () => {
      document.getElementById('gameover-screen')!.classList.remove('open');
      document.getElementById('title-screen')!.style.display = 'flex';
      this.state = 'title';
    });
  }

  // --- Game Loop ---
  private animate = (): void => {
    if (this.state !== 'playing') return;
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
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

    // Movement
    this.handleMovement(dt);

    // Light fuel
    LightSystem.consumeFuel(this.playerState.lightSource, dt);

    // HP regen
    CombatSystem.naturalRegen(this.playerState, HP_REGEN_RATE, dt);

    // Fragment pickup
    this.checkFragmentPickup();

    // Mining
    this.handleMining(dt);

    // NPC interaction
    this.handleNPCInteraction();

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

    // Clamp to map bounds
    this.playerState.x = Math.max(20, Math.min(MAP_WIDTH - 20, this.playerState.x));
    this.playerState.y = Math.max(20, Math.min(MAP_HEIGHT - 20, this.playerState.y));

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
  private handleNPCInteraction(): void {
    for (const npc of this.npcs) {
      const dist = distance(this.playerState.x, this.playerState.y, npc.x, npc.y);
      if (npc.currentAction === NPCAction.IDLE && Math.random() < 0.005) {
        npc.x += (Math.random() - 0.5) * 40;
        npc.y += (Math.random() - 0.5) * 40;
        npc.x = Math.max(50, Math.min(MAP_WIDTH - 50, npc.x));
        npc.y = Math.max(50, Math.min(MAP_HEIGHT - 50, npc.y));
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

  // --- Visual Updates ---
  private updateVisuals(dt: number): void {
    const ls = this.playerState.lightSource;

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

    // Dim player when cloaked
    const body = this.playerGroup.children[0] as THREE.Mesh;
    const bmat = body.material as THREE.MeshStandardMaterial;
    bmat.emissiveIntensity = ls.isCloaked ? 0.1 : 0.5;

    // Flame flicker
    const flame = this.playerGroup.children[1] as THREE.Mesh;
    if (ls.fuel < ls.maxFuel * 0.2 && ls.isOn) {
      flame.scale.setScalar(0.7 + Math.random() * 0.6);
    } else if (ls.isCloaked) {
      flame.scale.setScalar(0.3);
    } else {
      flame.scale.setScalar(1);
    }

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
    document.getElementById('status-text')!.innerHTML =
      `Lv.${this.playerState.level} | XP:${this.playerState.xp}<br>` +
      `★ ${pouch.fragments.length} | ⚔ ${this.inventory.starSticks.length}<br>` +
      `빛:${this.playerState.lightScore} 망치:${this.playerState.hammerScore}`;
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
        const x = Math.random() * (MAP_WIDTH - 200) + 100;
        const y = Math.random() * (MAP_HEIGHT - 200) + 100;
        const i = this.enemies.length;
        const species = speciesList[i % speciesList.length];
        const hammerType = hammerTypes[Math.min(Math.floor(i / speciesList.length), hammerTypes.length - 1)];
        const patrolPath = [];
        for (let p = 0; p < 4; p++) {
          patrolPath.push({
            x: Math.max(50, Math.min(MAP_WIDTH - 50, x + (Math.random() - 0.5) * 400)),
            y: Math.max(50, Math.min(MAP_HEIGHT - 50, y + (Math.random() - 0.5) * 400)),
          });
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
        const x = Math.random() * (MAP_WIDTH - 100) + 50;
        const y = Math.random() * (MAP_HEIGHT - 100) + 50;
        const frag = createStarFragment(x, y);
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
