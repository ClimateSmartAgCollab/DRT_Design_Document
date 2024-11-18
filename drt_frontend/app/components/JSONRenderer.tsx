// components/JSONRenderer.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { JSONData } from '../../types/JSONData';

const JSONRenderer: React.FC = () => {
    const [data, setData] = useState<JSONData | null>(null);
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [activeSection, setActiveSection] = useState(0); // Track the active section
  
    useEffect(() => {
      fetch('/data.json')
        .then((response) => response.json())
        .then((jsonData) => setData(jsonData))
        .catch((error) => console.error('Error loading JSON:', error));
    }, []);
  
    if (!data) return <div className="text-center p-6">Loading...</div>;
  
    // const handleInputChange = (key: string, value: string) => {
    //   setFormData((prevData) => ({ ...prevData, [key]: value }));
    // };
  
    // Navigate to the next section
    const handleNextSection = () => {
      if (activeSection < data.extensions.presentation.length - 1) {
        setActiveSection(activeSection + 1);
      } else {
        console.log("Form submitted with data:", formData);
      }
    };
  
    // Navigate to the previous section
    const handleBackSection = () => {
      if (activeSection > 0) {
        setActiveSection(activeSection - 1);
      }
    };
  
    // Get the current section and labels for the active section
    const currentSection = data.extensions.presentation[activeSection];
    const currentLabel = data.oca_bundle.bundle.overlays.label[activeSection];
    const sectionLabels = currentLabel?.attribute_labels || {};
    const sectionInputs = currentSection.p[0].ao;
  
    return (
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-1/4 p-4 bg-gray-100 border-r h-screen">
          <h2 className="text-lg font-bold mb-4">Sections</h2>
          <ul className="space-y-2">
            {data.extensions.presentation.map((section, index) => (
              <li
                key={index}
                className={`cursor-pointer p-2 rounded-md ${
                  index === activeSection
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700'
                }`}
                onClick={() => setActiveSection(index)}
              >
                {section.pl[0].eng[section.p[0].ns]}
              </li>
            ))}
          </ul>
        </aside>
  
        {/* Main Content */}
        <main className="w-3/4 p-6">
          <h1 className="text-2xl font-semibold mb-4">Questionnaire</h1>
  
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              {currentSection.pl[0].eng[currentSection.p[0].ns]}
            </h2>
  
            {sectionInputs.map((attributeKey) => {
              const input = currentSection.i[0].a[attributeKey];
              const questionLabel = sectionLabels[attributeKey] || `Question ${attributeKey}`;
  
              const options =
                input.t === 'select' &&
                currentSection.i[0].a[attributeKey]?.va === 'single'
                  ? data.oca_bundle.bundle.overlays.entry_code?.attribute_entry_codes[
                      attributeKey
                    ] ?? []
                  : undefined;
  
              return (
                <div key={attributeKey} className="mb-4">
                  <label className="block text-gray-600 mb-1">{questionLabel}</label>
                  {renderInputField(attributeKey, input.t, options)}
                </div>
              );
            })}
          </section>
  
          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handleBackSection}
              disabled={activeSection === 0}
              className={`px-4 py-2 rounded-md ${
                activeSection === 0 ? 'bg-gray-300' : 'bg-blue-500 text-white'
              }`}
            >
              Back
            </button>
            <button
              onClick={handleNextSection}
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
            >
              {activeSection < data.extensions.presentation.length - 1 ? 'Next' : 'Submit'}
            </button>
          </div>
        </main>
      </div>
    );
  };
  
  // Render input fields dynamically based on the type
  const renderInputField = (
    key: string,
    type: string,
    options?: string[]
  ) => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            className="w-full p-2 border rounded-md border-gray-300 focus:outline-none focus:border-blue-500"
            defaultValue=""
          />
        );
      case 'select':
        return (
          <select
            className="w-full p-2 border rounded-md border-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">Select an option</option>
            {options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            className="w-full p-2 border rounded-md border-gray-300 focus:outline-none focus:border-blue-500"
            defaultValue=""
          />
        );
    }
  };
  
  export default JSONRenderer;