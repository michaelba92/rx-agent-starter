"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";

/**
 * Minimal React re-implementation of the user's HTML:
 * - Left: A5 preview (SVG)
 * - Right: Form with fields
 * - Autocomplete for 'Medicijn' using /api/search (server) or client-side Fuse fallback
 * - Export to vector-like PDF (simplified) by printing the SVG to a new window (placeholder)
 *   NOTE: Replace exportPdf() with a server-side PDF lib in production if needed.
 */

const styles = {
  wrap: { display:'grid', gridTemplateColumns:'520px 1fr', gap:16 },
  card: { background:'#fff', color:'#111', borderRadius:10, padding:12, boxShadow:'0 8px 24px rgba(0,0,0,.15)' },
  pageFrame: { position:'relative', width:420, height:595, borderRadius:4, overflow:'hidden', background:'#fff', margin:'auto', boxShadow:'0 8px 24px rgba(0,0,0,.25)' },
  hdr: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, margin:'14px auto 0', maxWidth:1120, padding:'0 16px' },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  input: { width:'100%', border:'1px solid #ccc', borderRadius:10, padding:'10px 12px', fontSize:15, background:'#fff', color:'#111' },
  label: { display:'block', fontSize:12, color:'#555', margin:'8px 0 4px' },
  button: { border:0, borderRadius:10, padding:'10px 14px', fontWeight:800, cursor:'pointer' },
  btn: { background:'#f2f2f2', color:'#111' },
  btnPrimary: { background:'#0969da', color:'#fff' },
  listbox: { border:'1px solid #ddd', borderRadius:10, maxHeight:160, overflowY:'auto', marginTop:4 }
};

const defaultData = {
  pr_name: "",
  pr_title: "",
  pr_addr: "",
  pr_phone: "",
  pr_email: "",
  pr_big: "",
  pr_agb: "",
  pr_place: "",
  rx_date: new Date().toISOString().slice(0,10),
  pt_name: "",
  pt_dob: "",
  drug: "",
  dtd: "",
  sig_text: "",
  sig_dataurl: ""
};

