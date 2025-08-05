import Head from 'next/head';

export default function HomePageHead() {
  return (
    <Head>
      <title>Karthik Thyagarajan - Software Engineer & Researcher</title>
      <meta 
        name="description" 
        content="Welcome to Karthik Thyagarajan's personal website. Interact with an AI assistant to learn about my projects, work experience, and research in machine learning and software engineering." 
      />
      <meta 
        name="keywords" 
        content="Karthik Thyagarajan, software engineer, researcher, machine learning, AI assistant, personal website, portfolio" 
      />
      <meta name="robots" content="index, follow" />
      <meta property="og:title" content="Karthik Thyagarajan - Software Engineer & Researcher" />
      <meta 
        property="og:description" 
        content="Welcome to Karthik Thyagarajan's personal website. Interact with an AI assistant to learn about my projects, work experience, and research." 
      />
      <meta property="og:type" content="website" />
    </Head>
  );
}
