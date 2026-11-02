// Data Monitoring Order SJT 2026 — Witel Solo Jateng Timur
// Mendukung snapshot 31/10/2026 (PDF Lengkap) dan 29/10/2026 (Gambar 1)

export const SNAPSHOTS = {
  '31/10/2026': {
    dateLabel: '31 Oktober 2026',
    shortDate: '31/10/2026',
    witel: 'Witel Solo Jateng Timur',
    source: 'Sheet "Data"',
    kpis: [
      {
        id: 'total-order',
        label: 'TOTAL ORDER LINE',
        value: '343',
        subtext: 'Nilai Rp 2,333 Jt',
        accent: 'blue',
      },
      {
        id: 'order-gt-60',
        label: 'ORDER > 60 HARI',
        value: '127',
        subtext: '37.0% dari total order',
        accent: 'red',
        isAlert: true,
      },
      {
        id: 'total-nilai',
        label: 'TOTAL NILAI (RP JUTA)',
        value: '2,333',
        subtext: 'Rata-rata umur order 112 hari',
        accent: 'blue',
      },
      {
        id: 'order-failed',
        label: 'ORDER FAILED (15/10)',
        value: '36',
        subtext: '0 sudah ada keterangan FU',
        accent: 'red',
        isAlert: true,
      },
      {
        id: 'status-bergerak',
        label: 'STATUS BERGERAK BEFORE → CURRENT',
        value: '10',
        subtext: '333 order masih di status yang sama',
        accent: 'emerald',
      },
    ],

    milestonePerDivisi: {
      rows: [
        { milestone: 'Pending', dgs: 0, rbs: 0, dps: 1, dss: 0, total: 1, nilai: 4.3 },
        { milestone: 'In Progress', dgs: 74, rbs: 74, dps: 38, dss: 31, total: 217, nilai: 2109.8 },
        { milestone: 'Failed', dgs: 24, rbs: 6, dps: 3, dss: 3, total: 36, nilai: 32.4 },
        { milestone: 'Pending Cancel', dgs: 0, rbs: 0, dps: 0, dss: 0, total: 0, nilai: 0 },
        { milestone: 'Complete', dgs: 8, rbs: 72, dps: 9, dss: 0, total: 89, nilai: 186.9 },
      ],
      total: { dgs: 106, rbs: 152, dps: 51, dss: 34, total: 343, nilai: 2333.5 },
    },

    pergerakanStatus: {
      rows: [
        { milestone: 'Pending', before: 2, after: 1, selisih: -1, porsiAfter: 0.3 },
        { milestone: 'In Progress', before: 225, after: 217, selisih: -8, porsiAfter: 63.3 },
        { milestone: 'Failed', before: 36, after: 36, selisih: 0, porsiAfter: 10.5 },
        { milestone: 'Pending Cancel', before: 0, after: 0, selisih: 0, porsiAfter: 0 },
        { milestone: 'Complete', before: 80, after: 89, selisih: 9, porsiAfter: 25.9 },
      ],
      total: { before: 343, after: 343, selisih: 0, porsiAfter: 100.0 },
    },

    milestoneDetailPerDivisi: {
      rows: [
        { milestone: 'PROVISION START', dgs: 3, rbs: 0, dps: 2, dss: 1, total: 6, nilai: 10.8 },
        { milestone: 'PROVISION ISSUED', dgs: 2, rbs: 23, dps: 0, dss: 2, total: 27, nilai: 96.4 },
        { milestone: 'PROVISION COMPLETE', dgs: 0, rbs: 0, dps: 2, dss: 2, total: 4, nilai: 0 },
        { milestone: 'BASO STARTED', dgs: 69, rbs: 42, dps: 33, dss: 26, total: 170, nilai: 1997.2 },
        { milestone: 'BILLING APPROVAL STARTED', dgs: 0, rbs: 3, dps: 5, dss: 0, total: 8, nilai: 17.9 },
        { milestone: 'TSQ FAILED', dgs: 0, rbs: 3, dps: 0, dss: 1, total: 4, nilai: 13.0 },
        { milestone: 'PROVISION FAILED', dgs: 0, rbs: 2, dps: 3, dss: 1, total: 6, nilai: 18.4 },
        { milestone: 'FULFILL BILLING FAILED', dgs: 24, rbs: 0, dps: 0, dss: 0, total: 24, nilai: 0 },
        { milestone: 'FULFILL BILLING COMPLETE', dgs: 7, rbs: 61, dps: 3, dss: 0, total: 71, nilai: 144.9 },
        { milestone: 'Abandoned', dgs: 0, rbs: 0, dps: 0, dss: 0, total: 0, nilai: 0 },
      ],
      total: { dgs: 98, rbs: 73, dps: 45, dss: 33, total: 249, nilai: 2153.4 },
    },

    amRbs: {
      rows: [
        { nama: 'AFIQ ADZANA', pending: 0, inProgress: 1, failed: 0, pendingCancel: 0, complete: 1, total: 2, nilai: 4.9 },
        { nama: 'ALI PUJIANTO', pending: 0, inProgress: 41, failed: 2, pendingCancel: 0, complete: 28, total: 71, nilai: 35.4 },
        { nama: 'ANETTA NIMASAYU', pending: 0, inProgress: 3, failed: 1, pendingCancel: 0, complete: 23, total: 27, nilai: 73.8 },
        { nama: 'CANDRA EVITA TRYARIESTYA', pending: 0, inProgress: 10, failed: 2, pendingCancel: 0, complete: 4, total: 16, nilai: 108.4 },
        { nama: 'ELSA AYU LESTARI', pending: 0, inProgress: 3, failed: 0, pendingCancel: 0, complete: 4, total: 7, nilai: 11.8 },
        { nama: "MUHIBBUDDIN AL MA'RUF", pending: 0, inProgress: 1, failed: 1, pendingCancel: 0, complete: 3, total: 5, nilai: 3.2 },
        { nama: 'NIGHARA ASMARANTAKA SULYA', pending: 0, inProgress: 0, failed: 0, pendingCancel: 0, complete: 0, total: 0, nilai: 0 },
        { nama: 'SETO EDI WIBOWO', pending: 0, inProgress: 5, failed: 0, pendingCancel: 0, complete: 6, total: 11, nilai: 25.1 },
        { nama: 'AM NON SOLO', pending: 0, inProgress: 7, failed: 0, pendingCancel: 0, complete: 3, total: 10, nilai: 68.2 },
        { nama: 'ADMINISTRATOR', pending: 0, inProgress: 0, failed: 0, pendingCancel: 0, complete: 0, total: 0, nilai: 0.6 },
      ],
      total: { pending: 0, inProgress: 71, failed: 6, pendingCancel: 0, complete: 72, total: 149, nilai: 331.0 },
    },

    amLegs: {
      rows: [
        { nama: 'ERIKA KURNIAWATI', pending: 0, inProgress: 0, failed: 0, pendingCancel: 0, complete: 0, total: 0, nilai: 0 },
        { nama: 'MUHYIDDIN TAUFIQ ARDHIYYAN', pending: 0, inProgress: 4, failed: 0, pendingCancel: 0, complete: 1, total: 5, nilai: 216.9 },
        { nama: 'NUR RAHMAWATI', pending: 0, inProgress: 64, failed: 0, pendingCancel: 0, complete: 1, total: 65, nilai: 1580.6 },
        { nama: 'YASINTA DIAH NURMALISA', pending: 0, inProgress: 2, failed: 2, pendingCancel: 0, complete: 5, total: 9, nilai: 46.5 },
        { nama: 'RINA SULISTYA PUSPASARI', pending: 0, inProgress: 24, failed: 0, pendingCancel: 0, complete: 5, total: 29, nilai: 77.6 },
        { nama: 'MAHARANI SARASTIKA BODJAWATI', pending: 0, inProgress: 4, failed: 0, pendingCancel: 0, complete: 0, total: 4, nilai: 60.0 },
        { nama: 'ADITYA NOVIYANTO', pending: 0, inProgress: 3, failed: 1, pendingCancel: 0, complete: 0, total: 4, nilai: 1.7 },
        { nama: 'WAHYU ARGA KUSUMA', pending: 0, inProgress: 23, failed: 1, pendingCancel: 0, complete: 2, total: 26, nilai: 15.9 },
        { nama: 'AM NON SOLO', pending: 1, inProgress: 16, failed: 4, pendingCancel: 0, complete: 3, total: 24, nilai: 68.2 },
        { nama: 'ADMINISTRATOR', pending: 0, inProgress: 6, failed: 22, pendingCancel: 0, complete: 0, total: 28, nilai: 0.6 },
      ],
      total: { pending: 1, inProgress: 146, failed: 30, pendingCancel: 0, complete: 17, total: 194, nilai: 2068.0 },
    },

    umurOrderPerDivisi: {
      rows: [
        { range: '0 - 15 Hari', dgs: 32, rbs: 117, dps: 35, dss: 4, total: 188, nilai: 303.3, highlight: false },
        { range: '16 - 30 Hari', dgs: 0, rbs: 5, dps: 1, dss: 0, total: 6, nilai: 13.0, highlight: false },
        { range: '31 - 60 Hari', dgs: 1, rbs: 19, dps: 2, dss: 0, total: 22, nilai: 71.3, highlight: false },
        { range: '> 60 Hari', dgs: 73, rbs: 11, dps: 13, dss: 30, total: 127, nilai: 1945.9, highlight: true },
      ],
      total: { dgs: 106, rbs: 152, dps: 51, dss: 34, total: 343, nilai: 2333.5 },
    },

    jenisOrder: {
      rows: [
        { subtype: 'Modify Price', jumlah: 80, gt60: 52, failed: 0, nilai: 1577.3 },
        { subtype: 'Disconnect', jumlah: 70, gt60: 10, failed: 24, nilai: 6.5 },
        { subtype: 'Renewal Agreement', jumlah: 56, gt60: 17, failed: 0, nilai: 147.0 },
        { subtype: 'New Install', jumlah: 42, gt60: 19, failed: 4, nilai: 451.9 },
        { subtype: 'Suspend', jumlah: 66, gt60: 11, failed: 7, nilai: 55.6 },
        { subtype: 'Modify', jumlah: 22, gt60: 13, failed: 0, nilai: 91.2 },
        { subtype: 'Resume', jumlah: 6, gt60: 5, failed: 1, nilai: 3.9 },
      ],
      total: { jumlah: 342, gt60: 127, failed: 36, nilai: 2333.5 },
    },

    produkPerDivisi: {
      rows: [
        { produk: 'Telkom Metro Node', dgs: 41, rbs: 10, dps: 5, dss: 3, total: 59, nilai: 299.8 },
        { produk: 'ASTINet', dgs: 8, rbs: 62, dps: 6, dss: 3, total: 79, nilai: 333.3 },
        { produk: 'Wifi Managed Service', dgs: 13, rbs: 57, dps: 3, dss: 21, total: 94, nilai: 75.1 },
        { produk: 'MPLS VPN IP Node', dgs: 0, rbs: 3, dps: 26, dss: 1, total: 30, nilai: 82.7 },
        { produk: 'Manage Network', dgs: 20, rbs: 0, dps: 0, dss: 0, total: 20, nilai: 0 },
        { produk: 'KOPEG SOLO IT Services', dgs: 8, rbs: 3, dps: 0, dss: 2, total: 13, nilai: 271.6 },
        { produk: 'Nadeefa Netmonk', dgs: 0, rbs: 5, dps: 0, dss: 1, total: 6, nilai: 1.3 },
        { produk: 'Telkom Metro Network', dgs: 0, rbs: 1, dps: 2, dss: 2, total: 5, nilai: 0 },
        { produk: 'IP Transit', dgs: 4, rbs: 2, dps: 0, dss: 0, total: 6, nilai: 895.8 },
        { produk: 'SIP Trunking', dgs: 0, rbs: 0, dps: 5, dss: 0, total: 5, nilai: 0 },
        { produk: 'Cemitel IT System', dgs: 0, rbs: 0, dps: 4, dss: 0, total: 4, nilai: 22.0 },
        { produk: 'PINS Device Services', dgs: 3, rbs: 0, dps: 0, dss: 0, total: 3, nilai: 0 },
        { produk: 'Lainnya', dgs: 9, rbs: 9, dps: 0, dss: 1, total: 19, nilai: 351.9, isItalic: true },
      ],
      total: { dgs: 106, rbs: 152, dps: 51, dss: 34, total: 343, nilai: 2333.5 },
    },

    daftarOrderBergerak: {
      rows: [
        { pelanggan: 'PEMKOT SURAKARTA', produk: 'KOPEG SOLO IT Services', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DGS', baris: 62 },
        { pelanggan: 'PT SOLO MURNI', produk: 'ASTINet', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'RBS', baris: 65 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 68 },
        { pelanggan: 'BENDAHARA SMK AL FALAH', produk: 'Nadeefa Netmonk', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'RBS', baris: 121 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 159 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 166 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 228 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 247 },
        { pelanggan: 'PT PAKIS JAYA GARMINDO', produk: 'ASTINet', statusBefore: 'Pending', statusAfter: 'In Progress', divisi: 'RBS', baris: 255 },
        { pelanggan: 'CV SOLUSI SARANA MEDIA', produk: 'ASTINet', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'RBS', baris: 284 },
      ],
    },
  },

  '29/10/2026': {
    dateLabel: '29 Oktober 2026',
    shortDate: '29/10/2026',
    witel: 'Witel Solo Jateng Timur',
    source: 'Sheet "Data"',
    kpis: [
      {
        id: 'total-order',
        label: 'TOTAL ORDER LINE',
        value: '336',
        subtext: 'Nilai Rp 2,324 Jt',
        accent: 'blue',
      },
      {
        id: 'order-gt-60',
        label: 'ORDER > 60 HARI',
        value: '127',
        subtext: '37.8% dari total order',
        accent: 'red',
        isAlert: true,
      },
      {
        id: 'total-nilai',
        label: 'TOTAL NILAI (RP JUTA)',
        value: '2,324',
        subtext: 'Rata-rata umur order 114 hari',
        accent: 'blue',
      },
      {
        id: 'order-failed',
        label: 'ORDER FAILED (15/10)',
        value: '35',
        subtext: '0 sudah ada keterangan FU',
        accent: 'red',
        isAlert: true,
      },
      {
        id: 'status-bergerak',
        label: 'STATUS BERGERAK BEFORE → CURRENT',
        value: '46',
        subtext: '290 order masih di status yang sama',
        accent: 'emerald',
      },
    ],

    milestonePerDivisi: {
      rows: [
        { milestone: 'Pending', dgs: 0, rbs: 1, dps: 1, dss: 0, total: 2, nilai: 4.3 },
        { milestone: 'In Progress', dgs: 75, rbs: 71, dps: 42, dss: 31, total: 219, nilai: 2131.2 },
        { milestone: 'Failed', dgs: 24, rbs: 5, dps: 3, dss: 3, total: 35, nilai: 32.4 },
        { milestone: 'Pending Cancel', dgs: 0, rbs: 0, dps: 0, dss: 0, total: 0, nilai: 0 },
        { milestone: 'Complete', dgs: 7, rbs: 69, dps: 4, dss: 0, total: 80, nilai: 155.8 },
      ],
      total: { dgs: 106, rbs: 146, dps: 50, dss: 34, total: 336, nilai: 2323.8 },
    },

    pergerakanStatus: {
      rows: [
        { milestone: 'Pending', before: 3, after: 2, selisih: -1, porsiAfter: 0.6 },
        { milestone: 'In Progress', before: 257, after: 219, selisih: -38, porsiAfter: 65.2 },
        { milestone: 'Failed', before: 42, after: 35, selisih: -7, porsiAfter: 10.4 },
        { milestone: 'Pending Cancel', before: 0, after: 0, selisih: 0, porsiAfter: 0 },
        { milestone: 'Complete', before: 34, after: 80, selisih: 46, porsiAfter: 23.8 },
      ],
      total: { before: 336, after: 336, selisih: 0, porsiAfter: 100.0 },
    },

    milestoneDetailPerDivisi: {
      rows: [
        { milestone: 'PROVISION START', dgs: 3, rbs: 0, dps: 2, dss: 1, total: 6, nilai: 10.8 },
        { milestone: 'PROVISION ISSUED', dgs: 2, rbs: 23, dps: 0, dss: 2, total: 27, nilai: 96.4 },
        { milestone: 'PROVISION COMPLETE', dgs: 0, rbs: 0, dps: 2, dss: 2, total: 4, nilai: 0 },
        { milestone: 'BASO STARTED', dgs: 69, rbs: 42, dps: 33, dss: 26, total: 170, nilai: 1997.2 },
        { milestone: 'BILLING APPROVAL STARTED', dgs: 0, rbs: 3, dps: 5, dss: 0, total: 8, nilai: 17.9 },
        { milestone: 'TSQ FAILED', dgs: 0, rbs: 3, dps: 0, dss: 1, total: 4, nilai: 13.0 },
        { milestone: 'PROVISION FAILED', dgs: 0, rbs: 2, dps: 3, dss: 1, total: 6, nilai: 18.4 },
        { milestone: 'FULFILL BILLING FAILED', dgs: 24, rbs: 0, dps: 0, dss: 0, total: 24, nilai: 0 },
        { milestone: 'FULFILL BILLING COMPLETE', dgs: 7, rbs: 61, dps: 3, dss: 0, total: 71, nilai: 144.9 },
        { milestone: 'Abandoned', dgs: 0, rbs: 0, dps: 0, dss: 0, total: 0, nilai: 0 },
      ],
      total: { dgs: 98, rbs: 73, dps: 45, dss: 33, total: 249, nilai: 2153.4 },
    },

    amRbs: {
      rows: [
        { nama: 'AFIQ ADZANA', pending: 0, inProgress: 1, failed: 0, pendingCancel: 0, complete: 1, total: 2, nilai: 4.9 },
        { nama: 'ALI PUJIANTO', pending: 0, inProgress: 40, failed: 2, pendingCancel: 0, complete: 28, total: 70, nilai: 35.4 },
        { nama: 'ANETTA NIMASAYU', pending: 0, inProgress: 3, failed: 1, pendingCancel: 0, complete: 22, total: 26, nilai: 69.6 },
        { nama: 'CANDRA EVITA TRYARIESTYA', pending: 0, inProgress: 10, failed: 2, pendingCancel: 0, complete: 3, total: 15, nilai: 105.8 },
        { nama: 'ELSA AYU LESTARI', pending: 0, inProgress: 2, failed: 0, pendingCancel: 0, complete: 4, total: 6, nilai: 11.8 },
        { nama: "MUHIBBUDDIN AL MA'RUF", pending: 0, inProgress: 1, failed: 0, pendingCancel: 0, complete: 3, total: 4, nilai: 3.2 },
        { nama: 'NIGHARA ASMARANTAKA SULYA', pending: 0, inProgress: 0, failed: 0, pendingCancel: 0, complete: 0, total: 0, nilai: 0 },
        { nama: 'SETO EDI WIBOWO', pending: 0, inProgress: 5, failed: 0, pendingCancel: 0, complete: 5, total: 10, nilai: 25.1 },
        { nama: 'AM NON SOLO', pending: 1, inProgress: 6, failed: 0, pendingCancel: 0, complete: 3, total: 10, nilai: 68.2 },
        { nama: 'ADMINISTRATOR', pending: 0, inProgress: 0, failed: 0, pendingCancel: 0, complete: 0, total: 0, nilai: 0.6 },
      ],
      total: { pending: 1, inProgress: 68, failed: 5, pendingCancel: 0, complete: 69, total: 143, nilai: 325.0 },
    },

    amLegs: {
      rows: [
        { nama: 'ERIKA KURNIAWATI', pending: 0, inProgress: 0, failed: 0, pendingCancel: 0, complete: 0, total: 0, nilai: 0 },
        { nama: 'MUHYIDDIN TAUFIQ ARDHIYYAN', pending: 0, inProgress: 4, failed: 0, pendingCancel: 0, complete: 1, total: 5, nilai: 216.9 },
        { nama: 'NUR RAHMAWATI', pending: 0, inProgress: 65, failed: 0, pendingCancel: 0, complete: 1, total: 66, nilai: 1580.6 },
        { nama: 'YASINTA DIAH NURMALISA', pending: 0, inProgress: 2, failed: 2, pendingCancel: 0, complete: 5, total: 9, nilai: 46.5 },
        { nama: 'RINA SULISTYA PUSPASARI', pending: 0, inProgress: 28, failed: 0, pendingCancel: 0, complete: 1, total: 29, nilai: 77.6 },
        { nama: 'MAHARANI SARASTIKA BODJAWATI', pending: 0, inProgress: 4, failed: 0, pendingCancel: 0, complete: 0, total: 4, nilai: 60.0 },
        { nama: 'ADITYA NOVIYANTO', pending: 0, inProgress: 3, failed: 1, pendingCancel: 0, complete: 0, total: 4, nilai: 1.7 },
        { nama: 'WAHYU ARGA KUSUMA', pending: 0, inProgress: 23, failed: 1, pendingCancel: 0, complete: 2, total: 26, nilai: 15.9 },
        { nama: 'AM NON SOLO', pending: 1, inProgress: 16, failed: 4, pendingCancel: 0, complete: 1, total: 22, nilai: 68.2 },
        { nama: 'ADMINISTRATOR', pending: 0, inProgress: 6, failed: 22, pendingCancel: 0, complete: 0, total: 28, nilai: 0.6 },
      ],
      total: { pending: 1, inProgress: 151, failed: 30, pendingCancel: 0, complete: 11, total: 193, nilai: 2068.0 },
    },

    umurOrderPerDivisi: {
      rows: [
        { range: '0 - 15 Hari', dgs: 32, rbs: 117, dps: 35, dss: 4, total: 188, nilai: 303.3, highlight: false },
        { range: '16 - 30 Hari', dgs: 0, rbs: 5, dps: 1, dss: 0, total: 6, nilai: 13.0, highlight: false },
        { range: '31 - 60 Hari', dgs: 1, rbs: 19, dps: 2, dss: 0, total: 22, nilai: 71.3, highlight: false },
        { range: '> 60 Hari', dgs: 73, rbs: 11, dps: 13, dss: 30, total: 127, nilai: 1945.9, highlight: true },
      ],
      total: { dgs: 106, rbs: 152, dps: 51, dss: 34, total: 343, nilai: 2333.5 },
    },

    jenisOrder: {
      rows: [
        { subtype: 'Modify Price', jumlah: 80, gt60: 52, failed: 0, nilai: 1577.3 },
        { subtype: 'Disconnect', jumlah: 70, gt60: 10, failed: 24, nilai: 6.5 },
        { subtype: 'Renewal Agreement', jumlah: 56, gt60: 17, failed: 0, nilai: 147.0 },
        { subtype: 'New Install', jumlah: 42, gt60: 19, failed: 4, nilai: 451.9 },
        { subtype: 'Suspend', jumlah: 66, gt60: 11, failed: 7, nilai: 55.6 },
        { subtype: 'Modify', jumlah: 22, gt60: 13, failed: 0, nilai: 91.2 },
        { subtype: 'Resume', jumlah: 6, gt60: 5, failed: 1, nilai: 3.9 },
      ],
      total: { jumlah: 342, gt60: 127, failed: 36, nilai: 2333.5 },
    },

    produkPerDivisi: {
      rows: [
        { produk: 'Telkom Metro Node', dgs: 41, rbs: 10, dps: 5, dss: 3, total: 59, nilai: 299.8 },
        { produk: 'ASTINet', dgs: 8, rbs: 62, dps: 6, dss: 3, total: 79, nilai: 333.3 },
        { produk: 'Wifi Managed Service', dgs: 13, rbs: 57, dps: 3, dss: 21, total: 94, nilai: 75.1 },
        { produk: 'MPLS VPN IP Node', dgs: 0, rbs: 3, dps: 26, dss: 1, total: 30, nilai: 82.7 },
        { produk: 'Manage Network', dgs: 20, rbs: 0, dps: 0, dss: 0, total: 20, nilai: 0 },
        { produk: 'KOPEG SOLO IT Services', dgs: 8, rbs: 3, dps: 0, dss: 2, total: 13, nilai: 271.6 },
        { produk: 'Nadeefa Netmonk', dgs: 0, rbs: 5, dps: 0, dss: 1, total: 6, nilai: 1.3 },
        { produk: 'Telkom Metro Network', dgs: 0, rbs: 1, dps: 2, dss: 2, total: 5, nilai: 0 },
        { produk: 'IP Transit', dgs: 4, rbs: 2, dps: 0, dss: 0, total: 6, nilai: 895.8 },
        { produk: 'SIP Trunking', dgs: 0, rbs: 0, dps: 5, dss: 0, total: 5, nilai: 0 },
        { produk: 'Cemitel IT System', dgs: 0, rbs: 0, dps: 4, dss: 0, total: 4, nilai: 22.0 },
        { produk: 'PINS Device Services', dgs: 3, rbs: 0, dps: 0, dss: 0, total: 3, nilai: 0 },
        { produk: 'Lainnya', dgs: 9, rbs: 9, dps: 0, dss: 1, total: 19, nilai: 351.9, isItalic: true },
      ],
      total: { dgs: 106, rbs: 152, dps: 51, dss: 34, total: 343, nilai: 2333.5 },
    },

    daftarOrderBergerak: {
      rows: [
        { pelanggan: 'PEMKOT SURAKARTA', produk: 'KOPEG SOLO IT Services', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DGS', baris: 62 },
        { pelanggan: 'PT SOLO MURNI', produk: 'ASTINet', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'RBS', baris: 65 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 68 },
        { pelanggan: 'BENDAHARA SMK AL FALAH', produk: 'Nadeefa Netmonk', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'RBS', baris: 121 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 159 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 166 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 228 },
        { pelanggan: 'ELLA SKIN CARE', produk: 'MPLS VPN IP Node', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'DPS', baris: 247 },
        { pelanggan: 'PT PAKIS JAYA GARMINDO', produk: 'ASTINet', statusBefore: 'Pending', statusAfter: 'In Progress', divisi: 'RBS', baris: 255 },
        { pelanggan: 'CV SOLUSI SARANA MEDIA', produk: 'ASTINet', statusBefore: 'In Progress', statusAfter: 'Complete', divisi: 'RBS', baris: 284 },
      ],
    },
  },
};

export const CATATAN_DASHBOARD = [
  'Semua angka berupa rumus yang membaca sheet "Data " (baris 2–2000), jadi otomatis ikut berubah saat data di-update.',
  'Order FAILED = milestone 15/10 yang mengandung kata "FAILED" (TSQ, PROVISION, FULFILL BILLING). Nilai = kolom TOTAL PRICE, dalam Rp juta.',
  'Daftar milestone, range umur, jenis order, dan 12 produk teratas diambil dari data saat dashboard dibuat; jika muncul kategori baru, tambahkan barisnya.',
];

