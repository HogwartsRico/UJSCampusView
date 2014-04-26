UJSCampusView - 江大街景
===

![截图](https://raw.githubusercontent.com/ChiChou/UJSCampusView/remote/UJSCampusView.png)

这是一个基于 [THREE.js](http://threejs.org/) 的仿 Google 街景程序，需要浏览器和显卡支持 WEBGL。

图片要求
---

场景图片使用鱼眼镜头拍摄，若要达到最佳效果，需要满足宽高比为 2:1。目前使用的规格为3200x1600像素。如果不能满足 2:1 的比例，调整到天空和地面等极端视角时将出现黑边现象。

浏览器要求
---
目前最新版Chrome，Opera，Firefox 和 IE11 都支持 WEBGL。对于低版本的浏览器嘛，为了保证自己的体验，还是赶紧升级吧！

交互
---

* 支持键盘方向键（上下左右）导航
* 支持鼠标拖动视角
* 支持鼠标滚轮放大/缩小
* 支持按钮点击控制视角

编程接口
---

###初始化

    var streetView = street('viewport').view('img/scene.jpg');

###接口

* 切换贴图 `streetView.toggle('img/new/path/to/texture.jpg')`
* 镜头
    * 拉近 `streetView.zoomIn()`
    * 拉远 `streetView.zoomOut()`
    * 左移 `streetView.panLeft()`
    * 右移 `streetView.panRight()`
