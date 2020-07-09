const { exec } = require('child_process');

const fs = require('fs');
const {triangulate,bridge,visualizeSVG,makeCW,makeCCW} = require("./triangulateMTX.js");

function area(vertices) {
    var n = vertices.length;
    var a = 0;
    for (var i = 0; i < n; i++) {
        a += (vertices[i][0] + vertices[(i + 1) % n][0]) * (vertices[i][1] - vertices[(i + 1) % n][1]);
    }
    return a / 2;
}


var file = process.argv[2]
var data = JSON.parse(fs.readFileSync(file).toString());
if (data.length > 1){
    data[0] = bridge(makeCW(data[0]),data.slice(1).map(makeCCW));
}
polygon = data[0];

let [xmin,xmax,ymin,ymax] = [Infinity,-Infinity,Infinity,-Infinity];
for (let i = 0; i < polygon.length; i++){
    xmin = Math.min(xmin,polygon[i][0]);
    xmax = Math.max(xmax,polygon[i][0]);
    ymin = Math.min(ymin,polygon[i][1]);
    ymax = Math.max(ymax,polygon[i][1]);
}
var trigs = triangulate(polygon);
var [cx,cy] = [0,0]
var ta = 0;
for (let j = 0; j < trigs.length; j+=3){
    let [a,b,c] = [polygon[trigs[j]],polygon[trigs[j+1]],polygon[trigs[j+2]]]

    let [x,y] = [(a[0]+b[0]+c[0])/3, (a[1]+b[1]+c[1])/3]
    let ar = -area([a,b,c]);
    cx += x*ar;
    cy += y*ar;
    ta += ar;
}
cx /= ta;
cy /= ta;

var out = {
    centroid:[cx,cy],
    area:ta,
    bounds:[xmin,ymin,xmax,ymax],
}
console.log(JSON.stringify(out))

