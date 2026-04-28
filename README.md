# 全公司 OKR 追蹤系統（簡易版）

此系統為純前端（HTML/CSS/JavaScript）範例，可快速展示：

- 依組織架構由主管登入並管理可見同仁。
- OKR 標準：每人每年 1~5 個 Objective，每個 Objective 1~5 個 KR。
- 支援 2026 年起的跨年度追蹤。
- 可將前一年 OKR 一鍵帶入新年度（進度與留言重置）。
- 同仁可填寫每個 KR 的完成比例與檢核留言。
- 年底可做年度達標率統計（全部部門/指定部門）。

## 執行方式

直接用瀏覽器開啟 `index.html` 即可。

若需要本機伺服器（避免瀏覽器某些限制）：

```bash
python3 -m http.server 8000
```

再開啟 `http://localhost:8000`。

## 資料儲存

- 使用瀏覽器 `localStorage` 儲存。
- 鍵值格式：`okr:{year}:{employeeId}`。
