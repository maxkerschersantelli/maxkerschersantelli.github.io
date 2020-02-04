function problem(){
    console.log('start');

    var total = 0;
    var c = 997;
    for(var a = 1; a < 332; a++){
        var testC = c;
        for(var b = a+1; b < testC; b++){
            if(a + b + testC == 1000 && ((a*a) + (b*b)) == testC*testC){
                total = a*b*testC;
                break;
            }
            testC--;
        }
        if(total > 0){break}
        c -= 2;
    }
    
    console.log(total);
}