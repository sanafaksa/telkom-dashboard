// Helper to construct EDK row
export const mk = (l, a, extra = {}) => {
  const k_auto = extra.k_auto ?? (a[12] !== undefined ? a[12] : 0);
  const k_prog = extra.k_prog ?? (a[13] !== undefined ? a[13] : 0);
  const total_k_count = (k_auto || 0) + (k_prog || 0);
  const raw_ka = a[11] !== undefined ? a[11] : 0;

  let k_auto_a = extra.k_auto_a ?? (extra.k_auto_abon !== undefined ? extra.k_auto_abon : 0);
  let k_prog_a = extra.k_prog_a ?? (extra.k_prog_abon !== undefined ? extra.k_prog_abon : 0);

  if (extra.k_auto_a === undefined && extra.k_auto_abon === undefined && raw_ka > 0) {
    if (k_auto > 0 && k_prog === 0) {
      k_auto_a = raw_ka;
      k_prog_a = 0;
    } else if (k_prog > 0 && k_auto === 0) {
      k_auto_a = 0;
      k_prog_a = raw_ka;
    } else if (total_k_count > 0) {
      k_auto_a = Math.round((raw_ka * k_auto) / total_k_count);
      k_prog_a = raw_ka - k_auto_a;
    } else {
      k_prog_a = raw_ka;
    }
  }

  const k = extra.k !== undefined ? extra.k : (total_k_count > 0 && a[10] === undefined ? total_k_count : (a[10] !== undefined ? a[10] : 0));
  const ka = extra.ka !== undefined ? extra.ka : ((k_auto_a || 0) + (k_prog_a || 0) > 0 && a[11] === undefined ? (k_auto_a || 0) + (k_prog_a || 0) : raw_ka);

  return {
    l,
    // Lanjut Complete
    lc: a[0] !== undefined ? a[0] : 0,
    la: a[1] !== undefined ? a[1] : 0,
    // Lanjut In Progress
    lp: a[2] !== undefined ? a[2] : 0,
    lpa: a[3] !== undefined ? a[3] : 0,
    // Tidak Lanjut Complete
    tc: a[4] !== undefined ? a[4] : 0,
    ta: a[5] !== undefined ? a[5] : 0,
    // Tidak Lanjut In Progress
    tp: a[6] !== undefined ? a[6] : 0,
    tpa: a[7] !== undefined ? a[7] : 0,
    // Bukan Witel Solo JT
    b: a[8] !== undefined ? a[8] : 0,
    ba: a[9] !== undefined ? a[9] : 0,
    // Konfirmasi AM (Total Order & Total Abonemen)
    k,
    ka,
    // Konfirmasi AM sub-status (Auto renewal & In Progress)
    k_auto,
    k_auto_a,
    k_prog,
    k_prog_a,
    // Metadata
    periode: extra.periode || '202609',
    segmen: extra.segmen || 'DGS',
    namaAm: extra.namaAm || l,
    flagging: extra.flagging || 'Updated Today',
    isTotalRow: extra.isTotalRow || false,
    subgroup: extra.subgroup || null,
    groupHeader: extra.groupHeader || null
  };
};

export const filterOptions = {
  periode: [
    '< 2026', '202601', '202602', '202603', '202604', '202605',
    '202606', '202607', '202608', '202609', '202610', '202611', '202612'
  ],
  segmen: [
    'DGS', 'DPS', 'DSS', 'RBS'
  ],
  namaAm: [
    'Erika Kurniawati',
    'Muhiyiddin Taufiq Ardhiyant',
    'Nur Rahmawati',
    'Yasinta Dyah Nurmalisa',
    'Aditya Noviyanto',
    'Maharani Sarastika Bodjawati',
    'Rina Sulistya Puspasari',
    'Unmapping AM Solo',
    'Wahyu Arga Kusuma',
    'Ali Pujianto',
    'Anetta Nimasayu',
    'Agus Edy Tandayu',
    'Tri Muryani',
    'Bayu Perdana',
    'Bambang Sulistyo',
    'Dwi Handayani',
    'Hendra Setiawan',
    'Ratna Sari',
    'Teguh Prasetyo'
  ],
  flagging: ['Updated Today', 'Updated <7 Days', 'Need Review'],
  namaPelanggan: ['Sort: Nama (A-Z)', 'Sort: Nama (Z-A)', 'Sort: Order Terbanyak', 'Sort: Abonemen Tertinggi']
};

