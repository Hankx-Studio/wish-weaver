extends Node3D
## Sun-apple pickup: bobs + spins, collects via interact() with a gold
## burst, emits collected(self), and notifies the story director.
class_name SunApplePickup

signal collected(pickup: Node)

@export var bob_height := 0.15
@export var bob_speed := 2.0
@export var spin_speed := 1.5

var _collected := false
var _t := 0.0
var _visual: Node3D = null
var _burst: GPUParticles3D = null


func _ready() -> void:
	add_to_group("interactable")
	add_to_group("sun_apple")
	_visual = get_node_or_null("Visual") as Node3D
	if _visual == null:
		_visual = _build_visual()
	_burst = get_node_or_null("CollectBurst") as GPUParticles3D
	if _burst == null:
		_burst = _build_burst()


func get_prompt() -> String:
	if _collected:
		return ""
	return "Pick sun-apple (E)"


func interact() -> void:
	collect()


func is_collected() -> bool:
	return _collected


func collect() -> void:
	if _collected:
		return
	_collected = true
	if _visual != null:
		_visual.visible = false
	if _burst != null:
		_burst.restart()
		_burst.emitting = true
	collected.emit(self)
	for n in get_tree().get_nodes_in_group("story_director"):
		if n != null and is_instance_valid(n) and n.has_method("on_apple_collected"):
			n.call("on_apple_collected", self)
	await get_tree().create_timer(1.0).timeout
	if is_instance_valid(self):
		queue_free()


func _process(delta: float) -> void:
	if _collected or _visual == null:
		return
	_t += delta
	_visual.position.y = 0.6 + sin(_t * bob_speed) * bob_height
	_visual.rotation.y += spin_speed * delta


func _build_visual() -> Node3D:
	var root := Node3D.new()
	root.name = "Visual"
	root.position.y = 0.6
	add_child(root)
	var apple := MeshInstance3D.new()
	apple.name = "Apple"
	var body := SphereMesh.new()
	body.radius = 0.22
	body.height = 0.4
	body.radial_segments = 12
	body.rings = 8
	apple.mesh = body
	var skin := StandardMaterial3D.new()
	skin.albedo_color = Color8(232, 200, 121).srgb_to_linear()
	skin.roughness = 0.35
	skin.emission_enabled = true
	skin.emission = Color8(232, 200, 121).srgb_to_linear()
	skin.emission_energy_multiplier = 0.6
	apple.material_override = skin
	root.add_child(apple)
	var stem := MeshInstance3D.new()
	stem.name = "Stem"
	var stem_mesh := CylinderMesh.new()
	stem_mesh.top_radius = 0.025
	stem_mesh.bottom_radius = 0.035
	stem_mesh.height = 0.18
	stem.mesh = stem_mesh
	var bark := StandardMaterial3D.new()
	bark.albedo_color = Color8(110, 100, 82).srgb_to_linear()
	bark.roughness = 0.9
	stem.material_override = bark
	stem.position = Vector3(0, 0.26, 0)
	root.add_child(stem)
	var leaf := MeshInstance3D.new()
	leaf.name = "Leaf"
	var leaf_mesh := SphereMesh.new()
	leaf_mesh.radius = 0.09
	leaf_mesh.height = 0.05
	leaf_mesh.radial_segments = 8
	leaf_mesh.rings = 4
	leaf.mesh = leaf_mesh
	var leaf_mat := StandardMaterial3D.new()
	leaf_mat.albedo_color = Color8(157, 175, 154).srgb_to_linear()
	leaf_mat.roughness = 0.7
	leaf.material_override = leaf_mat
	leaf.position = Vector3(0.1, 0.32, 0)
	leaf.rotation.z = -0.5
	root.add_child(leaf)
	var halo := MeshInstance3D.new()
	halo.name = "Halo"
	var halo_mesh := SphereMesh.new()
	halo_mesh.radius = 0.34
	halo_mesh.height = 0.68
	halo_mesh.radial_segments = 12
	halo_mesh.rings = 8
	halo.mesh = halo_mesh
	halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var halo_mat := StandardMaterial3D.new()
	halo_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	halo_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	halo_mat.albedo_color = Color(0.8, 0.58, 0.2, 0.22)
	halo.material_override = halo_mat
	root.add_child(halo)
	return root


func _build_burst() -> GPUParticles3D:
	var p := GPUParticles3D.new()
	p.name = "CollectBurst"
	p.amount = 28
	p.lifetime = 0.7
	p.one_shot = true
	p.explosiveness = 0.9
	p.emitting = false
	p.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	mat.emission_sphere_radius = 0.25
	mat.direction = Vector3(0, 1, 0)
	mat.spread = 45.0
	mat.initial_velocity_min = 2.0
	mat.initial_velocity_max = 4.0
	mat.gravity = Vector3(0, -4, 0)
	mat.scale_min = 0.5
	mat.scale_max = 1.2
	mat.color = Color(0.8, 0.58, 0.2)
	p.process_material = mat
	var dot_mat := StandardMaterial3D.new()
	dot_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	dot_mat.albedo_color = Color8(232, 200, 121).srgb_to_linear()
	if ResourceLoader.exists("res://assets/fx/petal_alpha.png"):
		var quad := QuadMesh.new()
		quad.size = Vector2(0.14, 0.14)
		var tex := load("res://assets/fx/petal_alpha.png") as Texture2D
		dot_mat.albedo_texture = tex
		dot_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		dot_mat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
		p.draw_pass_1 = quad
	else:
		var dot := SphereMesh.new()
		dot.radius = 0.06
		dot.height = 0.12
		dot.radial_segments = 6
		dot.rings = 4
		p.draw_pass_1 = dot
	p.material_override = dot_mat
	p.position.y = 0.6
	add_child(p)
	return p
