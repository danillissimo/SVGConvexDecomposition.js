function VisualisingCollisionModelProcessor(svgCanvas, stepAttemptInterval = 100, autoUpdateInterval = 1000) {
    //A little carnage would remove all the visualising staff, but it will still require a lot of 
    //refactoring anyway, and kinda exists only for demo purposes at the moment, so let it be as it
    //is
    var canStep = false;
    var svg = svgCanvas;
    const SVGns = "http://www.w3.org/2000/svg";
    const markerSizeBase = 6;

    var limiter = {
        x: [document.createElementNS(SVGns, 'path'), document.createElementNS(SVGns, 'path')],
        y: [document.createElementNS(SVGns, 'path'), document.createElementNS(SVGns, 'path')]
    }
    limiter.x[0].setAttribute('d', 'M 0,-1000 L 0,10000');
    limiter.x[0].setAttribute('stroke', 'blue');
    limiter.x[0].setAttribute('stroke-width', 1);
    limiter.x[0].setAttribute('fill-opacity', 0);
    limiter.x[1].setAttribute('d', 'M 0,-1000 L 0,10000');
    limiter.x[1].setAttribute('stroke', 'blue');
    limiter.x[1].setAttribute('stroke-width', 1);
    limiter.x[1].setAttribute('fill-opacity', 0);
    limiter.y[0].setAttribute('d', 'M -1000,0 L 10000,0');
    limiter.y[0].setAttribute('stroke', 'blue');
    limiter.y[0].setAttribute('stroke-width', 1);
    limiter.y[0].setAttribute('fill-opacity', 0);
    limiter.y[1].setAttribute('d', 'M -1000,0 L 10000,0');
    limiter.y[1].setAttribute('stroke', 'blue');
    limiter.y[1].setAttribute('stroke-width', 1);
    limiter.y[1].setAttribute('fill-opacity', 0);
    svg.appendChild(limiter.x[0]);
    svg.appendChild(limiter.x[1]);
    svg.appendChild(limiter.y[0]);
    svg.appendChild(limiter.y[1]);

    var triangleSides = [];
    for (let i = 0; i < 2; i++) {
        let path = document.createElementNS(SVGns, 'path');
        path.setAttribute('fill-opacity', 0);
        path.setAttribute('stroke', 'red');
        path.setAttribute('stroke-width', 4);
        svg.appendChild(path);
        triangleSides[i] = path;
    }


    var result = {
        vertices: {
            cartesian: [],
            polar: [],
        },
        convex: [],
        convexSegments: [],
    };

    var vertices = {
        coordinates: [],
        bendingDirection: {
            convex: NaN,
            concave: NaN,
            byVertex: [],
            markers: [],
        },
        order: {
            byValue: {
                byX: [],
                byY: [],
                byAttribute: function (attributeIndex, index) {
                    if (attributeIndex == 0) {
                        return this.byX[index];
                    } else {
                        return this.byY[index];
                    }
                },
            },
            byIndex: {
                byX: [],
                byY: [],
                byAttribute: function (attributeIndex, index) {
                    if (attributeIndex == 0) {
                        return this.byX[index];
                    } else {
                        return this.byY[index];
                    }
                },
            },
        },
        toProceed: null,

        markers: [],
    };

    //==============================================================================================

    const sortVertices = function () {
        for (let i = 0; i < vertices.coordinates.length; i++) {
            vertices.order.byValue.byX[i] = i;
            vertices.order.byValue.byY[i] = i;
        }

        vertices.order.byValue.byX.sort(function (a, b) {
            return vertices.coordinates[a].x - vertices.coordinates[b].x;
        });
        vertices.order.byValue.byY.sort(function (a, b) {
            return vertices.coordinates[a].y - vertices.coordinates[b].y;
        });

        for (let i = 0; i < vertices.coordinates.length; i++) {
            vertices.order.byIndex.byX[vertices.order.byValue.byX[i]] = i;
            vertices.order.byIndex.byY[vertices.order.byValue.byY[i]] = i;
        }
    }

    //==============================================================================================

    const calculateVertexConvexity = function (previousVertexIndex, vertexIndex, nextVertexIndex) {
        vertices.bendingDirection.byVertex[vertexIndex] = vertices.coordinates[vertexIndex].pointToLineRelation(vertices.coordinates[previousVertexIndex], vertices.coordinates[nextVertexIndex]);
    }

    var rawInflections = [];

    const detectInflection = function (vertexA, vertexB) {
        if (vertices.bendingDirection.byVertex[vertexA] != PointBelongsToLine &&
            vertices.bendingDirection.byVertex[vertexB] != PointBelongsToLine &&
            vertices.bendingDirection.byVertex[vertexA] != vertices.bendingDirection.byVertex[vertexB]
        ) {
            rawInflections[rawInflections.length] = vertexA;
        }
    }

    const calculateConvexityAndInflections = function () {
        //вычисляем выпуклость каждой точки, регистрируеем швы
        //calculate each point's bengindg direction, register inflections
        calculateVertexConvexity(vertices.coordinates.length - 1, 0, 1);

        for (let i = 1; i < vertices.coordinates.length - 1; i++) {
            calculateVertexConvexity(i - 1, i, i + 1);
            detectInflection(i, i - 1);
        }
        //можно внести в вышестоящий цикл, если использовать зацикленность списка точек для обработки
        //handle end-start seam manually, coud be done automaticaly using vertex list cyclicality
        calculateVertexConvexity(vertices.coordinates.length - 2, vertices.coordinates.length - 1, 0);
        detectInflection(vertices.coordinates.length - 1, vertices.coordinates.length - 2);
        detectInflection(0, vertices.coordinates.length - 1);

        //находим любую самую (здесь - левую, взято от балды) крайнюю точку и принимаем ее 
        //направление выпуклости за направление выпуклости наружу
        //find any most extreme point (here - left; why? because.) to detect concavity direction
        for (let i = 0; ; i++) {
            //skip all flat vertices
            if (vertices.bendingDirection.byVertex[vertices.order.byValue.byX[i]] != PointBelongsToLine) {
                vertices.bendingDirection.convex = vertices.bendingDirection.byVertex[vertices.order.byValue.byX[i]]
                break;
            }
        }
        if (vertices.bendingDirection.convex == PointIsToTheLeftOfLine) {
            vertices.bendingDirection.concave = PointIsToTheRightOfLine;
        } else {
            vertices.bendingDirection.concave = PointIsToTheLeftOfLine;
        }

        //регистрируем как перегибы исключительно вогнутые точки, т.к. с них начинается строительство полигонов
        //register only concave vertices as inflections, as builidng of shards begins from them
        for (let i = 0; i < rawInflections.length; i++) {
            let index = rawInflections[i];

            if (vertices.bendingDirection.byVertex[rawInflections[i]] != vertices.bendingDirection.concave) {
                //travesing only raw inflections, so test both neighbours
                switch (index) {
                    //lazy inefficient manual handling of cycle seam
                    case 0:
                        if (vertices.bendingDirection.byVertex[1] == vertices.bendingDirection.concave) {
                            index++;
                        } else {
                            index = vertices.coordinates.length - 1;
                        }
                        break;
                    case vertices.coordinates.length - 1:
                        if (vertices.bendingDirection.byVertex[0] == vertices.bendingDirection.concave) {
                            index = 0;
                        } else {
                            index--;
                        }
                        break;
                    default:
                        if (vertices.bendingDirection.byVertex[rawInflections[i] - 1] == vertices.bendingDirection.concave) {
                            index--;
                        } else {
                            index++;
                        }
                        break;
                }
            }
            if (!vertices.toProceed.vertexRegisteredAsInflection(index)) {
                vertices.toProceed.registerInflection(index);
            }
        }

        //визуализируем изгибы вершин
        //visualise preprocessing results
        for (let i = 0; i < vertices.coordinates.length; i++) {
            let color;
            if (vertices.bendingDirection.byVertex[i] == vertices.bendingDirection.convex) {
                color = 'white';
            } else if (vertices.bendingDirection.byVertex[i] == vertices.bendingDirection.concave) {
                color = 'blue';
            } else {
                color = 'grey';
            }
            vertices.bendingDirection.markers[i] = createMarker(i, markerSizeBase, color, 1);
        }
        /*
        for(let i = 0; i < vertices.coordinates.length; i++){
            svg.removeChild(vertices.bendingDirection.markers[i]);
        }
        */
    }

    //==============================================================================================
    const LAYER_ALL = 0;
    const LAYER_INFLECTIONS = 1;

    var polygon = {
        indices: [],
        constructionDirection: NaN,
    }

    //try build a valid triangle from given inflection
    //next successive triangles will join this one
    const buildBasicPolygon = async function (vertexIndex) {
        vertices.markers[vertices.markers.length] = createMarker(vertexIndex, markerSizeBase / 2, 'orange');
        let previousNeighbor = vertices.toProceed.indices[vertexIndex].inLayer[LAYER_ALL].previous();
        let nextNeighbor = vertices.toProceed.indices[vertexIndex].inLayer[LAYER_ALL].next();
        polygon.indices = [];
        await pause();
        if (vertices.bendingDirection.byVertex[previousNeighbor] == vertices.bendingDirection.convex) {
            polygon.constructionDirection = NEIGHBOR_PREVIOUS;
            polygon.indices = [vertexIndex, previousNeighbor];
            vertices.markers[vertices.markers.length] = createMarker(previousNeighbor, markerSizeBase / 2, 'black');
            await pause();
            let testingResult = await testNextVertexForPolygon(vertexIndex);
            if (testingResult.vertexAcceptable) {
                polygon.indices[2] = testingResult.vertexIndex;
            }
        }
        if (polygon.indices.length < 3 && vertices.bendingDirection.byVertex[nextNeighbor] == vertices.bendingDirection.convex) {
            polygon.constructionDirection = NEIGHBOR_NEXT;
            polygon.indices = [vertexIndex, nextNeighbor];
            svg.removeChild(vertices.markers[vertices.markers.length - 1]);
            vertices.markers[vertices.markers.length - 1] = createMarker(nextNeighbor, markerSizeBase / 2, 'black');
            await pause();
            testingResult = await testNextVertexForPolygon(vertexIndex);
            if (testingResult.vertexAcceptable) {
                polygon.indices[2] = testingResult.vertexIndex;
            }
        }
        if(polygon.indices.length<3){
            polygon.indices = [];
        }
    }


    const testNextVertexForPolygon = async function (controlVertexIndex) {
        //добираем одну точку в найденном направлении и тестируем получившийся треугольник
        //pick next vertex in found direction and test a resulting triangle
        let testedVertex = vertices.toProceed.indices[polygon.indices[polygon.indices.length - 1]].inLayer[LAYER_ALL].neighbor[polygon.constructionDirection];
        vertices.markers[vertices.markers.length] = createMarker(testedVertex, markerSizeBase / 2, 'green');
        triangleSides[0].setAttribute('d', 'M' +
            vertices.coordinates[polygon.indices[polygon.indices.length - 1]].x +
            ',' +
            vertices.coordinates[polygon.indices[polygon.indices.length - 1]].y +
            'L' +
            vertices.coordinates[controlVertexIndex].x +
            ',' +
            vertices.coordinates[controlVertexIndex].y);
        triangleSides[1].setAttribute('d', 'M' +
            vertices.coordinates[testedVertex].x +
            ',' +
            vertices.coordinates[testedVertex].y +
            'L' +
            vertices.coordinates[controlVertexIndex].x +
            ',' +
            vertices.coordinates[controlVertexIndex].y);
        await pause();
        //проверять, попадает ли получающийся треугольник в исходную фигуру, не надо
        //т.к. многоугольник начинает строиться с вогнутой точки, ситуации, когда первый треугольник 
        //окажется снаружи фигуры просто невозможны
        //для таких ситуаций надо начинать строить многоугольник с выпуклой точки
        //
        //don't need to test the very first triangle
        //it contains at least one concave point, what guarantees that all triangle's sides will be
        //within the original figure
        //==========================================================================================
        //проверяем, попадают ли в получившийся треугольник другие точки
        //check if any other vertices falls into the triangle
        let indicesByX;
        let indicesByY;
        with (vertices.order.byIndex) {
            indicesByX = [
                byX[polygon.indices[polygon.indices.length - 1]],
                byX[controlVertexIndex], 
                byX[testedVertex]
            ];
            indicesByY = [
                byY[polygon.indices[polygon.indices.length - 1]],
                byY[controlVertexIndex], 
                byY[testedVertex]
            ];
        }
        const numericalComparator = function (a, b) {
            return a - b;
        }
        indicesByX.sort(numericalComparator);
        indicesByY.sort(numericalComparator);
        let trinagleIsEmpty = true;
        //выбираем меньший набор точек
        //select the lesser set
        let indices;
        let vectorAttribute;
        if (indicesByX[2] - indicesByX[0] < indicesByY[2] - indicesByY[0]) {
            indices = indicesByX;
            vectorAttribute = 0;
            limiter.x[0].setAttribute('transform', 'translate(' + vertices.coordinates[vertices.order.byValue.byX[indices[0]]].x + ' 0)');
            limiter.x[1].setAttribute('transform', 'translate(' + vertices.coordinates[vertices.order.byValue.byX[indices[2]]].x + ' 0)');
        } else {
            indices = indicesByY;
            vectorAttribute = 1;
            limiter.y[0].setAttribute('transform', 'translate(0 ' + vertices.coordinates[vertices.order.byValue.byY[indices[0]]].y + ')');
            limiter.y[1].setAttribute('transform', 'translate(0 ' + vertices.coordinates[vertices.order.byValue.byY[indices[2]]].y + ')');
        }

        let marker = createMarker(0, markerSizeBase * 2, 'red', 1, 'red', 0);

        //traverse all points, that potentially can fall into the tested triangle
        for (let index = indices[0] + 1; index < indices[2]; index++) {
            marker.setAttribute('cx', vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)].x);
            marker.setAttribute('cy', vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)].y);
            await pause();
            if (
                index != indices[1] &&
                vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)]
                    .pointBelongsToTriangle
                    (
                        vertices.coordinates[polygon.indices[polygon.indices.length - 1]],
                        vertices.coordinates[controlVertexIndex],
                        vertices.coordinates[testedVertex]
                    )
            ) {
                trinagleIsEmpty = false;
                marker.setAttribute('fill-opacity', 1);
                await pause();
                break;
            }
        }
        //может сложиться так, что какая-то точка будет иметь координату совпадающую с координатой 
        //вершин в начале или конце отрезка. при этом она может не попасть в перебираемый отрезок, 
        //т.к. будет стоять раньше начала интервала или позже его конца. так что обязательно надо
        //проводить дополнительный поиск вширь вокруг отрезка, и тестировать все такие точки
        //
        //it is possible, that some points' coordinate can match the coordinate of an edge-vertex
        //but they gona be skipped due to greater/smalle indices. gotta search for them round the 
        //selected set manually

        //test 'left' side if there's anything to the 'left'
        if ((indices[0] != 0) && trinagleIsEmpty) {
            for (let index = indices[0] - 1;
                vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)]
                    .getAttribute(vectorAttribute) == 
                vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, indices[0])]
                    .getAttribute(vectorAttribute);
                index--) {
                marker.setAttribute('cx', vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)].x);
                marker.setAttribute('cy', vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)].y);
                await pause();
                if (vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)].pointBelongsToTriangle
                    (
                        vertices.coordinates[polygon.indices[polygon.indices.length - 1]],
                        vertices.coordinates[controlVertexIndex],
                        vertices.coordinates[testedVertex]
                    )) {
                    trinagleIsEmpty = false;
                    marker.setAttribute('fill-opacity', 1);
                    break;
                }
            }
        }
        //test 'right' side if there's anything to the 'right'
        if ((indices[2] != vertices.coordinates.length - 1) && trinagleIsEmpty) {
            for (let index = indices[2] + 1;
                vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)].getAttribute(vectorAttribute)
                ==
                vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, indices[0])].getAttribute(vectorAttribute);
                index++) {
                marker.setAttribute('cx', vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)].x);
                marker.setAttribute('cy', vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)].y);
                if (vertices.coordinates[vertices.order.byValue.byAttribute(vectorAttribute, index)].pointBelongsToTriangle
                    (
                    vertices.coordinates[polygon.indices[polygon.indices.length - 1]],
                    vertices.coordinates[controlVertexIndex],
                    vertices.coordinates[testedVertex]
                    )) {
                    trinagleIsEmpty = false;
                    marker.setAttribute('fill-opacity', 1);
                    await pause();
                    break;
                }
            }
        }
        svg.removeChild(marker);
        limiter.y[0].setAttribute('transform', 'translate(0,0)');
        limiter.y[1].setAttribute('transform', 'translate(0,0)');
        limiter.x[0].setAttribute('transform', 'translate(0,0)');
        limiter.x[1].setAttribute('transform', 'translate(0,0)');

        if (!trinagleIsEmpty) {
            svg.removeChild(vertices.markers[vertices.markers.length - 1]);
            vertices.markers.length--;
        }

        return {
            vertexAcceptable: trinagleIsEmpty,
            vertexIndex: testedVertex,
        };
    }

    const updateSeamVertexStatus = function (vertexIndex) {
        let previousVertex = vertices.toProceed.indices[vertexIndex].inLayer[LAYER_ALL].previous();
        let nextVertex = vertices.toProceed.indices[vertexIndex].inLayer[LAYER_ALL].next();
        calculateVertexConvexity(previousVertex, vertexIndex, nextVertex);
        vertices.bendingDirection.markers[vertexIndex].setAttribute(
            'fill',
            (vertices.bendingDirection.byVertex[vertexIndex] == vertices.bendingDirection.convex) ? 
                ('white') : 
                ('blue')
        );
        if (vertices.bendingDirection.byVertex[vertexIndex] == vertices.bendingDirection.concave) {
            if (!vertices.toProceed.vertexRegisteredAsInflection(vertexIndex)) {
                vertices.toProceed.registerInflection(vertexIndex);
            }
        } else {
            if (vertices.bendingDirection.byVertex[previousVertex] == vertices.bendingDirection.concave && !vertices.toProceed.vertexRegisteredAsInflection(previousVertex)) {
                vertices.toProceed.registerInflection(previousVertex);
            }
            if (vertices.bendingDirection.byVertex[nextVertex] == vertices.bendingDirection.concave && !vertices.toProceed.vertexRegisteredAsInflection(nextVertex)) {
                vertices.toProceed.registerInflection(nextVertex);
            }
            if (vertices.toProceed.vertexRegisteredAsInflection(vertexIndex)) {
                vertices.toProceed.unregisterInflection(vertexIndex);
            }
        }
    }
    //==============================================================================================
    const pause = async function () {
        if (autoUpdateInterval > 0) {
            await sleep(autoUpdateInterval);
            return;
        }
        for (; !canStep;) {
            await sleep(stepAttemptInterval);
        }
        canStep = false;
    }

    const createMarker = function (vertexIndex, raduis, color, strokeWidth = 0, stroke = 'black', opacity = 1.0) {
        let marker = document.createElementNS(SVGns, 'circle');
        marker.setAttribute('cx', vertices.coordinates[vertexIndex].x);
        marker.setAttribute('cy', vertices.coordinates[vertexIndex].y)
        marker.setAttribute('r', raduis);
        marker.setAttribute('fill', color);
        marker.setAttribute('stroke', stroke);
        marker.setAttribute('stroke-width', strokeWidth);
        marker.setAttribute('fill-opacity', opacity);
        svg.appendChild(marker);
        return marker;
    }

    return {
        setAutoUpdateInterval: function (newAutoUpdateInterval) {
            autoUpdateInterval = newAutoUpdateInterval;
        },

        setStepAttemptInterval: function (newStepAttemptInterval) {
            stepAttemptInterval = newStepAttemptInterval;
        },

        step: function () {
            canStep = true;
        },

        logLayer1: function () {
            for (let i = 0; i < vertices.toProceed.indices.length; i++) {
                if (vertices.toProceed.vertexRegisteredAsInflection(i)) {
                    console.log(i, ': ', vertices.toProceed.indices[i].inLayer[1].neighbor[0], ' ', vertices.toProceed.indices[i].inLayer[1].neighbor[1]);
                }
            }
        },

        process: async function (Vertices) {
            result = {
                vertices: {
                    cartesian: [],
                    polar: [],
                },
                convex: [],
                convexSegments: [],
            };
            result.vertices.cartesian = Vertices;
            vertices.coordinates = Vertices;
            sortVertices();
            vertices.toProceed = new polyVertexList(Vertices.length);
            calculateConvexityAndInflections();

            //перебираем список швов до тех пор, пока он не обнулится
            //все оставшиеся точки сбиваем в один многоугольник и добавляем как есть - он будет 
            //гарантированно выпуклым
            //
            //traverse inflection list until empty
            //the remaining vertices will form the very last shard
            for (let i = vertices.toProceed.firstInLayer[LAYER_INFLECTIONS];
                vertices.toProceed.firstInLayer[LAYER_INFLECTIONS] != INDEX_INVALID;
                i = vertices.toProceed.indices[i].inLayer[LAYER_INFLECTIONS].next()
            ) {
                await buildBasicPolygon(i);
                if (polygon.indices.length != 0) {
                    //тестируем все подряд точки в определенном направлении
                    //проверяем, попадает ли что-то в треугольники:
                    //1)начальная вогнутая вершина - последняя добавленая вершина - тестируемая вершина
                    //2)вершина после начальной вогнутой - последняя добавленая вершина - тестируемая вершина
                    //второй тест нужен для обнуражения момента, когда начальная вогнутая точка
                    //станет вогнутой для многоугольника, строящегося на ее базе
                    //линия между этими двумя точками как бы образует горизонт, за который никакая 
                    //другая точка зайти не должна. стоит обдумать этот момент внимательнее, т.к.
                    //возможно второй треугольник не требует полного тестирования как первый, то 
                    //есть заменить тестом на преодоление горизонта
                    //
                    //test all vertices in the defined direction
                    //check if anything falls into triangles:
                    //1)first concave vertex - last added vertex - tested vertex
                    //2)first convex vertex after first concave - last added vertex - tested vertex
                    //second test must detect the moment, when the first concave vertex becomes
                    //concave for the shard we are building right now. line, built on the first two
                    //vertices of the shard, forms a kind of horizon, that can't be passed by a
                    //a vertex if it wants to join this shard. this moment should be thought out,
                    //as second test can be probably replaced with halfplain testing

                    //if basic polygon is built on 2 concave vertices, no need in trying to add more
                    if (vertices.bendingDirection.byVertex[polygon.indices[2]] != vertices.bendingDirection.concave) {
                        for (;;) {
                            testingResult = await testNextVertexForPolygon(polygon.indices[1]);
                            if (!testingResult.vertexAcceptable) {
                                break;
                            }
                            testingResult = await testNextVertexForPolygon(polygon.indices[0]);
                            if (testingResult.vertexAcceptable) {
                                polygon.indices[polygon.indices.length] = testingResult.vertexIndex;
                            } else {
                                break;
                            }
                            if (vertices.bendingDirection.byVertex[polygon.indices[polygon.indices.length - 1]] == vertices.bendingDirection.concave) {
                                break;
                            }
                        }
                    }

                    if (result.convexSegments[result.convexSegments.length - 1] == polygon.indices) {
                        autoUpdateInterval = 0;
                        await pause();
                    }
                    result.convexSegments[result.convexSegments.length] = polygon.indices;

                    //visualisation staff
                    let path = document.createElementNS(SVGns, 'path');
                    path.setAttribute('fill', randomColor());
                    path.setAttribute('fill-opacity', 0.5);
                    let string = 'M' + vertices.coordinates[polygon.indices[0]].x + ',' + vertices.coordinates[polygon.indices[0]].y;
                    for (let i = 1; i < polygon.indices.length; i++) {
                        string += 'L' + vertices.coordinates[polygon.indices[i]].x + ',' + vertices.coordinates[polygon.indices[i]].y;
                    }
                    string += 'Z';
                    path.setAttribute('d', string);
                    svg.appendChild(path);
                    
                    //удаляем все добавленные точки, кроме первой и последней
                    //remove all vertices except first and last
                    for (let index = 1; index < polygon.indices.length - 1; index++) {
                        vertices.toProceed.remove(polygon.indices[index]);
                    }
                    //для первой и последней точки пересчитываем выпуклость и регистриуем швы при 
                    //возникновении таковых
                    //test first and last vertices for inflections
                    updateSeamVertexStatus(polygon.indices[0]);
                    updateSeamVertexStatus(polygon.indices[polygon.indices.length - 1]);

                    //visualisation staff
                    for (let i = 0; i < vertices.markers.length; i++) {
                        svg.removeChild(vertices.markers[i]);
                    }
                    vertices.markers.length = 0;
                }
            }
            //добавляем оставшийся выпуклый многоугольник
            //build the very last shard
            let path = 'M' + vertices.coordinates[vertices.toProceed.firstInLayer[LAYER_ALL]].x + ',' + vertices.coordinates[vertices.toProceed.firstInLayer[LAYER_ALL]].y;
            polygon.indices = [vertices.toProceed.firstInLayer[LAYER_ALL]];
            for (let i = vertices.toProceed.indices[vertices.toProceed.firstInLayer[LAYER_ALL]].inLayer[LAYER_ALL].next();
                i != vertices.toProceed.firstInLayer[LAYER_ALL];
                i = vertices.toProceed.indices[i].inLayer[LAYER_ALL].next()
            ) {
                polygon.indices[polygon.indices.length] = i;
                path += 'L' + vertices.coordinates[i].x + ',' + vertices.coordinates[i].y;
            }
            result.convexSegments[result.convexSegments.length] = polygon.indices;
            path += 'Z';
            let poly = document.createElementNS(SVGns, 'path');
            poly.setAttribute('fill-opacity', 0.25);
            poly.setAttribute('fill', randomColor());
            poly.setAttribute('d', path);
            svg.appendChild(poly);
            svg.removeChild(triangleSides[0]);
            svg.removeChild(triangleSides[1]);
            return result;
        }
    }
}