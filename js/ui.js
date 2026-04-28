// ══════════════════════════════════════════════════════
//  STATE — Biến toàn cục dùng chung
// ══════════════════════════════════════════════════════
var D = null;           // cache dữ liệu hiện tại
var splitMode = 'even';
var _searchPC='', _searchNQ='', _searchCQ='', _searchTT='';
var _dbAnimated = false;
var _sbAnimated = false;
var currentPayerID = '';
var currentUploadNvID = '';
var currentQRNvID = '';
var ttPending = { traID:'', nhanID:'', soTien:0 };

// ══════════════════════════════════════════════════════
//  RENDER HELPERS
// ══════════════════════════════════════════════════════
const BG_COLORS = ['#2d6a4f','#1e3a5f','#6b2d0e','#3d2b6b','#7a4100','#1a4a3a','#4a1942','#0d3d56'];
function bgForId(id){ let n=0; for(const c of (id||'')) n+=c.charCodeAt(0); return BG_COLORS[n%BG_COLORS.length]; }
function initial(name){ return (name||'?').trim().split(' ').pop().charAt(0).toUpperCase(); }
function fVND(n){ return new Intl.NumberFormat('vi-VN').format(n||0)+' ₫'; }

function avatarHtml(nv, size, withUpload) {
  const s=size||42, fid=nv.avatarFileID||'';
  const inner = fid
    ? `<img src="${fid}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextSibling.style.display='flex'">
       <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:800;font-size:${s*.36}px;font-family:JetBrains Mono,monospace;color:#f0d080">${initial(nv.hoTen)}</span>`
    : `<span style="font-weight:800;font-size:${s*.36}px;font-family:JetBrains Mono,monospace;color:#f0d080">${initial(nv.hoTen)}</span>`;
  const avDiv = `<div style="width:${s}px;height:${s}px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${bgForId(nv.id)};flex-shrink:0">${inner}</div>`;
  if (!withUpload) return avDiv;
  return `<div class="emp-av-wrap" id="avwrap-${nv.id}">${avDiv}<div class="avt-upload-btn" title="Đổi ảnh" onclick="triggerAvatarUpload('${nv.id}')"><i class="ri-camera-line"></i></div></div>`;
}

function stc(color,icon,label,value){ return `<div class="stat-card ${color}"><div class="sc-icon">${icon}</div><div class="sc-label">${label}</div><div class="sc-value">${value}</div></div>`; }
function stcCustom(color,icon,label,inner){ return `<div class="stat-card ${color}"><div class="sc-icon">${icon}</div><div class="sc-label">${label}</div>${inner}</div>`; }

// ══════════════════════════════════════════════════════
//  RENDER ALL
// ══════════════════════════════════════════════════════
function renderAll(d) { renderDashboard(d); renderNV(d); renderPC(d); renderQuy(d); renderTT(d); fillDrops(d); renderNotif(d); _animateSidebar(); }

function renderDashboard(d) {
  const sl = d.soDuList;
  const nvMap = {}; sl.forEach(n=>nvMap[n.id]=n);
  document.getElementById('db-sub').textContent = `${sl.length} nhân viên · ${d.phieuChi.length} phiếu chi`;
  const neg = sl.filter(n=>n.soDu<0).length;
  const tongCT = d.phieuChi.reduce((s,pc)=>s+pc.soTienTong,0);
  const ungMap = {}; d.phieuChi.forEach(pc=>{ ungMap[pc.nguoiUngID]=(ungMap[pc.nguoiUngID]||0)+pc.soTienTong; });
  let topUng=null, topAmt=0; Object.keys(ungMap).forEach(id=>{ if(ungMap[id]>topAmt){topAmt=ungMap[id];topUng=id;} });
  const topTen = topUng ? (nvMap[topUng]?.hoTen||topUng) : '—';

  document.getElementById('db-stats').innerHTML =
    stc('blue','<i class="ri-group-line"></i>','Nhân viên',sl.length+' người') +
    stcCustom('gold','<i class="ri-trophy-line"></i>','Ứng nhiều nhất',`<div style="font-family:Be Vietnam Pro,sans-serif;font-size:15px;font-weight:800;color:#9a7020;margin-top:5px">${topTen}</div><div style="font-family:JetBrains Mono,monospace;font-size:13px;font-weight:700;color:#b8943a;margin-top:2px">${fVND(topAmt)}</div>`) +
    stc('red','<i class="ri-arrow-down-circle-line"></i>','Đang nợ',neg+' người') +
    stc('gold','<i class="ri-money-dollar-circle-line"></i>','Tổng chi tiêu',fVND(tongCT));

  const sorted = sl.slice().sort((a,b) => {
    if (a.soDu>=0 && b.soDu>=0) return b.soDu-a.soDu;
    if (a.soDu>=0 && b.soDu<0) return -1;
    if (a.soDu<0 && b.soDu>=0) return 1;
    return b.soDu-a.soDu;
  });
  document.getElementById('db-balances').innerHTML = sorted.length
    ? sorted.map((nv,idx)=>{
        const c=nv.soDu>0?'pos':nv.soDu<0?'neg':'zer';
        const t=nv.soDu>0?'<i class="ri-arrow-up-line"></i> Dư nợ cho vay':nv.soDu<0?'<i class="ri-arrow-down-line"></i> Đang nợ':'<i class="ri-refresh-line"></i> Cân bằng';
        const rc = idx===0?'r1':idx===1?'r2':idx===2?'r3':'rn';
        const badge = `<div class="bal-rank ${rc}">#${idx+1}</div>`;
        return `<div class="bal-item ${c}${idx===0?' neon-top':''}">${badge}${avatarHtml(nv,42)}<div><div class="bi-name">${nv.hoTen}</div><div class="bi-amount">${fVND(nv.soDu)}</div><div class="bi-tag">${t}</div></div></div>`;
      }).join('')
    : '<div class="empty"><span><i class="ri-user-line"></i></span>Chưa có nhân viên.</div>';

  renderSug('db-suggestions', d.goiYThanhToan, false, nvMap);
  document.getElementById('db-sug-ct').textContent = d.goiYThanhToan.length>0 ? d.goiYThanhToan.length+' giao dịch' : '';
  document.getElementById('db-recent').innerHTML = d.phieuChi.slice(0,8).map(pc=>
    `<tr><td><span class="badge bd-gold">${pc.id}</span></td><td style="font-weight:600">${pc.moTa}</td><td>${nvMap[pc.nguoiUngID]?.hoTen||pc.nguoiUngID}</td><td class="c-neu">${fVND(pc.soTienTong)}</td><td class="c-mut">${pc.ngayTao}</td></tr>`
  ).join('') || '<tr><td colspan="5"><div class="empty"><span><i class="ri-file-list-3-line"></i></span>Chưa có phiếu chi.</div></td></tr>';
  if (!_dbAnimated) requestAnimationFrame(()=>_animateDashboard());
}

