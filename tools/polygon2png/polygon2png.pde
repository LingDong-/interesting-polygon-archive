void setup(){
  size(800,800);
  noSmooth();
  for (int i = 0; i < POLYGONS.length; i++){
    println(POLYGON_NAMES[i]);
    PGraphics pg = createGraphics(800,800);
    pg.beginDraw();
    pg.noSmooth();
    pg.background(0);
    pg.noStroke();
    pg.fill(255);
    pg.beginShape();
    for (int j = 0; j < POLYGONS[i][0].length; j++){ 
      pg.vertex(POLYGONS[i][0][j][0],POLYGONS[i][0][j][1]);
    }
    for (int k = 1; k < POLYGONS[i].length; k++){
      pg.beginContour();
    for (int j = 0; j < POLYGONS[i][k].length; j++){ 
      pg.vertex(POLYGONS[i][k][j][0],POLYGONS[i][k][j][1]);
    }
      pg.endContour();
    }
    pg.endShape();
    pg.endDraw();
    pg.save("../../png/"+POLYGON_NAMES[i]+".png");
  }
}
void draw(){

}
