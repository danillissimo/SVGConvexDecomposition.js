var polarCoords = (function () {
    return {
        fromCartesian: function (point, anchor = Vector(0, 0)) {
            point = point.subtract(anchor);
            if (point.x != 0 && point.y != 0) {
                let angle = point.angle(new Vector(1, 0));
                if (point.y < 0) {
                    angle = 2 * Math.PI - angle;
                }
                return new Vector(point.length(), angle);
            } else {
                return new Vector(0, 0);
            }
        },

        toCartesian: function (vector, offset = Vector(0, 0)) {
            return new Vector(vector.x * Math.cos(vector.y) + offset.x, vector.x * Math.sin(vector.y) + offset.y);
        }
    }
})();