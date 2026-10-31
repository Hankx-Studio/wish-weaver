# DialogueBox: typewriter lines, E/click to advance.
class_name DialogueBox
extends CanvasLayer

var panel: PanelContainer
var label: Label
var hint: Label
var lines: Array[String] = []
var idx := 0
var chars := 0.0
var active := false
const CPS := 45.0

static func make() -> DialogueBox:
	var d := DialogueBox.new()
	d.name = "Dialogue"
	d.layer = 10
	var p := PanelContainer.new()
	p.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	p.position = Vector2(-400, -220)
	p.custom_minimum_size = Vector2(800, 150)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.08, 0.1, 0.16, 0.88)
	sb.corner_radius_top_left = 16
	sb.corner_radius_top_right = 16
	sb.corner_radius_bottom_left = 16
	sb.corner_radius_bottom_right = 16
	sb.content_margin_left = 28
	sb.content_margin_right = 28
	sb.content_margin_top = 20
	sb.content_margin_bottom = 20
	p.add_theme_stylebox_override("panel", sb)
	d.add_child(p)
	d.panel = p
	var vb := VBoxContainer.new()
	p.add_child(vb)
	var l := Label.new()
	l.add_theme_font_size_override("font_size", 24)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(740, 90)
	vb.add_child(l)
	d.label = l
	var hh := Label.new()
	hh.text = "[E] continue"
	hh.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	hh.add_theme_font_size_override("font_size", 15)
	hh.add_theme_color_override("font_color", Color(1, 1, 1, 0.6))
	vb.add_child(hh)
	d.hint = hh
	p.visible = false
	return d

var guard := 0.0

func say(dlg: Array) -> void:
	lines.clear()
	for s in dlg:
		lines.append(str(s))
	idx = 0
	chars = 0.0
	guard = 0.3
	active = true
	panel.visible = true
	label.text = ""
	get_tree().paused = false  # world keeps breathing; player input gated by Main

func _process(dt: float) -> void:
	if not active:
		return
	guard = max(0.0, guard - dt)
	var full: String = lines[idx]
	if chars < full.length():
		chars = min(float(full.length()), chars + CPS * dt)
		label.text = full.substr(0, int(chars))
	if guard <= 0.0 and Input.is_action_just_pressed("interact"):
		_advance()

func _advance() -> void:
	var full: String = lines[idx]
	if chars < full.length():
		chars = float(full.length())
		label.text = full
		return
	idx += 1
	if idx >= lines.size():
		close()
	else:
		chars = 0.0
		label.text = ""

func close() -> void:
	active = false
	panel.visible = false
	if Main.I != null:
		Main.ui().refresh()
