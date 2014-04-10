var JSHG = {};

/* ------- SETTINGS ------- */
JSHG.SETTINGS = {};
JSHG.SETTINGS["WEBCAM_ID"] = "jshgWebcam";
JSHG.SETTINGS["VIDEO_CANVAS_ID"] = "jshgVideoCanvas";
JSHG.SETTINGS["GESTURE_CANVAS_ID"] = "jshgGestureCanvas";
JSHG.SETTINGS["LEARNING_MESSAGE_ID"] = "jshgLearningMessage";
JSHG.SETTINGS["DEBUG_MESSAGE_ID"] = "jshgDebugMessage";
JSHG.SETTINGS["VIDEO_WIDTH"] = 500;
JSHG.SETTINGS["VIDEO_HEIGHT"] = 400;
JSHG.SETTINGS["GESTURE_WIDTH"] = 125;
JSHG.SETTINGS["GESTURE_HEIGHT"] = 100;
JSHG.SETTINGS["ACTION_RATE"] = 10; // per second, -1 means calling when the frame is process
JSHG.SETTINGS["LEARNING_COUNT_DOWN"] = 5; // seconds
JSHG.SETTINGS["CENTRAL_AREA_RATIO"] = 1/3;
JSHG.SETTINGS["LEARNING_POINTS"] = null;
JSHG.SETTINGS["LEARNING_COLOR_HSV"] = [[340, 0.07,0.45]];

JSHG.SETTINGS["COLOR_LEARNING_POINTS"] = "yellow";
JSHG.SETTINGS["COLOR_BOUNDING_LINES"] = "red";
JSHG.SETTINGS["COLOR_HAND_POS"] = "red";
JSHG.SETTINGS["COLOR_FINGRE_POS"] = "red";

/* ------- CONSTANTS ------- */
JSHG.WORKER_INIT_REQUEST = "initRequest";
JSHG.WORKER_LEARN_REQUEST = "learningRequest";
JSHG.WORKER_DETECT_REQUEST = "detectRequest";
JSHG.FRAME_BUFFER_SIZE = 1;
JSHG.ACTIONS_BUFFER_SIZE = 3;

/* ------- GLOBAL VARIABLES ------- */
// dom comp
JSHG.video = null;
JSHG.videoCanvas = null;
JSHG.videoCanvasctx = null;
JSHG.gestureCanvas = null;
JSHG.gestureCanvasctx = null;
JSHG.learningMessage = null;
JSHG.debugMessage = null;

// worker
JSHG.grWorker = new Worker('../jshg/gestureRecognizer.js');

// config
JSHG.learningArea = null;
JSHG.gestureArea = null;
JSHG.actionCallBack = null;

// ids
JSHG.reqFrameReaderId = 0;
JSHG.actionIntervalId = 0;
JSHG.countDownId = 0;

// buffer
JSHG.gestures = [];

// state
JSHG.isRunning = false;
JSHG.debugMode = false;
JSHG.isLearning = false;
JSHG.isWorkerBusy = false;
JSHG.learningCountDown = JSHG.LEARNING_COUNT_DOWN;
JSHG.lastGesture = null;
JSHG.handInfo = null;


/* ------- PRIVATE STRUCTURE ------ */
JSHG.HandGesture = function() {
    function HandGesture() {
        this.isLeft = false;
        this.isRight = false;
        this.isUp = false;
        this.isDown = false;
        this.nFingers = 0;
    }

    HandGesture.prototype = {
        "isSamePos" : function(obj) {
            // make sure the same type
            if (!(obj instanceof HandGesture)) {
                return false;
            }
            if (obj.isLeft == this.isLeft && 
                obj.isRight == this.isRight && 
                obj.isUp == this.isUp && 
                obj.isDown == this.isDown) {
                return true;
            }

            return false;
        },
        "equals" : function(obj) {
            // make sure the same type
            if (!(obj instanceof HandGesture)) {
                return false;
            }
            
            if (this.isSamePos(obj) && this.nFingers == obj.nFingers) {
                return true;
            }

            return false;
        }
    }
    return HandGesture;
}();


