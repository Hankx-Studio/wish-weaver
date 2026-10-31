# Meadow: builds Moonleaf Meadow in code. Warm sky, soft hills, fountain plaza, stall.
class_name Meadow
extends Node3D

const MEADOW_R := 42.0

func build() -> void:
	_build_sky()
	_build_lights()
	_build_ground()
	_build_flora()
	_build_trees()
	_build_fountain(Vector3(10, 0, 6))
	_build_stall(Vector3(-12, 0, 10))
	_build_lanterns()
	_build_path()

func _mat(color: Color, rough: float = 0.85, emission: Color = Color(0, 0, 0)) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	if emission.a > 0.0 or emission.r + emission.g + emission.b > 0.0:
		m.emission_enabled = true
		m.emission = emission
		m.emission_energy_multiplier = 1.5
	return m

func _build_sky() -> void:
	var env := WorldEnvironment.new()
	env.name = "WorldEnvironment"
	var e := Environment.new()
	var sky := Sky.new()
	var sh := Shader.new()
	sh.code = "shader_type sky;\nvoid sky() {\n\tfloat h = clamp(EYEDIR.y * 0.5 + 0.5, 0.0, 1.0);\n\tvec3 top = vec3(0.30, 0.50, 0.84);\n\tvec3 mid = vec3(0.58, 0.74, 0.90);\n\tvec3 hor = vec3(0.80, 0.88, 0.93);\n\tvec3 c = mix(hor, mix(mid, top, smoothstep(0.55, 1.0, h)), smoothstep(0.48, 0.62, h));\n\tif (EYEDIR.y < 0.0) { c = vec3(0.40, 0.54, 0.40); }\n\tCOLOR = c;\n}\n"
	var sm := ShaderMaterial.new()
	sm.shader = sh
	sky.sky_material = sm
	e.background_mode = Environment.BG_SKY
	e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.55, 0.63, 0.75)
	e.ambient_light_energy = 0.38
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	e.glow_enabled = false
	e.fog_enabled = true
	e.fog_mode = Environment.FOG_MODE_DEPTH
	e.fog_light_color = Color(0.72, 0.82, 0.90)
	e.fog_depth_begin = 35.0
	e.fog_depth_end = 150.0
	env.environment = e
	add_child(env)

func _build_lights() -> void:
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-48, -35, 0)
	sun.light_color = Color(1.0, 0.93, 0.8)
	sun.light_energy = 0.85
	sun.shadow_enabled = true
	add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.name = "Fill"
	fill.rotation_degrees = Vector3(-30, 140, 0)
	fill.light_color = Color(0.65, 0.75, 0.95)
	fill.light_energy = 0.25
	fill.shadow_enabled = false
	add_child(fill)

func _build_ground() -> void:
	var plane := PlaneMesh.new()
	plane.size = Vector2(MEADOW_R * 2.4, MEADOW_R * 2.4)
	plane.subdivide_width = 48
	plane.subdivide_depth = 48
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rng := RandomNumberGenerator.new()
	rng.seed = 1234
	var hs := plane.size.x
	# Displace via ArrayMeshEdit: sample plane verts through MeshDataTool.
	var tmp := ArrayMesh.new()
	tmp.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, plane.get_mesh_arrays())
	var mdt := MeshDataTool.new()
	mdt.create_from_surface(tmp, 0)
	for i in mdt.get_vertex_count():
		var v: Vector3 = mdt.get_vertex(i)
		v.y = ground_height(v.x, v.z)
		mdt.set_vertex(i, v)
	tmp.clear_surfaces()
	mdt.commit_to_surface(tmp)
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.set_smooth_group(-1)
	var ground := MeshInstance3D.new()
	ground.name = "Ground"
	ground.mesh = tmp
	# Two-tone green blend: seeded noise texture as albedo (generates async, tints in when ready).
	var ground_noise := FastNoiseLite.new()
	ground_noise.seed = 1234
	ground_noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	ground_noise.frequency = 0.06
	ground_noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	ground_noise.fractal_octaves = 4
	ground_noise.fractal_gain = 0.5
	var ground_ramp := Gradient.new()
	ground_ramp.set_color(0, Color(0.27, 0.46, 0.20))
	ground_ramp.set_color(1, Color(0.47, 0.65, 0.32))
	ground_ramp.add_point(0.5, Color(0.36, 0.56, 0.26))
	var ground_tex := NoiseTexture2D.new()
	ground_tex.width = 512
	ground_tex.height = 512
	ground_tex.noise = ground_noise
	ground_tex.color_ramp = ground_ramp
	ground_tex.seamless = true
	ground_tex.generate_mipmaps = true
	var ground_mat := StandardMaterial3D.new()
	ground_mat.albedo_color = Color(1.0, 1.0, 1.0)
	ground_mat.albedo_texture = ground_tex
	ground_mat.roughness = 0.9
	ground_mat.uv1_scale = Vector3(7.0, 7.0, 1.0)
	ground.material_override = ground_mat
	add_child(ground)
	var sb := StaticBody3D.new()
	sb.name = "GroundBody"
	var cs := CollisionShape3D.new()
	var shape := HeightMapShape3D.new()
	# Cheap flat collider at y=0 plus rim: use a big box; hills are visual-only near rim.
	var box := BoxShape3D.new()
	box.size = Vector3(MEADOW_R * 2.4, 1.0, MEADOW_R * 2.4)
	cs.shape = box
	cs.position.y = -0.5
	sb.add_child(cs)
	add_child(sb)
	rng = rng  # seed kept for flora pass

