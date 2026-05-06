// ══════════════════════════════════════════════════════
//  EMAIL THÔNG BÁO
// ══════════════════════════════════════════════════════
async function doSaveEmailNV(btn) {
  const nvID = document.getElementById('email-nv-id').value;
  const email = document.getElementById('email-nv-input').value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return mAlert('email-nv-alert', '⚠️ Email không hợp lệ!', false);
  setLoading(btn, '<i class="ri-loader-4-line ri-spin"></i> Đang lưu...');
  const { error } = await sb.from('nhan_vien').update({ email: email || null }).eq('id', nvID);
  resetBtn(btn, '<i class="ri-check-line"></i> Lưu');
  if (error) return mAlert('email-nv-alert', '❌ ' + error.message, false);
  toast('✅ Đã cập nhật email thông báo!', 'ok');
  closeModal('modal-email-nv');
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════

// Tạo ID giống định dạng cũ
function genID(prefix) {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  return prefix
    + String(now.getFullYear()).slice(2) + pad(now.getMonth()+1)
    + pad(now.getDate()) + pad(now.getHours())
    + pad(now.getMinutes()) + pad(now.getSeconds())
    + String(Math.floor(Math.random()*100)).padStart(2,'0');
}

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// ══════════════════════════════════════════════════════
//  CRUD OPERATIONS
// ══════════════════════════════════════════════════════

async function doThemNV(btn) {
  const hoTen = document.getElementById('nv-hoten').value.trim();
  const email  = document.getElementById('nv-email').value.trim();
  if (!hoTen) return mAlert('nv-alert','⚠️ Vui lòng nhập họ và tên!',false);
  setLoading(btn,'<i class="ri-loader-4-line ri-spin"></i> Đang lưu...');
  const { error } = await sb.from('nhan_vien').insert({ id: genID('NV'), ho_ten: hoTen, email: email||null });
  resetBtn(btn,'<i class="ri-check-line"></i> Thêm nhân viên');
  if (error) return mAlert('nv-alert','❌ '+error.message,false);
  document.getElementById('nv-hoten').value = '';
  document.getElementById('nv-email').value = '';
  closeModal('modal-nhanvien');
  toast('✅ Đã thêm "'+hoTen+'"!','ok');
}

async function doTaoPC(btn) {
  let moTa = document.getElementById('pc-mota').value.trim();
  if (!moTa) {
    const chip = document.querySelector('.mota-chip.on');
    if (chip) moTa = chip.textContent.replace(/^[^ ]+ /,'').trim();
  }
  if (!moTa) return mAlert('pc-alert','⚠️ Chọn loại chi tiêu!',false);
  const soTien = Number(document.getElementById('pc-sotien').value);
  const payer  = document.getElementById('pc-nguoiung').value;
  const ngay   = document.getElementById('pc-ngay').value.trim() || todayStr();
  const ghiChu = document.getElementById('pc-ghichu').value.trim();
  if (!soTien||soTien<1000) return mAlert('pc-alert','⚠️ Số tiền không hợp lệ!',false);
  if (!payer) return mAlert('pc-alert','⚠️ Chọn người ứng tiền!',false);
  if (ngay && !/^\d{2}\/\d{2}\/\d{4}$/.test(ngay)) return mAlert('pc-alert','⚠️ Ngày không đúng định dạng!',false);

  const dsChi = [];
  if (D) D.nhanVien.forEach(nv => {
    const row = document.getElementById('prow-'+nv.id);
    if (!row||!row.classList.contains('on')) return;
    const amt = document.getElementById('amt-'+nv.id);
    dsChi.push({ nvID: nv.id, soTien: Number(amt?.value)||0 });
  });
  if (!dsChi.length) return mAlert('pc-alert','⚠️ Chọn ít nhất 1 người tham gia!',false);
  if (splitMode==='custom') {
    const sum = dsChi.reduce((s,x)=>s+x.soTien,0);
    if (Math.abs(sum-soTien)>1) return mAlert('pc-alert','⚠️ Tổng chia chưa khớp!',false);
  }

  const moTaFull = ghiChu ? moTa+' · '+ghiChu : moTa;
  const pcID = genID('PC');
  setLoading(btn,'<i class="ri-loader-4-line ri-spin"></i> Đang lưu...');

  const { error: e1 } = await sb.from('phieu_chi').insert({
    id: pcID, mo_ta: moTaFull, so_tien_tong: soTien,
    nguoi_ung_id: payer, ngay_tao: ngay
  });
  if (e1) { resetBtn(btn,'<i class="ri-check-line"></i> Tạo phiếu chi'); return mAlert('pc-alert','❌ '+e1.message,false); }

  const rows = dsChi.map(x => ({ phieu_chi_id: pcID, nhan_vien_id: x.nvID, so_tien_chia: x.soTien }));
  const { error: e2 } = await sb.from('chi_tiet_phieu_chi').insert(rows);
  resetBtn(btn,'<i class="ri-check-line"></i> Tạo phiếu chi');
  if (e2) return mAlert('pc-alert','❌ '+e2.message,false);
  resetPCForm();
  closeModal('modal-phieuchi');
  toast('✅ Tạo phiếu chi thành công!','ok');
}

async function doNopQuy(btn) {
  const nvID   = document.getElementById('nq-nv').value;
  const soTien = Number(document.getElementById('nq-sotien').value);
  const moTa   = document.getElementById('nq-mota').value.trim();
  const ngay   = document.getElementById('nq-ngay').value.trim() || todayStr();
  if (!nvID) return mAlert('nq-alert','⚠️ Chọn nhân viên!',false);
  if (!soTien||soTien<1000) return mAlert('nq-alert','⚠️ Số tiền không hợp lệ!',false);
  setLoading(btn,'<i class="ri-loader-4-line ri-spin"></i> Đang lưu...');
  const { error } = await sb.from('quy_nop').insert({ id: genID('NQ'), nhan_vien_id: nvID, so_tien: soTien, mo_ta: moTa||null, ngay_nop: ngay });
  resetBtn(btn,'<i class="ri-check-line"></i> Xác nhận nộp');
  if (error) return mAlert('nq-alert','❌ '+error.message,false);
  ['nq-sotien','nq-mota','nq-ngay'].forEach(id => document.getElementById(id).value='');
  document.getElementById('nq-nv').value='';
  closeModal('modal-nopquy');
  toast('✅ Nộp quỹ thành công!','ok');
}

async function doChiQuy(btn) {
  const moTa   = document.getElementById('cq-mota').value.trim();
  const soTien = Number(document.getElementById('cq-sotien').value);
  const ngay   = document.getElementById('cq-ngay').value.trim() || todayStr();
  if (!moTa) return mAlert('cq-alert','⚠️ Nhập mô tả!',false);
  if (!soTien||soTien<1000) return mAlert('cq-alert','⚠️ Số tiền không hợp lệ!',false);
  if (D && soTien > D.soDuQuy) return mAlert('cq-alert','⚠️ Vượt quá số dư quỹ ('+fVND(D.soDuQuy)+')!',false);
  setLoading(btn,'<i class="ri-loader-4-line ri-spin"></i> Đang lưu...');
  const { error } = await sb.from('quy_chi').insert({ id: genID('CQ'), mo_ta: moTa, so_tien: soTien, ngay_tao: ngay });
  resetBtn(btn,'<i class="ri-check-line"></i> Ghi nhận chi');
  if (error) return mAlert('cq-alert','❌ '+error.message,false);
  ['cq-mota','cq-sotien','cq-ngay'].forEach(id => document.getElementById(id).value='');
  closeModal('modal-chiquy');
  toast('✅ Ghi nhận thành công!','ok');
}

async function confirmTT() {
  const btn = document.getElementById('qrtt-confirm-btn');
  btn.disabled=true; btn.innerHTML='<i class="ri-loader-4-line ri-spin"></i> Đang ghi...';
  const { error } = await sb.from('thanh_toan').insert({
    id: genID('TT'), nguoi_tra_id: ttPending.traID,
    nguoi_nhan_id: ttPending.nhanID, so_tien: ttPending.soTien,
    ngay_tao: todayStr()
  });
  btn.disabled=false; btn.innerHTML='<i class="ri-check-double-line"></i> Đã chuyển — Ghi nhận';
  if (error) return toast('❌ '+error.message,'err');
  closeQRTT();
  document.getElementById('tt-tra').value='';
  document.getElementById('tt-nhan').value='';
  document.getElementById('tt-sotien').value='';
  document.getElementById('tt-alert').innerHTML='';
  toast('✅ Ghi nhận thanh toán thành công!','ok');
}

// ── SỬA ──────────────────────────────────────────────
async function doSuaPC(btn) {
  const id       = document.getElementById('epc-id').value;
  const moTa     = document.getElementById('epc-mota').value.trim();
  const soTien   = Number(document.getElementById('epc-sotien').value);
  const nguoiUng = document.getElementById('epc-nguoiung').value;
  const ngay     = document.getElementById('epc-ngay').value.trim();
  if (!moTa||!soTien||!nguoiUng) return mAlert('epc-alert','⚠️ Vui lòng điền đầy đủ!',false);
  const parts = [];
  document.querySelectorAll('.epc-part-amt').forEach(inp => parts.push({ nvID: inp.dataset.nvid, soTien: Number(inp.value)||0 }));
  if (parts.length) {
    const sum = parts.reduce((s,p)=>s+p.soTien,0);
    if (Math.abs(sum-soTien)>1) return mAlert('epc-alert','⚠️ Tổng phân bổ chưa khớp!',false);
  }
  setLoading(btn,'<i class="ri-loader-4-line ri-spin"></i> Đang lưu...');
  const { error: e1 } = await sb.from('phieu_chi').update({ mo_ta: moTa, so_tien_tong: soTien, nguoi_ung_id: nguoiUng, ngay_tao: ngay }).eq('id',id);
  if (e1) { resetBtn(btn,'<i class="ri-save-line"></i> Lưu thay đổi'); return mAlert('epc-alert','❌ '+e1.message,false); }
  if (parts.length) {
    await sb.from('chi_tiet_phieu_chi').delete().eq('phieu_chi_id',id);
    await sb.from('chi_tiet_phieu_chi').insert(parts.map(p=>({ phieu_chi_id: id, nhan_vien_id: p.nvID, so_tien_chia: p.soTien })));
  }
  resetBtn(btn,'<i class="ri-save-line"></i> Lưu thay đổi');
  toast('✅ Đã cập nhật!','ok'); closeModal('modal-edit-pc');
}

async function doSuaNQ(btn) {
  const id = document.getElementById('enq-id').value;
  const nvID = document.getElementById('enq-nv').value;
  const soTien = Number(document.getElementById('enq-sotien').value);
  const moTa = document.getElementById('enq-mota').value.trim();
  const ngay = document.getElementById('enq-ngay').value.trim();
  if (!nvID||!soTien) return mAlert('enq-alert','⚠️ Vui lòng điền đầy đủ!',false);
  setLoading(btn,'<i class="ri-loader-4-line ri-spin"></i> Đang lưu...');
  const { error } = await sb.from('quy_nop').update({ nhan_vien_id: nvID, so_tien: soTien, mo_ta: moTa, ngay_nop: ngay }).eq('id',id);
  resetBtn(btn,'<i class="ri-save-line"></i> Lưu thay đổi');
  if (error) return mAlert('enq-alert','❌ '+error.message,false);
  toast('✅ Đã cập nhật!','ok'); closeModal('modal-edit-nq');
}

async function doSuaCQ(btn) {
  const id = document.getElementById('ecq-id').value;
  const moTa = document.getElementById('ecq-mota').value.trim();
  const soTien = Number(document.getElementById('ecq-sotien').value);
  const ngay = document.getElementById('ecq-ngay').value.trim();
  if (!moTa||!soTien) return mAlert('ecq-alert','⚠️ Vui lòng điền đầy đủ!',false);
  setLoading(btn,'<i class="ri-loader-4-line ri-spin"></i> Đang lưu...');
  const { error } = await sb.from('quy_chi').update({ mo_ta: moTa, so_tien: soTien, ngay_tao: ngay }).eq('id',id);
  resetBtn(btn,'<i class="ri-save-line"></i> Lưu thay đổi');
  if (error) return mAlert('ecq-alert','❌ '+error.message,false);
  toast('✅ Đã cập nhật!','ok'); closeModal('modal-edit-cq');
}

async function doSuaTT(btn) {
  const id = document.getElementById('ett-id').value;
  const tra = document.getElementById('ett-tra').value;
  const nhan = document.getElementById('ett-nhan').value;
  const soTien = Number(document.getElementById('ett-sotien').value);
  const ngay = document.getElementById('ett-ngay').value.trim();
  if (!tra||!nhan||!soTien||tra===nhan) return mAlert('ett-alert','⚠️ Vui lòng kiểm tra lại!',false);
  setLoading(btn,'<i class="ri-loader-4-line ri-spin"></i> Đang lưu...');
  const { error } = await sb.from('thanh_toan').update({ nguoi_tra_id: tra, nguoi_nhan_id: nhan, so_tien: soTien, ngay_tao: ngay }).eq('id',id);
  resetBtn(btn,'<i class="ri-save-line"></i> Lưu thay đổi');
  if (error) return mAlert('ett-alert','❌ '+error.message,false);
  toast('✅ Đã cập nhật!','ok'); closeModal('modal-edit-tt');
}

// ── XÓA ──────────────────────────────────────────────
const _tableMap = { PC:'phieu_chi', NQ:'quy_nop', CQ:'quy_chi', TT:'thanh_toan' };
const _labelMap = { PC:'phiếu chi', NQ:'khoản nộp quỹ', CQ:'khoản chi quỹ', TT:'thanh toán' };

async function xoaPhieu(loai, id) {
  if (!await showConfirm('Xác nhận xóa '+_labelMap[loai]+' '+id+'?\nThao tác này không thể hoàn tác!')) return;
  const { error } = await sb.from(_tableMap[loai]).delete().eq('id',id);
  if (error) toast('❌ '+error.message,'err');
  else toast('✅ Đã xóa!','ok');
}

// ══════════════════════════════════════════════════════
//  UPLOAD ẢNH — Supabase Storage
// ══════════════════════════════════════════════════════
function triggerAvatarUpload(nvID) {
  currentUploadNvID = nvID;
  document.getElementById('avt-file-input').value='';
  document.getElementById('avt-file-input').click();
}
function triggerQRUpload(nvID) {
  currentQRNvID = nvID; currentUploadNvID = nvID;
  document.getElementById('qr-file-input').value='';
  document.getElementById('qr-file-input').click();
}
function onAvatarFileSelected(e) {
  const f = e.target.files[0];
  if (!f||!currentUploadNvID) return;
  if (!f.type.startsWith('image/')) return toast('⚠️ Chỉ chấp nhận file ảnh!','err');
  if (f.size > 5*1024*1024) return toast('⚠️ File quá lớn (tối đa 5MB)!','err');
  const r = new FileReader(); r.onload = e2 => cropOpen(e2.target.result, f.type, 'avatar'); r.readAsDataURL(f);
}
function onQRFileSelected(e) {
  const f = e.target.files[0];
  if (!f||!currentQRNvID) return;
  if (!f.type.startsWith('image/')) return toast('⚠️ Chỉ chấp nhận file ảnh!','err');
  if (f.size > 5*1024*1024) return toast('⚠️ File quá lớn (tối đa 5MB)!','err');
  const r = new FileReader(); r.onload = e2 => cropOpen(e2.target.result, f.type, 'qr'); r.readAsDataURL(f);
}

async function cropConfirm() {
  if (!_c.img) return;
  const btn = document.getElementById('crop-ok-btn');
  btn.disabled=true; btn.innerHTML='<i class="ri-loader-4-line ri-spin"></i> Đang upload...';

  const outSize = _c.mode === 'qr' ? 600 : 200;
  const srcX = Math.max(0, _c.srcCX - _c.srcR);
  const srcY = Math.max(0, _c.srcCY - _c.srcR);
  const srcW = Math.min(_c.img.width - srcX, _c.srcR*2);
  const srcH = Math.min(_c.img.height - srcY, _c.srcR*2);
  const out = document.createElement('canvas'); out.width=outSize; out.height=outSize;
  const ctx = out.getContext('2d');
  ctx.save();
  if (_c.mode !== 'qr') { ctx.beginPath(); ctx.arc(outSize/2,outSize/2,outSize/2,0,Math.PI*2); ctx.clip(); }
  ctx.drawImage(_c.img, srcX, srcY, srcW, srcH, 0, 0, outSize, outSize);
  ctx.restore();

  const mime = _c.mime==='image/png' ? 'image/png' : 'image/jpeg';
  const ext  = mime==='image/png' ? 'png' : 'jpg';
  const bucket = _c.mode==='qr' ? 'qrcodes' : 'avatars';
  const path   = `${currentUploadNvID}.${ext}`;

  // Canvas → Blob → Upload
  out.toBlob(async (blob) => {
    const { error: upErr } = await sb.storage.from(bucket).upload(path, blob, {
      contentType: mime, upsert: true
    });
    if (upErr) {
      btn.disabled=false; btn.innerHTML='<i class="ri-upload-cloud-2-line"></i> Xác nhận & Upload';
      return toast('❌ Upload thất bại: '+upErr.message,'err');
    }
    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = urlData.publicUrl + '?t=' + Date.now(); // cache-bust

    // Lưu URL vào nhan_vien
    const field = _c.mode==='qr' ? 'qr_url' : 'avatar_url';
    await sb.from('nhan_vien').update({ [field]: publicUrl }).eq('id', currentUploadNvID);

    btn.disabled=false; btn.innerHTML='<i class="ri-upload-cloud-2-line"></i> Xác nhận & Upload';
    closeCrop(); toast('Cập nhật ảnh thành công!','ok');
  }, mime, 0.93);
}

// ══════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════
(async function init() {
  try {
    D = await loadAllData();
    renderAll(D);
    document.getElementById('global-loading').style.display='none';
    document.getElementById('app-body').style.display='block';
    startRealtime();   // 🔥 WebSocket realtime
  } catch(err) {
    document.getElementById('global-loading').innerHTML=
      `<p style="color:var(--red);font-size:14px">⚠️ Lỗi kết nối Supabase:<br>${err.message}<br><br><small>Kiểm tra SUPABASE_URL và SUPABASE_ANON_KEY trong file HTML.</small></p>`;
  }
})();
