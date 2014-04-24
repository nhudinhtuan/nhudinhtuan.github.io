function drawContour() {
	var contourList, seqData, colorList, widthList;
	if (arguments.length < 2) {
		throw new Error("drawContours requires at least two arguments");
	} else if (arguments.length > 4) {
		throw new Error("Too many arguments to drawContours");
	} else {
		// if input list is a list of contourNodes, extract the contours first
		if (arguments[0][0] instanceof jscv.coredt.ContourNode) {
			contourList = arguments[0].map(function(x) { return x.contour; });
		} else {
			contourList = arguments[0];
		}
		var ctx = arguments[1];
		if (arguments.length == 3) {
			colorList = arguments[2];
		} else if (arguments.length == 4) {
			colorList = arguments[2];
			widthList = arguments[3];
		}
	}
	// iterate through list of contours
	for (var i=0; i < contourList.length; i++) {
		var currentContour = contourList[i];
		var seqData;
		// for current contour, convert as necessary to get a list of points
		if (currentContour.approxMethod == jscv.CHAIN_APPROX_SIMPLE) {
			seqData = currentContour.seqData;
		} else {
			var simpleContour = jscv.cv.convertContourApprox(currentContour, jscv.CHAIN_APPROX_SIMPLE);
			seqData = simpleContour.seqData;
		}
		// draw current contour by iterating through its sequence of points
		ctx.beginPath();
		ctx.moveTo(currentContour.origin.x, currentContour.origin.y);
		for (var j=0; j<seqData.length; j++) {
			var currentPoint = seqData[j]
			ctx.lineTo(currentPoint.x, currentPoint.y);	
		}
		if (colorList != undefined && colorList.length == 1) {
			ctx.strokeStyle = colorList[0];
		} else {
			(colorList == undefined) ? ctx.strokeStyle = "#000000" : ctx.strokeStyle = colorList[i];
		}
		ctx.lineWidth = 2
		if (widthList != undefined && widthList.length == 1) {
			ctx.lineWidth = wdithList[0];
		} else if (widthList != undefined && widthList.length > 1) {
			ctx.lineWidth = widthList[i];
		}
		ctx.stroke();
		ctx.closePath();
	}	
}
function drawLines() {
	var lineList, ctx, colorList, widthList;
	if (arguments.length < 2) {
		throw new Error("drawCircles requires at least two arguments");
	} else if (arguments.length > 4) {
		throw new Error("Too many arguments to drawLines");
	} else {
		lineList = arguments[0];
		ctx = arguments[1];
		if (arguments.length == 3) {
			colorList = arguments[2];
		} else if (arguments.length == 4) {
			colorList = arguments[2];
			widthList = arguments[3];
		}
	}

	for (var i=0; i < lineList.length; i++) {
		var currentLine = lineList[i];
		ctx.beginPath();
		ctx.moveTo(currentLine.startPoint.x, currentLine.startPoint.y);
		ctx.lineTo(currentLine.endPoint.x, currentLine.endPoint.y);
		if (colorList != undefined && colorList.length == 1) {
			ctx.strokeStyle = colorList[0];
		} else {
			(colorList == undefined) ? ctx.strokeStyle = "#000000" : ctx.strokeStyle = colorList[i];
		}
		ctx.lineWidth = 2
		if (widthList != undefined && widthList.length == 1) {
			ctx.lineWidth = wdithList[0];
		} else if (widthList != undefined && widthList.length > 1) {
			ctx.lineWidth = widthList[i];
		}
		ctx.stroke();
		ctx.closePath();
	}
}