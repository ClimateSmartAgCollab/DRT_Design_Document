// app/page.tsx
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Header Bar */}
      <div className="bg-[#216b96] w-full px-6 pt-8 pb-12 flex items-start justify-between border-b border-[#2382A0] relative">
        {/* Title Block */}
        <div>
          <div>
            <span className="block text-white font-sans font-bold text-3xl leading-tight">
              Semantic Engine
            </span>
            <span className="block text-white font-sans font-light text-2xl mt-1 ml-1">
              Agreements
            </span>
          </div>
          <div className="mt-10 pl-10">
            <h2 className="text-white font-bold text-2xl font-sans">
              Helping share your work
            </h2>
            <p className="text-white font-sans text-base mt-2">
              Describe in custom terms how you want to make your work available
            </p>
          </div>
        </div>

        <div className="absolute top-8 right-6 flex flex-row items-start gap-4 z-10">
          {/* Language Dropdown */}
          <div className="relative group">
            <button className="flex items-center px-4 py-2 bg-[#216b96] text-white font-sans text-lg rounded hover:bg-[#50809cd7] focus:outline-none">
              EN
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div className="absolute left-0 mt-1 w-full bg-[#216b96] border-gray-200 rounded shadow-[0_4px_24px_rgba(0,0,0,0.35)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
              <ul className="py-1">
                <li>
                  <button className="block w-full text-left px-4 py-2 text-white rounded hover:bg-[#50809cd7] font-sans">
                    EN
                  </button>
                </li>
                <li>
                  <button className="block w-full text-left px-4 py-2 text-white rounded hover:bg-[#50809cd7] font-sans">
                    FR
                  </button>
                </li>
              </ul>
            </div>
          </div>
          {/* Logo */}
          <div className="w-60 h-60">
            <a
              href="https://genomecanada.ca/project/climate-smart-data-collaboration-centre-cs-dcc/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/CS-DCC_Logo-EN_Colour.png"
                alt="Logo"
                width={240}
                height={240}
                className="rounded-full bg-blue-200 object-contain"
              />
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center w-full px-4 py-10">
        <div className="max-w-3xl w-full">
          <h1 className="text-[#216b96] font-sans text-2xl mb-4">
            CS-DCC helps you share data with custom agreements
          </h1>
          <p className="text-gray-700 font-serif text-base mb-4">
            Members of the CS-DCC data hub can, as data owners, streamline their
            information gathering processes for determining if, when, and how to
            share research data.
          </p>
          <p className="text-gray-700 font-serif text-base mb-8">
            Develop the questionnaires and associated license templates together
            with the CS-DCC team and run them on CS-DCC infrastructure. Now
            potential data users can follow your custom links, answer questions
            and help you manage the flow of your data.
          </p>

          {/* Data Owners Card */}
          <div className="bg-[#C7E6F6] rounded-md p-6 mb-6">
            <h2 className="font-sans text-2xl text-black mb-4">
              For Data Owners
            </h2>
            <p className="font-sans text-base text-gray-800 mb-2">
              A data owner can generate questions and license templates when
              they want to share research data.
              <br />
              Members of the CS-DCC Data Hub can create a Data Owner account.{" "}
              <a
                href="mailto:adc@uoguelph.ca"
                className="underline text-[#2382A0]"
              >
                Email us
              </a>{" "}
              to begin set up your account or to have help creating questions
              and license templates.
            </p>
            <Link
              href="/negotiation/owner/homepage"
              className="block text-center text-[#2382A0] underline text-2xl font-sans mt-8"
            >
              View your owner dashboard
            </Link>
          </div>

          {/* Data Requestors Card */}
          <div className="bg-[#C7E6F6] rounded-md p-6 mb-6">
            <h2 className="font-sans text-2xl text-black mb-4">
              For Data Requestors
            </h2>
            <p className="font-sans text-base text-gray-800 mb-4">
              A data requestor is requesting access to data. A requestor answers
              of series of questions posed by a data owner when asking for
              access to research data.
            </p>
            <Link
              href="/negotiation/homepage"
              className="block text-center text-[#2382A0] underline text-2xl font-sans mt-8"
            >
              View your requestor dashboard
            </Link>
          </div>

          {/* About Section */}
          <div className="mt-8">
            <h3 className="text-[#E1B84C] font-sans text-2xl mb-2">
              About machine-readable data agreements
            </h3>
            <p className="text-gray-700 font-serif text-base mb-4">
              Machine-readable data agreements are written in Open Digital
              Rights Language (ODRL)
            </p>
            <h3 className="text-[#E1B84C] font-sans text-2xl mb-2">
              About the Semantic Engine
            </h3>
          </div>
        </div>
      </div>

      <hr className="w-full border-t border-gray-300 my-0" />
      {/* Footer Logos */}
      <div className="w-full flex flex-row items-end justify-start px-8 py-4 mt-auto gap-16">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col items-center">
            <span className="text-base text-black font-sans mb-2">
              Powered by
            </span>
            <a
              href="https://agrifooddatacanada.ca/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/agri-logo.png"
                alt="Agri-Food Data Logo"
                width={200}
                height={72}
                className="object-contain"
              />
            </a>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-base text-black font-sans mb-2">
              Supported by
            </span>
            <Image
              src="/research-excellent-fund.png"
              alt="Canada First Logo"
              width={140}
              height={48}
              className="object-contain"
            />
          </div>
        </div>
        {/* Genome Canada logo on the right */}
        <div className="flex flex-col items-center ml-16">
          <a
            href="https://www.genomecanada.ca/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/R.jpg"
              alt="Genome Canada Logo"
              width={140}
              height={48}
              className="object-contain"
            />
          </a>
        </div>
      </div>
    </main>
  );
}
