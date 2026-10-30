# Visual PRD — Gray Meadow 3D restyle (route A: visuals first)

Refs: `refs/meadow.jpg` (world vista), `refs/characters.jpg` (traveler + wisp).
Target feel: golden-hour meadow, soft clouds, glowing flowers, light particles;
small cloaked traveler + white-gold wisp. Original assets only.

## Light rig (numbers)
- Sky: gradient dome (top #7FB2E5 → horizon #F6D9A8), sun halo sprite at sun dir.
- Fog: color #EED9B4, near 60, far 220.
- Hemisphere: sky #BFD9FF / ground #8A9A7B, intensity 0.9.
- Sun: DirectionalLight #FFE3B3 intensity 2.6, pos (40, 60, 20), shadows 2048,
  ortho box ±70, bias -0.0004.
- Renderer: ACESFilmic, exposure 1.05, shadows PCFSoft.

## Material recipe
- Characters/props/trees: MeshToonMaterial, 4-step gradient ramp, warm shadow
  fill via hemisphere ground color.
- Ground: MeshStandardMaterial roughness 1.0, vertex-color patches
  (#7FA35A base → #A9C46B sunlit).
- Glow (wisp core, flowers, particles): emissive + additive sprites.
- Palette anchors: cloak #2E3A44, scarf #D9B36a, skin #F2C9A0,
  wisp #FFF3CF, flower accents pink #FFB3D9 / blue #9AD9FF / gold #FFD97A.

## Parts (9)
1. Meadow disc r=55 + color patches 2. Sky dome + sun halo + 8 cloud billboards
3. Far mountain ring (cones, fog-faded) 4. Stone arch landmark
5. 5 low-poly trees (trunk + icosphere canopy) 6. 600 grass tufts (instanced)
7. 150 glowing flowers (instanced) 8. Traveler (cloak/head/scarf/eyes) + wisp
9. Fireflies (120 ambient points) + ritual burst points

## Camera & motion
- Third-person follow: dist 14, height 8, lookAt player+2y, FOV 55.
- Drag orbits yaw (±pitch clamp 0.1–1.1 rad); smoothing k=6/s.
- Move 8 m/s camera-relative, jump 8 m/s, gravity 22.

## Acceptance (preview screenshot vs refs)
- [ ] Golden-hour warmth readable in one glance (no flat gray noon look)
- [ ] Traveler + wisp silhouette clear at spawn framing
- [ ] Flowers/particles visible without noise; clouds soft, not blocky
- [ ] 30+ FPS on a mid laptop (no per-frame allocations in tick)
- [ ] Reduced-motion: bursts become a static halo ring
