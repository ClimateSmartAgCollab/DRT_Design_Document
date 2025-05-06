// "use client";


// import Form from './components/Form/Form'
// import './globals.css';

// export default function Home() {
//   return (
//     <section className='py-24'>
//       <div className='container font-sans text-gray-800'>
//         <Form 
//           onSave={() => console.log('Save action triggered')} 
//           onSubmit={() => console.log('Submit action triggered')} 
//         />
//       </div>
//     </section>
//   )
// }

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