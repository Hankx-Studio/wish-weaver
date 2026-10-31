extends Node3D
## Terrain + sky dressing for the meadow world (matches three.js layout 1:1).
## Builds everything procedurally in _ready: sculpted meadow disc, dirt path,
## pond with animated water, instanced scatter (grass/clover/flowers/pebbles),
## mountain silhouette rings, and a sun-glow billboard-style quad.

const MEADOW_RADIUS := 63.0 # WORLD3D.radius (55) + 8, matches ground.ts
const POND_POS := Vector2(-8.0, 24.0)
const POND_R := 6.0
const SPAWN_POS := Vector2(0.0, 6.0)

const WATER_LEVEL := 0.06

# Path control points in XZ, copied from ground.ts dirtPathCurve().
const PATH_POINTS := [
	Vector2(0, 9), Vector2(3, -1), Vector2(8, -11),
	Vector2(13, -20), Vector2(17, -28),
]

var _rng_state: int = 1
var _path_samples: Array[Vector2] = []
var _glint_mat: StandardMaterial3D
var _time := 0.0


func _ready() -> void:
	_cache_path_samples()
	_build_collision()
	_build_meadow()
	_build_outer_ground()
	_build_dirt_path()
	_build_pond()
	_build_scatter()
	_build_mountains()
	_build_sun_glow()


func _process(delta: float) -> void:
	_time += delta
	if _glint_mat != null:
		var c := _glint_mat.albedo_color
		c.a = 0.22 + sin(_time * 2.3 + 2.1) * 0.1
		_glint_mat.albedo_color = c


# ---------------------------------------------------------------- RNG helpers

func _seed(s: int) -> void:
	_rng_state = s & 0xFFFFFFFF


# Deterministic mulberry32, mirrors the three.js scatter.
func _rand() -> float:
	_rng_state = (_rng_state + 0x6D2B79F5) & 0xFFFFFFFF
	var t: int = _rng_state
	t = ((t ^ (t >> 15)) * ((t | 1) & 0xFFFFFFFF)) & 0xFFFFFFFF
	t = (t + (((t ^ (t >> 7)) * ((t | 61) & 0xFFFFFFFF)) & 0xFFFFFFFF)) & 0xFFFFFFFF
	t = (t ^ (t >> 14)) & 0xFFFFFFFF
	return float(t) / 4294967296.0


# ---------------------------------------------------------------- Path curve

func _path_point(t: float) -> Vector2:
	var segs := PATH_POINTS.size() - 1
	var f: float = clampf(t, 0.0, 1.0) * float(segs)
	var i: int = mini(int(f), segs - 1)
	var u: float = f - float(i)
	var p0: Vector2 = PATH_POINTS[maxi(i - 1, 0)]
	var p1: Vector2 = PATH_POINTS[i]
	var p2: Vector2 = PATH_POINTS[i + 1]
	var p3: Vector2 = PATH_POINTS[mini(i + 2, segs)]
	var u2 := u * u
	var u3 := u2 * u
	return ((p1 * 2.0) + (p2 - p0) * u
			+ (p0 * 2.0 - p1 * 5.0 + p2 * 4.0 - p3) * u2
			+ (p3 - p0 + p1 * 3.0 - p2 * 3.0) * u3) * 0.5


func _cache_path_samples() -> void:
	_path_samples.clear()
	for i in 49:
		_path_samples.append(_path_point(float(i) / 48.0))


func _dist_to_path(x: float, z: float) -> float:
	var best := 1e9
	for p in _path_samples:
		var d := Vector2(x - p.x, z - p.y).length()
		if d < best:
			best = d
	return best


func _is_clear_spot(x: float, z: float) -> bool:
	if Vector2(x - POND_POS.x, z - POND_POS.y).length() < POND_R + 1.2:
		return false
	if _dist_to_path(x, z) < 1.9:
		return false
	return true


# ---------------------------------------------------------------- Ground shape

