import "./styles.css";

import {
  WebGLRenderer,
  Raycaster,
  Scene,
  Mesh,
  Vector2,
  Vector3,
  DirectionalLight,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PCFSoftShadowMap,
  BoxBufferGeometry,
  SphereBufferGeometry,
  PlaneBufferGeometry,
  PerspectiveCamera,
  SubtractiveBlending,
  NoBlending
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { HorizontalTiltShiftShader } from "three/examples/jsm/shaders/HorizontalTiltShiftShader.js";
import { VerticalTiltShiftShader } from "three/examples/jsm/shaders/VerticalTiltShiftShader.js";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import Stats from "stats.js";
import dat from "dat.gui";

var camera, scene, cssScene, renderer, cssRenderer;
var mouse, mouseDown;
var touching, usesTouching;
var threeDObjectRaycaster, mouseRaycaster, project2DRaycaster;
var controls;
var css3DDiv;
var cssPlane;
var intersectableObjects;
var intersectingObject,
  intersectingObject2,
  intersectingObject3,
  intersectingObject4,
  ghostObject,
  ghostObject2,
  ghostObject3,
  ghostObject4;

var speed = 10;
var animateObject = false;

var planeReflector, planeBlender, planeBackCover;
var postprocessing = {};

var stats, gui;

const TOP_ZINDEX = "40";
const BOTTOM_ZINDEX = "30";

var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight;

init();

function createCSS3DElement(id, x, y, z, ry) {
  // css3DDiv = document.createElement('div');
  css3DDiv = document.getElementById("css3D");

  css3DDiv.style.width = "480px";
  css3DDiv.style.height = "360px";
  // css3DDiv.style.opacity = 0.1;
  css3DDiv.style.transparent = false;
  // css3DDiv.style.transparent = true;
  // css3DDiv.style.background = "rgba(20, 20, 20, 1";

  var iframe = document.createElement("iframe");
  iframe.style.width = "480px";
  iframe.style.height = "360px";
  iframe.style.border = "0px";
  iframe.src = [
    "https://www.youtube.com/embed/",
    id,
    "?playsinline=1&rel=0"
  ].join("");
  css3DDiv.appendChild(iframe);

  var css3DObject = new CSS3DObject(css3DDiv);
  css3DObject.position.set(x, y, z);
  css3DObject.rotation.y = ry;
  css3DObject.name = "css3DObject";

  const WIDTH = 480;
  const HEIGHT = 360;
  const DEPTH = 1;

  var planeGeometry = new PlaneBufferGeometry(WIDTH, HEIGHT, 6, 6);

  var reflectorParameters = {
    clipBias: 0.0003,
    textureWidth: WIDTH * window.devicePixelRatio,
    textureHeight: HEIGHT * window.devicePixelRatio,
    recursion: 0.1
  };

  planeReflector = new Reflector(planeGeometry, reflectorParameters);
  planeReflector.layers.disable(0);
  planeReflector.layers.enable(1);
  planeReflector.layers.enable(2);

  planeReflector.position.set(x, y, z);
  planeReflector.rotation.copy(css3DObject.rotation);
  planeReflector.scale.copy(css3DObject.scale);
  planeReflector.name = "planeReflector";

  var planeBlenderMaterial = new MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.25,
    color: 0x000000,
    blending: SubtractiveBlending
  });

  var planeBlenderGeometry = new BoxBufferGeometry(WIDTH, HEIGHT, DEPTH, 6, 6);

  planeBlender = new Mesh(planeBlenderGeometry, planeBlenderMaterial);
  planeBlender.position.set(x, y, z);
  planeBlender.rotation.copy(css3DObject.rotation);
  planeBlender.scale.copy(css3DObject.scale);
  planeBlender.name = "planeBlender";
  planeBlender.layers.set(1);
  // planeBlender.layers.disable(0);

  planeBackCover = planeBlender.clone();
  planeBackCover.name = "planeBackCover";
  planeBackCover.position.set(x, y, z);
  planeBackCover.layers.set(0);
  planeBackCover.material = new MeshBasicMaterial({
    blending: SubtractiveBlending,
    transparent: false,
    opacity: 0,
    color: 0x000000
  });

  // add it to the WebGL scene
  scene.add(planeReflector);
  scene.add(planeBlender);
  scene.add(planeBackCover);
  cssScene.add(css3DObject);

  return planeBlender;
}

