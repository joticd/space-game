
var dtr = (Math.PI/180);

var distance = function(
	a /* { x : 0, y : 0 } */, 
	b /* { x : 0, y : 0 } */) {

	var dx = a.x - b.x;
	var dy = a.y - b.y;
	dx *= dx;
	dy *= dy;
	return Math.sqrt(dx + dy);
};
var orbit = function (t, r, a){	
	var x = Math.cos(a*dtr)*r+t.x ;
	var y = Math.sin(a*dtr)*r+t.y;

	return {x:x, y:y };
}

var GameObject = Class.extend({
	init: function(player, clss, x, y) {
		this.player = player;
		this.parent = 0;
		this.angle = 0;
		this.actor = $("<div class='" + clss + "'></div>");
		this.actor.appendTo($("body"));		

		this.actor
			.css('left', x - this.actor.width() / 2)
			.css('top', y  - this.actor.height() / 2);
	},

	appearAt: function(pos) {
		this.actor
			.css('left', pos.x - this.actor.width() / 2)
			.css('top', pos.y  - this.actor.height() / 2);		
	},

	position: function() {
		return { 
			x : parseFloat(this.actor.css('left').replace('px', '')) + this.actor.width() / 2, 
			y : parseFloat(this.actor.css('top').replace('px', '')) + this.actor.height() / 2 
		};
	},

	moveTo: function(x, y) {
		var current = this.position();
		var target = { x : x, y : y };
		var d = distance(current, target);

		this.actor.animate({ left : x, top : y }, d * 2);
	}
});

var Planet = GameObject.extend({
	init: function(player, x, y) {
		this._super(player, "planet", x, y);
		this.children = [];
		this.radius = 200;
		var self = this;

		setInterval(function() {
			for(var i in self.children) {
				self.children[i].update();
			}
		}, 30);
	},

	spawnShip: function() {
		var p = this.position();
		var s = new Ship(this.player, p.x, p.y);
		s.parent = this;
		this.children.push(s);
	}
});

var Ship = GameObject.extend({
	init: function(player, x, y) {
		this._super(player, "ship " + (player == 1 ? "beetleship" : "rocketship"), x, y);
	},
	update: function(){
		if(this.parent !=0){
			this.angle+=1;
			this.appearAt(orbit(this.parent.position(),this.parent.radius,this.angle));
			
		}
	}
});

var Star = GameObject.extend({
	init: function(player, x, y) {
		this._super(player, "star", x, y);		
	}
});

$(function () {
	var a = new Planet(1, 400, 400);
	a.spawnShip();
});