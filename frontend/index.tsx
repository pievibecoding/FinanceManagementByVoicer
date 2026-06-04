import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  MessageSquare,
  Database,
  Terminal,
  BarChart3,
  Send,
  Mic,
  MicOff,
  RefreshCw,
  Trash2,
  Plus,
  Info,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  Sparkles,
  Code,
  Play,
  Flame,
  CheckCircle,
  HelpCircle,
  X,
  Volume2,
  LogOut,
  Calendar
} from 'lucide-react';
import { Account, Category, Transaction, SplitItem, ChatMessage, AnalyticsResult, Budget, Payee, RecurringTransaction } from './types';
import {
  initialAccounts,
  initialCategories,
  initialTransactions,
  formatCurrency,
  computeBalances,
  evaluateSQLQuery
} from './utils';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';

const FLASK_API = 'http://localhost:5000';

// Các tin nhắn gợi ý tiếng lóng tài chính Việt Nam giúp test trải nghiệm nhanh
const SLANG_SUGGESTIONS = [
  { text: "Lúc 12h ăn trưa hết 45 ngàn bằng ví momo", desc: "45k Ăn uống" },
  { text: "Vừa nhận lương dự án 12 củ vào ngân hàng VCB", desc: "12 triệu Tiền lương" },
  { text: "Nạp 500k vào Momo sắm quần áo tết", desc: "500k Mua sắm" },
  { text: "Mua khóa học tiếng Anh mất 2 loét trả tiền mặt", desc: "200k Học tập" },
  { text: "Đầu tư thêm 10 củ mua cổ phiếu FPT bằng tài khoản VPS", desc: "10 triệu Đầu tư" },
  { text: "Sáng nay đi xe ôm mất 15k", desc: "15k Grab/Be" }
];

