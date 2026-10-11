const q=(c,n,d,v,l,m,x={})=>({code:c,name:n,desc:d,value:v,last:l,mom:m,...x});
const D=['Tanpa Tagihan & Tanpa Usage','Dengan Tagihan & Tanpa Usage','Tanpa Tagihan & Dengan Usage','Dengan Tagihan & Dengan Usage'];
export const moving = {
  title: 'Kuadran Moving Dashboard',
  items: [
    q('KW1', 'Kuadran 1', D[0], 5030, 4863, 3.4, {
      cells: [['1', 4819], ['2-1', 89], ['3-1', 45], ['4-1', 49]],
      newVal: 28,
      newMom: 4.4
    }),
    q('KW2', 'Kuadran 2', D[1], 8189, 7193, 13.8, {
      cells: [['2', 6669], ['1-2', 21], ['3-2', 1], ['4-2', 1414]],
      newVal: 84,
      newMom: 12.0
    }),
    q('KW3', 'Kuadran 3', D[2], 470, 511, -8.0, {
      cells: [['3', 373], ['1-3', 8], ['2-3', 0], ['4-3', 69]],
      newVal: 20,
      newMom: -5.2
    }),
    q('KW4', 'Kuadran 4', D[3], 23642, 24275, -2.6, {
      cells: [['4', 22588], ['1-4', 11], ['2-4', 394], ['3-4', 91]],
      newVal: 558,
      newMom: 3.8
    })
  ],
  total: {last: 36842, real: 37331, mom: 1.3}
};
export const witel={title:'Witel Performance Dashboard',items:[q('KW1','Kuadran 1',D[0],5030,4863,3.4),q('KW2','Kuadran 2',D[1],8189,7193,13.8),q('KW3','Kuadran 3',D[2],470,511,-8.0),q('KW4','Kuadran 4',D[3],23642,24275,-2.6)],total:{last:36842,real:37331,mom:1.3}};
export const telda={title:'Telda Performance Dashboard',items:['S1','S2','S3','S4'].map((c,i)=>q(c,'Segment '+(i+1),D[i],[391,441,36,1515][i],[369,315,37,1624][i],[6.0,40,-2.7,-6.7][i])),total:{last:2345,real:2383,mom:1.6}};
export const segment={...telda,title:'Segment Performance Dashboard'};
export const insight='Performa kuadran menunjukkan pergerakan positif dengan peningkatan signifikan pada beberapa segmen dominan di Kuadran 3 dan Kuadran 4.';
