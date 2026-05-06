import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM       = 'Cong No 133 <onboarding@resend.dev>'
const APP_URL    = 'https://cn133tko.vercel.app'
const APP_NAME   = 'Công Nợ 133'

// ─────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return ok()
    const { table, record, type } = await req.json()
    console.log('[notify] table:', table, '| type:', type)
    if (type !== 'INSERT') return ok()
    if (!RESEND_KEY) { console.error('[notify] RESEND_API_KEY chua duoc cau hinh'); return ok() }

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    if (table === 'phieu_chi') await delay(400)

    const [{ data: allNV }, { data: allPC }, { data: allCT }, { data: allTT }] = await Promise.all([
      sb.from('nhan_vien').select('id, ho_ten, email, avatar_url'),
      sb.from('phieu_chi').select('id, nguoi_ung_id, so_tien_tong'),
      sb.from('chi_tiet_phieu_chi').select('phieu_chi_id, nhan_vien_id, so_tien_chia'),
      sb.from('thanh_toan').select('nguoi_tra_id, nguoi_nhan_id, so_tien'),
    ])

    if (!allNV?.length) return ok('no employees')

    type NV = { id: string; ho_ten: string; email: string | null; avatar_url: string | null }
    const nvMap: Record<string, string> = {}
    const nvAvatar: Record<string, string | null> = {}
    allNV.forEach((n: NV) => {
      nvMap[n.id]    = n.ho_ten
      nvAvatar[n.id] = n.avatar_url || null
    })

    const bal: Record<string, number> = {}
    allNV.forEach((n: NV) => bal[n.id] = 0)
    allCT?.forEach((ct: any) => {
      const pc = allPC?.find((p: any) => p.id === ct.phieu_chi_id)
      if (!pc) return
      if (bal[pc.nguoi_ung_id] !== undefined) bal[pc.nguoi_ung_id] += ct.so_tien_chia
      if (bal[ct.nhan_vien_id] !== undefined) bal[ct.nhan_vien_id] -= ct.so_tien_chia
    })
    allTT?.forEach((tt: any) => {
      if (bal[tt.nguoi_tra_id]  !== undefined) bal[tt.nguoi_tra_id]  += tt.so_tien
      if (bal[tt.nguoi_nhan_id] !== undefined) bal[tt.nguoi_nhan_id] -= tt.so_tien
    })

    const emails: any[] = []

    if (table === 'phieu_chi') {
      const { data: chiTiet } = await sb
        .from('chi_tiet_phieu_chi').select('nhan_vien_id, so_tien_chia').eq('phieu_chi_id', record.id)
      const ungTen    = nvMap[record.nguoi_ung_id]    || record.nguoi_ung_id
      const ungAvatar = nvAvatar[record.nguoi_ung_id] || null
      const chiRows   = (chiTiet || []).map((ct: any) => ({
        ten: nvMap[ct.nhan_vien_id] || ct.nhan_vien_id,
        avatar: nvAvatar[ct.nhan_vien_id] || null,
        so_tien: ct.so_tien_chia,
      }))
      allNV.forEach((nv: NV) => {
        if (!nv.email) return
        const soDu  = Math.round(bal[nv.id] || 0)
        const isUng = nv.id === record.nguoi_ung_id
        emails.push({ from: FROM, to: [nv.email],
          subject: isUng ? `Ban vua tam ung: ${record.mo_ta}` : `Phieu Chi Moi: ${record.mo_ta}`,
          html: isUng
            ? tmplPhieuChiUng(record, ungTen, ungAvatar, chiRows, soDu)
            : tmplPhieuChiMoi(record, ungTen, ungAvatar, chiRows, soDu) })
      })

    } else if (table === 'thanh_toan') {
      const traTen     = nvMap[record.nguoi_tra_id]    || record.nguoi_tra_id
      const nhanTen    = nvMap[record.nguoi_nhan_id]   || record.nguoi_nhan_id
      const traAvatar  = nvAvatar[record.nguoi_tra_id]  || null
      const nhanAvatar = nvAvatar[record.nguoi_nhan_id] || null
      allNV.forEach((nv: NV) => {
        if (!nv.email) return
        emails.push({ from: FROM, to: [nv.email],
          subject: `${traTen} vua thanh toan cho ${nhanTen}`,
          html: tmplThanhToan(record, traTen, traAvatar, nhanTen, nhanAvatar, Math.round(bal[nv.id] || 0), nv.id === record.nguoi_nhan_id) })
      })

    } else if (table === 'quy_nop') {
      const nvTen = nvMap[record.nhan_vien_id]    || record.nhan_vien_id
      const nvAv  = nvAvatar[record.nhan_vien_id] || null
      allNV.forEach((nv: NV) => {
        if (!nv.email) return
        emails.push({ from: FROM, to: [nv.email],
          subject: `Nop Quy: ${nvTen}`,
          html: tmplQuyNop(record, nvTen, nvAv) })
      })

    } else if (table === 'quy_chi') {
      allNV.forEach((nv: NV) => {
        if (!nv.email) return
        emails.push({ from: FROM, to: [nv.email],
          subject: `Chi Quy Nhom: ${record.mo_ta}`,
          html: tmplQuyChi(record) })
      })
    }

    if (!emails.length) return ok('no emails')
    const res    = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emails),
    })
    const result = await res.json()
    res.ok ? console.log('[notify] OK:', emails.length) : console.error('[notify] ERR:', JSON.stringify(result))
    return new Response(JSON.stringify(result), { status: res.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[notify] Exception:', String(err))
    return new Response(String(err), { status: 500 })
  }
})

