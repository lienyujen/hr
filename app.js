const ORG = {
  "總經理": ["業務部", "工程研發部", "廠務部", "管理部"],
  "業務部": ["業務課", "行銷課"],
  "工程研發部": ["設計課", "工程課"],
  "廠務部": ["生產課", "資材課", "生管課"],
  "管理部": ["品管課", "庶務課", "財會課"]
};

const USERS = [
  { id: "gm", name: "總經理", role: "manager", dept: "總經理", manages: "all" },
  { id: "sales_mgr", name: "業務部主管", role: "manager", dept: "業務部", manages: ["業務課", "行銷課"] },
  { id: "rd_mgr", name: "工程研發部主管", role: "manager", dept: "工程研發部", manages: ["設計課", "工程課"] },
  { id: "factory_mgr", name: "廠務部主管", role: "manager", dept: "廠務部", manages: ["生產課", "資材課", "生管課"] },
  { id: "admin_mgr", name: "管理部主管", role: "manager", dept: "管理部", manages: ["品管課", "庶務課", "財會課"] },
  { id: "u01", name: "王小業", role: "employee", dept: "業務課" },
  { id: "u02", name: "李小行", role: "employee", dept: "行銷課" },
  { id: "u03", name: "陳小設", role: "employee", dept: "設計課" },
  { id: "u04", name: "林小工", role: "employee", dept: "工程課" },
  { id: "u05", name: "張小生", role: "employee", dept: "生產課" },
  { id: "u06", name: "吳小資", role: "employee", dept: "資材課" },
  { id: "u07", name: "周小管", role: "employee", dept: "生管課" },
  { id: "u08", name: "黃小品", role: "employee", dept: "品管課" },
  { id: "u09", name: "趙小庶", role: "employee", dept: "庶務課" },
  { id: "u10", name: "劉小財", role: "employee", dept: "財會課" }
];

const OKR_STANDARD = {
  objectivesMin: 1,
  objectivesMax: 5,
  keyResultsMin: 1,
  keyResultsMax: 5
};

const els = {
  loginSection: document.querySelector("#loginSection"),
  appSection: document.querySelector("#appSection"),
  loginUser: document.querySelector("#loginUser"),
  activeYear: document.querySelector("#activeYear"),
  loginBtn: document.querySelector("#loginBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  welcome: document.querySelector("#welcome"),
  employeeSelect: document.querySelector("#employeeSelect"),
  yearSelect: document.querySelector("#yearSelect"),
  loadPrevBtn: document.querySelector("#loadPrevBtn"),
  addObjectiveBtn: document.querySelector("#addObjectiveBtn"),
  saveOkrBtn: document.querySelector("#saveOkrBtn"),
  okrEditor: document.querySelector("#okrEditor"),
  selfReview: document.querySelector("#selfReview"),
  reportYear: document.querySelector("#reportYear"),
  reportDepartment: document.querySelector("#reportDepartment"),
  generateReportBtn: document.querySelector("#generateReportBtn"),
  reportArea: document.querySelector("#reportArea"),
  objectiveTemplate: document.querySelector("#objectiveTemplate"),
  krTemplate: document.querySelector("#krTemplate")
};

let currentUser = null;

function keyFor(year, employeeId) {
  return `okr:${year}:${employeeId}`;
}

function getData(year, employeeId) {
  const raw = localStorage.getItem(keyFor(year, employeeId));
  return raw ? JSON.parse(raw) : { objectives: [] };
}

function saveData(year, employeeId, data) {
  localStorage.setItem(keyFor(year, employeeId), JSON.stringify(data));
}

function getVisibleEmployees(user) {
  const emps = USERS.filter((u) => u.role === "employee");
  if (user.manages === "all") return emps;
  return emps.filter((e) => user.manages.includes(e.dept));
}

function initLogins() {
  USERS.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = `${u.name} (${u.dept})`;
    els.loginUser.appendChild(opt);
  });

  ["全部部門", ...Object.keys(ORG).filter((k) => k !== "總經理")].forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    els.reportDepartment.appendChild(opt);
  });
}

function createKr(data = { title: "", target: "" }) {
  const node = els.krTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".kr-title").value = data.title || "";
  node.querySelector(".kr-target").value = data.target || "";
  node.querySelector(".remove-kr-btn").addEventListener("click", () => node.remove());
  return node;
}

function createObjective(data = { title: "", desc: "", krs: [] }) {
  const node = els.objectiveTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".objective-title").value = data.title || "";
  node.querySelector(".objective-desc").value = data.desc || "";
  const krList = node.querySelector(".kr-list");

  const existing = data.krs?.length ? data.krs : [{ title: "", target: "" }];
  existing.forEach((kr) => krList.appendChild(createKr(kr)));

  node.querySelector(".add-kr-btn").addEventListener("click", () => {
    if (krList.children.length >= OKR_STANDARD.keyResultsMax) {
      alert("每個 Objective 最多 5 個 KR。");
      return;
    }
    krList.appendChild(createKr());
  });

  node.querySelector(".remove-objective-btn").addEventListener("click", () => node.remove());
  return node;
}

