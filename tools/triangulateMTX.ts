/* ===============================================================================
 * triangulateMTX.ts
 * TypeScript implementation of Mei-Tipper-Xu algorithm for polygon triangulation
 * (c) Lingdong Huang 2020 (MIT License)
 * =============================================================================== */
namespace triangulateMTX{
    export function triangulate(
        vertices : Array<[number,number]>, 
        params   : {sliverThreshold? : number,
                    greedyHeuristic? : boolean,
                    preTriangulated? : Array<number>,
                    optimizeMaxIter? : number}={
            sliverThreshold : Math.PI/4,
            greedyHeuristic : true,
            preTriangulated : null,
            optimizeMaxIter : 9999,
        }) : Array<number> 
    {
        // Mei-Tipper-Xu algorithm for ear-clipping

        // "Ear-clipping Based Algorithms of Generating High-quality Polygon Triangulation"
        // https://arxiv.org/pdf/1212.6038.pdf

        // Paper: "A basic and an improved ear-clipping based algorithm for triangulating 
        // simple polygons and polygons with holes are presented. In the basic version, the 
        // ear with smallest interior angle is always selected to be cut in order to create fewer 
        // sliver triangles. To reduce sliver triangles in further, a bound of angle is set to de-
        // termine whether a newly formed triangle has sharp angles, and edge swapping is 
        // adopted when the triangle is sharp."

        function cross(u:[number,number],v:[number,number]) : number{
            return u[0]*v[1]-v[0]*u[1];
        }
        function dot(u:[number,number],v:[number,number]) : number{
            return u[0]*v[0]+u[1]*v[1];
        }
        function norm(u:[number,number]) : number{
            return Math.sqrt(u[0]*u[0]+u[1]*u[1])
        }
        function vertexAngle(a:[number,number],b:[number,number],c:[number,number]) : number{
            let [u,v] : [[number,number],[number,number]] = [
                [a[0]-b[0],a[1]-b[1]],
                [c[0]-b[0],c[1]-b[1]],
            ]
            let dt : number = dot(u,v);
            let cs : number = dt / (norm(u)*norm(v));
            return Math.acos(cs);
        }

        function basic(pts:Array<[number,number]>) : Array<[number,number,number]> {
            // Paper: "Basic Algorithm: The ear clipping triangulation algorithm consists of 
            // searching an ear and then cutting it off from current polygon."

            if (pts.length <= 3){
                return [[0,1,2]];
            }
            type Vertex = {
                id      : number,
                xy      : [number,number],
                prev    : Vertex,
                next    : Vertex,
                isEar   : boolean,
                isConvex: boolean,
                angle   : number,
            };
            let head : Vertex = null;
            let tail : Vertex = null;
            for (var i = 0; i < pts.length; i++){
                let v : Vertex = {
                    id      : i,
                    xy      : pts[i],
                    prev    : null,
                    next    : null,
                    isEar   : false,
                    isConvex: false,
                    angle   : 0,
                };
                if (head == null){
                    head = v;
                    tail = v;
                }else{
                    v.prev = tail;
                    tail.next = v;
                }
                tail = v;
            }
            head.prev = tail;
            tail.next = head;
            
            function pointInTriangle(p:[number,number],a:[number,number],b:[number,number],c:[number,number]) : boolean {
                // on edge counts, but on vertex doesn't count

                function pointInPlane(p:[number,number],a:[number,number],b:[number,number]) : boolean {
                    return cross([p[0]-a[0],p[1]-a[1]],[b[0]-a[0],b[1]-a[1]]) <= 0;
                }
                return pointInPlane(p,a,b) && pointInPlane(p,b,c) && pointInPlane(p,c,a) 
                //   && !(p==a) && !(p==b) && !(p==c)
                  && !(p[0]==a[0]&&p[1]==a[1]) && !(p[0]==b[0]&&p[1]==b[1]) && !(p[0]==c[0]&&p[1]==c[1]) ;
            }
            function updateConvexStatus(it:Vertex) : void{
                // Paper: "Compute the interior angles on each vertex of P. 
                // If the interior angle on a vertex is less than 180°, 
                // the vertex is convex; Otherwise, reflex. "
                
                // Computed with cross product in this implementation for efficiency

                let [a,b,c] : [[number,number],[number,number],[number,number]] = [it.prev.xy,it.xy,it.next.xy];
                let [u,v] : [[number,number],[number,number]] = [
                    [b[0]-a[0],b[1]-a[1]],
                    [c[0]-b[0],c[1]-b[1]],
                ]
                let cr : number = cross(u,v);
                it.isConvex = cr > 0;
            }
            function updateEarStatus(it:Vertex) : void{
                // Paper: "Three consecutive vertices vi-1, vi, vi+1 of P do form an ear if
                // 1. vi is a convex vertex;
                // 2. the closure C(vi-1, vi, vi+1) of the triangle △(vi-1, vi, vi+1) 
                // does not contain any reflex vertex of P (except possibly vi-1, vi+1). "

                let [a,b,c] : [[number,number],[number,number],[number,number]] = [it.prev.xy,it.xy,it.next.xy];
                if (it.isConvex){
                    it.isEar = true;
                    let jt : Vertex = head;
                    do{
                        if (jt.isConvex){
                            jt = jt.next;
                            continue;
                        }
                        if (jt.next == it || jt.prev == it || jt == it){
                            jt = jt.next;
                            continue;
                        }
                        if (pointInTriangle(jt.xy,a,b,c)){
                            it.isEar = false;
                            break;
                        }
                        jt = jt.next;
                    }while(jt != head);
                }else{
                    it.isEar = false;
                }
                if (it.isEar){
                    it.angle = vertexAngle(a,b,c);
                }
            }
            let it : Vertex = head;
            do{
                updateConvexStatus(it);
                it = it.next;
            }while(it != head);

            it = head;
            do{
                updateEarStatus(it);
                it = it.next;
            }while(it != head);

            let ears   : Array<[number,number,number]> = [];

            for (let n : number = 0; n < pts.length-2; n++ ) {
                // Paper: "Select the ear tip vi which has smallest angle to create a triangle 
                // △(vi-1, vi, vi+1), and then delete the ear tip vi , update the connection 
                // relationship, angle and ear tip status for vi-1 and vi+1."

                let minEar : Vertex = null;
                it = head;

                do{
                    if (it.isEar && (minEar == null || it.angle < minEar.angle)){
                        minEar = it;
                        if (!params.greedyHeuristic){
                            break;
                        }
                    }
                    it = it.next;
                }while(it != head);
                
                if (minEar == null){ // noooo!!!
                    if (n == pts.length-3){ // phew
                        minEar = head;
                    }else{
                        let rest : Array<[number,number]> = [];
                        it = head; do { rest.push(it.xy); it = it.next; } while(it != head);
                        console.warn(`Triangulation failure! Possibly degenerate polygon. Done ${ears.length}/${pts.length-2}, rest:\n`,
                            JSON.stringify(rest));
                        return ears;
                    }
                }
                ears.push([minEar.prev.id,minEar.id,minEar.next.id]);
                minEar.prev.next = minEar.next;
                minEar.next.prev = minEar.prev;

                if (minEar == head){
                    head = minEar.next;
                }
                if (minEar == tail){
                    tail = minEar.prev;
                }
                updateConvexStatus(minEar.prev);
                updateConvexStatus(minEar.next);
                updateEarStatus(minEar.prev);
                updateEarStatus(minEar.next);

                // update all vertices (shouldn't be necessary, thus commented out)
                // it = head; do { updateConvexStatus(it); it = it.next; } while(it != head);
                // it = head; do { updateEarStatus(it);    it = it.next; } while(it != head);

            }
            return ears;
        }

        function improve(pts:Array<[number,number]>,tris:Array<[number,number,number]>) : boolean{
            
            // Paper: "Improved Algorithm: The basic algorithm tries to avoid creating sliver 
            // triangles. However, in some situations, sliver triangles still appear in triangulations. 
            // Thus, edge swapping is adopted to avoid sliver triangles."

            // In this implementation the optimization is iteratively applied after the basic 
            // triangulation has finished, instead of only for each newly created ear as the paper suggests.

            function findTriangleWithEdge(i:number, j:number) : [number,number]{
                for (let k : number = 0; k < tris.length; k++){
                    if (tris[k][0] == i && tris[k][1] == j){ return [k,tris[k][2]]; }
                    if (tris[k][1] == i && tris[k][2] == j){ return [k,tris[k][0]]; }
                    if (tris[k][2] == i && tris[k][0] == j){ return [k,tris[k][1]]; }
                }
                return [-1,-1];
            }
            function interiorAngles(a:[number,number],b:[number,number],c:[number,number]) : [number,number,number]{
                return [
                    vertexAngle(c,a,b),
                    vertexAngle(a,b,c),
                    vertexAngle(b,c,a),
                ];
            }
            for (let i : number = 0; i < tris.length; i++){
                let [a,b,c] : [number,number,number] = [
                    tris[i][0],
                    tris[i][1],
                    tris[i][2]
                ];
                let [pa,pb,pc] : [[number,number],[number,number],[number,number]] = [
                    pts[a],pts[b],pts[c]
                ];
                let [aa,ab,ac] : [number,number,number] = interiorAngles(pa,pb,pc);
                if (isNaN(aa) || isNaN(ab) || isNaN(ac)){ // ew!
                    console.warn(`Possible degeneracy encountered during triangulation optimization, aborting...`);
                    return false;
                }
                let am : number = Math.min(aa,ab,ac);
                if (am > params.sliverThreshold){
                    continue;
                }
                // Paper: "If a new triangle needs to optimize, firstly find out its biggest 
                // interior angle and its opposite edge (the longest edge), and then search 
                // between all the generated triangles to see whether there exists a triangle 
                // that shares the longest edge with the new created triangle."
                let [k,d] : [number,number] = [-1,-1];
                let t0 : [number,number,number];
                let t1 : [number,number,number];
                //     /\c
                //    / i\
                //  b/____\a
                //   \  k /
                //    \  /
                //     \/d
                if       (aa >= ab && aa >= ac){
                    [k,d] = findTriangleWithEdge(c,b);
                    if (k == -1){continue;}
                    t0 = [a,b,d];
                    t1 = [d,c,a];
                }else if (ab >= aa && ab >= ac){
                    [k,d] = findTriangleWithEdge(a,c);
                    if (k == -1){continue;}
                    t0 = [b,c,d];
                    t1 = [d,a,b];
                }else if (ac >= aa && ac >= ab){
                    [k,d] = findTriangleWithEdge(b,a);
                    if (k == -1){continue;}
                    t0 = [c,a,d];
                    t1 = [d,b,c];
                }
                // Paper: "If there is one, the two triangles can form a quadrilateral. And then swapping
                // the diagonal of the quadrilateral to see whether the minimum angle of the original
                // pair of triangles is smaller than the minimum one of the new pair of triangles after
                // swapping, if does, which means the new pair of triangles has better quality than
                // the original one, swapping needs to be done; if not, the original triangles must be
                // kept without swapping"

                // Actually we also need to check if the quadrilateral is convex
                let c0 : number = cross(
                    [pts[t0[1]][0]-pts[t0[0]][0],pts[t0[1]][1]-pts[t0[0]][1]],
                    [pts[t0[2]][0]-pts[t0[1]][0],pts[t0[2]][1]-pts[t0[1]][1]]
                );
                let c1 : number = cross(
                    [pts[t1[1]][0]-pts[t1[0]][0],pts[t1[1]][1]-pts[t1[0]][1]],
                    [pts[t1[2]][0]-pts[t1[1]][0],pts[t1[2]][1]-pts[t1[1]][1]]
                );
                if (c0 <= 0 || c1 <= 0){
                    continue;
                }

                let s0 : number = Math.min(
                    am,
                    ...interiorAngles(pts[tris[k][0]],pts[tris[k][1]],pts[tris[k][2]])
                )
                let s1 : number = Math.min(
                    ...interiorAngles(pts[t0[0]],pts[t0[1]],pts[t0[2]]),
                    ...interiorAngles(pts[t1[0]],pts[t1[1]],pts[t1[2]])
                );
                if (s1 < 0){
                    continue;
                }
                if (s1 > s0){
                    tris[k] = t0;
                    tris[i] = t1;
                    return true;
                }
            
            }
            return false;
        }
        let tris : Array<[number,number,number]>;
        if (params.preTriangulated == null){
            tris = basic(vertices);
        }else{ // chunk 3
            tris = params.preTriangulated.reduce((a,_,i,g) => !(i % 3) ? a.concat([g.slice(i,i+3)]) : a, []);
        }
        for (let i : number = 0; i < params.optimizeMaxIter; i++){
            if (!improve(vertices,tris)){
                break;
            }
        }
        let flat : Array<number> = [];
        tris.map((x:[number,number,number])=>{flat.push(...x)});

        return flat;
    }


