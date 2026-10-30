extends CharacterBody3D
## Shared hero controller (HeroM / HeroF).
## Same movement contract as scripts/player.gd: WASD + jump, speed 6, jump 7, gravity 22.
## Drives the imported rigged model: hides unused prop meshes, faces travel
## direction, and blends Idle/Walk/Run/Jump by the velocity_param (planar speed).

@export var speed := 6.0
@export var jump_velocity := 7.0
@export var gravity := 22.0
@export var turn_speed := 12.0
## Mesh node names inside the imported model to hide (weapons, spare props).
@export var hide_meshes: Array[String] = []
## Preferred model node; resolved with fallbacks in _ready().
@export var model_path: NodePath = ^"Model"

## Planar speed (m/s). This is the velocity parameter that drives animation.
var velocity_param := 0.0

var _model: Node3D = null
var _player: AnimationPlayer = null
var _tree: AnimationTree = null
var _playback: AnimationNodeStateMachinePlayback = null


func _ready() -> void:
	add_to_group("player")
	add_to_group("current-player")
	_model = _resolve_model()
	_apply_hidden_meshes()
	_player = _find_first(self, "AnimationPlayer") as AnimationPlayer
	_tree = get_node_or_null("AnimationTree") as AnimationTree
	if _tree == null:
		_tree = _find_first(self, "AnimationTree") as AnimationTree
	_build_anim_graph()


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
	_drive_animation()


func _face_movement(direction: Vector3, delta: float) -> void:
	if _model == null:
		return
	if Vector2(direction.x, direction.z).length() < 0.05:
		return
	var target_yaw := atan2(direction.x, direction.z)
	_model.rotation.y = lerp_angle(_model.rotation.y, target_yaw, minf(1.0, turn_speed * delta))


func _drive_animation() -> void:
	if _tree == null or _playback == null:
		return
	_tree.set("parameters/Ground/blend_position", velocity_param)
	if is_on_floor():
		if _playback.get_current_node() != "Ground":
			_playback.travel("Ground")
	else:
		if _playback.get_current_node() != "Air":
			_playback.travel("Air")


func _resolve_model() -> Node3D:
	var direct := get_node_or_null(model_path) as Node3D
	if direct != null:
		return direct
	for child in get_children():
		if child is Node3D and not (child is CollisionShape3D):
			var hit := _find_first(child, "Skeleton3D")
			if hit != null:
				return child as Node3D
	for child in get_children():
		if child is Node3D and not (child is CollisionShape3D):
			return child as Node3D
	return null


func _apply_hidden_meshes() -> void:
	if _model == null or hide_meshes.is_empty():
		return
	_hide_recursive(_model)


func _hide_recursive(node: Node) -> void:
	for child in node.get_children():
		if child is MeshInstance3D and child.name in hide_meshes:
			(child as MeshInstance3D).visible = false
		_hide_recursive(child)


func _find_first(node: Node, klass_name: String) -> Node:
	if node != self and node.is_class(klass_name):
		return node
	for child in node.get_children():
		var hit := _find_first(child, klass_name)
		if hit != null:
			return hit
	return null


func _pick_animation(preferred: Array[String]) -> String:
	if _player == null:
		return ""
	for name: String in preferred:
		if _player.has_animation(name):
			return name
	var all := _player.get_animation_list()
	if all.is_empty():
		return ""
	return all[0]


func _anim_node(preferred: Array[String]) -> AnimationNodeAnimation:
	var node := AnimationNodeAnimation.new()
	node.animation = _pick_animation(preferred)
	return node


func _build_anim_graph() -> void:
	if _tree == null or _player == null:
		return
	if _pick_animation(["Idle"]) == "":
		return
	var ground := AnimationNodeBlendSpace1D.new()
	ground.add_blend_point(_anim_node(["Idle"]), 0.0, -1, &"Idle")
	ground.add_blend_point(_anim_node(["Walking_A", "Walking_B", "Walking_C"]), 2.0, -1, &"Walk")
	ground.add_blend_point(_anim_node(["Running_A", "Running_B"]), 6.0, -1, &"Run")

	var air := _anim_node(["Jump_Idle", "Jump_Full_Short", "Jump_Full_Long", "Idle"])

	var state_machine := AnimationNodeStateMachine.new()
	state_machine.add_node("Ground", ground)
	state_machine.add_node("Air", air)
	var to_air := AnimationNodeStateMachineTransition.new()
	to_air.xfade_time = 0.12
	state_machine.add_transition("Ground", "Air", to_air)
	var to_ground := AnimationNodeStateMachineTransition.new()
	to_ground.xfade_time = 0.15
	state_machine.add_transition("Air", "Ground", to_ground)

	_tree.tree_root = state_machine
	_tree.anim_player = _tree.get_path_to(_player)
	_tree.active = true
	_playback = _tree.get("parameters/playback") as AnimationNodeStateMachinePlayback
