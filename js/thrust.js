var RAD_DEG = Math.PI / 180;

function deg2rad(degrees) {
    return degrees * RAD_DEG;
}

function _vec2(x,y) {
    this.x = x;
    this.y = y;
}

_vec2.prototype.zero = function() {
    this.x = 0;
    this.y = 0;
    return this;
};

function Vec2(x, y) {
    return new _vec2(x, y);
}


var Mobile = Badger.Base.breed({
    defaults: {
        debug:  true,
        x:      0,
        y:      0,
        dx:     0,
        dy:     0,
        mass:   1
    },
    init: function(config) {
        this.init_mobile(config);
    },
    init_mobile: function(config) {
        var self = this;
        self.debug("mobile: ", config);
        self.position = Vec2(config.x, config.y);
        self.lastpos  = Vec2(config.x - config.dx, config.y - config.dy);
        self.mass     = config.mass;
        self.invmass  = 1 / config.mass;
        self.debug("position:", self.position.x, ",", self.position.y);
    }
});

var Steerable = Mobile.breed({
    defaults: {
        debug:      false,
        angle:      0,
        rotation:   0,
        throttle:   0,
        power:      1000,
        mass:       1   //??
    },
    init: function(config) {
        this.init_mobile(config);
        this.init_steerable(config);
    },
    init_steerable: function(config) {
        var self = this;
        self.angle        = config.angle;
        self.rotation     = config.rotation;
        self.throttle     = config.throttle;
        self.power        = config.power;
        self.acceleration = Vec2(0,0);
        self.velocity     = Vec2(0,0);
        self.forces       = Vec2(0,0);
        self.gravity      = Vec2(0,-9.8);
        self.debug("init steerable x:%s, y:%s", self.position.x, self.position.y);

    },
    update: function(dt, cb) {
        var self  = this,
            a     = this.acceleration,
            v     = this.velocity,
            p     = this.position,
            f     = this.forces,
            m     = this.mass,
            g     = this.gravity,
            dt2   = dt * dt;

        // positive or negative rotation changes the angle
        this.angle += this.rotation * dt;
        while (this.angle < 0) this.angle += 360;
        this.angle = this.angle % 360;

        // thrust is engine power limited by throttle
        this.thrust = this.power * this.throttle;

        var theta = deg2rad(this.angle);

        // forces are applied by thrust in the current direction
        f.x += this.thrust * Math.sin(theta);
        f.y += this.thrust * Math.cos(theta);

        // acceleration for this frame is force divided by mass
        a.x += f.x / m;
        a.y += f.y / m;

        self.debug(
            "power:%s  thrust:%s  throttle:%s  theta:%s  f.x:%s  f.y:%s  accel.x:%s  accel.y:%s",
            this.power, this.thrust, this.throttle, theta, f.x, f.y, a.x, a.y
        );

        // gravity also affects the acceleration
        a.x += g.x;
        a.y += g.y;

        // position changes by velocity * dt + acceleration * dt^2
        p.x += v.x * dt + a.x * dt2;
        p.y += v.y * dt + a.y * dt2;

        // velocity changes by acceleration
        v.x += a.x * dt;
        v.y += a.y * dt;

        // callback function
        if (cb) {
            cb();
        }

        // reset the acceleration and forces for the next frame
        a.zero();
        f.zero();

        return self;
    }
});


//----------------------------------------------------------------------------
// The master Thrust class
//----------------------------------------------------------------------------

