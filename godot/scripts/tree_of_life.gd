extends Node3D
## Tree of Life landmark (~14 units tall, base at y=0, door faces +Z).
##
## The leader instances this scene at (0, 0, -18). Idle animation (canopy
## sway, lantern flicker/sway, rune pulse, door-window glow) runs in
## _process and mirrors updateTreeOfLife in
## src/features/world/world/props/tree-of-life.ts.

@export var home_position := Vector3(0.0, 0.0, -18.0)
@export var animation_speed := 1.0

var _time := 0.0
var _canopy_layers: Array[Node3D] = []
var _lanterns: Array[Node3D] = []
var _lantern_mats: Array[StandardMaterial3D] = []
var _glyph_mats: Array[StandardMaterial3D] = []
var _window_mat: StandardMaterial3D


func _ready() -> void:
	if position.length() < 0.001:
		position = home_position
	for i in 3:
		var layer := get_node_or_null("Canopy/CanopyLayer%d" % i) as Node3D
		if layer != null:
			_canopy_layers.append(layer)
	for i in 8:
		var lantern := get_node_or_null("Lanterns/Lantern%d" % i) as Node3D
		if lantern == null:
			continue
		lantern.set_meta("phase", float(i) * 0.9)
		_lanterns.append(lantern)
		var body := lantern.get_node_or_null("Body") as MeshInstance3D
		_lantern_mats.append(_unique_emissive(body))
		var glyph := get_node_or_null("Runes/Rune%d/Glyph" % i) as MeshInstance3D
		_glyph_mats.append(_unique_emissive(glyph))
	_window_mat = _unique_emissive(get_node_or_null("Door/DoorWindow") as MeshInstance3D)


func _process(delta: float) -> void:
	_time += delta * animation_speed
	var t := _time
	for i in _canopy_layers.size():
		var layer := _canopy_layers[i]
		layer.rotation.z = sin(t * 0.6 + float(i) * 2.1) * 0.02
		layer.rotation.x = cos(t * 0.45 + float(i) * 1.3) * 0.016
		layer.rotation.y = sin(t * 0.23 + float(i) * 1.7) * 0.03
	for lantern in _lanterns:
		var phase := float(lantern.get_meta("phase")) if lantern.has_meta("phase") else 0.0
		lantern.rotation.x = sin(t * 0.9 + phase) * 0.06
		lantern.rotation.z = cos(t * 0.7 + phase) * 0.06
	for i in _lantern_mats.size():
		var mat := _lantern_mats[i]
		if mat == null:
			continue
		var phase := float(i) * 0.9
		mat.emission_energy_multiplier = (
			1.15 + sin(t * 7.0 + phase) * 0.22 + sin(t * 13.7 + phase * 1.7) * 0.08
		)
	for i in _glyph_mats.size():
		var glyph_mat := _glyph_mats[i]
		if glyph_mat == null:
			continue
		glyph_mat.emission_energy_multiplier = 0.95 + sin(t * 2.0 + float(i) * 0.8) * 0.35
	if _window_mat != null:
		_window_mat.emission_energy_multiplier = 1.15 + sin(t * 3.0) * 0.15


## Duplicates a mesh's shared emissive material into a per-node surface
## override so _process can animate nodes independently. Returns null when
## the node or its material is missing (partial tree stays safe).
func _unique_emissive(node: MeshInstance3D) -> StandardMaterial3D:
	if node == null:
		return null
	var src := node.get_active_material(0) as StandardMaterial3D
	if src == null:
		return null
	var dup := src.duplicate() as StandardMaterial3D
	node.set_surface_override_material(0, dup)
	return dup
