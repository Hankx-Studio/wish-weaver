# TreeOfLife: procedural S-trunk + canopy clusters + sealed door.
class_name TreeOfLife
extends Node3D

var door_open := false
var _door: Interactable
var _seal_glow: MeshInstance3D

func build(at: Vector3) -> void:
	position = at
	_build_trunk()
	_build_canopy()
	_build_door()
	_build_runestones()
	Game.blessing_earned.connect(_on_blessing)

func _mat(c: Color, rough: float = 0.85, e: Color = Color(0, 0, 0)) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = rough
	if e.r + e.g + e.b > 0.0:
		m.emission_enabled = true
		m.emission = e
		m.emission_energy_multiplier = 1.6
	return m

func _build_trunk() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 9
	var trunk_mat := _mat(Color(0.45, 0.32, 0.22))
	var z := 0.0
	var lean := 0.0
	for i in 7:
		var seg := MeshInstance3D.new()
		var cm := CylinderMesh.new()
		cm.top_radius = 1.5 - i * 0.16
		cm.bottom_radius = 1.66 - i * 0.16
		cm.height = 1.6
		seg.mesh = cm
		lean += 0.35 if i % 2 == 0 else -0.25
		seg.position = Vector3(lean, z + 0.8, sin(i * 1.2) * 0.3)
		seg.rotation.z = 0.06 * (1 if i % 2 == 0 else -1)
		seg.material_override = trunk_mat
		add_child(seg)
		z += 1.5
	var col := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var cyl := CylinderShape3D.new()
	cyl.radius = 1.6
	cyl.height = 11.0
	cs.shape = cyl
	cs.position.y = 5.5
	col.add_child(cs)
	add_child(col)

func _build_canopy() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 21
	var leaf := _mat(Color(0.35, 0.58, 0.32))
	var leaf2 := _mat(Color(0.45, 0.68, 0.38))
	var centers := [
		Vector3(0.5, 12.5, 0), Vector3(-3, 11, 1), Vector3(3.5, 11.2, -0.5),
		Vector3(0, 10, 3.5), Vector3(1, 10.2, -3.5), Vector3(-2, 13.2, -2),
		Vector3(2.5, 13.0, 2), Vector3(0, 14.2, 0), Vector3(-4.5, 9.8, -1),
	]
	for i in centers.size():
		var c: Vector3 = centers[i]
		var blob := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 2.6 + rng.randf() * 1.2
		sm.height = sm.radius * 1.5
		blob.mesh = sm
		blob.position = c
		blob.material_override = leaf if i % 2 == 0 else leaf2
		add_child(blob)
	# Fireflies.
	var fmesh := SphereMesh.new()
	fmesh.radius = 0.07
	fmesh.height = 0.14
	var fmm := MultiMesh.new()
	fmm.transform_format = MultiMesh.TRANSFORM_3D
	fmm.mesh = fmesh
	fmm.instance_count = 60
	for i in 60:
		var a := rng.randf() * TAU
		var r := 2.0 + rng.randf() * 7.0
		fmm.set_instance_transform(i, Transform3D(Basis(), Vector3(cos(a) * r, 2.0 + rng.randf() * 9.0, sin(a) * r)))
	var fmi := MultiMeshInstance3D.new()
	fmi.multimesh = fmm
	fmi.material_override = _mat(Color(1, 0.95, 0.6), 0.4, Color(1, 0.9, 0.5))
	add_child(fmi)

func _build_door() -> void:
	# Door faces +Z (south, toward spawn).
	var frame := MeshInstance3D.new()
	var fm := BoxMesh.new()
	fm.size = Vector3(2.2, 3.2, 0.5)
	frame.mesh = fm
	frame.position = Vector3(0.35, 1.6, 1.35)
	frame.material_override = _mat(Color(0.35, 0.24, 0.16))
	add_child(frame)
	var slab := MeshInstance3D.new()
	var sm := BoxMesh.new()
	sm.size = Vector3(1.6, 2.6, 0.3)
	slab.mesh = sm
	slab.position = Vector3(0.35, 1.35, 1.45)
	slab.name = "DoorSlab"
	slab.material_override = _mat(Color(0.55, 0.75, 0.85), 0.4, Color(0.4, 0.6, 0.7))
	add_child(slab)
	_seal_glow = slab
	_door = TreeDoor.new()
	_door.name = "TreeDoor"
	_door.position = Vector3(0.35, 1.2, 2.6)
	var cs := CollisionShape3D.new()
	var sp := SphereShape3D.new()
	sp.radius = 2.2
	cs.shape = sp
	_door.add_child(cs)
	add_child(_door)
	_refresh_door()

func _build_runestones() -> void:
	for i in 5:
		var a := TAU * float(i) / 5.0 + 0.4
		var st := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(0.5, 1.1, 0.35)
		st.mesh = bm
		st.position = Vector3(cos(a) * 5.5, 0.55, sin(a) * 5.5)
		st.rotation.y = -a
		st.material_override = _mat(Color(0.6, 0.62, 0.65), 0.7, Color(0.5, 0.7, 0.9))
		add_child(st)

func _on_blessing(_id: String) -> void:
	_refresh_door()

func _refresh_door() -> void:
	door_open = Game.blessing_count() >= 3
	if _seal_glow and _seal_glow.material_override:
		var m := _seal_glow.material_override as StandardMaterial3D
		if door_open:
			m.emission = Color(1.0, 0.9, 0.5)
			m.albedo_color = Color(1.0, 0.95, 0.7)
