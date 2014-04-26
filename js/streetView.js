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
    
    var canvas = document.createElement("canvas"),
        context = canvas.getContext("2d"),
        texture;

    var overRenderer;
    var curZoomSpeed = 0, zoomSpeed = 50;

    var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
    var rotation = { x: 0, y: 0 },
        target = { x: Math.PI * 3 / 2, y: 0},
        targetOnDown = { x: 0, y: 0 };

    var distance = 0, distanceTarget = 0;
    var Y_RANGE = Math.PI / 12, RADIUS = 200, CANVAS_WIDTH = 3200, CANVAS_HEIGHT = 1600;

    var initialized = false;
    var self = this; // instance
    
    function toggle(image) {
        this.image = image;
        var img = new Image(), ratio = 2;
        img.onload = function() {
            // TODO: 处理不同长宽比、尺寸的图片
            var w, h;
            if(img.width / img.height > ratio) {
                
            } else {
                
            }
            context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            context.drawImage(img, 0, (CANVAS_HEIGHT - img.height) / 2, CANVAS_WIDTH, img.height);
            texture.needsUpdate = true;
        }
        img.src = image;
    }
    this.toggle = toggle;
    
    function view(image) {
        init();
        toggle(image)
        animate();
        return this;
    }
    this.view = view;
    
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

        var zoomDamp = distance / 100;

        target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
        target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

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
        //webgl

        zoom(curZoomSpeed);

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