var controlsCanvas = null;
function learnSkin() {
    $("#map3d").hide();
    $("#learningShownHere").show();
    JSHG.learnSkinColor();

    $("#rightPanel").hide();
    // toggle start button
    var toggleBut = $("#jshgToggleBut");
    toggleBut.removeClass("button-stop");
    toggleBut.removeClass("button-start");
    toggleBut.addClass("button-stop");
    toggleBut.html("STOP JSHG");  
}

function JSHGToggle(toggleBut) {
    toggleBut.removeClass("button-stop");
    toggleBut.removeClass("button-start");
    if (JSHG.isRunning()) {
        JSHG.stop();
        toggleBut.addClass("button-start");
        toggleBut.html("START JSHG");
        $("#rightPanel").hide();
    } else {
        JSHG.run();
        toggleBut.addClass("button-stop");
        toggleBut.html("STOP JSHG");  
        $("#rightPanel").show();          
    }
}

function drawControlsCanvas(mode, handPos) {
    if (controlsCanvas == null) return;

    var w = controlsCanvas.width();
    var h = controlsCanvas.height();
    var ctx = controlsCanvas[0].getContext('2d');
    var centralRatio = JSHG.settings_["centralAreaRatio"];

    // draw white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    // draw nav keys
    ctx.fillStyle = "#A4A4A4";
    ctx.fillRect(w*centralRatio, 0, w*centralRatio, h*centralRatio); // up
    ctx.fillRect(w*centralRatio, 2*h*centralRatio, w*centralRatio, h*centralRatio); // down
    ctx.fillRect(2*w*centralRatio, h*centralRatio, w*centralRatio, h*centralRatio); // right
    ctx.fillRect(0, h*centralRatio, w*centralRatio, h*centralRatio); // left

    // draw soft center
    ctx.fillStyle = "#BFBFBF";
    ctx.fillRect(w*centralRatio, h*centralRatio, w*centralRatio, h*centralRatio);
    // annotate keys
    ctx.fillStyle = "#000000";
    ctx.font = "20px Arial";
    if (mode == 1) {
        ctx.fillText("N", 112, 40);
        ctx.fillText("S", 112, 174);
        ctx.fillText("E", 190, 110);
        ctx.fillText("W", 30, 110);
    } else if (mode == 2) {
        ctx.fillText("Zm", 25, 95);
        ctx.fillText("Out", 22, 120);
        ctx.fillText("Zm", 187, 95);
        ctx.fillText("In", 193, 120);
    }

    // draw hand pos
    ctx.fillRect(handPos[0], handPos[1], 10, 10);     
}