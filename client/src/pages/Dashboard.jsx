import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import instance from '../axios';
import { Copy, Check, FileText, MessageSquare, List, Lock, Globe, Trash2, Edit3, Clock, Sparkles } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { demoForms } from '../utils/seedData';

const Dashboard = () => {
  const [forms, setForms] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [copiedFormId, setCopiedFormId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'published' | 'drafts'

  const buildShareUrl = (formId) => `${window.location.origin}/share/${formId}`;

  const copyShareLink = async (formId) => {
    const url = buildShareUrl(formId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedFormId(formId);
      setTimeout(() => setCopiedFormId(''), 1800);
    } catch (error) {
      console.error('Copy failed:', error);
      window.prompt('Copy this share link:', url);
    }
  };

  const deleteForm = async (formId) => {
    const confirmed = window.confirm('Delete this form and all of its responses?');
    if (!confirmed) return;

    try {
      await instance.delete(`/api/forms/${formId}`);
      setForms((prev) => prev.filter((form) => form._id !== formId));
    } catch (error) {
      console.error('Delete failed:', error);
      const status = error?.response?.status;
      const message = error?.response?.data?.error || error?.message || 'Unknown error';
      window.alert(`Unable to delete the form right now. ${status ? `(${status}) ` : ''}${message}`);
    }
  };

  const deleteDraft = async (draftKey) => {
    const confirmed = window.confirm('Discard this in-progress draft?');
    if (!confirmed) return;

    try {
      await instance.delete(`/api/drafts/${draftKey}`);
      setDrafts((prev) => prev.filter((d) => d.draftKey !== draftKey));
    } catch (error) {
      console.error('Delete draft failed:', error);
      alert('Unable to delete draft.');
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [formsRes, draftsRes] = await Promise.all([
        instance.get('/api/forms'),
        instance.get('/api/drafts').catch(() => ({ data: [] })),
      ]);
      setForms(formsRes.data || []);
      setDrafts(draftsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      for (const form of demoForms) {
        await instance.post('/api/forms', form);
      }
      const response = await instance.get('/api/forms');
      setForms(response.data);
      alert('Demo forms and responses successfully seeded! You can now analyze their data.');
    } catch (error) {
      console.error('Failed to seed demo data:', error);
      alert('Seeding failed: ' + (error?.response?.data?.error || error.message));
    } finally {
      setSeeding(false);
    }
  };

  const totalForms = forms.length;
  const totalDrafts = drafts.length;
  const totalResponses = forms.reduce((sum, form) => sum + (form.responseCount || 0), 0);
  const totalFields = forms.reduce((sum, form) => sum + (form.fields?.length || 0), 0);
  const encryptedForms = forms.filter((form) => (form.privacyMode ?? 'encrypted') === 'encrypted').length;

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredForms = normalizedQuery
    ? forms.filter((form) => {
        const nameMatch = String(form.name || '').toLowerCase().includes(normalizedQuery);
        const idMatch = String(form._id || '').toLowerCase().includes(normalizedQuery);
        return nameMatch || idMatch;
      })
    : forms;

  const filteredDrafts = normalizedQuery
    ? drafts.filter((draft) => {
        const nameMatch = String(draft.name || '').toLowerCase().includes(normalizedQuery);
        const keyMatch = String(draft.draftKey || '').toLowerCase().includes(normalizedQuery);
        return nameMatch || keyMatch;
      })
    : drafts;

  return (
    <div className="flex h-screen bg-[#f5f5f0] text-[#1a1a1a] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-[#1a1a1a] px-8 py-7 flex items-center justify-between">
          <div>
            <h1 className="font-crimson text-[52px] leading-none italic">Terminal Dashboard</h1>
            <p className="mt-2 text-[9px] uppercase tracking-[1px] text-[#4a4a4a]">Data Synthesis Environment</p>
          </div>
          <Link
            to="/app/forms/new"
            className="inline-flex items-center border border-[#1a1a1a] bg-[#1a1a1a] text-white px-7 py-2.5 text-[10px] font-semibold uppercase tracking-[2px] shadow-[1px_1px_0px_0px_black] hover:bg-[#333] transition-colors"
          >
            + New Structure
          </Link>
        </div>
        <div className="border-b border-[#1a1a1a] px-8 py-2.5 text-[9px] uppercase tracking-[1.8px] text-[#4a4a4a] flex items-center justify-between">
          <span>Encryption protocol active: analysis restricted to authorized structural metadata.</span>
          <span className="font-mono-lite">{totalDrafts} Draft{totalDrafts === 1 ? '' : 's'} in progress</span>
        </div>

        <div className="px-10 pt-8 pb-10">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[5px] text-[#4a4a4a]">Systems / Terminal / Home</div>
              <div className="font-crimson text-[72px] font-light tracking-[-3.6px]">Terminal Dashboard</div>
              <div className="mt-4 border-l-2 border-[#1a1a1a] pl-6 text-[18px] text-[#4a4a4a]">
                Manage architectural data structures, in-progress drafts, and encrypted communication channels.
              </div>
            </div>
            <Link
              to="/app/forms/new"
              className="bg-[#1a1a1a] px-10 py-5 text-[12px] uppercase tracking-[2.4px] text-white shadow-[1px_1px_0px_0px_black] hover:bg-[#333] transition-colors"
            >
              Create Form
            </Link>
          </div>

          {/* Stat Metrics Grid */}
          <div className="mt-12 grid grid-cols-4 border border-[#1a1a1a] bg-white">
            {[
              { label: 'Live Forms', value: totalForms.toLocaleString(), sub: 'Active Published', hint: 'Live' },
              { label: 'Drafts', value: totalDrafts.toLocaleString(), sub: 'In-Progress Schemas', hint: totalDrafts > 0 ? 'Unpublished' : 'None' },
              { label: 'Submissions', value: totalResponses.toLocaleString(), sub: 'Total Ingested Records', hint: `${forms.reduce((sum, form) => sum + (form.encryptedResponseCount || 0), 0)} Encrypted` },
              { label: 'Integrity', value: `${encryptedForms}/${totalForms || 0}`, sub: 'AES-256 Protected', hint: totalForms === encryptedForms ? '100% Enc' : 'Mixed' },
            ].map((item) => (
              <div key={item.label} className="border-r border-[#1a1a1a] p-8 last:border-r-0">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[1px] text-[#4a4a4a]">
                  <span>{item.label}</span>
                  <span className="font-mono-lite">{item.hint}</span>
                </div>
                <div className="mt-8 font-crimson text-[36px]">{item.value}</div>
                <div className="mt-2 text-[9px] uppercase tracking-[2.7px] opacity-50">{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Search & Filter Tabs */}
          <div className="mt-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full max-w-[520px]">
              <div className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 border border-[#1a1a1a]" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-none bg-transparent pl-8 text-[14px] text-[#1a1a1a] outline-none placeholder:text-[#1a1a1a]/40"
                placeholder="Search by form name, draft, or id..."
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center border border-[#1a1a1a] bg-white p-1 shadow-[1px_1px_0px_0px_black]">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-4 py-1.5 text-[10px] uppercase tracking-[1.5px] font-semibold transition-colors ${
                  filterTab === 'all' ? 'bg-[#1a1a1a] text-white' : 'text-[#4a4a4a] hover:bg-[#f5f5f0]'
                }`}
              >
                All ({forms.length + drafts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('published')}
                className={`px-4 py-1.5 text-[10px] uppercase tracking-[1.5px] font-semibold transition-colors ${
                  filterTab === 'published' ? 'bg-[#1a1a1a] text-white' : 'text-[#4a4a4a] hover:bg-[#f5f5f0]'
                }`}
              >
                Live Forms ({forms.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('drafts')}
                className={`px-4 py-1.5 text-[10px] uppercase tracking-[1.5px] font-semibold transition-colors flex items-center gap-1.5 ${
                  filterTab === 'drafts' ? 'bg-[#1a1a1a] text-white' : 'text-[#4a4a4a] hover:bg-[#f5f5f0]'
                }`}
              >
                <span>Drafts ({drafts.length})</span>
                {drafts.length > 0 && (
                  <span className={`inline-block w-2 h-2 rounded-full ${filterTab === 'drafts' ? 'bg-amber-400' : 'bg-amber-600'}`} />
                )}
              </button>
            </div>
          </div>

          {normalizedQuery && (
            <div className="mt-3 text-[9px] uppercase tracking-[1px] text-[#4a4a4a]">
              Query: &ldquo;{searchTerm}&rdquo; · {filteredForms.length} live form{filteredForms.length === 1 ? '' : 's'}, {filteredDrafts.length} draft{filteredDrafts.length === 1 ? '' : 's'}
            </div>
          )}

          {/* DRAFTS SECTION (Shown when tab is 'all' or 'drafts') */}
          {(filterTab === 'all' || filterTab === 'drafts') && filteredDrafts.length > 0 && (
            <div className="mt-12 border border-[#1a1a1a] bg-white">
              <div className="flex items-center justify-between border-b border-[#1a1a1a] px-6 py-4 bg-[#faf9f5]">
                <div className="flex items-center gap-3">
                  <div className="font-crimson text-[24px]">In-Progress Drafts</div>
                  <span className="border border-[#1a1a1a] bg-amber-100 text-[#1a1a1a] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[1px]">
                    {filteredDrafts.length} Draft{filteredDrafts.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="text-[10px] uppercase tracking-[1px] text-[#4a4a4a]">
                  Unpublished Form Schemas
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
                {filteredDrafts.map((draft) => {
                  const isEncrypted = (draft.privacyMode ?? 'encrypted') === 'encrypted';
                  const dateStr = draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently';

                  return (
                    <div key={draft._id || draft.draftKey} className="border border-dashed border-[#1a1a1a] bg-[#fcfcf9] p-6 shadow-[1px_1px_0px_0px_black] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#ecece0] pb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-amber-700" />
                            <span className="text-[9px] uppercase tracking-[1.5px] font-semibold text-amber-800">Draft Schema</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteDraft(draft.draftKey)}
                            className="inline-flex h-7 w-7 items-center justify-center border border-[#1a1a1a]/30 hover:border-[#1a1a1a] hover:bg-red-50 text-[#1a1a1a] transition-colors"
                            aria-label={`Discard ${draft.name}`}
                            title="Discard draft"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </button>
                        </div>

                        <div className="mt-4 font-crimson text-[22px] truncate" title={draft.name}>
                          {draft.name || 'Untitled Draft'}
                        </div>
                        <div className="mt-1 text-[9px] uppercase tracking-[1px] text-[#4a4a4a]">
                          Key: {draft.draftKey} · Saved {dateStr}
                        </div>

                        <div className="mt-4 grid grid-cols-2 border border-[#ecece0] bg-white p-3 text-center text-[10px]">
                          <div>
                            <div className="text-[8px] uppercase tracking-[1px] text-[#4a4a4a]">Fields</div>
                            <div className="mt-1 font-semibold text-[13px]">{draft.fieldsCount || 0}</div>
                          </div>
                          <div className="border-l border-[#ecece0]">
                            <div className="text-[8px] uppercase tracking-[1px] text-[#4a4a4a]">Privacy Mode</div>
                            <div className="mt-1 font-semibold text-[13px]">{isEncrypted ? '🔒 Encrypted' : '🌐 Open'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <Link
                          to={`/app/forms/new?draft=${draft.draftKey}`}
                          className="inline-flex w-full items-center justify-center gap-2 bg-[#1a1a1a] py-3 text-[10px] font-semibold uppercase tracking-[2px] text-white shadow-[1px_1px_0px_0px_black] hover:bg-[#333] transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Resume Draft</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIVE FORMS SECTION (Shown when tab is 'all' or 'published') */}
          {(filterTab === 'all' || filterTab === 'published') && (
            <div className="mt-12 border border-[#1a1a1a] bg-white">
              <div className="flex items-center justify-between border-b border-[#1a1a1a] px-6 py-4">
                <div className="font-crimson text-[24px]">Published Structures</div>
                <div className="text-[10px] uppercase tracking-[1px] text-[#4a4a4a]">
                  {filteredForms.length} Active Form{filteredForms.length === 1 ? '' : 's'}
                </div>
              </div>

              {loading ? (
                <div className="p-10 text-[12px] uppercase tracking-[2px] text-[#4a4a4a]">Loading forms...</div>
              ) : forms.length === 0 ? (
                <div className="p-12 bg-[#f9f9f5]">
                  <div className="max-w-[720px]">
                    <h3 className="font-crimson text-[30px] italic leading-none">Initialize Your Data Node</h3>
                    <p className="mt-4 text-[13px] leading-6 text-[#4a4a4a]">
                      Your workspace has no published forms yet. Start by building a custom form, or immediately seed your environment with pre-populated demo structures to evaluate vector semantic retrieval.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                      <button
                        type="button"
                        disabled={seeding}
                        onClick={handleSeedDemoData}
                        className="bg-[#1a1a1a] px-8 py-4 text-[10px] font-semibold uppercase tracking-[2px] text-white shadow-[1px_1px_0px_0px_black] hover:bg-[#333] transition-colors"
                      >
                        {seeding ? 'Seeding Nodes...' : 'Seed Demo Datasets'}
                      </button>
                      <Link
                        to="/app/forms/new"
                        className="border border-[#1a1a1a] px-8 py-4 text-[10px] font-semibold uppercase tracking-[2px] hover:bg-[#1a1a1a]/5 transition-colors"
                      >
                        Create Custom Schema
                      </Link>
                    </div>
                  </div>
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="p-10 text-[12px] uppercase tracking-[2px] text-[#4a4a4a]">No live forms match this search query</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
                  {filteredForms.map((form) => {
                    const isEncrypted = (form.privacyMode ?? 'encrypted') === 'encrypted';
                    return (
                      <div key={form._id} className="border border-[#1a1a1a] bg-[#f9f9f5] shadow-[1px_1px_0px_0px_black] flex flex-col justify-between">
                        <div>
                          <div className="border-b border-[#f0f0e8] p-6">
                            <div className="flex items-center justify-between">
                              <FileText className="h-4 w-4" />
                              <div className="flex items-center gap-2">
                                <div className="border border-[#1a1a1a] px-2.5 py-0.5 text-[9px] uppercase tracking-[1.5px] font-semibold bg-emerald-50 text-emerald-900 border-emerald-700">Live</div>
                                <Link
                                  to={`/app/forms/${form._id}/edit`}
                                  className="inline-flex h-7 w-7 items-center justify-center border border-[#1a1a1a] bg-[#f5f5f0] hover:bg-white"
                                  aria-label={`Edit ${form.name}`}
                                  title="Edit form structure"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => deleteForm(form._id)}
                                  className="inline-flex h-7 w-7 items-center justify-center border border-[#1a1a1a] bg-[#f5f5f0] hover:bg-red-50"
                                  aria-label={`Delete ${form.name}`}
                                  title="Delete form"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-6 font-crimson text-[24px] truncate" title={form.name}>{form.name}</div>
                            <div className="mt-2 text-[9px] uppercase tracking-[1px] opacity-50">
                              {form.updatedAt ? new Date(form.updatedAt).toLocaleDateString() : 'Active'}
                            </div>
                          </div>

                          <div className="border-b border-[#f0f0e8] px-6 py-4">
                            <div className="grid grid-cols-3 text-center">
                              <div>
                                <div className="flex flex-col items-center gap-1.5">
                                  <MessageSquare className="h-3 w-3 opacity-40" />
                                  <div className="text-[8px] uppercase tracking-[0.9px] opacity-50">Responses</div>
                                </div>
                                <div className="mt-1 font-semibold text-[13px]">{form.responseCount || 0}</div>
                              </div>
                              <div>
                                <div className="flex flex-col items-center gap-1.5">
                                  <List className="h-3 w-3 opacity-40" />
                                  <div className="text-[8px] uppercase tracking-[0.9px] opacity-50">Fields</div>
                                </div>
                                <div className="mt-1 font-semibold text-[13px]">{form.fields?.length || 0}</div>
                              </div>
                              <div>
                                <div className="flex flex-col items-center gap-1.5">
                                  {isEncrypted ? <Lock className="h-3 w-3 opacity-40" /> : <Globe className="h-3 w-3 opacity-40" />}
                                  <div className="text-[8px] uppercase tracking-[0.9px] opacity-50">Mode</div>
                                </div>
                                <div className="mt-1 font-semibold text-[13px]">{isEncrypted ? 'Enc' : 'Open'}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-white/50">
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Link
                                to={`/app/forms/${form._id}`}
                                className="inline-flex w-full items-center justify-center bg-[#1a1a1a] py-2.5 text-[10px] uppercase tracking-[2px] text-white shadow-[1px_1px_0px_0px_black] hover:bg-[#333] transition-colors"
                              >
                                Analytics
                              </Link>
                              <Link
                                to={`/app/forms/${form._id}/edit`}
                                className="inline-flex w-full items-center justify-center border border-[#1a1a1a] bg-white py-2.5 text-[10px] uppercase tracking-[2px] shadow-[1px_1px_0px_0px_black] hover:bg-[#f5f5f0] transition-colors"
                              >
                                Edit Form
                              </Link>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyShareLink(form._id)}
                              className="inline-flex w-full items-center justify-center gap-2 border border-[#1a1a1a] bg-[#f5f5f0] py-2 text-[10px] uppercase tracking-[2px] hover:bg-white transition-colors"
                            >
                              {copiedFormId === form._id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              <span>{copiedFormId === form._id ? 'Copied Link' : 'Copy Share Link'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Empty state when filtering drafts tab and no drafts exist */}
          {filterTab === 'drafts' && drafts.length === 0 && (
            <div className="mt-12 border border-[#1a1a1a] bg-white p-12 text-center">
              <h3 className="font-crimson text-[28px] italic">No In-Progress Drafts</h3>
              <p className="mt-3 text-[13px] text-[#4a4a4a]">All your form designs have been published or discarded.</p>
              <Link
                to="/app/forms/new"
                className="mt-6 inline-flex bg-[#1a1a1a] px-8 py-3 text-[10px] font-semibold uppercase tracking-[2px] text-white"
              >
                Start New Draft
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