func ground_height(x: float, z: float) -> float:
	# Flat inside the play bowl (matches the flat collider), hills outside.
	var d := Vector2(x, z).length()
	var k := smoothstep(20.0, 34.0, d)
	var h := sin(x * 0.15) * cos(z * 0.13) * 0.7
	h += sin(x * 0.05 + 1.7) * cos(z * 0.06 + 0.6) * 1.2
	h *= k
	if d > MEADOW_R * 0.7:
		h += (d - MEADOW_R * 0.7) * 0.35  # rim hills
	return h

func _build_flora() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 77
	# Grass tufts (crossed quads via MultiMesh).
	var quad := QuadMesh.new()
	quad.size = Vector2(0.38, 0.5)
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.mesh = quad
	var count := 900
	mm.instance_count = count
	for i in count:
		var a := rng.randf() * TAU
		var r := 4.0 + rng.randf() * (MEADOW_R - 6.0)
		var x := cos(a) * r
		var z := sin(a) * r
		var t := Transform3D(Basis(Vector3.UP, rng.randf() * TAU), Vector3(x, ground_height(x, z) + 0.25, z))
		mm.set_instance_transform(i, t)
	var mmi := MultiMeshInstance3D.new()
	mmi.name = "Grass"
	mmi.multimesh = mm
	var gm := _mat(Color(0.36, 0.60, 0.28))
	gm.cull_mode = BaseMaterial3D.CULL_DISABLED
	mmi.material_override = gm
	add_child(mmi)
	# Flowers: small emissive spheres scattered.
	var fmesh := SphereMesh.new()
	fmesh.radius = 0.09
	fmesh.height = 0.18
	var fmm := MultiMesh.new()
	fmm.transform_format = MultiMesh.TRANSFORM_3D
	fmm.mesh = fmesh
	var fn := 140
	fmm.instance_count = fn
	var cols := [Color(1, 0.75, 0.8), Color(1, 0.95, 0.6), Color(0.8, 0.85, 1.0)]
	for i in fn:
		var a := rng.randf() * TAU
		var r := 3.0 + rng.randf() * (MEADOW_R - 8.0)
		var x := cos(a) * r
		var z := sin(a) * r
		fmm.set_instance_transform(i, Transform3D(Basis(), Vector3(x, ground_height(x, z) + 0.35, z)))
	var fmi := MultiMeshInstance3D.new()
	fmi.name = "Flowers"
	fmi.multimesh = fmm
	fmi.material_override = _mat(cols[0], 0.6, cols[0])
	add_child(fmi)

