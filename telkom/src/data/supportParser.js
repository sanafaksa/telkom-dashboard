import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const DEFAULT_SUPPORT_CSV = `NO,TGL,AGENDA,MAIN TOPIC,UNIT/TELDA,PESERTA,PEMBAHASAN,PEMBAHASAN (NOTULEN),ACTION PLAN,UIC,DESTINASI FU,SUPPORT NEEDED,DEADLINE,STATUS,NOTES TO FOLLOW UP,
1,11/09/2026,FORUM WITEL,HSI LIMITER & RESELLER,PRQ,"GM WITEL, PRQ (3), SSGS (3), BS (3), TELDA SOLO (1), TELDA SRAGEN (2), TELDA KUDUS (2), TELDA PATI (2), TELDA PURWODADI (1)","1. Perlu grup koordinasi penanganan HSI Limiter & Reseller di area Witel dan Telda
2. NDE ke Regional mempertahankan semua suspect reseller selama 3 bulan, Desember 2026 dieksekusi massal jika ada kebijakan regional
3. Selama 3 bulan dilakukan identifikasi, reseller yang merusak langsung dieksekusi, contoh misal bayar 200rb penggunaan 3 GB, dengan antisipasi atau usulan penggantian seperti misal jual di area lain atau offering WMS Agency
4. Tsel melakukan streamlining koperasi dan authorized dealer menjadi agency; 1 Oktober CMD bermitra dengan BS untuk alignment reseller dan collection guna mengganti revenue HSI Limiter & Reseller
5. RSMES membantu sosialisasi dan koordinasi pada reseller dengan membawa surat dan menawarkan solusi
6. Masukan Telda dicatat dan dibahas bersama, jika ada yang urgent segera dieksekusi serta didiskusikan dengan legal terkait proses DO
7. NDE ke TIF untuk support pengecekan lokasi reseller diidentifikasi berdasarkan datek, PCRF, radius, dsb; jika ODP kosong masih banyak, munculkan paket akuisisi pelanggan reseller berjangka waktu, misal 50 Mbps menjadi 150rb selama 6 bulan
8. Benchmark ke Witel JTT (Sidoarjo) disampaikan di rapim akan menjual Metro dengan harga khusus untuk mengakuisisi reseller
9. Kolaborasi dengan SA/AR untuk cari tahu end-user pelanggan reseller berapa Mbps dan berapa harganya
10. NDE ke RSMES agar WMS Agency dihidupkan di kantor untuk setiap Telda dan di Witel, Solo piloting di Kudus, namun ada permintaan WMS Agency untuk semua Telda
11. Supporting bahan presentasi ke reseller to EMG/RSME serta bahan offering to reseller
12. NDE GM ke RSME konsultasi terkait ganti rugi fraud menggunakan APH ke sana (cc: Mb Lisa) dengan skenario Komdigi ke Telkom, Telkom cek traffic dan laporkan ke RSME, lalu RSME ke Komdigi & APH untuk tindak lanjut ganti rugi kerugian negara
13. Usulan surat teguran dari regional agar GM bisa melakukan pendekatan kepada reseller
14. NDE GM ke TA untuk pendampingan pengecekan reseller
15. Hitung kembali potensi revenue jika dengan WMS Agency untuk case Kudus
16. Catatan setelah rapat sore: terkait pelanggan terdampak HSI Limiter, boleh tidak whitelist kalau berhasil WMS Agency agar revenue tidak tergerus","1) Perlu grup koordinasi terkait penanganan HSI Limiter & Reseller di area Witel dan Telda
2) NDE to Regional : Secara selektif default mempertahankan semua suspect reseller selama 3 bulan, saat Desember 2026 dilakukan eksekusi massal jika ada kebijakan regional
3) Selama masa 3 bln dilakukan identifikasi -> selektif reseller yg merusak langsung dieksekusi, cth mis bayar 200rb penggunaan 3 GB -> eksekusi dengan antisipasi/usulan untuk penggantian -> mis jual di area tsb/area lain, offering wms agency
4) Tsel dengan melakukan streamlining -> beberapa koperasi, authorized dealer dijadikan agency. 1 okt CMD diharapkan bisa bermitra dengan BS utk dapat dilakukan alignment terkait dengan reseller, collection dll. -> salah satu cara mengganti revenue dari HSI limiter & reseller
5) RSMES membantu melakukan sosialisasi dan koordinasi pada reseller -> harapannya membawa surat pada reseller dan menawarkan solusi
6) Masukan dari Telda akan dicatat dan dibahas bersama. Jika ada yg urgent - segera eksekusi - diskusi dengan legal juga terkait proses DO
7) Lokasi reseller diidentifikasi - datek, pcrf, radius, dsb , jika masih banyak odp kosong - munculkan paket akuisisi pelanggan reseller berjangka waktu. mis 50 mbps -> 150rb selama 6 bulan. -> NDE ke TIF utk support pengecekan
8) Benchmark ke Witel JTT (Sidoarjo) -> disampaikan di rapim akan menjual Metro dengan harga khusus utk mengakuisisi reseller
9) Kolaborasi dengan SA/AR -> cari tahu end user pelanggan reseller brp mbps dan brp hrgnya
10) NDE to RSMES -> WMS Agency dihidupkan di kantor utk setiap telda dan di witel [Solo piloting di kudus, namun permintaan wms agency utk semua telda]
11) Supporting bahan presentasi ke reseller to EMG/RSME - bahan offering to reseller
12) Konsultasi to RSME terkait ganti rugi fraud -> menggunakan APH kesana [cc: mb Lisa]. skenario : komdigi ke telkom. Telkom cek traffic dan laporkan ke rsme -> rsme -> komdigi & APH utk tindak lanjut ganti rugi kerugian negara [NDE GM ke RSMES]
13) Usulan surat teguran dari regional, agar GM bisa melakukan pendekatan kepada reseller
14) Pendampingan pengecekan reseller [NDE GM ke TA]
15) hitung kembali potensi revenue jika dengan wms agency utk case Kudus
16) Note setelah rapat sore: Terkait pelanggan terdampak HSI Limiter, boleh tidak Whitelist kalau berhasil WMS Agency agar revenue tidak tergerus","1) Pembentukan grup telegram penanganan reseller: Anti Fraud SJT (PRQ, BS, Telda, dan SSGS)",PRQ,"BS, SSGS, TELDA",-,W3 Sep 2026,DONE,"Nama Group Telegram ""SJT : Anti Fraud""",
,,,,,,,,"2) NDE ke RSMES : Secara selektif default mempertahankan semua suspect reseller selama 3 bulan, saat Desember 2026 dilakukan eksekusi massal jika ada kebijakan regional",BS,RSMES,-,W3 Sep 2026,DONE,"17/09/2026
C.Tel.351/UM 000/T3W-0H000000/2026 tentang Permohonan Whitelisting Suspect Reseller untuk Penawaran WMS Agency

14/09/2026
Note dari Pak GM: 

Benchmarking Usulan Tiering dari Telda Kudus:
1) Tinggi: > 100 device & > 5 FPP dikeluarkan dari Whitelist
2) Sedang: >= 3 -4 FPP & Jumlah device ditinjau kembali | Whitelist -> Tim Telda Mempercepat PKS WMS Agency, Whitelist dicabut
3) Rendah: < 3 FPP & Jumlah device ditinjau kembali | Whitelist. Tidak terlalu urgent


Keterangan:
Alasan Whitelist s.d. 3 bulan (akhir November 2026) -> Prioritas prosepecting Pelanggan Suspect Reseller HSI di Kategori Sedang dan Tinggi. Untuk kategori Rendah, dilakukan survey dan identifikasi lebih lanjut
Hal ini untuk mengakomodasi kepentingan semua pihak: Revenue, Collection, dan Compliance di Telda
Disusun support datanya dahulu oleh PRQ dan BS. Lalu, disosialisasikan ke Telda",
,,,,,,,,3) Identifikasi data dashboard RCP (pelanggan terdampak HSI Limiter) dan suspect reseller untuk dilakukan offering WMS Agency/solusi connectivity lainnya. Untuk pelanggan yg tidak kooperatif bisa langsung di-blacklist oleh Telda/BS,PRQ,"BS, SSGS, TELDA",1. Dikusi Telda - Witel secara paralel jika ada case yang urgent agar bisa segera dieksekusi. FU diskusi dengan tim Legal jika dibutuhkan (terkait proses DO),W3 Sep 2026,DONE,"15/09/2026
Database whitelist Witel dan Tiering, mekanisme reporting suspect reseller, dan FU prospek WMS Agency ready. Menunggu approval Mgr PRQ dan BS",
,,,,,,,,"4) Rapat pembahasaan kemitraan BS dengan Agensi CMD (01/10/2026) agar dapat dilakukan alignment terkait dengan reseller, collection, dll. sebagai salah satu cara mengganti revenue dari HSI Limiter & reseller ",BS,"GM WITEL, CMD (AGENCY)",-,W3 Sep 2026,IN PROGRESS,,
,,,,,,,,"5) NDE ke TIF : Identifikasi pengecekan lokasi reseller berdasarkan datek, PCRF, radius, dsb.",BS,TIF,-,W3 Sep 2026,BELUM FU,,
,,,,,,,,6) Benchmark ke Witel JTT (Telda Sidoarjo) terkait akuisisi reseller dengan layanan Metro harga khusus,BS,BS WITEL JTT,-,W3 Sep 2026,BELUM FU,,
,,,,,,,,7) Identifikasi detail bandwidth dan harga layanan internet dari end user pelanggan reseller (kolaborasi dengan SA/AR untuk mencari info lapangan),"BS, TELDA",-,-,W3 Sep 2026,DONE,,
,,,,,,,,8) NDE ke RSMES : Permintaan piloting WMS Agency di setiap Telda dan Witel Solo JT (piloting utama di Telda Kudus),BS,-,-,W3 Sep 2026,DONE,"14/09/2026
C.Tel.340/UM 000/T3W-0H000000/2026 tentang Permohonan Trial Pengenalan Produk WMS Agency di Witel Solo Jateng Timur tanggal 14 September 2026",
,,,,,,,,9) NDE ke RSMES : Konsultasi terkait tindak lanjut ganti rugi fraud dengan dalih kerugian negara bersama Komdigi dan APH ,PRQ,BPPLP - LEGAL,1. Kelengkapan data pendukung (case Telda Kudus) utk lampiran ND,W3 Sep 2026,DONE,"17/09/2026
C.Tel.348/UM 000/T3W-0H000000/2026 tentang Permohonan Tambahan Dukungan Atas Laporan Temuan Fraud di Area Telkom Daerah Kudus  Witel Solo Jateng Timur (Skema Ganti Rugi)",
,,,,,,,,10) NDE ke TA : Pendampingan pengecekan ke lokasi suspect reseller ,PRQ,TA,-,W3 Sep 2026,IN PROGRESS,Proses Drafting (OGP),
,,,,,,,,"11) Perhitungan potential revenue gain dan loss dengan implementasi WMS Agency untuk setiap Telda, terutama Telda Kudus",PRQ,-,-,W3 Sep 2026,BELUM FU,,
,,,,,,,,"12) Tim Telda melakukan investigasi suspect reseller (profiling), melakukan offering WMS Agency, dan memastikan tunggakan tertagih (pengamanan collection) s.d. 30/11/2026 sebelum dicabut treatment whitelist",TELDA,-,"1. Dukungan RSMES ke Telda terkait sosialisasi lanjutan, surat teguran ke reseller, marketing kit untuk presentasi dan offering, dan sosialisasi ke reseller jika dibutuhkan
2. Note setelah rapat sore: Terkait pelanggan terdampak HSI Limiter, boleh tidak di-whitelist kalau Telda berhasil dealing WMS Agency agar revenue tidak tergerus",W4 Nov 2026,IN PROGRESS,,
2,11/09/2026,RAPAT PRQ,GTMA-NISASI,PRQ,"GM WITEL, PRQ (3), BS (2), GS (3), LESA V (2)","1. NGTMA dipakai ketika GTMA tidak bisa masuk
2. Pelanggan potensial NGTMA atau project yang sudah NGTMA dijadikan GTMA dengan dibundling connectivity dan dibuat agregat, namun komposisi detilnya perlu diidentifikasi, contoh misal case Witel Bali dijadikan benchmark untuk skema use case Conn 10%, Non-Conn 90%
3. Project-project NGTMA diskusi dengan RSO atau teman-teman regional apakah bisa di-GTMA-kan dan solusi agar bisa GTMA
4. Pertanyaan NGTMA ketika Telkom jadi principal dan saat di-GTMA-kan apakah berpotensi terkena koreksi PSAK tipe agent-principal, benchmark Gov Bali","GTMA-nisasi
- NGTMA dipakai ketika GTMA tidak bisa masuk
- Pelanggan potensial NGTMA atau project yang sudah NGTMA dijadikan GTMA >> dibundling dg connectivity. Dibuat agregat. Namun komposisi detilnya perlu diidentifikasi. Contoh: case Witel Bali bisa dijadikan benchmark utk skema use case Conn  10%, Non-Conn 90%
- Project2 NGTMA diskusi dengan RSO / teman2 Regional apakah bisa di GTMA kan dan Solusi agar bisa GTMA
- Pertanyaan: NGTMA ketika Telkom jadi pricipal dan saat di GTMA-kan apakah sebagai agent atau principal ==> bechmark Gov Bali",1. Membuat daftar project NGTMA all segmen Witel Solo JT,PRQ,"BS, GS, LESA V, RSO - SE",-,W4 Sep 2026,IN PROGRESS,,
,,,,,,,Pertanyaan: NGTMA ketika Telkom jadi pricipal dan saat di GTMA-kan apakah sebagai agent atau principal ==> Concern koreksi PSAK: Agent-Principal,2. Melakukan benchmark ke Mgr Gov Witel Bali terkait project NGTMA yang dibuat GTMA dan tidak terkena koreksi PSAK tipe agent-principal,GS,GS WITEL BALI,-,W4 Sep 2026,IN PROGRESS,,
,,,,,,,,3. Melakukan benchmark ke RSO - SE terkait project NGTMA yang dibuat GTMA dan tidak terkena koreksi PSAK tipe agent-principal,PRQ,RSO,-,W4 Sep 2026,IN PROGRESS,,
3,11/09/2026,RAPAT PRQ,PSAK,PRQ,"GM WITEL, PRQ (3)","1. Cek kelengkapan dokumen seluruh project, tidak hanya yang dipersyaratkan PSAK tetapi juga dokumen pendukung lainnya untuk dilengkapi, serta buat repository-nya
2. File dan berkas apabila ditanya konsultan harus bisa disajikan dalam waktu kurang dari 5 menit, jika belum ada segera dibuat atau dilengkapi, serta identifikasi semua project dan kontrak
3. Jika dokumen berada di unit lain seperti RSO atau Legal, kita wajib memiliki dokumen tersebut dan menyimpannya di repository
4. Saat ini dokumen dapat diakses di NCX dan BIMA, sedangkan mekanisme repository akan didiskusikan lebih lanjut
5. Daily report EDK, AOSODOMORO, dan pengawalan jurbal dapat melalui report summary di Group Telegram dan link monitoring bersama
6. EDK dan AOSODOMORO dibahas berkala per minggu per unit, serta pembahasan komprehensif dengan tema lainnya per unit","PSAK (arahan EVP) :
- Cek kelengkapan dokumen project2 kita, tidak hanya dokumen yg dipersyaratkan PSAK tapi juga dokumen pendukung lainnya untuk dilengkapi. Dan buat repositorynya. 
- File & berkas bila ditanya konsultan, maka <5 menit bisa disajikan. Bila blm ada segera dibuat/dilengkapi. Identifikasi semua project & kontrak.
- Jika dok ada di unit lain (RSO, Legal dll), maka kita harus punya dokumen tersebut dan direpository.
- Saat ini dokumen bisa diakses di NCX dan Bima. Mekanisme repository akan didiskusikan lebih lanjut
- Daily report EDK, AOSODOMORO & pengawalan jurbal bisa melalui report summary di Group Tele dan link monitoring Bersama
- EDK & AOSODOMORO bahas berkala per minggu per unit, pembahasan konprehensip dg tema lainnya per unit.",1. Membuat repository data dan dokumen all project Witel Solo JT (OBL & Non-OBL) sebagai tindakan preventive dan corrective koreksi PSAK,PRQ,"BS, GS, LESA V, RSO - PM",-,W1 Oct 2026,IN PROGRESS,,
,,,,,,,,2. Membuat daily report EDK dan AOSODOMORO,PRQ,"BS, GS, LESA V, RSO - PM",-,W1 Oct 2026,IN PROGRESS,,
,,,,,,,,3. Membuat daily report Pengawalan Jurbal,PRQ,"BS, GS, LESA V, RSO - PM",-,W1 Oct 2026,IN PROGRESS,,
4,11/09/2026,RAPAT PRQ,BEDAH OPERASI BA PELANGGAN HO & NON HO,PRQ,"GM WITEL, PRQ (3)","1. Pengamanan BA HO dan Non HO pelanggan private, perlu bedah operasi dengan Bu Myra, RLEGS & BUD
2. ND pelurusan CBASE untuk all segmen, khusus segmen Gov perlu dibuatkan ND pelurusan pengakuan revenue yang masuk Witel lain, contoh case RSUD, Polres & yang serupa  UIC  Gov","Diskusi bedah BA HO & non HO
- Pengamanan BA HO dan Non HO pelanggan Private. Perlu bedah operasi dengan Bu Myra, RLEGS & BUD
- Pelurusan CBASE via Nota Dinas utk all segmen. Di segmen Gov perlu dibuatkan ND pelurusan pengakuan revenue yg masuk witel lain (Case RSUD, Polres & yang serupa  UIC  Gov)",1. Identifikasi BA HO dan Non HO khusus pelanggan Private di level Witel,"PRQ, LESA V",-,-,W4 Sep 2026,DONE,,
21,,,LTS & Bedah KW Pelanggan,,,,,"2. Bedah operasi/koordinasi hasil identifikasi BA HO dan Non HO khusus pelanggan Private dengan BPPLP (Bu Myra), RLEGS, dan BUD terkait","PRQ, LESA V","BPPLP, RLEGS, DPS",-,W4 Sep 2026,IN PROGRESS,,
,,,,,,,,3. NDE ke BPPLP : Pelurusan segmen pelanggan dan pelurusan pengakuan revenue yang masuk ke witel lain,PRQ,RLEGS,-,W4 Sep 2026,BELUM FU,"16/09/2026
GS: NDE Pelurusan Revenue RSUD Sultan Fatah Demak, dan yang sejenisnya (POLRES) ",`;