function createObjects() {
  const sphereGeometry = new SphereBufferGeometry(50, 10, 10);
  const boxGeometry = new BoxBufferGeometry(75, 75, 75, 5, 5);
  const material = new MeshPhysicalMaterial({
    color: 0x00ff40,
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 0.1,
    clearcoatRoughness: 0.9
  });

  intersectingObject = new Mesh(sphereGeometry, material.clone());
  intersectingObject.position.x = 180;
  intersectingObject.position.y = 100;
  intersectingObject.position.z = 500;
  intersectingObject.name = "intersectingObject";

  intersectingObject2 = new Mesh(sphereGeometry, material.clone());
  intersectingObject2.position.x = -180;
  intersectingObject2.position.y = 100;
  intersectingObject2.position.z = 500;
  intersectingObject2.name = "intersectingObject2";

  intersectingObject3 = new Mesh(boxGeometry, material.clone());
  intersectingObject3.position.x = -180;
  intersectingObject3.position.y = -100;
  intersectingObject3.position.z = -500;
  intersectingObject3.name = "intersectingObject3";

  intersectingObject4 = new Mesh(boxGeometry, material.clone());
  intersectingObject4.position.x = 180;
  intersectingObject4.position.y = -100;
  intersectingObject4.position.z = -500;
  intersectingObject4.name = "intersectingObject4";

  intersectingObject.layers.set(0);
  intersectingObject2.layers.set(0);
  intersectingObject3.layers.set(0);
  intersectingObject4.layers.set(0);

  ghostObject = intersectingObject.clone();
  ghostObject2 = intersectingObject2.clone();
  ghostObject3 = intersectingObject3.clone();
  ghostObject4 = intersectingObject4.clone();

  ghostObject.name = "ghostObject";
  ghostObject2.name = "ghostObject2";
  ghostObject3.name = "ghostObject3";
  ghostObject4.name = "ghostObject4";

  ghostObject.layers.set(2);
  ghostObject2.layers.set(2);
  ghostObject3.layers.set(2);
  ghostObject4.layers.set(2);

  scene.add(
    intersectingObject,
    intersectingObject2,
    intersectingObject3,
    intersectingObject4,
    ghostObject,
    ghostObject2,
    ghostObject3,
    ghostObject4
  );

  var objectsThatIntersect = [
    intersectingObject,
    intersectingObject2,
    intersectingObject3,
    intersectingObject4
  ];

  return objectsThatIntersect;
}