/* ------- PRIVATE FUNCTION ------- */
JSHG.initLearningPoints_ = function() {
    if (JSHG.SETTINGS["LEARNING_POINTS"] == null) {
        var centralX = JSHG.SETTINGS["VIDEO_WIDTH"]/2;
        var centralY = JSHG.SETTINGS["VIDEO_HEIGHT"]/2;
        var radius = JSHG.SETTINGS["VIDEO_WIDTH"]/4;
        if (radius > 60) radius = 60;
        JSHG.SETTINGS["LEARNING_POINTS"] = [
            [centralX, centralY - radius],
            [centralX - radius, centralY], [centralX, centralY], [centralX + radius, centralY],
            [centralX, centralY + radius]
        ];
    }
}

JSHG.init_ = function() {
    JSHG.video = $('<video/>',{'id':JSHG.SETTINGS["WEBCAM_ID"]}).attr({'width':JSHG.SETTINGS["VIDEO_WIDTH"],'height':JSHG.SETTINGS["VIDEO_HEIGHT"]});
    JSHG.videoCanvas = $('<canvas/>',{'id':JSHG.SETTINGS["VIDEO_CANVAS_ID"]}).attr({'width':JSHG.SETTINGS["VIDEO_WIDTH"],'height':JSHG.SETTINGS["VIDEO_HEIGHT"]});
    JSHG.gestureCanvas = $('<canvas/>',{'id':JSHG.SETTINGS["GESTURE_CANVAS_ID"]}).attr({'width':JSHG.SETTINGS["GESTURE_WIDTH"],'height':JSHG.SETTINGS["GESTURE_HEIGHT"]});
    JSHG.learningMessage = $('<p/>',{'id':JSHG.SETTINGS["LEARNING_MESSAGE_ID"]});

    JSHG.initLearningPoints_();
    try{
        compatibility.getUserMedia({video: true}, function(stream) {
            try {
                JSHG.video.attr("src", compatibility.URL.createObjectURL(stream));
            } catch (error) {
                JSHG.video.attr("src", stream);
            }
            setTimeout(function() {
                JSHG.video[0].play();
                JSHG.videoCanvasctx = JSHG.videoCanvas[0].getContext('2d');
                JSHG.gestureCanvasctx = JSHG.gestureCanvas[0].getContext('2d');

                JSHG.reqFrameReaderId = compatibility.requestAnimationFrame(JSHG.frameReader_);
                if (JSHG.SETTINGS["ACTION_RATE"] > 0) {
                    JSHG.actionIntervalId = setInterval(JSHG.actionScheduler_, 1000/JSHG.SETTINGS["ACTION_RATE"]);
                }

                JSHG.showGestureCanvas_ ();
                JSHG.postWorkerDetect_(null);
            }, 500);
        }, function (error) {
            // WebRTC not available.
        });
    } catch (error) {
        // something goes wrong...
    }
}

JSHG.showLearningCanvas_ = function() {
    // hide gesture
    JSHG.hideGestureCanvas_();

    JSHG.learningArea.append(JSHG.videoCanvas);
    JSHG.learningArea.append(JSHG.learningMessage);
}
JSHG.hideLearningCanvas_ = function() {
    JSHG.showGestureCanvas_();

    JSHG.videoCanvas.remove();
    JSHG.learningMessage.remove();
}
JSHG.showGestureCanvas_ = function() {
    if (JSHG.gestureArea == null) return;
    JSHG.gestureArea.append(JSHG.gestureCanvas);
}
JSHG.hideGestureCanvas_ = function() {
    if (JSHG.gestureArea == null) return;
    JSHG.gestureCanvas.remove();  
}


JSHG.learning_ = function() {
    JSHG.isLearning = true;
    JSHG.learningCountDown = JSHG.SETTINGS["LEARNING_COUNT_DOWN"];
    clearTimeout(JSHG.countDownId);

    JSHG.showLearningCanvas_();

    function countDown() {
        JSHG.learningCountDown -= 1;
        if (JSHG.learningCountDown > 0) {
            JSHG.learningMessage.html("Learning Process is running. Please place your palm over the red area. Time left: " + JSHG.learningCountDown);
            JSHG.countDownId = setTimeout(countDown, 1000);
        } else {
            JSHG.countDownId = 0;
            JSHG.learningMessage.html("Please wait ...");
        }
    }
    JSHG.countDownId = setTimeout(countDown, 1000);
}

