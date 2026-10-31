# B-Plan Contract (Leader-owned, do not change without asking)

Branch: feat/bplan-forest-mall. Goal: native-quality line (方案 B) while the Web
build stays the submittable demo. One forest scene: fountain plaza + Tree of Life
+ market stall, then shop talk -> buy flow, plus a /donate page on the web side.

## Renderer
- Desktop/native: Forward+ (godot/project.godot rendering_method=forward_plus).
- Web: gl_compatibility via rendering_method.web override. Do not remove it.
- Keep every runtime look identical on both; verify with headless run.

## Files ownership
- Leader: project.godot, export_presets.cfg, game.gd, dialogue.gd, main.gd,
  npc.gd wiring, .gitignore, this file.
- Worker Shop: ONLY new files godot/scripts/shop.gd (+ optional items consts
  inside shop.gd). Do not edit existing files.
- Worker Donate: ONLY new files under src/app/(app)/donate/. Do not edit
  existing files.
- Worker Forest: ONLY godot/scripts/meadow.gd. Keep build(), ground_height(),
  MEADOW_R signatures.

## Shop contract (Game autoload additions by Leader)
- Game.gold:int (start 120), Game.inventory:Dictionary (id->count),
  Game.spend_gold(n)->bool, Game.add_gold(n), Game.add_item(id,n).
  save/load persist gold+inventory.
- ShopUI (shop.gd): CanvasLayer class_name ShopUI, static make()->ShopUI,
  open(), close(), var is_open. Panel with: title "Mabel's Stall", gold label,
  item rows (name, price, Buy button), Close button. Buy: if gold>=price:
  spend, add_item, refresh labels, Main.ui().flash("Bought <name>"); else flash
  "Not enough coins". Freeze pattern: player must not move while open
  (Main checks ShopUI like spell bar; Leader wires).
- Catalog (id, name, price): star_gel "Star Gel" 30, moon_petal "Moon Petal" 45,
  lantern_wick "Lantern Wick" 60, fairy_dust "Fairy Dust" 80,
  blessing_candle "Blessing Candle" 100.
- Flow: talk to Mabel -> dialogue closes -> shop opens -> buy with coins ->
  close -> roam. Wiring (closed signal + Mabel hook) is Leader's job.

## Donate page contract
- Route /donate, server component, English copy, same visual tone as /play.
- Cards: ICRC (https://www.icrc.org/en/donate), MSF
  (https://www.msf.org/donate). Buttons open official sites in new tab.
- Honesty: this demo never collects money; add line "Donations are made on the
  organizations' official sites; this page only links out." No fake checkout.
- Verification: npx tsc --noEmit passes.

## Acceptance (all workers)
- Godot: `Godot --headless --path godot --quit-after 120` prints
  "Main scene ready", zero errors.
- Report: files changed, checks run + result, judgment calls made.
- Do not commit. Do not edit files outside your ownership.
