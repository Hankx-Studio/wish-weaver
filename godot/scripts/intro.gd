# IntroCards: 3 story cards on fade, click/E to advance, then roam.
class_name IntroCards
extends CanvasLayer

var panel: PanelContainer
var label: Label
var idx := 0
var guard := 0.0
const CARDS: Array[String] = [
	"Moonleaf Meadow sleeps under a pale sky.\nThree blessings keep the old Tree breathing.",
	"Tonight the lights went out — all but one small spirit.",
	"You are the traveler. The meadow is waiting.",
]

static func make() -> IntroCards:
	var c := IntroCards.new()
	c.name = "Intro"
	c.layer = 20
	var bg := ColorRect.new()
	bg.color = Color(0.04, 0.05, 0.1, 0.92)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.add_child(bg)
	var p := PanelContainer.new()
	p.set_anchors_preset(Control.PRESET_CENTER)
	p.custom_minimum_size = Vector2(700, 260)
	p.position = Vector2(-350, -150)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.1, 0.12, 0.2, 0.0)
	sb.content_margin_left = 24
	sb.content_margin_right = 24
	p.add_theme_stylebox_override("panel", sb)
	c.add_child(p)
	c.panel = p
	var l := Label.new()
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", 30)
	p.add_child(l)
	c.label = l
	return c

func _ready() -> void:
	_show()

func _fade_to(a: float, dur: float) -> Tween:
	var bg := get_child(0) as ColorRect
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(bg, "color:a", 0.92 * a, dur)
	tw.tween_property(panel, "modulate:a", a, dur)
	return tw

func _show() -> void:
	label.text = CARDS[idx]
	guard = 0.4
	_fade_to(1.0, 0.4)

func _process(dt: float) -> void:
	guard = max(0.0, guard - dt)
	if guard <= 0.0 and Input.is_action_just_pressed("interact"):
		idx += 1
		if idx >= CARDS.size():
			var tw := _fade_to(0.0, 0.4)
			tw.chain().tween_callback(queue_free)
			Main.on_intro_done()
		else:
			_show()
