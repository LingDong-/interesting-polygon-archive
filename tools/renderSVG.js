
const { exec } = require('child_process');
try{exec('cp ../../triangulateMTX/triangulateMTX.js triangulateMTX.js')}catch(e){}

const fs = require('fs');
const {triangulate,bridge,visualizeSVG,makeCW,makeCCW} = require("./triangulateMTX.js");
const resultPath = "../render";

function test(){
    var path = "../json"
    var files = fs.readdirSync(path).filter(x=>x.endsWith(".json"));
    
    for (var i = 0; i < files.length; i++){
        if (i % 4 == 0 && i != 0){
            process.stdout.write("|\n");
        }
        process.stdout.write(`| ![](render/${files[i].replace(".json",".svg")}) ${files[i]} `)
        var data = JSON.parse(fs.readFileSync(path+"/"+files[i]).toString());
        if (data.length > 1){
            data[0] = bridge(makeCW(data[0]),data.slice(1).map(makeCCW));
        }
        var trigs = triangulate(data[0]);
        fs.writeFileSync(resultPath+"/"+files[i].replace(".json",".svg"),visualizeSVG(data[0], trigs));
    }
    process.stdout.write("|\n");
}
test();