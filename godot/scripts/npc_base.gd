class_name NpcBase
extends StaticBody3D

## Shared NPC behavior: idle bob/sway, head look-at-player with yaw clamp,
## name label hook, and an interact() stub the story system calls.

signal interacted(npc: NpcBase)

@export var npc_name := "Villager"
@export var look_enabled := true
@export var look_range := 6.0
@export var look_yaw_max := 0.9
@export var look_speed := 6.0
@export var bob_amplitude := 0.03
@export var bob_speed := 2.0
@export var sway_amplitude := 0.02

@export var visual_root: Node3D
@export var head_pivot: Node3D
@export var name_label: Label3D

var _t := 0.0
var _base_vis_y := 0.0
var _player: Node3D = null


func _ready() -> void:
	add_to_group("npcs")
	add_to_group("interactable")
	# Fallbacks: hand-written tscn exports may not resolve, so re-resolve here.
	if visual_root == null:
		visual_root = get_node_or_null("VisualRoot") as Node3D
	if visual_root == null:
		visual_root = Node3D.new()
		visual_root.name = "VisualRoot"
		add_child(visual_root)
	if head_pivot == null:
		head_pivot = get_node_or_null("VisualRoot/HeadPivot") as Node3D
	if head_pivot == null:
		head_pivot = visual_root.get_node_or_null("HeadPivot") as Node3D
	if head_pivot == null:
		head_pivot = get_node_or_null("Rig/HeadPivot") as Node3D
	if head_pivot == null:
		head_pivot = Node3D.new()
		head_pivot.name = "HeadPivot"
		head_pivot.position = Vector3(0, 1.42, 0)
		visual_root.add_child(head_pivot)
	if name_label == null:
		name_label = get_node_or_null("NameLabel") as Label3D
	if name_label != null:
		name_label.text = npc_name
	_base_vis_y = visual_root.position.y
	_player = get_tree().get_first_node_in_group("player") as Node3D


func _process(delta: float) -> void:
	_t += delta
	if visual_root != null:
		visual_root.position.y = _base_vis_y + sin(_t * bob_speed) * bob_amplitude
		visual_root.rotation.z = sin(_t * bob_speed * 0.5) * sway_amplitude
	if _player == null or not is_instance_valid(_player):
		_player = get_tree().get_first_node_in_group("player") as Node3D
	if _player != null:
		look_at_player(_player, delta)
	else:
		look_at_player(null, delta)


## Yaws the head toward target (face is on +Z), clamped to look_yaw_max.
## Pass null to ease back to forward.
func look_at_player(target: Node3D, delta: float) -> void:
	if head_pivot == null:
		return
	var target_yaw := 0.0
	if look_enabled and target != null:
		var to_p: Vector3 = target.global_position - head_pivot.global_position
		to_p.y = 0.0
		if to_p.length() < look_range and to_p.length_squared() > 0.0001:
			var world_yaw := atan2(to_p.x, to_p.z)
			var rel := wrapf(world_yaw - global_rotation.y, -PI, PI)
			target_yaw = clampf(rel, -look_yaw_max, look_yaw_max)
	head_pivot.rotation.y = lerp_angle(head_pivot.rotation.y, target_yaw, minf(1.0, look_speed * delta))


## Called by the story/interact system. Emits interacted for quest wiring.
func interact() -> void:
	interacted.emit(self)


func get_interact_prompt() -> String:
	return "E: Talk to " + npc_name
