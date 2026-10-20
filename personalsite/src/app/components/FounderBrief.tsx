import { founderBrief } from "@/lib/living-corpus/founderBrief";

export default function FounderBrief({ visible = false }: { visible?: boolean }) {
  return (
    <section hidden={!visible} data-founder-brief="" aria-label={founderBrief.title}>
      {visible ? null : <h2>{founderBrief.title}</h2>}
      <div>
        <p>{founderBrief.summary}</p>
        <p>{founderBrief.fit}</p>
        {founderBrief.evidence.map((item) => (
          <section key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <ul aria-label={`Sources for ${item.title}`}>
              {item.sources.map((source) => (
                <li key={source.href}><a href={source.href}>{source.label}</a></li>
              ))}
            </ul>
          </section>
        ))}
        <p><a href={founderBrief.contact}>Get in touch</a></p>
        <p>{founderBrief.provenance}</p>
      </div>
    </section>
  );
}