func _ground_height(x: float, z: float) -> float:
	var h := (0.22 * sin(x * 0.15 + 0.8) * cos(z * 0.13 - 0.4)
			+ 0.14 * sin(x * 0.05 - 0.3 + sin(z * 0.07)) * cos(z * 0.06 + 1.1))
	# Flat under the dirt path and around spawn so feet stay planted.
	h *= smoothstep(1.6, 4.5, _dist_to_path(x, z))
	h *= smoothstep(2.5, 6.0, Vector2(x - SPAWN_POS.x, z - SPAWN_POS.y).length())
	# Pond bowl: carve below the water level.
	var dpond := Vector2(x - POND_POS.x, z - POND_POS.y).length()
	var cap := lerpf(-0.5, 0.0, smoothstep(POND_R * 0.4, POND_R + 1.2, dpond))
	h = minf(h, cap)
	# Calm rim so the meadow melts into the horizon.
	h *= 1.0 - smoothstep(55.0, MEADOW_RADIUS, Vector2(x, z).length())
	return h


func _meadow_color(x: float, z: float) -> Color:
	var base := Color8(0x9d, 0xaf, 0x9a).srgb_to_linear()
	var sunlit := Color8(0xa8, 0xba, 0xa4).srgb_to_linear()
	var shade := Color8(0x7a, 0x8b, 0x78).srgb_to_linear()
	var dry := Color8(0xc9, 0xbe, 0x9a).srgb_to_linear()
	var sun := 0.5 + 0.5 * sin(x * 0.11 + 1.7) * cos(z * 0.13 - 0.6)
	var pools := 0.5 + 0.5 * sin(x * 0.05 - 0.4 + sin(z * 0.07)) * cos(z * 0.06 + 1.1)
	var parched := 0.5 + 0.5 * sin(x * 0.21 + 0.3) * sin(z * 0.19 + 2.2)
	var c := base.lerp(sunlit, sun * 0.75)
	if pools > 0.62:
		c = c.lerp(shade, (pools - 0.62) * 1.4)
	if parched > 0.86:
		c = c.lerp(dry, (parched - 0.86) * 2.2)
	return c


func _ground_normal(x: float, z: float) -> Vector3:
	var e := 0.6
	var hx := _ground_height(x - e, z) - _ground_height(x + e, z)
	var hz := _ground_height(x, z - e) - _ground_height(x, z + e)
	return Vector3(hx, 2.0 * e, hz).normalized()


func _std_mat(albedo: Color, roughness: float, vertex_color := false) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = albedo
	mat.metallic = 0.0
	mat.roughness = roughness
	mat.vertex_color_use_as_albedo = vertex_color
	return mat


func _mesh_from_arrays(verts: PackedVector3Array, normals: PackedVector3Array,
		colors: PackedColorArray, uvs: PackedVector2Array, indices: PackedInt32Array) -> ArrayMesh:
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = verts
	arrays[Mesh.ARRAY_NORMAL] = normals
	if colors.size() == verts.size():
		arrays[Mesh.ARRAY_COLOR] = colors
	if uvs.size() == verts.size():
		arrays[Mesh.ARRAY_TEX_UV] = uvs
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh


func _add_mesh_instance(parent_name: String, mesh: Mesh, mat: Material,
		shadow := GeometryInstance3D.SHADOW_CASTING_SETTING_ON) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = parent_name
	mi.mesh = mesh
	mi.material_override = mat
	mi.cast_shadow = shadow
	add_child(mi)
	return mi


# ---------------------------------------------------------------- Builders

func _build_collision() -> void:
	var body := StaticBody3D.new()
	body.name = "GroundBody"
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(130, 1, 130)
	shape.shape = box
	shape.position = Vector3(0, -0.5, 0)
	body.add_child(shape)
	add_child(body)


