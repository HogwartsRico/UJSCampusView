/**
 * Detector module
 *
 * @author alteredq / http://alteredqualia.com/
 * @author mr.doob / http://mrdoob.com/
 *
 * optimized by ChiChou http://chichou.0ginr.com
 */

var Detector = {

    canvas: !!window.CanvasRenderingContext2D,
    webgl: (function () {
        try {
            var canvas = document.createElement('canvas');
            return !!window.WebGLRenderingContext && ( canvas.getContext('webgl') ||
                canvas.getContext('experimental-webgl') );
        } catch (e) {
            return false;
        }
    })(),
    workers: !!window.Worker,
    fileapi: window.File && window.FileReader && window.FileList && window.Blob,

    buildMessage: function (id) {
        var element = document.createElement('div');
        element.id = id;

        var style = {
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 'normal',
            textAlign: 'center',
            background: '#fff',
            color: '#000',
            padding: '1.5em',
            width: '400px',
            margin: '5em auto 0'
        };

        for (var rule in style) {
            element.style[rule] = style[rule];
        }

        var cause = window.WebGLRenderingContext ? "显卡" : "浏览器";

        element.innerHTML = [
            '对不起，您的 ', cause, '不支持',
            '<a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>。<br />',
            '更多详情请参考<a href="http://get.webgl.org/" style="color:#000">这里</a>。'
        ].join('');

        return element;
    },

    showAlert: function (parameters) {
        var parent, id, element;

        parameters = parameters || {};
        container = parameters.container || document.body;
        id = parameters.id || 'webgl-not-supported-message';

        element = Detector.buildMessage(id);

        container.appendChild(element);
    }

};

/*!
 * University of Jiangsu 3D StreetView 
 * 
 * Copyright 2014 ChiChou
 * Released under the MIT license
 */

var street = function(container) {
    return new StreetView(container);
}