JSHG.drawHandInfo_ = function() {
    if (JSHG.gestureArea == null) return;

    var w = JSHG.SETTINGS["GESTURE_WIDTH"];
    var h = JSHG.SETTINGS["GESTURE_HEIGHT"];
    var ratioW = w/JSHG.SETTINGS["VIDEO_WIDTH"];
    var ratioH = h/JSHG.SETTINGS["VIDEO_HEIGHT"];
    var centralAreaWidth = w * JSHG.SETTINGS["CENTRAL_AREA_RATIO"];
    var centralAreaHeight = h * JSHG.SETTINGS["CENTRAL_AREA_RATIO"];

    // draw threshold
    if (JSHG.handInfo != null && JSHG.handInfo.threshImage != null) {
        var canvasImage= JSHG.gestureCanvasctx.createImageData(JSHG.gestureCanvas[0].width, JSHG.gestureCanvas[0].height);
        var totalSize = JSHG.handInfo.threshImage.length; // pixel
        var ind = 0;
        for (var pixel = 0; pixel < totalSize; pixel++) {
            canvasImage.data[ind] = canvasImage.data[ind + 1] = canvasImage.data[ind + 2] = JSHG.handInfo.threshImage[pixel];
            canvasImage.data[ind + 3] = 155;
            ind += 4;
        }
        JSHG.gestureCanvasctx.putImageData(canvasImage, 0, 0);
    } else {
        JSHG.gestureCanvasctx.drawImage(JSHG.videoCanvas[0], 0, 0, w, h);
    }
    

    // draw dash line
    JSHG.gestureCanvasctx.strokeStyle = JSHG.SETTINGS["COLOR_BOUNDING_LINES"];
    JSHG.gestureCanvasctx.beginPath();
    JSHG.gestureCanvasctx.setLineDash([1]);
    JSHG.gestureCanvasctx.rect((w - centralAreaWidth)/2, 0, centralAreaWidth, h);
    JSHG.gestureCanvasctx.rect(0, (h - centralAreaHeight)/2, w, centralAreaHeight);
    JSHG.gestureCanvasctx.stroke();

    // draw hand pos
    if (JSHG.handInfo != null) {
        if (JSHG.handInfo.handPos[0] > -1) {
            JSHG.gestureCanvasctx.fillStyle = JSHG.SETTINGS["COLOR_HAND_POS"];
            var x = JSHG.handInfo.handPos[0] * ratioW;
            var y = JSHG.handInfo.handPos[1] * ratioH;
            JSHG.gestureCanvasctx.fillRect(x, y, 20*ratioW, 20*ratioH);
        }
        if (JSHG.handInfo.nFingers > 0) {
            for (var i = 0; i < JSHG.handInfo.fingers.length; i++) {
                JSHG.gestureCanvasctx.fillStyle = JSHG.SETTINGS["COLOR_FINGRE_POS"];
                var x = JSHG.handInfo.fingers[i][0] * ratioW;
                var y = JSHG.handInfo.fingers[i][1] * ratioW;                
                JSHG.gestureCanvasctx.fillRect(x, y, 10*ratioW, 10*ratioH);                
            }
        }
    }
}

JSHG.drawLearningPoints_ = function() {
    JSHG.videoCanvasctx.strokeStyle = JSHG.SETTINGS["COLOR_LEARNING_POINTS"];
    for (var i = 0; i < JSHG.SETTINGS["LEARNING_POINTS"].length; ++i) {
        JSHG.videoCanvasctx.beginPath();
        JSHG.videoCanvasctx.arc(JSHG.SETTINGS["LEARNING_POINTS"][i][0], JSHG.SETTINGS["LEARNING_POINTS"][i][1], 2, 0, 2*Math.PI);
        JSHG.videoCanvasctx.stroke();
    }
}

JSHG.drawDebugCanvas_ = function() {
    if (JSHG.debugArea == null || JSHG.handInfo == null) return;

}

