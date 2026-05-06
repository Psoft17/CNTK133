// ╔══════════════════════════════════════════════════════╗
// ║  ⚙️  CẤU HÌNH — Thay 2 giá trị này trước khi dùng  ║
// ╚══════════════════════════════════════════════════════╝
const SUPABASE_URL  = 'https://lhugrpvbdgllcyyanxcd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxodWdycHZiZGdsbGN5eWFueGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDE5MTksImV4cCI6MjA5MDUxNzkxOX0.TXjENWdqjGgdLWPVgnTRbFnAsAAaHoQKOfI4mQoILG0';

// ── Khởi tạo Supabase client ──────────────────────────
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ══════════════════════════════════════════════════════
//  SUPABASE — Load tất cả data
// ══════════════════════════════════════════════════════
async function loadAllData() {
  const [
    { data: nhanVien },
    { data: phieuChi },
    { data: chiTiet },
    { data: thanhToan },
    { data: quyNop },
    { data: quyChi },
    { data: lichSuXoa },
  ] = await Promise.all([
    sb.from('nhan_vien').select('*').order('created_at'),
    sb.from('phieu_chi').select('*').order('created_at', { ascending: false }),
    sb.from('chi_tiet_phieu_chi').select('*'),
    sb.from('thanh_toan').select('*').order('created_at', { ascending: false }),
    sb.from('quy_nop').select('*').order('created_at', { ascending: false }),
    sb.from('quy_chi').select('*').order('created_at', { ascending: false }),
    sb.from('lich_su_xoa').select('*').order('xoa_luc', { ascending: false }),
  ]);

  // Map key → camelCase để khớp UI cũ
  const nvList = (nhanVien||[]).map(r => ({
    id: r.id, hoTen: r.ho_ten, email: r.email,
    avatarFileID: r.avatar_url || '', qrFileID: r.qr_url || ''
  }));
  const pcList = (phieuChi||[]).map(r => ({
    id: r.id, moTa: r.mo_ta, soTienTong: r.so_tien_tong,
    nguoiUngID: r.nguoi_ung_id, ngayTao: r.ngay_tao
  }));
  const ctList = (chiTiet||[]).map(r => ({
    id: r.id, phieuChiID: r.phieu_chi_id,
    nhanVienID: r.nhan_vien_id, soTienChia: r.so_tien_chia
  }));
  const ttList = (thanhToan||[]).map(r => ({
    id: r.id, nguoiTraID: r.nguoi_tra_id, nguoiNhanID: r.nguoi_nhan_id,
    soTien: r.so_tien, ngayTao: r.ngay_tao
  }));
  const qnList = (quyNop||[]).map(r => ({
    id: r.id, nhanVienID: r.nhan_vien_id, soTien: r.so_tien,
    moTa: r.mo_ta, ngayNop: r.ngay_nop
  }));
  const qcList = (quyChi||[]).map(r => ({
    id: r.id, moTa: r.mo_ta, soTien: r.so_tien, ngayTao: r.ngay_tao
  }));
  const lsxList = (lichSuXoa||[]).map(r => ({
    id: r.id, loai: r.loai, tenLoai: r.ten_loai,
    recordId: r.record_id, moTa: r.mo_ta,
    soTien: r.so_tien || 0, nguoiLienQuan: r.nguoi_lien_quan,
    ngayGoc: r.ngay_goc, xoaLuc: r.xoa_luc,
    dataJson: r.data_json || null
  }));

  // Enrich với tên NV
  const nvMap = {}; nvList.forEach(nv => nvMap[nv.id] = nv);
  qnList.forEach(q => q.nhanVienTen = nvMap[q.nhanVienID]?.hoTen || q.nhanVienID);
  ttList.forEach(t => {
    t.nguoiTraTen  = nvMap[t.nguoiTraID]?.hoTen  || t.nguoiTraID;
    t.nguoiNhanTen = nvMap[t.nguoiNhanID]?.hoTen || t.nguoiNhanID;
  });

  // Tính số dư
  const soDuList = calcSoDu(nvList, pcList, ctList, ttList);
  const goiYThanhToan = calcGoiY(soDuList);
  const tongNopQuy = qnList.reduce((s,q)=>s+q.soTien, 0);
  const tongChiQuy = qcList.reduce((s,q)=>s+q.soTien, 0);

  return {
    nhanVien: nvList, phieuChi: pcList, chiTietPhieuChi: ctList,
    thanhToanList: ttList, quyChi: qnList, chiQuyList: qcList,
    soDuList, goiYThanhToan,
    tongNopQuy, tongChiQuy, soDuQuy: tongNopQuy - tongChiQuy,
    lichSuXoaList: lsxList
  };
}