function renderEditor() {
  const employeeId = els.employeeSelect.value;
  const year = Number(els.yearSelect.value);
  const data = getData(year, employeeId);
  els.okrEditor.innerHTML = "";

  if (!data.objectives.length) {
    els.okrEditor.appendChild(createObjective());
  } else {
    data.objectives.forEach((obj) => els.okrEditor.appendChild(createObjective(obj)));
  }
  renderSelfReview();
}

function collectEditorData() {
  const objectiveNodes = [...els.okrEditor.querySelectorAll(".objective")];
  if (objectiveNodes.length < OKR_STANDARD.objectivesMin) {
    throw new Error("至少需要 1 個 Objective。");
  }
  if (objectiveNodes.length > OKR_STANDARD.objectivesMax) {
    throw new Error("每位同仁最多 5 個 Objective。");
  }

  const objectives = objectiveNodes.map((objNode, objIndex) => {
    const krs = [...objNode.querySelectorAll(".kr-item")].map((krNode) => ({
      title: krNode.querySelector(".kr-title").value.trim(),
      target: krNode.querySelector(".kr-target").value.trim(),
      progress: 0,
      comments: []
    }));

    if (krs.length < OKR_STANDARD.keyResultsMin || krs.length > OKR_STANDARD.keyResultsMax) {
      throw new Error(`Objective ${objIndex + 1} 的 KR 數量需介於 1 到 5。`);
    }

    return {
      title: objNode.querySelector(".objective-title").value.trim(),
      desc: objNode.querySelector(".objective-desc").value.trim(),
      krs
    };
  });

  return { objectives };
}

function renderSelfReview() {
  const employeeId = els.employeeSelect.value;
  const year = Number(els.yearSelect.value);
  const employee = USERS.find((u) => u.id === employeeId);
  const data = getData(year, employeeId);

  if (!data.objectives.length) {
    els.selfReview.innerHTML = '<p class="muted">尚未有 OKR 資料。</p>';
    return;
  }

  const rows = [];
  data.objectives.forEach((obj, oi) => {
    obj.krs.forEach((kr, ki) => {
      const commentsHtml = (kr.comments || []).map((c) => `<li>${c}</li>`).join("");
      rows.push(`
        <div class="objective">
          <h4>${oi + 1}. ${obj.title || "(未命名 Objective)"}</h4>
          <p><strong>KR:</strong> ${kr.title || "(未命名 KR)"} / 目標: ${kr.target || "-"}</p>
          <label>完成比例（%）
            <input data-oi="${oi}" data-ki="${ki}" class="progress-input" type="number" min="0" max="100" value="${Number(kr.progress || 0)}" />
          </label>
          <label>新增檢核留言
            <textarea data-oi="${oi}" data-ki="${ki}" class="comment-input" rows="2" placeholder="例如：Q2 達標 45%，主要瓶頸為供應延遲"></textarea>
          </label>
          <button type="button" data-oi="${oi}" data-ki="${ki}" class="add-comment-btn secondary">加入留言</button>
          <ul>${commentsHtml || "<li class='muted'>尚無留言</li>"}</ul>
        </div>
      `);
    });
  });

  els.selfReview.innerHTML = `
    <p><strong>同仁：</strong>${employee.name}（${employee.dept}） / <strong>年度：</strong>${year}</p>
    ${rows.join("")}
    <button id="saveReviewBtn">儲存自評資料</button>
  `;

  els.selfReview.querySelector("#saveReviewBtn").addEventListener("click", () => {
    const latest = getData(year, employeeId);
    els.selfReview.querySelectorAll(".progress-input").forEach((input) => {
      const oi = Number(input.dataset.oi);
      const ki = Number(input.dataset.ki);
      latest.objectives[oi].krs[ki].progress = Math.max(0, Math.min(100, Number(input.value || 0)));
    });
    saveData(year, employeeId, latest);
    alert("自評完成比例已儲存。");
    renderSelfReview();
  });

  els.selfReview.querySelectorAll(".add-comment-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const oi = Number(btn.dataset.oi);
      const ki = Number(btn.dataset.ki);
      const textarea = els.selfReview.querySelector(`.comment-input[data-oi='${oi}'][data-ki='${ki}']`);
      const text = textarea.value.trim();
      if (!text) return;
      const latest = getData(year, employeeId);
      latest.objectives[oi].krs[ki].comments = latest.objectives[oi].krs[ki].comments || [];
      latest.objectives[oi].krs[ki].comments.push(`${new Date().toLocaleDateString()}：${text}`);
      saveData(year, employeeId, latest);
      renderSelfReview();
    });
  });
}

