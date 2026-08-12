/*
 * gemini.js
 * Frontend GitHub Pages
 *
 * Ubah WORKER_URL menjadi URL Cloudflare Worker Anda.
 * Jangan pernah menaruh GEMINI_API_KEY di file ini.
 */

const WORKER_URL = "karyaabadi-jobs.karyaabadi24434.workers.dev";

async function mintaRekomendasiGemini({ jurusan, jabatan, masaKerja = "" }) {
    const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jurusan, jabatan, masaKerja })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Gagal menghubungi Gemini.");
    }

    return data;
}

function pasangGeminiAI() {
    document.querySelectorAll("button").forEach(button => {
        if (button.dataset.geminiReady === "1") return;

        const text = (button.innerText || "").toLowerCase();
        if (!text.includes("buat deskripsi") || !text.includes("ai")) return;

        button.dataset.geminiReady = "1";
        button.addEventListener("click", async e => {
            e.preventDefault();

            const box = cariBoxPosisi(button);
            const jabatan = cariField(box, ["jabatan/posisi", "jabatan", "posisi"]);
            const masaKerja = cariField(box, ["masa kerja"]);
            const jurusan = cariJurusan();

            if (!jurusan) return alert("Jurusan sekolah belum diisi.");
            if (!jabatan) return alert("Jabatan/Posisi belum diisi.");

            const old = button.innerHTML;
            button.disabled = true;
            button.innerHTML = "⏳ Membuat rekomendasi...";

            try {
                const hasil = await mintaRekomendasiGemini({
                    jurusan, jabatan, masaKerja
                });
                tampilkanRekomendasi(hasil, box);
            } catch (err) {
                alert(err.message);
            } finally {
                button.disabled = false;
                button.innerHTML = old;
            }
        });
    });
}

function cariBoxPosisi(button) {
    let el = button.parentElement;
    for (let i = 0; i < 10 && el; i++, el = el.parentElement) {
        const t = (el.innerText || "").toLowerCase();
        if (t.includes("jabatan/posisi") && t.includes("deskripsi pekerjaan")) return el;
    }
    return button.parentElement;
}

function cariLabel(el) {
    if (!el) return "";
    if (el.id) {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) return label.innerText || "";
    }
    const parent = el.closest("label");
    if (parent) return parent.innerText || "";
    const prev = el.previousElementSibling;
    if (prev) return prev.innerText || "";
    return "";
}

function cariField(container, labels) {
    if (!container) return "";
    for (const el of container.querySelectorAll("input, textarea, select")) {
        const label = cariLabel(el).toLowerCase();
        if (labels.some(x => label.includes(x))) return (el.value || "").trim();
    }
    return "";
}

function cariJurusan() {
    for (const el of document.querySelectorAll("input, textarea, select")) {
        const ident = `${cariLabel(el)} ${el.id} ${el.name} ${el.placeholder}`.toLowerCase();
        if (ident.includes("jurusan") || ident.includes("program keahlian") ||
            ident.includes("kompetensi keahlian")) {
            return (el.value || "").trim();
        }
    }
    return "";
}

function tampilkanRekomendasi(data, box) {
    let modal = document.getElementById("gemini-job-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "gemini-job-modal";
        modal.innerHTML = `
        <div class="gj-overlay">
          <div class="gj-window">
            <div class="gj-head">
              <b>✨ Rekomendasi Gemini AI</b>
              <button type="button" id="gj-close">×</button>
            </div>
            <div id="gj-content"></div>
          </div>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById("gj-close").onclick = () => modal.remove();
    }

    const content = modal.querySelector("#gj-content");
    content.innerHTML = "";

    (data.rekomendasi || []).forEach((item, i) => {
        const card = document.createElement("div");
        card.className = "gj-card";
        card.innerHTML = `
          <h3>${escapeHtml(item.gaya || "Rekomendasi " + (i + 1))}</h3>
          <p><b>Deskripsi Pekerjaan</b><br>${escapeHtml(item.deskripsi_pekerjaan)}</p>
          <p><b>Keahlian</b><br>${escapeHtml(item.keahlian)}</p>
          <p><b>Hard Skill</b><br>${escapeHtml(item.hard_skill)}</p>
          <p><b>Soft Skill</b><br>${escapeHtml(item.soft_skill)}</p>
          <div class="gj-actions">
            <button type="button" class="gj-use">✓ Pakai</button>
            <button type="button" class="gj-no">✕ Tidak Dipakai</button>
          </div>`;

        card.querySelector(".gj-use").onclick = () => {
            isiField(box, ["deskripsi pekerjaan"], item.deskripsi_pekerjaan);
            modal.remove();
        };
        card.querySelector(".gj-no").onclick = () => {
            card.classList.add("gj-rejected");
        };
        content.appendChild(card);
    });

    modal.style.display = "block";
}

function isiField(container, labels, value) {
    for (const el of container.querySelectorAll("input, textarea, select")) {
        const label = cariLabel(el).toLowerCase();
        if (labels.some(x => label.includes(x))) {
            el.value = value || "";
            ["input", "change", "blur"].forEach(type =>
                el.dispatchEvent(new Event(type, { bubbles: true }))
            );
            return true;
        }
    }
    return false;
}

function escapeHtml(value) {
    const d = document.createElement("div");
    d.textContent = value || "";
    return d.innerHTML;
}

const gjStyle = document.createElement("style");
gjStyle.textContent = `
#gemini-job-modal{display:none;position:relative;z-index:999999}
.gj-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px}
.gj-window{width:100%;max-width:800px;max-height:90vh;overflow:auto;background:#151515;color:#fff;border-radius:14px;padding:18px}
.gj-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:18px}
.gj-head button{border:0;background:#292929;color:#fff;border-radius:6px;font-size:22px;width:34px;height:34px}
.gj-card{border:1px solid #383838;background:#1d1d1d;border-radius:10px;padding:15px;margin-bottom:12px}
.gj-card h3{color:#16b364;margin-top:0}
.gj-card p{font-size:13px;line-height:1.55}
.gj-actions{display:flex;gap:8px}
.gj-actions button{flex:1;border:0;border-radius:7px;padding:10px;cursor:pointer;font-weight:700}
.gj-use{background:#16b364;color:#fff}.gj-no{background:#292929;color:#fff}
.gj-rejected{opacity:.35}
`;
document.head.appendChild(gjStyle);

document.addEventListener("DOMContentLoaded", pasangGeminiAI);
new MutationObserver(pasangGeminiAI).observe(document.body, { childList: true, subtree: true });
