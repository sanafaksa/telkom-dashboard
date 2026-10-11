const mk = (l, a, extra = {}) => ({
  l,
  lc: a[0], la: a[1],
  lp: a[2], lpa: a[3],
  tc: a[4], ta: a[5],
  tp: a[6], tpa: a[7],
  b: a[8], ba: a[9],
  k: a[10], ka: a[11],
  periode: extra.periode || '202609',
  segmen: extra.segmen || 'Enterprise',
  namaAm: extra.namaAm || l,
  flagging: extra.flagging || 'Updated Today'
});

export const kpi = {
  order: 426,
  abon: 'Rp 328.221.859',
  prog: 211,
  done: 215
};

export const filterOptions = {
  periode: ['Semua', '< 2026', '202601', '202602', '202603', '202604', '202605', '202606', '202607', '202608', '202609'],
  segmen: ['Semua', 'Enterprise', 'Government', 'Business', 'Regional', 'DES', 'DBS', 'DGS'],
  namaAm: [
    'Semua',
    'ERIKA KURNIAWATI',
    'MUHIYIDDIN TAUFIQ ARDHIYYAN',
    'NUR RAHMAWATI',
    'YASINTA DYAH NURMALISA',
    'ADITYA NOVIYANTO',
    'MAHARANI SARAS TIKA BODJAWATI',
    'RINA ROSULIA PUSPASARI',
    'UNMAPPING AM SOLO',
    'WAHYU ADI PRABOWO',
    'AGUS SETIAWAN',
    'TRI MURYANI',
    'BAYU PERDANA',
    'DEWI LESTARI',
    'FADLI RAHMAN',
    'GILANG RAMADHAN',
    'HENDRA WIJAYA',
    'INDAH PERMATA',
    'JOKO SUSILO',
    'KIKI AMALIA',
    'LUKMAN HAKIM',
    'MAYA ANGGRAENI',
    'NANDA PRATAMA'
  ],
  flagging: ['Semua', 'Updated Today', 'Updated <7 Days', 'Need Review']
};

