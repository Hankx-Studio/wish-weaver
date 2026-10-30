extends Node
## Nearest-interactable system: E key + tap/click picks the nearest
## "interactable" within INTERACT_RADIUS and shows its prompt label.
## Interactables implement interact() plus get_prompt() (story pickups,
## fountain, tree door) or get_interact_prompt() (NpcBase) for the label.
class_name StoryInteractManager

const INTERACT_RADIUS := 2.5

@export var player: Node3D

var _current: Node = null
var _layer: CanvasLayer = null
var _prompt: Label = null


func _ready() -> void:
	add_to_group("interact_manager")
	if player == null:
		player = get_tree().get_first_node_in_group("player") as Node3D
	_build_prompt()


func get_current_target() -> Node:
	if _current != null and not is_instance_valid(_current):
		_current = null
	return _current


func try_interact() -> bool:
	var target := get_current_target()
	if target == null or not target.has_method("interact"):
		return false
	target.call("interact")
	return true


func _physics_process(_delta: float) -> void:
	if player == null or not is_instance_valid(player):
		player = get_tree().get_first_node_in_group("player") as Node3D
	_current = _find_nearest()
	_update_prompt()


func _unhandled_input(event: InputEvent) -> void:
	if _ui_busy():
		return
	if event is InputEventKey:
		var k := event as InputEventKey
		if k.pressed and not k.echo and k.physical_keycode == KEY_E:
			try_interact()
	elif event is InputEventMouseButton:
		var m := event as InputEventMouseButton
		if m.pressed and m.button_index == MOUSE_BUTTON_LEFT:
			try_interact()
	elif event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed:
			try_interact()


func _find_nearest() -> Node:
	if player == null:
		return null
	var best: Node = null
	var best_d := INTERACT_RADIUS
	var origin: Vector3 = player.global_position
	for n in get_tree().get_nodes_in_group("interactable"):
		if n == null or not is_instance_valid(n):
			continue
		if not (n is Node3D):
			continue
		if not n.has_method("interact"):
			continue
		var d: float = (n as Node3D).global_position.distance_to(origin)
		if d <= INTERACT_RADIUS and d < best_d:
			best = n
			best_d = d
	return best


func _prompt_text_for(n: Node) -> String:
	if n.has_method("get_prompt"):
		return str(n.call("get_prompt"))
	if n.has_method("get_interact_prompt"):
		return str(n.call("get_interact_prompt"))
	return ""


func _update_prompt() -> void:
	if _prompt == null:
		return
	var target := get_current_target()
	if target == null:
		_prompt.visible = false
		return
	var text := _prompt_text_for(target)
	if text.is_empty():
		_prompt.visible = false
		return
	_prompt.text = text
	_prompt.visible = true


func _ui_busy() -> bool:
	for n in get_tree().get_nodes_in_group("dialogue_box"):
		if n != null and is_instance_valid(n) and n.has_method("is_active"):
			if bool(n.call("is_active")):
				return true
	for n in get_tree().get_nodes_in_group("intro_cards"):
		if n != null and is_instance_valid(n) and n.has_method("is_showing"):
			if bool(n.call("is_showing")):
				return true
	return false


func _build_prompt() -> void:
	_layer = CanvasLayer.new()
	_layer.name = "InteractPromptLayer"
	_layer.layer = 5
	add_child(_layer)
	_prompt = Label.new()
	_prompt.name = "PromptLabel"
	_prompt.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_prompt.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_prompt.add_theme_font_size_override("font_size", 28)
	_prompt.add_theme_color_override("font_color", Color(1, 1, 1))
	_prompt.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	_prompt.add_theme_constant_override("shadow_offset_x", 2)
	_prompt.add_theme_constant_override("shadow_offset_y", 2)
	_prompt.anchor_left = 0.5
	_prompt.anchor_top = 1.0
	_prompt.anchor_right = 0.5
	_prompt.anchor_bottom = 1.0
	_prompt.offset_left = -400.0
	_prompt.offset_top = -330.0
	_prompt.offset_right = 400.0
	_prompt.offset_bottom = -286.0
	_prompt.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_prompt.visible = false
	_layer.add_child(_prompt)
