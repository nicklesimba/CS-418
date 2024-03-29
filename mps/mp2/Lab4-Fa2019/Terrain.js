/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Eric Shaffer
 */

/** Class implementing 3D terrain. */
class Terrain{   
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY){
        this.div = div;
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;
        
        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");

        this.setHeightsByPartition(300, 0.005);
        console.log("Terrain: moved triangles up and down");

        this.generateNormals();
        console.log("Terrain: Moved normal vectors")
        
        this.generateLines();
        console.log("Terrain: Generated lines");

        // for (var i = 0; i <= this.div; i++) {
        //     for (var j = 0; j <= this.div; j++) {
        //         // console.log("vertex " + (i*(this.div+1) + j) + ": ");
        //         // console.log(this.vBuffer[3*(i*(this.div+1) + j)]);
        //         // console.log(this.vBuffer[3*(i*(this.div+1) + j) + 1]);
        //         // console.log(this.vBuffer[3*(i*(this.div+1) + j) + 2]);
        //         console.log("normal " + (i*(this.div+1) + j) + ": ");
        //         console.log(this.nBuffer[3*(i*(this.div+1) + j)]);
        //         console.log(this.nBuffer[3*(i*(this.div+1) + j) + 1]);
        //         console.log(this.nBuffer[3*(i*(this.div+1) + j) + 2]);    
        //     }
        // }
        
        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }
    
    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j)
    {
        //Your code here
        var vid = 3*(i*(this.div+1) + j);
        this.vBuffer[vid] = v[0];
        this.vBuffer[vid+1] = v[1];
        this.vBuffer[vid+2] = v[2];
    }

    /**
    * Update the x,y,z coords of a normal at location(i,j)
    * @param {Object} n an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
   updateNormal(n,i,j)
   {
       //Your code here
       var vid = 3*(i*(this.div+1) + j);
       this.nBuffer[vid] += n[0];
       this.nBuffer[vid+1] += n[1];
       this.nBuffer[vid+2] += n[2];
   }
    
    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        //Your code here
        var vid = 3*(i*(this.div+1) + j);
        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid+1];
        v[2] = this.vBuffer[vid+2];
    }
    
    /**
    * Send the buffer objects to WebGL for rendering 
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");
    
        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");
    
        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");
    
        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;
        
        console.log("triangulatedPlane: loadBuffers");
    }
    
    /**
    * Render the triangles 
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }
    
    /**
    * Render the triangle edges wireframe style 
    */
    drawEdges(){
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);   
    }
/**
 * Fill the vertex and buffer arrays 
 */    
generateTriangles()
{
    //Your code here
    var deltaX = (this.maxX - this.minX)/this.div;
    var deltaY = (this.maxY - this.minY)/this.div;

    for (var i = 0; i <= this.div; i++) {
        for (var j = 0; j <= this.div; j++) {
            //vertex johns
            this.vBuffer.push(this.minX+deltaX*j);
            this.vBuffer.push(this.minY+deltaY*i);
            this.vBuffer.push(0);

            // //normal vectors are NOT all 0,0,1 for this MP!!! **T O   D O ! ! ! ! ! ! ! ! !**
            this.nBuffer.push(0);
            this.nBuffer.push(0);
            this.nBuffer.push(1);
        }
    }

    // console.log(this.vBuffer[2]);
    // this.vBuffer[2] = 1;
    // console.log(this.vBuffer[2]);
   
    for (var i = 0; i < this.div; i++) {
        for (var j = 0; j < this.div; j++) {
            var vid = i*(this.div+1) + j;
            this.fBuffer.push(vid);
            this.fBuffer.push(vid+1);
            this.fBuffer.push(vid+this.div+1);

            this.fBuffer.push(vid+1);
            this.fBuffer.push(vid+1+this.div+1);
            this.fBuffer.push(vid+this.div+1);
        }
    }

    //
    this.numVertices = this.vBuffer.length/3;
    this.numFaces = this.fBuffer.length/3;
}

/**
 * Edit the vertex and buffer arrays based on a random point - iteratively generate terrain over and over
 * 100 iterations of partitioning on a 64×64 grid of vertices spanning a unit square with delta = 0.005
 * @param {number} N the number of times to partition the terrain grad and adjust
 *                 the heights on each side
 * @param {number} delta the amount to raise (and lower) the partitioned vertices
 */    
setHeightsByPartition(N, delta) 
{
    var partitionPoint = vec3.create();
    var partitionNormTheta = 0;
    var partitionNorm = vec3.create();
    var tmp = vec3.create();

    for (var i = 0; i < N; i++) {
        partitionPoint[0] = Math.floor(Math.random() * this.div)/(this.div);
        partitionPoint[1] = Math.floor(Math.random() * this.div)/(this.div);
        partitionPoint[2] = 0;
        // console.log("point: " + partitionPoint);
        partitionNormTheta = 2.0 * Math.PI * Math.random();
        partitionNorm[0] = Math.cos(partitionNormTheta);
        partitionNorm[1] = Math.sin(partitionNormTheta);
        partitionNorm[2] = 0;
        // console.log("norm: " + partitionNorm);
        
        for (var j = 0; j <= this.div; j++) {
            for (var k = 0; k <= this.div; k++) {
                // console.log(3*j*this.div + 3*k);
                // console.log(3*j*this.div + 3*k + 1);
                // console.log(3*j*this.div + 3*k + 2);
                tmp[0] = this.vBuffer[3*(j*(this.div+1) + k)];
                tmp[1] = this.vBuffer[3*(j*(this.div+1) + k) + 1];
                tmp[2] = this.vBuffer[3*(j*(this.div+1) + k) + 2];
                // console.log("tmp orig: " + tmp);

                vec3.subtract(tmp, tmp, partitionPoint);
                // console.log("tmp new: " + tmp);

                if (vec3.dot(tmp, partitionNorm) > 0) {
                    // console.log("up we go!")
                    this.vBuffer[3*(j*(this.div+1) + k) + 2] += delta;
                }
                else if (vec3.dot(tmp, partitionNorm) < 0) {
                    // console.log("down we go!")
                    this.vBuffer[3*(j*(this.div+1) + k) + 2] -= delta;
                }
            }
        }
    }
}

