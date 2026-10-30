extends CanvasLayer
## Letterboxed text cards over the live scene (intro) + the END card.
## play_cards(cards): advance on E / Space / click, auto-advance timer,
## skippable via Skip button or S. show_end_card(): title + restart button.
class_name IntroCards

signal intro_finished
signal end_shown

const INPUT_GRACE_MSEC := 300

var _cards: Array = []
var _index := 0
var _playing := false
var _end_visible := false
var _auto := 5.0
var _timer := 0.0
var _shown_msec := 0
var _end_msec := 0

var _top: ColorRect = null
var _bottom: ColorRect = null
var _card_panel: PanelContainer = null
var _card_label: Label = null
var _skip_btn: Button = null
var _end_panel: PanelContainer = null
var _end_title: Label = null
var _end_body: Label = null
var _tease: Label = null


func _ready() -> void:
	add_to_group("intro_cards")
	_top = get_node_or_null("TopBar") as ColorRect
	_bottom = get_node_or_null("BottomBar") as ColorRect
	_card_panel = get_node_or_null("CardPanel") as PanelContainer
	_card_label = get_node_or_null("CardPanel/Margin/VBox/CardLabel") as Label
	_skip_btn = get_node_or_null("SkipButton") as Button
	_end_panel = get_node_or_null("EndPanel") as PanelContainer
	_end_title = get_node_or_null("EndPanel/Margin/VBox/EndTitle") as Label
	_end_body = get_node_or_null("EndPanel/Margin/VBox/EndBody") as Label
	_tease = get_node_or_null("EndPanel/Margin/VBox/TeaseLabel") as Label
	if _top == null or _bottom == null or _card_panel == null or _card_label == null \
			or _skip_btn == null or _end_panel == null:
		_build_ui()
	_wire_buttons()
	hide_all()


func play_cards(cards: Array, auto_seconds := 5.0) -> void:
	_cards = cards.duplicate()
	_index = 0
	_auto = auto_seconds
	_timer = 0.0
	_end_visible = false
	_end_panel.visible = false
	if _cards.is_empty():
		_finish_intro()
		return
	_playing = true
	_top.visible = true
	_bottom.visible = true
	_card_panel.visible = true
	_skip_btn.visible = true
	_show_current()


func is_playing() -> bool:
	return _playing


func is_showing() -> bool:
	return _playing or _end_visible


func is_end_visible() -> bool:
	return _end_visible


func advance() -> void:
	if not _playing:
		return
	if Time.get_ticks_msec() - _shown_msec < INPUT_GRACE_MSEC:
		return
	_index += 1
	_timer = 0.0
	if _index >= _cards.size():
		_finish_intro()
	else:
		_show_current()


func skip() -> void:
	if _playing:
		_finish_intro()


func show_end_card(title := "The meadow remembers light.",
		body := "Three blessings burn as one. The canopy flares pink-gold, and the dark thins like morning mist.",
		tease := "Chapter 2: the Sunken Shrine — coming soon") -> void:
	_playing = false
	_cards.clear()
	_end_visible = true
	_top.visible = true
	_bottom.visible = true
	_card_panel.visible = false
	_skip_btn.visible = false
	_end_title.text = title
	_end_body.text = body
	_tease.text = tease
	_end_panel.visible = true
	_end_msec = Time.get_ticks_msec()
	end_shown.emit()


func hide_all() -> void:
	_playing = false
	_end_visible = false
	_top.visible = false
	_bottom.visible = false
	_card_panel.visible = false
	_skip_btn.visible = false
	_end_panel.visible = false


func restart_game() -> void:
	get_tree().reload_current_scene()


func _process(delta: float) -> void:
	if not _playing:
		return
	if _auto <= 0.0:
		return
	_timer += delta
	if _timer >= _auto:
		_timer = 0.0
		advance()


func _unhandled_input(event: InputEvent) -> void:
	if _end_visible:
		if Time.get_ticks_msec() - _end_msec < 1000:
			return
		if event is InputEventKey:
			var k := event as InputEventKey
			if k.pressed and not k.echo and (k.physical_keycode == KEY_R or k.physical_keycode == KEY_SPACE):
				restart_game()
		return
	if not _playing:
		return
	if event is InputEventKey:
		var k := event as InputEventKey
		if k.pressed and not k.echo:
			if k.physical_keycode == KEY_S:
				skip()
				get_viewport().set_input_as_handled()
			elif k.physical_keycode == KEY_E or k.physical_keycode == KEY_SPACE:
				advance()
				get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton:
		var m := event as InputEventMouseButton
		if m.pressed and m.button_index == MOUSE_BUTTON_LEFT:
			advance()
			get_viewport().set_input_as_handled()
	elif event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed:
			advance()
			get_viewport().set_input_as_handled()


func _on_card_gui_input(event: InputEvent) -> void:
	if not _playing:
		return
	if event is InputEventMouseButton:
		var m := event as InputEventMouseButton
		if m.pressed and m.button_index == MOUSE_BUTTON_LEFT:
			advance()
	elif event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed:
			advance()


func _show_current() -> void:
	_card_label.text = str(_cards[_index])
	_shown_msec = Time.get_ticks_msec()


func _finish_intro() -> void:
	_playing = false
	_cards.clear()
	_top.visible = false
	_bottom.visible = false
	_card_panel.visible = false
	_skip_btn.visible = false
	intro_finished.emit()


