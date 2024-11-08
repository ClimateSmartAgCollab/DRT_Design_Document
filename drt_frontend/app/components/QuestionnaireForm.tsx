// components/QuestionnaireForm.tsx
import React from 'react';
import { Questionnaire } from '../../types/types';

type QuestionType = 'Text' | 'DateTime' | 'Numeric' | 'Boolean' | string | string[];

interface QuestionnaireFormProps {
  questionnaire: Questionnaire;
  answers: Record<string, any>;
  handleInputChange: (questionId: string, value: any) => void;
}

const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({ questionnaire, answers, handleInputChange }) => {
  const renderTextInput = (questionId: string) => (
    <input
      type="text"
      value={answers[questionId] || ''}
      onChange={(e) => handleInputChange(questionId, e.target.value)}
      className="mt-1 p-2 border border-gray-300 rounded w-full"
    />
  );

  const renderDateInput = (questionId: string) => (
    <input
      type="date"
      value={answers[questionId] || ''}
      onChange={(e) => handleInputChange(questionId, e.target.value)}
      className="mt-1 p-2 border border-gray-300 rounded w-full"
    />
  );

  const renderNumberInput = (questionId: string) => (
    <input
      type="number"
      value={answers[questionId] || ''}
      onChange={(e) => handleInputChange(questionId, e.target.value)}
      className="mt-1 p-2 border border-gray-300 rounded w-full"
    />
  );

  const renderBooleanSelect = (questionId: string) => (
    <select
      value={answers[questionId] || ''}
      onChange={(e) => handleInputChange(questionId, e.target.value === 'true')}
      className="mt-1 p-2 border border-gray-300 rounded w-full"
    >
      <option value="">Select</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );

  const renderCheckboxGroup = (questionId: string, options: string[]) => (
    <div className="flex flex-col mt-1">
      {options.map((option, index) => (
        <label key={index} className="inline-flex items-center">
          <input
            type="checkbox"
            value={option}
            checked={answers[questionId]?.includes(option) || false}
            onChange={(e) => {
              const currentOptions = answers[questionId] || [];
              const updatedOptions = e.target.checked
                ? [...currentOptions, option]
                : currentOptions.filter((opt: string) => opt !== option);
              handleInputChange(questionId, updatedOptions);
            }}
            className="mr-2"
          />
          {option}
        </label>
      ))}
    </div>
  );

  const renderQuestion = (questionId: string, label: string, type: QuestionType) => {
    if (Array.isArray(type)) {
      return renderCheckboxGroup(questionId, type);
    }
    switch (type) {
      case 'Text':
        return renderTextInput(questionId);
      case 'DateTime':
        return renderDateInput(questionId);
      case 'Numeric':
        return renderNumberInput(questionId);
      case 'Boolean':
        return renderBooleanSelect(questionId);
      default:
        return renderTextInput(questionId); // Fallback to text input for unexpected types
    }
  };

  console.log(questionnaire);  // Inspect the structure and see if it's populated as expected

  // Ensure questionnaire and necessary nested properties exist
  if (!questionnaire?.oca_bundle?.bundle?.capture_base?.attributes) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="p-6">
      {Object.entries(questionnaire.oca_bundle.bundle.capture_base.attributes).map(
        ([questionId, type]) => {
          const label =
            questionnaire.oca_bundle.bundle.overlays.label?.[0]?.attribute_labels?.[questionId] ||
            'Question';
          return (
            <div key={questionId} className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">{label}</label>
              {renderQuestion(questionId, label, type)}
            </div>
          );
        }
      )}
    </div>
  );
};

export default QuestionnaireForm;