function _animateDashboard(){
  if (_dbAnimated) return;
  _dbAnimated = true;
  function run(el,kf,delay){ el.style.animation='none'; requestAnimationFrame(()=>{ el.style.animation=`${kf} .38s ease ${delay}ms both`; }); }
  document.querySelectorAll('#db-stats .stat-card').forEach((el,i)=>run(el,'dbStatIn',i*80));
  document.querySelectorAll('#db-balances .bal-item').forEach((el,i)=>run(el,i%2===0?'dbBalLeft':'dbBalRight',320+i*65));
  document.querySelectorAll('#db-suggestions .pay-item').forEach((el,i)=>run(el,'dbSugIn',320+i*60));
  document.querySelectorAll('#db-recent tr').forEach((el,i)=>run(el,'dbRowIn',480+i*50));
}

function _animatePage(name){
  function run(el,kf,delay){ el.style.animation='none'; requestAnimationFrame(()=>{ el.style.animation=`${kf} .35s ease ${delay}ms both`; }); }
  if(name==='nhanvien'){
    document.querySelectorAll('#nv-grid .emp-card').forEach((el,i)=>run(el,'dbStatIn',i*55));
  } else if(name==='phieuchi'){
    document.querySelectorAll('#pc-table tr').forEach((el,i)=>run(el,'dbRowIn',i*38));
  } else if(name==='quychung'){
    document.querySelectorAll('#quy-stats .stat-card').forEach((el,i)=>run(el,'dbStatIn',i*75));
    document.querySelectorAll('#nopquy-list tr').forEach((el,i)=>run(el,'dbBalLeft',200+i*38));
    document.querySelectorAll('#chiquy-list tr').forEach((el,i)=>run(el,'dbBalRight',200+i*38));
  } else if(name==='thanhtoan'){
    document.querySelectorAll('#page-thanhtoan .card').forEach((el,i)=>run(el,i%2===0?'dbBalLeft':'dbBalRight',i*90));
    document.querySelectorAll('#tt-quick-sug .pay-item').forEach((el,i)=>run(el,'dbSugIn',200+i*60));
    document.querySelectorAll('#tt-table tr').forEach((el,i)=>run(el,'dbRowIn',280+i*38));
  }
}

function _animateSidebar(){
  if (_sbAnimated) return;
  _sbAnimated = true;
  document.querySelectorAll('.sb-item').forEach((el,i)=>{
    el.style.animation='none';
    requestAnimationFrame(()=>{ el.style.animation=`sbItemIn .3s ease ${i*70}ms both`; });
  });
}

function toggleSidebar(){
  const sb=document.querySelector('.sidebar');
  sb.classList.toggle('collapsed');
  document.querySelector('.main').style.marginLeft=sb.classList.contains('collapsed')?'64px':'';
}

