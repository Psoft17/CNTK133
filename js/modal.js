// ══════════════════════════════════════════════════════
//  CROP ENGINE
// ══════════════════════════════════════════════════════
var _c = { img:null, mime:'image/jpeg', mode:'avatar', srcCX:0, srcCY:0, srcR:0, minR:0, W:0, down:false, lx:0, ly:0 };

function _s2c() {
  const sc = (_c.W*0.84)/(_c.srcR*2);
  return { sc, R:_c.srcR*sc, cx:_c.W/2, cy:_c.W/2, iw:_c.img.width*sc, ih:_c.img.height*sc, ix:_c.W/2-_c.srcCX*sc, iy:_c.W/2-_c.srcCY*sc };
}
function _clamp() {
  _c.srcCX = Math.max(_c.srcR, Math.min(_c.img.width-_c.srcR, _c.srcCX));
  _c.srcCY = Math.max(_c.srcR, Math.min(_c.img.height-_c.srcR, _c.srcCY));
}
function _draw() {
  if (!_c.img) return;
  const W=_c.W, p=_s2c();
  const ctx=document.getElementById('crop-canvas').getContext('2d');
  ctx.fillStyle='#12111a'; ctx.fillRect(0,0,W,W);
  ctx.drawImage(_c.img, p.ix, p.iy, p.iw, p.ih);
  const ov=document.getElementById('crop-ov').getContext('2d');
  ov.clearRect(0,0,W,W);
  ov.fillStyle='rgba(10,9,18,.62)'; ov.fillRect(0,0,W,W);
  ov.globalCompositeOperation='destination-out';
  if (_c.mode==='qr') {
    const h=p.R*0.97;
    ov.fillRect(p.cx-h,p.cy-h,h*2,h*2);
    ov.globalCompositeOperation='source-over';
    ov.strokeStyle='rgba(59,110,240,.9)'; ov.lineWidth=2; ov.strokeRect(p.cx-h,p.cy-h,h*2,h*2);
    const cm=16; ov.strokeStyle='#3b6ef0'; ov.lineWidth=3.5;
    [[p.cx-h,p.cy-h,1,1],[p.cx+h,p.cy-h,-1,1],[p.cx-h,p.cy+h,1,-1],[p.cx+h,p.cy+h,-1,-1]].forEach(c=>{
      ov.beginPath(); ov.moveTo(c[0]+c[2]*cm,c[1]); ov.lineTo(c[0],c[1]); ov.lineTo(c[0],c[1]+c[3]*cm); ov.stroke();
    });
  } else {
    ov.beginPath(); ov.arc(p.cx,p.cy,p.R,0,Math.PI*2); ov.fill();
    ov.globalCompositeOperation='source-over';
    ov.beginPath(); ov.arc(p.cx,p.cy,p.R,0,Math.PI*2);
    ov.strokeStyle='rgba(201,168,76,.95)'; ov.lineWidth=2.5; ov.stroke();
    const sx=_c.srcCX-_c.srcR, sy=_c.srcCY-_c.srcR, ss=_c.srcR*2;
    [64,40,28].forEach(sz=>{
      const pc=document.getElementById('cpv-'+sz); if(!pc) return;
      pc.width=sz; pc.height=sz;
      const px=pc.getContext('2d'); px.clearRect(0,0,sz,sz); px.save();
      px.beginPath(); px.arc(sz/2,sz/2,sz/2,0,Math.PI*2); px.clip();
      px.drawImage(_c.img,sx,sy,ss,ss,0,0,sz,sz); px.restore();
    });
  }
}
function cropOpen(dataUrl,mime,mode) {
  _c.mime=mime||'image/jpeg'; _c.mode=mode||'avatar';
  document.getElementById('crop-title').innerHTML = _c.mode==='qr' ? '<i class="ri-scissors-2-line"></i> Chỉnh sửa ảnh QR' : '<i class="ri-scissors-2-line"></i> Chỉnh sửa ảnh đại diện';
  const pr=document.getElementById('crop-prev-row'); if(pr) pr.style.display=_c.mode==='qr'?'none':'flex';
  const img=new Image();
  img.onload=function(){
    _c.img=img; _c.minR=Math.min(img.width,img.height)/2;
    _c.srcR=_c.minR; _c.srcCX=img.width/2; _c.srcCY=img.height/2;
    document.getElementById('crop-zoom').value=100;
    document.getElementById('crop-zoom-val').textContent='1.0×';
    const W=document.getElementById('crop-wrap').clientWidth||440;
    _c.W=W;
    ['crop-canvas','crop-ov'].forEach(id=>{const el=document.getElementById(id);el.width=W;el.height=W;});
    _draw();
    document.getElementById('modal-crop').classList.add('open');
    document.body.style.overflow='hidden';
  };
  img.src=dataUrl;
}
function closeCrop(){ document.getElementById('modal-crop').classList.remove('open'); document.body.style.overflow=''; }
function cropZoom(val){ if(!_c.img) return; const pct=Math.max(1,Math.min(3,Number(val)/100)); _c.srcR=_c.minR/pct; _clamp(); document.getElementById('crop-zoom-val').textContent=pct.toFixed(1)+'×'; _draw(); }
function cropPD(e){ e.preventDefault(); _c.down=true; _c.lx=e.clientX; _c.ly=e.clientY; document.getElementById('crop-wrap').setPointerCapture(e.pointerId); }
function cropPM(e){ if(!_c.down) return; const p=_s2c(); _c.srcCX-=(e.clientX-_c.lx)/p.sc; _c.srcCY-=(e.clientY-_c.ly)/p.sc; _c.lx=e.clientX; _c.ly=e.clientY; _clamp(); _draw(); }
function cropPU(){ _c.down=false; }