func _build_meadow() -> void:
	var sectors := 72
	var rings := 40
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	var colors := PackedColorArray()
	var uvs := PackedVector2Array()
	var indices := PackedInt32Array()
	# Center vertex.
	verts.append(Vector3(0, _ground_height(0, 0), 0))
	normals.append(_ground_normal(0, 0))
	colors.append(_meadow_color(0, 0))
	uvs.append(Vector2(0.5, 0.5))
	for ri in range(1, rings + 1):
		var r := MEADOW_RADIUS * float(ri) / float(rings)
		for si in sectors:
			var a := TAU * float(si) / float(sectors)
			var x := cos(a) * r
			var z := sin(a) * r
			verts.append(Vector3(x, _ground_height(x, z), z))
			normals.append(_ground_normal(x, z))
			colors.append(_meadow_color(x, z))
			uvs.append(Vector2(x / 126.0 + 0.5, z / 126.0 + 0.5))
	# Fan around the center.
	for si in sectors:
		indices.append_array([0, 1 + si, 1 + (si + 1) % sectors])
	# Quads between rings.
	for ri in range(1, rings):
		var inner := 1 + (ri - 1) * sectors
		var outer := 1 + ri * sectors
		for si in sectors:
			var n := (si + 1) % sectors
			indices.append_array([inner + si, outer + si, outer + n,
					inner + si, outer + n, inner + n])
	var mesh := _mesh_from_arrays(verts, normals, colors, uvs, indices)
	var mat := _std_mat(Color.WHITE, 0.9, true)
	_add_mesh_instance("Meadow", mesh, mat)


# Huge hazy disc under everything so the horizon meets fog, not void.
func _build_outer_ground() -> void:
	var sectors := 48
	var radius := 400.0
	var verts := PackedVector3Array([Vector3(0, -0.55, 0)])
	var normals := PackedVector3Array([Vector3.UP])
	var indices := PackedInt32Array()
	for si in sectors:
		var a := TAU * float(si) / float(sectors)
		verts.append(Vector3(cos(a) * radius, -0.55, sin(a) * radius))
		normals.append(Vector3.UP)
	for si in sectors:
		indices.append_array([0, 1 + (si + 1) % sectors, 1 + si])
	var mesh := _mesh_from_arrays(verts, normals, PackedColorArray(),
			PackedVector2Array(), indices)
	var mat := _std_mat(Color8(0x8a, 0x9a, 0x88).srgb_to_linear(), 1.0)
	_add_mesh_instance("OuterGround", mesh, mat,
			GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)


func _build_dirt_path() -> void:
	var segments := 44
	var across := 5
	var dirt := Color8(0xdd, 0xd2, 0xb4).srgb_to_linear()
	var dirt_dark := Color8(0xbe, 0xa8, 0x86).srgb_to_linear()
	var grass_edge := Color8(0x9d, 0xaf, 0x9a).srgb_to_linear()
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	var colors := PackedColorArray()
	var uvs := PackedVector2Array()
	var indices := PackedInt32Array()
	for i in segments + 1:
		var t := float(i) / float(segments)
		var p := _path_point(t)
		var pa := _path_point(maxf(t - 0.01, 0.0))
		var pb := _path_point(minf(t + 0.01, 1.0))
		var tan := (pb - pa).normalized()
		var n := Vector2(-tan.y, tan.x)
		var half := 1.35 - 0.3 * t
		for j in across:
			var f := float(j) / float(across - 1) * 2.0 - 1.0
			var x := p.x + n.x * f * half
			var z := p.y + n.y * f * half
			verts.append(Vector3(x, _ground_height(x, z) + 0.04, z))
			normals.append(Vector3.UP)
			var edge := smoothstep(0.55, 1.0, absf(f))
			var wear := 0.5 + 0.5 * sin(t * 31.0 + f * 2.4)
			colors.append(dirt.lerp(dirt_dark, wear * 0.35).lerp(grass_edge, edge))
			uvs.append(Vector2(float(j) / float(across - 1), t))
	for i in segments:
		for j in across - 1:
			var a := i * across + j
			var b := a + 1
			var d := a + across
			var e := d + 1
			indices.append_array([a, d, b, b, d, e])
	var mesh := _mesh_from_arrays(verts, normals, colors, uvs, indices)
	var mat := _std_mat(Color.WHITE, 1.0, true)
	_add_mesh_instance("DirtPath", mesh, mat,
			GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)


