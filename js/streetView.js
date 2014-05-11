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

    var camera, renderer, scene;

    var overRenderer;

    var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
    var rotation = { x: 0, y: 0 },
		focus = { x: Math.PI, y: 0},
		focusVector = new THREE.Vector3(),
        target = { x: Math.PI * 3 / 2, y: 0},
        targetOnDown = { x: 0, y: 0 };

    var yRange = Math.PI / 2, RADIUS = 1000;
    var distance = 0, distanceTarget = RADIUS / 2;
    var root = this; // instance
    
    var canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),
        texture;
    
    function toggle(image) {
        root.onImageLoad();
        root.image = image;
        var img = new Image, ratio = 2;
        // canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        
        img.onerror = function() {
            root.onImageLoadError();
            
            canvasContext.fillStyle = "#09f";
            canvasContext.font = "bold 40px Arial";
            canvasContext.fillText("Failed to load Image.", canvas.width / 2, canvas.height / 2);
            
            // todo
        };
        
        img.onload = function() {
            root.onImageLoadFinished();

            var ratio = img.width / img.height;
            
            // var maxWidth = screen.width * 2;
			canvas.width = Math.min(4096, (img.width | 1) - 1);
            console.log("Texture loaded:", img.width, "x", img.height);
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
            root.onImageDrawFinished();
        }
        img.src = image;
    }
    this.toggle = toggle;
    
    // auto spin
    var spinInterval;
    this.spin = function() { this.rotating = true; }
    this.stop = function() { this.rotating = false; }
    function rotate() {
        if(root.rotating && !overRenderer) root.panRight();
    }
    
    // run
    this.view = function(image) {
        init();
        toggle(image);
        animate();
        root.rotating = false;
        setInterval(rotate, 100);
        return this;
    };
    
    // toggle full screen
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
    var events = 'ImageLoad,ImageDrawFinished,ImageLoadFinished,ImageLoadError,FullScreenFailed'.split(',');
    this.on = this.attach = function(event, handler) {
        assert(events.indexOf(event) > -1, "Unsupported event.");
        return root['on' + event] = handler || function(){}, root;
    };
	// assign empty handler;
	var nullFunction = function(){};
	for(var i=0; i<events.length; i++) {
		root.on(events[i], nullFunction);
	}
	
    function init() {
        var material,
            w = container.offsetWidth || window.innerWidth,
            h = container.offsetHeight || window.innerHeight;
		
        canvas.width = screen.height * 2, canvas.height = screen.height;
		
		texture = new THREE.Texture(canvas);        
        camera = new THREE.PerspectiveCamera(30, w / h, RADIUS, RADIUS);
        camera.position.set(0, 0, 0);
		
        scene = new THREE.Scene;

        // scene
        geometry = new THREE.SphereGeometry(1e3, 32, 32);
        material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide
        });
        
        texture.needsUpdate = true;
		
        var mesh = new THREE.Mesh(geometry, material);
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

        target.y = Math.max(Math.min(target.y, yRange), -yRange);
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
            zoom(event.wheelDeltaY * 0.3 || event.wheelDelta * 0.3 || -event.detail);
        }
        return false;
    }
    
    this.zoomIn = function(){return zoom(10), this};
    this.zoomOut = function(){return zoom(-10), this};
    
    var pan = function(offset) {
      target.x += offset * Math.log2(distance) / 64;
	  return this;
    }
    this.panLeft = function(){return pan(1);}
    this.panRight = function(){return pan(-1);}
    
    function onDocumentKeyDown(event) {
        var prevent = true;
        switch (event.keyCode) {
            case 38:
                root.zoomIn();
                break;
            case 40:
                root.zoomOut();
                break;
            case 37:
                root.panLeft();
                break;
            case 39:
                root.panRight();
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
		if(!delta) {
			return;
		}
        distanceTarget -= delta;
        distanceTarget = Math.min(distanceTarget, RADIUS >> 1);
        distanceTarget = Math.max(distanceTarget, 0);
    }

    function animate() {
        // static
        rotation.x += (target.x - rotation.x) * 0.1;
        rotation.y += (target.y - rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;

		focusVector.set(		
			Math.sin(rotation.x) * Math.cos(rotation.y),
			Math.sin(rotation.y),
			Math.cos(rotation.x) * Math.cos(rotation.y)
		)
		
		camera.position.set(
			distance * Math.sin(rotation.x) * Math.cos(rotation.y),
			distance * Math.sin(rotation.y),
			distance * Math.cos(rotation.x) * Math.cos(rotation.y)
		);
        camera.lookAt(focusVector);
        
        renderer.clear();
        renderer.render(scene, camera);
        
        requestAnimationFrame(animate);
    }

    this.animate = animate;
    this.renderer = renderer;
    this.scene = scene;

    return this;
};