function init() {
  stats = new Stats();
  document.body.appendChild(stats.dom);

  var container = document.getElementById("container");

  camera = new PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(1000, -350, 1200);
  scene = new Scene();
  cssScene = new Scene();

  //Add directional lights for layer 0
  var dirLight = new DirectionalLight(0xffffff, 10);
  dirLight.position.set(1, 1, 5);
  dirLight.position.multiplyScalar(500);
  dirLight.layers.set(0);
  scene.add(dirLight);

  var dirLight2 = new DirectionalLight(0xffffff, 10);
  dirLight2.position.set(1, -1, -5);
  dirLight2.position.multiplyScalar(500);
  dirLight2.layers.set(0);
  scene.add(dirLight2);

  renderer = new WebGLRenderer({
    container,
    preserveDrawingBuffer: true,
    antialias: true,
    alpha: true
  });
  renderer.setClearColor(0x000000); // Set the clear colour of the renderer to black
  renderer.setClearAlpha(0); // Set the alpha value to be 0
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.shadowMapSoft = true;
  renderer.sortObjects = false;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.top = 0;

  cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.domElement.style.position = "absolute";
  cssRenderer.domElement.style.top = 0;
  cssRenderer.domElement.style.opacity = 0.9;

  cssPlane = createCSS3DElement("SJOz3qjfQXU", 0, 0, 0, 0);

  container.appendChild(cssRenderer.domElement);
  container.appendChild(renderer.domElement);

  //Create an array of objects to check intersection with the cssPlane in either 2d or 3d space
  intersectableObjects = createObjects();

  // controls = new OrbitControls(camera, cssRenderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxDistance = 5000;
  controls.minDistance = Math.min(SCREEN_HEIGHT, SCREEN_WIDTH) * 1.2;
  controls.enablePan = false;

  // setup a mouse vector
  mouse = new Vector2();

  threeDObjectRaycaster = new Raycaster();
  mouseRaycaster = new Raycaster();
  project2DRaycaster = new Raycaster();

  window.addEventListener("resize", onWindowResize, false);
  document.addEventListener("mousemove", onDocumentMouseMove, false);
  container.addEventListener("mouseup", onContainerMouseUp, false);
  container.addEventListener("mousedown", onContainerMouseDown, false);

  // Register touch event handlers
  container.addEventListener("touchstart", onTouchStart, false);
  container.addEventListener("touchend", onTouchEnd, false);

  initPostprocessing();
  renderer.autoClear = false;

  var effectController = {
    bluriness: 2,
    r: 0.1
  };

  var updateBlur = function() {
    postprocessing.hblur.uniforms["h"].value =
      effectController.bluriness / SCREEN_WIDTH;
    postprocessing.vblur.uniforms["v"].value =
      effectController.bluriness / SCREEN_HEIGHT;
    postprocessing.hblur.uniforms["r"].value = effectController.r;
    postprocessing.vblur.uniforms["r"].value = effectController.r;
  };

  // Initialize dat.GUI
  gui = new dat.GUI();
  var guiParameters = {
    animateObject: false,
    showCSS3DPlane: true,
    showCSS3DBlender: true
  };
  var guiAnimateObject = gui
    .add(guiParameters, "animateObject")
    .name("Animate Objects?")
    .listen();

  guiAnimateObject.onChange(function(value) {
    animateObject = value;
  });

  var guiBlur = gui.addFolder("Blurring");
  guiBlur.add(effectController, "bluriness", 0, 10, 1.7).onChange(updateBlur);
  guiBlur.add(effectController, "r", 0, 1, 0.1).onChange(updateBlur);

  updateBlur();

  var guiCSS3d = gui.addFolder("CSS3DPlane");

  var guiShowCSS3DPlane = guiCSS3d
    .add(guiParameters, "showCSS3DPlane")
    .name("CSS3D Reflector")
    .listen();

  guiShowCSS3DPlane.onChange(function(value) {
    planeReflector.visible = value;
  });

  var guiShowCSS3DCovers = guiCSS3d
    .add(guiParameters, "showCSS3DBlender")
    .name("CSS3D Blender")
    .listen();

  guiShowCSS3DCovers.onChange(function(value) {
    planeBlender.visible = value;
    if (value) {
      planeBlender.material.blending = SubtractiveBlending;
    } else {
      planeBlender.material.blending = NoBlending;
    }
  });

  gui.domElement.parentNode.style.zIndex = 800;

  if (SCREEN_WIDTH > 750) {
    gui.open();
    guiBlur.open();
    guiCSS3d.open();
  } else {
    gui.close();
    guiBlur.close();
    guiCSS3d.close();
  }

  animate();
}

function initPostprocessing() {
  var renderPass = new RenderPass(scene, camera);

  var hblur = new ShaderPass(HorizontalTiltShiftShader);
  var vblur = new ShaderPass(VerticalTiltShiftShader);

  var composer = new EffectComposer(renderer);

  vblur.renderToScreen = true;

  composer.addPass(renderPass);
  composer.addPass(hblur);
  composer.addPass(vblur);

  postprocessing.composer = composer;
  postprocessing.hblur = hblur;
  postprocessing.vblur = vblur;
}