# Flat ring-following disc helper (pond rim / water / glint).
func _flat_disc(sector_count: int, rings: int, radius: float, y: float,
		follow_ground: float, color_fn: Callable) -> ArrayMesh:
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	var colors := PackedColorArray()
	var uvs := PackedVector2Array()
	var indices := PackedInt32Array()
	verts.append(Vector3(POND_POS.x, y, POND_POS.y))
	normals.append(Vector3.UP)
	colors.append(color_fn.call(0.0))
	uvs.append(Vector2(0.5, 0.5))
	for ri in range(1, rings + 1):
		var r := radius * float(ri) / float(rings)
		for si in sector_count:
			var a := TAU * float(si) / float(sector_count)
			var x := POND_POS.x + cos(a) * r
			var z := POND_POS.y + sin(a) * r
			var yy := y + (_ground_height(x, z) + follow_ground - y) if follow_ground >= 0.0 else y
			verts.append(Vector3(x, yy, z))
			normals.append(Vector3.UP)
			colors.append(color_fn.call(r / radius))
			uvs.append(Vector2(cos(a) * r / radius * 0.5 + 0.5, sin(a) * r / radius * 0.5 + 0.5))
	for si in sector_count:
		indices.append_array([0, 1 + si, 1 + (si + 1) % sector_count])
	for ri in range(1, rings):
		var inner := 1 + (ri - 1) * sector_count
		var outer := 1 + ri * sector_count
		for si in sector_count:
			var n := (si + 1) % sector_count
			indices.append_array([inner + si, outer + si, outer + n,
					inner + si, outer + n, inner + n])
	return _mesh_from_arrays(verts, normals, colors, uvs, indices)


