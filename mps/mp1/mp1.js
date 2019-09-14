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

/** @global Number of vertices around the circle boundary */
var numCircleVerts = 100;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();


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
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() { 
  defAngle = (defAngle+1.0) % 360;
  transRights = [30, 0, 0];
  // if (transRights == 499) {
  //   transRights = -499;
  // }

  var tmpMatrix = mat4.create();
  var tmp2Matrix = mat4.create();
  mat4.fromZRotation(tmpMatrix, degToRad(defAngle));
  mat4.translate(tmp2Matrix, tmp2Matrix, transRights);

  mat4.multiply(mvMatrix, tmp2Matrix, tmpMatrix);

  // mat4.fromZRotation(mvMatrix, degToRad(defAngle));
  // mat4.translate(mvMatrix, mvMatrix, transRights);
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

  // for (var i = 0; i < triVertices.length; i++) {
  //   if (i % 3 == 0) {
  //     defPt = deformCos(triVertices[i], triVertices[i+1], defAngle);
  //     triVertices[i] += defPt[0];
  //     triVertices[i+1] += defPt[1];
  //   }
  // }
  setupBuffers(triVertices, 3, 18); //provide arguments with colors and coordinates, as well as num of items and shits
  draw(0);  

  //change color to blue and setup buffer for blue border!
  // 0.074, 0.160, 0.294, 1.0
  gl.uniform4fv( vColor, new Float32Array([0.074, 0.160, 0.294, 1.0]) );
  triVertices = [
    -16,  15,  0.0, // top arc 18
    -20,  15,  0.0,
    -20,  35,  0.0,
    -16,  15,  0.0,
    -20,  35,  0.0,
    -16,  35,  0.0,
    -16,  35,  0.0,
    -16,  31,  0.0,
      16,  35,  0.0,
    -16,  31,  0.0,
      16,  35,  0.0, 
      16,  31,  0.0,
      16,  35,  0.0,
      20,  35,  0.0,
      20,  15,  0.0,
      20,  15,  0.0,
      16,  35,  0.0,
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
      6,  15,  0.0,
  ];

  // for (var i = 0; i < triVertices.length; i++) {
  //   if (i % 3 == 0) {
  //     defPt = deformCos(triVertices[i], triVertices[i+1], defAngle);
  //     triVertices[i] += defPt[0];
  //     triVertices[i+1] += defPt[1];
  //   }
  // }

  setupBuffers(triVertices, 3, 72);
  draw(0);

  var radius = 4;
  var z = 0;
  var defPt;

  fanVertices = [-10, 15, 0];
  for (i = 0; i <= numCircleVerts; i++) {
    angle = i * (Math.PI/2) / numCircleVerts;
    x = (radius * Math.cos(angle));
    y = (radius * Math.sin(angle));
    // defPt = deformCos(x, y, angle);
    // fanVertices.push(x-10+defPt[0]);
    // fanVertices.push(y+15+defPt[1]);
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
    // defPt = deformCos(x, y, angle);
    // fanVertices.push(x+10+defPt[0]);
    // fanVertices.push(y+15+defPt[1]);
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
    // defPt = deformCos(x, y, angle);
    // fanVertices.push(x-10+defPt[0]);
    // fanVertices.push(y-15+defPt[1]);
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
    // defPt = deformCos(x, y, angle);
    // fanVertices.push(x+10+defPt[0]);
    // fanVertices.push(y-15+defPt[1]);
    fanVertices.push(x+10);
    fanVertices.push(y-15);
    fanVertices.push(z);
  }

  setupBuffers(fanVertices, 3, numCircleVerts+2);
  draw(1);
}

// /**
//  * Populate vertex buffer with data
//   @param {number} number of vertices to use around the circle boundary
//  */
// function loadVertices(numCircleVerts) {
//   console.log("Frame",defAngle);
//   //Generate the vertex positions    
//   vertexPositionBuffer = gl.createBuffer();
//   gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    
//   // Start with vertex at the origin    
//   var triangleVertices = [0.0,0.0,0.0];

//   //Generate a triangle fan around origin
//   var radius=0.5
//   var z=0.0;    
    
//   for (i=0;i<=numCircleVerts;i++){
//       angle = i *  2*Math.PI / numCircleVerts;
//       x=(radius * Math.cos(angle));
//       y=(radius * Math.sin(angle));
//       var defPt = deformCos(x, y, angle);
//       triangleVertices.push(x+defPt[0]);
//       triangleVertices.push(y+defPt[1]);
//       triangleVertices.push(z);
//   }
    
//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
//   vertexPositionBuffer.itemSize = 3;
//   vertexPositionBuffer.numberOfItems = numCircleVerts+2;
// }

/**
 * Documentation for this function is available on the slides, dummy
 * Deforms coordinates lol
 */
function deformCos(x, y, angle) {
  var circPt = vec2.fromValues(x, y);
  var dist = 0.2*Math.cos((angle)+degToRad(defAngle));
  vec2.normalize(circPt, circPt);
  vec2.scale(circPt, circPt, dist);
  return circPt;
}
  
/**
 * Tick called for every animation frame.
 */
function tick() {
  requestAnimFrame(tick);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  animate();
}

/**
 * List of questions
 * -----------------
 * 1. How can I still keep the black background when I do multiple draw calls? see the commented line in the draw function
 * 2. I can't get my fan to show up!
 * 3. Review animation pipeline
 */