// touchstart handler
function onTouchStart(event) {
  if (!usesTouching) {
    usesTouching = true;
  }
  swapRenderersZIndexes(renderer, TOP_ZINDEX, cssRenderer, BOTTOM_ZINDEX);
  touching = true;
}

function onTouchEnd(event) {
  touching = false;
}

function onContainerMouseDown(event) {
  mouseDown = true;
}

function onContainerMouseUp(event) {
  mouseDown = false;
}

function onWindowResize() {
  SCREEN_WIDTH = window.innerWidth;
  SCREEN_HEIGHT = window.innerHeight;
  camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
  camera.updateProjectionMatrix();
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  cssRenderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
}

function onDocumentMouseMove(event) {
  // event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function swapRenderersZIndexes(renderer1, zIndex1, renderer2, zIndex2) {
  renderer1.domElement.style.zIndex = zIndex1;
  renderer2.domElement.style.zIndex = zIndex2;
}

//Check if the camera is in front of or behind a target in world space
function checkCameraBehindObject(targetObject) {
  var lookAtObject = targetObject.getWorldDirection(new Vector3());
  var cameraTargetPosition = new Vector3().setFromMatrixPosition(
    camera.matrixWorld
  );
  var cameraBehindTarget =
    cameraTargetPosition.angleTo(lookAtObject) > Math.PI / 2;
  return cameraBehindTarget;
}

//Check if an array of objects overlap a target object on the screen (in 2D space) relative to the camera
function checkObjectsInFront(objectsToCheck, targetObject, cameraBehindTarget) {
  var targetObjectPosition = new Vector3().setFromMatrixPosition(
    targetObject.matrixWorld
  );
  var lookAtObject = targetObject.getWorldDirection(new Vector3());

  objectsToCheck.forEach(objectToCheck => {
    var targetPosition = new Vector3().setFromMatrixPosition(
      objectToCheck.matrixWorld
    );
    var objectPos = targetPosition.sub(targetObjectPosition);
    objectToCheck.userData.inFrontOf = [];
    if (cameraBehindTarget) {
      if (
        objectPos.angleTo(lookAtObject) >
        targetObjectPosition.angleTo(lookAtObject)
      ) {
        objectToCheck.userData.inFrontOf.push(targetObject.name);
      }
    } else {
      if (
        objectPos.angleTo(lookAtObject) <
        targetObjectPosition.angleTo(lookAtObject)
      ) {
        objectToCheck.userData.inFrontOf.push(targetObject.name);
      }
    }
  });
}

//Check if an object is behind the camera
function checkObjectBehindCamera(objectToCheck) {
  var targetPosition = new Vector3();
  targetPosition = targetPosition.setFromMatrixPosition(
    objectToCheck.matrixWorld
  );
  var lookAt = camera.getWorldDirection(new Vector3());
  var cameraPos = new Vector3().setFromMatrixPosition(camera.matrixWorld);
  var objectPos = targetPosition.sub(cameraPos);
  var objectBehindCamera = objectPos.angleTo(lookAt) > Math.PI / 2;
  return objectBehindCamera;
}

//Check if an array objects overlap a target object on the screen (in 2D space) relative to the camera
function projectObjectsOnTarget(objectsToCheck, targetObject) {
  objectsToCheck.forEach(objectToCheck => {
    objectToCheck.userData.twoDObjectIntersects = false;

    // Check if object is behind the camera
    var objectBehindCamera = checkObjectBehindCamera(objectToCheck);

    // If object isn't behind the camera, check if it overlaps the cssPlane in 2d space
    if (!objectBehindCamera) {
      const numberOfVertices = objectToCheck.geometry.attributes.position.count;
      var point2D = new Vector2();
      var point = new Vector3();
      var objectPosition = objectToCheck.geometry.getAttribute("position");

      for (var i = 0; i < numberOfVertices; i++) {
        point = point.setFromMatrixPosition(objectToCheck.matrixWorld);
        const x = objectPosition.getX(i);
        const y = objectPosition.getY(i);
        const z = objectPosition.getZ(i);
        point.add(new Vector3(x, y, z)).project(camera);
        point2D.set(point.x, point.y);
        project2DRaycaster.setFromCamera(point2D, camera);
        var intersects = project2DRaycaster.intersectObject(targetObject, true);
        var pointsOnTarget = intersects.length > 0 ? intersects[0].point : null;
        if (pointsOnTarget && intersects.length > 0) {
          objectToCheck.userData.twoDObjectIntersects = true;
          // console.log("intersected", objectToCheck.name, pointsOnTarget);
          //Once a point of intersection is found stop, the loop
          return;
        }
      }
    }
  });
}

