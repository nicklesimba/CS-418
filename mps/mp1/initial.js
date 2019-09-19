var anim_value;

/**
 * Startup function called from html code to start program.
 */
function startmeme() {
    
    
    if (document.getElementById('Illini').checked) {
        anim_value = document.getElementById('Illini').value;
    }

    else if (document.getElementById('Custom').checked) {
        anim_value = document.getElementById('Custom').value;
    }

    if (anim_value == "Illini") {
        startup();
    }

    else if (anim_value == "Penis") {
        shart();
    }

    console.log(anim_value);

}

function shart() {
    console.log("penis");
    console.log("No bugs so far...");
    // canvas = document.getElementById("myGLCanvas");
    // gl = createGLContext(canvas);
    // gl.enable(gl.DEPTH_TEST);
    // gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    mode = 1;

    // while (anim_value != "Illini") {
    //     if (document.getElementById('Illini').checked) {
    //         anim_value = document.getElementById('Illini').value;
    //     }
    
    //     else if (document.getElementById('Custom').checked) {
    //         anim_value = document.getElementById('Custom').value;
    //     }
    // }
    // startup();

}

