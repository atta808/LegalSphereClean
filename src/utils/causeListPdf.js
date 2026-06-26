import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// 🔥 Helper to format date safely
const formatDate = (date) => {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
};

// 🏷️ Helper to get client name
const getClientName = (item) => {
  return item.clientName || item.client?.name || "-";
};

export const exportCauseListPdf = async (hearings, title = "Cause List") => {
  try {
    if (!hearings || hearings.length === 0) return;

    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const totalCases = hearings.length;

    const rows = hearings
      .map(
        (h, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${formatDate(h.previousDate || h.nextHearingISO)}</td>
          <td>${h.title || "-"}</td>
          <td>${h.caseNo || "-"}</td>
          <td>${getClientName(h)}</td>
          <td>${h.court || "-"}</td>
          <td>${h.judge || "-"}</td>
          <td>${h.stage || "-"}</td>
          <td>${h.description || h.proceeding || "-"}</td>
          <td>${formatDate(h.nextHearingISO)}</td>
        </tr>
      `,
      )
      .join("");

    const html = `
      <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Times New Roman', Times, serif;
            padding: 30px;
            color: #1E293B;
            background: #FFFFFF;
          }

          .header {
            text-align: center;
            border-bottom: 3px double #1E3A8A;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }

          .header h1 {
            font-size: 24px;
            color: #1E3A8A;
            letter-spacing: 1px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .header .sub {
            font-size: 14px;
            color: #475569;
            margin-top: 4px;
            font-weight: 600;
          }

          .header .date {
            font-size: 12px;
            color: #64748B;
            margin-top: 2px;
          }

          .summary {
            display: flex;
            justify-content: space-between;
            background: #F8FAFC;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border: 1px solid #E2E8F0;
            font-size: 13px;
          }

          .summary span {
            font-weight: 700;
            color: #1E3A8A;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          th {
            background: #1E3A8A;
            color: white;
            font-weight: 700;
            padding: 10px 6px;
            text-align: left;
            border: 1px solid #1E3A8A;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }

          td {
            border: 1px solid #E2E8F0;
            padding: 8px 6px;
            vertical-align: top;
          }

          tr:nth-child(even) {
            background-color: #F8FAFC;
          }

          tr:hover {
            background-color: #EFF6FF;
          }

          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #94A3B8;
            border-top: 1px solid #E2E8F0;
            padding-top: 15px;
          }

          .footer .lawyer-name {
            color: #1E3A8A;
            font-weight: 700;
          }

          @media print {
            body { padding: 15px; }
            th { background: #1E3A8A !important; color: white !important; }
            .no-print { display: none; }
          }
        </style>
      </head>

      <body>

        <div class="header">
          <h1>${title}</h1>
          <div class="sub">Chamber Diary – Cause List</div>
          <div class="date">Generated on: ${today}</div>
        </div>

        <div class="summary">
          <div>📋 <span>${totalCases}</span> Hearing(s) Scheduled</div>
          <div>⚖️ Advocate: <span>${"Your Name"}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Case Title</th>
              <th>Case No</th>
              <th>Client</th>
              <th>Court</th>
              <th>Judge</th>
              <th>Stage</th>
              <th>Proceeding</th>
              <th>Next Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="footer">
          <p>
            This is a computer-generated cause list for the use of the advocate.
            <br>
            <span class="lawyer-name">LegalSphere ⚖️</span> – AI-Powered Legal Practice Management
          </p>
        </div>

      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    await Sharing.shareAsync(uri);
  } catch (error) {
    console.log("❌ PDF Error:", error);
  }
};
