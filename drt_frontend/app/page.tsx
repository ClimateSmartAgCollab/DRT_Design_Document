import Form from './components/Form/Form'
import './globals.css';

export default function Home() {
  return (
    <section className='py-24'>
      <div className='container font-sans text-gray-800'>
        <Form 
          onSave={() => console.log('Save action triggered')} 
          onSubmit={() => console.log('Submit action triggered')} 
        />
      </div>
    </section>
  )
}
