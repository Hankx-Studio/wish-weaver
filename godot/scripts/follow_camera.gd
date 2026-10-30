extends Camera3D

@export var target: Node3D
@export var offset := Vector3(0, 4.5, 9)
@export var smooth := 6.0


func _physics_process(delta: float) -> void:
	if target == null:
		return
	var desired := target.global_position + offset
	global_position = global_position.lerp(desired, smooth * delta)
	look_at(target.global_position, Vector3.UP)
