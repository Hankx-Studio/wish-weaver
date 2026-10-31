# Net: same-origin API client with honest source labeling. Autoloaded.
# Spell flow: POST {origin}/api/spell {text} -> {effect, source} | fallback local_rule.
extends Node

signal spell_resolved(data: Dictionary)

const LOCAL_KEYWORDS := {
	"bloom": {"effect": "bloom", "color": [1.0, 0.6, 0.8]},
	"flower": {"effect": "bloom", "color": [1.0, 0.6, 0.8]},
	"rain": {"effect": "rain", "color": [0.5, 0.8, 1.0]},
	"water": {"effect": "rain", "color": [0.5, 0.8, 1.0]},
	"light": {"effect": "light", "color": [1.0, 0.95, 0.6]},
	"sun": {"effect": "light", "color": [1.0, 0.95, 0.6]},
	"star": {"effect": "star", "color": [0.8, 0.9, 1.0]},
	"wind": {"effect": "wind", "color": [0.7, 1.0, 0.9]},
	"leaf": {"effect": "wind", "color": [0.7, 1.0, 0.9]},
	"fire": {"effect": "fire", "color": [1.0, 0.55, 0.3]},
}

var _http: HTTPRequest
var _pending_text: String = ""

func _ready() -> void:
	_http = HTTPRequest.new()
	_http.timeout = 8.0
	add_child(_http)
	_http.request_completed.connect(_on_spell_response)

func api_origin() -> String:
	if OS.has_feature("web"):
		var bridge = Engine.get_singleton("JavaScriptBridge")
		if bridge != null:
			var o = bridge.eval("window.location.origin", true)
			if o != null and str(o).begins_with("http"):
				return str(o)
	return ""

func cast_spell(text: String) -> void:
	_pending_text = text.strip_edges()
	var origin := api_origin()
	if origin == "":
		_resolve_local("no-origin")
		return
	var url := origin + "/api/spell"
	var body := JSON.stringify({"text": _pending_text})
	var err := _http.request(url, ["Content-Type: application/json"], HTTPClient.METHOD_POST, body)
	if err != OK:
		_resolve_local("http-error")

func _on_spell_response(result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if result != HTTPRequest.RESULT_SUCCESS or code != 200:
		_resolve_local("bad-status")
		return
	var parsed = JSON.parse_string(body.get_string_from_utf8())
	if typeof(parsed) != TYPE_DICTIONARY or not parsed.has("effect"):
		_resolve_local("bad-payload")
		return
	parsed["source"] = str(parsed.get("source", "meta_live"))
	parsed["text"] = _pending_text
	Game.last_spell_source = parsed["source"]
	Game.spells_cast += 1
	Game.save_progress()
	spell_resolved.emit(parsed)

func _resolve_local(reason: String) -> void:
	var t := _pending_text.to_lower()
	var out := {"effect": "sparkle", "color": [1.0, 1.0, 1.0]}
	for k in LOCAL_KEYWORDS:
		if k in t:
			out = LOCAL_KEYWORDS[k]
			break
	out["source"] = "local_rule"
	out["text"] = _pending_text
	out["fallback"] = reason
	Game.last_spell_source = "local_rule"
	Game.spells_cast += 1
	Game.save_progress()
	spell_resolved.emit(out)
