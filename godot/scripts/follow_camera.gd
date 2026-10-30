extends Camera3D

@export var target: Node3D
@export var offset := Vector3(0, 4.5, 9)
@export var smooth := 6.0


func _ready() -> void:
	# NodePath exports don't always resolve from hand-written .tscn; fall back.
	if target == null:
		target = get_node_or_null("../Player") as Node3D
	if target == null:
		target = get_tree().get_first_node_in_group("player") as Node3D


func _physics_process(delta: float) -> void:
	if target == null:
		return
	var desired := target.global_position + offset
	global_position = global_position.lerp(desired, smooth * delta)
	look_at(target.global_position, Vector3.UP)