func _build_pond() -> void:
	# Sandy rim hugging the terrain.
	var rim_mesh := _flat_disc(40, 3, POND_R + 0.9, 0.03, 0.03,
			func(_t: float) -> Color: return Color8(0xe8, 0xdc, 0xc2).srgb_to_linear())
	_add_mesh_instance("PondRim", rim_mesh, _std_mat(Color.WHITE, 1.0, true),
			GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)
	# Water with scrolling ripple bands + shimmer (TIME-driven shader).
	var deep := Color(0.32, 0.52, 0.6, 0.85)
	var shallow := Color(0.62, 0.8, 0.83, 0.85)
	var water_mesh := _flat_disc(44, 6, POND_R, WATER_LEVEL, -1.0,
			func(t: float) -> Color: return deep.lerp(shallow, smoothstep(0.15, 1.0, t)))
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_mix, cull_disabled, diffuse_lambert;
void fragment() {
	float bands = sin(UV.x * 28.0 + TIME * 1.7) * 0.5
		+ sin(UV.y * 34.0 - TIME * 1.2 + 1.3) * 0.5;
	float glint = smoothstep(0.75, 1.0, bands) * 0.35;
	ALBEDO = COLOR.rgb + glint * vec3(0.9, 1.0, 1.0);
	ALPHA = COLOR.a * (0.92 + 0.08 * bands);
	ROUGHNESS = 0.25;
	SPECULAR = 0.5;
}
"""
	var water_mat := ShaderMaterial.new()
	water_mat.shader = shader
	_add_mesh_instance("PondWater", water_mesh, water_mat,
			GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)
	# Additive glint ring, opacity pulsed in _process.
	var glint_mesh := _ring_mesh(40, POND_R * 0.35, POND_R * 0.62, WATER_LEVEL + 0.03)
	_glint_mat = StandardMaterial3D.new()
	_glint_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_glint_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_glint_mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	_glint_mat.albedo_color = Color(0.92, 1.0, 1.0, 0.25)
	_glint_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	_add_mesh_instance("PondGlint", glint_mesh, _glint_mat,
			GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)


func _ring_mesh(sector_count: int, r0: float, r1: float, y: float) -> ArrayMesh:
	var verts := PackedVector3Array()
	var normals := PackedVector3Array()
	var indices := PackedInt32Array()
	for si in sector_count + 1:
		var a := TAU * float(si) / float(sector_count)
		var dx := cos(a)
		var dz := sin(a)
		verts.append(Vector3(POND_POS.x + dx * r0, y, POND_POS.y + dz * r0))
		verts.append(Vector3(POND_POS.x + dx * r1, y, POND_POS.y + dz * r1))
		normals.append(Vector3.UP)
		normals.append(Vector3.UP)
	for si in sector_count:
		var a := si * 2
		indices.append_array([a, a + 2, a + 1, a + 1, a + 2, a + 3])
	return _mesh_from_arrays(verts, normals, PackedColorArray(),
			PackedVector2Array(), indices)


# ---------------------------------------------------------------- Scatter

func _scatter_spots(count: int, radius: float, seed: int) -> Array:
	_seed(seed)
	var out: Array = []
	var fallback: Array = []
	var guard := 0
	while out.size() < count and guard < count * 8:
		guard += 1
		var a := _rand() * TAU
		var d := sqrt(_rand()) * radius
		var spot := {"x": cos(a) * d, "z": sin(a) * d,
				"s": 0.7 + _rand() * 0.7, "r": _rand() * TAU}
		if _is_clear_spot(spot["x"], spot["z"]):
			out.append(spot)
		elif fallback.size() < count:
			fallback.append(spot)
	while out.size() < count and not fallback.is_empty():
		out.append(fallback.pop_back())
	return out


func _scatter_basis(spot: Dictionary, y_squash: float, y_offset: float) -> Transform3D:
	var s: float = spot["s"]
	var b := Basis(Vector3.UP, spot["r"]).scaled(Vector3(s, s * y_squash, s))
	return Transform3D(b, Vector3(spot["x"], _ground_height(spot["x"], spot["z"]) + y_offset * s, spot["z"]))


func _make_multimesh(node_name: String, mesh: Mesh, mat: Material,
		transforms: Array[Transform3D], colors: PackedColorArray,
		shadow := GeometryInstance3D.SHADOW_CASTING_SETTING_OFF) -> void:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.mesh = mesh
	mm.instance_count = transforms.size()
	for i in transforms.size():
		mm.set_instance_transform(i, transforms[i])
		mm.set_instance_color(i, colors[i])
	var mmi := MultiMeshInstance3D.new()
	mmi.name = node_name
	mmi.multimesh = mm
	mmi.material_override = mat
	mmi.cast_shadow = shadow
	add_child(mmi)


func _build_scatter() -> void:
	var off := GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# Grass tufts: 5-sided cones.
	var tuft := CylinderMesh.new()
	tuft.top_radius = 0.0
	tuft.bottom_radius = 0.13
	tuft.height = 0.38
	tuft.radial_segments = 5
	var grass_mat := _std_mat(Color.WHITE, 0.9)
	_build_one_scatter("Grass", tuft, grass_mat, _scatter_spots(700, 52, 11),
			Color8(0x9d, 0xaf, 0x9a).srgb_to_linear(), 1.0, 0.17, off)
	# Low clover tufts, darker squashed spheres.
	var clover := SphereMesh.new()
	clover.radius = 0.11
	clover.height = 0.22
	clover.radial_segments = 7
	clover.rings = 4
	_build_one_scatter("Clover", clover, _std_mat(Color.WHITE, 0.9),
			_scatter_spots(150, 50, 83), Color8(0x6e, 0x82, 0x72).srgb_to_linear(), 0.55, 0.06, off)
	# Flowers: green stems + pastel heads.
	var stems := CylinderMesh.new()
	stems.top_radius = 0.02
	stems.bottom_radius = 0.03
	stems.height = 0.5
	stems.radial_segments = 5
	var spots := _scatter_spots(120, 50, 29)
	var stem_xf: Array[Transform3D] = []
	var stem_col := PackedColorArray()
	var head_xf: Array[Transform3D] = []
	var head_col := PackedColorArray()
	var palette := [Color8(0xcb, 0xa9, 0xb4).srgb_to_linear(), Color8(0xf2, 0xeb, 0xdd).srgb_to_linear(), Color8(0xe8, 0xc8, 0x79).srgb_to_linear()]
	var stem_base := Color8(0x7a, 0x8b, 0x78).srgb_to_linear()
	for i in spots.size():
		var spot: Dictionary = spots[i]
		stem_xf.append(_scatter_basis(spot, 1.0, 0.25))
		stem_col.append(stem_base.darkened((1.0 - spot["s"]) * 0.15))
		head_xf.append(_scatter_basis(spot, 1.0, 0.52))
		head_col.append(palette[i % palette.size()])
	var head := SphereMesh.new()
	head.radius = 0.13
	head.height = 0.26
	head.radial_segments = 8
	head.rings = 6
	_make_multimesh("FlowerStems", stems, _std_mat(Color.WHITE, 0.8), stem_xf, stem_col, off)
	_make_multimesh("FlowerHeads", head, _std_mat(Color.WHITE, 0.6), head_xf, head_col, off)
	# Pebbles: small faceted stones.
	var peb := SphereMesh.new()
	peb.radius = 0.14
	peb.height = 0.28
	peb.radial_segments = 7
	peb.rings = 4
	_build_one_scatter("Pebbles", peb, _std_mat(Color.WHITE, 0.95),
			_scatter_spots(100, 50, 77), Color8(0xa8, 0xa0, 0x94).srgb_to_linear(), 0.6, 0.07,
			GeometryInstance3D.SHADOW_CASTING_SETTING_ON)


func _build_one_scatter(node_name: String, mesh: Mesh, mat: Material, spots: Array,
		base: Color, y_squash: float, y_offset: float, shadow: int) -> void:
	var transforms: Array[Transform3D] = []
	var colors := PackedColorArray()
	for spot in spots:
		transforms.append(_scatter_basis(spot, y_squash, y_offset))
		var l: float = (spot["s"] - 1.0) * 0.12
		colors.append(base.lightened(l) if l >= 0.0 else base.darkened(-l))
	_make_multimesh(node_name, mesh, mat, transforms, colors, shadow)


# ---------------------------------------------------------------- Mountains

func _build_mountains() -> void:
	var cone := CylinderMesh.new()
	cone.top_radius = 0.0
	cone.bottom_radius = 1.0
	cone.height = 1.0
	cone.radial_segments = 5
	_seed(31)
	_build_mountain_ring("MountainsFar", cone, Color8(0xa8, 0xc0, 0xcf).srgb_to_linear(),
			8, 0.0, 195.0, 240.0, 55.0, 105.0, 6.0)
	_build_mountain_ring("MountainsNear", cone, Color8(0x74, 0x7e, 0x9d).srgb_to_linear(),
			7, 0.3, 140.0, 175.0, 38.0, 72.0, 4.0)


func _build_mountain_ring(node_name: String, mesh: Mesh, color: Color, count: int,
		phase: float, r_min: float, r_max: float, h_min: float, h_max: float,
		sink: float) -> void:
	var transforms: Array[Transform3D] = []
	var colors := PackedColorArray()
	for i in count:
		var a := float(i) / float(count) * TAU + phase + _rand() * 0.4
		var r := r_min + _rand() * (r_max - r_min)
		var h := h_min + _rand() * (h_max - h_min)
		var br := 26.0 + _rand() * 20.0 if node_name == "MountainsNear" else 34.0 + _rand() * 24.0
		var b := Basis(Vector3.UP, _rand() * TAU).scaled(Vector3(br, h, br))
		transforms.append(Transform3D(b, Vector3(cos(a) * r, h * 0.5 - sink, sin(a) * r)))
		colors.append(Color.WHITE)
	_make_multimesh(node_name, mesh, _std_mat(color, 1.0), transforms, colors,
			GeometryInstance3D.SHADOW_CASTING_SETTING_OFF)


# ---------------------------------------------------------------- Sun glow

func _build_sun_glow() -> void:
	# Static camera-facing-approx quad: the sun is ~330m out so play-area
	# parallax is negligible; no per-frame billboarding needed.
	var sun_dir := Vector3(150, 190, 60).normalized()
	var quad := QuadMesh.new()
	quad.size = Vector2(130, 130)
	var mi := MeshInstance3D.new()
	mi.name = "SunGlow"
	mi.mesh = quad
	mi.position = sun_dir * 330.0
	add_child(mi)
	mi.look_at(Vector3.ZERO, Vector3.UP)
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode blend_add, depth_draw_never, cull_disabled, fog_disabled, unshaded;
void fragment() {
	float d = length(UV - vec2(0.5)) * 2.0;
	float core = smoothstep(0.28, 0.0, d);
	float halo = smoothstep(1.0, 0.0, d) * 0.5;
	ALBEDO = vec3(1.0, 0.93, 0.78) * core + vec3(1.0, 0.8, 0.55) * halo;
	ALPHA = clamp(core + halo, 0.0, 1.0);
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = shader
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
