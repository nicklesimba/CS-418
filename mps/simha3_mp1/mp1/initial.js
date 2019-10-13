var anim_value;

/**
 * Startup function called from html code to start program. This runs before even startup(), and just gets the anim_value!
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

    console.log(anim_value);

}
