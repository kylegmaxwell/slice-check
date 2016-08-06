'use-strict';
console.log("main");

var app;
function handleLoad() {
    var viewport = document.querySelector('#viewport');
    app = new App();
    app.initThree(viewport);
}
