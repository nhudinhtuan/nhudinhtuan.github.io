/*!
 * Test cases for hand tracking
 */

/* ----------- CONSTANTS ---------- */
INIT_REQUEST = "initRequest";
LEARNING_REQUEST = "learningRequest";
DETECT_REQUEST = "detectRequest";

/* ------- GLOBAL VARIABLES ------- */
var count = 0;

/* -------- FUNCTIONS -------- */
function genTestCases(frame) {
    var response = {"handPos": null, "fingers": null, "threshImage": null};
    var w = frame.width, h = frame.height;
    switch(count) {
        case 0:
            break;
        case 1:
            response["handPos"] = [0, 0];
            response["fingers"] = [[0, 0]];
            break;
        case 2:
            response["handPos"] = [w, 0];
            response["fingers"] = [[0, 0], [1, 1]];
            break;
        case 3:
            response["handPos"] = [0, h];
            response["fingers"] = [[0, 0], [1, 1], [2, 2]];
            break;  
        case 4:
            response["handPos"] = [w, h];
            response["fingers"] = [[0, 0], [1, 1], [2, 2], [3, 3]];
            break;
        case 5:
            response["handPos"] = [w/2, h/2];
            response["fingers"] = [[0, 0], [1, 1], [2, 2], [3, 3]];
            break;
        case 6:
            response["handPos"] = [100, h/2];
            response["fingers"] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
            break;
        case 7:
            response["handPos"] = [300, h/2];
            response["fingers"] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
            break;
        case 8:
            response["handPos"] = [w/2, 90];
            response["fingers"] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
            break;
        case 9:
            response["handPos"] = [w/2, 210];
            response["fingers"] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
            break;
    }  
    count++;
    return response;
}

// Listen the data from the main thread
self.addEventListener('message', function(e) {
    var receivedData = e.data;
    var response = null;
    if (receivedData.type == INIT_REQUEST) {
        count = 0;
    } else if (receivedData.type == DETECT_REQUEST) {
        response = genTestCases(receivedData.data);
    }
    self.postMessage({"type": receivedData.type, "data": response});
}, false);