// ─────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────
const ok    = (msg = 'ok') => new Response(msg, { status: 200 })
const delay = (ms: number)  => new Promise(r => setTimeout(r, ms))

function fmtVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n || 0)) + '&nbsp;&#8363;'
}

// ─────────────────────────────────────────────────────
// INLINE SVG ICONS
// ─────────────────────────────────────────────────────
const IC = {
  // Tài liệu / phiếu chi
  doc: (color = '#7a5828', size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,

  // Người dùng
  person: (color = '#a67c3a', size = 15) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,

  // Lịch
  calendar: (color = '#a67c3a', size = 15) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,

  // Ví tiền
  wallet: (color = '#a67c3a', size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/><path d="M16 3H8a1 1 0 0 0-1 1v3h10V4a1 1 0 0 0-1-1Z"/><circle cx="17" cy="13" r="1.2" fill="${color}" stroke="none"/></svg>`,

  // Hoá đơn / số dư
  receipt: (color = '#dc2626', size = 22) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>`,

  // Mũi tên gửi (thanh toán)
  send: (color = '#16a34a', size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,

  // Két/quỹ
  safe: (color = '#2563eb', size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1m0 6v1m-4-4h1m6 0h1"/></svg>`,

  // Rổ chi (quỹ chi)
  expense: (color = '#dc2626', size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,

  // Shield check (footer)
  shield: (color = '#a67c3a', size = 13) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
}

// ─────────────────────────────────────────────────────
// OUTER SHELL — chỉ là khung ngoài
// ─────────────────────────────────────────────────────
function shell(body: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f2e9d8;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:100%;border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 4px 32px rgba(100,60,10,.13)">
${body}
</table>
</td></tr>
</table>
</body>
</html>`
}

// ─────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────

/** Avatar tròn — ảnh thật hoặc chữ cái đầu */
function avatar(url: string | null, ten: string, size = 32): string {
  const letter = (ten || '?').trim().split(' ').pop()!.charAt(0).toUpperCase()
  return url
    ? `<img src="${url}" width="${size}" height="${size}" alt="${letter}" style="border-radius:50%;vertical-align:middle;display:inline-block;border:2px solid #f0e4d4;object-fit:cover">`
    : `<span style="display:inline-block;width:${size}px;height:${size}px;line-height:${size}px;border-radius:50%;background:#f0e4d4;border:2px solid #e0d0b8;text-align:center;vertical-align:middle;font-size:${Math.round(size * .42)}px;font-weight:900;color:#8b5e20;font-family:Arial,sans-serif">${letter}</span>`
}

/** Dòng thông tin: [icon + nhãn] .................. [giá trị] */
function infoRow(icon: string, label: string, value: string): string {
  return `<tr>
    <td style="padding:12px 22px;border-bottom:1px solid #f5ede0;vertical-align:middle">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:9px">${icon}</td>
        <td style="font-size:12.5px;font-weight:600;color:#a09070;vertical-align:middle">${label}</td>
      </tr></table>
    </td>
    <td style="padding:12px 22px;border-bottom:1px solid #f5ede0;text-align:right;font-size:13.5px;font-weight:700;color:#2c1a08;vertical-align:middle;white-space:nowrap">${value}</td>
  </tr>`
}

/** Tiêu đề section nhỏ */
function secTitle(title: string): string {
  return `<tr><td colspan="2" style="padding:14px 22px 6px;font-size:11px;font-weight:800;color:#b8a480;letter-spacing:1.5px;text-transform:uppercase">${title}</td></tr>`
}

/** Dòng tham gia phân bổ: [avatar + tên] ......... [số tiền] */
function partRow(url: string | null, ten: string, soTien: number): string {
  return `<tr>
    <td style="padding:11px 22px;border-bottom:1px solid #f5ede0;vertical-align:middle">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:10px">${avatar(url, ten, 34)}</td>
        <td style="font-size:13.5px;font-weight:600;color:#2c1a08;vertical-align:middle">${ten}</td>
      </tr></table>
    </td>
    <td style="padding:11px 22px;text-align:right;font-size:14px;font-weight:800;color:#a67c3a;vertical-align:middle;border-bottom:1px solid #f5ede0;white-space:nowrap">${fmtVND(soTien)}</td>
  </tr>`
}

/** Card tổng tiền nổi bật */
function totalCard(amount: number, icon: string): string {
  return `<tr><td colspan="2" style="padding:16px 22px 8px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf4e8;border-radius:12px;border:1px solid #eedfc8">
      <tr>
        <td style="padding:16px 18px">
          <div style="font-size:10px;font-weight:800;color:#c4a96c;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">T&#7893;ng ti&#7873;n</div>
          <div style="font-size:28px;font-weight:900;color:#a67c3a;letter-spacing:-0.5px">${fmtVND(amount)}</div>
        </td>
        <td width="56" style="padding:16px 18px 16px 0;text-align:right;vertical-align:middle">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:#fff;border:1.5px solid #e8d8c0">${icon}</span>
        </td>
      </tr>
    </table>
  </td></tr>`
}

/** Card số dư */
function balCard(soDu: number, icon: string): string {
  const pos    = soDu >= 0
  const color  = soDu > 0 ? '#16a34a' : soDu < 0 ? '#dc2626' : '#8b7355'
  const bg     = soDu > 0 ? '#f0fdf4' : soDu < 0 ? '#fff5f5' : '#fafaf9'
  const border = soDu > 0 ? '#bbf7d0' : soDu < 0 ? '#fecaca' : '#e5e5e5'
  const status = soDu > 0 ? 'Ng&#432;&#7901;i kh&#225;c &#273;ang n&#7907; b&#7841;n'
               : soDu < 0 ? 'B&#7841;n &#273;ang n&#7907; ng&#432;&#7901;i kh&#225;c'
               : '&#272;&#227; c&#226;n b&#7857;ng'
  const sign   = soDu > 0 ? '+' : ''
  return `<tr><td colspan="2" style="padding:14px 22px 20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border-radius:12px;border:1.5px solid ${border}">
      <tr>
        <td style="padding:16px 18px">
          <div style="font-size:9.5px;font-weight:900;color:${color};text-transform:uppercase;letter-spacing:1.8px;margin-bottom:7px;opacity:.8">S&#7889; d&#432; c&#7911;a b&#7841;n</div>
          <div style="font-size:24px;font-weight:900;color:${color};margin-bottom:4px">${sign}${fmtVND(Math.abs(soDu))}</div>
          <div style="font-size:12px;color:${color};opacity:.85">${status}</div>
        </td>
        <td width="58" style="padding:16px 18px 16px 0;text-align:right;vertical-align:middle">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:#fff;border:1.5px solid ${border}">${icon}</span>
        </td>
      </tr>
    </table>
  </td></tr>`
}

/** Đường kẻ phân cách */
const divider = `<tr><td colspan="2" style="padding:0 22px"><div style="height:1px;background:#f0e8d8"></div></td></tr>`

/** Footer chung */
const footer = `<tr>
  <td colspan="2" style="padding:14px 22px;text-align:center;border-top:1px solid #f0e8d8">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
      <td style="vertical-align:middle;padding-right:6px">${IC.shield()}</td>
      <td style="font-size:11.5px;color:#b8a480;vertical-align:middle">C&#7843;m &#417;n b&#7841;n &#273;&#227; s&#7917; d&#7909;ng d&#7883;ch v&#7909; c&#7911;a ch&#250;ng t&#244;i!</td>
    </tr></table>
  </td>
</tr>`

/** Logo header */
const logoBar = `<tr>
  <td colspan="2" style="background:#fff;padding:12px 22px;border-bottom:1px solid #f5ede0">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <table cellpadding="0" cellspacing="0"><tr>
          <td width="24" height="24" style="background:#a67c3a;border-radius:6px;text-align:center;line-height:24px;font-size:12px;font-weight:900;color:#fff;font-family:Arial">&#8363;</td>
          <td style="padding-left:7px;font-size:11px;font-weight:800;color:#a67c3a;letter-spacing:2px;text-transform:uppercase;vertical-align:middle">${APP_NAME}</td>
        </tr></table>
      </td>
      <td align="right">
        <a href="${APP_URL}" style="font-size:11px;color:#c4ae8c;text-decoration:none">M&#7903; &#7913;ng d&#7909;ng &#8594;</a>
      </td>
    </tr></table>
  </td>
</tr>`

// ─────────────────────────────────────────────────────
// TEMPLATE 1 — PHIẾU CHI MỚI (người tham gia)
// ─────────────────────────────────────────────────────
function tmplPhieuChiMoi(r: any, ungTen: string, ungAvatar: string | null, chiRows: any[], soDu: number): string {
  const partsHtml = chiRows.length
    ? chiRows.map((c: any) => partRow(c.avatar, c.ten, c.so_tien)).join('')
    : `<tr><td colspan="2" style="padding:12px 22px;font-size:13px;color:#c4ae8c">&#272;ang c&#7853;p nh&#7853;t...</td></tr>`

  const body = `
${logoBar}
<!-- Card header -->
<tr><td colspan="2" style="padding:18px 22px 14px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle">
      <table cellpadding="0" cellspacing="0"><tr>
        <td width="44" height="44" style="background:#f0e0c8;border-radius:11px;text-align:center;vertical-align:middle">${IC.doc()}</td>
        <td style="padding-left:12px;vertical-align:top;padding-top:2px">
          <div style="font-size:16px;font-weight:900;color:#2c1a08;letter-spacing:.3px">PHI&#7870;U CHI</div>
          <div style="font-size:12px;color:#a09070;margin-top:3px">${r.mo_ta} &middot; ${r.ngay_tao || 'H&#244;m nay'}</div>
        </td>
      </tr></table>
    </td>
    <td align="right" style="vertical-align:middle">
      <span style="display:inline-block;background:#2c1a08;color:#f5ede0;font-size:9.5px;font-weight:700;padding:5px 12px;border-radius:20px;font-family:'Courier New',monospace;letter-spacing:.5px;white-space:nowrap">${r.id}</span>
    </td>
  </tr></table>
</td></tr>
<!-- Tổng tiền -->
${totalCard(r.so_tien_tong, IC.wallet())}
${divider}
<!-- Thông tin -->
${secTitle('Th&#244;ng tin phi&#7871;u chi')}
${infoRow(IC.person(), 'Ng&#432;&#7901;i &#7913;ng ti&#7873;n', ungTen)}
${infoRow(IC.calendar(), 'Ng&#224;y t&#7841;o', r.ngay_tao || 'H&#244;m nay')}
${divider}
<!-- Phân bổ -->
${secTitle('Ph&#226;n b&#7893; chi ph&#237;')}
${partsHtml}
${divider}
<!-- Số dư -->
${secTitle('S&#7889; d&#432;')}
${balCard(soDu, IC.receipt())}
${footer}`

  return shell(body)
}

// ─────────────────────────────────────────────────────
// TEMPLATE 2 — TẠM ỨNG (người ứng tiền)
// ─────────────────────────────────────────────────────
function tmplPhieuChiUng(r: any, ungTen: string, ungAvatar: string | null, chiRows: any[], soDu: number): string {
  const partsHtml = chiRows.length
    ? chiRows.map((c: any) => partRow(c.avatar, c.ten, c.so_tien)).join('')
    : ''

  const body = `
${logoBar}
<tr><td colspan="2" style="padding:18px 22px 14px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle">
      <table cellpadding="0" cellspacing="0"><tr>
        <td width="44" height="44" style="background:#fef3c7;border-radius:11px;text-align:center;vertical-align:middle">${IC.doc('#d97706')}</td>
        <td style="padding-left:12px;vertical-align:top;padding-top:2px">
          <div style="font-size:16px;font-weight:900;color:#2c1a08;letter-spacing:.3px">T&#7840;M &#7912;NG</div>
          <div style="font-size:12px;color:#a09070;margin-top:3px">${r.mo_ta} &middot; ${r.ngay_tao || 'H&#244;m nay'}</div>
        </td>
      </tr></table>
    </td>
    <td align="right" style="vertical-align:middle">
      <span style="display:inline-block;background:#2c1a08;color:#f5ede0;font-size:9.5px;font-weight:700;padding:5px 12px;border-radius:20px;font-family:'Courier New',monospace;letter-spacing:.5px;white-space:nowrap">${r.id}</span>
    </td>
  </tr></table>
</td></tr>
${totalCard(r.so_tien_tong, IC.wallet('#d97706'))}
${divider}
${secTitle('Chi ti&#7871;t t&#7841;m &#7913;ng')}
${infoRow(IC.person('#d97706'), 'Ng&#432;&#7901;i &#7913;ng ti&#7873;n', ungTen)}
${infoRow(IC.calendar('#d97706'), 'Ng&#224;y t&#7841;o', r.ngay_tao || 'H&#244;m nay')}
${partsHtml.length ? divider : ''}
${partsHtml.length ? secTitle('Chia cho') : ''}
${partsHtml}
${divider}
${secTitle('S&#7889; d&#432;')}
${balCard(soDu, IC.receipt('#d97706'))}
${footer}`

  return shell(body)
}

// ─────────────────────────────────────────────────────
// TEMPLATE 3 — THANH TOÁN
// ─────────────────────────────────────────────────────
function tmplThanhToan(r: any, traTen: string, traAvatar: string | null, nhanTen: string, nhanAvatar: string | null, soDu: number, isNhan: boolean): string {
  const headline = isNhan ? `B&#7841;n &#273;&#432;&#7907;c ${traTen} thanh to&#225;n` : `${traTen} thanh to&#225;n cho ${nhanTen}`

  const body = `
${logoBar}
<tr><td colspan="2" style="padding:18px 22px 14px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle">
      <table cellpadding="0" cellspacing="0"><tr>
        <td width="44" height="44" style="background:#dcfce7;border-radius:11px;text-align:center;vertical-align:middle">${IC.send()}</td>
        <td style="padding-left:12px;vertical-align:top;padding-top:2px">
          <div style="font-size:15px;font-weight:900;color:#2c1a08;letter-spacing:.2px">THANH TO&#7844;N</div>
          <div style="font-size:12px;color:#a09070;margin-top:3px">${headline}</div>
        </td>
      </tr></table>
    </td>
    <td align="right" style="vertical-align:middle">
      <span style="display:inline-block;background:#2c1a08;color:#f5ede0;font-size:9.5px;font-weight:700;padding:5px 12px;border-radius:20px;font-family:'Courier New',monospace;letter-spacing:.5px;white-space:nowrap">${r.id}</span>
    </td>
  </tr></table>
</td></tr>
${totalCard(r.so_tien, IC.send())}
${divider}
${secTitle('Th&#244;ng tin giao d&#7883;ch')}
<!-- Avatar flow: người trả → người nhận -->
<tr><td colspan="2" style="padding:14px 22px">
  <table cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle">${avatar(traAvatar, traTen, 38)}</td>
    <td style="padding:0 10px;font-size:20px;color:#d0c0a0;vertical-align:middle">&rarr;</td>
    <td style="vertical-align:middle">${avatar(nhanAvatar, nhanTen, 38)}</td>
    <td style="padding-left:10px;vertical-align:middle">
      <div style="font-size:12px;color:#a09070">${traTen}</div>
      <div style="font-size:10px;color:#c4ae8c;margin-top:1px">&darr;</div>
      <div style="font-size:12px;color:#16a34a;font-weight:700">${nhanTen}</div>
    </td>
  </tr></table>
</td></tr>
${infoRow(IC.calendar('#16a34a'), 'Ng&#224;y thanh to&#225;n', r.ngay_tao || 'H&#244;m nay')}
${divider}
${secTitle('S&#7889; d&#432;')}
${balCard(soDu, IC.receipt('#16a34a'))}
${footer}`

  return shell(body)
}

// ─────────────────────────────────────────────────────
// TEMPLATE 4 — NỘP QUỸ
// ─────────────────────────────────────────────────────
function tmplQuyNop(r: any, nvTen: string, nvAv: string | null): string {
  const body = `
${logoBar}
<tr><td colspan="2" style="padding:18px 22px 14px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle">
      <table cellpadding="0" cellspacing="0"><tr>
        <td width="44" height="44" style="background:#dbeafe;border-radius:11px;text-align:center;vertical-align:middle">${IC.safe()}</td>
        <td style="padding-left:12px;vertical-align:top;padding-top:2px">
          <div style="font-size:16px;font-weight:900;color:#2c1a08;letter-spacing:.3px">N&#7896;P QU&#7928;</div>
          <div style="font-size:12px;color:#a09070;margin-top:3px">${nvTen} v&#7915;a n&#7897;p qu&#7929;</div>
        </td>
      </tr></table>
    </td>
    <td align="right" style="vertical-align:middle">
      <span style="display:inline-block;background:#2c1a08;color:#f5ede0;font-size:9.5px;font-weight:700;padding:5px 12px;border-radius:20px;font-family:'Courier New',monospace;letter-spacing:.5px;white-space:nowrap">${r.id}</span>
    </td>
  </tr></table>
</td></tr>
${totalCard(r.so_tien, IC.safe())}
${divider}
${secTitle('Th&#244;ng tin n&#7897;p qu&#7929;')}
${infoRow(IC.person('#2563eb'), 'Nh&#226;n vi&#234;n', nvTen)}
${infoRow(IC.calendar('#2563eb'), 'Ng&#224;y n&#7897;p', r.ngay_nop || 'H&#244;m nay')}
${r.mo_ta ? infoRow(IC.doc('#2563eb', 15), 'Ghi ch&#250;', r.mo_ta) : ''}
${footer}`

  return shell(body)
}

// ─────────────────────────────────────────────────────
// TEMPLATE 5 — CHI QUỸ
// ─────────────────────────────────────────────────────
function tmplQuyChi(r: any): string {
  const body = `
${logoBar}
<tr><td colspan="2" style="padding:18px 22px 14px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle">
      <table cellpadding="0" cellspacing="0"><tr>
        <td width="44" height="44" style="background:#fee2e2;border-radius:11px;text-align:center;vertical-align:middle">${IC.expense()}</td>
        <td style="padding-left:12px;vertical-align:top;padding-top:2px">
          <div style="font-size:16px;font-weight:900;color:#2c1a08;letter-spacing:.3px">CHI QU&#7928;</div>
          <div style="font-size:12px;color:#a09070;margin-top:3px">${r.mo_ta}</div>
        </td>
      </tr></table>
    </td>
    <td align="right" style="vertical-align:middle">
      <span style="display:inline-block;background:#2c1a08;color:#f5ede0;font-size:9.5px;font-weight:700;padding:5px 12px;border-radius:20px;font-family:'Courier New',monospace;letter-spacing:.5px;white-space:nowrap">${r.id}</span>
    </td>
  </tr></table>
</td></tr>
${totalCard(r.so_tien, IC.expense())}
${divider}
${secTitle('Th&#244;ng tin chi qu&#7929;')}
${infoRow(IC.doc('#dc2626', 15), 'N&#7897;i dung', r.mo_ta)}
${infoRow(IC.calendar('#dc2626'), 'Ng&#224;y chi', r.ngay_tao || 'H&#244;m nay')}
${footer}`

  return shell(body)
}