function renderSug(id, list, showBtn, nvMap) {
  const nm = nvMap||{};
  document.getElementById(id).innerHTML = !list||!list.length
    ? '<div class="empty"><span><i class="ri-checkbox-circle-line"></i></span>Tất cả công nợ đã cân bằng!</div>'
    : list.map(t=>{
        const nTra  = nm[t.nguoiTraID]  || {id:t.nguoiTraID,  hoTen:t.nguoiTraTen,  avatarFileID:''};
        const nNhan = nm[t.nguoiNhanID] || {id:t.nguoiNhanID, hoTen:t.nguoiNhanTen, avatarFileID:''};
        const btn = showBtn
          ? `<button class="btn btn-green btn-sm" onclick="xacNhanGoiY('${t.nguoiTraID}','${t.nguoiNhanID}',${t.soTien})"><i class="ri-check-line"></i> Thanh toán</button>`
          : `<button class="btn btn-ghost btn-sm" onclick="fillTT('${t.nguoiTraID}','${t.nguoiNhanID}',${t.soTien})">Ghi nhận <i class="ri-arrow-right-line"></i></button>`;
        return `<div class="pay-item">${avatarHtml(nTra,30)}<div class="pi-from">${t.nguoiTraTen}</div><div class="pi-arrow">→</div>${avatarHtml(nNhan,30)}<div class="pi-to">${t.nguoiNhanTen}</div><div class="pi-amount">${fVND(t.soTien)}</div>${btn}</div>`;
      }).join('');
}

function renderNV(d) {
  const sMap={}; d.soDuList.forEach(n=>sMap[n.id]=n.soDu);
  document.getElementById('nv-sub').textContent = d.nhanVien.length+' người trong nhóm';
  document.getElementById('nv-grid').innerHTML = d.nhanVien.length
    ? d.nhanVien.map(nv=>{
        const sd=sMap[nv.id]||0;
        const cc=sd>0?'c-pos':sd<0?'c-neg':'c-neu';
        const t=sd>0?'<i class="ri-arrow-up-line"></i> Dư nợ cho vay':sd<0?'<i class="ri-arrow-down-line"></i> Đang nợ':'<i class="ri-refresh-line"></i> Đã cân bằng';
        const qrCls = nv.qrFileID ? 'qr-upload-btn qr-has' : 'qr-upload-btn';
        const qrLbl = nv.qrFileID ? '<i class="ri-refresh-line"></i> Cập nhật QR' : '<i class="ri-add-line"></i> Thêm QR ngân hàng';
        return `<div class="emp-card">${avatarHtml(nv,60,true)}<div class="emp-name">${nv.hoTen}</div><div class="emp-id">${nv.id}</div><div class="emp-bal ${cc}">${fVND(sd)}</div><div class="emp-tag">${t}</div><button class="${qrCls}" onclick="triggerQRUpload('${nv.id}')">${qrLbl}</button></div>`;
      }).join('')
    : '<div class="empty"><span><i class="ri-user-line"></i></span>Chưa có nhân viên.</div>';
}

function onSearchPC(v){ _searchPC=v.toLowerCase().trim(); _pgKey('pc').page=1; if(D) renderPC(D); }
function onSearchNQ(v){ _searchNQ=v.toLowerCase().trim(); _pgKey('nq').page=1; if(D) renderQuy(D); }
function onSearchCQ(v){ _searchCQ=v.toLowerCase().trim(); _pgKey('cq').page=1; if(D) renderQuy(D); }
function onSearchTT(v){ _searchTT=v.toLowerCase().trim(); _pgKey('tt').page=1; if(D) renderTT(D); }

function renderPC(d) {
  const nameMap={}; d.nhanVien.forEach(nv=>nameMap[nv.id]=nv.hoTen);
  const cntMap={}; (d.chiTietPhieuChi||[]).forEach(ct=>cntMap[ct.phieuChiID]=(cntMap[ct.phieuChiID]||0)+1);
  let list=d.phieuChi;
  if(_searchPC) list=list.filter(pc=>(pc.id||'').toLowerCase().includes(_searchPC)||(pc.moTa||'').toLowerCase().includes(_searchPC)||(nameMap[pc.nguoiUngID]||'').toLowerCase().includes(_searchPC));
  _pgRender('pc', list, 'pc-table', 'pc-pgctrl', pc=>`<tr>
    <td><span class="badge bd-gold">${pc.id}</span></td>
    <td style="font-weight:600">${pc.moTa}</td>
    <td>${nameMap[pc.nguoiUngID]||pc.nguoiUngID}</td>
    <td class="c-neu">${fVND(pc.soTienTong)}</td>
    <td><span class="badge bd-gray">${cntMap[pc.id]||1} người</span></td>
    <td class="c-mut">${pc.ngayTao}</td>
    <td><div class="action-btns">
      <button class="btn btn-ghost btn-sm" onclick="xemChiTiet('${pc.id}')">Chi tiết</button>
      <button class="btn-icon edit" onclick="moSuaPC('${pc.id}')"><i class="ri-edit-line"></i></button>
      <button class="btn-icon del"  onclick="xoaPhieu('PC','${pc.id}')"><i class="ri-delete-bin-line"></i></button>
    </div></td></tr>`,
  '<div class="empty"><span><i class="ri-file-list-3-line"></i></span>Chưa có phiếu chi.</div>');
}

