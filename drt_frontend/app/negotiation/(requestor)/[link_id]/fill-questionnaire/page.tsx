// app/negotiation/[link_id]/fill-questionnaire/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import fetchApi from '@/app/api/apiHelper';
import QuestionnaireForm from '../../../../components/QuestionnaireForm';
import { Questionnaire } from '../../../../../types/types';

const FillQuestionnairePage = () => {
  const { link_id } = useParams();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      try {
        const response = await fetchApi(`/drt/fill_questionnaire/${link_id}/`);
        const data = await response.json();
  
        console.log('Raw questionnaire data:', data);
  
        // Parse the questionnaire JSON string if it exists
        const parsedQuestionnaire = data.questionnaire ? JSON.parse(data.questionnaire) : null;
  
        console.log('Parsed questionnaire structure:', parsedQuestionnaire);
  
        if (response.ok && parsedQuestionnaire) {
          setQuestionnaire(parsedQuestionnaire as Questionnaire);
          
          // Set the saved responses if they exist
          if (data.saved_responses) {
            setAnswers(data.saved_responses);
          }
        } else {
          setError(parsedQuestionnaire?.error || 'Failed to load questionnaire.');
        }
      } catch (err) {
        console.error('Fetch questionnaire error:', err);
        setError('Failed to load questionnaire.');
      }
    };
  
    fetchQuestionnaire();
  }, [link_id]);
  

  const handleInputChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const submitForm = async (isSubmit: boolean) => {
    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetchApi(`/drt/fill_questionnaire/${link_id}/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify({
          ...answers,
          submit: isSubmit,
          save: !isSubmit,
          // Add any other necessary fields
        }),
      });
      const result = await response.json();

      if (response.ok) {
        setStatusMessage(
          isSubmit
            ? "Your questionnaire is now under the owner's review. You will be informed via email when there is an update."
            : 'Questionnaire saved successfully!'
        );
      } else {
        setError(result.error || 'Failed to submit questionnaire.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit questionnaire.');
    }
  };


  if (!questionnaire) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md text-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-black">Fill Questionnaire</h2>

        {error ? (
          <p className="text-red-500">{error}</p>
        ) : statusMessage ? (
          <p className="text-green-500 mb-4">{statusMessage}</p>
        ) : (
          <>
            <QuestionnaireForm
              questionnaire={questionnaire}
              answers={answers}
              handleInputChange={handleInputChange}
            />
            <button
              type="button"
              onClick={() => submitForm(false)}
              className="bg-blue-500 text-white p-2 rounded mt-4 mr-2"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => submitForm(true)}
              className="bg-green-500 text-white p-2 rounded mt-4"
            >
              Submit
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FillQuestionnairePage;
