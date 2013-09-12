var RAD_DEG= Math.PI / 180;

function deg2rad(degrees) {
    return degrees * RAD_DEG;
};

function rad2deg(radians) {
    return radians / RAD_DEG;
};

function Vec2(x,y) {
    this.x = x;
    this.y = y;
}

Vec2.prototype.zero = function() {
    this.x *= 0;
    this.y *= 0;
    return this;
};

function Mobile() {
    this.angle        = 0;
    this.rotation     = 0;
    this.throttle     = 0;
    this.power        = 500;
    this.mass         = 1;
    this.forces       = new Vec2(0,0);
    this.acceleration = new Vec2(0,0);
    this.velocity     = new Vec2(0,0);
    this.position     = new Vec2(0,0);
    this.direction    = new Vec2(0,0);
    this.gravity      = new Vec2(0,-98);
    return this;
}


Mobile.prototype.update = function(dt) {
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

    // gravity also affects the acceleration
    a.x += g.x;
    a.y += g.y;

    // position changes by velocity * dt + acceleration * dt^2
    p.x += v.x * dt + a.x * dt2;
    p.y += v.y * dt + a.y * dt2;

    // velocity changes by acceleration
    v.x += a.x * dt;
    v.y += a.y * dt;

    // reset the acceleration and forces for the next frame
    a.zero();
    f.zero();

    return self;
};


//----------------------------------------------------------------------------
// The lazy author neglected to add a comment here
//----------------------------------------------------------------------------

function Link() {
    this.ship     = new Mobile();
    this.orb      = new Mobile();
    this.distance = 50;
    return this;
}

Link.prototype.move = function(x,y) {
    this.ship.position.x = x;
    this.ship.position.y = y;
    this.orb.position.x  = x;
    this.orb.position.y  = y + this.distance;
};

Link.prototype.update = function(dt) {
    var self  = this,
        ship  = this.ship.update(dt),
        orb   = this.orb.update(dt),
        spos  = ship.position,
        opos  = orb.position,
        dis2  = this.distance * this.distance,
        dx    = spos.x - opos.x,
        dy    = spos.y - opos.y,
        dx2   = dx * dx,
        dy2   = dy * dy,
        delta = dx2 + dy2,
        delta2 = delta * delta,
        ims   = 1 / ship.mass,
        imo   = 1 / orb.mass,
        imass = ims + imo,
        im2   = -2 / imass,
        diff  = dis2 / (delta2 + dis2) - 0.5;
        //diff  = dis2 / (dx2 + dis2) - 0.5,
        //diffy = dis2 / (dy2 + dis2) - 0.5;

    diff  *= -2 / imass;
    delta *= diff;
    spos.x += dx * ims;
    spos.y += dy * ims;
    opos.x += dx * imo;
    opos.y += dy * imo;
};

var Thrust = {
    defaults: {
        width:      800,
        height:     600,
        trace:      0,
        ship_path: "M1.5,0L3-2L3-6L7-10L7-8L9-6L11-6L13-8L13-16L11-20L9-20L7-16L7-14L3-10L-3-10L-7-14L-7-16L-9-20L-11-20L-13-16L-13-8L-11-6L-9-6L-7-8L-7-10L-3-6L-3-1.5L-1.5,0L-1.5,8L-4,10L-4,17L-1,20L1,20L4,17L4,10L1.5,8L1.5,0",
        ship_style: {
            fill:           "#ccc",
            stroke:         '#444',
            'stroke-width': 3
        },
        orb_style: {
            fill:           "#ccf",
            stroke:         '#448',
            'stroke-width': 2
        }
    }
};

Raphael.fn.Thrust = function (options) {
    var paper  = this,
        config = jQuery.extend({ }, Thrust.defaults, options),
        width  = config.width,
        height = config.height,
        link   = new Link(),
        ship   = link.ship,
        orb    = link.orb,
        pos    = ship.position,
        spos   = ship.position,
        opos   = orb.position;

    link.move(width/2, height/2);
//    ship.angle     = 45;
//    ship.throttle  = 0;
    ship.gravity.y = 0;
//    ship.velocity.x = 100;
//    ship.velocity.y = 200;
//    ship.position.x = width  / 2;
//    ship.position.y = height / 2;
//    ship.rotation   = -0.3;

    var sprite = paper.path(config.ship_path);
    sprite.attr(config.ship_style);

    var osprite = paper.circle(orb.position.x, orb.position.y, 2);
    osprite.attr(config.orb_style);

    console.log("ship: %s,%s  orb: %s,%s", spos.x, spos.y, opos.x, opos.y);

    var time;
    var secs = 5;
    var frames = secs * 60;
    var then = new Date().getTime();

    sprite.attr({transform: ['S',5,5]});
    osprite.attr({transform: ['S',5,5]});

    var arrow = { escape: false, space: false, up: false, down: false, left: false, right: false },
        keys  = { 27: 'escape', 32: 'space', 37: 'left', 38: 'up', 39: 'right', 40: 'down' };

    $(document).keydown(
        function(e) {
            var code = e.keyCode,
                key  = keys[code];

            if (key) {
                //console.log("key down: ", e.keyCode, ' => ', key);
                arrow[key] = true;
            }
            else {
                console.log("down(", e.keyCode, ")");
            }
        }
    );
    $(document).keyup(
        function(e) {
            var code = e.keyCode,
                key  = keys[code];

            if (key) {
                //console.log("key up: ", e.keyCode, ' => ', key);
                arrow[key] = false;
            }
            else {
                //console.log("up(", e.keyCode, ")");
            }
        }
    );

    function draw() {
        //if (frames-- > 0)
        if (! arrow.escape)
            requestAnimationFrame(draw);

        var now = new Date().getTime(),
            ms  = now - (time || now),
            dt  = ms / 1000,
            dir = 180 + ship.angle;
         //   dir = ship.angle;
 
        time = now;

        if (arrow.right) {
            ship.rotation = 180;
            //if (ship.rotation > 90) {
            //    ship.rotation = 90;
            //}
        }
        else if (arrow.left) {
            ship.rotation = -180;
            //if (ship.rotation < -90) {
            //    ship.rotation = -90;
            //}
        }
        else {
            ship.rotation = 0;
        }
        if (arrow.up) {
            //ship.throttle += 0.1;
            ship.throttle = 1;
            if (ship.throttle > 1) {
                ship.throttle = 1;
            }
        }
        else if (arrow.down) {
            //ship.throttle -= 0.1;
            ship.throttle = -1;
            //if (ship.throttle < 0) {
            //    ship.throttle = 0;
            //}
        }
        else {
            ship.throttle=0;
        }

        //console.log("then: ", then, "  now: ", now, "  ms: ", ms, "  dt: ", dt);

        ship.update(dt);
        //link.update(dt);
        pos.x = pos.x % width;
        pos.y = pos.y % height;
        while (pos.x < 0) pos.x += width;
        while (pos.y < 0) pos.y += height;
        //sprite.attr({ cx: pos.x, cy: height - pos.y });
        //sprite.attr({transform: ['T',pos.x,height-pos.y]});
        sprite.transform("r" + dir.toString() + ",0,-12s2.5T" + pos.x + "," + (height - pos.y));       // change COG
        //ship.throttle = 0;
        //console.log("angle: %s  rotation: %s  throttle: %s", ship.angle, ship.rotation, ship.throttle);
    }

    draw();
};


