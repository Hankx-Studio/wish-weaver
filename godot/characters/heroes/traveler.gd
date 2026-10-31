extends CharacterBody3D
## Moonleaf traveler: single androgynous elf hero (A01-A03).
## Rigged GLB (Hunyuan shape + projected vertex colors + Idle/Walk).
## Same movement contract as the old hero.gd (WASD + jump, speed 6, jump 7,
## gravity 22); animation crossfades on velocity, procedural bob/lean on Model.

@export var speed := 6.0
@export var jump_velocity := 7.0
@export var gravity := 22.0
@export var turn_speed := 12.0

var velocity_param := 0.0

var _model: Node3D = null
var _player: AnimationPlayer = null
var _phase := 0.0
var _time := 0.0


func _ready() -> void:
	add_to_group("player")
	add_to_group("current-player")
	_model = get_node_or_null("Model") as Node3D
	if _model == null:
		return
	var rig := _model.get_node_or_null("Rig")
	if rig != null:
		_player = rig.get_node_or_null("AnimationPlayer") as AnimationPlayer
		_enable_vertex_colors(rig)
	if _player != null:
		_player.play("Idle")


## Imported GLB carries COLOR_0; enable it as albedo on every surface.
func _enable_vertex_colors(root: Node) -> void:
	var stack: Array[Node] = [root]
	while not stack.is_empty():
		var n: Node = stack.pop_back()
		for c in n.get_children():
			stack.push_back(c)
		var mi := n as MeshInstance3D
		if mi == null or mi.mesh == null:
			continue
		for s in range(mi.mesh.get_surface_count()):
			var src := mi.mesh.surface_get_material(s)
			var mat := (src as StandardMaterial3D).duplicate() as StandardMaterial3D if src is StandardMaterial3D else StandardMaterial3D.new()
			mat.vertex_color_use_as_albedo = true
			mat.roughness = 0.9
			mat.metallic = 0.0
			mi.set_surface_override_material(s, mat)


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
	# Rigged animation crossfade on velocity.
	if _player != null:
		var want := "Walk" if energy > 0.12 else "Idle"
		if _player.current_animation != want:
			_player.play(want, 0.25)
		_player.speed_scale = 0.7 + energy * 0.7 if want == "Walk" else 1.0
	# Walk bob + idle breathing, lean into motion.
	var bob: float = abs(cos(_phase)) * 0.045 * energy
	var breathe: float = sin(_time * 2.0) * 0.012
	_model.position.y = bob + breathe
	var lean: float = 0.09 * energy
	if not is_on_floor():
		lean = -0.12
	_model.rotation.x = lerpf(_model.rotation.x, lean, minf(1.0, 8.0 * delta))
