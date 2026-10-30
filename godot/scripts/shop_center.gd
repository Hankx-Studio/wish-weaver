extends Node3D
## Timber shop idle animation: warm window flicker + hanging-lantern sway.
##
## Mirrors `updateShopCenter` from the three.js source: the window and lantern
## glow materials pulse gently while the two hanging lanterns and the shop
## sign sway. Safe on a partial tree (missing nodes are skipped).

const GLOW_PATHS = [
	"WindowGlow",
	"WindowSide",
	"Lanterns/Lantern0/Glass",
	"Lanterns/Lantern1/Glass",
]

var _time: float = 0.0
var _glow_mats: Array[StandardMaterial3D] = []
var _base_energy: Array[float] = []
var _lanterns: Array[Node3D] = []
var _lantern_phase: Array[float] = []
var _sign: Node3D = null


func _ready() -> void:
	for path in GLOW_PATHS:
		var mi := get_node_or_null(path) as MeshInstance3D
		if mi == null:
			continue
		var src := mi.get_active_material(0) as StandardMaterial3D
		if src == null:
			continue
		# Duplicate: the .tscn shares one glow material, and flicker must not
		# leak into other scenes if this one is instanced more than once.
		var dup := src.duplicate() as StandardMaterial3D
		mi.material_override = dup
		_glow_mats.append(dup)
		_base_energy.append(dup.emission_energy_multiplier)
	for i in 2:
		var lantern := get_node_or_null("Lanterns/Lantern%d" % i) as Node3D
		if lantern != null:
			_lanterns.append(lantern)
			_lantern_phase.append(float(i) * PI)
	_sign = get_node_or_null("Sign") as Node3D


func _process(delta: float) -> void:
	_time += delta
	var t := _time
	var flicker: float = clampf(0.9 + 0.07 * sin(t * 7.3) + 0.03 * sin(t * 13.7), 0.7, 1.0)
	for i in _glow_mats.size():
		_glow_mats[i].emission_energy_multiplier = _base_energy[i] * flicker
	for i in _lanterns.size():
		var phase: float = _lantern_phase[i]
		_lanterns[i].rotation.z = 0.06 * sin(t * 1.4 + phase)
		_lanterns[i].rotation.x = 0.04 * sin(t * 1.1 + phase * 0.5)
	if _sign != null:
		_sign.rotation.x = 0.03 * sin(t * 0.9)
