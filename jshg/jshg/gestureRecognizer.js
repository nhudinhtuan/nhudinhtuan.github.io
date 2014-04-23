/*!
 * Worker to track hand
 * This uses computer vision functions provided by JSCV library to trach the hand.
 * JSCV library is currently developing by Intel, HCM and NUS
 *
 * Copyright 2014
 *
 */

/* ------- IMPORT JSCV LIBRARY ------- */
importScripts("ParallelJS-CV.min.js");

/* ----------- CONSTANTS ---------- */
INIT_REQUEST = "initRequest";
LEARNING_REQUEST = "learningRequest";
DETECT_REQUEST = "detectRequest";
H_BOUND_LEARN = 15;
S_BOUND_LEARN = 0.15;
V_BOUND_LEARN = 0.15;

/* ------- GLOBAL VARIABLES ------- */
var learningPoints_ = []
var skinColorBounds_ = [];
var responseScale_ = [1, 1];
var responseThreshImage_ = false;
var debugMode_ = false;

/* -------- FUNCTIONS -------- */
function trackHand(frame) {
    //var startTime = new Date().getTime();

    var response = {"handPos": null, "fingers": null, "threshImage": null, "debugInfo": null};
    if (!frame || skinColorBounds_.length == 0)
        return response;

    var medianWindow = 5;
    var jscvImage = new jscv.coredt.Image(frame.width, frame.height, jscv.uint8Clamped, frame.data.buffer);
    jscvImage.colorMode = jscv.COLOR_RGBA;
    var thresholdedImage = jscv.imgproc.colorThreshold(jscvImage, skinColorBounds_, jscv.COLOR_HSV);
    var blurImage = jscv.imgproc.boxBlur(thresholdedImage, medianWindow);
    var secondThreshImage = jscv.imgproc.threshold(blurImage, jscv.THRESH_BINARY, 50, 255);
    var contours = jscv.cv.findContours(secondThreshImage);
    var maxDefects = null, maxHull, maxArea, maxIndex;
    maxArea = 0;
    maxIndex = 0;
    var center =  new jscv.coredt.Point();
    for(var i = 0; i < contours.length; ++i) {
        var defects = jscv.geometry.findConvexDefects(contours[i].contour, true);
        if (defects[1].length > 3) {
            var bound = jscv.geometry.boundingRect(defects[1]);
            var area = Math.abs(bound[0].x - bound[1].x) * 
                        Math.abs(bound[1].y - bound[2].y);
            var cx = (bound[0].x + bound[1].x + bound[2].x + bound[3].x)/4;
            var cy = (bound[0].y + bound[1].y + bound[2].y + bound[3].y)/4;
            if (area > maxArea) {
                center.x = cx;
                center.y = cy;
                maxArea = area;
                maxDefects = defects;
                maxHull =  defects[1];
                maxIndex = i;
            }
        }
    }

    defects = [];
    hull = []
    if (maxDefects != null) {
        defects = maxDefects[0];
        hull = maxDefects[1];
    }

    var fingerDefects = [];
    //Find fingers
    for (var i = 0; i < defects.length; ++i) {
        var defect = defects[i];
        var d12 = Math.sqrt(Math.pow(defect.startP.x - defect.depthP.x,2) + Math.pow(defect.startP.y - defect.depthP.y,2));
        var d13 = Math.sqrt(Math.pow(defect.endP.x - defect.depthP.x,2) + Math.pow(defect.endP.y - defect.depthP.y,2));
        var d23 = Math.sqrt(Math.pow(defect.startP.x - defect.endP.x,2) + Math.pow(defect.startP.y - defect.endP.y,2));
        var angle = Math.acos((Math.pow(d12, 2) + Math.pow(d13,2) - Math.pow(d23,2)) / (2* d12 * d13));
        if((angle*180/Math.PI) < 80 && defect.depth > 3) {
            fingerDefects.push(defect);
        }
    }

    var hullLines = [];
    for(var i = 0; i < hull.length; ++i) {
        hullLines[i] = new jscv.coredt.Line(hull[i], hull[(i+1)%hull.length]);
    }

    var defectLines = []
    for(var i = 0; i < fingerDefects.length; ++i) {
        defectLines[i*2] = new jscv.coredt.Line(fingerDefects[i].startP, fingerDefects[i].depthP);
        defectLines[i*2+1] = new jscv.coredt.Line(fingerDefects[i].endP, fingerDefects[i].depthP);
    }

    var fingers = [];
    if (fingerDefects.length > 0) {
        fingers[0] = [fingerDefects[0].startP.x, fingerDefects[0].startP.y];
        for(var i = 0; i < fingerDefects.length-1; ++i) {
            var avgX = (fingerDefects[i].endP.x + fingerDefects[i+1].startP.x) / 2;
            var avgY = (fingerDefects[i].endP.y + fingerDefects[i+1].startP.y) / 2;
            var avgPoint = new jscv.coredt.Point(avgX, avgY);
            fingers.push([avgPoint.x, avgPoint.y]);
        }
        fingers.push([fingerDefects[fingerDefects.length-1].endP.x, fingerDefects[fingerDefects.length-1].endP.y]);
    }

    response.handPos = [center.x, center.y];
    response.fingers = fingers;

    if (responseThreshImage_) {
        var responseThreshImage = jscv.imgproc.resizeMult(secondThreshImage, responseScale_[0], responseScale_[1]);
        response.threshImage = responseThreshImage.data.data;
    }

    if (debugMode_ == true) {
        response.debugInfo = {"contour" : contours[maxIndex], "hullLines": hullLines, "defectLines": defectLines}
        /*
        if (contours.length > 0) {
            var maxContour = contours[maxIndex].contour;
            var seqData;
            // for current contour, convert as necessary to get a list of points
            if (maxContour.approxMethod == jscv.CHAIN_APPROX_SIMPLE) {
                seqData = maxContour.seqData;
            } else {
                var simpleContour = jscv.imgproc.convertContourApprox(maxContour, jscv.CHAIN_APPROX_SIMPLE);
                seqData = maxContour.seqData;
            }
            response.debug.contour = new Array(seqData.length);
            for (var i = 0; i < seqData.length; i++)
                response.debug.contour[i] = [seqData[i].x, seqData[i].y];
            console.log(response.debug.contour);
        }
        */
    }

    //console.log(new Date().getTime() - startTime);
    return response;
}

