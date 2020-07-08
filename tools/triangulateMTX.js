var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
/* ===============================================================================
 * triangulateMTX.ts
 * TypeScript implementation of Mei-Tipper-Xu algorithm for polygon triangulation
 * (c) Lingdong Huang 2020 (MIT License)
 * =============================================================================== */
var triangulateMTX;
(function (triangulateMTX) {
    function triangulate(vertices, params) {
        // Mei-Tipper-Xu algorithm for ear-clipping
        if (params === void 0) { params = {
            sliverThreshold: Math.PI / 4,
            greedyHeuristic: true,
            preTriangulated: null,
            optimizeMaxIter: 9999
        }; }
        // "Ear-clipping Based Algorithms of Generating High-quality Polygon Triangulation"
        // https://arxiv.org/pdf/1212.6038.pdf
        // Paper: "A basic and an improved ear-clipping based algorithm for triangulating 
        // simple polygons and polygons with holes are presented. In the basic version, the 
        // ear with smallest interior angle is always selected to be cut in order to create fewer 
        // sliver triangles. To reduce sliver triangles in further, a bound of angle is set to de-
        // termine whether a newly formed triangle has sharp angles, and edge swapping is 
        // adopted when the triangle is sharp."
        function cross(u, v) {
            return u[0] * v[1] - v[0] * u[1];
        }
        function dot(u, v) {
            return u[0] * v[0] + u[1] * v[1];
        }
        function norm(u) {
            return Math.sqrt(u[0] * u[0] + u[1] * u[1]);
        }
        function vertexAngle(a, b, c) {
            var _a = [
                [a[0] - b[0], a[1] - b[1]],
                [c[0] - b[0], c[1] - b[1]],
            ], u = _a[0], v = _a[1];
            var dt = dot(u, v);
            var cs = dt / (norm(u) * norm(v));
            return Math.acos(cs);
        }
        function basic(pts) {
            // Paper: "Basic Algorithm: The ear clipping triangulation algorithm consists of 
            // searching an ear and then cutting it off from current polygon."
            if (pts.length <= 3) {
                return [[0, 1, 2]];
            }
            var head = null;
            var tail = null;
            for (var i = 0; i < pts.length; i++) {
                var v = {
                    id: i,
                    xy: pts[i],
                    prev: null,
                    next: null,
                    isEar: false,
                    isConvex: false,
                    angle: 0
                };
                if (head == null) {
                    head = v;
                    tail = v;
                }
                else {
                    v.prev = tail;
                    tail.next = v;
                }
                tail = v;
            }
            head.prev = tail;
            tail.next = head;
            function pointInTriangle(p, a, b, c) {
                // on edge counts, but on vertex doesn't count
                function pointInPlane(p, a, b) {
                    return cross([p[0] - a[0], p[1] - a[1]], [b[0] - a[0], b[1] - a[1]]) <= 0;
                }
                return pointInPlane(p, a, b) && pointInPlane(p, b, c) && pointInPlane(p, c, a)
                    //   && !(p==a) && !(p==b) && !(p==c)
                    && !(p[0] == a[0] && p[1] == a[1]) && !(p[0] == b[0] && p[1] == b[1]) && !(p[0] == c[0] && p[1] == c[1]);
            }
            function updateConvexStatus(it) {
                // Paper: "Compute the interior angles on each vertex of P. 
                // If the interior angle on a vertex is less than 180°, 
                // the vertex is convex; Otherwise, reflex. "
                // Computed with cross product in this implementation for efficiency
                var _a = [it.prev.xy, it.xy, it.next.xy], a = _a[0], b = _a[1], c = _a[2];
                var _b = [
                    [b[0] - a[0], b[1] - a[1]],
                    [c[0] - b[0], c[1] - b[1]],
                ], u = _b[0], v = _b[1];
                var cr = cross(u, v);
                it.isConvex = cr > 0;
            }
            function updateEarStatus(it) {
                // Paper: "Three consecutive vertices vi-1, vi, vi+1 of P do form an ear if
                // 1. vi is a convex vertex;
                // 2. the closure C(vi-1, vi, vi+1) of the triangle △(vi-1, vi, vi+1) 
                // does not contain any reflex vertex of P (except possibly vi-1, vi+1). "
                var _a = [it.prev.xy, it.xy, it.next.xy], a = _a[0], b = _a[1], c = _a[2];
                if (it.isConvex) {
                    it.isEar = true;
                    var jt = head;
                    do {
                        if (jt.isConvex) {
                            jt = jt.next;
                            continue;
                        }
                        if (jt.next == it || jt.prev == it || jt == it) {
                            jt = jt.next;
                            continue;
                        }
                        if (pointInTriangle(jt.xy, a, b, c)) {
                            it.isEar = false;
                            break;
                        }
                        jt = jt.next;
                    } while (jt != head);
                }
                else {
                    it.isEar = false;
                }
                if (it.isEar) {
                    it.angle = vertexAngle(a, b, c);
                }
            }
            var it = head;
            do {
                updateConvexStatus(it);
                it = it.next;
            } while (it != head);
            it = head;
            do {
                updateEarStatus(it);
                it = it.next;
            } while (it != head);
            var ears = [];
            for (var n = 0; n < pts.length - 2; n++) {
                // Paper: "Select the ear tip vi which has smallest angle to create a triangle 
                // △(vi-1, vi, vi+1), and then delete the ear tip vi , update the connection 
                // relationship, angle and ear tip status for vi-1 and vi+1."
                var minEar = null;
                it = head;
                do {
                    if (it.isEar && (minEar == null || it.angle < minEar.angle)) {
                        minEar = it;
                        if (!params.greedyHeuristic) {
                            break;
                        }
                    }
                    it = it.next;
                } while (it != head);
                if (minEar == null) { // noooo!!!
                    if (n == pts.length - 3) { // phew
                        minEar = head;
                    }
                    else {
                        var rest = [];
                        it = head;
                        do {
                            rest.push(it.xy);
                            it = it.next;
                        } while (it != head);
                        console.warn("Triangulation failure! Possibly degenerate polygon. Done " + ears.length + "/" + (pts.length - 2) + ", rest:\n", JSON.stringify(rest));
                        return ears;
                    }
                }
                ears.push([minEar.prev.id, minEar.id, minEar.next.id]);
                minEar.prev.next = minEar.next;
                minEar.next.prev = minEar.prev;
                if (minEar == head) {
                    head = minEar.next;
                }
                if (minEar == tail) {
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
        function improve(pts, tris) {
            // Paper: "Improved Algorithm: The basic algorithm tries to avoid creating sliver 
            // triangles. However, in some situations, sliver triangles still appear in triangulations. 
            // Thus, edge swapping is adopted to avoid sliver triangles."
            var _a, _b, _c;
            // In this implementation the optimization is iteratively applied after the basic 
            // triangulation has finished, instead of only for each newly created ear as the paper suggests.
            function findTriangleWithEdge(i, j) {
                for (var k = 0; k < tris.length; k++) {
                    if (tris[k][0] == i && tris[k][1] == j) {
                        return [k, tris[k][2]];
                    }
                    if (tris[k][1] == i && tris[k][2] == j) {
                        return [k, tris[k][0]];
                    }
                    if (tris[k][2] == i && tris[k][0] == j) {
                        return [k, tris[k][1]];
                    }
                }
                return [-1, -1];
            }
            function interiorAngles(a, b, c) {
                return [
                    vertexAngle(c, a, b),
                    vertexAngle(a, b, c),
                    vertexAngle(b, c, a),
                ];
            }
            for (var i = 0; i < tris.length; i++) {
                var _d = [
                    tris[i][0],
                    tris[i][1],
                    tris[i][2]
                ], a = _d[0], b = _d[1], c = _d[2];
                var _e = [
                    pts[a], pts[b], pts[c]
                ], pa = _e[0], pb = _e[1], pc = _e[2];
                var _f = interiorAngles(pa, pb, pc), aa = _f[0], ab = _f[1], ac = _f[2];
                if (isNaN(aa) || isNaN(ab) || isNaN(ac)) { // ew!
                    console.warn("Possible degeneracy encountered during triangulation optimization, aborting...");
                    return false;
                }
                var am = Math.min(aa, ab, ac);
                if (am > params.sliverThreshold) {
                    continue;
                }
                // Paper: "If a new triangle needs to optimize, firstly find out its biggest 
                // interior angle and its opposite edge (the longest edge), and then search 
                // between all the generated triangles to see whether there exists a triangle 
                // that shares the longest edge with the new created triangle."
                var _g = [-1, -1], k = _g[0], d = _g[1];
                var t0 = void 0;
                var t1 = void 0;
                //     /\c
                //    / i\
                //  b/____\a
                //   \  k /
                //    \  /
                //     \/d
                if (aa >= ab && aa >= ac) {
                    _a = findTriangleWithEdge(c, b), k = _a[0], d = _a[1];
                    if (k == -1) {
                        continue;
                    }
                    t0 = [a, b, d];
                    t1 = [d, c, a];
                }
                else if (ab >= aa && ab >= ac) {
                    _b = findTriangleWithEdge(a, c), k = _b[0], d = _b[1];
                    if (k == -1) {
                        continue;
                    }
                    t0 = [b, c, d];
                    t1 = [d, a, b];
                }
                else if (ac >= aa && ac >= ab) {
                    _c = findTriangleWithEdge(b, a), k = _c[0], d = _c[1];
                    if (k == -1) {
                        continue;
                    }
                    t0 = [c, a, d];
                    t1 = [d, b, c];
                }
                // Paper: "If there is one, the two triangles can form a quadrilateral. And then swapping
                // the diagonal of the quadrilateral to see whether the minimum angle of the original
                // pair of triangles is smaller than the minimum one of the new pair of triangles after
                // swapping, if does, which means the new pair of triangles has better quality than
                // the original one, swapping needs to be done; if not, the original triangles must be
                // kept without swapping"
                // Actually we also need to check if the quadrilateral is convex
                var c0 = cross([pts[t0[1]][0] - pts[t0[0]][0], pts[t0[1]][1] - pts[t0[0]][1]], [pts[t0[2]][0] - pts[t0[1]][0], pts[t0[2]][1] - pts[t0[1]][1]]);
                var c1 = cross([pts[t1[1]][0] - pts[t1[0]][0], pts[t1[1]][1] - pts[t1[0]][1]], [pts[t1[2]][0] - pts[t1[1]][0], pts[t1[2]][1] - pts[t1[1]][1]]);
                if (c0 <= 0 || c1 <= 0) {
                    continue;
                }
                var s0 = Math.min.apply(Math, __spreadArrays([am], interiorAngles(pts[tris[k][0]], pts[tris[k][1]], pts[tris[k][2]])));
                var s1 = Math.min.apply(Math, __spreadArrays(interiorAngles(pts[t0[0]], pts[t0[1]], pts[t0[2]]), interiorAngles(pts[t1[0]], pts[t1[1]], pts[t1[2]])));
                if (s1 < 0) {
                    continue;
                }
                if (s1 > s0) {
                    tris[k] = t0;
                    tris[i] = t1;
                    return true;
                }
            }
            return false;
        }
        var tris;
        if (params.preTriangulated == null) {
            tris = basic(vertices);
        }
        else { // chunk 3
            tris = params.preTriangulated.reduce(function (a, _, i, g) { return !(i % 3) ? a.concat([g.slice(i, i + 3)]) : a; }, []);
        }
        for (var i = 0; i < params.optimizeMaxIter; i++) {
            if (!improve(vertices, tris)) {
                break;
            }
        }
        var flat = [];
        tris.map(function (x) { flat.push.apply(flat, x); });
        return flat;
    }
    triangulateMTX.triangulate = triangulate;
    function bridge(outer, holes) {
        // Held's algorithm for bridging holes
        // "FIST: Fast Industrial-Strength Triangulation of Polygons"
        // http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.49.3013&rep=rep1&type=pdf
        function leftMost(pts) {
            var xmin = Infinity;
            var amin = -1;
            for (var i = 0; i < pts.length; i++) {
                if (pts[i][0] < xmin) {
                    amin = i;
                    xmin = pts[i][0];
                }
            }
            return amin;
        }
        function dist2(a, b) {
            return Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2);
        }
        function segmentIntersect(p0, p1, q0, q1) {
            function det(a, b, d, e, i) {
                return a * e * i - b * d * i;
            }
            var d0x = p1[0] - p0[0];
            var d0y = p1[1] - p0[1];
            var d1x = q1[0] - q0[0];
            var d1y = q1[1] - q0[1];
            var vc = d0x * d1y - d0y * d1x;
            var vcn = vc * vc;
            if (vcn == 0) {
                return null;
            }
            var q0_p0 = [q0[0] - p0[0], q0[1] - p0[1]];
            var t = det(q0_p0[0], q0_p0[1], d1x, d1y, vc) / vcn;
            var s = det(q0_p0[0], q0_p0[1], d0x, d0y, vc) / vcn;
            if (t < 0 || t > 1 || s < 0 || s > 1) {
                return null;
            }
            return [t, s];
        }
        // Paper: "Our approach tries to find one bridge in sub-quadratic time. For every island loop we
        // determine its left-most vertex. (...) Then we sort the islands according to their left-most vertices.
        // Starting with the left-most island, all islands are linked with the current outer boundry."
        var holesSorter = holes.map(function (x) { return ([x, leftMost(x)]); });
        holesSorter.sort(function (a, b) { return (a[0][a[1]][0] - b[0][b[1]][0]); });
        var _loop_1 = function (i) {
            // Paper: "Let v be the left-most vertex of an island that is to be linked with the current outer
            // boundary. All vertices of the outer boundry that are left of v are sorted according to
            // increasing distance from v."
            var _a = holesSorter[i], hole = _a[0], leftIndex = _a[1];
            var left = hole[leftIndex];
            var bankSorter = outer.map(function (x, i) { return ([i, (x[0] > left[0]) ? Infinity : dist2(left, x)]); });
            bankSorter.sort(function (a, b) { return (a[1] - b[1]); });
            for (var j = 0; j < bankSorter.length; j++) {
                // Paper: "Starting with the closest vertex, v', we test wheter [v,v'] forms a bridge (diagonal)
                // between the outer boundary and the island loop."
                var bankIndex = bankSorter[j][0];
                var bank = outer[bankIndex];
                var ok = true;
                for (var k = 0; k < outer.length; k++) {
                    if (k == bankIndex || (k + 1) % outer.length == bankIndex) {
                        continue;
                    }
                    if (segmentIntersect(left, bank, outer[k], outer[(k + 1) % outer.length]) != null) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    var wind = hole.slice(leftIndex).concat(hole.slice(0, leftIndex)).concat([hole[leftIndex]]);
                    outer.splice.apply(outer, __spreadArrays([bankIndex, 0, bank], wind));
                    break;
                }
            }
        };
        for (var i = 0; i < holesSorter.length; i++) {
            _loop_1(i);
        }
        return outer;
    }
    triangulateMTX.bridge = bridge;
    function area(vertices) {
        var n = vertices.length;
        var a = 0;
        for (var i = 0; i < n; i++) {
            a += (vertices[i][0] + vertices[(i + 1) % n][0]) * (vertices[i][1] - vertices[(i + 1) % n][1]);
        }
        return a / 2;
    }
    function makeCCW(vertices) {
        if (area(vertices) < 0) {
            return vertices.reverse();
        }
        return vertices;
    }
    triangulateMTX.makeCCW = makeCCW;
    function makeCW(vertices) {
        if (area(vertices) < 0) {
            return vertices;
        }
        return vertices.reverse();
    }
    triangulateMTX.makeCW = makeCW;
    function visualizeSVG(vertices, tris) {
        var _a = [Infinity, -Infinity, Infinity, -Infinity], xmin = _a[0], xmax = _a[1], ymin = _a[2], ymax = _a[3];
        for (var i = 0; i < vertices.length; i++) {
            xmin = Math.min(xmin, vertices[i][0]);
            xmax = Math.max(xmax, vertices[i][0]);
            ymin = Math.min(ymin, vertices[i][1]);
            ymax = Math.max(ymax, vertices[i][1]);
        }
        var _b = [xmax - xmin, ymax - ymin], w = _b[0], h = _b[1];
        var _c = (w < h) ? [600 * w / h, 600] : [600, 600 * h / w], vw = _c[0], vh = _c[1];
        var svg = "\n            <svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" \n                width=\"" + vw + "\" height=\"" + vh + "\" viewBox=\"" + (xmin - 2) + " " + (ymin - 2) + " " + (w + 4) + " " + (h + 4) + "\">";
        svg += "<path d=\"M" + vertices.map(function (x) { return x[0] + " " + x[1]; }).join(" L") + "z\" fill=\"gainsboro\" stroke=\"black\" stroke-width=\"3\" \n                      vector-effect=\"non-scaling-stroke\"/>";
        if (tris != null) {
            svg += "<g fill=\"none\" stroke=\"black\" stroke-width=\"1\">";
            for (var i = 0; i < tris.length; i += 3) {
                var _d = [
                    vertices[tris[i]],
                    vertices[tris[i + 1]],
                    vertices[tris[i + 2]]
                ], a = _d[0], b = _d[1], c = _d[2];
                svg += "<path d=\"M" + a[0] + " " + a[1] + " L" + b[0] + " " + b[1] + " L" + c[0] + " " + c[1] + " z\" \n                              vector-effect=\"non-scaling-stroke\"/>";
            }
            svg += "</g>";
        }
        svg += "</svg>";
        return svg;
    }
    triangulateMTX.visualizeSVG = visualizeSVG;
})(triangulateMTX || (triangulateMTX = {}));
// @ts-ignore
if (typeof module != "undefined") {
    module.exports = triangulateMTX;
}
