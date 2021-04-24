const PointIsToTheLeftOfLine = 0;
const PointBelongsToLine = 1;
const PointIsToTheRightOfLine = 2;

function Vector(x, y) {
    return {
        x: x,
        y: y,

        add: function (vector) {
            return new Vector(this.x + vector.x, this.y + vector.y);
        },

        subtract: function (vector) {
            return new Vector(this.x - vector.x, this.y - vector.y);
        },

        multiplyByVector: function (vector) {
            return new Vector(this.x * vector.x, this.y * vector.y);
        },

        multiplyByValue: function (value) {
            return new Vector(this.x * value, this.y * value);
        },

        divideByVector: function (vector) {
            return new Vector(this.x / vector.x, this.y / vector.y);
        },

        divideByValue: function (value) {
            return new Vector(this.x / value, this.y / value);
        },

        lerp: function (vector, alpha) {
            return new Vector(lerp(this.x, vector.x, alpha.x), lerp(this.y, vector.y, alpha.y));
        },

        ceil: function () {
            return new Vector(ceil(this.x), ceil(this.y));
        },

        lengthSquared: function () {
            return this.x * this.x + this.y * this.y;
        },

        length: function () {
            return Math.sqrt(this.lengthSquared());
        },

        dotProduct: function (vector) {
            return this.x * vector.x + this.y * vector.y;
        },

        angle: function (vector = new Vector(1, 0)) {
            return Math.acos(this.dotProduct(vector) / (this.length() * vector.length()));
        },

        collinear: function (vector) {
            let k = this.x * vector.y - this.y * vector.x;
            return k == 0;
        },

        //==========================================================================================

        pointToLineRatio: function (vectorOnLineStart, vectorOnLineEnd) {
            return (this.x - vectorOnLineStart.x) * (vectorOnLineEnd.y - vectorOnLineStart.y)
                - (this.y - vectorOnLineStart.y) * (vectorOnLineEnd.x - vectorOnLineStart.x);
        },

        pointToLineRelation: function (vectorOnLineStart, vectorOnLineEnd) {
            let ratio = this.pointToLineRatio(vectorOnLineStart, vectorOnLineEnd);
            if (ratio < 0) {
                return PointIsToTheLeftOfLine;
            };
            if (ratio == 0) {
                return PointBelongsToLine;
            };
            return PointIsToTheRightOfLine;
        },

        //векторный метод
        //http://cyber-code.ru/tochka_v_treugolnike/
        pointBelongsToTriangle: function (A, B, C) {
            let b = B.subtract(A);
            let c = C.subtract(A);
            let d = this.subtract(A);
            let m = (d.x * b.y - b.x * d.y) / (c.x * b.y - b.x * c.y);
            if (m >= 0 && m <= 1) {
                let l = (d.x - m * c.x) / b.x;
                if (l >= 0 && m + l <= 1) {
                    return true;
                }
            }
            return false;
        },

        //==========================================================================================

        //0 for x
        //anything else for y
        getAttribute: function(index){
            return (index == 0) ? (this.x) : (this.y);
        },
        //0 for x
        //anything else for y
        setAttribute: function(index,value){
            if(index == 0){
                this.x = value;
            }else{
                this.y = value;
            }
        }
    }
}

function lerp(a, b, alpha) {
    return a + (b - a) * alpha;
}

function Rad2Deg(rad) {
    return rad * 180 / Math.PI;
}

function Deg2Rad(deg) {
    return deg * Math.PI / 180;
}

function angleBetweenPoints(p1, p2) {
    var angle = null;
    if (p1.x == p2.x && p1.y == p2.y)
        angle = Math.PI / 2;
    else
        angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    return (angle * RAD2DEG) + -90;
}