google.load("earth", "1");

var ge = null;
var ALTITUDE_NORMALIZER = 8000000.0
var panSpeed;

function init() {
  google.earth.createInstance("map3d", initCallback, failureCallback);
}

function initCallback(object) {
  ge = object;
  ge.getWindow().setVisibility(true);
  panSpeed = ge.SPEED_TELEPORT;
}

function failureCallback(object) {
}

function panNorth() {
  ge.getOptions().setFlyToSpeed(panSpeed);
  var camera = ge.getView().copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND);
  var altitude = camera.getAltitude();
  var delta = altitude/ALTITUDE_NORMALIZER;

  if (camera.getLongitude() > 0)
    camera.setLatitude(camera.getLatitude() + delta);
  else
    camera.setLatitude(camera.getLatitude() - delta);    

  ge.getView().setAbstractView(camera); 
}

function panEast() {
  ge.getOptions().setFlyToSpeed(panSpeed);
  var camera = ge.getView().copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND);
  var altitude = camera.getAltitude();
  var delta = altitude/ALTITUDE_NORMALIZER;

  var newLongitude = camera.getLongitude() + delta;
  if (newLongitude > 180)
    newLongitude -= 360;   

  camera.setLongitude(newLongitude);
  ge.getView().setAbstractView(camera);
}

function panSouth() {
  ge.getOptions().setFlyToSpeed(panSpeed);
  var camera = ge.getView().copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND);
  var altitude = camera.getAltitude();
  var delta = altitude/ALTITUDE_NORMALIZER;

  if (camera.getLongitude() < 0)
    camera.setLatitude(camera.getLatitude() + delta);
  else
    camera.setLatitude(camera.getLatitude() - delta);

  ge.getView().setAbstractView(camera);
}
 
function panWest() {
  ge.getOptions().setFlyToSpeed(panSpeed);
  var camera = ge.getView().copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND);
  var altitude = camera.getAltitude();
  var delta = altitude/ALTITUDE_NORMALIZER;

  var newLongitude = camera.getLongitude() - delta;
  if (newLongitude < -180)
    newLongitude += 360; 
  camera.setLongitude(newLongitude);

  ge.getView().setAbstractView(camera);
}


function zoomIn() {
  ge.getOptions().setFlyToSpeed(4.0);
  var camera = ge.getView().copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND);
  var altitude = camera.getAltitude();
  var delta = altitude/10;
  camera.setAltitude(altitude - delta);
  ge.getView().setAbstractView(camera); 
}

function zoomOut() {
  ge.getOptions().setFlyToSpeed(4.0);
  var camera = ge.getView().copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND);
  var altitude = camera.getAltitude();
  var delta = altitude/10;
  camera.setAltitude(altitude + delta);
  ge.getView().setAbstractView(camera); 
}

function rotateLeft() {
  ge.getOptions().setFlyToSpeed(4.0);
  var camera = ge.getView().copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND);
  camera.setHeading(camera.getHeading() + 5);
  ge.getView().setAbstractView(camera); 
}

function rotateRight() {
  ge.getOptions().setFlyToSpeed(4.0);
  var camera = ge.getView().copyAsCamera(ge.ALTITUDE_RELATIVE_TO_GROUND);
  camera.setHeading(camera.getHeading() - 5);
  ge.getView().setAbstractView(camera); 
}