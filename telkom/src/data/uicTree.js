// Master UIC bertingkat (sumber: daftar TR3, TIF, TELKOMSEL, dll.).
// value = nilai yang disimpan di action plan. Node tanpa value hanya pengelompokan (bisa dibuka-tutup).
// custom = node bertanda * : user mengetik isian sendiri, nilainya "<induk> - <prefix> <isian>".

const leaf = (label, value = label) => ({ label, value });
const group = (label, children, value) => ({ label, value, children });
const custom = (label, prefix) => ({ label, custom: true, prefix });

const witel = (name, extra = []) =>
  group(
    name,
    [
      ...['GM', 'PRQ', 'SSGS', 'BS', 'GS'].map((s) => leaf(s, `${name} - ${s}`)),
      ...extra.map((t) => leaf(t, `${name} - ${t}`)),
    ],
    name,
  );

const witelWithTelda = (name) => {
  const node = witel(name);
  node.children.push(custom('TELDA*', 'TELDA'));
  return node;
};

export const UIC_TREE = [
  group('TELKOM', [
    group('TR3', [
      leaf('EVP'),
      group(
        'BPPLP',
        [
          leaf('BPPLP'),
          leaf('BPPLP - LEGAL & REGULATORY AFFAIR'),
          leaf('BPPLP - LOGISTIC & PROCUREMENT'),
          leaf('BPPLP - PLANNING, BUDGET CONTROL&PERFORMANCE'),
          leaf('BPPLP - QCRM & REVAS'),
        ],
        'BPPLP',
      ),
      group(
        'RSMES',
        [
          leaf('RSMES'),
          leaf('RSMES - SERVICE I & II'),
          leaf('RSMES - SUPPORT I & II'),
          leaf('RSMES - CUSTOMER CARE I & II'),
        ],
        'RSMES',
      ),
      group(
        'RLEGS',
        [
          leaf('RLEGS'),
          leaf('REG ES - SERVICE'),
          leaf('REG ES - SUPPORT'),
          leaf('REG GS - GOVERNMENT ORCHESTRATION SUPPORT'),
          leaf('LESA IV (SEMARANG JATENG UTARA)'),
          leaf('LESA V (SOLO JATENG TIMUR & YOGYA JATENG SELATAN)'),
          leaf('LESA VI (SURAMADU)'),
          leaf('LESA VII (JATIM BARAT & JATIM TIMUR)'),
          leaf('LESA VIII (BALI & NUSA TENGGARA)'),
        ],
        'RLEGS',
      ),
      group(
        'RSO I & II',
        [
          leaf('RSO'),
          leaf('RSO - BIDDING MGMT & BUSINESS SUPPORT'),
          leaf('RSO - PARTNER INVOICING & SUPPORT'),
          leaf('RSO - PROJECT MANAGEMENT'),
          leaf('RSO - SOLUTION & OFFERING'),
          leaf('RSO - SERVICE OPERATION SUPPORT'),
        ],
        'RSO',
      ),
      group(
        'SSGS',
        [
          leaf('SSGS'),
          leaf('SSGS - BILLING & PAYMENT COLLECTION I & II'),
          leaf('SSGS - FINANCE SERVICE, TAX & HC I & II'),
          leaf('SSGS - GENERAL SUPPORT'),
          leaf('SSGS - INFORMATION SYSTEM & CYBERSECURITY'),
        ],
        'SSGS',
      ),
      witel('WITEL SURAMADU'),
      witel('WITEL JATIM TIMUR'),
      witel('WITEL JATIM BARAT'),
      witel('WITEL BALI'),
      witel('WITEL NUSA TENGGARA'),
      witel('WITEL SEMARANG JATENG UTARA'),
      witel('WITEL JOGJA JATENG SELATAN'),
      witel('WITEL SOLO JATENG TIMUR', ['TELDA KUDUS', 'TELDA PATI', 'TELDA PURWODADI', 'TELDA SRAGEN']),
      leaf('Unit X'),
    ]),
    leaf('DPS (BUD)'),
    leaf('DSS (BUD)'),
    leaf('DGS (BUD)'),
    leaf('EMG'),
    leaf('DIT'),
    leaf('DCS'),
  ]),
  group('TIF', [custom('DISTRICT*', 'DISTRICT'), leaf('RWS'), leaf('HO')], 'TIF'),
  custom('TELKOMSEL - BRANCH*', 'TELKOMSEL - BRANCH'),
  leaf('TELKOMSEL - HO'),
  leaf('OTHERS (AP LAINNYA)'),
];

// Ganti nama witel bertanda * dengan node custom (TELDA*) pada witel yang punya isian dinamis
// (7 witel pertama: Suramadu sampai Jogja). Witel Solo Jateng Timur memakai daftar TELDA statis.
const DYNAMIC_WITEL = [
  'WITEL SURAMADU',
  'WITEL JATIM TIMUR',
  'WITEL JATIM BARAT',
  'WITEL BALI',
  'WITEL NUSA TENGGARA',
  'WITEL SEMARANG JATENG UTARA',
  'WITEL JOGJA JATENG SELATAN',
];
const tr3 = UIC_TREE[0].children[0];
tr3.children = tr3.children.map((n) => (DYNAMIC_WITEL.includes(n.label) ? witelWithTelda(n.label) : n));

/** Semua nilai (value) yang valid, untuk validasi parameter URL. */
export const UIC_TREE_VALUES = (() => {
  const out = new Set();
  const walk = (nodes) =>
    nodes.forEach((n) => {
      if (n.value) out.add(n.value);
      if (n.children) walk(n.children);
    });
  walk(UIC_TREE);
  return out;
})();
