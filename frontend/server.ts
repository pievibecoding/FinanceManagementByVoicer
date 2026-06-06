import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const FLASK_URL = process.env.FLASK_BACKEND_URL || "http://localhost:5000";

  // ── Auth proxy routes (avoids CORS issues by routing through Express) ──────
  const proxyToFlask = async (req: any, res: any, flaskPath: string) => {
    try {
      const flaskRes = await fetch(`${FLASK_URL}${flaskPath}`, {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.authorization ? { "Authorization": req.headers.authorization } : {}),
        },
        body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
      });
      const text = await flaskRes.text();
      try {
        res.status(flaskRes.status).json(JSON.parse(text));
      } catch {
        res.status(flaskRes.status).json({ error: `Flask error: ${text.substring(0, 200)}` });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Flask unreachable" });
    }
  };

  app.post("/api/auth/register", (req, res) => proxyToFlask(req, res, "/api/auth/register"));
  app.post("/api/auth/login",    (req, res) => proxyToFlask(req, res, "/api/auth/login"));
  app.post("/api/auth/google",   (req, res) => proxyToFlask(req, res, "/api/auth/google"));
  app.post("/api/auth/logout",   (req, res) => proxyToFlask(req, res, "/api/auth/logout"));
  app.get("/api/auth/me",        (req, res) => proxyToFlask(req, res, "/api/auth/me"));

  // API router for Gemini Transaction Parsing
  app.post("/api/parse-transaction", async (req, res) => {
    try {
      const { prompt, localTime } = req.body;
      // Forward auth token from frontend to Flask
      const authHeader = req.headers.authorization || "";
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
      });

      // Fetch live account list from Flask so Gemini always knows current accounts
      let accountList: Array<{ account_id: number; account_name: string; account_type: string }> = [];
      try {
        const accRes = await fetch(`${FLASK_URL}/api/accounts`, {
          headers: { "Authorization": authHeader },
        });
        accountList = await accRes.json();
      } catch {
        accountList = []; // Can't resolve IDs offline — transactions will be skipped
      }

      // Fetch user's payee list so Gemini can match known merchants
      let payeeList: Array<{ payee_id: number; payee_name: string; default_category_id: number | null }> = [];
      try {
        const payeeRes = await fetch(`${FLASK_URL}/api/payees`, {
          headers: { "Authorization": authHeader },
        });
        payeeList = await payeeRes.json();
      } catch {
        payeeList = [];
      }

      const payeeContext = payeeList.length > 0
        ? payeeList.map(p => `"${p.payee_name}"`).join(", ")
        : "none";

      const accountNames = accountList.map(a => a.account_name);

      const systemInstruction = `
You are an expert Vietnamese personal finance assistant.
Your job is to read a conversational natural language sentence about an income, expense, or investment transaction and parse it into a structured JSON database entry.
Ensure you convert any financial slang or abbreviations typical in Vietnamese:
- "k", "kđ", "ngàn", "nghìn" represent thousands (e.g. 50k = 50000, 45 ngàn = 45000).
- "loét", "lít" represent 100,000 VND (e.g. 1 loét = 100000).
- "xị" represents 100,000 VND (e.g. 2 xị = 200000, 1 xị = 100000).
- "củ" represents million VND (e.g. 3 củ = 3000000, nửa củ = 500000).
- "tỏi" represents billion VND (e.g. 1 tỏi = 1000000000).
- Account names should correspond to source accounts in Vietnamese, specifically match from [${accountNames.map(n => `'${n}'`).join(", ")}]. If the user mentions an account NOT in this list, use the exact name they said (e.g. "Ngân hàng OCB") and set account_is_new to TRUE. If matched, set account_is_new to FALSE.
- Category names must follow consistent financial categories, specifically match from: ['Ăn uống', 'Tiền lương', 'Đầu tư chứng khoán', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Học tập', 'Sức khỏe', 'Khác'].

Standard output schema properties:
- valid: boolean. Set to TRUE only if the input clearly describes a financial transaction (income, expense, or investment). Set to FALSE if the input is a question, greeting, unrelated conversation, or anything that is not a financial transaction.
- rejection_reason: string. If valid is FALSE, briefly explain in Vietnamese why it was rejected (e.g. "Câu hỏi không liên quan đến tài chính"). If valid is TRUE, leave this as empty string "".
- amount: integer, absolute positive value of the transaction (e.g. 45000). Never negative. Use 0 if valid is FALSE.
- type: string, representing the flow type. Must be 'income' (thu nhập, nhận lương, thưởng, lãi), 'expense' (chi tiêu, ăn uống, sắm đồ, trả tiền nước, xăng xe, di chuyển, giải trí), or 'investment' (tiết kiệm, đầu tư, nạp tài khoản VPS, mua cổ phiếu, chứng khoán).
- category: string, matched category.
- account: string, matched account.
- note: string, short brief description in Vietnamese (e.g. "ăn cơm sườn", "mua sách học lập trình", "nhận tiền lương tháng", "đầu tư cổ phiếu FPT").
- transaction_date: string, representing date/time of the transaction. Use the current local time '${localTime || '2026-06-03 11:15:29'}' as the base referential today, and look for relative descriptors like "hôm qua", "hôm nay", "sáng nay", "chiều qua". Extract exact hour/minute if provided (e.g., "Lúc 13h" => 13:00:00). Format of output MUST be 'YYYY-MM-DD HH:MM:SS'.

Known payees for this user: [${payeeContext}].
If the merchant or recipient in the transaction matches one of the known payees exactly or closely, set payee_name to the exact name from the list.
If no match, set payee_name to empty string "".

Return ONLY valid JSON.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              valid: { type: Type.BOOLEAN, description: "TRUE nếu là giao dịch tài chính, FALSE nếu không phải" },
              rejection_reason: { type: Type.STRING, description: "Lý do từ chối nếu valid=FALSE, để trống nếu valid=TRUE" },
              amount: { type: Type.INTEGER, description: "Số tiền giao dịch dương (VND), 0 nếu không hợp lệ" },
              type: { type: Type.STRING, description: "Loại giao dịch: 'income', 'expense' hoặc 'investment'" },
              category: { type: Type.STRING, description: "Danh mục thu chi phù hợp" },
              account: { type: Type.STRING, description: "Tài khoản giao dịch — dùng tên chính xác từ danh sách hoặc tên người dùng nói nếu chưa có" },
              account_is_new: { type: Type.BOOLEAN, description: "TRUE nếu tài khoản chưa có trong danh sách" },
              note: { type: Type.STRING, description: "Ghi chú ngắn ngọn bằng tiếng Việt" },
              transaction_date: { type: Type.STRING, description: "Ngày giờ định dạng YYYY-MM-DD HH:MM:SS" },
              payee_name: { type: Type.STRING, description: "Tên payee từ danh sách known payees, để trống nếu không khớp" }
            },
            required: ["valid", "rejection_reason", "amount", "type", "category", "account", "account_is_new", "note", "transaction_date", "payee_name"]
          }
        },
      });

      const resultText = response.text?.trim() || "{}";
      const parsedData = JSON.parse(resultText);

      // If Gemini flagged this as not a financial transaction, return early without saving
      if (parsedData.valid === false) {
        return res.status(422).json({ error: parsedData.rejection_reason || "Nội dung không phải giao dịch tài chính." });
      }

      // Map account names → integer IDs for Flask backend
      const ACCOUNT_NAME_TO_ID: Record<string, number> = {};
      for (const a of accountList) {
        ACCOUNT_NAME_TO_ID[a.account_name] = a.account_id;
      }

      // Fetch user's category list so we resolve to their actual integer IDs
      let categoryList: Array<{ category_id: number; category_name: string }> = [];
      try {
        const catRes = await fetch(`${FLASK_URL}/api/categories`, {
          headers: { "Authorization": authHeader },
        });
        categoryList = await catRes.json();
      } catch {
        categoryList = [];
      }

      // Build name → integer ID map from the user's actual categories
      const CATEGORY_NAME_TO_ID: Record<string, number> = {};
      for (const c of categoryList) {
        CATEGORY_NAME_TO_ID[c.category_name] = c.category_id;
      }

      // If Gemini detected a new account, create it in DB first
      let resolvedAccountId: number | null = ACCOUNT_NAME_TO_ID[parsedData.account] ?? null;
      if (parsedData.account_is_new && parsedData.account) {
        const createRes = await fetch(`${FLASK_URL}/api/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": authHeader },
          body: JSON.stringify({
            account_name: parsedData.account,
            account_type: "Bank",
            initial_balance: 0,
          }),
        });
        const createData = await createRes.json();
        resolvedAccountId = createData.account_id ?? resolvedAccountId;
      }

      // Fall back to first available account if still unresolved
      if (!resolvedAccountId && accountList.length > 0) {
        resolvedAccountId = accountList[0].account_id;
      }

      // Resolve category name → integer category_id
      const geminiCategory = parsedData.category as string;
      const resolvedCategoryId: number | null =
        CATEGORY_NAME_TO_ID[geminiCategory] ??
        (categoryList.length > 0 ? categoryList[categoryList.length - 1].category_id : null); // last = "Khác"

      // Resolve payee_name → payee_id, auto-create if it's a new named payee
      let resolvedPayeeId: number | null = null;
      const incomingPayeeName = (parsedData.payee_name || "").trim();
      if (incomingPayeeName) {
        const matchedPayee = payeeList.find(
          p => p.payee_name.toLowerCase() === incomingPayeeName.toLowerCase()
        );
        if (matchedPayee) {
          resolvedPayeeId = matchedPayee.payee_id;
        } else {
          // Auto-create the new payee so it appears in future lookups
          try {
            const payeeRes = await fetch(`${FLASK_URL}/api/payees`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": authHeader },
              body: JSON.stringify({ payee_name: incomingPayeeName }),
            });
            const payeeData = await payeeRes.json();
            resolvedPayeeId = payeeData.payee_id ?? null;
          } catch {
            // Non-fatal: transaction still saves without payee link
          }
        }
      }

      // Persist to Turso via Flask backend
      await fetch(`${FLASK_URL}/api/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": authHeader },
          body: JSON.stringify({
            transaction_date: parsedData.transaction_date || localTime,
            account_id: resolvedAccountId,
            category_id: resolvedCategoryId,
            amount: parsedData.amount,
            type: parsedData.type,
            note: parsedData.note,
            payee_id: resolvedPayeeId,
          }),
        });

      res.json(parsedData);
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      res.status(500).json({ error: error.message || "Failed to parse transaction using AI" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
