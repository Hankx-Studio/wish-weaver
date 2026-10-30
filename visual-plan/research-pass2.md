# Research pass 2 — stylized 3D art recipes for three.js 0.186

Context read first: `visual-plan/PRD.md`, `visual-plan/refs/meadow.jpg`,
`visual-plan/refs/characters.jpg`, `.agents/skills/create-game-assets/SKILL.md`.
Branch: `feat/art-pass2`. Refs show golden-hour meadow + stone arch + fireflies,
and a cloaked traveler + glowing wisp. All recipes below are original-asset
friendly (procedural / hand-built, no IP reuse).

## 1. Art-direction recipes (Sky / BOTW / Ghibli look in three.js)

### Toon shading (core of the look)
- `MeshToonMaterial` + tiny 3–5 step `gradientMap` (`DataTexture`, `RedFormat`,
  `minFilter = magFilter = NearestFilter`, `NoColorSpace`). LinearFilter blurs
  the bands away — NearestFilter is the critical setting. Example bands:
  `0x40 / 0xa0 / 0xff`. PRD's 4-step ramp matches this consensus.
- Outline (optional, cheap, no composer): inverted hull — same geometry with
  `MeshBasicMaterial({ color: ink, side: BackSide })`, scaled ~1.045.
- Avoid full PBR on characters/vegetation — it fights stylization and costs more.
- BOTW-style cel breakdown (Unity reference, same math): quantized diffuse ramp
  + hemisphere ambient tint + subtle rim; specular minimal or off.

### Light rig (PRD rig already matches the recipe)
- 1 warm key DirectionalLight w/ shadows + HemisphereLight fill + 1 cool fill
  DirectionalLight without shadows. PRD numbers: sun `#FFE3B3` 2.6 @ (40,60,20),
  shadow 2048, ortho ±70, bias -0.0004; hemi `#BFD9FF/#8A9A7B` 1.05; fill
  `#BCD0FF` 0.55. Renderer: ACESFilmic, exposure 1.0, PCFSoft shadows.

### Sky, fog, depth
- Sky: big inverted sphere, `BackSide`, `depthWrite: false`; shader mixes zenith
  → warm horizon (+ sun halo sprite at sun dir). PRD: top `#6EA8DD` → `#F3CD94`.
- Fog color MUST match sky horizon or objects pop as flat silhouettes.
  `FogExp2` density ~0.01–0.03, or linear fog near 80 / far 300 (PRD values).
- 3-layer depth: near sharp meshes → mid instanced → far billboards fading to sky.

### Grass / flowers (instancing)
- `InstancedMesh` of crossed-billboard tufts, one draw call; tens of thousands of
  blades in a single call is routine — PRD's 900 tufts + 150 flowers is trivially
  within budget (public examples: ~40k conifers + ~300k billboards in 2 calls).
- Wind via `material.onBeforeCompile` (keeps toon lighting): sum of 2–3 sines
  along wind dir × uTime + per-instance `timeShift` (0–2π) so tufts sway
  out of phase; mask by vertex height so roots stay planted.
- Glowing flowers: instanced mesh + emissive; accent palette pink/blue/gold.

### Clouds
- 8 soft billboards (PRD) with radial-gradient alpha texture, slow drift;
  distant cloud/mountain wall as billboards behind fog implies infinite depth.
  Keep them soft sprites — blocky geometry reads wrong against the refs.

### Water (if any pond/stream is added)
- Flat plane + scrolling normal-map or sine-displacement shader, teal Fresnel
  tint, quiet reflective pool. Edge foam via cheap stylized lines; no
  reflections render-target needed at this scope.

### Glow / particles / grade
- Glow = emissive mesh + additive radial-gradient halo sprite + selective bloom
  (only wisp/flowers/fireflies bloom).
- Fireflies: `THREE.Points` + ShaderMaterial, drift `sin(uTime*speed+seed)`,
  per-point size w/ distance attenuation, soft radial falloff fragment,
  `AdditiveBlending`, `depthWrite: false`. PRD: 120 ambient + ritual burst.
- Grade: one ShaderPass — warm highlights, cool shadows, light vignette.

## 2. 2026 AI skills / agent pipelines for stylized 3D game art

- **Atlas AI Studio** (Mar 2026): multi-agent system; describe need in natural
  language → agents assemble generation → texturing → optimization →
  engine-integration pipeline; ingests style guides/art bibles as constraints.
