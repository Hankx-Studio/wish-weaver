extends Node
## Quest brain for beats 1-5 of docs/story/main-arc.md. Autoload-free:
## the leader instances this node (or adds the script) and wires NPC
## interacted signals / fountain / tree-door interactables to its methods.
## Emits blessing_added(i); play_ending() fires the ending timeline hooks.
class_name StoryDirector

signal blessing_added(index: int)
signal state_changed(new_state: int)
signal ending_started
signal ending_finished

enum State { WAKE, ROWAN, MABEL, ILSA, RELIGHT, ENDING }

const APPLES_NEEDED := 3

const INTRO_CARDS: Array[String] = [
	"The Tree of Light is going dark.",
	"The meadow's spirit chose you — a traveler with nowhere else to be — and woke you at dawn.",
	"Guide your wisp. Gather three blessings. Relight the tree.",
]

var state: int = State.WAKE
var apples := 0

var _blessings: Array[bool] = [false, false, false]
var _rowan_met := false
var _mabel_met := false
var _mabel_quest_done := false
var _ilsa_met := false
var _ending_played := false


func _ready() -> void:
	add_to_group("story_director")


## Beat 1: letterboxed intro over the live scene, then a wisp hint.
func start_story() -> void:
	_set_state(State.WAKE)
	var cards := get_tree().get_first_node_in_group("intro_cards")
	if cards != null and cards.has_method("play_cards"):
		if cards.has_signal("intro_finished") and not (cards as Object).is_connected("intro_finished", _on_intro_done):
			(cards as Object).connect("intro_finished", _on_intro_done)
		cards.call("play_cards", INTRO_CARDS.duplicate())
	else:
		push_warning("StoryDirector: no intro_cards found, skipping intro.")
		_on_intro_done()


## Beat 2: Rowan gives the quest (called by Rowan's interacted wiring).
func talk_to_rowan() -> void:
	if _rowan_met:
		_say("Rowan", ["The fountain waits, traveler. Touch its waters. (Press E)"])
		return
	_rowan_met = true
	_set_state(State.ROWAN)
	_say("Rowan", [
		"Traveler! The Tree of Light is going dark, and the meadow chose you.",
		"Gather three blessings and the tree will burn bright again.",
		"Begin at our fountain — touch its waters and take my blessing. (Press E)",
	])


## Beat 2: fountain grants blessing #1 (called by fountain interactable).
func collect_fountain_blessing() -> void:
	if _blessings[0]:
		_say("Fountain", ["(The water hums softly. You already carry its blessing.)"])
		return
	_grant_blessing(0)
	_say("Fountain", [
		"(The water shimmers gold.)",
		"(First blessing received.)",
	])


## Beat 3: Mabel's fetch quest (called by Mabel's interacted wiring).
func talk_to_mabel() -> void:
	if not _mabel_met:
		_mabel_met = true
		_set_state(State.MABEL)
		_say("Mabel", [
			"Welcome to my hearth-shop, dearie!",
			"My hearth blessing is yours — but first, a small favor.",
			"Pick 3 sun-apples from the glowing trees nearby. (Press E)",
		])
		return
	if apples >= APPLES_NEEDED and not _mabel_quest_done:
		_mabel_quest_done = true
		_grant_blessing(1)
		_say("Mabel", [
			"Three sun-apples! Oh, you are a treasure.",
			"Take my hearth blessing, warm as bread.",
		])
		return
	if not _mabel_quest_done:
		_say("Mabel", [
			"You carry %d of %d sun-apples. The glowing trees, dearie!" % [apples, APPLES_NEEDED],
		])
		return
	_say("Mabel", ["The tree door waits, dearie. Sage Ilsa keeps the old steps."])


