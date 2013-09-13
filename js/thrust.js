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
        self.position     = Vec2(config.x, config.y);
        self.lastpos      = Vec2(config.x - config.dx, config.y - config.dy);
        self.velocity     = Vec2(config.dx, config.dy);
        self.acceleration = Vec2(0, 0);
        self.mass         = config.mass;
        self.invmass      = 1 / config.mass;
    },
    move: function(dt) {
        var self  = this,
            a     = this.acceleration,
            v     = this.velocity,
            p     = this.position,
            l     = this.lastpos,
            px    = p.x,
            py    = p.y,
            dt2   = dt * dt;

        // current velocity is defined as the change in position, allowing
        // other agents to modify the position (verlet integration)
        v.x = p.x - l.x;
        v.y = p.y - l.y;

        // position changes by velocity + acceleration * dt^2
        p.x += v.x + a.x * dt2;
        p.y += v.y + a.y * dt2;

        // update lastpos
        l.x = px;
        l.y = py;

        return self;
    }
});

var Steerable = Mobile.breed({
    defaults: {
        debug:      false,
        angle:      0,
        rotation:   0,
        throttle:   0,
        power:      1000
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
        self.forces       = Vec2(0,0);
        self.thrust       = 0;

        //self.gravity      = Vec2(0,-9.8);
        self.gravity      = Vec2(0,0);
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

        self.move(dt);

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
        shipsel:    'select[name=ship]',
        ship:       'lightning',
        ships: {
            lightning: {
                name:               "Lightning",
                path:               "M1.5,0L3-2L3-6L7-10L7-8L9-6L11-6L13-8L13-16L11-20L9-20L7-16L7-14L3-10L-3-10L-7-14L-7-16L-9-20L-11-20L-13-16L-13-8L-11-6L-9-6L-7-8L-7-10L-3-6L-3-1.5L-1.5,0L-1.5,8L-4,10L-4,17L-1,20L1,20L4,17L4,10L1.5,8L1.5,0Z",
                centre:             "0,-10",
                scale:              "2",
                mass:               2,
                power:              2500,
                max_turn:           300,
                turn_rate:          0.8,
                oversteer:          0.05,
                thrust_rate:        0.5,
                overthrust:         0.05,
                style: {
                    fill:           "270-#ffc-#fda-#ffc",
                    stroke:         '#133',
                    'stroke-width': 2
                }
            },
            tanker: {
                name:               "Tanker",
//                path:               "M16.001,6l0-4l1-1h3l1,1l0,4l2-3V1l1-1h2l1,1l0,2c0,0,2,0,2,0v2 c0,0-2,1-2,1l0,4l-1,1h-2l-1-1V8l-2,4v2l-1,3h-3l-1-3v-1h-2v1l-1,3h-3l-1-3v-2l-2-4v2l-1,1L4,11l-1-1c0,0,0.001-4,0.001-4 c0,0-2-1-2-1V3h2c0,0,0-2,0-2l1-1h2l1,1v2l2,3l0-4l1-1h3l1,1l0,4h1H16.001z M17,30l1-2l2-4l-1-3l-2-1l0.001-3c0,0-1-3-1-3v-1h-2l0,1 c0,0-1,3-1.001,3L13,20l-2,1l-1,3l2,4l1.062,2H17z",
                path:               "M1.001,6l0-4l1-1h3l1,1l0,4l2-3V1l1-1h2l1,1l0,2c0,0,2,0,2,0v2l-2,1 l0,4l-1,1h-2l-1-1V8l-2,4v2l-1,3h-3l-1-3v-1h-2v1l-1,3h-3l-1-3v-2l-2-4v2l-1,1H-11l-1-1c0,0,0.001-4,0.001-4l-2-1V3h2c0,0,0-2,0-2 l1-1h2l1,1v2l2,3l0-4l1-1h3l1,1l0,4h1H1.001z M2,30l1-2l2-4l-1-3l-2-1l0.001-3c0,0-1-3-1-3v-1h-2l0,1c0,0-1,3-1.001,3L-2,20l-2,1 l-1,3l2,4l1.062,2H2z",
                centre:             "0,-15",
                scale:              5,
                mass:               20,
                power:              4000,
                max_turn:           180,
                turn_rate:          0.005,
                oversteer:          0.99,
                thrust_rate:        0.01,
                overthrust:         0.1,
                style: {
                    fill:           "0-#9b9-#aca-#9b9",
                    stroke:         '#464',
                    'stroke-width':     5,
                    'stroke-linejoin': "round"
                }
            },
            thunderchild: {
                name:               "Thunderchild",
                path:               "M2,2L4,0 7,0 7,2 9,3 10,3 11,2 11,0 13,0 13,9 14,9 15,4 15-4 13-6 11-6 11-9 13-11 13-13 12-13 11-12 7-12 6-13 5-13 5-11 7-9 7-6 4-6 2-7 2-8 3-9 3-10 0-10 -3-10 -3-9 -2-8 -2-7 -4-6 -7-6 -7-9 -5-11 -5-13 -6-13 -7-12 -11-12 -12-13 -13-13 -13-11 -11-9 -11-6 -13-6 -15-4 -15,4 -14,9 -13,9 -13,0 -11,0 -11,2 -10,3 -9,3 -7,2 -7,0 -4,0 -2,2 -2,8 -4,10 -4,12 -2,20 2,20 4,12 4,10 2,8 2,2Z",
                centre:             "0,-8",
                mass:               5,
                scale:              "3,2.5",
                power:              1000,
                max_turn:           180,
                turn_rate:          0.1,
                oversteer:          0.1,
                thrust_rate:        0.1,
                overthrust:         0.1,
                style: {
                    //fill:           "#ccc",
                    fill:           "0-#bbc-#def-#aab-#def-#bbc",
                    stroke:         '#444',
                    'stroke-width': 3
                }
            },
            shuttle: {
                name:               "Shuttle",
                path:               "M-2,29l-8-9l5-5l-2-4h-2v3h-3l-1-13h4l1,4h3 l2-3h3h3l2,3h3l1-4h4l-1,13H9v-3H7l-2,4l5,5l-8,9H0H-2z M-3,18h6 M-2,24h4 M-6,21H6",
                centre:             "0,3",
                scale:              2,
                mass:               4,
                power:              1000,
                max_turn:           180,
                turn_rate:          0.2,
                oversteer:          0.5,
                thrust_rate:        0.1,
                overthrust:         0.1,
                style: {
                    fill:           "90-#88d-#449",
                    stroke:         '#2B2876',
                    'stroke-width':     2,
                    'stroke-linejoin': "round",
                    'stroke-linecap':  "round"
                }
            },
            starblazer: {
                name:               "Starblazer",
                path:               "M-5,25l1-6l-7-8l-2-10l9,5l3-2h2l3,2l9-5 l-2,10l-7,8l1,6l-5,4L-5,25z",
                centre:             "0,1",
                scale:              3,
                mass:               4,
                power:              4200,
                max_turn:           180,
                turn_rate:          0.5,
                oversteer:          0.2,
                thrust_rate:        0.2,
                overthrust:         0.1,
                style: {
                    //fill:           "#7676B7",
                    gradient:       "90-#f80-#fc4",
                    stroke:         '#840',
                    'stroke-width':     4,
                    'stroke-linejoin': "round",
                    'stroke-linecap':  "round"
                }
            }
        },
        orb: {
            distance:           80,
            size:               12,
            mass:               3,
            style: {
                fill:           "#ccf",
                stroke:         '#448',
                'stroke-width': 2
            }
        },
        keys: {
            27: 'escape',
            32: 'space',
            33: 'page_up',
            34: 'page_down',
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
            midx    = self.midx   = width / 2,
            midy    = self.midy   = height / 2;

        self.init_elements(config);
        self.init_key_handler(config);
        //paper.rect(midx - 15, midy -15, 30, 30);
        //paper.rect(midx - 30, midy -30, 60, 60);
        //paper.rect(midx - 45, midy -45, 90, 90);
        //paper.rect(midx - 60, midy -60, 120, 120);

        self.select_ship(config.ship);
    },
    init_elements: function(config) {
        var self  = this,
            elems = self.elements = { },
            cons  = elems.console = Badger.jquery(config.console),
            seln  = elems.shipsel = Badger.jquery(config.shipsel);

        cons.find('[data-view]').each(
            function() {
                var that = $(this),
                    view = that.data('view');
                self.debug("found view for ", view);
                elems[view] = that;
            }
        );
        seln.append(
            Badger.map(
                Badger.keys(config.ships).sort(),
                function(key) {
                    var value = config.ships[key];
                    return '<option value="' + key + '"">' + value.name + '</option>';
                }
            )
        );
        seln.change(
            function() {
                var name = seln.val();
                self.select_ship(name);
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
                else {
                    console.log("key: ", e.keyCode);
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
    select_ship: function(name) {
        var self = this,
            ship = self.ship_config = self.config.ships[name],
            orb  = self.config.orb;

        if (! ship) {
            throw "Invalid ship specified: " + name;
        }

        ship.turn_on    = ship.max_turn * ship.turn_rate;
        ship.turn_off   = ship.max_turn * (1 - ship.oversteer);
        ship.turn_max   = ship.max_turn;
        ship.thrust_on  = ship.thrust_rate;
        ship.thrust_off = 1 - ship.overthrust;

        self.ship = Steerable({
            x:          self.midx,
            y:          self.midy,
            mass:       ship.mass,
            power:      ship.power,
            rotation:   0
        });

        self.orb = Mobile({
            x:          self.midx,
            y:          self.midy - orb.distance,
            mass:       orb.mass
        });

        if (self.sprite) {
            self.sprite.remove();
        }
        if (self.orb_sprite) {
            self.orb_sprite.remove();
        }
        self.sprite     = self.draw_ship();
        self.orb_sprite = self.draw_orb();

    },
    select_previous_ship: function() {
        var self = this,
            seln = self.elements.shipsel,
            optn = seln.find('option:selected')
                       .prop('selected', false)
                       .prev('option')
                       .prop('selected', true);
        self.select_ship(seln.val());
    },
    select_next_ship: function() {
        var self = this,
            seln = self.elements.shipsel,
            optn = seln.find('option:selected')
                       .prop('selected', false)
                       .next('option')
                       .prop('selected', true);
        self.select_ship(seln.val());
    },
    control_ship: function () {
        var self   = this,
            ship   = self.ship,
            press  = self.pressing,
            config = self.ship_config,
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

        if (press.page_up) {
            press.page_up = false;
            self.select_previous_ship();
        }
        if (press.page_down) {
            press.page_down = false;
            self.select_next_ship();
        }
    },
    moderate_connection: function() {
        var self   = this,
            config = self.config,
            ocfg   = config.orb,
            ship   = self.ship,
            orb    = self.orb,
            spos   = ship.position,
            opos   = orb.position,
            l2     = ocfg.distance * ocfg.distance,
            dx     = spos.x - opos.x,
            dy     = spos.y - opos.y,
            d2     = dx*dx + dy*dy,
            sim    = ship.invmass,
            oim    = orb.invmass,
            imass  = sim + oim,
            diff   = l2 / (d2 + l2) - 0.5;

        diff    *= 2 / imass;
        dx      *= diff;
        dy      *= diff;
        opos.x -= dx * oim;
        opos.y -= dy * oim;
        spos.x += dx * sim;
        spos.y += dy * sim;
    },
    draw_ship: function() {
        var config = this.config,
            paper  = this.paper,
            ship   = this.ship,
            scfg   = this.ship_config,
            pos    = ship.position,
            sprite = paper.path(scfg.path);

        sprite.attr(scfg.style);

        // quick hack
        sprite.transform(
            "s" + scfg.scale.toString() +
            "T" + pos.x + "," + (self.height - pos.y)
        );

        return sprite;
    },
    draw_orb: function() {
        var config = this.config,
            paper  = this.paper,
            orb    = this.orb,
            ocfg   = config.orb,
            pos    = orb.position,
            sprite = paper.circle(0, 0, ocfg.size);
        sprite.attr(ocfg.style);
        return sprite;
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
            scfg    = self.ship_config,
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
            var ship    = self.ship,
                sprite  = self.sprite,
                orb     = self.orb,
                osprite = self.orb_sprite,
                pos     = ship.position,
                scfg    = self.ship_config;

            var now = new Date().getTime(),
                ms  = now - (time || now),
                dt  = ms / 1000,
                dir = 180 + ship.angle,
                px, py;

            if (! press.escape)
                requestAnimationFrame(draw);
    
            time = now;

            self.debug(
                "dt:%s x:%s y:%s angle:%s  rotation:%s  throttle:%s",
                dt, pos.x, pos.y, ship.angle, ship.rotation, ship.throttle
            );

            self.control_ship();
            ship.update(dt, stats);
            orb.move(dt);
            self.moderate_connection();

            py = (height + pos.y % height) % height;
            px = (width  + pos.x % width) % width;
            sprite.transform(
                "r" + dir.toString() + "," + scfg.centre +
                "s" + scfg.scale.toString() +
                //"T" + (pos.x % width) + "," + (height - pos.y) % height)
                "T" + px + "," + (height - py)
            );

            pos = orb.position;
            py = (height + pos.y % height) % height;
            px = (width  + pos.x % width) % width;
            osprite.transform(
                "T" + px + "," + (height - py)
            );
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

