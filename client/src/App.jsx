import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminGate from './components/AdminGate';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CreateForm from './pages/CreateForm';
import ChatInterface from './pages/ChatInterface';
import PublicForm from './pages/PublicForm';
import PrivateAnalysis from './pages/PrivateAnalysis';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/share/:id" element={<PublicForm />} />
        <Route path="/private/:id" element={<PrivateAnalysis />} />
        <Route
          path="/app/*"
          element={
            <AdminGate>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/forms/new" element={<CreateForm />} />
                <Route path="/forms/:id" element={<ChatInterface />} />
              </Routes>
            </AdminGate>
          }
        />
        <Route
          path="*"
          element={
            <Landing />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
