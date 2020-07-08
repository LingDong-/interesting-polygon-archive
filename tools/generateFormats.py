import json
from glob import glob

data = {f.split("/")[-1].split(".")[0]:json.loads(open(f,'r').read()) for f in glob("../json/*.json")}

java = ""

for k in data:

	open("../csv/"+k+".csv",'w').write("\n".join([",".join([str(y[0])+","+str(y[1]) for y in x]) for x in data[k]]))

	open("../svg/"+k+".svg",'w').write('<svg version="1.1" xmlns="http://www.w3.org/2000/svg">\n<path d="M'+"z M".join([" L".join([str(y[0])+","+str(y[1]) for y in x]) for x in data[k]])+'z"/>\n</svg>')

	java += "public static final float[][][] POLYGON_"+k.replace("-","_").upper()+"={{"+("},\n\t{".join([",".join(["{"+str(y[0])+","+str(y[1])+"}" for y in x]) for x in data[k]]))+"}};\n\n"

java += "public static final float[][][][] POLYGONS = {"+",".join(["POLYGON_"+k.replace("-","_").upper() for k in data.keys()])+"};\n"
java += "public static final String[] POLYGON_NAMES = {"+",".join(['"'+k+'"' for k in data.keys()])+"};"

open("../hardcode/polygons.java",'w').write(java);
open("renderPolygons/POLYGONS.pde",'w').write(java);