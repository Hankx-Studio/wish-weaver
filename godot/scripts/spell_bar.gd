# SpellBar: Q opens input, Enter casts via Net (Meta live or local fallback).
class_name SpellBar
extends CanvasLayer

var panel: PanelContainer
var edit: LineEdit
var status: Label
var open := false

static func make() -> SpellBar:
	var s := SpellBar.new()
	s.name = "SpellBar"
	s.layer = 15
	var p := PanelContainer.new()
	p.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	p.position = Vector2(-350, -260)
	p.custom_minimum_size = Vector2(700, 120)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.08, 0.1, 0.18, 0.92)
	sb.corner_radius_top_left = 14
	sb.corner_radius_top_right = 14
	sb.corner_radius_bottom_left = 14
	sb.corner_radius_bottom_right = 14
	sb.content_margin_left = 24
	sb.content_margin_right = 24
	sb.content_margin_top = 16
	sb.content_margin_bottom = 16
	p.add_theme_stylebox_override("panel", sb)
	s.add_child(p)
	s.panel = p
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 8)
	p.add_child(vb)
	var title := Label.new()
	title.text = "Speak a spell — a word, a wish, anything."
	title.add_theme_font_size_override("font_size", 18)
	vb.add_child(title)
	var e := LineEdit.new()
	e.placeholder_text = "e.g. bloom / rain / light the dark…"
	e.add_theme_font_size_override("font_size", 22)
	e.custom_minimum_size = Vector2(640, 44)
	vb.add_child(e)
	s.edit = e
	var st := Label.new()
	st.add_theme_font_size_override("font_size", 14)
	st.add_theme_color_override("font_color", Color(1, 1, 1, 0.6))
	vb.add_child(st)
	s.status = st
	e.text_submitted.connect(func(_t: String) -> void: s.cast())
	p.visible = false
	return s

func _ready() -> void:
	Net.spell_resolved.connect(_on_resolved)

func toggle() -> void:
	open = not open
	panel.visible = open
	if open:
		edit.text = ""
		status.text = "Enter to cast · Q to close"
		edit.grab_focus()
	else:
		edit.release_focus()

func open_bar() -> void:
	if not open:
		toggle()

func cast() -> void:
	var t := edit.text.strip_edges()
	if t == "":
		status.text = "Whisper something first."
		return
	status.text = "Listening…"
	Net.cast_spell(t)

func _on_resolved(d: Dictionary) -> void:
	toggle()
	var col: Color = Color(1, 1, 1)
	var c: Array = d.get("color", [1, 1, 1])
	col = Color(float(c[0]), float(c[1]), float(c[2]))
	var tag := "[Meta Muse]" if str(d.get("source", "")) == "meta_live" else "[on-device]"
	Main.ui().flash("%s answered: %s  (%s)" % [tag, str(d.get("effect", "sparkle")), str(d.get("text", ""))])
	Main.ui().refresh()
	Main.fx_burst(Main.player_pos() + Vector3(0, 1.5, 0), col)
	Main.fairy_celebrate()
	Main.on_spell_cast(d)
