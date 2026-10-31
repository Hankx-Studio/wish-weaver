# FountainInteract: E near fountain hints spell; casting any spell nearby earns Water.
class_name FountainInteract
extends Interactable

func _init() -> void:
	prompt = "Fountain of Murmurs"

static func make(at: Vector3) -> FountainInteract:
	var f := FountainInteract.new()
	f.position = at
	var cs := CollisionShape3D.new()
	var sp := SphereShape3D.new()
	sp.radius = 3.2
	cs.shape = sp
	cs.position.y = 1.0
	f.add_child(cs)
	return f

func interact(_player: Node3D) -> void:
	if Game.blessings["water"]:
		Main.ui().say(["The water hums, bright and awake."])
	else:
		Main.ui().say(["The fountain sleeps.", "Cast a spell beside it. (Press Q, type anything)"])
		Main.ui().open_spell()
