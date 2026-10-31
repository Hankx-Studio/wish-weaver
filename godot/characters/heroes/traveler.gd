extends CharacterBody3D
## Moonleaf traveler: single androgynous elf hero (A01-A03).
## Same movement contract as the old hero.gd (WASD + jump, speed 6, jump 7,
## gravity 22) with a procedural walk cycle (limb swing, bob, lean, breathing).

@export var speed := 6.0
@export var jump_velocity := 7.0
@export var gravity := 22.0
@export var turn_speed := 12.0

var velocity_param := 0.0

var _model: Node3D = null
var _arm_l: Node3D = null
var _arm_r: Node3D = null
var _leg_l: Node3D = null
var _leg_r: Node3D = null
var _mantle: MeshInstance3D = null
var _phase := 0.0
var _time := 0.0


func _ready() -> void:
	add_to_group("player")
	add_to_group("current-player")
	_model = get_node_or_null("Model") as Node3D
	if _model != null:
		_arm_l = _model.get_node_or_null("Hips/ArmLPivot") as Node3D
		_arm_r = _model.get_node_or_null("Hips/ArmRPivot") as Node3D
		_leg_l = _model.get_node_or_null("Hips/LegLPivot") as Node3D
		_leg_r = _model.get_node_or_null("Hips/LegRPivot") as Node3D
		_mantle = _model.get_node_or_null("Hips/Mantle") as MeshInstance3D


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

	velocity_param = Vector2(velocity.x, velocity.z).length()
	_face_movement(direction, delta)
	_animate(delta)


func _face_movement(direction: Vector3, delta: float) -> void:
	if _model == null:
		return
	if Vector2(direction.x, direction.z).length() < 0.05:
		return
	var target_yaw := atan2(direction.x, direction.z)
	_model.rotation.y = lerp_angle(_model.rotation.y, target_yaw, minf(1.0, turn_speed * delta))


func _animate(delta: float) -> void:
	if _model == null:
		return
	_time += delta
	var energy := clampf(velocity_param / 6.0, 0.0, 1.0)
	_phase += delta * (2.0 + velocity_param * 1.7)
	var swing := 0.65 * energy
	var s: float = sin(_phase)
	if _leg_l != null:
		_leg_l.rotation.x = s * swing
	if _leg_r != null:
		_leg_r.rotation.x = -s * swing
	if _arm_l != null:
		_arm_l.rotation.x = -s * swing * 0.8
	if _arm_r != null:
		_arm_r.rotation.x = s * swing * 0.8
	# Walk bob + idle breathing, lean into motion, mantle sway.
	var bob: float = abs(cos(_phase)) * 0.045 * energy
	var breathe: float = sin(_time * 2.0) * 0.012
	_model.position.y = bob + breathe
	var lean: float = 0.09 * energy
	if not is_on_floor():
		lean = -0.12
	_model.rotation.x = lerpf(_model.rotation.x, lean, minf(1.0, 8.0 * delta))
	if _mantle != null:
		_mantle.rotation.z = sin(_time * 1.7) * 0.04 + energy * 0.06 * sin(_phase * 0.5)