function xemChiTiet(pcID) {
  if (!D) return;
  const pc = D.phieuChi.find(p=>p.id===pcID); if (!pc) return;
  const nvMap={}; D.nhanVien.forEach(nv=>nvMap[nv.id]=nv);
  const parts = (D.chiTietPhieuChi||[]).filter(ct=>ct.phieuChiID===pcID);
  const nguoiUng = nvMap[pc.nguoiUngID]||{id:pc.nguoiUngID,hoTen:pc.nguoiUngID,avatarFileID:''};
  const partsHtml = parts.length
    ? parts.map(ct=>{ const nv=nvMap[ct.nhanVienID]||{id:ct.nhanVienID,hoTen:ct.nhanVienID,avatarFileID:''};
        return `<div class="detail-part-row">${avatarHtml(nv,34)}<div class="detail-part-name">${nv.hoTen}</div><div class="detail-part-amt">−${fVND(ct.soTienChia)}</div></div>`;
      }).join('')
    : '<div style="color:var(--muted);font-size:13px;padding:10px 0">Không có dữ liệu phân bổ.</div>';
  document.getElementById('modal-chitiet-body').innerHTML=`
    <div class="detail-header"><div style="flex:1">
      <div style="font-size:18px;font-weight:800">${pc.moTa}</div>
      <div class="detail-meta">Mã: <b>${pc.id}</b> · Ngày: <b>${pc.ngayTao}</b></div>
      <div class="detail-amount">${fVND(pc.soTienTong)}</div>
    </div></div>
    <div class="detail-info-grid">
      <div class="detail-info-item"><div class="dii-label">Người ứng tiền</div><div class="dii-value" style="display:flex;align-items:center;gap:8px">${avatarHtml(nguoiUng,28)}${nguoiUng.hoTen}</div></div>
      <div class="detail-info-item"><div class="dii-label">Số người tham gia</div><div class="dii-value">${parts.length} người</div></div>
      <div class="detail-info-item"><div class="dii-label">Mỗi người chịu (ước)</div><div class="dii-value" style="color:var(--red)">${fVND(parts.length?Math.round(pc.soTienTong/parts.length):pc.soTienTong)}</div></div>
      <div class="detail-info-item"><div class="dii-label">Tổng phiếu</div><div class="dii-value" style="color:var(--blue)">${fVND(pc.soTienTong)}</div></div>
    </div>
    <div class="detail-section-title">Phân bổ chi tiết</div>${partsHtml}`;
  openModal('modal-chitiet');
}

function renderQuy(d) {
  document.getElementById('quy-stats').innerHTML=
    stc('green','<i class="ri-inbox-archive-line"></i>','Tổng nộp quỹ',fVND(d.tongNopQuy))+
    stc('red','<i class="ri-inbox-unarchive-line"></i>','Tổng chi quỹ',fVND(d.tongChiQuy))+
    stc(d.soDuQuy>=0?'blue':'red','<i class="ri-wallet-3-line"></i>','Số dư quỹ',fVND(d.soDuQuy));
  let nqList=d.quyChi;
  if(_searchNQ) nqList=nqList.filter(q=>(q.nhanVienTen||q.nhanVienID||'').toLowerCase().includes(_searchNQ)||(q.moTa||'').toLowerCase().includes(_searchNQ));
  _pgRender('nq', nqList, 'nopquy-list', 'nq-pgctrl', q=>`<tr>
    <td style="font-weight:600">${q.nhanVienTen||q.nhanVienID}</td>
    <td class="c-mut">${q.moTa||'Nộp quỹ'}</td><td class="c-mut">${q.ngayNop}</td>
    <td class="c-pos">+${fVND(q.soTien)}</td>
    <td><div class="action-btns"><button class="btn-icon edit" onclick="moSuaNQ('${q.id}')"><i class="ri-edit-line"></i></button><button class="btn-icon del" onclick="xoaPhieu('NQ','${q.id}')"><i class="ri-delete-bin-line"></i></button></div></td></tr>`,
  '<div class="empty"><span><i class="ri-inbox-archive-line"></i></span>Chưa có dữ liệu.</div>');
  let cqList=d.chiQuyList;
  if(_searchCQ) cqList=cqList.filter(c=>(c.moTa||'').toLowerCase().includes(_searchCQ));
  _pgRender('cq', cqList, 'chiquy-list', 'cq-pgctrl', c=>`<tr>
    <td style="font-weight:600">${c.moTa}</td><td class="c-mut">${c.ngayTao}</td>
    <td class="c-neg">−${fVND(c.soTien)}</td>
    <td><div class="action-btns"><button class="btn-icon edit" onclick="moSuaCQ('${c.id}')"><i class="ri-edit-line"></i></button><button class="btn-icon del" onclick="xoaPhieu('CQ','${c.id}')"><i class="ri-delete-bin-line"></i></button></div></td></tr>`,
  '<div class="empty"><span><i class="ri-inbox-unarchive-line"></i></span>Chưa có dữ liệu.</div>');
}

