import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import instance, { getAuthToken } from '../axios';
import { Send, Bot, User, Square, ArrowLeft, Table2, MessageSquare, Edit3, Trash2, Sparkles, Layers, X, Lightbulb, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Sidebar from '../components/Sidebar';
import ResponsesGrid from '../components/ResponsesGrid';

const MessageSources = ({ citations }) => {
    if (!Array.isArray(citations) || citations.length === 0) return null;

    const count = citations.length;
    const topScore = citations[0]?.score ? `${citations[0].score}% relevance` : null;
    const recordLabels = citations
        .slice(0, 5)
        .map((src, idx) => `#${src.recordNumber || idx + 1}`)
        .join(', ');

    return (
        <div className="mt-3 pt-2 border-t border-[#1a1a1a]/10 flex items-center justify-between text-[9px] uppercase tracking-[1px] text-[#737373] select-none">
            <span className="flex items-center gap-1.5 font-medium">
                <Database className="h-3 w-3 text-[#1a1a1a]" />
                <span>Synthesized from top {count} relevant submissions ({recordLabels})</span>
            </span>
            {topScore && (
                <span className="text-[8px] tracking-[0.5px] px-1.5 py-0.5 bg-[#1a1a1a]/5 text-[#1a1a1a] border border-[#1a1a1a]/15 font-semibold">
                    {topScore}
                </span>
            )}
        </div>
    );
};

const ChatInterface = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [citations, setCitations] = useState([]);
    const [showSchemaDrawer, setShowSchemaDrawer] = useState(false);
    const messagesEndRef = useRef(null);

    // Tabs: 'analyse' | 'responses'
    const [activeTab, setActiveTab] = useState('analyse');

    // Responses tab state
    const [responses, setResponses] = useState([]);
    const [responsesTotal, setResponsesTotal] = useState(0);
    const [responsesPage, setResponsesPage] = useState(1);
    const [responsesLoading, setResponsesLoading] = useState(false);
    const RESPONSES_LIMIT = 200;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (activeTab === 'analyse') {
            scrollToBottom();
        }
    }, [messages, loading, activeTab]);

    const fetchFormDetails = useCallback(async () => {
        try {
            const formRes = await instance.get(`/api/forms/${id}/admin`);
            setForm(formRes.data);

            try {
                const historyRes = await instance.get(`/api/forms/${id}/conversations`);
                if (Array.isArray(historyRes.data)) {
                    setMessages(historyRes.data.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })));
                }
            } catch (historyErr) {
                console.error('Failed to load chat history:', historyErr);
            }
        } catch (error) {
            console.error('Error fetching form details:', error);
            alert('Failed to load form. Redirecting to dashboard...');
            navigate('/app');
        }
    }, [id, navigate]);

    const handleClearHistory = async () => {
        if (!window.confirm('Clear conversation history for this form?')) return;
        setClearing(true);
        try {
            await instance.delete(`/api/forms/${id}/conversations`);
            setMessages([]);
            setCitations([]);
        } catch (err) {
            console.error('Failed to clear conversation history:', err);
            alert('Failed to clear conversation history.');
        } finally {
            setClearing(false);
        }
    };

    const fetchResponses = useCallback(async (page = 1) => {
        setResponsesLoading(true);
        try {
            const res = await instance.get(`/api/forms/${id}/responses`, {
                params: { page, limit: RESPONSES_LIMIT },
            });
            setResponses(res.data.responses || []);
            setResponsesTotal(res.data.total || 0);
            setResponsesPage(page);
        } catch (err) {
            console.error('Failed to load responses:', err);
        } finally {
            setResponsesLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchFormDetails();
    }, [fetchFormDetails]);

    useEffect(() => {
        if (activeTab === 'responses') {
            fetchResponses(responsesPage);
        }
    }, [activeTab, fetchResponses, responsesPage]);

    const executeQuestion = async (questionText) => {
        if (!questionText || !questionText.trim() || loading) return;

        const question = questionText.trim();
        setInput('');
        setLoading(true);
        setCitations([]);

        // Append user question and placeholder for incoming streaming assistant response
        setMessages((prev) => [
            ...prev,
            { role: 'user', content: question },
            { role: 'assistant', content: '' }
        ]);

        try {
            const token = await getAuthToken();
            const baseUrl = import.meta.env.VITE_APP_API_URL || '';
            const response = await fetch(`${baseUrl}/api/analyze/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    formId: id,
                    question,
                }),
            });

            if (!response.ok) {
                // Fallback to standard non-streaming endpoint
                const fallbackRes = await instance.post('/api/analyze', {
                    formId: id,
                    question,
                });
                setMessages((prev) => {
                    const next = [...prev];
                    next[next.length - 1] = {
                        role: 'assistant',
                        content: fallbackRes.data.answer || 'No response generated.',
                    };
                    return next;
                });
                setCitations(fallbackRes.data.citations || []);
                return;
            }

            let messageCitations = [];
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const eventMatch = line.match(/^event:\s*(.+)$/m);
                    const dataMatch = line.match(/^data:\s*(.+)$/m);
                    const event = eventMatch ? eventMatch[1].trim() : 'message';
                    const dataRaw = dataMatch ? dataMatch[1].trim() : '';

                    if (!dataRaw) continue;

                    try {
                        const parsed = JSON.parse(dataRaw);
                        if (event === 'citations' && parsed.citations) {
                            messageCitations = parsed.citations;
                            setCitations(parsed.citations);
                            setMessages((prev) => {
                                const next = [...prev];
                                next[next.length - 1] = {
                                    ...next[next.length - 1],
                                    citations: parsed.citations,
                                };
                                return next;
                            });
                        } else if (event === 'chunk' && parsed.chunk) {
                            accumulatedText += parsed.chunk;
                            setMessages((prev) => {
                                const next = [...prev];
                                next[next.length - 1] = {
                                    role: 'assistant',
                                    content: accumulatedText,
                                    citations: messageCitations.length > 0 ? messageCitations : (next[next.length - 1]?.citations || []),
                                };
                                return next;
                            });
                        } else if (event === 'error') {
                            accumulatedText = `Error: ${parsed.error || 'Failed during streaming.'}`;
                            setMessages((prev) => {
                                const next = [...prev];
                                next[next.length - 1] = {
                                    role: 'assistant',
                                    content: accumulatedText,
                                    citations: messageCitations,
                                };
                                return next;
                            });
                        }
                    } catch (parseErr) {
                        console.warn('Error parsing SSE data:', parseErr);
                    }
                }
            }
        } catch (err) {
            console.error('Streaming error:', err);
            setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error analyzing that question.',
                };
                return next;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        executeQuestion(input);
    };

    const starterPrompts = [
        { label: "Summarize feedback", query: "Can you provide a summary of the overall responses and feedback?" },
        { label: "Key themes & patterns", query: "What are the most common patterns or recurring themes in the submissions?" },
        { label: "Complaints & issues", query: "Were there any critical issues, complaints, or negative feedback reported?" },
        { label: "Positive highlights", query: "What were the top highlights and most positive comments in the data?" },
    ];

    if (!form) return <div className="p-8 text-center text-[12px] uppercase tracking-[2px]">Loading...</div>;

    const fields = Array.isArray(form?.fields) && form.fields.length > 0
        ? form.fields
        : Array.isArray(form?.schema?.fields)
            ? form.schema.fields
            : [];
    const responseFields = fields.filter((field) => String(field?.type ?? '').toLowerCase() !== 'section');
    const isEncrypted = (form?.privacyMode ?? 'encrypted') === 'encrypted';
    const totalPages = Math.ceil(responsesTotal / RESPONSES_LIMIT);

    return (
        <div className="flex h-screen bg-[#f5f5f0] text-[#1a1a1a] overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 min-h-0">
                {/* Header */}
                <header className="border-b border-[#1a1a1a] px-8 py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/app')}
                            className="inline-flex h-9 w-9 items-center justify-center border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f5f0] transition-colors"
                            aria-label="Back to dashboard"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                            <h1 className="font-crimson text-[42px] leading-none italic">{form.name}</h1>
                            <p className="mt-1 text-[9px] uppercase tracking-[1px] text-[#4a4a4a]">
                                {responseFields.length} fields · {form.responseCount ?? 0} responses · {isEncrypted ? 'encrypted' : 'plaintext'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowSchemaDrawer((prev) => !prev)}
                            className={`inline-flex items-center gap-2 border border-[#1a1a1a] px-4 py-2 text-[10px] font-semibold uppercase tracking-[2px] transition-colors ${showSchemaDrawer ? 'bg-[#1a1a1a] text-[#f5f5f0]' : 'bg-white hover:bg-[#1a1a1a]/5'}`}
                            title="Inspect form fields and encryption schema"
                        >
                            <Layers className="h-3.5 w-3.5" />
                            Schema ({responseFields.length})
                        </button>
                        <Link
                            to={`/app/forms/${id}/edit`}
                            className="inline-flex items-center gap-2 border border-[#1a1a1a] bg-white px-5 py-2 text-[10px] font-semibold uppercase tracking-[2px] hover:bg-[#1a1a1a]/5 transition-colors"
                        >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit Form
                        </Link>
                    </div>
                </header>

                {/* Status bar */}
                <div className="border-b border-[#1a1a1a] px-8 py-2 text-[9px] uppercase tracking-[1.8px] text-[#4a4a4a] flex items-center gap-3 shrink-0">
                    <Square className="h-1.5 w-1.5 fill-current" />
                    {isEncrypted
                        ? 'Encryption protocol active — responses decrypted server-side for authorized admin view only.'
                        : 'Plaintext protocol active: full datasets available for analysis.'}
                </div>

                {/* Tab switcher */}
                <div className="border-b border-[#1a1a1a] flex items-center justify-between shrink-0">
                    <div className="flex">
                        <button
                            type="button"
                            onClick={() => setActiveTab('analyse')}
                            className={`flex items-center gap-2 px-8 py-3.5 text-[10px] font-semibold uppercase tracking-[2px] border-r border-[#1a1a1a] transition-colors ${activeTab === 'analyse' ? 'bg-[#1a1a1a] text-[#f5f5f0]' : 'hover:bg-[#1a1a1a]/5'}`}
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Analyse
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('responses')}
                            className={`flex items-center gap-2 px-8 py-3.5 text-[10px] font-semibold uppercase tracking-[2px] transition-colors ${activeTab === 'responses' ? 'bg-[#1a1a1a] text-[#f5f5f0]' : 'hover:bg-[#1a1a1a]/5'}`}
                        >
                            <Table2 className="h-3.5 w-3.5" />
                            Responses
                            {responsesTotal > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 text-[8px] ${activeTab === 'responses' ? 'bg-white/20' : 'bg-[#1a1a1a]/10'}`}>
                                    {responsesTotal}
                                </span>
                            )}
                        </button>
                    </div>

                    {activeTab === 'analyse' && messages.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearHistory}
                            disabled={clearing || loading}
                            className="mr-8 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[1.5px] text-[#4a4a4a] hover:text-[#1a1a1a] transition-colors disabled:opacity-40"
                            title="Clear conversation history"
                        >
                            <Trash2 className="h-3 w-3" />
                            {clearing ? 'Clearing...' : 'Clear Chat'}
                        </button>
                    )}
                </div>

                {/* ── MAIN CONTENT & OPTIONAL SCHEMA DRAWER ── */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* ── ANALYSE TAB ── */}
                    {activeTab === 'analyse' && (
                        <div className="flex-1 flex flex-col min-w-0 min-h-0">
                            <section className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
                                {/* Messages */}
                                {messages.length === 0 ? (
                                    <div className="mx-auto max-w-[840px] flex flex-col items-center justify-center min-h-[50vh] text-center">
                                        <div className="relative h-16 w-16 mb-4">
                                            <div className="absolute inset-1 border border-dashed border-[#1a1a1a] rotate-45" />
                                            <div className="absolute inset-4 border border-[#1a1a1a] rotate-45 flex items-center justify-center">
                                                <Sparkles className="h-4 w-4 text-[#1a1a1a] -rotate-45" />
                                            </div>
                                        </div>
                                        <h2 className="text-[14px] uppercase tracking-[3px] font-crimson font-semibold">Conversational Form Analyst</h2>
                                        <p className="mt-1.5 text-[10px] uppercase tracking-[1.2px] text-[#737373] max-w-[480px]">
                                            Ask any question in natural language or pick a suggestion below to start analyzing.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mx-auto max-w-[920px] space-y-6">
                                        {messages.map((msg, idx) => {
                                            const isLast = idx === messages.length - 1;
                                            const isStreaming = isLast && loading && msg.role === 'assistant';

                                            if (msg.role === 'assistant' && !msg.content && isStreaming) {
                                                return (
                                                    <div key={idx} className="flex gap-4 justify-start">
                                                        <div className="h-8 w-8 border border-[#1a1a1a] flex items-center justify-center shrink-0">
                                                            <Bot className="h-4 w-4" />
                                                        </div>
                                                        <div className="max-w-[82%] border border-[#1a1a1a] bg-[#f9f9f4] px-5 py-4 text-sm text-[#4a4a4a] animate-pulse">
                                                            Synthesizing response...
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    {msg.role !== 'user' && (
                                                        <div className="h-8 w-8 border border-[#1a1a1a] flex items-center justify-center shrink-0">
                                                            <Bot className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[82%] border px-5 py-4 text-sm leading-6 ${msg.role === 'user' ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f5f5f0]' : 'border-[#1a1a1a] bg-[#f9f9f4] text-[#1a1a1a]'}`}>
                                                        {msg.role === 'assistant' ? (
                                                            <div>
                                                                <div className="prose prose-sm max-w-none prose-headings:font-crimson prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5">
                                                                    <ReactMarkdown
                                                                        remarkPlugins={[remarkGfm]}
                                                                        components={{
                                                                            table: ({ node, ...props }) => (
                                                                                <div className="overflow-x-auto my-3 border border-[#1a1a1a] shadow-[1px_1px_0px_0px_black]">
                                                                                    <table className="w-full text-left text-xs border-collapse m-0" {...props} />
                                                                                </div>
                                                                            ),
                                                                            thead: ({ node, ...props }) => (
                                                                                <thead className="bg-[#1a1a1a] text-[#f5f5f0] uppercase text-[9px] tracking-[1px] font-semibold select-none" {...props} />
                                                                            ),
                                                                            th: ({ node, ...props }) => (
                                                                                <th className="py-2.5 px-3 border-r border-white/20 last:border-r-0 font-semibold bg-[#1a1a1a] text-[#f5f5f0]" {...props} />
                                                                            ),
                                                                            tbody: ({ node, ...props }) => (
                                                                                <tbody className="divide-y divide-[#1a1a1a]/15 bg-white [&>tr:hover]:bg-[#f9f9f4] [&>tr]:transition-colors" {...props} />
                                                                            ),
                                                                            tr: ({ node, ...props }) => (
                                                                                <tr {...props} />
                                                                            ),
                                                                            td: ({ node, ...props }) => (
                                                                                <td className="py-2.5 px-3 border-r border-[#1a1a1a]/10 last:border-r-0 text-xs text-[#1a1a1a]" {...props} />
                                                                            ),
                                                                        }}
                                                                    >
                                                                        {msg.content}
                                                                    </ReactMarkdown>
                                                                    {isStreaming && <span className="inline-block animate-pulse font-bold text-[#1a1a1a] ml-0.5">▍</span>}
                                                                </div>

                                                                {/* In-flow Non-Overlapping Sources Bar */}
                                                                <MessageSources citations={msg.citations} />
                                                            </div>
                                                        ) : (
                                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                                        )}
                                                    </div>
                                                    {msg.role === 'user' && (
                                                        <div className="h-8 w-8 border border-[#1a1a1a] bg-[#1a1a1a] text-[#f5f5f0] flex items-center justify-center shrink-0">
                                                            <User className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {citations.length > 0 && (
                                            <div className="pt-2 text-[9px] uppercase tracking-[1px] text-[#4a4a4a]">
                                                Sources indexed: {citations.length}
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </section>

                            {/* Chat input with docked prompt chips */}
                            <section className="border-t border-[#1a1a1a] px-8 py-5 shrink-0 bg-[#f5f5f0]">
                                <div className="mx-auto max-w-[920px]">
                                    {/* Prompts bar docked right above the input */}
                                    <div className="mb-3">
                                        <div className="flex items-center gap-2 mb-1.5 text-[8px] uppercase tracking-[1.5px] text-[#737373]">
                                            <Lightbulb className="h-3 w-3" />
                                            <span>Suggested queries</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {starterPrompts.map((p, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => executeQuestion(p.query)}
                                                    className="inline-flex items-center gap-1.5 border border-[#1a1a1a]/30 bg-white px-3 py-1.5 text-[10px] font-medium text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f5f5f0] transition-colors shadow-[1px_1px_0px_0px_black] disabled:opacity-40"
                                                >
                                                    <span>{p.label}</span>
                                                    <Send className="h-2.5 w-2.5 opacity-60" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <form onSubmit={handleSendMessage}>
                                        <div className="flex border border-[#1a1a1a] bg-[#1a1a1a]">
                                            <input
                                                type="text"
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                placeholder="Ask a question about your form responses..."
                                                className="h-14 flex-1 bg-transparent px-5 font-sans text-[13px] tracking-[0.2px] text-[#f5f5f0] placeholder:text-[#888888] outline-none"
                                            />
                                            <button
                                                type="submit"
                                                disabled={loading || !input.trim()}
                                                className="h-14 border-l border-[#f5f5f0] px-8 text-[10px] font-semibold uppercase tracking-[2px] text-[#f5f5f0] disabled:opacity-40"
                                            >
                                                {loading ? 'Running...' : (
                                                    <span className="inline-flex items-center gap-2">
                                                        Execute <Send className="h-3.5 w-3.5" />
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-[8px] uppercase tracking-[0.8px] text-[#737373]">
                                            <div className="flex items-center gap-3">
                                                <span>[01] Multi-turn memory</span>
                                                <span>[02] Vector synthesis</span>
                                            </div>
                                            <span>Stark-OS // 2026</span>
                                        </div>
                                    </form>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ── RESPONSES TAB ── */}
                    {activeTab === 'responses' && (
                        <section className="flex-1 min-h-0 flex flex-col px-8 py-8 overflow-hidden">
                            <div className="mx-auto max-w-[1200px] w-full flex-1 flex flex-col min-h-0">
                                <ResponsesGrid
                                    fields={responseFields}
                                    responses={responses}
                                    total={responsesTotal}
                                    page={responsesPage}
                                    totalPages={totalPages}
                                    onPageChange={(p) => setResponsesPage(p)}
                                    loading={responsesLoading}
                                    formId={id}
                                />
                            </div>
                        </section>
                    )}

                    {/* ── FORM SCHEMA INSPECTOR DRAWER ── */}
                    {showSchemaDrawer && (
                        <aside className="w-80 md:w-96 border-l border-[#1a1a1a] bg-[#f9f9f4] flex flex-col z-20 shrink-0 shadow-lg animate-in slide-in-from-right duration-200">
                            <div className="p-5 border-b border-[#1a1a1a] flex items-center justify-between bg-white">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-[#1a1a1a]" />
                                        <h3 className="font-crimson text-xl font-semibold italic">Form Schema</h3>
                                    </div>
                                    <p className="mt-0.5 text-[9px] uppercase tracking-[1px] text-[#737373]">
                                        {responseFields.length} fields · {isEncrypted ? 'encrypted intake' : 'plaintext intake'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowSchemaDrawer(false)}
                                    className="p-1.5 hover:bg-[#1a1a1a] hover:text-[#f5f5f0] border border-[#1a1a1a] transition-colors"
                                    aria-label="Close schema drawer"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                                <div className="text-[9px] uppercase tracking-[1.5px] text-[#4a4a4a] font-semibold mb-1">
                                    Fields Specification
                                </div>
                                {fields.map((field, idx) => {
                                    const type = String(field?.type ?? 'text').toLowerCase();
                                    if (type === 'section') {
                                        return (
                                            <div key={`drawer-schema-${idx}`} className="text-[#1a1a1a] text-[10px] uppercase font-bold pt-3 pb-1 border-t border-[#1a1a1a]/15">
                                                — {field.label ?? `Section ${idx + 1}`}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={`drawer-schema-${idx}`} className="border border-[#1a1a1a] bg-white p-3.5 shadow-[1px_1px_0px_0px_black]">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-[12px] font-semibold text-[#1a1a1a]">
                                                    {String(idx + 1).padStart(2, '0')}. {field.label || field.key || `Field ${idx + 1}`}
                                                </span>
                                                <span className="text-[8px] uppercase tracking-[1px] px-1.5 py-0.5 bg-[#1a1a1a]/5 text-[#1a1a1a] border border-[#1a1a1a]/20">
                                                    {type}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between text-[9px] uppercase tracking-[0.5px] text-[#737373]">
                                                <span>{field.required ? 'Required field' : 'Optional field'}</span>
                                                <span>{field.privacy || (isEncrypted ? 'encrypted' : 'plain')}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </aside>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChatInterface;
