// src/pages/questionnaire.tsx
import React, { useState } from 'react';
import apiClient from '@/api/apiClient';

const QuestionnairePage: React.FC = () => {
  const [formData, setFormData] = useState({ question1: '', question2: '' });

  const handleSubmit = async () => {
    try {
      await apiClient.post('/submit-questionnaire', formData);
      alert('Questionnaire submitted successfully');
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Questionnaire</h1>
      <input
        type="text"
        placeholder="Answer question 1"
        value={formData.question1}
        onChange={(e) => setFormData({ ...formData, question1: e.target.value })}
        className="border p-2 mb-4 w-full"
      />
      <input
        type="text"
        placeholder="Answer question 2"
        value={formData.question2}
        onChange={(e) => setFormData({ ...formData, question2: e.target.value })}
        className="border p-2 mb-4 w-full"
      />
      <button onClick={handleSubmit} className="bg-blue-500 text-white p-2 rounded">
        Submit
      </button>
    </div>
  );
};

export default QuestionnairePage;
