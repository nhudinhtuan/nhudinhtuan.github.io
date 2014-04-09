var JSHG = {};

/* ------- SETTINGS ------- */
JSHG.SETTINGS = {};
JSHG.SETTINGS["WEBCAM_ID"] = "jshgWebcam";
JSHG.SETTINGS["VIDEO_CANVAS_ID"] = "jshgVideoCanvas";
JSHG.SETTINGS["GESTURE_CANVAS_ID"] = "jshgGestureCanvas";
JSHG.SETTINGS["DEBUG_CANVAS_ID"] = "jshgDebugCanvas";
JSHG.SETTINGS["LEARNING_MESSAGE_ID"] = "jshgLearningMessage";
JSHG.SETTINGS["DEBUG_MESSAGE_ID"] = "jshgDebugMessage";
JSHG.SETTINGS["VIDEO_WIDTH"] = 400;
JSHG.SETTINGS["VIDEO_HEIGHT"] = 340;
JSHG.SETTINGS["GESTURE_WIDTH"] = 120;
JSHG.SETTINGS["GESTURE_HEIGHT"] = 100;
JSHG.SETTINGS["ACTION_RATE"] = 10; // per second, -1 means calling when the frame is process
JSHG.SETTINGS["LEARNING_COUNT_DOWN"] = 5; // seconds
JSHG.SETTINGS["CENTRAL_AREA_RATIO"] = 1/3;

JSHG.SETTINGS["STROKE_STYLE"] = "red"; // seconds
JSHG.SETTINGS["FILL_STYLE"] = "yellow"; // seconds
JSHG.SETTINGS["LEARNING_POINTS"] = null;
JSHG.SETTINGS["GESTURE_BACKGROUND_IMG"] = "";

/* ------- CONSTANTS ------- */
JSHG.WORKER_CONFIG_REQUEST = "configRequest";
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
JSHG.debugCanvas = null;
JSHG.debugCanvasctx = null;
JSHG.learningMessage = null;
JSHG.debugMessage = null;

// worker
JSHG.grWorker = new Worker('../jshg/gestureRecognizer.js');

// config
JSHG.learningArea = null;
JSHG.gestureArea = null;
JSHG.debugArea = null;
JSHG.actionCallBack = null;

// ids
JSHG.reqFrameReaderId = 0;
JSHG.actionIntervalId = 0;
JSHG.countDownId = 0;

// buffer
JSHG.gestures = [];

// state
JSHG.isLearning = false;
JSHG.isLearned = false;
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
        this.isOpen = true;
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
            
            if (this.isSamePos(obj) && this.isOpen == obj.isOpen) {
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

    // for debug mode
    if (JSHG.debugArea != null) {
        JSHG.debugCanvas = $('<canvas/>',{'id':JSHG.SETTINGS["DEBUG_CANVAS_ID"]}).attr({'width':JSHG.SETTINGS["VIDEO_WIDTH"],'height':JSHG.SETTINGS["VIDEO_HEIGHT"]});
        JSHG.debugMessage = $('<p/>',{'id':JSHG.SETTINGS["DEBUG_MESSAGE_ID"]}); 
    }

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
                if (JSHG.debugArea != null) {
                    JSHG.debugCanvasctx = JSHG.debugCanvas[0].getContext('2d');
                }

                // add styles
                JSHG.videoCanvasctx.strokeStyle = JSHG.SETTINGS["STROKE_STYLE"];
                JSHG.videoCanvasctx.fillStyle = JSHG.SETTINGS["FILL_STYLE"];
                JSHG.gestureCanvasctx.strokeStyle = JSHG.SETTINGS["STROKE_STYLE"];
                JSHG.gestureCanvasctx.fillStyle = JSHG.SETTINGS["FILL_STYLE"];

                JSHG.reqFrameReaderId = compatibility.requestAnimationFrame(JSHG.frameReader_);
                if (JSHG.SETTINGS["ACTION_RATE"] > 0) {
                    JSHG.actionIntervalId = setInterval(JSHG.actionScheduler_, 1000/JSHG.SETTINGS["ACTION_RATE"]);
                }

                JSHG.learning_();
            }, 500);
        }, function (error) {
            // WebRTC not available.
        });
    } catch (error) {
        // something goes wrong...
    }
}

