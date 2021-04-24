function QuadraticEquation(a,b,c){
    this.a = a;
    this.b = b;
    this.c = c;

    this.discriminant = function(){
        return b*b - 4*a*c;
    }

    this.roots = function(){
        let d = this.discriminant();
        if(d<0){
            return null;
        }
        let result = [(-b+Math.sqrt(d))/(2*a)];
        if(d>0){
            result.push(-b-Math.sqrt(d)/(2*a));
        }
        return result;
    }

    this.imaginaryRoots = function(){
        let d = this.discriminant();
        if(d<0){
            d = -d;
        }
        let result = [(-b+Math.sqrt(d))/(2*a)];
        if(d>0){
            result.push(-b-Math.sqrt(d)/(2*a));
        }
        return result;
    }
}