// ── Tính số dư từng người ─────────────────────────────
function calcSoDu(nvList, pcList, ctList, ttList) {
  const bal = {};
  nvList.forEach(nv => bal[nv.id] = 0);

  // Mỗi phiếu chi: người ứng được +tổng, từng người tham gia bị -phần của mình
  ctList.forEach(ct => {
    const pc = pcList.find(p => p.id === ct.phieuChiID);
    if (!pc) return;
    if (bal[pc.nguoiUngID] !== undefined) bal[pc.nguoiUngID] += ct.soTienChia;
    if (bal[ct.nhanVienID] !== undefined) bal[ct.nhanVienID] -= ct.soTienChia;
  });

  // Thanh toán: người trả +, người nhận -
  ttList.forEach(tt => {
    if (bal[tt.nguoiTraID]  !== undefined) bal[tt.nguoiTraID]  += tt.soTien;
    if (bal[tt.nguoiNhanID] !== undefined) bal[tt.nguoiNhanID] -= tt.soTien;
  });

  const nvMap = {}; nvList.forEach(nv => nvMap[nv.id] = nv);
  return nvList.map(nv => ({
    ...nvMap[nv.id], soDu: Math.round(bal[nv.id] || 0)
  }));
}

// ── Thuật toán gợi ý thanh toán tối ưu (min-cash-flow) ─
function calcGoiY(soDuList) {
  const credits = soDuList.filter(n => n.soDu > 0).map(n => ({...n}));
  const debits  = soDuList.filter(n => n.soDu < 0).map(n => ({...n}));
  const result  = [];
  let i = 0, j = 0;
  while (i < debits.length && j < credits.length) {
    const d = debits[i], c = credits[j];
    const amt = Math.min(-d.soDu, c.soDu);
    if (amt > 0) result.push({
      nguoiTraID: d.id, nguoiTraTen: d.hoTen,
      nguoiNhanID: c.id, nguoiNhanTen: c.hoTen, soTien: amt
    });
    d.soDu += amt; c.soDu -= amt;
    if (Math.abs(d.soDu) < 1) i++;
    if (Math.abs(c.soDu) < 1) j++;
  }
  return result;
}

// ══════════════════════════════════════════════════════
//  REALTIME — Subscribe tất cả bảng quan trọng
// ══════════════════════════════════════════════════════
function startRealtime() {
  sb.channel('congno-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'nhan_vien' },         handleRTChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'phieu_chi' },         handleRTChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chi_tiet_phieu_chi' },handleRTChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'thanh_toan' },        handleRTChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quy_nop' },           handleRTChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quy_chi' },           handleRTChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lich_su_xoa' },      handleRTChange)
    .subscribe();
}

var _rtDebounce = null;
function handleRTChange() {
  // Debounce 300ms để gom nhiều changes cùng lúc
  clearTimeout(_rtDebounce);
  _rtDebounce = setTimeout(async () => {
    const dot = document.getElementById('rt-dot');
    if (dot) { dot.classList.add('on'); setTimeout(() => dot.classList.remove('on'), 1800); }
    D = await loadAllData();
    renderAll(D);
  }, 300);
}