function renderTT(d) {
  const nvMap={}; d.soDuList.forEach(n=>nvMap[n.id]=n);
  d.nhanVien.forEach(nv=>{ if(nvMap[nv.id]) nvMap[nv.id].qrFileID=nv.qrFileID||''; });
  const sugEl=document.getElementById('tt-quick-sug');
  if (sugEl) {
    sugEl.innerHTML = d.goiYThanhToan?.length
      ? '<div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px"><i class="ri-lightbulb-flash-line"></i> Gợi ý tối ưu</div>'
        + d.goiYThanhToan.map(t=>{
            const nTra=nvMap[t.nguoiTraID]||{id:t.nguoiTraID,hoTen:t.nguoiTraTen,avatarFileID:''};
            const nNhan=nvMap[t.nguoiNhanID]||{id:t.nguoiNhanID,hoTen:t.nguoiNhanTen,avatarFileID:''};
            return `<div class="pay-item">${avatarHtml(nTra,30)}<div class="pi-from">${t.nguoiTraTen}</div><div class="pi-arrow">→</div>${avatarHtml(nNhan,30)}<div class="pi-to">${t.nguoiNhanTen}</div><div class="pi-amount">${fVND(t.soTien)}</div><button class="btn btn-ghost btn-sm" onclick="fillTTForm('${t.nguoiTraID}','${t.nguoiNhanID}',${t.soTien})">Chọn</button></div>`;
          }).join('')
      : '<div class="empty" style="padding:12px 0"><span style="font-size:20px"><i class="ri-checkbox-circle-line"></i></span>Đã cân bằng!</div>';
  }
  const nameMap={}; d.nhanVien.forEach(nv=>nameMap[nv.id]=nv.hoTen);
  let ttList=d.thanhToanList;
  if(_searchTT) ttList=ttList.filter(tt=>(tt.nguoiTraTen||nameMap[tt.nguoiTraID]||'').toLowerCase().includes(_searchTT)||(tt.nguoiNhanTen||nameMap[tt.nguoiNhanID]||'').toLowerCase().includes(_searchTT)||(tt.id||'').toLowerCase().includes(_searchTT));
  _pgRender('tt', ttList, 'tt-table', 'tt-pgctrl', tt=>`<tr>
    <td><span class="badge bd-blue">${tt.id}</span></td>
    <td style="color:var(--red);font-weight:600">${tt.nguoiTraTen||nameMap[tt.nguoiTraID]}</td>
    <td style="color:var(--green);font-weight:600">${tt.nguoiNhanTen||nameMap[tt.nguoiNhanID]}</td>
    <td class="c-neu">${fVND(tt.soTien)}</td><td class="c-mut">${tt.ngayTao}</td>
    <td><div class="action-btns"><button class="btn-icon edit" onclick="moSuaTT('${tt.id}')"><i class="ri-edit-line"></i></button><button class="btn-icon del" onclick="xoaPhieu('TT','${tt.id}')"><i class="ri-delete-bin-line"></i></button></div></td></tr>`,
  '<div class="empty"><span><i class="ri-bank-card-line"></i></span>Chưa có lịch sử.</div>');
}


// ══════════════════════════════════════════════════════
//  PAGINATION
// ══════════════════════════════════════════════════════
var _pgState={};
function _pgKey(k){if(!_pgState[k])_pgState[k]={page:1,size:10};return _pgState[k];}
function _pgRender(key,arr,tbodyId,ctrlId,rowFn,emptyHtml){
  const st=_pgKey(key), total=arr.length, maxP=Math.max(1,Math.ceil(total/st.size));
  if(st.page>maxP) st.page=maxP;
  const slice=arr.slice((st.page-1)*st.size, st.page*st.size);
  document.getElementById(tbodyId).innerHTML=slice.length?slice.map(rowFn).join(''):`<tr><td colspan="20">${emptyHtml}</td></tr>`;
  const ctrl=document.getElementById(ctrlId); if(!ctrl) return;
  if(!total){ctrl.innerHTML='';return;}
  const s=(st.page-1)*st.size+1, e=Math.min(st.page*st.size,total);
  const p=st.page, lo=Math.max(1,Math.min(maxP-4,p-2)), hi=Math.min(maxP,lo+4);
  let pages=lo>1?`<button class="pg-btn" onclick="_pgGo('${key}',1)">«</button>`:'';
  for(let i=lo;i<=hi;i++) pages+=`<button class="pg-btn${i===p?' active':''}" onclick="_pgGo('${key}',${i})">${i}</button>`;
  if(hi<maxP) pages+=`<button class="pg-btn" onclick="_pgGo('${key}',${maxP})">»</button>`;
  ctrl.innerHTML=`<div class="pg-size"><span>Hiển thị</span><select onchange="_pgSize('${key}',this.value)">${[10,20,30].map(n=>`<option value="${n}"${st.size===n?' selected':''}>${n}</option>`).join('')}</select><span>/ trang</span></div><div class="pg-info">${s}–${e} / ${total} bản ghi</div><div class="pg-btns"><button class="pg-btn" onclick="_pgGo('${key}',${p-1})" ${p<=1?'disabled':''}>‹</button>${pages}<button class="pg-btn" onclick="_pgGo('${key}',${p+1})" ${p>=maxP?'disabled':''}>›</button></div>`;
}
function _pgGo(k,p){_pgKey(k).page=p;if(D)renderAll(D);}
function _pgSize(k,sz){const st=_pgKey(k);st.size=Number(sz);st.page=1;if(D)renderAll(D);}