var StreetView = function (container) {
    if (!Detector.webgl) Detector.showAlert();

    var assert = function (condition, message) {
            if (!condition) throw message || "Invalid argument";
        },
        mergeObject = function () {
            assert(arguments.length >= 2);
            var obj = {}, o;
            for (var i = 0; i < arguments.length; i++) {
                o = arguments[i];
                for (var j in o) {
                    obj[j] = o[j];
                }
            }
            return obj;
        },
        extendObject = function (sub, parent) {
            if (!parent) return sub;
            var obj = {};
            for (var i in parent) {
                obj[i] = (sub.hasOwnProperty(i) ? sub : parent)[i];
            }
            return obj;
        };

    //pre-process arguments
    typeof(container) === "string" && (container = document.querySelector(container));
    assert(container instanceof HTMLElement, "Invalid container.");

    // WEB-GL
    var camera, renderer, scene;
    var vector3, mesh;

    var overRenderer;
    var curZoomSpeed = 0, zoomSpeed = 50;

    var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
    var rotation = { x: 0, y: 0 },
        target = { x: Math.PI * 3 / 2, y: 0},
        targetOnDown = { x: 0, y: 0 };

    var distance = 100, distanceTarget = 0;
    var Y_RANGE = Math.PI / 12, RADIUS = 400, CANVAS_WIDTH = 3200, CANVAS_HEIGHT = 1600;

    var initialized = false;
    var self = this; // instance
    
    var canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),
        texture;
    
    function toggle(image) {
        self.onImageLoad();
        self.image = image;
        var img = new Image(), ratio = 2;
        canvasContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        img.onload = function() {
            self.onImageLoadFinished();
            
            var h = img.height * CANVAS_WIDTH / img.width;
            canvasContext.save();
            canvasContext.translate(CANVAS_WIDTH, 0);
            canvasContext.scale(-1, 1);
            canvasContext.drawImage(img, 0, (CANVAS_HEIGHT - h) / 2, CANVAS_WIDTH, h);
            canvasContext.restore();            
            texture.needsUpdate = true;
            
            self.onImageDrawFinished();
        }
        img.src = image;
    }
    this.toggle = toggle;
    
    // auto spin
    var spinInterval;
    this.spin = function() { this.rotating = true; }
    this.stop = function() { this.rotating = false; }
    function rotate() {
        if(self.rotating && !overRenderer) self.panRight();
    }
    
    // run
    this.view = function(image) {
        init();
        toggle(image)
        animate();
        self.rotating = false;
        setInterval(rotate, 100);
        return this;
    };
    
    // toggle fullscreen
    this.toggleFullScreen = function(e) {
        var e = e || container;
        
        if(e.fullscreenElement || 
          e.mozFullScreenElement ||
          e.webkitFullscreenElement ||
          e.msFullscreenElement) {
          
            (e.exitFullscreen ||
            e.webkitExitFullscreen ||
            e.mozCancelFullScreen ||
            e.msExitFullscreen || function(){}).call(e);
        } else {
            (e.requestFullScreen ||
            e.webkitRequestFullScreen||
            e.mozRequestFullScreen || this.onFullScreenFailed).call(e);
        }
    }
    
    // events
    var events = 'ImageLoad,ImageDrawFinished,ImageLoadFinished,FullscreenFailed'.split(',');
    this.on = this.attach = function(event, handler) {
        self['on' + event] = handler || function(){};
        return self;
    }    
    for(var i=0; i<events.length; i++) {
        this.on(events[i]);
    }
    
    function init() {
        initialized = true;

        var material,
            w = container.offsetWidth || window.innerWidth,
            h = container.offsetHeight || window.innerHeight;

        canvas.width = CANVAS_WIDTH, canvas.height = CANVAS_HEIGHT;

        texture || (texture = new THREE.Texture(canvas));
        
        camera = new THREE.PerspectiveCamera(45, w / h, 100, 1e4);
        camera.position.z = 0;

        vector3 = new THREE.Vector3;
        scene = new THREE.Scene;

        // scene
        geometry = new THREE.SphereGeometry(1e3, 32, 32);
        material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide
        });
        
        texture.needsUpdate = true;
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        
        renderer = new THREE.WebGLRenderer({antialias: true, alpha:true});
        renderer.autoClear = false;
        renderer.setClearColor(0x000000, 0.0);
        renderer.setSize(w, h);
        renderer.domElement.style.position = 'absolute';

        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        //assign events
        container.addEventListener('mousedown', onMouseDown, false);
        container.addEventListener('DOMMouseScroll', onMouseWheel, false);
        container.addEventListener('mousewheel', onMouseWheel, false);
        document.addEventListener('keydown', onDocumentKeyDown, false);
        window.addEventListener('resize', onWindowResize, false);
        container.addEventListener('mouseover', function () {
            overRenderer = true;
        }, false);
        container.addEventListener('mouseout', function () {
            overRenderer = false;
        }, false);

    }
    
    function onMouseDown(event) {
        event.preventDefault();

        container.addEventListener('mousemove', onMouseMove, false);
        container.addEventListener('mouseup', onMouseUp, false);
        container.addEventListener('mouseout', onMouseOut, false);

        mouseOnDown.x = -event.clientX;
        mouseOnDown.y = event.clientY;

        targetOnDown.x = target.x;
        targetOnDown.y = target.y;

        container.style.cursor = 'move';
    }

    function onMouseMove(event) {
        mouse.x = -event.clientX;
        mouse.y = event.clientY;

        var zoomDamp = distance / 10000;

        target.x = targetOnDown.x - (mouse.x - mouseOnDown.x) * zoomDamp;
        target.y = targetOnDown.y - (mouse.y - mouseOnDown.y) * zoomDamp;

        target.y = target.y > Y_RANGE ? Y_RANGE : target.y;
        target.y = target.y < -Y_RANGE ? -Y_RANGE : target.y;
    }

    function onMouseUp(event) {
        container.removeEventListener('mousemove', onMouseMove, false);
        container.removeEventListener('mouseup', onMouseUp, false);
        container.removeEventListener('mouseout', onMouseOut, false);
        container.style.cursor = 'auto';
    }

    function onMouseOut(event) {
        container.removeEventListener('mousemove', onMouseMove, false);
        container.removeEventListener('mouseup', onMouseUp, false);
        container.removeEventListener('mouseout', onMouseOut, false);
    }

    function onMouseWheel(event) {
        event.preventDefault();
        if (overRenderer) {
            zoom(event.wheelDeltaY * 0.3 || event.detail * -10); //Firefox
        }
        return false;
    }
    
    this.zoomIn = function(){return zoom(100), this};
    this.zoomOut = function(){return zoom(-100), this};
    
    var pan = function(offset) {
      //todo: 修改速度算法
      return target.x += offset * 0.005 * distance / 100, this;
    }
    this.panLeft = function(){return pan(2);}
    this.panRight = function(){return pan(-2);}
    
    function onDocumentKeyDown(event) {
        var prevent = true;
        switch (event.keyCode) {
            case 38:
                self.zoomIn();
                break;
            case 40:
                self.zoomOut();
                break;
            case 37:
                self.panLeft();
                break;
            case 39:
                self.panRight();
                break;
            default:
                prevent = false;
        }
        prevent && event.preventDefault();
    }

    function onWindowResize(event) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function zoom(delta) {
        distanceTarget -= delta;
        distanceTarget = distanceTarget > 500 ? 500 : distanceTarget;
        distanceTarget = distanceTarget < 20 ? 20 : distanceTarget;
    }

    function animate() {
        zoom(curZoomSpeed);

        // static
        rotation.x += (target.x - rotation.x) * 0.1;
        rotation.y += (target.y - rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;

        camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y = distance * Math.sin(rotation.y);
        camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

        camera.lookAt(scene.position);

        vector3.copy(camera.position);
        
        renderer.clear();
        renderer.render(scene, camera);
        
        requestAnimationFrame(animate);
    }

    this.animate = animate;
    this.renderer = renderer;
    this.scene = scene;

    return this;
};