function learnSkinColors(frame) {
    var hBound = H_BOUND_LEARN;
    var sBound = S_BOUND_LEARN;
    var vBound = V_BOUND_LEARN;

    var jscvImage = new jscv.coredt.Image(frame.width, frame.height, jscv.uint8Clamped, frame.data.buffer);
    var hsvImage = jscv.imgproc.convertColor(jscvImage, jscv.COLOR_HSV);
    skinColorBounds_ = new Array(learningPoints_.length);

    var response = new Array(learningPoints_.length);
    for (var i = 0; i < learningPoints_.length; ++i) {
        var px = parseInt(learningPoints_[i][0]);
        var py = parseInt(learningPoints_[i][1]);

        var h = hsvImage.data.get(py, px, 0);
        var s = hsvImage.data.get(py, px, 1);
        var v = hsvImage.data.get(py, px, 2);
        response[i] = [h, s, v];
        skinColorBounds_[i] = new jscv.imgproc.Bound(h-hBound, h+hBound, 
                                              s-sBound, s+sBound, 
                                              v-vBound, v+vBound);
    }

    return response;
}

function createColorBounds(hsvColors) {
    var hBound = H_BOUND_LEARN;
    var sBound = S_BOUND_LEARN;
    var vBound = V_BOUND_LEARN;

    skinColorBounds_ = new Array(hsvColors.length);
    var h, s, v;
    for (var i = 0; i < hsvColors.length; ++i) {
        h = hsvColors[i][0];
        s = hsvColors[i][1];
        v = hsvColors[i][2]; 
        skinColorBounds_[i] = new jscv.imgproc.Bound(h-hBound, h+hBound, 
                                              s-sBound, s+sBound, 
                                              v-vBound, v+vBound);        
    }
}

function init(data) {
    debugMode_ = data.debugMode;
    responseScale_ = data.responseScale;
    createColorBounds(data.skinColors);
    learningPoints_ = data.learningPoints;
    responseThreshImage_ = data.responseThreshImage;
    jscv.USE_JS_ARRAY_FLAG_ = true;
}

// Listen the data from the main thread
self.addEventListener('message', function(e) {
    var receivedData = e.data;
    var response = null;
    if (receivedData.type == INIT_REQUEST) {
        init(receivedData.data);
    } else if (receivedData.type == LEARNING_REQUEST) {
        response = learnSkinColors(receivedData.data);
    } else {
        response = trackHand(receivedData.data);
    }
    self.postMessage({"type": receivedData.type, "data": response});
}, false);