- **Agent-skill pattern** (matches this repo's `.agents/skills/` setup):
  `unity-ai-game-creator` (5-phase: concept → AI prompts per asset category →
  scenes/scripts/build), `game-art` (style selection → 3D pipeline), `clay`
  (generates Meshy/Tripo/Hunyuan/Rodin API code + Blender retopo/LOD/UV scripts
  + QC validation). Recommended: keep art constraints in a skill/contract file
  agents must read before generating.
- **Image/text-to-3D generators (2026)**: Meshy 6 (PBR + auto-rig + 600 anims,
  from ~$20/mo); Tripo P1/P2 (~15 s/model, native 48–20k faces, Smart Mesh quad
  retopo, ~$19.90/mo); Hunyuan3D 3.1 (open-source, free, 10B params, PBR
  optional — best free option); TRELLIS.2 (open-source PBR); Rodin/Hyper3D.
- **Recommended pipeline for this project**: ref image → run 2+ generators per
  object (Tripo + Hunyuan) and pick best silhouette → auto-retopo to budget →
  hand-finish in Blender → flat/vertex-color texture → GLB (+Draco) → three.js.
  AI output is a base, never shippable as-is: always retopo + QC.
- **Asset contract first** (ghibli-threejs skill pattern): write units, axes,
  grounding, mesh/material naming, budgets, and attachment numbers BEFORE
  generating; validate topology/UVs/scale/pivots/LODs in-engine per
  `create-game-assets` quality gates.

## 3. Procedural low-poly checklist (minimal background)

- [ ] **Poly budget set up front**: simple props ~300–1.5K tris, hero props
      ~2–5K, stylized characters ~3–10K (mobile lower). Traveler + wisp should
      land < 10K tris combined.
- [ ] **Topology**: quads in deformable areas, clean edge flow, no n-gons on
      joints; delete hidden/interior geometry; LODs for anything seen far away.
- [ ] **UV-less vertex colors**: flat/vertex colors instead of UV textures for
      stylized look; lock an 8–12 hex palette first and share it across assets;
      terrain blends via vertex-color/splat masks; one texture atlas if textures
      are needed (fewer draw calls).
- [ ] **Instancing budgets**: one `InstancedMesh` draw call per asset family;
      share geometry + material; per-instance attributes (color shift, timeShift)
      for variety. Current scene (grass/flowers/fireflies/clouds) should stay
      under ~20 draw calls total for scatter.
- [ ] **Normals/scale/pivot**: `flatShading: true` for faceted low-poly ground;
      consistent world scale, grounded pivots, correct color space on import.
- [ ] **Validate in-engine**: silhouette at game scale, seams, motion stability,
      memory, and the PRD's 30+ FPS gate with no per-frame allocations.

## Sources
- https://github.com/daniel-ilett/shaders-botw-cel-shading (BOTW cel shading)
- https://github.com/buggzeth/three-js-toon-shader (three.js toon + edges)
- https://github.com/frenndis/mmorpg_kimi_k3_max/blob/HEAD/docs/THREEJS_DETAIL_TECHNIQUES.md (4-step ramp code)
- https://github.com/pjc0210/studygotchi/blob/HEAD/docs/research/game-art/06-world-visualization.md (3–5 step DataTexture recipe)
- https://github.com/govinda610/ekalavya/blob/HEAD/docs/design/FOREST_3D_TECHNIQUES.md (fog density, toon, wind, fireflies)
- https://github.com/dvause/linville-gorge-3d (40k instanced + 300k billboards, 2 calls)
- https://www.tripo3d.ai/blog/how-to-make-low-poly-game-assets (budgets, manual + AI workflow)
- https://www.krea.ai/blog/best-ai-3d-model-generators-2026 (generator comparison)
- https://3daistudio.com/UseCases/GameDevelopment (Tripo/Meshy/Hunyuan roles)
- https://www.globenewswire.com/news-release/2026/03/09/3252089/0/en/Atlas-Launches-AI-Agents-That-Build-Game-Production-Pipelines.html (Atlas agents)
- https://github.com/sickn33/agentic-awesome-skills/blob/HEAD/./skills/unity-ai-game-creator/SKILL.md (5-phase agent skill)
- https://github.com/a1418692409/commonly-used-high-value-skills/blob/HEAD/openclaw-skills/clay/SKILL.md (clay 3D-agent skill)
- https://github.com/nicksonthc/ghibli-threejs/blob/HEAD/skills/threejs-blender-glb-pipeline/SKILL.md (asset-contract pipeline)
- https://github.com/xyrces/godot-ecs-gamedev-playbook/blob/HEAD/skills/3d_character_rendering/SKILL.md (topology, vertex colors)
- https://80.lv/articles/learn-how-to-set-up-wind-for-a-ghibli-style-3d-scene?amp=1 (Ghibli wind + fog layering)
