/* Highlight Digital Contact — new layout
   QR uses quickchart.io for rock-solid rendering (no flashing).
*/
const CSV_URL = "./employees.csv";
const HI_WEBSITE_DEFAULT = "https://www.highlightindustries.com";
const qs = (id) => document.getElementById(id);

function csvToObjects(text){
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h=>h.trim());
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const line = lines[i];
    const cells = [];
    let cur = "", inQ = false;
    for(let j=0;j<line.length;j++){
      const ch = line[j];
      if(ch === '"'){
        if(inQ && line[j+1]==='"'){ cur += '"'; j++; }
        else inQ = !inQ;
      } else if(ch === "," && !inQ){
        cells.push(cur); cur="";
      } else cur += ch;
    }
    cells.push(cur);
    const obj = {};
    headers.forEach((h,idx)=> obj[h] = (cells[idx]||"").trim());
    rows.push(obj);
  }
  return rows;
}
function slugify(s){
  return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}
function fullName(p){ return `${(p.first_name||"").trim()} ${(p.last_name||"").trim()}`.trim(); }

function buildEmployeeDatalist(people){
  const dl = qs("employeeList"); if(!dl) return;
  dl.innerHTML = "";
  people.forEach(p=>{
    const opt = document.createElement("option");
    opt.value = fullName(p);
    dl.appendChild(opt);
  });
}
function matchSlugFromInput(val, people){
  const v = String(val||"").trim().toLowerCase();
  if(!v) return "";
  const exact = people.find(p=> fullName(p).toLowerCase() === v);
  if(exact) return exact.slug;
  const sub = people.find(p=> fullName(p).toLowerCase().includes(v));
  return sub ? sub.slug : "";
}
function openPersonSlug(slug){
  if(!slug) return;
  const u = new URL(window.location.href);
  u.searchParams.set("u", slug);
  window.location.href = u.toString();
}
function normalizePerson(p){
  p.slug = p.slug || slugify(fullName(p));
  p.organization = p.organization || "Highlight Industries, Inc.";
  p.website = p.website || HI_WEBSITE_DEFAULT;
  p.photo = p.photo || "";
  return p;
}
const SHARE_BASE = "https://jjoyflanders-ctrl.github.io/Highlight-Digital-Card-W-Headshot-v3/";