    export function bridge(
        outer : Array<[number,number]>,
        holes : Array<Array<[number,number]>>
    ) : Array<[number,number]>
    {
        // Held's algorithm for bridging holes

        // "FIST: Fast Industrial-Strength Triangulation of Polygons"
        // http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.49.3013&rep=rep1&type=pdf

        function leftMost(pts:Array<[number,number]>) : number{
            let xmin : number = Infinity;
            let amin : number = -1;
            for (let i : number = 0; i < pts.length; i++){
                if (pts[i][0] < xmin){
                    amin = i;
                    xmin = pts[i][0];
                }
            }
            return amin;
        }

        function dist2(a:[number,number],b:[number,number]):number{
            return Math.pow(a[0]-b[0],2)+Math.pow(a[1]-b[1],2);
        }

        function segmentIntersect(p0:[number,number], p1:[number,number], q0:[number,number], q1:[number,number]) : [number,number]{
            function det(a:number,b:number,d:number,e:number,i:number):number{
            return a*e*i - b*d*i;
            }
            let d0x : number = p1[0]-p0[0];
            let d0y : number = p1[1]-p0[1];
            let d1x : number = q1[0]-q0[0];
            let d1y : number = q1[1]-q0[1];
            let vc  : number = d0x*d1y-d0y*d1x;
            let vcn : number = vc*vc;
            if (vcn == 0) {
                return null;
            }
            var q0_p0 : [number,number]= [q0[0]-p0[0],q0[1]-p0[1]];
            var t = det(q0_p0[0],q0_p0[1], d1x,d1y, vc)/vcn;
            var s = det(q0_p0[0],q0_p0[1], d0x,d0y, vc)/vcn;

            if (t < 0 || t > 1 || s < 0 || s > 1) {
                return null;
            }
            return [t,s];
        }

        // Paper: "Our approach tries to find one bridge in sub-quadratic time. For every island loop we
        // determine its left-most vertex. (...) Then we sort the islands according to their left-most vertices.
        // Starting with the left-most island, all islands are linked with the current outer boundry."

        let holesSorter : Array<[Array<[number,number]>,number]> = holes.map((x:Array<[number,number]>)=>([x,leftMost(x)]));
        holesSorter.sort((a:[Array<[number,number]>,number],b:[Array<[number,number]>,number])=>(a[0][a[1]][0]-b[0][b[1]][0]));
        
        for (let i : number = 0; i < holesSorter.length; i++){
            // Paper: "Let v be the left-most vertex of an island that is to be linked with the current outer
            // boundary. All vertices of the outer boundry that are left of v are sorted according to
            // increasing distance from v."

            let [hole,leftIndex] : [Array<[number,number]>,number] = holesSorter[i];
            let left : [number,number] = hole[leftIndex];
            let bankSorter : Array<[number,number]> = outer.map((x:[number,number],i:number)=>([i,(x[0]>left[0])?Infinity:dist2(left,x)]));
            bankSorter.sort((a:[number,number],b:[number,number])=>(a[1]-b[1]));

            for (let j : number = 0; j < bankSorter.length; j++){
                
                // Paper: "Starting with the closest vertex, v', we test wheter [v,v'] forms a bridge (diagonal)
                // between the outer boundary and the island loop."

                let bankIndex : number = bankSorter[j][0];
                let bank : [number,number] = outer[bankIndex];
                let ok : boolean = true;

                for (let k : number = 0; k < outer.length; k++){
                    if (k == bankIndex || (k+1)%outer.length == bankIndex){
                        continue;
                    }
                    if (segmentIntersect(left,bank,outer[k],outer[(k+1)%outer.length]) != null){
                        ok = false;
                        break;
                    }
                }
                if (ok){
                    let wind : Array<[number,number]> = hole.slice(leftIndex).concat(hole.slice(0,leftIndex)).concat([hole[leftIndex]]);
                    outer.splice(bankIndex,0,bank,...wind);
                    break;
                }
            }
        }
        return outer;
    }

