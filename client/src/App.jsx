import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import AdminGate from './components/AdminGate';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CreateForm from './pages/CreateForm';
import ChatInterface from './pages/ChatInterface';
import PublicForm from './pages/PublicForm';

const Auth0ProviderWithNavigate = ({ children }) => {
  const navigate = useNavigate();
  const domain = (import.meta.env.VITE_AUTH0_DOMAIN || '').trim();
  const clientId = (import.meta.env.VITE_AUTH0_CLIENT_ID || '').trim();

  if (!domain || !clientId) {
    return children;
  }

  const onRedirectCallback = (appState) => {
    navigate(appState?.returnTo || '/app', { replace: true });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};

function App() {
  return (
    <Router>
      <Auth0ProviderWithNavigate>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/share/:id" element={<PublicForm />} />
          <Route
            path="/app/*"
            element={
              <AdminGate>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/forms/new" element={<CreateForm />} />
                  <Route path="/forms/:id/edit" element={<CreateForm />} />
                  <Route path="/forms/:id" element={<ChatInterface />} />
                </Routes>
              </AdminGate>
            }
          />
          <Route
            path="*"
            element={<Landing />}
          />
        </Routes>
      </Auth0ProviderWithNavigate>
    </Router>
  );
}

export default App;