export const modes = {
  'Nama AM': [
    mk('ERIKA KURNIAWATI', [15, 5668000, 13, 5703000, 2, 754000, 4, 1661000, 1, 465000, 5, 1844000], { segmen: 'Enterprise', periode: '202609' }),
    mk('MUHIYIDDIN TAUFIQ ARDHIYYAN', [17, 4376000, 11, 2897000, 7, 1891000, 2, 424000, 1, 282000, 4, 1330000], { segmen: 'Government', periode: '202608' }),
    mk('NUR RAHMAWATI', [19, 6910000, 7, 1943000, 6, 2400000, 2, 744000, 2, 750000, 5, 1663000], { segmen: 'Enterprise', periode: '202609' }),
    mk('YASINTA DYAH NURMALISA', [19, 1356000, 10, 1011000, 5, 724000, 7, 569000, 3, 266000, 6, 618000], { segmen: 'Business', periode: '202607' }),
    mk('ADITYA NOVIYANTO', [5, 247000, 4, 199000, 2, 188000, 2, 87000, 1, 42000, 2, 69000], { segmen: 'Regional', periode: '202606' }),
    mk('MAHARANI SARAS TIKA BODJAWATI', [16, 1045000, 7, 475000, 4, 168000, 6, 351000, 2, 124000, 5, 216000], { segmen: 'Government', periode: '202609' }),
    mk('RINA ROSULIA PUSPASARI', [9, 6599000, 9, 5822000, 4, 2759000, 4, 2298000, 2, 970000, 1, 522000], { segmen: 'Enterprise', periode: '202608' }),
    mk('UNMAPPING AM SOLO', [10, 1392000, 11, 1963000, 5, 813000, 2, 274000, 2, 236000, 4, 555000], { segmen: 'DES', periode: '202609' }),
    mk('WAHYU ADI PRABOWO', [12, 3450000, 8, 2100000, 3, 950000, 3, 620000, 1, 310000, 3, 890000], { segmen: 'DBS', periode: '202605' }),
    mk('AGUS SETIAWAN', [14, 4120000, 9, 2800000, 4, 1200000, 2, 450000, 2, 410000, 4, 1150000], { segmen: 'DGS', periode: '202609' }),
    mk('TRI MURYANI', [8, 2100000, 6, 1450000, 2, 540000, 3, 390000, 1, 180000, 2, 520000], { segmen: 'Business', periode: '202604' }),
    mk('BAYU PERDANA', [11, 3200000, 7, 1980000, 3, 880000, 2, 340000, 1, 260000, 3, 760000], { segmen: 'Regional', periode: '202608' }),
    mk('DEWI LESTARI', [13, 4500000, 10, 3100000, 5, 1450000, 4, 920000, 2, 510000, 4, 1280000], { segmen: 'Enterprise', periode: '202609' }),
    mk('FADLI RAHMAN', [7, 1850000, 5, 1200000, 2, 490000, 2, 310000, 1, 150000, 2, 430000], { segmen: 'Government', periode: '202606' }),
    mk('GILANG RAMADHAN', [10, 2900000, 8, 2300000, 3, 780000, 3, 540000, 1, 220000, 3, 670000], { segmen: 'DES', periode: '202607' }),
    mk('HENDRA WIJAYA', [15, 5200000, 12, 3800000, 6, 1750000, 5, 1100000, 2, 620000, 5, 1420000], { segmen: 'Enterprise', periode: '202609' }),
    mk('INDAH PERMATA', [9, 2600000, 7, 1850000, 3, 710000, 2, 480000, 1, 190000, 3, 590000], { segmen: 'DBS', periode: '202608' }),
    mk('JOKO SUSILO', [11, 3100000, 9, 2450000, 4, 980000, 3, 610000, 2, 380000, 3, 810000], { segmen: 'Government', periode: '202605' }),
    mk('KIKI AMALIA', [6, 1400000, 4, 980000, 1, 320000, 2, 210000, 1, 110000, 2, 350000], { segmen: 'Business', periode: '< 2026' }),
    mk('LUKMAN HAKIM', [12, 3800000, 8, 2600000, 4, 1100000, 3, 590000, 1, 290000, 4, 980000], { segmen: 'DGS', periode: '202609' }),
    mk('MAYA ANGGRAENI', [14, 4900000, 10, 3400000, 5, 1600000, 4, 980000, 2, 580000, 4, 1350000], { segmen: 'Enterprise', periode: '202609' }),
    mk('NANDA PRATAMA', [8, 2250000, 6, 1650000, 2, 580000, 2, 410000, 1, 180000, 2, 490000], { segmen: 'Regional', periode: '202607' })
  ],

  'Periode EDK': [
    mk('< 2026', [22, 3832000, 13, 1672000, 4, 495000, 4, 647000, 4, 580000, 5, 1844000], { periode: '< 2026' }),
    mk('202601', [28, 12832000, 18, 8672000, 8, 1495000, 7, 1647000, 5, 980000, 7, 2844000], { periode: '202601' }),
    mk('202602', [32, 16832000, 22, 11672000, 9, 1895000, 8, 1947000, 6, 1180000, 8, 3244000], { periode: '202602' }),
    mk('202603', [35, 19832000, 25, 14672000, 11, 2295000, 10, 2347000, 7, 1380000, 9, 3644000], { periode: '202603' }),
    mk('202604', [30, 15832000, 20, 10672000, 8, 1695000, 8, 1847000, 5, 1080000, 7, 2944000], { periode: '202604' }),
    mk('202605', [38, 22832000, 27, 16672000, 12, 2695000, 11, 2747000, 8, 1580000, 10, 4144000], { periode: '202605' }),
    mk('202606', [40, 25832000, 29, 18672000, 14, 2995000, 12, 3047000, 9, 1780000, 11, 4544000], { periode: '202606' }),
    mk('202607', [42, 28832000, 31, 20672000, 15, 3295000, 13, 3347000, 10, 1980000, 12, 4944000], { periode: '202607' }),
    mk('202608', [45, 31832000, 33, 22672000, 16, 3595000, 14, 3647000, 11, 2180000, 13, 5344000], { periode: '202608' }),
    mk('202609', [50, 38832000, 36, 26672000, 18, 4195000, 16, 4247000, 12, 2480000, 15, 6144000], { periode: '202609' }),
    mk('WITEL SOLO JT', [380, 217208000, 264, 153712000, 115, 24645000, 103, 23487000, 77, 15340000, 101, 39688000], { isTotalRow: true })
  ],

  'Segmen': [
    mk('Government', [55, 32500000, 38, 22100000, 14, 3800000, 12, 3200000, 8, 1900000, 12, 4800000], { segmen: 'Government' }),
    mk('Enterprise', [110, 78900000, 75, 49800000, 28, 7900000, 24, 6500000, 15, 4200000, 25, 9800000], { segmen: 'Enterprise' }),
    mk('Business', [68, 38400000, 48, 26900000, 18, 4800000, 15, 3900000, 10, 2500000, 16, 5900000], { segmen: 'Business' }),
    mk('Regional', [42, 24100000, 29, 16200000, 11, 2900000, 9, 2400000, 6, 1500000, 9, 3600000], { segmen: 'Regional' }),
    mk('DES', [35, 19800000, 24, 13400000, 9, 2400000, 7, 1900000, 5, 1200000, 8, 3100000], { segmen: 'DES' }),
    mk('DBS', [38, 21500000, 26, 14800000, 10, 2600000, 8, 2100000, 6, 1400000, 9, 3400000], { segmen: 'DBS' }),
    mk('DGS', [32, 18200000, 22, 12100000, 8, 2100000, 6, 1700000, 4, 1100000, 7, 2800000], { segmen: 'DGS' })
  ]
};
