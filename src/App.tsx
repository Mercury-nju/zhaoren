import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUp,
  Archive,
  Check,
  ChevronRight,
  CircleHelp,
  History,
  Lightbulb,
  MessageSquare,
  Mic,
  Monitor,
  Plus,
  Search,
  Square,
  Users,
  UserRound,
  X,
  FileText,
  LayoutGrid,
  PencilLine,
  Headphones,
  RotateCcw,
  Menu,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  loadConversations,
  replyTo,
  saveConversations,
  type Conversation,
  type Message,
} from "./demo";
const navGroups = [
  {
    title: "工作",
    items: [
      { id: "chief", title: "找客户", icon: UserRound },
      { id: "office", title: "办公室", icon: Headphones },
      { id: "chat", title: "对话", icon: MessageSquare },
      { id: "agents", title: "Agent 中心", icon: Users },
      { id: "live", title: "实时工作", icon: Monitor },
    ],
  },
  {
    title: "我的资产",
    items: [{ id: "results", title: "成果中心", icon: Search }],
  },
  {
    title: "账号管理",
    items: [{ id: "strategy", title: "账号策略", icon: Lightbulb }],
  },
  {
    title: "问题反馈",
    items: [
      { id: "feedback", title: "我的建议", icon: PencilLine },
      { id: "support", title: "客服咨询", icon: UserRound },
    ],
  },
];
const examples = [
  [
    "有目标，帮我找",
    "从需求出发，寻找潜在客户",
    "帮我整理目标用户的需求，我想寻找：",
  ],
  [
    "有作品，从评论找",
    "从作品的讨论中发现需求",
    "我有一条作品链接，想从讨论中发现需求：",
  ],
  [
    "有名单，帮我核验",
    "判断用户是否符合目标",
    "我有一份演示名单，想核验的条件是：",
  ],
];
type SpeechResult = {
  results: {
    [key: number]: { [key: number]: { transcript: string }; isFinal: boolean };
    length: number;
  };
  resultIndex: number;
};
type SpeechEngine = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
export default function App() {
  const [page, setPage] = useState(
    new URLSearchParams(location.search).get("page") || "chief",
  );
  const [conversations, setConversations] =
    useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(
    new URLSearchParams(location.search).get("conversation"),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = drafts[activeId || "new"] || "";
  const setDraft = (value: string | ((previous: string) => string)) =>
    setDrafts((current) => ({
      ...current,
      [activeId || "new"]:
        typeof value === "function"
          ? value(current[activeId || "new"] || "")
          : value,
    }));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [archived, setArchived] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechEngine | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const active = conversations.find((item) => item.id === activeId);
  const messages = active?.messages || [];
  const listed = conversations
    .filter((item) => item.archived === archived)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  useEffect(() => {
    if (!saveConversations(conversations))
      setNotice("当前浏览器无法保存记录，本次会话仅在页面内保留。");
  }, [conversations]);
  useEffect(() => {
    const url = new URL(location.href);
    if (activeId) url.searchParams.set("conversation", activeId);
    else url.searchParams.delete("conversation");
    history.replaceState(null, "", url);
  }, [activeId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);
  useEffect(() => {
    if (!historyOpen) return;
    const outside = (event: PointerEvent) => {
      if (!historyRef.current?.contains(event.target as Node))
        setHistoryOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHistoryOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, [historyOpen]);
  useEffect(
    () => () => {
      clearTimeout(timeoutRef.current);
      speechRef.current?.stop();
    },
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const navigate = (id: string) => {
    setPage(id);
    setSidebarOpen(false);
    const url = new URL(location.href);
    url.searchParams.set("page", id);
    history.replaceState(null, "", url);
  };
  const newConversation = () => {
    if (sending) return;
    setActiveId(null);
    setDrafts((current) => ({ ...current, new: "" }));
    setHistoryOpen(false);
    inputRef.current?.focus();
  };
  const choose = (item: Conversation) => {
    setActiveId(item.id);
    setHistoryOpen(false);
  };
  const toggleArchive = () => {
    if (!active) return;
    setConversations((items) =>
      items.map((item) =>
        item.id === active.id ? { ...item, archived: !item.archived } : item,
      ),
    );
    setHistoryOpen(false);
    if (!active.archived) newConversation();
    else setArchived(false);
  };
  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending || active?.archived || draft.length > 5000) return;
    const id = active?.id || crypto.randomUUID();
    const now = Date.now();
    const user: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: now,
    };
    setActiveId(id);
    setDraft("");
    setSending(true);
    setConversations((items) =>
      active
        ? items.map((item) =>
            item.id === id
              ? { ...item, messages: [...item.messages, user], updatedAt: now }
              : item,
          )
        : [
            {
              id,
              title: text.slice(0, 36),
              archived: false,
              updatedAt: now,
              messages: [user],
            },
            ...items,
          ],
    );
    timeoutRef.current = setTimeout(() => {
      setConversations((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                messages: [
                  ...item.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: replyTo(text),
                    createdAt: Date.now(),
                  },
                ],
              }
            : item,
        ),
      );
      setSending(false);
    }, 700);
  };
  const stop = () => {
    clearTimeout(timeoutRef.current);
    setSending(false);
    setNotice("已停止演示回复");
  };
  const voice = () => {
    if (recording) {
      speechRef.current?.stop();
      return;
    }
    const Speech =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechEngine;
          webkitSpeechRecognition?: new () => SpeechEngine;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechEngine;
        }
      ).webkitSpeechRecognition;
    if (!Speech) {
      setNotice("当前浏览器不支持语音输入，请使用支持语音识别的浏览器。");
      return;
    }
    const engine = new Speech();
    engine.lang = "zh-CN";
    engine.interimResults = false;
    engine.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index++)
        if (event.results[index].isFinal)
          transcript += event.results[index][0].transcript;
      setDraft((value) => (value + transcript).slice(0, 5000));
    };
    engine.onend = () => setRecording(false);
    engine.onerror = () => {
      setRecording(false);
      setNotice("未能识别语音，请检查浏览器麦克风权限。");
    };
    speechRef.current = engine;
    try {
      engine.start();
      setRecording(true);
    } catch {
      setNotice("语音输入暂时无法启动。");
    }
  };
  const title =
    navGroups.flatMap((group) => group.items).find((item) => item.id === page)
      ?.title || "找客户";
  return (
    <div className="app-shell">
      <button
        className="mobile-menu icon-button"
        aria-label="展开导航"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu size={20} />
      </button>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <a
          className="brand"
          href="?page=chief"
          onClick={(event) => {
            event.preventDefault();
            navigate("chief");
          }}
          aria-label="SOKE 首页"
        >
          <img className="brand-mark" src="/logo-mark.svg" alt="" />
          <img className="brand-name" src="/wordmark.svg" alt="SOKE" />
        </a>
        <nav aria-label="主导航">
          {navGroups.map((group) => (
            <section className="nav-group" key={group.title}>
              <h2>{group.title}</h2>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={20} />
                  <span>{item.title}</span>
                </button>
              ))}
            </section>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="membership"
            onClick={() => setNotice("这是界面演示，不包含会员购买或支付。")}
          >
            <strong>
              SVIP <span>✦</span>
            </strong>
            <small>点击查看会员套餐</small>
            <span className="membership-action">查看 ›</span>
          </button>
          <button
            className="profile"
            onClick={() => setNotice("当前为本地演示账号，没有登录服务。")}
          >
            <span className="profile-avatar">U</span>
            <span>
              <strong>演示用户</strong>
              <small>本地体验</small>
            </span>
            <ChevronRight size={14} />
          </button>
        </div>
      </aside>
      <main className="main-panel">
        {page === "chief" ? (
          <>
            <header className="conversation-toolbar">
              <button
                className="new-button"
                disabled={sending}
                onClick={newConversation}
              >
                <Plus size={17} />
                新会话
              </button>
              <div ref={historyRef} className="history-anchor">
                <button
                  className={`history-button ${historyOpen ? "selected" : ""}`}
                  disabled={sending}
                  onClick={() => setHistoryOpen(!historyOpen)}
                  aria-expanded={historyOpen}
                  aria-haspopup="dialog"
                >
                  <History size={16} />
                  历史会话
                </button>
                {historyOpen && (
                  <div
                    className="history-panel"
                    role="dialog"
                    aria-label="历史会话"
                  >
                    <header>
                      <strong>历史会话</strong>
                      <button
                        className="icon-button"
                        aria-label="关闭历史会话"
                        onClick={() => setHistoryOpen(false)}
                      >
                        <X size={16} />
                      </button>
                    </header>
                    <div className="history-tabs">
                      <button
                        className={!archived ? "selected" : ""}
                        onClick={() => {
                          setArchived(false);
                          setVisibleCount(20);
                        }}
                      >
                        最近会话
                      </button>
                      <button
                        className={archived ? "selected" : ""}
                        onClick={() => {
                          setArchived(true);
                          setVisibleCount(20);
                        }}
                      >
                        已归档
                      </button>
                    </div>
                    <div className="history-list">
                      {listed.slice(0, visibleCount).map((item) => (
                        <button
                          className={`session-row ${item.id === activeId ? "current" : ""}`}
                          key={item.id}
                          onClick={() => choose(item)}
                        >
                          <span>{item.title}</span>
                          {item.id === activeId && <Check size={15} />}
                        </button>
                      ))}
                      {!listed.length && (
                        <p>
                          {archived
                            ? "暂无已归档会话"
                            : "发送第一条消息后，会话会保存在这里"}
                        </p>
                      )}
                      {listed.length > visibleCount && (
                        <button
                          className="load-more"
                          onClick={() => setVisibleCount((value) => value + 20)}
                        >
                          加载更多
                        </button>
                      )}
                    </div>
                    {active && (
                      <footer>
                        <button onClick={toggleArchive}>
                          {active.archived ? (
                            <RotateCcw size={14} />
                          ) : (
                            <Archive size={14} />
                          )}{" "}
                          {active.archived ? "恢复当前会话" : "归档当前会话"}
                        </button>
                      </footer>
                    )}
                  </div>
                )}
              </div>
              {active && (
                <span className="conversation-title" title={active.title}>
                  {active.title}
                  {active.archived ? " · 已归档" : ""}
                </span>
              )}
              <span className="demo-tag">交互演示</span>
            </header>
            <div className="conversation-layout">
              <div className="message-scroll">
                {!messages.length ? (
                  <section className="welcome">
                    <span className="eyebrow">从一个需求开始</span>
                    <h1>你想找什么样的客户？</h1>
                    <p>
                      告诉我你想找谁，或给我一条作品链接。
                      <br />
                      从公开内容中寻找线索，用真实表达核验需求。
                    </p>
                    <div className="examples">
                      {examples.map(([name, detail, prompt]) => (
                        <button
                          key={name}
                          onClick={() => {
                            setDraft(prompt);
                            inputRef.current?.focus();
                          }}
                        >
                          <strong>
                            {name}
                            <span>↗</span>
                          </strong>
                          <span>{detail}</span>
                        </button>
                      ))}
                    </div>
                    <small>不必写得很完整，我们可以边聊边明确。</small>
                  </section>
                ) : (
                  <div className="messages">
                    {messages.map((message, index) => (
                      <div
                        className={`message-row ${message.role}`}
                        key={message.id}
                      >
                        {(index === 0 ||
                          message.createdAt - messages[index - 1].createdAt >
                            300000) && (
                          <time>
                            {new Date(message.createdAt).toLocaleTimeString(
                              "zh-CN",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </time>
                        )}
                        <div className="bubble">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                    {sending && (
                      <div
                        className="typing"
                        role="status"
                        aria-label="正在生成演示回复"
                      >
                        <i />
                        <i />
                        <i />
                      </div>
                    )}
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <form className="composer-wrap" onSubmit={send}>
                {active?.archived && (
                  <div className="archive-notice">
                    此会话已归档。
                    <button type="button" onClick={toggleArchive}>
                      恢复会话
                    </button>
                    后继续对话。
                  </div>
                )}
                <div className={`composer ${recording ? "recording" : ""}`}>
                  <textarea
                    ref={inputRef}
                    aria-label="输入消息"
                    placeholder={recording ? "正在聆听…" : "输入消息"}
                    value={draft}
                    disabled={!!active?.archived}
                    maxLength={5000}
                    rows={1}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button
                    className={`icon-button voice-button ${recording ? "listening" : ""}`}
                    type="button"
                    aria-label={recording ? "停止语音输入" : "语音输入"}
                    aria-pressed={recording}
                    disabled={sending || !!active?.archived}
                    onClick={voice}
                  >
                    <Mic size={19} />
                  </button>
                  <button
                    className="send-button"
                    type={sending ? "button" : "submit"}
                    aria-label={sending ? "停止生成" : "发送消息"}
                    disabled={!sending && (!draft.trim() || !!active?.archived)}
                    onClick={sending ? stop : undefined}
                  >
                    {sending ? (
                      <Square size={13} fill="currentColor" />
                    ) : (
                      <ArrowUp size={18} />
                    )}
                  </button>
                </div>
                <div className="composer-meta">
                  <span>演示数据仅保存在当前浏览器</span>
                  <span>{draft.length} / 5000</span>
                </div>
              </form>
            </div>
          </>
        ) : (
          <section className="secondary-page">
            <header>
              <span className="eyebrow">工作空间</span>
              <h1>{title}</h1>
              <p>保留页面结构与交互，为你的新产品留出空间。</p>
            </header>
            {page === "feedback" || page === "support" ? (
              <form
                className="feedback-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setNotice("已记录本次演示操作，没有向外部发送。");
                }}
              >
                <label>
                  {page === "feedback" ? "你的建议" : "想咨询什么？"}
                  <textarea required placeholder="写下你的想法…" />
                </label>
                <button className="solid-button">
                  {page === "feedback" ? "提交建议" : "发送咨询"}
                </button>
              </form>
            ) : (
              <>
                <div className="stat-grid">
                  {[
                    ["项目", "0", LayoutGrid],
                    ["进行中", "0", Monitor],
                    ["已完成", "0", Check],
                  ].map(([name, count, Icon]) => {
                    const MetricIcon = Icon as typeof LayoutGrid;
                    return (
                      <div className="stat-card" key={String(name)}>
                        <MetricIcon size={19} />
                        <span>{String(name)}</span>
                        <strong>{String(count)}</strong>
                      </div>
                    );
                  })}
                </div>
                <div className="secondary-empty">
                  <FileText size={32} />
                  <h2>
                    从第一个
                    {page === "agents"
                      ? "Agent"
                      : page === "results"
                        ? "成果"
                        : "项目"}
                    开始
                  </h2>
                  <p>这里是可扩展的前端展示区域，所有操作均为本地演示。</p>
                  <button
                    className="solid-button"
                    onClick={() =>
                      setNotice("已触发演示操作，可在此接入新产品流程。")
                    }
                  >
                    <Plus size={16} />
                    创建{page === "agents" ? "Agent" : "项目"}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => navigate("chief")}
                  >
                    返回对话 <ChevronRight size={14} />
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
      {notice && (
        <div className="toast" role="status">
          <CircleHelp size={16} />
          {notice}
          <button
            className="icon-button"
            aria-label="关闭提示"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
