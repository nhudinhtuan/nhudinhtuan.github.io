importScripts("ParallelJS-CV.min.js");
CONFIG_REQUEST = "configRequest";
LEARNING_REQUEST = "learningRequest";
DETECT_REQUEST = "detectRequest";

var grabPoints = new Array();
var learnedColors = new Array();
var debugMode = false;
jscv.USE_JS_ARRAY_FLAG_ = true;

function detect(frame) {
    var response = {"handPos": [-1, -1], "nFingers": -1, "fingers": [], "debug": null};
    if (frame == null || learnedColors.length == 0)
        return response;

    var medianWindow = 5;
    var jscvImage = new jscv.coredt.Image(frame.width, frame.height, jscv.uint8Clamped, frame.data.buffer);
    jscvImage.colorMode = jscv.COLOR_RGBA;
    var thresholdedImage = jscv.imgproc.colorThreshold(jscvImage, learnedColors, jscv.COLOR_HSV);
    var blurImage = jscv.imgproc.boxBlur(thresholdedImage, medianWindow);
    var secondThreshImage = jscv.imgproc.threshold(blurImage, jscv.THRESH_BINARY, 50, 255);
    var contours = jscv.imgproc.findContours(secondThreshImage);
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
    response.nFingers = fingers.length;
    response.fingers = fingers;

    if (debugMode == true) {
        response.debug = {"threshImage": secondThreshImage.data.data, "contour" : null, "hullLines": hullLines, "defectLines": defectLines}

        /*
        var maxContour = contours[maxIndex];
        // for current contour, convert as necessary to get a list of points
        if (maxContour.approxMethod == jscv.CHAIN_APPROX_SIMPLE) {
            response.debug.contour = maxContour.seqData;
        } else {
            var simpleContour = jscv.imgproc.convertContourApprox(maxContour, jscv.CHAIN_APPROX_SIMPLE);
            response.debug.contour = maxContour.seqData;
        }*/
        // defec
    }

    return response;
}

function learn(learningPoints, frame) {
    var hBound = 20;
    var sBound = 0.1;
    var vBound = 0.1;

    var jscvImage = new jscv.coredt.Image(frame.width, frame.height, jscv.uint8Clamped, frame.data.buffer);
    var hsvImage = jscv.imgproc.convertColor(jscvImage, jscv.COLOR_HSV);
    for (var i = 0; i < learningPoints.length; ++i) {
        var px = parseInt(learningPoints[i][0]);
        var py = parseInt(learningPoints[i][1]);

        var h = hsvImage.data.get(py, px, 0);
        var s = hsvImage.data.get(py, px, 1);
        var v = hsvImage.data.get(py, px, 2);
        learnedColors.push(new jscv.imgproc.Bound(h-hBound, h+hBound, 
                                              s-sBound, s+sBound, 
                                              v-vBound, v+vBound));
    }
}

function config(data) {
    debugMode = data.debugMode;

    console.log("worker config");
    console.log(data);
}

self.addEventListener('message', function(e) {
    var receivedData = e.data;
    var response = null;
    if (receivedData.type == CONFIG_REQUEST) {
        config(receivedData.config);
    } else if (receivedData.type == LEARNING_REQUEST) {
        learn(receivedData.learningPoints, receivedData.frame);
    } else {
        response = detect(receivedData.frame);
    }
    self.postMessage({"type": receivedData.type, "response": response});
}, false);