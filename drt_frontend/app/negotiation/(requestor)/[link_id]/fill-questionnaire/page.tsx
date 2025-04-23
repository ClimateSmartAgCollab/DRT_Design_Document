// app/negotiation/[link_id]/fill-questionnaire/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import fetchApi from '@/app/api/apiHelper';
import Form from '../../../../components/Form/Form';
import { Questionnaire } from '../../../../../types/types';

const FillQuestionnairePage = () => {
  const { link_id } = useParams();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter();

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
    <section className='py-24'>
      <div className='container font-sans text-gray-800'>
        <Form />
      </div>
    </section>
  )
};

export default FillQuestionnairePage;
