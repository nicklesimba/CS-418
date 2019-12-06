
class Sphere {
    constructor() { 
        this.position = vec3.fromValues(Math.random()*(4)-2, Math.random()*(0.5)+1.6, Math.random()*(0.5)+0.8);
        this.velocity = vec3.fromValues(Math.random()*(0.02)-0.01, -Math.random()*(0.002), Math.random()*(0.02)-0.01);
        this.tempPosition = vec3.create();
        this.tempVelocity = vec3.create();
        this.radius = Math.random()*(0.3)+0.3;
        this.color = getRandomRgba();

        // time
        this.prevTime = Date.now();
    }

    // update euler integration
    updateEulerIntegration() {
        var currTime = Date.now();
        this.updateSphereVelocity(currTime);
        this.updateSpherePosition(currTime);
        this.prevTime = currTime;
    }

    // update position
    updateSpherePosition(currTime) { // needs collision check via sweeping
        var deltaTime = currTime - this.prevTime;
        this.tempPosition[0] = this.position[0] + this.velocity[0] * deltaTime;
        this.tempPosition[1] = this.position[1] + this.velocity[1] * deltaTime;
        this.tempPosition[2] = this.position[2] + this.velocity[2] * deltaTime;

        this.collisionCheck();

        this.position[0] = this.tempPosition[0];
        this.position[1] = this.tempPosition[1];
        this.position[2] = this.tempPosition[2];
        // this.position[0] = this.position[0] + this.velocity[0] * deltaTime;
        // this.position[1] = this.position[1] + this.velocity[1] * deltaTime;
        // this.position[2] = this.position[2] + this.velocity[2] * deltaTime;

    }

    // update velocity
    updateSphereVelocity(currTime) { // needs sweeping collision check
        var deltaTime = currTime - this.prevTime;
        this.velocity[0] = this.velocity[0] * Math.pow(0.9995, deltaTime) + 0;
        this.velocity[1] = this.velocity[1] * Math.pow(0.997, deltaTime) - 0.00025;
        this.velocity[2] = this.velocity[2] * Math.pow(0.9995, deltaTime) + 0;
    }

    collisionCheck() {
        // rightmost wall check
        if (this.tempPosition[0]+this.radius > 3) {
            this.tempPosition[0] = 3-this.radius-0.001;
            this.velocity[0] *= -1;
        }
        // leftmost wall check
        if (this.tempPosition[0]-this.radius < -3) {
            this.tempPosition[0] = -3+this.radius+0.001;
            this.velocity[0] *= -1;
        }
        // topmost wall check
        if (this.tempPosition[1]+this.radius > 3) {
            this.tempPosition[1] = 3-this.radius-0.001;
            this.velocity[1] *= -1;
        }
        // bottommost wall check
        if (this.tempPosition[1]-this.radius < -3) {
            this.tempPosition[1] = -3+this.radius+0.001;
            this.velocity[1] *= -1;
        }
        // KEEP IN MIND Z AXIS LOOKS AT INCREASINGLY NEGATIVE Z VALUES
        // frontmost wall check (away from user)
        if (this.tempPosition[2]-this.radius < 0.5) {
            this.tempPosition[2] = 0.5+this.radius+0.001;
            this.velocity[2] *= -1;
            console.log("sphereTempPos front: " + (this.tempPosition[2]-this.radius));
        }
        // backmost wall check (towards user)
        if (this.tempPosition[2]+this.radius > 3) {
            this.tempPosition[2] = 3-this.radius-0.001;
            this.velocity[2] *= -1;
            console.log("sphereTempPos back: " + (this.tempPosition[2]+this.radius));
        }
    }
}

// box bounds: 
// z - from 0.5 to 3
// y - from -3 to 3
// x - from -3 to 3

// each wall reverses only one component of velocity, and also calculates new position such that it's not past the wall.
// might have to account for ball coming to a stop on the floor but i'll get to it when i get to it.

// to do a check i'll just check the 6 points of the sphere that are top bottom left right forward backward
// check if any of the temp_new_positions+those_above_points are > wall coordinates. if they are, do collision detection properties.