// "use strict";

/** @global The HTML5 canvas we draw on */
var canvas

/** @global The WebGL context */
var gl;

/** @global The camera field of view in degrees */
var FOV;

/** @global The initial time */
var initial;

/** @global The environment map program */
var envmapProgramInfo;

/** @global The skybox program */
var skyboxProgramInfo;

/** @global The cube and quad buffers */
var cubeBufferInfo;
var quadBufferInfo;

/** @global the texture used for the cubemap */
var texture;

/** @global model parameters */
var eulerY=0;

/** @global origin */
var target;

/** @global camera's position, aka eyePt */
var cameraPosition;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global An object holding the geometry for a 3D mesh */
var myMesh;

// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,0.0,2.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0,2,2];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[1,1,1];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0,1.0,1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];

//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile(url) {
  //Your code here
  console.log("Getting text file");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send();
    console.log("Made promise");
  });
}

//----------------------------------------------------------------------------------
//Code to handle user interaction
var currentlyPressedKeys = {};

function handleKeyDown(event) {
    //console.log("Key down ", event.key, " code ", event.code);
    currentlyPressedKeys[event.key] = true;
        if (currentlyPressedKeys["a"]) {
        // key A
        eulerY -= 1;
    } else if (currentlyPressedKeys["d"]) {
        // key D
        eulerY += 1;
    } 

    if (currentlyPressedKeys["ArrowLeft"]){
        // Left cursor key
        event.preventDefault();
        vec3.rotateY(cameraPosition, cameraPosition, target, 0.01);
        vec3.rotateY(lightPosition, lightPosition, target, 0.01); // i'm moving the light position because of the coordinate space it's in. this makes it "like the real world"
    } else if (currentlyPressedKeys["ArrowRight"]){
        event.preventDefault();
        // Right cursor key
        vec3.rotateY(cameraPosition, cameraPosition, target, -0.01);
        vec3.rotateY(lightPosition, lightPosition, target, -0.01);
    } 
}

function handleKeyUp(event) {
    //console.log("Key up ", event.key, " code ", event.code);
    currentlyPressedKeys[event.key] = false;
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader(type) {
    if (type == "blinn-phong") {
        gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    }
    else if (type == "reflection") {
        gl.uniformMatrix4fv(shaderProgramReflect.mvMatrixUniform, false, mvMatrix);
    }
    else if (type == "refraction") {
        gl.uniformMatrix4fv(shaderProgramRefract.mvMatrixUniform, false, mvMatrix);
    }
}
  
//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader(type) {
    if (type == "blinn-phong") {
        gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                        false, pMatrix);
    }
    else if (type == "reflection") {
        gl.uniformMatrix4fv(shaderProgramReflect.pMatrixUniform, false, pMatrix);
    }
    else if (type == "refraction") {
        gl.uniformMatrix4fv(shaderProgramRefract.pMatrixUniform, false, pMatrix);
    }
}
  
//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
*/
function uploadNormalMatrixToShader(type) {
    mat3.fromMat4(nMatrix,mvMatrix);
    mat3.transpose(nMatrix,nMatrix);
    mat3.invert(nMatrix,nMatrix);
    
    if (type == "blinn-phong") {
        gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
    }
    else if (type == "reflection") { // jk we don't care about normal matrix so let's upload texture here instead
        gl.uniformMatrix3fv(shaderProgramReflect.nMatrixUniform, false, nMatrix);
        // console.log("LOL"); // actually don't think i need to do anything, at least through the slides...
        // gl.uniformMatrix3fv(shaderProgramReflect.vMatrixUniform, false, vMatrix);
    }
    else if (type == "refraction") {
        gl.uniformMatrix3fv(shaderProgramRefract.nMatrixUniform, false, nMatrix);
    }
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
function setMatrixUniforms(type) {
    uploadModelViewMatrixToShader(type);
    uploadNormalMatrixToShader(type);
    uploadProjectionMatrixToShader(type);
}


//----------------------------------------------------------------------------------
/**
 * Translates radians to degrees
 * @param {Number} radians Radian input to function
 * @return {Number} The degrees that correspond to the radian input
 */
function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} d Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupMesh(filename, type) {
    //Your code here
    myMesh = new TriMesh();
    myPromise = asyncGetFile(filename);
    // We define what to do when the premise is resolved with the then() call,
    // and what to do when the promise is rejected with the catch() call.
    myPromise.then((retrievedText) => {
       myMesh.loadFromOBJ(retrievedText, type);
       console.log("Yay! got the file");
    })
    .catch(
       (reason) => {
           console.log("handle rejected promise (" + reason + ") here.");
       });
}

