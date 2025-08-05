// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const content = {
  EN: {
    testingBanner: "TESTING ENVIRONMENT",
    attention: "Attention Testers",
    instructions: "Instructions:",
    attentionBody:
      "Currently every email redirects to the testing sandbox. Log into the sandbox email first to test as both a data owner and requestor.",
    sandboxEmail: "Sandbox Email:",
    username: "Username:",
    password: "Password:",
    copy: "Copy",
    copied: "Copied!",
    csdccTitle: "CS-DCC helps you share data with custom agreements",
    csdccBody1:
      "Members of the CS-DCC data hub can, as data owners, streamline their information gathering processes for determining if, when, and how to share research data.",
    csdccBody2:
      "Develop the questionnaires and associated license templates together with the CS-DCC team and run them on CS-DCC infrastructure. Now potential data users can follow your custom links, answer questions and help you manage the flow of your data.",
    forOwners: "For Data Owners",
    ownersBody:
      "A data owner can generate questions and license templates when they want to share research data. Members of the CS-DCC Data Hub can create a Data Owner account. ",
    emailUs: "Email us",
    ownersBody2:
      " to begin set up your account or to have help creating questions and license templates.",
    ownerDashboard: "View your owner dashboard",
    forRequestors: "For Data Requestors",
    requestorsBody:
      "A data requestor is requesting access to data. A requestor answers of series of questions posed by a data owner when asking for access to research data.",
    requestorDashboard: "View your requestor dashboard",
    headerTitle: "Semantic Engine",
    headerSubtitle: "Agreements",
    headerHelp: "Helping share your work",
    headerDesc:
      "Describe in custom terms how you want to make your work available",
    poweredBy: "Powered by",
    supportedBy: "Supported by",
    attentionCard: {
      title: "Attention Testers",
      intro: "All test emails are routed here:",
      sandboxEmail: "Sandbox Email:",
      etherealLabel: "Ethereal Email Messages",
      username: "Username:",
      password: "Password:",
      afterLogin:
        'Once logged in, select the "Messages" tab to view all test emails.',
      stepsTitle: "Testing Steps",
      steps: [
        {
          title: "Begin Questionnaire",
          desc: "Start your test by selecting one of the questionnaire:",
          links: [
            {
              label: "Questionnaire_prototype1-23-A-cow",
              url: "http://localhost:3000/negotiation/generate/e540b3a9-b26e-435f-aff4-19bfa23a21cb",
            },
            {
              label: "Questionnaire_prototype1-23-B-pig",
              url: "http://localhost:3000/negotiation/generate/8ce1026c-e41c-4a03-a0a1-ede1a1630e5e",
            },
            {
              label: "Questionnaire_prototype2-23-A-cow",
              url: "http://localhost:3000/negotiation/generate/14ca6112-935e-4c9c-91ea-f6f92bfffe33",
            },
            {
              label: "Questionnaire_prototype2-23-B-pig",
              url: "http://localhost:3000/negotiation/generate/3ef65781-f2ed-4a4e-a7bb-d85d21e79ae4",
            },

            // {
            //   label: "Questionnaire_prototype1-23-A-cow",
            //   url: "http://drt-test.canadacentral.cloudapp.azure.com/negotiation/generate/e540b3a9-b26e-435f-aff4-19bfa23a21cb",
            // },
            // {
            //   label: "Questionnaire_prototype1-23-B-pig",
            //   url: "http://drt-test.canadacentral.cloudapp.azure.com/negotiation/generate/8ce1026c-e41c-4a03-a0a1-ede1a1630e5e",
            // },
            // {
            //   label: "Questionnaire_prototype2-23-A-cow",
            //   url: "http://drt-test.canadacentral.cloudapp.azure.com/negotiation/generate/14ca6112-935e-4c9c-91ea-f6f92bfffe33",
            // },
            // {
            //   label: "Questionnaire_prototype2-23-B-pig",
            //   url: "http://drt-test.canadacentral.cloudapp.azure.com/negotiation/generate/3ef65781-f2ed-4a4e-a7bb-d85d21e79ae4",
            // },
          ],
        },
        {
          title: "Verify Your Email as a Requestor",
          desc: "Use the sandbox email inbox to verify your identity as a requestor.\n Any email works.\n<em><u>Important</u></em>: use the <em>same email</em> later to log in to the dashboard if you want to see your negotiation history for that address.",
        },

        {
          title: "Submit Responses",
          desc: "Complete the questionnaire and submit.",
        },
        {
          title: "Owner Email Review",
          desc: "Verify using <em><u>owner@drt.ca</u></em> in the sandbox email to review all questionnaire responses. <em>For testing, this is the only valid owner email—other emails will not show owner-side history.</em>",
        },
        {
          title: "Make a Decision",
          desc: "Based on the responses, choose one:",
          options: [
            "Accept responses.",
            "Request additional feedback (send the questionnaire back).",
            "Reject (clearly state reasons).",
          ],
        },
        {
          title: "Interactive Communication",
          desc: "Notifications to both requestor and owner in the sandbox inbox simulate their email exchange. (Sending emails from this inbox is disabled.)",
        },
        {
          title: "Automatic License Generation",
          desc: "Once responses are accepted, a license document is automatically generated.",
        },
        {
          title: "Review Generated License",
          desc: "View the generated license document attached in the sandbox email sent to the <em><u>owner@drt.ca</u></em>.",
        },
      ],
      dashboardTitle: "Dashboard Overview and Alternative Testing Method",
      dashboardPoints: [
        "Use the Dashboard to track everything easily.",
        "Review submitted questions, responses, negotiation history, and the negotiation status.",
        "Access summary statistics of all requests handled by the owner.",
        "Optional: Extended Dashboard Testing\nFor experienced users, questionnaires and review processes can be managed directly through the dashboard, eliminating reliance solely on email links.",
      ],
      dashboardSubPoints: [
        "Log in as the requestor with the <em>same email</em> you used to answer the questionnaire to view your negotiation history and communications.",
        "Log in as the owner with <em><u>owner@drt.ca</u></em>.\n <em>For testing, this is the only valid owner email—other emails will not show owner-side history.</em>",
      ],
    },
  },
  FR: {
    testingBanner: "ENVIRONNEMENT DE TEST",
    attention: "Attention Testeurs",
    instructions: "Instructions :",
    attentionBody:
      "Actuellement, chaque e-mail est redirigé vers la sandbox de test. Connectez-vous d'abord à l'e-mail sandbox pour tester en tant que propriétaire de données et demandeur.",
    sandboxEmail: "E-mail Sandbox :",
    username: "Nom d'utilisateur :",
    password: "Mot de passe :",
    copy: "Copier",
    copied: "Copié !",
    csdccTitle:
      "Le CS-DCC vous aide à partager des données avec des accords personnalisés",
    csdccBody1:
      "Les membres du CS-DCC Data Hub peuvent, en tant que propriétaires de données, rationaliser leurs processus de collecte d'informations pour déterminer si, quand et comment partager des données de recherche.",
    csdccBody2:
      "Développez les questionnaires et les modèles de licence associés avec l'équipe CS-DCC et exécutez-les sur l'infrastructure CS-DCC. Désormais, les utilisateurs potentiels de données peuvent suivre vos liens personnalisés, répondre aux questions et vous aider à gérer le flux de vos données.",
    forOwners: "Pour les propriétaires de données",
    ownersBody:
      "Un propriétaire de données peut générer des questions et des modèles de licence lorsqu'il souhaite partager des données de recherche. Les membres du CS-DCC Data Hub peuvent créer un compte propriétaire de données. ",
    emailUs: "Envoyez-nous un courriel",
    ownersBody2:
      " pour commencer à configurer votre compte ou pour obtenir de l'aide pour créer des questions et des modèles de licence.",
    ownerDashboard: "Voir votre tableau de bord propriétaire",
    forRequestors: "Pour les demandeurs de données",
    requestorsBody:
      "Un demandeur de données demande l'accès à des données. Un demandeur répond à une série de questions posées par un propriétaire de données lors de la demande d'accès à des données de recherche.",
    requestorDashboard: "Voir votre tableau de bord demandeur",
    headerTitle: "Moteur Sémantique",
    headerSubtitle: "Accords",
    headerHelp: "Aider à partager votre travail",
    headerDesc:
      "Décrivez selon des termes personnalisés comment vous souhaitez rendre votre travail disponible",
    poweredBy: "Propulsé par",
    supportedBy: "Soutenu par",
    attentionCard: {
      title: "Attention Testeurs",
      intro: "Tous les e-mails de test sont redirigés ici :",
      sandboxEmail: "E-mail Sandbox :",
      etherealLabel: "Messages Email Ethereal",
      username: "Nom d'utilisateur :",
      password: "Mot de passe :",
      afterLogin:
        'Une fois connecté, sélectionnez l\'onglet "Messages" pour voir tous les e-mails de test.',
      stepsTitle: "Étapes de test",
      steps: [
        {
          title: "Commencer le questionnaire",
          desc: "Cliquez sur un lien ci-dessous pour démarrer votre questionnaire :",
          links: [
            {
              label: "Questionnaire_prototype1-23-A-cow",
              url: "http://drt-test.canadacentral.cloudapp.azure.com/negotiation/generate/e540b3a9-b26e-435f-aff4-19bfa23a21cb",
            },
            {
              label: "Questionnaire_prototype1-23-B-pig",
              url: "http://drt-test.canadacentral.cloudapp.azure.com/negotiation/generate/8ce1026c-e41c-4a03-a0a1-ede1a1630e5e",
            },
            {
              label: "Questionnaire_prototype2-23-A-cow",
              url: "http://drt-test.canadacentral.cloudapp.azure.com/negotiation/generate/14ca6112-935e-4c9c-91ea-f6f92bfffe33",
            },
            {
              label: "Questionnaire_prototype2-23-B-pig",
              url: "http://drt-test.canadacentral.cloudapp.azure.com/negotiation/generate/3ef65781-f2ed-4a4e-a7bb-d85d21e79ae4",
            },
          ],
        },
        {
          title: "Vérifier l'e-mail",
          desc: "Utilisez la boîte de réception sandbox pour vérifier votre identité en tant que demandeur.\n N'importe quel e-mail fonctionne.\n<em><u>Important</u></em> : utilisez le <em>même e-mail</em> plus tard pour vous connecter au tableau de bord si vous voulez voir votre historique de négociation pour cette adresse.",
        },
        {
          title: "Soumettre les réponses",
          desc: "Répondez au questionnaire et soumettez vos réponses.",
        },
        {
          title: "Revue de l'e-mail du propriétaire",
          desc: "Vérifiez en utilisant <em><u>owner@drt.ca</u></em> dans l'e-mail sandbox pour examiner toutes les réponses au questionnaire. <em>Pour les tests, c'est le seul e-mail de propriétaire valide—les autres e-mails ne montreront pas l'historique côté propriétaire.</em>",
        },
        {
          title: "Prendre une décision",
          desc: "En fonction des réponses, choisissez une option :",
          options: [
            "Accepter les réponses.",
            "Demander des commentaires supplémentaires en renvoyant le questionnaire.",
            "Rejeter en précisant clairement les raisons.",
          ],
        },
        {
          title: "Communication interactive",
          desc: "Simulez la communication entre le propriétaire et le demandeur dans la sandbox email. (Remarque : L'envoi d'e-mails depuis cette boîte de réception est désactivé.)",
        },
        {
          title: "Génération automatique de licence",
          desc: "Une fois les réponses acceptées, un document de licence est généré automatiquement.",
        },
        {
          title: "Revoir la licence générée",
          desc: "Consultez le document de licence généré en pièce jointe dans l'e-mail envoyé au <em><u>owner@drt.ca</u></em>.",
        },
      ],
      dashboardTitle:
        "Aperçu du tableau de bord et méthode de test alternative",
      dashboardPoints: [
        "Utilisez le tableau de bord pour tout suivre facilement.",
        "Consultez les questions soumises, les réponses, l'historique des négociations et le statut de la négociation.",
        "Accédez aux statistiques récapitulatives de toutes les demandes traitées par le propriétaire.",
        "Optionnel : Test étendu via le tableau de bord\nPour les utilisateurs expérimentés, les questionnaires et les processus de révision peuvent être gérés directement via le tableau de bord, sans dépendre uniquement des liens e-mail.",
      ],
      dashboardSubPoints: [
        "Connectez-vous en tant que demandeur avec le <em>même e-mail</em> que vous avez utilisé pour répondre au questionnaire pour voir votre historique de négociation et vos communications.",
        "Connectez-vous en tant que propriétaire avec <em><u>owner@drt.ca</u></em>.\n <em>Pour les tests, c'est le seul e-mail de propriétaire valide—les autres e-mails ne montreront pas l'historique côté propriétaire.</em>",
      ],
    },
  },
};

