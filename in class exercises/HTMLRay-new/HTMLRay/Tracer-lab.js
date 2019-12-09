
//-------------------------------------------------------
// Global variables
var eyePoint = glMatrix.vec3.fromValues(0,0,0);
var lightPosition = glMatrix.vec3.fromValues(0,0,0);
var lightColor = glMatrix.vec3.fromValues(1,1,1);

// The sphere
var sphereDiffuseColor = glMatrix.vec3.fromValues(1,0,0);
var sphereShininess = 100;
var sphereCenter = glMatrix.vec3.fromValues(0,0,-2);
var sphereRadius = 0.5;

// The background color
// HTML 2D Canvas expects color channels to be in[0,255]
var background = [0,0,0,255];

// Variables for the viewport
var vres= 0;   // number of rows
var hres = 0;  // number of columns
var s = 1.0;   // length of a pixel side in world coordinates
var near = 0; // distance from the eyepoint to screen along Z axis

//------------------------------------------------------
/**
   * Finds the instersection between a ray and sphere closest to ray origin.
   * @param {glMatrix.vec3} origin of the ray in world coordinates
   * @param {glMatrix.vec3} direction of the ray in world coordinates
   * @param {glMatrix.vec3} center of the sphere in world coordinates
   * @param {number} radius of the sphere
   * @return {glMatrix.vec3} intersection point in world coordinates or null if no intersection
   */
function raySphereX(rayOrigin, rayDirection, sphereCenter, sphereRadius)
{
    
    var a = glMatrix.vec3.dot(rayDirection,rayDirection);
    var oc = glMatrix.vec3.fromValues(0,0,0);
    glMatrix.vec3.subtract(oc, rayOrigin, sphereCenter);
    
    var b = 2.0*glMatrix.vec3.dot(rayDirection,oc);
    var c = glMatrix.vec3.dot(oc,oc) - (sphereRadius*sphereRadius);
    
    var delta = (b * b) - (4*a * c);

    if (delta < 0) // No solution
        return null;

    // One or two solutions, take the closest (positive) intersection
    var sqrtDelta = Math.sqrt(delta);

    // a >= 0
    var tMin = (-b - sqrtDelta) / (2*a);
    var tMax = (-b + sqrtDelta) / (2*a);

    if (tMax < 0) // All intersection points are behind the origin of the ray
        return null;

    // tMax >= 0
    var t = tMin >= 0 ? tMin : tMax;
    var pointX = glMatrix.vec3.fromValues(0,0,0);
    glMatrix.vec3.scaleAndAdd(pointX,rayOrigin,rayDirection,t);
    return pointX; 
}

//------------------------------------------------------
/**
   * Returns the shade for a pixel with color values in [0,255]
   * @param {glMatrix.vec3} view vector in world coordinates
   * @param {glMatrix.vec3} surface normal in world coordinates
   * @param {glMatrix.vec3} light vector in world coordinates
   * @param {glMatrix.vec3} light color with color values in [0,1]
   * @param {glMatrix.vec3} diffude surface color with color values in [0,1]
   * @param {number} shininess coefficient
   * @return {glMatrix.vec3} pixel shade
   */
function blinnPhongReflect(V,N,L,lightColor, surfaceColor, shininess)
{
 // FILL IN THIS
 // Use white for specular highlights
 // Change the return value....
    glMatrix.vec3.normalize(V, V);
    glMatrix.vec3.normalize(N, N);
    glMatrix.vec3.normalize(L, L);

    var diffuseWeight = Math.max(0.0, glMatrix.vec3.dot(N, L));
    
    var shade = glMatrix.vec3.fromValues(0, 0, 0);
    glMatrix.vec3.mul(shade, lightColor, surfaceColor);

    glMatrix.vec3.scale(shade, shade, diffuseWeight*255);

    var halfway = glMatrix.vec3.create();
    glMatrix.vec3.add(halfway, L, V);
    glMatrix.vec3.normalize(halfway, halfway);
    var ndoth = glMatrix.vec3.dot(N, halfway);
    ndoth = Math.max(ndoth, 0.0);
    var specularLightWeighting = Math.pow(ndoth, shininess);
    var specular = glMatrix.vec3.fromValues(0.8, 0.8, 0.8);
    glMatrix.vec3.scale(specular, specular, specularLightWeighting * 255.0);

    glMatrix.vec3.add(shade, shade, specular);
    glMatrix.vec3.floor(shade, shade);

    // vec3 halfwayVector = normalize(vectorToLightSource + viewVectorEye);
    // float ndoth = max(dot(normalEye, halfwayVector), 0.0);
    // float specularLightWeightning = pow(ndoth, uShininess);

    return [shade[0],shade[1],shade[2],255];
}

//------------------------------------------------------
//
function main() {
//Main drawing function
  var canvas = document.getElementById('tracer');
  if (! canvas) {
    console.log(' Failed to retrieve the < canvas > element');
    return false;
  }
  else {
	console.log(' Got < canvas > element ');
  }

// Get the rendering context 
var ctx = canvas.getContext('2d');
if (ctx==null)
    console.log("No 2D context available");
else
    console.log("Got a 2D context");

var imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
console.log("Rendering a ", canvas.width, " by ", canvas.height, " image");

vres = canvas.height;
hres = canvas.width;

// Choose pixel size so that the screen goes from -1 to +1 in world coordinates
s = 2/vres;
    
// Initialize a ray
var rayOrigin = glMatrix.vec3.fromValues(0,0,0);
var rayDirection = glMatrix.vec3.fromValues(0,0,0);
    
// Initialize some shading parameters
var V = glMatrix.vec3.fromValues(0,0,0);
var N = glMatrix.vec3.fromValues(0,0,0);
var L = glMatrix.vec3.fromValues(0,0,0);   

//Loop over the pixels and ray trace the scene
for (var r=0;r<vres;r++)
	for (var c=0;c<hres;c++)
  	{
        // compute a ray through the pixel center...use orthographic projection
        // FILL IN THIS
        pixelX = s*(c-hres/2.0 +0.5);
        pixelY = s*(r-vres/2.0 +0.5);
        pixelZ = 0;
        rayOrigin = glMatrix.vec3.fromValues(pixelX, pixelY, pixelZ);
        rayDirection = glMatrix.vec3.fromValues(0, 0, -1);
        //test to see if ray intersects the sphere
        xPoint = raySphereX(rayOrigin, rayDirection, sphereCenter, sphereRadius);
        if (xPoint == null)
            color = background;
        else
            {
                // Generate view, normal, and light vectors
                // FILL IN THIS
                V = glMatrix.vec3.subtract(V, eyePoint, xPoint);
                L = glMatrix.vec3.subtract(L, lightPosition, xPoint);
                N = glMatrix.vec3.subtract(N, xPoint, sphereCenter);
                
                // Compute a shade for the pixel
                color = blinnPhongReflect(V,N,L,lightColor, sphereDiffuseColor, sphereShininess);
            }
        
  		i = (r*canvas.width + c)*4
  		imgData.data[i]=color[0];
  		imgData.data[i+1]= color[1];
  		imgData.data[i+2]= color[2];
  		imgData.data[i+3]= color[3];
     }

 ctx.putImageData(imgData,0,0);
}

