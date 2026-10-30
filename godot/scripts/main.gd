extends Node3D
## Main-scene bootstrap: grounds NPCs, parks HeroF, wires NPC signals to
## the StoryDirector, offers T-key hero swap, and kicks off the intro.

const FLAVOR := {
	"Poppy": ["The flowers hum when the tree is happy.", "(Poppy hums back, off-key.)"],
	"Bram": [
		"Mind the seedlings, traveler. Big boots, little sprouts.",
		"Mabel's apples? Look for the glowing trees all over the meadow.",
	],
}

var _hero_m: CharacterBody3D = null
var _hero_f: CharacterBody3D = null
var _using_m := true


func _ready() -> void:
	print("Main scene ready")
	_hero_m = get_node_or_null("HeroM") as CharacterBody3D
	_hero_f = get_node_or_null("HeroF") as CharacterBody3D
	_snap_npcs_to_ground()
	_park_hero_f()
	_wire_npcs()
	var director := get_tree().get_first_node_in_group("story_director")
	if director != null and (director as Object).has_method("start_story"):
		(director as Object).call_deferred("start_story")
	else:
		push_warning("Main: no story_director found, story not started.")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_tree().quit()
		return
	if event is InputEventKey:
		var k := event as InputEventKey
		if k.pressed and not k.echo and k.physical_keycode == KEY_T:
			swap_hero()


## Swap the active hero (M <-> F). Safe when HeroF is missing.
func swap_hero() -> void:
	if _hero_m == null or _hero_f == null:
		return
	_using_m = not _using_m
	var active := _hero_m if _using_m else _hero_f
	var idle := _hero_f if _using_m else _hero_m
	var swap_pos := active.global_position
	active.global_position = idle.global_position + Vector3(0, 0.1, 0)
	idle.global_position = swap_pos
	for h in [_hero_m, _hero_f]:
		var is_on: bool = h == active
		h.set_physics_process(is_on)
		h.visible = is_on
		if is_on:
			if not h.is_in_group("player"):
				h.add_to_group("player")
			if not h.is_in_group("current-player"):
				h.add_to_group("current-player")
		else:
			h.remove_from_group("player")
			h.remove_from_group("current-player")
	var cam := get_node_or_null("FollowCamera")
	if cam != null:
		cam.set("target", active)
	var im := get_tree().get_first_node_in_group("interact_manager")
	if im != null:
		im.set("player", active)
	for s in get_tree().get_nodes_in_group("spirit"):
		if (s as Object).has_method("set_target"):
			s.call("set_target", active)


## Batch A NPCs join "npcs" via script; batch B scenes declare "npc".
func _npc_nodes() -> Array:
	var out: Array = []
	for n in get_tree().get_nodes_in_group("npc"):
		if not out.has(n):
			out.append(n)
	for n in get_tree().get_nodes_in_group("npcs"):
		if not out.has(n):
			out.append(n)
	return out


func _snap_npcs_to_ground() -> void:
	var space := get_world_3d().direct_space_state
	for npc in _npc_nodes():
		var n := npc as Node3D
		if n == null:
			continue
		var from: Vector3 = n.global_position + Vector3(0, 2.0, 0)
		var query := PhysicsRayQueryParameters3D.create(from, from + Vector3(0, -8, 0))
		if npc is CollisionObject3D:
			query.exclude = [(npc as CollisionObject3D).get_rid()]
		var hit := space.intersect_ray(query)
		if not hit.is_empty():
			n.global_position.y = (hit["position"] as Vector3).y


func _park_hero_f() -> void:
	if _hero_f == null:
		return
	_hero_f.remove_from_group("player")
	_hero_f.remove_from_group("current-player")
	_hero_f.set_physics_process(false)
	_hero_f.visible = false
	if _hero_m != null:
		_hero_f.global_position = _hero_m.global_position + Vector3(0, -60, 0)


func _wire_npcs() -> void:
	for npc in _npc_nodes():
		var o := npc as Object
		if o == null or not o.has_signal("interacted"):
			continue
		var npc_name := str(o.get("npc_name")) if o.get("npc_name") != null else ""
		if not o.is_connected("interacted", _on_npc_interacted):
			o.connect("interacted", _on_npc_interacted.bind(npc_name))


func _on_npc_interacted(_npc: Node, npc_name: String) -> void:
	var director := get_tree().get_first_node_in_group("story_director") as Object
	if director == null:
		return
	match npc_name:
		"Rowan":
			director.call("talk_to_rowan")
		"Mabel":
			director.call("talk_to_mabel")
		"Sage Ilsa":
			director.call("talk_to_ilsa")
		_:
			_say_flavor(npc_name)


func _say_flavor(npc_name: String) -> void:
	if not FLAVOR.has(npc_name):
		return
	var box := get_tree().get_first_node_in_group("dialogue_box") as Object
	if box != null and box.has_method("show_dialogue"):
		box.call("show_dialogue", npc_name, (FLAVOR[npc_name] as Array).duplicate())