/**
 * Normalizes status strings from various spreadsheet formats.
 */
export function normalizeStatus(rawStatus) {
  if (!rawStatus) return 'BELUM FU';
  const s = String(rawStatus).trim().toUpperCase();
  if (s === 'DONE' || s === 'TUNTAS' || s === 'SELESAI') return 'DONE';
  if (
    s === 'IN PROGRESS' ||
    s === 'ON PROGRESS' ||
    s === 'PROGRESS' ||
    s === 'ON-PROGRESS'
  )
    return 'IN PROGRESS';
  if (s === 'NEED DISCUSS' || s === 'DISCUSS' || s === 'BUTUH DISKUSI')
    return 'NEED DISCUSS';
  return 'BELUM FU'; // Default for 'BELUM FU', 'OPEN', 'PENDING', etc.
}

/**
 * Parses raw CSV string into structured Action Plan items.
 * Handles filled-down rows (where parent meeting data is only on the first row).
 */
export function parseSupportCSV(csvString) {
  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });

  const currentMeeting = {
    no: '',
    tgl: '',
    agenda: 'FORUM WITEL',
    mainTopic: '',
    unitTelda: '',
    peserta: '',
    pembahasan: '',
    pembahasanNotulen: ''
  };

  const actionPlans = [];

  result.data.forEach((row, idx) => {
    // Helper to find column regardless of casing or extra spaces
    const get = (targetKey) => {
      const found = Object.keys(row).find(
        (k) => k.trim().toUpperCase() === targetKey.toUpperCase()
      );
      return found ? String(row[found] || '').trim() : '';
    };

    const no = get('NO');
    const tgl = get('TGL');
    const agenda = get('AGENDA');
    const mainTopic = get('MAIN TOPIC');
    const unitTelda = get('UNIT/TELDA') || get('UNIT');
    const peserta = get('PESERTA');
    const pembahasan = get('PEMBAHASAN');
    const notulen = get('PEMBAHASAN (NOTULEN)') || get('NOTULEN');

    // Fill-down parent meeting data
    if (no) currentMeeting.no = no;
    if (tgl) currentMeeting.tgl = tgl;
    if (agenda) currentMeeting.agenda = agenda;
    if (mainTopic) currentMeeting.mainTopic = mainTopic;
    if (unitTelda) currentMeeting.unitTelda = unitTelda;
    if (peserta) currentMeeting.peserta = peserta;
    if (pembahasan) currentMeeting.pembahasan = pembahasan;
    if (notulen) currentMeeting.pembahasanNotulen = notulen;

    const actionPlan = get('ACTION PLAN');
    const uic = get('UIC');
    const destinasiFu = get('DESTINASI FU') || get('DESTINASI');
    const supportNeeded = get('SUPPORT NEEDED') || get('SUPPORT');
    const deadline = get('DEADLINE');
    const status = get('STATUS');
    const notes = get('NOTES TO FOLLOW UP') || get('NOTES') || get('CATATAN');

    // If row has an action plan or status or notes, capture it
    if (actionPlan || status || notes || supportNeeded) {
      actionPlans.push({
        id: idx + 1,
        no: currentMeeting.no || String(actionPlans.length + 1),
        tgl: currentMeeting.tgl || 'N/A',
        agenda: currentMeeting.agenda || 'FORUM LAINNYA',
        mainTopic: currentMeeting.mainTopic || 'Umum',
        unitTelda: currentMeeting.unitTelda || 'PRQ',
        peserta: currentMeeting.peserta || '',
        pembahasan: currentMeeting.pembahasan || '',
        pembahasanNotulen: currentMeeting.pembahasanNotulen || '',
        actionPlan: actionPlan || '(Tidak ada rincian aksi)',
        uic: uic || currentMeeting.unitTelda || 'PRQ',
        destinasiFu: destinasiFu && destinasiFu !== '-' ? destinasiFu : '-',
        supportNeeded:
          supportNeeded && supportNeeded !== '-' ? supportNeeded : '-',
        deadline: deadline || '-',
        status: normalizeStatus(status),
        notes: notes || ''
      });
    }
  });

  return actionPlans;
}

