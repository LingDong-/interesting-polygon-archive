import os
import json
from glob import glob
import cv2
import numpy as np

data = {f.split("/")[-1].split(".")[0]:json.loads(open(f,'r').read()) for f in glob("../json/*.json")}

for k in data:
	print(k)
	cnt = data[k][0]
	d = json.loads(os.popen("node centroidAndArea.js ../json/"+k+".json").read())
	r = cv2.minAreaRect(np.array(cnt));
	e = cv2.minEnclosingCircle(np.array(cnt))

	hull = [int(x[0]) for x in cv2.convexHull(np.array(cnt),returnPoints=False)];

	d['rotatedBoundingBox'] = {'center':r[0],'size':r[1],'angle':r[2]};
	d['boundingCircle'] = {'center':e[0],'radius':e[1]};
	d['hull'] = hull;

	svg = '<svg version="1.1" width="600" height="600" viewBox="'+str(e[0][0]-e[1]*1.25)+' '+str(e[0][1]-e[1]*1.25)+' '+str(e[1]*2.5)+' '+str(e[1]*2.5)+'" xmlns="http://www.w3.org/2000/svg">'
	svg += '<path d="M'+"z M".join([" L".join([str(y[0])+","+str(y[1]) for y in x]) for x in data[k]])+'z" fill="gainsboro" stroke="black" stroke-width="2" vector-effect="non-scaling-stroke"/>'
	svg += '<path d="M'+" L".join([str(cnt[x][0])+","+str(cnt[x][1]) for x in hull])+'z" fill="none" stroke="red" stroke-width="2" vector-effect="non-scaling-stroke"/>'
	svg += '<circle cx="'+str(e[0][0])+'" cy="'+str(e[0][1])+'" r="'+str(e[1])+'" fill="none" stroke="gray" stroke-width="1" vector-effect="non-scaling-stroke"/>'
	svg += '<circle cx="'+str(d['centroid'][0])+'" cy="'+str(d['centroid'][1])+'" r="'+str(e[1]/30)+'" fill="red" stroke="none"/>'
	svg += '<rect x="'+str(d['bounds'][0])+'" y="'+str(d['bounds'][1])+'" width="'+str(d['bounds'][2]-d['bounds'][0])+'" height="'+str(d['bounds'][3]-d['bounds'][1])+'" fill="none" stroke="gray" stroke-width="1" stroke-dasharray="4 1" vector-effect="non-scaling-stroke"/>'
	svg += '<rect x="'+str(-r[1][0]/2)+'" y="'+str(-r[1][1]/2)+'" width="'+str(r[1][0])+'" height="'+str(r[1][1])+'" fill="none" stroke="gray" stroke-width="1" transform="translate('+str(r[0][0])+','+str(r[0][1])+') rotate('+str(float(int(r[2]*10))/10.0)+' 0 0)" vector-effect="non-scaling-stroke"/>'
	svg += '</svg>'
	
	open("../meta/"+k+".json",'w').write(json.dumps(d))
	open("../meta/render/"+k+".svg",'w').write(svg)