// ── Crop wheel event ───────────────────────────────────
document.getElementById('crop-wrap').addEventListener('wheel',function(e){
  e.preventDefault();
  const sl=document.getElementById('crop-zoom');
  const nv=Math.max(100,Math.min(300,Number(sl.value)+(e.deltaY<0?8:-8)));
  sl.value=nv; cropZoom(nv);
},{passive:false});

// ══════════════════════════════════════════════════════
//  MỞ FORM SỬA
// ══════════════════════════════════════════════════════
function moSuaPC(pcID) {
  if (!D) return;
  const pc=D.phieuChi.find(p=>p.id===pcID); if(!pc) return;
  const parts=(D.chiTietPhieuChi||[]).filter(ct=>ct.phieuChiID===pcID);
  const nvMap={}; D.nhanVien.forEach(nv=>nvMap[nv.id]=nv);
  document.getElementById('epc-id').value=pcID;
  document.getElementById('epc-mota').value=pc.moTa;
  document.getElementById('epc-sotien').value=pc.soTienTong; updateMoneyDisplay('epc-sotien','epc-money');
  document.getElementById('epc-nguoiung').value=pc.nguoiUngID;
  document.getElementById('epc-ngay').value=pc.ngayTao;
  document.getElementById('epc-parts-list').innerHTML=parts.map(ct=>{
    const nv=nvMap[ct.nhanVienID]||{id:ct.nhanVienID,hoTen:ct.nhanVienID,avatarFileID:''};
    return `<div class="epc-part-row">${avatarHtml(nv,30)}<div class="epc-part-name">${nv.hoTen}</div><input class="epc-part-amt" data-nvid="${ct.nhanVienID}" type="number" value="${ct.soTienChia}" oninput="updateEpcSum()"></div>`;
  }).join('');
  updateEpcSum(); openModal('modal-edit-pc');
}
function moSuaNQ(id) {
  if (!D) return; const q=D.quyChi.find(x=>x.id===id); if(!q) return;
  document.getElementById('enq-id').value=id; document.getElementById('enq-nv').value=q.nhanVienID;
  document.getElementById('enq-sotien').value=q.soTien; updateMoneyDisplay('enq-sotien','enq-money');
  document.getElementById('enq-mota').value=q.moTa||''; document.getElementById('enq-ngay').value=q.ngayNop||'';
  openModal('modal-edit-nq');
}
function moSuaCQ(id) {
  if (!D) return; const c=D.chiQuyList.find(x=>x.id===id); if(!c) return;
  document.getElementById('ecq-id').value=id; document.getElementById('ecq-mota').value=c.moTa;
  document.getElementById('ecq-sotien').value=c.soTien; updateMoneyDisplay('ecq-sotien','ecq-money');
  document.getElementById('ecq-ngay').value=c.ngayTao||''; openModal('modal-edit-cq');
}
function moSuaTT(id) {
  if (!D) return; const tt=D.thanhToanList.find(x=>x.id===id); if(!tt) return;
  document.getElementById('ett-id').value=id; document.getElementById('ett-tra').value=tt.nguoiTraID;
  document.getElementById('ett-nhan').value=tt.nguoiNhanID; document.getElementById('ett-sotien').value=tt.soTien;
  updateMoneyDisplay('ett-sotien','ett-money'); document.getElementById('ett-ngay').value=tt.ngayTao||'';
  openModal('modal-edit-tt');
}

