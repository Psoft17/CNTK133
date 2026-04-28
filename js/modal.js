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

// ══════════════════════════════════════════════════════
//  VIRTUAL MANAGER (QUẢN LÝ ẢO)
// ══════════════════════════════════════════════════════
(function(){
  const char=document.getElementById('vm-char');
  const bubble=document.getElementById('vm-bubble');
  const msgEl=document.getElementById('vm-msg');
  if(!char) return;

  // ── Drag ──────────────────────────────────────────
  let _moved=false, _ox=0, _oy=0;
  char.addEventListener('pointerdown',e=>{
    _moved=false;
    _ox=e.clientX-char.getBoundingClientRect().left;
    _oy=e.clientY-char.getBoundingClientRect().top;
    char.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  char.addEventListener('pointermove',e=>{
    if(!e.buttons) return;
    _moved=true;
    const x=Math.max(0,Math.min(window.innerWidth-char.offsetWidth, e.clientX-_ox));
    const y=Math.max(0,Math.min(window.innerHeight-char.offsetHeight, e.clientY-_oy));
    char.style.right='auto'; char.style.bottom='auto';
    char.style.left=x+'px'; char.style.top=y+'px';
  });
  char.addEventListener('pointerup',()=>{ if(!_moved) _showRandom(); });

  // ── Messages ──────────────────────────────────────
  const IDLE=[
    `<i class="ri-eye-2-fill" style="color:#ff7c20"></i> Tao đang theo dõi tất cả. Đừng nghĩ qua mặt được tao!`,
    `<i class="ri-shield-keyhole-fill" style="color:var(--blue)"></i> Công nợ phải minh bạch. Không có chuyện ém nhẹm ở đây!`,
    `<i class="ri-bar-chart-fill" style="color:var(--green)"></i> Vào Dashboard kiểm tra đi. Chờ tao nhắc mãi à?`,
    `<i class="ri-time-fill" style="color:var(--red)"></i> Thanh toán sớm lên. Để lâu thêm rắc rối đó!`,
    `<i class="ri-spy-fill" style="color:#ff7c20"></i> Nghĩ tao không biết? Tao thấy hết đấy!`,
    `<i class="ri-file-damage-fill" style="color:var(--blue)"></i> Số liệu phải cập nhật liên tục. Đừng để tồn đọng!`,
    `<i class="ri-medal-fill" style="color:#ff7c20"></i> Ai trả nợ sớm mới được tao nể. Còn lại tự hiểu!`,
    `<i class="ri-skull-fill" style="color:var(--red)"></i> Chi nhánh 133 mà để nợ bừa bãi thì xấu hổ lắm đó!`,
    `<i class="ri-thunderstorms-fill" style="color:#ff7c20"></i> Tao không cần nghe lý do. Tao chỉ cần thấy tiền chuyển!`,
    `<i class="ri-user-forbid-fill" style="color:var(--red)"></i> Ai nợ mà không chịu trả, tao ghi sổ đen ngay!`,
    `<i class="ri-award-fill" style="color:var(--green)"></i> 133 Trung Kính — đã chi tiêu phải rõ ràng từng đồng!`,
    `<i class="ri-discuss-fill" style="color:var(--blue)"></i> Mấy ông tưởng Đại ca 133 bận không để ý hả? Sai rồi!`,
    `<i class="ri-error-warning-fill" style="color:var(--red)"></i> Đừng để tao phải hỏi lần hai. Lần đầu tao đã nhắc rồi đó!`,
    `<i class="ri-money-cny-circle-fill" style="color:#ff7c20"></i> Tiền không tự nhiên mà có. Chia rõ ràng, thanh toán sạch!`,
    `<i class="ri-building-fill" style="color:var(--blue)"></i> Chi nhánh mình còn đoàn kết được hay không là do tụi bay đó!`,
    `<i class="ri-fire-fill" style="color:var(--red)"></i> Nợ nhiều không phải chuyện vui. Giải quyết nhanh còn ăn cơm!`,
    `<i class="ri-glasses-fill" style="color:#ff7c20"></i> Tao xem Dashboard mỗi ngày. Tụi bay có biết không?`,
    `<i class="ri-sword-fill" style="color:var(--red)"></i> Đại ca 133 không dung tha kẻ trốn nợ. Nhớ lấy!`,
    `<i class="ri-gamepad-fill" style="color:var(--blue)"></i> Đừng xem công nợ như trò chơi. Tiền thật, nợ thật!`,
    `<i class="ri-heart-pulse-fill" style="color:var(--red)"></i> Tao hỏi thăm sức khoẻ tài chính của tụi bay đây. Ổn không?`,
    `<i class="ri-compass-3-fill" style="color:#ff7c20"></i> Đại ca 133 luôn sẵn sàng. Còn tụi bay thì sao?`,
    `<i class="ri-alarm-fill" style="color:var(--red)"></i> Tao đặt báo thức nhắc nợ rồi đó. Tự xử trước khi tao réo tên!`,
    `<i class="ri-git-branch-fill" style="color:var(--blue)"></i> Mỗi đồng chi ra đều có dấu vết. Đừng nghĩ qua được tao!`,
    `<i class="ri-star-fill" style="color:#ff7c20"></i> Ai trong sạch tài chính, tao kính trọng. Còn lại… tự biết!`,
    `<i class="ri-vip-crown-fill" style="color:#ff7c20"></i> Đại ca 133 — công bằng với tất cả, nhưng không tha ai cả!`,
    `<i class="ri-footprint-fill" style="color:var(--blue)"></i> Tao theo dõi từng bước đi tài chính của tụi bay đó!`,
    `<i class="ri-notification-4-fill" style="color:var(--red)"></i> Chưa thanh toán mà dám tắt thông báo? Tao thấy hết rồi!`,
    `<i class="ri-team-fill" style="color:var(--green)"></i> Nhóm mạnh là nhóm không có nợ tồn đọng. Hiểu chưa?`,
    `<i class="ri-hand-heart-fill" style="color:var(--green)"></i> Tao không xấu, tao chỉ muốn tụi bay sống tốt thôi!`,
    `<i class="ri-focus-3-fill" style="color:#ff7c20"></i> Một nhóm — một sổ sách — không có chuyện mờ ám!`,
  ];

  function _buildMsgs(){
    const out=[];
    const d=window.D;
    if(!d) return [{html:`<i class="ri-loader-4-line ri-spin"></i> Đại ca đang kiểm tra sổ sách...`}];

    const nvMap={};
    (d.nhanVien||[]).forEach(nv=>nvMap[nv.id]=nv);

    // Nợ cá nhân
    (d.soDuList||[]).filter(n=>n.soDu<0).forEach(n=>{
      const a=fVND(Math.abs(n.soDu));
      out.push({html:`<i class="ri-alarm-warning-fill" style="color:var(--red)"></i> <b>${n.hoTen}</b>! Nợ <b style="color:var(--red)">${a}</b> rồi chưa chịu trả?`});
      out.push({html:`<i class="ri-hand-coin-fill" style="color:#ff7c20"></i> <b>${n.hoTen}</b> còn thiếu <b style="color:var(--red)">${a}</b> — vào Thanh Toán ngay!`});
      out.push({html:`<i class="ri-user-forbid-fill" style="color:var(--red)"></i> Ê <b>${n.hoTen}</b>! <b style="color:var(--red)">${a}</b> không phải số nhỏ đâu nhé!`});
      out.push({html:`<i class="ri-sword-fill" style="color:var(--red)"></i> <b>${n.hoTen}</b> đang nợ <b style="color:var(--red)">${a}</b>. Đại ca 133 đang chờ đấy!`});
      out.push({html:`<i class="ri-calendar-close-fill" style="color:var(--red)"></i> <b>${n.hoTen}</b> ơi, nợ <b style="color:var(--red)">${a}</b> mà để yên được à?`});
      out.push({html:`<i class="ri-restaurant-fill" style="color:var(--red)"></i> <b>${n.hoTen}</b> đớp thì lắm mà không chịu trả — <b style="color:var(--red)">${a}</b> đó nhé!`});
      out.push({html:`<i class="ri-empathize-fill" style="color:#ff7c20"></i> Tao lạy mày <b>${n.hoTen}</b> ơi!! Trả <b style="color:var(--red)">${a}</b> cho người ta dùm tao với!!`});
    });

    // Khen ngợi top ứng tiền
    const ungMap={};
    (d.phieuChi||[]).forEach(pc=>{ ungMap[pc.nguoiUngID]=(ungMap[pc.nguoiUngID]||0)+pc.soTienTong; });
    const topUng=Object.entries(ungMap).sort((a,b)=>b[1]-a[1]).slice(0,3);
    topUng.forEach(([id,amt],rank)=>{
      const ten=(nvMap[id]||{hoTen:id}).hoTen;
      const a=fVND(amt);
      if(rank===0){
        out.push({html:`<i class="ri-vip-crown-fill" style="color:#ff7c20"></i> <b>${ten}</b> ứng nhiều nhất — <b style="color:var(--green)">${a}</b>. Tao nể mày đó, nhưng tụi kia phải hoàn lại!`});
        out.push({html:`<i class="ri-trophy-fill" style="color:#ff7c20"></i> Top 1 ứng tiền: <b>${ten}</b> với <b style="color:var(--green)">${a}</b>. Người chịu chơi đó! Mấy đứa còn lại học đi!`});
        out.push({html:`<i class="ri-hand-heart-fill" style="color:var(--green)"></i> <b>${ten}</b> dám bỏ tiền túi ứng <b style="color:var(--green)">${a}</b>. Đại ca ghi nhận — mau trả lại cho người ta!`});
      } else if(rank===1){
        out.push({html:`<i class="ri-medal-2-fill" style="color:#aaa"></i> <b>${ten}</b> ứng hạng 2 — <b style="color:var(--green)">${a}</b>. Cũng được, nhưng phải được hoàn đầy đủ!`});
        out.push({html:`<i class="ri-star-half-fill" style="color:#ff7c20"></i> <b>${ten}</b> ứng <b style="color:var(--green)">${a}</b>, đứng hạng nhì. Người dám bỏ tiền thì phải được tôn trọng!`});
      } else {
        out.push({html:`<i class="ri-copper-coin-fill" style="color:#cd7f32"></i> <b>${ten}</b> ứng hạng 3 — <b style="color:var(--green)">${a}</b>. Tao thấy rồi, đừng lo!`});
      }
    });

    // Gợi ý thanh toán
    const sug=d.goiYThanhToan||[];
    if(sug.length>0){
      out.push({html:`<i class="ri-lightning-fill" style="color:#ff7c20"></i> Còn <b>${sug.length} cặp</b> chưa quyết toán. Giải quyết ngay đi!`});
      out.push({html:`<i class="ri-todo-fill" style="color:var(--blue)"></i> Dashboard có sẵn gợi ý thanh toán rồi. Vào làm theo đi, lười vậy!`});
      out.push({html:`<i class="ri-route-fill" style="color:#ff7c20"></i> <b>${sug.length} giao dịch</b> đang chờ — tao đã vạch lộ trình sẵn rồi, làm theo đi!`});
    }

    // Phiếu chi
    (d.phieuChi||[]).slice(0,3).forEach(pc=>{
      out.push({html:`<i class="ri-file-warning-line" style="color:var(--blue)"></i> Phiếu <b>${pc.id}</b> — ${fVND(pc.soTienTong)}. Chia tiền xong chưa mấy cha?`});
      out.push({html:`<i class="ri-money-dollar-circle-fill" style="color:#ff7c20"></i> Phiếu <b>${pc.id}</b> tổng <b>${fVND(pc.soTienTong)}</b> — ai ứng rồi phải được hoàn lại!`});
    });

    // Quỹ chung
    if(typeof d.soDuQuy==='number' && d.soDuQuy<0){
      out.push({html:`<i class="ri-safe-2-fill" style="color:var(--red)"></i> Quỹ chung đang <b style="color:var(--red)">âm ${fVND(-d.soDuQuy)}</b>. Nộp tiền vào đi!`});
      out.push({html:`<i class="ri-error-warning-fill" style="color:var(--red)"></i> Quỹ âm mà không ai nộp. Tụi bay định để Đại ca bù à?`});
      out.push({html:`<i class="ri-bank-fill" style="color:var(--red)"></i> Quỹ thiếu <b style="color:var(--red)">${fVND(-d.soDuQuy)}</b> — ai góp phần thì vào Quỹ Chung nộp đi!`});
    } else if(typeof d.soDuQuy==='number' && d.soDuQuy>0){
      out.push({html:`<i class="ri-wallet-3-fill" style="color:var(--green)"></i> Quỹ còn <b style="color:var(--green)">${fVND(d.soDuQuy)}</b>. Đừng có chi bừa!`});
      out.push({html:`<i class="ri-coins-fill" style="color:var(--green)"></i> Quỹ chung đang <b style="color:var(--green)">${fVND(d.soDuQuy)}</b>. Giữ vậy mới được tao khen!`});
      out.push({html:`<i class="ri-price-tag-3-fill" style="color:var(--green)"></i> Quỹ dương <b style="color:var(--green)">${fVND(d.soDuQuy)}</b> — tao hài lòng. Nhưng đừng có lơ là!`});
    }

    IDLE.forEach(html=>out.push({html}));
    return out;
  }

  let _lastIdx=-1, _hideTimer=null;
  function _show(msgs,idx){
    msgEl.innerHTML=msgs[idx].html;
    bubble.classList.add('show');
    clearTimeout(_hideTimer);
    _hideTimer=setTimeout(()=>bubble.classList.remove('show'),6000);
  }
  function _showRandom(){
    const msgs=_buildMsgs();
    let idx;
    do { idx=Math.floor(Math.random()*msgs.length); } while(msgs.length>1 && idx===_lastIdx);
    _lastIdx=idx;
    _show(msgs,idx);
  }

  setTimeout(_showRandom,2200);
  setInterval(_showRandom,12000);
}());
