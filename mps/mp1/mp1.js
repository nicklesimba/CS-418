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
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert("Failed to setup shaders");
    }

    gl.useProgram(shaderProgram);
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor"); 
}

/**
 * Populate buffers with data - im going to mess with this to try and draw a second triangle!
 */
function setupBuffers(triVertices, itemSize, numItems) {
    vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    var triangleVertices = triVertices; /*[
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
          
          // -16,  15,  0.0, // blue border
          // -20,  15,  0.0,
          // -20,  35,  0.0,
          // -16,  15,  0.0,
          // -20,  35,  0.0,
          // -16,  35,  0.0,
          // -16,  35,  0.0,
          // -16,  31,  0.0,
          //  16,  35,  0.0,
          // -16,  31,  0.0,
          //  16,  35,  0.0, 
          //  15,  31,  0.0,
          //  16,  35,  0.0,
          //  20,  35,  0.0,
          //  20,  15,  0.0,
          //  20,  15,  0.0,
          //  16,  35,  0.0,
          //  16,  15,  0.0,
    ];*/
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW); // static draw probably isn't great for animated shits!
    vertexPositionBuffer.itemSize = 3;
    vertexPositionBuffer.numberOfItems = 18;
      
    // vertexColorBuffer = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    // var colors = [
    //     0.909, 0.290, 0.152, 1.0, // orange
    //     0.909, 0.290, 0.152, 1.0,
    //     0.909, 0.290, 0.152, 1.0,
    //     0.909, 0.290, 0.152, 1.0,
    //     0.909, 0.290, 0.152, 1.0,
    //     0.909, 0.290, 0.152, 1.0,
    //     // 0.074, 0.160, 0.294, 1.0, // blue
    //     // 0.074, 0.160, 0.294, 1.0,
    //     // 0.074, 0.160, 0.294, 1.0,
    //     // 0.074, 0.160, 0.294, 1.0,
    //     // 0.074, 0.160, 0.294, 1.0,
    //     // 0.074, 0.160, 0.294, 1.0,
    //   ];
    // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW); // static draw probably isn't great for animated shits!
    // vertexColorBuffer.itemSize = 4;
    // vertexColorBuffer.numItems = 6;  
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    //gl.clear(gl.COLOR_BUFFER_BIT);
  
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                           vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  
    // gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                              4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute)
                            
    gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Startup function called from html code to start program.
 */
function startup() {
    console.log("No bugs so far...");
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    setupShaders(); 

    var pMatrix = mat4.create();
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
    draw();  

    //change color to blue and setup buffer for blue border!
    // 0.074, 0.160, 0.294, 1.0
    gl.uniform4fv( vColor, new Float32Array([0.074, 0.160, 0.294, 1.0]) );
    triVertices = [
      -16,  15,  0.0, // blue border
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
    ];
    setupBuffers(triVertices, 3, 18);
    draw();

    startVertex = [0, 0, 0];
    var radius = 4;
    var z = 0;
    numVertices = 10;

    fanVertices = [-10, 15, 0];
    for (i = 0; i <= numVertices; i++) {
      angle = i * (Math.PI/4) / numVertices;
      x = (radius * Math.cos(angle));
      y = (radius * Math.sin(angle));
      fanVertices.push(x-10);
      fanVertices.push(y+15);
      fanVertices.push(z);
      console.log(fanVertices);
    }
    fanVertices

    setupBuffers(triVertices, 3, 10);
    draw();
}
  

/**
 * List of questions
 * -----------------
 * 1. How can I still keep the black background when I do multiple draw calls? see the commented line in the draw function
 * 2. I can't get my fan to show up!
 * 3. Review animation pipeline
 */