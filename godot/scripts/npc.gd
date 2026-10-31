# NPC: procedural stylized villager + dialogue lines + optional quest hook.
class_name NPC
extends Interactable

@export var display_name: String = "Villager"
@export var robe: Color = Color(0.6, 0.5, 0.7)
@export var skin: Color = Color(0.95, 0.8, 0.68)
@export var lines: Array[String] = ["Hello, traveler."]
@export var hook: String = ""  # rowan | mabel | ilsa | ""

static func make(nm: String, robe_c: Color, at: Vector3, dlg: Array[String], hk: String = "") -> NPC:
	var n := NPC.new()
	n.display_name = nm
	n.robe = robe_c
	n.prompt = "Talk to " + nm
	n.lines.assign(dlg)
	n.hook = hk
	n.position = at
	var cs := CollisionShape3D.new()
	var sp := SphereShape3D.new()
	sp.radius = 2.2
	cs.shape = sp
	cs.position.y = 1.0
	n.add_child(cs)
	n._build_body()
	return n

func _mat(c: Color, e: Color = Color(0, 0, 0)) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.8
	if e.r + e.g + e.b > 0.0:
		m.emission_enabled = true
		m.emission = e
		m.emission_energy_multiplier = 1.4
	return m

func _build_body() -> void:
	var body := MeshInstance3D.new()
	var cm := CapsuleMesh.new()
	cm.radius = 0.35
	cm.height = 1.2
	body.mesh = cm
	body.position.y = 0.6
	body.material_override = _mat(robe)
	add_child(body)
	var head := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.26
	sm.height = 0.52
	head.mesh = sm
	head.position.y = 1.45
	head.material_override = _mat(skin)
	add_child(head)
	var hat := MeshInstance3D.new()
	# Flattened cone-ish top: tapered cylinder.
	var tm := CylinderMesh.new()
	tm.top_radius = 0.05
	tm.bottom_radius = 0.34
	tm.height = 0.4
	hat.mesh = tm
	hat.position.y = 1.85
	hat.material_override = _mat(robe.darkened(0.25))
	add_child(hat)
	var col := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.35
	cap.height = 1.2
	cs.shape = cap
	cs.position.y = 0.6
	col.add_child(cs)
	add_child(col)

func interact(_player: Node3D) -> void:
	Main.ui().say(lines)
	match hook:
		"rowan":
			Game.met_rowan = true
			Game.set_stage("roam")
		"mabel":
			Game.met_mabel = true
			Main.ui().queue_shop()
		"ilsa":
			Game.met_ilsa = true
			if Game.met_mabel:
				Game.earn("heart")
	Game.save_progress()
