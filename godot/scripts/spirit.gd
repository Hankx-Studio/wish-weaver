extends Node3D
## Wisp companion (wordless): follows its target, bobs, tilts into motion,
## and squashes with a happy hop when celebrate() is called (e.g. on collect).


@export var target_path: NodePath
@export var follow_offset := Vector3(0.9, 1.5, 0.9)
@export var follow_speed := 4.5
@export var bob_amplitude := 0.12
@export var bob_frequency := 2.4
@export var tilt_amount := 0.3

var _target: Node3D = null
var _rig: Node3D = null
var _time := 0.0
var _celebrate_t := 1.0
var _prev_pos := Vector3.ZERO
var _wings: Array = []


func _ready() -> void:
	add_to_group("spirit")
	_rig = get_node_or_null("Rig") as Node3D
	# Exported paths don't always survive hand-written scenes; fall back.
	if target_path != null and not target_path.is_empty():
		_target = get_node_or_null(target_path) as Node3D
	if _target == null:
		_target = get_node_or_null("../Player") as Node3D
	if _target == null:
		_target = get_tree().get_first_node_in_group("player") as Node3D
	for spec in [["Rig/WingUL", 1.0], ["Rig/WingUR", 1.0], ["Rig/WingLL", 0.7], ["Rig/WingLR", 0.7]]:
		var w := get_node_or_null(str(spec[0])) as Node3D
		if w != null:
			_wings.append([w, w.rotation.z, float(spec[1])])
	_prev_pos = global_position


## Retarget the follow (used by the Main hero-swap hook).
func set_target(t: Node3D) -> void:
	_target = t


func _physics_process(delta: float) -> void:
	_time += delta
	if _celebrate_t < 1.0:
		_celebrate_t = minf(1.0, _celebrate_t + delta * 2.0)
	_follow(delta)
	_animate(delta)


## Happy squash-and-hop, called by pickups / blessing events.
func celebrate() -> void:
	_celebrate_t = 0.0


func _follow(delta: float) -> void:
	if _target == null:
		return
	var anchor: Vector3 = _target.global_position + follow_offset
	global_position = global_position.lerp(anchor, minf(1.0, follow_speed * delta))
	# Face the target (yaw only).
	var to_target: Vector3 = _target.global_position - global_position
	to_target.y = 0.0
	if to_target.length_squared() > 0.01:
		var yaw := atan2(-to_target.x, -to_target.z)
		rotation.y = lerp_angle(rotation.y, yaw, minf(1.0, 6.0 * delta))


func _animate(delta: float) -> void:
	if _rig == null:
		_prev_pos = global_position
		return
	var bob := sin(_time * bob_frequency) * bob_amplitude
	var hop := 0.0
	var squash := Vector3.ONE
	if _celebrate_t < 1.0:
		var k := sin(_celebrate_t * PI)
		hop = k * 0.55
		squash = Vector3(1.0 + 0.25 * k, 1.0 - 0.3 * k, 1.0 + 0.25 * k)
	_rig.position.y = bob + hop
	_rig.scale = squash
	# Tilt into motion.
	var vel := Vector3.ZERO
	if delta > 0.0:
		vel = (global_position - _prev_pos) / delta
	_prev_pos = global_position
	var local_vel: Vector3 = global_transform.basis.inverse() * vel
	_rig.rotation.x = clampf(local_vel.z * 0.06, -tilt_amount, tilt_amount)
	_rig.rotation.z = clampf(-local_vel.x * 0.06, -tilt_amount, tilt_amount)
	# Wing flap (faster while celebrating).
	var rate := 9.0 if _celebrate_t >= 1.0 else 16.0
	var flap := sin(_time * rate) * 0.3
	for spec in _wings:
		var w: Node3D = spec[0]
		var base: float = spec[1]
		var factor: float = spec[2]
		w.rotation.z = base + flap * factor * signf(base)
