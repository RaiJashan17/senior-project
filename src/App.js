import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from './Pages/LoginPage'
import HomePage from './Pages/HomePage'
import SignUpPage from './Pages/SignUpPage'
import AboutUsPage from './Pages/AboutUsPage'
import AddressPage from './Pages/AddressPage';
import DashboardPage from './Pages/DashboardPage';
import NodePage from './Pages/NodePage';
import EasterEggPage from './Pages/EasterEggPage';
import AddEasterEggPage from './Pages/AddEasterEggPage';
import AccessGatePage from './Pages/AccessGatePage';
import VideoFeedPage from './Pages/VideoFeedPage';


function App(){
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/about-us" element={<AboutUsPage />}/>
        <Route path="/address" element={<AddressPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/node" element={<NodePage/>} />
        <Route path="/Kendra" element={<EasterEggPage />} />
        <Route path="/Add-Kendra-Trip" element={<AddEasterEggPage />} />
        <Route path='/access' element={<AccessGatePage />} />
        <Route path="/node/:nodeId" element={<VideoFeedPage />} />
      </Routes>
    </Router>
  );
}

export default App