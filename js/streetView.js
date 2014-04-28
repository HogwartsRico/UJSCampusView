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

        var css = {
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

        for (var rule in css) {
            element.style[rule] = css[rule];
        }

        var cause = window.WebGLRenderingContext ? "显卡" : "浏览器";

        element.innerHTML = [
            '对不起，您的', cause, '不支持',
            '<a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>。<br />',
            '更多详情请参考<a href="http://get.webgl.org/" style="color:#09f">这里</a>。'
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
    var ORIGIN = new THREE.Vector3;

    var overRenderer;
    var curZoomSpeed = 0, zoomSpeed = 50;

    var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
    var rotation = { x: 0, y: 0 },
        target = { x: Math.PI * 3 / 2, y: 0},
        targetOnDown = { x: 0, y: 0 };

    var yRange = Math.PI / 2, RADIUS = 1000;
    var distance = 0, distanceTarget = RADIUS / 2;

    var initialized = false;
    var self = this; // instance
    
    var canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),
        texture;
    
    function toggle(image) {
        self.onImageLoad();
        self.image = image;
        var img = new Image, ratio = 2;
        // canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        
        img.onerror = function() {
            self.onImageLoadError();
            
            canvasContext.fillStyle = "#09f";
            canvasContext.font = "bold 40px Arial";
            canvasContext.fillText("Failed to load Image.", canvas.width / 2, canvas.height / 2);
            
            // todo
        };
        
        img.onload = function() {
            self.onImageLoadFinished();
            var ratio = img.width / img.height;
            
            // var maxWidth = screen.width * 2;
            canvas.width = img.width > 4096 ? 4096 : (img.width | 1) - 1;
            canvas.height = canvas.width >> 1;
            
            var h = (canvas.width / ratio) >> 0, top = (canvas.height - h) >> 1;
            canvasContext.save();
            canvasContext.translate(canvas.width, 0);
            canvasContext.scale(-1, 1);
            canvasContext.drawImage(img, 0, top, canvas.width, h);
            canvasContext.restore();
            
            // fill the blank
            if(ratio > 2) {
                var canvasProcessor = document.createElement('canvas'),
                    contextProcessor = canvasProcessor.getContext("2d"),
                    imageData;
                
                canvasProcessor.width = canvas.width;
                canvasProcessor.height = 1;

                // header
                imageData = canvasContext.getImageData(0, top, canvas.width, 1);
                contextProcessor.putImageData(imageData, 0, 0);
                canvasContext.putImageData(imageData, 0, 0);
                
                canvasContext.fillStyle = canvasContext.createPattern(canvasProcessor, 'repeat');
                canvasContext.fillRect(0, 0, canvas.width, top);
                
                // footer
                imageData = canvasContext.getImageData(0, top + h - 1, canvas.width, 1);
                contextProcessor.putImageData(imageData, 0, 0);
                canvasContext.fillStyle = canvasContext.createPattern(canvasProcessor, 'repeat');
                canvasContext.fillRect(0, canvas.height - top - 1, canvas.width, top);
                
                // gradient overlay
                // todo: rotate
                var gradient = canvasContext.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, "#fff");
                gradient.addColorStop(top / canvas.height, "rgba(255,255,255,0)");
                gradient.addColorStop(1 - top / canvas.height, "rgba(255,255,255,0)");
                gradient.addColorStop(1, "#fff");
                canvasContext.fillStyle = gradient;
                canvasContext.fillRect(0, 0, canvas.width, canvas.height);

                canvasProcessor = null;
            }
            texture.needsUpdate = true;
            // fire the event
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
    this.toggleFullScreen = function(context) {
        var context = context || container;
        var doc = document;
        
        if(doc.mozFullScreen || doc.webkitFullScreen) {
            (doc.exitFullscreen || doc.webkitCancelFullScreen || doc.mozCancelFullScreen ||
            doc.msExitFullscreen || function(){}).call(doc);
        } else {
            (context.requestFullScreen ||
            context.webkitRequestFullScreen||
            context.mozRequestFullScreen || this.onFullScreenFailed).call(context);
        }
    }
    
    // events
    var events = 'ImageLoad,ImageDrawFinished,ImageLoadFinished,ImageLoadError,FullscreenFailed'.split(',');
    this.on = this.attach = function(event, handler) {
        assert(events.indexOf(event) > -1, "Unsupported event.");
        return self['on' + event] = handler || function(){}, self;
    }
    // assign empty handler;
    for(var i=0; i<events.length; i++) {
        this.on(events[i], function(){});
    }
    
    function init() {
        initialized = true;

        var material,
            w = container.offsetWidth || window.innerWidth,
            h = container.offsetHeight || window.innerHeight;

        canvas.width = screen.height * 2, canvas.height = screen.height;

        texture || (texture = new THREE.Texture(canvas));
        
        camera = new THREE.PerspectiveCamera(30, w / h, RADIUS, RADIUS);
        camera.position.set(0, 0, 0);

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

        var zoomDamp = Math.log(distance) / 1e3;

        target.x = targetOnDown.x - (mouse.x - mouseOnDown.x) * zoomDamp;
        target.y = targetOnDown.y - (mouse.y - mouseOnDown.y) * zoomDamp;

        target.y = target.y > yRange ? yRange : target.y;
        target.y = target.y < -yRange ? -yRange : target.y;
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
      return target.x += offset * Math.log(distance) / 256, this;
    }
    this.panLeft = function(){return pan(1);}
    this.panRight = function(){return pan(-1);}
    
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
        distanceTarget = distanceTarget > RADIUS ? RADIUS : distanceTarget;
        distanceTarget = distanceTarget < 10 ? 10 : distanceTarget;
    }

    function animate() {
        zoom(curZoomSpeed);

        window.target = target;
        // static
        rotation.x += (target.x - rotation.x) * 0.1;
        rotation.y += (target.y - rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;

        camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y = distance * Math.sin(rotation.y);
        camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

        camera.lookAt(ORIGIN);

        // vector3.copy(camera.position);
        
        renderer.clear();
        renderer.render(scene, camera);
        
        requestAnimationFrame(animate);
    }

    this.animate = animate;
    this.renderer = renderer;
    this.scene = scene;

    return this;
};