function startup() {
  // Get the context
  canvas = document.getElementById("canvas");
  gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  setupShadersPhong();
  setupShadersEnvMap();
  setupShadersRefract();

  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

  setupMesh("pot.obj", "pot.obj");

  // setup GLSL programs and lookup locations
//   envmapProgramInfo = webglUtils.createProgramInfo(
//       gl, ["envmap-vertex-shader-meme", "envmap-fragment-shader-meme"]);

//   console.log(envmapProgramInfo.program);

//   envmapProgramInfo.program.vertexPositionAttribute = gl.getAttribLocation(envmapProgramInfo.program, "a_position");
//   gl.enableVertexAttribArray(envmapProgramInfo.program.vertexPositionAttribute);

//   envmapProgramInfo.program.vertexNormalAttribute = gl.getAttribLocation(envmapProgramInfo.program, "a_normal");
//   gl.enableVertexAttribArray(envmapProgramInfo.program.vertexNormalAttribute);

//   envmapProgramInfo.program.mvMatrixUniform = gl.getUniformLocation(envmapProgramInfo.program, "u_world");
//   envmapProgramInfo.program.pMatrixUniform = gl.getUniformLocation(envmapProgramInfo.program, "u_projection");
//   envmapProgramInfo.program.vMatrixUniform = gl.getUniformLocation(envmapProgramInfo.program, "u_view")
//   envmapProgramInfo.program.nMatrixUniform = gl.getUniformLocation(envmapProgramInfo.program, "u_world");

//   console.log(envmapProgramInfo.program);

  skyboxProgramInfo = webglUtils.createProgramInfo(
      gl, ["skybox-vertex-shader", "skybox-fragment-shader"]);
//   envmapProgram = webglUtils.createProgramFromScripts(
//         gl, ["envmap-vertex-shader", "envmap-fragment-shader"]);
//   skyboxProgram = webglUtils.createProgramFromScripts(
//         gl, ["skybox-vertex-shader", "skybox-fragment-shader"]);

  // Make and fill buffers with vertex info
//   cubeBufferInfo = primitives.createCubeBufferInfo(gl, 1);
  cubeBufferInfo = primitives.createCubeBufferInfo(gl, 3);
  quadBufferInfo = primitives.createXYQuadBufferInfo(gl);

  // Create a texture.
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: 'London/pos-x.png',
      // url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/pos-x.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: 'London/neg-x.png',
      // url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/neg-x.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: 'London/pos-y.png',
      // url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/pos-y.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: 'London/neg-y.png',
      // url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/neg-y.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: 'London/pos-z.png',
      // url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/pos-z.jpg',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: 'London/neg-z.png',
      // url: 'https://webglfundamentals.org/webgl/resources/images/computer-history-museum/neg-z.jpg',
    },
  ];
  faceInfos.forEach((faceInfo) => {
    const {target, url} = faceInfo;

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 512;
    const height = 512;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup all the faces
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Async load
    const image = new Image();
    image.src = url;
    image.addEventListener('load', function() {
      // Now that the image has loaded make copy it to the texture.
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  FOV = degToRad(65);
  var cameraYRotationRadians = degToRad(0);

  cameraPosition = [Math.cos(0 * .1) * 2, 0, Math.sin(0 * .1) * 2];

  var spinCamera = true;
  // Get the starting time.
  initial = 0;

  requestAnimationFrame(draw);

}

// Draw the scene.
function draw(time) {
    // convert to seconds
    time *= 0.001;
    // Subtract the previous time from the current time
    var deltaTime = time - initial;
    // Remember the current time for the next frame.
    initial = time;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Clear the canvas AND the depth buffer.
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Compute the projection matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix =
        m4.perspective(FOV, aspect, 1, 2000);

    // camera going in circle 2 units from origin looking at origin
    // var cameraPosition = [Math.cos(time * .1) * 2, 0, Math.sin(time * .1) * 2];
    target = [0, 0, 0];
    var up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    var cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);

    // Rotate the cube around the x axis
    // var worldMatrix = m4.xRotation(time * 0.11);

    // We only care about direciton so remove the translation
    var viewDirectionMatrix = m4.copy(viewMatrix);
    viewDirectionMatrix[12] = 0;
    viewDirectionMatrix[13] = 0;
    viewDirectionMatrix[14] = 0;

    var viewDirectionProjectionMatrix = m4.multiply(
        projectionMatrix, viewDirectionMatrix);
    var viewDirectionProjectionInverseMatrix =
        m4.inverse(viewDirectionProjectionMatrix);


    //Draw Mesh - first start with using phong shading for simplicity.
    //ADD an if statement to prevent early drawing of myMesh
    if (myMesh.loaded() == true) {
        if (document.getElementById("blinn-phong").checked) {
            gl.useProgram(shaderProgram);
            mvPushMatrix();
            mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));
            mat4.multiply(mvMatrix,vMatrix,mvMatrix);
            setMatrixUniforms("blinn-phong");
            setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
        
            // if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
            // {
                setMaterialUniforms(shininess,kAmbient,
                                    kTerrainDiffuse,kSpecular); 
                myMesh.drawTriangles();
            // }
        
            // if(document.getElementById("wirepoly").checked)
            // {   
            //     setMaterialUniforms(shininess,kAmbient,
            //                         kEdgeBlack,kSpecular);
            //     myMesh.drawEdges();
            // }   

            // if(document.getElementById("wireframe").checked)
            // {
            //     setMaterialUniforms(shininess,kAmbient,
            //                         kEdgeWhite,kSpecular);
            //     myMesh.drawEdges();
            // }   
            mvPopMatrix();
        }
        else if (document.getElementById("reflection").checked) { // TO DO: make your own envmap shader program like with the blinn phong, apply it.
            gl.useProgram(shaderProgramReflect);
            mvPushMatrix();
            mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));
            mat4.multiply(mvMatrix,vMatrix,mvMatrix);
            setMatrixUniforms("reflection");
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

            // setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
        
            // if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
            // {
                // setMaterialUniforms(shininess,kAmbient,
                //                     kTerrainDiffuse,kSpecular); 
                myMesh.drawTriangles();
            // }
            mvPopMatrix();

            // gl.useProgram(envmapProgramInfo.program);
            // webglUtils.createBufferInfoFromArrays
            // webglUtils.setBuffersAndAttributes(gl, envmapProgramInfo, cubeBufferInfo);
            // webglUtils.setUniforms(envmapProgramInfo, {
            //   u_world: worldMatrix,
            //   u_view: viewMatrix,
            //   u_projection: projectionMatrix,
            //   u_texture: texture,
            //   u_worldCameraPosition: cameraPosition,
            // });
            // webglUtils.drawBufferInfo(gl, cubeBufferInfo);
        }
        else if (document.getElementById("refraction").checked) { // TO DO: make your own envmap shader program like with the blinn phong, apply it.
          gl.useProgram(shaderProgramRefract);
          mvPushMatrix();
          mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));
          mat4.multiply(mvMatrix,vMatrix,mvMatrix);
          setMatrixUniforms("refraction");
          gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

          // setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
      
          // if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
          // {
              // setMaterialUniforms(shininess,kAmbient,
              //                     kTerrainDiffuse,kSpecular); 
              myMesh.drawTriangles();
          // }
          mvPopMatrix();

          // gl.useProgram(envmapProgramInfo.program);
          // webglUtils.createBufferInfoFromArrays
          // webglUtils.setBuffersAndAttributes(gl, envmapProgramInfo, cubeBufferInfo);
          // webglUtils.setUniforms(envmapProgramInfo, {
          //   u_world: worldMatrix,
          //   u_view: viewMatrix,
          //   u_projection: projectionMatrix,
          //   u_texture: texture,
          //   u_worldCameraPosition: cameraPosition,
          // });
          // webglUtils.drawBufferInfo(gl, cubeBufferInfo);
        }
    }

    // Draw the cube
    // gl.useProgram(envmapProgramInfo.program);
    // webglUtils.setBuffersAndAttributes(gl, envmapProgramInfo, cubeBufferInfo);
    // webglUtils.setUniforms(envmapProgramInfo, {
    //   u_world: worldMatrix,
    //   u_view: viewMatrix,
    //   u_projection: projectionMatrix,
    //   u_texture: texture,
    //   u_worldCameraPosition: cameraPosition,
    // });
    // webglUtils.drawBufferInfo(gl, cubeBufferInfo);


    // Draw the skybox
    gl.useProgram(skyboxProgramInfo.program);
    webglUtils.setBuffersAndAttributes(gl, skyboxProgramInfo, quadBufferInfo);
    webglUtils.setUniforms(skyboxProgramInfo, {
      u_viewDirectionProjectionInverse: viewDirectionProjectionInverseMatrix,
      u_skybox: texture,
    });
    webglUtils.drawBufferInfo(gl, quadBufferInfo);

    // Operation skybox cube
    // gl.useProgram(skyboxProgramInfo.program);
    // webglUtils.setBuffersAndAttributes(gl, skyboxProgramInfo, cubeBufferInfo);
    // webglUtils.setUniforms(skyboxProgramInfo, {
    //   u_world: worldMatrix,
    //   u_view: viewMatrix,
    //   u_projection: projectionMatrix,
    //   u_texture: texture,
    //   u_worldCameraPosition: cameraPosition,
    // });
    // webglUtils.drawBufferInfo(gl, cubeBufferInfo);

    requestAnimationFrame(draw);
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders **for the phong shading model specifically!**
 */
