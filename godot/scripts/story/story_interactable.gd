extends Node3D
## Generic story interactable: routes E-interact to a StoryDirector method.
## action "fountain" -> collect_fountain_blessing(); "tree_door" -> try_tree_door().
class_name StoryInteractable

@export var action := "fountain"
@export var prompt := "Touch (E)"


func _ready() -> void:
	add_to_group("interactable")


func get_prompt() -> String:
	return prompt


func interact() -> void:
	var d := get_tree().get_first_node_in_group("story_director")
	if d == null:
		return
	match action:
		"fountain":
			if d.has_method("collect_fountain_blessing"):
				d.call("collect_fountain_blessing")
		"tree_door":
			if d.has_method("try_tree_door"):
				d.call("try_tree_door")