## Called by SunApplePickup.collect() via the story_director group.
func on_apple_collected(_pickup: Node) -> void:
	apples += 1
	if apples < APPLES_NEEDED:
		_say("Meadow", ["(A warm sun-apple. %d of %d.)" % [apples, APPLES_NEEDED]])
	elif _mabel_met and not _mabel_quest_done:
		_say("Meadow", ["(Three sun-apples. Return to Mabel.)"])
	elif not _mabel_met:
		_say("Meadow", ["(Three sun-apples. Perhaps someone in the meadow wants these.)"])


## Beat 4: Ilsa, locked until blessings #1 + #2 (called by Ilsa's wiring).
func talk_to_ilsa() -> void:
	if not (_blessings[0] and _blessings[1]):
		var have := 0
		if _blessings[0]:
			have += 1
		if _blessings[1]:
			have += 1
		_say("Sage Ilsa", [
			"The root sleeps until the other lights wake.",
			"(Fountain and hearth blessings first. %d of 2.)" % have,
		])
		return
	if _ilsa_met:
		_say("Sage Ilsa", ["Press your light to the tree door, little traveler. (Press E)"])
		return
	_ilsa_met = true
	_set_state(State.ILSA)
	_grant_blessing(2)
	_say("Sage Ilsa", [
		"The fountain's tear and the hearth's ember — you carry both.",
		"Then the root accepts you, little traveler. Take my blessing.",
		"Now go — press your light to the tree door. (Press E)",
	])
	_set_state(State.RELIGHT)


## Beat 5: tree door (called by tree-door interactable). Sealed until 3/3.
func try_tree_door() -> void:
	if _ending_played:
		return
	if _blessings[0] and _blessings[1] and _blessings[2]:
		play_ending()
		return
	_say("Tree Door", [
		"(Sealed. The old wood is cold.)",
		"(Blessings: %d of 3.)" % blessing_count(),
	])


## Beat 5: ending timeline hook. Safe with no scenery wired (has_method guards).
func play_ending() -> void:
	if _ending_played:
		return
	_ending_played = true
	_set_state(State.ENDING)
	ending_started.emit()
	_call_group("tree_of_life", "relight")
	_call_group("lanterns", "ignite_sequenced")
	_call_group("fireflies", "swarm_burst")
	_call_group("audio", "swell")
	_call_group("music", "swell")
	await get_tree().create_timer(2.5).timeout
	var cards := get_tree().get_first_node_in_group("intro_cards")
	if cards != null and cards.has_method("show_end_card"):
		cards.call("show_end_card")
	else:
		push_warning("StoryDirector: no intro_cards found for end card.")
	ending_finished.emit()


func has_blessing(i: int) -> bool:
	if i < 0 or i >= _blessings.size():
		return false
	return _blessings[i]


func blessing_count() -> int:
	var n := 0
	for b in _blessings:
		if b:
			n += 1
	return n


func get_state_name() -> String:
	return State.keys()[state] as String


func _on_intro_done() -> void:
	_say("Wisp", [
		"(The little wisp bobs toward the plaza, glowing.)",
		"(Follow it.)",
	])


func _grant_blessing(i: int) -> void:
	if i < 0 or i >= _blessings.size() or _blessings[i]:
		return
	_blessings[i] = true
	for n in get_tree().get_nodes_in_group("blessing_hud"):
		if n != null and is_instance_valid(n) and n.has_method("fill"):
			n.call("fill", i)
	blessing_added.emit(i)


func _set_state(s: int) -> void:
	state = s
	state_changed.emit(s)


func _say(speaker_name: String, lines: Array) -> void:
	var box := get_tree().get_first_node_in_group("dialogue_box")
	if box != null and box.has_method("show_dialogue"):
		box.call("show_dialogue", speaker_name, lines)
	else:
		push_warning("StoryDirector: no dialogue_box for <%s>." % speaker_name)


func _call_group(group: String, method: String) -> void:
	for n in get_tree().get_nodes_in_group(group):
		if n != null and is_instance_valid(n) and n.has_method(method):
			n.call(method)
