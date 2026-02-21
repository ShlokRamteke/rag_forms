import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="bg-[#f5f5f0] text-[#1a1a1a]">
      <header className="border-b border-[#1a1a1a]">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-8">
          <div className="font-crimson text-2xl uppercase tracking-tight">RAG Forms</div>
          <nav className="hidden items-center gap-12 text-[10px] font-semibold uppercase tracking-[2px] sm:flex">
            <span>Product</span>
            <span>Pricing</span>
            <span>Security</span>
          </nav>
          <div className="flex items-center gap-8 text-[10px] font-semibold uppercase tracking-[2px]">
            <span>Login</span>
            <Link
              to="/app"
              className="border border-[#1a1a1a] bg-[#1a1a1a] px-[33px] py-[17px] text-[12px] tracking-[1.2px] text-[#f5f5f0]"
            >
              Build
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[#1a1a1a] px-8 py-32">
        <div className="mx-auto flex max-w-[1400px] items-start gap-16">
          <div className="max-w-[800px]">
            <div className="inline-flex border border-[#1a1a1a] px-[13px] py-[5px] text-[10px] font-semibold uppercase tracking-[1px]">
              Protocol v4.0 Active
            </div>
            <h1 className="font-crimson mt-12 text-[96px] leading-[100px] tracking-[-2.56px]">
              Architectural{" "}
              <span className="italic text-[#4a4a4a]">Integrity</span> for Data.
            </h1>
            <p className="mt-8 max-w-[560px] text-[20px] font-light leading-[32.5px] text-[#4a4a4a]">
              End-to-end encrypted collection frameworks. Stripped of vanity,
              optimized for absolute structural security.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                to="/app"
                className="border border-[#1a1a1a] bg-[#1a1a1a] px-[33px] py-[17px] text-[12px] font-semibold uppercase tracking-[1.2px] text-[#f5f5f0]"
              >
                Initialize Project
              </Link>
              <button className="border border-[#1a1a1a] px-[33px] py-[17px] text-[12px] font-semibold uppercase tracking-[1.2px]">
                Technical Specs
              </button>
            </div>
          </div>
          <div className="hidden w-[384px] items-end justify-end sm:flex">
            <div className="font-mono-lite text-[10px] uppercase leading-[20px] text-[#4a4a4a]">
              [01] Non-custodial
              <br />
              [02] Zero-knowledge
              <br />
              [03] Post-quantum ready
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#1a1a1a] bg-[#e5e5e0] px-8 py-24">
        <div className="mx-auto max-w-[1400px] border border-[#1a1a1a] bg-[#f5f5f0] p-12">
          <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-6">
            <div>
              <div className="text-[10px] uppercase tracking-[1px]">Workspace / Editor</div>
              <div className="font-crimson text-[30px] italic tracking-[-0.6px]">
                Structural Configuration
              </div>
            </div>
            <div className="flex gap-2">
              <span className="h-2 w-2 border border-[#1a1a1a]" />
              <span className="h-2 w-2 border border-[#1a1a1a] bg-[#1a1a1a]" />
            </div>
          </div>
          <div className="mt-12 flex gap-12">
            <div className="w-[60%] space-y-8">
              <div>
                <div className="text-[10px] uppercase tracking-[1px]">Frame Identification</div>
                <div className="mt-3 border border-[#1a1a1a] p-4 font-crimson text-[18px] italic">
                  Internal Security Audit - Sector 7
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[1px]">Encryption Layer</div>
                <div className="mt-3 border border-[#1a1a1a] p-4 text-[14px]">
                  Respondent-only (Locked)
                </div>
              </div>
              <div className="border border-dashed border-[#1a1a1a] p-12 text-center text-[10px] uppercase tracking-[1px]">
                Append Component
              </div>
            </div>
            <div className="w-[40%] border-l border-[#1a1a1a] pl-12">
              <div className="text-[10px] uppercase tracking-[1px]">Live Structural Analysis</div>
              <div className="mt-6 space-y-6">
                <div className="border-b border-[#1a1a1a] pb-4">
                  <div className="h-4 w-full bg-[#1a1a1a]" />
                  <div className="mt-2 h-4 w-[65%] bg-[#4a4a4a]" />
                </div>
                <div className="border border-[#1a1a1a] py-4" />
                <div className="border border-[#1a1a1a] py-4" />
                <button className="w-full bg-[#1a1a1a] py-4 text-[12px] uppercase tracking-[1.2px] text-[#f5f5f0] opacity-20">
                  Deploy Framework
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-8 py-24">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="font-crimson text-[72px] italic tracking-[-1.44px]">Foundational Pillars</h2>
          <div className="mt-4 h-px w-32 bg-[#1a1a1a]" />
          <div className="mt-10 grid grid-cols-1 border-l border-t border-[#1a1a1a] md:grid-cols-3">
            {[
              {
                title: "Absolute Privacy",
                body:
                  "Zero-knowledge infrastructure. We provide the architecture; you hold the keys. No intermediary can observe the data flow.",
              },
              {
                title: "Precision Builder",
                body:
                  "A brutalist approach to form creation. Every element serves a function. Clean logic, mathematical validation.",
              },
              {
                title: "Isolated Analysis",
                body:
                  "Local-first RAG processing. Analyze trends within your own secure perimeter without exporting sensitive identifiers.",
              },
            ].map((item) => (
              <div key={item.title} className="border-b border-r border-[#1a1a1a] p-12">
                <div className="font-crimson text-[30px] font-light">{item.title}</div>
                <p className="mt-6 text-[14px] font-light leading-[22.75px] text-[#4a4a4a]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1a1a1a] px-8 py-40 text-[#f5f5f0]">
        <div className="mx-auto max-w-[1400px] text-center">
          <h2 className="font-crimson text-[72px] italic tracking-[-1.92px]">Commit to the Protocol.</h2>
          <p className="mx-auto mt-6 max-w-[700px] text-[20px] font-light leading-[28px] opacity-70">
            Secure the perimeter of your data collection today. No vanity, just pure architectural security.
          </p>
          <div className="mt-10 flex justify-center gap-6">
            <Link
              to="/app"
              className="border border-[#f5f5f0] bg-[#f5f5f0] px-[49px] py-[21px] text-[10px] uppercase tracking-[1px] text-[#1a1a1a]"
            >
              Begin Initialization
            </Link>
            <button className="border border-[#f5f5f0] px-[49px] py-[21px] text-[10px] uppercase tracking-[1px]">
              Request Consultation
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1a1a1a] px-8 py-24">
        <div className="mx-auto max-w-[1400px] space-y-20">
          <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr]">
            <div>
              <div className="font-crimson text-[30px] uppercase tracking-[-0.6px]">RAG Forms</div>
              <p className="mt-4 max-w-[384px] text-[14px] font-light leading-[22.75px] text-[#4a4a4a]">
                The architectural standard for encrypted data collection. Built for teams that prioritize structural integrity over superficial polish.
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[1px]">System</div>
              <div className="mt-6 space-y-4 text-[11px] font-semibold uppercase tracking-[0.55px]">
                <div>Documentation</div>
                <div>Security Whitepaper</div>
                <div>API Reference</div>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[1px]">Company</div>
              <div className="mt-6 space-y-4 text-[11px] font-semibold uppercase tracking-[0.55px]">
                <div>Terms</div>
                <div>Privacy</div>
                <div>Contact</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#1a1a1a] pt-12 text-[10px] uppercase tracking-[1px] opacity-40">
            <div>© 2024 RAG Forms Protocol. All rights reserved.</div>
            <div className="flex gap-12">
              <div>Zero Knowledge</div>
              <div>Architectural Grade</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