function currentCardUrl(slug){
  const u = new URL(SHARE_BASE);
  u.searchParams.set("u", slug);
  return u.toString();
}
function setQrImg(imgEl, url, size=240){
  if(!imgEl) return;
  imgEl.src = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=${size}`;
}
function setPhoto(imgEl, person){
  if(!imgEl) return;
  const fallback = imgEl.getAttribute("data-fallback") || "./assets/building.jpg";
  imgEl.src = (person.photo && person.photo.trim()) ? person.photo.trim() : fallback;
}
function setText(id, value){ const el = qs(id); if(el) el.textContent = value || ""; }
function setLink(id, href, textId, text){
  const el = qs(id); if(el) el.href = href || "#";
  if(textId) setText(textId, text);
}
function phoneToTel(phone){
  if(!phone) return "";
  const digits = phone.replace(/[^\d]/g,"");
  if(!digits) return "";
  return `tel:${digits}`;
}
function makeVcf(person){
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${person.last_name || ""};${person.first_name || ""};;;`,
    `FN:${fullName(person)}`,
    person.title ? `TITLE:${person.title}` : "",
    person.organization ? `ORG:${person.organization}` : "",
    person.phone ? `TEL;TYPE=WORK,VOICE:${person.phone}` : "",
    person.email ? `EMAIL;TYPE=INTERNET:${person.email}` : "",
    person.website ? `URL:${person.website}` : "",
    "END:VCARD"
  ].filter(Boolean);
  return lines.join("\n");
}
function downloadFile(filename, content, mime="text/plain"){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 800);
}
async function copyToClipboard(text){
  try{ await navigator.clipboard.writeText(text); return true; }
  catch(e){
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
/* Modals */
function openModal(id){
  const m = qs(id); if(!m) return;
  m.classList.add("is-open");
  m.setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}
function closeModal(id){
  const m = qs(id); if(!m) return;
  m.classList.remove("is-open");
  m.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
}
function wireModal(id, backdropId, closeId){
  const b = qs(backdropId); if(b) b.onclick = ()=>closeModal(id);
  const c = qs(closeId); if(c) c.onclick = ()=>closeModal(id);
}

async function main(){
  if("serviceWorker" in navigator){
    try{ await navigator.serviceWorker.register("./sw.js"); }catch(e){}
  }

  let people = [];
  try{
    const res = await fetch(CSV_URL, {cache:"no-store"});
    const text = await res.text();
    people = csvToObjects(text).map(normalizePerson);
  }catch(e){
    people = [ normalizePerson({first_name:"Jessica",last_name:"Flanders",slug:"jessica-flanders"}) ];
  }

  buildEmployeeDatalist(people);

  const url = new URL(window.location.href);
  const slug = url.searchParams.get("u") || people[0].slug;
  const person = people.find(p=>p.slug===slug) || people[0];

  renderPerson(person);

  // Desktop search
  const sIn = qs("employeeSearch");
  const sGo = qs("employeeGo");
  if(sIn && sGo){
    sGo.onclick = ()=>{ const s = matchSlugFromInput(sIn.value, people); if(s) openPersonSlug(s); };
    sIn.addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); sGo.click(); }});
  }

  // Mobile find modal
  wireModal("searchModal","searchBackdrop","searchClose");
  const findBtn = qs("findBtnMobile");
  if(findBtn) findBtn.onclick = ()=>{ openModal("searchModal"); const inp=qs("searchInput"); if(inp){ inp.value=""; setTimeout(()=>inp.focus(), 50);} };

  const searchGo = qs("searchGoBtn");
  const searchIn = qs("searchInput");
  if(searchGo && searchIn){
    searchGo.onclick = ()=>{ const s = matchSlugFromInput(searchIn.value, people); if(s){ closeModal("searchModal"); openPersonSlug(s);} };
    searchIn.addEventListener("keydown",(e)=>{ if(e.key==="Enter"){ e.preventDefault(); searchGo.click(); }});
  }

  // PWA install prompt
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt",(e)=>{
    e.preventDefault();
    deferredPrompt = e;
    const ib = qs("installBtn");
    if(ib) ib.style.display = "inline-flex";
  });
  const ib = qs("installBtn");
  if(ib){
    ib.onclick = async ()=>{
      if(!deferredPrompt){
        alert("On iPhone: Share → Add to Home Screen.\nOn desktop/Android: the browser shows install when available.");
        return;
      }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      ib.style.display = "none";
    };
  }

  // Send to phone modal
  wireModal("sendModal","sendBackdrop","sendClose");

  function renderPerson(person){
    // Desktop text
    setText("dFirst", (person.first_name||"").toUpperCase());
    setText("dLast", (person.last_name||"").toUpperCase());
    setText("dTitle", person.title || "");

    setLink("dEmailLink", person.email ? `mailto:${person.email}` : "#", "dEmail", person.email || "");
    setLink("dPhoneLink", person.phone ? phoneToTel(person.phone) : "#", "dPhone", person.phone || "");
    setLink("dWebLink", person.website || "#", "dWebsite", person.website ? person.website.replace(/^https?:\/\//,"") : "");

    // Mobile text
    setText("mFirst", (person.first_name||"").toUpperCase());
    setText("mLast", (person.last_name||"").toUpperCase());
    setText("mTitle", person.title || "");

    setLink("mEmailLink", person.email ? `mailto:${person.email}` : "#", "mEmail", person.email || "");
    setLink("mPhoneLink", person.phone ? phoneToTel(person.phone) : "#", "mPhone", person.phone || "");
    setLink("mWebLink", person.website || "#", "mWebsite", person.website ? person.website.replace(/^https?:\/\//,"") : "");

    // Photos
    setPhoto(qs("rightPanelImg"), person);
    setPhoto(qs("mPhoto"), person);

    // QR
    const shareUrl = currentCardUrl(person.slug);
    setQrImg(qs("mQrImg"), shareUrl, 220);

    // Save
    const vcf = makeVcf(person);
    const saveDesktop = qs("saveBtnDesktop");
    if(saveDesktop) saveDesktop.onclick = ()=>downloadFile(`${person.slug}.vcf`, vcf, "text/vcard");
    const saveMobile = qs("saveBtnMobile");
    if(saveMobile) saveMobile.onclick = ()=>downloadFile(`${person.slug}.vcf`, vcf, "text/vcard");

    // Mobile Share
    const shareBtn = qs("shareBtn");
    if(shareBtn){
      shareBtn.onclick = async ()=>{
        if(navigator.share){
          try{ await navigator.share({title:"Highlight Contact", text:`Save ${fullName(person)}'s contact`, url: shareUrl}); return; }
          catch(e){}
        }
        const ok = await copyToClipboard(shareUrl);
        alert(ok ? "Link copied!" : "Copy failed—copy from address bar.");
      };
    }

    // Desktop Send to Phone (modal with QR + actions)
    const sendBtn = qs("sendToPhoneDesktop");
    if(sendBtn){
      sendBtn.onclick = async ()=>{
        setQrImg(qs("sendQrImg"), shareUrl, 320);
        qs("sendCopy").onclick = async ()=>alert((await copyToClipboard(shareUrl)) ? "Link copied!" : "Copy failed.");
        qs("sendSms").href = `sms:&body=${encodeURIComponent(shareUrl)}`;
        qs("sendMail").href = `mailto:?subject=${encodeURIComponent("Highlight contact")}&body=${encodeURIComponent(shareUrl)}`;

        qs("sendNativeShare").onclick = async ()=>{
          if(navigator.share){
            try{ await navigator.share({title:"Highlight Contact", text:`Save ${fullName(person)}'s contact`, url: shareUrl}); return; }
            catch(e){}
          }
          alert((await copyToClipboard(shareUrl)) ? "Share not supported here—link copied." : "Share not supported.");
        };
        openModal("sendModal");
      };
    }
  }
}

main();
