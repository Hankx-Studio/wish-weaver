extends CanvasLayer
## Bottom dialogue box: speaker name + lines, advance on E / Space / click.
## Beats can be queued with queue_dialogue(); dialogue_finished fires when
## the current box AND the queue are exhausted. Default theme, big text.
class_name DialogueBox

signal dialogue_finished

const INPUT_GRACE_MSEC := 250

var _speaker_name := ""
var _lines: Array = []
var _queue: Array = []
var _index := 0
var _active := false
var _shown_msec := 0

var _panel: PanelContainer = null
var _speaker: Label = null
var _body: Label = null


func _ready() -> void:
	add_to_group("dialogue_box")
	_panel = get_node_or_null("Panel") as PanelContainer
	_speaker = get_node_or_null("Panel/Margin/VBox/SpeakerLabel") as Label
	_body = get_node_or_null("Panel/Margin/VBox/LinesLabel") as Label
	if _panel == null or _speaker == null or _body == null:
		_build_ui()
	if not _panel.gui_input.is_connected(_on_panel_gui_input):
		_panel.gui_input.connect(_on_panel_gui_input)
	_panel.visible = false
	_active = false


func show_dialogue(speaker_name: String, lines: Array) -> void:
	_queue.clear()
	_begin(speaker_name, lines)


func queue_dialogue(speaker_name: String, lines: Array) -> void:
	if not _active:
		_begin(speaker_name, lines)
	else:
		_queue.append([speaker_name, lines.duplicate()])


func is_active() -> bool:
	return _active


func advance() -> void:
	if not _active:
		return
	if Time.get_ticks_msec() - _shown_msec < INPUT_GRACE_MSEC:
		return
	_index += 1
	if _index >= _lines.size():
		if not _queue.is_empty():
			var next: Array = _queue.pop_front()
			_begin(str(next[0]), next[1])
		else:
			_finish()
	else:
		_show_current()


func close() -> void:
	if _active:
		_finish()


func _unhandled_input(event: InputEvent) -> void:
	if not _active:
		return
	var go := false
	if event is InputEventKey:
		var k := event as InputEventKey
		if k.pressed and not k.echo and (k.physical_keycode == KEY_E or k.physical_keycode == KEY_SPACE):
			go = true
	elif event is InputEventMouseButton:
		var m := event as InputEventMouseButton
		if m.pressed and m.button_index == MOUSE_BUTTON_LEFT:
			go = true
	elif event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed:
			go = true
	if go:
		advance()
		get_viewport().set_input_as_handled()


func _on_panel_gui_input(event: InputEvent) -> void:
	if not _active:
		return
	if event is InputEventMouseButton:
		var m := event as InputEventMouseButton
		if m.pressed and m.button_index == MOUSE_BUTTON_LEFT:
			advance()
	elif event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed:
			advance()


func _begin(speaker_name: String, lines: Array) -> void:
	_speaker_name = speaker_name
	_lines = lines.duplicate()
	_index = 0
	_active = true
	if _lines.is_empty():
		_finish()
		return
	_panel.visible = true
	_show_current()


func _show_current() -> void:
	_speaker.text = _speaker_name
	_body.text = str(_lines[_index])
	_shown_msec = Time.get_ticks_msec()


func _finish() -> void:
	_active = false
	_lines.clear()
	_panel.visible = false
	dialogue_finished.emit()


func _build_ui() -> void:
	if _panel == null:
		_panel = PanelContainer.new()
		_panel.name = "Panel"
		_panel.anchor_top = 1.0
		_panel.anchor_right = 1.0
		_panel.anchor_bottom = 1.0
		_panel.offset_left = 48.0
		_panel.offset_top = -280.0
		_panel.offset_right = -48.0
		_panel.offset_bottom = -48.0
		_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
		_panel.grow_vertical = Control.GROW_DIRECTION_BEGIN
		add_child(_panel)
	var margin := _panel.get_node_or_null("Margin") as MarginContainer
	if margin == null:
		margin = MarginContainer.new()
		margin.name = "Margin"
		margin.add_theme_constant_override("margin_left", 28)
		margin.add_theme_constant_override("margin_top", 20)
		margin.add_theme_constant_override("margin_right", 28)
		margin.add_theme_constant_override("margin_bottom", 20)
		_panel.add_child(margin)
	var vbox := margin.get_node_or_null("VBox") as VBoxContainer
	if vbox == null:
		vbox = VBoxContainer.new()
		vbox.name = "VBox"
		vbox.add_theme_constant_override("separation", 12)
		margin.add_child(vbox)
	if _speaker == null:
		_speaker = Label.new()
		_speaker.name = "SpeakerLabel"
		_speaker.add_theme_font_size_override("font_size", 30)
		_speaker.add_theme_color_override("font_color", Color(0.95, 0.78, 0.42))
		vbox.add_child(_speaker)
	if _body == null:
		_body = Label.new()
		_body.name = "LinesLabel"
		_body.add_theme_font_size_override("font_size", 34)
		_body.autowrap_mode = TextServer.AUTOWRAP_WORD
		vbox.add_child(_body)
	if vbox.get_node_or_null("HintLabel") == null:
		var hint := Label.new()
		hint.name = "HintLabel"
		hint.text = "E / Space / Click to continue"
		hint.add_theme_font_size_override("font_size", 20)
		hint.modulate = Color(1, 1, 1, 0.7)
		vbox.add_child(hint)