JSHG.postWorkerInit_ = function(config) {
    JSHG.grWorker.postMessage({
        "type":JSHG.WORKER_INIT_REQUEST, 
        "config":config
    });
    JSHG.isWorkerBusy = true;    
}

JSHG.postWorkerLearning_ = function(frame) {
    JSHG.grWorker.postMessage({
        "type":JSHG.WORKER_LEARN_REQUEST, 
        "learningPoints":JSHG.SETTINGS["LEARNING_POINTS"], 
        "frame":frame
    });
    JSHG.isWorkerBusy = true;
}

JSHG.postWorkerDetect_ = function(frame) {
    JSHG.grWorker.postMessage({
        "type":JSHG.WORKER_DETECT_REQUEST, 
        "frame":frame
    });
    JSHG.isWorkerBusy = true;
}

JSHG.frameReader_ = function() {
    if (JSHG.video == null || JSHG.video[0].paused) return;

    if (JSHG.video[0].readyState === JSHG.video[0].HAVE_ENOUGH_DATA) {
        try {
            JSHG.videoCanvasctx.drawImage(JSHG.video[0], 0, 0, JSHG.SETTINGS["VIDEO_WIDTH"], JSHG.SETTINGS["VIDEO_HEIGHT"]);
            var frame = JSHG.videoCanvasctx.getImageData(0, 0, JSHG.SETTINGS["VIDEO_WIDTH"], JSHG.SETTINGS["VIDEO_HEIGHT"]);

            if (!JSHG.isLearning) { // not learning mode
                // skip frame if the worker is busy
                if (!JSHG.isWorkerBusy) {
                    JSHG.postWorkerDetect_(frame);
                }
            } else { // learning mode
                if (JSHG.learningCountDown == 0) {
                    JSHG.postWorkerLearning_(frame);
                    JSHG.learningCountDown = JSHG.SETTINGS["LEARNING_COUNT_DOWN"];
                }
                JSHG.drawLearningPoints_();
            }
        } catch (e) {
            if (e.name == "NS_ERROR_NOT_AVAILABLE") {
                // a bug in firefox for hgCtx.drawImage(video)  
            } else {
                console.log("Error: " + e);
            }
        }
    }
    
    JSHG.reqFrameReaderId = compatibility.requestAnimationFrame(JSHG.frameReader_);
}

// receive the gesture
JSHG.grWorker.addEventListener('message', function(e) {
    var receivedData = e.data;
    if (JSHG.video == null || JSHG.video[0].paused) return;
    if (JSHG.isLearning && receivedData.type != JSHG.WORKER_LEARN_REQUEST) return;

    // the response confirming the worker get the learning frame
    if (receivedData.type == JSHG.WORKER_CONFIG_REQUEST) {
        // finish config
    } else if (receivedData.type == JSHG.WORKER_LEARN_REQUEST) {
        JSHG.SETTINGS["LEARNING_COLOR_HSV"] = receivedData.response;
        JSHG.isLearning = false;
        JSHG.learningMessage.html("");
        JSHG.hideLearningCanvas_();
        JSHG.showGestureCanvas_ ();
    } else if (receivedData.type == JSHG.WORKER_DETECT_REQUEST) {
        // save state
        JSHG.handInfo = receivedData.response;
        JSHG.generateGesture_();

        if (JSHG.SETTINGS["ACTION_RATE"] <= 0) {
            JSHG.actionScheduler_();
        }

        JSHG.drawHandInfo_();
    }
    JSHG.isWorkerBusy = false;
}, false);