/**
 * Computes normal vectors for terrain
 */ 
generateNormals() {
    var N = vec3.create();
    var tmp1 = vec3.create();
    var tmp2 = vec3.create();
    var tmp3 = vec3.create();
    var subbylad1 = vec3.create();
    var subbylad2 = vec3.create();
    // console.log("tmp1: " + tmp1);
    // console.log("tmp2: " + tmp2);

    // Calculate the johns!          THIS SHOULD BE <, not <=. DONT RANDOMLY CHANGE THIS, IDIOT.
    for (var i = 0; i < this.div; i++) {
        for (var j = 0; j < this.div; j++) {
            // First triangle in "square div"
            this.getVertex(tmp1,i,j);
            this.getVertex(tmp2,i,j+1);
            this.getVertex(tmp3,i+1,j);

            vec3.sub(subbylad1, tmp2, tmp1);
            vec3.sub(subbylad2, tmp3, tmp1);
            vec3.cross(N, subbylad1, subbylad2);
            vec3.normalize(N, N);

            this.updateNormal(N, i, j);
            this.updateNormal(N, i, j+1);
            this.updateNormal(N, i+1, j);
            
            // Second triangle in "square div"
            this.getVertex(tmp1,i,j+1);
            this.getVertex(tmp2,i+1,j+1);
            this.getVertex(tmp3,i+1,j);

            vec3.sub(subbylad1, tmp2, tmp1);
            vec3.sub(subbylad2, tmp3, tmp1);
            vec3.cross(N, subbylad1, subbylad2);
            vec3.normalize(N, N);

            this.updateNormal(N, i, j+1);
            this.updateNormal(N, i+1, j+1);
            this.updateNormal(N, i+1, j);
           
            // this.vBuffer[vid]
            // vec3.sub(tmp1, this.vBuffer[vid+1], this.vBuffer[vid]);
            // vec3.sub(tmp2, this.vBuffer[vid+this.div+1], this.vBuffer[vid]);
            // N1 = vec3.cross(tmp1, tmp2);
            
            // vec3.sub(tmp1, this.vBuffer[vid+1+this.div+1], this.vBuffer[vid+1]);
            // vec3.sub(tmp2, this.vBuffer[vid+this.div+1], this.vBuffer[vid+1]);
            // N2 = vec3.cross(tmp1, tmp2);
            
            // this.nBuffer[vid] = this.nBuffer[vid]+N1;
            // this.nBuffer[vid+1] = this.nBuffer[vid+1]+N1;
            // this.nBuffer[vid+this.div+1] = this.nBuffer[vid+this.div+1]+N1;

            // this.nBuffer[vid+1] = this.nBuffer[vid+1]+N2;
            // this.nBuffer[vid+1+this.div+1] = this.nBuffer[vid+1+this.div+1]+N2;
            // this.nBuffer[vid+this.div+1] = this.nBuffer[vid+this.div+1]+N2;
            

            /*
            this.fBuffer.push(vid);
            this.fBuffer.push(vid+1);
            this.fBuffer.push(vid+this.div+1);

            this.fBuffer.push(vid+1);
            this.fBuffer.push(vid+1+this.div+1);
            this.fBuffer.push(vid+this.div+1);
            */
        }
    }

    // Normalize the johns!
    for (var i = 0; i <= this.div; i++) {
        for (var j = 0; j <= this.div; j++) {
            var vid = i*(this.div+1) + j;

            vec3.normalize(this.nBuffer[vid], this.nBuffer[vid]);
            // console.log(vid);
            vec3.normalize(this.nBuffer[vid+1], this.nBuffer[vid+1]);
            // console.log(vid+1);
            vec3.normalize(this.nBuffer[vid+this.div+1], this.nBuffer[vid+this.div+1]);
            // console.log(vid+this.div+1);

            vec3.normalize(this.nBuffer[vid+1], this.nBuffer[vid+1]);
            // console.log(vid+1);
            vec3.normalize(this.nBuffer[vid+1+this.div+1], this.nBuffer[vid+1+this.div+1]);
            // console.log(vid+1+this.div+1);
            vec3.normalize(this.nBuffer[vid+this.div+1], this.nBuffer[vid+this.div+1]);
            // console.log(vid+this.div+1);
        }
    }
}

/**
 * Print vertices and triangles to console for debugging
 */
printBuffers()
    {
        
    for(var i=0;i<this.numVertices;i++)
          {
           console.log("v ", this.vBuffer[i*3], " ", 
                             this.vBuffer[i*3 + 1], " ",
                             this.vBuffer[i*3 + 2], " ");
                       
          }
    
      for(var i=0;i<this.numFaces;i++)
          {
           console.log("f ", this.fBuffer[i*3], " ", 
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");
                       
          }
        
    }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
generateLines()
{
    var numTris=this.fBuffer.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        this.eBuffer.push(this.fBuffer[fid]);
        this.eBuffer.push(this.fBuffer[fid+1]);
        
        this.eBuffer.push(this.fBuffer[fid+1]);
        this.eBuffer.push(this.fBuffer[fid+2]);
        
        this.eBuffer.push(this.fBuffer[fid+2]);
        this.eBuffer.push(this.fBuffer[fid]);
    }
    
}
    
}
