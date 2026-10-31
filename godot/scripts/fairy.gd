# Fairy: follows the player, bobs, tilts, celebrates blessings.
class_name Fairy
extends Node3D

var target: Node3D
var t := 0.0
var celebrate := 0.0
var inner: Node3D

static func make(follow: Node3D) -> Fairy:
	var f := Fairy.new()
	f.name = "Fairy"
	f.target = follow
	var glb: PackedScene = load("res://assets/models/fairy.glb")
	f.inner = glb.instantiate()
	f.add_child(f.inner)
	var anim := f.inner.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if anim and anim.has_animation("Flap"):
		anim.play("Flap")
	var light := OmniLight3D.new()
	light.light_color = Color(0.7, 0.9, 1.0)
	light.light_energy = 0.8
	light.omni_range = 5.0
	f.add_child(light)
	Game.blessing_earned.connect(func(_id: String) -> void: f.celebrate = 2.5)
	return f

func _process(dt: float) -> void:
	if target == null:
		return
	t += dt * (2.2 if celebrate > 0.0 else 1.0)
	celebrate = max(0.0, celebrate - dt)
	var anchor: Vector3 = target.global_position + Vector3(0, 2.0, 0)
	var orbit := Vector3(cos(t * 0.9) * 1.4, sin(t * 2.1) * 0.35, sin(t * 0.9) * 1.4)
	var goal := anchor + orbit
	global_position = global_position.lerp(goal, min(1.0, 3.0 * dt))
	var vel: Vector3 = goal - global_position
	rotation.z = clamp(-vel.x * 0.15, -0.4, 0.4)
	rotation.x = clamp(vel.z * 0.12, -0.3, 0.3)
	var s := 1.0 + sin(t * 5.0) * (0.12 if celebrate > 0.0 else 0.04)
	inner.scale = Vector3(s, 2.0 - s, s) * 0.5
