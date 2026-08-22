import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { setAuthTokenGetter } from "../axios";

const AdminGate = ({ children }) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

  if (!domain || !clientId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f0] p-6 text-[#1a1a1a]">
        <div className="w-full max-w-[620px] border border-[#1a1a1a] bg-[#f5f5f0] p-8">
          <h1 className="font-crimson text-[42px] leading-none italic">Auth0 is not configured</h1>
          <p className="mt-4 text-[12px] leading-6">
            Add <span className="font-mono-lite">VITE_AUTH0_DOMAIN</span> and{" "}
            <span className="font-mono-lite">VITE_AUTH0_CLIENT_ID</span> in
            <span className="font-mono-lite"> client/.env.local </span>
            (or <span className="font-mono-lite">client/.env</span>) and restart Vite.
          </p>
        </div>
      </div>
    );
  }

  return <AdminGateInner>{children}</AdminGateInner>;
};

const AdminGateInner = ({ children }) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    getIdTokenClaims,
  } = useAuth0();

  const [showTimeoutHelp, setShowTimeoutHelp] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setAuthTokenGetter(async () => {
        try {
          if (import.meta.env.VITE_AUTH0_AUDIENCE?.trim()) {
            return await getAccessTokenSilently();
          }
          const claims = await getIdTokenClaims();
          return claims?.__raw || (await getAccessTokenSilently());
        } catch (err) {
          console.warn("Auth0 token fetch warning:", err);
          return null;
        }
      });
    } else {
      setAuthTokenGetter(null);
    }
    return () => setAuthTokenGetter(null);
  }, [isAuthenticated, getAccessTokenSilently, getIdTokenClaims]);

  useEffect(() => {
    if (!isLoading) {
      setShowTimeoutHelp(false);
      return;
    }
    const timer = setTimeout(() => setShowTimeoutHelp(true), 7000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleSignIn = () => {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname },
    });
  };

  const handleSignUp = () => {
    loginWithRedirect({
      appState: { returnTo: window.location.pathname },
      authorizationParams: { screen_hint: "signup" },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f0] p-6 text-[#1a1a1a]">
        <div className="w-full max-w-[620px] border border-[#1a1a1a] bg-[#f5f5f0] px-8 py-7">
          <div className="text-[10px] uppercase tracking-[2px]">Initializing authentication...</div>
          {showTimeoutHelp && (
            <div className="mt-5 border-t border-[#1a1a1a] pt-5 text-[12px] leading-6 text-[#4a4a4a]">
              <div className="font-semibold uppercase tracking-[1px]">Still loading</div>
              <div className="mt-2">1) Check that <span className="font-mono-lite">VITE_AUTH0_DOMAIN</span> and <span className="font-mono-lite">VITE_AUTH0_CLIENT_ID</span> are set.</div>
              <div>2) Check browser console for blocked requests.</div>
              <div>3) Ensure Auth0 dashboard Allowed Origins / Callbacks include current URL (<span className="font-mono-lite">{window.location.origin}</span>).</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const accountLabel = user?.email || user?.name || user?.nickname || "authorized";
    const accountInitial =
      user?.name?.[0] || user?.nickname?.[0] || user?.email?.[0] || "A";

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
                    onClick={() =>
                      logout({
                        logoutParams: { returnTo: window.location.origin },
                      })
                    }
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
            Authenticate with Auth0 to unlock form management and analysis.
          </p>

          {error && (
            <div className="border border-red-500 bg-red-50 p-3 text-[11px] text-red-700">
              <p className="font-semibold uppercase tracking-[0.5px]">Auth Error</p>
              <p className="mt-1">{error.message || JSON.stringify(error)}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={handleSignIn}
              className="w-full border border-[#1a1a1a] bg-[#1a1a1a] px-4 py-3 text-[10px] uppercase tracking-[2px] text-[#f5f5f0] transition hover:bg-[#333]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              className="w-full border border-[#1a1a1a] px-4 py-3 text-[10px] uppercase tracking-[2px] transition hover:bg-[#eaeaea]"
            >
              Create Account
            </button>
          </div>
        </div>

        <div className="border-t border-[#1a1a1a] px-8 py-4 text-[8px] uppercase tracking-[0.8px] text-[#4a4a4a]">
          Status: Secure · Provider: Auth0
        </div>
      </div>
    </div>
  );
};

export default AdminGate;
