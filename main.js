
var turn = 1;
var ships = {};

ships[1] = [];
ships[2] = [];

var currentPlayer = 1;
var order = [];
var universe = [];
var index = 0;
var selection = null;

var dtr = (Math.PI/180);

var vSum = function (a,b) {
	return { x: a.x+b.x, y: a.y+b.y };
}

var vSub = function (a,b) {
	return { x: a.x-b.x, y: a.y-b.y };
}

var vTimes = function (a,t) {
	return { x: a.x*t, y: a.y*t };
}

var vLerp = function (a, b, t) {
	return vSum(a, vTimes(vSub(b,a),t));
}

var vLen = function(
	a /* { x : 0, y : 0 } */, 
	b /* { x : 0, y : 0 } */) {

	var dx = a.x - b.x;
	var dy = a.y - b.y;
	dx *= dx;
	dy *= dy;
	return Math.sqrt(dx + dy);
};

var vNorm = function(a) {
	var d = vLen({ x: 0, y: 0 }, a);
	return {x: a.x/d, y: a.y/d};
}

var orbit = function (t, r, a){	
	var x = Math.cos(a*dtr)*r+t.x ;
	var y = Math.sin(a*dtr)*r+t.y;

	return {x:x, y: y };
}

var globalId = 0;

var GameObject = Class.extend({
	power: 0,
	init: function(player, clss, x, y) {
		this.id = ++globalId;
		this.type = clss;
		this.player = player;
		this.parent = null;
		this.angle = 0;
		this.actor = $("<div class='" + clss + "'><div class='number'></div></div>");
		this.actor.appendTo($("#space"));	
		this.radius = 0;	
		this.power = 0;
		this.collision = {};

		this.actor
			.css('left', x - this.actor.width() / 2)
			.css('top', y  - this.actor.height() / 2);
	},

	updateNumbers : function(n){
		$(this.actor).find(".number").text(n);
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
		var d = vLen(current, target);

		this.actor.animate({ left : x, top : y }, d * 2);
	},

	moveToMouse: function(p) {
		this.moveTo(p.x - this.actor.width() / 2, p.y - this.actor.height() / 2);
	},

	hit: function(o) {
		// dodaj nesto
	}
});

var Selection = GameObject.extend({
	init: function() {
		this._super(0, "selection", -1000, -1000);
	}, 
	target : null,
	start: function() {
		var self = this;
		setInterval(function() {
			self.update();
		}, 30);
	},
	update: function() {
		if(this.target != null) {
			var o = this.position();
			var p = this.target.position();
			var t = { x : p.x, y : p.y + this.actor.height() / 2 };
			this.appearAt(vLerp(o, t, 0.3));
		}
	}
});

var Planet = GameObject.extend({
	init: function(player, x, y) {
		this._super(player, "planet", x, y);
		this.children = [];
		this.power = 5;
		this.updateNumbers(this.power);

		this.radius = 57;

		order.push(this);	
		universe.push(this);

		var self = this;

		this.actor.click(function(e) {
			if(selection == self) {
				self.spawnShip();
				nextTurn();
			}

			e.preventDefault();
			return false;
		});

		setInterval(function() {
			for(var i in self.children) {
				self.children[i].update();
			}
		}, 30);

	},

	spawnShip: function() {
		var p = this.position();

		var pow = Math.floor(this.power / 2);
		this.power -= pow;

		var s = new Ship(this.player, p.x, p.y, pow);
		s.parent = this;

		this.updateNumbers(this.power);
		this.children.push(s);
		return s;
	},

	hit: function(o){
		if(this.player == o.player) {
			var c = Math.round(o.cargo);
			this.power += c;
			o.cargo = 0;			
		} else {
			var a = this.power;
			this.power -= o.power;
			o.power -= a;			
		}

		this.updateNumbers(this.power);
		o.updateNumbers("P:" + o.power + " C:" + o.cargo);
		return true;		
	}
});

