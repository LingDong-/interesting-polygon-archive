String str = "[";

void setup(){
  size(800,800);
  PImage im = loadImage("/Users/admin/Pictures/screenshots/Snip20200708_23.png");
  image(im,0,0,width,height);
}

void draw(){
  
}

void mousePressed(){
  str += "["+(int)mouseX+","+(int)mouseY+"],";
  circle(mouseX,mouseY,10);
  
}
void keyPressed(){
  println(str.substring(0,str.length()-1)+"],");
  str = "[";
}
