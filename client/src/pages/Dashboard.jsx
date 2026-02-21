import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import instance from '../axios';

const Dashboard = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await instance.get('/api/forms');
        setForms(response.data);
      } catch (error) {
        console.error('Error fetching forms:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
  }, []);

  const totalForms = forms.length;
  const totalFields = forms.reduce((sum, form) => sum + (form.fields?.length || 0), 0);

  return (
    <div className="flex min-h-screen bg-[#f5f5f0] text-[#1a1a1a]">
      <aside className="w-64 border border-[#1a1a1a] bg-[#1a1a1a] text-[#f5f5f0]">
        <div className="border-b border-[#333] px-8 py-8">
          <div className="text-[8px] uppercase tracking-[2.4px] opacity-50">Secure Protocol</div>
          <div className="font-crimson text-2xl tracking-[-0.6px]">RAG.Forms</div>
        </div>
        <div className="px-4 py-8">
          <div className="px-4 text-[9px] uppercase tracking-[3.6px] opacity-40">Navigation</div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-4 border-l-2 border-white bg-white/5 px-4 py-2 text-[12px] uppercase tracking-[1.2px]">
              Dashboard
            </div>
            <Link to="/app/forms/new" className="flex items-center gap-4 px-4 py-2 text-[12px] uppercase tracking-[1.2px] opacity-60">
              Create New
            </Link>
          </div>
        </div>
        <div className="mt-auto border-t border-[#333] px-8 py-8 text-[9px] uppercase tracking-[0.9px] opacity-50">
          Vault Capacity
          <div className="mt-4 h-px w-full bg-[#333]">
            <div className="h-px w-[65%] bg-white" />
          </div>
          <div className="mt-3 text-[10px] normal-case opacity-40">12.4 GB / 20 GB Encrypted</div>
        </div>
      </aside>

      <main className="flex-1">
        <div className="flex h-20 items-center justify-between border border-[#1a1a1a] bg-[#f5f5f0] px-10">
          <div className="relative w-full max-w-[520px]">
            <div className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 border border-[#1a1a1a]" />
            <input
              className="w-full border-none bg-transparent pl-8 text-[14px] text-[#1a1a1a]/30 outline-none"
              placeholder="Search Secure Database..."
            />
          </div>
          <div className="flex items-center gap-8">
            <div className="h-[14px] w-[10px] border border-[#1a1a1a]" />
            <div className="h-8 w-8 border border-[#1a1a1a] bg-[#1a1a1a]" />
          </div>
        </div>

        <div className="px-10 py-10">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[5px] text-[#4a4a4a]">Systems / Terminal / Home</div>
              <div className="font-crimson text-[72px] font-light tracking-[-3.6px]">Terminal Dashboard</div>
              <div className="mt-4 border-l-2 border-[#1a1a1a] pl-6 text-[18px] text-[#4a4a4a]">
                Manage architectural data structures and encrypted communication channels.
              </div>
            </div>
            <Link
              to="/app/forms/new"
              className="bg-[#1a1a1a] px-10 py-5 text-[12px] uppercase tracking-[2.4px] text-white shadow-[1px_1px_0px_0px_black]"
            >
              [ New Structure ]
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-4 border border-[#1a1a1a] bg-white">
            {[
              { label: 'Structures', value: totalForms, sub: 'Total Active Forms', delta: '+12', color: 'text-[#15803d]' },
              { label: 'Responses', value: '1,482', sub: 'Data Submissions', delta: '+8%', color: 'text-[#15803d]' },
              { label: 'Traffic', value: '8,941', sub: 'Total Views', delta: '-3%', color: 'text-[#b91c1c]' },
              { label: 'Integrity', value: 'E2E', sub: 'Security Protocol', delta: '', color: 'text-[#1a1a1a]' },
            ].map((item) => (
              <div key={item.label} className="border-r border-[#1a1a1a] p-8 last:border-r-0">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[1px] text-[#4a4a4a]">
                  <span>{item.label}</span>
                  {item.delta && <span className={`${item.color} font-mono-lite`}>{item.delta}</span>}
                </div>
                <div className="mt-8 font-crimson text-[36px]">{item.value}</div>
                <div className="mt-2 text-[9px] uppercase tracking-[2.7px] opacity-50">{item.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 border border-[#1a1a1a] bg-white">
            <div className="flex items-center justify-between border-b border-[#1a1a1a] px-6 py-4">
              <div className="font-crimson text-[24px]">Recent Forms</div>
              <div className="text-[10px] uppercase tracking-[1px] text-[#4a4a4a]">
                <span className="mr-4 opacity-60">List view</span>
                <span className="underline">Grid view</span>
              </div>
            </div>
            {loading ? (
              <div className="p-10 text-[12px] uppercase tracking-[2px] text-[#4a4a4a]">Loading...</div>
            ) : (
              <div className="grid grid-cols-3 gap-10 p-8">
                {forms.map((form) => (
                  <div key={form._id} className="border border-[#1a1a1a] bg-[#f9f9f5] shadow-[1px_1px_0px_0px_black]">
                    <div className="border-b border-[#f0f0e8] p-8">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-3 border border-[#1a1a1a]" />
                        <div className="border border-[#1a1a1a] px-3 py-1 text-[10px] uppercase tracking-[2px]">Active</div>
                      </div>
                      <div className="mt-10 font-crimson text-[24px]">{form.name}</div>
                      <div className="mt-4 text-[10px] uppercase tracking-[1px] opacity-40">Edited 2h ago</div>
                    </div>
                    <div className="border-b border-[#f0f0e8] px-8 py-8">
                      <div className="grid grid-cols-3 text-center">
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.9px] opacity-40">Responses</div>
                          <div className="mt-2 text-[14px]">{Math.max(totalFields, 0)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.9px] opacity-40">Fields</div>
                          <div className="mt-2 text-[14px]">{form.fields?.length || 0}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-[0.9px] opacity-40">Avg Time</div>
                          <div className="mt-2 text-[14px]">2:45</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <Link
                        to={`/app/forms/${form._id}`}
                        className="inline-flex w-full items-center justify-center bg-[#1a1a1a] py-3 text-[10px] uppercase tracking-[2px] text-white shadow-[1px_1px_0px_0px_black]"
                      >
                        Open Form
                      </Link>
                    </div>
                  </div>
                ))}
                <div className="flex min-h-[320px] items-center justify-center border border-[#1a1a1a] bg-white text-center">
                  <div className="text-[12px] uppercase tracking-[3.6px]">Initialize New Node</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
