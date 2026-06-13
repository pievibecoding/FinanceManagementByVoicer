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
    console.log(`Proxying ${req.method} ${flaskPath} to ${FLASK_URL}`);
    try {
      // DELETE requests must not send a body — some servers reject DELETE+body
      const hasBody = req.method !== "GET" && req.method !== "DELETE";
      const flaskRes = await fetch(`${FLASK_URL}${flaskPath}`, {
        method: req.method,
        headers: {
          ...(hasBody ? { "Content-Type": "application/json" } : {}),
          ...(req.headers.authorization ? { "Authorization": req.headers.authorization } : {}),
        },
        body: hasBody ? JSON.stringify(req.body) : undefined,
      });
      console.log(`Flask response status: ${flaskRes.status}`);
      const text = await flaskRes.text();
      console.log(`Flask response text: ${text.substring(0, 500)}`);
      try {
        res.status(flaskRes.status).json(JSON.parse(text));
      } catch {
        res.status(flaskRes.status).json({ error: `Flask error: ${text.substring(0, 200)}` });
      }
    } catch (err: any) {
      console.error(`Proxy error: ${err.message}`);
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

      // Fetch user's savings goals so savings contributions can point to a real destination fund.
      let savingsList: Array<{ savings_id: number; name: string; status: string }> = [];
      try {
        const savingsRes = await fetch(`${FLASK_URL}/api/savings`, {
          headers: { "Authorization": authHeader },
        });
        savingsList = await savingsRes.json();
      } catch {
        savingsList = [];
      }

      const activeSavingsList = savingsList.filter(s => s.status === "active");
      const savingsContext = activeSavingsList.length > 0
        ? activeSavingsList.map(s => `"${s.name}"`).join(", ")
        : "none";

      const accountNames = accountList.map(a => a.account_name);

      const systemInstruction = `
You are an expert Vietnamese personal finance assistant.
Your job is to read a conversational natural language sentence about an income, expense, debt payment, savings contribution, or investment-related expense and parse it into a structured JSON database entry.
Ensure you convert any financial slang or abbreviations typical in Vietnamese:
- "k", "kđ", "ngàn", "nghìn" represent thousands (e.g. 50k = 50000, 45 ngàn = 45000).
- "loét", "lít" represent 100,000 VND (e.g. 1 loét = 100000).
- "xị" represents 100,000 VND (e.g. 2 xị = 200000, 1 xị = 100000).
- "củ" represents million VND (e.g. 3 củ = 3000000, nửa củ = 500000).
- "tỏi" represents billion VND (e.g. 1 tỏi = 1000000000).
- Account names should correspond to cash/bank/wallet accounts in Vietnamese, specifically match from [${accountNames.map(n => `'${n}'`).join(", ")}]. If the user mentions an account NOT in this list, use the exact name they said (e.g. "Ngân hàng OCB") and set account_is_new to TRUE. If matched, set account_is_new to FALSE.
- Savings goal names should correspond to existing destination funds, specifically match from [${activeSavingsList.map(s => `'${s.name}'`).join(", ")}]. For savings_contribution, savings_name must be the destination fund money goes into, not a generic label like "tiết kiệm" when a more specific fund is mentioned.
- For any operation that moves money through a cash/bank/wallet account, always fill account with that account:
  * Expense: account is the source account money leaves from.
  * Income: account is the destination account money enters.
  * Savings contribution: account is the source account money leaves from, e.g. "từ OCB sang quỹ mua xe" => account = "OCB".
  * New debt when the user borrows money: account is the destination account money enters, e.g. "tôi vay Hiền 500k vào tiền mặt" => account = "Tiền mặt".
  * New loan when the user lends money: account is the source account money leaves from, e.g. "cho Nam mượn 1 củ từ VCB" => account = "VCB".
  * Debt payment: if the user pays debt, account is the source account; if someone pays the user back, account is the destination account.
  * If the user does not mention a cash/bank/wallet account for these operations, leave account empty and account_is_new FALSE so the UI can require manual account selection.
- Category names must follow consistent financial categories, specifically match from: ['Ăn uống', 'Tiền lương', 'Di chuyển', 'Mua sắm', 'Giải trí', 'Học tập', 'Sức khỏe', 'Khác']. For investment-related spending, use category 'Khác' and type 'expense'.

Special operations (set operation_type to one of these when detected):
- Debt payment: CRITICAL — ANY sentence where money is being paid/returned in context of a debt, regardless of who is doing the paying:
  * "tôi trả nợ [X]", "tôi trả [X]", "trả tiền cho [X]", "thanh toán khoản vay", "góp", "trả góp" → operation_type = "debt_payment", lender = X
  * "[X] trả nợ cho tôi", "[X] trả lại cho tôi", "[X] hoàn tiền", "[X] thanh toán cho tôi" → ALSO operation_type = "debt_payment" (this is someone paying back their debt to the user, NOT income), lender = Tôi, debtor = X
  * Key rule: If the sentence contains "trả nợ", "trả lại", "hoàn trả", "thanh toán nợ" — it is ALWAYS debt_payment, never income or expense.
- Savings contribution: "gửi tiết kiệm", "đặt quỹ", "nạp vào quỹ", "thêm vào mục tiêu", "gửi vào tài khoản tiết kiệm" → operation_type = "savings_contribution"
- New debt: "vay", "nợ", "khoản vay mới", "thẻ tín dụng mới", "vay tiền" → operation_type = "new_debt"
- New savings goal: "mục tiêu tiết kiệm mới", "tạo quỹ mới", "đặt mục tiêu mới" → operation_type = "new_savings"

Debt type logic for new_debt operations:
- If the user borrows money from someone (e.g., "tôi vay Hiền 100k", "mượn Lan 500k"), set debt_type = "debt", debtor = "Tôi" (or the user's name), lender = the person's name
- If someone borrows money from the user (e.g., "Hiền vay tôi 100k", "cho Lan mượn 500k"), set debt_type = "loan", lender = "Tôi" (or the user's name), debtor = the person's name
- debt_type must be either "debt" (user owes money) or "loan" (user is owed money)

Standard output schema properties:
- valid: boolean. Set to TRUE only if the input clearly describes a financial transaction or operation (income, expense, investment-related expense, debt payment, savings contribution, new debt, new savings goal). Set to FALSE if the input is a question, greeting, unrelated conversation, or anything that is not a financial operation.
- rejection_reason: string. If valid is FALSE, briefly explain in Vietnamese why it was rejected (e.g. "Câu hỏi không liên quan đến tài chính"). If valid is TRUE, leave this as empty string "".
- operation_type: string, the type of operation. Must be 'transaction' (default), 'debt_payment', 'savings_contribution', 'new_debt', or 'new_savings'.
- amount: integer, absolute positive value of the transaction or payment (e.g. 45000). Never negative. Use 0 if valid is FALSE.
- type: string, representing the flow type for transactions. Must be 'income' (thu nhập, nhận lương, thưởng, lãi) or 'expense' (chi tiêu, ăn uống, sắm đồ, trả tiền nước, xăng xe, di chuyển, giải trí, tiết kiệm, đầu tư, nạp tài khoản VPS, mua cổ phiếu, chứng khoán). Leave empty for non-transaction operations. Never return 'investment' as a transaction type; use type 'expense' with an investment-related category instead.
- category: string, matched category for transactions. Leave empty for non-transaction operations.
- account: string, matched account.
- note: string, short brief description in Vietnamese (e.g. "ăn cơm sườn", "mua sách học lập trình", "nhận tiền lương tháng", "đầu tư cổ phiếu FPT", "trả nợ xe máy", "gửi vào quỹ du lịch").
- transaction_date: string, representing date/time of the transaction or payment. Use the current local time '${localTime || '2026-06-03 11:15:29'}' as the base referential today, and look for relative descriptors like "hôm qua", "hôm nay", "sáng nay", "chiều qua". Extract exact hour/minute if provided (e.g., "Lúc 13h" => 13:00:00). Format of output MUST be 'YYYY-MM-DD HH:MM:SS'.
- location: string, extract location/venue if mentioned in the input (e.g. "tại Starbucks", "ở quán cà phê", "tại siêu thị", "ở Circle K"). If no location is mentioned, leave as empty string "".
- debt_name: string, name of the debt for debt_payment or new_debt operations (e.g. "vay mua xe", "thẻ tín dụng VPBank", "khoản vay mua nhà"). Leave empty for other operations.
- debt_type: string, type of debt for new_debt operations. Must be "debt" (user owes money) or "loan" (user is owed money). Leave empty for other operations.
- lender: string, name of the lender for new_debt operations (the person who lent the money). Leave empty for other operations.
- debtor: string, name of the debtor for new_debt operations (the person who owes the money). Leave empty for other operations.
- savings_name: string, name of the savings goal for savings_contribution or new_savings operations (e.g. "quỹ du lịch", "mục tiêu mua laptop", "tiết kiệm khẩn cấp"). Leave empty for other operations.
- target_amount: integer, target amount for new_savings operations. Leave empty for other operations.

Known payees for this user: [${payeeContext}].
Known active savings goals for this user: [${savingsContext}].
If the merchant or recipient in the transaction matches one of the known payees exactly or closely, set payee_name to the exact name from the list.
If no match, set payee_name to empty string "".

Return ONLY valid JSON.
`;

      const response = await ai.models.generateContent({
        // NOTE: model name "gemini-3.1-flash-lite" is intentional — do NOT change it.
        model: "gemini-3.1-flash-lite", //Never change this model
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              valid: { type: Type.BOOLEAN, description: "TRUE nếu là giao dịch tài chính hoặc thao tác tài chính, FALSE nếu không phải" },
              rejection_reason: { type: Type.STRING, description: "Lý do từ chối nếu valid=FALSE, để trống nếu valid=TRUE" },
              operation_type: { type: Type.STRING, description: "Loại thao tác: 'transaction', 'debt_payment', 'savings_contribution', 'new_debt', hoặc 'new_savings'" },
              amount: { type: Type.INTEGER, description: "Số tiền giao dịch dương (VND), 0 nếu không hợp lệ" },
              type: { type: Type.STRING, description: "Loại giao dịch: chỉ 'income' hoặc 'expense'. Để trống nếu không phải giao dịch. Không bao giờ trả về 'investment'." },
              category: { type: Type.STRING, description: "Danh mục thu chi phù hợp. Để trống nếu không phải giao dịch" },
              account: { type: Type.STRING, description: "Tài khoản giao dịch — dùng tên chính xác từ danh sách hoặc tên người dùng nói nếu chưa có" },
              account_is_new: { type: Type.BOOLEAN, description: "TRUE nếu tài khoản chưa có trong danh sách" },
              note: { type: Type.STRING, description: "Ghi chú ngắn ngọn bằng tiếng Việt" },
              transaction_date: { type: Type.STRING, description: "Ngày giờ định dạng YYYY-MM-DD HH:MM:SS" },
              payee_name: { type: Type.STRING, description: "Tên payee từ danh sách known payees, để trống nếu không khớp" },
              location: { type: Type.STRING, description: "Địa điểm giao dịch nếu được nhắc đến, để trống nếu không có" },
              debt_name: { type: Type.STRING, description: "Tên khoản nợ cho debt_payment hoặc new_debt. Để trống cho các thao tác khác" },
              debt_type: { type: Type.STRING, description: "Loại nợ cho new_debt: 'debt' (người dùng nợ tiền) hoặc 'loan' (người khác nợ người dùng). Để trống cho các thao tác khác" },
              lender: { type: Type.STRING, description: "Tên người cho vay cho new_debt (người cho tiền). Để trống cho các thao tác khác" },
              debtor: { type: Type.STRING, description: "Tên người vay nợ cho new_debt (người nợ tiền). Để trống cho các thao tác khác" },
              savings_name: { type: Type.STRING, description: "Tên mục tiêu tiết kiệm cho savings_contribution hoặc new_savings. Để trống cho các thao tác khác" },
              target_amount: { type: Type.INTEGER, description: "Số tiền mục tiêu cho new_savings. Để trống cho các thao tác khác" }
            },
            required: ["valid", "rejection_reason", "operation_type", "amount", "type", "category", "account", "account_is_new", "note", "transaction_date", "payee_name", "location", "debt_name", "debt_type", "lender", "debtor", "savings_name", "target_amount"]
          }
        },
      });

      const resultText = response.text?.trim() || "{}";
      const parsedData = JSON.parse(resultText);
      if (parsedData.type === "investment") {
        parsedData.type = "expense";
      }

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

      const resolvedAccountId: number | null = ACCOUNT_NAME_TO_ID[parsedData.account] ?? null;

      // Resolve category name → integer category_id
      const geminiCategory = parsedData.category as string;
      const resolvedCategoryId: number | null =
        CATEGORY_NAME_TO_ID[geminiCategory] ??
        (categoryList.length > 0 ? categoryList[categoryList.length - 1].category_id : null); // last = "Khác"

      // Resolve payee_name → payee_id. Parsing is draft-only, so do not auto-create payees here.
      let resolvedPayeeId: number | null = null;
      const incomingPayeeName = (parsedData.payee_name || "").trim();
      if (incomingPayeeName) {
        const matchedPayee = payeeList.find(
          p => p.payee_name.toLowerCase() === incomingPayeeName.toLowerCase()
        );
        if (matchedPayee) {
          resolvedPayeeId = matchedPayee.payee_id;
        }
      }

      parsedData.account_id = resolvedAccountId;
      parsedData.category_id = resolvedCategoryId;
      parsedData.payee_id = resolvedPayeeId;
      parsedData.savings_id = null;

      const incomingSavingsName = (parsedData.savings_name || "").trim().toLowerCase();
      if (incomingSavingsName && parsedData.operation_type === "savings_contribution") {
        const matchedSavings = activeSavingsList.find(s => {
          const name = s.name.toLowerCase();
          return name === incomingSavingsName ||
            name.includes(incomingSavingsName) ||
            incomingSavingsName.includes(name);
        });
        if (matchedSavings) {
          parsedData.savings_id = matchedSavings.savings_id;
          parsedData.savings_name = matchedSavings.name;
        }
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      res.status(500).json({ error: error.message || "Failed to parse transaction using AI" });
    }
  });

  // ── Generic proxy for all other /api/* routes → Flask ─────────────────────
  // Catches: /api/accounts, /api/transactions, /api/categories, /api/budgets,
  //          /api/payees, /api/recurring, /api/sql-query, etc.
  // Must be registered AFTER specific handlers (parse-transaction, auth) to avoid catching them.
  // NOTE: Express 5 uses /api/*path (named wildcard) instead of /api/*
  app.all("/api/*path", (req: any, res: any, next: any) => {
    // Skip proxying Vite module requests (e.g. /api/auth.ts, /api/dashboard.ts?t=...)
    // These are TypeScript source files that Vite needs to serve as ES modules.
    const urlPath = req.path;
    if (/\.(ts|tsx|js|jsx|json|css|svg|png|woff|woff2)$/.test(urlPath)) {
      return next();
    }
    // req.originalUrl preserves the full path + query string
    const flaskPath = req.originalUrl;
    proxyToFlask(req, res, flaskPath);
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
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
