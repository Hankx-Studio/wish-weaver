# SpiritCompanion — Main Story Arc (v1, hackathon slice)

Tone: Zelda × Sky × Ghibli. Warm, quiet, hopeful. All UI text in English.
Total playtime target: ~10 minutes. Voice: none (text + music + visuals).

## Premise (30 seconds, intro overlay)

> The Tree of Light is going dark. The meadow's spirit chose you —
> a traveler with nowhere else to be — and woke you at dawn.
> Guide your wisp. Gather three blessings. Relight the tree.

Intro plays as text cards over the live meadow (letterboxed), then control begins.

## Cast (reuse Stage-3 NPC designs)

- **Wisp** (companion): wordless; reacts with hops/glows. Tutorializes by leading.
- **Butler (Rowan)**: plaza guide. Gives the quest, marks the fountain blessing.
- **Shopkeeper (Mabel)**: gives the hearth blessing after a fetch micro-task
  (pick 3 sun-apples near the shop — teaches movement + interact).
- **Elder (Sage Ilsa)**: at the tree steps, gives the root blessing after the
  other two (teaches order/progress).
- **Flower Kid (Poppy) + Gardener (Bram)**: flavor + hints, no gating.

## Beats

1. **Wake** (spawn): intro cards → wisp appears → follow-the-wisp to plaza.
2. **Rowan**: dialogue (3 lines) → fountain blessing #1 (interact E at fountain).
3. **Mabel**: dialogue → collect 3 sun-apples (glowing pickups) → blessing #2.
4. **Ilsa**: locked until #1+#2 → blessing #3 at the tree door.
5. **Relight**: tree canopy flares pink-gold, lanterns ignite in sequence,
   fireflies swarm, music swells → "The meadow remembers light." → END card
   with restart + tease ("Chapter 2: the Sunken Shrine — coming soon").

## Systems needed (for builders)

- Interact (E / tap): nearest interactable within 2.5u, prompt label.
- Dialogue box: speaker name + 1–3 lines + advance key; queues beats.
- Blessing HUD: 3 empty slots → fill; chime per fill (existing audio).
- Pickups: bob + spin + collect burst (reuse ParticleField pattern).
- Ending trigger: all 3 at tree door → timeline (canopy emissive ramp,
  lantern ignite stagger, firefly burst, fade card).

## Non-goals (v1)

No combat, no multiplayer, no save persistence, no shop economy.
Spells (W1 local ritual) stay as expressive toys, not quest-gated.