function updateEpcSum() {
  const inputs=document.querySelectorAll('.epc-part-amt');
  let sum=0; inputs.forEach(i=>sum+=Number(i.value)||0);
  const total=Number(document.getElementById('epc-sotien').value)||0;
  const lbl=document.getElementById('epc-sum-label'); if(!lbl||!total){if(lbl)lbl.textContent='';return;}
  const diff=total-sum;
  if(Math.abs(diff)<1){lbl.style.color='var(--green)';lbl.textContent='✅ Khớp: '+fVND(total);}
  else if(diff>0){lbl.style.color='var(--red)';lbl.textContent='⚠️ Thiếu '+fVND(diff);}
  else{lbl.style.color='var(--red)';lbl.textContent='⚠️ Vượt '+fVND(-diff);}
}
function onEpcTotalChange(){epcChiaDeu();}
function epcChiaDeu(){
  const inputs=document.querySelectorAll('.epc-part-amt'); if(!inputs.length) return;
  const total=Number(document.getElementById('epc-sotien').value)||0; if(!total) return;
  const each=Math.round(total/inputs.length), last=total-each*(inputs.length-1);
  inputs.forEach((inp,i)=>inp.value=i===inputs.length-1?last:each); updateEpcSum();
}

// ══════════════════════════════════════════════════════
//  QR THANH TOÁN
// ══════════════════════════════════════════════════════
function doMoQRTT(){
  const tra=document.getElementById('tt-tra').value;
  const nhan=document.getElementById('tt-nhan').value;
  const soTien=Number(document.getElementById('tt-sotien').value);
  const alertEl=document.getElementById('tt-alert'); alertEl.innerHTML='';
  if(!tra) return alertEl.innerHTML='<div class="malert malert-err">⚠️ Chọn người trả!</div>';
  if(!nhan) return alertEl.innerHTML='<div class="malert malert-err">⚠️ Chọn người nhận!</div>';
  if(tra===nhan) return alertEl.innerHTML='<div class="malert malert-err">⚠️ Người trả và nhận không được trùng!</div>';
  if(!soTien||soTien<1000) return alertEl.innerHTML='<div class="malert malert-err">⚠️ Số tiền không hợp lệ!</div>';
  ttPending={traID:tra,nhanID:nhan,soTien};
  if(!D) return;
  const nvMap={}; D.nhanVien.forEach(nv=>nvMap[nv.id]=nv);
  const nguoiTra=nvMap[tra]||{hoTen:tra,avatarFileID:'',qrFileID:''};
  const nguoiNhan=nvMap[nhan]||{hoTen:nhan,avatarFileID:'',qrFileID:''};
  document.getElementById('qrtt-amount').textContent=fVND(soTien);
  document.getElementById('qrtt-desc').textContent=nguoiTra.hoTen+' chuyển cho '+nguoiNhan.hoTen;
  document.getElementById('qrtt-receiver').innerHTML=avatarHtml(nguoiNhan,38)+`<div><div style="font-size:13px;font-weight:700">${nguoiNhan.hoTen}</div><div style="font-size:11px;color:var(--muted)">Người nhận tiền</div></div>`;
  const imgWrap=document.getElementById('qrtt-img-wrap');
  if(nguoiNhan.qrFileID){
    imgWrap.innerHTML=`<div class="qr-skeleton" id="qr-skel"></div><img class="qr-img-load" src="${nguoiNhan.qrFileID}" alt="QR"
      onload="this.classList.add('ready');var s=document.getElementById('qr-skel');if(s){s.style.opacity='0';setTimeout(()=>s.remove(),380);}"
      onerror="this.parentNode.innerHTML='<div class=qr-no-img><i class=ri-close-circle-line style=font-size:28px;display:block;margin-bottom:6px></i>Không tải được QR</div>'">`;
  } else {
    imgWrap.innerHTML=`<div class="qr-no-img"><i class="ri-qr-code-line" style="font-size:32px;display:block;margin-bottom:8px"></i>${nguoiNhan.hoTen} chưa có mã QR<br><small>Nhắc họ thêm QR trong trang Nhân Viên</small></div>`;
  }
  document.getElementById('modal-qr-tt').classList.add('open'); document.body.style.overflow='hidden';
}
function closeQRTT(){ document.getElementById('modal-qr-tt').classList.remove('open'); document.body.style.overflow=''; }

function fillTT(traID,nhanID,soTien){ gotoPage('thanhtoan',null); setTimeout(()=>fillTTForm(traID,nhanID,soTien),120); }
function fillTTForm(traID,nhanID,soTien){ document.getElementById('tt-tra').value=traID; document.getElementById('tt-nhan').value=nhanID; document.getElementById('tt-sotien').value=soTien; }
function xacNhanGoiY(traID,nhanID,soTien){ gotoPage('thanhtoan',null); setTimeout(()=>{fillTTForm(traID,nhanID,soTien);doMoQRTT();},150); }

