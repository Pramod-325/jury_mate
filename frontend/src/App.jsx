import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Podcast from './pages/Podcast';
import GitHubRepoAnalyzer from './pages/GitHubRepoAnalyzer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/podcast" element={<Podcast/>}/>
        <Route path="/codeAnalysis" element={<GitHubRepoAnalyzer/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