export default function PrescriptionAssistant(){
  const [f, setF] = useState(defaultData);
  const [sigPreview, setSigPreview] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [clientIndex, setClientIndex] = useState(null);
  const svgRef = useRef(null);

  // load client-side index as fallback
  useEffect(()=>{
    fetch("/data/prk_sample.json").then(r=>r.json()).then(data=>{
      const fuse = new Fuse(data, { keys:['prk_description'], includeScore:true, threshold:0.35 });
      setClientIndex(fuse);
    }).catch(()=>{});
  },[]);

  // autocomplete handler
  useEffect(()=>{
    const q = f.drug.trim();
    setQuery(q);
    if(!q){ setSuggestions([]); return; }
    // try server first (so you can later swap to Z-Index licensed dataset)
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then(r=> r.ok ? r.json() : Promise.reject())
      .then(js=> setSuggestions(js.results||[]))
      .catch(()=>{
        // fallback: client fuse
        if(clientIndex){
          const res = clientIndex.search(q).slice(0,10).map(r=>({ prk_description: r.item.prk_description, prk_code: r.item.prk_code }));
          setSuggestions(res);
        }
      });
    return ()=> ctrl.abort();
  }, [f.drug, clientIndex]);

  function setField(k, v){ setF(prev=>({ ...prev, [k]: v })); }

  function onPickSuggestion(s){
    setField("drug", s.prk_description);
    setSuggestions([]);
  }

  async function onSigFile(file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const dataURL = reader.result;
      setSigPreview(dataURL);
      setField("sig_dataurl", dataURL);
    };
    reader.readAsDataURL(file);
  }

  function exportPdf(){
    // Simple placeholder: open the SVG in a new window for printing.
    // In production, port your existing buildPdf() function to a server API route.
    const w = window.open("", "_blank");
    const svg = svgRef.current?.outerHTML ?? "";
    w.document.write(`<html><head><title>Recept</title></head><body>${svg}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  // helpers
  const rxId = useMemo(()=>{
    const d = (f.rx_date || "").replaceAll("-","");
    const rnd = Math.random().toString(36).slice(2,6).toUpperCase();
    return `Receptnr: RX-${d}-${rnd}`;
  }, [f.rx_date]);

  const formatDate = (s)=>{
    if(!s) return "";
    try { return new Date(s).toLocaleDateString("nl-NL", { day:'numeric', month:'long', year:'numeric' }); }
    catch { return s; }
  };

  return (
    <>
      <div style={styles.hdr}>
        <h1 style={{margin:0, fontSize:18}}>💊 A5 Recept · Assistant + Autocomplete</h1>
        <div style={{display:'flex', gap:8}}>
          <button style={{...styles.button, ...styles.btn}} onClick={()=>setF({...f})}>Update preview</button>
          <button style={{...styles.button, ...styles.btnPrimary}} onClick={exportPdf}>Exporteer PDF</button>
        </div>
      </div>

      <div style={styles.wrap}>
        <div style={{...styles.card, boxShadow:'0 8px 24px rgba(0,0,0,.25)'}}>
          <div style={styles.pageFrame}>
            <svg ref={svgRef} viewBox="0 0 420 595" width="420" height="595" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="480" height="595" fill="#fff"></rect>
              <text x="36" y="36" fontSize="7" fill="#111" fontFamily="Helvetica">{rxId}</text>

              <g fontFamily="Helvetica" fill="#111">
                <text x="72" y="83" fontSize="13" fontWeight="700">{f.pr_name || " "}</text>
                <text x="72" y="100" fontSize="11">{f.pr_title}</text>
                <text x="72" y="115" fontSize="11">{f.pr_addr}</text>
                <text x="72" y="130" fontSize="11">{f.pr_phone ? `Tel. ${f.pr_phone}` : ""}</text>
                <text x="72" y="145" fontSize="11">{f.pr_email ? `E-mail ${f.pr_email}` : ""}</text>
                <text x="72" y="160" fontSize="11">{f.pr_big ? `BIG ${f.pr_big}` : ""}</text>
                <text x="72" y="175" fontSize="11">{f.pr_agb ? `AGB ${f.pr_agb}` : ""}</text>
              </g>

              <g fontFamily="Helvetica" fill="#111" textAnchor="end">
                <text x="384" y="160" fontSize="11">{f.pr_place || "-"}</text>
                <text x="384" y="176" fontSize="11">{formatDate(f.rx_date)}</text>
              </g>

              <line x1="60" y1="206" x2="384" y2="206" stroke="#111" strokeWidth="0.8"></line>
              <line x1="60" y1="206" x2="60" y2="560" stroke="#111" strokeWidth="0.8"></line>

              <g fontFamily="Helvetica" fill="#111">
                <text x="72" y="240" fontSize="13" fontWeight="700">R/</text>
                <text x="72" y="260" fontSize="11">{f.drug || "medicijnnaam"}</text>
                <text x="72" y="280" fontSize="11">D.t.d. No.</text>
                <text x="120" y="280" fontSize="11">{f.dtd || "—"}</text>
                <text x="72" y="300" fontSize="11" fontWeight="700">S/</text>
                <text x="72" y="320" fontSize="11">{f.sig_text}</text>
              </g>

              <image x="200" y="480" width="200" height="80" href={sigPreview || ""} preserveAspectRatio="xMidYMid meet"></image>
              <text x="234" y="500" fontSize="10" fontFamily="Helvetica">{f.pr_name || ""}</text>
              <line x1="234" y1="484" x2="384" y2="484" stroke="#111" strokeWidth="0.8"></line>

              <g fontFamily="Helvetica" fill="#111">
                <text x="72" y="560" fontSize="11" fontWeight="700">{f.pt_name || "Naam patiënt"}</text>
                <text x="72" y="576" fontSize="11">{f.pt_dob ? new Date(f.pt_dob).toLocaleDateString("nl-NL") : "Geboortedatum"}</text>
              </g>
            </svg>
          </div>
        </div>

        <div style={styles.card}>
          <h2>Instellingen voorschrijver</h2>
          <div style={styles.row}>
            <div><label style={styles.label}>#Naam voorschrijver *</label><input style={styles.input} value={f.pr_name} onChange={e=>setField("pr_name", e.target.value)} placeholder="Naam voorschrijver" /></div>
            <div><label style={styles.label}>#Functie/titel</label><input style={styles.input} value={f.pr_title} onChange={e=>setField("pr_title", e.target.value)} placeholder="Functie/titel" /></div>
          </div>
          <label style={styles.label}>#Adres *</label><input style={styles.input} value={f.pr_addr} onChange={e=>setField("pr_addr", e.target.value)} placeholder="Straat, nr, postcode, plaats" />
          <div style={styles.row}>
            <div><label style={styles.label}>#Telefoon *</label><input style={styles.input} value={f.pr_phone} onChange={e=>setField("pr_phone", e.target.value)} placeholder="Telefoon" /></div>
            <div><label style={styles.label}>#E-mail (optioneel)</label><input style={styles.input} value={f.pr_email} onChange={e=>setField("pr_email", e.target.value)} placeholder="naam@praktijk.nl" /></div>
          </div>
          <div style={styles.row}>
            <div><label style={styles.label}>#BIG-nummer *</label><input style={styles.input} value={f.pr_big} onChange={e=>setField("pr_big", e.target.value)} placeholder="11 cijfers" /></div>
            <div><label style={styles.label}>#AGB-code (optioneel)</label><input style={styles.input} value={f.pr_agb} onChange={e=>setField("pr_agb", e.target.value)} placeholder="AGB-code" /></div>
          </div>
          <label style={styles.label}>Handtekening (PNG/JPG)</label>
          <input type="file" accept="image/*" onChange={e=>onSigFile(e.target.files?.[0])} />

          <h2 style={{marginTop:12}}>Recept</h2>
          <div style={styles.row}>
            <div><label style={styles.label}>Datum</label><input style={styles.input} type="date" value={f.rx_date} onChange={e=>setField("rx_date", e.target.value)} /></div>
            <div><label style={styles.label}>woonplaats</label><input style={styles.input} value={f.pr_place} onChange={e=>setField("pr_place", e.target.value)} placeholder="Plaats" /></div>
          </div>
          <div style={styles.row}>
            <div><label style={styles.label}>#Naam patiënt *</label><input style={styles.input} value={f.pt_name} onChange={e=>setField("pt_name", e.target.value)} placeholder="Naam patiënt" /></div>
            <div><label style={styles.label}>#Geboortedatum patiënt *</label><input style={styles.input} type="date" value={f.pt_dob} onChange={e=>setField("pt_dob", e.target.value)} /></div>
          </div>

          <label style={styles.label}>Medicijn *</label>
          <input style={styles.input} value={f.drug} onChange={e=>setField("drug", e.target.value)} placeholder="Bijv.  Naproxen tablet 250 mg" />
          {suggestions.length>0 && (
            <div style={styles.listbox}>
              {suggestions.map((s,i)=>(
                <div key={i} style={{padding:'8px 10px', cursor:'pointer'}} onClick={()=>onPickSuggestion(s)}>
                  {s.prk_description || s.label}
                </div>
              ))}
            </div>
          )}
          <label style={styles.label}>D.t.d. No. *</label><input style={styles.input} value={f.dtd} onChange={e=>setField("dtd", e.target.value)} placeholder="Aantal" />
          <label style={styles.label}>S/ *</label><textarea style={{...styles.input, minHeight:76, resize:'vertical'}} value={f.sig_text} onChange={e=>setField("sig_text", e.target.value)} placeholder="Bijv. 2dd1 stuk, gedurende 14 dagen" />
        </div>
      </div>
    </>
  );
}
