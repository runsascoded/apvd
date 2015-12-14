
pi = Math.PI;
pi4 = pi / 4;

cmp = (a,b) => { return a-b; };

r3 = (x) => { return Math.round(1000 * x) / 1000; };

pp = (p, q) => { return '(' + (q === undefined ? p : [p, q]).map(r3).join(',') + ')'; };

deg = (t) => { return 180 * t / pi; };
rad = (d) => { return pi * d / 180; };

sq2 = Math.sqrt(2);
