extends Node3D
## Circular fountain plaza: 3-tier fountain with shimmering water and spray,
## 4 benches, 4 lamp posts with catenary string lights, and a flower ring.
## Part list mirrors src/features/world/world/props/plaza.ts 1:1.

const WATER_NAMES: Array[String] = ["Water", "Water1", "Water2"]
const ARC_SPINS: Array[float] = [0.35, -0.22]
const LAMP_TOP_Y := 3.15
const WIRE_SAG := 0.85
const BULB_DROP := 0.09
const FLOWER_COUNT := 24
const FLOWER_BASE_R := 6.85

@onready var _fountain: Node3D = $Fountain
@onready var _lamps: Node3D = $Lamps

var _t := 0.0
var _water_mats: Array[StandardMaterial3D] = []
var _arcs: Array[MeshInstance3D] = []
var _glass_mats: Array[StandardMaterial3D] = []
var _halo_mats: Array[StandardMaterial3D] = []
var _bulb_mat: StandardMaterial3D = null
var _blossoms: Array[Color] = [
	Color8(242, 160, 181).srgb_to_linear(), Color8(246, 196, 83).srgb_to_linear(), Color8(143, 184, 246).srgb_to_linear(),
	Color8(255, 255, 255).srgb_to_linear(), Color8(232, 140, 160).srgb_to_linear(), Color8(246, 160, 92).srgb_to_linear(),
]


func _ready() -> void:
	_duplicate_animated_materials()
	_build_foam_arcs()
	_build_string_lights()
	_build_flowers()


func _process(delta: float) -> void:
	_t += delta
	for i in _water_mats.size():
		var m := _water_mats[i]
		var c := m.albedo_color
		c.a = 0.82 + 0.1 * sin(_t * 1.6 + float(i) * 1.3)
		m.albedo_color = c
	for i in _arcs.size():
		_arcs[i].rotation.y += ARC_SPINS[i % ARC_SPINS.size()] * delta
	for i in 4:
		var pulse := 0.5 + 0.5 * sin(_t * 2.1 + float(i) * PI * 0.5)
		if i < _glass_mats.size():
			var g := _glass_mats[i]
			var gc := g.albedo_color
			gc.a = 0.85 + 0.15 * pulse
			g.albedo_color = gc
		if i < _halo_mats.size():
			var h := _halo_mats[i]
			var hc := h.albedo_color
			hc.a = 0.22 + 0.12 * pulse
			h.albedo_color = hc
	if _bulb_mat != null:
		_bulb_mat.emission_energy_multiplier = 1.3 + 0.25 * sin(_t * 3.1)


func _duplicate_animated_materials() -> void:
	for n in WATER_NAMES:
		var mi := _fountain.get_node_or_null(n) as MeshInstance3D
		var src := mi.get_active_material(0) as StandardMaterial3D if mi != null else null
		if src == null:
			continue
		var m := src.duplicate() as StandardMaterial3D
		mi.material_override = m
		_water_mats.append(m)
	for i in 4:
		var lamp := _lamps.get_node_or_null("Lamp%d" % i) as Node3D
		if lamp == null:
			continue
		var glass := lamp.get_node_or_null("Glass") as MeshInstance3D
		var gsrc := glass.get_active_material(0) as StandardMaterial3D if glass != null else null
		if gsrc != null:
			var gm := gsrc.duplicate() as StandardMaterial3D
			glass.material_override = gm
			_glass_mats.append(gm)
		var halo := lamp.get_node_or_null("Halo") as MeshInstance3D
		var hsrc := halo.get_active_material(0) as StandardMaterial3D if halo != null else null
		if hsrc != null:
			var hm := hsrc.duplicate() as StandardMaterial3D
			halo.material_override = hm
			_halo_mats.append(hm)


func _build_foam_arcs() -> void:
	var foam := StandardMaterial3D.new()
	foam.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	foam.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	foam.cull_mode = BaseMaterial3D.CULL_DISABLED
	foam.albedo_color = Color(0.918, 0.969, 1.0, 0.75)
	var mesh := _make_ring_arc(1.7, 1.95, 24, PI * 0.7)
	for i in 2:
		var arc := MeshInstance3D.new()
		arc.name = "WaterArc%d" % i
		arc.mesh = mesh
		arc.material_override = foam
		arc.position = Vector3(0, 0.6, 0)
		arc.rotation.y = float(i) * PI
		arc.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		_fountain.add_child(arc)
		_arcs.append(arc)