var Ship = GameObject.extend({
	size: null,
	moved: false,
	died: false,
	init: function(player, x, y, pow) {
		this._super(player, "ship " + (player == 1 ? "beetleship" : "rocketship"), x, y);
		order.push(this);
		universe.push(this);
		this.size = { x : this.actor.width() / 2, y : this.actor.height() / 2};
		this.radius = 30;
		this.power = pow;
		this.cargo = 0;
		this.updateNumbers("P:" + this.power + " C:" + this.cargo);
	},
	update: function(){
		if(this.parent != null){
			this.angle+=1;
			this.appearAt(orbit(this.parent.position(),this.parent.radius,this.angle));			
		} else {
			if(this.died){
				return;
			}

			this.appearAt(vSum(this.position(), vTimes(this.velocity, 6)));
			this.velocity = vTimes(this.velocity, 0.995);

			if(this.moved && selection == this && vLen({ x : 0, y : 0 }, this.velocity) < 0.01) {
				nextTurn();
			}

			var p = this.position();
			if(p.x + this.size.x > $("#space").width()) {
				// odbij se od desne ivice
				this.velocity.x = -this.velocity.x;
			} else if(p.x - this.size.x < 0) {
				// odbij se od leve ivice
				this.velocity.x = -this.velocity.x;
			}

			if(p.y > $("#space").height()) {
				// odbij se od donje ivice
				this.velocity.y = -this.velocity.y;
			} else if(p.y - this.size.y < -15) {
				// odbij se od gornje ivice
				this.velocity.y = -this.velocity.y;
			}

			if(this.parent == null) {
				for(var i in universe) {
					var o = universe[i];
					if(o == this) continue;

					if(!this.collision[o.id] || this.collision[o.id] == 0) {
						if(vLen(this.position(), o.position()) < this.radius+o.radius) {
							
							(function(a, b) {
								a.collision[b.id] = 1;
								b.collision[a.id] = 1;
								setTimeout(function() {
									a.collision[b.id] = 0;
									b.collision[a.id] = 0;									
								}, 1000);
							})(this, o);

							if(o.hit(this)) {
								this.velocity.x = -this.velocity.x;
								this.velocity.y = -this.velocity.y;								
							}
						}
					}
				}
			}

			if(this.power <= 0) {				
				var x = universe.indexOf(this);
				if(x > -1) {
					universe.splice(x, 1);
				}

				x = order.indexOf(this);
				if(x > -1) {
					order.splice(x, 1);
				}

				this.died = true;
				this.actor.fadeOut(function() { $(this).detach(); });
			}
		}
	},

	velocity: { x: 0, y: 0 },

	attack: function(x, y) {
		if(this.moved) return;

		if(this.parent != null) {
			(function(ship, parent) {
				ship.collision[parent.id] = 1;
				setTimeout(function() {
					ship.collision[parent.id] = 0;
				}, 2000);
			})(this, this.parent);
		}

		this.moved = true;
		this.parent = null;
		var t = { x : x, y : y };
		this.velocity = vNorm(vSub(t, this.position()));
		setTimeout(function(){
			nextTurn();
		},3000);
	},

	hit: function(o) {
		if(this.player == o.player) {
			var c = Math.round(o.cargo / 2);
			this.cargo += c;
			o.cargo = o.cargo - c;
		} else {
			var a = this.power;
			this.power -= o.power;
			o.power -= a;

			if(this.power > 0 && o.power <= 0) {
				this.cargo += o.cargo;
				o.cargo = 0;
			}
		}

		if(o.velocity) {
			this.velocity = vSum(this.velocity, vTimes(o.velocity, 0.5));
		}
		
		this.updateNumbers("P:" + this.power + " C:" + this.cargo);
		o.updateNumbers("P:" + o.power + " C:" + o.cargo);

		return true;
	}
});

var Star = GameObject.extend({
	init: function(player, x, y) {
		this._super(player, "star", x, y);
		this.power = Math.ceil(Math.random() * 5) + 1;
		universe.push(this);
		this.radius = 25;
		
	},
	disappear: function() {
		var x = universe.indexOf(this);
		if(x > -1) {
			universe.splice(x, 1);
		}
		this.actor.fadeOut(function() { $(this).detach(); });
	},
	hit: function(o) {
		
		o.cargo += this.power;
		this.disappear();
		o.updateNumbers("P:" + o.power + " C:" + o.cargo);
		return false;
	}
});

var cycle = function() {
	do {
		index = (index + 1) % order.length;
	} while(order[index].player != currentPlayer);

	selection = order[index];
	circle.target = selection;
	if(selection.moved == true) selection.moved = false;
}

var nextTurn = function() {
	currentPlayer = (currentPlayer == 1) ? 2 : 1;
	cycle();
}

var firstTurn = function() {
	index = 0;
	selection = order[0];
	circle.target = selection;
}

var circle;

$(function() {
	circle = new Selection();
	var a = new Planet(1, 200, 250);
	var b = new Planet(2, 1100, 450);

	for(var i = 0; i < 20; i++) {
		new Star(0, Math.random() * $("#space").width(), Math.random() * $("#space").height());
	}
	firstTurn();

	circle.start();	
	
	$("body").keydown(function(e) {		
		if(e.which == 32) cycle();
	});

	$("#space").click(function(e){
		if (selection.type.match(/ship/) != null) {
			
			selection.attack(e.pageX, e.pageY);
		}
	})
});