extends CanvasLayer
## Blessing HUD: 3 top-center slots. fill(i) lights slot i gold and fires
## the chime hook (signal chime(i) + optional ChimePlayer / "audio" group).
class_name BlessingHUD

signal chime(index: int)

const SLOT_COUNT := 3
const SLOT_TITLES: Array[String] = ["I", "II", "III"]

var _filled: Array[bool] = [false, false, false]
var _slots: Array[PanelContainer] = []
var _labels: Array[Label] = []


func _ready() -> void:
	add_to_group("blessing_hud")
	_collect_slots()
	_refresh()


func fill(i: int) -> void:
	if i < 0 or i >= SLOT_COUNT:
		return
	if _filled[i]:
		return
	_filled[i] = true
	_refresh()
	chime.emit(i)
	_play_chime(i)


func is_filled(i: int) -> bool:
	if i < 0 or i >= SLOT_COUNT:
		return false
	return _filled[i]


func filled_count() -> int:
	var n := 0
	for f in _filled:
		if f:
			n += 1
	return n


func reset() -> void:
	for i in SLOT_COUNT:
		_filled[i] = false
	_refresh()


func _collect_slots() -> void:
	_slots.clear()
	_labels.clear()
	var bar := get_node_or_null("TopBar") as HBoxContainer
	if bar == null:
		bar = _build_bar()
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for i in SLOT_COUNT:
		var slot := bar.get_node_or_null("Slot%d" % i) as PanelContainer
		if slot == null:
			slot = _build_slot(bar, i)
		slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var label := slot.get_node_or_null("Label") as Label
		if label == null:
			label = _build_slot_label(slot, i)
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_slots.append(slot)
		_labels.append(label)


func _refresh() -> void:
	for i in _slots.size():
		var slot := _slots[i]
		var label := _labels[i]
		var on := i < _filled.size() and _filled[i]
		var sb := StyleBoxFlat.new()
		sb.corner_radius_top_left = 12
		sb.corner_radius_top_right = 12
		sb.corner_radius_bottom_left = 12
		sb.corner_radius_bottom_right = 12
		sb.border_width_left = 3
		sb.border_width_top = 3
		sb.border_width_right = 3
		sb.border_width_bottom = 3
		if on:
			sb.bg_color = Color(0.91, 0.78, 0.47, 0.95)
			sb.border_color = Color(1, 1, 1, 0.95)
			label.add_theme_color_override("font_color", Color(0.27, 0.3, 0.4))
		else:
			sb.bg_color = Color(0.27, 0.3, 0.4, 0.6)
			sb.border_color = Color(0.95, 0.92, 0.87, 0.5)
			label.add_theme_color_override("font_color", Color(0.95, 0.92, 0.87, 0.9))
		slot.add_theme_stylebox_override("panel", sb)


func _play_chime(i: int) -> void:
	var player := get_node_or_null("ChimePlayer") as AudioStreamPlayer
	if player != null and player.stream != null:
		player.play()
	for n in get_tree().get_nodes_in_group("audio"):
		if n != null and is_instance_valid(n) and n.has_method("play_chime"):
			n.call("play_chime", i)


func _build_bar() -> HBoxContainer:
	var bar := HBoxContainer.new()
	bar.name = "TopBar"
	bar.alignment = BoxContainer.ALIGNMENT_CENTER
	bar.add_theme_constant_override("separation", 24)
	bar.anchor_left = 0.5
	bar.anchor_right = 0.5
	bar.offset_left = -220.0
	bar.offset_top = 24.0
	bar.offset_right = 220.0
	bar.offset_bottom = 108.0
	bar.grow_horizontal = Control.GROW_DIRECTION_BOTH
	add_child(bar)
	return bar


func _build_slot(bar: HBoxContainer, i: int) -> PanelContainer:
	var slot := PanelContainer.new()
	slot.name = "Slot%d" % i
	slot.custom_minimum_size = Vector2(120, 80)
	bar.add_child(slot)
	return slot


func _build_slot_label(slot: PanelContainer, i: int) -> Label:
	var label := Label.new()
	label.name = "Label"
	label.text = SLOT_TITLES[i]
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 30)
	slot.add_child(label)
	return label