func _build_string_lights() -> void:
	var group := Node3D.new()
	group.name = "StringLights"
	add_child(group)
	var tops: Array[Vector3] = []
	for i in 4:
		var lamp := _lamps.get_node_or_null("Lamp%d" % i) as Node3D
		if lamp != null:
			tops.append(lamp.position + Vector3(0, LAMP_TOP_Y, 0))
	if tops.size() < 2:
		return
	var wire_mat := StandardMaterial3D.new()
	wire_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	wire_mat.albedo_color = Color(0.169, 0.149, 0.125)
	var wires := ImmediateMesh.new()
	wires.surface_begin(Mesh.PRIMITIVE_LINES, wire_mat)
	var bulb_points: Array[Vector3] = []
	for i in tops.size():
		var from := tops[i]
		var to := tops[(i + 1) % tops.size()]
		var mid := (from + to) * 0.5
		mid.y -= WIRE_SAG
		var prev := _bezier(from, mid, to, 0.0)
		for s in range(1, 21):
			var p := _bezier(from, mid, to, float(s) / 20.0)
			wires.surface_add_vertex(prev)
			wires.surface_add_vertex(p)
			prev = p
		for b in range(1, 8):
			var bp := _bezier(from, mid, to, float(b) / 8.0)
			bp.y -= BULB_DROP
			bulb_points.append(bp)
	wires.surface_end()
	var wires_mi := MeshInstance3D.new()
	wires_mi.name = "Wires"
	wires_mi.mesh = wires
	wires_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	group.add_child(wires_mi)
	_bulb_mat = StandardMaterial3D.new()
	_bulb_mat.albedo_color = Color(1.0, 0.769, 0.416)
	_bulb_mat.emission_enabled = true
	_bulb_mat.emission = Color(1.0, 0.769, 0.416)
	_bulb_mat.emission_energy_multiplier = 1.3
	var bulb_mesh := SphereMesh.new()
	bulb_mesh.radius = 0.07
	bulb_mesh.height = 0.14
	bulb_mesh.radial_segments = 6
	bulb_mesh.rings = 4
	var bulbs := MultiMesh.new()
	bulbs.transform_format = MultiMesh.TRANSFORM_3D
	bulbs.mesh = bulb_mesh
	bulbs.instance_count = bulb_points.size()
	for i in bulb_points.size():
		bulbs.set_instance_transform(i, Transform3D(Basis(), bulb_points[i]))
	var bulbs_mi := MultiMeshInstance3D.new()
	bulbs_mi.name = "Bulbs"
	bulbs_mi.multimesh = bulbs
	bulbs_mi.material_override = _bulb_mat
	bulbs_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	group.add_child(bulbs_mi)


func _build_flowers() -> void:
	var group := Node3D.new()
	group.name = "Flowers"
	add_child(group)
	var leaf_mesh := SphereMesh.new()
	leaf_mesh.radius = 0.22
	leaf_mesh.height = 0.44
	leaf_mesh.radial_segments = 6
	leaf_mesh.rings = 4
	var leaf_mat := StandardMaterial3D.new()
	leaf_mat.albedo_color = Color(0.373, 0.561, 0.306)
	leaf_mat.roughness = 0.9
	var leaves := MultiMesh.new()
	leaves.transform_format = MultiMesh.TRANSFORM_3D
	leaves.mesh = leaf_mesh
	leaves.instance_count = FLOWER_COUNT
	var puff_mesh := SphereMesh.new()
	puff_mesh.radius = 0.15
	puff_mesh.height = 0.3
	puff_mesh.radial_segments = 6
	puff_mesh.rings = 4
	var puff_mat := StandardMaterial3D.new()
	puff_mat.vertex_color_use_as_albedo = true
	puff_mat.roughness = 0.7
	var puffs := MultiMesh.new()
	puffs.transform_format = MultiMesh.TRANSFORM_3D
	puffs.use_colors = true
	puffs.mesh = puff_mesh
	puffs.instance_count = FLOWER_COUNT
	for i in FLOWER_COUNT:
		var a := TAU * float(i) / float(FLOWER_COUNT)
		var r := FLOWER_BASE_R + float(i % 2) * 0.25
		var lp := Vector3(cos(a) * r, 0.16, sin(a) * r)
		leaves.set_instance_transform(i, Transform3D(Basis(), lp))
		var s := 0.8 + float(i % 3) * 0.25
		var basis := Basis.from_scale(Vector3.ONE * s)
		puffs.set_instance_transform(i, Transform3D(basis, Vector3(lp.x, 0.38, lp.z)))
		puffs.set_instance_color(i, _blossoms[i % _blossoms.size()])
	var leaves_mi := MultiMeshInstance3D.new()
	leaves_mi.name = "Leaves"
	leaves_mi.multimesh = leaves
	leaves_mi.material_override = leaf_mat
	group.add_child(leaves_mi)
	var puffs_mi := MultiMeshInstance3D.new()
	puffs_mi.name = "Puffs"
	puffs_mi.multimesh = puffs
	puffs_mi.material_override = puff_mat
	group.add_child(puffs_mi)


func _bezier(a: Vector3, b: Vector3, c: Vector3, t: float) -> Vector3:
	var u := 1.0 - t
	return a * (u * u) + b * (2.0 * u * t) + c * (t * t)


func _make_ring_arc(inner: float, outer: float, segments: int, arc: float) -> ArrayMesh:
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	var uvs := PackedVector2Array()
	var indices := PackedInt32Array()
	for i in range(segments + 1):
		var a := arc * float(i) / float(segments)
		var c := cos(a)
		var s := sin(a)
		verts.append(Vector3(c * inner, 0, s * inner))
		verts.append(Vector3(c * outer, 0, s * outer))
		normals.append(Vector3.UP)
		normals.append(Vector3.UP)
		uvs.append(Vector2(float(i) / float(segments), 0))
		uvs.append(Vector2(float(i) / float(segments), 1))
	for i in segments:
		var b := i * 2
		indices.append_array(PackedInt32Array([b, b + 2, b + 1, b + 1, b + 2, b + 3]))
	var arr: Array = []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_NORMAL] = normals
	arr[Mesh.ARRAY_TEX_UV] = uvs
	arr[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return mesh
