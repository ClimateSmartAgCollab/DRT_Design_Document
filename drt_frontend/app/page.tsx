// pages/index.tsx
import React from 'react';
import JSONRenderer from './components/JSONRenderer';

const Home: React.FC = () => {
  return (
    <div>
      <h1>Dynamic Questionnaire</h1>
      <JSONRenderer />
    </div>
  );
};

export default Home;
