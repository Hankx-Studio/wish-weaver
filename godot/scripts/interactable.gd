# Interactable: prompt + E-to-talk base. Register with InteractManager (Main).
class_name Interactable
extends Area3D

@export var prompt: String = "Talk"
@export var radius: float = 2.8

func interact(_player: Node3D) -> void:
	pass

func prompt_text() -> String:
	return "[E] " + prompt