// ══════════════════════════════════════════════════════
//  DROPDOWN & PARTS
// ══════════════════════════════════════════════════════
function fillDrops(d) {
  const opts=d.nhanVien.map(nv=>`<option value="${nv.id}">${nv.hoTen}</option>`).join('');
  ['pc-nguoiung','nq-nv','tt-tra','tt-nhan','epc-nguoiung','enq-nv','ett-tra','ett-nhan'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    const cur=el.value;
    el.innerHTML='<option value="">— Chọn —</option>'+opts;
    if(cur) el.value=cur;
  });
  rebuildPartList();
}
function rebuildPartList() {
  if (!D) return;
  const c=document.getElementById('pc-parts'); if(!c) return;
  c.innerHTML=D.nhanVien.map(nv=>{
    const dis=nv.id===currentPayerID;
    const avHtml=`<div class="part-av" style="background:${bgForId(nv.id)};color:#f0d080">${nv.avatarFileID?`<img src="${nv.avatarFileID}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`:initial(nv.hoTen)}</div>`;
    return `<div class="part-row${dis?' disabled-row':''}" id="prow-${nv.id}" onclick="togglePart('${nv.id}')">${avHtml}<div class="part-name">${nv.hoTen}</div>${dis?'<span class="part-tag">Người ứng</span>':''}<input type="number" class="part-amt" id="amt-${nv.id}" placeholder="0" disabled oninput="updateSplitSummary()" onclick="event.stopPropagation()"><div class="part-check" id="pcheck-${nv.id}"></div></div>`;
  }).join('');
}

function onPayerChange(){ currentPayerID=document.getElementById('pc-nguoiung').value; rebuildPartList(); updateSplitSummary(); }
function togglePart(id){
  if(id===currentPayerID) return;
  const row=document.getElementById('prow-'+id),check=document.getElementById('pcheck-'+id),amt=document.getElementById('amt-'+id);
  const on=row.classList.contains('on');
  if(on){row.classList.remove('on');check.textContent='';if(amt){amt.value='';amt.disabled=true;}}
  else{row.classList.add('on');check.textContent='✓';if(amt)amt.disabled=(splitMode==='even');}
  if(splitMode==='even') recalcEven(); updateSplitSummary();
}
function setSplitMode(m){
  splitMode=m;
  document.getElementById('split-even-btn').classList.toggle('on',m==='even');
  document.getElementById('split-custom-btn').classList.toggle('on',m==='custom');
  if(D) D.nhanVien.forEach(nv=>{
    const amt=document.getElementById('amt-'+nv.id); if(!amt) return;
    const on=document.getElementById('prow-'+nv.id)?.classList.contains('on');
    amt.disabled=m==='even'||!on;
  });
  if(m==='even') recalcEven(); updateSplitSummary();
}
function onTotalChange(){ if(splitMode==='even') recalcEven(); updateSplitSummary(); }
function recalcEven(){
  if(!D) return;
  const total=Number(document.getElementById('pc-sotien').value)||0;
  const sel=D.nhanVien.filter(nv=>document.getElementById('prow-'+nv.id)?.classList.contains('on'));
  if(!sel.length||!total) return;
  const each=Math.round(total/sel.length), last=total-each*(sel.length-1);
  sel.forEach((nv,i)=>{ const a=document.getElementById('amt-'+nv.id); if(a) a.value=i===sel.length-1?last:each; });
}
function updateSplitSummary(){
  const sv=document.getElementById('split-summary');
  const total=Number(document.getElementById('pc-sotien').value)||0;
  if(!D||!total){sv.style.display='none';return;}
  const sel=D.nhanVien.filter(nv=>document.getElementById('prow-'+nv.id)?.classList.contains('on'));
  if(!sel.length){sv.style.display='none';return;}
  if(splitMode==='even'){sv.style.display='block';sv.className='split-summary ok';sv.innerHTML=`<i class="ri-group-line"></i> ${sel.length} người tham gia — mỗi người chịu ${fVND(Math.round(total/sel.length))}`;return;}
  const sum=sel.reduce((s,nv)=>{const a=document.getElementById('amt-'+nv.id);return s+(Number(a?.value)||0);},0);
  sv.style.display='block';
  const diff=total-sum;
  if(Math.abs(diff)<1){sv.className='split-summary ok';sv.innerHTML='<i class="ri-checkbox-circle-line"></i> Tổng khớp: '+fVND(total);}
  else if(diff>0){sv.className='split-summary warn';sv.innerHTML='<i class="ri-alert-line"></i> Còn thiếu '+fVND(diff);}
  else{sv.className='split-summary warn';sv.innerHTML='<i class="ri-alert-line"></i> Vượt quá '+fVND(-diff);}
}
function selectAllParts(){
  if(!D) return;
  D.nhanVien.forEach(nv=>{
    if(nv.id===currentPayerID) return;
    document.getElementById('prow-'+nv.id)?.classList.add('on');
    const check=document.getElementById('pcheck-'+nv.id); if(check) check.textContent='✓';
    const amt=document.getElementById('amt-'+nv.id); if(amt) amt.disabled=(splitMode==='even');
  });
  if(splitMode==='even') recalcEven(); updateSplitSummary();
}
function clearAllParts(){
  if(!D) return;
  D.nhanVien.forEach(nv=>{
    document.getElementById('prow-'+nv.id)?.classList.remove('on');
    const check=document.getElementById('pcheck-'+nv.id); if(check) check.textContent='';
    const amt=document.getElementById('amt-'+nv.id); if(amt){amt.value='';amt.disabled=true;}
  });
  updateSplitSummary();
}

