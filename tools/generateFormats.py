import json
from glob import glob

data = {f.split("/")[-1].split(".")[0]:json.loads(open(f,'r').read()) for f in glob("../json/*.json")}

java = ""

for k in data:

	open("../csv/"+k+".csv",'w').write("\n".join([",".join([str(y[0])+","+str(y[1]) for y in x]) for x in data[k]]))

	open("../svg/"+k+".svg",'w').write('<svg version="1.1" xmlns="http://www.w3.org/2000/svg">\n<path d="M'+"z M".join([" L".join([str(y[0])+","+str(y[1]) for y in x]) for x in data[k]])+'z"/>\n</svg>')

	n = sum(len(x) for x in data[k])
	ply_head = "ply\nformat ascii 1.0\nelement vertex "+str(n)+"\nproperty float x\nproperty float y\nproperty float z\nelement edge "+str(n)+"\nproperty int vertex1\nproperty int vertex2\nend_header"
	ply_vrtx = ""
	ply_edge = ""
	nn = 0
	for x in data[k]:
		for i in range(len(x)):
			ply_vrtx += str(x[i][0])+" "+str(x[i][1])+" 0\n"
			ply_edge += str(nn+i)+" "+str(nn+(i+1)%len(x))+"\n"
		nn += len(x)
	open("../ply/"+k+".ply","w").write(ply_head+"\n"+ply_vrtx+"\n"+ply_edge);

	java += "public static final float[][][] POLYGON_"+k.replace("-","_").upper()+"={{"+("},\n\t{".join([",".join(["{"+str(y[0])+","+str(y[1])+"}" for y in x]) for x in data[k]]))+"}};\n\n"

java += "public static final float[][][][] POLYGONS = {"+",".join(["POLYGON_"+k.replace("-","_").upper() for k in data.keys()])+"};\n"
java += "public static final String[] POLYGON_NAMES = {"+",".join(['"'+k+'"' for k in data.keys()])+"};"

open("../hardcode/polygons.java",'w').write(java);
open("polygon2png/POLYGONS.pde",'w').write(java);