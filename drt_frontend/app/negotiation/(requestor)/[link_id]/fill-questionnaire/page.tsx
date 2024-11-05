// app/negotiation/[link_id]/fill-questionnaire/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import fetchApi from '@/app/api/apiHelper';

type QuestionnaireData = {
  [key: string]: string | number | boolean;
};

const FillQuestionnairePage = () => {
  const { link_id } = useParams();
  const [formData, setFormData] = useState<QuestionnaireData>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch initial questionnaire data
  useEffect(() => {
    const fetchQuestionnaire = async () => {
      try {
        const response = await fetchApi(`/fill_questionnaire/${link_id}/`);
        const data = await response.json();

        if (response.ok) {
          setFormData(data.formData || {}); // ensure correct structure
        } else {
          setError(data.error || 'Failed to load questionnaire.');
        }
      } catch (err) {
        console.error('Fetch questionnaire error:', err);
        setError('Failed to load questionnaire.');
      }
    };

    fetchQuestionnaire();
  }, [link_id]);

  const submitForm = async (isSubmit: boolean) => {
    setError(null);
    setStatusMessage(null);
  
    try {
      const response = await fetchApi(`/fill_questionnaire/${link_id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          submit: isSubmit,
          save: !isSubmit,
        }),
      });
      const result = await response.json();
  
      if (response.ok) {
        setStatusMessage(
          isSubmit
            ? 'Your questionnaire is now under the owner\'s review. You will be informed via email when there is an update.'
            : 'Questionnaire saved successfully!'
        );
      } else {
        setError(result.error || 'Failed to submit questionnaire.');
        if (result.errors) {
          console.error("Form validation errors:", result.errors);
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to submit questionnaire.');
    }
  };

  // Input change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4  text-black">Fill Questionnaire</h2>
  
        {error ? (
          <p className="text-red-500">{error}</p>
        ) : statusMessage ? (
          <p className="text-green-500 mb-4">{statusMessage}</p>
        ) : (
          <form>
            {Object.keys(formData).map((key) => (
              <div key={key} className="mb-4">
                <label htmlFor={key} className="block text-gray-700">
                  {key}
                </label>
                <input
                  type="text"
                  id={key}
                  name={key}
                  value={formData[key] as string}
                  onChange={handleChange}
                  className="mt-1 p-2 border border-gray-300 rounded w-full"
                />
              </div>
            ))}
            <button type="button" onClick={() => submitForm(false)} className="bg-blue-500 text-white p-2 rounded mt-4 mr-2">
              Save
            </button>
            <button type="button" onClick={() => submitForm(true)} className="bg-green-500 text-white p-2 rounded mt-4">
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
  
};

export default FillQuestionnairePage;