//Check for intersection of objects with the target and set object color
function checkIntersects(objectsToCheck, targetObject) {
  var targetObjectCovered = false;
  objectsToCheck.forEach(objectToCheck => {
    const objectInFrontOfTargetObject = objectToCheck.userData.inFrontOf.find(
      name => name === targetObject.name
    );
    // if (objectInFrontOfTargetObject) console.log(targetObject.name);

    if (!objectToCheck.userData.objectCovers) {
      objectToCheck.userData.objectCovers = [];
    }

    const objectCoveredIndex = parseInt(
      objectToCheck.userData.objectCovers.indexOf(targetObject.name),
      2
    );

    const intersects =
      (objectToCheck.userData.twoDObjectIntersects &&
        objectInFrontOfTargetObject) ||
      objectToCheck.userData.threeDObjectIntersects;

    if (intersects) {
      targetObjectCovered = true;
      if (objectCoveredIndex < 0) {
        // Set to orange
        objectToCheck.material.setValues({ color: 0xffa400 });
        objectToCheck.userData.objectCovers.push(targetObject.name);
      }
    } else if (objectCoveredIndex >= 0 && !intersects) {
      objectToCheck.userData.objectCovers = objectToCheck.userData.objectCovers.filter(
        name => {
          return name !== targetObject.name;
        }
      );
      // Set to green
      objectToCheck.material.setValues({ color: 0x00ff40 });
    }
  });

  return targetObjectCovered;
}

//Check if an object is being moused over and is the object closes to the camera
function isObjectClosestToCamera(objectToCheck) {
  mouseRaycaster.setFromCamera(mouse, camera);
  const intersects = mouseRaycaster.intersectObjects(scene.children, true);
  const objectIsClosestToCamera =
    intersects.length > 0
      ? intersects[0].object.name === objectToCheck.name
      : false;

  return objectIsClosestToCamera;
}

//Check if an array of objects overlap a target object in 3d space
//Code based on: https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/Collision-Detection.html
function raycast3DObjects(sourceObjects, targetObject) {
  var objectsIntersect = false;

  var intersects = [];
  sourceObjects.forEach(
    object => (object.userData.threeDObjectIntersects = false)
  );

  var numberOfVertices = targetObject.geometry.attributes.position.count;
  var originPoint = targetObject.position.clone();

  var point = new Vector3();
  var objectPosition = targetObject.geometry.getAttribute("position");

  for (var i = 0; i < numberOfVertices; i++) {
    point = point.setFromMatrixPosition(targetObject.matrixWorld);
    const x = objectPosition.getX(i);
    const y = objectPosition.getY(i);
    const z = objectPosition.getZ(i);

    var localVertex = point.add(new Vector3(x, y, z));
    var globalVertex = localVertex.applyMatrix4(targetObject.matrix);
    var directionVector = globalVertex.sub(targetObject.position);

    threeDObjectRaycaster.set(originPoint, directionVector.clone().normalize());

    intersects =
      threeDObjectRaycaster.intersectObjects(sourceObjects).length > 0
        ? threeDObjectRaycaster.intersectObjects(sourceObjects)
        : 0;

    if (intersects.length > 0) {
      for (var j = 0; j < intersects.length; j++) {
        if (intersects[j].distance < directionVector.length()) {
          intersects[j].object.userData.threeDObjectIntersects = true;
          objectsIntersect = true;

          //Once a point of intersection is found stop, the loop
          return;
        }
      }
    }
  }

  return objectsIntersect;
}

