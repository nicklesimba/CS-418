/**
 * @file A simple WebGL example drawing the Illini logo with an animation
 * @author Nikhil Simha <simha3@eillinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The angle of rotation around the x axis */
var defAngle = 0;

/** @global The amount of translation in the x direction*/
var transRights = [0, 0, 0];

/** @global The amount the model should be scaled by */
var scalefac = 1;

/** @global The sign of scaling by */
var sign = 1;

/** @global Number of vertices around the circle boundary */
var numCircleVerts = 100;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The id telling us which animation to do */
var anim_value;

/** @global The id telling us which animation was last */
var anim_value_prev = "Illini";

/** @global Used for alpha value adjustment */
var colfac = 1;

/** @global Used for alpha value adjustment */

/** @global These are used for the Custom animation, and provide colors for each region */
var colsign = 1;
var colorlad1 = [0, 0, 0, 1.0];
var colorlad2 = [0, 0, 0, 1.0];
var colorlad3 = [0, 0, 0, 1.0];
var colorlad4 = [0, 0, 0, 1.0];
var colorlad5 = [0, 0, 0, 1.0];


/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var context = null;
  context = canvas.getContext("webgl");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

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
    
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");   

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor"); 
}

/**
 * Populate buffers with data - im going to mess with this to try and draw a second triangle!
 */
function setupBuffers(triVertices, itemSize, numItems) {
    vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    
    var triangleVertices = triVertices; 

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW); // static draw probably isn't great for animated shits!
    vertexPositionBuffer.itemSize = itemSize;
    vertexPositionBuffer.numberOfItems = numItems;
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 * @param {int} modeSelect mode selection value of 0 or 1 for deciding if a triangle or triangle fan is being drawn.
 */