/**
 * Parses binary Excel file (XLSX / XLS) into Action Plan items.
 */
export async function parseSupportExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const parsed = parseSupportCSV(csv);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Calculates aggregated statistics (Agenda Table, Grand Total, and Unit Cards)
 * dynamically from any array of Action Plan items.
 */
export function computeSupportMetrics(actionPlans = []) {
  if (!actionPlans || actionPlans.length === 0) {
    return {
      agendaList: [],
      agendaSummary: {
        totalCategories: 0,
        totalOpen: 0,
        pctOpen: '0%',
        totalDiscuss: 0,
        pctDiscuss: '0%',
        totalProgress: 0,
        pctProgress: '0%',
        totalDone: 0,
        pctDone: '0%',
        grandTotal: 0,
        note: 'Belum ada data tindak lanjut yang terunggah.',
        lastSync: 'Baru saja'
      },
      unitsList: []
    };
  }

  // 1. Group by Agenda Category
  const agendaMap = new Map();
  actionPlans.forEach((item) => {
    const rawAgenda = (item.agenda || 'FORUM LAINNYA').trim();
    if (!agendaMap.has(rawAgenda)) {
      agendaMap.set(rawAgenda, {
        name: rawAgenda,
        open: 0,
        discuss: 0,
        progress: 0,
        done: 0,
        total: 0
      });
    }

    const ag = agendaMap.get(rawAgenda);
    ag.total += 1;

    if (item.status === 'DONE') {
      ag.done += 1;
    } else if (item.status === 'IN PROGRESS') {
      ag.progress += 1;
    } else if (item.status === 'NEED DISCUSS') {
      ag.discuss += 1;
    } else {
      ag.open += 1; // BELUM FU
    }
  });

  const agendaList = Array.from(agendaMap.values()).map((ag, index) => {
    const tot = ag.total || 1;
    return {
      no: index + 1,
      name: ag.name,
      open: ag.open,
      pctOpen: `${Math.round((ag.open / tot) * 100)}%`,
      discuss: ag.discuss,
      pctDiscuss: `${Math.round((ag.discuss / tot) * 100)}%`,
      progress: ag.progress,
      pctProgress: `${Math.round((ag.progress / tot) * 100)}%`,
      done: ag.done,
      pctDone: `${Math.round((ag.done / tot) * 100)}%`,
      total: ag.total,
      highlightNo: ag.open > 0
    };
  });

  // 2. Compute Grand Totals
  const totalOpen = agendaList.reduce((acc, x) => acc + x.open, 0);
  const totalDiscuss = agendaList.reduce((acc, x) => acc + x.discuss, 0);
  const totalProgress = agendaList.reduce((acc, x) => acc + x.progress, 0);
  const totalDone = agendaList.reduce((acc, x) => acc + x.done, 0);
  const grandTotal = actionPlans.length;

  const safePct = (val) =>
    grandTotal > 0 ? `${Math.round((val / grandTotal) * 100)}%` : '0%';

  const openAgendas = agendaList
    .filter((a) => a.open > 0)
    .map((a) => a.name)
    .slice(0, 3)
    .join(', ');

  const noteText =
    totalOpen > 0
      ? `Terdapat ${totalOpen} action plan berstatus Open/Belum FU (${openAgendas || 'Semua agenda'}) dan ${totalProgress} on progress yang memerlukan tindak lanjut koordinasi.`
      : `Seluruh action plan dalam pengawalan aktif (${totalDone} selesai, ${totalProgress} on progress).`;

  const agendaSummary = {
    totalCategories: agendaList.length,
    totalOpen,
    pctOpen: safePct(totalOpen),
    totalDiscuss,
    pctDiscuss: safePct(totalDiscuss),
    totalProgress,
    pctProgress: safePct(totalProgress),
    totalDone,
    pctDone: safePct(totalDone),
    grandTotal,
    note: noteText,
    lastSync: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB'
  };

  // 3. Group by Unit / UIC
  const unitMap = new Map();
  actionPlans.forEach((item) => {
    // Split UIC if comma separated (e.g. "BS, TELDA") or use as single unit
    const uicList = item.uic
      ? item.uic.split(',').map((s) => s.trim()).filter(Boolean)
      : ['PRQ'];

    uicList.forEach((u) => {
      if (!unitMap.has(u)) {
        unitMap.set(u, {
          name: u,
          count: 0,
          open: 0,
          progress: 0,
          done: 0
        });
      }
      const unitObj = unitMap.get(u);
      unitObj.count += 1;
      if (item.status === 'DONE') unitObj.done += 1;
      else if (item.status === 'IN PROGRESS') unitObj.progress += 1;
      else unitObj.open += 1;
    });
  });

  const sortedUnits = Array.from(unitMap.values()).sort(
    (a, b) => b.count - a.count
  );

  const unitsList = sortedUnits.slice(0, 4).map((u, i) => {
    let cat = 'UNIT OPERASIONAL';
    if (i === 0) cat = 'UNIT DUKUNGAN TERBANYAK';
    else if (u.name.includes('TELDA')) cat = 'TELKOM DAERAH';
    else if (u.name === 'PRQ') cat = 'PERFORMANCE & QUALITY';
    else if (u.name === 'BS') cat = 'BUSINESS SERVICE';
    else if (u.name === 'GS') cat = 'GOVERNMENT SERVICE';

    return {
      category: cat,
      name: `Unit ${u.name}`,
      count: u.count,
      status: `${u.open} Belum FU, ${u.progress} On Progress, ${u.done} Done`,
      isTop: i === 0
    };
  });

  return { agendaList, agendaSummary, unitsList };
}

// Local Storage helpers
const STORAGE_KEY = 'solaris_support_action_plans_v1';

export function loadSavedSupportData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load saved support data, using default:', e);
  }
  return parseSupportCSV(DEFAULT_SUPPORT_CSV);
}

export function saveSupportData(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save support data:', e);
  }
}

export function resetSupportData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset support data:', e);
  }
  return parseSupportCSV(DEFAULT_SUPPORT_CSV);
}