func _wire_buttons() -> void:
	if _skip_btn != null and not _skip_btn.pressed.is_connected(skip):
		_skip_btn.pressed.connect(skip)
	if not _card_panel.gui_input.is_connected(_on_card_gui_input):
		_card_panel.gui_input.connect(_on_card_gui_input)
	var restart_btn := _end_panel.get_node_or_null("Margin/VBox/RestartButton") as Button
	if restart_btn != null and not restart_btn.pressed.is_connected(restart_game):
		restart_btn.pressed.connect(restart_game)


func _make_bar(bar_name: String, top: bool) -> ColorRect:
	var bar := ColorRect.new()
	bar.name = bar_name
	bar.color = Color(0, 0, 0, 1)
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.anchor_right = 1.0
	if top:
		bar.offset_bottom = 90.0
	else:
		bar.anchor_top = 1.0
		bar.anchor_bottom = 1.0
		bar.offset_top = -90.0
	add_child(bar)
	return bar


func _make_margin(parent: Control) -> VBoxContainer:
	var margin := MarginContainer.new()
	margin.name = "Margin"
	margin.add_theme_constant_override("margin_left", 36)
	margin.add_theme_constant_override("margin_top", 28)
	margin.add_theme_constant_override("margin_right", 36)
	margin.add_theme_constant_override("margin_bottom", 28)
	parent.add_child(margin)
	var vbox := VBoxContainer.new()
	vbox.name = "VBox"
	vbox.add_theme_constant_override("separation", 16)
	margin.add_child(vbox)
	return vbox


func _build_ui() -> void:
	if _top == null:
		_top = _make_bar("TopBar", true)
	if _bottom == null:
		_bottom = _make_bar("BottomBar", false)
	if _card_panel == null:
		_card_panel = PanelContainer.new()
		_card_panel.name = "CardPanel"
		_card_panel.anchor_left = 0.5
		_card_panel.anchor_top = 0.5
		_card_panel.anchor_right = 0.5
		_card_panel.anchor_bottom = 0.5
		_card_panel.offset_left = -430.0
		_card_panel.offset_top = -120.0
		_card_panel.offset_right = 430.0
		_card_panel.offset_bottom = 120.0
		_card_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
		_card_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
		add_child(_card_panel)
	var vbox := _card_panel.get_node_or_null("Margin/VBox") as VBoxContainer
	if vbox == null:
		vbox = _make_margin(_card_panel)
	if _card_label == null:
		_card_label = Label.new()
		_card_label.name = "CardLabel"
		_card_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_card_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		_card_label.autowrap_mode = TextServer.AUTOWRAP_WORD
		_card_label.add_theme_font_size_override("font_size", 36)
		vbox.add_child(_card_label)
	if vbox.get_node_or_null("HintLabel") == null:
		var hint := Label.new()
		hint.name = "HintLabel"
		hint.text = "E / Space / Click: continue      S: skip"
		hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		hint.add_theme_font_size_override("font_size", 20)
		hint.modulate = Color(1, 1, 1, 0.7)
		vbox.add_child(hint)
	if _skip_btn == null:
		_skip_btn = Button.new()
		_skip_btn.name = "SkipButton"
		_skip_btn.text = "Skip"
		_skip_btn.add_theme_font_size_override("font_size", 24)
		_skip_btn.anchor_left = 1.0
		_skip_btn.anchor_right = 1.0
		_skip_btn.offset_left = -190.0
		_skip_btn.offset_top = 110.0
		_skip_btn.offset_right = -40.0
		_skip_btn.offset_bottom = 160.0
		add_child(_skip_btn)
	if _end_panel == null:
		_end_panel = PanelContainer.new()
		_end_panel.name = "EndPanel"
		_end_panel.anchor_left = 0.5
		_end_panel.anchor_top = 0.5
		_end_panel.anchor_right = 0.5
		_end_panel.anchor_bottom = 0.5
		_end_panel.offset_left = -450.0
		_end_panel.offset_top = -200.0
		_end_panel.offset_right = 450.0
		_end_panel.offset_bottom = 200.0
		_end_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
		_end_panel.grow_vertical = Control.GROW_DIRECTION_BOTH
		add_child(_end_panel)
	var evbox := _end_panel.get_node_or_null("Margin/VBox") as VBoxContainer
	if evbox == null:
		evbox = _make_margin(_end_panel)
	if _end_title == null:
		_end_title = Label.new()
		_end_title.name = "EndTitle"
		_end_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_end_title.autowrap_mode = TextServer.AUTOWRAP_WORD
		_end_title.add_theme_font_size_override("font_size", 44)
		_end_title.add_theme_color_override("font_color", Color(1.0, 0.9, 0.6))
		evbox.add_child(_end_title)
	if _end_body == null:
		_end_body = Label.new()
		_end_body.name = "EndBody"
		_end_body.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_end_body.autowrap_mode = TextServer.AUTOWRAP_WORD
		_end_body.add_theme_font_size_override("font_size", 30)
		evbox.add_child(_end_body)
	if _tease == null:
		_tease = Label.new()
		_tease.name = "TeaseLabel"
		_tease.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_tease.add_theme_font_size_override("font_size", 22)
		_tease.modulate = Color(1, 1, 1, 0.75)
		evbox.add_child(_tease)
	if evbox.get_node_or_null("RestartButton") == null:
		var restart_btn := Button.new()
		restart_btn.name = "RestartButton"
		restart_btn.text = "Begin Again"
		restart_btn.custom_minimum_size = Vector2(0, 64)
		restart_btn.add_theme_font_size_override("font_size", 30)
		evbox.add_child(restart_btn)