// ── RESET FORM ─────────────────────────────────────────
function resetPCForm(){
  document.querySelectorAll('.mota-chip').forEach(c=>c.classList.remove('on'));
  document.getElementById('pc-mota').value=''; document.getElementById('pc-mota').style.display='none';
  document.getElementById('pc-sotien').value=''; document.getElementById('pc-ngay').value='';
  document.getElementById('pc-nguoiung').value=''; document.getElementById('pc-ghichu').value='';
  document.getElementById('pc-money').textContent='';
  currentPayerID=''; document.getElementById('split-summary').style.display='none'; clearAllParts();
}
function chonModule(el,ten){
  document.querySelectorAll('.mota-chip').forEach(c=>c.classList.remove('on')); el.classList.add('on');
  const inp=document.getElementById('pc-mota');
  if(ten==='Khác'){inp.style.display='block';inp.value='';inp.placeholder='Nhập mô tả tùy chọn...';inp.focus();}
  else{inp.style.display='none';inp.value=ten;}
}

// ══════════════════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════════════════
function gotoPage(name,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(el) el.classList.add('active');
  else document.querySelectorAll('.sb-item').forEach(b=>{ if((b.getAttribute('onclick')||'').includes("'"+name+"'")) b.classList.add('active'); });
  document.querySelector('.sidebar').classList.remove('open');
  requestAnimationFrame(()=>_animatePage(name));
}
function openModal(id){
  const overlay=document.getElementById(id);
  overlay.classList.add('open');
  document.body.style.overflow='hidden';
  _animateModalIn(overlay);
}
function closeModal(id){
  const overlay=document.getElementById(id);
  overlay.classList.remove('open');
  document.body.style.overflow='';
  overlay.querySelectorAll('[data-md-anim]').forEach(el=>{ el.style.animation=''; el.removeAttribute('data-md-anim'); });
}
function _animateModalIn(overlay){
  const modal=overlay.querySelector('.modal,.qr-pay-box,.crop-modal');
  if(!modal) return;
  const head=modal.querySelector('.modal-head,.qr-pay-head,.crop-modal-head');
  const body=modal.querySelector('.modal-body,.qr-pay-body,.crop-canvas-wrap');
  const foot=modal.querySelector('.modal-foot,.qr-pay-foot,.crop-foot');
  const dirs=['mdFromLeft','mdFromRight'];
  function anim(el,kf,delay){ el.setAttribute('data-md-anim','1'); el.style.animation='none'; requestAnimationFrame(()=>{ el.style.animation=`${kf} .3s ease ${delay}ms both`; }); }
  if(head) anim(head,'mdFromTop',0);
  if(body){
    const items=body.querySelectorAll('.fgroup,.mota-modules,.split-toggle,.cb-actions-row,.detail-header,.detail-info-grid,.detail-section-title,.detail-part-row,.pay-item,.crop-controls,.crop-hint,.crop-preview-row');
    items.forEach((el,i)=>anim(el,dirs[i%2],(i+1)*55));
  }
  if(foot) anim(foot,'mdFromBot',0);
}
function closeOnBg(e,id){ if(e.target===document.getElementById(id)) closeModal(id); }
function mAlert(_id,msg,ok){ toast(msg, ok!==false?'ok':'err'); }
function setLoading(btn,lbl){ btn.disabled=true; btn.innerHTML=lbl; }
function resetBtn(btn,lbl){ btn.disabled=false; btn.innerHTML=lbl; }
function updateMoneyDisplay(inputId,displayId){ const v=Number(document.getElementById(inputId).value)||0; const el=document.getElementById(displayId); if(el) el.textContent=v>0?fVND(v):''; }
function formatDateInput(el){ let v=el.value.replace(/\D/g,''); if(v.length>=5) v=v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4,8); else if(v.length>=3) v=v.slice(0,2)+'/'+v.slice(2); el.value=v; }