    function area(vertices : Array<[number,number]>) : number{
        let n : number = vertices.length;
        let a : number = 0;
		for (let i : number = 0; i < n; i++){
			a +=  (vertices[i][0]+vertices[(i+1)%n][0]) * (vertices[i][1]-vertices[(i+1)%n][1]); 
		}
		return a/2;
    }
    export function makeCCW(vertices : Array<[number,number]>) : Array<[number,number]>{
        if (area(vertices) < 0){
            return vertices.reverse();
        }
        return vertices;
    }
    export function makeCW(vertices : Array<[number,number]>) : Array<[number,number]>{
        if (area(vertices) < 0){
            return vertices;
        }
        return vertices.reverse();
    }

    export function visualizeSVG(vertices : Array<[number,number]>, tris : Array<number>) : string {
        let [xmin,xmax,ymin,ymax] : [number,number,number,number] = [Infinity,-Infinity,Infinity,-Infinity];
        for (let i : number = 0; i < vertices.length; i++){
            xmin = Math.min(xmin,vertices[i][0]);
            xmax = Math.max(xmax,vertices[i][0]);
            ymin = Math.min(ymin,vertices[i][1]);
            ymax = Math.max(ymax,vertices[i][1]);
        }
        let [ w, h] : [number,number] = [xmax-xmin,ymax-ymin];
        let [vw,vh] : [number,number] = (w < h) ? [600*w/h,600] : [600,600*h/w];
        let svg : string = `
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" 
                width="${vw}" height="${vh}" viewBox="${xmin-2} ${ymin-2} ${w+4} ${h+4}">`
        svg += `<path d="M${vertices.map(x=>x[0]+" "+x[1]).join(" L")}z" fill="gainsboro" stroke="black" stroke-width="3" 
                      vector-effect="non-scaling-stroke"/>`
        if (tris != null){
            svg += `<g fill="none" stroke="black" stroke-width="1">`;
            for (let i : number = 0; i < tris.length; i+=3){
                let [a,b,c] : [[number,number],[number,number],[number,number]] = [
                    vertices[tris[i]],
                    vertices[tris[i+1]],
                    vertices[tris[i+2]]
                ];
                svg += `<path d="M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]} z" 
                              vector-effect="non-scaling-stroke"/>`
            }
            svg += `</g>`
        }
        svg +=`</svg>`
        return svg;
    }
}

// @ts-ignore
if (typeof module != "undefined"){module.exports = triangulateMTX;}