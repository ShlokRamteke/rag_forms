import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

const Landing = () => {
  let isAuthenticated = false;
  let isLoading = false;

  const auth0Configured =
    import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID;

  if (auth0Configured) {
    try {
      const auth = useAuth0();
      isAuthenticated = auth.isAuthenticated;
      isLoading = auth.isLoading;
    } catch {
      // Auth0Provider not active
    }
  }

  return (
    <div className="bg-[#f5f5f0] text-[#1a1a1a]">
      <header className="border-b border-[#1a1a1a] px-8">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between">
          <div className="font-crimson text-2xl uppercase tracking-[-0.48px]">CipherForm</div>
          <nav className="hidden items-center gap-12 text-[10px] font-semibold uppercase tracking-[2px] md:flex">
            <a href="#product">Product</a>
            <a href="#pillars">Pillars</a>
            <a href="#security">Security</a>
          </nav>
          <div className="flex items-center gap-8 text-[10px] font-semibold uppercase tracking-[2px]">
            {!isLoading && !isAuthenticated && (
              <Link to="/app">Login</Link>
            )}
            {!isLoading && isAuthenticated && (
              <Link to="/app">Dashboard</Link>
            )}
            <Link
              to="/app/forms/new"
              className="border border-[#1a1a1a] bg-[#1a1a1a] px-[33px] py-[17px] text-[12px] tracking-[1.2px] text-[#f5f5f0]"
            >
              Build
            </Link>
          </div>
        </div>
      </header>

      <section id="product" className="border-b border-[#1a1a1a] px-8 py-20 lg:py-28">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_580px]">
          <div className="max-w-[800px]">
            <div className="inline-flex border border-[#1a1a1a] px-[13px] py-[5px] text-[10px] font-semibold uppercase tracking-[1px]">
              Protocol v4.0 Active
            </div>
            <h1 className="font-crimson mt-8 text-[60px] leading-[60px] tracking-[-1.8px] md:text-[96px] md:leading-[90px] md:tracking-[-2px] xl:text-[110px] xl:leading-[102px]">
              Architectural
              <span className="block italic text-[#4a4a4a]">Integrity</span>
              <span className="block italic">for Data.</span>
            </h1>
            <p className="mt-6 max-w-[560px] text-[18px] font-light leading-[28px] text-[#4a4a4a] md:text-[20px] md:leading-[32.5px]">
              End-to-end encrypted collection frameworks. Stripped of vanity, optimized for absolute structural security.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 pt-2">
              <Link
                to="/app/forms/new"
                className="border border-[#1a1a1a] bg-[#1a1a1a] px-[33px] py-[17px] text-[12px] font-semibold uppercase tracking-[1.2px] text-[#f5f5f0] hover:bg-[#333] transition-colors"
              >
                Initialize Project
              </Link>
              <Link
                to="/app"
                className="border border-[#1a1a1a] px-[33px] py-[17px] text-[12px] font-semibold uppercase tracking-[1.2px] hover:bg-[#1a1a1a]/5 transition-colors"
              >
                Terminal Sync
              </Link>
            </div>
          </div>

          <div className="relative border border-[#1a1a1a] bg-white p-3 shadow-[4px_4px_0px_0px_#1a1a1a]">
            {/* Technical corner crosshairs */}
            <div className="absolute -left-[5px] -top-[5px] h-3.5 w-3.5 border-l border-t border-[#1a1a1a]"></div>
            <div className="absolute -right-[5px] -top-[5px] h-3.5 w-3.5 border-r border-t border-[#1a1a1a]"></div>
            <div className="absolute -left-[5px] -bottom-[5px] h-3.5 w-3.5 border-l border-b border-[#1a1a1a]"></div>
            <div className="absolute -right-[5px] -bottom-[5px] h-3.5 w-3.5 border-r border-b border-[#1a1a1a]"></div>

            <div className="overflow-hidden border border-[#1a1a1a]/10 bg-[#f5f5f0]">
              <img
                src="/hero_schema_blueprint.jpg"
                alt="RAG Ingestion and Vector Storage Technical Schema"
                className="w-full grayscale contrast-[1.08] transition-all duration-700 hover:grayscale-0 hover:contrast-100"
              />
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-[#1a1a1a] pt-3 px-1 font-mono-lite text-[9px] uppercase tracking-[1.2px] text-[#4a4a4a]">
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span>[01] AES-256 Encrypted</span>
                <span>[02] Per-Field Privacy</span>
                <span>[03] Gemini Vector RAG</span>
              </div>
              <span className="shrink-0 font-semibold text-[#1a1a1a]">SYS_CORE_V4.0 // ACTIVE</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#1a1a1a] bg-[#e5e5e0] px-8 py-24">
        <div className="mx-auto max-w-[1400px] border border-[#1a1a1a] bg-[#f5f5f0] p-10">
          <div className="flex items-end justify-between border-b border-[#1a1a1a] pb-6">
            <div>
              <div className="text-[10px] uppercase tracking-[1px]">Workspace / Editor</div>
              <h2 className="font-crimson text-[30px] italic tracking-[-0.6px]">Structural Configuration</h2>
            </div>
            <div className="flex gap-2">
              <span className="h-2 w-2 border border-[#1a1a1a]" />
              <span className="h-2 w-2 border border-[#1a1a1a] bg-[#1a1a1a]" />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px]">
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1px]">Frame Identification</div>
                <div className="border border-[#1a1a1a] px-4 py-3 font-crimson text-[18px] italic">
                  Initialize your first form
                </div>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1px]">Encryption Layer</div>
                <div className="border border-[#1a1a1a] px-4 py-3 text-[14px]">Respondent-only (Locked)</div>
              </div>
              <Link
                to="/app/forms/new"
                className="flex w-full items-center justify-center border border-dashed border-[#1a1a1a] py-10 text-[10px] font-semibold uppercase tracking-[1px]"
              >
                Append Component
              </Link>
            </div>

            <div className="border-l border-[#1a1a1a] pl-8">
              <div className="mb-5 text-[10px] font-semibold uppercase tracking-[1px]">Live Structural Analysis</div>
              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-[9px] uppercase tracking-[1px]">Structures</div>
                  <div className="h-4 w-full bg-[#1a1a1a]" />
                </div>
                <div>
                  <div className="mb-2 text-[9px] uppercase tracking-[1px]">Response Throughput</div>
                  <div className="h-4 w-[60%] bg-[#4a4a4a]" />
                </div>
                <div className="border border-[#1a1a1a] px-4 py-3 text-[12px]">
                  Live admin metrics are available inside dashboard.
                </div>
                <div className="border border-[#1a1a1a] px-4 py-3 text-[12px]">
                  Open `/app` to access secure analytics.
                </div>
                <div className="border border-[#1a1a1a] bg-[#1a1a1a]/20 px-6 py-4 text-center text-[12px] font-semibold uppercase tracking-[1.2px]">
                  Deploy Framework
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#1a1a1a] bg-[#1a1a1a] px-8 py-24 text-[#f5f5f0]">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[540px_1fr]">
            <div className="relative order-2 border border-white/20 bg-[#1a1a1a] p-3 shadow-[4px_4px_0px_0px_rgba(245,245,240,0.15)] lg:order-1">
              <div className="absolute -left-[5px] -top-[5px] h-3.5 w-3.5 border-l border-t border-white/40"></div>
              <div className="absolute -right-[5px] -top-[5px] h-3.5 w-3.5 border-r border-t border-white/40"></div>
              <div className="absolute -left-[5px] -bottom-[5px] h-3.5 w-3.5 border-l border-b border-white/40"></div>
              <div className="absolute -right-[5px] -bottom-[5px] h-3.5 w-3.5 border-r border-b border-white/40"></div>

              <div className="overflow-hidden border border-white/5 bg-[#1a1a1a]">
                <img
                  src="/analysis_schema_blueprint.jpg"
                  alt="Retrieval-Augmented Generation & Vector Synthesis Schema"
                  className="w-full opacity-90 grayscale transition-all duration-700 hover:opacity-100 hover:grayscale-0"
                />
              </div>
              
              <div className="mt-3.5 flex items-center justify-between border-t border-white/20 pt-3 px-1 font-mono-lite text-[9px] uppercase tracking-[1.2px] text-white/50">
                <span>[PROT_RAG_V3]</span>
                <span>SECURE SEMANTIC SYNTHESIS</span>
              </div>
            </div>

            <div className="order-1 space-y-6 lg:order-2">
              <div className="inline-flex border border-white/20 px-[13px] py-[5px] text-[10px] font-semibold uppercase tracking-[1.5px] text-white/60">
                Analysis Engine
              </div>
              <h2 className="font-crimson text-[48px] leading-tight italic tracking-[-1px] md:text-[64px]">
                Semantic Retrieval Protocol
              </h2>
              <p className="text-[16px] font-light leading-[26px] text-white/70">
                CipherForm leverages Gemini Embeddings to index and query your datasets. Response payloads are partitioned, vectorized, and parsed inside isolated memory perimeters. 
              </p>
              <div className="border-l-2 border-[#f5f5f0] pl-6 py-1 text-[14px] italic text-white/60">
                "Compile complex, multi-variable insights in natural language without exposing raw database records to the querying terminal."
              </div>
              <div className="pt-4">
                <Link
                  to="/app"
                  className="inline-flex border border-white px-8 py-3.5 text-[10px] font-semibold uppercase tracking-[2px] text-white hover:bg-white hover:text-[#1a1a1a] transition-all"
                >
                  Inspect Synthesis Engine
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pillars" className="border-b border-[#1a1a1a] px-8 py-24">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="font-crimson text-[72px] italic tracking-[-1.44px]">Foundational Pillars</h2>
          <div className="mt-4 h-px w-32 bg-[#1a1a1a]" />
          <div className="mt-10 grid grid-cols-1 border-l border-t border-[#1a1a1a] md:grid-cols-3">
            {[
              {
                title: "AES-256 Encryption",
                body: "Authenticated GCM encryption at rest. Raw submission data is encrypted before saving to the database.",
              },
              {
                title: "Precision Builder",
                body: "A practical form builder where every field type has purpose-driven validation and structure.",
              },
              {
                title: "Isolated Analysis",
                body: "Analyze responses in your own admin environment without exposing sensitive identifiers.",
              },
            ].map((pillar) => (
              <div key={pillar.title} className="border-b border-r border-[#1a1a1a] p-12">
                <div className="font-crimson text-[30px] font-light">{pillar.title}</div>
                <p className="mt-6 text-[14px] font-light leading-[22.75px] text-[#4a4a4a]">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="bg-[#1a1a1a] px-8 py-24 text-[#f5f5f0]">
        <div className="mx-auto max-w-[1400px] text-center">
          <h2 className="font-crimson text-[72px] italic tracking-[-1.44px] md:text-[96px] md:tracking-[-1.92px]">Commit to the Protocol.</h2>
          <p className="mx-auto mt-6 max-w-[672px] text-[20px] font-light leading-[28px] opacity-70">
            Secure the perimeter of your data collection today. No vanity, just pure architectural security.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-6 pt-4">
            <Link
              to="/app/forms/new"
              className="border border-[#f5f5f0] bg-[#f5f5f0] px-[49px] py-[21px] text-[10px] font-semibold uppercase tracking-[1px] text-[#1a1a1a]"
            >
              Begin Initialization
            </Link>
            <Link
              to="/app"
              className="border border-[#f5f5f0] px-[49px] py-[21px] text-[10px] font-semibold uppercase tracking-[1px]"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1a1a1a] px-8 py-20">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-10 border-b border-[#1a1a1a] pb-12 md:grid-cols-[1fr_268px_268px]">
            <div>
              <div className="font-crimson text-[30px] uppercase">CipherForm</div>
              <p className="mt-6 max-w-[384px] text-[14px] font-light leading-[22.75px] text-[#4a4a4a]">
                The architectural standard for encrypted data collection. Built for teams that prioritize structural integrity.
              </p>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[1px]">System</div>
              <div className="mt-6 space-y-4 text-[11px] font-semibold uppercase tracking-[0.55px]">
                <Link className="block" to="/app">Dashboard</Link>
                <Link className="block" to="/app/forms/new">Form Builder</Link>
                <Link className="block" to="/app/forms/new">Public Intake Path</Link>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[1px]">Company</div>
              <div className="mt-6 space-y-4 text-[11px] font-semibold uppercase tracking-[0.55px]">
                <a className="block" href="#security">Security</a>
                <a className="block" href="#pillars">Architecture</a>
                <a className="block" href="#product">Product</a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-12 text-[10px] font-semibold uppercase tracking-[1px] text-[#4a4a4a]">
            <div>© 2026 CipherForm Protocol. All rights reserved.</div>
            <div className="flex gap-12">
              <span>AES-256-GCM Protection</span>
              <span>Architectural Grade</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