export const modes = {
  'Periode EDK': [
    mk('< 2026', [8, 16800000, 53, 0, 105, -5811550, 22, 12980545, 0, 0, 10, 104903334, 0, 10], { periode: '< 2026', flagging: 'Need Review' }),
    mk('202601', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 329000, 0, 1], { periode: '202601', flagging: 'Need Review' }),
    mk('202602', [0, 0, 2, 3130000, 1, 3746613, 1, 3700000, 0, 0, 0, 0, 0, 0], { periode: '202602', flagging: 'Need Review' }),
    mk('202603', [1, 2500000, 0, 0, 2, 10200000, 1, 1500000, 0, 0, 0, 0, 0, 0], { periode: '202603', flagging: 'Updated <7 Days' }),
    mk('202604', [1, 1780000, 18, 41290129, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { periode: '202604', flagging: 'Updated <7 Days' }),
    mk('202605', [0, 0, 3, 7737000, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], { periode: '202605', flagging: 'Updated <7 Days' }),
    mk('202606', [9, 4746508, 0, 0, 1, -43500000, 1, 0, 0, 0, 3, 4850000, 0, 3], { periode: '202606', flagging: 'Updated Today' }),
    mk('202607', [0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], { periode: '202607', flagging: 'Updated Today' }),
    mk('202608', [12, 15590204, 18, 57615091, 0, 0, 1, 0, 0, 0, 6, 2730000, 0, 4], { periode: '202608', flagging: 'Updated Today' }),
    mk('202609', [3, 3723550, 31, 42350873, 1, 0, 17, 43050115, 0, 0, 28, 42942334, 0, 28], { periode: '202609', flagging: 'Updated Today' })
  ],

  'Segmen': [
    mk('DGS', [42, 125431000, 28, 46228000, 18, 52774000, 12, 18631000, 18, 46020000, 100, 425017275], {
      segmen: 'DGS',
      periode: '202609',
      flagging: 'Updated Today',
      k_auto: 8,
      k_auto_a: 5065520,
      k_prog: 92,
      k_prog_a: 419951755
    }),
    mk('DPS', [88, 301520778, 40, 86532000, 47, 118947000, 26, 44598631, 18, 39547631, 37, 131131000], {
      segmen: 'DPS',
      periode: '202609',
      flagging: 'Updated <7 Days',
      k_auto: 2,
      k_auto_a: 24000000,
      k_prog: 35,
      k_prog_a: 107131000
    }),
    mk('DSS', [54, 210885000, 32, 74190000, 29, 194235000, 18, 77535185, 9, 32045185, 47, 997567284], {
      segmen: 'DSS',
      periode: '202608',
      flagging: 'Updated Today',
      k_auto: 0,
      k_auto_a: 0,
      k_prog: 47,
      k_prog_a: 997567284
    }),
    mk('RBS', [53, 152446961, 43, 86872739, 26, 85175473, 12, 16402000, 56, 115044184, 139, 269029775], {
      segmen: 'RBS',
      periode: '202608',
      flagging: 'Need Review',
      k_auto: 42,
      k_auto_a: 91275064,
      k_prog: 97,
      k_prog_a: 177754711
    })
  ],

  // Dataset Nama AM Persis dengan Screenshot 4 (Total 19 AM)
  'Nama AM': [
    // Grup 1: Segmen DGS (4 Account Manager)
    mk('Erika Kurniawati', [12, 4120000, 8, 2340000, 3, 980000, 1, 420000, 1, 185000, 3, 1240000, 0, 0], {
      segmen: 'DGS',
      subgroup: 'Segmen DGS',
      periode: '202609',
      flagging: 'Updated Today',
      groupCount: 4,
      subtotalData: { order: 172, abon: 65138000, auto: 0, inprog: 0 }
    }),
    mk('Muhiyiddin Taufiq Ardhiyant', [15, 5360000, 10, 3822000, 4, 1460000, 3, 920000, null, null, 2, 780000, 0, 0], {
      segmen: 'DGS',
      subgroup: 'Segmen DGS',
      periode: '202609',
      flagging: 'Updated <7 Days'
    }),
    mk('Nur Rahmawati', [18, 6910000, 7, 1943000, 6, 2400000, 2, 744000, 2, 750000, 4, 1663000, 0, 0], {
      segmen: 'DGS',
      subgroup: 'Segmen DGS',
      periode: '202609',
      flagging: 'Updated Today'
    }),
    mk('Yasinta Dyah Nurmalisa', [14, 3250000, 11, 2080000, 5, 1120000, 6, 1320000, 1, 266000, 5, 1365000, 0, 0], {
      segmen: 'DGS',
      subgroup: 'Segmen DGS',
      periode: '202608',
      flagging: 'Need Review'
    }),

    // Grup 2: Segmen DPS (5 Account Manager)
    mk('Aditya Noviyanto', [6, 528000, 4, 199000, 3, 166000, 2, 67000, 1, 42000, 2, 89000, 0, 7], {
      segmen: 'DPS',
      subgroup: 'Segmen DPS',
      periode: '202609',
      flagging: 'Updated <7 Days',
      groupCount: 5,
      subtotalData: { order: 183, abon: 84220000, auto: 0, inprog: 39 }
    }),
    mk('Maharani Sarastika Bodjawati', [20, 5860000, 7, 1920000, 4, 1280000, 6, 1502000, 2, 124000, 5, 1216000, 0, 0], {
      segmen: 'DPS',
      subgroup: 'Segmen DPS',
      periode: '202609',
      flagging: 'Updated Today'
    }),
    mk('Rina Sulistya Puspasari', [11, 6300000, 9, 5822000, 4, 2759000, 4, 2298000, 2, 970000, 1, 522000, 0, 27], {
      segmen: 'DPS',
      subgroup: 'Segmen DPS',
      periode: '202609',
      flagging: 'Updated <7 Days'
    }),
    mk('Unmapping AM Solo', [8, 1392000, 11, 1963000, 6, 813000, 2, 274000, 2, 236000, 4, 555000, 0, 5], {
      segmen: 'DPS',
      subgroup: 'Segmen DPS',
      periode: '202608',
      flagging: 'Need Review'
    }),
    mk('Wahyu Arga Kusuma', [9, 5436000, 6, 3082000, 3, 2300000, 2, 1401000, 1, 488000, 2, 1068000, 0, 0], {
      segmen: 'DPS',
      subgroup: 'Segmen DPS',
      periode: '202609',
      flagging: 'Updated Today'
    }),

    // Grup 3: Segmen DSS (5 Account Manager)
    mk('Ali Pujianto', [10, 4560000, 8, 2802000, 5, 1440000, 3, 980000, 1, 366000, 2, 721000, 0, 0], {
      segmen: 'DSS',
      subgroup: 'Segmen DSS',
      periode: '202609',
      flagging: 'Updated Today',
      groupCount: 5,
      subtotalData: { order: 145, abon: 76884000, auto: 20, inprog: 9 }
    }),
    mk('Anetta Nimasayu', [7, 2184000, 5, 1360000, 4, 910000, 3, 420000, 1, 280000, 2, 610000, 15, 9], {
      segmen: 'DSS',
      subgroup: 'Segmen DSS',
      periode: '202609',
      flagging: 'Updated <7 Days'
    }),
    mk('Agus Edy Tandayu', [12, 3820000, 6, 1840000, 3, 1100000, 1, 320000, 1, 180000, 3, 940000, 5, 0], {
      segmen: 'DSS',
      subgroup: 'Segmen DSS',
      periode: '202608',
      flagging: 'Need Review'
    }),
    mk('Tri Muryani', [8, 2750000, 5, 1490000, 2, 820000, 2, 410000, 1, 195000, 2, 580000, 0, 0], {
      segmen: 'DSS',
      subgroup: 'Segmen DSS',
      periode: '202609',
      flagging: 'Updated Today'
    }),
    mk('Bayu Perdana', [11, 4120000, 7, 2100000, 4, 1250000, 3, 810000, 2, 420000, 3, 890000, 0, 0], {
      segmen: 'DSS',
      subgroup: 'Segmen DSS',
      periode: '202609',
      flagging: 'Updated <7 Days'
    }),

    // Grup 4: Segmen RBS (5 Account Manager)
    mk('Bambang Sulistyo', [9, 3200000, 6, 1950000, 3, 980000, 2, 510000, 1, 210000, 2, 650000, 0, 0], {
      segmen: 'RBS',
      subgroup: 'Segmen RBS',
      periode: '202609',
      flagging: 'Updated Today',
      groupCount: 5,
      subtotalData: { order: 120, abon: 54200000, auto: 0, inprog: 12 }
    }),
    mk('Dwi Handayani', [8, 2940000, 5, 1620000, 2, 750000, 1, 290000, 1, 170000, 2, 520000, 0, 0], {
      segmen: 'RBS',
      subgroup: 'Segmen RBS',
      periode: '202608',
      flagging: 'Need Review'
    }),
    mk('Hendra Setiawan', [11, 4310000, 7, 2240000, 4, 1320000, 2, 640000, 2, 380000, 3, 810000, 0, 0], {
      segmen: 'RBS',
      subgroup: 'Segmen RBS',
      periode: '202609',
      flagging: 'Updated Today'
    }),
    mk('Ratna Sari', [7, 2450000, 4, 1380000, 3, 890000, 2, 410000, 1, 220000, 2, 590000, 0, 0], {
      segmen: 'RBS',
      subgroup: 'Segmen RBS',
      periode: '202609',
      flagging: 'Updated <7 Days'
    }),
    mk('Teguh Prasetyo', [10, 3680000, 6, 1890000, 3, 1050000, 2, 530000, 1, 290000, 3, 740000, 0, 0], {
      segmen: 'RBS',
      subgroup: 'Segmen RBS',
      periode: '202609',
      flagging: 'Updated Today'
    })
  ],

  'Nama CC': [
    mk('CC Perbankan & Finansial', [35, 110500000, 22, 42100000, 15, 38900000, 10, 15200000, 8, 24500000, 25, 120400000, 10, 15], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
    mk('CC Manufaktur & Logistik', [28, 85400000, 18, 34200000, 12, 29800000, 8, 12400000, 6, 18300000, 18, 88200000, 8, 10], { segmen: 'RBS', periode: '202608', flagging: 'Updated <7 Days' }),
    mk('CC Pemerintahan & BUMN', [40, 135800000, 26, 51300000, 18, 46500000, 14, 21900000, 10, 31200000, 30, 145600000, 12, 18], { segmen: 'DGS', periode: '202609', flagging: 'Updated Today' }),
    mk('CC Pendidikan & Kesehatan', [22, 68900000, 15, 27600000, 9, 21400000, 6, 9800000, 5, 14600000, 14, 65400000, 5, 9], { segmen: 'DPS', periode: '202607', flagging: 'Need Review' })
  ]
};

// Data Top 10 Pelanggan per Segmen
export const topPelangganBySegmen = {
  // Segmen DGS - Persis 100% dengan Screenshot 2 & 3
  'DGS': [
    mk('PEMERINTAH KOTA SURAKARTA', [5, 98674566, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202609', flagging: 'Updated Today' }),
    mk('KOMINFO KABUPATEN KARANGANYAR', [32, 53849625, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202609', flagging: 'Updated Today' }),
    mk('DINKOMINFO KAB DEMAK', [9, 33230000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202609', flagging: 'Updated <7 Days' }),
    mk('DINKOMINFO BLORA', [1, 33106352, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202609', flagging: 'Updated Today' }),
    mk('RSUD DR MOEWARDI PROVINSI JAWA TENGAH', [1, 31046544, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202609', flagging: 'Updated Today' }),
    mk('DISDUKCAPIL BOYOLALI', [1, 23781000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202608', flagging: 'Need Review' }),
    mk('RSUD RAA SOEWONDO KAB PATI', [1, 18468468, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202609', flagging: 'Updated <7 Days' }),
    mk('DINAS KESEHATAN KABUPATEN BOYOLALI', [1, 16520000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202609', flagging: 'Updated Today' }),
    mk('DINKOMINFO KABUPATEN KUDUS', [1, 16148952, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202608', flagging: 'Updated <7 Days' }),
    mk('DINAS KESEHATAN KABUPATEN SUKOHARJO', [1, 14439000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202608', flagging: 'Need Review' })
  ],

  // Segmen RBS - Persis dengan Screenshot sebelumnya
  'RBS': [
    mk('YAY PERGURUAN TINGGI SLAMET RIYADI', [2, 45045045, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202609', flagging: 'Updated Today' }),
    mk('RUTIN RSUD DR MOEWARDI', [1, 32276577, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202609', flagging: 'Updated Today' }),
    mk('YAYASAN PENDIDIKAN TINGGI NU JEPARA', [2, 18238800, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202609', flagging: 'Updated <7 Days' }),
    mk('PD AIR MINUM KAB DATI II SRAGEN', [9, 14779033, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202609', flagging: 'Updated Today' }),
    mk('DINDIK PROV. JATENG (SMKN 5 SURAKARTA)', [2, 14414414, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202608', flagging: 'Need Review' }),
    mk('PD BPR BANK BOYOLALI', [9, 8454250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202609', flagging: 'Updated Today' }),
    mk('PT LEGEND PACKAGING INDONESIA', [2, 7450000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202608', flagging: 'Updated <7 Days' }),
    mk('PT. SUMMIT TRAVEL GOODS', [2, 7117117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202609', flagging: 'Updated Today' }),
    mk('PT POLARIS SEMESTA GLOBAL', [3, 6762750, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202608', flagging: 'Need Review' }),
    mk('CV SINAR MUTIARA LOGISTIK', [2, 6553000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202609', flagging: 'Updated Today' })
  ],

  'DPS': [
    mk('UNIVERSITAS DIPONEGORO', [12, 58400000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202609', flagging: 'Updated Today' }),
    mk('RSUP DR KARIADI SEMARANG', [10, 44250000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202609', flagging: 'Updated Today' }),
    mk('YAYASAN PENDIDIKAN AL AZHAR SOLO', [8, 29800000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202609', flagging: 'Updated <7 Days' }),
    mk('UNIVERSITAS NEGERI SEMARANG', [7, 21650000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202609', flagging: 'Updated Today' }),
    mk('SMC RS TELOGOREJO', [6, 17120000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202608', flagging: 'Need Review' }),
    mk('YAYASAN BINA NUSANTARA SEMARANG', [5, 13400000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202609', flagging: 'Updated Today' }),
    mk('UNIKA SOEGIJAPRANATA', [4, 10200000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202608', flagging: 'Updated <7 Days' }),
    mk('RSI SULTAN AGUNG SEMARANG', [4, 8900000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202609', flagging: 'Updated Today' }),
    mk('UNIVERSITAS DIAN NUSWANTORO', [4, 6700000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202608', flagging: 'Need Review' }),
    mk('POLITEKNIK NEGERI SEMARANG', [4, 5400000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DPS', periode: '202609', flagging: 'Updated Today' })
  ],

  'DSS': [
    mk('PT DJARUM KUDUS', [10, 62500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
    mk('PT SEMEN GRESIK (PERSERO) TBK', [8, 38400000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
    mk('PT KERETA API INDONESIA DAOP 4', [6, 26150000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated <7 Days' }),
    mk('PT SAMPHARINDO PHARDAN', [5, 19800000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
    mk('PT APPAREL ONE INDONESIA', [5, 15240000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202608', flagging: 'Need Review' }),
    mk('PT INDUSTRI JAMU SIDO MUNCUL', [4, 11600000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
    mk('PT INDOFOOD CBP SUKSES MAKMUR', [4, 9450000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202608', flagging: 'Updated <7 Days' }),
    mk('PT POLIPLAS INDAH MAKMUR', [3, 6800000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
    mk('PT ASIA PACIFIC FIBERS TBK', [3, 4800000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202608', flagging: 'Need Review' }),
    mk('PT VICTORIA CARE INDONESIA', [3, 3600000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' })
  ]
};

// Data Top 10 Pelanggan untuk Nama CC (Corporate Customer)
export const topPelangganByCC = [
  mk('PT BANK MANDIRI (PERSERO) TBK', [14, 68500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
  mk('PT BANK RAKYAT INDONESIA TBK', [12, 54200000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
  mk('PT BANK CENTRAL ASIA TBK', [10, 42100000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated <7 Days' }),
  mk('PT PERTAMINA PATRA NIAGA', [8, 38900000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
  mk('PT PLN (PERSERO) UID JATENG & DIY', [9, 34500000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DGS', periode: '202608', flagging: 'Need Review' }),
  mk('PT TELEKOMUNIKASI SELULAR (TELKOMSEL)', [7, 28400000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
  mk('PT ASTRA INTERNATIONAL TBK', [6, 22150000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'RBS', periode: '202608', flagging: 'Updated <7 Days' }),
  mk('PT GUDANG GARAM TBK', [5, 18700000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' }),
  mk('PT INDOFOOD SUKSES MAKMUR TBK', [5, 16250000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202608', flagging: 'Need Review' }),
  mk('PT KERETA API INDONESIA (PERSERO)', [4, 12850000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { segmen: 'DSS', periode: '202609', flagging: 'Updated Today' })
];
