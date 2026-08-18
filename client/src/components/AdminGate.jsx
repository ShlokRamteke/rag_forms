import { useEffect, useState } from "react";
import {
  Show,
  SignInButton,
  SignUpButton,
  useClerk,
  useAuth,
  useUser,
} from "@clerk/react";
import { setAuthTokenGetter } from "../axios";

const AdminGate = ({ children }) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [showTimeoutHelp, setShowTimeoutHelp] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    if (isLoaded) {
      setShowTimeoutHelp(false);
      return;
    }
    const timer = setTimeout(() => setShowTimeoutHelp(true), 7000);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (!publishableKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f0] p-6 text-[#1a1a1a]">
        <div className="w-full max-w-[620px] border border-[#1a1a1a] bg-[#f5f5f0] p-8">
          <h1 className="font-crimson text-[42px] leading-none italic">Clerk is not configured</h1>
          <p className="mt-4 text-[12px] leading-6">
            Add <span className="font-mono-lite">VITE_CLERK_PUBLISHABLE_KEY</span> in
            <span className="font-mono-lite"> client/.env.local </span>
            (or <span className="font-mono-lite">client/.env</span>) and restart Vite.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f0] p-6 text-[#1a1a1a]">
        <div className="w-full max-w-[620px] border border-[#1a1a1a] bg-[#f5f5f0] px-8 py-7">
          <div className="text-[10px] uppercase tracking-[2px]">Initializing authentication...</div>
          {showTimeoutHelp && (
            <div className="mt-5 border-t border-[#1a1a1a] pt-5 text-[12px] leading-6 text-[#4a4a4a]">
              <div className="font-semibold uppercase tracking-[1px]">Still loading</div>
              <div className="mt-2">1) Restart frontend server after updating env values.</div>
              <div>2) Check browser console for blocked requests to Clerk.</div>
              <div>3) Disable ad/tracker blockers for localhost.</div>
              <div>4) Ensure your Clerk app allows <span className="font-mono-lite">http://localhost:5173</span>.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    const accountLabel =
      user?.primaryEmailAddress?.emailAddress || user?.username || "authorized";
    const accountInitial =
      user?.firstName?.[0] ||
      user?.username?.[0] ||
      user?.primaryEmailAddress?.emailAddress?.[0] ||
      "A";

    return (
      <div className="relative">
        <div className="fixed bottom-6 right-6 z-50">
          {isAccountOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1a1a]/30 p-6">
              <button
                aria-label="Close account modal"
                type="button"
                className="absolute inset-0 cursor-default"
                onClick={() => setIsAccountOpen(false)}
              />
              <div className="relative z-[61] w-full max-w-[360px] border border-[#1a1a1a] bg-[#f5f5f0] px-5 py-4 text-[#1a1a1a] shadow-[1px_1px_0px_0px_black]">
                <div className="text-[8px] uppercase tracking-[1px] text-[#4a4a4a]">Authenticated</div>
                <div className="mt-1 max-w-[320px] truncate font-mono-lite text-[11px]">{accountLabel}</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAccountOpen(false)}
                    className="w-full border border-[#1a1a1a] px-3 py-2 text-[9px] uppercase tracking-[1.5px]"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => clerk.signOut({ redirectUrl: "/" })}
                    className="w-full border border-[#1a1a1a] bg-[#1a1a1a] px-3 py-2 text-[9px] uppercase tracking-[1.5px] text-[#f5f5f0]"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            aria-label="Account"
            onClick={() => setIsAccountOpen((prev) => !prev)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#1a1a1a] text-[16px] uppercase text-[#f5f5f0] shadow-[1px_1px_0px_0px_black]"
          >
            {accountInitial}
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f0] p-6 text-[#1a1a1a]">
      <div className="w-full max-w-[520px] border border-[#1a1a1a] bg-[#f5f5f0]">
        <div className="border-b border-[#1a1a1a] px-8 py-7">
          <div className="text-[9px] uppercase tracking-[2px] text-[#4a4a4a]">System Core v4.0.2</div>
          <h1 className="mt-3 font-crimson text-[42px] leading-none italic">Admin Access</h1>
          <p className="mt-3 text-[10px] uppercase tracking-[1px] text-[#4a4a4a]">
            Secure management gateway
          </p>
        </div>

        <div className="space-y-4 px-8 py-8">
          <p className="text-[10px] uppercase tracking-[1px] text-[#4a4a4a]">
            Authenticate with Clerk to unlock form management and analysis.
          </p>

          <Show when="signed-out">
            <div className="grid grid-cols-1 gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full border border-[#1a1a1a] bg-[#1a1a1a] px-4 py-3 text-[10px] uppercase tracking-[2px] text-[#f5f5f0]"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full border border-[#1a1a1a] px-4 py-3 text-[10px] uppercase tracking-[2px]"
                >
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </Show>
        </div>

        <div className="border-t border-[#1a1a1a] px-8 py-4 text-[8px] uppercase tracking-[0.8px] text-[#4a4a4a]">
          Status: Secure · Node: Stark_01
        </div>
      </div>
    </div>
  );
};

export default AdminGate;