function draw(modeSelect) { 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    gl.clear(gl.DEPTH_BUFFER_BIT);
  
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                           vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  
    // gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
    setMatrixUniforms();
    if (modeSelect) {
      gl.drawArrays(gl.TRIANGLE_FAN, 0, vertexPositionBuffer.numberOfItems);
    }               
    else {
      gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
    }

    if (document.getElementById('Illini').checked) {
      anim_value = document.getElementById('Illini').value;
    }

    else if (document.getElementById('Custom').checked) {
        anim_value = document.getElementById('Custom').value;
    }

    if (anim_value != "Illini" && anim_value_prev == "Illini") {
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    else if (anim_value != "Custom" && anim_value_prev == "Custom") {
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    anim_value_prev = anim_value;
}

/**
 * Startup function called from html code to start program.
 */
function startup() {
    console.log("No bugs so far...");
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    setupShaders(); 
    tick();
}

/**
 * Animation to be called from tick. Updates globals and performs Illini I animation for each tick.
 */
function animate() { 
  defAngle = (defAngle+1.0) % 360;

  scalefac += (sign * 0.01);
  if (scalefac >= 2) {
    sign *= -1;
  }
  if (scalefac <= 1) {
    sign *= -1;
  }
  
  var tmpMatrix = mat4.create();
  var tmp2Matrix = mat4.create();
  mat4.fromZRotation(tmpMatrix, degToRad(defAngle));
  mat4.scale(tmp2Matrix, tmp2Matrix, [scalefac, scalefac, scalefac]);
  
  mat4.multiply(mvMatrix, tmp2Matrix, tmpMatrix);

  gl.uniformMatrix4fv(shaderProgram.uMVMatrixUniform, false, mvMatrix);

  mat4.ortho(pMatrix, -100, 100, -100, 100, -100, 100);
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  
  vColor = gl.getUniformLocation(shaderProgram, "vColor");

  //change color to orange and setup buffer for orange I
  // 0.909, 0.290, 0.152, 1.0
  gl.uniform4fv( vColor, new Float32Array([0.909, 0.290, 0.152, 1.0]) );
  
  triVertices = [
    -20,  35,  0.0, // orange I
      20,  35,  0.0,
      20,  15,  0.0,
    -20,  35,  0.0,
    -20,  15,  0.0,
      20,  15,  0.0,
    -20, -35,  0.0,
      20, -35,  0.0,
      20, -15,  0.0,
    -20, -15,  0.0,
    -20, -35,  0.0,
      20, -15,  0.0,
    -10,  15,  0.0,
    -10, -15,  0.0,
      10, -15,  0.0,
      10,  15,  0.0,
      10, -15,  0.0,
    -10,  15,  0.0,
  ];

  setupBuffers(triVertices, 3, 18); //provide arguments with colors and coordinates, as well as num of items and shits
  draw(0);  

  //change color to blue and setup buffer for blue border!
  // 0.074, 0.160, 0.294, 1.0
  gl.uniform4fv( vColor, new Float32Array([0.074, 0.160, 0.294, 1.0]) );
  triVertices = [
    -16,  15,  0.0, // top arc 18
    -20,  15,  0.0,
    -20,  35,  0.0, // 7
    -16,  15,  0.0,
    -20,  35,  0.0, // 13
    -16,  35,  0.0, // 16
    -16,  35,  0.0, // 19
    -16,  31,  0.0,
      16,  35,  0.0, // 25
    -16,  31,  0.0,
      16,  35,  0.0,  // 31
      16,  31,  0.0,
      16,  35,  0.0, // 37
      20,  35,  0.0, // 40
      20,  15,  0.0,
      20,  15,  0.0,
      16,  35,  0.0, // 49
      16,  15,  0.0,
    -16, -15,  0.0, // bottom arc 18
    -20, -15,  0.0,
    -20, -35,  0.0,
    -16, -15,  0.0,
    -20, -35,  0.0,
    -16, -35,  0.0,
    -16, -35,  0.0,
    -16, -31,  0.0,
      16, -35,  0.0,
    -16, -31,  0.0,
      16, -35,  0.0, 
      16, -31,  0.0,
      16, -35,  0.0,
      20, -35,  0.0,
      20, -15,  0.0,
      20, -15,  0.0,
      16, -35,  0.0,
      16, -15,  0.0,
    -16,  15,  0.0, // left liney bois 12
    -16,  19,  0.0,
    -10,  19,  0.0,
    -10,  19,  0.0,
    -10,  15,  0.0,
    -16,  15,  0.0,
    -16, -15,  0.0,
    -16, -19,  0.0,
    -10, -19,  0.0,
    -10, -19,  0.0,
    -10, -15,  0.0,
    -16, -15,  0.0,
    16,  15,  0.0,  // right liney bois 12
    16,  19,  0.0,
    10,  19,  0.0,
    10,  19,  0.0,
    10,  15,  0.0,
    16,  15,  0.0,
    16, -15,  0.0,
    16, -19,  0.0,
    10, -19,  0.0,
    10, -19,  0.0,
    10, -15,  0.0,
    16, -15,  0.0,
    -10,  15,  0.0,    // vertical line bois 12
      -6,  15,  0.0,
    -10, -15,  0.0,
    -6, -15,  0.0,
    -10, -15,  0.0,
      -6,  15,  0.0,
      10,  15,  0.0,
      6,  15,  0.0,
    10, -15,  0.0,
    6, -15,  0.0,
    10, -15,  0.0,
      6,  15,  0.0, // this marks the 72nd, 0.0 is 215
     
    -8,  16,  0.0,    // 1st popout lad
    -8,  14,  0.0,
    -10, 15,  0.0,
    -8, 14,  0.0, // 2nd popout lad
    -8, 12,  0.0,
    -10, 13,  0.0,
    -8,  12,  0.0, // 3rd popout lad
    -8, 10,  0.0,
    -10, 11,  0.0,
    -8, 10,  0.0, // 4th popout lad
    -8, 8,  0.0,
    -10, 9,  0.0,
    -8, 8,  0.0, // 5th popout lad
    -8, 6,  0.0,
    -10, 7,  0.0,
    -8, 6,  0.0, // 6th popout lad
    -8, 4,  0.0,
    -10, 5,  0.0,
    -8, 4,  0.0, // 7th popout lad
    -8, 2,  0.0,
    -10, 3,  0.0,
    -8, 2,  0.0, // 8th popout lad
    -8, 0,  0.0,
    -10, 1,  0.0,
    -8, 0,  0.0, // 9th popout lad
    -8, -2,  0.0,
    -10, -1,  0.0,
    -8, -2,  0.0, // 10th popout lad
    -8, -4,  0.0,
    -10, -3,  0.0,
    -8, -4,  0.0, // 11th popout lad
    -8, -6,  0.0,
    -10, -5,  0.0,
    -8, -6,  0.0, // 12th popout lad
    -8, -8,  0.0,
    -10, -7,  0.0,
    -8, -8,  0.0, // 13th popout lad
    -8, -10,  0.0,
    -10, -9,  0.0,
    -8, -10,  0.0, // 14th popout lad
    -8, -12,  0.0,
    -10, -11,  0.0,
    -8, -12,  0.0, // 15th popout lad
    -8, -14,  0.0,
    -10, -13,  0.0,
    -8, -14,  0.0, // 16th popout lad
    -8, -16,  0.0,
    -10, -15,  0.0,

    8,  16,  0.0,    // 1st popout lad
    8,  14,  0.0,
    10, 15,  0.0,
    8, 14,  0.0, // 2nd popout lad
    8, 12,  0.0,
    10, 13,  0.0,
    8,  12,  0.0, // 3rd popout lad
    8, 10,  0.0,
    10, 11,  0.0,
    8, 10,  0.0, // 4th popout lad
    8, 8,  0.0,
    10, 9,  0.0,
    8, 8,  0.0, // 5th popout lad
    8, 6,  0.0,
    10, 7,  0.0,
    8, 6,  0.0, // 6th popout lad
    8, 4,  0.0,
    10, 5,  0.0,
    8, 4,  0.0, // 7th popout lad
    8, 2,  0.0,
    10, 3,  0.0,
    8, 2,  0.0, // 8th popout lad
    8, 0,  0.0,
    10, 1,  0.0,
    8, 0,  0.0, // 9th popout lad
    8, -2,  0.0,
    10, -1,  0.0,
    8, -2,  0.0, // 10th popout lad
    8, -4,  0.0,
    10, -3,  0.0,
    8, -4,  0.0, // 11th popout lad
    8, -6,  0.0,
    10, -5,  0.0,
    8, -6,  0.0, // 12th popout lad
    8, -8,  0.0,
    10, -7,  0.0,
    8, -8,  0.0, // 13th popout lad
    8, -10,  0.0,
    10, -9,  0.0,
    8, -10,  0.0, // 14th popout lad
    8, -12,  0.0,
    10, -11,  0.0,
    8, -12,  0.0, // 15th popout lad
    8, -14,  0.0,
    10, -13,  0.0,
    8, -14,  0.0, // 16th popout lad
    8, -16,  0.0,
    10, -15,  0.0,
  ];

  // vertexAnimIndices = [7, 13, 16, 19, 25, 31, 37, 40, 49];
  // non-uniform transform lol
  if (defAngle < 45) {
    triVertices[222] *= 1.5;
    triVertices[294] *= 1.5;
    triVertices[402] *= 1.5;
    triVertices[474] *= 1.5;
  }
  else if (defAngle >= 45 && defAngle < 90) {
    triVertices[231] *= 1.8;
    triVertices[303] *= 1.8;
    triVertices[411] *= 1.8;
    triVertices[483] *= 1.8;
  }
  else if (defAngle >= 90 && defAngle < 135) {
    triVertices[240] *= 2;
    triVertices[312] *= 2;
    triVertices[420] *= 2; // blaze it
    triVertices[492] *= 2;
  }
  else if (defAngle >= 135 && defAngle < 180) {
    triVertices[249] *= 1.8;
    triVertices[321] *= 1.8;
    triVertices[429] *= 1.8;
    triVertices[501] *= 1.8;
  }
  else if (defAngle >= 180 && defAngle < 225) {
    triVertices[258] *= 1.5;
    triVertices[330] *= 1.5;
    triVertices[366] *= 1.5;
    triVertices[438] *= 1.5;
  }
  else if (defAngle >= 225 && defAngle < 270) {
    triVertices[267] *= 1.8;
    triVertices[339] *= 1.8;
    triVertices[375] *= 1.8;
    triVertices[447] *= 1.8;
  }
  else if (defAngle >= 270 && defAngle < 315) {
    triVertices[276] *= 2;
    triVertices[348] *= 2;
    triVertices[384] *= 2;
    triVertices[456] *= 2;
  }
  else if (defAngle >= 315 && defAngle < 360) {
    triVertices[285] *= 1.8;
    triVertices[357] *= 1.8;
    triVertices[393] *= 1.8;
    triVertices[465] *= 1.8;
  }

  setupBuffers(triVertices, 3, 168);
  draw(0);

  var radius = 4;
  var z = 0;
  var defPt;

  fanVertices = [-10, 15, 0];
  for (i = 0; i <= numCircleVerts; i++) {
    angle = i * (Math.PI/2) / numCircleVerts;
    x = (radius * Math.cos(angle));
    y = (radius * Math.sin(angle));
    fanVertices.push(x-10);
    fanVertices.push(y+15);
    fanVertices.push(z);
  }

  setupBuffers(fanVertices, 3, numCircleVerts+2);
  draw(1);

  fanVertices = [10, 15, 0];
  for (i = 0; i <= numCircleVerts; i++) {
    angle = (Math.PI/2) + i * (Math.PI/2) / numCircleVerts;
    x = (radius * Math.cos(angle));
    y = (radius * Math.sin(angle));
    fanVertices.push(x+10);
    fanVertices.push(y+15);
    fanVertices.push(z);
  }

  setupBuffers(fanVertices, 3, numCircleVerts+2);
  draw(1);

  fanVertices = [-10, -15, 0];
  for (i = 0; i <= numCircleVerts; i++) {
    angle = (3*Math.PI/2) + i * (Math.PI/2) / numCircleVerts;
    x = (radius * Math.cos(angle));
    y = (radius * Math.sin(angle));
    fanVertices.push(x-10);
    fanVertices.push(y-15);
    fanVertices.push(z);
  }

  setupBuffers(fanVertices, 3, numCircleVerts+2);
  draw(1);

  fanVertices = [10, -15, 0];
  for (i = 0; i <= numCircleVerts; i++) {
    angle = (Math.PI) + i * (Math.PI/2) / numCircleVerts;
    x = (radius * Math.cos(angle));
    y = (radius * Math.sin(angle));
    fanVertices.push(x+10);
    fanVertices.push(y-15);
    fanVertices.push(z);
  }

  setupBuffers(fanVertices, 3, numCircleVerts+2);
  draw(1);
}

/**
 * Animation to be called from tick. Updates globals and performs custom animation for each tick.
 */
function animate_2() { 
  colfac += (colsign * 0.01);
  if (colfac >= 2) {
    colsign *= -1;
  }
  if (colfac <= 1) {
    colsign *= -1;
  }

  defAngle = (defAngle+1.0) % 1000;

  // select colors, update each region at a different time
  if (defAngle % 250 == 0) {
    colorlad1 = [Math.random(), Math.random(), Math.random(), colfac-1];
  }
  if (defAngle % 500 == 6) {
    colorlad2 = [Math.random(), Math.random(), Math.random(), colfac-1];
  }
  if (defAngle % 500 == 9) {
    colorlad3 = [Math.random(), Math.random(), Math.random(), colfac-1];
  }
  if (defAngle % 500 == 11) {
    colorlad4 = [Math.random(), Math.random(), Math.random(), colfac-1];
  }
  if (defAngle % 500 == 13) {
    colorlad5 = [Math.random(), Math.random(), Math.random(), colfac-1];
  }

  // fade ins and fade outs of colors
  if (defAngle % 4 == 0 && (colfac - 1) < 0.9){
    colorlad1[3] = colfac - 1;
    colorlad2[3] = colfac - 1;
    colorlad3[3] = colfac - 1;
    colorlad4[3] = colfac - 1;
    colorlad5[3] = colfac - 1;
  }

  mat4.fromZRotation(mvMatrix, degToRad(0));  
 
  gl.uniformMatrix4fv(shaderProgram.uMVMatrixUniform, false, mvMatrix);

  mat4.ortho(pMatrix, -100, 100, -100, 100, -100, 100);
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  
  vColor = gl.getUniformLocation(shaderProgram, "vColor");

  // define the square and the surrounding 4 trapezoids
  gl.uniform4fv( vColor, new Float32Array(colorlad1) );

  triVertices = [
    -50,  50,  0.0, // stick figure head and body
      -50,  -50,  0.0,
      50,  50,  0.0,
    -50,  -50,  0.0,
    50,  -50,  0.0,
      50,  50,  0.0,
  ];

  setupBuffers(triVertices, 3, 6); //provide arguments with colors and coordinates, as well as num of items and shits
  draw(0);  

  gl.uniform4fv( vColor, new Float32Array(colorlad2) );
  triVertices = [
    -50,  50,  0.0, // top arc 18
    -100,  100,  0.0,
    100,  100,  0.0, // 7
    100,  100,  0.0,
    50,  50,  0.0, // 13
    -50,  50,  0.0, // 16
  ];

  setupBuffers(triVertices, 3, 6);
  draw(0);

  gl.uniform4fv( vColor, new Float32Array(colorlad3) );
  triVertices = [
    -50,  50,  0.0, // top arc 18
    -100,  100,  0.0,
    -100,  -100,  0.0, // 7
    -100,  -100,  0.0,
    -50,  -50,  0.0, // 13
    -50,  50,  0.0, // 16
  ];

  setupBuffers(triVertices, 3, 6);
  draw(0);

  gl.uniform4fv( vColor, new Float32Array(colorlad4) );
  triVertices = [
    50,  50,  0.0, // top arc 18
    100,  100,  0.0,
    100,  -100,  0.0, // 7
    100,  -100,  0.0,
    50,  -50,  0.0, // 13
    50,  50,  0.0, // 16
  ];

  setupBuffers(triVertices, 3, 6);
  draw(0);

  gl.uniform4fv( vColor, new Float32Array(colorlad5) );
  triVertices = [
    -50,  -50,  0.0, // top arc 18
    -100,  -100,  0.0,
    50,  -50,  0.0, // 7
    -100,  -100,  0.0,
    50,  -50,  0.0, // 13
    100,  -100,  0.0, // 16
  ];

  setupBuffers(triVertices, 3, 6);
  draw(0);

}
  
/**
 * Tick called for every animation frame.
 */
function tick() {
  requestAnimFrame(tick);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  if (anim_value == "Illini") {
    animate();
  }
  else if (anim_value == "Custom") {
    animate_2();
  }
}