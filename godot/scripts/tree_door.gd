# TreeDoor logic.
class_name TreeDoor
extends Interactable

func prompt_text() -> String:
	if Game.blessing_count() >= 3:
		return "[E] Enter the Tree"
	return "[E] Touch the door"

func interact(_player: Node3D) -> void:
	if Game.blessing_count() >= 3:
		Main.ui().show_ending()
	else:
		var left := 3 - Game.blessing_count()
		Main.ui().say(["(Sealed. The old wood is cold.)", "Blessings still sleeping: %d." % left])