export default function HomePage() {
  const [lang, setLang] = useState<"EN" | "FR">("EN");
  const [copied, setCopied] = useState<{ field: string; status: boolean }>({
    field: "",
    status: false,
  });
  const t = content[lang];
  const handleCopy = (value: string, field: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(() => {
        setCopied({ field, status: true });
        setTimeout(() => setCopied({ field: "", status: false }), 1200);
      });
    } else {
      // Fallback for insecure context or unsupported browsers
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied({ field, status: true });
        setTimeout(() => setCopied({ field: "", status: false }), 1200);
      } catch (err) {
        // Optionally show an error
      }
      document.body.removeChild(textArea);
    }
  };

  // Helper function to render text with HTML formatting
  const renderFormattedText = (text: string) => {
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Testing Environment Banner */}
      <div className="w-full bg-white text-red-700 text-center py-2 font-bold text-lg tracking-widest sticky top-0 z-50">
        {t.testingBanner}
      </div>
      {/* Header Bar */}
      <div className="bg-[#216b96] w-full px-6 pt-8 pb-12 flex items-start justify-between border-b border-[#2382A0] relative">
        {/* Title Block */}
        <div>
          <div>
            <span className="block text-white font-sans font-bold text-3xl leading-tight">
              {t.headerTitle}
            </span>
            <span className="block text-white font-sans font-light text-2xl mt-1 ml-1">
              {t.headerSubtitle}
            </span>
          </div>
          <div className="mt-10 pl-10">
            <h2 className="text-white font-bold text-2xl font-sans">
              {t.headerHelp}
            </h2>
            <p className="text-white font-sans text-base mt-2">
              {t.headerDesc}
            </p>
          </div>
        </div>
        <div className="absolute top-8 right-6 flex flex-row items-start gap-4 z-10">
          {/* Language Dropdown */}
          <div className="relative group">
            <button
              className="flex items-center px-4 py-2 bg-[#216b96] text-white font-sans text-lg rounded hover:bg-[#50809cd7] focus:outline-none"
              aria-haspopup="listbox"
              aria-expanded={false}
              tabIndex={0}
            >
              {lang}
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
                  <button
                    className="block w-full text-left px-4 py-2 text-white rounded hover:bg-[#50809cd7] font-sans"
                    onClick={() => setLang("EN")}
                  >
                    EN
                  </button>
                </li>
                <li>
                  <button
                    className="block w-full text-left px-4 py-2 text-white rounded hover:bg-[#50809cd7] font-sans"
                    onClick={() => setLang("FR")}
                  >
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
      <div className="flex flex-col items-center w-full px-4 py-10">
        <div className="max-w-3xl w-full">
          {/* Attention Testers Card */}

          <h1 className="text-[#216b96] font-sans text-2xl mb-4">
            {t.csdccTitle}
          </h1>
          <p className="text-gray-700 font-serif text-base mb-4">
            {t.csdccBody1}
          </p>
          <p className="text-gray-700 font-serif text-base mb-8">
            {t.csdccBody2}
          </p>

          <div className="bg-red-200 rounded-md p-6 mb-8">
            <h2 className="text-black font-bold text-xl mb-2">
              {t.attentionCard.title}
            </h2>
            <div className="pl-8">
              <p className="text-black mb-2 font-medium">
                {t.attentionCard.intro}
              </p>
              <div className="bg-white border border-red-300 rounded p-4 mt-2 mb-4">
                <div className="mb-1 flex items-center flex-wrap gap-2">
                  <span className="font-medium">
                    {t.attentionCard.sandboxEmail}
                  </span>
                  <a
                    href="https://ethereal.email/messages"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-700"
                  >
                    {t.attentionCard.etherealLabel}
                  </a>
                </div>
                <div className="mb-1 flex items-center flex-wrap gap-2">
                  <span className="font-medium">
                    {t.attentionCard.username}
                  </span>
                  <span className="font-mono select-all">
                    aditya.nienow@ethereal.email
                  </span>
                  <button
                    onClick={() =>
                      handleCopy("aditya.nienow@ethereal.email", "username")
                    }
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none text-gray-700"
                    title={t.copy}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                        className="fill-white"
                      />
                      <rect x="3" y="3" width="13" height="13" rx="2" ry="2" />
                    </svg>
                    <span>
                      {copied.field === "username" && copied.status
                        ? t.copied
                        : t.copy}
                    </span>
                  </button>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-medium">
                    {t.attentionCard.password}
                  </span>
                  <span className="font-mono select-all">
                    AqFy19WdAnDghQQrdm
                  </span>
                  <button
                    onClick={() => handleCopy("AqFy19WdAnDghQQrdm", "password")}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none text-gray-700"
                    title={t.copy}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                        className="fill-white"
                      />
                      <rect x="3" y="3" width="13" height="13" rx="2" ry="2" />
                    </svg>
                    <span>
                      {copied.field === "password" && copied.status
                        ? t.copied
                        : t.copy}
                    </span>
                  </button>
                </div>
              </div>
              <p className="text-black mb-4">{t.attentionCard.afterLogin}</p>
              <h3 className="text-lg font-bold text-black mt-6 mb-2">
                {t.attentionCard.stepsTitle}
              </h3>
              <ol className="list-decimal list-inside text-black mb-4 space-y-2">
                {t.attentionCard.steps.map((step, idx) => (
                  <li key={idx}>
                    <b>{step.title}</b>
                    {step.desc && (
                      <div className="pl-4 mt-1">
                        {renderFormattedText(step.desc)}
                      </div>
                    )}
                    {idx === 3 && (
                      <div className="bg-white border border-red-300 rounded p-4 mt-2 ml-4">
                        <div className="mb-1 flex items-center flex-wrap gap-2">
                          <span className="font-medium">
                            {lang === "EN"
                              ? "Owner Email:"
                              : "E-mail du propriétaire :"}
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-mono select-all">
                            owner@drt.ca
                          </span>
                          <button
                            onClick={() =>
                              handleCopy("owner@drt.ca", "owner-email")
                            }
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none text-gray-700"
                            title={t.copy}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                                className="fill-white"
                              />
                              <rect
                                x="3"
                                y="3"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              />
                            </svg>
                            <span>
                              {copied.field === "owner-email" && copied.status
                                ? t.copied
                                : t.copy}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                    {step.links && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {step.links.map((link, lidx) => (
                          <li key={lidx}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-blue-700"
                            >
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {step.options && (
                      <ul className="list-disc list-inside pl-4 mt-1">
                        {step.options.map((opt, oidx) => (
                          <li key={oidx}>{opt}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
              <h3 className="text-lg font-bold text-black mt-8 mb-2">
                {t.attentionCard.dashboardTitle}
              </h3>
              <ul className="list-disc list-inside text-black mb-2 pl-4 space-y-1">
                {t.attentionCard.dashboardPoints.map((point, pidx) => (
                  <li key={pidx}>
                    {renderFormattedText(point)}
                    {pidx === 0 && t.attentionCard.dashboardSubPoints && (
                      <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                        {t.attentionCard.dashboardSubPoints.map(
                          (subPoint, spidx) => (
                            <li key={spidx}>{renderFormattedText(subPoint)}</li>
                          )
                        )}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Data Owners Card */}
          <div className="bg-[#C7E6F6] rounded-md p-6 mb-6">
            <h2 className="font-sans text-2xl text-black mb-4">
              {t.forOwners}
            </h2>
            <div className="pl-8">
              <p className="font-sans text-base text-gray-800 mb-2">
                {t.ownersBody}
                <a
                  href="mailto:adc@uoguelph.ca"
                  className="underline text-[#2382A0]"
                >
                  {t.emailUs}
                </a>
                {t.ownersBody2}
              </p>

              <Link
                href="/negotiation/owner/homepage"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[#2382A0] underline text-2xl font-sans mt-8"
              >
                {t.ownerDashboard}
              </Link>
            </div>
          </div>
          {/* Data Requestors Card */}
          <div className="bg-[#C7E6F6] rounded-md p-6 mb-6">
            <h2 className="font-sans text-2xl text-black mb-4">
              {t.forRequestors}
            </h2>
            <div className="pl-8">
              <p className="font-sans text-base text-gray-800 mb-4">
                {t.requestorsBody}
              </p>
              <Link
                href="/negotiation/homepage"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[#2382A0] underline text-2xl font-sans mt-8"
              >
                {t.requestorDashboard}
              </Link>
            </div>
          </div>
        </div>
      </div>
      <hr className="w-full border-t border-gray-300 my-0" />
      {/* Footer Logos */}
      <div className="w-full flex flex-row items-end justify-start px-8 py-4 mt-auto gap-16">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col items-center">
            <span className="text-base text-black font-sans mb-2">
              {t.poweredBy}
            </span>
            <a
              href="https://agrifooddatacanada.ca/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/agri-logo.png"
                alt="Agri-Food Data Logo"
                width={240}
                height={86}
                className="object-contain"
              />
            </a>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-base text-black font-sans mb-2">
              {t.supportedBy}
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
        <div className="flex flex-col items-center ml-2">
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
        <div className="flex flex-col items-center ml-2">
          <a
            href="https://www.ontario.ca/page/government-ontario"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/OMAFA.PNG"
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