func _dist_to_segment_2d(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var denom := ab.length_squared()
	if denom == 0.0:
		return p.distance_to(a)
	var t := clampf((p - a).dot(ab) / denom, 0.0, 1.0)
	return p.distance_to(a + ab * t)

func _is_clear_for_tree(p: Vector2, placed: Array) -> bool:
	# Spec minimums are 3m (paths/landmarks) and 2.5m (NPC/pickups); slightly
	# larger margins are used so canopies do not swallow landmarks/NPCs.
	if p.distance_to(Vector2(10, 6)) < 4.5:
		return false  # fountain
	if p.distance_to(Vector2(-12, 10)) < 4.0:
		return false  # stall
	if p.distance_to(Vector2(0, 18)) < 4.0:
		return false  # spawn
	if p.distance_to(Vector2(0, -14)) < 6.5:
		return false  # Tree of Life (trunk + runestone ring at r=5.5)
	var routes := [
		[Vector2(0, 18), Vector2(10, 6)],
		[Vector2(0, 18), Vector2(-12, 10)],
		[Vector2(0, 18), Vector2(0, -14)],
	]
	for r in routes:
		if _dist_to_segment_2d(p, r[0], r[1]) < 3.0:
			return false
	var npc_spots := [Vector2(12.5, 8.5), Vector2(-12, 12.2), Vector2(-3, 2), Vector2(6, -4), Vector2(-8, -8)]
	for s in npc_spots:
		if p.distance_to(s) < 3.0:
			return false
	var pickups := [Vector2(5, 12), Vector2(-5, 6), Vector2(3, -9)]
	for s in pickups:
		if p.distance_to(s) < 3.0:
			return false
	var lanterns := [Vector2(4, -6), Vector2(-6, -2), Vector2(14, -4), Vector2(-4, 14), Vector2(6, 14)]
	for s in lanterns:
		if p.distance_to(s) < 2.0:
			return false
	for q in placed:
		if p.distance_to(q) < 3.0:
			return false
	return true

func _build_trees() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 20240817
	# Shared low-poly meshes (created once, reused by every tree).
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.22
	trunk_mesh.bottom_radius = 0.34
	trunk_mesh.height = 1.8
	trunk_mesh.radial_segments = 7
	var canopy_mesh := SphereMesh.new()
	canopy_mesh.radius = 1.35
	canopy_mesh.height = 2.2
	canopy_mesh.radial_segments = 8
	canopy_mesh.rings = 4
	# Shared materials only: 1 trunk + 3 canopy greens.
	var trunk_mat := _mat(Color(0.42, 0.30, 0.20))
	var canopy_mats := [
		_mat(Color(0.22, 0.46, 0.20)),
		_mat(Color(0.30, 0.55, 0.24)),
		_mat(Color(0.38, 0.60, 0.28)),
	]
	var trunk_shape := CylinderShape3D.new()
	trunk_shape.radius = 0.35
	trunk_shape.height = 1.8
	# Placement: outer ring r=20..40, then inner clusters r=8..16.
	var placed: Array = []
	var ring_target := 26
	var attempts := 0
	while placed.size() < ring_target and attempts < 600:
		attempts += 1
		var a := rng.randf() * TAU
		var r := rng.randf_range(20.0, 40.0)
		var p := Vector2(cos(a) * r, sin(a) * r)
		if _is_clear_for_tree(p, placed):
			placed.append(p)
	var total_target := ring_target + 12
	attempts = 0
	while placed.size() < total_target and attempts < 800:
		attempts += 1
		var a2 := rng.randf() * TAU
		var r2 := rng.randf_range(8.0, 16.0)
		var p2 := Vector2(cos(a2) * r2, sin(a2) * r2)
		if _is_clear_for_tree(p2, placed):
			placed.append(p2)
	var forest := Node3D.new()
	forest.name = "Trees"
	add_child(forest)
	for i in placed.size():
		var p: Vector2 = placed[i]
		var tree := Node3D.new()
		tree.name = "Tree%d" % [i]
		tree.position = Vector3(p.x, ground_height(p.x, p.y) - 0.1, p.y)
		tree.rotation.y = rng.randf() * TAU
		var s := rng.randf_range(0.85, 1.45)
		tree.scale = Vector3(s, s * rng.randf_range(0.9, 1.15), s)
		forest.add_child(tree)
		var trunk := MeshInstance3D.new()
		trunk.name = "Trunk"
		trunk.mesh = trunk_mesh
		trunk.position.y = 0.9
		trunk.material_override = trunk_mat
		tree.add_child(trunk)
		var canopy := MeshInstance3D.new()
		canopy.name = "Canopy"
		canopy.mesh = canopy_mesh
		canopy.position = Vector3(0, 2.7, 0)
		canopy.material_override = canopy_mats[i % canopy_mats.size()]
		tree.add_child(canopy)
		var crown := MeshInstance3D.new()
		crown.name = "Crown"
		crown.mesh = canopy_mesh
		crown.position = Vector3(0.55, 3.55, 0.2)
		crown.scale = Vector3(0.62, 0.62, 0.62)
		crown.material_override = canopy_mats[(i + 1) % canopy_mats.size()]
		tree.add_child(crown)
		var body := StaticBody3D.new()
		body.name = "TrunkBody"
		var cs := CollisionShape3D.new()
		cs.shape = trunk_shape
		cs.position.y = 0.9
		body.add_child(cs)
		tree.add_child(body)
	print("Meadow trees: ", placed.size())

func _build_fountain(at: Vector3) -> void:
	var root := Node3D.new()
	root.name = "Fountain"
	root.position = Vector3(at.x, ground_height(at.x, at.z), at.z)
	add_child(root)
	var stone := _mat(Color(0.75, 0.74, 0.7))
	var base := MeshInstance3D.new()
	var bc := CylinderMesh.new()
	bc.top_radius = 2.2
	bc.bottom_radius = 2.5
	bc.height = 0.7
	base.mesh = bc
	base.position.y = 0.35
	base.material_override = stone
	root.add_child(base)
	var water := MeshInstance3D.new()
	var wc := CylinderMesh.new()
	wc.top_radius = 1.9
	wc.bottom_radius = 1.9
	wc.height = 0.15
	water.mesh = wc
	water.position.y = 0.72
	water.name = "Water"
	var wm := StandardMaterial3D.new()
	wm.albedo_color = Color(0.4, 0.7, 0.95, 0.85)
	wm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	wm.roughness = 0.15
	wm.metallic = 0.3
	water.material_override = wm
	root.add_child(water)
	var fcol := StaticBody3D.new()
	fcol.name = "FountainBody"
	var fcs := CollisionShape3D.new()
	var fcyl := CylinderShape3D.new()
	fcyl.radius = 2.2
	fcyl.height = 1.0
	fcs.shape = fcyl
	fcs.position.y = 0.5
	fcol.add_child(fcs)
	root.add_child(fcol)
	var pillar := MeshInstance3D.new()
	var pc := CylinderMesh.new()
	pc.top_radius = 0.3
	pc.bottom_radius = 0.4
	pc.height = 1.8
	pillar.mesh = pc
	pillar.position.y = 1.2
	pillar.material_override = stone
	root.add_child(pillar)
	var top := MeshInstance3D.new()
	var tc := CylinderMesh.new()
	tc.top_radius = 0.9
	tc.bottom_radius = 0.5
	tc.height = 0.3
	top.mesh = tc
	top.position.y = 2.1
	top.material_override = stone
	root.add_child(top)
	var glow := MeshInstance3D.new()
	var gs := SphereMesh.new()
	gs.radius = 0.35
	gs.height = 0.7
	glow.mesh = gs
	glow.position.y = 2.5
	glow.name = "BlessingLight"
	glow.material_override = _mat(Color(0.6, 0.85, 1.0), 0.4, Color(0.6, 0.85, 1.0))
	glow.visible = Game.blessings["water"]
	root.add_child(glow)
	Game.blessing_earned.connect(func(id: String) -> void:
		if id == "water":
			glow.visible = true)

func _build_stall(at: Vector3) -> void:
	var root := Node3D.new()
	root.name = "Stall"
	root.position = Vector3(at.x, ground_height(at.x, at.z), at.z)
	root.rotation.y = 0.5
	add_child(root)
	var wood := _mat(Color(0.55, 0.38, 0.25))
	var cloth := _mat(Color(0.85, 0.45, 0.4))
	for px in [-1.2, 1.2]:
		for pz in [-0.9, 0.9]:
			var post := MeshInstance3D.new()
			var pm := BoxMesh.new()
			pm.size = Vector3(0.15, 2.4, 0.15)
			post.mesh = pm
			post.position = Vector3(px, 1.2, pz)
			post.material_override = wood
			root.add_child(post)
	var counter := MeshInstance3D.new()
	var cm := BoxMesh.new()
	cm.size = Vector3(2.8, 0.9, 1.4)
	counter.mesh = cm
	counter.position = Vector3(0, 0.45, 0)
	counter.material_override = wood
	root.add_child(counter)
	var roof := MeshInstance3D.new()
	var rm := BoxMesh.new()
	rm.size = Vector3(3.4, 0.12, 2.6)
	roof.mesh = rm
	roof.position = Vector3(0, 2.5, 0)
	roof.rotation.z = 0.06
	roof.material_override = cloth
	root.add_child(roof)
	var scol := StaticBody3D.new()
	scol.name = "StallBody"
	var scs := CollisionShape3D.new()
	var sbox := BoxShape3D.new()
	sbox.size = Vector3(2.8, 2.6, 1.6)
	scs.shape = sbox
	scs.position = Vector3(0, 1.3, 0)
	scol.add_child(scs)
	root.add_child(scol)
	# Goods: glowing jars.
	for i in 3:
		var jar := MeshInstance3D.new()
		var jm := SphereMesh.new()
		jm.radius = 0.18
		jm.height = 0.4
		jar.mesh = jm
		jar.position = Vector3(-0.8 + i * 0.8, 1.1, 0)
		jar.material_override = _mat(Color(1.0, 0.85, 0.5), 0.3, Color(1.0, 0.8, 0.4))
		root.add_child(jar)

func _build_lanterns() -> void:
	var spots := [Vector3(4, 0, -6), Vector3(-6, 0, -2), Vector3(14, 0, -4), Vector3(-4, 0, 14), Vector3(6, 0, 14)]
	for s in spots:
		var pole := MeshInstance3D.new()
		var pm := CylinderMesh.new()
		pm.top_radius = 0.06
		pm.bottom_radius = 0.08
		pm.height = 2.6
		pole.mesh = pm
		pole.position = Vector3(s.x, ground_height(s.x, s.z) + 1.3, s.z)
		pole.material_override = _mat(Color(0.4, 0.3, 0.22))
		add_child(pole)
		var lamp := MeshInstance3D.new()
		var lm := SphereMesh.new()
		lm.radius = 0.25
		lm.height = 0.5
		lamp.mesh = lm
		lamp.position = Vector3(s.x, ground_height(s.x, s.z) + 2.7, s.z)
		lamp.material_override = _mat(Color(1.0, 0.9, 0.6), 0.4, Color(1.0, 0.85, 0.5))
		add_child(lamp)
		var light := OmniLight3D.new()
		light.position = lamp.position
		light.light_color = Color(1.0, 0.85, 0.6)
		light.light_energy = 0.6
		light.omni_range = 6.0
		add_child(light)

func _build_path() -> void:
	# Sandy discs from spawn to fountain, stall, tree.
	var pts: Array[Vector3] = []
	var routes := [
		[Vector3(0, 0, 18), Vector3(10, 0, 6)],
		[Vector3(0, 0, 18), Vector3(-12, 0, 10)],
		[Vector3(0, 0, 18), Vector3(0, 0, -14)],
	]
	for r in routes:
		var a: Vector3 = r[0]
		var b: Vector3 = r[1]
		for i in 9:
			pts.append(a.lerp(b, float(i) / 8.0))
	var dm := CylinderMesh.new()
	dm.top_radius = 0.9
	dm.bottom_radius = 0.9
	dm.height = 0.06
	var sand := _mat(Color(0.70, 0.59, 0.43))
	for p in pts:
		var d := MeshInstance3D.new()
		d.mesh = dm
		d.position = Vector3(p.x, ground_height(p.x, p.z) + 0.05, p.z)
		d.material_override = sand
		add_child(d)
