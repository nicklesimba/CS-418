
/**
 * @file A simple WebGL example drawing central Illinois style terrain
 * @author Eric Shaffer <shaffer1@illinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global The angle of rotation around the y axis */
var viewRot = 10;

/** @global A glmatrix vector to use for transformations */
var transformVec = vec3.create();    

// Initialize the vector....
vec3.set(transformVec,0.0,0.0,-2.0);

/** @global An object holding the geometry for a 3D terrain */
var myTerrain;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,0.5,-0.5);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);
/** @global Location of origin */
var origPt = vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [-20, 20, -5];
// var lightPosition = [0.5,0.5,0.0];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.4,0.4,0.4];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0.5,0.5,0.5];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
// var kTerrainDiffuse = [0.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1,1,1];
/** @global Shininess exponent for Phong reflection */
var shininess = 30;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];

/** @global X, Y, and Z euler angles (initially) */
// var xRot = [0, 0, 0];
// var yRot = [0, 0, 0];
// var zRot = [0, 0, 0];
var xRot = 0;
var yRot = 0;
var zRot = 0;

/** @global X, Y, and Z axes variables (unused) */
var xAxis = [1, 0, 0];
var yAxis = [0, 1, 0];
var zAxis = [0, 0, 1];

/** @global quaternion that records current orientation of viewer */
var currRot = quat.create();

/** @global quaternion that records contributions from keyboard inputs */
var tempRot = quat.create();

/** @global plane throttle */
var speed = 0.001;
var move = 0.0;

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
  shaderProgram.uniformFogDensity = gl.getUniformLocation(shaderProgram, "fogDensity");
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");  
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    myTerrain = new Terrain(256,-4.0,4.0,-4.0,4.0);
    myTerrain.loadBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 

    var transformVec = vec3.create();

  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.5, 200.0);

    mat4.fromQuat(mvMatrix, currRot);
    
    vec3.set(transformVec,0.0,-0.25,-2.0);

    mat4.translate(mvMatrix, mvMatrix,transformVec); // commenting this out moves us away from the model
    
    move += speed;
    
    console.log(move);

    var viewDir = vec3.fromValues(0,0,move);
    var inverted = quat.create();
    vec3.transformQuat(viewDir, viewDir, quat.invert(inverted, currRot));
    console.log(viewDir);
    // vec3.multiply(viewDir, viewDir, [speed, speed, speed]);
    mat4.translate(mvMatrix, mvMatrix,viewDir);
    
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(viewRot));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75)); // commenting this out gives us a top down view


    mvPushMatrix();

    var lightPositionInViewCoordinates = vec3.create();
    inverted = quat.create();
    vec3.transformQuat(lightPositionInViewCoordinates, lightPosition, currRot);
    
    setMatrixUniforms();
    setLightUniforms(lightPositionInViewCoordinates,lAmbient,lDiffuse,lSpecular);
    
    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    { 
      setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular); 
      myTerrain.drawTriangles();
    }
    
    if(document.getElementById("wirepoly").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeBlack,kSpecular);
      myTerrain.drawEdges();
    }

    if(document.getElementById("wireframe").checked)
    {
      setMaterialUniforms(shininess,kAmbient,kEdgeWhite,kSpecular);
      myTerrain.drawEdges();
    }

    if(document.getElementById("fog").checked) 
    {
      gl.uniform1f(shaderProgram.uniformFogDensity, 0.5);
    }

    if(document.getElementById("nofog").checked) 
    {
      gl.uniform1f(shaderProgram.uniformFogDensity, 0.0);
    }
    mvPopMatrix();

  
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.4, 0.4, 0.4, 0.6);
  gl.enable(gl.DEPTH_TEST);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

  console.log(eyePt);

  // We want to look down -z, so create a lookat point in that direction   
  vec3.add(viewPt, eyePt, viewDir);

  // Then generate the lookat matrix and initialize the MV matrix to that view
  mat4.lookAt(mvMatrix,eyePt,viewPt,up);

  //Draw Terrain
  var transformVec = vec3.create();
  vec3.set(transformVec,0.0,-0.25,-2.0);
  mat4.translate(mvMatrix, mvMatrix, transformVec); // commenting this out moves us away from the model
  mat4.rotateY(mvMatrix, mvMatrix, degToRad(viewRot));
  mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75)); // commenting this out gives us a top down view
  mvPushMatrix();

  fromEuler(currRot, xRot, yRot, zRot);

  tick();
}

