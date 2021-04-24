//immutable
function CubicBezierCurve(startVertex, controlVertexA, controlVertexB, endVertex) {
    //private fields
    var isPoint;
    var isLine;
    var vertices = [startVertex, controlVertexA, controlVertexB, endVertex];

    var getCoordinateAt = function (a, b, c, d, t) {
        return a * Math.pow(1 - t, 3) + 3 * b * t * Math.pow(1 - t, 2) + 3 * c * t * t * (1 - t) + d * t * t * t;
    };

    var doRecursivelyApproximateSegment = function (curve, dc, maxAngleDevation, segmentIndex) {
        //Calc given segment center in percent
        let segmentCenter = (dc.parameters[segmentIndex] + dc.parameters[segmentIndex + 1]) / 2;
        //Calc it's coordinates
        let centralVertex = curve.getPointAt(segmentCenter);
        //Calc angle, built on new point and its neighbours
        let angle = dc.vertices[segmentIndex]
                    .subtract(centralVertex)
                    .angle(
                        dc.vertices[segmentIndex + 1].subtract(centralVertex)
                        );
        //If angle is not satisfying, add the new point to output and recursively process it
        if (angle < Math.PI - maxAngleDevation) {
            dc.parameters.splice(segmentIndex + 1, 0, segmentCenter);
            dc.vertices.splice(segmentIndex + 1, 0, centralVertex);
            doRecursivelyApproximateSegment(curve, dc, maxAngleDevation, segmentIndex + 1);
            doRecursivelyApproximateSegment(curve, dc, maxAngleDevation, segmentIndex);
        }
    }

    //public fields=================================================================================

    let entity = {
        getVertex: function (index) {
            return vertices[index];
        },
        getStartVertex: function () {
            return vertices[0];
        },
        getEndVertex: function () {
            return vertices[3];
        },
        getControlVertex: function (index) {
            return vertices[index + 2];
        },


        isPoint: function () {
            return isPoint;
        },
        isLine: function () {
            return isLine;
        },


        rotate: function (anchor, angle) {
            let result = [];
            let angle_ = new Vector(0, angle);
            for (let i = 0; i < vertices.length; i++) {
                result[i] = polarCoords.toCartesian(
                            polarCoords.fromCartesian(vertices[i], anchor).add(angle_),
                            anchor
                            );
            }
            return new CubicBezierCurve(result[0], result[1], result[2], result[3]);
        },

        move: function (offset) {
            let result = [];
            for (let i = 0; i < vertices.length; i++) {
                result[i] = vertices[i].add(offset);
            }
            return new CubicBezierCurve(result[0], result[1], result[2], result[3]);
        },

        getPointAt: function (t) {
            return new Vector(
                getCoordinateAt(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x, t),
                getCoordinateAt(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y, t)
            )
        },

        approximate: function (maxAngleDeviation = Deg2Rad(3)) {
            //points are handled pretty good, but redundantly
            if (isPoint) {
                return [vertices[0]];
            }
            //force split for the first two times:
            //angle built on 0.5 point is not informative enough
            //angles built on 0.25 and 0.75 can sometimes lead to errors
            let container = {
                vertices: [
                    this.getPointAt(0),
                    this.getPointAt(0.25),
                    this.getPointAt(0.5),
                    this.getPointAt(0.75),
                    this.getPointAt(1)
                ],
                parameters: [
                    0,
                    0.25,
                    0.5,
                    0.75,
                    1
                ]
            };
            //reverse order here and further, because array growth shifts indicies on the right
            doRecursivelyApproximateSegment(this, container, maxAngleDeviation, 3);
            doRecursivelyApproximateSegment(this, container, maxAngleDeviation, 2);
            doRecursivelyApproximateSegment(this, container, maxAngleDeviation, 1);
            doRecursivelyApproximateSegment(this, container, maxAngleDeviation, 0);
            //lines, like points, are handled pretty good, but redundantly
            if (this.isLine()) {
                //find the two most distant from each other vertices, combine them with the very
                //first and last ones, and return them dropping the others
                let a = container.vertices[0];
                let b = container.vertices[container.vertices.length - 1];
                let length = a.subtract(b).lengthSquared();
                for (let i = 1; i < container.vertices.length - 1; i++) {
                    let currentLength = a.subtract(container.vertices[i]).lengthSquared();
                    if (currentLength > length) {
                        b = container.vertices[i];
                        length = currentLength;
                    } else {
                        currentLength = b.subtract(container.vertices[i]).lengthSquared();
                        if (currentLength > length) {
                            a = container.vertices[i];
                            length = currentLength;
                        }
                    }
                }
                return [this.getStartVertex(), a, b, this.getEndVertex()];
            }

            return container.vertices;
        }
    };

    //constructor===================================================================================

    isPoint = (
        vertices[0].x == vertices[1].x &&
        vertices[0].x == vertices[2].x &&
        vertices[0].x == vertices[3].x &&
        vertices[0].y == vertices[1].y &&
        vertices[0].y == vertices[2].y &&
        vertices[0].y == vertices[3].y
    );

    if (!isPoint) {
        let vectorA = vertices[1].subtract(vertices[0]);
        let vectorB = vertices[2].subtract(vertices[1]);
        let vectorC = vertices[3].subtract(vertices[2]);
        //one of vectors may be (0,0), what makes it collinear with any other, so check all possible
        //pairs
        isLine = vectorA.collinear(vectorB) && vectorA.collinear(vectorC) && vectorB.collinear(vectorC);
    }else{
        isLine = false;
    }

    return entity;
}