JSHG.showLearningCanvas_ = function() {
    JSHG.learningArea.append(JSHG.videoCanvas);
    JSHG.learningArea.append(JSHG.learningMessage);
}
JSHG.hideLearningCanvas_ = function() {
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
JSHG.showDebugCanvas_ = function() {
    if (JSHG.debugArea == null) return;
    JSHG.learningArea.append(JSHG.debugCanvas);
    JSHG.learningArea.append(JSHG.debugMessage);
}
JSHG.hideDebugCanvas_ = function() {
    if (JSHG.debugArea == null) return;
    JSHG.debugCanvas.remove();
    JSHG.debugMessage.remove();
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

    // draw video
    JSHG.gestureCanvasctx.drawImage(JSHG.videoCanvas[0], 0, 0, w, h);
    // draw dash line
    JSHG.gestureCanvasctx.beginPath();
    JSHG.gestureCanvasctx.setLineDash([5]);
    JSHG.gestureCanvasctx.rect((w - centralAreaWidth)/2, 0, centralAreaWidth, h);
    JSHG.gestureCanvasctx.rect(0, (h - centralAreaHeight)/2, w, centralAreaHeight);
    JSHG.gestureCanvasctx.stroke();

    // draw hand pos
    if (JSHG.handInfo != null) {
        if (JSHG.handInfo.handPos[0] > -1) {
            var x = JSHG.handInfo.handPos[0] * ratioW;
            var y = JSHG.handInfo.handPos[1] * ratioH;
            JSHG.gestureCanvasctx.fillRect(x, y, 10*ratioW, 10*ratioH);
        }
        /*
        if (JSHG.handInfo.nFingers > 0) {
            for (var i = 0; i < JSHG.handInfo.fingers.length; i++) {
                var x = JSHG.handInfo.fingers[i][0] * ratioW;
                var y = JSHG.handInfo.fingers[i][1] * ratioW;                
                JSHG.gestureCanvasctx.fillRect(x, y, 5*ratioW, 5*ratioH);                
            }
        }*/
    }
}

JSHG.drawLearningPoints_ = function() {
    for (var i = 0; i < JSHG.SETTINGS["LEARNING_POINTS"].length; ++i) {
        JSHG.videoCanvasctx.beginPath();
        JSHG.videoCanvasctx.arc(JSHG.SETTINGS["LEARNING_POINTS"][i][0], JSHG.SETTINGS["LEARNING_POINTS"][i][1], 2, 0, 2*Math.PI);
        JSHG.videoCanvasctx.stroke();
    }
}

JSHG.drawDebugCanvas_ = function() {
    if (JSHG.debugArea == null || JSHG.handInfo == null) return;

    var canvasImage= JSHG.debugCanvasctx.createImageData(JSHG.debugCanvas[0].width, JSHG.debugCanvas[0].height);
    var totalSize = JSHG.handInfo.debug.threshImage.length; // pixel
    var ind = 0;
    for (var pixel = 0; pixel < totalSize; pixel++) {
        canvasImage.data[ind] = canvasImage.data[ind + 1] = canvasImage.data[ind + 2] = JSHG.handInfo.debug.threshImage[pixel];
        canvasImage.data[ind + 3] = 255;
        ind += 4;
    }
    JSHG.debugCanvasctx.putImageData(canvasImage, 0, 0);
}

JSHG.postWorkerConfig_ = function(config) {
    JSHG.grWorker.postMessage({
        "type":JSHG.WORKER_CONFIG_REQUEST, 
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
                JSHG.drawHandInfo_();
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
        JSHG.isLearning = false;
        JSHG.isLearned = true;
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

        // debug
        if (JSHG.debugArea != null) {
            JSHG.drawDebugCanvas_();
            JSHG.debugMessage.html("Debug");
        }
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


    // is open
    if (handInfo.nFingers <=3 )
        gesture.isOpen = false;
    else
        gesture.isOpen = true;        

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

    JSHG.actionCallBack = data["callback"];
    JSHG.learningArea = $("#" + data["learnDivId"]);
    if ("gestureDivId" in data) {
        JSHG.gestureArea = $("#" + data["gestureDivId"]);
    }
    if ("settings" in data) {
        for (var prop in data["settings"]) {
            if (prop in JSHG.SETTINGS) {
                JSHG.SETTINGS[prop] = data["settings"][prop];
            }
        }
    }

    var workerConfig = {};
    if ("workerConfig" in data) {
        workerConfig = {"debugMode": false, "configs": data["workerConfig"]};
    } else {
        workerConfig = {"debugMode": false, "configs": null};
    }

    if ("debugDivId" in data) {
        JSHG.debugArea = $("#" + data["debugDivId"]);
        workerConfig.debugMode = true;
    }
    JSHG.postWorkerConfig_(workerConfig);
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
        if (!JSHG.isLearned) {
            JSHG.learning_();
        } else {
            JSHG.showGestureCanvas_ ();
            JSHG.postWorkerDetect_(null);
        }
    }

    JSHG.showDebugCanvas_();
}

JSHG.stop = function() {
    if (JSHG.video == null || JSHG.video[0].paused) return;
    JSHG.hideDebugCanvas_();
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
    JSHG.handInfo = {"handPos": [-1, -1], "nFigure": 0, "handBound": null};
}

JSHG.learning = function() {
    JSHG.stop();
    JSHG.start();
    JSHG.learning_();
}