JSHG.generateGesture_ = function() {
    var handInfo = JSHG.handInfo;
    
    var gesture = new JSHG.HandGesture(); 
    var w = JSHG.SETTINGS["VIDEO_WIDTH"], h = JSHG.SETTINGS["VIDEO_HEIGHT"];
    var centralAreaWidth = JSHG.SETTINGS["VIDEO_WIDTH"] * JSHG.SETTINGS["CENTRAL_AREA_RATIO"];
    var centralAreaHeight = JSHG.SETTINGS["VIDEO_HEIGHT"] * JSHG.SETTINGS["CENTRAL_AREA_RATIO"];

    // LEFT - RIGHT
    if (handInfo.handPos[0] < (w - centralAreaWidth)/2) {
        gesture.isLeft =  true;
    } else if (handInfo.handPos[0] > (w + centralAreaWidth)/2) {
        gesture.isRight =  true;
    }

    // TOP - DOWN
    if (handInfo.handPos[1] < (h - centralAreaHeight)/2) {
        gesture.isUp =  true;
    } else if (handInfo.handPos[1] > (h + centralAreaHeight)/2) {
        gesture.isDown =  true;        
    }

    gesture.nFingers = handInfo.nFingers;       

    JSHG.gestures.push(gesture);
    if (JSHG.gestures.length > JSHG.ACTIONS_BUFFER_SIZE)
        JSHG.gestures.shift();
}

JSHG.actionScheduler_ = function() {
    if (JSHG.gestures.length > 0) {
        JSHG.lastGesture = JSHG.gestures.shift();
    }

    if (JSHG.lastGesture != null) {
        JSHG.actionCallBack(JSHG.lastGesture);
    }
}


/* ------- PUBLIC API ------- */
JSHG.config = function(data) {
    // callback, learnDivId, gestureDivId, debugDivId, settings, workerConfig
    if (!("callback" in data) || !("learnDivId" in data))
        throw "callback && learnDivId is required!";

    var workerInit = {"debugMode": false, "responseScale": [1, 1], "learnedHSV": null, "configs": null};

    JSHG.actionCallBack = data["callback"];
    JSHG.learningArea = $("#" + data["learnDivId"]);
    if ("settings" in data) {
        for (var prop in data["settings"]) {
            if (prop in JSHG.SETTINGS) {
                JSHG.SETTINGS[prop] = data["settings"][prop];
            }
        }
    }
    workerInit["responseScale"][0] = JSHG.SETTINGS["GESTURE_WIDTH"]/JSHG.SETTINGS["VIDEO_WIDTH"];
    workerInit["responseScale"][1] = JSHG.SETTINGS["GESTURE_HEIGHT"]/JSHG.SETTINGS["VIDEO_HEIGHT"];
    workerInit["learnedHSV"] = JSHG.SETTINGS["LEARNING_COLOR_HSV"];

    // optional
    if ("gestureDivId" in data) {
        JSHG.gestureArea = $("#" + data["gestureDivId"]);
    }
    if ("workerConfig" in data) {
        workerInit["config"] = data["workerConfig"];
    }
    if ("debugMode" in data) {
        workerInit.debugMode = data["debugMode"];
    }
    JSHG.postWorkerInit_(workerInit);
};

JSHG.start = function() {
    if (JSHG.actionCallBack == null)
        throw "JSHG must be configured first!";

    if (JSHG.video == null) {
        JSHG.init_();
    } else {
        JSHG.video[0].play();
        JSHG.reqFrameReaderId  = compatibility.requestAnimationFrame(JSHG.frameReader_);
        if (JSHG.SETTINGS["ACTION_RATE"] > 0) {
            JSHG.actionIntervalId = setInterval(JSHG.actionScheduler_, 1000/JSHG.SETTINGS["ACTION_RATE"]);
        }
        JSHG.showGestureCanvas_ ();
        JSHG.postWorkerDetect_(null);
    }

    JSHG.isRunning = true;
}

JSHG.stop = function() {
    if (JSHG.video == null || JSHG.video[0].paused) return;
    JSHG.hideLearningCanvas_();
    JSHG.hideGestureCanvas_();
    JSHG.video[0].pause();
    compatibility.cancelAnimationFrame(JSHG.reqFrameReaderId);
    if (JSHG.SETTINGS["ACTION_RATE"] > 0) {
        clearInterval(JSHG.actionIntervalId);
    }
    clearTimeout(JSHG.countDownId);

    JSHG.frames = [];
    JSHG.gestures = [];
    JSHG.lastGesture = null;
    JSHG.handInfo = null;
    JSHG.isRunning = false;
}

JSHG.learning = function() {
    JSHG.stop();
    JSHG.start();
    JSHG.learning_();
}

JSHG.isRunning = function() {
    return JSHG.isRunning;
}