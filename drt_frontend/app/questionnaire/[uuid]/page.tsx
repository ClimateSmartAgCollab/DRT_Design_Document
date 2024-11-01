// app/questionnaire/[uuid]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/app/api/apiHelper';

const QuestionnaireForm = ({ params }: { params: { uuid: string } }) => {
  const [answers, setAnswers] = useState({});
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/fill_questionnaire/${params.uuid}/`, answers);
      router.push('/negotiation/list');
    } catch (error) {
      console.error('Error submitting form', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 max-w-lg mx-auto bg-white shadow-lg rounded">
      <h2 className="text-2xl font-bold mb-6">Submit Your Questionnaire</h2>
      {/* Form Inputs for Questionnaire */}
      <button type="submit" className="w-full bg-green-500 text-white p-3 rounded">
        Submit
      </button>
    </form>
  );
};

export default QuestionnaireForm;