//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    
    // Sun movement :)
    if (lightPosition[0] < -20) {
      lightPosition[0] += 0.15;
    }
    else if (lightPosition[0] < 20 && lightPosition[0] >= -20) {
      lightPosition[0] += 0.035;
    }
    else if (lightPosition[0] >= 20 && lightPosition[0] < 50) {
      lightPosition[0] += 0.15;
    }
    else if (lightPosition[0] >= 50) {
      lightPosition[0] = -50;
    }
    
    animate();
}

/**
 * Code for updating model transforms
 */
function animate() {
  if (currentlyPressedKeys["w"]) {
    quat.setAxisAngle(tempRot, xAxis, 0.01);
    quat.mul(currRot, tempRot, currRot);
  }
  if (currentlyPressedKeys["s"]) {
    quat.setAxisAngle(tempRot, xAxis, -0.01);
    quat.mul(currRot, tempRot, currRot);
  }
  if (currentlyPressedKeys["a"]) {
    quat.setAxisAngle(tempRot, zAxis, -0.01);
    quat.mul(currRot, tempRot, currRot);
  }
  if (currentlyPressedKeys["d"]) {
    quat.setAxisAngle(tempRot, zAxis, 0.01);
    quat.mul(currRot, tempRot, currRot);
  }
  if (currentlyPressedKeys["z"]) {
    quat.setAxisAngle(tempRot, yAxis, -0.0025);
    quat.mul(currRot, tempRot, currRot);
  }
  if (currentlyPressedKeys["c"]) {
    quat.setAxisAngle(tempRot, yAxis, 0.0025);
    quat.mul(currRot, tempRot, currRot);
  }

  if (currentlyPressedKeys["-"]) {
    speed -= 0.001;
    if (speed < 0.001) {
      speed = 0.001;
    }
  }
  if (currentlyPressedKeys["="]) {
    speed += 0.001;
    if (speed > 0.01) {
      speed = 0.02;
    }
  }

  // eyePt[0] = mvMatrix[12];
  // eyePt[1] = mvMatrix[13];
  // eyePt[2] = mvMatrix[14];
  
  // mat4.translate(mvMatrix, mvMatrix, eyePt);
  // console.log(mvMatrix);
  // console.log(mvMatrix[2]);
  // console.log(mvMatrix[6]);
  // console.log(mvMatrix[10]);
  // var john = vec3.fromValues(mvMatrix[8], mvMatrix[9], mvMatrix[10]);
  // mat4.translate(mvMatrix, mvMatrix, john);
}

/**
 * Code to handle user interaction 
 */ 
var currentlyPressedKeys = {};


function handleKeyDown(event) {
  console.log("Key down ", event.key, " code ", event.code);
  if (event.key == "a" || event.key == "d" || event.key == "w" || event.key == "s" || 
  event.key == "-" || event.key == "=") {
    event.preventDefault();
  }
  currentlyPressedKeys[event.key] = true;
}

function handleKeyUp(event) {
  console.log("Key up ", event.key, " code ", event.code);
  currentlyPressedKeys[event.key] = false;
}

// function stolen from updated glMatrix because i'm too lazy to update!
function fromEuler(out, x, y, z) {
  let halfToRad = 0.5 * Math.PI / 180.0;
  x *= halfToRad;
  y *= halfToRad;
  z *= halfToRad;
  let sx = Math.sin(x);
  let cx = Math.cos(x);
  let sy = Math.sin(y);
  let cy = Math.cos(y);
  let sz = Math.sin(z);
  let cz = Math.cos(z);
  out[0] = sx * cy * cz - cx * sy * sz;
  out[1] = cx * sy * cz + sx * cy * sz;
  out[2] = cx * cy * sz - sx * sy * cz;
  out[3] = cx * cy * cz + sx * sy * sz;
  return out;
}