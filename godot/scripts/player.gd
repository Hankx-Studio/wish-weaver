extends CharacterBody3D

@export var speed := 6.0
@export var jump_velocity := 7.0
@export var gravity := 22.0


func _ready() -> void:
	add_to_group("player")


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= gravity * delta
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity

	var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var direction := Vector3(input_dir.x, 0.0, input_dir.y)
	velocity.x = direction.x * speed
	velocity.z = direction.z * speed
	move_and_slide()