// ══════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════
function toggleNotif(){
  const p=document.getElementById('notif-panel');
  p.classList.toggle('open');
  if(p.classList.contains('open')) document.getElementById('notif-dot').style.display='none';
}
document.addEventListener('click',function(e){
  const w=document.getElementById('notif-wrap');
  if(w && !w.contains(e.target)) document.getElementById('notif-panel').classList.remove('open');
});

function renderNotif(d){
  const items=[];
  const nvMap={}; d.nhanVien.forEach(nv=>nvMap[nv.id]=nv);
  const today=new Date();
  const dayOfMonth=today.getDate();
  const lastDay=new Date(today.getFullYear(),today.getMonth()+1,0).getDate();

  // 1. Cuối tháng (từ ngày 25) → nhắc thanh toán
  if(dayOfMonth>=25){
    const daysLeft=lastDay-dayOfMonth;
    items.push({icon:'remind',emoji:'<i class="ri-alarm-warning-line"></i>',title:`Còn ${daysLeft} ngày cuối tháng — Nhắc mọi người thanh toán công nợ!`,time:'Hệ thống'});
  }

  // 2. Ai đang nợ
  d.soDuList.forEach(nv=>{
    if(nv.soDu<0) items.push({icon:'debt',emoji:'<i class="ri-money-dollar-circle-line"></i>',title:`${nv.hoTen} đang nợ ${fVND(-nv.soDu)}`,time:'Công nợ hiện tại'});
  });

  // 3. Thanh toán gần đây (5 gần nhất)
  d.thanhToanList.slice(0,5).forEach(tt=>{
    const tra=nvMap[tt.nguoiTraID]?.hoTen||tt.nguoiTraID;
    const nhan=nvMap[tt.nguoiNhanID]?.hoTen||tt.nguoiNhanID;
    items.push({icon:'pay',emoji:'<i class="ri-check-double-line"></i>',title:`${tra} đã thanh toán ${fVND(tt.soTien)} cho ${nhan}`,time:tt.ngayTao||''});
  });

  // 4. Nộp quỹ gần đây (5 gần nhất)
  d.quyChi.slice(0,5).forEach(q=>{
    const nv=nvMap[q.nhanVienID]?.hoTen||q.nhanVienID;
    items.push({icon:'fund',emoji:'<i class="ri-safe-2-line"></i>',title:`${nv} nộp quỹ ${fVND(q.soTien)}`,time:q.ngayNop||''});
  });

  // 5. Chi quỹ gần đây (3 gần nhất)
  d.chiQuyList.slice(0,3).forEach(c=>{
    items.push({icon:'fund',emoji:'<i class="ri-inbox-unarchive-line"></i>',title:`Chi quỹ: ${c.moTa} — ${fVND(c.soTien)}`,time:c.ngayTao||''});
  });

  const list=document.getElementById('notif-list');
  const dot=document.getElementById('notif-dot');
  const cnt=document.getElementById('notif-count');
  cnt.textContent=items.length;

  if(!items.length){
    list.innerHTML='<div class="notif-empty"><i class="ri-notification-off-line" style="font-size:22px;display:block;margin-bottom:6px"></i>Không có thông báo</div>';
    dot.style.display='none';
    return;
  }

  // Hiện chấm đỏ nếu panel đang đóng
  if(!document.getElementById('notif-panel').classList.contains('open')) dot.style.display='';

  list.innerHTML=items.map(n=>
    `<div class="notif-item"><div class="notif-icon ${n.icon}">${n.emoji}</div><div class="notif-body"><div class="ntitle">${n.title}</div><div class="ntime">${n.time}</div></div></div>`
  ).join('');
}

function toast(msg,type){
  const w=document.getElementById('toast-wrap');
  const el=document.createElement('div');
  const colors={ok:'#10b981',err:'#ef4444',info:'#3b82f6'};
  const icons={ok:'ri-checkbox-circle-line',err:'ri-close-circle-line',info:'ri-information-line'};
  const c=colors[type]||colors.info;
  el.style.cssText=`padding:12px 16px;border-radius:12px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:10px;min-width:240px;max-width:340px;background:#fff;color:#0f172a;box-shadow:0 8px 32px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.08);pointer-events:auto;animation:slideR .25s ease;border:1px solid #e2e8f0;border-left:4px solid ${c}`;
  const cleanMsg=msg.replace(/^[✅❌⚠️💸🔗📩🔔]+\s*/,'');
  el.innerHTML=`<i class="${icons[type]||icons.info}" style="font-size:18px;flex-shrink:0;color:${c}"></i><span>${cleanMsg}</span>`;
  w.appendChild(el);
  setTimeout(()=>{el.style.transition='opacity .28s,transform .28s';el.style.opacity='0';el.style.transform='translateX(8px)';setTimeout(()=>el.remove(),300);},3200);
}
