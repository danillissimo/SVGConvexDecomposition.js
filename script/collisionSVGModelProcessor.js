function CollisionSvgModelProcessor() {
    //private fields================================================================================
    const svgPathParsingResult = { Acceptable: 1 << 1, Critical: 1 << 2 };

    var svgPathRef;
    var characterIndex;

    const skipToCommand = function () {
        for (; svgPathRef.reference.charAt(characterIndex) < '-'; characterIndex++);
        if (svgPathRef.reference.charAt(characterIndex) < 'A') {
            characterIndex--;
        }
    };

    var skipToValue = function () {
        for (;
            (
                svgPathRef.reference.charAt(characterIndex) < '-' ||
                svgPathRef.reference.charAt(characterIndex) > '9'
            );
            characterIndex++);
    };

    var extractSingleValue = function () {
        skipToValue();
        let valueStart = characterIndex;
        for (;
            (
                svgPathRef.reference.charAt(characterIndex) >= '-' &&
                svgPathRef.reference.charAt(characterIndex) <= '9'
            );
            characterIndex++);
        return parseFloat(svgPathRef.reference.substring(valueStart, characterIndex));
    };

    var extractVector = function () {
        return new Vector(extractSingleValue(), extractSingleValue());
    };

    //public fields=================================================================================

    let entity = {
        //нужно так же анализировать, ну идут ли подряд символы, буквы, типа lL0..123,,--000.1
        //dis shet is quite clumsy, yet pretty simple
        testSVGPath: function (svgPathReference) {

            let result = 0;

            const previousCommandCaseIsUnknown = 0;
            const previousCommandCaseIsUpper = 1;
            const previousCommandCaseIsLower = 2;
            let previousCommandCase = previousCommandCaseIsUnknown;

            let mAllowed = true;

            let lastCommand;

            for (let i = 0; i < svgPathReference.reference.length; i++) {
                let symbol = svgPathReference.reference.charAt(i);
                //=============================================
                if (!(
                    symbol == ' ' ||
                    symbol == ',' ||
                    symbol == '-' ||
                    symbol == '.' ||
                    symbol == 'm' ||
                    symbol == 'M' ||
                    symbol == 'l' ||
                    symbol == 'L' ||
                    symbol == 'h' ||
                    symbol == 'H' ||
                    symbol == 'v' ||
                    symbol == 'V' ||
                    symbol == 'q' ||
                    symbol == 'Q' ||
                    symbol == 't' ||
                    symbol == 'T' ||
                    symbol == 'c' ||
                    symbol == 'C' ||
                    symbol == 's' ||
                    symbol == 'S' ||
                    symbol == 'a' ||
                    symbol == 'A' ||
                    symbol == 'z' ||
                    symbol == 'Z' ||
                    (symbol >= '0' && symbol <= '9')
                )) {
                    console.error('Collision SVG-model parser: incomprehensible symbol at position ' + (i + 1));
                    result &= svgPathParsingResult.Critical;
                    continue;
                }
                //=============================================
                if ((symbol == 'm' || symbol == 'M') && !mAllowed) {
                    console.error("Collision SVG-model parser: command '" + symbol + "' at position " + (i + 1) + " is only allowed at the beginning of a path");
                    result &= svgPathParsingResult.Critical;
                }
                //=============================================
                if (
                    //symbol == 'm' ||
                    symbol == 'l' ||
                    symbol == 'h' ||
                    symbol == 'v' ||
                    symbol == 'q' ||
                    symbol == 't' ||
                    symbol == 'c' ||
                    symbol == 's' ||
                    symbol == 'a'
                    //symbol == 'z'
                ) {
                    if (previousCommandCase == previousCommandCaseIsUnknown) {
                        previousCommandCase = previousCommandCaseIsLower;
                    } else if (previousCommandCase != previousCommandCaseIsLower) {
                        console.warn("Collision SVG-model parser: command case switch at " + i + 1 + "(command '" + symbol + "): all command cases are supposed to be the same");
                    }
                    previousCommandCase = previousCommandCaseIsLower;
                    result &= svgPathParsingResult.Acceptable;
                } else if (
                    //symbol == 'M' ||
                    symbol == 'L' ||
                    symbol == 'H' ||
                    symbol == 'V' ||
                    symbol == 'Q' ||
                    symbol == 'T' ||
                    symbol == 'C' ||
                    symbol == 'S' ||
                    symbol == 'A'
                    //symbol == 'Z'
                ) {
                    if (previousCommandCase == previousCommandCaseIsUnknown) {
                        previousCommandCase = previousCommandCaseIsUpper;
                    } else if (previousCommandCase != previousCommandCaseIsUpper) {
                        console.warn("Collision SVG-model parser: command case switch at " + i + 1 + "(command '" + symbol + "): all command cases are supposed to be the same");
                    }
                    previousCommandCase = previousCommandCaseIsUpper;
                    result &= svgPathParsingResult.Acceptable;
                }
                //=============================================
                if (
                    symbol == 'q' ||
                    symbol == 'Q' ||
                    symbol == 't' ||
                    symbol == 'T' ||
                    symbol == 's' ||
                    symbol == 'S' ||
                    symbol == 'a' ||
                    symbol == 'A'
                ) {
                    console.error("Collision SVG-model parser: unsuppotrted command '" + symbol + "' at position " + (i + 1));
                    result &= svgPathParsingResult.Critical;
                }
                //=============================================
                if (
                    symbol == 'm' ||
                    symbol == 'M' ||
                    symbol == 'l' ||
                    symbol == 'L' ||
                    symbol == 'h' ||
                    symbol == 'H' ||
                    symbol == 'v' ||
                    symbol == 'V' ||
                    symbol == 'q' ||
                    symbol == 'Q' ||
                    symbol == 't' ||
                    symbol == 'T' ||
                    symbol == 'c' ||
                    symbol == 'C' ||
                    symbol == 's' ||
                    symbol == 'S' ||
                    symbol == 'a' ||
                    symbol == 'A' ||
                    symbol == 'z' ||
                    symbol == 'Z'
                ) {
                    lastCommand = symbol;
                    mAllowed = false;
                }
                //=============================================
            }
            //=============================================
            if (!(lastCommand == 'z' || lastCommand == 'Z')) {
                console.warn("Collision SVG-model parser: last command is supposed to be 'Z' or 'z'");
                svgPathRef.reference += 'z';
            }
            return result;
        },

        //На случай если захочется работать с настоящими кривыми
        //http://alex-black.ru/article.php?content=114

        parseCollisisonSVGModel: function (svgPathReference, maximumAngleDeviationOfApproximatedCurve = Deg2Rad(3), force = false) {
            //assign argument to inner variable so it becomes visible to inner functions
            svgPathRef = svgPathReference;
            characterIndex = 0;

            let testingResult = this.testSVGPath(svgPathRef);
            if ((testingResult & svgPathParsingResult.Critical) || ((testingResult & svgPathParsingResult.Acceptable) && !force)) {
                return null;
            }

            let vertices = [];

            let previousVertex = new Vector(0, 0);

            skipToCommand();
            let command = svgPathRef.reference.charAt(characterIndex);
            if (command == 'M' || command == 'm') {
                previousVertex = extractVector();
                vertices[vertices.length] = previousVertex;
                skipToCommand();
            }

            if (svgPathRef.reference.charAt(characterIndex) == ' ') {
                if (command == 'M') {
                    command = 'L';
                } else {
                    command = 'l';
                }
            } else {
                command = svgPathRef.reference.charAt(characterIndex);
            }
            cycle:
            for (; ;) {
                switch (command) {
                    case 'L':
                        previousVertex = extractVector();
                        vertices[vertices.length] = previousVertex;
                        break;
                    case 'l':
                        previousVertex = extractVector().add(previousVertex);
                        vertices[vertices.length] = previousVertex;
                        break;
                    case 'H':
                        previousVertex = new Vector(extractSingleValue(), previousVertex.y);
                        vertices[vertices.length] = previousVertex;
                        break;
                    case 'h':
                        previousVertex = new Vector(previousVertex.x + extractSingleValue(), previousVertex.y);
                        vertices[vertices.length] = previousVertex;
                        break;
                    case 'V':
                        previousVertex = new Vector(previousVertex.x, extractSingleValue());
                        vertices[vertices.length] = previousVertex;
                        break;
                    case 'v':
                        previousVertex = new Vector(previousVertex.x, previousVertex.y + extractSingleValue());
                        vertices[vertices.length] = previousVertex;
                        break;
                    case 'C':
                        {
                            let curve = new CubicBezierCurve(
                                previousVertex,
                                extractVector(),
                                extractVector(),
                                extractVector());
                            let approximation = curve.approximate(maximumAngleDeviationOfApproximatedCurve);
                            if (curve.isPoint()) {
                                vertices[vertices.length] = approximation[0];
                            } else {
                                vertices = vertices.concat(approximation.slice(1));
                            };
                            previousVertex = vertices[vertices.length - 1];
                            break;
                        }
                    case 'c':
                        {
                            let curve = new CubicBezierCurve(
                                previousVertex,
                                extractVector().add(previousVertex),
                                extractVector().add(previousVertex),
                                extractVector().add(previousVertex));
                            let approximation = curve.approximate(maximumAngleDeviationOfApproximatedCurve);
                            if (curve.isPoint()) {
                                vertices[vertices.length] = approximation[0];
                            } else {
                                vertices = vertices.concat(approximation.slice(1));
                            };
                            previousVertex = vertices[vertices.length - 1];
                            break;
                        }
                    case 'Z':
                    case 'z':
                        break cycle;
                    default:
                        console.error('Collision SVG-model parser: dafaq is going on O_o\nHow did u do dis?');
                        return;
                }
                skipToCommand();
                if (svgPathRef.reference.charAt(characterIndex) != ' ') {
                    command = svgPathRef.reference.charAt(characterIndex);
                    //иначе команда остается той же, что и была
                }
            }
            return vertices;
        },

        processCollisionSvgModel: function (svgPathReference, maximumAngleDeviationOfApproximatedCurve = Deg2Rad(3), force = false) {
            if (this.testSVGPath(svgPathReference) < svgPathParsingResult.Critical)
                return this.parseCollisisonSVGModel(svgPathReference, maximumAngleDeviationOfApproximatedCurve, force);
            return null;
        },
    }

    return entity;
}