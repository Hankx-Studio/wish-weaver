# Player: CharacterBody3D + imported traveler GLB + follow camera.
class_name Player
extends CharacterBody3D

const SPEED := 5.5
const TURN := 10.0
const GRAV := 22.0
const JUMP := 8.0

var model: Node3D
var anim: AnimationPlayer
var cam: Camera3D
var cam_yaw := 0.0
var moving := false

static func make() -> Player:
	var p := Player.new()
	p.name = "Player"
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.4
	cap.height = 1.6
	cs.shape = cap
	cs.position.y = 0.9
	p.add_child(cs)
	var glb: PackedScene = load("res://assets/models/traveler.glb")
	p.model = glb.instantiate()
	p.model.name = "TravelerModel"
	p.add_child(p.model)
	# Swap embedded 4K albedo for the lighter 2K on the Skin material.
	var alb: Texture2D = load("res://assets/models/traveler_albedo_2k.png")
	for r in p.model.find_children("*", "MeshInstance3D", true, false):
		var mi := r as MeshInstance3D
		var mesh := mi.mesh
		if mesh == null:
			continue
		for si in mesh.get_surface_count():
			var m := mi.get_active_material(si)
			if m != null and m is StandardMaterial3D and (m as StandardMaterial3D).albedo_texture != null:
				var dup := (m as StandardMaterial3D).duplicate() as StandardMaterial3D
				dup.albedo_texture = alb
				mi.set_surface_override_material(si, dup)
	p.anim = p.model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	# Camera rig: spring arm keeps the boom out of walls and roofs.
	var pivot := Node3D.new()
	pivot.name = "CamPivot"
	pivot.position = Vector3(0, 1.6, 0)
	p.add_child(pivot)
	var arm := SpringArm3D.new()
	arm.name = "Boom"
	arm.position = Vector3(0, 0.6, 0)
	arm.rotation_degrees = Vector3(-20, 0, 0)
	arm.spring_length = 4.8
	arm.margin = 0.3
	var ashape := SphereShape3D.new()
	ashape.radius = 0.35
	arm.shape = ashape
	pivot.add_child(arm)
	arm.add_excluded_object(p.get_rid())
	p.cam = Camera3D.new()
	p.cam.name = "Cam"
	p.cam.position = Vector3(0, 0, arm.spring_length)
	arm.add_child(p.cam)
	p.cam.current = true
	return p

func _ready() -> void:
	if anim and anim.has_animation("Idle"):
		anim.play("Idle")

func _physics_process(dt: float) -> void:
	var frozen := Main.I != null and ((Main.I.spell != null and Main.I.spell.open) or (Main.I.dlg != null and Main.I.dlg.active))
	var iv := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	if frozen:
		iv = Vector2.ZERO
	moving = iv.length() > 0.1
	var dir := Vector3(iv.x, 0, iv.y)
	# Camera-relative with fixed yaw (cam_yaw follows slowly behind movement).
	if dir.length() > 0.01:
		var target_yaw := atan2(dir.x, dir.z)
		var cur: float = (rotation.y)
		rotation.y = lerp_angle(cur, target_yaw, min(1.0, TURN * dt))
		velocity.x = dir.normalized().x * SPEED
		velocity.z = dir.normalized().z * SPEED
	else:
		velocity.x = move_toward(velocity.x, 0.0, SPEED * 4.0 * dt)
		velocity.z = move_toward(velocity.z, 0.0, SPEED * 4.0 * dt)
	if not is_on_floor():
		velocity.y -= GRAV * dt
	elif Input.is_action_just_pressed("jump") and not frozen:
		velocity.y = JUMP
	move_and_slide()
	# Gentle camera yaw drift toward movement heading.
	var pivot := get_node("CamPivot") as Node3D
	var want := atan2(-velocity.x, -velocity.z) if Vector2(velocity.x, velocity.z).length() > 1.0 else cam_yaw
	cam_yaw = lerp_angle(cam_yaw, want, min(1.0, 2.5 * dt))
	pivot.rotation.y = cam_yaw - rotation.y + PI
	_update_anim()

func _update_anim() -> void:
	if anim == null:
		return
	var want := "Walk" if (moving and is_on_floor()) else "Idle"
	if not anim.has_animation(want):
		return
	if anim.current_animation != want:
		anim.play(want, 0.25)