function generateReport() {
  const year = Number(els.reportYear.value);
  const deptFilter = els.reportDepartment.value;
  const employees = USERS.filter((u) => u.role === "employee")
    .filter((u) => deptFilter === "全部部門" || u.dept.includes(deptFilter) || getParentDept(u.dept) === deptFilter);

  const records = employees.map((emp) => {
    const data = getData(year, emp.id);
    let total = 0;
    let count = 0;
    data.objectives.forEach((o) => o.krs.forEach((k) => {
      total += Number(k.progress || 0);
      count += 1;
    }));
    const avg = count ? total / count : 0;
    return { emp, avg, count };
  });

  const tableRows = records.map((r) => {
    const level = r.avg >= 80 ? "good" : r.avg >= 60 ? "mid" : "bad";
    const label = r.avg >= 80 ? "達標" : r.avg >= 60 ? "需改善" : "未達標";
    return `<tr><td>${r.emp.name}</td><td>${r.emp.dept}</td><td>${r.count}</td><td>${r.avg.toFixed(1)}%</td><td><span class="pill ${level}">${label}</span></td></tr>`;
  }).join("");

  const overall = records.length ? records.reduce((a, b) => a + b.avg, 0) / records.length : 0;

  els.reportArea.innerHTML = `
    <p><strong>${year} 年度平均達標率：</strong>${overall.toFixed(1)}%</p>
    <table class="table">
      <thead><tr><th>同仁</th><th>部門</th><th>KR 數量</th><th>達成率</th><th>判定</th></tr></thead>
      <tbody>${tableRows || "<tr><td colspan='5'>無資料</td></tr>"}</tbody>
    </table>
  `;
}

function getParentDept(team) {
  return Object.entries(ORG).find(([, arr]) => arr.includes(team))?.[0] || "";
}

els.loginBtn.addEventListener("click", () => {
  const user = USERS.find((u) => u.id === els.loginUser.value);
  if (!user) return;
  currentUser = user;
  els.loginSection.classList.add("hidden");
  els.appSection.classList.remove("hidden");
  els.welcome.textContent = `${user.name} 已登入（${user.dept}）`;

  const targetYear = Math.max(2026, Number(els.activeYear.value || 2026));
  els.yearSelect.value = targetYear;
  els.reportYear.value = targetYear;

  const visibleEmployees = getVisibleEmployees(user);
  els.employeeSelect.innerHTML = "";
  visibleEmployees.forEach((emp) => {
    const opt = document.createElement("option");
    opt.value = emp.id;
    opt.textContent = `${emp.name} (${emp.dept})`;
    els.employeeSelect.appendChild(opt);
  });
  renderEditor();
});

els.logoutBtn.addEventListener("click", () => {
  currentUser = null;
  els.loginSection.classList.remove("hidden");
  els.appSection.classList.add("hidden");
});

els.employeeSelect.addEventListener("change", renderEditor);
els.yearSelect.addEventListener("change", renderEditor);

els.addObjectiveBtn.addEventListener("click", () => {
  const count = els.okrEditor.querySelectorAll(".objective").length;
  if (count >= OKR_STANDARD.objectivesMax) {
    alert("每位同仁最多 5 個 Objective。");
    return;
  }
  els.okrEditor.appendChild(createObjective());
});

els.saveOkrBtn.addEventListener("click", () => {
  const year = Number(els.yearSelect.value);
  const employeeId = els.employeeSelect.value;
  try {
    const prev = getData(year, employeeId);
    const next = collectEditorData();

    // 保留已存在 KR 的 progress/comments（避免主管調整文字時清掉自評）
    next.objectives.forEach((obj, oi) => {
      obj.krs.forEach((kr, ki) => {
        const existing = prev.objectives?.[oi]?.krs?.[ki];
        kr.progress = existing?.progress ?? 0;
        kr.comments = existing?.comments ?? [];
      });
    });

    saveData(year, employeeId, next);
    alert("OKR 已儲存。");
    renderSelfReview();
  } catch (err) {
    alert(err.message);
  }
});

els.loadPrevBtn.addEventListener("click", () => {
  const year = Number(els.yearSelect.value);
  if (year <= 2026) {
    alert("2026 為起始年度，無前一年可帶入。");
    return;
  }
  const employeeId = els.employeeSelect.value;
  const prev = getData(year - 1, employeeId);
  if (!prev.objectives.length) {
    alert("前一年無 OKR，可手動建立。");
    return;
  }
  const cloned = JSON.parse(JSON.stringify(prev));
  cloned.objectives.forEach((o) => o.krs.forEach((k) => {
    k.progress = 0;
    k.comments = [];
  }));
  saveData(year, employeeId, cloned);
  renderEditor();
  alert(`已帶入 ${year - 1} 年資料至 ${year} 年。`);
});

els.generateReportBtn.addEventListener("click", generateReport);

initLogins();
