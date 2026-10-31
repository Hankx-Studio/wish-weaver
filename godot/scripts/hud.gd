# HUD: objective, blessing pips, interact prompt, flash toast, spell source label.
class_name HUD
extends CanvasLayer

var objective: Label
var coins: Label
var pips: HBoxContainer
var prompt: Label
var flash_label: Label
var source_label: Label
var _flash_t := 0.0

static func make() -> HUD:
	var h := HUD.new()
	h.name = "HUD"
	var obj := Label.new()
	obj.name = "Objective"
	obj.set_anchors_preset(Control.PRESET_TOP_LEFT)
	obj.position = Vector2(24, 20)
	obj.add_theme_font_size_override("font_size", 22)
	obj.add_theme_color_override("font_color", Color(1, 1, 1))
	obj.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	obj.add_theme_constant_override("shadow_offset_x", 2)
	obj.add_theme_constant_override("shadow_offset_y", 2)
	h.add_child(obj)
	h.objective = obj
	var coin := Label.new()
	coin.name = "Coins"
	coin.set_anchors_preset(Control.PRESET_TOP_LEFT)
	coin.position = Vector2(24, 52)
	coin.add_theme_font_size_override("font_size", 17)
	coin.add_theme_color_override("font_color", Color(1.0, 0.85, 0.4))
	coin.add_theme_constant_override("outline_size", 5)
	coin.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	h.add_child(coin)
	h.coins = coin
	var pip := HBoxContainer.new()
	pip.name = "Pips"
	pip.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	pip.position = Vector2(-220, 20)
	pip.add_theme_constant_override("separation", 12)
	h.add_child(pip)
	h.pips = pip
	for id in Game.BLESSINGS:
		var l := Label.new()
		l.name = "pip_" + id
		l.text = "[ ]"
		l.add_theme_font_size_override("font_size", 26)
		l.add_theme_constant_override("outline_size", 6)
		l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		pip.add_child(l)
	var pr := Label.new()
	pr.name = "Prompt"
	pr.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	pr.position = Vector2(-160, -140)
	pr.custom_minimum_size = Vector2(320, 40)
	pr.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pr.add_theme_font_size_override("font_size", 22)
	pr.add_theme_color_override("font_color", Color(1, 0.95, 0.75))
	pr.visible = false
	h.add_child(pr)
	h.prompt = pr
	var fl := Label.new()
	fl.name = "Flash"
	fl.set_anchors_preset(Control.PRESET_CENTER_TOP)
	fl.position = Vector2(-300, 90)
	fl.custom_minimum_size = Vector2(600, 44)
	fl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	fl.add_theme_font_size_override("font_size", 28)
	fl.modulate.a = 0.0
	h.add_child(fl)
	h.flash_label = fl
	var src := Label.new()
	src.name = "Source"
	src.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	src.position = Vector2(24, -48)
	src.add_theme_font_size_override("font_size", 15)
	src.add_theme_color_override("font_color", Color(1, 1, 1, 0.75))
	h.add_child(src)
	h.source_label = src
	var controls := Label.new()
	controls.name = "Controls"
	controls.text = "WASD move · E interact · Q spell · Space jump"
	controls.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	controls.position = Vector2(-470, -36)
	controls.custom_minimum_size = Vector2(446, 24)
	controls.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	controls.add_theme_font_size_override("font_size", 14)
	controls.add_theme_color_override("font_color", Color(1, 1, 1, 0.72))
	controls.add_theme_constant_override("outline_size", 5)
	controls.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	h.add_child(controls)
	return h

func _ready() -> void:
	Game.blessing_earned.connect(func(_id: String) -> void: refresh())
	Game.quest_stage_changed.connect(func(_s: String) -> void: refresh())
	refresh()

func refresh() -> void:
	objective.text = Game.objective_text()
	if coins:
		coins.text = "Coins: %d" % Game.gold
	for id in Game.BLESSINGS:
		var l := pips.get_node("pip_" + id) as Label
		if Game.blessings[id]:
			l.text = "[x]"
			l.add_theme_color_override("font_color", Color(1.0, 0.85, 0.4))
		else:
			l.text = "[ ]"
			l.add_theme_color_override("font_color", Color(1, 1, 1, 0.8))
	if Game.last_spell_source == "":
		source_label.text = ""
	elif Game.last_spell_source == "meta_live":
		source_label.text = "[live] spell answered by Meta Muse"
	else:
		source_label.text = "[local] spell answered on-device (rules)"

func show_prompt(t: String) -> void:
	prompt.text = t
	prompt.visible = true

func hide_prompt() -> void:
	prompt.visible = false

func flash(t: String) -> void:
	flash_label.text = t
	_flash_t = 2.2
	flash_label.modulate.a = 1.0

func _process(dt: float) -> void:
	if _flash_t > 0.0:
		_flash_t -= dt
		flash_label.modulate.a = clamp(_flash_t / 1.0, 0.0, 1.0)
