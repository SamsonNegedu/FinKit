import React from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  return (
    <Layout>
      <div id="datepicker-portal" />
      <Dashboard />
    </Layout>
  );
};

export default App;
