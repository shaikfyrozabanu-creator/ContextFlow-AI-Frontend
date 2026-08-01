import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { ChatPage } from './pages/ChatPage';
import { AdminPage } from './pages/AdminPage';
import { ExplainRetrievalPage } from './pages/ExplainRetrievalPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { ToastContainer } from './components/Toast';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <ToastContainer />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/explain" element={<ExplainRetrievalPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
