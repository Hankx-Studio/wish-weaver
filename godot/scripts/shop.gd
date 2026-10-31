# ShopUI: Mabel's market stall — buy items with Moonleaf coins.
class_name ShopUI
extends CanvasLayer

signal closed

const CATALOG: Array = [
	{"id": "star_gel", "name": "Star Gel", "price": 30},
	{"id": "moon_petal", "name": "Moon Petal", "price": 45},
	{"id": "lantern_wick", "name": "Lantern Wick", "price": 60},
	{"id": "fairy_dust", "name": "Fairy Dust", "price": 80},
	{"id": "blessing_candle", "name": "Blessing Candle", "price": 100},
]

var is_open := false
var first_buy: Button
var panel: PanelContainer
var gold_label: Label
var bag_label: Label
var count_labels: Dictionary = {}

static func make() -> ShopUI:
	var s := ShopUI.new()
	s.name = "Shop"
	s.layer = 16
	var p := PanelContainer.new()
	p.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	p.position = Vector2(-350, -460)
	p.custom_minimum_size = Vector2(700, 420)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.08, 0.1, 0.18, 0.92)
	sb.corner_radius_top_left = 14
	sb.corner_radius_top_right = 14
	sb.corner_radius_bottom_left = 14
	sb.corner_radius_bottom_right = 14
	sb.content_margin_left = 24
	sb.content_margin_right = 24
	sb.content_margin_top = 16
	sb.content_margin_bottom = 16
	p.add_theme_stylebox_override("panel", sb)
	s.add_child(p)
	s.panel = p
	var vb := VBoxContainer.new()
	vb.add_theme_constant_override("separation", 8)
	p.add_child(vb)
	var title := Label.new()
	title.text = "Mabel's Stall"
	title.add_theme_font_size_override("font_size", 20)
	vb.add_child(title)
	var gold := Label.new()
	gold.add_theme_font_size_override("font_size", 16)
	gold.add_theme_color_override("font_color", Color(1.0, 0.85, 0.4))
	vb.add_child(gold)
	s.gold_label = gold
	for item in CATALOG:
		var item_id: String = str(item["id"])
		var item_name: String = str(item["name"])
		var item_price: int = int(item["price"])
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		vb.add_child(row)
		var name_l := Label.new()
		name_l.text = item_name
		name_l.add_theme_font_size_override("font_size", 16)
		name_l.custom_minimum_size = Vector2(220, 0)
		name_l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(name_l)
		var price_l := Label.new()
		price_l.text = "%d coins" % item_price
		price_l.add_theme_font_size_override("font_size", 16)
		price_l.custom_minimum_size = Vector2(110, 0)
		row.add_child(price_l)
		var count_l := Label.new()
		count_l.text = "Owned: 0"
		count_l.add_theme_font_size_override("font_size", 15)
		count_l.add_theme_color_override("font_color", Color(1, 1, 1, 0.75))
		count_l.custom_minimum_size = Vector2(110, 0)
		row.add_child(count_l)
		s.count_labels[item_id] = count_l
		var buy := Button.new()
		buy.text = "Buy"
		buy.add_theme_font_size_override("font_size", 15)
		buy.custom_minimum_size = Vector2(80, 36)
		buy.pressed.connect(s._on_buy.bind(item_id, item_name, item_price))
		row.add_child(buy)
		if s.first_buy == null:
			s.first_buy = buy
	var bag := Label.new()
	bag.add_theme_font_size_override("font_size", 15)
	bag.add_theme_color_override("font_color", Color(1, 1, 1, 0.85))
	bag.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	bag.custom_minimum_size = Vector2(640, 0)
	vb.add_child(bag)
	s.bag_label = bag
	var close_btn := Button.new()
	close_btn.text = "Close"
	close_btn.add_theme_font_size_override("font_size", 16)
	close_btn.custom_minimum_size = Vector2(120, 40)
	close_btn.pressed.connect(s.close)
	vb.add_child(close_btn)
	p.visible = false
	s.is_open = false
	s._refresh()
	return s

func open() -> void:
	is_open = true
	panel.visible = true
	_refresh()
	if first_buy != null:
		first_buy.grab_focus()

func _unhandled_input(event: InputEvent) -> void:
	if is_open and event.is_action_pressed("ui_cancel"):
		close()
		get_viewport().set_input_as_handled()

func close() -> void:
	is_open = false
	panel.visible = false
	closed.emit()

func _refresh() -> void:
	if gold_label:
		gold_label.text = "Coins: %d" % Game.gold
	for item in CATALOG:
		var item_id: String = str(item["id"])
		var lbl: Label = count_labels.get(item_id, null)
		if lbl:
			lbl.text = "Owned: %d" % int(Game.inventory.get(item_id, 0))
	if bag_label:
		if Game.inventory.is_empty():
			bag_label.text = "Bag: (empty)"
		else:
			var parts: Array[String] = []
			for item in CATALOG:
				var item_id: String = str(item["id"])
				var n: int = int(Game.inventory.get(item_id, 0))
				if n > 0:
					parts.append("%s x%d" % [str(item["name"]), n])
			for key in Game.inventory.keys():
				var k := str(key)
				var known := false
				for item in CATALOG:
					if str(item["id"]) == k:
						known = true
						break
				if not known and int(Game.inventory.get(k, 0)) > 0:
					parts.append("%s x%d" % [k, int(Game.inventory.get(k, 0))])
			if parts.is_empty():
				bag_label.text = "Bag: (empty)"
			else:
				bag_label.text = "Bag: " + ", ".join(parts)

func _on_buy(item_id: String, item_name: String, price: int) -> void:
	if Game.spend_gold(price):
		Game.add_item(item_id)
		_refresh()
		if Main.I != null:
			Main.ui().flash("Bought %s" % item_name)
	else:
		_refresh()
		if Main.I != null:
			Main.ui().flash("Not enough coins")