function App() {
  const { user, token, logout } = useAuth();
  
  // Database State
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  // Budget State
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => new Date().toISOString().slice(0, 7)
  );
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Payees State
  const [payees, setPayees] = useState<Payee[]>([]);

  // Recurring State
  const [recurringRules, setRecurringRules] = useState<RecurringTransaction[]>([]);
  const [generatedCount, setGeneratedCount] = useState<number>(0);
  const [showRecurringForm, setShowRecurringForm] = useState<boolean>(false);

  // Helper to load only recurring rules
  const loadRecurring = () => {
    if (!token) return;
    fetch(`${FLASK_API}/api/recurring`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(recs => { if (Array.isArray(recs)) setRecurringRules(recs); })
      .catch(() => {});
  };

  // Helper to load transactions
  const loadTransactions = () => {
    if (!token) return;
    fetch(`${FLASK_API}/api/transactions`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(txs => { if (Array.isArray(txs) && txs.length) setTransactions(txs); })
      .catch(() => {});
  };

  // Load data from Flask backend on mount
  useEffect(() => {
    if (!token) return;
    
    // First run the process endpoint to automatically generate due recurring transactions
    fetch(`${FLASK_API}/api/recurring/process`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data && data.generated > 0) {
          setGeneratedCount(data.generated);
        }
      })
      .catch(err => console.error("Error auto-processing recurring rules:", err))
      .finally(() => {
        // Then load all dashboard/table data
        Promise.all([
          fetch(`${FLASK_API}/api/accounts`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${FLASK_API}/api/categories`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${FLASK_API}/api/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${FLASK_API}/api/budgets?month=${selectedMonth}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${FLASK_API}/api/payees`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${FLASK_API}/api/recurring`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        ]).then(([accs, cats, txs, bdgs, pyees, recs]) => {
          if (Array.isArray(accs) && accs.length) setAccounts(accs);
          if (Array.isArray(cats) && cats.length) setCategories(cats);
          if (Array.isArray(txs) && txs.length) setTransactions(txs);
          if (Array.isArray(bdgs)) setBudgets(bdgs);
          if (Array.isArray(pyees)) setPayees(pyees);
          if (Array.isArray(recs)) setRecurringRules(recs);
        }).catch((err) => {
          // 401 → logout
          if (err.message?.includes('401') || err.status === 401) {
            logout();
          }
        });
      });
  }, [token]);

  // Re-fetch budgets when selected month changes
  useEffect(() => {
    if (!token) return;
    fetch(`${FLASK_API}/api/budgets?month=${selectedMonth}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(bdgs => { if (Array.isArray(bdgs)) setBudgets(bdgs); })
      .catch(() => {});
  }, [selectedMonth, token]);

  // Chat/Voice State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Xin chào! Tôi là Trợ lý Tài chính Voicer AI. Bạn có thể nhắn tin hoặc nhấp giữ nút Mic để "nói" trực tiếp các giao dịch thu chi hàng ngày bằng ngôn ngữ tự nhiên tiếng Việt.',
      timestamp: Date.now() - 300000
    },
    {
      id: 'welcome-2',
      sender: 'assistant',
      text: `Hệ thống có thể tự động bóc tách từ các tiếng lóng như:\n- "45 ngàn", "30k", "50kđ"\n- "1 loét/lít" = 100.000đ\n- "nửa củ" = 500.000đ, "5 củ" = 5.000.000đ\n- "1 tỏi" = 1.000.000.000đ\n\nHãy thử chọn một phím gợi ý nhanh bên dưới hoặc viết câu của bạn để hệ thống tự động sinh dữ liệu SQL!`,
      timestamp: Date.now() - 240000
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [micInterim, setMicInterim] = useState<string>('');
  const [micError, setMicError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM Transaction_Fact');
  const [sqlResult, setSqlResult] = useState<AnalyticsResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Active UI Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tables' | 'sql' | 'instructions' | 'recurring'>('dashboard');
  const [showSqlAnimationId, setShowSqlAnimationId] = useState<string | null>(null);

  // Chat auto-scroll ref — only scroll when user/assistant adds new messages, not on initial load
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGenerating]);

  // Custom Transaction Manual Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualTx, setManualTx] = useState({
    amount: '',
    type: 'expense' as 'income' | 'expense' | 'investment',
    category_id: 'food',
    account_id: 'cash',
    note: '',
    payee_id: null as number | null
  });

  // Split mode state for manual modal
  const [splitMode, setSplitMode] = useState(false);
  const [splitItems, setSplitItems] = useState<Array<{category_id: string; amount: string; note: string}>>([]);

  // Expanded split row in transaction table
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Recurring Form state
  const [newRecurring, setNewRecurring] = useState({
    amount: '',
    type: 'expense' as 'income' | 'expense' | 'investment',
    category_id: 'food',
    account_id: 'cash',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    next_run_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    note: '',
    payee_id: null as number | null
  });

  // Calculate Balances derived from Live transactions state
  const computedAccounts = computeBalances(accounts, transactions);
  const totalAssets = computedAccounts.reduce((sum, a) => sum + a.current_balance, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalInvestment = transactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + t.amount, 0);

  // Run initial default query to populate sqlResult pane (local simulation for dashboard)
  useEffect(() => {
    try {
      const res = evaluateSQLQuery(sqlQuery, { accounts, categories, transactions, budgets });
      setSqlResult(res);
      setSqlError(null);
    } catch (err: any) {
      setSqlError(err.message || 'Lỗi truy vấn SQL');
    }
  }, [transactions, categories, accounts]);

  // Execute single SQL query on demand — calls Flask backend
  const handleExecuteSQL = async (queryToRun?: string) => {
    const targetQuery = queryToRun || sqlQuery;
    try {
      const res = await fetch(`${FLASK_API}/api/sql-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: targetQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi truy vấn SQL');
      setSqlResult({ headers: data.headers, rows: data.rows, type: 'custom', description: `Kết quả từ Turso DB: ${targetQuery.substring(0, 60)}...` });
      setSqlError(null);
    } catch (err: any) {
      setSqlResult(null);
      setSqlError(err.message || 'Lỗi kết nối backend');
    }
  };

  // Preset queries inside SQL console
  const runPresetQuery = (type: 'all' | 'group' | 'budget' | 'window') => {
    let query = '';
    if (type === 'all') {
      query = 'SELECT * FROM Transaction_Fact';
    } else if (type === 'group') {
      query = 'SELECT category_name, SUM(amount) AS total_spent_amount FROM Transaction_Fact JOIN Category_Dim GROUP BY category_name;';
    } else if (type === 'budget') {
      query = 'SELECT category_name, budget_limit, actual_spent, remaining_budget FROM Category_Dim LEFT JOIN Transaction_Fact;';
    } else if (type === 'window') {
      query = 'SELECT transaction_date, amount, type, SUM(amount) OVER (ORDER BY transaction_date) AS running_balance FROM Transaction_Fact;';
    }
    setSqlQuery(query);
    handleExecuteSQL(query);
  };

  // Convert natural language to transaction via Server-side Gemini API
  const handleProcessTransactionText = async (text: string) => {
    if (!text.trim() || isGenerating) return;

    setIsGenerating(true);

    // Append user message
    const userMsgId = 'msg-' + Date.now();
    setChatHistory(prev => [...prev, {
      id: userMsgId,
      sender: 'user',
      text: text,
      timestamp: Date.now()
    }]);

    try {
      const now = new Date();
      const localTimeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Call Express server-side LLM endpoint
      const response = await fetch('/api/parse-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          prompt: text,
          localTime: localTimeString
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (response.status === 422) {
          // Not a financial transaction — show gentle feedback, not an error
          setChatHistory(prev => [...prev, {
            id: 'assistant-' + Date.now(),
            sender: 'assistant',
            text: `💬 ${errBody.error || 'Câu nói này không phải giao dịch tài chính.'}\n\nHãy mô tả một khoản thu/chi/đầu tư, ví dụ: "Hôm nay mua trà sữa hết 40k tiền mặt"`,
            timestamp: Date.now()
          }]);
          return;
        }
        throw new Error(errBody.error || `Server error ${response.status}`);
      }

      const parsedJSON = await response.json();

      if (parsedJSON && parsedJSON.amount) {
        // Map account and category strings to internal state IDs
        let catId = 'other';
        const normCat = parsedJSON.category?.toLowerCase() || '';
        if (normCat.includes('ăn') || normCat.includes('food') || normCat.includes('uống') || normCat.includes('nhậu')) catId = 'food';
        else if (normCat.includes('lương') || normCat.includes('salary') || normCat.includes('thu nhập')) catId = 'salary';
        else if (normCat.includes('đầu tư') || normCat.includes('chứng') || normCat.includes('vps') || normCat.includes('cổ phiếu')) catId = 'investment';
        else if (normCat.includes('di chuyển') || normCat.includes('đi') || normCat.includes('xe') || normCat.includes('grab') || normCat.includes('be')) catId = 'transport';
        else if (normCat.includes('sắm') || normCat.includes('quần') || normCat.includes('shopping')) catId = 'shopping';
        else if (normCat.includes('trí') || normCat.includes('phim') || normCat.includes('cgv') || normCat.includes('game')) catId = 'entertainment';
        else if (normCat.includes('học') || normCat.includes('sách') || normCat.includes('study') || normCat.includes('english')) catId = 'study';
        else if (normCat.includes('khỏe') || normCat.includes('thuốc') || normCat.includes('sức') || normCat.includes('bệnh')) catId = 'health';

        let accId = 'cash';
        const normAcc = parsedJSON.account?.toLowerCase() || '';
        if (normAcc.includes('momo') || normAcc.includes('ví')) accId = 'momo';
        else if (normAcc.includes('vcb') || normAcc.includes('văn') || normAcc.includes('ngân hàng')) accId = 'vcb';
        else if (normAcc.includes('vps') || normAcc.includes('chứng khoán')) accId = 'vps';
        else if (normAcc.includes('tiền mặt') || normAcc.includes('cash')) accId = 'cash';

        const newId = 'tx-' + (transactions.length + 1).toString().padStart(3, '0');
        const newTx: Transaction = {
          transaction_id: newId,
          transaction_date: parsedJSON.transaction_date || localTimeString,
          account_id: accId,
          category_id: catId,
          amount: Number(parsedJSON.amount),
          type: parsedJSON.type as 'income' | 'expense' | 'investment',
          note: parsedJSON.note || text
        };

        // Formulate standard SQLite INSERT command to display
        const sqlCmd = `INSERT INTO Transaction_Fact (transaction_id, transaction_date, account_id, category_id, amount, type, note) \nVALUES ('${newTx.transaction_id}', '${newTx.transaction_date}', '${newTx.account_id}', '${newTx.category_id}', ${newTx.amount}, '${newTx.type}', '${newTx.note.replace(/'/g, "''")}');`;

        // Update database state
        setTransactions(prev => [...prev, newTx]);

        // Reload transactions from Turso to stay in sync
        fetch(`${FLASK_API}/api/transactions`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => r.json())
          .then(txs => { if (Array.isArray(txs) && txs.length) setTransactions(txs); })
          .catch(() => {});

        // If a new account was created, reload accounts list too
        if (parsedJSON.account_is_new) {
          fetch(`${FLASK_API}/api/accounts`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(accs => { if (Array.isArray(accs) && accs.length) setAccounts(accs); })
            .catch(() => {});
        }

        // Add assistant voice feedback message with formatted results
        const typeLabel = newTx.type === 'income' ? 'Thu nhập' : newTx.type === 'expense' ? 'Chi phí' : 'Đầu tư tiết kiệm';
        const newAccountNote = parsedJSON.account_is_new ? `\n🆕 **Tài khoản mới "${parsedJSON.account}" đã được tạo tự động trong hệ thống.**` : '';
        const feedbackText = `Đã nhận dạng thành công qua giọng nói/tin nhắn!\n\n🍀 **Khoản mục:** ${typeLabel}\n💰 **Số tiền:** ${formatCurrency(newTx.amount)}\n🏷️ **Danh mục:** ${parsedJSON.category || 'Chưa phân loại'}\n💳 **Quỹ tài khoản:** ${parsedJSON.account || 'Tiền mặt'}\n📝 **Nội dung:** ${newTx.note}\n📅 **Thời gian:** ${newTx.transaction_date}${newAccountNote}`;

        setChatHistory(prev => [...prev, {
          id: 'assistant-' + Date.now(),
          sender: 'assistant',
          text: feedbackText,
          timestamp: Date.now(),
          parsedTransaction: parsedJSON,
          sqlCommand: sqlCmd
        }]);

        // Trigger flash effect for update visual indicator
        setShowSqlAnimationId(newId);
        setTimeout(() => setShowSqlAnimationId(null), 1600);

      } else {
        throw new Error("Không thể bóc tách số tiền giao dịch từ câu nói này.");
      }
    } catch (error: any) {
      console.error(error);
      setChatHistory(prev => [...prev, {
        id: 'error-' + Date.now(),
        sender: 'assistant',
        text: `⚠️ **Có lỗi xảy ra:** ${error.message || 'Không thể kết nối dịch vụ bóc tách AI'}. Bạn vui lòng nhập lại hoặc cung cấp câu nói rõ ràng hơn nhé. (Ví dụ: "Hôm nay mua trà sữa hết 40k trả tiền mặt")`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Real Microphone voice input via Web Speech API
  const handleVoiceInputStart = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError('Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    // Toggle off if currently listening
    if (isMicListening) {
      recognitionRef.current?._stop?.();
      return;
    }

    setMicError(null);
    setMicInterim('');
    setIsMicListening(true);  // show overlay immediately on click

    const startInstance = (): any => {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        if (interim) setMicInterim(interim);
        if (final) {
          // Final result received — close popup and send to Gemini
          recognitionRef.current = null;
          recognition.stop();
          setMicInterim('');
          setIsMicListening(false);
          handleProcessTransactionText(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          recognitionRef.current = null;
          setIsMicListening(false);
          setMicInterim('');
          setMicError('Không có quyền truy cập microphone. Hãy cho phép trong cài đặt trình duyệt.');
        }
        // no-speech / aborted: non-fatal, onend will restart
      };

      recognition.onend = () => {
        // If this instance is still the active one (user hasn't stopped), restart
        if (recognitionRef.current === recognition) {
          const next = startInstance();
          recognitionRef.current = next;
        }
      };

      (recognition as any)._stop = () => {
        recognitionRef.current = null;
        recognition.stop();
        setIsMicListening(false);
        setMicInterim('');
      };

      try { recognition.start(); } catch { /* ignore */ }
      return recognition;
    };

    recognitionRef.current = startInstance();
  };

  // Handles custom manual transaction insertion
  const handleInsertManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTx.amount || isNaN(Number(manualTx.amount))) return;

    // Validate split mode
    if (splitMode && splitItems.length > 0) {
      const splitTotal = splitItems.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
      if (splitTotal !== Number(manualTx.amount)) return; // button should be disabled, but guard anyway
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    let newId = 'tx-' + (transactions.length + 1).toString().padStart(3, '0');
    const effectiveCategoryId = splitMode && splitItems.length > 0 ? 'split' : manualTx.category_id;

    try {
      const body: any = {
        transaction_date: dateStr,
        account_id: manualTx.account_id,
        category_id: effectiveCategoryId,
        amount: Number(manualTx.amount),
        type: manualTx.type,
        note: manualTx.note || 'Nhập thủ công',
        payee_id: manualTx.payee_id,
      };
      if (splitMode && splitItems.length > 0) {
        body.splits = splitItems.map(s => ({
          category_id: s.category_id,
          amount: Number(s.amount),
          note: s.note,
        }));
      }
      const res = await fetch(`${FLASK_API}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.transaction_id) newId = data.transaction_id;
    } catch {
      // Backend offline — still add to local state
    }

    const newTx: Transaction = {
      transaction_id: newId,
      transaction_date: dateStr,
      account_id: manualTx.account_id,
      category_id: effectiveCategoryId,
      amount: Number(manualTx.amount),
      type: manualTx.type,
      note: manualTx.note || 'Nhập thủ công',
      splits: splitMode && splitItems.length > 0
        ? splitItems.map(s => ({ category_id: s.category_id, amount: Number(s.amount), note: s.note }))
        : [],
    };

    setTransactions(prev => [...prev, newTx]);
    // Reload from backend to get persisted split data with split_ids
    loadTransactions();
    setIsManualModalOpen(false);
    setManualTx({ amount: '', type: 'expense', category_id: 'food', account_id: 'cash', note: '', payee_id: null });
    setSplitMode(false);
    setSplitItems([]);

    setChatHistory(prev => [...prev, {
      id: 'system-' + Date.now(),
      sender: 'system',
      text: `Đã chèn thủ công bản ghi [${newTx.transaction_id}] thành công vào Transaction_Fact.`,
      timestamp: Date.now()
    }]);

    setShowSqlAnimationId(newId);
    setTimeout(() => setShowSqlAnimationId(null), 1600);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await fetch(`${FLASK_API}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch {
      // Proceed with local state update even if backend call fails
    }
    setTransactions(prev => prev.filter(t => t.transaction_id !== id));
    setChatHistory(prev => [...prev, {
      id: 'system-' + Date.now(),
      sender: 'system',
      text: `Đã thực thi câu lệnh DELETE FROM Transaction_Fact WHERE transaction_id = '${id}';`,
      timestamp: Date.now()
    }]);
  };

  const handleToggleRecurring = async (recurring_id: number) => {
    try {
      const res = await fetch(`${FLASK_API}/api/recurring/${recurring_id}/toggle`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle recurring transaction");
      
      setChatHistory(prev => [...prev, {
        id: 'system-' + Date.now(),
        sender: 'system',
        text: `Đã thực thi cập nhật is_active: PATCH /api/recurring/${recurring_id}/toggle`,
        timestamp: Date.now()
      }]);
      loadRecurring();
    } catch (err: any) {
      alert(err.message || "Error toggling rule");
    }
  };

  const handleDeleteRecurring = async (recurring_id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch định kỳ này?")) return;
    try {
      const res = await fetch(`${FLASK_API}/api/recurring/${recurring_id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete recurring transaction");

      setChatHistory(prev => [...prev, {
        id: 'system-' + Date.now(),
        sender: 'system',
        text: `Đã thực thi xóa giao dịch định kỳ: DELETE /api/recurring/${recurring_id}`,
        timestamp: Date.now()
      }]);
      loadRecurring();
    } catch (err: any) {
      alert(err.message || "Error deleting rule");
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecurring.amount || isNaN(Number(newRecurring.amount))) return;

    try {
      const res = await fetch(`${FLASK_API}/api/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          account_id: newRecurring.account_id,
          category_id: newRecurring.category_id,
          amount: Number(newRecurring.amount),
          type: newRecurring.type,
          frequency: newRecurring.frequency,
          next_run_date: newRecurring.next_run_date,
          end_date: newRecurring.end_date || null,
          note: newRecurring.note,
          payee_id: newRecurring.payee_id
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create recurring transaction");

      setChatHistory(prev => [...prev, {
        id: 'system-' + Date.now(),
        sender: 'system',
        text: `Đã tạo giao dịch định kỳ thành công: POST /api/recurring [ID: ${data.recurring_id}]`,
        timestamp: Date.now()
      }]);

      setShowRecurringForm(false);
      // Reset form state
      setNewRecurring({
        amount: '',
        type: 'expense',
        category_id: 'food',
        account_id: 'cash',
        frequency: 'monthly',
        next_run_date: new Date().toISOString().slice(0, 10),
        end_date: '',
        note: '',
        payee_id: null
      });
      loadRecurring();
    } catch (err: any) {
      alert(err.message || "Error creating recurring transaction");
    }
  };

  // Update budget for a category via the budgets table
  const updateBudget = async (categoryId: string, amountLimit: number) => {
    try {
      await fetch(`${FLASK_API}/api/budgets/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount_limit: amountLimit, month: selectedMonth }),
      });
    } catch {
      // Optimistic update proceeds regardless
    }
    // Update local budgets state
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.category_id === categoryId && b.month === selectedMonth);
      if (idx >= 0) {
        return prev.map((b, i) => i === idx ? { ...b, amount_limit: amountLimit } : b);
      }
      return [...prev, { budget_id: Date.now(), category_id: categoryId, month: selectedMonth, amount_limit: amountLimit }];
    });
  };

  // Group transactions for simple Category list progress indicators
  // For split transactions, distribute amounts by their individual split categories
  const categorySums: { [key: string]: number } = {};
  transactions.forEach(t => {
    if (t.type !== 'expense') return;
    if (t.splits && t.splits.length > 0) {
      t.splits.forEach(s => {
        categorySums[s.category_id] = (categorySums[s.category_id] || 0) + s.amount;
      });
    } else {
      categorySums[t.category_id] = (categorySums[t.category_id] || 0) + t.amount;
    }
  });

  return (
    <div className="h-screen bg-[#070709] bg-grid-dots relative flex flex-col overflow-hidden">
      
      {/* Background radial soft light blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Modern Top Header Nav */}
      <header className="shrink-0 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-filter backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-[1px] flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <div className="w-full h-full bg-zinc-900 rounded-[11px] flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white font-sans flex items-center gap-1.5 leading-none">
              Finance Management by Voicer
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">Hệ thống bóc tách giao dịch tự động & SQL Analytics</p>
          </div>
        </div>

        {/* Live AI Status and Info Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/30 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-mono font-medium text-emerald-300">Gemini 2.5 Flash Online</span>
          </div>
          
          <div className="text-xs font-mono text-zinc-500 border border-zinc-800/50 bg-zinc-900/30 px-2.5 py-1.5 rounded-lg hidden md:block">
            📅 Hệ thống: 03/06/2026 (UTC)
          </div>

          {/* User info + logout */}
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 hidden sm:block max-w-[120px] truncate">
                {user.name || user.email}
              </span>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-800 bg-zinc-900/40 px-2.5 py-1.5 rounded-lg transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 py-4 md:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Side: Interactive Portal & Analytics (7 columns on large size) */}
        <section className="lg:col-span-8 flex flex-col min-h-0 gap-5">
          
          {/* Sub-navigation tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
            <div className="flex gap-1 flex-wrap overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-zinc-900 text-emerald-400 shadow-sm border border-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Báo Cáo Chi Tiêu</span>
              </button>
              <button
                onClick={() => setActiveTab('tables')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  activeTab === 'tables'
                    ? 'bg-zinc-900 text-emerald-400 shadow-sm border border-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>CSDL SQLite (3 Bảng)</span>
              </button>
              <button
                onClick={() => setActiveTab('sql')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 relative ${
                  activeTab === 'sql'
                    ? 'bg-zinc-900 text-emerald-400 shadow-sm border border-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Cổng SQL Analyst</span>
                <span className="absolute -top-1 -right-1 bg-teal-500 text-[9px] text-zinc-950 px-1 py-0.2 rounded font-sans font-extrabold scale-90">KPI</span>
              </button>
              <button
                onClick={() => setActiveTab('recurring')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 relative ${
                  activeTab === 'recurring'
                    ? 'bg-zinc-900 text-emerald-400 shadow-sm border border-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Giao dịch định kỳ</span>
                {recurringRules.filter(r => r.is_active === 1).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-[9px] text-zinc-950 px-1.5 py-0.5 rounded-full font-sans font-extrabold scale-90">
                    {recurringRules.filter(r => r.is_active === 1).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('instructions')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${
                  activeTab === 'instructions'
                    ? 'bg-zinc-900 text-emerald-400 shadow-sm border border-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Tài liệu Dự Án</span>
              </button>
            </div>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Chèn Bản Ghi</span>
            </button>
          </div>

          {/* Active Tab Panel Body */}
          <div className="flex-1 bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 overflow-y-auto min-h-0 glass-panel">
            
            {/* TAB 1: DASHBOARD METRICS */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                {/* 4 Financial Stat KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-400 text-xs font-sans">Tổng Số Dư Khả Dụng</span>
                      <Wallet className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-2">
                      <span className="text-sm font-sans font-semibold text-white tracking-tight break-all md:text-lg block">
                        {formatCurrency(totalAssets)}
                      </span>
                      <span className="text-[10px] text-emerald-400 mt-1 block">Tài sản thực tế ròng</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-400 text-xs font-sans">Tổng Thu Nhập (Period)</span>
                      <ArrowUpRight className="w-4 h-4 text-emerald-400 animate-pulse" />
                    </div>
                    <div className="mt-2">
                       <span className="text-sm font-sans font-semibold text-emerald-400 tracking-tight break-all md:text-lg block">
                        {formatCurrency(totalIncome)}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-1 block">Dòng tiền thu của tháng</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-400 text-xs font-sans">Tổng Chi Tiêu Thực Tế</span>
                      <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="mt-2">
                       <span className="text-sm font-sans font-semibold text-rose-400 tracking-tight break-all md:text-lg block">
                        {formatCurrency(totalExpense)}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-1 block">Rút quỹ tiêu dùng ngày</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800/60 p-4 rounded-xl flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-400 text-xs font-sans">Tài Sản Đầu Tư (Dim)</span>
                      <TrendingUp className="w-4 h-4 text-sky-400" />
                    </div>
                    <div className="mt-2">
                       <span className="text-sm font-sans font-semibold text-sky-400 tracking-tight break-all md:text-lg block">
                        {formatCurrency(totalInvestment)}
                      </span>
                      <span className="text-[10px] text-sky-400 mt-1 block">Cổ phiếu & Tài sản VPS</span>
                    </div>
                  </div>
                </div>

                {/* Grid for Budget Monitoring & Account Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Category Budgets Monitor (LEFT JOIN output visual) */}
                  <div className="bg-zinc-900/20 border border-zinc-800 p-4 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span>Hạn Mức Ngân Sách (LEFT JOIN SQL)</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="month"
                          value={selectedMonth}
                          onChange={e => setSelectedMonth(e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">Cảnh báo tự động</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      {categories.filter(c => {
                        const b = budgets.find(b => b.category_id === c.category_id);
                        return (b?.amount_limit ?? c.budget) > 0;
                      }).map(cat => {
                        const b = budgets.find(b => b.category_id === cat.category_id);
                        const budgetLimit = b?.amount_limit ?? cat.budget;
                        const spent = categorySums[cat.category_id] || 0;
                        const percent = Math.min((spent / budgetLimit) * 100, 100);
                        const isOver = spent > budgetLimit;
                        const isWarning = spent > budgetLimit * 0.8;

                        return (
                          <div key={cat.category_id} className="text-xs space-y-1">
                            <div className="flex justify-between text-zinc-300">
                              <span>{cat.category_name}</span>
                              <span className="font-mono text-zinc-400">
                                <span className={isOver ? "text-rose-400 font-bold" : isWarning ? "text-amber-400" : "text-zinc-200"}>
                                  {formatCurrency(spent)}
                                </span> / <span className="text-zinc-500">{formatCurrency(budgetLimit)}</span>
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden p-[1px]">
                              <div
                                style={{ width: `${percent}%` }}
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOver ? "bg-rose-500 shadow-sm shadow-rose-500/30 animate-pulse" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-zinc-500">
                              <span>0%</span>
                              <span>
                                {isOver ? (
                                  <span className="text-rose-400 font-semibold flex items-center gap-1">❌ Vượt hạn mức {formatCurrency(spent - budgetLimit)}</span>
                                ) : isWarning ? (
                                  <span className="text-amber-400 font-semibold">⚠️ Cận ngưỡng chi tiêu (&gt;80%)</span>
                                ) : (
                                  <span className="text-emerald-500">✅ An toàn (Còn lại {formatCurrency(budgetLimit - spent)})</span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Account Allocation Dim breakdown */}
                  <div className="bg-zinc-900/20 border border-zinc-800 p-4 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        <span>Số Dư Tài Khoản (Account_Dim)</span>
                      </span>
                      <span className="text-xs font-mono text-zinc-400 text-gradient">Bảng Dimension</span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {computedAccounts.map(acc => {
                        const totalCombined = computedAccounts.reduce((sum, a) => sum + Math.max(a.current_balance, 0), 0);
                        const weight = totalCombined > 0 ? (acc.current_balance / totalCombined) * 100 : 0;
                        const isMinus = acc.current_balance < 0;

                        return (
                          <div key={acc.account_id} className="p-2.5 bg-zinc-900/40 border border-zinc-800/40 rounded-lg flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold leading-none ${
                                acc.account_id === 'momo' ? 'bg-pink-900/20 text-pink-400 border border-pink-500/10' :
                                acc.account_id === 'vcb' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/10' :
                                acc.account_id === 'vps' ? 'bg-sky-900/20 text-sky-400 border border-sky-500/10' :
                                'bg-zinc-800 text-zinc-400'
                              }`}>
                                {acc.account_name.substring(0, 3)}
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-white block">{acc.account_name}</span>
                                <span className="text-[10px] text-zinc-500">{acc.account_id.toUpperCase()}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`text-xs font-mono font-medium block ${isMinus ? 'text-rose-400' : 'text-zinc-100'}`}>
                                {formatCurrency(acc.current_balance)}
                              </span>
                              <span className="text-[9px] text-zinc-500 tracking-tight block">Trọng số: {weight.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Per-Payee Spending Panel */}
                {payees.length > 0 && (() => {
                  const payeeSums: Record<number, number> = {};
                  const payeeCounts: Record<number, number> = {};
                  transactions.forEach(t => {
                    if (t.type === 'expense' && t.payee_id) {
                      payeeSums[t.payee_id] = (payeeSums[t.payee_id] || 0) + t.amount;
                      payeeCounts[t.payee_id] = (payeeCounts[t.payee_id] || 0) + 1;
                    }
                  });
                  const sorted = [...payees]
                    .filter(p => payeeSums[p.payee_id])
                    .sort((a, b) => (payeeSums[b.payee_id] || 0) - (payeeSums[a.payee_id] || 0));
                  return (
                    <div className="bg-zinc-900/20 border border-zinc-800 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-sky-400" />
                          <span>Chi Tiêu Theo Payee</span>
                        </span>
                        <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded">Merchant Analytics</span>
                      </div>
                      {sorted.length === 0 ? (
                        <p className="text-[11px] text-zinc-500 italic">Chưa có dữ liệu payee. Hãy tạo giao dịch qua giọng nói với merchant đã thêm.</p>
                      ) : (
                        <div className="space-y-2.5 pt-1">
                          {sorted.map(p => {
                            const total = payeeSums[p.payee_id] || 0;
                            const count = payeeCounts[p.payee_id] || 0;
                            const maxTotal = payeeSums[sorted[0].payee_id] || 1;
                            const pct = (total / maxTotal) * 100;
                            return (
                              <div key={p.payee_id} className="space-y-1">
                                <div className="flex justify-between text-xs text-zinc-300">
                                  <span className="font-semibold">{p.payee_name}</span>
                                  <span className="font-mono text-zinc-400">{formatCurrency(total)} <span className="text-zinc-600">({count} giao dịch)</span></span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                  <div style={{ width: `${pct}%` }} className="h-full bg-sky-500 rounded-full transition-all duration-500" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Cumulative Running Sum Visualization (Window function simulation visualization) */}
                <div className="bg-zinc-900/10 border border-zinc-800 p-4 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-teal-400" />
                        <span>Xu Hướng Tích Lũy Tài Sản (Running Total)</span>
                      </span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Biểu đồ biểu diễn kết quả của câu lệnh SQL Window Function SUM() OVER()</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('sql');
                        runPresetQuery('window');
                      }}
                      className="text-[10px] text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded hover:bg-emerald-500/10 flex items-center gap-1"
                    >
                      <Terminal className="w-3 h-3" /> Chạy SQL View
                    </button>
                  </div>

                  {/* Horizontal Bar Visualizer or Dot points illustrating Cumulative balance across transactions */}
                  <div className="pt-2">
                    <div className="h-28 flex items-end justify-between gap-1 border-b border-zinc-800 pb-1">
                      {/* Generates dynamic height items representing cumulative balance after transactions */}
                      {(() => {
                        let currentBal = computedAccounts.reduce((sum, a) => sum + a.initial_balance, 0);
                        const sortedTx = [...transactions].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
                        
                        const values = sortedTx.map(t => {
                          currentBal += t.type === 'income' ? t.amount : -t.amount;
                          return { bal: currentBal, note: t.note, date: t.transaction_date };
                        });

                        const maxBal = Math.max(...values.map(v => v.bal), 1);
                        const minBal = Math.min(...values.map(v => v.bal), 0);
                        const range = maxBal - minBal;

                        return values.slice(-10).map((val, idx) => {
                          const heightPct = range > 0 ? ((val.bal - minBal) / range) * 80 + 20 : 50;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className="w-full bg-gradient-to-t from-emerald-500/20 to-teal-400/80 rounded-t border-t border-teal-300/40 relative hover:to-teal-300 transition-all duration-300"
                              >
                                <div className="absolute top-0 left-0 w-2 h-2 -mt-1 left-1/2 -ml-1 bg-white rounded-full radial-glow shadow shadow-white opacity-0 group-hover:opacity-100"></div>
                              </div>
                              <span className="text-[8px] text-zinc-500 mt-1 font-mono truncate max-w-full">
                                {val.date.substring(5, 10)}
                              </span>

                              {/* Tooltip on Hover */}
                              <div className="absolute bottom-full mb-2 bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-[10px] w-40 hidden group-hover:block z-10 shadow-2xl">
                                <span className="font-semibold block text-white truncate">{val.note}</span>
                                <span className="text-zinc-400 text-[9px] font-mono block mt-0.5">{val.date}</span>
                                <span className="text-emerald-400 font-mono font-bold block mt-1">{formatCurrency(val.bal)}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: RECURRING TRANSACTIONS */}
            {activeTab === 'recurring' && (
              <div className="space-y-6 animate-fade-in text-xs font-sans">
                {/* Banner Notification for Auto-generated Transactions */}
                {generatedCount > 0 && (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Hệ thống đã tự động ghi nhận <strong>{generatedCount}</strong> giao dịch định kỳ đến hạn hôm nay!</span>
                    </div>
                    <button
                      onClick={() => setGeneratedCount(0)}
                      className="text-emerald-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span>Giao dịch định kỳ</span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Tự động sinh giao dịch thực tế vào ngày tiếp theo quy định.</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewRecurring({
                        amount: '',
                        type: 'expense',
                        category_id: categories[0]?.category_id || 'food',
                        account_id: accounts[0]?.account_id || 'cash',
                        frequency: 'monthly',
                        next_run_date: new Date().toISOString().slice(0, 10),
                        end_date: '',
                        note: '',
                        payee_id: null
                      });
                      setShowRecurringForm(true);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Mới</span>
                  </button>
                </div>

                {recurringRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/10 border border-zinc-800 rounded-2xl text-center space-y-3">
                    <Calendar className="w-8 h-8 text-zinc-600 animate-pulse" />
                    <h4 className="text-zinc-300 font-semibold text-xs">Chưa có giao dịch định kỳ nào</h4>
                    <p className="text-zinc-500 text-[11px] max-w-xs">Hãy thiết lập các khoản thu/chi lặp lại như tiền nhà, tiền lương, hóa đơn dịch vụ...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recurringRules.map((rule) => {
                      const account = accounts.find(a => a.account_id === rule.account_id);
                      const category = categories.find(c => c.category_id === rule.category_id);
                      const frequencyLabels = {
                        daily: 'Hàng ngày',
                        weekly: 'Hàng tuần',
                        monthly: 'Hàng tháng',
                        yearly: 'Hàng năm'
                      };

                      return (
                        <div
                          key={rule.recurring_id}
                          className={`p-4 bg-zinc-900/40 border rounded-xl flex flex-col justify-between transition-all duration-200 hover:border-zinc-700/60 ${
                            rule.is_active ? 'border-zinc-800' : 'border-zinc-900 opacity-60'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wide uppercase ${
                                  rule.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' :
                                  rule.type === 'expense' ? 'bg-rose-500/10 text-rose-400' :
                                  'bg-sky-500/10 text-sky-400'
                                }`}>
                                  {rule.type === 'income' ? 'Thu nhập' : rule.type === 'expense' ? 'Chi phí' : 'Đầu tư'}
                                </span>
                                <h4 className="text-zinc-200 font-semibold text-xs mt-1.5 font-sans">
                                  {rule.note || `Giao dịch định kỳ #${rule.recurring_id}`}
                                </h4>
                              </div>
                              <span className="text-xs font-mono font-bold text-white">
                                {rule.type === 'expense' ? '-' : rule.type === 'income' ? '+' : ''}
                                {formatCurrency(rule.amount)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                              <div>
                                <span className="text-zinc-500">Tài khoản:</span> {account?.account_name || rule.account_id}
                              </div>
                              <div>
                                <span className="text-zinc-500">Danh mục:</span> {category?.category_name || rule.category_id}
                              </div>
                              <div>
                                <span className="text-zinc-500">Tần suất:</span> {frequencyLabels[rule.frequency]}
                              </div>
                              <div>
                                <span className="text-zinc-500">Trạng thái:</span>{' '}
                                <span className={rule.is_active ? 'text-emerald-400' : 'text-zinc-500'}>
                                  {rule.is_active ? 'Đang bật' : 'Đã tắt'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-zinc-800 text-[10px] space-y-1">
                              <div className="flex justify-between text-zinc-400">
                                <span>Lần chạy tiếp theo:</span>
                                <span className="font-mono text-zinc-200">{rule.next_run_date}</span>
                              </div>
                              {rule.end_date && (
                                <div className="flex justify-between text-zinc-400">
                                  <span>Ngày kết thúc:</span>
                                  <span className="font-mono text-zinc-500">{rule.end_date}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end mt-4">
                            <button
                              onClick={() => handleToggleRecurring(rule.recurring_id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                                rule.is_active
                                  ? 'bg-zinc-850 text-zinc-300 hover:bg-zinc-800'
                                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              }`}
                            >
                              {rule.is_active ? 'Tắt' : 'Bật'}
                            </button>
                            <button
                              onClick={() => handleDeleteRecurring(rule.recurring_id)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DATABASE EXPLORER */}
            {activeTab === 'tables' && (
              <div className="space-y-6 animate-fade-in text-xs">
                
                {/* Table Title: Transaction_Fact */}
                <div className="border border-zinc-800 bg-zinc-900/10 p-4 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-emerald-400" />
                        <span>Lịch Sử Giao Dịch [Bảng Thực Tế: Transaction_Fact]</span>
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Lưu lịch sử dòng tiền vào, ra và quay vòng tài khoản. Khóa chính: transaction_id</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setTransactions(initialTransactions);
                          setAccounts(initialAccounts);
                          setCategories(initialCategories);
                        }}
                        className="text-[10px] text-zinc-400 hover:text-white border border-zinc-800 px-2 py-1 rounded hover:bg-zinc-800 bg-zinc-900 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Reset CSDL gốc
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-zinc-800/80 rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 font-mono text-[9px]">
                          <th className="p-2.5">transaction_id</th>
                          <th className="p-2.5">transaction_date</th>
                          <th className="p-2.5">account_id</th>
                          <th className="p-2.5">category_id</th>
                          <th className="p-2.5 text-right">amount_vnd</th>
                          <th className="p-2.5">type</th>
                          <th className="p-2.5">note</th>
                          <th className="p-2.5 text-center">hành_động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px] text-zinc-300">
                        {transactions.map(t => {
                          const isNew = showSqlAnimationId === t.transaction_id;
                          const isSplit = t.category_id === 'split';
                          const isExpanded = expandedTxId === t.transaction_id;
                          const catLabel = isSplit
                            ? '⑂ Nhiều danh mục'
                            : (categories.find(c => c.category_id === t.category_id)?.category_name ?? t.category_id);
                          return (
                            <React.Fragment key={t.transaction_id}>
                              <tr
                                className={`hover:bg-zinc-900/30 transition-colors ${isNew ? 'bg-emerald-950/20 text-emerald-300 font-semibold border-y border-emerald-500/20 flash-inserted' : ''}`}
                              >
                                <td className="p-2.5 text-zinc-500">{t.transaction_id}</td>
                                <td className="p-2.5 white-space-nowrap">{t.transaction_date}</td>
                                <td className="p-2.5 text-zinc-400">{t.account_id}</td>
                                <td className="p-2.5 text-zinc-400">
                                  <span className={isSplit ? 'text-amber-400 font-semibold' : ''}>{catLabel}</span>
                                </td>
                                <td className={`p-2.5 text-right font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatCurrency(t.amount)}
                                </td>
                                <td className="p-2.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                                    t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' :
                                    t.type === 'expense' ? 'bg-rose-500/10 text-rose-400' :
                                    'bg-sky-500/10 text-sky-400'
                                  }`}>
                                    {t.type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-2.5 max-w-[150px] truncate font-sans text-xs" title={t.note}>{t.note}</td>
                                <td className="p-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {isSplit && (
                                      <button
                                        onClick={() => setExpandedTxId(isExpanded ? null : t.transaction_id)}
                                        className="text-zinc-500 hover:text-amber-400 transition-colors duration-150 p-1 rounded hover:bg-amber-500/10 cursor-pointer"
                                        title="Xem chi tiết phân bổ"
                                      >
                                        <span className="text-[10px] font-mono">{isExpanded ? '▼' : '▶'}</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteTransaction(t.transaction_id)}
                                      className="text-zinc-500 hover:text-rose-400 transition-colors duration-150 p-1 rounded hover:bg-rose-500/10 cursor-pointer"
                                      title="Thực thi DELETE"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isSplit && isExpanded && t.splits && t.splits.length > 0 && (
                                <tr className="bg-zinc-900/40">
                                  <td colSpan={8} className="px-6 py-3">
                                    <div className="text-[10px] text-zinc-400 font-sans mb-1.5 font-semibold">Chi tiết phân bổ danh mục:</div>
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="text-zinc-500 font-mono text-[9px]">
                                          <th className="pb-1 pr-4">danh_mục</th>
                                          <th className="pb-1 pr-4 text-right">số_tiền</th>
                                          <th className="pb-1">ghi_chú</th>
                                        </tr>
                                      </thead>
                                      <tbody className="font-mono text-[10px] text-zinc-300">
                                        {t.splits.map((s, idx) => {
                                          const splitCatName = categories.find(c => c.category_id === s.category_id)?.category_name ?? s.category_id;
                                          return (
                                            <tr key={idx} className="border-t border-zinc-800/40">
                                              <td className="py-1 pr-4 text-sky-400">{splitCatName}</td>
                                              <td className="py-1 pr-4 text-right text-rose-400 font-semibold">{formatCurrency(s.amount)}</td>
                                              <td className="py-1 text-zinc-500 font-sans">{s.note || '—'}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dimensions (Bảng chiều): Account_Dim and Category_Dim Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Account_Dim table */}
                  <div className="border border-zinc-800 bg-zinc-900/10 p-4 rounded-xl space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-pink-400" />
                        <span>Tài Khoản Giao Dịch [Bảng Chiều: Account_Dim]</span>
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Quản lý quỹ đầu vào/đầu ra nguồn tiền.</p>
                    </div>

                    <div className="overflow-x-auto border border-zinc-800/80 rounded-lg">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 font-mono text-[9px]">
                            <th className="p-2">account_id</th>
                            <th className="p-2">account_name</th>
                            <th className="p-2 text-right">initial_balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 font-mono text-[10px] text-zinc-300">
                          {accounts.map(acc => (
                            <tr key={acc.account_id} className="hover:bg-zinc-900/40">
                              <td className="p-2 text-pink-400 font-bold">{acc.account_id}</td>
                              <td className="p-2 font-sans">{acc.account_name}</td>
                              <td className="p-2 text-right text-zinc-400">{formatCurrency(acc.initial_balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Category_Dim table */}
                  <div className="border border-zinc-800 bg-zinc-900/10 p-4 rounded-xl space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-sky-400" />
                        <span>Danh Mục Chi Tiêu [Bảng Chiều: Category_Dim]</span>
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Quản lý phân loại chi tiêu và cài đặt hạn mức (Budget)</p>
                    </div>

                    <div className="overflow-x-auto border border-zinc-800/80 rounded-lg">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 font-mono text-[9px]">
                            <th className="p-2">category_id</th>
                            <th className="p-2">category_name</th>
                            <th className="p-2 text-right">budget_limit</th>
                            <th className="p-2 text-center">cập_nhật</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 font-mono text-[10px] text-zinc-300">
                          {categories.filter(cat => cat.category_id !== 'split').map(cat => (
                            <tr key={cat.category_id} className="hover:bg-zinc-900/40">
                              <td className="p-2 text-sky-400 font-bold">{cat.category_id}</td>
                              <td className="p-2 font-sans">{cat.category_name}</td>
                              <td className="p-2 text-right">
                                {cat.budget > 0 ? (
                                  <span className="font-semibold text-amber-500">{formatCurrency(cat.budget)}</span>
                                ) : (
                                  <span className="text-zinc-600 font-sans">Vô hạn (Thu nhập)</span>
                                )}
                              </td>
                              <td className="p-1 text-center">
                                {cat.budget > 0 && (
                                  <button
                                    onClick={() => {
                                      const current = budgets.find(b => b.category_id === cat.category_id && b.month === selectedMonth)?.amount_limit ?? cat.budget;
                                      const newVal = prompt(`Cập nhật hạn mức cho ${cat.category_name} (bằng số VND, ví dụ: 5000000):`, current.toString());
                                      if (newVal && !isNaN(Number(newVal))) {
                                        updateBudget(cat.category_id, Number(newVal));
                                        setChatHistory(prev => [...prev, {
                                          id: 'sys-up-' + Date.now(),
                                          sender: 'system',
                                          text: `Đã cập nhật hạn mức: PUT /api/budgets/${cat.category_id} { amount_limit: ${newVal}, month: '${selectedMonth}' }`,
                                          timestamp: Date.now()
                                        }]);
                                      }
                                    }}
                                    className="text-zinc-500 hover:text-emerald-400 border border-zinc-800/80 hover:border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] hover:bg-emerald-500/10 transition-all cursor-pointer"
                                  >
                                    Cài lại
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payee Manager */}
                  <div className="border border-zinc-800 bg-zinc-900/10 p-4 rounded-xl space-y-3 mt-4">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Danh Sách Payees [Bảng: payees]</span>
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Quản lý merchants/người nhận — dùng để tự động gắn kết giao dịch từ giọng nói</p>
                    </div>

                    {payees.length > 0 ? (
                      <div className="overflow-x-auto border border-zinc-800/80 rounded-lg">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 font-mono text-[9px]">
                              <th className="p-2.5">payee_id</th>
                              <th className="p-2.5">payee_name</th>
                              <th className="p-2.5">default_category_id</th>
                              <th className="p-2.5 text-center">hành_động</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px] text-zinc-300">
                            {payees.map(p => (
                              <tr key={p.payee_id} className="hover:bg-zinc-900/40">
                                <td className="p-2.5 text-zinc-500">{p.payee_id}</td>
                                <td className="p-2.5 font-semibold text-emerald-300">{p.payee_name}</td>
                                <td className="p-2.5 text-zinc-400">{p.default_category_id ?? '—'}</td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={async () => {
                                      await fetch(`${FLASK_API}/api/payees/${p.payee_id}`, {
                                        method: 'DELETE',
                                        headers: { 'Authorization': `Bearer ${token}` },
                                      }).catch(() => {});
                                      setPayees(prev => prev.filter(x => x.payee_id !== p.payee_id));
                                    }}
                                    className="text-zinc-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-rose-500/10 cursor-pointer"
                                    title="Xóa payee"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 italic">Chưa có payee nào. Thêm payee đầu tiên bên dưới.</p>
                    )}

                    {/* Add payee form */}
                    <form
                      className="flex flex-wrap gap-2 pt-1"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const nameInput = form.elements.namedItem('payee_name') as HTMLInputElement;
                        const catSelect = form.elements.namedItem('default_category_id') as HTMLSelectElement;
                        const name = nameInput.value.trim();
                        if (!name) return;
                        try {
                          const res = await fetch(`${FLASK_API}/api/payees`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ payee_name: name, default_category_id: catSelect.value || null }),
                          });
                          if (res.status === 409) { alert('Payee đã tồn tại'); return; }
                          const data = await res.json();
                          setPayees(prev => [...prev, { payee_id: data.payee_id, payee_name: name, default_category_id: catSelect.value || null }]);
                          nameInput.value = '';
                        } catch { /* ignore */ }
                      }}
                    >
                      <input
                        name="payee_name"
                        type="text"
                        placeholder="Tên payee (vd: Grab, Bách Hóa Xanh)"
                        className="flex-1 min-w-[160px] bg-zinc-900 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                      />
                      <select
                        name="default_category_id"
                        className="bg-zinc-900 border border-zinc-800/80 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Danh mục mặc định --</option>
                        {categories.map(c => (
                          <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />Thêm
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 3: SQL PANELS (WHERE PORTFOLIO RUNS INTUITIVELY) */}
            {activeTab === 'sql' && (
              <div className="space-y-5 animate-fade-in text-xs font-mono">
                
                {/* Advanced Explanation */}
                <div className="bg-teal-950/20 border border-teal-800/30 p-4 rounded-xl space-y-2 font-sans text-zinc-300">
                  <div className="flex items-center gap-1.5 text-teal-400 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>Học phần Portfolio - Truy vấn SQL nâng cao từ SOW</span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Phát triển cơ sở dữ liệu trên Turso SQLite. Dưới đây là bảng điều hành SQL trực tiếp. Hãy chọn một mẫu truy vấn Analytics nâng cao quy định (Phần SOW 3) để thực thi ngay trên dữ liệu giao dịch thực tế đang thay đổi:
                  </p>
                </div>

                {/* Direct Presets selectors */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => runPresetQuery('all')}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left hover:border-emerald-500/30 transition-all font-sans cursor-pointer group"
                  >
                    <span className="text-[10px] text-zinc-500 block">Truy vấn cơ bản</span>
                    <span className="font-semibold text-zinc-200 block text-xs mt-0.5 group-hover:text-white">Xem mọi dòng (SELECT)</span>
                  </button>

                  <button
                    onClick={() => runPresetQuery('group')}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left hover:border-emerald-500/30 transition-all font-sans cursor-pointer group"
                  >
                    <span className="text-[10px] text-emerald-400 block font-mono font-bold">GROUP BY Analytics</span>
                    <span className="font-semibold text-zinc-200 block text-xs mt-0.5 group-hover:text-white">Chi tiêu theo Danh mục</span>
                  </button>

                  <button
                    onClick={() => runPresetQuery('budget')}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left hover:border-emerald-500/30 transition-all font-sans cursor-pointer group"
                  >
                    <span className="text-[10px] text-amber-400 block font-mono font-bold">LEFT JOIN Limit DB</span>
                    <span className="font-semibold text-zinc-200 block text-xs mt-0.5 group-hover:text-white">So sánh với Hạn mức</span>
                  </button>

                  <button
                    onClick={() => runPresetQuery('window')}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-left hover:border-emerald-500/30 transition-all font-sans cursor-pointer group"
                  >
                    <span className="text-[10px] text-sky-400 block font-mono font-bold">WINDOW FUNCTION SQL</span>
                    <span className="font-semibold text-zinc-200 block text-xs mt-0.5 group-hover:text-white">Tính số dư lũy kế</span>
                  </button>
                </div>

                {/* SQL Editor terminal style */}
                <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow-2xl">
                  <div className="bg-zinc-900 px-4 py-2 flex justify-between items-center border-b border-zinc-800">
                    <span className="text-zinc-500 font-mono text-[10px] flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" /> console_sqlite_turso.sql
                    </span>
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                      <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      rows={3}
                      className="w-full bg-transparent border-0 font-mono text-xs text-zinc-300 focus:ring-0 resize-none outline-none leading-relaxed placeholder:text-zinc-700"
                      placeholder="Viết câu lệnh SELECT SQL truy vấn dữ liệu..."
                    />

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                      <span className="text-[10px] text-zinc-600 font-mono">Thực thi trực tiếp trên Turso DB</span>
                      <button
                        onClick={() => handleExecuteSQL()}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Thực thi SQL
                      </button>
                    </div>
                  </div>
                </div>

                {/* SQL Output Results Layout */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 tracking-wider">KẾT QUẢ TRUY VẤN (QUERY RESULT-SET)</span>
                  
                  {sqlError && (
                    <div className="p-4 bg-rose-950/20 border border-rose-800/30 rounded-xl text-rose-400 font-sans text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{sqlError}</span>
                    </div>
                  )}

                  {sqlResult && (
                    <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4 space-y-3">
                      
                      {sqlResult.description && (
                        <div className="p-2 rounded bg-zinc-900/40 border border-zinc-800 text-[10px] text-zinc-400 font-sans">
                          {sqlResult.description}
                        </div>
                      )}

                      <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 font-mono text-[9px]">
                              {sqlResult.headers.map((h, i) => (
                                <th key={i} className="p-2">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50 font-mono text-[10px] text-zinc-300">
                            {sqlResult.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-zinc-900/30">
                                {row.map((val, cellIdx) => (
                                  <td key={cellIdx} className="p-2 truncate max-w-[200px]" title={String(val)}>
                                    {String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between text-[10px] text-zinc-500 font-sans">
                        <span>Đếm số dòng: {sqlResult.rows.length}</span>
                        <span>Trạng thái: Trả về thành công</span>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 4: DOCUMENTATION & GUIDELINES */}
            {activeTab === 'instructions' && (
              <div className="space-y-5 animate-fade-in text-zinc-300 font-sans leading-relaxed text-sm">
                
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Tổng quan Kiến Trúc MVP: Finance Management By Voicer</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Dự án tích hợp trí tuệ nhân tạo để tối ưu hóa quá trình nhập liệu & Lưu trữ dữ liệu dòng tiền cá nhân có cấu trúc.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold text-zinc-400 tracking-wider">THIẾT KẾ CSDL QUAN HỆ (SQLITE/TURSO)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded-xl space-y-1.5">
                      <span className="font-bold text-white block font-mono">1. Account_Dim</span>
                      <span className="text-zinc-500 text-[10px] block">Bảng chiều tài khoản nguồn</span>
                      <ul className="space-y-1 text-zinc-400 list-disc list-inside">
                        <li><code>account_id</code> (string) PK</li>
                        <li><code>account_name</code> (string)</li>
                        <li><code>initial_balance</code> (int)</li>
                      </ul>
                    </div>

                    <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded-xl space-y-1.5">
                      <span className="font-bold text-white block font-mono">2. Category_Dim</span>
                      <span className="text-zinc-500 text-[10px] block">Bảng chiều danh mục sản phẩm</span>
                      <ul className="space-y-1 text-zinc-400 list-disc list-inside">
                        <li><code>category_id</code> (string) PK</li>
                        <li><code>category_name</code> (string)</li>
                        <li><code>budget</code> (int) limit</li>
                      </ul>
                    </div>

                    <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded-xl space-y-1.5">
                      <span className="font-bold text-white block font-mono">3. Transaction_Fact</span>
                      <span className="text-zinc-500 text-[10px] block">Bảng lịch sử giao dịch trung tâm</span>
                      <ul className="space-y-1 text-zinc-400 list-disc list-inside">
                        <li><code>transaction_id</code> PK</li>
                        <li><code>transaction_date</code></li>
                        <li><code>account_id</code> FK</li>
                        <li><code>category_id</code> FK</li>
                        <li><code>amount</code>, <code>type</code>, <code>note</code></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-zinc-400 tracking-wider">CHỨNG CHỈ NÂNG CAO - TRUY VẤN PORTFOLIO</h4>
                  
                  <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-2 text-xs">
                    <span className="text-amber-400 font-bold block">1. Nhóm theo Danh mục (GROUP BY SUM)</span>
                    <p className="text-zinc-400 text-[11px]">
                      Gom nhóm toàn bộ dữ liệu giao dịch đã tiêu và tính tổng để biết hạng mục nào tiêu thụ phân bổ nhiều tiền nhất.
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-2 text-xs">
                    <span className="text-amber-400 font-bold block">2. Cảnh báo hạn mức (LEFT JOIN Budget Comparison)</span>
                    <p className="text-zinc-400 text-[11px]">
                      Cho phép ghép bảng chiều Category_Dim với tổng chi tiêu thực tế để tính toán sai lệch giữa Hạn mức (Budget) - Thực tế (Actual Spent). Cảnh báo vượt ngưỡng ngay lập tức.
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-2 text-xs">
                    <span className="text-amber-400 font-bold block">3. Tính số dư cộng dồn tích lũy (Window Functions SUM OVER)</span>
                    <p className="text-zinc-400 text-[11px]">
                      Hàm <code>SUM(change) OVER (ORDER BY date)</code> hỗ trợ đo đạc lũy kế dòng tiền biến động của nhà đầu tư theo dòng thời gian mà không cần viết các câu lệnh lồng vòng lặp phức tạp.
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>
        </section>

        {/* Right Side: Interactive "Voicer" Assistant Conversational Chat Console (5 columns on large) */}
        <section className="lg:col-span-4 flex flex-col min-h-0 bg-zinc-950/60 border border-zinc-850/80 rounded-2xl overflow-hidden glass-panel">
          
          {/* Chat Panel Header */}
          <div className="shrink-0 bg-zinc-900/60 px-4 py-3 flex justify-between items-center border-b border-zinc-800/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-white flex items-center gap-1 font-sans">
                🟢 Trợ Lý Thoại Voicer AI
              </span>
            </div>
            
            <button
              onClick={() => {
                setChatHistory([
                  {
                    id: 'welcome-reset',
                    sender: 'assistant',
                    text: 'Đã thiết lập lại cuộc hội thoại. Hãy gửi một câu nói để xem bóc tách giao dịch nhé.',
                    timestamp: Date.now()
                  }
                ]);
              }}
              className="text-[10px] text-zinc-500 hover:text-white px-2 py-0.5 rounded border border-zinc-800 cursor-pointer"
            >
              Xóa lịch sử
            </button>
          </div>

          {/* Quick Slang Suggestions Container */}
          <div className="shrink-0 px-3 py-2 border-b border-zinc-900 bg-zinc-900/20 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {SLANG_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                disabled={isGenerating || isMicListening}
                onClick={() => {
                  setInputValue('');
                  handleProcessTransactionText(s.text);
                }}
                className="text-[9.5px] font-sans bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-300 px-2.5 py-1 rounded-xl transition-all duration-150 active:scale-95 text-left truncate cursor-pointer select-none max-w-full"
                title={s.text}
              >
                ⚡ {s.desc}
              </button>
            ))}
          </div>

          {/* Chat Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col min-h-0 relative">
            
            {/* Listening screen overlay if record is on */}
            {isMicListening && (
              <div className="absolute inset-0 bg-zinc-950/90 backdrop-filter backdrop-blur-sm flex flex-col items-center justify-center space-y-6 z-20 animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center glow-active">
                  <Mic className="w-8 h-8 text-emerald-400" />
                </div>
                
                <div className="text-center space-y-2">
                  <h4 className="text-sm font-bold text-white">Đang nghe giọng nói của bạn...</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">Nói một giao dịch chi tiêu tự nhiên (Ví dụ: "Hôm nay mua trà sữa hết 40 ngàn đổ sạc MoMo")</p>
                  {micInterim && (
                    <p className="text-xs text-emerald-300 font-mono max-w-xs mx-auto bg-emerald-950/40 border border-emerald-800/30 px-3 py-1.5 rounded-lg mt-1">
                      "{micInterim}"
                    </p>
                  )}
                </div>

                <div className="flex gap-1.5 items-center justify-center">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded animate-bounce"></span>
                  <span className="w-1.5 h-5 bg-emerald-400 rounded animate-bounce delay-75"></span>
                  <span className="w-1.5 h-8 bg-teal-400 rounded animate-bounce delay-150"></span>
                  <span className="w-1.5 h-4 bg-emerald-400 rounded animate-bounce delay-75"></span>
                  <span className="w-1.5 h-2 bg-emerald-500 rounded animate-bounce"></span>
                </div>

                <button
                  onClick={() => { recognitionRef.current?._stop?.() ?? recognitionRef.current?.stop(); setIsMicListening(false); setMicInterim(''); }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 rounded-full text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
              </div>
            )}

            {/* Mic error toast */}
            {micError && (
              <div className="self-center bg-rose-950/60 border border-rose-800/50 text-rose-300 text-[10px] font-sans px-3 py-2 rounded-lg max-w-[90%] text-center animate-fade-in flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{micError}</span>
                <button onClick={() => setMicError(null)} className="ml-auto shrink-0 text-rose-400 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>
              </div>
            )}

            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === 'user' ? 'self-end bg-emerald-500/10 border border-emerald-500/20 text-emerald-100' :
                  msg.sender === 'system' ? 'self-center bg-zinc-900 border border-zinc-800 text-zinc-400 text-center text-[10px] max-w-[95%] py-1 px-3 rounded-lg font-mono' :
                  'self-start bg-zinc-900/60 border border-zinc-800/80 text-zinc-300'
                } p-3 rounded-2xl space-y-2 animate-fade-in`}
              >
                {/* Message Source and badge */}
                <div className="flex items-center justify-between gap-3 text-[9px] text-zinc-500">
                  <span className="font-semibold select-none">
                    {msg.sender === 'user' ? 'Khách hàng (Giọng nói/Text)' : msg.sender === 'system' ? 'SQLite Engine' : '🔮 Trợ Lý Voicer'}
                  </span>
                  <span className="font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Main Text Markdown Style */}
                <p className="text-xs font-sans whitespace-pre-line leading-relaxed">
                  {msg.text}
                </p>

                {/* Code logging display if any SQL is generated */}
                {msg.sqlCommand && (
                  <div className="mt-2.5 p-2 bg-zinc-950 border border-zinc-850 rounded-lg text-[9px] font-mono select-text relative group">
                    <div className="text-[8px] uppercase text-zinc-500 font-sans tracking-wide mb-1 flex items-center justify-between">
                      <span>⚡ SQL Command Auto-Generated</span>
                      <span className="text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded scale-90">SUCCESS</span>
                    </div>
                    <code className="text-zinc-300 block overflow-x-auto whitespace-pre">
                      {msg.sqlCommand}
                    </code>
                    
                    <button
                      onClick={() => {
                        setSqlQuery(msg.sqlCommand || '');
                        setActiveTab('sql');
                        handleExecuteSQL(msg.sqlCommand);
                      }}
                      className="mt-1.5 w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[8px] text-zinc-400 hover:text-white py-1 rounded flex items-center justify-center gap-1 font-sans transition-all active:scale-95 cursor-pointer"
                    >
                      <Terminal className="w-3 h-3" /> Nạp lệnh & thực thi trong Console
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {isGenerating && (
              <div className="self-start bg-zinc-900/40 border border-zinc-800 p-3 rounded-2xl space-y-2 max-w-[85%] animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></div>
                  <span className="text-[10px] text-zinc-500 font-sans">Gemini AI đang bóc tách ngôn ngữ...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat User Input Area */}
          <div className="shrink-0 p-3 border-t border-zinc-900 bg-zinc-950/80">
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-1">
              
              {/* Mic action buttons */}
              <button
                type="button"
                onClick={handleVoiceInputStart}
                disabled={isGenerating}
                className={`w-9 h-9 rounded-lg border py-2.5 px-3 transition-colors active:scale-95 shrink-0 flex items-center justify-center cursor-pointer select-none ${
                  isMicListening
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 animate-pulse'
                    : 'bg-zinc-800 border-zinc-700/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/20'
                }`}
                title={isMicListening ? 'Dừng ghi âm' : 'Bắt đầu nhận dạng giọng nói tiếng Việt'}
              >
                {isMicListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputValue.trim()) {
                    handleProcessTransactionText(inputValue);
                    setInputValue('');
                  }
                }}
                disabled={isGenerating || isMicListening}
                placeholder="Nhập câu thu chi, vd: sắm giày 1 củ 2 bằng vcb..."
                className="flex-1 bg-transparent border-0 text-xs text-white focus:ring-0 outline-none placeholder:text-zinc-600 px-2"
              />

              <button
                onClick={() => {
                  if (inputValue.trim()) {
                    handleProcessTransactionText(inputValue);
                    setInputValue('');
                  }
                }}
                disabled={!inputValue.trim() || isGenerating || isMicListening}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:opacity-40 text-zinc-950 p-2.5 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <p className="text-[9px] text-zinc-500 text-center mt-2 font-sans select-none">
              Nút Mic mô phỏng đàm thoại trực tiếp ghi âm phân giải cao qua Gemini.
            </p>
          </div>

        </section>

      </main>

      {/* Manual Insert Transaction Dialog Backdrop */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="bg-zinc-900 px-4 py-3 flex justify-between items-center border-b border-zinc-800 shrink-0">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                <Database className="w-4 h-4 text-emerald-400" /> Thêm giao dịch [INSERT INTO]
              </span>
              <button
                onClick={() => { setIsManualModalOpen(false); setSplitMode(false); setSplitItems([]); }}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInsertManual} className="p-4 space-y-3.5 text-xs overflow-y-auto">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 block uppercase">Số tiền giao dịch (VND)</label>
                <input
                  type="number"
                  required
                  value={manualTx.amount}
                  onChange={(e) => setManualTx({ ...manualTx, amount: e.target.value })}
                  placeholder="Ví dụ: 150000"
                  className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Luồng giao dịch</label>
                  <select
                    value={manualTx.type}
                    onChange={(e: any) => setManualTx({ ...manualTx, type: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0"
                  >
                    <option value="expense">Chi tiêu (Expense)</option>
                    <option value="income">Thu nhập (Income)</option>
                    <option value="investment">Đầu tư (Investment)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Tài khoản Dim</label>
                  <select
                    value={manualTx.account_id}
                    onChange={(e) => setManualTx({ ...manualTx, account_id: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0"
                  >
                    {accounts.map(a => (
                      <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Split mode toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="split-toggle"
                  checked={splitMode}
                  onChange={e => {
                    setSplitMode(e.target.checked);
                    if (e.target.checked && splitItems.length === 0) {
                      setSplitItems([{ category_id: categories.filter(c => c.category_id !== 'split')[0]?.category_id || '', amount: '', note: '' }]);
                    }
                    if (!e.target.checked) setSplitItems([]);
                  }}
                  className="w-3.5 h-3.5 accent-amber-400 cursor-pointer"
                />
                <label htmlFor="split-toggle" className="text-[10px] font-bold text-amber-400 uppercase cursor-pointer">
                  ⑂ Chia nhiều danh mục (Split)
                </label>
              </div>

              {/* Single category (non-split mode) */}
              {!splitMode && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Danh mục Dim</label>
                  <select
                    value={manualTx.category_id}
                    onChange={(e) => setManualTx({ ...manualTx, category_id: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0"
                  >
                    {categories.filter(c => c.category_id !== 'split').map(c => (
                      <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Split rows (split mode) */}
              {splitMode && (
                <div className="space-y-2 border border-amber-800/30 bg-amber-950/10 rounded-lg p-3">
                  {splitItems.map((s, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Danh mục {idx + 1}</span>
                        {splitItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSplitItems(prev => prev.filter((_, i) => i !== idx))}
                            className="text-zinc-600 hover:text-rose-400 text-[10px] cursor-pointer"
                          >
                            ✕ Xóa
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={s.category_id}
                          onChange={e => setSplitItems(prev => prev.map((item, i) => i === idx ? { ...item, category_id: e.target.value } : item))}
                          className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none text-xs"
                        >
                          {categories.filter(c => c.category_id !== 'split').map(c => (
                            <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Số tiền"
                          value={s.amount}
                          onChange={e => setSplitItems(prev => prev.map((item, i) => i === idx ? { ...item, amount: e.target.value } : item))}
                          className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Ghi chú (tuỳ chọn)"
                        value={s.note}
                        onChange={e => setSplitItems(prev => prev.map((item, i) => i === idx ? { ...item, note: e.target.value } : item))}
                        className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSplitItems(prev => [...prev, { category_id: categories.filter(c => c.category_id !== 'split')[0]?.category_id || '', amount: '', note: '' }])}
                    className="text-[10px] text-amber-400 border border-amber-800/40 px-2 py-1 rounded hover:bg-amber-500/10 transition-all cursor-pointer"
                  >
                    ＋ Thêm danh mục
                  </button>
                  {/* Running total indicator */}
                  {(() => {
                    const splitTotal = splitItems.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                    const parentAmt = Number(manualTx.amount) || 0;
                    const match = parentAmt > 0 && splitTotal === parentAmt;
                    const diff = parentAmt - splitTotal;
                    return (
                      <div className={`text-[10px] font-mono pt-1 ${match ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Đã phân bổ: {formatCurrency(splitTotal)} / {formatCurrency(parentAmt)}
                        {' '}{match ? '✅ Khớp' : diff > 0 ? `❌ Còn thiếu ${formatCurrency(diff)}` : `❌ Vượt quá ${formatCurrency(-diff)}`}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 block uppercase">Nội dung ghi chú</label>
                <input
                  type="text"
                  required
                  value={manualTx.note}
                  onChange={(e) => setManualTx({ ...manualTx, note: e.target.value })}
                  placeholder="Ví dụ: Ăn bún chả"
                  className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0"
                />
              </div>

              {payees.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Payee (tuỳ chọn)</label>
                  <select
                    value={manualTx.payee_id ?? ''}
                    onChange={(e) => setManualTx({ ...manualTx, payee_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none text-xs"
                  >
                    <option value="">-- Không chọn payee --</option>
                    {payees.map(p => (
                      <option key={p.payee_id} value={p.payee_id}>{p.payee_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(() => {
                const splitTotal = splitItems.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                const submitDisabled = splitMode && splitItems.length > 0 && splitTotal !== Number(manualTx.amount);
                return (
                  <button
                    type="submit"
                    disabled={submitDisabled}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 p-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer text-center mt-2.5 block"
                  >
                    Thực thi Câu Lệnh INSERT
                  </button>
                );
              })()}

            </form>
          </div>
        </div>
      )}

      {/* Create Recurring Rule Form Modal */}
      {showRecurringForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-filter backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-zinc-900 px-4 py-3 flex justify-between items-center border-b border-zinc-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                <Calendar className="w-4 h-4 text-emerald-400" /> Thiết lập giao dịch định kỳ
              </span>
              <button
                onClick={() => setShowRecurringForm(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="p-4 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 block uppercase">Số tiền (VND)</label>
                <input
                  type="number"
                  required
                  value={newRecurring.amount}
                  onChange={(e) => setNewRecurring({ ...newRecurring, amount: e.target.value })}
                  placeholder="Ví dụ: 5000000"
                  className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none focus:ring-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Loại giao dịch</label>
                  <select
                    value={newRecurring.type}
                    onChange={(e: any) => setNewRecurring({ ...newRecurring, type: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0"
                  >
                    <option value="expense">Chi tiêu (Expense)</option>
                    <option value="income">Thu nhập (Income)</option>
                    <option value="investment">Đầu tư (Investment)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Tài khoản</label>
                  <select
                    value={newRecurring.account_id}
                    onChange={(e) => setNewRecurring({ ...newRecurring, account_id: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0"
                  >
                    {accounts.map(a => (
                      <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Danh mục</label>
                  <select
                    value={newRecurring.category_id}
                    onChange={(e) => setNewRecurring({ ...newRecurring, category_id: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0"
                  >
                    {categories.map(c => (
                      <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Tần suất</label>
                  <select
                    value={newRecurring.frequency}
                    onChange={(e: any) => setNewRecurring({ ...newRecurring, frequency: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0"
                  >
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="monthly">Hàng tháng</option>
                    <option value="yearly">Hàng năm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={newRecurring.next_run_date}
                    onChange={(e) => setNewRecurring({ ...newRecurring, next_run_date: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={newRecurring.end_date}
                    onChange={(e) => setNewRecurring({ ...newRecurring, end_date: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 block uppercase">Ghi chú</label>
                <input
                  type="text"
                  value={newRecurring.note}
                  onChange={(e) => setNewRecurring({ ...newRecurring, note: e.target.value })}
                  placeholder="Ví dụ: Đóng tiền nhà hàng tháng"
                  className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-0"
                />
              </div>

              {payees.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase">Payee (tuỳ chọn)</label>
                  <select
                    value={newRecurring.payee_id ?? ''}
                    onChange={(e) => setNewRecurring({ ...newRecurring, payee_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full bg-zinc-900 border border-zinc-800/80 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none text-xs"
                  >
                    <option value="">-- Không chọn payee --</option>
                    {payees.map(p => (
                      <option key={p.payee_id} value={p.payee_id}>{p.payee_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer text-center mt-2.5 block"
              >
                Lưu giao dịch định kỳ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Humble Footer containing licensing */}
      <footer className="shrink-0 w-full border-t border-zinc-900 bg-zinc-950 px-6 py-3 flex justify-between items-center text-[10px] text-zinc-500 z-40 select-none">
        <span>© 2026 Personal Finance AI Portfolio. All rights reserved.</span>
        <span className="font-mono">Created on Node.js + Express + React SPA</span>
      </footer>

    </div>
  );
}

function Root() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <AuthPage />;
  return <App />;
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  const inner = (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
  root.render(
    googleClientId
      ? <GoogleOAuthProvider clientId={googleClientId}>{inner}</GoogleOAuthProvider>
      : inner
  );
}