//Update zIndex of renderers and opacity of divs
function checkZIndexes(objectCoversTarget, isTargetObjectOnTop) {
  // console.log(isTargetObjectOnTop);
  if (
    !touching &&
    !mouseDown &&
    (isTargetObjectOnTop || usesTouching) &&
    !objectCoversTarget &&
    cssRenderer.domElement.style.zIndex !== TOP_ZINDEX
  ) {
    swapRenderersZIndexes(renderer, BOTTOM_ZINDEX, cssRenderer, TOP_ZINDEX);
    css3DDiv.style.opacity = 0.75;
    if (usesTouching)
      controls = new OrbitControls(camera, cssRenderer.domElement);
    // console.log("css to top");
  } else if (
    !isTargetObjectOnTop &&
    !usesTouching &&
    !objectCoversTarget &&
    css3DDiv.style.opacity !== "0.999"
  ) {
    // controls.enabled = true;
    swapRenderersZIndexes(renderer, TOP_ZINDEX, cssRenderer, BOTTOM_ZINDEX);
    css3DDiv.style.opacity = 0.999;
    controls = new OrbitControls(camera, renderer.domElement);
  } else if (objectCoversTarget && css3DDiv.style.opacity !== "0.5") {
    swapRenderersZIndexes(renderer, TOP_ZINDEX, cssRenderer, BOTTOM_ZINDEX);
    css3DDiv.style.opacity = 0.5;
    if (usesTouching) controls = new OrbitControls(camera, renderer.domElement);
  }
}

function animateObjects() {
  if (
    intersectingObject.position.z > 800 ||
    intersectingObject.position.z < -800
  )
    speed *= -1;
  intersectingObject.position.z = intersectingObject.position.z + speed;
  intersectingObject2.position.z = intersectingObject2.position.z + speed;
  intersectingObject3.position.z = intersectingObject3.position.z + -speed;
  intersectingObject4.position.z = intersectingObject4.position.z + -speed;
  ghostObject.position.z = ghostObject.position.z + -speed;
  ghostObject2.position.z = ghostObject2.position.z + -speed;
  ghostObject3.position.z = ghostObject3.position.z + +speed;
  ghostObject4.position.z = ghostObject4.position.z + +speed;
}

var objectCoversTarget, isTargetObjectOnTop;

function processObjects() {
  const sourceObjects = intersectableObjects;
  const targetObject = cssPlane;

  const cameraBehindReflector = checkCameraBehindObject(planeReflector);

  if (cameraBehindReflector) {
    planeReflector.rotateY(planeReflector.rotation.y + Math.PI);
  }

  const cameraBehindTarget = checkCameraBehindObject(targetObject);

  checkObjectsInFront(sourceObjects, targetObject, cameraBehindTarget);

  const threeDOjectsIntersect = raycast3DObjects(sourceObjects, targetObject);

  //If 3d objects intersect the target there's no need to project them on in 2d on the target
  if (!threeDOjectsIntersect) {
    projectObjectsOnTarget(sourceObjects, targetObject);
  }
  objectCoversTarget = checkIntersects(intersectableObjects, targetObject);
  isTargetObjectOnTop = isObjectClosestToCamera(targetObject);
  checkZIndexes(objectCoversTarget, isTargetObjectOnTop);
  if (!mouseDown && animateObject) {
    animateObjects();
  }
}

function render() {
  camera.layers.disable(0);
  camera.layers.enable(1);
  camera.layers.disable(2);

  postprocessing.composer.render(scene, camera);

  renderer.clearDepth();

  camera.layers.enable(0);
  camera.layers.disable(1);
  camera.layers.disable(2);

  cssRenderer.render(cssScene, camera);
  renderer.render(scene, camera);
}

function animate() {
  stats.begin();
  requestAnimationFrame(animate);
  processObjects();
  render();
  stats.end();
}