function setupShadersPhong() {
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
    shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");  
    shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
    shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders **for the environment map specifically!**
 */
function setupShadersEnvMap() {
    vertexShader = loadShaderFromDOM("envmap-vertex-shader");
    fragmentShader = loadShaderFromDOM("envmap-fragment-shader");

    shaderProgramReflect = gl.createProgram();
    gl.attachShader(shaderProgramReflect, vertexShader);
    gl.attachShader(shaderProgramReflect, fragmentShader);
    gl.linkProgram(shaderProgramReflect);

    if (!gl.getProgramParameter(shaderProgramReflect, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }
    
    gl.useProgram(shaderProgramReflect);

    shaderProgramReflect.vertexPositionAttribute = gl.getAttribLocation(shaderProgramReflect, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgramReflect.vertexPositionAttribute);
  
    shaderProgramReflect.vertexNormalAttribute = gl.getAttribLocation(shaderProgramReflect, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgramReflect.vertexNormalAttribute);

    shaderProgramReflect.mvMatrixUniform = gl.getUniformLocation(shaderProgramReflect, "uMVMatrix");
    shaderProgramReflect.pMatrixUniform = gl.getUniformLocation(shaderProgramReflect, "uPMatrix");
    shaderProgramReflect.nMatrixUniform = gl.getUniformLocation(shaderProgramReflect, "uNMatrix");
    shaderProgramReflect.uTextureUniform = gl.getUniformLocation(shaderProgramReflect, "uTexture");
    // shaderProgramReflect.vMatrixUniform = gl.getUniformLocation(shaderProgramReflect, "uVMatrix");
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders **for the environment map specifically!**
 */
function setupShadersRefract() {
  vertexShader = loadShaderFromDOM("envmap-vertex-shader-refract");
  fragmentShader = loadShaderFromDOM("envmap-fragment-shader-refract");

  shaderProgramRefract = gl.createProgram();
  gl.attachShader(shaderProgramRefract, vertexShader);
  gl.attachShader(shaderProgramRefract, fragmentShader);
  gl.linkProgram(shaderProgramRefract);

  if (!gl.getProgramParameter(shaderProgramRefract, gl.LINK_STATUS)) {
      alert("Failed to setup shaders");
  }
  
  gl.useProgram(shaderProgramRefract);

  shaderProgramRefract.vertexPositionAttribute = gl.getAttribLocation(shaderProgramRefract, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgramRefract.vertexPositionAttribute);

  shaderProgramRefract.vertexNormalAttribute = gl.getAttribLocation(shaderProgramRefract, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgramRefract.vertexNormalAttribute);

  shaderProgramRefract.mvMatrixUniform = gl.getUniformLocation(shaderProgramRefract, "uMVMatrix");
  shaderProgramRefract.pMatrixUniform = gl.getUniformLocation(shaderProgramRefract, "uPMatrix");
  shaderProgramRefract.nMatrixUniform = gl.getUniformLocation(shaderProgramRefract, "uNMatrix");
  shaderProgramRefract.uTextureUniform = gl.getUniformLocation(shaderProgramRefract, "uTexture");
  // shaderProgramReflect.vMatrixUniform = gl.getUniformLocation(shaderProgramReflect, "uVMatrix");
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