var Thrust  = Badger.Base.breed({
    defaults: {
        debug:      false,
        width:      800,
        height:     600,
        trace:      0,
        console:    '#console',
        ship_path: "M1.5,0L3-2L3-6L7-10L7-8L9-6L11-6L13-8L13-16L11-20L9-20L7-16L7-14L3-10L-3-10L-7-14L-7-16L-9-20L-11-20L-13-16L-13-8L-11-6L-9-6L-7-8L-7-10L-3-6L-3-1.5L-1.5,0L-1.5,8L-4,10L-4,17L-1,20L1,20L4,17L4,10L1.5,8L1.5,0",
        ship_mass:  5,
        turn_on:    20,
        turn_off:   20,
        turn_max:   180,
        thrust_on:  0.1,
        thrust_off: 0.05,
        ship_style: {
            fill:           "#ccc",
            stroke:         '#444',
            'stroke-width': 3
        },
        orb_style: {
            fill:           "#ccf",
            stroke:         '#448',
            'stroke-width': 2
        },
        keys: {
            27: 'escape',
            32: 'space',
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down'
        }
    },
    init: function(config) {
        var self    = this,
            paper   = self.paper  = config.paper,
            width   = self.width  = config.width,
            height  = self.height = config.height,
            midx    = width / 2,
            midy    = height / 2;

        self.debug("config: ", config);
        self.init_elements(config);
        self.init_key_handler(config);

        self.ship   = Steerable({
            x:          midx,
            y:          midy,
            mass:       config.ship_mass,
            rotation:   90
        });

        self.sprite   = self.draw_ship();
    },
    init_elements: function(config) {
        var self  = this,
            elems = self.elements = { },
            cons  = elems.console = Badger.jquery(config.console);

        cons.find('[data-view]').each(
            function() {
                var that = $(this),
                    view = that.data('view');
                self.debug("found view for ", view);
                elems[view] = that;
            }
        );
    },
    init_key_handler: function(config) {
        var self   = this,
            keys   = config.keys,
            press  = self.pressing = { },
            parent = Badger.jquery(document),
            cons   = self.elements.console;

        parent.keydown(
            function(e) {
                var key = keys[e.keyCode];
                if (key) {
                    press[key] = true;
                    return Badger.cancel(e);
                }
            }
        );
        parent.keyup(
            function(e) {
                var key = keys[e.keyCode];
                if (key) {
                    press[key] = false;
                    return Badger.cancel(e);
                }
            }
        );
        cons.on(
            'click', '[data-more=mass]',
            function(e) {
                self.ship.mass += 1;
            }
        );
        cons.on(
            'click', '[data-less=mass]',
            function(e) {
                if (self.ship.mass > 1)
                    self.ship.mass -= 1;
            }
        );
        cons.on(
            'click', '[data-more=power]',
            function(e) {
                self.ship.power += 100;
            }
        );
        cons.on(
            'click', '[data-less=power]',
            function(e) {
                if (self.ship.power > 100)
                    self.ship.power -= 100;
            }
        );
    },
    control_ship: function () {
        var self   = this,
            ship   = self.ship,
            press  = self.pressing,
            config = self.config,
            ton    = config.turn_on,
            toff   = config.turn_off,
            tmax   = config.turn_max,
            thron  = config.thrust_on,
            throff = config.thrust_off;

        if (press.right) {
            if (ship.rotation < tmax) {
                ship.rotation += ton;
                if (ship.rotation > tmax) {
                    ship.rotation = tmax;
                }
            }
        }
        else if (press.left) {
            if (ship.rotation > -tmax) {
                ship.rotation -= ton;
                if (ship.rotation < -tmax) {
                    ship.rotation = -tmax;
                }
            }
        }
        else if (ship.rotation > 0) {
            ship.rotation -= toff;
            if (ship.rotation < 0) {
                ship.rotation = 0;
            }
        }
        else if (ship.rotation < 0) {
            ship.rotation += toff;
            if (ship.rotation > 0) {
                ship.rotation = 0;
            }
        }

        if (press.up) {
            ship.throttle += thron;
            if (ship.throttle > 1) {
                ship.throttle = 1;
            }
        }
        else if (press.down) {
            ship.throttle -= throff;
            if (ship.throttle < -1) {
                ship.throttle = -1;
            }
        }
        else if (ship.throttle > 0) {
            ship.throttle -= throff;
            if (ship.throttle < 0) {
                ship.throttle = 0;
            }
        }
        else if (ship.throttle < 0) {
            ship.throttle += throff;
            if (ship.throttle > 0) {
                ship.throttle = 0;
            }
        }
    },
    draw_ship: function() {
        var config = this.config,
            paper  = this.paper,
            ship   = this.ship,
            pos    = ship.position,
            sprite = paper.path(config.ship_path);

        sprite.attr(config.ship_style);

        // quick hack
        sprite.transform("s2.5T" + pos.x + "," + (self.height - pos.y));
        return sprite;
    },
    draw_orb: function() {
        var config = this.config,
            paper  = this.paper;
    },
    display_stats: function() {
        var self  = this,
            elems = self.elements,
            ship  = self.ship,
            press = self.pressing,
            fix   = 2;

        self.debug("pressing: ", press);
        elems.power.html(ship.power.toFixed(fix));
        elems.throttle.html(ship.throttle.toFixed(fix));
        elems.thrust.html(ship.thrust.toFixed(fix));

        elems.angle.html(ship.angle.toFixed(fix));
        elems.rotation.html(ship.rotation.toFixed(fix));
        elems.mass.html(ship.mass.toFixed(fix));
        elems.forcex.html(ship.forces.x.toFixed(fix));
        elems.forcey.html(ship.forces.y.toFixed(fix));
        elems.accelx.html(ship.acceleration.x.toFixed(fix));
        elems.accely.html(ship.acceleration.y.toFixed(fix));
        elems.velx.html(ship.velocity.x.toFixed(fix));
        elems.vely.html(ship.velocity.y.toFixed(fix));
        elems.posx.html(ship.position.x.toFixed(fix));
        elems.posy.html(ship.position.y.toFixed(fix));

        elems.up.html(press.up       ? 'UP'    : '&uarr;');
        elems.down.html(press.down   ? 'DOWN'  : '&darr;');
        elems.left.html(press.left   ? 'LEFT'  : '&larr;');
        elems.right.html(press.right ? 'RIGHT' : '&rarr;');
    },
    run: function() {
        var self    = this,
            secs    = 5,
            frames  = secs * 60,
            ship    = self.ship,
            sprite  = self.sprite,
            pos     = ship.position,
            width   = self.width,
            height  = self.height,
            press   = self.pressing,
            time;

        self.debug("running...  position x:%s, y:%s", pos.x, pos.y);
        ship.throttle = 0.5;
        draw();

        function stats() {
            self.display_stats();
        }

        function draw() {
            var now = new Date().getTime(),
                ms  = now - (time || now),
                dt  = ms / 1000,
                dir = 180 + ship.angle;

            if (! press.escape)
                requestAnimationFrame(draw);
    
            time = now;

            self.debug(
                "dt:%s x:%s y:%s angle:%s  rotation:%s  throttle:%s",
                dt, pos.x, pos.y, ship.angle, ship.rotation, ship.throttle
            );

            self.control_ship();
            ship.update(dt, stats);
            pos.x = pos.x % width;
            pos.y = pos.y % height;
            while (pos.x < 0) pos.x += width;
            while (pos.y < 0) pos.y += height;
            sprite.transform("r" + dir.toString() + ",0,-12s2.5T" + pos.x + "," + (height - pos.y));
        }
    }
});


//----------------------------------------------------------------------------
// The main Thrust() method added to Raphael
//----------------------------------------------------------------------------

Raphael.fn.Thrust = function (options) {
    options.paper = this;
//    Thrust(options);
    Thrust(options).run();
};

