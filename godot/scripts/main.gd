extends Node3D


func _ready() -> void:
	print("Main scene ready")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_tree().quit()
