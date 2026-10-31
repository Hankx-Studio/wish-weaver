# Game: quest state, blessings, local save. Autoloaded.
extends Node

signal blessing_earned(id: String)
signal quest_stage_changed(stage: String)
signal game_completed

const SAVE_PATH := "user://spirit_save.cfg"
const BLESSINGS := ["harvest", "water", "heart"]

var stage: String = "intro"  # intro -> roam -> ending -> done
var blessings: Dictionary = {"harvest": false, "water": false, "heart": false}
var apples: int = 0
var met_rowan: bool = false
var met_mabel: bool = false
var met_ilsa: bool = false
var spells_cast: int = 0
var last_spell_source: String = ""  # meta_live | local_rule

func _ready() -> void:
	load_progress()

func blessing_count() -> int:
	var n := 0
	for k in BLESSINGS:
		if blessings.get(k, false):
			n += 1
	return n

func earn(id: String) -> void:
	if blessings.get(id, false):
		return
	blessings[id] = true
	blessing_earned.emit(id)
	print("[QUEST] blessing earned: ", id)
	save_progress()
	if blessing_count() >= 3:
		stage = "ending"
		quest_stage_changed.emit(stage)

func add_apple() -> void:
	apples = min(apples + 1, 3)
	print("[QUEST] apple ", apples, "/3")
	if apples >= 3:
		earn("harvest")
	else:
		save_progress()

func set_stage(s: String) -> void:
	stage = s
	quest_stage_changed.emit(s)
	save_progress()

func complete_game() -> void:
	stage = "done"
	game_completed.emit()
	save_progress()

func objective_text() -> String:
	if not met_rowan:
		return "Find Rowan by the fountain."
	if not blessings["harvest"]:
		return "Gather star-apples. (%d/3)" % apples
	if not blessings["water"]:
		return "Cast a spell at the fountain. (Press Q)"
	if not blessings["heart"]:
		if not met_mabel:
			return "Visit Mabel at the market stall."
		return "Find Ilsa in the plaza."
	if stage == "ending":
		return "The Tree door is open. Step inside."
	return "The meadow remembers light."

func save_progress() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("quest", "stage", stage)
	cfg.set_value("quest", "blessings", blessings)
	cfg.set_value("quest", "apples", apples)
	cfg.set_value("quest", "met", [met_rowan, met_mabel, met_ilsa])
	cfg.set_value("quest", "spells", spells_cast)
	cfg.save(SAVE_PATH)

func load_progress() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) != OK:
		return
	stage = str(cfg.get_value("quest", "stage", "intro"))
	var b: Dictionary = cfg.get_value("quest", "blessings", blessings)
	for k in BLESSINGS:
		blessings[k] = bool(b.get(k, false))
	apples = int(cfg.get_value("quest", "apples", 0))
	var m: Array = cfg.get_value("quest", "met", [false, false, false])
	met_rowan = bool(m[0]) if m.size() > 0 else false
	met_mabel = bool(m[1]) if m.size() > 1 else false
	met_ilsa = bool(m[2]) if m.size() > 2 else false
	spells_cast = int(cfg.get_value("quest", "spells", 0))
	if stage == "done":
		stage = "ending"  # allow re-entry to ending; completion re-saves
