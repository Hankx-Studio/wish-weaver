# StarApple pickup: walk close + E to gather. 3 grant Harvest blessing.
class_name StarApple
extends Interactable

var taken := false

static func make(at: Vector3) -> StarApple:
	var a := StarApple.new()
	a.prompt = "Gather star-apple"
	a.position = at
	var cs := CollisionShape3D.new()
	var sp := SphereShape3D.new()
	sp.radius = 1.8
	cs.shape = sp
	cs.position.y = 0.8
	a.add_child(cs)
	var fruit := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.22
	sm.height = 0.44
	fruit.mesh = sm
	fruit.position.y = 0.8
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(1.0, 0.6, 0.4)
	m.emission_enabled = true
	m.emission = Color(1.0, 0.55, 0.3)
	m.emission_energy_multiplier = 1.8
	fruit.material_override = m
	a.add_child(fruit)
	var leaf := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.2, 0.04, 0.12)
	leaf.mesh = bm
	leaf.position = Vector3(0.08, 1.05, 0)
	leaf.rotation.z = 0.5
	var lm := StandardMaterial3D.new()
	lm.albedo_color = Color(0.4, 0.7, 0.35)
	leaf.material_override = lm
	a.add_child(leaf)
	var light := OmniLight3D.new()
	light.position.y = 0.9
	light.light_color = Color(1.0, 0.6, 0.35)
	light.light_energy = 0.5
	light.omni_range = 3.0
	a.add_child(light)
	return a

func _process(_dt: float) -> void:
	if not taken:
		rotation.y += _dt * 1.2

func interact(_player: Node3D) -> void:
	if taken:
		return
	taken = true
	Game.add_apple()
	Main.ui().flash("Star-apple %d/3" % Game.apples)
	Main.fx_burst(global_position + Vector3(0, 1, 0), Color(1.0, 0.6, 0.35))
	queue_free()
